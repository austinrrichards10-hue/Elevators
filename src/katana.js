// The Ember Blade: the miners' star-iron katana from the Frozen Altar, ten feet of it, and
// still burning after fifty years under the ice. A cheat: the Konami code, or typing
// "hotblade", puts it in her hands. A slash cuts down every tree and creature in a wide arc
// in front of her and splits fallen logs into planks at a stroke, and while she holds it
// she never gets cold. Everything here is built in code.

/* ---------- Config ---------- */
const KATANA = {
  blade: 2.55, // metres, guard to tip; with the guard and grip it's 3.05 m, ten feet
  width: 0.1, // edge to spine at the base
  thick: 0.026,
  sori: 0.13, // how far the tip curves back towards the spine
  handR: -0.09, // where each fist sits on the grip, below the guard
  handL: -0.3,
  swing: 0.55, // seconds per slash
  reach: 4.5, // trunks and creatures this close are cut
  arc: (220 / 180) * Math.PI, // ...in this wide an arc in front of her
  cutFrom: 0.3, // the part of the slash, 0-1, where the blade is cutting
  cutTo: 0.68,
  warmth: 6, // per second while she holds it
  light: 7, // the blade's firelight
  clearance: 0.14, // the tip never sinks closer than this to the snow
  flames: 240, // wisps of flame breaking off
  embers: 80,
  trail: 44, // samples kept for the slash's ribbon of flame
  trailLife: 0.17,
};
// The Konami code and "hotblade", as key codes; key codes ignore case.
const KATANA_CHEATS = [
  ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'],
  [...'HOTBLADE'].map((c) => `Key${c}`),
];

/* ---------- State ---------- */
const katana = {
  owned: false,
  swing: null, // { t 0-1, dir, from (pose), trees in reach, felled, killed, planks... } while slashing
  side: 1, // which way the next slash goes: 1 sweeps right to left, -1 back again
  out: false, // in her hands this frame
  ignite: 0, // 0-1 as the flames run up the blade after she draws it
  flourish: 0, // seconds left of holding it up, the first time she takes it
  hitStop: 0, // the stroke hangs for a moment when it bites
  heat: 0, // extra glow while slashing
  lift: 0, // pitch added to keep the tip out of the snow
  pose: null, // where the blade is now, eased towards rest between strokes
  cheat: [], // the last few keys pressed
  model: null, // { group, blade, sheath, mats }, carried in her chest's space
  flames: null, // particle pools, the blaze sheets and the slash ribbon, all in world space
  embers: null,
  blaze: null,
  trail: null,
  light: null,
  roar: null, // the flames' looping sound
  roarLevel: 0,
};

/* ---------- The blade's shape ---------- */
// Size and place of the blade's cross-section at s (0 at the guard, 1 at the tip), in the
// blade's own space: it runs up +Y, the edge faces +Z and the spine -Z. The spine curves
// back towards -Z, and in the last stretch the edge sweeps up to meet it in a rounded point.
const katanaSection = { spine: 0, width: 0, thick: 0 };
function katanaBladeAt(s) {
  const tip = THREE.MathUtils.clamp((s - 0.88) / 0.12, 0, 1);
  const round = Math.sqrt(Math.max(0, 1 - tip * tip));
  katanaSection.spine = -KATANA.width / 2 - KATANA.sori * s * s;
  katanaSection.width = lerp(KATANA.width, KATANA.width * 0.7, s) * round;
  katanaSection.thick = lerp(KATANA.thick, KATANA.thick * 0.6, s) * Math.sqrt(round);
  return katanaSection;
}

