// The ten places Dr. Varga left her caches, and the Breath at the crater's heart: where they
// stand, how she finds them, the beacons that show across the crater, the climb up the old
// ranger lookout, and the smaller things left lying in the forest between them (a hunter's
// stand, a sled, crates, signposts, the shards of star-iron).

/* ---------- The sites ---------- */
const SITES = [
  { id: 'lookout', x: 150, z: 600, radius: 30, clear: 18, flat: [14, 30], part: 'rope', major: true },
  { id: 'trapper', x: -260, z: 300, radius: 30, clear: 20, flat: [16, 32], part: 'basket', major: true },
  { id: 'station', x: -560, z: 420, radius: 34, clear: 24, flat: [20, 38], part: 'envelope', major: true },
  { id: 'lake', x: 430, z: 330, radius: 50, clear: 46, flat: [46, 70], part: 'tanks', major: true },
  { id: 'radio', x: 840, z: 80, radius: 30, clear: 20, flat: [16, 32], part: 'regulator', major: true },
  { id: 'dakota', x: 560, z: -380, radius: 36, clear: 28, flat: [22, 40], part: 'altimeter', major: true },
  { id: 'camp', x: 360, z: -830, radius: 30, clear: 20, flat: [16, 32], part: 'harness', major: true },
  { id: 'altar', x: LANDMARKS.altar.x, z: LANDMARKS.altar.z, radius: 34, clear: 24, flat: null, part: 'striker', major: true },
  { id: 'chapel', x: -480, z: -480, radius: 32, clear: 22, flat: [18, 34], part: 'crown', major: true },
  { id: 'mine', x: -820, z: -60, radius: 34, clear: 24, flat: [20, 38], part: 'burner', major: true },
  { id: 'breath', x: 0, z: 0, radius: 40, clear: 30, flat: [26, 44], part: null, major: false, launch: { x: 8, z: 6 } },
];

// Names to fall back on if the story's words haven't given one.
const SITE_NAME_DEFAULTS = {
  lookout: 'The Ranger Lookout', trapper: 'Henrik\'s Cabin', station: 'Hollow Station', lake: 'The Frozen Lake',
  radio: 'The Radio Mast', dakota: 'The Dakota', camp: 'Last Camp', altar: 'The Frozen Altar',
  chapel: 'Chapel of the Snows', mine: 'The Star-Iron Mine', breath: 'The Breath',
};

function siteName(id) {
  return (LORE.sites && LORE.sites[id] && LORE.sites[id].name) || SITE_NAME_DEFAULTS[id] || id;
}

for (const site of SITES) {
  Object.assign(site, { name: siteName(site.id), discovered: false, revealed: false, group: null });
  // The altar's ground and clearing are already set by the world.
  if (site.flat) FLAT_SPOTS.push([site, site.flat[0], site.flat[1]]);
  if (site.id !== 'altar') CLEARINGS.push([site, site.clear]);
}

// Items placed by hand at the sites and around the map: { item, x, z, y?, count? }, with y
// the height of whatever it stands on, for those that don't lie in the snow.
const WORLD_ITEMS = [];

// The flight bag, thrown clear of the plane with her.
WORLD_ITEMS.push({ item: 'bag', x: LANDMARKS.start.x - 3.2, z: LANDMARKS.start.z + 2.6 });

const SITE_VIEW = {
  cull: 280, // site buildings show within this far of the camera
  poiCull: 150, // the smaller things in the forest
  nookCull: 95, // the little shard hollows
  poiSeen: 16, // how close she has to come to mark a thing on the map
};

const siteState = {
  lookoutClimbed: false,
  beacons: null,
  steam: null,
  brokenAnimators: new Set(),
};

function siteById(id) {
  return SITES.find((s) => s.id === id);
}

function majorSitesFound() {
  let n = 0;
  for (const s of SITES) if (s.major && s.discovered) n++;
  return n;
}

// Marks a site on her map without her having been there: from a note, a signpost or the view
// from the lookout.
function revealSite(id) {
  const site = siteById(id);
  if (site && !site.revealed) { site.revealed = true; emitGame('siteRevealed', site); }
}

function discoverSite(site) {
  if (site.discovered) return;
  site.discovered = site.revealed = true;
  Sfx.siteChime();
  emitGame('siteDiscovered', site);
}

