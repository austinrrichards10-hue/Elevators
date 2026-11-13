// Sound, all synthesised: the cab's hum, wind on the glass, the city far below, a slow pad and the chime.
const Sound = (() => {
  let ctx = null, master = null, muted = false;
  let hum = null, wind = null, city = null;

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

  // A slow, soft chord pad that drifts between four chords.
  function startPad() {
    const chords = [
      [57, 64, 67, 71, 76], // Am9-ish
      [53, 60, 64, 67, 72], // Fmaj7
      [55, 62, 65, 69, 74], // G6/9-ish
      [52, 59, 62, 67, 71], // Em7
    ];
    const bus = ctx.createGain();
    bus.gain.value = 0.045;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    bus.connect(lp).connect(master);
    const len = 9;
    let i = 0;
    const play = () => {
      const t = ctx.currentTime;
      for (const n of chords[i % chords.length]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
        o.detune.value = (Math.random() - 0.5) * 8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 3);
        g.gain.linearRampToValueAtTime(0.12, t + len - 1);
        g.gain.linearRampToValueAtTime(0, t + len + 2.5);
        o.connect(g).connect(bus);
        o.start(t); o.stop(t + len + 3);
      }
      i++;
    };
    play();
    setInterval(play, len * 1000);
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
    startPad();
  }

  // Called every frame: how fast the cab moves (0..1) and how close to the ground (0 = top, 1 = ground).
  function update(motion, low, t) {
    if (!ctx) return;
    const now = ctx.currentTime;
    hum.gain.setTargetAtTime(0.06 * motion + 0.01, now, 0.3);
    wind.gain.gain.setTargetAtTime(0.05 * (1 - low * 0.7) * (0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.61)), now, 0.5);
    wind.filter.frequency.setTargetAtTime(380 + 220 * Math.sin(t * 0.23), now, 0.5);
    city.gain.gain.setTargetAtTime(0.004 + 0.03 * low * low, now, 0.5);
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
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    return muted;
  }

  return { start, update, chime, toggleMute, get muted() { return muted; } };
})();
