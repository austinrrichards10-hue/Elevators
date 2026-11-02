// Moderator menu: test switches, teleports and story shortcuts. Open it with ` or F2 from
// the title screen, in game or while paused. The switches live in `mod` (game.js).
const MOD_SWITCHES = {
  Enemies: [
    ['noEnemies', 'No enemy spawns', 'Also clears the ones already out'],
    ['freeze', 'Freeze enemies', 'They stop moving and attacking'],
    ['oneHit', 'One-hit kills', ''],
  ],
  Player: [
    ['god', 'God mode', 'Take no damage'],
    ['fly', 'Fly', 'Space up, C down, Shift for speed'],
    ['noclip', 'Walk through trees', 'Ignore tree and rock collisions'],
    ['infiniteAmmo', 'Infinite ammo', ''],
    ['infiniteStamina', 'Infinite stamina', ''],
  ],
  Display: [
    ['hideHud', 'Hide HUD', 'For clean screenshots'],
    ['showInfo', 'Show position and FPS', ''],
  ],
};
const MOD_SPEEDS = [1, 2, 3, 5];
const MOD_TIMES = [0.25, 0.5, 1];
const MOD_TELEPORTS = {
  Start: () => LANDMARKS.start,
  'Wardfire 1': () => ({ x: LANDMARKS.wards[0].x + 4, z: LANDMARKS.wards[0].z }),
  'Wardfire 2': () => ({ x: LANDMARKS.wards[1].x + 4, z: LANDMARKS.wards[1].z }),
  'Wardfire 3': () => ({ x: LANDMARKS.wards[2].x + 4, z: LANDMARKS.wards[2].z }),
  Altar: () => ({ x: world.altar.x, z: world.altar.z + 12 }),
};
const MOD_ACTIONS = {
  heal: ['Heal and refill', () => {
    player.hp = 100;
    player.stamina = 100;
    for (const id of GUN_ORDER) player.ammo[id] = GUNS[id].mag;
  }],
  clear: ['Clear enemies', () => clearGhouls()],
  ghoul: ['Spawn ghoul', () => spawnInFront(false)],
  runner: ['Spawn runner', () => spawnInFront(true)],
  ward: ['Light next wardfire', () => {
    const ward = game.stage < 3 && objectiveTarget();
    if (ward) lightWard(ward);
  }],
  allWards: ['Light all wardfires', () => {
    for (const ward of world.wards) if (!ward.lit) lightWard(ward);
  }],
};

let modReturn = null;

function clearGhouls() {
  for (const enemy of game.enemies) {
    if (!enemy.isBoss && !enemy.dead) { enemy.dead = true; enemy.deadT = 0; }
  }
}

function spawnInFront(runner) {
  const d = 9;
  spawnGhoul(player.pos.x + Math.sin(player.yaw) * d, player.pos.z + Math.cos(player.yaw) * d, runner);
}

function teleport(spot) {
  player.pos.set(spot.x, groundHeight(spot.x, spot.z), spot.z);
  player.dodge = null;
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
    ${section('Enemies', MOD_SWITCHES.Enemies.map(toggle).join('') + modButtons(['clear', 'ghoul', 'runner']))}
    ${section('Player', MOD_SWITCHES.Player.map(toggle).join('') + modButtons(['heal']))}
    ${section('Move speed', chips('speed', MOD_SPEEDS, mod.speed, (v) => `${v}×`))}
    ${section('Game speed', chips('time', MOD_TIMES, mod.timeScale, (v) => `${v}×`))}
    ${section('Teleport', `<div class="chips">${Object.keys(MOD_TELEPORTS).map((name) => `<button data-teleport="${name}">${name}</button>`).join('')}</div>`)}
    ${section('Story', modButtons(['ward', 'allWards']))}
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
  if (game.state === 'room' || game.state === 'ended') return;
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
  if (key === 'noEnemies' && mod.noEnemies) clearGhouls();
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

// Position, frame rate and enemy count, for checking spots and performance.
let infoFrames = 0;
(function countFrames() { infoFrames++; requestAnimationFrame(countFrames); }());
setInterval(() => {
  if (!mod.showInfo) { infoFrames = 0; return; }
  const p = player.pos;
  const alive = game.enemies.filter((e) => !e.dead).length;
  $('mod-info').textContent = `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}  ·  ${infoFrames * 2} fps  ·  ${alive} enemies  ·  stage ${game.stage}`;
  infoFrames = 0;
}, 500);

applyMod();
