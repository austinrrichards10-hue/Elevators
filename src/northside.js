// The north edge of the city. One gap in the wall of towers leads into a dark alley, and at the
// end of it there's a door with a keypad. It doesn't say what's behind it.

const NORTH = { x0: 1.5, x1: 4.5, z: 146, door: 186.2 };
const deep = { built: false, door: null, code: '', seated: false, video: null, list: [], idx: 0, probed: false, drone: null, t: 0 };

/* ---------- The alley ---------- */
function buildNorthside(G) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const glow = (c, k = 1.4) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
  // Wet black asphalt, a few puddles, walls of grimy concrete either side.
  add(new THREE.PlaneGeometry(5, 44).rotateX(-Math.PI / 2), std(0x16171c, { roughness: 0.55, metalness: 0.2 }), 3, 0.03, 166);
  for (const [x, z, s] of [[2.4, 152, 1.2], [3.8, 163, 0.9], [2.8, 177, 1.4]]) add(new THREE.CircleGeometry(s, 20).rotateX(-Math.PI / 2), std(0x0a0c12, { roughness: 0.05, metalness: 0.8 }), x, 0.04, z).scale.set(1, 1, 1.8);
  const wall = std(0x2a2a30);
  for (const x of [0.75, 5.25]) add(new THREE.BoxGeometry(0.5, 14, 22), wall, x, 7, 176.5);
  // Pipes, a ladder of conduit, rubbish bags, a rusty bin: nobody comes down here.
  const pipe = std(0x3a3a40, { metalness: 0.6, roughness: 0.5 });
  for (const [x, r] of [[1.1, 0.09], [1.25, 0.05], [4.85, 0.11]]) add(new THREE.CylinderGeometry(r, r, 14, 8), pipe, x, 7, 170 + r * 40);
  for (const [x, z] of [[1.6, 158], [1.7, 159], [4.4, 171], [4.3, 172.4], [1.6, 181]]) add(new THREE.SphereGeometry(0.42, 8, 6), std(0x101114, { roughness: 0.4 }), x, 0.3, z).scale.set(1, 0.75, 1);
  add(new THREE.BoxGeometry(0.9, 1.1, 1.6), std(0x3a2a20, { metalness: 0.4 }), 4.45, 0.55, 165);
  // The building at the end: black, windowless, no name.
  const block = std(0x121216, { roughness: 0.95 });
  add(new THREE.BoxGeometry(34, 34, 28), block, 3, 17, 201);
  for (let x = -12; x <= 18; x += 3) add(new THREE.BoxGeometry(0.12, 34, 0.1), std(0x1c1c22), x, 17, 186.96);
  add(new THREE.SphereGeometry(0.25, 8, 6), glow(0xff1a2a, 2), 3, 33.6, 186.9);
  // The door: heavy steel in two halves, studded, in a deep frame.
  const steel = std(0x3a3c44, { metalness: 0.85, roughness: 0.35 });
  const frame = add(new THREE.BoxGeometry(2.8, 3.2, 0.4), std(0x1a1a1e, { metalness: 0.6 }), 3, 1.6, 186.95);
  void frame;
  const halves = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group(); h.position.set(3 + s * 0.55, 0, 186.68); G.add(h);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 0.18), steel); slab.position.set(0, 1.3, 0); h.add(slab);
    for (let r = 0; r < 6; r++) for (const cx of [-0.4, 0.4]) { const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), steel); stud.position.set(cx, 0.25 + r * 0.42, -0.1); h.add(stud); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.04), std(0x8a1a1a, { metalness: 0.5 })); bar.position.set(0, 1.3, -0.1); h.add(bar);
    halves.push({ g: h, s });
  }
  // Behind the door, the dark, faintly purple.
  const inside = add(new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }), 3, 1.3, 186.8);
  inside.rotation.y = Math.PI;
  // The keypad, its little red screen, and a caged bulb that won't stay lit.
  add(new THREE.BoxGeometry(0.34, 0.5, 0.08), std(0x1a1c22, { metalness: 0.7 }), 4.75, 1.35, 186.66);
  const led = add(new THREE.PlaneGeometry(0.24, 0.08), glow(0xff2030, 1.8), 4.75, 1.52, 186.61);
  led.rotation.y = Math.PI;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = add(new THREE.BoxGeometry(0.06, 0.05, 0.02), std(0x5a5c66, { metalness: 0.6 }), 4.68 + c * 0.07, 1.4 - r * 0.065, 186.61); void k; }
  const bulb = add(new THREE.SphereGeometry(0.12, 10, 8), glow(0xffe0b0, 1.8), 3, 3.6, 186.3);
  add(new THREE.BoxGeometry(0.3, 0.06, 0.4), std(0x1a1a1e), 3, 3.75, 186.5);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xffd8a0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(3, 3.5, 186.1); halo.scale.setScalar(5); G.add(halo);
  // The light that spills out when it opens: violet, across the wet ground.
  const spill = add(new THREE.PlaneGeometry(2.4, 5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.softDot, color: 0x9a4aff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 3, 0.06, 185.2);
  const glowOut = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0x8a3aff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glowOut.position.set(3, 1.3, 186.4); glowOut.scale.set(3.2, 4, 1); G.add(glowOut);
  deep.door = { halves, led, bulb, halo, inside, spill, glowOut };
  citySpot({ x: 3, z: 185.2, r: 1.7, label: () => 'Press E to use the keypad', use: () => openKeypad(), active: () => !city.inside && !deep.open });
}

