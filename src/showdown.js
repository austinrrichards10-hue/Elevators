// Teto's ambush and the fight with her, and what comes after: the end of part one.
//
// Miku goes to climb into Varga's balloon and a burst of gunfire rips through the silk. Teto
// walks out of the trees, grabs her and throws her into the forest, and the fight plays out
// in a long clearing of its own (a stand-in for the forest, high above the real map so none
// of it can get in the way). Miku tears her twin tails off and they become a pair of blue
// flame swords. Teto fights with her drill hair: it fires like a gatling gun, and when Miku
// is knocked down it fires twin railgun beams she has to scramble clear of. At the end Teto
// flies up on her hair and burns the clearing white; Miku wakes by the ruined balloon,
// hurt, and green fairies heal her by a fire. She patches the balloon with pelts, climbs in,
// and that's the end of part one.

/* ---------- Config ---------- */
const SHOWDOWN = {
  arena: { y: 1400, half: 9, length: 74, start: -24, tetoStart: -12, fog: 0.0085 },
  teto: { hp: 1500, keep: [7, 13], walk: 3.4, dash: 11, reach: 0.55 },
  // Her gatling hair, by the stage of the fight (her health above 2/3, 1/3, and below).
  gatling: {
    aim: [0.8, 0.65, 0.55], fire: [1.5, 1.8, 2.1], rate: [11, 13, 15], turn: [0.45, 0.6, 0.78],
    cool: [2.6, 2.2, 1.85], speed: 30, spread: 0.03, damage: 6,
  },
  whip: { range: 2.4, windup: 0.42, damage: 10, every: 3.5 },
  knock: { hits: 5, charge: 1.3, need: 9, grow: 2, most: 15, laser: 36, laserGrow: 4 },
  sword: {
    reach: 2.7, arc: 1.5, strike: 0.3, spin: 0.46, damage: [16, 16, 26], open: 1.6,
    wave: { windup: 0.32, speed: 24, life: 1.5, damage: 34, radius: 1.4, cooldown: 2.6 },
  },
  finaleAt: 0.1,
  repair: { wolfpelt: 5, pelt: 10 },
  // Hair drill tips, in her head's space: where the bullets and beams come from.
  muzzles: [new THREE.Vector3(0.2, -0.1, -0.05), new THREE.Vector3(-0.2, -0.1, -0.05)],
};

const SHOWDOWN_LINES = {
  ambushA: 'Going somewhere?',
  ambushB: 'That balloon was MY ride out.',
  ambushC: 'Hold still. This is going to look AMAZING.',
  arrive: 'No balloon. No Varga. Just you, me and the trees.',
  swords: 'Ooh. She brought toys.',
  mikuSwords: 'You shot my balloon.',
  taunts: ['Dance for the camera!', 'Is that all you\'ve got?', 'Smile! You\'re trending!', 'Too slow!', 'Hold STILL!'],
  hurt: ['OW!', 'My HAIR!', 'Not the face!', 'Rude!', 'That one stung!'],
  knock: 'Down you go. Say goodnight!',
  dodged: 'Ugh! Stop ROLLING!',
  retry: 'Again? Fine. From the top!',
  finale: 'ENOUGH! Let\'s end this from up HERE!',
  fairyA: 'Please... don\'t let her get away with this.',
  fairyB: 'Mend the silk with what the forest gives you. Five wolves, and ten hares.',
  wake: 'Everything hurts. The balloon... I need a fire.',
  healed: 'I can feel my legs again. Five wolf pelts and ten hare pelts. Right.',
  repaired: 'Patched. It\'ll hold. It has to.',
};

/* ---------- State ---------- */
const showdown = {
  // 'none', 'ambush' (the scene at the balloon), 'fight', 'finale', 'buried', 'injured' (she
  // wakes hurt, until a fire), 'repair' (healed, gathering pelts), 'repaired', 'done'.
  stage: 'none',
  shortHair: false,
  hp: SHOWDOWN.teto.hp,
  hits: 0,
  knocks: 0,
  injured: false,
};

// The fight's moment to moment: Teto, the swords, the projectiles.
const fight = {
  teto: { pos: new THREE.Vector3(), yaw: 0, state: 'idle', t: 0, dur: 0, aim: new THREE.Vector3(), aimDir: new THREE.Vector3(), shotT: 0, muzzle: 0, walk: 0, dashT: 0, whipT: 0, target: new THREE.Vector3(), hurtT: 0, flash: 0 },
  swing: null, // { k, t, hit } while she's slashing
  combo: 0, comboT: 0, queued: false,
  waveCd: 0, waveT: -1,
  knocked: null, // { t, need, presses, dodged, done, at } while she's down
  invuln: 0,
  tauntT: 4,
  over: false,
};

let showdownKit = null;
let showdownScene = null;
const sdV = new THREE.Vector3(), sdW = new THREE.Vector3(), sdU = new THREE.Vector3(), sdQ = new THREE.Quaternion();
const SD_UP = new THREE.Vector3(0, 1, 0);

/* ---------- Words ---------- */
function showdownLine(key) {
  const v = SHOWDOWN_LINES[key];
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
}

// One of Teto's lines: a caption in a scene, the taunt line during the fight.
function tetoSays(text, seconds = 2) {
  if (!text) return;
  Sfx.crimsonChatter(text);
  if (game.state === 'scene') { crimsonSay(text); return; }
  const el = $('boss-taunt');
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(tetoSays.timer);
  tetoSays.timer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  gunshot() { this.burst(0.5, 900, 0.5, 1.1); this.burst(0.09, 3800, 0.8, 0.8, 'highpass'); this.tone(120, 40, 0.4, 0.6, 'square'); },
  gatling() { this.burst(0.05, 2600 + Math.random() * 600, 1.2, 0.22, 'bandpass'); this.tone(240, 90, 0.04, 0.08, 'square'); },
  bulletHiss() { this.burst(0.12, 5200, 1.5, 0.08, 'highpass'); },
  slash(k = 0) { this.burst(0.18, 1500 + k * 400, 0.9, 0.3, 'bandpass'); this.glide([[0, 520 + k * 90], [0.16, 260]], 0.06, 'sawtooth'); },
  swordHit() { this.burst(0.12, 900, 1.2, 0.5, 'bandpass'); this.tone(330, 110, 0.14, 0.25, 'triangle'); },
  heatWave() { this.burst(0.8, 600, 0.6, 0.5); this.glide([[0, 180], [0.6, 520]], 0.08, 'sawtooth', 9); },
  ignite() { this.burst(0.9, 1400, 0.6, 0.6, 'bandpass'); this.glide([[0, 140], [0.5, 700]], 0.1, 'sawtooth'); },
  railCharge() { this.glide([[0, 120], [1.3, 1800]], 0.1, 'sawtooth', 14); this.burst(1.3, 3000, 2, 0.08, 'bandpass'); },
  railFire() { this.burst(1.2, 400, 0.4, 1.2); this.tone(900, 60, 0.9, 0.5, 'sawtooth'); this.burst(0.3, 5000, 1, 0.5, 'highpass'); },
  jet() { return this.loop({ noise: 1, filter: 900, hum: 0.4, humFreq: 70 }); },
  fairyChime() {
    [[0, 1319], [0.18, 1568], [0.36, 1976], [0.6, 2637]].forEach(([at, f]) => setTimeout(() => this.tone(f, f * 0.995, 1.4, 0.04, 'sine'), at * 1000));
  },
});

/* ---------- Building things ---------- */
// A sword grown from one of her twin tails: three long tapered strands of teal hair twisted
// round each other, brightening to white-blue at the tip, bound at the hilt by one of her
// hair ties, with a core of blue flame along it.
function buildHairSword() {
  const group = new THREE.Group();
  const length = 1.0;
  const strand = (twist, width, color, phase) => {
    const rows = 18, pos = [], col = [], idx = [];
    const c0 = new THREE.Color(0x1f8f99), c1 = new THREE.Color(color), c2 = new THREE.Color(0xd8fbff);
    for (let i = 0; i <= rows; i++) {
      const u = i / rows;
      const w = width * (1 - u * 0.85) * (0.8 + 0.2 * Math.sin(u * 9 + phase));
      const a = u * twist + phase;
      const r = 0.012 * (1 - u * 0.6);
      const y = -u * length;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const ex = Math.cos(a + Math.PI / 2) * w, ez = Math.sin(a + Math.PI / 2) * w;
      pos.push(cx - ex, y, cz - ez, cx + ex, y, cz + ez);
      const c = c0.clone().lerp(c1, Math.min(1, u * 1.6)).lerp(c2, THREE.MathUtils.smoothstep(u, 0.7, 1));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  };
  group.add(strand(5.2, 0.026, 0x37c7cf, 0), strand(5.2, 0.022, 0x2fb3c0, 2.1), strand(5.2, 0.02, 0x4fd9de, 4.2));
  // The flame core, glowing through the bloom.
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.018, length * 0.95, 8, 1, true).translate(0, -length * 0.5, 0),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fd8ff).multiplyScalar(2.4), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  group.add(core);
  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.05, length, 10, 1, true).translate(0, -length * 0.5, 0),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a8cff).multiplyScalar(1.4), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  group.add(aura);
  // Her hair tie, square and dark, for the hilt.
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), new THREE.MeshBasicMaterial({ color: 0x2a2c33 }));
  tie.rotation.y = Math.PI / 4;
  group.add(tie);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 6, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8344f }));
  band.position.y = -0.03;
  group.add(band);
  group.userData = { length, core, aura };
  group.visible = false;
  return group;
}

