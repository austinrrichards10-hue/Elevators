// Snow hares to hunt, and what a hit does to a hare or a wolf. The hares graze out in the
// glades, sit up to look about and twitch their ears, and now and then two of them romp
// after each other. When she comes too close, or runs at them, they freeze flat and then
// bolt in zig-zags. An arrow, the axe or the blade drops one in the snow, where she can take
// it for meat and fur. Henrik's old trapline and the lake shore have the most.

/* ---------- The hare ---------- */
const RABBIT = {
  count: 28, // alive around her at once
  extra: 14, // more again near the trapper's cabin and the lake
  spawnMin: 25, spawnMax: 110, despawn: 150,
  show: 80, // beyond this the fog hides them, so they aren't drawn
  unseen: 72, // a hare that appears closer than this must appear out of her view
  scale: 1.4, // bigger than life, so they're easy to spot: fat as cats
  limp: 0.3, // how fast a wounded hare can go, against a sound one
  hop: 1.5, // ambling speed, in metres per second
  romp: 5.5, // chasing each other about
  run: 10.5, // bolting: faster than she can sprint
  alert: 18, // closer than this she's been noticed: they sit up and watch
  flee: 8, // closer than this they freeze, then bolt
  sneak: 0.55, // creeping with the bow up, or standing still, shrinks both by this much
  sprint: 1.9, // running at them stretches both by this much
  wary: 1.35, // a hare that has bolted stays this much jumpier for a while
  wolf: 9, // a wolf this close sends them off
  hit: 0.17, // body radius an arrow must pass within, before scaling
  carcasses: 10, // dead hares left lying at most; the furthest go first
};
// Where hares are thickest: Henrik's trapline and the lake shore.
const RABBIT_HAUNTS = [{ site: 'trapper', r: 240 }, { site: 'lake', r: 260 }];
// How they move: seconds per hop, how high (metres), ground speed, and pauses between hops.
const RABBIT_GAITS = {
  amble: { time: 0.32, height: 0.06, speed: RABBIT.hop, rest: [0.08, 0.5], amp: 0.45 },
  romp: { time: 0.3, height: 0.2, speed: RABBIT.romp, rest: [0, 0], amp: 0.8 },
  bolt: { time: 0.26, height: 0.3, speed: RABBIT.run, rest: [0, 0], amp: 1 },
};

/* ---------- Models ---------- */
let rabbitKit = null;

// Merges [geometry, matrix, colour] parts into one geometry with vertex colours, so each
// part of a hare is a single draw. `colour` may be a function of the vertex position, so
// the fur can shade across a part.
function rabbitMerge(parts) {
  const position = [], normal = [], color = [];
  const v = new THREE.Vector3();
  for (const [geo, matrix, colour] of parts) {
    const flat = geo.index ? geo.toNonIndexed() : geo.clone();
    flat.applyMatrix4(matrix);
    const p = flat.attributes.position, n = flat.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const c = typeof colour === 'function' ? colour(v) : colour;
      position.push(v.x, v.y, v.z);
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
      color.push(c.r, c.g, c.b);
    }
    flat.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geo.computeBoundingSphere();
  return geo;
}

// One set of parts shared by every hare. Each part is built in its joint's frame: +Z is
// forward, +Y up, and the joint at the origin.
function getRabbitKit() {
  if (rabbitKit) return rabbitKit;
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const blob = (rx, ry, rz, x, y, z, colour, tilt = 0) => [
    sphere,
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt), new THREE.Vector3(rx, ry, rz)),
    colour,
  ];
  const white = new THREE.Color(0xc9ab86), saddle = new THREE.Color(0x6e5038), tip = new THREE.Color(0x221c19);
  const eye = new THREE.Color(0x0d0907), nose = new THREE.Color(0x8a706b), pad = new THREE.Color(0xdcd2c4);
  const shade = new THREE.Color();
  // Still in their brown summer coats, with a darker saddle along the back and over the
  // crown, so they stand out plainly against the snow.
  const fur = (lo, hi) => (p) => shade.copy(white).lerp(saddle, THREE.MathUtils.smoothstep(p.y, lo, hi) * 0.8);

  const body = rabbitMerge([
    blob(0.12, 0.115, 0.2, 0, 0.06, 0.12, fur(0.09, 0.18), -0.06), // barrel
    blob(0.125, 0.125, 0.13, 0, 0.035, 0, fur(0.07, 0.16)), // haunches
    blob(0.085, 0.09, 0.09, 0, 0.03, 0.24, fur(0.07, 0.13)), // chest
    blob(0.042, 0.038, 0.034, 0, 0.085, -0.135, white), // scut
  ]);
  const head = rabbitMerge([
    blob(0.068, 0.068, 0.085, 0, 0.03, 0.04, fur(0.05, 0.1)), // crown
    blob(0.046, 0.044, 0.052, 0, 0, 0.1, white), // muzzle
    blob(0.04, 0.04, 0.042, 0.03, -0.006, 0.07, white), // cheeks
    blob(0.04, 0.04, 0.042, -0.03, -0.006, 0.07, white),
    blob(0.015, 0.018, 0.017, 0.056, 0.045, 0.074, eye), // eyes, set wide on the sides
    blob(0.015, 0.018, 0.017, -0.056, 0.045, 0.074, eye),
    blob(0.012, 0.009, 0.008, 0, 0.013, 0.149, nose),
  ]);
  // Long ears, black at the tips.
  const ear = rabbitMerge([blob(0.028, 0.08, 0.011, 0, 0.075, 0, (p) => shade.copy(white).lerp(tip, THREE.MathUtils.smoothstep(p.y, 0.118, 0.135)))]);
  const fore = rabbitMerge([
    blob(0.022, 0.065, 0.024, 0, -0.055, 0, white),
    blob(0.024, 0.017, 0.036, 0, -0.112, 0.016, pad),
  ]);
  // A thigh tucked into the haunch, and the big snowshoe foot that gives the hare its name.
  const hind = rabbitMerge([
    blob(0.05, 0.065, 0.075, 0, -0.025, -0.01, fur(0.0, 0.09)),
    blob(0.032, 0.022, 0.09, 0, -0.1, 0.045, pad),
  ]);
  sphere.dispose();
  rabbitKit = {
    body, head, ear, fore, hind,
    mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
    // A soft glint over a dead hare, so she can find it again in the snow.
    glint: new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xfff6dd, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  };
  return rabbitKit;
}

