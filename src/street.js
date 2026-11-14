// The streets you can walk: everything at ground level in the city, with a shopping street of
// little shops you can walk into, on the road between your building and the glass tower.
//   Hoshi Mart (konbini) · Menya Tsuki (ramen) · Kissa Lumen (café) · Hanaya (florist) · Kairo Records
// Your building's entrance faces the street; the glass tower's lobby is at its foot.
const Street = (() => {
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...o });
  const glow = (color) => new THREE.MeshBasicMaterial({ color });
  const rnd = (a, b) => a + Math.random() * (b - a);
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  // Shop fronts face east (+x) onto the road at x = -43; shops are 8 m deep, 9 m wide.
  const FRONT = -53.5, BACK = -61.5, HT = 4.2;
  const SHOPS = [
    { id: 'konbini', name: 'Hoshi Mart', jp: '星マート', z0: 58, z1: 67, sign: '#ffffff', signBg: '#1f9a6a', stripe: '#f2c84b', light: 0xf4fbff },
    { id: 'ramen', name: 'Menya Tsuki', jp: '麺屋 月', z0: 68.5, z1: 77.5, sign: '#f3ead8', signBg: '#5a1a1a', stripe: '#c83a2a', light: 0xffb070 },
    { id: 'cafe', name: 'Kissa Lumen', jp: '喫茶ルーメン', z0: 79, z1: 88, sign: '#f3e2c8', signBg: '#2a1f18', stripe: '#c9a46a', light: 0xffc890 },
    { id: 'florist', name: 'Hanaya', jp: '花屋', z0: 89.5, z1: 98.5, sign: '#ffffff', signBg: '#d97aa0', stripe: '#3f7a45', light: 0xfff0e8 },
    { id: 'records', name: 'Kairo Records', jp: 'カイロ・レコード', z0: 100, z1: 109, sign: '#7ff0e6', signBg: '#111522', stripe: '#39c5bb', light: 0xc8b8ff },
  ];
  const DOOR_W = 1.3;

  function build(scene) {
    const g = new THREE.Group(); scene.add(g);
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
    const box = (w, h, d, m, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
    const cyl = (r0, r1, h, m, x, y, z, seg = 12) => add(new THREE.CylinderGeometry(r0, r1, h, seg), m, x, y, z);
    const ball = (r, m, x, y, z) => add(new THREE.SphereGeometry(r, 10, 8), m, x, y, z);
    const plane = (w, h, m, x, y, z, ry = 0, rx = 0) => { const o = add(new THREE.PlaneGeometry(w, h), m, x, y, z, ry); o.rotation.x = rx; return o; };
    const walls = [];   // [x0, x1, z0, z1] you can't walk through
    const usables = [];
    const signs = [];   // emissive sign materials, brighter at night
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.12, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const frameM = mat(0x1a1b20, { metalness: 0.6, roughness: 0.4 });

    // Pavement along the shop fronts, with a kerb.
    plane(10, 62, mat(0x3a3c44, { roughness: 0.9 }), FRONT + 5, 0.06, 83.5, 0, -Math.PI / 2);
    box(0.25, 0.15, 62, mat(0x6a6c74), FRONT + 9.9, 0.075, 83.5);

    for (const s of SHOPS) {
      const zc = (s.z0 + s.z1) / 2, w = s.z1 - s.z0, depth = FRONT - BACK, xc = (FRONT + BACK) / 2;
      const wallM = mat(new THREE.Color(s.signBg).lerp(new THREE.Color(0x3a3530), 0.6).getHex(), { roughness: 0.9 });
      const inner = mat(s.id === 'konbini' ? 0xf2f2ee : s.id === 'ramen' ? 0x6a4a32 : s.id === 'cafe' ? 0x4a3a30 : s.id === 'florist' ? 0xf0ebe2 : 0x24222e, { roughness: 0.9 });
      const floorM = mat(s.id === 'konbini' ? 0xd8dadc : s.id === 'records' ? 0x2a2a30 : 0x6a4a32, { roughness: 0.6 });
      // Shell: floor, ceiling, back and side walls (inside faces), outer skin, upper floors.
      plane(depth, w, floorM, xc, 0.07, zc, 0, -Math.PI / 2);
      plane(depth, w, mat(0xe8e8e4, { roughness: 1 }), xc, HT, zc, 0, Math.PI / 2);
      plane(w, HT, inner, BACK, HT / 2, zc, Math.PI / 2);
      plane(depth, HT, inner, xc, HT / 2, s.z0 + 0.01, 0);
      plane(depth, HT, inner, xc, HT / 2, s.z1 - 0.01, Math.PI);
      box(depth + 0.4, 9, w + 0.02, mat(0x2a2c34, { roughness: 0.9 }), xc - 0.2, HT + 4.5, zc);
      const upper = canvasTex(128, 256, (c, cw, ch) => {
        c.fillStyle = '#2a2c34'; c.fillRect(0, 0, cw, ch);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) { c.fillStyle = Math.random() < 0.5 ? '#ffd9a0' : '#1a1c22'; c.fillRect(14 + k * 58, 20 + r * 80, 42, 50); }
      });
      const um = new THREE.MeshStandardMaterial({ map: upper, emissiveMap: upper, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.9 });
      signs.push(um);
      plane(w, 9, um, FRONT + 0.21, HT + 4.5, zc, Math.PI / 2);
      walls.push([BACK - 0.3, BACK, s.z0, s.z1], [BACK, FRONT, s.z0 - 0.3, s.z0 + 0.05], [BACK, FRONT, s.z1 - 0.05, s.z1 + 0.3]);
      // The front: glass with a door gap in the middle, under a fascia with the lit sign.
      const dz0 = zc - DOOR_W / 2, dz1 = zc + DOOR_W / 2;
      for (const [a, b] of [[s.z0, dz0], [dz1, s.z1]]) {
        const gp = plane(b - a, HT - 1.0, glass, FRONT, (HT - 1.0) / 2 + 0.07, (a + b) / 2, Math.PI / 2); gp.renderOrder = 1;
        box(0.08, 0.5, b - a, mat(new THREE.Color(s.signBg).getHex()), FRONT, 0.32, (a + b) / 2);
        walls.push([FRONT - 0.1, FRONT + 0.1, a, b]);
      }
      for (const z of [s.z0, dz0, dz1, s.z1]) box(0.1, HT - 0.9, 0.1, frameM, FRONT, (HT - 0.9) / 2 + 0.07, z);
      box(0.3, 1.0, w, mat(new THREE.Color(s.signBg).getHex(), { roughness: 0.6 }), FRONT + 0.05, HT - 0.45, zc);
      const signTex = canvasTex(512, 96, (c, cw, ch) => {
        c.fillStyle = s.signBg; c.fillRect(0, 0, cw, ch);
        c.fillStyle = s.stripe; c.fillRect(0, ch - 10, cw, 10);
        c.fillStyle = s.sign; c.textBaseline = 'middle';
        c.font = 'bold 40px "M PLUS Rounded 1c", sans-serif'; c.fillText(s.jp, 20, ch / 2 - 4);
        c.font = '600 26px Outfit, sans-serif'; c.textAlign = 'right'; c.fillText(s.name.toUpperCase(), cw - 20, ch / 2 - 2);
      });
      const sm = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5 });
      signs.push(sm);
      plane(w - 0.3, 0.9, sm, FRONT + 0.21, HT - 0.45, zc, Math.PI / 2);
      // An awning over the door, and a little light over it.
      const aw = box(1.4, 0.06, DOOR_W + 1.2, mat(new THREE.Color(s.stripe).getHex(), { roughness: 0.9 }), FRONT + 0.75, HT - 1.1, zc); aw.rotation.z = -0.18;
      ball(0.08, glow(0xffe8c0), FRONT + 0.2, HT - 1.25, zc);
      // Inside lighting: rows of ceiling panels.
      for (let x = BACK + 1.5; x < FRONT - 0.8; x += 2.2) box(1.2, 0.03, 0.4, glow(s.light), x, HT - 0.02, zc);
      s.zc = zc; s.xc = xc;
      buildInterior(s, { box, cyl, ball, plane, walls, usables });
    }

    // Plain buildings filling the rest of the shopping block, behind the shops.
    const fill = [[-80, 70, 30, 24, 38], [-80, 100, 30, 26, 52], [-104, 70, 14, 24, 26], [-104, 100, 14, 30, 44]];
    for (const [x, z, w, d, h] of fill) {
      const tex = canvasTex(128, 256, (c, cw, ch) => { c.fillStyle = '#20232c'; c.fillRect(0, 0, cw, ch); for (let r = 0; r < 12; r++) for (let k = 0; k < 4; k++) { c.fillStyle = Math.random() < 0.35 ? '#ffd9a0' : '#15171d'; c.fillRect(6 + k * 30, 6 + r * 21, 22, 13); } });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, w / 12), Math.max(1, h / 24));
      const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.9 });
      signs.push(m);
      box(w, h, d, m, x, h / 2, z);
      City.addFootprint(x, z, w, d);
    }

    // Two street lamps per shop row, and a vending machine.
    for (let z = 60; z < 112; z += 13) {
      cyl(0.06, 0.08, 4.5, mat(0x22252b, { metalness: 0.6 }), FRONT + 9.4, 2.25, z, 8);
      ball(0.18, glow(0xfff0d0), FRONT + 9.1, 4.5, z);
      walls.push([FRONT + 9.25, FRONT + 9.55, z - 0.15, z + 0.15]);
    }
    box(0.8, 1.9, 1.1, mat(0xd8dadc), FRONT + 0.6, 0.95 + 0.07, 112.5);
    plane(0.9, 1.2, new THREE.MeshBasicMaterial({ map: canvasTex(90, 120, (c, cw, ch) => { c.fillStyle = '#e8f4ff'; c.fillRect(0, 0, cw, ch); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { c.fillStyle = ['#d84a3a', '#39c5bb', '#f2c84b', '#3a6ad8'][(r + k) % 4]; c.fillRect(6 + k * 21, 8 + r * 26, 14, 20); } }) }), FRONT + 1.01, 1.25, 112.5, Math.PI / 2);
    walls.push([FRONT + 0.2, FRONT + 1.0, 111.95, 113.05]);
    usables.push({ x: FRONT + 1.6, z: 112.5, r: 1.6, label: 'Vending machine', use: () => Town.vending() });

    // Two lights that follow you to whichever shop you're nearest, so the interiors are lit
    // without every shop paying for its own lights.
    const shopLight = new THREE.PointLight(0xffffff, 0, 10, 1.4);
    const shopLight2 = new THREE.PointLight(0xffffff, 0, 8, 1.4);
    g.add(shopLight, shopLight2);

    // Your building's entrance, and the glass tower's lobby.
    // An entrance on a building face at z, facing out toward -z (side -1) or +z (side 1).
    const entrance = (x, z, side, label, color) => {
      const ry = side < 0 ? Math.PI : 0;
      box(2.4, 2.8, 0.3, mat(0x15161a, { metalness: 0.6 }), x, 1.4 + 0.07, z);
      plane(2.0, 2.4, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.2 }), x, 1.27, z + side * 0.16, ry);
      const t = canvasTex(256, 48, (c, cw, ch) => { c.fillStyle = '#0a0b10'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#e9f3ff'; c.font = '600 24px Outfit, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, cw / 2, ch / 2); });
      plane(2.2, 0.4, new THREE.MeshBasicMaterial({ map: t }), x, 3.1, z + side * 0.17, ry);
      ball(0.1, glow(0xffe8c0), x, 2.9, z + side * 0.5);
    };
    entrance(-80, 155, -1, 'RESIDENCES · 1–48F', 0x8fa6c8);
    entrance(-8, 17, 1, 'OBSERVATION · 70F', 0x39c5bb);

    function update(t, px, pz, k) {
      // Brighter signs at night.
      for (const m of signs) m.emissiveIntensity = 0.75 * (1 - k * 0.7) + 0.15;
      let near = null, nd = 1e9;
      for (const s of SHOPS) { const d = Math.hypot(px - s.xc, pz - s.zc); if (d < nd) { nd = d; near = s; } }
      const on = near && nd < 18;
      const bright = near && (near.id === 'konbini' || near.id === 'florist') ? 0.35 : 1;
      shopLight.intensity = on ? 8 * bright : 0; shopLight2.intensity = on ? 4.5 * bright : 0;
      if (near) { shopLight.color.setHex(near.light); shopLight2.color.setHex(near.light); shopLight.position.set(near.xc + 1, HT - 0.6, near.zc); shopLight2.position.set(BACK + 1.2, HT - 0.8, near.zc); }
    }

    // Walking: anywhere on the ground that isn't inside a building (shops have doors).
    function canStand(x, z, r) {
      if (Math.abs(x) > 1400 || Math.abs(z) > 1400) return false;
      const inShop = x < FRONT && x > BACK && z > 57 && z < 110;
      if (!inShop && !City.clearAt(x, z, r)) return false;
      for (const b of walls) if (x > b[0] - r && x < b[1] + r && z > b[2] - r && z < b[3] + r) return false;
      return true;
    }
    // Which shop you're in, if any.
    const shopAt = (x, z) => SHOPS.find((s) => x < FRONT && x > BACK && z > s.z0 && z < s.z1) || null;

    return {
      group: g, canStand, floorY: 0.06, update, usables, shopAt, SHOPS,
      at: {
        homeDoor: { x: -80, z: 153.3, yaw: Math.PI },
        towerDoor: { x: -8, z: 18.5, yaw: 0 },
        arriveHome: { x: -80, z: 152.6, yaw: 0 },
        arriveTower: { x: -8, z: 19.4, yaw: Math.PI },
      },
      spots: {},
    };
  }

  // ---------- Inside each shop ----------
  function buildInterior(s, { box, cyl, ball, plane, walls, usables }) {
    const zc = s.zc, z0 = s.z0, z1 = s.z1, Y = 0.07;
    const counter = (x, z, len, color = 0x2a2c34, topC = 0xe6e1d8) => {
      box(0.7, 1.0, len, mat(color), x, Y + 0.5, z);
      box(0.8, 0.05, len + 0.05, mat(topC, { roughness: 0.3 }), x, Y + 1.02, z);
      walls.push([x - 0.4, x + 0.4, z - len / 2, z + len / 2]);
    };
    if (s.id === 'konbini') {
      // Shelves of brightly packed goods, a wall of glowing fridges, a register by the door.
      for (const z of [z0 + 2.2, z0 + 4.5]) for (let x = BACK + 2; x < FRONT - 2.5; x += 0.01) {
        box(3.2, 1.5, 0.5, mat(0xe0e2e6), BACK + 3.4, Y + 0.75, z);
        for (let sh = 0; sh < 4; sh++) for (let i = 0; i < 14; i++) box(0.17, 0.22, 0.12, mat(new THREE.Color().setHSL(Math.random(), 0.7, 0.55).getHex(), { roughness: 0.5 }), BACK + 1.95 + i * 0.21, Y + 0.25 + sh * 0.36, z + (Math.random() < 0.5 ? -0.2 : 0.2));
        walls.push([BACK + 1.7, BACK + 5.1, z - 0.3, z + 0.3]);
        break;
      }
      for (let i = 0; i < 5; i++) {
        box(0.6, 2.2, 1.6, mat(0xd8dadc, { metalness: 0.4 }), BACK + 0.32, Y + 1.1, z0 + 0.9 + i * 1.62);
        plane(1.5, 1.9, new THREE.MeshStandardMaterial({ color: 0xcfefff, emissive: 0x9fdcff, emissiveIntensity: 0.55, transparent: true, opacity: 0.85 }), BACK + 0.63, Y + 1.15, z0 + 0.9 + i * 1.62, Math.PI / 2);
        for (let sh = 0; sh < 4; sh++) for (let k = 0; k < 6; k++) cyl(0.04, 0.04, 0.2, mat(new THREE.Color().setHSL(Math.random(), 0.6, 0.5).getHex()), BACK + 0.45, Y + 0.45 + sh * 0.45, z0 + 0.35 + i * 1.62 + k * 0.22, 8);
      }
      walls.push([BACK, BACK + 0.7, z0, z1]);
      counter(FRONT - 1.6, z1 - 1.4, 2.2, 0x1f9a6a);
      box(0.35, 0.3, 0.3, mat(0x111111), FRONT - 1.6, Y + 1.2, z1 - 1.8);
      plane(0.3, 0.2, glow(0x7ff0e6), FRONT - 1.44, Y + 1.25, z1 - 1.8, Math.PI / 2);
      for (let i = 0; i < 6; i++) box(0.25, 0.05, 0.3, mat(new THREE.Color().setHSL(Math.random(), 0.6, 0.6).getHex()), FRONT - 1.5, Y + 1.07, z1 - 0.9 - i * 0.1);
      usables.push({ x: FRONT - 2.4, z: z1 - 1.4, r: 1.8, label: 'Hoshi Mart: buy food', use: () => Town.store('konbini') });
    } else if (s.id === 'ramen') {
      counter(BACK + 2.4, zc, 7.0, 0x4a2f1d, 0xc9a46a);
      for (let i = 0; i < 6; i++) { const z = z0 + 1.4 + i * 1.2; cyl(0.2, 0.2, 0.06, mat(0xc83a2a), BACK + 3.3, Y + 0.72, z, 16); cyl(0.04, 0.04, 0.7, mat(0x111111), BACK + 3.3, Y + 0.36, z, 6); walls.push([BACK + 3.1, BACK + 3.5, z - 0.2, z + 0.2]); }
      for (let i = 0; i < 4; i++) cyl(0.25, 0.22, 0.4, mat(0x9a9ea6, { metalness: 0.8, roughness: 0.3 }), BACK + 0.9, Y + 1.25, z0 + 1.6 + i * 1.8, 16);
      for (let i = 0; i < 5; i++) { const l = ball(0.22, glow(0xff6a3a), BACK + 2.4, HT - 0.6, z0 + 1 + i * 1.75); l.scale.set(1, 1.3, 1); }
      const menu = canvasTex(256, 128, (c, cw, ch) => { c.fillStyle = '#1a0e0a'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#f3ead8'; c.font = '22px Georgia, serif'; ['醤油 Shoyu · 8', '味噌 Miso · 9', '辛味噌 Spicy · 10'].forEach((t, i) => c.fillText(t, 14, 34 + i * 36)); });
      plane(2.4, 1.2, new THREE.MeshBasicMaterial({ map: menu }), BACK + 0.02, Y + 2.6, zc, Math.PI / 2);
      for (let i = 0; i < 4; i++) plane(0.28, 0.8, mat(0x1d2a4a, { side: THREE.DoubleSide }), FRONT - 0.15, HT - 1.6, zc - 0.45 + i * 0.3, Math.PI / 2);
      usables.push({ x: BACK + 3.9, z: zc, r: 2.4, label: 'Menya Tsuki: order ramen', use: () => Town.store('ramen') });
    } else if (s.id === 'cafe') {
      counter(BACK + 1.5, z0 + 2.5, 3.5, 0x3a2a20, 0xe6e1d8);
      box(0.5, 0.5, 0.4, mat(0x9a9ea6, { metalness: 0.8, roughness: 0.3 }), BACK + 1.4, Y + 1.3, z0 + 1.6);
      for (let i = 0; i < 4; i++) ball(0.07, mat(0xe8dccb), BACK + 1.5, Y + 1.1, z0 + 2.8 + i * 0.25);
      for (const [x, z] of [[FRONT - 2.2, z0 + 2.2], [FRONT - 2.2, z1 - 2.0], [BACK + 4.0, z1 - 2.2]]) {
        cyl(0.4, 0.4, 0.04, mat(0xe9e1d6, { roughness: 0.3 }), x, Y + 0.75, z, 20); cyl(0.04, 0.04, 0.72, mat(0x111111), x, Y + 0.37, z, 6);
        for (const a of [0, Math.PI]) { cyl(0.18, 0.18, 0.05, mat(0x5b3a24), x + Math.cos(a) * 0.65, Y + 0.46, z + Math.sin(a) * 0.65, 14); }
        cyl(0.04, 0.035, 0.08, mat(0xf2ead8), x, Y + 0.81, z, 12);
        walls.push([x - 0.9, x + 0.9, z - 0.45, z + 0.45]);
      }
      for (let i = 0; i < 6; i++) { ball(0.1, glow(0xffd9a0), BACK + 2 + (i % 3) * 2, HT - 0.7, z0 + 3 + Math.floor(i / 3) * 3); }
      for (const z of [z0 + 0.5, z1 - 0.5]) { cyl(0.2, 0.15, 0.4, mat(0xd8cdbd), BACK + 0.5, Y + 0.2, z, 12); ball(0.4, mat(0x3f7a45), BACK + 0.5, Y + 0.75, z); }
      usables.push({ x: BACK + 2.4, z: z0 + 2.5, r: 2.0, label: 'Kissa Lumen: order', use: () => Town.store('cafe') });
    } else if (s.id === 'florist') {
      for (let i = 0; i < 18; i++) {
        const x = BACK + 0.7 + (i % 3) * 1.4, z = z0 + 0.9 + Math.floor(i / 3) * 1.25;
        cyl(0.22, 0.18, 0.4, mat(0x7a8088, { metalness: 0.5 }), x, Y + 0.2, z, 12);
        const c = new THREE.Color().setHSL([0.95, 0.12, 0.0, 0.8, 0.58, 0.15][i % 6], 0.7, 0.62).getHex();
        for (let k = 0; k < 7; k++) ball(0.07, mat(c, { roughness: 0.8 }), x + rnd(-0.15, 0.15), Y + 0.6 + rnd(0, 0.25), z + rnd(-0.15, 0.15));
        for (let k = 0; k < 4; k++) ball(0.06, mat(0x3f7a45), x + rnd(-0.18, 0.18), Y + 0.5 + rnd(0, 0.2), z + rnd(-0.18, 0.18)).scale.set(1, 0.4, 1);
      }
      walls.push([BACK, BACK + 4.3, z0, z1 - 1.3]);
      counter(FRONT - 1.5, z1 - 1.5, 1.8, 0xe9e1d6, 0x5b3a24);
      usables.push({ x: FRONT - 2.3, z: z1 - 1.5, r: 1.8, label: 'Hanaya: buy flowers', use: () => Town.store('florist') });
    } else if (s.id === 'records') {
      for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
        const x = BACK + 1.5 + r * 2.4, z = z0 + 1.8 + i * 2.4;
        box(1.6, 0.8, 0.9, mat(0x3a2a20), x, Y + 0.4, z);
        for (let k = 0; k < 14; k++) { const rec = box(0.02, 0.32, 0.32, mat(new THREE.Color().setHSL(Math.random(), 0.55, 0.5).getHex()), x - 0.65 + k * 0.1, Y + 0.95, z); rec.rotation.z = -0.25; }
        walls.push([x - 0.85, x + 0.85, z - 0.5, z + 0.5]);
      }
      for (let i = 0; i < 6; i++) plane(0.6, 0.6, mat(new THREE.Color().setHSL(Math.random(), 0.6, 0.45).getHex()), BACK + 0.02, Y + 2.4, z0 + 1 + i * 1.3, Math.PI / 2);
      counter(FRONT - 1.4, z1 - 1.3, 1.8, 0x111522, 0x39c5bb);
      box(0.12, 0.2, 0.3, mat(0xf2f2f2), FRONT - 1.4, Y + 1.15, z1 - 1.0);
      usables.push({ x: FRONT - 2.2, z: z1 - 1.3, r: 1.8, label: 'Kairo Records: browse', use: () => Town.store('records') });
    }
  }

  return { build };
})();
