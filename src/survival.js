// Survival: the axe in the stump, chopping trees into planks, crafting a campfire, and the
// cold that sets in away from a fire. Everything here is built in code.

/* ---------- State ---------- */
const SURVIVAL = {
  warmthDrain: 100 / 210, // per second away from a fire: about three and a half minutes
  freezeDamage: 100 / 45, // health lost per second once fully cold
  fireRadius: 5.5,
  campfireCost: 5,
  axeSwing: 0.62, // seconds per swing
  axeReach: 1.3,
  restHeal: 7, // health per second sitting by a fire
  restRadius: 3.2, // how close to a fire she has to be to sit by it
  combatCalm: 8, // seconds after a fight (a blow either way) before she can sit
  wolfNear: 12, // a wolf this close is too close to sit down
  hareNear: 20, // a hare bolting this close means she's mid-hunt
};
const STUMP_SPOT = { x: LANDMARKS.start.x + 2.0, z: LANDMARKS.start.z - 4.4 };
LANDMARK_COLLIDERS.push({ x: STUMP_SPOT.x, z: STUMP_SPOT.z, r: 0.5, h: 0.6 });

const survival = {
  health: 100,
  warmth: 100,
  planks: 0,
  hasAxe: false,
  tool: 'bow', // what's in her hands: 'bow' or 'axe'
  swing: null, // { t, hit } while the axe is mid-swing
  crafting: false,
  fallen: [], // trees on their way down, and logs on the ground
  fires: [],
  stump: null,
  hintT: 0,
  sitting: null, // { fire, blend } while she sits by a fire
  combatAt: -Infinity, // game time of the last blow, given or taken
};

/* ---------- Things to use ---------- */
// Anything she can use with E: the axe in the stump, something lying in the snow, a ladder.
// Each is { x, z, r, label, use, active }, where label and active may be functions. Of
// those in reach, the nearest gets the prompt.
const INTERACTABLES = [];

function addInteractable(entry) {
  INTERACTABLES.push(entry);
  return entry;
}

function removeInteractable(entry) {
  const i = INTERACTABLES.indexOf(entry);
  if (i >= 0) INTERACTABLES.splice(i, 1);
}

function nearestInteractable() {
  let best = null, bestD = Infinity;
  for (const entry of INTERACTABLES) {
    const d = Math.hypot(entry.x - player.pos.x, entry.z - player.pos.z);
    if (d > (entry.r || 2.4) || d >= bestD) continue;
    if (entry.active && !entry.active()) continue;
    best = entry;
    bestD = d;
  }
  return best;
}

// Warmth from anything besides a campfire, such as a burning blade: functions that each
// return warmth gained per second.
const HEAT_SOURCES = [];

function extraHeat() {
  let heat = 0;
  for (const source of HEAT_SOURCES) heat += source();
  return heat;
}

/* ---------- Models ---------- */
function woodRingsTexture() {
  return paintCanvas(128, 128, (g, w, h) => {
    g.fillStyle = '#b48a5e';
    g.fillRect(0, 0, w, h);
    for (let r = 4; r < 64; r += 3 + Math.random() * 3) {
      g.strokeStyle = `rgba(90,58,32,${0.25 + Math.random() * 0.3})`;
      g.lineWidth = 1 + Math.random();
      g.beginPath();
      g.ellipse(64 + Math.random(), 64 + Math.random(), r, r * 0.96, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = 'rgba(60,36,20,0.6)';
    g.beginPath();
    g.moveTo(64, 64);
    g.lineTo(110, 30);
    g.stroke();
  });
}

function paintCanvas(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let survivalMats = null;
function getSurvivalMats() {
  if (survivalMats) return survivalMats;
  survivalMats = {
    bark: new THREE.MeshStandardMaterial({ map: TEX.bark.color, normalMap: TEX.bark.normal, roughness: 0.95 }),
    rings: new THREE.MeshStandardMaterial({ map: woodRingsTexture(), roughness: 0.85 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.7 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x2a2120, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.9, roughness: 0.35 }),
    edge: new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 1, roughness: 0.18 }),
    stone: new THREE.MeshStandardMaterial({ map: TEX.stone.color, normalMap: TEX.stone.normal, roughness: 0.9 }),
    char: new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: 1, emissive: 0x401204, emissiveIntensity: 0.6 }),
  };
  return survivalMats;
}