// A hare's joints: hips (at the haunch, so it sits up about them), neck, ears and legs.
function buildRabbitRig() {
  const k = getRabbitKit();
  const joint = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const part = (geo, parent, shadow) => {
    const mesh = new THREE.Mesh(geo, k.mat);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
  };
  const root = new THREE.Group();
  root.scale.setScalar(RABBIT.scale);
  const hips = joint(root, 0, 0.12, -0.12);
  const body = part(k.body, hips, true);
  const neck = joint(hips, 0, 0.14, 0.28);
  part(k.head, neck, true);
  const earL = joint(neck, 0.03, 0.09, 0);
  const earR = joint(neck, -0.03, 0.09, 0);
  const foreL = joint(hips, 0.055, 0, 0.25);
  const foreR = joint(hips, -0.055, 0, 0.25);
  const hindL = joint(hips, 0.075, 0, 0);
  const hindR = joint(hips, -0.075, 0, 0);
  for (const e of [earL, earR]) part(k.ear, e, false);
  for (const leg of [foreL, foreR]) part(k.fore, leg, false);
  for (const leg of [hindL, hindR]) part(k.hind, leg, false);
  const glint = new THREE.Sprite(k.glint);
  glint.scale.setScalar(0.2);
  glint.position.set(0, 0.36, 0);
  root.add(glint);
  return { root, hips, body, neck, earL, earR, foreL, foreR, hindL, hindR, glint, arrows: [] };
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // A hare's thin scream, cut short.
  hareSqueal(level = 1) { this.glide([[0, 1300], [0.05, 2100], [0.14, 1700], [0.2, 900]], 0.05 * level, 'triangle', 30); },
  // A hind foot drummed once on the snow: the alarm.
  hareThump(level = 1) { this.burst(0.08, 180, 1, 0.3 * level); this.tone(85, 45, 0.09, 0.2 * level); },
  // Snow scattered as a hare bolts.
  hareBolt(level = 1) { this.burst(0.2, 1500, 0.7, 0.08 * level, 'bandpass'); },
});

/* ---------- The warren ---------- */
// Every hare near her, living or lying dead in the snow.
const rabbits = [];
// Rigs of hares that have gone, kept to build the next ones from.
const rabbitPool = [];
// How much noise she's making: how fast she's going, whether she's running or creeping.
const rabbitWatch = { x: 0, z: 0, speed: 0, running: false, sneaking: false };
const rabbitTmp = new THREE.Vector3(), rabbitDir = new THREE.Vector3(), rabbitMid = new THREE.Vector3();
const rabbitQuat = new THREE.Quaternion();
const rabbitCalm = new Set(['graze', 'hop', 'sit', 'romp']);

function rabbitRand(a, b) { return a + Math.random() * (b - a); }

function makeRabbit(x, z) {
  const rig = rabbitPool.pop() || buildRabbitRig();
  rig.glint.visible = false;
  rig.root.visible = true;
  scene.add(rig.root);
  const hare = {
    rig,
    pos: new THREE.Vector3(x, groundHeight(x, z), z),
    heading: Math.random() * Math.PI * 2,
    state: 'graze',
    timer: rabbitRand(1, 5),
    gait: null, // the hop it's in the middle of
    hop: -1, // how far through that hop, or -1 on the ground
    rest: 0, // pause before the next hop
    hops: 0, // hops left in an amble
    lift: 0,
    target: new THREE.Vector3(),
    spook: null, // { x, z, t }: something other than her that frightened it
    zig: Math.random() < 0.5 ? -0.5 : 0.5,
    zigT: 0,
    wary: 0,
    look: 0,
    twitch: [0, 0],
    twitchT: [rabbitRand(0.5, 4), rabbitRand(0.5, 4)],
    seed: Math.random() * 100,
    up: 0, flat: 0, graze: 0, run: 0, // eased pose blends
    partner: null, // a hare it was born near, and romps with
    leads: false,
    dead: null, // { t, roll, vel, vy, y, spin } once it's been killed
    wounded: false, // hit by a light shot: it can only limp
    limpStep: 0,
    entry: null,
    gone: false,
  };
  hare.target.copy(hare.pos);
  rabbits.push(hare);
  return hare;
}

// Takes a hare out of the world for good and keeps its rig for the next one.
function removeRabbit(hare) {
  if (hare.gone) return;
  hare.gone = true;
  if (hare.entry) { removeInteractable(hare.entry); hare.entry = null; }
  if (hare.partner) { hare.partner.partner = null; hare.partner = null; }
  const rig = hare.rig;
  scene.remove(rig.root);
  for (const arrow of rig.arrows) rig.root.remove(arrow);
  rig.arrows.length = 0;
  rabbitPool.push(rig);
  const i = rabbits.indexOf(hare);
  if (i >= 0) rabbits.splice(i, 1);
}

/* ---------- Spawning ---------- */
// More hares near the trapline and the lake: 0 away from them, 1 in the thick of it.
function rabbitHaunt() {
  let best = null, closeness = 0;
  for (const haunt of RABBIT_HAUNTS) {
    const site = siteById(haunt.site);
    if (!site) continue;
    const c = 1 - THREE.MathUtils.smoothstep(Math.hypot(site.x - player.pos.x, site.z - player.pos.z), haunt.r * 0.5, haunt.r);
    if (c > closeness) { closeness = c; best = site; }
  }
  return { site: best, closeness };
}

function rabbitTarget() {
  return Math.round(RABBIT.count + RABBIT.extra * rabbitHaunt().closeness);
}

