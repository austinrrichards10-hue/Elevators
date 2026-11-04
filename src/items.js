// Things to find: food, gear, notes, the balloon's parts. Her pack, and what lies in the snow.
// Every item has a small model built in code and a glint to catch her eye; E takes it. Food
// and medicine are used from the pack or with F, raw meat is cooked at a fire, and what she
// wears keeps the cold out or carries her faster.

/* ---------- Settings ---------- */
const LOOT = {
  buildRange: 120, // models exist only this close to her
  dropRange: 140,
  reach: 1.9, // how close she must be to pick up a small thing
  settleRange: 40, // loose finds are nudged out of trunks and rocks once she's this close
  scatterSeed: 1985,
  scatterTotal: 130, // loose finds across the forest
  nearStart: 14, // of those, how many fall within a short walk of where she lands
  cookReach: 2.6,
  shardTotal: 15,
  binocularFog: 0.55, // fog thins this much through the lenses
  spotTime: 0.6, // seconds held steady on a far landmark before it goes on the chart
};

/* ---------- What there is ---------- */
// kind: 'gear' (worn or carried, one of each), 'food', 'drink', 'med' (used from the pack or
// with F), 'raw' (cooked at a fire), 'resource', 'collectible', 'part', 'note', 'container'.
// heal and warm are what using it gives; cold and speed are what wearing it does.
const ITEMS = {
  map: {
    name: 'Pilot\'s chart', plural: 'pilot\'s charts', kind: 'gear', hint: 'M for the map',
    desc: 'Aksel Holm\'s old chart of the Hollow, copied from Varga\'s survey, with Jonas\'s pencil in the margins.',
  },
  compass: {
    name: 'Brass compass', plural: 'brass compasses', kind: 'gear',
    desc: 'Heavy, old and honest. The needle wanders near the crater\'s heart.',
  },
  snowshoes: {
    name: 'Snowshoes', plural: 'snowshoes', kind: 'gear', speed: 1.25, hint: 'faster through the snow',
    desc: 'Ash frames and gut lacing. Walk on the snow instead of in it.',
    got: 'Snowshoes. Now we\'re getting somewhere. Faster, specifically.',
  },
  binoculars: {
    name: 'Ranger\'s binoculars', plural: 'pairs of binoculars', kind: 'gear', hint: 'Z to look through them',
    desc: 'Ranger Brandt\'s field glasses. Hold one steady on a far landmark and it goes on the chart.',
  },
  scarf: {
    name: 'Teto\'s scarf', plural: 'scarves', kind: 'gear', cold: 0.88, proper: true, hint: 'a little warmer',
    desc: 'Red cashmere, monogrammed C.C. It was always going to outlive her.',
    got: 'She\'d want me to have it. She\'d want everyone to know she wanted me to have it.',
  },
  parka: {
    name: 'Station parka', plural: 'parkas', kind: 'gear', cold: 0.75, hint: 'much warmer',
    desc: 'A quilted orange expedition parka, Hollow Station issue, two sizes too big. Perfect.',
    got: 'It\'s enormous. It smells of mothballs. I\'m never taking it off.',
  },
  mittens: {
    name: 'Hare-fur mittens', plural: 'pairs of mittens', kind: 'gear', cold: 0.88, hint: 'warmer hands',
    desc: 'Stitched from two hare pelts. Lumpy, lopsided and wonderfully warm.',
    got: 'I can feel my fingers again. I\'d forgotten I had ten.',
  },
  hood: {
    name: 'Hare-fur hood', plural: 'hoods', kind: 'gear', cold: 0.85, hint: 'warmer ears',
    desc: 'A fur hood with the ears left on, because some decisions make themselves.',
    got: 'The ears stay. That\'s final.',
  },
  cloak: {
    name: 'Wolf-pelt cloak', plural: 'cloaks', kind: 'gear', cold: 0.7, hint: 'much warmer',
    desc: 'Two wolf pelts over the shoulders. The wolves will take it personally.',
    got: 'Heavy. Warm. Mildly threatening. Like a hug from a bad decision.',
  },
  beans: {
    name: 'Tin of beans', plural: 'tins of beans', kind: 'food', heal: 18, warm: 6, verb: 'Eat', used: 'Ate a tin of beans',
    desc: 'A dented tin of baked beans. Eaten cold, straight from the tin, with a stick.',
    line: ['Cold beans. The finest meal I\'ve had all year.', 'Beans again. Beans forever.'],
  },
  chocolate: {
    name: 'Chocolate bar', plural: 'chocolate bars', kind: 'food', heal: 10, warm: 4, stamina: true, verb: 'Eat', used: 'Ate a chocolate bar',
    desc: 'Milk chocolate, a little crushed. A burst of energy in a wrapper.',
    line: ['Chocolate. Morale, in bar form.'],
  },
  jerky: {
    name: 'Strip of jerky', plural: 'strips of jerky', kind: 'food', heal: 14, verb: 'Eat', used: 'Ate a strip of jerky',
    desc: 'Dried meat, salt and smoke. Chewy enough to count as exercise.',
    line: ['Tastes like a boot that was proud of itself.'],
  },
  rabbit_cooked: {
    name: 'Roast hare', plural: 'roast hares', kind: 'food', heal: 25, warm: 15, verb: 'Eat', used: 'Ate a roast hare',
    desc: 'A whole hare roasted over the fire, hot to the bone. Henrik was right: fat as cats.',
    line: ['Hot food. I could cry. I won\'t, it would freeze.'],
  },
  wolf_cooked: {
    name: 'Wolf steak', plural: 'wolf steaks', kind: 'food', heal: 35, warm: 10, verb: 'Eat', used: 'Ate a wolf steak',
    desc: 'Dark, tough and very filling. Revenge is a dish best served medium.',
    line: ['Tough, gamey, and deeply satisfying, all things considered.'],
  },
  thermos: {
    name: 'Thermos of coffee', plural: 'thermoses of coffee', kind: 'drink', warm: 35, verb: 'Drink', used: 'Drank the coffee',
    desc: 'A steel flask of black coffee that has no right to still be hot.',
    line: ['Coffee. Bitter, scalding, perfect.'],
  },
  warmer: {
    name: 'Hand warmer', plural: 'hand warmers', kind: 'med', warm: 25, verb: 'Use', used: 'Cracked a hand warmer',
    desc: 'Shake it and it heats up for an hour. Chemistry: the good kind of magic.',
    line: ['Shake, wait, believe.'],
  },
  medkit: {
    name: 'First-aid kit', plural: 'first-aid kits', kind: 'med', heal: 45, verb: 'Use', used: 'Patched up with a first-aid kit',
    desc: 'A tin box of gauze, iodine, tape and a sachet of aspirin.',
    line: ['Iodine. Ow. Ow. Okay. Better.'],
  },
  bandage: {
    name: 'Bandage', plural: 'bandages', kind: 'med', heal: 25, verb: 'Use', used: 'Wrapped a bandage',
    desc: 'Clean cloth, rolled tight. Not elegant, but it holds.',
    line: ['Wrapped up like a parcel. A sad parcel.'],
  },
  rabbit_raw: {
    name: 'Raw hare', plural: 'raw hares', kind: 'raw', cooks: 'rabbit_cooked',
    desc: 'A snow hare, cleaned and ready. It needs a fire first.',
  },
  wolf_raw: {
    name: 'Raw wolf meat', plural: 'cuts of raw wolf meat', kind: 'raw', cooks: 'wolf_cooked',
    desc: 'A cut of wolf, dark and lean. It needs a good long while on a fire.',
  },
  pelt: {
    name: 'Hare pelt', plural: 'hare pelts', kind: 'resource',
    desc: 'Soft white fur. Two make mittens; three make a hood.',
  },
  wolfpelt: {
    name: 'Wolf pelt', plural: 'wolf pelts', kind: 'resource',
    desc: 'Thick grey fur that smells of the forest. Two make a cloak.',
  },
  cloth: {
    name: 'Cloth scraps', plural: 'cloth scraps', kind: 'resource',
    desc: 'Odds and ends of wool and canvas. Two make a bandage.',
  },
  shard: {
    name: 'Star-iron shard', plural: 'star-iron shards', kind: 'collectible',
    desc: 'A sliver of the Ember\'s metal, faintly warm, glowing blue. Fifteen lie scattered across the Hollow.',
  },
  bag: {
    name: 'Flight bag', plural: 'flight bags', kind: 'container',
    desc: 'Jonas\'s leather chart case, thrown clear of the plane.',
    contents: [['map', 1], ['compass', 1], ['note:pilot-chart', 1], ['chocolate', 2], ['warmer', 1]],
  },
  crate: {
    name: 'Supply crate', plural: 'supply crates', kind: 'container',
    desc: 'A wooden crate of stores, nailed shut decades ago.',
  },
};

// The ten parts of Varga's balloon, one cached at each major site.
const PACK_PART_INFO = {
  rope: ['Climbing rope', 'Good hemp rope from the lookout\'s stores, for the rigging and the tether.'],
  basket: ['Wicker basket', 'Henrik\'s big hauling basket, wide enough to stand in. Varga\'s gondola.'],
  envelope: ['Envelope silk', 'Bolts of weather-balloon silk, crimson and cream, sewn and patched through five winters.'],
  tanks: ['Fuel tanks', 'Two steel tanks of fuel from the lake, where Aksel kept the aviation spirit.'],
  regulator: ['Regulator and hose', 'The valve and hose that feed fuel to the burner, coiled neat as a sailor\'s line.'],
  altimeter: ['Altimeter', 'The Dakota\'s altimeter, still in its housing. It will say how high is high enough.'],
  harness: ['Harness and carabiners', 'Climbing harness and steel carabiners from Last Camp, left by people who never came back for them.'],
  striker: ['Star-iron striker', 'A bar of star-iron that sparks at a touch: the burner\'s pilot flame.'],
  crown: ['Crown ring', 'The steel ring that gathers the envelope\'s gores together at the top.'],
  burner: ['Burner', 'A coiled copper burner from the mine\'s forge. The balloon\'s heart.'],
};
const PACK_PART_IDS = [];
for (const site of SITES) {
  if (!site.part) continue;
  const [name, desc] = PACK_PART_INFO[site.part];
  ITEMS[`part:${site.part}`] = { name, plural: name.toLowerCase(), kind: 'part', site: site.id, desc, model: site.part };
  PACK_PART_IDS.push(`part:${site.part}`);
}

// Supply crates hold a few of these, picked by where the crate stands.
const LOOT_CRATE_STOCK = ['beans', 'beans', 'jerky', 'chocolate', 'thermos', 'warmer', 'warmer', 'bandage', 'medkit'];
// What turns up loose in the forest, weighted: food and warmth are common, kits are rare.
const LOOT_SCATTER_TABLE = [['beans', 22], ['jerky', 20], ['cloth', 18], ['warmer', 16], ['chocolate', 14], ['thermos', 8], ['bandage', 7], ['medkit', 5]];
const LOOT_EDIBLE = ['beans', 'chocolate', 'jerky', 'rabbit_cooked', 'wolf_cooked', 'thermos', 'warmer', 'medkit', 'bandage'];
const LOOT_GEAR = Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'gear');

