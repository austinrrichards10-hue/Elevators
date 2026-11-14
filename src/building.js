// The parts of the tower the car passes through. The car rides the outside of the tower in the
// open air, but a few times on the way down it slides through a band of raw concrete wrapped
// round the tower (a mechanical floor), shut in the dark for a few seconds: water-stained walls,
// a lamp every floor that's dying or dead, and the city gone. Then it comes out the other side.
// The car also stops a few times in the open, so you can look out.
// World space: the tower face is at z = City.TOWER_HALF, and the car rides at x = 0, z = cabZ.
const Building = (() => {
  // Cab floor heights the car stops at, top to bottom: the start, three pauses, the ground.
  const STOPS = [280, 196, 112, 40, 0.32];
  // The concrete bands, bottom and top heights. Each takes about 7 seconds to pass through.
  const BANDS = [[240, 252], [154, 166], [72, 84], [14, 24]];
  const SW = 2.35;          // the sleeve's inner half-width round the car
  const REPEAT = 12;        // the wall texture covers three floors, so the lamps differ

  function concreteTexture() {
    // Three floors of wall (12 m tall, 4 m wide): dark, stained concrete, a slab edge each floor
    // and a caged lamp each floor: one weak, one dim, one dead.
    const W = 256, H = 768;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#3a3c42'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 7000; i++) {
      const v = 30 + Math.random() * 30;
      g.fillStyle = `rgba(${v},${v},${v + 4},${Math.random() * 0.3})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    // Water stains running down from each slab.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * W, y = Math.floor(Math.random() * 3) * 256 + 10, len = 60 + Math.random() * 180;
      const s = g.createLinearGradient(0, y, 0, y + len);
      s.addColorStop(0, 'rgba(8,9,12,0.55)'); s.addColorStop(1, 'rgba(8,9,12,0)');
      g.fillStyle = s; g.fillRect(x, y, 4 + Math.random() * 14, len);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 1);              // formwork board lines
    const lamps = [];
    for (let f = 0; f < 3; f++) {
      const top = f * 256;
      g.fillStyle = '#18191d'; g.fillRect(0, top + 234, W, 22);          // slab edge
      g.fillStyle = '#5e4f22'; g.fillRect(0, top + 230, W, 4);           // faded safety line
      const lx = 70 + f * 60, ly = top + 80;
      g.fillStyle = '#121316'; g.fillRect(lx - 10, ly - 4, 20, 28);      // lamp cage
      g.fillStyle = f === 2 ? '#2a2620' : '#b89a6a'; g.fillRect(lx - 6, ly, 12, 20);
      lamps.push([lx, ly + 10, [1, 0.55, 0][f]]);
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    const e = document.createElement('canvas'); e.width = W; e.height = H;
    const ge = e.getContext('2d');
    ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    for (const [x, y, k] of lamps) {
      if (!k) continue;
      const glow = ge.createRadialGradient(x, y, 2, x, y, 110);
      glow.addColorStop(0, `rgba(255,205,150,${k})`); glow.addColorStop(0.12, `rgba(230,160,100,${k * 0.6})`); glow.addColorStop(0.5, `rgba(150,100,70,${k * 0.18})`); glow.addColorStop(1, 'rgba(120,80,60,0)');
      ge.fillStyle = glow; ge.fillRect(x - 110, y - 110, 220, 220);
    }
    const emissive = new THREE.CanvasTexture(e);
    emissive.colorSpace = THREE.SRGBColorSpace;
    emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
    return { map, emissive };
  }

  function build(scene, cabZ) {
    const TH = City.TOWER_HALF;
    const ZF = cabZ + SW;             // inside face of the sleeve's front wall
    const OUT = ZF + 0.5;             // outer face of the band
    const group = new THREE.Group();
    scene.add(group);

    const tex = concreteTexture();
    const concrete = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.95, metalness: 0 });
    const shell = new THREE.MeshStandardMaterial({ color: 0x5c5e65, roughness: 0.9, metalness: 0.1, flatShading: true });
    const louvre = new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.7, metalness: 0.4, flatShading: true });

    const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); group.add(m); return m; };
    // A concrete wall face, with its texture tiled at true size.
    const face = (w, y0, y1, x, z, rotY) => {
      const h = y1 - y0;
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, (uv.getY(i) * h + y0) / REPEAT);
      const m = new THREE.Mesh(geo, concrete);
      m.position.set(x, y0 + h / 2, z); m.rotation.y = rotY;
      group.add(m);
    };

    const depth = ZF - TH, belt = OUT - TH;
    for (const [y0, y1] of BANDS) {
      const h = y1 - y0, my = (y0 + y1) / 2;
      // The band wraps the whole tower: a thick concrete belt with dark louvres along it.
      const span = TH * 2 + belt * 2;
      box(TH + belt - SW - 0.4, h, belt, shell, -(SW + 0.4 + (TH + belt - SW - 0.4) / 2), my, TH + belt / 2);
      box(TH + belt - SW - 0.4, h, belt, shell, SW + 0.4 + (TH + belt - SW - 0.4) / 2, my, TH + belt / 2);
      box(SW * 2 + 0.8, h, 0.5, shell, 0, my, ZF + 0.25);
      box(span, h, belt, shell, 0, my, -TH - belt / 2);
      for (const s of [-1, 1]) box(belt, h, TH * 2, shell, s * (TH + belt / 2), my, 0);
      // Dark louvre strips on the outside faces only (the car runs inside the front face).
      for (let k = 0; k < 3; k++) {
        const ly = y0 + 2 + k * (h - 4) / 2;
        box(span + 0.1, 0.9, 0.1, louvre, 0, ly, OUT + 0.05);
        box(span + 0.1, 0.9, 0.1, louvre, 0, ly, -OUT - 0.05);
        for (const s of [-1, 1]) box(0.1, 0.9, span + 0.1, louvre, s * (OUT + 0.05), ly, 0);
      }
      // The sleeve round the car: concrete on three sides, the tower face behind.
      box(0.4, h, depth, shell, -SW - 0.2, my, TH + depth / 2);
      box(0.4, h, depth, shell, SW + 0.2, my, TH + depth / 2);
      face(depth, y0, y1, -SW + 0.001, TH + depth / 2, Math.PI / 2);
      face(depth, y0, y1, SW - 0.001, TH + depth / 2, -Math.PI / 2);
      face(SW * 2, y0, y1, 0, ZF - 0.001, Math.PI);
      face(SW * 2, y0, y1, 0, TH + 0.02, 0);
    }

    // How open the view is at cab height y: 1 in the open air, 0 shut inside a band.
    function openness(y) {
      let open = 1;
      for (const [b0, b1] of BANDS) {
        const lo = b0 - 2.7, hi = b1;                   // the cab is 2.7 m tall
        const k = y > hi ? (y - hi) / 3 : y < lo ? (lo - y) / 3 : 0;
        open = Math.min(open, Math.min(1, k));
      }
      return open;
    }

    // The dying lamps stutter, now and then dropping out altogether.
    let flick = 1;
    function update(t) {
      const n = Math.sin(t * 13.1) * Math.sin(t * 7.7 + 1.3) * Math.sin(t * 3.1);
      const target = n > 0.55 ? 0.15 : 0.75 + 0.25 * Math.sin(t * 31);
      flick += (target - flick) * 0.5;
      concrete.emissiveIntensity = flick;
    }

    return { update, openness };
  }

  // ---------- The floor-70 landing, where you start. ----------
  // A small, dim lobby inside the tower: dark stone floor, panelled walls, one tired ceiling light
  // that flickers, a bench, and the elevator's hall doors standing open with the car beyond.
  function signTexture(lines, w, h, color) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([text, size, y]) => { g.font = `${size}px Consolas, monospace`; g.fillText(text, w / 2, y); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function buildLanding(scene) {
    const L = City.LANDING, TH = City.TOWER_HALF;
    const y = L.y, z0 = TH - L.depth, zF = TH - 0.31, H = L.h;
    const DOOR = 0.42;                     // the hall doorway's half-width
    const group = new THREE.Group();
    scene.add(group);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.3, metalness: 0.15 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.8, metalness: 0.05 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.95 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x6c7380, metalness: 0.85, roughness: 0.3, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.6, metalness: 0.4 });
    const panel = new THREE.MeshBasicMaterial({ color: 0xffe7c4 });

    const plane = (w, h, mat, x, py, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, py, z); m.rotation.set(rx, ry, 0); group.add(m); return m; };
    const box = (w, h, d, mat, x, py, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, py, z); group.add(m); return m; };
    const W = L.halfW * 2, D = zF - z0;
    plane(W, D, floorMat, 0, y, z0 + D / 2, -Math.PI / 2, 0);
    plane(W, D, ceilMat, 0, y + H, z0 + D / 2, Math.PI / 2, 0);
    plane(W, H, wallMat, 0, y + H / 2, z0, 0, 0);                                    // back wall
    plane(D, H, wallMat, -L.halfW, y + H / 2, z0 + D / 2, 0, Math.PI / 2);            // left
    plane(D, H, wallMat, L.halfW, y + H / 2, z0 + D / 2, 0, -Math.PI / 2);            // right
    // Front wall, round the doorway (2.2 m tall).
    const side = L.halfW - DOOR;
    plane(side, H, wallMat, -(DOOR + side / 2), y + H / 2, zF, 0, Math.PI);
    plane(side, H, wallMat, DOOR + side / 2, y + H / 2, zF, 0, Math.PI);
    plane(DOOR * 2, H - 2.2, wallMat, 0, y + 2.2 + (H - 2.2) / 2, zF, 0, Math.PI);
    // Skirting and a dado rail, to make it read as a room.
    box(W, 0.12, 0.03, dark, 0, y + 0.06, z0 + 0.02);
    for (const s of [-1, 1]) box(0.03, 0.12, D, dark, s * (L.halfW - 0.02), y + 0.06, z0 + D / 2);
    // The doorway: a steel frame, the floor readout above it and a call button beside it.
    box(0.06, 2.26, 0.12, steel, -DOOR - 0.03, y + 1.13, zF - 0.03);
    box(0.06, 2.26, 0.12, steel, DOOR + 0.03, y + 1.13, zF - 0.03);
    box(DOOR * 2 + 0.12, 0.06, 0.12, steel, 0, y + 2.23, zF - 0.03);
    plane(0.5, 0.2, new THREE.MeshBasicMaterial({ map: signTexture([['70  ▼', 64, 50]], 256, 100, '#7ff0e6') }), 0, y + 2.55, zF - 0.01, 0, Math.PI);
    box(0.1, 0.22, 0.03, steel, 0.75, y + 1.15, zF - 0.02);
    box(0.035, 0.035, 0.02, new THREE.MeshBasicMaterial({ color: 0x39c5bb }), 0.75, y + 1.15, zF - 0.04);
    // A sign on the left wall.
    plane(1.6, 0.5, new THREE.MeshBasicMaterial({ map: signTexture([['OBSERVATION ELEVATOR', 34, 40], ['FLOOR 70  ·  DOWN ONLY', 24, 84], ], 512, 128, '#cfc6b6') }), -L.halfW + 0.01, y + 1.9, zF - 1.6, 0, Math.PI / 2);
    // A bench against the right wall, and a dead plant.
    box(0.45, 0.08, 1.6, new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.7 }), L.halfW - 0.35, y + 0.45, z0 + 3.2);
    for (const dz of [-0.65, 0.65]) box(0.4, 0.42, 0.06, steel, L.halfW - 0.35, y + 0.21, z0 + 3.2 + dz);
    box(0.4, 0.45, 0.4, dark, -L.halfW + 0.45, y + 0.225, z0 + 0.6);
    const stalk = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0x3a3424, flatShading: true }));
    stalk.position.set(-L.halfW + 0.45, y + 0.9, z0 + 0.6); stalk.rotation.z = 0.15; group.add(stalk);
    // Ceiling panels: one working, one dead, one that flickers.
    box(1.1, 0.03, 0.6, panel, 0, y + H - 0.02, zF - 1.6);
    box(1.1, 0.03, 0.6, dark, 0, y + H - 0.02, z0 + 1.8);
    const flickPanel = box(1.1, 0.03, 0.6, new THREE.MeshBasicMaterial({ color: 0xffe7c4 }), 0, y + H - 0.02, z0 + 4.5);
    const light = new THREE.PointLight(0xffd9a8, 6, 9, 1.5);
    light.position.set(0, y + H - 0.4, zF - 1.6);
    group.add(light);
    const light2 = new THREE.PointLight(0xffd9a8, 3, 7, 1.5);
    light2.position.set(0, y + H - 0.4, z0 + 4.5);
    group.add(light2);

    // The end of your office, where you work: a row of desks along the back wall, everyone's
    // screen asleep but yours, the company name on the wall, a water cooler.
    const deskM = new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const x = -3.6 + i * 2.4;
      box(1.6, 0.04, 0.75, deskM, x, y + 0.74, z0 + 0.5);
      for (const s of [-1, 1]) box(0.04, 0.72, 0.7, dark, x + s * 0.76, y + 0.36, z0 + 0.5);
      box(0.6, 0.36, 0.03, dark, x, y + 1.1, z0 + 0.3);
      const mine = i === 1;
      box(0.56, 0.32, 0.005, mine ? new THREE.MeshBasicMaterial({ color: 0x4fa8c8 }) : new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.2 }), x, y + 1.1, z0 + 0.32);
      box(0.45, 0.02, 0.15, dark, x, y + 0.77, z0 + 0.65);
      const chair = box(0.48, 0.08, 0.48, new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.8 }), x + (i % 2 ? 0.2 : -0.15), y + 0.48, z0 + 1.25);
      chair.rotation.y = (i - 1.5) * 0.3;
      box(0.45, 0.5, 0.06, new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.8 }), x + (i % 2 ? 0.2 : -0.15), y + 0.8, z0 + 1.5).rotation.y = (i - 1.5) * 0.3;
    }
    plane(2.4, 0.5, new THREE.MeshBasicMaterial({ map: signTexture([['LUMEN  CORP.', 56, 64]], 512, 112, '#7ff0e6') }), 0, y + 2.4, z0 + 0.01, 0, 0);
    box(0.32, 1.1, 0.32, new THREE.MeshStandardMaterial({ color: 0xe9e1d6, roughness: 0.5 }), L.halfW - 0.4, y + 0.55, z0 + 1.2);
    box(0.26, 0.38, 0.26, new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.6 }), L.halfW - 0.4, y + 1.3, z0 + 1.2);

    // Hall doors: two steel leaves in the wall, sliding apart into it.
    const leaves = [-1, 1].map((s) => box(DOOR, 2.2, 0.04, steel, s * DOOR / 2, y + 1.1, zF + 0.12));
    function setDoors(k) { leaves.forEach((m, i) => { m.position.x = (i ? 1 : -1) * DOOR * (0.5 + k); }); }

    function update(t) {
      const n = Math.sin(t * 9.3) * Math.sin(t * 4.1 + 2) * Math.sin(t * 1.7);
      const on = n < 0.4 ? 1 : 0.08;
      flickPanel.material.color.setRGB(on, on * 0.9, on * 0.75);
      light2.intensity = 3 * on;
    }
    return { setDoors, update };
  }

  const floorOf = (D) => Math.max(1, Math.round(D / City.FLOOR_H));

  return { build, buildLanding, STOPS, floorOf };
})();
