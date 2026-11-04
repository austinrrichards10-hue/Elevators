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
  teto: { hp: 1500, keep: [7, 13], walk: 3.4, dash: 11, reach: 0.55 },
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
    wave: { windup: 0.42, speed: 26, life: 1.5, damage: 36, radius: 1.7, cooldown: 2.4 },
    beam: { charge: 0.7, damage: 70, radius: 1.3, blast: 3.4, cooldown: 7, range: 48 },
  },
  finaleAt: 0.1,
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
  wake: 'Everything hurts. The balloon... I need a fire.',
  healed: 'I can feel my legs again. Five wolf pelts and ten hare pelts. Right.',
  repaired: 'Patched. It\'ll hold. It has to.',
};

/* ---------- State ---------- */
const showdown = {
  // 'none', 'ambush' (the scene at the balloon), 'fight', 'finale', 'buried', 'injured' (she
  // wakes hurt, until a fire), 'repair' (healed, gathering pelts), 'repaired', 'done'.
  stage: 'none',
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
  waveCd: 0, waveT: -1,
  beamCd: 0, beamT: -1,
  knocked: null, // { t, need, presses, dodged, done, at } while she's down
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
    if (section % 2 === 1) for (const [at, note, beats] of this.hook[chordIndex]) if (at === inChord) s.synthAt(note, t, beats * len * 0.92, 0.03, { cutoff: 2600, echo: true });
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
}

function glowOrb(color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(color).multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sprite.scale.setScalar(size);
  sprite.visible = false;
  scene.add(sprite);
  return sprite;
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
  const count = 6000, box = { w: 44, h: 26 };
  const base = new Float32Array(count * 3), speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    base[i * 3] = Math.random() * box.w;
    base[i * 3 + 1] = Math.random() * box.h;
    base[i * 3 + 2] = Math.random() * box.w;
    speed[i] = 2.2 + Math.random() * 2.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.085, map: TEX.softDot, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.9 }));
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  const wrap = (v, size) => ((v % size) + size) % size;
  points.userData.update = (dt, time, center) => {
    const out = geo.attributes.position.array;
    const gust = 2.6 + Math.sin(time * 0.4) * 1.4;
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
  bar.innerHTML = '<p class="boss-name"><span class="boss-kicker">Final battle</span><span class="boss-title">Teto</span></p><div class="bar boss-health"><i class="boss-lag"></i><i class="boss-fill"></i><b class="boss-tick" style="left:66%"></b><b class="boss-tick" style="left:33%"></b><b class="boss-tick" style="left:10%"></b></div>';
  const taunt = document.createElement('div');
  taunt.id = 'boss-taunt';
  const hint = document.createElement('div');
  hint.id = 'boss-hint';
  hint.className = 'hidden';
  hint.innerHTML = '<p>Mash SPACE to roll clear!</p><div class="boss-mash"><i></i></div>';
  const skills = document.createElement('div');
  skills.id = 'sword-wave';
  skills.className = 'hidden';
  skills.innerHTML = '<span class="skill" id="skill-wave"><kbd>RMB</kbd> Heat wave<i></i></span><span class="skill" id="skill-beam"><kbd>Q</kbd> Blue beam<i></i></span>';
  hud.append(bar, taunt, hint, skills);
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
  const jets = pool(160, 0xffa070);
  const debris = pool(160, 0xe8ecf6, 1);
  const smoke = buildPuffs(80, 0x6d6670);
  scene.add(smoke.group);
  // The heat wave: two crossed crescents of white-blue fire.
  const crescent = new THREE.TorusGeometry(1.3, 0.14, 8, 40, Math.PI * 0.95).rotateX(Math.PI / 2).rotateY(Math.PI * 0.025 + Math.PI / 2);
  const waveMesh = new THREE.Group();
  for (const [tilt, s] of [[0.5, 1], [-0.5, 1], [0, 1.25]]) {
    const m = new THREE.Mesh(crescent, additive(new THREE.Color(s > 1 ? 0x3d8bff : 0xb5ecff).multiplyScalar(2.6), s > 1 ? 0.45 : 0.9));
    m.rotation.z = tilt;
    m.scale.setScalar(s);
    waveMesh.add(m);
  }
  waveMesh.visible = false;
  scene.add(waveMesh);
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
  // The snow that covers her, a soft white mound that grows over her.
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 1 }));
  mound.visible = false;
  scene.add(mound);
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
  const scythe = buildScythe();
  return {
    teto, scythe, strands: [buildHairStrand(), buildHairStrand()],
    flames, sparks, trails, jets, debris, smoke, waveMesh, sights, muzzleFlash, fairies, mound, shocks, tetoLight,
    arena: buildArena(),
    snow: buildHeavySnow(),
    bullets: buildBullets(90),
    rails: [buildBeam(0xff2d6f, 0.2), buildBeam(0xff2d6f, 0.2)],
    giant: buildBeam(0xff4d86, 3.2),
    mikuBeam: buildBeam(0x3d8bff, 0.2),
    cracks: [buildCrack(crackTex, 0xff2d6f), buildCrack(crackTex, 0xff2d6f), buildCrack(crackTex, 0x4da0ff)],
    orbs: [glowOrb(0xff4d7a, 0.4), glowOrb(0xff4d7a, 0.4)],
    bigOrb: glowOrb(0xff86b0, 1),
    tipOrb: glowOrb(0x6fb6ff, 0.4),
    blast: glowOrb(0xffffff, 1),
    holes: [],
  };
}

