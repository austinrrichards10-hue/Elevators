// Saving and loading. The game saves itself every time Miku sits down by a campfire, and the
// title screen's Load button picks up from the most recent save. A save keeps what matters
// to the run: where the plane came down, where she is, what she carries and has found, the
// fires she built and the trees she cut, and how far the story has got.
const SAVE_KEY = 'hollowSnowSave';

function readSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    return data && data.v === 1 ? data : null;
  } catch {
    return null;
  }
}

// `force`: from the moderator menu, which pauses the game while it's open.
function saveGame(force = false) {
  // Nothing mid-fight: she only ever sits down in the real forest.
  if (arenaActive() || (game.state !== 'playing' && !(force && game.state === 'paused'))) return false;
  const data = {
    v: 1,
    at: Date.now(),
    wreck: { x: wreck.x, z: wreck.z, heading: wreck.heading },
    player: { x: player.pos.x, z: player.pos.z, yaw: player.yaw },
    survival: { health: survival.health, warmth: survival.warmth, planks: survival.planks, hasAxe: survival.hasAxe, tool: survival.tool },
    fires: survival.fires.map((f) => [f.x, f.z]),
    felled: [...felledTrees],
    pack: { ...pack },
    taken: [...lootState.taken],
    sites: SITES.map((s) => [s.id, s.discovered, s.revealed]),
    story: { flags: story.flags, parts: [...story.parts], said: [...story.said], notes: [...notesRead], stats },
    katana: katana.owned,
    crimson: { phase: crimson.phase, sitesLeft: crimson.sitesLeft, noticed: crimson.noticed },
    balloon: balloon.assembled,
    showdown: { stage: showdown.stage, shortHair: showdown.shortHair, injured: showdown.injured },
    builds: saveBuilds(),
    time: { t: dayNight.t, day: dayNight.day },
    needs: { hunger: needs.hunger, thirst: needs.thirst },
    city: saveCity(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast('Game saved');
  } catch { /* storage is optional */ }
  renderLoadButton();
  return true;
}

function loadGame() {
  const data = readSave();
  if (!data) return;
  Sfx.init();
  resetRun();
  $('title').classList.add('hidden');
  placeWreck(data.wreck);
  setWreckBurning();
  // Her fires, rebuilt quietly.
  const muted = Sfx.muted;
  Sfx.muted = true;
  for (const [x, z] of data.fires || []) buildCampfire(x, z);
  Sfx.muted = muted;
  Object.assign(survival, data.survival);
  for (const id of data.felled || []) felledTrees.add(id);
  world.refreshForest();
  for (const id in pack) delete pack[id];
  Object.assign(pack, data.pack || {});
  const taken = new Set(data.taken || []);
  for (const rec of [...lootItems]) if (taken.has(rec.key)) { lootState.taken.add(rec.key); lootRemove(rec); }
  for (const [id, discovered, revealed] of data.sites || []) {
    const site = siteById(id);
    if (site) Object.assign(site, { discovered, revealed });
  }
  const st = data.story || {};
  Object.assign(story.flags, st.flags || {});
  for (const p of st.parts || []) story.parts.add(p);
  for (const line of st.said || []) story.said.add(line);
  for (const n of st.notes || []) notesRead.add(n);
  Object.assign(stats, st.stats || {});
  katana.owned = !!data.katana;
  const c = data.crimson || {};
  if (c.phase === 'gone') { crimsonVanish(); crimson.noticed = !!c.noticed; }
  else Object.assign(crimson, { phase: c.phase || 'asleep', sitesLeft: c.sitesLeft || 0 });
  if (data.balloon) raiseBalloon();
  const sd = data.showdown || {};
  showdown.stage = sd.stage || 'none';
  showdown.injured = !!sd.injured;
  setShortHair(!!sd.shortHair);
  // Shot and not yet patched, the balloon still sags.
  balloon.sag = showdown.stage === 'injured' || showdown.stage === 'repair' ? 1 : 0;
  lootFoodSlot();
  loadBuilds(data.builds);
  if (data.time) { dayNight.t = data.time.t; dayNight.day = data.time.day; }
  if (data.needs) Object.assign(needs, data.needs);
  player.pos.set(data.player.x, groundHeight(data.player.x, data.player.z), data.player.z);
  player.yaw = player.bodyYaw = data.player.yaw || 0;
  world.stream(player.pos, Infinity);
  lootStream(true);
  poseAvatar(1 / 60, new THREE.Vector3(), false);
  avatar.reset();
  beginPlay(false);
  // Saved in the city: straight back to its streets (city.js).
  if (data.city && data.city.active) { loadCity(data.city); return; }
  say('Back by the fire.', 2.5);
}

function renderLoadButton() {
  const data = readSave();
  const button = $('load');
  button.classList.toggle('hidden', !data);
  if (data) button.title = `Saved ${new Date(data.at).toLocaleString()}`;
}

$('load').addEventListener('click', loadGame);
renderLoadButton();