// Somewhere a hare can appear: in the ring around her, often near a haunt, clear of trunks
// and rocks, and never popping up in plain view.
function rabbitSpawnSpot(out, anywhere) {
  const haunt = rabbitHaunt();
  for (let attempt = 0; attempt < 4; attempt++) {
    if (haunt.site && Math.random() < 0.65 * haunt.closeness + 0.1) {
      const a = Math.random() * Math.PI * 2, d = rabbitRand(6, (haunt.site.clear || 20) + 70);
      out.set(haunt.site.x + Math.cos(a) * d, 0, haunt.site.z + Math.sin(a) * d);
    } else {
      const a = Math.random() * Math.PI * 2, d = rabbitRand(RABBIT.spawnMin, RABBIT.spawnMax);
      out.set(player.pos.x + Math.cos(a) * d, 0, player.pos.z + Math.sin(a) * d);
    }
    if (rabbitSpotOk(out.x, out.z, anywhere)) return true;
  }
  return false;
}

function rabbitSpotOk(x, z, anywhere) {
  if (Math.hypot(x, z) > WORLD_RADIUS - 15) return false;
  const d = Math.hypot(x - player.pos.x, z - player.pos.z);
  if (d < RABBIT.spawnMin || d > RABBIT.spawnMax) return false;
  for (const c of nearbyColliders(x, z)) if (Math.hypot(x - c.x, z - c.z) < c.r + 0.4) return false;
  if (!anywhere && d < RABBIT.unseen) {
    camera.getWorldDirection(rabbitDir);
    const dot = ((x - camera.position.x) * rabbitDir.x + (z - camera.position.z) * rabbitDir.z) / Math.max(0.01, Math.hypot(x - camera.position.x, z - camera.position.z));
    if (dot > 0.45) return false;
  }
  return true;
}

// One hare, or a pair if there's `room` for two, somewhere around her. `anywhere` lets them
// appear in view, for the moment a run begins.
function spawnRabbit(anywhere, room) {
  if (!rabbitSpawnSpot(rabbitTmp, anywhere)) return 0;
  const hare = makeRabbit(rabbitTmp.x, rabbitTmp.z);
  if (room > 1 && Math.random() < 0.35) {
    const a = Math.random() * Math.PI * 2, d = rabbitRand(1.5, 4);
    const x = rabbitTmp.x + Math.cos(a) * d, z = rabbitTmp.z + Math.sin(a) * d;
    if (rabbitSpotOk(x, z, true)) {
      const mate = makeRabbit(x, z);
      hare.partner = mate;
      mate.partner = hare;
      return 2;
    }
  }
  return 1;
}

// Fills the forest around her straight away.
function fillRabbits() {
  const target = rabbitTarget();
  for (let tries = 0; tries < target * 4 && livingRabbits() < target; tries++) spawnRabbit(true, target - livingRabbits());
}

function livingRabbits() {
  let n = 0;
  for (const hare of rabbits) if (!hare.dead) n++;
  return n;
}

// A few hares around (x, z), for a moment that wants them (or for testing). Returns them.
function spawnRabbitsNear(x, z, n) {
  const made = [];
  for (let tries = 0; tries < n * 6 && made.length < n; tries++) {
    const a = Math.random() * Math.PI * 2, d = rabbitRand(3, 18);
    const hx = x + Math.cos(a) * d, hz = z + Math.sin(a) * d;
    if (Math.hypot(hx, hz) > WORLD_RADIUS - 15) continue;
    if (nearbyColliders(hx, hz).some((c) => Math.hypot(hx - c.x, hz - c.z) < c.r + 0.4)) continue;
    made.push(makeRabbit(hx, hz));
  }
  return made;
}

/* ---------- Behaviour ---------- */
function setRabbitState(hare, state, timer) {
  hare.state = state;
  hare.timer = timer;
}

// Something has frightened it: it drops flat and, a beat later, bolts. A hare that
// freezes on its own account drums the alarm, and the others close by take notice.
function freezeRabbit(hare, delay, alarm) {
  if (hare.dead || hare.state === 'freeze' || hare.state === 'flee') return;
  setRabbitState(hare, 'freeze', delay);
  hare.leads = false;
  if (!alarm) return;
  const d = Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z);
  if (d < 40) Sfx.hareThump(1 - d / 40);
  for (const other of rabbits) {
    if (other !== hare && !other.dead && rabbitCalm.has(other.state) && Math.hypot(other.pos.x - hare.pos.x, other.pos.z - hare.pos.z) < 12) {
      freezeRabbit(other, rabbitRand(0.3, 0.9), false);
    }
  }
}

function boltRabbit(hare) {
  setRabbitState(hare, 'flee', rabbitRand(2.5, 4));
  hare.wary = 30;
  hare.zigT = 0;
  const d = Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z);
  if (d < 45) {
    Sfx.hareBolt(1 - d / 45);
    burst(rabbitTmp.set(hare.pos.x, hare.pos.y + 0.08, hare.pos.z), 0xf2f5ff, 6, 1.6);
  }
}

// Frightened by something at (x, z) other than her: a crashing tree, an arrow, a kill.
function rabbitSpook(hare, x, z, delay = 0.1) {
  if (hare.dead) return;
  hare.spook = { x, z, t: 2.5 };
  if (hare.state === 'flee') return;
  if (hare.state === 'freeze') hare.timer = Math.min(hare.timer, delay);
  else freezeRabbit(hare, delay, false);
}

function rabbitsHear(x, z, radius, delay) {
  for (const hare of rabbits) {
    if (!hare.dead && Math.hypot(hare.pos.x - x, hare.pos.z - z) < radius) rabbitSpook(hare, x, z, delay + Math.random() * 0.3);
  }
}

// The gait for what it's doing, or null when it's keeping still.
function rabbitGaitFor(hare) {
  if (hare.state === 'flee') return RABBIT_GAITS.bolt;
  if (hare.state === 'romp') return RABBIT_GAITS.romp;
  if (hare.state === 'hop' && hare.hops > 0) return RABBIT_GAITS.amble;
  return null;
}