// A hatchet: the handle runs along +Z from the grip at the origin, the head sits at the top
// end and the blade faces -Y.
function buildAxeModel() {
  const m = getSurvivalMats();
  const axe = new THREE.Group();
  const part = (geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    axe.add(mesh);
    return mesh;
  };
  part(new THREE.CylinderGeometry(0.014, 0.016, 0.5, 8).rotateX(Math.PI / 2), m.handle, 0, 0, 0.17);
  part(new THREE.CylinderGeometry(0.017, 0.017, 0.11, 8).rotateX(Math.PI / 2), m.grip, 0, 0, -0.02);
  part(new THREE.BoxGeometry(0.026, 0.05, 0.06), m.steel, 0, 0.005, 0.39);
  // The blade flares out from the head to a curved edge.
  const blade = new THREE.Shape();
  blade.moveTo(-0.028, 0);
  blade.lineTo(0.028, 0);
  blade.quadraticCurveTo(0.06, -0.06, 0.055, -0.11);
  blade.quadraticCurveTo(0, -0.125, -0.055, -0.11);
  blade.quadraticCurveTo(-0.06, -0.06, -0.028, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.008, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.004, -0.015, 0.39);
  part(bladeGeo, m.steel, 0, 0, 0);
  part(new THREE.BoxGeometry(0.01, 0.012, 0.1), m.edge, 0, -0.128, 0.39);
  return axe;
}

// The stump the axe is buried in, with a faint glint that catches the eye now and then.
function buildStump() {
  const m = getSurvivalMats();
  const group = new THREE.Group();
  const y = groundHeight(STUMP_SPOT.x, STUMP_SPOT.z);
  group.position.set(STUMP_SPOT.x, y, STUMP_SPOT.z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.55, 14), [m.bark, m.rings, m.bark]);
  trunk.position.y = 0.2;
  trunk.castShadow = trunk.receiveShadow = true;
  group.add(trunk);
  for (let i = 0; i < 5; i++) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), m.bark);
    const a = i * 1.3 + 0.4;
    root.position.set(Math.cos(a) * 0.45, 0.02, Math.sin(a) * 0.45);
    root.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
    group.add(root);
  }
  // A cap of snow, except where the axe went in.
  const snow = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.04, 14), new THREE.MeshStandardMaterial({ color: 0xf2f5ff, roughness: 1 }));
  snow.position.set(-0.08, 0.49, 0.04);
  snow.scale.set(0.7, 1, 0.8);
  group.add(snow);
  // The axe is buried blade-first in the top, its handle angled up and out.
  const pivot = new THREE.Group();
  pivot.position.y = 0.45;
  pivot.rotation.y = 0.7;
  group.add(pivot);
  const axe = buildAxeModel();
  axe.position.set(0, 0.2, -0.31);
  axe.rotation.x = 0.5;
  pivot.add(axe);
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xfff6dd, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glint.scale.setScalar(0.2);
  glint.position.set(0, 0.08, 0.02);
  pivot.add(glint);
  scene.add(group);
  return { group, axe, glint, y };
}

/* ---------- Campfires ---------- */
// A few point lights made up front, so lighting a fire never changes the light count
// (which would make every material recompile).
const FIRE_LIGHTS = [];
function makeFireLights() {
  for (let i = 0; i < 3; i++) {
    const light = new THREE.PointLight(0xff8a48, 0, 16, 1.6);
    light.userData.free = true;
    scene.add(light);
    FIRE_LIGHTS.push(light);
  }
}

