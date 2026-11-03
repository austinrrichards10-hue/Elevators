// Teto, the other survivor, found off the wreck's nose still strapped into her seat, out
// cold. Nothing Miku does wakes her. But build a fire beside her, and once Miku has gone off
// and found somewhere else in the Hollow, Teto comes round on her own and wanders off: back
// at the wreck there's only her empty seat, her satchel and her footprints into the trees.

/* ---------- Config ---------- */
const CRIMSON = {
  warmRadius: 7, // a fire this close to her seat warms her
  sites: [1, 2], // how many more sites Miku finds, after the fire, before Teto goes
  away: 45, // she only goes while Miku is at least this far off
  notice: 9, // how close Miku has to come back to see she's gone
  prints: 40, // footprints she leaves
};

// What's said about her, in case the story's words for her are missing.
const CRIMSON_LINES = {
  check: 'She\'s breathing, but she won\'t react to my presence.',
  checkWarm: 'She\'s warmer now. Still breathing. Still not reacting to me.',
  fire: 'There. Get warm, Teto. Then wake up.',
  gone: 'Her seat\'s empty. Footprints, heading off into the trees.',
};

// What spills from her satchel by the seat.
const CRIMSON_SATCHEL = ['note:crimson-diary', 'note:flight-manifest', 'chocolate', 'chocolate', 'warmer', 'warmer', 'scarf'];

/* ---------- State ---------- */
const crimson = {
  phase: 'asleep', // 'asleep', 'warmed' once a fire burns by her, then 'gone'
  sitesLeft: 0, // sites still to find, once she's warmed, before she goes
  noticed: false, // whether Miku has come back and seen the empty seat
  fell: null, // { x, z } where her seat is, once she's gone
  satchel: [], // { id, handle, taken } for what lies there
  marker: [{ x: 0, z: 0, kind: 'crimson', label: 'Teto\'s empty seat' }],
};
let crimsonProps = null;
const crimsonTmp = new THREE.Vector3();

/* ---------- Her lines ---------- */
function crimsonText(key) {
  const text = LORE.crimson && LORE.crimson[key];
  return typeof text === 'string' && text ? text : CRIMSON_LINES[key];
}

function crimsonList(key) {
  const list = LORE.crimson && LORE.crimson[key];
  if (Array.isArray(list) && list.length) return list;
  if (typeof list === 'string' && list) return [list];
  return [CRIMSON_LINES[key]];
}

// A caption in her voice, which pops in afresh with every line.
function crimsonSay(text, cls = 'crimson') {
  caption(text, cls);
  const el = $('cine-caption');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

/* ---------- Sounds ---------- */
// Vowel formants for her voice: [frequency, Q, gain].
const CRIMSON_VOWELS = {
  a: [[850, 5, 1], [1300, 6, 0.6], [2900, 8, 0.25]],
  e: [[520, 5, 1], [1900, 7, 0.55], [2700, 8, 0.25]],
  i: [[330, 5, 0.9], [2400, 8, 0.6], [3200, 9, 0.25]],
  o: [[560, 5, 1], [950, 6, 0.6], [2600, 8, 0.15]],
  u: [[380, 5, 1], [850, 6, 0.4], [2500, 8, 0.1]],
  m: [[280, 4, 1], [1200, 6, 0.08]],
  scream: [[1150, 4, 1], [1750, 5, 0.7], [3100, 7, 0.35]],
};

Object.assign(Sfx, {
  // A voice: a buzzy tone shaped by vowel formants, with a breath of noise. `points` are
  // [seconds, pitch], starting `delay` seconds from now. A held voice keeps going until
  // its handle's stop(), which cuts it off dead.
  crimsonVoice(points, level, { delay = 0, vowel = 'a', vibrato = 0, rate = 6, breath = 0.15, hold = false } = {}) {
    if (!this.ctx) return { stop() {} };
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const end = points[points.length - 1][0];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + Math.min(0.04, end * 0.3));
    if (!hold) {
      out.gain.setValueAtTime(level, t + end * 0.7);
      out.gain.exponentialRampToValueAtTime(0.0001, t + end);
    }
    out.connect(this.master);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(points[0][1], t);
    for (const [at, freq] of points.slice(1)) osc.frequency.linearRampToValueAtTime(freq, t + at);
    const nodes = [osc];
    if (vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const depth = ctx.createGain();
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(osc.frequency);
      nodes.push(lfo);
    }
    for (const [freq, q, gain] of CRIMSON_VOWELS[vowel]) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain * 3;
      osc.connect(filter).connect(g).connect(out);
    }
    if (breath) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.value = breath;
      src.connect(filter).connect(g).connect(out);
      nodes.push(src);
    }
    const stopAt = t + (hold ? 10 : end + 0.05);
    for (const node of nodes) { node.start(t); node.stop(stopAt); }
    return {
      stop() {
        const now = ctx.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + 0.025);
        for (const node of nodes) { try { node.stop(now + 0.05); } catch { /* already stopped */ } }
      },
    };
  },
  // Gabble in her voice, roughly as long as the line, higher and louder when she shouts.
  crimsonChatter(text) {
    const shout = /[!?]/.test(text) || /[A-Z]{3}/.test(text);
    const count = clamp(Math.round(text.length / 3.4), 3, 10);
    const vowels = ['a', 'e', 'i', 'o', 'a', 'e'];
    let at = 0;
    for (let i = 0; i < count; i++) {
      const len = 0.07 + Math.random() * 0.06;
      const pitch = (shout ? 520 : 420) * (0.9 + Math.random() * 0.25) * (i === count - 1 && /\?/.test(text) ? 1.25 : 1);
      this.crimsonVoice([[0, pitch], [len, pitch * (0.92 + Math.random() * 0.2)]], shout ? 0.16 : 0.11, { delay: at, vowel: vowels[Math.floor(Math.random() * vowels.length)], breath: 0.08 });
      at += len + 0.015 + Math.random() * 0.03;
    }
  },
  crimsonMmm() { this.crimsonVoice([[0, 290], [0.3, 320], [0.65, 265]], 0.12, { vowel: 'm', breath: 0.04 }); },
  // The sharp breath as she jolts awake, and a cartoon spring under it.
  crimsonGasp() {
    this.burst(0.28, 2600, 1.2, 0.22, 'bandpass');
    this.crimsonVoice([[0, 620], [0.13, 1300], [0.22, 1150]], 0.2, { vowel: 'i', breath: 0.5 });
    this.glide([[0, 170], [0.12, 560], [0.38, 430]], 0.06, 'sine', 40);
  },
  // Revving up: legs going like wheels.
  crimsonZip() { this.glide([[0, 180], [0.32, 880]], 0.04, 'square'); this.burst(0.35, 900, 1, 0.18, 'bandpass'); },
  // A long, wobbling scream, held until it's cut short.
  crimsonScream() {
    return this.crimsonVoice([[0, 820], [0.16, 1180], [0.5, 1120], [1.2, 1210], [2, 1150], [4, 1100], [9, 980]], 0.1, { vowel: 'scream', vibrato: 34, rate: 8.5, breath: 0.3, hold: true });
  },
  crimsonRustle(level = 1) { this.burst(0.3 + Math.random() * 0.2, 1100 + Math.random() * 600, 0.8, 0.16 * level, 'bandpass'); },
});