// Only the one gap: the rest of the north edge stays shut.
function northClamp(pos) {
  if (pos.z <= NORTH.z || pos.x < NORTH.x0 - 0.3 || pos.x > NORTH.x1 + 0.3) return false;
  pos.x = clamp(pos.x, NORTH.x0, NORTH.x1);
  pos.z = Math.min(pos.z, NORTH.door - 0.9);
  return true;
}

function updateNorthside(dt) {
  const D = deep.door;
  if (!D) return;
  // The bulb: steady, then a stutter, then dark for a beat.
  const t = game.time, f = Math.sin(t * 13) > 0.92 || (t % 7) < 0.25 ? 0.1 : 1;
  D.bulb.material.color.setScalar(1.8 * f); D.halo.material.opacity = 0.6 * f;
  if (city.inside === 'deep') updateDeep(dt);
  // Down there, nothing on screen but the room: no goal, no arrow, no fame.
  document.body.classList.toggle('in-deep', city.inside === 'deep');
}

/* ---------- The keypad ---------- */
function openKeypad() {
  let el = $('keypad');
  if (!el) {
    el = document.createElement('div'); el.id = 'keypad';
    el.innerHTML = `<div class="kp-screen"><span class="kp-code">____</span><em>ENTER CODE</em></div><div class="kp-keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div><p>0-9 · Enter · Esc</p>`;
    document.body.appendChild(el);
    el.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-k]'); if (b) keypadPress(b.dataset.k); });
  }
  deep.code = '';
  keypadDraw();
  el.classList.remove('hidden', 'ok', 'bad');
  pointerWasLocked = false;
  document.exitPointerLock();
  game.state = 'keypad';
}
function closeKeypad(relock = true) { const el = $('keypad'); if (el) el.classList.add('hidden'); if (game.state === 'keypad') game.state = 'playing'; if (relock) lockPointer(); }
function keypadDraw(msg) {
  const el = $('keypad');
  el.querySelector('.kp-code').textContent = (deep.code + '____').slice(0, 4).replace(/\d/g, '•').replace(/_/g, '_');
  el.querySelector('em').textContent = msg || 'ENTER CODE';
}
function keypadBeep(f, d = 0.06, v = 0.05) {
  const ctx = Sfx.ctx; if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(Sfx.master); o.start(t); o.stop(t + d + 0.02);
}
function keypadPress(k) {
  const el = $('keypad');
  if (!el || el.classList.contains('hidden') || el.classList.contains('ok')) return;
  if (k === 'CLR') { deep.code = ''; keypadBeep(600); keypadDraw(); return; }
  if (k === 'ENT') {
    if (deep.code === '6969') {
      el.classList.add('ok'); keypadDraw('ACCESS GRANTED');
      keypadBeep(1320, 0.12, 0.06); setTimeout(() => keypadBeep(1760, 0.2, 0.06), 140);
      deep.door.led.material.color.setHex(0x30ff60).multiplyScalar(1.8);
      setTimeout(() => { closeKeypad(false); startDescent(); }, 900);
    } else {
      el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
      keypadDraw('ACCESS DENIED'); keypadBeep(140, 0.35, 0.08);
      deep.code = '';
      setTimeout(() => { if (!el.classList.contains('ok')) keypadDraw(); }, 1100);
    }
    return;
  }
  if (deep.code.length >= 4) return;
  deep.code += k; keypadBeep(900 + +k * 40); keypadDraw();
}
addEventListener('keydown', (e) => {
  const el = $('keypad');
  if (!el || el.classList.contains('hidden') || game.state !== 'keypad') return;
  const d = e.code.match(/^(?:Digit|Numpad)(\d)$/);
  e.preventDefault(); e.stopImmediatePropagation();
  if (d) keypadPress(d[1]);
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') keypadPress('ENT');
  else if (e.code === 'Backspace') { deep.code = deep.code.slice(0, -1); keypadDraw(); }
  else if (e.code === 'Escape' || e.code === 'KeyE') closeKeypad();
}, true);

