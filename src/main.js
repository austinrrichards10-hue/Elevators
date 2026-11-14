// Elevators: a start screen, then first person, riding a glass elevator slowly down the outside
// of a tower over a city at night. Miku is in the car too, at the glass, looking out; walk up to
// her and press E to talk.
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('view');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050f);
  scene.fog = new THREE.FogExp2(0x24183a, 0.00078);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.04, 8000);
  camera.rotation.order = 'YXZ';

  const city = City.build(scene);
  const cab = Elevator.build();
  scene.add(cab.group);
  cab.group.add(camera);

  // The cab hangs on two cables from the top of the tower.
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1c1f26, metalness: 0.8, roughness: 0.4 });
  const cableGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 4);
  cableGeo.translate(0, 0.5, 0);
  const cables = [-0.12, 0.12].map((x) => { const c = new THREE.Mesh(cableGeo, cableMat); c.position.x = x; scene.add(c); return c; });

  const CAB_Z = City.TOWER_HALF + 0.42 + cab.R;
  const building = Building.build(scene, CAB_Z);
  const STOPS = Building.STOPS;
  const START_Y = STOPS[0], END_Y = STOPS[STOPS.length - 1];
  const MAX_SPEED = 1.6, ACCEL = 0.25;
  const STOP_WAIT = 20;      // seconds the car hangs still at each stop on the way down
  // The car's own lights, dimmed while it's inside the concrete bands.
  const cabLights = cab.group.children.filter((o) => o.isLight).map((l) => ({ l, base: l.intensity }));
  const ringMat = cab.group.children.map((o) => o.material).find((m) => m && m.isMeshBasicMaterial && m.color.getHex() === 0xfff1d6);
  const RING_LIT = new THREE.Color(0xfff1d6), RING_DIM = new THREE.Color(0x5a3c22);
  const WALK = 1.35, ROOM = cab.R - 0.3, EYE_H = 1.66, BODY_R = 0.25;

  const state = {
    mode: 'title',          // title -> intro -> play (<-> paused)
    cabY: START_Y,
    speed: 0,
    descending: false,
    arrived: false,
    time: 0,
    introT: 0,
    departAt: 0,
    stop: 1,                // index in STOPS of where the car is heading next
  };
  const player = { x: -0.45, z: -0.75, yaw: Math.PI + 0.25, pitch: -0.05, bob: 0, step: 0 };
  const keys = {};

  // ---------- Miku: at the glass, looking out over the city. ----------
  const MIKU_SPOT = { x: 0.3, z: 1.12, yaw: Math.PI + 0.3, r: 0.3 };
  const miku = { obj: null, yaw: MIKU_SPOT.yaw, talking: false };
  // Her yaw such that she faces the point (x, z). She faces -z at yaw 0.
  const yawToward = (x, z) => Math.atan2(-(x - MIKU_SPOT.x), -(z - MIKU_SPOT.z));
  const angleDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  const startBtn = $('start');
  startBtn.disabled = true;
  startBtn.textContent = 'Loading…';
  Miku.load((m) => {
    if (m) {
      miku.obj = m.group;
      m.group.position.set(MIKU_SPOT.x, 0, MIKU_SPOT.z);
      cab.group.add(m.group);
    }
    startBtn.disabled = false;
    startBtn.textContent = 'Begin';
  });

  // ---------- Title-screen camera: drifting outside the glass, looking in at her. ----------
  const titleCam = (t) => {
    const a = 0.55 + Math.sin(t * 0.09) * 0.22;
    const r = 2.9;
    return {
      pos: new THREE.Vector3(MIKU_SPOT.x + Math.sin(a) * r, 1.5 + Math.sin(t * 0.17) * 0.1, MIKU_SPOT.z + Math.cos(a) * r),
      target: new THREE.Vector3(MIKU_SPOT.x - 0.35, 1.05, MIKU_SPOT.z - 0.2),
    };
  };
  const tmpM = new THREE.Matrix4();
  const lookQuat = (pos, target) => new THREE.Quaternion().setFromRotationMatrix(tmpM.lookAt(pos, target, new THREE.Vector3(0, 1, 0)));
  const fpQuat = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  const eyePos = () => new THREE.Vector3(player.x, EYE_H + player.bob, player.z);

  // ---------- UI ----------
  const hint = $('hint'), caption = $('caption'), prompt = $('prompt');
  let hintTimer = 0, captionTimer = 0;
  function showHint(text, seconds) { hint.textContent = text; hint.classList.add('show'); hintTimer = seconds; }
  function showCaption(text, seconds) { caption.textContent = text; caption.classList.add('show'); captionTimer = seconds; }

  function updateMuteLabels() {
    document.querySelectorAll('.mute-toggle').forEach((b) => { b.textContent = Sound.muted ? 'Sound: off' : 'Sound: on'; });
  }
  document.querySelectorAll('.mute-toggle').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    Sound.toggleMute();
    updateMuteLabels();
  }));

  const lock = () => {
    if (!canvas.requestPointerLock) return;
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});   // refused (e.g. clicked too soon after Esc): the pause screen stays up
  };

  startBtn.addEventListener('click', () => {
    if (state.mode !== 'title' || startBtn.disabled) return;
    Sound.start();
    $('title').classList.add('leaving');
    setTimeout(() => $('title').classList.add('hidden'), 1300);
    state.mode = 'intro';
    state.introT = 0;
    lock();
  });

  $('pause').addEventListener('click', () => { lock(); resume(); });
  function pause() {
    if (state.mode !== 'play') return;
    state.mode = 'paused';
    $('pause').classList.remove('hidden');
  }
  function resume() {
    if (state.mode !== 'paused') return;
    state.mode = 'play';
    $('pause').classList.add('hidden');
  }
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) resume();
    else pause();
  });
  canvas.addEventListener('click', () => { if (state.mode === 'play' && document.pointerLockElement !== canvas) lock(); });

  document.addEventListener('mousemove', (e) => {
    if (state.mode !== 'play' || document.pointerLockElement !== canvas) return;
    player.yaw -= e.movementX * 0.0022;
    player.pitch = Math.max(-1.45, Math.min(1.35, player.pitch - e.movementY * 0.0022));
  });
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyM') { Sound.toggleMute(); updateMuteLabels(); return; }
    if (state.mode !== 'play') return;
    if (Talk.active) { if (Talk.key(e.code)) e.preventDefault(); return; }
    if (e.code === 'KeyE' && canTalk()) startTalk();
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Talking ----------
  function canTalk() {
    if (!miku.obj || Talk.active) return false;
    const dx = MIKU_SPOT.x - player.x, dz = MIKU_SPOT.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1.5) return false;
    // Roughly looking at her.
    const look = Math.atan2(-dx, -dz);
    return Math.abs(angleDiff(look, player.yaw)) < 0.7;
  }
  function startTalk() {
    miku.talking = true;
    prompt.classList.add('hidden');
    const left = state.cabY - END_Y;
    const opener = state.arrived ? 'ground' : left > 180 ? 'high' : left > 50 ? 'mid' : 'low';
    Talk.start(opener, () => { miku.talking = false; });
  }

  // ---------- Simulation ----------
  function walk(dt) {
    let f = 0, s = 0;
    if (!Talk.active) {
      if (keys.KeyW || keys.ArrowUp) f += 1;
      if (keys.KeyS || keys.ArrowDown) f -= 1;
      if (keys.KeyD || keys.ArrowRight) s += 1;
      if (keys.KeyA || keys.ArrowLeft) s -= 1;
    }
    const moving = f !== 0 || s !== 0;
    if (moving) {
      const len = Math.hypot(f, s);
      const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
      player.x += ((-sy * f) + (cy * s)) / len * WALK * dt;
      player.z += ((-cy * f) + (-sy * s)) / len * WALK * dt;
      // Stay inside the car...
      const d = Math.hypot(player.x, player.z);
      const room = ROOM - BODY_R;
      if (d > room) { player.x *= room / d; player.z *= room / d; }
      // ...and don't walk through her.
      if (miku.obj) {
        const mx = player.x - MIKU_SPOT.x, mz = player.z - MIKU_SPOT.z;
        const md = Math.hypot(mx, mz), min = MIKU_SPOT.r + BODY_R;
        if (md < min && md > 1e-4) { player.x = MIKU_SPOT.x + mx / md * min; player.z = MIKU_SPOT.z + mz / md * min; }
      }
      player.step += dt * 7.5;
    }
    const target = moving ? Math.sin(player.step) * 0.02 : 0;
    player.bob += (target - player.bob) * Math.min(1, dt * 10);
  }

  function updateMiku(dt, t) {
    if (!miku.obj) return;
    // She turns to whoever's talking to her, then back to the view.
    const want = miku.talking ? yawToward(player.x, player.z) : MIKU_SPOT.yaw + Math.sin(t * 0.13) * 0.06;
    miku.yaw += angleDiff(want, miku.yaw) * Math.min(1, dt * (miku.talking ? 3 : 1.2));
    miku.obj.rotation.y = miku.yaw;
  }

  // Down to the next stop, hang there a while over the city, then on; the last is the ground.
  function descend(dt) {
    if (!state.descending) return;
    const target = STOPS[state.stop];
    const left = state.cabY - target;
    const stopSpeed = Math.sqrt(Math.max(0, 2 * ACCEL * left));
    state.speed = Math.min(MAX_SPEED, state.speed + ACCEL * dt, stopSpeed);
    state.cabY -= state.speed * dt;
    if (left < 0.01 || (state.cabY <= target + 0.002 && state.speed < 0.02)) {
      state.cabY = target;
      state.speed = 0;
      state.descending = false;
      Sound.chime();
      if (state.stop === STOPS.length - 1) {
        state.arrived = true;
        cab.setFloor('G', false);
        showCaption('Ground floor', 5);
      } else {
        showCaption('Floor ' + Building.floorOf(target), 5);
        state.departAt = state.time + STOP_WAIT;
        state.stop++;
      }
    }
  }

  let lastFloor = null, lastMoving = null;
  function updateCab(t) {
    const motion = state.speed / MAX_SPEED;
    // The faintest sway on the cables while it moves.
    cab.group.position.set(Math.sin(t * 0.7) * 0.012 * motion, state.cabY, CAB_Z + Math.sin(t * 0.53) * 0.008 * motion);
    cab.group.rotation.set(Math.sin(t * 0.41) * 0.0012 * motion, 0, Math.sin(t * 0.5) * 0.0018 * motion);
    const cableBase = state.cabY + cab.H + 0.95;
    for (const c of cables) {
      c.position.set(c.position.x, cableBase, CAB_Z);
      c.scale.y = Math.max(0.01, City.TOWER_TOP + 8 - cableBase);
    }
    if (!state.arrived) {
      const label = String(Math.max(1, Math.round(state.cabY / City.FLOOR_H)));
      if (label !== lastFloor || state.descending !== lastMoving) {
        cab.setFloor(label, state.descending);
        lastFloor = label;
        lastMoving = state.descending;
      }
    }
  }

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let introFrom = null;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const paused = state.mode === 'paused';
    if (!paused) state.time += dt;
    const t = state.time;

    if (state.mode === 'title') {
      const c = titleCam(t);
      camera.position.copy(c.pos);
      camera.quaternion.copy(lookQuat(c.pos, c.target));
    } else if (state.mode === 'intro') {
      if (!introFrom) introFrom = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
      state.introT += dt / 2.6;
      const k = Math.min(1, state.introT);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(introFrom.pos, eyePos(), e);
      camera.quaternion.slerpQuaternions(introFrom.quat, fpQuat(), e);
      if (k >= 1) {
        state.mode = document.pointerLockElement === canvas ? 'play' : 'paused';
        if (state.mode === 'paused') $('pause').classList.remove('hidden');
        Sound.chime();
        showHint('Mouse to look around · WASD to walk · E to talk', 8);
        state.departAt = state.time + 1.6;
      }
    } else if (state.mode === 'play') {
      walk(dt);
      camera.position.copy(eyePos());
      camera.rotation.set(player.pitch, player.yaw, 0);
      prompt.classList.toggle('hidden', !canTalk());
      // Walking away ends the conversation.
      if (Talk.active && Math.hypot(MIKU_SPOT.x - player.x, MIKU_SPOT.z - player.z) > 2.2) Talk.close();
    }
    if (state.mode !== 'play') prompt.classList.add('hidden');

    if (!paused) {
      if (state.departAt && t >= state.departAt) {
        state.departAt = 0;
        state.descending = true;
        showCaption('Going down', 3.5);
      }
      descend(dt);
      city.update(dt, t);
      updateMiku(dt, t);
      Talk.update(dt);
    }
    updateCab(t);
    building.update(t);
    const open = building.openness(state.cabY);
    // Inside a band the car's ceiling light sinks to a dim amber glow and the city light is gone.
    for (const { l, base } of cabLights) l.intensity = base * (0.3 + 0.7 * open);
    if (ringMat) ringMat.color.lerpColors(RING_DIM, RING_LIT, open);
    Sound.update(state.speed / MAX_SPEED, 1 - (state.cabY - END_Y) / (START_Y - END_Y), t, open);

    if (hintTimer > 0 && (hintTimer -= dt) <= 0) hint.classList.remove('show');
    if (captionTimer > 0 && (captionTimer -= dt) <= 0) caption.classList.remove('show');

    renderer.render(scene, camera);
  }

  Talk.init();

  // For debugging from the console.
  window.ELEVATORS = { state, player, miku, camera, scene, Talk, resume: () => { state.mode = 'paused'; resume(); }, startTalk };

  updateMuteLabels();
  updateCab(0);
  frame();
  requestAnimationFrame(() => $('fade').classList.add('clear'));
})();