function buildFlames() {
  const count = 40;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.42, map: TEX.softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false;
  const seeds = Array.from({ length: count }, () => ({ t: Math.random(), x: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.4, s: 0.9 + Math.random() * 0.9 }));
  points.tick = (dt) => {
    seeds.forEach((p, i) => {
      p.t = (p.t + dt * p.s) % 1;
      const narrow = 1 - p.t * 0.85;
      positions.set([p.x * narrow + Math.sin(p.t * 9 + i) * 0.03, 0.12 + p.t * 0.85, p.z * narrow], i * 3);
      const heat = 1 - p.t;
      colors.set([2.6 * heat, 1.0 * heat * heat, 0.2 * heat * heat * heat], i * 3);
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
  return points;
}

function buildCampfire(x, z) {
  const m = getSurvivalMats();
  const group = new THREE.Group();
  group.position.set(x, groundHeight(x, z), z);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + Math.random() * 0.04, 0), m.stone);
    stone.position.set(Math.cos(a) * 0.42, 0.05, Math.sin(a) * 0.42);
    stone.rotation.set(Math.random(), Math.random(), Math.random());
    stone.castShadow = true;
    group.add(stone);
  }
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.62, 7), i % 2 ? m.char : m.bark);
    log.rotation.set(Math.PI / 2 - 0.5, (i / 4) * Math.PI * 2, 0, 'YXZ');
    log.position.y = 0.16;
    log.translateY(0.12);
    log.castShadow = true;
    group.add(log);
  }
  const flames = buildFlames();
  group.add(flames);
  scene.add(group);
  const light = FIRE_LIGHTS.find((l) => l.userData.free);
  if (light) { light.userData.free = false; light.position.set(x, group.position.y + 0.8, z); }
  const fire = { group, flames, light, x, z, crackle: 0 };
  survival.fires.push(fire);
  burst(new THREE.Vector3(x, group.position.y + 0.3, z), 0xffa860, 24, 3);
  Sfx.ignite();
  emitGame('campfire', fire);
  return fire;
}

/* ---------- Chopping ---------- */
const CHIP = 0xb48a5e;

// A cut tree, from the moment it starts to fall until it's been split into planks.
function fellTree(tree) {
  const parts = world.fellTree(tree);
  const p = tree.placement;
  const group = new THREE.Group();
  group.position.set(p.x, p.y, p.z);
  for (const mesh of [parts.bark, parts.leaves]) {
    if (!mesh) continue;
    mesh.rotation.set(p.rx, p.ry, p.rz);
    mesh.scale.set(p.sx, p.sy, p.sz);
    mesh.castShadow = true;
    group.add(mesh);
  }
  scene.add(group);
  // It falls away from her.
  const dir = new THREE.Vector3(p.x - player.pos.x, 0, p.z - player.pos.z);
  if (dir.lengthSq() < 1e-4) dir.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  dir.normalize();
  const axis = new THREE.Vector3(dir.z, 0, -dir.x);
  // Find where the trunk meets the ground, so it lands on the slope rather than in it.
  let land = Math.PI / 2;
  for (let a = 0.2; a < Math.PI / 2 + 0.25; a += 0.02) {
    const along = tree.height * 0.45;
    const x = p.x + dir.x * Math.sin(a) * along, z = p.z + dir.z * Math.sin(a) * along;
    if (p.y + Math.cos(a) * along < groundHeight(x, z) + tree.r * 0.8) { land = a; break; }
  }
  const planks = Math.max(2, Math.round(tree.height / 3));
  survival.fallen.push({ tree, group, leaves: parts.leaves, dir, axis, angle: 0.02, speed: 0, land, landed: false, bounce: 0, planks, length: tree.height * 0.8 });
  Sfx.treeCreak();
  emitGame('treeFelled', tree);
}

function updateFallen(dt) {
  const q = new THREE.Quaternion();
  for (const log of survival.fallen) {
    if (log.landed && log.bounce <= 0) continue;
    if (!log.landed) {
      // Topples slowly at first, like a real tree, then faster as it goes over.
      log.speed += (0.6 + Math.sin(log.angle) * 3.2) * dt;
      log.angle += log.speed * dt;
      if (log.angle >= log.land) {
        log.angle = log.land;
        log.landed = true;
        log.bounce = 0.5;
        Sfx.treeCrash();
        const d = Math.hypot(log.tree.placement.x - player.pos.x, log.tree.placement.z - player.pos.z);
        player.shake = Math.max(player.shake, 0.35 * Math.max(0, 1 - d / 25));
        for (let i = 1; i <= 6; i++) {
          const along = (i / 6) * log.length;
          const x = log.tree.placement.x + log.dir.x * along, z = log.tree.placement.z + log.dir.z * along;
          burst(new THREE.Vector3(x, groundHeight(x, z) + 0.3, z), 0xf2f5ff, 14, 3.4);
        }
      }
    } else {
      log.bounce -= dt;
    }
    const wobble = log.landed ? Math.sin((0.5 - log.bounce) * 16) * 0.035 * log.bounce : 0;
    log.group.quaternion.copy(q.setFromAxisAngle(log.axis, log.angle - wobble));
  }
}

