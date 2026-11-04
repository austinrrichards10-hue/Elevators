// The Tokyo Dome, inside: fifty-five thousand people under a white cable-net roof, every one of
// them with a penlight. The crowd is real figures, on the field and up the tiers of the stands,
// jumping on the beat with their lights swaying, pumping or rolling round the bowl in a wave,
// and the colour changing with the song: teal for her, gold for the last chorus, a rainbow
// running round the stands, white sparkles in the bridge, and when Teto comes, half of it red.
// Over them a ring of moving lights, laser fans off the stage, followspots finding her from the
// back of the bowl, a giant LED wall with the words she's singing, and screens either side
// showing her live.

/* ---------- The crowd's shaders ---------- */
// Shared by the fans, their penlights and the glow round each one, so they all move together.
const domeC = new THREE.Color(), domeC2 = new THREE.Color();
const DOME_GLSL = `
  uniform float uBeat; uniform float uTime; uniform float uEnergy; uniform float uLevel; uniform float uSplit;
  uniform vec3 uSway; uniform vec4 uPat; uniform vec3 uColA; uniform vec3 uColB;
  vec3 domeHue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
  float domeJump(float seed) { float p = fract(uBeat + seed * 0.12); return uEnergy * 0.26 * pow(sin(3.14159 * p), 2.0); }
  // How the penlight is held this moment: [side-to-side, forward-back].
  vec2 domeSwing(float seed, vec3 w) {
    float az = atan(w.x, w.z);
    float sway = 0.55 * sin(uBeat * 1.5708 + seed * 0.4);
    float pump = -0.75 * pow(1.0 - fract(uBeat + seed * 0.05), 2.0);
    float wave = 0.9 * sin(uBeat * 1.5708 - az * 2.0);
    return vec2(sway * uSway.x + wave * uSway.z, pump * uSway.y);
  }
  vec3 domePen(float seed, vec3 w) {
    float az = atan(w.x, w.z);
    vec3 base = mix(uColA, uColB, uSplit * step(w.z, -5.0));
    vec3 rainbow = domeHue(fract(az / 6.2832 + uBeat * 0.0625)) * 1.1;
    float tw = step(0.82, fract(sin(seed * 913.0 + floor(uTime * 9.0 + seed * 7.0)) * 437.5));
    vec3 twinkle = mix(base * 0.35, vec3(1.0), tw);
    vec3 gold = vec3(1.0, 0.78, 0.32);
    vec3 c = base * uPat.x + rainbow * uPat.y + twinkle * uPat.z + gold * uPat.w;
    return c * uLevel * (0.8 + 0.2 * sin(uBeat * 3.14159 + seed * 6.28));
  }
  mat3 domeRot(vec2 a) {
    float cz = cos(a.x), sz = sin(a.x), cx = cos(a.y), sx = sin(a.y);
    mat3 rz = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
    return rz * rx;
  }
  const vec3 HAND = vec3(0.22, 1.62, 0.1);
`;

function domeUniforms() {
  return {
    uBeat: { value: 0 }, uTime: { value: 0 }, uEnergy: { value: 0 }, uLevel: { value: 0.3 }, uSplit: { value: 0 },
    uSway: { value: new THREE.Vector3(1, 0, 0) }, uPat: { value: new THREE.Vector4(1, 0, 0, 0) },
    uColA: { value: new THREE.Color(0.22, 0.84, 0.78) }, uColB: { value: new THREE.Color(1, 0.18, 0.32) },
    uScale: { value: 400 },
  };
}