// Decides what a living hare does next and which way it wants to face.
function rabbitThink(hare, dt) {
  const she = rabbitWatch;
  const d = Math.hypot(she.x - hare.pos.x, she.z - hare.pos.z);
  // Whatever it fears most: something that startled it, a wolf close by, or her.
  let tx = she.x, tz = she.z, td = d, wolfNear = false;
  for (const wolf of wolves) {
    const wd = Math.hypot(wolf.pos.x - hare.pos.x, wolf.pos.z - hare.pos.z);
    if (wd < RABBIT.wolf && wd < td) { tx = wolf.pos.x; tz = wolf.pos.z; td = wd; wolfNear = true; }
  }
  if (hare.spook) {
    hare.spook.t -= dt;
    if (hare.spook.t <= 0) hare.spook = null;
    else { tx = hare.spook.x; tz = hare.spook.z; }
  }
  hare.wary -= dt;
  hare.timer -= dt;
  const reach = (hare.wary > 0 ? RABBIT.wary : 1) * (she.running ? RABBIT.sprint : she.sneaking ? RABBIT.sneak : 1);
  const fleeR = RABBIT.flee * reach, alertR = RABBIT.alert * reach;
  const toThreat = Math.atan2(tx - hare.pos.x, tz - hare.pos.z);

  if (rabbitCalm.has(hare.state)) {
    if (wolfNear) freezeRabbit(hare, 0.08, true);
    else if (d < fleeR) freezeRabbit(hare, she.running ? 0.12 : rabbitRand(0.25, 0.9), true);
    else if (d < alertR) { setRabbitState(hare, 'alert', 0); hare.leads = false; }
  } else if (hare.state === 'alert') {
    if (d < fleeR || wolfNear) freezeRabbit(hare, rabbitRand(0.2, 0.7), true);
    else if (d > alertR * 1.25) setRabbitState(hare, 'graze', rabbitRand(1, 3));
  } else if (hare.state === 'freeze') {
    if (d < 3 || wolfNear || (she.running && d < fleeR * 0.6)) hare.timer = Math.min(hare.timer, 0);
    if (hare.timer <= 0) boltRabbit(hare);
  } else if (hare.state === 'flee' && hare.timer <= 0) {
    // Far enough: sit up and look back. Not yet: keep going.
    if (td > fleeR * 1.8 && !hare.spook) setRabbitState(hare, 'sit', rabbitRand(2, 4));
    else hare.timer = 1.2;
  }

  // Its own little routine while nothing troubles it.
  if (hare.timer <= 0 && rabbitCalm.has(hare.state)) {
    if (hare.state === 'graze') rabbitNextIdle(hare, d, alertR);
    else setRabbitState(hare, 'graze', rabbitRand(2, 6));
  }
  if (hare.state === 'hop') {
    const left = Math.hypot(hare.target.x - hare.pos.x, hare.target.z - hare.pos.z);
    if (left < 0.4) hare.hops = 0;
    if (hare.hops <= 0 && hare.hop < 0) setRabbitState(hare, 'graze', rabbitRand(2, 6));
  }

  // Which way it wants to face.
  let want = hare.heading, rate = 3;
  if (hare.state === 'flee') {
    hare.zigT -= dt;
    if (hare.zigT <= 0) {
      // A jink: a sharp change of line, alternating sides, that throws off whatever chases.
      hare.zigT = rabbitRand(0.3, 0.75);
      hare.zig = -Math.sign(hare.zig) * rabbitRand(0.35, 0.95);
      if (Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z) < 40 && hare.hop >= 0) burst(rabbitTmp.set(hare.pos.x, hare.pos.y + 0.05, hare.pos.z), 0xf2f5ff, 3, 1.3);
    }
    want = toThreat + Math.PI + hare.zig;
    // Away from the edge of the world, not into it.
    if (Math.hypot(hare.pos.x, hare.pos.z) > WORLD_RADIUS - 30) want = Math.atan2(-hare.pos.x, -hare.pos.z) + hare.zig;
    rate = 12;
  } else if (hare.state === 'alert') {
    // Hares watch side-on, with an eye on each side of the head.
    const side = Math.sin(hare.heading - toThreat) > 0 ? 1 : -1;
    want = toThreat + side * Math.PI / 2;
    rate = 1.5;
  } else if (hare.state === 'hop') {
    want = Math.atan2(hare.target.x - hare.pos.x, hare.target.z - hare.pos.z);
    rate = 5;
  } else if (hare.state === 'romp') {
    const mate = hare.partner;
    // The leader weaves in loops; the other follows it round.
    if (hare.leads || !mate) want = hare.heading + Math.sin(game.time * 2.3 + hare.seed) * 0.9;
    else want = Math.atan2(mate.pos.x - hare.pos.x, mate.pos.z - hare.pos.z);
    rate = 6;
  }
  if (hare.state !== 'freeze') {
    const turn = Math.atan2(Math.sin(want - hare.heading), Math.cos(want - hare.heading));
    hare.heading += turn * (1 - Math.exp(-rate * dt));
  }

  // Where the head points: at the danger when alarmed, idly about when sitting.
  const rel = Math.atan2(Math.sin(toThreat - hare.heading), Math.cos(toThreat - hare.heading));
  let look = 0;
  if (hare.state === 'alert' || hare.state === 'freeze') look = clamp(rel, -1.1, 1.1) * 0.6;
  else if (hare.state === 'sit') look = Math.sin(game.time * 0.7 + hare.seed) * 0.8;
  else if (hare.state === 'graze') look = Math.sin(game.time * 0.3 + hare.seed) * 0.25;
  hare.look += (look - hare.look) * (1 - Math.exp(-6 * dt));
}

