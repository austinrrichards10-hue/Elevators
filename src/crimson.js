// Crimson Curls, the other survivor, asleep in the snow off the wreck's nose. A fire lit
// beside her warms her awake: she sits bolt upright, panics, and runs screaming into the
// forest, where the wolves are waiting. Her satchel is all that's left in the snow.

/* ---------- Config ---------- */
const CRIMSON = {
  wakeRadius: 7, // a fire this close to her warms her awake
  delay: 1.1, // seconds between the fire catching and her stirring
  runMin: 10, runMax: 13.5, // how far into the trees she gets, in metres
  prints: 40, // footprints she leaves on the way
};

// The scene's beats, in seconds from its start.
const CRIMSON_T = {
  stir: 0.55, // a foot twitches, then a hand
  face: 1.75, // close on her hand, fingers twitching in the snow
  bolt: 2.6, // bolt upright
  look: 2.95, // where ARE we
  spot: 4.25, // she sees the fire, and Twin Tails
  scramble: 5.05, // onto her knees
  stand: 5.5, // and up
  panic: 5.95, // the wailing, on her feet
  flee: 8.85, // she turns to run
  spin: 9.2, // legs going like wheels before she moves
  launch: 9.55, // and she's off
  wide: 10.35, // from the clearing, down the line of her run
  burst: 10.6, // the wolves come out of the trees
  leap: 11.2, // the first one jumps
  hit: 11.55,
  crowd: 11.6, // cut to the wolves crowding the spot
  leave: 12.85, // they trot off into the trees
  deadpan: 13.95, // Twin Tails, by her fire
  end: 15.75,
};

// What Crimson says, in case the story's words for her are missing.
const CRIMSON_LINES = {
  check: 'She\'s breathing, but she won\'t wake. Her lips are going blue.',
  checkFire: 'If I could get a fire going right beside her, the warmth might bring her round.',
  wake: 'WHERE ARE WE?!',
  panic: ['Who are YOU? Where\'s the PILOT?', 'Is that FIRE? Why is there FIRE?', 'I have a SHOW on FRIDAY!'],
  flee: 'Nope. No. Absolutely NOT!',
  scream: 'AAAAAAAAAAAAH!',
  after: ['...', 'Well. The fire worked.', 'Her bag came down over there. She won\'t be needing it.'],
};

// What spills from her satchel where she fell.
const CRIMSON_SATCHEL = ['note:crimson-diary', 'note:flight-manifest', 'chocolate', 'chocolate', 'warmer', 'warmer', 'scarf'];

/* ---------- State ---------- */
const crimson = {
  phase: 'asleep', // 'asleep', 'scene' while it plays, then 'gone'
  pending: null, // { fire, t } while the warmth is reaching her
  fell: null, // { x, z } where the wolves took her
  satchel: [], // { id, handle, taken } for what lies there
  marker: [{ x: 0, z: 0, kind: 'crimson', label: 'Crimson\'s satchel' }],
};

// Everything the scene needs while it runs. Vectors are made once and reused.
const crimsonScene = {
  t: 0,
  T: CRIMSON_T, // this telling's beats
  fired: {},
  home: new THREE.Vector3(), // where she lay, on the ground
  fire: new THREE.Vector3(),
  at: new THREE.Vector3(), // her hips' spot on the ground
  origin: new THREE.Vector3(), // where her run starts
  fall: new THREE.Vector3(), // where it ends
  forward: new THREE.Vector3(), // the way she faces sitting up
  side: new THREE.Vector3(), // her side that faces into the clearing
  run: new THREE.Vector3(),
  runSide: new THREE.Vector3(),
  toHer: new THREE.Vector3(), // from the fire to her
  sideCam: new THREE.Vector3(),
  wideCam: new THREE.Vector3(),
  crowdCam: new THREE.Vector3(),
  baseYaw: 0, runYaw: 0, runLen: 12, fireLook: 0,
  phase: 0, // her stride
  stepSide: 0,
  looks: [],
  lines: [],
  gesture: 2, lastGesture: 2, gestureAt: 0,
  wolves: [],
  scream: null,
  snowT: 0,
  speed: 0,
  saidAfter: false,
  props: null,
};

const crimsonCam = new THREE.Vector3(), crimsonAim = new THREE.Vector3(), crimsonHead = new THREE.Vector3();
const crimsonYawQ = new THREE.Quaternion(), crimsonTiltQ = new THREE.Quaternion(), crimsonPivot = new THREE.Vector3();
const crimsonStill = new THREE.Vector3();
const crimsonTmp = new THREE.Vector3(), crimsonTmp2 = new THREE.Vector3();

/* ---------- Her lines ---------- */
function crimsonText(key) {
  const text = LORE.crimson && LORE.crimson[key];
  return typeof text === 'string' && text ? text : CRIMSON_LINES[key];
}

function crimsonList(key) {
  const list = LORE.crimson && LORE.crimson[key];
  if (Array.isArray(list) && list.length) return list;
  if (typeof list === 'string' && list) return [list];
  return CRIMSON_LINES[key];
}

// A caption in her voice, which pops in afresh with every line.
function crimsonSay(text, cls = 'crimson') {
  caption(text, cls);
  const el = $('cine-caption');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

/* ---------- Sounds ---------- */
// Vowel formants for her voice: [frequency, Q, gain].
const CRIMSON_VOWELS = {
  a: [[850, 5, 1], [1300, 6, 0.6], [2900, 8, 0.25]],
  e: [[520, 5, 1], [1900, 7, 0.55], [2700, 8, 0.25]],
  i: [[330, 5, 0.9], [2400, 8, 0.6], [3200, 9, 0.25]],
  o: [[560, 5, 1], [950, 6, 0.6], [2600, 8, 0.15]],
  u: [[380, 5, 1], [850, 6, 0.4], [2500, 8, 0.1]],
  m: [[280, 4, 1], [1200, 6, 0.08]],
  scream: [[1150, 4, 1], [1750, 5, 0.7], [3100, 7, 0.35]],
};

Object.assign(Sfx, {
  // A voice: a buzzy tone shaped by vowel formants, with a breath of noise. `points` are
  // [seconds, pitch], starting `delay` seconds from now. A held voice keeps going until
  // its handle's stop(), which cuts it off dead.
  crimsonVoice(points, level, { delay = 0, vowel = 'a', vibrato = 0, rate = 6, breath = 0.15, hold = false } = {}) {
    if (!this.ctx) return { stop() {} };
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const end = points[points.length - 1][0];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + Math.min(0.04, end * 0.3));
    if (!hold) {
      out.gain.setValueAtTime(level, t + end * 0.7);
      out.gain.exponentialRampToValueAtTime(0.0001, t + end);
    }
    out.connect(this.master);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(points[0][1], t);
    for (const [at, freq] of points.slice(1)) osc.frequency.linearRampToValueAtTime(freq, t + at);
    const nodes = [osc];
    if (vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const depth = ctx.createGain();
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(osc.frequency);
      nodes.push(lfo);
    }
    for (const [freq, q, gain] of CRIMSON_VOWELS[vowel]) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain * 3;
      osc.connect(filter).connect(g).connect(out);
    }
    if (breath) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.value = breath;
      src.connect(filter).connect(g).connect(out);
      nodes.push(src);
    }
    const stopAt = t + (hold ? 10 : end + 0.05);
    for (const node of nodes) { node.start(t); node.stop(stopAt); }
    return {
      stop() {
        const now = ctx.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + 0.025);
        for (const node of nodes) { try { node.stop(now + 0.05); } catch { /* already stopped */ } }
      },
    };
  },
  // Gabble in her voice, roughly as long as the line, higher and louder when she shouts.
  crimsonChatter(text) {
    const shout = /[!?]/.test(text) || /[A-Z]{3}/.test(text);
    const count = clamp(Math.round(text.length / 3.4), 3, 10);
    const vowels = ['a', 'e', 'i', 'o', 'a', 'e'];
    let at = 0;
    for (let i = 0; i < count; i++) {
      const len = 0.07 + Math.random() * 0.06;
      const pitch = (shout ? 520 : 420) * (0.9 + Math.random() * 0.25) * (i === count - 1 && /\?/.test(text) ? 1.25 : 1);
      this.crimsonVoice([[0, pitch], [len, pitch * (0.92 + Math.random() * 0.2)]], shout ? 0.16 : 0.11, { delay: at, vowel: vowels[Math.floor(Math.random() * vowels.length)], breath: 0.08 });
      at += len + 0.015 + Math.random() * 0.03;
    }
  },
  crimsonMmm() { this.crimsonVoice([[0, 290], [0.3, 320], [0.65, 265]], 0.12, { vowel: 'm', breath: 0.04 }); },
  // The sharp breath as she jolts awake, and a cartoon spring under it.
  crimsonGasp() {
    this.burst(0.28, 2600, 1.2, 0.22, 'bandpass');
    this.crimsonVoice([[0, 620], [0.13, 1300], [0.22, 1150]], 0.2, { vowel: 'i', breath: 0.5 });
    this.glide([[0, 170], [0.12, 560], [0.38, 430]], 0.06, 'sine', 40);
  },
  // Revving up: legs going like wheels.
  crimsonZip() { this.glide([[0, 180], [0.32, 880]], 0.04, 'square'); this.burst(0.35, 900, 1, 0.18, 'bandpass'); },
  // A long, wobbling scream, held until it's cut short.
  crimsonScream() {
    return this.crimsonVoice([[0, 820], [0.16, 1180], [0.5, 1120], [1.2, 1210], [2, 1150], [4, 1100], [9, 980]], 0.1, { vowel: 'scream', vibrato: 34, rate: 8.5, breath: 0.3, hold: true });
  },
  crimsonRustle(level = 1) { this.burst(0.3 + Math.random() * 0.2, 1100 + Math.random() * 600, 0.8, 0.16 * level, 'bandpass'); },
});

