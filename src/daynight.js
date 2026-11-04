// Day and night, and what keeps her alive besides warmth: hunger and thirst, and sleep.
// A whole day takes twelve minutes. The sun climbs and sets, the sky goes gold and then dark
// and full of stars, the cold bites harder after dark and the wolves grow bolder. She eats
// what she hunts and finds, melts snow to drink by the fire, and sleeps in her tent or her
// bed to see the night through.

const DAY = {
  length: 720, // seconds for a whole day
  start: 0.32, // a little before eight in the morning
  nightCold: 1.6, // warmth drains this much faster at night
  hungerDrain: 100 / 900, // fifteen minutes from full to starving
  thirstDrain: 100 / 660,
  starve: 0.7, // health lost per second, starving or parched
  snowDrink: 6, // thirst back per second, melting snow by the fire
};

const dayNight = {
  t: DAY.start, day: 1, mats: [], matT: 0, stars: null, light: 1, sleeping: null,
  hour() { return (this.t % 1) * 24; },
  isNight() { const h = this.hour(); return h < 6 || h >= 19.5; },
  clock() { const h = this.hour(); return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; },
};

const needs = { hunger: 100, thirst: 100, warnT: 0 };

/* ---------- The sky ---------- */
function buildStars() {
  const count = 1600, pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random() * 0.9 + 0.1;
    const a = u * Math.PI * 2, y = v, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380], i * 3);
    const b = 0.5 + Math.random() * 0.8, warm = Math.random();
    col.set([b * (0.85 + warm * 0.15), b * 0.9, b * (1.05 - warm * 0.15)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  scene.add(stars);
  return stars;
}

const DN = {
  dayZenith: new THREE.Color(0x66779f), dayHorizon: new THREE.Color(FOG_COLOR),
  nightZenith: new THREE.Color(0x070b18), nightHorizon: new THREE.Color(0x1b2440),
  duskHorizon: new THREE.Color(0xe39a86), duskZenith: new THREE.Color(0x4d4a7a),
  dayFog: new THREE.Color(FOG_COLOR), nightFog: new THREE.Color(0x141b2e), duskFog: new THREE.Color(0xb48d96),
  daySun: new THREE.Color(0xeef1ff), duskSun: new THREE.Color(0xffb27a), moon: new THREE.Color(0x8ea6ff),
  c: new THREE.Color(), d: new THREE.Vector3(),
};

// How much daylight there is, 0 at night to 1 at noon, and how much of a dusk glow.
function daylight(h) {
  const up = smooth((h - 5.6) / 1.8), down = 1 - smooth((h - 18) / 1.8);
  const light = Math.min(up, down);
  const dusk = Math.max(0, 1 - Math.abs(h - 6.4) / 1.3) + Math.max(0, 1 - Math.abs(h - 18.9) / 1.3);
  return { light, dusk: Math.min(1, dusk) };
}

function updateSky(dt) {
  const h = dayNight.hour();
  const { light, dusk } = daylight(h);
  dayNight.light = light;
  // The forest's own sky and light; Teto's arena, the balloon's flight and the scenes see to their own.
  const free = !arenaActive() && (cityActive() || (game.state === 'playing' && !activeScene));
  if (!dayNight.stars) dayNight.stars = buildStars();
  dayNight.stars.position.copy(camera.position);
  dayNight.stars.material.opacity = free ? (1 - light) * 0.95 : 0;
  if (!free) {
    // Back to the plain grey day the rest of the game was made in, once.
    if (dayNight.wasFree && (arenaActive() || (activeScene && !cityActive()))) {
      dayNight.wasFree = false;
      resetGrade();
      const sky = world.sky.material.uniforms;
      sky.uZenith.value.copy(DN.dayZenith);
      sky.uHorizon.value.copy(DN.dayHorizon);
      world.sunOffset.set(-0.42, 0.72, 0.55).normalize().multiplyScalar(85);
      sky.uSunDir.value.set(-0.42, 0.72, 0.55).normalize();
      world.sun.intensity = 1.6;
      world.sun.color.copy(DN.daySun);
    }
    return;
  }
  dayNight.wasFree = true;
  const sky = world.sky.material.uniforms;
  sky.uZenith.value.copy(DN.nightZenith).lerp(DN.dayZenith, light).lerp(DN.duskZenith, dusk * 0.5);
  sky.uHorizon.value.copy(DN.nightHorizon).lerp(DN.dayHorizon, light).lerp(DN.duskHorizon, dusk * 0.55);
  // The sun swings round from the east, up over the south and down in the west; the moon after it.
  const a = ((h - 6) / 12) * Math.PI;
  const sunDir = DN.d.set(-Math.cos(a), Math.max(0.12, Math.sin(a)), 0.45).normalize();
  if (light <= 0.02) sunDir.set(0.3, 0.75, -0.4).normalize();
  world.sunOffset.copy(sunDir).multiplyScalar(85);
  sky.uSunDir.value.copy(sunDir);
  world.sun.intensity = lerp(0.28, 1.6, light);
  world.sun.color.copy(DN.moon).lerp(DN.daySun, light).lerp(DN.duskSun, dusk * 0.6);
  if (!cityActive()) scene.fog.color.copy(DN.nightFog).lerp(DN.dayFog, light).lerp(DN.duskFog, dusk * 0.45);
  // The ambient light off the sky fades with it, so firelight and lanterns count at night.
  const env = lerp(0.18, 1, light);
  dayNight.matT -= dt;
  if (dayNight.matT <= 0) {
    dayNight.matT = 4;
    const seen = new Set();
    scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.isMeshStandardMaterial) seen.add(m); });
    dayNight.mats = [...seen];
  }
  for (const m of dayNight.mats) m.envMapIntensity = env;
  const g = pipeline.grade;
  g.set(lerp(0.62, 1, light) + dusk * 0.04, lerp(0.7, 1, light), lerp(0.98, 1, light) + (1 - light) * 0.1);
}

