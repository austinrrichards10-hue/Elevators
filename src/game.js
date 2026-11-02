// Game loop, player, enemies, objectives and HUD.
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 900);
const world = buildWorld(renderer, scene);
const pipeline = createPipeline(renderer, scene, camera);
addEventListener('resize', pipeline.resize);
pipeline.resize();

const heroine = buildHeroine();
scene.add(heroine.root);

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
  const s = Math.sin(heroine.root.rotation.y), c = Math.cos(heroine.root.rotation.y);
  const x = player.pos.x - c * footSide * 0.1, z = player.pos.z + s * footSide * 0.1;
  footprintDummy.position.set(x, groundHeight(x, z) + 0.035, z);
  footprintDummy.rotation.set(0, heroine.root.rotation.y, 0);
  footprintDummy.scale.set(0.2, 1, 0.38);
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
  ammo: 8,
  fireCd: 0,
  reloadT: 0,
  aimT: 0,
  dodgeT: 0,
  dodgeDir: new THREE.Vector3(),
  sinceHurt: 99,
  walkPhase: 0,
  stride: 0,
  swingTarget: new THREE.Vector3(),
  stepDist: 0,
  recoil: 0,
  shake: 0,
};

/* ---------- Input ---------- */
const keys = {};
let firing = false;
let pointerWasLocked = false;

addEventListener('keydown', (e) => {
  if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (game.state !== 'playing') return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Space') startDodge();
  if (e.code === 'KeyM') Sfx.toggleMute();
  if (e.code === 'KeyP') setPaused(true);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; firing = false; });
canvas.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing') return;
  if (document.pointerLockElement !== canvas) lockPointer();
  if (e.button === 0) { firing = true; fire(); }
});
addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });
addEventListener('mousemove', (e) => {
  if (game.state !== 'playing') return;
  player.yaw -= e.movementX * 0.0023;
  player.pitch = clamp(player.pitch - e.movementY * 0.0023, -0.85, 0.95);
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
  if (paused) { pointerWasLocked = false; document.exitPointerLock(); } else lockPointer();
}

$('start').addEventListener('click', () => {
  Sfx.init();
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  game.state = 'playing';
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
const SPARK_COUNT = 240;
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

const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe2b0, fog: false }));
tracer.frustumCulled = false;
tracer.visible = false;
scene.add(tracer);
let tracerT = 0;

const slamRing = new THREE.Mesh(
  new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xff3355, fog: false, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
);
slamRing.visible = false;
scene.add(slamRing);

/* ---------- Combat ---------- */
const muzzlePos = new THREE.Vector3();
const aimDir = new THREE.Vector3();

function startReload() {
  if (player.reloadT > 0 || player.ammo === 8) return;
  player.reloadT = 1.35;
  Sfx.reload();
}

function startDodge() {
  if (player.dodgeT > 0 || player.stamina < 25) return;
  player.stamina -= 25;
  player.dodgeT = 0.34;
  const move = moveInput();
  if (move.lengthSq() === 0) move.set(Math.sin(player.yaw), 0, Math.cos(player.yaw)).negate();
  player.dodgeDir.copy(move).normalize();
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
  if (enemy.isBoss) return [{ y: 3.25, r: 0.55, damage: 70 }, { y: 2.3, r: 0.95, damage: 34 }, { y: 1, r: 0.8, damage: 34 }];
  return [{ y: 1.62, r: 0.26, damage: 100 }, { y: 1.05, r: 0.42, damage: 34 }, { y: 0.45, r: 0.34, damage: 34 }];
}

