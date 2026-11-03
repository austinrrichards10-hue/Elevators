// The newer character models: "Hatsune Miku" by Tigerar1 and "PDF Teto" by 雨宮レン (see the
// README). Neither shares the old file's skeleton, so each gets a small one of its own with
// the bone names the rig expects (player.js buildRig), and is brought into the same model
// space as the old file. Teto's own skin weights are carried over onto those bones; Miku's
// model has none, so hers are worked out from where each point lies on her body.

const RIG_FINGERS = ['index', 'middle', 'ring', 'pinky'];

// Every bone a rigged model is given, by the rig's names.
function rigJointNames() {
  const names = ['root.x', 'spine_02.x', 'neck.x', 'head.x'];
  for (const s of ['l', 'r']) {
    names.push(`shoulder.${s}`, `c_arm_twist_offset.${s}`, `forearm_stretch.${s}`, `hand.${s}`, `thumb1.${s}`, `c_thumb2.${s}`, `c_thumb3.${s}`);
    for (const f of RIG_FINGERS) names.push(`${f}1.${s}`, `c_${f}2.${s}`, `c_${f}3.${s}`);
    names.push(`thigh_twist.${s}`, `leg_stretch.${s}`, `foot.${s}`);
  }
  return names;
}

/* ---------- Teto's skeleton ---------- */
// Her file's bones are numbered in the usual order for models of this kind. Its names are
// garbled, so they're picked out by number: the body, then each arm (shoulder, arm, elbow,
// three sleeve bones, wrist, then thumb and four fingers of five bones each), the legs, and
// eight chains of skirt bones round the hips.
const TETO_RIG = {
  joints: { 'root.x': 85, 'spine_02.x': 2, 'neck.x': 3, 'head.x': 4 },
  arms: { r: 23, l: 54 },
  legs: { r: 93, l: 88 },
  skirt: [98, 137],
};

function tetoBone(k) {
  if (k === 2) return 'spine_02.x';
  if (k === 3) return 'neck.x';
  if (k >= 4 && k <= 22) return 'head.x';
  for (const [s, base] of Object.entries(TETO_RIG.arms)) {
    const o = k - base;
    if (o < 0 || o > 30) continue;
    if (o === 0) return `shoulder.${s}`;
    if (o === 1) return `c_arm_twist_offset.${s}`;
    if (o <= 5) return `forearm_stretch.${s}`;
    if (o === 6) return `hand.${s}`;
    if (o <= 10) return `${['thumb1', 'c_thumb2', 'c_thumb3', 'c_thumb3'][o - 7]}.${s}`;
    const f = RIG_FINGERS[Math.floor((o - 11) / 5)], link = (o - 11) % 5;
    return `${[`${f}1`, `c_${f}2`, `c_${f}3`, `c_${f}3`, `c_${f}3`][link]}.${s}`;
  }
  for (const [s, base] of Object.entries(TETO_RIG.legs)) {
    const o = k - base;
    if (o === 0) return `thigh_twist.${s}`;
    if (o === 1) return `leg_stretch.${s}`;
    if (o >= 2 && o <= 4) return `foot.${s}`;
  }
  return 'root.x';
}

// Where each of the rig's bones sits, from her file's own bones. A few at the ends of the
// chains were exported at the origin; those carry on from the bones before them.
function tetoJoints(at) {
  const J = { ...Object.fromEntries(Object.entries(TETO_RIG.joints).map(([n, k]) => [n, at(k)])) };
  const chain = (ks) => {
    const p = ks.map(at);
    for (let i = 1; i < p.length; i++) if (p[i].y < 0.05) p[i] = p[i - 1].clone().add(p[i - 1].clone().sub(p[i - 2] || p[i - 1]));
    return p;
  };
  for (const [s, base] of Object.entries(TETO_RIG.arms)) {
    J[`shoulder.${s}`] = at(base);
    J[`c_arm_twist_offset.${s}`] = at(base + 1);
    J[`forearm_stretch.${s}`] = at(base + 2);
    J[`hand.${s}`] = at(base + 6);
    const thumb = chain([base + 7, base + 8, base + 9]);
    [J[`thumb1.${s}`], J[`c_thumb2.${s}`], J[`c_thumb3.${s}`]] = thumb;
    RIG_FINGERS.forEach((f, i) => {
      const p = chain([base + 11 + i * 5, base + 12 + i * 5, base + 13 + i * 5]);
      [J[`${f}1.${s}`], J[`c_${f}2.${s}`], J[`c_${f}3.${s}`]] = p;
    });
  }
  for (const [s, base] of Object.entries(TETO_RIG.legs)) {
    J[`thigh_twist.${s}`] = at(base);
    J[`leg_stretch.${s}`] = at(base + 1);
    J[`foot.${s}`] = at(base + 2);
  }
  return J;
}