// Real distances for signs and captions: "160 m", "1.2 km".
function siteDistanceText(metres) {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres / 10) * 10} m`;
}

// Which way something lies from (x, z), as a word. North is -z.
function siteCompassWord(dx, dz) {
  const words = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const deg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return words[Math.round(deg / 45) % 8];
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // A low swell under two soft bells: somewhere new.
  siteChime() {
    this.tone(147, 146, 2.6, 0.08, 'triangle');
    setTimeout(() => this.tone(587, 586, 2, 0.045), 180);
    setTimeout(() => this.tone(880, 879, 2.4, 0.03), 460);
  },
  // A boot on an old wooden rung.
  ladderRung() {
    this.burst(0.06, 800 + Math.random() * 400, 3, 0.16, 'bandpass');
    this.tone(190 + Math.random() * 30, 140, 0.07, 0.06, 'triangle');
  },
  // A site spotted from the lookout: a small glassy ping.
  sitePing() { this.tone(1320, 1318, 0.9, 0.025); this.tone(660, 659, 1.1, 0.02, 'triangle'); },
  // Old boards shifting under a hand.
  signCreak() { this.glide([[0, 160], [0.25, 230], [0.55, 150]], 0.05, 'sawtooth', 5); },
});

/* ---------- Points of interest ---------- */
// The smaller finds between the sites. Each is laid out in its own coordinates (x across, z
// forward, turned by `ry`); items, colliders and the cleared ground are worked out here, at
// load time, so the forest and the item list can use them; the models are built in initSites.
// items: [id, x, z, height it rests at or null for the snow, count].
const POINTS_OF_INTEREST = [
  { id: 'stand', kind: 'stand', name: 'Hunter\'s tree stand', x: -150, z: 430, ry: 0.6, clear: 6,
    colliders: [[0.8, 0.8, 0.14, 3.5], [-0.8, 0.8, 0.14, 3.5], [0.8, -0.8, 0.14, 3.5], [-0.8, -0.8, 0.14, 3.5], [1.4, 0.75, 0.3, 0.35]],
    items: [['note:hunter-note', 1.28, 0.7, 0.36], ['jerky', 1.52, 0.82, 0.36]] },
  { id: 'cairn', kind: 'cairn', name: 'Survey cairn', x: -430, z: 130, ry: 2.2, clear: 5,
    colliders: [[0, 0, 0.75, 1.6]],
    items: [['note:survey-cairn', 0.25, 1.0]] },
  { id: 'board', kind: 'board', name: 'Trail board', x: -60, z: 650, ry: -0.5, clear: 5, restOnBase: true,
    colliders: [[0.95, 0, 0.12, 2.6], [-0.95, 0, 0.12, 2.6]],
    items: [['note:wolf-warning', 0.25, 0.16, 1.02]] },
  { id: 'sled', kind: 'sled', name: 'Abandoned sled', x: 290, z: 170, ry: 1.1, clear: 5.5,
    colliders: [[-0.45, 0, 0.55, 0.9], [0.55, 0, 0.5, 0.5]],
    items: [['note:sled-tag', 0.66, 0.06, 0.4], ['beans', 0.92, -0.1, 0.4], ['cloth', 0.3, 0.85]] },
  { id: 'balloon', kind: 'balloon', name: 'Weather balloon', x: 230, z: -150, ry: 0.3, clear: 6,
    colliders: [[0, 0, 0.3, 7]],
    items: [['note:balloon-tag', 1.0, 0.65], ['cloth', -0.8, 1.0, null, 2]] },
  { id: 'meteor', kind: 'meteor', name: 'Meteor rock', x: -190, z: -330, ry: 0.9, clear: 7.5,
    colliders: [[0, 0, 1.9, 1.8], [2.1, 0.5, 0.36, 0.34]],
    items: [['note:shards-legend', 2.1, 0.5, 0.35], ['shard', -1.5, 1.6, null, 2]] },
  { id: 'crate-north', kind: 'crate', name: 'Supply crate', x: 80, z: 400, ry: 0.4, clear: 4.5, label: 'HOLLOW STN|AIR DROP 1983', seed: 11 },
  { id: 'crate-east', kind: 'crate', name: 'Supply crate', x: 660, z: -100, ry: 2.6, clear: 4.5, label: 'RADIO SPARES|KEEP DRY', seed: 12 },
  { id: 'crate-west', kind: 'crate', name: 'Supply crate', x: -660, z: 160, ry: -1.2, clear: 4.5, label: 'HALVARD M. CO.|STORES', seed: 13 },
  { id: 'crate-south', kind: 'crate', name: 'Supply crate', x: 170, z: -560, ry: 1.9, clear: 4.5, label: 'HOLLOW STN|AIR DROP 1984', seed: 14 },
  { id: 'tent-east', kind: 'tent', name: 'Collapsed tent', x: 470, z: -640, ry: 0.8, clear: 6, colour: 0xa8573a,
    colliders: [[0, -0.55, 0.9, 1.1], [0, 0.6, 0.7, 1.1]],
    items: [['cloth', 0.55, 1.8], ['warmer', -0.35, 1.9]] },
  { id: 'tent-west', kind: 'tent', name: 'Collapsed tent', x: -650, z: -300, ry: -2.3, clear: 6, colour: 0x56664a,
    colliders: [[0, -0.55, 0.9, 1.1], [0, 0.6, 0.7, 1.1]],
    items: [['cloth', 0.55, 1.8], ['warmer', -0.35, 1.9]] },
  // Signposts: the forestry service's boards, and newer ones Varga added in red.
  { id: 'sign-start', kind: 'sign', name: 'Signpost', x: 30, z: 712, clear: 3.5, targets: ['lookout', 'trapper', 'lake'] },
  { id: 'sign-cabin', kind: 'sign', name: 'Signpost', x: -110, z: 190, clear: 3.5, targets: ['trapper', 'station', 'breath'] },
  { id: 'sign-lake', kind: 'sign', name: 'Signpost', x: 300, z: 60, clear: 3.5, targets: ['lake', 'radio', 'breath'] },
  { id: 'sign-south', kind: 'sign', name: 'Signpost', x: 330, z: -470, clear: 3.5, targets: ['dakota', 'camp', 'altar'] },
  { id: 'sign-chapel', kind: 'sign', name: 'Signpost', x: -290, z: -160, clear: 3.5, targets: ['mine', 'chapel', 'breath'] },
  { id: 'sign-west', kind: 'sign', name: 'Signpost', x: -540, z: 180, clear: 3.5, targets: ['station', 'mine', 'trapper'] },
];

// The loose star-iron shards, each lying in a little scorched hollow where it came down.
// With the meteor rock's two and the sites' three, that makes fifteen.
const SITE_SHARDS = [
  [-95, 540], [340, 520], [-730, 320], [730, 300], [-380, -60],
  [110, -290], [690, -230], [-700, -420], [200, -880], [-130, -560],
];

// What a supply crate holds: two or three things, always the same for the same crate.
const SITE_CRATE_GOODS = ['beans', 'jerky', 'chocolate', 'warmer', 'thermos', 'medkit', 'bandage'];

function poiToWorld(poi, lx, lz) {
  const c = Math.cos(poi.ry || 0), s = Math.sin(poi.ry || 0);
  return { x: poi.x + lx * c + lz * s, z: poi.z - lx * s + lz * c };
}

// The ground under a point of a prop, relative to the prop's base: props stand on slopes, so
// posts and feet reach down to wherever the snow actually is.
function poiGround(poi, lx, lz) {
  const at = poiToWorld(poi, lx, lz);
  return groundHeight(at.x, at.z) - poi.y;
}

for (const poi of POINTS_OF_INTEREST) {
  poi.y = groundHeight(poi.x, poi.z);
  poi.seen = false;
  poi.group = null;
  if (poi.kind === 'crate') {
    // The lid lies in the snow in front, with what was inside laid out on it.
    const rand = seededRandom(poi.seed * 7919);
    const n = 2 + Math.floor(rand() * 2);
    const spots = [[-0.28, 0.96], [0.04, 1.02], [0.32, 0.94]];
    poi.colliders = [[0, 0, 0.62, 0.75]];
    const goods = [...SITE_CRATE_GOODS];
    poi.items = spots.slice(0, n).map(([lx, lz]) => [goods.splice(Math.floor(rand() * goods.length), 1)[0], lx, lz, 0.075]);
  }
  if (poi.kind === 'sign') poi.colliders = [[0, 0, 0.14, 2.6]];
  CLEARINGS.push([poi, poi.clear]);
  for (const [lx, lz, r, h] of poi.colliders || []) LANDMARK_COLLIDERS.push({ ...poiToWorld(poi, lx, lz), r, h });
  for (const [item, lx, lz, rest, count] of poi.items || []) {
    const at = poiToWorld(poi, lx, lz);
    const entry = { item, x: at.x, z: at.z };
    // Heights are above the ground where the item lies, or above the prop's base for things
    // like the trail board, whose ledge doesn't follow the slope.
    if (rest !== undefined && rest !== null) entry.y = (poi.restOnBase ? poi.y : groundHeight(at.x, at.z)) + rest;
    if (count) entry.count = count;
    WORLD_ITEMS.push(entry);
  }
}
for (const [x, z] of SITE_SHARDS) {
  CLEARINGS.push([{ x, z }, 1.6]);
  WORLD_ITEMS.push({ item: 'shard', x, z });
}

/* ---------- Materials and small helpers ---------- */
let siteMats = null;

function sitePlankTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const rand = seededRandom(812);
    g.fillStyle = '#a2815c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 340; i++) {
      const y = rand() * h;
      g.strokeStyle = `rgba(${60 + rand() * 30},${38 + rand() * 20},${22 + rand() * 10},${0.12 + rand() * 0.25})`;
      g.lineWidth = 0.6 + rand() * 1.6;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (rand() - 0.5) * 6, w * 0.7, y + (rand() - 0.5) * 6, w, y + (rand() - 0.5) * 4);
      g.stroke();
    }
    // Seams between the boards, and the odd knot.
    for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(40,24,14,0.55)'; g.fillRect(0, y, w, 2); }
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(58,34,18,0.55)';
      g.beginPath();
      g.ellipse(rand() * w, rand() * h, 3 + rand() * 4, 2 + rand() * 2, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function getSiteMats() {
  if (siteMats) return siteMats;
  const plank = sitePlankTexture();
  const std = (params) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...params });
  siteMats = {
    wood: std({ map: plank }),
    grey: std({ map: plank, color: 0x9da2a8 }),
    dark: std({ map: plank, color: 0x6b5442 }),
    bark: std({ map: TEX.bark.color, normalMap: TEX.bark.normal, roughness: 0.95, color: 0x8a8580 }),
    snow: std({ color: 0xf2f5ff, roughness: 1 }),
    stone: std({ map: TEX.stone.color, normalMap: TEX.stone.normal }),
    basalt: std({ map: TEX.stone.color, normalMap: TEX.stone.normal, color: 0x3a3c44, roughness: 0.5, metalness: 0.45, flatShading: true }),
    crystal: std({ color: 0x9fe4ff, emissive: 0x3ab4ff, emissiveIntensity: 1.6, roughness: 0.12, metalness: 0.1, flatShading: true }),
    canvas: std({ color: 0xb6a27c, roughness: 1, side: THREE.DoubleSide }),
    tarp: std({ color: 0x6f7058, roughness: 1, side: THREE.DoubleSide }),
    tentCloth: std({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
    pack: std({ color: 0x5a3a2a, roughness: 0.95 }),
    pelt: std({ color: 0xe8e2d6, roughness: 1, side: THREE.DoubleSide }),
    straw: std({ color: 0xb59a52, roughness: 1 }),
    latex: std({ color: 0xf0e2c2, vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }),
    chute: std({ color: 0xc8642c, roughness: 0.85, side: THREE.DoubleSide }),
    metal: std({ color: 0x5f646b, metalness: 0.7, roughness: 0.5 }),
    olive: std({ color: 0x4b5236, metalness: 0.4, roughness: 0.7 }),
    brass: std({ color: 0xb48c40, metalness: 0.9, roughness: 0.35 }),
    rope: std({ color: 0x9b8457, roughness: 1 }),
    red: std({ color: 0xa3221c, roughness: 0.8 }),
    styro: std({ color: 0xf1eee6, roughness: 0.8 }),
    melt: new THREE.MeshBasicMaterial({ color: 0x2b2e36, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
  return siteMats;
}

// Adds a mesh to `parent` at (x, y, z) with an optional rotation, casting shadows if asked.
function sitePart(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, shadow = false) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// A rod from a to b (local points), for posts, rails, ropes and branches.
const siteRodUp = new THREE.Vector3(0, 1, 0);
function siteRod(parent, a, b, r, mat, sides = 6) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), sides), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(siteRodUp, dir.normalize());
  mesh.castShadow = r > 0.04;
  parent.add(mesh);
  return mesh;
}

// A low drift of snow, squashed flat.
function siteDrift(parent, x, z, w, h, d, ry = 0, y = 0) {
  const drift = sitePart(parent, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), getSiteMats().snow, x, y - 0.04, z, 0, ry, 0);
  drift.scale.set(w, h, d);
  return drift;
}

// A lumpy stone, from an icosahedron pushed in and out.
function siteRockGeometry(seed, radius, detail = 1) {
  const rand = seededRandom(seed);
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 0.8 + rand() * 0.35);
    v.multiplyScalar(offsets.get(key));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// A patch draped over the ground's shape around a prop at (x, z) on ground height y0.
function siteGroundPatch(parent, x, z, y0, radius, mat, turn = 0) {
  const geo = new THREE.RingGeometry(0.01, radius, 24, 6).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(x + p.getX(i), z + p.getZ(i)) - y0 + 0.07);
  const mesh = new THREE.Mesh(geo, mat);
  // Undo the parent's turn, so the patch lies over the ground it was shaped to.
  mesh.rotation.y = -turn;
  parent.add(mesh);
  return mesh;
}

/* ---------- Models: points of interest ---------- */
// Each builder takes the point of interest and returns its group, laid out around the base
// and turned by poi.ry when placed. Crates, sleds and tents tilt to lie with the slope;
// the rest stand upright, their posts reaching down to the ground beneath each one.
const SITE_POI_TILTED = new Set(['crate', 'sled', 'tent']);

// Henrik's tree stand: a platform on four posts, a ladder, and his ammunition box at the foot.
function buildPoiStand(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  const top = 3.0;
  for (const [x, z] of [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]]) {
    siteRod(g, new THREE.Vector3(x * 1.04, poiGround(poi, x * 1.04, z * 1.04) - 0.4, z * 1.04), new THREE.Vector3(x, top + 0.6, z), 0.075, m.dark);
  }
  sitePart(g, new THREE.BoxGeometry(1.95, 0.09, 1.95), m.wood, 0, top, 0, 0, 0, 0, true);
  sitePart(g, new THREE.BoxGeometry(1.9, 0.07, 1.9), m.snow, 0, top + 0.075, 0);
  for (const [x, z] of [[0.55, 0.55], [-0.55, -0.4], [0.2, -0.6]]) sitePart(g, new THREE.BoxGeometry(0.06, 0.06, 1.9), m.dark, x * 0.3, top - 0.075, z * 0.3, 0, (x + z) * 0.5, 0);
  // Rails round three sides; the ladder comes up the fourth.
  for (const [x, z, ry] of [[0, -0.8, 0], [0.8, 0, Math.PI / 2], [-0.8, 0, Math.PI / 2]]) {
    sitePart(g, new THREE.BoxGeometry(1.7, 0.07, 0.07), m.dark, x, top + 0.55, z, 0, ry, 0);
    sitePart(g, new THREE.BoxGeometry(1.7, 0.03, 0.09), m.snow, x, top + 0.6, z, 0, ry, 0);
  }
  // A sheet of old canvas hung on the front rail to hide him from the hares.
  sitePart(g, new THREE.PlaneGeometry(1.5, 0.5, 4, 2), m.canvas, 0, top + 0.28, -0.84, 0.08, 0, 0);
  sitePart(g, new THREE.BoxGeometry(0.9, 0.06, 0.3), m.wood, 0, top + 0.42, -0.5);
  // The ladder.
  const foot = poiGround(poi, 0, 1.55) - 0.15;
  for (const x of [-0.24, 0.24]) siteRod(g, new THREE.Vector3(x, foot, 1.55), new THREE.Vector3(x, top + 0.1, 0.92), 0.035, m.wood);
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    sitePart(g, new THREE.BoxGeometry(0.5, 0.04, 0.05), m.wood, 0, lerp(foot, top + 0.1, t), lerp(1.55, 0.92, t));
  }
  // A hare skin stretched on a willow hoop, hung from a rail to dry.
  const hoop = new THREE.Group();
  hoop.position.set(0.86, top - 0.2, -0.2);
  hoop.rotation.y = Math.PI / 2;
  sitePart(hoop, new THREE.TorusGeometry(0.2, 0.012, 5, 16), m.dark);
  sitePart(hoop, new THREE.CircleGeometry(0.17, 12), m.pelt);
  g.add(hoop);
  siteRod(g, new THREE.Vector3(0.86, top - 0.02, -0.2), new THREE.Vector3(0.84, top + 0.55, -0.2), 0.006, m.rope, 3);
  // His ammunition box, used as a seat; what he left is on its lid.
  const box = poiGround(poi, 1.4, 0.75);
  sitePart(g, new THREE.BoxGeometry(0.52, 0.36, 0.32), m.olive, 1.4, box + 0.16, 0.75, 0, 0.3, 0, true);
  sitePart(g, new THREE.BoxGeometry(0.16, 0.04, 0.05), m.metal, 1.4, box + 0.35, 0.75, 0, 0.3, 0);
  siteDrift(g, -0.6, -1.2, 1.4, 0.35, 0.8, 0.4, poiGround(poi, -0.6, -1.2));
  return g;
}

// Varga's survey cairn: stones piled in rings, a tin vane on a pole, and a brass marker.
function buildPoiCairn(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  const rand = seededRandom(404);
  // [stones in the ring, ring radius, stone size]
  const layers = [[6, 0.5, 0.3], [4, 0.3, 0.27], [3, 0.15, 0.22], [1, 0, 0.2]];
  let y = Math.min(0, poiGround(poi, 0.5, 0), poiGround(poi, -0.5, 0), poiGround(poi, 0, 0.5), poiGround(poi, 0, -0.5)) + 0.05;
  layers.forEach(([count, ring, size], layer) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + layer * 0.7;
      const r = size * (0.85 + rand() * 0.3);
      const stone = sitePart(g, siteRockGeometry(500 + layer * 10 + i, r, 1), m.stone, Math.cos(a) * ring, y + r * 0.5, Math.sin(a) * ring, rand(), rand() * 6, rand(), true);
      stone.scale.y = 0.7;
      if (rand() < 0.6) sitePart(g, new THREE.SphereGeometry(r * 0.7, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), m.snow, stone.position.x, y + r * 0.78, stone.position.z).scale.y = 0.35;
    }
    y += size * 0.95;
  });
  siteRod(g, new THREE.Vector3(0, y - 0.25, 0), new THREE.Vector3(0.02, y + 1.15, 0.01), 0.022, m.metal);
  const vane = sitePart(g, new THREE.BoxGeometry(0.34, 0.2, 0.012), m.brass, 0.17, y + 1.0, 0.01);
  vane.rotation.y = 0.4;
  sitePart(g, new THREE.CylinderGeometry(0.07, 0.07, 0.015, 14), m.brass, 0.32, 0.42, 0.42, 0.9, 0, 0.2);
  siteDrift(g, 0.4, -0.6, 1.2, 0.3, 0.9, 1, poiGround(poi, 0.4, -0.6));
  return g;
}

// The forestry service's trail board: a roofed notice board with a ledge for papers.
function siteBoardFaceTexture() {
  return canvasTexture(512, 300, (g, w, h) => {
    const rand = seededRandom(77);
    g.fillStyle = '#4a3322';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9c9a1';
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#e4d5ae';
    g.textAlign = 'center';
    g.font = 'bold 30px Georgia, serif';
    g.fillText('HOLLOW CRATER', w / 2, 52);
    g.font = '18px Georgia, serif';
    g.fillText('FORESTRY DISTRICT  -  TRAIL No. 4', w / 2, 78);
    // A routed trail map: the rim, the lake, the trail.
    g.strokeStyle = 'rgba(228,213,174,0.75)';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(160, 180, 110, 80, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([8, 7]);
    g.beginPath();
    g.moveTo(120, 250);
    g.bezierCurveTo(140, 200, 110, 170, 170, 140);
    g.lineTo(215, 120);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(228,213,174,0.75)';
    g.beginPath();
    g.ellipse(210, 190, 22, 14, 0.3, 0, Math.PI * 2);
    g.fill();
    // Notices pinned up and left to weather.
    for (const [x, y, nw, nh, tilt] of [[300, 98, 88, 118, -0.05], [402, 106, 80, 100, 0.07]]) {
      g.save();
      g.translate(x + nw / 2, y + nh / 2);
      g.rotate(tilt);
      g.fillStyle = `rgb(${215 + rand() * 20},${205 + rand() * 20},${180 + rand() * 20})`;
      g.fillRect(-nw / 2, -nh / 2, nw, nh);
      g.fillStyle = 'rgba(60,50,40,0.5)';
      for (let l = -nh / 2 + 14; l < nh / 2 - 6; l += 10) g.fillRect(-nw / 2 + 8, l, nw - 16 - rand() * 20, 2);
      g.fillStyle = '#8a1d16';
      g.beginPath();
      g.arc(0, -nh / 2 + 5, 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.fillStyle = '#c23a2c';
    g.font = 'bold 18px Georgia, serif';
    g.fillText('BEWARE OF WOLVES', 372, 254);
    g.font = 'italic 13px Georgia, serif';
    g.fillText('Do not walk the far lines alone', 372, 274);
  });
}

function buildPoiBoard(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  for (const x of [-0.95, 0.95]) {
    const foot = poiGround(poi, x, 0) - 0.3;
    sitePart(g, new THREE.BoxGeometry(0.11, 2.65 - foot, 0.11), m.dark, x, (2.65 + foot) / 2, 0, 0, 0, 0, true);
    siteDrift(g, x, 0.05, 0.3, 0.2, 0.3, 0, foot + 0.3);
  }
  const face = new THREE.MeshStandardMaterial({ map: siteBoardFaceTexture(), roughness: 0.85 });
  sitePart(g, new THREE.BoxGeometry(1.8, 1.05, 0.05), [m.dark, m.dark, m.dark, m.dark, face, m.dark], 0, 1.65, 0.02, 0, 0, 0, true);
  // A little gable roof, snow on top.
  for (const side of [-1, 1]) {
    sitePart(g, new THREE.BoxGeometry(2.15, 0.04, 0.42), m.dark, 0, 2.62, side * 0.17, side * 0.5, 0, 0, true);
    sitePart(g, new THREE.BoxGeometry(2.1, 0.05, 0.4), m.snow, 0, 2.66, side * 0.19, side * 0.5, 0, 0);
  }
  // The ledge where papers are left.
  sitePart(g, new THREE.BoxGeometry(1.8, 0.04, 0.22), m.wood, 0, 1.0, 0.13);
  sitePart(g, new THREE.BoxGeometry(0.9, 0.02, 0.2), m.snow, -0.45, 1.03, 0.13);
  siteDrift(g, 0, -0.35, 1.3, 0.35, 0.5, 0, poiGround(poi, 0, -0.35));
  return g;
}

// An old freight sled, its load still lashed under a tarp, half drifted over.
function buildPoiSled() {
  const m = getSiteMats();
  const g = new THREE.Group();
  for (const z of [-0.32, 0.32]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.15, 0.05, z), new THREE.Vector3(0.6, 0.05, z), new THREE.Vector3(1.15, 0.12, z), new THREE.Vector3(1.32, 0.42, z), new THREE.Vector3(1.22, 0.62, z),
    ]);
    const runner = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 6), m.dark);
    runner.castShadow = true;
    g.add(runner);
    for (const x of [-1, -0.35, 0.3, 0.9]) siteRod(g, new THREE.Vector3(x, 0.05, z), new THREE.Vector3(x, 0.34, z * 0.95), 0.022, m.dark, 5);
  }
  for (let i = 0; i < 7; i++) sitePart(g, new THREE.BoxGeometry(0.13, 0.03, 0.74), m.wood, -1.0 + i * 0.33, 0.36, 0);
  // The load: crates under a canvas tarp that sags between them and hangs down the sides.
  sitePart(g, new THREE.BoxGeometry(1.0, 0.46, 0.58), m.dark, -0.32, 0.6, 0);
  const tarp = new THREE.PlaneGeometry(1.3, 1.0, 12, 8).rotateX(-Math.PI / 2);
  const tp = tarp.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i);
    const over = Math.max(0, Math.abs(z) - 0.3) + Math.max(0, Math.abs(x) - 0.52);
    tp.setY(i, 0.86 - over * 1.5 + Math.sin(x * 9) * 0.012 - Math.cos(x * 5.5) * 0.02);
  }
  tarp.computeVertexNormals();
  sitePart(g, tarp, m.tarp, -0.32, 0, 0, 0, 0, 0, true);
  sitePart(g, new THREE.BoxGeometry(0.7, 0.04, 0.4), m.snow, -0.4, 0.89, -0.02);
  for (const x of [-0.68, -0.05]) sitePart(g, new THREE.BoxGeometry(0.025, 0.5, 0.7), m.rope, x, 0.63, 0);
  // The hauling rope, trailing off into the snow.
  const rope = new THREE.CatmullRomCurve3([new THREE.Vector3(1.22, 0.6, 0), new THREE.Vector3(1.7, 0.2, 0.15), new THREE.Vector3(2.3, 0.03, -0.1), new THREE.Vector3(2.9, 0.02, 0.2)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(rope, 16, 0.014, 4), m.rope));
  siteDrift(g, -1.0, 0.5, 0.9, 0.3, 0.45, 0.2);
  siteDrift(g, -1.25, -0.25, 0.45, 0.2, 0.4);
  return g;
}

// One of Varga's weather balloons that never cleared the trees: burst, its skin draped over
// a dead snag's branch, the instrument box still turning slowly on its line.
function buildPoiBalloon(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  siteRod(g, new THREE.Vector3(0, poiGround(poi, 0, 0) - 0.4, 0), new THREE.Vector3(0.1, 7.2, 0.05), 0.2, m.bark, 7);
  const limbs = [[4.2, 0.4, 2.3], [5.1, 2.6, 1.8], [5.8, 4.4, 1.6], [3.4, 3.6, 1.4], [6.5, 1.5, 1.1], [2.7, 5.4, 0.9]];
  for (const [y, a, len] of limbs) {
    const start = new THREE.Vector3(0.06, y, 0.03);
    const end = start.clone().add(new THREE.Vector3(Math.sin(a) * len, len * 0.3, Math.cos(a) * len));
    siteRod(g, start, end, 0.065, m.bark, 5);
    const twig = end.clone().add(new THREE.Vector3(Math.sin(a + 0.6) * 0.5, 0.35, Math.cos(a + 0.6) * 0.5));
    siteRod(g, end.clone().lerp(start, 0.25), twig, 0.025, m.bark, 4);
  }
  // The burst skin: a sheet hung over the branch, falling away either side in loose folds,
  // its edges torn.
  const [ly, la, llen] = limbs[0];
  const along = 0.62 * llen;
  const drape = new THREE.Vector3(0.06 + Math.sin(la) * along, ly + along * 0.3 + 0.06, 0.03 + Math.cos(la) * along);
  const rand = seededRandom(1971);
  const sheet = new THREE.PlaneGeometry(1.6, 3.0, 14, 18);
  const sp = sheet.attributes.position;
  const shade = [];
  for (let i = 0; i < sp.count; i++) {
    const u = sp.getX(i), v = sp.getY(i); // u along the branch, v across it
    const fall = Math.max(0, Math.abs(v) - 0.12);
    const side = Math.sign(v) * (0.07 + 0.3 * (1 - Math.exp(-fall * 2.2)));
    let y = -fall * 1.05 - fall * fall * 0.12 + Math.cos(u * 2.4) * 0.05 * fall;
    if (Math.abs(v) > 1.1) y -= rand() * 0.35;
    const fold = Math.sin(u * 10 + v * 2.5) * 0.06 * Math.min(1, fall * 2);
    sp.setXYZ(i, u * (1 - fall * 0.22), y, side + fold);
    const s = 0.86 + Math.sin(u * 13 + v * 4) * 0.08 + rand() * 0.05;
    shade.push(s, s * 0.96, s * 0.88);
  }
  sheet.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  sheet.computeVertexNormals();
  const skin = sitePart(g, sheet, m.latex, drape.x, drape.y, drape.z, 0, la - Math.PI / 2, 0, true);
  skin.rotation.z = 0.3 * Math.atan(0.3);
  // The neck, the line, a little parachute and the radiosonde, swinging together.
  const swing = new THREE.Group();
  swing.position.set(drape.x + Math.cos(la) * 0.25, drape.y - 1.2, drape.z - Math.sin(la) * 0.25);
  g.add(swing);
  sitePart(swing, new THREE.CylinderGeometry(0.05, 0.09, 0.4, 8, 1, true), m.latex, 0, 0.1, 0);
  siteRod(swing, new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0, -2.0, 0), 0.005, m.rope, 3);
  sitePart(swing, new THREE.ConeGeometry(0.34, 0.22, 10, 1, true), m.chute, 0, -0.75, 0);
  for (let i = 0; i < 4; i++) siteRod(swing, new THREE.Vector3(Math.cos(i * 1.57) * 0.33, -0.86, Math.sin(i * 1.57) * 0.33), new THREE.Vector3(0, -1.2, 0), 0.003, m.rope, 3);
  const sonde = sitePart(swing, new THREE.BoxGeometry(0.2, 0.28, 0.16), m.styro, 0, -2.15, 0, 0, 0, 0, true);
  sitePart(swing, new THREE.BoxGeometry(0.205, 0.07, 0.165), m.red, 0, -2.08, 0);
  siteRod(swing, new THREE.Vector3(0.06, -2.3, 0), new THREE.Vector3(0.1, -2.75, 0.04), 0.004, m.metal, 3);
  g.userData.swing = swing;
  g.userData.sonde = sonde;
  siteDrift(g, 0.2, 0.2, 1.1, 0.3, 1.1, 0, poiGround(poi, 0.2, 0.2));
  return g;
}

// A great black stone from the sky, veined with blue star-iron crystals. It's warm: the snow
// won't settle on it, and the ground round it is bare and dark.
function buildPoiMeteor(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  const rand = seededRandom(1908);
  const base = Math.min(poiGround(poi, 1.6, 0), poiGround(poi, -1.6, 0), poiGround(poi, 0, 1.4), poiGround(poi, 0, -1.4));
  const rock = sitePart(g, siteRockGeometry(1908, 1.6, 2), m.basalt, 0, base + 0.45, 0, 0.2, 0.5, 0.1, true);
  rock.scale.set(1.3, 0.82, 1.08);
  // Crystals pushed out through the crust.
  const crystalGeo = new THREE.OctahedronGeometry(0.16, 0);
  const n = new THREE.Vector3();
  for (let i = 0; i < 11; i++) {
    n.set(rand() - 0.5, rand() * 0.8 + 0.1, rand() - 0.5).normalize();
    const c = sitePart(g, crystalGeo, m.crystal, n.x * 1.85, base + 0.45 + n.y * 1.2, n.z * 1.55, rand() * 3, rand() * 3, rand() * 3);
    c.scale.set(0.6 + rand() * 0.6, 1.2 + rand() * 1.4, 0.6 + rand() * 0.5);
  }
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2, d = 2.4 + rand() * 1.4;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    sitePart(g, siteRockGeometry(1950 + i, 0.18 + rand() * 0.22, 0), m.basalt, x, poiGround(poi, x, z) + 0.06, z, rand(), rand(), rand());
  }
  // The flat stone someone set the legend on.
  const flat = sitePart(g, new THREE.CylinderGeometry(0.36, 0.42, 0.5, 9), m.stone, 2.1, poiGround(poi, 2.1, 0.5) + 0.09, 0.5, 0, 0.4, 0, true);
  flat.scale.z = 0.8;
  siteGroundPatch(g, poi.x, poi.z, poi.y, 4.4, m.melt, poi.ry);
  return g;
}

function siteCrateTexture(label) {
  const [top, bottom] = label.split('|');
  return canvasTexture(256, 180, (g, w, h) => {
    g.drawImage(getSiteMats().wood.map.image, 0, 0, w, h);
    g.fillStyle = 'rgba(30,24,20,0.82)';
    g.textAlign = 'center';
    g.font = 'bold 30px "Courier New", monospace';
    g.fillText(top, w / 2, 78);
    g.font = 'bold 22px "Courier New", monospace';
    g.fillText(bottom || '', w / 2, 112);
    g.fillStyle = 'rgba(150,30,24,0.8)';
    g.fillRect(0, 138, w, 16);
  });
}

// A supply crate dropped by air, lid prised off; a scrap of parachute still tied to it.
function buildPoiCrate(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  const side = new THREE.MeshStandardMaterial({ map: siteCrateTexture(poi.label), roughness: 0.9 });
  sitePart(g, new THREE.BoxGeometry(1.0, 0.7, 0.72), [side, side, m.wood, m.wood, side, side], 0, 0.3, 0, 0, 0, 0.01, true);
  // Battens on the corners, and straw showing where the lid was.
  for (const [x, z] of [[0.5, 0.36], [-0.5, 0.36], [0.5, -0.36], [-0.5, -0.36]]) sitePart(g, new THREE.BoxGeometry(0.07, 0.72, 0.07), m.dark, x, 0.3, z);
  sitePart(g, new THREE.BoxGeometry(0.9, 0.04, 0.62), m.straw, 0, 0.59, 0);
  sitePart(g, new THREE.BoxGeometry(0.4, 0.04, 0.3), m.snow, -0.25, 0.63, -0.15);
  // The lid, in the snow in front, with what was inside set out on it.
  sitePart(g, new THREE.BoxGeometry(1.0, 0.05, 0.72), m.wood, 0.02, 0.035, 0.98, 0, 0.08, 0, true);
  for (const x of [-0.35, 0.35]) sitePart(g, new THREE.BoxGeometry(0.08, 0.03, 0.7), m.dark, x + 0.02, 0.07, 0.98, 0, 0.08, 0);
  // The torn parachute and its cords, half buried.
  const chuteGeo = new THREE.PlaneGeometry(1.6, 1.3, 8, 6).rotateX(-Math.PI / 2);
  const cp = chuteGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setY(i, 0.05 + Math.abs(Math.sin(cp.getX(i) * 4.1 + cp.getZ(i) * 3.3)) * 0.12);
  chuteGeo.computeVertexNormals();
  sitePart(g, chuteGeo, m.chute, -1.15, 0, -0.35, 0, 0.5, 0);
  for (const z of [-0.2, 0.15]) {
    const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.5, 0.55, z), new THREE.Vector3(-0.75, 0.2, z), new THREE.Vector3(-1.0, 0.06, z * 2)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 6, 0.008, 3), m.rope));
  }
  siteDrift(g, -1.3, -0.5, 1.0, 0.3, 0.8, 0.5);
  siteDrift(g, 0.4, -0.55, 0.8, 0.4, 0.4);
  return g;
}

// A tent the snow brought down: one pole still standing, the canvas sagging to the ground,
// guy lines slack.
function buildPoiTent(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  const colour = new THREE.Color(poi.colour);
  const white = new THREE.Color(0xf2f5ff);
  const geo = new THREE.PlaneGeometry(2.4, 2.8, 14, 14).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colours = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const u = Math.abs(x) / 1.2, v = (z + 1.4) / 2.8; // v = 1 at the front, by the standing pole
    const ridge = lerp(0.18, 1.15, v * v) * (1 - Math.pow(u, 1.25));
    const sag = Math.sin(v * Math.PI * 2.3) * 0.1 * (1 - u);
    p.setXYZ(i, x * (0.75 + 0.25 * u), Math.max(0.03, ridge - sag), z);
    // Snow lies on the flatter parts.
    const snow = THREE.MathUtils.smoothstep(Math.sin(x * 5 + z * 3) * 0.5 + 0.5 - v * 0.6, 0.35, 0.7);
    c.copy(colour).lerp(white, snow);
    colours.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  sitePart(g, geo, m.tentCloth, 0, 0, 0, 0, 0, 0, true);
  // The front pole, leaning; the back one lies in the snow.
  siteRod(g, new THREE.Vector3(0, 0, 1.45), new THREE.Vector3(0.05, 1.2, 1.38), 0.025, m.metal, 5);
  siteRod(g, new THREE.Vector3(-0.9, 0.04, -1.6), new THREE.Vector3(0.1, 0.06, -1.95), 0.025, m.metal, 5);
  for (const [x, z] of [[1.0, 2.4], [-1.1, 2.3], [0.2, -2.6]]) siteRod(g, new THREE.Vector3(0.05, 1.18, 1.38), new THREE.Vector3(x, 0.02, z), 0.006, m.rope, 3);
  // A rucksack slumped by the door, its straps hanging.
  const sack = new THREE.Group();
  sack.position.set(0.78, 0, 1.5);
  sack.rotation.set(0.25, 0.5, 0.15);
  sitePart(sack, new THREE.CylinderGeometry(0.2, 0.25, 0.55, 10), m.pack, 0, 0.27, 0, 0, 0, 0, true);
  sitePart(sack, new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.pack, 0, 0.54, 0).scale.y = 0.5;
  sitePart(sack, new THREE.BoxGeometry(0.26, 0.2, 0.08), m.pack, 0, 0.25, 0.24);
  sitePart(sack, new THREE.BoxGeometry(0.3, 0.06, 0.2), m.snow, 0, 0.6, 0);
  g.add(sack);
  siteDrift(g, -0.9, -0.8, 0.9, 0.35, 1.3);
  return g;
}

/* ---------- Models: signposts ---------- */
// Who painted each board: the forestry service in 1958, Henrik with a knife, or Varga in red.
const SITE_BOARD_STYLE = {
  lookout: 'forest', lake: 'forest', mine: 'forest', chapel: 'forest', altar: 'forest',
  trapper: 'henrik',
  station: 'varga', radio: 'varga', dakota: 'varga', camp: 'varga', breath: 'varga',
};
const SITE_BOARD_LOOK = {
  forest: { wood: '#5a3c26', grain: 'rgba(30,18,10,0.35)', ink: '#ecdcb4', font: 'bold {s}px Georgia, serif', upper: true, mat: 'dark' },
  henrik: { wood: '#a88a62', grain: 'rgba(70,46,26,0.35)', ink: '#2f2014', font: 'bold {s}px "Courier New", monospace', upper: true, mat: 'wood' },
  varga: { wood: '#8f9297', grain: 'rgba(50,50,56,0.3)', ink: '#b3261e', font: 'italic bold {s}px Georgia, serif', upper: false, mat: 'grey' },
};

function siteBoardText(id) {
  const name = SITE_BOARD_STYLE[id] === 'henrik' ? 'HENRIKS' : siteById(id).name.replace(/^The /, '');
  return name;
}

function siteBoardTexture(id, metres) {
  const look = SITE_BOARD_LOOK[SITE_BOARD_STYLE[id] || 'forest'];
  return canvasTexture(512, 96, (g, w, h) => {
    const rand = seededRandom(id.length * 131 + metres);
    g.fillStyle = look.wood;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = look.grain;
      g.fillRect(0, rand() * h, w, 0.6 + rand() * 1.4);
    }
    const label = look.upper ? siteBoardText(id).toUpperCase() : siteBoardText(id);
    const dist = siteDistanceText(metres);
    g.fillStyle = look.ink;
    g.textBaseline = 'middle';
    // Shrink the lettering until the name and the distance both fit.
    let size = 46;
    g.font = look.font.replace('{s}', size);
    while (size > 22 && g.measureText(label).width + g.measureText(dist).width + 70 > w) { size -= 2; g.font = look.font.replace('{s}', size); }
    g.textAlign = 'left';
    g.fillText(label, 26, h / 2 + 2);
    g.textAlign = 'right';
    g.fillText(dist, w - 34, h / 2 + 2);
  });
}

// A post with an arrow board for each place it names, pointing the true way there.
function buildPoiSign(poi) {
  const m = getSiteMats();
  const g = new THREE.Group();
  sitePart(g, new THREE.BoxGeometry(0.13, 3.1, 0.13), m.grey, 0, 1.1, 0, 0, 0, 0, true);
  sitePart(g, new THREE.ConeGeometry(0.12, 0.14, 4), m.dark, 0, 2.72, 0, 0, Math.PI / 4, 0);
  sitePart(g, new THREE.ConeGeometry(0.1, 0.08, 4), m.snow, 0, 2.77, 0, 0, Math.PI / 4, 0);
  const len = 1.25, high = 0.24, thick = 0.045;
  const tip = new THREE.Shape();
  tip.moveTo(0, -high / 2);
  tip.lineTo(0.2, 0);
  tip.lineTo(0, high / 2);
  tip.lineTo(0, -high / 2);
  const tipGeo = new THREE.ExtrudeGeometry(tip, { depth: thick, bevelEnabled: false }).translate(0, 0, -thick / 2);
  poi.boards = [];
  poi.targets.forEach((id, i) => {
    const site = siteById(id);
    const metres = Math.hypot(site.x - poi.x, site.z - poi.z);
    poi.boards.push({ id, metres });
    const look = SITE_BOARD_LOOK[SITE_BOARD_STYLE[id] || 'forest'];
    const wood = m[look.mat];
    const face = new THREE.MeshStandardMaterial({ map: siteBoardTexture(id, metres), roughness: 0.9 });
    const arm = new THREE.Group();
    arm.position.y = 2.38 - i * 0.33;
    // Local +x points at the site.
    arm.rotation.y = Math.atan2(site.x - poi.x, site.z - poi.z) - Math.PI / 2;
    arm.rotation.z = (i % 2 ? 1 : -1) * 0.025;
    sitePart(arm, new THREE.BoxGeometry(len, high, thick), [wood, wood, wood, wood, face, face], len / 2 + 0.02, 0, 0, 0, 0, 0, true);
    sitePart(arm, tipGeo, wood, len + 0.02, 0, 0);
    sitePart(arm, new THREE.BoxGeometry(len - 0.08, 0.035, thick + 0.012), m.snow, len / 2 - 0.02, high / 2 + 0.015, 0);
    g.add(arm);
  });
  siteDrift(g, 0, 0, 0.55, 0.22, 0.55);
  return g;
}

// A shard's hollow: three dark stones round a bare patch, where it came down hot.
function buildSiteShardNook(x, z) {
  const m = getSiteMats();
  const g = new THREE.Group();
  const y = groundHeight(x, z);
  g.position.set(x, y, z);
  const rand = seededRandom(Math.round(x * 13 + z * 7));
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rand(), d = 0.55 + rand() * 0.25;
    const sx = Math.cos(a) * d, sz = Math.sin(a) * d;
    sitePart(g, siteRockGeometry(3000 + i, 0.2 + rand() * 0.14, 0), m.basalt, sx, groundHeight(x + sx, z + sz) - y + 0.04, sz, rand(), rand() * 6, rand(), true);
  }
  siteGroundPatch(g, x, z, y, 0.85, m.melt);
  return g;
}

const SITE_POI_BUILDERS = {
  stand: buildPoiStand, cairn: buildPoiCairn, board: buildPoiBoard, sled: buildPoiSled, balloon: buildPoiBalloon,
  meteor: buildPoiMeteor, crate: buildPoiCrate, tent: buildPoiTent, sign: buildPoiSign,
};

// Reading a signpost marks the places it names on her map.
function readSiteSignpost(poi) {
  Sfx.signCreak();
  const parts = poi.boards.map((b) => `${siteById(b.id).name.replace(/^The /, '')}, ${siteDistanceText(b.metres)}`);
  const red = poi.boards.some((b) => SITE_BOARD_STYLE[b.id] === 'varga');
  showNote(`${parts.join('. ')}.${red ? ' One board is newer than the rest, lettered by hand in red paint.' : ''}`);
  for (const b of poi.boards) revealSite(b.id);
  poi.seen = true;
}

/* ---------- Beacons ---------- */
// Lights and steam that ignore the fog, so she can steer by them from across the crater.
let siteRingTexture = null;
function getSiteRingTexture() {
  if (!siteRingTexture) {
    siteRingTexture = canvasTexture(128, 128, (g, w) => {
      const grad = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, w);
    });
  }
  return siteRingTexture;
}

function siteGlow(color, strength, map = TEX.softDot) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: new THREE.Color(color).multiplyScalar(strength), transparent: true, depthWrite: false, fog: false }));
  sprite.renderOrder = 3;
  sprite.frustumCulled = false;
  scene.add(sprite);
  return sprite;
}

function siteBeaconHeight(id, fallback) {
  return (typeof SITE_BEACON_HEIGHTS !== 'undefined' && SITE_BEACON_HEIGHTS[id]) || fallback;
}

function buildSiteBeacons() {
  const lookout = siteById('lookout'), radio = siteById('radio');
  const lamp = siteGlow(0xffc77a, 2.6);
  lamp.position.set(lookout.x, groundHeight(lookout.x, lookout.z) + siteBeaconHeight('lookout', 15), lookout.z);
  const blink = siteGlow(0xff2a1a, 3.2);
  blink.position.set(radio.x, groundHeight(radio.x, radio.z) + siteBeaconHeight('radio', 38.6), radio.z);
  return { lamp, blink };
}

// The Breath: warm air off the buried Ember, a white column hundreds of metres tall that
// spreads into the cloud cap, with wisps curling off the vents close to.
const SITE_BREATH = {
  warmth: 6, // per second near the vents
  ventReach: 9, // how close to a vent counts as near
  ventSpread: 7, // without vent positions from the builder, vents lie within this of the centre
  every: 0.11, // seconds between column puffs
  life: 24,
  capHeight: 215,
};

function buildSiteSteam() {
  const site = siteById('breath');
  const group = new THREE.Group();
  group.position.set(site.x, groundHeight(site.x, site.z), site.z);
  const column = buildPuffs(230, 0xeef2f8);
  const cap = buildPuffs(44, 0xdfe5ee);
  const wisps = buildPuffs(56, 0xf4f6fa, true);
  group.add(column.group, cap.group, wisps.group);
  scene.add(group);
  const steam = { group, column, cap, wisps, emitT: 0, capT: 0, wispT: 0, ownWisps: !!(site.group && site.group.userData.anim && site.group.userData.anim.puffs) };
  // Start with the column already standing, as it has for decades.
  for (let i = 0; i < 300; i++) updateSiteSteam(steam, 0.1, true);
  return steam;
}

const siteSteamAt = new THREE.Vector3(), siteSteamVel = new THREE.Vector3();
function updateSiteSteam(steam, dt, near) {
  steam.emitT -= dt;
  while (steam.emitT <= 0) {
    steam.emitT += SITE_BREATH.every;
    // Wide and ragged at the foot, so it reads as one rolling column rather than a string
    // of puffs, and leaning a little with the wind as it climbs.
    siteSteamAt.set((Math.random() - 0.5) * 9, 9 + Math.random() * 4, (Math.random() - 0.5) * 9);
    steam.column.emit(siteSteamAt, siteSteamVel.set(0.4 + Math.random() * 0.8, 8 + Math.random() * 3, (Math.random() - 0.5) * 0.8 + 0.2), { life: SITE_BREATH.life * (0.8 + Math.random() * 0.25), size: 7 + Math.random() * 5, grow: 4.5, alpha: 0.42 });
  }
  // Where it meets the cloud, it flattens out and spreads.
  steam.capT -= dt;
  while (steam.capT <= 0) {
    steam.capT += 0.7;
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 3;
    siteSteamAt.set(12 + Math.random() * 10, SITE_BREATH.capHeight + Math.random() * 25, 4 + Math.random() * 6);
    steam.cap.emit(siteSteamAt, siteSteamVel.set(Math.cos(a) * s + 0.6, 0.4 + Math.random() * 0.5, Math.sin(a) * s), { life: 30, size: 34, grow: 2.2, alpha: 0.32 });
  }
  steam.column.update(dt);
  steam.cap.update(dt);
  // Close to, the vents' own wisps come from the site's builder when there is one.
  if (!near || steam.ownWisps) { steam.wisps.group.visible = false; return; }
  steam.wisps.group.visible = true;
  steam.wispT -= dt;
  while (steam.wispT <= 0) {
    steam.wispT += 0.09;
    const vent = siteBreathVents()[Math.floor(Math.random() * siteBreathVents().length)];
    siteSteamAt.set(vent.x + (Math.random() - 0.5) * 1.2, groundHeight(steam.group.position.x + vent.x, steam.group.position.z + vent.z) - steam.group.position.y + 0.2, vent.z + (Math.random() - 0.5) * 1.2);
    steam.wisps.emit(siteSteamAt, siteSteamVel.set((Math.random() - 0.5) * 0.5 + 0.3, 1.4 + Math.random() * 1.4, (Math.random() - 0.5) * 0.5), { life: 3 + Math.random() * 1.5, size: 1.1, grow: 3, alpha: 0.32 });
  }
  steam.wisps.update(dt);
}

// Where the vents are, relative to the Breath's centre in world directions: from the
// builder if it says (userData.vents, or userData.anim.vents in its turned inner group),
// otherwise a ring of likely spots.
let siteBreathVentList = null;
function siteBreathVents() {
  if (siteBreathVentList) return siteBreathVentList;
  const site = siteById('breath');
  const data = site.group ? site.group.userData : {};
  const given = data.vents || (data.anim && data.anim.vents);
  if (given && given.length) {
    const turn = (data.inner ? data.inner.rotation.y : 0) + (site.group ? site.group.rotation.y : 0);
    const c = Math.cos(turn), sn = Math.sin(turn);
    siteBreathVentList = given.map((v) => ({ x: v.x * c + v.z * sn, z: -v.x * sn + v.z * c }));
  } else {
    const rand = seededRandom(1962);
    siteBreathVentList = [{ x: 0, z: 0 }];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + rand() * 0.5, d = 2.5 + rand() * (SITE_BREATH.ventSpread - 2.5);
      siteBreathVentList.push({ x: Math.cos(a) * d, z: Math.sin(a) * d });
    }
  }
  return siteBreathVentList;
}

// Warmth by the vents: full within reach of one, fading a few metres past it.
function siteBreathWarmth() {
  const site = siteById('breath');
  const dx = player.pos.x - site.x, dz = player.pos.z - site.z;
  if (dx * dx + dz * dz > 900) return 0;
  let best = Infinity;
  for (const v of siteBreathVents()) best = Math.min(best, Math.hypot(dx - v.x, dz - v.z));
  return SITE_BREATH.warmth * (1 - smooth((best - SITE_BREATH.ventReach) / 4));
}

/* ---------- The view from the lookout ---------- */
const SITE_LOOKOUT = {
  ladderZ: 3.05, // where she climbs: just outside the rungs, out from the tower's centre on its +z side
  floor: 12, // the cab floor, above the ground at the tower's centre
  eye: 1.55,
  climb: 2.8, // seconds on the ladder
  rise: 5.4, // how far up the ladder that shot follows her
  cab: 2.6, // at the window, over her shoulder
  pan: 13, // the slow turn round the crater
  glass: 3.4, // the Breath through the binoculars
  out: 0.8, // fade out, then she's back at the foot of the ladder
  fog: 0.0032, // the fog thins while she looks out
  caption: 1.25, // seconds each place's name stays up
};

const lookoutScene = { active: false, t: 0, yaw0: 0, announced: new Set(), beats: new Set(), queue: [], capT: 0, captioned: false, rungT: 0, wind: null, first: false, pings: [] };
const lookoutZero = new THREE.Vector3(), lookoutTarget = new THREE.Vector3(), lookoutCam = new THREE.Vector3(), lookoutLook = new THREE.Vector3();

function lookoutTimes() {
  const L = SITE_LOOKOUT;
  const cab = L.climb, pan = cab + L.cab, glass = pan + L.pan, out = glass + L.glass;
  return { cab, pan, glass, out, end: out + L.out };
}

function startLookoutClimb() {
  if (game.state !== 'playing' || lookoutScene.active) return;
  const site = siteById('lookout');
  Object.assign(lookoutScene, { active: true, t: 0, capT: 0, captioned: false, rungT: 0, queue: [], first: !siteState.lookoutClimbed });
  lookoutScene.announced.clear();
  lookoutScene.beats.clear();
  for (const ping of lookoutScene.pings) ping.at = null;
  // Start just west of the Breath, so the turn sweeps across the steam first.
  const breath = siteById('breath');
  lookoutScene.yaw0 = Math.atan2(breath.x - site.x, breath.z - site.z) + 0.5;
  Object.assign(player, { stride: 0, runBlend: 0, aimT: 0, drawing: false, dodge: null });
  lookoutScene.tool = survival.tool;
  survival.tool = 'bow';
  player.bodyYaw = player.yaw = Math.PI;
  lookoutScene.wind = Sfx.loop({ noise: 0.55, filter: 750 });
  playScene({ update: updateLookoutScene, skip: () => finishLookoutScene() });
  $('flash').className = 'black';
  $('flash').style.opacity = 1;
}

// Climbing: hands reaching up the rails in turn, knees lifting, eyes on the rungs above.
function poseLookoutClimb(dt, phase) {
  poseAvatar(dt, lookoutZero, false);
  const { legL, legR, armL, armR, chest, head } = avatar;
  const a = Math.sin(phase), b = -a;
  legL.thigh.rotation.x = -0.75 - 0.55 * a;
  legL.shin.rotation.x = 1.0 + 0.7 * a;
  legR.thigh.rotation.x = -0.75 - 0.55 * b;
  legR.shin.rotation.x = 1.0 + 0.7 * b;
  chest.rotation.x = 0.14;
  head.rotation.x = -0.45;
  for (const [arm, side, s] of [[armL, 1, b], [armR, -1, a]]) {
    const shoulder = arm.upper.position;
    lookoutTarget.set(shoulder.x - side * 0.04, shoulder.y + 0.24 + 0.18 * s, 0.26);
    solveArm(arm, lookoutTarget, side > 0 ? POLE_L : POLE_R);
    arm.hand.quaternion.identity();
  }
  avatar.simulate(dt);
}

function setLookoutFade(amount) {
  const el = $('flash');
  if (amount > 0.002) { el.className = 'black'; el.style.opacity = amount; } else if (el.className === 'black') { el.className = ''; el.style.opacity = ''; }
}

function setLookoutFov(fov) {
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

function updateLookoutScene(dt) {
  const s = lookoutScene, L = SITE_LOOKOUT, T = lookoutTimes();
  s.t += dt;
  game.time += dt;
  updateFires(dt);
  updateWreck(dt);
  const t = s.t;
  const site = siteById('lookout');
  const g = groundHeight(site.x, site.z), floor = g + L.floor;
  setLookoutFade(Math.max(1 - t / 0.45, span(t, T.out, T.end)));
  // The fog thins once she's up, and thickens again as she goes back down.
  scene.fog.density = lerp(FOG_DENSITY, L.fog, span(t, T.cab, T.cab + 1.2) * (1 - span(t, T.out, T.end)));

  if (t < T.cab) {
    // Up the ladder, from below.
    const rise = L.rise * smooth(t / L.climb * 0.9 + 0.05);
    player.pos.set(site.x, g + rise, site.z + L.ladderZ);
    player.bodyYaw = Math.PI;
    poseLookoutClimb(dt, rise / 0.32 * Math.PI);
    s.rungT -= dt;
    if (s.rungT <= 0) { s.rungT = 0.32; Sfx.ladderRung(); }
    lookoutCam.set(site.x + 3.4, g + 1.1 + rise * 0.35, site.z + 8);
    lookoutLook.set(site.x, g + rise + 1.3, site.z + L.ladderZ);
    setLookoutFov(52);
  } else if (t < T.pan) {
    // In the cab, at the north window, the wind getting in.
    lookoutBeat('cab', () => { s.wind.set(0.45, 1); avatar.reset(); });
    player.pos.set(site.x - 0.2, floor, site.z - 0.9);
    player.bodyYaw = Math.PI;
    player.pitch = -0.08;
    poseAvatar(dt, lookoutZero, false);
    avatar.simulate(dt);
    const u = (t - T.cab) / L.cab;
    lookoutCam.set(site.x + 0.7 - u * 0.2, floor + 1.75, site.z + 1.1 - u * 0.3);
    lookoutLook.set(site.x - 0.6, floor + 1.25, site.z - 8);
    setLookoutFov(56);
  } else if (t < T.glass) {
    // Her view: one slow turn round the whole crater. Each place is marked as it comes past.
    avatar.setVisible(false);
    const u = (t - T.pan) / L.pan;
    const turned = Math.PI * 2 * (u - Math.sin(u * Math.PI * 2) / (Math.PI * 2));
    const yaw = s.yaw0 - turned;
    lookoutCam.set(site.x + Math.sin(yaw) * 0.5, floor + L.eye + Math.sin(t * 0.7) * 0.02, site.z + Math.cos(yaw) * 0.5);
    lookoutLook.set(lookoutCam.x + Math.sin(yaw) * 10, lookoutCam.y - 0.9, lookoutCam.z + Math.cos(yaw) * 10);
    setLookoutFov(54);
    for (const other of SITES) {
      if (other === site || s.announced.has(other.id)) continue;
      const bearing = Math.atan2(other.x - site.x, other.z - site.z);
      const ahead = ((s.yaw0 - bearing) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (turned >= ahead) announceLookoutSite(other, site);
    }
  } else {
    // Through the binoculars: the Breath's column, close.
    const breath = siteById('breath');
    const yaw = Math.atan2(breath.x - site.x, breath.z - site.z);
    lookoutCam.set(site.x + Math.sin(yaw) * 0.5, floor + L.eye, site.z + Math.cos(yaw) * 0.5);
    lookoutLook.set(breath.x, groundHeight(breath.x, breath.z) + 55 + span(t, T.glass, T.out) * 25, breath.z);
    setLookoutFov(lerp(54, 11, span(t, T.glass, T.glass + 1.1)));
    lookoutBeat('glass', () => {
      s.queue.length = 0;
      caption(s.first ? 'Ranger\'s binoculars, still hanging by the window.' : 'The Breath, through the ranger\'s glasses.', 'place');
      s.captioned = true;
      s.capT = L.glass;
    });
  }

  // Names of the places as they come past, one at a time.
  s.capT -= dt;
  if (s.capT <= 0) {
    const next = s.queue.shift();
    // With a backlog (several places in nearly the same direction) each name goes by
    // quicker, so the words keep up with the view.
    if (next) { caption(next, 'place'); s.captioned = true; s.capT = s.queue.length ? L.caption * 0.6 : L.caption; } else if (s.captioned) { caption(''); s.captioned = false; }
  }

  camera.up.set(0, 1, 0);
  camera.position.copy(lookoutCam);
  camera.lookAt(lookoutLook);
  if (t >= T.cab) world.stream(lookoutCam, 2, 230);
  if (t >= T.end) finishLookoutScene();
}

// Runs fn once per climb, at the first frame it's reached.
function lookoutBeat(key, fn) {
  if (lookoutScene.beats.has(key)) return;
  lookoutScene.beats.add(key);
  fn();
}

function announceLookoutSite(other, from) {
  lookoutScene.announced.add(other.id);
  revealSite(other.id);
  const ping = lookoutScene.pings.find((p) => p.site === other);
  if (ping) ping.at = game.time;
  Sfx.sitePing();
  const dx = other.x - from.x, dz = other.z - from.z;
  lookoutScene.queue.push(`${other.name}, ${siteCompassWord(dx, dz)}, ${siteDistanceText(Math.hypot(dx, dz))}`);
}

// Ends the climb, whether it played out or was skipped: every place is on her map, the
// binoculars are hers, and she's back at the foot of the ladder.
function finishLookoutScene() {
  const s = lookoutScene;
  if (!s.active) return;
  s.active = false;
  const site = siteById('lookout');
  for (const other of SITES) revealSite(other.id);
  for (const ping of s.pings) ping.at = null;
  if (s.wind) { s.wind.stop(); s.wind = null; }
  scene.fog.density = FOG_DENSITY;
  setLookoutFade(0);
  player.pos.set(site.x, groundHeight(site.x, site.z + 3.9), site.z + 3.9);
  player.yaw = player.bodyYaw = 0;
  player.pitch = 0.05;
  avatar.setVisible(true);
  if (lookoutScene.tool) { survival.tool = lookoutScene.tool; lookoutScene.tool = null; }
  poseAvatar(1 / 60, lookoutZero, false);
  avatar.reset();
  endScene();
  if (!siteState.lookoutClimbed) {
    siteState.lookoutClimbed = true;
    if (!hasItem('binoculars')) packAdd('binoculars', 1);
    emitGame('lookoutClimbed');
  }
}

/* ---------- Building it all ---------- */
function buildSite(site) {
  const builder = SITE_BUILDERS[site.id];
  if (!builder) return null;
  let group = null;
  try {
    group = builder(site);
  } catch (err) {
    console.warn(`Couldn't build site "${site.id}"`, err);
    return null;
  }
  if (!group) return null;
  // Builders work around the site's centre; set it on the ground unless the builder did.
  if (group.position.lengthSq() === 0) group.position.set(site.x, groundHeight(site.x, site.z), site.z);
  scene.add(group);
  return group;
}

