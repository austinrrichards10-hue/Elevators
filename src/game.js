// Game loop, player, weapons, enemies, objectives and HUD.
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (t) => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); };
const span = (t, a, b) => smooth((t - a) / (b - a));

const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1100);
const world = buildWorld(renderer, scene);
const pipeline = createPipeline(renderer, scene, camera);
addEventListener('resize', pipeline.resize);
pipeline.resize();

const muzzleLight = new THREE.PointLight(0xffc48a, 0, 14, 1.8);
scene.add(muzzleLight);
const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(5, 3, 1.6), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
muzzleFlash.scale.setScalar(0.34);
muzzleFlash.visible = false;
scene.add(muzzleFlash);

// Footprints left in the snow.
const FOOTPRINTS = 220;
const footprints = new THREE.InstancedMesh(
  new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x5f6c8e, transparent: true, opacity: 0.42, depthWrite: false }),
  FOOTPRINTS,
);
footprints.frustumCulled = false;
footprints.count = 0;
scene.add(footprints);
let footprintNext = 0;
let footSide = 1;
const footprintDummy = new THREE.Object3D();

function leaveFootprint() {
  footSide = -footSide;
  const s = Math.sin(player.bodyYaw), c = Math.cos(player.bodyYaw);
  const x = player.pos.x - c * footSide * 0.085, z = player.pos.z + s * footSide * 0.085;
  footprintDummy.position.set(x, groundHeight(x, z) + 0.035, z);
  footprintDummy.rotation.set(0, player.bodyYaw, 0);
  footprintDummy.scale.set(0.16, 1, 0.32);
  footprintDummy.updateMatrix();
  footprints.setMatrixAt(footprintNext, footprintDummy.matrix);
  footprints.instanceMatrix.needsUpdate = true;
  footprintNext = (footprintNext + 1) % FOOTPRINTS;
  footprints.count = Math.min(FOOTPRINTS, footprints.count + 1);
  burst(new THREE.Vector3(x, footprintDummy.position.y + 0.05, z), 0xf2f5ff, 3, 0.9);
}

const game = {
  state: 'title',
  stage: 0, // 0-2 wards lit, 3 go to altar, 4 boss fight, 5 claim blade
  enemies: [],
  shards: [],
  boss: null,
  spawnTimer: 4,
  time: 0,
};

const player = {
  pos: new THREE.Vector3(LANDMARKS.start.x, 0, LANDMARKS.start.z),
  yaw: Math.PI,
  pitch: 0.02,
  bodyYaw: Math.PI,
  hp: 100,
  stamina: 100,
  ammo: {},
  fireCd: 0,
  aimT: 0,
  aimBlend: 0,
  sinceHurt: 99,
  walkPhase: 0,
  stride: 0,
  sprinting: false,
  runBlend: 0,
  gaitDir: 1,
  strafeLean: 0,
  stepDist: 0,
  recoil: 0,
  kick: 0,
  bloom: 0,
  shake: 0,
  reload: null,
  cycle: null,
  dodge: null,
  tuck: 0,
  equip: 0,
};
for (const id of GUN_ORDER) player.ammo[id] = GUNS[id].mag;

/* ---------- Loadout ---------- */
function loadSaved() {
  try { return JSON.parse(localStorage.getItem('hollowSnowLoadout')) || {}; } catch { return {}; }
}
const saved = loadSaved();
let skinId = SKINS[saved.skin] ? saved.skin : 'teal';
let gunId = GUNS[saved.gun] ? saved.gun : 'pistol';
let avatar = null;
let gunModel = null;

function saveLoadout() {
  try { localStorage.setItem('hollowSnowLoadout', JSON.stringify({ skin: skinId, gun: gunId, muted: Sfx.muted })); } catch { /* storage is optional */ }
}

function renderMute() {
  document.querySelectorAll('.mute-toggle').forEach((button) => {
    button.textContent = Sfx.muted ? 'Sound: Off' : 'Sound: On';
    button.setAttribute('aria-pressed', Sfx.muted);
  });
}

function toggleMute() {
  Sfx.toggleMute();
  saveLoadout();
  renderMute();
}
Sfx.muted = !!saved.muted;
renderMute();

function equipGun(id) {
  gunId = id;
  player.reload = null;
  player.cycle = null;
  player.equip = 1;
  player.fireCd = Math.max(player.fireCd, 0.25);
  avatar.holder.clear();
  gunModel = buildGunModel(id);
  avatar.holder.add(gunModel.group);
  saveLoadout();
  renderLoadout();
}

function setSkin(id) {
  skinId = id;
  if (avatar) avatar.dispose();
  avatar = createAvatar(scene, id);
  equipGun(gunId);
  poseAvatar(1 / 60, new THREE.Vector3(), false);
  avatar.reset();
}

function renderLoadout() {
  const option = (kind, id, entry, selected) => `<button class="option" data-${kind}="${id}" aria-pressed="${selected}">${entry.name}<span>${entry.note}</span></button>`;
  const html = `<div><h3>Skin</h3>${SKIN_ORDER.map((id) => option('skin', id, SKINS[id], id === skinId)).join('')}</div>`
    + `<div><h3>Weapon</h3>${GUN_ORDER.map((id) => option('gun', id, GUNS[id], id === gunId)).join('')}</div>`;
  document.querySelectorAll('.loadout').forEach((el) => { el.innerHTML = html; });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.mute-toggle')) { toggleMute(); return; }
  const button = e.target.closest('.option');
  if (!button) return;
  if (button.dataset.skin && button.dataset.skin !== skinId) { setSkin(button.dataset.skin); saveLoadout(); renderLoadout(); }
  if (button.dataset.gun && button.dataset.gun !== gunId) { equipGun(button.dataset.gun); Sfx.swap(); poseAvatar(1 / 60, new THREE.Vector3(), false); }
});

/* ---------- Input ---------- */
const keys = {};
let firing = false;
let triggerBuffered = false;
let aiming = false;
let pointerWasLocked = false;

addEventListener('keydown', (e) => {
  if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyM') toggleMute();
  if (game.state !== 'playing') return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Space') startDodge();
  if (e.code === 'KeyP') setPaused(true);
  const slot = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
  if (slot >= 0 && GUN_ORDER[slot] !== gunId) { equipGun(GUN_ORDER[slot]); Sfx.swap(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; firing = false; aiming = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing') return;
  if (document.pointerLockElement !== canvas) lockPointer();
  if (e.button === 0) { firing = true; triggerBuffered = true; tryFire(); }
  if (e.button === 2) aiming = true;
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) firing = false;
  if (e.button === 2) aiming = false;
});
addEventListener('mousemove', (e) => {
  if (game.state !== 'playing') return;
  const sensitivity = 0.0023 * (camera.fov / 58);
  player.yaw -= e.movementX * sensitivity;
  player.pitch = clamp(player.pitch - e.movementY * sensitivity, -0.85, 0.95);
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) pointerWasLocked = true;
  else if (pointerWasLocked && game.state === 'playing') setPaused(true);
});

function lockPointer() {
  const request = canvas.requestPointerLock();
  if (request && request.catch) request.catch(() => {});
}

function setPaused(paused) {
  game.state = paused ? 'paused' : 'playing';
  $('pause').classList.toggle('hidden', !paused);
  firing = false;
  aiming = false;
  if (paused) { pointerWasLocked = false; document.exitPointerLock(); } else lockPointer();
}

$('start').addEventListener('click', () => {
  Sfx.init();
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  game.state = 'playing';
  player.yaw = player.bodyYaw = Math.PI;
  lockPointer();
  say('No birds. No wind in the branches. Only the snow.', 3.6);
  say('Three wardfires still stand. Light them, and the seal will break.', 4.2);
});
$('resume').addEventListener('click', () => setPaused(false));
$('restart').addEventListener('click', () => location.reload());

/* ---------- Subtitles ---------- */
const subtitles = [];
let subtitleT = 0;

function say(text, duration = 3.4) { subtitles.push({ text, duration }); }

