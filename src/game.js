// Game loop, player, camera, bow and HUD.
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
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 7000);
const world = buildWorld(renderer, scene);
const pipeline = createPipeline(renderer, scene, camera);
addEventListener('resize', pipeline.resize);
pipeline.resize();

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
  time: 0,
};

const player = {
  pos: new THREE.Vector3(LANDMARKS.start.x, 0, LANDMARKS.start.z),
  yaw: Math.PI,
  pitch: 0.02,
  bodyYaw: Math.PI,
  stamina: 100,
  drawing: false,
  draw: 0,
  releaseCd: 0,
  aimT: 0,
  aimBlend: 0,
  lookBlend: 0,
  walkPhase: 0,
  stride: 0,
  sprinting: false,
  runBlend: 0,
  gaitDir: 1,
  strafeLean: 0,
  stepDist: 0,
  recoil: 0,
  shake: 0,
  dodge: null,
  tuck: 0,
};

/* ---------- Loadout ---------- */
function loadSaved() {
  try { return JSON.parse(localStorage.getItem('hollowSnowLoadout')) || {}; } catch { return {}; }
}
const saved = loadSaved();
// Moderator options, toggled from the moderator menu (moderator.js). They're saved with
// the loadout so a test setup survives a reload.
const MOD_DEFAULTS = {
  fly: false, noclip: false, instantDraw: false, infiniteStamina: false, noCold: false, skipIntro: false,
  hideHud: false, showInfo: false, speed: 1, timeScale: 1,
};
const mod = { ...MOD_DEFAULTS };
for (const key in MOD_DEFAULTS) if (saved.mod && key in saved.mod) mod[key] = saved.mod[key];
let skinId = SKIN_ORDER.includes(saved.skin) ? saved.skin : 'teal';
let avatar = null;
const bowModel = buildBowModel();

function saveLoadout() {
  try { localStorage.setItem('hollowSnowLoadout', JSON.stringify({ skin: skinId, muted: Sfx.muted, mod: mod })); } catch { /* storage is optional */ }
}

// The character room has its own track, and so does the fight with Teto (showdown.js); the
// forest has only its wind.
// The music for where she is: the boss fight's own, the character room's music box, the title
// theme, or, out in the wilds, a slow lonely piano under the wind.
function updateMusic() {
  const boss = showdownMusic();
  const quiet = showdown.stage !== 'none' && showdown.stage !== 'done';
  Sfx.playMusic(boss || (game.state === 'room' ? 'room' : game.state === 'title' ? 'title' : game.state === 'playing' && !quiet ? 'wilds' : null));
}
// Browsers keep sound off until the page is clicked: the first click on the title starts its theme.
addEventListener('pointerdown', () => { if (game.state === 'title' && !Sfx.ctx) { Sfx.init(); updateMusic(); } }, { once: true });

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

function setSkin(id) {
  skinId = id;
  if (avatar) avatar.dispose();
  avatar = createAvatar(scene, id);
  avatar.holder.add(bowModel.group);
  poseAvatar(1 / 60, new THREE.Vector3(), false);
  avatar.reset();
}

function renderLoadout() {
  const option = (id, entry) => `<button class="option" data-skin="${id}" aria-pressed="${id === skinId}">${entry.name}<span>${entry.note}</span></button>`;
  const html = `<div><h3>Skin</h3>${SKIN_ORDER.map((id) => option(id, SKINS[id])).join('')}</div>`;
  document.querySelectorAll('.loadout').forEach((el) => { el.innerHTML = html; });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.mute-toggle')) { toggleMute(); return; }
  const button = e.target.closest('.option');
  if (button && button.dataset.skin && button.dataset.skin !== skinId) { setSkin(button.dataset.skin); saveLoadout(); renderLoadout(); }
});

/* ---------- Input ---------- */
const keys = {};
let aiming = false;
// Ctrl switches between free look, where the mouse swings the camera around her and she
// faces where she walks, and aim lock, where she always faces the crosshair.
let aimLock = false;
let pointerWasLocked = false;

addEventListener('keydown', (e) => {
  if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyN') toggleMute();
  // The intro and the scenes always play through.
  if (game.state === 'cutscene' || game.state === 'scene') return;
  if (e.code === 'Backquote' || e.code === 'F2') { e.preventDefault(); toggleMod(); return; }
  if (game.state !== 'playing') return;
  // Placing something, or decorating the cabin (build.js); talking and the city (city.js).
  if (buildKey(e.code)) return;
  if (cityKey(e.code)) return;
  cheatKey(e.code);
  // The field book: her map, journal and pack.
  const page = { KeyM: 'map', KeyJ: 'journal', KeyI: 'pack' }[e.code];
  if (page) { openBook(page); return; }
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') { e.preventDefault(); aimLock = !aimLock; }
  if (e.code === 'Tab') setCrafting(!survival.crafting);
  if (e.code === 'KeyF') quickEat();
  if (e.code === 'KeyC') toggleSit();
  if (e.code === 'KeyZ') toggleBinoculars();
  // In the fight, Q fires the scythe's blue beam (showdown.js).
  if (e.code === 'KeyQ' && arenaActive()) showdownBeam();
  const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].indexOf(e.code);
  // With the crafting list open, numbers craft; otherwise they pick what's in her hands.
  if (digit >= 0 && survival.crafting) craft(digit);
  else if (digit === 0) setTool('bow');
  else if (digit === 1) setTool('axe');
  else if (digit === 2) setTool('katana');
  // Flying uses Space to climb, so there is no dodge in the air.
  if (e.code === 'Space' && !mod.fly) startDodge();
  if (e.code === 'KeyP') setPaused(true);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; aiming = false; cancelDraw(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing') return;
  if (document.pointerLockElement !== canvas) lockPointer();
  if (placingClick(e.button)) return;
  if (cityClick(e.button)) return;
  if (survival.sitting) { standUp(); return; }
  // In the fight her hands are full of her scythe (showdown.js).
  if (arenaActive()) { showdownClick(e.button); return; }
  if (e.button === 0) {
    if (survival.tool === 'axe') startSwing();
    else if (survival.tool === 'katana') startSlash();
    else startDraw();
  }
  if (e.button === 2 && survival.tool === 'bow') aiming = true;
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) releaseArrow();
  if (e.button === 2) aiming = false;
});
// Only a locked mouse turns the camera. A free cursor (say, when the browser refused to
// re-lock right after a pause) reports huge jumps as it leaves and re-enters the window.
// Some browsers also send the odd wild reading under pointer lock, so those are dropped.
const MOUSE_SPIKE = 200;
let skipMouse = 0;
addEventListener('mousemove', (e) => {
  if (game.state !== 'playing' || document.pointerLockElement !== canvas) return;
  if (skipMouse > 0) { skipMouse--; return; }
  if (Math.abs(e.movementX) > MOUSE_SPIKE || Math.abs(e.movementY) > MOUSE_SPIKE) return;
  const sensitivity = 0.0023 * (camera.fov / 58);
  player.yaw -= e.movementX * sensitivity;
  player.pitch = clamp(player.pitch - e.movementY * sensitivity, -0.85, 0.95);
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    pointerWasLocked = true;
    // The first readings after locking can carry the cursor's jump to the centre.
    skipMouse = 2;
  } else if (pointerWasLocked && game.state === 'playing') setPaused(true);
});

