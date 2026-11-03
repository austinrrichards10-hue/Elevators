// Miku's clothes: the oversized sweater and baggy jeans from models/clothing, in place of
// the outfit she came with. Both were modelled on a full-size person standing in an A-pose.
// Rather than bending them into her own bind pose (a T-pose), they're scaled down evenly,
// keeping their shape, and bound to her bones with her arms lowered to the sweater's
// angle and her legs hanging straight. Each garment then rides those bones from there.
const OUTFIT = {
  // How far below level the sweater's sleeves hang, in radians; her arms match it.
  armDrop: 0.5,
  // The sweater: a point maps to `to + scale * (point - from)`, `from` being where its
  // sleeves meet the body, so the sleeves line up with her shoulders.
  sweater: {
    from: new THREE.Vector3(0, 1.36, -0.03),
    to: new THREE.Vector3(0, 1.144, -0.012),
    scale: 0.66,
    // The tall funnel collar is pressed down above its base, so it stops under her chin.
    collar: { from: 1.5, squash: 0.35 },
    // Each sleeve hangs from `pivot`; `elbow` is how far down it her elbow comes.
    sleeve: { pivot: new THREE.Vector3(0.2, 1.36, -0.06), blend: [-0.04, 0.07], armpit: 1.12, elbow: [0.2, 0.28] },
  },
  // The jeans: heights map through these pairs (garment, Miku); each leg is centred on
  // hers and scaled across by `scale`, flaring out over the boots at the hem.
  jeans: {
    heights: [[0, 0.015], [0.66, 0.79], [1.09, 0.995]],
    scale: { x: 0.8, z: 0.82 },
    crotch: 0.66, // in the garment: below this, each leg is its own tube
    flare: { top: 0.36, amount: 0.45, forward: 0.035 }, // over the boots: from what height, how much, and pushed towards the toes
  },
  light: new THREE.Vector3(0.3, 0.8, 0.5).normalize(),
};

function decodeGarment(model) {
  const decode = (b64, Type) => {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Type(bytes.buffer);
  };
  const textures = {};
  return model.parts.map((part) => {
    let map = null;
    if (part.texture) {
      if (!textures[part.texture]) {
        const tex = new THREE.TextureLoader().load(model.textures[part.texture]);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.anisotropy = 4;
        textures[part.texture] = tex;
      }
      map = textures[part.texture];
    }
    return {
      positions: decode(part.positions, Float32Array),
      uvs: decode(part.uvs, Float32Array),
      indices: decode(part.indices, Uint16Array),
      map,
      color: part.color,
    };
  });
}

