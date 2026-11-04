// Teto's ambush and the fight with her, and what comes after: the end of part one.
//
// Miku goes to climb into Varga's balloon and a burst of gunfire rips through the silk. Teto
// walks out of the trees, grabs her, whirls her round and hurls her into the forest, and the
// fight plays out in a long clearing of its own (a stand-in for the forest, high above the
// real map so none of it can get in the way). Miku tears her twin tails off and forges them
// into a blue double scythe. Teto fights with her drill hair: it fires like a gatling gun,
// and when Miku is knocked down it charges twin railgun beams that crack the ground, which
// she has to scramble clear of. At the end Teto flies up on her hair and burns the clearing
// white; Miku wakes by the ruined balloon, hurt, and green fairies heal her by a fire. She
// patches the balloon with pelts, climbs in, and that's the end of part one.

/* ---------- Config ---------- */
const SHOWDOWN = {
  arena: { y: 1400, half: 9, length: 74, start: -24, tetoStart: -12, fog: 0.0042, balloon: 62 },
  teto: { hp: 2400, keep: [7, 13], walk: 3.4, dash: 11, reach: 0.55 },
  // Her other moves. The dive: a telegraphed charge down a line, then dizzy where she stops.
  // Orbs: homing lights that arc up and come down on Miku. The slam (from two thirds
  // health): up on her jets, down on Miku, and a ring of force rolling out across the snow.
  // The spiral (from one third): spinning in the air, spraying slow bullets every way.
  moves: {
    dive: { aim: [0.75, 0.62, 0.5], speed: 24, length: 17, damage: 16, stun: 1.3 },
    orbs: { count: [5, 6, 8], speed: 8.5, turn: 2.4, damage: 10, life: 5 },
    slam: { rise: 0.9, height: 7, fall: 0.22, damage: 18, ring: 16, ringLife: 1, ringDamage: 12 },
    spiral: { dur: 3.2, every: 0.07, speed: 12, arms: [2, 2, 3] },
    // The blink: gone, and then right behind Miku. The sweep (from two thirds): a beam dragged
    // across the clearing. The mega laser (from two thirds, now and then): see updateMega.
    blink: { tell: 0.6, windup: 0.28, range: 2.6, damage: 14 },
    sweep: { tell: 0.75, dur: 1.4, arc: 2.2, damage: 15, length: 34 },
    mega: { leap: 1.1, slam: 0.8, charge: 4.4, fire: 3.2, rocks: [2, 3], dps: 42, cooldown: 34 },
  },
  // Her gatling hair, by the stage of the fight (her health above 2/3, 1/3, and below).
  gatling: {
    aim: [0.75, 0.6, 0.5], fire: [1.5, 1.8, 2.1], rate: [11, 13, 15], turn: [0.45, 0.6, 0.78],
    cool: [1.7, 1.45, 1.2], speed: 30, spread: 0.03, damage: 6,
  },
  whip: { range: 2.4, windup: 0.42, damage: 10, every: 3.5 },
  // Knocked down: the railguns charge, and she has `need` presses of Space to roll clear.
  knock: { hits: 5, charge: 1.5, need: 7, grow: 1.5, most: 12, laser: 36, laserGrow: 4 },
  scythe: {
    reach: 3.0, arc: 1.9, strike: 0.32, spin: 0.5, damage: [18, 18, 30], open: 1.6,
    // Thrown spinning like a boomerang: out until it hits her or has gone `range`, then home.
    toss: { windup: 0.3, speed: 24, back: 30, range: 16, damage: 34, returnDamage: 20, radius: 1.7, cooldown: 2.2 },
    // A beam of light held on her for `hold` seconds, burning `damage` into her over it.
    beam: { charge: 0.9, hold: 1.8, damage: 120, radius: 1.1, cooldown: 7, range: 55 },
  },
  finaleAt: 0.1,
  // Her rages at 2/3 and 1/3 health: lines, and the red the sky turns.
  rage: [null, { line: 'You think this is OVER?!', fog: 0.25 }, { line: 'NOW you\'ve made me ANGRY!', fog: 0.5 }],
  repair: { wolfpelt: 5, pelt: 10 },
  // Hair drill tips, in her head's space: where the bullets and beams come from.
  muzzles: [new THREE.Vector3(0.2, -0.1, -0.05), new THREE.Vector3(-0.2, -0.1, -0.05)],
};

const SHOWDOWN_LINES = {
  ambushA: 'Going somewhere?',
  ambushB: 'That balloon was MY ride out.',
  ambushC: 'Hold still. This is going to look AMAZING.',
  arrive: 'No balloon. No Varga. Just you, me and the trees.',
  swords: 'Ooh. A new toy. Let\'s break it.',
  mikuSwords: 'You shot my balloon.',
  taunts: ['Dance for me!', 'Is that all you\'ve got?', 'Nowhere to run!', 'Too slow!', 'Hold STILL!', 'I can hear your heart.'],
  hurt: ['OW!', 'My HAIR!', 'Not the face!', 'You\'ll pay for that!', 'That one stung!'],
  knock: 'Down you go. Say goodnight!',
  dodged: 'Ugh! Stop ROLLING!',
  won: 'Lights out, Miku.',
  retry: 'Again? Fine. From the top!',
  finale: 'ENOUGH! Let\'s end this from up HERE!',
  fairyA: 'Please... don\'t let her get away with this.',
  fairyB: 'Mend the silk with what the forest gives you. Five wolves, and ten hares.',
  healed: 'I can feel my legs again. Five wolf pelts and ten hare pelts. Right.',
  repaired: 'Patched. It\'ll hold. It has to.',
  // Her thoughts on the long limp back down the clearing, by how far along it she's got.
  limp: [
    [-99, 'I\'m... alive? She buried me. She actually buried me.'],
    [-99, 'Can\'t feel my left leg. Move. Just move.'],
    [-14, 'My scythe\'s gone. My hair\'s gone. She took everything.'],
    [-2, 'No. Not everything. She didn\'t get the balloon. Not yet.'],
    [14, 'Every step\'s a knife. Count them. One. Two. Three.'],
    [36, 'There. Through the trees. It\'s still standing.'],
    [56, 'Varga built that thing to carry storms. It can carry me.'],
    [78, 'Almost there. Don\'t you dare fall now, Miku.'],
  ],
  limpIdle: ['Keep walking. She could come back.', 'Get up. Get moving.', 'Don\'t stop. If I stop, I won\'t start again.'],
  stumble: ['Ngh-!', 'Ah... my leg...', 'Still standing. Still standing.'],
  wake: 'The balloon. I made it. Now... a fire. I need a fire.',
  leave: 'Goodbye, Hollow. I\'m coming back for you, Teto.',
};

/* ---------- State ---------- */
const showdown = {
  // 'none', 'ambush' (the scene at the balloon), 'fight', 'finale', 'limp' (she drags herself
  // back down the clearing to the balloon), 'injured' (hurt, until a fire), 'repair' (healed,
  // gathering pelts), 'repaired', 'leaving' (flying away), 'done'.
  stage: 'none',
  limp: null, // her walk back down the clearing: { said, t, idle, stumble }
  shortHair: false,
  hp: SHOWDOWN.teto.hp,
  hits: 0,
  knocks: 0,
  injured: false,
  music: false,
};

// The fight's moment to moment: Teto, the scythe, the projectiles.
const fight = {
  teto: { pos: new THREE.Vector3(), yaw: 0, state: 'idle', t: 0, dur: 0, aim: new THREE.Vector3(), aimDir: new THREE.Vector3(), shotT: 0, muzzle: 0, walk: 0, dashT: 0, whipT: 0, target: new THREE.Vector3(), hurtT: 0, flash: 0 },
  swing: null, // { k, t, hit } while she's slashing
  combo: 0, comboT: 0, queued: false,
  tossCd: 0, tossT: -1,
  beamCd: 0, beamT: -1,
  knocked: null, // { t, need, presses, dodged, done, at } while she's down
  toss: null, // { phase, pos, dir, gone, hitOut, hitBack, spin } while the scythe's in the air
  rage: null, // { t, stage } while Teto rages between stages
  fovKick: 0,
  beatT: 0,
  invuln: 0,
  hitStop: 0,
  tauntT: 4,
  over: false,
};

let showdownKit = null;
let showdownScene = null;
const sdV = new THREE.Vector3(), sdW = new THREE.Vector3(), sdU = new THREE.Vector3(), sdQ = new THREE.Quaternion();
const sdX = new THREE.Vector3(), sdY = new THREE.Vector3(), sdZ = new THREE.Vector3(), sdM = new THREE.Matrix4(), sdT = new THREE.Quaternion();
const SD_UP = new THREE.Vector3(0, 1, 0);
const SD_RED = new THREE.Color(0x4a0c18);

/* ---------- Words ---------- */
function showdownLine(key) {
  const v = SHOWDOWN_LINES[key];
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
}

// One of Teto's lines, in the low, doubled voice she has now: a caption in a scene, the
// taunt line during the fight.
function tetoSays(text, seconds = 2) {
  if (!text) return;
  Sfx.tetoVoice(text);
  if (game.state === 'scene') { crimsonSay(text); return; }
  const el = $('boss-taunt');
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(tetoSays.timer);
  tetoSays.timer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // The shot rolls away through the forest.
  gunshot() {
    this.burst(0.6, 900, 0.5, 1.2); this.burst(0.09, 3800, 0.8, 0.9, 'highpass'); this.tone(120, 34, 0.5, 0.7, 'square');
    [[0.22, 0.4], [0.5, 0.22], [0.85, 0.12]].forEach(([at, v]) => setTimeout(() => this.burst(0.7, 500, 0.5, v), at * 1000));
  },
  gatling() { this.burst(0.05, 2600 + Math.random() * 600, 1.2, 0.24, 'bandpass'); this.tone(240, 80, 0.05, 0.1, 'square'); this.burst(0.03, 6000, 1, 0.08, 'highpass'); },
  bulletHiss() { this.burst(0.14, 5200, 1.5, 0.1, 'highpass'); this.tone(2400, 900, 0.12, 0.02, 'sine'); },
  slash(k = 0) { this.burst(0.22, 1300 + k * 400, 0.9, 0.34, 'bandpass'); this.glide([[0, 420 + k * 90], [0.2, 180]], 0.07, 'sawtooth'); this.burst(0.3, 4200, 1.2, 0.08, 'highpass'); },
  swordHit() { this.burst(0.14, 900, 1.2, 0.55, 'bandpass'); this.tone(330, 90, 0.16, 0.28, 'triangle'); this.tone(1400, 700, 0.12, 0.05, 'sine'); },
  heatWave() { this.burst(0.9, 600, 0.6, 0.55); this.glide([[0, 160], [0.7, 640]], 0.09, 'sawtooth', 9); },
  ignite() { this.burst(1.2, 1400, 0.6, 0.7, 'bandpass'); this.glide([[0, 110], [0.6, 880]], 0.12, 'sawtooth'); this.tone(55, 40, 1.2, 0.5); },
  // Hair drawn into metal: a rising ring with a shimmer over it.
  forge() {
    this.glide([[0, 220], [1.4, 1760]], 0.06, 'triangle', 6);
    this.glide([[0, 330], [1.4, 2640]], 0.03, 'sine', 12);
    this.burst(1.5, 2400, 1.5, 0.12, 'bandpass');
  },
  railCharge() {
    this.glide([[0, 90], [1.5, 2200]], 0.12, 'sawtooth', 18);
    this.glide([[0, 45], [1.5, 70]], 0.25, 'square', 4);
    this.burst(1.5, 3000, 2, 0.12, 'bandpass');
    for (let i = 0; i < 9; i++) setTimeout(() => this.burst(0.05, 5000 + Math.random() * 3000, 2, 0.12, 'bandpass'), i * 150 + Math.random() * 80);
  },
  railFire() {
    this.burst(1.6, 300, 0.4, 1.4); this.tone(900, 40, 1.1, 0.55, 'sawtooth'); this.burst(0.4, 5000, 1, 0.6, 'highpass'); this.tone(60, 24, 1.5, 0.8);
  },
  beamCharge() { this.glide([[0, 300], [0.7, 1800]], 0.07, 'sawtooth', 20); this.burst(0.7, 3500, 3, 0.1, 'bandpass'); },
  beamFire() { this.burst(0.9, 1800, 0.5, 0.7); this.tone(1600, 120, 0.7, 0.3, 'sawtooth'); this.burst(0.3, 6000, 1, 0.3, 'highpass'); },
  explosion(level = 1) { this.burst(2, 180, 0.4, 1.3 * level); this.tone(70, 22, 1.4, 0.8 * level); this.burst(0.5, 2200, 0.7, 0.5 * level, 'bandpass'); },
  // Something enormous hitting the snow.
  quake() { this.burst(1.8, 120, 0.4, 1.4); this.tone(48, 20, 1.6, 1); this.burst(0.6, 900, 0.6, 0.5); },
  whoosh(len = 0.6) { this.burst(len, 900, 0.5, 0.5, 'bandpass'); this.burst(len * 0.7, 2600, 0.8, 0.2, 'bandpass'); },
  // A low brass hit: dread.
  stinger() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.25);
    filter.frequency.exponentialRampToValueAtTime(300, t + 3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.32, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    filter.connect(gain).connect(this.master);
    for (const note of [26, 33, 38, 39]) {
      for (const detune of [-9, 9]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = this.midi(note);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + 3.5);
      }
    }
    this.tone(60, 28, 2.2, 0.6);
  },
  footfall() { this.burst(0.3, 160, 0.6, 0.5); this.tone(70, 35, 0.25, 0.35); },
  // Teto's voice now: her own pitched down, doubled an octave under, over a growl.
  tetoVoice(text) {
    const shout = /[!?]/.test(text) || /[A-Z]{3}/.test(text);
    const count = clamp(Math.round(text.length / 3.4), 3, 11);
    const vowels = ['a', 'e', 'o', 'a', 'u', 'o'];
    let at = 0;
    for (let i = 0; i < count; i++) {
      const len = 0.09 + Math.random() * 0.07;
      const pitch = (shout ? 250 : 200) * (0.9 + Math.random() * 0.2);
      const vowel = vowels[Math.floor(Math.random() * vowels.length)];
      this.crimsonVoice([[0, pitch], [len, pitch * 0.86]], shout ? 0.13 : 0.1, { delay: at, vowel, breath: 0.12 });
      this.crimsonVoice([[0, pitch * 0.49], [len, pitch * 0.42]], shout ? 0.2 : 0.16, { delay: at, vowel: 'o', breath: 0.3 });
      at += len + 0.02 + Math.random() * 0.03;
    }
    this.crimsonVoice([[0, 62], [at, 52]], 0.12, { vowel: 'o', vibrato: 9, rate: 23, breath: 0.4 });
  },
  tetoLaugh() {
    for (let i = 0; i < 7; i++) {
      const p = 300 - i * 18;
      this.crimsonVoice([[0, p], [0.12, p * 0.8]], 0.1, { delay: i * 0.17, vowel: 'a', breath: 0.35 });
      this.crimsonVoice([[0, p * 0.5], [0.12, p * 0.38]], 0.17, { delay: i * 0.17, vowel: 'o', breath: 0.3 });
    }
    this.crimsonVoice([[0, 58], [1.3, 46]], 0.14, { vowel: 'o', vibrato: 10, rate: 24, breath: 0.5 });
  },
  jet() { return this.loop({ noise: 1, filter: 900, hum: 0.4, humFreq: 70 }); },
  fairyChime() {
    [[0, 1319], [0.18, 1568], [0.36, 1976], [0.6, 2637]].forEach(([at, f]) => setTimeout(() => this.tone(f, f * 0.995, 1.4, 0.04, 'sine'), at * 1000));
  },

  /* The fight's music: drums, bass and a lead, scheduled on the audio clock. */
  hitAt(t, len, freq, q, volume, type = 'lowpass') {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(filter).connect(gain).connect(this.music);
    src.start(t, Math.random());
    src.stop(t + len);
  },
  pitchAt(t, from, to, len, volume, type = 'sine') {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + len * 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.connect(gain).connect(this.music);
    osc.start(t);
    osc.stop(t + len);
  },
  synthAt(note, t, len, volume, { type = 'sawtooth', cutoff = 1800, echo = false, detune = 8 } = {}) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff * 1.6, t);
    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.5, t + len);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.setValueAtTime(volume, t + len * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    filter.connect(gain).connect(this.music);
    if (echo) gain.connect(this.echo);
    for (const d of detune ? [-detune, detune] : [0]) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = this.midi(note);
      osc.detune.value = d;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + len + 0.05);
    }
  },
});

// Teto's theme: D minor, driving. Dm  Bb  C  A, two bars each, the hook every other time round.
Sfx.tracks.teto = {
  bpm: 148, level: 0.5, ambient: 0.35,
  roots: [38, 34, 36, 33],
  chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]],
  // [beat, note, beats long] within each chord's two bars.
  hook: [
    [[0, 74, 2], [2, 72, 1], [3, 69, 1], [4, 74, 1], [5, 77, 2], [7, 76, 1]],
    [[0, 74, 2], [2, 72, 1], [3, 70, 1], [4, 69, 2], [6, 65, 2]],
    [[0, 67, 1], [1, 69, 1], [2, 72, 2], [4, 76, 2], [6, 74, 2]],
    [[0, 73, 2], [2, 76, 2], [4, 81, 2], [6, 79, 1], [7, 76, 1]],
  ],
  beat(s, beat, t, len) {
    const inBar = beat % 4, inChord = beat % 8, chordIndex = Math.floor(beat / 8) % 4, section = Math.floor(beat / 32) % 4;
    const root = this.roots[chordIndex], chord = this.chords[chordIndex];
    // Drums: four on the floor, a snare on two and four, eighth-note hats, a fill into each section.
    s.pitchAt(t, 150, 42, 0.32, 0.55);
    s.hitAt(t, 0.02, 4000, 1, 0.1, 'highpass');
    if (inBar === 1 || inBar === 3) { s.hitAt(t, 0.2, 1700, 0.7, 0.24, 'bandpass'); s.pitchAt(t, 220, 160, 0.12, 0.12, 'triangle'); }
    s.hitAt(t, 0.035, 8000, 1, 0.045, 'highpass');
    s.hitAt(t + len / 2, inBar === 3 ? 0.16 : 0.035, 8000, 1, 0.055, 'highpass');
    if (beat % 32 >= 30) for (let i = 0; i < 2; i++) s.pitchAt(t + i * len / 2, 200 - (beat % 32 - 30) * 50 - i * 25, 80, 0.2, 0.3, 'sine');
    if (beat % 32 === 0) s.hitAt(t, 1.8, 5000, 0.5, 0.09, 'highpass');
    // Bass: eighths on the root, jumping the octave.
    for (let i = 0; i < 2; i++) s.synthAt(root + (i && inBar % 2 ? 12 : 0), t + i * len / 2, len * 0.45, 0.075, { cutoff: 520, detune: 5 });
    // A pad under each chord.
    if (inChord === 0) s.pad(chord.map((n) => n - 12), t, len * 8, 0.022);
    // Sixteenth arpeggios up high once the first section's in, the hook over them after that.
    if (beat >= 8) for (let i = 0; i < 4; i++) s.synthAt(chord[(beat * 4 + i) % 3] + 12, t + i * len / 4, len * 0.22, 0.012, { type: 'square', cutoff: 3200, echo: true, detune: 0 });
    // Angrier, it drives harder: an extra kick on the off-beat, sixteenth hats, a snare roll
    // into every chord, and the hook every time round.
    const hot = this.intensity || 0;
    if (hot >= 1) { s.pitchAt(t + len / 2, 130, 45, 0.22, 0.3); if (inChord === 7) for (let i = 0; i < 4; i++) s.hitAt(t + i * len / 4, 0.1, 1700, 0.7, 0.08 + i * 0.04, 'bandpass'); }
    if (hot >= 2) { for (let i = 1; i < 4; i += 2) s.hitAt(t + i * len / 4, 0.03, 9000, 1, 0.04, 'highpass'); s.synthAt(root + 24, t, len * 0.3, 0.02, { type: 'square', cutoff: 1400, detune: 0 }); }
    if (section % 2 === 1 || hot >= 1) for (const [at, note, beats] of this.hook[chordIndex]) if (at === inChord) s.synthAt(note, t, beats * len * 0.92, 0.03, { cutoff: 2600, echo: true });
  },
};

/* ---------- Building things ---------- */
// One of her twin tails, torn free and held in her fist: three long tapered strands of teal
// hair twisted round each other, brightening to white-blue at the tip.
function buildHairStrand() {
  const group = new THREE.Group();
  const length = 0.8;
  const strand = (twist, width, color, phase) => {
    const rows = 18, pos = [], col = [], idx = [];
    const c0 = new THREE.Color(0x1f8f99), c1 = new THREE.Color(color), c2 = new THREE.Color(0xd8fbff);
    for (let i = 0; i <= rows; i++) {
      const u = i / rows;
      const w = width * (1 - u * 0.85) * (0.8 + 0.2 * Math.sin(u * 9 + phase));
      const a = u * twist + phase;
      const r = 0.012 * (1 - u * 0.6);
      const y = -u * length;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const ex = Math.cos(a + Math.PI / 2) * w, ez = Math.sin(a + Math.PI / 2) * w;
      pos.push(cx - ex, y, cz - ez, cx + ex, y, cz + ez);
      const c = c0.clone().lerp(c1, Math.min(1, u * 1.6)).lerp(c2, THREE.MathUtils.smoothstep(u, 0.7, 1));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  };
  group.add(strand(5.2, 0.03, 0x37c7cf, 0), strand(5.2, 0.026, 0x2fb3c0, 2.1), strand(5.2, 0.024, 0x4fd9de, 4.2));
  group.userData.length = length;
  group.visible = false;
  return group;
}

// Lets a material be drawn in from the middle of the shaft outwards (uReveal, in metres
// either side of the centre), white-hot along the edge as it comes, and pulse with blue
// fire along its length (uGlow).
function revealMaterial(material, uniforms, glowing) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vAlong;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = position.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlong;\nuniform float uReveal;\nuniform float uGlow;\nuniform float uTime;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (abs(vAlong) > uReveal) discard;');
    if (glowing) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float front = smoothstep(uReveal - 0.14, uReveal, abs(vAlong));
        float flow = 0.55 + 0.45 * sin(vAlong * 18.0 - uTime * 7.0) * sin(vAlong * 7.0 + uTime * 3.0);
        totalEmissiveRadiance += vec3(0.15, 0.5, 1.0) * flow * uGlow + vec3(0.7, 0.95, 1.0) * front * 6.0 * step(uReveal, 1.5);`);
    }
  };
  return material;
}

// The double scythe she forges from her hair: Sketchfab's "Double Scythe" (models/weapons),
// coloured her blue. Its shaft runs along its own y axis, centred, the blades curling off
// either end in the xy plane.
function buildScythe() {
  const glb = readGlb(window.SCYTHE_GLB);
  const uniforms = { uReveal: { value: 2 }, uGlow: { value: 1 }, uTime: { value: 0 } };
  const group = new THREE.Group();
  const [bladeGeo, handleGeo] = glb.json.meshes.map((m) => {
    const geo = glb.geometry(m.primitives[0]);
    // Upright, and about her height from tip to tip.
    geo.rotateZ(2.531);
    geo.scale(0.135, 0.135, 0.25);
    return geo;
  });
  const blade = new THREE.Mesh(bladeGeo, revealMaterial(new THREE.MeshStandardMaterial({ color: 0x2a6dff, metalness: 0.75, roughness: 0.22, emissive: 0x1b5cff, emissiveIntensity: 0.75, side: THREE.DoubleSide }), uniforms, true));
  const handle = new THREE.Mesh(handleGeo, revealMaterial(new THREE.MeshStandardMaterial({ color: 0x141a2c, metalness: 0.6, roughness: 0.35, emissive: 0x0d3c8a, emissiveIntensity: 0.7, side: THREE.DoubleSide }), uniforms, true));
  // A soft blue halo round the blades, for the bloom.
  const halo = new THREE.Mesh(bladeGeo, revealMaterial(new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3d8bff).multiplyScalar(1.6), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), uniforms, false));
  halo.scale.set(1.06, 1.03, 3);
  blade.castShadow = handle.castShadow = true;
  group.add(blade, handle, halo);
  // The blade tips, and points along the blades for the flames to come off.
  const p = bladeGeo.attributes.position.array;
  const tipA = new THREE.Vector3(), tipB = new THREE.Vector3(), samples = [];
  for (let i = 0; i < p.length; i += 3) {
    if (p[i + 1] > tipA.y) tipA.set(p[i], p[i + 1], p[i + 2]);
    if (p[i + 1] < tipB.y) tipB.set(p[i], p[i + 1], p[i + 2]);
    if (i % 27 === 0) samples.push(new THREE.Vector3(p[i], p[i + 1], p[i + 2]));
  }
  group.userData = { uniforms, tipA, tipB, samples, reach: Math.max(tipA.length(), tipB.length()) };
  group.visible = false;
  return group;
}

// The clearing: a long strip of snow walled in by thick forest on three sides, open ahead
// down an avenue of scattered pines to the ruined balloon, with the forest closing in again
// behind it.
function buildArena() {
  const A = SHOWDOWN.arena;
  const group = new THREE.Group();
  group.position.set(0, A.y, 0);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TEX.snow.color, normalMap: TEX.snow.normal, roughnessMap: TEX.snow.rough, color: 0xf0f3fb }));
  ground.receiveShadow = true;
  group.add(ground);
  const kit = buildForestKit();
  const rand = seededRandom(4242);
  const per = kit.species.map(() => []);
  const occupied = [];
  const place = (x, z, gap = 1.6, grow = 1) => {
    if (occupied.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < gap)) return;
    occupied.push([x, z]);
    let pick = rand(), k = 0;
    for (; k < kit.species.length - 1; k++) { pick -= kit.species[k].weight; if (pick <= 0) break; }
    const s = kit.species[k];
    const size = lerp(s.size[0], s.size[1], rand()) * grow;
    per[k].push({ x, y: 0, z, ry: rand() * 6.28, rx: 0, rz: 0, sx: size, sy: size * (0.9 + rand() * 0.3), sz: size, tint: new THREE.Color().setScalar(lerp(s.tint[0], s.tint[1], rand())) });
  };
  const back = -A.length / 2, front = A.length / 2, far = front + A.balloon;
  for (let i = 0; i < 2600; i++) {
    const x = (rand() - 0.5) * 120, z = back - 40 + rand() * 170;
    const inside = Math.abs(x) < A.half + 1.2 && z > back - 1.2;
    // Open ahead of the clearing, in a widening view down to the balloon.
    const ahead = z > front - 4 && Math.abs(x) < A.half + (z - front) * 0.6;
    if (inside || ahead) continue;
    // Thickest close to the clearing.
    const edge = Math.min(Math.abs(Math.abs(x) - A.half), z < back ? back - z : 99);
    if (rand() > 1.1 - edge / 40) continue;
    place(x, z);
  }
  // The avenue: pines either side of the way down, spaced out, a few loners in the open.
  for (let z = front + 2; z < far + 6; z += 5 + rand() * 4) {
    for (const side of [-1, 1]) {
      const x = side * (A.half + 3 + (z - front) * 0.32 + rand() * 4);
      place(x, z + rand() * 2, 4, 1.1);
    }
  }
  for (let i = 0; i < 26; i++) {
    const z = front + 8 + rand() * (A.balloon - 16), x = (rand() - 0.5) * (12 + (z - front) * 1.1);
    if (Math.abs(x) < 4 || Math.abs(x) < 9 && Math.abs(z - far) < 14) continue;
    place(x, z, 8, 0.9);
  }
  // The forest closing in again past the balloon.
  for (let i = 0; i < 900; i++) {
    const x = (rand() - 0.5) * 160, z = far + 18 + rand() * 70;
    place(x, z, 2.2);
  }
  kit.species.forEach((s, k) => {
    if (!per[k].length) return;
    const bark = makeInstances(s.geo.bark, s.bark, per[k], true, true);
    if (bark) group.add(bark);
    if (s.leaves) { const leaves = makeInstances(s.geo.boughs, s.leaves, per[k], true, true); if (leaves) group.add(leaves); }
  });
  group.visible = false;
  scene.add(group);
  return group;
}

const additive = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, ...extra });

// A tracer round: a white-hot core in a pink sheath, with a glowing head.
function buildTracer() {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.9, 6).rotateX(Math.PI / 2).translate(0, 0, -0.35), additive(new THREE.Color(0xffffff).multiplyScalar(3))));
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.02, 1.6, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.7), additive(new THREE.Color(0xff3d7a).multiplyScalar(2.4), 0.55, { side: THREE.DoubleSide })));
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(0xff7aa8).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  head.scale.setScalar(0.42);
  group.add(head);
  group.visible = false;
  scene.add(group);
  return group;
}

function buildBullets(count) {
  return Array.from({ length: count }, () => ({ mesh: buildTracer(), pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 }));
}

// A beam of light: a shader-lit tube that's white-hot at its heart, banded with energy
// running along it, sheathed in a wide soft glow, with rings racing out along it and
// lightning crawling round it.
function beamMaterial(color, opacity, speed) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: opacity }, uLen: { value: 10 }, uSpeed: { value: speed } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uTime; uniform float uOpacity; uniform float uLen; uniform float uSpeed;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float along = vUv.y * uLen;
        float bands = 0.7 + 0.3 * sin(along * 3.0 - uTime * uSpeed) + 0.2 * sin(along * 11.0 - uTime * uSpeed * 1.7 + vUv.x * 12.0);
        vec3 col = mix(uColor * 2.2, vec3(3.2), pow(facing, 5.0)) * bands;
        gl_FragColor = vec4(col, pow(facing, 1.6) * uOpacity);
      }`,
  });
}

function buildBeam(color, radius) {
  const group = new THREE.Group();
  const tube = (r, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 24, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), mat);
  const main = tube(radius, beamMaterial(color, 1, 40));
  const glow = tube(radius * 2.2, beamMaterial(color, 0.3, 25));
  const core = tube(radius * 0.32, additive(new THREE.Color(0xffffff).multiplyScalar(3.5), 0.95));
  group.add(main, glow, core);
  const ringGeo = new THREE.TorusGeometry(radius * 1.7, radius * 0.12, 6, 32);
  const rings = Array.from({ length: 4 }, (_, i) => {
    const ring = new THREE.Mesh(ringGeo, additive(new THREE.Color(color).multiplyScalar(2.5), 0.8));
    ring.userData.phase = i / 4;
    group.add(ring);
    return ring;
  });
  const arc = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, fog: false }));
  arc.frustumCulled = false;
  group.add(arc);
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(color).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  group.add(flare);
  group.userData = { main, glow, rings, arc, flare, radius, mats: [main.material, glow.material] };
  group.visible = false;
  group.frustumCulled = false;
  scene.add(group);
  return group;
}