const siteSlope = new THREE.Vector3(), siteTilt = new THREE.Quaternion();

function initSites() {
  for (const site of SITES) {
    site.name = siteName(site.id);
    site.y = groundHeight(site.x, site.z);
    site.group = buildSite(site);
  }
  for (const poi of POINTS_OF_INTEREST) {
    const g = SITE_POI_BUILDERS[poi.kind](poi);
    g.position.set(poi.x, poi.y, poi.z);
    g.rotation.y += poi.ry || 0;
    // Low things lie with the slope; posts and stacks stand straight.
    if (SITE_POI_TILTED.has(poi.kind)) {
      const e = 0.9;
      siteSlope.set(groundHeight(poi.x - e, poi.z) - groundHeight(poi.x + e, poi.z), 2 * e, groundHeight(poi.x, poi.z - e) - groundHeight(poi.x, poi.z + e)).normalize();
      g.quaternion.premultiply(siteTilt.setFromUnitVectors(siteRodUp, siteSlope));
      g.position.y -= 0.03;
    }
    scene.add(g);
    poi.group = g;
    if (poi.kind === 'sign') addInteractable({ x: poi.x, z: poi.z, r: 2.2, label: 'Press E to read the signpost', use: () => readSiteSignpost(poi) });
  }
  siteState.nooks = SITE_SHARDS.map(([x, z]) => {
    const g = buildSiteShardNook(x, z);
    scene.add(g);
    return { x, z, group: g };
  });

  siteState.beacons = buildSiteBeacons();
  siteState.steam = buildSiteSteam();
  // Markers that light up over each place as she spots it from the lookout.
  lookoutScene.pings = SITES.map((site) => {
    const ring = siteGlow(0xffd27a, 2.2, getSiteRingTexture());
    const dot = siteGlow(0xffe2a8, 2.4);
    const y = groundHeight(site.x, site.z) + 40;
    ring.position.set(site.x, y, site.z);
    dot.position.set(site.x, y, site.z);
    ring.material.depthTest = dot.material.depthTest = false;
    ring.visible = dot.visible = false;
    return { site, ring, dot, at: null };
  });

  const lookout = siteById('lookout');
  addInteractable({
    x: lookout.x, z: lookout.z + 3.4, r: 2.2,
    label: () => (siteState.lookoutClimbed ? 'Press E to climb up and look out again' : 'Press E to climb the lookout tower'),
    use: startLookoutClimb,
  });
  HEAT_SOURCES.push(siteBreathWarmth);
  // The places she's seen up close in the forest go on her map too.
  if (typeof MAP_MARKERS !== 'undefined') {
    const icon = { sign: 'sign', meteor: 'shard' };
    MAP_MARKERS.push(() => POINTS_OF_INTEREST.filter((p) => p.seen).map((p) => ({ x: p.x, z: p.z, kind: icon[p.kind] || 'poi', label: p.name })));
  }

  // Beacons, steam and moving parts keep going wherever the world is drawn (the title, the
  // intro, scenes), not only while she plays, so they ride on the world's own update.
  const worldUpdate = world.update;
  world.update = (dt, time, cameraPos, focus) => {
    worldUpdate(dt, time, cameraPos, focus);
    updateSiteVisuals(dt, cameraPos);
  };
}