/* ---------- The pack ---------- */
const pack = {};
const lootState = {
  used: new Set(), // items she has used this run, for her first-time thoughts
  got: new Set(),
  taken: new Set(), // keys of the placed and scattered finds she's picked up, for saving
  toasts: [], // lines waiting for the toast, shown together once she's back in the snow
  glintT: 0,
  streamT: 0,
};

// The name of a note item comes from the story's pages.
function itemDef(id) {
  if (ITEMS[id]) return ITEMS[id];
  if (id && id.startsWith('note:')) {
    const note = LORE.notes[id.slice(5)];
    const title = (note && note.title) || 'Page';
    return { name: title, plural: title, kind: 'note', proper: true, note: id.slice(5), noteKind: (note && note.kind) || 'note', desc: '' };
  }
  return { name: id, plural: id, kind: 'resource', desc: '' };
}

// The item's name as it reads mid-sentence: 'tin of beans', '2 tins of beans' reads as
// `${n} ${itemName(id, n)}`. Proper names keep their capitals.
function itemName(id, n = 1) {
  const d = itemDef(id);
  if (n !== 1) return d.plural || d.name;
  return d.proper ? d.name : d.name.charAt(0).toLowerCase() + d.name.slice(1);
}

// 'the tin of beans', '2 tins of beans', 'Teto's scarf'.
function lootThe(id, n = 1) {
  if (n > 1) return `${n} ${itemName(id, n)}`;
  const d = itemDef(id);
  return d.proper ? d.name : `the ${itemName(id)}`;
}

function packCount(id) { return pack[id] || 0; }
function hasItem(id) { return packCount(id) > 0; }
function packPartCount() { return PACK_PART_IDS.filter(hasItem).length; }
function packShardCount() { return packCount('shard'); }

// Adds to her pack. opts.silent: no toast or sound; opts.quiet: toast but no sound.
// Notes are read rather than kept, and containers are opened into the pack.
function packAdd(id, n = 1, opts = {}) {
  if (id.startsWith('note:')) { readNote(id.slice(5)); return; }
  const d = itemDef(id);
  if (d.kind === 'container') { lootOpen(id, opts.contents, opts.silent); return; }
  if (d.kind === 'gear') n = hasItem(id) ? 0 : 1;
  if (n <= 0) return;
  pack[id] = packCount(id) + n;
  if (!opts.silent) {
    lootToast(lootGotText(id, n));
    if (!opts.quiet) lootSound(id);
  }
  if (d.got && !lootState.got.has(id)) { lootState.got.add(id); say(d.got, 3.6); }
  lootFoodSlot();
  emitGame('pickup', id, n);
}

function packTake(id, n = 1) {
  if (packCount(id) < n) return false;
  pack[id] -= n;
  if (!pack[id]) delete pack[id];
  lootFoodSlot();
  return true;
}

function lootGotText(id, n) {
  const d = itemDef(id);
  if (d.kind === 'part') return `Balloon part ${packPartCount()} of ${PACK_PART_IDS.length}: ${d.name}`;
  if (id === 'shard') return `Star-iron shard, ${packShardCount()} of ${LOOT.shardTotal}`;
  if (d.kind === 'gear') return d.hint ? `${d.name}: ${d.hint}` : d.name;
  return `+${n} ${itemName(id, n)}`;
}

// Toasts wait while a page is held up or the book is open, then show together.
function lootToast(text) {
  if (text) lootState.toasts.push(text);
}

function lootSound(id) {
  const kind = itemDef(id).kind;
  if (kind === 'part') Sfx.itemPart();
  else if (id === 'shard') Sfx.itemShard();
  else if (kind === 'gear') Sfx.itemGear();
  else if (id === 'cloth' || id === 'pelt' || id === 'wolfpelt') Sfx.itemCloth();
  else Sfx.pickup();
}

// Opens a bag or crate straight into her pack. A page inside is read last.
function lootOpen(id, contents, silent = false) {
  const d = itemDef(id);
  const list = contents || d.contents || [];
  const got = [], hints = [];
  let note = null;
  for (const [cid, n] of list) {
    if (cid.startsWith('note:')) { note = cid.slice(5); continue; }
    const had = hasItem(cid);
    packAdd(cid, n, { silent: true });
    if (itemDef(cid).kind === 'gear' && had) continue;
    got.push(n > 1 ? `${n} ${itemName(cid, n)}` : lootA(cid));
    if (itemDef(cid).hint && itemDef(cid).kind === 'gear') hints.push(itemDef(cid).hint);
  }
  if (!silent) {
    Sfx.itemBag();
    lootToast(got.length ? `${d.name}: ${got.join(', ')}${hints.length ? ` (${hints.join('; ')})` : ''}` : `${d.name}: empty`);
  }
  emitGame('pickup', id, 1);
  if (note) readNote(note);
}

function lootA(id) {
  const d = itemDef(id);
  if (d.proper) return d.name;
  const name = itemName(id);
  if (/s$/.test(name) && d.plural === d.name.toLowerCase()) return name; // 'snowshoes', 'cloth scraps'
  return `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`;
}

/* ---------- Using things ---------- */
function useItem(id) {
  const d = itemDef(id);
  if (!packCount(id)) return false;
  if (id === 'map') { openBook('map'); return true; }
  if (id === 'binoculars') { if (game.state === 'playing') toggleBinoculars(); return true; }
  if (d.kind === 'raw') { showNote('Not raw. Not yet. It needs a fire.'); return false; }
  if (!['food', 'drink', 'med'].includes(d.kind)) return false;
  packTake(id, 1);
  survival.health = Math.min(100, survival.health + (d.heal || 0));
  survival.warmth = Math.min(100, survival.warmth + (d.warm || 0));
  if (d.stamina) player.stamina = 100;
  feed(d);
  if (d.kind === 'drink') Sfx.itemDrink();
  else if (id === 'warmer') Sfx.itemShake();
  else if (d.kind === 'med') Sfx.itemUnwrap();
  else Sfx.itemEat(id === 'chocolate');
  lootToast(`${d.used}  ${lootEffectText(d)}`);
  if (d.line && !lootState.used.has(id)) {
    lootState.used.add(id);
    say(d.line[Math.floor(Math.random() * d.line.length)], 3.2);
  }
  return true;
}

function lootEffectText(d) {
  const parts = [];
  if (d.heal) parts.push(`+${d.heal} health`);
  if (d.warm) parts.push(`+${d.warm} warmth`);
  if (d.stamina) parts.push('full stamina');
  if (d.cold) parts.push(`cold −${Math.round((1 - d.cold) * 100)}%`);
  if (d.speed) parts.push(`speed +${Math.round((d.speed - 1) * 100)}%`);
  return parts.join(' · ');
}

// The best thing in her pack for how she is right now: health first when she's hurt,
// warmth when she's cold, and the small things before the precious ones.
function lootBestMeal() {
  const hurt = 100 - survival.health, cold = 100 - survival.warmth, tired = 100 - player.stamina;
  let best = null, bestScore = 2;
  for (const id of LOOT_EDIBLE) {
    if (!packCount(id)) continue;
    const d = ITEMS[id];
    const heal = Math.min(d.heal || 0, hurt), warm = Math.min(d.warm || 0, cold);
    const waste = (d.heal || 0) - heal + (d.warm || 0) - warm;
    // Hungry or thirsty counts too (daynight.js).
    const fill = d.kind === 'food' ? Math.min(d.food || 18 + (d.heal || 0) * 0.9, 100 - needs.hunger) : d.kind === 'drink' ? Math.min(45, 100 - needs.thirst) : 0;
    const score = heal * (survival.health < 40 ? 2.2 : 1) + warm * (survival.warmth < 35 ? 2.2 : 1) + (d.stamina ? tired * 0.08 : 0) - waste * 0.35 + fill * (needs.hunger < 40 || needs.thirst < 40 ? 1.6 : 0.8);
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

function quickEat() {
  const best = lootBestMeal();
  if (best) { useItem(best); return; }
  if (LOOT_EDIBLE.some(hasItem)) showNote('I\'m not hurt and I\'m not cold. Save it for when I am.');
  else if (hasItem('rabbit_raw') || hasItem('wolf_raw')) showNote('Nothing ready to eat. The meat needs a fire.');
  else toast('Nothing to eat');
}

function lootFoodCount() {
  let n = 0;
  for (const id of LOOT_EDIBLE) n += packCount(id);
  return n;
}

let lootFoodShown = -1;
function lootFoodSlot() {
  const n = lootFoodCount();
  if (n === lootFoodShown) return;
  lootFoodShown = n;
  $('food-count').textContent = n;
  $('slot-food').classList.toggle('hidden', n === 0);
}

/* ---------- What she wears ---------- */
// Multiplies how fast warmth drains away from a fire.
function gearCold() {
  let k = 1;
  for (const id of LOOT_GEAR) if (ITEMS[id].cold && pack[id]) k *= ITEMS[id].cold;
  return k;
}

// Multiplies her walking and running speed.
function gearSpeed() {
  return pack.snowshoes ? ITEMS.snowshoes.speed : 1;
}

/* ---------- Crafting ---------- */
function lootRecipes() {
  const wear = (id) => () => { packAdd(id, 1, { quiet: true }); };
  RECIPES.push(
    { id: 'mittens', name: 'Hare-fur mittens', cost: { pelt: 2 }, note: 'Cold −12%', make: wear('mittens'), shown: () => !hasItem('mittens') && hasItem('pelt') },
    { id: 'hood', name: 'Hare-fur hood', cost: { pelt: 3 }, note: 'Cold −15%', make: wear('hood'), shown: () => !hasItem('hood') && hasItem('pelt') },
    { id: 'cloak', name: 'Wolf-pelt cloak', cost: { wolfpelt: 2 }, note: 'Cold −30%', make: wear('cloak'), shown: () => !hasItem('cloak') && hasItem('wolfpelt') },
    { id: 'bandage', name: 'Bandage', cost: { cloth: 2 }, note: '+25 health', make: () => packAdd('bandage', 1, { quiet: true }), shown: () => hasItem('cloth') },
  );
}

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // A few muffled chews; chocolate snaps first.
  itemEat(snap = false) {
    if (snap) this.burst(0.04, 3200, 2, 0.25, 'bandpass');
    for (let i = 0; i < 3; i++) setTimeout(() => this.burst(0.07, 500 + Math.random() * 200, 1.2, 0.18, 'bandpass'), 140 + i * 210);
  },
  itemDrink() {
    for (let i = 0; i < 2; i++) setTimeout(() => { this.tone(220, 140, 0.16, 0.12, 'sine'); this.burst(0.1, 600, 2, 0.06, 'bandpass'); }, i * 330);
  },
  itemUnwrap() {
    for (let i = 0; i < 4; i++) setTimeout(() => this.burst(0.05, 2600 + Math.random() * 2400, 1.5, 0.12, 'bandpass'), i * 70);
  },
  itemShake() {
    for (let i = 0; i < 5; i++) setTimeout(() => this.burst(0.06, 1500, 1, 0.14, 'bandpass'), i * 110);
    setTimeout(() => this.tone(300, 520, 0.4, 0.05, 'sine'), 600);
  },
  itemSizzle() {
    this.burst(1.4, 5200, 0.6, 0.2, 'highpass');
    for (let i = 0; i < 8; i++) setTimeout(() => this.crackle(0.9), 80 + Math.random() * 1100);
  },
  itemCloth() { this.burst(0.18, 900, 0.8, 0.16, 'bandpass'); },
  itemGear() { this.burst(0.2, 1100, 0.8, 0.18, 'bandpass'); setTimeout(() => this.tone(1400, 1100, 0.05, 0.08, 'square'), 160); },
  itemPaper() { for (let i = 0; i < 3; i++) setTimeout(() => this.burst(0.09, 3600, 0.9, 0.08, 'bandpass'), i * 90); },
  itemBag() {
    this.burst(0.35, 1800, 3, 0.12, 'bandpass');
    setTimeout(() => this.tone(900, 700, 0.06, 0.08, 'square'), 300);
    setTimeout(() => this.burst(0.2, 700, 1, 0.14, 'bandpass'), 380);
  },
  // A low warm chord that rises: one more piece of the way out.
  itemPart() {
    this.thud();
    [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.tone(f, f, 1.4 - i * 0.2, 0.08, 'triangle'), 90 + i * 110));
  },
  itemShard() {
    this.tone(1760, 1760, 1.2, 0.07, 'sine');
    setTimeout(() => this.tone(2637, 2637, 0.9, 0.04, 'sine'), 60);
    setTimeout(() => this.tone(3520, 3520, 0.6, 0.02, 'sine'), 140);
  },
  itemBinoculars(up) {
    this.burst(0.06, 2200, 2, 0.1, 'bandpass');
    this.tone(up ? 600 : 900, up ? 900 : 600, 0.12, 0.03, 'sine');
  },
});

