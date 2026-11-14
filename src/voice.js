// Miku's speaking voice: a neural text-to-speech voice (Kokoro, "af_sky"), so she says the real
// words and sounds like a person. (The Vocaloid tone is added on top when it plays; see
// playVoice in src/audio.js.)
//
// Making speech is slow on an ordinary CPU, so every line she says in the story was made ahead
// of time by tools/voicegen.html and shipped in models/voice.js, compressed as Opus. Those play
// instantly. Only lines with the player's name in them are made while you play, by the model
// running in a background worker so the game never stutters; they're made as soon as you've
// said your name, well before she needs them.
const Voice = (() => {
  const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm';
  const VOICE_ID = 'af_sky';

  // The same text clean-up is used when the lines are made and when they're looked up.
  // Stage directions in brackets aren't spoken.
  // A line with the player's name taken out ("Hi, {name}." -> "Hi."), shipped so she has
  // something to say straight away while the version with the name is still being made.
  const withoutName = (t) => {
    const s = t.replace(/,?\s*\{name\}\s*([,.!?])?/g, (m, p) => (p && p !== ',' ? p : ' ')).replace(/\s+([.!?,])/g, '$1').replace(/\s+/g, ' ').trim().replace(/^[,.!?\s]+/, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const clean = (t) => t.replace(/\([^)]*\)/g, '').replace(/[“”"]/g, '').replace(/…/g, '... ').replace(/—/g, ', ').replace(/\s+/g, ' ').trim();

  // ---------- The model, in a worker ----------
  const WORKER_SRC = `
    let tts = null;
    self.onmessage = async (e) => {
      const m = e.data;
      try {
        if (m.type === 'load') {
          const { KokoroTTS } = await import(m.url);
          tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm' });
          self.postMessage({ type: 'ready' });
        } else if (m.type === 'gen') {
          const out = await tts.generate(m.text, { voice: m.voice, speed: 1 });
          const a = out.audio;
          self.postMessage({ type: 'audio', id: m.id, data: a, rate: out.sampling_rate }, [a.buffer]);
        }
      } catch (err) {
        self.postMessage({ type: 'error', id: m.id, message: String((err && err.message) || err) });
      }
    };`;
  function makeWorker() {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(url, { type: 'module' });
    const waiting = new Map();
    let ready = null, nextId = 1;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') { ready.resolve(); return; }
      if (m.type === 'error' && !m.id) { ready.reject(new Error(m.message)); return; }
      const p = waiting.get(m.id); if (!p) return;
      waiting.delete(m.id);
      if (m.type === 'audio') p.resolve({ data: m.data, rate: m.rate }); else p.reject(new Error(m.message));
    };
    const load = () => { if (!ready) { let res, rej; const pr = new Promise((a, b) => { res = a; rej = b; }); ready = { promise: pr, resolve: res, reject: rej }; w.postMessage({ type: 'load', url: KOKORO_URL }); } return ready.promise; };
    const gen = (text, voice = VOICE_ID) => load().then(() => new Promise((resolve, reject) => { const id = nextId++; waiting.set(id, { resolve, reject }); w.postMessage({ type: 'gen', id, text, voice }); }));
    return { load, gen };
  }

  // ---------- Opus packing ----------
  // A line is stored as base64 of: [u32 sample count] then packets, each [u16 length][bytes].
  async function encode(samples, rate) {
    const packets = [];
    const enc = new AudioEncoder({ output: (chunk) => { const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); packets.push(b); }, error: (e) => { throw e; } });
    enc.configure({ codec: 'opus', sampleRate: rate, numberOfChannels: 1, bitrate: 40000 });
    enc.encode(new AudioData({ format: 'f32', sampleRate: rate, numberOfFrames: samples.length, numberOfChannels: 1, timestamp: 0, data: samples }));
    await enc.flush();
    enc.close();
    let size = 4;
    for (const p of packets) size += 2 + p.length;
    const out = new Uint8Array(size);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, samples.length, true);
    let o = 4;
    for (const p of packets) { dv.setUint16(o, p.length, true); out.set(p, o + 2); o += 2 + p.length; }
    let s = '';
    for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function decode(b64, rate) {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const dv = new DataView(bytes.buffer);
    const total = dv.getUint32(0, true);
    const out = new Float32Array(total + 4096);
    let written = 0;
    const dec = new AudioDecoder({
      output: (ad) => { const n = ad.numberOfFrames; const tmp = new Float32Array(n); ad.copyTo(tmp, { planeIndex: 0, format: 'f32-planar' }); if (written + n <= out.length) out.set(tmp, written); written += n; ad.close(); },
      error: () => {},
    });
    dec.configure({ codec: 'opus', sampleRate: rate, numberOfChannels: 1 });
    let o = 4, ts = 0;
    while (o < bytes.length) {
      const len = dv.getUint16(o, true);
      dec.decode(new EncodedAudioChunk({ type: 'key', timestamp: ts, data: bytes.subarray(o + 2, o + 2 + len) }));
      o += 2 + len; ts += 20000;
    }
    await dec.flush();
    dec.close();
    return out.subarray(0, Math.min(total, written));
  }

  // ---------- In the game ----------
  let bank = null, bankRate = 24000, worker = null, workerState = 'idle';
  const made = new Map();      // clean text -> Promise<{data, rate}>
  const canDecode = typeof AudioDecoder !== 'undefined';

  // Loads the shipped lines (models/voice.js) after the page is up.
  function init(onChange) {
    const s = document.createElement('script');
    s.src = 'models/voice.js';
    s.onload = () => { if (window.MIKU_VOICE) { bank = window.MIKU_VOICE.lines; bankRate = window.MIKU_VOICE.rate; } if (onChange) onChange(); };
    s.onerror = () => { if (onChange) onChange(); };
    document.body.appendChild(s);
  }
  const has = (text) => !!(bank && canDecode && bank[clean(text)]);
  // Her audio for a line: shipped if it's there, otherwise made in the background.
  function get(text) {
    const key = clean(text);
    if (!/[a-z0-9]/i.test(key)) return Promise.reject(new Error('nothing to say'));
    if (made.has(key)) return made.get(key);
    let p;
    if (bank && canDecode && bank[key]) p = decode(bank[key], bankRate).then((data) => ({ data, rate: bankRate }));
    else {
      if (!worker) { worker = makeWorker(); workerState = 'loading'; worker.load().then(() => { workerState = 'ready'; }, () => { workerState = 'failed'; }); }
      p = worker.gen(key);
    }
    made.set(key, p);
    p.then(() => done.add(key), () => made.delete(key));
    return p;
  }
  const done = new Set();
  const isDone = (text) => done.has(clean(text));

  return {
    init, get, has, isDone, clean, withoutName, makeWorker, encode, decode, VOICE_ID,
    get ready() { return !!bank && canDecode; },
    get lineCount() { return bank ? Object.keys(bank).length : 0; },
  };
})();
