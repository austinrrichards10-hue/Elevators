// Dressing the city so it feels like a real one: two parks (Sakura Park with its pond, red
// bridge, stone lanterns and a little shrine; and a green park with a lawn and a playground),
// trees down every pavement, road markings and zebra crossings, traffic lights, cars on the
// move, shopfronts and rooftop clutter, vending machines with drinks in them, parasols on the
// beach, and out on the horizon Mt. Fuji, a red-and-white broadcast tower and a bridge across
// the bay. Built from instanced parts so it all draws in a few calls.

const PARKS = {
  sakura: { x0: -54, x1: -6, z0: 6, z1: 44 },
  green: { x0: -54, x1: -6, z0: 56, z1: 94 },
};
const inPark = (x, z, pad = 0) => Object.values(PARKS).some((p) => x > p.x0 - pad && x < p.x1 + pad && z > p.z0 - pad && z < p.z1 + pad);

function instanced(G, geo, mat, list, colors = null) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((p, i) => {
    o.position.set(p[0], p[1], p[2]);
    o.rotation.set(p[6] || 0, p[3] || 0, 0);
    o.scale.set(p[4] || 1, p[5] || p[4] || 1, p[7] || p[4] || 1);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (colors) m.setColorAt(i, c.setHex(colors[i % colors.length]));
  });
  m.count = list.length;
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  G.add(m);
  return m;
}

