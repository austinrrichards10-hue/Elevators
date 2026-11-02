// The opening: a stricken plane over the forest, a fall through the sky and the trees,
// and the crash site the plane leaves somewhere out on the map. Staged in the game world
// with hard cuts, impact frames, speed lines and letterboxing for an anime feel.

/* ---------- Models ---------- */
let planeMats = null;
function getPlaneMats() {
  if (!planeMats) {
    planeMats = {
      hull: new THREE.MeshStandardMaterial({ color: 0xe4e8ef, metalness: 0.35, roughness: 0.45 }),
      stripe: new THREE.MeshStandardMaterial({ color: 0xb4203a, metalness: 0.2, roughness: 0.5 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1d2230, metalness: 0.5, roughness: 0.4 }),
      burnt: new THREE.MeshStandardMaterial({ color: 0x2a2523, roughness: 0.95 }),
      prop: new THREE.MeshBasicMaterial({ color: 0xc8ced8, transparent: true, opacity: 0.16, depthWrite: false }),
    };
  }
  return planeMats;
}

// A twin-prop cargo plane, nose along +Z. With `wreck` set, only the broken sections.
function buildPlane() {
  const m = getPlaneMats();
  const plane = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    plane.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(1.35, 1.35, 12, 16).rotateX(Math.PI / 2), m.hull, 0, 0, 0);
  add(new THREE.SphereGeometry(1.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), m.hull, 0, 0, 6);
  add(new THREE.CylinderGeometry(1.35, 0.35, 5, 16).rotateX(-Math.PI / 2), m.hull, 0, 0.35, -8.4);
  add(new THREE.BoxGeometry(2.74, 0.35, 12), m.stripe, 0, -0.15, 0);
  add(new THREE.BoxGeometry(2.0, 0.5, 0.9), m.dark, 0, 0.75, 6.4, 0.35);
  add(new THREE.BoxGeometry(19, 0.22, 2.6), m.hull, 0, 0.45, 1.2);
  add(new THREE.BoxGeometry(6.5, 0.16, 1.6), m.hull, 0, 0.6, -10.2);
  add(new THREE.BoxGeometry(0.2, 3, 2.2), m.hull, 0, 2, -10.4, -0.3);
  add(new THREE.BoxGeometry(0.22, 1.1, 1.4), m.stripe, 0, 3.0, -10.9, -0.3);
  // A strip of windows down each side.
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.35, 8.5), m.dark, side * 1.33, 0.45, 0.5);
  const props = [];
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.55, 0.5, 3, 12).rotateX(Math.PI / 2), m.hull, side * 4.3, 0.2, 2.3);
    const prop = add(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 20).rotateX(Math.PI / 2), m.prop, side * 4.3, 0.2, 3.85);
    props.push(prop);
  }
  plane.userData.props = props;
  // The cargo door on the left side, which blows open.
  const door = add(new THREE.BoxGeometry(0.08, 1.8, 1.5), m.dark, 1.36, 0.2, -2.5);
  plane.userData.door = door;
  return plane;
}

// Pooled sprites for smoke and fire, which drift, grow and fade over their lives.
function buildPuffs(count, color, fog = false) {
  const group = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color, transparent: true, opacity: 0, depthWrite: false, fog }));
    sprite.visible = false;
    group.add(sprite);
    puffs.push({ sprite, life: 0, max: 1, vel: new THREE.Vector3(), size: 1, grow: 1, alpha: 1 });
  }
  let next = 0;
  return {
    group,
    emit(at, vel, { life = 2, size = 1, grow = 2, alpha = 0.6 } = {}) {
      const p = puffs[next];
      next = (next + 1) % count;
      p.sprite.position.copy(at);
      p.vel.copy(vel);
      Object.assign(p, { life, max: life, size, grow, alpha });
      p.sprite.visible = true;
    },
    update(dt) {
      for (const p of puffs) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.sprite.visible = false; continue; }
        const age = 1 - p.life / p.max;
        p.sprite.position.addScaledVector(p.vel, dt);
        p.sprite.scale.setScalar(p.size * (1 + age * p.grow));
        p.sprite.material.opacity = p.alpha * Math.min(1, age * 6) * (1 - age * age);
      }
    },
    clear() { for (const p of puffs) { p.life = 0; p.sprite.visible = false; } },
  };
}

