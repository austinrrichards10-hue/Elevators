// The story as she lives it: what she's trying to do next, the places she finds, the pages
// she reads and the journal that keeps them. The words themselves are in lore.js; this file
// decides when they're shown, listening to the game's events.

/* ---------- State ---------- */
const STORY = {
  bannerTime: 4.8, // seconds a site's title card stays up
  partTotal: 10,
  shardTotal: 15,
  planksNeeded: 10, // the balloon's basket floor and burner frame
  // The flight bag lands beside her; once she has wandered this far from the landing
  // without it, the objective stops insisting.
  bagSpot: { x: LANDMARKS.start.x - 3.2, z: LANDMARKS.start.z + 2.6 },
  bagRange: 80,
  crimsonSight: 26, // close enough to recognise the other survivor
  lookoutSight: 75, // close enough to see the tower over the trees
  frameRange: 12, // close enough to the launch frame to see what's missing
  needCooldown: 90, // seconds between reminders at the frame
  repeatGap: 20, // seconds before a repeatable line can be said again
};

// Lines she can say more than once in a run.
const STORY_REPEATABLE = new Set(['revived', 'assembleNeed']);

// Tallies for the journal and the ending screen. The debug handle keeps a reference to this
// object, so a new run zeroes it in place rather than replacing it.
const stats = { rabbits: 0, wolves: 0, trees: 0, notes: 0, shards: 0, sites: 0, parts: 0, distance: 0, time: 0 };
const notesRead = new Set();

const story = {
  said: new Set(), // lines already said this run
  saidAt: {}, // play time each line was last said
  parts: new Set(), // balloon part ids she has found
  flags: {}, // bag, fire, lookout, knowsVarga, assembled, escaped, crimsonGone
  timers: [], // { t, fn }: lines that wait a moment, counted in play time
  checkT: 0,
  needT: 0,
  last: { x: 0, z: 0 },
  objectiveKey: null,
  objectiveText: null,
  objectiveDist: null,
  reader: { id: null, returnTo: 'playing' },
  bannerTimer: 0,
  listening: false,
};

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // A slow open fifth with two soft high notes over it, for finding a place.
  siteFound() {
    this.glide([[0, 196], [2.2, 196]], 0.05, 'sine');
    this.glide([[0, 294], [2.4, 294]], 0.035, 'sine');
    setTimeout(() => this.glide([[0, 587], [1.3, 587]], 0.026, 'triangle', 2), 240);
    setTimeout(() => this.glide([[0, 784], [1.6, 784]], 0.02, 'sine', 3), 560);
  },
  // Paper unfolding, or being put away.
  pageTurn() {
    this.burst(0.08, 3400, 0.7, 0.08, 'highpass');
    setTimeout(() => this.burst(0.16, 2100, 0.6, 0.06, 'bandpass'), 60);
  },
});

