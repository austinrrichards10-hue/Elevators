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

  return { values, bind, open, close, apply };
})();