/* ---------- Materials and textures ---------- */
let lootMats = null;

function lootTexture(w, h, seed, draw) {
  const rand = seededRandom(seed);
  return canvasTexture(w, h, (g, W, H) => draw(g, W, H, rand));
}

// Ink scribbled in lines, like handwriting seen from a step away.
function lootPaperTexture(seed, paper, ink, typed = false) {
  return lootTexture(128, 160, seed, (g, w, h, rand) => {
    g.fillStyle = paper;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(120,96,60,${rand() * 0.06})`;
      g.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
    }
    g.strokeStyle = ink;
    g.fillStyle = ink;
    for (let y = 18; y < h - 12; y += typed ? 9 : 11) {
      if (rand() < 0.12) continue;
      const end = w - 12 - rand() * (y > h - 30 ? 60 : 18);
      if (typed) {
        for (let x = 10; x < end; x += 4) if (rand() < 0.82) g.fillRect(x, y, 3, 2);
      } else {
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(10, y);
        for (let x = 10; x < end; x += 3) g.lineTo(x, y + Math.sin(x * 0.9 + rand() * 4) * 1.6);
        g.stroke();
      }
    }
    // Crumpled edges.
    const fade = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(90,60,30,0.25)');
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
  });
}

function lootDialTexture(face, mark, label) {
  return lootTexture(128, 128, 7, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#6b5a3a';
    g.fillRect(0, 0, w, w);
    g.fillStyle = face;
    g.beginPath();
    g.arc(c, c, c - 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = mark;
    g.fillStyle = mark;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, r1 = c - 8, r0 = i % 4 ? c - 14 : c - 20;
      g.lineWidth = i % 4 ? 1 : 2.5;
      g.beginPath();
      g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
      g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
      g.stroke();
    }
    g.font = 'bold 15px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (label === 'N') {
      g.fillStyle = '#b3202c';
      g.fillText('N', c, 30);
      g.fillStyle = mark;
      g.fillText('S', c, w - 30);
      g.fillText('E', w - 30, c);
      g.fillText('W', 30, c);
      g.fillStyle = '#b3202c';
      g.beginPath(); g.moveTo(c, 34); g.lineTo(c + 6, c); g.lineTo(c - 6, c); g.fill();
      g.fillStyle = '#222';
      g.beginPath(); g.moveTo(c, w - 34); g.lineTo(c + 6, c); g.lineTo(c - 6, c); g.fill();
    } else {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.fillText(String(i), c + Math.sin(a) * (c - 30), c - Math.cos(a) * (c - 30));
      }
      g.font = '11px Georgia';
      g.fillText(label, c, c + 22);
      g.strokeStyle = '#ffb070';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(c, c); g.lineTo(c + 30, c - 26); g.stroke();
    }
    g.fillStyle = '#222';
    g.beginPath(); g.arc(c, c, 5, 0, Math.PI * 2); g.fill();
  });
}

function getLootMats() {
  if (lootMats) return lootMats;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const label = (w, h, seed, draw) => std({ map: lootTexture(w, h, seed, draw), roughness: 0.7 });
  const stripes = (base, line, seed, repeat = 1) => {
    const map = lootTexture(64, 64, seed, (g, w, h, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = line;
      for (let i = -64; i < 128; i += 8) {
        g.lineWidth = 2 + rand() * 1.5;
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 40, h); g.stroke();
      }
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat, 1);
    return map;
  };
  lootMats = {
    tin: std({ color: 0xaab0b8, metalness: 0.75, roughness: 0.35 }),
    beanLabel: label(256, 64, 3, (g, w, h) => {
      g.fillStyle = '#efe3c4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#a3262a'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
      g.fillStyle = '#7a1c1f'; g.font = 'bold 20px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('BAKED BEANS', w * 0.3, h / 2 - 3);
      g.font = '9px Georgia'; g.fillText('IN TOMATO SAUCE · 14 OZ', w * 0.3, h / 2 + 13);
      g.fillStyle = '#c47a2a'; g.beginPath(); g.ellipse(w * 0.78, h / 2, 16, 10, 0, 0, Math.PI * 2); g.fill();
    }),
    chocTop: label(128, 64, 4, (g, w, h) => {
      g.fillStyle = '#4a1f3a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d8b25a'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#e6c46a'; g.font = 'bold 17px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('CHOCOLATE', w / 2, h / 2 - 4);
      g.font = 'italic 10px Georgia'; g.fillText('milk · 100 g', w / 2, h / 2 + 13);
    }),
    chocEdge: std({ color: 0x4a1f3a, roughness: 0.6 }),
    foil: std({ color: 0xd8d8de, metalness: 0.9, roughness: 0.25 }),
    jerky: std({ color: 0x5a2a18, roughness: 0.75 }),
    wax: std({ color: 0xe6d9b8, roughness: 0.6, side: THREE.DoubleSide }),
    string: std({ color: 0xcbb68a, roughness: 0.9 }),
    enamel: std({ color: 0x3e6b4a, metalness: 0.35, roughness: 0.4 }),
    steel: std({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.3 }),
    warmerTop: label(128, 96, 5, (g, w, h) => {
      g.fillStyle = '#e0742a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff4e0'; g.font = 'bold 22px Georgia'; g.textAlign = 'center';
      g.fillText('HAND', w / 2 + 12, 40); g.fillText('WARMER', w / 2 + 12, 66);
      g.fillStyle = '#ffd34a'; g.beginPath(); g.moveTo(22, 70); g.quadraticCurveTo(6, 50, 22, 26); g.quadraticCurveTo(38, 50, 22, 70); g.fill();
    }),
    warmerEdge: std({ color: 0xc8601e, roughness: 0.7 }),
    medRed: std({ color: 0xb3202c, roughness: 0.45, metalness: 0.2 }),
    medTop: label(128, 96, 6, (g, w, h) => {
      g.fillStyle = '#b3202c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4f0e8'; g.fillRect(w / 2 - 34, h / 2 - 34, 68, 68);
      g.fillStyle = '#b3202c'; g.fillRect(w / 2 - 8, h / 2 - 26, 16, 52); g.fillRect(w / 2 - 26, h / 2 - 8, 52, 16);
    }),
    black: std({ color: 0x1d1d20, roughness: 0.6 }),
    brass: std({ color: 0xb08d3c, metalness: 0.85, roughness: 0.3 }),
    gauze: std({ color: 0xf3efe6, roughness: 1 }),
    plaid: std({ roughness: 0.95, map: lootTexture(64, 64, 8, (g, w) => {
      g.fillStyle = '#8e1f24'; g.fillRect(0, 0, w, w);
      g.fillStyle = 'rgba(20,50,30,0.7)'; g.fillRect(0, 20, w, 14); g.fillRect(20, 0, 14, w);
      g.fillStyle = 'rgba(230,200,90,0.7)'; g.fillRect(0, 44, w, 2); g.fillRect(44, 0, 2, w);
    }) }),
    wool: std({ color: 0x41557a, roughness: 1 }),
    canvas: std({ color: 0x8b8460, roughness: 1 }),
    hareFur: std({ color: 0xefe9e0, roughness: 1, side: THREE.DoubleSide }),
    wolfFur: std({ color: 0x7a736c, roughness: 1, side: THREE.DoubleSide }),
    hide: std({ color: 0xc9b08a, roughness: 1, side: THREE.DoubleSide }),
    parcel: std({ color: 0x9b7a55, roughness: 0.9 }),
    roast: std({ color: 0x7a3e1a, roughness: 0.55 }),
    steak: std({ color: 0x4f2414, roughness: 0.55 }),
    wood: std({ color: 0x8a6440, roughness: 0.85 }),
    darkWood: std({ color: 0x5a3e26, roughness: 0.85 }),
    gut: std({ color: 0xd8c49a, roughness: 0.8 }),
    knit: std({ roughness: 1, map: lootTexture(64, 32, 9, (g, w, h) => {
      g.fillStyle = '#b2162b'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(60,0,10,0.45)'; g.lineWidth = 1.5;
      for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 5); g.lineTo(x + 6, y); g.stroke(); }
    }) }),
    quilt: std({ roughness: 0.75, map: lootTexture(128, 128, 10, (g, w) => {
      g.fillStyle = '#d8591f'; g.fillRect(0, 0, w, w);
      g.strokeStyle = 'rgba(90,25,5,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < w; i += 22) { g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    }) }),
    paper: std({ map: lootPaperTexture(11, '#ebe1c8', 'rgba(50,36,22,0.75)'), roughness: 0.9, side: THREE.DoubleSide }),
    vargaPaper: std({ map: lootPaperTexture(12, '#e8dfc8', 'rgba(28,40,90,0.85)'), roughness: 0.9, side: THREE.DoubleSide }),
    telex: std({ map: lootPaperTexture(13, '#e9dc9a', 'rgba(30,30,30,0.8)', true), roughness: 0.9, side: THREE.DoubleSide }),
    ribbon: std({ color: 0xb01e2a, roughness: 0.5 }),
    stone: std({ color: 0x6f7178, roughness: 0.95 }),
    cover: std({ color: 0x3a2a3a, roughness: 0.7 }),
    pages: std({ color: 0xe8dfc8, roughness: 0.9 }),
    crystal: std({ color: 0x9ad8ff, emissive: 0x3b9cff, emissiveIntensity: 2, roughness: 0.2, metalness: 0.1, flatShading: true }),
    ore: std({ color: 0x2c2a30, roughness: 0.9, flatShading: true }),
    leather: std({ color: 0x5b3a22, roughness: 0.65 }),
    leatherDark: std({ color: 0x3d2716, roughness: 0.7 }),
    crateWood: std({ roughness: 0.85, map: lootTexture(128, 128, 14, (g, w, h, rand) => {
      g.fillStyle = '#8f6a42'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) {
        g.fillStyle = `rgba(60,40,20,${0.15 + rand() * 0.2})`; g.fillRect(0, y, w, 32);
        g.fillStyle = 'rgba(40,25,10,0.7)'; g.fillRect(0, y, w, 2);
        for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(60,40,20,0.25)'; g.fillRect(rand() * w, y + 4 + rand() * 26, 10 + rand() * 30, 1); }
      }
      g.fillStyle = 'rgba(30,20,10,0.75)'; g.font = 'bold 18px Georgia'; g.textAlign = 'center'; g.fillText('STORES', w / 2, h / 2 + 6);
    }) }),
    rope: std({ map: stripes('#c9a66b', 'rgba(110,80,40,0.55)', 15, 10), roughness: 0.95 }),
    wicker: std({ roughness: 0.9, side: THREE.DoubleSide, map: (() => {
      const map = lootTexture(128, 128, 16, (g, w, h) => {
        g.fillStyle = '#7a5428'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) {
          for (let x = 0; x < w; x += 16) {
            const off = (y / 8) % 2 ? 8 : 0;
            const grad = g.createLinearGradient(x + off, 0, x + off + 14, 0);
            grad.addColorStop(0, '#9c7238'); grad.addColorStop(0.5, '#c79a56'); grad.addColorStop(1, '#9c7238');
            g.fillStyle = grad; g.fillRect(x + off, y + 1, 14, 6);
          }
        }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(3, 3);
      return map;
    })() }),
    silkRed: std({ color: 0x9e1d2c, roughness: 0.45 }),
    silkCream: std({ color: 0xe9dcc4, roughness: 0.45 }),
    tarp: std({ color: 0x6d6a4e, roughness: 1 }),
    olive: std({ color: 0x5a6248, metalness: 0.5, roughness: 0.45 }),
    rubber: std({ color: 0x1a1a1c, roughness: 0.55 }),
    altDial: std({ map: lootDialTexture('#141414', '#f0ece0', 'ALT × 1000 FT'), roughness: 0.3 }),
    gauge: std({ map: lootDialTexture('#f0ece0', '#1a1a1a', 'PSI'), roughness: 0.3 }),
    compassFace: std({ map: lootDialTexture('#efe6cc', '#2a2418', 'N'), roughness: 0.3 }),
    webbing: std({ color: 0xc2802a, roughness: 0.8 }),
    iron: std({ color: 0x3a3a40, metalness: 0.9, roughness: 0.4, emissive: 0xff5a1a, emissiveIntensity: 0.12 }),
    ember: std({ color: 0x2a1a14, emissive: 0xff6a1a, emissiveIntensity: 1.6, roughness: 0.5 }),
    copper: std({ color: 0xb06a3c, metalness: 0.85, roughness: 0.3 }),
    oilcloth: std({ color: 0x2f3a33, roughness: 0.6 }),
  };
  return lootMats;
}

/* ---------- Models ---------- */
// Each builder makes one item lying in the snow, its base at y = 0, a little over life size
// so it reads from behind her shoulder. Built once per item and cloned after.
function lootMesh(group, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

const LOOT_BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const LOOT_CYL = (r, h, n = 14) => new THREE.CylinderGeometry(r, r, h, n);
const HALF_PI = Math.PI / 2;

const LOOT_MODELS = {
  beans(g, m) {
    lootMesh(g, LOOT_CYL(0.045, 0.115, 16), [m.beanLabel, m.tin, m.tin], 0, 0.044, 0, 0, 0.4, HALF_PI);
  },
  chocolate(g, m) {
    lootMesh(g, LOOT_BOX(0.17, 0.018, 0.075), [m.chocEdge, m.chocEdge, m.chocTop, m.chocEdge, m.chocEdge, m.chocEdge], 0, 0.009, 0);
    lootMesh(g, LOOT_BOX(0.035, 0.021, 0.078), m.foil, 0.1, 0.01, 0, 0, 0, 0.06);
  },
  jerky(g, m) {
    lootMesh(g, LOOT_BOX(0.19, 0.004, 0.14), m.wax, 0, 0.002, 0, 0, 0.2, 0);
    for (let i = 0; i < 3; i++) lootMesh(g, LOOT_BOX(0.15, 0.012, 0.028), m.jerky, (i - 1) * 0.01, 0.011 + i * 0.006, (i - 1) * 0.034, 0, 0.1 + i * 0.25 - 0.25, i === 1 ? 0.05 : -0.03);
    lootMesh(g, LOOT_BOX(0.006, 0.03, 0.15), m.string, 0.02, 0.016, 0, 0, 0.1, 0);
  },
  thermos(g, m) {
    lootMesh(g, LOOT_CYL(0.048, 0.26), m.enamel, 0, 0.048, 0, 0, 0, HALF_PI);
    lootMesh(g, LOOT_CYL(0.051, 0.075), m.steel, 0.16, 0.051, 0, 0, 0, HALF_PI);
    lootMesh(g, LOOT_CYL(0.05, 0.02), m.steel, -0.13, 0.05, 0, 0, 0, HALF_PI);
    lootMesh(g, new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), m.black, 0.02, 0.095, 0, 0, 0, 0);
  },
  warmer(g, m) {
    lootMesh(g, LOOT_BOX(0.11, 0.016, 0.08), [m.warmerEdge, m.warmerEdge, m.warmerTop, m.warmerEdge, m.warmerEdge, m.warmerEdge], 0, 0.008, 0);
  },
  medkit(g, m) {
    lootMesh(g, LOOT_BOX(0.28, 0.1, 0.19), [m.medRed, m.medRed, m.medTop, m.medRed, m.medRed, m.medRed], 0, 0.05, 0);
    lootMesh(g, new THREE.TorusGeometry(0.045, 0.009, 6, 14, Math.PI), m.black, 0, 0.1, 0, 0, 0, 0);
    for (const x of [-0.08, 0.08]) lootMesh(g, LOOT_BOX(0.03, 0.03, 0.01), m.brass, x, 0.075, 0.097);
    lootMesh(g, LOOT_BOX(0.282, 0.008, 0.192), m.steel, 0, 0.07, 0);
  },
  bandage(g, m) {
    lootMesh(g, LOOT_CYL(0.038, 0.07, 14), m.gauze, 0, 0.038, 0, HALF_PI, 0, 0);
    lootMesh(g, LOOT_BOX(0.07, 0.003, 0.2), m.gauze, 0, 0.002, 0.11, 0, 0.15, 0);
  },
  cloth(g, m) {
    [m.plaid, m.wool, m.canvas].forEach((mat, i) => lootMesh(g, LOOT_BOX(0.24, 0.03, 0.17), mat, (i - 1) * 0.012, 0.015 + i * 0.03, 0, 0, (i - 1) * 0.22, 0));
    lootMesh(g, LOOT_BOX(0.01, 0.1, 0.18), m.string, 0.03, 0.045, 0, 0, 0.1, 0);
  },
  pelt(g, m, wolf = false) {
    // A flat hide: a long body with four leg tabs.
    const s = new THREE.Shape();
    const pts = [[0, -0.2], [0.07, -0.17], [0.13, -0.22], [0.12, -0.12], [0.1, 0], [0.13, 0.12], [0.11, 0.2], [0.06, 0.16], [0, 0.2]];
    s.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
    for (const [x, y] of pts.slice(0, -1).reverse()) s.lineTo(-x, y);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.012, bevelSegments: 2 }).rotateX(-HALF_PI);
    const mesh = lootMesh(g, geo, wolf ? m.wolfFur : m.hareFur, 0, 0.004, 0, 0, 0.4, 0);
    if (wolf) mesh.scale.setScalar(1.6);
  },
  wolfpelt(g, m) { LOOT_MODELS.pelt(g, m, true); },
  rabbit_raw(g, m) {
    lootMesh(g, LOOT_BOX(0.22, 0.08, 0.13), m.parcel, 0, 0.04, 0);
    lootMesh(g, LOOT_BOX(0.225, 0.084, 0.012), m.string, 0, 0.04, 0);
    lootMesh(g, LOOT_BOX(0.012, 0.084, 0.135), m.string, 0, 0.04, 0);
  },
  wolf_raw(g, m) {
    LOOT_MODELS.rabbit_raw(g, m);
    g.scale.set(1.3, 1.1, 1.4);
  },
  rabbit_cooked(g, m) {
    lootMesh(g, LOOT_CYL(0.007, 0.42, 6), m.darkWood, 0, 0.04, 0, 0, 0, HALF_PI);
    const lump = new THREE.IcosahedronGeometry(0.05, 1);
    [[-0.08, 1], [0, 1.25], [0.08, 0.95]].forEach(([x, s]) => lootMesh(g, lump, m.roast, x, 0.045, 0, 0, x * 9, 0).scale.set(s, s * 0.8, s * 0.9));
  },
  wolf_cooked(g, m) {
    lootMesh(g, LOOT_BOX(0.2, 0.004, 0.16), m.wax, 0, 0.002, 0);
    const steak = lootMesh(g, new THREE.CylinderGeometry(0.07, 0.075, 0.035, 10), m.steak, 0, 0.02, 0);
    steak.scale.set(1.3, 1, 0.9);
  },
  snowshoes(g, m) {
    const frame = new THREE.TorusGeometry(0.12, 0.011, 6, 26).rotateX(HALF_PI).scale(1, 1, 2.2);
    const lace = LOOT_BOX(0.22, 0.004, 0.006);
    const shoe = (x, z, ry, lean) => {
      const s = new THREE.Group();
      lootMesh(s, frame, m.wood, 0, 0, 0);
      for (let i = -3; i <= 3; i++) lootMesh(s, lace, m.gut, 0, 0, i * 0.055).scale.x = Math.cos((i / 3.6) * HALF_PI);
      lootMesh(s, LOOT_BOX(0.012, 0.004, 0.42), m.gut, 0, 0, 0);
      lootMesh(s, LOOT_BOX(0.09, 0.02, 0.06), m.leather, 0, 0.012, 0.02);
      s.position.set(x, 0.014 + lean * 0.12, z);
      s.rotation.set(lean, ry, 0);
      g.add(s);
    };
    shoe(-0.09, 0, 0.18, 0);
    shoe(0.1, 0.04, -0.3, -0.12);
  },
  binoculars(g, m) {
    for (const x of [-0.04, 0.04]) {
      lootMesh(g, LOOT_CYL(0.032, 0.13), m.black, x, 0.032, 0, HALF_PI, 0, 0);
      lootMesh(g, LOOT_CYL(0.036, 0.02), m.steel, x, 0.036, 0.07, HALF_PI, 0, 0);
      lootMesh(g, LOOT_CYL(0.022, 0.035), m.black, x, 0.032, -0.08, HALF_PI, 0, 0);
    }
    lootMesh(g, LOOT_BOX(0.05, 0.022, 0.06), m.black, 0, 0.045, -0.02);
    lootMesh(g, new THREE.TorusGeometry(0.15, 0.006, 4, 24).rotateX(HALF_PI).scale(1, 1, 0.6), m.leather, 0, 0.004, -0.12);
  },
  scarf(g, m) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0, 0.06), new THREE.Vector3(-0.22, 0, -0.08), new THREE.Vector3(0, 0, 0.04),
      new THREE.Vector3(0.18, 0, 0.16), new THREE.Vector3(0.34, 0, -0.02), new THREE.Vector3(0.46, 0, 0.1),
    ]);
    const geo = new THREE.TubeGeometry(curve, 40, 0.05, 8, false).scale(1, 0.32, 1);
    lootMesh(g, geo, m.knit, 0, 0.018, 0);
    for (const end of [curve.points[0], curve.points[5]]) {
      for (let i = -2; i <= 2; i++) lootMesh(g, LOOT_BOX(0.05, 0.006, 0.006), m.knit, end.x + Math.sign(end.x) * 0.03, 0.006, end.z + i * 0.018);
    }
  },
  parka(g, m) {
    lootMesh(g, LOOT_BOX(0.48, 0.12, 0.36), m.quilt, 0, 0.06, 0);
    lootMesh(g, LOOT_BOX(0.56, 0.07, 0.11), m.quilt, 0.02, 0.15, 0.06, 0, 0.35, 0.03);
    lootMesh(g, new THREE.TorusGeometry(0.11, 0.04, 8, 18).rotateX(HALF_PI), m.hareFur, -0.06, 0.15, -0.08);
    lootMesh(g, LOOT_BOX(0.006, 0.125, 0.3), m.steel, 0.12, 0.062, 0);
  },
  mittens(g, m) {
    for (const [x, ry] of [[-0.07, 0.2], [0.08, -0.35]]) {
      const mit = new THREE.Group();
      lootMesh(mit, new THREE.SphereGeometry(0.065, 12, 8), m.hareFur, 0, 0.028, 0).scale.set(1, 0.45, 1.5);
      lootMesh(mit, new THREE.SphereGeometry(0.028, 8, 6), m.hareFur, 0.06, 0.02, -0.02).scale.set(1, 0.6, 1.4);
      lootMesh(mit, new THREE.TorusGeometry(0.05, 0.018, 6, 14), m.hide, 0, 0.03, 0.1).scale.set(1, 0.6, 1);
      mit.position.x = x;
      mit.rotation.y = ry;
      g.add(mit);
    }
  },
  hood(g, m) {
    lootMesh(g, new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, HALF_PI), m.hareFur, 0, 0, 0).scale.set(1, 0.85, 1.1);
    for (const x of [-0.07, 0.07]) lootMesh(g, new THREE.ConeGeometry(0.03, 0.16, 8), m.hareFur, x, 0.15, -0.03, -0.5, 0, x * 3).scale.set(1, 1, 0.45);
  },
  cloak(g, m) {
    // Folded in three, with the scruff rolled into a collar.
    const fold = new THREE.SphereGeometry(0.22, 14, 8);
    [[0, 0.04, 0.08, 0], [0.03, 0.08, -0.02, 0.2], [-0.02, 0.12, -0.06, -0.15]].forEach(([x, y, z, ry], i) => lootMesh(g, fold, m.wolfFur, x, y, z, 0, ry, 0).scale.set(1.3 - i * 0.12, 0.2, 0.9 - i * 0.1));
    lootMesh(g, new THREE.TorusGeometry(0.1, 0.035, 6, 16).rotateX(HALF_PI), m.wolfFur, 0, 0.15, -0.12);
    lootMesh(g, LOOT_CYL(0.025, 0.012), m.brass, 0, 0.18, -0.03);
  },
  map(g, m) {
    lootMesh(g, LOOT_CYL(0.03, 0.34), m.paper, 0, 0.03, 0, 0, 0.3, HALF_PI);
    lootMesh(g, LOOT_CYL(0.033, 0.02), m.ribbon, 0, 0.03, 0, 0, 0.3, HALF_PI);
  },
  compass(g, m) {
    lootMesh(g, LOOT_CYL(0.055, 0.022, 20), [m.brass, m.compassFace, m.brass], 0, 0.011, 0);
    lootMesh(g, new THREE.TorusGeometry(0.056, 0.006, 6, 24).rotateX(HALF_PI), m.brass, 0, 0.022, 0);
    lootMesh(g, new THREE.TorusGeometry(0.014, 0.004, 6, 10), m.brass, 0, 0.012, -0.07);
  },
  shard(g, m) {
    lootMesh(g, new THREE.IcosahedronGeometry(0.08, 0), m.ore, 0, 0.02, 0).scale.set(1.2, 0.5, 1);
    const crystal = new THREE.OctahedronGeometry(0.045, 0).scale(1, 2.6, 1);
    [[0, 0.11, 0, 0, 0], [0.04, 0.08, 0.02, 0.5, 0.3], [-0.035, 0.07, -0.02, -0.55, 0.9], [0.01, 0.06, -0.045, 0.2, -0.6]].forEach(([x, y, z, tilt, ry], i) => {
      lootMesh(g, crystal, m.crystal, x, y, z, tilt * 0.6, ry, tilt).scale.setScalar(i ? 0.6 : 1);
    });
  },
  bag(g, m) {
    lootMesh(g, LOOT_BOX(0.42, 0.11, 0.3), m.leather, 0, 0.055, 0);
    lootMesh(g, LOOT_BOX(0.43, 0.014, 0.2), m.leatherDark, 0, 0.115, 0.05);
    lootMesh(g, LOOT_BOX(0.43, 0.08, 0.014), m.leatherDark, 0, 0.08, 0.155);
    for (const x of [-0.12, 0.12]) {
      lootMesh(g, LOOT_BOX(0.03, 0.09, 0.008), m.leatherDark, x, 0.08, 0.164);
      lootMesh(g, LOOT_BOX(0.036, 0.02, 0.01), m.brass, x, 0.06, 0.168);
    }
    lootMesh(g, new THREE.TorusGeometry(0.2, 0.008, 4, 28).rotateX(HALF_PI).scale(1.2, 1, 0.7), m.leatherDark, 0.05, 0.004, -0.2);
    // A luggage tag on a string: J. HOLM, though nobody can read it from here.
    lootMesh(g, LOOT_BOX(0.05, 0.003, 0.08), m.paper, 0.26, 0.004, 0.12, 0, 0.5, 0);
  },
  crate(g, m) {
    lootMesh(g, LOOT_BOX(0.56, 0.38, 0.42), m.crateWood, 0, 0.19, 0);
    lootMesh(g, LOOT_BOX(0.58, 0.03, 0.44), m.crateWood, 0.03, 0.4, 0.02, 0.06, 0.05, 0.04);
    for (const x of [-0.27, 0.27]) lootMesh(g, LOOT_BOX(0.03, 0.39, 0.44), m.darkWood, x, 0.195, 0);
  },
  // A page lying in the snow, held down by a stone; Varga tied hers with a red ribbon.
  note(g, m, kind = 'note') {
    if (kind === 'diary') {
      lootMesh(g, LOOT_BOX(0.15, 0.032, 0.21), [m.cover, m.cover, m.cover, m.cover, m.cover, m.cover], 0, 0.016, 0);
      lootMesh(g, LOOT_BOX(0.142, 0.026, 0.2), m.pages, 0.006, 0.016, 0);
      lootMesh(g, LOOT_BOX(0.012, 0.002, 0.08), m.ribbon, 0.02, 0.0005, 0.13);
      return;
    }
    const w = kind === 'radio' ? 0.14 : 0.21, h = kind === 'radio' ? 0.32 : 0.28;
    const geo = new THREE.PlaneGeometry(w, h, 6, 6).rotateX(-HALF_PI);
    const p = geo.attributes.position;
    // Curled at the corners where the wind lifts it.
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / w, v = p.getZ(i) / h;
      p.setY(i, 0.018 + Math.max(0, u * v) * 0.08 + Math.max(0, -v - 0.3) * 0.03);
    }
    geo.computeVertexNormals();
    lootMesh(g, geo, kind === 'varga' ? m.vargaPaper : kind === 'radio' ? m.telex : m.paper, 0, 0, 0);
    lootMesh(g, new THREE.IcosahedronGeometry(0.035, 0), m.stone, -w * 0.32, 0.018, h * 0.3).scale.set(1, 0.6, 1.1);
    if (kind === 'varga') {
      lootMesh(g, LOOT_BOX(0.014, 0.004, h * 1.04), m.ribbon, w * 0.18, 0.008, 0);
      lootMesh(g, new THREE.TorusGeometry(0.018, 0.006, 6, 10).rotateX(HALF_PI), m.ribbon, w * 0.18 - 0.02, 0.01, -0.02);
      lootMesh(g, new THREE.TorusGeometry(0.018, 0.006, 6, 10).rotateX(HALF_PI), m.ribbon, w * 0.18 + 0.02, 0.01, -0.02);
    }
  },

  // The balloon's parts, as Varga left them: wrapped, stacked, tied.
  rope(g, m) {
    lootPallet(g, m);
    const coil = new THREE.TorusGeometry(0.2, 0.024, 6, 30).rotateX(HALF_PI);
    for (let i = 0; i < 5; i++) lootMesh(g, coil, m.rope, Math.sin(i * 2.1) * 0.015, 0.085 + i * 0.042, Math.cos(i * 1.7) * 0.015, Math.sin(i) * 0.04, i, 0);
    lootMesh(g, new THREE.TorusGeometry(0.07, 0.02, 6, 14), m.rope, 0.21, 0.12, 0.05, 0, 0.5, 0.4);
  },
  basket(g, m) {
    const s = 0.9, hgt = 0.72;
    for (const [x, z, ry] of [[0, s / 2, 0], [0, -s / 2, 0], [s / 2, 0, HALF_PI], [-s / 2, 0, HALF_PI]]) {
      lootMesh(g, LOOT_BOX(s, hgt, 0.035), m.wicker, x, hgt / 2, z, 0, ry, 0).castShadow = true;
    }
    lootMesh(g, LOOT_BOX(s, 0.04, s), m.wicker, 0, 0.02, 0);
    const rim = LOOT_CYL(0.028, s + 0.06, 8);
    for (const [x, z, ry] of [[0, s / 2, 0], [0, -s / 2, 0], [s / 2, 0, HALF_PI], [-s / 2, 0, HALF_PI]]) lootMesh(g, rim, m.darkWood, x, hgt, z, 0, ry, HALF_PI);
    for (const z of [-0.2, 0.2]) lootMesh(g, new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), m.rope, s / 2 + 0.02, hgt - 0.12, z, 0, HALF_PI, Math.PI);
  },
  envelope(g, m) {
    lootMesh(g, LOOT_BOX(1.15, 0.02, 0.95), m.tarp, 0, 0.01, 0, 0, 0.08, 0);
    const roll = LOOT_CYL(0.16, 0.86, 18);
    [[-0.3, m.silkRed], [0, m.silkCream], [0.3, m.silkRed]].forEach(([z, mat]) => lootMesh(g, roll, mat, 0, 0.17, z, 0, 0, HALF_PI).castShadow = true);
    lootMesh(g, roll, m.silkCream, 0, 0.44, -0.15, 0, 0, HALF_PI).castShadow = true;
    const tie = new THREE.TorusGeometry(0.165, 0.012, 6, 20);
    for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0, 0.3]) lootMesh(g, tie, m.rope, x, 0.17, z, 0, HALF_PI, 0);
  },
  tanks(g, m) {
    for (const z of [-0.17, 0.17]) {
      lootMesh(g, LOOT_CYL(0.15, 0.72, 18), m.olive, 0, 0.15, z, 0, 0, HALF_PI).castShadow = true;
      lootMesh(g, new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, HALF_PI), m.olive, 0.36, 0.15, z, 0, 0, -HALF_PI);
      lootMesh(g, LOOT_CYL(0.03, 0.08), m.brass, 0.53, 0.15, z, 0, 0, HALF_PI);
      lootMesh(g, new THREE.TorusGeometry(0.04, 0.008, 6, 14), m.brass, 0.57, 0.15, z, 0, HALF_PI, 0);
    }
    lootMesh(g, LOOT_BOX(0.04, 0.32, 0.68), m.leatherDark, -0.1, 0.16, 0);
  },
  regulator(g, m) {
    lootPallet(g, m);
    const coil = new THREE.TorusGeometry(0.19, 0.02, 6, 28).rotateX(HALF_PI);
    for (let i = 0; i < 3; i++) lootMesh(g, coil, m.rubber, 0, 0.08 + i * 0.038, 0, 0, i * 0.7, 0);
    lootMesh(g, LOOT_CYL(0.05, 0.14), m.brass, 0.15, 0.13, 0.12, 0, 0, HALF_PI);
    lootMesh(g, LOOT_CYL(0.048, 0.024, 18), [m.brass, m.gauge, m.brass], 0.15, 0.2, 0.12, -0.5, 0, 0);
  },
  altimeter(g, m) {
    lootPallet(g, m);
    for (const [x, z, w, d] of [[0, 0.15, 0.32, 0.02], [0, -0.15, 0.32, 0.02], [0.15, 0, 0.02, 0.3], [-0.15, 0, 0.02, 0.3]]) lootMesh(g, LOOT_BOX(w, 0.12, d), m.darkWood, x, 0.12, z);
    lootMesh(g, LOOT_CYL(0.11, 0.06, 24), [m.black, m.altDial, m.black], 0, 0.1, 0, -0.25, 0, 0);
    lootMesh(g, new THREE.TorusGeometry(0.11, 0.012, 6, 28).rotateX(HALF_PI), m.brass, 0, 0.132, -0.008, -0.25, 0, 0);
  },
  harness(g, m) {
    lootPallet(g, m);
    const strap = new THREE.TorusGeometry(0.17, 0.02, 4, 26).scale(1, 1, 0.35);
    [[0, 0.11, 0, HALF_PI, 0, 0], [0.06, 0.12, 0.04, HALF_PI - 0.3, 0.6, 0], [-0.07, 0.1, -0.02, HALF_PI + 0.25, 1.4, 0.2], [0.02, 0.17, 0, 1, 0.2, 0.9]].forEach((r) => lootMesh(g, strap, m.webbing, ...r));
    const biner = new THREE.TorusGeometry(0.035, 0.007, 6, 14).scale(1, 1.7, 1);
    [[0.2, 0.08, 0.1, 0.4], [0.22, 0.08, -0.04, 1.2], [-0.2, 0.08, 0.12, 2], [0.12, 0.2, -0.12, 0.8]].forEach(([x, y, z, ry]) => lootMesh(g, biner, m.steel, x, y, z, HALF_PI, ry, 0));
  },
  striker(g, m) {
    lootMesh(g, LOOT_BOX(0.62, 0.012, 0.3), m.oilcloth, 0, 0.006, 0, 0, 0.1, 0);
    lootMesh(g, LOOT_BOX(0.5, 0.04, 0.05), m.iron, 0, 0.032, 0, 0, 0.1, 0);
    lootMesh(g, LOOT_BOX(0.12, 0.01, 0.052), m.ember, 0.2, 0.054, -0.02, 0, 0.1, 0);
    lootMesh(g, LOOT_CYL(0.03, 0.15), m.leather, -0.2, 0.034, 0.02, 0, 0.1, HALF_PI);
  },
  crown(g, m) {
    lootMesh(g, new THREE.TorusGeometry(0.5, 0.03, 8, 48).rotateX(HALF_PI), m.steel, 0, 0.03, 0).castShadow = true;
    const eyelet = new THREE.TorusGeometry(0.03, 0.007, 6, 12);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      lootMesh(g, eyelet, m.steel, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5, 0, -a, 0);
      if (i % 4 === 0) lootMesh(g, LOOT_BOX(0.3, 0.008, 0.008), m.rope, Math.cos(a) * 0.66, 0.006, Math.sin(a) * 0.66, 0, -a, 0);
    }
  },
  burner(g, m) {
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) lootMesh(g, LOOT_BOX(0.025, 0.42, 0.025), m.iron, x, 0.21, z);
    lootMesh(g, LOOT_BOX(0.36, 0.02, 0.36), m.iron, 0, 0.06, 0);
    const turns = [];
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 8; turns.push(new THREE.Vector3(Math.cos(a) * 0.12, 0.12 + (i / 64) * 0.24, Math.sin(a) * 0.12)); }
    lootMesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(turns), 120, 0.014, 6, false), m.copper, 0, 0, 0).castShadow = true;
    lootMesh(g, LOOT_CYL(0.035, 0.1), m.brass, 0, 0.4, 0);
    lootMesh(g, LOOT_CYL(0.05, 0.02), m.black, 0, 0.455, 0);
  },
};

// A few rough planks to keep a part off the snow.
function lootPallet(g, m) {
  for (const z of [-0.2, 0, 0.2]) lootMesh(g, LOOT_BOX(0.62, 0.035, 0.16), m.wood, z * 0.1, 0.045, z, 0, z * 0.15, 0);
  for (const x of [-0.24, 0.24]) lootMesh(g, LOOT_BOX(0.06, 0.03, 0.56), m.darkWood, x, 0.015, 0);
}

// One shared model per item (and page kind), cloned for each copy in the world.
const lootProtos = new Map();

function lootProto(id) {
  const d = itemDef(id);
  const key = d.kind === 'note' ? `note/${d.noteKind}` : id;
  if (lootProtos.has(key)) return lootProtos.get(key);
  const m = getLootMats();
  const g = new THREE.Group();
  if (d.kind === 'note') LOOT_MODELS.note(g, m, d.noteKind);
  else (LOOT_MODELS[d.model || id] || LOOT_MODELS.crate)(g, m);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  g.userData.top = box.max.y;
  g.userData.radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  lootProtos.set(key, g);
  return g;
}

// Copies of a thing, side by side: two tins, three bars.
const LOOT_HEAP = [[0, 0, 0], [0.16, 0.07, 1.3], [-0.06, 0.17, 2.4]];

function lootBuildModel(id, count) {
  const proto = lootProto(id);
  const group = new THREE.Group();
  const n = itemDef(id).kind === 'gear' || itemDef(id).kind === 'part' ? 1 : Math.min(3, count);
  const spread = Math.max(1, proto.userData.radius / 0.1);
  for (let i = 0; i < n; i++) {
    const copy = proto.clone();
    copy.position.set(LOOT_HEAP[i][0] * spread, 0, LOOT_HEAP[i][1] * spread);
    copy.rotation.y = LOOT_HEAP[i][2];
    group.add(copy);
  }
  group.userData.top = proto.userData.top;
  return group;
}

/* ---------- Glints ---------- */
// A soft twinkle now and then, like the axe in the stump. A handful of shared materials,
// each on its own beat, so neighbours don't flash together.
const LOOT_GLINTS = [];
const LOOT_SHARD_GLINTS = [];

function lootMakeGlints() {
  const make = (color, fog) => new THREE.SpriteMaterial({ map: TEX.softDot, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog });
  for (let i = 0; i < 6; i++) LOOT_GLINTS.push(make(0xfff6dd, true));
  // Shards glimmer blue through the fog, so they can be found from a distance.
  for (let i = 0; i < 3; i++) LOOT_SHARD_GLINTS.push(make(0x7cc4ff, false));
}

function lootUpdateGlints(time) {
  LOOT_GLINTS.forEach((mat, i) => {
    const cycle = ((time + i * 0.53) % 3.2) / 3.2;
    mat.opacity = 0.08 + Math.max(0, Math.sin(cycle * Math.PI * 2 - 1.2)) ** 6 * 0.8;
  });
  LOOT_SHARD_GLINTS.forEach((mat, i) => {
    mat.opacity = 0.35 + Math.sin(time * 1.7 + i * 2.1) * 0.15 + Math.max(0, Math.sin(time * 0.9 + i)) ** 12 * 0.5;
  });
  getLootMats().crystal.emissiveIntensity = 1.8 + Math.sin(time * 1.7) * 0.5;
}

/* ---------- Things in the snow ---------- */
// Everything lying in the world this run: { id, x, z, y, count, contents, source, model,
// entry, taken }. `source` is 'placed' (WORLD_ITEMS), 'scatter' or 'spawned'.
const lootItems = [];
const lootFlying = [];
let lootScatterSpots = null;
let lootSerial = 0;
const lootTilt = new THREE.Quaternion(), lootYaw = new THREE.Quaternion(), lootNormal = new THREE.Vector3(), lootPush = new THREE.Vector3();
const LOOT_UP = new THREE.Vector3(0, 1, 0);

// The loose finds are the same every run: a seeded spread across the forest, kept out of
// the sites' clearings. The first few lie within a short walk of where she lands.
function lootMakeScatter() {
  const rand = seededRandom(LOOT.scatterSeed);
  const total = LOOT_SCATTER_TABLE.reduce((s, [, w]) => s + w, 0);
  const pick = () => {
    let r = rand() * total;
    for (const [id, w] of LOOT_SCATTER_TABLE) { r -= w; if (r <= 0) return id; }
    return 'beans';
  };
  const spots = [];
  let items = 0;
  for (let tries = 0; tries < 6000 && items < LOOT.scatterTotal; tries++) {
    let x, z;
    if (spots.length < LOOT.nearStart) {
      const a = rand() * Math.PI * 2, d = 30 + rand() * 230;
      x = LANDMARKS.start.x + Math.cos(a) * d;
      z = LANDMARKS.start.z + Math.sin(a) * d;
    } else {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * (WORLD_RADIUS - 40);
      x = Math.cos(a) * d;
      z = Math.sin(a) * d;
    }
    if (Math.hypot(x, z) > WORLD_RADIUS - 30 || inClearing(x, z, 6)) continue;
    if (SITES.some((s) => Math.hypot(x - s.x, z - s.z) < s.radius + 10)) continue;
    if (spots.some((s) => Math.hypot(x - s.x, z - s.z) < 22)) continue;
    // Mostly one thing, sometimes a pair, now and then a little stash someone dropped.
    const roll = rand();
    const first = pick();
    const finds = [[first, roll < 0.72 ? 1 : 2]];
    if (roll > 0.9) finds.push([pick(), 1]);
    finds.forEach(([id, n], i) => {
      spots.push({ id, count: n, x: x + i * 0.5, z: z + i * 0.35, yaw: rand() * Math.PI * 2 });
      items += n;
    });
  }
  return spots;
}

function lootPlace(id, x, z, opts = {}) {
  const rec = {
    id, x, z, y: opts.y === undefined ? null : opts.y, count: Math.max(1, opts.count || 1), contents: opts.contents || null,
    yaw: opts.yaw === undefined ? hash2(x * 3.1, z * 1.7) * Math.PI : opts.yaw, source: opts.source || 'spawned',
    model: null, taken: false, settled: opts.source !== 'scatter', serial: lootSerial++,
    // The same find gets the same key every run, from where it was first put.
    key: `${id}@${Math.round(x * 10)},${Math.round(z * 10)}`,
  };
  const d = itemDef(rec.id);
  const sign = d.kind === 'note' && d.noteKind === 'sign';
  rec.entry = addInteractable({
    x: rec.x, z: rec.z, r: sign ? 2.6 : d.kind === 'part' || d.kind === 'container' ? 2.2 : LOOT.reach,
    label: () => lootLabel(rec),
    active: () => !rec.taken && !!(rec.model || sign) && !(itemDef(rec.id).kind === 'gear' && hasItem(rec.id)),
    use: () => lootTake(rec),
  });
  lootItems.push(rec);
  return rec;
}

function lootLabel(rec) {
  const d = itemDef(rec.id);
  if (d.kind === 'note') {
    if (d.noteKind === 'varga') return 'Press E to read Varga\'s page';
    if (d.noteKind === 'sign') return 'Press E to read the sign';
    return LORE.notes[d.note] ? `Press E to read “${d.name}”` : 'Press E to read the page';
  }
  if (d.kind === 'container') return `Press E to open ${lootThe(rec.id)}`;
  if (d.kind === 'part') return `Press E to take ${lootThe(rec.id)}`;
  return `Press E to pick up ${lootThe(rec.id, rec.count)}`;
}

function lootTake(rec) {
  const d = itemDef(rec.id);
  if (rec.source !== 'spawned') lootState.taken.add(rec.key);
  if (d.kind === 'note') {
    Sfx.itemPaper();
    // Signs stay where they stand, to be read again.
    if (d.noteKind !== 'sign') lootRemove(rec, true);
    readNote(d.note);
    return;
  }
  lootRemove(rec, true);
  if (d.kind === 'container') {
    lootOpen(rec.id, rec.contents || (rec.id === 'crate' ? lootCrateStock(rec) : null));
    return;
  }
  packAdd(rec.id, rec.count);
}

// What a supply crate holds depends on where it stands, so it's the same every run.
function lootCrateStock(rec) {
  const rand = seededRandom(Math.floor(rec.x * 31 + rec.z * 17));
  const n = 2 + Math.floor(rand() * 2);
  const got = {};
  for (let i = 0; i < n; i++) { const id = LOOT_CRATE_STOCK[Math.floor(rand() * LOOT_CRATE_STOCK.length)]; got[id] = (got[id] || 0) + 1; }
  return Object.entries(got);
}

function lootRemove(rec, fly = false) {
  rec.taken = true;
  removeInteractable(rec.entry);
  if (rec.model) {
    if (fly) {
      lootFlying.push({ model: rec.model, t: 0 });
      burst(rec.model.position, 0xf2f5ff, 8, 1.4);
    } else {
      scene.remove(rec.model);
    }
    rec.model = null;
  }
  const i = lootItems.indexOf(rec);
  if (i >= 0) lootItems.splice(i, 1);
}

// Something dropped at runtime: Teto's things, a carcass. Returns a handle for
// removeWorldItem. opts: { count, y, yaw, contents }.
function spawnWorldItem(id, x, z, opts = {}) {
  const rec = lootPlace(id, x, z, { ...opts, source: 'spawned' });
  lootShow(rec);
  return rec;
}

function removeWorldItem(handle) {
  if (handle && lootItems.includes(handle)) lootRemove(handle);
}

// Lays the model in the snow, tipped to the slope, or on whatever it stands on.
function lootShow(rec) {
  const d = itemDef(rec.id);
  if (rec.model || (d.kind === 'note' && d.noteKind === 'sign')) return;
  const model = lootBuildModel(rec.id, rec.count);
  lootYaw.setFromAxisAngle(LOOT_UP, rec.yaw);
  if (rec.y === null) {
    const e = 0.35;
    lootNormal.set(groundHeight(rec.x - e, rec.z) - groundHeight(rec.x + e, rec.z), 2 * e, groundHeight(rec.x, rec.z - e) - groundHeight(rec.x, rec.z + e)).normalize();
    lootTilt.setFromUnitVectors(LOOT_UP, lootNormal);
    model.quaternion.copy(lootTilt).multiply(lootYaw);
    model.position.set(rec.x, groundHeight(rec.x, rec.z) - 0.008, rec.z);
  } else {
    model.quaternion.copy(lootYaw);
    model.position.set(rec.x, rec.y, rec.z);
  }
  const shard = rec.id === 'shard';
  const glints = shard ? LOOT_SHARD_GLINTS : LOOT_GLINTS;
  const glint = new THREE.Sprite(glints[rec.serial % glints.length]);
  glint.scale.setScalar(shard ? 0.45 : d.kind === 'part' ? 0.3 : 0.2);
  glint.position.set(0, model.userData.top + (shard ? 0.02 : 0.05), 0);
  model.add(glint);
  scene.add(model);
  rec.model = model;
}

function lootHide(rec) {
  if (!rec.model) return;
  scene.remove(rec.model);
  rec.model = null;
}

// Loose finds that landed in a trunk or a rock are nudged clear once the trees around them
// exist.
function lootSettle(rec) {
  rec.settled = true;
  lootPush.set(rec.x, 0, rec.z);
  pushOutOfColliders(lootPush, 0.45);
  if (lootPush.x === rec.x && lootPush.z === rec.z) return;
  rec.x = rec.entry.x = lootPush.x;
  rec.z = rec.entry.z = lootPush.z;
  if (rec.model) { lootHide(rec); lootShow(rec); }
}

// Builds the models near her and drops the far ones. A few per call, unless `all`.
function lootStream(all = false) {
  let budget = all ? Infinity : 14;
  for (const rec of lootItems) {
    const d = Math.hypot(rec.x - player.pos.x, rec.z - player.pos.z);
    if (!rec.model && d < LOOT.buildRange && budget > 0) { lootShow(rec); budget--; }
    else if (rec.model && d > LOOT.dropRange) lootHide(rec);
    if (!rec.settled && d < LOOT.settleRange) lootSettle(rec);
  }
}

const lootChest = new THREE.Vector3();
function lootUpdateFlying(dt) {
  lootChest.set(player.pos.x, player.pos.y + 1, player.pos.z);
  for (const f of [...lootFlying]) {
    f.t += dt / 0.24;
    const u = Math.min(1, f.t);
    f.model.position.lerp(lootChest, u * 0.5);
    f.model.position.y += Math.sin(u * Math.PI) * 0.05;
    f.model.scale.setScalar(Math.max(0.001, 1 - u * u));
    if (f.t >= 1) { scene.remove(f.model); lootFlying.splice(lootFlying.indexOf(f), 1); }
  }
}

/* ---------- Cooking ---------- */
// One prompt that follows whichever fire she's standing by.
const lootCook = { entry: null, fire: null };

function lootCookLabel() {
  const parts = ['rabbit_raw', 'wolf_raw'].filter(hasItem).map((id) => (packCount(id) === 1 ? `the ${itemName(id)}` : `${packCount(id)} ${itemName(id, 2)}`));
  return `Press E to cook ${parts.join(' and ')}`;
}

function lootCookMeat() {
  const fire = lootCook.fire;
  const cooked = [];
  for (const raw of ['rabbit_raw', 'wolf_raw']) {
    const n = packCount(raw);
    if (!n) continue;
    packTake(raw, n);
    packAdd(ITEMS[raw].cooks, n, { silent: true });
    cooked.push(`${n} ${itemName(ITEMS[raw].cooks, n)}`);
  }
  if (!cooked.length) return;
  Sfx.itemSizzle();
  lootToast(`Cooked ${cooked.join(' and ')}`);
  if (fire) {
    const y = groundHeight(fire.x, fire.z);
    burst(new THREE.Vector3(fire.x, y + 0.6, fire.z), 0xffa860, 20, 2.4);
    burst(new THREE.Vector3(fire.x, y + 0.9, fire.z), 0x8a8a90, 16, 1.6);
  }
}

function lootUpdateCooking() {
  let best = null, bestD = Infinity;
  for (const fire of survival.fires) {
    const d = Math.hypot(fire.x - player.pos.x, fire.z - player.pos.z);
    if (d < bestD) { best = fire; bestD = d; }
  }
  lootCook.fire = best;
  if (best) { lootCook.entry.x = best.x; lootCook.entry.z = best.z; }
}

/* ---------- Binoculars ---------- */
const binoculars = { up: false, fog: 0, fogSet: -1, hid: false, spot: null, spotT: 0, readT: 0, text: '', hp: 100 };
// Landmarks with a light or steam that shows above the fog can be spotted from anywhere.
const BINOCULAR_BEACONS = { lookout: 1600, radio: 1800, breath: 1800 };

function binocularsUp() { return binoculars.up; }

function binocularsBlocked() {
  return game.state !== 'playing' || player.sprinting || player.drawing || aiming || !!player.dodge || !!survival.swing || katanaBusy();
}

function toggleBinoculars() {
  if (binoculars.up) { binocularsLower(); return; }
  if (!hasItem('binoculars')) { toast('No binoculars'); return; }
  if (binocularsBlocked()) return;
  binoculars.up = true;
  binoculars.hp = survival.health;
  binoculars.spot = null;
  binoculars.spotT = 0;
  Sfx.itemBinoculars(true);
  $('binoculars').classList.remove('hidden');
  document.body.classList.add('binoculars-up');
  // The camera sits behind her, so she steps out of her own view while she looks.
  avatar.setVisible(false);
  binoculars.hid = true;
  if (scene.fog) {
    binoculars.fog = scene.fog.density;
    scene.fog.density *= LOOT.binocularFog;
    binoculars.fogSet = scene.fog.density;
  }
  binocularsRead('');
}

function binocularsLower() {
  if (!binoculars.up) return;
  binoculars.up = false;
  Sfx.itemBinoculars(false);
  $('binoculars').classList.add('hidden');
  document.body.classList.remove('binoculars-up');
  if (binoculars.hid) { avatar.setVisible(true); binoculars.hid = false; }
  // Only put the fog back if nothing else has changed it meanwhile.
  if (scene.fog && scene.fog.density === binoculars.fogSet) scene.fog.density = binoculars.fog;
  binoculars.fogSet = -1;
}

function binocularsRead(text) {
  if (text === binoculars.text) return;
  binoculars.text = text;
  $('binoculars').querySelector('.bino-read').innerHTML = text;
}

const BEARING_NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// What's in the middle of the lenses: the bearing (with the compass), and any landmark she
// holds steady on, which goes on the chart.
function binocularsUpdate(dt) {
  if (binocularsBlocked() || survival.health < binoculars.hp - 1) { binocularsLower(); return; }
  binoculars.hp = survival.health;
  // North is up the crater, towards the altar (-Z); east is +X.
  const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
  let best = null, bestScore = Infinity, bestD = 0;
  for (const site of SITES) {
    const dx = site.x - player.pos.x, dz = site.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < site.radius || d > (BINOCULAR_BEACONS[site.id] || 340)) continue;
    const off = Math.acos(clamp((dx * fx + dz * fz) / d, -1, 1));
    const width = Math.max(0.035, Math.atan((site.radius * 0.6) / d));
    if (off < width && off / width < bestScore) { best = site; bestScore = off / width; bestD = d; }
  }
  if (best !== binoculars.spot) { binoculars.spot = best; binoculars.spotT = 0; }
  binoculars.spotT += dt;
  binoculars.readT -= dt;
  if (binoculars.readT > 0) return;
  binoculars.readT = 0.1;
  let text = '';
  if (hasItem('compass')) {
    const bearing = (Math.atan2(fx, -fz) * 180 / Math.PI + 360) % 360;
    text += `<span class="bino-bearing">${String(Math.round(bearing) % 360).padStart(3, '0')}° ${BEARING_NAMES[Math.round(bearing / 45) % 8]}</span>`;
  }
  if (best) {
    const name = (LORE.sites[best.id] && LORE.sites[best.id].name) || best.name;
    if (best.revealed || best.discovered) {
      text += `<span class="bino-spot">${name} · ${Math.round(bestD / 10) * 10} m</span>`;
    } else if (binoculars.spotT >= LOOT.spotTime) {
      revealSite(best.id);
      Sfx.itemShard();
      lootToast(`Spotted ${name}${hasItem('map') ? ', marked on the chart' : ''}`);
      text += `<span class="bino-spot">${name} · ${Math.round(bestD / 10) * 10} m</span>`;
    } else {
      text += '<span class="bino-spot focusing">Something out there…</span>';
    }
  }
  binocularsRead(text);
}

// Scenes, the book and the reader take her out of play from a key press, between frames;
// this puts the binoculars away whenever that happens.
function binocularsWatch() {
  requestAnimationFrame(binocularsWatch);
  binocularsCheck();
}

function binocularsCheck() {
  if (binoculars.up && game.state !== 'playing') binocularsLower();
}

/* ---------- The pack page ---------- */
// Item pictures for the pack, rendered once each from the same models by a small second
// renderer of their own, so the main view's state is never touched.
const packIcons = new Map();
let packIconKit = null;

function packIcon(id) {
  if (packIcons.has(id)) return packIcons.get(id);
  let url = '';
  try {
    if (!packIconKit) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      const iconScene = new THREE.Scene();
      iconScene.add(new THREE.HemisphereLight(0xf4f0ff, 0x6a5a48, 2.2));
      const key = new THREE.DirectionalLight(0xfff0dc, 3);
      key.position.set(1.5, 3, 2.2);
      const rim = new THREE.DirectionalLight(0xa8c8ff, 1.6);
      rim.position.set(-2, 1.2, -2);
      iconScene.add(key, rim);
      packIconKit = { canvas, renderer, scene: iconScene, camera: new THREE.PerspectiveCamera(26, 1, 0.01, 60), box: new THREE.Box3(), size: new THREE.Vector3(), centre: new THREE.Vector3() };
    }
    const kit = packIconKit;
    const model = lootBuildModel(id, 1);
    kit.scene.add(model);
    model.updateMatrixWorld(true);
    kit.box.setFromObject(model);
    kit.box.getSize(kit.size);
    kit.box.getCenter(kit.centre);
    const reach = Math.max(kit.size.x, kit.size.y, kit.size.z, 0.05);
    const dist = (reach / (2 * Math.tan((kit.camera.fov * Math.PI) / 360))) * 1.08;
    kit.camera.position.copy(kit.centre).add(new THREE.Vector3(0.55, 0.62, 0.9).normalize().multiplyScalar(dist));
    kit.camera.near = dist / 20;
    kit.camera.far = dist * 4;
    kit.camera.updateProjectionMatrix();
    kit.camera.lookAt(kit.centre);
    kit.renderer.render(kit.scene, kit.camera);
    url = kit.canvas.toDataURL('image/png');
    kit.scene.remove(model);
  } catch (err) {
    url = '';
  }
  packIcons.set(id, url);
  return url;
}

// Icons are drawn a couple at a time after the page opens, so opening it never stalls.
let packIconTimer = 0;
function packFillIcons(el) {
  clearTimeout(packIconTimer);
  const step = () => {
    const pending = el.querySelectorAll('img[data-icon]');
    for (let i = 0; i < Math.min(3, pending.length); i++) {
      const img = pending[i];
      const url = packIcon(img.dataset.icon);
      if (url) img.src = url;
      else img.classList.add('missing');
      img.removeAttribute('data-icon');
    }
    if (pending.length > 3) packIconTimer = setTimeout(step, 16);
  };
  step();
}

function packIconTag(id) {
  const url = packIcons.get(id);
  return url ? `<img src="${url}" alt="">` : `<img data-icon="${id}" alt="">`;
}

const PACK_SECTIONS = [
  ['Food and medicine', (d) => ['food', 'drink', 'med'].includes(d.kind)],
  ['To cook', (d) => d.kind === 'raw'],
  ['Worn and carried', (d) => d.kind === 'gear'],
  ['Materials', (d) => d.kind === 'resource'],
];

function packCard(id) {
  const d = itemDef(id);
  const n = packCount(id);
  const effect = d.kind === 'raw' ? 'Cook it at a fire' : id === 'binoculars' ? 'Z to look through them' : id === 'map' ? 'M to open the map' : lootEffectText(d);
  const verb = d.verb || (id === 'map' ? 'Open' : '');
  return `<article class="pack-card kind-${d.kind}">${packIconTag(id)}`
    + `<div class="pack-card-text"><h4>${d.name}${n > 1 ? ` <b>×${n}</b>` : ''}</h4><p>${d.desc}</p>${effect ? `<p class="pack-effect">${effect}</p>` : ''}</div>`
    + `${verb ? `<button data-use="${id}">${verb}</button>` : ''}</article>`;
}

function renderPack(el) {
  if (!el.packBound) {
    el.packBound = true;
    el.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-use]');
      if (!button) return;
      const id = button.dataset.use;
      useItem(id);
      if (id !== 'map') renderPack(el);
    });
  }
  const owned = Object.keys(pack).filter((id) => pack[id] > 0);
  const cold = gearCold(), speed = gearSpeed();
  const worn = LOOT_GEAR.filter((id) => hasItem(id) && (ITEMS[id].cold || ITEMS[id].speed));
  let html = '<div class="pack">';
  html += '<header class="pack-head"><div><p class="pack-kicker">Her pack</p><h3>What she carries</h3></div>'
    + `<p class="pack-vitals"><span>Health <b>${Math.round(survival.health)}</b></span><span>Warmth <b>${Math.round(survival.warmth)}</b></span><span>Planks <b>${survival.planks}</b></span></p></header>`;
  html += `<p class="pack-worn">${worn.length ? `Wearing ${worn.map((id) => itemName(id)).join(', ')}` : 'Wearing what she flew in. It was not chosen for this.'}`
    + `${cold < 1 ? ` <span>Cold −${Math.round((1 - cold) * 100)}%</span>` : ''}${speed > 1 ? ` <span>Speed +${Math.round((speed - 1) * 100)}%</span>` : ''}</p>`;
  let any = false;
  for (const [title, test] of PACK_SECTIONS) {
    const ids = owned.filter((id) => test(itemDef(id)));
    if (!ids.length) continue;
    any = true;
    html += `<section class="pack-section"><h4 class="pack-title">${title}</h4><div class="pack-grid">${ids.map(packCard).join('')}</div></section>`;
  }
  if (!any) html += '<p class="pack-empty">Nothing yet but lint and a boarding pass.</p>';

  // Varga's ten parts, in the order of the sites.
  html += `<section class="pack-section"><h4 class="pack-title">Balloon parts <b>${packPartCount()} / ${PACK_PART_IDS.length}</b></h4><div class="pack-parts">`;
  for (const id of PACK_PART_IDS) {
    const d = ITEMS[id];
    const site = siteById(d.site);
    const where = site && (site.revealed || site.discovered) ? ((LORE.sites[site.id] && LORE.sites[site.id].name) || site.name) : 'Somewhere in the Hollow';
    html += hasItem(id)
      ? `<div class="pack-part got" title="${d.desc}">${packIconTag(id)}<b>${d.name}</b></div>`
      : `<div class="pack-part"><i>?</i><b>Unfound</b><small>${where}</small></div>`;
  }
  html += '</div></section>';
  const shards = packShardCount();
  html += `<section class="pack-section"><h4 class="pack-title">Star-iron shards <b>${shards} / ${LOOT.shardTotal}</b></h4><div class="pack-shards">`
    + Array.from({ length: LOOT.shardTotal }, (_, i) => `<i class="${i < shards ? 'got' : ''}"></i>`).join('') + '</div></section>';
  html += '</div>';
  el.innerHTML = html;
  packFillIcons(el);
}

/* ---------- A new run ---------- */
function initItems() {
  getLootMats();
  lootMakeGlints();
  lootRecipes();
  lootCook.entry = addInteractable({
    x: 0, z: 0, r: LOOT.cookReach, label: lootCookLabel, use: lootCookMeat,
    active: () => !!lootCook.fire && (hasItem('rabbit_raw') || hasItem('wolf_raw')),
  });
  $('binoculars').innerHTML = '<div class="bino-lens"></div><div class="bino-reticle"><i></i><i></i></div><p class="bino-read"></p>';
  requestAnimationFrame(binocularsWatch);
  resetItems();
}

function resetItems() {
  binocularsLower();
  for (const id in pack) delete pack[id];
  for (const rec of [...lootItems]) lootRemove(rec);
  for (const f of lootFlying) scene.remove(f.model);
  lootFlying.length = 0;
  lootState.used.clear();
  lootState.got.clear();
  lootState.taken.clear();
  lootState.toasts.length = 0;
  for (const entry of WORLD_ITEMS) {
    lootPlace(entry.item, entry.x, entry.z, { y: entry.y, count: entry.count, contents: entry.contents, yaw: entry.yaw, source: 'placed' });
  }
  if (!lootScatterSpots) lootScatterSpots = lootMakeScatter();
  // The crash site moves every run; nothing lies where the plane came down.
  for (const s of lootScatterSpots) {
    if (!inClearing(s.x, s.z, 4)) lootPlace(s.id, s.x, s.z, { count: s.count, yaw: s.yaw, source: 'scatter' });
  }
  lootFoodShown = -1;
  lootFoodSlot();
  lootStream(true);
}

function updateItems(dt) {
  lootState.streamT -= dt;
  if (lootState.streamT <= 0) { lootState.streamT = 0.25; lootStream(); }
  lootUpdateGlints(game.time);
  // Shards turn slowly, catching the light.
  for (const rec of lootItems) if (rec.model && rec.id === 'shard') rec.model.children[0].rotation.y += dt * 0.4;
  lootUpdateFlying(dt);
  lootUpdateCooking();
  if (binoculars.up) binocularsUpdate(dt);
  if (lootState.toasts.length && game.state === 'playing') {
    toast(lootState.toasts.join('   ·   '));
    lootState.toasts.length = 0;
  }
}