function aimBeam(beam, from, to, width = 1) {
  beam.position.copy(from);
  beam.lookAt(to);
  const len = from.distanceTo(to);
  beam.scale.set(width, width, len);
  for (const m of beam.userData.mats) m.uniforms.uLen.value = len;
  beam.visible = true;
}

// Each frame a beam is up: its energy runs, its rings race along it, its lightning jumps.
function animateBeam(beam, time) {
  if (!beam.visible) return;
  const u = beam.userData, len = beam.scale.z, w = beam.scale.x;
  for (const m of u.mats) m.uniforms.uTime.value = time;
  for (const ring of u.rings) {
    const f = (time * 1.6 + ring.userData.phase) % 1;
    ring.position.set(0, 0, f);
    // The group's stretched along z; the rings undo that so they stay round.
    ring.scale.set(1 + f * 0.6, 1 + f * 0.6, 1 / Math.max(len, 0.01));
    ring.material.opacity = 0.8 * (1 - f);
  }
  const arr = u.arc.geometry.attributes.position.array;
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, r = u.radius * (1.2 + Math.random() * 1.4);
    arr[i * 3] = Math.cos(a) * r;
    arr[i * 3 + 1] = Math.sin(a) * r;
    arr[i * 3 + 2] = i / 15;
  }
  u.arc.geometry.attributes.position.needsUpdate = true;
  u.flare.position.set(0, 0, 1);
  u.flare.scale.set(u.radius * 9 * w, u.radius * 9 * w, 1).multiplyScalar(0.8 + Math.random() * 0.4);
  if (u.spin) for (const line of u.spin) { line.rotation.z = time * 14; line.scale.set(w, w, 1); line.visible = w > 0.2; }
}

function glowOrb(color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(color).multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sprite.scale.setScalar(size);
  sprite.visible = false;
  scene.add(sprite);
  return sprite;
}

// Miku's beam: a needle of white light in a blue sheath and a wide soft haze, with two
// threads of light spiralling round it.
function buildLightBeam() {
  const beam = buildBeam(0xa8dcff, 0.12);
  const haze = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1, 24, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), beamMaterial(0x2a6dff, 0.14, 15));
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), additive(new THREE.Color(0xffffff).multiplyScalar(6)));
  beam.add(haze, needle);
  beam.userData.mats.push(haze.material);
  const helixMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xd8f2ff).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, fog: false });
  beam.userData.spin = [0, Math.PI].map((phase) => {
    const pts = [];
    for (let i = 0; i <= 240; i++) { const a = phase + i * 0.55; pts.push(new THREE.Vector3(Math.cos(a) * 0.3, Math.sin(a) * 0.3, i / 240)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), helixMat);
    line.frustumCulled = false;
    beam.add(line);
    return line;
  });
  return beam;
}

// Teto's jets: red disks of light shed downwards from her drills, swelling as they fall.
function buildJetDisks(count) {
  const disk = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const ring = new THREE.RingGeometry(0.4, 0.5, 32).rotateX(-Math.PI / 2);
  return Array.from({ length: count }, () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(disk, new THREE.MeshBasicMaterial({ map: TEX.softDot, color: new THREE.Color(0xff2d55).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
    group.add(new THREE.Mesh(ring, additive(new THREE.Color(0xff6a88).multiplyScalar(3), 1, { side: THREE.DoubleSide })));
    group.visible = false;
    scene.add(group);
    return { group, vel: new THREE.Vector3(), t: 1, life: 1, size: 1 };
  });
}

function emitJetDisk(at, vel, size = 0.35, life = 0.45) {
  const d = showdownKit.disks.find((x) => x.t >= x.life) || showdownKit.disks[0];
  Object.assign(d, { t: 0, life, size });
  d.vel.copy(vel);
  d.group.position.copy(at);
  d.group.visible = true;
}

// Jets from both drill tips, `power` of them a frame.
function tetoJets(power = 1) {
  const k = showdownKit;
  for (let i = 0; i < 2; i++) {
    tetoMuzzle(i, sdV);
    if (Math.random() < power) emitJetDisk(sdV, sdW.set((Math.random() - 0.5) * 0.6, -7 - Math.random() * 3, (Math.random() - 0.5) * 0.6), 0.25 + Math.random() * 0.15);
    k.jets.emit(sdV, sdW.set((Math.random() - 0.5) * 1.2, -8 - Math.random() * 4, (Math.random() - 0.5) * 1.2), { life: 0.35, size: 0.35, grow: 2.2, alpha: 0.9 });
  }
}

// Her last attack: rings wheeling round the gathering light, lightning to the ground, and a
// red circle closing on Miku.
function buildFinaleKit() {
  const rings = [3, 4.4, 6].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06 + i * 0.02, 6, 64), additive(new THREE.Color(i === 1 ? 0xffffff : 0xff3d6a).multiplyScalar(3), 0.9));
    m.visible = false;
    scene.add(m);
    return m;
  });
  const bolts = Array.from({ length: 5 }, () => {
    const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xffc0d0).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, fog: false }));
    line.frustumCulled = false;
    line.visible = false;
    scene.add(line);
    return line;
  });
  const target = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2), additive(new THREE.Color(0xff2d55).multiplyScalar(3), 0.9));
  target.visible = false;
  scene.add(target);
  return { rings, bolts, target };
}

