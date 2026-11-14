// Daily life in town: the clock (and with it day and night), the shops' counters, your bag of
// food, and cooking in your kitchen, with little minigames for each step of a recipe.
const Town = (() => {
  const $ = (id) => document.getElementById(id);
  let S = null;

  // ---------- The clock ----------
  // Time passes while you're out and about: one minute of game time for each real second.
  let running = false;
  const clockStr = (h) => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); const ap = hh < 12 ? 'AM' : 'PM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
  function daylight(h) {
    h = ((h % 24) + 24) % 24;
    if (h >= 7 && h < 17) return 1;
    if (h >= 17 && h < 20.5) return 1 - (h - 17) / 3.5;
    if (h >= 5 && h < 7) return (h - 5) / 2;
    return 0;
  }
  let goal = '';
  function tick(dt) {
    if (!S) return;
    if (S.clock === undefined) S.clock = 22;
    if (running) S.clock += dt / 60;
    Game.setDaylight(daylight(S.clock));
    $('hud-time').textContent = (daylight(S.clock) > 0.5 ? '☀ ' : '☾ ') + clockStr(S.clock);
  }
  function setGoal(t) { goal = t; $('hud-goal').textContent = t || ''; $('hud-goal').classList.toggle('hidden', !t); }
  const advance = (hours) => { S.clock += hours; };
  const isNight = () => { const h = ((S.clock % 24) + 24) % 24; return h >= 21 || h < 5; };

  // ---------- Food and stores ----------
  const FOOD = {
    rice: { name: 'Rice (2 kg bag)', price: 6, icon: '🍚', ingredient: true },
    eggs: { name: 'Eggs (6)', price: 4, icon: '🥚', ingredient: true },
    negi: { name: 'Green onions', price: 2, icon: '🥬', ingredient: true },
    nori: { name: 'Nori sheets', price: 3, icon: '🟩', ingredient: true },
    noodles: { name: 'Fresh ramen noodles', price: 4, icon: '🍜', ingredient: true },
    chicken: { name: 'Chicken thigh', price: 6, icon: '🍗', ingredient: true },
    roux: { name: 'Curry roux', price: 4, icon: '🟫', ingredient: true },
    ketchup: { name: 'Ketchup', price: 2, icon: '🥫', ingredient: true },
    salmon: { name: 'Salmon fillet', price: 7, icon: '🐟', ingredient: true },
    melonpan: { name: 'Melon bread', price: 2, icon: '🍈', snack: 'Crunchy sugar crust, fluffy inside. Perfect.' },
    pudding: { name: 'Custard pudding', price: 2, icon: '🍮', snack: 'It wobbles. You wobble back.' },
    onigiri_s: { name: 'Konbini onigiri (tuna mayo)', price: 2, icon: '🍙', snack: 'You open it with the three-step wrapper perfectly. First try.' },
    coffee_can: { name: 'Canned coffee', price: 1, icon: '☕', snack: 'Hot from the machine. It tastes like a parking garage. Somehow that\'s comforting now.' },
  };
  const STORES = {
    konbini: { title: 'Hoshi Mart 星マート', sub: 'Open all night. The bell over the door sings when you walk in.', items: ['rice', 'eggs', 'negi', 'nori', 'noodles', 'chicken', 'roux', 'ketchup', 'salmon', 'melonpan', 'pudding', 'onigiri_s', 'coffee_can'] },
    ramen: { title: 'Menya Tsuki 麺屋 月', sub: 'Eight seats at the counter. The broth has been going since six this morning.', eat: [
      ['Shoyu ramen', 8, 'Clear, deep, salty-sweet. The noodles have bite. You drink the broth to the bottom.'],
      ['Miso ramen', 9, 'Thick and warming, with sweetcorn and butter melting in. You feel fixed.'],
      ['Spicy miso, extra negi', 10, "Your mouth is on fire and it's wonderful. The chef nods at your empty bowl."]] },
    cafe: { title: 'Kissa Lumen 喫茶ルーメン', sub: 'Jazz on a crackly speaker. A cat sleeps on the windowsill.', eat: [
      ['Hand-drip coffee', 4, 'The owner pours it in slow circles. It tastes like a rainy afternoon.'],
      ['Cream soda float', 5, 'Melon-green, with a scoop of vanilla on top. You are a child again for ten minutes.'],
      ['Thick toast with butter', 5, 'Inch-thick, golden, dripping. A national treasure.']], buy: [['coffee', 15]] },
    florist: { title: 'Hanaya 花屋', sub: 'Buckets of blooms all the way to the ceiling. It smells like spring.', gifts: ['onions', 'flowers'] },
    records: { title: 'Kairo Records', sub: 'Crates of vinyl, a listening station, and a clerk who will absolutely judge you.', gifts: ['vinyl', 'citypop2'] },
  };

  // ---------- The store panel ----------
  function store(id) {
    const st = STORES[id];
    Game.openUI();
    Sound.blip('tick');
    $('store').classList.remove('hidden');
    $('store-title').textContent = st.title;
    $('store-sub').textContent = st.sub;
    draw();
    function draw() {
      $('store-wallet').textContent = '$' + S.money;
      let html = '';
      if (st.items) html += '<div class="shelf">' + st.items.map((k) => { const f = FOOD[k]; return `<button class="good" data-buy="${k}"><span class="ico">${f.icon}</span><b>${f.name}</b><i>$${f.price}</i><small>${S.food[k] ? 'have ' + S.food[k] : f.ingredient ? 'ingredient' : 'snack'}</small></button>`; }).join('') + '</div>';
      if (st.eat) html += '<div class="menu-list">' + st.eat.map(([n, p], i) => `<button class="good wide" data-eat="${i}"><span class="ico">${id === 'ramen' ? '🍜' : '☕'}</span><b>${n}</b><i>$${p}</i><small>eat here</small></button>`).join('') + '</div>';
      if (st.gifts) html += '<div class="shelf">' + st.gifts.map((k) => { const g = Life.GIFTS[k]; return `<button class="good" data-gift="${k}"><span class="ico">${k === 'vinyl' || k === 'citypop2' ? '💿' : k === 'onions' ? '💐' : '🌷'}</span><b>${g.name}</b><i>$${g.price}</i><small>${S.inv[k] ? 'have ' + S.inv[k] : 'gift for Miku'}</small></button>`; }).join('') + '</div>';
      $('store-body').innerHTML = html;
      $('store-body').querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.buy, f = FOOD[k];
        if (S.money < f.price) return Life.toast("Not enough money. There's work on your computer.");
        S.money -= f.price; S.food[k] = (S.food[k] || 0) + 1; Sound.blip('coin'); draw(); Life.refresh();
      }));
      $('store-body').querySelectorAll('[data-eat]').forEach((b) => b.addEventListener('click', () => {
        const [n, p, line] = st.eat[Number(b.dataset.eat)];
        if (S.money < p) return Life.toast('Not enough money.');
        S.money -= p; advance(0.6); Sound.blip('coin'); close(); Life.refresh();
        Life.toast(`${n}: ${line}`, 6);
      }));
      $('store-body').querySelectorAll('[data-gift]').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.gift, g = Life.GIFTS[k];
        if (S.money < g.price) return Life.toast('Not enough money.');
        S.money -= g.price; S.inv[k] = (S.inv[k] || 0) + 1; Sound.blip('coin'); draw(); Life.refresh();
        Life.toast(`${g.name}: in your bag. Give it to Miku in person.`);
      }));
    }
    const close = () => { $('store').classList.add('hidden'); Game.closeUI(); advance(0.25); };
    $('store-close').onclick = close;
  }
  function vending() {
    if (S.money < 1) return Life.toast('Not even a coin. Ouch.');
    S.money -= 1; S.food.coffee_can = (S.food.coffee_can || 0) + 1; Sound.blip('coin'); Life.refresh();
    Life.toast('☕ Clunk. A hot can of coffee rolls out. In your bag.');
  }
  function eat(k) {
    const f = FOOD[k] || DISHES[k];
    S.food[k]--; advance(0.25);
    Life.toast(`${f.icon} ${f.snack || f.eat}`, 5);
    Life.refresh();
  }

  // ---------- Cooking ----------
  const DISHES = {
    onigiri: { name: 'Salmon onigiri', icon: '🍙', needs: ['rice', 'nori', 'salmon'], steps: ['heat', 'chop', 'shape'], eat: 'Still warm, perfectly salty. You made that.', react: ["You made onigiri? With your HANDS?", "It's a little lopsided. That's how I know it's real. Ha!"] },
    tamago: { name: 'Tamagoyaki', icon: '🍳', needs: ['eggs', 'negi'], steps: ['chop', 'stir', 'shape'], eat: 'Sweet, soft layers. Like a little golden book.', react: ["Tamagoyaki! My grandma used to make this.", "…It's really good. You have to make it again."] },
    omurice: { name: 'Omurice', icon: '🍛', needs: ['rice', 'eggs', 'chicken', 'ketchup'], steps: ['chop', 'heat', 'stir', 'shape'], eat: 'Fluffy egg blanket, ketchup rice. You drew a heart on it. For yourself. It still counts.', react: ["You drew a heart on it.", "I can't eat it now. It's too cute. …Okay I'm eating it."] },
    ramen_h: { name: 'Homemade ramen', icon: '🍜', needs: ['noodles', 'eggs', 'negi'], steps: ['heat', 'chop', 'stir'], eat: 'Not as good as Menya Tsuki. But it\'s yours, and it\'s 1 a.m., and it\'s perfect.', react: ["Extra green onions!! You know me.", "The old man at the stall would be proud. Maybe."] },
    curry: { name: 'Chicken curry', icon: '🍛', needs: ['roux', 'chicken', 'rice'], steps: ['chop', 'heat', 'stir', 'stir'], eat: 'Thick, mellow, a little sweet. The whole apartment smells like a Sunday.', react: ["Curry! The apartment smells like a Sunday.", "Can we have this every Sunday? That's not a question. We're having it every Sunday."] },
  };
  const STEP_NAMES = { chop: 'Chop', stir: 'Stir', heat: 'Heat', shape: 'Shape' };
  let cookDone = null;

  function cook(onDone) {
    cookDone = onDone || null;
    Game.openUI();
    $('cook').classList.remove('hidden');
    Game.places.home.hob(true);
    pickRecipe();
  }
  function closeCook() {
    $('cook').classList.add('hidden');
    Game.places.home.hob(false);
    Game.closeUI();
    const d = cookDone; cookDone = null; if (d) d();
  }
  function pickRecipe() {
    const body = $('cook-body');
    $('cook-title').textContent = "What's for dinner?";
    body.innerHTML = '<div class="recipes">' + Object.entries(DISHES).map(([k, d]) => {
      const have = d.needs.every((n) => (S.food[n] || 0) > 0);
      return `<button class="recipe${have ? '' : ' missing'}" data-r="${k}"><span class="big">${d.icon}</span><b>${d.name}</b>
        <span class="needs">${d.needs.map((n) => `<em class="${(S.food[n] || 0) > 0 ? 'ok' : 'no'}">${FOOD[n].icon} ${FOOD[n].name.split(' (')[0]}</em>`).join('')}</span>
        <span class="steps">${d.steps.map((s) => STEP_NAMES[s]).join(' → ')}</span></button>`;
    }).join('') + '</div><p class="cook-note">Ingredients come from Hoshi Mart, down the street.</p>';
    body.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
      const d = DISHES[b.dataset.r];
      if (!d.needs.every((n) => (S.food[n] || 0) > 0)) return Life.toast("You're missing something. Hoshi Mart has it.");
      d.needs.forEach((n) => S.food[n]--);
      runSteps(b.dataset.r);
    }));
    $('cook-close').onclick = closeCook;
  }

  // Each step is a little game scored 0..1.
  async function runSteps(key) {
    const d = DISHES[key];
    const scores = [];
    for (let i = 0; i < d.steps.length; i++) {
      $('cook-title').textContent = `${d.icon} ${d.name} · step ${i + 1} of ${d.steps.length}: ${STEP_NAMES[d.steps[i]]}`;
      scores.push(await GAMES[d.steps[i]](d));
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stars = avg > 0.8 ? 3 : avg > 0.5 ? 2 : 1;
    S.food[key] = (S.food[key] || 0) + 1;
    advance(1);
    Sound.blip(stars === 3 ? 'heart' : 'coin');
    $('cook-title').textContent = 'Done!';
    $('cook-body').innerHTML = `<div class="plated"><div class="plate"><span>${d.icon}</span></div>
      <h3>${d.name}</h3><p class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
      <p>${['A bit rough, but edible. Probably.', 'Nicely done. It smells amazing.', 'Perfect. Restaurant quality. You should open a stall.'][stars - 1]}</p>
      <p class="cook-note">In your bag. Eat it from your phone, or share it with Miku.</p>
      <div class="row"><button class="primary" id="cook-again">Cook something else</button><button id="cook-finish">Done</button></div></div>`;
    $('cook-again').onclick = pickRecipe;
    $('cook-finish').onclick = closeCook;
  }

  const stage = (inner) => { $('cook-body').innerHTML = `<div class="stage">${inner}</div>`; return $('cook-body').querySelector('.stage'); };
  const GAMES = {
    // Chop: a knife sweeps across the board; click as it passes each mark.
    chop: (d) => new Promise((resolve) => {
      const el = stage(`<p class="how">Click as the knife crosses each <b>green mark</b>.</p>
        <div class="board"><span class="food">${FOOD[d.needs[d.needs.length - 1]].icon}</span><i class="knife">🔪</i></div><p class="tally"></p>`);
      const board = el.querySelector('.board'), knife = el.querySelector('.knife');
      const marks = [0.2, 0.42, 0.63, 0.84];
      marks.forEach((m) => board.insertAdjacentHTML('beforeend', `<b class="mark" style="left:${m * 100}%"></b>`));
      let t = 0, hits = 0, done = 0, last = performance.now(), dir = 1, pos = 0, raf;
      const step = (now) => {
        const dt = (now - last) / 1000; last = now;
        pos += dir * dt * 0.55; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
        knife.style.left = pos * 100 + '%';
        t += dt; raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      board.addEventListener('mousedown', () => {
        const m = marks.findIndex((x, i) => !board.querySelectorAll('.mark')[i].classList.contains('cut') && Math.abs(x - pos) < 0.05);
        Sound.blip('tick');
        knife.classList.remove('chop'); void knife.offsetWidth; knife.classList.add('chop');
        if (m >= 0) { hits++; board.querySelectorAll('.mark')[m].classList.add('cut'); }
        done++;
        el.querySelector('.tally').textContent = `${hits} clean cuts`;
        if (hits === marks.length || done >= marks.length + 3) { cancelAnimationFrame(raf); setTimeout(() => resolve(hits / marks.length), 450); }
      });
    }),
    // Stir: hold the mouse down and circle the pan until it's done (not too fast, not too slow).
    stir: () => new Promise((resolve) => {
      const el = stage(`<p class="how">Hold the mouse button and <b>stir in circles</b> round the pan.</p>
        <div class="pan"><div class="pan-in"><span class="swirl"></span></div></div><div class="meter"><i></i></div>`);
      const pan = el.querySelector('.pan'), bar = el.querySelector('.meter i'), sw = el.querySelector('.swirl');
      let down = false, prevA = null, prog = 0, start = performance.now(), splash = 0;
      pan.addEventListener('mousedown', () => { down = true; });
      window.addEventListener('mouseup', () => { down = false; prevA = null; }, { once: false });
      pan.addEventListener('mousemove', (e) => {
        if (!down) return;
        const r = pan.getBoundingClientRect();
        const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        if (prevA !== null) {
          let da = a - prevA; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) > 0.6) splash++;
          prog += Math.abs(da) / (Math.PI * 2 * 6);
          sw.style.transform = `rotate(${a}rad)`;
        }
        prevA = a;
        bar.style.width = Math.min(100, prog * 100) + '%';
        if (prog >= 1) {
          const secs = (performance.now() - start) / 1000;
          resolve(Math.max(0.2, Math.min(1, 1 - splash * 0.03 - Math.max(0, secs - 9) * 0.05)));
          prevA = null; down = false; prog = -99;
        }
      });
    }),
    // Heat: a needle swings across the gauge; click when it's in the golden zone.
    heat: () => new Promise((resolve) => {
      const el = stage(`<p class="how">Click when the needle is in the <b>golden zone</b>. Three tries.</p>
        <div class="gauge"><span class="zone"></span><i class="needle"></i></div><p class="tally"></p>`);
      const needle = el.querySelector('.needle'), g = el.querySelector('.gauge');
      let a = 0, dir = 1, last = performance.now(), raf, tries = 0, best = 0;
      const step = (now) => { const dt = (now - last) / 1000; last = now; a += dir * dt * 1.6; if (a > 1) { a = 1; dir = -1; } if (a < 0) { a = 0; dir = 1; } needle.style.transform = `rotate(${-80 + a * 160}deg)`; raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
      g.addEventListener('mousedown', () => {
        tries++;
        const sc = Math.max(0, 1 - Math.abs(a - 0.7) / 0.18);
        best = Math.max(best, sc);
        Sound.blip(sc > 0.6 ? 'coin' : 'tick');
        el.querySelector('.tally').textContent = sc > 0.8 ? 'Perfect sizzle!' : sc > 0.4 ? 'Pretty good.' : 'Too ' + (a < 0.7 ? 'cool.' : 'hot!');
        if (sc > 0.8 || tries >= 3) { cancelAnimationFrame(raf); setTimeout(() => resolve(best), 500); }
      });
    }),
    // Shape: hold to press it together; let go when the ring is in the marked band.
    shape: (d) => new Promise((resolve) => {
      const el = stage(`<p class="how">Hold to press, and <b>let go in the marked band</b>.</p>
        <div class="press"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="track"/><circle cx="60" cy="60" r="50" class="band"/><circle cx="60" cy="60" r="50" class="fill"/></svg><span>${d.icon}</span></div><p class="tally"></p>`);
      const fill = el.querySelector('.fill'), pr = el.querySelector('.press');
      const C = 2 * Math.PI * 50;
      fill.style.strokeDasharray = C; fill.style.strokeDashoffset = C;
      let p = 0, holding = false, raf, last;
      const step = (now) => { const dt = (now - last) / 1000; last = now; if (holding) p = Math.min(1.1, p + dt * 0.55); fill.style.strokeDashoffset = C * (1 - Math.min(1, p)); raf = requestAnimationFrame(step); };
      pr.addEventListener('mousedown', () => { holding = true; last = performance.now(); raf = requestAnimationFrame(step); });
      const up = () => {
        if (!holding) return; holding = false; cancelAnimationFrame(raf);
        window.removeEventListener('mouseup', up);
        const sc = Math.max(0.15, 1 - Math.abs(p - 0.8) / 0.25);
        el.querySelector('.tally').textContent = sc > 0.8 ? 'Just right!' : p < 0.8 ? 'A little loose.' : 'Squished!';
        setTimeout(() => resolve(sc), 500);
      };
      window.addEventListener('mouseup', up);
    }),
  };

  // ---------- Your bag (on the phone) ----------
  function bagHtml() {
    const rows = Object.keys(S.food || {}).filter((k) => S.food[k] > 0 && (DISHES[k] || (FOOD[k] && FOOD[k].snack)))
      .map((k) => { const f = DISHES[k] || FOOD[k]; return `<li><span>${f.icon} ${f.name}${S.food[k] > 1 ? ' ×' + S.food[k] : ''}</span><button data-eat="${k}">Eat</button></li>`; });
    const ing = Object.keys(S.food || {}).filter((k) => S.food[k] > 0 && FOOD[k] && FOOD[k].ingredient).map((k) => `${FOOD[k].icon} ${FOOD[k].name.split(' (')[0]}${S.food[k] > 1 ? ' ×' + S.food[k] : ''}`);
    return `<h4>Food</h4>${rows.length ? '<ul class="bag">' + rows.join('') + '</ul>' : '<p class="empty-s">Nothing to eat. Hoshi Mart is down the street.</p>'}
      <h4>Ingredients</h4><p class="ing">${ing.join(' · ') || 'none'}</p>`;
  }
  const dishesInBag = () => Object.keys(DISHES).filter((k) => (S.food[k] || 0) > 0);

  function init(state) { S = state; }
  function fix() { S.food = S.food || {}; if (S.clock === undefined) S.clock = 22; }

  return {
    init, fix, tick, setGoal, advance, isNight, daylight, clockStr,
    set running(v) { running = v; }, get running() { return running; },
    store, vending, eat, cook, bagHtml, dishesInBag, DISHES, FOOD,
  };
})();
