// The survival outfit: the bodysuit from models/clothing, an open rugged jacket, cargo
// shorts and black tactical boots. The character models have no body under their own
// clothes, so the torso is rebuilt too. Everything here is shaped in game units in the
// bind pose (a T-pose, facing +Z), then moved into the model's own space.
const OUTFIT = {
  skinColor: 0xc4b2b5,
  hem: 0.72, // where the shorts end, level with the old outfit's hem
  jacketHem: 0.92,
  bootTop: 0.3,
};

// The torso's cross-section at each height: half width, half depth and the centre's z.
const TORSO = [
  [0.84, 0.150, 0.088, 0.008],
  [0.90, 0.140, 0.085, 0.008],
  [0.96, 0.112, 0.074, 0.008],
  [1.02, 0.100, 0.070, 0.008],
  [1.08, 0.108, 0.075, 0.010],
  [1.13, 0.112, 0.072, 0.000],
  [1.17, 0.100, 0.060, -0.018],
  [1.20, 0.055, 0.045, -0.025],
  [1.225, 0.040, 0.038, -0.025],
];

function torsoAt(y) {
  const rows = TORSO;
  if (y <= rows[0][0]) return { a: rows[0][1], b: rows[0][2], cz: rows[0][3] };
  for (let i = 1; i < rows.length; i++) {
    if (y <= rows[i][0]) {
      const t = smooth((y - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]));
      return { a: lerp(rows[i - 1][1], rows[i][1], t), b: lerp(rows[i - 1][2], rows[i][2], t), cz: lerp(rows[i - 1][3], rows[i][3], t) };
    }
  }
  const last = rows[rows.length - 1];
  return { a: last[1], b: last[2], cz: last[3] };
}

// Arm bones in the bind pose: shoulder, elbow and wrist along +X for the left arm.
const ARM = { shoulder: new THREE.Vector3(0.085, 1.17, -0.041), elbow: new THREE.Vector3(0.283, 1.167, -0.061), wrist: new THREE.Vector3(0.473, 1.168, -0.042) };
const LEG = { x: 0.083, z: 0.012 };
const SHIN = { knee: new THREE.Vector3(0.076, 0.481, 0.025), ankle: new THREE.Vector3(0.07, 0.102, -0.047) };

/* ---------- Building ---------- */
// Collects skinned vertices in game space. Each vertex carries up to four
// [bone, weight] pairs.
class Garment {
  constructor() { this.pos = []; this.uv = []; this.index = []; this.joints = []; this.weights = []; }

  vertex(p, u, v, skin) {
    const i = this.pos.length / 3;
    this.pos.push(p.x, p.y, p.z);
    this.uv.push(u, v);
    const pairs = skin.filter(([, w]) => w > 1e-4).slice(0, 4);
    const total = pairs.reduce((sum, [, w]) => sum + w, 0) || 1;
    for (let k = 0; k < 4; k++) {
      this.joints.push(pairs[k] ? pairs[k][0] : 0);
      this.weights.push(pairs[k] ? pairs[k][1] / total : 0);
    }
    return i;
  }

  // A grid of quads: `point(i, j)` returns [position, u, v, skin] for row i, column j.
  grid(rows, cols, point) {
    const start = this.pos.length / 3;
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) this.vertex(...point(i, j));
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = start + i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
        this.index.push(a, c, b, b, c, d);
      }
    }
  }

  // A box given its centre, three half-extent axes and one skin for all of it.
  box(center, ax, ay, az, skin, uvRect) {
    const corner = (sx, sy, sz) => center.clone().addScaledVector(ax, sx).addScaledVector(ay, sy).addScaledVector(az, sz);
    const [u0, v0, u1, v1] = uvRect;
    const face = (p0, p1, p2, p3) => {
      const i = this.vertex(p0, u0, v0, skin), j = this.vertex(p1, u1, v0, skin), k = this.vertex(p2, u1, v1, skin), l = this.vertex(p3, u0, v1, skin);
      this.index.push(i, j, k, i, k, l);
    };
    face(corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1));
    face(corner(1, -1, -1), corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1));
    face(corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1));
    face(corner(1, -1, 1), corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1));
    face(corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1), corner(-1, 1, -1));
    face(corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1));
  }

  // A finished geometry in the model's space, with soft light baked into vertex colours.
  build() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.joints, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.weights, 4));
    geometry.setIndex(this.index);
    return finishGeometry(geometry);
  }
}