// When a quiet spell of grazing ends: amble on, sit up for a look round, or romp.
function rabbitNextIdle(hare, d, alertR) {
  const mate = hare.partner;
  const roll = Math.random();
  if (mate && !mate.dead && rabbitCalm.has(mate.state) && mate.state !== 'romp' && roll < 0.08 && d > alertR * 1.5
    && Math.hypot(mate.pos.x - hare.pos.x, mate.pos.z - hare.pos.z) < 10) {
    // One sets off and the other gives chase, round and round.
    const time = rabbitRand(2.5, 4.5);
    setRabbitState(hare, 'romp', time);
    setRabbitState(mate, 'romp', time + 0.4);
    hare.leads = true;
    mate.leads = false;
  } else if (roll < 0.62) {
    const a = Math.random() * Math.PI * 2, dist = rabbitRand(1.5, 6);
    hare.target.set(hare.pos.x + Math.cos(a) * dist, 0, hare.pos.z + Math.sin(a) * dist);
    hare.hops = 1 + Math.floor(Math.random() * 5);
    setRabbitState(hare, 'hop', 8);
  } else if (roll < 0.86) {
    setRabbitState(hare, 'sit', rabbitRand(1.5, 3.5));
  } else {
    setRabbitState(hare, 'graze', rabbitRand(2, 5));
  }
}

// Moves a living hare: one hop at a time, a little arc through the air each.
function rabbitMove(hare, dt) {
  const want = rabbitGaitFor(hare);
  if (hare.hop < 0 && want) {
    hare.rest -= dt;
    if (hare.rest <= 0) { hare.gait = want; hare.hop = 0; }
  }
  hare.lift = 0;
  if (hare.hop >= 0) {
    const g = hare.gait;
    // A wounded hare limps: slow, short, lopsided hops.
    hare.hop += dt / (g.time * (hare.wounded ? 1.5 : 1));
    const step = g.speed * (hare.wounded ? RABBIT.limp : 1) * dt;
    hare.pos.x += Math.sin(hare.heading) * step;
    hare.pos.z += Math.cos(hare.heading) * step;
    pushOutOfColliders(hare.pos, 0.15);
    // Clear of her feet, too.
    const px = hare.pos.x - player.pos.x, pz = hare.pos.z - player.pos.z, pd = Math.hypot(px, pz);
    if (pd < 0.5 && pd > 1e-4) { hare.pos.x = player.pos.x + (px / pd) * 0.5; hare.pos.z = player.pos.z + (pz / pd) * 0.5; }
    const r = Math.hypot(hare.pos.x, hare.pos.z);
    if (r > WORLD_RADIUS - 5) { hare.pos.x *= (WORLD_RADIUS - 5) / r; hare.pos.z *= (WORLD_RADIUS - 5) / r; }
    hare.pos.y = groundHeight(hare.pos.x, hare.pos.z);
    if (hare.hop >= 1) {
      // Landed. A bolting hare springs straight into the next bound.
      if (g === RABBIT_GAITS.amble) hare.hops--;
      if (hare.wounded) hare.limpStep = (hare.limpStep || 0) + 1;
      if (want === g && g.rest[1] === 0) hare.hop -= 1;
      else { hare.hop = -1; hare.rest = rabbitRand(g.rest[0], g.rest[1]); }
      if (g !== RABBIT_GAITS.amble && Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z) < 35) {
        burst(rabbitTmp.set(hare.pos.x, hare.pos.y + 0.04, hare.pos.z), 0xf2f5ff, 2, 0.9);
      }
    }
    if (hare.hop >= 0) hare.lift = 4 * hare.hop * (1 - hare.hop) * g.height * (hare.wounded ? (hare.limpStep % 2 ? 0.25 : 0.55) : 1);
  }
}

// Ears that flick now and then, faster when it's on edge.
function rabbitTwitch(hare, dt) {
  for (let i = 0; i < 2; i++) {
    hare.twitch[i] = Math.max(0, hare.twitch[i] - dt);
    hare.twitchT[i] -= dt;
    if (hare.twitchT[i] <= 0) {
      hare.twitch[i] = 0.3;
      hare.twitchT[i] = hare.state === 'alert' ? rabbitRand(0.3, 1.4) : rabbitRand(1, 5);
    }
  }
}

/* ---------- Posing ---------- */
function easeRabbit(hare, key, goal, rate, dt) {
  hare[key] += (goal - hare[key]) * (1 - Math.exp(-rate * dt));
}

function poseRabbit(hare, dt) {
  const r = hare.rig;
  const s = hare.state;
  easeRabbit(hare, 'up', s === 'sit' || s === 'alert' ? 1 : 0, 7, dt);
  easeRabbit(hare, 'flat', s === 'freeze' ? 1 : 0, 14, dt);
  easeRabbit(hare, 'graze', s === 'graze' ? 1 : 0, 4, dt);
  easeRabbit(hare, 'run', s === 'flee' ? 1 : s === 'romp' ? 0.5 : 0, 8, dt);
  const air = hare.hop >= 0;
  const h = air ? hare.hop : 0, amp = air ? hare.gait.amp : 0;
  const sinH = Math.sin(Math.PI * h), cosH = Math.cos(Math.PI * h);
  const t = game.time + hare.seed;

  r.root.position.set(hare.pos.x, hare.pos.y + hare.lift, hare.pos.z);
  r.root.rotation.set(0, hare.heading, 0);
  // Nose up as it springs, nose down as it lands; rearing up on its haunches to look round.
  const pitch = -hare.up * 0.95 + hare.graze * 0.1 + hare.flat * 0.05 - cosH * 0.28 * amp;
  r.hips.position.y = 0.12 - hare.flat * 0.035;
  r.hips.rotation.set(pitch, 0, 0);
  // Stretched out in the air, gathered on landing, pressed flat when it freezes.
  r.body.scale.set(1 + hare.flat * 0.08, 1 - hare.flat * 0.12, 1 + sinH * 0.12 * amp);
  // Nibbling in little bursts while it grazes.
  const nibble = hare.graze * Math.max(0, Math.sin(t * 1.3)) * Math.sin(t * 17) * 0.06;
  r.neck.position.set(0, 0.14 - hare.flat * 0.03, 0.28 - hare.flat * 0.015);
  r.neck.rotation.set(-pitch * 0.85 + hare.graze * 0.72 - hare.flat * 0.15 + nibble + cosH * 0.12 * amp, hare.look, 0);
  // Ears up and swivelling; laid back flat when it freezes or runs.
  const back = hare.flat * 1.2 + hare.run * 0.95 + amp * 0.15;
  const turn = (hare.state === 'alert' ? clamp(hare.look * 1.4, -0.7, 0.7) : 0);
  const flick = (i) => Math.sin(hare.twitch[i] * 52) * hare.twitch[i] * 1.4;
  r.earL.rotation.set(-0.2 - back + flick(0), turn + 0.1, -0.2 + back * 0.1 + flick(0) * 0.5);
  r.earR.rotation.set(-0.2 - back + flick(1), turn - 0.1, 0.2 - back * 0.1 - flick(1) * 0.5);
  // Fore legs reach out in flight and land under the chest; hind legs drive back, then swing
  // forward past them. Sitting up, the fore paws hang and the big hind feet stay flat.
  const fore = hare.up * 0.55 + (0.4 * cosH - 0.9 * sinH) * amp - hare.flat * 0.45;
  const hind = -pitch + (0.75 * cosH - 0.1) * amp - hare.flat * 0.2;
  r.foreL.rotation.x = fore;
  r.foreR.rotation.x = fore + (air ? 0.12 * amp : 0);
  r.hindL.rotation.x = hind;
  r.hindR.rotation.x = hind - (air ? 0.08 * amp : 0);
}