// A summoning circle: rings, ticks, a ring of glyphs, a six-pointed star, a burning heart.
function runeTexture() {
  const size = 512, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rand = seededRandom(31);
  g.translate(size / 2, size / 2);
  g.strokeStyle = g.fillStyle = 'white';
  g.shadowColor = 'white';
  g.shadowBlur = 10;
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(248, 6); ring(230, 3); ring(176, 4); ring(92, 3); ring(62, 2);
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2, l = i % 6 === 0 ? 16 : 7;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * (230 - l), Math.sin(a) * (230 - l));
    g.lineTo(Math.cos(a) * 230, Math.sin(a) * 230);
    g.stroke();
  }
  for (let i = 0; i < 24; i++) {
    g.save();
    g.rotate(i / 24 * Math.PI * 2);
    g.translate(0, -203);
    g.lineWidth = 3;
    g.beginPath();
    for (let j = 0; j < 3; j++) { g.moveTo((rand() - 0.5) * 20, (rand() - 0.5) * 24); g.lineTo((rand() - 0.5) * 20, (rand() - 0.5) * 24); }
    g.stroke();
    g.restore();
  }
  g.lineWidth = 4;
  for (const off of [0, Math.PI]) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) { const a = off + i / 3 * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * 176, Math.sin(a) * 176); }
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 62, Math.sin(a) * 62);
    g.lineTo(Math.cos(a) * 92, Math.sin(a) * 92);
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, 24, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The mega laser's own pieces: a solid wall of light, streaming, to fill the clearing from
// side to side and as high as the trees (lit from inside too, so there's no seeing out of
// it); the summoning circles she charges it through; pillars of light out of the cracks.
function buildMegaKit() {
  const tex = runeTexture();
  const runeMat = () => new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0xff5a80).multiplyScalar(5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const circles = [new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.PlaneGeometry(1, 1), new THREE.PlaneGeometry(1, 1), new THREE.PlaneGeometry(1, 1)].map((geo) => {
    const m = new THREE.Mesh(geo, runeMat());
    m.visible = false;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });
  const fillMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uOpacity;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 cell = floor(vec2(vW.x * 4.0, vW.y * 4.0));
        float h = hash(cell);
        float s = fract(vW.z * (0.05 + h * 0.06) + uTime * (3.0 + h * 4.0) + h * 7.0);
        float streak = smoothstep(0.0, 0.08, s) * smoothstep(0.55, 0.08, s);
        float wave = 0.5 + 0.5 * sin(vW.z * 0.4 + uTime * 30.0);
        float flick = 0.88 + 0.12 * sin(uTime * 73.0);
        vec3 col = mix(vec3(1.4, 0.3, 0.55), vec3(2.6, 2.3, 2.4), 0.35 + 0.5 * streak + 0.15 * wave);
        gl_FragColor = vec4(col, uOpacity * (0.4 + 0.45 * streak + 0.1 * wave) * flick);
      }`,
  });
  // A box with its front face at the origin, running back along -z.
  const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, -0.5), fillMat);
  fill.visible = false;
  fill.frustumCulled = false;
  fill.renderOrder = 5;
  scene.add(fill);
  const pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true).translate(0, 0.5, 0);
  const pillars = Array.from({ length: 8 }, () => {
    const mat = beamMaterial(0xff4d86, 1, 30);
    mat.uniforms.uLen.value = 26;
    const m = new THREE.Mesh(pillarGeo, mat);
    m.visible = false;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });
  return { circles, fill, pillars, spin: 0, lastGlare: 0 };
}

// A jagged bolt of lightning between two points.
function strikeBolt(line, a, b, jag = 1.2) {
  const arr = line.geometry.attributes.position.array;
  for (let i = 0; i < 18; i++) {
    const u = i / 17, off = Math.sin(u * Math.PI) * jag;
    arr[i * 3] = lerp(a.x, b.x, u) + (Math.random() - 0.5) * off;
    arr[i * 3 + 1] = lerp(a.y, b.y, u) + (Math.random() - 0.5) * off;
    arr[i * 3 + 2] = lerp(a.z, b.z, u) + (Math.random() - 0.5) * off;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.visible = true;
}

// Cracks in the ground: jagged lines running out from the middle, forking as they go.
function crackTexture() {
  const size = 512, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rand = seededRandom(77);
  g.lineCap = 'round';
  const crack = (x, y, a, len, width, depth) => {
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      a += (rand() - 0.5) * 0.9;
      x += Math.cos(a) * len / 6;
      y += Math.sin(a) * len / 6;
      g.lineTo(x, y);
      if (depth < 3 && rand() < 0.3) { g.stroke(); crack(x, y, a + (rand() - 0.5) * 1.6, len * 0.5, width * 0.6, depth + 1); g.lineWidth = width; g.beginPath(); g.moveTo(x, y); }
    }
    g.stroke();
  };
  g.shadowColor = 'white';
  g.shadowBlur = 8;
  g.strokeStyle = 'white';
  for (let i = 0; i < 11; i++) crack(size / 2, size / 2, (i / 11) * Math.PI * 2 + rand() * 0.4, size * (0.3 + rand() * 0.18), 5, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildCrack(tex, color) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(2.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

// Heavier snow for the clearing, blown hard across it.
function buildHeavySnow() {
  const count = 13000, box = { w: 44, h: 26 };
  const base = new Float32Array(count * 3), speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    base[i * 3] = Math.random() * box.w;
    base[i * 3 + 1] = Math.random() * box.h;
    base[i * 3 + 2] = Math.random() * box.w;
    speed[i] = 2.2 + Math.random() * 2.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.1, map: TEX.softDot, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.95 }));
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  const wrap = (v, size) => ((v % size) + size) % size;
  points.userData.update = (dt, time, center) => {
    const out = geo.attributes.position.array;
    const gust = 4 + Math.sin(time * 0.4) * 2.2;
    for (let i = 0; i < count; i++) {
      base[i * 3] += (gust + Math.sin(time * 1.3 + i) * 0.6) * dt;
      base[i * 3 + 1] -= speed[i] * dt;
      base[i * 3 + 2] += (0.8 + Math.cos(time * 0.9 + i * 1.7) * 0.5) * dt;
      out[i * 3] = center.x + wrap(base[i * 3] - center.x, box.w) - box.w / 2;
      out[i * 3 + 1] = center.y + wrap(base[i * 3 + 1] - center.y, box.h) - box.h / 2;
      out[i * 3 + 2] = center.z + wrap(base[i * 3 + 2] - center.z, box.w) - box.w / 2;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return points;
}

function buildShowdownDom() {
  const hud = $('hud');
  const bar = document.createElement('div');
  bar.id = 'boss-bar';
  bar.className = 'hidden';
  bar.innerHTML = '<p class="boss-name"><span class="boss-kicker">Final battle</span><span class="boss-title">Teto</span></p><div class="bar boss-health"><i class="boss-lag"></i><i class="boss-fill"></i></div>';
  const taunt = document.createElement('div');
  taunt.id = 'boss-taunt';
  const hint = document.createElement('div');
  hint.id = 'boss-hint';
  hint.className = 'hidden';
  hint.innerHTML = '<p>Mash SPACE to roll clear!</p><div class="boss-mash"><i></i></div>';
  const warn = document.createElement('div');
  warn.id = 'boss-warn';
  warn.className = 'hidden';
  const skills = document.createElement('div');
  skills.id = 'sword-wave';
  skills.className = 'hidden';
  skills.innerHTML = '<span class="skill" id="skill-wave"><kbd>RMB</kbd> Scythe throw<i></i></span><span class="skill" id="skill-beam"><kbd>Q</kbd> Light beam<i></i></span>';
  hud.append(bar, taunt, hint, skills, warn);
  const glare = document.createElement('div');
  glare.id = 'mega-glare';
  document.body.insertBefore(glare, hud);
  const fade = document.createElement('div');
  fade.id = 'boss-fade';
  document.body.insertBefore(fade, $('cine'));
  const end = document.createElement('section');
  end.id = 'end-part';
  end.className = 'screen hidden';
  end.innerHTML = '<h2>END PART 1</h2><p class="tag">Teto is still out there. So is the way home.</p><div class="title-actions"><button id="end-part-menu">Main menu</button></div>';
  document.body.appendChild(end);
  $('end-part-menu').addEventListener('click', () => { end.classList.add('hidden'); toMainMenu(); });
}

function buildShowdownKit() {
  const teto = createAvatar(scene, 'crimson');
  teto.setVisible(false);
  const pool = (count, color, bright = 2) => {
    const p = buildPuffs(count, color);
    p.group.children[0].material.uniforms.diffuse.value.multiplyScalar(bright);
    scene.add(p.group);
    return p;
  };
  const flames = pool(400, 0x5ab4ff);
  const sparks = pool(160, 0xff7aa0);
  const trails = pool(700, 0xff4d86, 2.4);
  const jets = pool(200, 0xff3355, 2.6);
  const debris = pool(160, 0xe8ecf6, 1);
  const smoke = buildPuffs(80, 0x6d6670);
  scene.add(smoke.group);
  // Laser sights from her drills while she aims.
  const sights = SHOWDOWN.muzzles.map(() => buildBeam(0xff3366, 0.012));
  const muzzleFlash = SHOWDOWN.muzzles.map(() => glowOrb(0xff9ec0, 0.7));
  const fairyMat = new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(0x8dff9a).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const fairies = Array.from({ length: 14 }, (_, i) => {
    const s = new THREE.Sprite(fairyMat);
    s.scale.setScalar(0.16);
    s.visible = false;
    scene.add(s);
    return { sprite: s, phase: i * 0.9, r: 0.6 + Math.random() * 0.9, h: 0.4 + Math.random() * 1.3, speed: 1.4 + Math.random() * 1.4 };
  });
  // The snow that covers her: drifts heaping up along her, lumpy, in the clearing's own snow,
  // and in the end one mound over all of her.
  const drift = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dp = drift.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i);
    const bump = 1 + 0.12 * Math.sin(x * 5.1 + z * 3.3) * Math.cos(z * 4.7 - x * 2.1) + 0.06 * Math.sin(x * 13 + z * 11);
    dp.setXYZ(i, x * bump, y * bump, z * bump);
  }
  drift.computeVertexNormals();
  const driftMat = new THREE.MeshStandardMaterial({ map: TEX.snow.color, normalMap: TEX.snow.normal, roughnessMap: TEX.snow.rough, color: 0xf0f3fb });
  const mound = new THREE.Mesh(drift, driftMat);
  mound.visible = false;
  mound.receiveShadow = true;
  scene.add(mound);
  const lumps = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(drift, driftMat);
    m.visible = false;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  });
  // Shockwaves across the snow.
  const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
  const shocks = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(ringGeo, additive(0xffffff, 0));
    m.visible = false;
    scene.add(m);
    return { mesh: m, t: 1, life: 1, size: 1 };
  });
  const crackTex = crackTexture();
  // Her pink light, on her while she's out to kill.
  const tetoLight = new THREE.PointLight(0xff3d7a, 0, 14, 1.6);
  scene.add(tetoLight);
  // Miku's light: at the scythe's tip while the beam's up, and where it lands.
  const beamLights = [new THREE.PointLight(0x7fc4ff, 0, 16, 1.5), new THREE.PointLight(0x7fc4ff, 0, 18, 1.5)];
  scene.add(...beamLights);
  const scythe = buildScythe();
  return {
    teto, scythe, strands: [buildHairStrand(), buildHairStrand()],
    flames, sparks, trails, jets, debris, smoke, sights, muzzleFlash, fairies, mound, lumps, shocks, tetoLight,
    arena: buildArena(),
    snow: buildHeavySnow(),
    bullets: buildBullets(90),
    rails: [buildBeam(0xff2d6f, 0.2), buildBeam(0xff2d6f, 0.2)],
    giant: buildBeam(0xff4d86, 3.2),
    mikuBeam: buildLightBeam(),
    beamLights,
    disks: buildJetDisks(60),
    finale: buildFinaleKit(),
    mega: buildMegaKit(),
    streaks: [glowOrb(0xbfe6ff, 1), glowOrb(0xbfe6ff, 1)],
    cracks: [buildCrack(crackTex, 0xff2d6f), buildCrack(crackTex, 0xff2d6f), buildCrack(crackTex, 0x4da0ff)],
    orbs: [glowOrb(0xff4d7a, 0.4), glowOrb(0xff4d7a, 0.4)],
    bigOrb: glowOrb(0xff86b0, 1),
    tipOrb: glowOrb(0x6fb6ff, 0.4),
    blast: glowOrb(0xffffff, 1),
    rocks: Array.from({ length: 8 }, buildBoulder),
    homing: Array.from({ length: 12 }, () => ({ sprite: glowOrb(0xff4d86, 0.55), pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, age: 0 })),
    holes: [],
  };
}

/* ---------- Helpers ---------- */
function arenaActive() {
  return showdown.stage === 'fight' || (showdown.stage === 'ambush' && !!showdownScene && showdownScene.inArena) || showdown.stage === 'finale' || showdown.stage === 'limp';
}

// A point in the arena, from its own coordinates (x across, z along, y up from the snow).
function arenaPoint(out, x, y, z) {
  return out.set(x, SHOWDOWN.arena.y + y, z);
}

function tetoMuzzle(i, out) {
  return showdownKit.teto.head.localToWorld(out.copy(SHOWDOWN.muzzles[i]));
}

function tetoChest(out) {
  out.copy(fight.teto.pos);
  out.y += 1;
  return out;
}

function mikuChest(out) {
  out.copy(player.pos);
  out.y += 1;
  return out;
}

function fightStage() {
  const f = showdown.hp / SHOWDOWN.teto.hp;
  return f > 2 / 3 ? 0 : f > 1 / 3 ? 1 : 2;
}

// A quaternion whose y axis runs along `y`, with its z axis as near `zHint` as it can be.
function basisQuat(q, y, zHint) {
  sdY.copy(y).normalize();
  sdX.crossVectors(sdY, zHint).normalize();
  sdZ.crossVectors(sdX, sdY);
  sdM.makeBasis(sdX, sdY, sdZ);
  return q.setFromRotationMatrix(sdM);
}

// A ring of light racing out across the snow.
function shockwave(at, size, color = 0xffffff, life = 0.6) {
  const s = showdownKit.shocks.find((x) => x.t >= x.life) || showdownKit.shocks[0];
  Object.assign(s, { t: 0, life, size });
  s.mesh.material.color.set(color).multiplyScalar(2.5);
  s.mesh.position.copy(at).setY(Math.max(at.y - 0.9, SHOWDOWN.arena.y) + 0.06);
  if (!arenaActive()) s.mesh.position.y = at.y + 0.06;
  s.mesh.visible = true;
}

// An explosion: a flash, a fireball, a shockwave and the snow thrown up round it.
function explode(at, color, size = 1) {
  const k = showdownKit;
  k.blast.position.copy(at);
  k.blast.material.color.set(color).multiplyScalar(3);
  k.blast.userData = { t: 0, size: 1.5 + size * 2.5 };
  k.blast.visible = true;
  // Teto's fire is red, Miku's blue.
  const fire = k.blast.material.color.r > k.blast.material.color.b ? k.jets : k.flames;
  for (let i = 0; i < 40 * size; i++) {
    const v = sdW.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 7 * size);
    fire.emit(at, v, { life: 0.45 + Math.random() * 0.3, size: 0.5 + Math.random() * 0.6 * size, grow: 2.2, alpha: 0.9 });
  }
  for (let i = 0; i < 18 * size; i++) k.debris.emit(sdV.copy(at).add(sdU.set((Math.random() - 0.5) * size, -0.5, (Math.random() - 0.5) * size)), sdW.set((Math.random() - 0.5) * 5, 3 + Math.random() * 5, (Math.random() - 0.5) * 5), { life: 1, size: 0.6, grow: 2.5, alpha: 0.7, fall: 9 });
  shockwave(at, 4 + size * 5, color, 0.7);
  burst(at.clone(), color, 30, 6);
  Sfx.explosion(Math.min(1.2, 0.6 + size * 0.3));
  player.shake = Math.max(player.shake, 0.4 * size);
  impact('white', 50);
}

/* ---------- Teto's body ---------- */
// Poses her: standing, walking or running on the spot she's at, and her arms by `mode`.
function poseTeto(dt, mode = 'idle', look = null, extra = {}) {
  const T = showdownKit.teto, t = fight.teto;
  T.root.position.copy(t.pos);
  T.root.position.y += extra.lift || 0;
  T.root.rotation.set(0, t.yaw, 0);
  const speed = extra.speed || 0;
  t.walk += dt * (2.2 + speed * 1.8);
  const stride = Math.min(1, speed / 3);
  const s = Math.sin(t.walk);
  const crouch = extra.crouch || 0;
  T.hips.position.y = T.dims.hips - Math.abs(s) * 0.02 * stride - crouch * 0.38;
  T.hips.rotation.set(0, 0, 0);
  T.chest.rotation.set(mode === 'pant' ? 0.45 : 0.05 * stride + crouch * 0.5, 0, 0);
  T.legL.thigh.rotation.set(mode === 'fly' ? 0.2 : -s * 0.6 * stride - crouch * 1.1, 0, 0.04 + crouch * 0.2);
  T.legR.thigh.rotation.set(mode === 'fly' ? 0.35 : s * 0.6 * stride - crouch * 0.7, 0, -0.04 - crouch * 0.2);
  T.legL.shin.rotation.set(mode === 'fly' ? 0.5 : Math.max(0, s) * 0.9 * stride + (mode === 'pant' ? 0.4 : 0) + crouch * 1.9, 0, 0);
  T.legR.shin.rotation.set(mode === 'fly' ? 0.7 : Math.max(0, -s) * 0.9 * stride + (mode === 'pant' ? 0.4 : 0) + crouch * 1.4, 0, 0);
  // Her head turns to whatever she's watching.
  let headY = 0, headX = mode === 'pant' ? -0.35 : -crouch * 0.4;
  if (look) {
    const want = Math.atan2(look.x - t.pos.x, look.z - t.pos.z) - t.yaw;
    headY = clamp(Math.atan2(Math.sin(want), Math.cos(want)), -1, 1);
    headX = clamp(-Math.atan2(look.y - (t.pos.y + 1.4), Math.hypot(look.x - t.pos.x, look.z - t.pos.z)), -0.6, 0.6) - crouch * 0.3;
  }
  T.head.rotation.set(headX, headY, 0);
  T.root.updateMatrixWorld(true);
  const sh = T.armL.upper.position;
  const target = (side, x, y, z) => sdV.set(side * Math.abs(sh.x) + x, sh.y + y, z);
  if ((mode === 'point' || mode === 'grab') && look) {
    // Her right arm out at whatever she aims at, the left on her hip.
    T.chest.worldToLocal(sdW.copy(look));
    const reach = mode === 'grab' ? 0.42 : 0.5;
    sdW.sub(T.armR.upper.position).setLength(reach).add(T.armR.upper.position);
    solveArm(T.armR, sdW, POLE_R);
    solveArm(T.armL, target(1, 0.08, -0.42, 0.05), POLE_L);
  } else if (mode === 'rail' || mode === 'fly') {
    // Arms flung back and out, bracing as the hair does the work.
    solveArm(T.armL, target(1, 0.25, -0.25, -0.15), POLE_L);
    solveArm(T.armR, target(-1, -0.25, -0.25, -0.15), POLE_R);
  } else if (mode === 'pant') {
    solveArm(T.armL, target(1, 0.0, -0.5, 0.25), POLE_L);
    solveArm(T.armR, target(-1, 0.0, -0.5, 0.25), POLE_R);
  } else if (mode === 'whip') {
    const u = extra.u || 0;
    solveArm(T.armL, target(1, 0.3 * u, 0.1 * u - 0.35, 0.1), POLE_L);
    solveArm(T.armR, target(-1, -0.3 * u, 0.1 * u - 0.35, 0.1), POLE_R);
  } else if (crouch > 0.01) {
    // One fist down in the snow from the landing.
    solveArm(T.armL, target(1, 0.1, -0.5, 0.35 * crouch), POLE_L);
    solveArm(T.armR, target(-1, -0.05, -0.55 - 0.1 * crouch, 0.25 + 0.2 * crouch), POLE_R);
  } else {
    const swing = Math.sin(t.walk) * 0.12 * stride;
    solveArm(T.armL, target(1, 0.05, -0.44, swing), POLE_L);
    solveArm(T.armR, target(-1, -0.05, -0.44, -swing), POLE_R);
  }
  T.armL.hand.quaternion.identity();
  T.armR.hand.quaternion.identity();
  T.simulate(dt);
  // Her light rides with her.
  showdownKit.tetoLight.position.copy(t.pos).add(sdU.set(Math.sin(t.yaw) * 0.6, 1.5 + (extra.lift || 0), Math.cos(t.yaw) * 0.6));
}

/* ---------- Miku's scythe ---------- */
function showScythe(on) {
  const k = showdownKit;
  if (on) {
    avatar.root.add(k.scythe);
    k.scythe.visible = true;
    k.scythe.userData.uniforms.uReveal.value = 2;
    setScytheGlow(1);
  } else {
    k.scythe.visible = false;
  }
  bowModel.group.visible = !on;
  $('sword-wave').classList.toggle('hidden', !on || showdown.stage !== 'fight');
}

// How brightly the scythe burns, 1 in her hands, down to 0 as it goes out in the snow.
function setScytheGlow(f) {
  const [blade, handle, halo] = showdownKit.scythe.children;
  blade.material.emissiveIntensity = 0.75 * f;
  handle.material.emissiveIntensity = 0.7 * f;
  halo.material.opacity = 0.18 * f;
  showdownKit.scythe.userData.uniforms.uGlow.value = f;
}

function setShortHair(on) {
  showdown.shortHair = on;
  if (avatar) avatar.tailsCut = on;
}

// The scythe in her root's space: its centre, the way its shaft runs, the way its blades
// face, and a twirl about that last axis.
function placeScythe(cx, cy, cz, yAxis, zHint, twirl = 0) {
  const s = showdownKit.scythe;
  s.position.set(cx, cy, cz);
  basisQuat(s.quaternion, yAxis, zHint);
  if (twirl) s.quaternion.multiply(sdT.setFromAxisAngle(sdZ.set(0, 0, 1), twirl));
}

// A hand to a point on the shaft (`along` metres from its centre), or to a point of her own.
function gripScythe(arm, along, pole) {
  const s = showdownKit.scythe;
  s.updateMatrixWorld(true);
  s.localToWorld(sdW.set(0, along, 0));
  avatar.chest.worldToLocal(sdW);
  solveArm(arm, sdW, pole);
}

// The scythe stance and its strikes: arms laid over whatever poseAvatar did (game.js).
function poseScytheArms() {
  const { armL, armR } = avatar;
  const S = SHOWDOWN.scythe;
  avatar.root.updateMatrixWorld(true);
  const sh = armL.upper.position;
  const target = (side, x, y, z) => sdV.set(side * Math.abs(sh.x) + x, sh.y + y, z);
  const sw = fight.swing;
  if (sw) {
    const u = clamp(sw.t / sw.dur, 0, 1), e = smooth(u);
    if (sw.k === 0) {
      // A flat whirl, right to left: the shaft spins round her right fist.
      const a = -1.2 + e * Math.PI * 2.6;
      placeScythe(lerp(-0.3, 0.25, e), 1.1, 0.55, sdU.set(Math.cos(a), 0.05, Math.sin(a)), SD_UP);
      gripScythe(armR, 0, POLE_R);
      solveArm(armL, target(1, 0.3, -0.25, 0.1), POLE_L);
    } else if (sw.k === 1) {
      // A wheel rising in front of her.
      const a = e * Math.PI * 2.6;
      placeScythe(lerp(0.25, -0.2, e), lerp(0.85, 1.45, e), 0.6, sdU.set(Math.cos(a), Math.sin(a), 0), sdW.set(0, 0, 1));
      gripScythe(armR, 0, POLE_R);
      solveArm(armL, target(1, 0.32, -0.2, 0.05), POLE_L);
    } else {
      // The finisher: held out flat and whirling as she spins.
      const a = e * Math.PI * 3;
      placeScythe(0, 1.05, 0.75, sdU.set(Math.cos(a), 0, Math.sin(a)), SD_UP);
      gripScythe(armR, 0, POLE_R);
      solveArm(armL, target(1, 0.42, -0.05, 0.1), POLE_L);
    }
  } else if (fight.toss) {
    // Empty-handed while it flies: her throwing arm still out after it, the other braced.
    const reach = fight.toss.phase === 'back' ? 1 : Math.max(0, 1 - fight.toss.t * 2);
    solveArm(armR, target(-1, -0.05, lerp(-0.35, 0.05, reach), lerp(0.15, 0.5, reach)), POLE_R);
    solveArm(armL, target(1, 0.12, -0.42, 0.12), POLE_L);
    armL.hand.quaternion.identity();
    armR.hand.quaternion.identity();
    return;
  } else if (fight.tossT >= 0) {
    // Whirled overhead, faster and faster, then brought round to throw.
    const u = clamp(fight.tossT / S.toss.windup, 0, 1);
    const a = fight.tossT * (10 + fight.tossT * 30);
    const down = smooth(clamp((fight.tossT - S.toss.windup * 0.75) / 0.2, 0, 1));
    placeScythe(0, lerp(1.95, 1.2, down), lerp(0.15, 0.7, down), sdU.set(Math.cos(a), 0, Math.sin(a)), SD_UP);
    gripScythe(armR, 0, POLE_R);
    solveArm(armL, target(1, 0.1, lerp(0.35, -0.1, down) + u * 0.05, lerp(0.1, 0.4, down)), POLE_L);
  } else if (fight.beamT >= 0 && fight.beamT < S.beam.charge * 0.45) {
    // The windup, first: the scythe whirled up over her head, faster and faster.
    const u = fight.beamT / (S.beam.charge * 0.45);
    const a = fight.beamT * (8 + fight.beamT * 40);
    placeScythe(0, lerp(1.3, 1.95, smooth(u)), 0.15, sdU.set(Math.cos(a), 0, Math.sin(a)), SD_UP);
    gripScythe(armR, 0, POLE_R);
    solveArm(armL, target(1, 0.1, 0.3 * u - 0.1, 0.15), POLE_L);
  } else if (fight.beamT >= 0 && fight.beamT < S.beam.charge) {
    // Then drawn right back past her hip, her whole body wound up behind it.
    const u = smooth((fight.beamT - S.beam.charge * 0.45) / (S.beam.charge * 0.55));
    avatar.chest.rotation.y -= 0.55 * u;
    avatar.chest.rotation.x -= 0.12 * u;
    avatar.root.updateMatrixWorld(true);
    placeScythe(lerp(0, -0.32, u), lerp(1.6, 1.0, u), lerp(0.15, -0.2, u), sdU.set(lerp(0, -0.25, u), lerp(0, -0.25, u), lerp(1, -1, u)).normalize(), SD_UP);
    gripScythe(armR, -0.28, POLE_R);
    gripScythe(armL, 0.02, POLE_L);
  } else if (fight.beamT >= 0) {
    // Thrust out like a lance, a blade at whatever she's aiming at, both hands on the shaft.
    const since = fight.beamT - S.beam.charge;
    const kick = Math.max(0.15, 1 - since * 4);
    const shudder = (Math.random() - 0.5) * 0.02;
    avatar.chest.rotation.y += 0.25 * Math.max(0, 1 - since * 5);
    avatar.root.updateMatrixWorld(true);
    placeScythe(0.05 + shudder, 1.22 + shudder, 0.42 - kick * 0.12, sdU.set(0, 0.04, 1), SD_UP);
    gripScythe(armR, -0.28, POLE_R);
    gripScythe(armL, 0.02, POLE_L);
  } else {
    // Ready: across her body, the top blade high to her left.
    const bob = Math.sin(game.time * 2.2) * 0.015;
    placeScythe(-0.04, 1.02 + bob, 0.36, sdU.set(0.55, 0.8, 0.12), sdW.set(0, 0, 1));
    gripScythe(armR, -0.2, POLE_R);
    gripScythe(armL, 0.2, POLE_L);
  }
  armL.hand.quaternion.identity();
  armR.hand.quaternion.identity();
}

// Blue flame licking along the blades, more of it mid-strike.
function scytheFlames(dt) {
  const k = showdownKit, s = k.scythe;
  if (!s.visible) return;
  const u = s.userData;
  u.uniforms.uTime.value = game.time;
  const hot = fight.swing || fight.tossT >= 0 || fight.beamT >= 0 ? 5 : 2;
  s.updateMatrixWorld(true);
  for (let i = 0; i < hot; i++) {
    const p = u.samples[Math.floor(Math.random() * u.samples.length)];
    if (Math.abs(p.y) > u.uniforms.uReveal.value) continue;
    s.localToWorld(sdV.copy(p));
    k.flames.emit(sdV, sdW.set((Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.7, (Math.random() - 0.5) * 0.3), { life: 0.3, size: 0.09 + Math.random() * 0.08, grow: 1.4, alpha: 0.85 });
  }
  // Whirling, the blades leave arcs of fire hanging in the air behind them.
  if (fight.swing || fight.toss) {
    for (const tip of [u.tipA, u.tipB]) {
      s.localToWorld(sdV.copy(tip));
      k.flames.emit(sdV, sdW.set(0, 0.3, 0), { life: 0.28, size: 0.32, grow: 0.6, alpha: 0.95 });
    }
    for (let i = 0; i < 6; i++) {
      s.localToWorld(sdV.copy(u.samples[Math.floor(Math.random() * u.samples.length)]));
      k.flames.emit(sdV, sdW.set(0, 0.5, 0), { life: 0.22, size: 0.2, grow: 0.8, alpha: 0.8 });
    }
  }
}

/* ---------- The ambush ---------- */
const AMBUSH = {
  shot: 1.0, sag: 1.6, look: 2.9, appear: 5.0, lineA: 5.3, laugh: 5.9, turn: 6.4, grab: 6.9, lineB: 7.2,
  drag: 8.4, leap: 9.2, apex: 10.6, lineC: 10.8, windup: 11.4, throw: 12.4, white: 14.0,
  land: 14.25, drop: 15.3, quake: 15.9, arrive: 16.6, rise: 17.3, rip: 18.3, forge: 19.1, ready: 20.7, swordLine: 21.9, end: 23.5,
};

// She goes to climb into the balloon.
function startAmbush() {
  if (showdown.stage !== 'none' || !balloonModel) return;
  showdown.stage = 'ambush';
  if (typeof crimsonVanish === 'function' && crimson.phase !== 'gone') crimsonVanish();
  const out = balloonSpot.out, side = balloonSpot.side;
  // Teto fires from up in the trees off to one side, unseen, before she's suddenly behind Miku.
  const tx = balloonSpot.x + out.x * 15 + side.x * 9, tz = balloonSpot.z + out.z * 15 + side.z * 9;
  fight.teto.pos.set(tx, groundHeight(tx, tz) + 5, tz);
  fight.teto.yaw = Math.atan2(balloonSpot.x - tx, balloonSpot.z - tz);
  showdownScene = { t: 0, fired: {}, inArena: false, from: player.pos.clone(), bullets: [], steps: 0 };
  survival.tool = 'bow';
  survival.swing = null;
  showdownKit.teto.setVisible(false);
  // Posed once where she hides, so the shots come from her drills.
  poseTeto(1 / 60, 'point', new THREE.Vector3(balloonSpot.x, balloonSpot.y + 12, balloonSpot.z));
  clearWolves();
  playScene({ update: updateAmbush });
}

function ambushOnce(key, at, fn) {
  const s = showdownScene;
  if (!s.fired[key] && s.t >= at) { s.fired[key] = true; fn(); }
}

// Bullets from Teto's hair at a point on the envelope, which leave a hole there.
function ambushVolley(s) {
  const env = balloonModel.envelope;
  const rc = new THREE.Raycaster();
  for (let i = 0; i < 34; i++) {
    tetoMuzzle(i % 2, sdV);
    const aim = sdW.set(balloonSpot.x + (Math.random() - 0.5) * 9, balloonSpot.y + 6 + Math.random() * 12, balloonSpot.z + (Math.random() - 0.5) * 9);
    const dir = aim.clone().sub(sdV).normalize();
    rc.set(sdV, dir);
    const hit = rc.intersectObject(env, true)[0];
    s.bullets.push({ from: sdV.clone(), dir, at: hit ? hit.point.clone() : aim.clone(), miss: !hit, t: -i * 0.035 });
  }
}

// A hole torn in the silk, its edge glowing as it smoulders.
function addHole(point) {
  const env = balloonModel.envelope;
  const r = 0.22 + Math.random() * 0.2;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 10), new THREE.MeshBasicMaterial({ color: 0x140c0c, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }));
  env.worldToLocal(hole.position.copy(point));
  hole.lookAt(env.localToWorld(new THREE.Vector3(0, hole.position.y, 0)));
  const glow = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r * 1.7, 14), additive(new THREE.Color(0xff6a3d).multiplyScalar(2.5), 1, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, fog: true }));
  hole.add(glow);
  hole.userData.glow = glow;
  env.add(hole);
  showdownKit.holes.push(hole);
  for (let i = 0; i < 6; i++) showdownKit.sparks.emit(point, sdW.set((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6), { life: 0.5, size: 0.25, grow: 1, alpha: 1 });
  showdownKit.smoke.emit(point, sdW.set(0, 0.4, 0), { life: 2.4, size: 0.6, grow: 3, alpha: 0.45 });
}

// Points a torn tail, held in `hand`, along the world direction `dir`.
function aimStrand(strand, hand, dir) {
  hand.getWorldQuaternion(sdQ).invert();
  strand.quaternion.copy(sdQ).multiply(sdT.setFromUnitVectors(sdX.set(0, -1, 0), sdY.copy(dir).normalize()));
}

function updateAmbush(dt) {
  const s = showdownScene, A = AMBUSH, k = showdownKit;
  // High over the forest, as she winds up to throw, it all slows right down.
  const sdt = s.t > A.apex && s.t < A.throw + 0.25 ? dt * 0.45 : dt;
  s.t += sdt;
  game.time += sdt;
  const t = s.t;
  const spot = balloonSpot, out = spot.out, side = spot.side;
  const tt = fight.teto;
  if (!s.inArena) {
    tickBalloon(dt);
    updateFires(dt);
  }
  ambushOnce('bang', A.shot, () => { Sfx.gunshot(); impact('white', 80); ambushVolley(s); });
  // Tracers through the silk, slowed right down.
  for (const b of s.bullets) {
    b.t += dt;
    if (b.t < 0) continue;
    if (!b.mesh) {
      b.mesh = buildTracer();
      b.mesh.visible = true;
      if (Math.random() < 0.45) Sfx.gatling();
    }
    const d = b.t * 34;
    const total = b.from.distanceTo(b.at) + 30;
    b.mesh.position.copy(b.from).addScaledVector(b.dir, d);
    b.mesh.lookAt(sdV.copy(b.mesh.position).add(b.dir));
    k.trails.emit(b.mesh.position, sdW.set(0, 0, 0), { life: 0.35, size: 0.18, grow: 0.4, alpha: 0.8 });
    if (!b.holed && d >= b.from.distanceTo(b.at)) { b.holed = true; if (!b.miss) addHole(b.at); }
    if (d > total) { scene.remove(b.mesh); b.mesh = null; b.t = -999; }
  }
  for (const hole of k.holes) {
    const glow = hole.userData.glow;
    if (glow) glow.material.opacity = Math.max(0, glow.material.opacity - dt * 0.12) * (0.92 + Math.random() * 0.08);
  }
  // The envelope sags as the air goes out of it.
  if (t > A.sag) balloon.sag = Math.min(1, (t - A.sag) / 4.5);
  ambushOnce('hiss', A.sag, () => { Sfx.silk(); balloon.burnHold = 0; });

  ambushOnce('appear', A.appear, () => {
    // Out of nowhere: a swirl of red light at Miku's back, and Teto's standing in it.
    s.behind = player.pos.clone().addScaledVector(out, 1.05);
    s.behind.y = groundHeight(s.behind.x, s.behind.z);
    tt.pos.copy(s.behind);
    k.teto.setVisible(true);
    for (let i = 0; i < 18; i++) emitJetDisk(sdV.copy(s.behind).add(sdU.set((Math.random() - 0.5) * 0.8, Math.random() * 2, (Math.random() - 0.5) * 0.8)), sdW.set((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3), 0.25, 0.6);
    Sfx.stinger();
    Sfx.whoosh(0.4);
    impact('invert', 70);
  });
  ambushOnce('drag', A.drag, () => {
    // Far enough out that nothing of the sagging silk is overhead when she jumps.
    s.dragTo = new THREE.Vector3(spot.x, 0, spot.z).addScaledVector(out, 12);
    s.dragTo.y = groundHeight(s.dragTo.x, s.dragTo.z);
    Sfx.whoosh(0.6);
  });
  ambushOnce('windup', A.windup, () => {
    Sfx.whoosh(0.9);
    s.spinYaw = tt.yaw;
    // She'll let go facing away from the balloon and off to one side, so Miku comes down over
    // the open forest, nowhere near the silk.
    s.throwDir = out.clone().setY(0).normalize().applyAxisAngle(SD_UP, 0.5);
    s.spinEnd = Math.atan2(s.throwDir.x, s.throwDir.z);
    while (s.spinEnd < s.spinYaw + Math.PI * 4) s.spinEnd += Math.PI * 2;
  });
  // Teto: unseen in the trees for the shooting; then right behind Miku.
  let tetoMode = 'idle', tetoSpeed = 0, tetoLook = mikuChest(new THREE.Vector3()), crouch = 0, lift = 0;
  if (!s.inArena) {
    const toSpotYaw = Math.atan2(spot.x - s.from.x, spot.z - s.from.z);
    if (t < A.appear) {
      k.tetoLight.intensity = 0;
    } else if (t < A.drag) {
      // Standing at her back, then holding her up by the collar.
      k.tetoLight.intensity = 3 + Math.sin(t * 9) * 0.6;
      tt.pos.copy(s.behind);
      tetoMode = t > A.grab ? 'grab' : 'idle';
      if (t < A.grab && t > A.turn) crouch = 0.15;
    } else if (t < A.leap) {
      // Dragging her out from under the silk, backwards across the snow.
      const u = smooth((t - A.drag) / (A.leap - A.drag));
      tt.pos.lerpVectors(s.behind, s.dragTo, u);
      tt.pos.y = groundHeight(tt.pos.x, tt.pos.z);
      tetoMode = 'grab';
      tetoSpeed = 6;
      if (Math.random() < 0.8) k.debris.emit(tt.pos.clone().add(sdU.set(0, 0.15, 0)), sdW.set((Math.random() - 0.5) * 3, 1.5, (Math.random() - 0.5) * 3).addScaledVector(out, 2), { life: 0.8, size: 0.6, grow: 2, alpha: 0.7, fall: 9 });
    } else if (t < A.throw) {
      // Up on her jets with Miku in her fist, high over the trees, then the windup.
      const u = 1 - Math.pow(1 - clamp((t - A.leap) / (A.apex - A.leap), 0, 1), 2.4);
      tt.pos.copy(s.dragTo).addScaledVector(out, 8 * u);
      tt.pos.y = s.dragTo.y + 16 * u + Math.sin(t * 2.2) * 0.15;
      tetoMode = t < A.apex ? 'fly' : 'grab';
      tetoJets(t < A.apex ? 1 : 0.4);
    } else {
      // Watching her go.
      tetoMode = 'point';
      tetoJets(0.4);
    }
    if (t >= A.appear && t < A.windup) tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
    if (t >= A.windup && t < A.throw) {
      // Whirled round her once, twice, faster and faster.
      const u = (t - A.windup) / (A.throw - A.windup);
      tt.yaw = lerp(s.spinYaw, s.spinEnd, u * u);
    }
    if (t >= A.throw) tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
    void toSpotYaw;
  }
  ambushOnce('lineA', A.lineA, () => tetoSays(showdownLine('ambushA')));
  ambushOnce('laugh', A.laugh, () => Sfx.tetoLaugh());
  ambushOnce('turn', A.turn, () => Sfx.whoosh(0.3));
  ambushOnce('grab', A.grab, () => { Sfx.thud(); impact('invert', 60); s.grabFrom = player.pos.clone(); player.shake = 0.3; });
  ambushOnce('lineB', A.lineB, () => tetoSays(showdownLine('ambushB')));
  ambushOnce('leap', A.leap, () => {
    Sfx.quake();
    Sfx.railFire();
    explode(s.dragTo.clone().add(sdU.set(0, 0.4, 0)), 0xff2d55, 1);
    shockwave(s.dragTo, 9, 0xff4d86, 0.7);
    s.jet = Sfx.jet();
    s.jet.set(0.8, 0.2);
  });
  ambushOnce('lineC', A.lineC, () => tetoSays(showdownLine('ambushC')));
  ambushOnce('throw', A.throw, () => {
    Sfx.boom(1);
    Sfx.whoosh(1.6);
    Sfx.crimsonVoice([[0, 150], [0.35, 240]], 0.2, { vowel: 'a', breath: 0.4 });
    impact('invert', 90);
    s.throwFrom = player.pos.clone();
    burst(s.throwFrom.clone(), 0xff86b0, 40, 9);
    shockwave(s.throwFrom, 6, 0xffffff, 0.5);
    player.shake = 0.6;
  });
  ambushOnce('white', A.white, () => { impact('white', 260); Sfx.branchSnap(); drawSpeedLines(0, 0); if (s.jet) { s.jet.stop(); s.jet = null; } enterArena(); });
  ambushOnce('land', A.land, () => { Sfx.snowSlam(); Sfx.quake(); player.shake = 0.7; shockwave(player.pos, 5, 0xe8f0ff, 0.6); });
  ambushOnce('drop', A.drop, () => { Sfx.whoosh(0.8); });
  ambushOnce('quake', A.quake, () => {
    Sfx.quake();
    Sfx.explosion(0.8);
    player.shake = 1;
    impact('white', 70);
    shockwave(tt.pos, 9, 0xff6a9a, 0.8);
    shockwave(tt.pos, 5, 0xffffff, 0.5);
    const crack = k.cracks[0];
    crack.position.copy(tt.pos).setY(SHOWDOWN.arena.y + 0.03);
    crack.scale.setScalar(6);
    crack.material.opacity = 1;
    crack.visible = true;
    crack.userData.fade = 0.25;
    for (let i = 0; i < 40; i++) k.debris.emit(sdV.copy(tt.pos).add(sdU.set((Math.random() - 0.5) * 3, 0.2, (Math.random() - 0.5) * 3)), sdW.set((Math.random() - 0.5) * 8, 3 + Math.random() * 6, (Math.random() - 0.5) * 8), { life: 1.4, size: 0.8, grow: 2.5, alpha: 0.75, fall: 9 });
  });
  ambushOnce('arrive', A.arrive, () => tetoSays(showdownLine('arrive')));
  ambushOnce('rip', A.rip, () => {
    Sfx.silk();
    Sfx.thud();
    setShortHair(true);
    for (const [strand, arm] of [[k.strands[0], avatar.armL], [k.strands[1], avatar.armR]]) {
      arm.hand.add(strand);
      strand.position.set(0, -0.05, 0.02);
      strand.rotation.set(0, 0, 0);
      strand.scale.setScalar(1);
      strand.visible = true;
    }
    for (let i = 0; i < 2; i++) burst(avatar.head.getWorldPosition(sdV.clone()), 0x37c7cf, 24, 3);
  });
  ambushOnce('forge', A.forge, () => {
    Sfx.forge();
    showScythe(true);
    k.scythe.userData.uniforms.uReveal.value = 0;
  });
  ambushOnce('ready', A.ready, () => {
    for (const strand of k.strands) strand.visible = false;
    k.scythe.userData.uniforms.uReveal.value = 2;
    Sfx.ignite();
    impact('invert', 90);
    k.scythe.updateMatrixWorld(true);
    explode(k.scythe.getWorldPosition(sdV.clone()), 0x3d8bff, 0.7);
    caption(showdownLine('mikuSwords'), 'line');
    showdown.music = true;
    Sfx.playMusic('teto');
  });
  ambushOnce('swordLine', A.swordLine, () => { caption(''); tetoSays(showdownLine('swords')); });

  // Miku.
  player.stride = 0;
  player.runBlend = 0;
  if (!s.inArena) {
    const toSpotYaw = Math.atan2(spot.x - s.from.x, spot.z - s.from.z);
    if (t < A.grab) {
      // At the basket; then looking round for whoever fired; then turning to find her there.
      if (t < A.look) player.bodyYaw = toSpotYaw;
      else if (t < A.turn) player.bodyYaw = toSpotYaw + Math.sin((t - A.look) * 2.2) * 0.7 * (t < A.appear ? 1 : Math.max(0, 1 - (t - A.appear) * 3));
      else player.bodyYaw = toSpotYaw + Math.PI * smooth(clamp((t - A.turn) / 0.35, 0, 1));
      poseAvatar(dt, sdU.set(0, 0, 0), false);
      avatar.root.updateMatrixWorld(true);
      const sh = avatar.armR.upper.position;
      if (t < A.shot + 0.3) {
        // Reaching for the basket's rim, before the shot.
        solveArm(avatar.armR, sdV.set(-Math.abs(sh.x) - 0.05, sh.y - 0.05 + smooth(t / A.shot) * 0.15, 0.42 * smooth(t / A.shot)), POLE_R);
      } else if (t > A.look) {
        // Arms up, braced, ready for anything.
        solveArm(avatar.armR, sdV.set(-Math.abs(sh.x) - 0.1, sh.y - 0.25, 0.25), POLE_R);
        solveArm(avatar.armL, sdV.set(Math.abs(sh.x) + 0.1, sh.y - 0.25, 0.25), POLE_L);
      }
      avatar.armL.hand.quaternion.identity();
      avatar.armR.hand.quaternion.identity();
      avatar.simulate(dt);
    } else if (t < A.windup) {
      // Held up by the collar in front of her, kicking; dragged; carried up into the sky.
      const fwd = sdW.set(Math.sin(tt.yaw), 0, Math.cos(tt.yaw));
      player.pos.copy(tt.pos).addScaledVector(fwd, 0.85);
      player.pos.y = tt.pos.y + smooth(clamp((t - A.grab) / 0.4, 0, 1)) * 0.45 - (t > A.leap ? 0.35 : 0);
      player.bodyYaw = tt.yaw + Math.PI;
      poseAvatar(dt, sdU.set(0, 0, 0), false);
      avatar.legL.thigh.rotation.x = Math.sin(t * 11) * 0.4;
      avatar.legR.thigh.rotation.x = -Math.sin(t * 11) * 0.4;
      avatar.simulate(dt);
    } else if (t < A.throw) {
      // Whirled round her in the sky.
      const u = (t - A.windup) / (A.throw - A.windup);
      player.pos.set(tt.pos.x + Math.sin(tt.yaw) * 1.2, tt.pos.y + 0.6 + u * 0.3, tt.pos.z + Math.cos(tt.yaw) * 1.2);
      player.bodyYaw = tt.yaw + Math.PI;
      poseFalling(dt, t, player.pos.clone().add(sdU.set(0, 0.2, 0)), 0.4);
    } else {
      // Hurled: a streak of light down across the sky and into the trees.
      const u = (t - A.throw) / (A.white - A.throw);
      const go = 1 - Math.pow(1 - u, 1.4);
      player.pos.copy(s.throwFrom).addScaledVector(s.throwDir, go * 60);
      player.pos.y = s.throwFrom.y + Math.sin(go * Math.PI) * 3 - go * 12;
      player.bodyYaw = Math.atan2(s.throwDir.x, s.throwDir.z);
      poseFalling(dt, t * 2.2, player.pos, 1.3);
      // A comet's tail of blue fire and snow off her.
      for (let i = 0; i < 3; i++) k.flames.emit(player.pos.clone().add(sdU.set((Math.random() - 0.5) * 0.6, 0.5 + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6)), sdW.copy(s.throwDir).multiplyScalar(-4), { life: 0.5, size: 0.5, grow: 1.5, alpha: 0.7 });
      // Through the branches: snow bursting off them, twigs snapping.
      s.branchT = (s.branchT || 0) - dt;
      if (s.branchT <= 0 && u > 0.45) {
        s.branchT = 0.14 + Math.random() * 0.12;
        Sfx.branchSnap();
        const at = player.pos.clone().addScaledVector(s.throwDir, 1.5 + Math.random() * 2).add(sdU.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 0));
        for (let i = 0; i < 12; i++) k.debris.emit(at, sdW.set((Math.random() - 0.5) * 6, Math.random() * 3, (Math.random() - 0.5) * 6), { life: 0.9, size: 0.7, grow: 2, alpha: 0.85, fall: 9 });
      }
      drawSpeedLines(0.9, t);
    }
  } else if (t < A.rise) {
    // Down hard in the snow, skidding, then still.
    const skid = smooth(clamp((t - A.land) / 0.8, 0, 1));
    arenaPoint(player.pos, 0.6, 0, SHOWDOWN.arena.start - 7 + skid * 7);
    if (t > A.land && skid < 0.98) for (let i = 0; i < 3; i++) k.debris.emit(player.pos.clone().add(sdU.set((Math.random() - 0.5) * 0.8, 0.2, 0.4)), sdW.set((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, 3 + Math.random() * 3), { life: 0.9, size: 0.6, grow: 2, alpha: 0.8, fall: 9 });
    player.bodyYaw = 0;
    if (t < A.land) poseFalling(dt, t * 2.2, player.pos.clone().add(sdU.set(0, (A.land - t) * 30, 0)), 1.3);
    else poseLying(dt, player.pos);
  } else {
    player.bodyYaw = Math.atan2(tt.pos.x - player.pos.x, tt.pos.z - player.pos.z);
    poseAvatar(dt, sdU.set(0, 0, 0), false);
    avatar.root.updateMatrixWorld(true);
    const sh = avatar.armL.upper.position;
    if (t > A.rip - 0.6 && t < A.forge) {
      // Hands up to her hair ties, a hard pull, and her twin tails come away in her fists.
      const u = clamp((t - (A.rip - 0.6)) / 0.6, 0, 1);
      const pull = smooth(clamp((t - A.rip) / 0.35, 0, 1));
      solveArm(avatar.armL, sdV.set(Math.abs(sh.x) + 0.02 + pull * 0.3, sh.y + 0.24 * u - pull * 0.3, 0.02 + pull * 0.1), POLE_L);
      solveArm(avatar.armR, sdV.set(-Math.abs(sh.x) - 0.02 - pull * 0.3, sh.y + 0.24 * u - pull * 0.3, 0.02 + pull * 0.1), POLE_R);
      // The torn tails hang from her fists, swinging.
      avatar.root.updateMatrixWorld(true);
      for (const [i, strand] of k.strands.entries()) aimStrand(strand, i ? avatar.armR.hand : avatar.armL.hand, sdW.set(Math.sin(t * 3 + i) * 0.25, -1, 0.15 + Math.cos(t * 2.4 + i) * 0.15));
    } else if (t >= A.forge && t < A.ready) {
      // The forging: fists together before her, the strands twisting into each other and
      // into the shaft as it draws itself out of them, blade by blade.
      const u = (t - A.forge) / (A.ready - A.forge);
      const meet = smooth(clamp(u / 0.3, 0, 1));
      placeScythe(0, 1.15, 0.42, sdU.set(1, 0, 0), sdW.set(0, 0.25, 1), Math.sin(u * 9) * 0.05);
      solveArm(avatar.armL, sdV.set(lerp(Math.abs(sh.x) + 0.3, 0.06, meet), lerp(sh.y - 0.3, sh.y - 0.28, meet), lerp(0.12, 0.38, meet)), POLE_L);
      solveArm(avatar.armR, sdV.set(lerp(-Math.abs(sh.x) - 0.3, -0.06, meet), lerp(sh.y - 0.3, sh.y - 0.28, meet), lerp(0.12, 0.38, meet)), POLE_R);
      const reveal = smooth(clamp((u - 0.25) / 0.7, 0, 1));
      k.scythe.userData.uniforms.uReveal.value = reveal * 1.25;
      k.scythe.userData.uniforms.uGlow.value = 1 + (1 - reveal) * 4;
      // The strands wind round and in, thinning as the metal takes them.
      avatar.root.updateMatrixWorld(true);
      const centre = k.scythe.getWorldPosition(sdW.clone());
      for (const [i, strand] of k.strands.entries()) {
        const hand = i ? avatar.armR.hand : avatar.armL.hand;
        const from = hand.getWorldPosition(sdV.clone());
        const dir = centre.clone().sub(from).normalize().add(sdU.set(0, -0.9 * (1 - meet), 0));
        aimStrand(strand, hand, dir);
        strand.rotateY(u * 20 * (i ? 1 : -1));
        strand.scale.set(1 - reveal * 0.7, 1 - reveal, 1 - reveal * 0.7);
      }
      // A helix of blue fire round the forming shaft.
      for (let i = 0; i < 4; i++) {
        const a = t * 14 + i * Math.PI / 2, along = (Math.random() - 0.5) * 1.6 * Math.max(0.3, reveal);
        k.scythe.localToWorld(sdV.set(Math.cos(a) * 0.22, along, Math.sin(a) * 0.22));
        k.flames.emit(sdV, sdU.set(0, 0.4, 0), { life: 0.35, size: 0.14, grow: 1.4, alpha: 0.9 });
      }
    } else if (t >= A.ready) {
      poseScytheArms();
      // A twirl to show it off.
      const u = clamp((t - A.ready) / 0.9, 0, 1);
      if (u < 1) { fight.swing = { k: 0, t: u * 0.32, dur: 0.32 }; poseScytheArms(); fight.swing = null; }
    }
    avatar.armL.hand.quaternion.identity();
    avatar.armR.hand.quaternion.identity();
    avatar.simulate(dt);
  }
  if (showdown.shortHair) scytheFlames(dt);

  // Teto in the arena: she drops in from the sky and lands like a bomb.
  if (s.inArena) {
    if (t < A.drop) { tt.pos.y = SHOWDOWN.arena.y + 60; tetoMode = 'fly'; }
    else if (t < A.quake) {
      const u = (t - A.drop) / (A.quake - A.drop);
      tt.pos.y = SHOWDOWN.arena.y + 40 * (1 - u * u);
      tetoMode = 'fly';
      emitJetDisk(tt.pos.clone().add(sdU.set(0, 1.6, 0)), sdW.set(0, 8, 0), 0.4);
    } else {
      tt.pos.y = SHOWDOWN.arena.y;
      crouch = 1 - smooth(clamp((t - A.quake - 0.4) / 0.9, 0, 1));
    }
    tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
    k.tetoLight.intensity = 3.5 + Math.sin(t * 9) * 0.6;
  }
  if (t >= A.appear || s.inArena) poseTeto(dt, tetoMode, tetoLook, { speed: tetoSpeed, crouch, lift });
  updateShowdownFx(dt);

  // Shots.
  let camAt, look, roll = 0;
  if (!s.inArena) {
    const toSpot = sdX.set(spot.x - s.from.x, 0, spot.z - s.from.z).normalize().clone();
    const across = new THREE.Vector3(toSpot.z, 0, -toSpot.x);
    if (t < A.shot) {
      // Behind her as she reaches for the basket.
      camAt = sdV.copy(player.pos).addScaledVector(out, 2.4).addScaledVector(side, 0.9).add(sdU.set(0, 1.55, 0));
      look = new THREE.Vector3(spot.x, spot.y + 1.6, spot.z);
      setFov(50);
    } else if (t < A.look) {
      // Up at the silk as the rounds tear through it.
      const u = (t - A.shot) / (A.look - A.shot);
      camAt = sdV.set(spot.x, spot.y, spot.z).addScaledVector(out, 20 - u * 3).addScaledVector(side, -8).add(sdU.set(0, 2, 0));
      look = new THREE.Vector3(spot.x, spot.y + 11 - u * 2, spot.z);
      setFov(52);
      if (t < A.shot + 1.2) shake(camAt, 0.2);
    } else if (t < A.turn) {
      // Her face as she looks round for the shooter. Then something's behind her, and the
      // world seems to stretch away from the two of them.
      const z = smooth(clamp((t - A.appear) / 1.2, 0, 1));
      camAt = sdV.copy(s.from).addScaledVector(toSpot, lerp(1.4, 2.6, z)).addScaledVector(across, 0.35).add(sdU.set(0, 1.5, 0));
      look = s.from.clone().add(sdU.set(0, 1.4, 0)).addScaledVector(toSpot, -0.6 * z);
      setFov(lerp(48, 30, z));
    } else if (t < A.drag) {
      // The two of them side on.
      const mid = sdW.lerpVectors(tt.pos, player.pos, 0.5);
      camAt = sdV.copy(mid).addScaledVector(across, 3.2).add(sdU.set(0, 1.35, 0));
      look = mid.clone().add(sdU.set(0, 1.3, 0));
      setFov(44);
      roll = 0.06;
    } else if (t < A.leap) {
      // Low and alongside as she drags Miku out across the snow.
      const mid = sdW.lerpVectors(tt.pos, player.pos, 0.5);
      camAt = sdV.copy(mid).addScaledVector(across, 4.5).addScaledVector(out, 1.5).add(sdU.set(0, 0.6, 0));
      look = mid.clone().add(sdU.set(0, 1, 0));
      setFov(52);
    } else if (t < A.apex) {
      // From the snow as they rocket up and away.
      camAt = sdV.copy(s.dragTo).addScaledVector(across, 5).addScaledVector(out, -2).add(sdU.set(0, 0.5, 0));
      look = tt.pos.clone().add(sdU.set(0, 1, 0));
      setFov(62);
      shake(camAt, 0.12);
    } else if (t < A.throw) {
      // Up there with them, the forest far below, slowly round them as she winds up.
      const a = (t - A.apex) * 0.5;
      camAt = sdV.copy(tt.pos).add(sdU.set(Math.sin(a) * across.x * 4 + Math.cos(a) * out.x * -4, 0.8, Math.sin(a) * across.z * 4 + Math.cos(a) * out.z * -4));
      look = tt.pos.clone().add(sdU.set(0, 1.1, 0));
      setFov(50);
      s.cam = camAt.clone();
      s.camLook = look.clone();
    } else {
      // Chasing her down the sky, the camera swinging round after her rather than cutting.
      const sideT = sdW.set(s.throwDir.z, 0, -s.throwDir.x);
      const want = sdV.copy(player.pos).addScaledVector(s.throwDir, -5).addScaledVector(sideT, 1.6).add(sdU.set(0, 2, 0));
      s.cam.lerp(want, 1 - Math.exp(-dt * 4));
      s.camLook.lerp(sdX.copy(player.pos).addScaledVector(s.throwDir, 4), 1 - Math.exp(-dt * 8));
      camAt = s.cam.clone();
      look = s.camLook.clone();
      setFov(lerp(50, 78, smooth(clamp((t - A.throw) / 0.6, 0, 1))));
      roll = Math.sin(t * 2.4) * 0.12 * smooth(clamp((t - A.throw) / 0.6, 0, 1));
      shake(camAt, 0.08);
    }
  } else {
    const toT = sdW.set(tt.pos.x - player.pos.x, 0, tt.pos.z - player.pos.z).normalize();
    if (t < A.drop) {
      // Low by the snow as she slams down and skids.
      camAt = sdV.set(player.pos.x + 2.4, SHOWDOWN.arena.y + 0.6, SHOWDOWN.arena.start + 1.5);
      look = player.pos.clone().add(sdU.set(0, 0.4, 0));
      setFov(60);
    } else if (t < A.arrive) {
      // Up at the sky as Teto comes down on top of the clearing.
      camAt = sdV.copy(player.pos).addScaledVector(toT, -2.4).add(sdU.set(1.8, 0.8, 0));
      look = tt.pos.clone().add(sdU.set(0, 1, 0));
      setFov(54);
    } else if (t < A.rip - 0.6) {
      // Teto rising out of her crouch in the crater, lit pink.
      camAt = sdV.copy(tt.pos).addScaledVector(toT, -3.2).add(sdU.set(0.9, 0.7, 0));
      look = tt.pos.clone().add(sdU.set(0, 1.2, 0));
      setFov(42);
      roll = -0.06;
    } else if (t < A.ready + 0.9) {
      // Close on her as she pulls her hair free and forges it, circling.
      const a = (t - A.rip) * 0.35;
      const off = sdU.copy(toT).applyAxisAngle(SD_UP, a).multiplyScalar(1.9);
      camAt = sdV.copy(player.pos).add(off).add(sdW.set(0, 1.35, 0));
      look = player.pos.clone().add(sdW.set(0, 1.15, 0));
      setFov(44);
    } else {
      camAt = sdV.copy(player.pos).addScaledVector(toT, -2.8).add(sdU.set(0, 1.6, 0));
      look = tt.pos.clone().add(sdU.set(0, 1.1, 0));
      setFov(50);
    }
    if (player.shake > 0) { shake(camAt, player.shake * 0.4); player.shake = Math.max(0, player.shake - dt * 1.2); }
  }
  camera.position.copy(camAt);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(look);
  if (t >= A.end) startFight();
}

// Into the clearing: the stand-in forest takes over from the real one for the fight.
function enterArena() {
  const s = showdownScene, A = SHOWDOWN.arena, k = showdownKit;
  s.inArena = true;
  k.arena.visible = true;
  k.snow.visible = true;
  scene.fog.density = A.fog;
  for (const b of s.bullets) if (b.mesh) { scene.remove(b.mesh); b.mesh = null; }
  arenaPoint(player.pos, 0.6, 0, A.start - 7);
  arenaPoint(fight.teto.pos, -0.8, 60, A.start + 8);
  player.bodyYaw = player.yaw = 0;
  world.stream(player.pos, Infinity);
  avatar.reset();
  // Her balloon stands far off at the end of the avenue, sagging, its burner still lit.
  if (!k.farBalloon) {
    k.farBalloon = balloonModel.group.clone(true);
    const glow = glowOrb(0xffa050, 6);
    glow.position.set(0, BALLOON.throatY - 0.4, 0);
    glow.visible = true;
    k.farBalloon.add(glow);
    k.farBalloon.userData.glow = glow;
    scene.add(k.farBalloon);
  }
  k.farBalloon.position.set(0, A.y, A.length / 2 + A.balloon);
  k.farBalloon.rotation.y = Math.PI * 0.85;
  k.farBalloon.scale.set(1.05, 0.88, 1.05);
  k.farBalloon.visible = true;
}

// Everything the fight throws about, put away.
function clearFightFx() {
  const k = showdownKit;
  for (const r of k.rocks) { r.mesh.visible = false; r.landed = false; }
  $('boss-warn').classList.add('hidden');
  if (fight.teto.hum) { fight.teto.hum.stop(); fight.teto.hum = null; }
  k.teto.setVisible(true);
  endLightBeam();
  for (const o of k.homing) { o.life = 0; o.sprite.visible = false; }
  fight.slamRing = null;
  clearPopTexts();
  for (const b of k.bullets) { b.life = 0; b.mesh.visible = false; }
  for (const beam of [...k.rails, k.giant, k.mikuBeam, ...k.sights]) beam.visible = false;
  for (const o of [...k.orbs, k.bigOrb, k.tipOrb, k.blast, ...k.muzzleFlash]) o.visible = false;
  for (const c of k.cracks) { c.visible = false; c.material.opacity = 0; }
  fight.beam = null;
  fight.beamT = -1;
  fight.tossT = -1;
  for (const l of k.beamLights) l.intensity = 0;
  for (const o of k.streaks) o.visible = false;
  // A thrown scythe comes straight back to her hand.
  if (fight.toss) { avatar.root.add(k.scythe); fight.toss = null; }
  fight.rage = null;
  fight.fovKick = 0;
  const F = k.finale;
  for (const m of [...F.rings, ...F.bolts, F.target]) m.visible = false;
  for (const m of [...k.mega.circles, ...k.mega.pillars, k.mega.fill]) m.visible = false;
  fight.megaGlare = 0;
  k.mega.lastGlare = 0;
  $('mega-glare').style.opacity = 0;
  document.body.classList.remove('mega-burn', 'mega-hush');
}

function leaveArena() {
  const k = showdownKit;
  k.arena.visible = false;
  k.snow.visible = false;
  if (k.farBalloon) k.farBalloon.visible = false;
  k.tetoLight.intensity = 0;
  scene.fog.density = FOG_DENSITY;
  scene.fog.color.setHex(FOG_COLOR);
  document.body.classList.remove('limp-walk');
  document.body.classList.remove('aftermath');
  $('view').classList.remove('kb');
  clearFightFx();
  for (const d of k.disks) { d.t = d.life; d.group.visible = false; }
  for (const sh of k.shocks) { sh.t = sh.life; sh.mesh.visible = false; }
  for (const strand of k.strands) strand.visible = false;
  showdown.music = false;
  Sfx.playMusic(null);
}

// The fight's effects, each frame: shockwaves, the flash, cracks fading, the heavy snow.
function updateShowdownFx(dt) {
  const k = showdownKit;
  for (const s of k.shocks) {
    if (s.t >= s.life) continue;
    s.t += dt;
    const u = Math.min(1, s.t / s.life);
    s.mesh.scale.setScalar(0.3 + s.size * (1 - (1 - u) * (1 - u)));
    s.mesh.material.opacity = (1 - u) * 0.9;
    if (u >= 1) s.mesh.visible = false;
  }
  if (k.blast.visible) {
    const b = k.blast.userData;
    b.t += dt;
    k.blast.scale.setScalar(b.size * (0.4 + b.t * 3));
    k.blast.material.opacity = Math.max(0, 1 - b.t * 3);
    if (b.t > 0.35) k.blast.visible = false;
  }
  for (const c of k.cracks) {
    if (!c.visible || !c.userData.fade) continue;
    c.material.opacity = Math.max(0, c.material.opacity - dt * c.userData.fade);
    if (c.material.opacity <= 0) { c.visible = false; c.userData.fade = 0; }
  }
  // The jet disks: falling, swelling, fading.
  for (const d of k.disks) {
    if (d.t >= d.life) continue;
    d.t += dt;
    const u = Math.min(1, d.t / d.life);
    d.group.position.addScaledVector(d.vel, dt);
    d.group.scale.setScalar(d.size * (1 + u * 3));
    for (const m of d.group.children) m.material.opacity = (1 - u) * (1 - u);
    if (u >= 1) d.group.visible = false;
  }
  fight.fovKick *= Math.exp(-dt * 6);
  // The mega laser's glare: the screen whited out while you're in it.
  if (!fight.teto || fight.teto.state !== 'megaFire') fight.megaGlare = (fight.megaGlare || 0) * Math.exp(-dt * 5);
  const glare = fight.megaGlare > 0.004 ? fight.megaGlare * (0.94 + Math.random() * 0.06) : 0;
  if (glare !== k.mega.lastGlare) {
    k.mega.lastGlare = glare;
    $('mega-glare').style.opacity = glare.toFixed(3);
    document.body.classList.toggle('mega-burn', glare > 0);
    document.body.style.setProperty('--burn', glare.toFixed(3));
  }
  for (const f of k.muzzleFlash) if (f.visible && (f.userData.t = (f.userData.t || 0) - dt) <= 0) f.visible = false;
  for (const beam of [...k.rails, k.giant, k.mikuBeam, ...k.sights]) animateBeam(beam, game.time);
  if (k.snow.visible) k.snow.userData.update(dt, game.time, camera.position);
  k.trails.update(dt);
  k.debris.update(dt);
  k.jets.update(dt);
  k.flames.update(dt);
  k.sparks.update(dt);
  k.smoke.update(dt);
}

/* ---------- The fight ---------- */
function startFight() {
  showdown.stage = 'fight';
  showdown.hp = SHOWDOWN.teto.hp;
  Object.assign(fight, { swing: null, combo: 0, comboT: 0, queued: false, tossCd: 0, tossT: -1, beamCd: 0, beamT: -1, beam: null, knocked: null, toss: null, rage: null, redFog: 0, megaCd: 10, invuln: 1.5, hitStop: 0, tauntT: 5, over: false });
  Sfx.tracks.teto.intensity = 0;
  Object.assign(fight.teto, { state: 'reposition', t: 0, dur: 1.2, whipT: SHOWDOWN.whip.every, dashT: 0, hurtT: 0 });
  showdown.hits = 0;
  showdown.knocks = 0;
  survival.health = 100;
  survival.warmth = 100;
  survival.tool = 'bow';
  showdown.music = true;
  Sfx.playMusic('teto');
  $('boss-bar').classList.remove('hidden');
  document.body.classList.add('boss-fight');
  if (activeScene) endScene();
  showdownScene = null;
  caption('');
  showScythe(true);
  renderTetoBar(true);
}

// Back to the start after a loss, when there's no save to go back to.
function restartFight() {
  const A = SHOWDOWN.arena;
  $('boss-fade').classList.add('on');
  setTimeout(() => {
    arenaPoint(player.pos, 0.6, 0, A.start);
    arenaPoint(fight.teto.pos, -1, 0, A.tetoStart);
    player.dodge = null;
    clearFightFx();
    startFight();
    $('hud').classList.remove('hidden');
    game.state = 'playing';
    lockPointer();
    $('boss-fade').classList.remove('on');
    tetoSays(showdownLine('retry'));
  }, 700);
}

function renderTetoBar(now = false) {
  const f = clamp(showdown.hp / SHOWDOWN.teto.hp, 0, 1);
  const bar = $('boss-bar');
  bar.querySelector('.boss-fill').style.width = `${f * 100}%`;
  const lag = bar.querySelector('.boss-lag');
  if (now) lag.style.width = `${f * 100}%`;
  else setTimeout(() => { lag.style.width = `${clamp(showdown.hp / SHOWDOWN.teto.hp, 0, 1) * 100}%`; }, 450);
}

function damageTeto(amount, heavy = false, quiet = false) {
  const t = fight.teto;
  if (showdown.stage !== 'fight') return;
  const mult = t.state === 'cool' || t.state === 'stun' ? SHOWDOWN.scythe.open : 1;
  const stageBefore = fightStage();
  showdown.hp = Math.max(0, showdown.hp - amount * mult);
  if (!quiet) popText(tetoChest(sdV).add(sdU.set((Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.4, 0)), String(Math.round(amount * mult)), mult > 1 ? 'dmg crit' : heavy ? 'dmg big' : 'dmg');
  t.flash = 0.12;
  t.hurtT = 0.25;
  Sfx.swordHit();
  burst(tetoChest(sdV), 0x9fe6ff, 16, 4);
  showdownKit.sparks.emit(sdV, sdW.set(0, 1, 0), { life: 0.3, size: 0.5, grow: 2, alpha: 0.9 });
  for (let i = 0; i < 8; i++) showdownKit.flames.emit(sdV, sdW.set((Math.random() - 0.5) * 5, Math.random() * 3, (Math.random() - 0.5) * 5), { life: 0.35, size: 0.3, grow: 1.5, alpha: 0.9 });
  // A beat of hit-stop, longer on the big ones.
  fight.hitStop = heavy ? 0.12 : 0.05;
  player.shake = Math.max(player.shake, heavy ? 0.25 : 0.08);
  renderTetoBar();
  if (Math.random() < 0.18) tetoSays(showdownLine('hurt'), 1.2);
  if (fightStage() > stageBefore) {
    $('boss-bar').classList.remove('stage-up');
    void $('boss-bar').offsetWidth;
    $('boss-bar').classList.add('stage-up');
    if (!fight.knocked) startRage(fightStage());
  }
  if (showdown.hp <= SHOWDOWN.teto.hp * SHOWDOWN.finaleAt) startFinale();
}

// Something of Teto's struck Miku.
function hitMiku(amount) {
  if (fight.invuln > 0 || fight.knocked || showdown.stage !== 'fight' || fight.over) return;
  if (player.dodge && player.dodge.t < 0.5) return;
  showdown.hits++;
  hurtPlayer(amount, 'teto');
  fight.invuln = 0.18;
  player.shake = Math.max(player.shake, 0.12);
  if (showdown.hits >= SHOWDOWN.knock.hits && survival.health > 0) knockDown();
}

function knockDown() {
  const K = SHOWDOWN.knock, k = showdownKit;
  if (fight.teto.state.startsWith('mega')) endMega();
  k.teto.setVisible(true);
  k.finale.target.visible = false;
  showdown.hits = 0;
  fight.swing = null;
  fight.tossT = -1;
  endLightBeam();
  player.dodge = null;
  fight.knocked = { t: 0, need: Math.min(K.most, Math.round(K.need + K.grow * showdown.knocks)), presses: 0, phase: 'down', at: player.pos.clone(), roll: 0 };
  Object.assign(fight.teto, { state: 'rail', t: 0, dur: K.charge });
  for (const b of k.bullets) { b.life = 0; b.mesh.visible = false; }
  // The ground cracks open under her as she charges, and where she's aiming.
  const [under, at] = k.cracks;
  under.position.copy(fight.teto.pos).setY(SHOWDOWN.arena.y + 0.03);
  at.position.copy(fight.knocked.at).setY(SHOWDOWN.arena.y + 0.03);
  for (const c of [under, at]) { c.visible = true; c.material.opacity = 0; c.userData.fade = 0; c.rotation.y = Math.random() * 6.28; }
  Sfx.railCharge();
  tetoSays(showdownLine('knock'), 1.6);
  $('boss-hint').classList.remove('hidden');
  $('boss-hint').querySelector('p').textContent = `Mash SPACE to roll clear! (${fight.knocked.need})`;
}

// Space while she's down.
function showdownMash() {
  const kn = fight.knocked;
  if (!kn) return false;
  if (kn.phase === 'down') {
    kn.presses++;
    $('boss-hint').querySelector('.boss-mash i').style.width = `${Math.min(1, kn.presses / kn.need) * 100}%`;
    if (kn.presses >= kn.need) kn.phase = 'clear';
  }
  return true;
}

function updateKnocked(dt) {
  const kn = fight.knocked, k = showdownKit, K = SHOWDOWN.knock;
  kn.t += dt;
  const t = fight.teto;
  if (kn.phase === 'clear' && !kn.rolled) {
    // Rolled out of the way: away to the side.
    kn.rolled = true;
    const side = sdV.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw)).multiplyScalar(Math.random() < 0.5 ? 2.4 : -2.4);
    kn.rollTo = kn.at.clone().add(side);
    burst(player.pos.clone().add(sdU.set(0, 0.2, 0)), 0xf2f5ff, 16, 3);
    Sfx.thud();
  }
  if (kn.rollTo) {
    kn.roll = Math.min(1, kn.roll + dt * 5);
    player.pos.lerpVectors(kn.at, kn.rollTo, smooth(kn.roll));
    showdownClamp(player.pos);
  }
  // The charge: two orbs swelling at her drill tips, light pouring into them, the snow
  // splitting under her and lifting in chunks.
  const charge = clamp(kn.t / K.charge, 0, 1);
  for (let i = 0; i < 2; i++) {
    tetoMuzzle(i, sdV);
    k.orbs[i].position.copy(sdV);
    k.orbs[i].scale.setScalar(0.15 + charge * 1.1 + Math.random() * 0.08);
    k.orbs[i].visible = kn.t < K.charge + 0.5;
    if (kn.t < K.charge) {
      const from = sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.6);
      k.trails.emit(sdU.copy(sdV).add(from), from.multiplyScalar(-1 / 0.25), { life: 0.25, size: 0.14, grow: 0.3, alpha: 0.9 });
    }
  }
  if (kn.t < K.charge) {
    const [under, at] = k.cracks;
    under.scale.setScalar(1 + charge * 6);
    under.material.opacity = charge * (0.7 + Math.random() * 0.3);
    at.scale.setScalar(1 + charge * 3.5);
    at.material.opacity = charge * (0.6 + Math.random() * 0.4);
    k.tetoLight.intensity = 3 + charge * 9;
    if (Math.random() < dt * 30) k.debris.emit(sdV.copy(t.pos).add(sdU.set((Math.random() - 0.5) * 5 * charge, 0.1, (Math.random() - 0.5) * 5 * charge)), sdW.set(0, 1 + Math.random() * 2, 0), { life: 1.2, size: 0.3, grow: 1, alpha: 0.8 });
    player.shake = Math.max(player.shake, charge * 0.12);
  }
  if (kn.t >= K.charge && !kn.fired) {
    kn.fired = true;
    Sfx.railFire();
    impact('white', 120);
    const target = kn.at.clone().add(sdU.set(0, 0.35, 0));
    for (let i = 0; i < 2; i++) { tetoMuzzle(i, sdV); aimBeam(k.rails[i], sdV, target, 1); }
    explode(target, 0xff4d86, 0.75);
    for (const c of k.cracks.slice(0, 2)) { c.material.opacity = 1; c.userData.fade = 0.35; }
    if (kn.phase !== 'clear') {
      hurtPlayer(K.laser + K.laserGrow * showdown.knocks, 'teto');
      player.shake = 0.8;
    } else {
      tetoSays(showdownLine('dodged'), 1.4);
    }
  }
  if (kn.fired) {
    const fade = 1 - clamp((kn.t - K.charge - 0.25) / 0.45, 0, 1);
    for (const beam of k.rails) { beam.visible = fade > 0; beam.scale.x = beam.scale.y = Math.max(0.001, fade * (1 + Math.random() * 0.15)); }
  }
  if (kn.t >= K.charge + 1.1) {
    fight.knocked = null;
    showdown.knocks++;
    fight.invuln = 1.4;
    for (const beam of k.rails) beam.visible = false;
    $('boss-hint').classList.add('hidden');
    $('boss-hint').querySelector('.boss-mash i').style.width = '0%';
    Object.assign(t, { state: 'cool', t: 0, dur: 1.6 });
  }
}

// Each frame of the fight, for Teto.
// Between stages she rages: up on her jets, screaming, the sky going red, a blast that throws
// Miku back across the snow. And the music climbs with her.
function startRage(stage) {
  const k = showdownKit;
  if (fight.teto.state.startsWith('mega')) endMega();
  k.teto.setVisible(true);
  k.finale.target.visible = false;
  fight.rage = { t: 0, stage, pulse: 0, fog: fight.redFog || 0 };
  Object.assign(fight.teto, { state: 'rage', t: 0, dashing: null });
  for (const b of k.bullets) { b.life = 0; b.mesh.visible = false; }
  for (const line of k.sights) line.visible = false;
  Sfx.stinger();
  Sfx.tetoLaugh();
  tetoSays(SHOWDOWN.rage[stage].line, 2.6);
  Sfx.tracks.teto.intensity = stage;
  fight.fovKick = -6;
}

function updateRage(dt) {
  const r = fight.rage, t = fight.teto, k = showdownKit, R = SHOWDOWN.rage[r.stage];
  r.t += dt;
  t.yaw = Math.atan2(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
  const lift = smooth(clamp(r.t / 0.6, 0, 1)) * 2.2 * (1 - smooth(clamp((r.t - 2.1) / 0.4, 0, 1)));
  if (lift > 0.05) tetoJets(0.8);
  fight.redFog = lerp(r.fog, R.fog, smooth(clamp(r.t / 1.5, 0, 1)));
  k.tetoLight.intensity = 7 + Math.sin(r.t * 30) * 3;
  // The blast.
  if (r.t > 0.75 && !r.blasted) {
    r.blasted = true;
    explode(tetoChest(sdV).clone().add(sdU.set(0, lift, 0)), 0xff2d55, 1.3);
    Sfx.quake();
    r.push = sdW.set(player.pos.x - t.pos.x, 0, player.pos.z - t.pos.z).normalize().clone();
    player.dodge = null;
  }
  if (r.push && r.t < 1.2) { player.pos.addScaledVector(r.push, 11 * (1.2 - r.t) * dt); showdownClamp(player.pos); }
  // Rings of red light pulsing out under her.
  r.pulse -= dt;
  if (r.t > 0.75 && r.t < 2.1 && r.pulse <= 0) { r.pulse = 0.3; shockwave(t.pos, 9, 0xff2d55, 0.7); }
  player.shake = Math.max(player.shake, r.t < 2 ? 0.1 : 0);
  poseTeto(dt, 'rail', mikuChest(sdU.clone()), { lift });
  if (r.t >= 2.6) { fight.rage = null; Object.assign(t, { state: 'reposition', t: 0, dur: 0.5 }); }
}

function updateTetoFight(dt) {
  const t = fight.teto, G = SHOWDOWN.gatling, k = showdownKit, st = fightStage();
  // The sky reddens as she gets angrier.
  scene.fog.color.setHex(FOG_COLOR).lerp(SD_RED, fight.redFog || 0);
  if (fight.rage) { updateRage(dt); return; }
  t.t += dt;
  t.flash = Math.max(0, t.flash - dt);
  t.whipT -= dt;
  t.dashT -= dt;
  fight.megaCd = (fight.megaCd || 0) - dt;
  const toMiku = sdV.set(player.pos.x - t.pos.x, 0, player.pos.z - t.pos.z);
  const dist = toMiku.length();
  const faceMiku = (rate) => {
    const want = Math.atan2(toMiku.x, toMiku.z);
    const turn = Math.atan2(Math.sin(want - t.yaw), Math.cos(want - t.yaw));
    t.yaw += turn * (1 - Math.exp(-rate * dt));
  };
  let mode = 'idle', speed = 0, look = mikuChest(sdU.clone());
  for (const line of k.sights) line.visible = false;
  k.tetoLight.intensity = t.state === 'fire' ? 4 + Math.random() * 5 : t.state === 'rail' ? k.tetoLight.intensity : 2.5 + Math.sin(game.time * 4) * 0.5;

  // Too close while she's free, she whips her hair round, or dashes clear.
  if ((t.state === 'reposition' || t.state === 'aim' || t.state === 'fire' || t.state === 'orbs') && dist < SHOWDOWN.whip.range) {
    if (t.whipT <= 0) Object.assign(t, { state: 'whip', t: 0, dur: SHOWDOWN.whip.windup + 0.3, whipped: false });
    else if (t.dashT <= 0 && t.state !== 'fire') dashAway(t);
  }

  if (t.state === 'reposition') {
    // To a spot at her favourite range, off to one side.
    if (t.t < dt * 1.5) {
      const want = clamp(lerp(SHOWDOWN.teto.keep[0], SHOWDOWN.teto.keep[1], Math.random()), 6, 14);
      const a = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z) + (Math.random() - 0.5) * 1.6;
      t.target.set(player.pos.x + Math.sin(a) * want, t.pos.y, player.pos.z + Math.cos(a) * want);
      showdownClamp(t.target, 0.8);
    }
    const d = sdW.subVectors(t.target, t.pos).setY(0);
    if (d.length() > 0.3) {
      const step = Math.min(d.length(), SHOWDOWN.teto.walk * dt);
      t.pos.addScaledVector(d.normalize(), step);
      speed = SHOWDOWN.teto.walk;
    }
    faceMiku(6);
    if (t.t >= t.dur) startTetoMove(pickTetoMove(st), st);
  } else if (t.state === 'aim') {
    // Pointing, the sights from her drills locking on.
    faceMiku(8);
    mode = 'point';
    t.aimDir.copy(mikuChest(sdW)).sub(tetoMuzzle(0, sdU)).normalize();
    for (let i = 0; i < 2; i++) {
      tetoMuzzle(i, sdU);
      const far = sdW.copy(sdU).addScaledVector(t.aimDir, 40);
      aimBeam(k.sights[i], sdU, far, 0.6 + Math.abs(Math.sin(t.t * 22)) * 0.8);
    }
    if (t.t >= t.dur) { Object.assign(t, { state: 'fire', t: 0, dur: G.fire[st], shotT: 0 }); }
  } else if (t.state === 'fire') {
    // The gatling: her hair rattles out rounds at where she's pointing, turning after Miku
    // slower than Miku can run.
    mode = 'point';
    const want = mikuChest(sdW).sub(tetoMuzzle(0, sdU)).normalize();
    const angle = t.aimDir.angleTo(want);
    if (angle > 1e-4) {
      const step = Math.min(1, (G.turn[st] * dt) / angle);
      t.aimDir.lerp(want, step).normalize();
    }
    t.yaw = Math.atan2(t.aimDir.x, t.aimDir.z);
    look = sdU.copy(t.pos).add(sdW.copy(t.aimDir).multiplyScalar(10)).add(SD_UP);
    t.shotT -= dt;
    while (t.shotT <= 0) {
      t.shotT += 1 / G.rate[st];
      t.muzzle = 1 - t.muzzle;
      fireBullet(t.muzzle, t.aimDir, st === 2 ? Math.sin(t.t * 6) * 0.08 : 0);
    }
    if (t.t >= t.dur) Object.assign(t, { state: 'cool', t: 0, dur: G.cool[st] });
  } else if (t.state === 'cool') {
    // Venting: her drills smoke, she's winded, and every blow lands harder.
    mode = 'pant';
    if (Math.random() < dt * 14) { tetoMuzzle(Math.random() < 0.5 ? 0 : 1, sdW); k.smoke.emit(sdW, sdU.set(0, 0.7, 0), { life: 1.2, size: 0.2, grow: 3, alpha: 0.55 }); }
    if (t.t >= t.dur) Object.assign(t, { state: 'reposition', t: 0, dur: 0.7 + Math.random() * 0.6 });
  } else if (t.state === 'whip') {
    // A spinning lash of hair all round her.
    const W = SHOWDOWN.whip;
    mode = 'whip';
    const u = clamp(t.t / W.windup, 0, 1);
    t.yaw += dt * (u < 1 ? 2 : 22);
    if (u < 1 && Math.random() < dt * 20) burst(tetoChest(sdW), 0xff86b0, 2, 1);
    if (u >= 1 && !t.whipped) {
      t.whipped = true;
      Sfx.slash(2);
      burst(tetoChest(sdW), 0xff86b0, 20, 4);
      shockwave(t.pos, W.range + 0.5, 0xff4d86, 0.35);
      if (dist < W.range + 0.3) hitMiku(W.damage);
    }
    if (t.t >= t.dur) { t.whipT = W.every; Object.assign(t, { state: 'reposition', t: 0, dur: 0.6 }); }
  } else if (t.state === 'blink' || t.state === 'blinkStrike') {
    const out = updateBlink(dt, t, dist);
    mode = out.mode;
  } else if (t.state === 'sweep' || t.state === 'sweepFire') {
    mode = updateSweep(dt, t, toMiku).mode;
  } else if (t.state === 'megaLeap' || t.state === 'megaSlam' || t.state === 'megaCharge' || t.state === 'megaFire') {
    mode = updateMega(dt, t).mode;
    look = new THREE.Vector3(t.pos.x, t.pos.y + 1, t.pos.z - 10);
  } else if (t.state === 'diveAim' || t.state === 'dive' || t.state === 'stun' || t.state === 'orbs' || t.state === 'slamUp' || t.state === 'slamDown' || t.state === 'spiral') {
    const out = updateTetoMove(dt, t, st, toMiku, dist, faceMiku);
    if (out.mode) mode = out.mode;
    if (out.look) look = out.look;
  } else if (t.state === 'rail') {
    mode = 'rail';
    faceMiku(4);
    look = fight.knocked ? fight.knocked.at.clone() : look;
  }
  // Dashing: a quick slide, kicking up snow.
  if (t.dashing) {
    t.dashing.t += dt;
    const u = Math.min(1, t.dashing.t / 0.28);
    t.pos.lerpVectors(t.dashing.from, t.dashing.to, smooth(u));
    k.debris.emit(t.pos.clone().add(sdU.set(0, 0.2, 0)), sdW.set(0, 1.5, 0), { life: 0.6, size: 0.5, grow: 2, alpha: 0.6, fall: 9 });
    if (u >= 1) t.dashing = null;
  }
  t.pos.y = SHOWDOWN.arena.y;
  showdownClamp(t.pos, 0.8);
  // Off the ground for some moves, settling back down after.
  if (!t.airborne) t.lift = (t.lift || 0) * Math.exp(-dt * 5);
  t.airborne = false;
  poseTeto(dt, mode, look, { speed, lift: t.lift || 0, crouch: t.crouch || 0, u: t.state === 'whip' ? clamp(t.t / SHOWDOWN.whip.windup, 0, 1) : 0 });
  t.crouch = 0;
  updateSlamRing(dt);

  fight.tauntT -= dt;
  if (fight.tauntT <= 0) { fight.tauntT = 7 + Math.random() * 5; tetoSays(showdownLine('taunts'), 1.8); }
}

/* ---------- Teto's other moves ---------- */
// Her next attack after moving into position: more of them open to her the angrier she gets,
// and never the same one twice running.
function pickTetoMove(st) {
  const pool = [['aim', 4], ['diveAim', 2.5], ['orbs', 2], ['blink', 2]];
  if (st >= 1) pool.push(['slamUp', 2.5], ['sweep', 2]);
  if (st >= 1 && (fight.megaCd || 0) <= 0) pool.push(['megaLeap', 5]);
  if (st >= 2) pool.push(['spiral', 2.2]);
  const options = pool.filter(([name]) => name !== fight.teto.last);
  let r = Math.random() * options.reduce((sum, [, w]) => sum + w, 0);
  for (const [name, w] of options) { r -= w; if (r <= 0) return name; }
  return 'aim';
}

function startTetoMove(name, st) {
  const t = fight.teto, M = SHOWDOWN.moves;
  t.last = name;
  const dur = { aim: SHOWDOWN.gatling.aim[st], diveAim: M.dive.aim[st], orbs: 1, slamUp: M.slam.rise, spiral: M.spiral.dur, blink: M.blink.tell, sweep: M.sweep.tell, megaLeap: M.mega.leap }[name];
  Object.assign(t, { state: name, t: 0, dur, launched: 0, shotT: 0, diveHit: false, recharged: false, diveDir: t.diveDir || new THREE.Vector3(), slamAt: t.slamAt || new THREE.Vector3(), blinkTo: t.blinkTo || new THREE.Vector3() });
  if (name === 'megaLeap') fight.megaFog = fight.redFog || 0;
  if (name === 'diveAim') Sfx.railCharge();
  if (name === 'slamUp') { Sfx.whoosh(0.9); tetoSays(['Look UP!', 'Catch!', 'From above!'][Math.floor(Math.random() * 3)], 1.4); }
  if (name === 'spiral') tetoSays('Dance for me!', 1.6);
  if (name === 'orbs') Sfx.beamCharge();
}

// One frame of whichever of those she's in. Returns her arm pose and where she's looking.
function updateTetoMove(dt, t, st, toMiku, dist, faceMiku) {
  const M = SHOWDOWN.moves, k = showdownKit, A = SHOWDOWN.arena;
  if (t.state === 'diveAim') {
    // Crouched, drills screaming, a red line drawn across the snow down the way she'll go.
    faceMiku(10);
    t.crouch = 0.5;
    if (t.t < t.dur - 0.2) t.diveDir.set(toMiku.x, 0, toMiku.z).normalize();
    const from = sdU.copy(t.pos).setY(A.y + 0.06);
    aimBeam(k.sights[0], from, sdW.copy(from).addScaledVector(t.diveDir, M.dive.length), 16 + Math.abs(Math.sin(t.t * 18)) * 12);
    for (let i = 0; i < 2; i++) { tetoMuzzle(i, sdV); k.trails.emit(sdV, sdW.set((Math.random() - 0.5), 1, (Math.random() - 0.5)), { life: 0.2, size: 0.25, grow: 0.5, alpha: 1 }); }
    if (t.t >= t.dur) {
      Object.assign(t, { state: 'dive', t: 0, dur: M.dive.length / M.dive.speed });
      Sfx.whoosh(0.6);
      Sfx.railFire();
      shockwave(t.pos, 3, 0xff2d55, 0.3);
    }
    return { mode: 'rail' };
  }
  if (t.state === 'dive') {
    // Down the line like a bullet, red disks shed behind her.
    const before = t.pos.clone();
    t.pos.addScaledVector(t.diveDir, M.dive.speed * dt);
    t.yaw = Math.atan2(t.diveDir.x, t.diveDir.z);
    t.lift = 0.35;
    t.airborne = true;
    emitJetDisk(sdV.copy(t.pos).add(sdU.set(0, 1.1, 0)), sdW.copy(t.diveDir).multiplyScalar(-6), 0.35, 0.35);
    // A red ghost of her strung out along the line behind.
    for (const part of [k.teto.hips, k.teto.chest, k.teto.head]) k.jets.emit(part.getWorldPosition(sdV), sdW.set(0, 0, 0), { life: 0.35, size: 0.7, grow: 0.3, alpha: 0.45 });
    k.debris.emit(t.pos.clone().add(sdU.set(0, 0.1, 0)), sdW.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3), { life: 0.6, size: 0.5, grow: 2, alpha: 0.7, fall: 9 });
    if (!t.diveHit && segmentDistance(before, t.pos, sdU.copy(player.pos), sdX.copy(player.pos).add(SD_UP)) < 1.1) {
      t.diveHit = true;
      if (dodging()) perfectDodge();
      else { hitMiku(M.dive.damage); player.shake = 0.5; }
    }
    const clamped = t.pos.clone();
    showdownClamp(clamped, 0.8);
    if (t.t >= t.dur || clamped.distanceToSquared(t.pos) > 0.01) {
      Object.assign(t, { state: 'stun', t: 0, dur: M.dive.stun });
      Sfx.thud();
      Sfx.snowSlam();
      burst(t.pos.clone().add(sdU.set(0, 0.3, 0)), 0xf2f5ff, 24, 5);
      tetoSays(['Ugh... dizzy...', 'Where did you GO?!', 'Hold... still...'][Math.floor(Math.random() * 3)], 1.4);
    }
    return { mode: 'rail' };
  }
  if (t.state === 'stun') {
    // Reeling where she stopped: wide open, and every hit lands harder.
    t.yaw += Math.sin(t.t * 7) * dt * 2;
    const head = sdV.copy(t.pos).add(sdU.set(0, 1.95, 0));
    for (let i = 0; i < 2; i++) {
      const a = t.t * 8 + i * Math.PI;
      k.sparks.emit(sdW.copy(head).add(sdU.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35)), sdU.set(0, 0, 0), { life: 0.25, size: 0.12, grow: 0.2, alpha: 1 });
    }
    if (t.t >= t.dur) Object.assign(t, { state: 'reposition', t: 0, dur: 0.6 });
    return { mode: 'pant' };
  }
  if (t.state === 'orbs') {
    // Arms flung up, homing lights thrown out of her drills one after another.
    faceMiku(6);
    const count = M.orbs.count[st];
    while (t.launched < Math.min(count, Math.ceil(count * t.t / 0.6))) launchOrb(t.launched++);
    if (t.t >= t.dur) Object.assign(t, { state: 'cool', t: 0, dur: 1 });
    return { mode: 'rail' };
  }
  if (t.state === 'slamUp') {
    // Up on her jets, drifting over Miku, a red ring on the snow where she'll come down.
    const u = t.t / t.dur;
    t.lift = smooth(Math.min(1, u * 1.3)) * M.slam.height;
    t.airborne = true;
    tetoJets(1);
    if (t.t < t.dur - 0.25) t.slamAt.copy(player.pos);
    t.pos.x += (t.slamAt.x - t.pos.x) * Math.min(1, dt * 4);
    t.pos.z += (t.slamAt.z - t.pos.z) * Math.min(1, dt * 4);
    const ring = k.finale.target;
    ring.visible = true;
    ring.position.copy(t.slamAt).setY(A.y + 0.05);
    ring.scale.setScalar(lerp(4, 1.6, u));
    ring.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(t.t * 20));
    if (t.t >= t.dur) Object.assign(t, { state: 'slamDown', t: 0, dur: M.slam.fall, from: t.lift });
    return { mode: 'fly' };
  }
  if (t.state === 'slamDown') {
    const u = Math.min(1, t.t / t.dur);
    t.lift = t.from * (1 - u * u);
    t.airborne = true;
    if (u >= 1) {
      // Down. A crater, and a ring of force rolling out over the snow.
      t.lift = 0;
      k.finale.target.visible = false;
      explode(t.pos.clone().add(sdU.set(0, 0.3, 0)), 0xff2d55, 1.2);
      Sfx.quake();
      shockwave(t.pos, M.slam.ring, 0xff4d86, M.slam.ringLife);
      const crack = k.cracks[0];
      crack.position.copy(t.pos).setY(A.y + 0.03);
      crack.scale.setScalar(6);
      crack.material.opacity = 1;
      crack.visible = true;
      crack.userData.fade = 0.4;
      fight.slamRing = { at: t.pos.clone(), t: 0, hit: false };
      if (dist < 2) { if (dodging()) perfectDodge(); else hitMiku(M.slam.damage); }
      Object.assign(t, { state: 'cool', t: 0, dur: 1.3 });
    }
    return { mode: 'fly' };
  }
  if (t.state === 'spiral') {
    // Up off the ground and spinning, spraying slow rounds out every way in turning arms.
    t.lift = smooth(Math.min(1, t.t / 0.4)) * 1.6;
    t.airborne = true;
    t.yaw += dt * 6;
    tetoJets(0.5);
    t.shotT -= dt;
    const arms = M.spiral.arms[st];
    while (t.shotT <= 0) {
      t.shotT += M.spiral.every;
      for (let i = 0; i < arms; i++) {
        const a = t.t * 2.4 + (i / arms) * Math.PI * 2;
        fireBullet(i % 2, sdW.set(Math.sin(a), -0.03, Math.cos(a)), 0, M.spiral.speed);
      }
    }
    if (t.t >= t.dur) Object.assign(t, { state: 'cool', t: 0, dur: 1.6 });
    return { mode: 'fly' };
  }
  return {};
}

// The ring of force from the slam, rolling outwards: it catches her unless she rolls through it.
function updateSlamRing(dt) {
  const r = fight.slamRing, M = SHOWDOWN.moves.slam;
  if (!r) return;
  r.t += dt;
  const u = Math.min(1, r.t / M.ringLife);
  // Matches the shockwave it's drawn with (updateShowdownFx).
  const radius = 0.9 * (0.3 + M.ring * (1 - (1 - u) * (1 - u)));
  const d = Math.hypot(player.pos.x - r.at.x, player.pos.z - r.at.z);
  if (!r.hit && Math.abs(d - radius) < 0.6) {
    r.hit = true;
    if (dodging()) perfectDodge();
    else hitMiku(M.ringDamage);
  }
  if (u >= 1) fight.slamRing = null;
}

// Homing orbs: thrown up and out, then turning to fall on her.
function launchOrb(i) {
  const k = showdownKit, M = SHOWDOWN.moves.orbs;
  const o = k.homing.find((x) => x.life <= 0);
  if (!o) return;
  tetoMuzzle(i % 2, o.pos);
  const a = fight.teto.yaw + (i / Math.max(1, M.count[2] - 1) - 0.5) * 2.4;
  o.vel.set(Math.sin(a) * 5, 7 + Math.random() * 3, Math.cos(a) * 5);
  o.life = M.life;
  o.age = 0;
  o.sprite.visible = true;
  Sfx.gatling();
}

function updateOrbs(dt) {
  const k = showdownKit, M = SHOWDOWN.moves.orbs;
  for (const o of k.homing) {
    if (o.life <= 0) continue;
    o.life -= dt;
    o.age += dt;
    // After the throw, they turn and come for her.
    if (o.age > 0.45) {
      const want = mikuChest(sdV).sub(o.pos).normalize().multiplyScalar(M.speed);
      o.vel.lerp(want, 1 - Math.exp(-M.turn * dt));
    } else {
      o.vel.y -= 12 * dt;
    }
    o.pos.addScaledVector(o.vel, dt);
    o.sprite.position.copy(o.pos);
    o.sprite.scale.setScalar(0.85 + Math.sin(o.age * 20) * 0.15);
    k.trails.emit(o.pos, sdU.set(0, 0, 0), { life: 0.3, size: 0.25, grow: 0.4, alpha: 0.9 });
    let pop = o.life <= 0 || (o.age > 0.6 && o.pos.y < SHOWDOWN.arena.y + 0.15);
    if (o.pos.distanceTo(mikuChest(sdV)) < 0.8 && showdown.stage === 'fight') {
      if (dodging()) perfectDodge();
      else hitMiku(M.damage);
      pop = true;
    }
    if (pop) popOrb(o, 0xff4d86);
  }
}

function popOrb(o, color) {
  o.life = 0;
  o.sprite.visible = false;
  burst(o.pos.clone(), color, 22, 6);
  shockwave(o.pos, 3.5, color, 0.35);
  const fire = color === 0x7fc4ff ? showdownKit.flames : showdownKit.jets;
  for (let i = 0; i < 10; i++) fire.emit(o.pos, sdW.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(4), { life: 0.35, size: 0.4, grow: 1.5, alpha: 0.9 });
  Sfx.burst(0.25, 900, 0.8, 0.35);
}

/* ---------- Her biggest moves ---------- */
// The blink: she vanishes in a burst of red light, a ring flares on the snow at Miku's back,
// and she's there, hair already whipping round.
function updateBlink(dt, t, dist) {
  const M = SHOWDOWN.moves.blink, k = showdownKit, A = SHOWDOWN.arena;
  if (t.state === 'blink') {
    if (t.t < dt * 1.5) {
      for (let i = 0; i < 16; i++) emitJetDisk(sdV.copy(t.pos).add(sdU.set((Math.random() - 0.5) * 0.8, Math.random() * 2, (Math.random() - 0.5) * 0.8)), sdW.set((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4), 0.25, 0.5);
      k.teto.setVisible(false);
      Sfx.whoosh(0.4);
    }
    // Where she'll come out: right behind Miku, wherever Miku's facing.
    if (t.t < t.dur - 0.15) {
      t.blinkTo.set(player.pos.x - Math.sin(player.bodyYaw) * 1.7, A.y, player.pos.z - Math.cos(player.bodyYaw) * 1.7);
      showdownClamp(t.blinkTo, 0.8);
    }
    const ring = k.finale.target;
    ring.visible = true;
    ring.position.copy(t.blinkTo).setY(A.y + 0.05);
    ring.scale.setScalar(lerp(2.6, 0.9, t.t / t.dur));
    ring.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t.t * 24));
    if (t.t >= t.dur) {
      ring.visible = false;
      t.pos.copy(t.blinkTo);
      t.yaw = Math.atan2(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
      k.teto.setVisible(true);
      for (let i = 0; i < 16; i++) emitJetDisk(sdV.copy(t.pos).add(sdU.set((Math.random() - 0.5) * 0.8, Math.random() * 2, (Math.random() - 0.5) * 0.8)), sdW.set((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4), 0.25, 0.5);
      shockwave(t.pos, 3, 0xff2d55, 0.3);
      Sfx.railFire();
      Object.assign(t, { state: 'blinkStrike', t: 0, dur: M.windup + 0.35, whipped: false });
    }
    return { mode: 'idle' };
  }
  // The strike: a full spin of hair.
  const u = clamp(t.t / M.windup, 0, 1);
  t.yaw += dt * (u < 1 ? 3 : 24);
  if (u >= 1 && !t.whipped) {
    t.whipped = true;
    Sfx.slash(2);
    burst(tetoChest(new THREE.Vector3()), 0xff86b0, 24, 5);
    shockwave(t.pos, M.range + 0.5, 0xff4d86, 0.35);
    if (dist < M.range) { if (dodging()) perfectDodge(); else hitMiku(M.damage); }
  }
  if (t.t >= t.dur) Object.assign(t, { state: 'reposition', t: 0, dur: 0.5 });
  return { mode: 'whip' };
}

// The sweep: both drills firing one long beam that she drags right across the clearing at
// chest height, a red sight flicking across first to show which way.
function updateSweep(dt, t, toMiku) {
  const M = SHOWDOWN.moves.sweep, k = showdownKit, A = SHOWDOWN.arena;
  t.lift = 1;
  t.airborne = true;
  tetoJets(0.4);
  const base = Math.atan2(toMiku.x, toMiku.z);
  if (t.state === 'sweep') {
    // The tell: her sight racing across the arc she's about to burn.
    if (t.t < dt * 1.5) { t.sweepBase = base; t.sweepSign = Math.random() < 0.5 ? 1 : -1; Sfx.railCharge(); }
    const a = t.sweepBase + t.sweepSign * (Math.sin((t.t / t.dur) * Math.PI * 2) * M.arc / 2);
    t.yaw = a;
    tetoMuzzle(0, sdU);
    aimBeam(k.sights[0], sdU, sdW.copy(sdU).add(sdX.set(Math.sin(a) * M.length, -1, Math.cos(a) * M.length)), 3);
    if (t.t >= t.dur) { Object.assign(t, { state: 'sweepFire', t: 0, dur: M.dur, hit: false }); Sfx.railFire(); fight.fovKick = -4; }
    return { mode: 'rail' };
  }
  const u = t.t / t.dur;
  const a = t.sweepBase + t.sweepSign * lerp(-M.arc / 2, M.arc / 2, u);
  t.yaw = a;
  for (let i = 0; i < 2; i++) {
    const from = tetoMuzzle(i, new THREE.Vector3());
    const to = from.clone().add(sdX.set(Math.sin(a) * M.length, A.y + 1.05 - from.y, Math.cos(a) * M.length));
    aimBeam(k.rails[i], from, to, 1.3 * (0.9 + Math.random() * 0.2));
    if (!t.hit && segmentDistance(from, to, sdU.copy(player.pos).add(sdY.set(0, 0.3, 0)), player.pos.clone().add(sdY.set(0, 1.5, 0))) < 0.45) {
      t.hit = true;
      if (dodging()) perfectDodge();
      else { hitMiku(M.damage); player.shake = 0.4; }
    }
    // Scorching the snow under it.
    if (Math.random() < 0.5) k.jets.emit(sdV.copy(to).lerp(from, Math.random()).setY(A.y + 0.2), sdW.set(0, 2, 0), { life: 0.4, size: 0.5, grow: 1.5, alpha: 0.8 });
  }
  player.shake = Math.max(player.shake, 0.06);
  if (t.t >= t.dur) {
    for (const beam of k.rails) beam.visible = false;
    Object.assign(t, { state: 'cool', t: 0, dur: 1.2 });
  }
  return { mode: 'rail' };
}

// The mega laser. She leaps to the far end of the clearing, in front of the balloon, and
// slams down so hard that boulders are thrown up out of the ground all down the clearing and
// pillars of light burst out of the cracks. Then she rises, and charges: a summoning circle
// burning into the snow under her, a barrel of circles wheeling open in front of her, the
// snow and the light of the whole clearing sucked into the orb at her drills, lightning
// lashing out of it, the sky going red, her heart and yours pounding faster. A breath of
// silence, everything going dark. Then a wall of light the full width and height of the
// clearing, straight down it. Out in the open you can't see a thing, and it burns. The
// boulders are the only cover, and the beam boils them away as it goes: by the time it ends,
// there's nothing left of them.
function updateMega(dt, t) {
  const M = SHOWDOWN.moves.mega, k = showdownKit, A = SHOWDOWN.arena, K = k.finale, G = k.mega;
  const front = new THREE.Vector3(0, A.y, A.length / 2 - 1.5);
  if (t.state === 'megaLeap') {
    if (t.t < dt * 1.5) { t.leapFrom = t.pos.clone(); Sfx.whoosh(1); Sfx.stinger(); tetoSays('Let\'s see you dodge THIS!', 2); fight.fovKick = -5; }
    const u = clamp(t.t / t.dur, 0, 1);
    t.pos.lerpVectors(t.leapFrom, front, smooth(u));
    t.lift = Math.sin(u * Math.PI) * 12;
    t.airborne = true;
    t.yaw = Math.PI;
    tetoJets(1.6);
    // A smear of red ghosts behind her through the air.
    for (const bone of [k.teto.hips, k.teto.chest, k.teto.head]) k.jets.emit(bone.getWorldPosition(sdV), sdW.set(0, 0, 0), { life: 0.5, size: 0.9, grow: 0.4, alpha: 0.7 });
    if (t.t >= t.dur) { Object.assign(t, { state: 'megaSlam', t: 0, dur: M.slam }); megaSlam(t); }
    return { mode: 'fly' };
  }
  t.pos.copy(front);
  t.yaw = Math.PI;
  if (t.state === 'megaSlam') {
    t.crouch = 1 - smooth(clamp(t.t / t.dur, 0, 1));
    megaPillars(t.t, 1);
    if (t.t >= t.dur) {
      Object.assign(t, { state: 'megaCharge', t: 0, dur: M.charge, beat: 0, hushed: false, recharged: false });
      Sfx.railCharge();
      Sfx.stinger();
      Sfx.glide([[0, 60], [M.charge * 0.85, 520], [M.charge, 40]], 0.08, 'sawtooth', 7);
      t.hum = Sfx.loop({ noise: 0.6, filter: 300, hum: 1, humFreq: 41 });
      t.hum.set(0.5, 1);
      tetoSays('Every last drop of it... for YOU!', 2.4);
    }
    return { mode: 'idle' };
  }
  t.airborne = true;
  if (t.state === 'megaCharge') {
    const u = smooth(t.t / t.dur), left = t.dur - t.t;
    t.lift = 1.4 + u * 2.2 + Math.sin(game.time * 3) * 0.1;
    tetoJets(1 + u);
    const orb = megaOrb();
    const hush = left < 0.55;
    // The orb: swelling, boiling, and in the last breath crushed down small and white-hot.
    k.bigOrb.position.copy(orb);
    k.bigOrb.scale.setScalar(hush ? lerp(1.5, 7.5, left / 0.55) * (0.8 + Math.random() * 0.5) : 0.5 + u * 7.5 + Math.random() * (0.4 + u));
    k.bigOrb.visible = true;
    K.rings.forEach((ring, i) => {
      ring.visible = true;
      ring.position.copy(orb);
      ring.rotation.set(game.time * (1.5 + i) * (1 + u * 2), game.time * (2.2 - i * 0.6) * (1 + u * 2), i * 1.1);
      ring.scale.setScalar((0.3 + u * (1.6 - i * 0.2)) * (hush ? 0.4 : 1));
      ring.material.opacity = 0.9 * u;
    });
    megaCircles(t.t / t.dur, orb, hush ? 2.5 : 1);
    megaPillars(t.t + M.slam, 1 - clamp((t.t - t.dur + 1.2) / 0.6, 0, 1));
    // The whole clearing pulled into it: snow, light, streaming in from all round, from right by you.
    for (let i = 0; i < 3 + u * 9; i++) {
      const near = Math.random() < 0.45;
      const from = near ? sdU.copy(player.pos).add(sdW.set((Math.random() - 0.5) * 10, Math.random() * 4, (Math.random() - 0.5) * 10))
        : sdU.set((Math.random() - 0.5) * A.half * 2.4, A.y + Math.random() * 10, lerp(-A.length / 2, front.z, Math.random()));
      const life = 0.5 + Math.random() * 0.6;
      const pool = Math.random() < 0.5 ? k.trails : k.debris;
      pool.emit(from, sdW.subVectors(orb, from).multiplyScalar(1 / life), { life, size: near ? 0.07 : pool === k.trails ? 0.28 : 0.14, grow: 0.2, alpha: 0.95 });
    }
    // Lightning, out of the orb into the snow, into the boulders.
    K.bolts.forEach((bolt) => {
      if (Math.random() < 0.08 + u * 0.35) {
        const rocks = k.rocks.filter((r) => r.landed);
        const to = Math.random() < 0.4 && rocks.length ? rocks[Math.floor(Math.random() * rocks.length)].mesh.position.clone().add(sdU.set(0, 1.2, 0))
          : sdV.set(front.x + (Math.random() - 0.5) * 16, A.y, front.z - Math.random() * 14).clone();
        strikeBolt(bolt, orb, to, 2.5);
        if (Math.random() < 0.3) k.sparks.emit(to, sdW.set(0, 3, 0), { life: 0.3, size: 0.5, grow: 1, alpha: 1 });
      } else bolt.visible = false;
    });
    if (Math.random() < dt * (2 + u * 8)) Sfx.crackle(1.5);
    fight.redFog = Math.max(fight.redFog || 0, u * 0.85);
    k.tetoLight.intensity = hush ? 30 : 6 + u * 18;
    player.shake = Math.max(player.shake, hush ? 0.25 : u * 0.14);
    // Heartbeat, faster and faster.
    t.beat -= dt;
    if (t.beat <= 0 && !hush) { t.beat = lerp(0.75, 0.22, u); Sfx.tone(62, 30, 0.18, 0.6); fight.fovKick = Math.min(fight.fovKick, -1.2 - u * 2.5); }
    if (left < 1.6 && !t.recharged) { t.recharged = true; Sfx.railCharge(); }
    if (hush && !t.hushed) {
      // The breath before: the light all drains into her, dead quiet.
      t.hushed = true;
      document.body.classList.add('mega-hush');
      if (t.hum) t.hum.set(0.05, 0.2);
      Sfx.tone(1400, 90, 0.5, 0.1, 'triangle');
      Sfx.burst(0.5, 3000, 0.7, 0.25, 'highpass');
      fight.fovKick = -9;
    }
    megaWarn(left > 1.2 ? 'Get behind a rock!' : 'HIDE!');
    if (t.t >= t.dur) {
      Object.assign(t, { state: 'megaFire', t: 0, dur: M.fire, tick: 0 });
      for (const ring of K.rings) ring.visible = false;
      for (const bolt of K.bolts) bolt.visible = false;
      document.body.classList.remove('mega-hush');
      Sfx.railFire(); Sfx.boom(1.6); Sfx.explosion(1.5); Sfx.quake();
      impact('white', 140);
      explode(orb, 0xff4d86, 2.4);
      shockwave(front, 22, 0xffd0dc, 0.9);
      shockwave(front, 12, 0xff2d55, 0.6);
      fight.fovKick = 14;
      fight.megaGlare = 1;
      if (t.hum) t.hum.stop();
      t.hum = Sfx.loop({ noise: 1, filter: 1400, hum: 1, humFreq: 49 });
      t.hum.set(1, 0.1);
    }
    return { mode: 'rail' };
  }
  // Firing: the whole clearing filled with light, down its full length, from side to side and
  // as high as the trees.
  const orb = megaOrb();
  const u = t.t / t.dur;
  const width = Math.min(1, t.t / 0.18) * (1 - clamp((t.t - t.dur + 0.35) / 0.35, 0, 1));
  t.lift = 3.6 - u * 0.6 + (Math.random() - 0.5) * 0.08;
  tetoJets(2);
  k.bigOrb.position.copy(orb);
  k.bigOrb.scale.setScalar((9 + Math.random() * 2) * Math.max(width, 0.3));
  aimBeam(k.giant, orb, orb.clone().add(sdU.set(0, -1.6, -95)), 3.6 * width * (0.94 + Math.random() * 0.12));
  G.fill.visible = width > 0.01;
  G.fill.position.set(0, A.y - 1, front.z - 0.5);
  G.fill.scale.set(A.half * 2 + 10, 16 * (0.6 + 0.4 * width), 100);
  G.fill.material.uniforms.uOpacity.value = width;
  G.fill.material.uniforms.uTime.value = game.time;
  megaCircles(1, orb, 4, width);
  megaPillars(9, 0);
  player.shake = Math.max(player.shake, 0.4 * width);
  if (Math.random() < 0.5) fight.fovKick = Math.max(fight.fovKick, 2 + Math.random() * 3);
  // Light tearing past you down the clearing, and the snow blasted off the ground with it.
  for (let i = 0; i < 14 * width; i++) {
    const at = sdU.set((Math.random() - 0.5) * A.half * 2.2, A.y + Math.random() * 9, player.pos.z + 4 + Math.random() * 18);
    k.trails.emit(at, sdW.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, -60 - Math.random() * 30), { life: 0.35, size: 0.4 + Math.random() * 0.5, grow: 0.3, alpha: 1 });
  }
  for (let i = 0; i < 4 * width; i++) {
    const at = sdU.set((Math.random() - 0.5) * A.half * 2, A.y + 0.1, lerp(-A.length / 2, front.z, Math.random()));
    k.debris.emit(at, sdW.set((Math.random() - 0.5) * 3, 1 + Math.random() * 3, -14 - Math.random() * 10), { life: 0.7, size: 0.3, grow: 1.5, alpha: 0.8 });
  }
  megaWarn('Stay behind cover!');
  // The rocks boil away, glowing, smoking, shedding sparks off their lit faces.
  for (const r of k.rocks) {
    if (!r.landed) continue;
    const left = Math.max(0, 1 - u);
    r.mesh.scale.copy(r.size).multiplyScalar(left * (0.97 + Math.random() * 0.06));
    r.mesh.visible = left > 0.01;
    r.mesh.material.emissive.setRGB(1.6 * u + 0.4, 0.4 * u + 0.1, 0.25 * u + 0.1);
    if (left > 0.05 && Math.random() < 0.8) {
      const face = r.mesh.position.clone().add(sdU.set((Math.random() - 0.5) * r.size.x * left, Math.random() * r.size.y * left, r.size.z * left * 0.8));
      k.jets.emit(face, sdW.set((Math.random() - 0.5) * 2, 1 + Math.random() * 2, -6), { life: 0.4, size: 0.6, grow: 1.5, alpha: 0.9 });
      if (Math.random() < 0.4) k.smoke.emit(face, sdW.set(0, 1.2, -3), { life: 1.4, size: 0.7, grow: 2, alpha: 0.45 });
    }
  }
  // Out in the open you can't see a thing, and it burns. Behind a rock it's only blinding.
  const exposed = player.pos.z < t.pos.z + 1.5 && !megaShelter();
  const want = width * (exposed ? 0.95 : 0.4);
  fight.megaGlare = lerp(fight.megaGlare || 0, want, 1 - Math.exp(-dt * (want > (fight.megaGlare || 0) ? 14 : 5)));
  t.tick -= dt;
  if (t.tick <= 0 && width > 0.5) {
    t.tick = 0.2;
    if (exposed) {
      hurtPlayer(M.dps * 0.2, 'teto');
      burst(mikuChest(new THREE.Vector3()), 0xff86b0, 10, 4);
    }
  }
  if (t.t >= t.dur) {
    // Gone: the clearing steaming, the circles shattering, her spent.
    for (let i = 0; i < 40; i++) k.smoke.emit(sdU.set((Math.random() - 0.5) * A.half * 2, A.y + Math.random() * 2, lerp(-A.length / 2, front.z, Math.random())), sdW.set(0, 0.8 + Math.random(), 0), { life: 2.5, size: 1.2, grow: 2.5, alpha: 0.35 });
    for (const c of G.circles) if (c.visible) burst(c.position.clone(), 0xff6a90, 14, 6);
    endMega();
    Object.assign(t, { state: 'cool', t: 0, dur: 2.8 });
    tetoSays('Haah... haah... still standing?!', 2);
  }
  return { mode: 'rail' };
}

// Where the mega laser gathers: between her drills, a little out in front of her.
function megaOrb() {
  tetoMuzzle(0, sdV); tetoMuzzle(1, sdW);
  return new THREE.Vector3().lerpVectors(sdV, sdW, 0.5).add(sdU.set(0, -0.4, -0.9));
}

// The summoning circles: one burning into the snow under her, and a barrel of three in front of
// the orb, opening one after another, each bigger than the last, wheeling opposite ways.
// `p` is how far through the charge she is, `spin` how fast they turn, `glow` how bright.
function megaCircles(p, orb, spin = 1, glow = 1) {
  const G = showdownKit.mega, A = SHOWDOWN.arena;
  G.spin = (G.spin || 0) + spin * 0.016;
  const ground = G.circles[0];
  const g = smooth(clamp(p / 0.3, 0, 1));
  ground.visible = g > 0;
  ground.position.set(fight.teto.pos.x, A.y + 0.05, fight.teto.pos.z);
  ground.scale.setScalar(2 + g * 11);
  ground.rotation.y = G.spin * 0.6;
  ground.material.opacity = g * glow * (0.75 + Math.random() * 0.25);
  for (let i = 1; i < G.circles.length; i++) {
    const c = G.circles[i];
    const a = smooth(clamp((p - 0.2 - i * 0.16) / 0.18, 0, 1));
    c.visible = a > 0;
    c.position.copy(orb).add(sdU.set(0, -0.15 * i, -1.6 - i * 2.6));
    c.scale.setScalar((2.4 + i * 1.8) * (0.2 + a * 0.8) * (1 + (p >= 1 ? 0.15 * Math.sin(game.time * 30 + i) : 0)));
    c.rotation.set(0, 0, G.spin * (i % 2 ? 1.6 : -1.2) * (1 + i * 0.3));
    c.material.opacity = a * glow * (0.85 + Math.random() * 0.15);
  }
}

// Pillars of light out of the cracks round her, shooting up at the slam and fading before she fires.
function megaPillars(time, fade) {
  const G = showdownKit.mega, A = SHOWDOWN.arena, t = fight.teto;
  G.pillars.forEach((p, i) => {
    const rise = smooth(clamp((time - i * 0.06) / 0.35, 0, 1));
    p.visible = fade > 0.01 && rise > 0;
    if (!p.visible) return;
    // In a fan behind her and out to the sides, so they frame her rather than hide her.
    const side = i % 2 ? 1 : -1, n = Math.floor(i / 2);
    p.position.set(t.pos.x + side * (3.2 + n * 1.7), A.y, t.pos.z + 0.5 + n * 0.9 - (n === 0 ? 1.5 : 0));
    const w = (0.2 + 0.08 * Math.sin(game.time * 20 + i)) * fade;
    p.scale.set(w, 26 * rise, w);
    p.material.uniforms.uTime.value = game.time;
    p.material.uniforms.uOpacity.value = fade;
  });
}

// The slam that brings the boulders up: each thrown out to its own spot down the clearing.
function megaSlam(t) {
  const M = SHOWDOWN.moves.mega, k = showdownKit, A = SHOWDOWN.arena;
  explode(t.pos.clone().add(sdU.set(0, 0.4, 0)), 0xff2d55, 2.4);
  Sfx.quake();
  Sfx.boom(1.2);
  Sfx.snowSlam();
  impact('invert', 80);
  shockwave(t.pos, 20, 0xff4d86, 1);
  shockwave(t.pos, 9, 0xffffff, 0.5);
  fight.fovKick = 9;
  const crack = k.cracks[0];
  crack.position.copy(t.pos).setY(A.y + 0.03);
  crack.scale.setScalar(18);
  crack.material.opacity = 1;
  crack.visible = true;
  crack.userData.fade = 0.12;
  player.shake = 1;
  // Snow and rock thrown up all round her.
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 8;
    k.debris.emit(t.pos.clone().add(sdU.set(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5)), sdW.set(Math.cos(a) * s, 4 + Math.random() * 8, Math.sin(a) * s), { life: 1.2, size: 0.4 + Math.random() * 0.4, grow: 1.5, alpha: 0.9, fall: 12 });
  }
  const count = M.rocks[0] + Math.floor(Math.random() * (M.rocks[1] - M.rocks[0] + 1));
  // Only two or three, so it's a race to reach one: each in its own stretch of the clearing,
  // and never right in front of her, where there'd be no time to run to it.
  k.rocks.forEach((r, i) => { if (i >= count) { r.mesh.visible = false; r.landed = false; } });
  k.rocks.slice(0, count).forEach((r, i) => {
    const z = lerp(-A.length / 2 + 8, A.length / 2 - 14, (i + 0.2 + Math.random() * 0.6) / count);
    const x = (Math.random() - 0.5) * (A.half * 2 - 4);
    const s = 1.5 + Math.random() * 0.5;
    r.size.set(s * (1 + Math.random() * 0.3), s * (1.3 + Math.random() * 0.4), s);
    r.from.copy(t.pos).add(sdU.set(0, 1, 0));
    r.to.set(x, A.y, z);
    Object.assign(r, { t: 0, dur: 0.9 + Math.random() * 0.5, landed: false });
    r.mesh.material.emissive.setRGB(0.5, 0.12, 0.05);
    r.mesh.scale.copy(r.size).multiplyScalar(0.6);
    r.mesh.visible = true;
  });
}

// Boulders in flight, and landing.
function updateRocks(dt) {
  for (const r of showdownKit.rocks) {
    if (!r.mesh.visible || r.landed) continue;
    r.t += dt;
    const u = Math.min(1, r.t / r.dur);
    r.mesh.position.lerpVectors(r.from, r.to, u);
    r.mesh.position.y += Math.sin(u * Math.PI) * 9;
    r.mesh.rotation.x += dt * 4;
    r.mesh.rotation.z += dt * 3;
    r.mesh.scale.copy(r.size).multiplyScalar(lerp(0.6, 1, u));
    showdownKit.smoke.emit(r.mesh.position, sdW.set(0, 0, 0), { life: 0.6, size: 0.5, grow: 1.5, alpha: 0.35 });
    if (u >= 1) {
      r.landed = true;
      r.mesh.rotation.set(0, Math.random() * 6.28, 0);
      r.mesh.material.emissive.setRGB(0, 0, 0);
      burst(r.to.clone().add(sdU.set(0, 0.3, 0)), 0xf2f5ff, 20, 5);
      shockwave(r.to, 4, 0xe8f0ff, 0.4);
      Sfx.snowSlam();
      if (Math.hypot(player.pos.x - r.to.x, player.pos.z - r.to.z) < r.size.x) { hitMiku(10); player.pos.x += Math.sign(player.pos.x - r.to.x || 1) * r.size.x; }
    }
  }
}

// Whether a boulder stands between Miku and Teto's beam, big enough still to hide her.
function megaShelter() {
  for (const r of showdownKit.rocks) {
    if (!r.landed || !r.mesh.visible) continue;
    const left = r.mesh.scale.x / r.size.x;
    if (left < 0.12) continue;
    if (r.to.z > player.pos.z && r.to.z < fight.teto.pos.z && Math.abs(player.pos.x - r.to.x) < r.size.x * left * 0.85) return true;
  }
  return false;
}

function megaWarn(text) {
  const el = $('boss-warn');
  el.textContent = text;
  el.classList.remove('hidden');
}

// The mega laser over, or cut short: the boulders gone, the warning down.
function endMega() {
  const k = showdownKit, t = fight.teto;
  for (const r of k.rocks) { r.mesh.visible = false; r.landed = false; }
  $('boss-warn').classList.add('hidden');
  if (t.hum) { t.hum.stop(); t.hum = null; }
  k.giant.visible = false;
  k.bigOrb.visible = false;
  for (const ring of k.finale.rings) ring.visible = false;
  for (const bolt of k.finale.bolts) bolt.visible = false;
  for (const m of [...k.mega.circles, ...k.mega.pillars, k.mega.fill]) m.visible = false;
  document.body.classList.remove('mega-hush');
  fight.megaCd = SHOWDOWN.moves.mega.cooldown;
  if (fight.megaFog !== undefined) { fight.redFog = fight.megaFog; fight.megaFog = undefined; }
}

// A boulder: a lumpy ball of grey rock, flattened underneath.
function buildBoulder() {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const bump = 1 + 0.18 * Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - y * 1.9) + 0.08 * Math.sin(x * 9 + z * 7);
    p.setXYZ(i, x * bump, Math.max(y * bump, -0.2) + 0.2, z * bump);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6a6f7c, roughness: 0.92, metalness: 0.05, flatShading: true, emissive: 0x000000 }));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, size: new THREE.Vector3(1, 1, 1), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 1, landed: false };
}

/* ---------- Feedback ---------- */
// Words floating up off something in the world: damage numbers, and the odd PERFECT DODGE.
const popTexts = [];
function popText(at, text, cls = 'dmg') {
  const el = document.createElement('div');
  el.className = `pop-text ${cls}`;
  el.textContent = text;
  $('hud').appendChild(el);
  popTexts.push({ el, at: at.clone(), t: 0, drift: (Math.random() - 0.5) * 0.6 });
}

function updatePopTexts(dt) {
  for (let i = popTexts.length - 1; i >= 0; i--) {
    const p = popTexts[i];
    p.t += dt;
    const v = sdV.copy(p.at).add(sdU.set(p.drift * p.t, p.t * 0.9, 0)).project(camera);
    const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
    p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.25 - p.t) * 2})`;
    p.el.style.opacity = v.z > 1 ? 0 : Math.max(0, 1 - Math.max(0, p.t - 0.5) * 2.5);
    if (p.t > 0.9) { p.el.remove(); popTexts.splice(i, 1); }
  }
}