function updateSubtitles(dt) {
  subtitleT -= dt;
  if (subtitleT > 0) return;
  const next = subtitles.shift();
  const el = $('subtitle');
  if (next) {
    el.textContent = next.text;
    el.classList.add('on');
    subtitleT = next.duration;
  } else {
    el.classList.remove('on');
  }
}

/* ---------- Effects ---------- */
const SPARK_COUNT = 320;
const sparks = {
  pos: new Float32Array(SPARK_COUNT * 3).fill(-999),
  col: new Float32Array(SPARK_COUNT * 3),
  vel: new Float32Array(SPARK_COUNT * 3),
  life: new Float32Array(SPARK_COUNT),
  next: 0,
};
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparks.pos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparks.col, 3));
const sparkPoints = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.06, map: TEX.softDot, transparent: true, depthWrite: false, vertexColors: true }));
sparkPoints.frustumCulled = false;
scene.add(sparkPoints);

function burst(at, color, count, power) {
  const c = new THREE.Color(color);
  for (let n = 0; n < count; n++) {
    const i = sparks.next = (sparks.next + 1) % SPARK_COUNT;
    sparks.pos.set([at.x, at.y, at.z], i * 3);
    sparks.col.set([c.r, c.g, c.b], i * 3);
    sparks.vel.set([(Math.random() - 0.5) * power, Math.random() * power, (Math.random() - 0.5) * power], i * 3);
    sparks.life[i] = 0.3 + Math.random() * 0.4;
  }
}

function updateSparks(dt) {
  for (let i = 0; i < SPARK_COUNT; i++) {
    if (sparks.life[i] <= 0) continue;
    sparks.life[i] -= dt;
    if (sparks.life[i] <= 0) { sparks.pos[i * 3 + 1] = -999; continue; }
    sparks.vel[i * 3 + 1] -= 9 * dt;
    for (let k = 0; k < 3; k++) sparks.pos[i * 3 + k] += sparks.vel[i * 3 + k] * dt;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
}

const TRACERS = 12;
const tracerGeo = new THREE.BufferGeometry();
tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRACERS * 6), 3));
const tracer = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe2b0, fog: false }));
tracer.frustumCulled = false;
tracer.visible = false;
scene.add(tracer);
let tracerT = 0;
let tracerCount = 0;

function addTracer(from, to) {
  if (tracerT <= 0) tracerCount = 0;
  if (tracerCount >= TRACERS) return;
  tracerGeo.attributes.position.setXYZ(tracerCount * 2, from.x, from.y, from.z);
  tracerGeo.attributes.position.setXYZ(tracerCount * 2 + 1, to.x, to.y, to.z);
  tracerGeo.attributes.position.needsUpdate = true;
  tracerCount++;
  tracerGeo.setDrawRange(0, tracerCount * 2);
  tracer.visible = true;
  tracerT = 0.045;
}

const slamRing = new THREE.Mesh(
  new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xff3355, fog: false, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
);
slamRing.visible = false;
scene.add(slamRing);

// Spent magazines that fall away during a reload.
const droppedMags = [];
function dropMag(mesh) {
  const copy = mesh.clone();
  mesh.getWorldPosition(copy.position);
  mesh.getWorldQuaternion(copy.quaternion);
  scene.add(copy);
  droppedMags.push({ mesh: copy, vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4), life: 5 });
}

function updateDroppedMags(dt) {
  for (const mag of [...droppedMags]) {
    mag.life -= dt;
    mag.vel.y -= 9 * dt;
    mag.mesh.position.addScaledVector(mag.vel, dt);
    const ground = (game.state === 'room' ? ROOM_Y : groundHeight(mag.mesh.position.x, mag.mesh.position.z)) + 0.02;
    if (mag.mesh.position.y < ground) {
      mag.mesh.position.y = ground;
      if (mag.vel.y < -1) burst(mag.mesh.position, 0xf2f5ff, 2, 0.6);
      mag.vel.set(0, 0, 0);
    } else {
      mag.mesh.rotation.x += dt * 3;
    }
    if (mag.life <= 0) {
      scene.remove(mag.mesh);
      droppedMags.splice(droppedMags.indexOf(mag), 1);
    }
  }
}

/* ---------- Combat ---------- */
// How far out of the sprint carry the gun must be before it can fire.
const GUN_READY_BLEND = 0.3;
const muzzlePos = new THREE.Vector3();
const aimDir = new THREE.Vector3();
const shotDir = new THREE.Vector3();
const shotCenter = new THREE.Vector3();

function startReload() {
  const def = GUNS[gunId];
  if (player.reload || player.dodge || player.ammo[gunId] >= def.mag) return;
  player.cycle = null;
  player.reload = { t: 0, dur: def.reload, style: def.style, fired: {}, stop: false };
  if (def.style === 'shell') player.reload.t = -0.3;
}

function moveInput() {
  const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  return new THREE.Vector3(s * forward - c * strafe, 0, c * forward + s * strafe);
}

// The roll axis follows the direction of travel, so forward, backward, sideways and
// diagonal dodges each tumble their own way.
function startDodge() {
  if (player.dodge || player.stamina < 25) return;
  player.stamina -= 25;
  const dir = moveInput();
  if (dir.lengthSq() === 0) dir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  dir.normalize();
  player.dodge = { t: 0, dur: 0.62, dir, axis: new THREE.Vector3(dir.z, 0, -dir.x), landed: false };
  burst(new THREE.Vector3(player.pos.x, player.pos.y + 0.05, player.pos.z), 0xf2f5ff, 10, 2);
  Sfx.step();
}

function raySphere(origin, dir, center, radius) {
  const ox = origin.x - center.x, oy = origin.y - center.y, oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : Infinity;
}

function hitSpheres(enemy) {
  if (enemy.isBoss) return [{ y: 3.25, r: 0.55, head: true }, { y: 2.3, r: 0.95 }, { y: 1, r: 0.8 }];
  return [{ y: 1.62, r: 0.26, head: true }, { y: 1.05, r: 0.42 }, { y: 0.45, r: 0.34 }];
}

// Traces one bullet or pellet. Returns whether it hit an enemy.
function traceShot(def, dir) {
  const origin = camera.position;
  const minT = origin.distanceTo(player.pos) * 0.6;
  const hits = [];
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    let best = Infinity, head = false;
    for (const s of hitSpheres(enemy)) {
      shotCenter.set(enemy.pos.x, enemy.pos.y + s.y, enemy.pos.z);
      const t = raySphere(origin, dir, shotCenter, s.r);
      if (t > minT && t < best) { best = t; head = !!s.head; }
    }
    if (best < def.range) hits.push({ enemy, t: best, head });
  }
  hits.sort((a, b) => a.t - b.t);

  // Trunks and terrain stop bullets too.
  const limit = def.pierce || !hits.length ? def.range : hits[0].t;
  let blockT = Infinity;
  for (let t = minT; t < limit; t += 0.5) {
    const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
    const g = groundHeight(x, z);
    if (y < g || (y < g + 3 && nearbyColliders(x, z).some((c) => Math.hypot(x - c.x, z - c.z) < c.r))) { blockT = t; break; }
  }

  const landed = hits.filter((h) => h.t < blockT);
  const struck = def.pierce ? landed : landed.slice(0, 1);
  for (const h of struck) {
    let damage = h.head ? def.head : def.damage;
    if (h.enemy.isBoss) damage = def.damage * (h.head ? 2 : 1);
    if (def.falloff) damage *= clamp(1 - (h.t - 7) / 26, 0.25, 1);
    damageEnemy(h.enemy, damage);
    burst(origin.clone().addScaledVector(dir, h.t), 0x8fe8ff, 6, 3.2);
  }
  const endT = struck.length && !def.pierce ? struck[0].t : Math.min(blockT, def.range);
  const end = origin.clone().addScaledVector(dir, endT);
  if (blockT < Infinity && !(struck.length && !def.pierce)) burst(end, 0xe8eeff, 5, 2.2);
  addTracer(muzzlePos, end);
  return struck.length > 0;
}

