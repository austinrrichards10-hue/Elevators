// The opening: aboard the stricken plane, a fall through the sky and the trees, and the
// crash site the plane leaves somewhere out on the map. Staged in the game world with hard
// cuts, impact frames, speed lines and letterboxing for an anime feel.

/* ---------- Models ---------- */
// "RAF Voyager Aeroplane (Private Plane)" by Foggy_123 (CC BY 4.0); see the README.
const PLANE = {
  length: 26, // nose to tail, in metres
  fileLength: 122.7, // the same in the file's own units
  engine: new THREE.Vector3(-5.3, -3, 0.6), // the near engine's exhaust, in metres from the centre
  wingFire: new THREE.Vector3(-5.0, -1.55, 2.3), // where the blast burns up through the wing, ahead of the window
};
let planeFile = null;
const planeMaterials = new Map();

function planeMaterial(meshIndex) {
  const index = planeFile.json.meshes[meshIndex].primitives[0].material;
  if (!planeMaterials.has(index)) {
    const def = planeFile.json.materials[index];
    const pbr = def.pbrMetallicRoughness || {};
    planeMaterials.set(index, new THREE.MeshStandardMaterial({
      map: planeFile.texture(pbr.baseColorTexture.index),
      metalness: (pbr.metallicFactor ?? 1) * 0.6,
      roughness: (pbr.roughnessFactor ?? 1) * 0.8,
      side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    }));
  }
  return planeMaterials.get(index);
}

let burntMaterial = null;
function getBurntMaterial() {
  if (!burntMaterial) burntMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2523, roughness: 0.95 });
  return burntMaterial;
}

// The plane, nose along +Z and scaled to PLANE.length. Its parts are listed by name in
// userData.parts (Propellers, Tail, Tail_Wings, Wings and so on).
function buildPlane() {
  if (!planeFile) planeFile = readGlb(PLANE_GLB);
  const model = animatedModel(planeFile, planeMaterial);
  model.root.scale.setScalar(PLANE.length / PLANE.fileLength);
  const plane = new THREE.Group();
  plane.add(model.root);
  plane.userData.parts = {};
  planeFile.json.nodes.forEach((node, i) => {
    if (node.mesh === undefined) return;
    const name = planeFile.json.meshes[node.mesh].name.replace('SM_Aeroplane_Smooth_M_', '').replace(/_0$/, '');
    plane.userData.parts[name] = model.root.getObjectByName(`n${i}`);
  });
  return plane;
}

