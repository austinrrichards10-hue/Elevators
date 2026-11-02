// Black tactical boots, worn with every skin. They're shaped from the character's own
// feet and shins, pushed out a little, so they fit exactly and bend with the ankles.
const BOOT_TOP = 0.3; // in game units, the height of the boot's cuff
const BOOT_LIGHT = new THREE.Vector3(0.3, 0.8, 0.5).normalize();
const SHIN = { knee: new THREE.Vector3(0.076, 0.481, 0.025), ankle: new THREE.Vector3(0.07, 0.102, -0.047) };
const gameToModel = modelToGame.clone().invert();
let bootMaterial = null;

// The sole sticks out further than the rest, for a heavy tread.
function buildBoots(bodyParts) {
  const top = BOOT_TOP / MODEL_SCALE;
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
      const push = (0.011 + (y < 0.03 ? 0.008 : 0) + (y > BOOT_TOP - 0.03 ? 0.004 : 0)) / MODEL_SCALE;
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
    const light = Math.max(0, nrm.getX(i) * BOOT_LIGHT.x + nrm.getY(i) * BOOT_LIGHT.y + nrm.getZ(i) * BOOT_LIGHT.z);
    const y = pos[i * 3 + 1] * MODEL_SCALE;
    let shade = (0.75 + 0.5 * light) * (y < 0.03 ? 0.55 : 1) * (rand() < 0.12 ? 1.6 : 1);
    if (y > BOOT_TOP - 0.03 && y < BOOT_TOP - 0.015) shade *= 0.6;
    colors.set([shade, shade * 0.97, shade * 0.95], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// Adds the boots as one more part, using the bare body parts' feet.
function addBoots(parts) {
  if (!bootMaterial) bootMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1c1f, vertexColors: true, side: THREE.DoubleSide });
  const body = parts.filter((p) => !p.isHair && !p.isCloth);
  parts.push({ geometry: buildBoots(body), material: bootMaterial, isHair: false, isCloth: false });
}
