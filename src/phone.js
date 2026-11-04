// Miku's phone, in Tokyo (P). Messages from everyone she's met, with quick replies and a
// "where do I go?" that sets the guide arrow; every quest she's on with its progress and how
// far away it is, live, and a button to track it; a map of the city; StarTube, where she
// films and uploads songs that keep finding viewers (and fans) over the following days;
// Chirp, for a post a day; the schedule of stages; and settings with wallpapers loaded from
// the phone-wallpapers folder.
//
// Also here: fans who stop her in the street for an autograph or a selfie, and the scale of
// the whole interface, which grows with the window so it stays readable on big screens.

/* ---------- Interface scale ---------- */
function applyUiScale() {
  const base = Math.max(1, Math.min(1.8, innerWidth / 1440, innerHeight / 810));
  let user = 1;
  try { user = parseFloat(localStorage.getItem('ui-scale')) || 1; } catch { /* private window */ }
  const ui = base * user;
  document.documentElement.style.setProperty('--ui', ui.toFixed(3));
  // The phone is tall: it's never allowed to run off the top or bottom of the window.
  document.documentElement.style.setProperty('--phone', Math.min(ui, (innerHeight * 0.94) / 640).toFixed(3));
}
applyUiScale();
addEventListener('resize', applyUiScale);

/* ---------- The quests ---------- */
// Each: who it's for, when it starts and ends, how far along it is, and where to go next.
const nearestOf = (ids) => {
  let best = null, bd = Infinity;
  for (const id of ids) {
    if (idol.items[id]) continue;
    const f = FINDS.find((q) => q.id === id);
    const d = Math.hypot(f.x - player.pos.x, f.z - player.pos.z);
    if (d < bd) { bd = d; best = { x: f.x, z: f.z, label: 'Here' }; }
  }
  return best;
};
const npcAt = (id) => { const n = city.named[id]; return n && !n.hidden ? { x: n.person.x, z: n.person.z, label: n.name } : null; };
const findAt = (id, label = 'Here') => { const f = FINDS.find((q) => q.id === id); return f ? { x: f.x, z: f.z, label } : null; };

const QUESTS = [
  { id: 'gen', title: 'A Stranger on the Beach', who: 'gen', start: () => true, done: () => has('metGen'), step: () => 'Talk to the old fisherman on the beach', to: () => npcAt('gen'), reward: 'yen, a friend' },
  { id: 'haru', title: 'The Busker', who: 'haru', start: () => has('metGen'), done: () => has('metHaru'), step: () => 'Find the busker in the station square', to: () => npcAt('haru'), reward: 'a place to sing' },
  { id: 'cat', title: 'Where\'s Mochi?', who: 'ishida', start: () => has('catQuest'), done: () => has('room'), step: () => (has('catFound') ? 'Bring Mochi home to Mrs. Ishida' : 'Search the green park, by the playground'), to: () => (has('catFound') ? npcAt('ishida') : findAt('cat', 'Mochi')), reward: '60 fame, a bed' },
  { id: 'ramen', title: 'Hot Delivery', who: 'taisho', start: () => idol.flags.ramen !== undefined, done: () => has('ramenDone'), step: () => (idol.flags.ramen >= 3 ? 'Go back to Taisho\'s shop' : `Deliver the ramen (${idol.flags.ramen || 0}/3)`), to: () => (idol.flags.ramen >= 3 ? npcAt('taisho') : npcAt(!has('ramenSato') ? 'sato' : !has('ramenKimura') ? 'kimura' : 'yuto')), reward: '155 fame, ¥3,000' },
  { id: 'kite', title: 'The Red-Tailed Kite', who: 'kenta', start: () => has('kite'), done: () => has('kentaDone'), step: () => (idol.items.kite ? 'Give Kenta his kite' : 'Get the kite out of a cherry tree on the promenade'), to: () => (idol.items.kite ? npcAt('kenta') : findAt('kite', 'The kite')), reward: '70 fame' },
  { id: 'flowers', title: 'Bouquets in Blue Paper', who: 'sakura', start: () => has('flowers'), done: () => has('flowersDone'), step: () => (flowersHeld() >= 4 ? 'Take them back to Sakura' : `Find the bouquets (${flowersHeld()}/4)`), to: () => (flowersHeld() >= 4 ? npcAt('sakura') : nearestOf(['bouquet1', 'bouquet2', 'bouquet3', 'bouquet4'])), reward: '90 fame, ¥2,000' },
  { id: 'photo', title: 'Honeymoon Photo', who: 'tourist', start: () => false, done: () => has('photoDone'), step: () => 'Talk to the tourist on the promenade', to: () => npcAt('tourist'), reward: '60 fame', lead: () => fameLevel() >= 1 },
  { id: 'genSong', title: 'A Song for Old Gen', who: 'gen', start: () => !!idol.flags.genSong, done: () => has('genSongDone'), step: () => 'Sing for Old Gen on the beach', to: () => npcAt('gen'), reward: '90 fame', lead: () => fameLevel() >= 2 },
  { id: 'scout', title: 'The Woman in the Dark Suit', who: 'kanade', start: () => has('scoutSoon'), done: () => has('scouted'), step: () => 'Talk to her in the square', to: () => npcAt('kanade'), reward: 'a chance' },
  { id: 'audition', title: 'The Audition', who: 'hoshino', start: () => has('scouted'), done: () => has('joined'), step: () => (has('auditioned') ? 'Talk to President Hoshino' : 'Audition at Starlight Production, any evening'), to: () => ({ x: 64, z: -36, label: 'Starlight Production' }), reward: 'a group' },
  { id: 'aoi', title: 'Dance Practice', who: 'aoi', start: () => has('joined'), done: () => has('aoiDone'), step: () => 'Practise with Aoi', to: () => npcAt('aoi'), reward: '100 fame' },
  { id: 'charm', title: 'Kotone\'s Lucky Charm', who: 'kotone', start: () => has('charm'), done: () => has('charmDone'), step: () => (idol.items.charm ? 'Give Kotone her charm' : 'Find the little cat charm in the shopping arcade'), to: () => (idol.items.charm ? npcAt('kotone') : findAt('charm', 'The charm')), reward: '80 fame', lead: () => has('joined') },
  { id: 'lyrics', title: 'Words for Mirai', who: 'mirai', start: () => has('lyrics'), done: () => has('lyricsDone'), step: () => (inspirationHeld() >= 3 ? 'Tell Mirai what you found' : `Find three places that feel like something (${inspirationHeld()}/3)`), to: () => (inspirationHeld() >= 3 ? npcAt('mirai') : nearestOf(['insp1', 'insp2', 'insp3'])), reward: '100 fame, a new song', lead: () => has('joined') },
  { id: 'radio', title: 'Tokyo Nights', who: 'rina', start: () => false, done: () => has('radioDone'), step: () => 'Go on DJ Rina\'s radio show', to: () => npcAt('rina'), reward: '320+ fame', lead: () => has('joined') && fameLevel() >= 5 },
  { id: 'tv', title: 'Prime Beat', who: 'hoshino', start: () => has('tvBooked'), done: () => !!idol.gigs.tv, step: () => 'Perform on live TV, 18:00-23:00', to: () => ({ x: VENUES.tv.door.x, z: VENUES.tv.door.z - 4, label: VENUES.tv.name }), reward: '1,200 fame' },
  { id: 'dome', title: 'The Idol Summit', who: 'hoshino', start: () => has('domeAnnounced'), done: () => has('domeDone'), step: () => currentObjective(), to: () => idolTarget(true), reward: 'the crown' },
];
function questState(q) { return q.done() ? 'done' : q.start() ? 'active' : q.lead && q.lead() && idolHasNews(q.who) ? 'lead' : 'hidden'; }