/* ---------- Props ---------- */
// Her satchel, flap thrown open, with her phone beside it; a patch of trampled snow; and
// the footprints of her run.
function buildCrimsonProps() {
  const leather = new THREE.MeshStandardMaterial({ color: 0xf2a7c3, roughness: 0.5 });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0xf6e7d8, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.8, roughness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xc9b6ff, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.15, metalness: 0.4 });
  const satchel = new THREE.Group();
  const part = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    satchel.add(mesh);
    return mesh;
  };
  // Tipped on its back, the flap open on the snow behind it.
  part(new THREE.BoxGeometry(0.34, 0.11, 0.22), leather, 0, 0.055, 0, 0, 0, 0.05);
  part(new THREE.BoxGeometry(0.34, 0.014, 0.16), leather, 0, 0.012, -0.19, 0.12);
  part(new THREE.BoxGeometry(0.05, 0.02, 0.03), gold, 0, 0.018, -0.27);
  part(new THREE.TorusGeometry(0.27, 0.012, 6, 28, Math.PI * 1.25), strapMat, 0.05, 0.012, 0.16, Math.PI / 2, 0, 0.6);
  // Her phone, face down, in a glittery lilac case.
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.01, 0.158), pink));
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.148), glass);
  screen.position.y = -0.005;
  phone.add(screen);
  phone.position.set(0.42, 0.008, 0.2);
  phone.rotation.set(0, 0.7, Math.PI);
  satchel.add(phone);
  satchel.visible = false;
  scene.add(satchel);

  // The trampled snow, draped over the ground where it's placed.
  const patch = new THREE.Mesh(
    new THREE.RingGeometry(0.01, 1.8, 22, 4).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x7d89ad, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  patch.visible = false;
  scene.add(patch);

  const prints = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5f6c8e, transparent: true, opacity: 0.42, depthWrite: false }),
    CRIMSON.prints,
  );
  prints.frustumCulled = false;
  prints.count = 0;
  scene.add(prints);

  const snow = buildPuffs(40, 0xf2f5ff, true);
  scene.add(snow.group);
  return { satchel, patch, prints, snow, dummy: new THREE.Object3D() };
}

function crimsonPrint(x, z, yaw) {
  const { prints, dummy } = crimsonScene.props;
  if (prints.count >= CRIMSON.prints) return;
  dummy.position.set(x, groundHeight(x, z) + 0.035, z);
  dummy.rotation.set(0, yaw, 0);
  dummy.scale.set(0.15, 1, 0.3);
  dummy.updateMatrix();
  prints.setMatrixAt(prints.count, dummy.matrix);
  prints.count++;
  prints.instanceMatrix.needsUpdate = true;
}

// Where the wolves took her: the trampled snow, her satchel, and what spilled from it.
function crimsonLeaveSatchel() {
  const s = crimsonScene, { satchel, patch } = s.props;
  const fall = s.fall;
  const y = groundHeight(fall.x, fall.z);
  if (!patch.visible) {
    patch.position.set(fall.x, y, fall.z);
    const pos = patch.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeight(fall.x + pos.getX(i), fall.z + pos.getZ(i)) - y + 0.04);
    pos.needsUpdate = true;
    patch.visible = true;
    const sx = fall.x + s.runSide.x * 0.35, sz = fall.z + s.runSide.z * 0.35;
    satchel.position.set(sx, groundHeight(sx, sz), sz);
    satchel.rotation.y = s.runYaw + 2.4;
    satchel.visible = true;
  }
  if (crimson.satchel.length) return;
  CRIMSON_SATCHEL.forEach((id, i) => {
    const a = s.runYaw + 0.5 + i * 0.93, r = 0.75 + (i % 3) * 0.32;
    crimsonTmp.set(fall.x + Math.sin(a) * r, 0, fall.z + Math.cos(a) * r);
    pushOutOfColliders(crimsonTmp, 0.3);
    crimson.satchel.push({ id, handle: spawnWorldItem(id, crimsonTmp.x, crimsonTmp.z), taken: false });
  });
}

// A pickup near where she fell crosses its item off, so the map stops pointing there once
// the satchel's empty.
function crimsonTookItem(id) {
  if (crimson.phase !== 'gone' || !crimson.fell) return;
  if (Math.hypot(crimson.fell.x - player.pos.x, crimson.fell.z - player.pos.z) > 8) return;
  const item = crimson.satchel.find((i) => !i.taken && i.id === id);
  if (item) item.taken = true;
}

/* ---------- Her body ---------- */
// A pose: joint angles and hand targets (in the chest's coordinates). The scene builds two
// and blends between them, so every move eases from the last.
function crimsonPoseObject() {
  return {
    tilt: 0, hipY: 0.17, fwd: 0, thighL: 0, shinL: 0, thighR: 0, shinR: 0, splayL: 0, splayR: 0,
    hipsX: 0, hipsY: 0, chestX: 0, chestY: 0, chestZ: 0, headX: 0, headY: 0, headZ: 0, flick: 0,
    handL: new THREE.Vector3(), handR: new THREE.Vector3(), poleL: new THREE.Vector3(), poleR: new THREE.Vector3(),
  };
}
const CRIMSON_POSE_KEYS = ['tilt', 'hipY', 'fwd', 'thighL', 'shinL', 'thighR', 'shinR', 'splayL', 'splayR', 'hipsX', 'hipsY', 'chestX', 'chestY', 'chestZ', 'headX', 'headY', 'headZ', 'flick'];
const crimsonPoses = { a: crimsonPoseObject(), b: crimsonPoseObject(), out: crimsonPoseObject(), gA: crimsonPoseObject(), gB: crimsonPoseObject() };

