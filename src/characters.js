// Enemy models and shared model helpers. All models face +Z at rotation 0.
function part(parent, geo, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Smooth body segments from [radius, y] profile points, top to bottom.
function lathe(profile, sides = 14) {
  // Lathe faces point outward only when the profile runs upward.
  const pts = [...profile].sort((a, b) => a[1] - b[1]).map(([r, y]) => new THREE.Vector2(r, y));
  const curve = new THREE.SplineCurve(pts);
  return new THREE.LatheGeometry(curve.getPoints(profile.length * 4), sides);
}

/* ---------- Hanging strips (fur, rags) ---------- */
// Every strip is baked into one mesh, with a weight the vertex shader uses to swing the tips.
function stripGeometry(strips) {
  const position = [], normal = [], uv = [], weight = [], phase = [], color = [], index = [];
  const n = new THREE.Vector3();
  for (const strip of strips) {
    const { x, y, z, angle, tilt = 0, width, length, roll = 0, curl = 0, rows = 6, path = null } = strip;
    const ox = Math.sin(angle), oz = Math.cos(angle);
    const sx = Math.cos(angle), sz = -Math.sin(angle);
    const start = position.length / 3;
    const ph = Math.random() * 6.28;
    n.set(ox * 0.82, 0.58, oz * 0.82).normalize();
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      // A path overrides the default hang, for locks that need to clear the shoulders.
      const out = path ? path(t) : length * t * tilt * (1 - 0.45 * t) + curl * t * t;
      const w = width * (1 - 0.32 * t);
      const lean = Math.sin(roll) * length * t;
      for (const u of [0, 1]) {
        const across = (u - 0.5) * w + lean;
        position.push(x + ox * out + sx * across, y - length * t, z + oz * out + sz * across);
        normal.push(n.x, n.y, n.z);
        uv.push(u, 1 - t);
        weight.push(t);
        phase.push(ph);
        // Roots sit in the shade of the layer above.
        const shade = 0.62 + 0.42 * Math.min(1, t * 1.7);
        color.push(shade, shade, shade);
      }
    }
    for (let i = 0; i < rows; i++) {
      const a = start + i * 2;
      index.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aWeight', new THREE.Float32BufferAttribute(weight, 1));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geo.setIndex(index);
  return geo;
}

function stripMaterial(map, swing, params = {}) {
  const material = new THREE.MeshStandardMaterial({ map, alphaTest: 0.38, side: THREE.DoubleSide, roughness: 1, vertexColors: true, envMapIntensity: 1.25, ...params });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.uniforms.uSwing = swing;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'attribute float aWeight;\nattribute float aPhase;\nuniform float uTime;\nuniform vec3 uSwing;\n#include <common>')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float tip = aWeight * aWeight;
        transformed += (vec3(sin(uTime * 1.7 + aPhase), 0.0, cos(uTime * 1.3 + aPhase * 1.7)) * 0.02 + uSwing) * tip;`);
  };
  material.customProgramCacheKey = () => 'strip';
  return material;
}

function stripMesh(parent, strips, material) {
  const mesh = new THREE.Mesh(stripGeometry(strips), material);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

// A ring of strips around an ellipse.
function stripRing({ count, y, rx, rz, tilt, width, length, jitter = 0.12, gapAt = null, gapSize = 0, curl = 0, offsetY = 0 }) {
  const strips = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    if (gapAt !== null && Math.abs(Math.atan2(Math.sin(angle - gapAt), Math.cos(angle - gapAt))) < gapSize) continue;
    strips.push({
      x: Math.sin(angle) * rx,
      y: y + offsetY + (Math.random() - 0.5) * 0.05,
      z: Math.cos(angle) * rz,
      angle,
      tilt: tilt * (0.85 + Math.random() * 0.3),
      width: width * (0.8 + Math.random() * 0.5),
      length: length * (1 - jitter + Math.random() * jitter * 2),
      roll: (Math.random() - 0.5) * 0.22,
      curl,
    });
  }
  return strips;
}

/* ---------- Ghouls ---------- */
const GHOUL_GEO = {
  torso: lathe([[0.1, -0.04], [0.14, 0.2], [0.18, 0.5], [0.09, 0.72]], 10),
  skull: new THREE.SphereGeometry(0.115, 12, 10),
  jaw: new THREE.SphereGeometry(0.075, 10, 6),
  upperLimb: lathe([[0.03, -0.38], [0.04, -0.2], [0.052, -0.02], [0.04, 0.03]], 8),
  lowerLimb: lathe([[0.02, -0.4], [0.028, -0.2], [0.038, -0.03], [0.033, 0.02]], 8),
  eye: new THREE.SphereGeometry(0.016, 6, 5),
  rib: new THREE.TorusGeometry(0.135, 0.008, 5, 14, 3.4),
};
const EYE_MAT = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x7fe2ff, emissiveIntensity: 4 });
const RAG_SWING = { value: new THREE.Vector3() };
const RAG_MAT = stripMaterial(TEX.fur, RAG_SWING, { color: 0x2a2b35 });
const RAG_GEO = stripGeometry([
  ...stripRing({ count: 11, y: 0.5, rx: 0.15, rz: 0.11, tilt: 0.1, width: 0.17, length: 0.82, jitter: 0.3 }),
  ...stripRing({ count: 6, y: 0.68, rx: 0.1, rz: 0.08, tilt: 0.45, width: 0.14, length: 0.3, jitter: 0.3 }),
]);

function buildGhoul(runner) {
  const skin = new THREE.MeshStandardMaterial({ color: runner ? 0x7b8497 : 0x626a78, roughness: 0.72, normalMap: TEX.stone.normal, normalScale: new THREE.Vector2(0.6, 0.6) });
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.x = runner ? 0.55 : 0.28;
  body.position.y = 0.8;
  root.add(body);
  const torso = part(body, GHOUL_GEO.torso, skin);
  torso.scale.z = 0.68;
  for (let i = 0; i < 4; i++) {
    const rib = part(body, GHOUL_GEO.rib, skin, 0, 0.24 + i * 0.08, 0.005);
    rib.rotation.x = 0.2;
    rib.rotation.z = -0.13;
    rib.scale.z = 0.75;
  }
  const rags = new THREE.Mesh(RAG_GEO, RAG_MAT);
  rags.castShadow = true;
  rags.frustumCulled = false;
  body.add(rags);
  const skull = part(body, GHOUL_GEO.skull, skin, 0, 0.84, 0.04);
  skull.scale.set(0.88, 1.12, 1);
  const jaw = part(body, GHOUL_GEO.jaw, skin, 0, 0.74, 0.07);
  jaw.scale.set(0.9, 0.7, 1);
  for (const x of [-0.04, 0.04]) part(body, GHOUL_GEO.eye, EYE_MAT, x, 0.855, 0.138);

  const limb = (parent, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    part(pivot, GHOUL_GEO.upperLimb, skin);
    part(pivot, GHOUL_GEO.lowerLimb, skin, 0, -0.38, 0);
    parent.add(pivot);
    return pivot;
  };
  return {
    root, skin,
    armL: limb(body, 0.2, 0.62),
    armR: limb(body, -0.2, 0.62),
    legL: limb(root, 0.11, 0.8),
    legR: limb(root, -0.11, 0.8),
  };
}

/* ---------- Boss ---------- */
function buildBoss() {
  const armor = new THREE.MeshStandardMaterial({ color: 0x3a4152, metalness: 0.92, roughness: 0.46, normalMap: TEX.stone.normal, normalScale: new THREE.Vector2(0.5, 0.5) });
  const trim = new THREE.MeshStandardMaterial({ color: 0x8a93a8, metalness: 1, roughness: 0.36 });
  const under = new THREE.MeshStandardMaterial({ color: 0x14151c, roughness: 0.85 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x8fe8ff, emissiveIntensity: 5 });
  const iceSteel = new THREE.MeshStandardMaterial({ color: 0xb4cde2, metalness: 1, roughness: 0.2, emissive: 0x4fbfff, emissiveIntensity: 0.55 });
  const swing = { value: new THREE.Vector3() };
  const cape = stripMaterial(TEX.fur, swing, { color: 0x4c1825 });
  const root = new THREE.Group();

  const leg = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.45, 0);
    part(pivot, lathe([[0.17, -1.45], [0.16, -1.1], [0.22, -0.72], [0.26, -0.3], [0.27, 0.05]]), under);
    part(pivot, new THREE.SphereGeometry(0.25, 12, 8), trim, 0, -0.72, 0.05).scale.set(0.95, 0.85, 0.9);
    const greave = part(pivot, lathe([[0.2, -1.4], [0.2, -1.08], [0.22, -0.84]]), armor, 0, 0, 0.015);
    greave.scale.z = 1.08;
    const foot = part(pivot, new THREE.SphereGeometry(0.2, 12, 8), armor, 0, -1.38, 0.13);
    foot.scale.set(0.95, 0.5, 1.55);
    root.add(pivot);
    return pivot;
  };
  const legL = leg(0.36), legR = leg(-0.36);

  const torso = part(root, lathe([[0.48, 1.42], [0.45, 1.65], [0.62, 2.15], [0.76, 2.6], [0.42, 2.95]], 16), armor);
  torso.scale.z = 0.72;
  part(root, new THREE.BoxGeometry(0.08, 0.8, 0.04), glow, 0, 2.25, 0.52);
  part(root, new THREE.TorusGeometry(0.47, 0.035, 8, 22).rotateX(Math.PI / 2), trim, 0, 1.6, 0).scale.z = 0.76;
  stripMesh(root, stripRing({ count: 22, y: 1.55, rx: 0.5, rz: 0.4, tilt: 0.08, width: 0.3, length: 1.05, gapAt: 0, gapSize: 0.4 }), under);
  const capeStrips = stripRing({ count: 22, y: 2.85, rx: 0.65, rz: 0.46, tilt: 0.09, width: 0.34, length: 2.6, jitter: 0.08, gapAt: 0, gapSize: 1.55 });
  stripMesh(root, capeStrips, cape);

  const head = new THREE.Group();
  head.position.y = 3.22;
  const helm = part(head, new THREE.SphereGeometry(0.33, 16, 14), armor);
  helm.scale.set(0.9, 1.14, 1);
  part(head, new THREE.BoxGeometry(0.42, 0.055, 0.1), under, 0, 0.03, 0.27);
  for (const x of [-0.11, 0.11]) part(head, new THREE.SphereGeometry(0.028, 8, 6), glow, x, 0.03, 0.31);
  for (let i = 0; i < 9; i++) {
    const a = -1.4 + i * 0.35;
    const h = 0.42 + (i % 2) * 0.3 - Math.abs(a) * 0.1;
    const spike = part(head, new THREE.ConeGeometry(0.045, h, 6), trim, Math.sin(a) * 0.28, 0.3 + h * 0.3, Math.cos(a) * 0.28);
    spike.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
  }
  root.add(head);

  const arm = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.7, 0);
    const pauldron = part(pivot, new THREE.SphereGeometry(0.42, 14, 10), armor);
    pauldron.scale.set(1.08, 0.82, 1);
    for (let i = -1; i <= 1; i++) {
      const spike = part(pivot, new THREE.ConeGeometry(0.06, 0.42, 6), trim, Math.sign(x) * 0.22, 0.33, i * 0.2);
      spike.rotation.z = -Math.sign(x) * 0.42;
    }
    part(pivot, lathe([[0.14, -1.5], [0.16, -1.05], [0.2, -0.7], [0.2, -0.1]]), armor);
    part(pivot, new THREE.SphereGeometry(0.17, 10, 8), under, 0, -1.55, 0);
    root.add(pivot);
    return pivot;
  };
  const armL = arm(1.02), armR = arm(-1.02);

  const sword = new THREE.Group();
  sword.position.set(0, -1.55, 0);
  part(sword, new THREE.BoxGeometry(0.06, 0.25, 3.2), iceSteel, 0, 0, 1.8);
  part(sword, new THREE.ConeGeometry(0.17, 0.42, 4).rotateX(Math.PI / 2), iceSteel, 0, 0, 3.6).scale.x = 0.3;
  part(sword, new THREE.BoxGeometry(0.03, 0.05, 2.8), glow, 0, 0, 1.75);
  part(sword, new THREE.BoxGeometry(0.95, 0.15, 0.15), trim, 0, 0, 0.16);
  part(sword, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8).rotateX(Math.PI / 2), under, 0, 0, -0.1);
  armR.add(sword);

  return { root, legL, legR, armL, armR, head };
}
