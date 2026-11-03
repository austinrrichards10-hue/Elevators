// Player avatar: the imported character models, driven by the game's own rig.
// "Doomer Miku and Teto" by 0x00001337 (CC-BY-4.0). See the README for the full credit.
const SKINS = {
  teal: { name: 'Twin Tails', note: 'Blue-haired, long twin tails', file: 'CHARACTER_GLB', skin: 0, hair: { k: 0.000317, x: 0.0088, y: -0.102, z: 0.071, sharedNode: 31, pieces: { 'Hair_004.001_Gradient_0': { scale: 0.706, offset: [0.0126, 0.457, -0.497] } } }, scalpTrim: 0.14 },
  crimson: { name: 'Crimson Curls', note: 'Red-haired, twin ringlets', file: 'CHARACTER_GLB', skin: 1, hair: { k: 0.000197, x: 0.004, y: 0.0, z: 0.015 }, scalpTrim: 0.2 },
};
// The skins you can play as. Crimson Curls isn't one: she's another survivor, found at the crash site.
const SKIN_ORDER = ['teal'];

// The model's bind pose to game space: feet on the ground, centred, facing +Z.
const MODEL_SCALE = 0.9375;
const MODEL_CENTER = new THREE.Vector3(0.0235, 0, -1.07);
const modelToGame = new THREE.Matrix4().makeScale(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE)
  .multiply(new THREE.Matrix4().makeTranslation(-MODEL_CENTER.x, -MODEL_CENTER.y, -MODEL_CENTER.z));

const modelFiles = new Map();
const skinCache = new Map();

/* ---------- Physics ---------- */
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
// How far a chain's anchor may move between steps before the chain is helped along. A jump
// past `reset` (a teleport, a revive, a scene placing her by hand) lands it in its rest shape;
// past `carry` (very fast moderator movement) the excess is carried along whole, so it can't
// whip the hair out sideways. `slack` is how far past its own length any point may end up
// from the anchor before the chain counts as broken and snaps back.
const HAIR_CATCH = { reset: 2, carry: 0.6, slack: 0.5 };