// The clearing: a long strip of snow walled in by thick forest on three sides, open ahead,
// where the ruined balloon stands far off in the haze.
function buildArena() {
  const A = SHOWDOWN.arena;
  const group = new THREE.Group();
  group.position.set(0, A.y, 0);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TEX.snow.color, normalMap: TEX.snow.normal, roughnessMap: TEX.snow.rough, color: 0xf0f3fb }));
  ground.receiveShadow = true;
  group.add(ground);
  const kit = buildForestKit();
  const rand = seededRandom(4242);
  const per = kit.species.map(() => []);
  const occupied = [];
  const place = (x, z) => {
    if (occupied.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 1.6)) return;
    occupied.push([x, z]);
    let pick = rand(), k = 0;
    for (; k < kit.species.length - 1; k++) { pick -= kit.species[k].weight; if (pick <= 0) break; }
    const s = kit.species[k];
    const size = lerp(s.size[0], s.size[1], rand());
    per[k].push({ x, y: 0, z, ry: rand() * 6.28, rx: 0, rz: 0, sx: size, sy: size * (0.9 + rand() * 0.3), sz: size, tint: new THREE.Color().setScalar(lerp(s.tint[0], s.tint[1], rand())) });
  };
  const back = -A.length / 2;
  for (let i = 0; i < 2600; i++) {
    const x = (rand() - 0.5) * 120, z = back - 40 + rand() * 260;
    const inside = Math.abs(x) < A.half + 1.2 && z > back - 1.2;
    // Open ahead of the clearing, in a widening view down to the balloon.
    const ahead = z > A.length / 2 - 4 && Math.abs(x) < A.half + (z - A.length / 2) * 0.35;
    if (inside || ahead) continue;
    // Thickest close to the clearing.
    const edge = Math.min(Math.abs(Math.abs(x) - A.half), z < back ? back - z : 99);
    if (rand() > 1.1 - edge / 40) continue;
    place(x, z);
  }
  kit.species.forEach((s, k) => {
    if (!per[k].length) return;
    const bark = makeInstances(s.geo.bark, s.bark, per[k], true, true);
    if (bark) group.add(bark);
    if (s.leaves) { const leaves = makeInstances(s.geo.boughs, s.leaves, per[k], true, true); if (leaves) group.add(leaves); }
  });
  group.visible = false;
  scene.add(group);
  return group;
}

// A pool of glowing streaks: Teto's bullets.
function buildBullets(count) {
  const geo = new THREE.CylinderGeometry(0.022, 0.022, 0.55, 6).rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5c8a).multiplyScalar(2.2) });
  const list = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    list.push({ mesh, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 });
  }
  return list;
}

// A beam: a glowing cylinder from one point to another, with a brighter core.
function buildBeam(color, radius) {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 20, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, 1, 14, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  group.add(outer, core);
  group.visible = false;
  scene.add(group);
  return group;
}

function aimBeam(beam, from, to, width = 1) {
  beam.position.copy(from);
  beam.lookAt(to);
  beam.scale.set(width, width, from.distanceTo(to));
  beam.visible = true;
}

function glowOrb(color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(color).multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sprite.scale.setScalar(size);
  sprite.visible = false;
  scene.add(sprite);
  return sprite;
}

function buildShowdownDom() {
  const hud = $('hud');
  const bar = document.createElement('div');
  bar.id = 'boss-bar';
  bar.className = 'hidden';
  bar.innerHTML = '<p class="boss-name"><span class="boss-kicker">Ambush</span><span class="boss-title">Teto</span></p><div class="bar boss-health"><i class="boss-lag"></i><i class="boss-fill"></i><b class="boss-tick" style="left:66%"></b><b class="boss-tick" style="left:33%"></b><b class="boss-tick" style="left:10%"></b></div>';
  const taunt = document.createElement('div');
  taunt.id = 'boss-taunt';
  const hint = document.createElement('div');
  hint.id = 'boss-hint';
  hint.className = 'hidden';
  hint.innerHTML = '<p>Mash SPACE to roll clear!</p><div class="boss-mash"><i></i></div>';
  const wave = document.createElement('div');
  wave.id = 'sword-wave';
  wave.className = 'hidden';
  wave.innerHTML = '<kbd>RMB</kbd> Heat wave <i></i>';
  hud.append(bar, taunt, hint, wave);
  const fade = document.createElement('div');
  fade.id = 'boss-fade';
  document.body.insertBefore(fade, $('cine'));
  const end = document.createElement('section');
  end.id = 'end-part';
  end.className = 'screen hidden';
  end.innerHTML = '<h2>END PART 1</h2><p class="tag">Teto is still out there. So is the way home.</p><div class="title-actions"><button id="end-part-menu">Main menu</button></div>';
  document.body.appendChild(end);
  $('end-part-menu').addEventListener('click', () => { end.classList.add('hidden'); toMainMenu(); });
}

function buildShowdownKit() {
  const teto = createAvatar(scene, 'crimson');
  teto.setVisible(false);
  const swords = [buildHairSword(), buildHairSword()];
  const flames = buildPuffs(160, 0x5ab4ff);
  flames.group.children[0].material.uniforms.diffuse.value.multiplyScalar(2);
  scene.add(flames.group);
  const sparks = buildPuffs(80, 0xff7aa0);
  sparks.group.children[0].material.uniforms.diffuse.value.multiplyScalar(2);
  scene.add(sparks.group);
  const jets = buildPuffs(120, 0xffa070);
  jets.group.children[0].material.uniforms.diffuse.value.multiplyScalar(2);
  scene.add(jets.group);
  const smoke = buildPuffs(60, 0x6d6670);
  scene.add(smoke.group);
  // The heat wave: a crescent of white-blue fire.
  const waveMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 8, 32, Math.PI * 0.9).rotateX(Math.PI / 2).rotateY(Math.PI * 0.05 + Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe6ff).multiplyScalar(2.4), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  waveMesh.visible = false;
  scene.add(waveMesh);
  // Laser sights from her drills while she aims.
  const sightMat = new THREE.LineBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, fog: false });
  const sights = SHOWDOWN.muzzles.map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), sightMat);
    line.visible = false;
    line.frustumCulled = false;
    scene.add(line);
    return line;
  });
  const fairyMat = new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(0x8dff9a).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const fairies = Array.from({ length: 14 }, (_, i) => {
    const s = new THREE.Sprite(fairyMat);
    s.scale.setScalar(0.16);
    s.visible = false;
    scene.add(s);
    return { sprite: s, phase: i * 0.9, r: 0.6 + Math.random() * 0.9, h: 0.4 + Math.random() * 1.3, speed: 1.4 + Math.random() * 1.4 };
  });
  // The snow that covers her, a soft white mound that grows over her.
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 1 }));
  mound.visible = false;
  scene.add(mound);
  return {
    teto, swords, flames, sparks, jets, smoke, waveMesh, sights, fairies, mound,
    arena: buildArena(),
    bullets: buildBullets(90),
    rails: [buildBeam(0xff4d7a, 0.35), buildBeam(0xff4d7a, 0.35)],
    giant: buildBeam(0xff6a9a, 3.2),
    orbs: [glowOrb(0xff4d7a, 0.4), glowOrb(0xff4d7a, 0.4)],
    bigOrb: glowOrb(0xff86b0, 1),
    holes: [],
  };
}

/* ---------- Helpers ---------- */
function arenaActive() {
  return showdown.stage === 'fight' || (showdown.stage === 'ambush' && !!showdownScene && showdownScene.inArena) || showdown.stage === 'finale';
}

// A point in the arena, from its own coordinates (x across, z along, y up from the snow).
function arenaPoint(out, x, y, z) {
  return out.set(x, SHOWDOWN.arena.y + y, z);
}

function tetoMuzzle(i, out) {
  return showdownKit.teto.head.localToWorld(out.copy(SHOWDOWN.muzzles[i]));
}

function tetoChest(out) {
  return out.copy(fight.teto.pos).add(sdU.set(0, 1.0, 0));
}

function mikuChest(out) {
  return out.copy(player.pos).add(sdU.set(0, 1.0, 0));
}

function fightStage() {
  const f = showdown.hp / SHOWDOWN.teto.hp;
  return f > 2 / 3 ? 0 : f > 1 / 3 ? 1 : 2;
}