function crimsonBlend(a, b, w, out) {
  for (const key of CRIMSON_POSE_KEYS) out[key] = a[key] + (b[key] - a[key]) * w;
  out.handL.lerpVectors(a.handL, b.handL, w);
  out.handR.lerpVectors(a.handR, b.handR, w);
  out.poleL.lerpVectors(a.poleL, b.poleL, w);
  out.poleR.lerpVectors(a.poleR, b.poleR, w);
  return out;
}

// A rise and fall over `len` seconds from `at`.
function crimsonBump(t, at, len) {
  const u = (t - at) / len;
  return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
}

// Eases past the end and settles back: the snap of sitting bolt upright.
function crimsonOvershoot(u) {
  const c = 2.2, v = u - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
}

// Snaps between held values: each key whips to its value in a few frames and holds.
function crimsonKeys(keys, t, whip = 0.09) {
  let v = 0;
  for (const [at, value] of keys) if (t >= at) v += (value - v) * smooth((t - at) / whip);
  return v;
}

// Two-bone leg: the thigh and knee angles that put her foot on the ground `foot` metres
// ahead of the hip, with the hips `hipY` above the ground.
function crimsonLeg(p, side, hipY, foot) {
  const c = survivor.avatar;
  const upper = -c.legL.shin.position.y;
  const lower = c.dims.hips + c.legL.thigh.position.y - 0.075 - upper;
  const drop = Math.max(0.05, hipY + c.legL.thigh.position.y - 0.075);
  const d = Math.min(Math.hypot(drop, foot), upper + lower - 0.001);
  const reach = Math.atan2(foot, drop);
  const hip = Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  const knee = Math.acos(clamp((upper * upper + lower * lower - d * d) / (2 * upper * lower), -1, 1));
  p[`thigh${side}`] = -(reach + hip);
  p[`shin${side}`] = Math.PI - knee;
}

function crimsonArms(p, lx, ly, lz, rx, ry, rz) {
  p.handL.set(lx, ly, lz);
  p.handR.set(rx, ry, rz);
}

function crimsonPoles(p, x, y, z) {
  p.poleL.set(x, y, z);
  p.poleR.set(-x, y, z);
}

// Flat on her back, as the crash left her, breathing slowly. As the warmth reaches her a
// foot twitches, then a hand, and her face turns towards the fire.
function crimsonLie(p, t) {
  const T = crimsonScene.T;
  const s = survivor.avatar.armL.upper.position;
  Object.assign(p, {
    tilt: -(Math.PI / 2 - 0.06), hipY: 0.13, fwd: 0, thighL: -0.35, shinL: 0.6, thighR: 0, shinR: 0.05, splayL: 0.08, splayR: -0.05,
    hipsX: 0, hipsY: 0, chestX: Math.sin(t * 1.3) * 0.025, chestY: 0, chestZ: 0, headX: 0, headY: 0.5, headZ: 0.15, flick: 0,
  });
  crimsonArms(p, s.x + 0.3, s.y - 0.32, 0.02, -s.x - 0.2, s.y - 0.36, -0.06);
  crimsonPoles(p, 0.42, -0.78, -0.42);
  const foot = crimsonBump(t, T.stir, 0.2), hand = crimsonBump(t, T.stir + 0.55, 0.24);
  p.shinR += foot * 0.45;
  p.thighR -= foot * 0.16;
  p.handR.y += hand * 0.07;
  p.handR.z += hand * 0.06;
  p.headY -= span(t, T.stir + 0.9, T.stir + 1.5) * 0.35;
  // Close up, her fingers flick twice, then go still.
  p.flick = crimsonBump(t, T.face + 0.25, 0.14) + crimsonBump(t, T.face + 0.55, 0.12) * 0.8;
}

// Bolt upright, propped on her hands.
function crimsonSit(p) {
  const s = survivor.avatar.armL.upper.position;
  Object.assign(p, {
    tilt: 0, hipY: 0.17, fwd: 0, thighL: -1.62, shinL: 0.45, thighR: -1.5, shinR: 0.3, splayL: 0.12, splayR: -0.1,
    hipsX: 0, hipsY: 0, chestX: 0.1, chestY: 0, chestZ: 0, headX: 0.05, headY: 0, headZ: 0,
  });
  crimsonArms(p, s.x + 0.06, s.y - 0.3, -0.15, -s.x - 0.06, s.y - 0.3, -0.15);
  crimsonPoles(p, 0.5, -0.2, -0.85);
}

// Still sitting, hands to her cheeks, her head whipping round.
function crimsonLook(p, t) {
  const sc = crimsonScene;
  crimsonSit(p);
  const look = crimsonKeys(sc.looks, t);
  // Seeing the fire, she recoils.
  const recoil = span(t, sc.T.spot, sc.T.spot + 0.12);
  p.chestX = -0.04 - recoil * 0.16;
  p.chestY = look * 0.3;
  p.headX = -0.12 - recoil * 0.1;
  p.headY = look * 0.7;
  p.headZ = Math.sin(t * 15) * 0.04 * recoil;
  crimsonArms(p, 0.07, 0.31, 0.1, -0.07, 0.31, 0.1);
  crimsonPoles(p, 0.35, -0.9, 0.25);
}

// Scrambling onto her knees, hands pushing off.
function crimsonCrouch(p) {
  const s = survivor.avatar.armL.upper.position;
  Object.assign(p, { tilt: 0, hipY: 0.5, fwd: 0.22, splayL: 0.16, splayR: -0.16, hipsX: 0, hipsY: 0, chestX: 0.75, chestY: 0, chestZ: 0, headX: -0.5, headY: 0, headZ: 0 });
  crimsonLeg(p, 'L', 0.5, 0.2);
  crimsonLeg(p, 'R', 0.5, 0.1);
  crimsonArms(p, s.x + 0.08, s.y - 0.3, 0.16, -s.x - 0.08, s.y - 0.3, 0.16);
  crimsonPoles(p, 0.42, -0.78, -0.42);
}

// A gesture for one arm, one per line she wails: clutching her head, flapping, hands to
// her cheeks, and waving at the sky.
function crimsonGesture(kind, t, side, hand, pole) {
  if (kind === 0) {
    hand.set(side * 0.1, 0.4, 0.0);
    pole.set(side * 0.9, 0.35, -0.2);
  } else if (kind === 1) {
    hand.set(side * 0.33, 0.14 + Math.sin(t * 24 + side) * 0.1, 0.1);
    pole.set(side * 0.4, -0.8, -0.4);
  } else if (kind === 2) {
    hand.set(side * 0.07, 0.31, 0.1);
    pole.set(side * 0.35, -0.9, 0.25);
  } else {
    hand.set(side * 0.15, 0.52 + Math.sin(t * 20 + side * 1.5) * 0.05, 0.08 + Math.cos(t * 20 + side) * 0.06);
    pole.set(side * 0.9, 0.2, -0.3);
  }
}

// The gestures her standing lines cycle through: clutching her head, flapping, waving.
const CRIMSON_GESTURES = [0, 1, 3];

