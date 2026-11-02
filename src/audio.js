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

  /* ---------- Character room music ---------- */
  // A slow, wintry music-box loop: warm pad chords, a plucked arpeggio with echo,
  // and a sparse bell melody. Notes are scheduled a little ahead on the audio clock.
  roomTrack: {
    bpm: 72,
    // Am  Fmaj7  C  G/B  — two bars each.
    chords: [[57, 60, 64, 69], [53, 57, 60, 64], [48, 55, 60, 64], [47, 55, 59, 62]],
    // Melody per two-bar chord: [beat, midi note, beats long]; beats count 0-7.
    melody: [
      [[0, 76, 2], [2, 74, 1], [3, 72, 1], [4, 71, 3]],
      [[0, 72, 2], [2, 69, 2], [4, 72, 1], [5, 74, 2.5]],
      [[0, 76, 1.5], [1.5, 79, 0.5], [2, 76, 2], [4, 72, 3]],
      [[0, 71, 2], [2, 74, 1], [3, 72, 1], [4, 71, 1], [5, 67, 2.5]],
    ],
  },

  setRoomMusic(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [bus, level] of [[this.music, on ? 0.55 : 0], [this.ambient, on ? 0.15 : 1]]) {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(level, t + (on ? 1.5 : 1));
    }
    if (on && !this.musicTimer) {
      this.buildMusicFx();
      this.musicBeat = 0;
      this.musicStart = t + 0.1;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 200);
      this.scheduleMusic();
    } else if (!on && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  },

  buildMusicFx() {
    if (this.echo) return;
    // Feedback delay for the plucks and bells, softened so repeats sit behind the pad.
    this.echo = this.ctx.createDelay(2);
    this.echo.delayTime.value = 60 / this.roomTrack.bpm * 0.75;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.echo.connect(tone).connect(feedback).connect(this.echo);
    tone.connect(this.music);
  },

  scheduleMusic() {
    const track = this.roomTrack;
    const beatLen = 60 / track.bpm;
    const horizon = this.ctx.currentTime + 1.5;
    while (this.musicStart + this.musicBeat * beatLen < horizon) {
      const beat = this.musicBeat;
      const t = this.musicStart + beat * beatLen;
      const bar2 = beat % 8;
      const chordIndex = Math.floor(beat / 8) % track.chords.length;
      const chord = track.chords[chordIndex];
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
      this.musicBeat++;
    }
  },

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  pad(chord, t, len) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(1100, t + len * 0.5);
    filter.frequency.linearRampToValueAtTime(600, t + len);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + len * 0.3);
    gain.gain.setValueAtTime(0.05, t + len * 0.75);
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

  bell(note, t, len) {
    // Two inharmonic partials give a soft glassy bell.
    for (const [ratio, volume] of [[1, 0.07], [2.76, 0.018]]) {
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

  gunshot(kind) {
    const [dur, freq, vol, from, to, tone] = {
      pistol: [0.22, 2600, 0.7, 190, 45, 0.55],
      smg: [0.1, 3400, 0.45, 240, 70, 0.3],
      rifle: [0.2, 2200, 0.72, 170, 42, 0.6],
      shotgun: [0.45, 1500, 1, 120, 30, 0.9],
      sniper: [0.7, 1800, 1, 100, 24, 1],
    }[kind];
    this.burst(dur, freq, 0.6, vol);
    this.tone(from, to, dur * 0.8, tone);
  },
  click() { this.tone(1500, 900, 0.04, 0.2, 'square'); },
  magOut() { this.tone(900, 500, 0.06, 0.2, 'square'); this.burst(0.05, 2400, 2, 0.14, 'bandpass'); },
  magIn() { this.tone(1200, 700, 0.05, 0.24, 'square'); this.burst(0.06, 1800, 2, 0.2, 'bandpass'); },
  rack() { this.tone(1400, 800, 0.05, 0.22, 'square'); setTimeout(() => this.tone(1800, 1000, 0.05, 0.26, 'square'), 90); },
  shell() { this.burst(0.05, 1500, 3, 0.26, 'bandpass'); this.tone(700, 420, 0.04, 0.15, 'square'); },
  pump() { this.burst(0.07, 1100, 2, 0.32, 'bandpass'); setTimeout(() => { if (this.ctx) this.burst(0.08, 1500, 2, 0.36, 'bandpass'); }, 150); },
  bolt() { this.tone(1000, 620, 0.06, 0.2, 'square'); setTimeout(() => this.tone(800, 1300, 0.07, 0.22, 'square'), 260); },
  swap() { this.burst(0.08, 1300, 2, 0.14, 'bandpass'); },
  thud() { this.burst(0.16, 420, 0.8, 0.26); },
  step() { this.burst(0.09, 1300, 1.4, 0.09 + Math.random() * 0.05, 'bandpass'); },
  hit() { this.burst(0.09, 900, 1, 0.4, 'bandpass'); this.tone(240, 90, 0.09, 0.22, 'square'); },
  hurt() { this.burst(0.2, 500, 0.8, 0.6); this.tone(150, 55, 0.25, 0.45, 'sawtooth'); },
  groan() { this.tone(95 + Math.random() * 45, 52, 0.75, 0.13, 'sawtooth'); },
  ignite() { this.burst(1.1, 700, 0.5, 0.55); this.tone(110, 330, 0.9, 0.18); },
  slam() { this.burst(0.55, 260, 0.6, 1); this.tone(80, 28, 0.6, 0.8); },
  ice() { this.tone(2400, 900, 0.22, 0.14, 'triangle'); },
  roar() { this.tone(70, 38, 1.8, 0.65, 'sawtooth'); this.burst(1.6, 340, 0.7, 0.45); },
};
