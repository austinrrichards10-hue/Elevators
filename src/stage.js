// Performing: busking in the square with a crowd gathering round, and the stages, from an
// eighty-person basement to an arena. The lights, the crowd and its penlights, the group
// dancing beside her, the cameras cutting on the beat, and the result at the end. Also the
// way here, by balloon across the sea, and the last night of all: the Tokyo Dome.

const STAGES = {
  club: { w: 16, d: 22, h: 7, stage: [8, 4], crowd: 110, wall: 0x14121c, screen: true },
  roof: { open: true, crowd: 220, stage: [10, 5] },
  hall: { w: 30, d: 36, h: 12, stage: [12, 6], crowd: 260, wall: 0x1c1e2a, screen: true },
  studio: { w: 20, d: 18, h: 8, stage: [10, 5], crowd: 60, wall: 0x101420, screen: true, studio: true },
  fest: { open: true, crowd: 340, stage: [16, 7], fireworks: true },
  arena: { w: 70, d: 90, h: 26, stage: [20, 9], crowd: 420, wall: 0x0a0b12, screen: true, seats: 9000 },
};
const STAGE_AT = { x: 2400, z: 0 }; // indoor sets are built out here, away from the streets

const show = { active: null };

/* ---------- Building a stage ---------- */
function buildStageSet(style, at, cap) {
  const S = STAGES[style] || STAGES.club;
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.z);
  city.group.add(g);
  // Indoors the sky's light doesn't reach: the stage lights do the work.
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, envMapIntensity: S.open ? 1 : 0.06, ...extra });
  const [sw, sd] = S.stage;
  // The room.
  if (!S.open) {
    const room = new THREE.Mesh(new THREE.BoxGeometry(S.w, S.h, S.d).translate(0, S.h / 2, 0), std(S.wall, { side: THREE.BackSide }));
    g.add(room);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S.open ? 60 : S.w, S.open ? 60 : S.d).rotateX(-Math.PI / 2), std(S.open ? 0x3a3c44 : 0x1a1a22));
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  g.add(floor);
  // The stage at the far end (+z), its front edge lit.
  const stageZ = (S.open ? 14 : S.d / 2) - sd / 2 - 0.5;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(sw, 1, sd), std(0x16161c, { metalness: 0.3 }));
  deck.position.set(0, 0.5, stageZ);
  deck.receiveShadow = true;
  g.add(deck);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x39d5c8).multiplyScalar(2), toneMapped: false }));
  edge.position.set(0, 1.0, stageZ - sd / 2);
  g.add(edge);
  // A screen behind them.
  let screen = null;
  if (S.screen || S.open) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.95, sw * 0.42), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(0, 1 + sw * 0.25, stageZ + sd / 2 - 0.1);
    m.rotation.y = Math.PI;
    g.add(m);
    screen = { canvas: c, tex, mesh: m };
  }
  // Truss and lights: beams of coloured light swinging down over the stage and the crowd.
  const beams = [];
  const beamGeo = new THREE.ConeGeometry(1.2, 9, 16, 1, true).translate(0, -4.5, 0);
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x39d5c8, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const b = new THREE.Mesh(beamGeo, mat);
    b.position.set(-sw / 2 + (i + 0.5) * (sw / 8), S.open ? 9 : Math.min(S.h - 0.5, 8), stageZ - sd / 2 + 1);
    g.add(b);
    beams.push(b);
  }
  // The crowd, facing the stage.
  const crowdN = Math.min(S.crowd, Math.max(6, Math.round(cap * 0.9)));
  const crowd = buildCrowdIn(g, crowdN);
  const front = stageZ - sd / 2 - 2;
  const rand = seededRandom(cap);
  for (let i = 0; i < crowdN; i++) {
    const p = addPerson(crowd, randomLook(rand));
    const row = Math.floor(i / Math.max(6, Math.round(sw * 1.1)));
    const perRow = Math.max(6, Math.round(sw * 1.1));
    p.x = -sw * 0.55 + ((i % perRow) + rand() * 0.5) * (sw * 1.1 / perRow) - row * 0.2 * (row % 2);
    p.z = front - row * 0.9 - rand() * 0.3;
    p.yaw = 0;
    p.light = i % 2 === 0;
  }
  // Penlights: a sea of little lights, in the crowd and (in an arena) in the stands.
  const lightCount = crowdN + (S.seats || 0);
  const pos = new Float32Array(lightCount * 3), col = new Float32Array(lightCount * 3);
  for (let i = 0; i < crowdN; i++) { const p = crowd.people[i]; pos.set([p.x + 0.25, 2.05, p.z], i * 3); }
  for (let i = crowdN; i < lightCount; i++) {
    // The stands: tiers rising round the arena floor.
    const a = (rand() - 0.5) * Math.PI * 1.6 + Math.PI, tier = rand();
    const r = 26 + tier * 14;
    pos.set([Math.sin(a) * r * 0.9, 3 + tier * 14, stageZ - 10 + Math.cos(a) * r], i * 3);
  }
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  lgeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lights = new THREE.Points(lgeo, new THREE.PointsMaterial({ size: 0.35, map: TEX.softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  lights.frustumCulled = false;
  g.add(lights);
  if (S.seats) {
    // The stands themselves, in shadow under the lights.
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(42, 28, 18, 48, 1, true, Math.PI * 0.2, Math.PI * 1.6).translate(0, 9, 0), std(0x16171f, { side: THREE.DoubleSide }));
    stand.position.z = stageZ - 10;
    g.add(stand);
  }
  // The group's other three, once she's in it.
  const band = has('joined') ? buildCrowdIn(g, 3) : null;
  if (band) for (const [k, x] of [['aoi', -2.4], ['kotone', 2.4], ['mirai', -4.6]]) { const p = addPerson(band, LOOKS[k]); p.x = x; p.z = stageZ + 0.6; p.yaw = Math.PI; p.bob = 1; }
  // A soft fill light, so faces read.
  const fill = new THREE.PointLight(0xc8e8ff, 0, 30, 1.4);
  fill.position.set(0, 6, stageZ - 6);
  g.add(fill);
  return { g, S, beams, crowd, band, lights, screen, stageZ, sd, sw, fill, front };
}

function buildCrowdIn(parent, n) {
  const saved = city.group;
  city.group = parent;
  const c = buildCrowd(n);
  city.group = saved;
  return c;
}

/* ---------- Busking ---------- */
// Singing out in the city: a crowd gathers round her, Haru plays (once she's met him).
function startBusk(opts) {
  const at = opts.where === 'beach' ? { x: -26, z: -142 } : opts.where === 'park' ? { x: -6, z: 64 } : { x: 2, z: -20 };
  const set = { g: new THREE.Group(), crowd: null, beams: [], lights: null, open: true, busk: true };
  city.group.add(set.g);
  set.crowd = buildCrowdIn(set.g, opts.crowd);
  for (let i = 0; i < opts.crowd; i++) {
    const p = addPerson(set.crowd, randomLook());
    const a = Math.PI + (i / opts.crowd - 0.5) * 2.2, r = 3.2 + (i % 3) * 0.9 + Math.random() * 0.4;
    p.x = at.x + Math.sin(a) * r; p.z = at.z + Math.cos(a) * r + 2;
    p.yaw = Math.atan2(at.x - p.x, at.z - p.z);
    p.scale = 0.0001; p.arrive = i * 0.35;
  }
  runPerformance({ ...opts, at: { x: at.x, z: at.z, yaw: Math.PI }, set, kind: 'busk', name: opts.title || 'Busking' }, opts.after);
}

/* ---------- Gigs ---------- */
function startGig(v, after) {
  const style = v.style || 'club';
  const S = STAGES[style];
  const at = S.open ? (style === 'fest' ? { x: 70, z: -150 } : { x: 96, z: -140 }) : STAGE_AT;
  const set = buildStageSet(style, at, v.cap);
  set.style = style;
  runPerformance({ ...v, set, at: { x: at.x, z: at.z + set.stageZ - 0.2, yaw: Math.PI }, kind: 'gig' }, after);
}

// The show itself: lights down, a cheer, the song, the bow, the result.
function runPerformance(opts, after) {
  const back = { x: player.pos.x, z: player.pos.z, yaw: player.yaw };
  const set = opts.set;
  player.pos.set(opts.at.x, CITY.y + (set.busk ? 0 : 1.0), opts.at.z);
  player.bodyYaw = player.yaw = opts.at.yaw + Math.PI;
  Sfx.playMusic(null);
  const P = { t: 0, phase: 'intro', res: null, shot: 0, beat: 0, flash: 0, hype: 0.5, set, opts, after, back, energy: 0 };
  show.active = P;
  document.body.classList.add('on-stage');
  caption(`${opts.name}${opts.kind === 'gig' ? ` · ${(opts.cap || 0).toLocaleString()} people` : ''}`, 'place');
  Sfx.cheer(set.busk ? 0.4 : 1);
  playScene({ update: (dt) => updatePerformance(dt) });
}

function updatePerformance(dt) {
  const P = show.active;
  if (!P) return;
  P.t += dt;
  const set = P.set;
  updateCityAmbient(dt);
  // The crowd gathers (busking) or is already there.
  for (const p of set.crowd.people) {
    if (p.arrive !== undefined) { if (P.t > p.arrive) p.scale = Math.min(p.look.scale, p.scale + dt * 2); }
    p.bob = P.phase === 'song' ? Math.abs(Math.sin(P.beat * Math.PI)) * 0.06 : 0;
    p.cheer = P.phase === 'outro' || (P.phase === 'song' && P.hype > 0.75 && (p.i % 3 === 0)) ? 1 : 0;
  }
  poseCrowd(set.crowd, dt);
  if (set.band) { for (const p of set.band.people) { p.bob = Math.abs(Math.sin(P.beat * Math.PI)) * 0.08; p.cheer = P.phase === 'song' && Math.floor(P.beat / 8) % 2 ? 1 : 0; } poseCrowd(set.band, dt); }
  if (P.phase === 'intro' && P.t > 2.6) {
    P.phase = 'song';
    caption('');
    P.r = startRhythm({
      song: P.opts.song, difficulty: P.opts.difficulty, level: 0.8,
      onHit: (lane, j) => { if (j !== 'miss') P.flash = 1; P.hype = rhythm.active ? rhythm.active.hype : P.hype; },
      onEnd: (res) => { P.res = res; P.phase = 'outro'; P.t = 0; Sfx.cheer(set.busk ? 0.6 : 1.3); },
    });
  }
  if (P.phase === 'song' && rhythm.active) { const m = rhythm.active.music; P.beat = Math.max(0, m.time() / m.beat); P.hype = rhythm.active.hype; }
  updateRhythm();
  P.flash = Math.max(0, P.flash - dt * 4);
  // Lights: swinging on the beat, colours cycling through her teal, white and pink.
  const hues = [0.48, 0.0, 0.92, 0.55];
  set.beams.forEach((b, i) => {
    b.rotation.z = Math.sin(P.beat * Math.PI * 0.5 + i) * 0.5;
    b.rotation.x = 0.35 + Math.sin(P.beat * Math.PI * 0.25 + i * 0.7) * 0.25;
    b.material.color.setHSL(hues[(Math.floor(P.beat / 4) + i) % 4], 0.9, 0.6);
    b.material.opacity = P.phase === 'song' ? 0.1 + P.flash * 0.12 + (Math.floor(P.beat) % 2 ? 0.04 : 0) : 0.05;
  });
  if (set.fill) set.fill.intensity = P.phase === 'song' ? 4 + P.flash * 4 : 2;
  // Penlights waving in time, teal for her.
  if (set.lights) {
    const pos = set.lights.geometry.attributes.position.array, col = set.lights.geometry.attributes.color.array, n = pos.length / 3;
    const wave = P.phase === 'song' ? 1 : 0.4;
    for (let i = 0; i < n; i++) {
      const s = Math.sin(P.beat * Math.PI + i * 0.37) * 0.25 * wave;
      pos[i * 3 + 1] += (s - (col[i * 3 + 2] > 0 ? (pos[i * 3 + 1] % 1) * 0 : 0)) * 0.05;
      const on = P.phase === 'song' || P.phase === 'outro' ? 1 : 0.4;
      col.set([0.22 * on * 2.2, 0.84 * on * 2.2, 0.78 * on * 2.2], i * 3);
    }
    set.lights.geometry.attributes.position.needsUpdate = true;
    set.lights.geometry.attributes.color.needsUpdate = true;
  }
  // The screen behind: the group's name, pulsing.
  if (set.screen && Math.floor(P.t * 8) !== P.lastScreen) {
    P.lastScreen = Math.floor(P.t * 8);
    const g = set.screen.canvas.getContext('2d');
    g.fillStyle = '#04101a'; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 16; i++) { g.fillStyle = `hsla(${170 + i * 6},80%,55%,${0.12 + 0.1 * Math.sin(P.beat + i)})`; g.fillRect((i * 40 + P.beat * 20) % 512, 0, 18, 256); }
    g.fillStyle = '#e6fffb'; g.font = 'bold 70px sans-serif'; g.textAlign = 'center';
    g.fillText(has('joined') ? G() : 'MIKU', 256, 130);
    g.font = '24px sans-serif'; g.fillText(SONGS[P.opts.song].title, 256, 190);
    set.screen.tex.needsUpdate = true;
  }
  // Fireworks over a festival.
  if (set.S && set.S.fireworks && P.phase !== 'intro' && Math.random() < dt * (P.phase === 'outro' ? 3 : 0.8)) {
    const at = new THREE.Vector3(set.g.position.x + (Math.random() - 0.5) * 30, CITY.y + 18 + Math.random() * 10, set.g.position.z + 20 + Math.random() * 10);
    burst(at, [0x39d5c8, 0xff8ab8, 0xffd36a, 0xffffff][Math.floor(Math.random() * 4)], 60, 9);
    Sfx.boom(0.15);
  }
  mikuDance(dt, P.beat, P.phase === 'song' ? 1 : P.phase === 'outro' ? 0.4 : 0.2, P.phase === 'outro' && P.t < 2.5);
  stageCamera(dt, P);
  if (P.phase === 'outro' && P.t > 3 && !P.resultShown) { P.resultShown = true; showResult(P); }
}