// Skin weights for a point, as up to four [bone, weight] pairs.
function packWeights(pairs, joints, weights, i) {
  const kept = pairs.filter(([b, w]) => b >= 0 && w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = kept.reduce((s, [, w]) => s + w, 0) || 1;
  for (let k = 0; k < 4; k++) {
    joints[i * 4 + k] = kept[k] ? kept[k][0] : 0;
    weights[i * 4 + k] = kept[k] ? kept[k][1] / total : 0;
  }
}

// A garment part as geometry in game space, in the pose it's bound in, with light baked
// into its colours, since the character materials are unlit.
function garmentGeometry(source, positions, joints, weights) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(source.uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(joints, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  geometry.setIndex(new THREE.BufferAttribute(source.indices, 1));
  geometry.computeVertexNormals();
  const n = geometry.attributes.normal, L = OUTFIT.light;
  const colors = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const light = Math.abs(n.getX(i) * L.x + n.getY(i) * L.y + n.getZ(i) * L.z);
    const shade = 0.66 + 0.42 * light;
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.deleteAttribute('normal');
  return geometry;
}

function garmentMaterial(source) {
  const params = { vertexColors: true, side: THREE.DoubleSide };
  if (source.map) params.map = source.map;
  if (source.color !== undefined) params.color = source.color;
  return new THREE.MeshBasicMaterial(params);
}

/* ---------- The sweater ---------- */
function fitSweater(bones) {
  const fit = OUTFIT.sweater, sleeve = fit.sleeve, c = fit.collar;
  const p = new THREE.Vector3(), out3 = new THREE.Vector3();
  const cos = Math.cos(OUTFIT.armDrop), sin = Math.sin(OUTFIT.armDrop);
  return decodeGarment(SWEATER_MODEL).map((source) => {
    const src = source.positions, count = src.length / 3;
    const out = new Float32Array(src.length);
    const joints = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      p.fromArray(src, i * 3);
      // Its own shape, scaled down evenly; only the collar is pressed down.
      out3.subVectors(p, fit.from).multiplyScalar(fit.scale).add(fit.to);
      if (p.y > c.from) out3.y -= (p.y - c.from) * fit.scale * (1 - c.squash);
      out3.toArray(out, i * 3);
      // Which sleeve it's on, if either: how far out along it, in the garment's own space.
      const side = p.x < 0 ? -1 : 1;
      const along = (side * (p.x - side * sleeve.pivot.x)) * cos - (p.y - sleeve.pivot.y) * sin;
      // Below the armpits (the hem, the hanging straps) it's all body.
      const belowArm = Math.max(THREE.MathUtils.smoothstep(p.y, sleeve.armpit - 0.06, sleeve.armpit), THREE.MathUtils.smoothstep(Math.abs(p.x), 0.32, 0.42));
      const onArm = THREE.MathUtils.smoothstep(along, sleeve.blend[0], sleeve.blend[1]) * belowArm;
      const elbow = THREE.MathUtils.smoothstep(along, sleeve.elbow[0], sleeve.elbow[1]);
      // The hem rides with the hips, the rest with the chest, the sleeves with the arms.
      const waist = THREE.MathUtils.smoothstep(out3.y, 0.93, 1.05);
      packWeights([
        [bones.hips, (1 - onArm) * (1 - waist)],
        [bones.chest, (1 - onArm) * waist],
        [bones.upper[side], onArm * (1 - elbow)],
        [bones.fore[side], onArm * elbow],
      ], joints, weights, i);
    }
    return { geometry: garmentGeometry(source, out, joints, weights), material: garmentMaterial(source) };
  });
}

/* ---------- The jeans ---------- */
// Below the crotch the two legs are separate tubes. Each point there is assigned to one by
// walking the mesh from its hem, so the inner seams, which touch, can't swap legs.
function jeansLegs(sources, crotch) {
  const owner = sources.map((s) => new Int8Array(s.positions.length / 3));
  // Points shared by the two parts, and duplicated at texture seams, are welded by position.
  const ids = new Map(), keyOf = (a, i) => `${Math.round(a[i] * 2e3)},${Math.round(a[i + 1] * 2e3)},${Math.round(a[i + 2] * 2e3)}`;
  const vertexId = sources.map((s) => {
    const a = s.positions, out = new Int32Array(a.length / 3);
    for (let i = 0; i < out.length; i++) {
      const key = keyOf(a, i * 3);
      if (!ids.has(key)) ids.set(key, ids.size);
      out[i] = ids.get(key);
    }
    return out;
  });
  const links = Array.from({ length: ids.size }, () => []);
  const height = new Float32Array(ids.size), across = new Float32Array(ids.size);
  sources.forEach((s, k) => {
    const idx = s.indices, vid = vertexId[k];
    for (let i = 0; i < vid.length; i++) { height[vid[i]] = s.positions[i * 3 + 1]; across[vid[i]] = s.positions[i * 3]; }
    for (let t = 0; t < idx.length; t += 3) {
      const a = vid[idx[t]], b = vid[idx[t + 1]], c = vid[idx[t + 2]];
      links[a].push(b, c); links[b].push(a, c); links[c].push(a, b);
    }
  });
  const side = new Int8Array(ids.size);
  for (const s of [1, -1]) {
    // Start from the point at the bottom of this leg's hem, furthest out.
    let start = -1;
    for (let v = 0; v < ids.size; v++) if (height[v] < 0.08 && across[v] * s > 0.1 && (start < 0 || height[v] < height[start])) start = v;
    const queue = [start];
    side[start] = s;
    while (queue.length) {
      const v = queue.pop();
      for (const u of links[v]) {
        if (side[u] || height[u] > crotch) continue;
        side[u] = s;
        queue.push(u);
      }
    }
  }
  sources.forEach((s, k) => { for (let i = 0; i < owner[k].length; i++) owner[k][i] = side[vertexId[k][i]]; });
  return owner;
}

function fitJeans(bones) {
  const fit = OUTFIT.jeans, flare = fit.flare;
  const sources = decodeGarment(JEANS_MODEL);
  const legs = jeansLegs(sources, fit.crotch);
  const mapHeight = (y) => {
    const h = fit.heights;
    for (let i = 1; i < h.length; i++) {
      if (y <= h[i][0] || i === h.length - 1) return lerp(h[i - 1][1], h[i][1], (y - h[i - 1][0]) / (h[i][0] - h[i - 1][0]));
    }
    return y;
  };
  // Each leg's own centre in the garment, band by band down its length.
  const BAND = 0.03, bands = Math.ceil(fit.crotch / BAND) + 1;
  const centre = { 1: Array.from({ length: bands }, () => [0, 0, 0]), [-1]: Array.from({ length: bands }, () => [0, 0, 0]) };
  sources.forEach((source, k) => {
    const src = source.positions;
    for (let i = 0; i < src.length / 3; i++) {
      const side = legs[k][i];
      if (!side) continue;
      const b = centre[side][clamp(Math.floor(src[i * 3 + 1] / BAND), 0, bands - 1)];
      b[0] += src[i * 3]; b[1] += src[i * 3 + 2]; b[2]++;
    }
  });
  for (const side of [1, -1]) {
    let last = [side * 0.12, 0];
    for (const b of centre[side]) { if (b[2]) last = [b[0] / b[2], b[1] / b[2]]; b[0] = last[0]; b[1] = last[1]; }
  }
  return sources.map((source, k) => {
    const src = source.positions, count = src.length / 3;
    const out = new Float32Array(src.length);
    const joints = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const gx = src[i * 3], gy = src[i * 3 + 1], gz = src[i * 3 + 2];
      const y = mapHeight(gy);
      let x = gx * fit.scale.x, z = gz * fit.scale.z;
      const side = legs[k][i];
      if (side) {
        // Each leg centred on hers, hanging straight from the hip, and opening out round the
        // boot at the bottom so the hem drapes over it.
        const [cx, cz] = centre[side][clamp(Math.floor(gy / BAND), 0, bands - 1)];
        const wide = 1 + flare.amount * THREE.MathUtils.smoothstep(flare.top - y, 0, flare.top);
        const lx = bones.hipX * side + (gx - cx) * fit.scale.x * wide;
        const lz = bones.legZ + (gz - cz) * fit.scale.z * wide + flare.forward * THREE.MathUtils.smoothstep(flare.top - y, 0, flare.top);
        // Easing over from the seat's shape just under the crotch.
        const w = THREE.MathUtils.smoothstep(fit.crotch - gy, 0, 0.12);
        x = lerp(x, lx, w);
        z = lerp(z, lz, w);
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
      // Above the crotch the seat blends from one thigh to the other; below it, each leg
      // rides with its own thigh and shin, bending at the knee.
      const legShare = side ? 1 : 1 - THREE.MathUtils.smoothstep(y, bones.crotchY - 0.02, bones.hipY + 0.06);
      const left = side ? (side > 0 ? 1 : 0) : THREE.MathUtils.clamp((x + 0.03) / 0.06, 0, 1);
      const knee = 1 - THREE.MathUtils.smoothstep(y, bones.kneeY - 0.07, bones.kneeY + 0.06);
      packWeights([
        [bones.hips, 1 - legShare],
        [bones.thigh[1], legShare * left * (1 - knee)],
        [bones.shin[1], legShare * left * knee],
        [bones.thigh[-1], legShare * (1 - left) * (1 - knee)],
        [bones.shin[-1], legShare * (1 - left) * knee],
      ], joints, weights, i);
    }
    return { geometry: garmentGeometry(source, out, joints, weights), material: garmentMaterial(source) };
  });
}

/* ---------- Dressing her ---------- */
// The pose the clothes are bound in: her rig at rest (legs hanging straight), with her
// arms lowered to the sweater's angle. Each bone's inverse there maps a garment point in
// game space onto that bone.
function garmentBind(data) {
  const rig = buildRig(data);
  rig.armL.upper.rotation.z = Math.PI / 2 - OUTFIT.armDrop;
  rig.armR.upper.rotation.z = -(Math.PI / 2 - OUTFIT.armDrop);
  rig.root.updateMatrixWorld(true);
  const offset = new THREE.Matrix4(), bind = new THREE.Matrix4();
  return data.names.map((name, i) => {
    const group = rig.segments.get(name) || rig.hips;
    offset.multiplyMatrices(rig.rests.get(group), bind.fromArray(data.inverses, i * 16).invert());
    return new THREE.Matrix4().multiplyMatrices(group.matrixWorld, offset).invert();
  });
}

// Swaps the clothes she came with for the sweater and jeans.
function dressMiku(parts, data) {
  const bone = (name) => data.names.indexOf(name);
  const hip = data.joint('thigh_twist.l');
  const legLength = hip.distanceTo(data.joint('leg_stretch.l'));
  const bones = {
    hips: bone('root.x'), chest: bone('spine_02.x'),
    upper: { 1: bone('arm_stretch.l'), [-1]: bone('arm_stretch.r') },
    fore: { 1: bone('forearm_stretch.l'), [-1]: bone('forearm_stretch.r') },
    thigh: { 1: bone('thigh_twist.l'), [-1]: bone('thigh_twist.r') },
    shin: { 1: bone('leg_stretch.l'), [-1]: bone('leg_stretch.r') },
    // At rest her legs hang straight down from the hip joints.
    hipX: hip.x, legZ: hip.z,
    hipY: hip.y,
    crotchY: hip.y - 0.07,
    kneeY: hip.y - legLength,
  };
  data.garmentInverses = garmentBind(data);
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].isCloth) parts.splice(i, 1);
  // Her bare legs are under the jeans now, and would only poke through them.
  for (const part of parts) {
    if (part.isHair || part.material === bootMaterial) continue;
    const pos = part.geometry.attributes.position, index = part.geometry.index.array;
    const hidden = (v) => {
      const y = pos.getY(v) * MODEL_SCALE, x = (pos.getX(v) - MODEL_CENTER.x) * MODEL_SCALE;
      return y > BOOT_TOP - 0.04 && y < 1.02 && Math.abs(x) < 0.25;
    };
    const kept = [];
    for (let t = 0; t < index.length; t += 3) {
      if (!(hidden(index[t]) && hidden(index[t + 1]) && hidden(index[t + 2]))) kept.push(index[t], index[t + 1], index[t + 2]);
    }
    if (kept.length !== index.length) part.geometry.setIndex(kept);
  }
  for (const piece of [...fitSweater(bones), ...fitJeans(bones)]) parts.push({ ...piece, isHair: false, isCloth: false, isOutfit: true, garment: true });
}
