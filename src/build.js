// Building: a ghost of whatever she's about to build follows in front of her, green where it
// fits and red where it doesn't, until she clicks to set it down (R turns it, right click
// puts it away). Campfires, a canvas tent to sleep in, and a log cabin with its own hearth,
// which she can furnish and decorate from the inside.

const BUILD = {
  tent: { cost: { planks: 8, pelt: 2 }, dist: 3.2, r: 1.6 },
  cabin: { cost: { planks: 40 }, dist: 7, r: 4.6, w: 6, d: 7, h: 2.6 },
  campfire: { dist: 1.8, r: 0.6 },
};

const builds = { tents: [], cabins: [], placing: null, colliders: [], inCabin: null, decorOpen: false };

/* ---------- Materials ---------- */
let buildMats = null;
function getBuildMats() {
  if (buildMats) return buildMats;
  const m = getSurvivalMats();
  const plank = paintCanvas(256, 256, (g) => {
    g.fillStyle = '#8a5d38'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle = `hsl(28, 40%, ${30 + Math.random() * 10}%)`; g.fillRect(0, y, 256, 30);
      g.fillStyle = 'rgba(40,20,10,.6)'; g.fillRect(0, y + 30, 256, 2);
      for (let i = 0; i < 12; i++) { g.strokeStyle = 'rgba(60,30,15,.25)'; g.beginPath(); const yy = y + Math.random() * 30; g.moveTo(0, yy); g.bezierCurveTo(80, yy + 3, 170, yy - 3, 256, yy + 1); g.stroke(); }
    }
  });
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
  const canvasTex = paintCanvas(128, 128, (g) => {
    g.fillStyle = '#b8a888'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 4) { g.fillStyle = 'rgba(80,70,50,.12)'; g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); }
  });
  buildMats = {
    log: m.bark,
    rings: m.rings,
    stone: m.stone,
    plank: new THREE.MeshStandardMaterial({ map: plank, roughness: 0.85 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.95 }),
    snowRoof: new THREE.MeshStandardMaterial({ color: 0xf0f3fb, roughness: 1 }),
    canvas: new THREE.MeshStandardMaterial({ map: canvasTex, roughness: 0.95, side: THREE.DoubleSide }),
    pole: new THREE.MeshStandardMaterial({ color: 0x5b3b22, roughness: 0.8 }),
    fur: new THREE.MeshStandardMaterial({ color: 0x8b8178, roughness: 1 }),
    darkFur: new THREE.MeshStandardMaterial({ color: 0x4b4540, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x2fb8ad, roughness: 0.9 }),
    red: new THREE.MeshStandardMaterial({ color: 0xa0283c, roughness: 0.9 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.95 }),
    pot: new THREE.MeshStandardMaterial({ color: 0x8c4a2f, roughness: 0.85 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3a3c42, metalness: 0.8, roughness: 0.4 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(2.2) }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 }),
    ghostOk: new THREE.MeshBasicMaterial({ color: 0x6dffb0, transparent: true, opacity: 0.38, depthWrite: false }),
    ghostBad: new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.38, depthWrite: false }),
  };
  return buildMats;
}

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
const cyl = (r1, r2, h, mat, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };

/* ---------- Models ---------- */
function buildCampfireGhost() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0)); s.position.set(Math.cos(a) * 0.42, 0.06, Math.sin(a) * 0.42); g.add(s); }
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 6)); l.rotation.set(Math.PI / 2 - 0.5, (i / 4) * Math.PI * 2, 0, 'YXZ'); l.position.y = 0.16; l.translateY(0.12); g.add(l); }
  return g;
}

