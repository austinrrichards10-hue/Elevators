// The boss arena, dressed: the clearing stays flat for the fight, but round it the snow rises
// into banks and ridges with the forest climbing them, a ring of old runestones stands at its
// edges, ice crystals jut from the snow, and red veins run under
// the clearing floor. Overhead a moon, an aurora and a ring of jagged peaks; low mist and
// embers drift through it. All of it answers to Teto: the angrier she gets, the more the
// runes and veins burn, the crystals and the moon redden, the aurora turns to blood, lightning
// walks the peaks, and in her last stage meteors come down into the clearing.

let arenaFx = null;

const ARENA_FX = {
  meteor: { every: [2.4, 4], fall: 1.2, radius: 2.4, damage: 14 },
  lightning: [4, 9],
};

const sstep = (a, b, v) => smooth((v - a) / (b - a));

// How far a point lies outside the open ground: the clearing, the avenue widening down to the
// balloon, and the balloon's own clearing. Zero inside.
function arenaOpenDistance(x, z) {
  const A = SHOWDOWN.arena, back = -A.length / 2, front = A.length / 2, far = front + A.balloon;
  const halfW = A.half + 2.5 + Math.max(0, z - front) * 0.6;
  const ex = Math.max(0, Math.abs(x) - halfW);
  const ez = Math.max(0, back - 2.5 - z, z - (far + 26));
  return Math.hypot(ex, ez);
}

// The height of the snow there, in metres above the clearing floor.
function arenaHeight(x, z) {
  const d = arenaOpenDistance(x, z);
  if (d <= 0) return 0;
  const ridge = 8 + 3.5 * Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.05) + 2.2 * Math.sin(x * 0.19 + z * 0.13) + 0.7 * Math.sin(x * 0.6 + z * 0.7);
  const r = Math.hypot(x, z - 20);
  return (1 - Math.exp(-d / 9)) * ridge * (1 - sstep(165, 198, r));
}

function buildArenaTerrain() {
  const geo = new THREE.PlaneGeometry(400, 400, 180, 180).rotateX(-Math.PI / 2).translate(0, 0, 20);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) p.setY(i, arenaHeight(p.getX(i), p.getZ(i)));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 400 / 2400, uv.getY(i) * 400 / 2400);
  geo.computeVertexNormals();
  // Rock showing through where it's steep.
  const n = geo.attributes.normal, colors = new Float32Array(p.count * 3), snow = new THREE.Color(0xf0f3fb), rock = new THREE.Color(0x59606e), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(snow).lerp(rock, sstep(0.86, 0.7, n.getY(i)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: TEX.snow.color, normalMap: TEX.snow.normal, roughnessMap: TEX.snow.rough, vertexColors: true }));
  mesh.receiveShadow = true;
  return mesh;
}

