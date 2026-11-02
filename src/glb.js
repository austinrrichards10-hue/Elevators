// A small GLB reader: geometry, skin data and textures, without needing a module loader.
const COMPONENT_ARRAYS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const TYPE_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readGlb(base64) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const binStart = 20 + jsonLength + 8;
  const textureCache = new Map();

  const accessor = (index) => {
    const a = json.accessors[index];
    const bv = json.bufferViews[a.bufferView];
    const Type = COMPONENT_ARRAYS[a.componentType];
    const size = TYPE_SIZES[a.type];
    const start = binStart + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const stride = bv.byteStride || 0;
    const packed = size * Type.BYTES_PER_ELEMENT;
    const out = new Type(a.count * size);
    if (!stride || stride === packed) {
      out.set(new Type(bytes.buffer.slice(start, start + a.count * packed)));
    } else {
      for (let i = 0; i < a.count; i++) {
        out.set(new Type(bytes.buffer.slice(start + i * stride, start + i * stride + packed)), i * size);
      }
    }
    return { array: out, size, normalized: !!a.normalized };
  };

  const texture = (index) => {
    if (textureCache.has(index)) return textureCache.get(index);
    const image = json.images[json.textures[index].source];
    const bv = json.bufferViews[image.bufferView];
    const start = binStart + (bv.byteOffset || 0);
    const blob = new Blob([bytes.subarray(start, start + bv.byteLength)], { type: image.mimeType });
    const tex = new THREE.Texture();
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    const element = new Image();
    element.onload = () => { tex.image = element; tex.needsUpdate = true; URL.revokeObjectURL(element.src); };
    element.src = URL.createObjectURL(blob);
    textureCache.set(index, tex);
    return tex;
  };

  const geometry = (primitive) => {
    const geo = new THREE.BufferGeometry();
    const names = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', JOINTS_0: 'skinIndex', WEIGHTS_0: 'skinWeight' };
    for (const [key, name] of Object.entries(names)) {
      if (primitive.attributes[key] === undefined) continue;
      const a = accessor(primitive.attributes[key]);
      geo.setAttribute(name, new THREE.BufferAttribute(a.array, a.size, a.normalized));
    }
    if (primitive.indices !== undefined) geo.setIndex(new THREE.BufferAttribute(accessor(primitive.indices).array, 1));
    return geo;
  };

  return { json, accessor, texture, geometry };
}