/* ---------- Miku's skeleton ---------- */
// Her joints in game space, left side (+X); the right side mirrors it. Measured off the
// model standing in its T-pose.
const MIKU_JOINTS = {
  'root.x': [0, 0.93, 0], 'spine_02.x': [0, 1.03, 0], 'neck.x': [0, 1.24, -0.01], 'head.x': [0, 1.31, -0.01],
  shoulder: [0.05, 1.22, 0], arm: [0.105, 1.2, 0], elbow: [0.3, 1.11, 0], wrist: [0.495, 1.02, 0],
  finger: [[0.55, 1.005, 0], [0.575, 1.0, 0], [0.595, 0.997, 0]], thumb: [[0.51, 1.0, 0.03], [0.53, 0.99, 0.045], [0.545, 0.985, 0.05]],
  hip: [0.072, 0.85, 0], knee: [0.07, 0.52, 0.01], ankle: [0.068, 0.12, -0.01],
};

function mikuJoints() {
  const V = (a, side = 1) => new THREE.Vector3(a[0] * side, a[1], a[2]);
  const M = MIKU_JOINTS;
  const J = { 'root.x': V(M['root.x']), 'spine_02.x': V(M['spine_02.x']), 'neck.x': V(M['neck.x']), 'head.x': V(M['head.x']) };
  for (const [s, side] of [['l', 1], ['r', -1]]) {
    J[`shoulder.${s}`] = V(M.shoulder, side);
    J[`c_arm_twist_offset.${s}`] = V(M.arm, side);
    J[`forearm_stretch.${s}`] = V(M.elbow, side);
    J[`hand.${s}`] = V(M.wrist, side);
    [J[`thumb1.${s}`], J[`c_thumb2.${s}`], J[`c_thumb3.${s}`]] = M.thumb.map((p) => V(p, side));
    // Her fingers are modelled together, so they all bend as one.
    for (const f of RIG_FINGERS) [J[`${f}1.${s}`], J[`c_${f}2.${s}`], J[`c_${f}3.${s}`]] = M.finger.map((p) => V(p, side));
    J[`thigh_twist.${s}`] = V(M.hip, side);
    J[`leg_stretch.${s}`] = V(M.knee, side);
    J[`foot.${s}`] = V(M.ankle, side);
  }
  return J;
}