// Anything that leaves the forest (the arena, the balloon) puts the grade back to plain day.
function resetGrade() {
  pipeline.grade.set(1, 1, 1);
  for (const m of dayNight.mats) m.envMapIntensity = 1;
}

/* ---------- Hunger and thirst ---------- */
function updateNeeds(dt) {
  if (mod.noCold || arenaActive() || activeScene) return;
  const city = cityActive();
  // In the city there's food and water on every corner, and she's not out in the cold.
  if (city) { needs.hunger = Math.max(needs.hunger, 60); needs.thirst = Math.max(needs.thirst, 60); return; }
  needs.hunger = Math.max(0, needs.hunger - DAY.hungerDrain * dt * (player.sprinting ? 1.4 : 1));
  needs.thirst = Math.max(0, needs.thirst - DAY.thirstDrain * dt * (player.sprinting ? 1.5 : 1));
  // By the fire she melts snow in her cup.
  if (survival.sitting) needs.thirst = Math.min(100, needs.thirst + DAY.snowDrink * dt);
  if (needs.hunger <= 0 || needs.thirst <= 0) {
    survival.health -= DAY.starve * dt * ((needs.hunger <= 0) + (needs.thirst <= 0));
    if (survival.health <= 0) { survival.health = 0; playerDied(needs.thirst <= 0 ? 'thirst' : 'hunger'); }
  }
  needs.warnT -= dt;
  if (needs.warnT <= 0) {
    if (needs.thirst < 20) { needs.warnT = 60; showNote('My throat\'s raw. I need to sit by a fire and melt some snow.'); }
    else if (needs.hunger < 20) { needs.warnT = 60; showNote('I\'m so hungry. I need to eat something, anything.'); }
  }
  $('hunger-fill').style.width = `${needs.hunger}%`;
  $('thirst-fill').style.width = `${needs.thirst}%`;
}

// Food fills her up, drink slakes her thirst (items.js calls this when she uses one).
function feed(def) {
  if (def.kind === 'food') needs.hunger = Math.min(100, needs.hunger + (def.food || 18 + (def.heal || 0) * 0.9));
  if (def.kind === 'drink') { needs.thirst = Math.min(100, needs.thirst + 45); needs.hunger = Math.min(100, needs.hunger + 6); }
}

function nightCold() { return dayNight.isNight() && !cityActive() ? DAY.nightCold : 1; }

/* ---------- Sleep ---------- */
function sleepIn(where) {
  if (dayNight.sleeping) return;
  const reason = combatReason();
  if (reason) { showNote(reason === 'wolf' ? 'Not with wolves this close.' : 'Not right now.'); return; }
  if (wolves.some((w) => !w.dead && Math.hypot(w.pos.x - player.pos.x, w.pos.z - player.pos.z) < 20)) { showNote('I can hear wolves out there. I won\'t sleep a wink.'); return; }
  const night = dayNight.isNight();
  dayNight.sleeping = { t: 0, night, where };
  const fade = $('sleep-fade');
  fade.classList.add('on');
  Sfx.thud();
  setTimeout(() => {
    // Through the night to dawn, or a couple of hours' nap by day.
    const h = dayNight.hour();
    let add = night ? (h >= 19.5 ? 24 - h + 6.5 : 6.5 - h) : 2;
    dayNight.t += add / 24;
    if (dayNight.t >= dayNight.day) dayNight.day = Math.floor(dayNight.t) + 1;
    survival.health = Math.min(100, survival.health + (where === 'bed' ? 70 : 45));
    survival.warmth = 100;
    player.stamina = 100;
    needs.hunger = Math.max(5, needs.hunger - add * 2.2);
    needs.thirst = Math.max(5, needs.thirst - add * 2.6);
    clearWolves();
    saveGame();
    fade.classList.remove('on');
    dayNight.sleeping = null;
    say(night ? (where === 'bed' ? 'Morning. I slept like the dead, warm for once.' : 'Morning already. Stiff, but I made it through the night.') : 'Better. A little rest goes a long way.', 3.4);
  }, 1600);
}

/* ---------- Each frame ---------- */
function updateDayNight(dt) {
  if (game.state === 'playing' && !dayNight.sleeping) {
    const before = Math.floor(dayNight.t);
    dayNight.t += dt / DAY.length;
    if (Math.floor(dayNight.t) > before) dayNight.day = Math.floor(dayNight.t) + 1;
    const h = dayNight.hour(), was = dayNight.lastHour || h;
    if (was < 19.5 && h >= 19.5 && !cityActive() && !arenaActive()) showNote('It\'s getting dark. The cold will bite harder tonight.');
    if (was < 6 && h >= 6 && !cityActive() && !arenaActive()) showNote('Dawn. I made it through another night.');
    dayNight.lastHour = h;
  }
  updateSky(dt);
  updateNeeds(dt);
  const el = $('clock');
  if (el) el.innerHTML = `<i class="${dayNight.isNight() ? 'moon' : 'sun'}"></i>Day ${dayNight.day} · ${dayNight.clock()}`;
}

function resetDayNight() {
  dayNight.t = DAY.start;
  dayNight.day = 1;
  dayNight.lastHour = 0;
  needs.hunger = needs.thirst = 100;
}