function buildCityDecor(G, rand, rect) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; G.add(m); return m; };
  const decor = {};
  /* ---------- Parks ---------- */
  const grass = std(0x5f8f4a, { roughness: 1 }), path = std(0xc9b99a, { roughness: 1 }), hedge = std(0x3f6a36, { roughness: 1 });
  const sakuraTrees = [], greenTrees = [], lanterns = [], benches = [];
  for (const [name, P] of Object.entries(PARKS)) {
    const w = P.x1 - P.x0, d = P.z1 - P.z0, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
    add(new THREE.BoxGeometry(w, 0.2, d), grass, cx, 0.1, cz).castShadow = false;
    // Gravel paths crossing it, and a ring round the middle.
    add(new THREE.BoxGeometry(w, 0.22, 3), path, cx, 0.11, cz).castShadow = false;
    add(new THREE.BoxGeometry(3, 0.22, d), path, cx, 0.11, cz).castShadow = false;
    const ring = add(new THREE.RingGeometry(8, 10.5, 40).rotateX(-Math.PI / 2), path, cx, 0.225, cz); ring.castShadow = false;
    // Low hedges round the edge, open at the paths.
    for (const [hx, hz, hw, hd] of [[cx - w / 4 - 0.75, P.z0 + 0.5, w / 2 - 3, 1], [cx + w / 4 + 0.75, P.z0 + 0.5, w / 2 - 3, 1], [cx - w / 4 - 0.75, P.z1 - 0.5, w / 2 - 3, 1], [cx + w / 4 + 0.75, P.z1 - 0.5, w / 2 - 3, 1], [P.x0 + 0.5, cz - d / 4 - 0.75, 1, d / 2 - 3], [P.x1 - 0.5, cz - d / 4 - 0.75, 1, d / 2 - 3], [P.x0 + 0.5, cz + d / 4 + 0.75, 1, d / 2 - 3], [P.x1 - 0.5, cz + d / 4 + 0.75, 1, d / 2 - 3]]) {
      add(new THREE.BoxGeometry(hw, 0.9, hd), hedge, hx, 0.55, hz);
      rect(hx - hw / 2, hx + hw / 2, hz - hd / 2, hz + hd / 2);
    }
    // Trees through it, clear of the paths.
    for (let i = 0; i < 40; i++) {
      const x = P.x0 + 3 + rand() * (w - 6), z = P.z0 + 3 + rand() * (d - 6);
      if (Math.abs(x - cx) < 3.5 || Math.abs(z - cz) < 3.5) continue;
      const r = Math.hypot(x - cx, z - cz);
      if (r > 7 && r < 11.5) continue;
      if (name === 'sakura' && Math.hypot(x - (cx + 12), z - (cz - 9)) < 7) continue; // the pond
      if (name === 'sakura' && Math.hypot(x - (cx - 13), z - (cz + 10)) < 6) continue; // the shrine
      if (name === 'green' && Math.hypot(x - (cx + 13), z - (cz + 10)) < 7) continue; // the playground
      (name === 'sakura' || rand() < 0.25 ? sakuraTrees : greenTrees).push([x, 0, z, rand() * 6, 0.85 + rand() * 0.5]);
      rect(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
    }
    for (const [lx, lz] of [[cx - 4, cz - 4], [cx + 4, cz - 4], [cx - 4, cz + 4], [cx + 4, cz + 4], [cx - 9, cz], [cx + 9, cz]]) lanterns.push([lx, 0, lz, 0, 1]);
    for (const [bx, bz, r] of [[cx - 6, cz - 1.8, 0], [cx + 6, cz + 1.8, Math.PI], [cx - 1.8, cz + 6, Math.PI / 2], [cx + 1.8, cz - 6, -Math.PI / 2]]) benches.push([bx, 0, bz, r, 1]);
    if (name === 'sakura') {
      // The pond, a red arched bridge over the stream that feeds it, rocks, and koi.
      const px = cx + 12, pz = cz - 9;
      const pond = add(new THREE.CircleGeometry(5.5, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a6a7a, roughness: 0.08, metalness: 0.3 }), px, 0.24, pz);
      pond.castShadow = false;
      rect(px - 4.6, px + 4.6, pz - 4.6, pz + 4.6);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(new THREE.DodecahedronGeometry(0.5 + rand() * 0.4, 0), std(0x8a8a86), px + Math.cos(a) * 5.6, 0.3, pz + Math.sin(a) * 5.6); }
      decor.koi = [0, 1, 2, 3].map((i) => { const k = add(new THREE.SphereGeometry(0.18, 8, 6), std(i % 2 ? 0xff7a2a : 0xf4f0ea), px, 0.2, pz); k.scale.set(0.6, 0.4, 1.6); k.userData = { a: i * 1.6, r: 1.5 + i * 0.8, px, pz }; return k; });
      const red = std(0xc8302a, { roughness: 0.6 });
      const bridge = new THREE.Group(); bridge.position.set(px - 7, 0, pz); G.add(bridge);
      for (let i = 0; i <= 8; i++) { const u = i / 8, y = 0.25 + Math.sin(u * Math.PI) * 0.9; const plank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 2.2), std(0x6a4a30)); plank.position.set(-2 + u * 4, y, 0); bridge.add(plank); for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), red); post.position.set(-2 + u * 4, y + 0.45, s * 1.05); bridge.add(post); } }
      for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.06, 6, 20, Math.PI), red); rail.position.set(0, -0.5, s * 1.05); rail.scale.y = 0.75; bridge.add(rail); }
      // The little shrine: a vermilion torii, a stone path, a small hall with a sloping roof.
      const sx = cx - 13, sz = cz + 10;
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.2, 0.22, 3.6, 10), red, sx + s * 1.6, 1.8, sz - 5);
      add(new THREE.BoxGeometry(4.6, 0.3, 0.4), std(0x1a1a1a), sx, 3.75, sz - 5);
      add(new THREE.BoxGeometry(3.9, 0.22, 0.3), red, sx, 3.2, sz - 5);
      add(new THREE.BoxGeometry(3.4, 2.2, 2.8), std(0x8a5a3a), sx, 1.3, sz);
      const roof = add(new THREE.ConeGeometry(3.4, 1.4, 4), std(0x3a3a40), sx, 3.1, sz); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.85;
      add(new THREE.BoxGeometry(1.2, 0.08, 4.5), std(0xa8a8a2), sx, 0.25, sz - 2.6).castShadow = false;
      rect(sx - 1.8, sx + 1.8, sz - 1.5, sz + 1.5);
      add(new THREE.PlaneGeometry(4, 1.1), new THREE.MeshBasicMaterial({ map: neonTexture('桜公園', '#ffb6cf', '#2a1418'), toneMapped: false }), cx, 2.6, P.z0 - 0.05).rotation.y = Math.PI;
    } else {
      // A playground: a slide, swings, a climbing frame; a drinking fountain.
      const gx = cx + 13, gz = cz + 10;
      const blue = std(0x3a7ad8, { roughness: 0.5 }), yellow = std(0xf0c030, { roughness: 0.5 });
      add(new THREE.BoxGeometry(2, 1.6, 2), blue, gx, 0.8, gz);
      const slide = add(new THREE.BoxGeometry(0.9, 0.1, 3.2), yellow, gx + 2.2, 0.85, gz); slide.rotation.z = -0.45;
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), std(0xd83a3a), gx - 4 + s * 1.5, 1.2, gz - 3);
      add(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), std(0xd83a3a), gx - 4, 2.4, gz - 3).rotation.z = Math.PI / 2;
      decor.swings = [-0.6, 0.6].map((o) => { const s = new THREE.Group(); s.position.set(gx - 4 + o, 2.4, gz - 3); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.25), yellow); seat.position.y = -1.7; s.add(seat); G.add(s); return s; });
      rect(gx - 1.2, gx + 3.6, gz - 1.2, gz + 1.2);
      add(new THREE.PlaneGeometry(4, 1.1), new THREE.MeshBasicMaterial({ map: neonTexture('みどり公園', '#a8ffb0', '#122a18'), toneMapped: false }), cx, 2.6, P.z0 - 0.05).rotation.y = Math.PI;
    }
  }
  /* ---------- Street trees ---------- */
  // Down every avenue and street, on the pavement side, between the lamps.
  const avenues = [-120, -60, 0, 60, 120], streets = [-112, -50, 0, 50, 100, 146];
  for (const ax of avenues) for (let z = -100; z <= 140; z += 16) for (const s of [-1, 1]) {
    const x = ax + s * 5.4, zz = z + 8;
    if (x < CITY.bounds.x0 + 1 || x > CITY.bounds.x1 - 1) continue;
    if (streets.some((sz) => Math.abs(zz - sz) < 7)) continue;
    if (Math.abs(ax + 60) < 1 && zz > -46 && zz < 96) continue; // the arcade has lanterns instead
    if (Math.abs(x) < 28 && zz > -48 && zz < -4) continue; // the square
    (ax === 0 && zz > 0 ? sakuraTrees : greenTrees).push([x, 0.14, zz, rand() * 6, 0.7 + rand() * 0.25]);
    rect(x - 0.25, x + 0.25, zz - 0.25, zz + 0.25);
  }
  for (const sz of streets.slice(1, 5)) for (let x = -112; x <= 112; x += 18) for (const s of [-1, 1]) {
    const z = sz + s * 5.4;
    if (avenues.some((ax) => Math.abs(x - ax) < 7)) continue;
    if (Math.abs(x) < 28 && z > -48 && z < -4) continue;
    if (x > -66 && x < -54) continue;
    greenTrees.push([x, 0.14, z, rand() * 6, 0.7 + rand() * 0.25]);
    rect(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
  }
  // Trunks, round green crowns (each a slightly different green), pink sakura clouds.
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 2.6, 7).translate(0, 1.3, 0);
  instanced(G, trunkGeo, std(0x4a3426), [...greenTrees, ...sakuraTrees].map((t) => [t[0], t[1], t[2], t[3], t[4]]));
  const crownGeo = new THREE.IcosahedronGeometry(1.5, 1).translate(0, 3.4, 0);
  decor.greenCrowns = instanced(G, crownGeo, std(0xffffff, { roughness: 0.9 }), greenTrees.map((t) => [t[0], t[1], t[2], t[3], t[4], t[4] * 0.9]), [0x4f8a3e, 0x5a9444, 0x467c38, 0x62a04a]);
  const puffs = [];
  for (const t of sakuraTrees) for (let k = 0; k < 4; k++) puffs.push([t[0] + (rand() - 0.5) * 1.8 * t[4], t[1] + 3 + rand() * 1.1 * t[4], t[2] + (rand() - 0.5) * 1.8 * t[4], rand() * 6, (0.9 + rand() * 0.5) * t[4]]);
  instanced(G, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, emissive: 0x3a1020, emissiveIntensity: 0.25 }), puffs, [0xf7bfd3, 0xf5b0c8, 0xfad0de, 0xf2a6c0]);
  // Stone lanterns and benches.
  const stone = std(0xa6a39c);
  instanced(G, new THREE.BoxGeometry(0.5, 1.2, 0.5).translate(0, 0.6, 0), stone, lanterns);
  instanced(G, new THREE.ConeGeometry(0.55, 0.4, 4).translate(0, 1.4, 0), stone, lanterns.map((l) => [l[0], l[1], l[2], Math.PI / 4, 1]));
  decor.lanternGlow = instanced(G, new THREE.BoxGeometry(0.32, 0.26, 0.32).translate(0, 1.05, 0), new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffb050, emissiveIntensity: 0.2 }), lanterns);
  for (const l of lanterns) rect(l[0] - 0.3, l[0] + 0.3, l[2] - 0.3, l[2] + 0.3);
  instanced(G, new THREE.BoxGeometry(2.4, 0.12, 0.6).translate(0, 0.5, 0), std(0x7a5236), benches);
  instanced(G, new THREE.BoxGeometry(2.4, 0.5, 0.08).translate(0, 0.8, -0.3), std(0x7a5236), benches);
  /* ---------- Roads ---------- */
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.9 });
  const dashes = [], zebra = [];
  for (const ax of avenues) for (let z = -104; z <= 144; z += 6) if (!streets.some((sz) => Math.abs(z - sz) < 6)) dashes.push([ax, 0.02, z, 0, 0.14, 0.02, 0, 2.4]);
  for (const sz of streets.slice(0, 5)) for (let x = -116; x <= 116; x += 6) if (!avenues.some((ax) => Math.abs(x - ax) < 6)) dashes.push([x, 0.02, sz, Math.PI / 2, 0.14, 0.02, 0, 2.4]);
  // Zebra crossings on every side of every crossroads.
  for (const ax of avenues) for (const sz of streets.slice(0, 5)) {
    for (let k = -3; k <= 3; k++) {
      zebra.push([ax + k * 1.1, 0.025, sz - 5, 0, 0.55, 0.02, 0, 2.4], [ax + k * 1.1, 0.025, sz + 5, 0, 0.55, 0.02, 0, 2.4]);
      zebra.push([ax - 5, 0.025, sz + k * 1.1, Math.PI / 2, 0.55, 0.02, 0, 2.4], [ax + 5, 0.025, sz + k * 1.1, Math.PI / 2, 0.55, 0.02, 0, 2.4]);
    }
  }
  const markGeo = new THREE.BoxGeometry(1, 1, 1);
  const dm = instanced(G, markGeo, white, dashes); dm.castShadow = false;
  const zm = instanced(G, markGeo, white, zebra); zm.castShadow = false;
  // Traffic lights at the corners: a pole, a head, and its three lamps.
  const lightsAt = [];
  for (const ax of avenues) for (const sz of streets.slice(0, 5)) {
    if (ax < CITY.bounds.x0 || ax > CITY.bounds.x1) continue;
    lightsAt.push([ax + 4.6, 0, sz - 4.6, 0], [ax - 4.6, 0, sz + 4.6, Math.PI]);
  }
  instanced(G, new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6).translate(0, 1.8, 0), std(0x2e3036), lightsAt);
  instanced(G, new THREE.BoxGeometry(0.35, 0.95, 0.3).translate(0, 3.6, 0), std(0x1a1c20), lightsAt);
  decor.signals = instanced(G, new THREE.SphereGeometry(0.11, 8, 6).translate(0, 3.6, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), lightsAt, [0x40ff80]);
  decor.signalsAt = lightsAt;
  for (const l of lightsAt) rect(l[0] - 0.12, l[0] + 0.12, l[2] - 0.12, l[2] + 0.12);
  /* ---------- Cars ---------- */
  decor.cars = buildCars(G, rand);
  /* ---------- Vending machines ---------- */
  const vendTex = paintCanvas(128, 224, (g) => {
    g.fillStyle = '#f2f4f8'; g.fillRect(0, 0, 128, 224);
    g.fillStyle = '#1a6ad8'; g.fillRect(0, 0, 128, 26);
    g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText('DRINKS', 64, 18);
    g.fillStyle = '#cfe6ff'; g.fillRect(8, 32, 112, 118);
    const can = ['#e8303a', '#2a8a4a', '#f0b020', '#2a6aff', '#8a3ad8', '#e8e8e8'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { g.fillStyle = can[(r * 2 + c) % 6]; g.fillRect(12 + c * 18, 38 + r * 38, 12, 26); g.fillStyle = '#fff'; g.fillRect(12 + c * 18, 66 + r * 38, 12, 4); g.fillStyle = '#3a3a3a'; g.fillRect(14 + c * 18, 72 + r * 38, 8, 3); }
    g.fillStyle = '#2a2e36'; g.fillRect(16, 168, 96, 30); g.fillStyle = '#5ad8ff'; g.fillRect(84, 160, 24, 6);
  });
  const vendFront = new THREE.MeshStandardMaterial({ map: vendTex, emissiveMap: vendTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.5 });
  const vendBody = std(0xe4e8ee, { roughness: 0.5, metalness: 0.2 });
  decor.vendFront = vendFront;
  for (const [x, z, r] of [[-6, -48.4, 0], [24.4, -8, -Math.PI / 2], [-66.4, 40, Math.PI / 2], [64, -60.4, 0], [6, 52.4, 0], [-24, 98.4, 0]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; G.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.85, 0.75).translate(0, 0.93, 0), [vendBody, vendBody, vendBody, vendBody, vendFront, vendBody]);
    body.castShadow = true; g.add(body);
    rect(x - 0.6, x + 0.6, z - 0.45, z + 0.45);
  }
  /* ---------- The beach ---------- */
  const stripes = [0xe8303a, 0x2a8ad8, 0xf0c030, 0x39d5c8, 0xff8ab8];
  for (let i = 0; i < 14; i++) {
    const x = -100 + i * 15 + rand() * 5, z = -134 - rand() * 18;
    if (Math.abs(x - CITY.landing.x) < 8) continue;
    add(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 5), std(0xe8e2d6), x, 1.15, z);
    add(new THREE.ConeGeometry(1.4, 0.5, 10), std(stripes[i % stripes.length], { side: THREE.DoubleSide }), x, 2.3, z);
    const towel = add(new THREE.BoxGeometry(0.8, 0.02, 1.8), std(stripes[(i + 2) % stripes.length]), x + 1.1, 0.05, z); towel.rotation.y = rand();
    rect(x - 0.08, x + 0.08, z - 0.08, z + 0.08);
  }
  // A wooden pier out into the sea.
  add(new THREE.BoxGeometry(3, 0.2, 40), std(0x7a5a3a), -70, 0.6, -186);
  for (let z = -168; z >= -205; z -= 4) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.12, 0.12, 2, 6), std(0x5a4030), -70 + s * 1.4, -0.3, z);
  /* ---------- Landmarks ---------- */
  decor.landmarks = buildLandmarks(G, rand);
  return decor;
}

