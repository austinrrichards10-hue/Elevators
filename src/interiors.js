// Places in Tokyo she can walk into: Mrs. Ishida's capsule hotel, the Starlight Production
// office, her apartment, and a gas station with a 24-hour convenience store. Each has a real
// building in the street with a lit door, and a furnished room inside, out past the edge of
// the city, that she steps into when she goes through it. The guide arrow, the map and the
// phone know when someone is indoors and send her to the right door.

/* ---------- The buildings in the street ---------- */
// Lots kept clear of the random towers: [x0, x1, z0, z1].
const SPECIAL_LOTS = [
  [-56, -34, -74, -54], // capsule hotel
  [64, 84, -74, -54], // apartment
  [64, 90, -46, -16], // Starlight Production
  [64, 116, 54, 96], // gas station
];
const lotTaken = (x0, x1, z0, z1) => SPECIAL_LOTS.some(([a, b, c, d]) => x1 > a && x0 < b && z1 > c && z0 < d);

// The rooms. `door` is the spot on the pavement outside, `entry` where she stands inside
// (room coordinates), `face` which way she faces coming in.
const ROOMS = {
  hotel: { name: 'Ishida Capsule Hotel', w: 16, d: 14, h: 4.2, door: { x: -45, z: -53.6 }, entry: { x: 0, z: -5.6 }, open: () => true },
  apartment: { name: 'your apartment', w: 12, d: 10, h: 3.3, door: { x: 74, z: -53.6 }, entry: { x: -4, z: -3.8 }, open: () => has('apartment'), locked: 'Maison Hoshizora. Somebody else lives here... for now.' },
  agency: { name: 'Starlight Production', w: 18, d: 16, h: 4.6, door: { x: 62.6, z: -36 }, entry: { x: 0, z: -6.6 }, open: () => true },
  konbini: { name: 'the convenience store', w: 14, d: 12, h: 3.6, door: { x: 103, z: 51.8 }, entry: { x: 0, z: -4.6 }, open: () => true },
};
const ROOM_ORIGIN = { x: 3400, z: 0 };
Object.keys(ROOMS).forEach((id, i) => { ROOMS[id].x = ROOM_ORIGIN.x + i * 70; ROOMS[id].z = ROOM_ORIGIN.z; ROOMS[id].id = id; });
const roomPoint = (id, x, z) => ({ x: ROOMS[id].x + x, z: ROOMS[id].z + z });
function roomAt(x, z) { return Object.values(ROOMS).find((r) => Math.abs(x - r.x) < r.w / 2 + 1 && Math.abs(z - r.z) < r.d / 2 + 1) || null; }

// Called by the city builder while it lays out the towers.
function buildLots(G, towers, rect) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const glow = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
  const sign = (text, color, bg, w, h, x, y, z, ry) => { const m = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: neonTexture(text, color, bg), toneMapped: false }), x, y, z); m.rotation.y = ry; return m; };
  // A lit glass door with a frame and a little canopy, on the face of a building.
  const door = (x, z, ry, color = 0xffe2b0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), glow(color, 1.1)); pane.position.set(0, 1.3, 0.06); g.add(pane);
    const frame = std(0x2a2c32, { metalness: 0.7, roughness: 0.4 });
    for (const sx of [-1.15, 1.15]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.18), frame); p.position.set(sx, 1.4, 0.08); g.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.18), frame); top.position.set(0, 2.74, 0.08); g.add(top);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.1), frame); mid.position.set(0, 1.3, 0.1); g.add(mid);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.4), std(0x30343c, { metalness: 0.5 })); awning.position.set(0, 3.2, 0.7); g.add(awning);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2).rotateX(-Math.PI / 2), std(0x3a2a24)); mat.position.set(0, 0.16, 0.7); g.add(mat);
    return g;
  };
  // Capsule hotel: a narrow eight-storey block, a red noren over the door.
  towers.push([-45, -64, 18, 26, 16]); rect(-54.3, -35.7, -72.3, -55.7);
  door(-45, -55.95, 0);
  add(new THREE.PlaneGeometry(2.6, 1.2), std(0xb8262a, { side: THREE.DoubleSide }), -45, 2.2, -55.6);
  sign('カプセルホテル', '#ffd6a0', '#2a0c08', 7, 1.6, -45, 5, -55.9, 0);
  // Apartment: a smart residential block.
  towers.push([74, -64, 18, 34, 16]); rect(64.7, 83.3, -72.3, -55.7);
  door(74, -55.95, 0, 0xfff0d8);
  sign('メゾン星空', '#cfe8ff', '#0c1424', 6, 1.4, 74, 4.4, -55.9, 0);
  // Starlight Production: a tall glass tower, its name in light over the doors.
  towers.push([76, -31, 22, 78, 26]); rect(64.7, 87.3, -44.3, -17.7);
  door(64.95, -36, -Math.PI / 2, 0xd8f6ff);
  door(64.95, -24, -Math.PI / 2, 0xffd0dc);
  sign('STARLIGHT', '#8ff4e8', '#04141a', 8, 2, 64.92, 6, -36, -Math.PI / 2);
  sign('PRIME BEAT TV', '#ff8ab8', '#1a0410', 6, 1.4, 64.92, 4.2, -24, -Math.PI / 2);
  // The gas station: a canopy over four pumps, a price sign on a pole, the store behind.
  const lot = add(new THREE.BoxGeometry(50, 0.12, 40), std(0x4a4c52, { roughness: 0.95 }), 90, 0.06, 75);
  lot.receiveShadow = true;
  const canopy = add(new THREE.BoxGeometry(22, 0.8, 14), std(0xf2f2f4), 80, 5.6, 66);
  canopy.castShadow = true;
  for (const [w, d, x, z] of [[22.2, 0.2, 80, 59], [22.2, 0.2, 80, 73], [0.2, 14.2, 69, 66], [0.2, 14.2, 91, 66]]) add(new THREE.BoxGeometry(w, 0.55, d), glow(0xff5a3a, 1.4), x, 5.6, z);
  for (const [x, z] of [[71, 61], [89, 61], [71, 71], [89, 71]]) { add(new THREE.CylinderGeometry(0.3, 0.3, 5.2, 10), std(0xe8e8ec), x, 2.6, z); rect(x - 0.4, x + 0.4, z - 0.4, z + 0.4); }
  for (let i = 0; i < 6; i++) add(new THREE.PlaneGeometry(2.4, 0.6).rotateX(Math.PI / 2), glow(0xffffff, 1.3), 72 + (i % 3) * 8, 5.18, 62.5 + Math.floor(i / 3) * 7);
  for (const [x, z] of [[76, 63.5], [84, 63.5], [76, 68.5], [84, 68.5]]) {
    add(new THREE.BoxGeometry(1.1, 0.25, 2.2), std(0x9a9ca4), x, 0.12, z);
    add(new THREE.BoxGeometry(0.8, 1.7, 0.6), std(0xd8302f), x, 1.0, z);
    add(new THREE.PlaneGeometry(0.55, 0.35), glow(0x8ff4e8, 1.2), x, 1.45, z - 0.31).rotation.y = Math.PI;
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), std(0x1a1a1a), x + 0.45, 1.2, z).rotation.z = 0.6;
    rect(x - 0.6, x + 0.6, z - 1.1, z + 1.1);
  }
  add(new THREE.CylinderGeometry(0.35, 0.35, 9, 10), std(0x8a8e96, { metalness: 0.6 }), 68, 4.5, 56.5);
  sign('SUN OIL', '#ffd36a', '#c8281e', 4, 1.6, 68, 9.2, 56.3, Math.PI);
  sign('¥172  ¥183', '#8fffb0', '#0a0a0a', 4, 1.3, 68, 7.6, 56.3, Math.PI);
  rect(67.5, 68.5, 56, 57);
  // The store: glass front, lit like daylight, open all night.
  towers.push([103, 62, 18, 6, 12]); rect(93.7, 112.3, 55.7, 68.3);
  add(new THREE.PlaneGeometry(14, 3.2), glow(0xf4fbff, 1.05), 103, 1.9, 55.95).rotation.y = Math.PI;
  door(103, 55.9, Math.PI, 0xffffff).position.z = 55.85;
  sign('コンビニ 24H', '#ffffff', '#1e8a4a', 8, 1.6, 103, 4.6, 55.9, Math.PI);
  add(new THREE.BoxGeometry(18.4, 0.5, 0.4), glow(0x39c878, 1.4), 103, 3.6, 55.8);
}