function clearPopTexts() {
  for (const p of popTexts) p.el.remove();
  popTexts.length = 0;
}

// Mid-roll, she can't be touched.
function dodging() {
  return !!player.dodge && player.dodge.t < 0.5;
}

// Rolling through something at the last moment: time slows for a beat, and she gets her wind back.
function perfectDodge() {
  if (fight.perfectCd > 0) return;
  fight.perfectCd = 2.5;
  fight.slow = 0.7;
  popText(mikuChest(sdV).add(sdU.set(0, 0.9, 0)), 'PERFECT DODGE', 'perfect');
  Sfx.glide([[0, 900], [0.25, 1800]], 0.05, 'sine');
  Sfx.whoosh(0.4);
  player.stamina = Math.min(100, player.stamina + 30);
  fight.fovKick = -5;
}

function dashAway(t) {
  t.dashT = 2.4;
  const away = sdW.set(t.pos.x - player.pos.x, 0, t.pos.z - player.pos.z).normalize();
  away.applyAxisAngle(SD_UP, (Math.random() - 0.5) * 1.4);
  t.dashing = { t: 0, from: t.pos.clone(), to: t.pos.clone().addScaledVector(away, 6) };
  showdownClamp(t.dashing.to, 0.8);
  burst(t.pos.clone().add(sdU.set(0, 0.2, 0)), 0xf2f5ff, 14, 3);
  Sfx.whoosh(0.3);
}