// Raw mouse input avoids the jumps some systems add with acceleration; not every browser
// supports it, so fall back to a plain lock.
function lockPointer() {
  const plain = () => { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); };
  try {
    const request = canvas.requestPointerLock({ unadjustedMovement: true });
    if (request && request.catch) request.catch(plain);
  } catch { plain(); }
}

function setPaused(paused) {
  game.state = paused ? 'paused' : 'playing';
  $('pause').classList.toggle('hidden', !paused);
  aiming = false;
  cancelDraw();
  if (paused) { pointerWasLocked = false; document.exitPointerLock(); } else lockPointer();
}

/* ---------- Runs and menus ---------- */
// A fresh run: new crash site, the forest grown back, nothing in her pockets.
function resetRun() {
  subtitles.length = 0;
  subtitleT = 0;
  $('subtitle').classList.remove('on');
  clearWolves();
  clearArrows();
  placeWreck();
  world.resetForest();
  resetSurvival();
  resetSites();
  resetItems();
  resetRabbits();
  resetStory();
  resetMap();
  resetKatana();
  resetCrimson();
  resetBalloon();
  resetShowdown();
  resetBuilds();
  resetDayNight();
  resetCity();
  for (const k in keys) keys[k] = false;
  aiming = false;
  cancelDraw();
  player.dodge = null;
  player.stamina = 100;
  player.pos.set(LANDMARKS.start.x, groundHeight(LANDMARKS.start.x, LANDMARKS.start.z), LANDMARKS.start.z);
  world.stream(player.pos, Infinity);
}