/* ---------- The rooms inside ---------- */
const interior = { built: false, fade: 0 };
function buildInteriors() {
  if (interior.built) return;
  interior.built = true;
  const G = city.group;
  setStreetVisible(true); // notes the street before the rooms join it
  // Lit from within: everything carries a little of its own light, as indoors under
  // ceiling panels, whatever the time outside.
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, emissive: color, emissiveIntensity: 0.32, ...extra });
  const glow = (c, k = 1.4) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const tex = (w, h, fn, rx = 1, ry = 1) => { const t = paintCanvas(w, h, fn); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  const tiles = (a, b) => tex(64, 64, (g) => { g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); g.strokeStyle = 'rgba(0,0,0,.12)'; g.strokeRect(0, 0, 64, 64); });
  const wood = (c) => tex(128, 128, (g) => { g.fillStyle = c; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + (i % 3) * 0.03})`; g.fillRect(0, i * 8, 128, 1 + (i % 2)); } });
  for (const R of Object.values(ROOMS)) {
    const g = new THREE.Group(); g.position.set(R.x, 0, R.z); G.add(g);
    R.g = g; R.rects = [];
    const add = (geo, m, x, y, z, solid = false) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); if (solid) { geo.computeBoundingBox(); const b = geo.boundingBox; R.rects.push({ x0: R.x + x + b.min.x - 0.3, x1: R.x + x + b.max.x + 0.3, z0: R.z + z + b.min.z - 0.3, z1: R.z + z + b.max.z + 0.3 }); } return o; };
    const box = (w, h, d, color, x, y, z, solid = true, extra) => add(new THREE.BoxGeometry(w, h, d), color && color.isMaterial ? color : mat(color, extra), x, y + h / 2, z, solid);
    R.add = add; R.box = box; R.mat = mat; R.glow = glow;
    // The shell: floor, walls, ceiling with light panels.
    const floorTex = R.id === 'konbini' ? tiles('#f2f2ee', '#e2e4e2') : R.id === 'hotel' ? wood('#a87a52') : R.id === 'agency' ? tiles('#d8d4cc', '#cec8be') : wood('#c89a6a');
    floorTex.repeat.set(R.w / 2, R.d / 2);
    add(new THREE.PlaneGeometry(R.w, R.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: floorTex, emissiveIntensity: 0.35 }), 0, 0.01, 0);
    const wallC = { hotel: 0xe8dcc8, apartment: 0xf2ece2, agency: 0xf4f6f8, konbini: 0xf8f8f6 }[R.id];
    add(new THREE.BoxGeometry(R.w, R.h, R.d).translate(0, R.h / 2, 0), mat(wallC, { side: THREE.BackSide, emissiveIntensity: 0.26 }), 0, 0, 0);
    add(new THREE.BoxGeometry(R.w + 0.6, R.h + 0.6, R.d + 0.6).translate(0, R.h / 2, 0), new THREE.MeshBasicMaterial({ color: 0x14161c }), 0, -0.3, 0);
    for (let i = 0; i < Math.floor(R.w / 4); i++) for (let j = 0; j < Math.floor(R.d / 4); j++) add(new THREE.PlaneGeometry(1.6, 0.9).rotateX(Math.PI / 2), glow(0xfff8ee, 1.2), -R.w / 2 + 2 + i * 4, R.h - 0.02, -R.d / 2 + 2 + j * 4);
    // Skirting along the walls.
    for (const [w, d, x, z] of [[R.w, 0.06, 0, -R.d / 2 + 0.03], [R.w, 0.06, 0, R.d / 2 - 0.03], [0.06, R.d, -R.w / 2 + 0.03, 0], [0.06, R.d, R.w / 2 - 0.03, 0]]) box(w, 0.14, d, 0x6a5040, x, 0, z, false);
    // The way out, at the front wall.
    const ex = R.entry;
    box(2.2, 2.6, 0.1, glow(0xd8ecff, 0.9), ex.x, 0, -R.d / 2 + 0.06, false);
    citySpot({ x: R.x + ex.x, z: R.z + ex.z - 0.6, r: 1.8, label: () => 'Press E to go outside', use: () => leaveRoom(), active: () => city.inside === R.id });
    INTERIOR_DRESS[R.id](R);
  }
}

// What's in each room.
const INTERIOR_DRESS = {
  hotel(R) {
    const { box, add, mat, glow } = R;
    // The front desk, with the bell and a cat bed, and the noren to the capsules.
    box(4.4, 1.1, 1, 0x8a5a36, -4, 0, 2.4);
    box(4.6, 0.08, 1.2, 0xd8c8a8, -4, 1.1, 2.4, false);
    box(0.25, 0.12, 0.25, 0xd8b040, -2.6, 1.18, 2.2, false, { metalness: 0.8 });
    add(new THREE.CylinderGeometry(0.45, 0.4, 0.15, 16), mat(0xd8a0b8), -5.8, 0.08, 4.8);
    add(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ map: neonTexture('カプセル', '#ffd6a0', '#3a1408'), toneMapped: false }), -4, 3.2, R.d / 2 - 0.05).rotation.y = Math.PI;
    // Two storeys of capsules down the east wall, each lit warm inside, number eleven glowing.
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      const z = -4.2 + i * 1.6, y = row * 1.3, n = row * 6 + i;
      box(2.4, 1.2, 1.5, 0xf2f0ea, R.w / 2 - 1.3, y, z, row === 0);
      add(new THREE.CircleGeometry(0.48, 20), glow(n === 10 ? 0x8ff4e8 : 0xffc888, n === 10 ? 1.2 : 0.75), R.w / 2 - 2.51, y + 0.6, z).rotation.y = -Math.PI / 2;
      add(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ map: neonTexture(String(n + 1), '#202020', '#f8f8f0'), toneMapped: false }), R.w / 2 - 2.52, y + 1.05, z + 0.55).rotation.y = -Math.PI / 2;
    }
    box(0.6, 2.6, 1.6, 0xc8c8cc, R.w / 2 - 0.4, 0, 4.9, true, { metalness: 0.5 });
    // Lockers down the west wall, a vending machine, plants, slippers by the step.
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) box(0.9, 0.62, 0.5, j % 2 ? 0x8a9aaa : 0x7a8a9a, -R.w / 2 + 0.3, j * 0.66, -2 + i * 0.95, j === 0, { metalness: 0.4 });
    box(1.1, 1.9, 0.8, 0xd83a3a, -R.w / 2 + 0.5, 0, -5, true);
    add(new THREE.PlaneGeometry(0.9, 1.1), glow(0xe8f6ff, 1.1), -R.w / 2 + 0.92, 1.15, -5).rotation.y = Math.PI / 2;
    for (const [x, z] of [[-6.8, 6], [2.6, 6.2], [5.6, -6.2]]) { box(0.5, 0.5, 0.5, 0x6a4a30, x, 0, z, true); add(new THREE.SphereGeometry(0.55, 10, 8), mat(0x3a8a4a), x, 1.0, z); }
    add(new THREE.PlaneGeometry(2.8, 0.3).rotateX(-Math.PI / 2), mat(0x5a3a28), 0, 0.03, -4.6);
    citySpot({ x: R.x + R.w / 2 - 3.2, z: R.z + 3.8, r: 2.2, label: () => (has('room') ? 'Press E to rest in capsule eleven' : 'Capsule eleven. Mrs. Ishida hasn\'t given it to you yet.'), use: () => { if (has('room')) restMenu(); }, active: () => city.inside === 'hotel' });
  },
  apartment(R) {
    const { box, add, mat, glow } = R;
    const cyl = (rt, rb, h, color, x, y, z, seg = 16) => add(new THREE.CylinderGeometry(rt, rb, h, seg), color && color.isMaterial ? color : mat(color), x, y + h / 2, z);
    const ball = (r, color, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = add(new THREE.SphereGeometry(r, 16, 12), color && color.isMaterial ? color : mat(color), x, y, z); o.scale.set(sx, sy, sz); return o; };
    const plane = (w, h, m, x, y, z, ry = 0) => { const o = add(new THREE.PlaneGeometry(w, h), m, x, y, z); o.rotation.y = ry; return o; };
    const canvasMat = (w, h, draw) => new THREE.MeshBasicMaterial({ map: paintCanvas(w, h, draw), toneMapped: false });
    const W = R.w / 2, D = R.d / 2;
    const block = (x0, x1, z0, z1) => R.rects.push({ x0: R.x + x0, x1: R.x + x1, z0: R.z + z0, z1: R.z + z1 });
    // The walls: a deep blue feature wall behind the bed and the window, and a cove of LED
    // light running round the ceiling, teal fading to pink and violet.
    plane(R.w - 0.02, R.h - 0.02, mat(0x232a4a, { emissiveIntensity: 0.25 }), 0, R.h / 2, D - 0.02, Math.PI);
    for (const [w, x, z, ry, c] of [[R.w, 0, D - 0.04, Math.PI, 0xff8ab8], [R.w, 0, -D + 0.04, 0, 0x39d5c8], [R.d, -W + 0.04, 0, Math.PI / 2, 0x39d5c8], [R.d, W - 0.04, 0, -Math.PI / 2, 0xb48aff]]) plane(w, 0.08, glow(c, 1.6), x, R.h - 0.12, z, ry);
    // The big window: Tokyo by night (or by day), curtains, fairy lights, plants on the sill.
    const night = paintCanvas(512, 200, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, '#0c1030'); gr.addColorStop(0.7, '#3a2460'); gr.addColorStop(1, '#ff7aa8'); g.fillStyle = gr; g.fillRect(0, 0, 512, 200);
      for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(Math.random() * 512, Math.random() * 80, 1.5, 1.5); }
      for (let i = 0; i < 44; i++) { const w = 8 + Math.random() * 22, h = 40 + Math.random() * 130, x = i * 12 - 6; g.fillStyle = i % 3 ? '#0e1226' : '#151a34'; g.fillRect(x, 200 - h, w, h); for (let k = 0; k < 14; k++) if (Math.random() < 0.55) { g.fillStyle = Math.random() < 0.8 ? '#ffd890' : '#8ff4e8'; g.fillRect(x + 2 + Math.random() * (w - 4), 200 - h + 4 + Math.random() * (h - 8), 2, 2); } }
      g.fillStyle = '#e8303a'; g.fillRect(250, 22, 6, 120); g.fillStyle = '#ffffff'; g.fillRect(246, 60, 14, 6);
    });
    const day = paintCanvas(512, 200, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, '#6aa8e8'); gr.addColorStop(1, '#d8ecff'); g.fillStyle = gr; g.fillRect(0, 0, 512, 200);
      for (let i = 0; i < 44; i++) { const w = 8 + Math.random() * 22, h = 40 + Math.random() * 130, x = i * 12 - 6; g.fillStyle = ['#c8d0dc', '#b8c4d4', '#d8d0c8', '#a8b8cc'][i % 4]; g.fillRect(x, 200 - h, w, h); g.fillStyle = 'rgba(80,110,150,.5)'; for (let k = 0; k < 10; k++) g.fillRect(x + 2 + Math.random() * (w - 4), 200 - h + 4 + Math.random() * (h - 8), 3, 2); }
    });
    R.window = plane(5.2, 2.0, new THREE.MeshBasicMaterial({ map: night, toneMapped: false }), -0.6, 1.75, D - 0.06, Math.PI);
    R.windowTex = { night, day };
    const white = mat(0xf4f4f6);
    for (const [w, h, x, y] of [[5.5, 0.12, -0.6, 2.8], [5.5, 0.18, -0.6, 0.72], [0.12, 2.1, -3.3, 1.75], [0.12, 2.1, 2.1, 1.75], [0.06, 2.0, -0.6, 1.75]]) box(w, h, 0.14, white, x, y - h / 2, D - 0.1, false);
    box(5.6, 0.06, 0.4, white, -0.6, 0.63, D - 0.22, false);
    for (const s of [-1, 1]) plane(1.1, 2.6, mat(0xf5b8cf, { side: THREE.DoubleSide, emissiveIntensity: 0.3 }), -0.6 + s * 3.15, 1.6, D - 0.2, Math.PI);
    for (let i = 0; i < 18; i++) ball(0.035, glow(i % 2 ? 0xfff0b0 : 0xffb8d8, 2), -3.1 + i * 0.29, 2.72 - Math.sin(i * 0.55) * 0.1, D - 0.18);
    for (const [x, c] of [[-2.6, 0x3a9a5a], [-1.9, 0x5ab06a], [1.4, 0x3a8a4a]]) { cyl(0.11, 0.09, 0.2, 0xd8b8a0, x, 0.66, D - 0.22); ball(0.17, c, x, 1.02, D - 0.22, 1, 1.2, 1); }
    // The bed: an upholstered pink headboard, a teal duvet, pillows, a plush bunny, and
    // fairy lights strung over it.
    box(2.6, 0.32, 3.6, 0x6a4a3a, 3.9, 0, 3.1, false);
    box(2.5, 0.28, 3.45, 0xffffff, 3.9, 0.32, 3.1, false);
    box(2.56, 0.1, 2.4, 0x2aa89a, 3.9, 0.6, 2.55, false);
    box(2.58, 0.11, 0.45, 0x7affe0, 3.9, 0.6, 3.7, false);
    for (const x of [3.3, 4.5]) box(0.9, 0.18, 0.45, 0xfff6fa, x, 0.62, 4.4, false);
    box(2.9, 1.3, 0.16, 0xf08ab0, 3.9, 0, D - 0.1, false, { emissiveIntensity: 0.3 });
    for (let i = 0; i < 6; i++) box(0.04, 1.1, 0.03, 0xd8709a, 2.65 + i * 0.5, 0.1, D - 0.19, false);
    ball(0.2, 0xffd0e0, 4.6, 0.95, 4.1); ball(0.15, 0xffd0e0, 4.6, 1.25, 4.1); ball(0.05, 0xffd0e0, 4.52, 1.42, 4.1, 0.6, 2, 0.6); ball(0.05, 0xffd0e0, 4.68, 1.42, 4.1, 0.6, 2, 0.6);
    for (let i = 0; i < 14; i++) ball(0.03, glow(0xfff0b0, 2), 2.6 + i * 0.2, 1.55 + Math.sin(i * 0.9) * 0.06, D - 0.22);
    block(2.3, 5.5, 1, D);
    // The nightstand and its lamp.
    box(0.6, 0.55, 0.5, 0xf4f4f6, 2.05, 0, 4.4, false);
    cyl(0.05, 0.08, 0.3, 0xd8b040, 2.05, 0.55, 4.4);
    cyl(0.14, 0.22, 0.25, glow(0xffe0b8, 1.1), 2.05, 0.85, 4.4);
    // Her desk: a big monitor on StarTube, an RGB keyboard, a singer's microphone on an arm,
    // a teal gaming chair, and a shelf of little figures with a light under it.
    box(2.8, 0.06, 0.95, 0xf8f8fa, -4.4, 0.75, 4.35, false);
    for (const x of [-5.7, -3.1]) box(0.08, 0.75, 0.85, 0xd8d8dc, x, 0, 4.35, false);
    block(-W, -2.9, 3.7, D);
    const screen = canvasMat(320, 180, (g) => {
      g.fillStyle = '#0c1018'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#ff4a5a'; g.fillRect(16, 16, 34, 24);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(28, 21); g.lineTo(28, 35); g.lineTo(40, 28); g.fill(); g.font = 'bold 18px sans-serif'; g.fillText('StarTube', 58, 34);
      const gr = g.createLinearGradient(0, 50, 320, 170); gr.addColorStop(0, '#39d5c8'); gr.addColorStop(1, '#ff8ab8'); g.fillStyle = gr; g.fillRect(16, 52, 190, 108);
      g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.fillText('LIVE', 30, 112); for (let i = 0; i < 4; i++) { g.fillStyle = '#2a3040'; g.fillRect(218, 52 + i * 28, 86, 22); }
    });
    box(1.2, 0.72, 0.05, 0x14161c, -4.4, 0.95, 4.72, false);
    plane(1.12, 0.64, screen, -4.4, 1.31, 4.69, Math.PI);
    box(0.08, 0.2, 0.08, 0x2a2c34, -4.4, 0.78, 4.74, false);
    box(0.9, 0.03, 0.3, 0x1a1c24, -4.4, 0.78, 4.15, false);
    plane(0.9, 0.04, glow(0xb48aff, 1.8), -4.4, 0.8, 4.0, Math.PI);
    cyl(0.04, 0.04, 0.5, 0x2a2c34, -3.4, 0.78, 4.6); cyl(0.05, 0.05, 0.14, 0x14161c, -3.55, 1.28, 4.3); ball(0.07, 0x8a8e96, -3.55, 1.42, 4.3);
    box(0.62, 0.12, 0.6, 0x39d5c8, -4.4, 0.45, 3.3, false); box(0.62, 0.85, 0.12, 0x39d5c8, -4.4, 0.5, 3.0, false); cyl(0.04, 0.04, 0.45, 0x2a2c34, -4.4, 0, 3.3);
    box(2.6, 0.05, 0.3, 0xf8f8fa, -4.4, 1.95, 4.82, false);
    plane(2.5, 0.03, glow(0x39d5c8, 1.8), -4.4, 1.93, 4.66, Math.PI);
    [0xff8ab8, 0x39d5c8, 0xffd36a, 0xb47aff, 0xffffff].forEach((c, i) => { box(0.14, 0.22, 0.14, c, -5.4 + i * 0.5, 2.0, 4.82, false); ball(0.07, 0xf5dcc8, -5.4 + i * 0.5, 2.3, 4.82); });
    // The music corner: a synth on a stand, a red guitar, an amp, posters of the group.
    box(1.5, 0.06, 0.42, 0x1a1c24, -5.4, 0.85, 0.9, false);
    const keys = plane(1.4, 0.32, canvasMat(256, 60, (g) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 256, 60); g.fillStyle = '#111'; for (let i = 0; i < 36; i++) { g.fillRect(i * 7.1, 0, 0.8, 60); if (i % 7 !== 2 && i % 7 !== 6) g.fillRect(i * 7.1 + 4.5, 0, 4, 36); } }), -5.4, 0.92, 0.9);
    keys.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    for (const z of [0.6, 1.2]) box(0.04, 0.85, 0.04, 0x8a8e96, -5.4, 0, z, false);
    block(-W, -4.6, 0.4, 1.4);
    ball(0.26, 0xd83a3a, -5.6, 0.38, 2.3, 0.35, 1.2, 1); ball(0.2, 0xd83a3a, -5.6, 0.72, 2.3, 0.35, 1, 1); box(0.04, 0.7, 0.07, 0x3a2a1e, -5.6, 0.82, 2.3, false);
    box(0.35, 0.45, 0.5, 0x2a2c34, -5.7, 0, 1.75, false);
    [['#39d5c8', G()], ['#ff8ab8', 'LIVE'], ['#ffd36a', 'TOKYO']].forEach(([c, t], i) => plane(0.85, 1.15, canvasMat(128, 172, (g) => { const gr = g.createLinearGradient(0, 0, 0, 172); gr.addColorStop(0, c); gr.addColorStop(1, '#1a1430'); g.fillStyle = gr; g.fillRect(0, 0, 128, 172); g.beginPath(); g.arc(64, 70, 30, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill(); g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText(t, 64, 150, 120); }), -W + 0.04, 2.05, -0.6 + i * 1.05, Math.PI / 2));
    // A Hollywood mirror on a dresser, bulbs all round it, and a neon sign.
    box(0.5, 0.8, 1.6, 0xf8f4f0, W - 0.3, 0, -2.4, false);
    block(W - 0.6, W, -3.2, -1.6);
    plane(1.1, 1.0, mat(0xc8e4f8, { metalness: 0.95, roughness: 0.04, emissiveIntensity: 0.15 }), W - 0.05, 1.5, -2.4, -Math.PI / 2);
    for (let i = 0; i < 5; i++) { ball(0.05, glow(0xfff6e0, 2.2), W - 0.08, 1.05 + i * 0.22, -2.98); ball(0.05, glow(0xfff6e0, 2.2), W - 0.08, 1.05 + i * 0.22, -1.82); }
    for (const [z, c] of [[-2.7, 0xff8ab8], [-2.5, 0x39d5c8], [-2.25, 0xffd36a]]) cyl(0.03, 0.03, 0.12, c, W - 0.3, 0.8, z);
    plane(1.8, 0.6, new THREE.MeshBasicMaterial({ map: neonTexture('MIKU', '#ff8ab8', '#232a4a'), toneMapped: false }), W - 0.05, 2.45, -0.4, -Math.PI / 2);
    // The lounge: a fluffy round rug, a beanbag, a low table with tea, cushions, a lamp.
    add(new THREE.CircleGeometry(1.5, 40).rotateX(-Math.PI / 2), mat(0xf5c8dc, { emissiveIntensity: 0.35 }), 0, 0.02, -0.4);
    add(new THREE.RingGeometry(1.5, 1.62, 40).rotateX(-Math.PI / 2), mat(0xffffff), 0, 0.025, -0.4);
    ball(0.55, 0x39b5a8, -1.2, 0.35, -0.9, 1, 0.62, 1);
    cyl(0.45, 0.45, 0.04, 0xf8f8fa, 0.4, 0.38, -0.3); cyl(0.05, 0.05, 0.38, 0xd8d8dc, 0.4, 0, -0.3);
    cyl(0.05, 0.04, 0.09, 0xffffff, 0.3, 0.42, -0.25); cyl(0.05, 0.04, 0.09, 0xff8ab8, 0.55, 0.42, -0.4);
    block(-0.15, 0.95, -0.85, 0.25);
    cyl(0.02, 0.02, 1.6, 0x2a2c34, 1.6, 0, -1.6); cyl(0.18, 0.25, 0.32, glow(0xffe0c0, 1.1), 1.6, 1.6, -1.6);
    for (const [x, z, c] of [[0.9, 0.8, 0xffd36a], [-0.6, 0.9, 0xb48aff]]) cyl(0.32, 0.34, 0.12, c, x, 0, z);
    // Stage outfits on a rail along the front wall, out of the way of the door.
    box(1.8, 0.04, 0.04, 0xd8d8dc, 4.4, 1.7, -D + 0.5, false);
    for (const x of [3.6, 5.2]) box(0.04, 1.7, 0.04, 0xd8d8dc, x, 0, -D + 0.5, false);
    [0x39d5c8, 0xffffff, 0xff8ab8, 0x2a2a3a].forEach((c, i) => { const o = box(0.36, 0.9, 0.06, c, 3.8 + i * 0.4, 0.75, -D + 0.5, false); o.rotation.y = 0.4; });
    block(3.5, 5.3, -D, -D + 0.8);
    // A mat inside the door.
    add(new THREE.PlaneGeometry(1.4, 0.8).rotateX(-Math.PI / 2), mat(0x5a3a2a), -4, 0.021, -D + 0.6);
    citySpot({ x: R.x + 3.2, z: R.z + 0.6, r: 1.8, label: () => 'Press E to rest', use: () => restMenu(), active: () => city.inside === 'apartment' });
    citySpot({ x: R.x - 4.4, z: R.z + 2.6, r: 1.4, label: () => 'Press E to sit at the desk (StarTube)', use: () => openPhone('startube'), active: () => city.inside === 'apartment' && has('phone') });
    citySpot({ x: R.x - 4.2, z: R.z + 0.9, r: 1.3, label: () => 'Press E to play the keyboard', use: () => playKeyboard(), active: () => city.inside === 'apartment' });
    citySpot({ x: R.x + W - 1.2, z: R.z - 2.4, r: 1.3, label: () => 'Press E to look in the mirror', use: () => mirrorLine(), active: () => city.inside === 'apartment' });
  },
  agency(R) {
    const { box, add, mat, glow } = R;
    // The name in light on the back wall, the reception desk, a waiting area, the president's
    // desk, and a mirrored practice corner with a barre.
    add(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: neonTexture('STARLIGHT ★', '#39d5c8', '#ffffff'), toneMapped: false }), 0, 3, R.d / 2 - 0.05).rotation.y = Math.PI;
    box(5, 1.1, 1, 0xffffff, -4, 0, -2.6); box(5.2, 0.06, 1.2, 0x39d5c8, -4, 1.1, -2.6, false);
    for (const [x, z] of [[4.2, -3.2], [4.2, -0.2]]) box(2.6, 0.5, 0.9, 0x2a3a5a, x, 0, z);
    box(1.4, 0.35, 1.4, 0xd8e8f0, 4.2, 0, -1.7, true, { transparent: true, opacity: 0.6 });
    box(3.6, 0.8, 1.6, 0x3a2a24, 0, 0, 4.4);
    box(0.7, 1.1, 0.7, 0x1a1a1a, 0, 0, 5.6, false);
    add(new THREE.PlaneGeometry(0.9, 0.5), glow(0xb4fff2, 0.9), 0.9, 1.15, 4.1).rotation.y = Math.PI;
    add(new THREE.PlaneGeometry(6, 2.6), mat(0xc8e0f0, { metalness: 0.95, roughness: 0.05, emissiveIntensity: 0.2 }), -R.w / 2 + 0.05, 1.5, 3.5).rotation.y = Math.PI / 2;
    box(0.06, 0.06, 6, 0xd8d8d8, -R.w / 2 + 0.5, 1.0, 3.5, false, { metalness: 0.8 });
    for (const [x, z] of [[7.6, 6.6], [-7.6, -6.6], [7.6, -6.6]]) { box(0.6, 0.6, 0.6, 0xffffff, x, 0, z, true); add(new THREE.SphereGeometry(0.7, 10, 8), mat(0x3a8a4a), x, 1.3, z); }
    // Framed posters: the company's past groups.
    ['#ff8ab8', '#ffd36a', '#b47aff'].forEach((c, i) => add(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshBasicMaterial({ map: neonTexture('★', c, '#1a1a2a'), toneMapped: false }), R.w / 2 - 0.05, 2, -4 + i * 2.6).rotation.y = -Math.PI / 2);
  },
  konbini(R) {
    const { box, add, mat, glow } = R;
    // Shelves of everything, a wall of fridges, the counter, coffee and an ATM.
    const colors = [0xff5a6a, 0xffd36a, 0x5ab0ff, 0x7affc0, 0xff9a4a, 0xb47aff, 0xffffff, 0x39d5c8];
    for (const x of [-3.5, 0, 3.5]) {
      box(1, 1.6, 6, 0xd8dce2, x, 0, 0.8, true, { metalness: 0.3 });
      for (let s = 0; s < 3; s++) for (let k = 0; k < 10; k++) for (const side of [-1, 1]) box(0.28, 0.3, 0.45, colors[(k * 3 + s + (x > 0 ? 2 : 0)) % colors.length], x + side * 0.42, 0.25 + s * 0.48, -1.9 + k * 0.6, false);
    }
    for (let i = 0; i < 6; i++) {
      box(2, 2.4, 0.8, 0xc8ccd2, -R.w / 2 + 1.4 + i * 2.15, 0, R.d / 2 - 0.5, true, { metalness: 0.5 });
      add(new THREE.PlaneGeometry(1.8, 2.1), glow(0xe8f8ff, 0.95), -R.w / 2 + 1.4 + i * 2.15, 1.25, R.d / 2 - 0.92).rotation.y = Math.PI;
      for (let s = 0; s < 4; s++) for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6), mat(colors[(i + s + k) % colors.length]), -R.w / 2 + 0.75 + i * 2.15 + k * 0.32, 0.4 + s * 0.52, R.d / 2 - 0.62);
    }
    box(4, 1.05, 0.9, 0xffffff, 4.4, 0, -3.6); box(4.1, 0.08, 1, 0x39c878, 4.4, 1.05, -3.6, false);
    box(0.4, 0.3, 0.3, 0x2a2c34, 3.8, 1.1, -3.6, false);
    box(0.7, 1.7, 0.6, 0x2a2c34, 6.4, 0, -1.2); add(new THREE.PlaneGeometry(0.5, 0.4), glow(0x5ab0ff, 1.1), 6.08, 1.3, -1.2).rotation.y = -Math.PI / 2;
    box(0.8, 1.3, 0.6, 0xd8d8de, -6.4, 0, -4.6); add(new THREE.PlaneGeometry(0.5, 0.3), glow(0x7affc0, 1), -6.08, 1.1, -4.6).rotation.y = Math.PI / 2;
    add(new THREE.PlaneGeometry(6, 0.6), glow(0x39c878, 1.3), 0, R.h - 0.5, R.d / 2 - 0.05).rotation.y = Math.PI;
    citySpot({ x: R.x + 4.4, z: R.z - 4.8, r: 1.9, label: () => 'Press E to buy something', use: () => openShop(), active: () => city.inside === 'konbini' });
  },
};

/* ---------- Going in and out ---------- */
function setupInteriorDoors() {
  if (interior.doors) return;
  interior.doors = true;
  for (const R of Object.values(ROOMS)) {
    citySpot({ x: R.door.x, z: R.door.z, r: 2.2, label: () => (R.open() ? `Press E to go into ${R.name}` : R.locked || 'Closed'), use: () => { if (R.open()) enterRoom(R.id); else showNote(R.locked || 'It\'s closed.'); }, active: () => !city.inside });
  }
}

function enterRoom(id) {
  const R = ROOMS[id];
  buildInteriors();
  const f = $('sleep-fade');
  f.classList.add('on');
  Sfx.swap();
  setTimeout(() => {
    city.inside = id;
    setStreetVisible(false);
    player.pos.set(R.x + R.entry.x, CITY.y, R.z + R.entry.z + 1.6);
    player.yaw = player.bodyYaw = 0;
    if (id === 'konbini') setTimeout(() => say('"Irasshaimase!"', 2), 300);
    f.classList.remove('on');
  }, 380);
}

function leaveRoom() {
  const R = ROOMS[city.inside];
  if (!R) return;
  const f = $('sleep-fade');
  f.classList.add('on');
  Sfx.swap();
  setTimeout(() => {
    city.inside = null;
    setStreetVisible(true);
    // Out on the pavement, facing away from the door.
    const out = cityDoorOut(R);
    player.pos.set(out.x, CITY.y, out.z);
    player.yaw = player.bodyYaw = out.yaw;
    f.classList.remove('on');
  }, 380);
}

function cityDoorOut(R) {
  // Doors are on a building face; step out a metre and a half on the street side.
  if (R.id === 'agency') return { x: R.door.x - 1.2, z: R.door.z, yaw: -Math.PI / 2 };
  if (R.id === 'konbini') return { x: R.door.x, z: R.door.z - 1.2, yaw: Math.PI };
  return { x: R.door.x, z: R.door.z + 1.2, yaw: 0 };
}

// Indoors she's kept inside the room and out of the furniture.
function interiorClamp(pos) {
  const R = ROOMS[city.inside];
  if (!R) return false;
  pos.y = CITY.y;
  pos.x = clamp(pos.x, R.x - R.w / 2 + 0.4, R.x + R.w / 2 - 0.4);
  pos.z = clamp(pos.z, R.z - R.d / 2 + 0.4, R.z + R.d / 2 - 0.4);
  for (const r of R.rects) {
    if (pos.x < r.x0 || pos.x > r.x1 || pos.z < r.z0 || pos.z > r.z1) continue;
    const dl = pos.x - r.x0, dr = r.x1 - pos.x, db = pos.z - r.z0, df = r.z1 - pos.z, m = Math.min(dl, dr, db, df);
    if (m === dl) pos.x = r.x0; else if (m === dr) pos.x = r.x1; else if (m === db) pos.z = r.z0; else pos.z = r.z1;
  }
  return true;
}

// And the camera stays inside the walls.
function interiorCamera() {
  const R = city.active && ROOMS[city.inside];
  if (!R) return;
  const c = camera.position;
  c.x = clamp(c.x, R.x - R.w / 2 + 0.25, R.x + R.w / 2 - 0.25);
  c.z = clamp(c.z, R.z - R.d / 2 + 0.25, R.z + R.d / 2 - 0.25);
  c.y = Math.min(c.y, CITY.y + R.h - 0.25);
  camera.lookAt(player.pos.x, player.pos.y + 1.35, player.pos.z);
}

// Where to go to reach a place: the door, if it's indoors and she isn't; the way out, if she
// is and it isn't.
function routeTarget(t) {
  if (!t) return t;
  const tr = roomAt(t.x, t.z), here = city.inside ? ROOMS[city.inside] : null;
  if (tr && tr !== here) {
    if (here) return { x: here.x + here.entry.x, z: here.z + here.entry.z - 0.6, label: 'Way out' };
    return { x: tr.door.x, z: tr.door.z, label: `${t.label} (in ${tr.name})` };
  }
  if (!tr && here) return { x: here.x + here.entry.x, z: here.z + here.entry.z - 0.6, label: `Way out · ${t.label}` };
  return t;
}
// For the map: where someone indoors shows up (the building's door).
function mapPos(x, z) { const r = roomAt(x, z); return r ? { x: r.door.x, z: r.door.z } : { x, z }; }
// Where she is, as far as the street is concerned (for saving, and the map).
function streetPos() { const R = ROOMS[city.inside]; return R ? cityDoorOut(R) : { x: player.pos.x, z: player.pos.z }; }

function updateInteriors() {
  const R = ROOMS.apartment;
  if (R.window && city.inside === 'apartment') { const map = dayNight.isNight() ? R.windowTex.night : R.windowTex.day; if (R.window.material.map !== map) { R.window.material.map = map; R.window.material.needsUpdate = true; } }
}

/* ---------- The shop ---------- */
const SHOP = [
  { id: 'onigiri', name: 'Onigiri (salmon)', price: 150, desc: 'A rice ball. Tastes like a fresh start.', use: () => { survival.health = 100; say('Mm. Salmon. The best one.', 2); } },
  { id: 'melonpan', name: 'Melon pan', price: 180, desc: 'Sweet, crunchy on top. Kotone\'s favourite.', use: () => { survival.health = 100; say('Kotone was right about these.', 2); } },
  { id: 'tea', name: 'Bottled green tea', price: 140, desc: 'Cold and clean.', use: () => say('Ahh. That\'s better.', 2) },
  { id: 'lozenge', name: 'Throat lozenges', price: 300, desc: 'Next show: the crowd starts warmer.', use: () => { idol.buffs.hype = true; say('Honey and lemon. My voice feels clear.', 2.4); } },
  { id: 'energy', name: 'Energy drink', price: 250, desc: 'Next show: the timing is more forgiving.', use: () => { idol.buffs.window = true; say('Whoa. I can feel my heartbeat in my ears.', 2.4); } },
  { id: 'penlights', name: 'Pack of penlights', price: 800, desc: 'Hand them out: next busk draws a bigger crowd and more fame.', use: () => { idol.buffs.crowd = true; say('Teal ones. Obviously.', 2.4); } },
  { id: 'magazine', name: 'Idol Weekly', price: 500, desc: 'Read up on the business. A little fame, once a day.', use: () => { if (idol.magDay === dayNight.day) { say('I already read this one.', 2); return; } idol.magDay = dayNight.day; addFame(12, 'Idol Weekly'); say(has('joined') ? `There's a tiny article about ${G()} on page 31!` : 'One day I\'ll be in here.', 2.6); } },
  { id: 'ramune', name: 'Ramune', price: 200, desc: 'The marble rattles. Summer in a bottle.', use: () => say('Fizzy! Like the song.', 2) },
];
function openShop() {
  let el = $('shop');
  if (!el) { el = document.createElement('div'); el.id = 'shop'; document.body.appendChild(el); el.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) buy(+li.dataset.i); else if (e.target.closest('.shop-close')) closeShop(); }); }
  idol.buffs = idol.buffs || {};
  const draw = () => {
    el.innerHTML = `<h3>Konbini · open 24 hours</h3><h2>What'll it be? <small>¥${idol.yen.toLocaleString()}</small></h2><ol>${SHOP.map((s, i) => `<li data-i="${i}" class="${idol.yen < s.price ? 'poor' : ''}"><kbd>${i + 1}</kbd><span><b>${s.name}</b><small>${s.desc}</small></span><em>¥${s.price}</em></li>`).join('')}</ol><p class="hint">1-8 or click to buy · E or Esc to leave the counter <button class="shop-close">Done</button></p>`;
  };
  draw();
  el.classList.remove('hidden');
  interior.shop = { el, draw };
  document.exitPointerLock();
  pointerWasLocked = false;
  game.state = 'shop';
}
function buy(i) {
  const s = SHOP[i];
  if (!s) return;
  if (idol.yen < s.price) { Sfx.swap(); interior.shop.el.querySelector('h2 small').textContent = 'Not enough yen!'; return; }
  addYen(-s.price);
  Sfx.pickup();
  s.use();
  interior.shop.draw();
}
function closeShop() {
  if (!interior.shop) return;
  interior.shop.el.classList.add('hidden');
  interior.shop = null;
  game.state = 'playing';
  lockPointer();
}
addEventListener('keydown', (e) => {
  if (!interior.shop) return;
  const d = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].indexOf(e.code);
  if (d >= 0) { e.preventDefault(); buy(d); }
  else if (e.code === 'Escape' || e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); closeShop(); }
}, true);