// The guide follows whichever quest she's tracking, while it's still open.
function trackedTarget() {
  if (!idol.tracked) return null;
  const q = QUESTS.find((x) => x.id === idol.tracked);
  const s = q && questState(q);
  if (!q || s === 'done' || s === 'hidden') { idol.tracked = null; return null; }
  const t = q.to();
  return t ? { ...t, label: `${q.title}: ${t.label}` } : null;
}

/* ---------- Messages ---------- */
// Everyone's thread is worked out from how far the story's got, so it's always right; her
// replies are kept, and slotted in where she sent them.
const T = (ok, text) => (ok ? text : null);
const CONTACTS = {
  gen: { name: 'Old Gen', met: () => has('metGen'), lines: () => [
    T(true, 'Did you find your way up into the city, girl? The station square\'s straight up past the sea wall.'),
    T(has('room'), 'Heard you found Mrs. Ishida\'s cat. Word gets round the harbour fast.'),
    T(fameLevel() >= 2 && !has('genSongDone'), 'Come down to the beach some evening. I\'d like to hear you sing.'),
    T(has('genSongDone'), 'Still humming that song. My wife used to sing it. Thank you.'),
    T(has('domeAnnounced'), 'The Dome! Come and see me on the beach before the big night. I\'ve got something for you.'),
    T(has('genPin'), 'Wear the pin. Knock \'em flat.'),
  ] },
  haru: { name: 'Haru', met: () => has('metHaru'), lines: () => [
    T(true, 'You\'ve got a real voice. Evenings in the square are best, after five. That\'s when people stop.'),
    T(has('scouted'), 'A SCOUT? From Starlight? I knew it. I knew it!'),
    T(has('joined'), `${G()}! I saw the poster at the station. Don't forget the little guys.`),
    T(has('domeAnnounced'), 'The Dome... Come and sing one more with me in the square before you go?'),
  ] },
  ishida: { name: 'Mrs. Ishida', met: () => has('catQuest'), lines: () => [
    T(true, 'Mochi is white, fat, with a grey patch on one ear. Try the green park, dear, by the playground.'),
    T(has('catFound') && !has('room'), 'Is it true? You found her? Bring her home!'),
    T(has('room'), 'Capsule eleven is made up for you. Mochi sends her regards.'),
  ] },
  taisho: { name: 'Taisho', met: () => idol.flags.ramen !== undefined, lines: () => [
    T(true, 'Three bowls: Mr. Sato east of the square, Mrs. Kimura out west, Yuto up by the mall. HOT. GO.'),
    T(idol.flags.ramen >= 1 && !has('ramenDone'), `${Math.min(3, idol.flags.ramen)}/3. Faster!`),
    T(idol.flags.ramen >= 3 && !has('ramenDone'), 'All three? Get back here, I owe you a bowl.'),
    T(has('ramenDone'), has('joined') ? `I put a sign up. "${G()} ate here." Business has doubled.` : 'Best broth in the ward. Tell your fans.'),
  ] },
  kenta: { name: 'Kenta', met: () => has('kite'), lines: () => [
    T(true, 'my kite is stuck in a pink tree by the beach!!! it has a red tail!!!'),
    T(!!idol.items.kite && !has('kentaDone'), 'YOU GOT IT??? im by the fountain'),
    T(has('kentaDone'), 'manager rule 2: more snacks'),
  ] },
  sakura: { name: 'Sakura', met: () => has('flowers'), lines: () => [
    T(true, 'Four bouquets in blue paper, scattered round the neighbourhood. Thank you so much!'),
    T(flowersHeld() > 0 && !has('flowersDone'), `${flowersHeld()} of 4 already? You're a star!`),
    T(has('flowersDone'), 'The wedding fair was saved. Snowdrops are on me, forever.'),
  ] },
  tourist: { name: 'Tourist', met: () => has('photoDone'), lines: () => [T(true, 'We printed the photo! You\'re on our fridge!')] },
  yuto: { name: 'Yuto', met: () => has('ramenYuto'), lines: () => [
    T(true, 'Thanks for the ramen! If you ever want to film a song for StarTube, just hit record. I\'ll edit it.'),
    T(idol.videos && idol.videos.length > 0, 'Your video\'s doing numbers!! Check the comments lol'),
  ] },
  kanade: { name: 'Kanade', met: () => has('scouted'), lines: () => [
    T(true, 'Starlight Production is the tall glass building east of the square. Come any evening. The president will hear you himself.'),
    T(has('joined'), 'Your schedule is on your phone. One show a day. Drink water.'),
    T(has('tvBooked') && !idol.gigs.tv, 'Prime Beat is live, 18:00-23:00. Do NOT fall over.'),
    T(has('domeAnnounced'), 'Fifty-five thousand seats. I have booked everything. Just bring yourself.'),
  ] },
  hoshino: { name: 'President Hoshino', met: () => has('auditioned'), lines: () => [
    T(true, 'Idols stand.'),
    T(fameLevel() >= 5 && !has('tvBooked'), 'Come to the office. We have an offer from television.'),
    T(fameLevel() >= 8 && !!idol.gigs.arena && !has('domeAnnounced'), 'My office. Now. All four of you.'),
    T(has('domeAnnounced') && prepDone() && !has('domeReady'), 'Everything is ready. Come and see me.'),
  ] },
  aoi: { name: 'Aoi', met: () => has('joined'), lines: () => [
    T(true, has('aoiDone') ? 'Count of eight. Always.' : 'Practice. Today. Find me, I\'m in the green park.'),
    T(has('domeAnnounced') && !has('aoiHeart'), 'Find me before the Dome. I need to say something. Once.'),
  ] },
  kotone: { name: 'Kotone', met: () => has('joined'), lines: () => [
    T(true, 'MIKU!!! welcome to the group!!! 🎉🎉'),
    T(has('charm') && !has('charmDone'), 'my lucky cat charm fell off my bag in the shopping arcade 😭😭 help'),
    T(has('charmDone'), 'never letting go of it again!!! or you!!!'),
    T(has('domeAnnounced') && !has('kotoneHeart'), 'come find me!! taiyaki bench!! important!!'),
  ] },
  mirai: { name: 'Mirai', met: () => has('joined'), lines: () => [
    T(true, 'Um. Hi. It\'s Mirai. Sorry. Hi.'),
    T(has('lyrics') && !has('lyricsDone'), 'Three places that feel like something... the sea, maybe. The fountain. The cherry trees?'),
    T(has('lyricsDone'), 'I\'m writing again. Every night. It\'s your fault.'),
    T(has('domeAnnounced') && !has('miraiHeart'), 'I finished it. The song for the Dome. Can I show you?'),
  ] },
  rina: { name: 'DJ Rina', met: () => has('joined') && fameLevel() >= 5, lines: () => [
    T(true, 'Come on Tokyo Nights! The booth is west of the square. The city wants to hear you.'),
    T(has('radioDone'), 'You broke our phone lines. Come back any time.'),
  ] },
  teto: { name: 'Unknown number', met: () => has('sawTeto'), lines: () => [
    T(true, 'saw you on the big screen, snowflake. cute.'),
    T(has('tvBooked'), 'see you at Prime Beat. try to keep up.'),
    T(!!idol.gigs.tv, 'number two looks good on you.'),
    T(has('domeAnnounced'), 'the Dome. you and me. finally, an audience.'),
  ] },
};
const contactLines = (id) => CONTACTS[id].lines().filter(Boolean);
const contactQuest = (id) => QUESTS.find((q) => q.who === id && questState(q) === 'active') || QUESTS.find((q) => q.who === id && questState(q) === 'lead');
function unreadCount(id) { return Math.max(0, contactLines(id).length - ((idol.seen || {})[id] || 0)); }