// `fresh` is a new run; otherwise she's waking by a fire after dying, with all she found.
function beginPlay(fresh = true) {
  game.state = 'playing';
  for (const id of ['title', 'pause', 'dead']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  avatar.setVisible(true);
  camera.fov = 58;
  camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  lockPointer();
  updateMusic();
  if (fresh) {
    say('Cold. So cold. I need to find something to make a fire.', 3.8);
    emitGame('runStart');
  }
}

// After dying, she can wake by the last campfire she built, keeping everything she found.
function continueFromFire() {
  const fire = survival.fires[survival.fires.length - 1];
  if (!fire) return;
  clearWolves();
  survival.health = 60;
  survival.warmth = 80;
  player.stamina = 100;
  player.dodge = null;
  for (const k in keys) keys[k] = false;
  player.pos.set(fire.x + 1.6, groundHeight(fire.x + 1.6, fire.z), fire.z);
  world.stream(player.pos, Infinity);
  poseAvatar(1 / 60, new THREE.Vector3(), false);
  avatar.reset();
  beginPlay(false);
  say('I\'m still here. Barely.', 3);
  emitGame('revived');
}
// From the death screen: back to the last save, or (with no save) the last fire she built.
$('dead-continue').addEventListener('click', () => {
  $('boss-fade').classList.remove('on');
  if (readSave()) { loadGame(); toast('Back to your last save'); } else continueFromFire();
});

$('start').addEventListener('click', () => {
  Sfx.init();
  resetRun();
  $('title').classList.add('hidden');
  if (mod.skipIntro) { setWreckBurning(); beginPlay(); return; }
  game.state = 'cutscene';
  lockPointer();
  startCutscene();
});
$('resume').addEventListener('click', () => setPaused(false));

// Back to the title screen, from the pause menu or after freezing. The run is cleared, so
// the title shows her as she was before it began.
function toMainMenu() {
  game.state = 'title';
  if (activeScene) endScene();
  document.body.classList.remove('cinematic');
  for (const id of ['pause', 'dead', 'hud', 'book', 'reader', 'ending']) $(id).classList.add('hidden');
  $('title').classList.remove('hidden');
  $('frost').style.opacity = 0;
  pointerWasLocked = false;
  document.exitPointerLock();
  resetRun();
  avatar.setVisible(true);
  camera.fov = 58;
  camera.updateProjectionMatrix();
  subtitles.length = 0;
  updateMusic();
}
$('pause-menu').addEventListener('click', toMainMenu);
$('dead-menu').addEventListener('click', () => { $('boss-fade').classList.remove('on'); toMainMenu(); });
$('dead-retry').addEventListener('click', () => {
  // Against Teto with nothing saved, this is another go at the fight.
  if (showdown.stage === 'fight') { $('dead').classList.add('hidden'); restartFight(); return; }
  resetRun(); setWreckBurning(); beginPlay();
});

const DEATHS = {
  cold: ['The cold took you', 'Out here, a fire is the difference between morning and never.'],
  wolf: ['The wolves took you', 'They were hungry, and you were alone.'],
  hunger: ['Hunger took you', 'Out here you eat what you can catch, or nothing at all.'],
  thirst: ['Thirst took you', 'Snow everywhere, and none of it melted. A fire and a cup would have done it.'],
  teto: ['Teto took you', 'She\'s still laughing. Get up and make her stop.'],
};

function playerDied(cause) {
  // Losing to Teto plays out her win first, then comes back here (showdown.js).
  if (showdownCatchDeath(cause)) return;
  showDeathScreen(cause);
}

// The death screen: respawn at the last save, or go back to the main menu.
function showDeathScreen(cause) {
  game.state = 'dead';
  pointerWasLocked = false;
  document.exitPointerLock();
  setCrafting(false);
  const [title, text] = DEATHS[cause] || DEATHS.cold;
  $('dead-title').textContent = title;
  $('dead-text').textContent = text;
  const canRespawn = !!readSave() || (showdown.stage !== 'fight' && survival.fires.length > 0);
  $('dead-continue').classList.toggle('hidden', !canRespawn);
  $('dead-retry').textContent = showdown.stage === 'fight' ? 'Fight her again' : 'Start over';
  $('dead-retry').classList.toggle('hidden', canRespawn);
  $('hud').classList.add('hidden');
  $('dead').classList.remove('hidden');
  emitGame('playerDied', cause);
}

/* ---------- Scenes ---------- */
// Scripted moments played out in the world, like the climb up the lookout or the balloon
// lifting off. A scene is { update(dt) }: it runs the camera and whatever else it needs each
// frame, and calls endScene() when it's over. It always plays through: while it does she
// can't be controlled, and the HUD gives way to the letterbox.
let activeScene = null;

function playScene(scene) {
  activeScene = scene;
  scene.hadLock = document.pointerLockElement === canvas;
  // Scenes can follow straight on from one another. If the last one just paused because
  // the mouse came free, this one plays anyway and pauses at its own end.
  if (game.state === 'paused') { $('pause').classList.add('hidden'); scene.hadLock = true; }
  game.state = 'scene';
  katana.swing = null;
  survival.swing = null;
  aiming = false;
  cancelDraw();
  setCrafting(false);
  setPrompt('');
  for (const k in keys) keys[k] = false;
  document.body.classList.add('cinematic');
}

function endScene() {
  if (!activeScene) return;
  const hadLock = activeScene.hadLock;
  activeScene = null;
  document.body.classList.remove('cinematic');
  drawSpeedLines(0, 0);
  caption('');
  $('flash').className = '';
  camera.fov = 58;
  camera.up.set(0, 1, 0);
  camera.updateProjectionMatrix();
  // A scene can hand over to another state itself, such as the ending.
  if (game.state === 'scene') {
    game.state = 'playing';
    // If the mouse came free during the scene, the browser won't lock it again without a
    // click, so pause and let the Resume button do it.
    if (hadLock && document.pointerLockElement !== canvas) setPaused(true);
    else lockPointer();
  }
}

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

/* ---------- Bow ---------- */
// Arrows in flight, and the ones stuck in the snow and the trees. The oldest stuck arrows
// are cleared once there are too many.
const arrows = [];
const MAX_ARROWS = 40;
const viewDir = new THREE.Vector3();
const aimPoint = new THREE.Vector3();
const nockWorld = new THREE.Vector3();
const FORWARD = new THREE.Vector3(0, 0, 1);

// What a point is buried in: 'ground', 'wood' (a trunk, rock or log) or nothing.
function solidAt(x, y, z) {
  const g = groundHeight(x, z);
  if (y < g) return 'ground';
  for (const c of nearbyColliders(x, z)) {
    if (y < g + c.h && Math.hypot(x - c.x, z - c.z) < c.r) return 'wood';
  }
  return null;
}

// The point under the crosshair: the first slope or trunk along the view, or far away.
function findAimPoint(out) {
  camera.updateMatrixWorld();
  camera.getWorldDirection(viewDir);
  const origin = camera.position;
  const start = origin.distanceTo(player.pos) * 0.6;
  let hit = 300;
  for (let t = start; t < 300; t += 0.5) {
    if (solidAt(origin.x + viewDir.x * t, origin.y + viewDir.y * t, origin.z + viewDir.z * t)) { hit = t; break; }
  }
  const nearer = (centre, r) => {
    const t = aimCreatureTmp.subVectors(centre, origin).dot(viewDir);
    if (t > start && t < hit && aimCreatureTmp.addScaledVector(viewDir, -t).length() < r) hit = t;
  };
  for (const hare of rabbits) if (!hare.dead) nearer(rabbitCentre(hare, aimCreatureAt), RABBIT.hit * RABBIT.scale + 0.08);
  for (const wolf of wolves) if (!wolf.dead) nearer(wolf.bodyCentre(aimCreatureAt), WOLF_BODY.r + 0.1);
  return out.copy(origin).addScaledVector(viewDir, hit);
}
const aimCreatureAt = new THREE.Vector3(), aimCreatureTmp = new THREE.Vector3();

function startDraw() {
  if (player.drawing || player.dodge || player.releaseCd > 0) return;
  player.drawing = true;
  player.draw = 0;
  Sfx.bowDraw();
}

function cancelDraw() {
  player.drawing = false;
  player.draw = 0;
}

function releaseArrow() {
  if (!player.drawing) return;
  const power = player.draw;
  cancelDraw();
  if (power < BOW.minDraw || game.state !== 'playing') return;

  findAimPoint(aimPoint);
  avatar.root.updateMatrixWorld(true);
  bowModel.arrow.getWorldPosition(nockWorld);
  const tip = nockWorld.clone().addScaledVector(viewDir, BOW.arrowLength);
  // Aim a little high for the drop, so the arrow comes down where the crosshair is.
  const flight = Math.hypot(aimPoint.x - tip.x, aimPoint.z - tip.z) / lerp(BOW.minSpeed, BOW.maxSpeed, power);
  aimPoint.y += 0.5 * BOW.gravity * flight * flight;
  const dir = aimPoint.clone().sub(tip).normalize();
  // A half-drawn arrow wobbles off line.
  const wobble = (1 - power) * 0.025;
  dir.x += (Math.random() - 0.5) * wobble;
  dir.y += (Math.random() - 0.5) * wobble;
  dir.z += (Math.random() - 0.5) * wobble;
  dir.normalize();

  const mesh = buildArrowMesh();
  scene.add(mesh);
  const arrow = { mesh, tip, vel: dir.multiplyScalar(lerp(BOW.minSpeed, BOW.maxSpeed, power)), power, flying: true, life: 0 };
  arrows.push(arrow);
  placeArrow(arrow);
  player.releaseCd = 0.3;
  player.aimT = 1.2;
  player.recoil = Math.min(player.recoil + 0.02 * power, 0.05);
  Sfx.bowRelease(power);

  // Stuck arrows go first; flying ones only when there are no stuck ones left.
  while (arrows.length > MAX_ARROWS) {
    const old = arrows.find((a) => !a.flying) || arrows[0];
    removeArrow(old);
  }
}

function placeArrow(arrow) {
  viewDir.copy(arrow.vel).normalize();
  arrow.mesh.quaternion.setFromUnitVectors(FORWARD, viewDir);
  arrow.mesh.position.copy(arrow.tip).addScaledVector(viewDir, -BOW.arrowLength);
}

function removeArrow(arrow) {
  scene.remove(arrow.mesh);
  arrows.splice(arrows.indexOf(arrow), 1);
}

function clearArrows() {
  for (const arrow of [...arrows]) removeArrow(arrow);
}

function updateArrows(dt) {
  for (const arrow of [...arrows]) {
    if (!arrow.flying) continue;
    arrow.life += dt;
    // Small steps so a fast arrow can't skip through a thin trunk.
    const steps = Math.ceil((arrow.vel.length() * dt) / 0.25);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      arrow.vel.y -= BOW.gravity * h;
      arrow.tip.addScaledVector(arrow.vel, h);
      // A wolf or a hare that's hit takes the arrow with it.
      if (arrowHitsCreature(arrow)) {
        arrow.flying = false;
        removeArrow(arrow);
        break;
      }
      const hit = solidAt(arrow.tip.x, arrow.tip.y, arrow.tip.z);
      if (hit) {
        // Sink the head in a little and leave the shaft standing.
        arrow.flying = false;
        arrow.tip.addScaledVector(arrow.vel.clone().normalize(), 0.1);
        burst(arrow.tip, hit === 'ground' ? 0xf2f5ff : 0x8a6a4a, 6, 1.8);
        Sfx.arrowHit();
        break;
      }
    }
    placeArrow(arrow);
    if (arrow.flying && (arrow.life > 12 || arrow.tip.y < -200)) removeArrow(arrow);
  }
}

