// Terrain, forest, sky, fog, landmarks and falling snow.
const WORLD_RADIUS = 1000;
const FOG_COLOR = 0x98a5c2;
const FOG_DENSITY = 0.0275;
const FOREST_RADIUS = WORLD_RADIUS + 35;
// The map is too big to build at once, so terrain and forest are built in square tiles
// around the player and thrown away once she has moved on.
const TILE = 64;
const TILE_SEGMENTS = 48;
const LOAD_RADIUS = 125;
const UNLOAD_RADIUS = 175;

const worldUniforms = { uTime: { value: 0 } };

const LANDMARKS = {
  start: { x: 0, z: 760 },
  altar: { x: 0, z: -700 },
};

// Landmarks that block movement. The tile they stand in adds them with its own colliders.
const LANDMARK_COLLIDERS = [{ x: LANDMARKS.altar.x, z: LANDMARKS.altar.z, r: 2.6, h: 4 }];

// Height fog: the same density curve for every material, thickest near the ground.
THREE.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\nvarying float vFogDepth;\nvarying float vFogHeight;\n#endif';
THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\nvFogDepth = -mvPosition.z;\nvFogHeight = (inverse(viewMatrix) * vec4(mvPosition.xyz, 1.0)).y;\n#endif';
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
uniform vec3 fogColor;
varying float vFogDepth;
varying float vFogHeight;
uniform float fogDensity;
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
float fogAmount = fogDensity * (1.0 + 1.05 * exp(-max(vFogHeight, 0.0) * 0.2));
float fogFactor = 1.0 - exp(-fogAmount * fogAmount * vFogDepth * vFogDepth);
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;

// Smooth 2D value noise in the range -1..1.
function hash2(ix, iz) {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const tx = x - ix, tz = z - iz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

const FLAT_SPOTS = [[LANDMARKS.start, 9, 24], [LANDMARKS.altar, 26, 42]];

function groundHeight(x, z) {
  const ridge = 1 - Math.abs(valueNoise(x / 46 + 3.1, z / 46 + 9.2));
  // Broad hills and valleys across the whole map, under the local bumps.
  let h = 16 * valueNoise(x / 380 - 5.3, z / 380 + 2.2)
    + 6.2 * valueNoise(x / 72, z / 72)
    + 2.6 * valueNoise(x / 31 + 11.4, z / 31 - 7.3)
    + 4.2 * ridge * ridge - 1.7
    + 0.62 * valueNoise(x / 11 - 4.2, z / 11 + 2.6)
    + 0.13 * valueNoise(x / 4.3 + 8.8, z / 4.3 + 1.7);
  // Landmarks and the start sit on gentler ground.
  for (const [spot, inner, outer] of FLAT_SPOTS) {
    const d = Math.hypot(x - spot.x, z - spot.z);
    if (d < outer) h *= 0.12 + 0.88 * THREE.MathUtils.smoothstep(d, inner, outer);
  }
  const r = Math.hypot(x, z);
  if (r > WORLD_RADIUS) h += Math.min((r - WORLD_RADIUS) ** 2 * 0.05, 26);
  return h;
}

// Colliders are bucketed by cell so movement only tests what is nearby. A tile owns the
// cells inside it, so they go when the tile does. `h` is how tall the obstacle stands.
const colliders = new Map();
const CELL = 8;

function addCollider(x, z, r, h = 3) {
  const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  if (!colliders.has(key)) colliders.set(key, []);
  const collider = { x, z, r, h };
  colliders.get(key).push(collider);
  return collider;
}

function removeCollider(collider) {
  const bucket = colliders.get(`${Math.floor(collider.x / CELL)},${Math.floor(collider.z / CELL)}`);
  if (bucket && bucket.includes(collider)) bucket.splice(bucket.indexOf(collider), 1);
}

function clearTileColliders(tx, tz) {
  const per = TILE / CELL;
  for (let i = 0; i < per; i++) {
    for (let j = 0; j < per; j++) colliders.delete(`${tx * per + i},${tz * per + j}`);
  }
}

function nearbyColliders(x, z) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  const found = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const bucket = colliders.get(`${cx + i},${cz + j}`);
      if (bucket) found.push(...bucket);
    }
  }
  return found;
}

function pushOutOfColliders(pos, radius) {
  for (const c of nearbyColliders(pos.x, pos.z)) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-5) {
      const d = Math.sqrt(d2);
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }
}