/* ---------- StarTube ---------- */
const PLACES = [
  { id: 'square', name: 'Station Square', x: 2, z: -22, where: 'square' },
  { id: 'beach', name: 'The Beach', x: -26, z: -142, where: 'beach' },
  { id: 'park', name: 'Green Park', x: -6, z: 64, where: 'park' },
];
const VIDEO_COMMENTS = [
  'her voice is so clear omg', 'came from the square, stayed for the vibes', 'who is she?? need more', 'this is on repeat',
  'the high note at the end 😭', 'Tokyo\'s next star, calling it now', 'my cat stopped to listen', 'teal penlight gang 💙',
  'I was THERE in the square!!', 'how is this not number one', 'Mirai wrote this?? genius', 'better than Teto tbh',
];
function videoViews(v) { return Math.round(v.peak * (1 - Math.exp(-Math.max(0, dayNight.t - v.t) / 1.4))); }
function totalViews() { return (idol.videos || []).reduce((s, v) => s + videoViews(v), 0); }
function followers() { return Math.round(idol.fame * 2.4 + totalViews() * 0.03 + (idol.posts || 0) * 12); }

function uploadVideo(song, quality, place) {
  idol.videos = idol.videos || [];
  const before = idol.videos.filter((v) => v.song === song).length;
  const newPlace = !idol.videos.some((v) => v.place === place);
  const peak = Math.round((900 + idol.fame * 5) * quality * Math.pow(0.6, before) * (newPlace ? 1.25 : 1));
  idol.videos.unshift({ id: Date.now(), song, place, t: dayNight.t, peak, credited: 0, quality, day: dayNight.day });
  idol.uploads = (idol.uploadDay === dayNight.day ? idol.uploads || 0 : 0) + 1;
  idol.uploadDay = dayNight.day;
  Sfx.fameChime();
  phoneBanner('StarTube', `Uploaded: ${SONGS[song] ? SONGS[song].title : song} at ${PLACES.find((p) => p.id === place)?.name || 'Tokyo'}. The views will come in over the next few days.`);
  if (phone.open) renderPhone();
}
function uploadsToday() { return idol.uploadDay === dayNight.day ? idol.uploads || 0 : 0; }