// Lying where it fell, rolled onto its side, ears and legs slack.
function poseDeadRabbit(hare) {
  const r = hare.rig, d = hare.dead;
  const u = smooth(d.t / 0.35);
  const roll = d.roll * u;
  r.root.position.set(hare.pos.x, hare.pos.y + d.y + 0.1 * RABBIT.scale * Math.abs(Math.sin(roll)), hare.pos.z);
  r.root.rotation.set(0, hare.heading, roll);
  r.hips.position.y = 0.12;
  r.hips.rotation.set(0, 0, 0);
  r.body.scale.set(1, 1, 1);
  r.neck.position.set(0, 0.14, 0.28);
  r.neck.rotation.set(-0.3 * u, 0, 0);
  r.earL.rotation.set(-0.2 - 0.85 * u, 0.1, -0.2 - 0.3 * u);
  r.earR.rotation.set(-0.2 - 0.75 * u, -0.1, 0.2 + 0.2 * u);
  r.foreL.rotation.x = r.foreR.rotation.x = -0.65 * u;
  r.hindL.rotation.x = r.hindR.rotation.x = 0.85 * u;
}

/* ---------- Death ---------- */
// The middle of a hare's body, where arrows strike it.
function rabbitCentre(hare, out) {
  if (hare.dead) return out.set(hare.pos.x, hare.pos.y + hare.dead.y + 0.1, hare.pos.z);
  return out.set(hare.pos.x, hare.pos.y + hare.lift + (0.17 + hare.up * 0.07 - hare.flat * 0.05) * RABBIT.scale, hare.pos.z);
}

// Whether a point is inside a living hare: a short capsule from scut to shoulders, standing
// up when it sits up.
function rabbitStruck(hare, p) {
  const s = RABBIT.scale;
  const dx = p.x - hare.pos.x, dz = p.z - hare.pos.z;
  const along = dx * Math.sin(hare.heading) + dz * Math.cos(hare.heading);
  const side = dx * Math.cos(hare.heading) - dz * Math.sin(hare.heading);
  const up = hare.up;
  // Along the body when on all fours; nearly upright from the haunch when sitting.
  const a0 = -0.1 * s, a1 = lerp(0.22, 0.08, up) * s;
  const y0 = hare.pos.y + hare.lift + 0.15 * s, y1 = y0 + up * 0.28 * s;
  const ax = a1 - a0, ay = y1 - y0;
  const k = clamp(((along - a0) * ax + (p.y - y0) * ay) / (ax * ax + ay * ay), 0, 1);
  return Math.hypot(along - (a0 + ax * k), p.y - (y0 + ay * k), side) < RABBIT.hit * s;
}

// Killed by `by` ('arrow', 'axe' or 'katana'). `push` throws it along the ground and `toss`
// up into the air: the blade sends them tumbling.
function killRabbit(hare, by, push, toss = 0) {
  if (hare.dead || hare.gone) return;
  const carry = hare.hop >= 0 ? hare.gait.speed * 0.5 : 0;
  hare.dead = {
    t: 0,
    roll: (Math.random() < 0.5 ? -1 : 1) * 1.45,
    vel: new THREE.Vector3(Math.sin(hare.heading) * carry, 0, Math.cos(hare.heading) * carry),
    vy: toss,
    y: hare.lift,
    spin: toss ? (Math.random() - 0.5) * 14 : 0,
  };
  if (push) hare.dead.vel.add(push);
  hare.state = 'dead';
  hare.lift = 0;
  hare.hop = -1;
  if (hare.partner) { hare.partner.partner = null; hare.partner = null; }
  const d = Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z);
  Sfx.hareSqueal(Math.max(0.2, 1 - d / 50));
  rabbitCentre(hare, rabbitTmp);
  burst(rabbitTmp, 0xf2f5ff, 10, 2);
  burst(rabbitTmp, 0xe4ddd2, 5, 1.2);
  hare.rig.glint.visible = true;
  hare.entry = addInteractable({
    x: hare.pos.x, z: hare.pos.z, r: 2,
    label: 'Press E to take the hare',
    active: () => !!hare.dead && hare.dead.t > 0.4,
    use: () => takeRabbit(hare),
  });
  // The others close by scatter.
  rabbitsHear(hare.pos.x, hare.pos.z, 16, 0.05);
  emitGame('creatureKilled', 'rabbit', by);
  trimRabbitCarcasses();
}

