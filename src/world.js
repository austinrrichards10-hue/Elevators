// Terrain, forest, landmarks and falling snow.
const WORLD_RADIUS = 100;
const FOG_COLOR = 0x5a6994;

const LANDMARKS = {
  start: { x: 0, z: 76 },
  wards: [{ x: -52, z: 26 }, { x: 54, z: 18 }, { x: 4, z: -18 }],
  altar: { x: 0, z: -70 },
};

function seededRandom(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  const rim = r > WORLD_RADIUS ? (r - WORLD_RADIUS) ** 2 * 0.03 : 0;
  return 1.2 * Math.sin(x * 0.045) * Math.cos(z * 0.05) + 0.5 * Math.sin(x * 0.13 + 1) * Math.sin(z * 0.11) + rim;
}

// Colliders are bucketed by cell so movement only tests what is nearby.
const colliders = new Map();
const CELL = 8;

function addCollider(x, z, r) {
  const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  if (!colliders.has(key)) colliders.set(key, []);
  colliders.get(key).push({ x, z, r });
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

function buildTerrain(scene) {
  const geo = new THREE.PlaneGeometry(320, 320, 150, 150).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rand = seededRandom(7);
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
    if (i % 3 === 0) {
      const v = 0.86 + rand() * 0.14;
      for (let k = 0; k < 3; k++) colors.set([0.62 * v, 0.68 * v, 0.9 * v], (i + k) * 3);
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
}

function appendTinted(positions, colors, geo, colorAt) {
  const flat = geo.toNonIndexed();
  const p = flat.attributes.position;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  for (let i = 0; i < p.count; i++) {
    positions.push(p.getX(i), p.getY(i), p.getZ(i));
    colors.push(...colorAt((p.getY(i) - min.y) / (max.y - min.y)));
  }
}

function buildTreeGeometry() {
  const positions = [], colors = [];
  const needle = (t) => (t > 0.5 ? [0.72, 0.8, 0.98] : [0.07, 0.13 + t * 0.1, 0.2]);
  appendTinted(positions, colors, new THREE.CylinderGeometry(0.18, 0.3, 2.4, 6).translate(0, 1.2, 0), () => [0.1, 0.09, 0.14]);
  appendTinted(positions, colors, new THREE.ConeGeometry(2.3, 3.8, 7).translate(0, 3.6, 0), needle);
  appendTinted(positions, colors, new THREE.ConeGeometry(1.8, 3.3, 7).translate(0, 5.6, 0), needle);
  appendTinted(positions, colors, new THREE.ConeGeometry(1.2, 2.9, 7).translate(0, 7.5, 0), needle);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function inClearing(x, z) {
  const clear = [[LANDMARKS.start, 9], ...LANDMARKS.wards.map((w) => [w, 9]), [LANDMARKS.altar, 25]];
  return clear.some(([p, r]) => Math.hypot(x - p.x, z - p.z) < r);
}

function buildForest(scene) {
  const rand = seededRandom(1234);
  const treeCount = 780;
  const trees = new THREE.InstancedMesh(buildTreeGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true }), treeCount);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x3f4966 }), 80);
  const m = new THREE.Object3D();

  const scatter = (mesh, count, place) => {
    let placed = 0;
    while (placed < count) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 135;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      if (inClearing(x, z)) continue;
      place(x, z);
      mesh.setMatrixAt(placed++, (m.updateMatrix(), m.matrix));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  };

  scatter(trees, treeCount, (x, z) => {
    const s = 0.8 + rand() * 0.9;
    m.position.set(x, groundHeight(x, z) - 0.1, z);
    m.rotation.set(0, rand() * 6.28, 0);
    m.scale.set(s, s * (0.9 + rand() * 0.4), s);
    addCollider(x, z, 0.42 * s);
  });

  scatter(rocks, 80, (x, z) => {
    const s = 0.5 + rand() * 1.2;
    m.position.set(x, groundHeight(x, z) + s * 0.2, z);
    m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    m.scale.set(s, s * 0.7, s);
    addCollider(x, z, s * 0.9);
  });
}

function makeBeam(color) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 90, 8, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  beam.position.y = 45;
  return beam;
}

