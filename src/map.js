// The field book (map, journal and pack), the minimap and the compass. The map is Aksel
// Holm's old chart of the Hollow, traced from Dr. Varga's survey: drawn once in code from
// the ground itself, a little each frame so it never stalls the game, then marked up with
// what she finds as she goes. The minimap and the compass strip read from the same chart.
// Other parts of the game add marker providers here: functions returning
// [{ x, z, kind, label }] to draw on the map, the minimap and the compass.
const MAP_MARKERS = [];

/* ---------- Config ---------- */
const MAP = {
  extent: 1120, // metres from the centre to the chart's edge; the crater's rim is at 1000
  rim: 1000,
  grid: 1024, // ground samples across the chart
  size: 2048, // chart pixels across
  contour: 2.5, // metres between contour lines; every fourth is an index line
  budget: 6, // milliseconds of chart drawing per frame while she plays
  bookBudget: 24, // ...and while she's waiting to look at it
  trailStep: 8, // metres between breadcrumbs
  trailJump: 40, // a longer step than this is a jump (a revive, a teleport), not a walk
  trailMax: 6000,
  miniRange: 180, // metres from the minimap's centre to its edge: about 2 m a pixel
  miniSize: 180,
  compassSpan: 75, // degrees either side of the compass strip's centre
  compassRange: 600, // how far off a site can be and still show on the compass
  arrive: 12, // metres from a waypoint that count as reaching it
  zoomMax: 6,
};
const MAP_PX = MAP.size / (2 * MAP.extent); // chart pixels per metre

// Ink and paper, shared by the chart, the minimap and the compass.
const MAP_INK = {
  paper: [234, 222, 192],
  ink: '#33251a',
  soft: 'rgba(51, 37, 26, .6)',
  pencil: 'rgba(74, 68, 62, .9)',
  halo: 'rgba(242, 233, 210, .9)',
  red: '#a3262c',
  trail: 'rgba(152, 40, 36, .8)',
  gold: '#b67d14',
  fire: '#d8652a',
  blue: '#46607f',
  brass: '#e9d29a',
  font: '"Palatino Linotype", Palatino, Georgia, serif',
};

// Names to fall back on until the story's own are loaded.
const MAP_SITE_NAMES = {
  lookout: 'The Ranger Lookout', trapper: 'Henrik\'s Cabin', station: 'Hollow Station', lake: 'The Frozen Lake',
  radio: 'The Radio Mast', dakota: 'The Dakota', camp: 'Last Camp', altar: 'The Frozen Altar',
  chapel: 'Chapel of the Snows', mine: 'The Star-Iron Mine', breath: 'The Breath',
};

const MAP_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/* ---------- State ---------- */
const mapState = {
  tab: 'map',
  chart: null, // the survey chart, drawn once
  painter: null, // the generator still drawing it, until it's done
  chartReady: false,
  trail: new Float32Array(MAP.trailMax * 2), // breadcrumbs, oldest first; NaN marks a gap
  trailHead: 0,
  trailCount: 0,
  crumb: { x: 0, z: 0, set: false }, // where the last breadcrumb was dropped
  waypoint: null, // { x, z, label }
  crimson: null, // where Crimson fell
  partsTaken: new Set(),
  fresh: new Set(), // sites marked since she last looked at the map
  flagSpots: new Map(),
  view: { x: 0, z: 0, zoom: 1 }, // the book map's centre in metres, and its zoom over the whole chart
  bookView: null,
  bookT: 0,
  layer: null,
  layerKey: '',
  book: { w: 0, h: 0 },
  drag: null,
  mouse: null,
  hover: null, // the marker under the cursor
  legendHover: null, // the site under the cursor in the legend
  hits: [],
  showMini: false,
  showCompass: false,
  hudMarkers: [],
  hudT: 0,
  target: null, // the objective's spot, from the story
  mini: { x: 0, z: 0, yaw: 0, t: -1e9 },
  compass: { w: 0, heading: 0, x: 0, z: 0, t: -1e9, canvas: null },
  lastState: 'title',
  icons: {},
  dpr: 1,
};

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  // A stiff cover opening and pages settling.
  bookOpen() { this.burst(0.09, 600, 1.2, 0.18, 'bandpass'); setTimeout(() => this.burst(0.3, 2600, 0.6, 0.07, 'bandpass'), 60); },
  bookClose() { this.burst(0.12, 380, 1, 0.22); },
  bookPage() { this.burst(0.26, 3200, 0.5, 0.06, 'bandpass'); this.burst(0.12, 1500, 0.8, 0.04, 'bandpass'); },
  // A pencil mark on the chart.
  mapPencil() { this.burst(0.05, 5200, 2, 0.05, 'bandpass'); setTimeout(() => this.burst(0.07, 4600, 2, 0.05, 'bandpass'), 70); },
  mapArrive() { this.tone(880, 880, 0.18, 0.05, 'triangle'); setTimeout(() => this.tone(1175, 1175, 0.3, 0.05, 'triangle'), 110); },
});

/* ---------- Small helpers ---------- */
function hasMap() { return hasItem('map'); }

function mapSiteName(site) {
  const lore = typeof LORE !== 'undefined' && LORE.sites && LORE.sites[site.id];
  if (lore && lore.name) return lore.name;
  return site.name && site.name !== site.id ? site.name : MAP_SITE_NAMES[site.id] || site.id;
}

function mapSiteNote(site) {
  const lore = typeof LORE !== 'undefined' && LORE.sites && LORE.sites[site.id];
  return (lore && lore.mapNote) || '';
}

function mapToChart(v) { return (v + MAP.extent) * MAP_PX; }

function mapDistanceText(d) {
  return d < 995 ? `${Math.max(10, Math.round(d / 10) * 10)} m` : `${(d / 1000).toFixed(1)} km`;
}