/* ---------- Sky ---------- */
function buildSky() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uHorizon: { value: new THREE.Color(FOG_COLOR) },
        uZenith: { value: new THREE.Color(0x66779f) },
        uSunDir: { value: new THREE.Vector3(-0.42, 0.72, 0.55).normalize() },
      },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunDir; varying vec3 vDir;
        void main() {
          vec3 dir = normalize(vDir);
          vec3 c = mix(uHorizon, uZenith, smoothstep(0.0, 0.6, dir.y));
          c += vec3(0.5, 0.52, 0.58) * pow(max(dot(dir, uSunDir), 0.0), 7.0) * 0.8;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}

function buildEnvironment(renderer, scene) {
  const envScene = new THREE.Scene();
  envScene.add(buildSky());
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8c97b5, fog: false }));
  ground.position.y = -1;
  envScene.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04, 1, 900).texture;
  pmrem.dispose();
}

/* ---------- Geometry helpers ---------- */
class GeometryBuilder {
  constructor() { this.position = []; this.normal = []; this.uv = []; this.color = []; }

  addMesh(geo, matrix, shade = 1) {
    const flat = (geo.index ? geo.toNonIndexed() : geo).clone();
    if (matrix) flat.applyMatrix4(matrix);
    const { position: p, normal: n, uv: t } = flat.attributes;
    for (let i = 0; i < p.count; i++) {
      this.position.push(p.getX(i), p.getY(i), p.getZ(i));
      this.normal.push(n.getX(i), n.getY(i), n.getZ(i));
      this.uv.push(t.getX(i), t.getY(i));
      this.color.push(shade, shade, shade);
    }
  }

  addVertex(p, n, u, v, shade) {
    this.position.push(p.x, p.y, p.z);
    this.normal.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    this.color.push(shade, shade, shade);
  }

  build() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    return geo;
  }
}

function barkCylinder(builder, start, end, r0, r1, sides = 7) {
  const dir = end.clone().sub(start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, sides, 2, true);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * len * 0.45);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.compose(start.clone().add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  builder.addMesh(geo, m);
}

// One bough: a card bent once so it droops towards the tip.
function addBough(builder, y, azimuth, length, width, droopIn, droopOut, roll, shadeIn, shadeOut, origin = 0) {
  const up = new THREE.Vector3(0, 1, 0);
  const out = new THREE.Vector3(Math.sin(azimuth), 0, Math.cos(azimuth));
  const side = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)).multiplyScalar(Math.cos(roll)).addScaledVector(up, Math.sin(roll));
  const along = (droop) => out.clone().multiplyScalar(Math.cos(droop)).addScaledVector(up, -Math.sin(droop));
  const p0 = out.clone().multiplyScalar(origin).setY(y);
  const p1 = p0.clone().addScaledVector(along(droopIn), length * 0.5);
  const p2 = p1.clone().addScaledVector(along(droopOut), length * 0.5);
  const normal = up.clone().multiplyScalar(0.85).addScaledVector(out, 0.5).normalize();
  const rows = [[p0, 0, shadeIn], [p1, 0.5, (shadeIn + shadeOut) / 2], [p2, 1, shadeOut]];
  const half = width / 2;
  for (let r = 0; r < 2; r++) {
    const [a, va, sa] = rows[r];
    const [b, vb, sb] = rows[r + 1];
    const al = a.clone().addScaledVector(side, -half), ar = a.clone().addScaledVector(side, half);
    const bl = b.clone().addScaledVector(side, -half), br = b.clone().addScaledVector(side, half);
    builder.addVertex(al, normal, 0, va, sa);
    builder.addVertex(ar, normal, 1, va, sa);
    builder.addVertex(br, normal, 1, vb, sb);
    builder.addVertex(al, normal, 0, va, sa);
    builder.addVertex(br, normal, 1, vb, sb);
    builder.addVertex(bl, normal, 0, vb, sb);
  }
}

function buildConifer(seed, { height, radius, whorls, perWhorl, bare, droop, trunk }) {
  const rand = seededRandom(seed);
  const bark = new GeometryBuilder(), boughs = new GeometryBuilder();
  barkCylinder(bark, new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, height * 0.92, 0), trunk, trunk * 0.1);
  let spin = rand() * 6.28;
  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1);
    const y = lerp(height * bare, height * 0.97, t);
    const length = radius * Math.pow(1 - t, 0.8) * (0.85 + rand() * 0.3) + 0.35;
    const shadeIn = lerp(0.34, 0.72, t);
    const count = t > 0.8 ? 3 : perWhorl;
    for (let i = 0; i < count; i++) {
      spin += 2.4 + rand() * 0.5;
      addBough(boughs, y + (rand() - 0.5) * 0.25, spin, length * (0.85 + rand() * 0.3), length * 0.82 + 0.25,
        droop * lerp(1.2, 0.2, t) - 0.08 + rand() * 0.12, droop * lerp(1.7, 0.45, t) + rand() * 0.18,
        (rand() - 0.5) * 0.7, shadeIn, 1.08);
    }
  }
  for (let i = 0; i < 3; i++) addBough(boughs, height * 0.95, i * 2.1, 0.75, 0.42, -1.15, -1.3, 0.2, 0.8, 1.05);
  return { bark: bark.build(), boughs: boughs.build() };
}

