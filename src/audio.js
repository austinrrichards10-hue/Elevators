// Sound, all synthesised: the cab's hum, wind on the glass, the city far below, the chime, and
// the music, three pieces that the story switches between:
//   sad   - slow piano and low strings in A minor, the ride's theme (it never quite resolves)
//   warm  - a gentle, tender piece in F major for the time you spend together
//   song  - "Seventy Floors", the song Miku is writing, with a soft synthesised voice on the tune
const Sound = (() => {
  let ctx = null, master = null, muted = false;
  let hum = null, wind = null, city = null, ambience = 1;

  function noiseBuffer(seconds, brown) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  function loopNoise(brown, filterType, freq, q, gain) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4, brown);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(master);
    src.start();
    return { filter: f, gain: g };
  }

  // ---------- The music ----------
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const Am = [[45, 52, 57, 60], 33], F = [[41, 48, 53, 57], 29], C = [[48, 55, 60, 64], 36], G = [[43, 50, 55, 59], 31];
  const Dm = [[38, 45, 50, 53], 26], E = [[40, 47, 52, 56], 28], Em = [[40, 47, 52, 55], 28], Bb = [[46, 53, 58, 62], 34];
  // Each track: tempo, one chord a bar ([left-hand chord tones, string bass]), and a melody
  // as [note, beats] ([null, beats] rests), four beats a bar, and what plays the melody.
  const TRACKS = {
    sad: {
      bpm: 52, lead: 'piano', breath: 1.25,
      bars: [Am, F, C, G, Am, F, Dm, E, F, C, Dm, Am, F, G, Am, E],
      melody: [
        [76, 2], [74, 1], [72, 1], [72, 1.5], [71, 0.5], [69, 2], [67, 1], [69, 1], [72, 1], [76, 1], [74, 3], [71, 1],
        [72, 2], [71, 1], [69, 1], [69, 1.5], [67, 0.5], [65, 1], [69, 1], [65, 2], [64, 1], [62, 1], [68, 3], [null, 1],
        [81, 2], [79, 1], [77, 1], [79, 1.5], [77, 0.5], [76, 2], [77, 1], [76, 1], [74, 1], [72, 1], [72, 2], [71, 1], [69, 1],
        [72, 1.5], [74, 0.5], [76, 2], [74, 1], [72, 1], [71, 2], [69, 3], [72, 1], [71, 3], [68, 1],
      ],
    },
    warm: {
      bpm: 64, lead: 'piano', breath: 1,
      bars: [F, Am, Dm, Bb, F, C, Bb, C],
      melody: [
        [69, 1], [72, 1], [77, 2], [76, 1.5], [74, 0.5], [72, 2], [74, 1], [77, 1], [81, 1], [79, 1], [77, 3], [74, 1],
        [72, 2], [69, 1], [72, 1], [76, 1.5], [74, 0.5], [72, 1], [67, 1], [74, 2], [72, 1], [70, 1], [72, 3], [null, 1],
      ],
    },
    // Her song: the backing only (chords and strings). She sings the tune herself, live, with
    // the words (see say() below), so the melody notes here are what her voice follows.
    song: {
      bpm: 70, lead: 'none', breath: 1.5,
      bars: [Am, F, C, G, Am, F, C, G, F, G, Em, Am, F, G, C, C],
      melody: [
        [76, 1], [76, 1], [74, 1], [72, 1], [72, 1.5], [69, 0.5], [69, 2], [67, 1], [72, 1], [76, 1], [79, 1], [74, 3], [null, 1],
        [76, 1], [76, 1], [79, 1], [76, 1], [74, 1], [72, 1], [69, 2], [72, 1], [74, 1], [76, 1], [72, 1], [71, 3], [null, 1],
        [81, 2], [79, 1], [77, 1], [79, 2], [76, 1], [74, 1], [76, 1], [74, 1], [71, 1], [67, 1], [72, 3], [76, 1],
        [81, 2], [79, 1], [77, 1], [79, 1.5], [81, 0.5], [83, 1], [79, 1], [84, 2], [83, 1], [79, 1], [76, 3], [null, 1],
      ],
    },
  };

  let reverbNode = null, musicIn = null, musicLP = null;
  let current = null;          // { name, bus, timer }

  function reverb(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const c = ctx.createConvolver();
    c.buffer = buf;
    return c;
  }

  // A soft felt-piano note: a few sine partials, a quick gentle attack and a long decay.
  function piano(out, n, t, dur, vel) {
    const f = hz(n);
    const decay = 1.6 + 2.4 * Math.max(0, (84 - n) / 40);
    [[1, 1], [2, 0.32], [3, 0.11], [4.02, 0.05]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      o.detune.value = (Math.random() - 0.5) * 4;
      const g = ctx.createGain();
      const peak = vel * a;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.5) + decay);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + Math.max(dur, 0.5) + decay + 0.1);
    });
  }

  // A soft sung "ah": two detuned saws with a little vibrato, shaped by vowel formants.
  function voice(out, n, t, dur, vel) {
    const f = hz(n);
    const g = ctx.createGain();
    const end = t + dur;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.09);
    g.gain.setValueAtTime(vel * 0.92, Math.max(t + 0.1, end - 0.12));
    g.gain.linearRampToValueAtTime(0, end + 0.25);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
    const vibAmt = ctx.createGain(); vibAmt.gain.setValueAtTime(0, t); vibAmt.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.6, dur));
    vib.connect(vibAmt);
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      vibAmt.connect(o.frequency);
      o.connect(mix); o.start(t); o.stop(end + 0.3);
    }
    vib.start(t); vib.stop(end + 0.3);
    for (const [ff, q, a] of [[800, 6, 1], [1150, 8, 0.6], [2900, 10, 0.25], [3500, 12, 0.12]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q;
      const ga = ctx.createGain(); ga.gain.value = a;
      mix.connect(bp).connect(ga).connect(g);
    }
    g.connect(out);
  }

  // Low strings: detuned saws, filtered dark, swelling in and out.
  function strings(out, n, t, dur, level) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * level, t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0, t + dur + 1.2);
    lp.connect(g).connect(out);
    for (const [m, det] of [[1, -7], [1, 6], [2, 3]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(n) * m;
      o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = m === 1 ? 0.5 : 0.18;
      o.connect(og).connect(lp);
      o.start(t); o.stop(t + dur + 1.4);
    }
  }

  function setupMusic() {
    reverbNode = reverb(4.5);
    musicLP = ctx.createBiquadFilter();
    musicLP.type = 'lowpass'; musicLP.frequency.value = 18000;
    musicLP.connect(master);
    musicIn = ctx.createGain();
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    const dry = ctx.createGain(); dry.gain.value = 0.7;
    musicIn.connect(dry).connect(musicLP);
    musicIn.connect(reverbNode).connect(wet).connect(musicLP);
  }

  // Starts a track (fading out whatever was playing), or stops the music with null.
  function music(name) {
    if (!ctx) { pending = name; return; }
    if (current && current.name === name) return;
    if (current) {
      const old = current;
      clearInterval(old.timer);
      old.bus.gain.setTargetAtTime(0, ctx.currentTime, 1.2);
      setTimeout(() => old.bus.disconnect(), 6000);
      current = null;
    }
    if (!name) return;
    if (name === 'song') sungNote = 0;
    const tr = TRACKS[name];
    const BEAT = 60 / tr.bpm;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, ctx.currentTime, 2);
    bus.connect(musicIn);
    const pianoBus = ctx.createGain(); pianoBus.gain.value = tr.lead === 'voice' ? 0.12 : 0.16;
    const voiceBus = ctx.createGain(); voiceBus.gain.value = 0.2;
    const stringBus = ctx.createGain(); stringBus.gain.value = name === 'warm' ? 0.32 : 0.5;
    pianoBus.connect(bus); voiceBus.connect(bus); stringBus.connect(bus);
    const notes = [];
    let at = 0;
    for (const [n, b] of tr.melody) { if (n !== null) notes.push([n, at, b]); at += b; }
    const loopBars = tr.bars.length;

    let bar = 0, barTime = ctx.currentTime + 0.8;
    const tick = () => {
      while (barTime < ctx.currentTime + 4) {
        const i = bar % loopBars;
        const [chord, bass] = tr.bars[i];
        const sway = (k) => (Math.random() - 0.5) * 0.02 + k;
        const pattern = name === 'warm' ? [0, 2, 1, 3, 2, 1, 3, 2] : [0, 1, 2, 3, 2, 1, 2, 1];
        pattern.forEach((p, k) => piano(pianoBus, chord[p], sway(barTime + k * BEAT / 2), BEAT / 2, k === 0 ? 0.55 : 0.3));
        strings(stringBus, bass, barTime, BEAT * 4, 1);
        if (i % 2 === 0) strings(stringBus, bass + 12, barTime, BEAT * 8, 0.8);
        const lift = i >= loopBars / 2 ? 1.1 : 0.95;
        // The melody's own bars repeat if it's shorter than the chord loop.
        const melBars = at / 4, mi = i % melBars;
        for (const [n, b, d] of notes) {
          if (b >= mi * 4 && b < mi * 4 + 4) {
            const when = sway(barTime + (b - mi * 4) * BEAT);
            if (tr.lead === 'voice') { voice(voiceBus, n, when, d * BEAT * 0.95, 0.5); piano(pianoBus, n - 12, when, d * BEAT, 0.25); }
            else if (tr.lead === 'piano') piano(pianoBus, n, when, d * BEAT, 0.62 * lift);
          }
        }
        bar++;
        barTime += BEAT * 4 * (i === loopBars - 1 ? tr.breath : 1);
      }
    };
    tick();
    current = { name, bus, timer: setInterval(tick, 500) };
  }
  let pending = 'sad';

  // ---------- Her voice ----------
  // A small singing synth in the Vocaloid manner: every line she says is sung, syllable by
  // syllable. Each syllable gets its consonant (a hiss, a tap, a hum) and its vowel, shaped by
  // formant filters on a bright buzzy tone, and the pitch glides from note to note. Spoken lines
  // follow a speech-like tune on a pentatonic scale (rising for questions, falling at the end of
  // a sentence); sung lines follow the melody of her song, note by note.
  const FORMANTS = {
    a: [900, 1350, 2950], e: [560, 2150, 3050], i: [330, 2750, 3550], o: [560, 960, 2850], u: [390, 1050, 2750],
    n: [280, 1150, 2700],
  };
  const SPEAK_SCALE = [62, 64, 67, 69, 72, 74, 76, 79];
  const SONG_NOTES = TRACKS.song.melody;
  const SONG_BEAT = 60 / TRACKS.song.bpm;
  let sungNote = 0, voiceBus = null, utter = null, speakingUntil = 0;

  function vowelOf(v) {
    if (/^(ee|ie|ea|ey|i|y)/.test(v)) return 'i';
    if (/^(oo|ou|u|ew)/.test(v)) return 'u';
    if (/^(o)/.test(v)) return 'o';
    if (/^(e|ai|ay|ei)/.test(v)) return 'e';
    return 'a';
  }

  function syllables(text) {
    const out = [];
    const tokens = text.toLowerCase().replace(/[“”"♪()]/g, '').split(/(\s+|[,.!?…;:—\/-]+)/);
    for (const tok of tokens) {
      if (!tok || !tok.trim()) continue;
      if (/^[,.!?…;:—\/-]+$/.test(tok)) {
        out.push({ pause: /[.!?…]/.test(tok) ? 0.3 : tok.includes('/') ? 0.22 : 0.14, q: tok.includes('?'), end: /[.!?…]/.test(tok) });
        continue;
      }
      const w = tok.replace(/[^a-z]/g, '');
      if (!w) continue;
      const parts = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+$)?/g) || [w + 'a'];
      parts.forEach((p, i) => {
        const m = /^([^aeiouy]*)([aeiouy]+)(.*)$/.exec(p) || ['', p, 'a', ''];
        out.push({ onset: m[1], vowel: vowelOf(m[2]), coda: m[3], stress: i === 0 });
      });
    }
    return out;
  }

  function setupVoice() {
    voiceBus = ctx.createGain();
    voiceBus.gain.value = 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3;
    voiceBus.connect(comp).connect(master);
    const verb = reverb(2.2);
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    comp.connect(verb).connect(wet).connect(master);
  }

  function hush() {
    if (speechOn && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
    talking = false;
    if (!utter || !ctx) return;
    const u = utter; utter = null;
    const now = ctx.currentTime;
    u.amp.gain.cancelScheduledValues(now);
    u.amp.gain.setTargetAtTime(0, now, 0.03);
    u.noiseGain.gain.cancelScheduledValues(now);
    u.noiseGain.gain.setTargetAtTime(0, now, 0.02);
    for (const o of u.oscs) { try { o.stop(now + 0.25); } catch (e) { /* already stopped */ } }
    speakingUntil = now;
  }

  // ---------- Her speaking voice ----------
  // Spoken lines use the browser's own text-to-speech, so she says the actual words, pitched up
  // high and bright to sound like her. Which voices exist depends on the computer, so the most
  // Miku-like one available is picked (a young or bright female English voice), and the player
  // can choose another on the title screen.
  const VOICE_KEY = 'elevators-voice';
  const PREFER = [/Ana.*Natural/i, /Aria.*Natural/i, /Jenny.*Natural/i, /Ava.*Natural/i, /Google US English/i, /Zira/i, /Samantha/i, /Google UK English Female/i, /female/i];
  let voices = [], voiceName = null, speechOn = !!window.speechSynthesis, talking = false, talkTimer = 0;
  try { voiceName = localStorage.getItem(VOICE_KEY); } catch (e) { /* no storage */ }
  function loadVoices() {
    if (!speechOn) return;
    voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    document.dispatchEvent(new Event('voiceschanged-game'));
  }
  if (speechOn) { loadVoices(); speechSynthesis.addEventListener('voiceschanged', loadVoices); }
  function pickVoice() {
    const sys = voiceName && !voiceName.startsWith('k:') ? voiceName.replace(/^s:/, '') : null;
    if (sys) { const v = voices.find((x) => x.name === sys); if (v) return v; }
    for (const re of PREFER) { const v = voices.find((x) => re.test(x.name)); if (v) return v; }
    return voices[0] || null;
  }
  // Natural (neural) voices already sound young; the older robotic ones need more lift.
  const pitchFor = (v) => (v && /Natural|Online/i.test(v.name) ? 1.35 : 1.75);

  function speak(text) {
    if (!speechOn) return 0;
    speechSynthesis.cancel();
    if (muted) return 0;
    const clean = text.replace(/[“”"]/g, '').replace(/…/g, '... ').replace(/—/g, ', ').replace(/\s+/g, ' ').trim();
    if (!/[a-z0-9]/i.test(clean)) return 0;
    const u = new SpeechSynthesisUtterance(clean);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = pitchFor(v);
    u.rate = 1.04;
    u.volume = 1;
    talking = true;
    clearTimeout(talkTimer);
    // Rough length, in case the end event never comes.
    talkTimer = setTimeout(() => { talking = false; }, 600 + clean.length * 75);
    u.onend = u.onerror = () => { talking = false; clearTimeout(talkTimer); };
    speechSynthesis.speak(u);
    return clean.length * 0.07;
  }

  // Says (or, for her song, sings) a line. kind 'm' = speaking, 's' = singing.
  function say(text, kind) {
    if (kind !== 's') { hush(); return speak(text); }
    if (!ctx) return 0;
    hush();
    const syl = syllables(text);
    if (!syl.length) return 0;
    const singing = kind === 's';
    const t0 = ctx.currentTime + 0.04;
    const out = ctx.createGain(); out.gain.value = singing ? 0.62 : 0.4; out.connect(voiceBus);

    // Source: a bright saw with a little square for buzz, and vibrato.
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.detune.value = 6;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.6;
    const vibAmt = ctx.createGain(); vibAmt.gain.value = 0;
    vib.connect(vibAmt); vibAmt.connect(osc.frequency); vibAmt.connect(osc2.frequency);
    const src = ctx.createGain();
    const g2 = ctx.createGain(); g2.gain.value = 0.22;
    osc.connect(src); osc2.connect(g2).connect(src);
    const amp = ctx.createGain(); amp.gain.value = 0;
    src.connect(amp);
    const fl = [[7, 1], [11, 0.6], [14, 0.32]].map(([q, gain], k) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.value = FORMANTS.a[k];
      const g = ctx.createGain(); g.gain.value = gain;
      amp.connect(f).connect(g).connect(out);
      return f;
    });
    const air = ctx.createBiquadFilter(); air.type = 'highpass'; air.frequency.value = 3800;
    const airG = ctx.createGain(); airG.gain.value = 0.06;
    amp.connect(air).connect(airG).connect(out);
    // Consonant noise.
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(1, false); noise.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 5000;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
    noise.connect(nf).connect(noiseGain).connect(out);

    let t = t0, step = 4 + Math.floor(Math.random() * 2);
    const setF = (vowel, at, tc) => FORMANTS[vowel].forEach((fr, k) => fl[k].frequency.setTargetAtTime(fr * (singing ? 1.04 : 1.08), at, tc));
    let first = true;
    for (let i = 0; i < syl.length; i++) {
      const s = syl[i];
      if (s.pause !== undefined) {
        amp.gain.setValueAtTime(amp.gain.value, t);
        amp.gain.linearRampToValueAtTime(0, t + 0.04);
        t += singing ? s.pause * 0.8 : s.pause;
        continue;
      }
      // Pitch and length.
      let note, dur;
      if (singing) {
        while (SONG_NOTES[sungNote % SONG_NOTES.length][0] === null) { t += SONG_NOTES[sungNote % SONG_NOTES.length][1] * SONG_BEAT * 0.3; sungNote++; }
        const [n, beats] = SONG_NOTES[sungNote % SONG_NOTES.length];
        sungNote++;
        note = n;
        dur = Math.min(0.75, Math.max(0.2, beats * SONG_BEAT * 0.48));
      } else {
        // A speech-like contour: wander round the middle, fall at the end, rise for a question.
        const next = syl[i + 1], endish = !next || next.pause !== undefined;
        const q = endish && next && next.q;
        step += Math.round((Math.random() - 0.5) * 2.2);
        step = Math.max(2, Math.min(6, step));
        let k = step;
        if (endish) k = q ? Math.min(7, step + 2) : Math.max(1, step - 2);
        if (s.stress && Math.random() < 0.35) k = Math.min(7, k + 1);
        note = SPEAK_SCALE[k];
        dur = 0.105 + (s.stress ? 0.035 : 0) + Math.min(0.06, s.coda.length * 0.018) + (endish ? 0.09 : 0);
      }
      const f0 = hz(note);
      const glide = singing ? 0.045 : 0.022;
      if (first) { osc.frequency.setValueAtTime(f0, t); osc2.frequency.setValueAtTime(f0, t); first = false; }
      else { osc.frequency.setTargetAtTime(f0, t, glide); osc2.frequency.setTargetAtTime(f0, t, glide); }
      const level = singing ? 0.9 : (s.stress ? 0.85 : 0.7);

      // The consonant at the start.
      const on = s.onset;
      let tv = t;
      if (/^(sh|ch|j)/.test(on)) { nf.type = 'bandpass'; nf.frequency.setValueAtTime(2800, t); noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.5, t + 0.02); noiseGain.gain.linearRampToValueAtTime(0, t + 0.07); tv = t + 0.06; amp.gain.setValueAtTime(0, t); }
      else if (/^(s|z|x|c[eiy])/.test(on + s.vowel)) { nf.type = 'highpass'; nf.frequency.setValueAtTime(5200, t); noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.45, t + 0.015); noiseGain.gain.linearRampToValueAtTime(0, t + 0.065); tv = t + 0.055; amp.gain.setValueAtTime(0, t); }
      else if (/^(f|h|th|v)/.test(on)) { nf.type = 'highpass'; nf.frequency.setValueAtTime(2200, t); noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.2, t + 0.015); noiseGain.gain.linearRampToValueAtTime(0, t + 0.05); tv = t + 0.04; amp.gain.setValueAtTime(0, t); }
      else if (/^[tdkgpbqc]/.test(on)) { nf.type = 'bandpass'; nf.frequency.setValueAtTime(/^[pb]/.test(on) ? 1200 : /^[kgqc]/.test(on) ? 2400 : 3800, t); amp.gain.setValueAtTime(0, t); noiseGain.gain.setValueAtTime(0.4, t + 0.012); noiseGain.gain.linearRampToValueAtTime(0, t + 0.03); tv = t + 0.025; }
      else if (/^[mn]/.test(on)) { setF('n', t, 0.006); amp.gain.setValueAtTime(level * 0.45, t + 0.005); tv = t + 0.05; }
      else if (/^[lrwy]/.test(on)) { setF(/^[wr]/.test(on) ? 'u' : 'i', t, 0.006); amp.gain.setValueAtTime(level * 0.5, t + 0.005); tv = t + 0.035; }
      else amp.gain.setValueAtTime(Math.min(amp.gain.value, level * 0.4), t);
      // The vowel.
      setF(s.vowel, tv, singing ? 0.03 : 0.015);
      amp.gain.linearRampToValueAtTime(level, tv + 0.03);
      const end = t + Math.max(dur, tv - t + 0.06);
      // Long sung notes bloom into vibrato.
      if (singing && dur > 0.45) { vibAmt.gain.setValueAtTime(0, tv); vibAmt.gain.linearRampToValueAtTime(f0 * 0.018, end - 0.05); vibAmt.gain.setValueAtTime(0, end); }
      amp.gain.setValueAtTime(level, end - 0.03);
      amp.gain.linearRampToValueAtTime(level * (singing ? 0.55 : 0.3), end);
      // A trailing s or t.
      if (/s$|z$/.test(s.coda)) { nf.type = 'highpass'; nf.frequency.setValueAtTime(5200, end - 0.03); noiseGain.gain.setValueAtTime(0, end - 0.03); noiseGain.gain.linearRampToValueAtTime(0.3, end); noiseGain.gain.linearRampToValueAtTime(0, end + 0.04); }
      t = end;
    }
    amp.gain.linearRampToValueAtTime(0, t + 0.08);
    const oscs = [osc, osc2, vib, noise];
    for (const o of oscs) { o.start(t0); o.stop(t + 0.3); }
    utter = { amp, noiseGain, oscs };
    speakingUntil = t;
    setTimeout(() => { if (utter && utter.amp === amp) utter = null; }, (t - ctx.currentTime + 0.5) * 1000);
    return t - t0;
  }

  function start() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    // Motor hum: two low, slightly detuned saws through a lowpass.
    const humBus = ctx.createGain();
    humBus.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 180;
    humBus.connect(lp).connect(master);
    for (const f of [55, 55.4, 110.3]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = f > 100 ? 0.2 : 0.5;
      o.connect(g).connect(humBus); o.start();
    }
    hum = humBus;

    wind = loopNoise(true, 'bandpass', 500, 0.7, 0.05);
    city = loopNoise(false, 'lowpass', 600, 0.5, 0.0);
    setupMusic();
    setupVoice();
    music(pending);
  }

  // Called every frame: how fast the cab moves (0..1), how close to the ground (0 = top,
  // 1 = ground) and how open the view is (1 in the open air, 0 inside a concrete band).
  // `ambience` scales the elevator sounds, for scenes away from the elevator.
  function update(motion, low, t, open = 1) {
    if (!ctx) return;
    const now = ctx.currentTime, a = ambience;
    hum.gain.setTargetAtTime((0.06 * motion + 0.01) * (1.6 - 0.6 * open) * a, now, 0.3);
    wind.gain.gain.setTargetAtTime(0.05 * (1 - low * 0.7) * (0.15 + 0.85 * open) * (0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.61)) * (0.3 + 0.7 * a), now, 0.5);
    wind.filter.frequency.setTargetAtTime(380 + 220 * Math.sin(t * 0.23), now, 0.5);
    city.gain.gain.setTargetAtTime((0.004 + 0.03 * low * low) * (0.2 + 0.8 * open) * (0.4 + 0.6 * a), now, 0.5);
    if (musicLP) musicLP.frequency.setTargetAtTime(500 + 17500 * open * open, now, 0.4);
  }

  function chime() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [[1318.5, 0], [1046.5, 0.32]].forEach(([f, d]) => {
      for (const mult of [1, 2.01]) {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = f * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + d);
        g.gain.linearRampToValueAtTime(mult === 1 ? 0.18 : 0.04, t + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.8);
        o.connect(g).connect(master);
        o.start(t + d); o.stop(t + d + 2);
      }
    });
  }

  function toggleMute() {
    muted = !muted;
    if (muted && speechOn) speechSynthesis.cancel();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    return muted;
  }

  return {
    start, update, chime, toggleMute, music, say, hush,
    // 0..1: how much she's voicing right now, for her mouth-and-body movement.
    get speaking() { return talking || (ctx && ctx.currentTime < speakingUntil) ? 1 : 0; },
    // The voices she can speak with ([value, label]), which is chosen, and choosing one.
    // Values are 'k:<id>' for her neural voices and 's:<name>' for the computer's own voices.
    get voices() {
      return voices.map((v) => ['s:' + v.name, v.name.replace(/^Microsoft |\s*-\s*English.*$/g, '')]);
    },
    get voice() { return 's:' + (pickVoice() || { name: '' }).name; },
    setVoice(value) {
      voiceName = value;
      try { localStorage.setItem(VOICE_KEY, value); } catch (e) { /* no storage */ }
      say("Hi! It's me, Miku. Is this how I sound?", 'm');
    },
    set ambience(v) { ambience = v; },
    get muted() { return muted; },
  };
})();