// Miku dancing: bouncing on the beat, swaying, arms up on the chorus, a bow at the end.
function mikuDance(dt, beat, energy, bow = false) {
  poseAvatar(dt, cityV.set(0, 0, 0), false);
  const { hips, chest, head, armL, armR } = avatar;
  const b = beat * Math.PI;
  if (bow) {
    chest.rotation.x += 0.7;
    head.rotation.x += 0.3;
  } else {
    hips.position.y += Math.abs(Math.sin(b)) * 0.05 * energy;
    hips.rotation.y = Math.sin(b * 0.5) * 0.25 * energy;
    chest.rotation.z = Math.sin(b * 0.5) * 0.12 * energy;
    head.rotation.z = Math.sin(b * 0.5 + 0.5) * 0.1 * energy;
  }
  avatar.root.updateMatrixWorld(true);
  const sh = armL.upper.position;
  const bar = Math.floor(beat / 4) % 4;
  if (energy > 0.5 && !bow) {
    // Different moves for different bars: a point to the crowd, both hands up, a wave.
    const s = Math.sin(b);
    if (bar === 0) { solveArm(armR, sdV.set(-Math.abs(sh.x) - 0.15, sh.y + 0.25 + s * 0.08, 0.38), POLE_R); solveArm(armL, sdV.set(Math.abs(sh.x) + 0.05, sh.y - 0.4, 0.1), POLE_L); }
    else if (bar === 1) { solveArm(armR, sdV.set(-Math.abs(sh.x) - 0.2, sh.y + 0.5, 0.05 + s * 0.05), POLE_R); solveArm(armL, sdV.set(Math.abs(sh.x) + 0.2, sh.y + 0.5, 0.05 - s * 0.05), POLE_L); }
    else if (bar === 2) { solveArm(armR, sdV.set(-Math.abs(sh.x) - 0.3 - s * 0.15, sh.y + 0.35, 0.15), POLE_R); solveArm(armL, sdV.set(Math.abs(sh.x) + 0.05, sh.y - 0.35, 0.15), POLE_L); }
    else { solveArm(armR, sdV.set(-0.08, sh.y + 0.1 + s * 0.05, 0.3), POLE_R); solveArm(armL, sdV.set(0.08, sh.y + 0.1 - s * 0.05, 0.3), POLE_L); }
  } else if (bow) {
    solveArm(armR, sdV.set(-Math.abs(sh.x), sh.y - 0.5, 0.1), POLE_R);
    solveArm(armL, sdV.set(Math.abs(sh.x), sh.y - 0.5, 0.1), POLE_L);
  }
  armL.hand.quaternion.identity();
  armR.hand.quaternion.identity();
  avatar.simulate(dt);
}

