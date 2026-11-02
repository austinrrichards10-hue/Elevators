// Character models. All of them face +Z at rotation 0.
function part(parent, geo, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Smooth body segments from [radius, y] profile points, top to bottom.
function lathe(profile, sides = 14) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
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

/* ---------- Heroine ---------- */
function buildHeroine() {
  const swing = { value: new THREE.Vector3() };
  const clothNormal = TEX.cloth;
  const skin = new THREE.MeshStandardMaterial({ color: 0xf3ded6, roughness: 0.58 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.96, normalMap: clothNormal });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17161d, roughness: 0.9, normalMap: clothNormal });
  const leather = new THREE.MeshStandardMaterial({ color: 0x1d1a1c, roughness: 0.58, normalMap: clothNormal });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3e4a, metalness: 0.9, roughness: 0.42 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xb6bcc8, metalness: 1, roughness: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc6a25c, metalness: 1, roughness: 0.34 });
  const furPlain = stripMaterial(TEX.fur, swing);
  const furSpotted = stripMaterial(TEX.furSpotted, swing);
  const hairLock = stripMaterial(TEX.hair, swing, { roughness: 0.5, alphaTest: 0.45, envMapIntensity: 1.1 });
  const hairCap = new THREE.MeshStandardMaterial({ map: TEX.hairCap, roughness: 0.5 });

  const root = new THREE.Group();

  // Legs: thigh pivots at the hip, shin at the knee.
  const makeLeg = (x) => {
    const thigh = new THREE.Group();
    thigh.position.set(x, 0.92, 0);
    part(thigh, lathe([[0.04, -0.46], [0.056, -0.34], [0.074, -0.16], [0.086, -0.03], [0.07, 0.03]]), dark);
    const shin = new THREE.Group();
    shin.position.y = -0.45;
    thigh.add(shin);
    part(shin, lathe([[0.05, -0.42], [0.052, -0.3], [0.058, -0.16], [0.056, -0.04], [0.05, 0.02]]), leather);
    const boot = part(shin, new THREE.SphereGeometry(0.06, 12, 8), leather, 0, -0.44, 0.045);
    boot.scale.set(0.8, 0.58, 1.75);
    root.add(thigh);
    return { thigh, shin };
  };
  const legL = makeLeg(0.092), legR = makeLeg(-0.092);

  // Long dark robe under the fur.
  const skirt = part(root, lathe([[0.3, 0.1], [0.26, 0.3], [0.22, 0.56], [0.17, 0.82], [0.13, 1.02]], 16), dark);
  skirt.material = dark.clone();
  skirt.material.side = THREE.DoubleSide;
  skirt.scale.z = 0.82;

  // Shaggy tiers, wider towards the hem, parted at the front right so the robe shows.
  const longStrips = stripRing({ count: 46, y: 0.96, rx: 0.25, rz: 0.2, tilt: 0.15, width: 0.17, length: 0.66, jitter: 0.26, gapAt: -0.5, gapSize: 0.34 });
  const spottedStrips = stripRing({ count: 38, y: 0.66, rx: 0.3, rz: 0.25, tilt: 0.12, width: 0.2, length: 0.58, jitter: 0.24, gapAt: -0.5, gapSize: 0.46 });
  stripMesh(root, longStrips, furPlain);
  stripMesh(root, spottedStrips, furSpotted);

  // Upper body.
  const chest = new THREE.Group();
  chest.position.y = 0.98;
  root.add(chest);
  const torso = part(chest, lathe([[0.122, 0], [0.108, 0.13], [0.124, 0.29], [0.135, 0.38], [0.075, 0.47]], 16), dark);
  torso.scale.z = 0.72;
  const neck = part(chest, lathe([[0.046, 0.44], [0.036, 0.6]], 10), new THREE.MeshStandardMaterial({ color: 0xf3ded6, roughness: 0.58 }));
  neck.scale.z = 0.95;

  const coatStrips = stripRing({ count: 46, y: 0.28, rx: 0.2, rz: 0.15, tilt: 0.24, width: 0.16, length: 0.62, jitter: 0.24 });
  const mantleStrips = stripRing({ count: 58, y: 0.46, rx: 0.25, rz: 0.17, tilt: 0.5, width: 0.16, length: 0.56, jitter: 0.26, curl: 0.03 });
  const capeStrips = stripRing({ count: 50, y: 0.52, rx: 0.16, rz: 0.12, tilt: 1.05, width: 0.14, length: 0.38, jitter: 0.24, curl: -0.03 });
  const ruffStrips = [
    ...stripRing({ count: 44, y: 0.53, rx: 0.09, rz: 0.085, tilt: 1.35, width: 0.125, length: 0.25, jitter: 0.22, curl: -0.03 }),
    ...stripRing({ count: 26, y: 0.545, rx: 0.075, rz: 0.075, tilt: 1.5, width: 0.1, length: 0.15 }),
  ];
  stripMesh(chest, coatStrips, furPlain);
  stripMesh(chest, mantleStrips, furPlain);
  stripMesh(chest, capeStrips, furPlain);
  stripMesh(chest, ruffStrips, furPlain);

  // Thick scarf bands wound over the ruff.
  const scarf = part(chest, new THREE.TorusGeometry(0.082, 0.032, 10, 22).rotateX(Math.PI / 2), wrap, 0, 0.525, 0);
  scarf.rotation.x = 0.12;
  part(chest, new THREE.BoxGeometry(0.03, 0.2, 0.012), gold, 0.03, 0.38, 0.132).rotation.z = 0.12;

  // Arms: upper arm pivots at the shoulder, forearm at the elbow.
  const makeArm = (x, armored) => {
    const upper = new THREE.Group();
    upper.position.set(x, 0.42, 0);
    part(upper, lathe([[0.038, -0.29], [0.044, -0.2], [0.054, -0.07], [0.052, 0.01]]), dark);
    const sleeves = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * 6.28;
      sleeves.push({ x: Math.sin(angle) * 0.05, y: 0.03, z: Math.cos(angle) * 0.05, angle, tilt: 0.36, width: 0.085, length: 0.26 + Math.random() * 0.14 });
    }
    stripMesh(upper, sleeves, furPlain);
    const fore = new THREE.Group();
    fore.position.y = -0.29;
    upper.add(fore);
    part(fore, lathe([[0.03, -0.26], [0.034, -0.18], [0.043, -0.07], [0.04, 0.01]]), armored ? steel : dark);
    if (armored) {
      for (const y of [-0.06, -0.14, -0.22]) part(fore, new THREE.TorusGeometry(0.041 - y * -0.03, 0.005, 6, 14).rotateX(Math.PI / 2), silver, 0, y, 0);
    }
    const hand = part(fore, new THREE.SphereGeometry(0.038, 10, 8), leather, 0, -0.3, 0);
    hand.scale.set(0.72, 1.2, 1);
    for (let i = 0; i < 4; i++) {
      const finger = part(hand, new THREE.CapsuleGeometry(0.0085, 0.045, 3, 6), leather, (i - 1.5) * 0.019, -0.045, 0.012);
      finger.rotation.x = 0.35;
    }
    chest.add(upper);
    return { upper, fore };
  };
  const armL = makeArm(0.19, false), armR = makeArm(-0.19, true);

  // The pistol runs along the forearm: local -Y is forward and +Z is up when the arm is raised.
  const gun = new THREE.Group();
  gun.position.set(0, -0.31, 0);
  part(gun, new THREE.BoxGeometry(0.03, 0.2, 0.038), steel, 0, -0.06, 0.042);
  part(gun, new THREE.BoxGeometry(0.026, 0.052, 0.115), leather, 0, 0.005, -0.012).rotation.x = -0.25;
  part(gun, new THREE.CylinderGeometry(0.009, 0.009, 0.03, 8), silver, 0, -0.17, 0.042);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.19, 0.042);
  gun.add(muzzle);
  armR.fore.add(gun);

  // Head, with a soft face that narrows to a small chin.
  const head = new THREE.Group();
  head.position.y = 0.625;
  chest.add(head);
  const faceGeo = new THREE.SphereGeometry(0.098, 32, 24);
  const facePos = faceGeo.attributes.position;
  for (let i = 0; i < facePos.count; i++) {
    const y = facePos.getY(i);
    if (y >= 0) continue;
    const narrow = 1 - 0.5 * Math.pow(-y / 0.098, 1.7);
    facePos.setX(i, facePos.getX(i) * narrow);
    facePos.setZ(i, facePos.getZ(i) * (0.72 + narrow * 0.28));
  }
  faceGeo.computeVertexNormals();
  const face = part(head, faceGeo, skin, 0, 0.055, 0);
  face.scale.set(0.9, 1.14, 0.98);
  part(head, new THREE.SphereGeometry(0.0045, 8, 6), skin, 0, 0.022, 0.095);
  const mouth = part(head, new THREE.TorusGeometry(0.009, 0.0016, 5, 12, 2.1), new THREE.MeshStandardMaterial({ color: 0xa8505c, roughness: 0.6 }), 0, 0.0, 0.0795);
  mouth.rotation.z = Math.PI * 1.17;

  const eyeMat = new THREE.MeshStandardMaterial({ map: TEX.eye, alphaTest: 0.5, roughness: 0.2, emissive: 0xffffff, emissiveMap: TEX.eye, emissiveIntensity: 0.16 });
  const blushMat = new THREE.MeshBasicMaterial({ map: TEX.blush, transparent: true, depthWrite: false });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x176f88, roughness: 0.7 });
  const eyeGeo = new THREE.PlaneGeometry(0.06, 0.064, 6, 6);
  const eyePos = eyeGeo.attributes.position;
  for (let i = 0; i < eyePos.count; i++) {
    const x = eyePos.getX(i), y = eyePos.getY(i);
    eyePos.setZ(i, -(x * x + y * y) * 4.5);
  }
  eyeGeo.computeVertexNormals();
  for (const side of [-1, 1]) {
    const eye = part(head, eyeGeo, eyeMat, side * 0.04, 0.06, 0.0858);
    eye.rotation.y = side * 0.42;
    eye.scale.x = side;
    eye.material.side = THREE.DoubleSide;
    eye.castShadow = false;
    const blush = part(head, new THREE.PlaneGeometry(0.038, 0.024), blushMat, side * 0.051, 0.027, 0.0745);
    blush.rotation.y = side * 0.55;
    blush.castShadow = false;
    const brow = part(head, new THREE.BoxGeometry(0.034, 0.0028, 0.002), browMat, side * 0.04, 0.097, 0.0845);
    brow.rotation.set(0, side * 0.42, side * -0.2);
    brow.castShadow = false;
  }

  // Hair: a fitted cap, a fringe, side locks and two long twin tails.
  const crown = part(head, new THREE.SphereGeometry(0.106, 28, 12, 0, 6.29, 0, 1.12), hairCap, 0, 0.062, -0.002);
  crown.scale.set(0.98, 1.1, 1.05);
  const backHair = part(head, new THREE.SphereGeometry(0.105, 24, 10, 2.75, 3.9, 1.08, 1), hairCap, 0, 0.062, -0.002);
  backHair.scale.set(0.98, 1.1, 1.05);

  const fringe = [];
  for (let i = -6; i <= 6; i++) {
    const a = i * 0.14;
    fringe.push({ x: Math.sin(a) * 0.092, y: 0.172 - Math.abs(i) * 0.003, z: Math.cos(a) * 0.098, angle: a, tilt: 0.16, width: 0.036, length: 0.066 + Math.abs(i) * 0.008 + Math.random() * 0.01, roll: -i * 0.035 });
  }
  stripMesh(head, fringe, hairLock);

  const sideLocks = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = side * (1.1 + i * 0.09);
      sideLocks.push({ x: Math.sin(a) * 0.096, y: 0.135, z: Math.cos(a) * 0.09, angle: a, tilt: 0.1, width: 0.055, length: 0.3 + Math.random() * 0.08 });
    }
  }
  const nape = [];
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + (i - 8.5) * 0.15;
    nape.push({ x: Math.sin(a) * 0.098, y: 0.09, z: Math.cos(a) * 0.1, angle: a, tilt: 0.18, width: 0.06, length: 0.26 + Math.random() * 0.1 });
  }
  stripMesh(head, sideLocks, hairLock);
  stripMesh(head, nape, hairLock);

  // Twin tails hang from the chest frame so their long fall stays steady when the head tilts.
  const tails = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 36; i++) {
      const length = 1.3 + Math.random() * 0.26;
      const spread = 0.25 + Math.random() * 0.13;
      tails.push({
        x: side * 0.095,
        y: 0.785 + (Math.random() - 0.5) * 0.025,
        z: -0.045,
        angle: side * (Math.PI / 2 + 0.42 + (Math.random() - 0.5) * 0.55),
        width: 0.058 + Math.random() * 0.024,
        length,
        rows: 16,
        path: (t) => spread * (1 - Math.exp(-t * 6)) + 0.05 * t,
      });
    }
    part(chest, new THREE.BoxGeometry(0.03, 0.045, 0.03), dark, side * 0.096, 0.79, -0.045);
    part(chest, new THREE.BoxGeometry(0.033, 0.011, 0.033), new THREE.MeshStandardMaterial({ color: 0xc8305f, roughness: 0.45 }), side * 0.096, 0.807, -0.045);
  }
  stripMesh(chest, tails, hairLock);

  // Earmuffs in the cape's shaggy fur, with a fur band over the head.
  const band = part(head, new THREE.TorusGeometry(0.115, 0.012, 8, 28, Math.PI), wrap, 0, 0.065, 0.004);
  band.scale.y = 1.12;
  const bandFur = [];
  for (let i = 1; i < 20; i++) {
    const a = (i / 20) * Math.PI;
    const px = Math.cos(a) * 0.117;
    bandFur.push({ x: px, y: 0.068 + Math.sin(a) * 0.133, z: 0.004, angle: i % 2 ? 0 : Math.PI, tilt: 0.9, width: 0.03, length: 0.026 + Math.random() * 0.01 });
  }
  stripMesh(head, bandFur, furPlain);

  for (const side of [-1, 1]) {
    const muff = new THREE.Group();
    muff.position.set(side * 0.112, 0.06, 0);
    muff.rotation.z = side * -Math.PI / 2;
    const base = part(muff, new THREE.SphereGeometry(0.05, 16, 12), wrap);
    base.scale.y = 0.85;
    // The ring's axis points away from the head; shaggy tiers lie back over the cup.
    stripMesh(muff, stripRing({ count: 26, y: 0.022, rx: 0.044, rz: 0.044, tilt: 0.75, width: 0.042, length: 0.05, jitter: 0.25 }), furPlain);
    stripMesh(muff, stripRing({ count: 22, y: 0.046, rx: 0.026, rz: 0.026, tilt: 1.15, width: 0.04, length: 0.04, jitter: 0.25 }), furPlain);
    stripMesh(muff, stripRing({ count: 14, y: 0.056, rx: 0.008, rz: 0.008, tilt: 1.35, width: 0.032, length: 0.032, jitter: 0.25 }), furPlain);
    for (const [a, r] of [[0.7, 0.03], [2.6, 0.034], [4.4, 0.026]]) {
      const spot = part(muff, new THREE.SphereGeometry(0.0062, 7, 6), dark, Math.sin(a) * r, 0.052, Math.cos(a) * r);
      spot.scale.set(0.8, 0.5, 1.5);
      spot.castShadow = false;
    }
    head.add(muff);
  }

  // Charm chain and eye ornament at the right hip.
  for (let i = 0; i < 6; i++) part(root, new THREE.OctahedronGeometry(0.016 - i * 0.001, 0), silver, -0.31, 1.0 - i * 0.055, -0.03);
  const orb = part(root, new THREE.SphereGeometry(0.048, 16, 12), new THREE.MeshStandardMaterial({ color: 0xdfe8f5, metalness: 0.3, roughness: 0.15 }), -0.3, 0.68, -0.02);
  orb.rotation.y = -1.2;
  const pupil = part(orb, new THREE.TorusGeometry(0.024, 0.0065, 8, 18), new THREE.MeshStandardMaterial({ color: 0x24487f, emissive: 0x2d66bb, emissiveIntensity: 1.4 }), 0, 0, 0.041);
  pupil.rotation.y = 0;

  return { root, chest, head, legL, legR, armL, armR, muzzle, swing };
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