// Compass bearing in degrees from north (−z), clockwise through east (+x).
function mapBearing(dx, dz) {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

function mapPoint(bearing) {
  return MAP_POINTS[Math.round(bearing / 45) % 8];
}

// Where something is from her: '640 m NE'.
function mapFromHer(x, z) {
  const dx = x - player.pos.x, dz = z - player.pos.z;
  const d = Math.hypot(dx, dz);
  return d < 15 ? 'here' : `${mapDistanceText(d)} ${mapPoint(mapBearing(dx, dz))}`;
}

// The chart's grid: eight columns A-H west to east and eight rows 1-8 north to south.
function mapGridRef(x, z) {
  const col = clamp(Math.floor((x + MAP.rim) / 250), 0, 7), row = clamp(Math.floor((z + MAP.rim) / 250), 0, 7);
  return `${'ABCDEFGH'[col]}${row + 1}`;
}

function mapPartTaken(part) {
  if (typeof balloon !== 'undefined' && balloon.assembled) return true;
  return mapState.partsTaken.has(part) || hasItem(`part:${part}`);
}

function mapPartsFound() {
  return SITES.filter((s) => s.part && mapPartTaken(s.part)).length;
}

// Where a site's red flag stands: by its part, if the part is placed in the world.
function mapFlagSpot(site) {
  if (!mapState.flagSpots.has(site.id)) {
    const item = WORLD_ITEMS.find((it) => it.item === `part:${site.part}`);
    mapState.flagSpots.set(site.id, item ? { x: item.x, z: item.z } : { x: site.x + 5, z: site.z - 5 });
  }
  return mapState.flagSpots.get(site.id);
}

function mapSafe(fn, fallback) {
  try { return fn(); } catch (err) { return fallback; }
}

/* ---------- Icons ---------- */
// Each icon draws in a unit square centred on the origin, in the current ink.
const MAP_ICONS = {
  // The fire tower: splayed legs, the cab and its roof.
  lookout(g) {
    g.beginPath();
    g.moveTo(-0.3, 0.5); g.lineTo(-0.13, -0.12);
    g.moveTo(0.3, 0.5); g.lineTo(0.13, -0.12);
    g.moveTo(-0.26, 0.36); g.lineTo(0.17, 0.06);
    g.moveTo(0.26, 0.36); g.lineTo(-0.17, 0.06);
    g.stroke();
    g.fillRect(-0.2, -0.3, 0.4, 0.19);
    g.beginPath(); g.moveTo(-0.28, -0.29); g.lineTo(0, -0.5); g.lineTo(0.28, -0.29); g.closePath(); g.fill();
  },
  // A log cabin with its chimney.
  trapper(g, paper) {
    const ink = g.fillStyle;
    g.fillStyle = paper; g.fillRect(-0.3, -0.05, 0.6, 0.44);
    g.fillStyle = ink; g.strokeRect(-0.3, -0.05, 0.6, 0.44);
    g.beginPath(); g.moveTo(-0.42, -0.02); g.lineTo(0, -0.38); g.lineTo(0.42, -0.02); g.closePath(); g.fill();
    g.fillRect(0.14, -0.4, 0.1, 0.2);
    g.fillRect(-0.06, 0.16, 0.12, 0.23);
    g.beginPath(); g.moveTo(-0.3, 0.08); g.lineTo(-0.12, 0.08); g.moveTo(0.12, 0.08); g.lineTo(0.3, 0.08); g.stroke();
  },
  // A round-roofed hut and the anemometer on its mast.
  station(g, paper) {
    const ink = g.fillStyle;
    g.beginPath(); g.moveTo(-0.46, 0.36); g.arc(-0.12, 0.36, 0.34, Math.PI, 0); g.closePath();
    g.fillStyle = paper; g.fill(); g.fillStyle = ink; g.stroke();
    g.beginPath(); g.moveTo(-0.24, 0.36); g.lineTo(-0.24, 0.1); g.moveTo(0, 0.36); g.lineTo(0, 0.1); g.stroke();
    g.beginPath(); g.moveTo(0.32, 0.42); g.lineTo(0.32, -0.36); g.moveTo(0.16, -0.36); g.lineTo(0.48, -0.36); g.stroke();
    for (const x of [0.16, 0.48]) { g.beginPath(); g.arc(x, -0.31, 0.06, 0, Math.PI * 2); g.fill(); }
  },
  // An ice-fishing shack on the ice.
  lake(g, paper) {
    const ink = g.fillStyle;
    g.beginPath(); g.moveTo(-0.48, 0.3); g.lineTo(0.48, 0.3); g.moveTo(-0.34, 0.44); g.lineTo(0.06, 0.44); g.moveTo(0.18, 0.44); g.lineTo(0.38, 0.44); g.stroke();
    g.fillStyle = paper; g.fillRect(-0.2, -0.1, 0.4, 0.32); g.fillStyle = ink;
    g.strokeRect(-0.2, -0.1, 0.4, 0.32);
    g.beginPath(); g.moveTo(-0.28, -0.08); g.lineTo(0, -0.34); g.lineTo(0.28, -0.08); g.closePath(); g.fill();
    g.fillRect(-0.05, 0.06, 0.1, 0.16);
  },
  // The mast, with its signal rising off the top.
  radio(g) {
    g.beginPath();
    g.moveTo(-0.2, 0.5); g.lineTo(0, -0.34); g.lineTo(0.2, 0.5);
    g.moveTo(-0.15, 0.3); g.lineTo(0.1, 0.1); g.lineTo(-0.06, -0.08); g.lineTo(0.04, -0.2);
    g.stroke();
    g.beginPath(); g.arc(0, -0.38, 0.07, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(0, -0.38, 0.24, -2.5, -1.95); g.moveTo(0.24 * Math.cos(-1.19), -0.38 + 0.24 * Math.sin(-1.19)); g.arc(0, -0.38, 0.24, -1.19, -0.64); g.stroke();
    g.beginPath(); g.arc(0, -0.38, 0.4, -2.45, -2.0); g.moveTo(0.4 * Math.cos(-1.14), -0.38 + 0.4 * Math.sin(-1.14)); g.arc(0, -0.38, 0.4, -1.14, -0.69); g.stroke();
  },
  // The Dakota from above, nose down in the trees.
  dakota(g) {
    g.rotate(-0.55);
    g.beginPath();
    g.moveTo(0, -0.5); g.quadraticCurveTo(0.08, -0.44, 0.07, -0.3); g.lineTo(0.05, 0.38); g.lineTo(0, 0.46); g.lineTo(-0.05, 0.38); g.lineTo(-0.07, -0.3); g.quadraticCurveTo(-0.08, -0.44, 0, -0.5);
    g.moveTo(-0.5, -0.06); g.lineTo(0.5, -0.06); g.lineTo(0.46, 0.04); g.lineTo(-0.46, 0.04); g.closePath();
    g.moveTo(-0.18, 0.36); g.lineTo(0.18, 0.36); g.lineTo(0.16, 0.43); g.lineTo(-0.16, 0.43); g.closePath();
    g.fill();
  },
  // A ridge tent at the foot of the wall, the rope still running up.
  camp(g, paper) {
    const ink = g.fillStyle;
    g.beginPath(); g.moveTo(-0.4, 0.38); g.lineTo(-0.04, -0.22); g.lineTo(0.32, 0.38); g.closePath();
    g.fillStyle = paper; g.fill(); g.fillStyle = ink; g.stroke();
    g.beginPath(); g.moveTo(-0.04, -0.22); g.lineTo(-0.12, 0.38); g.lineTo(0.05, 0.38); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-0.5, 0.38); g.lineTo(0.5, 0.38); g.stroke();
    g.save(); g.setLineDash([0.07, 0.07]); g.beginPath(); g.moveTo(0.2, 0.05); g.quadraticCurveTo(0.42, -0.2, 0.42, -0.52); g.stroke(); g.restore();
  },
  // Stepped stones, and a blade standing point-down in them.
  altar(g) {
    g.fillRect(-0.42, 0.3, 0.84, 0.15);
    g.fillRect(-0.3, 0.15, 0.6, 0.15);
    g.fillRect(-0.18, 0.02, 0.36, 0.13);
    g.beginPath(); g.moveTo(-0.045, -0.3); g.lineTo(0.045, -0.3); g.lineTo(0, 0.04); g.closePath(); g.fill();
    g.fillRect(-0.15, -0.34, 0.3, 0.06);
    g.fillRect(-0.025, -0.52, 0.05, 0.18);
  },
  // A small chapel: nave, tower and cross.
  chapel(g, paper) {
    const ink = g.fillStyle;
    g.fillStyle = paper; g.fillRect(-0.36, 0.0, 0.5, 0.4); g.fillStyle = ink;
    g.strokeRect(-0.36, 0.0, 0.5, 0.4);
    g.beginPath(); g.moveTo(-0.4, 0.02); g.lineTo(-0.11, -0.2); g.lineTo(0.18, 0.02); g.closePath(); g.fill();
    g.fillRect(0.12, -0.16, 0.22, 0.56);
    g.beginPath(); g.moveTo(0.1, -0.16); g.lineTo(0.23, -0.4); g.lineTo(0.36, -0.16); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0.23, -0.4); g.lineTo(0.23, -0.56); g.moveTo(0.16, -0.5); g.lineTo(0.3, -0.5); g.stroke();
    g.fillStyle = paper; g.fillRect(-0.16, 0.16, 0.1, 0.24); g.fillStyle = ink;
  },
  // Crossed picks, the old sign for a mine.
  mine(g) {
    g.save();
    g.lineWidth *= 1.3;
    g.beginPath(); g.moveTo(-0.36, 0.42); g.lineTo(0.22, -0.18); g.moveTo(0.36, 0.42); g.lineTo(-0.22, -0.18); g.stroke();
    g.lineWidth *= 1.25;
    g.beginPath(); g.moveTo(0.0, -0.44); g.quadraticCurveTo(0.34, -0.36, 0.46, -0.04); g.stroke();
    g.beginPath(); g.moveTo(0.0, -0.44); g.quadraticCurveTo(-0.34, -0.36, -0.46, -0.04); g.stroke();
    g.restore();
  },
  // Steam curling up off a vent.
  breath(g) {
    g.beginPath(); g.ellipse(0, 0.38, 0.32, 0.08, 0, 0, Math.PI * 2); g.stroke();
    for (const [x, top] of [[-0.18, -0.12], [0.02, -0.46], [0.2, -0.2]]) {
      g.beginPath();
      g.moveTo(x, 0.32);
      g.bezierCurveTo(x - 0.16, 0.16, x + 0.16, 0.06, x, (0.32 + top) / 2 - 0.04);
      g.bezierCurveTo(x - 0.16, top + 0.14, x + 0.1, top + 0.04, x + 0.02, top);
      g.stroke();
    }
  },
  // The plane they came in on, still smoking.
  wreck(g) {
    g.save();
    g.rotate(0.7);
    g.beginPath();
    g.moveTo(0, -0.4); g.lineTo(0.06, -0.28); g.lineTo(0.05, 0.3); g.lineTo(0, 0.38); g.lineTo(-0.05, 0.3); g.lineTo(-0.06, -0.28); g.closePath();
    g.moveTo(-0.44, -0.04); g.lineTo(-0.1, -0.06); g.lineTo(-0.1, 0.03); g.lineTo(-0.4, 0.05); g.closePath();
    g.moveTo(0.12, -0.06); g.lineTo(0.34, -0.03); g.lineTo(0.3, 0.05); g.lineTo(0.12, 0.03); g.closePath();
    g.moveTo(-0.15, 0.3); g.lineTo(0.15, 0.3); g.lineTo(0.13, 0.36); g.lineTo(-0.13, 0.36); g.closePath();
    g.fill();
    g.restore();
    g.beginPath(); g.moveTo(0.16, -0.16); g.bezierCurveTo(0.02, -0.3, 0.36, -0.36, 0.22, -0.52); g.stroke();
  },
  // One of Varga's red flags.
  flag(g) {
    const ink = g.fillStyle;
    g.beginPath(); g.moveTo(-0.24, 0.5); g.lineTo(-0.24, -0.5); g.stroke();
    g.fillStyle = MAP_INK.red;
    g.beginPath(); g.moveTo(-0.22, -0.48); g.quadraticCurveTo(0.06, -0.56, 0.4, -0.44); g.lineTo(0.4, -0.12); g.quadraticCurveTo(0.06, -0.22, -0.22, -0.14); g.closePath(); g.fill();
    g.fillStyle = ink;
  },
  fire(g) {
    const ink = g.strokeStyle;
    g.strokeStyle = '#6b4426';
    g.beginPath(); g.moveTo(-0.32, 0.46); g.lineTo(0.32, 0.3); g.moveTo(-0.32, 0.3); g.lineTo(0.32, 0.46); g.stroke();
    g.fillStyle = MAP_INK.fire;
    g.beginPath();
    g.moveTo(0, -0.48); g.bezierCurveTo(0.32, -0.16, 0.34, 0.12, 0.2, 0.3); g.bezierCurveTo(0.1, 0.42, -0.1, 0.42, -0.2, 0.3);
    g.bezierCurveTo(-0.34, 0.12, -0.18, -0.06, -0.06, -0.2); g.bezierCurveTo(-0.02, -0.04, 0.08, -0.1, 0, -0.48); g.fill();
    g.fillStyle = '#f2c14e';
    g.beginPath(); g.moveTo(0.02, -0.06); g.bezierCurveTo(0.16, 0.08, 0.14, 0.26, 0, 0.3); g.bezierCurveTo(-0.14, 0.26, -0.12, 0.1, 0.02, -0.06); g.fill();
    g.strokeStyle = g.fillStyle = ink;
  },
  // Where Crimson fell: a small cross in the snow.
  crimson(g) {
    g.save();
    g.strokeStyle = MAP_INK.red;
    g.lineWidth *= 1.4;
    g.beginPath(); g.moveTo(-0.3, -0.3); g.lineTo(0.3, 0.3); g.moveTo(0.3, -0.3); g.lineTo(-0.3, 0.3); g.stroke();
    g.restore();
  },
  satchel(g, paper) {
    const ink = g.fillStyle;
    g.beginPath(); g.arc(0, -0.08, 0.26, Math.PI, 0); g.stroke();
    g.fillStyle = MAP_INK.red; g.fillRect(-0.36, -0.08, 0.72, 0.46); g.fillStyle = ink;
    g.strokeRect(-0.36, -0.08, 0.72, 0.46);
    g.beginPath(); g.moveTo(-0.36, 0.1); g.lineTo(0.36, 0.1); g.stroke();
  },
  // A surveyor's mark in pencil.
  waypoint(g) {
    g.beginPath(); g.arc(0, 0, 0.3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(-0.5, 0); g.lineTo(-0.12, 0); g.moveTo(0.12, 0); g.lineTo(0.5, 0); g.moveTo(0, -0.5); g.lineTo(0, -0.12); g.moveTo(0, 0.12); g.lineTo(0, 0.5); g.stroke();
    g.beginPath(); g.arc(0, 0, 0.05, 0, Math.PI * 2); g.fill();
  },
  // What she's set on doing next.
  target(g) {
    const ink = g.fillStyle;
    g.fillStyle = MAP_INK.gold;
    g.beginPath(); g.moveTo(0, -0.46); g.lineTo(0.3, 0); g.lineTo(0, 0.46); g.lineTo(-0.3, 0); g.closePath(); g.fill();
    g.fillStyle = ink;
    g.stroke();
  },
  // A place she's read about but not yet found.
  unknown(g) {
    g.save();
    g.setLineDash([0.12, 0.08]);
    g.beginPath(); g.arc(0, 0, 0.4, 0, Math.PI * 2); g.stroke();
    g.restore();
    g.save();
    g.lineWidth *= 1.35;
    g.beginPath(); g.arc(0, -0.1, 0.13, Math.PI * 1.12, Math.PI * 0.42); g.lineTo(0.0, 0.08); g.stroke();
    g.beginPath(); g.arc(0, 0.22, 0.05, 0, Math.PI * 2); g.fill();
    g.restore();
  },
  sign(g) {
    g.beginPath(); g.moveTo(0, 0.5); g.lineTo(0, -0.4); g.stroke();
    g.beginPath(); g.moveTo(-0.38, -0.32); g.lineTo(0.3, -0.32); g.lineTo(0.42, -0.2); g.lineTo(0.3, -0.08); g.lineTo(-0.38, -0.08); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0.38, 0.02); g.lineTo(-0.3, 0.02); g.lineTo(-0.42, 0.14); g.lineTo(-0.3, 0.26); g.lineTo(0.38, 0.26); g.closePath(); g.fill();
  },
  note(g, paper) {
    const ink = g.fillStyle;
    g.fillStyle = paper;
    g.beginPath(); g.moveTo(-0.28, -0.4); g.lineTo(0.14, -0.4); g.lineTo(0.28, -0.26); g.lineTo(0.28, 0.4); g.lineTo(-0.28, 0.4); g.closePath(); g.fill();
    g.fillStyle = ink; g.stroke();
    g.beginPath(); g.moveTo(-0.16, -0.12); g.lineTo(0.16, -0.12); g.moveTo(-0.16, 0.04); g.lineTo(0.16, 0.04); g.moveTo(-0.16, 0.2); g.lineTo(0.08, 0.2); g.stroke();
  },
  balloon(g) {
    const ink = g.fillStyle;
    g.fillStyle = MAP_INK.red;
    g.beginPath(); g.moveTo(0, 0.12); g.bezierCurveTo(-0.5, -0.16, -0.36, -0.5, 0, -0.5); g.bezierCurveTo(0.36, -0.5, 0.5, -0.16, 0, 0.12); g.fill();
    g.fillStyle = ink;
    g.beginPath(); g.moveTo(-0.1, 0.1); g.lineTo(-0.08, 0.3); g.moveTo(0.1, 0.1); g.lineTo(0.08, 0.3); g.stroke();
    g.fillRect(-0.12, 0.3, 0.24, 0.16);
  },
  shard(g) {
    const ink = g.fillStyle;
    g.fillStyle = '#5a9fd0';
    g.beginPath(); g.moveTo(0, -0.46); g.lineTo(0.22, -0.04); g.lineTo(0.06, 0.44); g.lineTo(-0.2, 0.06); g.closePath(); g.fill();
    g.fillStyle = ink; g.stroke();
  },
  poi(g) {
    g.beginPath(); g.arc(0, 0, 0.3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, 0.1, 0, Math.PI * 2); g.fill();
  },
};
// Other names other parts of the game might give their markers.
Object.assign(MAP_ICONS, { signpost: MAP_ICONS.sign, cache: MAP_ICONS.flag, page: MAP_ICONS.note, item: MAP_ICONS.poi, bag: MAP_ICONS.satchel, campfire: MAP_ICONS.fire });