// An A-frame of oiled canvas over a ridge pole, guyed out, with a fur inside the door.
function buildTentModel() {
  const M = getBuildMats(), g = new THREE.Group();
  const L = 2.6, W = 2.2, H = 1.55;
  const slope = Math.hypot(W / 2, H), ang = Math.atan2(H, W / 2);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(slope, L).rotateX(-Math.PI / 2).rotateZ(-side * ang), M.canvas);
    panel.position.set(side * W / 4, H / 2, 0);
    panel.castShadow = true;
    g.add(panel);
  }
  // The back, closed; the front, open as a door.
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, H)]);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.canvas);
  back.position.z = -L / 2;
  g.add(back);
  for (const side of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(side * W / 2, 0), new THREE.Vector2(0, H)])), M.canvas);
    flap.position.z = L / 2;
    flap.rotation.y = side * 0.9;
    g.add(flap);
  }
  const ridge = cyl(0.03, 0.03, L + 0.4, M.pole, 6); ridge.rotation.x = Math.PI / 2; ridge.position.y = H; g.add(ridge);
  for (const z of [-L / 2 - 0.1, L / 2 + 0.1]) { const p = cyl(0.035, 0.035, H + 0.1, M.pole, 6); p.position.set(0, H / 2, z); g.add(p); }
  for (const [x, z] of [[-1.5, -1.6], [1.5, -1.6], [-1.5, 1.6], [1.5, 1.6]]) {
    const guy = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 3), M.pole);
    const from = new THREE.Vector3(0, H, Math.sign(z) * (L / 2 + 0.1)), to = new THREE.Vector3(x, 0, z);
    guy.position.copy(from).lerp(to, 0.5);
    guy.scale.y = from.distanceTo(to);
    guy.lookAt(to); guy.rotateX(Math.PI / 2);
    g.add(guy);
  }
  const bedroll = box(0.9, 0.08, 1.9, M.darkFur, 0, 0.04, -0.2);
  g.add(bedroll);
  return g;
}

// A log cabin: walls of stacked logs, notched at the corners, a door in the front, windows in
// the sides, a pitched roof with snow on it and a stone chimney over the hearth at the back.
// `upper` holds everything above waist height, hidden while she's inside so she can see.
function buildCabinModel() {
  const M = getBuildMats(), C = BUILD.cabin;
  const g = new THREE.Group(), upper = new THREE.Group();
  g.add(upper);
  const W = C.w, D = C.d, R = 0.16, rows = 9;
  const logGeo = new THREE.CylinderGeometry(R, R, 1, 9).rotateZ(Math.PI / 2);
  const log = (len, x, y, z, alongZ, parent) => {
    const m = new THREE.Mesh(logGeo, M.log);
    m.scale.x = len;
    if (alongZ) m.rotation.y = Math.PI / 2;
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
  };
  for (let i = 0; i < rows; i++) {
    const y = R + i * R * 1.85, parent = y > 1.0 ? upper : g;
    const off = i % 2 ? 0.18 : 0;
    // Back wall, whole.
    log(W + 0.5, 0, y, -D / 2, false, parent);
    // Front wall, with the door gap in the middle (up to the seventh log).
    if (i < 7) { log(W / 2 - 0.6 + 0.25, -(W / 4 + 0.3) - 0.06, y, D / 2, false, parent); log(W / 2 - 0.6 + 0.25, W / 4 + 0.3 + 0.06, y, D / 2, false, parent); }
    else log(W + 0.5, 0, y, D / 2, false, parent);
    // Sides, with a window in each between the fourth and sixth logs.
    for (const side of [-1, 1]) {
      if (i >= 4 && i <= 5) { log(D / 2 - 0.55, side * W / 2 + off * 0, y, -D / 4 - 0.28, true, parent); log(D / 2 - 0.55, side * W / 2, y, D / 4 + 0.28, true, parent); }
      else log(D + 0.5, side * W / 2, y, 0, true, parent);
    }
  }
  const wallTop = R + (rows - 1) * R * 1.85 + R;
  // Window panes, glowing warm at night.
  for (const side of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.55), M.glass);
    pane.rotation.y = side * Math.PI / 2;
    pane.position.set(side * (W / 2 + 0.01), R + 4.5 * R * 1.85, 0);
    upper.add(pane);
  }
  // The roof: two pitched planes of planks, snow on top, the ridge running front to back.
  const pitch = 1.5, half = W / 2 + 0.6, run = Math.hypot(half, pitch), a = Math.atan2(pitch, half);
  for (const side of [-1, 1]) {
    const roof = box(run, 0.12, D + 1.0, M.roof);
    roof.position.set(side * half / 2, wallTop + pitch / 2, 0);
    roof.rotation.z = -side * a;
    upper.add(roof);
    const snow = box(run, 0.1, D + 1.05, M.snowRoof);
    snow.position.set(side * half / 2 - side * Math.sin(a) * 0.1, wallTop + pitch / 2 + Math.cos(a) * 0.1, 0);
    snow.rotation.z = -side * a;
    upper.add(snow);
  }
  // Gables front and back.
  const gable = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.2, 0), new THREE.Vector2(W / 2 + 0.2, 0), new THREE.Vector2(0, pitch)]);
  for (const z of [-D / 2, D / 2]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), M.plank); m.position.set(0, wallTop, z); m.material.side = THREE.DoubleSide; upper.add(m); }
  // Floor of planks.
  const floor = box(W - 0.2, 0.08, D - 0.2, M.plank, 0, 0.04, 0);
  floor.material = M.plank;
  g.add(floor);
  // The door, swung open on its hinge.
  const door = box(1.1, 2.0, 0.08, M.plank);
  door.geometry.translate(0.55, 1.0, 0);
  door.position.set(-0.55, 0.02, D / 2 + 0.05);
  door.rotation.y = -1.3;
  g.add(door);
  // The hearth: a stone chimney breast against the back wall, a chimney up through the roof.
  const hearth = box(1.9, 1.3, 0.8, M.stone, 0, 0.65, -D / 2 + 0.45);
  g.add(hearth);
  const firebox = box(1.0, 0.7, 0.3, new THREE.MeshBasicMaterial({ color: 0x120a06 }), 0, 0.4, -D / 2 + 0.72);
  g.add(firebox);
  const chimney = box(1.0, wallTop + pitch + 1.2 - 1.3, 0.7, M.stone, 0, 1.3 + (wallTop + pitch + 1.2 - 1.3) / 2, -D / 2 + 0.4);
  upper.add(chimney);
  // A step at the door.
  g.add(box(1.4, 0.15, 0.5, M.log, 0, 0.07, D / 2 + 0.45));
  return { group: g, upper, hearthAt: new THREE.Vector3(0, 0, -D / 2 + 1.05) };
}