// On her feet, hopping from foot to foot, head shaking.
function crimsonPanic(p, t) {
  const sc = crimsonScene;
  const hop = Math.sin(t * 11);
  Object.assign(p, { tilt: 0, hipY: 0.9 - Math.abs(hop) * 0.04, fwd: 0.35, splayL: 0.05, splayR: -0.05, hipsX: 0, hipsY: hop * 0.08, chestX: -0.06, chestY: 0, chestZ: hop * 0.05, headX: -0.12, headY: Math.sin(t * 17) * 0.3, headZ: 0 });
  crimsonLeg(p, 'L', p.hipY, 0.05);
  crimsonLeg(p, 'R', p.hipY, 0);
  const liftL = Math.max(0, hop), liftR = Math.max(0, -hop);
  p.thighL -= liftL * 0.55;
  p.shinL += liftL * 0.9;
  p.thighR -= liftR * 0.55;
  p.shinR += liftR * 0.9;
  const { gA, gB } = crimsonPoses;
  const w = smooth((t - sc.gestureAt) / 0.15);
  crimsonGesture(sc.lastGesture, t, 1, gA.handL, gA.poleL);
  crimsonGesture(sc.lastGesture, t, -1, gA.handR, gA.poleR);
  crimsonGesture(sc.gesture, t, 1, gB.handL, gB.poleL);
  crimsonGesture(sc.gesture, t, -1, gB.handR, gB.poleR);
  p.handL.lerpVectors(gA.handL, gB.handL, w);
  p.handR.lerpVectors(gA.handR, gB.handR, w);
  p.poleL.lerpVectors(gA.poleL, gB.poleL, w);
  p.poleR.lerpVectors(gA.poleR, gB.poleR, w);
}

// The cartoon wind-up: leaning back, one knee up, arms swept behind her.
function crimsonWindup(p) {
  Object.assign(p, { tilt: 0, hipY: 0.82, fwd: 0.35, thighL: -1.25, shinL: 1.6, splayL: 0.04, splayR: -0.04, hipsX: 0, hipsY: 0, chestX: -0.22, chestY: 0.2, chestZ: 0, headX: -0.1, headY: -0.2, headZ: 0 });
  crimsonLeg(p, 'R', 0.82, -0.1);
  crimsonArms(p, 0.2, 0.0, -0.25, -0.2, 0.0, -0.25);
  crimsonPoles(p, 0.5, -0.6, -0.5);
}

// Sprinting flat out, knees high, head thrown back, arms windmilling over her head.
function crimsonRun(p, ph, t, fwd) {
  const swing = Math.sin(ph);
  Object.assign(p, { tilt: 0, hipY: 0.88 + (Math.abs(swing) - 0.4) * 0.06, fwd, splayL: 0.03, splayR: -0.03, hipsX: 0.05, hipsY: swing * 0.12, chestX: -0.08, chestY: -swing * 0.14, chestZ: 0, headX: -0.32 + Math.sin(t * 13) * 0.05, headY: Math.sin(t * 9) * 0.18, headZ: 0 });
  for (const [side, phase] of [['L', ph], ['R', ph + Math.PI]]) {
    const fold = Math.max(0, Math.cos(phase + 0.35));
    p[`thigh${side}`] = Math.sin(phase) * -0.8 - 0.3;
    p[`shin${side}`] = 0.35 + fold * fold * 1.9;
  }
  const w = t * 15;
  crimsonArms(p,
    0.16 + Math.sin(w) * 0.06, 0.52 + Math.sin(w * 1.3) * 0.08, 0.06 + Math.cos(w) * 0.16,
    -0.16 - Math.sin(w + Math.PI) * 0.06, 0.52 + Math.sin(w * 1.3 + 2) * 0.08, 0.06 + Math.cos(w + Math.PI) * 0.16);
  crimsonPoles(p, 0.9, 0.2, -0.3);
}

// Puts her body in a pose. Her hips sit `hipY` above the ground at `at`, shifted `fwd` along
// the way she faced sitting up, so she can turn on the spot.
function crimsonApply(p, at, yaw) {
  const c = survivor.avatar;
  crimsonYawQ.setFromAxisAngle(UP_AXIS, yaw);
  crimsonTiltQ.setFromAxisAngle(SIDE_AXIS, p.tilt);
  c.root.quaternion.copy(crimsonYawQ).multiply(crimsonTiltQ);
  crimsonPivot.set(0, c.dims.hips, 0).applyQuaternion(c.root.quaternion);
  const f = crimsonScene.forward;
  const x = at.x + f.x * p.fwd, z = at.z + f.z * p.fwd;
  c.root.position.set(x, groundHeight(x, z) + p.hipY, z).sub(crimsonPivot);
  c.hips.position.y = c.dims.hips;
  c.hips.rotation.set(p.hipsX, p.hipsY, 0);
  c.chest.rotation.set(p.chestX, p.chestY, p.chestZ);
  c.head.rotation.set(p.headX, p.headY, p.headZ);
  c.legL.thigh.rotation.set(p.thighL - p.hipsX, 0, p.splayL);
  c.legR.thigh.rotation.set(p.thighR - p.hipsX, 0, p.splayR);
  c.legL.shin.rotation.set(p.shinL, 0, 0);
  c.legR.shin.rotation.set(p.shinR, 0, 0);
  solveArm(c.armL, p.handL, p.poleL);
  solveArm(c.armR, p.handR, p.poleR);
  c.armL.hand.quaternion.identity();
  c.armR.hand.quaternion.identity();
  if (p.flick) c.armR.hand.rotation.set(p.flick * -0.7, 0, p.flick * 0.25);
}

/* ---------- The scene ---------- */
function crimsonCue(key, at, fn) {
  const s = crimsonScene;
  if (!s.fired[key] && s.t >= at) { s.fired[key] = true; fn(); }
}

function crimsonBlocked(x, z, pad) {
  if (Math.hypot(x, z) > WORLD_RADIUS - 6) return true;
  for (const c of nearbyColliders(x, z)) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
  return false;
}

// Her way out: away from the fire and out of the clearing, down the clearest line between
// the trunks.
function crimsonPickRun() {
  const s = crimsonScene, P = s.home;
  crimsonTmp.set(P.x - wreck.x, 0, P.z - wreck.z).normalize().multiplyScalar(1.3).add(s.toHer);
  const base = Math.atan2(crimsonTmp.x, crimsonTmp.z);
  let best = null;
  for (let k = 0; k <= 12; k++) {
    const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.17;
    const yaw = base + off, dx = Math.sin(yaw), dz = Math.cos(yaw);
    let clear = 0;
    for (let d = 1; d <= 20; d += 0.5) {
      if (crimsonBlocked(P.x + dx * d, P.z + dz * d, 0.55)) break;
      clear = d;
    }
    // Not straight back past the fire, or through Twin Tails.
    const past = Math.hypot(P.x + dx * 2 - player.pos.x, P.z + dz * 2 - player.pos.z) < 1.2 ? 4 : 0;
    const score = Math.min(clear, 16) - Math.abs(off) * 2 - past;
    if (!best || score > best.score) best = { yaw, clear, score };
  }
  s.runYaw = best.yaw;
  s.runLen = clamp(best.clear - 1, CRIMSON.runMin, CRIMSON.runMax);
  s.run.set(Math.sin(best.yaw), 0, Math.cos(best.yaw));
  // The side of the run that faces back into the clearing, for the camera.
  s.runSide.set(s.run.z, 0, -s.run.x);
  crimsonTmp.set(wreck.x - P.x, 0, wreck.z - P.z);
  if (s.runSide.dot(crimsonTmp) < 0) s.runSide.negate();
}

// Whether the view from `a` to `b` is clear of the ground and of trunks and rocks.
function crimsonSightClear(a, b) {
  const steps = Math.ceil(a.distanceTo(b) / 0.5);
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    const x = lerp(a.x, b.x, u), y = lerp(a.y, b.y, u), z = lerp(a.z, b.z, u);
    const g = groundHeight(x, z);
    if (y < g + 0.15) return false;
    for (const c of nearbyColliders(x, z)) if (y < g + c.h && Math.hypot(x - c.x, z - c.z) < c.r + 0.15) return false;
  }
  return true;
}