/* ---------- Player ---------- */
function moveInput() {
  const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  return new THREE.Vector3(s * forward - c * strafe, 0, c * forward + s * strafe);
}

// The roll axis follows the direction of travel, so forward, backward, sideways and
// diagonal dodges each tumble their own way.
function startDodge() {
  // Down in the fight, Space scrambles her clear instead (showdown.js).
  if (showdownMash()) return;
  if (survival.sitting) { standUp(); return; }
  if (player.dodge || player.stamina < 25) return;
  player.stamina -= 25;
  cancelDraw();
  const dir = moveInput();
  if (dir.lengthSq() === 0) dir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  dir.normalize();
  player.dodge = { t: 0, dur: 0.62, dir, axis: new THREE.Vector3(dir.z, 0, -dir.x), landed: false };
  burst(new THREE.Vector3(player.pos.x, player.pos.y + 0.05, player.pos.z), 0xf2f5ff, 10, 2);
  Sfx.step();
}

function angleLerp(from, to, amount) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * amount;
}

// Whether she faces the crosshair: always with aim lock, otherwise only while aiming,
// drawing or just after a shot.
function facingAim() {
  return aimLock || aiming || player.drawing || player.aimT > 0 || !!survival.swing || katanaBusy();
}

function turnBody(dt, move, moving) {
  const ease = 1 - Math.exp(-12 * dt);
  if (facingAim()) {
    if (moving || aiming || player.drawing || player.aimT > 0) player.bodyYaw = angleLerp(player.bodyYaw, player.yaw, ease);
  } else if (moving) {
    player.bodyYaw = angleLerp(player.bodyYaw, Math.atan2(move.x, move.z), 1 - Math.exp(-10 * dt));
  }
}

function updatePlayer(dt) {
  player.releaseCd -= dt;
  player.aimT -= dt;
  player.recoil = Math.max(0, player.recoil - dt * 0.4);
  player.shake = Math.max(0, player.shake - dt);
  if (player.drawing) player.draw = mod.instantDraw ? 1 : Math.min(1, player.draw + dt / BOW.drawTime);

  const move = moveInput();
  const moving = move.lengthSq() > 0;
  const ads = (aiming || player.drawing) && !player.dodge;
  const sprinting = (keys.ShiftLeft || keys.ShiftRight) && moving && player.stamina > 1 && !ads && !player.dodge && !mod.fly;
  player.sprinting = sprinting;
  player.runBlend += ((sprinting ? 1 : 0) - player.runBlend) * (1 - Math.exp(-(sprinting ? 7 : 10) * dt));
  player.stamina = mod.infiniteStamina ? 100 : clamp(player.stamina + (sprinting ? -24 : 16) * dt, 0, 100);

  if (mod.fly) {
    flyPlayer(dt, move, moving);
    return;
  }
  // Sitting by a fire until she moves off (survival.js).
  // Knocked down by Teto, she can't move (showdown.js).
  if (showdownHoldsPlayer(dt)) { avatar.simulate(dt); return; }
  if (survival.sitting) {
    if (moving) standUp();
    else { poseSitting(dt); avatar.simulate(dt); return; }
  }

  let step = 0;
  if (player.dodge) {
    const d = player.dodge;
    d.t += dt;
    const u = clamp(d.t / d.dur, 0, 1);
    // Bursts away, then eases into the landing.
    const speed = lerp(13.5, 2.2, smooth(u)) * mod.speed;
    player.pos.addScaledVector(d.dir, speed * dt);
    step = speed * dt * 0.4;
    if (!d.landed && u > 0.72) {
      d.landed = true;
      burst(new THREE.Vector3(player.pos.x, player.pos.y + 0.05, player.pos.z), 0xf2f5ff, 8, 1.6);
      Sfx.thud();
    }
    if (u >= 1) player.dodge = null;
  } else if (moving) {
    // Numb with cold, she slows down; snowshoes carry her faster.
    const speed = (ads ? 2.6 : sprinting ? 6.9 : 4.3) * mod.speed * (survival.warmth < 15 ? 0.8 : 1) * gearSpeed() * showdownSpeed();
    move.normalize();
    player.pos.addScaledVector(move, speed * dt);
    step = speed * dt;
  }
  // In Teto's clearing the trunks and rocks of the real forest don't apply (showdown.js).
  if (!mod.noclip && !arenaActive() && !cityActive()) pushOutOfColliders(player.pos, 0.34);

  const r = Math.hypot(player.pos.x, player.pos.z);
  if (r > WORLD_RADIUS) {
    player.pos.x *= WORLD_RADIUS / r;
    player.pos.z *= WORLD_RADIUS / r;
  }
  player.pos.y = groundHeight(player.pos.x, player.pos.z);
  // The fight keeps her inside Teto's clearing (showdown.js).
  showdownClamp(player.pos);
  // In the city she walks its streets instead (city.js).
  cityClamp(player.pos);

  // Faster movement keeps the same stride length, so the legs speed up with it.
  step /= mod.speed;
  if (!player.dodge) {
    player.stepDist += step;
    if (player.stepDist > 1.1) { player.stepDist = 0; if (cityActive()) cityStep(); else { Sfx.step(); leaveFootprint(); } }
  }
  if (!player.dodge) turnBody(dt, move, moving);

  // Blend between standing and walking so the gait eases in and out.
  const stride = moving && !player.dodge ? (sprinting ? 1 : ads ? 0.42 : 0.68) : 0;
  player.stride += (stride - player.stride) * (1 - Math.exp(-9 * dt));
  player.walkPhase += step * (sprinting ? 1.95 : 2.55) * player.gaitDir;
  poseAvatar(dt, move, moving);
  // In the fight she holds her scythe (showdown.js).
  showdownPosePlayer(dt);
  avatar.simulate(dt);
}