// The fallen log nearest her reach, measured to the line of its trunk.
function logInReach(x, z) {
  let best = null, bestD = SURVIVAL.axeReach + 0.6;
  for (const log of survival.fallen) {
    if (!log.landed) continue;
    const bx = log.tree.placement.x, bz = log.tree.placement.z;
    const t = clamp((x - bx) * log.dir.x + (z - bz) * log.dir.z, 0, log.length);
    const d = Math.hypot(x - (bx + log.dir.x * t), z - (bz + log.dir.z * t));
    if (d < bestD) { best = log; bestD = d; }
  }
  return best;
}

function startSwing() {
  if (survival.swing || player.dodge || survival.tool !== 'axe') return;
  survival.swing = { t: 0, hit: false };
  player.aimT = 0.8;
  Sfx.axeSwing();
}

// The moment the blade lands: a log gives planks, a standing tree takes another bite.
function axeImpact() {
  const reachX = player.pos.x + Math.sin(player.bodyYaw) * 0.7, reachZ = player.pos.z + Math.cos(player.bodyYaw) * 0.7;
  // A wolf or a hare in reach takes the blow.
  if (meleeHit(reachX, reachZ, 1.3, 'axe')) { Sfx.chop(); return; }
  const log = logInReach(reachX, reachZ);
  if (log) {
    if (log.leaves) { log.group.remove(log.leaves); log.leaves = null; }
    log.planks--;
    survival.planks++;
    Sfx.chop();
    Sfx.planks();
    toast('+1 plank');
    burst(new THREE.Vector3(reachX, player.pos.y + 0.5, reachZ), CHIP, 12, 2.6);
    if (log.planks <= 0) {
      scene.remove(log.group);
      survival.fallen.splice(survival.fallen.indexOf(log), 1);
      for (let i = 0; i < 5; i++) {
        const along = (i / 4) * log.length;
        burst(new THREE.Vector3(log.tree.placement.x + log.dir.x * along, player.pos.y + 0.4, log.tree.placement.z + log.dir.z * along), CHIP, 10, 2.4);
      }
    }
    return;
  }
  const tree = world.findTree(reachX, reachZ, SURVIVAL.axeReach);
  if (!tree) return;
  tree.hits = (tree.hits || 0) + 1;
  const needed = Math.max(2, Math.round(tree.r * 10));
  Sfx.chop();
  player.shake = Math.max(player.shake, 0.08);
  const toward = Math.atan2(player.pos.x - tree.placement.x, player.pos.z - tree.placement.z);
  burst(new THREE.Vector3(tree.placement.x + Math.sin(toward) * tree.r, tree.placement.y + 0.9, tree.placement.z + Math.cos(toward) * tree.r), CHIP, 10, 2.8);
  if (tree.hits >= needed) fellTree(tree);
}

/* ---------- Holding the axe ---------- */
const axeHeld = { model: null };
const swingQ = new THREE.Quaternion(), swingTilt = new THREE.Quaternion(), swingTarget = new THREE.Vector3();
const X_AXIS = new THREE.Vector3(1, 0, 0);
// The swing in chest space: [time 0-1, hand position offset from the shoulder, tilt of the
// head back (-) or forward (+)].
const SWING_KEYS = [
  [0, new THREE.Vector3(-0.06, -0.28, 0.13), 0.9],
  [0.34, new THREE.Vector3(-0.1, 0.17, -0.03), -1.25],
  [0.52, new THREE.Vector3(-0.03, -0.1, 0.33), 1.35],
  [1, new THREE.Vector3(-0.06, -0.28, 0.13), 0.9],
];