function collide(p, colliders, pad) {
  for (const c of colliders) {
    v1.subVectors(p, c.p);
    const min = c.r + pad;
    const d2 = v1.lengthSq();
    if (d2 < min * min && d2 > 1e-8) p.copy(c.p).addScaledVector(v1, min / Math.sqrt(d2));
  }
  const ground = groundHeight(p.x, p.z) + 0.02;
  if (p.y < ground && p.y > ground - 3) p.y = ground;
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

  // Keeps the chain on its anchor however far the head moved since the last step. Returns
  // true when the chain had to be reset. Leaves the anchor's world position in v3.
  catchUp() {
    const { pos, prev, count } = this;
    this.anchor.localToWorld(v3.copy(this.offset));
    const jump = v3.distanceTo(pos[0]);
    // Written so a NaN anywhere also resets.
    if (!(jump <= HAIR_CATCH.reset) || !this.intact(pos[0])) {
      this.reset();
      this.anchor.localToWorld(v3.copy(this.offset));
      return true;
    }
    if (jump > HAIR_CATCH.carry) {
      v2.subVectors(v3, pos[0]).multiplyScalar(1 - HAIR_CATCH.carry / jump);
      for (let i = 0; i < count; i++) { pos[i].add(v2); prev[i].add(v2); }
    }
    return false;
  }

  // Every point finite and within the chain's length (plus slack) of `root`.
  intact(root) {
    const reach = (this.count - 1) * this.segment + HAIR_CATCH.slack;
    const limit = reach * reach;
    for (const p of this.pos) {
      const d2 = p.distanceToSquared(root);
      if (!(d2 <= limit)) return false;
    }
    return true;
  }

  // Pulls the chain after its anchor without advancing time: for frames too short for a
  // physics step, so the tails never lag a frame behind the head.
  follow(colliders) {
    if (this.catchUp()) return;
    const { pos, count, segment } = this;
    pos[0].copy(v3);
    for (let i = 1; i < count; i++) {
      v2.subVectors(pos[i], pos[i - 1]);
      const len = v2.length() || 1e-5;
      pos[i].copy(pos[i - 1]).addScaledVector(v2, segment / len);
      collide(pos[i], colliders, this.pad);
    }
  }

  step(h, colliders) {
    this.time += h;
    const { pos, prev, count, segment } = this;
    if (this.catchUp()) return;
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

/* ---------- Loading the model ---------- */
// Hair was exported at another scale, so it's fitted back onto the head.
function meshTransform(file, nodeIndex, hairFit, isHair) {
  const { nodes } = file.json;
  let own = null;
  for (let i = nodeIndex - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.matrix && n.mesh === undefined && !n.children) { own = new THREE.Matrix4().fromArray(n.matrix); break; }
  }
  if (!own) return null;
  if (isHair) {
    // Pieces of one hairstyle must share a transform, or they drift apart on the head.
    const base = hairFit.sharedNode ? new THREE.Matrix4().fromArray(nodes[hairFit.sharedNode].matrix) : own;
    return new THREE.Matrix4().makeTranslation(hairFit.x, hairFit.y, hairFit.z)
      .multiply(new THREE.Matrix4().makeScale(hairFit.k, hairFit.k, hairFit.k))
      .multiply(base);
  }
  const rig = new THREE.Matrix4().fromArray(nodes[19].matrix);
  return rig.invert().multiply(own);
}

// Pulls in the top of the skull, which is hidden under the hair, so it can't poke through.
function trimScalp(geometry, amount) {
  const pos = geometry.attributes.position;
  const center = new THREE.Vector3(MODEL_CENTER.x, 1.46, MODEL_CENTER.z);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const blend = THREE.MathUtils.smoothstep(p.y, 1.44, 1.52);
    if (blend <= 0) continue;
    p.sub(center).multiplyScalar(1 - amount * blend).add(center);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
}

// Below the hips, clothing rides with the thighs, so legs can't swing out through it.
function fitClothToLegs(parts, names) {
  const hips = names.indexOf('root.x');
  const thighL = names.indexOf('thigh_twist.l'), thighR = names.indexOf('thigh_twist.r');
  for (const part of parts) {
    if (part.isHair || !part.isCloth) continue;
    const { geometry } = part;
    const pos = geometry.attributes.position;
    const oldIndex = geometry.attributes.skinIndex, oldWeight = geometry.attributes.skinWeight;
    const scale = oldWeight.normalized ? (oldWeight.array instanceof Uint8Array ? 255 : 65535) : 1;
    const indices = new Uint16Array(pos.count * 4), weights = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const legShare = 1 - THREE.MathUtils.smoothstep(pos.getY(i), 0.88, 0.99);
      for (let k = 0; k < 4; k++) {
        indices[i * 4 + k] = oldIndex.array[i * 4 + k];
        weights[i * 4 + k] = oldWeight.array[i * 4 + k] / scale;
      }
      if (legShare <= 0) continue;
      const left = THREE.MathUtils.clamp((pos.getX(i) - MODEL_CENTER.x + 0.022) / 0.044, 0, 1);
      // A little ease around the leg, so the fabric stays clear of the skin as it moves.
      const ease = 0.011 * legShare;
      const offX = pos.getX(i) - MODEL_CENTER.x, offZ = pos.getZ(i) - MODEL_CENTER.z;
      const offLength = Math.hypot(offX, offZ) || 1;
      pos.setX(i, pos.getX(i) + (offX / offLength) * ease);
      pos.setZ(i, pos.getZ(i) + (offZ / offLength) * ease);
      indices[i * 4] = hips;
      indices[i * 4 + 1] = thighL;
      indices[i * 4 + 2] = thighR;
      indices[i * 4 + 3] = 0;
      weights[i * 4] = 1 - legShare;
      weights[i * 4 + 1] = legShare * left;
      weights[i * 4 + 2] = legShare * (1 - left);
      weights[i * 4 + 3] = 0;
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  }
}

// Skin the clothing covers is never seen, but it can poke through when the legs swing.
// Removing the triangles above the hem, all the way around the hips, leaves nothing to clip.
function removeSkinUnderCloth(parts) {
  const sectors = 16;
  const hem = new Array(sectors).fill(Infinity);
  const sectorOf = (x, z) => Math.floor(((Math.atan2(x - MODEL_CENTER.x, z - MODEL_CENTER.z) + Math.PI) / (Math.PI * 2)) * sectors) % sectors;
  for (const part of parts) {
    if (!part.isCloth) continue;
    const pos = part.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 1 || Math.abs(pos.getX(i) - MODEL_CENTER.x) > 0.25) continue;
      const s = sectorOf(pos.getX(i), pos.getZ(i));
      hem[s] = Math.min(hem[s], y);
    }
  }
  for (const part of parts) {
    if (part.isCloth || part.isHair) continue;
    const { geometry } = part;
    const pos = geometry.attributes.position;
    const index = geometry.index.array;
    const covered = (v) => {
      const x = pos.getX(v);
      if (Math.abs(x - MODEL_CENTER.x) > 0.25) return false;
      const y = pos.getY(v);
      return y < 1.05 && y > hem[sectorOf(x, pos.getZ(v))] + 0.018;
    };
    const kept = [];
    for (let t = 0; t < index.length; t += 3) {
      if (!(covered(index[t]) && covered(index[t + 1]) && covered(index[t + 2]))) kept.push(index[t], index[t + 1], index[t + 2]);
    }
    if (kept.length !== index.length) geometry.setIndex(kept);
  }
}