function buildBareTree(seed, height, trunk, limbs) {
  const rand = seededRandom(seed);
  const bark = new GeometryBuilder();
  barkCylinder(bark, new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0.12, height, 0.08), trunk, trunk * 0.18);
  for (let i = 0; i < limbs; i++) {
    const t = 0.3 + rand() * 0.65;
    const a = rand() * 6.28;
    const len = lerp(2.6, 0.9, t) * (0.7 + rand() * 0.6);
    const start = new THREE.Vector3(0.12 * t, height * t, 0.08 * t);
    const mid = start.clone().add(new THREE.Vector3(Math.sin(a) * len * 0.6, len * 0.42, Math.cos(a) * len * 0.6));
    const tip = mid.clone().add(new THREE.Vector3(Math.sin(a + 0.5) * len * 0.5, len * 0.32, Math.cos(a + 0.5) * len * 0.5));
    const r = trunk * lerp(0.35, 0.16, t);
    barkCylinder(bark, start, mid, r, r * 0.55, 5);
    barkCylinder(bark, mid, tip, r * 0.55, r * 0.14, 4);
  }
  return { bark: bark.build(), boughs: null };
}

function buildShrub(seed) {
  const rand = seededRandom(seed);
  const builder = new GeometryBuilder();
  for (let i = 0; i < 11; i++) {
    addBough(builder, 0.05 + rand() * 0.25, i * 2.4 + rand(), 0.75 + rand() * 0.5, 0.65, -0.55 + rand() * 0.25, 0.55 + rand() * 0.4, (rand() - 0.5) * 0.8, 0.55, 1.05);
  }
  return builder.build();
}

function buildRock() {
  const rand = seededRandom(99);
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const v = new THREE.Vector3();
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 0.78 + rand() * 0.42);
    v.multiplyScalar(offsets.get(key));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
    const snow = THREE.MathUtils.smoothstep(v.y, 0.28, 0.5);
    colors.set([lerp(1, 2.9, snow), lerp(1, 3, snow), lerp(1, 3.1, snow)], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function buildLog() {
  const bark = new GeometryBuilder();
  barkCylinder(bark, new THREE.Vector3(-2.6, 0, 0), new THREE.Vector3(2.6, 0, 0), 0.3, 0.22, 8);
  const geo = bark.build();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const snow = THREE.MathUtils.smoothstep(nrm.getY(i), 0.2, 0.6);
    col.setXYZ(i, lerp(1, 5, snow), lerp(1, 5.2, snow), lerp(1, 5.5, snow));
  }
  return geo;
}