function tryFire() {
  const def = GUNS[gunId];
  if (player.sprinting || player.runBlend > GUN_READY_BLEND) return;
  if (player.dodge || player.fireCd > 0 || (player.cycle && player.cycle.blocking)) return;
  if (player.reload) {
    // Shells can be interrupted to fire what's already loaded.
    if (player.reload.style === 'shell' && player.ammo[gunId] > 0) player.reload.stop = true;
    return;
  }
  if (player.ammo[gunId] <= 0) { Sfx.click(); triggerBuffered = false; startReload(); return; }
  triggerBuffered = false;
  player.ammo[gunId]--;
  player.fireCd = def.rate;
  player.aimT = 1.4;
  player.recoil = Math.min(player.recoil + def.kick * 0.7, 0.16);
  player.kick = Math.min(player.kick + def.kick, 0.2);
  player.bloom = Math.min(player.bloom + def.spread * 0.6, def.spread * 2.2);
  Sfx.gunshot(def.sound);
  muzzleLight.intensity = 6;

  camera.updateMatrixWorld();
  camera.getWorldDirection(aimDir);
  gunModel.muzzle.getWorldPosition(muzzlePos);
  muzzleLight.position.copy(muzzlePos);
  muzzleFlash.position.copy(muzzlePos);
  muzzleFlash.scale.setScalar(def.pellets > 1 || def.scoped ? 0.55 : 0.34);
  muzzleFlash.visible = true;
  burst(muzzlePos, 0xffd9a0, 3, 1.6);

  const base = aiming ? def.spread * 0.4 : (def.hipSpread || def.spread);
  const moving = moveInput().lengthSq() > 0 ? 1.5 : 1;
  const cone = (base + player.bloom) * moving;
  let anyHit = false;
  for (let i = 0; i < def.pellets; i++) {
    shotDir.set(aimDir.x + (Math.random() - 0.5) * cone * 2, aimDir.y + (Math.random() - 0.5) * cone * 2, aimDir.z + (Math.random() - 0.5) * cone * 2).normalize();
    if (traceShot(def, shotDir)) anyHit = true;
  }
  if (anyHit) {
    Sfx.hit();
    $('crosshair').classList.add('hit');
    setTimeout(() => $('crosshair').classList.remove('hit'), 90);
  }

  // Slide, pump or bolt cycles after each shot.
  if (def.style === 'shell') { player.cycle = { t: -0.1, dur: 0.46, kind: 'pump' }; Sfx.pump(); }
  else if (def.scoped) { player.cycle = { t: -0.22, dur: 0.72, kind: 'bolt' }; setTimeout(() => Sfx.bolt(), 220); }
  else player.cycle = { t: 0, dur: 0.075, kind: 'slide' };
  gunModel.group.localToWorld(shotCenter.copy(gunModel.port));
  burst(shotCenter, def.style === 'shell' ? 0xc0303a : 0xc6a25c, 2, 1.8);
  if (player.ammo[gunId] <= 0 && !def.auto) triggerBuffered = false;
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.08;
  if (enemy.hp > 0) return;
  if (enemy.isBoss) { if (!enemy.dead) killBoss(enemy); } else if (!enemy.dead) { enemy.dead = true; enemy.deadT = 0; Sfx.groan(); }
}

function hurtPlayer(amount) {
  if ((player.dodge && player.dodge.t < 0.44) || game.state !== 'playing') return;
  player.hp -= amount;
  player.sinceHurt = 0;
  player.shake = 0.25;
  Sfx.hurt();
  $('hurt').style.opacity = 1;
  if (player.hp <= 0) {
    player.hp = 0;
    endGame('The snow keeps you', 'Your name joins the others beneath the pines.');
  }
}

function endGame(title, text) {
  game.state = 'ended';
  document.exitPointerLock();
  subtitles.length = 0;
  $('subtitle').classList.remove('on');
  $('scope').classList.add('hidden');
  avatar.setVisible(true);
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  $('end').classList.remove('hidden');
  $('hud').classList.add('hidden');
}

/* ---------- Player ---------- */
function angleLerp(from, to, amount) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * amount;
}

function updatePlayer(dt) {
  const def = GUNS[gunId];
  player.fireCd -= dt;
  player.aimT -= dt;
  player.sinceHurt += dt;
  player.equip = Math.max(0, player.equip - dt * 4);
  player.recoil = Math.max(0, player.recoil - dt * 0.5);
  player.kick = Math.max(0, player.kick - dt * (0.45 + player.kick * 5));
  player.bloom = Math.max(0, player.bloom - dt * def.spread * 3);
  player.shake = Math.max(0, player.shake - dt);

  if (player.reload) updateReload(dt);
  if (player.cycle) {
    player.cycle.t += dt;
    if (player.cycle.t >= player.cycle.dur) player.cycle = null;
  }
  if ((firing && def.auto) || triggerBuffered) tryFire();

  const move = moveInput();
  const moving = move.lengthSq() > 0;
  const ads = aiming && !player.reload && !player.dodge;
  const sprinting = (keys.ShiftLeft || keys.ShiftRight) && moving && player.stamina > 1 && !player.reload && !ads && !player.dodge;
  player.sprinting = sprinting;
  // Sprinting lowers the gun; it has to come back up before she can fire again.
  if (sprinting) { player.aimT = 0; triggerBuffered = false; }
  player.runBlend += ((sprinting ? 1 : 0) - player.runBlend) * (1 - Math.exp(-(sprinting ? 7 : 10) * dt));
  $('crosshair').classList.toggle('lowered', player.runBlend > GUN_READY_BLEND);
  player.stamina = clamp(player.stamina + (sprinting ? -24 : 16) * dt, 0, 100);
  if (player.sinceHurt > 6) player.hp = Math.min(100, player.hp + 3 * dt);

  let step = 0;
  if (player.dodge) {
    const d = player.dodge;
    d.t += dt;
    const u = clamp(d.t / d.dur, 0, 1);
    // Bursts away, then eases into the landing.
    const speed = lerp(13.5, 2.2, smooth(u));
    player.pos.addScaledVector(d.dir, speed * dt);
    step = speed * dt * 0.4;
    if (!d.landed && u > 0.72) {
      d.landed = true;
      burst(new THREE.Vector3(player.pos.x, player.pos.y + 0.05, player.pos.z), 0xf2f5ff, 8, 1.6);
      Sfx.thud();
    }
    if (u >= 1) player.dodge = null;
  } else if (moving) {
    const speed = ads ? 2.6 : sprinting ? 6.9 : 4.3;
    move.normalize();
    player.pos.addScaledVector(move, speed * dt);
    step = speed * dt;
  }
  pushOutOfColliders(player.pos, 0.34);

  const r = Math.hypot(player.pos.x, player.pos.z);
  if (r > WORLD_RADIUS) {
    player.pos.x *= WORLD_RADIUS / r;
    player.pos.z *= WORLD_RADIUS / r;
  }
  player.pos.y = groundHeight(player.pos.x, player.pos.z);

  if (!player.dodge) {
    player.stepDist += step;
    if (player.stepDist > 1.1) { player.stepDist = 0; Sfx.step(); leaveFootprint(); }
  }
  if (moving || player.aimT > 0 || aiming) player.bodyYaw = angleLerp(player.bodyYaw, player.yaw, 1 - Math.exp(-12 * dt));

  // Blend between standing and walking so the gait eases in and out.
  const stride = moving && !player.dodge ? (sprinting ? 1 : ads ? 0.42 : 0.68) : 0;
  player.stride += (stride - player.stride) * (1 - Math.exp(-9 * dt));
  player.walkPhase += step * (sprinting ? 1.95 : 2.55) * player.gaitDir;
  poseAvatar(dt, move, moving);
  avatar.simulate(dt);
}

const qYaw = new THREE.Quaternion(), qRoll = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
const pivotOffset = new THREE.Vector3();

