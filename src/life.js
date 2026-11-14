// Life between the story's nights: your money and days, the shop and deliveries, gifts, your
// phone (texting Miku, the photo album, your status) and the computer (shop, work, orders).
// Everything it keeps lives in the story state (Story.state), so it's saved with your progress;
// the photo album is kept on its own so it survives a new game.
const Life = (() => {
  const $ = (id) => document.getElementById(id);
  let S = null;
  const PHOTO_KEY = 'elevators-photos';

  // ---------- The shop ----------
  const DECOR = {
    neon: { name: 'Teal neon sign: ネギ ♡', price: 60, blurb: 'Hand-bent glass. Says "green onion" with a heart. Glows teal.' },
    fairy: { name: 'Fairy lights for the window', price: 35, blurb: 'Forty warm little bulbs. Like a certain roof.' },
    plush: { name: 'Leek plushie', price: 25, blurb: 'Soft, smiling, about the length of your arm.' },
    stars: { name: 'Star projector', price: 80, blurb: 'Puts a sky on your ceiling. The city ate the real ones.' },
    tank: { name: 'Little fish tank', price: 120, blurb: 'Three fish, glowing water, very calming.' },
    cushion: { name: 'Big floor cushion', price: 30, blurb: 'Pink, round, perfect for sitting by the window.' },
    poster: { name: 'Poster: Gerald, live', price: 15, blurb: 'Limited run of forty. Signed by the saw.' },
  };
  const GIFTS = {
    onions: { name: 'Green onion bouquet', price: 12, love: 3, blurb: 'Fresh from the market, wrapped in paper and ribbon.',
      react: ["A BOUQUET. OF GREEN ONIONS.", "…this is the most romantic thing that has ever happened to me. Ha!"] },
    charm: { name: 'Apple bag charm', price: 18, love: 2, blurb: 'A tiny red apple on a chain.',
      react: ["An apple! Like my bag! Now they're a set.", "You noticed my bag. Nobody notices my bag."] },
    vinyl: { name: 'Vinyl: City Pop Nights', price: 40, love: 3, blurb: 'Twelve songs for driving at 2 a.m.',
      react: ["City pop! On VINYL!", "I'm going to play this until the needle files a complaint."] },
    starmap: { name: 'Star map print', price: 22, love: 2, blurb: 'The sky over the city, the way it would look without the city.',
      react: ["Is that… is that Gerald? The star?", "You found Gerald on a map. Okay. I'm emotional now."] },
    scarf: { name: 'Lemon-yellow scarf', price: 30, love: 2, blurb: 'Soft wool, the color of the inside of a lemon.',
      react: ["It's the color of the inside of a lemon.", "You remembered. Of course you remembered."] },
    coffee: { name: 'Two fancy coffees', price: 15, love: 1, blurb: 'One sweet, one black.',
      react: ["One sweet and one black. Ha!", "I'm going to pretend I like the black one. For you."] },
    catplush: { name: 'Cat plush', price: 20, love: 2, blurb: 'Large, grumpy-faced, extremely soft.',
      react: ["He looks so grumpy. I love him.", "I'm naming him Admiral."] },
  };
  const ALL = { ...DECOR, ...GIFTS };

  // ---------- Texts from Miku ----------
  // Conversations she starts on a given home day; steps: { m } her message, { c: [...] } your reply.
  const CONVOS = {
    c3: [
      { m: 'home safe?' },
      { c: [
        { t: 'Home safe. Thanks for tonight.', a: 1, then: [{ m: "good. thank YOU. the ramen was 40% better with company" }] },
        { t: 'Safe. Still thinking about that egg.', a: 1, then: [{ m: 'the egg was delicious and i regret nothing' }, { m: 'NOTHING' }] },
      ] },
      { m: 'goodnight {name} 🌙' },
    ],
    c4: [
      { m: "i can't stop smiling" },
      { m: 'my landlord saw me on the stairs and asked if i was "okay." i said yes. i was smiling at the mailboxes' },
      { c: [
        { t: 'Thank you for the roof.', a: 1, then: [{ m: 'thank you for coming up it' }] },
        { t: "I can't stop smiling either.", a: 2, then: [{ m: 'okay good. mutual smiling. noted. 📝' }] },
      ] },
    ],
    c5: [
      { m: "sorry about tonight. i'm okay. mostly" },
      { m: 'tell me about your window. describe it. i need a nice thought before i sleep' },
      { c: [
        { t: 'Big. Too big for one person.', a: 2, then: [{ m: '…oh' }, { m: "that's a very nice thought actually" }] },
        { t: 'It looks straight at our elevator.', a: 2, then: [{ m: 'it WHAT' }, { m: "you've been holding out on me" }] },
        { t: 'Come and see it.', a: 1, then: [{ m: 'i will. soon. promise 🤞' }] },
      ] },
    ],
    c6a: [
      { m: 'i signed for the alley place' },
      { m: 'the cat is called Admiral. he bit me. i love him' },
      { c: [
        { t: 'Send me a picture of Admiral.', then: [{ m: '📷 [a very large, very offended cat]' }, { m: "he's shy" }] },
        { t: "I'm happy for you.", a: 1, then: [{ m: 'thank you. really. for everything 🌙' }] },
      ] },
    ],
  };
  const GOODNIGHT = ['night {name} 🌙', "sweet dreams. don't dream about elevators. or do", 'goodnight!! (i am going to stay up and write)', 'nighty night 🌙✨', "sleep well. i'll see you at midnight"];

  // ---------- Setup ----------
  function init(state) {
    S = state;
    fixState();
    $('phone-close').addEventListener('click', closePhone);
    $('pc-close').addEventListener('click', closePC);
    document.querySelectorAll('#phone .tabs button').forEach((b) => b.addEventListener('click', () => phoneTab(b.dataset.tab)));
    document.querySelectorAll('#pc .tabs button').forEach((b) => b.addEventListener('click', () => pcTab(b.dataset.tab)));
    document.addEventListener('keydown', (e) => {
      if (!open || performance.now() - openedAt < 250) return;
      if (open === 'work' && working) return workKey(e);
      if (e.code === 'Escape' || (open === 'phone' && (e.code === 'KeyQ' || e.code === 'Tab'))) { e.preventDefault(); open === 'phone' ? closePhone() : closePC(); }
    });
  }
  // Older saves won't have the life fields yet.
  function fixState() {
    if (S.day === undefined) S.day = 1;
    if (S.money === undefined) S.money = 150;
    S.inv = S.inv || {};
    S.owned = S.owned || [];
    S.orders = S.orders || [];
    S.thread = S.thread || [];
    S.convosDone = S.convosDone || [];
    S.given = S.given || [];
    if (S.pendingConvo === undefined) S.pendingConvo = null;
  }
  const fill = (t) => t.replace(/\{name\}/g, S.name || 'you');
  const hearts = () => Math.max(0, Math.min(5, Math.floor(S.aff / 7)));
  const heartStr = () => '♥'.repeat(hearts()) + '♡'.repeat(5 - hearts());
  const money = (n) => '$' + n;

  function toast(text, secs = 3.5) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), secs * 1000);
    setTimeout(() => t.remove(), secs * 1000 + 600);
  }

  // ---------- HUD ----------
  function hud(on) { $('hud').classList.toggle('hidden', !on); refresh(); }
  function refresh() {
    $('hud-day').textContent = 'Day ' + S.day;
    $('hud-money').textContent = money(S.money);
    $('hud-hearts').textContent = heartStr();
    const unread = !!S.pendingConvo;
    $('hud-phone').classList.toggle('unread', unread);
  }

  // ---------- Days ----------
  // A new day at home: deliveries arrive, and maybe a text from her.
  function startDay(convoKey) {
    fixState();
    const arrived = S.orders.filter((o) => o.day < S.day);
    S.orders = S.orders.filter((o) => o.day >= S.day);
    const names = [];
    for (const o of arrived) {
      if (o.to === 'miku') { giftToMiku(o.id, true); continue; }
      if (DECOR[o.id]) { if (!S.owned.includes(o.id)) S.owned.push(o.id); }
      else S.inv[o.id] = (S.inv[o.id] || 0) + 1;
      names.push(ALL[o.id].name);
    }
    showDecor();
    if (names.length) setTimeout(() => { Sound.blip('door'); toast('📦 Delivered: ' + names.join(', ')); }, 1200);
    if (convoKey && CONVOS[convoKey] && !S.convosDone.includes(convoKey)) {
      S.pendingConvo = convoKey;
      setTimeout(() => { Sound.blip('buzz'); toast('💬 New message from Miku · press Q'); refresh(); }, 2500);
    }
    S.goodnightToday = false;
    S.workedToday = false;
    refresh();
  }
  function endDay() { S.day++; refresh(); }
  function showDecor() { fixState(); for (const id in Game.places.home.decor) Game.places.home.decor[id].visible = S.owned.includes(id); }

  // ---------- Gifts ----------
  // Given in person (she reacts there and then) or shipped to her (she texts you).
  function giftToMiku(id, shipped) {
    const g = GIFTS[id];
    const again = S.given.includes(id);
    const gain = again ? (g.love > 2 ? 1 : 0) : g.love;
    S.aff += gain;
    if (!again) S.given.push(id);
    const lines = again ? ["Another one? I'm starting a collection. Ha!"] : g.react;
    if (shipped) {
      S.thread.push({ from: 'm', text: '📦 something just came to my door…' });
      for (const l of lines) S.thread.push({ from: 'm', text: l.toLowerCase() });
      S.thread.push({ from: 'm', text: 'thank you, ' + (S.name || 'you') + ' ♡' });
      setTimeout(() => { Sound.blip('msg'); toast('💬 Miku got your gift!'); }, 3500);
    }
    if (gain) setTimeout(() => Sound.blip('heart'), shipped ? 3600 : 300);
    refresh();
    return lines;
  }
  const giftsInBag = () => Object.keys(S.inv).filter((k) => S.inv[k] > 0 && GIFTS[k]);
  function takeGift(id) { S.inv[id]--; refresh(); }

  // ---------- Phone ----------
  let open = null, openedAt = 0;
  function openPhone() {
    if (open) return;
    open = 'phone';
    openedAt = performance.now();
    Game.openUI();
    Sound.blip('tick');
    $('phone').classList.remove('hidden');
    phoneTab(S.pendingConvo ? 'msgs' : $('phone').dataset.tab || 'msgs');
  }
  function closePhone() {
    if (open !== 'phone' || convoRunning) return;
    open = null;
    $('phone').classList.add('hidden');
    Game.closeUI();
    refresh();
  }
  function phoneTab(tab) {
    $('phone').dataset.tab = tab;
    document.querySelectorAll('#phone .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const body = $('phone-body');
    if (tab === 'msgs') renderThread();
    else if (tab === 'photos') {
      const photos = loadPhotos();
      body.innerHTML = photos.length ? '<div class="album">' + photos.map((p) => `<figure><img src="${p.src}" alt=""><figcaption>${p.cap}</figcaption></figure>`).join('') + '</div>'
        : '<p class="empty">No photos yet. Memories will show up here.</p>';
    } else {
      const words = ['Strangers in an elevator', 'Getting to know each other', 'Something there', 'Falling for each other', 'Head over heels', 'Inseparable'][hearts()];
      body.innerHTML = `<div class="status">
        <p class="big">${heartStr()}</p><p>${words}</p>
        <dl><dt>Day</dt><dd>${S.day}</dd><dt>Wallet</dt><dd>${money(S.money)}</dd>
        <dt>Gifts in your bag</dt><dd>${giftsInBag().map((k) => GIFTS[k].name + (S.inv[k] > 1 ? ' ×' + S.inv[k] : '')).join(', ') || 'none'}</dd>
        <dt>Coming tomorrow</dt><dd>${S.orders.map((o) => ALL[o.id].name + (o.to === 'miku' ? ' (to Miku)' : '')).join(', ') || 'nothing'}</dd></dl>
        <p class="hint">Q / Esc closes the phone.</p></div>`;
    }
  }

  let convoRunning = false;
  function renderThread() {
    const body = $('phone-body');
    if (!S.flags.number) { body.innerHTML = '<p class="empty">No messages. You don\'t have her number yet.</p>'; return; }
    body.innerHTML = '<div class="thread"></div><div class="replies"></div>';
    const th = body.querySelector('.thread');
    for (const m of S.thread) th.insertAdjacentHTML('beforeend', `<p class="bubble ${m.from}">${esc(fill(m.text))}</p>`);
    th.scrollTop = th.scrollHeight;
    if (S.pendingConvo) runConvo(S.pendingConvo);
    else replies();
  }
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function say(from, text) {
    S.thread.push({ from, text });
    if (S.thread.length > 60) S.thread.shift();
    const th = document.querySelector('#phone-body .thread');
    if (th) { th.insertAdjacentHTML('beforeend', `<p class="bubble ${from}">${esc(fill(text))}</p>`); th.scrollTop = th.scrollHeight; }
  }
  async function typing(ms) {
    const th = document.querySelector('#phone-body .thread');
    if (!th) return;
    th.insertAdjacentHTML('beforeend', '<p class="bubble m typing"><span></span><span></span><span></span></p>');
    th.scrollTop = th.scrollHeight;
    await new Promise((r) => setTimeout(r, ms));
    const t = th.querySelector('.typing'); if (t) t.remove();
  }
  async function runConvo(key) {
    if (convoRunning) return;
    convoRunning = true;
    S.pendingConvo = null;
    S.convosDone.push(key);
    const rep = document.querySelector('#phone-body .replies');
    const run = async (steps) => {
      for (const s of steps) {
        if (s.m) { await typing(500 + s.m.length * 22); say('m', s.m); Sound.blip('msg'); if (/\bha\b|haha/i.test(s.m)) Sound.laugh(); }
        else if (s.c) {
          const choice = await new Promise((resolve) => {
            rep.innerHTML = s.c.map((c, i) => `<button data-i="${i}">${esc(fill(c.t))}</button>`).join('');
            rep.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => resolve(s.c[Number(b.dataset.i)])));
          });
          rep.innerHTML = '';
          say('y', choice.t);
          if (choice.a) { S.aff += choice.a; Sound.blip('heart'); }
          if (choice.then) await run(choice.then);
        }
      }
    };
    await run(CONVOS[key]);
    convoRunning = false;
    refresh();
    replies();
  }
  function replies() {
    const rep = document.querySelector('#phone-body .replies');
    if (!rep) return;
    const opts = [];
    if (!S.goodnightToday) opts.push(['Say goodnight 🌙', async () => {
      S.goodnightToday = true; rep.innerHTML = '';
      say('y', 'Goodnight, Miku 🌙');
      if (!S.flags.gn || S.flags.gn < 4) { S.aff += 1; S.flags.gn = (S.flags.gn || 0) + 1; }
      await typing(1400);
      say('m', GOODNIGHT[(S.day + S.thread.length) % GOODNIGHT.length]); Sound.blip('msg');
      replies();
    }]);
    rep.innerHTML = opts.map((o, i) => `<button data-i="${i}">${o[0]}</button>`).join('');
    rep.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => opts[Number(b.dataset.i)][1]()));
  }

  // ---------- Photos ----------
  function loadPhotos() { try { return JSON.parse(localStorage.getItem(PHOTO_KEY)) || []; } catch (e) { return []; } }
  function addPhoto(src, cap) {
    const photos = loadPhotos().filter((p) => p.cap !== cap);
    photos.push({ src, cap });
    while (photos.length > 14) photos.shift();
    try { localStorage.setItem(PHOTO_KEY, JSON.stringify(photos)); } catch (e) { /* full or blocked */ }
  }

  // ---------- Computer ----------
  function openPC() {
    if (open) return;
    open = 'pc';
    openedAt = performance.now();
    Game.openUI();
    Sound.blip('tick');
    $('pc').classList.remove('hidden');
    pcTab($('pc').dataset.tab || 'shop');
  }
  function closePC() {
    if (open !== 'pc' && open !== 'work') return;
    if (working) return;
    open = null;
    $('pc').classList.add('hidden');
    Game.closeUI();
    refresh();
  }
  function pcTab(tab) {
    if (working) return;
    open = 'pc';
    $('pc').dataset.tab = tab;
    document.querySelectorAll('#pc .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('pc-wallet').textContent = money(S.money);
    const body = $('pc-body');
    if (tab === 'shop') {
      const card = (id, it, kind) => `<div class="item"><div class="art art-${id}"></div><h4>${it.name}</h4><p>${it.blurb}</p>
        <p class="price">${money(it.price)}</p>
        ${kind === 'decor' && (S.owned.includes(id) || S.orders.some((o) => o.id === id))
          ? '<button disabled>Owned</button>'
          : `<button data-buy="${id}" data-to="home">Buy · ship home</button>${kind === 'gift' && S.flags.number ? `<button data-buy="${id}" data-to="miku">Send to Miku</button>` : ''}`}
      </div>`;
      body.innerHTML = '<h3>Lumen Mart</h3><p class="sub">Order tonight, delivered tomorrow.</p>'
        + '<h4 class="sect">For your place</h4><div class="grid">' + Object.entries(DECOR).map(([k, v]) => card(k, v, 'decor')).join('') + '</div>'
        + '<h4 class="sect">Gifts for her</h4><div class="grid">' + Object.entries(GIFTS).map(([k, v]) => card(k, v, 'gift')).join('') + '</div>';
      body.querySelectorAll('button[data-buy]').forEach((b) => b.addEventListener('click', () => buy(b.dataset.buy, b.dataset.to)));
    } else if (tab === 'work') {
      body.innerHTML = S.workedToday
        ? '<h3>NightShift Data Entry</h3><p class="sub">You\'ve done your shift for today. Come back tomorrow.</p>'
        : `<h3>NightShift Data Entry</h3><p class="sub">Type the words as they come up. $3 a word, 40 seconds. Once a day.</p><button id="work-go" class="primary">Start shift</button>`;
      const go = $('work-go'); if (go) go.addEventListener('click', startWork);
    } else {
      body.innerHTML = '<h3>Orders</h3>' + (S.orders.length
        ? '<ul class="orders">' + S.orders.map((o) => `<li>${ALL[o.id].name} → ${o.to === 'miku' ? 'Miku' : 'home'} · arrives tomorrow</li>`).join('') + '</ul>'
        : '<p class="sub">Nothing on the way.</p>');
    }
  }
  function buy(id, to) {
    const it = ALL[id];
    if (S.money < it.price) { toast("You can't afford that yet. Try a shift at work."); return; }
    S.money -= it.price;
    S.orders.push({ id, to, day: S.day });
    Sound.blip('coin');
    toast(`Ordered: ${it.name}${to === 'miku' ? ' (to Miku)' : ''}. Arrives tomorrow.`);
    pcTab('shop');
    refresh();
  }

  // The typing job.
  const WORDS = ['invoice', 'elevator', 'midnight', 'window', 'receipt', 'ledger', 'ramen', 'tower', 'skyline', 'quarterly', 'spreadsheet', 'parcel', 'neon', 'subway', 'coffee', 'records', 'schedule', 'balance', 'harbor', 'signal', 'lantern', 'meeting', 'archive', 'payroll', 'shipment', 'deadline', 'printer', 'stapler', 'memo', 'budget'];
  let working = false, workWord = '', typed = '', workEnd = 0, earned = 0, workTimer = 0;
  function startWork() {
    working = true; open = 'work'; earned = 0; typed = '';
    workEnd = performance.now() + 40000;
    nextWord();
    workTimer = setInterval(drawWork, 100);
  }
  function nextWord() { workWord = WORDS[Math.floor(Math.random() * WORDS.length)]; typed = ''; drawWork(); }
  function drawWork() {
    const left = Math.max(0, (workEnd - performance.now()) / 1000);
    $('pc-body').innerHTML = `<h3>NightShift Data Entry</h3><p class="sub">${left.toFixed(1)}s left · earned ${money(earned)}</p>
      <p class="word"><span class="done">${workWord.slice(0, typed.length)}</span>${workWord.slice(typed.length)}</p><p class="sub">Just type.</p>`;
    if (left <= 0) finishWork();
  }
  function workKey(e) {
    if (!/^[a-z]$/i.test(e.key)) return;
    e.preventDefault();
    if (workWord[typed.length] === e.key.toLowerCase()) {
      typed += e.key.toLowerCase();
      Sound.blip('tick');
      if (typed === workWord) { earned += 3; nextWord(); }
      else drawWork();
    }
  }
  function finishWork() {
    clearInterval(workTimer);
    working = false;
    S.workedToday = true;
    S.money += earned;
    if (earned) Sound.blip('coin');
    $('pc-body').innerHTML = `<h3>Shift over</h3><p class="sub">You earned ${money(earned)}. ${earned >= 45 ? 'Your manager sends a thumbs-up emoji. Wow.' : earned ? 'Not bad.' : 'You mostly stared out of the window.'}</p>`;
    $('pc-wallet').textContent = money(S.money);
    open = 'pc';
    refresh();
  }

  return {
    init, hud, refresh, startDay, endDay, showDecor, toast,
    openPhone, openPC, addPhoto, giftToMiku, giftsInBag, takeGift,
    get isOpen() { return !!open; },
    GIFTS, DECOR,
  };
})();