/* ---------- Sounds of the deep ---------- */
function deepNoise(dur, type, f, q, vol, at = 0, sweepTo = null) {
  const ctx = Sfx.ctx; if (!ctx) return;
  const t = ctx.currentTime + at, s = ctx.createBufferSource(); s.buffer = Sfx.noise; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.3, dur * 0.3)); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(Sfx.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function deepTone(f, dur, vol, at = 0, type = 'sine', to = null) {
  const ctx = Sfx.ctx; if (!ctx) return;
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(Sfx.master); o.start(t); o.stop(t + dur + 0.05);
}
// A low hum that never stops down there, with something like a slow heartbeat under it.
function deepDrone(on) {
  const ctx = Sfx.ctx; if (!ctx) return;
  if (on && !deep.drone) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(Sfx.master);
    const oscs = [41, 55, 82.4, 61.7].map((f, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; const og = ctx.createGain(); og.gain.value = i === 2 ? 0.05 : 0.12; o.connect(og).connect(g); o.start(); return o; });
    const n = ctx.createBufferSource(); n.buffer = Sfx.noise; n.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 220; const ng = ctx.createGain(); ng.gain.value = 0.08; n.connect(nf).connect(ng).connect(g); n.start();
    g.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
    deep.drone = { g, oscs, n };
  } else if (!on && deep.drone) {
    const d = deep.drone; deep.drone = null;
    d.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => { for (const o of d.oscs) o.stop(); d.n.stop(); d.g.disconnect(); }, 2500);
  }
}

/* ---------- The door, and the long way down ---------- */
function startDescent() {
  ROOMS.deep.noClamp = true;
  buildDeep();
  const R = ROOMS.deep, E = deep.elev, D = deep.door;
  Sfx.playMusic(null);
  const S = { t: 0, phase: 'door', fired: {} };
  const once = (k, at, fn) => { if (!S.fired[k] && S.t >= at) { S.fired[k] = true; fn(); } };
  player.pos.set(3, CITY.y, NORTH.door - 1.3); player.yaw = player.bodyYaw = 0;
  playScene({
    update(dt) {
      S.t += dt;
      const t = S.t;
      updateCityAmbient(dt);
      if (S.phase === 'door') {
        // Bolts, a groan of steel, the halves grinding apart, cold dark breath from inside.
        once('bolt', 0.1, () => { deepTone(90, 0.25, 0.25, 0, 'square', 50); deepNoise(0.3, 'bandpass', 900, 2, 0.15); });
        once('grind', 0.7, () => { deepNoise(2.6, 'bandpass', 380, 3, 0.18, 0, 160); deepTone(48, 2.8, 0.22, 0, 'sawtooth', 38); });
        const open = smooth(clamp((t - 0.7) / 2.4, 0, 1));
        for (const h of D.halves) h.g.position.x = 3 + h.s * (0.55 + open * 1.05);
        D.inside.material.color.setRGB(0.32 * open, 0.07 * open, 0.62 * open);
        D.spill.material.opacity = 0.55 * open; D.glowOut.material.opacity = 0.7 * open;
        D.halo.material.opacity = 0.12; D.bulb.material.color.setScalar(0.6);
        const walk = smooth(clamp((t - 3.1) / 2.2, 0, 1));
        player.pos.set(3, CITY.y, NORTH.door - 1.3 + walk * 3.4);
        if (walk > 0 && walk < 1) { player.stride = 1; player.walkPhase += dt * 5.5; poseAvatar(dt, cityV.set(0, 0, 1), true); } else { player.stride = 0; poseAvatar(dt, cityV.set(0, 0, 0), false); }
        avatar.simulate(dt);
        camera.position.set(1.9 + t * 0.08, CITY.y + 1.3 + t * 0.04, NORTH.door - 7.6 + t * 0.35);
        camera.lookAt(3, CITY.y + 1.5, NORTH.door);
        setFov(50);
        once('fade', 4.6, () => impact('black', 900));
        if (t > 5.2) {
          // Into the car. The doors shut behind her.
          S.phase = 'car'; S.t = 0; S.fired = {};
          for (const h of D.halves) h.g.position.x = 3 + h.s * 0.55;
          D.inside.material.color.setRGB(0, 0, 0); D.spill.material.opacity = 0; D.glowOut.material.opacity = 0;
          D.led.material.color.setHex(0xff2030).multiplyScalar(1.8);
          city.inside = 'deep';
          setStreetVisible(false);
          player.pos.set(R.x, CITY.y, E.z);
          player.yaw = player.bodyYaw = 0;
          E.setDoors(0);
        }
        return;
      }
      // The car: the floors falling away on the little display, in cuts.
      const cuts = [[0, 2.4, 1, 12, 0], [2.75, 4.7, 58, 66, 1], [5.05, 7.0, 131, 140, 2], [7.35, 10.1, 206, 215, 3]];
      let floor = 215, shot = 3, black = true;
      for (const [a, b, f0, f1, s] of cuts) if (t >= a && t < b) { black = false; shot = s; floor = Math.round(lerp(f0, f1, s === 3 ? 1 - Math.pow(1 - (t - a) / (b - a), 2) : (t - a) / (b - a))); }
      if (t >= 10.1) { black = false; shot = 4; floor = 215; }
      E.blackout.style.opacity = black ? '1' : '0';
      if (floor !== S.lastFloor) { S.lastFloor = floor; E.show(floor); if (!black && shot < 3) deepTone(1200, 0.03, 0.01); }
      once('rumble', 0.05, () => deepNoise(10.2, 'lowpass', 140, 0.7, 0.35));
      for (const [k, at] of [['c1', 2.4], ['c2', 4.7], ['c3', 7.0]]) once(k, at, () => { deepTone(60, 0.35, 0.35, 0, 'sine', 30); deepNoise(0.2, 'lowpass', 400, 1, 0.2); });
      once('creak', 5.6, () => deepNoise(1.2, 'bandpass', 1400, 8, 0.05, 0, 900));
      once('stop', 9.8, () => { deepTone(45, 1.2, 0.4, 0, 'sine', 32); deepNoise(0.6, 'lowpass', 300, 1, 0.25); });
      once('ding', 10.7, () => { deepTone(311, 2.6, 0.12); deepTone(207.6, 3.2, 0.08, 0.02); });
      // The car shudders on the way down; the light stutters; at the bottom, it's still.
      const shake = t < 9.9 ? 0.012 + (shot === 2 ? 0.015 : 0) : Math.max(0, 0.03 * (10.4 - t));
      E.light.material.color.setScalar(Math.random() < (shot === 2 ? 0.25 : 0.06) ? 0.15 : 1);
      const views = [[R.x + 0.9, 2.2, E.z - 1.1, R.x, 1.3, E.z + 1.6], [R.x - 0.2, 2.75, E.z - 0.4, R.x, 0.6, E.z + 0.8], [R.x - 1.0, 1.0, E.z + 1.1, R.x + 0.2, 1.6, E.z - 0.2], [R.x + 0.6, 1.6, E.z - 1.25, R.x, 1.5, E.z + 1.6], [R.x + 0.4, 1.7, E.z - 1.3, R.x, 1.4, E.z + 4]];
      const v = views[shot];
      camera.position.set(v[0] + (Math.random() - 0.5) * shake, CITY.y + v[1] + (Math.random() - 0.5) * shake, v[2]);
      camera.lookAt(v[3], CITY.y + v[4], v[5]);
      setFov(shot === 1 ? 70 : 58);
      // The doors open on the dark, and she walks out.
      const open = smooth(clamp((t - 11.2) / 2.4, 0, 1));
      E.setDoors(open);
      once('doors', 11.2, () => { deepNoise(2.4, 'bandpass', 600, 2, 0.07, 0, 300); deepDrone(true); });
      const walk = smooth(clamp((t - 13.4) / 2.6, 0, 1));
      player.pos.set(R.x, CITY.y, E.z + walk * 3.4);
      if (walk > 0 && walk < 1) { player.stride = 1; player.walkPhase += dt * 4.5; poseAvatar(dt, cityV.set(0, 0, 1), true); } else { player.stride = 0; poseAvatar(dt, cityV.set(0, 0, 0), false); }
      avatar.simulate(dt);
      if (t > 16.4) {
        E.blackout.style.opacity = '0';
        ROOMS.deep.noClamp = false;
        endScene();
        lockPointer();
      }
    },
  });
}