// Cameras cutting every two bars: the crowd's view, close on her, the side, high and wide.
function stageCamera(dt, P) {
  const at = player.pos, cut = Math.floor(P.beat / 8) % 5, set = P.set;
  const look = cityP.set(at.x, at.y + 1.3, at.z);
  if (P.phase === 'intro') camera.position.set(at.x + Math.sin(P.t * 0.3) * 2, at.y + 1.6, at.z - 8 + P.t * 1.2);
  else if (P.phase === 'outro') camera.position.set(at.x, at.y + 1.5, at.z - 4.5);
  else if (cut === 0) camera.position.set(at.x, at.y + 2, at.z - (set.busk ? 6 : 10));
  else if (cut === 1) { camera.position.set(at.x + 0.8, at.y + 1.1, at.z - 2.4); look.y -= 0.1; }
  else if (cut === 2) camera.position.set(at.x + 6, at.y + 1.6, at.z - 2);
  else if (cut === 3) camera.position.set(at.x + Math.sin(P.beat * 0.1) * 8, at.y + 7, at.z - 9);
  else camera.position.set(at.x - 4, at.y + 0.6, at.z - 3.5);
  camera.lookAt(look);
  setFov(cut === 3 ? 60 : 48);
}

/* ---------- Results ---------- */
function showResult(P) {
  const res = P.res, o = P.opts;
  const mult = { S: 1.3, A: 1.1, B: 1, C: 0.85, D: 0.6 }[res.grade];
  const fame = Math.round((o.fame || 50) * (0.35 + res.accuracy * 0.9) * mult * (1 + res.hype * 0.2));
  const yen = o.kind === 'gig' ? Math.round((o.cap || 50) * 12 * (0.5 + res.accuracy)) : Math.round(200 + res.accuracy * 800);
  P.fame = fame; P.yen = yen;
  const el = $('gig-result');
  el.innerHTML = `<p class="gr-kicker">${o.name}</p><div class="gr-grade g${res.grade}">${res.grade}</div>
    <dl><div><dt>Accuracy</dt><dd>${Math.round(res.accuracy * 100)}%</dd></div><div><dt>Best combo</dt><dd>${res.maxCombo}</dd></div>
    <div><dt>Perfect / Great / Good / Miss</dt><dd>${res.perfect} / ${res.great} / ${res.good} / ${res.miss}</dd></div>
    <div><dt>Fame</dt><dd>+${fame.toLocaleString()}</dd></div><div><dt>${o.kind === 'gig' ? 'Pay' : 'Tips'}</dt><dd>¥${yen.toLocaleString()}</dd></div></dl>
    <p class="gr-next">Press E to continue</p>`;
  el.classList.remove('hidden');
  P.waiting = true;
}

