// The places the story goes besides the elevator: a ramen stall on the street under the tower,
// a bench in the park, the roof of Miku's old building, and your apartment high up across the
// road, with a big window that looks straight at the glass elevator. Each place is a group that's
// only shown while the story is there, with spots for Miku and camera shots in world space.
const Places = (() => {
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, flatShading: true, ...o });
  const glow = (color) => new THREE.MeshBasicMaterial({ color });

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function maker(group) {
    const box = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; group.add(o); return o; };
    const cyl = (r0, r1, h, m, x, y, z, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); group.add(o); return o; };
    const ball = (r, m, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m); o.position.set(x, y, z); group.add(o); return o; };
    const plane = (w, h, m, x, y, z, rx = 0, ry = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); group.add(o); return o; };
    const light = (color, i, dist, x, y, z) => { const l = new THREE.PointLight(color, i, dist, 1.6); l.position.set(x, y, z); group.add(l); return l; };
    // A sagging string of little bulbs between two points.
    const bulbs = (a, b, n, sag, m) => {
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        ball(0.06, m, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag, a[2] + (b[2] - a[2]) * k);
      }
    };
    return { box, cyl, ball, plane, light, bulbs };
  }

  // ---------- The ramen stall, on the plaza at the foot of the tower. ----------
  function buildStall(scene) {
    const g = new THREE.Group(); scene.add(g);
    const { box, cyl, ball, plane, light } = maker(g);
    const X = -25, Z = 31, Y = 0.07;               // the stall's counter faces -z
    const wood = mat(0x5a3a26), dark = mat(0x1b1410), red = mat(0x8e1f1f), steel = mat(0x8a8f99, { metalness: 0.7, roughness: 0.35 });
    box(3.4, 1.0, 1.4, wood, X, Y + 0.5, Z);                  // body
    box(3.6, 0.06, 0.55, mat(0x7a5236), X, Y + 1.03, Z - 0.75);  // counter
    box(3.4, 1.4, 0.08, dark, X, Y + 1.7, Z + 0.66);          // back board
    for (const s of [-1, 1]) box(0.1, 1.5, 0.1, wood, X + s * 1.65, Y + 1.75, Z - 0.6);
    const roof = box(3.9, 0.08, 2.0, red, X, Y + 2.5, Z - 0.1); roof.rotation.x = -0.12;
    // Noren: the split cloth curtain hanging from the front of the roof.
    const noren = canvasTex(512, 128, (c, w, h) => {
      c.fillStyle = '#1d2a4a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f3ead8'; c.font = 'bold 64px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ら ー め ん', w / 2, h / 2 + 4);
      c.fillStyle = '#0d1426'; for (let i = 1; i < 5; i++) c.fillRect(i * w / 5 - 2, 0, 4, h);
    });
    plane(3.4, 0.55, new THREE.MeshStandardMaterial({ map: noren, side: THREE.DoubleSide, roughness: 0.9 }), X, Y + 2.18, Z - 0.92, 0, Math.PI);
    // Red paper lanterns.
    const lantern = new THREE.MeshBasicMaterial({ color: 0xff5a3a });
    for (const s of [-1, 1]) { ball(0.22, lantern, X + s * 1.85, Y + 1.95, Z - 1.0).scale.set(1, 1.3, 1); cyl(0.12, 0.12, 0.05, dark, X + s * 1.85, Y + 2.25, Z - 1.0); }
    light(0xff9a5a, 9, 9, X, Y + 2.0, Z - 1.4);
    // Pots steaming on the back, bowls on the counter, stools in front.
    cyl(0.25, 0.22, 0.4, steel, X - 0.8, Y + 1.25, Z + 0.3);
    cyl(0.22, 0.2, 0.35, steel, X + 0.2, Y + 1.22, Z + 0.3);
    for (const dx of [-0.5, 0.5]) cyl(0.13, 0.07, 0.08, mat(0xeee6d6), X + dx, Y + 1.1, Z - 0.8);
    for (const dx of [-1.2, -0.4, 0.4, 1.2]) { cyl(0.18, 0.18, 0.05, red, X + dx, Y + 0.7, Z - 1.5); cyl(0.04, 0.04, 0.68, steel, X + dx, Y + 0.34, Z - 1.5, 6); }
    // A menu board.
    const menu = canvasTex(256, 320, (c, w, h) => {
      c.fillStyle = '#141414'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f0e6c8'; c.font = '26px Georgia, serif'; c.textAlign = 'left';
      ['Shoyu ......... 8', 'Miso ........... 9', 'Spicy miso ... 10', 'Extra egg ...... 1', 'Extra negi ..... 1'].forEach((t, i) => c.fillText(t, 18, 50 + i * 52));
    });
    plane(0.8, 1.0, new THREE.MeshBasicMaterial({ map: menu }), X + 1.0, Y + 1.75, Z + 0.61, 0, Math.PI);
    return {
      group: g,
      miku: { x: X + 0.9, y: Y, z: Z - 1.75, yaw: 0 },
      shots: {
        wide: { pos: [X - 3.0, Y + 1.6, Z - 5.2], look: [X + 0.2, Y + 1.3, Z - 1.0] },
        close: { pos: [X - 0.2, Y + 1.55, Z - 3.5], look: [X + 0.9, Y + 1.35, Z - 1.75] },
        tower: { pos: [X + 0.5, Y + 1.4, Z - 4.4], look: [0, 95, 19] },
      },
    };
  }

  // ---------- A bench in the park under the tower. ----------
  function buildPark(scene) {
    const g = new THREE.Group(); scene.add(g);
    const { box, cyl, ball, light } = maker(g);
    const X = 18, Z = 92, Y = 0.07;
    const wood = mat(0x4a3424), iron = mat(0x22252b, { metalness: 0.6 });
    box(1.8, 0.06, 0.45, wood, X, Y + 0.45, Z);
    box(1.8, 0.4, 0.05, wood, X, Y + 0.72, Z + 0.22).rotation.x = -0.15;
    for (const s of [-1, 1]) box(0.06, 0.45, 0.45, iron, X + s * 0.8, Y + 0.22, Z);
    cyl(0.06, 0.08, 3.6, iron, X + 1.6, Y + 1.8, Z + 0.2, 6);
    ball(0.2, glow(0xfff0d0), X + 1.6, Y + 3.7, Z + 0.2);
    light(0xffe2b0, 6, 12, X + 1.6, Y + 3.5, Z + 0.2);
    // Fireflies, drifting.
    const flies = [];
    const fm = new THREE.MeshBasicMaterial({ color: 0xd6ff8a });
    for (let i = 0; i < 26; i++) {
      const f = ball(0.025, fm, 0, 0, 0);
      flies.push({ f, a: Math.random() * 6.28, r: 1 + Math.random() * 4, h: 0.4 + Math.random() * 1.8, s: 0.2 + Math.random() * 0.4 });
    }
    return {
      group: g,
      miku: { x: X - 0.4, y: Y, z: Z - 0.7, yaw: 0 },
      shots: {
        wide: { pos: [X + 1.0, Y + 1.5, Z - 5.0], look: [X - 0.4, Y + 1.2, Z] },
        close: { pos: [X - 0.1, Y + 1.5, Z - 2.6], look: [X - 0.4, Y + 1.35, Z - 0.7] },
        sky: { pos: [X - 0.2, Y + 1.3, Z - 2.0], look: [X - 30, Y + 140, Z - 120] },
      },
      update(t) {
        for (const p of flies) {
          const a = p.a + t * p.s;
          p.f.position.set(X + Math.cos(a) * p.r, Y + p.h + Math.sin(t * 1.3 + p.a) * 0.3, Z - 1 + Math.sin(a * 1.3) * p.r * 0.6);
          p.f.visible = Math.sin(t * 2 + p.a * 3) > -0.3;
        }
      },
    };
  }

  // ---------- The roof of Miku's old walk-up. ----------
  function buildRoof(scene) {
    const g = new THREE.Group(); scene.add(g);
    const { box, cyl, ball, plane, light, bulbs } = maker(g);
    const CX = 86, CZ = 172, Y = 52, W = 36, D = 30;
    const concrete = mat(0x2e3036), dark = mat(0x16171b), rust = mat(0x5a3b2a);
    plane(W, D, mat(0x24252b), CX, Y + 0.01, CZ, -Math.PI / 2);
    // Parapet round the edge.
    box(W, 1.0, 0.3, concrete, CX, Y + 0.5, CZ - D / 2 + 0.15);
    box(W, 1.0, 0.3, concrete, CX, Y + 0.5, CZ + D / 2 - 0.15);
    for (const s of [-1, 1]) box(0.3, 1.0, D, concrete, CX + s * (W / 2 - 0.15), Y + 0.5, CZ);
    // Stair hut, water tank on legs, vents.
    box(4, 3, 3.5, concrete, CX + 10, Y + 1.5, CZ + 8);
    box(1.0, 2.1, 0.05, rust, CX + 9.3, Y + 1.05, CZ + 6.24);
    cyl(1.6, 1.6, 2.8, rust, CX - 10, Y + 4.4, CZ + 9, 12);
    cyl(1.7, 1.2, 0.8, rust, CX - 10, Y + 6.2, CZ + 9, 12);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.15, 3.0, 0.15, dark, CX - 10 + dx * 1.1, Y + 1.5, CZ + 9 + dz * 1.1);
    for (const dx of [-4, 3]) cyl(0.35, 0.35, 0.9, mat(0x60656e, { metalness: 0.6 }), CX + dx, Y + 0.45, CZ + 11, 8);
    // Her corner: a rug, two folding chairs, a crate table with a lantern, potted plants,
    // and strings of fairy lights on poles.
    const S = [CX - 12, CZ - 10];    // near the corner that faces the tower
    plane(3, 2.2, mat(0x6b2f3d), S[0] + 1, Y + 0.02, S[1] + 1, -Math.PI / 2);
    box(0.7, 0.5, 0.5, mat(0x7a5a3a), S[0] + 1, Y + 0.25, S[1] + 1);
    ball(0.12, glow(0xffd28a), S[0] + 1, Y + 0.62, S[1] + 1);
    for (const [dx, ry] of [[-0.2, 0.6], [2.1, -0.4]]) {
      const c = new THREE.Group(); c.position.set(S[0] + dx, Y, S[1] + 1.6); c.rotation.y = ry; g.add(c);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.45), mat(0x2d6b6a)); seat.position.y = 0.45; c.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.05), mat(0x2d6b6a)); back.position.set(0, 0.7, 0.22); c.add(back);
    }
    for (const [dx, dz] of [[-1.5, -1.2], [3.5, -1.2], [-1.5, 3.2]]) {
      cyl(0.25, 0.2, 0.4, mat(0x8a5a3a), S[0] + dx, Y + 0.2, S[1] + dz, 8);
      ball(0.38, mat(0x2f5a34), S[0] + dx, Y + 0.65, S[1] + dz);
    }
    const poles = [[S[0] - 2, S[1] - 2], [S[0] + 5, S[1] - 2], [S[0] + 5, S[1] + 5], [S[0] - 2, S[1] + 5]];
    for (const [x, z] of poles) cyl(0.04, 0.04, 2.6, dark, x, Y + 1.3, z, 6);
    const bulbM = glow(0xffe0a0);
    for (let i = 0; i < 4; i++) { const a = poles[i], b = poles[(i + 1) % 4]; bulbs([a[0], Y + 2.55, a[1]], [b[0], Y + 2.55, b[1]], 14, 0.35, bulbM); }
    bulbs([poles[0][0], Y + 2.55, poles[0][1]], [poles[2][0], Y + 2.55, poles[2][1]], 18, 0.5, bulbM);
    light(0xffc98a, 10, 14, S[0] + 1.5, Y + 2.3, S[1] + 1.5);
    // The tower is off to the south-west: she looks toward it.
    const yawTower = Math.atan2(-(0 - (S[0] + 1)), -(0 - (S[1] - 1)));
    return {
      group: g,
      miku: { x: S[0] + 1.2, y: Y, z: S[1] - 1.0, yaw: yawTower },
      shots: {
        wide: { pos: [S[0] + 4.5, Y + 1.7, S[1] + 4.5], look: [S[0] + 0.5, Y + 1.0, S[1] - 1.0] },
        close: { pos: [S[0] + 2.6, Y + 1.5, S[1] + 1.2], look: [S[0] + 1.2, Y + 1.35, S[1] - 1.0] },
        view: { pos: [S[0] + 3.0, Y + 1.5, S[1] + 2.0], look: [0, 150, 10] },
        stars: { pos: [S[0] + 1.6, Y + 1.2, S[1] + 0.8], look: [S[0] - 60, Y + 160, S[1] - 40] },
      },
    };
  }

  // ---------- Your apartment: floor 40 of the tower across the road. ----------
  // A big open-plan corner loft with glass on two sides: a living room round a big TV, a lookout
  // corner at the glass, a kitchen with a peninsula and stools, a dining table by the east
  // windows, a work-and-music nook along the back, and through a doorway, the bedroom.
  function buildApartment(scene) {
    const g = new THREE.Group(); scene.add(g);
    const { box, cyl, ball, plane, light } = maker(g);
    const Y = 160, H = 3.2;
    const X0 = -88, X1 = -69.6, Z0 = 155.4, Z1 = 165.4;          // the main room (front and east walls glass)
    const BX0 = -96, BZ1 = 163.4;                                 // the bedroom: x BX0..X0, z Z0..BZ1
    const DOOR0 = 161.9, DOOR1 = 163.0;                           // the bedroom doorway in the partition
    const W = X1 - X0, D = Z1 - Z0, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;
    const smooth = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02, ...o });
    const glowM = (color) => new THREE.MeshBasicMaterial({ color });
    const rnd = (a, b) => a + Math.random() * (b - a);
    const tile = (tex, rx, ry) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rx, ry); tex.anisotropy = 8; return tex; };
    const floorTex = () => tile(canvasTex(1024, 1024, (c, w, h) => {
      const rows = 8, pw = h / rows;
      for (let r = 0; r < rows; r++) {
        let x = -Math.random() * 300;
        while (x < w) {
          const len = 260 + Math.random() * 260, l = 30 + Math.random() * 10, hue = 24 + Math.random() * 8;
          c.fillStyle = `hsl(${hue}, 38%, ${l}%)`; c.fillRect(x, r * pw, len, pw);
          c.strokeStyle = `hsla(${hue}, 40%, ${l - 8}%, 0.35)`;
          for (let k = 0; k < 7; k++) { c.beginPath(); const yy = r * pw + Math.random() * pw; c.moveTo(x, yy); c.bezierCurveTo(x + len * 0.3, yy + rnd(-6, 6), x + len * 0.6, yy + rnd(-6, 6), x + len, yy + rnd(-4, 4)); c.lineWidth = 1 + Math.random(); c.stroke(); }
          c.fillStyle = 'rgba(20,10,5,0.55)'; c.fillRect(x, r * pw, 2, pw);
          x += len;
        }
        c.fillStyle = 'rgba(20,10,5,0.6)'; c.fillRect(0, r * pw, w, 2);
      }
    }), 4.5, 2.5);
    const plaster = (base) => tile(canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.035})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }), 4, 2);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.42, metalness: 0.05 });
    const wallMat = new THREE.MeshStandardMaterial({ map: plaster('#5a4f47'), roughness: 0.92 });
    const accentMat = new THREE.MeshStandardMaterial({ map: plaster('#1f3d3d'), roughness: 0.9 });
    const bedWall = new THREE.MeshStandardMaterial({ map: plaster('#3d3346'), roughness: 0.9 });
    const trim = smooth(0x2a2420, { roughness: 0.5 });
    const ceil = new THREE.MeshStandardMaterial({ color: 0x2c2826, roughness: 0.95 });
    const frame = smooth(0x15161a, { metalness: 0.5 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xb6dcff, transparent: true, opacity: 0.06, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const wood = smooth(0x5b3a24, { roughness: 0.35 });
    const dark = smooth(0x111111, { metalness: 0.6, roughness: 0.4 });
    const brass = smooth(0xc9a46a, { metalness: 0.9, roughness: 0.3 });

    // ---------- Shell: floors, ceilings, walls, glass ----------
    plane(W, D, floorMat, CX, Y, CZ, -Math.PI / 2);
    plane(W, D, ceil, CX, Y + H, CZ, Math.PI / 2);
    plane(W, H, accentMat, CX, Y + H / 2, Z1, 0, Math.PI);                                  // back wall (teal)
    const bw = X0 - BX0, bd = BZ1 - Z0;
    plane(bw, bd, new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.45 }), (BX0 + X0) / 2, Y, (Z0 + BZ1) / 2, -Math.PI / 2);
    plane(bw, bd, ceil, (BX0 + X0) / 2, Y + H, (Z0 + BZ1) / 2, Math.PI / 2);
    plane(bw, H, bedWall, (BX0 + X0) / 2, Y + H / 2, BZ1, 0, Math.PI);                      // bedroom back wall
    plane(bd, H, bedWall, BX0, Y + H / 2, (Z0 + BZ1) / 2, 0, Math.PI / 2);                  // bedroom west wall
    // The partition between bedroom and living room, with the doorway, seen from both sides.
    const wallSeg = (z0, z1, y0, y1) => {
      const len = z1 - z0, h = y1 - y0, z = (z0 + z1) / 2, y = Y + (y0 + y1) / 2;
      plane(len, h, wallMat, X0, y, z, 0, Math.PI / 2);
      plane(len, h, bedWall, X0 - 0.001, y, z, 0, -Math.PI / 2);
    };
    wallSeg(Z0, DOOR0, 0, H); wallSeg(DOOR1, BZ1, 0, H); wallSeg(DOOR0, DOOR1, 2.2, H);
    plane(Z1 - BZ1, H, wallMat, X0, Y + H / 2, (BZ1 + Z1) / 2, 0, Math.PI / 2);             // short wall past the bedroom
    box(0.12, 2.25, 0.06, trim, X0, Y + 1.12, DOOR0); box(0.12, 2.25, 0.06, trim, X0, Y + 1.12, DOOR1); box(0.12, 0.06, DOOR1 - DOOR0 + 0.06, trim, X0, Y + 2.22, (DOOR0 + DOOR1) / 2);
    // Floor-to-ceiling glass: the front of both rooms, and the whole east side.
    const glassWall = (len, x, z, ry, n) => {
      const p = plane(len, H, glass, x, Y + H / 2, z, 0, ry); p.renderOrder = 1;
      for (let i = 0; i <= n; i++) {
        const k = i / n - 0.5;
        box(0.08, H, 0.1, frame, x + (ry ? 0 : k * len), Y + H / 2, z + (ry ? -k * len : 0)).rotation.y = ry;
      }
      box(ry ? 0.12 : len, 0.12, ry ? len : 0.12, frame, x, Y + 0.06, z);
      box(ry ? 0.12 : len, 0.12, ry ? len : 0.12, frame, x, Y + H - 0.06, z);
    };
    glassWall(W, CX, Z0, 0, 6);
    glassWall(bw, (BX0 + X0) / 2, Z0, 0, 3);
    glassWall(D, X1, CZ, Math.PI / 2, 4);
    // Skirting and panelling on the back wall.
    box(W, 0.1, 0.02, trim, CX, Y + 0.05, Z1 - 0.01);
    box(W, 0.06, 0.04, trim, CX, Y + 0.95, Z1 - 0.02);
    for (let x = X0 + 0.4; x < X1 - 0.6; x += 0.9) {
      const pw = 0.7;
      for (const y of [0.18, 0.86]) box(pw, 0.02, 0.015, trim, x + pw / 2, Y + y, Z1 - 0.01);
      for (const xx of [x, x + pw]) box(0.02, 0.68, 0.015, trim, xx, Y + 0.52, Z1 - 0.01);
    }

    // ---------- Light ----------
    const cove = glowM(0xffcf8f);
    box(W - 0.3, 0.02, 0.05, cove, CX, Y + H - 0.12, Z1 - 0.06);
    box(bw - 0.3, 0.02, 0.05, cove, (BX0 + X0) / 2, Y + H - 0.12, BZ1 - 0.06);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const x = X0 + 2.2 + i * 4.6, z = Z0 + 3 + j * 4;
      cyl(0.09, 0.09, 0.01, glowM(0xfff1dc), x, Y + H - 0.004, z, 16);
      cyl(0.11, 0.11, 0.008, trim, x, Y + H - 0.002, z, 16);
    }
    light(0xffe2c0, 7, 16, CX - 3, Y + 2.8, CZ);
    light(0xffe2c0, 6, 14, CX + 5, Y + 2.8, CZ + 1);
    light(0x9fb4ff, 4, 12, CX, Y + 1.6, Z0 + 0.8);
    light(0xffd2b0, 5, 9, (BX0 + X0) / 2, Y + 2.6, (Z0 + BZ1) / 2);

    // ---------- Plants ----------
    function plant(x, y, z, s) {
      const leaf = smooth(0x3f7a45, { side: THREE.DoubleSide, roughness: 0.7 });
      const leaf2 = smooth(0x2f6338, { side: THREE.DoubleSide, roughness: 0.7 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + rnd(-0.2, 0.2), tilt = rnd(0.4, 1.0), len = rnd(0.35, 0.55) * s;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.quadraticCurveTo(0.22 * s, len * 0.45, 0, len); shape.quadraticCurveTo(-0.22 * s, len * 0.45, 0, 0);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), i % 2 ? leaf : leaf2);
        m.position.set(x, y + rnd(0.05, 0.25) * s, z);
        m.rotation.set(0, a, 0); m.rotateX(-tilt);
        g.add(m);
      }
    }
    const bigPlant = (x, z, potColor = 0xe9e1d6) => {
      cyl(0.22, 0.17, 0.45, smooth(potColor, { roughness: 0.8 }), x, Y + 0.225, z, 16);
      cyl(0.02, 0.025, 0.9, smooth(0x4a3a28), x, Y + 0.85, z, 6);
      plant(x, Y + 0.6, z, 1.5); plant(x, Y + 1.1, z, 1.1);
    };
    const smallPlant = (x, y, z, s = 0.3, pot = 0xd8cdbd) => { cyl(0.06 * s / 0.3, 0.05 * s / 0.3, 0.09 * s / 0.3, smooth(pot), x, y + 0.045 * s / 0.3, z, 10); plant(x, y + 0.08 * s / 0.3, z, s); };
    const curtains = (x0, x1, z, ry) => {
      const sheer = new THREE.MeshStandardMaterial({ color: 0xf2e8da, transparent: true, opacity: 0.5, roughness: 1, side: THREE.DoubleSide, depthWrite: false });
      for (const at of [x0, x1]) {
        const geo = new THREE.PlaneGeometry(0.8, H - 0.25, 28, 1);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.04);
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, sheer);
        m.position.set(ry ? z : at, Y + (H - 0.25) / 2, ry ? at : z); m.rotation.y = ry || 0; m.renderOrder = 2;
        g.add(m);
      }
    };
    curtains(X0 + 0.5, X1 - 0.5, Z0 + 0.25);
    curtains(BX0 + 0.5, X0 - 0.5, Z0 + 0.25);

    // ---------- Living room: TV wall on the partition, a big sectional facing it ----------
    const TVZ = 158.6;
    box(0.06, 1.05, 1.85, smooth(0x060607, { roughness: 0.2, metalness: 0.4 }), X0 + 0.06, Y + 1.45, TVZ);
    const tvTex = canvasTex(512, 290, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a1f4a'); gr.addColorStop(0.6, '#5a2a6a'); gr.addColorStop(1, '#f0846a');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 14; i++) { const bh = rnd(40, 160); c.fillRect(i * 38, h - bh, 32, bh); }
      c.fillStyle = '#fff'; c.font = 'bold 26px sans-serif'; c.fillText('NIGHT CITY DOCUMENTARY', 24, 44);
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = '16px sans-serif'; c.fillText('Episode 4 · The towers that never sleep', 24, 70);
    });
    const tvScreen = plane(1.78, 0.98, new THREE.MeshBasicMaterial({ map: tvTex }), X0 + 0.1, Y + 1.45, TVZ, 0, Math.PI / 2);
    tvScreen.visible = false;
    const tvOff = plane(1.78, 0.98, smooth(0x0a0b0e, { roughness: 0.15, metalness: 0.5 }), X0 + 0.095, Y + 1.45, TVZ, 0, Math.PI / 2);
    const tvGlow = light(0x8f7aff, 0, 4, X0 + 0.8, Y + 1.4, TVZ);
    box(0.45, 0.45, 2.4, wood, X0 + 0.25, Y + 0.225, TVZ);
    for (const dz of [-0.6, 0, 0.6]) box(0.01, 0.38, 0.55, smooth(0x4a2f1d), X0 + 0.475, Y + 0.23, TVZ + dz);
    box(0.2, 0.1, 0.5, dark, X0 + 0.3, Y + 0.5, TVZ + 0.7);
    smallPlant(X0 + 0.3, Y + 0.45, TVZ - 0.95, 0.35);
    box(0.12, 0.12, 0.12, smooth(0xe9e1d6), X0 + 0.3, Y + 0.51, TVZ - 0.55);
    box(0.02, 0.02, 2.2, glowM(0x7a6aff), X0 + 0.03, Y + 0.92, TVZ);                       // LED behind the TV
    // The sectional: a long seat facing the TV, a chaise toward the window.
    const fabric = smooth(0x5d6672, { roughness: 0.95 }), fabric2 = smooth(0x6c7682, { roughness: 0.95 });
    const SX = X0 + 4.1;
    box(0.95, 0.22, 3.0, fabric, SX, Y + 0.2, TVZ + 0.3);
    box(0.78, 0.14, 2.9, fabric2, SX - 0.06, Y + 0.38, TVZ + 0.3);
    box(0.22, 0.52, 3.0, fabric2, SX + 0.38, Y + 0.6, TVZ + 0.3).rotation.z = 0.1;
    box(1.6, 0.36, 0.95, fabric, SX - 0.65, Y + 0.18, TVZ - 1.55);                         // chaise
    box(1.5, 0.14, 0.85, fabric2, SX - 0.65, Y + 0.38, TVZ - 1.55);
    box(0.2, 0.45, 0.9, fabric, SX + 0.38, Y + 0.45, TVZ - 1.55);
    box(0.95, 0.42, 0.2, fabric, SX, Y + 0.42, TVZ + 1.75);
    const pillow = (x, z, color, ry) => { const p = box(0.12, 0.38, 0.4, smooth(color, { roughness: 1 }), x, Y + 0.62, z); p.rotation.set(0, ry, -0.25); };
    pillow(SX + 0.22, TVZ + 1.2, 0x39c5bb, 0.2); pillow(SX + 0.22, TVZ - 0.4, 0xd97aa0, -0.15); pillow(SX + 0.22, TVZ + 0.5, 0xe9dcc6, 0.1);
    box(0.85, 0.04, 0.75, smooth(0xc9a46a, { roughness: 1 }), SX - 0.05, Y + 0.47, TVZ + 1.0).rotation.y = 0.08;
    // Coffee table, rug, floor lamp.
    const TX = X0 + 2.3, TZ = TVZ;
    const rugTex = canvasTex(512, 340, (c, w, h) => {
      c.fillStyle = '#1e3f48'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d9c9a8'; c.lineWidth = 6; c.strokeRect(18, 18, w - 36, h - 36); c.lineWidth = 2; c.strokeRect(32, 32, w - 64, h - 64);
      c.fillStyle = '#c8645a';
      for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) { c.save(); c.translate(70 + i * 62, 75 + j * 63); c.rotate(Math.PI / 4); c.fillRect(-9, -9, 18, 18); c.restore(); }
    });
    // Laid flat, then turned to run along the sofa (the turn is about the floor's normal).
    plane(4.2, 3.2, new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }), TX + 0.4, Y + 0.006, TZ, -Math.PI / 2).rotation.z = Math.PI / 2;
    box(0.7, 0.05, 1.3, wood, TX, Y + 0.4, TZ);
    for (const [dx, dz] of [[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.6], [0.3, 0.6]]) cyl(0.018, 0.018, 0.38, dark, TX + dx, Y + 0.19, TZ + dz, 6);
    cyl(0.04, 0.035, 0.09, smooth(0x39c5bb), TX - 0.1, Y + 0.47, TZ - 0.3, 12);
    box(0.16, 0.03, 0.22, smooth(0x7a2f3f), TX + 0.1, Y + 0.44, TZ + 0.35).rotation.y = 0.3;
    cyl(0.035, 0.035, 0.07, smooth(0xf2ead8), TX - 0.15, Y + 0.46, TZ + 0.1, 12);
    ball(0.012, glowM(0xffb347), TX - 0.15, Y + 0.51, TZ + 0.1).scale.set(1, 1.8, 1);
    smallPlant(TX + 0.15, Y + 0.43, TZ - 0.1, 0.25);
    cyl(0.15, 0.15, 0.03, dark, SX + 0.2, Y + 0.015, TVZ + 2.2, 16);
    cyl(0.015, 0.015, 1.5, dark, SX + 0.2, Y + 0.75, TVZ + 2.2, 6);
    cyl(0.16, 0.22, 0.28, glowM(0xffdcae), SX + 0.2, Y + 1.6, TVZ + 2.2, 16);
    light(0xffc890, 4, 5, SX + 0.2, Y + 1.5, TVZ + 2.2);

    // ---------- Lookout corner: lounge chairs and a telescope at the glass ----------
    const LX = X1 - 3.0, LZ = Z0 + 1.5;
    for (const [dx, dz, ry] of [[-1.0, 0.1, -0.6], [0.9, 0.4, 0.5]]) {
      const ch = new THREE.Group(); ch.position.set(LX + dx, Y, LZ + dz); ch.rotation.y = ry + Math.PI; g.add(ch);
      const m = maker(ch);
      m.box(0.8, 0.3, 0.75, smooth(0xe8dccb, { roughness: 1 }), 0, 0.3, 0);
      m.box(0.8, 0.55, 0.18, smooth(0xe8dccb, { roughness: 1 }), 0, 0.62, 0.32).rotation.x = -0.2;
      for (const s of [-1, 1]) m.box(0.12, 0.42, 0.75, wood, s * 0.44, 0.33, 0);
      m.box(0.4, 0.3, 0.1, smooth(0x39c5bb, { roughness: 1 }), 0, 0.58, 0.18).rotation.x = -0.3;
    }
    cyl(0.32, 0.32, 0.03, wood, LX, Y + 0.45, LZ + 0.6, 24);
    cyl(0.03, 0.03, 0.44, dark, LX, Y + 0.22, LZ + 0.6, 8);
    cyl(0.04, 0.035, 0.09, smooth(0xd97aa0), LX - 0.08, Y + 0.51, LZ + 0.55, 12);
    cyl(0.04, 0.035, 0.09, smooth(0x39c5bb), LX + 0.1, Y + 0.51, LZ + 0.65, 12);
    // The telescope, pointed at the tower.
    for (const a of [0, 2.1, 4.2]) { const l = cyl(0.012, 0.012, 1.2, dark, X1 - 1.0 + Math.cos(a) * 0.18, Y + 0.58, Z0 + 0.8 + Math.sin(a) * 0.18, 6); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
    const scope = cyl(0.06, 0.08, 0.9, smooth(0xe9e1d6, { metalness: 0.3, roughness: 0.3 }), X1 - 1.0, Y + 1.25, Z0 + 0.75, 16);
    scope.rotation.set(-1.2, 0.5, 0);
    bigPlant(X1 - 0.5, Z0 + 0.55);
    bigPlant(X0 + 0.55, Z0 + 0.55, 0x39505a);
    // A daybed of floor cushions by the front glass, and a low ledge with books and candles.
    box(2.2, 0.18, 0.9, smooth(0x2c3a4a, { roughness: 1 }), CX - 1.5, Y + 0.09, Z0 + 0.75);
    for (let i = 0; i < 4; i++) box(0.5, 0.4, 0.14, smooth([0xd97aa0, 0xe9dcc6, 0x39c5bb, 0xc9a46a][i], { roughness: 1 }), CX - 2.3 + i * 0.55, Y + 0.38, Z0 + 0.4).rotation.x = -0.15;
    for (let i = 0; i < 3; i++) { cyl(0.04, 0.04, 0.08 + i * 0.04, smooth(0xf2ead8), CX - 0.2 + i * 0.12, Y + 0.04 + i * 0.02, Z0 + 0.35, 12); ball(0.012, glowM(0xffb347), CX - 0.2 + i * 0.12, Y + 0.1 + i * 0.04, Z0 + 0.35).scale.set(1, 1.8, 1); }

    // ---------- Kitchen: back counter, upper cabinets, peninsula with stools ----------
    const cab = smooth(0x24343a, { roughness: 0.55 }), top = smooth(0xe6e1d8, { roughness: 0.2 }), doorM = smooth(0x2a3d44, { roughness: 0.5 });
    const KX0 = -79.2, KX1 = X1 - 0.75;                         // back counter runs x KX0..KX1 against z = Z1
    const KZ = Z1 - 0.33;
    box(KX1 - KX0, 0.86, 0.62, cab, (KX0 + KX1) / 2, Y + 0.43, KZ);
    box(KX1 - KX0 + 0.04, 0.04, 0.68, top, (KX0 + KX1) / 2, Y + 0.88, KZ - 0.02);
    for (let x = KX0 + 0.3; x < KX1; x += 0.6) { box(0.56, 0.74, 0.012, doorM, x, Y + 0.44, KZ - 0.315); box(0.18, 0.012, 0.02, brass, x, Y + 0.78, KZ - 0.33); }
    const tilesTex = tile(canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#8a8178'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { c.fillStyle = `hsl(40, 20%, ${88 + Math.random() * 6}%)`; c.fillRect(k * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); }
    }), (KX1 - KX0) / 1.0, 0.7);
    plane(KX1 - KX0, 0.7, new THREE.MeshStandardMaterial({ map: tilesTex, roughness: 0.3 }), (KX0 + KX1) / 2, Y + 1.25, Z1 - 0.005, 0, Math.PI);
    box(KX1 - KX0, 0.72, 0.36, cab, (KX0 + KX1) / 2, Y + 2.0, Z1 - 0.18);
    for (let x = KX0 + 0.3; x < KX1; x += 0.6) { box(0.56, 0.64, 0.012, doorM, x, Y + 2.0, Z1 - 0.365); box(0.012, 0.12, 0.02, brass, x + 0.2, Y + 1.75, Z1 - 0.38); }
    box(KX1 - KX0 - 0.1, 0.012, 0.02, glowM(0xc9a070), (KX0 + KX1) / 2, Y + 1.63, Z1 - 0.3);
    light(0xffd2a0, 1.6, 3, (KX0 + KX1) / 2, Y + 1.5, Z1 - 0.6);
    // Hob and hood on the back counter, kettle, coffee machine, knife block, herbs.
    const HX = KX0 + 2.6;
    box(0.6, 0.012, 0.5, smooth(0x111111, { roughness: 0.15 }), HX, Y + 0.906, KZ - 0.05);
    for (const [dx, dz] of [[-0.14, -0.12], [0.14, -0.12], [-0.14, 0.12], [0.14, 0.12]]) cyl(0.08, 0.08, 0.003, smooth(0x2a2a2a), HX + dx, Y + 0.914, KZ - 0.05 + dz, 16);
    const hobGlow = cyl(0.07, 0.07, 0.002, glowM(0xff4a1a), HX - 0.14, Y + 0.917, KZ - 0.17, 16); hobGlow.visible = false;
    box(0.7, 0.28, 0.5, smooth(0x2c3036, { metalness: 0.5 }), HX, Y + 1.88, Z1 - 0.25);
    cyl(0.24, 0.22, 0.1, smooth(0x2c2c30, { metalness: 0.7 }), HX + 0.14, Y + 0.96, KZ - 0.05, 16);       // a pan
    cyl(0.08, 0.1, 0.2, smooth(0xe86a5a, { roughness: 0.3 }), KX0 + 1.2, Y + 1.0, KZ, 16);
    box(0.22, 0.32, 0.24, smooth(0x1b1c20, { metalness: 0.3 }), KX0 + 0.45, Y + 1.06, KZ + 0.05);
    box(0.1, 0.22, 0.14, wood, KX0 + 3.6, Y + 1.0, KZ + 0.08).rotation.z = -0.15;
    for (let i = 0; i < 3; i++) smallPlant(KX0 + 4.2 + i * 0.16, Y + 0.9, KZ + 0.12, 0.2);
    // Fridge at the end.
    box(0.72, 2.0, 0.7, smooth(0xd6d9de, { metalness: 0.35, roughness: 0.35 }), X1 - 0.38, Y + 1.0, Z1 - 0.38);
    box(0.02, 0.6, 0.03, smooth(0x888c92, { metalness: 0.8 }), X1 - 0.65, Y + 1.3, Z1 - 0.74);
    for (const [y, x, c] of [[1.55, -0.55, 0x39c5bb], [1.2, -0.25, 0xd97aa0], [1.7, -0.4, 0xf2c84b]]) cyl(0.025, 0.025, 0.01, smooth(c), X1 + x, Y + y, Z1 - 0.74, 10).rotation.x = Math.PI / 2;
    // The peninsula: from the back counter toward the window, with the sink, and stools.
    const PX = KX0 + 0.45, PZ0 = Z1 - 0.65, PZ1 = Z1 - 3.6;
    box(0.9, 0.86, PZ0 - PZ1, cab, PX, Y + 0.43, (PZ0 + PZ1) / 2);
    box(1.3, 0.05, PZ0 - PZ1 + 0.1, top, PX - 0.2, Y + 0.9, (PZ0 + PZ1) / 2);
    for (let z = PZ1 + 0.35; z < PZ0; z += 0.6) { box(0.012, 0.74, 0.56, doorM, PX + 0.455, Y + 0.44, z); box(0.02, 0.012, 0.18, brass, PX + 0.47, Y + 0.78, z); }
    box(0.45, 0.02, 0.5, smooth(0x7d8288, { metalness: 0.7, roughness: 0.3 }), PX + 0.1, Y + 0.93, PZ1 + 1.0);
    const tap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 12, Math.PI), smooth(0xcfd3d8, { metalness: 0.9, roughness: 0.2 }));
    tap.position.set(PX + 0.35, Y + 0.97, PZ1 + 1.0); tap.rotation.y = Math.PI / 2; g.add(tap);
    cyl(0.14, 0.08, 0.08, smooth(0xe9e1d6), PX - 0.15, Y + 0.97, PZ1 + 2.2, 16);
    for (const [c, dx, dz] of [[0xd84a3a, 0, 0], [0xf2c84b, 0.06, 0.05], [0xd84a3a, -0.05, 0.06], [0x7fbf4a, 0.03, -0.06]]) ball(0.045, smooth(c, { roughness: 0.4 }), PX - 0.15 + dx, Y + 1.03, PZ1 + 2.2 + dz);
    for (let i = 0; i < 3; i++) {
      const z = PZ1 + 0.5 + i * 0.95, x = PX - 1.15;
      cyl(0.18, 0.18, 0.05, smooth(0x5b3a24, { roughness: 0.4 }), x, Y + 0.68, z, 16);
      for (const a of [0, 2.1, 4.2]) { const l = cyl(0.015, 0.015, 0.7, dark, x + Math.cos(a) * 0.1, Y + 0.33, z + Math.sin(a) * 0.1, 6); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
      cyl(0.004, 0.004, 0.9, dark, PX - 0.2, Y + H - 0.45, z, 4);
      cyl(0.05, 0.15, 0.2, smooth(0x1b1c20, { metalness: 0.5, side: THREE.DoubleSide }), PX - 0.2, Y + 2.15, z, 16);
      ball(0.06, glowM(0xffd8a0), PX - 0.2, Y + 2.07, z);
    }
    light(0xffd8a0, 4, 5, PX - 0.3, Y + 2.0, (PZ0 + PZ1) / 2);

    // ---------- Dining by the east windows ----------
    const NX = X1 - 1.5, NZ = CZ + 0.6;
    box(1.0, 0.05, 1.6, wood, NX, Y + 0.75, NZ);
    for (const [dx, dz] of [[-0.4, -0.7], [0.4, -0.7], [-0.4, 0.7], [0.4, 0.7]]) cyl(0.025, 0.025, 0.74, dark, NX + dx, Y + 0.37, NZ + dz, 6);
    cyl(0.05, 0.04, 0.14, smooth(0xf2ead8), NX, Y + 0.84, NZ, 10);
    for (let i = 0; i < 3; i++) { const st = cyl(0.004, 0.004, 0.22, smooth(0x3f7a45), NX, Y + 0.98, NZ, 4); st.rotation.x = (i - 1) * 0.3; ball(0.028, smooth([0xf2c84b, 0xd97aa0, 0xffffff][i]), NX, Y + 1.08, NZ + Math.sin((i - 1) * 0.3) * 0.11); }
    for (const [dx, dz, ry] of [[-0.75, -0.4, Math.PI / 2], [-0.75, 0.4, Math.PI / 2], [0.75, -0.4, -Math.PI / 2], [0.75, 0.4, -Math.PI / 2]]) {
      const ch = new THREE.Group(); ch.position.set(NX + dx, Y, NZ + dz); ch.rotation.y = ry; g.add(ch);
      const m = maker(ch);
      m.box(0.42, 0.04, 0.42, wood, 0, 0.46, 0); m.box(0.42, 0.36, 0.03, wood, 0, 0.68, -0.2);
      for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) m.cyl(0.015, 0.015, 0.46, dark, a, 0.23, b, 6);
    }
    cyl(0.004, 0.004, 1.2, dark, NX, Y + H - 0.6, NZ, 4);
    ball(0.2, new THREE.MeshStandardMaterial({ color: 0xffe9c8, emissive: 0xffd9a0, emissiveIntensity: 1.2, transparent: true, opacity: 0.92 }), NX, Y + 1.9, NZ);
    light(0xffd9a0, 3, 4, NX, Y + 1.8, NZ);

    // ---------- Work and music nook (back wall, west) ----------
    const DX = X0 + 1.2, DZ = Z1 - 0.38;
    box(1.4, 0.04, 0.62, wood, DX, Y + 0.74, DZ);
    for (const s of [-1, 1]) box(0.04, 0.72, 0.56, dark, DX + s * 0.65, Y + 0.36, DZ);
    box(0.64, 0.38, 0.025, smooth(0x0d0e10, { roughness: 0.3 }), DX, Y + 1.09, DZ + 0.16);
    const screenTex = canvasTex(512, 300, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0e2a3a'); gr.addColorStop(1, '#2a5f66');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#7ff0e6'; c.font = 'bold 34px Consolas, monospace'; c.fillText('LUMEN OS', 26, 56);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '24px sans-serif';
      ['🛒  Shop', '💼  Work', '📦  Orders'].forEach((t, i) => c.fillText(t, 30, 120 + i * 46));
    });
    plane(0.6, 0.345, new THREE.MeshBasicMaterial({ map: screenTex }), DX, Y + 1.09, DZ + 0.145, 0, Math.PI);
    box(0.05, 0.16, 0.05, dark, DX, Y + 0.84, DZ + 0.17);
    box(0.44, 0.018, 0.14, smooth(0x1b1c20), DX, Y + 0.77, DZ - 0.12);
    const phones = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16, Math.PI), smooth(0x39c5bb, { roughness: 0.5 }));
    phones.position.set(DX - 0.48, Y + 0.85, DZ - 0.05); phones.rotation.set(-Math.PI / 2, 0, 0.4); g.add(phones);
    cyl(0.07, 0.07, 0.02, dark, DX + 0.5, Y + 0.77, DZ + 0.2, 16);
    cyl(0.04, 0.08, 0.1, smooth(0x111111, { side: THREE.DoubleSide }), DX + 0.5, Y + 1.15, DZ + 0.02, 12).rotation.x = 0.6;
    ball(0.03, glowM(0xffe2b0), DX + 0.5, Y + 1.12, DZ);
    light(0x7fd8ff, 1.2, 2.5, DX, Y + 1.1, DZ - 0.3);
    const chair = new THREE.Group(); chair.position.set(DX, Y, DZ - 0.55); g.add(chair);
    const cm = maker(chair);
    cm.cyl(0.24, 0.24, 0.08, smooth(0x2c3036, { roughness: 0.8 }), 0, 0.47, 0, 16);
    cm.box(0.42, 0.45, 0.06, smooth(0x2c3036, { roughness: 0.8 }), 0, 0.78, -0.2).rotation.x = 0.1;
    cm.cyl(0.03, 0.03, 0.4, dark, 0, 0.23, 0, 8);
    // Gallery over the desk.
    const art = (w, h, draw, x, y) => {
      box(w + 0.05, h + 0.05, 0.03, smooth(0x111111), x, y, Z1 - 0.02);
      box(w - 0.02, h - 0.02, 0.005, smooth(0xf2ede4), x, y, Z1 - 0.036);
      plane(w - 0.1, h - 0.1, new THREE.MeshStandardMaterial({ map: canvasTex(256, Math.round(256 * h / w), draw), roughness: 0.8 }), x, y, Z1 - 0.04, 0, Math.PI);
    };
    art(0.62, 0.44, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16123a'); gr.addColorStop(1, '#5a3a6a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) { c.fillStyle = '#0a0a18'; const bh = rnd(20, 90); c.fillRect(i * 15, h - bh, 13, bh); }
      c.fillStyle = '#0a0a18'; c.fillRect(w / 2 - 16, 20, 32, h); c.fillStyle = '#7ff0e6'; c.fillRect(w / 2 + 16, 60, 6, 8);
    }, DX - 0.2, Y + 2.05);
    art(0.3, 0.4, (c, w, h) => {
      c.fillStyle = '#0f1d33'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2ead8'; c.beginPath(); c.arc(w / 2, h * 0.32, 34, 0, 7); c.fill();
      c.fillStyle = '#1a2d4a'; c.fillRect(0, h * 0.62, w, h);
    }, DX + 0.45, Y + 2.12);
    // Bookshelf.
    const BSX = X0 + 3.0;
    for (let i = 0; i < 5; i++) box(1.4, 0.03, 0.32, smooth(0x3a2a20), BSX, Y + 0.02 + i * 0.46, Z1 - 0.16);
    for (const s of [-1, 1]) box(0.03, 1.92, 0.32, smooth(0x3a2a20), BSX + s * 0.7, Y + 0.96, Z1 - 0.16);
    const spines = [0x8a3b3b, 0x2f5a6b, 0xd9c7a0, 0x3b6b4a, 0x6b4a7a, 0xc9a46a, 0x1d2a4a, 0xa85a3a, 0xe9e1d6];
    for (let sh = 0; sh < 4; sh++) {
      let x = BSX - 0.66;
      while (x < BSX + 0.62) { const w = rnd(0.035, 0.07), h = rnd(0.24, 0.36); box(w, h, rnd(0.18, 0.24), smooth(spines[Math.floor(Math.random() * spines.length)], { roughness: 0.8 }), x + w / 2, Y + 0.035 + sh * 0.46 + h / 2, Z1 - 0.16); x += w + 0.004; }
    }
    smallPlant(BSX + 0.4, Y + 1.86, Z1 - 0.16, 0.3);
    // Keyboard against the back wall.
    const KBX = X0 + 5.0, KBZ = Z1 - 0.3;
    box(1.3, 0.09, 0.35, smooth(0x111214, { roughness: 0.4 }), KBX, Y + 0.82, KBZ);
    const keysTex = canvasTex(512, 64, (c, w, h) => {
      c.fillStyle = '#f2f0ea'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#999'; for (let i = 0; i < 52; i++) c.fillRect(i * w / 52, 0, 1, h);
      c.fillStyle = '#111'; for (let i = 0; i < 52; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) c.fillRect(i * w / 52 + w / 104, 0, w / 80, h * 0.62);
    });
    plane(1.2, 0.16, new THREE.MeshStandardMaterial({ map: keysTex, roughness: 0.4 }), KBX, Y + 0.868, KBZ - 0.08, -Math.PI / 2);
    for (const s of [-1, 1]) box(0.04, 0.85, 0.04, dark, KBX + s * 0.4, Y + 0.42, KBZ).rotation.z = s * 0.4;
    cyl(0.17, 0.17, 0.06, smooth(0x2a2420), KBX, Y + 0.48, KBZ - 0.55, 16);
    // The front door (to the building's elevator).
    const FX = X0 + 7.1;
    box(0.95, 2.1, 0.06, smooth(0x2a221c, { roughness: 0.5 }), FX, Y + 1.05, Z1 - 0.03);
    for (const [y, h] of [[0.55, 0.7], [1.45, 0.75]]) box(0.7, h, 0.015, smooth(0x231c17, { roughness: 0.5 }), FX, Y + y, Z1 - 0.065);
    box(0.06, 2.22, 0.05, trim, FX - 0.5, Y + 1.11, Z1 - 0.03); box(0.06, 2.22, 0.05, trim, FX + 0.5, Y + 1.11, Z1 - 0.03); box(1.06, 0.06, 0.05, trim, FX, Y + 2.2, Z1 - 0.03);
    box(0.14, 0.03, 0.03, brass, FX - 0.33, Y + 1.0, Z1 - 0.09);
    plane(0.8, 0.5, new THREE.MeshStandardMaterial({ map: canvasTex(160, 100, (c, w, h) => { c.fillStyle = '#6b5440'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8dcc4'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('hello', w / 2, 62); }), roughness: 1 }), FX, Y + 0.005, Z1 - 0.5, -Math.PI / 2).rotation.z = Math.PI;
    box(0.5, 0.06, 0.03, trim, FX + 0.85, Y + 1.65, Z1 - 0.02);
    box(0.16, 0.7, 0.04, smooth(0xf2c84b, { roughness: 1 }), FX + 0.75, Y + 1.3, Z1 - 0.09);
    box(0.3, 0.45, 0.06, smooth(0xd9cdb8, { roughness: 1 }), FX + 1.0, Y + 1.38, Z1 - 0.1);

    // ---------- The bedroom ----------
    const BCX = (BX0 + X0) / 2, BCZ = (Z0 + BZ1) / 2;
    // A low platform bed, headboard against the west wall, facing the doorway.
    const BEDX = BX0 + 1.25, BEDZ = BCZ + 0.4;
    box(2.2, 0.3, 1.9, wood, BEDX, Y + 0.15, BEDZ);
    box(2.0, 0.22, 1.75, smooth(0xf2ede4, { roughness: 1 }), BEDX + 0.05, Y + 0.41, BEDZ);
    box(1.15, 0.06, 1.8, smooth(0x2f4f5a, { roughness: 1 }), BEDX + 0.5, Y + 0.54, BEDZ);
    box(0.25, 0.08, 1.8, smooth(0x2f4f5a, { roughness: 1 }), BEDX + 1.05, Y + 0.48, BEDZ).rotation.z = -0.4;
    for (const dz of [-0.45, 0.45]) box(0.35, 0.14, 0.6, smooth(0xf8f4ec, { roughness: 1 }), BEDX - 0.75, Y + 0.6, BEDZ + dz).rotation.z = 0.25;
    box(0.3, 0.22, 0.32, smooth(0xd97aa0, { roughness: 1 }), BEDX - 0.5, Y + 0.64, BEDZ).rotation.z = 0.2;
    box(0.08, 1.2, 2.3, smooth(0x3a2a20, { roughness: 0.6 }), BX0 + 0.05, Y + 0.95, BEDZ);
    for (let i = 0; i < 5; i++) box(0.05, 1.0, 0.4, smooth(0x4a3626, { roughness: 0.6 }), BX0 + 0.09, Y + 0.95, BEDZ - 0.92 + i * 0.46);
    // String lights over the headboard and art above.
    for (let i = 0; i <= 16; i++) { const k = i / 16; ball(0.035, glowM(0xffe0a0), BX0 + 0.12, Y + 2.1 - Math.sin(k * Math.PI) * 0.25, BEDZ - 1.2 + k * 2.4); }
    const bedArt = canvasTex(320, 200, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#f0846a'); gr.addColorStop(1, '#5a2a6a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,240,220,0.9)'; c.beginPath(); c.arc(w * 0.7, h * 0.45, 40, 0, 7); c.fill();
      c.fillStyle = '#1d1430'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 20) c.lineTo(x, h - 30 - Math.sin(x * 0.03) * 25 - Math.random() * 10); c.lineTo(w, h); c.fill();
    });
    box(0.03, 0.62, 0.95, smooth(0x111111), BX0 + 0.02, Y + 2.3, BEDZ);
    plane(0.88, 0.55, new THREE.MeshStandardMaterial({ map: bedArt, roughness: 0.8 }), BX0 + 0.04, Y + 2.3, BEDZ, 0, Math.PI / 2);
    // Nightstands with lamps.
    for (const dz of [-1.3, 1.3]) {
      box(0.45, 0.5, 0.42, wood, BX0 + 0.3, Y + 0.25, BEDZ + dz);
      box(0.012, 0.012, 0.2, brass, BX0 + 0.53, Y + 0.38, BEDZ + dz);
      cyl(0.05, 0.07, 0.18, smooth(0xe9e1d6), BX0 + 0.3, Y + 0.59, BEDZ + dz, 12);
      cyl(0.11, 0.16, 0.2, glowM(0xffdcae), BX0 + 0.3, Y + 0.78, BEDZ + dz, 16);
    }
    light(0xffc890, 3.5, 4.5, BX0 + 0.5, Y + 0.9, BEDZ - 1.3);
    light(0xffc890, 3.5, 4.5, BX0 + 0.5, Y + 0.9, BEDZ + 1.3);
    cyl(0.04, 0.035, 0.09, smooth(0x39c5bb), BX0 + 0.2, Y + 0.55, BEDZ + 1.25, 12);
    box(0.18, 0.04, 0.24, smooth(0x7a2f3f), BX0 + 0.35, Y + 0.52, BEDZ - 1.3).rotation.y = 0.3;
    // A soft rug, a wardrobe, a dresser with a mirror, a reading chair at the window.
    plane(2.4, 1.8, new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: 1 }), BEDX + 1.3, Y + 0.006, BEDZ, -Math.PI / 2);
    box(1.6, 2.3, 0.6, smooth(0xe9e1d6, { roughness: 0.5 }), BCX + 0.6, Y + 1.15, BZ1 - 0.32);
    box(0.012, 2.1, 0.02, smooth(0x999999), BCX + 0.6, Y + 1.15, BZ1 - 0.62);
    for (const s of [-1, 1]) box(0.012, 0.3, 0.03, brass, BCX + 0.6 + s * 0.06, Y + 1.15, BZ1 - 0.64);
    box(0.45, 0.85, 1.2, wood, X0 - 0.25, Y + 0.425, BCZ - 1.2);
    const mirror = box(0.02, 0.9, 0.6, smooth(0xcfd8e0, { metalness: 0.9, roughness: 0.05 }), X0 - 0.03, Y + 1.5, BCZ - 1.2);
    box(0.03, 0.96, 0.66, brass, X0 - 0.02, Y + 1.5, BCZ - 1.2);
    for (let i = 0; i < 3; i++) cyl(0.025, 0.025, 0.08 + i * 0.03, smooth([0xd97aa0, 0xf2c84b, 0x39c5bb][i]), X0 - 0.3, Y + 0.89 + i * 0.015, BCZ - 1.5 + i * 0.12, 10);
    smallPlant(X0 - 0.3, Y + 0.85, BCZ - 0.8, 0.3);
    const rc = new THREE.Group(); rc.position.set(X0 - 1.0, Y, Z0 + 0.9); rc.rotation.y = Math.PI * 0.8; g.add(rc);
    const rm = maker(rc);
    rm.box(0.75, 0.32, 0.7, smooth(0x8a5a6a, { roughness: 1 }), 0, 0.3, 0);
    rm.box(0.75, 0.6, 0.15, smooth(0x8a5a6a, { roughness: 1 }), 0, 0.65, 0.3).rotation.x = -0.15;
    for (const s of [-1, 1]) rm.box(0.12, 0.42, 0.7, smooth(0x8a5a6a, { roughness: 1 }), s * 0.42, 0.35, 0);
    box(0.24, 0.035, 0.17, smooth(0x2f5a6b), X0 - 1.0, Y + 0.48, Z0 + 0.9).rotation.y = 0.5;
    bigPlant(BX0 + 0.5, Z0 + 0.55);
    for (const dz of [-0.12, 0.12]) box(0.26, 0.07, 0.11, smooth(0xf2c0d0, { roughness: 1 }), BEDX + 1.3, Y + 0.035, BEDZ + 1.1 + dz);

    // The photo of the two of you (appears later in the story): on the dresser.
    const photo = box(0.04, 0.3, 0.24, smooth(0x111111), X0 - 0.15, Y + 1.0, BCZ - 1.65);
    photo.visible = false;

    // ---------- Things you can buy, hidden until they're delivered ----------
    const decor = {};
    const item = (id, build) => { const d = new THREE.Group(); d.visible = false; g.add(d); decor[id] = d; build(maker(d), d); };
    item('neon', (m) => {
      const tex = canvasTex(256, 128, (c, w, h) => {
        c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
        c.shadowColor = '#39c5bb'; c.shadowBlur = 18; c.fillStyle = '#9ffff5'; c.font = 'bold 72px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('ネギ ♡', w / 2, h / 2 + 4);
      });
      m.plane(1.0, 0.5, new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending }), BSX, Y + 2.45, Z1 - 0.03, 0, Math.PI);
      m.light(0x39c5bb, 2.5, 4, BSX, Y + 2.3, Z1 - 0.6);
    });
    item('fairy', (m) => { m.bulbs([X0 + 0.2, Y + H - 0.12, Z0 + 0.12], [X1 - 0.2, Y + H - 0.12, Z0 + 0.12], 56, 0.2, glow(0xffe0a0)); m.bulbs([X1 - 0.12, Y + H - 0.12, Z0 + 0.2], [X1 - 0.12, Y + H - 0.12, Z1 - 0.8], 30, 0.18, glow(0xffe0a0)); });
    item('plush', (m) => {
      m.cyl(0.07, 0.08, 0.36, smooth(0xf2f0e6), SX - 0.1, Y + 0.52, TVZ - 0.1, 10).rotation.x = 1.1;
      for (const a of [-0.3, 0, 0.3]) { const l = m.cyl(0.02, 0.05, 0.3, smooth(0x4caf50), SX - 0.1 + a * 0.2, Y + 0.64, TVZ + 0.12, 6); l.rotation.x = 1.1 + a; }
    });
    item('stars', (m, d) => {
      m.cyl(0.1, 0.12, 0.12, smooth(0x1d2a4a), TX, Y + 0.48, TZ + 0.45, 10);
      m.ball(0.08, glow(0xbfd6ff), TX, Y + 0.56, TZ + 0.45);
      const pts = [];
      for (let i = 0; i < 500; i++) pts.push(X0 + 0.3 + Math.random() * (W - 0.6), Y + H - 0.015, Z0 + 0.3 + Math.random() * (D - 0.6));
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      d.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.035 })));
    });
    item('tank', (m, d) => {
      m.box(0.9, 0.55, 0.4, smooth(0x1a1a1a), X0 + 0.25, Y + 0.275, TVZ - 2.0);
      m.box(0.86, 0.45, 0.36, new THREE.MeshBasicMaterial({ color: 0x2f8fb0, transparent: true, opacity: 0.6 }), X0 + 0.25, Y + 0.78, TVZ - 2.0);
      const fishes = [];
      for (let i = 0; i < 4; i++) fishes.push(m.ball(0.025, glow([0xff8a3a, 0xffd23a, 0xff5a8a, 0x7ff0e6][i]), X0 + 0.25, Y + 0.78, TVZ - 2.0));
      d.userData.fish = fishes;
      m.light(0x4fc8ff, 1.2, 3, X0 + 0.6, Y + 0.9, TVZ - 2.0);
    });
    item('cushion', (m) => { m.cyl(0.4, 0.42, 0.14, smooth(0xd97aa0, { roughness: 1 }), LX - 0.2, Y + 0.07, LZ - 0.3, 20); m.cyl(0.3, 0.3, 0.15, smooth(0xe9a1bd, { roughness: 1 }), LX - 0.2, Y + 0.08, LZ - 0.3, 20); });
    item('poster', (m) => {
      const tex = canvasTex(200, 280, (c, w, h) => {
        c.fillStyle = '#1b1430'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffcf6a'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center';
        c.fillText('GERALD', w / 2, 70); c.font = '18px Georgia, serif'; c.fillText('& his saw', w / 2, 98);
        c.font = '14px sans-serif'; c.fillText('LIVE AT THE BLUE ROOM', w / 2, 255);
      });
      m.box(0.02, 0.75, 0.55, smooth(0x111111), X0 + 0.02, Y + 1.65, Z1 - 1.4);
      m.plane(0.5, 0.7, new THREE.MeshBasicMaterial({ map: tex }), X0 + 0.035, Y + 1.65, Z1 - 1.4, 0, Math.PI / 2);
    });

    // ---------- Walking about ----------
    const solid = [
      [X0, X0 + 0.5, TVZ - 1.25, TVZ + 1.25],             // TV console
      [SX - 1.5, SX + 0.5, TVZ - 2.05, TVZ + 1.85],       // sectional
      [TX - 0.4, TX + 0.4, TZ - 0.7, TZ + 0.7],           // coffee table
      [SX + 0.05, SX + 0.35, TVZ + 2.05, TVZ + 2.35],     // floor lamp
      [LX - 1.55, LX + 1.45, LZ - 0.4, LZ + 1.05],        // lookout chairs and table
      [X1 - 1.3, X1, Z0, Z0 + 1.2],                       // telescope and plant
      [X0, X0 + 0.9, Z0, Z0 + 1.0],                       // plant
      [CX - 2.7, CX - 0.2, Z0, Z0 + 1.25],                // daybed
      [KX0 - 0.05, X1, Z1 - 0.7, Z1],                     // back counter and fridge
      [PX - 0.9, PX + 0.5, PZ1 - 0.05, Z1],               // peninsula
      [PX - 1.4, PX - 0.9, PZ1 + 0.25, PZ1 + 2.65],       // stools
      [NX - 1.0, NX + 1.0, NZ - 0.95, NZ + 0.95],         // dining
      [DX - 0.72, DX + 0.72, DZ - 0.85, Z1],              // desk and chair
      [BSX - 0.72, BSX + 0.72, Z1 - 0.34, Z1],            // bookshelf
      [KBX - 0.7, KBX + 0.7, KBZ - 0.75, Z1],             // keyboard
      // bedroom
      [BX0, BX0 + 2.4, BEDZ - 1.55, BEDZ + 1.55],          // bed and nightstands
      [BCX - 0.2, BCX + 1.45, BZ1 - 0.65, BZ1],            // wardrobe
      [X0 - 0.5, X0, BCZ - 1.85, BCZ - 0.55],              // dresser
      [X0 - 1.5, X0 - 0.5, Z0, Z0 + 1.4],                  // reading chair
      [BX0, BX0 + 0.9, Z0, Z0 + 1.0],                      // plant
    ];
    const tankBox = [X0, X0 + 0.5, TVZ - 2.25, TVZ - 1.75];
    function canStand(x, z, r) {
      const inMain = x > X0 + r && x < X1 - r && z > Z0 + r && z < Z1 - r;
      const inBed = x > BX0 + r && x < X0 - r && z > Z0 + r && z < BZ1 - r;
      const inDoor = Math.abs(x - X0) < 0.6 && z > DOOR0 + r * 0.6 && z < DOOR1 - r * 0.6;
      if (!inMain && !inBed && !inDoor) return false;
      for (const b of decor.tank.visible ? [...solid, tankBox] : solid) if (x > b[0] - r && x < b[1] + r && z > b[2] - r && z < b[3] + r) return false;
      return true;
    }
    return {
      group: g, photo, decor, canStand, floorY: Y,
      tv(on) { tvScreen.visible = on; tvOff.visible = !on; tvGlow.intensity = on ? 3 : 0; },
      hob(on) { hobGlow.visible = on; },
      at: {
        computer: { x: DX, z: DZ - 0.95 },
        bed: { x: BEDX + 1.2, z: BEDZ },
        door: { x: FX, z: Z1 - 0.3 },
        window: { x: CX + 1.5, z: Z0 + 0.6 },
        keys: { x: KBX, z: KBZ - 0.8 },
        stove: { x: HX, z: Z1 - 0.95 },
        tv: { x: X0 + 0.3, z: TVZ },
        scope: { x: X1 - 1.0, z: Z0 + 0.9 },
        start: { x: FX, z: Z1 - 1.0, yaw: 0 },
        bedside: { x: BEDX + 1.6, z: BEDZ + 0.2, yaw: Math.PI / 2 },
      },
      update(t) {
        if (decor.tank.visible) decor.tank.userData.fish.forEach((f, i) => { f.position.set(X0 + 0.25 + Math.sin(t * 0.5 + i * 2) * 0.35, Y + 0.68 + i * 0.07 + Math.sin(t * 1.3 + i) * 0.03, TVZ - 2.0 + Math.cos(t * 0.6 + i * 2.3) * 0.12); });
      },
      spots: {
        window: { x: CX + 1.5, y: Y, z: Z0 + 0.95, yaw: 0 },
        couch: { x: TX + 0.9, y: Y, z: TZ - 1.0, yaw: -Math.PI / 2 },
        desk: { x: DX + 0.9, y: Y, z: DZ - 1.0, yaw: Math.PI * 0.75 },
        keys: { x: KBX, y: Y, z: KBZ - 0.95, yaw: Math.PI },
        kitchen: { x: PX - 1.6, y: Y, z: PZ1 + 1.5, yaw: -Math.PI / 2 },
        sofa: { x: TX + 0.9, y: Y, z: TZ + 0.9, yaw: -Math.PI / 2 },
        door: { x: FX, y: Y, z: Z1 - 1.0, yaw: Math.PI },
        lookout: { x: LX, y: Y, z: Z0 + 0.95, yaw: 0 },
      },
      shots: {
        room: { pos: [X1 - 1.0, Y + 1.75, Z1 - 1.2], look: [X0 + 2, Y + 1.0, Z0 + 2.5] },
        window: { pos: [CX + 1.5, Y + 1.5, Z0 + 3.2], look: [CX + 1.5, Y + 1.3, Z0 + 0.6] },
        windowClose: { pos: [CX + 0.8, Y + 1.5, Z0 + 2.2], look: [CX + 1.5, Y + 1.35, Z0 + 0.95] },
        view: { pos: [CX + 1.6, Y + 1.5, Z0 + 2.6], look: [0, Y + 40, 0] },
        keys: { pos: [KBX + 1.6, Y + 1.5, KBZ - 2.2], look: [KBX, Y + 1.15, KBZ - 0.8] },
        kitchen: { pos: [PX - 3.6, Y + 1.6, PZ1 + 0.4], look: [PX - 1.6, Y + 1.15, PZ1 + 1.5] },
        sofa: { pos: [TX + 3.4, Y + 1.5, TZ - 1.2], look: [TX + 0.9, Y + 1.2, TZ + 0.6] },
        door: { pos: [FX - 1.8, Y + 1.6, Z1 - 3.2], look: [FX, Y + 1.2, Z1 - 1.0] },
        bedroom: { pos: [X0 - 0.6, Y + 1.7, Z0 + 1.6], look: [BX0 + 1.2, Y + 0.7, BCZ + 0.5] },
      },
    };
  }

  function build(scene) {
    const all = { stall: buildStall(scene), park: buildPark(scene), roof: buildRoof(scene), home: buildApartment(scene) };
    let shown = null;
    function show(name) {
      shown = name;
      for (const k in all) all[k].group.visible = k === name;
    }
    show(null);
    function update(t) { if (shown && all[shown].update) all[shown].update(t); }
    return { ...all, show, update, get current() { return shown; } };
  }

  return { build };
})();