/* ---------- Teto's body ---------- */
// Poses her: standing, walking or running on the spot she's at, and her arms by `mode`.
function poseTeto(dt, mode = 'idle', look = null, extra = {}) {
  const T = showdownKit.teto, t = fight.teto;
  T.root.position.copy(t.pos);
  T.root.position.y += extra.lift || 0;
  T.root.rotation.set(0, t.yaw, 0);
  const speed = extra.speed || 0;
  t.walk += dt * (2.2 + speed * 1.8);
  const stride = Math.min(1, speed / 3);
  const s = Math.sin(t.walk);
  T.hips.position.y = T.dims.hips - Math.abs(s) * 0.02 * stride;
  T.hips.rotation.set(0, 0, 0);
  T.chest.rotation.set(mode === 'pant' ? 0.45 : 0.05 * stride, 0, 0);
  T.legL.thigh.rotation.set(mode === 'fly' ? 0.2 : -s * 0.6 * stride, 0, 0.04);
  T.legR.thigh.rotation.set(mode === 'fly' ? 0.35 : s * 0.6 * stride, 0, -0.04);
  T.legL.shin.rotation.set(mode === 'fly' ? 0.5 : Math.max(0, s) * 0.9 * stride + (mode === 'pant' ? 0.4 : 0), 0, 0);
  T.legR.shin.rotation.set(mode === 'fly' ? 0.7 : Math.max(0, -s) * 0.9 * stride + (mode === 'pant' ? 0.4 : 0), 0, 0);
  // Her head turns to whatever she's watching.
  let headY = 0, headX = mode === 'pant' ? -0.35 : 0;
  if (look) {
    const want = Math.atan2(look.x - t.pos.x, look.z - t.pos.z) - t.yaw;
    headY = clamp(Math.atan2(Math.sin(want), Math.cos(want)), -1, 1);
    headX = clamp(-Math.atan2(look.y - (t.pos.y + 1.4), Math.hypot(look.x - t.pos.x, look.z - t.pos.z)), -0.6, 0.6);
  }
  T.head.rotation.set(headX, headY, 0);
  T.root.updateMatrixWorld(true);
  const sh = T.armL.upper.position;
  const target = (side, x, y, z) => sdV.set(side * Math.abs(sh.x) + x, sh.y + y, z);
  if ((mode === 'point' || mode === 'grab') && look) {
    // Her right arm out at whatever she aims at, the left on her hip.
    T.chest.worldToLocal(sdW.copy(look));
    const reach = mode === 'grab' ? 0.42 : 0.5;
    sdW.sub(T.armR.upper.position).setLength(reach).add(T.armR.upper.position);
    solveArm(T.armR, sdW, POLE_R);
    solveArm(T.armL, target(1, 0.08, -0.42, 0.05), POLE_L);
  } else if (mode === 'rail' || mode === 'fly') {
    // Arms flung back and out, bracing as the hair does the work.
    solveArm(T.armL, target(1, 0.25, -0.25, -0.15), POLE_L);
    solveArm(T.armR, target(-1, -0.25, -0.25, -0.15), POLE_R);
  } else if (mode === 'pant') {
    solveArm(T.armL, target(1, 0.0, -0.5, 0.25), POLE_L);
    solveArm(T.armR, target(-1, 0.0, -0.5, 0.25), POLE_R);
  } else if (mode === 'whip') {
    const u = extra.u || 0;
    solveArm(T.armL, target(1, 0.3 * u, 0.1 * u - 0.35, 0.1), POLE_L);
    solveArm(T.armR, target(-1, -0.3 * u, 0.1 * u - 0.35, 0.1), POLE_R);
  } else {
    const swing = Math.sin(t.walk) * 0.12 * stride;
    solveArm(T.armL, target(1, 0.05, -0.44, swing), POLE_L);
    solveArm(T.armR, target(-1, -0.05, -0.44, -swing), POLE_R);
  }
  T.armL.hand.quaternion.identity();
  T.armR.hand.quaternion.identity();
  T.simulate(dt);
}

/* ---------- Miku's swords ---------- */
function showSwords(on) {
  const [a, b] = showdownKit.swords;
  if (on) {
    avatar.armL.hand.add(a);
    avatar.armR.hand.add(b);
    for (const s of [a, b]) { s.position.set(0, -0.07, 0.02); s.rotation.set(0, 0, 0); s.visible = true; }
  } else {
    a.visible = b.visible = false;
  }
  bowModel.group.visible = !on;
  $('sword-wave').classList.toggle('hidden', !on);
}

function setShortHair(on) {
  showdown.shortHair = on;
  if (avatar) avatar.tailsCut = on;
}

// The sword stance and strikes: arms laid over whatever poseAvatar did (game.js).
function poseSwordArms() {
  const { armL, armR } = avatar;
  const sh = armL.upper.position;
  const target = (side, x, y, z) => sdV.set(side * Math.abs(sh.x) + x, sh.y + y, z);
  const sw = fight.swing;
  if (sw) {
    const u = clamp(sw.t / sw.dur, 0, 1), e = smooth(u);
    if (sw.k === 0) {
      solveArm(armR, target(-1, lerp(-0.25, 0.35, e), lerp(0.25, -0.35, e), lerp(0.05, 0.45, Math.sin(e * Math.PI))), POLE_R);
      solveArm(armL, target(1, 0.12, -0.38, 0.22), POLE_L);
    } else if (sw.k === 1) {
      solveArm(armL, target(1, lerp(0.25, -0.35, e), lerp(0.25, -0.35, e), lerp(0.05, 0.45, Math.sin(e * Math.PI))), POLE_L);
      solveArm(armR, target(-1, -0.12, -0.38, 0.22), POLE_R);
    } else {
      // Arms flung wide for the spin.
      solveArm(armL, target(1, 0.42, -0.05, 0.1), POLE_L);
      solveArm(armR, target(-1, -0.42, -0.05, 0.1), POLE_R);
    }
  } else if (fight.waveT >= 0) {
    // Swords crossed, then thrown open to loose the wave.
    const u = clamp(fight.waveT / SHOWDOWN.sword.wave.windup, 0, 1);
    solveArm(armL, target(1, lerp(-0.12, 0.3, u), lerp(0.15, -0.05, u), lerp(0.3, 0.42, u)), POLE_L);
    solveArm(armR, target(-1, lerp(0.12, -0.3, u), lerp(0.15, -0.05, u), lerp(0.3, 0.42, u)), POLE_R);
  } else {
    // Ready: low and forward, blades angled out.
    const bob = Math.sin(game.time * 2.2) * 0.01;
    solveArm(armL, target(1, 0.1, -0.36 + bob, 0.26), POLE_L);
    solveArm(armR, target(-1, -0.1, -0.36 + bob, 0.26), POLE_R);
  }
  armL.hand.quaternion.identity();
  armR.hand.quaternion.identity();
}

// Blue flame licking along both blades, more of it mid-strike.
function swordFlames(dt) {
  const k = showdownKit;
  const hot = fight.swing || fight.waveT >= 0 ? 3 : 1;
  for (const sword of k.swords) {
    if (!sword.visible) continue;
    for (let i = 0; i < hot; i++) {
      const u = Math.random();
      sword.localToWorld(sdV.set((Math.random() - 0.5) * 0.04, -u * sword.userData.length, (Math.random() - 0.5) * 0.04));
      k.flames.emit(sdV, sdW.set((Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3), { life: 0.32, size: 0.1 + (1 - u) * 0.05, grow: 1.2, alpha: 0.85 });
    }
    sword.userData.core.material.opacity = 0.7 + Math.sin(game.time * 23 + sword.id) * 0.15;
  }
}

/* ---------- The ambush ---------- */
const AMBUSH = { shot: 0.7, holes: 0.9, sag: 1.4, walk: 3.0, grab: 6.4, throw: 7.4, white: 8.6, land: 9.2, rise: 10.4, rip: 11.2, swords: 12.0, end: 14.6 };

// She goes to climb into the balloon.
function startAmbush() {
  if (showdown.stage !== 'none' || !balloonModel) return;
  showdown.stage = 'ambush';
  if (typeof crimsonVanish === 'function' && crimson.phase !== 'gone') crimsonVanish();
  const out = balloonSpot.out, side = balloonSpot.side;
  // Teto steps out of the trees off to the side of the clearing.
  const tx = balloonSpot.x + out.x * 9 + side.x * 5, tz = balloonSpot.z + out.z * 9 + side.z * 5;
  fight.teto.pos.set(tx, groundHeight(tx, tz), tz);
  showdownScene = { t: 0, fired: {}, inArena: false, from: player.pos.clone(), bullets: [] };
  survival.tool = 'bow';
  survival.swing = null;
  showdownKit.teto.setVisible(true);
  clearWolves();
  playScene({ update: updateAmbush });
}

function ambushOnce(key, at, fn) {
  const s = showdownScene;
  if (!s.fired[key] && s.t >= at) { s.fired[key] = true; fn(); }
}

// Bullets from Teto's hair at a point on the envelope, which leave a hole there.
function ambushVolley(s) {
  const env = balloonModel.envelope;
  const rc = new THREE.Raycaster();
  for (let i = 0; i < 28; i++) {
    tetoMuzzle(i % 2, sdV);
    const aim = sdW.set(balloonSpot.x + (Math.random() - 0.5) * 9, balloonSpot.y + 6 + Math.random() * 12, balloonSpot.z + (Math.random() - 0.5) * 9);
    const dir = aim.clone().sub(sdV).normalize();
    rc.set(sdV, dir);
    const hit = rc.intersectObject(env, true)[0];
    s.bullets.push({ from: sdV.clone(), dir, at: hit ? hit.point.clone() : aim.clone(), t: -i * 0.03 });
  }
}

function addHole(point) {
  const env = balloonModel.envelope;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.22 + Math.random() * 0.2, 10), new THREE.MeshBasicMaterial({ color: 0x140c0c, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }));
  env.worldToLocal(hole.position.copy(point));
  hole.lookAt(env.localToWorld(new THREE.Vector3(0, hole.position.y, 0)));
  env.add(hole);
  showdownKit.holes.push(hole);
}

