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
    // Forest ambience and music each get a bus so they can crossfade.
    this.ambient = this.ctx.createGain();
    this.ambient.connect(this.master);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);

    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.buildReverb();
    // The newer one-shots go out through here: straight to the speakers, and a little into
    // the reverb, so they sound like they're out in a big cold valley rather than in a box.
    this.sfx = this.ctx.createGain();
    this.sfx.connect(this.master);
    const send = this.ctx.createGain();
    send.gain.value = 0.22;
    this.sfx.connect(send).connect(this.verb);
    this.startAmbience();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
  },

  // A long, dark hall of a reverb, from an impulse of decaying noise.
  buildReverb() {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * 3.2);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = impulse;
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    const level = this.ctx.createGain();
    level.gain.value = 0.6;
    this.verb.connect(tone).connect(level).connect(this.master);
  },

  // A noise source, looped, filtered, panned, at a level, into a bus. Returns its nodes.
  noiseBed(bus, { type = 'lowpass', freq = 400, q = 0.7, level = 0.1, pan = 0 }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = level;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    src.connect(filter).connect(gain).connect(panner).connect(bus);
    src.start(0, Math.random() * 1.5);
    return { src, filter, gain, panner };
  },

  lfo(param, rate, depth) {
    const osc = this.ctx.createOscillator();
    osc.frequency.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    osc.connect(g).connect(param);
    osc.start();
    return osc;
  },

  // The mountain: a deep rumble of wind under everything, two drifting layers of it moving
  // across the stereo field, fine snow hissing on it, and now and then a gust that rises,
  // whistles through the pines and dies away, or the far-off crack of ice.
  startAmbience() {
    const rumble = this.noiseBed(this.ambient, { freq: 160, level: 0.16 });
    this.lfo(rumble.gain.gain, 0.05, 0.06);
    for (const [pan, rate, freq] of [[-0.6, 0.07, 380], [0.6, 0.11, 520]]) {
      const layer = this.noiseBed(this.ambient, { type: 'bandpass', freq, q: 0.8, level: 0.05, pan });
      this.lfo(layer.filter.frequency, rate, freq * 0.45);
      this.lfo(layer.gain.gain, rate * 0.7, 0.025);
      this.lfo(layer.panner.pan, rate * 0.3, 0.3);
    }
    const hiss = this.noiseBed(this.ambient, { type: 'highpass', freq: 5200, level: 0.012 });
    this.lfo(hiss.gain.gain, 0.13, 0.006);
    const later = (min, max, fn) => setTimeout(() => { fn(); later(min, max, fn); }, (min + Math.random() * (max - min)) * 1000);
    later(5, 13, () => this.gust());
    later(18, 45, () => this.iceCrack());
  },

  gust() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, len = 3 + Math.random() * 3, peak = 0.06 + Math.random() * 0.06;
    const pan = Math.random() * 1.6 - 0.8;
    const body = this.noiseBed(this.ambient, { type: 'bandpass', freq: 300, q: 1.2, level: 0, pan });
    body.filter.frequency.setValueAtTime(300, t);
    body.filter.frequency.linearRampToValueAtTime(700 + Math.random() * 400, t + len * 0.45);
    body.filter.frequency.linearRampToValueAtTime(260, t + len);
    body.gain.gain.setValueAtTime(0.0001, t);
    body.gain.gain.linearRampToValueAtTime(peak, t + len * 0.45);
    body.gain.gain.linearRampToValueAtTime(0.0001, t + len);
    body.panner.pan.setValueAtTime(pan, t);
    body.panner.pan.linearRampToValueAtTime(-pan * 0.6, t + len);
    body.src.stop(t + len + 0.1);
    // The whistle through the needles: narrow, high, wavering.
    const whistle = this.noiseBed(this.ambient, { type: 'bandpass', freq: 1400, q: 14, level: 0, pan });
    whistle.filter.frequency.setValueAtTime(1100 + Math.random() * 300, t);
    whistle.filter.frequency.linearRampToValueAtTime(1700 + Math.random() * 500, t + len * 0.5);
    whistle.filter.frequency.linearRampToValueAtTime(1000, t + len);
    whistle.gain.gain.setValueAtTime(0.0001, t);
    whistle.gain.gain.linearRampToValueAtTime(peak * 0.9, t + len * 0.5);
    whistle.gain.gain.linearRampToValueAtTime(0.0001, t + len);
    whistle.src.stop(t + len + 0.1);
  },

  // Far off across the valley, ice giving way: a sharp crack and a long rolling echo.
  iceCrack() {
    if (!this.ctx || this.trackName === 'teto') return;
    const pan = Math.random() * 1.6 - 0.8;
    this.hit({ dur: 0.08, freq: 2400, q: 1.5, vol: 0.05, type: 'bandpass', pan, verb: 1.4, bus: this.ambient });
    this.hit({ dur: 1.4, freq: 180, to: 60, q: 0.6, vol: 0.05, pan, verb: 1.4, bus: this.ambient, delay: 0.03 });
  },

  // A one-shot burst of noise, with an optional filter sweep, pan, delay and reverb send.
  hit({ dur = 0.1, freq = 1000, to = 0, q = 1, vol = 0.2, type = 'lowpass', pan = 0, verb = 0, delay = 0, bus = null, attack = 0.004 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    src.connect(filter).connect(gain).connect(panner).connect(bus || this.sfx);
    if (verb) { const s = this.ctx.createGain(); s.gain.value = verb; panner.connect(s).connect(this.verb); }
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  },

  // A pitched one-shot: an oscillator gliding between pitches, through an optional lowpass.
  voice({ from = 440, to = 0, dur = 0.2, vol = 0.1, type = 'sine', filter = 0, pan = 0, verb = 0, delay = 0, attack = 0.005 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    let node = osc;
    if (filter) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; osc.connect(f); node = f; }
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    node.connect(gain).connect(panner).connect(this.sfx);
    if (verb) { const s = this.ctx.createGain(); s.gain.value = verb; panner.connect(s).connect(this.verb); }
    osc.start(t);
    osc.stop(t + dur + 0.05);
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
    // Out in the wilds: slow, sparse, lonely. Soft piano over a far-off pad in D minor,
    // Dm  Bbmaj7  Gm  A, two bars each. Every other time round the melody drops out and
    // there's only the piano breathing under the wind.
    wilds: {
      bpm: 58, level: 0.5, ambient: 0.9,
      chords: [[50, 57, 62, 65], [46, 57, 62, 65], [43, 55, 58, 62], [45, 57, 61, 64]],
      melody: [
        [[0, 74, 3], [3, 72, 1], [4, 69, 4]],
        [[1, 69, 1], [2, 70, 1], [3, 72, 2], [5, 69, 3]],
        [[0, 67, 2], [2, 70, 2], [4, 74, 3]],
        [[0, 73, 3], [4, 69, 4]],
      ],
      beat(S, beat, t, beatLen) { S.wildsBeat(this, beat, t, beatLen, 0.024, false); },
    },
    // The title: the same theme, fuller and warmer, the melody always there.
    title: {
      bpm: 64, level: 0.6, ambient: 0.5,
      chords: [[50, 57, 62, 65], [46, 57, 62, 65], [43, 55, 58, 62], [45, 57, 61, 64]],
      melody: [
        [[0, 74, 3], [3, 72, 1], [4, 69, 4]],
        [[1, 69, 1], [2, 70, 1], [3, 72, 2], [5, 69, 3]],
        [[0, 67, 2], [2, 70, 2], [4, 74, 3]],
        [[0, 73, 3], [4, 76, 2], [6, 74, 2]],
      ],
      beat(S, beat, t, beatLen) { S.wildsBeat(this, beat, t, beatLen, 0.04, true); },
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
      if (track.beat) track.beat(this, beat, t, beatLen);
      else this.musicBoxBeat(track, chord, chordIndex, bar2, t, beatLen);
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

  wildsBeat(track, beat, t, beatLen, padLevel, always) {
    const bar2 = beat % 8, ci = Math.floor(beat / 8) % track.chords.length;
    const chord = track.chords[ci], round = Math.floor(beat / 32);
    if (bar2 === 0) {
      this.pad(chord, t, beatLen * 8, padLevel);
      this.piano(chord[0] - 12, t, beatLen * 6, 0.07);
    }
    if (bar2 === 4) this.piano(chord[0] - 5, t, beatLen * 4, 0.035);
    // A slow broken chord, a little loose in its timing, like someone playing alone.
    for (const [at, idx] of [[0, 1], [1.5, 2], [3, 3], [5, 2], [6.5, 1]]) {
      if (Math.floor(at) !== bar2) continue;
      const swing = Math.random() * 0.03;
      this.piano(chord[idx] + 12, t + (at - bar2) * beatLen + swing, beatLen * 3, 0.03 + Math.random() * 0.008);
    }
    if ((always || round % 2 === 1) && bar2 === 0) {
      for (const [at, note, len] of track.melody[ci]) this.piano(note, t + at * beatLen, len * beatLen * 1.4, 0.06);
      if (always && ci === 3) this.bell(81, t + 6 * beatLen, beatLen * 2, 0.6);
    }
  },

  // A soft felt piano: a triangle with a little of its octave and twelfth, struck and dying.
  piano(note, t, len, volume) {
    const f = this.midi(note);
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    out.gain.exponentialRampToValueAtTime(volume * 0.35, t + 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.8);
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(Math.min(6000, f * 7), t);
    tone.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + len);
    tone.connect(out);
    out.connect(this.music);
    out.connect(this.echo);
    const s = this.ctx.createGain();
    s.gain.value = 0.7;
    out.connect(s).connect(this.verb);
    for (const [ratio, level, type] of [[1, 1, 'triangle'], [2, 0.3, 'sine'], [3, 0.08, 'sine']]) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f * ratio;
      osc.detune.value = (Math.random() - 0.5) * 6;
      const g = this.ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(tone);
      osc.start(t);
      osc.stop(t + len + 0.9);
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

  // The bow: wood creaking and the string stretching as it comes back...
  bowDraw() {
    this.hit({ dur: 0.6, freq: 300, to: 520, q: 6, vol: 0.05, type: 'bandpass', attack: 0.2 });
    this.voice({ from: 70, to: 115, dur: 0.55, vol: 0.035, type: 'sawtooth', filter: 400, attack: 0.25 });
  },
  // ...and the twang of it let go, and the arrow hissing away, stronger at a full draw.
  bowRelease(power) {
    this.voice({ from: 210 + power * 40, to: 150, dur: 0.35, vol: 0.12 + power * 0.1, type: 'sawtooth', filter: 1200, verb: 0.2 });
    this.voice({ from: 105, to: 80, dur: 0.25, vol: 0.1 });
    this.hit({ dur: 0.18 + power * 0.15, freq: 3200, to: 1200, q: 1, vol: 0.08 + power * 0.14, type: 'bandpass' });
  },
  swap() { this.hit({ dur: 0.1, freq: 1600, to: 900, q: 2, vol: 0.12, type: 'bandpass' }); this.voice({ from: 900, to: 1200, dur: 0.05, vol: 0.03, type: 'triangle' }); },
  arrowHit() {
    this.hit({ dur: 0.1, freq: 900, to: 300, q: 2, vol: 0.3, type: 'bandpass', verb: 0.15 });
    this.voice({ from: 190, to: 70, dur: 0.12, vol: 0.18, type: 'triangle' });
  },
  thud() { this.hit({ dur: 0.22, freq: 380, to: 120, q: 0.9, vol: 0.3, verb: 0.15 }); this.voice({ from: 90, to: 45, dur: 0.18, vol: 0.15 }); },

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
  // A long rising and falling howl; `level` falls off with distance. A throaty voice and its
  // overtone, wavering, with a long echo off the valley.
  howl(level = 1) {
    if (!this.ctx) return;
    const base = 330 + Math.random() * 70, t = this.ctx.currentTime, end = 3 + Math.random() * 0.8;
    const pan = Math.random() * 1.2 - 0.6;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.14 * level, t + 0.5);
    out.gain.setValueAtTime(0.14 * level, t + end * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + end);
    const throat = this.ctx.createBiquadFilter();
    throat.type = 'bandpass';
    throat.frequency.value = 900;
    throat.Q.value = 0.9;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    throat.connect(out).connect(panner).connect(this.master);
    const s = this.ctx.createGain();
    s.gain.value = 1.2;
    panner.connect(s).connect(this.verb);
    for (const [mul, type, vol] of [[1, 'sawtooth', 0.35], [1, 'sine', 1], [2.01, 'sine', 0.2]]) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(base * 0.75 * mul, t);
      osc.frequency.linearRampToValueAtTime(base * 1.3 * mul, t + 0.7);
      osc.frequency.linearRampToValueAtTime(base * 1.22 * mul, t + end * 0.7);
      osc.frequency.linearRampToValueAtTime(base * 0.8 * mul, t + end);
      const vib = this.ctx.createOscillator();
      vib.frequency.value = 5 + Math.random();
      const depth = this.ctx.createGain();
      depth.gain.value = 5 * mul;
      vib.connect(depth).connect(osc.frequency);
      const g = this.ctx.createGain();
      g.gain.value = vol;
      osc.connect(g).connect(throat);
      osc.start(t); vib.start(t);
      osc.stop(t + end + 0.1); vib.stop(t + end + 0.1);
    }
  },
  wolfYelp(level = 1) {
    this.voice({ from: 650, to: 1150, dur: 0.1, vol: 0.07 * level, type: 'sawtooth', filter: 2200, verb: 0.4 });
    this.voice({ from: 1150, to: 520, dur: 0.22, vol: 0.06 * level, type: 'triangle', delay: 0.09, verb: 0.4 });
  },
  chop() {
    this.hit({ dur: 0.09, freq: 2600, q: 1.5, vol: 0.35, type: 'bandpass' });
    this.hit({ dur: 0.22, freq: 520, to: 260, q: 4, vol: 0.4, type: 'bandpass', verb: 0.35 });
    this.voice({ from: 160, to: 90, dur: 0.15, vol: 0.2, type: 'triangle' });
  },
  axeSwing() { this.hit({ dur: 0.22, freq: 600, to: 2200, q: 1.4, vol: 0.12, type: 'bandpass', attack: 0.08 }); },
  treeCreak() {
    this.voice({ from: 80, to: 150, dur: 1.2, vol: 0.1, type: 'sawtooth', filter: 600, attack: 0.3, verb: 0.4 });
    this.hit({ dur: 1.4, freq: 900, q: 8, vol: 0.05, type: 'bandpass', attack: 0.4 });
  },
  treeCrash() {
    for (let i = 0; i < 6; i++) this.hit({ dur: 0.08, freq: 2000 + Math.random() * 2000, q: 1.5, vol: 0.25, type: 'bandpass', delay: i * 0.07 + Math.random() * 0.04 });
    this.hit({ dur: 1.8, freq: 400, to: 90, q: 0.5, vol: 0.9, verb: 0.6, delay: 0.4 });
    this.voice({ from: 70, to: 28, dur: 1.2, vol: 0.5, delay: 0.4 });
    this.hit({ dur: 2, freq: 3000, to: 800, q: 0.5, vol: 0.12, type: 'highpass', delay: 0.5, attack: 0.1 });
  },
  planks() {
    this.hit({ dur: 0.08, freq: 1400, q: 3, vol: 0.3, type: 'bandpass' });
    this.voice({ from: 330, to: 250, dur: 0.12, vol: 0.12, type: 'triangle' });
    this.voice({ from: 280, to: 220, dur: 0.12, vol: 0.1, type: 'triangle', delay: 0.07 });
  },
  pickup() {
    this.hit({ dur: 0.12, freq: 2400, q: 1, vol: 0.06, type: 'highpass' });
    this.voice({ from: 784, dur: 0.5, vol: 0.07, verb: 0.5 });
    this.voice({ from: 1175, dur: 0.6, vol: 0.06, delay: 0.08, verb: 0.5 });
  },
  craft() {
    for (let i = 0; i < 3; i++) this.hit({ dur: 0.1, freq: 900 + i * 300, q: 1.5, vol: 0.18, type: 'bandpass', delay: i * 0.08 });
    this.voice({ from: 587, dur: 0.5, vol: 0.06, delay: 0.25, verb: 0.5 });
    this.voice({ from: 880, dur: 0.7, vol: 0.06, delay: 0.35, verb: 0.5 });
  },
  ignite() {
    this.hit({ dur: 1.3, freq: 200, to: 1400, q: 0.6, vol: 0.4, attack: 0.25, verb: 0.3 });
    this.voice({ from: 70, to: 140, dur: 1, vol: 0.12, attack: 0.3 });
    for (let i = 0; i < 8; i++) setTimeout(() => this.crackle(1.2), 300 + Math.random() * 1200);
  },
  // A growl with a rattle in it: the level shuddering nearly thirty times a second.
  growl() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, len = 1.2;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.linearRampToValueAtTime(115, t + 0.5);
    osc.frequency.linearRampToValueAtTime(75, t + len);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const trem = this.ctx.createOscillator();
    trem.frequency.value = 28;
    const depth = this.ctx.createGain();
    depth.gain.value = 0.12;
    trem.connect(depth).connect(g.gain);
    osc.connect(f).connect(g).connect(this.sfx);
    osc.start(t); trem.start(t);
    osc.stop(t + len); trem.stop(t + len);
    this.hit({ dur: len, freq: 380, q: 1.2, vol: 0.12, type: 'bandpass', attack: 0.15 });
  },
  bite() {
    this.hit({ dur: 0.06, freq: 3000, q: 1, vol: 0.4, type: 'bandpass' });
    this.hit({ dur: 0.2, freq: 900, to: 300, q: 1.5, vol: 0.5, type: 'bandpass', delay: 0.03 });
    this.voice({ from: 150, to: 55, dur: 0.22, vol: 0.35, type: 'sawtooth', filter: 600 });
  },
  crackle(level = 1) { this.hit({ dur: 0.02 + Math.random() * 0.04, freq: 2500 + Math.random() * 2500, q: 2, vol: 0.12 * level, type: 'bandpass', pan: Math.random() * 0.6 - 0.3 }); },

  /* ---------- Cutscene ---------- */
  boom(level = 1) { this.burst(2.2, 160, 0.4, 1.2 * level); this.tone(55, 22, 1.8, 0.9 * level); },
  branchSnap() { this.burst(0.07, 2600, 1.5, 0.5, 'bandpass'); this.burst(0.2, 900, 1, 0.35, 'bandpass'); },
  snowSlam() { this.burst(0.7, 500, 0.6, 1); this.tone(90, 35, 0.5, 0.7); },
  ring() { this.glide([[0, 3200], [2.4, 3150]], 0.025, 'sine'); },
  // A footstep in deep snow: the crunch of it packing down, and the soft thump underneath,
  // left foot and right a little apart.
  step() {
    const pan = this.stepSide = -(this.stepSide || 0.15);
    this.hit({ dur: 0.13, freq: 1500 + Math.random() * 700, to: 700, q: 1.1, vol: 0.08 + Math.random() * 0.04, type: 'bandpass', pan, attack: 0.02 });
    this.hit({ dur: 0.07, freq: 4200, q: 0.8, vol: 0.025, type: 'highpass', pan, delay: 0.03 });
    this.voice({ from: 110, to: 60, dur: 0.09, vol: 0.05, pan });
  },
};