function fire() {
  if (player.fireCd > 0 || player.reloadT > 0 || player.dodgeT > 0) return;
  if (player.ammo <= 0) { Sfx.click(); startReload(); return; }
  player.ammo--;
  player.fireCd = 0.2;
  player.aimT = 1.4;
  player.recoil = Math.min(player.recoil + 0.035, 0.09);
  Sfx.shot();
  muzzleLight.intensity = 6;

  camera.getWorldDirection(aimDir);
  const origin = camera.position;
  const minT = origin.distanceTo(player.pos) * 0.6;
  let bestT = 75, target = null, damage = 0;
  const center = new THREE.Vector3();

  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    for (const s of hitSpheres(enemy)) {
      center.set(enemy.pos.x, enemy.pos.y + s.y, enemy.pos.z);
      const t = raySphere(origin, aimDir, center, s.r);
      if (t > minT && t < bestT) { bestT = t; target = enemy; damage = s.damage; }
    }
  }

  // Trunks and terrain stop bullets too.
  let blocked = false;
  for (let t = minT; t < bestT; t += 0.5) {
    const x = origin.x + aimDir.x * t, y = origin.y + aimDir.y * t, z = origin.z + aimDir.z * t;
    const hitsGround = y < groundHeight(x, z);
    const hitsTrunk = y < groundHeight(x, z) + 3 && nearbyColliders(x, z).some((c) => Math.hypot(x - c.x, z - c.z) < c.r);
    if (hitsGround || hitsTrunk) { bestT = t; blocked = true; target = null; break; }
  }

  const hit = origin.clone().addScaledVector(aimDir, bestT);
  heroine.muzzle.getWorldPosition(muzzlePos);
  muzzleLight.position.copy(muzzlePos);
  muzzleFlash.position.copy(muzzlePos);
  muzzleFlash.visible = true;
  burst(muzzlePos, 0xffd9a0, 3, 1.6);
  tracerGeo.attributes.position.setXYZ(0, muzzlePos.x, muzzlePos.y, muzzlePos.z);
  tracerGeo.attributes.position.setXYZ(1, hit.x, hit.y, hit.z);
  tracerGeo.attributes.position.needsUpdate = true;
  tracer.visible = true;
  tracerT = 0.045;

  if (target) {
    damageEnemy(target, damage);
    burst(hit, 0x8fe8ff, 10, 3.4);
    Sfx.hit();
    $('crosshair').classList.add('hit');
    setTimeout(() => $('crosshair').classList.remove('hit'), 90);
  } else if (blocked) {
    burst(hit, 0xe8eeff, 7, 2.4);
  }
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.08;
  if (enemy.hp > 0) return;
  if (enemy.isBoss) killBoss(enemy);
  else { enemy.dead = true; enemy.deadT = 0; Sfx.groan(); }
}

function hurtPlayer(amount) {
  if (player.dodgeT > 0 || game.state !== 'playing') return;
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
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  $('end').classList.remove('hidden');
  $('hud').classList.add('hidden');
}

/* ---------- Player ---------- */
function moveInput() {
  const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  return new THREE.Vector3(s * forward - c * strafe, 0, c * forward + s * strafe);
}

function angleLerp(from, to, amount) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * amount;
}

function updatePlayer(dt) {
  player.fireCd -= dt;
  player.aimT -= dt;
  player.sinceHurt += dt;
  player.recoil = Math.max(0, player.recoil - dt * 0.45);
  player.shake = Math.max(0, player.shake - dt);

  if (player.reloadT > 0) {
    player.reloadT -= dt;
    if (player.reloadT <= 0) player.ammo = 8;
  }
  if (firing) fire();

  const move = moveInput();
  const moving = move.lengthSq() > 0;
  const sprinting = keys.ShiftLeft && moving && player.stamina > 1 && player.aimT <= 0.6 && player.reloadT <= 0;
  player.stamina = clamp(player.stamina + (sprinting ? -24 : 16) * dt, 0, 100);
  if (player.sinceHurt > 6) player.hp = Math.min(100, player.hp + 3 * dt);

  let step = 0;
  if (player.dodgeT > 0) {
    player.dodgeT -= dt;
    player.pos.addScaledVector(player.dodgeDir, 12 * dt);
    step = 12 * dt;
  } else if (moving) {
    const speed = sprinting ? 7.4 : 4.6;
    move.normalize();
    player.pos.addScaledVector(move, speed * dt);
    step = speed * dt;
  }
  pushOutOfColliders(player.pos, 0.4);

  const r = Math.hypot(player.pos.x, player.pos.z);
  if (r > WORLD_RADIUS) {
    player.pos.x *= WORLD_RADIUS / r;
    player.pos.z *= WORLD_RADIUS / r;
  }
  player.pos.y = groundHeight(player.pos.x, player.pos.z);

  player.stepDist += step;
  if (player.stepDist > 1.25) { player.stepDist = 0; Sfx.step(); leaveFootprint(); }
  if (moving || player.aimT > 0) player.bodyYaw = angleLerp(player.bodyYaw, player.yaw, 1 - Math.exp(-11 * dt));

  // Blend between standing and walking so the gait eases in and out.
  const stride = moving || player.dodgeT > 0 ? (sprinting ? 1 : 0.68) : 0;
  player.stride += (stride - player.stride) * (1 - Math.exp(-9 * dt));
  player.walkPhase += step * (sprinting ? 2.15 : 2.7);
  poseHeroine(dt, move, moving);
}

