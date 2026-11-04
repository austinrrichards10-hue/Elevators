// What makes it Tokyo: a scramble crossing in front of the station where the traffic stops,
// the signal chirps and the crowd floods across in every direction at once; a commuter train
// rattling over the streets on its viaduct; stacks of vertical neon signs down the sides of
// the buildings and lit billboards on the rooftops; utility poles with their tangles of wires
// along the side streets; taxis; and cherry petals drifting on the air.

const tokyo = { walk: false, cycle: 0, chirp: 0, train: null, petals: null, signs: [], crossers: null };
const SCRAMBLE = { x: 0, z: 0, wait: 24, walk: 16 };

function buildTokyo(G, towers, rand, rect) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
  const glow = (c, k = 1.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

  /* ---------- The scramble crossing ---------- */
  // Diagonal stripes corner to corner, on top of the ordinary crossings.
  const stripeTex = paintCanvas(64, 256, (g) => { g.clearRect(0, 0, 64, 256); g.fillStyle = 'rgba(245,245,240,.92)'; for (let i = 0; i < 16; i++) g.fillRect(0, i * 16, 64, 9); });
  const stripes = new THREE.MeshStandardMaterial({ map: stripeTex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const a of [Math.PI / 4, -Math.PI / 4]) { const m = add(new THREE.PlaneGeometry(3.2, 15).rotateX(-Math.PI / 2), stripes, SCRAMBLE.x, 0.035, SCRAMBLE.z); m.rotation.y = a; m.receiveShadow = true; }
  // The crowd that waits on the four corners and crosses together.
  const saved = city.group; city.group = G;
  tokyo.crossers = buildCrowd(44);
  city.group = saved;
  const corners = [[-5.1, -5.1], [5.1, -5.1], [5.1, 5.1], [-5.1, 5.1]];
  for (let i = 0; i < 44; i++) {
    const p = addPerson(tokyo.crossers, randomLook(rand));
    const c = i % 4;
    p.corner = c;
    p.x = corners[c][0] + Math.sign(corners[c][0]) * rand() * 0.8;
    p.z = corners[c][1] + Math.sign(corners[c][1]) * rand() * 0.8;
    p.yaw = Math.atan2(-p.x, -p.z);
    p.home = { x: p.x, z: p.z };
  }
  tokyo.corners = corners;

  /* ---------- The elevated railway ---------- */
  const VZ = 100, VY = 8.6;
  const concrete = std(0xb8b4ac, { roughness: 0.9 });
  add(new THREE.BoxGeometry(320, 0.9, 7.4), concrete, 0, VY, VZ).castShadow = true;
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(320, 1.3, 0.25), concrete, 0, VY + 1.1, VZ + s * 3.6);
    add(new THREE.BoxGeometry(320, 0.18, 0.27), glow(0x39c878, 1.2), 0, VY + 1.2, VZ + s * 3.62);
  }
  for (let x = -150; x <= 150; x += 15) {
    if ([-120, -60, 0, 60, 120].some((a) => Math.abs(x - a) < 7)) continue;
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.9, VY, 0.9), concrete, x, VY / 2, VZ + s * 3.6); rect(x - 0.6, x + 0.6, VZ + s * 3.6 - 0.6, VZ + s * 3.6 + 0.6); }
  }
  // Lamps under the deck, so the street beneath isn't a black hole at night.
  for (let x = -142; x <= 142; x += 12) add(new THREE.PlaneGeometry(2.2, 0.35).rotateX(Math.PI / 2), glow(0xffe8c8, 1.3), x, VY - 0.46, VZ);
  // Rails, sleepers and the overhead wires on their gantries.
  const rail = std(0x6a6e76, { metalness: 0.8, roughness: 0.35 });
  for (const tz of [-1.6, 1.6]) for (const r of [-0.55, 0.55]) add(new THREE.BoxGeometry(320, 0.12, 0.08), rail, 0, VY + 0.51, VZ + tz + r);
  for (let x = -150; x <= 150; x += 30) {
    add(new THREE.BoxGeometry(0.2, 4.4, 0.2), rail, x, VY + 2.6, VZ - 3.3);
    add(new THREE.BoxGeometry(0.16, 0.16, 6.8), rail, x, VY + 4.6, VZ);
  }
  for (const tz of [-1.6, 1.6]) add(new THREE.BoxGeometry(320, 0.03, 0.03), std(0x2a2a2a), 0, VY + 4.3, VZ + tz);
  // The train: eight silver cars with a green stripe and a row of lit windows.
  const T = { cars: [], x: -400, dir: 1, track: -1.6, wait: 4, speed: 21, len: 20.5 };
  const winTex = paintCanvas(256, 64, (g) => { g.fillStyle = '#c8ccd2'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#39b86a'; g.fillRect(0, 40, 256, 8); g.fillStyle = '#1a2430'; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 40, 10, 28, 24); g.fillStyle = '#2a3440'; g.fillRect(118, 6, 20, 48); });
  const carMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.35, metalness: 0.6, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0 });
  const endMat = std(0xc8ccd2, { metalness: 0.6, roughness: 0.35 });
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(20, 3.4, 2.9), [endMat, endMat, endMat, endMat, carMat, carMat]);
    m.castShadow = true;
    G.add(m); T.cars.push(m);
  }
  T.mat = carMat;
  tokyo.train = T;

  /* ---------- Vertical neon signs and rooftop billboards ---------- */
  const words = [['カラオケ', '#ff4a8a'], ['居酒屋', '#ffb02a'], ['ラーメン', '#ff3a3a'], ['焼肉', '#ff7a2a'], ['漫画喫茶', '#3ad8ff'], ['ゲーム', '#b47aff'], ['薬', '#3aff9a'], ['寿司', '#ffd83a'], ['書店', '#7affd8'], ['ホテル', '#ff6ad0'], ['不動産', '#8ab8ff'], ['歯科', '#ffffff']];
  const vMats = words.map(([text, color]) => {
    const tex = paintCanvas(64, 256, (g) => {
      g.fillStyle = '#0c0e1a'; g.fillRect(0, 0, 64, 256);
      g.strokeStyle = color; g.lineWidth = 4; g.strokeRect(4, 4, 56, 248);
      g.font = 'bold 44px "Yu Gothic", "Meiryo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...text], step = Math.min(56, 232 / chars.length);
      chars.forEach((ch, k) => { g.shadowColor = color; g.shadowBlur = 12; g.fillStyle = color; g.fillText(ch, 32, 128 - ((chars.length - 1) * step) / 2 + k * step); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(ch, 32, 128 - ((chars.length - 1) * step) / 2 + k * step); });
    });
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide });
    tokyo.signs.push(m);
    return m;
  });
  const avenues = [-120, -60, 0, 60, 120];
  let k = 0;
  for (const [cx, cz, w, h, d, y0] of towers) {
    if (y0 || cz > 150 || Math.abs(cx) > 140 || h < 14 || lotTaken(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2)) continue;
    // Down the face towards the nearest avenue, sticking out over the pavement.
    const ax = avenues.reduce((b, a) => (Math.abs(a - cx) < Math.abs(b - cx) ? a : b));
    const side = Math.sign(ax - cx) || 1, faceX = cx + side * w / 2;
    if (Math.abs(faceX - ax) > 12) continue;
    for (let n = 0; n < (rand() < 0.5 ? 2 : 1); n++) {
      const z = cz + (rand() - 0.5) * d * 0.7, hgt = 4.5 + rand() * 3, y = 4.2 + rand() * Math.min(10, h - 10) + hgt / 2;
      const sign = add(new THREE.PlaneGeometry(1.3, hgt), vMats[k++ % vMats.length], faceX + side * 0.9, y, z);
      sign.rotation.y = Math.PI / 2;
      add(new THREE.BoxGeometry(0.9, 0.08, 0.08), std(0x2a2c34), faceX + side * 0.45, y + hgt / 2 - 0.3, z);
    }
  }
  // Billboards on the rooftops, lit, facing the station.
  const ads = [['TOKYO COLA', '#e8303a', '#fff'], ['STAR PHONE 9', '#2a6aff', '#fff'], ['アニメフェス', '#ff8ab8', '#1a1030'], ['RAMEN GO', '#ffb02a', '#2a1000'], ['ゲームセンター', '#7a3aff', '#fff'], ['SKY AIR', '#39d5c8', '#04202a'], ['夏祭り', '#ff5a2a', '#fff'], ['BEAT HEADPHONES', '#111', '#ff2d55']];
  let a = 0;
  for (const [cx, cz, w, h, d, y0] of towers) {
    if (y0 || cz > 150 || Math.abs(cx) > 140 || h < 24 || h > 70 || rand() > 0.22 || lotTaken(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2)) continue;
    const [text, bg, fg] = ads[a++ % ads.length];
    const bw = Math.min(w * 0.85, 14), bh = bw * 0.38, top = h;
    const tex = paintCanvas(512, 196, (g) => { const gr = g.createLinearGradient(0, 0, 512, 196); gr.addColorStop(0, bg); gr.addColorStop(1, '#0c0c18'); g.fillStyle = gr; g.fillRect(0, 0, 512, 196); g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) g.fillRect(0, i * 36, 512, 10); g.fillStyle = fg; g.font = 'bold 68px "Yu Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 100, 480); });
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    tokyo.signs.push(m);
    const b = add(new THREE.PlaneGeometry(bw, bh), m, cx, top + bh / 2 + 1.2, cz - d / 2 + 1.2);
    b.rotation.y = Math.PI;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.2, 1.4 + bh / 2, 0.2), std(0x3a3e48, { metalness: 0.6 }), cx + s * bw * 0.4, top + 0.7, cz - d / 2 + 1.35);
  }

  /* ---------- Utility poles and their wires down the side streets ---------- */
  const poleMat = std(0x9a9890, { roughness: 0.9 });
  const wirePts = [];
  for (const sz of [-50, 50]) {
    let last = null;
    for (let x = -118; x <= 118; x += 21) {
      if (avenues.some((av) => Math.abs(x - av) < 8)) { last = null; continue; }
      const z = sz + 5.3;
      if (lotTaken(x - 0.5, x + 0.5, z - 0.5, z + 0.5) || (Math.abs(x) < 30 && z < -4 && z > -48)) { last = null; continue; }
      add(new THREE.CylinderGeometry(0.13, 0.17, 9, 8), poleMat, x, 4.5, z);
      add(new THREE.BoxGeometry(0.12, 0.12, 1.8), poleMat, x, 8.2, z);
      add(new THREE.BoxGeometry(0.12, 0.12, 1.4), poleMat, x, 7.5, z);
      if (rand() < 0.4) add(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 10), std(0x8a8e94), x + 0.35, 6.4, z);
      rect(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
      if (last) for (const [dz, y] of [[-0.8, 8.25], [0.8, 8.25], [-0.6, 7.55], [0.6, 7.55], [0, 6.9]]) {
        const steps = 6;
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps, t1 = (s + 1) / steps, sag = (t) => 0.55 * 4 * t * (1 - t);
          wirePts.push(lerp(last, x, t0), y - sag(t0), z + dz, lerp(last, x, t1), y - sag(t1), z + dz);
        }
      }
      last = x;
    }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
  G.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x1a1a1e })));

  /* ---------- Cherry petals on the air ---------- */
  const pn = 420, pp = new Float32Array(pn * 3), pv = new Float32Array(pn * 3);
  for (let i = 0; i < pn; i++) pp.set([(rand() - 0.5) * 60, rand() * 14, (rand() - 0.5) * 60], i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const petals = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffc8dc, size: 0.13, transparent: true, opacity: 0.85, depthWrite: false }));
  petals.frustumCulled = false;
  G.add(petals);
  tokyo.petals = { points: petals, vel: pv };
}