function poseAvatar(dt, move, moving) {
  const { root, hips, chest, head, legL, legR } = avatar;
  const ease = (rate) => 1 - Math.exp(-rate * dt);
  const amount = player.stride;
  const ph = player.walkPhase;
  const breathe = Math.sin(game.time * 1.5);

  // Which way the legs move relative to the body.
  const s = Math.sin(player.bodyYaw), c = Math.cos(player.bodyYaw);
  const localForward = moving ? (move.x * s + move.z * c) / (move.length() || 1) : 1;
  const localSide = moving ? (move.x * c - move.z * s) / (move.length() || 1) : 0;
  player.gaitDir = localForward < -0.2 ? -1 : 1;
  player.strafeLean += (-localSide * amount * 0.16 - player.strafeLean) * ease(8);

  // Dodge tumble.
  let tuck = 0;
  qYaw.setFromAxisAngle(UP, player.bodyYaw);
  const run = player.runBlend;
  const walk = Math.max(0, amount - run);
  root.position.copy(player.pos);
  // Walking dips as the legs spread; running rises into the airborne part of each stride.
  const stepWave = Math.abs(Math.sin(ph));
  root.position.y += -stepWave * 0.012 * walk + (stepWave - 0.4) * 0.03 * run;
  if (player.dodge) {
    const d = player.dodge;
    const u = clamp(d.t / d.dur, 0, 1);
    tuck = span(u, 0, 0.18) * (1 - span(u, 0.72, 1));
    const spin = Math.PI * 2 * smooth(clamp((u - 0.03) / 0.82, 0, 1));
    qRoll.setFromAxisAngle(d.axis, spin);
    root.quaternion.copy(qRoll).multiply(qYaw);
    // Turn around the hips, which drop towards the snow as she curls into a ball.
    const hipRest = avatar.dims.hips;
    const hipHeight = lerp(hipRest, 0.5, tuck);
    pivotOffset.set(0, hipRest, 0).applyQuaternion(qRoll);
    root.position.x -= pivotOffset.x;
    root.position.y += hipHeight - pivotOffset.y;
    root.position.z -= pivotOffset.z;
  } else {
    root.quaternion.copy(qYaw);
  }
  player.tuck = tuck;

  // The body sinks and tips into a run, and the pelvis turns with the leading leg.
  hips.position.y = avatar.dims.hips - 0.012 * walk - 0.045 * run;
  hips.rotation.x = 0.12 * run;
  // Almost no side-to-side roll: that rocking is what reads as a waddle.
  hips.rotation.z = player.strafeLean - Math.cos(ph) * (0.004 * walk + 0.006 * run);
  hips.rotation.y = Math.sin(ph) * (0.035 * walk + 0.07 * run);

  // Each thigh reaches forward further than it trails, and the knee folds through the
  // backswing, carrying the foot high in a run, before straightening to land.
  const gaitScale = 1 - Math.abs(localSide) * 0.35;
  const gait = (leg, phase, splay) => {
    const swing = Math.sin(phase);
    const fold = Math.max(0, Math.cos(phase + 0.35));
    const walkThigh = (swing * -0.5 - 0.06) * walk;
    const walkKnee = (0.1 + fold * fold * 0.85) * walk;
    const runThigh = (swing * -0.62 - 0.26) * run;
    const runKnee = (0.3 + fold * fold * 1.6) * run;
    leg.thigh.rotation.x = lerp((walkThigh + runThigh) * gaitScale, -1.9, tuck);
    leg.shin.rotation.x = lerp(walkKnee + runKnee + 0.03, 2.2, tuck);
    // Standing, the legs rest slightly apart; in motion the feet track under the body.
    leg.thigh.rotation.z = splay * (0.03 * (1 - amount) - 0.012 * walk - 0.035 * run + Math.abs(localSide) * amount * 0.1);
  };
  gait(legL, ph, 1);
  gait(legR, ph + Math.PI, -1);

  // Shoulders counter the hips, and the head stays level with the run's forward lean.
  chest.rotation.x = lerp(0.05 * walk + 0.2 * run + breathe * 0.008 - player.pitch * 0.1 * (1 - run), 0.72, tuck);
  chest.rotation.y = lerp(Math.sin(ph) * (-0.06 * walk - 0.11 * run) - player.aimBlend * 0.14, 0, tuck);
  chest.rotation.z = -player.strafeLean * 0.6;
  chest.position.y = avatar.dims.chest + breathe * 0.002;
  head.rotation.x = lerp(-player.pitch * 0.5 * (1 - run) - 0.04 * walk - 0.3 * run, 0.45, tuck);
  head.rotation.y = -chest.rotation.y - hips.rotation.y;

  poseGun(dt, ease);
}

/* ---------- Gun handling ---------- */
function updateReload(dt) {
  const r = player.reload;
  const def = GUNS[gunId];
  r.t += dt;
  const once = (key, at, fn) => { if (!r.fired[key] && r.t / r.dur >= at) { r.fired[key] = true; fn(); } };

  if (r.style === 'shell') {
    once(`in${r.count || 0}`, 0.62, () => {
      player.ammo[gunId]++;
      Sfx.shell();
    });
    if (r.t >= r.dur) {
      r.count = (r.count || 0) + 1;
      if (player.ammo[gunId] >= def.mag || r.stop || firingWantsShot()) {
        player.reload = null;
        player.cycle = { t: -0.05, dur: 0.46, kind: 'pump', blocking: true };
        Sfx.pump();
        player.fireCd = Math.max(player.fireCd, 0.35);
      } else {
        r.t = 0;
      }
    }
    return;
  }

  const m = gunModel;
  once('out', 0.2, () => Sfx.magOut());
  once('drop', 0.3, () => { if (m.mag) { dropMag(m.mag); m.mag.visible = false; } });
  once('in', 0.68, () => Sfx.magIn());
  once('rack', 0.78, () => Sfx.rack());
  if (r.t >= r.dur) {
    player.ammo[gunId] = def.mag;
    if (m.mag) { m.mag.visible = true; m.mag.position.copy(m.magRest); }
    player.reload = null;
  }
}

function firingWantsShot() { return triggerBuffered && player.ammo[gunId] > 0; }

const POUCH = new THREE.Vector3(0.14, -0.1, 0.08);
const holderPos = new THREE.Vector3();
const holderEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const holderQuat = new THREE.Quaternion();
const holderScale = new THREE.Vector3(1, 1, 1);
const holderInverse = new THREE.Matrix4();
const leftTarget = new THREE.Vector3(), rightTarget = new THREE.Vector3(), pumpTarget = new THREE.Vector3();
// Elbows point down, back and a little outward, so the arms clear the body.
const POLE_R = new THREE.Vector3(-0.42, -0.78, -0.42), POLE_L = new THREE.Vector3(0.42, -0.78, -0.42);
// How each hand sits on a gun, in the gun's coordinates (+Z forward, +Y up). Hands rest with
// fingers along -Y. The right hand reaches forward around the grip, its palm against the
// side; the left cups under the gun with its fingers wrapping across.
const RIGHT_GRIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const LEFT_GRIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
const RIGHT_WRIST = new THREE.Vector3(-0.024, -0.012, -0.072);
const LEFT_WRIST = new THREE.Vector3(0.06, -0.026, -0.01);
const handOffset = new THREE.Vector3(), handGoal = new THREE.Quaternion();

function keyedPath(t, keys, out) {
  if (t <= keys[0][0]) return out.copy(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return out.lerpVectors(keys[i - 1][1], keys[i][1], span(t, keys[i - 1][0], keys[i][0]));
  }
  return out.copy(keys[keys.length - 1][1]);
}