// Back up: the doors close, a cut, and she's at the top again, in the alley.
function startAscent() {
  ROOMS.deep.noClamp = true;
  if (deep.seated) standUpDeep();
  const E = deep.elev, D = deep.door;
  stopDeepVideo();
  const S = { t: 0, fired: {} };
  const once = (k, at, fn) => { if (!S.fired[k] && S.t >= at) { S.fired[k] = true; fn(); } };
  const R = ROOMS.deep;
  player.pos.set(R.x, CITY.y, E.z); player.yaw = player.bodyYaw = Math.PI;
  playScene({
    update(dt) {
      S.t += dt;
      const t = S.t;
      E.setDoors(1 - smooth(clamp(t / 1.6, 0, 1)));
      poseAvatar(dt, cityV.set(0, 0, 0), false); avatar.simulate(dt);
      camera.position.set(R.x + 0.5, CITY.y + 1.7, E.z + 3.4); camera.lookAt(R.x, CITY.y + 1.4, E.z);
      once('close', 0, () => deepNoise(1.6, 'bandpass', 600, 2, 0.07, 0, 300));
      once('up', 1.7, () => { E.show(1); impact('black', 1200); deepNoise(1.3, 'lowpass', 160, 0.7, 0.3); deepDrone(false); });
      if (t > 2.6) {
        city.inside = null;
        setStreetVisible(true);
        for (const h of D.halves) h.g.position.x = 3 + h.s * 0.55;
        player.pos.set(3, CITY.y, NORTH.door - 2.2); player.yaw = player.bodyYaw = Math.PI;
        endScene();
        lockPointer();
        Sfx.playMusic(cityMusic());
        ROOMS.deep.noClamp = false;
      }
    },
  });
}