/* ---------- The crash site ---------- */
const wreck = { group: null, x: 0, z: 0, smoke: null, fire: null, burning: false, clearing: null, colliders: [] };

// Picks somewhere new for the plane to come down, clears the trees there and builds the
// broken plane, quiet until the cutscene (or a skip) sets it burning.
function placeWreck() {
  if (wreck.group) scene.remove(wreck.group);
  if (wreck.clearing) CLEARINGS.splice(CLEARINGS.indexOf(wreck.clearing), 1);
  for (const c of wreck.colliders) LANDMARK_COLLIDERS.splice(LANDMARK_COLLIDERS.indexOf(c), 1);
  let x = 0, z = 0;
  for (let tries = 0; tries < 50; tries++) {
    const a = Math.random() * Math.PI * 2, d = 260 + Math.random() * 340;
    x = LANDMARKS.start.x + Math.cos(a) * d;
    z = LANDMARKS.start.z + Math.sin(a) * d;
    if (Math.hypot(x, z) < WORLD_RADIUS - 90 && Math.hypot(x - LANDMARKS.altar.x, z - LANDMARKS.altar.z) > 60) break;
  }
  wreck.x = x;
  wreck.z = z;
  wreck.clearing = [{ x, z }, 16];
  CLEARINGS.push(wreck.clearing);
  wreck.colliders = [{ x, z, r: 2.2, h: 4 }, { x: x - 7, z: z + 3, r: 2, h: 3 }];
  LANDMARK_COLLIDERS.push(...wreck.colliders);

  const m = getPlaneMats();
  const group = new THREE.Group();
  group.position.set(x, groundHeight(x, z), z);
  const front = buildPlane();
  // The nose section, ploughed in and tipped over; the tail section further back.
  front.position.set(0, 0.25, 0);
  front.rotation.set(0.22, 0.4, 0.22);
  group.add(front);
  front.children.forEach((child) => { if (child.position.z < -3) child.visible = false; });
  const tail = buildPlane();
  tail.position.set(-7, 0.4, 3);
  tail.rotation.set(-0.15, 0.9, -0.35);
  tail.children.forEach((child) => { if (child.position.z > -3) child.visible = false; });
  group.add(tail);
  // A burnt patch draped over the ground's shape.
  const scorchGeo = new THREE.RingGeometry(0.01, 9, 24, 6).rotateX(-Math.PI / 2);
  const sp = scorchGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, groundHeight(x + sp.getX(i), z + sp.getZ(i)) - group.position.y + 0.06);
  const scorch = new THREE.Mesh(scorchGeo, new THREE.MeshBasicMaterial({ color: 0x1b1714, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  group.add(scorch);
  for (let i = 0; i < 9; i++) {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random(), 0.12, 0.4 + Math.random()), Math.random() < 0.5 ? m.hull : m.burnt);
    const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 9;
    piece.position.set(Math.cos(a) * d, groundHeight(x + Math.cos(a) * d, z + Math.sin(a) * d) - group.position.y + 0.08, Math.sin(a) * d);
    piece.rotation.set(Math.random(), Math.random() * 3, Math.random());
    group.add(piece);
  }
  // Fires in the wreckage, and a smoke column hundreds of metres tall, so it shows above
  // the treetops from far away.
  wreck.fire = buildPuffs(40, 0xff9a4a);
  wreck.fire.group.position.set(0, 0.5, 0);
  group.add(wreck.fire.group);
  wreck.smoke = buildPuffs(240, 0x302d2a);
  group.add(wreck.smoke.group);
  scene.add(group);
  wreck.group = group;
  wreck.burning = false;
  wreck.emitT = 0;
}