function updateAmbush(dt) {
  const s = showdownScene, A = AMBUSH, k = showdownKit;
  s.t += dt;
  game.time += dt;
  const t = s.t;
  const spot = balloonSpot, out = spot.out, side = spot.side;
  const tt = fight.teto;
  if (!s.inArena) {
    tickBalloon(dt);
    updateFires(dt);
  }
  ambushOnce('bang', A.shot, () => { Sfx.gunshot(); impact('white', 70); ambushVolley(s); });
  // Tracers through the silk.
  for (const b of s.bullets) {
    b.t += dt;
    if (b.t < 0) continue;
    if (!b.mesh) {
      b.mesh = new THREE.Mesh(k.bullets[0].mesh.geometry, k.bullets[0].mesh.material);
      scene.add(b.mesh);
      if (Math.random() < 0.4) Sfx.gatling();
    }
    const d = b.t * 60;
    const total = b.from.distanceTo(b.at) + 30;
    b.mesh.position.copy(b.from).addScaledVector(b.dir, d);
    b.mesh.lookAt(sdV.copy(b.mesh.position).add(b.dir));
    if (!b.holed && d >= b.from.distanceTo(b.at)) { b.holed = true; addHole(b.at); }
    if (d > total) { scene.remove(b.mesh); b.mesh = null; b.t = -999; }
  }
  // The envelope sags as the air goes out of it.
  if (t > A.sag) balloon.sag = Math.min(1, (t - A.sag) / 4.5);
  ambushOnce('hiss', A.sag, () => { Sfx.silk(); balloon.burnHold = 0; });
  // Teto walks out to her.
  let tetoMode = 'idle', tetoSpeed = 0;
  if (!s.inArena) {
    if (t < A.walk) {
      tetoMode = 'point';
    } else if (t < A.grab) {
      const want = sdV.copy(player.pos).addScaledVector(out, -0.9);
      const d = Math.hypot(want.x - tt.pos.x, want.z - tt.pos.z);
      if (d > 0.1) {
        const step = Math.min(d, 2.6 * dt);
        tt.pos.x += (want.x - tt.pos.x) / d * step;
        tt.pos.z += (want.z - tt.pos.z) / d * step;
        tetoSpeed = 2.6;
      }
      tt.pos.y = groundHeight(tt.pos.x, tt.pos.z);
    } else {
      tetoMode = 'grab';
    }
    tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
  }
  ambushOnce('lineA', A.walk + 0.3, () => tetoSays(showdownLine('ambushA')));
  ambushOnce('lineB', A.walk + 2.0, () => tetoSays(showdownLine('ambushB')));
  ambushOnce('lineC', A.grab + 0.1, () => tetoSays(showdownLine('ambushC')));
  ambushOnce('throw', A.throw, () => { Sfx.thud(); Sfx.crimsonVoice([[0, 300], [0.3, 500]], 0.15, { vowel: 'a' }); s.throwFrom = player.pos.clone(); });
  ambushOnce('white', A.white, () => { impact('white', 260); Sfx.branchSnap(); enterArena(); });
  ambushOnce('land', A.land, () => { Sfx.snowSlam(); burst(player.pos.clone().add(sdU.set(0, 0.3, 0)), 0xf2f5ff, 30, 6); });
  ambushOnce('tetoLand', A.rise, () => { Sfx.snowSlam(); burst(tt.pos.clone().add(sdU.set(0, 0.3, 0)), 0xf2f5ff, 30, 6); tetoSays(showdownLine('arrive')); });
  ambushOnce('rip', A.rip, () => { Sfx.silk(); setShortHair(true); for (let i = 0; i < 2; i++) burst(avatar.head.getWorldPosition(sdV.clone()), 0x37c7cf, 20, 3); });
  ambushOnce('swords', A.swords, () => { showSwords(true); Sfx.ignite(); impact('invert', 80); caption(showdownLine('mikuSwords'), 'line'); });
  ambushOnce('swordLine', A.swords + 1.3, () => { caption(''); tetoSays(showdownLine('swords')); });

  // Miku.
  player.stride = 0;
  player.runBlend = 0;
  if (!s.inArena) {
    player.bodyYaw = Math.atan2(tt.pos.x - player.pos.x, tt.pos.z - player.pos.z);
    if (t < A.grab) {
      poseAvatar(dt, sdU.set(0, 0, 0), false);
    } else if (t < A.throw) {
      // Lifted off her feet by the collar.
      const lift = smooth((t - A.grab) / 0.5) * 0.35;
      player.pos.y = groundHeight(player.pos.x, player.pos.z) + lift;
      poseAvatar(dt, sdU.set(0, 0, 0), false);
    } else {
      // Thrown: up and away over the trees.
      const u = (t - A.throw) / (A.white - A.throw);
      const dir = sdW.set(player.pos.x - tt.pos.x, 0, player.pos.z - tt.pos.z).normalize();
      if (!s.throwDir) s.throwDir = dir.clone();
      player.pos.copy(s.throwFrom).addScaledVector(s.throwDir, u * 26);
      player.pos.y = s.throwFrom.y + Math.sin(u * Math.PI * 0.8) * 9;
      poseFalling(dt, t, player.pos, 0.9);
    }
    avatar.simulate(dt);
  } else if (t < A.rise) {
    // Down hard in the snow, then up onto her feet.
    player.bodyYaw = 0;
    poseLying(dt, player.pos);
  } else {
    player.bodyYaw = Math.atan2(tt.pos.x - player.pos.x, tt.pos.z - player.pos.z);
    poseAvatar(dt, sdU.set(0, 0, 0), false);
    if (t > A.rip - 0.6 && t < A.swords) {
      // Hands up to her hair ties, and a hard pull outward.
      const u = clamp((t - (A.rip - 0.6)) / 0.6, 0, 1);
      const sh = avatar.armL.upper.position;
      solveArm(avatar.armL, sdV.set(Math.abs(sh.x) + 0.02 + u * 0.25 * (t > A.rip ? 1 : 0), sh.y + 0.24, 0.02), POLE_L);
      solveArm(avatar.armR, sdV.set(-Math.abs(sh.x) - 0.02 - u * 0.25 * (t > A.rip ? 1 : 0), sh.y + 0.24, 0.02), POLE_R);
    } else if (t >= A.swords) {
      poseSwordArms();
    }
    avatar.simulate(dt);
  }
  if (showdown.shortHair) swordFlames(dt);
  k.flames.update(dt);

  // Teto in the arena: she drops in from the trees.
  if (s.inArena) {
    if (t < A.rise) { tt.pos.y = SHOWDOWN.arena.y + Math.max(0, (A.rise - t) * 12); tetoMode = 'fly'; }
    else { tt.pos.y = SHOWDOWN.arena.y; tetoMode = 'idle'; }
    tt.yaw = Math.atan2(player.pos.x - tt.pos.x, player.pos.z - tt.pos.z);
  }
  poseTeto(dt, tetoMode, mikuChest(sdU), { speed: tetoSpeed });

  // Shots.
  let camAt, look;
  if (!s.inArena) {
    if (t < A.shot + 0.2) {
      camAt = sdV.copy(player.pos).addScaledVector(out, 3.2).addScaledVector(side, 1).add(sdU.set(0, 1.5, 0));
      look = new THREE.Vector3(spot.x, spot.y + 2, spot.z);
      setFov(54);
    } else if (t < A.walk) {
      // Up at the silk as the rounds tear through it.
      camAt = sdV.set(spot.x, spot.y, spot.z).addScaledVector(out, 20).addScaledVector(side, -8).add(sdU.set(0, 2, 0));
      look = new THREE.Vector3(spot.x, spot.y + 11, spot.z);
      setFov(52);
      if (t < A.holes + 0.8) shake(camAt, 0.15);
    } else if (t < A.grab) {
      // Teto walking out of the trees, hair smoking.
      camAt = sdV.copy(player.pos).addScaledVector(sdW.set(tt.pos.x - player.pos.x, 0, tt.pos.z - player.pos.z).normalize(), -2.4).add(sdU.set(0, 1.6, 0)).addScaledVector(side, 0.8);
      look = tt.pos.clone().add(sdU.set(0, 1.2, 0));
      setFov(44);
      if (Math.random() < dt * 8) { tetoMuzzle(Math.random() < 0.5 ? 0 : 1, sdW); k.smoke.emit(sdW, sdU.set(0, 0.6, 0), { life: 1.4, size: 0.2, grow: 3, alpha: 0.5 }); }
    } else if (t < A.throw) {
      camAt = sdV.copy(tt.pos).addScaledVector(side, 2.6).add(sdU.set(0, 1.4, 0));
      look = player.pos.clone().add(sdU.set(0, 1.2, 0));
      setFov(40);
    } else {
      camAt = sdV.copy(s.throwFrom).addScaledVector(s.throwDir, -4).add(sdU.set(0, 3, 0));
      look = player.pos.clone();
      setFov(60);
    }
  } else {
    // In the clearing: low behind her, Teto beyond.
    const toT = sdW.set(tt.pos.x - player.pos.x, 0, tt.pos.z - player.pos.z).normalize();
    if (t < A.rise) {
      camAt = sdV.copy(player.pos).addScaledVector(toT, -3.2).add(sdU.set(1.4, 1.4, 0));
      look = tt.pos.clone().add(sdU.set(0, 1, 0));
      setFov(52);
    } else if (t < A.swords + 0.8) {
      // Close on her as she pulls her hair free.
      camAt = sdV.copy(player.pos).addScaledVector(toT, 1.7).add(sdU.set(0, 1.45, 0));
      look = player.pos.clone().add(sdU.set(0, 1.25, 0));
      setFov(42);
    } else {
      camAt = sdV.copy(player.pos).addScaledVector(toT, -2.8).add(sdU.set(0, 1.6, 0));
      look = tt.pos.clone().add(sdU.set(0, 1.1, 0));
      setFov(50);
    }
  }
  camera.position.copy(camAt);
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  if (t >= A.end) startFight();
}