/* ---------- Below ---------- */
function buildDeep() {
  if (deep.built) return;
  deep.built = true;
  const R = ROOMS.deep, W = R.w / 2, Dp = R.d / 2;
  const g = new THREE.Group(); g.position.set(R.x, 0, R.z); city.group.add(g);
  R.g = g; R.rects = [];
  const mat = (c, e = 0.12, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, emissive: c, emissiveIntensity: e, ...extra });
  const glow = (c, k = 1.4, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false, ...extra });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const block = (x0, x1, z0, z1) => R.rects.push({ x0: R.x + x0, x1: R.x + x1, z0: R.z + z0, z1: R.z + z1 });
  // The room: a carpet the colour of a bruise, walls of ribbed black panels, a ceiling of
  // pinprick stars, and the purple dark everywhere.
  const carpet = paintCanvas(256, 256, (c) => { c.fillStyle = '#120a1c'; c.fillRect(0, 0, 256, 256); c.strokeStyle = 'rgba(120,60,180,.18)'; c.lineWidth = 2; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.beginPath(); c.arc(i * 32 + 16, j * 32 + 16, 10, 0, Math.PI * 2); c.stroke(); } });
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(6, 8);
  add(new THREE.PlaneGeometry(R.w, R.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1, emissive: 0xffffff, emissiveMap: carpet, emissiveIntensity: 0.5 }), 0, 0.01, 0);
  const wallM = mat(0x0e0a16, 0.35);
  add(new THREE.PlaneGeometry(R.w, R.h), wallM, 0, R.h / 2, Dp).rotation.y = Math.PI;
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(R.d, R.h), wallM, s * W, R.h / 2, 0).rotation.y = -s * Math.PI / 2;
  // The back wall, with the elevator's opening in it.
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(W - 1.2, R.h), wallM, s * (W + 1.2) / 2, R.h / 2, -Dp);
  add(new THREE.PlaneGeometry(2.4, R.h - 2.7), wallM, 0, (R.h + 2.7) / 2, -Dp);
  add(new THREE.PlaneGeometry(R.w, R.d).rotateX(Math.PI / 2), mat(0x06040a, 0.2), 0, R.h, 0);
  for (let i = 0; i < 26; i++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.18, R.h - 1.4, 0.5), mat(0x161020, 0.25), s * (W - 0.12), R.h / 2, -Dp + 1 + i * 1.25);
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(R.d, 0.04), glow(0x8a3aff, 1.4), s * (W - 0.4), 0.4, 0).rotation.y = -s * Math.PI / 2;
  const stars = []; for (let i = 0; i < 520; i++) stars.push((Math.random() - 0.5) * R.w, R.h - 0.05, (Math.random() - 0.5) * R.d);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  const starPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd8c0ff, size: 0.05, transparent: true, opacity: 0.8 }));
  g.add(starPts);
  // Sconces along the walls: little upturned bowls of violet light.
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const z = -Dp + 4 + i * 5.2;
    add(new THREE.CylinderGeometry(0.22, 0.08, 0.2, 12), mat(0x1a1424, 0.2, { metalness: 0.7 }), s * (W - 0.35), 3.2, z);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0x9a4aff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(s * (W - 0.4), 3.9, z); sp.scale.set(1.6, 3.2, 1); g.add(sp);
  }
  // The screen: vast, framed in black, with velvet curtains drawn back from it.
  const sw = 20, sh = 8.4, sy = 5.8;
  add(new THREE.BoxGeometry(sw + 0.8, sh + 0.8, 0.3), mat(0x050308, 0.05), 0, sy, Dp - 0.3);
  const idle = document.createElement('canvas'); idle.width = 640; idle.height = 270;
  const idleTex = new THREE.CanvasTexture(idle); idleTex.colorSpace = THREE.SRGBColorSpace;
  const screen = add(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: idleTex, toneMapped: false }), 0, sy, Dp - 0.46);
  screen.rotation.y = Math.PI;
  const velvet = paintCanvas(128, 256, (c) => { for (let x = 0; x < 128; x++) { const v = 0.55 + 0.45 * Math.sin(x / 128 * Math.PI * 9); c.fillStyle = `rgb(${Math.round(40 * v)},${Math.round(8 * v)},${Math.round(60 * v)})`; c.fillRect(x, 0, 1, 256); } });
  const curtain = new THREE.MeshStandardMaterial({ map: velvet, roughness: 1, emissive: 0xffffff, emissiveMap: velvet, emissiveIntensity: 0.55, side: THREE.DoubleSide });
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(3.4, R.h - 0.4), curtain, s * (sw / 2 + 1.4), (R.h - 0.4) / 2, Dp - 0.7).rotation.y = Math.PI;
  add(new THREE.PlaneGeometry(sw + 6, 1.6), curtain, 0, R.h - 0.9, Dp - 0.75).rotation.y = Math.PI;
  add(new THREE.BoxGeometry(sw + 2, 0.5, 2), mat(0x0a0610, 0.1), 0, 0.25, Dp - 1.2);
  add(new THREE.BoxGeometry(sw + 2, 0.04, 0.04), glow(0xb46aff, 1.6), 0, 0.52, Dp - 2.2);
  block(-sw / 2 - 1, sw / 2 + 1, Dp - 2.3, Dp);
  // The projector's beam from a slot high in the back wall, dust turning in it.
  const beam = add(new THREE.ConeGeometry(1, 1, 24, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 0, 9.2, -Dp + 0.3);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, sy - 9.2, Dp - 0.46 - (-Dp + 0.3)).normalize());
  beam.scale.set(sw * 0.55, sh * 0.55, Math.hypot(Dp * 2 - 0.8, 9.2 - sy));
  add(new THREE.PlaneGeometry(0.8, 0.4), glow(0xe8d8ff, 1.6), 0, 9.2, -Dp + 0.03);
  // The one seat, in the middle of everything, facing the screen.
  const velvetSeat = mat(0x4a1030, 0.16, { roughness: 0.75 });
  const sx = 0, sz = 1;
  add(new THREE.BoxGeometry(1.2, 0.3, 1.1), mat(0x0c0810, 0.1), sx, 0.15, sz);
  add(new THREE.BoxGeometry(1.0, 0.22, 0.9), velvetSeat, sx, 0.42, sz + 0.05);
  const back = add(new THREE.BoxGeometry(1.05, 0.72, 0.24), velvetSeat, sx, 0.8, sz - 0.48); back.rotation.x = -0.12;
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.2, 0.32, 1.05), velvetSeat, sx + s * 0.6, 0.62, sz); add(new THREE.TorusGeometry(0.07, 0.015, 6, 16).rotateX(Math.PI / 2), mat(0x8a8a90, 0.2, { metalness: 0.9 }), sx + s * 0.6, 0.79, sz + 0.35); }
  add(new THREE.PlaneGeometry(1.5, 1.4).rotateX(-Math.PI / 2), glow(0x6a2acc, 0.9, { transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), sx, 0.02, sz);
  block(sx - 0.75, sx + 0.75, sz - 0.65, sz + 0.55);
  // A lit aisle of little lights from the elevator to the seat, a pulse running along it.
  const dots = [];
  for (let i = 0; i < 12; i++) for (const s of [-1, 1]) dots.push(add(new THREE.CircleGeometry(0.06, 10).rotateX(-Math.PI / 2), glow(0xb46aff, 1.4), s * 0.9, 0.025, -Dp + 2 + i * 1.3));
  // A red exit sign over the elevator that flickers now and then.
  const exit = add(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshBasicMaterial({ map: neonTexture('出口  EXIT', '#ff2a3a', '#140206'), toneMapped: false }), 0, 3.3, -Dp + 0.04);
  // Haze hanging in the violet light.
  const hn = 160, hp = new Float32Array(hn * 3);
  for (let i = 0; i < hn; i++) hp.set([(Math.random() - 0.5) * R.w, 0.5 + Math.random() * 7, (Math.random() - 0.5) * R.d], i * 3);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  const haze = new THREE.Points(hg, new THREE.PointsMaterial({ map: TEX.softDot, color: 0x5a2a9a, size: 3.2, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(haze);
  // The elevator car, behind the back wall: brushed steel, a grated floor, a handrail, a
  // stuttering light and a little red display over the doors.
  const ez = -Dp - 1.7;
  // Open at the front, where its doors are, so the room shows when they part.
  const carM = new THREE.MeshStandardMaterial({ color: 0x2a2c32, metalness: 0.85, roughness: 0.4, emissive: 0x1a1c22, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const car = add(new THREE.PlaneGeometry(3.2, 3.0), carM, 0, 1.5, ez - 1.6);
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(3.2, 3.0), carM, s * 1.6, 1.5, ez).rotation.y = Math.PI / 2;
  add(new THREE.PlaneGeometry(3.2, 3.2).rotateX(Math.PI / 2), carM, 0, 3.0, ez);
  // Its front wall, round the doorway, so nothing shows until the doors part.
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(0.42, 3.0), carM, s * 1.39, 1.5, -Dp - 0.12);
  add(new THREE.PlaneGeometry(3.2, 0.42), carM, 0, 2.81, -Dp - 0.12);
  void car;
  add(new THREE.PlaneGeometry(3.1, 3.1).rotateX(-Math.PI / 2), mat(0x18181c, 0.2, { metalness: 0.8 }), 0, 0.02, ez);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.04, 0.04, 2.8), mat(0x8a8a90, 0.3, { metalness: 0.9 }), s * 1.5, 1.0, ez);
  const light = add(new THREE.PlaneGeometry(1.4, 0.5).rotateX(Math.PI / 2), glow(0xd8e0ff, 1.2), 0, 2.98, ez);
  const disp = document.createElement('canvas'); disp.width = 128; disp.height = 48;
  const dispTex = new THREE.CanvasTexture(disp);
  add(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false }), 0, 2.62, -Dp - 0.12);
  const doorM = new THREE.MeshStandardMaterial({ color: 0x3a3c44, metalness: 0.9, roughness: 0.3, emissive: 0x16181e, emissiveIntensity: 0.6 });
  const doors = [-1, 1].map((s) => add(new THREE.BoxGeometry(1.2, 2.6, 0.08), doorM, s * 0.6, 1.3, -Dp - 0.06));
  const blackout = document.createElement('div'); blackout.id = 'deep-black'; document.body.appendChild(blackout);
  deep.elev = {
    z: R.z + ez, light, blackout,
    setDoors: (u) => doors.forEach((d, i) => { d.position.x = (i ? 1 : -1) * (0.6 + u * 1.15); }),
    show: (f) => { const c = disp.getContext('2d'); c.fillStyle = '#0a0204'; c.fillRect(0, 0, 128, 48); c.fillStyle = '#ff2a3a'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f <= 1 ? '1F' : `B${f}`, 64, 26); dispTex.needsUpdate = true; },
  };
  deep.elev.show(1);
  deep.room = { screen, idle, idleTex, beam, dots, exit, haze, starPts, sx, sz };
  drawIdle(0);
  // Spots: the seat, and the way back up.
  citySpot({ x: R.x + sx, z: R.z + sz - 1.2, r: 1.5, label: () => (deep.seated ? '' : 'Press E to sit'), use: () => sitDeep(), active: () => city.inside === 'deep' && !deep.seated });
  citySpot({ x: R.x, z: R.z - Dp + 1, r: 1.6, label: () => 'Press E to ride the elevator back up', use: () => startAscent(), active: () => city.inside === 'deep' && !deep.seated });
  probeDeepVideos();
}