function makeMaterial(file, index) {
  const def = file.json.materials[index];
  const pbr = def.pbrMetallicRoughness || {};
  const params = { side: THREE.DoubleSide };
  if (pbr.baseColorTexture) params.map = file.texture(pbr.baseColorTexture.index);
  return new THREE.MeshBasicMaterial(params);
}

function loadSkinData(skinId) {
  if (skinCache.has(skinId)) return skinCache.get(skinId);
  const def = SKINS[skinId];
  if (!modelFiles.has(def.file)) modelFiles.set(def.file, readGlb(window[def.file]));
  const file = modelFiles.get(def.file);
  const { json } = file;
  const skin = json.skins[def.skin];
  const inverses = file.accessor(skin.inverseBindMatrices).array;
  const names = skin.joints.map((n) => json.nodes[n].name.replace(/_\d+$/, ''));
  const materials = new Map();
  const parts = [];

  json.nodes.forEach((node, nodeIndex) => {
    if (node.skin !== def.skin || node.mesh === undefined) return;
    const mesh = json.meshes[node.mesh];
    const isHair = /^Hair/.test(mesh.name);
    for (const primitive of mesh.primitives) {
      const geometry = file.geometry(primitive);
      const transform = meshTransform(file, nodeIndex, def.hair, isHair);
      if (transform) geometry.applyMatrix4(transform);
      // Some pieces were exported out of place; these line them up with their anchors.
      const piece = isHair && def.hair.pieces && def.hair.pieces[mesh.name];
      if (piece) {
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(...piece.offset)
          .multiply(new THREE.Matrix4().makeScale(piece.scale, piece.scale, piece.scale)));
      }
      if (def.scalpTrim && !isHair) trimScalp(geometry, def.scalpTrim);
      if (!materials.has(primitive.material)) materials.set(primitive.material, makeMaterial(file, primitive.material));
      // Shirts, shorts and skirts, by their material names in the file.
      const isCloth = !isHair && /Shirt|Cloth|Gradient/.test(json.materials[primitive.material].name);
      parts.push({ geometry, material: materials.get(primitive.material), isHair, isCloth });
    }
  });

  removeSkinUnderCloth(parts);
  fitClothToLegs(parts, names);
  addBoots(parts);

  // Which bones actually move vertices, so only those are updated each frame.
  const usedBones = new Set();
  for (const { geometry } of parts) {
    const joints = geometry.attributes.skinIndex.array, weights = geometry.attributes.skinWeight;
    for (let i = 0; i < joints.length; i++) if (weights.array[i] > 0) usedBones.add(joints[i]);
  }
  const data = { parts, names, inverses, usedBones: [...usedBones], jointCount: skin.joints.length };
  data.joint = (name) => {
    const m = new THREE.Matrix4().fromArray(inverses, names.indexOf(name) * 16).invert();
    return new THREE.Vector3().setFromMatrixPosition(m).applyMatrix4(modelToGame);
  };
  if (skinId === 'teal') data.tails = buildTailBones(data);
  skinCache.set(skinId, data);
  return data;
}