const puffVel = new THREE.Vector3(), puffAt = new THREE.Vector3();
function updateWreck(dt) {
  if (!wreck.group || !wreck.burning) return;
  wreck.emitT -= dt;
  while (wreck.emitT <= 0) {
    wreck.emitT += 0.08;
    puffAt.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3);
    wreck.smoke.emit(puffAt, puffVel.set(1.5 + Math.random() * 2, 14 + Math.random() * 5, 0.6), { life: 18, size: 8, grow: 6, alpha: 0.85 });
    puffAt.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4);
    wreck.fire.emit(puffAt, puffVel.set(0, 1.5 + Math.random() * 2, 0), { life: 0.8, size: 0.9, grow: -0.5, alpha: 0.9 });
  }
  wreck.smoke.update(dt);
  wreck.fire.update(dt);
}

function setWreckBurning() {
  if (!wreck.burning) {
    wreck.burning = true;
    // Start with a column already standing, as if it has been burning a while.
    for (let i = 0; i < 160; i++) updateWreck(0.12);
  }
}

/* ---------- Overlays ---------- */
const cineCanvas = () => $('speedlines');
function drawSpeedLines(strength, time) {
  const canvas = cineCanvas();
  const w = canvas.width = innerWidth, h = canvas.height = innerHeight;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, w, h);
  if (strength <= 0.01) return;
  const rand = seededRandom(Math.floor(time * 24));
  const cx = w / 2, cy = h / 2, reach = Math.hypot(w, h) / 2;
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2;
    const inner = reach * (0.35 + rand() * 0.35);
    const width = 0.004 + rand() * 0.012;
    g.fillStyle = `rgba(255,255,255,${(0.25 + rand() * 0.55) * strength})`;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    g.lineTo(cx + Math.cos(a - width) * reach * 1.1, cy + Math.sin(a - width) * reach * 1.1);
    g.lineTo(cx + Math.cos(a + width) * reach * 1.1, cy + Math.sin(a + width) * reach * 1.1);
    g.fill();
  }
}

function caption(text, cls = '') {
  const el = $('cine-caption');
  el.className = cls;
  el.textContent = text;
  el.classList.toggle('on', !!text);
}

/* ---------- The fall pose ---------- */
const fallQ = new THREE.Quaternion(), fallYaw = new THREE.Quaternion(), fallTilt = new THREE.Quaternion();
const fallPivot = new THREE.Vector3(), fallTarget = new THREE.Vector3(), fallRoll = new THREE.Quaternion();
const LYING_ROLL = 1.0;
const SIDE_AXIS = new THREE.Vector3(1, 0, 0), UP_AXIS = new THREE.Vector3(0, 1, 0);

// Spread out belly-down, arms thrown up, legs kicking, turning slowly as she drops.
function poseFalling(dt, t, at, tumble) {
  player.stride = 0;
  player.runBlend = 0;
  player.aimT = 0;
  poseAvatar(dt, new THREE.Vector3(), false);
  const { root, legL, legR, armL, armR, chest, head } = avatar;
  fallYaw.setFromAxisAngle(UP_AXIS, player.bodyYaw + t * 0.6);
  fallTilt.setFromAxisAngle(SIDE_AXIS, 1.1 + Math.sin(t * 2.3) * tumble);
  fallQ.copy(fallYaw).multiply(fallTilt);
  root.quaternion.copy(fallQ);
  fallPivot.set(0, avatar.dims.hips, 0).applyQuaternion(fallQ);
  root.position.copy(at).sub(fallPivot);
  legL.thigh.rotation.x = -0.5 + Math.sin(t * 9) * 0.35;
  legR.thigh.rotation.x = -0.3 - Math.sin(t * 9) * 0.35;
  legL.shin.rotation.x = 0.9 + Math.sin(t * 7) * 0.3;
  legR.shin.rotation.x = 1.1 - Math.sin(t * 7) * 0.3;
  chest.rotation.x = -0.25;
  head.rotation.x = -0.5;
  for (const [arm, side] of [[armL, 1], [armR, -1]]) {
    const s = arm.upper.position;
    fallTarget.set(s.x + side * 0.24, s.y + 0.16 + Math.sin(t * 8 + side) * 0.07, 0.06 + Math.cos(t * 6 + side) * 0.08);
    solveArm(arm, fallTarget, side > 0 ? POLE_L : POLE_R);
    poseHand(arm, HAND_DOWN, 1);
  }
  avatar.simulate(dt);
}