/* ---------- Props ---------- */
// Her satchel, flap thrown open, with her phone beside it, and the footprints she leaves.
function buildCrimsonProps() {
  const leather = new THREE.MeshStandardMaterial({ color: 0xf2a7c3, roughness: 0.5 });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0xf6e7d8, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.8, roughness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xc9b6ff, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.15, metalness: 0.4 });
  const satchel = new THREE.Group();
  const part = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    satchel.add(mesh);
    return mesh;
  };
  // Tipped on its back, the flap open on the snow behind it.
  part(new THREE.BoxGeometry(0.34, 0.11, 0.22), leather, 0, 0.055, 0, 0, 0, 0.05);
  part(new THREE.BoxGeometry(0.34, 0.014, 0.16), leather, 0, 0.012, -0.19, 0.12);
  part(new THREE.BoxGeometry(0.05, 0.02, 0.03), gold, 0, 0.018, -0.27);
  part(new THREE.TorusGeometry(0.27, 0.012, 6, 28, Math.PI * 1.25), strapMat, 0.05, 0.012, 0.16, Math.PI / 2, 0, 0.6);
  // Her phone, face down, in a glittery lilac case.
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.01, 0.158), pink));
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.148), glass);
  screen.position.y = -0.005;
  phone.add(screen);
  phone.position.set(0.42, 0.008, 0.2);
  phone.rotation.set(0, 0.7, Math.PI);
  satchel.add(phone);
  satchel.visible = false;
  scene.add(satchel);

  const prints = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5f6c8e, transparent: true, opacity: 0.42, depthWrite: false }),
    CRIMSON.prints,
  );
  prints.frustumCulled = false;
  prints.count = 0;
  scene.add(prints);
  return { satchel, prints, dummy: new THREE.Object3D() };
}

function crimsonPrint(x, z, yaw) {
  const { prints, dummy } = crimsonProps;
  if (prints.count >= CRIMSON.prints) return;
  dummy.position.set(x, groundHeight(x, z) + 0.035, z);
  dummy.rotation.set(0, yaw, 0);
  dummy.scale.set(0.15, 1, 0.3);
  dummy.updateMatrix();
  prints.setMatrixAt(prints.count, dummy.matrix);
  prints.count++;
  prints.instanceMatrix.needsUpdate = true;
}

