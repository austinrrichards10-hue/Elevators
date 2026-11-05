// Finding your way in Tokyo: wherever the story wants her next has a column of light over it
// and an arrow at the top of the screen with how far it is; and the field book's map (M)
// becomes a map of the city, with the stages, the parks, everyone with something to say,
// and the goal marked.

// Where the current objective is: a person, a thing to find, a door. Null if it's anywhere.
function idolTarget(untracked) {
  if (!untracked) { const tt = trackedTarget(); if (tt) return tt; }
  const f = (k) => !!idol.flags[k];
  const npc = (id) => { const n = city.named[id]; return n && !n.hidden ? { x: n.person.x, z: n.person.z, label: n.name } : null; };
  const find = (id) => { const t = FINDS.find((q) => q.id === id); return t ? { x: t.x, z: t.z, label: 'Here' } : null; };
  const nextFind = (ids) => { for (const id of ids) if (!idol.items[id]) return find(id); return null; };
  const venue = (id) => ({ x: VENUES[id].door.x, z: VENUES[id].door.z, label: VENUES[id].name });
  if (!f('metGen')) return npc('gen');
  if (!f('metHaru')) return npc('haru');
  if (f('catQuest') && !f('catFound')) return find('cat');
  if (f('catFound') && !f('room')) return npc('ishida');
  if (!f('room')) return npc('ishida');
  if (idol.flags.ramen !== undefined && idol.flags.ramen < 3) return npc(!f('ramenSato') ? 'sato' : !f('ramenKimura') ? 'kimura' : 'yuto');
  if (idol.flags.ramen === 3 && !f('ramenDone')) return npc('taisho');
  if (f('kite') && !idol.items.kite && !f('kentaDone')) return find('kite');
  if (idol.items.kite && !f('kentaDone')) return npc('kenta');
  if (f('flowers') && !f('flowersDone')) return flowersHeld() >= 4 ? npc('sakura') : nextFind(['bouquet1', 'bouquet2', 'bouquet3', 'bouquet4']);
  if (f('scoutSoon') && !f('scouted')) return npc('kanade');
  if (f('scouted') && !f('joined')) return npc('hoshino') || { x: ROOMS.agency.door.x, z: ROOMS.agency.door.z, label: 'Starlight Production' };
  if (!f('joined')) return { x: 2, z: -22, label: 'Busk here' };
  if (f('tvBooked') && !idol.gigs.tv) return { ...venue('tv'), z: VENUES.tv.door.z - 4 };
  if (f('domeReady')) return { x: -2, z: -6, label: 'Train to the Dome' };
  if (f('domeAnnounced')) {
    for (const id of ['aoi', 'kotone', 'mirai']) if (!f(`${id}Heart`)) return npc(id);
    if (!f('genPin')) return npc('gen');
    if (!f('haruFarewell')) return npc('haru');
    if (!f('tetoBeach')) return f('beachCall') ? npc('teto') : { x: ROOMS.apartment.door.x, z: ROOMS.apartment.door.z, label: 'Your apartment' };
    return npc('hoshino');
  }
  if (f('charm') && !idol.items.charm && !f('charmDone')) return find('charm');
  if (idol.items.charm && !f('charmDone')) return npc('kotone');
  if (f('lyrics') && !f('lyricsDone')) return inspirationHeld() >= 3 ? npc('mirai') : nextFind(['insp1', 'insp2', 'insp3']);
  if (fameLevel() >= 8 && idol.gigs.arena) return npc('hoshino');
  // Otherwise: the best stage that's open to her tonight.
  const open = Object.entries(VENUES).filter(([id, v]) => fameLevel() >= v.level && !(v.once && idol.gigs[id]) && id !== 'tv');
  if (open.length && idol.lastShowDay !== dayNight.day) { const [id] = open[open.length - 1]; return venue(id); }
  return null;
}

/* ---------- The beacon and the arrow ---------- */
function buildNav() {
  if (city.nav) return city.nav;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 60, 16, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: 0x8ff4e8, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 60, 6, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8ff4e8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const g = new THREE.Group();
  g.add(beam, core, ring);
  city.group.add(g);
  const el = document.createElement('div');
  el.id = 'nav-arrow';
  el.innerHTML = '<i></i><span></span>';
  $('hud').appendChild(el);
  city.nav = { g, ring, el };
  return city.nav;
}

function updateNav() {
  // No beacon down below: nothing should point the way there, or out.
  const N = buildNav(), t = city.active && !city.talking && !show.active && city.inside !== 'deep' ? routeTarget(idolTarget()) : null;
  N.g.visible = !!t;
  N.el.classList.toggle('hidden', !t);
  if (!t) return;
  N.g.position.set(t.x, 0.05, t.z);
  N.ring.scale.setScalar(1 + (game.time * 0.8) % 1);
  N.ring.material.opacity = 0.8 * (1 - ((game.time * 0.8) % 1));
  const dx = t.x - player.pos.x, dz = t.z - player.pos.z, d = Math.hypot(dx, dz);
  // The arrow turns to point the way relative to where the camera faces.
  const a = Math.atan2(dx, dz) - player.yaw;
  N.el.querySelector('i').style.transform = `rotate(${-a}rad)`;
  N.el.querySelector('span').textContent = d < 3 ? t.label : `${t.label} · ${Math.round(d)} m`;
  N.g.visible = d > 2.5;
}