// Sprawled in the snow after the landing, half on her side so her face shows.
function poseLying(dt, at) {
  poseAvatar(dt, new THREE.Vector3(), false);
  const { root } = avatar;
  fallYaw.setFromAxisAngle(UP_AXIS, player.bodyYaw);
  fallTilt.setFromAxisAngle(SIDE_AXIS, 1.45);
  fallQ.copy(fallYaw).multiply(fallTilt).multiply(fallRoll.setFromAxisAngle(UP_AXIS, LYING_ROLL));
  root.quaternion.copy(fallQ);
  fallPivot.set(0, avatar.dims.hips, 0).applyQuaternion(fallQ);
  root.position.copy(at).sub(fallPivot).add(new THREE.Vector3(0, 0.13, 0));
  avatar.legL.thigh.rotation.x = 0.1;
  avatar.legR.thigh.rotation.x = -0.15;
  avatar.legL.shin.rotation.x = 0.4;
  avatar.legR.shin.rotation.x = 0.2;
  avatar.simulate(dt);
}

/* ---------- The cutscene ---------- */
const CUT = {
  eject: 3.4, // when she's thrown out
  land: 9.4, // when she hits the snow
  slow: 0.35, // story-time speed through the ejection beat
  slowEnd: 5.0,
  black: 9.9,
  wake: 11.4,
  boom: 12.4,
  end: 15.2,
  altitude: 120,
  speed: 55,
  get landW() { return this.land - (this.slowEnd - this.eject) * (1 - this.slow); },
};

const cutscene = { active: false, t: 0, plane: null, trail: null, debris: null, dir: new THREE.Vector3(), side: new THREE.Vector3(), engine: null, wind: null, shot: '', frame: 0 };
const camTarget = new THREE.Vector3(), camAt = new THREE.Vector3(), herAt = new THREE.Vector3(), planeAt = new THREE.Vector3(), ground = new THREE.Vector3();

function landingSpot() {
  return ground.set(LANDMARKS.start.x, groundHeight(LANDMARKS.start.x, LANDMARKS.start.z), LANDMARKS.start.z);
}

function planePosition(t, out) {
  const L = landingSpot();
  const travel = (t - CUT.eject) * CUT.speed;
  // Losing height after the blast.
  const sink = t > CUT.eject ? (t - CUT.eject) ** 1.6 * 2.2 : 0;
  return out.copy(L).addScaledVector(cutscene.dir, travel).add(new THREE.Vector3(0, CUT.altitude - sink + Math.sin(t * 2.1) * 0.6, 0));
}

// Where she is at time t once thrown clear: out of the door, arcing forward, then
// dropping onto the landing spot, reaching the treetops just as the forest shot begins.
function fallPosition(t, out) {
  const L = landingSpot();
  const s = clamp((t - CUT.eject) / (CUT.landW - CUT.eject), 0, 1);
  planePosition(CUT.eject, planeAt);
  const start = planeAt.clone().addScaledVector(cutscene.side, 2.5);
  out.lerpVectors(start, L, s);
  out.y = lerp(start.y, L.y, 1 - (1 - s) ** 1.6);
  out.addScaledVector(cutscene.dir, Math.sin(s * Math.PI) * 14);
  return out;
}