// The hair has no bones of its own. Long tails get generated ones: vertices below the
// shoulders are weighted along a chain per side, blending into the head higher up.
function buildTailBones(data) {
  const hair = data.parts.filter((p) => p.isHair);
  const point = new THREE.Vector3();
  const count = 10;
  const top = 1.13;
  const toGame = (attr, i) => point.fromBufferAttribute(attr, i).applyMatrix4(modelToGame);
  let low = top;
  for (const { geometry } of hair) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) low = Math.min(low, toGame(pos, i).y);
  }
  const span = (top - low) / (count - 1);

  // The rest path of each tail follows the centre of its vertices, band by band.
  const paths = [-1, 1].map((side) => {
    const sums = Array.from({ length: count }, () => ({ x: 0, z: 0, n: 0 }));
    for (const { geometry } of hair) {
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const p = toGame(pos, i);
        if (Math.sign(p.x) !== side || p.y > top) continue;
        const band = sums[Math.min(count - 1, Math.round((top - p.y) / span))];
        band.x += p.x; band.z += p.z; band.n++;
      }
    }
    let last = { x: side * 0.16, z: -0.1 };
    return sums.map((s, i) => {
      if (s.n) last = { x: s.x / s.n, z: s.z / s.n };
      return new THREE.Vector3(last.x, top - i * span, last.z);
    });
  });

  const firstBone = data.jointCount;
  for (const part of hair) {
    const { geometry } = part;
    const pos = geometry.attributes.position;
    const indices = new Uint16Array(pos.count * 4), weights = new Float32Array(pos.count * 4);
    const headBone = data.names.indexOf('head.x');
    for (let i = 0; i < pos.count; i++) {
      const p = toGame(pos, i);
      const fade = THREE.MathUtils.smoothstep(top + 0.12 - p.y, 0, 0.18);
      indices[i * 4] = headBone;
      weights[i * 4] = 1 - fade;
      if (fade > 0) {
        const side = p.x < 0 ? 0 : 1;
        const f = THREE.MathUtils.clamp((top - p.y) / span, 0, count - 1);
        const a = Math.floor(f), b = Math.min(count - 1, a + 1), t = f - a;
        indices[i * 4 + 1] = firstBone + side * count + a;
        indices[i * 4 + 2] = firstBone + side * count + b;
        weights[i * 4 + 1] = fade * (1 - t);
        weights[i * 4 + 2] = fade * t;
      }
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  }
  return { paths, count, firstBone };
}

/* ---------- Rig ---------- */
const FINGERS = ['index', 'middle', 'ring', 'pinky'];

