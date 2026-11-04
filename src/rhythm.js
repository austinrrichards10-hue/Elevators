// On stage: notes fall down four lanes, one per key (D F J K), in time with the song, and she
// hits them as they cross the line. They're charted from the tune itself, so each phrase of
// the melody is a phrase under her fingers. Timing goes by the audio clock, not the frame.

const RHYTHM = {
  keys: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'J', 'K'],
  window: { perfect: 0.045, great: 0.09, good: 0.14 },
  travel: 1.5, // seconds a note takes to fall to the line
  points: { perfect: 300, great: 200, good: 100, miss: 0 },
};

const rhythm = { active: null };

// The chart for a song at a difficulty (0 easy to 1 hard): which notes, in which lanes.
function buildChart(id, difficulty) {
  const L = layoutSong(id), beat = 60 / L.bpm;
  const melody = L.chart.filter((n) => n.pitch !== null);
  const lo = Math.min(...melody.map((n) => n.pitch)), hi = Math.max(...melody.map((n) => n.pitch));
  const notes = [];
  let lastLane = -1, lastTime = -1, drumFlip = 0;
  for (const n of L.chart) {
    const t = n.beat * beat;
    // Easier: fewer quick notes, fewer of the drum hits between phrases.
    if (n.drum && Math.random() > 0.35 + difficulty * 0.5) continue;
    if (!n.drum && n.len < 0.6 && Math.random() > 0.45 + difficulty * 0.55) continue;
    if (t - lastTime < lerp(0.32, 0.16, difficulty)) continue;
    let lane = n.drum ? (drumFlip++ % 2 ? 3 : 0) : Math.min(3, Math.floor(((n.pitch - lo) / Math.max(1, hi - lo + 1)) * 4));
    // The same lane twice in a quick run is moved over, so runs ripple across the keys.
    if (lane === lastLane && t - lastTime < 0.35) lane = (lane + (Math.random() < 0.5 ? 1 : 3)) % 4;
    notes.push({ t, lane, hit: null, el: null });
    lastLane = lane;
    lastTime = t;
  }
  return notes;
}

function buildRhythmDom() {
  if ($('rhythm')) return;
  const el = document.createElement('div');
  el.id = 'rhythm';
  el.className = 'hidden';
  el.innerHTML = `
    <div class="rh-head"><span class="rh-title"></span><span class="rh-score">0</span></div>
    <div class="rh-progress"><i></i></div>
    <div class="rh-hype"><label>Crowd</label><div><i></i></div></div>
    <div class="rh-board">${RHYTHM.labels.map((k, i) => `<div class="rh-lane" data-lane="${i}"><div class="rh-key">${k}</div></div>`).join('')}<div class="rh-line"></div></div>
    <div class="rh-judge"></div><div class="rh-combo"></div>
    <div class="rh-lyrics"><p class="rh-jp"></p><p class="rh-en"></p></div>`;
  document.body.appendChild(el);
}

// Starts the stage. `opts`: { song, difficulty, title, onHit(lane, judgement), onEnd(result) }.
function startRhythm(opts) {
  buildRhythmDom();
  stopRhythm();
  const notes = buildChart(opts.song, opts.difficulty);
  const el = $('rhythm');
  el.classList.remove('hidden');
  el.querySelector('.rh-title').textContent = `${SONGS[opts.song].title}`;
  const board = el.querySelector('.rh-board');
  for (const old of board.querySelectorAll('.rh-note')) old.remove();
  const music = playSong(opts.song, { level: opts.level || 0.85 });
  rhythm.active = { ...opts, notes, music, next: 0, score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 }, hype: 0.5, board, el, judgeT: 0, held: [false, false, false, false], ended: false };
  return rhythm.active;
}

function stopRhythm() {
  const r = rhythm.active;
  if (!r) return;
  r.music.stop();
  for (const n of r.notes) if (n.el) n.el.remove();
  r.el.classList.add('hidden');
  rhythm.active = null;
}

function rhythmJudge(r, lane) {
  const now = r.music.time();
  let best = null, bestD = RHYTHM.window.good;
  for (let i = r.next; i < r.notes.length; i++) {
    const n = r.notes[i];
    if (n.t - now > RHYTHM.window.good) break;
    if (n.hit || n.lane !== lane) continue;
    const d = Math.abs(n.t - now);
    if (d < bestD) { best = n; bestD = d; }
  }
  if (!best) return;
  const W = RHYTHM.window;
  const j = bestD < W.perfect ? 'perfect' : bestD < W.great ? 'great' : 'good';
  scoreNote(r, best, j);
}

