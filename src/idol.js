// Part two: from a girl washed up on a beach to the Tokyo Dome.
//
// She comes down out of the sky with nothing: no money, no name, no idea where she is. An old
// fisherman tells her it's Tokyo. A busker in the station square lets her sing. A woman who
// runs a capsule hotel gives her a bed for finding her cat. The neighbourhood starts to know
// her face. Then a scout from a small agency hears her sing, there's an audition, and three
// girls who need a fourth: together they become a group. Small stages, then bigger ones. And
// on every screen in the city, another rookie climbing just as fast: Teto. The same Teto. The
// two of them are heading for the same night, the same stage, in front of fifty thousand
// people. This is the road there.

const FAME = {
  levels: [0, 100, 300, 700, 1400, 2600, 4500, 7500, 12000],
  titles: ['Nobody', 'Street Singer', 'Local Face', 'Rising Busker', 'Indie Idol', 'Idol', 'Popular Idol', 'Star', 'Superstar'],
  buskPerDay: 3,
};

// The stages, smallest first. `level` is the fame level she needs; `cap` how many come.
const VENUES = {
  echo: { name: 'Basement Echo', kind: 'Live house', cap: 80, level: 3, fame: 230, song: 'snowdrop', difficulty: 0.35, door: { x: 60, z: 6 }, open: [17, 23.5], style: 'club' },
  loft: { name: 'Shimokita Loft', kind: 'Live house', cap: 150, level: 4, fame: 400, song: 'sakura', difficulty: 0.45, door: { x: -66, z: 72 }, open: [17, 23.5], style: 'club' },
  rooftop: { name: 'Harbor Rooftop Stage', kind: 'Rooftop', cap: 320, level: 5, fame: 680, song: 'paperplane', difficulty: 0.5, door: { x: 96, z: -104 }, open: [16, 22], style: 'roof' },
  mall: { name: 'Sunshine Mall Stage', kind: 'Mall event', cap: 800, level: 5, fame: 920, song: 'sakura', difficulty: 0.55, door: { x: 2, z: 94 }, open: [11, 20], style: 'hall' },
  tv: { name: 'Prime Beat (TV)', kind: 'Live TV', cap: 400, level: 6, fame: 1500, song: 'runway', difficulty: 0.6, door: { x: 64, z: -38 }, open: [18, 23], style: 'studio', once: true },
  fest: { name: 'Harbor Summer Fest', kind: 'Festival', cap: 3000, level: 7, fame: 2600, song: 'runway', difficulty: 0.65, door: { x: 70, z: -140 }, open: [18, 23.5], style: 'fest' },
  arena: { name: 'Ocean Arena', kind: 'Arena', cap: 10000, level: 8, fame: 3900, song: 'runway', difficulty: 0.72, door: { x: 118, z: 40 }, open: [17, 23], style: 'arena' },
};

const idol = {
  fame: 0, yen: 0, chapter: 'arrival', flags: {}, groupName: 'SNOWDROP', gigs: {}, gigDay: {}, buskDay: 0, buskCount: 0,
  items: {}, objective: '', logOpen: false, setUp: false, announced: 0,
};

function fameLevel(f = idol.fame) { let l = 0; FAME.levels.forEach((t, i) => { if (f >= t) l = i; }); return l; }

/* ---------- Fame ---------- */
function addFame(n, why = '') {
  const before = fameLevel();
  idol.fame += Math.round(n);
  const after = fameLevel();
  renderFame();
  floatFame(`+${Math.round(n)} fame${why ? ' · ' + why : ''}`);
  if (after > before) {
    Sfx.fameChime();
    setTimeout(() => { showLevelUp(after); }, 900);
  }
}

function addYen(n) { idol.yen += n; renderFame(); }

function renderFame() {
  const el = $('fame');
  if (!el) return;
  const l = fameLevel(), lo = FAME.levels[l], hi = FAME.levels[l + 1];
  el.querySelector('.fame-level').textContent = `Lv ${l + 1}`;
  el.querySelector('.fame-title').textContent = FAME.titles[l];
  el.querySelector('.fame-bar i').style.width = hi ? `${((idol.fame - lo) / (hi - lo)) * 100}%` : '100%';
  el.querySelector('.fame-num').textContent = `${idol.fame.toLocaleString()} fame · ¥${idol.yen.toLocaleString()}`;
}