// The first of `spots` ([x, z, height above the ground]) that stands clear and sees every
// one of `targets`, raised a little if the ground is in the way; failing that, the first.
function crimsonPickCam(out, spots, targets) {
  for (const lift of [0, 0.8, 1.6]) {
    for (const [x, z, h] of spots) {
      if (crimsonBlocked(x, z, 0.6)) continue;
      out.set(x, groundHeight(x, z) + h + lift, z);
      if (targets.every((t) => crimsonSightClear(out, t))) return out;
    }
  }
  const [x, z, h] = spots[0];
  return out.set(x, groundHeight(x, z) + h, z);
}

// Camera spots for the shots of the run, chosen once the run is known: side on to it, down
// its line from the clearing, and near the fall for the wolves.
function crimsonPickCameras() {
  const s = crimsonScene, o = s.origin, f = s.fall, R = s.run, RS = s.runSide;
  const at = (base, ahead, across, h) => [base.x + R.x * ahead + RS.x * across, base.z + R.z * ahead + RS.z * across, h];
  const point = (base, ahead, h) => crimsonGround(new THREE.Vector3(), base.x + R.x * ahead, base.z + R.z * ahead, h);
  crimsonPickCam(s.sideCam, [at(o, 2.4, 3.1, 1.2), at(o, 1.2, 3.8, 1.2), at(o, 2.4, -3.1, 1.2), at(o, -1, 2.8, 1.3)], [point(o, 0, 1), point(o, 4, 1)]);
  crimsonPickCam(s.wideCam, [at(o, -2.2, 0.5, 1.7), at(o, -2.2, 1.8, 1.7), at(o, -2.2, -1.3, 1.7), at(o, -4, 3, 1.9), at(o, -4, -2.6, 1.9)], [point(f, 0, 0.8), point(o, s.runLen * 0.55, 0.9)]);
  const back = Math.atan2(-R.x, -R.z);
  const ring = [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 2.2, -2.2].map((off) => [f.x + Math.sin(back + off) * 4.2, f.z + Math.cos(back + off) * 4.2, 1.5]);
  crimsonPickCam(s.crowdCam, ring, [point(f, 0, 0.4)]);
}

// Four wolves waiting in the trees ahead of her: one straight ahead that jumps, two from
// the flanks and one that comes round behind.
function crimsonWolfPack() {
  const s = crimsonScene, f = s.fall, R = s.run, S = s.runSide, T = s.T;
  const at = (ahead, across) => new THREE.Vector3(f.x + R.x * ahead + S.x * across, 0, f.z + R.z * ahead + S.z * across);
  const plan = [
    { from: at(8, -0.6), to: at(2.6, 0), slot: at(0.45, 0), burst: T.burst, arrive: T.hit, lead: true, spread: -0.25 },
    { from: at(1.8, 7.5), to: at(0.1, 1.15), burst: T.burst + 0.12, arrive: T.hit + 0.2, spread: 0.55 },
    { from: at(2.4, -7.5), to: at(0.2, -1.15), burst: T.burst + 0.22, arrive: T.hit + 0.3, spread: -0.6 },
    { from: at(6.5, 4.5), to: at(-0.95, 0.5), burst: T.burst + 0.3, arrive: T.hit + 0.45, spread: 0.2 },
  ];
  s.wolves = plan.map((w, i) => {
    if (!w.slot) w.slot = w.to;
    // Wolves that start among the trunks are moved to the nearest gap.
    pushOutOfColliders(w.from, 0.5);
    const wolf = new Wolf(w.from.x, w.from.z);
    wolf.holder.visible = false;
    wolf.holder.rotation.order = 'YXZ';
    wolf.heading = Math.atan2(w.to.x - w.from.x, w.to.z - w.from.z);
    return { ...w, wolf, out: false, face: Math.atan2(f.x - w.slot.x, f.z - w.slot.z), leaveAt: T.leave + i * 0.12, seed: i * 1.7, speed: 0 };
  });
}

function crimsonClearWolves() {
  for (const w of crimsonScene.wolves) w.wolf.dispose();
  crimsonScene.wolves.length = 0;
}

function crimsonStopScream() {
  if (crimsonScene.scream) { crimsonScene.scream.stop(); crimsonScene.scream = null; }
}

// How long a line stays up: long enough to read, at her breathless pace.
function crimsonReadTime(text) {
  return clamp(0.3 + text.length / 32, 0.9, 2.5);
}

// This telling's beats: CRIMSON_T, with everything after a line pushed back if the line
// needs longer to read. Returns the beats and the start of each panic line after the first.
function crimsonTimeline(wake, panic, flee) {
  const T = { ...CRIMSON_T }, order = Object.keys(CRIMSON_T);
  const hold = (key, until) => {
    const d = until - T[key];
    if (d > 0) for (const k of order.slice(order.indexOf(key))) T[k] += d;
  };
  hold('spot', T.bolt + 0.12 + crimsonReadTime(wake));
  // She scrambles up as the first line ends, wailing the next on the way.
  hold('scramble', T.spot + crimsonReadTime(panic[0]) - 0.5);
  let at = T.spot + crimsonReadTime(panic[0]);
  const times = panic.slice(1).map((line) => { const start = at; at += crimsonReadTime(line); return start; });
  hold('flee', at);
  // The wind-up holds while she shouts her way out.
  hold('launch', T.flee + crimsonReadTime(flee) * 0.6);
  T.spin = T.launch - 0.35;
  return { T, times };
}

// Starts the scene: the warmth of a fire has reached her.
function wakeCrimson(fire) {
  const s = crimsonScene, c = survivor.avatar;
  if (crimson.phase !== 'asleep' || !c || game.state !== 'playing') return;
  crimson.phase = 'scene';
  crimson.pending = null;
  Object.assign(s, { t: 0, fired: {}, phase: 0, along: 0, stepSide: 0, gesture: 2, lastGesture: 2, gestureAt: 0, snowT: 0, speed: 0, saidAfter: false });
  s.home.set(survivor.x, 0, survivor.z);
  s.baseYaw = wreck.heading + 2.2;
  s.forward.set(Math.sin(s.baseYaw), 0, Math.cos(s.baseYaw));
  if (fire) s.fire.set(fire.x, 0, fire.z);
  else s.fire.copy(s.home).addScaledVector(s.forward, 2.5);
  s.toHer.set(s.home.x - s.fire.x, 0, s.home.z - s.fire.z);
  if (s.toHer.lengthSq() < 1) s.toHer.copy(s.forward).negate();
  s.toHer.normalize();
  // Her side that faces into the clearing, where the camera can stand clear of the trees.
  s.side.set(s.forward.z, 0, -s.forward.x);
  if (s.side.dot(crimsonTmp.set(wreck.x - s.home.x, 0, wreck.z - s.home.z)) < 0) s.side.negate();
  // Which way she turns her head to see the fire.
  const toFire = Math.atan2(s.fire.x - s.home.x, s.fire.z - s.home.z) - s.baseYaw;
  s.fireLook = clamp(Math.atan2(Math.sin(toFire), Math.cos(toFire)), -1.6, 1.6);
  // Her lines, and the beats stretched to give each one time to be read.
  const wake = crimsonText('wake'), panic = crimsonList('panic'), flee = crimsonText('flee');
  const { T, times } = crimsonTimeline(wake, panic, flee);
  s.T = T;
  s.lines = [{ at: T.bolt + 0.12, text: wake }, { at: T.spot, text: panic[0] }];
  panic.slice(1).forEach((text, i) => s.lines.push({ at: times[i], text, gesture: i }));
  s.lines.push({ at: T.flee, text: flee });
  // Her head whips about until she sees the fire.
  s.looks = [];
  [0.95, -0.95, 0.5, -0.7, 0.85, -0.4, 0.6].forEach((v, i) => { if (T.look + 0.08 + i * 0.42 < T.spot - 0.15) s.looks.push([T.look + 0.08 + i * 0.42, v]); });
  s.looks.push([T.spot, s.fireLook]);
  crimsonPickRun();
  s.origin.copy(s.home).addScaledVector(s.forward, 0.35);
  s.fall.copy(s.origin).addScaledVector(s.run, s.runLen);
  crimsonPickCameras();
  crimsonWolfPack();
  s.at.copy(s.home);
  player.dodge = null;
  playScene({ update: updateCrimsonScene, skip: crimsonFinish });
  emitGame('crimsonWoke');
}