/* ---------- Decorations ---------- */
const DECOR = {
  bed: { name: 'Bed', cost: { planks: 6, wolfpelt: 1 }, r: 1.1, note: 'Sleep here' },
  rug: { name: 'Fur rug', cost: { pelt: 2 }, r: 0.2, flat: true, note: 'Soft underfoot' },
  table: { name: 'Table', cost: { planks: 4 }, r: 0.7 },
  chair: { name: 'Chair', cost: { planks: 2 }, r: 0.35 },
  lantern: { name: 'Lantern', cost: { planks: 1, cloth: 1 }, r: 0.25, note: 'Warm light' },
  shelf: { name: 'Bookshelf', cost: { planks: 5 }, r: 0.5 },
  plant: { name: 'Potted pine', cost: { planks: 1 }, r: 0.3 },
  painting: { name: 'Painting', cost: { planks: 2, cloth: 1 }, r: 0.2, wall: true },
  banner: { name: 'Teal banner', cost: { cloth: 2 }, r: 0.2, wall: true, note: 'In her colours' },
  furs: { name: 'Pile of furs', cost: { wolfpelt: 1, pelt: 1 }, r: 0.6 },
  crate: { name: 'Crate', cost: { planks: 2 }, r: 0.4 },
  stool: { name: 'Stool', cost: { planks: 1 }, r: 0.25 },
};

function paintingTexture() {
  return paintCanvas(128, 96, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 96); sky.addColorStop(0, '#f6b6a8'); sky.addColorStop(1, '#8fa8d8');
    g.fillStyle = sky; g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#e8eef8'; g.beginPath(); g.moveTo(0, 80); g.lineTo(30, 40); g.lineTo(52, 62); g.lineTo(80, 28); g.lineTo(128, 74); g.lineTo(128, 96); g.lineTo(0, 96); g.fill();
    g.fillStyle = '#2f4a3a'; for (let i = 0; i < 9; i++) { const x = 6 + i * 14; g.beginPath(); g.moveTo(x, 92); g.lineTo(x + 6, 70); g.lineTo(x + 12, 92); g.fill(); }
    g.fillStyle = '#d05060'; g.beginPath(); g.arc(98, 30, 9, 0, Math.PI * 2); g.fill();
  });
}

function bannerTexture() {
  return paintCanvas(64, 128, (g) => {
    g.fillStyle = '#2fb8ad'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = '#e9fffb'; g.font = 'bold 54px serif'; g.textAlign = 'center'; g.fillText('♪', 32, 76);
    g.fillStyle = '#1b7f78'; g.fillRect(0, 0, 64, 6); g.fillRect(0, 122, 64, 6);
  });
}