function floatFame(text) {
  const el = document.createElement('div');
  el.className = 'fame-float';
  el.textContent = text;
  $('hud').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function showLevelUp(l) {
  const el = $('levelup');
  el.innerHTML = `<span>Fame level ${l + 1}</span><b>${FAME.titles[l]}</b><em>${LEVEL_LINES[l] || ''}</em>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4200);
}

const LEVEL_LINES = [
  '', 'People on the square have started humming her song.', 'The shopkeepers wave when she walks by.',
  'Someone filmed her busking. It has ten thousand views.', 'Small stages. Big dreams.', 'Her face is on a poster in the station.',
  'Strangers ask for her autograph.', 'Her single is in the charts. So is Teto\'s.', 'Everyone in Tokyo knows her name.',
];

/* ---------- The people ---------- */
const LOOKS = {
  gen: { skin: 0xd9a882, hair: 0xd8d8d8, top: 0x3a4a5a, legs: 0x2a2a30, scale: 0.96 },
  haru: { skin: 0xf2d2b8, hair: 0x3b2a1e, top: 0x8a5a3a, legs: 0x22242c, scale: 1.04 },
  ishida: { skin: 0xf5dcc8, hair: 0x6a6a72, top: 0x8a2a5a, legs: 0x3a3e4a, scale: 0.92 },
  taisho: { skin: 0xe8c09e, hair: 0x14141a, top: 0xf0f0f0, legs: 0x22242c, scale: 1.02 },
  kenta: { skin: 0xf2d2b8, hair: 0x1a1412, top: 0xd8a03a, legs: 0x1a2a4a, scale: 0.62 },
  sakura: { skin: 0xf5dcc8, hair: 0x7a5030, top: 0xf5b8cf, legs: 0xe8e2d6, scale: 0.95 },
  tourist: { skin: 0xf5dcc8, hair: 0xd8b878, top: 0x4a8ab8, legs: 0x8a8a92, scale: 1.05 },
  kanade: { skin: 0xf2d2b8, hair: 0x14141a, top: 0x22242a, legs: 0x22242a, scale: 0.98 },
  hoshino: { skin: 0xe8c09e, hair: 0x5a5a5a, top: 0x1a2030, legs: 0x1a2030, scale: 1.06 },
  aoi: { skin: 0xf5dcc8, hair: 0x1d2a5a, top: 0xffffff, legs: 0x39d5c8, scale: 0.97 },
  kotone: { skin: 0xf5dcc8, hair: 0xff8ab8, top: 0x39d5c8, legs: 0xffffff, scale: 0.93 },
  mirai: { skin: 0xf2d2b8, hair: 0xffa030, top: 0xffffff, legs: 0x5a7ab8, scale: 0.95 },
  rina: { skin: 0xe8c09e, hair: 0xb47aff, top: 0x2a2a3a, legs: 0x22242c, scale: 0.97 },
  sato: { skin: 0xf2d2b8, hair: 0x14141a, top: 0x2b3a5a, legs: 0x2b3a5a, scale: 1.02 },
  kimura: { skin: 0xf5dcc8, hair: 0x8a8a92, top: 0x6a4a8a, legs: 0x3a3e4a, scale: 0.9 },
  yuto: { skin: 0xf2d2b8, hair: 0x1a1412, top: 0x1a1a1a, legs: 0x1a1a1a, scale: 0.98 },
};

const N = (id) => city.named[id];
const has = (f) => !!idol.flags[f];
const flag = (f, v = true) => { idol.flags[f] = v; };
const night = () => { const h = dayNight.hour(); return h >= 17 || h < 2; };
const G = () => idol.groupName;

// Everyone the story needs, placed in the city.
function idolSetup() {
  if (idol.setUp) { refreshIdolWorld(); return; }
  idol.setUp = true;
  const npc = (id, name, x, z, yaw, talkFn) => cityNpc(id, { name, x, z, yaw, look: LOOKS[id], talk: talkFn });
  npc('gen', 'Old Gen', -24, -146, Math.PI * 0.8, talkGen);
  npc('haru', 'Haru', 8, -18, Math.PI, talkHaru);
  npc('ishida', 'Mrs. Ishida', -50, -52, Math.PI, talkIshida);
  npc('taisho', 'Taisho', -63.5, 12, Math.PI / 2, talkTaisho);
  npc('kenta', 'Kenta', 6, -34, 0.6, talkKenta);
  npc('sakura', 'Sakura', -56.5, 58, -Math.PI / 2, talkSakura);
  npc('tourist', 'Tourist', 22, -128, Math.PI, talkTourist);
  npc('sato', 'Mr. Sato', 64, -58, Math.PI, talkSato);
  npc('kimura', 'Mrs. Kimura', -94, 54, Math.PI / 2, talkKimura);
  npc('yuto', 'Yuto', 30, 96, Math.PI, talkYuto);
  npc('kanade', 'Kanade', 14, -22, Math.PI, talkKanade);
  npc('hoshino', 'President Hoshino', 62, -40, Math.PI, talkHoshino);
  npc('aoi', 'Aoi', 58, -41, Math.PI, talkAoi);
  npc('kotone', 'Kotone', 66, -41, Math.PI, talkKotone);
  npc('mirai', 'Mirai', 70, -40, Math.PI, talkMirai);
  npc('rina', 'DJ Rina', 26, -42, -Math.PI / 2, talkRina);
  // The lost cat, and the other things to find.
  idol.cat = buildCat();
  idol.cat.position.set(92, 0, 74);
  city.group.add(idol.cat);
  // The places.
  citySpot({ x: 2, z: -22, r: 3, label: () => buskLabel(), use: busk, active: () => has('metHaru') });
  citySpot({ x: -46, z: -58, r: 2.2, label: () => 'Press E to rest in your capsule', use: restMenu, active: () => has('room') && !has('apartment') });
  citySpot({ x: 72, z: -58, r: 2.2, label: () => 'Press E to rest in your apartment', use: restMenu, active: () => has('apartment') });
  citySpot({ x: 64, z: -36, r: 2.6, label: () => 'Starlight Production', use: () => talkHoshino(N('hoshino')), active: () => has('scouted') && !N('hoshino').hidden });
  for (const [id, v] of Object.entries(VENUES)) citySpot({ x: v.door.x, z: v.door.z, r: 3, label: () => venueLabel(id), use: () => tryGig(id), active: () => has('joined') && id !== 'tv' });
  citySpot({ x: VENUES.tv.door.x, z: VENUES.tv.door.z - 4, r: 3, label: () => venueLabel('tv'), use: () => tryGig('tv'), active: () => has('tvBooked') && !idol.gigs.tv });
  citySpot({ x: -2, z: -6, r: 3, label: () => 'Press E to take the train to the Tokyo Dome', use: goToDome, active: () => has('domeReady') });
  for (const f of FINDS) citySpot({ x: f.x, z: f.z, r: 1.8, label: () => f.label, use: () => takeFind(f), active: () => f.active() && !idol.items[f.id] });
  buildPosters();
  refreshIdolWorld();
}

// Who's where depends on how far the story's got.
function refreshIdolWorld() {
  const after = (f) => has(f);
  hideNpc('kanade', !(has('scoutSoon') && !has('scouted')) && !(has('joined') && !has('domeReady')));
  if (has('joined')) moveNpc('kanade', 60, -44, Math.PI);
  hideNpc('hoshino', !after('scouted'));
  for (const m of ['aoi', 'kotone', 'mirai']) hideNpc(m, !after('auditioned'));
  // Once she's with the group, the girls hang about the city when they're not at the office.
  if (has('joined')) { moveNpc('aoi', -8, 60, 0); moveNpc('kotone', -56, 20, 0); moveNpc('mirai', 30, -110, Math.PI); }
  hideNpc('rina', !has('joined'));
  hideNpc('kenta', has('kentaDone') && fameLevel() > 4);
  if (idol.cat) idol.cat.visible = has('catQuest') && !has('catFound');
  if (city.posters) for (const p of city.posters) p.visible = fameLevel() >= 4 || has('sawTeto');
}

// Does someone have something new to say? (Their star shows.)
function idolHasNews(id) {
  const q = {
    gen: !has('metGen') || (!idol.flags.genSong && fameLevel() >= 2) || (has('domeAnnounced') && !has('genPin')) || (idol.flags.genSong === 'ask' && fameLevel() >= 2 && !has('genSongDone')),
    haru: !has('metHaru') || (has('domeAnnounced') && !has('haruFarewell')),
    ishida: has('metHaru') && !has('room') && (!has('catQuest') || has('catFound')),
    taisho: fameLevel() >= 1 && (idol.flags.ramen === undefined || (idol.flags.ramen === 3 && !has('ramenDone'))),
    kenta: fameLevel() >= 1 && !has('kentaDone'),
    sakura: fameLevel() >= 1 && !has('flowersDone') && (!has('flowers') || flowersHeld() >= 4),
    tourist: fameLevel() >= 1 && !has('photoDone'),
    sato: idol.flags.ramen !== undefined && !has('ramenSato'), kimura: idol.flags.ramen !== undefined && !has('ramenKimura'), yuto: idol.flags.ramen !== undefined && !has('ramenYuto'),
    kanade: has('scoutSoon') && !has('scouted'),
    hoshino: (has('scouted') && !has('joined')) || (fameLevel() >= 5 && !has('tvBooked')) || (fameLevel() >= 8 && idol.gigs.arena && !has('domeAnnounced')) || (has('domeAnnounced') && prepDone() && !has('domeReady')),
    aoi: has('joined') && (!has('aoiDone') || (has('domeAnnounced') && !has('aoiHeart'))),
    kotone: has('joined') && (!has('charmDone') || (has('domeAnnounced') && !has('kotoneHeart'))),
    mirai: has('joined') && (!has('lyricsDone') || (has('domeAnnounced') && !has('miraiHeart'))),
    rina: has('joined') && fameLevel() >= 5 && !has('radioDone'),
  };
  return !!q[id];
}

/* ---------- Conversations ---------- */
function talkGen(n) {
  if (!has('metGen')) {
    talk([
      ['Old Gen', 'Well now. Forty years I\'ve fished this bay and I\'ve never seen a balloon come down out of the clouds. You hurt, girl?'],
      ['Miku', 'I... don\'t think so. Where am I?'],
      ['Old Gen', 'Where? You\'re in Tokyo. The whole of it, right up there past the sea wall. Ten million people and every one of them in a hurry.'],
      ['(Miku)', 'Tokyo. I made it out of the crater, over the mountains, across the sea... and I don\'t have a single yen.'],
      ['Old Gen', 'Here. It isn\'t much. Get yourself something warm. Go on up into the city, the station square\'s straight ahead. Somebody there will point you right.'],
    ], { with: 'gen', then: () => { flag('metGen'); addYen(500); addFame(5, 'met Old Gen'); setObjective(); } });
    return;
  }
  if (has('domeAnnounced') && !has('genPin')) {
    talk([
      ['Old Gen', 'The Dome, they\'re saying on the radio. The girl from the balloon, in the Tokyo Dome. I nearly dropped my rod in the water.'],
      ['Miku', 'I keep thinking about the day I came down here. I had nothing.'],
      ['Old Gen', 'You had nerve. That\'s more than most.'],
      ['Old Gen', 'Here. My wife made this, years back. A little silver snowdrop. She said they\'re the first flowers up through the snow, before anything else dares.'],
      ['Old Gen', 'Wear it on the big night. I\'ll be watching on the telly in the bait shop.'],
    ], { with: 'gen', then: () => { flag('genPin'); addFame(60, 'a gift from Gen'); setObjective(); } });
    return;
  }
  if (!has('genSong') && fameLevel() >= 2) {
    talk([
      ['Old Gen', 'They say you sing up in the square now. Would you sing one down here for an old man? There\'s an old sea song my mother used to sing. I\'d hum it, you\'d make it pretty.'],
    ], { with: 'gen', choices: [
      { text: 'Sing for him', then: () => { flag('genSong', 'ask'); startBusk({ where: 'beach', song: 'paperplane', difficulty: 0.25, fame: 90, crowd: 10, title: 'For Old Gen', after: () => { flag('genSongDone'); talk([['Old Gen', 'That\'s the one. Just like her. Thank you, girl.']], { with: 'gen' }); } }); } },
      { text: 'Another time', then: () => flag('genSong', 'ask') },
    ] });
    return;
  }
  if (idol.flags.genSong === 'ask' && !has('genSongDone')) {
    talk([['Old Gen', 'Whenever you\'re ready. The sea\'s not going anywhere.']], { with: 'gen', choices: [
      { text: 'Sing for him', then: () => startBusk({ where: 'beach', song: 'paperplane', difficulty: 0.25, fame: 90, crowd: 10, title: 'For Old Gen', after: () => { flag('genSongDone'); talk([['Old Gen', 'That\'s the one. Just like her. Thank you, girl.']], { with: 'gen' }); } }) },
      { text: 'Not yet', then: null },
    ] });
    return;
  }
  const lines = [
    'The fish don\'t bite when the city\'s this loud. They\'re all listening to you, I reckon.',
    'Your balloon\'s still on my beach. I put a tarp over it. Seemed wrong to let it rot.',
    'Keep your chin up. The sea always brings in something new.',
  ];
  talk([['Old Gen', lines[Math.floor(game.time / 20) % lines.length]]], { with: 'gen' });
}

function talkHaru(n) {
  if (!has('metHaru')) {
    talk([
      ['Haru', 'Hey, you, the girl staring at my guitar case like it owes you money. You lost?'],
      ['Miku', 'A little. Sorry. I just... I used to sing. Before.'],
      ['Haru', 'Before what?'],
      ['(Miku)', 'Before the snow. Before the crater, and Teto, and all of it.'],
      ['Miku', 'Before everything got complicated.'],
      ['Haru', 'Well, nothing\'s complicated about this. I play, you sing, the people with somewhere to be slow down for one minute. Want to try?'],
    ], { with: 'haru', choices: [
      { text: 'Sing with Haru', then: () => startBusk({ first: true, song: 'snowdrop', difficulty: 0.15, fame: 80, crowd: 14, title: 'With Haru', after: haruAfterFirst }) },
      { text: 'Maybe later', then: () => talk([['Haru', 'Suit yourself. I\'m here every day. The square doesn\'t close.']], { with: 'haru' }) },
    ] });
    return;
  }
  if (has('domeAnnounced') && !has('haruFarewell')) {
    talk([
      ['Haru', 'So. The Tokyo Dome.'],
      ['Miku', 'You heard.'],
      ['Haru', 'The whole square heard. There\'s a poster of you behind me. I\'ve been playing under my own busking partner\'s poster for a week. Do you know how that feels?'],
      ['Miku', 'Haru...'],
      ['Haru', 'It feels great. Go knock them dead. And when they ask where you started, you tell them: a guy with a three-chord guitar and a hat with forty yen in it.'],
      ['Haru', 'One more time? For old times\' sake?'],
    ], { with: 'haru', choices: [
      { text: 'Sing one more time', then: () => startBusk({ song: 'snowdrop', difficulty: 0.3, fame: 150, crowd: 40, title: 'One more time, with Haru', after: () => { flag('haruFarewell'); setObjective(); } }) },
    ] });
    return;
  }
  const lines = has('joined') ? [
    `Big star now, huh? ${G()}. I like it. You still owe me forty yen.`,
    'You can still busk here whenever you want. The square remembers you.',
    'Saw your face on the big screen. Weird. Good weird.',
  ] : [
    'The square\'s yours any evening. Busk here and people will learn your songs.',
    'Three songs a night is plenty. Leave them wanting more.',
    'Somewhere to sleep? Mrs. Ishida runs the capsule hotel by the arcade. She\'s nicer than she looks.',
  ];
  talk([['Haru', lines[Math.floor(game.time / 15) % lines.length]]], { with: 'haru' });
}

function haruAfterFirst(res) {
  flag('metHaru');
  talk([
    ['Haru', 'Okay. Okay okay okay. Where did THAT come from?'],
    ['Miku', 'Was it... alright?'],
    ['Haru', 'Look around you! They stopped. Nobody stops in Tokyo. I\'m Haru, by the way.'],
    ['Miku', 'Miku.'],
    ['Haru', 'Well, Miku, come back here any evening and sing. Three times a night, tops. And find yourself a bed, you look like you slept in a snowdrift.'],
    ['Miku', '...You have no idea.'],
    ['Haru', 'Mrs. Ishida\'s capsule hotel, by the shopping arcade. Tell her I sent you. Don\'t tell her I still owe her rent.'],
  ], { with: 'haru', then: setObjective });
  void res;
}

function talkIshida(n) {
  if (!has('metHaru')) { talk([['Mrs. Ishida', 'Rooms are four thousand yen a night. Cash. No pets, no parties, no musicians.']], { with: 'ishida' }); return; }
  if (!has('catQuest')) {
    talk([
      ['Mrs. Ishida', 'Haru sent you? Then you can\'t pay either. Wonderful.'],
      ['Mrs. Ishida', 'I\'m sorry, dear. I\'m not myself. Mochi, my cat, she got out last night and she hasn\'t come home. White, fat, a grey patch on one ear. She hides when she\'s frightened.'],
      ['Miku', 'I\'ll look for her.'],
      ['Mrs. Ishida', 'You would? ...Bring her home, and the capsule\'s yours for as long as you need it. Try the alleys behind the big blocks. She likes the warm air from the vents.'],
    ], { with: 'ishida', then: () => { flag('catQuest'); refreshIdolWorld(); setObjective(); } });
    return;
  }
  if (has('catFound') && !has('room')) {
    talk([
      ['Mrs. Ishida', 'Mochi! Oh, you silly, silly girl. Where were you?'],
      ['Miku', 'Behind the arcade, curled up on a warm vent, glaring at a pigeon.'],
      ['Mrs. Ishida', 'That\'s my girl. And you. Capsule eleven, top row. It\'s yours. Free. Don\'t argue.'],
      ['Mrs. Ishida', 'Sleep there when you need to, and come and go as you like. Rest there until the evening, too, if you want the square at its busiest.'],
    ], { with: 'ishida', then: () => { flag('room'); addFame(60, 'found Mochi'); addYen(1000); setObjective(); } });
    return;
  }
  if (!has('catFound')) { talk([['Mrs. Ishida', 'Any sign of Mochi? The alleys, dear. Behind the big blocks, where the vents blow warm.']], { with: 'ishida' }); return; }
  const lines = has('joined') ? ['You\'ve got an apartment from the agency now, they tell me. Capsule eleven misses you. So does Mochi.', 'I put your poster up in the lobby. Don\'t let it go to your head.'] : ['Capsule eleven is made up. Sleep well, dear.', 'Mochi\'s forgiven you for carrying her. Mostly.'];
  talk([['Mrs. Ishida', lines[Math.floor(game.time / 15) % lines.length]]], { with: 'ishida' });
}

function talkTaisho(n) {
  if (fameLevel() < 1) { talk([['Taisho', 'Ramen\'s eight hundred yen. Sit down or move along, I\'ve got noodles boiling.']], { with: 'taisho' }); return; }
  if (idol.flags.ramen === undefined) {
    talk([
      ['Taisho', 'You\'re the girl who sings in the square! My delivery boy quit this morning. Quit! On a Tuesday!'],
      ['Taisho', 'Three bowls. Mr. Sato in the office block east of the square, Mrs. Kimura out on the west side, and a student called Yuto up north by the mall. Hot, mind. Don\'t dawdle.'],
    ], { with: 'taisho', choices: [
      { text: 'Deliver the ramen', then: () => { flag('ramen', 0); toast('Three bowls of ramen to deliver'); setObjective(); } },
      { text: 'Not right now', then: null },
    ] });
    return;
  }
  if (idol.flags.ramen === 3 && !has('ramenDone')) {
    talk([
      ['Taisho', 'All three? Still hot? Kid, you\'re hired. No, wait, you\'re a singer. Fine. Eat something, on the house.'],
      ['Miku', 'Thank you, Taisho!'],
      ['Taisho', 'And tell people to come to my shop when you get famous. Taisho\'s. Best broth in the ward.'],
    ], { with: 'taisho', then: () => { flag('ramenDone'); addFame(110, 'ramen delivered'); addYen(3000); setObjective(); } });
    return;
  }
  const lines = has('ramenDone') ? ['Best broth in the ward. Tell your fans.', `I put a sign up. "${G()} ate here." Business has doubled.`] : ['Still hot? Go go go!'];
  talk([['Taisho', lines[Math.floor(game.time / 15) % lines.length]]], { with: 'taisho' });
}

function deliver(who, label) {
  if (idol.flags.ramen === undefined || has(`ramen${label}`)) return false;
  flag(`ramen${label}`);
  idol.flags.ramen = (idol.flags.ramen || 0) + 1;
  addFame(15, 'delivery');
  toast(`Ramen delivered (${idol.flags.ramen}/3)`);
  setObjective();
  return true;
}
function talkSato(n) {
  if (idol.flags.ramen !== undefined && !has('ramenSato')) { talk([['Mr. Sato', 'Ramen? From Taisho\'s? You beautiful person. I\'ve been in meetings since six.'], ['Mr. Sato', 'Wait. Aren\'t you the singer from the square? My daughter showed me the video.']], { with: 'sato', then: () => deliver('sato', 'Sato') }); return; }
  talk([['Mr. Sato', has('joined') ? `My daughter has ${G()} posters on her ceiling. I\'m told this is normal.` : 'Back to the spreadsheets. Such is life.']], { with: 'sato' });
}
function talkKimura(n) {
  if (idol.flags.ramen !== undefined && !has('ramenKimura')) { talk([['Mrs. Kimura', 'Oh, the ramen. How kind of you to bring it all this way, dear. My knees aren\'t what they were.'], ['Mrs. Kimura', 'You have a lovely voice, you know. I heard you on my walk.']], { with: 'kimura', then: () => deliver('kimura', 'Kimura') }); return; }
  talk([['Mrs. Kimura', 'The pigeons and I have heard you singing. We approve.']], { with: 'kimura' });
}
function talkYuto(n) {
  if (idol.flags.ramen !== undefined && !has('ramenYuto')) { talk([['Yuto', 'Finally! Exam fuel! I owe you one. Hey, if you ever need someone to film you busking, I\'ve got a good camera.'], ['Miku', 'Maybe I will.']], { with: 'yuto', then: () => { deliver('yuto', 'Yuto'); } }); return; }
  talk([['Yuto', has('joined') ? 'Your busking video hit a million. I put it up. You\'re welcome!' : 'Exams in three days. Send help. Or ramen.']], { with: 'yuto' });
}

function talkKenta(n) {
  if (fameLevel() < 1) { talk([['Kenta', '...']], { with: 'kenta' }); return; }
  if (!has('kite')) {
    talk([
      ['Kenta', 'Big sister, my kite! The wind took it right out of my hands, it\'s stuck in a cherry tree by the beach. Mum\'s going to kill me.'],
      ['Miku', 'Which tree?'],
      ['Kenta', 'One of the pink ones on the promenade. It\'s got a red tail. Please?'],
    ], { with: 'kenta', then: () => { flag('kite'); setObjective(); } });
    return;
  }
  if (idol.items.kite && !has('kentaDone')) {
    talk([['Kenta', 'My kite! You got it! You\'re the best, big sister. When I grow up I\'m going to be your manager.'], ['Miku', 'Deal.']], { with: 'kenta', then: () => { flag('kentaDone'); addFame(70, 'Kenta\'s kite'); setObjective(); } });
    return;
  }
  talk([['Kenta', has('kentaDone') ? 'I\'m practising managing. Rule one: snacks.' : 'The pink trees by the beach! Red tail!']], { with: 'kenta' });
}

function talkSakura(n) {
  if (fameLevel() < 1) { talk([['Sakura', 'Flowers for someone special?']], { with: 'sakura' }); return; }
  if (!has('flowers')) {
    talk([
      ['Sakura', 'You\'re the singer! I need a favour. My bouquets for the wedding fair came off the delivery bike all over the neighbourhood. Four of them. Could you find them? They\'ll be wrapped in blue paper.'],
    ], { with: 'sakura', choices: [{ text: 'I\'ll find them', then: () => { flag('flowers'); setObjective(); } }, { text: 'Sorry, not now', then: null }] });
    return;
  }
  if (flowersHeld() >= 4 && !has('flowersDone')) {
    talk([['Sakura', 'All four! And not a petal bent. Take this one, a snowdrop. They\'re my favourite. Brave little things, flowering in the cold.'], ['(Miku)', 'Flowering in the cold. Yeah.']], { with: 'sakura', then: () => { flag('flowersDone'); addFame(90, 'Sakura\'s bouquets'); addYen(2000); setObjective(); } });
    return;
  }
  talk([['Sakura', has('flowersDone') ? 'Snowdrops sell out every time you\'re on the radio now. Funny, that.' : `Four bouquets in blue paper. You have ${flowersHeld()}.`]], { with: 'sakura' });
}

function talkTourist(n) {
  if (fameLevel() < 1) { talk([['Tourist', 'Excuse me, is this the beach from the travel guide?']], { with: 'tourist' }); return; }
  if (!has('photoDone')) {
    talk([
      ['Tourist', 'Hi! Sorry! Would you take our photo? With the sea behind? We\'re on our honeymoon and every picture is of my thumb.'],
      ['Miku', 'Of course. Say cheese!'],
    ], { with: 'tourist', then: () => { impact('white', 90); Sfx.pickup(); setTimeout(() => talk([['Tourist', 'Perfect! Wait. Aren\'t you that girl from the square video? Can we get one WITH you?'], ['Miku', '...Sure!']], { with: 'tourist', then: () => { flag('photoDone'); addFame(60, 'a photo with fans'); setObjective(); } }), 400); } });
    return;
  }
  talk([['Tourist', 'We printed the photo. It\'s on our fridge. You\'re on our fridge!']], { with: 'tourist' });
}

/* ---------- The agency ---------- */
function talkKanade(n) {
  if (has('scoutSoon') && !has('scouted')) {
    talk([
      ['Kanade', 'Excuse me. I\'ve been standing at the back of your crowd for three nights. My name is Kanade Aoyama. I scout for Starlight Production.'],
      ['Kanade', 'We\'re small. One building, one president, one group that hasn\'t found its fourth member. But I think you might be her.'],
      ['Miku', 'Me? An idol?'],
      ['Kanade', 'An idol. Come to our office, the tall glass building on the east side of the square, any evening. The president will want to hear you himself.'],
      ['(Miku)', 'A month ago I was digging a fire pit with my hands. Now someone wants to hear me sing.'],
    ], { with: 'kanade', then: () => { flag('scouted'); refreshIdolWorld(); setObjective(); } });
    return;
  }
  const lines = [
    `The schedule's on your phone (J). Every stage you can book, and when the doors open.`,
    'Small stages first. The crowds talk. The crowds always talk.',
    'You\'re doing wonderfully. Drink some water.',
  ];
  if (has('domeAnnounced')) lines.splice(0, 3, 'Fifty thousand seats. I\'ve booked the stylist, the dancers, the pyro. Just bring yourself.');
  talk([['Kanade', lines[Math.floor(game.time / 15) % lines.length]]], { with: 'kanade' });
}

function talkHoshino(n) {
  if (has('scouted') && !has('auditioned')) {
    if (!night()) { talk([['Kanade', 'The president holds auditions in the evening. Come back after five.']], { with: 'kanade' }); return; }
    talk([
      ['President Hoshino', 'So you\'re Kanade\'s busker. Sit. No, stand. Idols stand.'],
      ['President Hoshino', 'I have three girls who work harder than anyone in this city and a hole in the middle of them where a voice should be. One song. Show me.'],
    ], { with: 'hoshino', choices: [
      { text: 'Audition', then: () => startAudition() },
      { text: 'I need a moment', then: () => talk([['President Hoshino', 'Take it. Not too long. Nobody in this business gets too long.']], { with: 'hoshino' }) },
    ] });
    return;
  }
  if (has('auditioned') && !has('joined')) { joinGroupScene(); return; }
  if (fameLevel() >= 5 && !has('tvBooked')) {
    talk([
      ['President Hoshino', 'Prime Beat. Live TV, Friday prime time. They\'ve offered us a slot. Do not fall over on live television.'],
      ['Kanade', 'There\'s another rookie on the bill. Crimson Records\' new girl. The one on all the screens.'],
      ['(Miku)', 'Teto.'],
    ], { with: 'hoshino', then: () => { flag('tvBooked'); setObjective(); } });
    return;
  }
  if (fameLevel() >= 8 && idol.gigs.arena && !has('domeAnnounced')) { domeAnnouncement(); return; }
  if (has('domeAnnounced') && prepDone() && !has('domeReady')) {
    talk([
      ['President Hoshino', 'Everything\'s ready. The stage, the lights, the costumes. Fifty thousand penlights, and they say half of them will be teal.'],
      ['President Hoshino', 'And the other half red.'],
      ['President Hoshino', 'I don\'t know what happened between you and that girl. I don\'t need to. Go up there and sing like it\'s the only song you\'ll ever get.'],
      ['Miku', 'I will.'],
      ['President Hoshino', 'The train leaves from the station square. Kanade will meet you there.'],
    ], { with: 'hoshino', then: () => { flag('domeReady'); setObjective(); } });
    return;
  }
  const lines = ['Fame is a ladder with no top. Keep climbing.', 'Book the stages on your phone. Don\'t make me chase you.', 'I don\'t smile. But if I did.'];
  talk([['President Hoshino', lines[Math.floor(game.time / 15) % lines.length]]], { with: 'hoshino' });
}

function startAudition() {
  startGig({ venue: 'audition', name: 'Starlight Production', kind: 'Audition', cap: 4, song: 'snowdrop', difficulty: 0.35, fame: 120, style: 'studio' }, (res) => {
    if (res.accuracy >= 0.5) {
      flag('auditioned');
      refreshIdolWorld();
      joinGroupScene();
    } else {
      talk([['President Hoshino', 'Nervous. I could hear your knees. Come back tomorrow evening and do it again.']], { with: 'hoshino' });
    }
  });
}

function joinGroupScene() {
  talk([
    ['President Hoshino', 'Hm.'],
    ['Kanade', '...Sir?'],
    ['President Hoshino', 'Get the girls.'],
    ['Aoi', 'So you\'re the voice. I\'m Aoi. I lead, I dance, I count us in. I don\'t do late.'],
    ['Kotone', 'Ignore her, she\'s been nervous all week! I\'m Kotone! I do the high harmonies and the cute bits and the snacks!'],
    ['Mirai', '...M-Mirai. I write the songs. Some of them. I\'m sorry, I\'m bad at this part.'],
    ['Miku', 'I\'m Miku. I came here in a hot-air balloon from a frozen crater on the other side of the mountains.'],
    ['Kotone', '...She\'s funny! I love her!'],
    ['President Hoshino', 'Four of you now. You need a name. You decide. Quickly.'],
  ], { with: 'hoshino', choices: [
    { text: 'SNOWDROP: a flower that blooms through the snow', then: () => namedGroup('SNOWDROP') },
    { text: 'PRISM TIDE: four colours, one wave', then: () => namedGroup('PRISM TIDE') },
    { text: 'STARLIGHT ECHO: for the agency that took a chance', then: () => namedGroup('STARLIGHT ECHO') },
  ] });
}

function namedGroup(name) {
  idol.groupName = name;
  flag('joined');
  flag('apartment');
  addFame(150, `${name} is born`);
  addYen(20000);
  refreshIdolWorld();
  talk([
    ['Aoi', `${name}. ...Yeah. That works.`],
    ['Kanade', 'Welcome to Starlight Production. The agency has a small apartment for you next door. And here, your phone. The schedule\'s in it. Press J any time.'],
    ['Kanade', 'Your first stage is tomorrow night if you want it: Basement Echo, east of the square. Eighty people, if we\'re lucky.'],
    ['(Miku)', 'Eighty people. In the crater I sang to the wind.'],
  ], { with: 'kanade', then: setObjective });
}

function talkAoi(n) {
  if (has('domeAnnounced') && !has('aoiHeart')) {
    talk([
      ['Aoi', 'Can I tell you something? I almost quit. The week before Kanade found you. Three years of training and no voice to lead.'],
      ['Aoi', 'I don\'t say this. So listen. I\'m glad you fell out of the sky.'],
      ['Miku', 'Me too, Aoi.'],
      ['Aoi', 'Now go to sleep. Late is a crime.'],
    ], { with: 'aoi', then: () => { flag('aoiHeart'); addFame(50); setObjective(); } });
    return;
  }
  if (!has('aoiDone')) {
    talk([
      ['Aoi', 'Your footwork is a disaster. Charming, but a disaster. Practise with me. Now. Here.'],
    ], { with: 'aoi', choices: [
      { text: 'Practise with Aoi', then: () => startBusk({ where: 'park', song: 'sakura', difficulty: 0.4, fame: 100, crowd: 18, title: 'Dance practice with Aoi', after: () => { flag('aoiDone'); talk([['Aoi', 'Better. Don\'t smile, it isn\'t that much better.']], { with: 'aoi' }); } }) },
      { text: 'Later', then: null },
    ] });
    return;
  }
  talk([['Aoi', ['Count of eight. Always the count of eight.', 'Water. Stretch. Sleep. That\'s the whole secret.', 'You hit the high note last night. Don\'t let it go to your head.'][Math.floor(game.time / 15) % 3]]], { with: 'aoi' });
}

function talkKotone(n) {
  if (has('domeAnnounced') && !has('kotoneHeart')) {
    talk([
      ['Kotone', 'Miku! When it\'s all over, the Dome, all of it, will we still do this? Eat taiyaki on the bench and talk nonsense?'],
      ['Miku', 'Every week. I promise.'],
      ['Kotone', 'Pinky promise. Ow! You have a STRONG pinky.'],
    ], { with: 'kotone', then: () => { flag('kotoneHeart'); addFame(50); setObjective(); } });
    return;
  }
  if (!has('charm')) {
    talk([
      ['Kotone', 'Miku, Miku, disaster! My lucky charm, the little cat one, it fell off my bag somewhere in the shopping arcade. I can\'t go on stage without it, I\'ll fall over, I\'ll forget everything!'],
    ], { with: 'kotone', then: () => { flag('charm'); setObjective(); } });
    return;
  }
  if (idol.items.charm && !has('charmDone')) {
    talk([['Kotone', 'You found it! You found it!! I\'m never letting go of it again. Or you. Hug!']], { with: 'kotone', then: () => { flag('charmDone'); addFame(80, 'Kotone\'s charm'); setObjective(); } });
    return;
  }
  talk([['Kotone', ['Snacks backstage! I brought melon pan!', 'Did you see the comments? They think you\'re mysterious. You ARE mysterious.', 'Aoi smiled yesterday. I have witnesses.'][Math.floor(game.time / 15) % 3]]], { with: 'kotone' });
}

function talkMirai(n) {
  if (has('domeAnnounced') && !has('miraiHeart')) {
    talk([
      ['Mirai', 'I finished it. The song for the Dome. It\'s called Crown of Light. It\'s... about you, a little. Someone who kept getting up.'],
      ['Mirai', 'You don\'t have to like it.'],
      ['Miku', 'Mirai. I love it.'],
      ['Mirai', '...Oh. Good. Okay. I\'m going to go and quietly explode now.'],
    ], { with: 'mirai', then: () => { flag('miraiHeart'); addFame(50); setObjective(); } });
    return;
  }
  if (!has('lyrics')) {
    talk([
      ['Mirai', 'Um. I have a melody but no words. Could you... help? You see things differently. You came from somewhere none of us have been.'],
      ['Mirai', 'Go and find three places that feel like something. The sea, maybe. The fountain. The cherry trees. Tell me what they feel like.'],
    ], { with: 'mirai', then: () => { flag('lyrics'); setObjective(); } });
    return;
  }
  if (inspirationHeld() >= 3 && !has('lyricsDone')) {
    talk([
      ['Miku', 'The sea felt like starting over. The fountain felt like everyone passing by at once. The cherry trees felt like... something beautiful that doesn\'t last, so you\'d better look now.'],
      ['Mirai', '...Something beautiful that doesn\'t last, so you\'d better look now.'],
      ['Mirai', 'That\'s the chorus. That\'s the whole chorus. Paper Plane Promise. Thank you, Miku.'],
    ], { with: 'mirai', then: () => { flag('lyricsDone'); addFame(100, 'a new song'); setObjective(); } });
    return;
  }
  talk([['Mirai', has('lyricsDone') ? ['I\'m writing again. Every night. It\'s your fault.', 'Do you think Teto writes her own songs? ...Sorry. I shouldn\'t ask.'][Math.floor(game.time / 15) % 2] : `Three places that feel like something. You\'ve found ${inspirationHeld()}.`]], { with: 'mirai' });
}

function talkRina(n) {
  if (fameLevel() >= 5 && !has('radioDone')) {
    talk([
      ['DJ Rina', 'And we\'re live! Tokyo Nights, I\'m Rina, and with me in the booth: the girl from the balloon herself, the voice of ' + G() + '! Miku, the internet wants to know: where did you really come from?'],
    ], { with: 'rina', choices: [
      { text: '"A frozen crater past the mountains. I flew out in a balloon."', then: () => radioAnswer('truth') },
      { text: '"Somewhere cold. Somewhere I\'d rather not go back to."', then: () => radioAnswer('mystery') },
      { text: '"From the square! Haru found me. Thank you, Haru!"', then: () => radioAnswer('haru') },
    ] });
    return;
  }
  talk([['DJ Rina', 'Tokyo Nights, every night. Your song\'s on heavy rotation, by the way.']], { with: 'rina' });
}

function radioAnswer(kind) {
  const reply = {
    truth: [['DJ Rina', 'A balloon! Out of a crater! Tokyo, I can\'t make this up. Lines are going crazy.'], ['DJ Rina', 'Final question. Teto from Crimson Records said on this show last week that she\'s "known you a long time." Comment?'], ['Miku', '...We\'ve met.']],
    mystery: [['DJ Rina', 'Ooh. Mysterious. They love mysterious. The chat is going wild.'], ['DJ Rina', 'Last question. Teto said she\'s "known you a long time." True?'], ['Miku', 'Ask her what happened in the snow.']],
    haru: [['DJ Rina', 'A shout-out to the busker! That\'s adorable. Haru, wherever you are, call in!'], ['DJ Rina', 'And Teto says she\'s "known you a long time." Any truth to it?'], ['Miku', 'Some.']],
  }[kind];
  talk(reply, { with: 'rina', then: () => { flag('radioDone'); addFame(kind === 'mystery' ? 380 : 320, 'radio interview'); setObjective(); } });
}

/* ---------- Teto ---------- */
// The first time she sees Teto's face on the giant screen.
function sawTetoScene() {
  flag('sawTeto');
  refreshIdolWorld();
  talk([
    ['(Miku)', 'That music. That voice. I know that voice.'],
    ['(Miku)', 'Red drills. That grin.'],
    ['(Miku)', 'Teto. She\'s here. She\'s... an idol? Number one in the whole country?'],
    ['(Miku)', 'The last time I saw her she buried me in the snow and flew away laughing.'],
    ['(Miku)', 'Whatever this is, it isn\'t a coincidence.'],
  ], { then: setObjective });
}

// Backstage at Prime Beat, before they go on.
function tetoBackstage(then) {
  const t = showdownKit && showdownKit.teto;
  talk([
    ['Teto', 'Well, well. If it isn\'t the snowflake. I heard you thawed out.'],
    ['Miku', 'Teto.'],
    ['Teto', 'Look at you. A little group. A little agency. Little songs. It\'s cute. It\'s SO cute.'],
    ['Miku', 'Why are you here? Why any of this?'],
    ['Teto', 'Same reason as you, I imagine. Out there in the snow, you made me curious. Nobody gets up after I put them down. You did.'],
    ['Teto', 'So I came to the big city to see if you\'d get up again.'],
    ['Teto', 'Go on, then. Sing your little song. I\'m on after you. Try not to make it too easy.'],
  ], { then });
  void t;
}

// The night before the Dome: on the beach, by the old balloon, she's there.
function tetoOnTheBeach() {
  flag('tetoBeach');
  talk([
    ['Teto', 'Don\'t scream. I didn\'t come to fight. Not tonight.'],
    ['Miku', 'Teto...'],
    ['Teto', 'This is it? The famous balloon? It\'s smaller than I imagined. You crossed the sea in THIS?'],
    ['Miku', 'You\'d know. You were there when it left.'],
    ['Teto', 'I was. I won, back then. Fair and square. You were in the snow and I was in the sky.'],
    ['Teto', 'And you got up anyway. Built a fire. Patched your silk. Flew away. Every time I think I understand you, you do something stupid and brave.'],
    ['Miku', 'Why the rematch? Why the Dome?'],
    ['Teto', 'Because out there nobody saw. Tomorrow, everyone will. Fifty thousand people, and every one of them will know which of us is the real thing.'],
    ['Teto', 'Sleep well, snowflake. Tomorrow I bury you again. In light, this time.'],
    ['(Miku)', 'Not this time.'],
  ], { then: () => { hideNpc('teto', true); setObjective(); } });
}

function domeAnnouncement() {
  flag('domeAnnounced');
  talk([
    ['President Hoshino', 'Sit down. All of you.'],
    ['President Hoshino', 'The Idol Summit. The biggest night of the year. The Tokyo Dome. Fifty-five thousand seats.'],
    ['President Hoshino', `They want two acts. ${G()}... and Teto.`],
    ['Kotone', 'The DOME?!'],
    ['Aoi', '...Breathe, Kotone.'],
    ['Mirai', 'I\'ll need to write something. Something big.'],
    ['President Hoshino', 'Crimson Records are calling it a battle. Their girl against ours, one stage, one night. Winner takes the crown.'],
    ['(Miku)', 'A rematch. In front of everyone.'],
    ['President Hoshino', 'You have time. Rest. See the people who matter to you. When you\'re ready, come back to me.'],
  ], { with: 'hoshino', then: () => { addFame(300, 'the Idol Summit'); setObjective(); } });
}

function prepDone() { return has('aoiHeart') && has('kotoneHeart') && has('miraiHeart') && has('genPin') && has('haruFarewell') && has('tetoBeach'); }

/* ---------- Things to find ---------- */
const FINDS = [
  { id: 'kite', label: 'Press E to free the red-tailed kite from the tree', x: 75, z: -116.5, active: () => has('kite') && !has('kentaDone') },
  { id: 'charm', label: 'Press E to pick up the little cat charm', x: -57, z: 44, active: () => has('charm') && !has('charmDone') },
  { id: 'bouquet1', label: 'Press E to pick up a bouquet in blue paper', x: -88, z: -60, active: () => has('flowers') && !has('flowersDone') },
  { id: 'bouquet2', label: 'Press E to pick up a bouquet in blue paper', x: 36, z: 24, active: () => has('flowers') && !has('flowersDone') },
  { id: 'bouquet3', label: 'Press E to pick up a bouquet in blue paper', x: 88, z: 96, active: () => has('flowers') && !has('flowersDone') },
  { id: 'bouquet4', label: 'Press E to pick up a bouquet in blue paper', x: -30, z: 120, active: () => has('flowers') && !has('flowersDone') },
  { id: 'insp1', label: 'Press E to look out at the sea', x: -60, z: -160, active: () => has('lyrics') && !has('lyricsDone'), say: 'The sea goes on and on. Like starting over.' },
  { id: 'insp2', label: 'Press E to sit by the fountain', x: 0, z: -31, active: () => has('lyrics') && !has('lyricsDone'), say: 'Everyone passing by at once, and none of them stopping. Except sometimes.' },
  { id: 'insp3', label: 'Press E to look up into the cherry blossom', x: -97, z: -114, active: () => has('lyrics') && !has('lyricsDone'), say: 'Something beautiful that won\'t last. Better look now.' },
  { id: 'cat', label: 'Press E to pick up the white cat', x: 92, z: 74, active: () => has('catQuest') && !has('catFound') },
];
function flowersHeld() { return ['bouquet1', 'bouquet2', 'bouquet3', 'bouquet4'].filter((k) => idol.items[k]).length; }
function inspirationHeld() { return ['insp1', 'insp2', 'insp3'].filter((k) => idol.items[k]).length; }

function takeFind(f) {
  idol.items[f.id] = true;
  Sfx.pickup();
  if (f.id === 'cat') { flag('catFound'); refreshIdolWorld(); say('There you are, Mochi. Come on, you. Home.', 3); }
  else if (f.say) say(f.say, 3.4);
  else toast(f.label.replace('Press E to ', '').replace(/^\w/, (c) => c.toUpperCase()));
  setObjective();
}

// Mochi: a fat white cat with a grey ear, curled on a warm vent.
function buildCat() {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 1 }), grey = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), white); body.scale.set(1, 0.7, 1.3); body.position.y = 0.16; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), white); head.position.set(0, 0.26, 0.24); g.add(head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), s > 0 ? grey : white); ear.position.set(s * 0.06, 0.37, 0.24); g.add(ear); }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.25, 3, 6), white); tail.rotation.set(1.2, 0.8, 0); tail.position.set(0.15, 0.1, -0.2); g.add(tail);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0x5a5c62, metalness: 0.6, roughness: 0.4 })); vent.position.y = 0.03; g.add(vent);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Teto's posters: red and black, pasted on walls round the square once she's everywhere.
function buildPosters() {
  const tex = paintCanvas(128, 180, (g) => {
    g.fillStyle = '#16030a'; g.fillRect(0, 0, 128, 180);
    g.fillStyle = '#ff2d55'; g.beginPath(); g.arc(64, 70, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#16030a'; g.beginPath(); g.arc(64, 74, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd0dc'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('TETO', 64, 140);
    g.font = '11px sans-serif'; g.fillText('CRIMSON DRILL PARADE', 64, 160);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  city.posters = [];
  for (const [x, z, r] of [[-26, -47.7, Math.PI], [26, -47.7, Math.PI], [-53.4, 0, -Math.PI / 2], [53.4, -20, Math.PI / 2], [5, 47.4, Math.PI], [-20, -4.2, 0]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2), mat);
    m.position.set(x, 1.8, z); m.rotation.y = r;
    city.group.add(m);
    city.posters.push(m);
  }
}

/* ---------- Busking ---------- */
function buskLabel() {
  if (idol.buskDay === dayNight.day && idol.buskCount >= FAME.buskPerDay) return 'Busked enough for today. Come back tomorrow.';
  if (!night()) return 'Busking draws a crowd in the evening (after 17:00)';
  return 'Press E to busk in the square';
}

function busk() {
  if (idol.buskDay !== dayNight.day) { idol.buskDay = dayNight.day; idol.buskCount = 0; }
  if (idol.buskCount >= FAME.buskPerDay) { showNote('My voice needs a rest. Tomorrow.'); return; }
  if (!night()) { showNote('Hardly anyone stops in the daytime. The square comes alive in the evening.'); return; }
  idol.buskCount++;
  const songs = ['snowdrop', has('lyricsDone') ? 'paperplane' : 'snowdrop', has('joined') ? 'sakura' : 'snowdrop'];
  const l = fameLevel();
  startBusk({ song: songs[idol.buskCount % songs.length], difficulty: 0.2 + l * 0.05, fame: 30 + l * 14, crowd: 10 + l * 6, title: 'Busking in the square', after: afterBusk });
}

function afterBusk(res) {
  // The scout, at the back of the crowd once she's become a local face.
  if (fameLevel() >= 3 && !has('scoutSoon')) { flag('scoutSoon'); refreshIdolWorld(); setTimeout(() => showNote('A woman in a dark suit is watching from the edge of the crowd.'), 600); setObjective(); }
  void res;
}

/* ---------- Gigs ---------- */
function venueLabel(id) {
  const v = VENUES[id];
  if (fameLevel() < v.level) return `${v.name} · needs fame level ${v.level + 1}`;
  if (v.once && idol.gigs[id]) return `${v.name} · done`;
  if (idol.gigDay[id] === dayNight.day) return `${v.name} · you've played here today`;
  const h = dayNight.hour();
  if (h < v.open[0] || h > v.open[1]) return `${v.name} · doors open ${String(v.open[0]).padStart(2, '0')}:00`;
  return `Press E to play ${v.name} (${v.kind}, ${v.cap.toLocaleString()} people)`;
}

function tryGig(id) {
  const v = VENUES[id];
  if (fameLevel() < v.level) { showNote(`They won't book us there yet. We need more fans.`); return; }
  if (v.once && idol.gigs[id]) return;
  if (idol.gigDay[id] === dayNight.day) { showNote('We already played here today. Tomorrow.'); return; }
  const h = dayNight.hour();
  if (h < v.open[0] || h > v.open[1]) { showNote(`Doors open at ${v.open[0]}:00. I could rest until then.`); return; }
  const go = () => startGig({ venue: id, ...v }, (res) => afterGig(id, res));
  if (id === 'tv') tetoBackstage(go);
  else go();
}

function afterGig(id, res) {
  const v = VENUES[id];
  idol.gigs[id] = (idol.gigs[id] || 0) + 1;
  idol.gigDay[id] = dayNight.day;
  const lines = [];
  if (id === 'echo' && idol.gigs.echo === 1) lines.push(['Kotone', 'Eighty people! EIGHTY! I counted twice!'], ['Aoi', 'Seventy-nine. One was the barman.'], ['Mirai', 'They were singing along at the end. Did you hear?']);
  if (id === 'tv') lines.push(['Teto', 'Not bad, snowflake. Not bad at all.'], ['Teto', 'Now watch how it\'s done.'], ['(Miku)', 'Teto took the stage after us. The studio went red. Half the audience was on its feet before she sang a note.'], ['Kanade', 'Our single just went to number two. Behind hers.'], ['(Miku)', 'Number two. Behind Teto.']);
  if (id === 'fest' && idol.gigs.fest === 1) lines.push(['(Miku)', 'Three thousand people on the beach where I came down. Fireworks over the sea. Old Gen on the sea wall, waving his hat.']);
  if (id === 'arena' && idol.gigs.arena === 1) lines.push(['Kanade', 'Ten thousand. Sold out in four minutes. The president wants to see you. Now.']);
  if (lines.length) talk(lines, { then: setObjective });
  else setObjective();
  void v; void res;
}

/* ---------- Resting ---------- */
function restMenu() {
  talk([['(Miku)', has('apartment') ? 'My apartment. Small, warm, mine.' : 'Capsule eleven. Barely big enough to sit up in. It\'s perfect.']], { choices: [
    { text: 'Sleep until morning', then: () => cityRest('morning') },
    { text: 'Rest until the evening', then: () => cityRest('evening') },
    { text: 'Save and carry on', then: () => { saveGame(); toast('Game saved'); } },
  ] });
}

function cityRest(until) {
  const fade = $('sleep-fade');
  fade.classList.add('on');
  setTimeout(() => {
    const h = dayNight.hour();
    const target = until === 'morning' ? 8 : 17.5;
    const add = target > h ? target - h : 24 - h + target;
    dayNight.t += add / 24;
    dayNight.day = Math.floor(dayNight.t) + 1;
    survival.health = 100;
    saveGame();
    fade.classList.remove('on');
    say(until === 'morning' ? 'Morning. A new day in the city.' : 'Evening. The lights are coming on.', 3);
    // The night before the Dome, she can't sleep: she walks down to the beach, and someone's there.
    if (has('domeAnnounced') && has('aoiHeart') && has('kotoneHeart') && has('miraiHeart') && has('genPin') && has('haruFarewell') && !has('tetoBeach') && until === 'evening') {
      setTimeout(() => showNote('I can\'t sit still. I\'ll walk down to the beach, to the old balloon.'), 800);
      flag('beachCall');
      spawnTetoBeach();
    }
  }, 1500);
}

function spawnTetoBeach() {
  if (!city.named.teto) cityNpc('teto', { name: 'Teto', x: -34, z: -152, yaw: 0, look: { skin: 0xf5dcc8, hair: 0xd8243c, top: 0x1a1a1a, legs: 0x8a1a2a, scale: 0.96 }, talk: () => tetoOnTheBeach() });
  hideNpc('teto', false);
}

/* ---------- The objective ---------- */
function currentObjective() {
  if (!has('metGen')) return 'Talk to the old fisherman on the beach';
  if (!has('metHaru')) return 'Head up into the city, to the station square';
  if (has('catQuest') && !has('catFound')) return 'Find Mrs. Ishida\'s cat, Mochi, in the alleys behind the big blocks';
  if (has('catFound') && !has('room')) return 'Bring Mochi home to Mrs. Ishida';
  if (!has('room')) return 'Find Mrs. Ishida\'s capsule hotel by the shopping arcade';
  if (idol.flags.ramen !== undefined && idol.flags.ramen < 3) return `Deliver Taisho's ramen (${idol.flags.ramen}/3): Mr. Sato, Mrs. Kimura, Yuto`;
  if (idol.flags.ramen === 3 && !has('ramenDone')) return 'Go back to Taisho\'s ramen shop';
  if (has('kite') && !idol.items.kite) return 'Get Kenta\'s kite out of a cherry tree on the promenade';
  if (idol.items.kite && !has('kentaDone')) return 'Give Kenta his kite, by the fountain';
  if (has('flowers') && !has('flowersDone')) return flowersHeld() >= 4 ? 'Take the bouquets back to Sakura\'s flower stall' : `Find Sakura's bouquets in blue paper (${flowersHeld()}/4)`;
  if (has('scoutSoon') && !has('scouted')) return 'Talk to the woman in the dark suit in the square';
  if (has('scouted') && !has('auditioned')) return 'Audition at Starlight Production, east of the square, in the evening';
  if (has('auditioned') && !has('joined')) return 'Talk to President Hoshino';
  if (!has('joined')) return fameLevel() < 3 ? `Busk in the square in the evening, help people around town (fame level ${fameLevel() + 1}/4)` : 'Busk in the square in the evening';
  if (has('charm') && !idol.items.charm) return 'Find Kotone\'s little cat charm in the shopping arcade';
  if (idol.items.charm && !has('charmDone')) return 'Give Kotone her charm';
  if (has('lyrics') && !has('lyricsDone')) return inspirationHeld() >= 3 ? 'Tell Mirai what you found' : `Find three places that feel like something, for Mirai's lyrics (${inspirationHeld()}/3)`;
  if (has('tvBooked') && !idol.gigs.tv) return 'Perform on Prime Beat (TV studio, east of the square, 18:00-23:00)';
  if (has('domeReady')) return 'Take the train to the Tokyo Dome from the station square';
  if (has('domeAnnounced')) {
    const todo = [!has('aoiHeart') && 'Aoi', !has('kotoneHeart') && 'Kotone', !has('miraiHeart') && 'Mirai', !has('genPin') && 'Old Gen', !has('haruFarewell') && 'Haru'].filter(Boolean);
    if (todo.length) return `Before the Dome, spend time with the people who matter: ${todo.join(', ')}`;
    if (!has('tetoBeach')) return has('beachCall') ? 'Walk down to the beach, to the old balloon' : 'Rest until the evening. Tomorrow is the Dome.';
    return 'Go and see President Hoshino';
  }
  if (fameLevel() >= 8 && idol.gigs.arena) return 'Go and see President Hoshino';
  const next = Object.entries(VENUES).find(([id, v]) => fameLevel() >= v.level && !(v.once && idol.gigs[id]) && id !== 'tv');
  return `Grow ${G()}'s fame: play stages (J for the schedule), busk, help people (fame level ${fameLevel() + 1})`;
  void next;
}

function setObjective() {
  idol.objective = currentObjective();
  const el = $('objective');
  if (el && city.active && el.querySelector('.objective-text')) {
    el.querySelector('.objective-text').textContent = idol.objective;
    el.classList.remove('empty');
    el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh');
  }
  refreshIdolWorld();
}

/* ---------- The phone (J) ---------- */
function showIdolLog() {
  const el = $('idol-log');
  idol.logOpen = !idol.logOpen;
  el.classList.toggle('hidden', !idol.logOpen);
  if (!idol.logOpen) return;
  const l = fameLevel();
  const rows = Object.entries(VENUES).map(([id, v]) => {
    const state = l < v.level ? `locked · fame Lv ${v.level + 1}` : v.once && idol.gigs[id] ? 'done' : idol.gigDay[id] === dayNight.day ? 'played today' : `${v.open[0]}:00-${Math.floor(v.open[1])}:${v.open[1] % 1 ? '30' : '00'}`;
    return `<li class="${l >= v.level ? '' : 'locked'}"><b>${v.name}</b><span>${v.kind} · ${v.cap.toLocaleString()} · ${state}</span></li>`;
  }).join('');
  el.innerHTML = `<header><span>${has('joined') ? G() : 'Miku'}</span><b>Fame Lv ${l + 1} · ${FAME.titles[l]}</b></header>
    <p class="log-obj">${idol.objective}</p>
    ${has('joined') ? `<h4>Stages</h4><ul>${rows}</ul>` : '<p class="log-hint">Busk in the square in the evening. Help people around town. Someone will notice.</p>'}
    <p class="log-hint">Day ${dayNight.day} · ${dayNight.clock()} · J to close</p>`;
}

/* ---------- Each frame ---------- */
function updateIdol(dt) {
  // The first sight of Teto's face, on the screen over the square.
  if (fameLevel() >= 4 && has('joined') && !has('sawTeto') && Math.hypot(player.pos.x, player.pos.z + 22) < 18) sawTetoScene();
  if (!idol.objective) setObjective();
  // Kanade's message after the scout, the ramen and so on, all keep the objective current.
  idol.announced -= dt;
}

// What the big screen shows.
function idolScreen() {
  if (has('domeAnnounced')) return Math.floor(game.time / 8) % 2 ? 'summit' : 'teto';
  if (has('sawTeto') || fameLevel() >= 4) return Math.floor(game.time / 10) % 3 === 0 ? 'teto' : has('tvBooked') ? 'miku' : 'ad';
  return 'ad';
}

/* ---------- Saving ---------- */
function saveIdol() { return { fame: idol.fame, yen: idol.yen, flags: idol.flags, groupName: idol.groupName, gigs: idol.gigs, gigDay: idol.gigDay, items: idol.items, buskDay: idol.buskDay, buskCount: idol.buskCount }; }
function loadIdol(d) { if (!d) return; Object.assign(idol, d); idol.objective = ''; }
function resetIdol() {
  Object.assign(idol, { fame: 0, yen: 0, chapter: 'arrival', flags: {}, groupName: 'SNOWDROP', gigs: {}, gigDay: {}, buskDay: 0, buskCount: 0, items: {}, objective: '', logOpen: false });
  if (city.named) for (const id of Object.keys(city.named)) hideNpc(id, false);
}