/* ---------- Indoors, the city outside isn't drawn ---------- */
// Everything in the street (towers, trees, cars, signs), noted once before any room or stage
// set is added; the people stay, since some of them are indoors too.
function setStreetVisible(on) {
  if (!city.street) {
    const keep = new Set(Object.values(city.crowd.meshes || {}));
    city.street = city.group.children.filter((o) => !keep.has(o) && !Object.values(ROOMS).some((r) => r.g === o));
  }
  for (const o of city.street) o.visible = on;
}

// The last word on the camera, whatever placed it (walking, talking, resting): never
// through a wall, the floor or the ceiling.
function clampRoomCamera() {
  const R = ROOMS[city.inside];
  if (!R) return;
  const c = camera.position, m = 0.35;
  const x = clamp(c.x, R.x - R.w / 2 + m, R.x + R.w / 2 - m), z = clamp(c.z, R.z - R.d / 2 + m, R.z + R.d / 2 - m), y = clamp(c.y, CITY.y + 0.4, CITY.y + R.h - 0.3);
  if (x !== c.x || y !== c.y || z !== c.z) { c.set(x, y, z); camera.updateMatrixWorld(); }
}

// At home: a tune on the keyboard, and a look in the mirror.
function playKeyboard() {
  if (!Sfx.ctx) return;
  const S = SONGS.snowdrop, t = Sfx.ctx.currentTime + 0.05, beat = 60 / 120;
  for (const [b, step, len] of S.hookC.slice(0, 11)) {
    const n = S.scale.length, o = Math.floor(step / n), s = ((step % n) + n) % n;
    Sfx.piano(S.root - 12 + S.scale[s] + 12 * o, t + b * beat, len * beat, 0.08);
  }
  say('Snowdrop Heart, with one finger. Mirai would be horrified.', 3);
}
function mirrorLine() {
  const h = idol.hairShown === undefined ? 1 : idol.hairShown;
  say(h < 0.35 ? 'Still so short. Teto really took it all. It\'ll grow back.' : h < 0.7 ? 'Growing back. Almost to my shoulders again.' : h < 0.98 ? 'Nearly there. The twin tails are coming back.' : 'Back to how it should be. Twin tails, ready for anything.', 3.2);
}