/* ---------- Materials ---------- */
function swayMaterial(params) {
  const material = new THREE.MeshStandardMaterial(params);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'uniform float uTime;\n#include <common>')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float swayPhase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
        transformed.xz += sin(uTime * 0.85 + swayPhase) * position.y * 0.0065 * vec2(1.0, 0.6);
        #endif`);
    // Branches right in front of the camera dissolve so they can't block the view.
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      float nearFade = smoothstep(1.3, 3.8, length(vViewPosition));
      if (nearFade < 1.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > nearFade) discard;`);
  };
  material.customProgramCacheKey = () => 'sway';
  return material;
}

/* ---------- Forest ---------- */
const weatherMaterials = [];

// Open ground with no trees: the start, the altar, and spots added during a run, such as
// where the plane came down.
const CLEARINGS = [[LANDMARKS.start, 7], [LANDMARKS.altar, 24]];
// Trees cut down this run, by id, so a tile built again leaves them out.
const felledTrees = new Set();

function inClearing(x, z, extra = 0) {
  return CLEARINGS.some(([p, r]) => Math.hypot(x - p.x, z - p.z) < r + extra);
}

// Shared tree, shrub, rock and log shapes and materials. Every tile reuses them.
function buildForestKit() {
  const barkMat = new THREE.MeshStandardMaterial({ map: TEX.bark.color, normalMap: TEX.bark.normal, roughness: 0.95, vertexColors: true });
  const birchMat = new THREE.MeshStandardMaterial({ map: TEX.birch.color, normalMap: TEX.birch.normal, roughness: 0.85, vertexColors: true });
  const foliage = (map) => swayMaterial({ map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.92, vertexColors: true, envMapIntensity: 0.85 });
  const greenMat = foliage(TEX.boughGreen);
  const snowyMat = foliage(TEX.boughSnowy);
  return {
    species: [
      { weight: 0.3, geo: buildConifer(1, { height: 11.5, radius: 3, whorls: 15, perWhorl: 5, bare: 0.1, droop: 0.42, trunk: 0.27 }), height: 11.5, leaves: greenMat, bark: barkMat, collide: 0.36, size: [0.75, 1.45], tint: [0.8, 1.05] },
      { weight: 0.2, geo: buildConifer(2, { height: 15, radius: 2.1, whorls: 19, perWhorl: 4, bare: 0.12, droop: 0.72, trunk: 0.25 }), height: 15, leaves: greenMat, bark: barkMat, collide: 0.33, size: [0.8, 1.4], tint: [0.65, 0.95] },
      { weight: 0.1, geo: buildConifer(3, { height: 17, radius: 3.5, whorls: 9, perWhorl: 5, bare: 0.58, droop: 0.2, trunk: 0.34 }), height: 17, leaves: greenMat, bark: barkMat, collide: 0.44, size: [0.85, 1.3], tint: [0.9, 1.15] },
      { weight: 0.14, geo: buildConifer(4, { height: 4.6, radius: 1.5, whorls: 9, perWhorl: 4, bare: 0.08, droop: 0.5, trunk: 0.09 }), height: 4.6, leaves: greenMat, bark: barkMat, collide: 0.14, size: [0.6, 1.5], tint: [0.9, 1.2] },
      { weight: 0.17, geo: buildConifer(5, { height: 9.5, radius: 2.5, whorls: 12, perWhorl: 5, bare: 0.08, droop: 0.82, trunk: 0.22 }), height: 9.5, leaves: snowyMat, bark: barkMat, collide: 0.3, size: [0.7, 1.4], tint: [0.9, 1.05] },
      { weight: 0.05, geo: buildBareTree(6, 12, 0.26, 11), height: 12, leaves: null, bark: barkMat, collide: 0.33, size: [0.7, 1.2], tint: [0.6, 0.95] },
      { weight: 0.04, geo: buildBareTree(7, 11, 0.16, 15), height: 11, leaves: null, bark: birchMat, collide: 0.22, size: [0.8, 1.25], tint: [0.85, 1.05] },
    ],
    shrubs: [{ geo: buildShrub(201), mat: snowyMat }, { geo: buildShrub(202), mat: greenMat }],
    rock: buildRock(),
    stoneMat: new THREE.MeshStandardMaterial({ map: TEX.stone.color, normalMap: TEX.stone.normal, roughness: 0.92, vertexColors: true }),
    log: buildLog(),
    barkMat,
  };
}

function makeInstances(geometry, material, placements, castShadow, tints) {
  if (!placements.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const m = new THREE.Object3D();
  placements.forEach((p, n) => {
    m.position.set(p.x, p.y, p.z);
    m.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    m.scale.set(p.sx, p.sy, p.sz);
    m.updateMatrix();
    mesh.setMatrixAt(n, m.matrix);
    if (tints) mesh.setColorAt(n, p.tint);
  });
  mesh.computeBoundingSphere();
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

// Fills one tile with trees, undergrowth, rocks and logs. The same tile always grows the
// same way, so a tile that is thrown away and built again looks unchanged.
function plantTile(kit, tx, tz) {
  const rand = seededRandom(Math.imul(tx, 92837111) ^ Math.imul(tz, 689287499) ^ 1234);
  const x0 = tx * TILE, z0 = tz * TILE;
  const inForest = (x, z) => Math.hypot(x, z) < FOREST_RADIUS;
  // Fractional counts round up or down at random, so the average density holds.
  const amount = (n) => Math.floor(n + rand());
  const meshes = [];
  for (const c of LANDMARK_COLLIDERS) {
    if (Math.floor(c.x / TILE) === tx && Math.floor(c.z / TILE) === tz) addCollider(c.x, c.z, c.r, c.h);
  }
  const add = (mesh) => { if (mesh) meshes.push(mesh); };

  // Spacing grid keeps trunks apart; clump noise leaves thick stands and small glades.
  const occupied = new Set();
  const clump = (x, z) => 0.5 + 0.28 * Math.sin(x * 0.083 + 2) * Math.cos(z * 0.071) + 0.22 * Math.sin((x + z) * 0.031);
  for (const s of kit.species) s.placements = [];
  // Each standing tree, so it can be found and cut down.
  const trees = [];
  for (let attempt = 0; attempt < 250; attempt++) {
    const x = x0 + rand() * TILE, z = z0 + rand() * TILE;
    if (!inForest(x, z) || inClearing(x, z) || rand() > clump(x, z) + 0.28) continue;
    const key = `${Math.floor(x / 1.9)},${Math.floor(z / 1.9)}`;
    if (occupied.has(key)) continue;
    occupied.add(key);

    let pick = rand();
    let kind = kit.species[0];
    for (const s of kit.species) { pick -= s.weight; if (pick <= 0) { kind = s; break; } }
    const s = lerp(kind.size[0], kind.size[1], rand());
    const shade = lerp(kind.tint[0], kind.tint[1], rand());
    const placement = {
      x, z,
      y: groundHeight(x, z),
      ry: rand() * 6.28,
      rx: (rand() - 0.5) * 0.05,
      rz: (rand() - 0.5) * 0.05,
      sx: s, sy: s * (0.88 + rand() * 0.3), sz: s,
      tint: new THREE.Color(shade * (0.94 + rand() * 0.1), shade, shade * (0.94 + rand() * 0.12)),
    };
    // A felled tree still draws its random numbers, so the trees after it grow unchanged.
    const id = `${tx},${tz},${attempt}`;
    if (felledTrees.has(id)) continue;
    const collider = addCollider(x, z, kind.collide * s, kind.height * s);
    trees.push({ id, kind, placement, index: kind.placements.length, collider, r: kind.collide * s, height: kind.height * placement.sy });
    kind.placements.push(placement);
  }
  for (const kind of kit.species) {
    const bark = makeInstances(kind.geo.bark, kind.bark, kind.placements, true, true);
    const leaves = kind.leaves ? makeInstances(kind.geo.boughs, kind.leaves, kind.placements, true, true) : null;
    add(bark);
    add(leaves);
    for (const tree of trees) if (tree.kind === kind) Object.assign(tree, { bark, leaves });
  }

  // Scattered props keep `margin` metres from the tile edge.
  const scatter = (count, build, margin = 0) => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = x0 + margin + rand() * (TILE - margin * 2), z = z0 + margin + rand() * (TILE - margin * 2);
      if (!inForest(x, z) || inClearing(x, z, -1)) continue;
      list.push(build(x, z));
    }
    return list;
  };

  // Undergrowth has no collision.
  for (const shrub of kit.shrubs) {
    const list = scatter(amount(57), (x, z) => {
      const s = 0.6 + rand() * 1;
      return { x, z, y: groundHeight(x, z) - 0.05, ry: rand() * 6.28, sx: s, sy: s, sz: s, tint: new THREE.Color().setScalar(0.85 + rand() * 0.25) };
    });
    add(makeInstances(shrub.geo, shrub.mat, list, false, true));
  }

  const rocks = scatter(amount(11), (x, z) => {
    const s = 0.35 + rand() * rand() * 1.9;
    addCollider(x, z, s * 0.8, s * 0.7);
    return { x, z, y: groundHeight(x, z) + s * 0.08, rx: rand() * 0.5, ry: rand() * 6.28, rz: rand() * 0.5, sx: s, sy: s * (0.55 + rand() * 0.3), sz: s * (0.75 + rand() * 0.4) };
  });
  const outcrops = scatter(amount(3.3), (x, z) => {
    const s = 2.4 + rand() * 4;
    addCollider(x, z, s * 0.72, s * 0.9);
    return { x, z, y: groundHeight(x, z) + s * 0.1, rx: rand() * 0.4, ry: rand() * 6.28, rz: rand() * 0.4, sx: s, sy: s * (0.7 + rand() * 0.55), sz: s * (0.7 + rand() * 0.4) };
  });
  add(makeInstances(kit.rock, kit.stoneMat, rocks.concat(outcrops), true, false));

  // Logs keep clear of the edge so all their colliders land in this tile's cells.
  const logs = scatter(amount(4), (x, z) => {
    const ry = rand() * 6.28;
    const s = 0.8 + rand() * 0.6;
    for (const t of [-1.7, 0, 1.7]) addCollider(x + Math.cos(ry) * t * s, z - Math.sin(ry) * t * s, 0.34, 0.6);
    return { x, z, y: groundHeight(x, z) + 0.12, ry, rz: (rand() - 0.5) * 0.08, sx: s, sy: 1, sz: 1 };
  }, 3);
  add(makeInstances(kit.log, kit.barkMat, logs, true, false));
  return { meshes, trees };
}

/* ---------- Terrain ---------- */
function buildTerrainTile(x0, z0, material) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, TILE_SEGMENTS, TILE_SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + x0 + TILE / 2, z = pos.getZ(i) + z0 + TILE / 2;
    const y = groundHeight(x, z);
    pos.setXYZ(i, x, y, z);
    // Normals and texture come from world position, so neighbouring tiles meet seamlessly.
    const dx = groundHeight(x + 1, z) - y, dz = groundHeight(x, z + 1) - y;
    const len = Math.hypot(dx, 1, dz);
    nrm.setXYZ(i, -dx / len, 1 / len, -dz / len);
    uv.setXY(i, x / 330, -z / 330);
    // Hollows hold bluer shade; steep faces show bare rock through the snow.
    const tone = THREE.MathUtils.clamp(0.92 + y * 0.012, 0.8, 1);
    const slope = Math.hypot(dx, dz);
    const patch = 0.5 + 0.5 * valueNoise(x / 5.5, z / 5.5);
    const rock = THREE.MathUtils.smoothstep(slope + patch * 0.16, 0.5, 0.74);
    colors.set([lerp(tone * 0.96, 0.27, rock), lerp(tone * 0.98, 0.29, rock), lerp(1, 0.35, rock)], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

function createTiles(scene) {
  const kit = buildForestKit();
  const terrainMat = new THREE.MeshStandardMaterial({
    map: TEX.snow.color,
    normalMap: TEX.snow.normal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: TEX.snow.rough,
    vertexColors: true,
  });
  const tiles = new Map();
  const distance = (tx, tz, focus) => Math.hypot((tx + 0.5) * TILE - focus.x, (tz + 0.5) * TILE - focus.z);

  const build = (tx, tz) => {
    const forest = plantTile(kit, tx, tz);
    const meshes = [buildTerrainTile(tx * TILE, tz * TILE, terrainMat), ...forest.meshes];
    for (const mesh of meshes) scene.add(mesh);
    tiles.set(`${tx},${tz}`, { tx, tz, meshes, trees: forest.trees });
  };
  const drop = (key, tile) => {
    for (const mesh of tile.meshes) {
      scene.remove(mesh);
      if (mesh.isInstancedMesh) mesh.dispose(); else mesh.geometry.dispose();
    }
    clearTileColliders(tile.tx, tile.tz);
    tiles.delete(key);
  };

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    // Builds the nearest missing tiles, at most `budget` of them, and drops far ones. A
    // bigger `radius` loads further out, for views from the air.
    stream(focus, budget, radius = LOAD_RADIUS) {
      const ftx = Math.floor(focus.x / TILE), ftz = Math.floor(focus.z / TILE);
      const reach = Math.ceil(radius / TILE);
      const wanted = [];
      for (let i = -reach; i <= reach; i++) {
        for (let j = -reach; j <= reach; j++) {
          const tx = ftx + i, tz = ftz + j;
          const d = distance(tx, tz, focus);
          if (d < radius && !tiles.has(`${tx},${tz}`)) wanted.push({ tx, tz, d });
        }
      }
      wanted.sort((a, b) => a.d - b.d);
      for (const { tx, tz } of wanted.slice(0, budget)) build(tx, tz);
      const keep = Math.max(UNLOAD_RADIUS, radius + 50);
      for (const [key, tile] of tiles) if (distance(tile.tx, tile.tz, focus) > keep) drop(key, tile);
    },

    // The standing tree whose trunk is nearest (x, z), if one is within `reach` of its bark.
    findTree(x, z, reach) {
      let best = null, bestD = reach;
      const tx = Math.floor(x / TILE), tz = Math.floor(z / TILE);
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const tile = tiles.get(`${tx + i},${tz + j}`);
          if (!tile) continue;
          for (const tree of tile.trees) {
            if (tree.felled) continue;
            const d = Math.hypot(tree.placement.x - x, tree.placement.z - z) - tree.r;
            if (d < bestD) { best = tree; bestD = d; }
          }
        }
      }
      return best;
    },

    // Every standing tree whose trunk is within `reach` of (x, z), measured to its bark.
    treesNear(x, z, reach) {
      const found = [];
      const span = Math.ceil(reach / TILE);
      const tx = Math.floor(x / TILE), tz = Math.floor(z / TILE);
      for (let i = -span; i <= span; i++) {
        for (let j = -span; j <= span; j++) {
          const tile = tiles.get(`${tx + i},${tz + j}`);
          if (!tile) continue;
          for (const tree of tile.trees) {
            if (!tree.felled && Math.hypot(tree.placement.x - x, tree.placement.z - z) - tree.r < reach) found.push(tree);
          }
        }
      }
      return found;
    },

    // Takes a tree out of the forest for good this run: hides its instance, drops its
    // collider and returns what's needed to draw it on its own as it falls.
    fellTree(tree) {
      tree.felled = true;
      felledTrees.add(tree.id);
      for (const mesh of [tree.bark, tree.leaves]) {
        if (!mesh) continue;
        mesh.setMatrixAt(tree.index, zero);
        mesh.instanceMatrix.needsUpdate = true;
      }
      removeCollider(tree.collider);
      return {
        bark: new THREE.Mesh(tree.kind.geo.bark, tree.kind.bark),
        leaves: tree.kind.leaves ? new THREE.Mesh(tree.kind.geo.boughs, tree.kind.leaves) : null,
        tint: tree.placement.tint,
      };
    },

    // Throws every tile away and forgets the felled trees, for a fresh run.
    reset() {
      felledTrees.clear();
      for (const [key, tile] of tiles) drop(key, tile);
    },
    // Builds every tile afresh, leaving out the trees in felledTrees (as a loaded game sets it).
    refresh() {
      for (const [key, tile] of tiles) drop(key, tile);
    },
  };
}

/* ---------- Mountains ---------- */
// Rocky peaks past the playable area, scaled with it. They ignore the scene fog and use
// their own distance haze, so they stay visible above the trees.
function mountainHeight(r, angle) {
  const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
  const envelope = THREE.MathUtils.smoothstep(r, 1650, 2450) * (1 - 0.55 * THREE.MathUtils.smoothstep(r, 3900, 5600));
  let height = 0, amp = 1, freq = 1 / 920, weight = 1;
  for (let i = 0; i < 6; i++) {
    const n = 1 - Math.abs(valueNoise(x * freq + i * 17.3, z * freq - i * 9.1));
    const ridge = n * n * weight;
    height += ridge * amp;
    weight = Math.min(1, ridge * 1.9);
    amp *= 0.5;
    freq *= 2.05;
  }
  return envelope * (320 + height * 2150) - 80;
}

function buildMountains(scene) {
  const segments = 460, rings = 56;
  const positions = [], colors = [];
  const ringRadius = (j) => 1650 * Math.pow(6000 / 1650, j / rings);
  const point = (i, j) => {
    const angle = (i / segments) * Math.PI * 2, r = ringRadius(j);
    return new THREE.Vector3(Math.cos(angle) * r, mountainHeight(r, angle), Math.sin(angle) * r);
  };
  const grid = [];
  for (let j = 0; j <= rings; j++) {
    grid[j] = [];
    for (let i = 0; i <= segments; i++) grid[j][i] = point(i % segments, j);
  }
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  const face = (a, b, c) => {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    if (n.y < 0) n.negate();
    const height = (a.y + b.y + c.y) / 3;
    // Snow only holds on gentler faces; steep ones stay bare rock.
    const grit = 0.5 + 0.5 * valueNoise(a.x / 130, a.z / 130);
    const snowLine = THREE.MathUtils.smoothstep(height + grit * 260, 180, 560);
    const snow = THREE.MathUtils.smoothstep(n.y + grit * 0.14, 0.36, 0.56) * snowLine;
    const rockTone = 0.1 + grit * 0.07;
    const r = lerp(rockTone, 0.86, snow), g = lerp(rockTone * 1.04, 0.9, snow), bl = lerp(rockTone * 1.2, 1, snow);
    for (const v of [a, b, c]) {
      positions.push(v.x, v.y, v.z);
      colors.push(r, g, bl);
    }
  };
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i], d = grid[j + 1][i + 1];
      face(a, c, b);
      face(b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, fog: false, flatShading: true, side: THREE.DoubleSide, envMapIntensity: 0.9 });
  const haze = { value: new THREE.Color(FOG_COLOR) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHaze = haze;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'varying float vPeakY;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPeakY = position.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', 'uniform vec3 uHaze;\nvarying float vPeakY;\n#include <common>')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float hazeAmount = 1.0 - exp(-length(vViewPosition) * 0.00015);
        hazeAmount = max(hazeAmount, 1.0 - smoothstep(0.0, 460.0, vPeakY));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hazeAmount);`);
  };
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
}