// The blade itself: a ridged section (edge, the ridge line either side, the spine) swept
// along the curve. Each face is its own strip so the ridges stay crisp. UVs run across from
// the edge (u 0) to the spine (u 1) and along from the guard (v 0) to the tip (v 1).
function buildKatanaBladeGeometry() {
  const L = KATANA.blade, stations = 56;
  const ring = (s) => {
    const { spine, width, thick } = katanaBladeAt(s);
    const edge = spine + width, ridge = spine + width * 0.3;
    // [x, z, u] for edge, right ridge, right spine, left spine, left ridge.
    return [[0, edge, 0], [thick / 2, ridge, 0.7], [thick * 0.28, spine, 1], [-thick * 0.28, spine, 1], [-thick / 2, ridge, 0.7]];
  };
  const rings = [];
  for (let i = 0; i <= stations; i++) rings.push(ring(i / stations));
  const positions = [], uvs = [], index = [];
  for (let face = 0; face < 5; face++) {
    const base = positions.length / 3;
    for (let i = 0; i <= stations; i++) {
      const s = i / stations, a = rings[i][face], b = rings[i][(face + 1) % 5];
      positions.push(a[0], s * L, a[1], b[0], s * L, b[1]);
      uvs.push(a[2], s, b[2], s);
    }
    for (let i = 0; i < stations; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// A smooth, slightly larger shell round the blade, for the heat glowing off it.
function buildKatanaSheathGeometry() {
  const L = KATANA.blade * 1.025, stations = 40, sides = 10, pad = 0.035;
  const positions = [], uvs = [], index = [];
  for (let i = 0; i <= stations; i++) {
    const s = i / stations;
    const { spine, width, thick } = katanaBladeAt(Math.min(1, s));
    const cz = spine + width / 2;
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      positions.push(Math.cos(a) * (thick / 2 + pad), s * L, cz + Math.sin(a) * (width / 2 + pad));
      uvs.push(k / sides, s);
    }
  }
  for (let i = 0; i < stations; i++) {
    for (let k = 0; k < sides; k++) {
      const a = i * sides + k, b = i * sides + ((k + 1) % sides), c = a + sides, d = b + sides;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Textures ---------- */
function katanaCanvas(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Star-iron: dark metal crossed by the fine interlocking crystals of meteoric iron, with a
// wavy temper line along the edge. The glow map makes the edge white-hot, the temper line
// molten orange and the crystal lines smoulder in the body.
function katanaBladeTextures() {
  const W = 64, H = 1024;
  const rand = seededRandom(1934);
  const lines = [];
  // Across the blade a texel is a little shorter than along it, hence the squash in y.
  for (let i = 0; i < 1400; i++) {
    const angle = [0.5, 1.55, 2.6][i % 3] + (rand() - 0.5) * 0.1;
    const len = 3 + rand() * 9;
    lines.push({ x: rand() * W, y: rand() * H, dx: Math.cos(angle) * len, dy: Math.sin(angle) * len * 0.65, w: 0.5 + rand() * 0.7 });
  }
  // Where the hardened edge gives way to the body, across from the edge (x 0).
  const temper = (y) => W * (0.3 + Math.sin(y * 0.21) * 0.035 + Math.sin(y * 0.57 + 1.2) * 0.02);
  const paint = (g, glow) => {
    g.fillStyle = glow ? '#1c0500' : '#2e2b2a';
    g.fillRect(0, 0, W, H);
    for (const l of lines) {
      g.strokeStyle = glow ? `rgba(255, 90, 10, ${0.22 + l.w * 0.25})` : `rgba(120, 114, 106, ${0.3 + l.w * 0.3})`;
      g.lineWidth = l.w;
      g.beginPath();
      g.moveTo(l.x, l.y);
      g.lineTo(l.x + l.dx, l.y + l.dy);
      g.stroke();
    }
    for (let y = 0; y < H; y++) {
      const edge = temper(y);
      const grad = g.createLinearGradient(0, 0, edge * 1.25, 0);
      if (glow) {
        grad.addColorStop(0, '#fffbe8');
        grad.addColorStop(0.1, '#ffe08a');
        grad.addColorStop(0.55, '#ff9a30');
        grad.addColorStop(0.8, 'rgba(255, 90, 10, 0.65)');
        grad.addColorStop(1, 'rgba(120, 20, 0, 0)');
      } else {
        grad.addColorStop(0, '#f2ece2');
        grad.addColorStop(0.78, '#d0c6b8');
        grad.addColorStop(1, 'rgba(160, 150, 140, 0)');
      }
      g.fillStyle = grad;
      g.fillRect(0, y, edge * 1.25, 1);
    }
  };
  return { color: katanaCanvas(W, H, (g) => paint(g, false)), glow: katanaCanvas(W, H, (g) => paint(g, true)) };
}

// Black silk wrapped over pale ray-skin, leaving a column of diamonds down the grip.
function katanaWrapTexture() {
  const texture = katanaCanvas(64, 128, (g, w, h) => {
    g.fillStyle = '#ddd4c2';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(150, 138, 118, ${Math.random() * 0.5})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    g.strokeStyle = '#17110f';
    g.lineWidth = 20;
    for (let k = -2; k <= 4; k++) {
      g.beginPath(); g.moveTo(0, k * 32); g.lineTo(w, k * 32 + 32); g.stroke();
      g.beginPath(); g.moveTo(w, k * 32); g.lineTo(0, k * 32 + 32); g.stroke();
    }
    g.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    g.lineWidth = 2;
    for (let k = -2; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 32 - 6); g.lineTo(w, k * 32 + 26); g.stroke(); }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 7);
  return texture;
}

/* ---------- Models ---------- */
// The whole sword, in the blade's space: the guard at the origin, the blade up +Y with its
// edge to +Z, and the grip running down -Y to the pommel at 0.5 m.
function buildKatanaModel() {
  const tex = katanaBladeTextures();
  const mats = {
    blade: new THREE.MeshStandardMaterial({ map: tex.color, emissiveMap: tex.glow, emissive: 0xffffff, emissiveIntensity: 2.4, metalness: 0.6, roughness: 0.3 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x24201e, metalness: 0.85, roughness: 0.45, emissive: 0x3c0d00, emissiveIntensity: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc0903e, metalness: 1, roughness: 0.3 }),
    wrap: new THREE.MeshStandardMaterial({ map: katanaWrapTexture(), roughness: 0.85 }),
    sheath: new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vN; varying vec3 vView; varying float vS;
        void main() {
          vS = uv.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = -mv.xyz;
          vN = normalMatrix * normal;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform float uHeat;
        varying vec3 vN; varying vec3 vView; varying float vS;
        void main() {
          float rim = 1.0 - abs(dot(normalize(vN), normalize(vView)));
          // Tongues of heat running up the blade.
          float lick = 0.55 + 0.45 * sin(vS * 41.0 - uTime * 15.0) * sin(vS * 17.0 - uTime * 8.0 + 1.3);
          float a = (0.25 + pow(rim, 1.5)) * lick * uHeat * smoothstep(0.0, 0.06, vS) * (1.0 - smoothstep(0.95, 1.0, vS));
          gl_FragColor = vec4(vec3(1.5, 0.42, 0.07) * a, 1.0);
        }`,
    }),
  };
  const group = new THREE.Group();
  const part = (geo, mat, y = 0, shadow = true) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.castShadow = shadow;
    group.add(mesh);
    return mesh;
  };
  const blade = part(buildKatanaBladeGeometry(), mats.blade);
  const sheath = part(buildKatanaSheathGeometry(), mats.sheath, 0, false);
  sheath.renderOrder = 2;
  // The collar that seats the blade in the guard.
  part(new THREE.BoxGeometry(KATANA.thick + 0.014, 0.07, KATANA.width + 0.014), mats.brass, 0.035);
  // The guard: a four-lobed iron plate with two openings, lying across the blade.
  const shape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r = 0.118 - 0.014 * Math.pow(Math.abs(Math.sin(a * 2)), 2.5);
    if (i === 0) shape.moveTo(r * 0.92, 0); else shape.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r);
  }
  for (const side of [-1, 1]) {
    const hole = new THREE.Path();
    hole.absellipse(side * 0.055, 0, 0.014, 0.03, 0, Math.PI * 2, false, 0);
    shape.holes.push(hole);
  }
  const guardGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 6 })
    .rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(0, -0.015, 0);
  part(guardGeo, mats.iron);
  // Collar, wrapped grip and pommel cap, a little oval like a real handle.
  const oval = (geo) => geo.scale(0.8, 1, 1);
  part(oval(new THREE.CylinderGeometry(0.035, 0.034, 0.025, 16)), mats.brass, -0.03);
  part(oval(new THREE.CylinderGeometry(0.032, 0.034, 0.41, 16)), mats.wrap, -0.2475);
  part(oval(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16)), mats.iron, -0.4675);
  part(oval(new THREE.SphereGeometry(0.035, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)).scale(1, 0.5, 1), mats.iron, -0.4825);
  group.visible = false;
  return { group, blade, sheath, mats };
}

/* ---------- Flames ---------- */
// A soft tongue of flame, pointed at the top: particles rise, so the point leads.
function katanaFlameTexture() {
  const texture = katanaCanvas(64, 64, (g) => {
    g.filter = 'blur(2px)';
    const grad = g.createRadialGradient(32, 42, 2, 32, 40, 24);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(32, 4);
    g.bezierCurveTo(40, 22, 54, 34, 50, 46);
    g.bezierCurveTo(46, 60, 18, 60, 14, 46);
    g.bezierCurveTo(10, 34, 24, 22, 32, 4);
    g.fill();
  });
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

// A pool of soft additive particles in world space. Each is born somewhere along the blade
// and left behind as it moves, so a slash drags a sheet of fire after it.
// Flames are drawn over the snow normally, with their own alpha, so they read as fire against
// white; embers simply add their light.
function buildKatanaFire(count, size, additive, map) {
  const pos = new Float32Array(count * 3).fill(-9999), col = new Float32Array(count * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size, map, vertexColors: true, transparent: true, depthWrite: false, fog: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  points.frustumCulled = false;
  scene.add(points);
  return { points, geo, pos, col, vel: new Float32Array(count * 3), life: new Float32Array(count), max: new Float32Array(count).fill(1), count, next: 0, carry: 0, alive: 0 };
}

const katanaSpawn = new THREE.Vector3();
// Lets `rate` particles a second off the lit part of the blade.
function katanaEmit(fire, rate, dt, life, rise, spread) {
  fire.carry += rate * dt;
  const m = katana.model.group.matrixWorld;
  while (fire.carry >= 1) {
    fire.carry--;
    const i = fire.next = (fire.next + 1) % fire.count;
    const s = 0.04 + Math.pow(Math.random(), 0.8) * 0.97 * katana.ignite;
    const { spine, width, thick } = katanaBladeAt(Math.min(1, s));
    katanaSpawn.set((Math.random() - 0.5) * thick * 3, s * KATANA.blade, spine + width * (0.15 + Math.random() * 1.0)).applyMatrix4(m);
    fire.pos[i * 3] = katanaSpawn.x;
    fire.pos[i * 3 + 1] = katanaSpawn.y;
    fire.pos[i * 3 + 2] = katanaSpawn.z;
    fire.vel[i * 3] = (Math.random() - 0.5) * spread;
    fire.vel[i * 3 + 1] = rise * (0.6 + Math.random() * 0.8);
    fire.vel[i * 3 + 2] = (Math.random() - 0.5) * spread;
    fire.life[i] = fire.max[i] = life * (0.6 + Math.random() * 0.8);
    fire.alive++;
  }
}

// Flames rise, slow and cool from yellow-white through orange to a dull red, then go out.
// `hot` is for the embers: they wander as they rise and stay yellow.
function katanaTickFire(fire, dt, hot) {
  // Nothing burning: nothing to do, or to send to the GPU.
  if (!fire.alive) return;
  let alive = 0;
  const drag = Math.exp(-2.5 * dt);
  for (let i = 0; i < fire.count; i++) {
    if (fire.life[i] <= 0) continue;
    fire.life[i] -= dt;
    const k = i * 3;
    if (fire.life[i] <= 0) { fire.pos[k + 1] = -9999; fire.col.fill(0, i * 4, i * 4 + 4); continue; }
    alive++;
    fire.vel[k] *= drag;
    fire.vel[k + 2] *= drag;
    fire.vel[k + 1] += (hot ? 0.4 : 1.6) * dt;
    if (hot) { fire.vel[k] += (Math.random() - 0.5) * 3 * dt; fire.vel[k + 2] += (Math.random() - 0.5) * 3 * dt; }
    fire.pos[k] += fire.vel[k] * dt;
    fire.pos[k + 1] += fire.vel[k + 1] * dt;
    fire.pos[k + 2] += fire.vel[k + 2] * dt;
    const h = fire.life[i] / fire.max[i];
    const c = i * 4;
    if (hot) {
      fire.col[c] = 2.4 * h;
      fire.col[c + 1] = 1.1 * h;
      fire.col[c + 2] = 0.3 * h * h;
      fire.col[c + 3] = 1;
    } else {
      // Yellow at birth, orange, then a deep red as it thins out.
      const young = smooth((h - 0.55) / 0.45), old = smooth(h / 0.5);
      fire.col[c] = lerp(lerp(0.7, 2.4, old), 3, young);
      fire.col[c + 1] = lerp(lerp(0.07, 0.6, old), 1.4, young);
      fire.col[c + 2] = lerp(0.01, 0.3, young * young);
      fire.col[c + 3] = Math.min(1, (1 - h) * 10) * Math.min(1, h * 2.2) * 0.85;
    }
  }
  fire.alive = alive;
  fire.geo.attributes.position.needsUpdate = true;
  fire.geo.attributes.color.needsUpdate = true;
}

function katanaClearFire(fire) {
  fire.life.fill(0);
  fire.pos.fill(-9999);
  fire.col.fill(0);
  fire.carry = 0;
  fire.alive = 0;
  fire.geo.attributes.position.needsUpdate = true;
  fire.geo.attributes.color.needsUpdate = true;
}

/* ---------- The blaze ---------- */
// Sheets of procedural fire standing on the blade: two strips crossed along it, their tops
// rising in the world's up and leaning back against the blade's motion, so a slash drags
// the flames out behind it. A noise shader cuts them into tongues that climb and flicker.
const KATANA_BLAZE = { stations: 30, height: 0.36, lean: 0.045, maxLean: 0.6, spread: 0.55 };
function buildKatanaBlaze() {
  const n = KATANA_BLAZE.stations + 1;
  const pos = new Float32Array(2 * n * 2 * 3), uv = [], index = [];
  for (let strip = 0; strip < 2; strip++) {
    for (let i = 0; i < n; i++) uv.push(i / (n - 1) + strip * 0.37, 0, i / (n - 1) + strip * 0.37, 1);
    const base = strip * n * 2;
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uPower; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main() {
        float s = fract(vUv.x), y = vUv.y;
        vec2 q = vec2(vUv.x * 24.0, y * 2.4 - uTime * 3.4);
        float n = fbm(q + vec2(0.0, fbm(q * 0.6 + uTime * 0.7) * 1.3));
        float body = n * 1.3 - y * 1.05;
        float ends = smoothstep(0.0, 0.05, s) * smoothstep(1.0, 0.93, s);
        float a = smoothstep(0.04, 0.3, body) * ends * min(uPower, 1.0);
        float h = clamp(body * 2.0, 0.0, 1.0);
        vec3 c = mix(vec3(0.8, 0.09, 0.01), vec3(2.6, 0.72, 0.08), smoothstep(0.0, 0.45, h));
        c = mix(c, vec3(3.3, 2.1, 0.85), smoothstep(0.55, 1.0, h));
        gl_FragColor = vec4(c * (0.8 + 0.2 * uPower), a * 0.92);
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, geo, pos, material, prev: new Float32Array(n * 3), walked: new THREE.Vector3(), primed: false };
}

const katanaBase = new THREE.Vector3(), katanaRise = new THREE.Vector3(), katanaAcross = new THREE.Vector3(), katanaLean = new THREE.Vector3();
const katanaAxis = new THREE.Vector3(), katanaSheet = new THREE.Vector3(), katanaWorldUp = new THREE.Vector3(0, 1, 0);
function katanaTickBlaze(dt, lit) {
  const blaze = katana.blaze, B = KATANA_BLAZE;
  blaze.mesh.visible = lit;
  if (!lit) { blaze.primed = false; return; }
  const m = katana.model.group.matrixWorld;
  katanaAxis.set(m.elements[4], m.elements[5], m.elements[6]).normalize();
  // Up, square to the blade, turned a little towards the camera; held upright, the camera
  // side is all that's left, so the flames never fold flat.
  katanaRise.copy(katanaWorldUp).addScaledVector(katanaAxis, -katanaAxis.y);
  katanaSheet.subVectors(camera.position, katanaBase.setFromMatrixPosition(m));
  katanaSheet.addScaledVector(katanaAxis, -katanaSheet.dot(katanaAxis)).normalize();
  katanaRise.addScaledVector(katanaSheet, 0.3).normalize();
  katanaAcross.crossVectors(katanaAxis, katanaRise).normalize();
  const n = B.stations + 1, power = katana.ignite;
  // Her own walking hardly bends them; it's the blade's swing through the air that does.
  const walkX = (player.pos.x - blaze.walked.x) * 0.85, walkY = (player.pos.y - blaze.walked.y) * 0.85, walkZ = (player.pos.z - blaze.walked.z) * 0.85;
  blaze.walked.copy(player.pos);
  for (let i = 0; i < n; i++) {
    const s = 0.03 + (i / (n - 1)) * 0.97;
    const { spine, width } = katanaBladeAt(s);
    katanaBase.set(0, s * KATANA.blade, spine + width / 2).applyMatrix4(m);
    // How fast this part of the blade moves, from where it was last frame.
    katanaLean.set(0, 0, 0);
    if (blaze.primed && dt > 0) {
      katanaLean.set(blaze.prev[i * 3] + walkX - katanaBase.x, blaze.prev[i * 3 + 1] + walkY - katanaBase.y, blaze.prev[i * 3 + 2] + walkZ - katanaBase.z).multiplyScalar(B.lean / dt);
      if (katanaLean.length() > B.maxLean) katanaLean.setLength(B.maxLean);
    }
    blaze.prev[i * 3] = katanaBase.x;
    blaze.prev[i * 3 + 1] = katanaBase.y;
    blaze.prev[i * 3 + 2] = katanaBase.z;
    // The flames run up from the guard as it lights, and stand a little taller towards the tip.
    const grown = smooth((power * 1.15 - s) / 0.15);
    const h = B.height * (0.55 + 0.45 * smooth(s / 0.3)) * grown;
    for (let strip = 0; strip < 2; strip++) {
      const a = strip ? -B.spread : B.spread;
      katanaSheet.copy(katanaRise).multiplyScalar(Math.cos(a)).addScaledVector(katanaAcross, Math.sin(a));
      const k = (strip * n + i) * 6;
      blaze.pos[k] = katanaBase.x - katanaSheet.x * 0.04;
      blaze.pos[k + 1] = katanaBase.y - katanaSheet.y * 0.04;
      blaze.pos[k + 2] = katanaBase.z - katanaSheet.z * 0.04;
      blaze.pos[k + 3] = katanaBase.x + katanaSheet.x * h + katanaLean.x * grown;
      blaze.pos[k + 4] = katanaBase.y + katanaSheet.y * h + katanaLean.y * grown;
      blaze.pos[k + 5] = katanaBase.z + katanaSheet.z * h + katanaLean.z * grown;
    }
  }
  blaze.primed = true;
  blaze.geo.attributes.position.needsUpdate = true;
  blaze.material.uniforms.uTime.value = game.time;
  blaze.material.uniforms.uPower.value = power * (1 + katana.heat * 0.5);
}

/* ---------- Slash trail ---------- */
// A ribbon of fire swept out by the blade: three rows of points (halfway along the blade,
// just short of the tip, and a little past it), newest first, fading as they age.
const KATANA_TRAIL_ROWS = [0.5, 0.88, 1.05];
function buildKatanaTrail() {
  const n = KATANA.trail, rows = KATANA_TRAIL_ROWS.length;
  const pos = new Float32Array(n * rows * 3), col = new Float32Array(n * rows * 4);
  const index = [];
  for (let k = 0; k < n - 1; k++) {
    for (let r = 0; r < rows - 1; r++) {
      const a = k * rows + r, b = a + 1, c = a + rows, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(index);
  geo.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, geo, pos, col, age: new Float32Array(n), size: 0 };
}

// Adds the blade's place at one instant, given its world matrix.
const katanaRowPoint = new THREE.Vector3();
function katanaTrailAdd(matrix) {
  const trail = katana.trail, rows = KATANA_TRAIL_ROWS.length, stride = rows * 3;
  trail.pos.copyWithin(stride, 0, (KATANA.trail - 1) * stride);
  trail.age.copyWithin(1, 0, KATANA.trail - 1);
  KATANA_TRAIL_ROWS.forEach((s, r) => {
    const { spine, width } = katanaBladeAt(Math.min(1, s));
    katanaRowPoint.set(0, s * KATANA.blade, spine + width * 0.5).applyMatrix4(matrix);
    trail.pos[r * 3] = katanaRowPoint.x;
    trail.pos[r * 3 + 1] = katanaRowPoint.y;
    trail.pos[r * 3 + 2] = katanaRowPoint.z;
  });
  trail.age[0] = 0;
  trail.size = Math.min(KATANA.trail, trail.size + 1);
}

// [r, g, b, alpha] per row: clear at the inner blade, a white-hot band near the tip, a soft
// orange fringe fading out beyond it.
const KATANA_TRAIL_COLOURS = [[2.4, 0.6, 0.06, 0], [3.8, 1.7, 0.4, 0.9], [2.6, 0.55, 0.05, 0]];
function katanaTickTrail(dt) {
  const trail = katana.trail, rows = KATANA_TRAIL_ROWS.length;
  if (!trail.size) return;
  let size = 0;
  for (let k = 0; k < trail.size; k++) {
    trail.age[k] += dt;
    const fade = Math.max(0, 1 - trail.age[k] / KATANA.trailLife);
    if (fade > 0) size = k + 1;
    // The newest sample sits on the blade; let it fade in so the ribbon doesn't cover it.
    const f = fade * fade * Math.min(1, k / 2 + 0.25);
    for (let r = 0; r < rows; r++) {
      const c = KATANA_TRAIL_COLOURS[r], at = (k * rows + r) * 4;
      trail.col[at] = c[0];
      trail.col[at + 1] = c[1];
      trail.col[at + 2] = c[2];
      trail.col[at + 3] = c[3] * f;
    }
  }
  trail.size = size;
  trail.geo.setDrawRange(0, Math.max(0, size - 1) * (rows - 1) * 6);
  trail.geo.attributes.position.needsUpdate = true;
  trail.geo.attributes.color.needsUpdate = true;
}

/* ---------- Poses ---------- */
// A pose of the sword in her chest's space: which way the blade points (yaw round from
// straight ahead towards her left, pitch up), how its edge is turned (roll 0 leads to her
// left, pi/2 faces down, pi leads to her right), where her hands hold it (handYaw and
// handDist round her, handY from the shoulders) and how far her body twists into it.
const KATANA_FIELDS = ['yaw', 'pitch', 'roll', 'handYaw', 'handDist', 'handY', 'twist'];
const katanaDeg = (d) => (d / 180) * Math.PI;
// At rest she carries it low at her right side, the tip trailing back over the snow.
const KATANA_REST = { yaw: katanaDeg(-128), pitch: katanaDeg(-15), roll: Math.PI / 2, handYaw: katanaDeg(-68), handDist: 0.15, handY: -0.3, twist: 0 };
// The first time she takes it, she holds it up to look at it.
const KATANA_RAISED = { yaw: katanaDeg(-20), pitch: katanaDeg(68), roll: katanaDeg(80), handYaw: katanaDeg(-28), handDist: 0.22, handY: -0.02, twist: -0.15 };
// A slash from her right to her left as [time 0-1, pose]: coil back over the right
// shoulder, sweep down through the front, tilted a little so the cut shows from behind her,
// and follow through round to the left. Her arms are short for a blade this long, so her
// hands stay close and the body's twist does much of the work. The slash
// back the other way is its mirror image.
const KATANA_SLASH = [
  [0, { yaw: katanaDeg(-122), pitch: katanaDeg(50), roll: katanaDeg(-20), handYaw: katanaDeg(-70), handDist: 0.15, handY: 0.02, twist: -0.5 }],
  [0.24, { yaw: katanaDeg(-142), pitch: katanaDeg(40), roll: katanaDeg(-8), handYaw: katanaDeg(-82), handDist: 0.15, handY: -0.01, twist: -0.62 }],
  [0.36, { yaw: katanaDeg(-95), pitch: katanaDeg(14), roll: 0, handYaw: katanaDeg(-50), handDist: 0.19, handY: -0.08, twist: -0.32 }],
  [0.48, { yaw: 0, pitch: katanaDeg(2), roll: 0, handYaw: 0, handDist: 0.17, handY: -0.12, twist: 0.08 }],
  [0.6, { yaw: katanaDeg(100), pitch: katanaDeg(-9), roll: katanaDeg(8), handYaw: katanaDeg(50), handDist: 0.15, handY: -0.15, twist: 0.5 }],
  [0.76, { yaw: katanaDeg(140), pitch: katanaDeg(-20), roll: katanaDeg(30), handYaw: katanaDeg(65), handDist: 0.13, handY: -0.18, twist: 0.62 }],
  [1, { yaw: katanaDeg(138), pitch: katanaDeg(-26), roll: katanaDeg(55), handYaw: katanaDeg(62), handDist: 0.12, handY: -0.22, twist: 0.45 }],
];

function katanaCopyPose(out, from) {
  for (const key of KATANA_FIELDS) out[key] = from[key];
  return out;
}

// The slash at time u, mirrored for a slash to the right: a Catmull-Rom curve through the
// keys, so the blade never jerks to a stop at one. It eases in from wherever the blade was.
function katanaSlashPose(swing, u, out) {
  const keys = KATANA_SLASH;
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(keys.length - 1, i + 2)][1];
  const t = THREE.MathUtils.clamp((u - keys[i][0]) / (keys[i + 1][0] - keys[i][0]), 0, 1);
  const t2 = t * t, t3 = t2 * t;
  const into = smooth(u / 0.22);
  for (const key of KATANA_FIELDS) {
    let v = 0.5 * (2 * p1[key] + (p2[key] - p0[key]) * t + (2 * p0[key] - 5 * p1[key] + 4 * p2[key] - p3[key]) * t2 + (3 * p1[key] - p0[key] - 3 * p2[key] + p3[key]) * t3);
    if (swing.dir < 0) {
      if (key === 'yaw' || key === 'handYaw' || key === 'twist') v = -v;
      else if (key === 'roll') v = Math.PI - v;
    }
    out[key] = lerp(swing.from[key], v, into);
  }
  return out;
}

// Rest, loosened by her gait: running, the blade streams out flatter behind her.
const katanaRestPose = { ...KATANA_REST };
function katanaRest() {
  const p = katanaRestPose, run = player.runBlend, walk = Math.max(0, player.stride - run);
  const bob = Math.sin(player.walkPhase * 2);
  katanaCopyPose(p, KATANA_REST);
  p.yaw += katanaDeg(-14) * run + Math.sin(player.walkPhase) * 0.03 * player.stride;
  p.pitch += katanaDeg(5) * run + bob * (0.012 * walk + 0.02 * run);
  p.handYaw += katanaDeg(-14) * run;
  p.handY += bob * 0.008 * (walk + run) - 0.02 * run;
  return p;
}

// Where the sword sits in her chest's space for a pose, with `lift` added to the pitch.
const katanaDir = new THREE.Vector3(), katanaSide = new THREE.Vector3(), katanaDown = new THREE.Vector3(), katanaEdge = new THREE.Vector3(), katanaCross = new THREE.Vector3();
const katanaBasis = new THREE.Matrix4();
function katanaPlace(pose, lift, outPos, outQuat) {
  const pitch = pose.pitch + lift;
  katanaDir.set(Math.sin(pose.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(pose.yaw) * Math.cos(pitch));
  katanaSide.set(Math.cos(pose.yaw), 0, -Math.sin(pose.yaw));
  katanaDown.crossVectors(katanaSide, katanaDir);
  katanaEdge.copy(katanaSide).multiplyScalar(Math.cos(pose.roll)).addScaledVector(katanaDown, Math.sin(pose.roll));
  katanaCross.crossVectors(katanaDir, katanaEdge);
  katanaBasis.makeBasis(katanaCross, katanaDir, katanaEdge);
  outQuat.setFromRotationMatrix(katanaBasis);
  // The hands' midpoint, then back along the blade to the guard.
  const shoulderY = avatar.armR.upper.position.y;
  outPos.set(Math.sin(pose.handYaw) * pose.handDist, shoulderY + pose.handY, Math.cos(pose.handYaw) * pose.handDist);
  outPos.addScaledVector(katanaDir, -(KATANA.handR + KATANA.handL) / 2);
  return outPos;
}

/* ---------- Holding it ---------- */
const katanaPos = new THREE.Vector3(), katanaQuat = new THREE.Quaternion(), katanaHandGoal = new THREE.Quaternion();
const katanaGripR = new THREE.Vector3(), katanaGripL = new THREE.Vector3(), katanaWrist = new THREE.Vector3();
const katanaTip = new THREE.Vector3();
const katanaLocal = new THREE.Matrix4(), katanaWorld = new THREE.Matrix4(), katanaOne = new THREE.Vector3(1, 1, 1);
const katanaSubPose = { ...KATANA_REST };
// Elbows out and down; raised high, they lift out to the sides.
const KATANA_POLE_R = new THREE.Vector3(-0.6, -0.7, -0.3), KATANA_POLE_L = new THREE.Vector3(0.6, -0.7, -0.3);

// Puts the sword in her chest's space and both fists round its grip.
function katanaApply(pose, lift) {
  const g = katana.model.group;
  katanaPlace(pose, lift, katanaPos, katanaQuat);
  g.position.copy(katanaPos);
  g.quaternion.copy(katanaQuat);
  katanaHandGoal.copy(katanaQuat).multiply(GRIP);
  const { armL, armR } = avatar;
  katanaGripR.copy(katanaDir).multiplyScalar(KATANA.handR).add(katanaPos).add(katanaWrist.copy(RIGHT_WRIST).applyQuaternion(katanaQuat));
  katanaGripL.copy(katanaDir).multiplyScalar(KATANA.handL).add(katanaPos).add(katanaWrist.copy(LEFT_WRIST).applyQuaternion(katanaQuat));
  solveArm(armR, katanaGripR, KATANA_POLE_R);
  poseHand(armR, katanaHandGoal, 1);
  solveArm(armL, katanaGripL, KATANA_POLE_L);
  poseHand(armL, katanaHandGoal, 1);
}

// The blade's tip, in the world.
function katanaTipWorld(matrix, out) {
  const { spine } = katanaBladeAt(1);
  return out.set(0, KATANA.blade, spine).applyMatrix4(matrix);
}

// Held two-handed. Runs after the bow and axe poses, and takes over both arms while the
// sword is out.
function poseKatana(dt) {
  if (!katana.model) return;
  const g = katana.model.group;
  if (g.parent !== avatar.chest) avatar.chest.add(g);
  const out = katana.owned && survival.tool === 'katana';
  if (out && !katana.out) katanaDrawn();
  katana.out = out;
  g.visible = out;
  if (!out) {
    katana.swing = null;
    katana.ignite = 0;
    katanaTickEffects(dt, false);
    return;
  }

  // Progress the slash; it hangs for an instant when it bites.
  const swing = katana.swing;
  let u0 = 0;
  if (swing) {
    u0 = swing.t;
    swing.t = Math.min(1, swing.t + (dt / KATANA.swing) * (katana.hitStop > 0 ? 0.12 : 1));
  }
  katana.hitStop -= dt;
  katana.flourish -= dt;
  const ease = (rate) => 1 - Math.exp(-rate * dt);
  if (swing) {
    katanaSlashPose(swing, swing.t, katana.pose);
  } else {
    const goal = katana.flourish > 0 ? KATANA_RAISED : katanaRest();
    const rate = katana.flourish > 0 ? 7 : 9;
    for (const key of KATANA_FIELDS) katana.pose[key] += (goal[key] - katana.pose[key]) * ease(rate);
  }

  // Twist the body into the stroke, keeping her eyes where they were.
  const { hips, chest, head } = avatar;
  hips.rotation.y += katana.pose.twist * 0.35;
  chest.rotation.y += katana.pose.twist * 0.65;
  head.rotation.y -= katana.pose.twist;

  // Pose once to see where the tip lands, then lift it clear of the snow.
  katanaApply(katana.pose, katana.lift);
  g.updateWorldMatrix(true, false);
  katanaTipWorld(g.matrixWorld, katanaTip);
  const under = groundHeight(katanaTip.x, katanaTip.z) + KATANA.clearance - katanaTip.y;
  const pitch = katana.pose.pitch + katana.lift;
  const goal = Math.max(0, katana.lift + under / (KATANA.blade * Math.max(0.35, Math.cos(pitch))));
  katana.lift += (goal - katana.lift) * ease(goal > katana.lift ? 40 : 6);
  katanaApply(katana.pose, katana.lift);
  g.updateWorldMatrix(false, false);

  if (swing) katanaSweep(swing, u0);
  katanaTickEffects(dt, true);

  if (swing && swing.t >= 1) {
    katana.swing = null;
    if (swing.queued) katanaBeginSlash();
  }
}

// Draws the stroke's ribbon and cuts what it passes through, in small steps between last
// frame's place and this one so a fast sweep leaves no gaps.
function katanaSweep(swing, u0) {
  const chestWorld = avatar.chest.matrixWorld;
  const steps = Math.max(1, Math.ceil((swing.t - u0) / 0.012));
  for (let k = 1; k <= steps; k++) {
    const u = lerp(u0, swing.t, k / steps);
    katanaSlashPose(swing, u, katanaSubPose);
    katanaPlace(katanaSubPose, katana.lift, katanaPos, katanaQuat);
    katanaWorld.multiplyMatrices(chestWorld, katanaLocal.compose(katanaPos, katanaQuat, katanaOne));
    // The ribbon starts as the blade comes round, so the wind-up never smears across the view.
    if (u > KATANA.cutFrom + 0.04 && u < 0.84) katanaTrailAdd(katanaWorld);
    katanaTipWorld(katanaWorld, katanaTip);
    const heading = Math.atan2(katanaTip.x - player.pos.x, katanaTip.z - player.pos.z);
    if (u >= KATANA.cutFrom && u <= KATANA.cutTo) {
      if (swing.last !== null) {
        const turn = katanaAngle(heading - swing.last);
        katanaCut(swing, swing.last + turn / 2, Math.abs(turn) / 2 + 0.05);
      }
      swing.last = heading;
    }
  }
  // The stroke has passed: anything in the arc it somehow missed goes too.
  if (!swing.cutDone && swing.t > KATANA.cutTo) {
    swing.cutDone = true;
    katanaCut(swing, player.bodyYaw, Math.PI);
  }
}

const katanaAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Whether a point is inside the sector round `mid` and inside the arc in front of her.
function katanaInArc(x, z, mid, half) {
  const a = Math.atan2(x - player.pos.x, z - player.pos.z);
  return Math.abs(katanaAngle(a - mid)) <= half && Math.abs(katanaAngle(a - player.bodyYaw)) <= KATANA.arc / 2;
}

/* ---------- Cutting ---------- */
const katanaAt = new THREE.Vector3();
// Everything in reach within a sector of the stroke: standing trees come down, logs fall
// apart into planks, and hares and wolves don't get up.
function katanaCut(swing, mid, half) {
  const px = player.pos.x, pz = player.pos.z, reach = KATANA.reach;
  let trees = 0;
  for (const tree of swing.trees) {
    if (tree.felled) continue;
    const p = tree.placement;
    if (Math.hypot(p.x - px, p.z - pz) - tree.r >= reach || !katanaInArc(p.x, p.z, mid, half)) continue;
    fellTree(tree);
    trees++;
    // A burning gash across the trunk.
    const toward = Math.atan2(px - p.x, pz - p.z);
    katanaAt.set(p.x + Math.sin(toward) * tree.r, p.y + 0.95, p.z + Math.cos(toward) * tree.r);
    burst(katanaAt, 0xffa040, 16, 4);
    burst(katanaAt, CHIP, 8, 2.6);
  }

  let planks = 0;
  for (let i = survival.fallen.length - 1; i >= 0; i--) {
    const log = survival.fallen[i];
    if (!log.landed) continue;
    const bx = log.tree.placement.x, bz = log.tree.placement.z;
    const t = clamp((px - bx) * log.dir.x + (pz - bz) * log.dir.z, 0, log.length);
    const nx = bx + log.dir.x * t, nz = bz + log.dir.z * t;
    if (Math.hypot(nx - px, nz - pz) > reach || !katanaInArc(nx, nz, mid, half)) continue;
    planks += log.planks;
    scene.remove(log.group);
    survival.fallen.splice(i, 1);
    for (let k = 0; k < 5; k++) {
      const along = (k / 4) * log.length;
      const x = bx + log.dir.x * along, z = bz + log.dir.z * along;
      katanaAt.set(x, groundHeight(x, z) + 0.35, z);
      burst(katanaAt, CHIP, 9, 2.6);
      burst(katanaAt, 0xff8a30, 5, 2.2);
    }
  }
  if (planks) {
    survival.planks += planks;
    toast(`+${planks} ${planks === 1 ? 'plank' : 'planks'}`);
    Sfx.planks();
  }

  // Creatures are cut in the same sector, trimmed to the arc in front of her.
  const lo = Math.max(-KATANA.arc / 2, katanaAngle(mid - player.bodyYaw) - half);
  const hi = Math.min(KATANA.arc / 2, katanaAngle(mid - player.bodyYaw) + half);
  let killed = hi > lo ? sliceCreatures(px, pz, reach, player.bodyYaw + (lo + hi) / 2, hi - lo) || 0 : 0;
  // The final boss in the balloon basket is cut in the same sector, once a stroke (boss.js).
  if (hi > lo && bossSlice(px, pz, reach, player.bodyYaw + (lo + hi) / 2, hi - lo, swing)) killed++;
  if (trees || planks || killed) {
    Sfx.katanaCut(Math.min(1.4, 0.7 + (trees + killed) * 0.2));
    player.shake = Math.max(player.shake, killed ? 0.3 : 0.18);
    // Only so much of a stroke may hang, however much it cuts through.
    const stop = Math.min(killed ? 0.08 : 0.035, 0.12 - swing.stopped);
    if (stop > 0) { katana.hitStop = Math.max(katana.hitStop, stop); swing.stopped += stop; }
  }
  if (killed) {
    katanaMidWorld(katanaAt);
    burst(katanaAt, 0xffc070, 24, 5);
  }
  swing.felled += trees;
  swing.killed += killed;
  swing.planks += planks;
}

function katanaMidWorld(out) {
  const { spine, width } = katanaBladeAt(0.6);
  return out.set(0, KATANA.blade * 0.6, spine + width / 2).applyMatrix4(katana.model.group.matrixWorld);
}

/* ---------- Fire and light ---------- */
// Flames, embers, the slash trail, the glow of the steel and the light it throws. Runs
// whenever she's posed, so the blade burns through scenes too; put away, the last flames
// just die out.
function katanaTickEffects(dt, out) {
  const m = katana.model;
  const lit = out && avatar.root.visible;
  if (lit) {
    katana.ignite = Math.min(1, katana.ignite + dt / 0.45);
    katana.heat += ((katana.swing ? 1 : 0) - katana.heat) * (1 - Math.exp(-(katana.swing ? 14 : 3) * dt));
    const slashing = katana.heat;
    katanaEmit(katana.flames, lerp(120, 420, slashing) * katana.ignite, dt, lerp(0.45, 0.35, slashing), 1.5, 0.3);
    katanaEmit(katana.embers, lerp(22, 70, slashing) * katana.ignite, dt, 1, 0.8, 0.8);
    // Where the tip trails close over the snow, it hisses up a little steam.
    if (!katana.swing && katanaTip.y - groundHeight(katanaTip.x, katanaTip.z) < KATANA.clearance + 0.12 && player.stride > 0.3 && Math.random() < dt * 6) {
      burst(katanaTip, 0xdfe6f2, 2, 0.8);
    }
  }
  katanaTickFire(katana.flames, dt, false);
  katanaTickFire(katana.embers, dt, true);
  katanaTickTrail(dt);
  katanaTickBlaze(dt, lit);

  const t = game.time;
  const flicker = 0.9 + Math.sin(t * 13.3) * 0.06 + Math.sin(t * 31.7) * 0.04;
  const glow = lit ? katana.ignite * flicker : 0;
  m.mats.blade.emissiveIntensity = 2.4 * (0.25 + 0.75 * glow) * (1 + katana.heat * 0.35);
  m.mats.sheath.uniforms.uTime.value = t;
  m.mats.sheath.uniforms.uHeat.value = glow * (1 + katana.heat * 0.8);
  const light = katana.light;
  light.intensity = KATANA.light * glow * (1 + katana.heat * 0.6);
  if (lit) katanaMidWorld(light.position);
}

/* ---------- Taking it out and swinging ---------- */
// Drawn (or taken for the first time), the flames run up from the guard to the tip.
function katanaDrawn() {
  katana.ignite = 0;
  katana.lift = 0;
  katana.swing = null;
  Sfx.katanaDraw();
}

function startSlash() {
  if (!katana.owned || survival.tool !== 'katana' || player.dodge || game.state !== 'playing') return;
  // A click late in one stroke queues the next, so slashes chain back and forth.
  if (katana.swing) { if (katana.swing.t > 0.5) katana.swing.queued = true; return; }
  katanaBeginSlash();
}

function katanaBeginSlash() {
  katana.swing = {
    t: 0, dir: katana.side, from: katanaCopyPose({}, katana.pose), last: null, cutDone: false, queued: false,
    // What's near enough to be cut, gathered once; she can't run far in half a second.
    trees: world.treesNear(player.pos.x, player.pos.z, KATANA.reach + 4),
    felled: 0, killed: 0, planks: 0, stopped: 0,
  };
  katana.side = -katana.side;
  katana.flourish = 0;
  // She turns to face where the camera looks, as with the axe.
  player.aimT = Math.max(player.aimT, KATANA.swing + 0.25);
  Sfx.katanaWhoosh();
}

function katanaBusy() {
  return !!katana.swing;
}

function katanaHeld() {
  return katana.owned && survival.tool === 'katana' && game.state === 'playing';
}

/* ---------- The cheat ---------- */
function cheatKey(code) {
  if (game.state !== 'playing') return false;
  const keys = katana.cheat;
  keys.push(code);
  if (keys.length > 12) keys.shift();
  for (const seq of KATANA_CHEATS) {
    if (keys.length >= seq.length && seq.every((c, i) => keys[keys.length - seq.length + i] === c)) {
      keys.length = 0;
      grantKatana('cheat');
      return true;
    }
  }
  return false;
}

// The blade leaves the altar's ice and is in her hands, burning.
function grantKatana(source = 'cheat') {
  if (katana.owned) {
    setTool('katana');
    return;
  }
  katana.owned = true;
  survival.tool = 'katana';
  survival.swing = null;
  cancelDraw();
  katana.flourish = 1.5;
  if (world.altar && world.altar.blade) world.altar.blade.visible = false;
  const words = LORE.katana || {};
  katanaFlash();
  toast(words.cheatToast || 'The Ember Blade — 3 to hold it, click to slash');
  say(words.cheatLine || 'Ten feet of burning star-iron. I\'m not going to ask.', 3.6);
  Sfx.katanaIgnite();
  // A ring of fire and a gust of snow thrown out round her feet.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = player.pos.x + Math.sin(a) * 1.1, z = player.pos.z + Math.cos(a) * 1.1;
    katanaAt.set(x, groundHeight(x, z) + 0.1, z);
    burst(katanaAt, i % 2 ? 0xffa040 : 0xf2f5ff, 6, 3.4);
  }
  player.shake = Math.max(player.shake, 0.25);
  emitGame('katanaObtained', source);
}

// A warm flash across the screen, brighter in the middle.
function katanaFlash() {
  const el = $('flash');
  el.style.background = 'radial-gradient(circle at 50% 58%, rgba(255, 236, 190, 0.95), rgba(255, 128, 40, 0.65) 42%, rgba(140, 24, 0, 0.25) 78%)';
  clearTimeout(katanaFlash.timer);
  katanaFlash.timer = setTimeout(() => { el.style.background = ''; }, 130);
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // A rush of air that rises and falls with the stroke, the flames tearing behind it.
  katanaWhoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.3;
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 0.22);
    filter.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.6);
    this.burst(0.5, 240, 0.5, 0.3);
  },
  // Hot star-iron through wood: a sizzle and a heavy thunk.
  katanaCut(level = 1) {
    this.burst(0.5, 4200, 0.7, 0.16 * level, 'highpass');
    this.burst(0.14, 560, 1.1, 0.5 * level, 'bandpass');
    this.tone(140, 50, 0.22, 0.3 * level, 'triangle');
  },
  // The blade catching light: a deep whoomph and a long, ringing note.
  katanaIgnite() {
    this.burst(1.6, 520, 0.4, 0.8);
    this.tone(60, 240, 1.1, 0.22, 'sawtooth');
    this.glide([[0, 1046], [2.8, 1040]], 0.035, 'sine', 3);
    this.glide([[0, 1568], [2.2, 1560]], 0.016, 'sine', 4);
  },
  katanaDraw() {
    this.burst(0.5, 700, 0.5, 0.35);
    this.burst(0.25, 2600, 1.2, 0.07, 'bandpass');
  },
});

/* ---------- Each frame ---------- */
// The roar of the flames, louder mid-stroke, silent when it's put away.
function updateKatana(dt) {
  if (!katana.owned) return;
  if (!katana.roar && Sfx.ctx) katana.roar = Sfx.loop({ noise: 0.5, filter: 380, hum: 0.16, humFreq: 46 });
  if (katana.roar) {
    const level = katana.out ? 0.16 + katana.heat * 0.3 : 0;
    if (Math.abs(level - (katana.roarLevel || 0)) > 0.01) {
      katana.roarLevel = level;
      katana.roar.set(level);
    }
  }
}

function katanaSilence() {
  if (katana.roar) katana.roar.set(0);
  katana.roarLevel = 0;
}

/* ---------- A new run ---------- */
function resetKatana() {
  Object.assign(katana, { owned: false, swing: null, side: 1, out: false, ignite: 0, flourish: 0, hitStop: 0, heat: 0, lift: 0 });
  katana.cheat.length = 0;
  katana.pose = katanaCopyPose({}, KATANA_REST);
  if (katana.roar) { katana.roar.stop(); katana.roar = null; }
  katana.roarLevel = 0;
  if (world.altar && world.altar.blade) world.altar.blade.visible = true;
  if (!katana.model) return;
  katana.model.group.visible = false;
  katana.light.intensity = 0;
  katanaClearFire(katana.flames);
  katanaClearFire(katana.embers);
  katana.trail.size = 0;
  katana.trail.geo.setDrawRange(0, 0);
}

function initKatana() {
  katana.model = buildKatanaModel();
  avatar.chest.add(katana.model.group);
  katana.flames = buildKatanaFire(KATANA.flames, 0.2, false, katanaFlameTexture());
  katana.blaze = buildKatanaBlaze();
  katana.embers = buildKatanaFire(KATANA.embers, 0.04, true, TEX.softDot);
  katana.trail = buildKatanaTrail();
  // Made once, dark until the blade is drawn, so the light count never changes.
  katana.light = new THREE.PointLight(0xff7428, 0, 18, 1.5);
  scene.add(katana.light);
  HEAT_SOURCES.push(() => (katanaHeld() ? KATANA.warmth : 0));
  onGame('playerDied', katanaSilence);
  onGame('escaped', katanaSilence);
  resetKatana();
}