addEventListener('keydown', (e) => {
  const P = show.active;
  if (!P || !P.waiting || e.repeat) return;
  if (e.code !== 'KeyE' && e.code !== 'Space' && e.code !== 'Enter') return;
  e.preventDefault();
  finishPerformance();
});

function finishPerformance() {
  const P = show.active;
  if (!P) return;
  $('gig-result').classList.add('hidden');
  document.body.classList.remove('on-stage');
  city.group.remove(P.set.g);
  P.set.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  show.active = null;
  player.pos.set(P.back.x, CITY.y, P.back.z);
  player.yaw = player.bodyYaw = P.back.yaw;
  endScene();
  Sfx.playMusic('city');
  if (P.fame) { addFame(P.fame, P.opts.kind === 'gig' ? P.opts.name : 'busking'); addYen(P.yen); }
  if (P.after) P.after(P.res);
  saveGame();
}

/* ---------- The voyage ---------- */
// Leaving the crater behind: up through the clouds, out over the sea for a long while, and
// then a coastline, a city without end, and a beach to come down on.
const VOYAGE = { sea: 4, city: 16, descend: 30, land: 38, end: 42 };
function startVoyage() {
  buildCity();
  city.group.visible = true;
  world.setGroundHidden(true);
  const balloon = balloonModel.group.clone(true);
  // The original is hidden as it leaves the crater; this copy is the one that crosses the sea.
  balloon.visible = true;
  balloon.position.set(0, 0, 0);
  city.group.add(balloon);
  const V = { t: 0, balloon, fired: {} };
  // The city keeps the time of day from here on.
  city.active = true;
  document.body.classList.add('cinematic');
  $('hud').classList.add('hidden');
  game.state = 'scene';
  const once = (k, at, fn) => { if (!V.fired[k] && V.t >= at) { V.fired[k] = true; fn(); } };
  Sfx.playMusic(null);
  dayNight.t = Math.floor(dayNight.t) + 6.2 / 24; // dawn over the sea
  playScene({
    update(dt) {
      V.t += dt;
      const t = V.t;
      updateCityAmbient(dt);
      // The balloon's path: far out over the sea, drifting in towards the beach.
      const u = clamp(t / VOYAGE.land, 0, 1);
      const z = lerp(-900, CITY.landing.z, smooth(u));
      const alt = lerp(70, 0, smooth(clamp((t - VOYAGE.descend) / (VOYAGE.land - VOYAGE.descend), 0, 1)));
      balloon.position.set(lerp(-60, CITY.landing.x, smooth(u)), alt, z);
      balloon.rotation.y = Math.sin(t * 0.2) * 0.2;
      // Clear air over the sea, so the skyline shows from far out.
      scene.fog.density = lerp(0.0009, 0.003, smooth(u));
      // Dawn coming up over the water as they go.
      dayNight.t = Math.floor(dayNight.t) + lerp(6.2, 8.5, u) / 24;
      updateSky(dt);
      const B = balloon.position;
      if (t < VOYAGE.city) { camera.position.set(B.x + 22, CITY.y + B.y + 6, B.z - 18); camera.lookAt(B.x, CITY.y + B.y + 6, B.z); }
      else if (t < VOYAGE.descend) { camera.position.set(B.x - 30 + (t - VOYAGE.city), CITY.y + B.y + 20, B.z - 40); camera.lookAt(B.x, CITY.y + B.y, B.z + 120); }
      else { camera.position.set(B.x + 14, CITY.y + 2 + B.y * 0.5, B.z - 16); camera.lookAt(B.x, CITY.y + B.y + 4, B.z); }
      setFov(50);
      once('c1', 1, () => caption('Days later. Somewhere over the sea.', 'place'));
      once('c2', 5, () => caption('(The crater is gone behind the clouds. So is Teto. So is everything.)', 'thought'));
      once('c3', 10, () => caption('(I have no map. No food left. Just wind, and water, and the burner hissing.)', 'thought'));
      once('c4', VOYAGE.city, () => { caption('Land.', 'place'); Sfx.dawnChime(); });
      once('c5', VOYAGE.city + 4, () => caption('(A city. A city that goes on and on, all the way to the edge of the sky.)', 'thought'));
      once('c6', VOYAGE.descend, () => caption('(Down. Gently. Please, gently...)', 'thought'));
      once('land', VOYAGE.land, () => { caption(''); Sfx.snowSlam(); burst(new THREE.Vector3(B.x, CITY.y + 0.4, B.z), 0xe6d3a8, 40, 5); });
      once('fade', VOYAGE.land + 1.5, () => $('sleep-fade').classList.add('on'));
      if (t >= VOYAGE.end) {
        endScene();
        $('sleep-fade').classList.remove('on');
        balloon.position.set(CITY.landing.x - 4, 0, CITY.landing.z - 3);
        city.balloon = balloon;
        game.state = 'playing';
        enterCity({ x: CITY.landing.x + 1, z: CITY.landing.z + 3, yaw: 0 });
        $('hud').classList.remove('hidden');
        showdown.stage = 'city';
        lockPointer();
        say('Solid ground. Sand. And... someone\'s coming over.', 3.5);
        saveGame();
      }
    },
  });
}