// Puts the axe in her right hand and swings it. Runs after the bow pose, which leaves the
// bow on her back whenever the axe is out.
function poseAxe(dt) {
  if (!axeHeld.model) {
    axeHeld.model = buildAxeModel();
    // Seated in the fist: across the palm, head above the thumb.
    axeHeld.model.position.set(0.012, -0.045, 0.0);
  }
  const hand = avatar.armR.hand;
  const out = survival.tool === 'axe' && survival.hasAxe;
  if (axeHeld.model.parent !== hand) hand.add(axeHeld.model);
  axeHeld.model.visible = out;
  if (!out) return;

  const { armR } = avatar;
  const shoulder = armR.upper.position;
  let u = 0;
  if (survival.swing) {
    survival.swing.t += dt / SURVIVAL.axeSwing;
    u = Math.min(1, survival.swing.t);
    if (!survival.swing.hit && u >= 0.5) { survival.swing.hit = true; axeImpact(); }
    if (survival.swing.t >= 1) survival.swing = null;
  }
  let a = SWING_KEYS[0], b = SWING_KEYS[1];
  for (let i = 1; i < SWING_KEYS.length; i++) { if (u <= SWING_KEYS[i][0]) { a = SWING_KEYS[i - 1]; b = SWING_KEYS[i]; break; } }
  const t = smooth((u - a[0]) / (b[0] - a[0] || 1));
  swingTarget.lerpVectors(a[1], b[1], t).add(shoulder);
  // When not swinging, it rides low at her side and swings with her stride.
  if (!survival.swing) swingTarget.z += Math.sin(player.walkPhase) * player.stride * (0.06 + player.runBlend * 0.1);
  const tilt = lerp(a[2], b[2], t);
  swingQ.copy(swingTilt.setFromAxisAngle(X_AXIS, tilt)).multiply(GRIP);
  swingTarget.add(handOffset.copy(RIGHT_WRIST).applyQuaternion(swingQ));
  solveArm(armR, swingTarget, POLE_R);
  poseHand(armR, swingQ, 1);
}

/* ---------- Crafting ---------- */
// Each recipe's cost lists planks and any items from her pack, by item id. `make` builds
// it; `shown`, if given, hides the recipe until it returns true.
const RECIPES = [
  {
    id: 'campfire', name: 'Campfire', cost: { planks: SURVIVAL.campfireCost }, note: 'Warmth and light',
    make() {
      const x = player.pos.x + Math.sin(player.bodyYaw) * 1.8, z = player.pos.z + Math.cos(player.bodyYaw) * 1.8;
      buildCampfire(x, z);
      toast('Campfire built');
    },
  },
];

function have(id) {
  return id === 'planks' ? survival.planks : packCount(id);
}

function canCraft(recipe) {
  return Object.entries(recipe.cost).every(([id, n]) => have(id) >= n);
}

function costText(cost) {
  return Object.entries(cost).map(([id, n]) => `${n} ${id === 'planks' ? (n === 1 ? 'plank' : 'planks') : itemName(id, n)}`).join(', ');
}

function shownRecipes() {
  return RECIPES.filter((r) => !r.shown || r.shown());
}

function craft(index) {
  const recipe = shownRecipes()[index];
  if (!recipe) return;
  if (!canCraft(recipe)) { toast(`Need ${costText(recipe.cost)}`); return; }
  for (const [id, n] of Object.entries(recipe.cost)) {
    if (id === 'planks') survival.planks -= n;
    else packTake(id, n);
  }
  recipe.make();
  Sfx.craft();
  setCrafting(false);
}

function setCrafting(open) {
  survival.crafting = open;
  renderCrafting();
}

function renderCrafting() {
  $('craft').classList.toggle('hidden', !survival.crafting);
  if (!survival.crafting) return;
  $('craft-list').innerHTML = shownRecipes().map((r, i) => `<li class="${canCraft(r) ? 'ready' : ''}"><kbd>${i + 1}</kbd><b>${r.name}</b><span>${costText(r.cost)} · ${r.note}</span></li>`).join('');
}

/* ---------- HUD bits ---------- */
let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1600);
}

function updateSurvivalHud(warming) {
  $('hp-fill').style.width = `${survival.health}%`;
  $('warmth-fill').style.width = `${survival.warmth}%`;
  $('warmth').classList.toggle('warming', warming);
  $('planks').textContent = survival.planks;
  $('slot-axe').classList.toggle('hidden', !survival.hasAxe);
  $('slot-katana').classList.toggle('hidden', !katana.owned);
  $('slot-bow').classList.toggle('active', survival.tool === 'bow');
  $('slot-axe').classList.toggle('active', survival.tool === 'axe');
  $('slot-katana').classList.toggle('active', survival.tool === 'katana');
  // Frost creeps in from the edges as she gets cold.
  $('frost').style.opacity = smooth((45 - survival.warmth) / 45) * 0.9;
  if (survival.crafting) renderCrafting();
}