/* ---------- Each frame ---------- */
function updateTokyo(dt) {
  const T = tokyo;
  if (!T.train) return;
  const night = 1 - (dayNight.light === undefined ? 1 : dayNight.light);
  for (const m of T.signs) m.color.setScalar(0.5 + night * 1.0);
  // The crossing: the traffic stops, everyone goes at once, then the cars again.
  T.cycle = (T.cycle + dt) % (SCRAMBLE.wait + SCRAMBLE.walk);
  const walk = T.cycle > SCRAMBLE.wait;
  if (walk && !T.walk) for (const p of T.crossers.people) {
    // Across, or corner to corner, all of them together.
    const to = (p.corner + [1, 2, 3, 2][p.i % 4]) % 4;
    const [cx, cz] = T.corners[to];
    p.pending = { x: cx + Math.sign(cx) * Math.random() * 0.8, z: cz + Math.sign(cz) * Math.random() * 0.8 };
    p.corner = to;
    p.delay = Math.random() * 1.5;
  }
  T.walk = walk;
  for (const p of T.crossers.people) {
    if (p.pending) { p.delay -= dt; if (p.delay <= 0) { p.target = p.pending; p.pending = null; } }
  }
  poseCrowd(T.crossers, dt);
  // The "piyo piyo" of the walk signal, near enough to hear.
  const near = Math.hypot(player.pos.x - SCRAMBLE.x, player.pos.z - SCRAMBLE.z) < 34 && !city.inside;
  T.chirp -= dt;
  if (walk && near && T.chirp <= 0 && Sfx.ctx) { T.chirp = 0.55; crossingChirp(); }
  // The train: over the city, gone, and back the other way.
  const tr = T.train;
  if (tr.wait > 0) { tr.wait -= dt; for (const c of tr.cars) c.visible = false; }
  else {
    tr.x += tr.dir * tr.speed * dt;
    tr.cars.forEach((c, i) => { c.visible = true; c.position.set(tr.x - tr.dir * i * tr.len, 8.6 + 0.55 + 1.7, 100 + tr.track); });
    if (Math.abs(tr.x) > 420) { tr.dir *= -1; tr.track *= -1; tr.x = -tr.dir * 400; tr.wait = 18 + Math.random() * 20; }
    tr.mat.emissiveIntensity = night * 0.6;
    trainSound(tr);
  }
  // Petals drifting round her, carried on the breeze.
  const P = T.petals, pos = P.points.geometry.attributes.position.array;
  P.points.position.set(player.pos.x, 0, player.pos.z);
  P.points.visible = !city.inside;
  const t = game.time;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += (0.6 + Math.sin(t * 0.7 + i) * 0.5) * dt;
    pos[i + 1] -= (0.5 + (i % 7) * 0.05) * dt;
    pos[i + 2] += Math.cos(t * 0.5 + i * 0.3) * 0.4 * dt;
    if (pos[i + 1] < 0) { pos[i + 1] = 12 + Math.random() * 3; pos[i] = (Math.random() - 0.5) * 60; pos[i + 2] = (Math.random() - 0.5) * 60; }
    if (pos[i] > 30) pos[i] -= 60;
  }
  P.points.geometry.attributes.position.needsUpdate = true;
}

