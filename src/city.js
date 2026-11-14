// The city at night: sky, moon, far mountains, a grid of lit towers, streetlights, traffic,
// and the tall tower the elevator rides down the outside of. Everything is kept low-poly.
const City = (() => {
  const TOWER_HALF = 17;      // the tower is 34 m square
  const TOWER_TOP = 320;
  // The landing on floor 70 where the ride starts: a room inside the tower behind the car's
  // doors. Floor height, half-width, depth back from the tower face, height, doorway half-width.
  const LANDING = { y: 280, halfW: 5, depth: 8, h: 3.6, door: 0.6 };
  // Blocks kept for buildings the story uses: Miku's old walk-up (she goes up on its roof) and
  // the tower your apartment is in, both in view of the elevator.
  const RESERVED = {
    '1,2': { w: 36, d: 30, h: 52, l: 0.09 },
    '-1,2': { w: 34, d: 34, h: 176, l: 0.07 },
    '-1,1': { shops: true },        // the shopping street (built in src/street.js)
  };
  const BLOCK = 86;           // block pitch, road centre to road centre
  const ROAD = 16;
  const EXTENT = 1450;        // city reaches this far from the tower
  const FLOOR_H = 4;          // window texture: one floor every 4 m...
  const WIN_W = 3;            // ...and one window every 3 m
  const TEX_CELLS = 16;

  let skyData = null;
  const skyExtras = {};
  // Where the buildings stand, for walking the streets: [x0, x1, z0, z1] per box, by block.
  const footprints = new Map();
  const cellOf = (x, z) => Math.round(x / 86) + ',' + Math.round(z / 86);
  function addFootprint(cx, cz, w, d) {
    const f = [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      const key = cellOf(cx + dx * w / 2, cz + dz * d / 2);
      if (!footprints.has(key)) footprints.set(key, []);
      const list = footprints.get(key);
      if (!list.includes(f)) list.push(f);
    }
  }
  // Is (x, z) clear of every building, with r to spare?
  function clearAt(x, z, r) {
    const list = footprints.get(cellOf(x, z));
    if (!list) return true;
    for (const b of list) if (x > b[0] - r && x < b[1] + r && z > b[2] - r && z < b[3] + r) return false;
    return true;
  }

  // Small seeded random so the city is the same every time.
  let seed = 1337;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function windowTexture(litChance) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    const palette = ['#ffd9a0', '#ffc77a', '#ffe9c4', '#cfe6ff', '#e9f4ff', '#9ff4ea', '#ffb36b'];
    const cell = 256 / TEX_CELLS;
    for (let row = 1; row < TEX_CELLS; row++) {          // row 0 stays dark: roofs sample it
      // Whole floors tend to be on or off together, like real offices.
      const floorLit = rand() < 0.5 ? litChance * 1.6 : litChance * 0.35;
      const tone = palette[Math.floor(rand() * palette.length)];
      for (let col = 0; col < TEX_CELLS; col++) {
        if (rand() > floorLit) { g.fillStyle = '#04060a'; }
        else g.fillStyle = rand() < 0.75 ? tone : palette[Math.floor(rand() * palette.length)];
        g.globalAlpha = 0.55 + rand() * 0.45;
        g.fillRect(col * cell + 3, row * cell + 4, cell - 6, cell - 7);
      }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  function glowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Collects boxes into one big flat-shaded mesh, with window UVs measured in metres.
  function BoxBatch() {
    const pos = [], nor = [], uv = [], col = [];
    const roofUV = [0.5 / TEX_CELLS, 1 - 0.5 / TEX_CELLS];
    function quad(a, b, c, d, n, uvs, color) {
      for (const [p, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]]) {
        pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); uv.push(t[0], t[1]); col.push(color.r, color.g, color.b);
      }
    }
    function box(cx, y0, cz, w, h, d, color, uOff, vOff) {
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
      const su = 1 / (WIN_W * TEX_CELLS), sv = 1 / (FLOOR_H * TEX_CELLS);
      const v0 = vOff + y0 * sv, v1 = vOff + y1 * sv;
      const side = (len) => [[uOff, v0], [uOff + len * su, v0], [uOff + len * su, v1], [uOff, v1]];
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], side(w), color);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], side(w), color);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], side(d), color);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], side(d), color);
      quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [roofUV, roofUV, roofUV, roofUV], color);
    }
    function mesh(material) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return new THREE.Mesh(g, material);
    }
    return { box, mesh };
  }

  // Sky dome with one colour per face, so the gradient itself looks faceted.
  function buildSky(scene) {
    const R = 3400;
    const geo = new THREE.IcosahedronGeometry(R, 3).toNonIndexed();
    const p = geo.attributes.position;
    const colors = [];
    const top = new THREE.Color(0x03050f), mid = new THREE.Color(0x0d1233), glow = new THREE.Color(0x3b1f4f), haze = new THREE.Color(0x6a3355);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i += 3) {
      const h = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / R;
      if (h < 0.02) c.copy(haze).lerp(glow, Math.min(1, Math.max(0, (h + 0.05) / 0.07)));
      else if (h < 0.18) c.copy(glow).lerp(mid, (h - 0.02) / 0.16);
      else c.copy(mid).lerp(top, Math.min(1, (h - 0.18) / 0.5));
      c.offsetHSL(0, 0, (rand() - 0.5) * 0.012);
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    scene.add(sky);
    // The same dome by day: deep blue overhead fading to a pale, warm horizon.
    const night = Float32Array.from(colors);
    const day = new Float32Array(colors.length), dusk = new Float32Array(colors.length);
    const dTop = new THREE.Color(0x2f6fc4), dMid = new THREE.Color(0x7fb6e8), dHaze = new THREE.Color(0xe8e4d8);
    const sTop = new THREE.Color(0x1f2a5a), sMid = new THREE.Color(0x8a5a8a), sHaze = new THREE.Color(0xf29a5a);
    for (let i = 0; i < p.count; i += 3) {
      const h = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / R;
      const k = Math.min(1, Math.max(0, (h + 0.03) / 0.5));
      const a = dHaze.clone().lerp(dMid, Math.min(1, k * 2.2)).lerp(dTop, Math.max(0, k * 1.6 - 0.6));
      const b = sHaze.clone().lerp(sMid, Math.min(1, k * 2.5)).lerp(sTop, Math.max(0, k * 1.6 - 0.5));
      for (let j = 0; j < 3; j++) { day.set([a.r, a.g, a.b], (i + j) * 3); dusk.set([b.r, b.g, b.b], (i + j) * 3); }
    }
    skyData = { attr: geo.attributes.color, night, day, dusk };

    // Stars, thinning toward the glowing horizon.
    const sp = [];
    for (let i = 0; i < 1800; i++) {
      const y = 0.08 + Math.pow(rand(), 0.7) * 0.92;
      const a = rand() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      sp.push(Math.cos(a) * r * 3200, y * 3200, Math.sin(a) * r * 3200);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false }));
    scene.add(stars);
    skyExtras.stars = stars;

    // A low, faceted moon off to the right of the view, with a soft halo.
    const moonDir = new THREE.Vector3(0.55, 0.32, 0.77).normalize();
    const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(70, 1), new THREE.MeshBasicMaterial({ color: 0xf3f0e2, fog: false }));
    const mg = moon.geometry.toNonIndexed();
    const mc = [];
    for (let i = 0; i < mg.attributes.position.count; i += 3) {
      const s = 0.82 + rand() * 0.18;
      for (let k = 0; k < 3; k++) mc.push(s, s, s * 0.97);
    }
    mg.setAttribute('color', new THREE.Float32BufferAttribute(mc, 3));
    moon.geometry = mg;
    moon.material.vertexColors = true;
    moon.position.copy(moonDir).multiplyScalar(3000);
    scene.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x8fa6ff, transparent: true, opacity: 0.35, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(700, 700, 1);
    halo.position.copy(moon.position);
    scene.add(halo);
    skyExtras.moon = moon; skyExtras.halo = halo;
    return moonDir;
  }

  function buildMountains(scene) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x080a14, fog: false });
    const geo = new THREE.ConeGeometry(1, 1, 5, 1);
    geo.translate(0, 0.5, 0);
    const count = 70;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand() * 0.08;
      const d = 2700 + rand() * 300;
      const r = 180 + rand() * 260;
      const h = 90 + rand() * 230;
      p.set(Math.cos(a) * d, -20, Math.sin(a) * d);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
      s.set(r, h, r * (0.7 + rand() * 0.6));
      inst.setMatrixAt(i, m.compose(p, q, s));
    }
    inst.renderOrder = -5;
    scene.add(inst);
  }

  function heightAt(x, z) {
    // Three downtown clusters; the main one straight out in front of the glass.
    const centres = [[60, 560, 340, 1.0], [-720, 260, 260, 0.75], [520, -620, 280, 0.6], [-380, -900, 220, 0.45]];
    let boost = 0;
    for (const [cx, cz, r, w] of centres) boost += w * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * r * r));
    const base = 8 + Math.pow(rand(), 1.8) * 34;
    return base + boost * Math.pow(rand(), 0.6) * 210;
  }

  function build(scene) {
    const moonDir = buildSky(scene);
    buildMountains(scene);

    const hemi = new THREE.HemisphereLight(0x3a4a8a, 0x1a0f0a, 0.9);
    scene.add(hemi);
    const moonLight = new THREE.DirectionalLight(0x9fb0ff, 0.6);
    moonLight.position.copy(moonDir).multiplyScalar(100);
    scene.add(moonLight);
    Object.assign(daylightRefs, { scene, hemi, moonLight });

    // Ground and roads.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshLambertMaterial({ color: 0x0a0b12 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x17181f });
    const roadLines = [];
    for (let k = -Math.ceil(EXTENT / BLOCK); k <= Math.ceil(EXTENT / BLOCK); k++) roadLines.push(k * BLOCK + BLOCK / 2);
    const span = EXTENT * 2 + BLOCK;
    for (const L of roadLines) {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, span), roadMat);
      a.rotation.x = -Math.PI / 2; a.position.set(L, 0.04, 0); scene.add(a);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(span, ROAD), roadMat);
      b.rotation.x = -Math.PI / 2; b.position.set(0, 0.05, L); scene.add(b);
    }

    // Buildings.
    const winTex = windowTexture(0.32);
    const batch = BoxBatch();
    const tint = new THREE.Color();
    const tops = [];   // rooftops tall enough for a red aviation light
    const parks = [];
    const n = Math.ceil(EXTENT / BLOCK);
    for (let bx = -n; bx <= n; bx++) {
      for (let bz = -n; bz <= n; bz++) {
        const cx = bx * BLOCK, cz = bz * BLOCK;
        if (bx === 0 && bz === 0) continue;                       // the tower's own block
        const res = RESERVED[bx + ',' + bz];
        if (res) {                                                // a building the story uses
          if (res.shops) continue;
          tint.setHSL(0.62, 0.2, res.l);
          batch.box(cx, 0, cz, res.w, res.h, res.d, tint, 0.25, 0.5);
          addFootprint(cx, cz, res.w, res.d);
          tops.push(cx, res.h + 1.5, cz);
          continue;
        }
        if (bx === 0 && bz === 1) { parks.push([cx, cz]); continue; } // a park right under the glass
        if (Math.abs(bx) <= 1 && Math.abs(bz) <= 1 && rand() < 0.4) { parks.push([cx, cz]); continue; }
        if (rand() < 0.04) { parks.push([cx, cz]); continue; }
        const inner = BLOCK - ROAD - 6;
        const near = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
        const pattern = rand();
        const lots = pattern < 0.25 ? [[0, 0, 1, 1]] : pattern < 0.6
          ? (rand() < 0.5 ? [[-0.25, 0, 0.5, 1], [0.25, 0, 0.5, 1]] : [[0, -0.25, 1, 0.5], [0, 0.25, 1, 0.5]])
          : [[-0.25, -0.25, 0.5, 0.5], [0.25, -0.25, 0.5, 0.5], [-0.25, 0.25, 0.5, 0.5], [0.25, 0.25, 0.5, 0.5]];
        for (const [ox, oz, fw, fd] of lots) {
          const inset = 2 + rand() * 5;
          const w = inner * fw - inset, d = inner * fd - inset;
          const x = cx + ox * inner, z = cz + oz * inner;
          let h = heightAt(x, z);
          if (near) h = Math.min(h, 30);
          h = Math.max(6, Math.round(h / FLOOR_H) * FLOOR_H);
          tint.setHSL(0.6 + rand() * 0.08, 0.15 + rand() * 0.2, 0.06 + rand() * 0.07);
          const uOff = Math.floor(rand() * TEX_CELLS) / TEX_CELLS, vOff = Math.floor(rand() * TEX_CELLS) / TEX_CELLS;
          batch.box(x, 0, z, w, h, d, tint, uOff, vOff);
          addFootprint(x, z, w, d);
          let top = h;
          // Setbacks on the taller towers, and the odd crown on top.
          if (h > 70 && rand() < 0.7) {
            const h2 = Math.round(h * (0.15 + rand() * 0.3) / FLOOR_H) * FLOOR_H;
            batch.box(x, h, z, w * 0.7, h2, d * 0.7, tint, uOff, vOff);
            top += h2;
            if (rand() < 0.5) {
              const h3 = Math.round(h * 0.12 / FLOOR_H) * FLOOR_H + FLOOR_H;
              batch.box(x, top, z, w * 0.42, h3, d * 0.42, tint, uOff, vOff);
              top += h3;
            }
          }
          if (top > 110) tops.push(x, top + 4, z);
          else if (rand() < 0.15) tops.push(x, top + 1.5, z);
        }
      }
    }

    // The tower itself: plain dark glass with lit offices, and a crown on top.
    // The storey with the floor-70 landing is built in pieces round the room, with a doorway
    // in the face where the elevator stops, so you can see in and out through it.
    const towerTint = new THREE.Color(0x10141f);
    const L = LANDING, TH = TOWER_HALF;
    addFootprint(0, 0, TH * 2, TH * 2);
    addFootprint(0, TH + 2.3, 4.4, 4.6);      // the glass car's shaft at the foot of the tower
    const b0 = L.y - 0.5, b1 = L.y + L.h + 0.4, roomZ = TH - L.depth;
    batch.box(0, 0, 0, TH * 2, b0, TH * 2, towerTint, 0, 0);
    batch.box(0, b1, 0, TH * 2, TOWER_TOP - b1, TH * 2, towerTint, 0, 0);
    const piece = (x0, x1, z0, z1, y0, y1) => batch.box((x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, towerTint, 0, 0);
    piece(-TH, -L.halfW, -TH, TH, b0, b1);
    piece(L.halfW, TH, -TH, TH, b0, b1);
    piece(-L.halfW, L.halfW, -TH, roomZ, b0, b1);
    piece(-L.halfW, -L.door, TH - 0.3, TH, b0, b1);
    piece(L.door, L.halfW, TH - 0.3, TH, b0, b1);
    piece(-L.door, L.door, TH - 0.3, TH, L.y + 2.4, b1);
    batch.box(0, TOWER_TOP, 0, TOWER_HALF * 1.4, 16, TOWER_HALF * 1.4, towerTint, 0.25, 0.5);
    tops.push(0, TOWER_TOP + 16 + 40, 0);

    const buildingMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.15 });
    daylightRefs.buildingMat = buildingMat;
    scene.add(batch.mesh(buildingMat));

    // Tower antenna.
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 40, 5), new THREE.MeshLambertMaterial({ color: 0x2a2e3a, flatShading: true }));
    antenna.position.set(0, TOWER_TOP + 16 + 20, 0);
    scene.add(antenna);

    // The elevator's track up the tower face: two rails and a cross brace every floor.
    const railMat = new THREE.MeshStandardMaterial({ color: 0x5b6474, metalness: 0.8, roughness: 0.4, flatShading: true });
    for (const sx of [-1.25, 1.25]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, TOWER_TOP, 0.3), railMat);
      rail.position.set(sx, TOWER_TOP / 2, TOWER_HALF + 0.15);
      scene.add(rail);
    }
    const braces = Math.floor(TOWER_TOP / FLOOR_H);
    const brace = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 0.16, 0.16), railMat, braces);
    const bm = new THREE.Matrix4();
    for (let i = 0; i < braces; i++) {
      const y = i * FLOOR_H + 2;
      const clear = y > LANDING.y - 0.5 && y < LANDING.y + 2.6;     // not across the landing doorway
      brace.setMatrixAt(i, clear ? bm.makeScale(0, 0, 0) : bm.makeTranslation(0, y, TOWER_HALF + 0.1));
    }
    scene.add(brace);
    // A strip of tiny teal lights either side of the track.
    const strip = [];
    for (let y = 1; y < TOWER_TOP; y += 2) strip.push(-2.2, y, TOWER_HALF + 0.12, 2.2, y, TOWER_HALF + 0.12);

    // Parks: low faceted trees on dark lawns.
    const lawnMat = new THREE.MeshLambertMaterial({ color: 0x0b1a12 });
    const treeGeo = new THREE.ConeGeometry(2.4, 7, 5);
    treeGeo.translate(0, 3.5, 0);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x173d2a, flatShading: true });
    const treePos = [];
    for (const [px, pz] of parks) {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - ROAD, BLOCK - ROAD), lawnMat);
      lawn.rotation.x = -Math.PI / 2; lawn.position.set(px, 0.06, pz);
      scene.add(lawn);
      for (let i = 0; i < 26; i++) {
        const tx = px + (rand() - 0.5) * (BLOCK - ROAD - 8), tz = pz + (rand() - 0.5) * (BLOCK - ROAD - 8), s = 0.7 + rand() * 0.7;
        if (Math.hypot(tx - 18, tz - 90) < 10) continue;            // keep clear round the bench the story uses
        treePos.push(tx, tz, s);
      }
    }
    // The plaza around the tower.
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - ROAD, BLOCK - ROAD), new THREE.MeshLambertMaterial({ color: 0x1b1d26 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.07;
    scene.add(plaza);
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, treePos.length / 3);
    const tm = new THREE.Matrix4();
    for (let i = 0; i < treePos.length / 3; i++) {
      const s = treePos[i * 3 + 2];
      tm.makeScale(s, s, s).setPosition(treePos[i * 3], 0, treePos[i * 3 + 1]);
      trees.setMatrixAt(i, tm);
    }
    scene.add(trees);

    // Streetlights along both kerbs of every road, plus park paths.
    const glow = glowTexture();
    const lamps = [];
    for (const L of roadLines) {
      for (let t = -EXTENT; t <= EXTENT; t += 24) {
        if (Math.abs(((t + BLOCK / 2) % BLOCK + BLOCK) % BLOCK - BLOCK / 2) > BLOCK / 2 - ROAD / 2 - 1) continue; // not in a junction
        for (const side of [-1, 1]) {
          lamps.push(L + side * (ROAD / 2 + 0.5), 6, t);
          lamps.push(t, 6, L + side * (ROAD / 2 + 0.5));
        }
      }
    }
    for (const [px, pz] of parks) for (let i = 0; i < 6; i++) lamps.push(px + (rand() - 0.5) * 50, 3, pz + (rand() - 0.5) * 50);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; lamps.push(Math.cos(a) * 30, 3.5, Math.sin(a) * 30); }
    const pointsOf = (arr, color, size, opacity) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: glow, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    };
    scene.add(pointsOf(lamps, 0xffa756, 4.5, 0.9));
    scene.add(pointsOf(strip, 0x39c5bb, 0.35, 0.9));

    // Red aviation lights that blink in slow unison.
    const redLights = pointsOf(tops, 0xff2a2a, 14, 1);
    scene.add(redLights);

    // Traffic: each car is a moving point of light. Headlights one way, tail lights the other.
    const cars = [];
    const carCount = 1400;
    const headPos = new Float32Array(carCount * 3), tailPos = new Float32Array(carCount * 3);
    for (let i = 0; i < carCount; i++) {
      cars.push({
        line: roadLines[Math.floor(rand() * roadLines.length)],
        alongX: rand() < 0.5,
        t: (rand() * 2 - 1) * EXTENT,
        dir: rand() < 0.5 ? 1 : -1,
        speed: 9 + rand() * 9,
      });
    }
    const heads = pointsOf(headPos, 0xfff2d8, 4.5, 1);
    const tails = pointsOf(tailPos, 0xff3b30, 4, 1);
    heads.frustumCulled = tails.frustumCulled = false;
    scene.add(heads, tails);

    function update(dt, time) {
      redLights.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(time * 2.2));
      for (let i = 0; i < carCount; i++) {
        const c = cars[i];
        c.t += c.dir * c.speed * dt;
        if (c.t > EXTENT) c.t -= EXTENT * 2; else if (c.t < -EXTENT) c.t += EXTENT * 2;
        const lane = c.dir * 3.2;
        const x = c.alongX ? c.t : c.line + lane, z = c.alongX ? c.line - lane : c.t;
        // Headlights are seen from the front, tail lights from behind: split by heading.
        const head = c.dir > 0;
        const a = head ? headPos : tailPos, b = head ? tailPos : headPos;
        a[i * 3] = x; a[i * 3 + 1] = 0.8; a[i * 3 + 2] = z;
        b[i * 3] = 0; b[i * 3 + 1] = -100; b[i * 3 + 2] = 0;
      }
      heads.geometry.attributes.position.needsUpdate = true;
      tails.geometry.attributes.position.needsUpdate = true;
    }

    return { update };
  }

  // ---------- Day and night ----------
  // k: 0 is deep night, 1 is full day; in between the sky goes through a warm dusk.
  const daylightRefs = {};
  let lastK = -1;
  const C = (h) => new THREE.Color(h);
  const NIGHT = { hemiSky: C(0x3a4a8a), hemiGround: C(0x1a0f0a), hemi: 0.9, sun: C(0x9fb0ff), sunI: 0.6, fog: C(0x24183a), fogD: 0.00078, bg: C(0x03050f) };
  const DAY = { hemiSky: C(0xcfe4ff), hemiGround: C(0x6a5a4a), hemi: 2.1, sun: C(0xfff1d8), sunI: 2.4, fog: C(0xb8cde0), fogD: 0.00045, bg: C(0x8fbfea) };
  const DUSK = { hemiSky: C(0x9a7aa8), hemiGround: C(0x3a2418), hemi: 1.4, sun: C(0xffa060), sunI: 1.4, fog: C(0x8a6a7a), fogD: 0.0006, bg: C(0x6a4a6a) };
  function setDaylight(k) {
    k = Math.max(0, Math.min(1, k));
    if (Math.abs(k - lastK) < 0.004) return;
    lastK = k;
    const R = daylightRefs;
    // Night -> dusk -> day.
    const a = k < 0.5 ? NIGHT : DUSK, b = k < 0.5 ? DUSK : DAY, t = k < 0.5 ? k * 2 : (k - 0.5) * 2;
    R.hemi.color.copy(a.hemiSky).lerp(b.hemiSky, t);
    R.hemi.groundColor.copy(a.hemiGround).lerp(b.hemiGround, t);
    R.hemi.intensity = a.hemi + (b.hemi - a.hemi) * t;
    R.moonLight.color.copy(a.sun).lerp(b.sun, t);
    R.moonLight.intensity = a.sunI + (b.sunI - a.sunI) * t;
    R.scene.fog.color.copy(a.fog).lerp(b.fog, t);
    R.scene.fog.density = a.fogD + (b.fogD - a.fogD) * t;
    R.scene.background.copy(a.bg).lerp(b.bg, t);
    // Office windows go dim by day; the buildings themselves lighten.
    R.buildingMat.emissiveIntensity = 1.15 * (1 - k * 0.85);
    R.buildingMat.color.setScalar(1 + k * 4.5);
    // The sky dome.
    if (skyData) {
      const out = skyData.attr.array, A = k < 0.5 ? skyData.night : skyData.dusk, B = k < 0.5 ? skyData.dusk : skyData.day;
      for (let i = 0; i < out.length; i++) out[i] = A[i] + (B[i] - A[i]) * t;
      skyData.attr.needsUpdate = true;
    }
    if (skyExtras.stars) skyExtras.stars.material.opacity = 0.85 * Math.max(0, 1 - k * 2.2);
    if (skyExtras.halo) skyExtras.halo.material.opacity = 0.35 * Math.max(0, 1 - k * 2);
    if (skyExtras.moon) skyExtras.moon.visible = k < 0.6;
  }

  return { build, TOWER_HALF, TOWER_TOP, FLOOR_H, LANDING, BLOCK, clearAt, addFootprint, setDaylight };
})();
