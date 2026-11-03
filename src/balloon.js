// The hot air balloon: Dr. Varga's ten parts, put together on her launch frame at the
// Breath, and the way out of the Hollow. She brings the parts and ten planks for the basket
// floor; the balloon then stands tethered over the vents until she climbs in and cuts it
// loose, and it rides the warm column up through the cloud cap into the dawn.

/* ---------- State ---------- */
const BALLOON = {
  planks: 10, // for the basket floor and the frame's braces
  reach: 3.6, // how close she must stand to the frame to use it
  basket: { w: 1.5, h: 1.12, floor: 0.12 },
  burnerY: 2.55, // the burner, above the basket floor
  throatY: 3.6, // the envelope's open mouth, above the basket floor
  envelope: { height: 17.5, radius: 7.4, throat: 1.7, gores: 16, segments: 96, rings: 46 },
  // The cloud cap over the crater, in metres above the launch point.
  cloudBase: 150,
  cloudTop: 300,
  cull: 300, // the tethered balloon is hidden further away than this
  burnEvery: [5, 9], // seconds between burns while it stands tethered
};

const balloon = {
  assembled: false,
  launched: false, // the tether is cut
  // 'none', 'tethered', 'launch' (the lift-off scene), 'interlude' (something else plays
  // out in the basket above the trees), 'ascent' (the climb to the dawn) or 'ending'.
  phase: 'none',
  alt: 0, // the basket floor's height above the launch point
  pos: new THREE.Vector3(), // the basket floor's centre, in the world
  drift: new THREE.Vector3(), // how far the wind has carried it from the launch point
  burn: 0, // how hard the burner is going, 0-1
  burnHold: 0, // seconds of forced burn left
  burnTimer: 4,
  clock: 0, // seconds played this run, in case the story's stats don't keep it
  interlude: 0, // which of BALLOON_INTERLUDES runs next
};

// Something else can play out in the basket once it has lifted clear of the trees and
// before the climb into the cloud (the final fight). Each entry is a function called with
// resume(); the launch carries on to the cloud and the ending when it calls resume(). In
// between the scene has ended, the balloon hovers, rising slowly, and she stands in the
// basket at balloon.pos. A scene of its own should call tickBalloon(dt) every frame.
const BALLOON_INTERLUDES = [];
// Extra lines for the ending's stats: functions returning [label, value] or null.
const BALLOON_ENDING_STATS = [];

// What each cache holds, for when the item list has no name for a part.
const BALLOON_PART_NAMES = {
  rope: 'Climbing rope', basket: 'Wicker basket', envelope: 'Envelope silk', tanks: 'Fuel tanks', regulator: 'Regulator and hose',
  altimeter: 'Altimeter', harness: 'Harness and carabiners', striker: 'Star-iron striker', crown: 'Crown ring', burner: 'Burner',
};
// Her thoughts, if the story has none of its own for these moments.
const BALLOON_LINES = {
  assembleNeed: 'Varga\'s launch frame. She built it for a balloon that isn\'t here yet.',
  assemble: 'Weather-balloon silk and a dead woman\'s sums. It\'ll do.',
  launch: 'Goodbye, Hollow. I won\'t write.',
  dawn: 'Above the Hollow, first light',
};

let balloonModel = null;
let balloonSpot = null; // the launch point: { x, y, z } and `out`, the way away from the vents
let balloonScene = null; // the launch and the ascent, while they play
let balloonCollider = null;
let balloonRoar = null;
let balloonWind = null;
const balloonWolves = [];
const balloonZero = new THREE.Vector3(), balloonUp = new THREE.Vector3(0, 1, 0);
const balloonV = new THREE.Vector3(), balloonW = new THREE.Vector3(), balloonCam = new THREE.Vector3(), balloonLook = new THREE.Vector3();

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // The burner's blast: a deep roar with a hiss on top, faded in and out as it burns.
  burnerLoop() { return this.loop({ noise: 1.1, filter: 620, hum: 0.55, humFreq: 43 }); },
  burnerLight() { this.burst(0.3, 2400, 0.9, 0.22, 'bandpass'); this.tone(70, 140, 0.25, 0.14, 'sawtooth'); },
  ropeSnap() { this.burst(0.05, 3400, 1.4, 0.6, 'bandpass'); this.tone(520, 90, 0.2, 0.2, 'triangle'); this.burst(0.4, 900, 0.8, 0.18, 'bandpass'); },
  hammer() { this.burst(0.05, 1600, 1.6, 0.5, 'bandpass'); this.tone(260, 120, 0.09, 0.28, 'triangle'); },
  wicker() { this.burst(0.28, 2600, 3, 0.14, 'bandpass'); this.glide([[0, 260], [0.3, 330]], 0.035, 'sawtooth'); },
  silk() { this.burst(0.7, 4200, 0.5, 0.14, 'highpass'); },
  ropeCreak() { this.glide([[0, 120], [0.5, 175], [0.9, 140]], 0.05, 'sawtooth', 7); },
  // Three soft bells as the balloon comes out into the light.
  dawnChime() {
    [[0, 784], [0.28, 988], [0.62, 1319], [1.1, 1175]].forEach(([at, freq]) => setTimeout(() => {
      this.tone(freq, freq * 0.998, 3.2, 0.055, 'sine');
      this.tone(freq * 2.76, freq * 2.75, 1.2, 0.012, 'sine');
    }, at * 1000));
  },
});

/* ---------- Textures ---------- */
// The envelope's silk, laid out flat: u runs round the balloon, v from the mouth (bottom)
// to the crown (top). Crimson and cream gores, Varga's patches over the worst of the tears,
// and a cream band round the widest part with the station's name stencilled on it.
function balloonSilkTexture(equator, gores) {
  const rand = seededRandom(1985);
  return canvasTexture(1024, 1024, (g, w, h) => {
    const yOf = (v) => (1 - v) * h;
    const gw = w / gores;
    for (let i = 0; i < gores; i++) {
      g.fillStyle = i % 2 ? '#e9dcc0' : '#9c1f37';
      g.fillRect(i * gw, 0, gw + 1, h);
      // Each gore was cut from a different bolt, so the shades drift a little.
      g.fillStyle = `rgba(${i % 2 ? '120,90,40' : '40,0,10'},${0.04 + rand() * 0.08})`;
      g.fillRect(i * gw, 0, gw + 1, h);
    }
    // The skirt by the burner is tan heat-proof cloth, scorched near the mouth.
    const skirt = g.createLinearGradient(0, yOf(0), 0, yOf(0.09));
    skirt.addColorStop(0, '#2c221c');
    skirt.addColorStop(0.35, '#6e5a44');
    skirt.addColorStop(1, '#8c7556');
    g.fillStyle = skirt;
    g.fillRect(0, yOf(0.09), w, h * 0.09 + 1);
    // A darker crown round the vent at the top.
    g.fillStyle = '#6d1527';
    g.fillRect(0, 0, w, h * 0.05);
    // The band, with the name in crimson.
    const band = [equator - 0.035, equator + 0.035];
    g.fillStyle = '#efe4cc';
    g.fillRect(0, yOf(band[1]), w, (band[1] - band[0]) * h);
    g.fillStyle = '#7a1428';
    g.fillRect(0, yOf(band[1]) - 3, w, 3);
    g.fillRect(0, yOf(band[0]), w, 3);
    g.font = 'bold 34px Georgia, serif';
    g.textBaseline = 'middle';
    g.fillStyle = '#8e1b35';
    const label = 'HOLLOW STATION  ·  1985  ·  ';
    const lw = g.measureText(label).width;
    for (let x = 6; x < w; x += lw) g.fillText(label, x, yOf(equator) + 1);
    // Horizontal panel seams, and the load tapes up every gore edge.
    g.strokeStyle = 'rgba(40,10,15,0.45)';
    g.lineWidth = 1.2;
    for (let v = 0.09; v < 0.96; v += 0.055) {
      if (v > band[0] - 0.02 && v < band[1] + 0.02) continue;
      g.beginPath(); g.moveTo(0, yOf(v)); g.lineTo(w, yOf(v)); g.stroke();
    }
    g.fillStyle = 'rgba(60,40,30,0.85)';
    for (let i = 0; i <= gores; i++) g.fillRect(i * gw - 2, 0, 4, h);
    // Patches: weather-balloon silk in odd colours, stitched on by hand.
    const patchColours = ['#f4eee2', '#c64860', '#d8c79a', '#b9c6d6', '#7d1a2e', '#efe8d0', '#e0a0a8'];
    for (let n = 0; n < 34; n++) {
      const pw = 14 + rand() * 46, ph = 12 + rand() * 40;
      const x = rand() * (w - pw), y = h * (0.1 + rand() * 0.82);
      g.save();
      g.translate(x + pw / 2, y + ph / 2);
      g.rotate((rand() - 0.5) * 0.5);
      g.fillStyle = patchColours[Math.floor(rand() * patchColours.length)];
      g.globalAlpha = 0.92;
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.globalAlpha = 1;
      g.setLineDash([3, 3]);
      g.strokeStyle = 'rgba(30,20,20,0.7)';
      g.lineWidth = 1.3;
      g.strokeRect(-pw / 2 + 2, -ph / 2 + 2, pw - 4, ph - 4);
      g.setLineDash([]);
      g.restore();
    }
    // Old repairs in pencil-thin darns, and a grubby handprint or two near the mouth.
    g.strokeStyle = 'rgba(30,20,20,0.5)';
    for (let n = 0; n < 40; n++) {
      const x = rand() * w, y = h * (0.15 + rand() * 0.75), len = 6 + rand() * 18;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (rand() - 0.5) * 4); g.stroke();
    }
    g.fillStyle = 'rgba(30,20,15,0.18)';
    for (let n = 0; n < 5; n++) { g.beginPath(); g.ellipse(rand() * w, yOf(0.1 + rand() * 0.06), 10, 14, 0, 0, Math.PI * 2); g.fill(); }
  });
}