function resetSites() {
  for (const site of SITES) { site.discovered = false; site.revealed = false; }
  for (const poi of POINTS_OF_INTEREST) poi.seen = false;
  siteState.lookoutClimbed = false;
  if (lookoutScene.active) {
    lookoutScene.active = false;
    if (lookoutScene.wind) { lookoutScene.wind.stop(); lookoutScene.wind = null; }
    scene.fog.density = FOG_DENSITY;
    setLookoutFade(0);
  }
  for (const ping of lookoutScene.pings) ping.at = null;
}

// Discovery: walking into a site's radius finds it. Runs while she plays.
function updateSites(dt) {
  const p = player.pos;
  for (const site of SITES) {
    if (!site.discovered && Math.hypot(site.x - p.x, site.z - p.z) < site.radius) discoverSite(site);
  }
  for (const poi of POINTS_OF_INTEREST) {
    if (!poi.seen && Math.hypot(poi.x - p.x, poi.z - p.z) < SITE_VIEW.poiSeen) poi.seen = true;
  }
}

function setSiteVisible(obj, visible) {
  if (obj.visible !== visible) obj.visible = visible;
}

// Distance culling, beacons, steam and the sites' animations, each frame the world is drawn.
function updateSiteVisuals(dt, cam) {
  if (!siteState.beacons) return;
  const time = game.time;
  const animators = typeof SITE_ANIMATORS !== 'undefined' ? SITE_ANIMATORS : null;
  for (const site of SITES) {
    if (!site.group) continue;
    const near = Math.hypot(site.x - cam.x, site.z - cam.z) < SITE_VIEW.cull;
    setSiteVisible(site.group, near);
    const animate = animators && animators[site.id];
    if (near && animate && !siteState.brokenAnimators.has(site.id)) {
      // One broken animation shouldn't take the game down with it, or flood the console.
      try { animate(site.group, dt, time); } catch (err) { siteState.brokenAnimators.add(site.id); console.warn(`Site animation "${site.id}" stopped`, err); }
    }
  }
  for (const poi of POINTS_OF_INTEREST) {
    const near = Math.hypot(poi.x - cam.x, poi.z - cam.z) < SITE_VIEW.poiCull;
    setSiteVisible(poi.group, near);
    if (near && poi.group.userData.swing) {
      poi.group.userData.swing.rotation.set(Math.sin(time * 0.9 + 1) * 0.07, 0, Math.sin(time * 1.3) * 0.1);
      poi.group.userData.sonde.rotation.y = Math.sin(time * 0.4) * 0.6;
    }
  }
  for (const nook of siteState.nooks) setSiteVisible(nook.group, Math.hypot(nook.x - cam.x, nook.z - cam.z) < SITE_VIEW.nookCull);
  // The star-iron glows a little brighter and dimmer, like embers breathing.
  getSiteMats().crystal.emissiveIntensity = 1.5 + Math.sin(time * 1.3) * 0.35;

  // The lookout's lamp turns slowly, flaring each time it faces her; the mast blinks red.
  // Far off they show through everything; close to, the tower and trees hide them as they should.
  const { lamp, blink } = siteState.beacons;
  const ld = lamp.position.distanceTo(cam);
  const beam = time * 0.7;
  const dx = (cam.x - lamp.position.x) / (ld || 1), dz = (cam.z - lamp.position.z) / (ld || 1);
  const facing = Math.pow(Math.max(0, Math.sin(beam) * dx + Math.cos(beam) * dz), 8);
  lamp.material.depthTest = ld < 120;
  lamp.material.opacity = 0.55 + 0.45 * facing;
  lamp.scale.setScalar(Math.max(1.4, ld * 0.015) * (1 + facing * 0.9));
  const bd = blink.position.distanceTo(cam);
  const cycle = (((time % 1.6) + 1.6) % 1.6) / 1.6;
  // In step with the mast's own lamp, which is lit for the first quarter of each beat.
  const on = smooth(cycle / 0.04) * (1 - smooth((cycle - 0.21) / 0.06));
  blink.material.depthTest = bd < 150;
  blink.material.opacity = 0.08 + on * 0.92;
  blink.scale.setScalar(Math.max(1.4, bd * 0.02) * (0.7 + on * 0.3));

  const breath = siteById('breath');
  updateSiteSteam(siteState.steam, dt, Math.hypot(breath.x - cam.x, breath.z - cam.z) < 200);

  // The lookout's markers: a ring that swells and fades, leaving a steady point.
  for (const ping of lookoutScene.pings) {
    const shown = ping.at !== null;
    setSiteVisible(ping.ring, shown);
    setSiteVisible(ping.dot, shown);
    if (!shown) continue;
    const age = time - ping.at;
    const d = ping.dot.position.distanceTo(cam);
    ping.ring.scale.setScalar(d * (0.012 + smooth(age / 1.2) * 0.05));
    ping.ring.material.opacity = 1 - smooth(age / 1.4);
    ping.dot.scale.setScalar(d * 0.011 * (1 + Math.max(0, 1 - age * 2) * 1.5));
    ping.dot.material.opacity = 0.75 + Math.sin(time * 4 + ping.site.x) * 0.2;
  }
}