function updateCrimsonScene(dt) {
  const s = crimsonScene, T = s.T;
  s.t += dt;
  const t = s.t;
  game.time += dt;
  crimsonAct(dt, t);
  crimsonWolves(dt, t);
  crimsonCues(t);
  crimsonWatch(dt);
  crimsonCamera(t);
  updateFires(dt);
  // The wreck's update also settles her hair, when she's near enough to the player.
  updateWreck(dt);
  if (!wreck.burning || Math.hypot(survivor.x - player.pos.x, survivor.z - player.pos.z) >= 80) survivor.avatar.simulate(dt);
  s.props.snow.update(dt);
  world.stream(player.pos, 1);
  if (t >= T.end) crimsonFinish();
}

// Her performance, beat by beat.
function crimsonAct(dt, t) {
  const s = crimsonScene, T = s.T, { a, b, out } = crimsonPoses;
  let pose = out, yaw = s.baseYaw;
  s.at.copy(s.home);
  if (t < T.bolt) {
    crimsonLie(out, t);
  } else if (t < T.look) {
    crimsonLie(a, t);
    crimsonSit(b);
    crimsonBlend(a, b, crimsonOvershoot(clamp((t - T.bolt) / 0.17, 0, 1)), out);
  } else if (t < T.scramble) {
    crimsonSit(a);
    crimsonLook(b, t);
    crimsonBlend(a, b, span(t, T.look, T.look + 0.18), out);
  } else if (t < T.stand) {
    crimsonLook(a, t);
    crimsonCrouch(b);
    crimsonBlend(a, b, span(t, T.scramble, T.stand), out);
  } else if (t < T.panic) {
    crimsonCrouch(a);
    crimsonPanic(b, t);
    crimsonBlend(a, b, span(t, T.stand, T.panic), out);
  } else if (t < T.flee) {
    crimsonPanic(out, t);
  } else if (t < T.launch) {
    // Whips round to face the trees, winds up, and her legs spin before she goes.
    const turn = smooth((t - T.flee) / 0.22);
    const d = Math.atan2(Math.sin(s.runYaw - s.baseYaw), Math.cos(s.runYaw - s.baseYaw));
    yaw = s.baseYaw + d * turn;
    crimsonPanic(a, t);
    crimsonWindup(b);
    crimsonBlend(a, b, span(t, T.flee, T.flee + 0.25), out);
    if (t > T.spin) {
      s.phase += dt * 32;
      crimsonRun(a, s.phase, t, 0.35);
      crimsonBlend(out, a, span(t, T.spin, T.spin + 0.08), out);
    }
  } else {
    // The run: a quick start, then flat out until the wolf hits her.
    yaw = s.runYaw;
    const D = T.hit - T.launch, accel = 0.25;
    const v = s.runLen / (D - accel / 2);
    const u = Math.min(t, T.hit) - T.launch;
    const along = u < accel ? (v * u * u) / (2 * accel) : v * (u - accel / 2);
    const before = s.phase;
    s.phase += Math.max(0, along - (s.along || 0)) * 2.1;
    s.along = along;
    s.at.copy(s.origin).addScaledVector(s.run, along);
    pushOutOfColliders(s.at, 0.3);
    crimsonRun(out, s.phase, t, 0);
    // A step, and a print in the snow, every half stride.
    if (Math.floor(s.phase / Math.PI) !== Math.floor(before / Math.PI)) {
      s.stepSide = -s.stepSide || 1;
      crimsonPrint(s.at.x + s.runSide.x * s.stepSide * 0.09, s.at.z + s.runSide.z * s.stepSide * 0.09, yaw);
      Sfx.step();
    }
  }
  if (t < T.launch) s.along = 0;
  crimsonApply(pose, s.at, yaw);
}