// Cars driving round the blocks, in lanes, stopping short of her if she's in the road.
function buildCars(G, rand) {
  const n = 28, colors = [0xe8e8ec, 0x1a1c22, 0xc8302a, 0x2a5ad8, 0x8a8e96, 0xf0c030, 0x3a6a4a, 0xffffff];
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.75, 4.2).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), n);
  const cabin = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.6, 2.2).translate(0, 1.3, -0.2), new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.1, metalness: 0.6 }), n);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.16, 0.05).translate(0, 0.7, 2.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4d8).multiplyScalar(1.5), toneMapped: false }), n);
  const tails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.14, 0.05).translate(0, 0.75, -2.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2030).multiplyScalar(1.5), toneMapped: false }), n);
  const c = new THREE.Color();
  for (const m of [body, cabin, heads, tails]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = m === body; m.frustumCulled = false; G.add(m); }
  const cars = [];
  const avenues = [-120, -60, 0, 60, 120], streets = [-112, -50, 0, 50, 100];
  for (let i = 0; i < n; i++) {
    body.setColorAt(i, c.setHex(colors[i % colors.length]));
    // Each drives one lane down an avenue or along a street, and wraps round at the end.
    const alongZ = i % 2 === 0;
    const line = alongZ ? avenues[1 + (i % 3)] : streets[1 + (i % 4)];
    const dir = (i >> 1) % 2 ? 1 : -1;
    cars.push({ alongZ, line: line + dir * 2, dir, s: rand() * 260 - 130, speed: 7 + rand() * 4, v: 0 });
  }
  return { body, cabin, heads, tails, cars, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), one: new THREE.Vector3(1, 1, 1) };
}