/* ---------- Helpers ---------- */
function arenaActive() {
  return showdown.stage === 'fight' || (showdown.stage === 'ambush' && !!showdownScene && showdownScene.inArena) || showdown.stage === 'finale';
}

// A point in the arena, from its own coordinates (x across, z along, y up from the snow).
function arenaPoint(out, x, y, z) {
  return out.set(x, SHOWDOWN.arena.y + y, z);
}

function tetoMuzzle(i, out) {
  return showdownKit.teto.head.localToWorld(out.copy(SHOWDOWN.muzzles[i]));
}

function tetoChest(out) {
  return out.copy(fight.teto.pos).add(sdU.set(0, 1.0, 0));
}

function mikuChest(out) {
  return out.copy(player.pos).add(sdU.set(0, 1.0, 0));
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
  for (let i = 0; i < 40 * size; i++) {
    const v = sdW.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 7 * size);
    k.flames.emit(at, v, { life: 0.45 + Math.random() * 0.3, size: 0.5 + Math.random() * 0.6 * size, grow: 2.2, alpha: 0.9 });
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
  } else {
    k.scythe.visible = false;
  }
  bowModel.group.visible = !on;
  $('sword-wave').classList.toggle('hidden', !on || showdown.stage !== 'fight');
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
  } else if (fight.waveT >= 0) {
    // Whirled overhead, faster and faster, then brought down to loose the wave.
    const u = clamp(fight.waveT / S.wave.windup, 0, 1);
    const a = fight.waveT * (10 + fight.waveT * 30);
    const down = smooth(clamp((fight.waveT - S.wave.windup * 0.75) / 0.2, 0, 1));
    placeScythe(0, lerp(1.95, 1.2, down), lerp(0.15, 0.7, down), sdU.set(Math.cos(a), 0, Math.sin(a)), SD_UP);
    gripScythe(armR, 0, POLE_R);
    solveArm(armL, target(1, 0.1, lerp(0.35, -0.1, down) + u * 0.05, lerp(0.1, 0.4, down)), POLE_L);
  } else if (fight.beamT >= 0) {
    // Levelled like a lance, a blade at Teto, both hands on the shaft.
    const kick = fight.beamT > S.beam.charge ? Math.max(0, 1 - (fight.beamT - S.beam.charge) * 4) : 0;
    placeScythe(0.05, 1.22, 0.38 - kick * 0.15, sdU.set(0, 0.04, 1), SD_UP);
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
  const hot = fight.swing || fight.waveT >= 0 || fight.beamT >= 0 ? 5 : 2;
  s.updateMatrixWorld(true);
  for (let i = 0; i < hot; i++) {
    const p = u.samples[Math.floor(Math.random() * u.samples.length)];
    if (Math.abs(p.y) > u.uniforms.uReveal.value) continue;
    s.localToWorld(sdV.copy(p));
    k.flames.emit(sdV, sdW.set((Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.7, (Math.random() - 0.5) * 0.3), { life: 0.3, size: 0.09 + Math.random() * 0.08, grow: 1.4, alpha: 0.85 });
  }
}

/* ---------- The ambush ---------- */
const AMBUSH = {
  shot: 1.0, sag: 1.6, walk: 3.4, laugh: 3.7, lineA: 4.6, lineB: 6.3, dash: 7.6, grab: 7.9, lineC: 8.0,
  spin: 9.4, throw: 10.0, white: 11.7, land: 11.95, drop: 13.0, quake: 13.6, arrive: 14.3, rise: 15.0,
  rip: 16.0, forge: 16.8, ready: 18.4, swordLine: 19.6, end: 21.2,
};

// She goes to climb into the balloon.
function startAmbush() {
  if (showdown.stage !== 'none' || !balloonModel) return;
  showdown.stage = 'ambush';
  if (typeof crimsonVanish === 'function' && crimson.phase !== 'gone') crimsonVanish();
  const out = balloonSpot.out, side = balloonSpot.side;
  // Teto steps out of the trees off to the side of the clearing.
  const tx = balloonSpot.x + out.x * 13 + side.x * 7, tz = balloonSpot.z + out.z * 13 + side.z * 7;
  fight.teto.pos.set(tx, groundHeight(tx, tz), tz);
  showdownScene = { t: 0, fired: {}, inArena: false, from: player.pos.clone(), bullets: [], steps: 0 };
  survival.tool = 'bow';
  survival.swing = null;
  showdownKit.teto.setVisible(true);
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
  s.t += dt;
  game.time += dt;
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

  // Teto: out of the trees at a slow walk, a dash, and the grab.
  let tetoMode = 'idle', tetoSpeed = 0, tetoLook = mikuChest(sdU.clone()), crouch = 0;
  if (!s.inArena) {
    k.tetoLight.intensity = t > A.walk ? 3 + Math.sin(t * 9) * 0.6 : 0;
    if (t < A.walk) {
      tetoMode = 'point';
      tetoLook = new THREE.Vector3(spot.x, spot.y + 12, spot.z);
    } else if (t < A.dash) {
      const want = sdV.copy(player.pos).addScaledVector(out, -0.9);
      const d = Math.hypot(want.x - tt.pos.x, want.z - tt.pos.z);
      if (d > 4.5) {
        const step = Math.min(d, 1.6 * dt);
        tt.pos.x += (want.x - tt.pos.x) / d * step;
        tt.pos.z += (want.z - tt.pos.z) / d * step;
        tetoSpeed = 1.6;
        // Every footfall a thud you feel.
        const steps = Math.floor(tt.walk / Math.PI);
        if (steps !== s.steps) { s.steps = steps; Sfx.footfall(); player.shake = Math.max(player.shake, 0.05); }
      }
      tt.pos.y = groundHeight(tt.pos.x, tt.pos.z);
      if (Math.random() < dt * 10) { tetoMuzzle(Math.random() < 0.5 ? 0 : 1, sdW); k.smoke.emit(sdW, sdU.set(0, 0.6, 0), { life: 1.6, size: 0.22, grow: 3, alpha: 0.55 }); }
    } else if (t < A.grab) {
      // A blur across the snow.
      if (!s.dashFrom) { s.dashFrom = tt.pos.clone(); Sfx.whoosh(0.4); }
      const want = sdV.copy(player.pos).addScaledVector(sdW.set(s.dashFrom.x - player.pos.x, 0, s.dashFrom.z - player.pos.z).normalize(), 0.9);
      tt.pos.lerpVectors(s.dashFrom, want, smooth((t - A.dash) / (A.grab - A.dash)));
      tt.pos.y = groundHeight(tt.pos.x, tt.pos.z);
      k.debris.emit(tt.pos.clone().add(sdU.set(0, 0.2, 0)), sdW.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3), { life: 0.8, size: 0.6, grow: 2, alpha: 0.7, fall: 9 });
      tetoSpeed = 9;
    } else {
      tetoMode = 'grab';
    }
    if (t < A.spin) tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
  }
  ambushOnce('stinger', A.walk, () => Sfx.stinger());
  ambushOnce('laugh', A.laugh, () => Sfx.tetoLaugh());
  ambushOnce('lineA', A.lineA, () => tetoSays(showdownLine('ambushA')));
  ambushOnce('lineB', A.lineB, () => tetoSays(showdownLine('ambushB')));
  ambushOnce('grab', A.grab, () => { Sfx.thud(); impact('invert', 60); s.grabFrom = player.pos.clone(); });
  ambushOnce('lineC', A.lineC, () => tetoSays(showdownLine('ambushC')));
  ambushOnce('spin', A.spin, () => { Sfx.whoosh(0.7); s.spinYaw = tt.yaw; });
  ambushOnce('throw', A.throw, () => {
    Sfx.whoosh(1.4);
    Sfx.crimsonVoice([[0, 150], [0.35, 240]], 0.2, { vowel: 'a', breath: 0.4 });
    impact('invert', 90);
    s.throwFrom = player.pos.clone();
    s.throwDir = sdW.set(player.pos.x - tt.pos.x, 0, player.pos.z - tt.pos.z).normalize().clone();
    burst(s.throwFrom.clone(), 0xff86b0, 30, 7);
    player.shake = 0.5;
  });
  ambushOnce('white', A.white, () => { impact('white', 260); Sfx.branchSnap(); drawSpeedLines(0, 0); enterArena(); });
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
    if (t < A.grab) {
      player.bodyYaw = t < A.shot + 0.6 ? Math.atan2(spot.x - player.pos.x, spot.z - player.pos.z) : Math.atan2(tt.pos.x - player.pos.x, tt.pos.z - player.pos.z);
      poseAvatar(dt, sdU.set(0, 0, 0), false);
      // Reaching for the basket's rim, before the shot.
      if (t < A.shot + 0.3) {
        avatar.root.updateMatrixWorld(true);
        const sh = avatar.armR.upper.position;
        solveArm(avatar.armR, sdV.set(-Math.abs(sh.x) - 0.05, sh.y - 0.05 + smooth(t / A.shot) * 0.15, 0.42 * smooth(t / A.shot)), POLE_R);
        avatar.armR.hand.quaternion.identity();
      }
      avatar.simulate(dt);
    } else if (t < A.spin) {
      // Lifted off her feet by the collar, kicking.
      const lift = smooth((t - A.grab) / 0.4) * 0.45;
      player.pos.copy(s.grabFrom);
      player.pos.y = groundHeight(player.pos.x, player.pos.z) + lift;
      player.bodyYaw = Math.atan2(tt.pos.x - player.pos.x, tt.pos.z - player.pos.z);
      poseAvatar(dt, sdU.set(0, 0, 0), false);
      avatar.legL.thigh.rotation.x = Math.sin(t * 11) * 0.4;
      avatar.legR.thigh.rotation.x = -Math.sin(t * 11) * 0.4;
      avatar.simulate(dt);
    } else if (t < A.throw) {
      // Whirled round her once, faster and faster.
      const u = (t - A.spin) / (A.throw - A.spin);
      tt.yaw = s.spinYaw + Math.PI * 2 * u * u;
      player.pos.set(tt.pos.x + Math.sin(tt.yaw) * 1.1, tt.pos.y + 0.7 + u * 0.4, tt.pos.z + Math.cos(tt.yaw) * 1.1);
      player.bodyYaw = tt.yaw + Math.PI;
      poseFalling(dt, t, player.pos.clone().add(sdU.set(0, 0.2, 0)), 0.4);
    } else {
      // Hurled: low and fast over the trees, through the tops of them.
      const u = (t - A.throw) / (A.white - A.throw);
      player.pos.copy(s.throwFrom).addScaledVector(s.throwDir, u * 48);
      player.pos.y = s.throwFrom.y + Math.sin(u * Math.PI * 0.85) * 13;
      player.bodyYaw = Math.atan2(s.throwDir.x, s.throwDir.z);
      poseFalling(dt, t * 2.2, player.pos, 1.3);
      // Through the branches: snow bursting off them, twigs snapping.
      s.branchT = (s.branchT || 0) - dt;
      if (s.branchT <= 0 && u > 0.12) {
        s.branchT = 0.16 + Math.random() * 0.14;
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
      k.jets.emit(tt.pos.clone().add(sdU.set(0, 1.4, 0)), sdW.set(0, 6, 0), { life: 0.25, size: 0.5, grow: 2, alpha: 0.6 });
    } else {
      tt.pos.y = SHOWDOWN.arena.y;
      crouch = 1 - smooth(clamp((t - A.quake - 0.4) / 0.9, 0, 1));
    }
    tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
    k.tetoLight.intensity = 3.5 + Math.sin(t * 9) * 0.6;
  }
  poseTeto(dt, tetoMode, tetoLook, { speed: tetoSpeed, crouch });
  updateShowdownFx(dt);

  // Shots.
  let camAt, look, roll = 0;
  if (!s.inArena) {
    if (t < A.shot) {
      // Behind her as she reaches for the basket.
      camAt = sdV.copy(player.pos).addScaledVector(out, 2.4).addScaledVector(side, 0.9).add(sdU.set(0, 1.55, 0));
      look = new THREE.Vector3(spot.x, spot.y + 1.6, spot.z);
      setFov(50);
    } else if (t < A.walk) {
      // Up at the silk as the rounds tear through it.
      const u = (t - A.shot) / (A.walk - A.shot);
      camAt = sdV.set(spot.x, spot.y, spot.z).addScaledVector(out, 20 - u * 3).addScaledVector(side, -8).add(sdU.set(0, 2, 0));
      look = new THREE.Vector3(spot.x, spot.y + 11 - u * 2, spot.z);
      setFov(52);
      if (t < A.shot + 1.2) shake(camAt, 0.2);
    } else if (t < A.dash) {
      // Low and tilted on Teto, walking out of the trees, hair smoking.
      const toT = sdW.set(tt.pos.x - player.pos.x, 0, tt.pos.z - player.pos.z).normalize();
      if (t < A.lineB) {
        camAt = sdV.copy(tt.pos).addScaledVector(toT, -3.8).addScaledVector(sdU.set(toT.z, 0, -toT.x), 2.2).add(sdU.set(0, 0.5, 0));
        look = tt.pos.clone().add(sdU.set(0, 1.45, 0));
        setFov(40);
        roll = 0.12;
      } else {
        camAt = sdV.copy(player.pos).addScaledVector(toT, -2.4).add(sdU.set(0, 1.6, 0)).addScaledVector(side, 0.8);
        look = tt.pos.clone().add(sdU.set(0, 1.2, 0));
        setFov(44);
      }
    } else if (t < A.spin) {
      // Round the two of them, slowly, as she holds Miku up.
      const a = (t - A.dash) * 0.45;
      const mid = sdW.lerpVectors(tt.pos, player.pos, 0.5);
      camAt = sdV.set(mid.x + Math.sin(a) * side.x * 3 + Math.cos(a) * out.x * 3, mid.y + 1.3, mid.z + Math.sin(a) * side.z * 3 + Math.cos(a) * out.z * 3);
      look = mid.clone().add(sdU.set(0, 1.3, 0));
      setFov(42);
    } else if (t < A.throw) {
      camAt = sdV.copy(tt.pos).addScaledVector(out, 5).addScaledVector(side, 2).add(sdU.set(0, 2.2, 0));
      look = tt.pos.clone().add(sdU.set(0, 1.2, 0));
      setFov(56);
      shake(camAt, 0.08);
    } else {
      // Chasing her through the air.
      const sideT = sdW.set(s.throwDir.z, 0, -s.throwDir.x);
      camAt = sdV.copy(player.pos).addScaledVector(s.throwDir, -4.5).addScaledVector(sideT, 1.4).add(sdU.set(0, 1.4, 0));
      look = player.pos.clone().addScaledVector(s.throwDir, 4);
      setFov(78);
      roll = Math.sin(t * 3) * 0.15;
      shake(camAt, 0.12);
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
  for (const b of k.bullets) { b.life = 0; b.mesh.visible = false; }
  for (const beam of [...k.rails, k.giant, k.mikuBeam, ...k.sights]) beam.visible = false;
  for (const o of [...k.orbs, k.bigOrb, k.tipOrb, k.blast, ...k.muzzleFlash]) o.visible = false;
  for (const c of k.cracks) { c.visible = false; c.material.opacity = 0; }
  k.waveMesh.visible = false;
  fight.wave = null;
  fight.beam = null;
  fight.beamT = -1;
  fight.waveT = -1;
}

function leaveArena() {
  const k = showdownKit;
  k.arena.visible = false;
  k.snow.visible = false;
  if (k.farBalloon) k.farBalloon.visible = false;
  k.tetoLight.intensity = 0;
  scene.fog.density = FOG_DENSITY;
  clearFightFx();
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
  Object.assign(fight, { swing: null, combo: 0, comboT: 0, queued: false, waveCd: 0, waveT: -1, beamCd: 0, beamT: -1, beam: null, knocked: null, invuln: 1.5, hitStop: 0, tauntT: 5, over: false });
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

function damageTeto(amount, heavy = false) {
  const t = fight.teto;
  if (showdown.stage !== 'fight') return;
  const mult = t.state === 'cool' ? SHOWDOWN.scythe.open : 1;
  const stageBefore = fightStage();
  showdown.hp = Math.max(0, showdown.hp - amount * mult);
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
    Sfx.tetoLaugh();
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
  showdown.hits = 0;
  fight.swing = null;
  fight.waveT = -1;
  fight.beamT = -1;
  k.tipOrb.visible = false;
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
function updateTetoFight(dt) {
  const t = fight.teto, G = SHOWDOWN.gatling, k = showdownKit, st = fightStage();
  t.t += dt;
  t.flash = Math.max(0, t.flash - dt);
  t.whipT -= dt;
  t.dashT -= dt;
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

  // Too close outside her rest, she whips her hair round, or dashes clear.
  if (t.state !== 'cool' && t.state !== 'whip' && t.state !== 'rail' && dist < SHOWDOWN.whip.range) {
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
    if (t.t >= t.dur) Object.assign(t, { state: 'aim', t: 0, dur: G.aim[st] });
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
  poseTeto(dt, mode, look, { speed, u: t.state === 'whip' ? clamp(t.t / SHOWDOWN.whip.windup, 0, 1) : 0 });

  fight.tauntT -= dt;
  if (fight.tauntT <= 0) { fight.tauntT = 7 + Math.random() * 5; tetoSays(showdownLine('taunts'), 1.8); }
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

function fireBullet(i, dir, sweep) {
  const k = showdownKit;
  const b = k.bullets.find((x) => x.life <= 0);
  if (!b) return;
  const G = SHOWDOWN.gatling;
  tetoMuzzle(i, b.pos);
  b.vel.copy(dir).applyAxisAngle(SD_UP, sweep + (Math.random() - 0.5) * G.spread).add(sdU.set(0, (Math.random() - 0.5) * G.spread, 0)).normalize().multiplyScalar(G.speed);
  b.life = 1.6;
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
      if (player.dodge && player.dodge.t < 0.5) { if (!b.hissed) { b.hissed = true; Sfx.bulletHiss(); } }
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
  return fight.swing || fight.waveT >= 0 || fight.beamT >= 0;
}

function showdownClick(button) {
  if (showdown.stage !== 'fight' || fight.knocked || fight.over) return;
  if (button === 2) {
    if (fight.waveCd > 0 || busyStriking()) return;
    fight.waveT = 0;
    faceTeto();
    Sfx.heatWave();
    return;
  }
  if (button !== 0) return;
  if (fight.swing) { if (fight.swing.t > fight.swing.dur * 0.45) fight.queued = true; return; }
  if (busyStriking()) return;
  startStrike();
}

// Q: the blue beam.
function showdownBeam() {
  if (showdown.stage !== 'fight' || fight.knocked || fight.over || fight.beamCd > 0 || busyStriking()) return false;
  fight.beamT = 0;
  faceTeto();
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
  fight.waveCd = Math.max(0, fight.waveCd - dt);
  fight.beamCd = Math.max(0, fight.beamCd - dt);
  $('skill-wave').classList.toggle('ready', fight.waveCd <= 0);
  $('skill-wave').querySelector('i').style.width = `${(1 - fight.waveCd / S.wave.cooldown) * 100}%`;
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
  // The heat wave: the scythe whirled overhead and brought down, and twin crescents of fire
  // roll out, spinning.
  if (fight.waveT >= 0) {
    fight.waveT += dt;
    if (fight.waveT >= S.wave.windup && !fight.wave) {
      const dir = new THREE.Vector3(Math.sin(player.bodyYaw), 0, Math.cos(player.bodyYaw));
      fight.wave = { pos: player.pos.clone().add(sdU.set(0, 1, 0)).addScaledVector(dir, 0.8), dir, life: S.wave.life, hit: false, spin: 0 };
      fight.waveCd = S.wave.cooldown;
      impact('invert', 40);
      shockwave(player.pos, 3, 0x6fc6ff, 0.4);
      Sfx.whoosh(0.5);
    }
    if (fight.waveT >= S.wave.windup + 0.15) fight.waveT = -1;
  }
  const w = fight.wave;
  if (w) {
    w.life -= dt;
    w.spin += dt * 9;
    w.pos.addScaledVector(w.dir, S.wave.speed * dt);
    const yaw = Math.atan2(w.dir.x, w.dir.z);
    k.waveMesh.visible = true;
    k.waveMesh.position.copy(w.pos);
    k.waveMesh.rotation.set(0, yaw, 0);
    k.waveMesh.children[0].rotation.z = 0.5 + Math.sin(w.spin) * 0.3;
    k.waveMesh.children[1].rotation.z = -0.5 - Math.sin(w.spin) * 0.3;
    k.waveMesh.scale.setScalar(1 + (S.wave.life - w.life) * 0.5);
    for (const m of k.waveMesh.children) m.material.opacity = Math.min(m.scale.x > 1 ? 0.45 : 0.9, w.life * 2);
    for (let i = 0; i < 6; i++) k.flames.emit(sdV.copy(w.pos).add(sdW.set((Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 0.9, -0.3).applyAxisAngle(SD_UP, yaw)), sdW.set(0, 0.8, 0), { life: 0.4, size: 0.35, grow: 1.6, alpha: 0.85 });
    k.debris.emit(sdV.copy(w.pos).setY(SHOWDOWN.arena.y + 0.1), sdW.set((Math.random() - 0.5) * 2, 2, 0), { life: 0.6, size: 0.5, grow: 2, alpha: 0.6, fall: 9 });
    if (!w.hit && Math.hypot(w.pos.x - t.pos.x, w.pos.z - t.pos.z) < S.wave.radius) {
      w.hit = true;
      damageTeto(S.wave.damage, true);
      explode(tetoChest(sdV).clone(), 0x6fb6ff, 0.6);
    }
    if (w.life <= 0 || Math.abs(w.pos.x) > SHOWDOWN.arena.half + 4) { fight.wave = null; k.waveMesh.visible = false; }
  }
  // The blue beam: the scythe levelled, light gathering at the blade's tip, then a lance of
  // blue fire that blows up wherever it lands.
  if (fight.beamT >= 0) {
    const B = S.beam;
    fight.beamT += dt;
    const sc = k.scythe;
    sc.updateMatrixWorld(true);
    const tip = sc.localToWorld(sdV.copy(sc.userData.tipA));
    if (fight.beamT < B.charge) {
      faceTeto(30);
      const u = fight.beamT / B.charge;
      k.tipOrb.position.copy(tip);
      k.tipOrb.scale.setScalar(0.2 + u * 1.2 + Math.random() * 0.1);
      k.tipOrb.visible = true;
      const from = sdW.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.2);
      k.flames.emit(sdU.copy(tip).add(from), from.multiplyScalar(-1 / 0.2), { life: 0.2, size: 0.12, grow: 0.4, alpha: 0.9 });
    } else if (!fight.beam) {
      // Fire: at Teto if she's anywhere ahead, otherwise straight on.
      const dir = sdW.set(Math.sin(player.bodyYaw), 0, Math.cos(player.bodyYaw));
      const toT = tetoChest(sdU).sub(tip);
      const aimed = toT.clone().normalize();
      if (aimed.dot(dir) > 0.7 && toT.length() < B.range) dir.copy(aimed);
      let end = tip.clone().addScaledVector(dir, B.range);
      const hitT = segmentDistance(tip, end, sdU.copy(t.pos).add(sdX.set(0, 0.3, 0)), t.pos.clone().add(sdX.set(0, 1.6, 0))) < B.radius;
      if (hitT) end = tetoChest(sdU).clone();
      else if (dir.y < -0.01) end = tip.clone().addScaledVector(dir, (tip.y - SHOWDOWN.arena.y) / -dir.y);
      fight.beam = { t: 0, from: tip.clone(), to: end };
      aimBeam(k.mikuBeam, tip, end, 1);
      k.tipOrb.visible = false;
      fight.beamCd = B.cooldown;
      Sfx.beamFire();
      impact('invert', 50);
      player.shake = 0.3;
      explode(end, 0x4da0ff, 1.2);
      // A blue scar left in the snow where it hit.
      const scar = k.cracks[2];
      scar.position.copy(end).setY(SHOWDOWN.arena.y + 0.03);
      scar.scale.setScalar(4);
      scar.material.opacity = 1;
      scar.userData.fade = 0.4;
      scar.visible = true;
      if (hitT) damageTeto(B.damage, true);
      else if (Math.hypot(end.x - t.pos.x, end.z - t.pos.z) < B.blast) damageTeto(B.damage * 0.5, true);
    }
    if (fight.beam) {
      fight.beam.t += dt;
      const fade = 1 - clamp((fight.beam.t - 0.15) / 0.35, 0, 1);
      k.mikuBeam.scale.x = k.mikuBeam.scale.y = Math.max(0.001, fade * (1 + Math.random() * 0.2));
      if (fade <= 0) { k.mikuBeam.visible = false; fight.beam = null; fight.beamT = -1; }
    }
  }
}

/* ---------- The finale ---------- */
const FINALE = { lift: 1.2, charge: 3.6, fire: 5.2, white: 5.6, still: 7.2, frames: 9, every: 0.55, dark: 13.4, end: 15 };

function startFinale() {
  if (showdown.stage !== 'fight') return;
  showdown.stage = 'finale';
  fight.swing = null;
  fight.knocked = null;
  player.dodge = null;
  $('boss-hint').classList.add('hidden');
  $('sword-wave').classList.add('hidden');
  clearFightFx();
  showdownScene = { t: 0, fired: {}, inArena: true, frame: -1, from: fight.teto.pos.clone() };
  playScene({ update: updateFinale });
}

function updateFinale(dt) {
  const s = showdownScene, F = FINALE, k = showdownKit, t = fight.teto;
  s.t += dt;
  game.time += dt;
  const time = s.t;
  ambushOnce('line', 0.2, () => tetoSays(showdownLine('finale')));
  ambushOnce('jets', F.lift, () => { s.jet = Sfx.jet(); s.jet.set(0.6, 0.3); });
  // Up on her hair, jets of flame pouring down from the drills.
  const lift = smooth(clamp((time - F.lift) / 2.2, 0, 1)) * 15;
  t.yaw = Math.atan2(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
  if (time > F.lift && time < F.white) {
    for (let i = 0; i < 2; i++) {
      tetoMuzzle(i, sdV);
      k.jets.emit(sdV, sdW.set((Math.random() - 0.5) * 1.2, -9 - Math.random() * 4, (Math.random() - 0.5) * 1.2), { life: 0.4, size: 0.5, grow: 2.5, alpha: 0.9 });
    }
  }
  if (time < F.white) poseTeto(dt, time > F.lift ? 'fly' : 'idle', mikuChest(sdU.clone()), { lift });
  // The charge: a huge orb gathering between her drills, the clearing cracking under Miku.
  if (time > F.charge && time < F.fire + 0.4) {
    const u = smooth((time - F.charge) / (F.fire - F.charge));
    tetoMuzzle(0, sdV); tetoMuzzle(1, sdW);
    k.bigOrb.position.lerpVectors(sdV, sdW, 0.5).add(sdU.set(0, -0.3, 0));
    k.bigOrb.scale.setScalar(0.5 + u * 4 + Math.random() * 0.3);
    k.bigOrb.visible = true;
    const crack = k.cracks[1];
    crack.visible = true;
    crack.position.copy(player.pos).setY(SHOWDOWN.arena.y + 0.03);
    crack.scale.setScalar(2 + u * 12);
    crack.material.opacity = u * (0.7 + Math.random() * 0.3);
    k.tetoLight.intensity = 4 + u * 10;
    player.shake = Math.max(player.shake, u * 0.15);
  }
  ambushOnce('charge', F.charge, () => Sfx.railCharge());
  ambushOnce('fire', F.fire, () => {
    Sfx.railFire();
    Sfx.boom(1);
    aimBeam(k.giant, k.bigOrb.position, player.pos.clone(), 1);
    explode(player.pos.clone().add(sdU.set(0, 0.5, 0)), 0xff6a9a, 2);
    if (s.jet) { s.jet.stop(); s.jet = null; }
  });
  ambushOnce('white', F.white, () => {
    $('flash').className = 'white';
    k.giant.visible = false;
    k.bigOrb.visible = false;
    k.cracks[1].visible = false;
    k.teto.setVisible(false);
    k.tetoLight.intensity = 0;
    showScythe(false);
    $('boss-bar').classList.add('hidden');
    showdown.music = false;
    Sfx.playMusic(null);
  });
  // Miku: on her feet looking up, then flat in the snow.
  if (time < F.white) {
    player.bodyYaw = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
    poseAvatar(dt, sdU.set(0, 0, 0), false);
    poseScytheArms();
    avatar.simulate(dt);
    scytheFlames(dt);
  } else {
    poseLying(dt, player.pos);
  }
  updateShowdownFx(dt);
  // Frame by frame: the snow settling on her, a still every so often.
  if (time >= F.still) {
    const frame = Math.min(F.frames - 1, Math.floor((time - F.still) / F.every));
    if (frame !== s.frame) {
      s.frame = frame;
      if (frame === 0) { $('flash').className = ''; k.snow.visible = false; }
      const u = (frame + 1) / F.frames;
      k.mound.visible = true;
      k.mound.position.copy(player.pos);
      k.mound.scale.set(0.5 + u * 0.6, 0.05 + u * 0.45, 0.9 + u * 0.45);
      k.mound.rotation.y = player.bodyYaw + 1;
      k.mound.material.opacity = 1;
      s.stillCam = { at: player.pos.clone().add(sdU.set(0.4, 2.6 - u * 0.4, 1.2)), look: player.pos.clone() };
      Sfx.burst(0.3, 3200, 0.6, 0.04, 'highpass');
    }
    camera.position.copy(s.stillCam.at);
    camera.up.set(0, 1, 0);
    camera.lookAt(s.stillCam.look);
    setFov(46);
    // The world stands still between stills.
    s.hold = true;
  } else if (time < F.white) {
    const toT = sdW.set(t.pos.x - player.pos.x, 0, t.pos.z - player.pos.z).normalize();
    camera.position.copy(player.pos).addScaledVector(toT, -3).add(sdU.set(0, 1.0, 0));
    camera.lookAt(t.pos.clone().add(sdU.set(0, lift + 1.2, 0)));
    setFov(56);
    if (time > F.fire) shake(camera.position, 0.3);
    else if (player.shake > 0) shake(camera.position, player.shake * 0.4);
  }
  ambushOnce('dark', F.dark, () => { $('boss-fade').classList.add('on'); });
  if (time >= F.end) wakeInjured();
}

/* ---------- Afterwards ---------- */
// She comes to by the ruined balloon, hurt.
function wakeInjured() {
  const k = showdownKit;
  k.mound.visible = false;
  leaveArena();
  showdown.stage = 'injured';
  showdown.injured = true;
  document.body.classList.remove('boss-fight');
  $('boss-bar').classList.add('hidden');
  if (showdownScene && showdownScene.jet) showdownScene.jet.stop();
  showdownScene = null;
  const out = balloonSpot.out, side = balloonSpot.side;
  const x = balloonSpot.x + out.x * 5 + side.x * 2, z = balloonSpot.z + out.z * 5 + side.z * 2;
  player.pos.set(x, groundHeight(x, z), z);
  player.bodyYaw = player.yaw = Math.atan2(-out.x, -out.z);
  player.pitch = 0.05;
  world.stream(player.pos, Infinity);
  balloon.sag = 1;
  for (const hole of k.holes) if (hole.userData.glow) hole.userData.glow.visible = false;
  survival.health = 32;
  survival.warmth = 55;
  avatar.reset();
  endScene();
  $('boss-fade').classList.remove('on');
  $('flash').className = '';
  say(showdownLine('wake'), 4);
  emitGame('tetoGone');
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
  return 'The balloon is shot full of holes. I can\'t fix it like this.';
}

// The frame, once the balloon has been shot. True if this handled it.
function showdownUseFrame() {
  const R = SHOWDOWN.repair;
  if (showdown.stage === 'none') { startAmbush(); return true; }
  if (showdown.stage === 'repaired') { endPartOne(); return true; }
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
  if (showdown.stage === 'injured') { showNote('Not like this. I need a fire first.'); return true; }
  return false;
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
}

// Hurt, she can only limp.
function showdownSpeed() {
  return showdown.injured ? 0.55 : 1;
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
  const save = typeof readSave === 'function' ? readSave() : null;
  if (!save) { setTimeout(restartFight, 900); return true; }
  setTimeout(() => $('boss-fade').classList.add('on'), 600);
  setTimeout(() => { loadGame(); toast('Back to your last save'); }, 1500);
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
  if (showdown.stage === 'fight') {
    fight.invuln = Math.max(0, fight.invuln - dt);
    // A big hit holds the moment: Teto all but stops for a beat.
    fight.hitStop = Math.max(0, fight.hitStop - dt);
    const tdt = fight.hitStop > 0 ? dt * 0.1 : dt;
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
  }
  // Hurt, she limps: the view dips with every other step.
  if (showdown.injured && player.stride > 0.05) player.shake = Math.max(player.shake, 0.02);
  updateShowdownFx(dt);
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