function fireBullet(i, dir, sweep, speed = SHOWDOWN.gatling.speed) {
  const k = showdownKit;
  const b = k.bullets.find((x) => x.life <= 0);
  if (!b) return;
  const G = SHOWDOWN.gatling;
  tetoMuzzle(i, b.pos);
  b.vel.copy(dir).applyAxisAngle(SD_UP, sweep + (Math.random() - 0.5) * G.spread).add(sdU.set(0, (Math.random() - 0.5) * G.spread, 0)).normalize().multiplyScalar(speed);
  b.life = Math.max(1.6, 26 / speed);
  b.mesh.visible = true;
  b.mesh.position.copy(b.pos);
  b.mesh.lookAt(sdV.copy(b.pos).add(b.vel));
  Sfx.gatling();
  // A flash at the drill tip, and sparks thrown out of it.
  const flash = k.muzzleFlash[i];
  flash.position.copy(b.pos);
  flash.scale.setScalar(0.5 + Math.random() * 0.6);
  flash.material.rotation = Math.random() * 6.28;
  flash.visible = true;
  flash.userData.t = 0.04;
  for (let n = 0; n < 2; n++) k.sparks.emit(b.pos, sdV.copy(b.vel).multiplyScalar(0.08).add(sdW.set((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)), { life: 0.2, size: 0.12, grow: 0.5, alpha: 1 });
}

// Bullets in flight: past her (a near miss hisses), into her, or into the snow.
function updateBullets(dt) {
  const seg0 = sdV, seg1 = sdW, k = showdownKit;
  for (const b of k.bullets) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const before = b.pos.clone();
    b.pos.addScaledVector(b.vel, dt);
    b.mesh.position.copy(b.pos);
    k.trails.emit(before.lerp(b.pos, Math.random()), sdU.set(0, 0.2, 0), { life: 0.22, size: 0.16, grow: 0.3, alpha: 0.85 });
    // Against her body: a line from her hips to her head.
    seg0.copy(player.pos).add(sdU.set(0, 0.35, 0));
    seg1.copy(player.pos).add(sdU.set(0, 1.4, 0));
    const d = segmentDistance(b.pos.clone().sub(sdU.copy(b.vel).multiplyScalar(dt)), b.pos, seg0, seg1);
    if (d < 0.32 && showdown.stage === 'fight' && !fight.knocked) {
      if (dodging()) { if (!b.hissed) { b.hissed = true; Sfx.bulletHiss(); perfectDodge(); } }
      else { hitMiku(SHOWDOWN.gatling.damage); b.life = 0; burst(b.pos, 0xff86b0, 10, 3); }
    } else if (d < 1.2 && !b.hissed) { b.hissed = true; Sfx.bulletHiss(); }
    if (b.pos.y < SHOWDOWN.arena.y) {
      b.life = 0;
      b.pos.setY(SHOWDOWN.arena.y + 0.05);
      burst(b.pos, 0xff86b0, 5, 2);
      k.debris.emit(b.pos, sdU.set((Math.random() - 0.5), 1.5 + Math.random(), (Math.random() - 0.5)), { life: 0.6, size: 0.35, grow: 1.5, alpha: 0.7, fall: 9 });
    }
    if (b.life <= 0) { b.mesh.visible = false; b.hissed = false; }
  }
}