// Into the clearing: the stand-in forest takes over from the real one for the fight.
function enterArena() {
  const s = showdownScene, A = SHOWDOWN.arena, k = showdownKit;
  s.inArena = true;
  k.arena.visible = true;
  scene.fog.density = A.fog;
  for (const b of s.bullets) if (b.mesh) { scene.remove(b.mesh); b.mesh = null; }
  arenaPoint(player.pos, 0.6, 0, A.start);
  arenaPoint(fight.teto.pos, -1, 0, A.tetoStart);
  player.bodyYaw = player.yaw = 0;
  world.stream(player.pos, Infinity);
  avatar.reset();
  // Her balloon stands far off down the clearing, sagging.
  if (!k.farBalloon) {
    k.farBalloon = balloonModel.group.clone(true);
    scene.add(k.farBalloon);
  }
  k.farBalloon.position.set(0, A.y, A.length / 2 + 120);
  k.farBalloon.scale.set(1, 0.85, 1);
  k.farBalloon.visible = true;
}

function leaveArena() {
  const k = showdownKit;
  k.arena.visible = false;
  if (k.farBalloon) k.farBalloon.visible = false;
  scene.fog.density = FOG_DENSITY;
  for (const b of k.bullets) { b.life = 0; b.mesh.visible = false; }
  for (const beam of [...k.rails, k.giant]) beam.visible = false;
  for (const o of [...k.orbs, k.bigOrb]) o.visible = false;
  for (const line of k.sights) line.visible = false;
  k.waveMesh.visible = false;
}

/* ---------- The fight ---------- */
function startFight() {
  showdown.stage = 'fight';
  showdown.hp = SHOWDOWN.teto.hp;
  Object.assign(fight, { swing: null, combo: 0, comboT: 0, queued: false, waveCd: 0, waveT: -1, knocked: null, invuln: 1.5, tauntT: 5, over: false });
  Object.assign(fight.teto, { state: 'reposition', t: 0, dur: 1.2, whipT: SHOWDOWN.whip.every, dashT: 0, hurtT: 0 });
  showdown.hits = 0;
  showdown.knocks = 0;
  survival.health = 100;
  survival.warmth = 100;
  survival.tool = 'bow';
  showSwords(true);
  $('boss-bar').classList.remove('hidden');
  document.body.classList.add('boss-fight');
  if (activeScene) endScene();
  showdownScene = null;
  caption('');
  renderTetoBar(true);
}

// Back to the start after a loss.
function restartFight() {
  const A = SHOWDOWN.arena;
  $('boss-fade').classList.add('on');
  setTimeout(() => {
    arenaPoint(player.pos, 0.6, 0, A.start);
    arenaPoint(fight.teto.pos, -1, 0, A.tetoStart);
    player.dodge = null;
    for (const b of showdownKit.bullets) { b.life = 0; b.mesh.visible = false; }
    startFight();
    $('hud').classList.remove('hidden');
    game.state = 'playing';
    lockPointer();
    $('boss-fade').classList.remove('on');
    tetoSays(showdownLine('retry'));
  }, 700);
}

function renderTetoBar(now = false) {
  const f = clamp(showdown.hp / SHOWDOWN.teto.hp, 0, 1);
  const bar = $('boss-bar');
  bar.querySelector('.boss-fill').style.width = `${f * 100}%`;
  const lag = bar.querySelector('.boss-lag');
  if (now) lag.style.width = `${f * 100}%`;
  else setTimeout(() => { lag.style.width = `${clamp(showdown.hp / SHOWDOWN.teto.hp, 0, 1) * 100}%`; }, 450);
}

function damageTeto(amount) {
  const t = fight.teto;
  if (showdown.stage !== 'fight') return;
  const mult = t.state === 'cool' ? SHOWDOWN.sword.open : 1;
  const stageBefore = fightStage();
  showdown.hp = Math.max(0, showdown.hp - amount * mult);
  t.flash = 0.12;
  t.hurtT = 0.25;
  Sfx.swordHit();
  burst(tetoChest(sdV), 0x9fe6ff, 12, 3);
  showdownKit.sparks.emit(sdV, sdW.set(0, 1, 0), { life: 0.3, size: 0.4, grow: 2, alpha: 0.9 });
  renderTetoBar();
  if (Math.random() < 0.18) tetoSays(showdownLine('hurt'), 1.2);
  if (fightStage() > stageBefore) {
    $('boss-bar').classList.remove('stage-up');
    void $('boss-bar').offsetWidth;
    $('boss-bar').classList.add('stage-up');
  }
  if (showdown.hp <= SHOWDOWN.teto.hp * SHOWDOWN.finaleAt) startFinale();
}

// Something of Teto's struck Miku.
function hitMiku(amount) {
  if (fight.invuln > 0 || fight.knocked || showdown.stage !== 'fight') return;
  if (player.dodge && player.dodge.t < 0.5) return;
  showdown.hits++;
  hurtPlayer(amount, 'teto');
  fight.invuln = 0.18;
  if (showdown.hits >= SHOWDOWN.knock.hits && survival.health > 0) knockDown();
}

function knockDown() {
  const K = SHOWDOWN.knock;
  showdown.hits = 0;
  fight.swing = null;
  fight.waveT = -1;
  player.dodge = null;
  fight.knocked = { t: 0, need: Math.min(K.most, K.need + K.grow * showdown.knocks), presses: 0, phase: 'down', at: player.pos.clone(), roll: 0 };
  Object.assign(fight.teto, { state: 'rail', t: 0, dur: K.charge });
  for (const b of showdownKit.bullets) { b.life = 0; b.mesh.visible = false; }
  Sfx.railCharge();
  tetoSays(showdownLine('knock'), 1.6);
  $('boss-hint').classList.remove('hidden');
  $('boss-hint').querySelector('p').textContent = `Mash SPACE to roll clear! (${fight.knocked.need})`;
}

// Space while she's down.
function showdownMash() {
  const kn = fight.knocked;
  if (!kn) return false;
  if (kn.phase === 'down') {
    kn.presses++;
    $('boss-hint').querySelector('.boss-mash i').style.width = `${Math.min(1, kn.presses / kn.need) * 100}%`;
    if (kn.presses >= kn.need) kn.phase = 'clear';
  }
  return true;
}

function updateKnocked(dt) {
  const kn = fight.knocked, k = showdownKit, K = SHOWDOWN.knock;
  kn.t += dt;
  const t = fight.teto;
  if (kn.phase === 'clear' && !kn.rolled) {
    // Rolled out of the way: away to the side.
    kn.rolled = true;
    const side = sdV.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw)).multiplyScalar(Math.random() < 0.5 ? 2.2 : -2.2);
    kn.rollTo = kn.at.clone().add(side);
    burst(player.pos.clone().add(sdU.set(0, 0.2, 0)), 0xf2f5ff, 16, 3);
    Sfx.thud();
  }
  if (kn.rollTo) {
    kn.roll = Math.min(1, kn.roll + dt * 5);
    player.pos.lerpVectors(kn.at, kn.rollTo, smooth(kn.roll));
    showdownClamp(player.pos);
  }
  // The charge: two orbs swelling at her drill tips.
  const charge = clamp(kn.t / K.charge, 0, 1);
  for (let i = 0; i < 2; i++) {
    tetoMuzzle(i, sdV);
    k.orbs[i].position.copy(sdV);
    k.orbs[i].scale.setScalar(0.15 + charge * 0.9 + Math.random() * 0.05);
    k.orbs[i].visible = kn.t < K.charge + 0.5;
  }
  if (kn.t >= K.charge && !kn.fired) {
    kn.fired = true;
    Sfx.railFire();
    impact('white', 120);
    const target = kn.at.clone().add(sdU.set(0, 0.35, 0));
    for (let i = 0; i < 2; i++) { tetoMuzzle(i, sdV); aimBeam(k.rails[i], sdV, target, 1); }
    burst(target, 0xff86b0, 30, 6);
    burst(target, 0xf2f5ff, 30, 6);
    if (kn.phase !== 'clear') {
      hurtPlayer(K.laser + K.laserGrow * showdown.knocks, 'teto');
      player.shake = 0.6;
    } else {
      tetoSays(showdownLine('dodged'), 1.4);
    }
  }
  if (kn.fired) {
    const fade = 1 - clamp((kn.t - K.charge) / 0.5, 0, 1);
    for (const beam of k.rails) { beam.visible = fade > 0; beam.scale.x = beam.scale.y = fade; }
  }
  if (kn.t >= K.charge + 1.1) {
    fight.knocked = null;
    showdown.knocks++;
    fight.invuln = 1.4;
    $('boss-hint').classList.add('hidden');
    $('boss-hint').querySelector('.boss-mash i').style.width = '0%';
    Object.assign(t, { state: 'cool', t: 0, dur: 1.6 });
  }
}

