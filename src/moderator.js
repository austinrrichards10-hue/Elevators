// Moderator menu: test switches, survival shortcuts and teleports. Open it with ` or F2
// from the title screen, in game or while paused. The switches live in `mod` (game.js).
const MOD_SWITCHES = {
  Player: [
    ['fly', 'Fly', 'Space up, C down, Shift for speed'],
    ['noclip', 'Walk through trees', 'Ignore tree and rock collisions'],
    ['instantDraw', 'Instant draw', 'The bow is fully drawn straight away'],
    ['infiniteStamina', 'Infinite stamina', ''],
  ],
  Survival: [
    ['noCold', 'No cold', 'Warmth never drains'],
    ['skipIntro', 'Skip the intro', 'Begin goes straight to the forest'],
  ],
  Display: [
    ['hideHud', 'Hide HUD', 'For clean screenshots'],
    ['showInfo', 'Show position and FPS', ''],
  ],
};
const MOD_SPEEDS = [1, 2, 3, 5, 10];
const MOD_TIMES = [0.25, 0.5, 1];
const MOD_TELEPORTS = {
  Start: () => LANDMARKS.start,
  Centre: () => ({ x: 0, z: 0 }),
  Altar: () => ({ x: LANDMARKS.altar.x, z: LANDMARKS.altar.z + 12 }),
  'Crash site': () => ({ x: wreck.x + 14, z: wreck.z }),
  'Axe stump': () => ({ x: STUMP_SPOT.x - 2, z: STUMP_SPOT.z + 2 }),
  'East edge': () => ({ x: WORLD_RADIUS - 30, z: 0 }),
  'West edge': () => ({ x: -(WORLD_RADIUS - 30), z: 0 }),
};
// One chip per site, landing on the edge of it.
for (const s of SITES) MOD_TELEPORTS[mapSiteName(s).replace(/^The /, '')] = () => ({ x: s.x, z: s.z + s.radius - 4 });
const MOD_ACTIONS = {
  stamina: ['Heal and warm up', () => { player.stamina = 100; survival.health = 100; survival.warmth = 100; }],
  axe: ['Give axe', () => { if (!survival.hasAxe) takeAxe(); }],
  planks: ['+10 planks', () => { survival.planks += 10; }],
  fire: ['Build campfire', () => { survival.planks += SURVIVAL.campfireCost; craft(0); }],
  arrows: ['Clear arrows', () => clearArrows()],
  items: ['Give chart, compass, binoculars, snowshoes', () => { for (const id of ['map', 'compass', 'binoculars', 'snowshoes']) packAdd(id); }],
  reveal: ['Reveal every site', () => { for (const s of SITES) revealSite(s.id); }],
  katana: ['Give the Ember Blade', () => grantKatana('mod')],
  crimson: ['Teto wanders off', () => { if (crimson.phase !== 'gone' && showdown.stage === 'none') crimsonVanish(); }],
  balloon: ['Give balloon parts and planks', () => giveBalloonParts()],
  pelts: ['Give 5 wolf and 10 hare pelts', () => { packAdd('wolfpelt', 5); packAdd('pelt', 10); }],
  boss: ['Jump to Teto\'s ambush', () => { closeMod(); if (game.state === 'paused') setPaused(false); showdownJumpTo(); }],
};

let modReturn = null;

// Builds the tiles at the destination straight away, so she doesn't land in empty space.
function teleport(spot) {
  player.pos.set(spot.x, groundHeight(spot.x, spot.z), spot.z);
  player.dodge = null;
  world.stream(player.pos, Infinity);
  poseAvatar(1 / 60, new THREE.Vector3(), false);
  avatar.reset();
}

