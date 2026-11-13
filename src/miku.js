// Miku, at full detail with her original textures, from the packed model in models/miku.js.
// The source model stands in a T-pose with no skeleton, so her arms are swung down to her sides
// here, blending smoothly in across the shoulders so the mesh doesn't tear.
// She stands facing -z in her own space (the way a camera looks).
const Miku = (() => {
  // Measured from the source T-pose: each arm is a tube along z at y 1.19–1.29 (axis y ≈ 1.23),
  // meeting the body at |z| ≈ 0.17. Right behind it hang the twin tails (x < 0), whose front
  // edges come up to y ≈ 1.17 between |z| 0.17 and 0.28, so they must stay put.
  const SHOULDER_Y = 1.235, SHOULDER_Z = 0.165;
  const ARM_DROP = 1.3;    // radians the arms swing down from the T-pose (about 75°)

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // How much of a vertex belongs to an arm (source space: she faces +x, arms along ±z).
  function armWeight(x, y, az) {
    const joint = smooth(0.15, 0.21, az);                        // blend in across the shoulder joint
    if (joint <= 0) return 0;
    // Near the body: only the arm's own band of height (not the tails below it, not the head above).
    const band = smooth(1.15, 1.19, y) * (1 - smooth(1.30, 1.34, y)) * smooth(-0.05, -0.03, x);
    // Further out, past the tails: everything in front of them (the arm, the sleeve and its hanging cuff).
    const far = smooth(0.28, 0.30, az) * smooth(-0.01, 0.01, x);
    return joint * Math.max(band, far);
  }

  function lowerArms(pos, nor) {
    for (let i = 0; i < pos.length; i += 3) {
      const y = pos[i + 1], z = pos[i + 2];
      const w = armWeight(pos[i], y, Math.abs(z));
      if (w <= 0) continue;
      const s = Math.sign(z);
      const a = s * ARM_DROP * w;
      const c = Math.cos(a), sn = Math.sin(a);
      const dy = y - SHOULDER_Y, dz = z - s * SHOULDER_Z;
      pos[i + 1] = SHOULDER_Y + dy * c - dz * sn;
      pos[i + 2] = s * SHOULDER_Z + dy * sn + dz * c;
      pos[i] += 0.035 * w * Math.min(1, Math.abs(dz) / 0.4);   // hands hang a touch forward of the hips
      const ny = nor[i + 1], nz = nor[i + 2];
      nor[i + 1] = ny * c - nz * sn;
      nor[i + 2] = ny * sn + nz * c;
    }
  }

  function texture(bytes, info, srgb) {
    const tex = new THREE.Texture();
    tex.flipY = false;
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = 8;
    tex.channel = info.uv;
    const img = new Image();
    img.onload = () => { tex.image = img; tex.needsUpdate = true; URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(new Blob([bytes.subarray(info.off, info.off + info.len)], { type: info.mime }));
    return tex;
  }

  function build() {
    const { meta, data } = window.MIKU_MODEL;
    const raw = atob(data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const buf = bytes.buffer;
    window.MIKU_MODEL = null; // the 40 MB string isn't needed any more

    const t = meta.textures;
    const mat = new THREE.MeshStandardMaterial({
      map: texture(bytes, t.baseColorTexture, true),
      roughness: 0.85,
      metalness: 0,
    });
    if (t.metallicRoughnessTexture) mat.roughnessMap = texture(bytes, t.metallicRoughnessTexture, false);

    const inner = new THREE.Group();
    for (const p of meta.prims) {
      const pos = new Float32Array(buf, p.pos, p.vcount * 3);
      const nor = new Float32Array(buf, p.nor, p.vcount * 3);
      if (!/[?&]tpose/.test(location.search)) lowerArms(pos, nor);   // ?tpose shows the source pose, for checking
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, p.uv0, p.vcount * 2), 2));
      if (p.uv1 >= 0) g.setAttribute('uv1', new THREE.BufferAttribute(new Float32Array(buf, p.uv1, p.vcount * 2), 2));
      g.setIndex(new THREE.BufferAttribute(p.idx32 ? new Uint32Array(buf, p.idx, p.icount) : new Uint16Array(buf, p.idx, p.icount), 1));
      g.computeBoundingSphere();
      inner.add(new THREE.Mesh(g, mat));
    }
    inner.rotation.y = Math.PI / 2;   // from facing +x to facing -z
    const group = new THREE.Group();
    group.add(inner);
    return { group, height: meta.height };
  }

  // Loads the big model script after the page is up, so the start screen appears straight away.
  function load(onReady) {
    const s = document.createElement('script');
    s.src = 'models/miku.js';
    s.onload = () => setTimeout(() => onReady(build()), 0);
    s.onerror = () => onReady(null);
    document.body.appendChild(s);
  }

  return { load };
})();