/* ---------- The Tokyo Dome ---------- */
const DOME_AT = { x: 4200, z: 0 };
function goToDome() {
  const D = { t: 0, fired: {}, phase: 'outside' };
  show.dome = D;
  Sfx.playMusic(null);
  dayNight.t = Math.floor(dayNight.t) + 20.6 / 24;
  const set = buildDomeSet();
  D.set = set;
  const back = { x: player.pos.x, z: player.pos.z };
  D.back = back;
  document.body.classList.add('on-stage');
  $('sleep-fade').classList.add('on');
  setTimeout(() => $('sleep-fade').classList.remove('on'), 900);
  player.pos.set(DOME_AT.x, CITY.y + 1.2, DOME_AT.z + set.stageZ);
  player.yaw = player.bodyYaw = 0;
  playScene({ update: (dt) => updateDome(dt) });
}

function buildDomeSet() {
  const g = new THREE.Group();
  g.position.set(DOME_AT.x, 0, DOME_AT.z);
  city.group.add(g);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, envMapIntensity: 0.05, ...extra });
  // The bowl: a vast roof overhead, the stands all round, the field in the middle.
  const roof = new THREE.Mesh(new THREE.SphereGeometry(110, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0x0a0b12, { side: THREE.BackSide }));
  roof.scale.y = 0.35;
  g.add(roof);
  const field = new THREE.Mesh(new THREE.CircleGeometry(110, 48).rotateX(-Math.PI / 2), std(0x101218));
  g.add(field);
  const stands = new THREE.Mesh(new THREE.CylinderGeometry(108, 60, 26, 64, 1, true).translate(0, 13, 0), std(0x14151e, { side: THREE.DoubleSide }));
  g.add(stands);
  // The main stage at one end, a long runway out to a centre stage, and Teto's stage opposite.
  const stageZ = 40;
  const deck = (w, d, x, z, h = 1.2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(0x1a1a22, { metalness: 0.4 })); m.position.set(x, h / 2, z); g.add(m); return m; };
  deck(34, 12, 0, stageZ);
  deck(4, 60, 0, 10);
  deck(12, 12, 0, -14);
  deck(20, 10, 0, -40);
  const edgeMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.5), toneMapped: false });
  const teal = edgeMat(0x39d5c8), red = edgeMat(0xff2d55);
  for (const [w, x, z, m] of [[34, 0, stageZ - 6, teal], [4, 0, -20, teal], [20, 0, -35, red]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), m); e.position.set(x, 1.22, z); g.add(e); }
  // Giant screens either side of the main stage.
  const screens = [];
  for (const s of [-1, 1]) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 288;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 12.4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(s * 30, 14, stageZ + 4); m.rotation.y = Math.PI + s * 0.3;
    g.add(m);
    screens.push({ canvas: c, tex });
  }
  // Fifty-five thousand penlights: the field and the stands, every one a point of light.
  const n = 24000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seat = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i < 6000) { x = (Math.random() - 0.5) * 70; z = -60 + Math.random() * 90; if (Math.abs(x) < 4 || (Math.abs(x) < 8 && z < -8 && z > -20)) x += Math.sign(x || 1) * 6; y = 2; }
    else {
      // Round the stands, except behind the main stage.
      let a = 0;
      do { a = Math.random() * Math.PI * 2; } while (Math.cos(a) > 0.55);
      const r = 62 + Math.random() * 44; x = Math.sin(a) * r; z = Math.cos(a) * r; y = 3 + (r - 62) * 0.55;
    }
    pos.set([x, y, z], i * 3);
    seat[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lights = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, map: TEX.softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  lights.frustumCulled = false;
  g.add(lights);
  // Lasers and beams from the roof.
  const lasers = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 140, 6, 1, true).translate(0, -70, 0), new THREE.MeshBasicMaterial({ color: 0x39d5c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set((i - 7.5) * 4, 36, stageZ - 2);
    g.add(m);
    lasers.push(m);
  }
  const beamGeo = new THREE.ConeGeometry(3, 30, 18, 1, true).translate(0, -15, 0);
  const beams = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set((i - 4.5) * 7, 30, stageZ - 4);
    g.add(m);
    beams.push(m);
  }
  const band = buildCrowdIn(g, 3);
  for (const [k, x] of [['aoi', -3], ['kotone', 3], ['mirai', -5.5]]) { const p = addPerson(band, LOOKS[k]); p.x = x; p.z = stageZ - 1; p.yaw = Math.PI; }
  const fill = new THREE.PointLight(0xd0f0ff, 0, 60, 1.2);
  fill.position.set(0, 14, stageZ - 14);
  g.add(fill);
  const tetoLight = new THREE.PointLight(0xff3d6a, 0, 40, 1.4);
  g.add(tetoLight);
  // Confetti for the last chorus: thousands of scraps of teal, pink, white and gold.
  const cn = 2600, cpos = new Float32Array(cn * 3), ccol = new Float32Array(cn * 3), cvel = new Float32Array(cn * 3);
  const cc = [[0.22, 0.84, 0.78], [1, 0.54, 0.72], [1, 1, 1], [1, 0.85, 0.4]];
  for (let i = 0; i < cn; i++) { cpos.set([0, -50, 0], i * 3); ccol.set(cc[i % 4].map((v) => v * 1.6), i * 3); }
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  cgeo.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
  const confetti = new THREE.Points(cgeo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, toneMapped: false }));
  confetti.frustumCulled = false;
  g.add(confetti);
  // Flame cannons along the front of the stage.
  const flames = buildPuffs(240, 0xff9a40);
  flames.group.children[0].material.uniforms.diffuse.value.multiplyScalar(2.4);
  scene.add(flames.group);
  // Smoke for Teto's entrance, and a red spotlight that finds her.
  const smoke = buildPuffs(120, 0x3a2a34);
  scene.add(smoke.group);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(4, 40, 24, 1, true).translate(0, -20, 0), new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  spot.position.set(0, 36, -40);
  g.add(spot);
  return { g, stageZ, screens, lights, seat, lasers, beams, band, fill, tetoLight, confetti, cvel, flames, smoke, spot };
}