function renderMod() {
  const toggle = ([key, label, note]) => `<label class="mod-switch"><input type="checkbox" data-switch="${key}" ${mod[key] ? 'checked' : ''}>`
    + `<span><b>${label}</b>${note ? `<small>${note}</small>` : ''}</span></label>`;
  const chips = (kind, values, current, label) => `<div class="chips">${values.map((v) => `<button data-${kind}="${v}" aria-pressed="${v === current}">${label(v)}</button>`).join('')}</div>`;
  const section = (title, body) => `<h3>${title}</h3>${body}`;
  $('mod').innerHTML = `
    <header class="room-head">
      <p class="room-kicker">Hollow Snow</p>
      <h2>Moderator</h2>
    </header>
    <div class="room-actions"><button id="close-mod" class="secondary">Close</button><button class="secondary" data-action="reset">Reset all</button></div>
    ${section('Player', MOD_SWITCHES.Player.map(toggle).join('') + modButtons(['stamina', 'arrows']))}
    ${section('Survival', MOD_SWITCHES.Survival.map(toggle).join('') + modButtons(['axe', 'planks', 'fire', 'items', 'reveal', 'katana', 'crimson', 'balloon', 'pelts', 'boss']))}
    ${section('Move speed', chips('speed', MOD_SPEEDS, mod.speed, (v) => `${v}×`))}
    ${section('Game speed', chips('time', MOD_TIMES, mod.timeScale, (v) => `${v}×`))}
    ${section('Teleport', `<div class="chips">${Object.keys(MOD_TELEPORTS).map((name) => `<button data-teleport="${name}">${name}</button>`).join('')}</div>`)}
    ${section('Display', MOD_SWITCHES.Display.map(toggle).join(''))}
    <p class="hint"><b>\`</b> or <b>F2</b> opens and closes this menu</p>`;
}

function modButtons(ids) {
  return `<div class="mod-buttons">${ids.map((id) => `<button class="secondary" data-action="${id}">${MOD_ACTIONS[id][0]}</button>`).join('')}</div>`;
}

function applyMod() {
  document.body.classList.toggle('mod-hide-hud', mod.hideHud);
  $('mod-info').classList.toggle('hidden', !mod.showInfo);
  saveLoadout();
}

function openMod() {
  if (['room', 'cutscene', 'dead', 'scene', 'book', 'reader', 'ending'].includes(game.state)) return;
  modReturn = game.state;
  if (game.state === 'playing') setPaused(true);
  $('pause').classList.add('hidden');
  renderMod();
  $('mod').classList.remove('hidden');
}

function closeMod(resume = true) {
  $('mod').classList.add('hidden');
  if (modReturn === 'playing' && resume) setPaused(false);
  else if (game.state === 'paused') $('pause').classList.remove('hidden');
}

function toggleMod() {
  if ($('mod').classList.contains('hidden')) openMod();
  else closeMod();
}

$('mod').addEventListener('change', (e) => {
  const key = e.target.dataset.switch;
  if (!key) return;
  mod[key] = e.target.checked;
  applyMod();
});

$('mod').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.id === 'close-mod') closeMod();
  if (t.dataset.speed) { mod.speed = +t.dataset.speed; applyMod(); renderMod(); }
  if (t.dataset.time) { mod.timeScale = +t.dataset.time; applyMod(); renderMod(); }
  if (t.dataset.teleport) teleport(MOD_TELEPORTS[t.dataset.teleport]());
  if (t.dataset.action === 'reset') { Object.assign(mod, MOD_DEFAULTS); applyMod(); renderMod(); }
  else if (t.dataset.action) MOD_ACTIONS[t.dataset.action][1]();
});

// Esc can't re-lock the mouse, so it closes the menu into the pause screen instead.
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !$('mod').classList.contains('hidden')) closeMod(false);
});
$('open-mod').addEventListener('click', openMod);
$('pause-mod').addEventListener('click', openMod);

// Position, frame rate, wolves nearby and warmth, for checking spots and performance.
let infoFrames = 0;
(function countFrames() { infoFrames++; requestAnimationFrame(countFrames); }());
setInterval(() => {
  if (!mod.showInfo) { infoFrames = 0; return; }
  const p = player.pos;
  $('mod-info').textContent = `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}  ·  ${infoFrames * 2} fps  ·  ${wolves.length} wolves  ·  warmth ${Math.round(survival.warmth)}`;
  infoFrames = 0;
}, 500);

applyMod();
