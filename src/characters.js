// The newer character models: "Hatsune Miku ¡Escenario colorido!" by mega mix and "PDF Teto"
// by 雨宮レン (see the README). Neither shares the old file's skeleton, so each gets a small one
// of its own with the bone names the rig expects (player.js buildRig), and is brought into the
// same model space as the old file. Their own skin weights are carried over onto those bones.

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
// Her file's bones are named plainly (Left_Elbow, Right_Knee and so on), so each is matched to
// the rig by name. Her skirt's chains share with the thigh on their side further down them,
// and the twin tails' chains (the BS hair bones) are left to the game's own hair physics.
const MIKU_TAIL_BONE = /_BS_hair/;

function mikuBone(name) {
  const n = name.replace(/_\d+$/, '');
  const m = n.match(/^(Left|Right)_(.*)$/);
  if (m) {
    const s = m[1] === 'Left' ? 'l' : 'r', b = m[2];
    if (/^Shoulder/.test(b)) return `shoulder.${s}`;
    if (/^Arm/.test(b)) return `c_arm_twist_offset.${s}`;
    if (/^(Elbow|ForeArmRoll)/.test(b)) return `forearm_stretch.${s}`;
    if (/^(Wrist|Hand_Attach)/.test(b)) return `hand.${s}`;
    const f = b.match(/^(Thumb|Index|Middle|Ring|Pinky)_0(\d)/);
    if (f) {
      const finger = f[1].toLowerCase(), k = Math.min(3, +f[2]);
      return k === 1 ? `${finger}1.${s}` : `c_${finger}${k}.${s}`;
    }
    if (/^(Thigh|AssistHip)/.test(b)) return `thigh_twist.${s}`;
    if (/^Knee/.test(b)) return `leg_stretch.${s}`;
    if (/^(Ankle|Toe)/.test(b)) return `foot.${s}`;
  }
  if (/Pectoralis|Bust|Chest|Spine|_acc_/.test(n)) return 'spine_02.x';
  if (/^Neck/.test(n)) return 'neck.x';
  if (/^Head|hair/.test(n)) return 'head.x';
  return 'root.x';
}

