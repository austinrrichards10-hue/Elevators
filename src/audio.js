// All sound is synthesized with WebAudio, so the game needs no audio files.
const Sfx = {
  ctx: null,
  master: null,
  noise: null,
  muted: false,

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);
    // Forest ambience and room music each get a bus so they can crossfade.
    this.ambient = this.ctx.createGain();
    this.ambient.connect(this.master);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);

    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.startWind();
    this.startDrone();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
  },

  startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.09;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    src.connect(filter).connect(gain).connect(this.ambient);
    src.start();
    lfo.start();
  },

  startDrone() {
    for (const freq of [55, 82.4, 110.6]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.022;
      osc.connect(gain).connect(this.ambient);
      osc.start();
    }
  },

  /* ---------- Music ---------- */
  // Looping tracks built from synth voices. Notes are scheduled a little ahead on the audio
  // clock. Each track sets how much of the outdoor ambience stays audible under it.
  tracks: {
    // Character room: a slow, wintry music box. Am  Fmaj7  C  G/B, two bars each.
    room: {
      bpm: 72, level: 0.55, ambient: 0.15,
      chords: [[57, 60, 64, 69], [53, 57, 60, 64], [48, 55, 60, 64], [47, 55, 59, 62]],
      // Melody per two-bar chord: [beat, midi note, beats long]; beats count 0-7.
      melody: [
        [[0, 76, 2], [2, 74, 1], [3, 72, 1], [4, 71, 3]],
        [[0, 72, 2], [2, 69, 2], [4, 72, 1], [5, 74, 2.5]],
        [[0, 76, 1.5], [1.5, 79, 0.5], [2, 76, 2], [4, 72, 3]],
        [[0, 71, 2], [2, 74, 1], [3, 72, 1], [4, 71, 1], [5, 67, 2.5]],
      ],
    },
  },

  // Switches to a track by name, or to silence with null, crossfading the buses.
  playMusic(name) {
    if (!this.ctx || name === this.trackName) return;
    this.trackName = name;
    const track = name ? this.tracks[name] : null;
    const t = this.ctx.currentTime;
    for (const [bus, level] of [[this.music, track ? track.level : 0], [this.ambient, track ? track.ambient : 1]]) {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(level, t + (track ? 1.5 : 1));
    }
    if (track) {
      this.buildMusicFx();
      this.echo.delayTime.setValueAtTime(60 / track.bpm * 0.75, t);
      this.track = track;
      this.musicBeat = 0;
      this.musicStart = t + 0.15;
      if (!this.musicTimer) this.musicTimer = setInterval(() => this.scheduleMusic(), 200);
      this.scheduleMusic();
    } else if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  },

  buildMusicFx() {
    if (this.echo) return;
    // Feedback delay for the plucks and bells, softened so repeats sit behind the pad.
    this.echo = this.ctx.createDelay(2);
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.echo.connect(tone).connect(feedback).connect(this.echo);
    tone.connect(this.music);
  },

  scheduleMusic() {
    const track = this.track;
    const beatLen = 60 / track.bpm;
    const horizon = this.ctx.currentTime + 1.5;
    while (this.musicStart + this.musicBeat * beatLen < horizon) {
      const beat = this.musicBeat;
      const t = this.musicStart + beat * beatLen;
      const bar2 = beat % 8;
      const chordIndex = Math.floor(beat / 8) % track.chords.length;
      const chord = track.chords[chordIndex];
      this.musicBoxBeat(track, chord, chordIndex, bar2, t, beatLen);
      this.musicBeat++;
    }
  },

  musicBoxBeat(track, chord, chordIndex, bar2, t, beatLen) {
    if (bar2 === 0) {
      this.pad(chord, t, beatLen * 8);
      this.pluck(chord[0] - 12, t, beatLen * 4, 0.16, 'triangle');
      this.pluck(chord[0] - 12, t + beatLen * 4, beatLen * 4, 0.12, 'triangle');
      for (const [at, note, len] of track.melody[chordIndex]) this.bell(note, t + at * beatLen, len * beatLen);
    }
    // Eighth-note arpeggio, climbing then falling across the chord.
    const order = [0, 1, 2, 3, 2, 1];
    for (let half = 0; half < 2; half++) {
      const step = (bar2 * 2 + half) % order.length;
      const note = chord[order[step]] + 12;
      this.pluck(note, t + half * beatLen / 2, beatLen * 1.4, 0.05 + (half ? 0 : 0.015), 'sine', true);
    }
  },

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  pad(chord, t, len, level = 0.05) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(1100, t + len * 0.5);
    filter.frequency.linearRampToValueAtTime(600, t + len);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level, t + len * 0.3);
    gain.gain.setValueAtTime(level, t + len * 0.75);
    gain.gain.linearRampToValueAtTime(0.0001, t + len + 0.6);
    filter.connect(gain).connect(this.music);
    for (const note of chord) {
      for (const detune of [-7, 7]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = this.midi(note);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + len + 0.7);
      }
    }
  },

  pluck(note, t, len, volume, type, echo = false) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = this.midi(note);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(this.music);
    if (echo) gain.connect(this.echo);
    osc.start(t);
    osc.stop(t + len + 0.05);
  },

  bell(note, t, len, level = 1) {
    // Two inharmonic partials give a soft glassy bell.
    for (const [ratio, volume] of [[1, 0.07 * level], [2.76, 0.018 * level]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = this.midi(note) * ratio;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, 0.6) * 1.6);
      osc.connect(gain).connect(this.music);
      gain.connect(this.echo);
      osc.start(t);
      osc.stop(t + Math.max(len, 0.6) * 1.6 + 0.05);
    }
  },

  burst(duration, freq, q, volume, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + duration);
  },

  tone(from, to, duration, volume, type = 'sine') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
  },

  // A soft creak as the string comes back.
  bowDraw() { this.burst(0.55, 380, 5, 0.06, 'bandpass'); this.tone(85, 130, 0.5, 0.04, 'triangle'); },
  // The string's thrum and the arrow's whoosh, both stronger at a full draw.
  bowRelease(power) {
    this.tone(240, 140, 0.16, 0.16 + power * 0.14, 'triangle');
    this.burst(0.14 + power * 0.1, 2400, 1.1, 0.12 + power * 0.2, 'bandpass');
  },
  swap() { this.burst(0.08, 1300, 2, 0.14, 'bandpass'); },
  arrowHit() { this.burst(0.08, 650, 1.5, 0.32, 'bandpass'); this.tone(170, 85, 0.07, 0.16, 'square'); },
  thud() { this.burst(0.16, 420, 0.8, 0.26); },

  // A tone whose pitch follows a list of [seconds, frequency] points, with optional vibrato.
  glide(points, volume, type = 'sine', vibrato = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(points[0][1], t);
    for (const [at, freq] of points.slice(1)) osc.frequency.linearRampToValueAtTime(freq, t + at);
    const end = points[points.length - 1][0];
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + Math.min(0.25, end * 0.2));
    gain.gain.setValueAtTime(volume, t + end * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.001, t + end);
    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const depth = this.ctx.createGain();
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + end);
    }
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + end);
  },

  // A sound that runs until stopped: filtered noise and/or a low hum. Returns a handle whose
  // set(level) fades it and stop() ends it.
  loop({ noise = 0, filter = 600, hum = 0, humFreq = 60 }) {
    if (!this.ctx) return { set() {}, stop() {} };
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    const nodes = [];
    if (noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      const g = this.ctx.createGain();
      g.gain.value = noise;
      src.connect(f).connect(g).connect(gain);
      src.start(t);
      nodes.push(src);
    }
    if (hum) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = humFreq;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = humFreq * 4;
      const g = this.ctx.createGain();
      g.gain.value = hum;
      osc.connect(f).connect(g).connect(gain);
      osc.start(t);
      nodes.push(osc);
    }
    return {
      set: (level, time = 0.2) => gain.gain.setTargetAtTime(level, this.ctx.currentTime, time / 3),
      stop: () => {
        gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        for (const node of nodes) node.stop(this.ctx.currentTime + 0.6);
      },
    };
  },

  /* ---------- Wilderness ---------- */
  // A long rising and falling howl; `level` falls off with distance.
  howl(level = 1) {
    const base = 340 + Math.random() * 60;
    this.glide([[0, base * 0.8], [0.6, base * 1.35], [1.9, base * 1.25], [2.8, base * 0.9]], 0.09 * level, 'sine', 6);
    this.glide([[0, base * 1.6], [0.6, base * 2.7], [1.9, base * 2.5], [2.8, base * 1.8]], 0.02 * level, 'sine', 8);
  },
  wolfYelp(level = 1) { this.glide([[0, 700], [0.12, 1100], [0.25, 600]], 0.06 * level, 'triangle'); },
  chop() { this.burst(0.12, 700, 1.4, 0.55, 'bandpass'); this.tone(150, 70, 0.12, 0.3, 'triangle'); },
  axeSwing() { this.burst(0.18, 1800, 0.9, 0.12, 'bandpass'); },
  treeCreak() { this.glide([[0, 90], [0.8, 140], [1.6, 70]], 0.12, 'sawtooth', 9); },
  treeCrash() { this.burst(1.2, 380, 0.5, 0.9); this.tone(70, 30, 0.8, 0.5); },
  planks() { this.burst(0.08, 1200, 2, 0.35, 'bandpass'); this.tone(320, 260, 0.08, 0.12, 'triangle'); },
  pickup() { this.tone(660, 990, 0.12, 0.12, 'triangle'); setTimeout(() => this.tone(990, 1320, 0.16, 0.1, 'triangle'), 90); },
  craft() { this.burst(0.25, 900, 1, 0.3, 'bandpass'); setTimeout(() => this.tone(520, 780, 0.2, 0.1, 'triangle'), 120); },
  ignite() { this.burst(1.1, 700, 0.5, 0.45); this.tone(110, 330, 0.9, 0.12); },
  crackle(level = 1) { this.burst(0.03 + Math.random() * 0.04, 2500 + Math.random() * 2000, 2, 0.12 * level, 'bandpass'); },

  /* ---------- Cutscene ---------- */
  boom(level = 1) { this.burst(2.2, 160, 0.4, 1.2 * level); this.tone(55, 22, 1.8, 0.9 * level); },
  branchSnap() { this.burst(0.07, 2600, 1.5, 0.5, 'bandpass'); this.burst(0.2, 900, 1, 0.35, 'bandpass'); },
  snowSlam() { this.burst(0.7, 500, 0.6, 1); this.tone(90, 35, 0.5, 0.7); },
  ring() { this.glide([[0, 3200], [2.4, 3150]], 0.025, 'sine'); },
  step() { this.burst(0.09, 1300, 1.4, 0.09 + Math.random() * 0.05, 'bandpass'); },
};