function updateCars(dt, D) {
  const C = D.cars;
  for (let i = 0; i < C.cars.length; i++) {
    const car = C.cars[i];
    const x = car.alongZ ? car.line : car.s, z = car.alongZ ? car.s : car.line;
    // Stop for her if she's standing in the lane just ahead.
    const ahead = car.alongZ ? (player.pos.z - CITY.y * 0 - z) * car.dir : (player.pos.x - x) * car.dir;
    const across = car.alongZ ? Math.abs(player.pos.x - x) : Math.abs(player.pos.z - z);
    const blocked = !show.active && across < 1.8 && ahead > 0 && ahead < 9;
    car.v += ((blocked ? 0 : car.speed) - car.v) * (1 - Math.exp(-dt * (blocked ? 6 : 1.5)));
    car.s += car.v * car.dir * dt;
    const lo = car.alongZ ? -108 : -118, hi = car.alongZ ? 144 : 118;
    if (car.s > hi) car.s = lo; if (car.s < lo) car.s = hi;
    C.e.set(0, car.alongZ ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    C.q.setFromEuler(C.e);
    C.m4.compose(C.p.set(x, 0, z), C.q, C.one);
    for (const m of [C.body, C.cabin, C.heads, C.tails]) m.setMatrixAt(i, C.m4);
  }
  for (const m of [C.body, C.cabin, C.heads, C.tails]) m.instanceMatrix.needsUpdate = true;
}

// On the horizon: Mt. Fuji to the west, a red-and-white broadcast tower over the rooftops, and a
// long suspension bridge across the bay, its cables strung with lights.
function buildLandmarks(G, rand) {
  const L = {};
  // Fuji: a broad cone, blue with distance, white at the top.
  const fuji = new THREE.Mesh(new THREE.ConeGeometry(900, 520, 48, 4, true), new THREE.MeshBasicMaterial({ color: 0x7d8aac, fog: false }));
  const fp = fuji.geometry.attributes.position, col = new Float32Array(fp.count * 3), cc = new THREE.Color();
  for (let i = 0; i < fp.count; i++) { const y = fp.getY(i); cc.setHex(0x6f7d9e).lerp(new THREE.Color(0xf4f6fb), smooth((y - 120) / 60)); col.set([cc.r, cc.g, cc.b], i * 3); }
  fuji.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  fuji.material.vertexColors = true;
  fuji.material.color.set(0xffffff);
  fuji.position.set(-2600, 200, 2400);
  fuji.renderOrder = -1;
  G.add(fuji);
  L.fuji = fuji;
  // The broadcast tower: four legs leaning in, bands of red and white, an aerial with a light.
  const tower = new THREE.Group();
  tower.position.set(-300, 0, 560);
  const red = new THREE.MeshStandardMaterial({ color: 0xe8402a, roughness: 0.6 }), white = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 });
  const H = 220;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, H, 6).translate(0, H / 2, 0), red);
    leg.position.set(Math.cos(a) * 18, 0, Math.sin(a) * 18);
    leg.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
    tower.add(leg);
  }
  for (let k = 0; k < 10; k++) {
    const y = 10 + k * 20, w = 36 * (1 - y / (H * 1.08));
    const band = new THREE.Mesh(new THREE.BoxGeometry(w, 2, w), k % 2 ? white : red);
    band.position.y = y;
    tower.add(band);
  }
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 8, 16), white); deck.position.y = 120; tower.add(deck);
  const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 50, 6).translate(0, 25, 0), red); aerial.position.y = H; tower.add(aerial);
  L.towerLight = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xff3030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  L.towerLight.position.y = H + 52; L.towerLight.scale.setScalar(14);
  tower.add(L.towerLight);
  L.towerGlow = new THREE.PointLight(0xffa060, 0, 120, 1.4); L.towerGlow.position.y = 80; tower.add(L.towerGlow);
  G.add(tower);
  L.tower = tower;
  // The bay bridge, from the shore to the east out across the water.
  const bridge = new THREE.Group();
  bridge.position.set(300, 0, -150);
  const steel = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.5, metalness: 0.3 });
  const deckB = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 900), steel); deckB.position.set(0, 14, -450); bridge.add(deckB);
  for (const z of [-180, -620]) for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(3, 90, 4), steel); t.position.set(s * 10, 45, z); bridge.add(t); }
  for (let z = -60; z >= -880; z -= 80) { const p = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 14, 8).translate(0, 7, 0), steel); p.position.set(0, -2, z); bridge.add(p); }
  // Cables: a curve between the towers on each side, strung with lights that glow at night.
  L.bridgeLights = [];
  const lightMat = new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xc8f0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 40; k++) { const z = lerp(0, -800, k / 40); let y; if (z > -180) y = lerp(16, 90, (z - 0) / -180); else if (z > -620) { const u = (z + 180) / -440; y = 90 - Math.sin(u * Math.PI) * 60; } else y = lerp(90, 16, (z + 620) / -180); pts.push(new THREE.Vector3(s * 10, y, z)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xdfe6f0 }));
    bridge.add(line);
    for (let k = 0; k <= 40; k += 2) { const l = new THREE.Sprite(lightMat); l.position.copy(pts[k]); l.scale.setScalar(5); bridge.add(l); L.bridgeLights.push(l); }
  }
  L.bridgeMat = lightMat;
  G.add(bridge);
  L.bridge = bridge;
  return L;
}