function buildDecorModel(kind) {
  const M = getBuildMats(), g = new THREE.Group();
  if (kind === 'bed') {
    g.add(box(1.0, 0.35, 2.0, M.plank, 0, 0.18, 0));
    g.add(box(0.92, 0.14, 1.9, M.cream, 0, 0.42, 0));
    g.add(box(0.94, 0.06, 1.2, M.darkFur, 0, 0.51, 0.3));
    g.add(box(0.6, 0.12, 0.3, M.cream, 0, 0.55, -0.75));
    g.add(box(1.0, 0.9, 0.1, M.plank, 0, 0.45, -1.0));
  } else if (kind === 'rug') {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24).rotateX(-Math.PI / 2), M.fur); m.position.y = 0.09; m.receiveShadow = true; g.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 24).rotateX(-Math.PI / 2), M.darkFur); ring.position.y = 0.095; g.add(ring);
  } else if (kind === 'table') {
    g.add(box(1.2, 0.07, 0.8, M.plank, 0, 0.75, 0));
    for (const [x, z] of [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]]) g.add(box(0.07, 0.75, 0.07, M.pole, x, 0.37, z));
    const mug = cyl(0.05, 0.045, 0.1, M.cream, 8); mug.position.set(0.25, 0.83, 0.1); g.add(mug);
  } else if (kind === 'chair') {
    g.add(box(0.45, 0.05, 0.45, M.plank, 0, 0.45, 0));
    for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(box(0.05, 0.45, 0.05, M.pole, x, 0.22, z));
    g.add(box(0.45, 0.5, 0.05, M.plank, 0, 0.72, -0.2));
  } else if (kind === 'lantern') {
    g.add(cyl(0.12, 0.14, 0.04, M.metal, 8)).position.y = 0.02;
    const glass = cyl(0.1, 0.1, 0.22, M.glass, 8); glass.position.y = 0.15; g.add(glass);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 8), M.metal); top.position.y = 0.31; g.add(top);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(0xffb060).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(1.4); glow.position.y = 0.16; g.add(glow);
  } else if (kind === 'shelf') {
    g.add(box(1.1, 1.8, 0.05, M.plank, 0, 0.9, -0.17));
    for (const x of [-0.53, 0.53]) g.add(box(0.05, 1.8, 0.36, M.plank, x, 0.9, 0));
    for (let i = 0; i < 4; i++) {
      g.add(box(1.06, 0.04, 0.34, M.plank, 0, 0.1 + i * 0.5, 0));
      for (let b = 0; b < 7; b++) { const book = box(0.08 + Math.random() * 0.04, 0.24 + Math.random() * 0.1, 0.24, [M.red, M.cloth, M.cream, M.darkFur][(b + i) % 4], -0.42 + b * 0.13, 0.25 + i * 0.5, 0.02); g.add(book); }
    }
  } else if (kind === 'plant') {
    g.add(cyl(0.18, 0.13, 0.28, M.pot, 10)).position.y = 0.14;
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.26 - i * 0.06, 0.32, 8), M.leaf); c.position.y = 0.42 + i * 0.2; c.castShadow = true; g.add(c); }
  } else if (kind === 'painting') {
    g.add(box(0.9, 0.7, 0.05, M.pole, 0, 1.5, 0));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ map: paintingTexture(), roughness: 0.8 })); pic.position.set(0, 1.5, 0.03); g.add(pic);
  } else if (kind === 'banner') {
    g.add(cyl(0.02, 0.02, 0.7, M.pole, 6)).rotation.z = Math.PI / 2; g.children[0].position.y = 2.0;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshStandardMaterial({ map: bannerTexture(), roughness: 0.9, side: THREE.DoubleSide })); b.position.set(0, 1.38, 0.02); g.add(b);
  } else if (kind === 'furs') {
    for (let i = 0; i < 3; i++) { const f = box(1.0 - i * 0.12, 0.08, 0.8 - i * 0.1, i % 2 ? M.fur : M.darkFur, (Math.random() - 0.5) * 0.1, 0.04 + i * 0.08, 0); f.rotation.y = (Math.random() - 0.5) * 0.6; g.add(f); }
  } else if (kind === 'crate') {
    g.add(box(0.6, 0.55, 0.6, M.plank, 0, 0.28, 0));
    for (const y of [0.05, 0.5]) g.add(box(0.62, 0.05, 0.62, M.pole, 0, y, 0));
  } else if (kind === 'stool') {
    g.add(cyl(0.2, 0.2, 0.05, M.plank, 10)).position.y = 0.45;
    for (let i = 0; i < 3; i++) { const a = i * 2.09; g.add(box(0.04, 0.45, 0.04, M.pole, Math.cos(a) * 0.13, 0.22, Math.sin(a) * 0.13)); }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ---------- Placing ---------- */
// Turns a model into its ghost: every mesh drawn in the placement colour, lights and glows off.
function ghostOf(model) {
  const M = getBuildMats();
  model.traverse((o) => {
    if (o.isMesh) { o.material = M.ghostOk; o.castShadow = false; o.receiveShadow = false; }
    if (o.isSprite || o.isPoints) o.visible = false;
  });
  scene.add(model);
  return model;
}

function setGhost(ok) {
  const p = builds.placing;
  if (!p || p.ok === ok) return;
  p.ok = ok;
  const mat = ok ? getBuildMats().ghostOk : getBuildMats().ghostBad;
  p.ghost.traverse((o) => { if (o.isMesh) o.material = mat; });
}

// Starts placing something. `spec` is { kind, model, dist, r, cost, valid(x, z, yaw), confirm(x, z, yaw), label }.
function startPlacing(spec) {
  cancelPlacing();
  builds.placing = { ...spec, ghost: ghostOf(spec.model), yaw: player.bodyYaw + Math.PI, ok: null, x: 0, z: 0 };
  setCrafting(false);
  setDecorMenu(false);
  survival.swing = null;
  cancelDraw();
  toast(`Placing ${spec.label}: click to build · R to turn · right click to cancel`);
}

function cancelPlacing() {
  if (!builds.placing) return;
  scene.remove(builds.placing.ghost);
  builds.placing = null;
}

// Clicking while placing: left click builds it there (if it fits and she can pay), right click cancels.
function placingClick(button) {
  const p = builds.placing;
  if (!p) return false;
  if (button === 2) { cancelPlacing(); toast('Put away'); return true; }
  if (button !== 0) return true;
  if (!p.ok) { showNote(p.why || 'It won\'t fit there.'); Sfx.swap(); return true; }
  if (p.cost && !Object.entries(p.cost).every(([id, n]) => have(id) >= n)) { toast(`Need ${costText(p.cost)}`); return true; }
  for (const [id, n] of Object.entries(p.cost || {})) { if (id === 'planks') survival.planks -= n; else packTake(id, n); }
  const { x, z, yaw } = p;
  cancelPlacing();
  p.confirm(x, z, yaw);
  Sfx.craft();
  return true;
}

// Is there room here? Away from trees and rocks, from other buildings, and on fairly level ground.
function roomFor(x, z, r, yaw, ignore = null) {
  if (arenaActive() || cityActive()) return 'Not here.';
  for (const c of nearbyColliders(x, z)) if (Math.hypot(c.x - x, c.z - z) < c.r + r * 0.62) return r > 3 ? 'Trees in the way. Chop a few down, or find a clearing.' : 'Something\'s in the way.';
  for (const t of builds.tents) if (t !== ignore && Math.hypot(t.x - x, t.z - z) < r + BUILD.tent.r) return 'Too close to the tent.';
  for (const c of builds.cabins) if (c !== ignore && Math.hypot(c.x - x, c.z - z) < r + BUILD.cabin.r) return 'Too close to the cabin.';
  const h0 = groundHeight(x, z);
  let worst = 0;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; worst = Math.max(worst, Math.abs(groundHeight(x + Math.cos(a) * r, z + Math.sin(a) * r) - h0)); }
  if (worst > Math.max(0.35, r * 0.18)) return 'The ground\'s too steep here.';
  return null;
}