// Wicker: willow strands woven round upright stakes.
function balloonWickerTexture() {
  const rand = seededRandom(31);
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5a3d20';
    g.fillRect(0, 0, w, h);
    const rows = 22, cols = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = (c + (r % 2) * 0.5) * (w / cols), y = (r + 0.5) * (h / rows);
        const tone = 120 + rand() * 50;
        g.fillStyle = `rgb(${tone + 40},${tone * 0.78 + 10},${tone * 0.42})`;
        g.beginPath();
        g.ellipse(x + w / cols / 2, y, w / cols * 0.55, h / rows * 0.42, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,240,200,0.18)';
        g.fillRect(x + 3, y - 2, w / cols * 0.7, 1.5);
      }
    }
    // The stakes show between the weave.
    g.fillStyle = 'rgba(40,25,10,0.55)';
    for (let c = 0; c <= cols; c++) g.fillRect(c * (w / cols) - 1, 0, 2, h);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function balloonPlankTexture() {
  const rand = seededRandom(7);
  return canvasTexture(128, 128, (g, w, h) => {
    for (let i = 0; i < 6; i++) {
      const tone = 130 + rand() * 40;
      g.fillStyle = `rgb(${tone},${tone * 0.72},${tone * 0.45})`;
      g.fillRect(0, i * (h / 6), w, h / 6);
      g.fillStyle = 'rgba(50,30,15,0.7)';
      g.fillRect(0, i * (h / 6), w, 2);
      g.strokeStyle = 'rgba(80,50,25,0.35)';
      for (let k = 0; k < 4; k++) { const y = i * (h / 6) + 4 + rand() * (h / 6 - 6); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 2, w * 0.6, y - 2, w, y + 1); g.stroke(); }
      g.fillStyle = '#2b2520';
      g.fillRect(6, i * (h / 6) + 8, 3, 3);
      g.fillRect(w - 9, i * (h / 6) + 8, 3, 3);
    }
  });
}

/* ---------- Models ---------- */
// The envelope's outline from the mouth up: a cone that swells into a round dome. Returns
// the points and, for each, how far along the silk it lies (0-1), so the texture spreads
// evenly rather than by point count.
function balloonProfile() {
  const { height, radius, throat, rings } = BALLOON.envelope;
  const equatorY = height - radius;
  const points = [];
  const lower = Math.round(rings * 0.48);
  for (let j = 0; j <= lower; j++) {
    const s = j / lower;
    // Meets the dome with a vertical tangent, so the join doesn't crease.
    points.push(new THREE.Vector2(throat + (radius - throat) * (1 - Math.pow(1 - s, 1.7)), s * equatorY));
  }
  for (let j = 1; j <= rings - lower; j++) {
    const a = (j / (rings - lower)) * Math.PI / 2;
    points.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * radius), equatorY + Math.sin(a) * radius));
  }
  const along = [0];
  for (let j = 1; j < points.length; j++) along.push(along[j - 1] + points[j].distanceTo(points[j - 1]));
  const total = along[along.length - 1];
  return { points, along: along.map((d) => d / total), equator: along[lower] / total };
}

function buildBalloonEnvelope() {
  const { gores, segments } = BALLOON.envelope;
  const profile = balloonProfile();
  const geo = new THREE.LatheGeometry(profile.points, segments);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const count = profile.points.length;
  // The silk bulges between the load tapes, so each gore swells a little.
  for (let i = 0; i <= segments; i++) {
    const frac = ((i / segments) * gores) % 1;
    const bulge = Math.sin(Math.PI * frac);
    for (let j = 0; j < count; j++) {
      const k = i * count + j;
      const v = profile.along[j];
      const lobe = 0.968 + 0.032 * bulge * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.05)), 0.6);
      pos.setX(k, pos.getX(k) * lobe);
      pos.setZ(k, pos.getZ(k) * lobe);
      uv.setY(k, v);
    }
  }
  geo.computeVertexNormals();
  const map = balloonSilkTexture(profile.equator, gores);
  const material = new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: 0xffa060, emissiveIntensity: 0.03, roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = BALLOON.throatY;
  return mesh;
}

// The burner's flame: a long roaring plume when it burns, a little blue pilot otherwise.
function buildBalloonFlame() {
  const count = 90;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5, map: TEX.softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false;
  const seeds = Array.from({ length: count }, () => ({ t: Math.random(), a: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 0.6, k: 1.6 + Math.random() * 1.6 }));
  const base = BALLOON.burnerY + 0.24;
  points.tick = (dt, burn, time) => {
    const length = 0.12 + burn * 2.9;
    points.material.size = 0.16 + burn * 0.5;
    for (let i = 0; i < count; i++) {
      const p = seeds[i];
      p.t = (p.t + dt * p.k * (0.8 + burn)) % 1;
      const r = (0.025 + Math.sin(p.t * Math.PI) * (0.03 + 0.2 * burn)) * p.s;
      const wobble = Math.sin(time * 23 + i) * 0.03 * burn;
      positions[i * 3] = Math.cos(p.a) * r + wobble;
      positions[i * 3 + 1] = base + p.t * length;
      positions[i * 3 + 2] = Math.sin(p.a) * r;
      const heat = 1 - p.t;
      // Blue at the jet, then yellow-white, then orange at the tips.
      const blue = Math.max(0, 1 - p.t * 6) * (1 - burn * 0.6);
      const glow = burn * 1.0 + 0.25;
      colors[i * 3] = (0.25 * blue + (3.2 * heat + 0.3) * (1 - blue)) * glow * heat;
      colors[i * 3 + 1] = (0.45 * blue + 1.9 * heat * heat * (1 - blue)) * glow * heat;
      colors[i * 3 + 2] = (2.2 * blue + 0.5 * heat * heat * heat * (1 - blue)) * glow * heat;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
  return points;
}

// Everything that flies: the basket with Varga's kit in it, the burner on its frame, the
// cables and the envelope. Built with the basket floor's centre at the origin's height
// BALLOON.basket.floor, so the group stands on the ground at its origin.
function buildBalloonModel() {
  const { w, h, floor } = BALLOON.basket;
  const group = new THREE.Group();
  const rig = new THREE.Group(); // tilts and sways round the basket floor
  rig.position.y = floor;
  group.add(rig);
  const mats = {
    wicker: new THREE.MeshStandardMaterial({ map: balloonWickerTexture(), roughness: 0.95, side: THREE.DoubleSide }),
    leather: new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.55 }),
    plank: new THREE.MeshStandardMaterial({ map: balloonPlankTexture(), roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xa5abb4, metalness: 0.85, roughness: 0.32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x24252b, metalness: 0.6, roughness: 0.5 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x7e2a26, metalness: 0.35, roughness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: 0.9, roughness: 0.3 }),
    rope: new THREE.MeshStandardMaterial({ color: 0xb59a6c, roughness: 0.95 }),
    canvas: new THREE.MeshStandardMaterial({ color: 0x55603f, roughness: 1 }),
    sand: new THREE.MeshStandardMaterial({ color: 0x9c8a66, roughness: 1 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.8 }),
  };
  const part = (geo, mat, x, y, z, parent = rig) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const half = w / 2;

  // The basket: four woven walls, a plank floor and a padded leather rim.
  const wall = new THREE.BoxGeometry(w, h, 0.05);
  const uvs = wall.attributes.uv;
  for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 1.6, uvs.getY(i) * 1.2);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const mesh = part(wall, mats.wicker, Math.sin(a) * (half - 0.025), h / 2 - floor, Math.cos(a) * (half - 0.025));
    mesh.rotation.y = a;
  }
  part(new THREE.BoxGeometry(w - 0.04, 0.06, w - 0.04), mats.plank, 0, -0.03, 0);
  part(new THREE.BoxGeometry(w + 0.04, 0.1, w + 0.04), mats.dark, 0, -floor + 0.05, 0);
  const rimY = h - floor;
  for (let k = 0; k < 4; k++) {
    const rim = part(new THREE.CylinderGeometry(0.055, 0.055, w + 0.08, 8).rotateZ(Math.PI / 2), mats.leather, 0, rimY, 0);
    rim.rotation.y = (k / 4) * Math.PI * 2;
    rim.position.set(Math.sin(rim.rotation.y) * half, rimY, Math.cos(rim.rotation.y) * half);
  }
  // Corner posts in leather sleeves, running up to the burner frame as the flexi-rods.
  const frameY = BALLOON.burnerY;
  const frameHalf = 0.42;
  const rod = (from, to, mat, r = 0.022) => {
    const dir = balloonV.subVectors(to, from);
    const mesh = part(new THREE.CylinderGeometry(r, r, dir.length(), 6), mat, (from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  };
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [sx, sz] of corners) {
    part(new THREE.CylinderGeometry(0.045, 0.045, h, 8), mats.leather, sx * half, h / 2 - floor, sz * half);
    rod(new THREE.Vector3(sx * half, rimY, sz * half), new THREE.Vector3(sx * frameHalf, frameY, sz * frameHalf), mats.sleeve, 0.03);
  }
  // The burner: a square frame, a coiled double burner and its blast valve lever.
  for (let k = 0; k < 4; k++) {
    const bar = part(new THREE.CylinderGeometry(0.025, 0.025, frameHalf * 2, 6).rotateZ(Math.PI / 2), mats.steel, 0, frameY, 0);
    const a = (k / 4) * Math.PI * 2;
    bar.position.set(Math.sin(a) * frameHalf, frameY, Math.cos(a) * frameHalf);
    bar.rotation.y = a;
  }
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) rod(new THREE.Vector3(sx * frameHalf, frameY, sz * frameHalf), new THREE.Vector3(sx * 0.13, frameY + 0.05, sz * 0.13), mats.steel, 0.018);
  part(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 14), mats.dark, 0, frameY + 0.06, 0);
  for (let k = 0; k < 4; k++) part(new THREE.TorusGeometry(0.17, 0.022, 6, 22).rotateX(Math.PI / 2), mats.steel, 0, frameY + k * 0.055 - 0.02, 0);
  part(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10), mats.brass, 0, frameY + 0.24, 0);
  const lever = part(new THREE.BoxGeometry(0.03, 0.34, 0.03), mats.dark, 0.16, frameY - 0.2, 0.12);
  lever.rotation.z = 0.25;
  part(new THREE.SphereGeometry(0.03, 8, 6), mats.leather, 0.2, frameY - 0.37, 0.12);
  // Varga's kit: two fuel tanks from the lake, the hose, the altimeter on the rim, the coil
  // of climbing rope and the harness hung on a corner.
  for (const [sx, sz] of [[1, -1], [-1, -1]]) {
    part(new THREE.CylinderGeometry(0.17, 0.17, 0.82, 14), mats.tank, sx * 0.48, 0.41, sz * 0.48);
    part(new THREE.CylinderGeometry(0.172, 0.172, 0.05, 14), mats.steel, sx * 0.48, 0.62, sz * 0.48);
    part(new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.tank, sx * 0.48, 0.82, sz * 0.48);
    part(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8), mats.brass, sx * 0.48, 1.0, sz * 0.48);
  }
  const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(0.48, 1.05, -0.48), new THREE.Vector3(0.5, 1.5, -0.3), new THREE.Vector3(0.3, 2.2, -0.12), new THREE.Vector3(0.1, frameY - 0.05, -0.05)]);
  part(new THREE.TubeGeometry(hose, 20, 0.018, 5), mats.dark, 0, 0, 0);
  const hose2 = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.48, 1.05, -0.48), new THREE.Vector3(-0.5, 1.5, -0.3), new THREE.Vector3(-0.3, 2.2, -0.12), new THREE.Vector3(-0.1, frameY - 0.05, -0.05)]);
  part(new THREE.TubeGeometry(hose2, 20, 0.018, 5), mats.dark, 0, 0, 0);
  part(new THREE.BoxGeometry(0.16, 0.12, 0.06), mats.dark, 0, rimY + 0.09, -half + 0.02);
  const dial = part(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2ead2, roughness: 0.5, emissive: 0x403520, emissiveIntensity: 0.4 }), 0, rimY + 0.09, -half - 0.012);
  dial.rotation.y = Math.PI;
  part(new THREE.TorusGeometry(0.048, 0.008, 6, 16), mats.brass, 0, rimY + 0.09, -half - 0.015);
  for (let k = 0; k < 6; k++) part(new THREE.TorusGeometry(0.12 + (k % 2) * 0.008, 0.014, 5, 18), mats.rope, half + 0.025 + k * 0.012, 0.62 - k * 0.012, 0.3).rotation.set(0.15 * (k % 3), Math.PI / 2, 0);
  part(new THREE.BoxGeometry(0.05, 0.5, 0.12), mats.canvas, -half - 0.03, 0.62, 0.35);
  part(new THREE.TorusGeometry(0.05, 0.009, 6, 12), mats.steel, -half - 0.04, 0.4, 0.35).rotation.y = Math.PI / 2;
  // Sandbags hung over the rim, for ballast.
  for (const [x, z] of [[0.3, half + 0.05], [-0.3, half + 0.05]]) {
    const bag = part(new THREE.SphereGeometry(0.11, 8, 6), mats.sand, x, rimY - 0.12, z);
    bag.scale.set(1, 1.3, 0.6);
  }

  // The envelope and its crown ring.
  const envelope = buildBalloonEnvelope();
  rig.add(envelope);
  const throatRing = part(new THREE.TorusGeometry(BALLOON.envelope.throat, 0.03, 6, 48).rotateX(Math.PI / 2), mats.steel, 0, BALLOON.throatY + 0.02, 0);
  throatRing.castShadow = false;

  // Cables from the burner frame to the mouth: four from each corner.
  const lines = [];
  const throatPoints = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + Math.PI / 16;
    throatPoints.push(new THREE.Vector3(Math.cos(a) * BALLOON.envelope.throat, BALLOON.throatY + 0.02, Math.sin(a) * BALLOON.envelope.throat));
  }
  for (const [sx, sz] of corners) {
    const corner = new THREE.Vector3(sx * frameHalf, frameY + 0.02, sz * frameHalf);
    const near = throatPoints.slice().sort((p, q) => p.distanceTo(corner) - q.distanceTo(corner)).slice(0, 4);
    for (const p of near) lines.push(corner.x, corner.y, corner.z, p.x, p.y, p.z);
  }
  const cableGeo = new THREE.BufferGeometry();
  cableGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  rig.add(new THREE.LineSegments(cableGeo, new THREE.LineBasicMaterial({ color: 0x2a2420 })));

  const flame = buildBalloonFlame();
  rig.add(flame);
  return { group, rig, envelope, flame, mats };
}