// The night: the crowd outside, the walk up from under the stage, the song of her life, and
// then the lights go red.
const DOME = { rise: 7, song: 12, after: 0, teto: 0 };
function updateDome(dt) {
  const D = show.dome, S = D.set;
  D.t += dt;
  const t = D.t;
  const once = (k, at, fn) => { if (!D.fired[k] && t >= at) { D.fired[k] = true; fn(); } };
  updateCityAmbient(dt);
  S.flames.update(dt);
  S.smoke.update(dt);
  updateConfetti(dt, S);
  // Outside first: the Dome lit up against the night, searchlights, fireworks, the queue.
  if (D.phase === 'outside') {
    once('o1', 0.2, () => { caption('Tonight. The Idol Summit.', 'place'); Sfx.cheer(0.8); });
    once('o2', 3.2, () => caption(`${G()}  ×  TETO`, 'place'));
    const dome = city.domeFar.position;
    // The crowd at the gates, penlights already lit.
    if (!D.queue) {
      D.queue = buildCrowdIn(city.group, 120);
      for (let i = 0; i < 120; i++) { const p = addPerson(D.queue, randomLook()); p.x = dome.x + (Math.random() - 0.5) * 80; p.z = dome.z - 120 - Math.random() * 30; p.yaw = 0; p.cheer = Math.random() < 0.4 ? 1 : 0; }
    }
    poseCrowd(D.queue, dt);
    city.searchlights.forEach((m, i) => { m.material.opacity = 0.07; m.rotation.z = Math.sin(t * 0.7 + i * 1.3) * 0.45; m.rotation.x = Math.cos(t * 0.5 + i) * 0.25; });
    camera.position.set(dome.x + Math.sin(t * 0.12) * 50, CITY.y + 6 + t * 3.5, dome.z - 200 - t * 4);
    camera.lookAt(dome.x, CITY.y + 20, dome.z);
    setFov(55);
    if (Math.random() < dt * 3) burst(new THREE.Vector3(dome.x + (Math.random() - 0.5) * 160, CITY.y + 60 + Math.random() * 40, dome.z + (Math.random() - 0.5) * 80), [0x39d5c8, 0xff2d55, 0xffffff, 0xffd36a][Math.floor(Math.random() * 4)], 70, 14);
    if (Math.random() < dt * 2.5) Sfx.boom(0.12);
    if (t > 6.5) {
      D.phase = 'arrive'; D.t = 0; D.fired = {}; impact('black', 200);
      for (const m of Object.values(D.queue.meshes)) city.group.remove(m);
      for (const m of city.searchlights) m.material.opacity = 0;
    }
    return;
  }
  // Before the song: in the dark under the stage, a countdown on the screens, then rising into the light.
  if (D.phase === 'arrive') {
    if (t > 6.6 && t < DOME.rise + 0.5) D.count = Math.max(1, Math.ceil(DOME.rise + 0.5 - t));
    else D.count = 0;
    once('c5', 6.6, () => Sfx.cheer(1.2));
    once('go', DOME.rise + 0.4, () => { Sfx.boom(1); Sfx.cheer(2); domePyro(S, 1.4); });
    once('a1', 0.3, () => caption('The Tokyo Dome. Fifty-five thousand seats. Sold out in eleven minutes.', 'place'));
    once('a2', 3, () => caption('Aoi: "Count of eight. Like always."  Kotone: "I\'m going to cry. Not yet. Not yet!"  Mirai: "...Let\'s go."', 'thought'));
    once('a3', 5.5, () => { caption('(Old Gen\'s silver snowdrop, pinned over my heart.)', 'thought'); Sfx.cheer(1.5); });
    const rise = smooth(clamp((t - DOME.rise + 2) / 3, 0, 1));
    player.pos.y = CITY.y - 2.2 + rise * 3.4;
    mikuDance(dt, t * 2, 0.1);
    camera.position.set(DOME_AT.x + Math.sin(t * 0.2) * 6, CITY.y + 3 + t * 0.6, DOME_AT.z + S.stageZ - 14 - t * 1.5);
    camera.lookAt(player.pos.x, player.pos.y + 1.2, player.pos.z);
    setFov(55);
    domeLights(dt, D, t > DOME.rise ? 1 : 0.3, 'teal');
    if (t > DOME.song) {
      D.phase = 'song';
      caption('');
      D.r = startRhythm({ song: 'crown', difficulty: 0.8, level: 0.9, onHit: (l, j) => { if (j !== 'miss') D.flash = 1; }, onEnd: (res) => { D.res = res; D.phase = 'after'; D.t2 = 0; Sfx.cheer(2); } });
    }
  } else if (D.phase === 'song') {
    if (rhythm.active) {
      const m = rhythm.active.music;
      D.beat = m.time() / m.beat;
      // Flame cannons on the downbeat of every other bar of a chorus, confetti for the last one.
      const bar = Math.floor(D.beat / 4);
      if (bar !== D.lastBar) {
        D.lastBar = bar;
        const left = m.layout.beats / 4 - bar;
        if (rhythm.active.hype > 0.55 && bar % 2 === 0) domePyro(S, 1);
        if (left < 18 && !D.confetti) { D.confetti = true; launchConfetti(S); Sfx.boom(0.6); }
      }
    }
    updateRhythm();
    mikuDance(dt, D.beat || 0, 1);
    domeLights(dt, D, 1, 'teal');
    stageCamera(dt, { beat: D.beat || 0, phase: 'song', set: { busk: false }, t });
    if (Math.floor((D.beat || 0) / 8) % 5 === 3) { camera.position.set(DOME_AT.x + Math.sin(t * 0.1) * 40, CITY.y + 30, DOME_AT.z - 20); camera.lookAt(DOME_AT.x, CITY.y, DOME_AT.z + 20); setFov(62); }
    poseCrowd(S.band, dt);
  } else {
    // After the song: the cheer, and then the lights cut out. Red. Her laugh.
    D.t2 += dt;
    const u = D.t2;
    tetoDomeScene(dt, D, u);
  }
  if (S.band) { for (const p of S.band.people) { p.bob = Math.abs(Math.sin((D.beat || t * 2) * Math.PI)) * 0.08; p.cheer = D.phase === 'song' && Math.floor((D.beat || 0) / 8) % 2 ? 1 : 0; } poseCrowd(S.band, dt); }
  D.flash = Math.max(0, (D.flash || 0) - dt * 4);
}

