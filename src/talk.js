// Talking to Miku: a small dialogue tree, a typewriter text box and numbered choices.
// E / Space / click moves the text on; 1-4 pick a choice.
const Talk = (() => {
  // Each node: lines she says, then either choices, `next` (another node) or `end`.
  // `opener` nodes are picked by where the car is when you start talking.
  const NODES = {
    first: {
      lines: [
        "…Oh! Sorry. I didn't hear the doors.",
        "I was miles away. It's hard not to be, up here.",
      ],
      next: 'hub',
    },
    high: { lines: ["Still a long way down. Look how small the cars are, like sparks running along wires."], next: 'hub' },
    mid: { lines: ["This is my favourite part, when the towers start rising up around us instead of sitting under us."], next: 'hub' },
    low: { lines: ["Almost at the bottom. I always wish it took a little longer."], next: 'hub' },
    ground: { lines: ["Ground floor. Back to the noise.", "…Thanks for the company. It's a nicer ride with someone in it."], next: 'hub' },

    hub: {
      lines: [],
      choices: [
        { id: 'look', text: 'What are you looking at?' },
        { id: 'ride', text: 'Do you ride this a lot?' },
        { id: 'who', text: "I don't think we've met." },
        { id: 'city', text: 'What do you think of the city?' },
        { id: 'bye', text: "I'll let you enjoy the view.", always: true },
      ],
    },
    look: {
      lines: [
        "See that bright cluster of towers, straight out past the park?",
        "When I was little I tried to count the lit windows from up here. I never got the same number twice.",
        "Every one of them is somebody still awake. It makes the city feel less empty.",
      ],
      next: 'hub',
    },
    ride: {
      lines: [
        "Every night, after rehearsal. Seventy floors, about three minutes.",
        "The fast cars are inside the tower. Nobody takes this one unless they want to.",
        "It's the only quiet part of my day.",
      ],
      next: 'hub',
    },
    who: {
      lines: [
        "Miku. I sing, mostly in rooms a lot smaller than this city.",
        "And you? …No, you don't have to say. Strangers in an elevator. That's half the charm.",
      ],
      next: 'hub',
    },
    city: {
      lines: [
        "Loud. Tired. Beautiful, if you get far enough away from it.",
        "From down there you only see the next street. From up here you can see it breathing: the traffic, the lights going on and off.",
        "I write a lot of songs on this ride.",
      ],
      next: 'hub',
    },
    bye: { lines: ["Okay. It doesn't last, so watch it while you can."], end: true },
  };

  let el, nameEl, textEl, choicesEl, moreEl;
  let node = null, lineIndex = 0, shown = 0, typing = false, choices = null;
  const asked = new Set();
  let talkedBefore = false;
  let onEnd = null;

  function init() {
    el = document.getElementById('talk');
    nameEl = el.querySelector('.talk-name');
    textEl = el.querySelector('.talk-text');
    choicesEl = el.querySelector('.talk-choices');
    moreEl = el.querySelector('.talk-more');
    el.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li && choices) pick(Number(li.dataset.n));
      else advance();
    });
  }

  function start(opener, endCallback) {
    onEnd = endCallback;
    nameEl.textContent = 'Miku';
    el.classList.remove('hidden');
    go(talkedBefore ? opener : 'first');
    talkedBefore = true;
  }

  function go(id) {
    node = NODES[id];
    lineIndex = 0;
    choices = null;
    choicesEl.innerHTML = '';
    if (node.lines.length) showLine(); else finishNode();
  }

  function showLine() {
    textEl.textContent = '';
    shown = 0;
    typing = true;
    moreEl.classList.add('hidden');
  }

  function finishNode() {
    if (node.choices) {
      choices = node.choices.filter((c) => c.always || !asked.has(c.id));
      if (choices.length === 1) choices[0] = { ...choices[0], text: "That's all. Enjoy the view." };
      choicesEl.innerHTML = choices.map((c, i) => `<li data-n="${i}"><kbd>${i + 1}</kbd>${c.text}</li>`).join('');
      moreEl.classList.add('hidden');   // her last line stays up above the choices
    } else if (node.next) go(node.next);
    else close();
  }

  function pick(n) {
    if (!choices || !choices[n]) return;
    const c = choices[n];
    asked.add(c.id);
    go(c.id);
  }

  function advance() {
    if (!node) return;
    if (typing) { shown = node.lines[lineIndex].length; return; }
    if (choices) return;
    lineIndex++;
    if (lineIndex < node.lines.length) showLine();
    else finishNode();
  }

  function close() {
    el.classList.add('hidden');
    node = null;
    choices = null;
    if (onEnd) onEnd();
  }

  function update(dt) {
    if (!node || !typing) return;
    const line = node.lines[lineIndex];
    shown = Math.min(line.length, shown + dt * 48);
    textEl.textContent = line.slice(0, Math.floor(shown));
    if (shown >= line.length) {
      typing = false;
      // On the last line of a node with choices, show them straight away.
      if (lineIndex === node.lines.length - 1 && node.choices) finishNode();
      else moreEl.classList.remove('hidden');
    }
  }

  function key(code) {
    if (!node) return false;
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') { advance(); return true; }
    const m = /^(Digit|Numpad)([1-9])$/.exec(code);
    if (m) { pick(Number(m[2]) - 1); return true; }
    return false;
  }

  return { init, start, update, key, close, get active() { return !!node; } };
})();
