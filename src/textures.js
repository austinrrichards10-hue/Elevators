// Procedural textures, so the game ships without any image files.
function seededRandom(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable fractal noise in the range 0..1.
function fbm(w, h, cellsX, cellsY, octaves, seed) {
  const rand = seededRandom(seed);
  const out = new Float32Array(w * h);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cx = cellsX << o, cy = cellsY << o;
    const lattice = new Float32Array(cx * cy).map(() => rand());
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * cy, y0 = Math.floor(fy), ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * cx, x0 = Math.floor(fx), tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const x1 = (x0 + 1) % cx, y1 = (y0 + 1) % cy;
        const a = lattice[y0 * cx + x0], b = lattice[y0 * cx + x1];
        const c = lattice[y1 * cx + x0], d = lattice[y1 * cx + x1];
        out[y * w + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  return out.map((v) => v / total);
}

function dataTexture(rgba, w, h, srgb) {
  const tex = new THREE.DataTexture(rgba, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function normalTexture(height, w, h, strength) {
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (height[y * w + ((x + 1) % w)] - height[y * w + ((x + w - 1) % w)]) * strength;
      const dy = (height[((y + 1) % h) * w + x] - height[((y + h - 1) % h) * w + x]) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      rgba[i] = (-dx / len) * 127.5 + 127.5;
      rgba[i + 1] = (-dy / len) * 127.5 + 127.5;
      rgba[i + 2] = (1 / len) * 127.5 + 127.5;
      rgba[i + 3] = 255;
    }
  }
  return dataTexture(rgba, w, h, false);
}

function colorTexture(w, h, shade, srgb = true) {
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = shade(i);
    rgba.set([r, g, b, 255], i * 4);
  }
  return dataTexture(rgba, w, h, srgb);
}

const lerp = (a, b, t) => a + (b - a) * t;

function snowTextures() {
  const size = 512;
  const soft = fbm(size, size, 4, 4, 5, 11);
  const grain = fbm(size, size, 96, 96, 2, 12);
  const height = soft.map((v, i) => v * 0.75 + grain[i] * 0.25);
  return {
    normal: normalTexture(height, size, size, 3.4),
    rough: colorTexture(size, size, (i) => {
      const r = 175 + grain[i] * 80;
      return [r, r, r];
    }, false),
    color: colorTexture(size, size, (i) => {
      const v = 228 + soft[i] * 27;
      return [v - 5, v - 2, Math.min(255, v + 4)];
    }),
  };
}

function barkTextures(birch) {
  const w = 256, h = 512;
  const ridges = fbm(w, h, 18, 3, 4, birch ? 21 : 22);
  const blotch = fbm(w, h, 8, 24, 3, 23);
  const height = birch ? blotch : ridges.map((v) => Math.pow(v, 1.4));
  return {
    normal: normalTexture(height, w, h, birch ? 2.5 : 7),
    color: colorTexture(w, h, (i) => {
      if (birch) {
        const mark = blotch[i] > 0.62;
        return mark ? [38, 36, 40] : [lerp(176, 226, ridges[i]), lerp(176, 224, ridges[i]), lerp(180, 226, ridges[i])];
      }
      const t = height[i];
      return [lerp(20, 88, t), lerp(16, 72, t), lerp(16, 62, t)];
    }),
  };
}

function stoneTextures() {
  const size = 256;
  const height = fbm(size, size, 6, 6, 5, 31);
  return {
    normal: normalTexture(height, size, size, 5),
    color: colorTexture(size, size, (i) => {
      const v = lerp(62, 132, height[i]);
      return [v, v + 2, v + 10];
    }),
  };
}

function canvasTexture(w, h, draw, srgb = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// A single spruce bough on a transparent card, trunk end at the bottom.
function boughTexture(seed, snow, needles) {
  const rand = seededRandom(seed);
  return canvasTexture(256, 512, (c, w, h) => {
    const needle = (x, y, angle, len) => {
      c.strokeStyle = needles[Math.floor(rand() * needles.length)];
      c.lineWidth = 1.6 + rand();
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
      c.stroke();
    };
    const twig = (x, y, angle, len, depth) => {
      const steps = Math.floor(len / 5);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = x + Math.sin(angle) * len * t, py = y - Math.cos(angle) * len * t;
        const reach = lerp(21, 9, t);
        for (const side of [-1, 1]) {
          for (let n = 0; n < 2; n++) needle(px, py, angle + side * (0.55 + rand() * 0.45), reach * (0.7 + rand() * 0.5));
        }
      }
      c.strokeStyle = '#231a14';
      c.lineWidth = depth === 0 ? 5 : 2.2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
      c.stroke();
      if (depth > 0) return;
      for (let i = 0; i < 12; i++) {
        const t = 0.06 + i * 0.075;
        const sideLen = lerp(125, 34, t) * (0.85 + rand() * 0.3);
        const bx = x + Math.sin(angle) * len * t, by = y - Math.cos(angle) * len * t;
        twig(bx, by, angle - 0.72 - rand() * 0.2, sideLen, 1);
        twig(bx, by, angle + 0.72 + rand() * 0.2, sideLen, 1);
      }
    };
    twig(w / 2, h - 2, 0, h * 0.94, 0);

    // Snow only rests on what already has foliage under it.
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < snow; i++) {
      const y = rand() * h;
      const spread = lerp(100, 18, 1 - y / h) * Math.min(1, (h - y) / 80 + 0.3);
      const x = w / 2 + (rand() - 0.5) * 2 * spread * 1.1;
      const r = 8 + rand() * 24;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(244,248,255,0.95)');
      g.addColorStop(0.65, 'rgba(226,235,252,0.72)');
      g.addColorStop(1, 'rgba(226,235,252,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

// Long fur strip: root at the top of the card, ragged tips at the bottom.
function furTexture(seed) {
  const rand = seededRandom(seed);
  return canvasTexture(128, 512, (c, w, h) => {
    for (let i = 0; i < 1100; i++) {
      const u = rand();
      const edge = 1 - Math.abs(u - 0.5) * 2;
      const len = h * (0.35 + rand() * 0.2 + edge * 0.5);
      const x = u * w;
      const y0 = rand() * len * 0.72;
      const shade = 200 + rand() * 55;
      c.strokeStyle = `rgb(${shade},${shade},${Math.min(255, shade + 6)})`;
      c.lineWidth = 1.1 + rand() * 1.5;
      c.beginPath();
      c.moveTo(x, y0);
      c.quadraticCurveTo(x + (rand() - 0.5) * 14, y0 + (len - y0) * 0.5, x + (rand() - 0.5) * 22, Math.min(len, h - 1));
      c.stroke();
    }
    c.globalCompositeOperation = 'source-atop';
    // Soft shading down the centre gives each strip some depth.
    const fall = c.createLinearGradient(0, 0, w, 0);
    fall.addColorStop(0, 'rgba(70,80,110,0.42)');
    fall.addColorStop(0.5, 'rgba(70,80,110,0)');
    fall.addColorStop(1, 'rgba(70,80,110,0.42)');
    c.fillStyle = fall;
    c.fillRect(0, 0, w, h);
  });
}

function softDotTexture() {
  return canvasTexture(64, 64, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  });
}

function mistTexture() {
  const size = 256;
  const noise = fbm(size, size, 3, 3, 5, 51);
  return canvasTexture(size, size, (c) => {
    const img = c.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x / size - 0.5) * 2, dy = (y / size - 0.5) * 2;
        const fade = Math.max(0, 1 - Math.hypot(dx, dy));
        const i = (y * size + x) * 4;
        img.data.set([255, 255, 255, Math.min(255, 255 * fade * fade * Math.pow(noise[y * size + x], 1.6) * 3)], i);
      }
    }
    c.putImageData(img, 0, 0);
  });
}

function verticalFadeTexture() {
  return canvasTexture(4, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}

const TEX = {
  snow: snowTextures(),
  bark: barkTextures(false),
  birch: barkTextures(true),
  stone: stoneTextures(),
  boughGreen: boughTexture(61, 26, ['#10251d', '#16302a', '#1c3a2c', '#0c1d18']),
  boughSnowy: boughTexture(62, 110, ['#16302a', '#1c3a2c', '#24463a']),
  fur: furTexture(71),
  softDot: softDotTexture(),
  mist: mistTexture(),
  beam: verticalFadeTexture(),
};
for (const t of [TEX.snow.normal, TEX.snow.rough, TEX.snow.color]) t.repeat.set(70, 70);
