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
  function buildApartment(scene) {
    const g = new THREE.Group(); scene.add(g);
    const { box, cyl, ball, plane, light } = maker(g);
    const X0 = -92, X1 = -80, Z0 = 155.4, Z1 = 162.4, Y = 160, H = 3.0;   // window wall at Z0
    const W = X1 - X0, D = Z1 - Z0, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;
    const wall = mat(0x3b3532, { flatShading: false, roughness: 0.9 });
    const floor = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.55 });
    plane(W, D, floor, CX, Y, CZ, -Math.PI / 2);
    plane(W, D, mat(0x2a2624), CX, Y + H, CZ, Math.PI / 2);
    plane(W, H, wall, CX, Y + H / 2, Z1, 0, Math.PI);                         // back wall
    plane(D, H, wall, X0, Y + H / 2, CZ, 0, Math.PI / 2);
    plane(D, H, wall, X1, Y + H / 2, CZ, 0, -Math.PI / 2);
    // The window: floor-to-ceiling glass across the whole front, in four panes.
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xb6dcff, transparent: true, opacity: 0.06, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const gl = plane(W, H, glass, CX, Y + H / 2, Z0); gl.renderOrder = 1;
    const frame = mat(0x15161a, { metalness: 0.5 });
    for (let i = 0; i <= 4; i++) box(0.08, H, 0.1, frame, X0 + (i / 4) * W, Y + H / 2, Z0);
    box(W, 0.1, 0.12, frame, CX, Y + 0.05, Z0);
    box(W, 0.12, 0.12, frame, CX, Y + H - 0.06, Z0);
    // A low ledge along the window, with plants and a little record player.
    box(W - 0.4, 0.4, 0.4, mat(0x2a2522), CX, Y + 0.2, Z0 + 0.3);
    for (const x of [X0 + 0.7, X0 + 3.4, X1 - 1.2]) { cyl(0.18, 0.14, 0.28, mat(0xc8b8a4), x, Y + 0.54, Z0 + 0.3, 8); ball(0.28, mat(0x3c6b3e), x, Y + 0.85, Z0 + 0.3); }
    box(0.45, 0.1, 0.35, mat(0x2b2b2b), CX + 1.8, Y + 0.45, Z0 + 0.3);
    cyl(0.15, 0.15, 0.01, mat(0x0a0a0a), CX + 1.8, Y + 0.51, Z0 + 0.3, 16);
    // Rug, sofa facing the window, a low table with two mugs.
    plane(3.6, 2.4, mat(0x2f4f5a), CX + 0.6, Y + 0.01, CZ, -Math.PI / 2);
    const sofa = mat(0x6a6f7a);
    box(2.6, 0.42, 0.9, sofa, CX + 0.6, Y + 0.21, CZ + 1.6);
    box(2.6, 0.5, 0.2, sofa, CX + 0.6, Y + 0.55, CZ + 1.98);
    for (const s of [-1, 1]) box(0.2, 0.25, 0.9, sofa, CX + 0.6 + s * 1.3, Y + 0.55, CZ + 1.6);
    box(1.1, 0.06, 0.6, mat(0x6b4a32), CX + 0.6, Y + 0.38, CZ + 0.2);
    for (const s of [-1, 1]) box(0.06, 0.36, 0.5, mat(0x3b2a1e), CX + 0.6 + s * 0.45, Y + 0.18, CZ + 0.2);
    cyl(0.04, 0.04, 0.09, mat(0x39c5bb), CX + 0.4, Y + 0.45, CZ + 0.2, 8);
    cyl(0.04, 0.04, 0.09, mat(0xe9e2d4), CX + 0.75, Y + 0.45, CZ + 0.25, 8);
    // Keyboard on a stand, by the left wall.
    const KX = X0 + 1.2, KZ = CZ + 0.8;
    box(1.3, 0.1, 0.35, mat(0x111214), KX, Y + 0.82, KZ).rotation.y = Math.PI / 2;
    plane(0.3, 1.2, new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#eee'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; for (let i = 0; i < 26; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) c.fillRect(0, i * h / 26 + 3, w * 0.6, h / 40); }) }), KX, Y + 0.875, KZ, -Math.PI / 2, 0).rotation.z = 0;
    for (const s of [-1, 1]) box(0.04, 0.8, 0.04, mat(0x222222), KX + s * 0.12, Y + 0.4, KZ + s * 0.4);
    // Kitchen along the right wall: counter, fridge, a pendant light, two stools.
    const KC = X1 - 0.4;
    box(0.65, 0.9, 3.0, mat(0x2c3036), KC, Y + 0.45, CZ + 1.6);
    box(0.7, 0.05, 3.05, mat(0xd9d4cc), KC, Y + 0.92, CZ + 1.6);
    box(0.7, 1.9, 0.7, mat(0xc9ccd2, { metalness: 0.4 }), KC, Y + 0.95, Z1 - 0.4);
    cyl(0.05, 0.12, 0.25, mat(0x222222), KC - 0.9, Y + 2.2, CZ + 1.2, 8);
    ball(0.07, glow(0xffd8a0), KC - 0.9, Y + 2.06, CZ + 1.2);
    for (const dz of [0.7, 1.7]) { cyl(0.17, 0.17, 0.05, mat(0x3a2a20), KC - 0.9, Y + 0.65, CZ + dz, 10); cyl(0.03, 0.03, 0.63, mat(0x222222), KC - 0.9, Y + 0.32, CZ + dz, 6); }
    // Bookshelf on the back wall, a doorway to the bedroom, photos.
    box(1.4, 1.9, 0.3, mat(0x3a2a20), CX - 3.0, Y + 0.95, Z1 - 0.16);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 7; k++) box(0.08 + Math.random() * 0.06, 0.28, 0.2, mat(new THREE.Color().setHSL(Math.random(), 0.35, 0.35).getHex()), CX - 3.55 + k * 0.17, Y + 0.32 + i * 0.45, Z1 - 0.2);
    box(0.95, 2.1, 0.05, mat(0x1d1b1a), CX + 2.6, Y + 1.05, Z1 - 0.03);
    const photo = box(0.35, 0.45, 0.03, mat(0x111111), CX - 0.6, Y + 1.7, Z1 - 0.02);
    photo.visible = false;   // appears once you've lived together a while
    // A floor lamp in the corner and the pendant over the kitchen: warm, low light.
    cyl(0.03, 0.03, 1.6, mat(0x222222), X0 + 0.5, Y + 0.8, Z1 - 0.5, 6);
    cyl(0.14, 0.24, 0.3, glow(0xffd9a6), X0 + 0.5, Y + 1.7, Z1 - 0.5, 10);
    light(0xffc890, 10, 11, X0 + 0.8, Y + 1.8, Z1 - 0.8);
    light(0xffd2a0, 6, 7, KC - 0.9, Y + 2.0, CZ + 1.2);
    light(0xffe2c0, 5, 12, CX + 0.5, Y + 2.7, CZ + 0.5);     // soft overall light from the ceiling
    light(0x9fb4ff, 3, 8, CX, Y + 1.6, Z0 + 0.6);

    // A desk with your computer, against the back wall. The screen glows.
    const DX = CX - 1.2, DZ = Z1 - 0.38;
    box(1.3, 0.05, 0.6, mat(0x3a2a20), DX, Y + 0.74, DZ);
    for (const [ox, oz] of [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]]) box(0.04, 0.74, 0.04, mat(0x222222), DX + ox, Y + 0.37, DZ + oz);
    box(0.62, 0.38, 0.03, mat(0x111214), DX, Y + 1.08, DZ + 0.15);
    const screenTex = canvasTex(256, 160, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0e2a3a'); gr.addColorStop(1, '#1d4f57');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#7ff0e6'; c.font = 'bold 22px Consolas, monospace'; c.fillText('LUMEN OS', 14, 34);
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '14px sans-serif';
      ['🛒  Shop', '💼  Work', '📦  Orders'].forEach((t, i) => c.fillText(t, 18, 70 + i * 26));
    });
    plane(0.58, 0.34, new THREE.MeshBasicMaterial({ map: screenTex }), DX, Y + 1.08, DZ + 0.13, 0, Math.PI);
    box(0.08, 0.16, 0.08, mat(0x111214), DX, Y + 0.84, DZ + 0.17);
    box(0.42, 0.02, 0.14, mat(0x1b1c20), DX, Y + 0.775, DZ - 0.1);
    cyl(0.2, 0.22, 0.45, mat(0x2c3036), DX, Y + 0.23, DZ - 0.55, 10);
    light(0x7fd8ff, 1.5, 3, DX, Y + 1.1, DZ - 0.3);
    // The front door, on the left wall near the window.
    const FZ = Z0 + 2.0;
    box(0.06, 2.1, 0.95, mat(0x24201d), X0 + 0.03, Y + 1.05, FZ);
    ball(0.035, mat(0xc9b27a, { metalness: 0.8 }), X0 + 0.09, Y + 1.0, FZ - 0.35);
    plane(0.75, 0.5, mat(0x3a2f2a), X0 + 0.5, Y + 0.005, FZ, -Math.PI / 2);   // doormat

    // ---------- Things you can buy, hidden until they're delivered ----------
    const decor = {};
    const item = (id, build) => { const d = new THREE.Group(); d.visible = false; g.add(d); decor[id] = d; build(maker(d), d); };
    item('neon', (m) => {
      const tex = canvasTex(256, 128, (c, w, h) => {
        c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
        c.shadowColor = '#39c5bb'; c.shadowBlur = 18; c.fillStyle = '#9ffff5'; c.font = 'bold 72px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('ネギ ♡', w / 2, h / 2 + 4);
      });
      m.plane(1.0, 0.5, new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending }), X1 - 0.02, Y + 1.9, Z0 + 1.7, 0, -Math.PI / 2);
      m.light(0x39c5bb, 2.5, 4, X1 - 0.5, Y + 1.9, Z0 + 1.7);
    });
    item('fairy', (m) => m.bulbs([X0 + 0.2, Y + H - 0.12, Z0 + 0.12], [X1 - 0.2, Y + H - 0.12, Z0 + 0.12], 40, 0.18, glow(0xffe0a0)));
    item('plush', (m) => {
      m.cyl(0.07, 0.08, 0.36, mat(0xf2f0e6), CX + 0.0, Y + 0.6, CZ + 1.55, 10).rotation.z = 1.1;
      for (const a of [-0.3, 0, 0.3]) { const l = m.cyl(0.02, 0.05, 0.3, mat(0x4caf50), CX - 0.22, Y + 0.72, CZ + 1.55 + a * 0.2, 6); l.rotation.z = 1.1 + a; }
      m.ball(0.015, mat(0x111111), CX + 0.12, Y + 0.68, CZ + 1.48);
      m.ball(0.015, mat(0x111111), CX + 0.16, Y + 0.66, CZ + 1.5);
    });
    item('stars', (m) => {
      m.cyl(0.1, 0.12, 0.12, mat(0x1d2a4a), CX + 0.3, Y + 0.47, CZ + 0.2, 10);
      m.ball(0.08, glow(0xbfd6ff), CX + 0.3, Y + 0.55, CZ + 0.2);
      const pts = [];
      for (let i = 0; i < 260; i++) pts.push(X0 + 0.3 + Math.random() * (W - 0.6), Y + H - 0.015, Z0 + 0.3 + Math.random() * (D - 0.6));
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      m.light(0x8fb0ff, 1.2, 6, CX, Y + 2.5, CZ);
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.035 }));
      decor.stars.add(p);
    });
    item('tank', (m) => {
      m.box(0.5, 0.6, 0.4, mat(0x1a1a1a), X0 + 0.32, Y + 0.3, CZ + 2.25);
      m.box(0.46, 0.4, 0.36, new THREE.MeshBasicMaterial({ color: 0x2f8fb0, transparent: true, opacity: 0.6 }), X0 + 0.32, Y + 0.82, CZ + 2.25);
      const fishes = [];
      for (let i = 0; i < 3; i++) fishes.push(m.ball(0.025, glow([0xff8a3a, 0xffd23a, 0xff5a8a][i]), X0 + 0.32, Y + 0.8, CZ + 2.25));
      decor.tank.userData.fish = fishes;
      m.light(0x4fc8ff, 1.2, 3, X0 + 0.5, Y + 0.9, CZ + 2.25);
    });
    item('cushion', (m) => { m.cyl(0.4, 0.42, 0.14, mat(0xd97aa0), CX - 1.0, Y + 0.07, CZ - 0.3, 14); m.cyl(0.3, 0.3, 0.15, mat(0xe9a1bd), CX - 1.0, Y + 0.08, CZ - 0.3, 14); });
    item('poster', (m) => {
      const tex = canvasTex(200, 280, (c, w, h) => {
        c.fillStyle = '#1b1430'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffcf6a'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center';
        c.fillText('GERALD', w / 2, 70); c.font = '18px Georgia, serif'; c.fillText('& his saw', w / 2, 98);
        c.strokeStyle = '#ffcf6a'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, 175, 45, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
        c.font = '14px sans-serif'; c.fillText('LIVE AT THE BLUE ROOM', w / 2, 255);
      });
      m.plane(0.5, 0.7, new THREE.MeshBasicMaterial({ map: tex }), CX + 1.2, Y + 1.65, Z1 - 0.02, 0, Math.PI);
    });

    // ---------- Walking about ----------
    // The room's walls, and the furniture you can't walk through (x0, x1, z0, z1).
    const solid = [
      [X0, X1, Z0, Z0 + 0.5],                       // window ledge
      [CX - 0.8, CX + 2.0, CZ + 1.1, CZ + 2.1],     // sofa
      [CX + 0.0, CX + 1.2, CZ - 0.15, CZ + 0.55],   // low table
      [KX - 0.25, KX + 0.25, KZ - 0.7, KZ + 0.7],   // keyboard
      [KC - 0.4, X1, CZ + 0.05, Z1],                // kitchen counter and fridge
      [KC - 1.12, KC - 0.68, CZ + 0.5, CZ + 1.9],   // stools
      [CX - 3.75, CX - 2.25, Z1 - 0.35, Z1],        // bookshelf
      [DX - 0.7, DX + 0.7, DZ - 0.75, Z1],          // desk and chair
      [X0, X0 + 0.75, Z1 - 0.8, Z1],                // floor lamp
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
      // Where things are, for walking up to them.
      at: {
        computer: { x: DX, z: DZ - 0.75 },
        bed: { x: CX + 2.6, z: Z1 - 0.3 },
        door: { x: X0 + 0.3, z: FZ },
        window: { x: CX - 1.2, z: Z0 + 0.6 },
        keys: { x: KX, z: KZ },
        start: { x: X0 + 1.0, z: FZ, yaw: -Math.PI / 2 },
        bedside: { x: CX + 2.6, z: Z1 - 1.3, yaw: Math.PI },
      },
      update(t) {
        if (decor.tank.visible) decor.tank.userData.fish.forEach((f, i) => { f.position.set(X0 + 0.32 + Math.sin(t * 0.7 + i * 2) * 0.17, Y + 0.72 + i * 0.08 + Math.sin(t * 1.3 + i) * 0.03, CZ + 2.25 + Math.cos(t * 0.5 + i * 2.3) * 0.13); });
      },
      spots: {
        window: { x: CX - 1.2, y: Y, z: Z0 + 0.85, yaw: 0 },
        couch: { x: CX + 1.9, y: Y, z: CZ + 0.75, yaw: Math.PI * 0.85 },
        desk: { x: DX + 0.9, y: Y, z: DZ - 0.7, yaw: Math.PI * 0.75 },
        keys: { x: KX + 0.55, y: Y, z: KZ, yaw: Math.PI / 2 },
        kitchen: { x: KC - 0.95, y: Y, z: CZ + 2.6, yaw: -Math.PI / 2 },
        sofa: { x: CX + 1.6, y: Y, z: CZ + 0.6, yaw: Math.PI },
        door: { x: CX + 2.6, y: Y, z: Z1 - 0.8, yaw: Math.PI },
      },
      shots: {
        room: { pos: [X1 - 0.6, Y + 1.65, Z1 - 0.5], look: [CX - 1.4, Y + 1.1, Z0 + 1.0] },
        window: { pos: [CX + 0.6, Y + 1.5, Z0 + 3.0], look: [CX - 1.2, Y + 1.3, Z0 + 0.6] },
        windowClose: { pos: [CX - 0.4, Y + 1.5, Z0 + 2.1], look: [CX - 1.2, Y + 1.35, Z0 + 0.85] },
        view: { pos: [CX + 0.2, Y + 1.5, Z0 + 2.4], look: [0, Y + 40, 0] },
        keys: { pos: [KX + 2.3, Y + 1.5, KZ - 0.9], look: [KX + 0.4, Y + 1.15, KZ] },
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