// Too many lying about: the furthest from her go.
function trimRabbitCarcasses() {
  const dead = rabbits.filter((h) => h.dead);
  if (dead.length <= RABBIT.carcasses) return;
  dead.sort((a, b) => Math.hypot(b.pos.x - player.pos.x, b.pos.z - player.pos.z) - Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z));
  for (const hare of dead.slice(0, dead.length - RABBIT.carcasses)) removeRabbit(hare);
}

function updateDeadRabbit(hare, dt) {
  const d = hare.dead;
  d.t += dt;
  if (d.y > 0 || d.vy !== 0 || d.vel.lengthSq() > 1e-4) {
    hare.pos.addScaledVector(d.vel, dt);
    d.vy -= 9.8 * dt;
    d.y += d.vy * dt;
    if (d.y <= 0) {
      d.y = 0;
      if (d.vy < -2.5) {
        // A bounce in a spray of snow.
        d.vy *= -0.3;
        burst(rabbitTmp.set(hare.pos.x, hare.pos.y + 0.05, hare.pos.z), 0xf2f5ff, 6, 1.5);
      } else {
        d.vy = 0;
      }
      d.vel.multiplyScalar(Math.exp(-6 * dt));
      d.spin *= Math.exp(-6 * dt);
    }
    hare.heading += d.spin * dt;
    pushOutOfColliders(hare.pos, 0.15);
    hare.pos.y = groundHeight(hare.pos.x, hare.pos.z);
    if (hare.entry) { hare.entry.x = hare.pos.x; hare.entry.z = hare.pos.z; }
  }
}

// She picks it up: meat for the fire and a pelt for warm things.
function takeRabbit(hare) {
  if (!hare.dead || hare.gone) return;
  packAdd('rabbit_raw', 1);
  packAdd('pelt', 1);
  removeRabbit(hare);
}

/* ---------- Wolves and hares ---------- */
// The nearest hare out in the open within `range` of a hunting wolf, if any.
function rabbitPrey(pos, range) {
  let best = null, bestD = range;
  for (const hare of rabbits) {
    if (hare.dead) continue;
    const d = Math.hypot(hare.pos.x - pos.x, hare.pos.z - pos.z);
    if (d < bestD) { best = hare; bestD = d; }
  }
  return best;
}

function rabbitCatchable(hare) {
  return !hare.dead && !hare.gone;
}

// A wolf has it. Nothing is left but scattered snow and a few tufts of fur.
function rabbitCaught(hare, wolf) {
  const d = Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z);
  if (d < 60) Sfx.hareSqueal(0.6 * (1 - d / 60));
  rabbitCentre(hare, rabbitTmp);
  burst(rabbitTmp, 0xf2f5ff, 12, 2.2);
  burst(rabbitTmp, 0xe4ddd2, 6, 1.4);
  rabbitsHear(hare.pos.x, hare.pos.z, 18, 0.05);
  removeRabbit(hare);
}

/* ---------- Combat ---------- */
// An arrow lodged in a creature, so it carries the arrow off with it. Sunk a little way
// past the point of the hit, along its flight.
function lodgeArrow(parent, arrow, list) {
  const mesh = buildArrowMesh();
  rabbitDir.copy(arrow.vel).normalize();
  parent.updateMatrixWorld(true);
  const scale = parent.getWorldScale(rabbitMid).x;
  rabbitTmp.copy(arrow.tip).addScaledVector(rabbitDir, 0.12 - BOW.arrowLength);
  parent.worldToLocal(rabbitTmp);
  mesh.position.copy(rabbitTmp);
  rabbitDir.applyQuaternion(parent.getWorldQuaternion(rabbitQuat).invert());
  mesh.quaternion.setFromUnitVectors(FORWARD, rabbitDir);
  mesh.scale.setScalar(1 / scale);
  parent.add(mesh);
  list.push(mesh);
  // A pincushion helps nobody: only the last few stay.
  while (list.length > 4) parent.remove(list.shift());
}

// Called at every step of a flying arrow: true if a hare or a wolf took it. A near miss
// still sends a hare running.
function arrowHitsCreature(arrow) {
  const tip = arrow.tip;
  // A second point half a step back, so a fast arrow can't skip over a small hare.
  rabbitMid.copy(arrow.vel).normalize();
  const backX = tip.x - rabbitMid.x * 0.125, backY = tip.y - rabbitMid.y * 0.125, backZ = tip.z - rabbitMid.z * 0.125;
  for (const hare of rabbits) {
    if (hare.dead) continue;
    const dx = hare.pos.x - tip.x, dz = hare.pos.z - tip.z;
    if (Math.abs(dx) > 3 || Math.abs(dz) > 3) continue;
    const hit = rabbitStruck(hare, tip) || rabbitStruck(hare, rabbitMid.set(backX, backY, backZ));
    if (hit) {
      lodgeArrow(hare.rig.root, arrow, hare.rig.arrows);
      // A light shot wounds a sound hare rather than killing it: it limps off, slowly.
      if (!hare.wounded && arrow.power < 0.8) {
        hare.wounded = true;
        Sfx.arrowFlesh();
        Sfx.hareSqueal(0.5);
        boltRabbit(hare);
        markCombat('hare');
        return true;
      }
      rabbitDir.copy(arrow.vel).setY(0).normalize().multiplyScalar(1.5 * arrow.power);
      killRabbit(hare, 'arrow', rabbitDir.clone());
      Sfx.arrowFlesh();
      markCombat('hare');
      return true;
    }
    if (Math.hypot(dx, dz) < 3 && tip.y - hare.pos.y < 2.5 && hare.state !== 'flee') rabbitSpook(hare, player.pos.x, player.pos.z, 0.05);
  }
  for (const wolf of wolves) {
    if (Math.abs(wolf.pos.x - tip.x) > 2 || Math.abs(wolf.pos.z - tip.z) > 2) continue;
    const part = wolf.struck(tip) || wolf.struck(rabbitMid.set(backX, backY, backZ));
    if (!part) continue;
    lodgeArrow(wolf.holder, arrow, wolf.arrows);
    const draw = clamp((arrow.power - BOW.minDraw) / (1 - BOW.minDraw), 0, 1);
    const damage = lerp(WOLF.arrowDamage[0], WOLF.arrowDamage[1], draw) * (part === 'head' ? WOLF.headshot : 1);
    burst(tip, 0x8a7a6a, 6, 1.6);
    Sfx.arrowFlesh();
    wolf.hurt(damage, 'arrow');
    markCombat('wolf');
    return true;
  }
  return false;
}