/* ---------- Landmarks ---------- */
function stoneMaterial() {
  return new THREE.MeshStandardMaterial({ map: TEX.stone.color, normalMap: TEX.stone.normal, roughness: 0.9 });
}

function buildAltar(scene) {
  const { x, z } = LANDMARKS.altar;
  const group = new THREE.Group();
  group.position.set(x, groundHeight(x, z), z);
  const stone = stoneMaterial();
  for (const [radius, height, y] of [[4.2, 0.5, 0.25], [3, 0.5, 0.75], [1.8, 0.5, 1.25]]) {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius, height, 16), stone);
    step.position.y = y;
    step.castShadow = step.receiveShadow = true;
    group.add(step);
  }
  const ice = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshStandardMaterial({ color: 0xbfeaff, metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.42, flatShading: true, emissive: 0x2d6d95, emissiveIntensity: 0.35 }),
  );
  ice.position.y = 2.9;
  ice.scale.set(1, 1.75, 1);
  group.add(ice);

  const blade = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8d6e8, metalness: 1, roughness: 0.22, emissive: 0x5fd0ff, emissiveIntensity: 1.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20232d, metalness: 0.9, roughness: 0.5 });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.035), steel);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.11), dark);
  guard.position.y = 1.32;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.55, 8), dark);
  grip.position.y = 1.65;
  blade.add(edge, guard, grip);
  blade.position.y = 3;
  group.add(blade);

  scene.add(group);
  return { x, z, group, ice, blade };
}