/* ---------- Words ---------- */
function storyEscape(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Fills {n}, {total}, {sites}, {parts} and {planks} in a line of text.
function storyFormat(text, n = 0, total = 0) {
  const values = { n, total, sites: majorSitesFound(), parts: story.parts.size, planks: survival.planks };
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

function storySiteName(site) {
  return (LORE.sites[site.id] && LORE.sites[site.id].name) || site.name;
}

function storyPartName(part) {
  const item = typeof ITEMS !== 'undefined' && ITEMS[`part:${part}`];
  return (item && item.name) || LORE.parts[part] || part;
}

// One of her thoughts, held long enough to read.
function storySay(text) {
  const words = text.split(/\s+/).length;
  say(text, clamp(1.6 + words * 0.3, 2.6, 6.5));
}

// Says one of LORE.lines (picking one if it's a list), once per run unless it's repeatable.
// A repeatable line still waits a little before it's said again, since more than one part
// of the game may ask for it at once. Returns whether it was said.
function sayLine(key, repeat = STORY_REPEATABLE.has(key)) {
  if (!repeat && story.said.has(key)) return false;
  if (repeat && stats.time - (story.saidAt[key] ?? -Infinity) < STORY.repeatGap) return false;
  let line = LORE.lines[key];
  if (Array.isArray(line)) line = line[Math.floor(Math.random() * line.length)];
  if (!line) return false;
  story.said.add(key);
  story.saidAt[key] = stats.time;
  storySay(storyFormat(line));
  return true;
}

// Runs fn after `seconds` of play, so a thought can follow a beat after what caused it.
function storyLater(seconds, fn) {
  story.timers.push({ t: seconds, fn });
}

function storyClock(seconds) {
  const s = Math.floor(seconds), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

/* ---------- Banner ---------- */
// A site's title card, big and centred, fading after a few seconds.
function showBanner(kicker, title, sub = '') {
  // Up in Teto's arena the forest's place names don't apply (the fight has its own banners).
  if (typeof showdownKit !== 'undefined' && showdownKit && arenaActive()) return;
  const el = $('banner');
  el.querySelector('.banner-kicker').textContent = kicker || '';
  el.querySelector('.banner-title').textContent = title || '';
  el.querySelector('.banner-sub').textContent = sub || '';
  // Restart the fade-in even if a card is already showing.
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(story.bannerTimer);
  story.bannerTimer = setTimeout(() => el.classList.remove('on'), STORY.bannerTime * 1000);
  Sfx.siteFound();
}

function hideBanner() {
  clearTimeout(story.bannerTimer);
  $('banner').classList.remove('on');
}

/* ---------- Reading ---------- */
// Holds a note or journal page up to read. The game waits while she reads; E, Space,
// Enter, Escape or a click puts it away and goes back to `returnTo` (where she was).
function readNote(id, returnTo) {
  const note = LORE.notes[id];
  if (!note) { console.warn(`No note "${id}" in LORE.notes`); return; }
  if (game.state !== 'reader') {
    story.reader.returnTo = returnTo || game.state;
    if (game.state === 'playing') {
      aiming = false;
      cancelDraw();
      setCrafting(false);
    }
    game.state = 'reader';
    pointerWasLocked = false;
    document.exitPointerLock();
  } else if (returnTo) {
    story.reader.returnTo = returnTo;
  }
  story.reader.id = id;

  const first = !notesRead.has(id);
  const marked = [];
  if (first) {
    notesRead.add(id);
    stats.notes = notesRead.size;
    if (note.kind === 'varga') story.flags.knowsVarga = true;
    for (const siteId of note.reveals || []) {
      const site = siteById(siteId);
      if (site && !site.revealed) { revealSite(siteId); marked.push(storySiteName(site)); }
    }
  }
  storyRenderReader(id, note, marked);
  $('reader').classList.remove('hidden');
  Sfx.pageTurn();
  if (first) emitGame('noteRead', id);
}

function storyRenderReader(id, note, marked) {
  const paper = document.querySelector('#reader .paper');
  paper.className = `paper ${note.kind || 'note'} note-${id}`;
  const varga = note.kind === 'varga';
  paper.querySelector('.reader-meta').textContent = varga
    ? `Page ${note.sort} of 11 · ${note.date}`
    : [note.author, note.date].filter(Boolean).join(' · ');
  paper.querySelector('.reader-title').textContent = note.title;
  let html = note.body.map((p) => `<p>${storyEscape(p)}</p>`).join('');
  if (varga) html += '<p class="reader-sign">I.V.</p>';
  if (marked.length) {
    const lead = typeof hasMap === 'function' && hasMap() ? 'Marked on the chart' : 'Places to look for';
    html += `<p class="reader-reveal">${lead}: ${marked.map(storyEscape).join(', ')}</p>`;
  }
  paper.querySelector('.reader-body').innerHTML = html;
  paper.querySelector('.reader-hint').textContent = story.reader.returnTo === 'book'
    ? 'E, Space or click to go back to the journal'
    : 'E, Space or click to put it away';
  paper.scrollTop = 0;
  // Replay the paper's lift into view.
  paper.style.animation = 'none';
  void paper.offsetWidth;
  paper.style.animation = '';
}

// Escape can't re-lock the mouse, so closing back into play with it pauses instead, as the
// moderator menu does.
function storyCloseReader(byEscape = false) {
  if (game.state !== 'reader') return;
  $('reader').classList.add('hidden');
  Sfx.pageTurn();
  const back = story.reader.returnTo;
  story.reader.id = null;
  if (back === 'playing') {
    if (byEscape) setPaused(true);
    else { game.state = 'playing'; lockPointer(); }
    return;
  }
  game.state = back;
  if (back === 'book' && !$('book').classList.contains('hidden')) renderJournal($('book-journal'));
}

// Registered in the capture phase, ahead of every other key handler, so the key that puts a
// page away doesn't also close the book, pause the game or count as a press of E in play.
addEventListener('keydown', (e) => {
  if (game.state !== 'reader') return;
  if (!['KeyE', 'Space', 'Enter', 'Escape'].includes(e.code)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  // Still holding E from picking it up: the key repeating mustn't put it straight away.
  if (e.repeat) return;
  storyCloseReader(e.code === 'Escape');
}, true);

/* ---------- Journal ---------- */
const STORY_TICK = '<i class="journal-mark" aria-hidden="true"></i>';

// The site a page of Varga's was left at.
function storyPageSite(id) {
  return siteById(id === 'varga-final' ? 'breath' : id.replace('varga-', ''));
}

// The journal page of the field book: Varga's pages, other papers, the sites, the
// balloon's parts and her tallies. Read entries open again in the reader.
function renderJournal(el) {
  if (!el) return;
  stats.sites = majorSitesFound();
  stats.parts = story.parts.size;
  const ids = Object.keys(LORE.notes).sort((a, b) => LORE.notes[a].sort - LORE.notes[b].sort);
  const pages = ids.filter((id) => LORE.notes[id].kind === 'varga');
  const papers = ids.filter((id) => LORE.notes[id].kind !== 'varga');
  const pagesRead = pages.filter((id) => notesRead.has(id)).length;
  const papersRead = papers.filter((id) => notesRead.has(id));
  const majors = SITES.filter((s) => s.major);
  const breath = siteById('breath');
  const shards = Math.max(stats.shards, packCount('shard'));

  const pageRows = pages.map((id) => {
    const note = LORE.notes[id];
    if (notesRead.has(id)) {
      return `<li><button class="journal-entry read" data-note="${id}"><span class="journal-num">${note.sort}</span>`
        + `<span><b>${storyEscape(note.title)}</b><small>${storyEscape(note.date)}</small></span></button></li>`;
    }
    const site = storyPageSite(id);
    const hint = site && site.discovered ? `Waiting at ${storySiteName(site)}`
      : site && site.revealed ? `Somewhere at ${storySiteName(site)}` : 'Not found yet';
    return `<li><div class="journal-entry unread"><span class="journal-num">${note.sort}</span>`
      + `<span><b>Page ${note.sort}</b><small>${storyEscape(hint)}</small></span></div></li>`;
  }).join('');

  const paperRows = papersRead.length ? papersRead.map((id) => {
    const note = LORE.notes[id];
    return `<li><button class="journal-entry read paper-${note.kind}" data-note="${id}"><span class="journal-kind"></span>`
      + `<span><b>${storyEscape(note.title)}</b><small>${storyEscape([note.author, note.date].filter(Boolean).join(' · '))}</small></span></button></li>`;
  }).join('') : '<li class="journal-empty">Nothing yet. Papers turn up in cabins, on signboards and in the pockets of the lost.</li>';

  const siteRow = (site) => {
    const lore = LORE.sites[site.id] || {};
    if (site.discovered) return `<li class="found">${STORY_TICK}<span><b>${storyEscape(storySiteName(site))}</b><small>${storyEscape(lore.mapNote || '')}</small></span></li>`;
    if (site.revealed) return `<li class="known"><i class="journal-mark" aria-hidden="true">?</i><span><b>${storyEscape(storySiteName(site))}</b><small>Marked on the chart, not yet visited</small></span></li>`;
    return '<li class="unknown"><i class="journal-mark" aria-hidden="true"></i><span><b>Unknown</b><small>Somewhere in the Hollow</small></span></li>';
  };

  const partRows = majors.map((site) => {
    const found = story.parts.has(site.part) || packCount(`part:${site.part}`) > 0;
    const where = site.discovered || site.revealed ? storySiteName(site) : 'Somewhere in the Hollow';
    return `<li class="${found ? 'found' : 'unknown'}">${STORY_TICK}<span><b>${storyEscape(storyPartName(site.part))}</b><small>${storyEscape(found ? `Found at ${storySiteName(site)}` : where)}</small></span></li>`;
  }).join('');

  const tally = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  el.innerHTML = `
    <div class="journal">
      <header class="journal-head">
        <h3>Field journal</h3>
        <p>${stats.sites}/10 sites · ${stats.parts}/${STORY.partTotal} balloon parts · ${notesRead.size} papers read</p>
      </header>
      <div class="journal-grid">
        <div class="journal-col">
          <section class="journal-pages">
            <h4>Dr. Varga’s journal <span>${pagesRead}/${pages.length}</span></h4>
            <ol>${pageRows}</ol>
          </section>
          <section class="journal-papers">
            <h4>Other papers <span>${papersRead.length}/${papers.length}</span></h4>
            <ul>${paperRows}</ul>
          </section>
        </div>
        <div class="journal-col">
          <section class="journal-sites">
            <h4>Sites <span>${stats.sites}/10</span></h4>
            <ul>${majors.map(siteRow).join('')}${breath ? siteRow(breath).replace('<li class="', '<li class="breath ') : ''}</ul>
          </section>
          <section class="journal-parts">
            <h4>Balloon parts <span>${stats.parts}/${STORY.partTotal}</span></h4>
            <ul>${partRows}</ul>
          </section>
          <section class="journal-tallies">
            <h4>The Hollow</h4>
            <dl>
              ${tally('Star-iron shards', `${shards}/${STORY.shardTotal}`)}
              ${tally('Hares taken', stats.rabbits)}
              ${tally('Wolves killed', stats.wolves)}
              ${tally('Trees felled', stats.trees)}
              ${tally('Distance walked', `${(stats.distance / 1000).toFixed(1)} km`)}
              ${tally('Time in the Hollow', storyClock(stats.time))}
            </dl>
          </section>
        </div>
      </div>
    </div>`;
  // Replaced each render, so it never stacks.
  el.onclick = (e) => {
    const entry = e.target.closest('[data-note]');
    if (entry && notesRead.has(entry.dataset.note)) readNote(entry.dataset.note, 'book');
  };
}

/* ---------- Objectives ---------- */
// The first thing she hasn't done yet, as a key of LORE.objectives (or null at the end).
function storyObjective() {
  const f = story.flags;
  if (f.escaped) return null;
  // After Teto's ambush the story has goals of its own (showdown.js).
  const after = showdownObjective();
  if (after) return after;
  const fromStart = Math.hypot(player.pos.x - LANDMARKS.start.x, player.pos.z - LANDMARKS.start.z);
  if (!f.bag && !hasItem('map') && fromStart < STORY.bagRange) return 'bag';
  const fire = f.fire || survival.fires.length > 0;
  if (!fire && !survival.hasAxe && !katana.owned) return 'axe';
  if (!fire && survival.planks < SURVIVAL.campfireCost) return 'wood';
  if (!fire) return 'fire';
  if (f.assembled) return 'launch';
  if (story.parts.size >= STORY.partTotal) return survival.planks >= STORY.planksNeeded ? 'assemble' : 'breath';
  // The lookout shows her the lie of the land; once she's on Varga's trail or has found
  // her own way about, it's no longer worth the detour.
  // Also back to it whenever the trail runs dry, since the climb marks every site.
  if (!f.lookout && ((!story.parts.size && majorSitesFound() < 3) || !storyNextSite()) && SITES.some((s) => s.major && !s.revealed)) return 'lookout';
  return f.knowsVarga || story.parts.size ? 'caches' : 'explore';
}

function storyObjectiveText(key) {
  const text = LORE.objectives[key];
  if (!text) return '';
  if (key === 'wood') return storyFormat(text, survival.planks, SURVIVAL.campfireCost);
  if (key === 'explore') return storyFormat(text, majorSitesFound(), 10);
  if (key === 'caches') return storyFormat(text, story.parts.size, STORY.partTotal);
  if (key === 'breath') return storyFormat(text, survival.planks, STORY.planksNeeded);
  if (key === 'repair') return text.replace('{wolf}', Math.min(packCount('wolfpelt'), SHOWDOWN.repair.wolfpelt)).replace('{hare}', Math.min(packCount('pelt'), SHOWDOWN.repair.pelt));
  return storyFormat(text);
}

// Where the next unknown lies: the nearest site marked on her chart but not visited, or
// failing that the nearest visited site whose part she left behind.
function storyNextSite() {
  let best = null, bestD = Infinity;
  const consider = (site) => {
    const d = Math.hypot(site.x - player.pos.x, site.z - player.pos.z);
    if (d < bestD) { best = site; bestD = d; }
  };
  // The site she's at, until she's taken its part or walked well away.
  for (const site of SITES) if (site.major && site.discovered && !story.parts.has(site.part) && Math.hypot(site.x - player.pos.x, site.z - player.pos.z) < site.radius * 2) return site;
  for (const site of SITES) if (site.major && site.revealed && !site.discovered) consider(site);
  if (!best) for (const site of SITES) if (site.major && site.discovered && !story.parts.has(site.part)) consider(site);
  return best;
}

// Where the current objective points, for the map and the compass: { x, z, label } or null.
function objectiveTarget() {
  const key = storyObjective();
  if (key === 'bag') return { x: STORY.bagSpot.x, z: STORY.bagSpot.z, label: 'Flight bag' };
  if (key === 'axe') return { x: STUMP_SPOT.x, z: STUMP_SPOT.z, label: 'The axe' };
  if (key === 'wood') {
    // The middle of the nearest fallen trunk, if she's already felled one.
    let best = null, bestD = Infinity;
    for (const log of survival.fallen) {
      if (!log.landed) continue;
      const p = log.tree.placement;
      const x = p.x + log.dir.x * log.length * 0.5, z = p.z + log.dir.z * log.length * 0.5;
      const d = Math.hypot(x - player.pos.x, z - player.pos.z);
      if (d < bestD) { bestD = d; best = { x, z, label: 'Fallen tree' }; }
    }
    return best;
  }
  if (key === 'lookout') {
    const site = siteById('lookout');
    return { x: site.x, z: site.z, label: storySiteName(site) };
  }
  if (key === 'explore' || key === 'caches') {
    const site = storyNextSite();
    return site ? { x: site.x, z: site.z, label: storySiteName(site) } : null;
  }
  if (key === 'breath' || key === 'assemble' || key === 'launch' || key === 'board' || (key === 'repair' && packCount('wolfpelt') >= SHOWDOWN.repair.wolfpelt && packCount('pelt') >= SHOWDOWN.repair.pelt)) {
    const site = siteById('breath');
    const at = site.launch || { x: 0, z: 0 };
    return { x: site.x + at.x, z: site.z + at.z, label: key === 'breath' ? storySiteName(site) : 'Varga’s launch frame' };
  }
  return null;
}

// Writes the tracker only when its words or rounded distance change.
function storyRenderObjective() {
  const el = $('objective');
  const key = storyObjective();
  const text = key ? storyObjectiveText(key) : '';
  if (text !== story.objectiveText) {
    story.objectiveText = text;
    el.querySelector('.objective-text').textContent = text;
    el.classList.toggle('empty', !text);
  }
  if (key !== story.objectiveKey) {
    // A new objective glows for a moment, except the very first of a run.
    if (story.objectiveKey && key) {
      el.classList.remove('fresh');
      void el.offsetWidth;
      el.classList.add('fresh');
    }
    story.objectiveKey = key;
  }
  const target = key ? objectiveTarget() : null;
  const d = target ? Math.hypot(target.x - player.pos.x, target.z - player.pos.z) : 0;
  let dist = '';
  if (target && d > 15) dist = d >= 995 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d / 10) * 10} m`;
  if (dist !== story.objectiveDist) {
    story.objectiveDist = dist;
    el.querySelector('.objective-dist').textContent = dist;
  }
}

/* ---------- Responding to the game ---------- */
function storySiteFound(site) {
  const lore = LORE.sites[site.id] || {};
  const name = storySiteName(site);
  if (site.major) {
    const n = majorSitesFound();
    stats.sites = n;
    showBanner(lore.kicker, name, story.flags.knowsVarga ? `${n} of 10 sites · look for her red flag` : `${n} of 10 sites found`);
    if (lore.intro) storySay(lore.intro);
    const milestone = { 1: 'firstSite', 3: 'threeSites', 6: 'sixSites', 10: 'allSites' }[n];
    if (milestone) sayLine(milestone);
  } else {
    const parts = story.parts.size;
    showBanner(lore.kicker, name, parts >= STORY.partTotal ? 'Varga’s launch frame' : `Varga’s launch frame · ${parts}/${STORY.partTotal} parts`);
    // Once she knows what Varga meant to do here, she says so; otherwise just what she sees.
    if (site.id === 'breath' && story.flags.knowsVarga) sayLine('breath');
    else if (lore.intro) storySay(lore.intro);
  }
}

function storyPickup(id, n = 1) {
  if (id === 'bag' || id === 'map') {
    story.flags.bag = true;
    sayLine('bag');
  } else if (id.startsWith('part:')) {
    story.parts.add(id.slice(5));
    stats.parts = story.parts.size;
    story.flags.knowsVarga = true;
    if (story.parts.size === 1) sayLine('firstPart');
    if (story.parts.size === STORY.partTotal) sayLine('allParts');
  } else if (id === 'shard') {
    stats.shards += n;
  } else if (id === 'rabbit_cooked' || id === 'wolf_cooked') {
    sayLine('firstCook');
  }
}

function storyListen() {
  if (story.listening) return;
  story.listening = true;
  onGame('runStart', () => {
    // After her first shiver of a line, unless she's already found the bag.
    storyLater(4, () => { if (!story.flags.bag) sayLine('start'); });
  });
  onGame('revived', () => sayLine('revived'));
  onGame('campfire', (fire) => {
    if (story.flags.fire) return;
    story.flags.fire = true;
    // A fire by the sleeping Teto gets a line of its own (crimson.js).
    const byCrimson = typeof crimson !== 'undefined' && crimson.phase === 'asleep'
      && Math.hypot(fire.x - survivor.x, fire.z - survivor.z) < 7;
    if (!byCrimson) sayLine('firstFire');
  });
  onGame('treeFelled', () => { stats.trees++; });
  onGame('axe', () => sayLine('axe'));
  onGame('pickup', storyPickup);
  onGame('siteDiscovered', storySiteFound);
  onGame('lookoutClimbed', () => {
    story.flags.lookout = true;
    sayLine('lookoutTop');
  });
  onGame('creatureKilled', (kind) => {
    if (kind === 'rabbit') { stats.rabbits++; sayLine('firstRabbit'); }
    if (kind === 'wolf') { stats.wolves++; sayLine('firstWolfKill'); }
  });
  onGame('katanaObtained', () => storyLater(5, () => sayLine('katana')));
  onGame('crimsonGone', () => { story.flags.crimsonGone = true; });
  // Coming back to find her seat empty.
  onGame('crimsonNoticed', () => storyLater(4.5, () => sayLine('crimsonAfter')));
  // The balloon's own scenes caption 'assemble' and 'launch'.
  onGame('balloonAssembled', () => { story.flags.assembled = true; });
  onGame('escaped', () => { story.flags.escaped = true; });
}

// Things she notices just by being somewhere, checked twice a second.
function storyNotice() {
  if (survival.planks > 0 && !story.flags.fire) sayLine('firstPlank');
  if (typeof crimson !== 'undefined' && crimson.phase === 'asleep' && wreck.burning
    && Math.hypot(survivor.x - player.pos.x, survivor.z - player.pos.z) < STORY.crimsonSight) sayLine('crimsonCheck');
  const lookout = siteById('lookout');
  if (lookout && !lookout.discovered && Math.hypot(lookout.x - player.pos.x, lookout.z - player.pos.z) < STORY.lookoutSight) sayLine('lookout');
  // At Varga's launch frame without everything it needs.
  const breath = siteById('breath');
  story.needT -= 0.5;
  if (breath && !story.flags.assembled && story.needT <= 0) {
    const at = breath.launch || { x: 0, z: 0 };
    const near = Math.hypot(breath.x + at.x - player.pos.x, breath.z + at.z - player.pos.z) < STORY.frameRange;
    if (near && (story.parts.size < STORY.partTotal || survival.planks < STORY.planksNeeded)) {
      sayLine('assembleNeed');
      story.needT = STORY.needCooldown;
    }
  }
}

/* ---------- Each frame ---------- */
function updateStory(dt) {
  stats.time += dt;
  // Distance walked; a jump (waking by a fire, a teleport) doesn't count.
  const step = Math.hypot(player.pos.x - story.last.x, player.pos.z - story.last.z);
  if (step < 20) stats.distance += step;
  story.last.x = player.pos.x;
  story.last.z = player.pos.z;

  for (let i = story.timers.length - 1; i >= 0; i--) {
    const timer = story.timers[i];
    timer.t -= dt;
    if (timer.t <= 0) { story.timers.splice(i, 1); timer.fn(); }
  }
  story.checkT -= dt;
  if (story.checkT <= 0) {
    story.checkT = 0.5;
    storyNotice();
  }
  storyRenderObjective();
}

/* ---------- A new run ---------- */
function resetStory() {
  for (const key in stats) stats[key] = 0;
  notesRead.clear();
  story.said.clear();
  story.saidAt = {};
  story.parts.clear();
  story.flags = {};
  story.timers.length = 0;
  story.checkT = 0;
  story.needT = 0;
  story.last.x = LANDMARKS.start.x;
  story.last.z = LANDMARKS.start.z;
  story.objectiveKey = story.objectiveText = story.objectiveDist = null;
  story.reader.id = null;
  if ($('objective').querySelector('.objective-text')) {
    $('objective').querySelector('.objective-text').textContent = '';
    $('objective').querySelector('.objective-dist').textContent = '';
    $('objective').classList.add('empty');
  }
  $('reader').classList.add('hidden');
  hideBanner();
}

function initStory() {
  const objective = $('objective');
  objective.innerHTML = '<span class="objective-kicker">Objective</span><span class="objective-text"></span><span class="objective-dist"></span>';
  objective.classList.add('empty');
  $('reader').addEventListener('click', () => storyCloseReader());
  storyListen();
}
