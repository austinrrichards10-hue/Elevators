// The city: sky, moon, far mountains, a grid of towers, streets, traffic, and the tall tower the
// elevator rides down the outside of.
//
// It's drawn two ways. From up high (the elevator, your window) you see the whole skyline. Down on
// the street, the part of town you walk round is dressed in detail: asphalt roads with lane
// markings and zebra crossings, raised pavements, shopfronts with awnings and hanging signs,
// utility poles strung with wires, street trees, vending machines, traffic lights and cars that
// stop for them (and for you). The buildings are cut into chunks so only what's in view is drawn,
// and at street level the far city is dropped into the haze.
const City = (() => {
  const TOWER_HALF = 17;      // the tower is 34 m square
  const TOWER_TOP = 320;
  // The landing on floor 70 where the ride starts: a room inside the tower behind the car's
  // doors. Floor height, half-width, depth back from the tower face, height, doorway half-width.
  const LANDING = { y: 280, halfW: 5, depth: 8, h: 3.6, door: 0.6 };
  // Blocks kept for buildings the story uses: Miku's old walk-up (she goes up on its roof) and
  // the tower your apartment is in, both in view of the elevator.
  const RESERVED = {
    '1,2': { w: 36, d: 30, h: 52, hue: 0.04, sat: 0.28, l: 0.42 },
    '-1,2': { w: 34, d: 34, h: 176, hue: 0.6, sat: 0.06, l: 0.55 },
    '-1,1': { shops: true },        // the shopping street (built in src/street.js)
  };
  const BLOCK = 86;           // block pitch, road centre to road centre
  const ROAD = 16;
  const EXTENT = 1450;        // city reaches this far from the tower
  const FLOOR_H = 4;          // window texture: one floor every 4 m...
  const WIN_W = 3;            // ...and one window every 3 m
  const TEX_CELLS = 16;
  const SLAB = 0.15;          // kerb height: blocks are raised pavement, roads are asphalt
  const DIST = { x: -40, z: 90, r: 430 };   // the part of town you walk round, dressed in detail
  const CHUNK = BLOCK * 4;
  const ROOF_UV = [0.5 / TEX_CELLS, 1 - 0.5 / TEX_CELLS];

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
  // The ground height: the pavement on every block, the road between them.
  const offRoad = (v) => { const f = (((v - BLOCK / 2) % BLOCK) + BLOCK) % BLOCK; return Math.min(f, BLOCK - f) > ROAD / 2; };
  const groundAt = (x, z) => (offRoad(x) && offRoad(z) ? SLAB : 0);

  // Small seeded randoms so the city is the same every time. `rand` lays out the skyline;
  // `rand2` dresses the streets (kept separate so the layout never moves).
  let seed = 1337;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  let seed2 = 4242;
  const rand2 = () => { seed2 = (seed2 * 16807) % 2147483647; return (seed2 - 1) / 2147483646; };

  function canvasTex(w, h, draw, repeat = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const speckle = (g, w, h, n, colors, size = 1) => {
    for (let i = 0; i < n; i++) { g.fillStyle = colors[(Math.random() * colors.length) | 0]; g.fillRect(Math.random() * w, Math.random() * h, size, size); }
  };

  // ---------- Textures ----------
  const TS = 512, CELL = TS / TEX_CELLS;
  const winRect = (col, row) => [col * CELL + 6, row * CELL + 8, CELL - 12, CELL - 14];
  // Lit windows at night: the emissive map. Whole floors tend to be on or off together.
  function windowTexture(litChance) {
    return canvasTex(TS, TS, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, TS, TS);
      const palette = ['#ffd9a0', '#ffc77a', '#ffe9c4', '#cfe6ff', '#e9f4ff', '#9ff4ea', '#ffb36b'];
      for (let row = 1; row < TEX_CELLS; row++) {          // row 0 stays dark: roofs sample it
        const floorLit = rand() < 0.5 ? litChance * 1.6 : litChance * 0.35;
        const tone = palette[Math.floor(rand() * palette.length)];
        for (let col = 0; col < TEX_CELLS; col++) {
          if (rand() > floorLit) { g.fillStyle = '#000'; }
          else g.fillStyle = rand() < 0.75 ? tone : palette[Math.floor(rand() * palette.length)];
          g.globalAlpha = 0.55 + rand() * 0.45;
          g.fillRect(...winRect(col, row));
        }
      }
      g.globalAlpha = 1;
    });
  }
  // The buildings by daylight: pale walls, window frames, glass catching the sky, curtains.
  function facadeTexture() {
    return canvasTex(TS, TS, (g) => {
      g.fillStyle = '#dcd8d0'; g.fillRect(0, 0, TS, TS);
      speckle(g, TS, TS, 9000, ['#d2cdc4', '#e6e2da', '#c9c4ba', '#d8d3ca'], 2);
      g.fillStyle = '#8f8d89'; g.fillRect(0, 0, TS, CELL);            // row 0: the roof
      speckle(g, TS, CELL, 900, ['#85837f', '#9a9894', '#7d7b77'], 2);
      for (let row = 1; row < TEX_CELLS; row++) {
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, row * CELL + CELL - 4, TS, 4);   // floor line
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, row * CELL + CELL - 6, TS, 2);
        for (let col = 0; col < TEX_CELLS; col++) {
          const [x, y, w, h] = winRect(col, row);
          g.fillStyle = '#4c535c'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
          const s = 0.7 + Math.random() * 0.55;
          const grad = g.createLinearGradient(0, y, 0, y + h);
          grad.addColorStop(0, `rgb(${(150 * s) | 0},${(175 * s) | 0},${(200 * s) | 0})`);
          grad.addColorStop(0.55, `rgb(${(78 * s) | 0},${(94 * s) | 0},${(112 * s) | 0})`);
          grad.addColorStop(1, `rgb(${(52 * s) | 0},${(62 * s) | 0},${(76 * s) | 0})`);
          g.fillStyle = grad; g.fillRect(x, y, w, h);
          if (Math.random() < 0.3) { g.fillStyle = 'rgba(236,230,214,0.55)'; g.fillRect(x, y, w * (0.25 + Math.random() * 0.5), h); }
          g.fillStyle = '#4c535c'; g.fillRect(x + w / 2 - 1, y, 2, h);       // a mullion
        }
      }
    });
  }
  function asphalt(g, w, h) {
    g.fillStyle = '#3c3d41'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, (w * h) / 5, ['#36373b', '#434448', '#303135', '#4b4c50', '#3f4044'], 2);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 8 + Math.random() * 25, Math.random() * 3, 0, 7); g.fill();
    }
  }
  // A 16 m wide road, 32 m of it: white edge lines, a dashed centre line, worn wheel tracks.
  const roadTexture = () => canvasTex(256, 512, (g, w, h) => {
    asphalt(g, w, h);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (const c of [128 - 51, 128 + 51]) for (const o of [-13, 13]) g.fillRect(c + o - 6, 0, 12, h);
    g.fillStyle = '#e4e3dc';
    g.fillRect(12, 0, 3, h); g.fillRect(w - 15, 0, 3, h);
    for (let y = 0; y < h; y += 256) g.fillRect(126, y + 32, 4, 128);
    speckle(g, w, h, 1800, ['#3c3d41', '#45464a'], 2);   // wear on the paint
  });
  const zebraTexture = () => canvasTex(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#e8e7e0';
    for (let x = 18; x < w - 14; x += 14) g.fillRect(x, 3, 7, h - 6);
    g.globalCompositeOperation = 'destination-out';
    speckle(g, w, h, 900, ['#000'], 2);
    g.globalCompositeOperation = 'source-over';
  });
  // Pavement: half-metre slabs in a few greys, with grout between.
  const pavingTexture = () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7e7b75'; g.fillRect(0, 0, w, h);
    const tones = ['#b2aea6', '#aaa69e', '#bab6ae', '#a39f97', '#b6b1a8'];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = tones[(Math.random() * tones.length) | 0];
      g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
    speckle(g, w, h, 5000, ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.08)'], 2);
  });
  const lawnTexture = () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3d6a32'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 14000, ['#456f36', '#36602c', '#4c7a3a', '#2f5527', '#5a8644'], 2);
  });
  const graniteTexture = () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4b50'; g.fillRect(0, 0, w, h);
    const tones = ['#8a8b90', '#7f8086', '#94959a', '#77787e'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = tones[(Math.random() * 4) | 0]; g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62); }
    speckle(g, w, h, 7000, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.1)'], 1.5);
  });

  // Shopfronts: 4 rows (corner shops, little restaurants, office lobbies, shuttered fronts),
  // each 24 m of street, 4.5 m tall. Drawn twice: in colour, and with only the lit parts (glow).
  const SIGN_WORDS = ['コンビニ', 'ラーメン', '居酒屋', '薬局', '喫茶', '焼肉', '本屋', 'カラオケ', '寿司', 'ドラッグ', '花', 'パン', '中華', 'うどん', '酒', '服'];
  const SIGN_COLS = ['#d8402f', '#1f6fb8', '#e8a21f', '#2c8a4f', '#7a3fa0', '#d94f8a', '#1d1f26', '#c93a2a', '#0f7f86', '#f2c84b'];
  function drawStorefronts(g, lit) {
    let s = 77; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    g.fillStyle = lit ? '#000' : '#5a5a5e'; g.fillRect(0, 0, 1024, 768);
    const F = (glows, color, x, y, w, h) => { if (lit && !glows) return; g.fillStyle = color; g.fillRect(x, y, w, h); };
    const T = (glows, color, text, x, y, size) => { if (lit && !glows) return; g.fillStyle = color; g.font = `bold ${size}px "M PLUS Rounded 1c", "Yu Gothic", "Meiryo", sans-serif`; g.textBaseline = 'middle'; g.fillText(text, x, y); };
    for (let row = 0; row < 4; row++) for (let m = 0; m < 4; m++) {
      const x0 = m * 256, y0 = row * 192;
      const band = SIGN_COLS[(r() * SIGN_COLS.length) | 0], word = SIGN_WORDS[(r() * SIGN_WORDS.length) | 0];
      const warm = r() < 0.6, glass = warm ? '#ffe2b0' : '#e4f2ff';
      if (row === 0) {            // a little shop: sign band, big lit windows, a door
        F(false, '#2b2c30', x0, y0, 256, 192);
        F(true, band, x0 + 4, y0 + 6, 248, 34);
        T(true, '#ffffff', word, x0 + 14, y0 + 24, 24);
        F(true, '#ffffff', x0 + 4, y0 + 40, 248, 3);
        F(true, glass, x0 + 10, y0 + 50, 236, 120);
        for (let k = 0; k < 4; k++) F(false, 'rgba(40,40,46,0.55)', x0 + 16 + k * 58, y0 + 92 + (k % 2) * 8, 44, 70);
        for (let k = 0; k < 12; k++) F(true, SIGN_COLS[(r() * SIGN_COLS.length) | 0], x0 + 18 + r() * 220, y0 + 96 + r() * 60, 6, 9);
        F(false, '#1a1b1f', x0 + 106, y0 + 50, 4, 120); F(false, '#1a1b1f', x0 + 150, y0 + 50, 4, 120);
        F(false, '#1a1b1f', x0 + 8, y0 + 170, 240, 22);
      } else if (row === 1) {     // a restaurant: dark wood, noren curtain, a red lantern
        F(false, '#4a3222', x0, y0, 256, 192);
        for (let k = 0; k < 12; k++) F(false, 'rgba(0,0,0,0.18)', x0 + k * 22, y0, 2, 192);
        F(true, '#2a1a12', x0 + 10, y0 + 8, 236, 30); T(true, '#f3e2c8', word, x0 + 20, y0 + 24, 22);
        F(true, '#ffc98a', x0 + 20, y0 + 60, 70, 100); F(true, '#ffc98a', x0 + 166, y0 + 60, 70, 100);
        for (let k = 0; k < 3; k++) F(false, 'rgba(60,40,24,0.7)', x0 + 22 + k * 24, y0 + 60, 3, 100);
        F(true, '#ffdca8', x0 + 100, y0 + 50, 56, 142);
        const noren = r() < 0.5 ? '#1d2a4a' : '#7a1d1d';
        for (let k = 0; k < 4; k++) F(false, noren, x0 + 98 + k * 15, y0 + 48, 13, 52);
        T(false, '#f3ead8', word.slice(0, 1), x0 + 116, y0 + 72, 20);
        if (lit) { g.fillStyle = '#ff5a3a'; } else g.fillStyle = '#e04a2a';
        g.beginPath(); g.ellipse(x0 + 236, y0 + 80, 11, 16, 0, 0, 7); g.fill();
      } else if (row === 2) {     // an office lobby: tall glass, cool light, a name over the door
        F(false, '#33363c', x0, y0, 256, 192);
        F(true, lit ? '#71808f' : '#cfe0f0', x0 + 4, y0 + 18, 248, 174);
        for (let k = 0; k < 5; k++) F(false, '#2a2d33', x0 + 4 + k * 62, y0 + 18, 4, 174);
        F(false, '#2a2d33', x0, y0 + 96, 256, 3);
        F(false, 'rgba(70,80,94,0.5)', x0 + 30, y0 + 140, 60, 52);
        T(true, '#ffffff', ['LUMEN', 'KAIRO', 'HOSHI', 'AOI'][(r() * 4) | 0], x0 + 14, y0 + 9, 13);
      } else {                    // shuttered: corrugated steel, a small sign, maybe a lit side door
        F(false, '#8d9096', x0, y0, 256, 192);
        F(false, '#9fa2a8', x0 + 8, y0 + 40, 240, 152);
        for (let y = y0 + 40; y < y0 + 192; y += 6) F(false, 'rgba(0,0,0,0.16)', x0 + 8, y, 240, 2);
        F(true, band, x0 + 8, y0 + 8, 160, 26); T(true, '#ffffff', word, x0 + 16, y0 + 21, 18);
        if (r() < 0.5) F(true, '#ffe2b0', x0 + 196, y0 + 70, 44, 122);
        speckle(g, 0, 0, 0, ['#000']);
      }
    }
  }
  // Hanging vertical signs (kanban): 8 of them side by side in one texture.
  const KANBAN = ['カラオケ', 'ラーメン', '居酒屋', 'ホテル', '焼肉', '喫茶店', '薬局', '漫画'];
  const kanbanTexture = () => canvasTex(512, 512, (g) => {
    for (let i = 0; i < 8; i++) {
      const x0 = i * 64, bg = SIGN_COLS[i % SIGN_COLS.length];
      g.fillStyle = '#f4f2ea'; g.fillRect(x0, 0, 64, 512);
      g.fillStyle = bg; g.fillRect(x0 + 5, 5, 54, 502);
      g.fillStyle = i % 3 === 0 ? '#ffe9a0' : '#ffffff';
      g.font = 'bold 46px "M PLUS Rounded 1c", "Yu Gothic", "Meiryo", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...KANBAN[i]], step = Math.min(110, 470 / chars.length);
      chars.forEach((ch, k) => g.fillText(ch, x0 + 32, 256 - (chars.length - 1) * step / 2 + k * step));
    }
  }, false);
  const vendingTexture = () => canvasTex(128, 256, (g) => {
    g.fillStyle = '#eef0f2'; g.fillRect(0, 0, 128, 256);
    g.fillStyle = '#d8eefc'; g.fillRect(8, 10, 112, 132);
    const cans = ['#d84a3a', '#39c5bb', '#f2c84b', '#3a6ad8', '#2c2c2c', '#f08a2a', '#8a4ad8', '#5aa84a'];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) { g.fillStyle = cans[(r * 3 + k) % cans.length]; g.fillRect(13 + k * 15, 16 + r * 32, 10, 20); g.fillStyle = '#2a2a2a'; g.fillRect(13 + k * 15, 38 + r * 32, 10, 3); }
    g.fillStyle = '#1f6fb8'; g.fillRect(0, 146, 128, 14);
    g.fillStyle = '#2a2c30'; g.fillRect(14, 196, 100, 30);
    g.fillStyle = '#7ff0e6'; g.fillRect(94, 170, 18, 10);
  }, false);

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

  // ---------- Geometry helpers ----------
  // Collects boxes into one flat-shaded mesh. `box` gives window UVs measured in metres; `box2`
  // takes its own UVs: side(face, len, y0, y1) and top() each return four [u, v]s.
  function BoxBatch() {
    const pos = [], nor = [], uv = [], col = [];
    function quad(a, b, c, d, n, uvs, color) {
      for (const [p, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]]) {
        pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); uv.push(t[0], t[1]); col.push(color.r, color.g, color.b);
      }
    }
    function box2(cx, y0, cz, w, h, d, color, side, top) {
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], side(0, w, y0, y1), color);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], side(1, w, y0, y1), color);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], side(2, d, y0, y1), color);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], side(3, d, y0, y1), color);
      if (top) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], top(x0, x1, z0, z1), color);
    }
    function box(cx, y0, cz, w, h, d, color, uOff, vOff) {
      const su = 1 / (WIN_W * TEX_CELLS), sv = 1 / (FLOOR_H * TEX_CELLS);
      box2(cx, y0, cz, w, h, d, color, (f, len, a, b) => {
        const v0 = vOff + a * sv, v1 = vOff + b * sv;
        return [[uOff, v0], [uOff + len * su, v0], [uOff + len * su, v1], [uOff, v1]];
      }, () => [ROOF_UV, ROOF_UV, ROOF_UV, ROOF_UV]);
    }
    // A flat quad on the ground, from (x0, z0) to (x1, z1), with UVs at its four corners
    // (in the order (x0,z0), (x0,z1), (x1,z1), (x1,z0)).
    function flat(x0, z0, x1, z1, y, uvs) {
      quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0], uvs, WHITE);
    }
    function mesh(material) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeBoundingSphere();
      return new THREE.Mesh(g, material);
    }
    return { box, box2, flat, mesh, get empty() { return pos.length === 0; } };
  }
  const WHITE = new THREE.Color(1, 1, 1);
  const SOLID = () => [ROOF_UV, ROOF_UV, ROOF_UV, ROOF_UV];
  const ZERO = () => [[0, 0], [0, 0], [0, 0], [0, 0]];
  // Boxes sorted into chunks of the city, one mesh per chunk, so each is culled on its own.
  function Chunked() {
    const map = new Map();
    return {
      at(x, z) { const k = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK); if (!map.has(k)) map.set(k, BoxBatch()); return map.get(k); },
      build(parent, material, list) {
        for (const b of map.values()) {
          if (b.empty) continue;
          const m = b.mesh(material);
          m.userData.c = m.geometry.boundingSphere.center;
          parent.add(m); if (list) list.push(m);
        }
      },
    };
  }
  // Merges a few simple shapes, each with its own colour, into one geometry (for instancing).
  function shapes(list) {
    const parts = list.map(([geo, color, x = 0, y = 0, z = 0, ry = 0]) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
      const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      return g;
    });
    let n = 0; for (const p of parts) n += p.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const p of parts) { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); col.set(p.attributes.color.array, o * 3); o += p.attributes.position.count; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  const Box = (w, h, d, y = 0) => new THREE.BoxGeometry(w, h, d).translate(0, y, 0);
  const Cyl = (r0, r1, h, seg, y = 0) => new THREE.CylinderGeometry(r0, r1, h, seg).translate(0, y, 0);
  const Ico = (r, x, y, z) => new THREE.IcosahedronGeometry(r, 0).translate(x, y, z);
  // Instanced copies of one geometry: [x, y, z, ry, scale] each, with optional colour tints.
  function instanced(geo, mat, list, tints) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    list.forEach(([x, y, z, ry = 0, sc = 1], i) => {
      m.setMatrixAt(i, M.compose(p.set(x, y, z), q.setFromAxisAngle(up, ry), s.set(sc, sc, sc)));
      if (tints) m.setColorAt(i, tints[i]);
    });
    m.count = list.length;
    m.computeBoundingSphere && m.computeBoundingSphere();
    return m;
  }

  // ---------- Sky ----------
  // Sky dome with one colour per face, so the gradient itself looks faceted.
  function buildSky(scene) {
    const R = 3400;
    const geo = new THREE.IcosahedronGeometry(R, 3).toNonIndexed();
    const p = geo.attributes.position;
    const colors = [];
    const top = new THREE.Color(0x03050f), mid = new THREE.Color(0x0d1233), glow = new THREE.Color(0x3b1f4f), haze = new THREE.Color(0x6a3355);
    // Coloured per vertex by height, so the gradient is smooth.
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i += 3) {
      const jitter = (rand() - 0.5) * 0.006;
      for (let k = 0; k < 3; k++) {
        const h = p.getY(i + k) / R;
        if (h < 0.02) c.copy(haze).lerp(glow, Math.min(1, Math.max(0, (h + 0.05) / 0.07)));
        else if (h < 0.18) c.copy(glow).lerp(mid, (h - 0.02) / 0.16);
        else c.copy(mid).lerp(top, Math.min(1, (h - 0.18) / 0.5));
        c.offsetHSL(0, 0, jitter);
        colors.push(c.r, c.g, c.b);
      }
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
    for (let i = 0; i < p.count; i++) {
      const k = Math.min(1, Math.max(0, (p.getY(i) / R + 0.03) / 0.5));
      const a = dHaze.clone().lerp(dMid, Math.min(1, k * 2.2)).lerp(dTop, Math.max(0, k * 1.6 - 0.6));
      const b = sHaze.clone().lerp(sMid, Math.min(1, k * 2.5)).lerp(sTop, Math.max(0, k * 1.6 - 0.5));
      day.set([a.r, a.g, a.b], i * 3); dusk.set([b.r, b.g, b.b], i * 3);
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
    daylightRefs.mountains = mat;
  }

  function heightAt(x, z) {
    // Three downtown clusters; the main one straight out in front of the glass.
    const centres = [[60, 560, 340, 1.0], [-720, 260, 260, 0.75], [520, -620, 280, 0.6], [-380, -900, 220, 0.45]];
    let boost = 0;
    for (const [cx, cz, r, w] of centres) boost += w * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * r * r));
    const base = 8 + Math.pow(rand(), 1.8) * 34;
    return base + boost * Math.pow(rand(), 0.6) * 210;
  }

  // Building colours by day: concrete, white tile, warm brick, sand, grey glass.
  const PALETTE = [[0.08, 0.06, 0.78], [0.1, 0.1, 0.66], [0.04, 0.32, 0.46], [0.58, 0.08, 0.6], [0.6, 0.16, 0.42], [0.11, 0.2, 0.7], [0.0, 0.0, 0.82], [0.07, 0.14, 0.55], [0.55, 0.05, 0.5]];
  const chunkList = [];
  let dressing = null;
  const view = { street: null, cx: 1e9, cz: 1e9, px: 1e9, pz: 1e9, on: false };

  function build(scene) {
    const moonDir = buildSky(scene);
    buildMountains(scene);

    const hemi = new THREE.HemisphereLight(0x3a4a8a, 0x1a0f0a, 0.9);
    scene.add(hemi);
    const moonLight = new THREE.DirectionalLight(0x9fb0ff, 0.6);
    moonLight.position.copy(moonDir).multiplyScalar(100);
    scene.add(moonLight);
    Object.assign(daylightRefs, { scene, hemi, moonLight });

    // ---------- Ground: asphalt everywhere, roads with markings, raised pavements ----------
    const asphaltTex = canvasTex(512, 512, asphalt);
    const groundTex = asphaltTex.clone(); groundTex.needsUpdate = true; groundTex.repeat.set(7000 / 24, 7000 / 24);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshLambertMaterial({ map: groundTex }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const roadLines = [];
    for (let k = -Math.ceil(EXTENT / BLOCK); k <= Math.ceil(EXTENT / BLOCK); k++) roadLines.push(k * BLOCK + BLOCK / 2);
    const span = EXTENT * 2 + BLOCK;
    const roads = BoxBatch(), junctions = BoxBatch(), zebras = BoxBatch();
    const vr = span / 32;
    for (const L of roadLines) {
      roads.flat(L - ROAD / 2, -span / 2, L + ROAD / 2, span / 2, 0.03, [[0, 0], [0, vr], [1, vr], [1, 0]]);
      roads.flat(-span / 2, L - ROAD / 2, span / 2, L + ROAD / 2, 0.035, [[0, 0], [1, 0], [1, vr], [0, vr]]);
    }
    const nearD = (x, z, extra = 0) => Math.hypot(x - DIST.x, z - DIST.z) < DIST.r + extra;
    for (const Lx of roadLines) for (const Lz of roadLines) {
      junctions.flat(Lx - ROAD / 2, Lz - ROAD / 2, Lx + ROAD / 2, Lz + ROAD / 2, 0.045, [[0, 0], [0, 1], [1, 1], [1, 0]]);
      if (!nearD(Lx, Lz, 250)) continue;
      for (const s of [-1, 1]) {
        const a = Lx + s * (ROAD / 2 + 0.6), b = a + s * 4;
        zebras.flat(Math.min(a, b), Lz - ROAD / 2, Math.max(a, b), Lz + ROAD / 2, 0.055, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        const c = Lz + s * (ROAD / 2 + 0.6), d = c + s * 4;
        zebras.flat(Lx - ROAD / 2, Math.min(c, d), Lx + ROAD / 2, Math.max(c, d), 0.055, [[0, 0], [0, 1], [1, 1], [1, 0]]);
      }
    }
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
    const juncTex = canvasTex(256, 256, asphalt);
    const juncMat = new THREE.MeshLambertMaterial({ map: juncTex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const zebraMat = new THREE.MeshLambertMaterial({ map: zebraTexture(), transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
    scene.add(roads.mesh(roadMat), junctions.mesh(juncMat), zebras.mesh(zebraMat));

    // Pavement: every block is a raised slab with a kerb.
    const slabs = Chunked(), lawns = BoxBatch();
    const n = Math.ceil(EXTENT / BLOCK);
    const inner0 = BLOCK - ROAD;
    const worldUV = (s) => (x0, x1, z0, z1) => [[x0 / s, -z1 / s], [x1 / s, -z1 / s], [x1 / s, -z0 / s], [x0 / s, -z0 / s]];
    const kerbUV = (f, len, y0, y1) => [[0, 0], [len / 4, 0], [len / 4, y1 / 4], [0, y1 / 4]];
    for (let bx = -n; bx <= n; bx++) for (let bz = -n; bz <= n; bz++) {
      const cx = bx * BLOCK, cz = bz * BLOCK;
      slabs.at(cx, cz).box2(cx, 0, cz, inner0, SLAB, inner0, WHITE, kerbUV, worldUV(4));
    }

    // ---------- Buildings ----------
    const winTex = windowTexture(0.32);
    const facadeTex = facadeTexture();
    const bChunks = Chunked(), storeChunks = Chunked(), canopyChunks = Chunked();
    const signs = BoxBatch();
    const tint = new THREE.Color();
    const tops = [];   // rooftops tall enough for a red aviation light
    const parks = [];
    const lots = [];   // buildings near the streets you walk, for shopfronts and signs
    const storeRow = (row, uOff) => (f, len) => { const v0 = 1 - (row + 1) / 4, v1 = 1 - row / 4; return [[uOff, v0], [uOff + len / 24, v0], [uOff + len / 24, v1], [uOff, v1]]; };
    for (let bx = -n; bx <= n; bx++) {
      for (let bz = -n; bz <= n; bz++) {
        const cx = bx * BLOCK, cz = bz * BLOCK;
        if (bx === 0 && bz === 0) continue;                       // the tower's own block
        const res = RESERVED[bx + ',' + bz];
        if (res) {                                                // a building the story uses
          if (res.shops) continue;
          tint.setHSL(res.hue, res.sat, res.l);
          bChunks.at(cx, cz).box(cx, 0, cz, res.w, res.h, res.d, tint, 0.25, 0.5);
          addFootprint(cx, cz, res.w, res.d);
          tops.push(cx, res.h + 1.5, cz);
          // A lobby at the foot (your building), or little shops (hers).
          storeChunks.at(cx, cz).box2(cx, 0, cz, res.w + 0.24, 5.2, res.d + 0.24, WHITE, storeRow(res.h > 100 ? 2 : 0, 0.25), null);
          continue;
        }
        if (bx === 0 && bz === 1) { parks.push([cx, cz]); continue; } // a park right under the glass
        if (Math.abs(bx) <= 1 && Math.abs(bz) <= 1 && rand() < 0.4) { parks.push([cx, cz]); continue; }
        if (rand() < 0.04) { parks.push([cx, cz]); continue; }
        const inner = BLOCK - ROAD - 6;
        const near = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
        const pattern = rand();
        const lotList = pattern < 0.25 ? [[0, 0, 1, 1]] : pattern < 0.6
          ? (rand() < 0.5 ? [[-0.25, 0, 0.5, 1], [0.25, 0, 0.5, 1]] : [[0, -0.25, 1, 0.5], [0, 0.25, 1, 0.5]])
          : [[-0.25, -0.25, 0.5, 0.5], [0.25, -0.25, 0.5, 0.5], [-0.25, 0.25, 0.5, 0.5], [0.25, 0.25, 0.5, 0.5]];
        for (const [ox, oz, fw, fd] of lotList) {
          const inset = 2 + rand() * 5;
          const w = inner * fw - inset, d = inner * fd - inset;
          const x = cx + ox * inner, z = cz + oz * inner;
          let h = heightAt(x, z);
          if (near) h = Math.min(h, 30);
          h = Math.max(6, Math.round(h / FLOOR_H) * FLOOR_H);
          const p = PALETTE[Math.floor(rand() * PALETTE.length)];
          tint.setHSL(p[0], p[1] * (0.6 + rand() * 0.8), p[2] * (0.85 + rand() * 0.3));
          const uOff = Math.floor(rand() * TEX_CELLS) / TEX_CELLS, vOff = Math.floor(rand() * TEX_CELLS) / TEX_CELLS;
          const B = bChunks.at(x, z);
          B.box(x, 0, z, w, h, d, tint, uOff, vOff);
          addFootprint(x, z, w, d);
          let top = h, tw = w, td = d;
          // Setbacks on the taller towers, and the odd crown on top.
          if (h > 70 && rand() < 0.7) {
            const h2 = Math.round(h * (0.15 + rand() * 0.3) / FLOOR_H) * FLOOR_H;
            B.box(x, h, z, w * 0.7, h2, d * 0.7, tint, uOff, vOff);
            top += h2; tw = w * 0.7; td = d * 0.7;
            if (rand() < 0.5) {
              const h3 = Math.round(h * 0.12 / FLOOR_H) * FLOOR_H + FLOOR_H;
              B.box(x, top, z, w * 0.42, h3, d * 0.42, tint, uOff, vOff);
              top += h3; tw = w * 0.42; td = d * 0.42;
            }
          }
          if (top > 110) tops.push(x, top + 4, z);
          else if (rand() < 0.15) tops.push(x, top + 1.5, z);
          const dist = Math.hypot(x - DIST.x, z - DIST.z);
          if (dist < 700) lots.push({ x, z, w, d, h, top, tw, td, ox, oz, dist, color: tint.clone() });
        }
      }
    }

    // Street level on the buildings near you: shopfronts, awnings, hanging signs, and rooftop
    // clutter (parapets, air-con units, water tanks).
    const roofC = new THREE.Color();
    for (const L of lots) {
      const { x, z, w, d, h } = L;
      const row = h > 60 ? (rand2() < 0.7 ? 2 : 0) : [0, 0, 1, 1, 3, 0, 1][(rand2() * 7) | 0];
      storeChunks.at(x, z).box2(x, 0, z, w + 0.24, 4.5, d + 0.24, WHITE, storeRow(row, Math.floor(rand2() * 4) / 4), null);
      if (row !== 2 && rand2() < 0.7) {
        tint.setHSL([0.0, 0.08, 0.55, 0.33, 0.6][(rand2() * 5) | 0], 0.25 + rand2() * 0.3, 0.22 + rand2() * 0.2);
        canopyChunks.at(x, z).box2(x, 4.5, z, w + 2.2, 0.14, d + 2.2, tint, ZERO, ZERO);
      }
      if (L.dist < DIST.r && h > 14) {
        for (let i = 0, k = rand2() < 0.5 ? 1 : 2; i < k; i++) {
          const col = (rand2() * 8) | 0, sh = Math.min(h - 7, 4 + rand2() * 5), y0 = 5.6 + rand2() * 2;
          const u0 = col / 8 + 0.006, u1 = (col + 1) / 8 - 0.006;
          const big = [[u0, 0], [u1, 0], [u1, 1], [u0, 1]], edge = [[u0, 0], [u0 + 0.004, 0], [u0 + 0.004, 1], [u0, 1]];
          const face = (rand2() * 4) | 0, along = (rand2() < 0.5 ? -1 : 1) * 0.5;
          if (face < 2) {         // on the +z or -z face: the sign sticks out in z, panels face x
            const sz = z + (face === 0 ? 1 : -1) * (d / 2 + 0.55), sx = x + along * (w - 3);
            signs.box2(sx, y0, sz, 0.22, sh, 1.0, WHITE, (f) => (f >= 2 ? big : edge), null);
          } else {
            const sx = x + (face === 2 ? 1 : -1) * (w / 2 + 0.55), sz = z + along * (d - 3);
            signs.box2(sx, y0, sz, 1.0, sh, 0.22, WHITE, (f) => (f < 2 ? big : edge), null);
          }
        }
      }
      if (L.dist < 650) {
        const B = bChunks.at(x, z), t = L.top, tw = L.tw, td = L.td;
        roofC.copy(L.color).multiplyScalar(0.85);
        for (const [px, pz, pw, pd] of [[0, td / 2, tw, 0.3], [0, -td / 2, tw, 0.3], [tw / 2, 0, 0.3, td], [-tw / 2, 0, 0.3, td]]) B.box2(x + px, t, z + pz, pw, 0.9, pd, roofC, SOLID, SOLID);
        roofC.setHSL(0.6, 0.04, 0.62);
        for (let i = 0, k = 1 + ((rand2() * 4) | 0); i < k; i++) B.box2(x + (rand2() - 0.5) * (tw - 4), t, z + (rand2() - 0.5) * (td - 4), 1.6, 1.1, 1.2, roofC, SOLID, SOLID);
        if (rand2() < 0.45) {
          roofC.setHSL(0.55, 0.12, 0.5);
          B.box2(x + (rand2() - 0.5) * (tw - 6), t + 1.4, z + (rand2() - 0.5) * (td - 6), 2.6, 2.4, 2.6, roofC, SOLID, SOLID);
        }
      }
    }

    // The glass tower: dark glass with lit offices, a crown on top, a lobby at its foot. The
    // storey with the floor-70 landing is built in pieces round the room, with a doorway in the
    // face where the elevator stops, so you can see in and out through it.
    const towerTint = new THREE.Color(0x46566e);
    const L = LANDING, TH = TOWER_HALF;
    addFootprint(0, 0, TH * 2, TH * 2);
    addFootprint(0, TH + 2.3, 4.4, 4.6);      // the glass car's shaft at the foot of the tower
    const TB = bChunks.at(0, 0);
    const b0 = L.y - 0.5, b1 = L.y + L.h + 0.4, roomZ = TH - L.depth;
    TB.box(0, 0, 0, TH * 2, b0, TH * 2, towerTint, 0, 0);
    TB.box(0, b1, 0, TH * 2, TOWER_TOP - b1, TH * 2, towerTint, 0, 0);
    const piece = (x0, x1, z0, z1, y0, y1) => TB.box((x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, towerTint, 0, 0);
    piece(-TH, -L.halfW, -TH, TH, b0, b1);
    piece(L.halfW, TH, -TH, TH, b0, b1);
    piece(-L.halfW, L.halfW, -TH, roomZ, b0, b1);
    piece(-L.halfW, -L.door, TH - 0.3, TH, b0, b1);
    piece(L.door, L.halfW, TH - 0.3, TH, b0, b1);
    piece(-L.door, L.door, TH - 0.3, TH, L.y + 2.4, b1);
    TB.box(0, TOWER_TOP, 0, TOWER_HALF * 1.4, 16, TOWER_HALF * 1.4, towerTint, 0.25, 0.5);
    tops.push(0, TOWER_TOP + 16 + 40, 0);
    storeChunks.at(0, 0).box2(0, 0, 0, TH * 2 + 0.24, 8, TH * 2 + 0.24, WHITE, storeRow(2, 0), null);
    tint.setHSL(0.6, 0.06, 0.2);
    canopyChunks.at(0, 0).box2(-8, 8, TH + 1.4, 10, 0.25, 3.0, tint, ZERO, ZERO);

    const buildingMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: facadeTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.15 });
    const storeTex = canvasTex(1024, 768, (g) => drawStorefronts(g, false));
    const storeGlow = canvasTex(1024, 768, (g) => drawStorefronts(g, true));
    const storeMat = new THREE.MeshLambertMaterial({ map: storeTex, emissive: 0xffffff, emissiveMap: storeGlow, emissiveIntensity: 1 });
    const canopyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const kTex = kanbanTexture();
    const signMat = new THREE.MeshLambertMaterial({ map: kTex, emissive: 0xffffff, emissiveMap: kTex, emissiveIntensity: 1.2 });
    const pavingMat = new THREE.MeshLambertMaterial({ map: pavingTexture() });
    bChunks.build(scene, buildingMat, chunkList);
    storeChunks.build(scene, storeMat, chunkList);
    canopyChunks.build(scene, canopyMat, chunkList);
    slabs.build(scene, pavingMat, chunkList);
    if (!signs.empty) scene.add(signs.mesh(signMat));
    Object.assign(daylightRefs, { buildingMat, storeMat, canopyMat, signMat });

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

    // ---------- Trees ----------
    const treeGeo = shapes([
      [Cyl(0.12, 0.2, 2.8, 6, 1.4), 0x5a4232],
      [Ico(1.55, 0, 3.6, 0), 0x3f7a3a], [Ico(1.15, 0.85, 3.1, 0.35), 0x4a8a40], [Ico(1.2, -0.7, 3.2, -0.45), 0x356c33], [Ico(1.0, 0.15, 4.5, 0.1), 0x51914a],
    ]);
    const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const treeList = [], treeTints = [];
    const addTree = (x, z, s, y = SLAB) => {
      treeList.push([x, y, z, rand2() * 6.28, s]);
      const k = 0.8 + rand2() * 0.4; treeTints.push(new THREE.Color(k * (0.9 + rand2() * 0.2), k, k * (0.85 + rand2() * 0.2)));
    };

    // Parks: lawns with a ring of pavement, and trees.
    for (const [px, pz] of parks) {
      lawns.flat(px - inner0 / 2 + 3, pz - inner0 / 2 + 3, px + inner0 / 2 - 3, pz + inner0 / 2 - 3, SLAB + 0.01, [[0, 0], [0, 10], [10, 10], [10, 0]]);
      for (let i = 0; i < 26; i++) {
        const tx = px + (rand() - 0.5) * (BLOCK - ROAD - 8), tz = pz + (rand() - 0.5) * (BLOCK - ROAD - 8), s = 0.7 + rand() * 0.7;
        if (Math.hypot(tx - 18, tz - 90) < 10) continue;            // keep clear round the bench the story uses
        addTree(tx, tz, s * 1.25);
      }
    }
    const lawnMat = new THREE.MeshLambertMaterial({ map: lawnTexture(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    scene.add(lawns.mesh(lawnMat));
    // The plaza round the tower: granite, with trees in planters.
    const plaza = BoxBatch();
    plaza.flat(-inner0 / 2 + 2, -inner0 / 2 + 2, inner0 / 2 - 2, inner0 / 2 - 2, SLAB + 0.01, [[0, 0], [0, 8.25], [8.25, 8.25], [8.25, 0]]);
    scene.add(plaza.mesh(new THREE.MeshLambertMaterial({ map: graniteTexture(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    const planterMat = new THREE.MeshLambertMaterial({ color: 0x6a6b70 });
    for (const [x, z] of [[-27, -27], [0, -28], [27, -27], [-28, -6], [28, -6], [27, 25]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 3), planterMat); p.position.set(x, SLAB + 0.3, z); scene.add(p);
      addFootprint(x, z, 3, 3);
      addTree(x, z, 1.1, SLAB + 0.55);
    }

    // ---------- Street furniture, in the part of town you walk round ----------
    dressing = new THREE.Group();
    scene.add(dressing);
    const avoid = [[-57, -49, 54, 116], [-31, -19, 25, 37], [-13, -3, 12, 23], [-86, -74, 148, 160], [12, 24, 84, 98]];
    const clearSpot = (x, z) => !avoid.some((a) => x > a[0] && x < a[1] && z > a[2] && z < a[3]);
    const inJunction = (t) => { const f = (((t - BLOCK / 2) % BLOCK) + BLOCK) % BLOCK; return Math.min(f, BLOCK - f) < ROAD / 2 + 5; };
    const poleList = [], wires = [], lampHeads = [];
    const POLE_OFF = ROAD / 2 + 0.6;
    for (const Lc of roadLines) for (const alongX of [false, true]) {
      // Utility poles (with a streetlight on each) down one side of the road, trees down the other.
      let prev = null;
      for (let t = -EXTENT + 15; t <= EXTENT; t += 30) {
        const x = alongX ? t : Lc + POLE_OFF, z = alongX ? Lc + POLE_OFF : t;
        if (!nearD(x, z) || inJunction(t) || !clearSpot(x, z) || !clearAt(x, z, 0.4)) { if (!inJunction(t)) prev = null; continue; }
        const ry = alongX ? Math.PI / 2 : Math.PI;
        const dx = alongX ? 0 : -1, dz = alongX ? -1 : 0;      // toward the road
        poleList.push([x, SLAB, z, ry, 1]);
        addFootprint(x, z, 0.45, 0.45);
        lampHeads.push(x + dx * 1.3, 6.3, z + dz * 1.3);
        const pts = [[9.4, -0.7], [9.4, 0.7], [8.7, -0.5], [8.7, 0.5]].map(([y, o]) => [x + dx * o, y, z + dz * o]);
        if (prev) for (let k = 0; k < 4; k++) {
          const a = prev[k], b = pts[k];
          for (let s = 0; s < 8; s++) {
            const u0 = s / 8, u1 = (s + 1) / 8, sag = (u) => -0.5 * 4 * u * (1 - u);
            wires.push(a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0 + sag(u0), a[2] + (b[2] - a[2]) * u0,
              a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1 + sag(u1), a[2] + (b[2] - a[2]) * u1);
          }
        }
        prev = pts;
      }
      for (let t = -EXTENT + 7; t <= EXTENT; t += 14) {
        const x = alongX ? t : Lc - POLE_OFF - 0.3, z = alongX ? Lc - POLE_OFF - 0.3 : t;
        if (!nearD(x, z, -60) || inJunction(t) || !clearSpot(x, z) || !clearAt(x, z, 1.2)) continue;
        addTree(x, z, 0.8 + rand2() * 0.35);
        addFootprint(x, z, 0.5, 0.5);
      }
    }
    const furnMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const poleGeo = shapes([
      [Cyl(0.13, 0.17, 10, 8, 5), 0x9d9b94], [Cyl(0.19, 0.19, 1.3, 8, 1.2), 0xd8b83a],
      [Box(1.8, 0.12, 0.12, 9.4), 0x6e6c66], [Box(1.3, 0.1, 0.1, 8.7), 0x6e6c66],
      [Cyl(0.3, 0.3, 0.9, 8, 7.3), 0x7c8a80, -0.38, 0, 0],
      [Box(1.3, 0.07, 0.07, 6.5), 0x55575c, 0.65, 0, 0], [Box(0.55, 0.12, 0.26, 6.42), 0x3a3c40, 1.3, 0, 0],
    ]);
    dressing.add(instanced(poleGeo, furnMat, poleList));
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    dressing.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x15161a, transparent: true, opacity: 0.75 })));
    const trees = instanced(treeGeo, treeMat, treeList, treeTints);
    scene.add(trees);

    // Traffic lights at the junctions near you: two per junction, one over each road.
    const sigList = [], heads = [];
    for (const Lx of roadLines) for (const Lz of roadLines) {
      if (!nearD(Lx, Lz, -40)) continue;
      const c = ROAD / 2 + 1.2;
      for (const [x, z, ry, axis] of [[Lx + c, Lz + c, Math.PI, 'z'], [Lx - c, Lz - c, -Math.PI / 2, 'x']]) {
        if (!clearSpot(x, z) || !clearAt(x, z, 0.4)) continue;
        sigList.push([x, SLAB, z, ry, 1]);
        addFootprint(x, z, 0.35, 0.35);
        const fx = Math.cos(ry), fz = -Math.sin(ry);
        heads.push({ axis, lamps: [-0.4, 0, 0.4].map((o) => [x + fx * (5.0 + o), 5.45, z + fz * (5.0 + o)]) });
      }
    }
    const sigGeo = shapes([
      [Cyl(0.1, 0.12, 5.7, 8, 2.85), 0x55585e], [Box(5.6, 0.1, 0.1, 5.75), 0x55585e, 2.8, 0, 0],
      [Box(1.35, 0.42, 0.34, 5.45), 0x2a2c30, 5.0, 0, 0], [Box(0.36, 0.5, 0.3, 2.6), 0x2a2c30, 0, 0, 0.26],
    ]);
    dressing.add(instanced(sigGeo, furnMat, sigList));

    // Vending machines outside the shops near you.
    const vendList = [];
    for (const L of lots) {
      if (L.dist > DIST.r - 40 || rand2() > 0.4) continue;
      let nx = Math.sign(L.ox), nz = Math.sign(L.oz);
      if (nx && nz) { if (rand2() < 0.5) nx = 0; else nz = 0; }
      if (!nx && !nz) { if (rand2() < 0.5) nx = rand2() < 0.5 ? -1 : 1; else nz = rand2() < 0.5 ? -1 : 1; }
      const along = (rand2() - 0.5) * 0.5;
      const ry = nx ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (nz > 0 ? 0 : Math.PI);
      for (let k = 0; k < (rand2() < 0.5 ? 1 : 2); k++) {
        const x = nx ? L.x + nx * (L.w / 2 + 0.55) : L.x + along * L.w + k * 0.95, z = nz ? L.z + nz * (L.d / 2 + 0.55) : L.z + along * L.d + k * 0.95;
        if (!clearSpot(x, z) || !clearAt(x, z, 0.5)) continue;
        vendList.push([x, SLAB, z, ry, 1]);
        addFootprint(x, z, 0.95, 0.95);
      }
    }
    const vTex = vendingTexture();
    const white = new THREE.MeshLambertMaterial({ color: 0xe6e8ea });
    const vendFront = new THREE.MeshLambertMaterial({ map: vTex, emissive: 0xffffff, emissiveMap: vTex, emissiveIntensity: 0.8 });
    const vendGeo = new THREE.BoxGeometry(0.9, 1.85, 0.75).translate(0, 0.925, 0);
    dressing.add(instanced(vendGeo, [white, white, white, white, vendFront, white], vendList));
    daylightRefs.vendFront = vendFront;

    // ---------- Lights ----------
    // Streetlights along both kerbs of every road (on the poles, near you), plus park paths.
    const glow = glowTexture();
    const lamps = [];
    for (const Lc of roadLines) {
      for (let t = -EXTENT; t <= EXTENT; t += 24) {
        if (Math.abs(((t + BLOCK / 2) % BLOCK + BLOCK) % BLOCK - BLOCK / 2) > BLOCK / 2 - ROAD / 2 - 1) continue; // not in a junction
        for (const side of [-1, 1]) {
          const a = [Lc + side * (ROAD / 2 + 0.5), 6, t], b = [t, 6, Lc + side * (ROAD / 2 + 0.5)];
          if (!nearD(a[0], a[2], 30)) lamps.push(...a);
          if (!nearD(b[0], b[2], 30)) lamps.push(...b);
        }
      }
    }
    lamps.push(...lampHeads);
    for (const [px, pz] of parks) for (let i = 0; i < 6; i++) lamps.push(px + (rand() - 0.5) * 50, 3, pz + (rand() - 0.5) * 50);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; lamps.push(Math.cos(a) * 30, 3.5, Math.sin(a) * 30); }
    const pointsOf = (arr, color, size, opacity) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: glow, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    };
    const lampPts = pointsOf(lamps, 0xffa756, 4.5, 0.9);
    scene.add(lampPts);
    scene.add(pointsOf(strip, 0x39c5bb, 0.35, 0.9));

    // Red aviation lights that blink in slow unison.
    const redLights = pointsOf(tops, 0xff2a2a, 14, 1);
    scene.add(redLights);

    // Signal lamps: one lit per head, green, amber or red.
    const sigPts = [0x3cffa0, 0xffc23a, 0xff3a30].map((c) => { const p = pointsOf(new Float32Array(Math.max(1, heads.length) * 3), c, 0.9, 1); p.frustumCulled = false; dressing.add(p); return p; });
    const phase = (axis, t) => {
      const c = ((t % 24) + 24) % 24;
      if (axis === 'x') return c < 9 ? 0 : c < 11 ? 1 : 2;
      return c >= 12 && c < 21 ? 0 : c >= 21 && c < 23 ? 1 : 2;
    };

    // ---------- Traffic ----------
    // Cars drive on the left, stop at red lights, queue behind each other, and stop for you.
    const cars = [], lanes = new Map();
    const addCar = (line, alongX, t, dir, speed, lo, hi) => {
      const ry = alongX ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      const c = { line, alongX, t, dir, cruise: speed, v: speed, lo, hi, len: 0.8 + rand2() * 0.35, fx: Math.cos(ry), fz: -Math.sin(ry), ry };
      const key = (alongX ? 'x' : 'z') + line + ':' + dir;
      if (!lanes.has(key)) lanes.set(key, []);
      lanes.get(key).push(c);
      cars.push(c);
    };
    for (let i = 0; i < 1400; i++) {
      const line = roadLines[Math.floor(rand() * roadLines.length)], alongX = rand() < 0.5, t = (rand() * 2 - 1) * EXTENT, dir = rand() < 0.5 ? 1 : -1, speed = 9 + rand() * 9;
      addCar(line, alongX, t, dir, speed, -EXTENT, EXTENT);
    }
    // More traffic on the roads round you, kept to this part of town.
    const nearLines = roadLines.filter((Lc) => Math.abs(Lc - DIST.x) < DIST.r || Math.abs(Lc - DIST.z) < DIST.r);
    for (let i = 0; i < 520; i++) {
      const alongX = rand2() < 0.5, line = nearLines[(rand2() * nearLines.length) | 0];
      if ((alongX && Math.abs(line - DIST.z) > DIST.r) || (!alongX && Math.abs(line - DIST.x) > DIST.r)) { i--; continue; }
      const mid = alongX ? DIST.x : DIST.z, lo = mid - 650, hi = mid + 650;
      addCar(line, alongX, lo + rand2() * (hi - lo), rand2() < 0.5 ? 1 : -1, 8 + rand2() * 6, lo, hi);
    }
    const carGeo = shapes([
      [Box(4.3, 0.72, 1.76, 0.62), 0xffffff], [Box(2.4, 0.6, 1.62, 1.28), 0x1c232c, -0.25, 0, 0],
      [Box(0.8, 0.56, 1.84, 0.3), 0x111214, 1.4, 0, 0], [Box(0.8, 0.56, 1.84, 0.3), 0x111214, -1.4, 0, 0],
      [Box(0.06, 0.16, 1.4, 0.8), 0xfff4dc, 2.16, 0, 0], [Box(0.06, 0.16, 1.4, 0.8), 0xc0181a, -2.16, 0, 0],
    ]);
    const carColors = [0xf2f2f0, 0xf2f2f0, 0x1a1b1f, 0xb8bcc2, 0x8a9096, 0x2a3a6a, 0x7a1d1d, 0xf2c84b, 0x2f6f4a, 0xe8e2d0];
    const carMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), cars.length);
    carMesh.frustumCulled = false;
    const cm = new THREE.Matrix4(), cq = new THREE.Quaternion(), cs = new THREE.Vector3(), cp = new THREE.Vector3(), cup = new THREE.Vector3(0, 1, 0), cc = new THREE.Color();
    cars.forEach((c, i) => {
      carMesh.setMatrixAt(i, cm.compose(cp.set(0, 0, 0), cq.setFromAxisAngle(cup, c.ry), cs.set(c.len, 1, 1)));
      carMesh.setColorAt(i, cc.setHex(carColors[(rand2() * carColors.length) | 0]));
    });
    scene.add(carMesh);
    const carM = carMesh.instanceMatrix.array;
    const headPos = new Float32Array(cars.length * 3), tailPos = new Float32Array(cars.length * 3);
    const headPts = pointsOf(headPos, 0xfff2d8, 4.5, 1);
    const tailPts = pointsOf(tailPos, 0xff3b30, 4, 1);
    headPts.frustumCulled = tailPts.frustumCulled = false;
    scene.add(headPts, tailPts);
    Object.assign(daylightRefs, { lampPts, headPts, tailPts });

    function update(dt, time) {
      redLights.material.opacity = (0.25 + 0.75 * Math.max(0, Math.sin(time * 2.2))) * (1 - 0.8 * Math.max(0, lastK));
      // Signals.
      for (let k = 0; k < 3; k++) {
        const a = sigPts[k].geometry.attributes.position.array;
        heads.forEach((h, i) => { const on = phase(h.axis, time) === k, p = h.lamps[k]; a[i * 3] = p[0]; a[i * 3 + 1] = on ? p[1] : -100; a[i * 3 + 2] = p[2]; });
        sigPts[k].geometry.attributes.position.needsUpdate = true;
      }
      // Each lane in order, so every car knows who's in front of it.
      const ACC = 2.6, BRAKE = 7;
      const px = view.px, pz = view.pz, walker = view.on;
      for (const lane of lanes.values()) {
        lane.sort((a, b) => a.t - b.t);
        for (let i = 0; i < lane.length; i++) {
          const c = lane[i];
          let want = c.cruise;
          // The car ahead.
          const ahead = lane[c.dir > 0 ? i + 1 : i - 1];
          if (ahead) { const gap = Math.abs(ahead.t - c.t) - 4.6 * (c.len + ahead.len) / 2; want = Math.min(want, Math.sqrt(2 * 5 * Math.max(0, gap - 2.5)) + (gap > 6 ? ahead.v * 0.8 : 0)); }
          // The lights: stop at the line on amber or red, unless already at it.
          const idx = c.dir > 0 ? Math.ceil((c.t - BLOCK / 2) / BLOCK) : Math.floor((c.t - BLOCK / 2) / BLOCK);
          const toLine = (idx * BLOCK + BLOCK / 2 - c.t) * c.dir - (ROAD / 2 + 5.5);
          if (toLine > 0.5 && toLine < 70 && phase(c.alongX ? 'x' : 'z', time) !== 0) want = Math.min(want, Math.sqrt(2 * 5 * Math.max(0, toLine - 0.5)));
          // You, if you're in the road in front of it.
          if (walker) {
            const across = c.alongX ? pz - (c.line - c.dir * 3.2) : px - (c.line + c.dir * 3.2);
            const along = ((c.alongX ? px : pz) - c.t) * c.dir;
            if (Math.abs(across) < 2.4 && along > 0 && along < 45) want = Math.min(want, Math.sqrt(2 * 6 * Math.max(0, along - 4.5)));
          }
          c.v += Math.max(-BRAKE * dt, Math.min(ACC * dt, want - c.v));
          if (c.v < 0) c.v = 0;
        }
      }
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        c.t += c.dir * c.v * dt;
        if (c.t > c.hi) c.t -= c.hi - c.lo; else if (c.t < c.lo) c.t += c.hi - c.lo;
        const lane = c.dir * 3.2;
        const x = c.alongX ? c.t : c.line + lane, z = c.alongX ? c.line - lane : c.t;
        carM[i * 16 + 12] = x; carM[i * 16 + 14] = z;
        const r = 2.2 * c.len;
        headPos[i * 3] = x + c.fx * r; headPos[i * 3 + 1] = 0.8; headPos[i * 3 + 2] = z + c.fz * r;
        tailPos[i * 3] = x - c.fx * r; tailPos[i * 3 + 1] = 0.8; tailPos[i * 3 + 2] = z - c.fz * r;
      }
      carMesh.instanceMatrix.needsUpdate = true;
      headPts.geometry.attributes.position.needsUpdate = true;
      tailPts.geometry.attributes.position.needsUpdate = true;
    }

    return { update };
  }

  // ---------- Two ways of seeing it ----------
  // From the street: the far city is culled (chunk by chunk) and lost in a thicker haze, the
  // glows are sized for close up, and the street furniture is shown. From up high: everything.
  // `cam` is the camera position; `street` is whether you're walking the streets.
  let fogBase = 0.00078;
  function setView(cam, street, px, pz) {
    view.on = street; view.px = px; view.pz = pz;
    const R = daylightRefs;
    if (R.scene) R.scene.fog.density = fogBase * (street ? 2.3 : 1);
    if (street !== view.street || (street && Math.hypot(cam.x - view.cx, cam.z - view.cz) > 25)) {
      const first = street !== view.street;
      view.street = street; view.cx = cam.x; view.cz = cam.z;
      for (const m of chunkList) m.visible = !street || Math.hypot(m.userData.c.x - cam.x, m.userData.c.z - cam.z) < 1300;
      if (first && R.lampPts) {
        R.lampPts.material.size = street ? 2.2 : 4.5;
        R.headPts.material.size = street ? 0.9 : 4.5;
        R.tailPts.material.size = street ? 0.8 : 4;
      }
    }
    if (dressing) dressing.visible = cam.y < 170 && Math.hypot(cam.x - DIST.x, cam.z - DIST.z) < DIST.r + 450;
  }

  // ---------- Day and night ----------
  // k: 0 is deep night, 1 is full day; in between the sky goes through a warm dusk.
  const daylightRefs = {};
  let lastK = -1;
  const C = (h) => new THREE.Color(h);
  const NIGHT = { hemiSky: C(0x3a4a8a), hemiGround: C(0x1a0f0a), hemi: 0.9, sun: C(0x9fb0ff), sunI: 0.6, fog: C(0x24183a), fogD: 0.00078, bg: C(0x03050f) };
  const DAY = { hemiSky: C(0xd6e8ff), hemiGround: C(0x6a5e52), hemi: 1.55, sun: C(0xfff1d8), sunI: 2.1, fog: C(0xb8cde0), fogD: 0.00045, bg: C(0x8fbfea) };
  const DUSK = { hemiSky: C(0x9a7aa8), hemiGround: C(0x3a2418), hemi: 1.2, sun: C(0xffa060), sunI: 1.3, fog: C(0x8a6a7a), fogD: 0.0006, bg: C(0x6a4a6a) };
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
    fogBase = a.fogD + (b.fogD - a.fogD) * t;
    R.scene.fog.density = fogBase * (view.on ? 2.3 : 1);
    R.scene.background.copy(a.bg).lerp(b.bg, t);
    // Lit windows by night; by day the windows are just glass and the walls take the light.
    const night = (1 - k) * (1 - k);
    R.buildingMat.emissiveIntensity = 1.15 * night;
    R.buildingMat.color.setScalar(0.2 + 0.8 * k);
    R.storeMat.emissiveIntensity = 0.3 + 0.85 * (1 - k);
    R.storeMat.color.setScalar(0.3 + 0.7 * k);
    R.canopyMat.color.setScalar(0.35 + 0.65 * k);
    R.signMat.emissiveIntensity = 0.35 + 0.95 * (1 - k);
    R.signMat.color.setScalar(0.35 + 0.65 * k);
    if (R.vendFront) R.vendFront.emissiveIntensity = 0.25 + 0.6 * (1 - k);
    if (R.lampPts) {
      R.lampPts.material.opacity = 0.9 * Math.max(0, 1 - k * 1.4);
      R.headPts.material.opacity = 1 - 0.75 * k;
      R.tailPts.material.opacity = 1 - 0.6 * k;
    }
    // The sky dome.
    if (skyData) {
      const out = skyData.attr.array, A = k < 0.5 ? skyData.night : skyData.dusk, B = k < 0.5 ? skyData.dusk : skyData.day;
      for (let i = 0; i < out.length; i++) out[i] = A[i] + (B[i] - A[i]) * t;
      skyData.attr.needsUpdate = true;
    }
    if (R.mountains) R.mountains.color.setHex(0x080a14).lerp(C(0x7f93ab), k);
    if (skyExtras.stars) skyExtras.stars.material.opacity = 0.85 * Math.max(0, 1 - k * 2.2);
    if (skyExtras.halo) skyExtras.halo.material.opacity = 0.35 * Math.max(0, 1 - k * 2);
    if (skyExtras.moon) skyExtras.moon.visible = k < 0.6;
  }

  return { build, TOWER_HALF, TOWER_TOP, FLOOR_H, LANDING, BLOCK, SLAB, clearAt, addFootprint, groundAt, setDaylight, setView };
})();