function updatePlacing() {
  const p = builds.placing;
  if (!p) return;
  const fx = Math.sin(player.bodyYaw), fz = Math.cos(player.bodyYaw);
  // Aimed where she's looking: a little nearer when the camera tips down.
  const reach = p.dist * clamp(1 + player.pitch * 1.2, 0.6, 1.4);
  p.x = player.pos.x + Math.sin(player.yaw) * reach;
  p.z = player.pos.z + Math.cos(player.yaw) * reach;
  if (p.snap) [p.x, p.z, p.yaw] = p.snap(p.x, p.z, p.yaw);
  const y = p.y ? p.y(p.x, p.z) : groundHeight(p.x, p.z);
  p.ghost.position.set(p.x, y, p.z);
  p.ghost.rotation.y = p.yaw;
  const why = p.valid(p.x, p.z, p.yaw);
  p.why = why;
  setGhost(!why);
  setPrompt(why ? `${why}  ·  right click to cancel` : `Click to build ${p.label}  ·  R turn  ·  right click cancel`);
  void fx; void fz;
}

/* ---------- Structures ---------- */
function placeCampfire() {
  startPlacing({
    kind: 'campfire', label: 'a campfire', model: buildCampfireGhost(), dist: BUILD.campfire.dist, r: BUILD.campfire.r,
    cost: { planks: SURVIVAL.campfireCost },
    valid: (x, z) => roomFor(x, z, BUILD.campfire.r),
    confirm: (x, z) => { buildCampfire(x, z); toast('Campfire built'); },
  });
}