function buildRig(data) {
  const j = data.joint;
  const root = new THREE.Group();
  const hipsPos = j('root.x');
  const chestPos = j('spine_02.x');
  const headPos = j('head.x');
  const hips = new THREE.Group();
  hips.position.set(0, hipsPos.y, 0);
  root.add(hips);
  const chest = new THREE.Group();
  chest.position.set(0, chestPos.y - hipsPos.y, 0);
  hips.add(chest);
  const head = new THREE.Group();
  head.position.subVectors(headPos, chestPos);
  chest.add(head);
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  chest.add(holder);

  // Each group remembers its rest placement, so bones can follow it from the bind pose.
  const rests = new Map();
  const rest = (group, pivot, rotation = new THREE.Quaternion()) => {
    const align = new THREE.Matrix4().makeRotationFromQuaternion(rotation)
      .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z))
      .multiply(modelToGame);
    rests.set(group, align);
    return group;
  };
  rest(root, new THREE.Vector3());
  rest(hips, hipsPos);
  rest(chest, chestPos);
  rest(head, headPos);

  const segments = new Map();
  const assign = (group, ...boneNames) => { for (const name of boneNames) segments.set(name, group); };
  assign(hips, 'root.x', 'spine_01.x');
  assign(chest, 'spine_02.x', 'spine_03.x', 'neck.x', 'shoulder.l', 'shoulder.r');
  assign(head, 'head.x');

  // Legs and arms may be posed in the model, so each limb's rest rotation straightens it
  // to hang down from its joint.
  const down = new THREE.Vector3(0, -1, 0);
  const toDown = (from, to) => new THREE.Quaternion().setFromUnitVectors(to.clone().sub(from).normalize(), down);
  const leg = (s) => {
    const hip = j(`thigh_twist.${s}`), knee = j(`leg_stretch.${s}`), ankle = j(`foot.${s}`);
    const thigh = rest(new THREE.Group(), hip, toDown(hip, knee));
    thigh.position.subVectors(hip, hipsPos);
    hips.add(thigh);
    const shin = rest(new THREE.Group(), knee, toDown(knee, ankle));
    shin.position.y = -hip.distanceTo(knee);
    thigh.add(shin);
    assign(thigh, `thigh_twist.${s}`, `thigh_stretch.${s}`);
    assign(shin, `leg_stretch.${s}`, `leg_twist.${s}`, `foot.${s}`, `toes_01.${s}`);
    return { thigh, shin };
  };

  const arm = (s) => {
    const side = s === 'l' ? 1 : -1;
    const shoulder = j(`c_arm_twist_offset.${s}`), elbow = j(`forearm_stretch.${s}`), wrist = j(`hand.${s}`), fingerTip = j(`c_middle3.${s}`);
    const upper = rest(new THREE.Group(), shoulder, toDown(shoulder, elbow));
    upper.position.subVectors(shoulder, chestPos);
    chest.add(upper);
    const a = shoulder.distanceTo(elbow), foreLength = elbow.distanceTo(wrist);
    const foreRotation = toDown(elbow, wrist);
    const fore = rest(new THREE.Group(), elbow, foreRotation);
    fore.position.y = -a;
    upper.add(fore);
    const handRotation = toDown(wrist, fingerTip);
    const hand = rest(new THREE.Group(), wrist, handRotation);
    hand.position.y = -foreLength;
    fore.add(hand);
    assign(upper, `c_arm_twist_offset.${s}`, `arm_stretch.${s}`);
    assign(fore, `forearm_stretch.${s}`, `forearm_twist.${s}`);
    assign(hand, `hand.${s}`, `thumb1.${s}`, `c_thumb2.${s}`, `c_thumb3.${s}`);

    // Fingers curl towards the palm so hands wrap around whatever they hold.
    for (const finger of FINGERS) {
      assign(hand, `c_${finger}1_base.${s}`);
      let parent = hand, parentPivot = wrist, parentRotation = handRotation;
      [`${finger}1`, `c_${finger}2`, `c_${finger}3`].forEach((boneName) => {
        const pivot = j(`${boneName}.${s}`);
        const joint = rest(new THREE.Group(), pivot, handRotation);
        joint.position.copy(pivot).sub(parentPivot).applyQuaternion(parentRotation);
        joint.rotation.z = side * -0.85;
        parent.add(joint);
        assign(joint, `${boneName}.${s}`);
        parent = joint;
        parentPivot = pivot;
        parentRotation = handRotation;
      });
    }
    return { upper, fore, hand, side, a, b: foreLength };
  };

  const proxy = (parent, offset, r) => {
    const o = new THREE.Object3D();
    o.position.copy(offset);
    parent.add(o);
    return { o, r, p: new THREE.Vector3() };
  };
  const armL = arm('l'), armR = arm('r');
  const dims = { hips: hipsPos.y, chest: chestPos.y - hipsPos.y, shoulderY: armL.upper.position.y };
  return {
    root, hips, chest, head, holder, armL, armR, legL: leg('l'), legR: leg('r'), rests, segments, dims,
    proxies: [
      proxy(head, new THREE.Vector3(0, 0.1, -0.012), 0.125),
      proxy(chest, new THREE.Vector3(0, 0.03, -0.012), 0.095),
      proxy(chest, new THREE.Vector3(armL.upper.position.x, armL.upper.position.y, 0), 0.05),
      proxy(chest, new THREE.Vector3(armR.upper.position.x, armR.upper.position.y, 0), 0.05),
      proxy(hips, new THREE.Vector3(0, -0.02, 0), 0.115),
    ],
  };
}

