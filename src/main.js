// Elevators: the world and the camera. This file owns the renderer, the city, the glass car and
// its ride down the tower, first-person walking, and cinematic camera shots. The story
// (src/story.js) drives it through the Game object at the bottom.
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('view');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050f);
  scene.fog = new THREE.FogExp2(0x24183a, 0.00078);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.04, 8000);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const city = City.build(scene);
  const cab = Elevator.build();
  scene.add(cab.group);
  const places = Places.build(scene);

  // The cab hangs on two cables from the top of the tower.
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1c1f26, metalness: 0.8, roughness: 0.4 });
  const cableGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 4);
  cableGeo.translate(0, 0.5, 0);
  const cables = [-0.12, 0.12].map((x) => { const c = new THREE.Mesh(cableGeo, cableMat); c.position.x = x; scene.add(c); return c; });

  const CAB_Z = City.TOWER_HALF + 0.42 + cab.R;
  const building = Building.build(scene, CAB_Z);
  const landing = Building.buildLanding(scene);
  // The landing room and its doorway, in the car's own space (the car waits at the landing
  // until you're aboard, so the two line up).
  const LND = City.LANDING;
  const ROOM_Z0 = City.TOWER_HALF - LND.depth - CAB_Z, ROOM_Z1 = City.TOWER_HALF - 0.31 - CAB_Z;
  const STOPS = Building.STOPS;
  const START_Y = STOPS[0], END_Y = STOPS[STOPS.length - 1];
  const MAX_SPEED = 3.4, ACCEL = 0.6;   // about a minute and a half from floor 70 to the ground
  const STOP_WAIT = 6;
  const WALK = 1.35, ROOM = cab.R - 0.3, EYE_H = 1.66, BODY_R = 0.25;
  const cabLights = cab.group.children.filter((o) => o.isLight).map((l) => ({ l, base: l.intensity }));
  const ringMat = cab.group.children.map((o) => o.material).find((m) => m && m.isMeshBasicMaterial && m.color.getHex() === 0xfff1d6);
  const RING_LIT = new THREE.Color(0xfff1d6), RING_DIM = new THREE.Color(0x5a3c22);

  const state = {
    mode: 'title',          // title | intro | play | paused | scene
    cabY: START_Y, speed: 0, descending: false, arrived: false,
    time: 0, introT: 0, departAt: 0, stop: 1,
    doors: 1, doorTarget: 1, boarded: true, closeAt: 0,
    ride: { playable: false, stops: true, speed: 1 },
    hold: false,            // the story is holding the car at a stop
  };
  // space: 'cab' (walking in the car and the floor-70 landing, in the car's own coordinates) or
  // 'home' (walking round your apartment, in world coordinates).
  const player = { space: 'cab', x: 0.15, z: ROOM_Z0 + 2.6, yaw: Math.PI, pitch: -0.03, bob: 0, step: 0, vx: 0, vz: 0, y: 0 };
  const keys = {};
  const hooks = { stop: null, arrive: null, board: null, talk: null, canTalk: null, phone: null };
  // Things you can use where you're walking: { x, z, r, label, use() } (world coordinates at home).
  let usables = [];
  let usableNow = null;

  // ---------- Miku ----------
  const MIKU_SPOT = { x: 0.3, z: 1.12, yaw: Math.PI + 0.3, r: 0.3 };
  const miku = { obj: null, yaw: MIKU_SPOT.yaw, face: 'view', viewYaw: MIKU_SPOT.yaw, inCab: true, x: MIKU_SPOT.x, z: MIKU_SPOT.z };
  const angleDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  let readyCb = null, isReady = false;
  Miku.load((m) => {
    if (m) { miku.obj = m.group; miku.anim = m.update; placeMiku('cab'); }
    isReady = true;
    if (readyCb) readyCb();
  });

  function placeMiku(spec) {
    if (!miku.obj) return;
    if (spec === 'cab') {
      cab.group.add(miku.obj);
      miku.inCab = true;
      miku.x = MIKU_SPOT.x; miku.z = MIKU_SPOT.z;
      miku.obj.position.set(MIKU_SPOT.x, 0, MIKU_SPOT.z);
      miku.viewYaw = MIKU_SPOT.yaw;
    } else {
      scene.add(miku.obj);
      miku.inCab = false;
      miku.x = spec.x; miku.z = spec.z;
      miku.obj.position.set(spec.x, spec.y, spec.z);
      miku.viewYaw = spec.yaw;
    }
    miku.obj.visible = true;
    miku.yaw = miku.viewYaw;
    anim.w = 0;
    miku.obj.rotation.y = miku.yaw;
  }

  // ---------- UI ----------
  const hint = $('hint'), caption = $('caption'), prompt = $('prompt');
  let hintTimer = 0, captionTimer = 0;
  function showHint(text, seconds) { hint.textContent = text; hint.classList.add('show'); hintTimer = seconds; }
  function showCaption(text, seconds) { caption.textContent = text; caption.classList.add('show'); captionTimer = seconds; }

  const lock = () => {
    if (!canvas.requestPointerLock) return;
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  };
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
    else if (state.mode === 'play') pause();
  });
  canvas.addEventListener('click', () => { if (state.mode === 'play' && document.pointerLockElement !== canvas) lock(); });

  document.addEventListener('mousemove', (e) => {
    if (state.mode !== 'play' || document.pointerLockElement !== canvas) return;
    player.yaw -= e.movementX * 0.0022;
    player.pitch = Math.max(-1.45, Math.min(1.35, player.pitch - e.movementY * 0.0022));
  });
  document.addEventListener('keydown', (e) => {
    if (Talk.asking) return;
    keys[e.code] = true;
    if (e.code === 'KeyM') { Sound.toggleMute(); document.dispatchEvent(new Event('mutechange')); return; }
    if (state.mode === 'ui') return;
    if (Talk.active) { if (Talk.key(e.code)) e.preventDefault(); return; }
    if (state.mode !== 'play') return;
    if (e.code === 'KeyE') {
      if (canTalk()) { if (hooks.talk) hooks.talk(); }
      else if (usableNow) usableNow.use();
    }
    if ((e.code === 'KeyQ' || e.code === 'Tab') && hooks.phone) { e.preventDefault(); hooks.phone(); }
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

  // ---------- Walking ----------
  // Is Miku where you are, and where?
  const mikuHere = () => miku.obj && miku.obj.visible && (player.space === 'cab' ? miku.inCab : !miku.inCab);
  const looking = (x, z, range, cone) => {
    const dx = x - player.x, dz = z - player.z;
    if (Math.hypot(dx, dz) > range) return false;
    return Math.abs(angleDiff(Math.atan2(-dx, -dz), player.yaw)) < cone;
  };
  function canTalk() {
    if (!mikuHere() || Talk.active || !hooks.talk) return false;
    if (hooks.canTalk && !hooks.canTalk()) return false;
    return looking(miku.x, miku.z, 1.6, 0.7);
  }
  // The thing you're looking at and close enough to use, if any.
  function findUsable() {
    let best = null, bestD = 1e9;
    for (const u of usables) {
      if (u.when && !u.when()) continue;
      const d = Math.hypot(u.x - player.x, u.z - player.z);
      if (d < (u.r || 1.4) && d < bestD && looking(u.x, u.z, u.r || 1.4, 0.75)) { best = u; bestD = d; }
    }
    return best;
  }
  const inCar = (x, z) => Math.hypot(x, z) < ROOM - BODY_R;
  const inDoorway = (x, z) => Math.abs(x) < 0.32 && z > ROOM_Z1 - 0.5 && z < -0.9;
  const inLanding = (x, z) => Math.abs(x) < LND.halfW - BODY_R && z > ROOM_Z0 + BODY_R && z < ROOM_Z1 - BODY_R;
  const canStandCab = (x, z) => inCar(x, z) || (state.doors > 0.85 && (inDoorway(x, z) || inLanding(x, z)));
  const canStand = (x, z) => (player.space === 'home' ? places.home.canStand(x, z, BODY_R) : canStandCab(x, z));

  // Walking eases in and out (a short acceleration and glide), with a gentle head bob.
  function walk(dt) {
    let f = 0, s = 0;
    if (!Talk.active) {
      if (keys.KeyW || keys.ArrowUp) f += 1;
      if (keys.KeyS || keys.ArrowDown) f -= 1;
      if (keys.KeyD || keys.ArrowRight) s += 1;
      if (keys.KeyA || keys.ArrowLeft) s -= 1;
    }
    const len = Math.hypot(f, s) || 1;
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    const speed = WALK * (keys.ShiftLeft || keys.ShiftRight ? 1.6 : 1);
    const tvx = ((-sy * f) + (cy * s)) / len * speed, tvz = ((-cy * f) + (-sy * s)) / len * speed;
    const k = 1 - Math.exp(-dt * (f || s ? 9 : 7));
    player.vx += (tvx - player.vx) * k;
    player.vz += (tvz - player.vz) * k;
    const dx = player.vx * dt, dz = player.vz * dt;
    const moving = Math.hypot(player.vx, player.vz) > 0.05;
    if (moving) {
      if (canStand(player.x + dx, player.z + dz)) { player.x += dx; player.z += dz; }
      else if (canStand(player.x + dx, player.z)) { player.x += dx; player.vz *= 0.5; }
      else if (canStand(player.x, player.z + dz)) { player.z += dz; player.vx *= 0.5; }
      else { player.vx = 0; player.vz = 0; }
      if (player.space === 'cab') {
        if (inDoorway(player.x, player.z)) player.x *= 1 - Math.min(1, dt * 6);
        else if (!state.boarded && player.z > ROOM_Z1 - 1.1 && player.z < ROOM_Z1 && Math.abs(player.x) < 1.3 && dz > 0) player.x *= 1 - Math.min(1, dt * 3);
        const d = Math.hypot(player.x, player.z), room = ROOM - BODY_R;
        if (state.boarded && d > room) { player.x *= room / d; player.z *= room / d; }
      }
      if (mikuHere()) {
        const r = player.space === 'cab' ? MIKU_SPOT.r : 0.3;
        const mx = player.x - miku.x, mz = player.z - miku.z;
        const md = Math.hypot(mx, mz), min = r + BODY_R;
        if (md < min && md > 1e-4) { player.x = miku.x + mx / md * min; player.z = miku.z + mz / md * min; }
      }
      player.step += dt * 7.5 * Math.min(1.6, Math.hypot(player.vx, player.vz) / WALK);
    }
    const target = moving ? Math.sin(player.step) * 0.02 * Math.min(1, Math.hypot(player.vx, player.vz) / WALK) : 0;
    player.bob += (target - player.bob) * Math.min(1, dt * 10);
  }

  // ---------- Miku: turning, looking, gesturing ----------
  // Her body turns on a spring (it eases off and settles, no snapping), and her head leads it:
  // the head turns to whatever she's looking at first and the body comes round after. While she
  // talks she gestures to suit the line; when she's quiet she stands with her hands behind her
  // back, shifts now and then, and glances about (and at you, if you're close).
  const tmpV = new THREE.Vector3();
  const anim = { w: 0, pose: 'behind', lineId: -1, quietT: 0, sing: 0, idleT: 0, idlePose: 'behind', glance: { yaw: 0, pitch: 0 }, glanceT: 0, atYou: false };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function poseFor(cur) {
    const tx = cur.text.toLowerCase();
    if (cur.kind === 's') return ['reach', 'heart', 'chest', 'reach', 'clasp'][anim.sing++ % 5];
    if (cur.kind === 'n') {
      if (/laugh|grin/.test(tx)) return 'giggle';
      if (/pink|ducks her head|embarrass|quiet/.test(tx)) return 'shy';
      if (/hand/.test(tx) && /your|her/.test(tx)) return 'clasp';
      return null;
    }
    if (cur.kind !== 'm') return null;
    if (/\b(hi|hello|goodnight|bye|welcome)\b/.test(tx)) return 'wave';
    if (/\b(ha|haha|hah)\b|ridiculous|stupid|\(laugh/.test(tx)) return 'giggle';
    if (/^…|^\.\.\.|sorry|^oh\.$|^okay\.$|i love you|you can't just/.test(tx)) return 'shy';
    if (/\?/.test(tx)) return pick(['ask', 'explainR', 'ask']);
    if (/!/.test(tx)) return pick(['excited', 'explainL', 'excited']);
    if (/maybe|think|huh|wonder/.test(tx)) return 'think';
    if (/\bme\b|\bmy\b|\bi'm\b/.test(tx) && Math.random() < 0.4) return 'chest';
    return pick(['explainR', 'explainL', 'clasp', 'explainR', 'behind']);
  }

  function updateMiku(dt, t) {
    if (!miku.obj) return;
    const facing = miku.face === 'cam' || miku.face === 'player';
    let want = miku.viewYaw + Math.sin(t * 0.13) * 0.04;
    tmpV.copy(camera.position);
    miku.obj.parent.worldToLocal(tmpV);
    const toCam = Math.atan2(-(tmpV.x - miku.x), -(tmpV.z - miku.z));
    const camDist = Math.hypot(tmpV.x - miku.x, tmpV.z - miku.z);
    if (facing) want = toCam;
    else if (typeof miku.face === 'number') want = miku.face;
    const K = facing ? 9 : 4, C = 2 * Math.sqrt(K) * 0.95;
    anim.w += (K * angleDiff(want, miku.yaw) - C * anim.w) * dt;
    miku.yaw += anim.w * dt;
    miku.obj.rotation.y = miku.yaw;
    miku.obj.updateMatrixWorld(true);
    if (!miku.anim) return;

    // Pose from what's being said.
    const cur = Talk.current;
    const speaking = Talk.talking;
    if (cur && cur.id !== anim.lineId) {
      anim.lineId = cur.id;
      const p = poseFor(cur);
      if (p) anim.pose = p;
      anim.quietT = 0;
    }
    if (!cur || (!speaking && cur.kind !== 's')) anim.quietT += dt;
    // Quiet for a while: back to standing at ease, shifting now and then.
    if (anim.quietT > (cur ? 3.5 : 1.2)) {
      anim.idleT -= dt;
      if (anim.idleT <= 0) { anim.idlePose = pick(['behind', 'behind', 'behind', 'clasp', 'sides']); anim.idleT = 9 + Math.random() * 9; }
      anim.pose = anim.idlePose;
    }

    // Where she looks.
    let lookAt = null, glance = null;
    if (facing) lookAt = camera.position;
    else {
      anim.glanceT -= dt;
      if (anim.glanceT <= 0) {
        anim.glanceT = 2.5 + Math.random() * 4.5;
        const camAngle = angleDiff(toCam, miku.yaw);
        anim.atYou = camDist < 3.5 && Math.abs(camAngle) < 1.6 && Math.random() < 0.3;
        anim.glance = { yaw: (Math.random() - 0.5) * 0.7, pitch: (Math.random() - 0.4) * 0.25 };
      }
      if (anim.atYou && state.mode === 'play') lookAt = camera.position;
      else glance = cur && cur.kind === 's' ? { yaw: anim.glance.yaw * 0.4, pitch: 0.14 } : anim.glance;
    }
    miku.anim(dt, t, { pose: anim.pose, lookAt, glance, speaking: speaking || (cur && cur.kind === 's') });
  }

  // ---------- The ride ----------
  function descend(dt) {
    if (!state.descending) return;
    const target = state.ride.stops ? STOPS[state.stop] : END_Y;
    const left = state.cabY - target;
    const top = MAX_SPEED * state.ride.speed;
    const acc = ACCEL * Math.max(1, state.ride.speed);
    const stopSpeed = Math.sqrt(Math.max(0, 2 * acc * left));
    state.speed = Math.min(top, state.speed + acc * dt, stopSpeed);
    state.cabY -= state.speed * dt;
    if (left < 0.01 || (state.cabY <= target + 0.002 && state.speed < 0.02)) {
      state.cabY = target;
      state.speed = 0;
      state.descending = false;
      Sound.chime();
      if (target === END_Y) {
        state.arrived = true;
        cab.setFloor('G', false);
        if (hooks.arrive) hooks.arrive();
      } else {
        const i = state.stop;
        state.stop++;
        state.departAt = state.time + STOP_WAIT;
        showCaption('Floor ' + Building.floorOf(target), 5);
        if (hooks.stop) hooks.stop(i);
      }
    }
  }

  let lastFloor = null, lastMoving = null;
  function updateCab(t) {
    const motion = state.speed / MAX_SPEED;
    cab.group.position.set(Math.sin(t * 0.7) * 0.012 * motion, state.cabY, CAB_Z + Math.sin(t * 0.53) * 0.008 * motion);
    cab.group.rotation.set(Math.sin(t * 0.41) * 0.0012 * motion, 0, Math.sin(t * 0.5) * 0.0018 * motion);
    cab.group.updateMatrixWorld();
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

  // ---------- Camera ----------
  // A shot: { space: 'cab' | 'world', pos: [x,y,z], look: [x,y,z], drift }. In 'cab' space the
  // coordinates are the car's own, so the shot rides down with it.
  let shot = null, shotFrom = null, shotK = 1;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpM = new THREE.Matrix4();
  const lookQuat = (pos, target) => new THREE.Quaternion().setFromRotationMatrix(tmpM.lookAt(pos, target, new THREE.Vector3(0, 1, 0)));
  function shotPose(s, t) {
    const d = s.drift === undefined ? 1 : s.drift;
    tmpA.set(s.pos[0] + Math.sin(t * 0.21) * 0.05 * d, s.pos[1] + Math.sin(t * 0.17) * 0.03 * d, s.pos[2] + Math.sin(t * 0.13) * 0.05 * d);
    tmpB.set(...s.look);
    if (s.space === 'cab') { cab.group.localToWorld(tmpA); cab.group.localToWorld(tmpB); }
    return { pos: tmpA.clone(), quat: lookQuat(tmpA, tmpB) };
  }
  function setShot(s, cut) {
    shotFrom = cut || !shot ? null : { pos: camera.position.clone(), quat: camera.quaternion.clone() };
    shotK = shotFrom ? 0 : 1;
    shot = s;
    if (state.mode !== 'scene') { state.mode = 'scene'; if (document.pointerLockElement) document.exitPointerLock(); }
  }
  const titleShot = () => ({ space: 'cab', pos: [Math.sin(state.time * 0.11) * 0.35, 1.6, ROOM_Z0 + 3.4 + Math.sin(state.time * 0.07) * 0.4], look: [MIKU_SPOT.x * 0.6, 1.3, MIKU_SPOT.z], drift: 0.5 });
  const fpPose = () => {
    if (player.space === 'home') {
      return { pos: new THREE.Vector3(player.x, player.y + EYE_H + player.bob, player.z), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')) };
    }
    tmpA.set(player.x, EYE_H + player.bob, player.z);
    cab.group.localToWorld(tmpA);
    const q = cab.group.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')));
    return { pos: tmpA.clone(), quat: q };
  };

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let introFrom = null, introDone = null, lastPrompt = null;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const paused = state.mode === 'paused';
    if (!paused) state.time += dt;
    const t = state.time;

    if (state.mode === 'title') {
      const p = shotPose(titleShot(), t);
      camera.position.copy(p.pos); camera.quaternion.copy(p.quat);
    } else if (state.mode === 'intro') {
      if (!introFrom) introFrom = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
      state.introT += dt / 2.4;
      const k = Math.min(1, state.introT), e = k * k * (3 - 2 * k);
      const p = fpPose();
      camera.position.lerpVectors(introFrom.pos, p.pos, e);
      camera.quaternion.slerpQuaternions(introFrom.quat, p.quat, e);
      if (k >= 1) {
        introFrom = null;
        state.mode = document.pointerLockElement === canvas ? 'play' : 'paused';
        if (state.mode === 'paused') $('pause').classList.remove('hidden');
        if (introDone) { const d = introDone; introDone = null; d(); }
      }
    } else if (state.mode === 'play') {
      walk(dt);
      const p = fpPose();
      camera.position.copy(p.pos); camera.quaternion.copy(p.quat);
      // What E would do here: talk to her, or use the thing you're looking at.
      const talkOk = canTalk();
      usableNow = talkOk ? null : findUsable();
      const label = talkOk ? (hooks.talkLabel || 'Talk to Miku') : usableNow ? usableNow.label : null;
      if (label !== lastPrompt) { lastPrompt = label; if (label) prompt.innerHTML = '<kbd>E</kbd>' + label; }
      prompt.classList.toggle('hidden', !label);
    } else if (state.mode === 'scene' && shot) {
      const p = shotPose(shot, t);
      if (shotFrom) {
        shotK = Math.min(1, shotK + dt / 1.8);
        const e = shotK * shotK * (3 - 2 * shotK);
        camera.position.lerpVectors(shotFrom.pos, p.pos, e);
        camera.quaternion.slerpQuaternions(shotFrom.quat, p.quat, e);
        if (shotK >= 1) shotFrom = null;
      } else { camera.position.copy(p.pos); camera.quaternion.copy(p.quat); }
    }
    if (state.mode !== 'play') { prompt.classList.add('hidden'); lastPrompt = null; }

    if (!paused) {
      if (state.ride.playable && state.mode === 'play' && !state.boarded && inCar(player.x, player.z) && player.z > -1.0) {
        state.boarded = true;
        state.closeAt = t + 1.4;
        if (hooks.board) hooks.board();
      }
      if (state.closeAt && t >= state.closeAt) { state.closeAt = 0; state.doorTarget = 0; Sound.chime(); }
      const was = state.doors;
      state.doors += Math.sign(state.doorTarget - state.doors) * Math.min(Math.abs(state.doorTarget - state.doors), dt * 0.55);
      if (state.boarded && was > 0 && state.doors === 0 && !state.descending && !state.arrived && state.stop === 1) state.departAt = t + 1.5;
      cab.setDoors(state.doors);
      landing.setDoors(state.doors);
      landing.update(t);
      if (state.departAt && t >= state.departAt && !Talk.active && !state.hold) {
        state.departAt = 0;
        state.descending = true;
      }
      descend(dt);
      city.update(dt, t);
      places.update(t);
      updateMiku(dt, t);
      Talk.update(dt);
    }
    updateCab(t);
    building.update(t);
    const open = building.openness(state.cabY);
    for (const { l, base } of cabLights) l.intensity = base * (0.3 + 0.7 * open);
    if (ringMat) ringMat.color.lerpColors(RING_DIM, RING_LIT, open);
    Sound.update(state.speed / MAX_SPEED, 1 - (state.cabY - END_Y) / (START_Y - END_Y), t, open);

    if (hintTimer > 0 && (hintTimer -= dt) <= 0) hint.classList.remove('show');
    if (captionTimer > 0 && (captionTimer -= dt) <= 0) caption.classList.remove('show');

    renderer.render(scene, camera);
  }

  // ---------- The Game API the story uses ----------
  window.Game = {
    get ready() { return isReady; },
    onReady(cb) { if (isReady) cb(); else readyCb = cb; },
    hooks, state, player, miku, camera, scene, places,
    get cabY() { return state.cabY; },
    get arrived() { return state.arrived; },

    // Put the car back at the top with Miku in it. playable: you start in the landing and walk
    // aboard; otherwise you're already aboard and it sets off on its own.
    newRide({ playable = false, stops = true, speed = 1 } = {}) {
      places.show(null);
      Sound.ambience = 1;
      state.ride = { playable, stops, speed };
      state.cabY = START_Y; state.speed = 0; state.descending = false; state.arrived = false;
      state.stop = 1; state.departAt = 0; state.closeAt = 0; state.hold = false;
      lastFloor = null;
      player.space = 'cab'; player.vx = player.vz = 0; usables = [];
      placeMiku('cab');
      miku.face = 'view';
      if (playable) {
        state.boarded = false; state.doors = 1; state.doorTarget = 1;
        player.x = 0.15; player.z = ROOM_Z0 + 2.6; player.yaw = Math.PI; player.pitch = -0.03;
      } else {
        state.boarded = true; state.doors = 0; state.doorTarget = 0;
        state.departAt = state.time + 2.5;
        player.x = -0.5; player.z = -0.4;
      }
      updateCab(state.time);
    },
    // Hand the camera to the player (first person in the car), easing in from where it is.
    firstPerson(done) {
      shot = null;
      state.mode = 'intro'; state.introT = 0; introFrom = null; introDone = done || null;
      lock();
    },
    shot: setShot,
    titleMode() { state.mode = 'title'; shot = null; places.show(null); placeMiku('cab'); miku.face = 'view'; state.cabY = START_Y; state.doors = 1; state.doorTarget = 1; },
    mikuAt: placeMiku,
    mikuFace(f) { miku.face = f; },
    // Shows a place (stall, park, roof, home) and puts her at a spot in it.
    goTo(place, spot) {
      places.show(place);
      Sound.ambience = 0.25;
      const p = places[place];
      placeMiku(spot ? p.spots[spot] : p.miku);
    },
    hold(on) { state.hold = on; },

    // Home: walk round your apartment in first person. `at` is a spot { x, z, yaw }.
    enterHome(at, withMiku) {
      places.show('home');
      Sound.ambience = 0.2;
      player.space = 'home';
      player.x = at.x; player.z = at.z; player.y = places.home.floorY;
      player.yaw = at.yaw; player.pitch = -0.05; player.vx = player.vz = 0;
      if (withMiku) placeMiku(places.home.spots[withMiku]); else if (miku.obj) miku.obj.visible = false;
      miku.face = 'view';
      shot = null;
      const p = fpPose();
      camera.position.copy(p.pos); camera.quaternion.copy(p.quat);
      state.mode = 'play';
      lock();
      if (document.pointerLockElement !== canvas) { state.mode = 'paused'; $('pause').classList.remove('hidden'); }
    },
    setUsables(list) { usables = list; },
    // An on-screen app (phone, computer) is open: free the mouse, stop walking.
    openUI() { if (state.mode === 'play' || state.mode === 'paused') { state.mode = 'ui'; $('pause').classList.add('hidden'); if (document.pointerLockElement) document.exitPointerLock(); for (const k in keys) keys[k] = false; } },
    closeUI() { if (state.mode === 'ui') { state.mode = 'play'; lock(); } },
    // A photo of what's on screen now, for the album.
    snapshot() {
      renderer.render(scene, camera);
      const c = document.createElement('canvas'); c.width = 480; c.height = 270;
      const g = c.getContext('2d');
      const w = canvas.width, h = canvas.height, ar = 16 / 9;
      const sw = Math.min(w, h * ar), sh = sw / ar;
      g.drawImage(canvas, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, 480, 270);
      return c.toDataURL('image/jpeg', 0.72);
    },
    hurry() { state.ride.speed = 3; state.ride.stops = false; },
    caption: showCaption,
    hint: showHint,
    dawn(k) { $('dawn').style.opacity = k; },
    canTalkNow: canTalk,
  };

  updateCab(0);
  frame();
  Story.boot();
  requestAnimationFrame(() => $('fade').classList.add('clear'));
})();