/* ---------- Resting by a fire ---------- */
// Whether she's in a fight: struck or striking in the last few seconds, a wolf charging or
// close by, or a hare she's after still bolting nearby. 'wolf', 'hare' or null.
function combatReason() {
  if (game.time - survival.combatAt < SURVIVAL.combatCalm) return survival.combatWith || 'wolf';
  for (const wolf of wolves) {
    if (wolf.dead) continue;
    if (wolf.state === 'attack' || Math.hypot(wolf.pos.x - player.pos.x, wolf.pos.z - player.pos.z) < SURVIVAL.wolfNear) return 'wolf';
  }
  for (const hare of rabbits) {
    if (!hare.dead && hare.state === 'flee' && Math.hypot(hare.pos.x - player.pos.x, hare.pos.z - player.pos.z) < SURVIVAL.hareNear) return 'hare';
  }
  return null;
}

// A blow given or taken: no sitting down for a while.
function markCombat(withWhat) {
  survival.combatAt = game.time;
  survival.combatWith = withWhat;
  if (survival.sitting) standUp();
}

function restingFire() {
  let best = null, bestD = SURVIVAL.restRadius;
  for (const fire of survival.fires) {
    const d = Math.hypot(fire.x - player.pos.x, fire.z - player.pos.z);
    if (d < bestD) { best = fire; bestD = d; }
  }
  return best;
}

const COMBAT_NOTES = { wolf: 'Not with wolves this close. I\'d never get up again.', hare: 'Not now. I\'m in the middle of a hunt.' };

function toggleSit() {
  if (survival.sitting) { standUp(); return; }
  const fire = restingFire();
  if (!fire || mod.fly || player.dodge || arenaActive()) return;
  const reason = combatReason();
  if (reason) { showNote(COMBAT_NOTES[reason]); return; }
  survival.sitting = { fire, blend: 0 };
  survival.swing = null;
  cancelDraw();
  Sfx.thud();
  // Every rest by a fire saves the game, and the first after Teto's ambush brings the fairies.
  if (!showdownSat(fire)) saveGame();
}

function standUp() {
  survival.sitting = null;
}

/* ---------- Each frame ---------- */
function nearestFire() {
  let best = Infinity;
  for (const fire of survival.fires) best = Math.min(best, Math.hypot(fire.x - player.pos.x, fire.z - player.pos.z));
  return best;
}

// Flames, firelight and crackle. Scenes run this too, so fires keep burning through them.
function updateFires(dt) {
  for (const fire of survival.fires) {
    fire.flames.tick(dt);
    if (fire.light) fire.light.intensity = 9 + Math.sin(game.time * 13 + fire.x) * 1.5 + Math.sin(game.time * 29) * 1;
    const d = Math.hypot(fire.x - player.pos.x, fire.z - player.pos.z);
    fire.crackle -= dt;
    if (fire.crackle <= 0 && d < 14) { fire.crackle = 0.08 + Math.random() * 0.4; Sfx.crackle(1 - d / 14); }
  }
}