// Closest distance between segments ab and cd.
function segmentDistance(a, b, c, d) {
  const u = b.clone().sub(a), v = d.clone().sub(c), w = a.clone().sub(c);
  const A = u.dot(u), B = u.dot(v), C = v.dot(v), D = u.dot(w), E = v.dot(w);
  const den = A * C - B * B;
  let s = den > 1e-8 ? clamp((B * E - C * D) / den, 0, 1) : 0;
  let t = C > 1e-8 ? clamp((B * s + E) / C, 0, 1) : 0;
  s = A > 1e-8 ? clamp((B * t - D) / A, 0, 1) : 0;
  return a.clone().addScaledVector(u, s).distanceTo(c.clone().addScaledVector(v, t));
}

/* ---------- Miku's strikes ---------- */
function busyStriking() {
  return fight.swing || fight.tossT >= 0 || fight.beamT >= 0 || fight.toss;
}

function showdownClick(button) {
  if (showdown.stage !== 'fight' || fight.knocked || fight.over) return;
  if (button === 2) {
    if (fight.tossCd > 0 || busyStriking()) return;
    fight.tossT = 0;
    faceTeto();
    Sfx.heatWave();
    return;
  }
  if (button !== 0) return;
  if (fight.swing) { if (fight.swing.t > fight.swing.dur * 0.45) fight.queued = true; return; }
  if (busyStriking()) return;
  startStrike();
}

// Q: the beam of light.
function showdownBeam() {
  if (showdown.stage !== 'fight' || fight.knocked || fight.over || fight.beamCd > 0 || busyStriking()) return false;
  fight.beamT = 0;
  faceTeto(30);
  Sfx.beamCharge();
  return true;
}

function startStrike() {
  const S = SHOWDOWN.scythe;
  const k = fight.comboT > 0 ? (fight.combo + 1) % 3 : 0;
  fight.combo = k;
  fight.swing = { k, t: 0, dur: k === 2 ? S.spin : S.strike, hit: false };
  faceTeto();
  Sfx.slash(k);
}

// Strikes turn her to Teto, if Teto's close enough to be the point of them.
function faceTeto(range = 14) {
  const t = fight.teto;
  const d = Math.hypot(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
  if (d < range) player.bodyYaw = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
}

function updateStrikes(dt) {
  const S = SHOWDOWN.scythe, t = fight.teto, k = showdownKit;
  fight.comboT -= dt;
  if (!fight.toss) fight.tossCd = Math.max(0, fight.tossCd - dt);
  fight.beamCd = Math.max(0, fight.beamCd - dt);
  $('skill-wave').classList.toggle('ready', fight.tossCd <= 0 && !fight.toss);
  $('skill-wave').querySelector('i').style.width = `${(1 - fight.tossCd / S.toss.cooldown) * 100}%`;
  $('skill-beam').classList.toggle('ready', fight.beamCd <= 0);
  $('skill-beam').querySelector('i').style.width = `${(1 - fight.beamCd / S.beam.cooldown) * 100}%`;
  const sw = fight.swing;
  if (sw) {
    sw.t += dt;
    if (sw.k === 2) player.bodyYaw += dt * (Math.PI * 2 / S.spin);
    if (!sw.hit && sw.t > sw.dur * 0.45) {
      sw.hit = true;
      const dx = t.pos.x - player.pos.x, dz = t.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      const off = Math.atan2(Math.sin(Math.atan2(dx, dz) - player.bodyYaw), Math.cos(Math.atan2(dx, dz) - player.bodyYaw));
      if (d < S.reach && (sw.k === 2 || Math.abs(off) < S.arc / 2)) damageTeto(S.damage[sw.k], sw.k === 2);
      // Her orbs can be cut out of the air.
      for (const o of k.homing) if (o.life > 0 && o.pos.distanceTo(mikuChest(sdV)) < S.reach + 0.4) popOrb(o, 0x7fc4ff);
      // A sweep of flame off the blades.
      for (let i = 0; i < (sw.k === 2 ? 30 : 16); i++) {
        const a = player.bodyYaw + (Math.random() - 0.5) * (sw.k === 2 ? Math.PI * 2 : S.arc);
        const r = 1.2 + Math.random() * 0.9;
        k.flames.emit(sdV.set(player.pos.x + Math.sin(a) * r, player.pos.y + 0.8 + Math.random() * 0.6, player.pos.z + Math.cos(a) * r), sdW.set(Math.sin(a) * 3, 0.5, Math.cos(a) * 3), { life: 0.35, size: 0.4, grow: 1.6, alpha: 0.85 });
      }
      if (sw.k === 2) shockwave(player.pos, S.reach + 0.6, 0x3d8bff, 0.35);
    }
    if (sw.t >= sw.dur) {
      fight.swing = null;
      fight.comboT = 0.45;
      if (fight.queued) { fight.queued = false; startStrike(); }
    }
  }
  updateToss(dt);
  updateLightBeam(dt);
}

// The throw: the scythe whirled overhead and let fly, spinning flat like a boomerang in a
// wheel of fire. It flies out until it hits Teto or has gone its range, then turns for home
// and comes back to her hand, cutting Teto again if she's in the way.
function updateToss(dt) {
  const S = SHOWDOWN.scythe, T = S.toss, k = showdownKit, t = fight.teto, sc = k.scythe;
  if (fight.tossT >= 0) {
    fight.tossT += dt;
    if (fight.tossT >= T.windup) {
      fight.tossT = -1;
      // Let go: at Teto if she's anywhere ahead, otherwise straight on.
      sc.updateMatrixWorld(true);
      const from = sc.getWorldPosition(new THREE.Vector3());
      const dir = new THREE.Vector3(Math.sin(player.bodyYaw), 0, Math.cos(player.bodyYaw));
      const toT = tetoChest(sdV).sub(from).setY(0).normalize();
      if (toT.dot(dir) > 0.6) dir.copy(toT);
      scene.attach(sc);
      fight.toss = { phase: 'out', t: 0, pos: from.setY(player.pos.y + 1.1), dir, gone: 0, hitOut: false, hitBack: false, spin: 0, whoosh: 0 };
      Sfx.whoosh(0.5);
      Sfx.ignite();
      impact('invert', 35);
      fight.fovKick = 5;
    }
  }
  const toss = fight.toss;
  if (!toss) return;
  toss.t += dt;
  if (toss.phase === 'out') {
    const step = T.speed * (1 - 0.35 * toss.gone / T.range) * dt;
    toss.pos.addScaledVector(toss.dir, step);
    toss.gone += step;
    if (toss.gone >= T.range || Math.abs(toss.pos.x) > SHOWDOWN.arena.half + 2) toss.phase = 'back';
  } else {
    // Home, faster and faster, to wherever she's got to.
    const home = mikuChest(sdV);
    const to = sdW.subVectors(home, toss.pos);
    const d = to.length();
    const speed = Math.min(T.back, 8 + toss.t * 20);
    if (d < 0.9 || d < speed * dt) {
      // Caught.
      avatar.root.add(sc);
      fight.toss = null;
      fight.tossCd = T.cooldown;
      Sfx.swordHit();
      burst(home.clone(), 0x7fc4ff, 12, 3);
      return;
    }
    toss.pos.addScaledVector(to.normalize(), speed * dt);
  }
  // Against Teto, once each way.
  const hitKey = toss.phase === 'out' ? 'hitOut' : 'hitBack';
  if (!toss[hitKey] && toss.pos.distanceTo(tetoChest(sdV)) < T.radius) {
    toss[hitKey] = true;
    damageTeto(toss.phase === 'out' ? T.damage : T.returnDamage, true);
    explode(toss.pos.clone(), 0x5ab4ff, 0.5);
    if (toss.phase === 'out') toss.phase = 'back';
  }
  // Spinning flat, the blades whirling a ring of fire round it.
  toss.spin += dt * 24;
  // Tilted back towards her, so the whole wheel of it shows as it goes.
  basisQuat(sc.quaternion, sdV.set(Math.cos(toss.spin), 0, Math.sin(toss.spin)), SD_UP);
  sc.quaternion.premultiply(sdT.setFromUnitVectors(SD_UP, sdW.set(-toss.dir.x * 0.6, 0.8, -toss.dir.z * 0.6).normalize()));
  sc.position.copy(toss.pos);
  toss.whoosh -= dt;
  if (toss.whoosh <= 0) { toss.whoosh = 0.16; Sfx.whoosh(0.18); }
  k.debris.emit(sdV.copy(toss.pos).setY(SHOWDOWN.arena.y + 0.1), sdW.set((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2), { life: 0.5, size: 0.4, grow: 2, alpha: 0.5, fall: 9 });
}

// The beam: the scythe levelled, motes of light drawn into the blade's tip, then a needle of
// white light held on Teto, burning into her the whole time it's on her and blowing up where
// it ends.
function updateLightBeam(dt) {
  const S = SHOWDOWN.scythe, B = S.beam, k = showdownKit, t = fight.teto;
  if (fight.beamT < 0) return;
  fight.beamT += dt;
  const sc = k.scythe;
  sc.updateMatrixWorld(true);
  const tip = sc.localToWorld(sdV.copy(sc.userData.tipA)).clone();
  const [tipLight, hitLight] = k.beamLights;
  const [flare, hitFlare] = k.streaks;
  // She aims it herself, over her shoulder, and can barely move while it's up.
  aiming = true;
  const aimAt = beamAimPoint(B.range);
  if (fight.beamT < B.charge) {
    // Gathering.
    const u = fight.beamT / B.charge;
    k.tipOrb.position.copy(tip);
    k.tipOrb.scale.setScalar(0.2 + u * 1.1 + Math.random() * 0.1);
    k.tipOrb.visible = true;
    flare.position.copy(tip);
    flare.scale.set(u * 4, 0.12 + u * 0.1, 1);
    flare.visible = true;
    tipLight.position.copy(tip);
    tipLight.intensity = u * 6;
    // The snow splitting blue under her, fire rising off her, light pouring into the blade.
    const scar = k.cracks[2];
    scar.visible = true;
    scar.userData.fade = 0;
    scar.position.copy(player.pos).setY(SHOWDOWN.arena.y + 0.03);
    scar.scale.setScalar(1 + u * 4);
    scar.material.opacity = u * (0.6 + Math.random() * 0.4);
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      k.flames.emit(sdW.copy(player.pos).add(sdU.set(Math.cos(a) * 0.6, Math.random() * 1.5, Math.sin(a) * 0.6)), sdU.set(0, 2 + u * 2, 0), { life: 0.4, size: 0.25, grow: 1, alpha: 0.7 });
    }
    if (!fight.beamWound && fight.beamT > B.charge * 0.45) { fight.beamWound = true; Sfx.forge(); shockwave(player.pos, 3, 0x7fc4ff, 0.4); }
    player.shake = Math.max(player.shake, u * 0.08);
    for (let i = 0; i < 3; i++) {
      const from = sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.4 + Math.random());
      k.flames.emit(sdU.copy(tip).add(from), from.multiplyScalar(-1 / 0.22), { life: 0.22, size: 0.1, grow: 0.3, alpha: 1 });
    }
    return;
  }
  if (!fight.beam) {
    // Fire.
    fight.beamWound = false;
    k.cracks[2].userData.fade = 0.5;
    fight.beam = { t: 0, dir: aimAt.clone().sub(tip).normalize(), len: 0, tick: 0, end: tip.clone() };
    Sfx.beamFire();
    Sfx.explosion(0.5);
    impact('white', 45);
    fight.fovKick = 9;
    player.shake = Math.max(player.shake, 0.3);
    k.tipOrb.visible = false;
    fight.beamCd = B.cooldown;
    // A ring of light thrown off her as it goes.
    shockwave(player.pos, 4, 0x9fd8ff, 0.5);
  }
  const bm = fight.beam;
  bm.t += dt;
  // Wherever she's aiming, swinging after the crosshair with a little weight to it.
  bm.dir.lerp(sdW.copy(aimAt).sub(tip).normalize(), 1 - Math.exp(-dt * 14)).normalize();
  // It reaches out at the speed of light, near enough, and stops at whatever it hits.
  bm.len = Math.min(B.range, bm.len + dt * 160);
  let len = bm.len;
  const far = tip.clone().addScaledVector(bm.dir, len);
  const onTeto = segmentDistance(tip, far, sdU.copy(t.pos).add(sdX.set(0, 0.3, 0)), t.pos.clone().add(sdX.set(0, 1.6, 0))) < B.radius;
  if (onTeto) len = Math.min(len, tip.distanceTo(tetoChest(new THREE.Vector3())));
  else if (bm.dir.y < -0.01) len = Math.min(len, (tip.y - SHOWDOWN.arena.y) / -bm.dir.y);
  bm.end.copy(tip).addScaledVector(bm.dir, len);
  const swell = Math.min(1, bm.t / 0.08) * (1 - clamp((bm.t - B.hold) / 0.25, 0, 1));
  aimBeam(k.mikuBeam, tip, bm.end, Math.max(0.001, swell * (1.7 + Math.random() * 0.3)));
  // Light at both ends of it, and streaks across the lens.
  tipLight.position.copy(tip);
  tipLight.intensity = 9 * swell;
  hitLight.position.copy(bm.end);
  hitLight.intensity = 14 * swell;
  flare.position.copy(tip);
  flare.scale.set(9 * swell, 0.25 * swell + 0.01, 1);
  hitFlare.position.copy(bm.end);
  hitFlare.scale.set(12 * swell, 0.35 * swell + 0.01, 1);
  hitFlare.visible = true;
  // Sparks pouring off where it lands, motes of light streaming along it.
  for (let i = 0; i < 4; i++) k.flames.emit(bm.end, sdW.set((Math.random() - 0.5) * 9, Math.random() * 6, (Math.random() - 0.5) * 9), { life: 0.3, size: 0.25, grow: 1, alpha: 0.95 });
  for (let i = 0; i < 3; i++) k.flames.emit(sdU.copy(tip).addScaledVector(bm.dir, Math.random() * len), sdW.copy(bm.dir).multiplyScalar(12), { life: 0.2, size: 0.12, grow: 0.5, alpha: 1 });
  if (!onTeto && Math.random() < dt * 20) k.debris.emit(sdU.copy(bm.end).setY(SHOWDOWN.arena.y + 0.1), sdW.set((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4), { life: 0.8, size: 0.5, grow: 2, alpha: 0.7, fall: 9 });
  player.shake = Math.max(player.shake, 0.08 * swell);
  // Burning her while it's on her.
  bm.tick -= dt;
  if (onTeto && bm.t < B.hold && bm.tick <= 0) {
    bm.tick = 0.1;
    damageTeto(B.damage * 0.1 / B.hold, false, true);
    bm.burned = true;
  }
  // And it goes out with a bang.
  if (bm.t >= B.hold && !bm.boom) {
    bm.boom = true;
    explode(bm.end.clone(), 0x7fc4ff, 1.4);
    if (bm.burned) { damageTeto(B.damage * 0.25, true); fight.hitStop = 0.15; }
    const scar = k.cracks[2];
    scar.position.copy(bm.end).setY(SHOWDOWN.arena.y + 0.03);
    scar.scale.setScalar(5);
    scar.material.opacity = 1;
    scar.userData.fade = 0.4;
    scar.visible = true;
  }
  if (bm.t >= B.hold + 0.3) endLightBeam();
}

// Where the crosshair points: straight out from the camera, onto the snow if it gets there first.
function beamAimPoint(range) {
  camera.getWorldDirection(sdX);
  const at = camera.position.clone().addScaledVector(sdX, range);
  if (sdX.y < -0.01) {
    const toGround = (camera.position.y - SHOWDOWN.arena.y) / -sdX.y;
    if (toGround < range) at.copy(camera.position).addScaledVector(sdX, toGround);
  }
  return at;
}

// The beam put out, whether it ran its course or she was knocked down mid-way.
function endLightBeam() {
  const k = showdownKit;
  if (fight.beamT >= 0) aiming = false;
  k.mikuBeam.visible = false;
  k.tipOrb.visible = false;
  fight.beam = null;
  fight.beamT = -1;
  for (const l of k.beamLights) l.intensity = 0;
  for (const o of k.streaks) o.visible = false;
}

// The camera during the fight, after the usual follow camera (game.js): big moments kick the
// field of view.
function showdownCamera(dt) {
  if (showdown.stage !== 'fight') { fight.camBeam = 0; return; }
  // For the beam: pulled well back over her shoulder and wide, so the whole of it shows,
  // still looking where she aims.
  fight.camBeam = (fight.camBeam || 0) + ((fight.beamT >= 0 ? 1 : 0) - (fight.camBeam || 0)) * (1 - Math.exp(-dt * 5));
  const c = fight.camBeam;
  if (c > 0.001) {
    camera.getWorldDirection(sdX);
    const right = sdY.set(-sdX.z, 0, sdX.x).normalize();
    const goal = sdW.copy(player.pos).addScaledVector(sdX, -5).addScaledVector(right, 1.4).add(sdU.set(0, 2, 0));
    goal.y = Math.max(goal.y, SHOWDOWN.arena.y + 0.6);
    const look = sdV.copy(camera.position).add(sdX);
    camera.position.lerp(goal, c);
    camera.lookAt(look.copy(camera.position).add(sdX));
    camera.fov = lerp(camera.fov, 64, c);
    camera.updateProjectionMatrix();
  }
  if (Math.abs(fight.fovKick) > 0.05) {
    camera.fov += fight.fovKick * 0.15;
    camera.updateProjectionMatrix();
  }
}

/* ---------- The finale ---------- */
// The end of the fight, played out as a scene, so there's no doubt how it goes. Teto goes up
// on her jets and rains bullets down while Miku leaps clear of them. Miku plants her feet and
// answers with her beam; Teto's meets it halfway and the two lights grind against each other,
// Miku's giving and then, for a moment, pushing back, until Teto screams and drives hers all
// the way down. It hits, slowed right down, and everything goes white. When it clears Miku is
// flat in a smoking crater with her scythe going out in the snow beside her, and Teto hangs
// over her long enough to say goodbye before she streaks away into the red sky. Then the
// snow comes down over Miku, a still at a time.
const FINALE = {
  lift: 0.8, rain: 2.2, rainEnd: 6.2, plant: 6.4, clash: 7.6, hope: 9.6, push: 10.6, hit: 12.0, white: 12.6,
  clear: 13.1, won: 13.7, laugh: 14.5, leave: 15.2, gone: 16.8,
  still: 17.2, frames: 10, every: 0.95, dark: 26.8, wake: 28.4, end: 36,
};
// Where the two beams meet, as a share of the way from Miku's blade to Teto's light.
const FINALE_CLASH = [[7.6, 0.5], [8.6, 0.46], [9.6, 0.34], [10.2, 0.62], [10.6, 0.6], [12.0, 0]];
// Miku's leaps across the clearing as the bullets come down: [across, towards Teto] in metres,
// and how she goes: cartwheeling, spinning with the scythe whirling, flipping over backwards
// (that one in slow motion), and a corkscrew.
const FINALE_HOPS = [[-2.4, 0.4, 'side'], [2.0, 1.2, 'spin'], [-1.4, 2.2, 'back'], [2.6, 1.6, 'side2'], [0.2, 2.8, 'twist']];
const FINALE_HOP = { every: 0.75, air: 0.55, slow: 2 };
// Her last thoughts, over the stills of the snow.
const FINALE_THOUGHTS = { 1: '...cold...', 4: 'I\'m sorry, Varga.', 7: '...get... up...' };

function startFinale() {
  if (showdown.stage !== 'fight') return;
  showdown.stage = 'finale';
  fight.swing = null;
  fight.knocked = null;
  player.dodge = null;
  $('boss-hint').classList.add('hidden');
  $('sword-wave').classList.add('hidden');
  clearFightFx();
  const K = showdownKit.finale;
  if (!K.clash) {
    K.clash = glowOrb(0xffe0ea, 1);
    // A sphere of light swelling where the beams meet, and rings thrown off it along them.
    K.shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), beamMaterial(0xffc0dd, 0.8, 30));
    K.shell.visible = false;
    scene.add(K.shell);
    K.clashRings = Array.from({ length: 5 }, (_, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 40), additive(new THREE.Color(i % 2 ? 0x7fc4ff : 0xff4d86).multiplyScalar(3), 0.9));
      ring.visible = false;
      scene.add(ring);
      return { mesh: ring, t: 9, side: i % 2 ? -1 : 1 };
    });
  }
  const t = fight.teto;
  const toT = new THREE.Vector3(t.pos.x - player.pos.x, 0, t.pos.z - player.pos.z).normalize();
  showdownScene = {
    t: 0, fired: {}, inArena: true, frame: -1, fog: fight.redFog || 0, boom: 0, shot: 0,
    from: player.pos.clone(), toT, side: new THREE.Vector3(toT.z, 0, -toT.x), hop: -1, hopFrom: player.pos.clone(), hopTo: player.pos.clone(),
  };
  playScene({ update: updateFinale });
}