function buildWard(scene, spot) {
  const group = new THREE.Group();
  group.position.set(spot.x, groundHeight(spot.x, spot.z), spot.z);
  const stone = new THREE.MeshLambertMaterial({ color: 0x4a5270, flatShading: true });
  const iron = new THREE.MeshLambertMaterial({ color: 0x1b1d2c, flatShading: true });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.45, 7), stone);
  base.position.y = 0.22;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.2, 6), iron);
  post.position.y = 1;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.28, 0.45, 8), iron);
  bowl.position.y = 1.72;
  group.add(base, post, bowl);

  const flame = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.5, 7), new THREE.MeshBasicMaterial({ color: 0xff5b2e, fog: false }));
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 6), new THREE.MeshBasicMaterial({ color: 0xffd36a, fog: false }));
  inner.position.y = -0.2;
  flame.add(outer, inner);
  flame.position.y = 2.6;
  flame.visible = false;
  group.add(flame);

  const light = new THREE.PointLight(0xff8040, 0, 26, 1.6);
  light.position.y = 3;
  const beam = makeBeam(0xc9dcff);
  group.add(light, beam);

  scene.add(group);
  addCollider(spot.x, spot.z, 1.15);
  return { x: spot.x, z: spot.z, lit: false, progress: 0, flame, light, beam };
}

function buildAltar(scene) {
  const { x, z } = LANDMARKS.altar;
  const group = new THREE.Group();
  group.position.set(x, groundHeight(x, z), z);
  const stone = new THREE.MeshLambertMaterial({ color: 0x424a68, flatShading: true });
  for (const [radius, height, y] of [[4.2, 0.5, 0.25], [3, 0.5, 0.75], [1.8, 0.5, 1.25]]) {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius, height, 8), stone);
    step.position.y = y;
    group.add(step);
  }
  const iceMat = new THREE.MeshLambertMaterial({ color: 0x9fe4ff, transparent: true, opacity: 0.55, flatShading: true, emissive: 0x2a6f9c });
  const ice = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 0), iceMat);
  ice.position.y = 2.8;
  ice.scale.set(1, 1.7, 1);
  group.add(ice);

  const blade = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, fog: false });
  const dark = new THREE.MeshLambertMaterial({ color: 0x20243a });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.06), glow);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.14), dark);
  guard.position.y = 1.32;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), dark);
  grip.position.y = 1.65;
  blade.add(edge, guard, grip);
  blade.position.y = 3;
  group.add(blade);

  const beam = makeBeam(0x7fdcff);
  beam.visible = false;
  group.add(beam);
  scene.add(group);
  addCollider(x, z, 2.6);
  return { x, z, group, ice, blade, beam };
}

function buildSnow(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const c = canvas.getContext('2d');
  const grad = c.createRadialGradient(8, 8, 1, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 16, 16);

  const count = 2200;
  const box = { w: 56, h: 24 };
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * box.w;
    pos[i * 3 + 1] = Math.random() * box.h;
    pos[i * 3 + 2] = Math.random() * box.w;
    speed[i] = 0.9 + Math.random() * 1.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.15, map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, color: 0xf2f5ff,
  }));
  points.frustumCulled = false;
  scene.add(points);

  const wrap = (v, size) => ((v % size) + size) % size;
  let time = 0;
  return (dt, center) => {
    time += dt;
    const out = geo.attributes.position.array;
    const drift = Math.sin(time * 0.25) * 0.8 + 0.6;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += (drift + Math.sin(time + i) * 0.25) * dt;
      pos[i * 3 + 1] -= speed[i] * dt;
      out[i * 3] = center.x + wrap(pos[i * 3] - center.x, box.w) - box.w / 2;
      out[i * 3 + 1] = center.y + wrap(pos[i * 3 + 1] - center.y, box.h) - box.h / 2;
      out[i * 3 + 2] = center.z + wrap(pos[i * 3 + 2] - center.z, box.w) - box.w / 2;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

function buildWorld(scene) {
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.034);
  scene.add(new THREE.HemisphereLight(0xb7c8f5, 0x48557f, 2));
  const moon = new THREE.DirectionalLight(0xc8d8ff, 1.05);
  moon.position.set(-30, 60, 25);
  scene.add(moon);

  buildTerrain(scene);
  buildForest(scene);
  return {
    wards: LANDMARKS.wards.map((spot) => buildWard(scene, spot)),
    altar: buildAltar(scene),
    updateSnow: buildSnow(scene),
  };
}