function placeTent() {
  startPlacing({
    kind: 'tent', label: 'the tent', model: buildTentModel(), dist: BUILD.tent.dist, r: BUILD.tent.r, cost: BUILD.tent.cost,
    valid: (x, z, yaw) => roomFor(x, z, BUILD.tent.r, yaw),
    confirm: (x, z, yaw) => { buildTent(x, z, yaw); toast('Tent pitched'); say('Somewhere to sleep out of the wind, at last.', 3); },
  });
}

function placeCabin() {
  startPlacing({
    kind: 'cabin', label: 'the log cabin', model: buildCabinModel().group, dist: BUILD.cabin.dist, r: BUILD.cabin.r, cost: BUILD.cabin.cost,
    valid: (x, z, yaw) => roomFor(x, z, BUILD.cabin.r, yaw),
    confirm: (x, z, yaw) => { buildLogCabin(x, z, yaw); toast('Log cabin built'); say('Four walls, a roof and a fire of my own. I could almost live here.', 4); },
  });
}

function buildTent(x, z, yaw) {
  const model = buildTentModel();
  model.position.set(x, groundHeight(x, z), z);
  model.rotation.y = yaw;
  scene.add(model);
  const tent = { x, z, yaw, model };
  tent.use = addInteractable({ x, z, r: 2.4, label: () => (dayNight.isNight() ? 'Press E to sleep in the tent until morning' : 'Press E to rest in the tent'), use: () => sleepIn('tent') });
  // Out of the wind under the canvas.
  tent.heat = () => (Math.hypot(player.pos.x - x, player.pos.z - z) < 2 ? 5 : 0);
  HEAT_SOURCES.push(tent.heat);
  tent.colliders = [{ x, z, r: 1.0 }];
  builds.tents.push(tent);
  emitGame('built', 'tent');
  return tent;
}

function buildLogCabin(x, z, yaw, decor = []) {
  const C = BUILD.cabin;
  const { group, upper, hearthAt } = buildCabinModel();
  group.position.set(x, groundHeight(x, z), z);
  group.rotation.y = yaw;
  scene.add(group);
  const cabin = { x, z, yaw, group, upper, decor: [], colliders: [] };
  const toWorld = (lx, lz) => ({ x: x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, z: z - Math.sin(yaw) * lx + Math.cos(yaw) * lz });
  cabin.toWorld = toWorld;
  cabin.toLocal = (wx, wz) => { const dx = wx - x, dz = wz - z; return { x: Math.cos(yaw) * dx - Math.sin(yaw) * dz, z: Math.sin(yaw) * dx + Math.cos(yaw) * dz }; };
  // Walls as rows of small round colliders, with the doorway left open.
  const ring = (lx, lz) => { const p = toWorld(lx, lz); cabin.colliders.push({ x: p.x, z: p.z, r: 0.28 }); };
  for (let t = -C.w / 2; t <= C.w / 2 + 0.01; t += 0.45) { ring(t, -C.d / 2); if (Math.abs(t) > 0.7) ring(t, C.d / 2); }
  for (let t = -C.d / 2; t <= C.d / 2 + 0.01; t += 0.45) { ring(-C.w / 2, t); ring(C.w / 2, t); }
  const h = toWorld(0, -C.d / 2 + 0.45); cabin.colliders.push({ x: h.x, z: h.z, r: 0.75 });
  // The hearth's fire: a campfire like any other, so she can sit by it, warm up and save.
  const fireAt = toWorld(hearthAt.x, hearthAt.z);
  cabin.fire = buildCampfire(fireAt.x, fireAt.z);
  // Inside it's warm, fire or no.
  cabin.heat = () => (cabin === builds.inCabin ? 8 : 0);
  HEAT_SOURCES.push(cabin.heat);
  builds.cabins.push(cabin);
  for (const d of decor) addDecor(cabin, d.kind, d.x, d.z, d.yaw, true);
  emitGame('built', 'cabin');
  return cabin;
}

function addDecor(cabin, kind, lx, lz, yaw, quiet = false) {
  const model = buildDecorModel(kind);
  model.position.set(lx, 0.08, lz);
  model.rotation.y = yaw;
  cabin.group.add(model);
  const item = { kind, x: lx, z: lz, yaw, model };
  cabin.decor.push(item);
  if (kind === 'bed') {
    const p = cabin.toWorld(lx, lz);
    item.use = addInteractable({ x: p.x, z: p.z, r: 1.8, label: () => (dayNight.isNight() ? 'Press E to sleep until morning' : 'Press E to have a nap'), use: () => sleepIn('bed') });
  }
  if (!quiet) { Sfx.planks(); emitGame('decorated', kind); }
  return item;
}