function poseGun(dt, ease) {
  const m = gunModel, def = GUNS[gunId];
  const { holder, chest, armL, armR } = avatar;
  const wantAim = (player.aimT > 0 || aiming) && !player.reload && !player.dodge;
  player.aimBlend += ((wantAim ? 1 : 0) - player.aimBlend) * ease(14);
  const blend = player.aimBlend;
  const tuck = player.tuck;

  holderPos.lerpVectors(m.readyPos, m.aimPos, blend);
  let rx = lerp(m.readyRx, -player.pitch - chest.rotation.x, blend);
  let ry = -chest.rotation.y * blend;
  let rz = lerp(m.readyRz, 0, blend);
  holderPos.z -= player.kick * 0.55;
  holderPos.y += player.kick * 0.14;
  rx -= player.kick * 1.5;
  holderPos.y += Math.sin(player.walkPhase * 2) * 0.008 * player.stride;

  // Sprint carry: the gun bounces with each step and sways against the shoulders.
  const run = player.runBlend;
  if (run > 0.001) {
    holderPos.lerp(m.runPos, run);
    const beat = player.walkPhase;
    holderPos.y += Math.sin(beat * 2) * 0.007 * run;
    holderPos.x += Math.sin(beat) * 0.004 * run;
    if (m.runOneHand) holderPos.z += Math.sin(beat) * 0.05 * run;
    rx = lerp(rx, m.runRx + Math.sin(beat * 2) * 0.025, run);
    ry = lerp(ry, m.runRy - chest.rotation.y * 0.6, run);
    rz = lerp(rz, m.runRz + Math.sin(beat) * 0.03, run);
  }

  // Raises into place after a swap.
  rx += player.equip * 0.9;
  holderPos.y -= player.equip * 0.12;

  const r = player.reload;
  const u = r ? clamp(r.t / r.dur, 0, 1) : 0;
  if (r) {
    const w = r.style === 'shell' ? 1 : span(u, 0, 0.1) * (1 - span(u, 0.9, 1));
    holderPos.lerp(m.reloadPos, w);
    rx = lerp(rx, r.style === 'shell' ? -0.42 : -0.5, w);
    rz = lerp(rz, r.style === 'shell' ? 0.65 : 0.5, w);
    ry = lerp(ry, 0.25, w);
  }
  if (tuck > 0) {
    holderPos.lerp(new THREE.Vector3(-0.02, 0.06, 0.15), tuck);
    rx = lerp(rx, 0.75, tuck);
    rz = lerp(rz, 0.9, tuck);
  }
  // Gun poses are authored relative to shoulder height.
  holderPos.y += avatar.dims.shoulderY - 0.215;
  holderEuler.set(rx, ry, rz);
  holderQuat.setFromEuler(holderEuler);
  holder.matrix.compose(holderPos, holderQuat, holderScale);
  holderInverse.copy(holder.matrix).invert();
  const toChest = (v) => v.clone().applyMatrix4(holder.matrix);

  // Moving parts: slide, pump or bolt.
  let travel = 0;
  const cycle = player.cycle;
  let rightOnBolt = 0;
  if (cycle && cycle.t >= 0) {
    const f = clamp(cycle.t / cycle.dur, 0, 1);
    travel = Math.sin(f * Math.PI);
    if (cycle.kind === 'bolt') rightOnBolt = span(f, 0, 0.18) * (1 - span(f, 0.82, 1));
  }
  if (r && r.style === 'mag') travel = Math.max(travel, span(u, 0.76, 0.81) * (1 - span(u, 0.83, 0.87)));
  m.moving.position.z = -m.travel * travel;

  // Hands.
  const grip = toChest(new THREE.Vector3(0, -0.02, 0));
  rightTarget.copy(grip);
  if (rightOnBolt > 0) rightTarget.lerp(toChest(m.grab.clone().add(m.moving.position)), rightOnBolt);

  const fore = m.leftGrip.clone();
  if (def.style === 'shell') fore.z += m.moving.position.z;
  const foreChest = toChest(fore);

  if (r && r.style === 'mag') {
    const bottom = toChest(m.magBottom);
    const below = toChest(m.magBottom.clone().add(new THREE.Vector3(0, -0.13, 0)));
    const grab = toChest(m.grab);
    keyedPath(u, [
      [0.06, foreChest], [0.16, bottom], [0.2, bottom], [0.3, below], [0.47, POUCH],
      [0.6, below], [0.68, bottom], [0.72, bottom], [0.77, grab], [0.82, toChest(m.grab.clone().add(new THREE.Vector3(0, 0, -m.travel)))],
      [0.86, grab], [0.97, foreChest],
    ], leftTarget);
    // The magazine follows the left hand on its way out and on its way in.
    if (m.mag) {
      if (u > 0.2 && u < 0.3) {
        m.mag.position.copy(m.magRest).add(new THREE.Vector3(0, -0.13 * span(u, 0.2, 0.3), 0));
      } else if (u >= 0.42 && u < 0.68) {
        m.mag.visible = true;
        m.mag.position.copy(leftTarget).applyMatrix4(holderInverse);
        m.mag.position.y += m.magLength * 0.9;
      } else if (u >= 0.68) {
        m.mag.position.copy(m.magRest);
      }
    }
  } else if (r && r.style === 'shell') {
    const port = toChest(m.loadPoint);
    keyedPath(u, [[0.02, foreChest], [0.22, POUCH], [0.5, port], [0.66, port], [0.98, foreChest]], leftTarget);
    if (m.shell) {
      m.shell.visible = u > 0.2 && u < 0.62;
      m.shell.position.copy(leftTarget).applyMatrix4(holderInverse);
    }
  } else {
    leftTarget.copy(foreChest);
    if (m.shell) m.shell.visible = false;
  }
  if (tuck > 0) leftTarget.lerp(foreChest, tuck);
  // With a one-handed carry, the free arm pumps opposite the gun.
  if (m.runOneHand && run > 0.001 && !r) {
    const pump = -Math.sin(player.walkPhase);
    leftTarget.lerp(pumpTarget.set(0.12, avatar.dims.shoulderY - 0.27 + pump * 0.04, 0.12 + pump * 0.11), run);
  }

  // Targets are where the palms go; each wrist sits back from its palm along the hand.
  const wrist = (target, offset) => target.add(handOffset.copy(offset).applyQuaternion(holderQuat));
  solveArm(armR, wrist(rightTarget, RIGHT_WRIST), POLE_R);
  solveArm(armL, wrist(leftTarget, LEFT_WRIST), POLE_L);
  poseHand(armR, handGoal.copy(holderQuat).multiply(RIGHT_GRIP), 1);
  poseHand(armL, handGoal.copy(holderQuat).multiply(LEFT_GRIP), m.runOneHand && !r ? 1 - run : 1);
}

function updateCamera(dt) {
  const def = GUNS[gunId];
  const pitch = player.pitch + player.recoil;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const ads = aiming && !player.reload && !player.dodge ? 1 : 0;
  player.adsCam = (player.adsCam || 0) + (ads - (player.adsCam || 0)) * (1 - Math.exp(-13 * dt));
  const a = player.adsCam;
  const scopedView = def.scoped && a > 0.82;
  const distance = lerp(2.55, def.scoped ? 0.9 : 1.55, a);
  const shoulder = lerp(0.56, 0.4, a);
  camera.position.set(
    player.pos.x - s * cp * distance - c * shoulder,
    player.pos.y + 1.34 - sp * distance,
    player.pos.z - c * cp * distance + s * shoulder,
  );
  camera.position.y = Math.max(camera.position.y, groundHeight(camera.position.x, camera.position.z) + 0.3);
  if (player.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * player.shake * 0.7;
    camera.position.y += (Math.random() - 0.5) * player.shake * 0.7;
  }
  camera.lookAt(camera.position.x + s * cp, camera.position.y + sp, camera.position.z + c * cp);

  const fov = lerp(58, def.aimFov, a);
  if (Math.abs(camera.fov - fov) > 0.02) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  $('scope').classList.toggle('hidden', !scopedView);
  avatar.setVisible(!scopedView);
}

/* ---------- Enemies ---------- */
function spawnGhoul(x, z, runner) {
  const model = buildGhoul(runner);
  scene.add(model.root);
  game.enemies.push({
    model, runner,
    pos: new THREE.Vector3(x, groundHeight(x, z) - 1.8, z),
    hp: runner ? 66 : 100,
    speed: runner ? 5 : 2.7,
    rise: 0.9,
    attackCd: 0,
    windup: 0,
    phase: Math.random() * 6,
    flash: 0,
    dead: false,
  });
}

function spawnNearPlayer(runner) {
  for (let tries = 0; tries < 6; tries++) {
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 10;
    const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
    if (Math.hypot(x, z) < WORLD_RADIUS) { spawnGhoul(x, z, runner); return; }
  }
}

function removeEnemy(enemy) {
  scene.remove(enemy.model.root);
  if (enemy.model.skin) enemy.model.skin.dispose();
  game.enemies.splice(game.enemies.indexOf(enemy), 1);
}