// Sat in the snow by a fire, knees drawn up and hands held out to the warmth. She sinks
// down over a moment, and turns to face the flames.
const sitHand = new THREE.Vector3(), SIT_POLE_L = new THREE.Vector3(0.5, -0.7, -0.1), SIT_POLE_R = new THREE.Vector3(-0.5, -0.7, -0.1);
function poseSitting(dt) {
  const sit = survival.sitting;
  sit.blend = Math.min(1, sit.blend + dt * 2.5);
  const k = smooth(sit.blend);
  player.stride = 0;
  player.runBlend = 0;
  player.bodyYaw = angleLerp(player.bodyYaw, Math.atan2(sit.fire.x - player.pos.x, sit.fire.z - player.pos.z), 1 - Math.exp(-6 * dt));
  poseAvatar(dt, new THREE.Vector3(), false);
  const { root, hips, chest, head, legL, legR, armL, armR } = avatar;
  root.quaternion.setFromAxisAngle(UP, player.bodyYaw);
  root.position.copy(player.pos);
  hips.position.y = lerp(avatar.dims.hips, 0.26, k);
  hips.rotation.set(0, 0, 0);
  chest.rotation.set(0.3 * k + Math.sin(game.time * 1.4) * 0.015, 0, 0);
  head.rotation.set(0.12 * k, 0, 0);
  for (const [leg, side] of [[legL, 1], [legR, -1]]) {
    leg.thigh.rotation.set(-2.0 * k, 0, side * 0.22 * k);
    leg.shin.rotation.set(2.15 * k, 0, 0);
  }
  // Palms out to the fire, rocking a little.
  if (k > 0.3) {
    for (const [arm, side, pole] of [[armL, 1, SIT_POLE_L], [armR, -1, SIT_POLE_R]]) {
      const s = arm.upper.position;
      sitHand.set(s.x * 0.35 + side * 0.04, s.y - 0.2 + Math.sin(game.time * 1.1 + side) * 0.01, 0.38);
      solveArm(arm, sitHand, pole);
      arm.hand.quaternion.identity();
    }
  }
}

// Moderator flight: Space climbs, C descends, Shift goes faster. Trees don't block it,
// and the ground is the only floor.
function flyPlayer(dt, move, moving) {
  const speed = 9 * mod.speed * (keys.ShiftLeft || keys.ShiftRight ? 3 : 1);
  if (moving) player.pos.addScaledVector(move.normalize(), speed * dt);
  player.pos.y += ((keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0)) * speed * dt;
  player.pos.y = Math.max(player.pos.y, groundHeight(player.pos.x, player.pos.z));
  player.dodge = null;
  turnBody(dt, move, moving);
  player.stride += -player.stride * (1 - Math.exp(-9 * dt));
  poseAvatar(dt, move, false);
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
    const walkThigh = (swing * -0.4 - 0.04) * walk;
    const walkKnee = (0.1 + fold * fold * 0.85) * walk;
    const runThigh = (swing * -0.5 - 0.15) * run;
    const runKnee = (0.3 + fold * fold * 1.6) * run;
    leg.thigh.rotation.x = lerp((walkThigh + runThigh) * gaitScale, -1.9, tuck);
    leg.shin.rotation.x = lerp(walkKnee + runKnee + 0.03, 2.2, tuck);
    // Standing, the legs rest slightly apart; in motion the feet track under the body.
    leg.thigh.rotation.z = splay * (0.03 * (1 - amount) - 0.012 * walk - 0.035 * run + Math.abs(localSide) * amount * 0.1);
  };
  gait(legL, ph, 1);
  gait(legR, ph + Math.PI, -1);

  // Shoulders counter the hips, and the head stays level with the run's forward lean. While
  // aiming she turns side-on like an archer, and her head follows the camera's pitch.
  player.lookBlend += ((facingAim() ? 1 : 0) - player.lookBlend) * ease(8);
  const look = player.pitch * player.lookBlend * (1 - run);
  chest.rotation.x = lerp(0.05 * walk + 0.2 * run + breathe * 0.008 - look * 0.1, 0.72, tuck);
  chest.rotation.y = lerp(Math.sin(ph) * (-0.06 * walk - 0.11 * run) - player.aimBlend * 0.45, 0, tuck);
  chest.rotation.z = -player.strafeLean * 0.6;
  chest.position.y = avatar.dims.chest + breathe * 0.002;
  head.rotation.x = lerp(-look * 0.5 - 0.04 * walk - 0.3 * run, 0.45, tuck);
  head.rotation.y = -chest.rotation.y - hips.rotation.y;

  poseBow(dt, ease);
  poseAxe(dt);
  poseKatana(dt);
}