// Draws an icon `size` pixels across at (x, y), on a soft patch of clean paper so it reads
// over the forest.
function mapIcon(g, kind, x, y, size, ink = MAP_INK.ink, halo = MAP_INK.halo) {
  g.save();
  g.translate(x, y);
  if (halo) {
    const glow = g.createRadialGradient(0, 0, size * 0.25, 0, 0, size * 0.75);
    glow.addColorStop(0, halo);
    glow.addColorStop(1, 'rgba(242, 233, 210, 0)');
    g.fillStyle = glow;
    g.fillRect(-size, -size, size * 2, size * 2);
  }
  g.scale(size, size);
  g.lineWidth = 0.085;
  g.lineCap = g.lineJoin = 'round';
  g.strokeStyle = g.fillStyle = ink;
  (MAP_ICONS[kind] || MAP_ICONS.poi)(g, halo || 'rgba(0, 0, 0, 0)');
  g.restore();
}

// Text with a paper halo so it reads over contours and trees.
function mapText(g, text, x, y, font, ink = MAP_INK.ink, halo = MAP_INK.halo, align = 'center') {
  g.font = font;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  if (halo) {
    g.strokeStyle = halo;
    g.lineWidth = 3.5;
    g.strokeText(text, x, y);
  }
  g.fillStyle = ink;
  g.fillText(text, x, y);
}

// Her: a red arrowhead pointing the way she faces, `angle` clockwise from screen up.
function mapDrawHer(g, x, y, angle, size, pulse = 0) {
  g.save();
  g.translate(x, y);
  if (pulse) {
    g.strokeStyle = `rgba(163, 38, 44, ${0.5 * (1 - pulse)})`;
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, size * (0.7 + pulse * 1.3), 0, Math.PI * 2); g.stroke();
  }
  g.rotate(angle);
  g.beginPath();
  g.moveTo(0, -size * 0.75); g.lineTo(size * 0.48, size * 0.5); g.lineTo(0, size * 0.22); g.lineTo(-size * 0.48, size * 0.5); g.closePath();
  g.fillStyle = MAP_INK.red;
  g.strokeStyle = 'rgba(255, 245, 230, .95)';
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.stroke();
  g.fill();
  g.restore();
}

// A small arrow at the edge of a view, pointing at something beyond it.
function mapEdgeArrow(g, x, y, angle, colour) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = colour;
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 3); g.lineTo(-5, 3); g.closePath(); g.fill();
  g.restore();
}

/* ---------- The survey chart ---------- */
// A tile of soft random values in -1..1 that wraps, for the grain of the paper.
function mapNoiseTile(size, seed, passes) {
  const rand = seededRandom(seed);
  let a = new Float32Array(size * size).map(() => rand() * 2 - 1);
  for (let p = 0; p < passes; p++) {
    const b = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let k = -1; k <= 1; k++) sum += a[y * size + ((x + k + size) % size)] + a[((y + k + size) % size) * size + x];
        b[y * size + x] = sum / 6;
      }
    }
    a = b;
  }
  let max = 0;
  for (const v of a) max = Math.max(max, Math.abs(v));
  return a.map((v) => v / max);
}

// Open ground the chart leaves bare of trees: every clearing but the crash site, which
// wasn't there when the chart was drawn.
function mapClearAt(x, z) {
  for (const entry of CLEARINGS) {
    if (entry === wreck.clearing) continue;
    if (Math.hypot(x - entry[0].x, z - entry[0].z) < entry[1] + 3) return true;
  }
  return false;
}

// Letters spaced along an arc centred on `bearing` (radians clockwise from north), reading
// left to right whichever side of the circle they sit on.
function mapArcText(g, text, cx, cy, r, bearing, spacing, halo = null) {
  const flip = Math.cos(bearing) < -0.01;
  const dir = flip ? -1 : 1;
  const widths = [...text].map((ch) => g.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let a = bearing - (dir * total) / 2 / r;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...text].forEach((ch, i) => {
    const mid = a + (dir * (widths[i] - spacing)) / 2 / r;
    g.save();
    g.translate(cx + Math.sin(mid) * r, cy - Math.cos(mid) * r);
    g.rotate(flip ? mid + Math.PI : mid);
    if (halo) {
      const ink = g.fillStyle;
      g.strokeStyle = halo;
      g.lineWidth = 5;
      g.lineJoin = 'round';
      g.strokeText(ch, 0, 0);
      g.fillStyle = ink;
    }
    g.fillText(ch, 0, 0);
    g.restore();
    a += (dir * widths[i]) / r;
  });
}