function updateCityDecor(dt) {
  const D = city.decor;
  if (!D) return;
  const night = 1 - dayNight.light;
  updateCars(dt, D);
  // Traffic lights cycle: green, amber, red, a phase each way.
  const phase = Math.floor(game.time / 4) % 3;
  if (phase !== D.lastPhase) {
    D.lastPhase = phase;
    const c = new THREE.Color();
    D.signalsAt.forEach((_, i) => D.signals.setColorAt(i, c.setHex([[0x40ff80, 0xffc030, 0xff3030], [0xff3030, 0xff3030, 0x40ff80]][i % 2][phase])));
    D.signals.instanceColor.needsUpdate = true;
  }
  D.lanternGlow.material.emissiveIntensity = 0.2 + night * 2.2;
  D.vendFront.emissiveIntensity = 0.35 + night * 0.9;
  D.cars.heads.visible = D.cars.tails.visible = night > 0.3;
  if (D.koi) for (const k of D.koi) { k.userData.a += dt * 0.5; k.position.set(k.userData.px + Math.cos(k.userData.a) * k.userData.r, 0.2, k.userData.pz + Math.sin(k.userData.a) * k.userData.r); k.rotation.y = -k.userData.a; }
  if (D.swings) D.swings.forEach((s, i) => { s.rotation.x = Math.sin(game.time * 1.6 + i) * 0.35; });
  const L = D.landmarks;
  L.towerLight.material.opacity = Math.floor(game.time * 1.2) % 2 ? 1 : 0.2;
  L.towerGlow.intensity = night * 6;
  L.bridgeMat.opacity = night * 0.95;
}