function updateGhoul(enemy, dt) {
  const { model, pos } = enemy;
  model.skin.emissive.setHex(enemy.flash > 0 ? 0xffffff : 0x000000);
  enemy.flash -= dt;

  if (enemy.dead) {
    enemy.deadT += dt;
    model.root.rotation.x = -Math.min(enemy.deadT * 3, 1.5);
    pos.y -= enemy.deadT > 0.8 ? dt * 0.8 : 0;
    model.root.position.copy(pos);
    if (enemy.deadT > 2) removeEnemy(enemy);
    return;
  }

  const ground = groundHeight(pos.x, pos.z);
  if (enemy.rise > 0) {
    enemy.rise -= dt;
    pos.y = ground - Math.max(enemy.rise, 0) * 2;
    model.root.position.copy(pos);
    return;
  }

  const dx = player.pos.x - pos.x, dz = player.pos.z - pos.z;
  const dist = Math.hypot(dx, dz);
  model.root.rotation.y = Math.atan2(dx, dz);
  enemy.attackCd -= dt;

  if (enemy.windup > 0) {
    enemy.windup -= dt;
    model.armL.rotation.x = model.armR.rotation.x = -2.5;
    if (enemy.windup <= 0) {
      if (dist < 2.1) hurtPlayer(enemy.runner ? 9 : 14);
      enemy.attackCd = 1.2;
    }
  } else if (dist < 1.55 && enemy.attackCd <= 0) {
    enemy.windup = 0.38;
    Sfx.groan();
  } else if (dist > 1.25) {
    pos.x += (dx / dist) * enemy.speed * dt;
    pos.z += (dz / dist) * enemy.speed * dt;
    pushOutOfColliders(pos, 0.35);
    enemy.phase += enemy.speed * dt * 2.1;
    const swing = Math.sin(enemy.phase) * 0.7;
    model.legL.rotation.x = swing;
    model.legR.rotation.x = -swing;
    model.armL.rotation.x = -1.3 - swing * 0.3;
    model.armR.rotation.x = -1.3 + swing * 0.3;
  }

  pos.y = groundHeight(pos.x, pos.z);
  model.root.position.copy(pos);
  if (dist > 62) removeEnemy(enemy);
  else if (Math.random() < dt * 0.05 && dist < 26) Sfx.groan();
}

function updateSpawns(dt) {
  if (game.stage >= 3) return;
  const lit = game.stage;
  const lighting = world.wards.some((w) => !w.lit && w.progress > 0);
  const cap = 3 + lit * 2 + (lighting ? 3 : 0);
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  game.spawnTimer = lighting ? 1.7 : Math.max(3.2, 6 - lit);
  const alive = game.enemies.filter((e) => !e.dead).length;
  if (alive < cap) spawnNearPlayer(lit > 0 && Math.random() < 0.2 + lit * 0.12);
}

/* ---------- Boss ---------- */
function startBoss() {
  game.stage = 4;
  const { altar } = world;
  const model = buildBoss();
  const x = altar.x, z = altar.z + 8;
  model.root.rotation.y = Math.atan2(player.pos.x - x, player.pos.z - z);
  scene.add(model.root);
  game.boss = {
    isBoss: true,
    model,
    pos: new THREE.Vector3(x, groundHeight(x, z) - 3.7, z),
    hp: 3000,
    maxHp: 3000,
    rise: 3.2,
    attackCd: 2.5,
    phase: 0,
    flash: 0,
    slamT: 0,
    summoned: 0,
    dead: false,
    deadT: 0,
  };
  game.enemies.push(game.boss);
  $('boss').classList.remove('hidden');
  Sfx.roar();
  player.shake = 1.4;
  subtitles.length = 0;
  subtitleT = 0;
  say('You came all this way to wake me.', 3.2);
  say('Then kneel, little ember. The cold is patient.', 3.6);
}

function fireShards(boss, count) {
  const from = new THREE.Vector3(boss.pos.x, boss.pos.y + 3, boss.pos.z);
  const to = new THREE.Vector3(player.pos.x, player.pos.y + 1, player.pos.z);
  const base = Math.atan2(to.x - from.x, to.z - from.z);
  const flat = Math.hypot(to.x - from.x, to.z - from.z);
  const rise = (to.y - from.y) / flat;
  for (let i = 0; i < count; i++) {
    const a = base + (i - (count - 1) / 2) * 0.17;
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 1.05, 5).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x9fecff, fog: false }),
    );
    mesh.position.copy(from);
    mesh.rotation.y = a;
    scene.add(mesh);
    game.shards.push({ mesh, vel: new THREE.Vector3(Math.sin(a), rise, Math.cos(a)).normalize().multiplyScalar(15), life: 5 });
  }
  Sfx.ice();
}

function updateShards(dt) {
  for (const shard of [...game.shards]) {
    shard.life -= dt;
    shard.mesh.position.addScaledVector(shard.vel, dt);
    const p = shard.mesh.position;
    const hitPlayer = Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 0.7 && p.y > player.pos.y - 0.2 && p.y < player.pos.y + 1.8;
    if (hitPlayer) hurtPlayer(13);
    const landed = p.y < groundHeight(p.x, p.z);
    if (landed) burst(p, 0xbff0ff, 6, 2.2);
    if (hitPlayer || landed || shard.life <= 0) {
      scene.remove(shard.mesh);
      shard.mesh.geometry.dispose();
      shard.mesh.material.dispose();
      game.shards.splice(game.shards.indexOf(shard), 1);
    }
  }
}

function updateBoss(boss, dt) {
  const { model, pos } = boss;
  const ground = groundHeight(pos.x, pos.z);

  if (boss.dead) {
    boss.deadT += dt;
    model.root.rotation.x = -Math.min(boss.deadT * 0.45, 0.45);
    pos.y = ground - boss.deadT * 1.25;
    model.root.position.copy(pos);
    if (Math.random() < dt * 20) burst(new THREE.Vector3(pos.x, pos.y + 2.5, pos.z), 0x8fe8ff, 6, 4);
    if (boss.deadT > 3.5) removeEnemy(boss);
    return;
  }

  if (boss.rise > 0) {
    boss.rise -= dt;
    pos.y = ground - Math.max(boss.rise, 0) * 1.15;
    model.root.position.copy(pos);
    burst(new THREE.Vector3(pos.x, ground + 0.2, pos.z), 0xe8eeff, 2, 4);
    return;
  }

  const ratio = boss.hp / boss.maxHp;
  const enraged = ratio < 0.5;
  if (boss.summoned === 0 && ratio < 0.66) {
    boss.summoned = 1;
    say('Rise. All of you. Rise.', 2.8);
    for (let i = 0; i < 3; i++) spawnNearPlayer(false);
  }
  if (boss.summoned === 1 && ratio < 0.33) {
    boss.summoned = 2;
    say('I have buried kingdoms in this snow.', 3);
    for (let i = 0; i < 4; i++) spawnNearPlayer(true);
  }

  const dx = player.pos.x - pos.x, dz = player.pos.z - pos.z;
  const dist = Math.hypot(dx, dz);
  model.root.rotation.y = angleLerp(model.root.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-4 * dt));
  boss.attackCd -= dt;

  const slamRadius = 6;
  if (boss.slamT > 0) {
    boss.slamT -= dt;
    const charge = 1 - boss.slamT;
    model.armR.rotation.x = -2.9 + Math.min(charge, 0.85) * 0.2;
    slamRing.visible = true;
    slamRing.position.set(pos.x, ground + 0.12, pos.z);
    slamRing.scale.setScalar(Math.min(1, charge * 1.1) * slamRadius);
    if (boss.slamT <= 0) {
      model.armR.rotation.x = -0.6;
      slamRing.visible = false;
      burst(new THREE.Vector3(pos.x, ground + 0.3, pos.z), 0xe8eeff, 50, 8);
      player.shake = 0.8;
      Sfx.slam();
      if (dist < slamRadius) hurtPlayer(32);
      boss.attackCd = enraged ? 1.2 : 2;
    }
  } else {
    if (dist > 4.2) {
      const speed = enraged ? 3.5 : 2.5;
      pos.x += (dx / dist) * speed * dt;
      pos.z += (dz / dist) * speed * dt;
      boss.phase += speed * dt * 1.2;
    }
    const swing = Math.sin(boss.phase) * 0.45;
    model.legL.rotation.x = swing;
    model.legR.rotation.x = -swing;
    model.armL.rotation.x = -swing * 0.5;
    model.armR.rotation.x += (-0.5 - model.armR.rotation.x) * (1 - Math.exp(-6 * dt));

    if (boss.attackCd <= 0) {
      if (dist < 7.5) { boss.slamT = 1; Sfx.roar(); } else {
        fireShards(boss, enraged ? 5 : 3);
        boss.attackCd = enraged ? 1.5 : 2.4;
      }
    }
  }

  pos.y = groundHeight(pos.x, pos.z);
  model.root.position.copy(pos);
}