function scoreNote(r, n, j) {
  n.hit = j;
  r.counts[j]++;
  if (j === 'miss') { r.combo = 0; r.hype = Math.max(0, r.hype - 0.06); }
  else {
    r.combo++;
    r.maxCombo = Math.max(r.maxCombo, r.combo);
    r.score += RHYTHM.points[j] * (1 + Math.min(r.combo, 100) / 100);
    r.hype = Math.min(1, r.hype + (j === 'perfect' ? 0.02 : 0.012));
  }
  if (n.el) { n.el.classList.add(j === 'miss' ? 'missed' : 'struck'); const e = n.el; setTimeout(() => e.remove(), 180); n.el = null; }
  if (j !== 'miss') {
    // A burst of light where it was struck.
    const lane = r.board.querySelector(`[data-lane="${n.lane}"]`);
    const b = document.createElement('i'); b.className = `rh-burst ${j}`; lane.appendChild(b); setTimeout(() => b.remove(), 400);
  }
  const judge = r.el.querySelector('.rh-judge');
  judge.textContent = j === 'perfect' ? 'PERFECT' : j === 'great' ? 'GREAT' : j === 'good' ? 'GOOD' : 'MISS';
  judge.className = `rh-judge ${j} pop`;
  void judge.offsetWidth;
  r.el.querySelector('.rh-combo').textContent = r.combo >= 5 ? `${r.combo} combo` : '';
  if (r.onHit) r.onHit(n.lane, j);
}

function updateRhythm() {
  const r = rhythm.active;
  if (!r || r.ended) return;
  const now = r.music.time();
  const h = r.board.clientHeight, lineY = h - 70;
  // Notes come into view, fall, and are missed if they pass the line unhit.
  for (let i = r.next; i < r.notes.length; i++) {
    const n = r.notes[i];
    const ahead = n.t - now;
    if (ahead > RHYTHM.travel) break;
    if (n.hit) continue;
    if (!n.el) {
      n.el = document.createElement('div');
      n.el.className = `rh-note lane${n.lane}`;
      r.board.querySelector(`[data-lane="${n.lane}"]`).appendChild(n.el);
    }
    n.el.style.transform = `translateY(${lineY * (1 - ahead / RHYTHM.travel) - 10}px)`;
    if (ahead < -RHYTHM.window.good) scoreNote(r, n, 'miss');
  }
  while (r.next < r.notes.length && r.notes[r.next].hit) r.next++;
  const S = r.el;
  S.querySelector('.rh-score').textContent = Math.round(r.score).toLocaleString();
  S.querySelector('.rh-progress i').style.width = `${Math.min(100, (now / r.music.layout.seconds) * 100)}%`;
  S.querySelector('.rh-hype i').style.height = `${r.hype * 100}%`;
  // The words, karaoke-style: the line being sung, each syllable lighting up as it's sung,
  // and what it means underneath.
  const beatNow = now / r.music.beat;
  const lines = r.music.layout.lines;
  const line = lines.find((l) => beatNow >= l.beat - 1.5 && beatNow < l.end + 0.6);
  if (line !== r.lyricLine) {
    r.lyricLine = line;
    S.querySelector('.rh-jp').innerHTML = line ? line.tokens.map((tk) => `<span data-b="${tk.beat}">${tk.text}</span>`).join(' ') : '';
    S.querySelector('.rh-en').textContent = line ? line.en : '';
  }
  if (line) for (const sp of S.querySelectorAll('.rh-jp span')) sp.classList.toggle('sung', +sp.dataset.b <= beatNow + 0.05);
  r.board.classList.toggle('fever', r.hype > 0.85);
  if (now > r.music.layout.seconds + 0.5) {
    r.ended = true;
    const total = r.notes.length || 1;
    const acc = (r.counts.perfect + r.counts.great * 0.75 + r.counts.good * 0.45) / total;
    const grade = acc > 0.93 ? 'S' : acc > 0.82 ? 'A' : acc > 0.68 ? 'B' : acc > 0.5 ? 'C' : 'D';
    const result = { ...r.counts, maxCombo: r.maxCombo, accuracy: acc, score: Math.round(r.score), grade, total, hype: r.hype };
    const onEnd = r.onEnd;
    stopRhythm();
    if (onEnd) onEnd(result);
  }
}

addEventListener('keydown', (e) => {
  const r = rhythm.active;
  if (!r || e.repeat) return;
  const lane = RHYTHM.keys.indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const key = r.el.querySelector(`[data-lane="${lane}"] .rh-key`);
  key.classList.add('down');
  setTimeout(() => key.classList.remove('down'), 90);
  rhythmJudge(r, lane);
}, true);