// What she leaves: her satchel dropped by the seat, what spilled from it, and her
// footprints wandering off into the trees on the far side from the wreck.
function crimsonLeaveTrail() {
  const { satchel } = crimsonProps;
  const x = survivor.x, z = survivor.z;
  let yaw = Math.atan2(x - wreck.x, z - wreck.z) + (Math.random() - 0.5) * 1.2;
  const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const sx = x + side.x * 0.7, sz = z + side.z * 0.7;
  satchel.position.set(sx, groundHeight(sx, sz), sz);
  satchel.rotation.y = yaw + 2.4;
  satchel.visible = true;
  let px = x + Math.sin(yaw) * 0.8, pz = z + Math.cos(yaw) * 0.8;
  for (let i = 0; i < CRIMSON.prints; i++) {
    // She wanders, a little unsteady.
    yaw += Math.sin(i * 0.7) * 0.08 + (Math.random() - 0.5) * 0.1;
    px += Math.sin(yaw) * 0.42;
    pz += Math.cos(yaw) * 0.42;
    const off = (i % 2 ? 1 : -1) * 0.11;
    crimsonPrint(px + Math.cos(yaw) * off, pz - Math.sin(yaw) * off, yaw);
  }
  if (crimson.satchel.length) return;
  CRIMSON_SATCHEL.forEach((id, i) => {
    const a = yaw + 2 + i * 0.6, r = 0.9 + (i % 3) * 0.3;
    crimsonTmp.set(sx + Math.sin(a) * r, 0, sz + Math.cos(a) * r);
    pushOutOfColliders(crimsonTmp, 0.3);
    crimson.satchel.push({ id, handle: spawnWorldItem(id, crimsonTmp.x, crimsonTmp.z), taken: false });
  });
}

// A pickup by her seat crosses its item off, so the map stops pointing there once the
// satchel's empty.
function crimsonTookItem(id) {
  if (crimson.phase !== 'gone' || !crimson.fell) return;
  if (Math.hypot(crimson.fell.x - player.pos.x, crimson.fell.z - player.pos.z) > 8) return;
  const item = crimson.satchel.find((i) => !i.taken && i.id === id);
  if (item) item.taken = true;
}

/* ---------- Waking and wandering off ---------- */
// The warmth reaches her. She'll go once Miku has found another site or two and is away.
function warmCrimson() {
  if (crimson.phase !== 'asleep') return;
  crimson.phase = 'warmed';
  crimson.sitesLeft = CRIMSON.sites[0] + Math.floor(Math.random() * (CRIMSON.sites[1] - CRIMSON.sites[0] + 1));
}

// She's gone: the seat stays, empty, and the rest is left in the snow.
function crimsonVanish() {
  if (crimson.phase === 'gone') return;
  crimson.phase = 'gone';
  if (survivor.avatar) survivor.avatar.setVisible(false);
  crimsonLeaveTrail();
  crimson.fell = { x: survivor.x, z: survivor.z };
  crimson.marker[0].x = survivor.x;
  crimson.marker[0].z = survivor.z;
  emitGame('crimsonGone', { x: survivor.x, z: survivor.z });
}

/* ---------- Setup and each frame ---------- */
function initCrimson() {
  crimsonProps = buildCrimsonProps();
  addInteractable({
    get x() { return survivor.x; },
    get z() { return survivor.z; },
    r: 2.4,
    label: 'Press E to check on her',
    active: () => crimson.phase !== 'gone',
    use: () => showNote(crimsonText(crimson.phase === 'warmed' ? 'checkWarm' : 'check')),
  });
  // A fire close enough warms her.
  onGame('campfire', (fire) => {
    if (crimson.phase !== 'asleep' || !survivor.avatar) return;
    if (Math.hypot(fire.x - survivor.x, fire.z - survivor.z) > CRIMSON.warmRadius) return;
    warmCrimson();
    say(crimsonText('fire'), 3);
  });
  onGame('siteDiscovered', () => { if (crimson.phase === 'warmed' && crimson.sitesLeft > 0) crimson.sitesLeft--; });
  onGame('pickup', (id) => crimsonTookItem(id));
  onGame('noteRead', (noteId) => crimsonTookItem(`note:${noteId}`));
  MAP_MARKERS.push(() => (crimson.phase === 'gone' && crimson.noticed && crimson.satchel.some((i) => !i.taken) ? crimson.marker : []));
}

function resetCrimson() {
  for (const item of crimson.satchel) if (item.handle) removeWorldItem(item.handle);
  crimson.satchel.length = 0;
  Object.assign(crimson, { phase: 'asleep', sitesLeft: 0, noticed: false, fell: null });
  if (crimsonProps) {
    crimsonProps.satchel.visible = false;
    crimsonProps.prints.count = 0;
  }
  const c = survivor.avatar;
  if (!c) return;
  placeSurvivor();
  c.setVisible(true);
}

function updateCrimson(dt) {
  const c = survivor.avatar;
  if (!c) return;
  const d = Math.hypot(survivor.x - player.pos.x, survivor.z - player.pos.z);
  if (crimson.phase !== 'gone') {
    // Slow, shallow breaths, for anyone close enough to see them.
    if (d < 40) c.chest.rotation.x = survivor.chestX + Math.sin(game.time * 1.3) * 0.02;
    // Warmed through, she slips away once Miku's found somewhere else and is out of sight.
    if (crimson.phase === 'warmed' && crimson.sitesLeft <= 0 && d > CRIMSON.away && showdown.stage === 'none') crimsonVanish();
  } else if (!crimson.noticed && d < CRIMSON.notice) {
    crimson.noticed = true;
    showNote(crimsonText('gone'));
    emitGame('crimsonNoticed');
  }
}
