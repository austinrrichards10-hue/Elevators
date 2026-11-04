// Idol songs, synthesized: bright J-pop in the classic style. Four-on-the-floor kicks and
// claps, offbeat hats, an octave-bouncing bass, supersaw chords over the "royal road"
// progression (IV V iii vi), a glittering bell arpeggio, risers into each chorus, and a lead
// line voiced through vowel filters so it sings (a stand-in until Miku's own voice arrives).
// Every song is written out as sections of bars; its chart for the stage (which lane, when)
// comes from the lead melody, so the notes you hit are the tune you hear.

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];

// A hook: four bars of [beat, scale step, length in beats]. Steps count up the scale from the
// key's root (7 is the octave). Each song's chorus is built on one, its verse on another.
const SONGS = {
  snowdrop: {
    title: 'Snowdrop Heart', artist: 'Miku', bpm: 150, root: 69, scale: MAJOR, mood: 'Bright and hopeful: the first song she ever sang in the city.',
    verse: [3, 4, 2, 5], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 4, 1], [1, 4, 0.5], [1.5, 5, 0.5], [2, 4, 1], [3, 2, 1], [4, 1, 1.5], [5.5, 2, 0.5], [6, 4, 2], [8, 4, 1], [9, 5, 0.5], [9.5, 7, 0.5], [10, 5, 1], [11, 4, 1], [12, 2, 2], [14, 1, 1], [15, 0, 1]],
    hookC: [[0, 7, 0.5], [0.5, 7, 0.5], [1, 8, 1], [2, 7, 0.5], [2.5, 6, 0.5], [3, 5, 1], [4, 6, 0.5], [4.5, 5, 0.5], [5, 4, 1], [6, 5, 1], [7, 7, 1], [8, 9, 1.5], [9.5, 8, 0.5], [10, 7, 1], [11, 5, 1], [12, 4, 0.5], [12.5, 5, 0.5], [13, 7, 1.5], [14.5, 5, 0.5], [15, 4, 1]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
  },
  sakura: {
    title: 'Neon Sakura Drive', artist: 'SNOWDROP', bpm: 160, root: 65, scale: MAJOR, mood: 'Night lights and petals on the wind: their first single as a group.',
    verse: [5, 3, 4, 0], chorus: [3, 4, 2, 5], pre: [1, 2, 3, 4],
    hookV: [[0, 2, 0.5], [0.5, 4, 0.5], [1, 5, 1], [2, 4, 0.5], [2.5, 2, 0.5], [3, 4, 1], [4, 5, 1], [5, 7, 0.5], [5.5, 5, 0.5], [6, 4, 2], [8, 2, 0.5], [8.5, 4, 0.5], [9, 5, 1], [10, 7, 1], [11, 9, 1], [12, 8, 1.5], [13.5, 7, 0.5], [14, 5, 2]],
    hookC: [[0, 9, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 8, 1], [3, 9, 1], [4, 10, 1.5], [5.5, 9, 0.5], [6, 7, 2], [8, 7, 0.5], [8.5, 8, 0.5], [9, 9, 1], [10, 8, 0.5], [10.5, 7, 0.5], [11, 5, 1], [12, 7, 1], [13, 8, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
  },
  paperplane: {
    title: 'Paper Plane Promise', artist: 'SNOWDROP', bpm: 132, root: 62, scale: MAJOR, mood: 'A slower one, for the friends who got her here.',
    verse: [0, 4, 5, 3], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 2, 1.5], [1.5, 1, 0.5], [2, 2, 1], [3, 4, 1], [4, 5, 3], [8, 4, 1.5], [9.5, 2, 0.5], [10, 1, 1], [11, 0, 1], [12, 1, 3]],
    hookC: [[0, 7, 1.5], [1.5, 6, 0.5], [2, 5, 1], [3, 4, 1], [4, 5, 2], [6, 7, 2], [8, 8, 1.5], [9.5, 7, 0.5], [10, 5, 1], [11, 4, 1], [12, 4, 1], [13, 5, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'chorus', 'chorusUp', 'outro'],
  },
  runway: {
    title: 'Starlight Runway', artist: 'SNOWDROP', bpm: 168, root: 64, scale: MAJOR, mood: 'Their arena anthem: fast, loud, impossible not to jump to.',
    verse: [5, 4, 3, 4], chorus: [3, 4, 2, 5], pre: [3, 4, 5, 4],
    hookV: [[0, 5, 0.5], [0.5, 5, 0.5], [1, 4, 0.5], [1.5, 5, 0.5], [2, 7, 1], [3, 5, 1], [4, 4, 0.5], [4.5, 4, 0.5], [5, 2, 0.5], [5.5, 4, 0.5], [6, 5, 2], [8, 5, 0.5], [8.5, 7, 0.5], [9, 9, 1], [10, 8, 0.5], [10.5, 7, 0.5], [11, 5, 1], [12, 7, 2], [14, 4, 2]],
    hookC: [[0, 7, 0.5], [0.5, 9, 0.5], [1, 11, 1], [2, 9, 0.5], [2.5, 7, 0.5], [3, 9, 1], [4, 10, 0.5], [4.5, 9, 0.5], [5, 7, 1], [6, 8, 1], [7, 9, 1], [8, 11, 1], [9, 12, 1], [10, 11, 0.5], [10.5, 9, 0.5], [11, 7, 1], [12, 9, 1.5], [13.5, 8, 0.5], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'chorusUp', 'outro'],
  },
  crown: {
    title: 'Crown of Light', artist: 'Miku', bpm: 176, root: 67, scale: MAJOR, mood: 'Written for one night only: the Tokyo Dome.',
    verse: [5, 3, 0, 4], chorus: [3, 4, 2, 5], pre: [1, 2, 3, 4],
    hookV: [[0, 4, 1], [1, 5, 0.5], [1.5, 7, 0.5], [2, 5, 1], [3, 4, 1], [4, 2, 1.5], [5.5, 4, 0.5], [6, 5, 2], [8, 7, 1], [9, 8, 0.5], [9.5, 9, 0.5], [10, 8, 1], [11, 7, 1], [12, 5, 1.5], [13.5, 4, 0.5], [14, 5, 2]],
    hookC: [[0, 9, 1], [1, 10, 0.5], [1.5, 9, 0.5], [2, 11, 1], [3, 12, 1], [4, 11, 0.5], [4.5, 9, 0.5], [5, 7, 1], [6, 9, 1], [7, 11, 1], [8, 12, 1.5], [9.5, 11, 0.5], [10, 9, 1], [11, 8, 1], [12, 9, 1], [13, 11, 1], [14, 12, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'chorusUp', 'chorusUp', 'outro'],
  },
  // Teto's: minor, heavy, a drill of sixteenths. Heard on screens, and when she rises.
  crimson: {
    title: 'Crimson Drill Parade', artist: 'Teto', bpm: 172, root: 60, scale: MINOR, mood: 'Her debut. It went straight to number one.', teto: true,
    verse: [0, 5, 3, 4], chorus: [5, 6, 0, 4], pre: [3, 4],
    hookV: [[0, 0, 0.5], [0.5, 0, 0.5], [1, 3, 0.5], [1.5, 0, 0.5], [2, 4, 1], [3, 3, 1], [4, 0, 0.5], [4.5, 0, 0.5], [5, 3, 0.5], [5.5, 4, 0.5], [6, 6, 2], [8, 7, 1], [9, 6, 0.5], [9.5, 4, 0.5], [10, 3, 1], [11, 4, 1], [12, 0, 2], [14, 2, 2]],
    hookC: [[0, 7, 0.5], [0.5, 7, 0.5], [1, 6, 0.5], [1.5, 7, 0.5], [2, 9, 1], [3, 7, 1], [4, 8, 1.5], [5.5, 7, 0.5], [6, 6, 2], [8, 7, 0.5], [8.5, 9, 0.5], [9, 10, 1], [10, 9, 1], [11, 7, 1], [12, 6, 1], [13, 4, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'],
  },
};

// Bars per section, and what plays in each.
const SECTION = {
  intro: { bars: 4, prog: 'chorus', drums: 'half', lead: null, bell: true },
  verse: { bars: 8, prog: 'verse', drums: 'verse', lead: 'hookV', chords: 'stab' },
  pre: { bars: 4, prog: 'pre', drums: 'build', lead: 'pre', chords: 'pad', riser: true },
  chorus: { bars: 8, prog: 'chorus', drums: 'full', lead: 'hookC', chords: 'saw', bell: true, crash: true },
  chorusUp: { bars: 8, prog: 'chorus', drums: 'full', lead: 'hookC', chords: 'saw', bell: true, crash: true, up: 1 },
  inter: { bars: 4, prog: 'chorus', drums: 'full', lead: null, bell: true, chords: 'saw' },
  bridge: { bars: 4, prog: 'verse', drums: 'half', lead: 'hookV', chords: 'pad', riser: true },
  outro: { bars: 4, prog: 'chorus', drums: 'half', lead: null, bell: true, chords: 'pad', end: true },
};

// The song laid out in time: every note of every part, in beats from the start, with the
// chart's notes alongside. Cached per song.
const songLayouts = {};
function layoutSong(id) {
  if (songLayouts[id]) return songLayouts[id];
  const S = SONGS[id];
  const events = [], chart = [];
  let bar = 0, keyShift = 0;
  const note = (step, oct = 0) => {
    const n = S.scale.length, o = Math.floor(step / n), s = ((step % n) + n) % n;
    return S.root + keyShift + S.scale[s] + 12 * (o + oct);
  };
  const chordNotes = (deg) => [0, 2, 4].map((k) => deg + k);
  for (const name of S.form) {
    const sec = SECTION[name];
    // The last chorus lifts a whole tone, and stays up to the end.
    if (sec.up) keyShift = 2;
    const prog = S[sec.prog];
    for (let b = 0; b < sec.bars; b++) {
      const at = (bar + b) * 4;
      const deg = prog[b % prog.length];
      const chord = chordNotes(deg);
      // Drums.
      for (let q = 0; q < 4; q++) {
        const t = at + q;
        if (sec.drums === 'full' || sec.drums === 'verse' || (sec.drums === 'half' && q % 2 === 0) || (sec.drums === 'build' && (q % 2 === 0 || b >= 2))) events.push([t, 'kick']);
        if (sec.drums !== 'half' && (q === 1 || q === 3)) events.push([t, 'clap']);
        if (sec.drums === 'build' && b === sec.bars - 1) for (let s = 0; s < 4; s++) events.push([t + s * 0.25, 'snare', (q * 4 + s) / 16]);
        events.push([t + 0.5, 'hat', sec.drums === 'full' ? 0.9 : 0.6]);
        if (sec.drums === 'full') { events.push([t + 0.25, 'hat', 0.35]); events.push([t + 0.75, 'hat', 0.35]); }
      }
      // Bass: the root bouncing between octaves in eighths.
      for (let e = 0; e < 8; e++) events.push([at + e * 0.5, 'bass', note(deg, -2) + (e % 2 ? 12 : 0), 0.45]);
      // Chords.
      if (sec.chords === 'saw') for (let e = 0; e < 4; e++) events.push([at + e + 0.5, 'saw', chord.map((c) => note(c, -1)), 0.4]);
      else if (sec.chords === 'stab') for (const e of [0.5, 1.5, 2.5, 3.5]) events.push([at + e, 'stab', chord.map((c) => note(c, -1)), 0.22]);
      else if (sec.chords === 'pad' || name === 'intro') events.push([at, 'pad', chord.map((c) => note(c, -1)), 4]);
      // Bell arpeggio up the chord.
      if (sec.bell) for (let s = 0; s < 8; s++) events.push([at + s * 0.5, 'bell', note(chord[s % 3] + (s >= 3 ? 7 : 0), 1), 0.4]);
    }
    // The lead: the hook for this section, repeated over its bars.
    if (sec.lead) {
      const hook = sec.lead === 'pre' ? null : S[sec.lead];
      if (hook) {
        for (let rep = 0; rep < sec.bars / 4; rep++) {
          for (const [b, step, len] of hook) {
            // The second time round the last phrase climbs instead of resting.
            const s2 = rep === 1 && b >= 12 ? step + (b >= 14 ? 2 : 1) : step;
            events.push([bar * 4 + rep * 16 + b, 'lead', note(s2), len]);
            chart.push({ beat: bar * 4 + rep * 16 + b, pitch: note(s2), len });
          }
        }
      } else {
        // The pre-chorus: rising, call-and-answer notes up the chord, building to the chorus.
        for (let b = 0; b < sec.bars; b++) {
          const deg = S[sec.prog][b % S[sec.prog].length];
          for (const [o, k] of [[0, 0], [1, 1], [2, 2], [3, 1]]) {
            const step = deg + k * 2 + (b >= 2 ? 2 : 0);
            events.push([(bar + b) * 4 + o, 'lead', note(step), 0.9]);
            chart.push({ beat: (bar + b) * 4 + o, pitch: note(step), len: 0.9 });
          }
        }
      }
    }
    if (sec.riser) events.push([(bar + sec.bars - 2) * 4, 'riser', 8]);
    if (sec.crash) events.push([bar * 4, 'crash']);
    // Instrumental bits still give the hands something to do: the kick on the one and three.
    if (!sec.lead) for (let b = 0; b < sec.bars; b++) for (const q of [0, 2]) chart.push({ beat: (bar + b) * 4 + q, pitch: null, len: 0.5, drum: true });
    bar += sec.bars;
  }
  events.push([bar * 4, 'crash']);
  events.sort((a, b) => a[0] - b[0]);
  chart.sort((a, b) => a.beat - b.beat);
  const layout = { id, events, chart, beats: bar * 4 + 2, seconds: (bar * 4 + 2) * 60 / S.bpm, bpm: S.bpm };
  songLayouts[id] = layout;
  return layout;
}

/* ---------- Playing a song ---------- */
// Schedules a song's notes a little ahead on the audio clock. Returns a handle with the start
// time (audio clock), the song's time now, and stop().
function playSong(id, { level = 0.8 } = {}) {
  Sfx.init();
  const ctx = Sfx.ctx, L = layoutSong(id), S = SONGS[id];
  const beat = 60 / S.bpm;
  const out = ctx.createGain();
  out.gain.value = level;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  out.connect(comp).connect(Sfx.master);
  // A little room on everything.
  const send = ctx.createGain(); send.gain.value = 0.18; out.connect(send).connect(Sfx.verb);
  const start = ctx.currentTime + 0.35;
  let next = 0, stopped = false;
  const handle = {
    id, start, beat, layout: L, out,
    time: () => ctx.currentTime - start,
    stop(fade = 0.6) { stopped = true; clearInterval(timer); out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); setTimeout(() => out.disconnect(), fade * 1000 + 400); },
    done: () => ctx.currentTime - start > L.seconds,
  };
  const pump = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + 0.6;
    while (next < L.events.length && start + L.events[next][0] * beat < horizon) {
      const [b, kind, a1, a2] = L.events[next++];
      songVoice(ctx, out, kind, start + b * beat, a1, a2, beat, S);
    }
  };
  const timer = setInterval(pump, 120);
  pump();
  return handle;
}

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// One note of one instrument, at audio time `t`.
function songVoice(ctx, out, kind, t, a1, a2, beat, S) {
  const env = (g, peak, attack, decay) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); };
  const noise = (dur) => { const s = ctx.createBufferSource(); s.buffer = Sfx.noise; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; };
  if (kind === 'kick') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, 0.9, 0.002, 0.28);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.32);
  } else if (kind === 'clap' || kind === 'snare') {
    const s = noise(0.2), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = kind === 'clap' ? 1500 : 2200; f.Q.value = 0.9;
    env(g, kind === 'clap' ? 0.45 : 0.18 + (a1 || 0) * 0.3, 0.002, 0.16);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'hat') {
    const s = noise(0.06), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 8000;
    env(g, 0.12 * (a1 || 0.6), 0.001, 0.045);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'crash') {
    const s = noise(1.8), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 5000;
    env(g, 0.18, 0.002, 1.6);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'riser') {
    const s = noise(a1 * beat), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + a1 * beat);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + a1 * beat); g.gain.linearRampToValueAtTime(0.0001, t + a1 * beat + 0.05);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'bass') {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = midiHz(a1);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.2);
    env(g, 0.28, 0.005, a2 * beat);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + a2 * beat + 0.05);
  } else if (kind === 'saw' || kind === 'stab' || kind === 'pad') {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = kind === 'pad' ? 1600 : 3200;
    const len = a2 * beat;
    if (kind === 'pad') { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + len * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len); }
    // Supersaws duck under the kick, so the beat pumps.
    else env(g, kind === 'saw' ? 0.07 : 0.06, 0.02, len);
    f.connect(g).connect(out);
    for (const n of a1) for (const d of kind === 'pad' ? [-8, 8] : [-12, 0, 12]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(n); o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + len + 0.1);
    }
  } else if (kind === 'bell') {
    const g = ctx.createGain();
    env(g, 0.05, 0.003, 0.5);
    g.connect(out);
    for (const [r, v] of [[1, 1], [2.01, 0.3], [3.98, 0.12]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = midiHz(a1) * r; og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + 0.6); }
  } else if (kind === 'lead') {
    // The singing line: a bright pulse and saw, gliding in from just below, with vibrato that
    // blooms on held notes, through two vowel formants (an "ah" opening to "oh").
    const len = Math.max(0.12, a2 * beat * 0.92);
    const f0 = midiHz(a1 + 12), g = ctx.createGain(), mix = ctx.createGain();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'square'; o2.type = 'sawtooth';
    for (const o of [o1, o2]) { o.frequency.setValueAtTime(f0 * 0.97, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.04); }
    o2.detune.value = 7;
    const vib = ctx.createOscillator(), vd = ctx.createGain();
    vib.frequency.value = 5.8; vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f0 * 0.012, t + Math.min(len, 0.5));
    vib.connect(vd); vd.connect(o1.frequency); vd.connect(o2.frequency);
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.Q.value = 5; f1.frequency.setValueAtTime(S.teto ? 650 : 900, t); f1.frequency.linearRampToValueAtTime(S.teto ? 520 : 620, t + len);
    f2.type = 'bandpass'; f2.Q.value = 7; f2.frequency.setValueAtTime(S.teto ? 1100 : 1500, t); f2.frequency.linearRampToValueAtTime(1100, t + len);
    o1.connect(mix); o2.connect(mix);
    mix.connect(f1).connect(g); mix.connect(f2).connect(g);
    const air = ctx.createBiquadFilter(); air.type = 'highpass'; air.frequency.value = 2500; const ag = ctx.createGain(); ag.gain.value = 0.15; mix.connect(air).connect(ag).connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.025); g.gain.setValueAtTime(0.32, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
    g.connect(out);
    for (const o of [o1, o2, vib]) { o.start(t); o.stop(t + len + 0.1); }
  }
}

/* ---------- The city's own music ---------- */
// Walking around the city: a mellow, sunny loop on the same synths, quieter than a show.
Sfx.tracks.city = {
  bpm: 96, level: 0.42, ambient: 0.2,
  chords: [[53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62], [57, 60, 64, 67]],
  beat(S, beat, t, beatLen) {
    const bar2 = beat % 8, ci = Math.floor(beat / 8) % this.chords.length, chord = this.chords[ci];
    if (bar2 === 0) S.pad(chord, t, beatLen * 8, 0.022);
    if (beat % 2 === 0) S.pluck(chord[0] - 12, t, beatLen * 1.6, 0.09, 'triangle');
    const arp = [0, 2, 1, 3, 2, 1, 3, 2];
    S.pluck(chord[arp[bar2]] + 12, t + beatLen * 0.5, beatLen * 1.2, 0.035, 'sine', true);
    if (bar2 % 4 === 0) S.bell(chord[3] + 12, t, beatLen * 2, 0.5);
    // A soft kick and a rimshot, lo-fi.
    if (beat % 2 === 0) { const g = S.ctx.createGain(), o = S.ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(S.music); o.start(t); o.stop(t + 0.22); }
  },
};
