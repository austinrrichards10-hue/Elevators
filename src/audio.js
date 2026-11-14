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

  // ---------- The music: a slow, sad piece for piano and strings, in A minor. ----------
  // Sixteen bars at 52 bpm (about 74 seconds), looping: the piano plays a falling melody over
  // broken chords, and low strings swell in under it. The second half climbs higher and aches
  // more, and both halves end hanging on E major, the chord that wants to go home and doesn't.
  const BPM = 52, BEAT = 60 / BPM;
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // [chord tones for the left hand (low to high), bass note for the strings], one per bar.
  const BARS = [
    [[45, 52, 57, 60], 33],  // Am
    [[41, 48, 53, 57], 29],  // F
    [[48, 55, 60, 64], 36],  // C
    [[43, 50, 55, 59], 31],  // G
    [[45, 52, 57, 60], 33],  // Am
    [[41, 48, 53, 57], 29],  // F
    [[38, 45, 50, 53], 26],  // Dm
    [[40, 47, 52, 56], 28],  // E
    [[41, 48, 53, 57], 29],  // F
    [[48, 55, 60, 64], 36],  // C
    [[38, 45, 50, 53], 26],  // Dm
    [[45, 52, 57, 60], 33],  // Am
    [[41, 48, 53, 57], 29],  // F
    [[43, 50, 55, 59], 31],  // G
    [[45, 52, 57, 60], 33],  // Am
    [[40, 47, 52, 56], 28],  // E
  ];
  // The melody: [note, beats], or [null, beats] for a rest. Four beats a bar.
  const MELODY = [
    [76, 2], [74, 1], [72, 1],
    [72, 1.5], [71, 0.5], [69, 2],
    [67, 1], [69, 1], [72, 1], [76, 1],
    [74, 3], [71, 1],
    [72, 2], [71, 1], [69, 1],
    [69, 1.5], [67, 0.5], [65, 1], [69, 1],
    [65, 2], [64, 1], [62, 1],
    [68, 3], [null, 1],
    [81, 2], [79, 1], [77, 1],
    [79, 1.5], [77, 0.5], [76, 2],
    [77, 1], [76, 1], [74, 1], [72, 1],
    [72, 2], [71, 1], [69, 1],
    [72, 1.5], [74, 0.5], [76, 2],
    [74, 1], [72, 1], [71, 2],
    [69, 3], [72, 1],
    [71, 3], [68, 1],
  ];

  let music = null, musicLP = null;

  // A long, dark hall reverb, made from decaying noise.
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

  // A soft felt-piano note: a few sine partials with a quick, gentle attack and a long decay.
  function piano(n, t, dur, vel) {
    const f = hz(n);
    const out = ctx.createGain();
    out.connect(music.piano);
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

  // Low strings: detuned saws, filtered dark, swelling in and out over a bar.
  function strings(n, t, dur) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0, t + dur + 1.2);
    lp.connect(g).connect(music.strings);
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

  // Schedules the piece a few seconds ahead of the clock, one bar at a time.
  function startMusic() {
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, ctx.currentTime, 3);    // fade in
    const verb = reverb(4.5);
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    const dry = ctx.createGain(); dry.gain.value = 0.7;
    // Muffled, as if through concrete, while the car is inside the tower's bands.
    musicLP = ctx.createBiquadFilter();
    musicLP.type = 'lowpass'; musicLP.frequency.value = 18000;
    musicLP.connect(master);
    bus.connect(dry).connect(musicLP);
    bus.connect(verb).connect(wet).connect(musicLP);
    const pianoBus = ctx.createGain(); pianoBus.gain.value = 0.16;
    const stringBus = ctx.createGain(); stringBus.gain.value = 0.5;
    pianoBus.connect(bus); stringBus.connect(bus);
    music = { piano: pianoBus, strings: stringBus };

    // Where each melody note falls, in beats from the start of the loop.
    const notes = [];
    let at = 0;
    for (const [n, b] of MELODY) { if (n !== null) notes.push([n, at, b]); at += b; }

    let bar = 0, barTime = ctx.currentTime + 1.5;
    const tick = () => {
      while (barTime < ctx.currentTime + 4) {
        const i = bar % BARS.length;
        const [chord, bass] = BARS[i];
        const sway = (k) => (Math.random() - 0.5) * 0.02 + k;        // a slightly human touch
        // Left hand: the chord broken upward in eighths, then back down.
        const pattern = [0, 1, 2, 3, 2, 1, 2, 1];
        pattern.forEach((p, k) => piano(chord[p], sway(barTime + k * BEAT / 2), BEAT / 2, k === 0 ? 0.55 : 0.32));
        strings(bass, barTime, BEAT * 4);
        if (i % 2 === 0) strings(bass + 12, barTime, BEAT * 8);
        // Right hand: the melody notes in this bar, louder on the way up the second time round.
        const lift = i >= 8 ? 1.1 : 0.95;
        for (const [n, b, d] of notes) if (b >= i * 4 && b < i * 4 + 4) piano(n, sway(barTime + (b - i * 4) * BEAT), d * BEAT, 0.62 * lift);
        bar++;
        barTime += BEAT * 4 * (i === BARS.length - 1 ? 1.25 : 1);    // a breath before it starts over
      }
    };
    tick();
    setInterval(tick, 500);
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
    startMusic();
  }

  // Called every frame: how fast the cab moves (0..1), how close to the ground (0 = top,
  // 1 = ground) and how open the view is (1 at a sky deck, 0 shut in the shaft).
  function update(motion, low, t, open = 1) {
    if (!ctx) return;
    const now = ctx.currentTime;
    // In the shaft the motor is louder and the city outside is muffled.
    hum.gain.setTargetAtTime((0.06 * motion + 0.01) * (1.6 - 0.6 * open), now, 0.3);
    wind.gain.gain.setTargetAtTime(0.05 * (1 - low * 0.7) * (0.15 + 0.85 * open) * (0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.61)), now, 0.5);
    wind.filter.frequency.setTargetAtTime(380 + 220 * Math.sin(t * 0.23), now, 0.5);
    city.gain.gain.setTargetAtTime((0.004 + 0.03 * low * low) * (0.2 + 0.8 * open), now, 0.5);
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
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    return muted;
  }

  return { start, update, chime, toggleMute, get muted() { return muted; } };
})();
