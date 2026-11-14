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
  // A warm, lived-in studio: oak plank floor, a deep teal accent wall with panelling, warm LED
  // cove lighting and downlights, sheer curtains at a floor-to-ceiling window that looks straight
  // at the glass elevator, a proper kitchen, a sofa with pillows and a blanket, a little dining
  // nook, a desk setup, a gallery wall, a styled bookshelf and plenty of plants.
  function buildApartment(scene) {
    const g = new THREE.Group(); scene.add(g);
    const { box, cyl, ball, plane, light } = maker(g);
    const X0 = -92, X1 = -80, Z0 = 155.4, Z1 = 162.4, Y = 160, H = 3.0;   // window wall at Z0
    const W = X1 - X0, D = Z1 - Z0, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;
    const smooth = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02, ...o });
    const glowM = (color) => new THREE.MeshBasicMaterial({ color });
    const rnd = (a, b) => a + Math.random() * (b - a);

    // ---------- Surfaces ----------
    const tile = (tex, rx, ry) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rx, ry); tex.anisotropy = 8; return tex; };
    const floorTex = tile(canvasTex(1024, 1024, (c, w, h) => {
      const rows = 8, pw = h / rows;
      for (let r = 0; r < rows; r++) {
        let x = -Math.random() * 300;
        while (x < w) {
          const len = 260 + Math.random() * 260;
          const l = 30 + Math.random() * 10, hue = 24 + Math.random() * 8;
          c.fillStyle = `hsl(${hue}, 38%, ${l}%)`;
          c.fillRect(x, r * pw, len, pw);
          c.strokeStyle = `hsla(${hue}, 40%, ${l - 8}%, 0.35)`;
          for (let k = 0; k < 7; k++) { c.beginPath(); const yy = r * pw + Math.random() * pw; c.moveTo(x, yy); c.bezierCurveTo(x + len * 0.3, yy + rnd(-6, 6), x + len * 0.6, yy + rnd(-6, 6), x + len, yy + rnd(-4, 4)); c.lineWidth = 1 + Math.random(); c.stroke(); }
          c.fillStyle = 'rgba(20,10,5,0.55)'; c.fillRect(x, r * pw, 2, pw);
          x += len;
        }
        c.fillStyle = 'rgba(20,10,5,0.6)'; c.fillRect(0, r * pw, w, 2);
      }
    }), 3, 2);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.42, metalness: 0.05 });
    const plaster = (base) => tile(canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.035})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }), 4, 2);
    const wallMat = new THREE.MeshStandardMaterial({ map: plaster('#5a4f47'), roughness: 0.92 });
    const accentMat = new THREE.MeshStandardMaterial({ map: plaster('#1f3d3d'), roughness: 0.9 });
    const trimMat = smooth(0x2a2420, { roughness: 0.5 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2c2826, roughness: 0.95 });
    plane(W, D, floorMat, CX, Y, CZ, -Math.PI / 2);
    plane(W, D, ceilMat, CX, Y + H, CZ, Math.PI / 2);
    plane(W, H, accentMat, CX, Y + H / 2, Z1, 0, Math.PI);                      // back wall: deep teal
    plane(D, H, wallMat, X0, Y + H / 2, CZ, 0, Math.PI / 2);
    plane(D, H, wallMat, X1, Y + H / 2, CZ, 0, -Math.PI / 2);
    // Panelling on the lower back wall, and skirting all round.
    box(W, 0.06, 0.04, trimMat, CX, Y + 0.95, Z1 - 0.02);
    for (let x = X0 + 0.5; x < X1 - 0.6; x += 0.9) {
      for (const [y0, y1] of [[0.18, 0.86]]) {
        const pw = 0.7, ph = y1 - y0;
        box(pw, 0.02, 0.015, trimMat, x + pw / 2, Y + y0, Z1 - 0.01);
        box(pw, 0.02, 0.015, trimMat, x + pw / 2, Y + y1, Z1 - 0.01);
        box(0.02, ph, 0.015, trimMat, x, Y + y0 + ph / 2, Z1 - 0.01);
        box(0.02, ph, 0.015, trimMat, x + pw, Y + y0 + ph / 2, Z1 - 0.01);
      }
    }
    box(W, 0.1, 0.02, trimMat, CX, Y + 0.05, Z1 - 0.01);
    for (const s of [-1, 1]) box(0.02, 0.1, D, trimMat, s < 0 ? X0 + 0.01 : X1 - 0.01, Y + 0.05, CZ);

    // ---------- Light ----------
    // Warm LED cove along the ceiling on three walls, and recessed downlights.
    const cove = glowM(0xffcf8f);
    box(W - 0.3, 0.02, 0.05, cove, CX, Y + H - 0.12, Z1 - 0.06);
    box(0.05, 0.02, D - 0.8, cove, X0 + 0.06, Y + H - 0.12, CZ + 0.3);
    box(0.05, 0.02, D - 0.8, cove, X1 - 0.06, Y + H - 0.12, CZ + 0.3);
    for (const [dx, dz] of [[-3.5, -1.2], [0, -1.2], [3.5, -1.2], [-3.5, 1.6], [3.5, 1.6]]) {
      cyl(0.09, 0.09, 0.01, glowM(0xfff1dc), CX + dx, Y + H - 0.004, CZ + dz, 16);
      cyl(0.11, 0.11, 0.008, trimMat, CX + dx, Y + H - 0.002, CZ + dz, 16);
    }
    light(0xffc890, 9, 11, X0 + 0.8, Y + 1.8, Z1 - 0.8);
    light(0xffe2c0, 6, 13, CX + 0.5, Y + 2.7, CZ + 0.5);
    light(0x9fb4ff, 3.5, 8, CX, Y + 1.6, Z0 + 0.6);

    // ---------- The window ----------
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xb6dcff, transparent: true, opacity: 0.06, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const gl = plane(W, H, glass, CX, Y + H / 2, Z0); gl.renderOrder = 1;
    const frame = smooth(0x15161a, { metalness: 0.5 });
    for (let i = 0; i <= 4; i++) box(0.08, H, 0.1, frame, X0 + (i / 4) * W, Y + H / 2, Z0);
    box(W, 0.1, 0.12, frame, CX, Y + 0.05, Z0);
    box(W, 0.12, 0.12, frame, CX, Y + H - 0.06, Z0);
    // The ledge, with a teal light strip under its lip.
    box(W - 0.4, 0.4, 0.4, smooth(0x2a2522), CX, Y + 0.2, Z0 + 0.3);
    box(W - 0.4, 0.04, 0.46, smooth(0x6b4a32, { roughness: 0.4 }), CX, Y + 0.42, Z0 + 0.3);
    box(W - 0.5, 0.012, 0.012, glowM(0x39c5bb), CX, Y + 0.38, Z0 + 0.53);
    // Sheer curtains, gathered at each end, on a black rod.
    cyl(0.015, 0.015, W - 0.2, smooth(0x111111, { metalness: 0.6 }), CX, Y + H - 0.2, Z0 + 0.62, 6).rotation.z = Math.PI / 2;
    const sheer = new THREE.MeshStandardMaterial({ color: 0xf2e8da, transparent: true, opacity: 0.55, roughness: 1, side: THREE.DoubleSide, depthWrite: false });
    for (const [x0, w] of [[X0 + 0.15, 0.85], [X1 - 1.0, 0.85]]) {
      const geo = new THREE.PlaneGeometry(w, H - 0.25, 28, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.04);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, sheer);
      m.position.set(x0 + w / 2, Y + (H - 0.25) / 2, Z0 + 0.62);
      m.renderOrder = 2;
      g.add(m);
    }
    // Things on the ledge: little plants, a record player, a stack of books, a candle.
    const pot = (x, y, z, s, potColor = 0xc9b8a4) => {
      cyl(0.13 * s, 0.1 * s, 0.22 * s, smooth(potColor, { roughness: 0.8 }), x, y + 0.11 * s, z, 12);
      plant(x, y + 0.2 * s, z, s * 0.55);
    };
    pot(X0 + 0.8, Y + 0.44, Z0 + 0.3, 1);
    pot(CX - 2.6, Y + 0.44, Z0 + 0.3, 0.8, 0x39505a);
    pot(X1 - 1.6, Y + 0.44, Z0 + 0.3, 0.9, 0xe7ddd0);
    box(0.45, 0.1, 0.35, smooth(0x2b2b2b), CX + 1.8, Y + 0.49, Z0 + 0.3);
    cyl(0.15, 0.15, 0.01, smooth(0x0a0a0a, { roughness: 0.3 }), CX + 1.8, Y + 0.545, Z0 + 0.3, 24);
    cyl(0.04, 0.04, 0.012, smooth(0xd04a4a), CX + 1.8, Y + 0.552, Z0 + 0.3, 12);
    for (let i = 0; i < 4; i++) box(0.24, 0.035, 0.17, smooth([0x8a3b3b, 0x2f5a6b, 0xd9c7a0, 0x3b6b4a][i]), CX - 0.8, Y + 0.46 + i * 0.035, Z0 + 0.3).rotation.y = rnd(-0.15, 0.15);

    // ---------- Plants ----------
    // A plant: a stem and broad leaves fanned out on short stalks.
    function plant(x, y, z, s) {
      const leaf = smooth(0x3f7a45, { side: THREE.DoubleSide, roughness: 0.7 });
      const leaf2 = smooth(0x2f6338, { side: THREE.DoubleSide, roughness: 0.7 });
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2), tilt = rnd(0.4, 1.0), len = rnd(0.35, 0.55) * s;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.quadraticCurveTo(0.22 * s, len * 0.45, 0, len); shape.quadraticCurveTo(-0.22 * s, len * 0.45, 0, 0);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), i % 2 ? leaf : leaf2);
        m.position.set(x, y + rnd(0.05, 0.25) * s, z);
        m.rotation.set(0, a, 0);
        m.rotateX(-tilt);
        g.add(m);
      }
    }
    // Tall plants in the window corners.
    for (const [x, z] of [[X0 + 0.55, Z0 + 0.95], [X1 - 0.55, Z0 + 0.95]]) {
      cyl(0.22, 0.17, 0.45, smooth(0xe9e1d6, { roughness: 0.8 }), x, Y + 0.225, z, 16);
      cyl(0.02, 0.025, 0.9, smooth(0x4a3a28), x, Y + 0.85, z, 6);
      plant(x, Y + 0.6, z, 1.5);
      plant(x, Y + 1.1, z, 1.1);
    }
    // A hanging plant near the window.
    cyl(0.005, 0.005, 0.7, smooth(0x222222), CX - 3.6, Y + H - 0.35, Z0 + 1.0, 4);
    cyl(0.14, 0.1, 0.16, smooth(0xc77a4f, { roughness: 0.8 }), CX - 3.6, Y + H - 0.78, Z0 + 1.0, 12);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, len = rnd(0.4, 0.9);
      const vine = cyl(0.008, 0.008, len, smooth(0x3f7a45), CX - 3.6 + Math.cos(a) * 0.12, Y + H - 0.8 - len / 2, Z0 + 1.0 + Math.sin(a) * 0.12, 4);
      vine.rotation.z = rnd(-0.15, 0.15);
      for (let k = 0; k < 5; k++) ball(0.03, smooth(0x4c8a50), vine.position.x + rnd(-0.03, 0.03), Y + H - 0.85 - (k / 5) * len, vine.position.z + rnd(-0.03, 0.03)).scale.set(1.4, 0.5, 1);
    }

    // ---------- The living area ----------
    // A patterned rug.
    const rugTex = canvasTex(512, 340, (c, w, h) => {
      c.fillStyle = '#1e3f48'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d9c9a8'; c.lineWidth = 6; c.strokeRect(18, 18, w - 36, h - 36);
      c.lineWidth = 2; c.strokeRect(32, 32, w - 64, h - 64);
      c.fillStyle = '#c8645a';
      for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) { c.save(); c.translate(70 + i * 62, 75 + j * 63); c.rotate(Math.PI / 4); c.fillRect(-9, -9, 18, 18); c.restore(); }
      c.fillStyle = 'rgba(217,201,168,0.6)';
      for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) c.fillRect(66 + i * 62, 71 + j * 63, 8, 8);
    });
    plane(4.0, 2.7, new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }), CX + 0.6, Y + 0.006, CZ + 0.2, -Math.PI / 2);
    // The sofa: base, seat and back cushions, rounded arms, legs, pillows and a throw.
    const fabric = smooth(0x5d6672, { roughness: 0.95 });
    const fabric2 = smooth(0x6c7682, { roughness: 0.95 });
    const SX = CX + 0.6, SZ = CZ + 1.6;
    box(2.6, 0.22, 0.9, fabric, SX, Y + 0.2, SZ);
    for (const s of [-0.62, 0.62]) box(1.2, 0.14, 0.72, fabric2, SX + s, Y + 0.38, SZ - 0.06);
    for (const s of [-0.62, 0.62]) box(1.18, 0.5, 0.2, fabric2, SX + s, Y + 0.6, SZ + 0.33).rotation.x = -0.12;
    for (const s of [-1, 1]) { box(0.18, 0.34, 0.9, fabric, SX + s * 1.31, Y + 0.42, SZ); cyl(0.09, 0.09, 0.9, fabric, SX + s * 1.31, Y + 0.59, SZ, 12).rotation.x = Math.PI / 2; }
    for (const [dx, dz] of [[-1.2, -0.35], [1.2, -0.35], [-1.2, 0.35], [1.2, 0.35]]) cyl(0.025, 0.02, 0.1, smooth(0x3a2a1e), SX + dx, Y + 0.05, SZ + dz, 8);
    const pillow = (x, color, rz) => { const p = box(0.38, 0.36, 0.12, smooth(color, { roughness: 1 }), x, Y + 0.62, SZ + 0.18); p.rotation.set(-0.25, 0, rz); };
    pillow(SX - 1.0, 0x39c5bb, 0.15); pillow(SX + 1.0, 0xd97aa0, -0.12); pillow(SX + 0.7, 0xe9dcc6, 0.08);
    const throwB = box(0.7, 0.04, 0.85, smooth(0xc9a46a, { roughness: 1 }), SX - 0.85, Y + 0.47, SZ - 0.02); throwB.rotation.z = 0.04;
    box(0.7, 0.3, 0.04, smooth(0xc9a46a, { roughness: 1 }), SX - 0.85, Y + 0.3, SZ - 0.44);
    // Coffee table: walnut top on black legs, with mugs, a book, a candle and a tiny plant.
    const TX = CX + 0.6, TZ = CZ + 0.2;
    box(1.2, 0.05, 0.62, smooth(0x5b3a24, { roughness: 0.35 }), TX, Y + 0.4, TZ);
    for (const [dx, dz] of [[-0.55, -0.26], [0.55, -0.26], [-0.55, 0.26], [0.55, 0.26]]) cyl(0.018, 0.018, 0.38, smooth(0x111111, { metalness: 0.6 }), TX + dx, Y + 0.19, TZ + dz, 6);
    box(1.1, 0.02, 0.55, smooth(0x3a2a1e), TX, Y + 0.12, TZ);
    cyl(0.04, 0.035, 0.09, smooth(0x39c5bb), TX - 0.2, Y + 0.47, TZ - 0.05, 12);
    cyl(0.04, 0.035, 0.09, smooth(0xe9e2d4), TX + 0.15, Y + 0.47, TZ + 0.08, 12);
    box(0.22, 0.03, 0.16, smooth(0x7a2f3f), TX + 0.35, Y + 0.44, TZ - 0.12).rotation.y = 0.3;
    cyl(0.035, 0.035, 0.07, smooth(0xf2ead8), TX - 0.42, Y + 0.46, TZ + 0.15, 12);
    ball(0.012, glowM(0xffb347), TX - 0.42, Y + 0.51, TZ + 0.15).scale.set(1, 1.8, 1);
    light(0xffa040, 1.4, 2.2, TX - 0.42, Y + 0.6, TZ + 0.15);
    cyl(0.05, 0.04, 0.07, smooth(0xd8cdbd), TX + 0.45, Y + 0.46, TZ + 0.18, 10);
    plant(TX + 0.45, Y + 0.49, TZ + 0.18, 0.28);
    // Side table and lamp by the sofa.
    cyl(0.2, 0.2, 0.03, smooth(0x5b3a24, { roughness: 0.35 }), SX + 1.65, Y + 0.52, SZ, 20);
    cyl(0.02, 0.02, 0.5, smooth(0x111111, { metalness: 0.6 }), SX + 1.65, Y + 0.26, SZ, 6);
    cyl(0.14, 0.14, 0.02, smooth(0x111111), SX + 1.65, Y + 0.01, SZ, 16);
    cyl(0.04, 0.06, 0.18, smooth(0xd8c3a0), SX + 1.65, Y + 0.63, SZ, 12);
    cyl(0.1, 0.15, 0.17, glowM(0xffdcae), SX + 1.65, Y + 0.8, SZ, 16);
    light(0xffc890, 3.5, 4, SX + 1.65, Y + 0.85, SZ);

    // ---------- The keyboard corner (left wall) ----------
    const KX = X0 + 1.2, KZ = CZ + 0.8;
    box(0.35, 0.09, 1.3, smooth(0x111214, { roughness: 0.4 }), KX, Y + 0.82, KZ);
    const keysTex = canvasTex(64, 512, (c, w, h) => {
      c.fillStyle = '#f2f0ea'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#999'; for (let i = 0; i < 52; i++) c.fillRect(0, i * h / 52, w, 1);
      c.fillStyle = '#111'; for (let i = 0; i < 52; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) c.fillRect(0, i * h / 52 + h / 104, w * 0.62, h / 80);
    });
    plane(0.16, 1.2, new THREE.MeshStandardMaterial({ map: keysTex, roughness: 0.4 }), KX + 0.08, Y + 0.868, KZ, -Math.PI / 2);
    for (const s of [-1, 1]) { const leg = box(0.04, 0.85, 0.04, smooth(0x222222, { metalness: 0.5 }), KX, Y + 0.42, KZ + s * 0.35); leg.rotation.x = s * 0.4; }
    cyl(0.17, 0.17, 0.06, smooth(0x2a2420), KX + 0.55, Y + 0.48, KZ, 16);
    cyl(0.03, 0.03, 0.45, smooth(0x111111, { metalness: 0.6 }), KX + 0.55, Y + 0.23, KZ, 6);
    box(0.25, 0.32, 0.02, smooth(0xf2ead8), KX + 0.05, Y + 1.05, KZ - 0.25).rotation.set(0, Math.PI / 2, -0.2);   // sheet music
    // An arc floor lamp in the corner.
    cyl(0.17, 0.17, 0.03, smooth(0x111111, { metalness: 0.7 }), X0 + 0.5, Y + 0.015, Z1 - 0.5, 20);
    const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(X0 + 0.5, Y, Z1 - 0.5), new THREE.Vector3(X0 + 0.5, Y + 2.6, Z1 - 0.5), new THREE.Vector3(X0 + 1.4, Y + 2.0, Z1 - 1.3)), 24, 0.015, 6), smooth(0x111111, { metalness: 0.7 }));
    g.add(arc);
    const shade = cyl(0.06, 0.2, 0.2, smooth(0x111111, { metalness: 0.6, side: THREE.DoubleSide }), X0 + 1.4, Y + 1.92, Z1 - 1.3, 20);
    ball(0.06, glowM(0xffe2b0), X0 + 1.4, Y + 1.86, Z1 - 1.3);

    // ---------- The front door (left wall) ----------
    const FZ = Z0 + 2.0;
    box(0.06, 2.1, 0.95, smooth(0x2a221c, { roughness: 0.5 }), X0 + 0.03, Y + 1.05, FZ);
    for (const [y, h] of [[0.55, 0.7], [1.45, 0.75]]) box(0.015, h, 0.7, smooth(0x231c17, { roughness: 0.5 }), X0 + 0.065, Y + y, FZ);
    box(0.05, 2.22, 0.06, trimMat, X0 + 0.04, Y + 1.11, FZ - 0.5);
    box(0.05, 2.22, 0.06, trimMat, X0 + 0.04, Y + 1.11, FZ + 0.5);
    box(0.05, 0.06, 1.06, trimMat, X0 + 0.04, Y + 2.2, FZ);
    const handle = box(0.03, 0.03, 0.14, smooth(0xc9b27a, { metalness: 0.9, roughness: 0.25 }), X0 + 0.1, Y + 1.0, FZ - 0.33);
    ball(0.012, smooth(0x111111), X0 + 0.07, Y + 1.55, FZ);
    plane(0.8, 0.5, new THREE.MeshStandardMaterial({ map: canvasTex(160, 100, (c, w, h) => { c.fillStyle = '#6b5440'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8dcc4'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('hello', w / 2, 62); }), roughness: 1 }), X0 + 0.5, Y + 0.005, FZ, -Math.PI / 2, -Math.PI / 2);
    // Hooks by the door: a yellow scarf and a tote bag; shoes on a little rack.
    box(0.03, 0.06, 0.5, trimMat, X0 + 0.02, Y + 1.65, Z0 + 1.0);
    for (const dz of [-0.15, 0.1]) cyl(0.008, 0.008, 0.08, smooth(0xc9b27a, { metalness: 0.9 }), X0 + 0.07, Y + 1.63, Z0 + 1.0 + dz, 6).rotation.z = Math.PI / 2;
    box(0.04, 0.7, 0.16, smooth(0xf2c84b, { roughness: 1 }), X0 + 0.09, Y + 1.3, Z0 + 0.85);
    box(0.06, 0.45, 0.32, smooth(0xd9cdb8, { roughness: 1 }), X0 + 0.1, Y + 1.38, Z0 + 1.1);
    for (const dz of [-0.12, 0.12]) box(0.28, 0.08, 0.1, smooth(dz < 0 ? 0xeeeeee : 0x2d2d33), X0 + 0.25, Y + 0.04, Z0 + 1.25 + dz);

    // ---------- The kitchen (right wall) ----------
    const KC = X1 - 0.33;
    const cab = smooth(0x24343a, { roughness: 0.55 });
    const top = smooth(0xd9d4cc, { roughness: 0.25 });
    const brass = smooth(0xc9a46a, { metalness: 0.9, roughness: 0.3 });
    const k0 = CZ + 0.05, k1 = Z1 - 0.75;
    box(0.62, 0.86, k1 - k0, cab, KC, Y + 0.43, (k0 + k1) / 2);
    box(0.68, 0.04, k1 - k0 + 0.04, top, KC - 0.02, Y + 0.88, (k0 + k1) / 2);
    for (let z = k0 + 0.3; z < k1; z += 0.6) {
      box(0.012, 0.74, 0.56, smooth(0x2a3d44, { roughness: 0.5 }), KC - 0.315, Y + 0.44, z);
      box(0.02, 0.012, 0.18, brass, KC - 0.33, Y + 0.78, z);
    }
    // Tiled backsplash, upper cabinets, and a warm strip of light under them.
    const tilesTex = tile(canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#8a8178'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { c.fillStyle = `hsl(40, 20%, ${88 + Math.random() * 6}%)`; c.fillRect(k * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); }
    }), (k1 - k0) / 1.0, 0.7);
    plane(k1 - k0, 0.7, new THREE.MeshStandardMaterial({ map: tilesTex, roughness: 0.3 }), X1 - 0.005, Y + 1.25, (k0 + k1) / 2, 0, -Math.PI / 2);
    box(0.36, 0.7, k1 - k0, cab, X1 - 0.18, Y + 1.98, (k0 + k1) / 2);
    for (let z = k0 + 0.3; z < k1; z += 0.6) box(0.012, 0.62, 0.56, smooth(0x2a3d44, { roughness: 0.5 }), X1 - 0.365, Y + 1.98, z);
    for (let z = k0 + 0.3; z < k1; z += 0.6) box(0.02, 0.12, 0.012, brass, X1 - 0.38, Y + 1.75, z + 0.2);
    box(0.02, 0.012, k1 - k0 - 0.1, glowM(0xc9a070), X1 - 0.3, Y + 1.62, (k0 + k1) / 2);
    light(0xffd2a0, 1.3, 3, X1 - 0.6, Y + 1.5, (k0 + k1) / 2);
    // Sink and tap, hob and hood.
    box(0.4, 0.02, 0.45, smooth(0x7d8288, { metalness: 0.7, roughness: 0.3 }), KC - 0.02, Y + 0.895, k0 + 0.55);
    const tap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 12, Math.PI), smooth(0xcfd3d8, { metalness: 0.9, roughness: 0.2 }));
    tap.position.set(X1 - 0.12, Y + 0.95, k0 + 0.55); tap.rotation.y = Math.PI / 2; g.add(tap);
    box(0.5, 0.012, 0.55, smooth(0x111111, { roughness: 0.15 }), KC - 0.02, Y + 0.906, k0 + 1.45);
    for (const [dx, dz] of [[-0.12, -0.13], [0.12, -0.13], [-0.12, 0.13], [0.12, 0.13]]) cyl(0.075, 0.075, 0.003, smooth(0x2a2a2a), KC - 0.02 + dx, Y + 0.914, k0 + 1.45 + dz, 16);
    box(0.5, 0.25, 0.65, smooth(0x2c3036, { metalness: 0.5 }), X1 - 0.25, Y + 1.85, k0 + 1.45);
    // Things on the counter: kettle, fruit bowl, knife block, coffee machine, herbs.
    cyl(0.08, 0.1, 0.2, smooth(0xe86a5a, { roughness: 0.3 }), KC, Y + 1.0, k0 + 1.1, 16);
    cyl(0.14, 0.08, 0.08, smooth(0xe9e1d6), KC - 0.05, Y + 0.94, k0 + 2.0, 16);
    for (const [c, dx, dz] of [[0xd84a3a, 0, 0], [0xf2c84b, 0.06, 0.05], [0xd84a3a, -0.05, 0.06], [0x7fbf4a, 0.03, -0.06]]) ball(0.045, smooth(c, { roughness: 0.4 }), KC - 0.05 + dx, Y + 1.0, k0 + 2.0 + dz);
    box(0.1, 0.22, 0.14, smooth(0x5b3a24), KC + 0.12, Y + 1.0, k0 + 0.15).rotation.z = -0.15;
    box(0.2, 0.32, 0.22, smooth(0x1b1c20, { metalness: 0.3 }), KC + 0.1, Y + 1.06, k1 - 0.2);
    for (let i = 0; i < 3; i++) { cyl(0.05, 0.04, 0.09, smooth(0xd8cdbd), KC + 0.15, Y + 0.95, k0 + 0.95 + i * 0.12 - 0.5, 10); plant(KC + 0.15, Y + 0.98, k0 + 0.95 + i * 0.12 - 0.5, 0.2); }
    // Fridge, with magnets and a photo.
    box(0.72, 1.95, 0.7, smooth(0xd6d9de, { metalness: 0.35, roughness: 0.35 }), KC + 0.0, Y + 0.975, Z1 - 0.4);
    box(0.02, 0.6, 0.03, smooth(0x888c92, { metalness: 0.8 }), KC - 0.37, Y + 1.3, Z1 - 0.62);
    for (const [y, z, c] of [[1.55, -0.3, 0x39c5bb], [1.2, -0.15, 0xd97aa0], [1.7, -0.5, 0xf2c84b]]) cyl(0.025, 0.025, 0.01, smooth(c), KC - 0.37, Y + y, Z1 - 0.4 + z, 10).rotation.z = Math.PI / 2;
    // Two stools at the counter.
    for (const dz of [0.7, 1.7]) {
      cyl(0.17, 0.17, 0.05, smooth(0x5b3a24, { roughness: 0.4 }), KC - 0.9, Y + 0.66, CZ + dz, 16);
      for (const a of [0, 2.1, 4.2]) { const l = cyl(0.015, 0.015, 0.68, smooth(0x111111, { metalness: 0.6 }), KC - 0.9 + Math.cos(a) * 0.1, Y + 0.32, CZ + dz + Math.sin(a) * 0.1, 6); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
    }
    // A pendant light over the counter.
    cyl(0.004, 0.004, 0.8, smooth(0x111111), KC - 0.9, Y + H - 0.4, CZ + 1.2, 4);
    cyl(0.05, 0.16, 0.2, smooth(0x1b1c20, { metalness: 0.5, side: THREE.DoubleSide }), KC - 0.9, Y + 2.1, CZ + 1.2, 16);
    ball(0.06, glowM(0xffd8a0), KC - 0.9, Y + 2.02, CZ + 1.2);

    // ---------- The dining nook (by the window, right) ----------
    const NX = X1 - 1.15, NZ = Z0 + 1.75;
    cyl(0.42, 0.42, 0.04, smooth(0xe9e1d6, { roughness: 0.3 }), NX, Y + 0.74, NZ, 28);
    cyl(0.04, 0.04, 0.72, smooth(0x111111, { metalness: 0.6 }), NX, Y + 0.36, NZ, 8);
    cyl(0.22, 0.22, 0.02, smooth(0x111111, { metalness: 0.6 }), NX, Y + 0.01, NZ, 16);
    cyl(0.05, 0.04, 0.12, smooth(0xf2ead8), NX, Y + 0.82, NZ, 10);
    for (let i = 0; i < 3; i++) { const st = cyl(0.004, 0.004, 0.2, smooth(0x3f7a45), NX, Y + 0.95, NZ, 4); st.rotation.z = (i - 1) * 0.3; ball(0.025, smooth([0xf2c84b, 0xd97aa0, 0xffffff][i]), NX + Math.sin((i - 1) * 0.3) * -0.1, Y + 1.04, NZ); }
    for (const a of [Math.PI * 0.75, Math.PI * 1.6]) {
      const cx = NX + Math.cos(a) * 0.62, cz = NZ + Math.sin(a) * 0.62;
      const chair = new THREE.Group(); chair.position.set(cx, Y, cz); chair.rotation.y = -a + Math.PI / 2; g.add(chair);
      const cm = maker(chair);
      cm.box(0.42, 0.04, 0.42, smooth(0x5b3a24, { roughness: 0.4 }), 0, 0.46, 0);
      cm.box(0.42, 0.36, 0.03, smooth(0x5b3a24, { roughness: 0.4 }), 0, 0.68, -0.2);
      for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) cm.cyl(0.015, 0.015, 0.46, smooth(0x111111), dx, 0.23, dz, 6);
    }
    cyl(0.004, 0.004, 1.1, smooth(0x111111), NX, Y + H - 0.55, NZ, 4);
    ball(0.17, new THREE.MeshStandardMaterial({ color: 0xffe9c8, emissive: 0xffd9a0, emissiveIntensity: 1.2, transparent: true, opacity: 0.92 }), NX, Y + 1.8, NZ);
    light(0xffd9a0, 3, 4, NX, Y + 1.7, NZ);

    // ---------- The back wall: bookshelf, desk, gallery, bedroom door ----------
    const BX = CX - 3.0;
    const wood = smooth(0x3a2a20, { roughness: 0.5 });
    box(1.4, 0.03, 0.32, wood, BX, Y + 1.9, Z1 - 0.16);
    for (let i = 0; i < 5; i++) box(1.4, 0.03, 0.32, wood, BX, Y + 0.02 + i * 0.46, Z1 - 0.16);
    for (const s of [-1, 1]) box(0.03, 1.92, 0.32, wood, BX + s * 0.7, Y + 0.96, Z1 - 0.16);
    box(1.4, 1.92, 0.01, smooth(0x2a1f18), BX, Y + 0.96, Z1 - 0.01);
    const spineColors = [0x8a3b3b, 0x2f5a6b, 0xd9c7a0, 0x3b6b4a, 0x6b4a7a, 0xc9a46a, 0x1d2a4a, 0xa85a3a, 0xe9e1d6];
    for (let sh = 0; sh < 4; sh++) {
      let x = BX - 0.66;
      const stop = sh === 1 ? BX + 0.1 : BX + 0.62;
      while (x < stop) {
        const bw = rnd(0.035, 0.07), bh = rnd(0.24, 0.36);
        const b = box(bw, bh, rnd(0.18, 0.24), smooth(spineColors[Math.floor(Math.random() * spineColors.length)], { roughness: 0.8 }), x + bw / 2, Y + 0.035 + sh * 0.46 + bh / 2, Z1 - 0.16);
        if (Math.random() < 0.08) { b.rotation.z = 0.25; x += 0.06; }
        x += bw + 0.004;
      }
      if (sh === 1) { for (let r = 0; r < 6; r++) box(0.31, 0.31, 0.005, smooth(spineColors[r], { roughness: 0.6 }), BX + 0.42, Y + 0.035 + 0.46 + 0.155, Z1 - 0.06 - r * 0.035); }
    }
    cyl(0.07, 0.06, 0.12, smooth(0xe9e1d6), BX + 0.4, Y + 1.43, Z1 - 0.16, 10); plant(BX + 0.4, Y + 1.48, Z1 - 0.16, 0.3);
    box(0.18, 0.22, 0.02, smooth(0x111111), BX - 0.35, Y + 1.5, Z1 - 0.08);
    box(0.14, 0.18, 0.005, smooth(0x7a8fa6), BX - 0.35, Y + 1.5, Z1 - 0.09);
    // The desk: monitor, keyboard, mouse, lamp, headphones, a mug, a chair.
    const DX = CX - 1.2, DZ = Z1 - 0.38;
    box(1.3, 0.04, 0.62, smooth(0x5b3a24, { roughness: 0.35 }), DX, Y + 0.74, DZ);
    for (const s of [-1, 1]) box(0.04, 0.72, 0.56, smooth(0x111111, { metalness: 0.6 }), DX + s * 0.6, Y + 0.36, DZ);
    box(0.64, 0.38, 0.025, smooth(0x0d0e10, { roughness: 0.3 }), DX, Y + 1.09, DZ + 0.16);
    const screenTex = canvasTex(512, 300, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0e2a3a'); gr.addColorStop(1, '#2a5f66');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.beginPath(); c.arc(w * 0.75, h * 0.3, 120, 0, 7); c.fill();
      c.fillStyle = '#7ff0e6'; c.font = 'bold 34px Consolas, monospace'; c.fillText('LUMEN OS', 26, 56);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '24px sans-serif';
      ['🛒  Shop', '💼  Work', '📦  Orders'].forEach((t, i) => c.fillText(t, 30, 120 + i * 46));
    });
    plane(0.6, 0.345, new THREE.MeshBasicMaterial({ map: screenTex }), DX, Y + 1.09, DZ + 0.145, 0, Math.PI);
    box(0.05, 0.16, 0.05, smooth(0x111111), DX, Y + 0.84, DZ + 0.17);
    box(0.22, 0.01, 0.14, smooth(0x111111), DX, Y + 0.765, DZ + 0.17);
    box(0.44, 0.018, 0.14, smooth(0x1b1c20), DX, Y + 0.77, DZ - 0.12);
    box(0.06, 0.018, 0.1, smooth(0xe9e1d6), DX + 0.33, Y + 0.77, DZ - 0.12);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16, Math.PI), smooth(0x39c5bb, { roughness: 0.5 }));
    torus.position.set(DX - 0.45, Y + 0.85, DZ - 0.05); torus.rotation.set(-Math.PI / 2, 0, 0.4); g.add(torus);
    cyl(0.035, 0.03, 0.09, smooth(0xd97aa0), DX + 0.5, Y + 0.81, DZ + 0.05, 12);
    // Desk lamp.
    cyl(0.07, 0.07, 0.02, smooth(0x111111), DX + 0.48, Y + 0.77, DZ + 0.2, 16);
    const arm = box(0.02, 0.4, 0.02, smooth(0x111111), DX + 0.48, Y + 0.97, DZ + 0.13); arm.rotation.x = -0.35;
    cyl(0.04, 0.08, 0.1, smooth(0x111111, { side: THREE.DoubleSide }), DX + 0.48, Y + 1.15, DZ + 0.02, 12).rotation.x = 0.6;
    ball(0.03, glowM(0xffe2b0), DX + 0.48, Y + 1.12, DZ + 0.0);
    light(0xffd9a0, 2, 2.5, DX + 0.45, Y + 1.0, DZ - 0.1);
    light(0x7fd8ff, 1.2, 2.5, DX, Y + 1.1, DZ - 0.3);
    // The chair.
    const chair = new THREE.Group(); chair.position.set(DX, Y, DZ - 0.55); g.add(chair);
    const cm = maker(chair);
    cm.cyl(0.24, 0.24, 0.08, smooth(0x2c3036, { roughness: 0.8 }), 0, 0.47, 0, 16);
    cm.box(0.42, 0.45, 0.06, smooth(0x2c3036, { roughness: 0.8 }), 0, 0.78, -0.2).rotation.x = 0.1;
    cm.cyl(0.03, 0.03, 0.4, smooth(0x111111, { metalness: 0.6 }), 0, 0.23, 0, 8);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cm.box(0.03, 0.03, 0.3, smooth(0x111111), Math.sin(a) * 0.14, 0.04, Math.cos(a) * 0.14).rotation.y = a; }
    // Gallery wall over the desk: three framed prints.
    const art = (w, h, draw, x, y) => {
      box(w + 0.05, h + 0.05, 0.03, smooth(0x111111), x, y, Z1 - 0.02);
      box(w - 0.02, h - 0.02, 0.005, smooth(0xf2ede4), x, y, Z1 - 0.036);
      plane(w - 0.1, h - 0.1, new THREE.MeshStandardMaterial({ map: canvasTex(256, Math.round(256 * h / w), draw), roughness: 0.8 }), x, y, Z1 - 0.04, 0, Math.PI);
    };
    art(0.62, 0.44, (c, w, h) => {      // the tower at night, with a tiny lit car
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16123a'); gr.addColorStop(1, '#5a3a6a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) { c.fillStyle = '#0a0a18'; const bh = rnd(20, 90); c.fillRect(i * 15, h - bh, 13, bh); }
      c.fillStyle = '#0a0a18'; c.fillRect(w / 2 - 16, 20, 32, h);
      c.fillStyle = '#7ff0e6'; c.fillRect(w / 2 + 16, 60, 6, 8);
      c.fillStyle = '#fff6c8'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, h - Math.random() * 80, 2, 2);
    }, DX - 0.15, Y + 2.05);
    art(0.3, 0.4, (c, w, h) => {       // the moon over water
      c.fillStyle = '#0f1d33'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f2ead8'; c.beginPath(); c.arc(w / 2, h * 0.32, 34, 0, 7); c.fill();
      c.fillStyle = '#1a2d4a'; c.fillRect(0, h * 0.62, w, h);
      c.fillStyle = 'rgba(242,234,216,0.5)'; for (let i = 0; i < 10; i++) c.fillRect(w / 2 - 30 + Math.random() * 20, h * 0.65 + i * 9, 40 - i * 2, 2);
    }, DX + 0.45, Y + 2.12);
    art(0.3, 0.3, (c, w, h) => {       // a teal leek, very serious
      c.fillStyle = '#f2ede4'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#39c5bb'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(70, 190); c.lineTo(190, 70); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 22; c.beginPath(); c.moveTo(70, 190); c.lineTo(110, 150); c.stroke();
      c.strokeStyle = '#3f7a45'; c.lineWidth = 10; for (const a of [-0.4, 0, 0.4]) { c.beginPath(); c.moveTo(190, 70); c.lineTo(190 + Math.cos(-0.8 + a) * 60, 70 + Math.sin(-0.8 + a) * 60); c.stroke(); }
    }, DX + 0.45, Y + 1.66);
    // The photo of the two of you (appears later in the story).
    const photo = box(0.3, 0.38, 0.03, smooth(0x111111), CX - 0.25, Y + 1.6, Z1 - 0.02);
    photo.visible = false;
    // The bedroom door, with warm light under it.
    const BDX = CX + 2.6;
    box(0.95, 2.1, 0.05, smooth(0x2a221c, { roughness: 0.5 }), BDX, Y + 1.05, Z1 - 0.03);
    for (const [y, h] of [[0.55, 0.7], [1.45, 0.75]]) box(0.7, h, 0.015, smooth(0x231c17, { roughness: 0.5 }), BDX, Y + y, Z1 - 0.06);
    box(0.06, 2.22, 0.05, trimMat, BDX - 0.5, Y + 1.11, Z1 - 0.03);
    box(0.06, 2.22, 0.05, trimMat, BDX + 0.5, Y + 1.11, Z1 - 0.03);
    box(1.06, 0.06, 0.05, trimMat, BDX, Y + 2.2, Z1 - 0.03);
    ball(0.035, smooth(0xc9b27a, { metalness: 0.9, roughness: 0.25 }), BDX - 0.35, Y + 1.0, Z1 - 0.09);
    box(0.85, 0.01, 0.12, glowM(0xffcf8f), BDX, Y + 0.005, Z1 - 0.1);

    // ---------- Things you can buy, hidden until they're delivered ----------
    const decor = {};
    const item = (id, build) => { const d = new THREE.Group(); d.visible = false; g.add(d); decor[id] = d; build(maker(d), d); };
    item('neon', (m) => {
      const tex = canvasTex(256, 128, (c, w, h) => {
        c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
        c.shadowColor = '#39c5bb'; c.shadowBlur = 18; c.fillStyle = '#9ffff5'; c.font = 'bold 72px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('ネギ ♡', w / 2, h / 2 + 4);
      });
      m.plane(1.0, 0.5, new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending }), X1 - 0.02, Y + 2.0, NZ, 0, -Math.PI / 2);
      m.light(0x39c5bb, 2.5, 4, X1 - 0.5, Y + 2.0, NZ);
    });
    item('fairy', (m) => m.bulbs([X0 + 0.2, Y + H - 0.12, Z0 + 0.12], [X1 - 0.2, Y + H - 0.12, Z0 + 0.12], 40, 0.18, glow(0xffe0a0)));
    item('plush', (m) => {
      m.cyl(0.07, 0.08, 0.36, smooth(0xf2f0e6), CX + 0.05, Y + 0.5, CZ + 1.55, 10).rotation.z = 1.1;
      for (const a of [-0.3, 0, 0.3]) { const l = m.cyl(0.02, 0.05, 0.3, smooth(0x4caf50), CX - 0.17, Y + 0.62, CZ + 1.55 + a * 0.2, 6); l.rotation.z = 1.1 + a; }
      m.ball(0.015, smooth(0x111111), CX + 0.17, Y + 0.58, CZ + 1.48);
      m.ball(0.015, smooth(0x111111), CX + 0.21, Y + 0.56, CZ + 1.5);
    });
    item('stars', (m, d) => {
      m.cyl(0.1, 0.12, 0.12, smooth(0x1d2a4a), TX + 0.1, Y + 0.48, TZ - 0.15, 10);
      m.ball(0.08, glow(0xbfd6ff), TX + 0.1, Y + 0.56, TZ - 0.15);
      const pts = [];
      for (let i = 0; i < 320; i++) pts.push(X0 + 0.3 + Math.random() * (W - 0.6), Y + H - 0.015, Z0 + 0.3 + Math.random() * (D - 0.6));
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      m.light(0x8fb0ff, 1.2, 6, CX, Y + 2.5, CZ);
      d.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.035 })));
    });
    item('tank', (m, d) => {
      m.box(0.5, 0.6, 0.4, smooth(0x1a1a1a), X0 + 0.32, Y + 0.3, CZ + 2.25);
      m.box(0.46, 0.4, 0.36, new THREE.MeshBasicMaterial({ color: 0x2f8fb0, transparent: true, opacity: 0.6 }), X0 + 0.32, Y + 0.82, CZ + 2.25);
      const fishes = [];
      for (let i = 0; i < 3; i++) fishes.push(m.ball(0.025, glow([0xff8a3a, 0xffd23a, 0xff5a8a][i]), X0 + 0.32, Y + 0.8, CZ + 2.25));
      d.userData.fish = fishes;
      m.light(0x4fc8ff, 1.2, 3, X0 + 0.5, Y + 0.9, CZ + 2.25);
    });
    item('cushion', (m) => { m.cyl(0.4, 0.42, 0.14, smooth(0xd97aa0, { roughness: 1 }), CX - 1.2, Y + 0.07, CZ - 0.3, 20); m.cyl(0.3, 0.3, 0.15, smooth(0xe9a1bd, { roughness: 1 }), CX - 1.2, Y + 0.08, CZ - 0.3, 20); });
    item('poster', (m) => {
      const tex = canvasTex(200, 280, (c, w, h) => {
        c.fillStyle = '#1b1430'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffcf6a'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center';
        c.fillText('GERALD', w / 2, 70); c.font = '18px Georgia, serif'; c.fillText('& his saw', w / 2, 98);
        c.strokeStyle = '#ffcf6a'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, 175, 45, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
        c.font = '14px sans-serif'; c.fillText('LIVE AT THE BLUE ROOM', w / 2, 255);
      });
      m.box(0.55, 0.75, 0.02, smooth(0x111111), CX + 1.2, Y + 1.65, Z1 - 0.02);
      m.plane(0.5, 0.7, new THREE.MeshBasicMaterial({ map: tex }), CX + 1.2, Y + 1.65, Z1 - 0.035, 0, Math.PI);
    });

    // ---------- Walking about ----------
    // The room's walls, and the furniture you can't walk through (x0, x1, z0, z1).
    const solid = [
      [X0, X1, Z0, Z0 + 0.52],                      // window ledge
      [SX - 1.42, SX + 1.42, SZ - 0.48, SZ + 0.46], // sofa
      [TX - 0.62, TX + 0.62, TZ - 0.33, TZ + 0.33], // coffee table
      [SX + 1.43, SX + 1.87, SZ - 0.22, SZ + 0.22], // side table
      [KX - 0.25, KX + 0.75, KZ - 0.7, KZ + 0.7],   // keyboard and stool
      [KC - 0.4, X1, k0 - 0.02, Z1],                // kitchen counter and fridge
      [KC - 1.1, KC - 0.7, CZ + 0.5, CZ + 1.9],     // stools
      [NX - 0.75, NX + 0.75, NZ - 0.75, NZ + 0.75], // dining table and chairs
      [BX - 0.72, BX + 0.72, Z1 - 0.34, Z1],        // bookshelf
      [DX - 0.68, DX + 0.68, DZ - 0.82, Z1],        // desk and chair
      [X0, X0 + 0.75, Z1 - 0.8, Z1],                // floor lamp
      [X0, X0 + 0.8, Z0, Z0 + 1.25],                // corner plant
      [X1 - 0.8, X1, Z0, Z0 + 1.25],                // corner plant
    ];
    const tankBox = [X0, X0 + 0.6, CZ + 2.0, CZ + 2.5];
    function canStand(x, z, r) {
      if (x < X0 + r || x > X1 - r || z < Z0 + r || z > Z1 - r) return false;
      for (const b of decor.tank.visible ? [...solid, tankBox] : solid) if (x > b[0] - r && x < b[1] + r && z > b[2] - r && z < b[3] + r) return false;
      return true;
    }
    return {
      group: g,
      photo,
      decor,
      canStand,
      floorY: Y,
      at: {
        computer: { x: DX, z: DZ - 0.95 },
        bed: { x: BDX, z: Z1 - 0.3 },
        door: { x: X0 + 0.3, z: FZ },
        window: { x: CX - 1.2, z: Z0 + 0.6 },
        keys: { x: KX + 0.3, z: KZ },
        start: { x: X0 + 1.0, z: FZ, yaw: -Math.PI / 2 },
        bedside: { x: BDX, z: Z1 - 1.3, yaw: Math.PI },
      },
      update(t) {
        if (decor.tank.visible) decor.tank.userData.fish.forEach((f, i) => { f.position.set(X0 + 0.32 + Math.sin(t * 0.7 + i * 2) * 0.17, Y + 0.72 + i * 0.08 + Math.sin(t * 1.3 + i) * 0.03, CZ + 2.25 + Math.cos(t * 0.5 + i * 2.3) * 0.13); });
      },
      spots: {
        window: { x: CX - 1.2, y: Y, z: Z0 + 0.9, yaw: 0 },
        couch: { x: CX + 2.5, y: Y, z: CZ + 0.6, yaw: Math.PI * 0.85 },
        desk: { x: DX + 0.9, y: Y, z: DZ - 0.8, yaw: Math.PI * 0.75 },
        keys: { x: KX + 0.95, y: Y, z: KZ, yaw: Math.PI / 2 },
        kitchen: { x: KC - 1.0, y: Y, z: CZ + 2.55, yaw: -Math.PI / 2 },
        sofa: { x: CX + 1.6, y: Y, z: CZ + 0.95, yaw: Math.PI },
        door: { x: CX + 2.6, y: Y, z: Z1 - 0.8, yaw: Math.PI },
      },
      shots: {
        room: { pos: [X1 - 0.9, Y + 1.65, Z1 - 0.5], look: [CX - 1.4, Y + 1.1, Z0 + 1.0] },
        window: { pos: [CX + 0.6, Y + 1.5, Z0 + 3.0], look: [CX - 1.2, Y + 1.3, Z0 + 0.6] },
        windowClose: { pos: [CX - 0.4, Y + 1.5, Z0 + 2.1], look: [CX - 1.2, Y + 1.35, Z0 + 0.85] },
        view: { pos: [CX + 0.2, Y + 1.5, Z0 + 2.4], look: [0, Y + 40, 0] },
        keys: { pos: [KX + 2.4, Y + 1.5, KZ - 0.9], look: [KX + 0.6, Y + 1.15, KZ] },
        kitchen: { pos: [KC - 3.0, Y + 1.6, CZ + 0.4], look: [KC - 0.8, Y + 1.15, CZ + 2.2] },
        sofa: { pos: [CX - 1.6, Y + 1.5, CZ - 1.0], look: [CX + 1.6, Y + 1.2, CZ + 0.6] },
        door: { pos: [CX - 0.5, Y + 1.6, CZ - 0.6], look: [CX + 2.6, Y + 1.2, Z1 - 0.8] },
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
