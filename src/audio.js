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
    src.connect(filter).connect(gain).connect(this.master);
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
      osc.connect(gain).connect(this.master);
      osc.start();
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