// What the screen shows with nothing playing: a slow pulse of violet, and a word.
function drawIdle(t) {
  const c = deep.room.idle.getContext('2d'), w = 640, h = 270;
  c.fillStyle = '#05020a'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const v = Math.random() * 40; c.fillStyle = `rgba(${v + 30},${v * 0.4},${v + 60},.35)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  const p = 0.5 + 0.5 * Math.sin(t * 0.8);
  c.fillStyle = `rgba(190,140,255,${0.25 + p * 0.45})`; c.font = 'bold 54px "Yu Gothic", serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('おかえり', w / 2, h / 2 - 12);
  c.fillStyle = `rgba(190,140,255,${0.15 + p * 0.2})`; c.font = '16px monospace'; c.fillText(deep.seated ? 'LOAD A TAPE' : 'B215', w / 2, h / 2 + 42);
  for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, y, w, 1); }
  deep.room.idleTex.needsUpdate = true;
}

function updateDeep(dt) {
  const Rm = deep.room;
  if (!Rm) return;
  deep.t += dt;
  const t = deep.t;
  if (!deep.video || deep.video.paused) { if (Math.floor(t * 8) !== deep.lastIdle) { deep.lastIdle = Math.floor(t * 8); if (!deep.video) drawIdle(t); } }
  Rm.beam.material.opacity = deep.video && !deep.video.paused ? 0.035 + Math.random() * 0.008 : 0.016;
  Rm.dots.forEach((d, i) => { const k = Math.floor(i / 2), wave = Math.max(0, 1 - Math.abs(((t * 4) % 16) - k) / 2); d.material.color.setRGB(0.5 + wave * 0.9, 0.25 + wave * 0.5, 1 + wave * 0.6); });
  Rm.exit.visible = !(Math.sin(t * 17) > 0.95 || (t % 11) < 0.12);
  Rm.haze.rotation.y = t * 0.01;
  if (deep.seated) {
    // Seated: she stays put, and anything but the remote's keys gets her up.
    player.pos.y = CITY.y + 0.2;
  }
}

/* ---------- The seat and the remote ---------- */
function sitDeep() {
  const R = ROOMS.deep, Rm = deep.room;
  player.pos.set(R.x + Rm.sx, CITY.y + 0.2, R.z + Rm.sz + 0.05);
  player.yaw = player.bodyYaw = 0;
  survival.sitting = { fire: { x: R.x, z: R.z + R.d / 2 }, blend: 0, deep: true };
  deep.seated = true;
  Sfx.thud && Sfx.thud();
  openRemote();
}
function standUpDeep() {
  deep.seated = false;
  if (survival.sitting && survival.sitting.deep) survival.sitting = null;
  closeRemote();
}

const DEEP_DIR = 'videos/';
function probeDeepVideos() {
  if (deep.probed) return;
  deep.probed = true;
  const tryVid = (src) => new Promise((res) => { const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.onloadedmetadata = () => { v.removeAttribute('src'); v.load(); res(true); }; v.onerror = () => res(false); v.src = src; });
  (async () => {
    let misses = 0;
    for (let n = 1; n <= 300 && misses < 2; n++) {
      let ok = false;
      for (const ext of ['mp4', 'webm', 'mov', 'm4v']) { const src = `${DEEP_DIR}${n}.${ext}`; if (await tryVid(src)) { deep.list.push({ src, name: `${n}.${ext}` }); ok = true; break; } }
      misses = ok ? 0 : misses + 1;
    }
    renderRemote();
  })();
}

function openRemote() {
  let el = $('remote');
  if (!el) {
    el = document.createElement('div'); el.id = 'remote';
    document.body.appendChild(el);
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      e.preventDefault();
      remoteAction(b.dataset.r, b.dataset.i);
    });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-rpick]')) { for (const f of e.target.files) deep.list.push({ src: URL.createObjectURL(f), name: f.name }); renderRemote(); if (!deep.video && deep.list.length) playDeep(deep.list.length - e.target.files.length); } });
    el.addEventListener('mousedown', (e) => e.stopPropagation());
  }
  el.classList.remove('hidden');
  el.classList.remove('rise'); void el.offsetWidth; el.classList.add('rise');
  pointerWasLocked = false;
  document.exitPointerLock();
  renderRemote();
}
function closeRemote() { const el = $('remote'); if (el) el.classList.add('hidden'); }
function renderRemote() {
  const el = $('remote');
  if (!el || el.classList.contains('hidden')) return;
  const v = deep.video;
  el.innerHTML = `<div class="rm-top"><i></i><b>B215</b><span>${v ? (v.paused ? 'PAUSED' : 'PLAYING') : 'NO TAPE'}</span></div>
    <div class="rm-screen">${deep.list.length ? deep.list.map((x, i) => `<button data-r="play" data-i="${i}" class="${v && deep.idx === i ? 'on' : ''}">${String(i + 1).padStart(2, '0')} · ${x.name.replace(/[<>&"]/g, '')}</button>`).join('') : '<p>No tapes.<br>Put videos in the <b>videos</b> folder (1.mp4, 2.mp4...) or load them.</p>'}</div>
    <div class="rm-pad">
      <button data-r="prev" title="Previous">⏮</button><button data-r="toggle" class="big" title="Play / pause (Space)">${v && !v.paused ? '❚❚' : '▶'}</button><button data-r="next" title="Next">⏭</button>
      <button data-r="back" title="Back 10 s">-10</button><button data-r="loop" class="${deep.loop ? 'on' : ''}" title="Loop">⟲</button><button data-r="fwd" title="Forward 10 s">+10</button>
      <button data-r="vdown" title="Quieter">−</button><span class="vol">${Math.round((deep.vol ?? 1) * 100)}</span><button data-r="vup" title="Louder">+</button>
    </div>
    <label class="rm-load">⏏ Load videos…<input type="file" accept="video/*" multiple data-rpick></label>
    <button data-r="stand" class="rm-stand">Stand up</button>`;
}
function remoteAction(a, i) {
  const v = deep.video;
  keypadBeep(1600, 0.02, 0.015);
  if (a === 'play') playDeep(+i);
  else if (a === 'toggle') { if (!v) { if (deep.list.length) playDeep(0); } else if (v.paused) v.play().catch(() => {}); else v.pause(); }
  else if (a === 'next' && deep.list.length) playDeep((deep.idx + 1) % deep.list.length);
  else if (a === 'prev' && deep.list.length) playDeep((deep.idx - 1 + deep.list.length) % deep.list.length);
  else if (a === 'back' && v) v.currentTime = Math.max(0, v.currentTime - 10);
  else if (a === 'fwd' && v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
  else if (a === 'loop') { deep.loop = !deep.loop; if (v) v.loop = deep.loop; }
  else if (a === 'vup' || a === 'vdown') { deep.vol = clamp((deep.vol ?? 1) + (a === 'vup' ? 0.1 : -0.1), 0, 1); if (v) v.volume = deep.vol; }
  else if (a === 'stand') { standUpDeep(); lockPointer(); return; }
  setTimeout(renderRemote, 30);
}
// The tape goes on the big screen; the drone sinks away under it.
function playDeep(i) {
  const item = deep.list[i];
  if (!item) return;
  deep.idx = i;
  if (!deep.video) {
    const v = document.createElement('video'); v.playsInline = true; v.crossOrigin = 'anonymous';
    v.onended = () => { if (!deep.loop && deep.list.length > 1) playDeep((deep.idx + 1) % deep.list.length); else renderRemote(); };
    v.onplay = v.onpause = () => renderRemote();
    deep.video = v;
    deep.tex = new THREE.VideoTexture(v); deep.tex.colorSpace = THREE.SRGBColorSpace;
  }
  const v = deep.video;
  v.src = item.src; v.loop = !!deep.loop; v.volume = deep.vol ?? 1;
  v.onloadedmetadata = () => {
    // Fit the picture to the screen without stretching it.
    const sw = 20, sh = 8.4, a = v.videoWidth / v.videoHeight || 16 / 9;
    const s = deep.room.screen;
    s.material.map = deep.tex; s.material.needsUpdate = true;
    s.scale.set(a > sw / sh ? 1 : (sh * a) / sw, a > sw / sh ? (sw / a) / sh : 1, 1);
  };
  v.play().catch(() => {});
  if (deep.drone && Sfx.ctx) deep.drone.g.gain.setTargetAtTime(0.12, Sfx.ctx.currentTime, 0.6);
  renderRemote();
}
function stopDeepVideo() {
  const v = deep.video;
  if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  deep.video = null;
  if (deep.room) { const s = deep.room.screen; s.material.map = deep.room.idleTex; s.material.needsUpdate = true; s.scale.set(1, 1, 1); }
}
// Space plays and pauses from the seat; walking off stands her up.
addEventListener('keydown', (e) => {
  if (!deep.seated) return;
  if (e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); remoteAction('toggle'); }
  else if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) standUpDeep();
}, true);

// From the seat, clicking the screen mustn't grab the mouse back: the remote needs it.
addEventListener('mousedown', (e) => { if (deep.seated && e.target === canvas) { e.stopImmediatePropagation(); } }, true);
