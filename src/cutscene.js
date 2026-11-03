// The opening: a stricken plane over the forest, a fall through the sky and the trees,
// and the crash site the plane leaves somewhere out on the map. Staged in the game world
// with hard cuts, impact frames, speed lines and letterboxing for an anime feel.

/* ---------- Models ---------- */
// "RAF Voyager Aeroplane (Private Plane)" by Foggy_123 (CC BY 4.0); see the README.
const PLANE = {
  length: 26, // nose to tail, in metres
  fileLength: 122.7, // the same in the file's own units
  engine: new THREE.Vector3(-5.3, -3, 0.6), // the near engine's exhaust, in metres from the centre
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
  for (let i = 0; i < count; i++) puffs.push({ pos: new THREE.Vector3(), scale: 0, life: 0, max: 1, vel: new THREE.Vector3(), size: 1, grow: 1, alpha: 1 });
  let next = 0;
  const changed = () => { place.needsUpdate = true; shade.needsUpdate = true; };
  return {
    group,
    emit(at, vel, { life = 2, size = 1, grow = 2, alpha = 0.6 } = {}) {
      const i = next;
      const p = puffs[i];
      next = (next + 1) % count;
      p.pos.copy(at);
      p.vel.copy(vel);
      p.life = p.max = life;
      p.size = p.scale = size;
      p.grow = grow;
      p.alpha = alpha;
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
// broken plane, quiet until the cutscene (or a skip) sets it burning.
function placeWreck() {
  if (wreck.group) scene.remove(wreck.group);
  for (const geo of wreck.ownGeometry || []) geo.dispose();
  if (wreck.scorchMaterial) wreck.scorchMaterial.dispose();
  if (wreck.clearing) CLEARINGS.splice(CLEARINGS.indexOf(wreck.clearing), 1);
  for (const c of wreck.colliders) LANDMARK_COLLIDERS.splice(LANDMARK_COLLIDERS.indexOf(c), 1);
  let x = 0, z = 0;
  for (let tries = 0; tries < 50; tries++) {
    const a = Math.random() * Math.PI * 2, d = 260 + Math.random() * 340;
    x = LANDMARKS.start.x + Math.cos(a) * d;
    z = LANDMARKS.start.z + Math.sin(a) * d;
    if (Math.hypot(x, z) < WORLD_RADIUS - 90 && SITES.every((s) => Math.hypot(x - s.x, z - s.z) > s.clear + 45)
      && POINTS_OF_INTEREST.every((p) => Math.hypot(x - p.x, z - p.z) > 40) && SITE_SHARDS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > 30)) break;
  }
  wreck.x = x;
  wreck.z = z;
  wreck.clearing = [{ x, z }, 24];
  CLEARINGS.push(wreck.clearing);
  // The fuselage lies along `heading`; colliders run down its length, plus the broken tail.
  const heading = Math.random() * Math.PI * 2;
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
// Crimson Curls, thrown from the plane like the player, lying unconscious on her back in
// the snow a little way from the wreck.
const survivor = { avatar: null, x: 0, z: 0 };
const survivorTilt = new THREE.Quaternion(), survivorYaw = new THREE.Quaternion(), survivorPivot = new THREE.Vector3();

function placeSurvivor() {
  if (!survivor.avatar) survivor.avatar = createAvatar(scene, 'crimson');
  const a = survivor.avatar;
  // Off the nose of the plane, clear of the wings.
  const ahead = 18, across = 4;
  survivor.x = wreck.x + Math.sin(wreck.heading) * ahead + Math.cos(wreck.heading) * across;
  survivor.z = wreck.z + Math.cos(wreck.heading) * ahead - Math.sin(wreck.heading) * across;
  const y = groundHeight(survivor.x, survivor.z);
  survivorYaw.setFromAxisAngle(UP_AXIS, wreck.heading + 2.2);
  survivorTilt.setFromAxisAngle(SIDE_AXIS, -Math.PI / 2 + 0.06);
  a.root.quaternion.copy(survivorYaw).multiply(survivorTilt);
  survivorPivot.set(0, a.dims.hips, 0).applyQuaternion(a.root.quaternion);
  a.root.position.set(survivor.x, y + 0.13, survivor.z).sub(survivorPivot);
  // Arms flung out a little, one knee bent, her head lolling to one side.
  a.armL.upper.rotation.set(0, 0, 0.55);
  a.armR.upper.rotation.set(0.2, 0, -0.4);
  a.armL.fore.rotation.set(0, 0, 0.3);
  a.legL.thigh.rotation.set(-0.35, 0, 0.08);
  a.legL.shin.rotation.set(0.6, 0, 0);
  a.legR.thigh.rotation.set(0, 0, -0.05);
  a.head.rotation.set(0, 0.5, 0.15);
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
const CUT = {
  eject: 3.4, // when she's thrown out
  land: 9.4, // when she hits the snow
  slow: 0.35, // story-time speed through the ejection beat
  slowEnd: 5.0,
  black: 9.9,
  wake: 11.4,
  boom: 12.4,
  end: 15.2,
  altitude: 120,
  speed: 55,
  get landW() { return this.land - (this.slowEnd - this.eject) * (1 - this.slow); },
};

const cutscene = { active: false, t: 0, plane: null, trail: null, debris: null, dir: new THREE.Vector3(), side: new THREE.Vector3(), engine: null, wind: null, shot: '', frame: 0 };
const camTarget = new THREE.Vector3(), camAt = new THREE.Vector3(), herAt = new THREE.Vector3(), planeAt = new THREE.Vector3(), ground = new THREE.Vector3();

function landingSpot() {
  return ground.set(LANDMARKS.start.x, groundHeight(LANDMARKS.start.x, LANDMARKS.start.z), LANDMARKS.start.z);
}

function planePosition(t, out) {
  const L = landingSpot();
  const travel = (t - CUT.eject) * CUT.speed;
  // Losing height after the blast.
  const sink = t > CUT.eject ? (t - CUT.eject) ** 1.6 * 2.2 : 0;
  return out.copy(L).addScaledVector(cutscene.dir, travel).add(new THREE.Vector3(0, CUT.altitude - sink + Math.sin(t * 2.1) * 0.6, 0));
}

// Where she is at time t once thrown clear: out of the door, arcing forward, then
// dropping onto the landing spot, reaching the treetops just as the forest shot begins.
function fallPosition(t, out) {
  const L = landingSpot();
  const s = clamp((t - CUT.eject) / (CUT.landW - CUT.eject), 0, 1);
  planePosition(CUT.eject, planeAt);
  // She goes out of the side door, behind the wing.
  const start = planeAt.clone().addScaledVector(cutscene.side, 2).addScaledVector(cutscene.dir, -6).add(new THREE.Vector3(0, 0.5, 0));
  out.lerpVectors(start, L, s);
  out.y = lerp(start.y, L.y, 1 - (1 - s) ** 1.6);
  out.addScaledVector(cutscene.dir, Math.sin(s * Math.PI) * 14);
  return out;
}

function startCutscene() {
  const L = landingSpot();
  cutscene.dir.set(wreck.x - L.x, 0, wreck.z - L.z).normalize();
  cutscene.side.set(cutscene.dir.z, 0, -cutscene.dir.x);
  if (!cutscene.plane) {
    cutscene.plane = buildPlane();
    cutscene.trail = buildPuffs(160, 0x2a2828);
    cutscene.debris = buildPuffs(60, 0xff9a50);
    cutscene.dust = buildPuffs(40, 0xf2f5ff);
    scene.add(cutscene.plane, cutscene.trail.group, cutscene.debris.group, cutscene.dust.group);
  }
  cutscene.plane.visible = true;
  // The propellers spin too fast to see in flight.
  cutscene.plane.userData.parts.Propellers.visible = false;
  cutscene.trail.clear();
  cutscene.debris.clear();
  if (cutscene.dust) cutscene.dust.clear();
  cutscene.active = true;
  cutscene.t = 0;
  cutscene.w = 0;
  cutscene.shot = '';
  cutscene.emitT = 0;
  cutscene.fired = {};
  player.bodyYaw = player.yaw = Math.atan2(cutscene.dir.x, cutscene.dir.z);
  // Load the ground under the whole fall, and thin the fog for the views from the air.
  world.stream(L, Infinity, 230);
  scene.fog.density = 0.0035;
  document.body.classList.add('cinematic');
  canvas.style.filter = 'saturate(1.3) contrast(1.08)';
  cutscene.engine = Sfx.loop({ noise: 0.25, filter: 900, hum: 0.35, humFreq: 68 });
  cutscene.engine.set(0.5, 1);
  cutscene.wind = Sfx.loop({ noise: 1, filter: 1400 });
}

function finishCutscene() {
  if (!cutscene.active) return;
  cutscene.active = false;
  cutscene.plane.visible = false;
  cutscene.trail.clear();
  cutscene.debris.clear();
  if (cutscene.dust) cutscene.dust.clear();
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

function updateCutscene(dt) {
  cutscene.t += dt;
  // Story time runs slow through the ejection beat; positions follow it, cuts follow t.
  cutscene.w += dt * (cutscene.t > CUT.eject && cutscene.t < CUT.slowEnd ? CUT.slow : 1);
  const w = cutscene.w;
  const t = cutscene.t;
  game.time += dt;
  const L = landingSpot();
  const dir = cutscene.dir, side = cutscene.side;
  const plane = cutscene.plane;

  // The plane: banking, shuddering, the near engine streaming smoke.
  planePosition(w, planeAt);
  plane.position.copy(planeAt);
  const lurch = t > 2.6 && t < 3.6 ? Math.sin((t - 2.6) * 30) * 0.06 * (3.6 - t) : 0;
  plane.rotation.set(w > CUT.eject ? 0.08 + (w - CUT.eject) * 0.03 : 0, Math.atan2(dir.x, dir.z), 0.15 + Math.sin(t * 1.3) * 0.08 + lurch, 'YXZ');
  plane.updateMatrixWorld();
  cutscene.emitT -= dt;
  while (cutscene.emitT <= 0) {
    cutscene.emitT += 0.03;
    const engine = PLANE.engine.clone().applyMatrix4(plane.matrixWorld);
    cutscene.trail.emit(engine, new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), { life: 3.5, size: 2.2, grow: 4, alpha: 0.95 });
    if (Math.random() < 0.5) cutscene.debris.emit(engine, new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3), { life: 0.4, size: 0.9, grow: -0.6, alpha: 0.9 });
  }
  cutscene.trail.update(dt);
  cutscene.debris.update(dt);
  cutscene.dust.update(dt);

  // Her: aboard until the blast, then falling, then face-down in the snow.
  if (t < CUT.eject) {
    avatar.setVisible(false);
  } else if (t < CUT.land) {
    avatar.setVisible(true);
    fallPosition(w, herAt);
    player.pos.copy(herAt);
    poseFalling(dt, t, herAt, 0.4);
  } else {
    avatar.setVisible(true);
    player.pos.copy(L);
    poseLying(dt, L);
  }

  // Sound cues.
  once('blast', 2.6, () => { Sfx.boom(0.8); impact('white', 90); });
  once('door', CUT.eject, () => { impact('invert', 80); cutscene.engine.set(0.25, 1.5); });
  once('fall', CUT.eject + 0.2, () => cutscene.wind.set(0.6, 2.5));
  once('snap1', 8.4, () => { Sfx.branchSnap(); impact('invert', 60); });
  once('snap2', 8.75, () => { Sfx.branchSnap(); impact('white', 50); });
  once('slam', CUT.land, () => { Sfx.snowSlam(); impact('white', 160); cutscene.wind.set(0, 0.2); cutscene.engine.set(0, 0.3); });
  once('ring', CUT.black, () => { Sfx.ring(); plane.visible = false; cutscene.trail.clear(); });
  once('boom', CUT.boom, () => { Sfx.boom(0.45); setWreckBurning(); });

  // Shots, cut by time.
  let speed = 0;
  camera.up.set(0, 1, 0);
  if (t < CUT.eject) {
    // A: alongside the plane in trouble, with a canted frame.
    const push = t * 1.2;
    camAt.copy(planeAt).addScaledVector(dir, 20 - push).addScaledVector(side, -27).add(new THREE.Vector3(0, -5, 0));
    camTarget.copy(planeAt).addScaledVector(dir, 2);
    camera.up.set(Math.sin(0.12), Math.cos(0.12), 0);
    setFov(40);
    once('cap1', 0.4, () => caption('Somewhere over the northern range', 'place'));
    once('cap1off', 2.4, () => caption(''));
    if (t > 2.6) shake(camAt, 0.5 * (3.4 - t));
  } else if (t < 5.0) {
    // B: thrown from the door, in slow, heavy beats.
    camAt.copy(herAt).addScaledVector(side, 9).addScaledVector(dir, -13).add(new THREE.Vector3(0, 1, 0));
    camTarget.copy(herAt).lerp(planeAt, 0.22);
    setFov(48);
    speed = 0.4;
  } else if (t < 6.6) {
    // C1: from above, looking down past her at the forest far below.
    camAt.copy(herAt).add(new THREE.Vector3(0, 5, 0)).addScaledVector(dir, -1.5);
    camTarget.copy(herAt).add(new THREE.Vector3(0, -20, 0));
    setFov(62);
    speed = 1;
  } else if (t < 8.0) {
    // C2: close on her face, from in front of her as she falls belly-down, hair streaming
    // up behind her against the sky.
    const yaw = player.bodyYaw + t * 0.6;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const headDir = forward.clone().multiplyScalar(0.89).add(new THREE.Vector3(0, 0.45, 0));
    const faceDir = forward.clone().multiplyScalar(0.45).add(new THREE.Vector3(0, -0.89, 0));
    const headAt = herAt.clone().addScaledVector(headDir, 0.42);
    camAt.copy(headAt).addScaledVector(faceDir, 1.1).addScaledVector(headDir, 0.35);
    camTarget.copy(headAt);
    camera.up.set(Math.sin(-0.2), Math.cos(-0.2), 0);
    setFov(38);
    speed = 0.9;
    once('fog', 6.6, () => { scene.fog.density = FOG_DENSITY * 0.5; });
  } else if (t < 9.2) {
    // D: from the forest floor at the clearing's edge, looking up as she comes through.
    camAt.copy(L).addScaledVector(side, -6).addScaledVector(dir, -4).add(new THREE.Vector3(0, 1.2, 0));
    camTarget.copy(herAt);
    setFov(64);
    speed = 0.6;
    once('fogD', 8.0, () => { scene.fog.density = FOG_DENSITY; });
    once('needles', 8.4, () => { for (let i = 0; i < 4; i++) burst(herAt.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), 0x2d4a2a, 18, 5); burst(herAt, 0xf2f5ff, 30, 6); });
    once('needles2', 8.75, () => { burst(herAt, 0x2d4a2a, 24, 6); burst(herAt, 0xf2f5ff, 30, 5); });
    if (t > 8.4) shake(camAt, 0.25);
  } else if (t < CUT.black) {
    // E: ground level as she hits the snow.
    camAt.copy(L).addScaledVector(side, 4.5).addScaledVector(dir, 1.5).add(new THREE.Vector3(0, 0.5, 0));
    camTarget.copy(L).add(new THREE.Vector3(0, 0.6, 0));
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
    // F1: waking, her cheek in the snow, framed on her face.
    once('light', CUT.wake, () => { $('flash').className = ''; });
    const head = avatar.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.03, 0));
    const face = avatar.head.getWorldDirection(new THREE.Vector3());
    camAt.copy(head).addScaledVector(face, 0.75).add(new THREE.Vector3(0, 0.12, 0));
    camTarget.copy(head);
    setFov(42);
  } else {
    // F2: a far-off boom, and smoke rising where the plane came down.
    camAt.copy(L).addScaledVector(dir, -3.2).add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(side, -0.8);
    camTarget.set(wreck.x, groundHeight(wreck.x, wreck.z) + 150, wreck.z);
    setFov(46);
    once('cap2', CUT.boom + 0.6, () => caption('The plane… it came down out there.', 'line'));
    if (t > CUT.boom + 0.3 && t < CUT.boom + 1) shake(camAt, 0.08);
  }
  camera.position.copy(camAt);
  camera.position.y = Math.max(camera.position.y, groundHeight(camAt.x, camAt.z) + 0.25);
  camera.lookAt(camTarget);
  drawSpeedLines(speed, t);

  world.stream(t < CUT.land ? herAt : L, 2, 230);
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
