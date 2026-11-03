// Teto, the final boss. She woke by Miku's fire and wandered off (or never stayed asleep):
// she has been clinging under the balloon's basket since the Breath, and once it clears
// the trees she climbs over the rim, owns up to crashing the plane, and fights Miku
// for it in a basket a metre and a half across. Beaten, she loses her grip on the rim and
// drops into the cloud, and the balloon carries on up to the dawn.

/* ---------- Config ---------- */
const BOSS = {
  health: 100,
  stages: [0.66, 0.33], // her health, as a share, where the second and third rounds begin
  reach: 0.5, // how far either of them may stand from the basket's centre, each way
  corner: 0.45, // Varga's fuel tanks fill the two back corners: |x| - z stays under this
  apart: 0.52, // the closest the two of them get
  stalk: [[1.7, 2.5], [1.2, 1.9], [0.8, 1.4]], // seconds between her attacks, each round
  pace: [1, 0.86, 0.74], // her wind-ups, quicker each round
  opening: [1.75, 1.5, 1.35], // how long she's open after an attack
  harder: [1, 1.15, 1.3], // her blows, harder each round
  pools: [['lunge', 'claw'], ['lunge', 'claw', 'shove'], ['lunge', 'claw', 'shove', 'burner']],
  first: [null, 'shove', 'burner'], // each new round opens with its new trick
  combo: [0, 0.35, 0.55], // chance a lunge runs straight into the claws
  damage: { axe: 6, katana: 12, arrow: [4, 10] },
  // How much of a blow lands, by what she's doing: guarded while she circles, wide open
  // while she's seeing stars.
  taken: { guard: 0.4, windup: 1, strike: 0.6, open: 1.5 },
  blows: { lunge: 14, claw: 4, teeter: 20, burner: 16 },
  dodge: 0.5, // seconds into a dodge in which she can't touch Miku
  teeter: { time: 2.8, need: [6, 6, 7] },
  warmth: 9, // per second, from the burner over their heads
  cam: { dist: 2.05, height: 1.72, tilt: 0.12, shoulder: 0.42, top: 3.0, assist: 2.4 },
};
// Seconds for each attack's wind-up and strike, before the round's pace.
const BOSS_WIND = { lunge: 0.85, claw: 0.7, shove: 0.75, burner: 1.35 };
const BOSS_STRIKE = { lunge: 0.3, claw: 1.25, shove: 0.24, burner: 1.3 };
const BOSS_HOP = 0.4; // the leap up to hang off the burner frame
const BOSS_HANG = 1.04; // how much higher her hips are, hanging there
const BOSS_BLAST = 0.9; // the burner's blast, then she drops back down
const BOSS_ZONE = 0.45; // the scorched patch round where the burner points
// The reveal's beats, in seconds; her lines follow from `talk`.
const BOSS_REVEAL = { lurch: 0.15, think: 0.6, fingers: 1.7, peek: 2.6, haul: 3.6, over: 4.5, land: 5.1, talk: 5.8 };
// The end: she staggers to the rim, hangs on, lets go, and the cloud takes her.
const BOSS_FALL = { rim: 1.0, line: 1.2, last: 2.9, slip: 4.3, pomf: 6.4, far: 7.0, after: 8.6, end: 10.8 };

// Her words, in case the story's are missing.
const BOSS_LINES = {
  name: 'Teto',
  kicker: 'Final boss',
  sub: 'Influencer. Saboteur. No pants.',
  lurch: 'Why are we listing?',
  peek: 'Knock knock!',
  gone: ['Miss me? The wolves spat me out. Apparently I\'m "too much".', 'I\'ve been hanging under your basket since the Breath. My arms are SO toned now.'],
  asleep: ['Nobody woke me up! I had to follow the smoke MYSELF!', 'I\'ve been hanging under your basket since the Breath. My arms are SO toned now.'],
  confess: ['The engine? That was ME. I pulled the fuel cut-off!', 'A whole death crater, all to myself. Do you KNOW what that does for engagement?'],
  pants: 'I\'m insane because I never had any pants!',
  reply: 'That explains a lot, actually.',
  fight: 'Now hold STILL. This is my good side.',
  hint: 'Dodge with Space when her eyes flash. Hit her while she\'s seeing stars.',
  attacks: { lunge: 'Say CHEESE!', claw: 'Fresh NAILS!', shove: 'Mind the GAP!', burner: 'HOT TAKE!' },
  hurt: ['OW! My SKIN ROUTINE!', 'Not the FACE!', 'RUDE!'],
  taunts: ['This is SO going viral.', 'Hold still, I\'m filming!', 'Smile for the thumbnail!'],
  phase2: 'Okay. OKAY. Gloves off! I never had gloves either!',
  phase2Hint: 'She\'s getting faster. If she shoves me onto the rim, mash Space.',
  phase3: 'FINE! Let\'s turn up the HEAT!',
  phase3Hint: 'She\'s going for the burner. Don\'t stand where it\'s pointing.',
  teeterSave: 'Not yet! You\'re my B-roll!',
  teeterBack: 'Nope. Staying in the basket, thanks.',
  retry: ['Again! From the top! The lighting was wrong.'],
  retryThought: 'Okay. Again. Dodge the glint, hit the stars.',
  defeat: ['No. No no no. My arc isn\'t FINISHED!', 'Like and subscriiiiibe!'],
  fall: 'I\'M OKAAAAY!',
  after: 'She\'ll land somewhere photogenic. She always does.',
};
const BOSS_MASH = 'Mash Space to haul yourself back in!';

/* ---------- State ---------- */
const boss = {
  phase: 'none', // 'none', 'reveal', 'fight', 'retry' (after a loss), 'defeat' or 'done'
  health: BOSS.health,
  stage: 0, // the round: 0, 1 or 2
  tries: 0,
  time: 0, // seconds spent fighting, all tries together
  won: false,
  resume: null, // hands the balloon back to its climb
  pendingRetry: false,
};

// The fight itself. Her place is kept in the basket's own frame (x, z across the floor,
// from its centre), so she turns with it as it slowly spins.
const bossFight = {
  act: 'stalk', // 'stalk', 'windup', 'strike', 'open', 'taunt', 'gloat' or 'yank'
  attack: null, last: [], next: null,
  t: 0, dur: 1,
  at: new THREE.Vector3(), yaw: Math.PI, hipY: 0,
  from: new THREE.Vector3(), to: new THREE.Vector3(), target: new THREE.Vector3(),
  bar: new THREE.Vector3(), // where she hangs off the burner frame
  locked: false, glinted: false, struck: false, swipes: 0, combo: false,
  flinch: 0, glint: 0, lag: 1, circle: 1,
  hurtLineAt: -99, tauntAt: 0, tauntOff: 0,
  teeter: null,
  knock: new THREE.Vector3(),
  prev: new THREE.Vector3(), hasPrev: false,
  gripL: new THREE.Vector3(), gripR: new THREE.Vector3(),
  shown: { bar: -1, lag: -1, mash: -1, stage: -1 },
};
let bossScene = null; // the reveal, a retry or her fall, while one plays
let bossKit = null; // her avatar and the effects, built at load

const bossM = new THREE.Matrix4(), bossInv = new THREE.Matrix4();
const bossV = new THREE.Vector3(), bossW = new THREE.Vector3(), bossL = new THREE.Vector3(), bossP = new THREE.Vector3(), bossU = new THREE.Vector3();
const bossQ = new THREE.Quaternion(), bossQ2 = new THREE.Quaternion(), bossQ3 = new THREE.Quaternion();
const BOSS_UP = new THREE.Vector3(0, 1, 0), BOSS_SIDE = new THREE.Vector3(1, 0, 0), BOSS_FWD = new THREE.Vector3(0, 0, 1);
const bossSeg = new THREE.Line3(), bossZero = new THREE.Vector3();

/* ---------- Her lines ---------- */
function bossText(key) {
  const text = LORE.boss && LORE.boss[key];
  return typeof text === 'string' && text ? text : BOSS_LINES[key];
}

function bossList(key) {
  const list = LORE.boss && LORE.boss[key];
  if (Array.isArray(list) && list.length) return list;
  if (typeof list === 'string' && list) return [list];
  return BOSS_LINES[key];
}

function bossPick(key) {
  const list = bossList(key);
  return list[Math.floor(Math.random() * list.length)];
}

function bossAttackLine(kind) {
  const lines = (LORE.boss && LORE.boss.attacks) || BOSS_LINES.attacks;
  return lines[kind] || BOSS_LINES.attacks[kind];
}

// How long a line of hers stays up in a scene.
function bossReadTime(text) {
  return clamp(0.6 + text.length / 22, 1.6, 3.4);
}

// A line of hers during the fight, over the action (scene captions are hidden in play).
function bossTaunt(text, seconds = 2.2) {
  const el = $('boss-taunt');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  bossFight.tauntOff = game.time + seconds;
  Sfx.crimsonChatter(text);
}

function bossSceneLine(text, cls = 'crimson') {
  if (cls === 'line') caption(text, 'line');
  else { crimsonSay(text, cls); Sfx.crimsonChatter(text); }
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // The basket jolting on its cables as someone heavy grabs hold underneath.
  bossLurch() { this.burst(0.35, 300, 0.8, 0.55); this.glide([[0, 120], [0.6, 175], [1.0, 128]], 0.07, 'sawtooth', 8); },
  // The glint in her eye: the moment to dodge.
  bossTell() { this.tone(1900, 2700, 0.1, 0.07, 'triangle'); this.tone(3800, 3600, 0.28, 0.035, 'sine'); },
  bossWhoosh() { this.burst(0.24, 1500, 0.8, 0.26, 'bandpass'); },
  bossSwipe() { this.burst(0.08, 3300, 1.6, 0.16, 'bandpass'); },
  bossShove() { this.burst(0.12, 520, 1, 0.45); this.tone(210, 90, 0.16, 0.22, 'triangle'); },
  // A blow she turns aside, and one that lands.
  bossBlock() { this.tone(980, 930, 0.16, 0.06, 'square'); this.burst(0.06, 4200, 2, 0.18, 'bandpass'); },
  bossHit() { this.burst(0.1, 900, 1.2, 0.42, 'bandpass'); this.tone(330, 140, 0.12, 0.18, 'triangle'); },
  bossOw() { this.crimsonVoice([[0, 700], [0.1, 1080], [0.26, 760]], 0.16, { vowel: 'o', breath: 0.2 }); },
  bossLaugh() {
    [0, 0.16, 0.32, 0.5].forEach((at, i) => this.crimsonVoice([[0, 620 + i * 60], [0.1, 560 + i * 60]], 0.12, { delay: at, vowel: 'a', breath: 0.25 }));
  },
  bossFlame() { this.burst(1.1, 650, 0.6, 0.75); this.burst(0.5, 2600, 0.8, 0.25, 'bandpass'); },
  bossHiss() { this.burst(0.9, 5200, 0.7, 0.12, 'highpass'); },
  // Cartoon stars round her head.
  bossStars() { [0, 0.08, 0.17].forEach((at, i) => setTimeout(() => this.tone(2300 + i * 420, 2500 + i * 420, 0.14, 0.035, 'sine'), at * 1000)); },
  bossSting() { this.tone(116, 58, 1.3, 0.3, 'sawtooth'); this.burst(0.9, 220, 0.6, 0.5); },
  bossPomf() { this.burst(0.7, 520, 0.5, 0.4); },
  bossMash() { this.burst(0.07, 2400, 2.5, 0.12, 'bandpass'); },
});