// Draws the chart a step at a time; each `yield` is a place to stop until the next frame.
function* mapPaintChart(g) {
  const { size, grid, extent, rim } = MAP;
  const n = grid + 1, cell = (2 * extent) / grid;

  // The ground, sampled on a grid.
  const heights = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const z = -extent + j * cell;
    for (let i = 0; i < n; i++) heights[j * n + i] = groundHeight(-extent + i * cell, z);
    yield;
  }
  // Hill shading, lit from the north-west as charts always are, with the slopes made
  // steeper than they are so the land reads.
  const shade = new Float32Array(n * n);
  const lx = -0.55, ly = 0.68, lz = -0.48;
  const lLen = Math.hypot(lx, ly, lz);
  for (let j = 0; j < n; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(grid, j + 1);
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(grid, i + 1);
      const dx = ((heights[j * n + i1] - heights[j * n + i0]) / ((i1 - i0) * cell)) * 2.3;
      const dz = ((heights[j1 * n + i] - heights[j0 * n + i]) / ((j1 - j0) * cell)) * 2.3;
      const len = Math.hypot(dx, 1, dz);
      shade[j * n + i] = ((-dx * lx + ly - dz * lz) / len) / lLen - ly / lLen;
    }
    if (j % 64 === 63) yield;
  }

  // Paper, shading, rock and contours, a band of pixels at a time.
  const fine = mapNoiseTile(128, 7, 1), coarse = mapNoiseTile(64, 11, 3);
  const band = 8;
  const image = g.createImageData(size, band);
  const data = image.data;
  const per = grid / size;
  const rowH = new Float32Array((size + 1) * (band + 1));
  const rowS = new Float32Array(size * band);
  const sample = (src, u, v) => {
    const i0 = Math.min(grid - 1, Math.floor(u)), j0 = Math.min(grid - 1, Math.floor(v));
    const fu = u - i0, fv = v - j0;
    const k = j0 * n + i0;
    return (src[k] * (1 - fu) + src[k + 1] * fu) * (1 - fv) + (src[k + n] * (1 - fu) + src[k + n + 1] * fu) * fv;
  };
  const [pr, pg, pb] = MAP_INK.paper;
  for (let y0 = 0; y0 < size; y0 += band) {
    for (let r = 0; r <= band; r++) {
      const v = Math.min(grid, (y0 + r + 0.5) * per);
      for (let i = 0; i <= size; i++) rowH[r * (size + 1) + i] = sample(heights, Math.min(grid, (i + 0.5) * per), v);
      if (r < band) for (let i = 0; i < size; i++) rowS[r * size + i] = sample(shade, (i + 0.5) * per, v);
    }
    for (let r = 0; r < band; r++) {
      const j = y0 + r;
      const z = (j + 0.5) / MAP_PX - extent;
      for (let i = 0; i < size; i++) {
        const x = (i + 0.5) / MAP_PX - extent;
        const k = r * (size + 1) + i;
        const h = rowH[k];
        const grain = fine[(j & 127) * 128 + (i & 127)] * 0.03 + coarse[((j >> 3) & 63) * 64 + ((i >> 3) & 63)] * 0.045;
        let cr = pr * (1 + grain), cg = pg * (1 + grain), cb = pb * (1 + grain * 1.2);
        const dist = Math.hypot(x, z);
        if (dist < rim) {
          // Shadowed slopes take a cold blue-grey wash, lit ones go pale.
          const s = rowS[r * size + i];
          if (s < 0) {
            const t = Math.min(1, -s * 0.95);
            cr += (126 - cr) * t; cg += (134 - cg) * t; cb += (154 - cb) * t;
          } else {
            const t = Math.min(1, s * 0.7);
            cr += (249 - cr) * t; cg += (243 - cg) * t; cb += (226 - cb) * t;
          }
          // Low ground a touch bluer, high ground warmer.
          const high = clamp((h + 20) / 40, 0, 1);
          cr *= 0.97 + high * 0.05; cb *= 1.03 - high * 0.06;
          // Bare rock speckles the steep faces, as it shows through the snow in the forest.
          const hx = rowH[k + 1] - h, hz = rowH[k + size + 1] - h;
          const slope = Math.hypot(hx, hz) * MAP_PX;
          const rock = clamp((slope + fine[((j * 3) & 127) * 128 + ((i * 3 + 17) & 127)] * 0.25 - 0.42) / 0.25, 0, 1);
          if (rock > 0) { cr += (128 - cr) * rock * 0.45; cg += (118 - cg) * rock * 0.45; cb += (108 - cb) * rock * 0.45; }
          // Contours: a steady line width whatever the slope, heavier every fourth.
          const f = h / MAP.contour;
          const near = Math.round(f);
          const fw = (Math.abs(hx) + Math.abs(hz)) / MAP.contour;
          if (fw > 1e-5) {
            const index = near % 4 === 0;
            const d = Math.abs(f - near) / fw;
            const line = clamp((index ? 1.25 : 0.7) - d, 0, 1) * (index ? 0.62 : 0.36) * clamp((rim - 6 - dist) / 14, 0, 1);
            if (line > 0) { cr += (122 - cr) * line; cg += (82 - cg) * line; cb += (48 - cb) * line; }
          }
        } else {
          // Past the rim: the crater walls and the rotten rock above them.
          const t = clamp((dist - rim) / (extent - rim), 0, 1);
          const k2 = 0.28 + t * 0.2 + grain * 2;
          cr += (148 - cr) * k2; cg += (134 - cg) * k2; cb += (118 - cb) * k2;
        }
        const o = (r * size + i) * 4;
        data[o] = cr; data[o + 1] = cg; data[o + 2] = cb; data[o + 3] = 255;
      }
    }
    g.putImageData(image, 0, y0);
    yield;
  }

  // The lake: ice in a pale wash, lined in from its shore the old way.
  const lake = siteById('lake');
  if (lake) {
    const lr = (a) => 40 * (1 + 0.07 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a + 2.4) + 0.035 * Math.sin(8 * a + 0.5));
    const shore = (offset) => {
      g.beginPath();
      for (let s = 0; s <= 96; s++) {
        const a = (s / 96) * Math.PI * 2, r = (lr(a) - offset) * MAP_PX;
        const px = mapToChart(lake.x) + Math.sin(a) * r, py = mapToChart(lake.z) - Math.cos(a) * r;
        if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };
    shore(0);
    g.fillStyle = 'rgba(205, 222, 230, .92)';
    g.fill();
    g.strokeStyle = MAP_INK.ink;
    g.lineWidth = 1.8;
    g.stroke();
    g.lineWidth = 0.8;
    for (const [offset, alpha] of [[3, 0.5], [6.5, 0.32], [11, 0.2]]) {
      shore(offset);
      g.strokeStyle = `rgba(70, 96, 127, ${alpha})`;
      g.stroke();
    }
    // Cracks in the ice.
    const rand = seededRandom(430);
    g.strokeStyle = 'rgba(70, 96, 127, .38)';
    g.lineWidth = 0.7;
    for (let c = 0; c < 6; c++) {
      let a = rand() * Math.PI * 2, r = rand() * 18;
      let px = mapToChart(lake.x + Math.sin(a) * r), py = mapToChart(lake.z - Math.cos(a) * r);
      g.beginPath();
      g.moveTo(px, py);
      for (let s = 0; s < 4; s++) {
        a += (rand() - 0.5) * 1.4;
        px += Math.sin(a) * 7; py -= Math.cos(a) * 7;
        g.lineTo(px, py);
      }
      g.stroke();
    }
    yield;
  }

  // The forest: little conifers, thick in the stands and thin in the glades, by the same
  // clumping the forest itself grows by.
  const clump = (x, z) => 0.5 + 0.28 * Math.sin(x * 0.083 + 2) * Math.cos(z * 0.071) + 0.22 * Math.sin((x + z) * 0.031);
  const rand = seededRandom(1963);
  const step = 9;
  for (let z = -rim; z < rim; z += step) {
    const dark = new Path2D(), light = new Path2D();
    for (let x = -rim; x < rim; x += step) {
      const tx = x + rand() * step, tz = z + rand() * step;
      const keep = rand(), s = (2.2 + rand() * 1.7);
      if (Math.hypot(tx, tz) > rim - 12) continue;
      const density = clamp(clump(tx, tz) + 0.28, 0, 1);
      if (keep > density ** 2.4 * 0.92 || mapClearAt(tx, tz)) continue;
      const cx = mapToChart(tx), cy = mapToChart(tz);
      // Each tree is half in shadow, away from the light.
      dark.moveTo(cx, cy - s * 1.45); dark.lineTo(cx + s * 0.78, cy + s * 0.55); dark.lineTo(cx, cy + s * 0.55); dark.closePath();
      light.moveTo(cx, cy - s * 1.45); light.lineTo(cx, cy + s * 0.55); light.lineTo(cx - s * 0.78, cy + s * 0.55); light.closePath();
    }
    g.fillStyle = 'rgba(36, 58, 50, .86)';
    g.fill(dark);
    g.fillStyle = 'rgba(70, 98, 84, .68)';
    g.fill(light);
    if (Math.floor(z / step) % 4 === 0) yield;
  }

  // The rim: the edge of the crater inked heavy, with cliff hachures falling away from it.
  const cx = size / 2, cy = size / 2;
  const rimAt = (a) => (rim + 3 * valueNoise(a * 24, 1.5)) * MAP_PX;
  g.strokeStyle = 'rgba(64, 46, 32, .55)';
  g.lineWidth = 1.1;
  g.beginPath();
  for (let s = 0; s < 1100; s++) {
    const a = (s / 1100) * Math.PI * 2;
    const r0 = rimAt(a), len = (26 + 34 * (0.5 + 0.5 * valueNoise(a * 14, 4.2))) * MAP_PX;
    g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    g.lineTo(cx + Math.sin(a) * (r0 + len), cy - Math.cos(a) * (r0 + len));
  }
  g.stroke();
  // Scree and broken rock higher up.
  g.strokeStyle = 'rgba(64, 46, 32, .3)';
  g.lineWidth = 0.9;
  g.beginPath();
  const scree = seededRandom(1000);
  for (let s = 0; s < 900; s++) {
    const a = scree() * Math.PI * 2, r = (rim + 66 + scree() * 48) * MAP_PX, l = 4 + scree() * 6;
    const px = cx + Math.sin(a) * r, py = cy - Math.cos(a) * r;
    g.moveTo(px - l * 0.5, py + l * 0.3); g.lineTo(px, py - l * 0.3); g.lineTo(px + l * 0.5, py + l * 0.3);
  }
  g.stroke();
  g.strokeStyle = MAP_INK.ink;
  g.lineWidth = 3;
  g.beginPath();
  for (let s = 0; s <= 720; s++) {
    const a = (s / 720) * Math.PI * 2, r = rimAt(a);
    if (s === 0) g.moveTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r); else g.lineTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
  }
  g.stroke();
  yield;

  // The grid, in faint red, and its letters and numbers just inside the rim.
  g.save();
  g.beginPath();
  g.arc(cx, cy, (rim - 4) * MAP_PX, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(160, 52, 44, .22)';
  g.lineWidth = 1;
  g.beginPath();
  for (let v = -750; v <= 750; v += 250) {
    g.moveTo(mapToChart(v), 0); g.lineTo(mapToChart(v), size);
    g.moveTo(0, mapToChart(v)); g.lineTo(size, mapToChart(v));
  }
  g.stroke();
  g.restore();
  g.font = `italic 17px ${MAP_INK.font}`;
  for (let c = 0; c < 8; c++) {
    const along = -875 + c * 250, edge = Math.sqrt(rim * rim - along * along) - 34;
    mapText(g, 'ABCDEFGH'[c], mapToChart(along), mapToChart(-edge), `italic 17px ${MAP_INK.font}`, 'rgba(150, 44, 38, .75)');
    mapText(g, 'ABCDEFGH'[c], mapToChart(along), mapToChart(edge), `italic 17px ${MAP_INK.font}`, 'rgba(150, 44, 38, .75)');
    mapText(g, String(c + 1), mapToChart(-edge), mapToChart(along), `italic 17px ${MAP_INK.font}`, 'rgba(150, 44, 38, .75)');
    mapText(g, String(c + 1), mapToChart(edge), mapToChart(along), `italic 17px ${MAP_INK.font}`, 'rgba(150, 44, 38, .75)');
  }
  yield;

  // The walls, named along the outside of the rim.
  g.fillStyle = 'rgba(51, 37, 26, .78)';
  g.font = `600 22px ${MAP_INK.font}`;
  const wallR = (rim + 58) * MAP_PX;
  for (const [text, deg] of [['NORTH WALL', 0], ['EAST WALL', 90], ['SOUTH RIM', 180], ['WEST WALL', 270], ['ICEFALL', 45], ['ROCKSLIDES', 225]]) {
    mapArcText(g, text, cx, cy, wallR, (deg * Math.PI) / 180, 7, MAP_INK.halo);
  }
  yield;

  // The cartouche, top left.
  g.save();
  const bx = 26, by = 26, bw = 470, bh = 196;
  g.fillStyle = 'rgba(244, 236, 214, .94)';
  g.fillRect(bx, by, bw, bh);
  g.strokeStyle = MAP_INK.ink;
  g.lineWidth = 3;
  g.strokeRect(bx, by, bw, bh);
  g.lineWidth = 1;
  g.strokeRect(bx + 7, by + 7, bw - 14, bh - 14);
  g.fillStyle = MAP_INK.ink;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `600 50px ${MAP_INK.font}`;
  g.letterSpacing = '6px';
  g.fillText('THE HOLLOW', bx + bw / 2, by + 74);
  g.letterSpacing = '0px';
  g.font = `italic 21px ${MAP_INK.font}`;
  g.fillText('called in the north the Death Crater', bx + bw / 2, by + 106);
  g.beginPath(); g.moveTo(bx + 120, by + 124); g.lineTo(bx + bw - 120, by + 124); g.stroke();
  g.font = `16px ${MAP_INK.font}`;
  g.fillText('From the survey of Dr. I. Varga, Hollow Station, 1963', bx + bw / 2, by + 150);
  g.font = `italic 16px ${MAP_INK.font}`;
  g.fillText('traced for the air by A. Holm', bx + bw / 2, by + 174);
  g.restore();

  // The compass rose, top right.
  const rx = size - 196, ry = 196, rr = 150;
  g.save();
  g.translate(rx, ry);
  g.strokeStyle = MAP_INK.ink;
  g.fillStyle = MAP_INK.ink;
  g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, rr - 12, 0, Math.PI * 2); g.stroke();
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180, l = d % 45 === 0 ? 12 : d % 15 === 0 ? 8 : 4;
    g.beginPath(); g.moveTo(Math.sin(a) * (rr - 12), -Math.cos(a) * (rr - 12)); g.lineTo(Math.sin(a) * (rr - 12 - l), -Math.cos(a) * (rr - 12 - l)); g.stroke();
  }
  const point = (a, long, wide, dark) => {
    const s = Math.sin(a), c = Math.cos(a);
    const tip = [s * long, -c * long], left = [Math.sin(a - Math.PI / 2) * wide, -Math.cos(a - Math.PI / 2) * wide], right = [-left[0], -left[1]];
    g.fillStyle = dark ? MAP_INK.ink : 'rgba(244, 236, 214, .95)';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(...tip); g.lineTo(...left); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = dark ? 'rgba(244, 236, 214, .95)' : MAP_INK.ink;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(...tip); g.lineTo(...right); g.closePath(); g.fill(); g.stroke();
  };
  for (let k = 0; k < 8; k++) point(((k + 0.5) * Math.PI) / 4, rr * 0.5, 9, k % 2 === 0);
  for (let k = 0; k < 4; k++) point((k * Math.PI) / 2, rr * 0.86, 15, true);
  g.fillStyle = MAP_INK.red;
  g.beginPath(); g.moveTo(0, -rr * 0.86); g.lineTo(9, -rr * 0.56); g.lineTo(-9, -rr * 0.56); g.closePath(); g.fill();
  g.fillStyle = MAP_INK.ink;
  g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
  g.font = `600 30px ${MAP_INK.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', 0, -rr - 22);
  g.font = `600 20px ${MAP_INK.font}`;
  g.fillText('E', rr + 17, 0);
  g.fillText('S', 0, rr + 18);
  g.fillText('W', -rr - 18, 0);
  g.restore();

  // The scale, bottom left.
  g.save();
  const sx = 52, sy = size - 78, seg = 100 * MAP_PX;
  g.fillStyle = MAP_INK.ink;
  g.strokeStyle = MAP_INK.ink;
  g.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) {
    if (k % 2 === 0) g.fillRect(sx + k * seg, sy, seg, 9);
    g.strokeRect(sx + k * seg, sy, seg, 9);
  }
  g.font = `15px ${MAP_INK.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  for (let k = 0; k <= 5; k++) g.fillText(String(k * 100), sx + k * seg, sy - 8);
  g.font = `italic 17px ${MAP_INK.font}`;
  g.fillText('Scale of metres', sx + 2.5 * seg, sy + 32);
  g.restore();

  // Notes in pencil, bottom right: the pilots'.
  g.save();
  g.fillStyle = 'rgba(70, 64, 58, .82)';
  g.font = `italic 19px ${MAP_INK.font}`;
  g.textAlign = 'right';
  g.translate(size - 46, size - 132);
  g.rotate(-0.04);
  g.fillText('Compass wanders near the Breath.', 0, 0);
  g.fillText('Downdraughts over the north wall. — A.H.', 0, 26);
  g.font = `italic 17px ${MAP_INK.font}`;
  g.fillText('Grandad\'s chart. Don\'t lose it. — J.', -12, 66);
  g.restore();
  yield;

  // Age: folds, foxing, a coffee ring or two, and the edges gone brown with handling.
  g.save();
  const age = seededRandom(1979);
  g.globalCompositeOperation = 'multiply';
  for (let k = 0; k < 4; k++) {
    const x = age() * size, y = age() * size, r = 40 + age() * 70;
    g.strokeStyle = `rgba(150, 105, 60, ${0.12 + age() * 0.12})`;
    g.lineWidth = 2 + age() * 4;
    g.beginPath(); g.arc(x, y, r, age() * 6, age() * 6 + 4 + age() * 2); g.stroke();
    const blot = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    blot.addColorStop(0, 'rgba(190, 150, 100, .08)');
    blot.addColorStop(1, 'rgba(190, 150, 100, 0)');
    g.fillStyle = blot;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let k = 0; k < 260; k++) {
    const x = age() * size, y = age() * size, r = 1 + age() * age() * 6;
    g.fillStyle = `rgba(160, 110, 60, ${0.08 + age() * 0.18})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const edge = g.createRadialGradient(size / 2, size / 2, size * 0.42, size / 2, size / 2, size * 0.74);
  edge.addColorStop(0, 'rgba(255, 255, 255, 0)');
  edge.addColorStop(1, 'rgba(150, 105, 55, .5)');
  g.fillStyle = edge;
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';
  // It was folded in four to fit the chart case.
  for (const [x0, y0, x1, y1] of [[size / 2, 0, size / 2, size], [0, size / 2, size, size / 2]]) {
    const vertical = x0 === x1;
    for (const [off, colour] of [[-1.5, 'rgba(120, 90, 55, .22)'], [1.5, 'rgba(255, 252, 240, .35)']]) {
      g.strokeStyle = colour;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x0 + (vertical ? off : 0), y0 + (vertical ? 0 : off));
      g.lineTo(x1 + (vertical ? off : 0), y1 + (vertical ? 0 : off));
      g.stroke();
    }
  }
  g.strokeStyle = 'rgba(90, 60, 30, .45)';
  g.lineWidth = 6;
  g.strokeRect(3, 3, size - 6, size - 6);
  g.restore();
}

// Draws the chart for up to `ms` milliseconds.
function mapPaintFor(ms) {
  if (!mapState.painter) return;
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    if (mapState.painter.next().done) {
      mapState.painter = null;
      mapState.chartReady = true;
      mapState.mini.t = -1e9;
      return;
    }
  }
}

/* ---------- Her trail ---------- */
function mapPushCrumb(x, z) {
  const s = mapState;
  s.trail[s.trailHead * 2] = x;
  s.trail[s.trailHead * 2 + 1] = z;
  s.trailHead = (s.trailHead + 1) % MAP.trailMax;
  s.trailCount = Math.min(MAP.trailMax, s.trailCount + 1);
  if (!Number.isNaN(x)) { s.crumb.x = x; s.crumb.z = z; s.crumb.set = true; }
}

function mapBreakTrail() {
  if (mapState.trailCount && !Number.isNaN(mapState.trail[((mapState.trailHead + MAP.trailMax - 1) % MAP.trailMax) * 2])) mapPushCrumb(NaN, NaN);
}

function mapRecordTrail() {
  const p = player.pos, c = mapState.crumb;
  if (c.set) {
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (d < MAP.trailStep) return;
    if (d > MAP.trailJump) mapBreakTrail();
  }
  mapPushCrumb(p.x, p.z);
}

// Traces her trail into the current path, oldest first, through `project`, skipping the
// gaps and anything further than `range` from (cx, cz).
function mapTrailPath(g, project, cx, cz, range) {
  const s = mapState;
  const start = (s.trailHead - s.trailCount + MAP.trailMax) % MAP.trailMax;
  let pen = false;
  for (let k = 0; k < s.trailCount; k++) {
    const i = ((start + k) % MAP.trailMax) * 2;
    const x = s.trail[i], z = s.trail[i + 1];
    if (Number.isNaN(x) || Math.abs(x - cx) > range || Math.abs(z - cz) > range) { pen = false; continue; }
    const p = project(x, z);
    if (pen) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y);
    pen = true;
  }
}

/* ---------- Waypoint ---------- */
function setMapWaypoint(x, z, label = 'Waypoint') {
  const r = Math.hypot(x, z);
  if (r > WORLD_RADIUS) { x *= WORLD_RADIUS / r; z *= WORLD_RADIUS / r; }
  mapState.waypoint = { x, z, label };
  mapState.mini.t = mapState.compass.t = -1e9;
  mapState.hudT = 0;
  Sfx.mapPencil();
  if (game.state === 'book') mapRenderLegend();
}

function clearMapWaypoint() {
  if (!mapState.waypoint) return;
  mapState.waypoint = null;
  mapState.mini.t = mapState.compass.t = -1e9;
  mapState.hudT = 0;
  if (game.state === 'book') mapRenderLegend();
}

/* ---------- Markers ---------- */
// Everything worth marking, in world positions: { x, z, kind, label, site?, flagOf?, extra? }.
// A site she has only read about is an 'unknown' mark, pencilled in.
function mapCollectMarkers() {
  const list = [];
  for (const site of SITES) {
    const always = site.id === 'breath';
    if (!site.discovered && !site.revealed && !always) continue;
    const found = site.discovered || always;
    list.push({ x: site.x, z: site.z, kind: found ? site.id : 'unknown', label: mapSiteName(site), site, found: site.discovered });
    if (site.discovered && site.part && !mapPartTaken(site.part)) {
      const spot = mapFlagSpot(site);
      list.push({ x: spot.x, z: spot.z, kind: 'flag', label: `Red flag at ${mapSiteName(site)}`, site, flagOf: site });
    }
  }
  if (wreck.group) list.push({ x: wreck.x, z: wreck.z, kind: 'wreck', label: 'The wreck' });
  if (mapState.crimson) list.push({ x: mapState.crimson.x, z: mapState.crimson.z, kind: 'crimson', label: 'Where Crimson fell' });
  for (const fire of survival.fires) list.push({ x: fire.x, z: fire.z, kind: 'fire', label: 'Your campfire' });
  for (const provider of MAP_MARKERS) {
    const found = mapSafe(provider, null);
    if (!Array.isArray(found)) continue;
    for (const m of found) {
      if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.z)) continue;
      // Where Crimson fell is marked once, by whoever marks it.
      if (mapState.crimson && Math.hypot(m.x - mapState.crimson.x, m.z - mapState.crimson.z) < 8) {
        const mine = list.find((e) => e.kind === 'crimson');
        if (mine) list.splice(list.indexOf(mine), 1);
      }
      list.push({ x: m.x, z: m.z, kind: m.kind || 'poi', label: m.label || '', extra: true });
    }
  }
  return list;
}

function mapObjective() {
  const t = mapSafe(() => objectiveTarget(), null);
  return t && Number.isFinite(t.x) && Number.isFinite(t.z) ? t : null;
}

// What a marker means, for the tooltip and the legend.
function mapMarkerLines(m) {
  const lines = [];
  if (m.site && !m.flagOf) {
    const site = m.site;
    if (site.id === 'breath') lines.push(site.discovered ? 'Where the warm air rises' : 'The steam column at the crater\'s heart');
    else if (!site.discovered) lines.push('Not yet visited');
    else if (site.part && !mapPartTaken(site.part)) lines.push('Found. Its red flag still stands');
    else lines.push('Found');
    const note = mapSiteNote(site);
    if (note) lines.push(note);
  } else if (m.flagOf) {
    lines.push('Something left under it');
  }
  lines.push(`${mapFromHer(m.x, m.z)} · ${mapGridRef(m.x, m.z)}`);
  return lines;
}

/* ---------- The book map ---------- */
function mapBookView(w, h) {
  const v = mapState.view;
  const fit = Math.min(w / (2 * MAP.extent), h / (2 * (MAP.rim + 20)));
  const scale = fit * v.zoom;
  return { w, h, scale, zoom: v.zoom, ox: w / 2 - v.x * scale, oy: h / 2 - v.z * scale };
}

function mapClampView() {
  const v = mapState.view;
  v.zoom = clamp(v.zoom, 1, MAP.zoomMax);
  if (v.zoom <= 1.001) { v.x = v.z = 0; return; }
  const reach = MAP.extent * (1 - 0.6 / v.zoom);
  v.x = clamp(v.x, -reach, reach);
  v.z = clamp(v.z, -reach, reach);
}

function mapZoomAt(factor, sx, sy) {
  const b = mapState.book, v = mapState.view;
  const before = mapBookView(b.w, b.h);
  const wx = (sx - before.ox) / before.scale, wz = (sy - before.oy) / before.scale;
  v.zoom = clamp(v.zoom * factor, 1, MAP.zoomMax);
  const after = mapBookView(b.w, b.h);
  v.x = wx - (sx - b.w / 2) / after.scale;
  v.z = wz - (sy - b.h / 2) / after.scale;
  mapClampView();
}

function mapCentreOn(x, z, zoom) {
  const v = mapState.view;
  v.zoom = Math.max(v.zoom, zoom);
  v.x = x;
  v.z = z;
  mapClampView();
}

function mapSizeBook() {
  const canvas = $('map-canvas');
  const w = canvas.clientWidth, h = canvas.clientHeight;
  mapState.book.w = w;
  mapState.book.h = h;
  mapState.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(w * mapState.dpr), bh = Math.round(h * mapState.dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
}

function mapDrawBook() {
  const canvas = $('map-canvas'), b = mapState.book;
  if (!b.w || !b.h || !mapState.chart) return;
  const g = canvas.getContext('2d');
  const v = mapBookView(b.w, b.h);
  mapState.bookView = v;
  const now = performance.now() / 1000;
  // The chart only needs scaling again when the view moves (or while it's still being
  // drawn); the marks over it are redrawn each frame.
  const layer = mapState.layer || (mapState.layer = document.createElement('canvas'));
  const key = `${canvas.width}x${canvas.height} ${v.ox.toFixed(2)} ${v.oy.toFixed(2)} ${v.scale.toFixed(5)} ${mapState.chartReady}`;
  if (key !== mapState.layerKey || !mapState.chartReady) {
    mapState.layerKey = key;
    layer.width = canvas.width;
    layer.height = canvas.height;
    const lg = layer.getContext('2d');
    lg.setTransform(mapState.dpr, 0, 0, mapState.dpr, 0, 0);
    // The chart lies on the page with a soft shadow under it.
    const E = MAP.extent, x0 = v.ox - E * v.scale, y0 = v.oy - E * v.scale, side = 2 * E * v.scale;
    lg.save();
    lg.shadowColor = 'rgba(40, 25, 10, .4)';
    lg.shadowBlur = 16;
    lg.shadowOffsetY = 5;
    lg.fillStyle = '#e4d5b2';
    lg.fillRect(x0, y0, side, side);
    lg.restore();
    lg.imageSmoothingEnabled = true;
    lg.imageSmoothingQuality = 'high';
    lg.drawImage(mapState.chart, x0, y0, side, side);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(layer, 0, 0);
  g.setTransform(mapState.dpr, 0, 0, mapState.dpr, 0, 0);

  const pt = { x: 0, y: 0 };
  const project = (x, z) => { pt.x = v.ox + x * v.scale; pt.y = v.oy + z * v.scale; return pt; };
  const hits = mapState.hits = [];
  const iconSize = clamp(14 + v.zoom * 2.2, 16, 26);
  const label = `italic ${Math.round(clamp(12 + v.zoom * 0.8, 13, 16))}px ${MAP_INK.font}`;

  // Her trail, dotted in red.
  g.beginPath();
  mapTrailPath(g, project, 0, 0, Infinity);
  g.strokeStyle = MAP_INK.trail;
  g.lineWidth = 1.7;
  g.lineCap = g.lineJoin = 'round';
  g.setLineDash([2.5, 4]);
  g.stroke();
  g.setLineDash([]);

  // Places, flags, fires and the rest; places she's only heard of are pencilled in.
  const markers = mapCollectMarkers();
  const order = { fire: 0, crimson: 1, flag: 3 };
  markers.sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  for (const m of markers) {
    const p = project(m.x, m.z);
    let sx = p.x, sy = p.y;
    if (sx < -40 || sy < -40 || sx > b.w + 40 || sy > b.h + 40) continue;
    const site = m.flagOf ? null : m.site;
    let size = iconSize;
    if (m.kind === 'fire') size = iconSize * 0.72;
    if (m.extra || m.kind === 'crimson') size = iconSize * 0.75;
    if (m.flagOf) {
      // Zoomed out, the flag would sit on its site's icon, so it sits at its shoulder.
      const at = project(m.flagOf.x, m.flagOf.z);
      if (Math.hypot(sx - at.x, sy - at.y) < iconSize * 0.9) { sx = at.x + iconSize * 0.62; sy = at.y - iconSize * 0.5; }
      size = iconSize * 0.7;
    }
    if (m.kind === 'unknown' && site) {
      // Pencil ring: how close she has to get for the place to count as found.
      const r = Math.max(10, site.radius * v.scale);
      g.save();
      g.strokeStyle = 'rgba(74, 68, 62, .55)';
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    // Fresh marks pulse until she's looked.
    if (site && mapState.fresh.has(site.id)) {
      const u = (now * 0.8) % 1;
      g.strokeStyle = `rgba(163, 38, 44, ${0.7 * (1 - u)})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(sx, sy, size * (0.6 + u * 1.4), 0, Math.PI * 2); g.stroke();
    }
    if (site && mapState.legendHover === site.id) {
      g.strokeStyle = MAP_INK.red;
      g.lineWidth = 2;
      g.beginPath(); g.arc(sx, sy, size * 0.95 + Math.sin(now * 6) * 1.5, 0, Math.PI * 2); g.stroke();
    }
    const ink = m.kind === 'unknown' ? MAP_INK.pencil : m.kind === 'breath' ? MAP_INK.blue : m.kind === 'wreck' ? '#5a2a22' : MAP_INK.ink;
    mapIcon(g, m.kind, sx, sy, size, ink);
    if (site || m.kind === 'wreck' || (m.extra && m.label && v.zoom > 1.8)) {
      mapText(g, m.label, sx, sy + size * 0.62 + 8, m.kind === 'unknown' ? label : label.replace('italic', 'italic 600'), ink);
    }
    hits.push({ x: sx, y: sy, r: Math.max(11, size * 0.6), m });
  }

  // The objective, a gold diamond.
  const target = mapObjective();
  if (target) {
    const p = project(target.x, target.z);
    const pulse = 1 + Math.sin(now * 3) * 0.08;
    mapIcon(g, 'target', p.x, p.y - iconSize * 0.95, iconSize * 0.6 * pulse, MAP_INK.ink, null);
    hits.push({ x: p.x, y: p.y - iconSize * 0.95, r: 10, m: { x: target.x, z: target.z, kind: 'target', label: target.label ? `Next: ${target.label}` : 'What to do next' } });
  }

  // Her waypoint, in pencil.
  const wp = mapState.waypoint;
  if (wp) {
    const p = project(wp.x, wp.z);
    const wx = p.x, wy = p.y;
    mapIcon(g, 'waypoint', wx, wy, iconSize * 1.05, '#3d3a6b', null);
    const edge = mapEdgePoint(wx, wy, b.w, b.h, 16);
    // A mark on a labelled place needs no label of its own.
    const onPlace = hits.some((hit) => Math.hypot(hit.x - wx, hit.y - wy) < 6);
    if (edge) mapEdgeArrow(g, edge.x, edge.y, edge.angle, '#3d3a6b');
    else if (!onPlace) mapText(g, `${wp.label} · ${mapDistanceText(Math.hypot(wp.x - player.pos.x, wp.z - player.pos.z))}`, wx, wy - iconSize * 0.75, label, '#3d3a6b', MAP_INK.halo);
    hits.push({ x: wx, y: wy, r: 12, m: { x: wp.x, z: wp.z, kind: 'waypoint', label: wp.label }, waypoint: true });
  }

  // Her, last, on top of everything.
  const her = project(player.pos.x, player.pos.z);
  const hx = her.x, hy = her.y;
  const edge = mapEdgePoint(hx, hy, b.w, b.h, 16);
  if (edge) mapEdgeArrow(g, edge.x, edge.y, edge.angle, MAP_INK.red);
  else mapDrawHer(g, hx, hy, Math.PI - player.bodyYaw, clamp(10 + v.zoom, 11, 15), (now * 0.7) % 1);
  hits.push({ x: hx, y: hy, r: 12, m: { x: player.pos.x, z: player.pos.z, kind: 'you', label: 'You are here' }, you: true });

  if (!mapState.chartReady) mapText(g, 'Unfolding the chart...', 18, b.h - 18, `italic 14px ${MAP_INK.font}`, MAP_INK.soft, MAP_INK.halo, 'left');
  mapDrawTooltip(g);
}