// The lights, in her colour or in Teto's, or split between the two.
function domeLights(dt, D, level, mode) {
  const S = D.set, beat = D.beat || D.t * 2;
  const col = S.lights.geometry.attributes.color.array, pos = S.lights.geometry.attributes.position.array, n = col.length / 3;
  const split = mode === 'split' ? 1 : 0, red = mode === 'red' ? 1 : 0;
  // A wave rolling round the stands.
  for (let i = 0; i < n; i++) {
    const wave = 0.65 + 0.35 * Math.sin(beat * Math.PI * 0.5 + S.seat[i] * 6.28 + pos[i * 3] * 0.05);
    const tetoSide = red || (split && pos[i * 3 + 2] < -5);
    const b = level * wave * 2.2;
    if (tetoSide) col.set([1.0 * b, 0.18 * b, 0.32 * b], i * 3);
    else col.set([0.22 * b, 0.84 * b, 0.78 * b], i * 3);
  }
  S.lights.geometry.attributes.color.needsUpdate = true;
  S.lasers.forEach((m, i) => {
    m.material.opacity = level > 0.6 ? 0.35 + (D.flash || 0) * 0.3 : 0;
    m.material.color.setHex(red ? 0xff2d55 : i % 2 ? 0x39d5c8 : 0xffffff);
    m.rotation.z = Math.sin(beat * Math.PI * 0.25 + i * 0.4) * 0.6;
    m.rotation.x = -0.5 + Math.sin(beat * Math.PI * 0.125 + i) * 0.3;
  });
  S.beams.forEach((m, i) => {
    m.material.opacity = level * (0.03 + (D.flash || 0) * 0.05);
    m.material.color.setHex(red ? 0xff3d6a : 0xd8fff8);
    m.rotation.z = Math.sin(beat * Math.PI * 0.5 + i) * 0.4;
  });
  S.fill.intensity = level * (6 + (D.flash || 0) * 6);
  // Fireworks off the stage on the big moments.
  if (level > 0.8 && !red && Math.random() < dt * (D.phase === 'after' ? 4 : 0.7)) {
    burst(new THREE.Vector3(DOME_AT.x + (Math.random() - 0.5) * 34, CITY.y + 2 + Math.random() * 3, DOME_AT.z + S.stageZ + 2), [0x39d5c8, 0xffffff, 0xb4fff2][Math.floor(Math.random() * 3)], 40, 10);
  }
  // The screens: her face, then Teto's.
  if (Math.floor(D.t * 6) !== D.lastScreen) {
    D.lastScreen = Math.floor(D.t * 6);
    for (const sc of S.screens) {
      const g = sc.canvas.getContext('2d');
      g.fillStyle = red ? '#12020a' : '#031014'; g.fillRect(0, 0, 512, 288);
      g.fillStyle = red ? '#ff2d55' : '#c8fff6'; g.font = 'bold 90px sans-serif'; g.textAlign = 'center';
      if (D.count) { g.font = 'bold 200px sans-serif'; g.fillText(String(D.count), 256, 210); sc.tex.needsUpdate = true; continue; }
      g.fillText(red ? 'TETO' : 'MIKU', 256, 160);
      g.font = '24px sans-serif'; g.fillStyle = '#fff'; g.fillText(red ? 'CRIMSON RECORDS' : G(), 256, 215);
      sc.tex.needsUpdate = true;
    }
  }
}