// Two tether ropes from the basket to stakes in the snow, and what's left of them once cut.
function buildBalloonTethers(mats) {
  const ropes = [];
  for (let k = 0; k < 2; k++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc2a678 }));
    line.frustumCulled = false;
    const stake = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.55, 6), mats.leather);
    post.position.y = 0.2;
    post.rotation.z = 0.3;
    post.castShadow = true;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2f5ff, roughness: 1 }));
    mound.scale.y = 0.45;
    stake.add(post, mound);
    ropes.push({ line, stake, from: new THREE.Vector3(), to: new THREE.Vector3(), cut: 0 });
  }
  return ropes;
}

// The sea of cloud over the crater, seen from above at dawn: a broad sheet of billows, lit
// by its own low sun (the world's sun stands high), pooling in among the peaks at the rim.
function buildBalloonCloudDeck() {
  const rings = 90, segs = 160, reach = 3000;
  const positions = [], fades = [], tops = [], index = [];
  const billow = (x, z) => 18 * valueNoise(x / 260 + 4.1, z / 260 - 2.7) + 8 * valueNoise(x / 80 - 1.3, z / 80 + 6.6) + 3 * valueNoise(x / 24, z / 24);
  positions.push(0, billow(0, 0), 0);
  fades.push(1);
  tops.push(billow(0, 0) / 29);
  for (let j = 1; j <= rings; j++) {
    const r = reach * Math.pow(j / rings, 1.8);
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const b = billow(x, z);
      positions.push(x, b - THREE.MathUtils.smoothstep(r, 1800, reach) * 30, z);
      fades.push(1 - THREE.MathUtils.smoothstep(r, 2300, reach));
      tops.push(b / 29);
    }
  }
  for (let i = 0; i < segs; i++) index.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let j = 1; j < rings; j++) {
    for (let i = 0; i < segs; i++) {
      const a = 1 + (j - 1) * segs + i, b = 1 + (j - 1) * segs + ((i + 1) % segs);
      const c = a + segs, d = b + segs;
      index.push(a, b, d, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aFade', new THREE.Float32BufferAttribute(fades, 1));
  geo.setAttribute('aTop', new THREE.Float32BufferAttribute(tops, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: {
      uSun: { value: new THREE.Vector3(0.5, 0.1, 0.85).normalize() },
      uLit: { value: new THREE.Color(0xffe6cf).multiplyScalar(1.12) },
      uShade: { value: new THREE.Color(0x7d7aae) },
      uHaze: { value: new THREE.Color(0xe9b9a6) },
      uGlow: { value: new THREE.Color(0xffb070) },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      attribute float aFade; attribute float aTop; varying vec3 vNormalW; varying vec3 vPos; varying float vFade; varying float vTop;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPos = world.xyz; vFade = aFade; vTop = aTop;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform vec3 uSun; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uHaze; uniform vec3 uGlow; uniform float uOpacity;
      varying vec3 vNormalW; varying vec3 vPos; varying float vFade; varying float vTop;
      void main() {
        vec3 n = normalize(vNormalW);
        if (n.y < 0.0) n = -n;
        // The low sun rakes across the billows: slopes that face it and the crests catch the
        // light, the hollows between fill with lilac shadow.
        vec2 toSun = normalize(uSun.xz);
        float facing = clamp(0.5 + dot(n.xz, toSun) * 2.6, 0.0, 1.0);
        float crest = smoothstep(-0.55, 0.75, vTop);
        vec3 c = mix(uShade, uLit, clamp(facing * 0.55 + crest * 0.65 - 0.1, 0.0, 1.0));
        vec3 view = normalize(vPos - cameraPosition);
        c += uGlow * pow(max(dot(view, uSun), 0.0), 5.0) * 0.55;
        float d = length(vPos.xz - cameraPosition.xz);
        c = mix(c, uHaze, smoothstep(500.0, 3000.0, d) * 0.65);
        gl_FragColor = vec4(c, vFade * uOpacity);
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

/* ---------- Building it ---------- */
function balloonPartIds() {
  return SITES.filter((s) => s.part).map((s) => s.part);
}

function balloonPartName(id) {
  const item = ITEMS[`part:${id}`];
  return (item && item.name) || BALLOON_PART_NAMES[id] || id;
}

function balloonPartsHeld() {
  return balloonPartIds().filter((id) => hasItem(`part:${id}`)).length;
}

function balloonReady() {
  return balloonPartsHeld() >= balloonPartIds().length && survival.planks >= BALLOON.planks;
}

// One of her thoughts from the story's lines, or ours if it has none.
function balloonLine(key) {
  const entry = LORE.lines && LORE.lines[key];
  if (Array.isArray(entry) && entry.length) return entry[Math.floor(Math.random() * entry.length)];
  if (typeof entry === 'string' && entry) return entry;
  return BALLOON_LINES[key] || '';
}

function balloonFrameLabel() {
  if (balloon.phase === 'tethered') return showdown.stage === 'none' ? 'Press E to climb in and cut the tether' : showdownRepairLabel();
  if (balloonReady()) return 'Press E to assemble Varga\'s balloon';
  const total = balloonPartIds().length;
  return `Varga's launch frame: ${balloonPartsHeld()}/${total} parts, ${Math.min(survival.planks, BALLOON.planks)}/${BALLOON.planks} planks`;
}

function useBalloonFrame() {
  // Climbing in sets off Teto's ambush, and what follows it (showdown.js).
  if (balloon.phase === 'tethered') { showdownUseFrame(); return; }
  if (balloon.phase !== 'none') return;
  if (balloonReady()) { startBalloonAssembly(); return; }
  // Not yet: say what's still missing.
  const missing = balloonPartIds().filter((id) => !hasItem(`part:${id}`)).map((id) => balloonPartName(id).toLowerCase());
  const planks = BALLOON.planks - survival.planks;
  const needs = [];
  if (missing.length) needs.push(missing.length > 4 ? `${missing.length} of her parts` : missing.join(', '));
  if (planks > 0) needs.push(`${planks} more ${planks === 1 ? 'plank' : 'planks'}`);
  showNote(`Still missing: ${needs.join(', and ')}.`);
  sayLine('assembleNeed');
}

// Puts the finished balloon up, tethered at the launch point.
function raiseBalloon() {
  if (balloon.assembled) return;
  balloon.assembled = true;
  balloon.phase = 'tethered';
  balloon.alt = 0;
  balloon.drift.set(0, 0, 0);
  balloon.burnTimer = 2;
  balloonModel.group.visible = true;
  for (const rope of balloonModel.tethers) { rope.cut = 0; rope.line.visible = true; rope.stake.visible = true; }
  // The basket blocks her, wherever the tile around it gets rebuilt.
  balloonCollider = { x: balloonSpot.x, z: balloonSpot.z, r: 1.05, h: 1.2 };
  LANDMARK_COLLIDERS.push(balloonCollider);
  balloonCollider.live = addCollider(balloonCollider.x, balloonCollider.z, balloonCollider.r, balloonCollider.h);
  pushOutOfColliders(player.pos, 0.34);
  tickBalloon(0);
}

function dropBalloonCollider() {
  if (!balloonCollider) return;
  const i = LANDMARK_COLLIDERS.indexOf(balloonCollider);
  if (i >= 0) LANDMARK_COLLIDERS.splice(i, 1);
  if (balloonCollider.live) removeCollider(balloonCollider.live);
  balloonCollider = null;
}

// A testing shortcut (and one for the moderator menu): all ten parts and the planks.
function giveBalloonParts() {
  for (const id of balloonPartIds()) if (!hasItem(`part:${id}`)) packAdd(`part:${id}`, 1);
  survival.planks = Math.max(survival.planks, BALLOON.planks);
}

/* ---------- Assembly ---------- */
// A short fade to black: the parts go together in a montage of knocks and creaks, and it
// comes up on the balloon standing tall over the vents, the burner roaring.
const BALLOON_BUILD = { fade: 0.7, montage: 0.95, each: 0.34, reveal: 4.5, end: 8.6 };

function startBalloonAssembly() {
  survival.planks -= BALLOON.planks;
  const s = { t: 0, fired: {} };
  balloon.assemblyTool = survival.tool;
  survival.tool = 'bow';
  playScene({ update: (dt) => updateBalloonAssembly(dt, s), skip: () => finishBalloonAssembly() });
  $('balloon-fade').classList.add('on');
  Sfx.wicker();
}

function balloonOnce(s, key, at, fn) {
  if (!s.fired[key] && s.t >= at) { s.fired[key] = true; fn(); }
}

function updateBalloonAssembly(dt, s) {
  s.t += dt;
  game.time += dt;
  const B = BALLOON_BUILD;
  const parts = balloonPartIds();
  // The montage: each part named as it goes on, with a sound for the work.
  parts.forEach((id, i) => balloonOnce(s, id, B.montage + i * B.each, () => {
    caption(balloonPartName(id), 'place');
    [Sfx.hammer, Sfx.wicker, Sfx.silk, Sfx.ropeCreak][i % 4].call(Sfx);
  }));
  balloonOnce(s, 'up', B.reveal, () => {
    caption('');
    raiseBalloon();
    balloon.burnHold = 2.6;
    Sfx.burnerLight();
    $('balloon-fade').classList.remove('on');
    // She stands back to look at it.
    const out = balloonSpot.out;
    player.pos.set(balloonSpot.x + out.x * 3.4, 0, balloonSpot.z + out.z * 3.4);
    player.pos.y = groundHeight(player.pos.x, player.pos.z);
    player.bodyYaw = Math.atan2(-out.x, -out.z);
  });
  balloonOnce(s, 'line', B.reveal + 1.4, () => caption(balloonLine('assemble'), 'line'));
  player.stride = 0;
  player.runBlend = 0;
  poseAvatar(dt, balloonZero, false);
  avatar.simulate(dt);
  updateFires(dt);
  if (balloon.assembled) {
    // A low shot rising up the envelope as it fills the last of the way.
    const u = clamp((s.t - B.reveal) / (B.end - B.reveal), 0, 1);
    balloonModel.envelope.scale.setScalar(0.94 + 0.06 * smooth(u * 1.6));
    const out = balloonSpot.out, side = balloonSpot.side;
    camera.position.set(
      balloonSpot.x + out.x * 21 + side.x * 7,
      balloonSpot.y + lerp(1.2, 2.6, smooth(u)),
      balloonSpot.z + out.z * 21 + side.z * 7,
    );
    camera.lookAt(balloonSpot.x, balloonSpot.y + lerp(6.5, 9, smooth(u)), balloonSpot.z);
    setFov(56);
    tickBalloon(dt);
  }
  if (s.t >= B.end) finishBalloonAssembly();
}

function finishBalloonAssembly() {
  raiseBalloon();
  balloonModel.envelope.scale.setScalar(1);
  $('balloon-fade').classList.remove('on');
  if (balloon.assemblyTool) { survival.tool = balloon.assemblyTool; balloon.assemblyTool = null; }
  if (!activeScene) return;
  endScene();
  toast('Varga\'s balloon is ready');
  emitGame('balloonAssembled');
}

/* ---------- The launch ---------- */
// Part one: she climbs in, the burner roars, she cuts the tether and it lifts off the
// Breath while the wolves gather at the clearing's edge. Part two, after anything waiting
// in BALLOON_INTERLUDES: up through the cloud cap into the dawn, and the ending.
const BALLOON_LIFT = { hop: 1.0, aboard: 1.7, burn: 2.4, cut: 5.4, wolves: 7.6, rise: 10.6, end: 16 };
const BALLOON_ASCENT = { cloud: 5, dawn: 11, wide: 11.6, last: 17, ending: 22.5 };

function startBalloonLaunch() {
  if (balloon.phase !== 'tethered') return;
  balloon.phase = 'launch';
  balloon.interlude = 0;
  balloonScene = {
    part: 1, t: 0, fired: {},
    from: player.pos.clone(),
    tool: survival.tool,
  };
  // She puts the blade or the axe away to climb in.
  survival.tool = 'bow';
  survival.swing = null;
  playScene({ update: updateBalloonLaunch, skip: skipBalloonLaunch });
  Sfx.wicker();
}

// Space during the lift-off goes on to whatever waits above the trees, or to the ascent;
// during the ascent, straight to the ending.
function skipBalloonLaunch() {
  const s = balloonScene;
  if (!s) return;
  if (s.part === 1) {
    s.t = BALLOON_LIFT.end;
    balloonCutTether(true);
    balloon.alt = balloonLiftAltitude(BALLOON_LIFT.end);
    clearBalloonWolves();
    balloonAboveTrees();
  } else {
    balloonReachEnding(true);
  }
}

function balloonLiftAltitude(t) {
  return 46 * smooth((t - BALLOON_LIFT.cut) / (BALLOON_LIFT.end - BALLOON_LIFT.cut));
}

function balloonCutTether(quiet = false) {
  if (balloon.launched) return;
  balloon.launched = true;
  dropBalloonCollider();
  for (const rope of balloonModel.tethers) rope.cut = 0.001;
  if (!quiet) {
    Sfx.ropeSnap();
    impact('white', 60);
    for (const rope of balloonModel.tethers) burst(rope.to, 0xf2f5ff, 14, 2.4);
  }
}

// Standing in the basket, swaying with it, a hand up on the blast valve while it burns.
const BALLOON_POLE = new THREE.Vector3(-0.9, -0.15, -0.25);
function poseBalloonRider(dt, reach) {
  player.pos.copy(balloon.pos);
  player.stride = 0;
  player.runBlend = 0;
  player.aimT = 0;
  poseAvatar(dt, balloonZero, false);
  if (reach > 0.01) {
    const arm = avatar.armR, shoulder = arm.upper.position;
    balloonV.set(shoulder.x + 0.03, shoulder.y + 0.56 * reach - 0.4 * (1 - reach), shoulder.z + 0.14 * reach + 0.05);
    solveArm(arm, balloonV, BALLOON_POLE);
    arm.hand.quaternion.identity();
  }
  avatar.simulate(dt);
}

function updateBalloonLaunch(dt) {
  const s = balloonScene;
  if (!s) return;
  s.t += dt;
  game.time += dt;
  if (s.part === 1) updateBalloonLift(dt, s);
  else updateBalloonAscent(dt, s);
}

function updateBalloonLift(dt, s) {
  const L = BALLOON_LIFT, t = s.t;
  const spot = balloonSpot, out = spot.out, side = spot.side;
  const once = (key, at, fn) => balloonOnce(s, key, at, fn);
  if (t >= L.cut) balloon.alt = balloonLiftAltitude(t);
  // The wind takes it gently away from the vents as it climbs.
  balloon.drift.set(out.x, 0, out.z).multiplyScalar(balloon.alt * 0.08);

  // Her: up to the basket, over the rim, then aboard.
  if (t < L.aboard) {
    const near = balloonV.set(s.from.x - spot.x, 0, s.from.z - spot.z);
    if (near.lengthSq() < 0.01) near.copy(out);
    near.normalize();
    const edge = balloonW.set(spot.x + near.x * 1.25, 0, spot.z + near.z * 1.25);
    if (t < L.hop) {
      const u = smooth(t / L.hop);
      player.pos.set(lerp(s.from.x, edge.x, u), 0, lerp(s.from.z, edge.z, u));
      player.pos.y = groundHeight(player.pos.x, player.pos.z);
      player.bodyYaw = Math.atan2(-near.x, -near.z);
      player.stride = 0.6 * (1 - u * u);
      player.walkPhase += dt * 9;
      poseAvatar(dt, balloonW.set(-near.x, 0, -near.z), true);
    } else {
      const u = (t - L.hop) / (L.aboard - L.hop);
      tickBalloon(0);
      player.pos.set(lerp(edge.x, balloon.pos.x, smooth(u)), 0, lerp(edge.z, balloon.pos.z, smooth(u)));
      player.pos.y = lerp(groundHeight(edge.x, edge.z), balloon.pos.y, smooth(u)) + Math.sin(u * Math.PI) * 1.05;
      player.stride = 0;
      poseAvatar(dt, balloonZero, false);
      // Knees up to clear the rim.
      const tuck = Math.sin(u * Math.PI);
      for (const leg of [avatar.legL, avatar.legR]) { leg.thigh.rotation.x = -1.5 * tuck; leg.shin.rotation.x = 2 * tuck; }
    }
    avatar.simulate(dt);
    once('rim', L.hop + 0.3, () => Sfx.wicker());
  } else {
    // Facing out, so the burner lights her face.
    player.bodyYaw = Math.atan2(out.x, out.z);
    const reach = span(t, L.burn - 0.3, L.burn + 0.1) * (1 - span(t, L.cut + 1.5, L.cut + 2.2));
    poseBalloonRider(dt, reach);
  }

  // The burner: a long blast before the cut, then steady burns as it climbs.
  once('burn', L.burn, () => { balloon.burnHold = 3.6; Sfx.burnerLight(); });
  once('line', L.burn + 0.5, () => caption(balloonLine('launch'), 'line'));
  once('cut', L.cut, () => { caption(''); balloonCutTether(); });
  once('burn2', L.cut + 1.2, () => { balloon.burnHold = 2.4; });
  once('burn3', L.rise + 1.5, () => { balloon.burnHold = 2.2; });
  once('creak', L.cut + 0.6, () => Sfx.ropeCreak());

  // The wolves come out of the trees to watch her go, and howl.
  once('wolves', L.wolves - 1.6, () => spawnBalloonWolves());
  updateBalloonWolves(dt, t - (L.wolves - 1.6));
  once('howl1', L.wolves + 2.2, () => Sfx.howl(0.9));
  once('howl2', L.wolves + 3.0, () => Sfx.howl(0.75));
  once('howl3', L.wolves + 4.1, () => Sfx.howl(0.6));

  tickBalloon(dt);
  balloonSteam(dt, 0.6);
  updateFires(dt);

  // Shots.
  const B = balloon.pos;
  if (t < L.burn) {
    // Wide and low across the clearing as she climbs aboard.
    balloonCam.set(spot.x + out.x * 8 + side.x * 4.5, spot.y + 2.1, spot.z + out.z * 8 + side.z * 4.5);
    balloonLook.set(spot.x, spot.y + 2.6 + t * 0.3, spot.z);
    setFov(50);
  } else if (t < L.cut + 0.2) {
    // Close, just outside the rim: her face in the burner's light, the glowing mouth above.
    const u = smooth((t - L.burn) / (L.cut - L.burn));
    balloonCam.set(B.x + out.x * lerp(2.9, 2.5, u) + side.x * 0.35, B.y + lerp(1.85, 1.6, u), B.z + out.z * lerp(2.9, 2.5, u) + side.z * 0.35);
    balloonLook.set(B.x, B.y + lerp(1.65, 2.15, u), B.z);
    setFov(52);
  } else if (t < L.wolves) {
    // From the snow as it lifts away overhead.
    balloonCam.set(spot.x + out.x * 11 - side.x * 3, spot.y + 0.7, spot.z + out.z * 11 - side.z * 3);
    balloonLook.set(B.x, B.y + 5.5 + balloon.alt * 0.3, B.z);
    setFov(62);
    if (t < L.cut + 0.5) shake(balloonCam, 0.15);
  } else if (t < L.rise + 2.6) {
    // Behind the wolves at the trees, looking up at the light going away above them.
    const w = s.wolfSpot;
    const cx = w.x + w.dx * 4.5 + w.sx * 1.2, cz = w.z + w.dz * 4.5 + w.sz * 1.2;
    balloonCam.set(cx, groundHeight(cx, cz) + 0.75, cz);
    // The pack low in the frame, the light climbing away above them until it leaves the top.
    const run = Math.hypot(B.x - cx, B.z - cz);
    const pitch = Math.min(Math.atan2(B.y + 8 - balloonCam.y, run) * 0.5, 0.3);
    balloonLook.set(cx + (B.x - cx) / run * 10, balloonCam.y + Math.tan(pitch) * 10, cz + (B.z - cz) / run * 10);
    setFov(56);
  } else {
    // Over the rim of the basket, looking down at the clearing falling away.
    balloonCam.set(B.x + out.x * 2.2 + side.x * 2.4, B.y + 2.9, B.z + out.z * 2.2 + side.z * 2.4);
    balloonLook.set(spot.x - out.x * 30 - side.x * 8, spot.y, spot.z - out.z * 30 - side.z * 8);
    setFov(62);
  }
  balloonPlaceCamera();
  world.stream(balloonW.set(B.x, 0, B.z), 2, 230);
  // The fog draws back once it's off the ground, so the shots from the snow can see it go.
  balloonLookAt(camera.position.y - spot.y, span(t, L.cut, L.wolves) * 0.55 + span(t, L.rise, L.rise + 2.6) * 0.45);
  if (t >= L.end) { clearBalloonWolves(); balloonAboveTrees(); }
}

function balloonPlaceCamera() {
  camera.up.set(0, 1, 0);
  camera.position.copy(balloonCam);
  camera.position.y = Math.max(camera.position.y, groundHeight(balloonCam.x, balloonCam.z) + 0.3);
  camera.lookAt(balloonLook);
}

// Clear of the trees: anything waiting in BALLOON_INTERLUDES plays now, then the ascent.
function balloonAboveTrees() {
  const next = BALLOON_INTERLUDES[balloon.interlude];
  if (next) {
    balloon.interlude++;
    balloon.phase = 'interlude';
    survival.tool = balloonScene ? balloonScene.tool : survival.tool;
    if (survival.tool === 'axe' && !survival.hasAxe) survival.tool = 'bow';
    if (survival.tool === 'katana' && !katana.owned) survival.tool = 'bow';
    if (activeScene) endScene();
    balloonScene = null;
    // She's aboard, whatever was skipped to get here.
    tickBalloon(0);
    player.pos.copy(balloon.pos);
    next(resumeBalloonLaunch);
    return;
  }
  resumeBalloonLaunch();
}

// The climb to the dawn, after the lift-off or after an interlude hands back.
function resumeBalloonLaunch() {
  if (balloon.phase === 'ascent' || balloon.phase === 'ending' || !balloon.launched) return;
  if (BALLOON_INTERLUDES[balloon.interlude]) { balloonAboveTrees(); return; }
  balloon.phase = 'ascent';
  const tool = balloonScene ? balloonScene.tool : survival.tool;
  balloonScene = { part: 2, t: 0, fired: {}, tool, startAlt: balloon.alt };
  survival.tool = 'bow';
  balloonSetupDawn();
  balloonPlaceCloudBillows();
  if (!activeScene) playScene({ update: updateBalloonLaunch, skip: skipBalloonLaunch });
  if (!balloonWind && Sfx.ctx) balloonWind = Sfx.loop({ noise: 1, filter: 1100 });
}

// How fast it climbs through the ascent, by time: steady out of the forest, fast through
// the cloud, easing off in the clear air above.
const BALLOON_CLIMB = [[0, 6], [4, 18], [8, 36], [11, 26], [15, 14], [22, 9], [40, 6]];
function balloonClimbRate(t) {
  const keys = BALLOON_CLIMB;
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  }
  return keys[keys.length - 1][1];
}

function updateBalloonAscent(dt, s) {
  const A = BALLOON_ASCENT, t = s.t;
  const spot = balloonSpot, out = spot.out, side = spot.side;
  const once = (key, at, fn) => balloonOnce(s, key, at, fn);
  balloon.alt += balloonClimbRate(t) * dt;
  // Above the cap, the wind carries it south towards the glow beyond the peaks.
  const dawn = balloonFx.dawnDir;
  balloon.drift.x += (out.x * 0.6 + dawn.x * 2.4 * span(balloon.alt, 200, 400)) * dt;
  balloon.drift.z += (out.z * 0.6 + dawn.z * 2.4 * span(balloon.alt, 200, 400)) * dt;
  balloon.burnHold = Math.max(balloon.burnHold, t < A.dawn && Math.sin(t * 0.9) > 0.55 ? 0.3 : 0);
  tickBalloon(dt);
  balloonSteam(dt, 1 - span(balloon.alt, BALLOON.cloudTop - 60, BALLOON.cloudTop));
  poseBalloonRider(dt, Math.min(1, balloon.burn * 2));
  if (balloonWind) balloonWind.set(0.1 + 0.5 * span(balloon.alt, BALLOON.cloudBase - 40, BALLOON.cloudBase + 40) * (1 - span(balloon.alt, BALLOON.cloudTop, BALLOON.cloudTop + 80)), 1);

  const B = balloon.pos;
  if (t < A.cloud) {
    // Pulling back and down from the basket: the crater falling away into the fog.
    const u = smooth(t / A.cloud);
    balloonCam.set(B.x + out.x * lerp(6, 30, u) + side.x * lerp(2, 10, u), B.y + lerp(1, -6, u), B.z + out.z * lerp(6, 30, u) + side.z * lerp(2, 10, u));
    balloonLook.set(B.x, B.y + lerp(4, 8, u), B.z);
    setFov(lerp(55, 46, u));
  } else if (t < A.dawn) {
    // Close beside it in the white, the cloud streaming past.
    balloonCam.set(B.x + out.x * 13 + side.x * 5, B.y + 2, B.z + out.z * 13 + side.z * 5);
    balloonLook.set(B.x, B.y + 8, B.z);
    setFov(50);
    once('cloud', A.cloud + 1.2, () => Sfx.silk());
  } else if (t < A.last) {
    // Out into the light: from the cloud top as it rises clear, the sun on the silk.
    if (!s.wideAt) s.wideAt = new THREE.Vector3(B.x + side.x * 34 - dawn.x * 26, spot.y + BALLOON.cloudTop + 32, B.z + side.z * 34 - dawn.z * 26);
    balloonCam.copy(s.wideAt);
    balloonLook.set(B.x, B.y + 9, B.z);
    setFov(52);
    once('chime', A.dawn + 0.2, () => { Sfx.dawnChime(); balloonFx.steam.clear(); });
    once('dawnCap', A.wide + 0.8, () => caption(balloonLine('dawn'), 'place'));
    once('dawnOff', A.last - 0.6, () => caption(''));
  } else {
    balloonFinalShot(dt, s, t - A.last);
  }
  if (t < A.last) balloonPlaceCamera();
  world.stream(balloonW.set(B.x, 0, B.z), 2, 230);
  balloonLookAt(camera.position.y - spot.y, 1);
  updateBalloonDawn();
  if (t >= A.ending) balloonReachEnding(false);
}

// The last shot, which carries on behind the ending screen: from behind and above, the
// balloon sailing away south over the sea of cloud towards the glow beyond the peaks.
function balloonFinalShot(dt, s, u) {
  const B = balloon.pos, dawn = balloonFx.dawnDir;
  const sideX = dawn.z, sideZ = -dawn.x;
  // Below and behind, hanging back further and further, so the balloon draws slowly away
  // up into the light.
  const lag = Math.min(u, 90);
  const back = 26 + lag * 1.1;
  const goal = balloonV.set(B.x - dawn.x * back + sideX * 12, B.y - 6 - lag * 0.25, B.z - dawn.z * back + sideZ * 12);
  if (!s.follow) s.follow = goal.clone();
  s.follow.lerp(goal, 1 - Math.exp(-dt * 2));
  balloonCam.copy(s.follow);
  // Looking up past it towards the sun, just clear of the notch in the peaks. Behind the
  // ending screen the view turns a little, so the balloon sits clear of the words.
  balloonW.set(B.x, B.y + 12, B.z).sub(balloonCam).normalize().multiplyScalar(0.62).addScaledVector(balloonFx.sunDir, 0.38).normalize();
  if (balloon.phase === 'ending') s.endT = (s.endT || 0) + dt;
  balloonW.applyAxisAngle(balloonUp, 0.3 * smooth((s.endT || 0) / 3));
  balloonLook.copy(balloonCam).addScaledVector(balloonW, 100);
  setFov(54);
  balloonPlaceCamera();
}

/* ---------- Wolves at the edge of the clearing ---------- */
function spawnBalloonWolves() {
  clearBalloonWolves();
  const spot = balloonSpot;
  // From the trees on the far side of the vents, so the shot looks back past the balloon.
  const a = Math.atan2(spot.out.x, spot.out.z) + 2.4;
  const dx = Math.sin(a), dz = Math.cos(a);
  const site = siteById('breath');
  const cx = site.x + dx * 24, cz = site.z + dz * 24;
  balloonScene.wolfSpot = { x: cx, z: cz, dx, dz, sx: dz, sz: -dx };
  for (let i = 0; i < 3; i++) {
    const across = (i - 1) * 2.2;
    const stop = { x: cx + dz * across - dx * (i === 1 ? 1.2 : 0), z: cz - dx * across - dz * (i === 1 ? 1.2 : 0) };
    const wolf = new Wolf(stop.x + dx * 14, stop.z + dz * 14);
    wolf.stop = stop;
    wolf.delay = i * 0.35;
    wolf.heading = Math.atan2(-dx, -dz);
    balloonWolves.push(wolf);
  }
}

// They lope in from the trees, slow, sit and lift their heads to the light going up.
function updateBalloonWolves(dt, t) {
  for (const wolf of balloonWolves) {
    const dx = wolf.stop.x - wolf.pos.x, dz = wolf.stop.z - wolf.pos.z;
    const d = Math.hypot(dx, dz);
    const going = t > wolf.delay && d > 0.3;
    if (going) {
      const speed = Math.min(6, d * 1.6 + 1);
      wolf.pos.x += (dx / d) * speed * dt;
      wolf.pos.z += (dz / d) * speed * dt;
      wolf.heading = Math.atan2(dx, dz);
      wolf.play(speed > 3 ? 'run' : 'walk');
    } else if (t > wolf.delay) {
      // Turned to face the balloon, then sitting.
      const want = Math.atan2(balloon.pos.x - wolf.pos.x, balloon.pos.z - wolf.pos.z);
      wolf.heading += Math.atan2(Math.sin(want - wolf.heading), Math.cos(want - wolf.heading)) * (1 - Math.exp(-4 * dt));
      wolf.sat = (wolf.sat || 0) + dt;
      wolf.play(wolf.sat > 0.6 ? 'sit' : 'idle');
    }
    wolf.pos.y = groundHeight(wolf.pos.x, wolf.pos.z);
    wolf.mixer.update(dt);
    wolf.holder.position.copy(wolf.pos);
    wolf.holder.rotation.y = wolf.heading;
  }
}

function clearBalloonWolves() {
  for (const wolf of balloonWolves) wolf.dispose();
  balloonWolves.length = 0;
}

/* ---------- Flight ---------- */
// Places the balloon and runs everything that moves on it: the sway, the burner and its
// light and roar, the tethers. Scenes call this every frame; so does updateBalloon.
function tickBalloon(dt) {
  if (!balloonModel || !balloon.assembled) return;
  const m = balloonModel;
  const spot = balloonSpot;
  const time = game.time;
  balloon.pos.set(spot.x + balloon.drift.x, spot.y + BALLOON.basket.floor + balloon.alt, spot.z + balloon.drift.z);
  m.group.position.set(balloon.pos.x, balloon.pos.y - BALLOON.basket.floor, balloon.pos.z);
  if (balloon.phase === 'interlude') balloon.alt += 0.35 * dt;

  // Tethered, it tugs at its ropes in the gusts; flying, it hangs and turns slowly.
  const tug = balloon.launched ? 0.4 : 1;
  m.rig.rotation.x = (Math.sin(time * 0.53) * 0.014 + Math.sin(time * 1.7) * 0.004) * tug;
  m.rig.rotation.z = (Math.sin(time * 0.41 + 1) * 0.016 + Math.sin(time * 1.3) * 0.003) * tug;
  m.rig.rotation.y = balloon.launched ? Math.sin(time * 0.07) * 0.6 : 0;
  // Shot full of holes, the envelope sags down over the basket (showdown.js).
  const sag = balloon.sag || 0;
  if (sag > 0) {
    m.envelope.scale.x = m.envelope.scale.z = 1 + sag * 0.18;
    m.envelope.scale.y = (1 - sag * 0.62) * (1 + Math.sin(time * 0.8) * 0.006);
  } else {
    m.envelope.scale.y = m.envelope.scale.x * (1 + Math.sin(time * 0.8) * 0.006);
  }

  // Tethered, it burns now and then to stay up; not once it's been shot.
  if (balloon.phase === 'tethered' && !sag) {
    balloon.burnTimer -= dt;
    if (balloon.burnTimer <= 0) {
      balloon.burnTimer = BALLOON.burnEvery[0] + Math.random() * (BALLOON.burnEvery[1] - BALLOON.burnEvery[0]);
      balloon.burnHold = 1.2 + Math.random() * 1.2;
    }
  }
  balloon.burnHold = Math.max(0, balloon.burnHold - dt);
  const want = balloon.burnHold > 0 ? 1 : 0;
  balloon.burn += (want - balloon.burn) * (1 - Math.exp(-(want ? 9 : 4) * dt));
  const burn = balloon.burn;
  m.flame.tick(dt, burn, time);
  const flicker = 0.85 + Math.sin(time * 31) * 0.08 + Math.sin(time * 13.7) * 0.07;
  m.envelope.material.emissiveIntensity = 0.03 + burn * 0.55 * flicker;
  m.group.updateMatrixWorld(true);
  balloonFx.light.position.set(0, BALLOON.burnerY + 0.6, 0).applyMatrix4(m.rig.matrixWorld);
  balloonFx.light.intensity = 1.2 + burn * 42 * flicker;

  // The roar, loud in the basket and fading across the clearing.
  if (!balloonRoar && Sfx.ctx) balloonRoar = Sfx.burnerLoop();
  if (balloonRoar) {
    const d = camera.position.distanceTo(balloonFx.light.position);
    balloonRoar.set(burn * 0.55 * clamp(1 - d / 80, 0, 1), 0.15);
  }

  // Tethers: slack curves to the stakes, or the cut ends whipping up to hang below.
  for (const rope of m.tethers) {
    if (!rope.line.visible) continue;
    rope.from.copy(rope.corner).applyMatrix4(m.rig.matrixWorld);
    if (rope.cut > 0) rope.cut = Math.min(1, rope.cut + dt * 1.8);
    const hang = balloonW.set(rope.from.x + Math.sin(time * 1.3 + rope.phase) * 0.25, rope.from.y - 2.4, rope.from.z + Math.cos(time * 1.1 + rope.phase) * 0.25);
    const end = balloonV.lerpVectors(rope.to, hang, smooth(rope.cut));
    const arr = rope.line.geometry.attributes.position.array;
    const n = arr.length / 3;
    const sag = rope.cut > 0 ? 0.2 : 0.35;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      arr[i * 3] = lerp(rope.from.x, end.x, u);
      arr[i * 3 + 1] = lerp(rope.from.y, end.y, u) - Math.sin(u * Math.PI) * sag;
      arr[i * 3 + 2] = lerp(rope.from.z, end.z, u);
    }
    rope.line.geometry.attributes.position.needsUpdate = true;
  }
}

// Steam from the Breath, rising past and around the basket.
function balloonSteam(dt, amount) {
  const fx = balloonFx;
  fx.steamT -= dt;
  while (fx.steamT <= 0 && amount > 0.02) {
    fx.steamT += 0.07 / amount;
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 9;
    balloonV.set(balloon.pos.x + Math.cos(a) * r, balloon.pos.y - 6 - Math.random() * 14, balloon.pos.z + Math.sin(a) * r);
    balloonW.set((Math.random() - 0.5) * 0.8, balloonClimbRate(balloonScene ? balloonScene.t : 0) * (balloon.phase === 'ascent' ? 1.25 : 0) + 3 + Math.random() * 3, (Math.random() - 0.5) * 0.8);
    fx.steam.emit(balloonV, balloonW, { life: 4 + Math.random() * 2, size: 3 + Math.random() * 3, grow: 2.5, alpha: 0.32 });
  }
  fx.steam.update(dt);
}

/* ---------- Fog, cloud and dawn ---------- */
const balloonFx = {
  light: null, steam: null, steamT: 0, deck: null, shell: null, sun: null, halo: null, glow: null, billows: [],
  dawnDir: new THREE.Vector3(0, 0, 1), sunDir: new THREE.Vector3(0.5, 0.1, 0.85).normalize(),
  sky: null, skyBase: null, sunLight: null, sunBase: null, haze: null, hazeBase: null, filter: -1, ready: false,
};
const BALLOON_COLOURS = {
  cloud: new THREE.Color(0xe6e9f1),
  dawnHorizon: new THREE.Color(0xffb487),
  dawnZenith: new THREE.Color(0x4f69ad),
  dawnSun: new THREE.Color(0xffc796),
  dawnHaze: new THREE.Color(0x9e98c0),
  fog: new THREE.Color(FOG_COLOR),
};
const balloonColour = new THREE.Color();

// Finds the world's sky, sun and mountain haze, so the dawn can recolour them, and keeps
// their own colours to put back for the next run.
function balloonFindWorld() {
  const fx = balloonFx;
  if (fx.skyBase) return;
  fx.sky = scene.children.find((o) => o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uZenith) || null;
  if (fx.sky) {
    const u = fx.sky.material.uniforms;
    fx.skyBase = { horizon: u.uHorizon.value.clone(), zenith: u.uZenith.value.clone(), sun: u.uSunDir.value.clone() };
  } else fx.skyBase = {};
  fx.sunLight = scene.children.find((o) => o.isDirectionalLight) || null;
  if (fx.sunLight) fx.sunBase = { color: fx.sunLight.color.clone(), intensity: fx.sunLight.intensity };
  // The mountains' haze colour lives in their compiled shader's uniforms.
  try {
    const peaks = scene.children.find((o) => o.isMesh && o.material && o.material.flatShading && o.material.fog === false);
    const uniforms = peaks && renderer.properties.get(peaks.material).uniforms;
    if (uniforms && uniforms.uHaze) { fx.haze = uniforms.uHaze.value; fx.hazeBase = fx.haze.clone(); }
  } catch { /* the haze stays as it is */ }
}

// Where the dawn comes up: the lowest notch in the peaks to the south, seen from above the
// cap, with the town's glow behind it and the sun just clear of the ridge to its east.
function balloonSetupDawn() {
  const fx = balloonFx;
  balloonFindWorld();
  if (fx.ready) return;
  fx.ready = true;
  const eye = balloonSpot.y + 520;
  const skyline = (a) => {
    let best = -1;
    for (let r = 1700; r < 5900; r += 70) best = Math.max(best, (mountainHeight(r, a) - eye) / r);
    return best;
  };
  let notch = Math.PI / 2, low = Infinity;
  for (let a = Math.PI / 2 - 0.7; a <= Math.PI / 2 + 0.7; a += 0.02) {
    const e = skyline(a);
    if (e < low) { low = e; notch = a; }
  }
  fx.dawnDir.set(Math.cos(notch), 0, Math.sin(notch));
  const sunAngle = notch + 0.3;
  const sunElev = Math.atan(Math.max(skyline(sunAngle), 0)) + 0.035;
  fx.sunDir.set(Math.cos(sunAngle) * Math.cos(sunElev), Math.sin(sunElev), Math.sin(sunAngle) * Math.cos(sunElev));
  fx.glowElev = Math.atan(low);
  fx.deck.material.uniforms.uSun.value.copy(fx.sunDir);
}

// The cloud's own billows, scattered up the column so the climb through it streams past.
function balloonPlaceCloudBillows() {
  const spot = balloonSpot;
  const rand = seededRandom(77);
  for (const b of balloonFx.billows) {
    const a = rand() * Math.PI * 2, r = 14 + rand() * 60;
    const y = spot.y + lerp(BALLOON.cloudBase - 10, BALLOON.cloudTop + 6, rand());
    b.position.set(spot.x + Math.cos(a) * r + balloon.drift.x, y, spot.z + Math.sin(a) * r + balloon.drift.z + (y - spot.y) * 0.02);
    const size = 22 + rand() * 40;
    b.scale.set(size * 1.6, size, 1);
  }
  balloonFx.billowsOn = true;
}

// Sets the fog, the sky and the light for a camera at height `h` above the launch point:
// the forest's fog thinning as she climbs, the white inside the cloud, then the dawn.
function balloonLookAt(h, clear = 0) {
  const fx = balloonFx;
  const base = BALLOON.cloudBase, top = BALLOON.cloudTop;
  const inCloud = span(h, base, base + 45) * (1 - span(h, top - 4, top + 14));
  const dawn = span(h, top - 2, top + 30);
  const thin = lerp(lerp(FOG_DENSITY, 0.0055, smooth(h / 110)), 0.0055, clear);
  scene.fog.density = lerp(thin, 0.03, inCloud) * (1 - dawn);
  scene.fog.color.copy(BALLOON_COLOURS.fog).lerp(BALLOON_COLOURS.cloud, Math.min(1, inCloud * 1.5));
  fx.shell.material.opacity = inCloud * 0.96;
  fx.shell.visible = inCloud > 0.005;
  fx.shell.position.copy(camera.position);
  world.setWeather(h < base + 10);
  fx.deck.visible = h > top - 40;
  for (const b of fx.billows) b.visible = fx.billowsOn && inCloud > 0.01;
  if (fx.sky && fx.skyBase.horizon) {
    const u = fx.sky.material.uniforms;
    u.uHorizon.value.copy(fx.skyBase.horizon).lerp(BALLOON_COLOURS.cloud, inCloud).lerp(BALLOON_COLOURS.dawnHorizon, dawn);
    u.uZenith.value.copy(fx.skyBase.zenith).lerp(BALLOON_COLOURS.cloud, inCloud).lerp(BALLOON_COLOURS.dawnZenith, dawn);
    u.uSunDir.value.copy(fx.skyBase.sun).lerp(fx.sunDir, dawn).normalize();
  }
  if (fx.sunLight && fx.sunBase) {
    fx.sunLight.color.copy(fx.sunBase.color).lerp(BALLOON_COLOURS.dawnSun, dawn);
    fx.sunLight.intensity = lerp(fx.sunBase.intensity, 2.3, dawn);
  }
  if (fx.haze && fx.hazeBase) fx.haze.copy(fx.hazeBase).lerp(BALLOON_COLOURS.dawnHaze, dawn);
  fx.dawn = dawn;
  // A warm grade over the whole frame, like the intro's; written only when it changes.
  const step = Math.round(dawn * 40) / 40;
  if (step !== fx.filter) {
    fx.filter = step;
    canvas.style.filter = step > 0 ? `sepia(${0.2 * step}) saturate(${1 + 0.3 * step}) hue-rotate(${-8 * step}deg) contrast(${1 + 0.05 * step}) brightness(${1 + 0.04 * step})` : '';
  }
}

// The sun, its halo and the town's glow sit far out, moving with the camera like the sky.
function updateBalloonDawn() {
  const fx = balloonFx;
  const dawn = fx.dawn || 0;
  const show = dawn > 0.001;
  fx.sun.visible = fx.halo.visible = fx.glow.visible = show;
  if (!show) return;
  const c = camera.position;
  // Further out than any ridge, so the peaks stand in front of them.
  fx.sun.position.copy(c).addScaledVector(fx.sunDir, 6400);
  fx.halo.position.copy(fx.sun.position);
  fx.sun.material.opacity = dawn;
  fx.halo.material.opacity = 0.5 * dawn;
  // The glow sits low behind the notch, so the ridge cuts off its lower half.
  const e = fx.glowElev || 0.1;
  fx.glow.position.set(c.x + fx.dawnDir.x * 6300, c.y + Math.tan(e) * 6300 - 200, c.z + fx.dawnDir.z * 6300);
  fx.glow.material.opacity = 0.75 * dawn * (0.94 + Math.sin(game.time * 0.7) * 0.06);
  if (fx.sky) fx.sky.position.copy(c);
}

// Puts the world back as it was before the climb.
function balloonRestoreWorld() {
  const fx = balloonFx;
  if (!fx.shell) return;
  scene.fog.density = FOG_DENSITY;
  scene.fog.color.setHex(FOG_COLOR);
  fx.shell.visible = false;
  fx.deck.visible = false;
  fx.sun.visible = fx.halo.visible = fx.glow.visible = false;
  for (const b of fx.billows) b.visible = false;
  fx.billowsOn = false;
  fx.steam.clear();
  fx.dawn = 0;
  world.setWeather(true);
  if (fx.sky && fx.skyBase.horizon) {
    const u = fx.sky.material.uniforms;
    u.uHorizon.value.copy(fx.skyBase.horizon);
    u.uZenith.value.copy(fx.skyBase.zenith);
    u.uSunDir.value.copy(fx.skyBase.sun);
  }
  if (fx.sunLight && fx.sunBase) { fx.sunLight.color.copy(fx.sunBase.color); fx.sunLight.intensity = fx.sunBase.intensity; }
  if (fx.haze && fx.hazeBase) fx.haze.copy(fx.hazeBase);
  if (fx.filter !== -1 && fx.filter !== 0) canvas.style.filter = '';
  fx.filter = -1;
}

/* ---------- The ending ---------- */
function balloonReachEnding(skipped) {
  const s = balloonScene;
  if (!s || balloon.phase === 'ending') return;
  if (skipped) {
    // Straight to the last shot, the dawn already up.
    balloonSetupDawn();
    balloon.alt = Math.max(balloon.alt, BALLOON.cloudTop + 190);
    balloon.drift.x += balloonFx.dawnDir.x * 30;
    balloon.drift.z += balloonFx.dawnDir.z * 30;
    s.t = Math.max(s.t, BALLOON_ASCENT.ending);
    tickBalloon(0);
    s.follow = null;
    balloonFinalShot(1, s, 0);
    balloonLookAt(camera.position.y - balloonSpot.y);
    updateBalloonDawn();
  }
  balloon.phase = 'ending';
  survival.tool = s.tool;
  game.state = 'ending';
  endScene();
  if (balloonWind) balloonWind.set(0.08, 3);
  document.exitPointerLock();
  $('hud').classList.add('hidden');
  $('subtitle').classList.remove('on');
  subtitles.length = 0;
  showBalloonEnding();
  emitGame('escaped');
  // The last shot keeps drifting behind the ending screen.
  let last = performance.now();
  const drift = (now) => {
    if (game.state !== 'ending' || balloon.phase !== 'ending') return;
    requestAnimationFrame(drift);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tickBalloonEnding(dt);
  };
  requestAnimationFrame(drift);
}

// One frame of the drift behind the ending screen.
function tickBalloonEnding(dt) {
  const s = balloonScene;
  if (!s) return;
  s.t += dt;
  game.time += dt;
  balloon.alt += balloonClimbRate(s.t) * 0.5 * dt;
  balloon.drift.addScaledVector(balloonFx.dawnDir, 3 * dt);
  balloon.burnHold = Math.sin(s.t * 0.4) > 0.8 ? 0.2 : 0;
  tickBalloon(dt);
  poseBalloonRider(dt, Math.min(1, balloon.burn * 2));
  balloonFinalShot(dt, s, s.t - BALLOON_ASCENT.last);
  updateBalloonDawn();
  updateSparks(dt);
  world.update(dt, game.time, camera.position, player.pos);
  // world.update puts the sky back on the camera but not the dawn's colours, so keep them.
  balloonLookAt(camera.position.y - balloonSpot.y);
}

function balloonClockText(seconds) {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${Math.max(1, m)} min`;
}

function balloonEscape(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function showBalloonEnding() {
  const ending = LORE.ending || {};
  const paragraphs = ending.paragraphs && ending.paragraphs.length ? ending.paragraphs : [
    'The Breath carried her up through the cloud the way it had carried Dr. Varga\'s weather balloons for twenty years, straight and steady, and let her go into a sky she had stopped believing in.',
    'Below her the cap lay over the Hollow like a lid. Somewhere under it were the caches, the frame, the chair facing the steam. To the south, beyond the peaks, a town was turning its lights off for the morning.',
  ];
  const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const parts = balloonPartIds().length;
  const rows = [
    ['Time in the Hollow', balloonClockText(n(stats.time) > 0 ? stats.time : balloon.clock)],
    ['Sites found', `${majorSitesFound()}/10`],
    ['Pages read', String(Math.max(n(stats.notes), notesRead.size))],
    ['Balloon parts', `${Math.max(n(stats.parts), balloonPartsHeld())}/${parts}`],
    ['Hares hunted', String(n(stats.rabbits))],
    ['Wolves', String(n(stats.wolves))],
    ['Trees felled', String(n(stats.trees))],
    ['Star-iron shards', `${Math.max(n(stats.shards), packCount('shard'))}/15`],
  ];
  if (n(stats.distance) > 0) rows.push(['Distance walked', `${(stats.distance / 1000).toFixed(1)} km`]);
  for (const extra of BALLOON_ENDING_STATS) {
    try { const row = extra(); if (row) rows.push(row); } catch (err) { console.error(err); }
  }
  let i = 0;
  const delay = () => `style="--i:${i++}"`;
  const el = $('ending');
  el.innerHTML = `
    <div class="ending-card">
      <p class="ending-kicker" ${delay()}>${balloonEscape(ending.kicker || 'Dawn, over the northern range')}</p>
      <h2 class="ending-title" ${delay()}>${balloonEscape(ending.title || 'You rose out of the Hollow')}</h2>
      <div class="ending-text">${paragraphs.map((p) => `<p ${delay()}>${balloonEscape(p)}</p>`).join('')}</div>
      <dl class="ending-stats" ${delay()}>${rows.map(([label, value]) => `<div><dt>${balloonEscape(label)}</dt><dd>${balloonEscape(value)}</dd></div>`).join('')}</dl>
      <div class="title-actions" ${delay()}><button id="ending-menu">Main menu</button></div>
    </div>`;
  el.classList.remove('hidden');
  $('ending-menu').addEventListener('click', () => toMainMenu());
}

/* ---------- Each frame, and runs ---------- */
function updateBalloon(dt) {
  balloon.clock += dt;
  if (!balloonModel) return;
  if (!balloon.assembled) return;
  if (balloon.phase === 'tethered') {
    // Out of sight, out of mind: far away it neither draws nor burns.
    const far = Math.hypot(player.pos.x - balloonSpot.x, player.pos.z - balloonSpot.z) > BALLOON.cull;
    balloonModel.group.visible = !far;
    for (const rope of balloonModel.tethers) rope.stake.visible = rope.line.visible = !far;
    if (far) { balloonFx.light.intensity = 0; if (balloonRoar) balloonRoar.set(0, 0.2); return; }
  }
  tickBalloon(dt);
  if (balloon.phase === 'interlude') {
    balloonSteam(dt, 0.5);
    balloonLookAt(camera.position.y - balloonSpot.y, 1);
  }
}

// If she dies and wakes by a fire while it's in the air, it's back on its ropes at the frame.
function balloonBackToFrame() {
  if (!balloon.assembled || balloon.phase === 'tethered' || balloon.phase === 'ending') return;
  if (activeScene && balloonScene) endScene();
  balloonScene = null;
  clearBalloonWolves();
  balloonRestoreWorld();
  balloon.assembled = false;
  balloon.launched = false;
  balloon.phase = 'none';
  raiseBalloon();
}

function resetBalloon() {
  balloon.assembled = balloon.launched = false;
  balloon.phase = 'none';
  balloon.alt = 0;
  balloon.burn = balloon.burnHold = 0;
  balloon.clock = 0;
  balloon.interlude = 0;
  balloon.drift.set(0, 0, 0);
  balloonScene = null;
  clearBalloonWolves();
  dropBalloonCollider();
  if (!balloonModel) return;
  balloonModel.group.visible = false;
  balloonModel.envelope.scale.setScalar(1);
  for (const rope of balloonModel.tethers) { rope.line.visible = false; rope.stake.visible = false; rope.cut = 0; }
  balloonFx.light.intensity = 0;
  if (balloonRoar) balloonRoar.set(0, 0.1);
  if (balloonWind) { balloonWind.stop(); balloonWind = null; }
  $('balloon-fade').classList.remove('on');
  $('ending').classList.add('hidden');
  balloonRestoreWorld();
}

function initBalloon() {
  const site = siteById('breath');
  const launch = site.launch || { x: 0, z: 0 };
  const x = site.x + launch.x, z = site.z + launch.z;
  const out = new THREE.Vector3(launch.x, 0, launch.z);
  if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
  out.normalize();
  balloonSpot = { x, z, y: groundHeight(x, z), out, side: new THREE.Vector3(out.z, 0, -out.x) };

  balloonModel = buildBalloonModel();
  balloonModel.group.visible = false;
  scene.add(balloonModel.group);
  balloonModel.tethers = buildBalloonTethers(balloonModel.mats);
  balloonModel.tethers.forEach((rope, k) => {
    const sideSign = k ? 1 : -1;
    const half = BALLOON.basket.w / 2;
    rope.corner = new THREE.Vector3(sideSign * half, 0.1, -half * 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(out.x, out.z));
    rope.phase = k * 2.1;
    const sx = x + balloonSpot.side.x * sideSign * 4.6 - out.x * 1.6, sz = z + balloonSpot.side.z * sideSign * 4.6 - out.z * 1.6;
    rope.to.set(sx, groundHeight(sx, sz) + 0.32, sz);
    rope.stake.position.set(sx, groundHeight(sx, sz) - 0.04, sz);
    rope.line.visible = rope.stake.visible = false;
    scene.add(rope.line, rope.stake);
  });

  // The burner's light, made now and kept in the scene so the light count never changes.
  balloonFx.light = new THREE.PointLight(0xffa04c, 0, 32, 1.5);
  scene.add(balloonFx.light);
  balloonFx.steam = buildPuffs(80, 0xeef1f8, true);
  scene.add(balloonFx.steam.group);
  balloonFx.deck = buildBalloonCloudDeck();
  balloonFx.deck.position.set(site.x, balloonSpot.y + BALLOON.cloudTop - 14, site.z);
  scene.add(balloonFx.deck);
  // Inside the cloud, a white shell round the camera hides the far world and the sky.
  balloonFx.shell = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12), new THREE.MeshBasicMaterial({ color: BALLOON_COLOURS.cloud, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  balloonFx.shell.renderOrder = 2;
  balloonFx.shell.visible = false;
  scene.add(balloonFx.shell);
  const glowSprite = (color, intensity) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sprite.visible = false;
    scene.add(sprite);
    return sprite;
  };
  balloonFx.sun = glowSprite(0xffe2b8, 3.4);
  balloonFx.sun.scale.setScalar(240);
  balloonFx.halo = glowSprite(0xff9c60, 0.9);
  balloonFx.halo.scale.setScalar(1500);
  balloonFx.glow = glowSprite(0xffa45a, 0.8);
  balloonFx.glow.scale.set(2600, 900, 1);
  for (let i = 0; i < 46; i++) {
    const billow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.mist, color: 0xf4f6fb, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
    billow.visible = false;
    scene.add(billow);
    balloonFx.billows.push(billow);
  }

  // The fade for the assembly montage sits under the letterbox and captions.
  const fade = document.createElement('div');
  fade.id = 'balloon-fade';
  document.body.insertBefore(fade, $('cine'));

  addInteractable({
    x, z, r: BALLOON.reach,
    label: balloonFrameLabel,
    active: () => balloon.phase === 'none' || balloon.phase === 'tethered',
    use: useBalloonFrame,
  });
  MAP_MARKERS.push(() => (balloon.phase === 'tethered' ? [{ x, z, kind: 'balloon', label: 'Varga\'s balloon' }] : []));
  onGame('revived', balloonBackToFrame);
}