// Each frame of the fight, for Teto.
function updateTetoFight(dt) {
  const t = fight.teto, G = SHOWDOWN.gatling, k = showdownKit, st = fightStage();
  t.t += dt;
  t.flash = Math.max(0, t.flash - dt);
  t.whipT -= dt;
  t.dashT -= dt;
  const toMiku = sdV.set(player.pos.x - t.pos.x, 0, player.pos.z - t.pos.z);
  const dist = toMiku.length();
  const faceMiku = (rate) => {
    const want = Math.atan2(toMiku.x, toMiku.z);
    const turn = Math.atan2(Math.sin(want - t.yaw), Math.cos(want - t.yaw));
    t.yaw += turn * (1 - Math.exp(-rate * dt));
  };
  let mode = 'idle', speed = 0, look = mikuChest(sdU.clone());
  for (const line of k.sights) line.visible = false;

  // Too close outside her rest, she whips her hair round, or dashes clear.
  if (t.state !== 'cool' && t.state !== 'whip' && t.state !== 'rail' && dist < SHOWDOWN.whip.range) {
    if (t.whipT <= 0) Object.assign(t, { state: 'whip', t: 0, dur: SHOWDOWN.whip.windup + 0.3, whipped: false });
    else if (t.dashT <= 0 && t.state !== 'fire') dashAway(t);
  }

  if (t.state === 'reposition') {
    // To a spot at her favourite range, off to one side.
    if (t.t < dt * 1.5) {
      const want = clamp(lerp(SHOWDOWN.teto.keep[0], SHOWDOWN.teto.keep[1], Math.random()), 6, 14);
      const a = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z) + (Math.random() - 0.5) * 1.6;
      t.target.set(player.pos.x + Math.sin(a) * want, t.pos.y, player.pos.z + Math.cos(a) * want);
      showdownClamp(t.target, 0.8);
    }
    const d = sdW.subVectors(t.target, t.pos).setY(0);
    if (d.length() > 0.3) {
      const step = Math.min(d.length(), SHOWDOWN.teto.walk * dt);
      t.pos.addScaledVector(d.normalize(), step);
      speed = SHOWDOWN.teto.walk;
    }
    faceMiku(6);
    if (t.t >= t.dur) Object.assign(t, { state: 'aim', t: 0, dur: G.aim[st] });
  } else if (t.state === 'aim') {
    // Pointing, the sights from her drills locking on.
    faceMiku(8);
    mode = 'point';
    t.aimDir.copy(mikuChest(sdW)).sub(tetoMuzzle(0, sdU)).normalize();
    for (let i = 0; i < 2; i++) {
      const line = k.sights[i];
      tetoMuzzle(i, sdU);
      const arr = line.geometry.attributes.position.array;
      arr[0] = sdU.x; arr[1] = sdU.y; arr[2] = sdU.z;
      const far = sdU.clone().addScaledVector(t.aimDir, 40);
      arr[3] = far.x; arr[4] = far.y; arr[5] = far.z;
      line.geometry.attributes.position.needsUpdate = true;
      line.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t.t * 22));
      line.visible = true;
    }
    if (t.t >= t.dur) { Object.assign(t, { state: 'fire', t: 0, dur: G.fire[st], shotT: 0 }); }
  } else if (t.state === 'fire') {
    // The gatling: her hair rattles out rounds at where she's pointing, turning after Miku
    // slower than Miku can run.
    mode = 'point';
    const want = mikuChest(sdW).sub(tetoMuzzle(0, sdU)).normalize();
    const angle = t.aimDir.angleTo(want);
    if (angle > 1e-4) {
      const step = Math.min(1, (G.turn[st] * dt) / angle);
      t.aimDir.lerp(want, step).normalize();
    }
    t.yaw = Math.atan2(t.aimDir.x, t.aimDir.z);
    look = sdU.copy(t.pos).add(sdW.copy(t.aimDir).multiplyScalar(10)).add(SD_UP);
    t.shotT -= dt;
    while (t.shotT <= 0) {
      t.shotT += 1 / G.rate[st];
      t.muzzle = 1 - t.muzzle;
      fireBullet(t.muzzle, t.aimDir, st === 2 ? Math.sin(t.t * 6) * 0.08 : 0);
    }
    if (t.t >= t.dur) Object.assign(t, { state: 'cool', t: 0, dur: G.cool[st] });
  } else if (t.state === 'cool') {
    // Venting: her drills smoke, she's winded, and every blow lands harder.
    mode = 'pant';
    if (Math.random() < dt * 10) { tetoMuzzle(Math.random() < 0.5 ? 0 : 1, sdW); k.smoke.emit(sdW, sdU.set(0, 0.7, 0), { life: 1.2, size: 0.18, grow: 3, alpha: 0.5 }); }
    if (t.t >= t.dur) Object.assign(t, { state: 'reposition', t: 0, dur: 0.9 + Math.random() * 0.8 });
  } else if (t.state === 'whip') {
    // A spinning lash of hair all round her.
    const W = SHOWDOWN.whip;
    mode = 'whip';
    const u = clamp(t.t / W.windup, 0, 1);
    t.yaw += dt * (u < 1 ? 2 : 22);
    if (u < 1 && Math.random() < dt * 20) burst(tetoChest(sdW), 0xff86b0, 2, 1);
    if (u >= 1 && !t.whipped) {
      t.whipped = true;
      Sfx.slash(2);
      burst(tetoChest(sdW), 0xff86b0, 20, 4);
      if (dist < W.range + 0.3) hitMiku(W.damage);
    }
    if (t.t >= t.dur) { t.whipT = W.every; Object.assign(t, { state: 'reposition', t: 0, dur: 0.6 }); }
  } else if (t.state === 'rail') {
    mode = 'rail';
    faceMiku(4);
    look = fight.knocked ? fight.knocked.at.clone() : look;
  }
  // Dashing: a quick slide, kicking up snow.
  if (t.dashing) {
    t.dashing.t += dt;
    const u = Math.min(1, t.dashing.t / 0.28);
    t.pos.lerpVectors(t.dashing.from, t.dashing.to, smooth(u));
    if (u >= 1) t.dashing = null;
  }
  t.pos.y = SHOWDOWN.arena.y;
  showdownClamp(t.pos, 0.8);
  poseTeto(dt, mode, look, { speed, u: t.state === 'whip' ? clamp(t.t / SHOWDOWN.whip.windup, 0, 1) : 0 });

  fight.tauntT -= dt;
  if (fight.tauntT <= 0) { fight.tauntT = 7 + Math.random() * 5; tetoSays(showdownLine('taunts'), 1.8); }
}

function dashAway(t) {
  t.dashT = 2.4;
  const away = sdW.set(t.pos.x - player.pos.x, 0, t.pos.z - player.pos.z).normalize();
  away.applyAxisAngle(SD_UP, (Math.random() - 0.5) * 1.4);
  t.dashing = { t: 0, from: t.pos.clone(), to: t.pos.clone().addScaledVector(away, 6) };
  showdownClamp(t.dashing.to, 0.8);
  burst(t.pos.clone().add(sdU.set(0, 0.2, 0)), 0xf2f5ff, 14, 3);
  Sfx.thud();
}

function fireBullet(i, dir, sweep) {
  const b = showdownKit.bullets.find((x) => x.life <= 0);
  if (!b) return;
  const G = SHOWDOWN.gatling;
  tetoMuzzle(i, b.pos);
  b.vel.copy(dir).applyAxisAngle(SD_UP, sweep + (Math.random() - 0.5) * G.spread).add(sdU.set(0, (Math.random() - 0.5) * G.spread, 0)).normalize().multiplyScalar(G.speed);
  b.life = 1.6;
  b.mesh.visible = true;
  b.mesh.position.copy(b.pos);
  b.mesh.lookAt(sdV.copy(b.pos).add(b.vel));
  Sfx.gatling();
  showdownKit.sparks.emit(b.pos, sdV.set(0, 0.5, 0), { life: 0.08, size: 0.25, grow: 1, alpha: 1 });
}

// Bullets in flight: past her (a near miss hisses), into her, or into the snow.
function updateBullets(dt) {
  const seg0 = sdV, seg1 = sdW;
  for (const b of showdownKit.bullets) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const before = b.pos.clone();
    b.pos.addScaledVector(b.vel, dt);
    b.mesh.position.copy(b.pos);
    // Against her body: a line from her hips to her head.
    seg0.copy(player.pos).add(sdU.set(0, 0.35, 0));
    seg1.copy(player.pos).add(sdU.set(0, 1.4, 0));
    const d = segmentDistance(before, b.pos, seg0, seg1);
    if (d < 0.32 && showdown.stage === 'fight' && !fight.knocked) {
      if (player.dodge && player.dodge.t < 0.5) { if (!b.hissed) { b.hissed = true; Sfx.bulletHiss(); } }
      else { hitMiku(SHOWDOWN.gatling.damage); b.life = 0; burst(b.pos, 0xff86b0, 6, 2); }
    } else if (d < 1.2 && !b.hissed) { b.hissed = true; Sfx.bulletHiss(); }
    if (b.pos.y < SHOWDOWN.arena.y) { b.life = 0; burst(b.pos.setY(SHOWDOWN.arena.y + 0.05), 0xf2f5ff, 3, 1.2); }
    if (b.life <= 0) { b.mesh.visible = false; b.hissed = false; }
  }
}

// Closest distance between segments ab and cd.
function segmentDistance(a, b, c, d) {
  const u = b.clone().sub(a), v = d.clone().sub(c), w = a.clone().sub(c);
  const A = u.dot(u), B = u.dot(v), C = v.dot(v), D = u.dot(w), E = v.dot(w);
  const den = A * C - B * B;
  let s = den > 1e-8 ? clamp((B * E - C * D) / den, 0, 1) : 0;
  let t = C > 1e-8 ? clamp((B * s + E) / C, 0, 1) : 0;
  s = A > 1e-8 ? clamp((B * t - D) / A, 0, 1) : 0;
  return a.clone().addScaledVector(u, s).distanceTo(c.clone().addScaledVector(v, t));
}

/* ---------- Miku's strikes ---------- */
function showdownClick(button) {
  if (showdown.stage !== 'fight' || fight.knocked) return;
  const S = SHOWDOWN.sword;
  if (button === 2) {
    if (fight.waveCd > 0 || fight.swing || fight.waveT >= 0) return;
    fight.waveT = 0;
    faceTeto();
    Sfx.heatWave();
    return;
  }
  if (button !== 0) return;
  if (fight.swing) { if (fight.swing.t > fight.swing.dur * 0.45) fight.queued = true; return; }
  if (fight.waveT >= 0) return;
  startStrike();
  void S;
}