// Cars wait at the scramble while the people cross.
function scrambleStops(car, x, z) {
  if (!tokyo.walk) return false;
  const onIt = car.alongZ ? Math.abs(x - SCRAMBLE.x) < 5 : Math.abs(z - SCRAMBLE.z) < 5;
  if (!onIt) return false;
  const ahead = car.alongZ ? (SCRAMBLE.z - z) * car.dir : (SCRAMBLE.x - x) * car.dir;
  return ahead > 7 && ahead < 18;
}

function crossingChirp() {
  const ctx = Sfx.ctx, t = ctx.currentTime;
  for (const [at, f0, f1] of [[0, 2900, 2300], [0.13, 2900, 2300]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + 0.08);
    g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(0.035, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.09);
    o.connect(g).connect(Sfx.master); o.start(t + at); o.stop(t + at + 0.1);
  }
}

// The rumble and clatter of the train, louder the closer it passes.
function trainSound(tr) {
  const ctx = Sfx.ctx;
  if (!ctx || !Sfx.noise) return;
  if (!tr.sound) {
    const s = ctx.createBufferSource(); s.buffer = Sfx.noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f).connect(g).connect(Sfx.master); s.start();
    tr.sound = { g, f };
  }
  const mid = tr.x - tr.dir * 3.5 * tr.len;
  const d = Math.hypot(player.pos.x - mid, player.pos.z - 100);
  const level = city.inside || show.active ? 0 : Math.max(0, 1 - d / 140) * 0.22;
  tr.sound.g.gain.setTargetAtTime(level * (0.8 + 0.2 * Math.sin(game.time * 22)), ctx.currentTime, 0.1);
}
function stopTokyoSounds() { const s = tokyo.train && tokyo.train.sound; if (s) s.g.gain.setTargetAtTime(0, Sfx.ctx.currentTime, 0.1); }