/* ---------- Avatar ---------- */
function createAvatar(scene, skinId) {
  const data = loadSkinData(skinId);
  const rig = buildRig(data);
  scene.add(rig.root);

  // Bones sit in world space; their matrices are written directly each frame.
  const total = data.jointCount + (data.tails ? data.tails.count * 2 : 0);
  const bones = Array.from({ length: total }, () => new THREE.Bone());
  const inverses = bones.map((_, i) => (i < data.jointCount ? new THREE.Matrix4().fromArray(data.inverses, i * 16) : new THREE.Matrix4()));
  const skeleton = new THREE.Skeleton(bones, inverses);

  // For each used bone: the group that carries it, and its placement within that group.
  const driven = data.usedBones.filter((i) => i < data.jointCount).map((index) => {
    const name = data.names[index];
    const group = rig.segments.get(name) || rig.hips;
    return { bone: bones[index], group, offset: new THREE.Matrix4().multiplyMatrices(rig.rests.get(group), inverses[index].clone().invert()) };
  });
  // Bones the skin weights never reach still need a valid matrix.
  bones.forEach((bone) => bone.matrixWorld.identity());

  const meshes = data.parts.map(({ geometry, material }) => {
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.bindMode = 'detached';
    mesh.bind(skeleton, new THREE.Matrix4());
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });

  // Physics for the long twin tails.
  const colliders = rig.proxies;
  const tails = [];
  if (data.tails) {
    const headWorldRest = rig.head.position.clone().add(rig.chest.position).add(rig.hips.position);
    data.tails.paths.forEach((path, sideIndex) => {
      const side = sideIndex === 0 ? -1 : 1;
      let length = 0;
      for (let i = 1; i < path.length; i++) length += path[i].distanceTo(path[i - 1]);
      const segment = length / (path.length - 1);
      const directions = path.map((p, i) => (i ? p.clone().sub(path[i - 1]).normalize() : new THREE.Vector3(0, -1, 0)));
      const chain = new Chain(rig.head, path[0].clone().sub(headWorldRest), {
        count: path.length, segment, rest: (i) => directions[i], stiffness: (i) => [0, 0.7, 0.55, 0.42, 0.3, 0.22][i] || 0.15, pad: 0.03, damping: 0.92, gravity: -6, wind: 0.2, keepSide: side,
      });
      path.forEach((p, i) => inverses[data.tails.firstBone + sideIndex * data.tails.count + i].copy(
        new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z).multiply(modelToGame),
      ));
      tails.push({ chain, directions, firstBone: data.tails.firstBone + sideIndex * data.tails.count });
    });
    skeleton.boneInverses = inverses;
  }

  const avatar = { ...rig, skinId, dims: rig.dims };
  const updateProxies = () => { for (const c of rig.proxies) c.o.getWorldPosition(c.p); };

  const updateBones = () => {
    for (const { bone, group, offset } of driven) bone.matrixWorld.multiplyMatrices(group.matrixWorld, offset);
    rig.head.getWorldQuaternion(q2);
    for (const { chain, directions, firstBone } of tails) {
      for (let i = 0; i < chain.count; i++) {
        const next = chain.pos[Math.min(chain.count - 1, i + 1)], here = chain.pos[i];
        if (i < chain.count - 1) v1.subVectors(next, here).normalize();
        else v1.subVectors(here, chain.pos[i - 1]).normalize();
        v2.copy(directions[Math.min(chain.count - 1, i + 1)]).applyQuaternion(q2);
        q1.setFromUnitVectors(v2, v1).multiply(q2);
        bones[firstBone + i].matrixWorld.compose(here, q1, v3.set(1, 1, 1));
      }
    }
  };

  avatar.reset = () => {
    rig.root.updateMatrixWorld(true);
    updateProxies();
    for (const { chain } of tails) chain.reset();
    updateBones();
  };

  avatar.simulate = (dt) => {
    rig.root.updateMatrixWorld(true);
    updateProxies();
    // A fixed step keeps the hair stable at any frame rate; long hitches are simply skipped.
    // A bad dt (missing, negative, NaN) counts as no time at all, so it can't stall the hair.
    const h = 1 / 120;
    const time = dt > 0 && dt < Infinity ? dt : 0;
    const carried = avatar.accumulator > 0 ? avatar.accumulator : 0;
    avatar.accumulator = Math.min(carried + time, h * 6);
    let steps = 0;
    while (avatar.accumulator >= h) {
      avatar.accumulator -= h;
      steps++;
      for (const { chain } of tails) chain.step(h, colliders);
    }
    // A frame too short for a step still drags the tails after her head.
    if (!steps) for (const { chain } of tails) chain.follow(colliders);
    // The last safety net: a tail that ends up anywhere implausible snaps back onto her.
    for (const { chain } of tails) {
      chain.anchor.localToWorld(v3.copy(chain.offset));
      if (!chain.intact(v3)) chain.reset();
    }
    updateBones();
  };

  // How far the furthest point of either tail is from where it hangs, in metres (0 without tails).
  avatar.hairReach = () => {
    let reach = 0;
    for (const { chain } of tails) {
      chain.anchor.localToWorld(v3.copy(chain.offset));
      for (const p of chain.pos) reach = Math.max(reach, p.distanceTo(v3));
    }
    return reach;
  };

  avatar.setVisible = (visible) => {
    rig.root.visible = visible;
    for (const mesh of meshes) mesh.visible = visible;
  };

  avatar.dispose = () => {
    scene.remove(rig.root);
    for (const mesh of meshes) scene.remove(mesh);
    skeleton.dispose();
  };

  return avatar;
}