function startStrike() {
  const S = SHOWDOWN.sword;
  const k = fight.comboT > 0 ? (fight.combo + 1) % 3 : 0;
  fight.combo = k;
  fight.swing = { k, t: 0, dur: k === 2 ? S.spin : S.strike, hit: false };
  faceTeto();
  Sfx.slash(k);
}

// Strikes turn her to Teto, if Teto's close enough to be the point of them.
function faceTeto() {
  const t = fight.teto;
  const d = Math.hypot(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
  if (d < 14) player.bodyYaw = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
}

function updateStrikes(dt) {
  const S = SHOWDOWN.sword, t = fight.teto, k = showdownKit;
  fight.comboT -= dt;
  fight.waveCd = Math.max(0, fight.waveCd - dt);
  $('sword-wave').classList.toggle('ready', fight.waveCd <= 0);
  $('sword-wave').querySelector('i').style.width = `${(1 - fight.waveCd / S.wave.cooldown) * 100}%`;
  const sw = fight.swing;
  if (sw) {
    sw.t += dt;
    if (sw.k === 2) player.bodyYaw += dt * (Math.PI * 2 / S.spin);
    if (!sw.hit && sw.t > sw.dur * 0.45) {
      sw.hit = true;
      const dx = t.pos.x - player.pos.x, dz = t.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      const off = Math.atan2(Math.sin(Math.atan2(dx, dz) - player.bodyYaw), Math.cos(Math.atan2(dx, dz) - player.bodyYaw));
      if (d < S.reach && (sw.k === 2 || Math.abs(off) < S.arc / 2)) damageTeto(S.damage[sw.k]);
      // A sweep of flame off the blades.
      for (let i = 0; i < 10; i++) {
        const a = player.bodyYaw + (Math.random() - 0.5) * (sw.k === 2 ? Math.PI * 2 : S.arc);
        k.flames.emit(sdV.set(player.pos.x + Math.sin(a) * 1.4, player.pos.y + 1, player.pos.z + Math.cos(a) * 1.4), sdW.set(Math.sin(a) * 2, 0.5, Math.cos(a) * 2), { life: 0.3, size: 0.35, grow: 1.5, alpha: 0.8 });
      }
    }
    if (sw.t >= sw.dur) {
      fight.swing = null;
      fight.comboT = 0.45;
      if (fight.queued) { fight.queued = false; startStrike(); }
    }
  }
  // The heat wave: crossed swords thrown open, and a crescent of fire rolls out.
  if (fight.waveT >= 0) {
    fight.waveT += dt;
    if (fight.waveT >= S.wave.windup && !fight.wave) {
      const dir = new THREE.Vector3(Math.sin(player.bodyYaw), 0, Math.cos(player.bodyYaw));
      fight.wave = { pos: player.pos.clone().add(sdU.set(0, 1, 0)).addScaledVector(dir, 0.8), dir, life: S.wave.life, hit: false };
      fight.waveCd = S.wave.cooldown;
      impact('invert', 40);
    }
    if (fight.waveT >= S.wave.windup + 0.15) fight.waveT = -1;
  }
  const w = fight.wave;
  if (w) {
    w.life -= dt;
    w.pos.addScaledVector(w.dir, S.wave.speed * dt);
    k.waveMesh.visible = true;
    k.waveMesh.position.copy(w.pos);
    k.waveMesh.rotation.set(0, Math.atan2(w.dir.x, w.dir.z), 0);
    k.waveMesh.material.opacity = Math.min(1, w.life * 2);
    for (let i = 0; i < 3; i++) k.flames.emit(sdV.copy(w.pos).add(sdW.set((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 0.4, 0).applyAxisAngle(SD_UP, Math.atan2(w.dir.x, w.dir.z))), sdW.set(0, 0.8, 0), { life: 0.35, size: 0.3, grow: 1.6, alpha: 0.8 });
    if (!w.hit && Math.hypot(w.pos.x - t.pos.x, w.pos.z - t.pos.z) < S.wave.radius) { w.hit = true; damageTeto(S.wave.damage); }
    if (w.life <= 0 || Math.abs(w.pos.x) > SHOWDOWN.arena.half + 4) { fight.wave = null; k.waveMesh.visible = false; }
  }
}

/* ---------- The finale ---------- */
const FINALE = { lift: 1.2, charge: 3.6, fire: 5.2, white: 5.6, still: 7.2, frames: 9, every: 0.55, dark: 13.4, end: 15 };

function startFinale() {
  if (showdown.stage !== 'fight') return;
  showdown.stage = 'finale';
  fight.swing = null;
  fight.waveT = -1;
  fight.knocked = null;
  player.dodge = null;
  $('boss-hint').classList.add('hidden');
  for (const b of showdownKit.bullets) { b.life = 0; b.mesh.visible = false; }
  showdownScene = { t: 0, fired: {}, inArena: true, frame: -1, from: fight.teto.pos.clone() };
  playScene({ update: updateFinale });
}

function updateFinale(dt) {
  const s = showdownScene, F = FINALE, k = showdownKit, t = fight.teto;
  s.t += dt;
  game.time += dt;
  const time = s.t;
  ambushOnce('line', 0.2, () => tetoSays(showdownLine('finale')));
  ambushOnce('jets', F.lift, () => { s.jet = Sfx.jet(); s.jet.set(0.6, 0.3); });
  // Up on her hair, jets of flame pouring down from the drills.
  const lift = smooth(clamp((time - F.lift) / 2.2, 0, 1)) * 15;
  t.yaw = Math.atan2(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
  if (time > F.lift && time < F.white) {
    for (let i = 0; i < 2; i++) {
      tetoMuzzle(i, sdV);
      k.jets.emit(sdV, sdW.set((Math.random() - 0.5) * 1.2, -9 - Math.random() * 4, (Math.random() - 0.5) * 1.2), { life: 0.4, size: 0.5, grow: 2.5, alpha: 0.9 });
    }
  }
  if (time < F.white) poseTeto(dt, time > F.lift ? 'fly' : 'idle', mikuChest(sdU.clone()), { lift });
  k.jets.update(dt);
  // The charge: a huge orb gathering between her drills.
  if (time > F.charge && time < F.fire + 0.4) {
    tetoMuzzle(0, sdV); tetoMuzzle(1, sdW);
    k.bigOrb.position.lerpVectors(sdV, sdW, 0.5).add(sdU.set(0, -0.3, 0));
    k.bigOrb.scale.setScalar(0.5 + smooth((time - F.charge) / (F.fire - F.charge)) * 4 + Math.random() * 0.3);
    k.bigOrb.visible = true;
  }
  ambushOnce('charge', F.charge, () => Sfx.railCharge());
  ambushOnce('fire', F.fire, () => {
    Sfx.railFire();
    Sfx.boom(1);
    aimBeam(k.giant, k.bigOrb.position, player.pos.clone(), 1);
    if (s.jet) { s.jet.stop(); s.jet = null; }
  });
  ambushOnce('white', F.white, () => {
    $('flash').className = 'white';
    k.giant.visible = false;
    k.bigOrb.visible = false;
    k.teto.setVisible(false);
    showSwords(false);
    $('boss-bar').classList.add('hidden');
  });
  // Miku: on her feet looking up, then flat in the snow.
  if (time < F.white) {
    player.bodyYaw = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
    poseAvatar(dt, sdU.set(0, 0, 0), false);
    poseSwordArms();
    avatar.simulate(dt);
    swordFlames(dt);
  } else {
    poseLying(dt, player.pos);
  }
  k.flames.update(dt);
  // Frame by frame: the snow settling on her, a still every so often.
  if (time >= F.still) {
    const frame = Math.min(F.frames - 1, Math.floor((time - F.still) / F.every));
    if (frame !== s.frame) {
      s.frame = frame;
      if (frame === 0) $('flash').className = '';
      const u = (frame + 1) / F.frames;
      k.mound.visible = true;
      k.mound.position.copy(player.pos);
      k.mound.scale.set(0.5 + u * 0.6, 0.05 + u * 0.45, 0.9 + u * 0.45);
      k.mound.rotation.y = player.bodyYaw + 1;
      k.mound.material.opacity = 1;
      s.stillCam = { at: player.pos.clone().add(sdU.set(0.4, 2.6 - u * 0.4, 1.2)), look: player.pos.clone() };
      Sfx.burst(0.3, 3200, 0.6, 0.04, 'highpass');
    }
    camera.position.copy(s.stillCam.at);
    camera.lookAt(s.stillCam.look);
    setFov(46);
    // The world stands still between stills.
    s.hold = true;
  } else if (time < F.white) {
    const toT = sdW.set(t.pos.x - player.pos.x, 0, t.pos.z - player.pos.z).normalize();
    camera.position.copy(player.pos).addScaledVector(toT, -3).add(sdU.set(0, 1.0, 0));
    camera.lookAt(t.pos.clone().add(sdU.set(0, lift + 1.2, 0)));
    setFov(56);
    if (time > F.fire) shake(camera.position, 0.3);
  }
  ambushOnce('dark', F.dark, () => { $('boss-fade').classList.add('on'); });
  if (time >= F.end) wakeInjured();
}

/* ---------- Afterwards ---------- */
// She comes to by the ruined balloon, hurt.
function wakeInjured() {
  const k = showdownKit;
  k.mound.visible = false;
  leaveArena();
  showdown.stage = 'injured';
  showdown.injured = true;
  document.body.classList.remove('boss-fight');
  $('boss-bar').classList.add('hidden');
  if (showdownScene && showdownScene.jet) showdownScene.jet.stop();
  showdownScene = null;
  const out = balloonSpot.out, side = balloonSpot.side;
  const x = balloonSpot.x + out.x * 5 + side.x * 2, z = balloonSpot.z + out.z * 5 + side.z * 2;
  player.pos.set(x, groundHeight(x, z), z);
  player.bodyYaw = player.yaw = Math.atan2(-out.x, -out.z);
  player.pitch = 0.05;
  world.stream(player.pos, Infinity);
  balloon.sag = 1;
  survival.health = 32;
  survival.warmth = 55;
  avatar.reset();
  endScene();
  $('boss-fade').classList.remove('on');
  $('flash').className = '';
  say(showdownLine('wake'), 4);
  emitGame('tetoGone');
}

// Sitting at a fire after waking: the fairies come.
function showdownSat(fire) {
  if (showdown.stage !== 'injured') return false;
  showdownScene = { t: 0, fired: {}, fire };
  playScene({ update: updateFairies });
  return true;
}

const FAIRIES = { arrive: 0.6, lineA: 2.2, lineB: 5.6, heal: 8.6, end: 10.6 };

function updateFairies(dt) {
  const s = showdownScene, F = FAIRIES, k = showdownKit;
  s.t += dt;
  game.time += dt;
  const t = s.t;
  updateFires(dt);
  if (survival.sitting) poseSitting(dt);
  else poseAvatar(dt, sdU.set(0, 0, 0), false);
  avatar.simulate(dt);
  // They spiral in from the dark and swirl round her.
  const come = smooth(clamp((t - F.arrive) / 1.8, 0, 1)), go = smooth(clamp((t - F.heal - 0.6) / 1.4, 0, 1));
  for (const f of k.fairies) {
    const a = game.time * f.speed + f.phase;
    const r = lerp(9, f.r, come) + go * 6;
    f.sprite.visible = t > F.arrive;
    f.sprite.position.set(player.pos.x + Math.cos(a) * r, player.pos.y + f.h + Math.sin(a * 1.7) * 0.15 + go * 3, player.pos.z + Math.sin(a) * r);
    f.sprite.material.opacity = (1 - go) * (0.7 + 0.3 * Math.sin(a * 5));
    f.sprite.scale.setScalar(0.12 + 0.05 * Math.sin(a * 3));
  }
  ambushOnce('chime', F.arrive, () => Sfx.fairyChime());
  ambushOnce('a', F.lineA, () => caption(showdownLine('fairyA'), 'fairy'));
  ambushOnce('b', F.lineB, () => { Sfx.fairyChime(); caption(showdownLine('fairyB'), 'fairy'); });
  ambushOnce('heal', F.heal, () => {
    caption('');
    impact('white', 140);
    Sfx.fairyChime();
    for (let i = 0; i < 3; i++) burst(player.pos.clone().add(sdU.set(0, 0.8, 0)), 0x8dff9a, 20, 3);
    showdown.injured = false;
    survival.health = 100;
    survival.warmth = 100;
    showdown.stage = 'repair';
  });
  // A slow turn round her by the fire.
  const a = t * 0.18;
  camera.position.set(player.pos.x + Math.sin(a) * 3.2, player.pos.y + 1.6, player.pos.z + Math.cos(a) * 3.2);
  camera.lookAt(player.pos.x, player.pos.y + 0.8, player.pos.z);
  setFov(50);
  if (t >= F.end) {
    for (const f of k.fairies) f.sprite.visible = false;
    showdownScene = null;
    endScene();
    say(showdownLine('healed'), 4);
    if (typeof saveGame === 'function') saveGame();
  }
}

/* ---------- The balloon, afterwards ---------- */
function showdownRepairLabel() {
  const R = SHOWDOWN.repair;
  if (showdown.stage === 'repaired') return 'Press E to climb into the balloon';
  if (showdown.stage === 'repair') return `Press E to patch the balloon: ${Math.min(packCount('wolfpelt'), R.wolfpelt)}/${R.wolfpelt} wolf pelts, ${Math.min(packCount('pelt'), R.pelt)}/${R.pelt} hare pelts`;
  return 'The balloon is shot full of holes. I can\'t fix it like this.';
}

// The frame, once the balloon has been shot. True if this handled it.
function showdownUseFrame() {
  const R = SHOWDOWN.repair;
  if (showdown.stage === 'none') { startAmbush(); return true; }
  if (showdown.stage === 'repaired') { endPartOne(); return true; }
  if (showdown.stage === 'repair') {
    if (packCount('wolfpelt') >= R.wolfpelt && packCount('pelt') >= R.pelt) {
      packTake('wolfpelt', R.wolfpelt);
      packTake('pelt', R.pelt);
      showdown.stage = 'repaired';
      for (const hole of showdownKit.holes) hole.visible = false;
      balloon.sag = 0;
      balloon.burnHold = 2.5;
      Sfx.hammer();
      Sfx.burnerLight();
      toast('The balloon is patched');
      say(showdownLine('repaired'), 3.5);
      if (typeof saveGame === 'function') saveGame();
    } else {
      showNote(`Still need ${Math.max(0, R.wolfpelt - packCount('wolfpelt'))} wolf pelts and ${Math.max(0, R.pelt - packCount('pelt'))} hare pelts.`);
    }
    return true;
  }
  if (showdown.stage === 'injured') { showNote('Not like this. I need a fire first.'); return true; }
  return false;
}

function endPartOne() {
  showdown.stage = 'done';
  game.state = 'ending';
  document.exitPointerLock();
  $('hud').classList.add('hidden');
  Sfx.dawnChime();
  $('end-part').classList.remove('hidden');
}

// The tracker's goal while this part of the story plays out, or null.
function showdownObjective() {
  if (showdown.stage === 'injured') return 'mendFire';
  if (showdown.stage === 'repair') return 'repair';
  if (showdown.stage === 'repaired') return 'board';
  return null;
}

/* ---------- Hooks for the player (game.js) ---------- */
// Keeps her inside the clearing.
function showdownClamp(pos, pad = 0.5) {
  if (!arenaActive() && showdown.stage !== 'finale') return;
  const A = SHOWDOWN.arena;
  pos.x = clamp(pos.x, -A.half + pad, A.half - pad);
  pos.z = clamp(pos.z, -A.length / 2 + pad, A.length / 2 - pad);
  pos.y = A.y;
}

// While she's knocked down the fight moves her itself. True if it posed her this frame.
function showdownHoldsPlayer(dt) {
  if (!fight.knocked || showdown.stage !== 'fight') return false;
  player.stride = 0;
  poseLying(dt, player.pos);
  return true;
}

function showdownPosePlayer() {
  if (showdown.stage === 'fight' && !fight.knocked) poseSwordArms();
}

// Hurt, she can only limp.
function showdownSpeed() {
  return showdown.injured ? 0.55 : 1;
}

// Losing the fight starts it over, rather than ending the run.
function showdownCatchDeath() {
  if (showdown.stage !== 'fight') return false;
  survival.health = 1;
  fight.knocked = null;
  $('boss-hint').classList.add('hidden');
  restartFight();
  return true;
}

// The snow settling over her plays as stills: true while the current still is already on screen.
function showdownFrozen() {
  const s = showdownScene;
  if (showdown.stage !== 'finale' || !s || !s.hold) return false;
  if (s.drawn === s.frame) return true;
  s.drawn = s.frame;
  return false;
}

// For testing (and the moderator menu): the balloon built and waiting, and her at it.
function showdownJumpTo() {
  if (showdown.stage !== 'none' || game.state !== 'playing') return;
  giveBalloonParts();
  if (!balloon.assembled) { survival.planks -= BALLOON.planks; raiseBalloon(); }
  const out = balloonSpot.out;
  teleport({ x: balloonSpot.x + out.x * 2.6, z: balloonSpot.z + out.z * 2.6 });
  startAmbush();
}

/* ---------- Each frame, and runs ---------- */
function updateShowdown(dt) {
  if (!showdownKit) return;
  const k = showdownKit;
  if (showdown.stage === 'fight') {
    fight.invuln = Math.max(0, fight.invuln - dt);
    if (fight.knocked) updateKnocked(dt);
    updateTetoFight(dt);
    updateStrikes(dt);
    updateBullets(dt);
    swordFlames(dt);
    wolfAttack.cooldown = Math.max(wolfAttack.cooldown, 30);
  }
  // Hurt, she limps: the view dips with every other step.
  if (showdown.injured && player.stride > 0.05) player.shake = Math.max(player.shake, 0.02);
  k.flames.update(dt);
  k.sparks.update(dt);
  k.smoke.update(dt);
}

function resetShowdown() {
  if (!showdownKit) return;
  const k = showdownKit;
  if (activeScene && showdownScene) endScene();
  showdownScene = null;
  Object.assign(showdown, { stage: 'none', hp: SHOWDOWN.teto.hp, hits: 0, knocks: 0, injured: false });
  setShortHair(false);
  showSwords(false);
  leaveArena();
  k.teto.setVisible(false);
  k.mound.visible = false;
  for (const f of k.fairies) f.sprite.visible = false;
  for (const hole of k.holes) hole.parent && hole.parent.remove(hole);
  k.holes.length = 0;
  balloon.sag = 0;
  $('boss-bar').classList.add('hidden');
  $('boss-hint').classList.add('hidden');
  $('boss-fade').classList.remove('on');
  $('end-part').classList.add('hidden');
  document.body.classList.remove('boss-fight');
}

function initShowdown() {
  buildShowdownDom();
  showdownKit = buildShowdownKit();
  // The swords are warm to hold.
  HEAT_SOURCES.push(() => (arenaActive() ? 25 : 0));
  resetShowdown();
}