function filmVideo() {
  if (uploadsToday() >= 2) { phoneBanner('StarTube', 'Two uploads a day is plenty. Let them breathe.'); return; }
  // Film at whichever of the places she's nearest.
  const at = PLACES.reduce((b, p) => (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < Math.hypot(b.x - player.pos.x, b.z - player.pos.z) ? p : b), PLACES[0]);
  closePhone();
  startBusk({ choose: true, where: at.where, song: 'snowdrop', difficulty: 0.25 + fameLevel() * 0.04, fame: 0, crowd: 3, title: `Filming for StarTube · ${at.name}`, after: (res) => {
    const q = 0.4 + (res ? res.accuracy : 0.5) * 1.1 + (SONGS[show.lastSong]?.stars || 1) * 0.1;
    uploadVideo(show.lastSong || 'snowdrop', q, at.id);
  } });
}

function quickClip() {
  if (uploadsToday() >= 2) { phoneBanner('StarTube', 'Two uploads a day is plenty. Let them breathe.'); return; }
  const songs = songsAvailable();
  const [id] = songs[Math.floor(Math.random() * songs.length)];
  uploadVideo(id, 0.55, 'clip');
}

// The views keep coming in while she plays (and while she sleeps), and become fame, a little
// at a time.
function updateVideos(dt) {
  if (!idol.videos || !idol.videos.length) return;
  phone.vt = (phone.vt || 0) + dt;
  if (phone.vt < 1) return;
  phone.vt = 0;
  let gained = 0;
  for (const v of idol.videos) {
    const now = videoViews(v);
    if (now <= v.credited) continue;
    for (const mark of [1000, 10000, 100000, 1000000]) if (v.credited < mark && now >= mark) { gained += mark / 400; phoneBanner('StarTube', `${SONGS[v.song] ? SONGS[v.song].title : 'Your video'} just passed ${mark.toLocaleString()} views!`); }
    gained += (now - v.credited) / 60;
    v.credited = now;
  }
  idol.viewFame = (idol.viewFame || 0) + gained;
  // Paid out every half minute or so, not every second.
  phone.payT = (phone.payT || 0) + 1;
  if (idol.viewFame >= 1 && phone.payT >= 30) { phone.payT = 0; const n = Math.floor(idol.viewFame); idol.viewFame -= n; addFame(n, 'StarTube views'); }
}

/* ---------- Chirp ---------- */
const POSTS = [
  ['A selfie by the fountain', 'Station square, golden hour ☀️ #tokyo #newintown'],
  ['Behind the scenes', 'Rehearsal! Aoi says my footwork is "less of a disaster" 💃'],
  ['Ramen review', 'Taisho\'s. Best broth in the ward. Not sponsored (he gave me free noodles) 🍜'],
  ['Thank the fans', 'To everyone who stopped to listen tonight: thank you. Really. 💙'],
  ['Sakura photo', 'Something beautiful that won\'t last. Better look now 🌸'],
  ['A sunset at the beach', 'Where it all started. The sea goes on and on 🌊'],
];
function postOptions() { const d = dayNight.day; return [0, 1, 2].map((k) => POSTS[(d * 3 + k) % POSTS.length]); }
function makePost(i) {
  if (idol.postDay === dayNight.day) return;
  const [, text] = postOptions()[i];
  idol.postDay = dayNight.day;
  idol.posts = (idol.posts || 0) + 1;
  const likes = Math.round(followers() * (0.08 + Math.random() * 0.06)) + 3;
  idol.lastPost = { text, likes, day: dayNight.day };
  addFame(10 + fameLevel() * 7, 'a post on Chirp');
  renderPhone();
}

/* ---------- Fans in the street ---------- */
const fans = { t: 40, active: false, since: 0 };
const FAN_LOOKS = [0xff8ab8, 0x39d5c8, 0xffd36a, 0xb47aff, 0x7affc0];
function updateFans(dt) {
  if (fameLevel() < 1 || city.talking || show.active || show.dome) return;
  if (fans.active) {
    fans.since += dt;
    const n = city.named.fan;
    // She waves, and wanders off if she's ignored for a minute.
    if (n && fans.since > 60) { hideNpc('fan', true); fans.active = false; fans.t = 60; }
    return;
  }
  if (idol.fanDay !== dayNight.day) { idol.fanDay = dayNight.day; idol.fanCount = 0; }
  if (idol.fanCount >= 6) return;
  fans.t -= dt;
  if (fans.t > 0) return;
  fans.t = 70 + Math.random() * 80;
  // Somewhere on the pavement a few metres away, in the open.
  for (let k = 0; k < 12; k++) {
    const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 4;
    const x = player.pos.x + Math.sin(a) * r, z = player.pos.z + Math.cos(a) * r;
    const B = CITY.bounds;
    if (x < B.x0 + 2 || x > B.x1 - 2 || z < B.z0 + 2 || z > B.z1 - 2) continue;
    if (city.rects.some((q) => x > q.x0 - 0.8 && x < q.x1 + 0.8 && z > q.z0 - 0.8 && z < q.z1 + 0.8)) continue;
    const look = { ...randomLook(), top: FAN_LOOKS[Math.floor(Math.random() * FAN_LOOKS.length)] };
    if (!city.named.fan) cityNpc('fan', { name: 'Fan', x, z, look, talk: talkFan });
    else moveNpc('fan', x, z);
    city.named.fan.person.yaw = Math.atan2(player.pos.x - x, player.pos.z - z);
    hideNpc('fan', false);
    fans.active = true; fans.since = 0;
    showNote(fameLevel() >= 5 ? 'Someone\'s squealing your name. A fan!' : 'Someone\'s waving at you. Do they... know you?');
    Sfx.talkBlip(1.4);
    return;
  }
}