// Interpolates FINALE_CLASH at time `time`.
function clashShare(time) {
  const keys = FINALE_CLASH;
  if (time <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (time <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], smooth((time - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return 0;
}

// Miku with her scythe levelled at a point (in the world), both hands on it.
function poseMikuAim(target) {
  avatar.root.updateMatrixWorld(true);
  const local = avatar.root.worldToLocal(sdV.copy(target)).sub(sdU.set(0.05, 1.3, 0.35)).normalize().clone();
  placeScythe(0.05, 1.3, 0.35, local, Math.abs(local.y) < 0.9 ? SD_UP : sdW.set(0, 0, -1));
  gripScythe(avatar.armR, -0.28, POLE_R);
  gripScythe(avatar.armL, 0.02, POLE_L);
  avatar.armL.hand.quaternion.identity();
  avatar.armR.hand.quaternion.identity();
}

function updateFinale(dt) {
  const s = showdownScene, F = FINALE, k = showdownKit, t = fight.teto, K = k.finale;
  // The moment it lands plays slowed right down, and so does one of her leaps.
  const slowHop = s.t > F.rain + FINALE_HOP.every * FINALE_HOP.slow && s.t < F.rain + FINALE_HOP.every * (FINALE_HOP.slow + 1);
  const sdt = (s.t > F.hit && s.t < F.white) || slowHop ? dt * 0.3 : dt;
  document.body.classList.toggle('bullet-time', slowHop);
  s.t += sdt;
  game.time += sdt;
  const time = s.t, A = SHOWDOWN.arena, toT = s.toT, side = s.side;
  ambushOnce('line', 0.2, () => tetoSays(showdownLine('finale')));
  ambushOnce('jets', F.lift, () => { s.jet = Sfx.jet(); s.jet.set(0.7, 0.3); Sfx.whoosh(1); });

  // Teto: up on her jets, and in the end away into the sky.
  let lift = smooth(clamp((time - F.lift) / 1.4, 0, 1)) * 13;
  if (time > F.white) lift = lerp(13, 8, smooth(clamp((time - F.white) / 1.6, 0, 1)));
  if (time > F.leave) lift += Math.pow(time - F.leave, 2.4) * 22;
  t.yaw = Math.atan2(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
  if ((time > F.lift && time < F.white) || (time > F.leave && time < F.gone)) tetoJets(1);
  else if (time > F.white && time < F.gone) tetoJets(0.25);
  // The sky goes red, and after, grey again.
  fight.redFog = time < F.white ? lerp(s.fog, 0.6, smooth(clamp((time - F.lift) / 3, 0, 1))) : lerp(0.6, 0.2, smooth(clamp((time - F.white) / 4, 0, 1)));
  scene.fog.color.setHex(FOG_COLOR).lerp(SD_RED, fight.redFog);
  if (time < F.gone) poseTeto(dt, time > F.lift ? (time > F.clash && time < F.white ? 'rail' : 'fly') : 'idle', mikuChest(sdU.clone()), { lift });
  ambushOnce('gone', F.gone, () => { k.teto.setVisible(false); k.tetoLight.intensity = 0; if (s.jet) { s.jet.stop(); s.jet = null; } });
  tetoMuzzle(0, sdV); tetoMuzzle(1, sdW);
  const orb = s.orb = (s.orb || new THREE.Vector3()).lerpVectors(sdV, sdW, 0.5).add(sdU.set(0, -0.6, 0));

  // The rain: bullets hammering down after her as she leaps from spot to spot.
  if (time > F.rain && time < F.rainEnd) {
    s.shot -= sdt;
    while (s.shot <= 0) {
      s.shot += 0.06;
      const aimAt = sdU.copy(player.pos).add(sdX.set((Math.random() - 0.5) * 2.4, 0.6, (Math.random() - 0.5) * 2.4));
      const i = Math.random() < 0.5 ? 0 : 1;
      tetoMuzzle(i, sdV);
      fireBullet(i, aimAt.sub(sdV).normalize(), 0);
    }
  }
  updateBullets(sdt);
  ambushOnce('rainLine', F.rain + 0.4, () => Sfx.tetoLaugh());

  // Miku.
  const hopAt = Math.floor((time - F.rain) / FINALE_HOP.every);
  if (time > F.rain && time < F.rainEnd && hopAt !== s.hop && hopAt < FINALE_HOPS.length) {
    s.hop = hopAt;
    s.hopFrom.copy(player.pos);
    const [x, z, kind] = FINALE_HOPS[hopAt];
    s.kind = kind;
    if (kind === 'back') Sfx.whoosh(1.2);
    s.hopTo.copy(s.from).addScaledVector(side, x).addScaledVector(toT, z);
    showdownClamp(s.hopTo, 1);
    s.hopT = 0;
    Sfx.whoosh(0.3);
  }
  if (time < F.white) {
    player.bodyYaw = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
    poseAvatar(dt, sdU.set(0, 0, 0), false);
    if (s.hop >= 0 && time < F.rainEnd + 0.4) {
      // Over the bullets: a cartwheel, a spin with the scythe whirling round her, a back
      // flip, a corkscrew. Up, over, and down into a crouch, with a trail of blue fire.
      s.hopT = Math.min(1, (s.hopT || 0) + sdt / FINALE_HOP.air);
      const u = s.hopT, air = Math.sin(u * Math.PI), turn = smooth(u) * Math.PI * 2;
      player.pos.lerpVectors(s.hopFrom, s.hopTo, smooth(u));
      player.pos.y = A.y + air * 1.4;
      if (s.kind === 'spin') { fight.swing = { k: 2, t: u * 0.5, dur: 0.5 }; player.bodyYaw += turn; }
      poseAvatar(dt, sdU.set(0, 0, 0), false);
      for (const leg of [avatar.legL, avatar.legR]) { leg.thigh.rotation.x = -1.5 * air; leg.shin.rotation.x = 2.1 * air; }
      poseScytheArms();
      fight.swing = null;
      const axis = s.kind === 'side' || s.kind === 'side2' ? sdX.set(0, 0, s.kind === 'side' ? 1 : -1) : s.kind === 'back' || s.kind === 'twist' ? sdX.set(-1, 0, 0) : null;
      if (axis) {
        const q = sdQ.setFromAxisAngle(SD_UP, player.bodyYaw + (s.kind === 'twist' ? turn : 0)).multiply(sdT.setFromAxisAngle(axis, turn));
        avatar.root.quaternion.copy(q);
        avatar.root.position.set(player.pos.x, player.pos.y + avatar.dims.hips, player.pos.z).sub(sdV.set(0, avatar.dims.hips, 0).applyQuaternion(q));
      } else {
        avatar.root.position.y = player.pos.y;
      }
      if (u < 1) {
        avatar.root.updateMatrixWorld(true);
        for (const part of [avatar.hips, avatar.chest, avatar.head]) k.flames.emit(part.getWorldPosition(sdV), sdW.set(0, 0.2, 0), { life: 0.3, size: 0.45, grow: 0.4, alpha: 0.5 });
      }
      if (u >= 1 && !s.landed) { s.landed = true; burst(player.pos.clone().add(sdU.set(0, 0.1, 0)), 0xf2f5ff, 14, 3); Sfx.thud(); }
      if (u < 1) s.landed = false;
      // Whirling, the scythe knocks rounds out of the air round her.
      if (s.kind === 'spin' && u < 1) for (const b of k.bullets) if (b.life > 0 && b.pos.distanceTo(mikuChest(new THREE.Vector3())) < 2.2) { b.life = 0; b.mesh.visible = false; burst(b.pos.clone(), 0x7fc4ff, 6, 3); Sfx.swordHit(); }
    } else if (time > F.plant && time < F.hit + 0.2) {
      // Planted, the scythe levelled up at her.
      player.pos.y = A.y;
      poseMikuAim(orb);
      // Pushed back across the snow as Teto bears down.
      if (time > F.push) {
        player.pos.addScaledVector(toT, -0.5 * sdt);
        if (Math.random() < 0.5) k.debris.emit(player.pos.clone().add(sdU.set(0, 0.1, 0)), sdW.set((Math.random() - 0.5) * 2, 1.5, 0).addScaledVector(toT, -2), { life: 0.6, size: 0.4, grow: 2, alpha: 0.7, fall: 9 });
      }
    } else if (time >= F.hit + 0.2) {
      // Blown off her feet.
      if (!s.blownFrom) s.blownFrom = player.pos.clone();
      const u = clamp((time - F.hit - 0.2) / 0.4, 0, 1);
      player.pos.copy(s.blownFrom).addScaledVector(toT, -4 * smooth(u));
      player.pos.y = A.y + Math.sin(u * Math.PI) * 1.2;
      poseFalling(dt, time * 3, player.pos.clone().add(sdU.set(0, 0.5, 0)), 1.2);
    } else {
      poseScytheArms();
    }
    avatar.simulate(dt);
    scytheFlames(dt);
  } else if (time < F.wake) {
    player.pos.y = A.y;
    poseLying(dt, player.pos);
  }

  // Both of them gathering their light.
  if (time > F.plant && time < F.clash) {
    const u = smooth((time - F.plant) / (F.clash - F.plant));
    k.bigOrb.position.copy(orb);
    k.bigOrb.scale.setScalar(0.5 + u * 3.5 + Math.random() * 0.3);
    k.bigOrb.visible = true;
    K.rings.forEach((ring, i) => {
      ring.visible = true;
      ring.position.copy(orb);
      ring.rotation.set(game.time * (1.5 + i), game.time * (2.2 - i * 0.6), i * 1.1);
      ring.scale.setScalar(0.2 + u * (0.8 - i * 0.12));
      ring.material.opacity = 0.9 * u;
    });
    k.scythe.updateMatrixWorld(true);
    const tip = k.scythe.localToWorld(sdV.copy(k.scythe.userData.tipA));
    k.tipOrb.position.copy(tip);
    k.tipOrb.scale.setScalar(0.3 + u * 1.4 + Math.random() * 0.1);
    k.tipOrb.visible = true;
    for (let i = 0; i < 2; i++) {
      const from = sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.5);
      k.flames.emit(sdU.copy(tip).add(from), from.multiplyScalar(-1 / 0.22), { life: 0.22, size: 0.12, grow: 0.3, alpha: 1 });
      const fromT = sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6);
      k.trails.emit(sdU.copy(orb).add(fromT), fromT.multiplyScalar(-1 / 0.4), { life: 0.4, size: 0.3, grow: 0.2, alpha: 0.9 });
    }
  }
  ambushOnce('plant', F.plant, () => { caption('Then let\'s finish this!', 'line'); Sfx.beamCharge(); Sfx.railCharge(); });

  // The clash.
  if (time > F.clash && time < F.hit) {
    k.scythe.updateMatrixWorld(true);
    const tip = k.scythe.localToWorld(sdV.copy(k.scythe.userData.tipA)).clone();
    const share = clamp(clashShare(time) + Math.sin(time * 23) * 0.015, 0, 1);
    const P = tip.clone().lerp(orb, share);
    s.clashP = P.clone();
    aimBeam(k.mikuBeam, tip, P, 2 * (0.9 + Math.random() * 0.2));
    aimBeam(k.rails[0], orb, P, 2.6 * (0.9 + Math.random() * 0.2));
    k.bigOrb.position.copy(orb);
    k.bigOrb.scale.setScalar(3 + Math.random() * 0.4);
    k.tipOrb.visible = false;
    for (const ring of K.rings) ring.visible = false;
    K.clash.position.copy(P);
    K.clash.scale.setScalar(3 + Math.random() * 1.5);
    K.clash.visible = true;
    const [tipLight, hitLight] = k.beamLights;
    tipLight.position.copy(tip);
    tipLight.intensity = 8;
    hitLight.position.copy(P);
    hitLight.intensity = 16;
    k.tetoLight.position.copy(orb);
    k.tetoLight.intensity = 14;
    for (let i = 0; i < 6; i++) {
      k.flames.emit(P, sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 6), { life: 0.35, size: 0.35, grow: 1, alpha: 1 });
      k.jets.emit(P, sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 6), { life: 0.35, size: 0.35, grow: 1, alpha: 1 });
    }
    for (const bolt of K.bolts) {
      if (Math.random() < 0.5) strikeBolt(bolt, P, sdW.copy(P).add(sdU.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8)), 1.5);
      else bolt.visible = false;
    }
    // The sphere of light where they meet, swelling and shuddering, rings thrown off it.
    K.shell.visible = true;
    K.shell.position.copy(P);
    K.shell.scale.setScalar(1.2 + Math.sin(time * 31) * 0.15 + Math.random() * 0.2 + (time > F.push ? 0.6 : 0));
    K.shell.material.uniforms.uTime.value = time;
    const axis = sdX.copy(orb).sub(tip).normalize();
    s.ringT = (s.ringT || 0) - sdt;
    if (s.ringT <= 0) {
      s.ringT = 0.12;
      const r = K.clashRings.find((x) => x.t > 0.5) || K.clashRings[0];
      r.t = 0;
      r.side = -r.side;
    }
    for (const r of K.clashRings) {
      r.t += sdt;
      const u = r.t / 0.5;
      r.mesh.visible = u < 1;
      if (u >= 1) continue;
      // Out along the beams from where they meet, one way and then the other.
      r.mesh.position.copy(P).addScaledVector(axis, r.side * u * 3);
      r.mesh.lookAt(sdW.copy(r.mesh.position).add(axis));
      r.mesh.scale.setScalar(0.6 + u * 3.5);
      r.mesh.material.opacity = 0.9 * (1 - u);
    }
    // Both of them burning: blue fire pouring up off Miku, red off Teto.
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      k.flames.emit(sdW.copy(player.pos).add(sdU.set(Math.cos(a) * 0.5, Math.random() * 1.6, Math.sin(a) * 0.5)), sdU.set(0, 2.5, 0), { life: 0.45, size: 0.3, grow: 1, alpha: 0.8 });
      k.jets.emit(sdW.copy(t.pos).add(sdU.set(Math.cos(a) * 0.5, lift + Math.random() * 1.6, Math.sin(a) * 0.5)), sdU.set(0, 2.5, 0), { life: 0.45, size: 0.3, grow: 1, alpha: 0.8 });
    }
    // The snow under them torn up and blown out.
    if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; k.debris.emit(sdW.set(P.x + Math.cos(a) * 2, A.y + 0.1, P.z + Math.sin(a) * 2), sdU.set(Math.cos(a) * 6, 2 + Math.random() * 3, Math.sin(a) * 6), { life: 0.9, size: 0.7, grow: 2, alpha: 0.7, fall: 9 }); }
    const blueCrack = k.cracks[2];
    blueCrack.visible = true;
    blueCrack.position.copy(player.pos).setY(A.y + 0.03);
    blueCrack.scale.setScalar(4 + Math.sin(time * 9) * 0.3);
    blueCrack.material.opacity = 0.8;
    s.boom -= sdt;
    if (s.boom <= 0) { s.boom = 0.35; shockwave(sdU.copy(P).setY(A.y), 7, Math.random() < 0.5 ? 0x7fc4ff : 0xff2d55, 0.6); }
    player.shake = 0.25;
    if (s.hum) s.hum.set(0.5 + (1 - share) * 0.5, 0.1);
  }
  ambushOnce('clash', F.clash, () => {
    caption('');
    Sfx.beamFire(); Sfx.railFire(); Sfx.explosion(0.8);
    impact('white', 60);
    s.hum = Sfx.loop({ noise: 1, filter: 1600, hum: 0.8, humFreq: 70 });
    s.hum.set(0.6, 0.2);
  });
  ambushOnce('hope', F.hope, () => { caption('Not... yet...!', 'line'); Sfx.beamFire(); });
  ambushOnce('push', F.push, () => { caption(''); tetoSays('You CAN\'T WIN!', 1.8); Sfx.stinger(); Sfx.railFire(); fight.fovKick = -6; });
  ambushOnce('hit', F.hit, () => {
    k.mikuBeam.visible = false;
    k.rails[0].visible = false;
    K.clash.visible = false;
    K.shell.visible = false;
    for (const r of K.clashRings) { r.mesh.visible = false; r.t = 9; }
    k.cracks[2].visible = false;
    drawSpeedLines(0, 0);
    for (const bolt of K.bolts) bolt.visible = false;
    for (const l of k.beamLights) l.intensity = 0;
    if (s.hum) { s.hum.stop(); s.hum = null; }
    Sfx.railFire(); Sfx.boom(1.2); Sfx.explosion(1.3);
    impact('white', 80);
    showdown.music = false;
    Sfx.playMusic(null);
    caption('');
  });
  // It lands: her whole light, straight down onto Miku.
  if (time > F.hit && time < F.white) {
    const u = (time - F.hit) / (F.white - F.hit);
    aimBeam(k.giant, orb, player.pos.clone().setY(A.y), Math.min(1, u * 4) * (0.9 + Math.random() * 0.2));
    s.boom -= sdt;
    if (s.boom <= 0) {
      s.boom = 0.1;
      shockwave(player.pos, 8 + Math.random() * 10, Math.random() < 0.5 ? 0xff2d55 : 0xffffff, 0.6);
      burst(player.pos.clone().add(sdU.set(0, 0.5, 0)), 0xff86b0, 20, 9);
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      k.jets.emit(sdV.copy(player.pos).add(sdU.set(Math.cos(a) * 2.5, 0.3, Math.sin(a) * 2.5)), sdW.set(Math.cos(a) * 14, 2 + Math.random() * 10, Math.sin(a) * 14), { life: 0.6, size: 1.2, grow: 2, alpha: 0.9 });
      k.debris.emit(sdV.copy(player.pos).add(sdU.set(Math.cos(a) * 3, 0.2, Math.sin(a) * 3)), sdW.set(Math.cos(a) * 10, 4 + Math.random() * 6, Math.sin(a) * 10), { life: 1.2, size: 1.2, grow: 2, alpha: 0.85, fall: 9 });
    }
    player.shake = 1;
  }
  ambushOnce('white', F.white, () => {
    $('flash').className = 'white';
    k.giant.visible = false;
    k.bigOrb.visible = false;
    clearFightFx();
    $('boss-bar').classList.add('hidden');
    Sfx.ring();
    // She's down in a crater, and her scythe's flung into the snow beside her, going out.
    player.pos.y = A.y;
    showdownClamp(player.pos, 1.5);
    const sc = k.scythe;
    scene.attach(sc);
    sc.visible = true;
    sc.position.copy(player.pos).addScaledVector(side, 1.6).addScaledVector(toT, 0.6).setY(A.y + 0.04);
    basisQuat(sc.quaternion, sdV.copy(side).applyAxisAngle(SD_UP, 0.7), SD_UP);
    bowModel.group.visible = false;
    const crack = k.cracks[1];
    crack.visible = true;
    crack.position.copy(player.pos).setY(A.y + 0.03);
    crack.scale.setScalar(9);
    crack.material.opacity = 1;
    crack.userData.fade = 0.12;
  });
  ambushOnce('clear', F.clear, () => { $('flash').className = ''; });
  ambushOnce('won', F.won, () => tetoSays(showdownLine('won'), 2.2));
  ambushOnce('laugh', F.laugh, () => Sfx.tetoLaugh());
  ambushOnce('leave', F.leave, () => { s.jet = Sfx.jet(); s.jet.set(0.9, 0.2); Sfx.whoosh(1.6); shockwave(t.pos, 8, 0xff2d55, 0.6); });

  // The crater: smoke and embers rising off it, the scythe's light dying.
  if (time > F.white) {
    const u = clamp((time - F.white) / (F.dark - F.white), 0, 1);
    setScytheGlow(Math.max(0, 1 - u * 1.25) * (0.8 + Math.random() * 0.2 * (1 - u)));
    if (time < F.still && Math.random() < sdt * 14) k.smoke.emit(sdV.copy(player.pos).add(sdU.set((Math.random() - 0.5) * 4, 0.2, (Math.random() - 0.5) * 4)), sdW.set(0.3, 0.8 + Math.random(), 0), { life: 3, size: 0.8, grow: 3, alpha: 0.4 });
    if (time < F.still && Math.random() < sdt * 20) k.sparks.emit(sdV.copy(player.pos).add(sdU.set((Math.random() - 0.5) * 5, 0.1, (Math.random() - 0.5) * 5)), sdW.set(0, 1 + Math.random() * 1.5, 0), { life: 1.2, size: 0.08, grow: 0.2, alpha: 1 });
  }
  updateShowdownFx(sdt);

  // Frame by frame: the snow settling on her, a still at a time, each from somewhere new.
  if (time >= F.wake) {
    updateWakeUp(dt, time - F.wake);
  } else if (time >= F.still) {
    const frame = Math.min(F.frames - 1, Math.floor((time - F.still) / F.every));
    if (frame !== s.frame) {
      s.frame = frame;
      const u = (frame + 1) / F.frames;
      if (frame === 0) document.body.classList.add('aftermath');
      // Where she lies: her head, her hips, and her feet beyond them.
      const hd = avatar.head.getWorldPosition(new THREE.Vector3()).setY(A.y);
      const hp = avatar.hips.getWorldPosition(new THREE.Vector3()).setY(A.y);
      const along = hp.clone().sub(hd).setY(0).normalize();
      const across = new THREE.Vector3(along.z, 0, -along.x);
      // Drifts heaping up along her, feet first, the one over her face last; and at the end
      // one mound over all of it.
      k.lumps.forEach((lump, i) => {
        const at = [-0.1, 0.25, 0.55, 0.85, 1.15, 1.45][i];
        const grow = clamp(u * 1.4 - (5 - i) * 0.04 - (i === 0 ? 0.25 : 0), 0, 1);
        lump.visible = grow > 0.02;
        lump.position.copy(hd).addScaledVector(along, at).addScaledVector(across, Math.sin(i * 2.3) * 0.08);
        lump.scale.set(0.2 + grow * 0.28, 0.03 + grow * 0.24, 0.2 + grow * 0.3);
        lump.rotation.y = i * 1.7;
      });
      const all = smooth(clamp((u - 0.6) / 0.4, 0, 1));
      k.mound.visible = all > 0.01;
      k.mound.position.copy(hd).addScaledVector(along, 0.7);
      k.mound.scale.set(0.3 + all * 0.55, 0.05 + all * 0.42, 0.6 + all * 0.75);
      k.mound.rotation.y = Math.atan2(along.x, along.z);
      setScytheGlow(Math.max(0, 0.6 - u * 0.7));
      const sc = k.scythe.position;
      // The way her face is turned, lying there.
      const faceDir = new THREE.Vector3(0, 0, 1).applyQuaternion(avatar.head.getWorldQuaternion(new THREE.Quaternion()));
      const eye = avatar.head.getWorldPosition(new THREE.Vector3()).add(sdU.set(0, 0.06, 0));
      const face = (dist, sideways, up) => eye.clone().addScaledVector(faceDir, dist).addScaledVector(across, sideways).add(sdU.set(0, up, 0));
      const shots = [
        // From high above: the crater, her in it, the scythe flung beside her.
        [hp.clone().add(sdU.set(0.2, 7, 0.4)), hp.clone()],
        // Her face, snow catching in her hair.
        [face(0.75, 0.15, 0.3), eye],
        // The scythe, its light going out.
        [sc.clone().addScaledVector(across, 1.3).add(sdU.set(0, 0.55, 0)), sc.clone()],
        // Low and far down the clearing: a small dark shape in all that white.
        [hp.clone().addScaledVector(toT, 9).addScaledVector(side, 1.5).add(sdU.set(0, 0.45, 0)), hp.clone().add(sdU.set(0, 0.3, 0))],
        // Her face again, from the other side.
        [face(0.6, -0.3, 0.45), eye],
        // From her outflung hand to the scythe, out of reach.
        [hd.clone().addScaledVector(across, -0.5).add(sdU.set(0, 0.3, 0)), sc.clone()],
        // Higher, the white closing in.
        [hp.clone().add(sdU.set(0.3, 14, 0.6)), hp.clone()],
        // Her face, nearly gone under it.
        [face(0.55, 0.05, 0.2), eye],
        // Up and away, until she's lost in it.
        [hp.clone().add(sdU.set(0.5, 40, 1)), hp.clone()],
        [hp.clone().add(sdU.set(0.5, 110, 1.5)), hp.clone()],
      ];
      s.stillCam = { at: shots[frame][0], look: shots[frame][1] };
      // The snow hangs in the air round wherever the still is taken from.
      k.snow.visible = true;
      k.snow.userData.update(0, game.time, s.stillCam.at);
      if (FINALE_THOUGHTS[frame]) caption(FINALE_THOUGHTS[frame], 'thought');
      else caption('');
      // A blink between stills, and a slow push in on each one.
      impact('black', 90);
      const view = $('view');
      view.classList.remove('kb');
      void view.offsetWidth;
      view.classList.add('kb');
      Sfx.burst(0.5, 3200, 0.6, 0.05, 'highpass');
      // Her heart, slower every time.
      Sfx.tone(64, 34, 0.2, 0.5 * (1 - u * 0.6));
    }
    camera.position.copy(s.stillCam.at);
    camera.up.set(0, 1, 0);
    camera.lookAt(s.stillCam.look);
    setFov(frame === 2 || frame === 5 ? 34 : 44);
    // The world stands still between stills.
    s.hold = true;
  } else {
    // Shots.
    const sky = t.pos.clone().add(sdU.set(0, lift + 1.2, 0));
    let at, look, fov = 56, roll = 0, lines = 0;
    if (time < F.rain) {
      at = player.pos.clone().addScaledVector(toT, -3).add(sdU.set(0, 1.1, 0));
      look = sky;
    } else if (time < F.rainEnd) {
      if (s.hop === FINALE_HOP.slow) {
        // Bullet time: round her as she flips, the rounds crawling past.
        const a = -0.8 + (s.hopT || 0) * 2.6;
        at = player.pos.clone().addScaledVector(side, Math.cos(a) * 3.6).addScaledVector(toT, Math.sin(a) * 3.6);
        at.y = A.y + 1.5;
        look = mikuChest(new THREE.Vector3()).add(sdU.set(0, 0.3, 0));
        fov = 50;
      } else if (s.hop > FINALE_HOP.slow) {
        // Low in front of her, Teto and her rain of fire in the sky behind.
        at = player.pos.clone().addScaledVector(toT, 4).addScaledVector(side, 1.5);
        at.y = A.y + 0.5;
        look = player.pos.clone().add(sdU.set(0, 1.6, 0));
        fov = 62;
      } else {
        // Alongside her, low, as she leaps through it.
        at = player.pos.clone().addScaledVector(side, 6).addScaledVector(toT, -2.5);
        at.y = A.y + 1.2;
        look = player.pos.clone().addScaledVector(toT, 2).add(sdU.set(0, 1.4, 0));
        fov = 58;
      }
    } else if (time < F.clash) {
      // Low behind her, her blade up at the light in the sky.
      at = player.pos.clone().addScaledVector(toT, -2.6).addScaledVector(side, 0.9).add(sdU.set(0, 0.6, 0));
      look = sky;
      fov = 54;
    } else if (time < F.clash + 0.8) {
      // Swinging round the point where the two lights meet.
      const P = s.clashP || player.pos;
      const a = (time - F.clash) * 1.6;
      at = P.clone().addScaledVector(side, Math.cos(a) * 7).addScaledVector(toT, Math.sin(a) * 7 - 2);
      at.y = Math.max(A.y + 1, P.y - 1);
      look = P.clone();
      fov = 60;
    } else if (time < F.clash + 1.4) {
      // Teto, bearing down.
      at = sky.clone().addScaledVector(toT, -2.6).addScaledVector(side, -1.4).add(sdU.set(0, -1, 0));
      look = sky.clone().add(sdU.set(0, -0.3, 0));
      fov = 44;
      roll = 0.12;
      lines = 0.6;
    } else if (time > F.hope && time < F.push) {
      // Miku, straining, everything she has left in it.
      at = player.pos.clone().addScaledVector(toT, 1.4).addScaledVector(side, 0.5).add(sdU.set(0, 1.25, 0));
      look = player.pos.clone().add(sdU.set(0, 1.35, 0));
      fov = 42;
      roll = -0.15;
      lines = 0.8;
    } else if (time < F.hope || (time > F.push + 0.6 && time < F.hit)) {
      // Side on: the two beams meeting.
      const mid = player.pos.clone().lerp(t.pos, 0.5);
      at = mid.addScaledVector(side, 8.5).add(sdU.set(0, 2, 0));
      at.x = clamp(at.x, -A.half + 0.8, A.half - 0.8);
      look = player.pos.clone().lerp(sky, 0.5);
      fov = 62;
    } else if (time < F.push + 0.6) {
      // Teto, screaming.
      at = sky.clone().addScaledVector(toT, -3).addScaledVector(side, 1.2).add(sdU.set(0, -0.8, 0));
      look = sky.clone();
      fov = 46;
      roll = 0.2;
      lines = 1;
    } else if (time < F.white) {
      // It lands.
      at = player.pos.clone().addScaledVector(side, 9).addScaledVector(toT, -5).add(sdU.set(0, 2, 0));
      look = player.pos.clone().add(sdU.set(0, 3, 0));
      fov = 60;
    } else if (time < F.leave) {
      // Down in the snow by her face, Teto hanging in the sky above.
      const hd = avatar.head.getWorldPosition(new THREE.Vector3());
      at = hd.clone().addScaledVector(toT, -1.1).addScaledVector(side, -0.6).add(sdU.set(0, 0.25, 0));
      look = hd.clone().lerp(sky, 0.4);
      fov = 50;
    } else {
      // Teto streaking away into the red.
      at = player.pos.clone().addScaledVector(toT, -6).add(sdU.set(0, 1.5, 0));
      look = t.pos.clone().add(sdU.set(0, Math.min(lift, 40) + 1, 0));
      fov = 55;
    }
    camera.position.copy(at);
    if (player.shake > 0) { shake(camera.position, player.shake * 0.35); player.shake = Math.max(0, player.shake - dt * 1.5); }
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(look);
    setFov(fov);
    drawSpeedLines(lines, time);
  }
  ambushOnce('dark', F.dark, () => { caption(''); $('boss-fade').classList.add('on'); });
  if (time >= F.end) wakeInClearing();
}