// Joins simple shapes into one (positions and normals only).
function domeMerge(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = parts.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

// Where everyone stands: in rows on the field round the runway, and up the tiers all round
// the bowl except behind the main stage.
function domeSeating(stageZ) {
  const seats = [];
  const rand = seededRandom(55000);
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  for (let z = -58; z < 30; z += 0.95) {
    for (let x = -36; x <= 36; x += 0.85) {
      const px = x + (rand() - 0.5) * 0.4, pz = z + (rand() - 0.5) * 0.4;
      if (Math.hypot(px, pz) > 58) continue;
      if (Math.abs(px) < 3.4 && pz > -21 && pz < stageZ) continue; // the runway
      if (Math.abs(px) < 8 && pz > -22 && pz < -6) continue; // the centre stage
      if (Math.abs(px) < 12 && pz > -47 && pz < -33) continue; // Teto's stage
      if (rand() < 0.08) continue;
      seats.push([px, 0, pz, face(px, pz, 0, Math.min(stageZ, pz + 26)), rand()]);
    }
  }
  const tier = (r, y) => {
    const step = 0.78 / r;
    for (let a = 0; a < Math.PI * 2; a += step) {
      if (Math.cos(a) > 0.55) continue;
      if (rand() < 0.06) continue;
      const rr = r + (rand() - 0.5) * 0.3, x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      seats.push([x, y, z, face(x, z, 0, 6), rand()]);
    }
  };
  for (let k = 0; k < 8; k++) tier(64 + k * 3.1, 1.6 + k * 1.6);
  for (let k = 0; k < 6; k++) tier(92 + k * 2.6, 19.6 + k * 1.8);
  return seats;
}

function buildDomeCrowd(g, stageZ) {
  const seats = domeSeating(stageZ), n = seats.length;
  const U = domeUniforms();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const seed = new Float32Array(n);
  seats.forEach((s, i) => { seed[i] = s[4]; });
  const place = (mesh) => {
    seats.forEach(([x, y, z, yaw], i) => { q.setFromAxisAngle(up, yaw); mesh.setMatrixAt(i, m4.compose(p.set(x, y, z), q, one)); });
    mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    mesh.frustumCulled = false;
    g.add(mesh);
  };
  // The people: dark shapes, lit from the front by the stage and from below by their own lights.
  const body = domeMerge([
    new THREE.BoxGeometry(0.42, 0.62, 0.24).translate(0, 1.05, 0),
    new THREE.OctahedronGeometry(0.15, 1).translate(0, 1.52, 0),
    new THREE.BoxGeometry(0.36, 0.74, 0.2).translate(0, 0.37, 0),
    new THREE.BoxGeometry(0.09, 0.44, 0.09).translate(0.22, 1.42, 0.06),
  ]);
  const fanMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${DOME_GLSL}
      attribute float aSeed; varying vec3 vN; varying float vY; varying vec3 vPen;
      void main() {
        vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 p = position + vec3(0.0, domeJump(aSeed), 0.0);
        vN = normalize(mat3(instanceMatrix) * normal); vY = position.y;
        vPen = domePen(aSeed, base);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColA; uniform float uLevel; varying vec3 vN; varying float vY; varying vec3 vPen;
      void main() {
        float front = max(dot(vN, vec3(0.0, 0.2, 1.0)), 0.0);
        vec3 c = vec3(0.025, 0.028, 0.04) + vPen * 0.09 * smoothstep(0.6, 1.7, vY) + uColA * 0.04 * front * uLevel;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const fans = new THREE.InstancedMesh(body, fanMat, n);
  place(fans);
  // The penlights: a glowing stick in each raised hand.
  const stick = new THREE.CylinderGeometry(0.03, 0.035, 0.46, 5).translate(0, 0.23, 0);
  const penMat = new THREE.ShaderMaterial({
    uniforms: U, toneMapped: false,
    vertexShader: `${DOME_GLSL}
      attribute float aSeed; varying vec3 vC; varying float vT;
      void main() {
        vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 p = domeRot(domeSwing(aSeed, base)) * position + HAND + vec3(0.0, domeJump(aSeed), 0.0);
        vC = domePen(aSeed, base); vT = position.y / 0.46;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `varying vec3 vC; varying float vT; void main() { gl_FragColor = vec4(vC * (1.2 + vT * 1.6) + vec3(0.05) * vT, 1.0); }`,
  });
  const pens = new THREE.InstancedMesh(stick, penMat, n);
  place(pens);
  // The glow round every light, which is what you see from across the bowl.
  const pos = new Float32Array(n * 3), yaw = new Float32Array(n);
  seats.forEach(([x, y, z, a], i) => { pos.set([x, y, z], i * 3); yaw[i] = a; });
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gg.setAttribute('aYaw', new THREE.BufferAttribute(yaw, 1));
  gg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const glowMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `${DOME_GLSL}
      uniform float uScale; attribute float aYaw; attribute float aSeed; varying vec3 vC;
      void main() {
        vec3 tip = domeRot(domeSwing(aSeed, position)) * vec3(0.0, 0.38, 0.0) + HAND + vec3(0.0, domeJump(aSeed), 0.0);
        float c = cos(aYaw), s = sin(aYaw);
        vec3 w = position + vec3(tip.x * c + tip.z * s, tip.y, -tip.x * s + tip.z * c);
        vC = domePen(aSeed, position);
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_PointSize = clamp(uScale * 0.7 / -mv.z, 1.5, 48.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vC; void main() { vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vC * a * a * 0.9, 1.0); }`,
  });
  const glow = new THREE.Points(gg, glowMat);
  glow.frustumCulled = false;
  g.add(glow);
  return { U, n, fans, pens, glow };
}

/* ---------- The set ---------- */
function buildDomeSet() {
  const g = new THREE.Group();
  g.position.set(DOME_AT.x, 0, DOME_AT.z);
  city.group.add(g);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, envMapIntensity: 0.05, ...extra });
  const glowMat = (c, k = 2.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const stageZ = 40;
  // The roof: the Dome's white fabric on its net of cables, catching the colour of the lights.
  const roofMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: new THREE.Color(0.1, 0.3, 0.3) } }, side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uGlow; varying vec3 vP;
      void main() {
        vec2 q = vP.xz / 9.0; vec2 gl = abs(fract(q) - 0.5);
        float cable = smoothstep(0.47, 0.5, max(gl.x, gl.y));
        float h = clamp(vP.y / 110.0, 0.0, 1.0);
        vec3 c = mix(vec3(0.05, 0.055, 0.07), vec3(0.12, 0.12, 0.14), h) + uGlow * (0.25 + 0.5 * h);
        gl_FragColor = vec4(c * (1.0 - cable * 0.45), 1.0);
      }`,
  });
  const roof = new THREE.Mesh(new THREE.SphereGeometry(112, 64, 18, 0, Math.PI * 2, 0, Math.PI / 2), roofMat);
  roof.scale.y = 0.38;
  roof.position.y = 31;
  g.add(roof);
  // The field: artificial turf under a stage floor, a faint grid of light.
  add(new THREE.CircleGeometry(112, 64).rotateX(-Math.PI / 2), std(0x0d0f14), 0, 0, 0);
  // The stands: lower bowl and upper deck, tier after tier, and a wall up to the roof.
  const standMat = std(0x1c1e28, { side: THREE.DoubleSide }), seatMat = std(0x2a1c30, { roughness: 0.9, side: THREE.DoubleSide });
  const th0 = 0.99, thL = Math.PI * 2 - 1.98;
  const tiers = (count, r0, dr, y0, dy) => {
    for (let k = 0; k < count; k++) {
      const r = r0 + k * dr, y = y0 + k * dy;
      add(new THREE.CylinderGeometry(r - dr / 2, r - dr / 2, dy, 72, 1, true, th0, thL).translate(0, -dy / 2, 0), standMat, 0, y, 0);
      add(new THREE.RingGeometry(r - dr / 2, r + dr / 2, 72, 1, th0 - Math.PI / 2, thL).rotateX(-Math.PI / 2), k % 2 ? seatMat : standMat, 0, y, 0);
    }
  };
  tiers(8, 64, 3.1, 1.6, 1.6);
  tiers(6, 92, 2.6, 19.6, 1.8);
  add(new THREE.CylinderGeometry(110, 110, 32, 72, 1, true).translate(0, 16, 0), standMat, 0, 0, 0);
  // The front of the upper deck: a ribbon of LEDs all the way round, words scrolling.
  const ribbon = document.createElement('canvas'); ribbon.width = 2048; ribbon.height = 64;
  const rtex = new THREE.CanvasTexture(ribbon); rtex.colorSpace = THREE.SRGBColorSpace; rtex.wrapS = THREE.RepeatWrapping; rtex.repeat.x = -5;
  add(new THREE.CylinderGeometry(89.6, 89.6, 2, 96, 1, true, th0, thL), new THREE.MeshBasicMaterial({ map: rtex, side: THREE.BackSide, toneMapped: false }), 0, 17.8, 0);
  // The main stage: wide, two levels, steps, an LED edge, and a runway out to the centre stage.
  const deckMat = std(0x16161e, { metalness: 0.5, roughness: 0.4 });
  add(new THREE.BoxGeometry(42, 1.2, 14), deckMat, 0, 0.6, stageZ);
  add(new THREE.BoxGeometry(26, 2.8, 5), deckMat, 0, 1.4, stageZ + 4.5);
  add(new THREE.BoxGeometry(5, 1.2, 60), deckMat, 0, 0.6, 10);
  add(new THREE.CylinderGeometry(7, 7, 1.2, 48), deckMat, 0, 0.6, -14);
  add(new THREE.BoxGeometry(22, 1.2, 12), deckMat, 0, 0.6, -40);
  const teal = glowMat(0x39d5c8), red = glowMat(0xff2d55), white = glowMat(0xffffff, 1.6);
  for (const [w, x, z] of [[42, 0, stageZ - 7], [26, 0, stageZ + 2]]) add(new THREE.BoxGeometry(w, 0.08, 0.08), teal, x, z === stageZ + 2 ? 2.82 : 1.22, z);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.08, 0.08, 46), teal, s * 2.5, 1.22, 13);
  add(new THREE.TorusGeometry(7, 0.06, 6, 64).rotateX(Math.PI / 2), white, 0, 1.23, -14);
  add(new THREE.BoxGeometry(22, 0.08, 0.08), red, 0, 1.22, -34);
  // The LED wall behind the band, and screens either side showing her live.
  const wall = document.createElement('canvas'); wall.width = 1024; wall.height = 340;
  const wtex = new THREE.CanvasTexture(wall); wtex.colorSpace = THREE.SRGBColorSpace;
  const wallMesh = add(new THREE.PlaneGeometry(46, 15.3), new THREE.MeshBasicMaterial({ map: wtex, toneMapped: false }), 0, 10.6, stageZ + 7.2);
  wallMesh.rotation.y = Math.PI;
  add(new THREE.BoxGeometry(47.5, 16.6, 0.6), std(0x0a0a10), 0, 10.6, stageZ + 7.6);
  const imag = new THREE.WebGLRenderTarget(384, 216);
  imag.texture.colorSpace = THREE.SRGBColorSpace;
  const imagCam = new THREE.PerspectiveCamera(22, 16 / 9, 0.3, 300);
  const screens = [];
  for (const s of [-1, 1]) {
    const m = add(new THREE.PlaneGeometry(22, 12.4), new THREE.MeshBasicMaterial({ map: imag.texture, toneMapped: false }), s * 34, 14, stageZ + 2);
    m.rotation.y = Math.PI + s * 0.32;
    const frame = add(new THREE.BoxGeometry(23, 13.4, 0.5), std(0x0a0a10), s * 34.15, 14, stageZ + 2.35);
    frame.rotation.y = m.rotation.y;
    add(new THREE.BoxGeometry(0.8, 8, 0.8), std(0x2a2c34, { metalness: 0.7 }), s * 34.3, 4, stageZ + 2.5);
    screens.push(m);
  }
  // Lighting: a great ring of truss over the field hung with moving heads, a truss over the
  // stage, laser emitters on the stage corners, followspots at the back of the bowl.
  const trussMat = std(0x30323a, { metalness: 0.8, roughness: 0.35 });
  add(new THREE.TorusGeometry(30, 0.5, 6, 64).rotateX(Math.PI / 2), trussMat, 0, 34, 4);
  add(new THREE.BoxGeometry(44, 0.9, 0.9), trussMat, 0, 22, stageZ - 4);
  const beamGeo = new THREE.ConeGeometry(2.2, 36, 18, 1, true).translate(0, -18, 0);
  const heads = [];
  const headMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const pivot = new THREE.Group(); pivot.position.set(Math.sin(a) * 30, 33.5, 4 + Math.cos(a) * 30);
    const cone = new THREE.Mesh(beamGeo, headMat()); pivot.add(cone);
    pivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), white));
    g.add(pivot); heads.push({ pivot, cone, a, i });
  }
  for (let i = 0; i < 12; i++) {
    const pivot = new THREE.Group(); pivot.position.set((i - 5.5) * 3.8, 21.5, stageZ - 4);
    const cone = new THREE.Mesh(beamGeo, headMat()); cone.scale.set(0.7, 0.62, 0.7); pivot.add(cone);
    g.add(pivot); heads.push({ pivot, cone, a: 0, i: i + 28, front: true });
  }
  const laserGeo = new THREE.CylinderGeometry(0.035, 0.035, 150, 4, 1, true).translate(0, 75, 0);
  const lasers = [];
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(laserGeo, new THREE.MeshBasicMaterial({ color: 0x39d5c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set(s * 19, 2.6, stageZ - 6.5);
    m.rotation.order = 'YXZ';
    g.add(m); lasers.push({ m, s, i });
  }
  const spotGeo = new THREE.ConeGeometry(1.4, 1, 20, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2);
  const follow = [];
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(spotGeo, new THREE.MeshBasicMaterial({ color: 0xfff6e8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(s * 70, 34, -70);
    g.add(m); follow.push(m);
  }
  // The crowd and the group.
  const crowd = buildDomeCrowd(g, stageZ);
  const band = buildCrowdIn(g, 3);
  for (const [k, x] of [['aoi', -3.2], ['kotone', 3.2], ['mirai', -6]]) { const p = addPerson(band, LOOKS[k]); p.x = x; p.z = stageZ - 1; p.yaw = Math.PI; }
  const fill = new THREE.PointLight(0xd0f0ff, 0, 60, 1.2);
  fill.position.set(0, 14, stageZ - 14);
  g.add(fill);
  const tetoLight = new THREE.PointLight(0xff3d6a, 0, 40, 1.4);
  g.add(tetoLight);
  // Confetti and silver streamers for the last chorus.
  const cn = 3200, cpos = new Float32Array(cn * 3), ccol = new Float32Array(cn * 3), cvel = new Float32Array(cn * 3);
  const cc = [[0.22, 0.84, 0.78], [1, 0.54, 0.72], [1, 1, 1], [1, 0.85, 0.4], [0.85, 0.88, 0.95]];
  for (let i = 0; i < cn; i++) { cpos.set([0, -50, 0], i * 3); ccol.set(cc[i % 5].map((v) => v * 1.6), i * 3); }
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  cgeo.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
  const confetti = new THREE.Points(cgeo, new THREE.PointsMaterial({ size: 0.26, vertexColors: true, toneMapped: false }));
  confetti.frustumCulled = false;
  g.add(confetti);
  // Flame cannons, a waterfall of sparks off the stage truss, smoke, and Teto's red spot.
  const flames = buildPuffs(260, 0xff9a40);
  flames.group.children[0].material.uniforms.diffuse.value.multiplyScalar(2.4);
  scene.add(flames.group);
  const sparks = buildPuffs(500, 0xffd88a);
  sparks.group.children[0].material.uniforms.diffuse.value.multiplyScalar(3);
  scene.add(sparks.group);
  const smoke = buildPuffs(160, 0x3a3440);
  scene.add(smoke.group);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(4, 40, 24, 1, true).translate(0, -20, 0), new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  spot.position.set(0, 36, -40);
  g.add(spot);
  return { g, stageZ, roofMat, ribbon, rtex, wall, wtex, imag, imagCam, screens, heads, lasers, follow, crowd, band, fill, tetoLight, confetti, cvel, flames, sparks, smoke, spot, frame: 0 };
}

/* ---------- The lights, each frame ---------- */
// What the song is doing now: its section, and how far through it.
function domeSection(D) {
  const r = rhythm.active;
  if (!r || D.phase !== 'song') return { name: D.phase === 'arrive' ? 'intro' : 'outro', k: 0 };
  const beat = r.music.time() / r.music.beat, L = r.music.layout;
  const s = (L.sections || []).find((x) => beat >= x.beat && beat < x.end);
  if (!s) return { name: 'outro', k: 1 };
  const last = L.sections.filter((x) => x.name === 'chorusUp').pop();
  return { name: s === last ? 'finale' : s.name, k: (beat - s.beat) / (s.end - s.beat) };
}

const DOME_LOOKS = {
  // sway [side, pump, wave], pattern [solid, rainbow, twinkle, gold], energy, head colour.
  intro: { sway: [0.4, 0, 0.6], pat: [1, 0, 0, 0], energy: 0.15, head: 0xd8fff8 },
  verse: { sway: [1, 0, 0], pat: [1, 0, 0, 0], energy: 0.3, head: 0x39d5c8 },
  pre: { sway: [0.6, 0.4, 0], pat: [0.7, 0, 0.3, 0], energy: 0.5, head: 0xffffff },
  chorus: { sway: [0, 1, 0], pat: [0.6, 0.4, 0, 0], energy: 1, head: 0xff8ab8 },
  chorusUp: { sway: [0, 1, 0], pat: [0.4, 0.6, 0, 0], energy: 1, head: 0xb47aff },
  inter: { sway: [0, 0.2, 0.8], pat: [0, 1, 0, 0], energy: 0.7, head: 0x39d5c8 },
  bridge: { sway: [0, 0, 1], pat: [0.2, 0, 0.8, 0], energy: 0.1, head: 0xffffff },
  finale: { sway: [0, 1, 0], pat: [0.2, 0.2, 0, 0.6], energy: 1, head: 0xffd36a },
  outro: { sway: [0.2, 0, 0.8], pat: [0.3, 0.7, 0, 0], energy: 0.6, head: 0xffffff },
};

function domeLights(dt, D, level, mode) {
  const S = D.set, beat = D.beat || D.t * 2, t = D.t, red = mode === 'red', split = mode === 'split';
  const sec = domeSection(D), look = red || split ? { sway: [0.5, 0, 0.5], pat: [1, 0, 0, 0], energy: 0.4, head: 0xff2d55 } : DOME_LOOKS[sec.name] || DOME_LOOKS.verse;
  if (sec.name !== D.lastSec) {
    // A cheer, and a burst of pyro, at the top of every chorus.
    if (D.phase === 'song' && (sec.name === 'chorus' || sec.name === 'chorusUp' || sec.name === 'finale')) { Sfx.cheer(1.2); domePyro(S, sec.name === 'finale' ? 1.5 : 0.9); }
    D.lastSec = sec.name;
  }
  // The crowd: everything eases towards what this part of the song wants.
  const U = S.crowd.U, k = Math.min(1, dt * 3);
  U.uBeat.value = beat; U.uTime.value = t;
  U.uEnergy.value += (look.energy * (level > 0.5 ? 1 : 0.3) - U.uEnergy.value) * k;
  U.uLevel.value += ((0.35 + level * 1.3) - U.uLevel.value) * k;
  U.uSplit.value += ((split ? 1 : 0) - U.uSplit.value) * k;
  U.uSway.value.lerp(cityV.set(...look.sway), k);
  const pw = U.uPat.value; pw.x += (look.pat[0] - pw.x) * k; pw.y += (look.pat[1] - pw.y) * k; pw.z += (look.pat[2] - pw.z) * k; pw.w += (look.pat[3] - pw.w) * k;
  U.uColA.value.lerp(red ? domeC.setRGB(1, 0.18, 0.32) : domeC.setRGB(0.22, 0.84, 0.78), k);
  U.uScale.value = innerHeight * 0.9;
  const headCol = domeC.setHex(red ? 0xff2d55 : look.head);
  S.roofMat.uniforms.uGlow.value.lerp(domeC2.copy(headCol).multiplyScalar(0.12 * level), k);
  // Moving heads: sweeping the bowl in figure-eights, all together on the chorus.
  const flash = D.flash || 0, on = level > 0.5;
  for (const h of S.heads) {
    const ph = h.front ? h.i * 0.5 : h.a;
    const together = sec.name === 'chorus' || sec.name === 'chorusUp' || sec.name === 'finale';
    const sp = together ? beat * Math.PI * 0.25 : beat * Math.PI * 0.125 + ph;
    h.pivot.rotation.x = (h.front ? -0.35 : 0) + Math.sin(sp) * (h.front ? 0.35 : 0.55);
    h.pivot.rotation.z = Math.sin(sp * 2 + (together ? 0 : ph)) * 0.45;
    h.cone.material.color.lerp(headCol, k);
    h.cone.material.opacity = on ? (0.04 + flash * 0.03) * (h.front ? 0.45 : 1) * (sec.name === 'bridge' && !h.front ? 0.3 : 1) : red && h.front ? 0.04 : 0;
  }
  // Laser fans off the stage corners, out over the crowd.
  const laserOn = on && (sec.name !== 'verse' || sec.k > 0.75) && sec.name !== 'bridge';
  for (const L of S.lasers) {
    const fan = (L.i / 11 - 0.5) * 1.4 * (0.6 + 0.4 * Math.sin(beat * Math.PI * 0.25));
    L.m.rotation.y = L.s * 0.25 + fan + Math.sin(beat * Math.PI * 0.5) * 0.15 * L.s;
    L.m.rotation.x = -Math.PI / 2 + 0.06 + 0.22 * (0.5 + 0.5 * Math.sin(beat * Math.PI * 0.25 + L.i * 0.3));
    L.m.material.color.setHex(red ? 0xff2d55 : sec.name === 'finale' ? 0xffd36a : L.i % 3 ? 0x39d5c8 : 0xffffff);
    L.m.material.opacity = laserOn || red ? 0.45 + flash * 0.3 : 0;
  }
  // Followspots from the back of the bowl, on her.
  for (const f of S.follow) {
    const tgt = cityP.set(player.pos.x - DOME_AT.x, player.pos.y - CITY.y + 1, player.pos.z - DOME_AT.z);
    f.lookAt(tgt.x + DOME_AT.x, tgt.y + CITY.y, tgt.z + DOME_AT.z);
    f.scale.set(1, 1, f.position.distanceTo(tgt));
    f.material.opacity = on && !red ? 0.08 : 0;
  }
  S.fill.intensity = level * (6 + flash * 6);
  // Sparks falling off the stage truss in the finale.
  if (sec.name === 'finale' && Math.random() < 0.9) for (let i = 0; i < 6; i++) S.sparks.emit(cityV.set(DOME_AT.x + (Math.random() - 0.5) * 42, CITY.y + 21.5, DOME_AT.z + S.stageZ - 4), cityP.set((Math.random() - 0.5) * 0.6, -3 - Math.random() * 3, (Math.random() - 0.5) * 0.6), { life: 1.8, size: 0.25, grow: 0.2, alpha: 1 });
  S.sparks.update(dt);
  // Fireworks off the stage on the big moments.
  if (level > 0.8 && !red && Math.random() < dt * (D.phase === 'after' ? 4 : 0.7)) {
    burst(new THREE.Vector3(DOME_AT.x + (Math.random() - 0.5) * 38, CITY.y + 2 + Math.random() * 3, DOME_AT.z + S.stageZ + 2), [0x39d5c8, 0xffffff, 0xb4fff2, 0xff8ab8][Math.floor(Math.random() * 4)], 40, 10);
  }
  // The screens either side: a live camera on her, every few frames.
  S.frame++;
  if (S.frame % 3 === 0) {
    const cam = S.imagCam, a = Math.sin(t * 0.3) * 0.5;
    cam.position.set(player.pos.x + Math.sin(a) * 6.5, player.pos.y + 1.6, player.pos.z - Math.cos(a) * 6.5);
    cam.lookAt(player.pos.x, player.pos.y + 1.35, player.pos.z);
    const auto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(S.imag);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = auto;
  }
  // The LED wall and the ribbon round the upper deck.
  if (S.frame % 4 === 0) domeWall(S, D, beat, red, sec, headCol);
  S.rtex.offset.x = (t * 0.02) % 1;
}

// The wall behind the stage: the countdown, then her name and the words she's singing over
// light bars that jump on the beat; Teto's red when she comes.
function domeWall(S, D, beat, red, sec, col) {
  const g = S.wall.getContext('2d'), w = 1024, h = 340;
  const hex = `#${col.getHexString()}`;
  g.fillStyle = red ? '#12020a' : '#02080c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 48; i++) {
    const v = Math.abs(Math.sin(beat * Math.PI * 0.5 + i * 0.7)) * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.3 + beat * 0.25)));
    g.fillStyle = red ? `rgba(255,45,85,${0.25 + v * 0.4})` : `rgba(57,213,200,${0.15 + v * 0.35})`;
    const bh = v * h * 0.8;
    g.fillRect(i * (w / 48) + 2, h - bh, w / 48 - 4, bh);
  }
  g.textAlign = 'center';
  if (D.count) { g.fillStyle = '#c8fff6'; g.font = 'bold 240px sans-serif'; g.fillText(String(D.count), w / 2, 260); }
  else if (red) { g.fillStyle = '#ff2d55'; g.font = 'bold 170px sans-serif'; g.fillText('TETO', w / 2 + Math.sin(beat * 9) * 4, 220); g.fillStyle = '#ffd0dc'; g.font = '30px sans-serif'; g.fillText('CRIMSON RECORDS', w / 2, 290); }
  else {
    const r = rhythm.active, L = r && r.music.layout;
    const line = L && L.lines.find((l) => beat >= l.beat - 0.5 && beat < l.end + 1);
    if (line) {
      g.fillStyle = '#ffffff'; g.font = 'bold 64px sans-serif';
      g.fillText(line.tokens.map((x) => x.text).join(' '), w / 2, 150, w - 60);
      g.fillStyle = hex; g.font = 'italic 32px serif'; g.fillText(line.en, w / 2, 210, w - 80);
    } else {
      const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#39d5c8'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, hex);
      g.fillStyle = grad; g.font = 'bold 130px sans-serif'; g.fillText('MIKU', w / 2, 180);
      g.fillStyle = '#fff'; g.font = '32px sans-serif'; g.fillText(`${G()}  ·  IDOL SUMMIT  ·  TOKYO DOME`, w / 2, 250);
    }
  }
  S.wtex.needsUpdate = true;
  // The ribbon: the same words all round the bowl.
  const rg = S.ribbon.getContext('2d');
  rg.fillStyle = '#04070a'; rg.fillRect(0, 0, 2048, 64);
  rg.font = 'bold 40px sans-serif'; rg.textBaseline = 'middle';
  const text = red ? 'TETO  ✦  CRIMSON DRILL PARADE  ✦  ' : `${G()}  ✦  IDOL SUMMIT  ✦  TOKYO DOME  ✦  CROWN OF LIGHT  ✦  `;
  rg.fillStyle = red ? '#ff2d55' : hex;
  for (let x = 0; x < 2048; x += rg.measureText(text).width) rg.fillText(text, x, 34);
  S.rtex.needsUpdate = true;
}
