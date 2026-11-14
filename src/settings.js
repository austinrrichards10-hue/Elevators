// Settings: music and sound volume, mouse sensitivity, text speed, glow and film grain, and
// fullscreen. Saved in the browser and applied straight away.
const Settings = (() => {
  const KEY = 'elevators-settings';
  const values = { music: 0.8, sound: 0.9, sens: 1, textSpeed: 1, glow: true, grain: true };
  try { Object.assign(values, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* defaults */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(values)); } catch (e) { /* not saved */ } };
  let onClose = null;

  function apply() {
    if (typeof Sound !== 'undefined' && Sound.setVolumes) Sound.setVolumes(values.music, values.sound);
    if (typeof Game !== 'undefined' && Game.applySettings) Game.applySettings();
  }

  function bind() {
    const $ = (id) => document.getElementById(id);
    const sliders = { 'set-music': 'music', 'set-sound': 'sound', 'set-sens': 'sens', 'set-text': 'textSpeed' };
    const fmt = (k, v) => (k === 'music' || k === 'sound' ? Math.round(v * 100) + '%' : v.toFixed(1) + '×');
    for (const [id, k] of Object.entries(sliders)) {
      const el = $(id), out = el.parentElement.querySelector('output');
      el.value = values[k]; out.textContent = fmt(k, values[k]);
      el.addEventListener('input', () => { values[k] = Number(el.value); out.textContent = fmt(k, values[k]); apply(); save(); });
    }
    for (const [id, k] of [['set-glow', 'glow'], ['set-grain', 'grain']]) {
      const el = $(id);
      el.checked = values[k] !== false;
      el.addEventListener('change', () => { values[k] = el.checked; apply(); save(); });
    }
    $('set-full').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
    });
    $('set-close').addEventListener('click', close);
    $('settings').addEventListener('click', (e) => { if (e.target === $('settings')) close(); });
    document.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !$('settings').classList.contains('hidden')) { e.stopPropagation(); close(); } }, true);
  }

  function open(done) {
    onClose = done || null;
    document.getElementById('settings').classList.remove('hidden');
  }
  function close() {
    document.getElementById('settings').classList.add('hidden');
    const d = onClose; onClose = null;
    if (d) d();
  }

  // The blue light cursor: follows the mouse with a little glowing trail, swells over anything
  // clickable, and hides while the mouse is captured for looking around.
  (function cursor() {
    const c = document.getElementById('cursor');
    if (!c) return;
    let lastTrail = 0;
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) return;
      c.classList.remove('gone');
      c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
      c.classList.toggle('hover', !!e.target.closest('button, li, input, label, a, select, .item, [data-tab]'));
      const now = performance.now();
      if (now - lastTrail > 40) {
        lastTrail = now;
        const t = document.createElement('i'); t.className = 'cursor-trail';
        t.style.left = e.clientX + 'px'; t.style.top = e.clientY + 'px';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 520);
      }
    });
    document.addEventListener('mousedown', () => c.classList.add('down'));
    document.addEventListener('mouseup', () => c.classList.remove('down'));
    document.addEventListener('pointerlockchange', () => c.classList.toggle('gone', !!document.pointerLockElement));
    document.addEventListener('mouseleave', () => c.classList.add('gone'));
  })();

  return { values, bind, open, close, apply };
})();