// Waking: the drift over her shivers, then bursts, and she comes up out of it onto her knees,
// gasping, gets to her feet, brushes the snow off her arms and shakes it out of her hair, and
// turns to look down the clearing.
const WAKE = { tremble: 1.0, burst: 1.8, rise: 3.6, stand: 4.6, brush: 4.8, shake: 6.2, look: 6.6 };

function updateWakeUp(dt, w) {
  const s = showdownScene, k = showdownKit, A = SHOWDOWN.arena, W = WAKE;
  if (!s.woke) {
    s.woke = true;
    s.hold = false;
    s.wbeat = 0;
    document.body.classList.remove('aftermath');
    $('view').classList.remove('kb');
    caption('');
    $('boss-fade').classList.remove('on');
    setScytheGlow(0);
    s.moundAt = k.mound.position.clone();
  }
  // Her heart, quickening as she comes round.
  s.wbeat -= dt;
  if (s.wbeat <= 0 && w < W.stand) { s.wbeat = lerp(1.1, 0.42, clamp(w / W.burst, 0, 1)); Sfx.tone(66, 34, 0.2, 0.55); }
  if (w < W.burst) {
    // Still under it, and then the drift starts to shiver.
    player.pos.y = A.y;
    poseLying(dt, player.pos);
    const tr = clamp((w - W.tremble) / (W.burst - W.tremble), 0, 1);
    for (const m of [k.mound, ...k.lumps]) m.position.y = A.y + (Math.random() - 0.5) * 0.05 * tr;
    if (Math.random() < dt * 20 * tr) k.debris.emit(sdV.copy(s.moundAt).add(sdU.set((Math.random() - 0.5) * 1.2, 0.4, (Math.random() - 0.5) * 1.2)), sdW.set(Math.random() - 0.5, 0.6, Math.random() - 0.5), { life: 0.6, size: 0.15, grow: 1, alpha: 0.8, fall: 6 });
  } else {
    if (!s.burst) {
      // Out!
      s.burst = true;
      k.mound.visible = false;
      for (const lump of k.lumps) lump.visible = false;
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        k.debris.emit(sdV.copy(s.moundAt).add(sdU.set(Math.cos(a) * 0.6, 0.3 + Math.random() * 0.5, Math.sin(a) * 0.6)), sdW.set(Math.cos(a) * (2 + Math.random() * 4), 3 + Math.random() * 5, Math.sin(a) * (2 + Math.random() * 4)), { life: 1.4, size: 0.5 + Math.random() * 0.5, grow: 2, alpha: 0.9, fall: 9 });
      }
      burst(s.moundAt.clone().add(sdU.set(0, 0.6, 0)), 0xf2f5ff, 40, 6);
      shockwave(s.moundAt, 3, 0xe8f0ff, 0.5);
      Sfx.snowSlam();
      Sfx.whoosh(0.6);
      Sfx.burst(0.5, 1800, 1, 0.3, 'bandpass');
      Sfx.crimsonVoice([[0, 560], [0.18, 820], [0.4, 700]], 0.12, { vowel: 'a', breath: 0.7 });
      player.shake = 0.4;
      player.bodyYaw = 0;
    }
    poseWake(dt, w);
    // Snow sliding off her as she moves, less and less of it.
    if (Math.random() < dt * 30 * (1 - clamp((w - W.burst) / 4, 0, 1))) {
      const from = (Math.random() < 0.5 ? avatar.head : avatar.chest).getWorldPosition(new THREE.Vector3());
      k.debris.emit(from.add(sdU.set((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4)), sdW.set((Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6), { life: 0.8, size: 0.12, grow: 1, alpha: 0.9, fall: 6 });
    }
  }
  if (w >= W.look && !s.saidAlive) { s.saidAlive = true; caption('...I\'m still here.', 'thought'); }
  // Shots.
  let at, look, fov = 50;
  if (w < W.burst) {
    at = s.moundAt.clone().add(sdU.set(1.6, 0.45, 0.8));
    look = s.moundAt.clone().add(sdU.set(0, 0.2, 0));
    fov = 46;
  } else if (w < W.rise + 0.4) {
    // Low in front of her as she comes up out of it.
    at = player.pos.clone().add(sdU.set(0.4, 0.55, 2.3));
    look = player.pos.clone().add(sdU.set(0, 0.75, 0));
    fov = 48;
  } else if (w < W.look) {
    // Round her slowly as she stands and shakes it off.
    const a = 0.5 + (w - W.rise) * 0.25;
    at = player.pos.clone().add(sdU.set(Math.sin(a) * 2.4, 1.4, Math.cos(a) * 2.4));
    look = player.pos.clone().add(sdU.set(0, 1.25, 0));
    fov = 46;
  } else {
    // Over her shoulder, down the long clearing to where the balloon is.
    const u = smooth(clamp((w - W.look) / 0.8, 0, 1));
    at = player.pos.clone().add(sdU.set(lerp(-1.6, -0.2, u), lerp(1.4, 1.5, u), lerp(1.6, -3.4, u)));
    look = player.pos.clone().add(sdU.set(0, 1.3, 8));
    fov = 52;
  }
  camera.position.copy(at);
  if (player.shake > 0) { shake(camera.position, player.shake * 0.3); player.shake = Math.max(0, player.shake - dt * 1.5); }
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  setFov(fov);
}

// Her body as she gets up: on her knees with a hand in the snow, up onto her feet, brushing
// off one arm and then the other, shaking out her hair.
function poseWake(dt, w) {
  const W = WAKE, k = showdownKit;
  player.pos.y = SHOWDOWN.arena.y;
  poseAvatar(dt, sdU.set(0, 0, 0), false);
  const kneel = 1 - smooth(clamp((w - W.rise) / (W.stand - W.rise), 0, 1));
  const { hips, chest, head, legL, legR, armL, armR } = avatar;
  hips.position.y -= 0.42 * kneel;
  for (const leg of [legL, legR]) { leg.thigh.rotation.x = lerp(leg.thigh.rotation.x, 0.1, kneel); leg.shin.rotation.x = lerp(leg.shin.rotation.x, 1.55, kneel); }
  chest.rotation.x += (0.5 + Math.sin(w * 7) * 0.08) * kneel + 0.1 * (1 - kneel);
  head.rotation.x += 0.35 * kneel;
  avatar.root.updateMatrixWorld(true);
  const sh = armL.upper.position;
  if (kneel > 0.5) {
    // A hand in the snow, the other on her knee, breathing hard.
    solveArm(armR, sdV.set(-Math.abs(sh.x) - 0.05, sh.y - 0.6, 0.38), POLE_R);
    solveArm(armL, sdV.set(Math.abs(sh.x), sh.y - 0.45, 0.28), POLE_L);
  } else if (w > W.brush && w < W.brush + 0.7) {
    // Her right hand down her left arm, twice.
    const p = (1 - Math.cos((w - W.brush) / 0.35 * Math.PI)) / 2;
    solveArm(armR, sdV.set(lerp(Math.abs(sh.x) - 0.02, Math.abs(sh.x) + 0.04, p), lerp(sh.y + 0.03, sh.y - 0.28, p), 0.14), POLE_R);
    solveArm(armL, sdV.set(Math.abs(sh.x) + 0.08, sh.y - 0.42, 0.06), POLE_L);
    if (Math.random() < 0.5) k.debris.emit(armR.hand.getWorldPosition(new THREE.Vector3()), sdW.set((Math.random() - 0.5) * 0.8, -0.2, (Math.random() - 0.5) * 0.8), { life: 0.6, size: 0.1, grow: 1, alpha: 0.9, fall: 6 });
  } else if (w > W.brush + 0.7 && w < W.brush + 1.4) {
    // And her left down her right.
    const p = (1 - Math.cos((w - W.brush - 0.7) / 0.35 * Math.PI)) / 2;
    solveArm(armL, sdV.set(lerp(-Math.abs(sh.x) + 0.02, -Math.abs(sh.x) - 0.04, p), lerp(sh.y + 0.03, sh.y - 0.28, p), 0.14), POLE_L);
    solveArm(armR, sdV.set(-Math.abs(sh.x) - 0.08, sh.y - 0.42, 0.06), POLE_R);
    if (Math.random() < 0.5) k.debris.emit(armL.hand.getWorldPosition(new THREE.Vector3()), sdW.set((Math.random() - 0.5) * 0.8, -0.2, (Math.random() - 0.5) * 0.8), { life: 0.6, size: 0.1, grow: 1, alpha: 0.9, fall: 6 });
  }
  if (w > W.shake && w < W.shake + 0.6) {
    // A hard shake of her head, snow flying out of her hair.
    head.rotation.y += Math.sin((w - W.shake) * 34) * 0.45 * (1 - (w - W.shake) / 0.6);
    if (Math.random() < 0.7) k.debris.emit(head.getWorldPosition(new THREE.Vector3()).add(sdU.set(0, 0.1, 0)), sdW.set((Math.random() - 0.5) * 3, 0.8, (Math.random() - 0.5) * 3), { life: 0.6, size: 0.12, grow: 1, alpha: 0.9, fall: 6 });
  }
  armL.hand.quaternion.identity();
  armR.hand.quaternion.identity();
  avatar.simulate(dt);
}

/* ---------- Afterwards ---------- */
// She comes to under the snow in the empty clearing, hurt, and has to drag herself all the
// way back down it to the balloon.
function wakeInClearing() {
  const k = showdownKit, A = SHOWDOWN.arena;
  k.mound.visible = false;
  for (const lump of k.lumps) lump.visible = false;
  clearFightFx();
  showScythe(false);
  caption('');
  document.body.classList.remove('aftermath');
  $('view').classList.remove('kb');
  showdown.stage = 'limp';
  showdown.injured = true;
  showdown.limp = { next: 0, t: 0, said: -9, idle: 0, stumble: 5 + Math.random() * 3, slow: 0 };
  subtitles.length = 0;
  document.body.classList.remove('boss-fight');
  document.body.classList.add('limp-walk');
  $('boss-bar').classList.add('hidden');
  $('sword-wave').classList.add('hidden');
  if (showdownScene && showdownScene.jet) showdownScene.jet.stop();
  showdownScene = null;
  k.snow.visible = true;
  fight.redFog = 0;
  scene.fog.color.setHex(FOG_COLOR);
  scene.fog.density = A.fog;
  player.pos.y = A.y;
  player.bodyYaw = player.yaw = 0;
  player.pitch = 0.05;
  survival.health = 32;
  survival.warmth = 55;
  avatar.reset();
  endScene();
  $('boss-fade').classList.remove('on');
  $('flash').className = '';
}

// The walk back: her thoughts as she goes, a stumble now and then, and the balloon at the end.
function updateLimp(dt) {
  const L = showdown.limp, A = SHOWDOWN.arena, lines = SHOWDOWN_LINES.limp;
  if (!L || L.arriving) return;
  L.t += dt;
  L.slow = Math.max(0, L.slow - dt);
  const next = lines[L.next];
  if (next && player.pos.z >= next[0] && L.t - L.said > 4.2) {
    say(next[1], 4);
    L.said = L.t;
    L.next++;
  }
  if (player.stride < 0.05) {
    L.idle += dt;
    if (L.idle > 10) { L.idle = 0; say(showdownLine('limpIdle'), 3); }
  } else {
    L.idle = 0;
    L.stumble -= dt;
    if (L.stumble <= 0) {
      // Her leg goes out from under her for a moment.
      L.stumble = 6 + Math.random() * 5;
      L.slow = 0.8;
      player.shake = Math.max(player.shake, 0.35);
      Sfx.thud();
      Sfx.crimsonVoice([[0, 330], [0.25, 260]], 0.08, { vowel: 'u', breath: 0.4 });
      if (Math.random() < 0.5) say(showdownLine('stumble'), 1.6);
    }
  }
  if (player.pos.z > A.length / 2 + A.balloon - 9) arriveAtBalloon();
}

function arriveAtBalloon() {
  showdown.limp.arriving = true;
  $('boss-fade').classList.add('on');
  setTimeout(() => {
    leaveArena();
    showdown.stage = 'injured';
    showdown.limp = null;
    const out = balloonSpot.out, side = balloonSpot.side;
    const x = balloonSpot.x + out.x * 5 + side.x * 2, z = balloonSpot.z + out.z * 5 + side.z * 2;
    player.pos.set(x, groundHeight(x, z), z);
    player.bodyYaw = player.yaw = Math.atan2(-out.x, -out.z);
    player.pitch = 0.05;
    world.stream(player.pos, Infinity);
    balloon.sag = 1;
    for (const hole of showdownKit.holes) if (hole.userData.glow) hole.userData.glow.visible = false;
    avatar.reset();
    $('boss-fade').classList.remove('on');
    subtitles.length = 0;
    say(showdownLine('wake'), 4);
    emitGame('tetoGone');
    showNote('Build a campfire (Tab) and sit by it (C) before you go near the balloon.');
  }, 900);
}

// Sitting at a fire after waking: the fairies come.
function showdownSat(fire) {
  if (showdown.stage !== 'injured') return false;
  showdownScene = { t: 0, fired: {}, fire };
  playScene({ update: updateFairies });
  return true;
}

const FAIRIES = { arrive: 0.6, lineA: 2.2, lineB: 5.6, heal: 8.6, end: 10.6 };

function updateFairies(dt) {
  const s = showdownScene, F = FAIRIES, k = showdownKit;
  s.t += dt;
  game.time += dt;
  const t = s.t;
  updateFires(dt);
  if (survival.sitting) poseSitting(dt);
  else poseAvatar(dt, sdU.set(0, 0, 0), false);
  avatar.simulate(dt);
  // They spiral in from the dark and swirl round her.
  const come = smooth(clamp((t - F.arrive) / 1.8, 0, 1)), go = smooth(clamp((t - F.heal - 0.6) / 1.4, 0, 1));
  for (const f of k.fairies) {
    const a = game.time * f.speed + f.phase;
    const r = lerp(9, f.r, come) + go * 6;
    f.sprite.visible = t > F.arrive;
    f.sprite.position.set(player.pos.x + Math.cos(a) * r, player.pos.y + f.h + Math.sin(a * 1.7) * 0.15 + go * 3, player.pos.z + Math.sin(a) * r);
    f.sprite.material.opacity = (1 - go) * (0.7 + 0.3 * Math.sin(a * 5));
    f.sprite.scale.setScalar(0.12 + 0.05 * Math.sin(a * 3));
  }
  ambushOnce('chime', F.arrive, () => Sfx.fairyChime());
  ambushOnce('a', F.lineA, () => caption(showdownLine('fairyA'), 'fairy'));
  ambushOnce('b', F.lineB, () => { Sfx.fairyChime(); caption(showdownLine('fairyB'), 'fairy'); });
  ambushOnce('heal', F.heal, () => {
    caption('');
    impact('white', 140);
    Sfx.fairyChime();
    for (let i = 0; i < 3; i++) burst(player.pos.clone().add(sdU.set(0, 0.8, 0)), 0x8dff9a, 20, 3);
    showdown.injured = false;
    survival.health = 100;
    survival.warmth = 100;
    showdown.stage = 'repair';
  });
  // A slow turn round her by the fire.
  const a = t * 0.18;
  camera.position.set(player.pos.x + Math.sin(a) * 3.2, player.pos.y + 1.6, player.pos.z + Math.cos(a) * 3.2);
  camera.lookAt(player.pos.x, player.pos.y + 0.8, player.pos.z);
  setFov(50);
  if (t >= F.end) {
    for (const f of k.fairies) f.sprite.visible = false;
    showdownScene = null;
    endScene();
    say(showdownLine('healed'), 4);
    if (typeof saveGame === 'function') saveGame();
  }
}

/* ---------- The balloon, afterwards ---------- */
function showdownRepairLabel() {
  const R = SHOWDOWN.repair;
  if (showdown.stage === 'repaired') return 'Press E to climb into the balloon';
  if (showdown.stage === 'repair') return `Press E to patch the balloon: ${Math.min(packCount('wolfpelt'), R.wolfpelt)}/${R.wolfpelt} wolf pelts, ${Math.min(packCount('pelt'), R.pelt)}/${R.pelt} hare pelts`;
  return 'I can\'t climb in like this. Build a campfire and sit by it (C) first.';
}

// The frame, once the balloon has been shot. True if this handled it.
function showdownUseFrame() {
  const R = SHOWDOWN.repair;
  if (showdown.stage === 'none') { startAmbush(); return true; }
  if (showdown.stage === 'repaired') { liftOff(); return true; }
  if (showdown.stage === 'repair') {
    if (packCount('wolfpelt') >= R.wolfpelt && packCount('pelt') >= R.pelt) {
      packTake('wolfpelt', R.wolfpelt);
      packTake('pelt', R.pelt);
      showdown.stage = 'repaired';
      for (const hole of showdownKit.holes) hole.visible = false;
      balloon.sag = 0;
      balloon.burnHold = 2.5;
      Sfx.hammer();
      Sfx.burnerLight();
      toast('The balloon is patched');
      say(showdownLine('repaired'), 3.5);
      if (typeof saveGame === 'function') saveGame();
    } else {
      showNote(`Still need ${Math.max(0, R.wolfpelt - packCount('wolfpelt'))} wolf pelts and ${Math.max(0, R.pelt - packCount('pelt'))} hare pelts.`);
    }
    return true;
  }
  if (showdown.stage === 'injured') {
    showNote('Not like this. Build a campfire (Tab) and sit by it (C) first.');
    say('I can barely stand. A fire first. Sit. Breathe.', 3);
    return true;
  }
  return false;
}

// Aboard at last: the balloon's own lift-off and climb through the cloud into the dawn
// (balloon.js), with END PART 1 coming up over the last of it.
function liftOff() {
  showdown.stage = 'leaving';
  BALLOON_LINES.launch = showdownLine('leave');
  startBalloonLaunch();
}

function endPartOne() {
  showdown.stage = 'done';
  game.state = 'ending';
  document.exitPointerLock();
  $('hud').classList.add('hidden');
  Sfx.dawnChime();
  $('end-part').classList.remove('hidden');
}

// The tracker's goal while this part of the story plays out, or null.
function showdownObjective() {
  if (showdown.stage === 'limp') return 'limpBack';
  if (showdown.stage === 'injured') return 'mendFire';
  if (showdown.stage === 'repair') return 'repair';
  if (showdown.stage === 'repaired') return 'board';
  return null;
}

/* ---------- Hooks for the player (game.js) ---------- */
// Keeps her inside the clearing.
function showdownClamp(pos, pad = 0.5) {
  if (!arenaActive() && showdown.stage !== 'finale') return;
  const A = SHOWDOWN.arena;
  // Walking back she can go on down the avenue to the balloon.
  if (showdown.stage === 'limp') {
    const front = A.length / 2;
    pos.z = clamp(pos.z, -front + pad, front + A.balloon - 6);
    const w = A.half + Math.max(0, pos.z - front) * 0.32 + (pos.z > front ? 1.5 : 0);
    pos.x = clamp(pos.x, -w + pad, w - pad);
    pos.y = A.y;
    return;
  }
  pos.x = clamp(pos.x, -A.half + pad, A.half - pad);
  pos.z = clamp(pos.z, -A.length / 2 + pad, A.length / 2 - pad);
  pos.y = A.y;
}

// While she's knocked down the fight moves her itself. True if it posed her this frame.
function showdownHoldsPlayer(dt) {
  if (!fight.knocked || showdown.stage !== 'fight') return false;
  player.stride = 0;
  poseLying(dt, player.pos);
  return true;
}

function showdownPosePlayer() {
  if (showdown.stage === 'fight' && !fight.knocked) poseScytheArms();
  // Hurt, she limps: she drops onto her good leg and drags the bad one, bent over.
  if (showdown.injured && player.stride > 0.02) {
    const s = player.stride, ph = player.walkPhase;
    avatar.hips.position.y -= Math.max(0, Math.sin(ph)) * 0.07 * s;
    avatar.hips.rotation.z += Math.sin(ph) * 0.09 * s;
    avatar.chest.rotation.x += 0.22 * s;
    avatar.chest.rotation.z -= Math.sin(ph) * 0.06 * s;
    avatar.legL.shin.rotation.x *= 0.25;
    avatar.legL.thigh.rotation.x *= 0.6;
    // A hand clamped to her hip.
    avatar.root.updateMatrixWorld(true);
    const sh = avatar.armR.upper.position;
    solveArm(avatar.armR, sdV.set(-Math.abs(sh.x) - 0.09, sh.y - 0.4, 0.07), POLE_R);
    avatar.armR.hand.quaternion.identity();
  }
}

// Hurt, she can only limp.
function showdownSpeed() {
  // Holding the beam she can barely shuffle.
  if (showdown.stage === 'fight' && fight.beamT >= 0) return 0.35;
  if (!showdown.injured) return 1;
  return showdown.limp && showdown.limp.slow > 0 ? 0.12 : 0.48;
}

// The fight has its own music, from the moment the scythe lights until the clearing burns.
function showdownMusic() {
  return showdown.music ? 'teto' : null;
}

// Losing to Teto sends her back to her last save (to the top of the fight, if there's none),
// rather than ending the run.
function showdownCatchDeath() {
  if (showdown.stage !== 'fight' || fight.over) return showdown.stage === 'fight';
  survival.health = 1;
  fight.over = true;
  fight.knocked = null;
  fight.swing = null;
  clearFightFx();
  for (const beam of showdownKit.rails) beam.visible = false;
  $('boss-hint').classList.add('hidden');
  tetoSays(showdownLine('won'), 2);
  Sfx.tetoLaugh();
  setTimeout(() => $('boss-fade').classList.add('on'), 600);
  setTimeout(() => { if (showdown.stage === 'fight' && fight.over) showDeathScreen('teto'); }, 1500);
  return true;
}

// The snow settling over her plays as stills: true while the current still is already on screen.
function showdownFrozen() {
  const s = showdownScene;
  if (showdown.stage !== 'finale' || !s || !s.hold) return false;
  if (s.drawn === s.frame) return true;
  s.drawn = s.frame;
  return false;
}

// For testing (and the moderator menu): the balloon built and waiting, and her at it.
function showdownJumpTo() {
  if (showdown.stage !== 'none' || game.state !== 'playing') return;
  giveBalloonParts();
  if (!balloon.assembled) { survival.planks -= BALLOON.planks; raiseBalloon(); }
  const out = balloonSpot.out;
  teleport({ x: balloonSpot.x + out.x * 2.6, z: balloonSpot.z + out.z * 2.6 });
  startAmbush();
}

/* ---------- Each frame, and runs ---------- */
function updateShowdown(dt) {
  if (!showdownKit) return;
  if (showdown.stage === 'limp') updateLimp(dt);
  if (showdown.stage === 'fight') {
    fight.invuln = Math.max(0, fight.invuln - dt);
    // A big hit holds the moment: Teto all but stops for a beat.
    fight.hitStop = Math.max(0, fight.hitStop - dt);
    fight.slow = Math.max(0, (fight.slow || 0) - dt);
    fight.perfectCd = Math.max(0, (fight.perfectCd || 0) - dt);
    document.body.classList.toggle('bullet-time', fight.slow > 0);
    const tdt = (fight.hitStop > 0 ? dt * 0.1 : dt) * (fight.slow > 0 ? 0.3 : 1);
    updateOrbs(tdt);
    updateRocks(tdt);
    if (!fight.over) {
      if (fight.knocked) updateKnocked(dt);
      updateTetoFight(tdt);
      updateStrikes(dt);
    } else {
      poseTeto(dt, 'idle', mikuChest(sdU.clone()));
    }
    updateBullets(tdt);
    scytheFlames(dt);
    wolfAttack.cooldown = Math.max(wolfAttack.cooldown, 30);
    // Low on health, her heart pounds.
    if (survival.health < 35 && !fight.over) {
      fight.beatT -= dt;
      if (fight.beatT <= 0) {
        fight.beatT = 0.4 + survival.health / 50;
        Sfx.tone(72, 38, 0.16, 0.55);
        setTimeout(() => Sfx.tone(64, 34, 0.18, 0.4), 170);
      }
    }
  } else {
    document.body.classList.remove('bullet-time');
  }
  // Hurt, she limps: the view dips with every other step.
  if (showdown.injured && player.stride > 0.05) player.shake = Math.max(player.shake, 0.02);
  updateShowdownFx(dt);
  updatePopTexts(dt);
}

function resetShowdown() {
  if (!showdownKit) return;
  const k = showdownKit;
  if (activeScene && showdownScene) endScene();
  showdownScene = null;
  Object.assign(showdown, { stage: 'none', hp: SHOWDOWN.teto.hp, hits: 0, knocks: 0, injured: false });
  fight.over = false;
  fight.knocked = null;
  setShortHair(false);
  showScythe(false);
  leaveArena();
  k.teto.setVisible(false);
  k.mound.visible = false;
  for (const lump of k.lumps) lump.visible = false;
  for (const f of k.fairies) f.sprite.visible = false;
  for (const hole of k.holes) hole.parent && hole.parent.remove(hole);
  k.holes.length = 0;
  balloon.sag = 0;
  $('boss-bar').classList.add('hidden');
  $('boss-hint').classList.add('hidden');
  $('boss-fade').classList.remove('on');
  $('end-part').classList.add('hidden');
  document.body.classList.remove('boss-fight');
}

function initShowdown() {
  buildShowdownDom();
  showdownKit = buildShowdownKit();
  // The scythe is warm to hold.
  HEAT_SOURCES.push(() => (arenaActive() ? 25 : 0));
  resetShowdown();
}