// The wolves, driven by hand: out of the trees, in on her, crowding the spot, then away.
function crimsonWolves(dt, t) {
  const s = crimsonScene, T = s.T, f = s.fall;
  for (const w of s.wolves) {
    const wolf = w.wolf;
    if (t < w.burst) continue;
    if (!w.out) {
      w.out = true;
      wolf.holder.visible = true;
      burst(crimsonTmp.set(w.from.x, groundHeight(w.from.x, w.from.z) + 0.6, w.from.z), 0xf2f5ff, 24, 4);
    }
    let anim = 'run', rate = 1.2, pitch = 0, lift = 0;
    if (t < w.arrive) {
      if (w.lead && t >= T.leap) {
        // The leap: off the snow and onto her.
        const u = clamp((t - T.leap) / (T.hit - T.leap), 0, 1);
        wolf.pos.lerpVectors(w.to, w.slot, u);
        lift = Math.sin(u * Math.PI * 0.85) * 0.95;
        pitch = lerp(-0.45, 0.35, u);
        rate = 0.35;
      } else {
        const end = w.lead ? T.leap : w.arrive;
        const u = clamp((t - w.burst) / (end - w.burst), 0, 1);
        wolf.pos.lerpVectors(w.from, w.to, w.lead ? u : 1 - (1 - u) * (1 - u));
        rate = 1.3;
      }
      wolf.heading = Math.atan2(w.to.x - w.from.x, w.to.z - w.from.z);
      if (w.lead) wolf.heading = Math.atan2(-s.run.x, -s.run.z);
    } else if (t < w.leaveAt) {
      // Crowding round, heads down, jostling.
      const j = t * 6 + w.seed;
      wolf.pos.copy(w.slot);
      wolf.pos.x += Math.sin(j) * 0.07 + Math.sin(j * 0.7) * 0.05;
      wolf.pos.z += Math.cos(j * 1.2) * 0.07;
      const settle = clamp((t - w.arrive) / 0.25, 0, 1);
      const turn = Math.atan2(Math.sin(w.face - wolf.heading), Math.cos(w.face - wolf.heading));
      wolf.heading += turn * settle;
      wolf.heading += Math.sin(j * 0.9) * 0.02;
      pitch = 0.18 + Math.sin(j * 1.3) * 0.06;
      anim = w.lead ? 'idle' : 'creep';
      rate = 1.5;
    } else {
      // Trotting off, one by one, into the trees.
      const want = s.runYaw + w.spread;
      const turn = Math.atan2(Math.sin(want - wolf.heading), Math.cos(want - wolf.heading));
      wolf.heading += turn * (1 - Math.exp(-5 * dt));
      w.speed = Math.min(3.8, w.speed + dt * 8);
      wolf.pos.x += Math.sin(wolf.heading) * w.speed * dt;
      wolf.pos.z += Math.cos(wolf.heading) * w.speed * dt;
      anim = 'walk';
      rate = 2.3;
    }
    wolf.pos.y = groundHeight(wolf.pos.x, wolf.pos.z) + lift;
    wolf.play(anim);
    wolf.actions[anim].timeScale = rate;
    wolf.mixer.update(dt);
    wolf.holder.position.copy(wolf.pos);
    wolf.holder.rotation.set(pitch, wolf.heading, 0);
  }
  // Snow kicked up while they crowd the spot.
  if (t >= T.hit && t < T.leave + 0.3) {
    s.snowT -= dt;
    while (s.snowT <= 0) {
      s.snowT += 0.07;
      crimsonTmp.set(f.x + (Math.random() - 0.5) * 1.6, groundHeight(f.x, f.z) + 0.2, f.z + (Math.random() - 0.5) * 1.6);
      burst(crimsonTmp, 0xf2f5ff, 7, 2.8);
      if (Math.random() < 0.35) s.props.snow.emit(crimsonTmp, crimsonTmp2.set((Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2), { life: 0.9, size: 0.4, grow: 1.6, alpha: 0.4 });
    }
  }
}

// Lines, sounds and flashes, each at its moment.
function crimsonCues(t) {
  const s = crimsonScene, T = s.T, c = survivor.avatar;
  crimsonCue('stir1', T.stir, () => Sfx.crimsonRustle(0.4));
  crimsonCue('stir2', T.stir + 0.55, () => Sfx.crimsonRustle(0.3));
  crimsonCue('mmm', T.face + 0.25, () => Sfx.crimsonMmm());
  crimsonCue('bolt', T.bolt, () => { Sfx.crimsonGasp(); impact('white', 60); });
  for (const line of s.lines) {
    if (line.said || t < line.at) continue;
    line.said = true;
    crimsonSay(line.text);
    Sfx.crimsonChatter(line.text);
    // On her feet, each line gets its own flail.
    if (line.gesture !== undefined) {
      s.lastGesture = s.gesture;
      s.gesture = CRIMSON_GESTURES[line.gesture % CRIMSON_GESTURES.length];
      s.gestureAt = t;
    }
  }
  crimsonCue('scramble', T.scramble, () => { Sfx.crimsonRustle(0.8); burst(crimsonTmp.set(s.home.x, groundHeight(s.home.x, s.home.z) + 0.1, s.home.z), 0xf2f5ff, 14, 2.4); });
  crimsonCue('stand', T.stand, () => { s.lastGesture = 2; s.gesture = 0; s.gestureAt = T.stand; });
  crimsonCue('turn', T.flee + 0.05, () => Sfx.axeSwing());
  crimsonCue('spin', T.spin, () => Sfx.crimsonZip());
  crimsonCue('launch', T.launch, () => {
    s.scream = Sfx.crimsonScream();
    crimsonSay(crimsonText('scream'), 'crimson scream');
    for (let i = 0; i < 3; i++) burst(crimsonTmp.set(s.origin.x, groundHeight(s.origin.x, s.origin.z) + 0.1, s.origin.z), 0xf2f5ff, 16, 3.5);
  });
  crimsonCue('wolves', T.burst, () => Sfx.growl());
  crimsonCue('leap', T.leap, () => Sfx.growl());
  crimsonCue('hit', T.hit, () => {
    crimsonStopScream();
    caption('');
    Sfx.bite();
    Sfx.thud();
    impact('invert', 90);
    const y = groundHeight(s.fall.x, s.fall.z);
    for (let i = 0; i < 16; i++) s.props.snow.emit(crimsonTmp.set(s.fall.x + (Math.random() - 0.5) * 1.4, y + 0.25, s.fall.z + (Math.random() - 0.5) * 1.4), crimsonTmp2.set((Math.random() - 0.5) * 4, 0.8 + Math.random() * 1.8, (Math.random() - 0.5) * 4), { life: 1.1 + Math.random() * 0.6, size: 0.55, grow: 1.8, alpha: 0.5 });
  });
  crimsonCue('crowd', T.crowd, () => c.setVisible(false));
  crimsonCue('satchel', T.leave, () => crimsonLeaveSatchel());
  crimsonCue('snarl1', T.crowd + 0.5, () => { Sfx.growl(); Sfx.crimsonRustle(0.7); });
  crimsonCue('snarl2', T.crowd + 1.1, () => { Sfx.crimsonRustle(0.6); Sfx.bite(); });
  crimsonCue('snarl3', T.crowd + 1.5, () => Sfx.growl());
  crimsonCue('deadpan', T.deadpan, () => { crimsonClearWolves(); s.props.snow.clear(); });
  crimsonCue('howl', T.deadpan + 0.35, () => Sfx.howl(0.3));
  crimsonCue('after', T.deadpan + 0.9, () => { crimsonSay(crimsonList('after')[0], 'line'); s.saidAfter = true; });

  // Speed lines on the big beats.
  const speed = Math.max(
    (1 - clamp((t - T.bolt) / 0.45, 0, 1)) * (t >= T.bolt ? 1 : 0),
    t >= T.spin && t < T.launch + 0.5 ? 0.7 : 0,
    (1 - clamp((t - T.hit) / 0.35, 0, 1)) * (t >= T.hit ? 1 : 0),
  );
  if (speed > 0.01 || s.speed > 0.01) drawSpeedLines(speed, t);
  s.speed = speed;
}

// Twin Tails, standing by her fire, turns to watch it all happen.
function crimsonWatch(dt) {
  const s = crimsonScene, c = survivor.avatar;
  if (c.root.visible) c.head.getWorldPosition(crimsonHead);
  else crimsonHead.copy(s.fall);
  const want = Math.atan2(crimsonHead.x - player.pos.x, crimsonHead.z - player.pos.z);
  player.bodyYaw = angleLerp(player.bodyYaw, want, 1 - Math.exp(-5 * dt));
  player.stride += -player.stride * (1 - Math.exp(-9 * dt));
  player.runBlend = 0;
  player.aimT = 0;
  poseAvatar(dt, crimsonStill, false);
  // A slow tilt of the head, which is all the reaction she gives.
  if (s.t > s.T.deadpan) avatar.head.rotation.z = -span(s.t, s.T.deadpan + 0.5, s.T.deadpan + 1.4) * 0.12;
  avatar.simulate(dt);
}

// Keeps the camera out of trunks, the fire and Twin Tails, and above the snow.
function crimsonPlaceCamera(pos) {
  pushOutOfColliders(pos, 0.45);
  crimsonKeepClear(pos, player.pos.x, player.pos.z, 0.7);
  crimsonKeepClear(pos, crimsonScene.fire.x, crimsonScene.fire.z, 0.6);
  pos.y = Math.max(pos.y, groundHeight(pos.x, pos.z) + 0.25);
}

function crimsonKeepClear(pos, x, z, r) {
  const dx = pos.x - x, dz = pos.z - z, d = Math.hypot(dx, dz);
  if (d < r && d > 1e-4 && pos.y < groundHeight(x, z) + 1.9) { pos.x = x + (dx / d) * r; pos.z = z + (dz / d) * r; }
}

// Sets a point `up` metres above the ground at (x, z).
function crimsonGround(out, x, z, up) {
  return out.set(x, groundHeight(x, z) + up, z);
}

// The shots, cut by time.
function crimsonCamera(t) {
  const s = crimsonScene, T = s.T, P = s.home, F = s.forward, S = s.side, c = survivor.avatar;
  const cam = crimsonCam, aim = crimsonAim;
  let fov = 50, roll = 0, shake = 0;
  camera.up.set(0, 1, 0);
  if (t < T.face) {
    // Low beyond her, looking back past her to the fire as it catches.
    const x = P.x + s.toHer.x * 1.9 + s.toHer.z * 0.9, z = P.z + s.toHer.z * 1.9 - s.toHer.x * 0.9;
    crimsonGround(cam, x, z, 0.75).addScaledVector(s.toHer, -t * 0.12);
    crimsonGround(aim, lerp(P.x, s.fire.x, 0.35), lerp(P.z, s.fire.z, 0.35), 0.25);
    fov = 48;
  } else if (t < T.bolt) {
    // Close on her hand in the snow, as the fingers start to twitch.
    c.armR.hand.getWorldPosition(aim);
    c.hips.getWorldPosition(crimsonTmp);
    crimsonTmp.subVectors(aim, crimsonTmp).setY(0).normalize();
    cam.copy(aim).addScaledVector(crimsonTmp, 0.42).addScaledVector(F, 0.18);
    cam.y += 0.24;
    aim.y += 0.02;
    fov = 40;
  } else if (t < T.look) {
    // Side on, low: she snaps up into the frame.
    crimsonGround(cam, P.x + S.x * 1.3 + F.x * 0.45, P.z + S.z * 1.3 + F.z * 0.45, 0.55);
    crimsonGround(aim, P.x + F.x * 0.15, P.z + F.z * 0.15, 0.42);
    fov = 52;
    if (t < T.bolt + 0.3) shake = 0.05;
  } else if (t < T.scramble) {
    // In front of her as she looks wildly about.
    const push = (t - T.look) * 0.08;
    crimsonGround(cam, P.x + F.x * (1.75 - push) + S.x * 0.55, P.z + F.z * (1.75 - push) + S.z * 0.55, 0.62);
    crimsonGround(aim, P.x + F.x * 0.1, P.z + F.z * 0.1, 0.45);
    fov = 44;
  } else if (t < T.panic) {
    // Wider, from the side, as she scrambles up.
    crimsonGround(cam, P.x + S.x * 2.4 + F.x * 1.5, P.z + S.z * 2.4 + F.z * 1.5, 0.95);
    crimsonGround(aim, P.x + F.x * 0.3, P.z + F.z * 0.3, lerp(0.55, 1.0, span(t, T.scramble, T.panic)));
    fov = 50;
  } else if (t < T.flee) {
    // On her feet and wailing; the frame tips further with every line.
    const u = t - T.panic;
    crimsonGround(cam, P.x + F.x * (2.4 - u * 0.15) + S.x * 0.45, P.z + F.z * (2.4 - u * 0.15) + S.z * 0.45, 1.35);
    crimsonGround(aim, P.x + F.x * 0.35, P.z + F.z * 0.35, 1.12);
    roll = 0.04 + u * 0.03;
    fov = 42;
  } else if (t < T.wide) {
    // Side on to her run, panning as she goes.
    cam.copy(s.sideCam);
    crimsonGround(aim, s.at.x, s.at.z, 0.95);
    fov = 46;
    if (t > T.launch && t < T.launch + 0.3) shake = 0.06;
  } else if (t < T.crowd) {
    // From the clearing, down the line of her run, as she goes into the trees.
    cam.copy(s.wideCam);
    crimsonGround(aim, lerp(s.at.x, s.fall.x, 0.5), lerp(s.at.z, s.fall.z, 0.5), 0.8);
    fov = 34;
    if (t > T.hit) shake = 0.15;
  } else if (t < T.deadpan) {
    // The wolves crowding where she fell, then trotting off.
    cam.copy(s.crowdCam);
    cam.lerp(crimsonGround(crimsonTmp, s.fall.x, s.fall.z, 1.5), -(t - T.crowd) * 0.03);
    crimsonGround(aim, s.fall.x, s.fall.z, 0.35);
    fov = 48;
    if (t < T.crowd + 0.3) shake = 0.12 * (1 - (t - T.crowd) / 0.3);
  } else {
    // Twin Tails, by her fire.
    avatar.head.getWorldPosition(aim);
    const yaw = player.bodyYaw;
    cam.copy(aim);
    cam.x += Math.sin(yaw) * 0.95 + Math.cos(yaw) * 0.22;
    cam.z += Math.cos(yaw) * 0.95 - Math.sin(yaw) * 0.22;
    cam.y += 0.02;
    fov = 34;
  }
  camera.position.copy(cam);
  if (shake) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
  }
  if (t >= T.face && t < T.bolt) camera.position.y = Math.max(camera.position.y, groundHeight(cam.x, cam.z) + 0.12);
  else crimsonPlaceCamera(camera.position);
  if (roll) {
    crimsonTmp.subVectors(aim, camera.position).normalize();
    camera.up.set(-crimsonTmp.z * Math.sin(roll), Math.cos(roll), crimsonTmp.x * Math.sin(roll));
  }
  camera.lookAt(aim);
  setFov(fov);
}