const OUTFIT_LIGHT = new THREE.Vector3(0.3, 0.8, 0.5).normalize();
const gameToModel = modelToGame.clone().invert();

// Moves game-space geometry into model space and bakes shading into vertex colours, since
// the character materials are unlit.
function finishGeometry(geometry) {
  geometry.computeVertexNormals();
  const n = geometry.attributes.normal;
  const colors = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const light = Math.max(0, n.getX(i) * OUTFIT_LIGHT.x + n.getY(i) * OUTFIT_LIGHT.y + n.getZ(i) * OUTFIT_LIGHT.z);
    const shade = 0.62 + 0.38 * light;
    colors.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.applyMatrix4(gameToModel);
  return geometry;
}

function outfitMaterial(map, extra = {}) {
  return new THREE.MeshBasicMaterial({ map, vertexColors: true, side: THREE.DoubleSide, ...extra });
}

/* ---------- Textures ---------- */
function paintTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  draw(g, width, height, seededRandom(width * 7 + height));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // v runs down the canvas, as it does in the model files.
  texture.flipY = false;
  return texture;
}

// Grain, blotches of grime and worn patches over a base colour.
function weather(g, w, h, rand, base, grime, wear) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.35; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rand() * 0.05})`;
    g.fillRect(rand() * w, rand() * h, 1, 1 + rand() * 2);
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * w, y = rand() * h, r = 6 + rand() * 22;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rand() < 0.65 ? grime : wear);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function stitch(g, x0, y0, x1, y1, color) {
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.setLineDash([]);
}

let outfitMaterials = null;
function getOutfitMaterials() {
  if (outfitMaterials) return outfitMaterials;
  // Jacket: weathered olive canvas with seams, a darker zip edge and a stitched hem.
  const jacket = paintTexture(256, 256, (g, w, h, rand) => {
    weather(g, w, h, rand, '#545440', 'rgba(28,26,18,0.45)', 'rgba(150,140,110,0.25)');
    for (const x of [64, 128, 192]) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - 1, 0, 2, h); stitch(g, x + 3, 0, x + 3, h, 'rgba(200,190,150,0.35)'); }
    g.fillStyle = 'rgba(20,20,14,0.55)';
    g.fillRect(0, 0, 10, h);
    g.fillRect(w - 10, 0, 10, h);
    g.fillRect(0, h - 12, w, 12);
    stitch(g, 0, h - 16, w, h - 16, 'rgba(200,190,150,0.4)');
    // A couple of torn, frayed patches.
    for (let i = 0; i < 3; i++) {
      const x = 30 + rand() * (w - 60), y = 30 + rand() * (h - 80);
      g.fillStyle = 'rgba(25,22,16,0.7)';
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) g.lineTo(x + (rand() - 0.3) * 18, y + (rand() - 0.3) * 14);
      g.fill();
    }
  });
  // Shorts: dusty tactical grey-brown with a dark waistband and belt loops at the top.
  const shorts = paintTexture(256, 256, (g, w, h, rand) => {
    weather(g, w, h, rand, '#5a5244', 'rgba(30,26,20,0.4)', 'rgba(160,150,125,0.22)');
    g.fillStyle = '#2b2722';
    g.fillRect(0, 0, w, 22);
    for (let x = 12; x < w; x += 42) { g.fillStyle = '#3a342c'; g.fillRect(x, 0, 7, 30); }
    stitch(g, 0, 26, w, 26, 'rgba(210,200,170,0.35)');
    stitch(g, 0, h - 8, w, h - 8, 'rgba(210,200,170,0.35)');
    // The pocket patch, used by the cargo pockets: a flap over a pleated pouch.
    g.fillStyle = '#4d463a';
    g.fillRect(192, 160, 64, 96);
    g.fillStyle = '#3e382f';
    g.fillRect(192, 160, 64, 26);
    stitch(g, 196, 190, 252, 190, 'rgba(210,200,170,0.4)');
    stitch(g, 196, 164, 196, 250, 'rgba(210,200,170,0.3)');
    stitch(g, 252, 164, 252, 250, 'rgba(210,200,170,0.3)');
  });
  outfitMaterials = {
    skin: new THREE.MeshBasicMaterial({ color: OUTFIT.skinColor, vertexColors: true, side: THREE.DoubleSide }),
    jacket: outfitMaterial(jacket),
    shorts: outfitMaterial(shorts),
    boots: new THREE.MeshBasicMaterial({ color: 0x1c1c1f, vertexColors: true, side: THREE.DoubleSide }),
  };
  const bodysuitTexture = new THREE.TextureLoader().load(BODYSUIT_MODEL.texture);
  bodysuitTexture.colorSpace = THREE.SRGBColorSpace;
  bodysuitTexture.flipY = false;
  outfitMaterials.bodysuit = outfitMaterial(bodysuitTexture);
  return outfitMaterials;
}

/* ---------- Skinning ---------- */
function outfitBones(names) {
  const bone = (name) => names.indexOf(name);
  return {
    hips: bone('root.x'), chest: bone('spine_02.x'),
    thigh: { 1: bone('thigh_twist.l'), [-1]: bone('thigh_twist.r') },
    upper: { 1: bone('arm_stretch.l'), [-1]: bone('arm_stretch.r') },
    fore: { 1: bone('forearm_stretch.l'), [-1]: bone('forearm_stretch.r') },
  };
}

// The torso bends at the waist: hips below, chest above.
function torsoSkin(bones, y) {
  const t = THREE.MathUtils.smoothstep(y, 0.97, 1.06);
  return [[bones.hips, 1 - t], [bones.chest, t]];
}

// A point on the torso's surface, `out` metres outside it, at angle `theta` from the front.
function torsoPoint(y, theta, outX, outZ = outX) {
  const { a, b, cz } = torsoAt(y);
  return new THREE.Vector3(Math.sin(theta) * (a + outX), y, cz + Math.cos(theta) * (b + outZ));
}

/* ---------- Pieces ---------- */
function buildTorsoSkin(bones) {
  const g = new Garment();
  const y0 = 0.82, y1 = 1.23, rows = 24, cols = 28;
  g.grid(rows, cols, (i, j) => {
    const y = lerp(y0, y1, i / rows), theta = (j / cols) * Math.PI * 2;
    return [torsoPoint(y, theta, 0), j / cols, i / rows, torsoSkin(bones, y)];
  });
  return g.build();
}

function buildJacket(bones) {
  const g = new Garment();
  // Body: open down the front, loose over the bodysuit, ending at the hips.
  const open = 0.42, y0 = OUTFIT.jacketHem, y1 = 1.19, rows = 16, cols = 26;
  g.grid(rows, cols, (i, j) => {
    const y = lerp(y0, y1, i / rows);
    const theta = lerp(open, Math.PI * 2 - open, j / cols);
    const flare = (1 - i / rows) * 0.012;
    return [torsoPoint(y, theta, 0.024 + flare, 0.02 + flare), j / cols, 1 - i / rows, torsoSkin(bones, y)];
  });
  // Collar: stands up round the neck, open at the front.
  const collarRows = 3;
  g.grid(collarRows, cols, (i, j) => {
    const t = i / collarRows, y = lerp(1.18, 1.245, t);
    const theta = lerp(open + 0.15, Math.PI * 2 - open - 0.15, j / cols);
    const r = lerp(0.068, 0.078, t);
    return [new THREE.Vector3(Math.sin(theta) * r, y, -0.022 + Math.cos(theta) * (r - 0.006)), j / cols, 0.1 * t, [[bones.chest, 1]]];
  });
  // Sleeves: along each arm from inside the shoulder to the wrist, with a turned-up cuff.
  for (const side of [1, -1]) {
    const along = 18, around = 14;
    const start = 0.06, end = ARM.wrist.x - 0.02;
    g.grid(along, around, (i, j) => {
      const x = lerp(start, end, i / along);
      const t = (x - ARM.shoulder.x) / (ARM.elbow.x - ARM.shoulder.x);
      const axis = x < ARM.elbow.x
        ? ARM.shoulder.clone().lerp(ARM.elbow, Math.max(0, t))
        : ARM.elbow.clone().lerp(ARM.wrist, (x - ARM.elbow.x) / (ARM.wrist.x - ARM.elbow.x));
      const cuff = x > end - 0.04 ? 0.006 : 0;
      const r = (x < 0.13 ? lerp(0.06, 0.05, (x - start) / (0.13 - start)) : lerp(0.05, 0.04, (x - 0.13) / (end - 0.13))) + cuff;
      const angle = (j / around) * Math.PI * 2;
      const p = new THREE.Vector3(side * x, axis.y + Math.sin(angle) * r, axis.z + Math.cos(angle) * r);
      const shoulder = THREE.MathUtils.smoothstep(x, 0.07, 0.14), elbow = THREE.MathUtils.smoothstep(x, 0.26, 0.31);
      const skin = [[bones.chest, 1 - shoulder], [bones.upper[side], shoulder * (1 - elbow)], [bones.fore[side], shoulder * elbow]];
      return [p, j / around, i / along, skin];
    });
  }
  return g.build();
}

function buildShorts(bones) {
  const g = new Garment();
  const cols = 26;
  // Seat and waist, from the waistband down past where the legs split, closed underneath
  // so no skin shows between the legs.
  const y0 = 0.81, y1 = 0.99, rows = 10;
  const seatPoint = (y, theta) => {
    const seat = 1 - THREE.MathUtils.smoothstep(y, 0.88, 0.94);
    return torsoPoint(y, theta, 0.014 + seat * 0.014, 0.014 + seat * 0.008);
  };
  g.grid(rows, cols, (i, j) => {
    const y = lerp(y0, y1, i / rows), theta = (j / cols) * Math.PI * 2;
    return [seatPoint(y, theta), j / cols, 1 - i / rows, torsoSkin(bones, y)];
  });
  const middle = g.vertex(new THREE.Vector3(0, y0, torsoAt(y0).cz), 0.5, 0.95, [[bones.hips, 1]]);
  const rim = [];
  for (let j = 0; j <= cols; j++) rim.push(g.vertex(seatPoint(y0, (j / cols) * Math.PI * 2), j / cols, 0.9, [[bones.hips, 1]]));
  for (let j = 0; j < cols; j++) g.index.push(middle, rim[j + 1], rim[j]);
  // Legs: loose tubes round each thigh down to the hem, riding with the thighs.
  for (const side of [1, -1]) {
    const legRows = 8;
    g.grid(legRows, cols, (i, j) => {
      const y = lerp(OUTFIT.hem, 0.88, i / legRows), theta = (j / cols) * Math.PI * 2;
      const grow = i / legRows;
      const a = lerp(0.088, 0.096, grow), b = lerp(0.094, 0.1, grow);
      const p = new THREE.Vector3(side * LEG.x + Math.sin(theta) * a, y, LEG.z + Math.cos(theta) * b);
      const hip = THREE.MathUtils.smoothstep(y, 0.84, 0.92);
      return [p, j / cols, 0.25 + (1 - grow) * 0.7, [[bones.thigh[side], 1 - hip], [bones.hips, hip]]];
    });
    // A cargo pocket on the outside of each thigh.
    const center = new THREE.Vector3(side * (LEG.x + 0.098), 0.785, LEG.z);
    g.box(center, new THREE.Vector3(0.012, 0, 0), new THREE.Vector3(0, 0.038, 0), new THREE.Vector3(0, 0, 0.034), [[bones.thigh[side], 1]], [0.75, 0.62, 1, 1]);
  }
  return g.build();
}

// Boots are shaped from the feet and shins themselves, pushed out a little, so they fit
// exactly and bend with the ankles. The sole sticks out further for a heavy tread.
function buildBoots(bodyParts) {
  const top = OUTFIT.bootTop / MODEL_SCALE;
  const pos = [], joints = [], weights = [];
  const normals = new Map();
  const key = (x, y, z) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const tris = [];
  for (const part of bodyParts) {
    const { geometry } = part;
    const p = geometry.attributes.position, index = geometry.index.array;
    for (let t = 0; t < index.length; t += 3) {
      const [i, j, k] = [index[t], index[t + 1], index[t + 2]];
      if ((p.getY(i) + p.getY(j) + p.getY(k)) / 3 > top) continue;
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, j); c.fromBufferAttribute(p, k);
      n.subVectors(c, b).cross(a.clone().sub(b));
      for (const v of [a, b, c]) {
        const id = key(v.x, v.y, v.z);
        normals.set(id, (normals.get(id) || new THREE.Vector3()).add(n));
      }
      tris.push([geometry, i, j, k]);
    }
  }
  // Smooth normals point outward from the leg's centre, whichever way the faces wind: the
  // shin bone above the ankle, and the middle of the foot below it.
  const legCenter = (v) => {
    const game = v.clone().applyMatrix4(modelToGame);
    const side = Math.sign(game.x);
    if (game.y < 0.1) return new THREE.Vector3(side * 0.072, 0.05, 0.015).applyMatrix4(gameToModel);
    const t = (game.y - SHIN.ankle.y) / (SHIN.knee.y - SHIN.ankle.y);
    return new THREE.Vector3(side * lerp(SHIN.ankle.x, SHIN.knee.x, t), game.y, lerp(SHIN.ankle.z, SHIN.knee.z, t)).applyMatrix4(gameToModel);
  };
  for (const [geometry, ...corners] of tris) {
    const p = geometry.attributes.position, si = geometry.attributes.skinIndex, sw = geometry.attributes.skinWeight;
    const scale = sw.normalized ? (sw.array instanceof Uint8Array ? 255 : 65535) : 1;
    for (const i of corners) {
      a.fromBufferAttribute(p, i);
      const normal = normals.get(key(a.x, a.y, a.z)).clone().normalize();
      if (normal.dot(a.clone().sub(legCenter(a))) < 0) normal.negate();
      const y = a.y * MODEL_SCALE;
      const push = (0.011 + (y < 0.03 ? 0.008 : 0) + (y > OUTFIT.bootTop - 0.03 ? 0.004 : 0)) / MODEL_SCALE;
      a.addScaledVector(normal, push);
      if (y < 0.012) a.y -= 0.006 / MODEL_SCALE;
      pos.push(a.x, a.y, a.z);
      for (let k = 0; k < 4; k++) { joints.push(si.array[i * 4 + k]); weights.push(sw.array[i * 4 + k] / scale); }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(joints, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.computeVertexNormals();
  // Scuffs and a dark sole, baked into the colours along with the light.
  const colors = new Float32Array(pos.length);
  const rand = seededRandom(77);
  const nrm = geometry.attributes.normal;
  for (let i = 0; i < pos.length / 3; i++) {
    const light = Math.max(0, nrm.getX(i) * OUTFIT_LIGHT.x + nrm.getY(i) * OUTFIT_LIGHT.y + nrm.getZ(i) * OUTFIT_LIGHT.z);
    const y = pos[i * 3 + 1] * MODEL_SCALE;
    let shade = (0.75 + 0.5 * light) * (y < 0.03 ? 0.55 : 1) * (rand() < 0.12 ? 1.6 : 1);
    if (y > OUTFIT.bootTop - 0.03 && y < OUTFIT.bootTop - 0.015) shade *= 0.6;
    colors.set([shade, shade * 0.97, shade * 0.95], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// The bodysuit from its own file, wrapped onto the rebuilt torso: its height maps from
// crotch to chest, and each point is pushed round onto the torso's surface.
function buildBodysuit(bones) {
  const decode = (b64, Type) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    return new Type(bytes.buffer);
  };
  const src = decode(BODYSUIT_MODEL.positions, Float32Array);
  const uvs = decode(BODYSUIT_MODEL.uvs, Float32Array);
  const index = decode(BODYSUIT_MODEL.indices, Uint32Array);
  // The file stands Z up with its front towards -Y.
  let minH = Infinity, maxH = -Infinity, minD = Infinity, maxD = -Infinity, maxW = 0;
  for (let i = 0; i < src.length; i += 3) {
    minH = Math.min(minH, src[i + 2]); maxH = Math.max(maxH, src[i + 2]);
    minD = Math.min(minD, -src[i + 1]); maxD = Math.max(maxD, -src[i + 1]);
    maxW = Math.max(maxW, Math.abs(src[i]));
  }
  const midD = (minD + maxD) / 2, halfD = (maxD - minD) / 2;
  const g = new Garment();
  for (let i = 0; i < src.length; i += 3) {
    const y = lerp(0.83, 1.15, (src[i + 2] - minH) / (maxH - minH));
    const theta = Math.atan2(src[i] / maxW, (-src[i + 1] - midD) / halfD);
    g.vertex(torsoPoint(y, theta, 0.004), uvs[(i / 3) * 2], uvs[(i / 3) * 2 + 1], torsoSkin(bones, Math.max(y, 0.86)));
  }
  g.index = Array.from(index);
  return g.build();
}

// Swaps the model's own clothes for the survival outfit.
function dressForSurvival(parts, names) {
  const bones = outfitBones(names);
  const materials = getOutfitMaterials();
  const body = parts.filter((p) => !p.isHair && !p.isCloth);
  const boots = buildBoots(body);
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].isCloth) parts.splice(i, 1);
  parts.push(
    { geometry: buildTorsoSkin(bones), material: materials.skin, isHair: false, isCloth: false, isOutfit: true },
    { geometry: buildBodysuit(bones), material: materials.bodysuit, isHair: false, isCloth: false, isOutfit: true },
    { geometry: buildShorts(bones), material: materials.shorts, isHair: false, isCloth: true, isOutfit: true },
    { geometry: buildJacket(bones), material: materials.jacket, isHair: false, isCloth: false, isOutfit: true },
    { geometry: boots, material: materials.boots, isHair: false, isCloth: false, isOutfit: true },
  );
}