// Where a point off the edge of a view should be pointed at from, or null if it's in view.
function mapEdgePoint(x, y, w, h, margin) {
  if (x >= margin && y >= margin && x <= w - margin && y <= h - margin) return null;
  const cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy;
  const t = Math.min((w / 2 - margin) / Math.abs(dx || 1e-6), (h / 2 - margin) / Math.abs(dy || 1e-6));
  return { x: cx + dx * t, y: cy + dy * t, angle: Math.atan2(dx, -dy) };
}

function mapDrawTooltip(g) {
  const hover = mapState.hover, mouse = mapState.mouse, b = mapState.book;
  if (!hover || !mouse || mapState.drag) return;
  const m = hover.m;
  let lines;
  if (hover.you) lines = [`${mapGridRef(m.x, m.z)} · facing ${mapPoint(mapBearing(Math.sin(player.bodyYaw), Math.cos(player.bodyYaw)))}`];
  else if (hover.waypoint) lines = [`${mapFromHer(m.x, m.z)}`, 'Click to rub it out'];
  else if (m.kind === 'target') lines = [mapFromHer(m.x, m.z)];
  else lines = [...mapMarkerLines(m), 'Click to mark it'];
  g.save();
  g.font = `600 14px ${MAP_INK.font}`;
  let w = g.measureText(m.label).width;
  g.font = `italic 13px ${MAP_INK.font}`;
  for (const line of lines) w = Math.max(w, g.measureText(line).width);
  w += 22;
  const h = 26 + lines.length * 17;
  let x = mouse.x + 16, y = mouse.y + 14;
  if (x + w > b.w - 6) x = mouse.x - w - 12;
  if (y + h > b.h - 6) y = mouse.y - h - 10;
  g.fillStyle = 'rgba(246, 239, 220, .97)';
  g.strokeStyle = 'rgba(51, 37, 26, .7)';
  g.lineWidth = 1;
  g.shadowColor = 'rgba(30, 20, 10, .3)';
  g.shadowBlur = 10;
  g.shadowOffsetY = 3;
  g.fillRect(x, y, w, h);
  g.shadowColor = 'transparent';
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  mapText(g, m.label, x + 11, y + 15, `600 14px ${MAP_INK.font}`, MAP_INK.ink, null, 'left');
  lines.forEach((line, i) => mapText(g, line, x + 11, y + 33 + i * 17, `italic 13px ${MAP_INK.font}`, i === lines.length - 1 && !hover.you ? MAP_INK.soft : MAP_INK.ink, null, 'left'));
  g.restore();
}