function startCutscene() {
  const L = landingSpot();
  cutscene.dir.set(wreck.x - L.x, 0, wreck.z - L.z).normalize();
  cutscene.side.set(cutscene.dir.z, 0, -cutscene.dir.x);
  if (!cutscene.plane) {
    cutscene.plane = buildPlane();
    cutscene.trail = buildPuffs(160, 0x2a2828);
    cutscene.debris = buildPuffs(60, 0xff9a50);
    cutscene.dust = buildPuffs(40, 0xf2f5ff);
    scene.add(cutscene.plane, cutscene.trail.group, cutscene.debris.group, cutscene.dust.group);
  }
  cutscene.plane.visible = true;
  cutscene.plane.userData.door.visible = true;
  cutscene.trail.clear();
  cutscene.debris.clear();
  if (cutscene.dust) cutscene.dust.clear();
  cutscene.active = true;
  cutscene.t = 0;
  cutscene.w = 0;
  cutscene.shot = '';
  cutscene.emitT = 0;
  cutscene.fired = {};
  player.bodyYaw = player.yaw = Math.atan2(cutscene.dir.x, cutscene.dir.z);
  // Load the ground under the whole fall, and thin the fog for the views from the air.
  world.stream(L, Infinity, 230);
  scene.fog.density = 0.0035;
  document.body.classList.add('cinematic');
  canvas.style.filter = 'saturate(1.3) contrast(1.08)';
  cutscene.engine = Sfx.loop({ noise: 0.25, filter: 900, hum: 0.35, humFreq: 68 });
  cutscene.engine.set(0.5, 1);
  cutscene.wind = Sfx.loop({ noise: 1, filter: 1400 });
}

function finishCutscene() {
  if (!cutscene.active) return;
  cutscene.active = false;
  cutscene.plane.visible = false;
  cutscene.trail.clear();
  cutscene.debris.clear();
  if (cutscene.dust) cutscene.dust.clear();
  scene.fog.density = FOG_DENSITY;
  document.body.classList.remove('cinematic');
  canvas.style.filter = '';
  drawSpeedLines(0, 0);
  caption('');
  $('flash').className = '';
  cutscene.engine.stop();
  cutscene.wind.stop();
  setWreckBurning();
  const L = landingSpot();
  player.pos.copy(L);
  player.bodyYaw = player.yaw = Math.atan2(wreck.x - L.x, wreck.z - L.z);
  player.pitch = 0.08;
  avatar.reset();
  beginPlay();
}

// Impact frames: a white flash or an inverted frame, a few frames long.
function impact(kind, ms = 70) {
  const el = $('flash');
  el.className = kind;
  clearTimeout(impact.timer);
  impact.timer = setTimeout(() => { el.className = ''; }, ms);
}

function once(key, at, fn) {
  if (!cutscene.fired[key] && cutscene.t >= at) { cutscene.fired[key] = true; fn(); }
}