// A blow landing at (x, z) with `weapon` ('axe' or 'katana'): the nearest hare or wolf in
// `reach` takes it. True if one did.
function meleeHit(x, z, reach, weapon) {
  let best = null, bestD = reach, isWolf = false;
  for (const hare of rabbits) {
    if (hare.dead) continue;
    const d = Math.hypot(hare.pos.x - x, hare.pos.z - z) - 0.15 * RABBIT.scale;
    if (d < bestD) { best = hare; bestD = d; isWolf = false; }
  }
  for (const wolf of wolves) {
    const d = wolf.distanceTo(x, z);
    if (d < bestD) { best = wolf; bestD = d; isWolf = true; }
  }
  if (!best) return false;
  const push = new THREE.Vector3(best.pos.x - player.pos.x, 0, best.pos.z - player.pos.z);
  if (push.lengthSq() < 1e-4) push.set(Math.sin(player.bodyYaw), 0, Math.cos(player.bodyYaw));
  push.normalize();
  if (isWolf) {
    const at = best.bodyCentre(new THREE.Vector3());
    burst(at, 0x8a7a6a, 8, 2);
    if (weapon === 'katana') best.die(weapon, push.multiplyScalar(4));
    else best.hurt(WOLF.axeDamage, weapon);
  } else {
    killRabbit(best, weapon, push.multiplyScalar(2.5), 2);
  }
  Sfx.arrowFlesh();
  player.shake = Math.max(player.shake, 0.12);
  markCombat(isWolf ? 'wolf' : 'hare');
  return true;
}

// The blade's sweep: every hare and wolf within `radius` of (x, z) and inside the arc
// (`arc` radians wide, centred on `yaw`) is cut down and thrown clear. Returns how many.
function sliceCreatures(x, z, radius, yaw, arc) {
  const half = arc / 2;
  const inArc = (px, pz, pad) => {
    const dx = px - x, dz = pz - z, d = Math.hypot(dx, dz);
    if (d - pad > radius) return false;
    if (d < 0.8) return true;
    const a = Math.atan2(dx, dz) - yaw;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= half;
  };
  const away = (px, pz, speed) => {
    const v = new THREE.Vector3(px - x, 0, pz - z);
    if (v.lengthSq() < 1e-4) v.set(Math.sin(yaw), 0, Math.cos(yaw));
    return v.normalize().multiplyScalar(speed);
  };
  let count = 0;
  for (const hare of [...rabbits]) {
    if (hare.dead || !inArc(hare.pos.x, hare.pos.z, 0.15 * RABBIT.scale)) continue;
    killRabbit(hare, 'katana', away(hare.pos.x, hare.pos.z, rabbitRand(4, 7)), rabbitRand(3, 5));
    count++;
  }
  for (const wolf of [...wolves]) {
    if (!inArc(wolf.pos.x, wolf.pos.z, 0.6)) continue;
    wolf.die('katana', away(wolf.pos.x, wolf.pos.z, 5));
    count++;
  }
  // Whatever survived the sweep heard it.
  rabbitsHear(x, z, radius + 20, 0.05);
  if (count) markCombat('wolf');
  return count;
}

/* ---------- Each frame ---------- */
function initRabbits() {
  getRabbitKit();
  onGame('runStart', fillRabbits);
  onGame('revived', fillRabbits);
  // A falling tree sends every hare within earshot running.
  onGame('treeFelled', (tree) => rabbitsHear(tree.placement.x, tree.placement.z, 35, 0.3));
}

// A fresh run: every hare gone, and the dead wolves with them.
function resetRabbits() {
  for (const hare of [...rabbits]) removeRabbit(hare);
  clearWolfRemains();
  Object.assign(rabbitWatch, { x: player.pos.x, z: player.pos.z, speed: 0, running: false, sneaking: false });
}

function updateRabbits(dt) {
  // How much noise she's making. A sudden jump (a teleport, waking elsewhere) isn't speed.
  const she = rabbitWatch;
  const moved = Math.hypot(player.pos.x - she.x, player.pos.z - she.z) / Math.max(dt, 1e-3);
  she.speed += (Math.min(moved, 12) - she.speed) * (1 - Math.exp(-8 * dt));
  she.x = player.pos.x;
  she.z = player.pos.z;
  she.running = player.sprinting || !!player.dodge || she.speed > 5.6;
  she.sneaking = !she.running && (aiming || player.drawing || she.speed < 0.3);

  // Keep the forest stocked, one at a time, out of her sight.
  const room = rabbitTarget() - livingRabbits();
  if (room > 0) spawnRabbit(false, room);

  for (const hare of [...rabbits]) {
    if (hare.gone) continue;
    const d = Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z);
    if (d > RABBIT.despawn) { removeRabbit(hare); continue; }
    const shown = d < RABBIT.show;
    hare.rig.root.visible = shown;
    if (hare.dead) {
      updateDeadRabbit(hare, dt);
      if (shown) poseDeadRabbit(hare);
      continue;
    }
    rabbitThink(hare, dt);
    rabbitMove(hare, dt);
    rabbitTwitch(hare, dt);
    if (shown) poseRabbit(hare, dt);
  }

  // The glint over the dead: a soft twinkle every few seconds.
  const cycle = (game.time % 2.6) / 2.6;
  const flash = Math.max(0, Math.sin(cycle * Math.PI * 2 - 1.2)) ** 6;
  rabbitKit.glint.opacity = 0.12 + flash * 0.6;
}