// Weights for a point on Miku, by where it is: the arms out from the shoulders, the head
// above the neck, the legs below the hips (her skirt splitting between them) and the torso
// bending at the waist.
function mikuWeights(p, J, bone) {
  const side = p.x < 0 ? -1 : 1, s = side > 0 ? 'l' : 'r';
  const x = Math.abs(p.x);
  const sm = THREE.MathUtils.smoothstep;
  const shoulder = J[`c_arm_twist_offset.${s}`], wrist = J[`hand.${s}`];
  const dir = wrist.clone().sub(shoulder).normalize();
  const rel = p.clone().sub(shoulder);
  const u = rel.dot(dir);
  const along = (j) => J[j].clone().sub(shoulder).dot(dir);
  const pairs = [];
  const armShare = sm(x, 0.1, 0.15) * sm(p.y, 0.92, 0.98);
  if (armShare > 0) {
    const e = sm(u, along(`forearm_stretch.${s}`) - 0.04, along(`forearm_stretch.${s}`) + 0.04);
    const h = sm(u, along(`hand.${s}`) - 0.015, along(`hand.${s}`) + 0.015);
    const f1 = sm(u, along(`middle1.${s}`) - 0.005, along(`middle1.${s}`) + 0.01);
    const f2 = sm(u, along(`c_middle2.${s}`) - 0.005, along(`c_middle2.${s}`) + 0.008);
    const f3 = sm(u, along(`c_middle3.${s}`) - 0.004, along(`c_middle3.${s}`) + 0.006);
    pairs.push(
      [bone(`c_arm_twist_offset.${s}`), armShare * (1 - e)],
      [bone(`forearm_stretch.${s}`), armShare * e * (1 - h)],
      [bone(`hand.${s}`), armShare * h * (1 - f1)],
      [bone(`middle1.${s}`), armShare * f1 * (1 - f2)],
      [bone(`c_middle2.${s}`), armShare * f2 * (1 - f3)],
      [bone(`c_middle3.${s}`), armShare * f3],
    );
  }
  const rest = 1 - armShare;
  const head = sm(p.y, J['neck.x'].y, J['head.x'].y);
  const legs = (1 - head) * (1 - sm(p.y, J[`thigh_twist.${s}`].y - 0.06, J[`thigh_twist.${s}`].y + 0.06));
  const chest = sm(p.y, J['root.x'].y, J['spine_02.x'].y);
  pairs.push(
    [bone('head.x'), rest * head],
    [bone('spine_02.x'), rest * (1 - head - legs) * chest],
    [bone('root.x'), rest * (1 - head - legs) * (1 - chest)],
  );
  if (legs > 0) {
    // Close to the middle (her skirt), a point blends between the legs.
    const left = THREE.MathUtils.clamp((p.x + 0.03) / 0.06, 0, 1);
    for (const [ls, share] of [['l', left], ['r', 1 - left]]) {
      if (share <= 0) continue;
      const knee = 1 - sm(p.y, J[`leg_stretch.${ls}`].y - 0.05, J[`leg_stretch.${ls}`].y + 0.05);
      const foot = 1 - sm(p.y, J[`foot.${ls}`].y - 0.05, J[`foot.${ls}`].y + 0.01);
      pairs.push(
        [bone(`thigh_twist.${ls}`), rest * legs * share * (1 - knee)],
        [bone(`leg_stretch.${ls}`), rest * legs * share * knee * (1 - foot)],
        [bone(`foot.${ls}`), rest * legs * share * knee * foot],
      );
    }
  }
  return pairs;
}