function updateCutscene(dt) {
  cutscene.t += dt;
  // Story time runs slow through the ejection beat; positions follow it, cuts follow t.
  cutscene.w += dt * (cutscene.t > CUT.eject && cutscene.t < CUT.slowEnd ? CUT.slow : 1);
  const w = cutscene.w;
  const t = cutscene.t;
  game.time += dt;
  const L = landingSpot();
  const dir = cutscene.dir, side = cutscene.side;
  const plane = cutscene.plane;

  // The plane: banking, shuddering, the near engine streaming smoke.
  planePosition(w, planeAt);
  plane.position.copy(planeAt);
  const lurch = t > 2.6 && t < 3.6 ? Math.sin((t - 2.6) * 30) * 0.06 * (3.6 - t) : 0;
  plane.rotation.set(w > CUT.eject ? 0.08 + (w - CUT.eject) * 0.03 : 0, Math.atan2(dir.x, dir.z), 0.15 + Math.sin(t * 1.3) * 0.08 + lurch, 'YXZ');
  plane.updateMatrixWorld();
  for (const prop of plane.userData.props) prop.rotation.z += dt * 40;
  cutscene.emitT -= dt;
  while (cutscene.emitT <= 0) {
    cutscene.emitT += 0.03;
    const engine = new THREE.Vector3(-4.3, 0.2, 1).applyMatrix4(plane.matrixWorld);
    cutscene.trail.emit(engine, new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), { life: 3.5, size: 2.2, grow: 4, alpha: 0.95 });
    if (Math.random() < 0.5) cutscene.debris.emit(engine, new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3), { life: 0.4, size: 0.9, grow: -0.6, alpha: 0.9 });
  }
  cutscene.trail.update(dt);
  cutscene.debris.update(dt);
  cutscene.dust.update(dt);

  // Her: aboard until the blast, then falling, then face-down in the snow.
  if (t < CUT.eject) {
    avatar.setVisible(false);
  } else if (t < CUT.land) {
    avatar.setVisible(true);
    fallPosition(w, herAt);
    player.pos.copy(herAt);
    poseFalling(dt, t, herAt, 0.4);
  } else {
    avatar.setVisible(true);
    player.pos.copy(L);
    poseLying(dt, L);
  }

  // Sound cues.
  once('blast', 2.6, () => { Sfx.boom(0.8); impact('white', 90); });
  once('door', CUT.eject, () => { plane.userData.door.visible = false; impact('invert', 80); cutscene.engine.set(0.25, 1.5); });
  once('fall', CUT.eject + 0.2, () => cutscene.wind.set(0.6, 2.5));
  once('snap1', 8.4, () => { Sfx.branchSnap(); impact('invert', 60); });
  once('snap2', 8.75, () => { Sfx.branchSnap(); impact('white', 50); });
  once('slam', CUT.land, () => { Sfx.snowSlam(); impact('white', 160); cutscene.wind.set(0, 0.2); cutscene.engine.set(0, 0.3); });
  once('ring', CUT.black, () => { Sfx.ring(); plane.visible = false; cutscene.trail.clear(); });
  once('boom', CUT.boom, () => { Sfx.boom(0.45); setWreckBurning(); });

  // Shots, cut by time.
  let speed = 0;
  camera.up.set(0, 1, 0);
  if (t < CUT.eject) {
    // A: alongside the plane in trouble, with a canted frame.
    const push = t * 1.2;
    camAt.copy(planeAt).addScaledVector(dir, 13 - push).addScaledVector(side, -15).add(new THREE.Vector3(0, -3.5, 0));
    camTarget.copy(planeAt).addScaledVector(dir, 2);
    camera.up.set(Math.sin(0.12), Math.cos(0.12), 0);
    setFov(40);
    once('cap1', 0.4, () => caption('Somewhere over the northern range', 'place'));
    once('cap1off', 2.4, () => caption(''));
    if (t > 2.6) shake(camAt, 0.5 * (3.4 - t));
  } else if (t < 5.0) {
    // B: thrown from the door, in slow, heavy beats.
    camAt.copy(herAt).addScaledVector(side, 5).addScaledVector(dir, -7).add(new THREE.Vector3(0, 0.5, 0));
    camTarget.copy(herAt).lerp(planeAt, 0.35);
    setFov(48);
    speed = 0.4;
  } else if (t < 6.6) {
    // C1: from above, looking down past her at the forest far below.
    camAt.copy(herAt).add(new THREE.Vector3(0, 5, 0)).addScaledVector(dir, -1.5);
    camTarget.copy(herAt).add(new THREE.Vector3(0, -20, 0));
    setFov(62);
    speed = 1;
  } else if (t < 8.0) {
    // C2: close on her face, from in front of her as she falls belly-down, hair streaming
    // up behind her against the sky.
    const yaw = player.bodyYaw + t * 0.6;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const headDir = forward.clone().multiplyScalar(0.89).add(new THREE.Vector3(0, 0.45, 0));
    const faceDir = forward.clone().multiplyScalar(0.45).add(new THREE.Vector3(0, -0.89, 0));
    const headAt = herAt.clone().addScaledVector(headDir, 0.42);
    camAt.copy(headAt).addScaledVector(faceDir, 1.1).addScaledVector(headDir, 0.35);
    camTarget.copy(headAt);
    camera.up.set(Math.sin(-0.2), Math.cos(-0.2), 0);
    setFov(38);
    speed = 0.9;
    once('fog', 6.6, () => { scene.fog.density = FOG_DENSITY * 0.5; });
  } else if (t < 9.2) {
    // D: from the forest floor at the clearing's edge, looking up as she comes through.
    camAt.copy(L).addScaledVector(side, -6).addScaledVector(dir, -4).add(new THREE.Vector3(0, 1.2, 0));
    camTarget.copy(herAt);
    setFov(64);
    speed = 0.6;
    once('fogD', 8.0, () => { scene.fog.density = FOG_DENSITY; });
    once('needles', 8.4, () => { for (let i = 0; i < 4; i++) burst(herAt.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), 0x2d4a2a, 18, 5); burst(herAt, 0xf2f5ff, 30, 6); });
    once('needles2', 8.75, () => { burst(herAt, 0x2d4a2a, 24, 6); burst(herAt, 0xf2f5ff, 30, 5); });
    if (t > 8.4) shake(camAt, 0.25);
  } else if (t < CUT.black) {
    // E: ground level as she hits the snow.
    camAt.copy(L).addScaledVector(side, 4.5).addScaledVector(dir, 1.5).add(new THREE.Vector3(0, 0.5, 0));
    camTarget.copy(L).add(new THREE.Vector3(0, 0.6, 0));
    setFov(50);
    once('plume', CUT.land, () => {
      for (let i = 0; i < 8; i++) burst(L.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.3, (Math.random() - 0.5) * 2)), 0xf2f5ff, 30, 7);
      // A cloud of powder that hangs in the air after the impact.
      for (let i = 0; i < 30; i++) cutscene.dust.emit(L.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.4, (Math.random() - 0.5) * 2)), new THREE.Vector3((Math.random() - 0.5) * 5, 1 + Math.random() * 3, (Math.random() - 0.5) * 5), { life: 1.8 + Math.random(), size: 0.9, grow: 2.5, alpha: 0.85 });
    });
    if (t > CUT.land) shake(camAt, 0.5);
  } else if (t < CUT.wake) {
    // Black, ringing.
    once('dark', CUT.black, () => { $('flash').className = 'black'; caption(''); });
  } else if (t < CUT.boom) {
    // F1: waking, her cheek in the snow, framed on her face.
    once('light', CUT.wake, () => { $('flash').className = ''; });
    const head = avatar.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.03, 0));
    const face = avatar.head.getWorldDirection(new THREE.Vector3());
    camAt.copy(head).addScaledVector(face, 0.75).add(new THREE.Vector3(0, 0.12, 0));
    camTarget.copy(head);
    setFov(42);
  } else {
    // F2: a far-off boom, and smoke rising where the plane came down.
    camAt.copy(L).addScaledVector(dir, -3.2).add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(side, -0.8);
    camTarget.set(wreck.x, groundHeight(wreck.x, wreck.z) + 150, wreck.z);
    setFov(46);
    once('cap2', CUT.boom + 0.6, () => caption('The plane… it came down out there.', 'line'));
    if (t > CUT.boom + 0.3 && t < CUT.boom + 1) shake(camAt, 0.08);
  }
  camera.position.copy(camAt);
  camera.position.y = Math.max(camera.position.y, groundHeight(camAt.x, camAt.z) + 0.25);
  camera.lookAt(camTarget);
  drawSpeedLines(speed, t);

  world.stream(t < CUT.land ? herAt : L, 2, 230);
  updateWreck(dt);
  if (t >= CUT.end) finishCutscene();
}

function setFov(fov) {
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

function shake(at, amount) {
  at.x += (Math.random() - 0.5) * amount;
  at.y += (Math.random() - 0.5) * amount;
  at.z += (Math.random() - 0.5) * amount;
}
