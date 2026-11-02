// Moderator menu: test switches and teleports. Open it with ` or F2 from the title
// screen, in game or while paused. The switches live in `mod` (game.js).
const MOD_SWITCHES = {
  Player: [
    ['fly', 'Fly', 'Space up, C down, Shift for speed'],
    ['noclip', 'Walk through trees', 'Ignore tree and rock collisions'],
    ['instantDraw', 'Instant draw', 'The bow is fully drawn straight away'],
    ['infiniteStamina', 'Infinite stamina', ''],
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
  'East edge': () => ({ x: WORLD_RADIUS - 30, z: 0 }),
  'West edge': () => ({ x: -(WORLD_RADIUS - 30), z: 0 }),
};
const MOD_ACTIONS = {
  stamina: ['Refill stamina', () => { player.stamina = 100; }],
  arrows: ['Clear arrows', () => clearArrows()],
};

let modReturn = null;

// Builds the tiles at the destination straight away, so she doesn't land in empty space.
function teleport(spot) {
  player.pos.set(spot.x, groundHeight(spot.x, spot.z), spot.z);
  player.dodge = null;
  world.stream(player.pos, Infinity);
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
  if (game.state === 'room') return;
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

// Position, frame rate and arrow count, for checking spots and performance.
let infoFrames = 0;
(function countFrames() { infoFrames++; requestAnimationFrame(countFrames); }());
setInterval(() => {
  if (!mod.showInfo) { infoFrames = 0; return; }
  const p = player.pos;
  $('mod-info').textContent = `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}  ·  ${infoFrames * 2} fps  ·  ${arrows.length} arrows`;
  infoFrames = 0;
}, 500);

applyMod();