/* ---------- Loading ---------- */
// Skin weights for a point, as up to four [bone, weight] pairs.
function packWeights(pairs, joints, weights, i) {
  const kept = pairs.filter(([b, w]) => b >= 0 && w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = kept.reduce((s, [, w]) => s + w, 0) || 1;
  for (let k = 0; k < 4; k++) {
    joints[i * 4 + k] = kept[k] ? kept[k][0] : 0;
    weights[i * 4 + k] = kept[k] ? kept[k][1] / total : 0;
  }
}

const RIG_LIGHT = new THREE.Vector3(0.3, 0.8, 0.5).normalize();

// A rigged model's data, in the same form as loadModelSkin's (player.js).
function loadRiggedSkin(def) {
  const file = readGlb(window[def.file]);
  const { json } = file;
  const skinned = def.rig === 'teto';
  // Each primitive in bind pose. Skinned geometry is already in its skeleton's space;
  // the other model's pieces are placed by their nodes.
  const pieces = [];
  const world = new Array(json.nodes.length);
  const visit = (i, parent) => {
    const n = json.nodes[i];
    const m = new THREE.Matrix4();
    if (n.matrix) m.fromArray(n.matrix);
    else m.compose(new THREE.Vector3(...(n.translation || [0, 0, 0])), new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(n.scale || [1, 1, 1])));
    world[i] = parent.clone().multiply(m);
    for (const c of n.children || []) visit(c, world[i]);
  };
  for (const r of json.scenes[0].nodes) visit(r, new THREE.Matrix4());
  json.nodes.forEach((node, i) => {
    if (node.mesh === undefined) return;
    json.meshes[node.mesh].primitives.forEach((primitive) => {
      const geometry = file.geometry(primitive);
      if (!skinned) geometry.applyMatrix4(world[i]);
      pieces.push({ geometry, primitive, mesh: node.mesh });
    });
  });
  // Scaled to her height, feet on the ground, centred.
  const box = new THREE.Box3();
  for (const { geometry } of pieces) { geometry.computeBoundingBox(); box.union(geometry.boundingBox); }
  const k = def.height / (box.max.y - box.min.y);
  const toGame = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
  const gameToModelM = modelToGame.clone().invert();

  // The skeleton: rig names, at positions in model space, bound without rotation (the rig's
  // rest placements take care of which way each limb points).
  const names = rigJointNames();
  let joints;
  let ibm = null;
  if (skinned) {
    ibm = file.accessor(json.skins[0].inverseBindMatrices).array;
    const m = new THREE.Matrix4();
    joints = tetoJoints((k2) => new THREE.Vector3().setFromMatrixPosition(m.fromArray(ibm, k2 * 16).invert()).applyMatrix4(toGame));
  } else {
    joints = mikuJoints();
  }
  const inverses = new Float32Array(names.length * 16);
  const p = new THREE.Vector3();
  names.forEach((name, i) => {
    p.copy(joints[name]).applyMatrix4(gameToModelM);
    new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z).toArray(inverses, i * 16);
  });
  const bone = (name) => names.indexOf(name);

  const materials = new Map();
  const parts = pieces.map(({ geometry, primitive, mesh }) => {
    geometry.applyMatrix4(toGame);
    geometry.computeVertexNormals();
    const pos = geometry.attributes.position, nrm = geometry.attributes.normal;
    const count = pos.count;
    const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
    const isHair = def.hair.includes(mesh);
    if (skinned) {
      // Her own weights, each onto the rig bone that stands for its bone.
      const j0 = geometry.attributes.skinIndex.array, w0 = geometry.attributes.skinWeight;
      const scale = w0.normalized ? (w0.array instanceof Uint8Array ? 255 : 65535) : 1;
      for (let i = 0; i < count; i++) {
        const sum = new Map();
        for (let c = 0; c < 4; c++) {
          const w = w0.array[i * 4 + c] / scale;
          if (w <= 0) continue;
          const kk = j0[i * 4 + c];
          if (kk >= TETO_RIG.skirt[0] && kk <= TETO_RIG.skirt[1] && (kk - TETO_RIG.skirt[0]) % 5) {
            // The lower skirt bones share with the thigh on their side, so it swings with her legs.
            const at = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(ibm, kk * 16).invert()).applyMatrix4(toGame);
            const leg = THREE.MathUtils.clamp(Math.abs(at.x) / 0.1, 0, 1) * 0.6;
            const thigh = bone(`thigh_twist.${at.x < 0 ? 'r' : 'l'}`), root = bone('root.x');
            sum.set(thigh, (sum.get(thigh) || 0) + w * leg);
            sum.set(root, (sum.get(root) || 0) + w * (1 - leg));
          } else {
            const b = bone(tetoBone(kk));
            sum.set(b, (sum.get(b) || 0) + w);
          }
        }
        packWeights([...sum.entries()], skinIndex, skinWeight, i);
      }
      geometry.deleteAttribute('skinIndex');
      geometry.deleteAttribute('skinWeight');
    } else {
      for (let i = 0; i < count; i++) packWeights(isHair ? [[bone('head.x'), 1]] : mikuWeights(p.fromBufferAttribute(pos, i), joints, bone), skinIndex, skinWeight, i);
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    // Soft light baked into the colours, as these textures carry no shading of their own.
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const light = Math.max(0, nrm.getX(i) * RIG_LIGHT.x + nrm.getY(i) * RIG_LIGHT.y + nrm.getZ(i) * RIG_LIGHT.z);
      colors.fill(0.8 + 0.28 * light, i * 3, i * 3 + 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.applyMatrix4(gameToModelM);
    if (!materials.has(primitive.material)) {
      const mdef = json.materials[primitive.material];
      const pbr = mdef.pbrMetallicRoughness || {};
      const params = { side: THREE.DoubleSide, vertexColors: true };
      if (pbr.baseColorTexture) params.map = file.texture(pbr.baseColorTexture.index);
      if (mdef.alphaMode === 'BLEND' || mdef.alphaMode === 'MASK') params.alphaTest = 0.5;
      materials.set(primitive.material, new THREE.MeshBasicMaterial(params));
    }
    return { geometry, material: materials.get(primitive.material), isHair, isCloth: false, matName: (def.pieces && def.pieces[mesh]) || '' };
  });

  const data = { parts, names, inverses, jointCount: names.length };
  data.joint = (name) => joints[name].clone();
  return data;
}