/* ---------- The city map ---------- */
function drawCityMap(canvas, legend) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X0 = -135, X1 = 135, Z0 = -180, Z1 = 155;
  const s = Math.min(w / (X1 - X0), h / (Z1 - Z0)) * 0.94;
  const ox = w / 2 - ((X0 + X1) / 2) * s, oz = h / 2 + ((Z0 + Z1) / 2) * s;
  const P = (x, z) => [ox + x * s, oz - z * s];
  const rectW = (x0, z0, x1, z1, col) => { const [a, b] = P(x0, z1), [c, d] = P(x1, z0); g.fillStyle = col; g.fillRect(a, b, c - a, d - b); };
  // Paper, sea, sand, the streets, the blocks.
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
  rectW(X0, Z0, X1, -170, '#8fb8d8');
  rectW(X0, -170, X1, -122, '#ecd9a8');
  rectW(X0, -122, X1, Z1, '#cfcac0');
  const avenues = [-120, -60, 0, 60, 120], streets = [-112, -50, 0, 50, 100, 146];
  for (let i = 0; i < avenues.length - 1; i++) for (let j = 0; j < streets.length - 1; j++) rectW(avenues[i] + 6, streets[j] + 6, avenues[i + 1] - 6, streets[j + 1] - 6, '#b6ada0');
  for (const p of Object.values(PARKS)) rectW(p.x0, p.z0, p.x1, p.z1, '#9cc884');
  rectW(-28, -48, 28, -4, '#ddd4c2');
  rectW(-66, -46, -54, 96, '#e8b8a0');
  // Labels for places.
  const label = (text, x, z, col = '#3a3a48', size = 12) => { const [a, b] = P(x, z); g.fillStyle = col; g.font = `${size}px sans-serif`; g.textAlign = 'center'; g.fillText(text, a, b); };
  label('Station Square', 0, -30, '#3a3a48', 13);
  label('Arcade', -60, 70, '#8a3a2a');
  label('Sakura Park', -30, 25, '#2a5a2a', 13);
  label('Green Park', -30, 75, '#2a5a2a', 13);
  label('Beach', -80, -150, '#8a6a3a', 13);
  label('Tokyo Bay', 0, -176, '#2a4a6a', 13);
  // The stages and the places she lives.
  // Labels nudge down out of each other's way, with a pale halo so they read over the blocks.
  const placed = [];
  const pin = (x, z, col, text) => {
    const [a, b] = P(x, z); g.fillStyle = col; g.beginPath(); g.arc(a, b, 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    if (!text) return;
    g.font = 'bold 11px sans-serif'; g.textAlign = 'left';
    const tw = g.measureText(text).width;
    let ty = b + 4;
    for (let k = 0; k < 6 && placed.some((r) => a + 8 < r[2] && a + 8 + tw > r[0] && ty - 10 < r[3] && ty + 2 > r[1]); k++) ty += 13;
    placed.push([a + 8, ty - 10, a + 8 + tw, ty + 2]);
    if (ty !== b + 4) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(a + 4, b + 3); g.lineTo(a + 7, ty - 3); g.stroke(); }
    g.lineWidth = 3; g.strokeStyle = 'rgba(245,240,228,0.9)'; g.strokeText(text, a + 8, ty);
    g.fillStyle = '#22222a'; g.fillText(text, a + 8, ty);
  };
  for (const [id, v] of Object.entries(VENUES)) { const open = fameLevel() >= v.level; pin(v.door.x, v.door.z, open ? '#d8306a' : '#9a9aa4', v.name); }
  pin(ROOMS.agency.door.x, ROOMS.agency.door.z, '#3a6ad8', 'Starlight Production');
  pin(ROOMS.konbini.door.x, ROOMS.konbini.door.z, '#1e8a4a', 'Gas station & konbini');
  pin(ROOMS.hotel.door.x, ROOMS.hotel.door.z, '#8a5a3a', 'Capsule hotel');
  if (idol.flags.apartment) pin(ROOMS.apartment.door.x, ROOMS.apartment.door.z, '#8a5a3a', 'Apartment');
  pin(2, -22, '#39a898', 'Busking spot');
  // Everyone with something to say: a gold star.
  for (const n of Object.values(city.named)) {
    if (n.hidden || !idolHasNews(n.id)) continue;
    const mp = mapPos(n.person.x, n.person.z), [a, b] = P(mp.x, mp.z);
    g.fillStyle = '#f0b020'; g.strokeStyle = '#7a5010'; g.lineWidth = 1;
    g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(a + Math.cos(an) * r, b + Math.sin(an) * r); } g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5a3a08'; g.font = '10px sans-serif'; g.textAlign = 'center'; g.fillText(n.name, a, b - 10);
  }
  // The goal, and her.
  const t = routeTarget(idolTarget());
  if (t) { const [a, b] = P(t.x, t.z); g.strokeStyle = '#18a898'; g.lineWidth = 3; g.beginPath(); g.arc(a, b, 11 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2); g.stroke(); }
  const sp = streetPos(), [px, pz] = P(sp.x, sp.z);
  g.save(); g.translate(px, pz); g.rotate(player.yaw);
  g.fillStyle = '#18c8b8'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.fillStyle = '#3a3a48'; g.font = 'bold 18px serif'; g.textAlign = 'left'; g.fillText('TOKYO', 16, 28);
  if (legend) legend.innerHTML = `<h4>Tokyo</h4><p><b>Goal:</b> ${idol.objective || ''}</p><ul class="city-legend"><li><i style="background:#d8306a"></i>Stages you can play</li><li><i style="background:#9a9aa4"></i>Stages still out of reach</li><li><i class="star"></i>Someone with something to say</li><li><i style="background:#18c8b8"></i>You</li><li><i style="border:2px solid #18a898;background:none"></i>Where to go next</li></ul>`;
}