// Glyphs carved down a standing stone, white on black, for its glow.
function runeStripTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const rand = seededRandom(91);
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
  g.shadowColor = '#fff'; g.shadowBlur = 6;
  for (let y = 30; y < 236; y += 30) {
    g.beginPath();
    for (let j = 0; j < 3; j++) { g.moveTo(32 + (rand() - 0.5) * 30, y + (rand() - 0.5) * 22); g.lineTo(32 + (rand() - 0.5) * 30, y + (rand() - 0.5) * 22); }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Red veins under the ice of the clearing floor.
function veinTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1024;
  const g = c.getContext('2d');
  const rand = seededRandom(17);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 6;
  const vein = (x, y, a, len, w, depth) => {
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 8; i++) {
      a += (rand() - 0.5) * 0.8;
      x += Math.cos(a) * len / 8; y += Math.sin(a) * len / 8;
      g.lineTo(x, y);
      if (depth < 3 && rand() < 0.25) { g.stroke(); vein(x, y, a + (rand() - 0.5) * 1.8, len * 0.55, w * 0.6, depth + 1); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); }
    }
    g.stroke();
  };
  for (let i = 0; i < 7; i++) vein(128 + (rand() - 0.5) * 120, rand() * 1024, Math.PI / 2 + (rand() - 0.5) * 1.2, 500 + rand() * 300, 4, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function moonTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const rand = seededRandom(5);
  const grad = g.createRadialGradient(110, 110, 10, 128, 128, 120);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.85, '#d9dde8'); grad.addColorStop(1, 'rgba(200,205,220,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 26; i++) {
    const a = rand() * 6.28, r = rand() * 90, s = 4 + rand() * 16;
    g.fillStyle = `rgba(120,125,145,${0.15 + rand() * 0.25})`;
    g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, s, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function auroraMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x3dffb0) }, uColor2: { value: new THREE.Color(0x6a7bff) }, uOpacity: { value: 0.6 }, uPhase: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity; uniform float uPhase;
      varying vec2 vUv;
      void main() {
        float x = vUv.x * 40.0 + uPhase;
        float curtain = 0.55 + 0.45 * sin(x * 1.7 + uTime * 0.6) * sin(x * 0.53 - uTime * 0.31);
        float rays = 0.6 + 0.4 * sin(x * 9.0 + uTime * 1.3 + sin(x * 2.0) * 2.0);
        float fall = smoothstep(0.0, 0.12, vUv.y) * pow(1.0 - vUv.y, 1.6);
        float ends = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        vec3 col = mix(uColor, uColor2, vUv.y) * 1.6;
        gl_FragColor = vec4(col, uOpacity * curtain * rays * fall * ends);
      }`,
  });
}

// Everything the arena adds to its group, built once with the rest of the kit.
function buildArenaDressing(group) {
  const A = SHOWDOWN.arena, back = -A.length / 2, front = A.length / 2;
  const rand = seededRandom(777);
  const fx = { stones: [], crystals: [], level: 0, flare: 0, lightningT: 6, meteorT: 3, meteors: [], flash: 0 };
  group.add(buildArenaTerrain());

  // The runestones: a line down each side of the clearing, leaning a little, snow on top.
  const runeTex = runeStripTexture();
  fx.runeMat = new THREE.MeshStandardMaterial({ color: 0x3b3f4a, roughness: 0.92, flatShading: true, emissive: 0xff2d55, emissiveMap: runeTex, emissiveIntensity: 0.4 });
  const stoneGeo = new THREE.BoxGeometry(1, 1, 1, 1, 4, 1).translate(0, 0.5, 0);
  const sp = stoneGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); sp.setX(i, sp.getX(i) * (1 - 0.28 * y)); sp.setZ(i, sp.getZ(i) * (1 - 0.2 * y)); }
  stoneGeo.computeVertexNormals();
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf0f3fb, roughness: 1 });
  const capGeo = new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const stone = (x, z, h, w, faceIn) => {
    const m = new THREE.Mesh(stoneGeo, fx.runeMat);
    m.scale.set(w, h, w * 0.6);
    m.position.set(x, arenaHeight(x, z) - 0.2, z);
    m.rotation.set((rand() - 0.5) * 0.12, faceIn, (rand() - 0.5) * 0.14);
    m.castShadow = true;
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.scale.set(0.75, 0.25 / h, 0.8);
    cap.position.y = 1;
    m.add(cap);
    group.add(m);
    fx.stones.push(m);
  };
  for (let z = back + 4; z < front - 3; z += 8 + rand() * 3) {
    for (const side of [-1, 1]) stone(side * (A.half + 2 + rand() * 0.8), z + rand() * 2, 2.6 + rand() * 1.8, 0.9 + rand() * 0.4, side * Math.PI / 2);
  }

  // Ice crystals in clusters along the edges and up on the banks.
  fx.iceMat = new THREE.MeshStandardMaterial({ color: 0xa8dcff, emissive: 0x2a7fff, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, flatShading: true });
  const shard = new THREE.OctahedronGeometry(1, 0).translate(0, 1, 0);
  for (let i = 0; i < 26; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (A.half + 3 + rand() * 9), z = lerp(back - 4, front + 14, rand());
    const base = arenaHeight(x, z);
    const n = 3 + Math.floor(rand() * 5);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(shard, fx.iceMat);
      const s = 0.25 + rand() * 0.35;
      m.scale.set(s, s * (2.5 + rand() * 3), s);
      m.position.set(x + (rand() - 0.5) * 1.6, base - 0.3, z + (rand() - 0.5) * 1.6);
      m.rotation.set((rand() - 0.5) * 0.9, rand() * 6.28, (rand() - 0.5) * 0.9);
      group.add(m);
      fx.crystals.push(m);
    }
  }

  // The veins under the clearing floor.
  fx.veins = new THREE.Mesh(new THREE.PlaneGeometry(A.half * 2 + 2, A.length + 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: veinTexture(), color: new THREE.Color(0xff2d55).multiplyScalar(2.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  fx.veins.position.y = 0.02;
  group.add(fx.veins);

  // The sky: the moon with its halo, the aurora, the peaks all round.
  fx.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), color: 0xe8eeff, transparent: true, depthWrite: false, fog: false }));
  fx.moon.position.set(-140, 190, 560);
  fx.moon.scale.setScalar(70);
  fx.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0x9fb8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  fx.halo.position.copy(fx.moon.position);
  fx.halo.scale.setScalar(300);
  group.add(fx.halo, fx.moon);
  fx.aurora = [0, 1, 2].map((i) => {
    const geo = new THREE.PlaneGeometry(700, 110, 80, 1);
    const ap = geo.attributes.position;
    for (let v = 0; v < ap.count; v++) {
      const x = ap.getX(v), y = ap.getY(v);
      ap.setXYZ(v, x, 150 + i * 28 + y + Math.sin(x * 0.006 + i) * 14, 380 + i * 60 + Math.sin(x * 0.009 + i * 2) * 70);
    }
    const m = new THREE.Mesh(geo, auroraMaterial());
    m.material.uniforms.uPhase.value = i * 13;
    m.frustumCulled = false;
    group.add(m);
    return m;
  });
  // Peaks: a jagged ring far off, snow on their tops, faded into the sky.
  const ring = new THREE.CylinderGeometry(560, 560, 1, 160, 6, true).translate(0, 0.5, 0);
  const rp = ring.attributes.position, rc = new Float32Array(rp.count * 3);
  const dark = new THREE.Color(0x232a3d), cap = new THREE.Color(0x8794b2), col = new THREE.Color();
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), z = rp.getZ(i), a = Math.atan2(z, x), up = rp.getY(i);
    const peak = 70 + 60 * Math.abs(Math.sin(a * 3.1)) + 45 * Math.abs(Math.sin(a * 7.3 + 1)) + 22 * Math.abs(Math.sin(a * 17 + 2));
    rp.setY(i, -20 + up * (peak + 20));
    col.copy(dark).lerp(cap, sstep(0.72, 0.9, up));
    rc.set([col.r, col.g, col.b], i * 3);
  }
  ring.setAttribute('color', new THREE.BufferAttribute(rc, 3));
  fx.peaks = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, transparent: true, opacity: 0.7, depthWrite: false }));
  fx.peaks.position.z = 20;
  fx.peaks.renderOrder = -2;
  group.add(fx.peaks);
  // Lightning on the peaks, and the flash it throws over everything.
  fx.bolts = [0, 1].map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xffd0e0).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, fog: false }));
    line.frustumCulled = false;
    line.visible = false;
    scene.add(line);
    return line;
  });
  fx.flashLight = new THREE.DirectionalLight(0xffc0d8, 0);
  fx.flashLight.position.set(-60, 120, 200);
  group.add(fx.flashLight);
  // Low mist rolling over the snow.
  fx.mist = buildPuffs(70, 0xdfe8ff);
  scene.add(fx.mist.group);
  // Meteors for her last stage: a warning ring on the snow and the rock coming down to it.
  for (let i = 0; i < 4; i++) {
    const warn = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), additive(new THREE.Color(0xff3355).multiplyScalar(3), 0));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), additive(new THREE.Color(0xff2d55).multiplyScalar(1.5), 0));
    const rock = glowOrb(0xff6a3a, 2.2);
    warn.visible = fill.visible = false;
    scene.add(warn, fill);
    fx.meteors.push({ warn, fill, rock, t: -1, at: new THREE.Vector3(), from: new THREE.Vector3() });
  }
  return fx;
}

/* ---------- Each frame ---------- */
function updateArenaFx(dt) {
  const k = showdownKit, fx = arenaFx;
  if (!fx || !k.arena.visible) return;
  const A = SHOWDOWN.arena;
  const inFight = showdown.stage === 'fight' && !fight.over;
  const st = inFight ? fightStage() : 0;
  const want = inFight ? [0.15, 0.55, 1][st] : Math.min(1, (fight.redFog || 0) * 1.2);
  fx.level = lerp(fx.level, want, 1 - Math.exp(-dt * 1.5));
  fx.flare = Math.max(0, fx.flare - dt * 0.6);
  const L = fx.level, pulse = 0.75 + 0.25 * Math.sin(game.time * (2 + L * 4));
  fx.runeMat.emissiveIntensity = (0.35 + L * 2.4) * pulse + fx.flare * 4;
  fx.iceMat.emissive.setRGB(lerp(0.16, 1, L), lerp(0.5, 0.12, L), lerp(1, 0.25, L));
  fx.iceMat.emissiveIntensity = 0.5 + L * 0.8 + fx.flare * 2;
  fx.veins.material.opacity = Math.min(1, L * 0.75 * (0.7 + 0.3 * Math.sin(game.time * 3.1)) + fx.flare * 0.6);
  fx.moon.material.color.setRGB(lerp(0.91, 1, L), lerp(0.93, 0.35, L), lerp(1, 0.35, L));
  fx.halo.material.color.setRGB(lerp(0.62, 1, L), lerp(0.72, 0.2, L), lerp(1, 0.3, L));
  fx.halo.material.opacity = 0.3 + L * 0.25 + fx.flash * 0.4;
  for (const a of fx.aurora) {
    const u = a.material.uniforms;
    u.uTime.value = game.time * (1 + L);
    u.uColor.value.setRGB(lerp(0.24, 1, L), lerp(1, 0.12, L), lerp(0.69, 0.3, L));
    u.uColor2.value.setRGB(lerp(0.42, 0.55, L), lerp(0.48, 0.05, L), lerp(1, 0.4, L));
    u.uOpacity.value = 0.45 + L * 0.35 + fx.flash * 0.5;
  }
  // Mist low over the snow, drifting across the clearing.
  if (Math.random() < dt * 4) {
    const at = sdV.set((Math.random() - 0.5) * A.half * 2.4, A.y + 0.3, player.pos.z + (Math.random() - 0.3) * 40);
    fx.mist.emit(at, sdW.set(1.2 + Math.random(), 0.05, (Math.random() - 0.5) * 0.6), { life: 7, size: 4 + Math.random() * 3, grow: 1.5, alpha: 0.1 + L * 0.04 });
  }
  fx.mist.update(dt);
  // Embers rising off the veins, more of them the angrier she is.
  if (L > 0.3 && Math.random() < dt * 30 * L) {
    k.sparks.emit(sdV.set(player.pos.x + (Math.random() - 0.5) * 16, A.y + 0.1, player.pos.z + (Math.random() - 0.2) * 22), sdW.set((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 0.4), { life: 2.2, size: 0.07, grow: 0.2, alpha: 1 });
  }
  // Lightning walking the peaks.
  fx.flash = Math.max(0, fx.flash - dt * 3);
  fx.flashLight.intensity = fx.flash * 3;
  for (const b of fx.bolts) if (b.visible && fx.flash < 0.5) b.visible = false;
  if (L > 0.35) {
    fx.lightningT -= dt;
    if (fx.lightningT <= 0) { fx.lightningT = lerp(ARENA_FX.lightning[0], ARENA_FX.lightning[1], Math.random()) / (0.6 + L); arenaLightning(); }
  }
  if (inFight) updateMeteors(dt, st);
  else for (const m of fx.meteors) if (m.t >= 0) endMeteor(m);
}

function arenaLightning() {
  const fx = arenaFx, A = SHOWDOWN.arena;
  const a = (Math.random() - 0.5) * 2.2 + Math.PI / 2, r = 480;
  const top = new THREE.Vector3(Math.cos(a) * r * 0.9, A.y + 230, 20 + Math.sin(a) * r * 0.9);
  const bottom = new THREE.Vector3(Math.cos(a) * r, A.y + 70, 20 + Math.sin(a) * r);
  for (const b of fx.bolts) strikeBolt(b, top, bottom.clone().add(sdU.set((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40)), 40);
  fx.flash = 1;
  setTimeout(() => Sfx.boom(0.22), 500 + Math.random() * 900);
}

// When she rages, the whole place wakes with her: the runes blaze, lightning strikes.
function arenaAwaken() {
  const fx = arenaFx;
  if (!fx) return;
  fx.flare = 1;
  arenaLightning();
}

/* ---------- Meteors ---------- */
function updateMeteors(dt, st) {
  const fx = arenaFx, M = ARENA_FX.meteor, A = SHOWDOWN.arena, t = fight.teto;
  const busy = fight.rage || fight.knocked || t.state.startsWith('mega');
  if (st >= 2 && !busy) {
    fx.meteorT -= dt;
    if (fx.meteorT <= 0) {
      fx.meteorT = lerp(M.every[0], M.every[1], Math.random());
      const m = fx.meteors.find((x) => x.t < 0);
      if (m) {
        // Where she's going to be, roughly.
        const lead = 0.6;
        m.at.set(clamp(player.pos.x + (player.vel ? player.vel.x * lead : 0) + (Math.random() - 0.5) * 3, -A.half + 1, A.half - 1), A.y, clamp(player.pos.z + (player.vel ? player.vel.z * lead : 0) + (Math.random() - 0.5) * 3, -A.length / 2 + 1, A.length / 2 - 1));
        m.from.copy(m.at).add(sdU.set(-30 + Math.random() * 60, 55, 25 + Math.random() * 15));
        m.t = 0;
        m.warn.visible = m.fill.visible = m.rock.visible = true;
        Sfx.whoosh(0.5);
      }
    }
  }
  for (const m of fx.meteors) {
    if (m.t < 0) continue;
    m.t += dt;
    const u = Math.min(1, m.t / M.fall);
    m.warn.position.copy(m.at).setY(A.y + 0.05);
    m.fill.position.copy(m.warn.position);
    m.warn.scale.setScalar(M.radius * (1.3 - 0.3 * u));
    m.warn.material.opacity = 0.5 + 0.5 * Math.sin(m.t * 30);
    m.fill.scale.setScalar(M.radius * u);
    m.fill.material.opacity = 0.35 * u;
    m.rock.position.lerpVectors(m.from, m.at, u * u);
    m.rock.scale.setScalar(2 + Math.random() * 0.6);
    showdownKit.trails.emit(m.rock.position, sdW.set((Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2), { life: 0.5, size: 1.1, grow: 0.6, alpha: 0.9 });
    showdownKit.smoke.emit(m.rock.position, sdW.set(0, 1, 0), { life: 1.2, size: 1, grow: 2, alpha: 0.3 });
    if (u >= 1) {
      explode(m.at.clone().add(sdU.set(0, 0.4, 0)), 0xff4d3a, 1.3);
      shockwave(m.at, 6, 0xff6a3a, 0.6);
      burst(m.at.clone().add(sdU.set(0, 0.3, 0)), 0xf2f5ff, 20, 6);
      Sfx.explosion(0.8);
      player.shake = Math.max(player.shake, 0.35);
      if (Math.hypot(player.pos.x - m.at.x, player.pos.z - m.at.z) < M.radius) hitMiku(M.damage);
      endMeteor(m);
    }
  }
}

function endMeteor(m) {
  m.t = -1;
  m.warn.visible = m.fill.visible = m.rock.visible = false;
}

function clearArenaHazards() {
  const fx = arenaFx;
  if (!fx) return;
  for (const m of fx.meteors) endMeteor(m);
  for (const b of fx.bolts) b.visible = false;
  fx.flash = 0;
  fx.meteorT = 3;
}

/* ---------- Phase banners ---------- */
function phaseBanner(text, sub) {
  let el = $('boss-phase');
  if (!el) {
    el = document.createElement('div');
    el.id = 'boss-phase';
    $('hud').appendChild(el);
  }
  el.innerHTML = `<span class="phase-sub">${sub}</span><span class="phase-title">${text}</span>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(phaseBanner.timer);
  phaseBanner.timer = setTimeout(() => el.classList.remove('show'), 3000);
}
