// Miku's clothes: the oversized sweater and baggy jeans from models/clothing, in place of
// the outfit she came with. Both were modelled on a full-size person standing in an A-pose,
// so each is scaled down to her, the sleeves are lifted level with her arms (her bind pose
// is a T-pose, facing +Z), and every point is then skinned to the bones it should ride with.
const OUTFIT = {
  // The sweater's body: a point on the garment maps to `to + scale * (point - from)`.
  sweater: {
    from: new THREE.Vector3(0, 1.43, -0.03),
    to: new THREE.Vector3(0, 1.17, -0.004),
    scale: new THREE.Vector3(0.6, 0.72, 0.7),
    // The tall collar is pressed down above the shoulders, so it stops under her chin.
    collar: { from: 1.43, squash: 0.42 },
    // Each sleeve hangs from `pivot`, angled `drop` radians below level. It's turned level
    // and scaled to her arm: `along` down its length, `around` across it.
    sleeve: { pivot: new THREE.Vector3(0.2, 1.36, -0.06), drop: 0.5, along: 0.72, around: 0.56, blend: [-0.04, 0.07], armpit: 1.12 },
  },
  // The jeans: heights map through these pairs (garment, Miku), widths and depths scale.
  jeans: {
    heights: [[0, 0.012], [0.66, 0.79], [1.09, 0.995]],
    scale: { x: 0.8, z: 0.82 },
    crotch: 0.66, // in the garment: below this, each leg is its own tube
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

// A garment part as geometry in the model's own space, with light baked into its colours,
// since the character materials are unlit.
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
  geometry.applyMatrix4(gameToModel);
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
  const fit = OUTFIT.sweater, sleeve = fit.sleeve;
  const p = new THREE.Vector3(), body = new THREE.Vector3(), arm = new THREE.Vector3();
  const local = new THREE.Vector3();
  const elbowAt = (bones.elbowX - bones.shoulderX);
  return decodeGarment(SWEATER_MODEL).map((source) => {
    const src = source.positions, count = src.length / 3;
    const out = new Float32Array(src.length);
    const joints = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      p.fromArray(src, i * 3);
      // The body, scaled about the shoulders, with the collar pressed down.
      body.subVectors(p, fit.from).multiply(fit.scale).add(fit.to);
      if (p.y > fit.collar.from) body.y = fit.to.y + (p.y - fit.collar.from) * fit.scale.y * fit.collar.squash + (fit.collar.from - fit.from.y) * fit.scale.y;
      // The sleeve on this side, turned level about its pivot.
      const side = p.x < 0 ? -1 : 1;
      local.set(p.x - side * sleeve.pivot.x, p.y - sleeve.pivot.y, p.z - sleeve.pivot.z);
      const c = Math.cos(sleeve.drop), s = Math.sin(sleeve.drop);
      // Along the arm (outward and down), and the offsets across it.
      const along = side * local.x * c - local.y * s;
      const up = side * local.x * s + local.y * c;
      const pivotTo = new THREE.Vector3(side * sleeve.pivot.x, sleeve.pivot.y, sleeve.pivot.z).sub(fit.from).multiply(fit.scale).add(fit.to);
      arm.set(pivotTo.x + side * along * sleeve.along, pivotTo.y + up * sleeve.around, pivotTo.z + local.z * sleeve.around);
      // Below the armpits (the hem, the hanging straps) it's all body.
      const belowArm = Math.max(THREE.MathUtils.smoothstep(p.y, sleeve.armpit - 0.06, sleeve.armpit), THREE.MathUtils.smoothstep(Math.abs(p.x), 0.32, 0.42));
      const w = THREE.MathUtils.smoothstep(along, sleeve.blend[0], sleeve.blend[1]) * belowArm;
      p.lerpVectors(body, arm, w);
      p.toArray(out, i * 3);
      // Skin: the hem rides with the hips, the rest with the chest, the sleeves with the arms.
      const reach = Math.abs(p.x) - bones.shoulderX;
      const onArm = THREE.MathUtils.smoothstep(reach, -0.01, 0.05) * w;
      const elbow = THREE.MathUtils.smoothstep(reach, elbowAt - 0.04, elbowAt + 0.03);
      const waist = THREE.MathUtils.smoothstep(p.y, 0.93, 1.05);
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
  const fit = OUTFIT.jeans;
  const sources = decodeGarment(JEANS_MODEL);
  const legs = jeansLegs(sources, fit.crotch);
  const mapHeight = (y) => {
    const h = fit.heights;
    for (let i = 1; i < h.length; i++) {
      if (y <= h[i][0] || i === h.length - 1) return lerp(h[i - 1][1], h[i][1], (y - h[i - 1][0]) / (h[i][0] - h[i - 1][0]));
    }
    return y;
  };
  return sources.map((source, k) => {
    const src = source.positions, count = src.length / 3;
    const out = new Float32Array(src.length);
    const joints = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const x = src[i * 3] * fit.scale.x, y = mapHeight(src[i * 3 + 1]), z = src[i * 3 + 2] * fit.scale.z;
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
      // Above the crotch the seat blends from one thigh to the other; below it, each leg
      // rides with its own thigh and shin, bending at the knee.
      let side = legs[k][i];
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

// Swaps the clothes she came with for the sweater and jeans.
function dressMiku(parts, names, inverses) {
  const bone = (name) => names.indexOf(name);
  const data = {
    joint: (name) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(inverses, bone(name) * 16).invert()).applyMatrix4(modelToGame),
  };
  const bones = {
    hips: bone('root.x'), chest: bone('spine_02.x'),
    upper: { 1: bone('arm_stretch.l'), [-1]: bone('arm_stretch.r') },
    fore: { 1: bone('forearm_stretch.l'), [-1]: bone('forearm_stretch.r') },
    thigh: { 1: bone('thigh_twist.l'), [-1]: bone('thigh_twist.r') },
    shin: { 1: bone('leg_stretch.l'), [-1]: bone('leg_stretch.r') },
    shoulderX: data.joint('c_arm_twist_offset.l').x,
    elbowX: data.joint('forearm_stretch.l').x,
    hipY: data.joint('thigh_twist.l').y,
    crotchY: data.joint('thigh_twist.l').y - 0.07,
    kneeY: data.joint('leg_stretch.l').y,
  };
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
  for (const piece of [...fitSweater(bones), ...fitJeans(bones)]) parts.push({ ...piece, isHair: false, isCloth: false, isOutfit: true });
}