/* ---------- Bow handling ---------- */
const holderPos = new THREE.Vector3();
const holderEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const holderQuat = new THREE.Quaternion();
const holderScale = new THREE.Vector3(1, 1, 1);
const aimQuat = new THREE.Quaternion(), restQuat = new THREE.Quaternion();
const aimAxis = new THREE.Vector3(), anchor = new THREE.Vector3(), toAnchor = new THREE.Vector3(), aimGrip = new THREE.Vector3(), restGrip = new THREE.Vector3(), liftGrip = new THREE.Vector3();
// How far behind the chest the slung bow's grip sits, and how much of the draw-out blend is
// spent lifting it off her back.
const BOW_BACK_Z = -0.105;
const BOW_LIFT = 0.4;
const leftTarget = new THREE.Vector3(), rightTarget = new THREE.Vector3(), restHand = new THREE.Vector3();
const poleR = new THREE.Vector3();
// Elbows point down, back and a little outward, so the arms clear the body. At full draw
// the string elbow lifts out behind her.
const POLE_R = new THREE.Vector3(-0.42, -0.78, -0.42), POLE_L = new THREE.Vector3(0.42, -0.78, -0.42);
const DRAW_POLE_R = new THREE.Vector3(-0.7, 0.1, -0.7);
// How each hand sits on the bow, in the bow's coordinates (+Z forward, +X to her left, +Y
// up). Hands rest with fingers along -Y. Both make an upright fist, thumb on top, fingers
// running forward and curling in to the left: the left round the riser, the right hooked
// round the string.
const GRIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
// Each wrist sits behind its fist, along the forearm.
const LEFT_WRIST = new THREE.Vector3(0.024, 0, -0.07);
const RIGHT_WRIST = new THREE.Vector3(-0.02, -0.01, -0.08);
const handOffset = new THREE.Vector3(), handGoal = new THREE.Quaternion(), leftGoal = new THREE.Quaternion();
const HAND_DOWN = new THREE.Quaternion();
// Where the string comes back to: the right side of her jaw, in the chest's coordinates
// above shoulder height.
const ANCHOR = new THREE.Vector3(-0.065, 0.075, 0.07);

// Where a free hand hangs: out to the side, clear of her hips and skirt, swinging with
// her stride. Running bends the elbow, lifting the hand and widening the swing.
function hangingHand(out, shoulder, reach, side, swing, run) {
  return out.set(
    shoulder.x + side * (0.12 + run * 0.02),
    shoulder.y - reach * (0.93 - run * 0.28),
    0.04 + run * 0.04 + swing * (0.07 + run * 0.12),
  );
}

function poseBow(dt, ease) {
  const m = bowModel;
  const { holder, chest, armL, armR } = avatar;
  const wantAim = survival.tool === 'bow' && (player.aimT > 0 || aiming || player.drawing) && !player.dodge;
  player.aimBlend += ((wantAim ? 1 : 0) - player.aimBlend) * ease(12);
  const blend = smooth(player.aimBlend);
  const run = player.runBlend;
  const shoulderL = armL.upper.position, shoulderR = armR.upper.position;
  const reachL = (armL.a + armL.b) * 0.97, reachR = (armR.a + armR.b) * 0.96;

  // Aimed: the arrow lines up under her chin, with the bow arm stretched out along it.
  holderEuler.set(-player.pitch - player.recoil - chest.rotation.x, -chest.rotation.y, 0.12);
  aimQuat.setFromEuler(holderEuler);
  aimAxis.set(0, 0, 1).applyQuaternion(aimQuat);
  anchor.copy(ANCHOR).setY(shoulderL.y + ANCHOR.y);
  // How far along the arrow line the left hand reaches.
  toAnchor.subVectors(anchor, shoulderL);
  const b = toAnchor.dot(aimAxis);
  const reachAlong = -b + Math.sqrt(Math.max(0, b * b - (toAnchor.lengthSq() - reachL * reachL)));
  aimGrip.copy(anchor).addScaledVector(aimAxis, reachAlong);
  m.drawLength = Math.max(0.3, reachAlong - 0.03);

  // Put away: slung diagonally across her back, top over the right shoulder, bouncing a
  // little with her stride.
  const swing = Math.sin(player.walkPhase) * player.stride;
  restGrip.set(0, shoulderL.y - 0.1 + Math.abs(swing) * (0.006 + run * 0.012), BOW_BACK_Z);
  restQuat.setFromEuler(holderEuler.set(0, 0, 0.6));

  // Taking it out, it comes off the back and up over the left shoulder before swinging
  // round to the front, so it never passes through her.
  const lift = Math.min(1, blend / BOW_LIFT);
  if (blend < BOW_LIFT) {
    holderPos.lerpVectors(restGrip, liftGrip.set(shoulderL.x + 0.06, shoulderL.y + 0.2, -0.04), smooth(lift));
    holderQuat.slerpQuaternions(restQuat, aimQuat, smooth(lift) * 0.5);
  } else {
    const u = smooth((blend - BOW_LIFT) / (1 - BOW_LIFT));
    holderPos.lerpVectors(liftGrip.set(shoulderL.x + 0.06, shoulderL.y + 0.2, -0.04), aimGrip, u);
    holderQuat.slerpQuaternions(restQuat, aimQuat, 0.5 + u * 0.5);
  }
  holder.matrix.compose(holderPos, holderQuat, holderScale);

  // The string only comes back once the bow is up.
  m.setDraw(player.draw * blend, player.drawing);

  // Left hand reaches back for the grip; put away, it hangs and swings with her stride.
  leftTarget.copy(holderPos).add(handOffset.copy(LEFT_WRIST).applyQuaternion(holderQuat));
  hangingHand(restHand, shoulderL, reachL, 1, -swing, run);
  leftTarget.lerpVectors(restHand, leftTarget, smooth(lift));
  leftGoal.copy(holderQuat).multiply(GRIP);
  leftGoal.slerp(HAND_DOWN, 1 - smooth(lift));
  solveArm(armL, leftTarget, POLE_L);
  poseHand(armL, leftGoal, 1);

  // Right hand on the string only while drawing; otherwise it hangs at her side, even with
  // the bow raised, rather than bunching up against the grip.
  player.stringHand = (player.stringHand || 0) + ((player.drawing ? 1 : 0) - (player.stringHand || 0)) * ease(16);
  const onString = smooth(player.stringHand) * blend;
  rightTarget.copy(m.nock).applyMatrix4(holder.matrix).add(handOffset.copy(RIGHT_WRIST).applyQuaternion(holderQuat));
  hangingHand(restHand, shoulderR, reachR, -1, swing, run);
  rightTarget.lerpVectors(restHand, rightTarget, onString);
  handGoal.copy(holderQuat).multiply(GRIP);
  handGoal.slerp(HAND_DOWN, 1 - onString);
  poleR.lerpVectors(POLE_R, DRAW_POLE_R, blend * player.draw);
  solveArm(armR, rightTarget, poleR);
  poseHand(armR, handGoal, 1);
}