function mapHitAt(x, y) {
  let best = null, bestD = Infinity;
  for (const hit of mapState.hits) {
    const d = Math.hypot(hit.x - x, hit.y - y);
    if (d < hit.r && d < bestD) { best = hit; bestD = d; }
  }
  return best;
}

function mapClickAt(x, y) {
  const v = mapState.bookView;
  if (!v) return;
  const hit = mapHitAt(x, y);
  if (hit && hit.waypoint) { clearMapWaypoint(); Sfx.mapPencil(); return; }
  if (hit && !hit.you) {
    const m = hit.m;
    setMapWaypoint(m.x, m.z, m.site && !m.flagOf ? mapSiteName(m.site) : m.label || 'Waypoint');
    return;
  }
  setMapWaypoint((x - v.ox) / v.scale, (y - v.oy) / v.scale);
}

/* ---------- Legend ---------- */
// Icons for the legend, drawn once into small images.
function mapIconUrl(kind, ink = MAP_INK.ink) {
  const key = `${kind}/${ink}`;
  if (!mapState.icons[key]) {
    const c = document.createElement('canvas');
    c.width = c.height = 44;
    const g = c.getContext('2d');
    if (kind === 'you') mapDrawHer(g, 22, 22, 0.5, 26);
    else if (kind === 'trail') {
      g.strokeStyle = MAP_INK.trail; g.lineWidth = 3.4; g.lineCap = 'round'; g.setLineDash([5, 8]);
      g.beginPath(); g.moveTo(5, 32); g.quadraticCurveTo(22, 4, 39, 22); g.stroke();
    } else mapIcon(g, kind, 22, 22, 34, ink, null);
    mapState.icons[key] = c.toDataURL();
  }
  return mapState.icons[key];
}