// Pooled puffs for smoke, fire and steam, which drift, grow and fade over their lives. Each
// pool is a single draw: one quad instanced per puff, turned to face the camera in the vertex
// shader the way a sprite is, with every puff's place, size and opacity in per-instance
// attributes. It shades as a SpriteMaterial would (soft dot texture, colour, the height fog
// when `fog` is set), so the look is the same as one sprite per puff.
function buildPuffs(count, color, fog = false) {
  const group = new THREE.Group();
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  // xyz: the puff's place in the group; w: its size (0 while it's not alive).
  const place = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const shade = new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('puffPlace', place);
  geometry.setAttribute('puffAlpha', shade);
  geometry.instanceCount = count;
  // The quad alone says nothing of where the puffs are (they rise hundreds of metres), so the
  // bounds are kept round the live puffs each update, for culling. Their centre is also where
  // the pool is sorted among the other see-through things: the puffs that show most (the
  // opaque, the near and the big), so a column she stands in draws over steam beyond it.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { diffuse: { value: new THREE.Color() }, opacity: { value: 1 } }]);
  uniforms.diffuse.value.set(color);
  uniforms.map = { value: TEX.softDot };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog,
    vertexShader: `
      attribute vec4 puffPlace;
      attribute float puffAlpha;
      varying vec2 vPuffUv;
      varying float vPuffAlpha;
      #include <common>
      #include <fog_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>
      void main() {
        vPuffUv = uv;
        vPuffAlpha = puffAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(puffPlace.xyz, 1.0);
        vec2 scale = puffPlace.w * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        mvPosition.xy += position.xy * scale;
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 diffuse;
      uniform float opacity;
      uniform sampler2D map;
      varying vec2 vPuffUv;
      varying float vPuffAlpha;
      #include <common>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        vec4 diffuseColor = vec4(diffuse, opacity * vPuffAlpha);
        #include <logdepthbuf_fragment>
        diffuseColor *= texture2D(map, vPuffUv);
        vec3 outgoingLight = diffuseColor.rgb;
        #include <opaque_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.raycast = () => {};
  group.add(mesh);
  const P = place.array, A = shade.array, bounds = geometry.boundingSphere;
  const eye = new THREE.Vector3(), toLocal = new THREE.Matrix4();
  let x0 = 0, y0 = 0, z0 = 0, x1 = 0, y1 = 0, z1 = 0, big = 0;
  const reaim = () => {
    eye.copy(camera.position).applyMatrix4(toLocal.copy(mesh.matrixWorld).invert());
    let w = 0, kx = 0, ky = 0, kz = 0;
    for (let i = 0; i < count; i++) {
      const p = puffs[i];
      if (p.life <= 0 || A[i] <= 0) continue;
      const near = p.scale / Math.max(p.pos.distanceTo(eye), p.scale * 0.5);
      const k = A[i] * near * near;
      w += k; kx += k * p.pos.x; ky += k * p.pos.y; kz += k * p.pos.z;
    }
    const c = bounds.center;
    if (w > 0) c.set(kx / w, ky / w, kz / w);
    else c.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    bounds.radius = Math.hypot(Math.max(c.x - x0, x1 - c.x), Math.max(c.y - y0, y1 - c.y), Math.max(c.z - z0, z1 - c.z)) + big * 0.71;
  };
  const puffs = [];
  for (let i = 0; i < count; i++) puffs.push({ pos: new THREE.Vector3(), scale: 0, life: 0, max: 1, vel: new THREE.Vector3(), size: 1, grow: 1, alpha: 1, fall: 0 });
  let next = 0;
  const changed = () => { place.needsUpdate = true; shade.needsUpdate = true; };
  return {
    group,
    // `fall` pulls a puff down as it goes, for thrown snow and the like.
    emit(at, vel, { life = 2, size = 1, grow = 2, alpha = 0.6, fall = 0 } = {}) {
      const i = next;
      const p = puffs[i];
      next = (next + 1) % count;
      p.pos.copy(at);
      p.vel.copy(vel);
      p.life = p.max = life;
      p.size = p.scale = size;
      p.grow = grow;
      p.alpha = alpha;
      p.fall = fall;
      // Born transparent; its first update fades it in.
      P[i * 4] = at.x; P[i * 4 + 1] = at.y; P[i * 4 + 2] = at.z; P[i * 4 + 3] = size;
      A[i] = 0;
      changed();
      mesh.visible = true;
    },
    update(dt) {
      let live = 0, any = false;
      big = 0;
      x0 = y0 = z0 = Infinity;
      x1 = y1 = z1 = -Infinity;
      for (let i = 0; i < count; i++) {
        const p = puffs[i];
        if (p.life <= 0) continue;
        any = true;
        p.life -= dt;
        if (p.life <= 0) { P[i * 4 + 3] = 0; A[i] = 0; continue; }
        const age = 1 - p.life / p.max;
        if (p.fall) p.vel.y -= p.fall * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.scale = p.size * (1 + age * p.grow);
        P[i * 4] = p.pos.x; P[i * 4 + 1] = p.pos.y; P[i * 4 + 2] = p.pos.z; P[i * 4 + 3] = p.scale;
        A[i] = p.alpha * Math.min(1, age * 6) * (1 - age * age);
        live++;
        const { x, y, z } = p.pos;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (z < z0) z0 = z; if (z > z1) z1 = z;
        if (p.scale > big) big = p.scale;
      }
      if (any) changed();
      if (live) reaim();
      mesh.visible = live > 0;
    },
    // Scales each live puff's opacity this frame by fade(position in the group, size).
    fade(fn) {
      for (let i = 0; i < count; i++) {
        const p = puffs[i];
        if (p.life > 0) A[i] *= fn(p.pos, p.scale);
      }
      shade.needsUpdate = true;
      if (mesh.visible) reaim();
    },
    clear() {
      for (const p of puffs) p.life = 0;
      P.fill(0);
      A.fill(0);
      changed();
      mesh.visible = false;
    },
  };
}

/* ---------- The crash site ---------- */
const wreck = { group: null, x: 0, z: 0, smoke: null, fire: null, burning: false, clearing: null, colliders: [] };

// Picks somewhere new for the plane to come down, clears the trees there and builds the
// broken plane, quiet until the cutscene (or a skip) sets it burning. A saved game passes
// `at` ({ x, z, heading }) to put it back where it was.
function placeWreck(at = null) {
  if (wreck.group) scene.remove(wreck.group);
  for (const geo of wreck.ownGeometry || []) geo.dispose();
  if (wreck.scorchMaterial) wreck.scorchMaterial.dispose();
  if (wreck.clearing) CLEARINGS.splice(CLEARINGS.indexOf(wreck.clearing), 1);
  for (const c of wreck.colliders) LANDMARK_COLLIDERS.splice(LANDMARK_COLLIDERS.indexOf(c), 1);
  let x = 0, z = 0;
  for (let tries = 0; tries < 50 && !at; tries++) {
    const a = Math.random() * Math.PI * 2, d = 260 + Math.random() * 340;
    x = LANDMARKS.start.x + Math.cos(a) * d;
    z = LANDMARKS.start.z + Math.sin(a) * d;
    if (Math.hypot(x, z) < WORLD_RADIUS - 90 && SITES.every((s) => Math.hypot(x - s.x, z - s.z) > s.clear + 45)
      && POINTS_OF_INTEREST.every((p) => Math.hypot(x - p.x, z - p.z) > 40) && SITE_SHARDS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > 30)) break;
  }
  if (at) ({ x, z } = at);
  wreck.x = x;
  wreck.z = z;
  wreck.clearing = [{ x, z }, 24];
  CLEARINGS.push(wreck.clearing);
  // The fuselage lies along `heading`; colliders run down its length, plus the broken tail.
  const heading = at ? at.heading : Math.random() * Math.PI * 2;
  const along = (d) => ({ x: x + Math.sin(heading) * d, z: z + Math.cos(heading) * d });
  wreck.colliders = [-10, -5, 0, 5, 10].map((d) => ({ ...along(d), r: 1.7, h: 4 }));
  const tailAt = { x: x + Math.sin(heading + 0.5) * -17, z: z + Math.cos(heading + 0.5) * -17 };
  wreck.colliders.push({ ...tailAt, r: 2, h: 4 });
  LANDMARK_COLLIDERS.push(...wreck.colliders);

  const group = new THREE.Group();
  group.position.set(x, groundHeight(x, z), z);
  // The body ploughed in nose-first and rolled onto one wing, its tail fin torn away.
  const body = buildPlane();
  body.position.set(0, 1.5, 0);
  body.rotation.set(0.12, heading, 0.28, 'YXZ');
  for (const part of ['Tail', 'Tail_Wings', 'Exhaust']) body.userData.parts[part].visible = false;
  group.add(body);
  const tail = buildPlane();
  for (const [name, part] of Object.entries(tail.userData.parts)) part.visible = name === 'Tail' || name === 'Tail_Wings';
  tail.position.set(tailAt.x - x, groundHeight(tailAt.x, tailAt.z) - group.position.y - 1.2, tailAt.z - z);
  tail.rotation.set(-0.2, heading + 0.9, -0.55, 'YXZ');
  // The torn section sits forward so its base, not its centre, lies on the ground.
  tail.children[0].position.z = 9.5;
  group.add(tail);
  wreck.body = body;
  wreck.heading = heading;
  // A burnt patch draped over the ground's shape.
  const scorchGeo = new THREE.RingGeometry(0.01, 15, 28, 8).rotateX(-Math.PI / 2);
  const sp = scorchGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, groundHeight(x + sp.getX(i), z + sp.getZ(i)) - group.position.y + 0.06);
  const scorch = new THREE.Mesh(scorchGeo, new THREE.MeshBasicMaterial({ color: 0x1b1714, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  group.add(scorch);
  wreck.ownGeometry = [scorchGeo];
  wreck.scorchMaterial = scorch.material;
  for (let i = 0; i < 14; i++) {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random(), 0.12, 0.4 + Math.random()), Math.random() < 0.5 ? planeMaterial(8) : getBurntMaterial());
    wreck.ownGeometry.push(piece.geometry);
    const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 12;
    piece.position.set(Math.cos(a) * d, groundHeight(x + Math.cos(a) * d, z + Math.sin(a) * d) - group.position.y + 0.08, Math.sin(a) * d);
    piece.rotation.set(Math.random(), Math.random() * 3, Math.random());
    group.add(piece);
  }
  // Fires in the wreckage, and a smoke column hundreds of metres tall, so it shows above
  // the treetops from far away.
  wreck.fire = buildPuffs(40, 0xff9a4a);
  wreck.fire.group.position.set(0, 0.5, 0);
  group.add(wreck.fire.group);
  wreck.smoke = buildPuffs(240, 0x302d2a);
  group.add(wreck.smoke.group);
  scene.add(group);
  wreck.group = group;
  wreck.burning = false;
  placeSurvivor();
  wreck.emitT = 0;
}

const puffVel = new THREE.Vector3(), puffAt = new THREE.Vector3();
function updateWreck(dt) {
  if (!wreck.group || !wreck.burning) return;
  wreck.emitT -= dt;
  while (wreck.emitT <= 0) {
    wreck.emitT += 0.08;
    puffAt.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3);
    wreck.smoke.emit(puffAt, puffVel.set(1.5 + Math.random() * 2, 14 + Math.random() * 5, 0.6), { life: 18, size: 8, grow: 6, alpha: 0.85 });
    puffAt.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4);
    wreck.fire.emit(puffAt, puffVel.set(0, 1.5 + Math.random() * 2, 0), { life: 0.8, size: 0.9, grow: -0.5, alpha: 0.9 });
  }
  wreck.smoke.update(dt);
  updateSurvivor(dt);
  wreck.fire.update(dt);
}

function setWreckBurning() {
  if (!wreck.burning) {
    wreck.burning = true;
    // Start with a column already standing, as if it has been burning a while.
    for (let i = 0; i < 160; i++) updateWreck(0.12);
  }
}

/* ---------- The other survivor ---------- */
// Teto rode the plane down still buckled into her seat, which tore loose in the crash and
// ploughed a furrow through the snow off the wreck's nose. She's slumped in it, out cold.
const survivor = { avatar: null, seat: null, furrow: null, x: 0, z: 0, chestX: 0 };
const SURVIVOR_SEAT = { ahead: 18, across: 4, sink: 0.14, tip: -0.32, roll: 0.22, furrow: 7.5 };

function buildFurrow() {
  const group = new THREE.Group();
  // The trough itself, a little darker than the snow round it, draped over the ground.
  const trough = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, 4, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x7482a8, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  group.add(trough);
  // Snow thrown up along its sides and piled in front of the seat.
  const lumps = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.95 }), 34);
  lumps.castShadow = false;
  group.add(lumps);
  scene.add(group);
  return { group, trough, lumps };
}

function placeSurvivor() {
  if (!survivor.avatar) survivor.avatar = createAvatar(scene, 'tetoAsleep');
  if (!survivor.seat) {
    const leather = new THREE.MeshStandardMaterial({ color: 0xd8ccb5, roughness: 0.72 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 0.6, metalness: 0.3 });
    const belt = new THREE.MeshStandardMaterial({ color: 0x2c2e35, roughness: 0.8 });
    survivor.seat = buildSeat(leather, trim, { torn: true, belt });
    scene.add(survivor.seat);
    survivor.furrow = buildFurrow();
  }
  const a = survivor.avatar, seat = survivor.seat;
  // Off the nose of the plane, clear of the wings.
  const { ahead, across } = SURVIVOR_SEAT;
  survivor.x = wreck.x + Math.sin(wreck.heading) * ahead + Math.cos(wreck.heading) * across;
  survivor.z = wreck.z + Math.cos(wreck.heading) * ahead - Math.sin(wreck.heading) * across;
  // It came to rest facing away from the plane, tipped back and over on one side.
  const yaw = wreck.heading + 0.25;
  seat.position.set(survivor.x, groundHeight(survivor.x, survivor.z) - SURVIVOR_SEAT.sink, survivor.z);
  seat.rotation.set(SURVIVOR_SEAT.tip, yaw, SURVIVOR_SEAT.roll, 'YXZ');
  seat.visible = true;
  // The furrow runs back towards the wreck.
  const { trough, lumps } = survivor.furrow;
  const back = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), across3 = new THREE.Vector3(back.z, 0, -back.x);
  const pos = trough.geometry.attributes.position;
  const len = SURVIVOR_SEAT.furrow;
  for (let i = 0; i < pos.count; i++) {
    // The plane's own x and z are across and along before they're laid on the ground.
    const u = pos.getZ(i) + 0.5, w = pos.getX(i) * lerp(0.6, 1.05, u);
    const x = survivor.x + back.x * (u * len + 0.2) + across3.x * w, z = survivor.z + back.z * (u * len + 0.2) + across3.z * w;
    pos.setXYZ(i, x, groundHeight(x, z) + 0.03 - (1 - Math.abs(pos.getX(i)) * 2) * 0.02, z);
  }
  pos.needsUpdate = true;
  trough.geometry.computeBoundingSphere();
  const rand = seededRandom(Math.floor(survivor.x * 13 + survivor.z * 7));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < lumps.count; i++) {
    let along, off;
    if (i < 24) { along = 0.4 + rand() * len; off = (i % 2 ? 1 : -1) * (0.55 + rand() * 0.25); }
    else { along = -0.55 - rand() * 0.5; off = (rand() - 0.5) * 1.1; }
    p.set(survivor.x + back.x * along + across3.x * off, 0, survivor.z + back.z * along + across3.z * off);
    const size = i < 24 ? 0.05 + rand() * 0.09 * (1 - along / len) : 0.07 + rand() * 0.08;
    p.y = groundHeight(p.x, p.z) - size * 0.15;
    q.setFromEuler(new THREE.Euler(rand(), rand() * 6, rand()));
    s.set(size * 1.4, size * 0.6, size);
    lumps.setMatrixAt(i, m.compose(p, q, s));
  }
  lumps.instanceMatrix.needsUpdate = true;
  survivor.furrow.group.visible = true;
  // Slumped against the side it tipped to, head lolling, arms limp in her lap.
  const sh = a.armL.upper.position;
  poseSeated(a, seat, {
    slump: 1,
    hands: {
      l: new THREE.Vector3(sh.x + 0.1, sh.y - 0.5, 0.18),
      r: new THREE.Vector3(-sh.x - 0.28, sh.y - 0.56, 0.06),
      poleL: POLE_L, poleR: POLE_R,
    },
  });
  survivor.chestX = a.chest.rotation.x;
  a.reset();
}

function updateSurvivor(dt) {
  if (!survivor.avatar || !survivor.avatar.root.visible) return;
  // Her hair only needs to settle when someone's near enough to see it.
  if (Math.hypot(survivor.x - player.pos.x, survivor.z - player.pos.z) < 80) survivor.avatar.simulate(dt);
}

/* ---------- Overlays ---------- */
const cineCanvas = () => $('speedlines');
function drawSpeedLines(strength, time) {
  const canvas = cineCanvas();
  const w = canvas.width = innerWidth, h = canvas.height = innerHeight;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, w, h);
  if (strength <= 0.01) return;
  const rand = seededRandom(Math.floor(time * 24));
  const cx = w / 2, cy = h / 2, reach = Math.hypot(w, h) / 2;
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2;
    const inner = reach * (0.35 + rand() * 0.35);
    const width = 0.004 + rand() * 0.012;
    g.fillStyle = `rgba(255,255,255,${(0.25 + rand() * 0.55) * strength})`;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    g.lineTo(cx + Math.cos(a - width) * reach * 1.1, cy + Math.sin(a - width) * reach * 1.1);
    g.lineTo(cx + Math.cos(a + width) * reach * 1.1, cy + Math.sin(a + width) * reach * 1.1);
    g.fill();
  }
}

function caption(text, cls = '') {
  const el = $('cine-caption');
  el.className = cls;
  el.textContent = text;
  el.classList.toggle('on', !!text);
}

/* ---------- The fall pose ---------- */
const fallQ = new THREE.Quaternion(), fallYaw = new THREE.Quaternion(), fallTilt = new THREE.Quaternion();
const fallPivot = new THREE.Vector3(), fallTarget = new THREE.Vector3(), fallRoll = new THREE.Quaternion();
const LYING_ROLL = 1.0;
const SIDE_AXIS = new THREE.Vector3(1, 0, 0), UP_AXIS = new THREE.Vector3(0, 1, 0);

// Spread out belly-down, arms thrown up, legs kicking, turning slowly as she drops.
function poseFalling(dt, t, at, tumble) {
  player.stride = 0;
  player.runBlend = 0;
  player.aimT = 0;
  poseAvatar(dt, new THREE.Vector3(), false);
  const { root, legL, legR, armL, armR, chest, head } = avatar;
  fallYaw.setFromAxisAngle(UP_AXIS, player.bodyYaw + t * 0.6);
  fallTilt.setFromAxisAngle(SIDE_AXIS, 1.1 + Math.sin(t * 2.3) * tumble);
  fallQ.copy(fallYaw).multiply(fallTilt);
  root.quaternion.copy(fallQ);
  fallPivot.set(0, avatar.dims.hips, 0).applyQuaternion(fallQ);
  root.position.copy(at).sub(fallPivot);
  legL.thigh.rotation.x = -0.5 + Math.sin(t * 9) * 0.35;
  legR.thigh.rotation.x = -0.3 - Math.sin(t * 9) * 0.35;
  legL.shin.rotation.x = 0.9 + Math.sin(t * 7) * 0.3;
  legR.shin.rotation.x = 1.1 - Math.sin(t * 7) * 0.3;
  chest.rotation.x = -0.25;
  head.rotation.x = -0.5;
  for (const [arm, side] of [[armL, 1], [armR, -1]]) {
    const s = arm.upper.position;
    fallTarget.set(s.x + side * 0.24, s.y + 0.16 + Math.sin(t * 8 + side) * 0.07, 0.06 + Math.cos(t * 6 + side) * 0.08);
    solveArm(arm, fallTarget, side > 0 ? POLE_L : POLE_R);
    // Hands carry straight on from the forearms, rather than bending back at the wrist.
    arm.hand.quaternion.identity();
  }
  avatar.simulate(dt);
}

// Sprawled in the snow after the landing, half on her side so her face shows.
function poseLying(dt, at) {
  poseAvatar(dt, new THREE.Vector3(), false);
  const { root } = avatar;
  fallYaw.setFromAxisAngle(UP_AXIS, player.bodyYaw);
  fallTilt.setFromAxisAngle(SIDE_AXIS, 1.45);
  fallQ.copy(fallYaw).multiply(fallTilt).multiply(fallRoll.setFromAxisAngle(UP_AXIS, LYING_ROLL));
  root.quaternion.copy(fallQ);
  fallPivot.set(0, avatar.dims.hips, 0).applyQuaternion(fallQ);
  root.position.copy(at).sub(fallPivot).add(new THREE.Vector3(0, 0.13, 0));
  avatar.legL.thigh.rotation.x = 0.1;
  avatar.legR.thigh.rotation.x = -0.15;
  avatar.legL.shin.rotation.x = 0.4;
  avatar.legR.shin.rotation.x = 0.2;
  avatar.simulate(dt);
}

/* ---------- The cutscene ---------- */
// Aboard first, through Miku's eyes: Teto across from her, the engine going up outside the
// window, the door tearing away and the cabin emptying out of it, Miku with it. Then the fall,
// the treetops and the snow. It plays through; there's no skipping it.
const CUT = {
  eject: 9.6, // out of the door
  slow: 0.35, // story-time speed as she's thrown clear
  slowEnd: 11.2,
  canopy: 14.0, // into the top of the tree
  through: 15.6, // out of the bottom of it
  land: 16.5, // into the snow
  black: 17.0,
  wake: 18.5,
  boom: 19.5,
  end: 22.3,
  altitude: 120,
  speed: 55,
  cruise: 16, // how fast the cabin scenes seem to fly: slow enough to keep the ground below loaded
};
// The cabin's beats.
const CABIN_T = { vlog: 2.0, back: 3.9, window: 4.1, blast: 5.0, turn: 5.65, alarm: 5.9, yell: 6.0, yell2: 6.9, door: 7.4, burst: 8.4, lookBack: 8.85, lookOut: 9.25 };
const CABIN_EYE = new THREE.Vector3(-0.46, CABIN.floor + 0.86, 0.5);

const cutscene = { active: false, t: 0, w: 0, plane: null, cabin: null, teto: null, phone: null, trail: null, debris: null, boughs: [], tree: null, dir: new THREE.Vector3(), side: new THREE.Vector3(), engine: null, wind: null, fired: {} };
const camTarget = new THREE.Vector3(), camAt = new THREE.Vector3(), herAt = new THREE.Vector3(), planeAt = new THREE.Vector3(), ground = new THREE.Vector3();
const cutV = new THREE.Vector3(), cutV2 = new THREE.Vector3(), cutUp = new THREE.Vector3();
const exitAt = new THREE.Vector3(), canopyTop = new THREE.Vector3(), canopyBottom = new THREE.Vector3();

function landingSpot() {
  return ground.set(LANDMARKS.start.x, groundHeight(LANDMARKS.start.x, LANDMARKS.start.z), LANDMARKS.start.z);
}

// Story time: it runs slow as she's thrown clear, so everything after is later in it.
function storyTime(t) {
  if (t <= CUT.eject) return t;
  if (t <= CUT.slowEnd) return CUT.eject + (t - CUT.eject) * CUT.slow;
  return CUT.eject + (CUT.slowEnd - CUT.eject) * CUT.slow + (t - CUT.slowEnd);
}

function planePosition(w, out) {
  const L = landingSpot();
  // Over the landing spot as she goes out; losing height after the blast.
  const travel = w < CUT.eject ? (w - CUT.eject) * CUT.cruise : (w - CUT.eject) * CUT.speed;
  const sink = w > CABIN_T.blast ? (w - CABIN_T.blast) ** 1.4 * 0.6 : 0;
  return out.copy(L).addScaledVector(cutscene.dir, travel).add(cutV2.set(0, CUT.altitude + 6 - sink + Math.sin(w * 2.1) * 0.6, 0));
}

// Where she is once she's out of the door: arcing away from the plane down to the top of the
// tree by the clearing, smashing down through it, and thrown out of it into the snow.
function fallPosition(t, out) {
  const L = landingSpot();
  if (t < CUT.canopy) {
    const s = clamp((storyTime(t) - CUT.eject) / (storyTime(CUT.canopy) - CUT.eject), 0, 1);
    out.lerpVectors(exitAt, canopyTop, s);
    out.y = lerp(exitAt.y, canopyTop.y, s * s * (3 - 2 * s) * 0.35 + s * 0.65);
    out.addScaledVector(cutscene.dir, Math.sin(s * Math.PI) * 12);
    return out;
  }
  if (t < CUT.through) {
    // Each bough she hits checks her for a moment.
    const u = (t - CUT.canopy) / (CUT.through - CUT.canopy);
    const checked = u - 0.06 * Math.sin(u * Math.PI * 4) * (1 - u);
    out.lerpVectors(canopyTop, canopyBottom, clamp(checked, 0, 1));
    out.addScaledVector(cutscene.side, Math.sin(u * 9) * 0.25);
    return out;
  }
  const u = clamp((t - CUT.through) / (CUT.land - CUT.through), 0, 1);
  out.lerpVectors(canopyBottom, L, u);
  out.y = lerp(canopyBottom.y, L.y, u * u) + Math.sin(u * Math.PI) * 0.9;
  return out;
}

// The tree by the clearing that breaks her fall: the nearest tall one just outside it.
function pickCrashTree() {
  const L = landingSpot();
  let best = null;
  for (const tree of world.treesNear(L.x, L.z, 18)) {
    const d = Math.hypot(tree.placement.x - L.x, tree.placement.z - L.z);
    if (tree.height < 8 || d < 7.5) continue;
    if (!best || d < best.d) best = { tree, d };
  }
  // Failing one, a point in the air where a tree would be.
  const at = best ? cutV.set(best.tree.placement.x, best.tree.placement.y, best.tree.placement.z) : cutV.copy(L).addScaledVector(cutscene.side, 9);
  const height = best ? best.tree.height : 12;
  // Down through its crown a little in from the trunk, on the clearing's side.
  const toL = cutV2.set(L.x - at.x, 0, L.z - at.z).normalize();
  canopyTop.copy(at).addScaledVector(toL, 1.0);
  canopyTop.y = at.y + height + 1.5;
  canopyBottom.copy(at).addScaledVector(toL, 1.7);
  canopyBottom.y = at.y + 2.4;
  cutscene.tree = { x: at.x, y: at.y, z: at.z, height, toL: toL.clone() };
}

// Boughs for the fall through the tree, close to her path, so they whip past the lens.
function placeBoughs() {
  if (!cutscene.boughs.length) {
    const mat = new THREE.MeshStandardMaterial({ map: TEX.boughSnowy, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.92 });
    const geo = new THREE.PlaneGeometry(2.2, 1.2).rotateX(-Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      cutscene.boughs.push(mesh);
    }
  }
  const rand = seededRandom(7);
  cutscene.boughs.forEach((mesh, i) => {
    const u = (i + 0.5) / cutscene.boughs.length;
    mesh.position.lerpVectors(canopyTop, canopyBottom, u);
    mesh.position.x += (rand() - 0.5) * 1.6;
    mesh.position.z += (rand() - 0.5) * 1.6;
    mesh.rotation.set((rand() - 0.5) * 0.5, rand() * 6.28, (rand() - 0.5) * 0.4);
    mesh.visible = true;
  });
}

function startCutscene() {
  const L = landingSpot();
  cutscene.dir.set(wreck.x - L.x, 0, wreck.z - L.z).normalize();
  cutscene.side.set(cutscene.dir.z, 0, -cutscene.dir.x);
  if (!cutscene.plane) {
    cutscene.plane = buildPlane();
    cutscene.cabin = buildCabin();
    cutscene.plane.add(cutscene.cabin.group);
    cutscene.trail = buildPuffs(160, 0x2a2828);
    cutscene.debris = buildPuffs(60, 0xff9a50);
    cutscene.dust = buildPuffs(40, 0xf2f5ff);
    cutscene.blast = buildPuffs(60, 0xffb060);
    // Fire glows through the bloom.
    for (const pool of [cutscene.blast, cutscene.debris]) pool.group.children[0].material.uniforms.diffuse.value.multiplyScalar(2.2);
    scene.add(cutscene.plane, cutscene.trail.group, cutscene.debris.group, cutscene.dust.group, cutscene.blast.group);
    cutscene.teto = createAvatar(scene, 'crimson');
    // Her phone, in a glittery lilac case, the screen lit.
    const phone = new THREE.Group();
    phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.011), new THREE.MeshBasicMaterial({ color: 0xc9b6ff })));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe9ff).multiplyScalar(1.5) }));
    screen.position.z = -0.006;
    screen.rotation.y = Math.PI;
    phone.add(screen);
    cutscene.phone = phone;
    cutscene.teto.armR.hand.add(phone);
    phone.position.set(0.0, -0.085, 0.03);
    phone.rotation.set(-0.3, 0, 0);
  }
  const { plane, cabin } = cutscene;
  plane.visible = true;
  // The propellers spin too fast to see in flight.
  plane.userData.parts.Propellers.visible = false;
  setPlaneShell(false);
  cabin.group.visible = true;
  resetCabin();
  cutscene.teto.setVisible(true);
  cutscene.trail.clear();
  cutscene.debris.clear();
  cutscene.dust.clear();
  cutscene.blast.clear();
  for (const b of cutscene.boughs) b.visible = false;
  cutscene.active = true;
  cutscene.t = 0;
  cutscene.w = 0;
  cutscene.emitT = 0;
  cutscene.fired = {};
  player.bodyYaw = player.yaw = Math.atan2(cutscene.dir.x, cutscene.dir.z);
  // Load the ground under the whole flight and fall, and thin the fog for the views from the air.
  world.stream(L, Infinity, 230);
  pickCrashTree();
  scene.fog.density = 0.0035;
  document.body.classList.add('cinematic');
  canvas.style.filter = 'saturate(1.3) contrast(1.08)';
  cutscene.engine = Sfx.loop({ noise: 0.25, filter: 700, hum: 0.4, humFreq: 62 });
  cutscene.engine.set(0.42, 1);
  cutscene.wind = Sfx.loop({ noise: 1, filter: 1400 });
  $('flash').className = 'black';
}

// Inside the cabin the plane's own skin is hidden, so the windows look out on the real
// wing, engine and sky. Outside it's put back.
function setPlaneShell(visible) {
  const parts = cutscene.plane.userData.parts;
  for (const name of ['Fusel_Lodge', 'Windows', 'Windowframe']) if (parts[name]) parts[name].visible = visible;
}

function resetCabin() {
  const c = cutscene.cabin;
  c.door.visible = true;
  c.door.position.copy(c.doorCentre);
  c.door.rotation.set(0, 0, 0);
  c.leak.material.opacity = 0;
  for (const m of c.masks) m.holder.visible = false;
  for (const l of c.loose) { l.mesh.visible = l.onTable; l.gone = false; l.mesh.position.copy(l.home); l.vel.set(0, 0, 0); }
  c.mist.clear();
  c.wallMat.color.setRGB(1, 1, 1);
  c.lightMat.color.setHex(0xfff1dc).multiplyScalar(1.6);
}

function finishCutscene() {
  if (!cutscene.active) return;
  cutscene.active = false;
  cutscene.plane.visible = false;
  cutscene.cabin.group.visible = false;
  cutscene.teto.setVisible(false);
  for (const b of cutscene.boughs) b.visible = false;
  cutscene.trail.clear();
  cutscene.debris.clear();
  cutscene.dust.clear();
  cutscene.blast.clear();
  scene.fog.density = FOG_DENSITY;
  document.body.classList.remove('cinematic');
  canvas.style.filter = '';
  drawSpeedLines(0, 0);
  caption('');
  $('flash').className = '';
  cutscene.engine.stop();
  cutscene.wind.stop();
  setWreckBurning();
  const L = landingSpot();
  player.pos.copy(L);
  player.bodyYaw = player.yaw = Math.atan2(wreck.x - L.x, wreck.z - L.z);
  player.pitch = 0.08;
  avatar.reset();
  beginPlay();
}

// Impact frames: a white flash or an inverted frame, a few frames long.
function impact(kind, ms = 70) {
  const el = $('flash');
  el.className = kind;
  clearTimeout(impact.timer);
  impact.timer = setTimeout(() => { el.className = ''; }, ms);
}

function once(key, at, fn) {
  if (!cutscene.fired[key] && cutscene.t >= at) { cutscene.fired[key] = true; fn(); }
}

// A line from Teto, in her voice.
function tetoLine(text) {
  crimsonSay(text);
  Sfx.crimsonChatter(text);
}

/* ---------- Aboard ---------- */
const tetoHands = { l: new THREE.Vector3(), r: new THREE.Vector3(), poleL: new THREE.Vector3(0.35, -0.9, 0.25), poleR: new THREE.Vector3(-0.35, -0.9, 0.25) };
const tetoHead = new THREE.Vector3();

// Teto, across the table: on her phone, then filming, then holding on for dear life.
function poseCabinTeto(t, dt) {
  const T = CABIN_T, a = cutscene.teto;
  const s = a.armL.upper.position;
  const fright = t > T.blast;
  let lean = 0;
  if (!fright) {
    const filming = span(t, T.vlog, T.vlog + 0.3) * (1 - span(t, T.back, T.back + 0.4));
    // Scrolling in her lap, or holding the phone up to film.
    tetoHands.l.set(lerp(0.03, s.x + 0.2, filming), lerp(-0.13, -0.42, filming), lerp(0.25, 0.16, filming));
    tetoHands.r.set(lerp(-0.035, -0.07, filming), lerp(-0.13, 0.12, filming) + Math.sin(t * 7) * 0.004, lerp(0.25, 0.36, filming));
    tetoHead.set(lerp(0.4, 0.02, filming), lerp(0, -0.12, filming), lerp(0.05, 0.12, filming));
    if (filming > 0.5 && t < T.back) tetoHead.z += Math.sin(t * 5) * 0.04;
  } else {
    // Hands clamped on the armrests, flinching with every jolt.
    const jolt = Math.max(0, 1 - (t - T.blast) * 3);
    tetoHands.l.set(s.x + 0.26, -0.28, 0.1);
    tetoHands.r.set(-s.x - 0.26, -0.28, 0.1);
    tetoHead.set(-0.15 - jolt * 0.3 + Math.sin(t * 23) * 0.03, Math.sin(t * 6.5) * 0.35, Math.sin(t * 19) * 0.05);
    // When the door goes she's dragged towards it against her belt, and looks.
    if (t > T.door) tetoHead.y = lerp(tetoHead.y, 0.9, span(t, T.door, T.door + 0.4));
    if (t > T.burst) { lean = -0.25 + Math.sin(t * 17) * 0.04; tetoHands.r.set(-s.x - 0.1, 0.1, 0.38); }
  }
  poseSeated(a, cutscene.cabin.seats.teto, { hands: tetoHands, head: tetoHead, lean });
  // The phone goes flying for the door.
  cutscene.phone.visible = !fright || t < T.blast + 0.15;
  a.simulate(dt);
}

// Things in the cabin: masks, lights, the door, and everything loose once it's gone.
function updateCabin(t, dt) {
  const T = CABIN_T, c = cutscene.cabin;
  // The alarm washes everything red in pulses.
  if (t > T.alarm) {
    const pulse = 0.5 + 0.5 * Math.sin((t - T.alarm) * 9);
    c.wallMat.color.setRGB(1, 0.55 + 0.25 * (1 - pulse), 0.5 + 0.25 * (1 - pulse));
    c.lightMat.color.setRGB(2 * pulse + 0.4, 0.15, 0.12);
  }
  for (const m of c.masks) {
    if (!m.holder.visible) continue;
    m.holder.rotation.set(Math.sin(t * 5 + m.phase) * 0.25 + (t > T.burst ? 0.5 : 0), 0, Math.sin(t * 4 + m.phase) * 0.2 + (t > T.burst ? -0.7 : 0));
  }
  // The door: rattling, its seal glowing, then gone.
  const d = c.door;
  if (t > T.door && t < T.burst) {
    const k = span(t, T.door, T.burst);
    d.position.copy(c.doorCentre).add(cutV.set((Math.random() - 0.5) * 0.02 * k + k * 0.015, (Math.random() - 0.5) * 0.015 * k, 0));
    c.leak.material.opacity = 0.15 + k * 0.6 * (0.6 + Math.random() * 0.4);
  }
  if (t > T.burst && d.visible) {
    const u = t - T.burst;
    d.position.copy(c.doorCentre).add(cutV.set(0.3 + u * 18, u * 2, -u * u * 40));
    d.rotation.set(u * 6, u * 4, u * 9);
    c.leak.material.opacity = 0;
    if (u > 0.5) d.visible = false;
  }
  // Everything loose streams for the doorway and out.
  if (t > T.burst) {
    const out = cutV2.copy(c.doorCentre).add(cutV.set(0.6, 0, 0));
    for (const l of c.loose) {
      if (l.gone) continue;
      l.mesh.visible = true;
      const toDoor = cutV.subVectors(out, l.mesh.position);
      const dist = toDoor.length();
      l.vel.addScaledVector(toDoor.normalize(), 40 * dt);
      l.mesh.position.addScaledVector(l.vel, dt);
      l.mesh.rotation.x += l.spin.x * dt; l.mesh.rotation.y += l.spin.y * dt; l.mesh.rotation.z += l.spin.z * dt;
      if (dist < 0.3 || l.mesh.position.x > CABIN.radius + 0.4) { l.gone = true; l.mesh.visible = false; }
    }
    c.mist.emit(cutV.set((Math.random() - 0.5) * 1.5, CABIN.centre + (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 3 + 0.5), cutV2.set(6 + Math.random() * 4, 0, -2), { life: 0.5, size: 0.35, grow: 2, alpha: 0.4 });
  }
  c.mist.update(dt);
}

// Through her eyes: where she looks in the cabin, in the plane's space.
const eyeAt = new THREE.Vector3(), eyeLook = new THREE.Vector3(), lookA = new THREE.Vector3(), lookB = new THREE.Vector3();
function cabinCamera(t) {
  const T = CABIN_T, c = cutscene.cabin;
  // Teto's face, across from her.
  const teto = cutV.set(CABIN.seats.teto[0], CABIN.floor + 0.98, CABIN.seats.teto[1] - 0.1);
  const window = lookA.set(-5.0, -1.75, 1.7);
  const door = lookB.copy(c.doorCentre);
  eyeAt.copy(CABIN_EYE);
  // Breathing, and the plane's shudder.
  eyeAt.y += Math.sin(t * 1.4) * 0.006;
  let fov = 50;
  if (t < T.window) {
    eyeLook.copy(teto);
    // Her gaze drifts a little while Teto talks.
    eyeLook.x += Math.sin(t * 0.7) * 0.04;
    eyeLook.y += Math.sin(t * 0.5) * 0.02;
  } else if (t < T.turn) {
    eyeLook.lerpVectors(teto, window, smooth(span(t, T.window, T.window + 0.55)));
    if (t > T.blast) fov = 56;
  } else if (t < T.door) {
    eyeLook.lerpVectors(window, teto, smooth(span(t, T.turn, T.turn + 0.25)));
  } else if (t < T.burst) {
    eyeLook.lerpVectors(teto, door, smooth(span(t, T.door, T.door + 0.5)));
    fov = 64;
  } else {
    // Dragged across the aisle to the doorway, looking back at Teto, then out into the sky.
    const u = span(t, T.burst + 0.1, CUT.eject);
    eyeAt.lerp(cutV2.copy(c.doorCentre).add(cutV.set(0.9, -0.1, -0.3)), u * u);
    if (t < T.lookBack) eyeLook.copy(door);
    else if (t < T.lookOut) eyeLook.lerpVectors(door, cutV.set(CABIN.seats.teto[0], CABIN.floor + 0.8, CABIN.seats.teto[1]), smooth(span(t, T.lookBack, T.lookBack + 0.15)));
    else eyeLook.lerpVectors(cutV.set(CABIN.seats.teto[0], CABIN.floor + 0.8, CABIN.seats.teto[1]), cutV2.set(6, -4, -3), smooth(span(t, T.lookOut, T.lookOut + 0.2)));
    fov = 70;
  }
  // The blast and the burst shake everything.
  const shakeAmt = (t > T.blast ? Math.max(0, 0.05 * (1 - (t - T.blast) * 1.5)) : 0) + (t > T.alarm && t < T.burst ? 0.005 : 0) + (t > T.burst ? 0.03 : 0);
  if (shakeAmt) shake(eyeAt, shakeAmt);
  const plane = cutscene.plane;
  camera.position.copy(eyeAt).applyMatrix4(plane.matrixWorld);
  camera.lookAt(cutV.copy(eyeLook).applyMatrix4(plane.matrixWorld));
  // Her head rolls with the plane, and tumbles as she goes out.
  cutUp.set(0, 1, 0).applyQuaternion(plane.quaternion);
  if (t > T.lookOut) cutUp.applyAxisAngle(cutV.subVectors(camTarget.copy(eyeLook).applyMatrix4(plane.matrixWorld), camera.position).normalize(), (t - T.lookOut) * 6);
  camera.up.copy(cutUp);
  camera.lookAt(cutV.copy(eyeLook).applyMatrix4(plane.matrixWorld));
  setFov(fov);
}

function updateCutscene(dt) {
  cutscene.t += dt;
  const t = cutscene.t;
  const w = cutscene.w = storyTime(t);
  game.time += dt;
  const L = landingSpot();
  const dir = cutscene.dir, side = cutscene.side;
  const plane = cutscene.plane;
  const aboard = t < CUT.eject;

  // The plane: banking and shuddering; after the blast the near engine streams smoke.
  planePosition(w, planeAt);
  plane.position.copy(planeAt);
  const lurch = t > CABIN_T.blast && t < CABIN_T.blast + 1.2 ? Math.sin((t - CABIN_T.blast) * 30) * 0.07 * (CABIN_T.blast + 1.2 - t) : 0;
  const bank = t > CABIN_T.blast ? 0.15 + Math.min(0.2, (t - CABIN_T.blast) * 0.05) : 0.06;
  plane.rotation.set(w > CABIN_T.blast ? 0.03 + (w - CABIN_T.blast) * 0.012 : 0, Math.atan2(dir.x, dir.z), bank + Math.sin(t * 1.3) * 0.04 + lurch, 'YXZ');
  plane.updateMatrixWorld();
  if (t > CABIN_T.blast) {
    cutscene.emitT -= dt;
    while (cutscene.emitT <= 0) {
      cutscene.emitT += 0.03;
      const engine = PLANE.engine.clone().applyMatrix4(plane.matrixWorld);
      cutscene.trail.emit(engine, new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), { life: 3.5, size: 2.2, grow: 4, alpha: 0.95 });
      if (Math.random() < 0.5) cutscene.debris.emit(engine, new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3), { life: 0.4, size: 0.9, grow: -0.6, alpha: 0.9 });
      // Flames licking up through the wing, which is what shows from the cabin window.
      if (aboard) {
        const wing = PLANE.wingFire.clone().applyMatrix4(plane.matrixWorld);
        cutscene.debris.emit(wing, cutV.set((Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.5), { life: 0.45, size: 1.2, grow: -0.3, alpha: 1 });
        if (Math.random() < 0.4) cutscene.trail.emit(wing, cutV.set((Math.random() - 0.5), 2 + Math.random(), (Math.random() - 0.5)), { life: 1.8, size: 1.1, grow: 3, alpha: 0.9 });
      }
    }
  }
  cutscene.trail.update(dt);
  cutscene.debris.update(dt);
  cutscene.dust.update(dt);
  cutscene.blast.update(dt);

  // Her: in her seat (unseen, behind the camera), then out of the door, falling, and down.
  if (aboard) {
    avatar.setVisible(false);
    poseCabinTeto(t, dt);
    updateCabin(t, dt);
  } else {
    once('outside', CUT.eject, () => {
      exitAt.copy(cutscene.cabin.doorCentre).add(cutV.set(0.8, 0, 0)).applyMatrix4(plane.matrixWorld);
      cutscene.cabin.group.visible = false;
      cutscene.teto.setVisible(false);
      setPlaneShell(true);
    });
    avatar.setVisible(true);
    if (t < CUT.land) {
      fallPosition(t, herAt);
      player.pos.copy(herAt);
      poseFalling(dt, t, herAt, t > CUT.canopy && t < CUT.through ? 0.9 : 0.4);
    } else {
      player.pos.copy(L);
      poseLying(dt, L);
    }
  }

  // Sound and light cues.
  once('fadeIn', 0.25, () => { $('flash').className = ''; });
  once('cap1', 0.6, () => caption('Somewhere over the northern range', 'place'));
  once('cap1off', 3.0, () => caption(''));
  once('vlog', CABIN_T.vlog + 0.25, () => tetoLine('Say hi to my followers!'));
  once('vlogOff', CABIN_T.back, () => caption(''));
  once('blast', CABIN_T.blast, () => {
    Sfx.boom(0.9);
    impact('white', 110);
    const engine = PLANE.engine.clone().applyMatrix4(plane.matrixWorld);
    const wing = PLANE.wingFire.clone().applyMatrix4(plane.matrixWorld);
    for (let i = 0; i < 60; i++) cutscene.blast.emit(i % 3 ? wing : engine, new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.1) * 8, (Math.random() - 0.5) * 10), { life: 0.8 + Math.random() * 0.6, size: 2.4, grow: 2.2, alpha: 1 });
    cutscene.engine.set(0.25, 0.8);
  });
  once('masks', CABIN_T.alarm, () => { for (const m of cutscene.cabin.masks) m.holder.visible = true; });
  once('yell', CABIN_T.yell, () => tetoLine('WHAT WAS THAT?!'));
  once('yell2', CABIN_T.yell2, () => tetoLine('Is it supposed to DO that?!'));
  once('yellOff', CABIN_T.door, () => caption(''));
  // The alarm, beeping until the door goes.
  if (t > CABIN_T.alarm && t < CABIN_T.burst) {
    const beat = Math.floor((t - CABIN_T.alarm) / 0.5);
    once(`beep${beat}`, CABIN_T.alarm + beat * 0.5, () => Sfx.glide([[0, 1180], [0.16, 1180]], 0.035, 'square'));
  }
  once('creak', CABIN_T.door, () => { Sfx.burst(1, 500, 2, 0.12, 'bandpass'); Sfx.glide([[0, 120], [0.9, 70]], 0.05, 'sawtooth'); });
  once('burst', CABIN_T.burst, () => {
    impact('invert', 90);
    Sfx.boom(0.7);
    Sfx.burst(1.2, 1600, 0.7, 0.4, 'bandpass');
    cutscene.wind.set(1, 0.15);
    cutscene.engine.set(0.6, 0.2);
  });
  once('mikuu', CABIN_T.lookBack + 0.05, () => tetoLine('MIKUUU!'));
  once('door', CUT.eject, () => { impact('white', 120); caption(''); cutscene.engine.set(0.25, 1.5); cutscene.wind.set(0.6, 1.5); });
  once('trees', CUT.canopy - 0.4, () => placeBoughs());
  for (const [key, at] of [['snap1', CUT.canopy + 0.25], ['snap2', CUT.canopy + 0.6], ['snap3', CUT.canopy + 1.0], ['snap4', CUT.canopy + 1.35]]) {
    once(key, at, () => {
      Sfx.branchSnap();
      impact(key === 'snap2' || key === 'snap4' ? 'white' : 'invert', 50);
      burst(herAt, 0x2d4a2a, 22, 5);
      burst(herAt, 0xf2f5ff, 30, 5);
    });
  }
  once('slam', CUT.land, () => { Sfx.snowSlam(); impact('white', 160); cutscene.wind.set(0, 0.2); cutscene.engine.set(0, 0.3); });
  once('ring', CUT.black, () => {
    Sfx.ring();
    plane.visible = false;
    cutscene.trail.clear();
    for (const b of cutscene.boughs) b.visible = false;
  });
  once('boom', CUT.boom, () => { Sfx.boom(0.45); setWreckBurning(); });

  // Shots, cut by time.
  let speed = 0;
  camera.up.set(0, 1, 0);
  const tree = cutscene.tree;
  if (aboard) {
    cabinCamera(t);
    if (t > CABIN_T.burst) speed = 0.5;
  } else if (t < CUT.slowEnd) {
    // Thrown from the door, in slow, heavy beats.
    camAt.copy(herAt).addScaledVector(side, 9).addScaledVector(dir, -13).add(cutV.set(0, 1, 0));
    camTarget.copy(herAt).lerp(planeAt, 0.22);
    setFov(48);
    speed = 0.4;
  } else if (t < 12.6) {
    // From above, looking down past her at the forest far below.
    camAt.copy(herAt).add(cutV.set(0, 5, 0)).addScaledVector(dir, -1.5);
    camTarget.copy(herAt).add(cutV.set(0, -20, 0));
    setFov(62);
    speed = 1;
  } else if (t < CUT.canopy) {
    // Close on her face, from in front of her as she falls belly-down, hair streaming up
    // behind her against the sky.
    const yaw = player.bodyYaw + t * 0.6;
    const forward = cutV.set(Math.sin(yaw), 0, Math.cos(yaw));
    const headDir = cutV2.copy(forward).multiplyScalar(0.89).add(cutUp.set(0, 0.45, 0));
    const faceDir = forward.multiplyScalar(0.45).add(cutUp.set(0, -0.89, 0));
    const headAt = camTarget.copy(herAt).addScaledVector(headDir, 0.42);
    camAt.copy(headAt).addScaledVector(faceDir, 1.1).addScaledVector(headDir, 0.35);
    camera.up.set(Math.sin(-0.2), Math.cos(-0.2), 0);
    setFov(38);
    speed = 0.9;
    once('fog', 12.6, () => { scene.fog.density = FOG_DENSITY * 0.5; });
  } else if (t < CUT.canopy + 0.75) {
    // Her view, straight down into the crown of the tree as it rushes up.
    camAt.copy(herAt).add(cutV.set(0, 0.6, 0)).addScaledVector(tree.toL, -0.3);
    camTarget.copy(canopyBottom).addScaledVector(tree.toL, 0.5);
    setFov(78);
    speed = 1;
    shake(camAt, 0.06);
  } else if (t < CUT.through) {
    // From beside the trunk, as she smashes down through the boughs.
    camAt.set(tree.x, tree.y + tree.height * 0.42, tree.z).addScaledVector(cutV.set(tree.toL.z, 0, -tree.toL.x), 3.6).addScaledVector(tree.toL, 2.4);
    camTarget.copy(herAt);
    setFov(58);
    speed = 0.6;
    once('fogD', CUT.canopy + 0.75, () => { scene.fog.density = FOG_DENSITY; });
    shake(camAt, 0.12);
  } else if (t < CUT.land) {
    // From the snow at the clearing's edge, looking up as she drops out of the tree.
    camAt.copy(L).addScaledVector(side, -6).addScaledVector(dir, -4).add(cutV.set(0, 1.2, 0));
    camTarget.copy(herAt);
    setFov(64);
    speed = 0.6;
  } else if (t < CUT.black) {
    // Ground level as she hits the snow.
    camAt.copy(L).addScaledVector(side, 4.5).addScaledVector(dir, 1.5).add(cutV.set(0, 0.5, 0));
    camTarget.copy(L).add(cutV.set(0, 0.6, 0));
    setFov(50);
    once('plume', CUT.land, () => {
      for (let i = 0; i < 8; i++) burst(L.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.3, (Math.random() - 0.5) * 2)), 0xf2f5ff, 30, 7);
      // A cloud of powder that hangs in the air after the impact.
      for (let i = 0; i < 30; i++) cutscene.dust.emit(L.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.4, (Math.random() - 0.5) * 2)), new THREE.Vector3((Math.random() - 0.5) * 5, 1 + Math.random() * 3, (Math.random() - 0.5) * 5), { life: 1.8 + Math.random(), size: 0.9, grow: 2.5, alpha: 0.85 });
    });
    if (t > CUT.land) shake(camAt, 0.5);
  } else if (t < CUT.wake) {
    // Black, ringing.
    once('dark', CUT.black, () => { $('flash').className = 'black'; caption(''); });
  } else if (t < CUT.boom) {
    // Waking, her cheek in the snow, framed on her face.
    once('light', CUT.wake, () => { $('flash').className = ''; });
    const head = avatar.head.getWorldPosition(cutV).add(cutV2.set(0, 0.03, 0));
    const face = avatar.head.getWorldDirection(cutV2);
    camAt.copy(head).addScaledVector(face, 0.75).add(cutUp.set(0, 0.12, 0));
    camTarget.copy(head);
    setFov(42);
  } else {
    // A far-off boom, and smoke rising where the plane came down.
    camAt.copy(L).addScaledVector(dir, -3.2).add(cutV.set(0, 1.6, 0)).addScaledVector(side, -0.8);
    camTarget.set(wreck.x, groundHeight(wreck.x, wreck.z) + 150, wreck.z);
    setFov(46);
    once('cap2', CUT.boom + 0.6, () => caption('The plane… it came down out there.', 'line'));
    if (t > CUT.boom + 0.3 && t < CUT.boom + 1) shake(camAt, 0.08);
  }
  if (!aboard) {
    camera.position.copy(camAt);
    camera.position.y = Math.max(camera.position.y, groundHeight(camAt.x, camAt.z) + 0.25);
    camera.lookAt(camTarget);
  }
  drawSpeedLines(speed, t);

  world.stream(aboard ? cutV.set(L.x, L.y, L.z) : t < CUT.land ? herAt : L, 2, 230);
  updateWreck(dt);
  if (t >= CUT.end) finishCutscene();
}

function setFov(fov) {
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

function shake(at, amount) {
  at.x += (Math.random() - 0.5) * amount;
  at.y += (Math.random() - 0.5) * amount;
  at.z += (Math.random() - 0.5) * amount;
}