function removeNearestDecor() {
  const cabin = builds.inCabin;
  if (!cabin || !cabin.decor.length) return;
  const me = cabin.toLocal(player.pos.x, player.pos.z);
  let best = null, bestD = 2.2;
  for (const d of cabin.decor) { const dd = Math.hypot(d.x - me.x, d.z - me.z); if (dd < bestD) { best = d; bestD = dd; } }
  if (!best) { showNote('Nothing close enough to move.'); return; }
  cabin.group.remove(best.model);
  if (best.use) removeInteractable(best.use);
  cabin.decor.splice(cabin.decor.indexOf(best), 1);
  // Everything comes back to the pack, to put somewhere else.
  for (const [id, n] of Object.entries(DECOR[best.kind].cost)) { if (id === 'planks') survival.planks += n; else packAdd(id, n, { quiet: true }); }
  toast(`${DECOR[best.kind].name} picked up`);
}

/* ---------- Decorating ---------- */
function setDecorMenu(open) {
  builds.decorOpen = open && !!builds.inCabin;
  const el = $('decor');
  if (!el) return;
  el.classList.toggle('hidden', !builds.decorOpen);
  if (!builds.decorOpen) return;
  el.innerHTML = '<h3>Decorate the cabin</h3><ol>' + Object.entries(DECOR).map(([id, d], i) => {
    const ok = Object.entries(d.cost).every(([k, n]) => have(k) >= n);
    return `<li class="${ok ? 'ready' : ''}"><kbd>${i < 9 ? i + 1 : String.fromCharCode(65 + i - 9)}</kbd><b>${d.name}</b><span>${costText(d.cost)}${d.note ? ' · ' + d.note : ''}</span></li>`;
  }).join('') + '</ol><p class="hint">X picks up the nearest thing · B closes</p>';
}

function placeDecor(kind) {
  const cabin = builds.inCabin, D = DECOR[kind], C = BUILD.cabin;
  if (!cabin) return;
  startPlacing({
    kind, label: `the ${D.name.toLowerCase()}`, model: buildDecorModel(kind), dist: 1.6, r: D.r, cost: D.cost,
    y: () => cabin.group.position.y + 0.08,
    // Wall pieces hang on the nearest wall; everything else stands on the floor.
    snap: (x, z, yaw) => {
      const l = cabin.toLocal(x, z);
      if (D.wall) {
        const walls = [[Math.abs(l.z + C.d / 2), 0, -C.d / 2 + 0.12, 0], [Math.abs(l.x + C.w / 2), -C.w / 2 + 0.12, 0, Math.PI / 2], [Math.abs(l.x - C.w / 2), C.w / 2 - 0.12, 0, -Math.PI / 2]];
        walls.sort((a, b) => a[0] - b[0]);
        const [, wx, wz, wy] = walls[0];
        const lx = wx || clamp(l.x, -C.w / 2 + 0.6, C.w / 2 - 0.6), lz = wz || clamp(l.z, -C.d / 2 + 0.6, C.d / 2 - 0.6);
        const p = cabin.toWorld(lx, lz);
        return [p.x, p.z, cabin.yaw + wy];
      }
      return [x, z, yaw];
    },
    valid: (x, z) => {
      const l = cabin.toLocal(x, z);
      const m = D.wall ? 0 : D.r;
      if (Math.abs(l.x) > C.w / 2 - 0.2 - m || Math.abs(l.z) > C.d / 2 - 0.2 - m) return 'That has to go inside.';
      if (!D.wall && !D.flat && l.z < -C.d / 2 + 1.6 && Math.abs(l.x) < 1.4) return 'Too close to the hearth.';
      if (!D.flat && !D.wall) for (const d of cabin.decor) { const o = DECOR[d.kind]; if (o.flat || o.wall) continue; if (Math.hypot(d.x - l.x, d.z - l.z) < o.r + D.r) return 'Something\'s already there.'; }
      if (!D.flat && !D.wall && Math.abs(l.x) < 0.8 && l.z > C.d / 2 - 1.2) return 'That would block the door.';
      return null;
    },
    confirm: (x, z, yaw) => { const l = cabin.toLocal(x, z); addDecor(cabin, kind, l.x, l.z, yaw - cabin.yaw); toast(`${D.name} placed`); },
  });
}