// The end of the scene, played out or skipped: she's gone, the wolves too, and her
// satchel lies in the snow.
function crimsonFinish() {
  const s = crimsonScene;
  if (crimson.phase !== 'scene') return;
  crimsonStopScream();
  crimsonClearWolves();
  s.props.snow.clear();
  survivor.avatar.setVisible(false);
  crimsonLeaveSatchel();
  crimson.phase = 'gone';
  crimson.fell = { x: s.fall.x, z: s.fall.z };
  crimson.marker[0].x = s.fall.x;
  crimson.marker[0].z = s.fall.z;
  // She's left facing where it happened.
  player.yaw = player.bodyYaw = Math.atan2(s.fall.x - player.pos.x, s.fall.z - player.pos.z);
  player.pitch = 0.02;
  avatar.head.rotation.z = 0;
  endScene();
  emitGame('crimsonGone', { x: s.fall.x, z: s.fall.z });
  for (const line of crimsonList('after').slice(s.saidAfter ? 1 : 0)) say(line, 3);
}

/* ---------- Setup and each frame ---------- */
function initCrimson() {
  crimsonScene.props = buildCrimsonProps();
  addInteractable({
    get x() { return survivor.x; },
    get z() { return survivor.z; },
    r: 2.4,
    label: 'Press E to check on her',
    active: () => crimson.phase === 'asleep' && !crimson.pending,
    use: () => showNote(`${crimsonText('check')} ${crimsonText('checkFire')}`),
  });
  // A fire close enough warms her awake, a moment after it catches.
  onGame('campfire', (fire) => {
    if (crimson.phase !== 'asleep' || crimson.pending || !survivor.avatar) return;
    if (Math.hypot(fire.x - survivor.x, fire.z - survivor.z) <= CRIMSON.wakeRadius) crimson.pending = { fire, t: CRIMSON.delay };
  });
  onGame('pickup', (id) => crimsonTookItem(id));
  onGame('noteRead', (noteId) => crimsonTookItem(`note:${noteId}`));
  MAP_MARKERS.push(() => (crimson.phase === 'gone' && crimson.satchel.some((i) => !i.taken) ? crimson.marker : []));
}

function resetCrimson() {
  const s = crimsonScene;
  crimsonStopScream();
  crimsonClearWolves();
  for (const item of crimson.satchel) if (item.handle) removeWorldItem(item.handle);
  crimson.satchel.length = 0;
  Object.assign(crimson, { phase: 'asleep', pending: null, fell: null });
  if (s.props) {
    s.props.snow.clear();
    s.props.satchel.visible = false;
    s.props.patch.visible = false;
    s.props.prints.count = 0;
  }
  if (avatar) avatar.head.rotation.z = 0;
  const c = survivor.avatar;
  if (!c) return;
  // Back as the crash left her: placeSurvivor sets the limbs it bends; the rest go straight.
  for (const group of [c.hips, c.chest, c.head, c.armL.fore, c.armR.fore, c.armL.hand, c.armR.hand, c.legR.shin]) group.rotation.set(0, 0, 0);
  c.hips.position.y = c.dims.hips;
  placeSurvivor();
  c.setVisible(true);
}

function updateCrimson(dt) {
  const c = survivor.avatar;
  if (crimson.phase !== 'asleep' || !c) return;
  const d = Math.hypot(survivor.x - player.pos.x, survivor.z - player.pos.z);
  // Slow, shallow breaths, for anyone close enough to see them.
  if (d < 40) c.chest.rotation.x = Math.sin(game.time * 1.3) * 0.025;
  if (crimson.pending) {
    crimson.pending.t -= dt;
    if (crimson.pending.t <= 0) wakeCrimson(crimson.pending.fire);
  }
}