function killBoss(boss) {
  boss.hp = 0;
  boss.dead = true;
  game.stage = 5;
  slamRing.visible = false;
  $('boss').classList.add('hidden');
  Sfx.roar();
  player.shake = 1.2;
  for (const enemy of game.enemies) {
    if (!enemy.isBoss && !enemy.dead) { enemy.dead = true; enemy.deadT = 0; }
  }
  subtitles.length = 0;
  subtitleT = 0;
  say('...the cold... does not end with me...', 3.6);
  say('The seal is broken. The blade is waiting.', 3.4);
  world.altar.ice.visible = false;
}

/* ---------- Objectives ---------- */
function setPrompt(text) {
  $('prompt').textContent = text || '';
  $('prompt').classList.toggle('hidden', !text);
}

function updateObjectives(dt) {
  let prompt = '';

  for (const ward of world.wards) {
    if (ward.lit) {
      ward.light.intensity = 60 + Math.sin(game.time * 11 + ward.x) * 8 + Math.sin(game.time * 23 + ward.z) * 5;
      continue;
    }
    const dist = Math.hypot(player.pos.x - ward.x, player.pos.z - ward.z);
    if (dist < 3.8) {
      if (keys.KeyE) {
        ward.progress += dt / 3;
        prompt = `Kindling... ${Math.floor(ward.progress * 100)}%`;
        if (ward.progress >= 1) lightWard(ward);
      } else {
        prompt = 'Hold E to kindle the wardfire';
      }
    } else {
      ward.progress = Math.max(0, ward.progress - dt * 0.15);
    }
  }

  const { altar } = world;
  const altarDist = Math.hypot(player.pos.x - altar.x, player.pos.z - altar.z);
  altar.blade.position.y = 3 + Math.sin(game.time * 1.4) * 0.06;
  if (game.stage < 3 && altarDist < 14) prompt = 'Sealed. The wardfires still sleep.';
  if (game.stage === 3 && altarDist < 16) startBoss();
  if (game.stage === 5 && (!game.boss || game.boss.deadT > 2) && altarDist < 5) {
    prompt = 'Press E to take the blade';
    if (keys.KeyE) endGame('The snow has stopped', 'The hilt is warm in your hand. Far behind you, three fires go out.');
  }
  setPrompt(prompt);
  altar.beam.visible = game.stage === 3 || game.stage === 5;
}

function lightWard(ward) {
  ward.lit = true;
  ward.progress = 1;
  ward.flame.visible = true;
  ward.beam.visible = false;
  player.hp = Math.min(100, player.hp + 45);
  game.stage++;
  Sfx.ignite();
  burst(new THREE.Vector3(ward.x, player.pos.y + 3, ward.z), 0xff9a50, 40, 6);
  if (game.stage === 1) say('One. Something in the trees heard that.', 3.2);
  if (game.stage === 2) say('Two. They are moving faster now.', 3.2);
  if (game.stage === 3) {
    say('Three. The seal is thinning. North, to the altar.', 3.8);
    for (const enemy of game.enemies) { if (!enemy.dead) { enemy.dead = true; enemy.deadT = 0; } }
  }
}

function objectiveTarget() {
  if (game.stage >= 3) return world.altar;
  let best = null, bestD = Infinity;
  for (const ward of world.wards) {
    if (ward.lit) continue;
    const d = Math.hypot(player.pos.x - ward.x, player.pos.z - ward.z);
    if (d < bestD) { best = ward; bestD = d; }
  }
  return best;
}

function objectiveText() {
  if (game.stage < 3) return `Rekindle the wardfires (${game.stage}/3)`;
  return ['Reach the frozen altar', 'Destroy the Hollow King', 'Claim the sealed blade'][game.stage - 3];
}

/* ---------- HUD ---------- */
function updateHud() {
  const def = GUNS[gunId];
  $('hp-fill').style.width = `${player.hp}%`;
  $('stamina-fill').style.width = `${player.stamina}%`;
  $('ammo-count').textContent = player.reload && player.reload.style === 'mag' ? '--' : player.ammo[gunId];
  $('ammo-max').textContent = `/ ${def.mag}`;
  $('gun-name').textContent = def.name;
  $('objective').textContent = objectiveText();
  if (game.boss && !game.boss.dead) $('boss-fill').style.width = `${(game.boss.hp / game.boss.maxHp) * 100}%`;

  const hurt = $('hurt');
  const lowHealth = player.hp < 30 ? 0.45 : 0;
  hurt.style.opacity = Math.max(lowHealth, parseFloat(hurt.style.opacity || 0) * 0.94);

  const target = objectiveTarget();
  const fighting = game.stage === 4;
  $('compass').style.visibility = target && !fighting ? 'visible' : 'hidden';
  if (target) {
    const bearing = Math.atan2(target.x - player.pos.x, target.z - player.pos.z);
    const relative = Math.atan2(Math.sin(player.yaw - bearing), Math.cos(player.yaw - bearing));
    $('compass-arrow').style.transform = `rotate(${relative}rad)`;
    $('compass-dist').textContent = `${Math.round(Math.hypot(target.x - player.pos.x, target.z - player.pos.z))} m`;
  }
}

/* ---------- Main loop ---------- */
function update(dt) {
  game.time += dt;
  updatePlayer(dt);
  updateCamera(dt);
  for (const enemy of [...game.enemies]) {
    if (enemy.isBoss) updateBoss(enemy, dt);
    else updateGhoul(enemy, dt);
  }
  updateShards(dt);
  updateDroppedMags(dt);
  updateSpawns(dt);
  updateObjectives(dt);
  updateHud();
}

// Slow drift in front of her on the title screen, so skin and gun choices show.
const titleMove = new THREE.Vector3();
function updateTitle(dt) {
  game.time += dt;
  const a = game.time * 0.12;
  player.pos.y = groundHeight(player.pos.x, player.pos.z);
  player.aimT = 0;
  player.bodyYaw = Math.PI + 0.22 + Math.sin(a) * 0.1;
  poseAvatar(dt, titleMove, false);
  avatar.simulate(dt);
  camera.position.set(player.pos.x - 0.72 + Math.sin(a) * 0.14, player.pos.y + 1.12, player.pos.z - 2.45);
  camera.lookAt(player.pos.x - 0.58, player.pos.y + 0.92, player.pos.z);
}

/* ---------- Character room ---------- */
// A plain studio high above the map, for looking over the character up close.
const ROOM_Y = 400;
const ROOM_VIEWS = {
  Full: { y: 0.8, dist: 2.7, yaw: 0.3, pitch: 0.05 },
  Head: { y: 1.36, dist: 0.85, yaw: 0.35, pitch: 0.04 },
  Face: { y: 1.34, dist: 0.5, yaw: 0, pitch: 0 },
  Side: { y: 1.34, dist: 0.8, yaw: Math.PI / 2, pitch: 0 },
  Back: { y: 1.05, dist: 1.5, yaw: Math.PI, pitch: 0.08 },
  Torso: { y: 1.02, dist: 1.05, yaw: 0.2, pitch: 0.02 },
  Legs: { y: 0.42, dist: 1.25, yaw: 0.3, pitch: 0.05 },
  Hands: { y: 0.95, dist: 0.8, yaw: 0.2, pitch: 0.22 },
};
const ROOM_POSES = ['Idle', 'Aim', 'Walk', 'Run', 'Reload'];