/* ---------- Keys and clicks (game.js) ---------- */
function buildKey(code) {
  if (builds.placing) {
    if (code === 'KeyR') { builds.placing.yaw += Math.PI / 4; Sfx.swap(); return true; }
    if (code === 'Escape') { cancelPlacing(); return true; }
    return false;
  }
  if (code === 'KeyB' && builds.inCabin) { setDecorMenu(!builds.decorOpen); return true; }
  if (code === 'KeyX' && builds.inCabin) { removeNearestDecor(); return true; }
  if (builds.decorOpen) {
    const keysList = Object.keys(DECOR);
    let i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].indexOf(code);
    if (i < 0 && code.startsWith('Key')) i = 9 + code.charCodeAt(3) - 65;
    if (i >= 0 && i < keysList.length) { setDecorMenu(false); placeDecor(keysList[i]); return true; }
  }
  return false;
}

/* ---------- Each frame ---------- */
function updateBuild(dt) {
  updatePlacing();
  // Her walls and canvas keep her (and the wolves) out of the logs.
  if (!mod.noclip && !arenaActive() && !cityActive()) {
    for (const s of [...builds.tents, ...builds.cabins]) {
      if (Math.hypot(s.x - player.pos.x, s.z - player.pos.z) > 12) continue;
      for (const c of s.colliders) pushOutOf(player.pos, c, 0.34);
      for (const w of wolves) if (Math.hypot(s.x - w.pos.x, s.z - w.pos.z) < 12) for (const c of s.colliders) pushOutOf(w.pos, c, 0.45);
    }
  }
  // Inside a cabin the top of the walls and the roof are cut away, so she can see in.
  let inside = null;
  for (const c of builds.cabins) {
    const l = c.toLocal(player.pos.x, player.pos.z);
    const isIn = Math.abs(l.x) < BUILD.cabin.w / 2 - 0.1 && Math.abs(l.z) < BUILD.cabin.d / 2 - 0.05;
    c.upper.visible = !isIn;
    if (isIn) inside = c;
  }
  if (inside !== builds.inCabin) {
    builds.inCabin = inside;
    if (inside) { showNote('Home. B to decorate · X to pick something up'); }
    else setDecorMenu(false);
  }
}

function pushOutOf(pos, c, radius) {
  const dx = pos.x - c.x, dz = pos.z - c.z, min = c.r + radius, d2 = dx * dx + dz * dz;
  if (d2 < min * min && d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min; }
}

/* ---------- Saving ---------- */
function saveBuilds() {
  return {
    tents: builds.tents.map((t) => [t.x, t.z, t.yaw]),
    cabins: builds.cabins.map((c) => ({ x: c.x, z: c.z, yaw: c.yaw, decor: c.decor.map((d) => ({ kind: d.kind, x: d.x, z: d.z, yaw: d.yaw })) })),
  };
}

function loadBuilds(data) {
  if (!data) return;
  for (const [x, z, yaw] of data.tents || []) buildTent(x, z, yaw);
  const muted = Sfx.muted;
  Sfx.muted = true;
  for (const c of data.cabins || []) buildLogCabin(c.x, c.z, c.yaw, c.decor || []);
  Sfx.muted = muted;
}

function resetBuilds() {
  cancelPlacing();
  for (const t of builds.tents) { scene.remove(t.model); removeInteractable(t.use); HEAT_SOURCES.splice(HEAT_SOURCES.indexOf(t.heat), 1); }
  for (const c of builds.cabins) {
    scene.remove(c.group);
    for (const d of c.decor) if (d.use) removeInteractable(d.use);
    HEAT_SOURCES.splice(HEAT_SOURCES.indexOf(c.heat), 1);
  }
  builds.tents.length = 0;
  builds.cabins.length = 0;
  builds.inCabin = null;
  setDecorMenu(false);
}

/* ---------- Recipes ---------- */
// The campfire recipe now puts down a ghost to place, rather than a fire at her feet.
(function buildRecipes() {
  const fire = RECIPES.find((r) => r.id === 'campfire');
  if (fire) { fire.place = placeCampfire; fire.note = 'Warmth and light · place it yourself'; }
  RECIPES.push(
    { id: 'tent', name: 'Tent', cost: BUILD.tent.cost, note: 'Sleep through the night', place: placeTent },
    { id: 'cabin', name: 'Log cabin', cost: BUILD.cabin.cost, note: 'A home with a hearth, to decorate', place: placeCabin, shown: () => survival.planks >= 10 || builds.cabins.length > 0 },
  );
})();