function updateCamera(dt) {
  const pitch = player.pitch + player.recoil;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const ease = (rate) => 1 - Math.exp(-rate * dt);
  // Free look sits further back and nearly centred; aim lock and aiming move in over the
  // right shoulder.
  const ads = (aiming || player.drawing) && !player.dodge ? 1 : 0;
  player.adsCam = (player.adsCam || 0) + (ads - (player.adsCam || 0)) * ease(13);
  player.lockCam = (player.lockCam || 0) + ((aimLock || ads ? 1 : 0) - (player.lockCam || 0)) * ease(7);
  const a = player.adsCam, l = player.lockCam;
  const distance = lerp(lerp(3.6, 2.55, l), 1.65, a);
  const shoulder = lerp(lerp(0.18, 0.56, l), 0.42, a);
  const height = lerp(1.5, 1.34, l);
  camera.position.set(
    player.pos.x - s * cp * distance - c * shoulder,
    player.pos.y + height - sp * distance,
    player.pos.z - c * cp * distance + s * shoulder,
  );
  camera.position.y = Math.max(camera.position.y, groundHeight(camera.position.x, camera.position.z) + 0.3);
  if (player.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * player.shake * 0.7;
    camera.position.y += (Math.random() - 0.5) * player.shake * 0.7;
  }
  camera.lookAt(camera.position.x + s * cp, camera.position.y + sp, camera.position.z + c * cp);

  // Right click zooms in further than drawing alone, and binoculars much further.
  const fov = binocularsUp() ? 13 : aiming ? 42 : lerp(58, 50, a);
  camera.fov += (fov - camera.fov) * ease(12);
  camera.updateProjectionMatrix();
  // The fight swings it round for some moves (showdown.js).
  showdownCamera(dt);
}

/* ---------- HUD ---------- */
function updateHud() {
  $('stamina-fill').style.width = `${player.stamina}%`;
  // The crosshair shows wherever she faces it; its ring closes in as the string comes back.
  const showCross = survival.tool === 'bow' && (player.lockCam > 0.5 || player.drawing || aiming);
  $('crosshair').classList.toggle('hidden', !showCross);
  $('draw-ring').classList.toggle('hidden', !showCross || !player.drawing);
  $('draw-ring').style.transform = `translate(-50%, -50%) scale(${lerp(2.6, 1, player.draw)})`;
  $('draw-ring').classList.toggle('full', player.draw >= 1);
  $('look-mode').textContent = aimLock ? 'Aim locked' : 'Free look';
}

/* ---------- Main loop ---------- */
function update(dt) {
  game.time += dt;
  updatePlayer(dt);
  updateCamera(dt);
  updateHud();
  // In the city: its streets, its people, the stage (city.js). The forest is far behind her.
  if (cityActive()) { updateCity(dt); updateDayNight(dt); return; }
  updateArrows(dt);
  // Nothing of the real forest reaches Teto's clearing.
  if (!arenaActive()) updateWolves(dt);
  updateSurvival(dt);
  updateWreck(dt);
  updateSites(dt);
  updateItems(dt);
  if (!arenaActive()) updateRabbits(dt);
  updateStory(dt);
  updateMap(dt);
  updateKatana(dt);
  updateCrimson(dt);
  updateBalloon(dt);
  updateShowdown(dt);
  updateBuild(dt);
  updateDayNight(dt);
}

// Slow drift in front of her on the title screen, so the skin choice shows.
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
  updateWreck(dt);
}

/* ---------- Character room ---------- */
// A moody studio high above the map, for looking over the character up close.
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
const ROOM_POSES = ['Idle', 'Aim', 'Draw', 'Walk', 'Run'];