const roomSet = new THREE.Group();
roomSet.position.y = ROOM_Y;
roomSet.visible = false;
const roomWall = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 20), new THREE.MeshBasicMaterial({ color: 0x4a5372, side: THREE.BackSide, fog: false }));
const roomFloor = new THREE.Mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x79819c, roughness: 0.85, fog: false }));
roomFloor.receiveShadow = true;
const roomMark = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.65, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc2cc, fog: false }));
roomMark.position.y = 0.004;
roomSet.add(roomWall, roomFloor, roomMark);
scene.add(roomSet);

const orbit = {
  target: new THREE.Vector3(0, 0.8, 0),
  yaw: 0.3, pitch: 0.05, dist: 2.7,
  goal: { y: 0.8, x: 0, z: 0, yaw: 0.3, pitch: 0.05, dist: 2.7 },
  button: -1,
};
let roomPose = 'Idle';
let roomView = 'Full';
const roomReturn = new THREE.Vector3();

function renderRoomControls() {
  const chip = (group, name, active) => `<button data-${group}="${name}" aria-pressed="${active}">${name}</button>`;
  $('room-views').innerHTML = Object.keys(ROOM_VIEWS).map((name) => chip('view', name, name === roomView)).join('');
  $('room-poses').innerHTML = ROOM_POSES.map((name) => chip('pose', name, name === roomPose)).join('');
}

function setRoomView(name) {
  const v = ROOM_VIEWS[name];
  roomView = name;
  Object.assign(orbit.goal, { x: 0, y: v.y, z: 0, yaw: v.yaw, pitch: v.pitch, dist: v.dist });
  renderRoomControls();
}

function setRoomPose(name) {
  roomPose = name;
  player.reload = null;
  if (name === 'Reload') startRoomReload();
  renderRoomControls();
}

function startRoomReload() {
  player.ammo[gunId] = 0;
  startReload();
}

function openRoom() {
  game.state = 'room';
  document.body.classList.add('in-room');
  $('title').classList.add('hidden');
  $('room').classList.remove('hidden');
  roomSet.visible = true;
  world.setWeather(false);
  roomReturn.copy(player.pos);
  player.pos.set(0, ROOM_Y, 0);
  player.bodyYaw = 0;
  player.pitch = 0;
  camera.near = 0.02;
  camera.fov = 34;
  camera.updateProjectionMatrix();
  setRoomPose('Idle');
  setRoomView('Full');
  Object.assign(orbit, { yaw: orbit.goal.yaw, pitch: orbit.goal.pitch, dist: orbit.goal.dist });
  orbit.target.set(orbit.goal.x, orbit.goal.y, orbit.goal.z);
}

function closeRoom() {
  game.state = 'title';
  document.body.classList.remove('in-room', 'dragging');
  orbit.button = -1;
  $('room').classList.add('hidden');
  $('title').classList.remove('hidden');
  roomSet.visible = false;
  world.setWeather(true);
  avatar.holder.visible = true;
  player.pos.copy(roomReturn);
  player.reload = null;
  player.aimT = 0;
  player.stride = 0;
  player.runBlend = 0;
  player.ammo[gunId] = GUNS[gunId].mag;
  camera.near = 0.1;
  camera.fov = 58;
  camera.updateProjectionMatrix();
  for (const mag of droppedMags.splice(0)) scene.remove(mag.mesh);
}

$('open-room').addEventListener('click', openRoom);
$('close-room').addEventListener('click', closeRoom);
$('room').addEventListener('click', (e) => {
  if (e.target.dataset.view) setRoomView(e.target.dataset.view);
  if (e.target.dataset.pose) setRoomPose(e.target.dataset.pose);
});
addEventListener('keydown', (e) => { if (e.code === 'Escape' && game.state === 'room') closeRoom(); });
canvas.addEventListener('mousedown', (e) => {
  if (game.state !== 'room') return;
  orbit.button = e.button;
  document.body.classList.add('dragging');
});
addEventListener('mouseup', () => {
  orbit.button = -1;
  document.body.classList.remove('dragging');
});
addEventListener('mousemove', (e) => {
  if (game.state !== 'room' || orbit.button < 0) return;
  if (orbit.button === 0) {
    orbit.goal.yaw -= e.movementX * 0.0075;
    orbit.goal.pitch = clamp(orbit.goal.pitch + e.movementY * 0.0055, -1.2, 1.45);
  } else {
    // Pan across the screen; the amount scales so close-ups stay controllable.
    const pan = orbit.dist * 0.0012;
    const c = Math.cos(orbit.yaw), s = Math.sin(orbit.yaw);
    orbit.goal.x = clamp(orbit.goal.x - e.movementX * pan * c, -1.5, 1.5);
    orbit.goal.z = clamp(orbit.goal.z + e.movementX * pan * s, -1.5, 1.5);
    orbit.goal.y = clamp(orbit.goal.y + e.movementY * pan, 0, 2);
  }
});
canvas.addEventListener('wheel', (e) => {
  if (game.state !== 'room') return;
  e.preventDefault();
  orbit.goal.dist = clamp(orbit.goal.dist * Math.exp(e.deltaY * 0.0012), 0.16, 6);
}, { passive: false });

const roomMove = new THREE.Vector3();
function updateRoom(dt) {
  game.time += dt;
  player.equip = Math.max(0, player.equip - dt * 4);
  avatar.holder.visible = $('room-gun').checked;
  player.pos.set(0, ROOM_Y, 0);
  player.bodyYaw = 0;
  player.pitch = 0;

  const running = roomPose === 'Run';
  const walking = roomPose === 'Walk' || running;
  roomMove.set(0, 0, walking ? 1 : 0);
  player.stride += (((running ? 1 : walking ? 0.68 : 0)) - player.stride) * (1 - Math.exp(-9 * dt));
  player.runBlend += ((running ? 1 : 0) - player.runBlend) * (1 - Math.exp(-(running ? 7 : 10) * dt));
  if (walking) player.walkPhase += dt * (running ? 6.9 * 1.95 : 4.3 * 2.55);
  player.aimT = roomPose === 'Aim' ? 1 : 0;
  if (player.reload) updateReload(dt);
  else if (roomPose === 'Reload') startRoomReload();
  updateDroppedMags(dt);
  poseAvatar(dt, roomMove, walking);
  avatar.simulate(dt);

  const ease = 1 - Math.exp(-11 * dt);
  orbit.yaw += (orbit.goal.yaw - orbit.yaw) * ease;
  orbit.pitch += (orbit.goal.pitch - orbit.pitch) * ease;
  orbit.dist += (orbit.goal.dist - orbit.dist) * ease;
  orbit.target.x += (orbit.goal.x - orbit.target.x) * ease;
  orbit.target.y += (orbit.goal.y - orbit.target.y) * ease;
  orbit.target.z += (orbit.goal.z - orbit.target.z) * ease;

  const cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
  const tx = orbit.target.x, ty = ROOM_Y + orbit.target.y, tz = orbit.target.z;
  camera.position.set(tx + Math.sin(orbit.yaw) * cp * orbit.dist, Math.max(ROOM_Y + 0.03, ty + sp * orbit.dist), tz + Math.cos(orbit.yaw) * cp * orbit.dist);
  camera.lookAt(tx, ty, tz);
}

setSkin(skinId);
renderLoadout();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (game.state === 'title') updateTitle(dt);
  if (game.state === 'playing') update(dt);
  if (game.state === 'room') updateRoom(dt);
  if (game.state === 'playing' || game.state === 'title' || game.state === 'room') {
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 60);
    tracerT -= dt;
    if (tracerT <= 0) { tracer.visible = false; muzzleFlash.visible = false; }
    updateSparks(dt);
    updateSubtitles(dt);
    world.update(dt, game.time, camera.position, player.pos);
  }
  pipeline.render(dt, game.time);
}
requestAnimationFrame(frame);

// Exposed for debugging from the browser console.
window.hollowSnow = { game, player, world, keys, spawnGhoul, lightWard, startBoss, tryFire, setSkin, equipGun, startDodge, startReload };