// Two-bone IK: places a hand at a target given in the chest's coordinates.
const ikDir = new THREE.Vector3(), ikPole = new THREE.Vector3(), ikElbow = new THREE.Vector3(), ikFore = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
function solveArm(arm, target, pole) {
  const { a, b } = arm;
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

// Turns the hand to an orientation given in the chest's coordinates. The roll is shared
// with the forearm, as a real wrist does, so the skin doesn't twist at the joint.
const handLocal = new THREE.Quaternion(), foreWorld = new THREE.Quaternion(), wristRoll = new THREE.Quaternion(), rollInverse = new THREE.Quaternion();
function poseHand(arm, chestSpace, amount) {
  foreWorld.copy(arm.upper.quaternion).multiply(arm.fore.quaternion);
  handLocal.copy(foreWorld).invert().multiply(chestSpace);
  // Pull the rotation around the forearm's own axis out of the hand.
  wristRoll.set(0, handLocal.y, 0, handLocal.w);
  if (wristRoll.lengthSq() < 1e-6) wristRoll.identity(); else wristRoll.normalize();
  arm.fore.quaternion.multiply(wristRoll);
  rollInverse.copy(wristRoll).invert();
  handLocal.premultiply(rollInverse);
  arm.hand.quaternion.identity().slerp(handLocal, amount);
}