// Where each of the rig's bones sits, from her bones by name.
function mikuJoints(at) {
  const J = { 'root.x': at('Waist'), 'spine_02.x': at('Spine'), 'neck.x': at('Neck'), 'head.x': at('Head') };
  for (const [s, side] of [['l', 'Left'], ['r', 'Right']]) {
    J[`shoulder.${s}`] = at(`${side}_Shoulder`);
    J[`c_arm_twist_offset.${s}`] = at(`${side}_Arm`);
    J[`forearm_stretch.${s}`] = at(`${side}_Elbow`);
    J[`hand.${s}`] = at(`${side}_Wrist`);
    for (const f of ['Thumb', ...RIG_FINGERS.map((x) => x[0].toUpperCase() + x.slice(1))]) {
      const name = f === 'Thumb' ? 'thumb' : f.toLowerCase();
      J[`${name}1.${s}`] = at(`${side}_${f}_01`);
      J[`c_${name}2.${s}`] = at(`${side}_${f}_02`);
      J[`c_${name}3.${s}`] = at(`${side}_${f}_03`);
    }
    J[`thigh_twist.${s}`] = at(`${side}_Thigh`);
    J[`leg_stretch.${s}`] = at(`${side}_Knee`);
    J[`foot.${s}`] = at(`${side}_Ankle`);
  }
  return J;
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
  // Each primitive in bind pose. Skinned geometry is already in its skeleton's space; any
  // other piece is placed by its node, and rides with the bone `def.attach` names.
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
      if (node.skin === undefined) geometry.applyMatrix4(world[i]);
      pieces.push({ geometry, primitive, mesh: node.mesh, skin: node.skin });
    });
  });
  // Scaled to her height, feet on the ground, centred.
  const box = new THREE.Box3();
  for (const { geometry } of pieces) { geometry.computeBoundingBox(); box.union(geometry.boundingBox); }
  const k = def.height / (box.max.y - box.min.y);
  const toGame = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
  const gameToModelM = modelToGame.clone().invert();

  // Each of the file's bones: its name and where it sits in game space, skin by skin.
  const skins = (json.skins || []).map((skin) => {
    const ibm = file.accessor(skin.inverseBindMatrices).array;
    const m = new THREE.Matrix4();
    return skin.joints.map((node, j) => ({ name: json.nodes[node].name, at: new THREE.Vector3().setFromMatrixPosition(m.fromArray(ibm, j * 16).invert()).applyMatrix4(toGame) }));
  });
  // The skeleton: rig names, at positions in model space, bound without rotation (the rig's
  // rest placements take care of which way each limb points).
  const names = rigJointNames();
  const joints = def.rig === 'teto'
    ? tetoJoints((j) => skins[0][j].at.clone())
    : mikuJoints((base) => {
      for (const list of skins) for (const b of list) if (b.name.replace(/_\d+$/, '') === base) return b.at.clone();
      throw new Error(`No bone ${base}`);
    });
  const inverses = new Float32Array(names.length * 16);
  const p = new THREE.Vector3();
  names.forEach((name, i) => {
    p.copy(joints[name]).applyMatrix4(gameToModelM);
    new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z).toArray(inverses, i * 16);
  });
  const bone = (name) => names.indexOf(name);
  const thigh = (x) => bone(`thigh_twist.${x < 0 ? 'r' : 'l'}`);
  // Which rig bones a file bone's weight goes to, as [bone, share] pairs. The lower links of
  // a skirt share with the thigh on their side, so it swings with her legs.
  const share = (b) => [[thigh(b.at.x), THREE.MathUtils.clamp(Math.abs(b.at.x) / 0.1, 0, 1) * 0.6], [bone('root.x'), 1 - THREE.MathUtils.clamp(Math.abs(b.at.x) / 0.1, 0, 1) * 0.6]];
  const targets = skins.map((list) => list.map((b, j) => {
    if (def.rig === 'teto') {
      if (j >= TETO_RIG.skirt[0] && j <= TETO_RIG.skirt[1] && (j - TETO_RIG.skirt[0]) % 5) return share(b);
      return [[bone(tetoBone(j)), 1]];
    }
    if (/skirt/.test(b.name) && !/skirt_01/.test(b.name)) return share(b);
    return [[bone(mikuBone(b.name)), 1]];
  }));

  const materials = new Map();
  const parts = pieces.map(({ geometry, primitive, mesh, skin }) => {
    geometry.applyMatrix4(toGame);
    geometry.computeVertexNormals();
    const pos = geometry.attributes.position, nrm = geometry.attributes.normal;
    const count = pos.count;
    const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
    const isHair = def.hair.includes(mesh);
    // Points the twin tails' own bones moved, for the game's hair physics to take over.
    const tailMask = def.tailBones ? new Uint8Array(count) : null;
    if (skin !== undefined) {
      // Her own weights, each onto the rig bones that stand for its bone.
      const j0 = geometry.attributes.skinIndex.array, w0 = geometry.attributes.skinWeight;
      const scale = w0.normalized ? (w0.array instanceof Uint8Array ? 255 : 65535) : 1;
      for (let i = 0; i < count; i++) {
        const sum = new Map();
        let top = 0, tail = false;
        for (let c = 0; c < 4; c++) {
          const w = w0.array[i * 4 + c] / scale;
          if (w <= 0) continue;
          const kk = j0[i * 4 + c];
          for (const [b, s] of targets[skin][kk]) sum.set(b, (sum.get(b) || 0) + w * s);
          if (w > top) { top = w; tail = tailMask && def.tailBones.test(skins[skin][kk].name); }
        }
        // A few points are tied both to the neck and to a hand, which stretches them out into a
        // flap as soon as the arm comes down; those stay with the neck.
        const handBones = [...sum.keys()].filter((b) => /^(hand|thumb|c_thumb|index|c_index|middle|c_middle|ring|c_ring|pinky|c_pinky)/.test(names[b]));
        if (handBones.length && sum.has(bone('neck.x'))) for (const b of handBones) sum.delete(b);
        packWeights([...sum.entries()], skinIndex, skinWeight, i);
        if (tail) tailMask[i] = 1;
      }
      geometry.deleteAttribute('skinIndex');
      geometry.deleteAttribute('skinWeight');
    } else {
      for (let i = 0; i < count; i++) packWeights([[bone(def.attach || 'head.x'), 1]], skinIndex, skinWeight, i);
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
    return { geometry, material: materials.get(primitive.material), isHair, isCloth: false, matName: (def.pieces && def.pieces[mesh]) || '', tailMask };
  });

  const data = { parts, names, inverses, jointCount: names.length };
  data.joint = (name) => joints[name].clone();
  return data;
}