function talkFan() {
  const l = fameLevel();
  const hello = l >= 6 ? `Oh my god. Oh my GOD. It's really you. ${G()}! I have all your songs!` : l >= 3 ? 'Excuse me! You\'re the singer from the square, right? I saw your video!' : 'Sorry! Are you the girl who sings in the station square? You\'re really good.';
  const done = (gain, line) => {
    idol.fanCount = (idol.fanCount || 0) + 1;
    addFame(gain, 'a fan');
    talk([['Fan', line]], { with: 'fan', then: () => { setTimeout(() => { hideNpc('fan', true); }, 1500); fans.active = false; } });
  };
  talk([['Fan', hello]], { with: 'fan', choices: [
    { text: 'Sign an autograph', then: () => done(12 + l * 4, 'I\'m going to frame this. I\'m never washing this hand. Wait, wrong hand.') },
    { text: 'Take a selfie together', then: () => { impact('white', 90); Sfx.pickup(); done(15 + l * 5, 'Posting this right now! Everyone\'s going to be SO jealous!'); } },
    { text: 'Sing a few lines, just for them', then: () => { Sfx.talkBlip(1.3); done(20 + l * 6, '...I think I\'m going to cry. Thank you. Thank you so much.'); } },
  ] });
}

/* ---------- Wallpapers ---------- */
// Built-in ones, plus every picture in the phone-wallpapers folder. Opened straight from
// disk the game can't list a folder, so it looks for 1.png, 2.png, ... (and wallpaper1.png,
// ...); served over http it reads the folder's listing and finds any name. Settings also has
// a button to load the folder's pictures by hand.
const WALL_DIR = 'phone-wallpapers/';
const BUILTIN_WALLS = [
  'linear-gradient(160deg, #39d5c8 0%, #1d4a6a 55%, #140c2a 100%)',
  'linear-gradient(170deg, #ffb6cf 0%, #b47aff 50%, #1a1238 100%)',
  'radial-gradient(circle at 30% 20%, #ffd36a 0%, #ff8ab8 35%, #2a1640 80%)',
  'linear-gradient(180deg, #0b1630 0%, #13254a 60%, #39d5c8 140%)',
];
const walls = { found: [], picked: [], probed: false };
function probeWallpapers() {
  if (walls.probed) return;
  walls.probed = true;
  const add = (url) => { if (!walls.found.includes(url)) { walls.found.push(url); if (phone.open && phone.app === 'settings') renderPhone(); } };
  const tryImg = (url) => new Promise((res) => { const im = new Image(); im.onload = () => { add(url); res(true); }; im.onerror = () => res(false); im.src = url; });
  const series = async (name) => { for (let i = 1; i <= 60; i++) if (!(await tryImg(`${WALL_DIR}${name}${i}.png`))) break; };
  series('');
  series('wallpaper');
  if (location.protocol.startsWith('http')) {
    fetch(WALL_DIR).then((r) => (r.ok ? r.text() : '')).then((html) => {
      for (const m of html.matchAll(/href="([^"?#]+\.(?:png|jpe?g|webp))"/gi)) {
        const href = decodeURIComponent(m[1]).split('/').pop();
        add(WALL_DIR + encodeURIComponent(href));
      }
    }).catch(() => {});
  }
}
function allWalls() {
  return [...BUILTIN_WALLS.map((css, i) => ({ key: `builtin:${i}`, css })), ...walls.found.map((u) => ({ key: `file:${u}`, css: `center / cover no-repeat url("${u}")` })), ...walls.picked.map((p) => ({ key: `picked:${p.name}`, css: `center / cover no-repeat url("${p.url}")` }))];
}
function currentWall() {
  let key = 'builtin:0', saved = null;
  try { key = localStorage.getItem('phone-wallpaper') || key; saved = localStorage.getItem('phone-wallpaper-data'); } catch { /* fine */ }
  const w = allWalls().find((x) => x.key === key);
  if (w) return w.css;
  // A picture picked by hand last time, kept so it survives a reload.
  if (key.startsWith('picked:') && saved) return `center / cover no-repeat url("${saved}")`;
  if (key.startsWith('file:')) return `center / cover no-repeat url("${key.slice(5)}")`;
  return BUILTIN_WALLS[0];
}
function setWall(key) {
  try {
    localStorage.setItem('phone-wallpaper', key);
    const p = walls.picked.find((x) => `picked:${x.name}` === key);
    if (p && p.data) localStorage.setItem('phone-wallpaper-data', p.data);
  } catch { /* too big to keep: it lasts until the page closes */ }
  renderPhone();
}
function pickWallpapers(files) {
  for (const f of files) {
    if (!/^image\//.test(f.type)) continue;
    const url = URL.createObjectURL(f);
    const entry = { name: f.name, url, data: null };
    walls.picked.push(entry);
    const rd = new FileReader();
    rd.onload = () => { entry.data = rd.result; };
    rd.readAsDataURL(f);
  }
  renderPhone();
}

/* ---------- The phone itself ---------- */
const phone = { open: false, app: 'home', thread: null, t: 0, el: null, lastUnread: -1, notify: 0 };
const APPS = [
  ['messages', 'Messages', '💬', '#39d5c8'], ['quests', 'Quests', '⭐', '#ffd36a'], ['map', 'Map', '🗺️', '#7ac0ff'],
  ['startube', 'StarTube', '▶️', '#ff4a5a'], ['chirp', 'Chirp', '🐦', '#5ab0ff'], ['schedule', 'Schedule', '📅', '#b47aff'],
  ['settings', 'Settings', '⚙️', '#8a8e9a'],
];

function buildPhone() {
  if (phone.el) return phone.el;
  const el = document.createElement('div');
  el.id = 'phone';
  el.className = 'hidden';
  el.innerHTML = '<div class="ph-screen"><div class="ph-status"><b class="ph-time"></b><span class="ph-icons">▂▄▆ 🔋</span></div><div class="ph-body"></div><button class="ph-home" title="Home"></button></div>';
  document.body.appendChild(el);
  el.addEventListener('click', phoneClick);
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  phone.el = el;
  // Clicking the world puts the phone away.
  canvas.addEventListener('mousedown', () => { if (phone.open) closePhone(); }, true);
  addEventListener('keydown', (e) => { if (phone.open && e.code === 'Escape') { e.preventDefault(); closePhone(); } });
  // A banner for messages and uploads, over the top of the screen.
  const b = document.createElement('div'); b.id = 'phone-banner'; b.className = 'hidden'; document.body.appendChild(b);
  return el;
}

function openPhone(app = 'home') {
  if (!city.active || city.talking || show.active || show.dome || game.state !== 'playing') return;
  buildPhone();
  probeWallpapers();
  phone.open = true;
  phone.app = app;
  phone.thread = null;
  phone.el.classList.remove('hidden');
  phone.el.classList.remove('rise'); void phone.el.offsetWidth; phone.el.classList.add('rise');
  pointerWasLocked = false;
  document.exitPointerLock();
  Sfx.swap();
  renderPhone();
}

function closePhone() {
  if (!phone.open) return;
  phone.open = false;
  phone.el.classList.add('hidden');
  if (game.state === 'playing') lockPointer();
}

function togglePhone(app) { if (phone.open && (!app || phone.app === app)) closePhone(); else if (phone.open) { phone.app = app; renderPhone(); } else openPhone(app); }

function phoneBanner(title, text) {
  buildPhone();
  const b = $('phone-banner');
  b.innerHTML = `<b>${title}</b><span>${text}</span>`;
  b.classList.remove('hidden', 'show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(phone.bannerT);
  phone.bannerT = setTimeout(() => b.classList.add('hidden'), 4800);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`);
function header(title, back = 'home') { return `<header class="ph-head"><button data-go="${back}">‹</button><h3>${title}</h3><span></span></header>`; }
function totalUnread() { return Object.keys(CONTACTS).filter((id) => CONTACTS[id].met()).reduce((s, id) => s + unreadCount(id), 0); }
function distTo(t) { return Math.round(Math.hypot(t.x - player.pos.x, t.z - player.pos.z)); }
function arrowTo(t) { return Math.atan2(t.x - player.pos.x, t.z - player.pos.z) - player.yaw; }

function renderPhone() {
  if (!phone.el || !phone.open) return;
  const body = phone.el.querySelector('.ph-body');
  phone.el.querySelector('.ph-screen').style.background = currentWall();
  phone.el.querySelector('.ph-time').textContent = dayNight.clock();
  phone.el.dataset.app = phone.app;
  body.innerHTML = PHONE_APPS[phone.app] ? PHONE_APPS[phone.app]() : PHONE_APPS.home();
  if (phone.app === 'map') { const c = body.querySelector('canvas'); if (c) drawCityMap(c, null); }
}

const PHONE_APPS = {
  home() {
    const l = fameLevel(), unread = totalUnread(), active = QUESTS.filter((q) => questState(q) === 'active').length;
    const badge = { messages: unread, quests: active };
    return `<div class="ph-home-top"><div class="ph-clock">${dayNight.clock()}</div><div class="ph-date">Day ${dayNight.day} · Tokyo</div>
      <div class="ph-widget"><b>${has('joined') ? esc(G()) : 'Miku'}</b><span>Lv ${l + 1} · ${FAME.titles[l]}</span><span>${idol.fame.toLocaleString()} fame · ¥${idol.yen.toLocaleString()} · ${fmt(followers())} followers</span></div></div>
      <div class="ph-grid">${APPS.map(([id, name, icon, col]) => `<button class="ph-app" data-go="${id}"><i style="background:${col}">${icon}</i><span>${name}</span>${badge[id] ? `<em>${badge[id]}</em>` : ''}</button>`).join('')}</div>
      <p class="ph-tip">P to put away</p>`;
  },
  messages() {
    if (phone.thread) return PHONE_APPS.thread(phone.thread);
    const list = Object.entries(CONTACTS).filter(([, c]) => c.met());
    if (!list.length) return `${header('Messages')}<p class="ph-empty">No one's number yet. Talk to people around the city.</p>`;
    // Newest news first.
    list.sort((a, b) => unreadCount(b[0]) - unreadCount(a[0]) || (contactQuest(b[0]) ? 1 : 0) - (contactQuest(a[0]) ? 1 : 0));
    return `${header('Messages')}<ul class="ph-list">${list.map(([id, c]) => {
      const lines = contactLines(id), last = lines[lines.length - 1] || '', un = unreadCount(id), q = contactQuest(id);
      return `<li data-thread="${id}"><i class="ph-av" style="background:${avatarColor(id)}">${c.name[0]}</i><div><b>${esc(c.name)}${q ? ' <small class="ph-q">quest</small>' : ''}</b><span>${esc(last)}</span></div>${un ? `<em>${un}</em>` : ''}</li>`;
    }).join('')}</ul>`;
  },
  thread(id) {
    const c = CONTACTS[id], lines = contactLines(id), mine = (idol.chat || {})[id] || [];
    idol.seen = idol.seen || {}; idol.seen[id] = lines.length;
    const bubbles = [];
    lines.forEach((text, i) => { bubbles.push(`<p class="them">${esc(text)}</p>`); for (const r of mine.filter((m) => m.at === i + 1)) bubbles.push(`<p class="me">${esc(r.me)}</p>`, `<p class="them">${esc(r.them)}</p>`); });
    const q = contactQuest(id);
    const tracked = q && idol.tracked === q.id;
    return `<header class="ph-head"><button data-go="messages">‹</button><h3>${esc(c.name)}</h3><span></span></header>
      ${q ? `<div class="ph-qbar"><b>${esc(q.title)}</b><span>${esc(q.step())}</span><button data-track="${q.id}" class="${tracked ? 'on' : ''}">${tracked ? 'Tracking' : 'Track'}</button></div>` : ''}
      <div class="ph-chat">${bubbles.join('')}</div>
      <div class="ph-replies">${q ? '<button data-reply="where">Where do I go?</button>' : ''}<button data-reply="omw">On my way!</button><button data-reply="thanks">Thank you!</button></div>`;
  },
  quests() {
    const rows = QUESTS.map((q) => [q, questState(q)]).filter(([, s]) => s !== 'hidden');
    const sec = (name, list) => (list.length ? `<h4>${name}</h4><ul class="ph-quests">${list.map(([q, s]) => {
      const t = s !== 'done' ? q.to() : null;
      const tracked = idol.tracked === q.id;
      return `<li class="${s}${tracked ? ' tracked' : ''}"><div><b>${esc(q.title)}</b><span>${s === 'done' ? 'Done' : esc(q.step())}</span><small>${esc(CONTACTS[q.who]?.name || '')}${q.reward && s !== 'done' ? ` · ${esc(q.reward)}` : ''}</small></div>${t ? `<div class="ph-dist" data-q="${q.id}"><i style="transform:rotate(${-arrowTo(t)}rad)">➤</i><span>${distTo(t)} m</span></div><button data-track="${q.id}" class="${tracked ? 'on' : ''}">${tracked ? '✓' : 'Track'}</button>` : ''}</li>`;
    }).join('')}</ul>` : '');
    return `${header('Quests')}<div class="ph-scroll">${sec('Active', rows.filter(([, s]) => s === 'active'))}${sec('New leads', rows.filter(([, s]) => s === 'lead'))}${sec('Finished', rows.filter(([, s]) => s === 'done'))}<p class="ph-tip">Track a quest and the guide arrow follows it.</p></div>`;
  },
  map() { return `${header('Map')}<canvas class="ph-map"></canvas><p class="ph-tip">M for the big map</p>`; },
  startube() {
    const vids = idol.videos || [], total = totalViews();
    const left = 2 - uploadsToday();
    return `${header('StarTube')}<div class="ph-scroll"><div class="ph-channel"><i class="ph-av" style="background:#39d5c8">M</i><div><b>${has('joined') ? esc(G()) : 'Miku'} Official</b><span>${fmt(followers())} subscribers · ${fmt(total)} views</span></div></div>
      <div class="ph-actions"><button data-act="film" ${left <= 0 ? 'disabled' : ''}>🎥 Film a song here</button><button data-act="clip" ${left <= 0 ? 'disabled' : ''}>📱 Quick clip</button></div>
      <p class="ph-tip">${left > 0 ? `${left} upload${left > 1 ? 's' : ''} left today.` : 'No more uploads today.'} The better you sing, the more people watch. Views grow for days and turn into fame.</p>
      ${vids.map((v) => { const s = SONGS[v.song]; const place = PLACES.find((p) => p.id === v.place); const views = videoViews(v); return `<div class="ph-video"><div class="ph-thumb" style="background:linear-gradient(135deg, ${['#39d5c8', '#ff8ab8', '#ffd36a', '#b47aff'][v.id % 4]}, #10142a)"><b>${esc(s ? s.title : 'Clip')}</b><small>${v.place === 'clip' ? 'clip' : '♪'}</small></div><div><b>${esc(s ? s.title : 'A day in Tokyo')} ${v.place === 'clip' ? '(clip)' : `· live at ${esc(place ? place.name : 'Tokyo')}`}</b><span>${fmt(views)} views · Day ${v.day}</span><em>"${esc(VIDEO_COMMENTS[(v.id + Math.floor(views / 500)) % VIDEO_COMMENTS.length])}"</em></div></div>`; }).join('') || '<p class="ph-empty">No videos yet. Film one!</p>'}</div>`;
  },
  chirp() {
    const done = idol.postDay === dayNight.day;
    return `${header('Chirp')}<div class="ph-scroll"><div class="ph-channel"><i class="ph-av" style="background:#5ab0ff">M</i><div><b>@miku_in_tokyo</b><span>${fmt(followers())} followers · ${idol.posts || 0} posts</span></div></div>
      ${idol.lastPost ? `<div class="ph-post"><p>${esc(idol.lastPost.text)}</p><span>♥ ${fmt(idol.lastPost.likes)} · Day ${idol.lastPost.day}</span></div>` : ''}
      ${done ? '<p class="ph-tip">Posted today. Come back tomorrow.</p>' : `<h4>Post something today</h4><div class="ph-actions col">${postOptions().map(([title], i) => `<button data-post="${i}">${esc(title)}</button>`).join('')}</div><p class="ph-tip">One post a day keeps the fans close.</p>`}</div>`;
  },
  schedule() {
    const l = fameLevel();
    const rows = Object.entries(VENUES).map(([id, v]) => {
      const state = l < v.level ? `locked · fame Lv ${v.level + 1}` : v.once && idol.gigs[id] ? 'done' : idol.gigDay[id] === dayNight.day ? 'played today' : `${v.open[0]}:00-${Math.floor(v.open[1])}:${v.open[1] % 1 ? '30' : '00'}`;
      return `<li class="${l >= v.level ? '' : 'locked'}"><b>${esc(v.name)}</b><span>${v.kind} · ${v.cap.toLocaleString()} · ${state}</span></li>`;
    }).join('');
    const busked = idol.buskDay === dayNight.day ? idol.buskCount : 0;
    return `${header('Schedule')}<div class="ph-scroll"><p class="ph-goal"><b>Goal</b>${esc(idol.objective)}</p>
      <h4>Today</h4><ul class="ph-sched"><li><b>Busking</b><span>Station square, after 17:00 · ${busked}/${FAME.buskPerDay} today</span></li><li><b>StarTube</b><span>${2 - uploadsToday()} uploads left</span></li><li><b>Chirp</b><span>${idol.postDay === dayNight.day ? 'posted' : 'one post to make'}</span></li></ul>
      ${has('joined') ? `<h4>Stages</h4><ul class="ph-sched">${rows}</ul>` : '<p class="ph-tip">Busk in the square in the evening, help people, film songs, meet fans. Someone will notice.</p>'}</div>`;
  },
  settings() {
    let ui = 1; try { ui = parseFloat(localStorage.getItem('ui-scale')) || 1; } catch { /* fine */ }
    const cur = (() => { try { return localStorage.getItem('phone-wallpaper') || 'builtin:0'; } catch { return 'builtin:0'; } })();
    return `${header('Settings')}<div class="ph-scroll"><h4>Wallpaper</h4><div class="ph-walls">${allWalls().map((w) => `<button data-wall="${esc(w.key)}" class="${w.key === cur ? 'on' : ''}" style='background:${w.css.replace(/'/g, '%27')}'></button>`).join('')}</div>
      <p class="ph-tip">Put PNGs in the <b>phone-wallpapers</b> folder next to index.html, named 1.png, 2.png, 3.png... and they show up here. Or load them by hand:</p>
      <div class="ph-actions"><label class="ph-file">📁 Load pictures…<input type="file" accept="image/*" multiple data-pick></label></div>
      <h4>Interface size</h4><div class="ph-actions">${[0.85, 1, 1.15, 1.3].map((s) => `<button data-ui="${s}" class="${Math.abs(s - ui) < 0.01 ? 'on' : ''}">${s === 1 ? 'Normal' : `${Math.round(s * 100)}%`}</button>`).join('')}</div></div>`;
  },
};

function avatarColor(id) { const L = LOOKS[id]; return L ? `#${new THREE.Color(L.hair).getHexString()}` : id === 'teto' ? '#d8243c' : '#5a6a8a'; }

function phoneClick(e) {
  const b = e.target.closest('[data-go],[data-thread],[data-track],[data-reply],[data-act],[data-post],[data-wall],[data-ui],.ph-home');
  if (!b) return;
  if (b.classList.contains('ph-home')) { phone.app = 'home'; phone.thread = null; }
  else if (b.dataset.go) { phone.app = b.dataset.go; phone.thread = null; }
  else if (b.dataset.thread) { phone.app = 'messages'; phone.thread = b.dataset.thread; }
  else if (b.dataset.track) { idol.tracked = idol.tracked === b.dataset.track ? null : b.dataset.track; Sfx.pickup(); }
  else if (b.dataset.reply) reply(phone.thread, b.dataset.reply);
  else if (b.dataset.act === 'film') { filmVideo(); return; }
  else if (b.dataset.act === 'clip') quickClip();
  else if (b.dataset.post) makePost(+b.dataset.post);
  else if (b.dataset.wall) { setWall(b.dataset.wall); return; }
  else if (b.dataset.ui) { try { localStorage.setItem('ui-scale', b.dataset.ui); } catch { /* fine */ } applyUiScale(); }
  Sfx.swap();
  renderPhone();
}
addEventListener('change', (e) => { if (e.target.matches && e.target.matches('#phone [data-pick]')) pickWallpapers(e.target.files); });

function reply(id, kind) {
  if (!id) return;
  const q = contactQuest(id), at = contactLines(id).length;
  let me, them;
  if (kind === 'where' && q) {
    const t = q.to();
    me = 'Where should I go?';
    them = t ? `${q.step()}. I've sent you the location: follow the arrow. (${distTo(t)} m)` : q.step();
    idol.tracked = q.id;
  } else if (kind === 'omw') { me = 'On my way!'; them = ['👍', 'Hurry!', 'See you soon.', 'Good. Don\'t dawdle.'][at % 4]; }
  else { me = 'Thank you!'; them = ['❤️', 'Any time.', 'No, thank YOU.', '😊'][at % 4]; }
  idol.chat = idol.chat || {};
  (idol.chat[id] = idol.chat[id] || []).push({ at, me, them });
  if (idol.chat[id].length > 30) idol.chat[id].shift();
}

/* ---------- Each frame, in the city ---------- */
function updatePhone(dt) {
  updateVideos(dt);
  updateFans(dt);
  // A banner when someone new texts.
  phone.notify -= dt;
  if (phone.notify <= 0) {
    phone.notify = 2;
    const unread = Object.keys(CONTACTS).filter((id) => CONTACTS[id].met() && unreadCount(id) > 0);
    const n = unread.reduce((s, id) => s + unreadCount(id), 0);
    if (phone.lastUnread >= 0 && n > phone.lastUnread && unread.length) {
      const id = unread[unread.length - 1], lines = contactLines(id);
      phoneBanner(`💬 ${CONTACTS[id].name}`, `${lines[lines.length - 1]}  (P to read)`);
      Sfx.talkBlip(1.5);
    }
    phone.lastUnread = n;
  }
  if (!phone.open) return;
  if (!city.active || city.talking || show.active) { closePhone(); return; }
  phone.t += dt;
  // The distances and arrows on the quest list follow her as she walks.
  if (phone.t > 0.2) {
    phone.t = 0;
    if (phone.app === 'quests') {
      for (const d of phone.el.querySelectorAll('.ph-dist')) {
        const q = QUESTS.find((x) => x.id === d.dataset.q), t = q && q.to();
        if (!t) continue;
        d.querySelector('i').style.transform = `rotate(${-arrowTo(t)}rad)`;
        d.querySelector('span').textContent = `${distTo(t)} m`;
      }
      phone.el.querySelector('.ph-time').textContent = dayNight.clock();
    } else if (phone.app === 'map') { const c = phone.el.querySelector('canvas'); if (c) drawCityMap(c, null); }
    else if (phone.app === 'home' || phone.app === 'startube') { const s = phone.el.querySelector('.ph-scroll'); const top = s ? s.scrollTop : 0; renderPhone(); const s2 = phone.el.querySelector('.ph-scroll'); if (s2) s2.scrollTop = top; }
  }
}