/* ---------- Weather ---------- */
function buildSnow(scene) {
  const count = 3400;
  const box = { w: 52, h: 22 };
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * box.w;
    pos[i * 3 + 1] = Math.random() * box.h;
    pos[i * 3 + 2] = Math.random() * box.w;
    speed[i] = 0.8 + Math.random() * 1.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.06, map: TEX.softDot, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.95,
  }));
  points.frustumCulled = false;
  scene.add(points);
  weatherMaterials.push(points.material);

  const wrap = (v, size) => ((v % size) + size) % size;
  return (dt, time, center) => {
    const out = geo.attributes.position.array;
    const gust = Math.sin(time * 0.22) * 1.1 + 0.9;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += (gust + Math.sin(time * 0.9 + i) * 0.35) * dt;
      pos[i * 3 + 1] -= speed[i] * dt;
      pos[i * 3 + 2] += Math.cos(time * 0.7 + i * 1.7) * 0.3 * dt;
      out[i * 3] = center.x + wrap(pos[i * 3] - center.x, box.w) - box.w / 2;
      out[i * 3 + 1] = center.y + wrap(pos[i * 3 + 1] - center.y, box.h) - box.h / 2;
      out[i * 3 + 2] = center.z + wrap(pos[i * 3 + 2] - center.z, box.w) - box.w / 2;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// Drifting banks of snow fog near the ground, on top of the height fog.
function buildMist(scene) {
  const material = new THREE.SpriteMaterial({ map: TEX.mist, color: 0xc4cde0, transparent: true, opacity: 0.2, depthWrite: false, fog: false });
  weatherMaterials.push(material);
  const banks = [];
  const span = 64;
  for (let i = 0; i < 34; i++) {
    const sprite = new THREE.Sprite(material);
    const size = 13 + Math.random() * 13;
    sprite.scale.set(size * 1.7, size * 0.42, 1);
    scene.add(sprite);
    banks.push({ sprite, x: Math.random() * span, z: Math.random() * span, drift: 0.5 + Math.random() * 0.9, lift: 0.9 + Math.random() * 2.2 });
  }
  const wrap = (v) => ((v % span) + span) % span;
  return (dt, center) => {
    for (const bank of banks) {
      bank.x += bank.drift * dt;
      const x = center.x + wrap(bank.x - center.x) - span / 2;
      const z = center.z + wrap(bank.z - center.z) - span / 2;
      bank.sprite.position.set(x, groundHeight(x, z) + bank.lift, z);
    }
  };
}

function buildWorld(renderer, scene) {
  scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
  buildEnvironment(renderer, scene);
  const sky = buildSky();
  scene.add(sky);

  const sun = new THREE.DirectionalLight(0xeef1ff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 170 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const sunOffset = new THREE.Vector3(-0.42, 0.72, 0.55).normalize().multiplyScalar(85);

  buildMountains(scene);
  const tiles = createTiles(scene);
  tiles.stream(LANDMARKS.start, Infinity);
  const updateSnow = buildSnow(scene);
  const updateMist = buildMist(scene);
  const altar = buildAltar(scene);

  return {
    altar,
    setWeather(visible) {
      for (const material of weatherMaterials) material.visible = visible;
    },
    // Builds the tiles around `focus`: one per call while moving, or all at once after a
    // jump such as a teleport. `radius` reaches further out for views from the air.
    stream(focus, budget = 1, radius) {
      tiles.stream(focus, budget, radius);
    },
    findTree: tiles.findTree,
    treesNear: tiles.treesNear,
    fellTree: tiles.fellTree,
    // A fresh forest for a new run: felled trees grow back and the clearings are rebuilt.
    resetForest() {
      tiles.reset();
    },
    refreshForest() {
      tiles.refresh();
    },
    update(dt, time, cameraPos, focus) {
      worldUniforms.uTime.value = time;
      sky.position.copy(cameraPos);
      sun.position.copy(focus).add(sunOffset);
      sun.target.position.copy(focus);
      updateSnow(dt, time, cameraPos);
      updateMist(dt, focus);
      altar.blade.position.y = 3 + Math.sin(time * 1.4) * 0.06;
    },
  };
}