// Teto rises at the far end of the runway, and they meet in the middle.
function tetoDomeScene(dt, D, u) {
  const S = D.set, T = showdownKit.teto, t = fight.teto;
  const once = (k, at, fn) => { if (!D.fired[k] && u >= at) { D.fired[k] = true; fn(); } };
  once('result', 0.1, () => {
    const r = D.res;
    caption(`Crown of Light · ${r.grade} · ${Math.round(r.accuracy * 100)}% · the Dome is on its feet`, 'place');
    addFame(6000 * (0.4 + r.accuracy), 'the Tokyo Dome');
  });
  // The cheer, and then: black.
  if (u < 5) { domeLights(dt, D, 1, 'teal'); mikuDance(dt, u * 2.5, 0.5, u < 2); camera.position.set(DOME_AT.x, CITY.y + 4, DOME_AT.z + S.stageZ - 20); camera.lookAt(player.pos.x, player.pos.y + 1.2, player.pos.z); return; }
  once('dark', 5, () => { caption(''); Sfx.boom(1.2); impact('black', 400); Sfx.tetoLaugh(); });
  once('red', 6.2, () => { caption('"Not bad, snowflake. NOT BAD."', 'crimson'); Sfx.stinger(); Sfx.boom(1); });
  // Teto's stage lights up red; she rises on it, red penlights flooding half the bowl.
  T.setVisible(true);
  const rise = smooth(clamp((u - 6.5) / 2.5, 0, 1));
  const walk = smooth(clamp((u - 10) / 7, 0, 1));
  t.pos.set(DOME_AT.x, CITY.y + 1.2 + (1 - rise) * -2.5, DOME_AT.z + lerp(-40, -16, walk));
  t.yaw = 0;
  t.walk = t.walk || 0;
  poseTeto(dt, walk > 0 && walk < 1 ? 'idle' : u > 18 ? 'point' : 'idle', player.pos.clone().add(cityV.set(0, 1.4, 0)), { speed: walk > 0 && walk < 1 ? 2 : 0 });
  S.tetoLight.position.set(t.pos.x - DOME_AT.x, 5, t.pos.z - DOME_AT.z);
  S.tetoLight.intensity = rise * 18;
  // Smoke pouring off her stage as it rises, a red spotlight finding her, sparks off the drills.
  if (u > 6 && u < 11 && Math.random() < dt * 30) S.smoke.emit(cityV.set(DOME_AT.x + (Math.random() - 0.5) * 18, CITY.y + 1.3, DOME_AT.z - 40 + (Math.random() - 0.5) * 8), cityP.set((Math.random() - 0.5) * 2, 0.6, (Math.random() - 0.5) * 2), { life: 4, size: 3, grow: 2.5, alpha: 0.5 });
  S.spot.material.opacity = rise * (0.08 + Math.sin(u * 20) * 0.01);
  S.spot.position.set(t.pos.x - DOME_AT.x, 36, t.pos.z - DOME_AT.z);
  if (rise > 0.5 && Math.random() < dt * 12) burst(t.pos.clone().add(cityV.set((Math.random() - 0.5), 1.8, 0)), 0xff2d55, 6, 3);
  // And Miku walks out to meet her.
  const mw = smooth(clamp((u - 11) / 6, 0, 1));
  player.pos.set(DOME_AT.x, CITY.y + 1.2, DOME_AT.z + lerp(S.stageZ - 2, -10, mw));
  player.yaw = player.bodyYaw = Math.PI;
  if (mw > 0 && mw < 1) { player.stride = 1; player.walkPhase += dt * 7; } else player.stride = 0;
  if (mw > 0 && mw < 1) { poseAvatar(dt, cityV.set(0, 0, -1), true); avatar.simulate(dt); } else mikuDance(dt, 0, 0);
  domeLights(dt, D, u < 6.2 ? 0 : 1, u < 8 ? 'red' : 'split');
  once('l1', 8.2, () => caption('Fifty-five thousand people. Half the Dome teal. Half of it red.', 'place'));
  once('l2', 11, () => caption('"Did you think I\'d let you have the whole night? It\'s MY crown too, snowflake."', 'crimson'));
  once('l3', 15, () => caption('"Out in the snow, nobody saw. Tonight they all will."', 'crimson'));
  once('l4', 18.5, () => caption('"I got up, Teto. I always get up."', 'miku'));
  once('l5', 22, () => caption('"Then come on. Let\'s show them. The rematch."', 'crimson'));
  once('l6', 25.5, () => { caption(''); Sfx.boom(1.4); impact('white', 300); });
  // The two of them face to face in the middle of the runway, the camera wheeling round.
  const mid = cityP.set(DOME_AT.x, CITY.y + 2.4, (player.pos.z + t.pos.z) / 2);
  const a = u * 0.25;
  camera.position.set(mid.x + Math.sin(a) * lerp(30, 6, smooth(clamp((u - 12) / 10, 0, 1))), mid.y + lerp(10, 0.5, smooth(clamp((u - 12) / 10, 0, 1))), mid.z + Math.cos(a) * lerp(30, 6, smooth(clamp((u - 12) / 10, 0, 1))));
  camera.lookAt(mid);
  setFov(lerp(60, 40, smooth(clamp((u - 14) / 8, 0, 1))));
  if (u > 27) endPartTwo();
}

function endPartTwo() {
  const D = show.dome;
  if (!D || D.ended) return;
  D.ended = true;
  flag('domeDone');
  saveGame();
  game.state = 'ending';
  if (activeScene) activeScene = null;
  document.exitPointerLock();
  $('hud').classList.add('hidden');
  Sfx.dawnChime();
  const el = $('end-part');
  el.querySelector('h2').textContent = 'END PART 2';
  el.querySelector('.tag').textContent = 'Miku and Teto, face to face in the Tokyo Dome. The rematch begins.';
  el.classList.remove('hidden');
}

// Columns of fire along the front of the stage.
function domePyro(S, power = 1) {
  for (let i = 0; i < 8; i++) {
    const x = DOME_AT.x + (i - 3.5) * 4.2, z = DOME_AT.z + S.stageZ - 6.2;
    for (let k = 0; k < 10 * power; k++) S.flames.emit(cityV.set(x, CITY.y + 1.3, z), cityP.set((Math.random() - 0.5) * 0.8, 9 + Math.random() * 6 * power, (Math.random() - 0.5) * 0.8), { life: 0.7, size: 1.1, grow: 1.2, alpha: 0.95 });
  }
  Sfx.hit({ dur: 0.6, freq: 300, to: 1200, q: 0.6, vol: 0.25 * power, attack: 0.05 });
}

function launchConfetti(S) {
  const p = S.confetti.geometry.attributes.position.array, v = S.cvel, n = p.length / 3;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    p.set([side * 12, 2, S.stageZ - 4], i * 3);
    v.set([-side * (4 + Math.random() * 14) + (Math.random() - 0.5) * 6, 14 + Math.random() * 16, -4 - Math.random() * 18], i * 3);
  }
  S.confettiOn = true;
}

function updateConfetti(dt, S) {
  if (!S.confettiOn) return;
  const p = S.confetti.geometry.attributes.position.array, v = S.cvel, n = p.length / 3;
  for (let i = 0; i < n; i++) {
    v[i * 3 + 1] = Math.max(-1.6, v[i * 3 + 1] - 14 * dt);
    v[i * 3] *= 1 - dt * 0.8; v[i * 3 + 2] *= 1 - dt * 0.8;
    p[i * 3] += (v[i * 3] + Math.sin(game.time * 3 + i) * 0.8) * dt;
    p[i * 3 + 1] = Math.max(0.05, p[i * 3 + 1] + v[i * 3 + 1] * dt);
    p[i * 3 + 2] += v[i * 3 + 2] * dt;
  }
  S.confetti.geometry.attributes.position.needsUpdate = true;
}