/* ---------- Models ---------- */
function bossStarTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    g.translate(w / 2, h / 2);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 11 : 27, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#ffe36a';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#a8641a';
    g.stroke();
  });
}

// The anime glint in her eye: a four-pointed sparkle.
function bossGlintTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    const c = w / 2;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.18, 'rgba(255,170,200,0.6)');
    glow.addColorStop(1, 'rgba(255,90,140,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(c, 0); g.lineTo(c + 3, c - 3); g.lineTo(w, c); g.lineTo(c + 3, c + 3);
    g.lineTo(c, h); g.lineTo(c - 3, c + 3); g.lineTo(0, c); g.lineTo(c - 3, c - 3);
    g.closePath();
    g.fill();
  });
}

// A soft column that fades upwards, for where the burner is about to point.
function bossZoneTexture() {
  return canvasTexture(8, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

// The burner's flame, wrenched round to point down into the basket.
function buildBossJet() {
  const count = 90;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.4, map: TEX.softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false;
  points.visible = false;
  const seeds = Array.from({ length: count }, () => ({ t: Math.random(), a: Math.random() * Math.PI * 2, s: Math.random(), k: 1.4 + Math.random() * 1.2 }));
  const dir = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  // From `from` towards `to`, `reach` of the way (0-1), `power` how fierce.
  points.tick = (dt, from, to, reach, power) => {
    dir.subVectors(to, from);
    const len = dir.length() || 1;
    dir.divideScalar(len);
    side.crossVectors(dir, BOSS_UP);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(side, dir);
    points.material.size = 0.18 + power * 0.42;
    for (let i = 0; i < count; i++) {
      const p = seeds[i];
      p.t = (p.t + dt * p.k * (0.7 + power * 1.6)) % 1;
      const along = p.t * reach * len;
      const r = (0.03 + p.t * 0.34 * power) * p.s;
      const x = from.x + dir.x * along + (side.x * Math.cos(p.a) + up.x * Math.sin(p.a)) * r;
      const y = from.y + dir.y * along + (side.y * Math.cos(p.a) + up.y * Math.sin(p.a)) * r;
      const z = from.z + dir.z * along + (side.z * Math.cos(p.a) + up.z * Math.sin(p.a)) * r;
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      const heat = 1 - p.t;
      const glow = 0.35 + power;
      colors[i * 3] = (1.3 + heat * 1.6) * glow * (0.3 + heat);
      colors[i * 3 + 1] = (0.35 + heat * heat * 1.5) * glow * (0.3 + heat);
      colors[i * 3 + 2] = (0.08 + heat * heat * heat * 0.9) * glow * (0.3 + heat);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
  return points;
}

function buildBossKit() {
  const avatar = createAvatar(scene, 'crimson');
  avatar.setVisible(false);
  const additive = (map, color, opacity = 1) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  // The glint in her eye, and the stars she sees when she's open.
  const glint = new THREE.Sprite(additive(bossGlintTexture(), new THREE.Color(0xffd0dc).multiplyScalar(1.6), 0));
  glint.position.set(0.035, 0.1, 0.11);
  glint.scale.setScalar(0.3);
  glint.renderOrder = 3;
  avatar.head.add(glint);
  const stars = new THREE.Group();
  stars.position.set(0, 0.3, -0.01);
  const starMat = new THREE.SpriteMaterial({ map: bossStarTexture(), transparent: true, depthWrite: false, fog: false });
  for (let i = 0; i < 3; i++) {
    const star = new THREE.Sprite(starMat);
    star.scale.setScalar(0.085);
    stars.add(star);
  }
  stars.visible = false;
  avatar.head.add(stars);
  // Where the burner's about to point: a ring on the planks and a column of heat over it.
  const zone = new THREE.Group();
  const zoneMat = new THREE.MeshBasicMaterial({ color: 0xff6a2a, map: bossZoneTexture(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(BOSS_ZONE, BOSS_ZONE, 1.7, 28, 1, true).translate(0, 0.85, 0), zoneMat);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8040, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(BOSS_ZONE - 0.06, BOSS_ZONE, 40).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.015;
  zone.add(column, ring);
  zone.visible = false;
  scene.add(zone);
  const jet = buildBossJet();
  scene.add(jet);
  return { avatar, glint, stars, zone, column, ring, jet, cur: bossPoseObject(), want: bossPoseObject(), fx: { zone: 0, jet: 0, reach: 0 } };
}

function buildBossDom() {
  const bar = document.createElement('div');
  bar.id = 'boss-bar';
  bar.className = 'hidden';
  bar.innerHTML = '<p class="boss-name"><span class="boss-kicker"></span><span class="boss-title"></span></p>'
    + '<div class="bar boss-health"><i class="boss-lag"></i><i class="boss-fill"></i><b class="boss-tick" style="left:66%"></b><b class="boss-tick" style="left:33%"></b></div>';
  bar.querySelector('.boss-kicker').textContent = bossText('kicker');
  bar.querySelector('.boss-title').textContent = bossText('name');
  const taunt = document.createElement('div');
  taunt.id = 'boss-taunt';
  const hint = document.createElement('div');
  hint.id = 'boss-hint';
  hint.className = 'hidden';
  hint.innerHTML = `<p></p><div class="boss-mash"><i></i></div>`;
  hint.querySelector('p').textContent = BOSS_MASH;
  const hud = $('hud');
  hud.appendChild(bar);
  hud.appendChild(taunt);
  hud.appendChild(hint);
  // The fade for a retry sits under the letterbox and captions.
  const fade = document.createElement('div');
  fade.id = 'boss-fade';
  document.body.insertBefore(fade, $('cine'));
}

/* ---------- The basket's frame ---------- */
// The basket floor's centre, turned with the basket. Everything in the fight is placed
// relative to it, since the balloon spins slowly as it rises.
function bossFrame() {
  bossM.copy(balloonModel.rig.matrixWorld);
  bossInv.copy(bossM).invert();
}

function bossWorld(out, x, y, z) {
  return out.set(x, y, z).applyMatrix4(bossM);
}

function bossLocal(out, p) {
  return out.copy(p).applyMatrix4(bossInv);
}

function bossBasketYaw() {
  return balloonModel.rig.rotation.y;
}

// Keeps a spot (in the basket's frame) on the floor: inside the wicker, out of the tanks.
function bossKeepIn(p, pad = 0) {
  const r = BOSS.reach - pad;
  p.x = clamp(p.x, -r, r);
  p.z = clamp(p.z, -r, r);
  const over = Math.abs(p.x) - p.z - BOSS.corner;
  if (over > 0) {
    p.x -= Math.sign(p.x) * over / 2;
    p.z += over / 2;
  }
  return p;
}

function bossDodging() {
  return !!player.dodge && player.dodge.t < BOSS.dodge;
}

function bossFighting() {
  return boss.phase === 'fight' && !!balloonModel && balloon.phase === 'interlude';
}

/* ---------- Her body ---------- */
// A pose: joint angles and hand targets (in the chest's coordinates). Each frame she eases
// from the pose she's in towards the one her moment calls for.
function bossPoseObject() {
  return {
    hipY: 0.9, lean: 0, roll: 0, hipsX: 0, hipsY: 0, chestX: 0, chestY: 0, chestZ: 0, headX: 0, headY: 0, headZ: 0,
    thighL: 0, shinL: 0, thighR: 0, shinR: 0, splayL: 0, splayR: 0, grip: 0,
    handL: new THREE.Vector3(0.12, -0.25, 0.04), handR: new THREE.Vector3(-0.12, -0.25, 0.04),
    poleL: new THREE.Vector3(0.42, -0.78, -0.42), poleR: new THREE.Vector3(-0.42, -0.78, -0.42),
  };
}
const BOSS_POSE_KEYS = ['hipY', 'lean', 'roll', 'hipsX', 'hipsY', 'chestX', 'chestY', 'chestZ', 'headX', 'headY', 'headZ', 'thighL', 'shinL', 'thighR', 'shinR', 'splayL', 'splayR', 'grip'];

function bossEase(cur, want, w) {
  for (const key of BOSS_POSE_KEYS) cur[key] += (want[key] - cur[key]) * w;
  cur.handL.lerp(want.handL, w);
  cur.handR.lerp(want.handR, w);
  cur.poleL.lerp(want.poleL, w);
  cur.poleR.lerp(want.poleR, w);
}

function bossCopyPose(out, from) {
  for (const key of BOSS_POSE_KEYS) out[key] = from[key];
  out.handL.copy(from.handL); out.handR.copy(from.handR);
  out.poleL.copy(from.poleL); out.poleR.copy(from.poleR);
}

// Two-bone leg: the thigh and knee angles that put her foot on the floor `foot` metres
// ahead of the hip, with the hips `hipY` above it.
function bossLeg(p, side, hipY, foot) {
  const c = bossKit.avatar;
  const upper = -c.legL.shin.position.y;
  const lower = c.dims.hips + c.legL.thigh.position.y - 0.075 - upper;
  const drop = Math.max(0.05, hipY + c.legL.thigh.position.y - 0.075);
  const d = Math.min(Math.hypot(drop, foot), upper + lower - 0.001);
  const reach = Math.atan2(foot, drop);
  const hip = Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  const knee = Math.acos(clamp((upper * upper + lower * lower - d * d) / (2 * upper * lower), -1, 1));
  p[`thigh${side}`] = -(reach + hip);
  p[`shin${side}`] = Math.PI - knee;
}

// Standing on the planks, feet `footL` and `footR` ahead of the hips, everything else at rest.
function bossBase(p, hipY, footL = 0.05, footR = -0.03) {
  Object.assign(p, { hipY, lean: 0, roll: 0, hipsX: 0, hipsY: 0, chestX: 0, chestY: 0, chestZ: 0, headX: 0, headY: 0, headZ: 0, splayL: 0.06, splayR: -0.06, grip: 0 });
  bossLeg(p, 'L', hipY, footL);
  bossLeg(p, 'R', hipY, footR);
  p.handL.set(0.13, -0.24, 0.04);
  p.handR.set(-0.13, -0.24, 0.04);
  p.poleL.set(0.42, -0.78, -0.42);
  p.poleR.set(-0.42, -0.78, -0.42);
}

// Fists up, weight on the balls of her feet, bobbing.
function bossStance(p, T, crouch = 0) {
  const bob = Math.sin(T * 5.5);
  bossBase(p, 0.87 - crouch * 0.1 + bob * 0.012, 0.12, -0.1);
  Object.assign(p, { chestX: 0.2, chestY: 0.12, headX: -0.16, headY: -0.08, roll: bob * 0.02, splayL: 0.1, splayR: -0.1 });
  p.handL.set(0.11, 0.2, 0.24);
  p.handR.set(-0.08, 0.16, 0.22);
  p.poleL.set(0.6, -0.8, -0.1);
  p.poleR.set(-0.6, -0.8, -0.1);
}

// One hand on her hip, the other pointing, head cocked.
function bossSass(p, T, laugh = 0) {
  const bob = Math.sin(T * 3);
  bossBase(p, 0.9 + bob * 0.008, 0.08, -0.04);
  Object.assign(p, { roll: 0.07, hipsY: 0.12, chestX: -0.05 + laugh * Math.abs(Math.sin(T * 14)) * 0.14, chestY: -0.15, headX: -0.08, headZ: 0.16 });
  p.handL.set(0.17, -0.1, 0.0);
  p.poleL.set(0.9, 0.0, -0.4);
  p.handR.set(-0.08, 0.2, 0.36);
  p.poleR.set(-0.3, -0.9, -0.3);
}

// A gesture for each of her lines in the reveal.
function bossGesture(p, kind, T) {
  if (kind === 'fists') { bossStance(p, T); return; }
  bossBase(p, 0.9, 0.08, -0.05);
  if (kind === 'proud') {
    p.handL.set(0.17, -0.1, 0.0); p.poleL.set(0.9, 0.0, -0.4);
    p.handR.set(-0.17, -0.1, 0.0); p.poleR.set(-0.9, 0.0, -0.4);
    Object.assign(p, { chestX: -0.08, headX: -0.1, headZ: 0.08 });
  } else if (kind === 'point') {
    bossSass(p, T);
  } else if (kind === 'flip') {
    p.handL.set(0.17, -0.1, 0.0); p.poleL.set(0.9, 0.0, -0.4);
    p.handR.set(-0.12, 0.36, -0.06); p.poleR.set(-0.9, 0.3, -0.2);
    Object.assign(p, { roll: 0.05, headX: -0.12, headY: 0.2, headZ: 0.22 });
  } else if (kind === 'shrug') {
    p.handL.set(0.22, -0.02, 0.18); p.poleL.set(0.6, -0.8, -0.2);
    p.handR.set(-0.22, -0.02, 0.18); p.poleR.set(-0.6, -0.8, -0.2);
    Object.assign(p, { chestX: -0.04, headZ: -0.12, headX: -0.05 });
  } else if (kind === 'wide') {
    // Arms flung up and wide, head thrown back: the big confession.
    p.handL.set(0.3, 0.42, 0.06); p.poleL.set(0.9, -0.2, -0.3);
    p.handR.set(-0.3, 0.42, 0.06); p.poleR.set(-0.9, -0.2, -0.3);
    Object.assign(p, { hipY: 0.88, chestX: -0.2, headX: -0.35, headZ: Math.sin(T * 9) * 0.04 });
  }
}

// Seeing stars: swaying in a slow circle, arms hanging.
function bossDizzy(p, T) {
  const a = T * 4.2;
  bossBase(p, 0.88, 0.1, -0.06);
  Object.assign(p, { roll: Math.sin(a) * 0.06, chestX: 0.1 + Math.sin(a) * 0.1, chestZ: Math.cos(a) * 0.12, headX: 0.15 + Math.cos(a) * 0.12, headZ: Math.sin(a) * 0.2 });
  p.handL.set(0.15, -0.3, 0.06 + Math.sin(a) * 0.04);
  p.handR.set(-0.15, -0.3, 0.06 - Math.sin(a) * 0.04);
}

// Out of breath after the claws: hands on her knees.
function bossPant(p, T) {
  const puff = Math.abs(Math.sin(T * 7));
  bossBase(p, 0.8, 0.14, -0.12);
  Object.assign(p, { chestX: 0.75 + puff * 0.06, headX: -0.62, splayL: 0.12, splayR: -0.12 });
  p.handL.set(0.13, -0.32, 0.24);
  p.handR.set(-0.13, -0.32, 0.24);
  p.poleL.set(0.6, -0.4, -0.2);
  p.poleR.set(-0.6, -0.4, -0.2);
}

// Burnt her fingers on the burner: blowing on them, hopping.
function bossSinged(p, T) {
  const hop = Math.abs(Math.sin(T * 9));
  bossBase(p, 0.88 + hop * 0.03, 0.06, -0.04);
  Object.assign(p, { chestX: 0.15, headX: 0.15 });
  p.handL.set(0.04 + Math.sin(T * 30) * 0.02, 0.24, 0.19);
  p.handR.set(-0.04 - Math.sin(T * 30) * 0.02, 0.22, 0.19);
  p.poleL.set(0.8, -0.6, -0.2);
  p.poleR.set(-0.8, -0.6, -0.2);
  p.thighR -= hop * 0.4;
  p.shinR += hop * 0.7;
}

// Leaning back out over the rim, arms going like windmills (her, at the end).
function bossTeeterPose(p, T, amount) {
  bossBase(p, 0.92, 0.25, 0.2);
  const w = T * 13;
  Object.assign(p, { lean: -0.55 * amount + Math.sin(T * 6) * 0.08, chestX: -0.1, headX: 0.35 * amount });
  p.thighL += 0.4 * amount; p.thighR += 0.4 * amount;
  p.handL.set(0.26, 0.22 + Math.sin(w) * 0.16, Math.cos(w) * 0.2);
  p.handR.set(-0.26, 0.22 + Math.sin(w + Math.PI) * 0.16, Math.cos(w + Math.PI) * 0.2);
  p.poleL.set(0.9, 0.2, -0.3);
  p.poleR.set(-0.9, 0.2, -0.3);
}

// Puts her body in a pose, with her hips over `at` (in the basket's frame) at `hipY` above
// the planks, facing `yaw` in the basket's frame. With `grip` > 0, her hands go towards
// the world points in bossFight.gripL/gripR.
function bossApply(p, at, yaw) {
  const c = bossKit.avatar;
  bossQ.copy(balloonModel.rig.quaternion).multiply(bossQ2.setFromAxisAngle(BOSS_UP, yaw));
  bossQ.multiply(bossQ2.setFromAxisAngle(BOSS_SIDE, p.lean)).multiply(bossQ3.setFromAxisAngle(BOSS_FWD, p.roll));
  c.root.quaternion.copy(bossQ);
  bossU.set(0, c.dims.hips, 0).applyQuaternion(bossQ);
  bossWorld(c.root.position, at.x, p.hipY, at.z).sub(bossU);
  bossPlaceLimbs(c, p);
}

function bossPlaceLimbs(c, p) {
  c.hips.position.y = c.dims.hips;
  c.hips.rotation.set(p.hipsX, p.hipsY, 0);
  c.chest.rotation.set(p.chestX, p.chestY, p.chestZ);
  c.head.rotation.set(p.headX, p.headY, p.headZ);
  c.legL.thigh.rotation.set(p.thighL - p.hipsX, 0, p.splayL);
  c.legR.thigh.rotation.set(p.thighR - p.hipsX, 0, p.splayR);
  c.legL.shin.rotation.set(p.shinL, 0, 0);
  c.legR.shin.rotation.set(p.shinR, 0, 0);
  let handL = p.handL, handR = p.handR;
  if (p.grip > 0.01) {
    c.root.updateMatrixWorld(true);
    handL = bossV.copy(bossFight.gripL);
    c.chest.worldToLocal(handL).lerp(p.handL, 1 - p.grip);
    handR = bossW.copy(bossFight.gripR);
    c.chest.worldToLocal(handR).lerp(p.handR, 1 - p.grip);
  }
  solveArm(c.armL, handL, p.poleL);
  solveArm(c.armR, handR, p.poleR);
  c.armL.hand.quaternion.identity();
  c.armR.hand.quaternion.identity();
}

// Her chest in the world, for sparks and the camera.
function bossChest(out) {
  return bossKit.avatar.chest.getWorldPosition(out);
}

/* ---------- Miku ---------- */
// Called from updatePlayer once she has moved: in the fight she stays on the basket floor,
// inside the wicker, out of the tanks and off Teto's toes. A dodge is a quick side-step
// in here rather than a roll across a clearing.
function bossHoldPlayer(pos, dt = 1 / 60) {
  if (!bossFighting()) return;
  const f = bossFight;
  bossFrame();
  // Nothing in reach of E matters up here (the ground's fifty metres down).
  keys.KeyE = false;
  // updatePlayer has just dropped her to the snow far below; measured from down there, the
  // basket's slight tilt would slide her sideways, so she's measured at its floor.
  const p = bossLocal(bossL, bossV.set(pos.x, balloon.pos.y, pos.z));
  if (f.teeter) {
    p.copy(f.teeter.spot);
    if (player.dodge) { player.dodge = null; player.stamina = Math.min(100, player.stamina + 25); }
    player.bodyYaw = bossBasketYaw() + Math.atan2(-f.teeter.out.x, -f.teeter.out.z);
  } else {
    if (player.dodge && f.hasPrev) {
      p.x = f.prev.x + (p.x - f.prev.x) * 0.4;
      p.z = f.prev.z + (p.z - f.prev.z) * 0.4;
    }
    if (f.knock.lengthSq() > 1e-6) {
      const k = Math.min(1, dt * 12);
      p.x += f.knock.x * k;
      p.z += f.knock.z * k;
      f.knock.multiplyScalar(1 - k);
    }
    bossKeepIn(p);
    const dx = p.x - f.at.x, dz = p.z - f.at.z, d = Math.hypot(dx, dz);
    if (d < BOSS.apart) {
      const nx = d > 1e-4 ? dx / d : -Math.sin(f.yaw), nz = d > 1e-4 ? dz / d : -Math.cos(f.yaw);
      p.x = f.at.x + nx * BOSS.apart;
      p.z = f.at.z + nz * BOSS.apart;
      bossKeepIn(p);
    }
  }
  f.prev.set(p.x, 0, p.z);
  f.hasPrev = true;
  bossWorld(pos, p.x, 0, p.z);
}

// Called from updatePlayer once she's posed, before her hair moves: shoved onto the rim,
// she leans back out over it, arms going like windmills.
function bossPosePlayer(dt) {
  const tt = bossFight.teeter;
  if (!bossFighting() || !tt || tt.lean < 0.01) return;
  const a = avatar, L = smooth(tt.lean), T = game.time;
  const wobble = Math.sin(T * 8) * 0.07 + tt.jolt * 0.12;
  bossQ.setFromAxisAngle(BOSS_UP, player.bodyYaw).multiply(bossQ2.setFromAxisAngle(BOSS_SIDE, -(0.78 - tt.jolt * 0.25) * L + wobble * L));
  a.root.quaternion.copy(bossQ);
  bossU.set(0, a.dims.hips, 0).applyQuaternion(bossQ);
  a.root.position.set(player.pos.x, player.pos.y + a.dims.hips, player.pos.z).sub(bossU);
  const kick = Math.max(0, Math.sin(T * 7)) * 0.6;
  a.legL.thigh.rotation.x = lerp(a.legL.thigh.rotation.x, 0.42, L);
  a.legR.thigh.rotation.x = lerp(a.legR.thigh.rotation.x, 0.42 - kick, L);
  a.legL.shin.rotation.x = lerp(a.legL.shin.rotation.x, 0.08, L);
  a.legR.shin.rotation.x = lerp(a.legR.shin.rotation.x, 0.08 + kick * 1.2, L);
  a.chest.rotation.x = lerp(a.chest.rotation.x, 0.2, L);
  a.head.rotation.x = lerp(a.head.rotation.x, 0.4, L);
  const w = T * 14;
  solveArm(a.armL, bossV.set(0.26, 0.2 + Math.sin(w) * 0.16, Math.cos(w) * 0.2), bossW.set(0.9, 0.2, -0.3));
  solveArm(a.armR, bossV.set(-0.26, 0.2 + Math.sin(w + Math.PI) * 0.16, Math.cos(w + Math.PI) * 0.2), bossW.set(-0.9, 0.2, -0.3));
  a.armL.hand.quaternion.identity();
  a.armR.hand.quaternion.identity();
}

// Standing still in the basket during a scene, at `x, z` in its frame, facing `yaw` there.
function bossPoseRider(dt, x, z, yaw) {
  bossWorld(player.pos, x, 0, z);
  player.bodyYaw = bossBasketYaw() + yaw;
  player.stride = 0;
  player.runBlend = 0;
  player.aimT = 0;
  player.dodge = null;
  poseAvatar(dt, bossZero, false);
  avatar.simulate(dt);
}

/* ---------- Hits on her ---------- */
// A blow from Miku: how much lands depends on what Teto is doing. True if it
// struck her at all (an arrow stops in her, guarded or not).
function bossDamage(base, by, at) {
  const f = bossFight;
  if (boss.phase !== 'fight' || boss.health <= 0) return false;
  const spark = at ? bossP.copy(at) : bossChest(bossP);
  if (f.act === 'taunt' || (f.teeter && !f.teeter.done)) {
    Sfx.bossBlock();
    burst(spark, 0xffffff, 10, 2.6);
    return true;
  }
  const key = f.act === 'open' || f.act === 'gloat' || f.act === 'yank' ? 'open' : f.act === 'windup' ? 'windup' : f.act === 'strike' ? 'strike' : 'guard';
  boss.health = Math.max(0, boss.health - base * BOSS.taken[key]);
  if (key === 'guard') {
    // She swats most of it aside, and comes back at her sooner for it.
    Sfx.bossBlock();
    burst(spark, 0xffffff, 8, 2.4);
    f.flinch = 0.5;
    f.t += 0.4;
  } else {
    Sfx.bossHit();
    burst(spark, 0xff8fb0, key === 'open' ? 18 : 11, 2.8);
    f.flinch = 1;
    if (game.time - f.hurtLineAt > 4.5 && Math.random() < 0.55) {
      f.hurtLineAt = game.time;
      bossTaunt(bossPick('hurt'), 1.8);
    } else Sfx.bossOw();
  }
  player.shake = Math.max(player.shake, key === 'open' ? 0.14 : 0.08);
  if (boss.health <= 0) return true;
  // Down past a third or two thirds: the next round.
  if (boss.stage < 2 && boss.health / BOSS.health <= BOSS.stages[boss.stage]) bossNextStage();
  return true;
}

// The axe: checked when its blow lands (survival.js sets swing.hit), from here.
function bossAxeCheck() {
  const sw = survival.swing;
  if (!sw || !sw.hit || sw.boss) return;
  sw.boss = true;
  const c = bossKit.avatar.hips;
  c.getWorldPosition(bossV);
  const dx = bossV.x - player.pos.x, dz = bossV.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  const off = Math.atan2(Math.sin(Math.atan2(dx, dz) - player.bodyYaw), Math.cos(Math.atan2(dx, dz) - player.bodyYaw));
  if (d < 1.5 && Math.abs(off) < 1.3) { bossDamage(BOSS.damage.axe, 'axe'); Sfx.chop(); }
}

// Every step of a flying arrow (game.js updateArrows): true if she took it.
function bossArrowHit(arrow) {
  if (boss.phase !== 'fight' || game.state !== 'playing' || !bossKit) return false;
  const c = bossKit.avatar;
  c.hips.getWorldPosition(bossV);
  c.head.getWorldPosition(bossW);
  bossV.y -= 0.7;
  bossW.y += 0.12;
  bossSeg.set(bossV, bossW).closestPointToPoint(arrow.tip, true, bossL);
  if (bossL.distanceTo(arrow.tip) > 0.38) return false;
  const draw = clamp((arrow.power - BOW.minDraw) / (1 - BOW.minDraw), 0, 1);
  bossDamage(lerp(BOSS.damage.arrow[0], BOSS.damage.arrow[1], draw), 'arrow', arrow.tip);
  return true;
}

// The Ember Blade's sweep (katana.js katanaCut): once per stroke, if she's in the arc.
function bossSlice(px, pz, reach, yaw, arc, swing) {
  if (boss.phase !== 'fight' || !bossKit || (swing && swing.boss)) return false;
  bossKit.avatar.hips.getWorldPosition(bossV);
  const dx = bossV.x - px, dz = bossV.z - pz, d = Math.hypot(dx, dz);
  if (d - 0.3 > reach) return false;
  if (d > 0.8) {
    const a = Math.atan2(dx, dz) - yaw;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > arc / 2) return false;
  }
  if (swing) swing.boss = true;
  return bossDamage(BOSS.damage.katana, 'katana');
}

/* ---------- Her blows ---------- */
// A blow at Miku, unless she's mid-dodge. True if it landed.
function bossBlow(kind, dodgeable = true) {
  if (dodgeable && bossDodging()) { Sfx.bossWhoosh(); return false; }
  hurtPlayer(BOSS.blows[kind] * BOSS.harder[boss.stage], 'wolf');
  player.shake = Math.max(player.shake, 0.35);
  return true;
}

// What happens if Miku's health runs out mid-fight (game.js playerDied): the fight
// starts over instead of the death screen.
function bossCatchDeath() {
  if (boss.phase === 'fight') { boss.pendingRetry = true; return true; }
  return boss.phase === 'reveal' || boss.phase === 'retry' || boss.phase === 'defeat';
}

/* ---------- Her moves ---------- */
function bossStalk(seconds) {
  const f = bossFight;
  const [lo, hi] = BOSS.stalk[boss.stage];
  f.act = 'stalk';
  f.attack = null;
  f.t = 0;
  f.dur = seconds || lo + Math.random() * (hi - lo);
  f.circle = Math.random() < 0.5 ? -1 : 1;
}

function bossChooseAttack() {
  const f = bossFight;
  let kind = f.next;
  f.next = null;
  if (!kind) {
    const pool = BOSS.pools[boss.stage];
    const fresh = pool.filter((k) => !(f.last[0] === k && f.last[1] === k));
    kind = fresh[Math.floor(Math.random() * fresh.length)];
  }
  f.last.unshift(kind);
  f.last.length = 2;
  bossBeginAttack(kind);
}

function bossBeginAttack(kind, wind) {
  const f = bossFight;
  f.act = 'windup';
  f.attack = kind;
  f.t = 0;
  f.dur = wind || BOSS_WIND[kind] * BOSS.pace[boss.stage];
  f.locked = false;
  f.glinted = false;
  f.struck = false;
  f.swipes = 0;
  f.from.copy(f.at);
  if (kind === 'burner') {
    // Up to hang off the nearest side of the burner frame, overhead.
    const h = 0.42;
    if (Math.abs(f.at.x) > Math.abs(f.at.z)) f.bar.set(Math.sign(f.at.x) * h, 0, clamp(f.at.z, -h, h));
    else f.bar.set(clamp(f.at.x, -h, h), 0, (Math.sign(f.at.z) || 1) * h);
    Sfx.bossHiss();
  }
  bossTaunt(bossAttackLine(kind), 1.4);
}

function bossStrike() {
  const f = bossFight;
  f.act = 'strike';
  f.t = 0;
  f.dur = BOSS_STRIKE[f.attack];
  f.struck = false;
  f.from.copy(f.at);
  if (f.attack === 'lunge' || f.attack === 'shove') {
    // Through where she stood, and on into the wicker if she misses.
    bossU.subVectors(f.target, f.at).setY(0);
    if (bossU.lengthSq() < 1e-4) bossU.set(-Math.sin(f.yaw), 0, -Math.cos(f.yaw)).negate();
    bossU.normalize();
    f.to.copy(f.target).addScaledVector(bossU, 0.35);
    bossKeepIn(f.to);
    Sfx.bossWhoosh();
  }
  if (f.attack === 'shove') Sfx.bossShove();
  if (f.attack === 'burner') { Sfx.bossFlame(); Sfx.burnerLight(); }
}

function bossOpen(extra = 0) {
  const f = bossFight;
  f.act = 'open';
  f.t = 0;
  f.dur = BOSS.opening[boss.stage] + extra;
  Sfx.bossStars();
}

function bossNextStage() {
  const f = bossFight;
  boss.stage++;
  f.act = 'taunt';
  f.t = 0;
  f.dur = 2.6;
  f.attack = null;
  f.next = BOSS.first[boss.stage];
  f.glint = 0;
  f.knock.set(0, 0, 0);
  bossTaunt(bossText(boss.stage === 1 ? 'phase2' : 'phase3'), 2.6);
  say(bossText(boss.stage === 1 ? 'phase2Hint' : 'phase3Hint'), 3.6);
  impact('white', 70);
  Sfx.bossSting();
  const bar = $('boss-bar');
  bar.classList.remove('stage-up');
  void bar.offsetWidth;
  bar.classList.add('stage-up');
}

// The shove landed: Miku goes back against the rim, over the drop.
function bossStartTeeter(dir) {
  const f = bossFight;
  // Against whichever wall the shove mostly went; the tanks fill the back, so a shove that
  // way puts her on a side wall instead.
  let out;
  if (Math.abs(dir.x) > Math.abs(dir.z) || dir.z < 0) out = new THREE.Vector3(Math.sign(dir.x) || 1, 0, 0);
  else out = new THREE.Vector3(0, 0, 1);
  const tt = bossLocal(bossL, player.pos);
  const spot = new THREE.Vector3();
  if (out.x) spot.set(out.x * 0.56, 0, clamp(tt.z, -0.1, 0.4));
  else spot.set(clamp(tt.x, -0.4, 0.4), 0, 0.56);
  f.teeter = { t: 0, got: 0, need: BOSS.teeter.need[boss.stage], spot, out, lean: 0, jolt: 0, done: null, doneT: 0 };
  survival.swing = null;
  cancelDraw();
  player.dodge = null;
  f.act = 'gloat';
  f.t = 0;
  f.dur = BOSS.teeter.time + 1;
  impact('white', 50);
  Sfx.wicker();
  Sfx.bossLaugh();
  $('boss-hint').classList.remove('hidden');
}

function bossMashed() {
  const tt = bossFight.teeter;
  if (!tt || tt.done) return;
  tt.got++;
  tt.jolt = 1;
  Sfx.bossMash();
}

function bossTeeterTick(dt) {
  const f = bossFight, tt = f.teeter;
  if (!tt) return;
  tt.t += dt;
  tt.jolt = Math.max(0, tt.jolt - dt * 5);
  if (!tt.done) {
    tt.lean = Math.min(1, tt.lean + dt * 5);
    if (tt.got >= tt.need) {
      // Hauled herself back in: Teto didn't expect that.
      tt.done = 'saved';
      tt.doneT = 0;
      Sfx.wicker();
      say(bossText('teeterBack'), 2.4);
      bossOpen(0.3);
    } else if (tt.t >= BOSS.teeter.time) {
      // Too slow: Teto yanks her back by the twin tails, for the footage.
      tt.done = 'yanked';
      tt.doneT = 0;
      f.act = 'yank';
      f.t = 0;
      f.dur = 0.7;
      bossTaunt(bossText('teeterSave'), 2);
    }
  } else {
    tt.doneT += dt;
    if (tt.done === 'yanked' && tt.doneT < 0.35) return;
    if (tt.done === 'yanked' && !tt.hurt) { tt.hurt = true; bossBlow('teeter', false); }
    tt.lean = Math.max(0, tt.lean - dt * 4);
    if (tt.lean <= 0) {
      // Back on her feet, a step in from the rim.
      bossFrame();
      bossWorld(player.pos, tt.spot.x - tt.out.x * 0.2, 0, tt.spot.z - tt.out.z * 0.2);
      f.teeter = null;
      f.hasPrev = false;
      $('boss-hint').classList.add('hidden');
    }
  }
}

// Her mind, each frame of the fight: circle, wind up, strike, reel.
function bossThink(dt) {
  const f = bossFight, T = game.time;
  f.t += dt;
  const tt = bossLocal(bossP, player.pos);
  const toX = tt.x - f.at.x, toZ = tt.z - f.at.z;
  const dist = Math.hypot(toX, toZ) || 1e-4;
  const face = Math.atan2(toX, toZ);
  let turn = 9;
  const step = (gx, gz, speed) => {
    const dx = gx - f.at.x, dz = gz - f.at.z, d = Math.hypot(dx, dz);
    if (d > 1e-3) { const s = Math.min(d, speed * dt) / d; f.at.x += dx * s; f.at.z += dz * s; }
  };
  f.hipY = 0;

  if (f.act === 'stalk') {
    // About an arm's length off, edging round her.
    const back = 0.8 / dist;
    const gx = tt.x - toX * back - toZ / dist * f.circle * 0.25, gz = tt.z - toZ * back + toX / dist * f.circle * 0.25;
    step(gx, gz, 0.9);
    if (T > f.tauntAt) {
      f.tauntAt = T + 7 + Math.random() * 5;
      if (Math.random() < 0.6) bossTaunt(bossPick('taunts'), 2);
    }
    if (f.t >= f.dur) bossChooseAttack();
  } else if (f.act === 'windup') {
    const k = f.attack;
    if (k === 'burner') {
      const u = clamp(f.t / BOSS_HOP, 0, 1);
      f.at.lerpVectors(f.from, f.bar, smooth(u));
      f.hipY = BOSS_HANG * smooth(u) + Math.sin(u * Math.PI) * 0.25;
      turn = 4;
    } else if (k === 'claw') {
      step(tt.x, tt.z, 0.35);
    } else {
      // Coiling back, eyes on her.
      step(f.at.x - toX / dist, f.at.z - toZ / dist, 0.12);
    }
    // Her aim follows Miku until a moment before she goes.
    if (!f.locked) f.target.set(tt.x, 0, tt.z);
    if (!f.locked && f.t >= f.dur - (k === 'burner' ? 0.3 : 0.1)) {
      f.locked = true;
      if (k === 'burner') Sfx.bossHiss();
    }
    if (!f.glinted && f.t >= f.dur - 0.24) {
      f.glinted = true;
      f.glint = 1;
      Sfx.bossTell();
    }
    if (f.t >= f.dur) bossStrike();
  } else if (f.act === 'strike') {
    const k = f.attack, u = clamp(f.t / f.dur, 0, 1);
    if (k === 'lunge' || k === 'shove') {
      // The dash stops dead where it runs into her.
      const px = f.at.x, pz = f.at.z;
      f.at.lerpVectors(f.from, f.to, 1 - (1 - u) * (1 - u));
      if (Math.hypot(tt.x - f.at.x, tt.z - f.at.z) < BOSS.apart) { f.at.x = px; f.at.z = pz; }
      turn = 1;
      const near = Math.hypot(tt.x - f.at.x, tt.z - f.at.z);
      if (!f.struck && near < (k === 'lunge' ? 0.64 : 0.68)) {
        f.struck = true;
        if (k === 'lunge') {
          if (bossBlow('lunge')) f.knock.set(toX / dist, 0, toZ / dist).multiplyScalar(0.32);
        } else if (!bossDodging()) {
          bossStartTeeter(bossU.set(toX / dist, 0, toZ / dist));
          return;
        } else Sfx.bossWhoosh();
      }
      if (u >= 1) {
        // Into the wicker, if nothing stopped her.
        if (!f.struck) { Sfx.thud(); balloon.burnHold = Math.max(balloon.burnHold, 0.15); }
        if (k === 'lunge' && Math.random() < BOSS.combo[boss.stage]) bossBeginAttack('claw', 0.45);
        else bossOpen(k === 'shove' && !f.struck ? 0.5 : 0);
      }
    } else if (k === 'claw') {
      step(tt.x, tt.z, 0.5);
      turn = 2.5;
      const n = Math.floor(f.t / 0.21);
      if (n > f.swipes && f.t < f.dur) {
        f.swipes = n;
        Sfx.bossSwipe();
        const off = Math.atan2(Math.sin(face - f.yaw), Math.cos(face - f.yaw));
        if (dist < 0.86 && Math.abs(off) < 1.2) bossBlow('claw');
      }
      if (f.t >= f.dur) bossOpen();
    } else if (k === 'burner') {
      turn = 3;
      if (f.t < BOSS_BLAST) {
        f.at.copy(f.bar);
        f.hipY = BOSS_HANG;
        balloon.burnHold = Math.max(balloon.burnHold, 0.3);
        const inZone = Math.hypot(tt.x - f.target.x, tt.z - f.target.z) < BOSS_ZONE;
        if (!f.struck && f.t > 0.1 && inZone) { f.struck = true; bossBlow('burner', false); }
      } else {
        // Down off the frame, shaking her hands.
        const u2 = clamp((f.t - BOSS_BLAST) / (f.dur - BOSS_BLAST), 0, 1);
        bossKeepIn(bossW.copy(f.bar).multiplyScalar(0.9));
        f.at.lerpVectors(f.bar, bossW, smooth(u2));
        f.hipY = BOSS_HANG * (1 - smooth(u2));
      }
      if (f.t >= f.dur) bossOpen(0.3);
    }
  } else if (f.act === 'open') {
    turn = 1.2;
    if (f.t >= f.dur) bossStalk();
  } else if (f.act === 'taunt') {
    // Back off to the far side to shout about it.
    step(-tt.x * 0.6, -tt.z * 0.6, 1.2);
    if (f.t >= f.dur) bossStalk(0.9);
  } else if (f.act === 'gloat') {
    // Pointing and laughing while she hangs out over the drop.
    const sp = f.teeter ? f.teeter.spot : tt;
    step(sp.x * 0.1, sp.z * 0.1, 0.8);
    if (!f.teeter && f.t > 0.5) bossOpen();
  } else if (f.act === 'yank') {
    step(tt.x * 0.6, tt.z * 0.6, 2);
    if (f.t >= f.dur) bossOpen(-0.4);
  }
  f.yaw = angleLerp(f.yaw, face, 1 - Math.exp(-turn * dt));
  // Hanging off the burner she's above the fray; on the floor, inside the wicker and off her toes.
  if (f.hipY < 0.3) {
    bossKeepIn(f.at);
    const dx = f.at.x - tt.x, dz = f.at.z - tt.z, d = Math.hypot(dx, dz);
    if (d < BOSS.apart && !f.teeter) {
      const nx = d > 1e-4 ? dx / d : Math.sin(f.yaw + Math.PI), nz = d > 1e-4 ? dz / d : Math.cos(f.yaw + Math.PI);
      f.at.x = tt.x + nx * BOSS.apart;
      f.at.z = tt.z + nz * BOSS.apart;
      bossKeepIn(f.at);
      // Cornered against the wicker, she shoves Miku back instead.
      const gx = tt.x - f.at.x, gz = tt.z - f.at.z, g = Math.hypot(gx, gz);
      if (g < BOSS.apart - 0.01) {
        tt.x = f.at.x + (g > 1e-4 ? gx / g : -nx) * BOSS.apart;
        tt.z = f.at.z + (g > 1e-4 ? gz / g : -nz) * BOSS.apart;
        bossKeepIn(tt);
        bossWorld(player.pos, tt.x, 0, tt.z);
        f.prev.set(tt.x, 0, tt.z);
      }
    }
  }
}

// What her body does for the moment she's in.
function bossPoseFight(dt) {
  const f = bossFight, T = game.time, p = bossKit.want;
  const k = f.attack, u = clamp(f.t / f.dur, 0, 1);
  let rate = 12;
  if (f.act === 'stalk') bossStance(p, T);
  else if (f.act === 'taunt') bossGesture(p, boss.stage === 2 ? 'wide' : 'point', T);
  else if (f.act === 'gloat') bossSass(p, T, 1);
  else if (f.act === 'yank') {
    bossStance(p, T);
    p.handR.set(-0.1, 0.32, 0.38);
    p.poleR.set(-0.5, -0.6, -0.3);
    p.chestX = 0.3;
  } else if (f.act === 'open') {
    if (k === 'claw') bossPant(p, T);
    else if (k === 'burner') bossSinged(p, T);
    else bossDizzy(p, T);
  } else if (f.act === 'windup') {
    const tremble = Math.sin(T * 40) * 0.02;
    if (k === 'lunge') {
      bossBase(p, 0.72, 0.26, -0.24);
      Object.assign(p, { chestX: 0.5, chestZ: tremble, headX: -0.45, splayL: 0.14, splayR: -0.14 });
      p.handL.set(0.2, -0.04, -0.18); p.handR.set(-0.2, -0.04, -0.18);
      p.poleL.set(0.6, -0.5, 0.2); p.poleR.set(-0.6, -0.5, 0.2);
    } else if (k === 'claw') {
      bossBase(p, 0.86, 0.1, -0.1);
      Object.assign(p, { chestX: -0.12, chestZ: tremble, headX: 0.05 });
      p.handL.set(0.21, 0.42 + Math.sin(T * 22) * 0.02, 0.12); p.handR.set(-0.21, 0.42 + Math.cos(T * 22) * 0.02, 0.12);
      p.poleL.set(0.9, 0.3, -0.3); p.poleR.set(-0.9, 0.3, -0.3);
    } else if (k === 'shove') {
      bossBase(p, 0.78, 0.22, -0.2);
      Object.assign(p, { chestX: 0.5, chestY: 0.4, chestZ: tremble, headX: -0.4, headY: -0.3 });
      p.handL.set(0.16, -0.06, -0.14); p.handR.set(-0.06, 0.0, -0.18);
      p.poleL.set(0.6, -0.6, 0.1); p.poleR.set(-0.6, -0.6, 0.1);
    } else if (k === 'burner') {
      // A leap, then hanging off the burner frame, legs kicking.
      const up = smooth(clamp((f.t - BOSS_HOP * 0.5) / (BOSS_HOP * 0.6), 0, 1));
      bossHang(p, T, up);
      p.headX += tremble;
      p.hipY += f.hipY;
      rate = 16;
    }
  } else if (f.act === 'strike') {
    if (k === 'lunge' || k === 'shove') {
      bossBase(p, 0.8, 0.34, -0.36);
      Object.assign(p, { lean: 0.25, chestX: 0.35, headX: -0.45 });
      p.thighL = -1.0; p.shinL = 0.7; p.thighR = 0.45; p.shinR = 0.25;
      if (k === 'lunge') { p.handL.set(0.1, 0.25, 0.36); p.handR.set(-0.1, 0.25, 0.36); } else { p.handL.set(0.12, 0.14, 0.38); p.handR.set(-0.12, 0.14, 0.38); }
      p.poleL.set(0.5, -0.6, -0.4); p.poleR.set(-0.5, -0.6, -0.4);
      rate = 28;
    } else if (k === 'claw') {
      // Swipe after swipe, hand over hand, high outside to low across.
      bossBase(p, 0.84, 0.16, -0.12);
      const n = Math.floor(f.t / 0.21), s = (f.t % 0.21) / 0.21, side = n % 2 ? 1 : -1;
      const sw = smooth(s);
      Object.assign(p, { chestX: 0.22, chestY: side * lerp(-0.35, 0.35, sw), headX: -0.2 });
      const strike = side > 0 ? p.handL : p.handR, rest = side > 0 ? p.handR : p.handL;
      strike.set(side * lerp(0.24, -0.06, sw), lerp(0.38, 0.02, sw), lerp(0.14, 0.34, sw));
      rest.set(-side * 0.16, 0.3, 0.16);
      p.poleL.set(0.8, -0.2, -0.4); p.poleR.set(-0.8, -0.2, -0.4);
      rate = 30;
    } else if (k === 'burner') {
      // Hanging off the frame while it blasts, then down, shaking her fingers.
      const hanging = f.t < BOSS_BLAST;
      if (hanging) bossHang(p, T, 1);
      else bossSinged(p, T);
      p.hipY += f.hipY;
      rate = 16;
    }
  }
  // Flinching from a hit.
  p.chestX -= f.flinch * 0.35;
  p.headX -= f.flinch * 0.4;
  f.flinch = Math.max(0, f.flinch - dt * 4);
  if ((f.act === 'windup' || f.act === 'strike') && k === 'burner') bossBurnerGrips();
  bossEase(bossKit.cur, p, 1 - Math.exp(-rate * dt));
  bossApply(bossKit.cur, f.at, f.yaw);
  bossKit.avatar.simulate(dt);
}

// Her hands on the burner frame's bar, either side of where she hangs, each on her own side.
function bossBurnerGrips() {
  const f = bossFight, b = f.bar;
  const alongX = Math.abs(Math.abs(b.z) - 0.42) < 1e-3;
  const ax = alongX ? 0.15 : 0, az = alongX ? 0 : 0.15;
  // Her left, in the basket's frame.
  const lx = Math.cos(f.yaw), lz = -Math.sin(f.yaw);
  const s = ax * lx + az * lz >= 0 ? 1 : -1;
  bossWorld(f.gripL, b.x + ax * s, BALLOON.burnerY, b.z + az * s);
  bossWorld(f.gripR, b.x - ax * s, BALLOON.burnerY, b.z - az * s);
}

// Hanging by both hands, legs kicking (`up` 0-1 as she gets there).
function bossHang(p, T, up) {
  const kick = Math.sin(T * 11);
  bossBase(p, 0.92, 0.06, -0.02);
  Object.assign(p, { grip: up, chestX: -0.1 * up, headX: 0.3 * up });
  p.thighL = lerp(p.thighL, -0.35 + kick * 0.4, up);
  p.thighR = lerp(p.thighR, -0.35 - kick * 0.4, up);
  p.shinL = lerp(p.shinL, 0.7 + kick * 0.3, up);
  p.shinR = lerp(p.shinR, 0.7 - kick * 0.3, up);
}

/* ---------- Effects ---------- */
function bossEffects(dt) {
  const f = bossFight, K = bossKit, T = game.time;
  // The glint, flaring and fading.
  f.glint = Math.max(0, f.glint - dt * 3.2);
  K.glint.material.opacity = Math.min(1, f.glint * 1.6);
  K.glint.scale.setScalar(0.1 + f.glint * 0.3);
  K.glint.material.rotation = T * 3;
  // Stars while she's open.
  const dizzy = boss.phase === 'defeat' ? bossScene && bossScene.t < BOSS_FALL.slip : boss.phase === 'fight' && f.act === 'open';
  K.stars.visible = !!dizzy;
  if (dizzy) {
    K.stars.children.forEach((star, i) => {
      const a = T * 4 + (i / 3) * Math.PI * 2;
      star.position.set(Math.cos(a) * 0.16, Math.sin(a * 2) * 0.02, Math.sin(a) * 0.16);
    });
  }
  // The burner: the zone it's about to scorch, and the flame itself.
  const burner = boss.phase === 'fight' && f.attack === 'burner' && (f.act === 'windup' || f.act === 'strike');
  const aiming = burner && f.act === 'windup' && f.t > BOSS_HOP;
  const blasting = burner && f.act === 'strike' && f.t < BOSS_BLAST;
  K.fx.zone += ((aiming || blasting ? 1 : 0) - K.fx.zone) * (1 - Math.exp(-10 * dt));
  K.zone.visible = K.fx.zone > 0.02;
  if (K.zone.visible) {
    bossWorld(K.zone.position, f.target.x, 0, f.target.z);
    K.zone.quaternion.copy(balloonModel.rig.quaternion);
    const pulse = f.locked ? 1 : 0.6 + Math.sin(T * 18) * 0.2;
    K.column.material.opacity = K.fx.zone * (blasting ? 0.7 : 0.35 * pulse);
    K.ring.material.opacity = K.fx.zone * (blasting ? 1 : 0.85 * pulse);
    K.column.material.color.setHex(blasting ? 0xffa040 : f.locked ? 0xff5a2a : 0xff3a3a);
  }
  const want = blasting ? 1 : aiming ? 0.15 : 0;
  K.fx.jet += (want - K.fx.jet) * (1 - Math.exp(-(blasting ? 20 : 6) * dt));
  K.jet.visible = K.fx.jet > 0.02;
  if (K.jet.visible) {
    bossWorld(bossV, 0, BALLOON.burnerY + 0.26, 0);
    bossWorld(bossW, f.target.x, 0.05, f.target.z);
    K.fx.reach += ((blasting ? 1 : 0.22) - K.fx.reach) * (1 - Math.exp(-14 * dt));
    K.jet.tick(dt, bossV, bossW, K.fx.reach, K.fx.jet);
    if (blasting && Math.random() < dt * 30) burst(bossW, 0xffa040, 3, 2.2);
  }
}

// The two fuel hoses run up through the middle of the basket, right across every view of
// the fight from the tanks' side, so they're tucked away while it lasts.
function bossHoses(visible) {
  if (!bossKit || !balloonModel) return;
  if (!bossKit.hoses) bossKit.hoses = balloonModel.rig.children.filter((o) => o.isMesh && o.geometry && o.geometry.type === 'TubeGeometry');
  for (const hose of bossKit.hoses) hose.visible = visible;
}

function bossHideEffects() {
  if (!bossKit) return;
  bossKit.zone.visible = false;
  bossKit.jet.visible = false;
  bossKit.stars.visible = false;
  bossKit.glint.material.opacity = 0;
  bossKit.fx.zone = bossKit.fx.jet = bossKit.fx.reach = 0;
}

// The Breath's steam keeps rising past the basket; close in, it would hide the fight, so
// the puffs fade as they pass near it, or swell round the camera.
function bossThinSteam() {
  balloonFx.steam.fade(bossSteamFade);
}
function bossSteamFade(at, size) {
  const near = clamp((at.distanceTo(balloon.pos) - 3.5) / 4.5, 0, 1);
  const round = clamp((at.distanceTo(camera.position) - size * 0.5) / 3, 0, 1);
  return Math.min(near, round);
}

/* ---------- The fight's camera and HUD ---------- */
// Tighter than the forest's follow camera and a little higher, looking down into the
// basket so both of them fit. The mouse still steers it (the bow aims down its middle), but
// it leans gently towards Teto when she drifts out of view.
function bossCamera(dt) {
  const C = BOSS.cam, f = bossFight;
  if (!f.teeter && !player.drawing && !aiming && dt > 0) {
    // Turned so she sits under the crosshair, clear of Miku's shoulder.
    bossKit.avatar.hips.getWorldPosition(bossV);
    const dx = bossV.x - player.pos.x, dz = bossV.z - player.pos.z, d = Math.max(0.3, Math.hypot(dx, dz));
    const side = lerp(C.shoulder, 0.38, player.adsCam || 0);
    const want = Math.atan2(dx, dz) + Math.asin(Math.min(0.9, side / d));
    const diff = Math.atan2(Math.sin(want - player.yaw), Math.cos(want - player.yaw));
    const excess = Math.abs(diff) - 0.3;
    if (excess > 0) player.yaw += Math.sign(diff) * Math.min(excess, C.assist * dt * (0.4 + excess));
  }
  const a = player.adsCam || 0;
  const pitch = player.pitch + player.recoil;
  const dist = lerp(C.dist, 1.55, a), shoulder = lerp(C.shoulder, 0.38, a), height = lerp(C.height, 1.45, a);
  const cp = Math.cos(pitch), sp = Math.sin(pitch), s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const P = player.pos;
  camera.position.set(P.x - s * cp * dist - c * shoulder, P.y + height - sp * dist, P.z - c * cp * dist + s * shoulder);
  camera.position.y = clamp(camera.position.y, P.y + 1.15, P.y + C.top);
  if (player.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * player.shake * 0.5;
    camera.position.y += (Math.random() - 0.5) * player.shake * 0.5;
  }
  const look = pitch - C.tilt * (1 - a);
  camera.lookAt(camera.position.x + s * Math.cos(look), camera.position.y + Math.sin(look), camera.position.z + c * Math.cos(look));
}

function bossHud(dt) {
  const f = bossFight, shown = f.shown;
  const share = boss.health / BOSS.health;
  // The lag bar trails the health bar down, so each hit shows its size.
  f.lag = f.lag > share ? Math.max(share, f.lag - dt * 0.35) : share;
  const bar = Math.round(share * 1000), lag = Math.round(f.lag * 1000);
  if (bar !== shown.bar) { shown.bar = bar; $('boss-bar').querySelector('.boss-fill').style.width = `${bar / 10}%`; }
  if (lag !== shown.lag) { shown.lag = lag; $('boss-bar').querySelector('.boss-lag').style.width = `${lag / 10}%`; }
  if (boss.stage !== shown.stage) { shown.stage = boss.stage; $('boss-bar').dataset.stage = boss.stage + 1; }
  const tt = f.teeter;
  const mash = tt && !tt.done ? Math.round(Math.min(1, tt.got / tt.need) * 100) : -1;
  if (mash !== shown.mash) {
    shown.mash = mash;
    if (mash >= 0) $('boss-hint').querySelector('i').style.width = `${mash}%`;
  }
  if (f.tauntOff && game.time > f.tauntOff) { f.tauntOff = 0; $('boss-taunt').classList.remove('on'); }
}

// Things that don't belong in a basket fight: the crafting list, binoculars, a prompt for
// whatever's fifty metres below, wolves charging from under the balloon, and the cold.
function bossGuard() {
  if (survival.crafting) setCrafting(false);
  if (binocularsUp()) toggleBinoculars();
  setPrompt('');
  wolfAttack.cooldown = Math.max(wolfAttack.cooldown, 20);
}

/* ---------- The reveal ---------- */
// Called by the balloon once it's clear of the trees.
function bossBegin(resume) {
  if (!bossKit || boss.phase !== 'none') { resume(); return; }
  boss.resume = resume;
  boss.tries = 0;
  boss.time = 0;
  boss.won = false;
  boss.pendingRetry = false;
  boss.health = BOSS.health;
  boss.stage = 0;
  // She's here now, not by the wreck.
  if (survivor.avatar) survivor.avatar.setVisible(false);
  clearWolves();
  bossHoses(false);
  document.body.classList.add('boss-fight');
  bossFrame();
  const f = bossFight;
  f.at.set(0, 0, 0.95);
  f.yaw = Math.PI;
  f.teeter = null;
  f.knock.set(0, 0, 0);
  bossCopyPose(bossKit.cur, bossKit.want);
  // Her lines, one after another, each with a gesture and a shot.
  const R = BOSS_REVEAL;
  const story = crimson.phase === 'gone' ? bossList('gone') : bossList('asleep');
  const confess = bossList('confess');
  const lines = [
    { text: story[0], gesture: 'shrug' },
    ...story.slice(1).map((text) => ({ text, gesture: 'flip' })),
    { text: confess[0], gesture: 'proud' },
    ...confess.slice(1).map((text) => ({ text, gesture: 'point' })),
    { text: bossText('pants'), gesture: 'wide', pants: true },
    { text: bossText('reply'), tt: true },
    { text: bossText('fight'), gesture: 'fists' },
  ];
  let at = R.talk;
  for (const line of lines) {
    line.at = at;
    at += bossReadTime(line.text) + (line.pants ? 0.9 : 0.15);
  }
  bossScene = { kind: 'reveal', t: 0, fired: {}, lines, end: at + 0.2, gesture: 'proud' };
  boss.phase = 'reveal';
  bossKit.avatar.setVisible(false);
  bossKit.avatar.reset();
  playScene({ update: bossRevealUpdate, skip: () => bossStartFight() });
  Sfx.bossLurch();
}

function bossCue(key, at, fn) {
  const s = bossScene;
  if (!s.fired[key] && s.t >= at) { s.fired[key] = true; fn(); }
}

// The basket's lurch as someone grabs hold underneath, and her weight on one side after.
function bossLurch(t) {
  const R = BOSS_REVEAL, m = balloonModel;
  const jolt = (at, size) => (t > at ? size * Math.exp(-(t - at) * 3) * Math.sin((t - at) * 10) : 0);
  const weight = span(t, R.fingers - 0.2, R.peek) * (1 - span(t, R.over, R.land + 0.3)) * 0.035;
  m.rig.rotation.x += jolt(R.lurch, 0.07) + jolt(R.haul, 0.03) + jolt(R.land, 0.04) + weight;
  m.group.updateMatrixWorld(true);
}

function bossRevealUpdate(dt) {
  const s = bossScene, R = BOSS_REVEAL, f = bossFight;
  if (!s) return;
  s.t += dt;
  game.time += dt;
  const t = s.t, T = game.time;
  tickBalloon(dt);
  bossLurch(t);
  bossFrame();

  bossCue('think', R.think, () => bossSceneLine(bossText('lurch'), 'line'));
  bossCue('fingers', R.fingers - 0.35, () => { caption(''); bossKit.avatar.setVisible(true); bossKit.avatar.reset(); });
  bossCue('grab', R.fingers, () => Sfx.wicker());
  bossCue('peek', R.peek, () => bossSceneLine(bossText('peek')));
  bossCue('haul', R.haul, () => { caption(''); Sfx.wicker(); Sfx.ropeCreak(); });
  bossCue('land', R.land, () => { Sfx.thud(); bossWorld(bossV, 0, 0.1, 0.42); burst(bossV, 0xf2f5ff, 12, 1.6); });
  for (const [i, line] of s.lines.entries()) {
    bossCue(`line${i}`, line.at, () => {
      if (line.tt) { bossSceneLine(line.text, 'line'); return; }
      s.gesture = line.gesture;
      bossSceneLine(line.text);
      if (line.pants) { impact('invert', 90); Sfx.bossSting(); s.pantsAt = s.t; }
    });
  }

  // Her: under the basket, fingers on the rim, up and over, and in.
  const p = bossKit.want;
  let rate = 14;
  const rimY = BALLOON.basket.h - BALLOON.basket.floor;
  bossWorld(f.gripL, 0.2, rimY + 0.03, 0.79);
  bossWorld(f.gripR, -0.2, rimY + 0.03, 0.79);
  if (t < R.over) {
    bossBase(p, 0.2, 0.05, 0.05);
    let hipY, z = 0.95, lean = 0.08;
    if (t < R.peek) hipY = lerp(0.1, 0.42, span(t, R.fingers - 0.3, R.fingers + 0.4));
    else if (t < R.haul) hipY = lerp(0.42, 0.68, span(t, R.peek, R.peek + 0.25));
    else {
      const u = span(t, R.haul, R.over);
      hipY = lerp(0.68, 1.1, u);
      z = lerp(0.95, 0.84, u);
      lean = lerp(0.08, 0.9, u);
    }
    const kick = Math.sin(T * 9);
    Object.assign(p, { hipY, lean, grip: 1, chestX: 0.05, headX: t < R.haul ? -0.3 : -0.5, headY: t > R.peek && t < R.haul ? Math.sin((t - R.peek) * 5) * 0.4 : 0 });
    p.thighL = -0.3 + kick * 0.35; p.thighR = -0.3 - kick * 0.35; p.shinL = 0.5; p.shinR = 0.5;
    p.poleL.set(0.6, -0.6, -0.3); p.poleR.set(-0.6, -0.6, -0.3);
    f.at.set(0, 0, z);
    if (t > R.haul + 0.4) { p.thighL = -1.4; p.shinL = 1.7; }
  } else if (t < R.land) {
    // A leg over the rim and she tumbles in.
    const u = span(t, R.over, R.land);
    bossBase(p, lerp(1.0, 0.62, u), 0.2, -0.1);
    Object.assign(p, { lean: lerp(0.9, 0.2, u), grip: 1 - span(t, R.over + 0.2, R.land - 0.1), headX: -0.3 });
    p.thighL = lerp(-1.6, -0.8, u); p.shinL = lerp(1.8, 1.2, u);
    f.at.set(0, 0, lerp(0.8, 0.42, u));
    rate = 18;
  } else if (t < R.talk - 0.3) {
    // The landing: a crouch, a hair flip.
    bossGesture(p, 'flip', T);
    p.hipY = lerp(0.6, 0.9, span(t, R.land, R.land + 0.45));
    bossLeg(p, 'L', p.hipY, 0.1);
    bossLeg(p, 'R', p.hipY, -0.06);
    f.at.set(0, 0, 0.42);
  } else {
    bossGesture(p, s.gesture, T);
    if (s.gesture === 'fists') bossStance(p, T, 0.3);
    f.at.set(0, 0, 0.42);
  }
  bossEase(bossKit.cur, p, 1 - Math.exp(-rate * dt));
  if (bossKit.avatar.root.visible) {
    bossApply(bossKit.cur, f.at, f.yaw);
    bossKit.avatar.simulate(dt);
  }

  // Miku, braced by the burner, facing the side she comes over.
  bossPoseRider(dt, 0, -0.2, 0);
  if (t > R.lurch && t < R.lurch + 0.5) avatar.head.rotation.z = Math.sin((t - R.lurch) * 20) * 0.08;

  // Shots, in the basket's frame.
  const line = s.lines.slice().reverse().find((l) => t >= l.at);
  const pants = s.pantsAt !== undefined && line && line.pants;
  let cam, look, fov = 50, roll = 0;
  if (t < R.fingers - 0.2) { cam = [1.8, 1.95, -1.55]; look = [0, 1.05, 0.25]; fov = 52; }
  else if (t < R.haul) { cam = [0.64, 1.62, -0.56]; look = [0, 1.02, 0.75]; fov = 46; }
  else if (t < R.talk - 0.1) { cam = [2.2, 1.45, 0.25]; look = [0, 1.15, 0.5]; fov = 48; }
  else if (pants) {
    const u = smooth((t - s.pantsAt) / 0.5);
    cam = [lerp(1.3, 0.92, u), 1.5, lerp(-0.1, -0.12, u)]; look = [0, 1.38, 0.42]; fov = lerp(44, 34, u); roll = -0.16 * u;
    drawSpeedLines(0.7 * (1 - span(t, s.pantsAt + 1.2, s.pantsAt + 2.2)), T);
  } else if (line && line.tt) { cam = [0.95, 1.5, 0.35]; look = [0, 1.38, -0.2]; fov = 40; drawSpeedLines(0, 0); }
  else {
    const u = clamp((t - R.talk) / 14, 0, 1);
    cam = [lerp(2.4, 2.0, u), 1.7, 0.1]; look = [0, 1.28, 0.12]; fov = 46;
    drawSpeedLines(0, 0);
  }
  bossWorld(camera.position, cam[0], cam[1], cam[2]);
  bossWorld(bossV, look[0], look[1], look[2]);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0).applyQuaternion(balloonModel.rig.quaternion);
  camera.lookAt(bossV);
  setFov(fov);
  balloonSteam(dt, 0.5);
  bossThinSteam();
  balloonLookAt(camera.position.y - balloonSpot.y, 1);
  if (t >= s.end) bossStartFight();
}

/* ---------- The fight ---------- */
// Both of them back to the start: full health, her on the side she climbed in, Miku
// by the tanks.
function bossResetFight() {
  const f = bossFight;
  boss.health = BOSS.health;
  boss.stage = 0;
  boss.pendingRetry = false;
  survival.health = 100;
  survival.warmth = 100;
  player.stamina = 100;
  player.dodge = null;
  survival.swing = null;
  cancelDraw();
  Object.assign(f, { act: 'stalk', attack: null, next: null, t: 0, dur: 1.8, locked: false, glinted: false, struck: false, flinch: 0, glint: 0, lag: 1, teeter: null, hasPrev: false, tauntOff: 0 });
  f.last.length = 0;
  f.knock.set(0, 0, 0);
  f.at.set(0, 0, 0.42);
  f.yaw = Math.PI;
  f.tauntAt = game.time + 4;
  f.shown.bar = f.shown.lag = f.shown.mash = f.shown.stage = -1;
  bossFrame();
  bossWorld(player.pos, 0, 0, -0.2);
  player.bodyYaw = player.yaw = bossBasketYaw();
  player.pitch = -0.06;
  $('boss-hint').classList.add('hidden');
  $('boss-taunt').classList.remove('on');
  bossHideEffects();
}

function bossStartFight() {
  if (boss.phase !== 'reveal' && boss.phase !== 'retry') return;
  const first = boss.phase === 'reveal';
  bossScene = null;
  caption('');
  drawSpeedLines(0, 0);
  bossKit.avatar.setVisible(true);
  bossResetFight();
  boss.phase = 'fight';
  $('boss-fade').classList.remove('on');
  boss.tries++;
  if (activeScene) endScene();
  bossStance(bossKit.cur, game.time);
  bossApply(bossKit.cur, bossFight.at, bossFight.yaw);
  bossKit.avatar.reset();
  poseAvatar(1 / 60, bossZero, false);
  avatar.reset();
  $('boss-bar').classList.remove('hidden');
  bossHud(0);
  bossCamera(0);
  if (first) {
    showBanner(bossText('kicker'), bossText('name'), bossText('sub'));
    say(bossText('hint'), 4.5);
  } else {
    say(bossText('retryThought'), 3);
  }
}

function updateBoss(dt) {
  if (boss.phase !== 'fight' || game.state !== 'playing' || !bossFighting()) return;
  bossFrame();
  boss.time += dt;
  if (mod.fly) {
    // Flying skips the floor in updatePlayer; she stays in the basket all the same.
    bossHoldPlayer(player.pos, dt);
    poseAvatar(0, bossZero, false);
    avatar.simulate(0);
  }
  bossGuard();
  bossAxeCheck();
  bossTeeterTick(dt);
  if (boss.health > 0) bossThink(dt);
  bossPoseFight(dt);
  bossEffects(dt);
  bossCamera(dt);
  bossHud(dt);
  bossThinSteam();
  if (boss.pendingRetry) bossStartRetry();
  else if (boss.health <= 0) bossStartDefeat();
}

/* ---------- Losing: take two ---------- */
function bossStartRetry() {
  boss.pendingRetry = false;
  boss.phase = 'retry';
  bossScene = { kind: 'retry', t: 0, fired: {}, reset: false };
  bossFight.teeter = null;
  $('boss-hint').classList.add('hidden');
  $('boss-taunt').classList.remove('on');
  bossHideEffects();
  playScene({ update: bossRetryUpdate, skip: () => { bossRetryReset(); bossStartFight(); } });
  $('boss-fade').classList.add('on');
}

function bossRetryReset() {
  const s = bossScene;
  if (!s || s.reset) return;
  s.reset = true;
  bossResetFight();
  $('boss-fade').classList.remove('on');
}

function bossRetryUpdate(dt) {
  const s = bossScene;
  if (!s) return;
  s.t += dt;
  game.time += dt;
  tickBalloon(dt);
  bossFrame();
  bossCue('reset', 0.7, () => { bossRetryReset(); $('boss-fade').classList.add('on'); });
  bossCue('line', 0.8, () => bossSceneLine(bossPick('retry')));
  bossCue('in', 2.2, () => $('boss-fade').classList.remove('on'));
  const p = bossKit.want, f = bossFight;
  bossGesture(p, s.reset ? 'point' : 'proud', game.time);
  bossEase(bossKit.cur, p, 1 - Math.exp(-12 * dt));
  bossApply(bossKit.cur, f.at, f.yaw);
  bossKit.avatar.simulate(dt);
  const tt = bossLocal(bossL, player.pos);
  bossPoseRider(dt, tt.x, tt.z, player.bodyYaw - bossBasketYaw());
  bossCamera(0);
  balloonSteam(dt, 0.5);
  bossThinSteam();
  balloonLookAt(camera.position.y - balloonSpot.y, 1);
  if (s.t >= 2.8) bossStartFight();
}

/* ---------- Winning: over the rim ---------- */
function bossStartDefeat() {
  const f = bossFight;
  boss.phase = 'defeat';
  boss.won = true;
  f.teeter = null;
  $('boss-hint').classList.add('hidden');
  $('boss-taunt').classList.remove('on');
  $('boss-bar').classList.add('hidden');
  bossHideEffects();
  // Over whichever rim is nearest her (not the back, where the tanks are).
  const walls = [[0, 1], [1, 0], [-1, 0]];
  let out = walls[0], best = -Infinity;
  for (const w of walls) { const d = f.at.x * w[0] + f.at.z * w[1]; if (d > best) { best = d; out = w; } }
  const tt = bossLocal(bossL, player.pos);
  bossScene = {
    kind: 'defeat', t: 0, fired: {}, from: f.at.clone(), out: new THREE.Vector3(out[0], 0, out[1]),
    rim: new THREE.Vector3(out[0] * 0.5, 0, out[1] * 0.5), tt: new THREE.Vector3(tt.x, 0, tt.z), fall: null, scream: null,
  };
  // Miku can't be standing where she staggers to.
  const s = bossScene;
  if (s.tt.distanceTo(s.rim) < 0.6) s.tt.copy(s.rim).addScaledVector(s.out, -0.62);
  bossKeepIn(s.tt);
  impact('white', 90);
  Sfx.bossOw();
  Sfx.bossStars();
  emitGame('bossDefeated');
  playScene({ update: bossDefeatUpdate, skip: bossFinish });
}

function bossDefeatUpdate(dt) {
  const s = bossScene, F = BOSS_FALL, f = bossFight, c = bossKit.avatar;
  if (!s) return;
  s.t += dt;
  game.time += dt;
  const t = s.t, T = game.time;
  tickBalloon(dt);
  bossFrame();
  bossCue('line', F.line, () => bossSceneLine(bossList('defeat')[0]));
  bossCue('last', F.last, () => bossSceneLine(bossList('defeat').slice(-1)[0]));
  bossCue('slip', F.slip, () => {
    caption('');
    impact('white', 60);
    Sfx.wicker();
    s.scream = Sfx.crimsonScream();
    // Off the rim and away: from her hips, out and up a little, then down.
    c.hips.getWorldPosition(bossV);
    const outW = bossW.copy(s.out).applyQuaternion(balloonModel.rig.quaternion);
    s.fall = { pos: bossV.clone(), vel: outW.clone().multiplyScalar(1.5).setY(1.6), spin: 0.55, yaw: bossBasketYaw() + Math.atan2(-s.out.x, -s.out.z) };
  });
  bossCue('pomf', F.pomf, () => {
    // Into the cloud of steam below, and gone.
    if (s.scream) { s.scream.stop(); s.scream = null; }
    if (s.fall) {
      for (let i = 0; i < 6; i++) {
        bossV.set(s.fall.pos.x + (Math.random() - 0.5) * 2, s.fall.pos.y + (Math.random() - 0.5) * 2, s.fall.pos.z + (Math.random() - 0.5) * 2);
        balloonFx.steam.emit(bossV, bossW.set(0, 1.5, 0), { life: 3, size: 4 + Math.random() * 3, grow: 2, alpha: 0.6 });
      }
    }
    Sfx.bossPomf();
    c.setVisible(false);
  });
  bossCue('far', F.far, () => bossSceneLine(bossText('fall'), 'crimson far'));
  bossCue('after', F.after, () => bossSceneLine(bossText('after'), 'line'));

  const p = bossKit.want;
  if (!s.fall) {
    // Staggering back to the rim, then teetering on it, hanging on by one hand.
    const u = span(t, 0, F.rim);
    f.at.lerpVectors(s.from, s.rim, u);
    f.yaw = angleLerp(f.yaw, Math.atan2(-s.out.x, -s.out.z), 1 - Math.exp(-6 * dt));
    if (t < F.rim) bossDizzy(p, T);
    else bossRimPose(p, T, t);
    bossEase(bossKit.cur, p, 1 - Math.exp(-10 * dt));
    bossApply(bossKit.cur, f.at, f.yaw);
  } else if (c.root.visible) {
    // Falling, turning over and over, limbs everywhere.
    const fl = s.fall;
    fl.vel.y -= 9.8 * dt;
    fl.pos.addScaledVector(fl.vel, dt);
    fl.spin += dt * 4.5;
    bossTeeterPose(p, T * 1.6, 1);
    p.lean = 0;
    bossEase(bossKit.cur, p, 1 - Math.exp(-14 * dt));
    c.root.quaternion.setFromAxisAngle(BOSS_UP, fl.yaw).multiply(bossQ2.setFromAxisAngle(BOSS_SIDE, -fl.spin));
    bossU.set(0, c.dims.hips, 0).applyQuaternion(c.root.quaternion);
    c.root.position.copy(fl.pos).sub(bossU);
    bossPlaceLimbs(c, bossKit.cur);
  }
  if (c.root.visible) c.simulate(dt);
  bossEffects(dt);

  // Miku stays where she is, watching.
  const watch = s.fall ? Math.atan2(s.rim.x - s.tt.x, s.rim.z - s.tt.z) : Math.atan2(f.at.x - s.tt.x, f.at.z - s.tt.z);
  bossPoseRider(dt, s.tt.x, s.tt.z, watch);

  // Shots: side on to her at the rim, then over the rim, looking down after her.
  const side = bossL.set(s.out.z, 0, -s.out.x);
  if (!s.fall || t < F.slip + 0.25) {
    bossWorld(camera.position, s.out.x * 0.1 + side.x * 2.3, 1.55, s.out.z * 0.1 + side.z * 2.3);
    bossWorld(bossW, s.out.x * 0.35, 1.15, s.out.z * 0.35);
    setFov(48);
  } else {
    bossWorld(camera.position, s.out.x * 0.95 + side.x * 0.45, 2.1, s.out.z * 0.95 + side.z * 0.45);
    if (c.root.visible) s.look = (s.look || new THREE.Vector3()).copy(s.fall.pos);
    bossW.copy(s.look || s.fall.pos);
    setFov(lerp(50, 38, span(t, F.slip, F.pomf)));
  }
  camera.up.set(0, 1, 0);
  camera.lookAt(bossW);
  balloonSteam(dt, 0.5);
  bossThinSteam();
  balloonLookAt(camera.position.y - balloonSpot.y, 1);
  if (t >= F.end) bossFinish();
}

// At the rim: leaning back further and further, one hand clinging on behind her.
function bossRimPose(p, T, t) {
  const F = BOSS_FALL;
  const tip = span(t, F.rim, F.slip);
  bossTeeterPose(p, T, 0.5 + tip * 0.5);
  if (t > F.line && t < F.slip) {
    // The other hand points at Miku for the last word.
    p.handR.set(-0.08, 0.2, 0.36);
    p.poleR.set(-0.3, -0.9, -0.3);
  }
}

// She's gone: the balloon carries on up through the cloud.
function bossFinish() {
  if (boss.phase !== 'defeat') return;
  const s = bossScene;
  if (s && s.scream) s.scream.stop();
  boss.phase = 'done';
  bossScene = null;
  bossKit.avatar.setVisible(false);
  bossHideEffects();
  bossHoses(true);
  document.body.classList.remove('boss-fight');
  caption('');
  if (activeScene) endScene();
  const go = boss.resume;
  boss.resume = null;
  if (go) go();
}

/* ---------- Moderator ---------- */
// Straight to the fight: everything for the balloon, put it together, cut the tether and
// skip the lift-off.
function bossJumpTo() {
  if (game.state !== 'playing' || boss.phase !== 'none') return;
  if (balloon.phase === 'none') {
    const site = siteById('breath');
    teleport({ x: site.x + site.launch.x + 2.5, z: site.z + site.launch.z + 1.5 });
    giveBalloonParts();
    startBalloonAssembly();
    finishBalloonAssembly();
  }
  if (balloon.phase === 'tethered') {
    startBalloonLaunch();
    skipBalloonLaunch();
  }
}

/* ---------- Runs ---------- */
function bossFightTime() {
  const s = Math.round(boss.time);
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}

// Everything back as it was: no Teto in the basket, no bar, no flags.
function resetBoss() {
  const s = bossScene;
  if (s && s.scream) s.scream.stop();
  bossScene = null;
  Object.assign(boss, { phase: 'none', health: BOSS.health, stage: 0, tries: 0, time: 0, won: false, resume: null, pendingRetry: false });
  Object.assign(bossFight, { act: 'stalk', attack: null, next: null, t: 0, teeter: null, hasPrev: false, flinch: 0, glint: 0, tauntOff: 0 });
  bossFight.knock.set(0, 0, 0);
  bossFight.last.length = 0;
  if (bossKit) { bossKit.avatar.setVisible(false); bossHideEffects(); bossHoses(true); }
  document.body.classList.remove('boss-fight');
  for (const id of ['boss-bar', 'boss-hint']) { const el = $(id); if (el) el.classList.add('hidden'); }
  const taunt = $('boss-taunt');
  if (taunt) taunt.classList.remove('on');
  const fade = $('boss-fade');
  if (fade) fade.classList.remove('on');
}

// Waking by a fire mid-flight puts the balloon back on its ropes; the fight goes with it.
function bossAbort() {
  if (boss.phase === 'none' || boss.phase === 'done') return;
  resetBoss();
  if (survivor.avatar && crimson.phase !== 'gone') survivor.avatar.setVisible(true);
}

function initBoss() {
  bossKit = buildBossKit();
  buildBossDom();
  BALLOON_INTERLUDES.push((resume) => bossBegin(resume));
  BALLOON_ENDING_STATS.push(() => {
    if (!boss.won) return null;
    return [bossText('name'), boss.tries > 1 ? `Beaten in ${bossFightTime()}, ${boss.tries} tries` : `Beaten in ${bossFightTime()}`];
  });
  // The burner's right there: nobody freezes mid-fight.
  HEAT_SOURCES.push(() => (boss.phase === 'fight' ? BOSS.warmth : 0));
  onGame('revived', bossAbort);
  // Mashing her way back in off the rim.
  addEventListener('keydown', (e) => {
    if (e.repeat || game.state !== 'playing' || !bossFight.teeter) return;
    if (['Space', 'KeyE', 'KeyW', 'ArrowUp'].includes(e.code)) bossMashed();
  });
}
