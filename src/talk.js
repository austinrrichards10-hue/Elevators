// The dialogue box and the script runner the story is written in.
//
// A script is an array of steps, run in order:
//   "m: text"   Miku says it          "n: text"   narration (no speaker)
//   "y: text"   you say it            "s: text"   a line she sings
//   { c: [ { t: 'choice text', a: 1, set: 'flag', then: [...steps] }, ... ] }   a choice
//        a: affection gained (or lost); set: a flag to remember; then: what follows it.
//        { if: (S) => bool } on a choice shows it only when true.
//   { if: (S) => bool, then: [...], else: [...] }
//   { do: (S) => {...} }      run some code (camera, music, where she stands...)
//   { wait: seconds }         a pause with the box hidden
//   { name: true }            ask the player's name
// {name} in any text is replaced with the player's name.
// E / Space / Enter / click moves the text on; 1-9 or click picks a choice.
const Talk = (() => {
  let el, nameEl, textEl, choicesEl, moreEl, nameBox, nameInput;
  let S = null;                 // the story state (affection, flags, name)
  let stack = [], onDone = null, running = false;
  let line = null, shown = 0, typing = false, choices = null, waitT = 0, asking = false;
  let current = null, lineCount = 0;      // the line on screen now, for her gestures

  function init(state) {
    S = state;
    el = document.getElementById('talk');
    nameEl = el.querySelector('.talk-name');
    textEl = el.querySelector('.talk-text');
    choicesEl = el.querySelector('.talk-choices');
    moreEl = el.querySelector('.talk-more');
    nameBox = document.getElementById('namebox');
    nameInput = nameBox.querySelector('input');
    el.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li && choices) pick(Number(li.dataset.n));
      else advance();
    });
    nameBox.addEventListener('submit', (e) => { e.preventDefault(); submitName(); });
  }

  const fill = (t) => t.replace(/\{name\}/g, S.name || 'you');

  function run(script, done) {
    stack = [{ steps: script, i: 0 }];
    onDone = done;
    running = true;
    step();
  }

  // Runs steps until one needs the player (a line, a choice, a wait).
  function step() {
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.i >= top.steps.length) { stack.pop(); continue; }
      const s = top.steps[top.i++];
      if (typeof s === 'string') { show(s); return; }
      if (s.c) { offer(s.c); return; }
      if (s.if) { const b = s.if(S) ? s.then : s.else; if (b) stack.push({ steps: b, i: 0 }); continue; }
      if (s.do) { s.do(S); continue; }
      if (s.wait) { hide(); waitT = s.wait; return; }
      if (s.name) { askName(); return; }
    }
    finish();
  }

  function show(raw) {
    const kind = raw[0], text = fill(raw.slice(3));
    el.classList.remove('hidden');
    el.className = 'talk-' + kind;
    nameEl.textContent = kind === 'm' || kind === 's' ? 'Miku' : kind === 'y' ? (S.name || 'You') : '';
    line = kind === 's' ? '♪ ' + text + ' ♪' : kind === 'y' ? '“' + text + '”' : text;
    // She doesn't speak aloud; she only laughs, when the line has her laughing.
    if ((kind === 'm' && /\b(ha|haha|hah|hehe|heh)\b|\(laugh/i.test(text)) || (kind === 'n' && /\b(she laughs|laughs|laughing|giggles?)\b/i.test(text) && !/cries/.test(text))) Sound.laugh(/properly|so hard|both/.test(text) ? 2 : 1);
    current = { kind, text, id: ++lineCount };
    sinceLine = 0;
    choices = null;
    choicesEl.innerHTML = '';
    textEl.textContent = '';
    shown = 0;
    typing = true;
    moreEl.classList.add('hidden');
  }

  function offer(list) {
    choices = list.filter((c) => !c.if || c.if(S));
    el.classList.remove('hidden');
    if (!line) { nameEl.textContent = ''; textEl.textContent = ''; }
    choicesEl.innerHTML = choices.map((c, i) => `<li data-n="${i}"><kbd>${i + 1}</kbd>${fill(c.t)}</li>`).join('');
    moreEl.classList.add('hidden');
    typing = false;
    if (line) textEl.textContent = line;
  }

  function pick(n) {
    if (!choices || !choices[n]) return;
    const c = choices[n];
    choices = null;
    choicesEl.innerHTML = '';
    if (c.a) S.aff += c.a;
    if (c.set) S.flags[c.set] = true;
    if (c.then) stack.push({ steps: c.then, i: 0 });
    line = null;
    step();
  }

  function advance() {
    if (!running || asking || waitT > 0) return;
    if (typing) { shown = line.length; return; }
    if (choices) return;
    line = null;
    step();
  }

  function hide() { el.classList.add('hidden'); line = null; current = null; }

  function askName() {
    asking = true;
    hide();
    nameBox.classList.remove('hidden');
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 50);
  }
  function submitName() {
    const v = nameInput.value.trim().replace(/[<>]/g, '').slice(0, 16);
    S.name = v || 'Sora';
    nameBox.classList.add('hidden');
    nameInput.blur();
    asking = false;
    step();
  }

  function finish() {
    running = false;
    hide();
    choicesEl.innerHTML = '';
    const d = onDone; onDone = null;
    if (d) d();
  }

  // Holding Ctrl fast-forwards through lines (but stops at choices).
  let ctrl = false, ffT = 0, sinceLine = 99;
  window.addEventListener('keydown', (e) => { if (e.key === 'Control') ctrl = true; });
  window.addEventListener('keyup', (e) => { if (e.key === 'Control') ctrl = false; });
  window.addEventListener('blur', () => { ctrl = false; });

  function update(dt) {
    sinceLine += dt;
    if (waitT > 0) { waitT -= dt; if (waitT <= 0) { waitT = 0; step(); } return; }
    if (ctrl && running && !asking && !choices && line) { ffT += dt; if (ffT > 0.09) { ffT = 0; advance(); } return; }
    if (!line || !typing) return;
    shown = Math.min(line.length, shown + dt * 68);
    textEl.textContent = line.slice(0, Math.floor(shown));
    if (shown >= line.length) {
      typing = false;
      // If a choice comes straight after this line, show it under the line right away.
      const top = stack[stack.length - 1];
      const nextStep = top && top.steps[top.i];
      if (nextStep && nextStep.c) { line = textEl.textContent; stack[stack.length - 1].i++; offer(nextStep.c); }
      else moreEl.classList.remove('hidden');
    }
  }

  function key(code) {
    if (!running || asking) return false;
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') { advance(); return true; }
    const m = /^(Digit|Numpad)([1-9])$/.exec(code);
    if (m) { pick(Number(m[2]) - 1); return true; }
    return false;
  }

  return {
    init, run, update, key,
    get active() { return running; }, get asking() { return asking; }, get current() { return current; },
    // Whether she's "talking" right now (her line is still coming up), for her gestures and nods.
    get talking() { return !!(current && current.kind === 'm' && (typing || sinceLine < 1.6)); },
  };
})();