function poseHeroine(dt, move, moving) {
  const { root, chest, head, legL, legR, armL, armR, swing } = heroine;
  const amount = player.stride;
  const ph = player.walkPhase;
  const breathe = Math.sin(game.time * 1.5);
  const ease = (rate) => 1 - Math.exp(-rate * dt);

  root.position.copy(player.pos);
  root.position.y += Math.abs(Math.sin(ph)) * 0.035 * amount - 0.02 * amount;
  root.rotation.y = player.bodyYaw;
  root.rotation.x += ((player.dodgeT > 0 ? 0.42 : 0) - root.rotation.x) * ease(18);

  // Thighs swing opposite; each knee bends as its foot passes under the body.
  const gait = (leg, phase) => {
    leg.thigh.rotation.x = Math.sin(phase) * -0.72 * amount;
    leg.shin.rotation.x = (0.08 + Math.max(0, Math.cos(phase)) * 1.05) * amount + 0.02;
  };
  gait(legL, ph);
  gait(legR, ph + Math.PI);

  chest.rotation.x = 0.1 * amount + breathe * 0.008 - player.pitch * 0.12;
  chest.rotation.y = Math.sin(ph) * 0.11 * amount;
  chest.position.y = 0.98 + breathe * 0.004;
  head.rotation.x = -player.pitch * 0.42 - 0.1 * amount;
  head.rotation.y = -chest.rotation.y;

  armL.upper.rotation.x = Math.sin(ph) * 0.42 * amount - 0.04;
  armL.upper.rotation.z = 0.1;
  armL.fore.rotation.x = -0.2 - amount * 0.45;

  let upper, fore;
  if (player.reloadT > 0) { upper = -0.5; fore = -1.5; }
  else if (player.aimT > 0) { upper = -Math.PI / 2 - player.pitch - player.recoil * 3 + 0.1 * Math.sin(ph) * amount * 0.2; fore = -0.06; }
  else { upper = -0.3 - Math.sin(ph) * 0.2 * amount; fore = -1.05; }
  armR.upper.rotation.x += (upper - armR.upper.rotation.x) * ease(20);
  armR.fore.rotation.x += (fore - armR.fore.rotation.x) * ease(20);
  armR.upper.rotation.z = player.aimT > 0 ? -0.04 : -0.14;

  // The fur trails against the direction of travel and settles when she stops.
  const s = Math.sin(root.rotation.y), c = Math.cos(root.rotation.y);
  const speed = moving ? (player.dodgeT > 0 ? 1.4 : amount) : 0;
  const worldX = moving ? move.x * speed : 0, worldZ = moving ? move.z * speed : 0;
  const localZ = worldX * s + worldZ * c, localX = worldX * c - worldZ * s;
  const target = player.swingTarget.set(-localX * 0.11, 0.03 * speed, -localZ * 0.2 + Math.sin(ph * 2) * 0.012 * amount);
  swing.value.lerp(target, ease(7));
}

function updateCamera() {
  const pitch = player.pitch + player.recoil;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const distance = 3;
  camera.position.set(
    player.pos.x - s * cp * distance - c * 0.68,
    player.pos.y + 1.62 - sp * distance,
    player.pos.z - c * cp * distance + s * 0.68,
  );
  camera.position.y = Math.max(camera.position.y, groundHeight(camera.position.x, camera.position.z) + 0.3);
  if (player.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * player.shake * 0.7;
    camera.position.y += (Math.random() - 0.5) * player.shake * 0.7;
  }
  camera.lookAt(camera.position.x + s * cp, camera.position.y + sp, camera.position.z + c * cp);
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
    hp: 1400,
    maxHp: 1400,
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
    const hitPlayer = Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 0.75 && p.y > player.pos.y - 0.2 && p.y < player.pos.y + 2.1;
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
  $('hp-fill').style.width = `${player.hp}%`;
  $('stamina-fill').style.width = `${player.stamina}%`;
  $('ammo-count').textContent = player.reloadT > 0 ? '--' : player.ammo;
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
  updateCamera();
  for (const enemy of [...game.enemies]) {
    if (enemy.isBoss) updateBoss(enemy, dt);
    else updateGhoul(enemy, dt);
  }
  updateShards(dt);
  updateSpawns(dt);
  updateObjectives(dt);
  updateHud();
}

// Slow orbit behind the title screen.
function updateTitle(dt) {
  game.time += dt;
  const a = game.time * 0.12;
  player.pos.y = groundHeight(player.pos.x, player.pos.z);
  player.aimT = 0;
  poseHeroine(dt, player.swingTarget, false);
  heroine.root.rotation.y = Math.PI + 0.25 + Math.sin(a) * 0.12;
  camera.position.set(player.pos.x - 0.95 + Math.sin(a) * 0.2, player.pos.y + 1.28, player.pos.z - 2.75);
  camera.lookAt(player.pos.x - 0.75, player.pos.y + 1.12, player.pos.z);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (game.state === 'title') updateTitle(dt);
  if (game.state === 'playing') update(dt);
  if (game.state === 'playing' || game.state === 'title') {
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
window.hollowSnow = { game, player, world, keys, spawnGhoul, lightWard, startBoss, fire };
