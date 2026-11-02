// Player avatar: a shared rig, two skins, solid sculpted hair and cloth physics.
const ARM = { upper: 0.25, fore: 0.24, x: 0.135, y: 0.215 };
const SKINS = {
  teal: { name: 'Twin Tails', note: 'Long teal hair, tie and black sleeves' },
  crimson: { name: 'Crimson Curls', note: 'The original red-haired gunslinger' },
};
const SKIN_ORDER = ['teal', 'crimson'];

const outlineCache = new Map();
function outlineMaterial(thickness) {
  if (outlineCache.has(thickness)) return outlineCache.get(thickness);
  const material = new THREE.MeshBasicMaterial({ color: 0x0c1022, side: THREE.BackSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${thickness.toFixed(4)};`);
  };
  material.customProgramCacheKey = () => `outline${thickness}`;
  outlineCache.set(thickness, material);
  return material;
}

function addOutline(mesh, thickness = 0.0028) {
  const hull = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness));
  hull.frustumCulled = false;
  mesh.add(hull);
}

function piece(parent, geo, material, x = 0, y = 0, z = 0, outline = 0.0028) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  if (outline) addOutline(mesh, outline);
  parent.add(mesh);
  return mesh;
}

/* ---------- Physics ---------- */
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion();

function collide(p, colliders, pad) {
  for (const c of colliders) {
    v1.subVectors(p, c.p);
    const min = c.r + pad;
    const d2 = v1.lengthSq();
    if (d2 < min * min && d2 > 1e-8) p.copy(c.p).addScaledVector(v1, min / Math.sqrt(d2));
  }
  const ground = groundHeight(p.x, p.z) + 0.02;
  if (p.y < ground) p.y = ground;
}

// A verlet chain pinned to a point on the body, with a springy pull towards a rest shape.
class Chain {
  constructor(anchor, offset, { count, segment, rest, stiffness, damping = 0.95, gravity = -6, pad = 0.02, wind = 0.2, keepSide = 0 }) {
    Object.assign(this, { anchor, offset, count, segment, rest, stiffness, damping, gravity, pad, wind, keepSide });
    this.pos = Array.from({ length: count }, () => new THREE.Vector3());
    this.prev = Array.from({ length: count }, () => new THREE.Vector3());
    this.time = Math.random() * 10;
  }

  reset() {
    this.anchor.getWorldQuaternion(q1);
    this.anchor.localToWorld(this.pos[0].copy(this.offset));
    for (let i = 1; i < this.count; i++) {
      v2.copy(this.rest(i)).applyQuaternion(q1);
      this.pos[i].copy(this.pos[i - 1]).addScaledVector(v2, this.segment);
    }
    this.prev.forEach((p, i) => p.copy(this.pos[i]));
  }

  step(h, colliders) {
    this.time += h;
    const { pos, prev, count, segment } = this;
    this.anchor.localToWorld(v3.copy(this.offset));
    if (v3.distanceToSquared(pos[0]) > 4) { this.reset(); return; }
    pos[0].copy(v3);
    this.anchor.getWorldQuaternion(q1);
    // Centre of the head, which the side limit below measures from.
    const rootX = this.anchor.matrixWorld.elements[12], rootY = this.anchor.matrixWorld.elements[13], rootZ = this.anchor.matrixWorld.elements[14];
    const gust = Math.sin(this.time * 1.3) * this.wind + Math.sin(this.time * 3.7) * this.wind * 0.3;
    for (let i = 1; i < count; i++) {
      const p = pos[i], o = prev[i];
      const vx = (p.x - o.x) * this.damping, vy = (p.y - o.y) * this.damping, vz = (p.z - o.z) * this.damping;
      o.copy(p);
      p.x += vx + gust * h * h;
      p.y += vy + this.gravity * h * h;
      p.z += vz + gust * 0.5 * h * h;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < count; i++) {
        const stiff = this.stiffness(i);
        if (stiff > 0 && pass === 0) {
          v2.copy(this.rest(i)).applyQuaternion(q1);
          v3.copy(pos[i - 1]).addScaledVector(v2, segment);
          pos[i].lerp(v3, stiff);
        }
        v2.subVectors(pos[i], pos[i - 1]);
        const len = v2.length() || 1e-5;
        pos[i].copy(pos[i - 1]).addScaledVector(v2, segment / len);
        collide(pos[i], colliders, this.pad);
        // Each twin tail stays on its own side of the body, so they can't tangle.
        if (this.keepSide && i > 1) {
          v2.set(1, 0, 0).applyQuaternion(q1);
          const across = (pos[i].x - rootX) * v2.x + (pos[i].y - rootY) * v2.y + (pos[i].z - rootZ) * v2.z;
          const short = 0.03 - across * this.keepSide;
          if (short > 0) pos[i].addScaledVector(v2, short * this.keepSide);
        }
      }
    }
  }
}

function catmull(out, p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  out.x = 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3);
  out.z = 0.5 * (2 * p1.z + (p2.z - p0.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (3 * p1.z - p0.z - 3 * p2.z + p3.z) * t3);
  return out;
}

// One continuous sheet of hair or cloth with an elliptical cross-section, rebuilt
// along its chain each frame in world space.
class Ribbon {
  constructor(scene, chain, { width, thick, material, sideAxis = new THREE.Vector3(1, 0, 0), color = null, sides = 10, sub = 3, repeat = 3, outline = 0.0035 }) {
    Object.assign(this, { chain, width, thick, sideAxis, sides, sub });
    this.rows = (chain.count - 1) * sub + 1;
    const verts = this.rows * (sides + 1);
    this.position = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.normal = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    const uv = new Float32Array(verts * 2), colors = new Float32Array(verts * 3), index = [];
    for (let r = 0; r < this.rows; r++) {
      const t = r / (this.rows - 1);
      const c = color ? color(t) : [1, 1, 1];
      for (let s = 0; s <= sides; s++) {
        const i = r * (sides + 1) + s;
        uv.set([(s / sides) * 2, t * repeat], i * 2);
        colors.set(c, i * 3);
        if (r < this.rows - 1 && s < sides) {
          const a = i, b = i + 1, d = i + sides + 1, e = d + 1;
          index.push(a, b, d, b, e, d);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.position);
    geo.setAttribute('normal', this.normal);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(index);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    if (outline) addOutline(this.mesh, outline);
    scene.add(this.mesh);
    this.path = Array.from({ length: this.rows }, () => new THREE.Vector3());
  }

  sync() {
    const { chain, rows, sub, sides, path } = this;
    const pts = chain.pos, n = chain.count;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let s = 0; s < sub; s++) catmull(path[i * sub + s], p0, p1, p2, p3, s / sub);
    }
    path[rows - 1].copy(pts[n - 1]);

    chain.anchor.getWorldQuaternion(q1);
    const refSide = v3.copy(this.sideAxis).applyQuaternion(q1).clone();
    const tangent = new THREE.Vector3(), side = new THREE.Vector3(), face = new THREE.Vector3();
    const pa = this.position.array, na = this.normal.array;
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      tangent.subVectors(path[Math.min(rows - 1, r + 1)], path[Math.max(0, r - 1)]).normalize();
      side.copy(refSide).addScaledVector(tangent, -refSide.dot(tangent)).normalize();
      face.crossVectors(tangent, side);
      const w = Math.max(this.width(t), 0.0004), th = Math.max(this.thick(t), 0.0004);
      const c = path[r];
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        pa[k] = c.x + side.x * ca * w + face.x * sa * th;
        pa[k + 1] = c.y + side.y * ca * w + face.y * sa * th;
        pa[k + 2] = c.z + side.z * ca * w + face.z * sa * th;
        const nx = (side.x * ca) / w + (face.x * sa) / th;
        const ny = (side.y * ca) / w + (face.y * sa) / th;
        const nz = (side.z * ca) / w + (face.z * sa) / th;
        const len = Math.hypot(nx, ny, nz) || 1;
        na[k] = nx / len;
        na[k + 1] = ny / len;
        na[k + 2] = nz / len;
        k += 3;
      }
    }
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}

// A pleated skirt: each column is a short chain from the waist to the hem.
class Skirt {
  constructor(scene, hips, { columns = 18, y, waist, hem, length, material, body, trim, depth = 0.8 }) {
    Object.assign(this, { hips, columns, y, length });
    const mk = (radius, py) => Array.from({ length: columns }, (_, c) => {
      const a = (c / columns) * Math.PI * 2;
      return new THREE.Vector3(Math.sin(a) * radius, py, Math.cos(a) * radius * depth);
    });
    this.restWaist = mk(waist, y);
    this.restMid = mk(lerp(waist, hem, 0.56), y - length * 0.5);
    this.restHem = mk(hem, y - length);
    this.mid = this.restMid.map(() => new THREE.Vector3());
    this.hem = this.restHem.map(() => new THREE.Vector3());
    this.midPrev = this.restMid.map(() => new THREE.Vector3());
    this.hemPrev = this.restHem.map(() => new THREE.Vector3());
    this.waist = this.restWaist.map(() => new THREE.Vector3());
    this.seg = length * 0.52;
    this.neighbour = 2 * hem * Math.sin(Math.PI / columns) * 1.25;

    this.rowsV = [0, 0.5, 0.84, 0.842, 1];
    this.cols = columns * 2;
    const verts = this.cols * this.rowsV.length;
    this.position = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    const colors = new Float32Array(verts * 3), index = [];
    this.rowsV.forEach((v, r) => {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        colors.set(r >= 3 ? trim : body, i * 3);
        if (r < this.rowsV.length - 1) {
          const nc = (c + 1) % this.cols;
          index.push(i, (r + 1) * this.cols + c, r * this.cols + nc, r * this.cols + nc, (r + 1) * this.cols + c, (r + 1) * this.cols + nc);
        }
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.position);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(index);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  reset() {
    this.hips.updateWorldMatrix(true, false);
    const m = this.hips.matrixWorld;
    for (let c = 0; c < this.columns; c++) {
      this.waist[c].copy(this.restWaist[c]).applyMatrix4(m);
      this.mid[c].copy(this.restMid[c]).applyMatrix4(m);
      this.hem[c].copy(this.restHem[c]).applyMatrix4(m);
      this.midPrev[c].copy(this.mid[c]);
      this.hemPrev[c].copy(this.hem[c]);
    }
  }

  step(h, colliders) {
    const m = this.hips.matrixWorld;
    const legs = colliders.legs;
    v3.setFromMatrixPosition(m);
    if (v3.distanceToSquared(this.waist[0]) > 4) { this.reset(); return; }
    const verlet = (p, o, damping) => {
      const vx = (p.x - o.x) * damping, vy = (p.y - o.y) * damping, vz = (p.z - o.z) * damping;
      o.copy(p);
      p.x += vx;
      p.y += vy - 4 * h * h;
      p.z += vz;
    };
    for (let c = 0; c < this.columns; c++) {
      this.waist[c].copy(this.restWaist[c]).applyMatrix4(m);
      verlet(this.mid[c], this.midPrev[c], 0.88);
      verlet(this.hem[c], this.hemPrev[c], 0.9);
      this.mid[c].lerp(v2.copy(this.restMid[c]).applyMatrix4(m), 0.3);
      this.hem[c].lerp(v2.copy(this.restHem[c]).applyMatrix4(m), 0.2);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let c = 0; c < this.columns; c++) {
        const w = this.waist[c], a = this.mid[c], b = this.hem[c];
        v2.subVectors(a, w);
        a.copy(w).addScaledVector(v2, this.seg / (v2.length() || 1e-5));
        v2.subVectors(b, a);
        b.copy(a).addScaledVector(v2, this.seg / (v2.length() || 1e-5));
        const next = this.hem[(c + 1) % this.columns];
        v2.subVectors(next, b);
        const gap = v2.length();
        if (gap > this.neighbour) {
          const fix = (gap - this.neighbour) * 0.5 / gap;
          b.addScaledVector(v2, fix);
          next.addScaledVector(v2, -fix);
        }
        for (const leg of legs) {
          v2.subVectors(a, leg.p);
          const min = leg.r + 0.01;
          if (v2.lengthSq() < min * min) a.copy(leg.p).addScaledVector(v2, min / (v2.length() || 1));
          v2.subVectors(b, leg.p);
          if (v2.lengthSq() < min * min) b.copy(leg.p).addScaledVector(v2, min / (v2.length() || 1));
        }
      }
    }
  }

  sync() {
    const center = new THREE.Vector3().setFromMatrixPosition(this.hips.matrixWorld);
    const pa = this.position.array;
    const pW = new THREE.Vector3(), pM = new THREE.Vector3(), pH = new THREE.Vector3(), out = new THREE.Vector3();
    let k = 0;
    for (let r = 0; r < this.rowsV.length; r++) {
      const v = this.rowsV[r];
      const a = (1 - v) * (1 - v), b = 2 * v * (1 - v), d = v * v;
      for (let j = 0; j < this.cols; j++) {
        const f = j / 2;
        const c0 = Math.floor(f) % this.columns, c1 = (c0 + 1) % this.columns, t = f - Math.floor(f);
        pW.lerpVectors(this.waist[c0], this.waist[c1], t);
        pM.lerpVectors(this.mid[c0], this.mid[c1], t);
        pH.lerpVectors(this.hem[c0], this.hem[c1], t);
        out.set(0, 0, 0).addScaledVector(pW, a).addScaledVector(pM, b).addScaledVector(pH, d);
        // Alternating columns push in and out to form the pleats.
        v2.set(out.x - center.x, 0, out.z - center.z).normalize();
        out.addScaledVector(v2, (j % 2 ? 0.014 : -0.008) * (0.25 + v));
        pa[k++] = out.x;
        pa[k++] = out.y;
        pa[k++] = out.z;
      }
    }
    this.position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}

// Swings a rigid hanging shape from a short chain.
class Pendulum {
  constructor(group, chain) {
    Object.assign(this, { group, chain });
  }

  reset() { this.chain.reset(); }

  step(h, colliders) { this.chain.step(h, colliders); }

  sync() {
    const { pos, count, anchor } = this.chain;
    anchor.getWorldQuaternion(q1).invert();
    v2.subVectors(pos[count - 1], pos[0]).normalize().applyQuaternion(q1);
    this.group.quaternion.setFromUnitVectors(v3.set(0, -1, 0), v2);
  }

  dispose() {}
}

/* ---------- Solid hair shapes ---------- */
function addLock(builder, points, width, thick, sideRef = new THREE.Vector3(1, 0, 0), rings = 14, sides = 10, rootShade = 0.82) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const row = [];
  const tangent = new THREE.Vector3(), side = new THREE.Vector3(), face = new THREE.Vector3();
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const c = curve.getPoint(t);
    curve.getTangent(t, tangent);
    side.copy(sideRef).addScaledVector(tangent, -sideRef.dot(tangent)).normalize();
    face.crossVectors(tangent, side);
    const w = Math.max(width(t), 0.0004), th = Math.max(thick(t), 0.0004);
    const ring = [];
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      ring.push({
        p: c.clone().addScaledVector(side, ca * w).addScaledVector(face, sa * th),
        n: side.clone().multiplyScalar(ca / w).addScaledVector(face, sa / th).normalize(),
        u: s / sides,
        v: t * 1.2,
      });
    }
    row.push(ring);
  }
  for (let r = 0; r < rings; r++) {
    const shadeA = lerp(rootShade, 1.05, r / rings), shadeB = lerp(rootShade, 1.05, (r + 1) / rings);
    for (let s = 0; s < sides; s++) {
      const a = row[r][s], b = row[r][s + 1], c = row[r + 1][s], d = row[r + 1][s + 1];
      for (const [q, shade] of [[a, shadeA], [b, shadeA], [c, shadeB], [b, shadeA], [d, shadeB], [c, shadeB]]) {
        builder.addVertex(q.p, q.n, q.u, q.v, shade);
      }
    }
  }
}

// Closes at both ends so no open tube can show the dark outline inside it.
const pointed = (peak, at = 0.32) => (t) => {
  if (t < 0.06) return peak * lerp(0.08, 0.62, t / 0.06);
  return t < at ? peak * lerp(0.62, 1, (t - 0.06) / (at - 0.06)) : peak * Math.pow(1 - (t - at) / (1 - at), 0.72);
};

function addHairCap(head, hair, faceCenterY) {
  // A smooth skull cap: crown, and the back of the head down to the nape. It's an open
  // shell, so it shows hair on both sides and takes no outline that could peek out.
  const builder = new GeometryBuilder();
  const shape = (geo, sx, sy, sz, y, z) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    return [geo, m];
  };
  const parts = [
    shape(new THREE.SphereGeometry(0.121, 36, 16, 0, Math.PI * 2, 0, 1.2), 0.97, 1.03, 1.05, faceCenterY + 0.012, -0.004),
    shape(new THREE.SphereGeometry(0.12, 30, 12, 2.72, 3.98, 1.15, 1.15), 0.98, 1.05, 1.06, faceCenterY + 0.012, -0.004),
  ];
  for (const [geo, m] of parts) builder.addMesh(geo, m, 1);
  const material = hair.clone();
  material.side = THREE.DoubleSide;
  piece(head, builder.build(), material, 0, 0, 0, 0);
}

// The head is a sphere gently narrowed into a soft, rounded jaw.
const FACE_R = 0.112;
const jawAmount = (y) => (y < 0 ? Math.pow(Math.min(1, -y / FACE_R), 1.7) : 0);

function faceGeometry() {
  const geo = new THREE.SphereGeometry(FACE_R, 48, 36);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = jawAmount(y);
    pos.setXYZ(i, x * 0.94 * (1 - 0.4 * k), y * (1 + 0.1 * k), z * (1 - 0.24 * k) * (z > 0 ? 0.94 : 1));
  }
  geo.computeVertexNormals();
  return geo;
}

// Depth of the front of the face at a point, so features can lie right on the skin.
function faceDepth(x, y) {
  let y0 = y;
  for (let i = 0; i < 4 && y < 0; i++) y0 = y / (1 + 0.1 * jawAmount(y0));
  const k = jawAmount(y0);
  const x0 = x / (0.94 * (1 - 0.4 * k));
  return Math.sqrt(Math.max(0, FACE_R * FACE_R - x0 * x0 - y0 * y0)) * (1 - 0.24 * k) * 0.94;
}

// A small sheet draped over the face at (cx, cy), with optional tilt and bend.
function facePatch(width, height, cx, cy, { flip = false, tilt = 0, bend = 0, segments = 10 } = {}) {
  const geo = new THREE.PlaneGeometry(width, height, segments, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i);
    const x = cx + px * c - py * s;
    const y = cy + px * s + py * c + bend * px * px;
    pos.setXYZ(i, x, y, faceDepth(x, y) + 0.0013);
    if (flip) uv.setX(i, 1 - uv.getX(i));
  }
  geo.computeVertexNormals();
  return geo;
}

function buildFace(head, skin, eyeMap, centerY, { browColor, mouthColor, mouthBend }) {
  piece(head, faceGeometry(), skin, 0, centerY, 0, 0.0022);

  const features = new THREE.Group();
  features.position.y = centerY;
  head.add(features);
  const eyeMat = new THREE.MeshBasicMaterial({ map: eyeMap, alphaTest: 0.5, side: THREE.DoubleSide });
  const blushMat = new THREE.MeshBasicMaterial({ map: TEX.blush, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const browMat = new THREE.MeshBasicMaterial({ color: browColor, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    features.add(new THREE.Mesh(facePatch(0.056, 0.074, side * 0.047, -0.022, { flip: side < 0 }), eyeMat));
    features.add(new THREE.Mesh(facePatch(0.04, 0.024, side * 0.058, -0.061, { flip: side < 0, segments: 6 }), blushMat));
    // Thin brows, raised at the inner end for a soft, gentle look.
    features.add(new THREE.Mesh(facePatch(0.04, 0.0026, side * 0.047, 0.03, { tilt: side * -0.16, segments: 6 }), browMat));
  }
  // Barely-there nose and a small mouth.
  features.add(new THREE.Mesh(facePatch(0.006, 0.0028, 0, -0.054, { segments: 2 }), new THREE.MeshBasicMaterial({ color: 0xd2aca6, side: THREE.DoubleSide })));
  features.add(new THREE.Mesh(facePatch(0.019, 0.0021, 0, -0.08, { bend: mouthBend, segments: 6 }), new THREE.MeshBasicMaterial({ color: mouthColor, side: THREE.DoubleSide })));
}

// A full fringe: overlapping locks falling from the crown to just above the eyes.
function addFringe(builder, locks) {
  for (const [rootX, tipX, tipY, width] of locks) {
    const midX = lerp(rootX, tipX, 0.75);
    const surface = (x, y) => faceDepth(x, y - 0.075) + 0.019;
    addLock(builder, [
      [rootX * 0.4, 0.2, 0.035],
      [midX, 0.172, surface(midX, 0.15) + 0.004],
      [lerp(midX, tipX, 0.5), lerp(0.172, tipY, 0.6), surface(lerp(midX, tipX, 0.5), lerp(0.172, tipY, 0.6))],
      [tipX, tipY, surface(tipX, tipY) - 0.004],
    ], pointed(width, 0.3), pointed(0.012, 0.3), new THREE.Vector3(1, 0, 0.08), 14, 10, 0.9);
  }
}

/* ---------- Rig ---------- */
function buildRig() {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.79;
  root.add(hips);
  const chest = new THREE.Group();
  chest.position.y = 0.17;
  hips.add(chest);
  const head = new THREE.Group();
  head.position.y = 0.325;
  chest.add(head);
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  chest.add(holder);

  const leg = (x) => {
    const thigh = new THREE.Group();
    thigh.position.set(x, 0, 0);
    hips.add(thigh);
    const shin = new THREE.Group();
    shin.position.y = -0.39;
    thigh.add(shin);
    return { thigh, shin };
  };
  const arm = (side) => {
    const upper = new THREE.Group();
    upper.position.set(side * ARM.x, ARM.y, 0);
    chest.add(upper);
    const fore = new THREE.Group();
    fore.position.y = -ARM.upper;
    upper.add(fore);
    return { upper, fore, side };
  };
  const rig = { root, hips, chest, head, holder, legL: leg(0.076), legR: leg(-0.076), armL: arm(1), armR: arm(-1) };

  // Physics collision proxies.
  const proxy = (parent, x, y, z, r) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return { o, r, p: new THREE.Vector3() };
  };
  rig.proxies = [
    proxy(head, 0, 0.075, 0, 0.118),
    proxy(chest, 0, 0.13, 0, 0.12),
    proxy(chest, 0.135, 0.21, 0, 0.06),
    proxy(chest, -0.135, 0.21, 0, 0.06),
    proxy(hips, 0, 0.02, 0, 0.135),
  ];
  rig.legProxies = [
    proxy(rig.legL.thigh, 0, -0.1, 0.01, 0.088),
    proxy(rig.legL.thigh, 0, -0.27, 0.01, 0.07),
    proxy(rig.legR.thigh, 0, -0.1, 0.01, 0.088),
    proxy(rig.legR.thigh, 0, -0.27, 0.01, 0.07),
  ];
  return rig;
}

function addHand(fore, skin, nail) {
  const hand = piece(fore, new THREE.SphereGeometry(0.03, 12, 10), skin, 0, -ARM.fore - 0.012, 0, 0.002);
  hand.scale.set(0.72, 1.15, 1);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, 0.032, 3, 6), skin);
    finger.position.set((i - 1.5) * 0.0135, -0.042, 0.012);
    finger.rotation.x = 0.55;
    hand.add(finger);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 6, 5), nail);
    tip.position.y = -0.021;
    finger.add(tip);
  }
}

function standardLeg(leg, upperMat, lowerMat, shoeMat, band) {
  const split = -0.15;
  piece(leg.thigh, lathe([[0.064, 0.02], [0.067, split]], 14), upperMat);
  piece(leg.thigh, lathe([[0.067, split], [0.062, -0.28], [0.05, -0.39]], 14), lowerMat);
  if (band) piece(leg.thigh, new THREE.CylinderGeometry(0.0685, 0.0675, 0.024, 16), band, 0, split, 0, 0.002);
  piece(leg.shin, lathe([[0.05, 0], [0.054, -0.1], [0.042, -0.26], [0.034, -0.36]], 14), lowerMat);
  const shoe = piece(leg.shin, new THREE.SphereGeometry(0.052, 14, 10), shoeMat, 0, -0.375, 0.035);
  shoe.scale.set(0.78, 0.55, 1.72);
}

/* ---------- Skins ---------- */
function dressTeal(rig, scene) {
  const skin = new THREE.MeshStandardMaterial({ color: 0xfbe9e4, roughness: 0.6, emissive: 0x3a2e2c, emissiveIntensity: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xc5cbd6, roughness: 0.72, normalMap: TEX.cloth, normalScale: new THREE.Vector2(0.3, 0.3) });
  const black = new THREE.MeshStandardMaterial({ color: 0x14151e, roughness: 0.68, normalMap: TEX.cloth, normalScale: new THREE.Vector2(0.3, 0.3) });
  const teal = new THREE.MeshStandardMaterial({ color: 0x28a7c0, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc2a255, metalness: 0.9, roughness: 0.4 });
  const hair = new THREE.MeshStandardMaterial({ map: TEX.hairTeal, roughness: 0.42, vertexColors: true });
  const sims = [];
  const { chest, head, hips, armL, armR, legL, legR } = rig;

  standardLeg(legL, skin, black, black, teal);
  standardLeg(legR, skin, black, black, teal);
  // The hips stay inside the skirt so they can't poke through its pleats.
  piece(hips, lathe([[0.084, 0.17], [0.09, 0.05], [0.085, -0.04]], 16), black, 0, 0, 0, 0).scale.z = 0.72;

  // Fitted sleeveless blouse, with shoulders that run smoothly out to the arms.
  const torso = piece(chest, lathe([[0.083, -0.015], [0.08, 0.045], [0.104, 0.145], [0.112, 0.2], [0.08, 0.245], [0.042, 0.268]], 18), shirt);
  torso.scale.z = 0.72;
  piece(chest, lathe([[0.085, 0.018], [0.086, -0.012]], 18), teal, 0, 0, 0, 0.002).scale.z = 0.74;
  const yoke = piece(chest, new THREE.SphereGeometry(0.1, 18, 12), skin, 0, ARM.y - 0.004, -0.002, 0.0022);
  yoke.scale.set(1.5, 0.34, 0.54);
  for (const side of [-1, 1]) {
    const bust = piece(chest, new THREE.SphereGeometry(0.043, 12, 10), shirt, side * 0.04, 0.148, 0.05, 0);
    bust.scale.set(1, 0.92, 0.72);
    const collar = piece(chest, new THREE.BoxGeometry(0.056, 0.05, 0.006), shirt, side * 0.03, 0.255, 0.052);
    collar.rotation.set(-0.5, side * 0.45, side * -0.5);
  }
  piece(chest, lathe([[0.042, 0.23], [0.032, 0.34]], 12), skin, 0, 0, 0, 0.0016);

  // The tie is its own small piece of cloth.
  const tieChain = new Chain(chest, new THREE.Vector3(0, 0.25, 0.068), {
    count: 6, segment: 0.05, rest: () => new THREE.Vector3(0, -0.98, 0.12), stiffness: (i) => (i < 3 ? 0.5 : 0.3), pad: 0.012, damping: 0.9, wind: 0.15, gravity: -5,
  });
  const tieMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.52, vertexColors: true });
  sims.push({ chain: tieChain, ribbon: new Ribbon(scene, tieChain, {
    material: tieMat, sides: 6, sub: 2, outline: 0.0022,
    width: (t) => (t < 0.06 ? 0.014 : lerp(0.016, 0.033, Math.min(1, t * 1.3))) * (t > 0.86 ? (1 - t) / 0.14 + 0.02 : 1),
    thick: () => 0.0028,
    color: (t) => (t > 0.5 && t < 0.57 ? [0.02, 0.02, 0.03] : [0.05, 0.42, 0.53]),
  }) });

  // Bare upper arm, long detached sleeves flaring to the wrist.
  for (const arm of [armL, armR]) {
    piece(arm.upper, lathe([[0.04, 0.012], [0.041, -0.08], [0.03, -ARM.upper]], 12), skin);
    piece(arm.upper, new THREE.SphereGeometry(0.036, 12, 10), skin, 0, -0.002, 0, 0.0022);
    piece(arm.upper, lathe([[0.043, -0.075], [0.046, -0.14], [0.05, -ARM.upper]], 14), black);
    piece(arm.upper, new THREE.CylinderGeometry(0.046, 0.046, 0.012, 14), teal, 0, -0.078, 0, 0.002);
    piece(arm.fore, lathe([[0.03, 0], [0.024, -0.12], [0.022, -ARM.fore]], 12), skin);
    piece(arm.fore, lathe([[0.05, 0.012], [0.052, -0.08], [0.066, -0.17], [0.082, -ARM.fore + 0.03]], 16), new THREE.MeshStandardMaterial({ color: 0x14151e, roughness: 0.68, side: THREE.DoubleSide }));
    piece(arm.fore, new THREE.CylinderGeometry(0.084, 0.084, 0.016, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x28a7c0, roughness: 0.5, side: THREE.DoubleSide }), 0, -ARM.fore + 0.028, 0, 0);
    for (const s of [-1, 1]) piece(arm.fore, new THREE.BoxGeometry(0.0035, 0.19, 0.0035), gold, s * 0.05, -0.12, s * 0.028, 0).rotation.z = s * 0.15;
    addHand(arm.fore, skin, teal);
  }

  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74, vertexColors: true, side: THREE.DoubleSide });
  sims.push({ cloth: new Skirt(scene, hips, { y: 0.145, waist: 0.102, hem: 0.2, length: 0.255, material: skirtMat, body: [0.018, 0.019, 0.028], trim: [0.05, 0.4, 0.5] }) });

  // Face and sculpted hair.
  const centerY = 0.075;
  buildFace(head, skin, TEX.eyeTeal, centerY, { browColor: 0x1b7e96, mouthColor: 0x96555c, mouthBend: 0.4 });

  const static_ = new GeometryBuilder();
  addHairCap(head, hair, centerY);
  addFringe(static_, [
    [0.002, 0.003, 0.082, 0.024],
    [0.012, 0.03, 0.098, 0.027], [-0.012, -0.027, 0.096, 0.027],
    [0.024, 0.056, 0.093, 0.028], [-0.024, -0.054, 0.095, 0.028],
    [0.034, 0.08, 0.07, 0.024], [-0.034, -0.08, 0.072, 0.024],
  ]);
  // Back of the head falls in broad locks to the nape.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i - 5) * 0.31;
    const sx = Math.sin(a), cz = Math.cos(a);
    addLock(static_, [
      [sx * 0.07, 0.17, cz * 0.08],
      [sx * 0.118, 0.1, cz * 0.127],
      [sx * 0.112, 0.01, cz * 0.12],
      [sx * 0.09, -0.06 - (i % 2) * 0.03, cz * 0.1],
    ], pointed(0.05, 0.4), pointed(0.016, 0.4), new THREE.Vector3(cz, 0, -sx), 12, 8, 0.86);
  }
  const hairMesh = piece(head, static_.build(), hair, 0, 0, 0, 0.0028);
  hairMesh.frustumCulled = false;

  // Hair ties: dark blocks edged in pink, high on each side.
  const tieBlack = new THREE.MeshStandardMaterial({ color: 0x17161f, roughness: 0.45 });
  const tiePink = new THREE.MeshStandardMaterial({ color: 0xd6336b, roughness: 0.4, emissive: 0x6a1231, emissiveIntensity: 0.5 });
  for (const side of [-1, 1]) {
    const tie = piece(head, new THREE.BoxGeometry(0.03, 0.074, 0.044), tieBlack, side * 0.102, 0.178, -0.05, 0.002);
    tie.rotation.set(0.25, 0, side * -0.3);
    const edge = piece(tie, new THREE.BoxGeometry(0.008, 0.074, 0.046), tiePink, side * 0.018, 0, 0, 0);
    edge.castShadow = false;
  }

  // Twin tails: each one solid sheet from the tie down to the calf.
  for (const side of [-1, 1]) {
    const restTail = (i) => {
      const f = Math.min(1, (i - 1) / 3);
      return new THREE.Vector3(side * lerp(0.56, 0.06, f), lerp(0.08, -0.98, f), lerp(-0.5, -0.14, f)).normalize();
    };
    const chain = new Chain(head, new THREE.Vector3(side * 0.112, 0.17, -0.058), {
      count: 13, segment: 0.098, rest: restTail, stiffness: (i) => [0, 0.7, 0.55, 0.4, 0.28, 0.2, 0.15][i] || 0.11, pad: 0.03, damping: 0.92, gravity: -6, wind: 0.2, keepSide: side,
    });
    const flat = new THREE.Vector3(1, 0, 0);
    sims.push({ chain, ribbon: new Ribbon(scene, chain, {
      material: hair, sideAxis: flat, sides: 12, sub: 3, repeat: 2.4, outline: 0.0028,
      width: (t) => (t < 0.05 ? 0.027 : t < 0.32 ? lerp(0.03, 0.082, (t - 0.05) / 0.27) : 0.082 * Math.pow(1 - (t - 0.32) / 0.68, 0.72)),
      thick: (t) => lerp(0.028, 0.012, t) * (t > 0.9 ? (1 - t) * 10 + 0.05 : 1),
      color: (t) => { const s = lerp(0.84, 1.02, Math.min(1, t * 3)); return [s, s, s]; },
    }) });

    // Long side locks framing the face.
    const restLock = () => new THREE.Vector3(side * 0.02, -0.99, 0.08).normalize();
    const lock = new Chain(head, new THREE.Vector3(side * 0.103, 0.11, 0.042), {
      count: 7, segment: 0.058, rest: restLock, stiffness: (i) => (i < 3 ? 0.55 : 0.35), pad: 0.012, damping: 0.9, wind: 0.12, gravity: -5,
    });
    sims.push({ chain: lock, ribbon: new Ribbon(scene, lock, {
      material: hair, sideAxis: new THREE.Vector3(0, 0, 1), sides: 8, sub: 2, repeat: 1.2, outline: 0.0026,
      width: pointed(0.026, 0.25), thick: pointed(0.009, 0.25),
    }) });
  }
  return { sims, skin };
}

function dressCrimson(rig, scene) {
  const skin = new THREE.MeshStandardMaterial({ color: 0xfbe9e4, roughness: 0.6, emissive: 0x3a2e2c, emissiveIntensity: 0.75 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xd2d5e6, roughness: 0.75, normalMap: TEX.cloth, normalScale: new THREE.Vector2(0.3, 0.3) });
  const crimson = new THREE.MeshStandardMaterial({ color: 0xb3264d, roughness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xbd9f5e, metalness: 1, roughness: 0.35 });
  const hair = new THREE.MeshStandardMaterial({ map: TEX.hairCrimson, roughness: 0.42, vertexColors: true });
  const sims = [];
  const { chest, head, hips, armL, armR, legL, legR } = rig;

  standardLeg(legL, skin, skin, black);
  standardLeg(legR, skin, skin, black);
  piece(hips, lathe([[0.084, 0.17], [0.09, 0.05], [0.085, -0.04]], 16), black, 0, 0, 0, 0).scale.z = 0.72;

  const torso = piece(chest, lathe([[0.084, -0.015], [0.082, 0.045], [0.106, 0.145], [0.112, 0.2], [0.08, 0.245], [0.042, 0.268]], 18), cloth);
  torso.scale.z = 0.72;
  piece(chest, lathe([[0.042, 0.23], [0.032, 0.34]], 12), skin, 0, 0, 0, 0.0016);
  const yoke = piece(chest, new THREE.SphereGeometry(0.1, 18, 12), cloth, 0, ARM.y - 0.004, -0.002, 0.0022);
  yoke.scale.set(1.5, 0.34, 0.54);
  // A soft stand collar around the neck.
  const collar = piece(chest, new THREE.TorusGeometry(0.041, 0.012, 8, 20).rotateX(Math.PI / 2), crimson, 0, 0.268, 0, 0.002);
  collar.scale.z = 0.92;
  const strap = piece(chest, new THREE.BoxGeometry(0.014, 0.3, 0.006), black, 0, 0.13, 0.082, 0);
  strap.rotation.z = 0.62;
  for (const y of [0.05, 0.09, 0.13, 0.17]) {
    for (const x of [-0.026, 0.026]) piece(chest, new THREE.SphereGeometry(0.0058, 7, 5), brass, x, y, 0.078, 0);
  }

  for (const arm of [armL, armR]) {
    piece(arm.upper, lathe([[0.04, 0.012], [0.041, -0.08], [0.03, -ARM.upper]], 12), skin);
    piece(arm.upper, lathe([[0.048, 0.016], [0.05, -0.1]], 14), cloth);
    piece(arm.upper, new THREE.CylinderGeometry(0.052, 0.052, 0.02, 14), crimson, 0, -0.105, 0, 0.002);
    piece(arm.fore, lathe([[0.03, 0], [0.025, -0.12], [0.022, -ARM.fore]], 12), skin);
    piece(arm.fore, lathe([[0.03, -0.16], [0.03, -ARM.fore]], 12), black);
    addHand(arm.fore, skin, crimson);
  }

  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74, vertexColors: true, side: THREE.DoubleSide });
  sims.push({ cloth: new Skirt(scene, hips, { y: 0.145, waist: 0.102, hem: 0.22, length: 0.3, material: skirtMat, body: [0.62, 0.65, 0.78], trim: [0.42, 0.03, 0.09] }) });

  const centerY = 0.075;
  buildFace(head, skin, TEX.eyeRed, centerY, { browColor: 0x9c2a4e, mouthColor: 0x96555c, mouthBend: 2.5 });

  const static_ = new GeometryBuilder();
  addHairCap(head, hair, centerY);
  addFringe(static_, [
    [0.001, 0.001, 0.09, 0.028],
    [0.014, 0.038, 0.092, 0.032], [-0.014, -0.038, 0.09, 0.032],
    [0.03, 0.074, 0.074, 0.03], [-0.03, -0.074, 0.076, 0.03],
  ]);
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i - 5) * 0.31;
    const sx = Math.sin(a), cz = Math.cos(a);
    addLock(static_, [
      [sx * 0.07, 0.17, cz * 0.08],
      [sx * 0.12, 0.1, cz * 0.128],
      [sx * 0.112, 0.01, cz * 0.12],
      [sx * 0.08, -0.03, cz * 0.09],
    ], pointed(0.052, 0.4), pointed(0.016, 0.4), new THREE.Vector3(cz, 0, -sx), 12, 8, 0.86);
  }
  const hairMesh = piece(head, static_.build(), hair, 0, 0, 0, 0.0028);
  hairMesh.frustumCulled = false;

  // Twin ringlets: solid spirals that swing as a piece from each side of the head.
  for (const side of [-1, 1]) {
    const group = new THREE.Group();
    group.position.set(side * 0.112, 0.125, -0.022);
    const helix = [];
    const turns = 3.2, length = 0.28;
    for (let i = 0; i <= 44; i++) {
      const t = i / 44;
      const radius = lerp(0.05, 0.012, t);
      const a = t * turns * Math.PI * 2 * side;
      helix.push([Math.cos(a) * radius, -t * length, Math.sin(a) * radius]);
    }
    const spiral = new GeometryBuilder();
    // Both ends taper shut; the start also tucks into the side of the head.
    const coil = (t) => lerp(0.034, 0.012, t) * Math.min(1, 0.1 + t * 22) * (t > 0.97 ? (1 - t) / 0.03 + 0.03 : 1);
    addLock(spiral, helix, coil, coil, new THREE.Vector3(0.2, 1, 0.1).normalize(), 90, 10, 0.92);
    piece(group, spiral.build(), hair, 0, 0, 0, 0.0028);
    head.add(group);
    const chain = new Chain(head, group.position, {
      count: 3, segment: 0.1, rest: () => new THREE.Vector3(side * 0.08, -0.99, -0.02), stiffness: () => 0.3, pad: 0.03, damping: 0.9, gravity: -5, wind: 0.15,
    });
    sims.push({ cloth: new Pendulum(group, chain) });
  }
  return { sims, skin };
}

/* ---------- Avatar ---------- */
function createAvatar(scene, skinId) {
  const rig = buildRig();
  scene.add(rig.root);
  const dressed = (skinId === 'crimson' ? dressCrimson : dressTeal)(rig, scene);
  const colliders = rig.proxies;
  colliders.legs = rig.legProxies;

  const avatar = { ...rig, skinId, sims: dressed.sims };

  avatar.updateProxies = () => {
    for (const c of rig.proxies) c.o.getWorldPosition(c.p);
    for (const c of rig.legProxies) c.o.getWorldPosition(c.p);
  };

  avatar.reset = () => {
    rig.root.updateMatrixWorld(true);
    avatar.updateProxies();
    for (const sim of dressed.sims) {
      if (sim.chain) { sim.chain.reset(); sim.ribbon.sync(); } else { sim.cloth.reset(); sim.cloth.sync(); }
    }
  };

  avatar.simulate = (dt) => {
    rig.root.updateMatrixWorld(true);
    avatar.updateProxies();
    // A fixed step keeps the cloth stable at any frame rate; long hitches are simply skipped.
    const h = 1 / 120;
    avatar.accumulator = Math.min((avatar.accumulator || 0) + dt, h * 6);
    while (avatar.accumulator >= h) {
      avatar.accumulator -= h;
      for (const sim of dressed.sims) (sim.chain || sim.cloth).step(h, colliders);
    }
    for (const sim of dressed.sims) (sim.ribbon || sim.cloth).sync();
  };

  avatar.setVisible = (visible) => {
    rig.root.visible = visible;
    for (const sim of dressed.sims) (sim.ribbon || sim.cloth).mesh && ((sim.ribbon || sim.cloth).mesh.visible = visible);
  };

  avatar.dispose = () => {
    scene.remove(rig.root);
    for (const sim of dressed.sims) (sim.ribbon || sim.cloth).dispose(scene);
  };

  return avatar;
}

// Two-bone IK: places a hand at a target given in the chest's coordinates.
const ikDir = new THREE.Vector3(), ikPole = new THREE.Vector3(), ikElbow = new THREE.Vector3(), ikFore = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
function solveArm(arm, target, pole) {
  const a = ARM.upper, b = ARM.fore + 0.012;
  ikDir.subVectors(target, arm.upper.position);
  const len = THREE.MathUtils.clamp(ikDir.length(), Math.abs(a - b) + 0.002, a + b - 0.002);
  ikDir.normalize();
  const cosA = (a * a + len * len - b * b) / (2 * a * len);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  ikPole.copy(pole).addScaledVector(ikDir, -pole.dot(ikDir)).normalize();
  const upperDir = ikElbow.copy(ikDir).multiplyScalar(cosA).addScaledVector(ikPole, sinA);
  arm.upper.quaternion.setFromUnitVectors(DOWN, upperDir);
  const hand = ikFore.copy(ikDir).multiplyScalar(len).addScaledVector(upperDir, -a).normalize();
  q1.copy(arm.upper.quaternion).invert();
  arm.fore.quaternion.setFromUnitVectors(DOWN, hand.applyQuaternion(q1));
}