function mapEscape(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function mapRenderLegend() {
  const el = $('map-legend');
  const majors = SITES.filter((s) => s.major);
  const found = majors.filter((s) => s.discovered);
  const toVisit = SITES.filter((s) => s.revealed && !s.discovered && s.id !== 'breath');
  const uncharted = majors.filter((s) => !s.revealed && !s.discovered).length;
  const dist = (s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
  toVisit.sort((a, b) => dist(a) - dist(b));
  const breath = siteById('breath');
  const wp = mapState.waypoint;
  const marked = (s) => wp && Math.hypot(wp.x - s.x, wp.z - s.z) < 1;
  const item = (s, kind, note, cls) => `<li class="map-site ${cls}${marked(s) ? ' marked' : ''}" data-site="${s.id}">`
    + `<img src="${mapIconUrl(kind, kind === 'unknown' ? MAP_INK.pencil : kind === 'breath' ? MAP_INK.blue : MAP_INK.ink)}" alt="">`
    + `<span class="map-site-name">${mapEscape(mapSiteName(s))}</span>`
    + `<small>${mapEscape(mapFromHer(s.x, s.z))} · ${mapGridRef(s.x, s.z)}${note ? ` · ${note}` : ''}</small></li>`;
  const flagNote = (s) => {
    if (!s.part) return '';
    return mapPartTaken(s.part) ? '<span class="map-taken">part taken</span>' : '<span class="map-flag">red flag</span>';
  };
  let html = `<header class="map-legend-head"><h3>The Hollow</h3>`
    + `<p><b>${found.length}</b>/10 sites found &nbsp;·&nbsp; <b>${mapPartsFound()}</b>/10 balloon parts</p></header>`;
  if (wp) {
    html += `<div class="map-wp"><img src="${mapIconUrl('waypoint', '#3d3a6b')}" alt=""><span><b>${mapEscape(wp.label)}</b><small>${mapEscape(mapFromHer(wp.x, wp.z))}</small></span>`
      + '<button data-map="clear" class="map-btn">Rub out</button></div>';
  }
  if (toVisit.length) html += `<h4>To visit</h4><ul>${toVisit.map((s) => item(s, 'unknown', '', 'known')).join('')}</ul>`;
  if (breath) html += `<h4>The launch site</h4><ul>${item(breath, 'breath', breath.discovered ? 'found' : '', breath.discovered ? 'found' : 'known')}</ul>`;
  if (found.length) html += `<h4>Found</h4><ul>${found.map((s) => item(s, s.id, flagNote(s), 'found')).join('')}</ul>`;
  if (uncharted) html += `<p class="map-uncharted">${uncharted === 10 ? 'None of the ten sites are' : `${uncharted} more ${uncharted === 1 ? 'site isn\'t' : 'sites aren\'t'}`} on the chart yet. Notes and pages will tell her where to look; so will a high place.</p>`;
  const key = [['you', 'You'], ['trail', 'Your trail'], ['waypoint', 'Waypoint'], ['target', 'Next goal'], ['unknown', 'Not yet found'], ['flag', 'Red flag'], ['fire', 'Your campfire'], ['wreck', 'The wreck']];
  html += `<h4>Key</h4><ul class="map-key">${key.map(([kind, text]) => `<li><img src="${mapIconUrl(kind, kind === 'unknown' ? MAP_INK.pencil : kind === 'waypoint' ? '#3d3a6b' : kind === 'wreck' ? '#5a2a22' : MAP_INK.ink)}" alt="">${text}</li>`).join('')}</ul>`;
  el.innerHTML = html;
}

/* ---------- The field book ---------- */
const BOOK_HINTS = {
  map: '<kbd>Click</kbd> mark a waypoint &nbsp;·&nbsp; <kbd>Scroll</kbd> zoom &nbsp;·&nbsp; <kbd>Drag</kbd> move &nbsp;·&nbsp; <kbd>J</kbd> journal &nbsp;·&nbsp; <kbd>I</kbd> pack &nbsp;·&nbsp; <kbd>M</kbd> or <kbd>Tab</kbd> close',
  journal: '<kbd>M</kbd> map &nbsp;·&nbsp; <kbd>I</kbd> pack &nbsp;·&nbsp; <kbd>J</kbd> or <kbd>Tab</kbd> close &nbsp;·&nbsp; <kbd>Esc</kbd> pause',
  pack: '<kbd>M</kbd> map &nbsp;·&nbsp; <kbd>J</kbd> journal &nbsp;·&nbsp; <kbd>I</kbd> or <kbd>Tab</kbd> close &nbsp;·&nbsp; <kbd>Esc</kbd> pause',
};

function openBook(tab = 'map') {
  if (game.state === 'book') { mapShowTab(tab); return; }
  if (game.state !== 'playing') return;
  game.state = 'book';
  aiming = false;
  cancelDraw();
  setCrafting(false);
  for (const k in keys) keys[k] = false;
  document.exitPointerLock();
  $('book').classList.remove('hidden');
  Sfx.bookOpen();
  mapShowTab(tab, true);
}

// Back to the forest; with `pause`, to the pause screen instead (Escape can't re-lock the
// mouse, so it goes there like the moderator menu does).
function closeBook(pause = false) {
  if (game.state !== 'book') return;
  $('book').classList.add('hidden');
  mapState.fresh.clear();
  mapState.drag = mapState.hover = mapState.mouse = null;
  mapState.legendHover = null;
  Sfx.bookClose();
  game.state = 'playing';
  if (pause) setPaused(true);
  else lockPointer();
}

function mapShowTab(tab, opening = false) {
  if (!BOOK_HINTS[tab]) tab = 'map';
  if (!opening && tab !== mapState.tab) Sfx.bookPage();
  mapState.tab = tab;
  for (const button of document.querySelectorAll('#book .book-tabs [data-tab]')) {
    const on = button.dataset.tab === tab;
    button.classList.toggle('active', on);
    button.setAttribute('aria-selected', on);
  }
  for (const page of ['map', 'journal', 'pack']) $(`book-${page}`).classList.toggle('active', page === tab);
  document.querySelector('#book .book-hint').innerHTML = BOOK_HINTS[tab];
  mapRefreshPage();
}

// Fills the open page afresh.
function mapRefreshPage() {
  const tab = mapState.tab;
  if (tab === 'journal') mapSafe(() => renderJournal($('book-journal')));
  else if (tab === 'pack') mapSafe(() => renderPack($('book-pack')));
  else {
    const charted = hasMap();
    $('book-map').classList.toggle('no-chart', !charted);
    if (!charted) return;
    mapSizeBook();
    mapRenderLegend();
    mapDrawBook();
  }
}

/* ---------- Minimap ---------- */
function mapDrawMinimap() {
  const s = mapState, mini = s.mini, p = player.pos, yaw = player.yaw;
  const now = performance.now();
  // Only redraw when she has moved or turned, or now and then for marks that change.
  if (Math.abs(p.x - mini.x) < 0.12 && Math.abs(p.z - mini.z) < 0.12 && Math.abs(yaw - mini.yaw) < 0.003 && now - mini.t < 300) return;
  mini.x = p.x; mini.z = p.z; mini.yaw = yaw; mini.t = now;
  const canvas = $('minimap'), g = canvas.getContext('2d');
  const size = MAP.miniSize, c = size / 2, R = c - 2, dpr = s.dpr;
  const k = R / MAP.miniRange, th = yaw + Math.PI, cos = Math.cos(th), sin = Math.sin(th);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, size, size);
  g.save();
  g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#ddcfae';
  g.fillRect(0, 0, size, size);
  // The chart, turned so that up is the way the camera looks.
  g.translate(c, c);
  g.rotate(th);
  g.scale(k, k);
  g.translate(-p.x, -p.z);
  g.imageSmoothingEnabled = true;
  g.drawImage(s.chart, -MAP.extent, -MAP.extent, 2 * MAP.extent, 2 * MAP.extent);
  const world = { x: 0, y: 0 };
  g.beginPath();
  mapTrailPath(g, (x, z) => { world.x = x; world.y = z; return world; }, p.x, p.z, MAP.miniRange * 1.5);
  g.strokeStyle = MAP_INK.trail;
  g.lineWidth = 1.8 / k;
  g.lineCap = g.lineJoin = 'round';
  g.setLineDash([2.5 / k, 3.5 / k]);
  g.stroke();
  g.setLineDash([]);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pt = { x: 0, y: 0 };
  const project = (x, z) => {
    const dx = x - p.x, dz = z - p.z;
    pt.x = c + (dx * cos - dz * sin) * k;
    pt.y = c + (dx * sin + dz * cos) * k;
    return pt;
  };
  for (const m of s.hudMarkers) {
    const q = project(m.x, m.z);
    if (Math.hypot(q.x - c, q.y - c) > R + 6) continue;
    const size2 = m.kind === 'fire' || m.extra ? 11 : m.kind === 'flag' ? 12 : 15;
    mapIcon(g, m.kind, q.x, q.y, size2, m.kind === 'unknown' ? MAP_INK.pencil : m.kind === 'breath' ? MAP_INK.blue : MAP_INK.ink);
  }
  // The objective and the waypoint hold to the rim when they're further off.
  const pinned = (x, z, kind, ink) => {
    const q = project(x, z);
    const dx = q.x - c, dy = q.y - c, d = Math.hypot(dx, dy);
    if (d > R - 9) {
      const ex = c + (dx / d) * (R - 9), ey = c + (dy / d) * (R - 9);
      mapEdgeArrow(g, ex, ey, Math.atan2(dx, -dy), ink);
    } else mapIcon(g, kind, q.x, q.y, kind === 'waypoint' ? 16 : 11, ink, kind === 'waypoint' ? MAP_INK.halo : null);
  };
  if (s.target) pinned(s.target.x, s.target.z, 'target', MAP_INK.gold);
  if (s.waypoint) pinned(s.waypoint.x, s.waypoint.z, 'waypoint', '#3d3a6b');
  mapDrawHer(g, c, c, yaw - player.bodyYaw, 9);
  g.restore();
  // North, on the rim.
  const nx = c + sin * (R - 10), ny = c - cos * (R - 10);
  g.fillStyle = 'rgba(30, 20, 12, .75)';
  g.beginPath(); g.arc(nx, ny, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f3dfb0';
  g.font = `600 11px ${MAP_INK.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', nx, ny + 0.5);
}

/* ---------- Compass ---------- */
// Near the Breath the needle wanders, as the pilots warned; the card swings a few degrees
// but what it points at stays true.
function mapCompassDrift(t) {
  const d = Math.hypot(player.pos.x, player.pos.z);
  const k = 1 - smooth((d - 25) / 170);
  return k * (7 * Math.sin(t * 0.53) + 2.5 * Math.sin(t * 1.9 + 1));
}

function mapDrawCompass() {
  const s = mapState, cp = s.compass, p = player.pos;
  if (!cp.w) {
    cp.w = $('compass').clientWidth || 460;
    cp.h = $('compass').clientHeight || 54;
    cp.canvas.width = Math.round(cp.w * s.dpr);
    cp.canvas.height = Math.round(cp.h * s.dpr);
    cp.t = -1e9;
  }
  const now = performance.now();
  const heading = mapBearing(Math.sin(player.yaw), Math.cos(player.yaw));
  const drift = mapCompassDrift(now / 1000);
  if (Math.abs(heading - cp.heading) < 0.15 && Math.abs(p.x - cp.x) < 0.3 && Math.abs(p.z - cp.z) < 0.3 && now - cp.t < (drift ? 60 : 300)) return;
  cp.heading = heading; cp.x = p.x; cp.z = p.z; cp.t = now;
  const g = cp.canvas.getContext('2d');
  const w = cp.w, h = cp.h, mid = w / 2, perDeg = w / (2 * MAP.compassSpan);
  g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const rel = (bearing) => ((bearing - heading + 540) % 360) - 180;

  // The card: ticks every 5 degrees, the points of the compass and every 15th degree.
  const card = heading + drift;
  g.strokeStyle = 'rgba(243, 223, 176, .7)';
  g.fillStyle = MAP_INK.brass;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 1;
  g.beginPath();
  for (let d = Math.ceil((card - MAP.compassSpan) / 5) * 5; d <= card + MAP.compassSpan; d += 5) {
    const x = mid + (d - card) * perDeg, deg = ((d % 360) + 360) % 360;
    const long = deg % 45 === 0 ? 9 : deg % 15 === 0 ? 6 : 3;
    g.moveTo(x, 20); g.lineTo(x, 20 + long);
  }
  g.stroke();
  for (let d = Math.ceil((card - MAP.compassSpan) / 15) * 15; d <= card + MAP.compassSpan; d += 15) {
    const x = mid + (d - card) * perDeg, deg = ((d % 360) + 360) % 360;
    if (deg % 45 === 0) {
      const name = MAP_POINTS[deg / 45];
      g.font = `600 ${name.length === 1 ? 15 : 12}px ${MAP_INK.font}`;
      g.fillStyle = deg === 0 ? '#ff8f7a' : MAP_INK.brass;
      g.fillText(name, x, 38);
    } else {
      g.font = `11px ${MAP_INK.font}`;
      g.fillStyle = 'rgba(233, 210, 154, .62)';
      g.fillText(String(deg), x, 38);
    }
  }

  // What's out there: the waypoint, the objective, the Breath, the wreck and known sites.
  let facing = null, facingD = 4;
  const mark = (x, z, kind, ink, label, pin) => {
    const dx = x - p.x, dz = z - p.z, dist = Math.hypot(dx, dz);
    if (dist < 4) return;
    const r = rel(mapBearing(dx, dz));
    if (Math.abs(r) > MAP.compassSpan) {
      if (!pin) return;
      const ex = r > 0 ? w * 0.93 : w * 0.07;
      mapEdgeArrow(g, ex, 10, r > 0 ? Math.PI / 2 : -Math.PI / 2, ink);
      return;
    }
    const x0 = mid + r * perDeg;
    mapIcon(g, kind, x0, 10, pin ? 14 : 12, ink, null);
    if (pin) {
      g.font = `10px ${MAP_INK.font}`;
      g.fillStyle = ink;
      g.textAlign = 'left';
      g.fillText(mapDistanceText(dist), x0 + 9, 10);
      g.textAlign = 'center';
    }
    if (label && Math.abs(r) < facingD) { facingD = Math.abs(r); facing = `${label} · ${mapDistanceText(dist)}`; }
  };
  for (const m of s.hudMarkers) {
    const d = Math.hypot(m.x - p.x, m.z - p.z);
    // Fires are close by, and a flag points the same way as its site.
    if (m.kind === 'fire' || m.kind === 'flag') continue;
    if (m.extra && d > 400) continue;
    if (m.site && m.kind !== 'breath' && d > MAP.compassRange) continue;
    const ink = m.kind === 'unknown' ? 'rgba(233, 210, 154, .75)' : m.kind === 'breath' ? '#cfe2ff' : MAP_INK.brass;
    mark(m.x, m.z, m.kind, ink, m.label, false);
  }
  if (s.target) mark(s.target.x, s.target.z, 'target', '#ffd27a', s.target.label || 'Next', true);
  if (s.waypoint) mark(s.waypoint.x, s.waypoint.z, 'waypoint', '#c9c4ff', s.waypoint.label, true);

  // The lubber line, and what she's facing.
  g.fillStyle = '#ff8f7a';
  g.beginPath(); g.moveTo(mid - 5, 18); g.lineTo(mid + 5, 18); g.lineTo(mid, 25); g.closePath(); g.fill();
  g.font = `italic 11px ${MAP_INK.font}`;
  g.fillStyle = 'rgba(243, 223, 176, .9)';
  const shown = ((Math.round(card) % 360) + 360) % 360;
  g.fillText(facing || `${mapPoint(shown)} ${String(shown).padStart(3, '0')}°`, mid, h - 6);
}

/* ---------- Each frame ---------- */
function mapUpdateHud() {
  const s = mapState;
  const wantMini = hasMap(), wantCompass = hasItem('compass');
  if (wantMini !== s.showMini) {
    s.showMini = wantMini;
    $('minimap').classList.toggle('hidden', !wantMini);
    if (wantMini) { $('minimap').classList.add('arrive'); s.mini.t = -1e9; }
  }
  if (wantCompass !== s.showCompass) {
    s.showCompass = wantCompass;
    $('compass').classList.toggle('hidden', !wantCompass);
    if (wantCompass) { $('compass').classList.add('arrive'); s.compass.w = 0; }
  }
}

function updateMap(dt) {
  const s = mapState;
  mapRecordTrail();
  if (s.waypoint && Math.hypot(s.waypoint.x - player.pos.x, s.waypoint.z - player.pos.z) < MAP.arrive) {
    const label = s.waypoint.label;
    clearMapWaypoint();
    toast(label === 'Waypoint' ? 'Waypoint reached' : `Reached the mark: ${label}`);
    Sfx.mapArrive();
  }
  mapUpdateHud();
  if (!s.showMini && !s.showCompass) return;
  // Markers change slowly, so they're gathered a few times a second.
  s.hudT -= dt;
  if (s.hudT <= 0) {
    s.hudT = 0.25;
    s.hudMarkers = mapCollectMarkers();
    s.target = mapObjective();
  }
  if (s.showMini && s.chart) mapDrawMinimap();
  if (s.showCompass) mapDrawCompass();
}

// Runs every frame whatever the game is doing: draws the chart a little at a time, and the
// book map while it's open.
function mapTick() {
  requestAnimationFrame(mapTick);
  const s = mapState;
  const looking = game.state === 'book' && s.tab === 'map';
  if (s.painter) mapPaintFor(looking ? MAP.bookBudget : MAP.budget);
  if (game.state !== 'book' && game.state !== 'reader' && !$('book').classList.contains('hidden')) $('book').classList.add('hidden');
  // A page put away from the journal comes back to the book: refresh what's read.
  if (s.lastState === 'reader' && game.state === 'book') mapRefreshPage();
  s.lastState = game.state;
  const now = performance.now();
  if (looking && hasMap() && now - s.bookT > 30) { s.bookT = now; mapDrawBook(); }
}

/* ---------- Setup ---------- */
function mapOnKey(e) {
  if (game.state !== 'book' || e.repeat) return;
  const page = { KeyM: 'map', KeyJ: 'journal', KeyI: 'pack' }[e.code];
  const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  // These keys are the book's while it's open, so nothing behind it sees them (a key that
  // closes the book would otherwise reopen it).
  if (page) { stop(); if (page === mapState.tab) closeBook(); else mapShowTab(page); }
  else if (e.code === 'Tab') { stop(); closeBook(); }
  else if (e.code === 'Escape') { stop(); closeBook(true); }
  else if (mapState.tab === 'map' && hasMap()) {
    const b = mapState.book;
    if (['Equal', 'NumpadAdd'].includes(e.code)) { stop(); mapZoomAt(1.5, b.w / 2, b.h / 2); }
    if (['Minus', 'NumpadSubtract'].includes(e.code)) { stop(); mapZoomAt(1 / 1.5, b.w / 2, b.h / 2); }
    if (e.code === 'KeyC') { stop(); mapCentreOn(player.pos.x, player.pos.z, 2.5); }
  }
}

function mapBindBook() {
  const book = $('book'), canvas = $('map-canvas'), legend = $('map-legend');
  book.insertAdjacentHTML('beforeend', '<button class="book-close" aria-label="Close the field book" title="Close (Tab)">&times;</button>');
  $('book-map').insertAdjacentHTML('beforeend', `
    <div class="map-tools">
      <button class="map-btn" data-map="in" title="Zoom in (+)">+</button>
      <button class="map-btn" data-map="out" title="Zoom out (−)">&minus;</button>
      <button class="map-btn" data-map="me" title="Centre on her (C)">Find me</button>
      <button class="map-btn" data-map="all" title="The whole crater">Whole map</button>
    </div>
    <div class="map-none">
      <h3>No map yet</h3>
      <p>Jonas kept his charts in a flight bag behind the seats. If it was thrown clear like me, it can't have landed far from where I did.</p>
    </div>`);
  for (const button of book.querySelectorAll('.book-tabs [data-tab]')) button.setAttribute('role', 'tab');

  book.addEventListener('click', (e) => {
    if (game.state !== 'book') return;
    const tab = e.target.closest('[data-tab]');
    if (tab) { mapShowTab(tab.dataset.tab); return; }
    if (e.target.closest('.book-close')) { closeBook(); return; }
    // A click on the dark around the book puts it away; one on its cover doesn't.
    if (e.target === book) {
      const r = $(`book-${mapState.tab}`).getBoundingClientRect();
      if (e.clientX < r.left - 40 || e.clientX > r.right + 40 || e.clientY < r.top - 80 || e.clientY > r.bottom + 60) closeBook();
      return;
    }
    const control = e.target.closest('[data-map]');
    if (control) {
      const b = mapState.book, action = control.dataset.map;
      if (action === 'in') mapZoomAt(1.5, b.w / 2, b.h / 2);
      if (action === 'out') mapZoomAt(1 / 1.5, b.w / 2, b.h / 2);
      if (action === 'me') mapCentreOn(player.pos.x, player.pos.z, 2.5);
      if (action === 'all') { mapState.view.zoom = 1; mapClampView(); }
      if (action === 'clear') clearMapWaypoint();
      return;
    }
    const site = e.target.closest('[data-site]');
    if (site) {
      const s = siteById(site.dataset.site);
      const wp = mapState.waypoint;
      if (wp && Math.hypot(wp.x - s.x, wp.z - s.z) < 1) clearMapWaypoint();
      else { setMapWaypoint(s.x, s.z, mapSiteName(s)); mapCentreOn(s.x, s.z, 2.2); }
    }
  });
  legend.addEventListener('mouseover', (e) => {
    const site = e.target.closest('[data-site]');
    mapState.legendHover = site ? site.dataset.site : null;
  });
  legend.addEventListener('mouseleave', () => { mapState.legendHover = null; });

  // Drag to move the chart, click to mark it, scroll to zoom.
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const at = local(e);
    mapState.drag = { x: at.x, y: at.y, vx: mapState.view.x, vz: mapState.view.z, moved: false };
    if (canvas.setPointerCapture) mapSafe(() => canvas.setPointerCapture(e.pointerId));
  });
  canvas.addEventListener('pointermove', (e) => {
    const at = local(e), drag = mapState.drag;
    mapState.mouse = at;
    if (drag) {
      if (!drag.moved && Math.hypot(at.x - drag.x, at.y - drag.y) > 4) { drag.moved = true; canvas.classList.add('dragging'); }
      if (drag.moved && mapState.bookView) {
        mapState.view.x = drag.vx - (at.x - drag.x) / mapState.bookView.scale;
        mapState.view.z = drag.vz - (at.y - drag.y) / mapState.bookView.scale;
        if (mapState.view.zoom <= 1.001) mapState.view.zoom = 1.001;
        mapClampView();
      }
    }
    mapState.hover = mapHitAt(at.x, at.y);
    canvas.classList.toggle('over', !!mapState.hover);
  });
  canvas.addEventListener('pointerup', (e) => {
    const drag = mapState.drag;
    mapState.drag = null;
    canvas.classList.remove('dragging');
    if (drag && !drag.moved && e.button === 0) { const at = local(e); mapClickAt(at.x, at.y); }
  });
  canvas.addEventListener('pointerleave', () => { mapState.hover = mapState.mouse = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const at = local(e);
    mapZoomAt(Math.exp(-e.deltaY * 0.0016), at.x, at.y);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Listened for from the start, in the capture phase, so the open book hears its keys before
// the game's own handler does.
addEventListener('keydown', mapOnKey, true);

function initMap() {
  const s = mapState;
  s.dpr = Math.min(window.devicePixelRatio || 1, 2);
  s.chart = document.createElement('canvas');
  s.chart.width = s.chart.height = MAP.size;
  s.painter = mapPaintChart(s.chart.getContext('2d'));
  const mini = $('minimap');
  mini.width = mini.height = Math.round(MAP.miniSize * s.dpr);
  s.compass.canvas = document.createElement('canvas');
  $('compass').appendChild(s.compass.canvas);
  for (const id of ['minimap', 'compass']) $(id).addEventListener('animationend', () => $(id).classList.remove('arrive'));
  mapBindBook();
  addEventListener('resize', () => {
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    mini.width = mini.height = Math.round(MAP.miniSize * s.dpr);
    s.mini.t = -1e9;
    s.compass.w = 0;
    if (game.state === 'book' && s.tab === 'map' && hasMap()) mapSizeBook();
  });
  onGame('pickup', (id) => {
    if (typeof id === 'string' && id.startsWith('part:')) s.partsTaken.add(id.slice(5));
    s.hudT = 0;
  });
  onGame('siteDiscovered', (site) => { s.fresh.add(site.id); s.hudT = 0; });
  onGame('siteRevealed', (site) => { s.fresh.add(site.id); s.hudT = 0; });
  onGame('crimsonGone', (at) => { if (at) s.crimson = { x: at.x, z: at.z }; s.hudT = 0; });
  onGame('campfire', () => { s.hudT = 0; });
  onGame('revived', () => mapBreakTrail());
  requestAnimationFrame(mapTick);
}

function resetMap() {
  const s = mapState;
  s.trailHead = s.trailCount = 0;
  s.crumb.set = false;
  s.waypoint = s.crimson = s.target = null;
  s.partsTaken.clear();
  s.fresh.clear();
  s.hudMarkers = [];
  s.hudT = 0;
  Object.assign(s.view, { x: 0, z: 0, zoom: 1 });
  s.drag = s.hover = s.mouse = null;
  s.tab = 'map';
  s.showMini = s.showCompass = false;
  $('minimap').classList.add('hidden');
  $('compass').classList.add('hidden');
  if (game.state !== 'book') $('book').classList.add('hidden');
}