function updateSurvival(dt) {
  updateFallen(dt);
  updateFires(dt);

  // Warmth comes from fires and drains away from them, more slowly in warm clothes; once
  // it's gone, the cold hurts.
  const nearFire = nearestFire() < SURVIVAL.fireRadius;
  const heat = (nearFire ? 14 : 0) + extraHeat();
  if (heat > 0) {
    survival.warmth = Math.min(100, survival.warmth + heat * dt);
    if (nearFire) survival.health = Math.min(100, survival.health + 2 * dt);
  } else if (!mod.noCold) {
    survival.warmth = Math.max(0, survival.warmth - SURVIVAL.warmthDrain * gearCold() * dt);
  }
  if (survival.warmth <= 0 && !mod.noCold) {
    survival.health -= SURVIVAL.freezeDamage * dt;
    if (survival.health <= 0) { survival.health = 0; playerDied('cold'); }
  } else if (survival.warmth > 30) {
    survival.health = Math.min(100, survival.health + 0.6 * dt);
  }
  // Shivering shakes the view a little when she's very cold.
  if (survival.warmth < 20) player.shake = Math.max(player.shake, 0.012 * (1 - survival.warmth / 20));
  // Sitting by the fire heals her quickly, until trouble comes along.
  if (survival.sitting) {
    const reason = combatReason();
    if (reason || !survival.fires.includes(survival.sitting.fire)) {
      standUp();
      if (reason) showNote(COMBAT_NOTES[reason]);
    } else {
      survival.health = Math.min(100, survival.health + SURVIVAL.restHeal * dt);
    }
  }
  $('hp-fill').parentElement.classList.toggle('healing', !!survival.sitting && survival.health < 100);

  const stump = survival.stump;
  // The axe's glint: a soft twinkle every few seconds until it's taken.
  if (stump && !survival.hasAxe) {
    const cycle = (game.time % 3.2) / 3.2;
    const flash = Math.max(0, Math.sin(cycle * Math.PI * 2 - 1.2)) ** 6;
    stump.glint.material.opacity = 0.15 + flash * 0.75;
    stump.glint.scale.setScalar(0.14 + flash * 0.26);
    const d = Math.hypot(STUMP_SPOT.x - player.pos.x, STUMP_SPOT.z - player.pos.z);
    if (d >= 2.4) {
      survival.hintT += dt;
      if (survival.hintT > 8 && survival.hintT < 8 + dt && d < 30) say('Something is wedged in that stump.', 3);
    }
  }

  // What's close enough to use with E. E only acts once per press.
  const pressed = keys.KeyE && !survival.eHeld;
  survival.eHeld = !!keys.KeyE;
  const offer = arenaActive() ? null : nearestInteractable();
  let prompt = offer ? (typeof offer.label === 'function' ? offer.label() : offer.label) : '';
  if (survival.sitting) prompt = 'Resting by the fire · C to stand';
  else if (!prompt && restingFire()) prompt = 'Press C to sit by the fire';
  setPrompt(prompt);
  if (offer && pressed) offer.use();
  updateSurvivalHud(heat > 0);
}

// A short line of her thoughts in a small box at the bottom of the screen.
let noteTimer = 0;
function showNote(text) {
  const el = $('note');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => el.classList.remove('on'), 4200);
}

// Damage from anything but the cold, with a red flash and a jolt.
function hurtPlayer(amount, cause) {
  if (game.state !== 'playing') return;
  markCombat(cause === 'wolf' ? 'wolf' : survival.combatWith);
  survival.health = Math.max(0, survival.health - amount);
  player.shake = Math.max(player.shake, 0.3);
  Sfx.bite();
  const flash = $('hurt');
  flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 60);
  if (survival.health <= 0) playerDied(cause);
}

function takeAxe() {
  survival.hasAxe = true;
  survival.tool = 'axe';
  survival.stump.axe.visible = false;
  survival.stump.glint.visible = false;
  Sfx.pickup();
  toast('Axe — 2 to hold it, 1 for the bow');
  say('This will do.', 2.4);
  emitGame('axe');
}

function setTool(tool) {
  if (tool === 'axe' && !survival.hasAxe) return;
  if (tool === 'katana' && !katana.owned) return;
  if (survival.tool === tool) return;
  survival.tool = tool;
  survival.swing = null;
  cancelDraw();
  Sfx.swap();
}

function setPrompt(text) {
  const el = $('prompt');
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle('hidden', !text);
}

/* ---------- A new run ---------- */
function resetSurvival() {
  Object.assign(survival, { health: 100, warmth: 100, planks: 0, hasAxe: false, tool: 'bow', swing: null, crafting: false, hintT: 0, sitting: null, combatAt: -Infinity, combatWith: null });
  for (const log of survival.fallen) scene.remove(log.group);
  survival.fallen.length = 0;
  for (const fire of survival.fires) {
    scene.remove(fire.group);
    if (fire.light) { fire.light.intensity = 0; fire.light.userData.free = true; }
  }
  survival.fires.length = 0;
  if (survival.stump) {
    survival.stump.axe.visible = true;
    survival.stump.glint.visible = true;
  } else {
    survival.stump = buildStump();
  }
  renderCrafting();
}

function initSurvival() {
  makeFireLights();
  resetSurvival();
  addInteractable({ x: STUMP_SPOT.x, z: STUMP_SPOT.z, r: 2.4, label: 'Press E to pull the axe from the stump', active: () => !survival.hasAxe, use: takeAxe });
}