const roomSet = new THREE.Group();
roomSet.position.y = ROOM_Y;
roomSet.visible = false;
// Backdrop: night-blue overhead fading to a rose glow behind the character, with faint stars.
const roomWall = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime; varying vec3 vDir;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    void main() {
      float h = vDir.y;
      vec3 top = vec3(0.025, 0.03, 0.09);
      vec3 mid = vec3(0.09, 0.07, 0.19);
      vec3 low = vec3(0.32, 0.12, 0.22);
      vec3 c = mix(low, mid, smoothstep(-0.05, 0.35, h));
      c = mix(c, top, smoothstep(0.3, 0.9, h));
      // A soft halo low on the wall, behind wherever the camera looks from.
      float halo = exp(-pow(h - 0.12, 2.0) * 18.0);
      c += vec3(0.45, 0.16, 0.3) * halo * 0.35;
      vec3 cell = floor(vDir * 140.0);
      float star = step(0.996, hash(cell)) * smoothstep(0.15, 0.6, h);
      star *= 0.6 + 0.4 * sin(uTime * 1.7 + hash(cell + 3.0) * 40.0);
      c += vec3(0.9, 0.9, 1.0) * star * 0.8;
      gl_FragColor = vec4(c, 1.0);
    }`,
}));

// Glossy dark floor whose shine falls off away from the stage.
const roomFloorCanvas = document.createElement('canvas');
roomFloorCanvas.width = roomFloorCanvas.height = 256;
{
  const g = roomFloorCanvas.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, '#585a7a');
  grad.addColorStop(0.35, '#2a2b45');
  grad.addColorStop(1, '#0b0c18');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
}
const roomFloorTex = new THREE.CanvasTexture(roomFloorCanvas);
roomFloorTex.colorSpace = THREE.SRGBColorSpace;
const roomFloor = new THREE.Mesh(new THREE.CircleGeometry(9, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roomFloorTex, roughness: 0.32, metalness: 0.35, fog: false }));
roomFloor.position.y = -0.07;
roomFloor.receiveShadow = true;

// Stage: a low stone disc with a glowing inlay at its edge.
const roomStage = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.96, 0.07, 72), new THREE.MeshStandardMaterial({ color: 0x2c2f4c, roughness: 0.45, metalness: 0.25, fog: false }));
roomStage.position.y = -0.035;
roomStage.receiveShadow = true;
const roomRing = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.008, 8, 120).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8fb0).multiplyScalar(2.4), fog: false }));
roomRing.position.y = 0.001;
const roomMark = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.635, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc2cc).multiplyScalar(0.8), transparent: true, opacity: 0.55, fog: false }));
roomMark.position.y = 0.002;

// Studio lights: a warm key and two colored rims so the silhouette reads against the dark.
const roomKey = new THREE.SpotLight(0xffe6d8, 26, 9, 0.55, 0.6, 1.6);
roomKey.position.set(1.6, 3.2, 2.4);
roomKey.target.position.set(0, 0.9, 0);
const roomRimPink = new THREE.PointLight(0xff5c8a, 9, 6, 1.6);
roomRimPink.position.set(-1.5, 1.8, -1.4);
const roomRimBlue = new THREE.PointLight(0x5fb4ff, 7, 6, 1.6);
roomRimBlue.position.set(1.6, 1.2, -1.5);

// Slow glowing motes drifting upward around the stage.
const MOTE_COUNT = 160;
const motePositions = new Float32Array(MOTE_COUNT * 3);
const moteSeeds = [];
for (let i = 0; i < MOTE_COUNT; i++) {
  const r = 1.1 + Math.random() * 3.5, a = Math.random() * Math.PI * 2;
  moteSeeds.push({ r, a, y: Math.random() * 3.2, speed: 0.05 + Math.random() * 0.12, sway: Math.random() * 6 });
}
const moteGeometry = new THREE.BufferGeometry();
moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
const roomMotes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({
  color: new THREE.Color(0xffd6e4).multiplyScalar(1.6), size: 0.025, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
}));

roomSet.add(roomWall, roomFloor, roomStage, roomRing, roomMark, roomKey, roomKey.target, roomRimPink, roomRimBlue, roomMotes);
scene.add(roomSet);

function updateRoomSet(dt) {
  roomWall.material.uniforms.uTime.value = game.time;
  roomRing.material.color.setHex(0xff8fb0).multiplyScalar(2.1 + Math.sin(game.time * 1.4) * 0.4);
  for (let i = 0; i < MOTE_COUNT; i++) {
    const m = moteSeeds[i];
    m.y += m.speed * dt;
    if (m.y > 3.4) m.y = 0;
    m.a += dt * 0.03;
    motePositions[i * 3] = Math.cos(m.a) * m.r + Math.sin(game.time * 0.5 + m.sway) * 0.08;
    motePositions[i * 3 + 1] = m.y;
    motePositions[i * 3 + 2] = Math.sin(m.a) * m.r;
  }
  moteGeometry.attributes.position.needsUpdate = true;
}

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
  renderRoomControls();
}

function openRoom() {
  game.state = 'room';
  document.body.classList.add('in-room');
  $('title').classList.add('hidden');
  $('room').classList.remove('hidden');
  roomSet.visible = true;
  world.setWeather(false);
  Sfx.init();
  updateMusic();
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
  updateMusic();
  avatar.holder.visible = true;
  cancelDraw();
  player.pos.copy(roomReturn);
  player.aimT = 0;
  player.stride = 0;
  player.runBlend = 0;
  camera.near = 0.1;
  camera.fov = 58;
  camera.updateProjectionMatrix();
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
  avatar.holder.visible = $('room-bow').checked;
  player.pos.set(0, ROOM_Y, 0);
  player.bodyYaw = 0;
  player.pitch = 0;

  const running = roomPose === 'Run';
  const walking = roomPose === 'Walk' || running;
  roomMove.set(0, 0, walking ? 1 : 0);
  player.stride += (((running ? 1 : walking ? 0.68 : 0)) - player.stride) * (1 - Math.exp(-9 * dt));
  player.runBlend += ((running ? 1 : 0) - player.runBlend) * (1 - Math.exp(-(running ? 7 : 10) * dt));
  if (walking) player.walkPhase += dt * (running ? 6.9 * 1.95 : 4.3 * 2.55);
  player.aimT = roomPose === 'Aim' || roomPose === 'Draw' ? 1 : 0;
  player.drawing = roomPose === 'Draw';
  player.draw = player.drawing ? 1 : 0;
  poseAvatar(dt, roomMove, walking);
  avatar.simulate(dt);
  updateRoomSet(dt);

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
initSurvival();
placeWreck();
initSites();
initItems();
initRabbits();
initStory();
initMap();
initKatana();
initCrimson();
initBalloon();
initShowdown();
renderLoadout();
pipeline.compile();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
  last = now;

  if (game.state === 'title') updateTitle(dt);
  if (game.state === 'playing') update(dt * mod.timeScale);
  if (game.state === 'room') updateRoom(dt);
  if (game.state === 'cutscene') updateCutscene(dt);
  if (game.state === 'scene' && activeScene) activeScene.update(dt);
  if (game.state === 'playing' || game.state === 'title') world.stream(player.pos);
  if (game.state === 'playing' || game.state === 'title' || game.state === 'room' || game.state === 'cutscene' || game.state === 'scene') {
    updateSparks(dt);
    // Her thoughts wait while a scene hides the subtitles.
    if (game.state !== 'scene') updateSubtitles(dt);
    world.update(dt, game.time, camera.position, player.pos);
  }
  // The blade's roar and the tethered burner are only kept going by play.
  if (game.state !== 'playing' && katana.roarLevel) katanaSilence();
  if (['paused', 'book', 'reader', 'dead'].includes(game.state) && balloonRoar && balloon.burn > 0.01) { balloonRoar.set(0, 0.2); balloon.burn = 0; }
  // Nothing moves behind the field book or a note, so one frame of it will do.
  const still = game.state === 'book' || game.state === 'reader';
  // The snow settling over Miku is shown as stills (showdown.js).
  if (showdownFrozen()) return;
  if (!still || !frozenDrawn) pipeline.render(dt, game.time);
  frozenDrawn = still;
}
let frozenDrawn = false;
addEventListener('resize', () => { frozenDrawn = false; });
requestAnimationFrame(frame);

// Exposed for debugging from the browser console.
window.hollowSnow = { game, player, world, keys, arrows, survival, wolves, rabbits, pack, SITES, katana, crimson, balloon, showdown, fight, stats, setSkin, startDodge, startDraw, releaseArrow, startSwing, finishCutscene, teleport: (x, z) => teleport({ x, z }) };
