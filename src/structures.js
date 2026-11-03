// What stands at each site, built in code: the lookout tower, Henrik's cabin, the station
// huts, the lake shacks, the radio mast, the Dakota, the climbers' last camp, the stones at
// the altar, the chapel, the mine and Varga's launch frame at the Breath. Each site also
// has one of Varga's red flags over the cache she left there.
//
// Every builder runs twice: once at load time as a dry "plan", which only records where the
// colliders and the site's items go (tiles and pickups read those before the game starts),
// and again from SITE_BUILDERS when the site is built for real. Both runs make the same calls
// in the same order, so the walls and the things lying by them always agree.

/* ---------- Config ---------- */
const STRUCT = {
  flagHeight: 2.8, // top of a red flag's pole
  wallStep: 0.62, // spacing of the small circles that stand in for a wall
  wallRadius: 0.36,
  fadeReach: 1.7, // walls closer than this to the line from the camera to her dissolve
};

// Fog-free beacons sit this high above their site (the explorer draws them).
const SITE_BEACON_HEIGHTS = { lookout: 15, radio: 38.4 };

// Walls between the camera and her dissolve, the way branches do in front of the camera.
// The animators keep these pointed at her while she plays.
const structFocus = { value: new THREE.Vector3(0, -1e5, 0) };
const structFade = { value: 0 };

/* ---------- Textures ---------- */
function structRepeat(tex) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Weathered boards running across the texture, with dark gaps, grain, knots and nails.
function structPlanksTexture() {
  const rand = seededRandom(401);
  return structRepeat(canvasTexture(256, 256, (c, w, h) => {
    const boards = 8, bh = h / boards;
    for (let i = 0; i < boards; i++) {
      const y0 = i * bh;
      const tone = 0.78 + rand() * 0.3;
      c.fillStyle = `rgb(${(150 * tone) | 0},${(134 * tone) | 0},${(114 * tone) | 0})`;
      c.fillRect(0, y0, w, bh);
      for (let g = 0; g < 16; g++) {
        const gy = y0 + rand() * bh;
        c.strokeStyle = `rgba(62,48,34,${0.08 + rand() * 0.2})`;
        c.lineWidth = 0.6 + rand() * 1.1;
        c.beginPath();
        c.moveTo(0, gy);
        c.bezierCurveTo(w * 0.3, gy + (rand() - 0.5) * 5, w * 0.7, gy + (rand() - 0.5) * 5, w, gy + (rand() - 0.5) * 3);
        c.stroke();
      }
      if (rand() < 0.5) {
        const kx = rand() * w, ky = y0 + bh * (0.3 + rand() * 0.4);
        c.fillStyle = 'rgba(58,40,26,0.7)';
        c.beginPath();
        c.ellipse(kx, ky, 3 + rand() * 4, 1.6 + rand() * 1.5, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = 'rgba(22,17,13,0.9)';
      c.fillRect(0, y0, w, 2);
      const jx = rand() * w;
      c.fillRect(jx, y0, 2, bh);
      c.fillStyle = 'rgba(34,34,38,0.95)';
      for (const nx of [jx - 5, jx + 7]) for (const ny of [y0 + 6, y0 + bh - 6]) c.fillRect(nx, ny, 2, 2);
    }
    // Sun and snow bleach the boards unevenly.
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(220,225,230,${rand() * 0.07})`;
      c.fillRect(rand() * w, rand() * h, 20 + rand() * 80, 4 + rand() * 20);
    }
  }));
}

// Painted steel panels, light grey so vertex colours can tint them red, white or green.
function structPanelTexture() {
  const rand = seededRandom(402);
  return structRepeat(canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#d8d8d8';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '120,120,120'},${rand() * 0.08})`;
      c.fillRect(rand() * w, rand() * h, 4 + rand() * 30, 2 + rand() * 10);
    }
    // Rust weeps down from every seam and rivet.
    for (let i = 0; i < 18; i++) {
      const x = rand() * w, y = rand() < 0.5 ? h / 2 : 0;
      const g = c.createLinearGradient(0, y, 0, y + 30 + rand() * 60);
      g.addColorStop(0, 'rgba(110,60,30,0.35)');
      g.addColorStop(1, 'rgba(110,60,30,0)');
      c.fillStyle = g;
      c.fillRect(x, y, 2 + rand() * 4, 90);
    }
    c.fillStyle = 'rgba(40,40,44,0.7)';
    c.fillRect(0, 0, w, 3);
    c.fillRect(0, h / 2, w, 2);
    c.fillRect(0, 0, 3, h);
    c.fillRect(w / 2, 0, 2, h);
    c.fillStyle = 'rgba(70,70,74,0.9)';
    for (let x = 8; x < w; x += 16) for (const y of [6, h / 2 + 5]) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
    // Paint flaked off to bare grey metal here and there.
    for (let i = 0; i < 14; i++) {
      c.fillStyle = 'rgba(120,124,130,0.55)';
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 2 + rand() * 9, 1 + rand() * 5, rand() * 3, 0, 7);
      c.fill();
    }
  }));
}

// Corrugated iron: ridges run up the sheet, rust streaks down from the top.
function structCorrugatedTextures() {
  const rand = seededRandom(403);
  const w = 128, h = 128, ridges = 8;
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) height[y * w + x] = 0.5 + 0.5 * Math.sin((x / w) * ridges * Math.PI * 2);
  const color = structRepeat(canvasTexture(w, h, (c) => {
    for (let x = 0; x < w; x++) {
      const v = 120 + 50 * Math.sin((x / w) * ridges * Math.PI * 2);
      c.fillStyle = `rgb(${v | 0},${(v + 4) | 0},${(v + 10) | 0})`;
      c.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 22; i++) {
      const x = rand() * w, len = 20 + rand() * 100;
      const g = c.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, 'rgba(120,58,24,0.6)');
      g.addColorStop(1, 'rgba(120,58,24,0)');
      c.fillStyle = g;
      c.fillRect(x, 0, 2 + rand() * 6, len);
    }
    c.fillStyle = 'rgba(60,40,30,0.5)';
    c.fillRect(0, h - 3, w, 3);
  }));
  return { color, normal: normalTexture(height, w, h, 1.6) };
}

// Woven canvas, pale so tents and sacks can be tinted any colour.
function structClothTexture() {
  const rand = seededRandom(404);
  return structRepeat(canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#e4e0d6';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 2) {
      c.fillStyle = `rgba(90,80,64,${0.05 + rand() * 0.08})`;
      c.fillRect(i, 0, 1, h);
      c.fillRect(0, i, w, 1);
    }
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `rgba(80,70,55,${rand() * 0.12})`;
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 4 + rand() * 18, 3 + rand() * 12, rand() * 3, 0, 7);
      c.fill();
    }
  }));
}

// A strip of cloth with a frayed, torn free end on the right, for flags and tatters.
function structFrayTexture() {
  const rand = seededRandom(405);
  return canvasTexture(128, 64, (c, w, h) => {
    c.fillStyle = '#f4efe8';
    c.beginPath();
    c.moveTo(0, 0);
    let x = w * 0.82;
    c.lineTo(x, 0);
    for (let y = 0; y <= h; y += 4) c.lineTo(w * (0.74 + rand() * 0.26), y);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < w; i += 2) { c.fillStyle = `rgba(80,30,20,${0.04 + rand() * 0.06})`; c.fillRect(i, 0, 1, h); }
    for (let i = 0; i < 12; i++) {
      c.fillStyle = `rgba(60,20,15,${0.05 + rand() * 0.12})`;
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 4 + rand() * 12, 2 + rand() * 6, 0, 0, 7);
      c.fill();
    }
    // A hem down the pole edge.
    c.fillStyle = 'rgba(60,20,15,0.25)';
    c.fillRect(0, 0, 7, h);
    // A couple of holes worn through.
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(w * (0.45 + rand() * 0.3), h * (0.2 + rand() * 0.6), 1.5 + rand() * 2.5, 0, 7); c.fill(); }
  });
}

// Lake ice: dark clear patches, frosted grey ice, cracks and drifts of snow.
function structIceTexture() {
  const rand = seededRandom(406);
  const size = 512;
  const noise = fbm(size, size, 4, 4, 5, 407);
  return structRepeat(canvasTexture(size, size, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const n = noise[i];
      const snow = THREE.MathUtils.smoothstep(n, 0.6, 0.72);
      const clear = 1 - THREE.MathUtils.smoothstep(n, 0.38, 0.52);
      const r = lerp(lerp(112, 40, clear), 232, snow), g = lerp(lerp(140, 70, clear), 238, snow), b = lerp(lerp(166, 104, clear), 250, snow);
      img.data.set([r, g, b, 255], i * 4);
    }
    c.putImageData(img, 0, 0);
    const crack = (x, y, a, len, width) => {
      c.strokeStyle = `rgba(235,245,255,${0.35 + rand() * 0.35})`;
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < len; s += 6) {
        a += (rand() - 0.5) * 0.7;
        x += Math.cos(a) * 6;
        y += Math.sin(a) * 6;
        c.lineTo(x, y);
        if (rand() < 0.06 && width > 0.6) crack(x, y, a + (rand() < 0.5 ? 1 : -1), len * 0.4, width * 0.6);
      }
      c.stroke();
    };
    for (let i = 0; i < 14; i++) crack(rand() * w, rand() * h, rand() * 6.28, 80 + rand() * 220, 1.4);
  }));
}

// A painted board with lettering, aged by weather. `lines` are [text, size] pairs.
function structSignTexture(lines, { w = 512, h = 256, board = '#4d3b2c', ink = '#efe6d2', font = 'Georgia, serif', border = true } = {}) {
  const rand = seededRandom(lines.length * 97 + w);
  return canvasTexture(w, h, (c) => {
    c.fillStyle = board;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      c.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.12})`;
      c.lineWidth = 1 + rand() * 2;
      const y = rand() * h;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y + (rand() - 0.5) * 6);
      c.stroke();
    }
    if (border) { c.strokeStyle = ink; c.globalAlpha = 0.55; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28); c.globalAlpha = 1; }
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const total = lines.reduce((s, [, size]) => s + size * 1.25, 0);
    let y = h / 2 - total / 2;
    for (const [text, size] of lines) {
      y += size * 0.625;
      c.font = `bold ${size}px ${font}`;
      c.fillText(text, w / 2, y);
      y += size * 0.625;
    }
    // Paint worn off by years of snow.
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `rgba(${rand() < 0.5 ? '30,24,18' : '200,200,205'},${rand() * 0.16})`;
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 2 + rand() * 16, 1 + rand() * 6, rand() * 3, 0, 7);
      c.fill();
    }
  });
}

// Words cut into grey stone: a dark groove with a pale lip below it, as if lit from above.
function structCarvedTexture(lines) {
  const rand = seededRandom(408);
  return canvasTexture(384, 512, (c, w, h) => {
    const noise = fbm(96, 128, 6, 8, 4, 409);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 96; x++) {
        const v = 92 + noise[y * 96 + x] * 70;
        c.fillStyle = `rgb(${v | 0},${(v + 3) | 0},${(v + 9) | 0})`;
        c.fillRect(x * 4, y * 4, 4, 4);
      }
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let y = 64;
    for (const [text, size] of lines) {
      c.font = `${size}px Georgia, serif`;
      c.fillStyle = 'rgba(210,215,222,0.55)';
      c.fillText(text, w / 2 + 1, y + 2);
      c.fillStyle = 'rgba(28,28,34,0.85)';
      c.fillText(text, w / 2, y);
      y += size * 1.45;
    }
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `rgba(160,190,150,${rand() * 0.12})`;
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 6 + rand() * 30, 4 + rand() * 18, 0, 0, 7);
      c.fill();
    }
  });
}

// Leaded panes for the chapel: deep blues and reds around a pale star.
function structStainedTexture() {
  const rand = seededRandom(410);
  return canvasTexture(64, 160, (c, w, h) => {
    const colours = ['#1c3f8c', '#2a5bb0', '#8c1c24', '#b8862a', '#2f6e3a', '#5a2a7a'];
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        c.fillStyle = colours[Math.floor(rand() * colours.length)];
        c.beginPath();
        c.moveTo(x + 8, y);
        c.lineTo(x + 16, y + 8);
        c.lineTo(x + 8, y + 16);
        c.lineTo(x, y + 8);
        c.closePath();
        c.fill();
        c.fillStyle = colours[Math.floor(rand() * colours.length)];
        c.fillRect(x, y, 3, 3);
      }
    }
    c.fillStyle = '#f2e6b8';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 7 : 16;
      c.lineTo(w / 2 + Math.cos(a) * r, 50 + Math.sin(a) * r);
    }
    c.fill();
    c.strokeStyle = '#141414';
    c.lineWidth = 2;
    for (let y = 0; y <= h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let x = 0; x <= w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  });
}

// A hare pelt stretched flat: white fur, a darker spine, on a clear card.
function structPeltTexture() {
  const rand = seededRandom(411);
  return canvasTexture(128, 160, (c, w, h) => {
    for (let i = 0; i < 1400; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
      const x = w / 2 + Math.cos(a) * r * w * 0.42, y = h / 2 + Math.sin(a) * r * h * 0.44;
      const v = 215 + rand() * 40 - (Math.abs(x - w / 2) < 8 ? 40 : 0);
      c.strokeStyle = `rgb(${v | 0},${v | 0},${Math.min(255, v + 8) | 0})`;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rand() - 0.5) * 6, y + 4 + rand() * 5);
      c.stroke();
    }
  });
}

// Riveted aluminium skin for the Dakota.
function structAlloyTexture() {
  const rand = seededRandom(412);
  return structRepeat(canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#b4b8bc';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '70,74,80'},${0.05 + rand() * 0.1})`;
      c.fillRect((i % 4) * 64, Math.floor(i / 4) * 128, 64, 128);
    }
    c.strokeStyle = 'rgba(60,62,66,0.7)';
    c.lineWidth = 1.5;
    for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = 'rgba(70,72,76,0.8)';
    for (let x = 0; x < w; x += 64) for (let y = 4; y < h; y += 8) { c.fillRect(x + 3, y, 1.5, 1.5); c.fillRect(x + 61, y, 1.5, 1.5); }
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(50,40,30,${rand() * 0.18})`;
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 4 + rand() * 30, 2 + rand() * 12, rand() * 3, 0, 7);
      c.fill();
    }
  }));
}

// A soft round fade, dark at the heart, for the bare wet ground around the vents.
function structScorchTexture() {
  return canvasTexture(256, 256, (c, w) => {
    const rand = seededRandom(413);
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 60; i++) {
      const a = rand() * 6.28, r = (0.55 + rand() * 0.45) * w / 2;
      c.fillStyle = `rgba(0,0,0,${0.2 + rand() * 0.5})`;
      c.beginPath();
      c.arc(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 4 + rand() * 16, 0, 7);
      c.fill();
    }
  });
}

/* ---------- Materials ---------- */
// Standard materials whose fragments dissolve where they come between the camera and her,
// and right in front of the camera, so she can walk into a cabin and still be seen.
function structFadeMaterial(params) {
  const material = new THREE.MeshStandardMaterial(params);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uStructFocus = structFocus;
    shader.uniforms.uStructFade = structFade;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'varying vec3 vStructWorld;\n#include <common>')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvStructWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', 'uniform vec3 uStructFocus;\nuniform float uStructFade;\nvarying vec3 vStructWorld;\n#include <common>')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (uStructFade > 0.0) {
          vec3 toFocus = uStructFocus - cameraPosition;
          float focusDist = max(length(toFocus), 0.001);
          vec3 rel = vStructWorld - cameraPosition;
          float along = dot(rel, toFocus / focusDist);
          float off = length(rel - toFocus / focusDist * along);
          float block = step(0.0, along) * (1.0 - smoothstep(focusDist - 0.8, focusDist - 0.25, along))
            * (1.0 - smoothstep(${(STRUCT.fadeReach * 0.6).toFixed(2)}, ${STRUCT.fadeReach.toFixed(2)}, off));
          float near = 1.0 - smoothstep(0.5, 1.4, length(rel));
          float cut = max(block, near) * uStructFade;
          if (cut > 0.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) < cut) discard;
        }`);
  };
  material.customProgramCacheKey = () => 'structfade';
  return material;
}

// Cloth that flutters: vertices ripple along their normal, more towards the free end (uv.x).
function structClothMaterial(params, amount) {
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...params });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'uniform float uTime;\n#include <common>')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 clothAt = modelMatrix * vec4(position, 1.0);
        float clothPhase = clothAt.x * 0.9 + clothAt.z * 0.7 + clothAt.y * 0.3;
        float flutter = sin(uTime * 6.3 - uv.x * 8.0 + clothPhase) * 0.65 + sin(uTime * 10.7 - uv.x * 14.0 + clothPhase * 1.7) * 0.35;
        float gust = 0.75 + 0.25 * sin(uTime * 0.5 + clothPhase * 0.2);
        transformed += objectNormal * flutter * gust * ${amount.toFixed(3)} * uv.x;`);
  };
  material.customProgramCacheKey = () => `structcloth${amount}`;
  return material;
}

// Metres of surface each material's texture covers, for the box-projected UVs.
const STRUCT_TILE = {
  woodV: 2.4, rime: 4,
  wood: 2.4, woodDark: 2.4, log: 2.2, stone: 3, metal: 1.6, paint: 2.6, cloth: 1.4, alloy: 3.2,
  snow: 330, cliff: 7, rust: 3, ice: 26, floor: 2.4,
};

let structMatCache = null;
function structMats() {
  if (structMatCache) return structMatCache;
  const planks = structPlanksTexture();
  const corrugated = structCorrugatedTextures();
  const fade = (params) => structFadeMaterial({ vertexColors: true, roughness: 0.9, ...params });
  structMatCache = {
    wood: fade({ map: planks, roughness: 0.92 }),
    woodDark: fade({ map: planks, color: 0x6d5f52, roughness: 0.95 }),
    floor: fade({ map: planks, color: 0x8a7a68, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    log: fade({ map: TEX.bark.color, normalMap: TEX.bark.normal, roughness: 0.95 }),
    stone: fade({ map: TEX.stone.color, normalMap: TEX.stone.normal, roughness: 0.92 }),
    cliff: fade({ map: TEX.stone.color, normalMap: TEX.stone.normal, roughness: 0.95, flatShading: true }),
    metal: fade({ map: corrugated.color, normalMap: corrugated.normal, metalness: 0.45, roughness: 0.6 }),
    paint: fade({ map: structPanelTexture(), roughness: 0.7, metalness: 0.15 }),
    woodV: fade({ map: structTurned(planks), color: 0x6a5446, roughness: 0.95 }),
    pane: new THREE.MeshStandardMaterial({ color: 0x9fb4c8, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.5 }),
    rime: fade({ color: 0xdfeeff, roughness: 0.35, metalness: 0.05, flatShading: true, emissive: 0x2a4a6a, emissiveIntensity: 0.25, envMapIntensity: 1.3 }),
    alloy: fade({ map: structAlloyTexture(), metalness: 0.55, roughness: 0.45, side: THREE.DoubleSide }),
    cloth: fade({ map: structClothTexture(), roughness: 1, side: THREE.DoubleSide }),
    iron: fade({ color: 0x3a3836, metalness: 0.7, roughness: 0.55 }),
    rust: fade({ color: 0x7a4b31, normalMap: TEX.stone.normal, metalness: 0.3, roughness: 0.85 }),
    bronze: fade({ color: 0x8c6a3c, metalness: 0.85, roughness: 0.38 }),
    rope: fade({ color: 0x9a8662, roughness: 1 }),
    glass: fade({ color: 0x1e2a36, metalness: 0.3, roughness: 0.1, envMapIntensity: 1.6 }),
    snow: fade({ color: 0xeef2fb, map: TEX.snow.color, normalMap: TEX.snow.normal, roughness: 0.95 }),
    black: fade({ color: 0x050506, roughness: 1 }),
    ice: fade({ map: structIceTexture(), roughness: 0.16, metalness: 0.05, envMapIntensity: 1.3, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    stained: fade({ map: structStainedTexture(), emissiveMap: null, emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.2 }),
    lamp: fade({ color: 0x302820, emissive: 0xffc27a, emissiveIntensity: 0.6, roughness: 0.3 }),
    beacon: fade({ color: 0x401010, emissive: 0xff2a14, emissiveIntensity: 1.2, roughness: 0.3 }),
    ember: fade({ color: 0x1a0904, emissive: 0xff5a1a, emissiveIntensity: 2.2, roughness: 0.9 }),
    starIron: fade({ color: 0x9fd8ff, emissive: 0x3fa8ff, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.2, flatShading: true }),
    flag: structClothMaterial({ map: structFrayTexture(), alphaTest: 0.5, vertexColors: true, roughness: 0.95, emissive: 0x3a0604, emissiveIntensity: 0.6 }, 0.07),
    tatter: structClothMaterial({ map: structFrayTexture(), alphaTest: 0.5, vertexColors: true, roughness: 1 }, 0.12),
    pelt: structClothMaterial({ map: structPeltTexture(), alphaTest: 0.4, roughness: 1 }, 0.015),
    scorch: new THREE.MeshStandardMaterial({ color: 0x24201e, map: structScorchTexture(), transparent: true, depthWrite: false, roughness: 0.4, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  };
  // Sunlight through the chapel glass: the panes glow a little from either side.
  structMatCache.stained.emissiveMap = structMatCache.stained.map;
  structMatCache.stained.emissiveIntensity = 0.45;
  return structMatCache;
}

// The same boards stood on end, for the chapel's tarred walls.
function structTurned(tex) {
  const turned = tex.clone();
  turned.center.set(0.5, 0.5);
  turned.rotation = Math.PI / 2;
  turned.needsUpdate = true;
  return turned;
}

// Signs each need their own texture, so they're their own meshes.
const structSignCache = new Map();
function structSignMaterial(key, make) {
  if (!structSignCache.has(key)) structSignCache.set(key, new THREE.MeshStandardMaterial({ map: make(), roughness: 0.85 }));
  return structSignCache.get(key);
}

/* ---------- Building kit ---------- */
// UVs projected from the box face each triangle faces, in metres / `tile`, so boards and
// panels keep their size whatever the size of the part.
function structProjectUv(geo, tile, du, dv) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / tile + du, v / tile + dv);
  }
}

const structM = new THREE.Matrix4(), structQ = new THREE.Quaternion(), structE = new THREE.Euler(0, 0, 0, 'YXZ');
const structS = new THREE.Vector3(), structP = new THREE.Vector3(), structUp = new THREE.Vector3(0, 1, 0);
const structDir = new THREE.Vector3();

// Gathers one site's parts per material, then merges each into a single mesh. In a plan run
// (`live` false) the geometry calls do nothing and only colliders, clearings and items count.
class StructKit {
  constructor(site, live, rot = 0) {
    this.site = site;
    this.live = live;
    this.rot = rot;
    this.cos = Math.cos(rot);
    this.sin = Math.sin(rot);
    this.base = groundHeight(site.x, site.z);
    this.rand = seededRandom(site.x * 7919 + site.z * 104729);
    this.parts = new Map();
    this.extra = [];
    this.anim = {};
  }

  // Site-local (x, z), turned by the site's rotation, to world coordinates.
  wx(lx, lz) { return this.site.x + lx * this.cos + lz * this.sin; }
  wz(lx, lz) { return this.site.z - lx * this.sin + lz * this.cos; }

  // Ground height at a local point, relative to the site's centre.
  ground(lx, lz) { return groundHeight(this.wx(lx, lz), this.wz(lx, lz)) - this.base; }

  // Lowest and highest ground under a footprint, so foundations can sink to hide gaps.
  footing(lx, lz, w, d, ry = 0) {
    let lo = Infinity, hi = -Infinity;
    const c = Math.cos(ry), s = Math.sin(ry);
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const ox = (i / 4 - 0.5) * w, oz = (j / 4 - 0.5) * d;
        const g = this.ground(lx + ox * c + oz * s, lz - ox * s + oz * c);
        lo = Math.min(lo, g);
        hi = Math.max(hi, g);
      }
    }
    return { lo, hi };
  }

  builder(mat) {
    if (!this.parts.has(mat)) this.parts.set(mat, new GeometryBuilder());
    return this.parts.get(mat);
  }

  // Adds a geometry. o: x y z, rx ry rz (YXZ), tint (number or [r, g, b]), uv (false keeps
  // the geometry's own UVs). The geometry is consumed.
  add(mat, geo, o = {}) {
    if (!this.live) return;
    const tile = STRUCT_TILE[mat];
    if (o.uv !== false && tile) structProjectUv(geo, tile, this.rand(), this.rand());
    structE.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
    structM.compose(structP.set(o.x || 0, o.y || 0, o.z || 0), structQ.setFromEuler(structE), structS.set(1, 1, 1));
    const b = this.builder(mat);
    const start = b.color.length;
    b.addMesh(geo, structM, 1);
    geo.dispose();
    const tint = o.tint === undefined ? 1 : o.tint;
    const [r, g, bl] = typeof tint === 'number' ? [tint, tint, tint] : tint;
    if (r !== 1 || g !== 1 || bl !== 1) for (let i = start; i < b.color.length; i += 3) { b.color[i] = r; b.color[i + 1] = g; b.color[i + 2] = bl; }
  }

  box(mat, w, h, d, o) { if (this.live) this.add(mat, new THREE.BoxGeometry(w, h, d), o); }
  cyl(mat, rTop, rBottom, h, o, sides = 10, open = false) { if (this.live) this.add(mat, new THREE.CylinderGeometry(rTop, rBottom, h, sides, 1, open), o); }

  // A round rod between two local points [x, y, z].
  rod(mat, a, b, r, sides = 6, o = {}) {
    if (!this.live) return;
    structDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = structDir.length();
    const geo = new THREE.CylinderGeometry(r * (o.taper || 1), r, len, sides, 1, true);
    if (STRUCT_TILE[mat] && o.uv !== false) structProjectUv(geo, STRUCT_TILE[mat], this.rand(), this.rand());
    structQ.setFromUnitVectors(structUp, structDir.normalize());
    structM.compose(structP.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), structQ, structS.set(1, 1, 1));
    geo.applyMatrix4(structM);
    this.add(mat, geo, { uv: false, tint: o.tint });
  }

  // A squared beam between two local points, its depth turned to face `roll`.
  beam(mat, a, b, w, d = w, o = {}) {
    if (!this.live) return;
    structDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = structDir.length();
    const geo = new THREE.BoxGeometry(w, len, d);
    if (STRUCT_TILE[mat]) structProjectUv(geo, STRUCT_TILE[mat], this.rand(), this.rand());
    if (o.roll) geo.rotateY(o.roll);
    structQ.setFromUnitVectors(structUp, structDir.normalize());
    structM.compose(structP.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), structQ, structS.set(1, 1, 1));
    geo.applyMatrix4(structM);
    this.add(mat, geo, { uv: false, tint: o.tint });
  }

  // A sheet laid over the ground's shape, `lift` above it, for floors, ice and paths.
  drape(mat, lx, lz, w, d, ry = 0, lift = 0.04, step = 1, o = {}) {
    if (!this.live) return;
    const geo = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / step)), Math.max(1, Math.ceil(d / step))).rotateX(-Math.PI / 2);
    if (STRUCT_TILE[mat] && o.uv !== false) structProjectUv(geo, STRUCT_TILE[mat], this.rand(), this.rand());
    geo.rotateY(ry);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, this.ground(lx + p.getX(i), lz + p.getZ(i)) + lift);
    geo.computeVertexNormals();
    this.add(mat, geo, { x: lx, z: lz, uv: false, tint: o.tint });
  }

  // A heap of snow banked against something, sunk into the ground.
  // Its height eases to nothing at the rim, so it melts into the ground around it.
  drift(lx, lz, w, h, d, ry = 0) {
    if (!this.live) return;
    const geo = new THREE.RingGeometry(0.001, 1, 18, 6).rotateX(-Math.PI / 2);
    const p = geo.attributes.position, c = Math.cos(ry), s = Math.sin(ry);
    for (let i = 0; i < p.count; i++) {
      const ux = p.getX(i), uz = p.getZ(i), rr = Math.min(1, Math.hypot(ux, uz));
      const x = ux * w / 2, z = uz * d / 2;
      const ox = x * c + z * s, oz = -x * s + z * c;
      p.setXYZ(i, ox, this.ground(lx + ox, lz + oz) + h * (1 - rr * rr) ** 2 - 0.03, oz);
    }
    geo.computeVertexNormals();
    this.add('snow', geo, { x: lx, z: lz });
  }

  // A stand-alone object (something that moves, or has its own material).
  object(obj, lx = 0, y = 0, lz = 0, ry = 0) {
    if (!this.live) return obj;
    obj.position.set(lx, y, lz);
    obj.rotation.y = ry;
    this.extra.push(obj);
    return obj;
  }

  /* Colliders, clearings and items only count in the plan run. */
  collide(lx, lz, r, h = 3) {
    if (!this.live) LANDMARK_COLLIDERS.push({ x: this.wx(lx, lz), z: this.wz(lx, lz), r, h });
  }

  // A row of small circles from a to b, standing in for a wall or a fence.
  collideLine(ax, az, bx, bz, h = 3, r = STRUCT.wallRadius) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / STRUCT.wallStep));
    for (let i = 0; i <= n; i++) this.collide(lerp(ax, bx, i / n), lerp(az, bz, i / n), r, h);
  }

  // The four walls of a box footprint, with an optional gap: { side: 'n'|'s'|'e'|'w', at, width }.
  // Sides: s is +z, n is -z, e is +x, w is -x, in the footprint's own turned frame.
  collideWalls(lx, lz, w, d, ry = 0, h = 3, gap = null) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const pt = (ox, oz) => [lx + ox * c + oz * s, lz - ox * s + oz * c];
    const hw = w / 2, hd = d / 2;
    const sides = { s: [[-hw, hd], [hw, hd]], n: [[hw, -hd], [-hw, -hd]], e: [[hw, hd], [hw, -hd]], w: [[-hw, -hd], [-hw, hd]] };
    for (const [name, [a, b]] of Object.entries(sides)) {
      if (gap && gap.side === name) {
        // `at` runs along the side from its first corner, measured from the side's middle.
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        // The circles either side stop short of the opening, so all of its width is free.
        const half = gap.width / 2 + STRUCT.wallRadius;
        // `at` runs towards +x or +z, like the hut's own; the n and e sides run the other way.
        const at = name === 'n' || name === 'e' ? -gap.at : gap.at;
        const t0 = (len / 2 + at - half) / len, t1 = (len / 2 + at + half) / len;
        const mid0 = [lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], mid1 = [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)];
        if (t0 > 0.02) this.collideLine(...pt(...a), ...pt(...mid0), h);
        if (t1 < 0.98) this.collideLine(...pt(...mid1), ...pt(...b), h);
      } else {
        this.collideLine(...pt(...a), ...pt(...b), h);
      }
    }
  }

  clear(lx, lz, r) {
    if (!this.live) CLEARINGS.push([{ x: this.wx(lx, lz), z: this.wz(lx, lz) }, r]);
  }

  // A pickup at a local spot. `y` is the local height of whatever it stands on.
  item(id, lx, lz, o = {}) {
    if (this.live) return;
    const entry = { item: id, x: this.wx(lx, lz), z: this.wz(lx, lz) };
    if (o.y !== undefined) entry.y = this.base + o.y;
    if (o.count) entry.count = o.count;
    WORLD_ITEMS.push(entry);
  }

  // Merges everything into the site's group.
  finish() {
    const group = new THREE.Group();
    const inner = new THREE.Group();
    inner.rotation.y = this.rot;
    group.add(inner);
    const mats = structMats();
    for (const [name, b] of this.parts) {
      const geo = b.build();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats[name]);
      mesh.castShadow = !['snow', 'floor', 'ice', 'scorch', 'flag', 'tatter', 'pelt', 'glass', 'lamp', 'beacon', 'ember'].includes(name);
      mesh.receiveShadow = true;
      mesh.name = name;
      inner.add(mesh);
    }
    for (const obj of this.extra) inner.add(obj);
    group.userData.anim = this.anim;
    group.userData.inner = inner;
    return group;
  }
}

/* ---------- Props ---------- */
// The wind comes from the west, so every flag and windsock streams towards world +x, the
// same way the snow drifts.
function structWindYaw(kit) { return -kit.rot; }

// One of Varga's caches: a pole with a faded red flag, a little cairn at its foot, the part
// she left 1 m from the pole and the journal page beside it.
function structFlag(kit, lx, lz, part, note, partAt = 0.6) {
  const g = kit.ground(lx, lz);
  kit.rod('iron', [lx, g - 0.3, lz], [lx, g + STRUCT.flagHeight, lz], 0.025, 6);
  kit.cyl('iron', 0.04, 0.04, 0.06, { x: lx, y: g + STRUCT.flagHeight + 0.02, z: lz }, 6);
  if (kit.live) {
    const cloth = new THREE.PlaneGeometry(0.95, 0.58, 10, 3).translate(0.475, 0, 0);
    kit.add('flag', cloth, { x: lx, y: g + STRUCT.flagHeight - 0.34, z: lz, ry: structWindYaw(kit) + 0.25, uv: false, tint: [0.86, 0.11, 0.08] });
    // A ribbon of the same red tied lower down, so the pole reads even when the flag hangs.
    const ribbon = new THREE.PlaneGeometry(0.4, 0.07, 5, 1).translate(0.2, 0, 0);
    kit.add('flag', ribbon, { x: lx, y: g + 1.3, z: lz, ry: structWindYaw(kit) - 0.4, uv: false, tint: [0.8, 0.1, 0.07] });
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + kit.rand() * 0.4, d = 0.22 + kit.rand() * 0.12;
    const s = 0.11 + kit.rand() * 0.08;
    if (kit.live) kit.add('stone', new THREE.IcosahedronGeometry(s, 0), { x: lx + Math.cos(a) * d, y: kit.ground(lx + Math.cos(a) * d, lz + Math.sin(a) * d) + s * 0.4, z: lz + Math.sin(a) * d, rx: kit.rand() * 3, ry: kit.rand() * 3, uv: false, tint: 0.9 });
  }
  kit.collide(lx, lz, 0.32, 1.2);
  kit.anim.flags = (kit.anim.flags || 0) + 1;
  if (part) kit.item(`part:${part}`, lx + Math.sin(partAt), lz + Math.cos(partAt));
  if (note) kit.item(`note:${note}`, lx + Math.sin(partAt + 2.1) * 1.05, lz + Math.cos(partAt + 2.1) * 1.05);
}

// A wooden crate with a darker frame around each face. Returns the height of its lid.
function structCrate(kit, lx, lz, size = 0.7, ry = 0, y = null, collide = true) {
  const base = y === null ? kit.ground(lx, lz) - 0.05 : y;
  kit.box('wood', size, size, size, { x: lx, y: base + size / 2, z: lz, ry, tint: 0.95 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) kit.box('woodDark', 0.07, size + 0.02, 0.07, { x: lx + (sx * Math.cos(ry) + sz * Math.sin(ry)) * size / 2, y: base + size / 2, z: lz + (-sx * Math.sin(ry) + sz * Math.cos(ry)) * size / 2, ry });
  }
  kit.box('woodDark', size + 0.04, 0.07, size + 0.04, { x: lx, y: base + size - 0.02, z: lz, ry });
  kit.box('snow', size * 0.92, 0.08, size * 0.9, { x: lx, y: base + size + 0.03, z: lz, ry: ry + 0.1 });
  if (collide) kit.collide(lx, lz, size * 0.62, base + size);
  return base + size;
}

// An oil drum, upright or on its side. `tint` is its paint colour.
function structDrum(kit, lx, lz, tint, lying = false, ry = 0) {
  const g = kit.ground(lx, lz);
  if (lying) {
    kit.cyl('paint', 0.29, 0.29, 0.88, { x: lx, y: g + 0.25, z: lz, ry, rz: Math.PI / 2, tint }, 12);
    for (const t of [-0.3, 0.3]) kit.cyl('rust', 0.3, 0.3, 0.035, { x: lx + Math.cos(ry) * t, y: g + 0.25, z: lz - Math.sin(ry) * t, ry, rz: Math.PI / 2 }, 12);
  } else {
    kit.cyl('paint', 0.29, 0.29, 0.88, { x: lx, y: g + 0.42, z: lz, ry, tint }, 12);
    for (const t of [0.22, 0.62]) kit.cyl('rust', 0.3, 0.3, 0.035, { x: lx, y: g + t, z: lz }, 12);
    kit.cyl('snow', 0.27, 0.29, 0.06, { x: lx, y: g + 0.88, z: lz }, 12);
  }
  kit.collide(lx, lz, lying ? 0.5 : 0.34, 0.9);
}

// Split logs stacked against a wall, snow on top.
function structWoodpile(kit, lx, lz, length, ry = 0, rows = 4) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const g = kit.footing(lx, lz, length, 0.7, ry).lo;
  for (let row = 0; row < rows; row++) {
    const count = Math.round(length / 0.24) - row;
    for (let i = 0; i < count; i++) {
      const t = (i - (count - 1) / 2) * 0.24;
      const along = t + (kit.rand() - 0.5) * 0.04;
      kit.cyl('log', 0.1, 0.1, 0.6 + kit.rand() * 0.15, { x: lx + c * along, y: g + 0.1 + row * 0.19, z: lz - s * along, ry: ry + Math.PI / 2 + (kit.rand() - 0.5) * 0.1, rx: Math.PI / 2 }, 6);
    }
  }
  kit.box('snow', length * 0.95, 0.1, 0.62, { x: lx, y: g + rows * 0.19 + 0.04, z: lz, ry });
  kit.collideLine(lx - c * length / 2, lz + s * length / 2, lx + c * length / 2, lz - s * length / 2, rows * 0.19 + 0.2, 0.42);
}

// A painted board on two posts. Signs that are notes to read stand beside their note item.
function structSign(kit, key, lines, lx, lz, ry, { w = 1.6, h = 0.8, post = 1.3, board, ink, font, tex } = {}) {
  const g = kit.ground(lx, lz);
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const side of [-1, 1]) {
    const px = lx + c * side * w * 0.42, pz = lz - s * side * w * 0.42;
    kit.box('woodDark', 0.1, post + h + 0.4, 0.1, { x: px, y: kit.ground(px, pz) + (post + h) / 2 - 0.2, z: pz, ry });
  }
  kit.box('woodDark', w + 0.08, h + 0.08, 0.05, { x: lx - s * 0.035, y: g + post + h / 2, z: lz - c * 0.035, ry });
  kit.box('snow', w + 0.1, 0.06, 0.12, { x: lx, y: g + post + h + 0.07, z: lz, ry });
  if (kit.live) {
    const mat = structSignMaterial(key, () => tex ? tex() : structSignTexture(lines, { board, ink, font }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(lx + s * 0.002, g + post + h / 2, lz + c * 0.002);
    mesh.rotation.y = ry;
    mesh.receiveShadow = true;
    kit.extra.push(mesh);
  }
  kit.collideLine(lx - c * w * 0.42, lz + s * w * 0.42, lx + c * w * 0.42, lz - s * w * 0.42, post + h, 0.18);
}

// A box-shaped hut: walls of `wall` material (tinted), a gable or lean-to roof under snow, an
// optional door gap with the door hanging open, windows, and the colliders round it. Its
// floor is the bare ground inside, so things on it simply lie on the snow-dusted floor.
// Returns the hut's local frame helpers and its floor level.
function structHut(kit, o) {
  const { x, z, w, d, h = 2.3, ry = 0, wall = 'wood', tint = 1, roof = 'gable', pitch = 0.55, roofMat = 'metal', door = null, windows = [], trim = 'woodDark', floor = true, overhang = 0.35, collide = true } = o;
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (ox, oz) => [x + ox * c + oz * s, z - ox * s + oz * c];
  const { lo, hi } = kit.footing(x, z, w, d, ry);
  const bottom = lo - 0.25, top = hi + h;
  const t = 0.12;
  // A wall along the hut's local x (front/back) or z (sides), cut around a door.
  const wallPiece = (ox, oz, len, along, height, y) => {
    const [px, pz] = P(ox, oz);
    kit.box(wall, along === 'x' ? len : t, height, along === 'x' ? t : len, { x: px, y, z: pz, ry, tint });
  };
  const sides = { s: { oz: d / 2, along: 'x', len: w }, n: { oz: -d / 2, along: 'x', len: w }, e: { ox: w / 2, along: 'z', len: d }, w: { ox: -w / 2, along: 'z', len: d } };
  for (const [name, side] of Object.entries(sides)) {
    const height = top - bottom;
    const at = (u) => (side.along === 'x' ? [u, side.oz] : [side.ox, u]);
    if (door && door.side === name) {
      const a0 = -side.len / 2, a1 = door.at - door.width / 2, b0 = door.at + door.width / 2, b1 = side.len / 2;
      if (a1 - a0 > 0.05) wallPiece(...at((a0 + a1) / 2), a1 - a0, side.along, height, bottom + height / 2);
      if (b1 - b0 > 0.05) wallPiece(...at((b0 + b1) / 2), b1 - b0, side.along, height, bottom + height / 2);
      const doorTop = hi + 1.95;
      wallPiece(...at(door.at), door.width, side.along, top - doorTop, (top + doorTop) / 2);
      // Door frame and the door itself, swung open on its hinge.
      const [fx, fz] = P(...at(door.at));
      const out = side.along === 'x' ? Math.sign(side.oz) : Math.sign(side.ox);
      const wallYaw = ry + (side.along === 'x' ? 0 : Math.PI / 2);
      kit.box(trim, door.width + 0.2, 0.1, t + 0.06, { x: fx, y: doorTop + 0.05, z: fz, ry: wallYaw });
      // Along the side walls the wall's own x runs towards -z, so the hinge is at the other end.
      const hinge = P(...at(door.at - (side.along === 'x' ? 1 : -1) * door.width / 2));
      const swing = (door.open === undefined ? 1.25 : door.open) * out;
      const hx = hinge[0] + (Math.cos(wallYaw - swing) * door.width / 2), hz = hinge[1] - Math.sin(wallYaw - swing) * door.width / 2;
      kit.box(door.mat || trim, door.width - 0.04, 1.9, 0.05, { x: hx, y: hi + 0.95, z: hz, ry: wallYaw - swing, tint: door.tint || 1 });
    } else {
      wallPiece(...at(0), side.len + (side.along === 'x' ? t : -t), side.along, top - bottom, bottom + (top - bottom) / 2);
    }
  }
  // Corner posts and a skirt board hide the seams.
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [px, pz] = P(cx * w / 2, cz * d / 2);
    kit.box(trim, 0.16, top - bottom + 0.05, 0.16, { x: px, y: bottom + (top - bottom) / 2, z: pz, ry });
  }
  for (const win of windows) {
    const side = sides[win.side];
    const [px, pz] = P(...(side.along === 'x' ? [win.at, side.oz] : [side.ox, win.at]));
    const wallYaw = ry + (side.along === 'x' ? 0 : Math.PI / 2);
    const wy = hi + (win.y || 1.3);
    kit.box(win.mat || 'glass', win.w || 0.8, win.h || 0.7, t + 0.05, { x: px, y: wy, z: pz, ry: wallYaw });
    kit.box(trim, (win.w || 0.8) + 0.16, 0.08, t + 0.12, { x: px, y: wy - (win.h || 0.7) / 2 - 0.04, z: pz, ry: wallYaw });
    kit.box(trim, (win.w || 0.8) + 0.12, 0.07, t + 0.1, { x: px, y: wy + (win.h || 0.7) / 2 + 0.03, z: pz, ry: wallYaw });
    kit.box(trim, 0.05, win.h || 0.7, t + 0.08, { x: px, y: wy, z: pz, ry: wallYaw });
  }
  // The roof, with snow lying on it.
  if (roof === 'gable') {
    const run = d / 2 + overhang;
    const slab = run / Math.cos(pitch);
    const rise = (d / 2) * Math.tan(pitch);
    for (const side of [-1, 1]) {
      const [px, pz] = P(0, side * run / 2);
      const yMid = top + rise - (run / 2) * Math.tan(pitch) + 0.05;
      kit.box(roofMat, w + overhang * 2, 0.09, slab, { x: px, y: yMid, z: pz, ry, rx: side * pitch });
      // A dark lining under it: the sky light would otherwise show the roof pale from inside.
      kit.box('woodDark', w - 0.05, 0.03, (d / 2) / Math.cos(pitch), { x: P(0, side * d / 4)[0], y: top + rise / 2 - 0.08, z: P(0, side * d / 4)[1], ry, rx: side * pitch, tint: 0.28 });
      const [sx, sz] = P(0, side * (run / 2 - 0.05));
      kit.box('snow', w + overhang * 1.6, 0.14, slab * 0.92, { x: sx, y: yMid + 0.1, z: sz, ry, rx: side * pitch });
    }
    // Gable ends: triangles of the wall material.
    if (kit.live) {
      const tri = new THREE.Shape();
      tri.moveTo(-d / 2, 0);
      tri.lineTo(d / 2, 0);
      tri.lineTo(0, rise);
      tri.closePath();
      for (const side of [-1, 1]) {
        const geo = new THREE.ExtrudeGeometry(tri, { depth: t, bevelEnabled: false }).translate(0, 0, -t / 2).rotateY(Math.PI / 2);
        const [px, pz] = P(side * (w / 2), 0);
        kit.add(wall, geo, { x: px, y: top - 0.01, z: pz, ry, tint });
      }
    }
    kit.box(trim, w + overhang * 2 + 0.05, 0.12, 0.14, { x: x, y: top + rise + 0.02, z: z, ry });
  } else {
    // A lean-to: one slab falling to the back (-z) of the hut.
    const run = d + overhang * 2;
    const slab = run / Math.cos(pitch);
    const rise = d * Math.tan(pitch);
    kit.box(roofMat, w + overhang * 2, 0.09, slab, { x, y: top + rise / 2, z, ry, rx: -pitch });
    kit.box('woodDark', w - 0.05, 0.03, d / Math.cos(pitch), { x, y: top + rise / 2 - 0.08, z, ry, rx: -pitch, tint: 0.28 });
    kit.box('snow', w + overhang * 1.6, 0.14, slab * 0.92, { x, y: top + rise / 2 + 0.1, z, ry, rx: -pitch });
    // Side walls rise to meet the higher front.
    if (kit.live) {
      const tri = new THREE.Shape();
      tri.moveTo(-d / 2, 0);
      tri.lineTo(d / 2, 0);
      tri.lineTo(d / 2, rise);
      tri.closePath();
      for (const side of [-1, 1]) {
        const geo = new THREE.ExtrudeGeometry(tri, { depth: t, bevelEnabled: false }).translate(0, 0, -t / 2).rotateY(-Math.PI / 2);
        const [px, pz] = P(side * (w / 2), 0);
        kit.add(wall, geo, { x: px, y: top - 0.01, z: pz, ry, tint });
      }
      const [fx, fz] = P(0, d / 2);
      kit.box(wall, w, rise, t, { x: fx, y: top + rise / 2, z: fz, ry, tint });
    }
  }
  if (floor) kit.drape('floor', x, z, w - 0.2, d - 0.2, ry, 0.03, 0.8);
  kit.drift(...P(-w / 2 - 0.3, -d / 3), 1.4, 0.55, 2.2, ry);
  kit.drift(...P(w / 3, -d / 2 - 0.35), 2.4, 0.45, 1.2, ry);
  if (collide) kit.collideWalls(x, z, w, d, ry, top + 0.5, door && door.open !== 0 ? door : null);
  return { P, lo, hi, top, floor: hi };
}

// A rough stone heap or boulder.
function structBoulder(kit, lx, lz, size, squash = 0.7, tint = 1) {
  if (kit.live) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(p.getX(i) * 5.1 + p.getY(i) * 3.7 + p.getZ(i) * 4.3 + lx));
      p.setXYZ(i, p.getX(i) * k * size, p.getY(i) * k * size * squash, p.getZ(i) * k * size);
    }
    geo.computeVertexNormals();
    kit.add('cliff', geo, { x: lx, y: kit.ground(lx, lz) + size * squash * 0.25, z: lz, ry: kit.rand() * 6, uv: true, tint });
  }
  kit.collide(lx, lz, size * 0.85, size * squash * 1.2);
}

/* ---------- The crater wall ---------- */
// A buttress of the crater wall: a great rounded block of rock with a steep face towards the
// site, its ledges and top under snow. It's a superellipsoid centred at local (cx, cy, cz)
// with half sizes a (across), b (up) and c (deep), roughened by noise. `surface(x, y)` finds
// the point on its face at a given local x and height, so ropes and timbers can lie on it.
function structCrag(kit, { cx = 0, cz, a, b, c, cy = -8, p = 5, seed = 0 }) {
  const shape = (v) => Math.sign(v) * Math.pow(Math.abs(v), p - 1);
  const rough = (x, y, z) => 1.8 * valueNoise(x / 10 + seed, y / 8 + z / 13)
    + 0.8 * valueNoise(x / 4.2 - seed, z / 4.2 + y / 5)
    // Gullies running down the face.
    + 1.1 * valueNoise(x / 3.6 + seed * 2, y / 22)
    // Strata: a sawtooth in height leaves ledges for the snow to settle on.
    + 0.7 * (((y / 3.4 + 0.4 * valueNoise(x / 14, z / 14 + seed)) % 1 + 1) % 1);
  const place = (sx, sy, sz, out) => {
    const qx = cx + sx * a, qy = cy + sy * b, qz = cz + sz * c;
    let gx = shape(sx) / a, gy = shape(sy) / b, gz = shape(sz) / c;
    const len = Math.hypot(gx, gy, gz) || 1;
    const d = rough(qx, qy, qz);
    out[0] = qx + (gx / len) * d;
    out[1] = qy + (gy / len) * d;
    out[2] = qz + (gz / len) * d;
    return out;
  };
  const point = [0, 0, 0];
  const surface = (x, y) => {
    const sx = THREE.MathUtils.clamp((x - cx) / a, -0.999, 0.999), sy = THREE.MathUtils.clamp((y - cy) / b, -0.999, 0.999);
    const sz = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(sx), p) - Math.pow(Math.abs(sy), p)), 1 / p);
    return place(sx, sy, sz, [0, 0, 0]);
  };
  if (kit.live) {
    const geo = new THREE.IcosahedronGeometry(1, 32);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.pow(Math.pow(Math.abs(x), p) + Math.pow(Math.abs(y), p) + Math.pow(Math.abs(z), p), -1 / p);
      place(x * r, y * r, z * r, point);
      pos.setXYZ(i, point[0], point[1], point[2]);
    }
    geo.computeVertexNormals();
    // Snow on everything that faces up; the steep faces stay dark, wet rock.
    const nrm = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      // Snow clings in streaks down the face too, which gives the dark rock something to read by.
      const streak = THREE.MathUtils.smoothstep(valueNoise(pos.getX(i) / 2.2 + seed, pos.getY(i) / 9), 0.45, 0.75) * 0.35;
      const snow = Math.max(THREE.MathUtils.smoothstep(nrm.getY(i) + 0.12 * valueNoise(pos.getX(i) / 3, pos.getZ(i) / 3 + pos.getY(i) / 3), 0.42, 0.6), streak);
      const tone = 0.34 + 0.12 * valueNoise(pos.getX(i) / 9 + seed, pos.getY(i) / 6);
      // Warm brown-grey rock stands apart from the blue fog better than grey would.
      colors.set([lerp(tone * 1.2, 3.0, snow), lerp(tone, 3.05, snow), lerp(tone * 0.85, 3.2, snow)], i * 3);
    }
    structProjectUv(geo, STRUCT_TILE.cliff, 0, 0);
    const b2 = kit.builder('cliff');
    const start = b2.color.length;
    b2.addMesh(geo, null, 1);
    for (let i = 0; i < colors.length; i++) b2.color[start + i] = colors[i];
    geo.dispose();
  }
  // Its foot: a ring of colliders just inside the rough rock, wherever it stands furthest out
  // at knee to head height, and no trees inside.
  const k = 1 - Math.pow(Math.abs((0.5 - cy) / b), p);
  const ra = a * Math.pow(k, 1 / p) * 0.94, rc = c * Math.pow(k, 1 / p) * 0.94;
  const steps = Math.round((2 * (ra + rc) * 2) / 2.2);
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const ct = Math.cos(t), st = Math.sin(t);
    let best = null, bestD = 0;
    for (const y of [0.5, 1.5, 2.5]) {
      const sy = (y - cy) / b, ky = Math.pow(1 - Math.pow(Math.abs(sy), p), 1 / p);
      place(ky * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p), sy, ky * Math.sign(st) * Math.pow(Math.abs(st), 2 / p), point);
      const d = Math.hypot((point[0] - cx) / a, (point[2] - cz) / c);
      if (d > bestD) { bestD = d; best = [point[0], point[2]]; }
    }
    const dx = cx - best[0], dz = cz - best[1], len = Math.hypot(dx, dz);
    kit.collide(best[0] + (dx / len) * 1.4, best[1] + (dz / len) * 1.4, 1.7, 40);
  }
  for (let gx = -ra + 6; gx <= ra - 4; gx += 9) {
    for (let gz = -rc + 5; gz <= rc - 3; gz += 9) kit.clear(cx + gx, cz + gz, 9);
  }
  return { surface };
}

/* ---------- The Ranger Lookout ---------- */
// A 1958 forestry fire tower: four timber legs on a 4.2 m square leaning in to the cab, the
// cab floor 12 m up, its roof peak at 14.5 m and the lamp above at 15 m, the ladder on +z.
function structSiteLookout(kit) {
  const floorY = 12, legHalf = (y) => lerp(2.1, 1.6, y / floorY);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const green = [0.56, 0.66, 0.56];
  for (const [sx, sz] of corners) {
    const fx = sx * 2.1, fz = sz * 2.1, g = kit.ground(fx, fz);
    kit.box('stone', 0.75, 1.1, 0.75, { x: fx, y: g + 0.05, z: fz, tint: 0.9 });
    kit.beam('wood', [fx, g + 0.4, fz], [sx * 1.6, floorY, sz * 1.6], 0.24, 0.24, { tint: 0.85 });
    kit.collide(fx, fz, 0.42, floorY);
    kit.drift(fx - 0.3, fz + 0.2, 1.3, 0.35, 1.0, sx);
  }
  // Girts and X braces on every face, three storeys of them.
  const levels = [1.2, 4.8, 8.4, floorY - 0.3];
  for (let f = 0; f < 4; f++) {
    const [ax, az] = corners[f], [bx, bz] = corners[(f + 1) % 4];
    const at = (cx, cz, y) => [cx * legHalf(y), y, cz * legHalf(y)];
    for (let l = 0; l < levels.length; l++) {
      kit.beam('wood', at(ax, az, levels[l]), at(bx, bz, levels[l]), 0.14, 0.1, { tint: 0.8 });
      if (l === 0) continue;
      kit.beam('wood', at(ax, az, levels[l - 1]), at(bx, bz, levels[l]), 0.1, 0.07, { tint: 0.75 });
      kit.beam('wood', at(bx, bz, levels[l - 1]), at(ax, az, levels[l]), 0.1, 0.07, { tint: 0.75 });
    }
  }
  // The catwalk: joists, decking, posts and rails, open where the ladder arrives.
  for (const j of [-2.2, -0.75, 0.75, 2.2]) kit.box('woodDark', 0.14, 0.2, 5.2, { x: j, y: floorY - 0.25, z: 0 });
  kit.box('wood', 5.2, 0.12, 5.2, { x: 0, y: floorY - 0.06, z: 0, tint: 0.9 });
  kit.box('snow', 5.0, 0.06, 5.0, { x: 0.05, y: floorY + 0.02, z: 0.05 });
  const railY = [floorY + 0.5, floorY + 1.0];
  for (const side of [0, 1, 2, 3]) {
    for (let i = 0; i <= 4; i++) {
      const u = -2.55 + i * 1.275;
      const [px, pz] = [[u, -2.55], [2.55, u], [u, 2.55], [-2.55, u]][side];
      if (side === 2 && Math.abs(px) < 0.5) continue;
      kit.box('woodDark', 0.09, 1.05, 0.09, { x: px, y: floorY + 0.52, z: pz });
    }
    for (const y of railY) {
      if (side === 2) {
        for (const s of [-1, 1]) kit.box('woodDark', 2.05, 0.07, 0.07, { x: s * 1.52, y, z: 2.55 });
      } else {
        kit.box('woodDark', side % 2 ? 0.07 : 5.12, 0.07, side % 2 ? 5.12 : 0.07, { x: [0, 2.55, 0, -2.55][side], y, z: [-2.55, 0, 2.55, 0][side] });
      }
    }
  }
  // The cab: a solid lower wall, a band of windows, and a shallow pyramid roof.
  const cab = 3.6, wallTop = floorY + 1.0, winTop = floorY + 1.95;
  for (const side of [0, 1, 2, 3]) {
    const along = side % 2 === 0;
    const px = [0, cab / 2, 0, -cab / 2][side], pz = [-cab / 2, 0, cab / 2, 0][side];
    kit.box('paint', along ? cab : 0.1, wallTop - floorY, along ? 0.1 : cab, { x: px, y: floorY + 0.5, z: pz, tint: green });
    kit.box('paint', along ? cab + 0.1 : 0.14, 0.16, along ? 0.14 : cab + 0.1, { x: px, y: winTop + 0.05, z: pz, tint: green });
    kit.box('paint', along ? cab + 0.1 : 0.16, 0.06, along ? 0.16 : cab + 0.1, { x: px, y: wallTop + 0.02, z: pz, tint: 0.95 });
    if (kit.live) kit.add('pane', new THREE.BoxGeometry(along ? cab - 0.1 : 0.03, winTop - wallTop, along ? 0.03 : cab - 0.1), { x: px, y: (wallTop + winTop) / 2, z: pz, uv: false });
    for (let i = 0; i <= 3; i++) {
      const u = -cab / 2 + i * cab / 3;
      kit.box('paint', 0.07, winTop - wallTop, 0.07, { x: along ? u : px, y: (wallTop + winTop) / 2, z: along ? pz : u, tint: 0.95 });
    }
  }
  // The cab door faces the ladder.
  kit.box('paint', 0.8, 0.98, 0.04, { x: 0.6, y: floorY + 0.49, z: cab / 2 + 0.06, tint: [0.4, 0.5, 0.42] });
  if (kit.live) {
    const roof = new THREE.ConeGeometry(3.3, 0.6, 4, 1).rotateY(Math.PI / 4);
    kit.add('paint', roof, { y: winTop + 0.12 + 0.3, tint: [0.42, 0.5, 0.43] });
    const cap = new THREE.ConeGeometry(3.25, 0.62, 4, 1).rotateY(Math.PI / 4);
    kit.add('snow', cap, { y: winTop + 0.12 + 0.36 });
  }
  // A stovepipe, and the lamp on its little mast at 15 m.
  kit.cyl('iron', 0.07, 0.07, 0.9, { x: 0.9, y: winTop + 0.6, z: -0.9 }, 8);
  kit.cyl('iron', 0.13, 0.13, 0.05, { x: 0.9, y: winTop + 1.05, z: -0.9 }, 8);
  kit.cyl('iron', 0.035, 0.035, 0.5, { y: 14.6 }, 6);
  kit.cyl('iron', 0.16, 0.2, 0.06, { y: 14.85 }, 10);
  kit.cyl('lamp', 0.13, 0.13, 0.22, { y: 15 }, 10);
  kit.cyl('iron', 0.17, 0.12, 0.08, { y: 15.15 }, 10);
  // Inside the cab: the fire-finder on its stand, and a stool.
  kit.cyl('woodDark', 0.1, 0.16, 0.95, { y: floorY + 0.47 }, 8);
  kit.cyl('wood', 0.48, 0.48, 0.06, { y: floorY + 0.98 }, 18);
  kit.cyl('bronze', 0.42, 0.42, 0.03, { y: floorY + 1.02 }, 18);
  if (kit.live) kit.add('bronze', new THREE.TorusGeometry(0.4, 0.015, 4, 24).rotateX(Math.PI / 2), { y: floorY + 1.06, uv: false });
  kit.box('iron', 0.03, 0.22, 0.03, { x: 0.4, y: floorY + 1.15 });
  kit.box('iron', 0.03, 0.22, 0.03, { x: -0.4, y: floorY + 1.15 });
  kit.cyl('wood', 0.17, 0.17, 0.04, { x: -1.1, y: floorY + 0.62, z: 0.9 }, 10);
  for (let i = 0; i < 3; i++) kit.rod('woodDark', [-1.1 + Math.cos(i * 2.1) * 0.15, floorY, 0.9 + Math.sin(i * 2.1) * 0.15], [-1.1, floorY + 0.6, 0.9], 0.02, 4);
  // The ladder up the +z side, from the snow to the catwalk rail.
  const lz = 2.72, lg = kit.ground(0, lz);
  for (const s of [-1, 1]) kit.box('woodDark', 0.08, floorY + 1.1 - lg + 0.3, 0.1, { x: s * 0.3, y: (floorY + 1.1 + lg - 0.3) / 2, z: lz });
  for (let y = lg + 0.3; y < floorY + 0.9; y += 0.3) kit.box('wood', 0.56, 0.05, 0.06, { x: 0, y, z: lz, tint: 0.8 });
  kit.collide(-0.3, lz, 0.1, floorY);
  kit.collide(0.3, lz, 0.1, floorY);

  // The ranger's woodshed, the outhouse and a woodpile.
  const shed = structHut(kit, { x: -6.6, z: -2.6, w: 2.8, d: 2.0, h: 2.0, ry: 0.3, roof: 'shed', pitch: 0.22, roofMat: 'metal', door: { side: 's', at: 0.35, width: 1.1, open: 1.6 }, windows: [{ side: 'w', at: 0, w: 0.5, h: 0.4, y: 1.4 }] });
  const [bx, bz] = shed.P(0, -0.68);
  kit.box('woodDark', 2.2, 0.08, 0.5, { x: bx, y: shed.hi + 0.82, z: bz, ry: 0.3 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.08, 0.82, 0.4, { x: bx + Math.cos(0.3) * s * 0.95, y: shed.hi + 0.41, z: bz - Math.sin(0.3) * s * 0.95, ry: 0.3 });
  kit.item('note:ranger-log', ...shed.P(-0.5, -0.65), { y: shed.hi + 0.88 });
  kit.item('beans', ...shed.P(0.6, -0.1));
  structWoodpile(kit, ...shed.P(-2.0, 0.1), 1.8, 0.3 + Math.PI / 2, 4);
  kit.item('snowshoes', ...shed.P(1.4, 1.5));
  const out = structHut(kit, { x: 7.2, z: -6.4, w: 1.1, d: 1.1, h: 2.0, ry: -0.5, roof: 'shed', pitch: 0.3, roofMat: 'wood', door: { side: 's', at: 0, width: 0.75, open: 0 } });
  // The moon cut in the outhouse door, as it should be.
  if (kit.live) {
    const moon = new THREE.Shape();
    moon.absarc(0, 0, 0.09, Math.PI * 0.35, Math.PI * 1.65, false);
    moon.absarc(0.05, 0, 0.075, Math.PI * 1.45, Math.PI * 0.55, true);
    const [mx, mz] = out.P(0, 0.58);
    kit.add('black', new THREE.ShapeGeometry(moon), { x: mx, y: out.hi + 1.6, z: mz, ry: -0.5, uv: false });
  }
  kit.item('warmer', 3.1, -3.2);

  // The old road comes in from the south-east and stops at the rockslide.
  kit.drape('floor', 9, 9, 3.2, 14, 0.75, 0.025, 1.2, { tint: 0.7 });
  for (const [x, z, s] of [[12.6, 14.2, 2.2], [14.8, 11.8, 1.6], [11, 16.4, 1.4], [15.6, 15.2, 2.6], [13.2, 9.6, 0.9], [10.2, 13.6, 0.7]]) structBoulder(kit, x, z, s, 0.68, 0.9);
  for (const s of [-1, 1]) {
    const px = 9.6 + s * 1.1 * Math.cos(0.75), pz = 10.4 - s * 1.1 * Math.sin(0.75);
    const g = kit.ground(px, pz);
    kit.beam('woodDark', [px - 0.3, g - 0.1, pz], [px, g + 1.05, pz], 0.07, 0.07);
    kit.beam('woodDark', [px + 0.3, g - 0.1, pz], [px, g + 1.05, pz], 0.07, 0.07);
  }
  for (let i = 0; i < 6; i++) {
    const t = -1.25 + i * 0.5 + 0.25;
    kit.box('paint', 0.5, 0.18, 0.06, { x: 9.6 + t * Math.cos(0.75), y: kit.ground(9.6, 10.4) + 1.0, z: 10.4 - t * Math.sin(0.75), ry: 0.75, tint: i % 2 ? [0.95, 0.95, 0.92] : [0.78, 0.1, 0.08] });
  }
  kit.collideLine(9.6 - 1.4 * Math.cos(0.75), 10.4 + 1.4 * Math.sin(0.75), 9.6 + 1.4 * Math.cos(0.75), 10.4 - 1.4 * Math.sin(0.75), 1.1, 0.2);
  structSign(kit, 'lookout-road', [['ROAD CLOSED', 64], ['Rockslide - October 1961', 34]], 7.4, 12.2, 0.75, { w: 1.3, h: 0.62, post: 0.9, board: '#d8d2c0', ink: '#7a1510', font: 'Arial, sans-serif' });
  structSign(kit, 'lookout-board', [['FORESTRY SERVICE', 46], ['HOLLOW LOOKOUT No. 3', 54], ['Est. 1958', 34]], 4.6, 7.8, -0.35, { w: 1.9, h: 0.95, post: 1.1, board: '#2f4a35', ink: '#e8dfc4' });
  structFlag(kit, -4.4, 6.6, 'rope', 'varga-lookout', 0.9);
}

/* ---------- Henrik's Cabin ---------- */
// A trapper's log cabin, notched at the corners, with a stone chimney, a raised meat cache,
// pelts on their stretchers and a winter's firewood. The door faces the crater's heart.
function structSiteTrapper(kit) {
  const cx = 0, cz = -3, w = 5.6, d = 4.4, courses = 8, step = 0.3, r = 0.16;
  const { lo, hi } = kit.footing(cx, cz, w + 0.6, d + 0.6);
  const y0 = lo - 0.02 + r;
  const top = y0 + (courses - 1) * step + r;
  const door = { from: 0.62, to: 1.6, top: hi + 1.9 };
  const window = { from: -2.0, to: -0.9, bottom: hi + 0.85, top: hi + 1.65 };
  // A log along a wall, cut around any openings: `cuts` are [from, to] along its length.
  const logRun = (along, fixed, len, y, cuts) => {
    let start = -len / 2;
    const pieces = [];
    for (const [a, b] of cuts.sort((p, q) => p[0] - q[0])) { if (a > start) pieces.push([start, a]); start = Math.max(start, b); }
    if (start < len / 2) pieces.push([start, len / 2]);
    for (const [a, b] of pieces) {
      const mid = (a + b) / 2, l = b - a;
      if (l < 0.15) continue;
      const shade = 0.85 + kit.rand() * 0.3;
      if (along === 'x') kit.cyl('log', r, r * 1.04, l, { x: cx + mid, y, z: cz + fixed, rz: Math.PI / 2, tint: shade }, 7);
      else kit.cyl('log', r, r * 1.04, l, { x: cx + fixed, y, z: cz + mid, rx: Math.PI / 2, tint: shade }, 7);
    }
  };
  for (let i = 0; i < courses; i++) {
    const y = y0 + i * step;
    const front = [], back = [];
    if (y - r < door.top) front.push([door.from, door.to]);
    if (y + r > window.bottom && y - r < window.top) front.push([window.from, window.to]);
    logRun('x', d / 2, w + 0.6, y, front);
    logRun('x', -d / 2, w + 0.6, y, back);
    // The side walls sit half a log higher, where the notches lock them together.
    logRun('z', w / 2, d + 0.6, y + step / 2, []);
    logRun('z', -w / 2, d + 0.6, y + step / 2, []);
  }
  // Gable ends of shortening logs, then the roof.
  const pitch = 0.62, rise = (d / 2) * Math.tan(pitch);
  for (let k = 1; k * step < rise; k++) {
    const len = d - (2 * k * step) / Math.tan(pitch) + 0.1;
    for (const side of [-1, 1]) kit.cyl('log', r * 0.95, r, len, { x: cx + side * w / 2, y: top + step / 2 + (k - 0.5) * step, z: cz, rx: Math.PI / 2, tint: 0.9 }, 7);
  }
  const roofTop = top + step / 2;
  const run = d / 2 + 0.55, slab = run / Math.cos(pitch);
  for (const side of [-1, 1]) {
    const y = roofTop + rise - (run / 2) * Math.tan(pitch) + 0.08;
    kit.box('woodDark', w + 1.2, 0.12, slab, { x: cx, y, z: cz + side * run / 2, rx: side * pitch, tint: 0.8 });
    kit.box('snow', w + 1.0, 0.2, slab * 0.9, { x: cx, y: y + 0.14, z: cz + side * (run / 2 - 0.06), rx: side * pitch });
  }
  kit.cyl('log', 0.18, 0.18, w + 1.3, { x: cx, y: roofTop + rise + 0.08, z: cz, rz: Math.PI / 2 }, 7);
  for (const side of [-1, 1]) kit.box('woodDark', w - 0.1, 0.03, (d / 2) / Math.cos(pitch), { x: cx, y: roofTop + rise / 2 - 0.1, z: cz + side * d / 4, rx: side * pitch, tint: 0.28 });
  // Door: rough planks on strap hinges, hanging open.
  kit.box('woodDark', 0.95, 1.85, 0.06, { x: cx + door.from - 0.05 + Math.cos(-1.2) * 0.47, y: hi + 0.93, z: cz + d / 2 + 0.1 - Math.sin(-1.2) * 0.47, ry: -1.2, tint: 0.9 });
  kit.box('woodDark', (door.to - door.from) + 0.2, 0.14, 0.34, { x: cx + (door.from + door.to) / 2, y: door.top + 0.07, z: cz + d / 2 });
  // The window: four panes, a sill and shutters swung back.
  const wx = cx + (window.from + window.to) / 2, wy = (window.bottom + window.top) / 2;
  kit.box('glass', window.to - window.from, window.top - window.bottom, 0.06, { x: wx, y: wy, z: cz + d / 2 });
  kit.box('woodDark', 0.05, window.top - window.bottom, 0.12, { x: wx, y: wy, z: cz + d / 2 });
  kit.box('woodDark', window.to - window.from, 0.05, 0.12, { x: wx, y: wy, z: cz + d / 2 });
  kit.box('woodDark', window.to - window.from + 0.25, 0.08, 0.4, { x: wx, y: window.bottom - 0.04, z: cz + d / 2 + 0.06 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.55, window.top - window.bottom + 0.1, 0.05, { x: wx + s * 0.85, y: wy, z: cz + d / 2 + 0.2, ry: s * 0.25, tint: 0.75 });
  // A pair of antlers over the door, for luck.
  const ax = cx + 1.1, ay = door.top + 0.4, az = cz + d / 2 + 0.22;
  for (const s of [-1, 1]) {
    kit.rod('bronze', [ax, ay, az], [ax + s * 0.32, ay + 0.3, az + 0.05], 0.022, 5, { tint: [1.4, 1.3, 1.1] });
    kit.rod('bronze', [ax + s * 0.32, ay + 0.3, az + 0.05], [ax + s * 0.42, ay + 0.55, az], 0.016, 5, { tint: [1.4, 1.3, 1.1] });
    kit.rod('bronze', [ax + s * 0.2, ay + 0.18, az + 0.03], [ax + s * 0.18, ay + 0.42, az + 0.08], 0.014, 5, { tint: [1.4, 1.3, 1.1] });
  }
  // The chimney at the west end, built of field stone.
  for (let i = 0; i < 9; i++) {
    const y = lo - 0.2 + i * 0.5;
    const narrow = i > 5 ? 0.72 : 1;
    kit.box('stone', 1.0 * narrow + kit.rand() * 0.06, 0.52, 0.9 * narrow + kit.rand() * 0.06, { x: cx - w / 2 - 0.6, y: y + 0.25, z: cz - 0.4, ry: (kit.rand() - 0.5) * 0.08, tint: 0.85 + kit.rand() * 0.2 });
  }
  kit.box('snow', 0.7, 0.08, 0.66, { x: cx - w / 2 - 0.6, y: lo + 4.32, z: cz - 0.4 });
  kit.collide(cx - w / 2 - 0.6, cz - 0.4, 0.6, 4.5);
  kit.drape('floor', cx, cz, w - 0.3, d - 0.3, 0, 0.03, 0.8, { tint: 0.85 });
  kit.collideWalls(cx, cz, w + 0.2, d + 0.2, 0, 3.4, { side: 's', at: (door.from + door.to) / 2, width: door.to - door.from + 0.2 });

  // Inside: table and bench, his bunk, the stove and a shelf of tins.
  const tx = cx - 1.0, tz = cz - 0.6, tableTop = hi + 0.78;
  kit.box('wood', 1.3, 0.06, 0.8, { x: tx, y: tableTop - 0.03, z: tz });
  for (const [sx, sz] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) kit.box('woodDark', 0.07, 0.75, 0.07, { x: tx + sx, y: hi + 0.37, z: tz + sz });
  kit.box('wood', 1.2, 0.05, 0.3, { x: tx, y: hi + 0.45, z: tz + 0.7 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.06, 0.45, 0.26, { x: tx + s * 0.5, y: hi + 0.22, z: tz + 0.7 });
  kit.cyl('iron', 0.05, 0.04, 0.09, { x: tx + 0.35, y: tableTop + 0.05, z: tz - 0.15 }, 8);
  kit.item('note:henrik-ledger', tx - 0.2, tz + 0.05, { y: tableTop + 0.01 });
  const bunkX = cx + 1.65, bunkZ = cz - 1.35;
  kit.box('woodDark', 1.95, 0.32, 0.95, { x: bunkX, y: hi + 0.3, z: bunkZ });
  kit.box('cloth', 1.85, 0.1, 0.88, { x: bunkX, y: hi + 0.5, z: bunkZ, tint: [0.62, 0.18, 0.14] });
  kit.box('cloth', 0.45, 0.12, 0.6, { x: bunkX + 0.7, y: hi + 0.6, z: bunkZ, tint: [0.85, 0.82, 0.74] });
  kit.item('note:henrik-letter', bunkX - 0.2, bunkZ + 0.1, { y: hi + 0.56 });
  kit.item('cloth', tx + 0.3, tz + 0.72, { y: hi + 0.48 });
  kit.box('iron', 0.6, 0.55, 0.5, { x: cx - w / 2 + 0.55, y: hi + 0.3, z: cz - 0.4 });
  kit.cyl('iron', 0.07, 0.07, 1.6, { x: cx - w / 2 + 0.55, y: hi + 1.35, z: cz - 0.4 }, 8);
  kit.box('woodDark', 1.4, 0.05, 0.28, { x: cx + 0.2, y: hi + 1.45, z: cz - d / 2 + 0.3 });
  for (let i = 0; i < 6; i++) kit.cyl('rust', 0.05, 0.05, 0.12, { x: cx - 0.35 + i * 0.22, y: hi + 1.54, z: cz - d / 2 + 0.3, tint: 0.8 + kit.rand() * 0.5 }, 8);

  // Outside: the woodpile, his chopping block, a bench by the door.
  structWoodpile(kit, cx + 0.4, cz - d / 2 - 0.75, 3.4, 0, 5);
  const bg = kit.ground(3.4, 1.0);
  kit.cyl('log', 0.32, 0.36, 0.55, { x: 3.4, y: bg + 0.2, z: 1.0 }, 9);
  kit.collide(3.4, 1.0, 0.4, 0.6);
  kit.box('wood', 1.3, 0.06, 0.32, { x: cx - 1.6, y: hi + 0.45, z: cz + d / 2 + 0.55 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.06, 0.45, 0.28, { x: cx - 1.6 + s * 0.52, y: hi + 0.22, z: cz + d / 2 + 0.55 });

  // The meat cache on stilts, out of reach of wolves.
  const mx = 6.4, mz = -6.2, legs = 2.6;
  const mg = kit.ground(mx, mz);
  for (const [sx, sz] of [[-0.62, -0.55], [0.62, -0.55], [0.62, 0.55], [-0.62, 0.55]]) {
    kit.cyl('log', 0.09, 0.11, legs + 0.5, { x: mx + sx, y: kit.ground(mx + sx, mz + sz) + legs / 2 - 0.25, z: mz + sz }, 6);
    kit.collide(mx + sx, mz + sz, 0.16, legs);
    // Tin collars stop anything climbing the legs.
    kit.cyl('metal', 0.16, 0.16, 0.35, { x: mx + sx, y: mg + 1.3, z: mz + sz, uv: false }, 8);
  }
  kit.box('woodDark', 1.6, 0.1, 1.4, { x: mx, y: mg + legs, z: mz });
  kit.box('wood', 1.3, 0.95, 1.1, { x: mx, y: mg + legs + 0.5, z: mz, tint: 0.85 });
  for (const side of [-1, 1]) {
    kit.box('woodDark', 1.6, 0.07, 0.85, { x: mx, y: mg + legs + 1.13, z: mz + side * 0.34, rx: side * 0.5 });
    kit.box('snow', 1.5, 0.12, 0.75, { x: mx, y: mg + legs + 1.22, z: mz + side * 0.33, rx: side * 0.5 });
  }
  for (const s of [-1, 1]) kit.beam('woodDark', [mx + s * 0.22, mg - 0.1, mz + 1.55], [mx + s * 0.22, mg + legs + 0.1, mz + 0.72], 0.06, 0.06);
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    kit.box('wood', 0.5, 0.04, 0.05, { x: mx, y: lerp(mg - 0.1, mg + legs + 0.1, t), z: lerp(mz + 1.55, mz + 0.72, t), tint: 0.7 });
  }
  kit.item('jerky', mx - 0.9, mz + 1.4, { count: 2 });

  // Hare pelts laced to willow hoops, drying in the wind.
  for (let i = 0; i < 3; i++) {
    const px = 4.6 + i * 0.95, pz = 2.4 - i * 0.35, py = kit.ground(px, pz);
    kit.rod('woodDark', [px, py - 0.2, pz], [px, py + 1.75, pz], 0.03, 5);
    if (kit.live) {
      kit.add('woodDark', new THREE.TorusGeometry(0.42, 0.025, 4, 18).scale(0.85, 1.1, 1), { x: px, y: py + 1.1, z: pz + 0.04, ry: 0.35, uv: false });
      kit.add('pelt', new THREE.PlaneGeometry(0.66, 0.84, 4, 4), { x: px, y: py + 1.1, z: pz + 0.05, ry: 0.35, uv: false });
    }
    kit.collide(px, pz, 0.2, 1.8);
  }
  kit.item('pelt', 5.4, 3.5, { count: 2 });
  structFlag(kit, -5.6, 4.2, 'basket', 'varga-trapper', 1.2);
}

/* ---------- Hollow Station ---------- */
// Dr. Varga's weather station of 1962: the red main hut where she lived and worked, a
// Quonset store, the instrument screen, the anemometer mast, the balloon shed and its gas
// bottles, and the long aerial she hoped someone would answer.
function structSiteStation(kit) {
  const red = [0.66, 0.14, 0.1], white = [0.93, 0.93, 0.9];
  const hut = structHut(kit, { x: -5, z: -6, w: 7.5, d: 4.2, h: 2.4, wall: 'paint', tint: red, roof: 'gable', pitch: 0.24, roofMat: 'metal', trim: 'paint', door: { side: 's', at: 2.0, width: 0.95, open: 1.1, mat: 'paint', tint: white }, windows: [{ side: 's', at: -1.6, w: 1.1, h: 0.75 }, { side: 's', at: -3.0, w: 0.6, h: 0.6 }, { side: 'w', at: 0.5, w: 0.8, h: 0.7 }, { side: 'n', at: 1.5, w: 0.9, h: 0.7 }] });
  // White trim bands, and the station's name over the door.
  for (const side of [-1, 1]) kit.box('paint', 7.62, 0.14, 0.03, { x: -5, y: hut.top - 0.07, z: -6 + side * 2.12, tint: white });
  structStationLabel(kit, -5, hut.top - 0.42, -6 + 2.17);
  // Inside: Varga's desk under the window, a bunk, the stove, shelves of books.
  const deskTop = hut.floor + 0.78;
  kit.box('woodDark', 1.6, 0.06, 0.7, { x: -6.6, y: deskTop - 0.03, z: -4.5 });
  for (const sx of [-0.72, 0.72]) kit.box('woodDark', 0.08, 0.75, 0.62, { x: -6.6 + sx, y: hut.floor + 0.37, z: -4.5 });
  kit.box('iron', 0.42, 0.16, 0.3, { x: -7.05, y: deskTop + 0.08, z: -4.55 });
  kit.box('cloth', 0.3, 0.02, 0.22, { x: -6.3, y: deskTop + 0.01, z: -4.5, ry: 0.3, tint: [1.1, 1.08, 1.0] });
  kit.cyl('bronze', 0.1, 0.12, 0.16, { x: -5.95, y: deskTop + 0.08, z: -4.75 }, 10);
  kit.item('note:station-memo', -6.45, -4.48, { y: deskTop + 0.01 });
  kit.box('wood', 0.42, 0.04, 0.42, { x: -6.5, y: hut.floor + 0.46, z: -5.25 });
  for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]]) kit.box('woodDark', 0.04, 0.46, 0.04, { x: -6.5 + sx, y: hut.floor + 0.23, z: -5.25 + sz });
  kit.box('woodDark', 0.9, 0.35, 1.95, { x: -8.2, y: hut.floor + 0.3, z: -6.8 });
  kit.box('cloth', 0.85, 0.12, 1.9, { x: -8.2, y: hut.floor + 0.52, z: -6.8, tint: [0.3, 0.36, 0.5] });
  kit.box('iron', 0.55, 0.7, 0.55, { x: -3.0, y: hut.floor + 0.36, z: -7.6 });
  kit.cyl('iron', 0.07, 0.07, 2.4, { x: -3.0, y: hut.floor + 1.8, z: -7.6 }, 8);
  for (let s = 0; s < 3; s++) {
    kit.box('woodDark', 1.6, 0.04, 0.3, { x: -5.0, y: hut.floor + 0.9 + s * 0.45, z: -7.9 });
    for (let b = 0; b < 9; b++) kit.box('paint', 0.06 + kit.rand() * 0.05, 0.28 + kit.rand() * 0.08, 0.22, { x: -5.7 + b * 0.16, y: hut.floor + 1.06 + s * 0.45, z: -7.9, tint: [[0.5, 0.15, 0.1], [0.2, 0.3, 0.5], [0.4, 0.45, 0.3], [0.7, 0.65, 0.5]][Math.floor(kit.rand() * 4)] });
  }
  kit.box('wood', 1.1, 0.05, 0.38, { x: -1.95, y: hut.floor + 0.45, z: -4.55 });
  kit.item('parka', -1.95, -4.6, { y: hut.floor + 0.48 });
  kit.item('beans', -4.0, -7.1);
  // A pair of drums and a jerrycan by the hut.
  structDrum(kit, -9.6, -3.2, [0.25, 0.4, 0.25]);
  structDrum(kit, -10.3, -4.0, [0.25, 0.4, 0.25]);
  structDrum(kit, -10.0, -2.1, [0.5, 0.15, 0.1], true, 0.5);

  // The Quonset store: a half-round shed of corrugated iron, its front open to the drifts.
  const qx = 5.5, qz = -5.5, qr = 2.2, ql = 6;
  if (kit.live) {
    const shell = new THREE.CylinderGeometry(qr, qr, ql, 18, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
    // Ridges run round the arch, so the texture's across goes along the hut.
    const p = shell.attributes.position, uv = shell.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / STRUCT_TILE.metal, Math.atan2(p.getY(i), p.getX(i)) * qr / STRUCT_TILE.metal);
    kit.add('metal', shell, { x: qx, y: kit.ground(qx, qz) - 0.15, z: qz, uv: false, tint: 0.9 });
    const snow = new THREE.CylinderGeometry(qr + 0.08, qr + 0.08, ql * 0.96, 10, 1, true, Math.PI * 0.8, Math.PI * 0.4).rotateX(Math.PI / 2);
    kit.add('snow', snow, { x: qx, y: kit.ground(qx, qz) - 0.12, z: qz });
    const end = new THREE.CircleGeometry(qr, 18, 0, Math.PI);
    kit.add('wood', end, { x: qx, y: kit.ground(qx, qz) - 0.15, z: qz - ql / 2 + 0.02, tint: 0.85 });
  }
  kit.drape('floor', qx, qz, 3.8, ql - 0.3, 0, 0.03, 0.8, { tint: 0.7 });
  kit.drift(qx + 0.8, qz + ql / 2 - 0.4, 2.6, 0.45, 1.6);
  for (let z = -ql / 2; z <= ql / 2; z += 0.6) for (const s of [-1, 1]) kit.collide(qx + s * (qr - 0.15), qz + z, 0.32, 2);
  kit.collideLine(qx - qr, qz - ql / 2, qx + qr, qz - ql / 2, 2.2);
  const benchTop = kit.ground(qx - 1.3, qz - 1) + 0.85;
  kit.box('wood', 0.7, 0.06, 3.2, { x: qx - 1.3, y: benchTop - 0.03, z: qz - 1 });
  for (const sz of [-1.4, 0, 1.4]) kit.box('woodDark', 0.6, 0.82, 0.08, { x: qx - 1.3, y: benchTop - 0.44, z: qz - 1 + sz });
  kit.item('thermos', qx - 1.3, qz - 1.9, { y: benchTop });
  kit.item('medkit', qx - 1.3, qz - 0.2, { y: benchTop });
  // A hydrogen generator, a reel of balloon cord and crates along the other side.
  kit.cyl('iron', 0.35, 0.35, 1.2, { x: qx + 1.2, y: kit.ground(qx + 1.2, qz - 2) + 0.6, z: qz - 2 }, 12);
  kit.cyl('bronze', 0.08, 0.08, 0.3, { x: qx + 1.2, y: kit.ground(qx + 1.2, qz - 2) + 1.35, z: qz - 2 }, 6);
  structCrate(kit, qx + 1.2, qz - 0.6, 0.6, 0.2, null, false);
  structCrate(kit, qx + 1.25, qz + 0.3, 0.5, -0.3, null, false);

  // The Stevenson screen: a white louvred box that keeps the sun off her thermometers.
  const sx = -1.6, sz = 3.2, sg = kit.ground(sx, sz);
  for (const [lx, lz] of [[-0.3, -0.25], [0.3, -0.25], [0.3, 0.25], [-0.3, 0.25]]) kit.box('paint', 0.06, 1.25, 0.06, { x: sx + lx, y: sg + 0.55, z: sz + lz, tint: white });
  kit.box('paint', 0.8, 0.6, 0.6, { x: sx, y: sg + 1.45, z: sz, tint: white });
  for (let i = 0; i < 6; i++) kit.box('paint', 0.82, 0.03, 0.05, { x: sx, y: sg + 1.2 + i * 0.1, z: sz + 0.32, rx: 0.6, tint: 0.85 });
  kit.box('paint', 0.95, 0.06, 0.75, { x: sx, y: sg + 1.8, z: sz, rx: 0.08, tint: white });
  kit.box('snow', 0.9, 0.08, 0.7, { x: sx, y: sg + 1.86, z: sz });
  kit.collide(sx, sz, 0.5, 1.9);

  // The anemometer mast, with its spinning cups and a vane that hunts the wind.
  const mx = -7.8, mz = 2.6, mg = kit.ground(mx, mz), mh = 7;
  kit.cyl('iron', 0.05, 0.07, mh, { x: mx, y: mg + mh / 2 - 0.2, z: mz }, 8);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.09 + 0.4, gx = mx + Math.cos(a) * 3.2, gz = mz + Math.sin(a) * 3.2;
    kit.rod('iron', [mx, mg + mh * 0.7, mz], [gx, kit.ground(gx, gz), gz], 0.008, 3);
    kit.box('iron', 0.08, 0.3, 0.08, { x: gx, y: kit.ground(gx, gz) + 0.1, z: gz });
  }
  kit.collide(mx, mz, 0.2, mh);
  if (kit.live) {
    const m = structMats();
    const cups = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), m.iron);
    cups.add(hub);
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 4).rotateZ(Math.PI / 2).translate(0.21, 0, 0), m.iron);
      arm.rotation.y = i * 2.09;
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2), m.iron);
      cup.position.set(0.42, 0, 0);
      arm.add(cup);
      cups.add(arm);
    }
    kit.object(cups, mx, mg + mh + 0.05, mz);
    const vane = new THREE.Group();
    vane.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.025), m.iron));
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.01), m.iron);
    tail.position.x = -0.42;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6).rotateZ(-Math.PI / 2), m.iron);
    nose.position.x = 0.48;
    vane.add(tail, nose);
    kit.object(vane, mx, mg + mh - 0.5, mz);
    kit.anim.cups = cups;
    kit.anim.vane = vane;
    kit.anim.vaneYaw = -kit.rot;
  }

  // The balloon shed, gas bottles in their rack, and the remains of a weather balloon.
  structHut(kit, { x: 8.4, z: 4.2, w: 3.2, d: 3.0, h: 2.6, wall: 'paint', tint: white, roof: 'shed', pitch: 0.2, roofMat: 'metal', trim: 'paint', door: { side: 'w', at: 0, width: 1.9, open: 1.4, mat: 'paint', tint: white } });
  const rx = 8.6, rz = 7.0, rg = kit.ground(rx, rz);
  kit.box('woodDark', 2.2, 0.08, 0.12, { x: rx, y: rg + 1.1, z: rz - 0.25 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.1, 1.25, 0.1, { x: rx + s * 1.05, y: rg + 0.55, z: rz - 0.25 });
  for (let i = 0; i < 6; i++) {
    const bx = rx - 0.9 + i * 0.36;
    kit.cyl('paint', 0.11, 0.12, 1.4, { x: bx, y: rg + 0.68, z: rz - 0.08, rx: 0.16, tint: [0.28, 0.42, 0.3] }, 10);
    kit.cyl('bronze', 0.03, 0.05, 0.14, { x: bx, y: rg + 1.43, z: rz + 0.02, rx: 0.16 }, 6);
  }
  kit.collideLine(rx - 1.1, rz - 0.2, rx + 1.1, rz - 0.2, 1.4, 0.3);
  if (kit.live) {
    const balloon = new THREE.SphereGeometry(0.9, 12, 8);
    const p = balloon.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (p.getY(i) < 0 ? 0.25 : 0.55) + Math.sin(p.getX(i) * 6) * 0.06);
    balloon.computeVertexNormals();
    kit.add('cloth', balloon, { x: 8.0, y: kit.ground(8.4, 4.2) + 2.85 + 0.35, z: 4.4, tint: [1.12, 1.1, 1.06] });
  }
  // The aerial: two masts and a long wire across the compound, down to the hut.
  const aerial = [[-12.5, -1.5], [12.0, -10.5]];
  for (const [x, z] of aerial) {
    kit.cyl('iron', 0.05, 0.08, 7.2, { x, y: kit.ground(x, z) + 3.4, z }, 6);
    kit.collide(x, z, 0.2, 7);
  }
  const top0 = [aerial[0][0], kit.ground(...aerial[0]) + 6.9, aerial[0][1]], top1 = [aerial[1][0], kit.ground(...aerial[1]) + 6.9, aerial[1][1]];
  const mid = [(top0[0] + top1[0]) / 2, (top0[1] + top1[1]) / 2 - 0.5, (top0[2] + top1[2]) / 2];
  kit.rod('iron', top0, mid, 0.008, 3);
  kit.rod('iron', mid, top1, 0.008, 3);
  kit.rod('iron', mid, [-3.0, hut.top + 0.4, -6], 0.01, 3);
  kit.cyl('paint', 0.03, 0.03, 0.14, { x: mid[0], y: mid[1], z: mid[2], rz: 1.2, tint: white }, 6);

  // Boardwalks between the huts, and the sign at the way in.
  kit.drape('floor', -2.4, 0.0, 1.1, 7.2, 0.15, 0.03, 0.9, { tint: 1.3 });
  kit.drape('floor', 2.2, -0.6, 1.1, 6.5, -0.5, 0.03, 0.9, { tint: 1.3 });
  structSign(kit, 'station-sign', [['HOLLOW STATION', 60], ['Meteorological Survey  -  1962', 30], ['Dr. I. Varga', 30]], 0.8, 8.8, 0.1, { w: 2.0, h: 1.0, post: 1.0, board: '#e8e4da', ink: '#8a1a12', font: 'Arial, sans-serif' });
  structFlag(kit, 4.8, 8.6, 'envelope', 'varga-station', 1.4);
}

// The station's name painted along the hut, as a decal.
function structStationLabel(kit, x, y, z) {
  if (!kit.live) return;
  const mat = structSignMaterial('station-label', () => {
    const tex = canvasTexture(512, 64, (c, w, h) => {
      c.fillStyle = 'rgba(240,236,228,0.92)';
      c.font = 'bold 40px Arial, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('HOLLOW STATION', w / 2, h / 2 + 2);
    });
    return tex;
  });
  mat.transparent = true;
  mat.alphaTest = 0.3;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.32), mat);
  mesh.position.set(x + 0.6, y, z);
  kit.extra.push(mesh);
}

/* ---------- The Frozen Lake ---------- */
// A round lake frozen hard, with the miners' and Henrik's fishing shacks out on the ice,
// holes and tip-ups, Aksel's drum markers for the ski-plane strip, his windsock, a jetty and
// Varga's fuel store on the shore.
function structSiteLake(kit) {
  const radius = 37;
  if (kit.live) {
    const ice = new THREE.RingGeometry(0.4, radius, 56, 14).rotateX(-Math.PI / 2);
    const p = ice.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // A ragged shoreline, then laid on the ground.
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      const edge = r / radius;
      const k = edge > 0.9 ? 1 + 0.06 * valueNoise(Math.atan2(z, x) * 5, 3.3) : 1;
      p.setX(i, x * k);
      p.setZ(i, z * k);
      p.setY(i, kit.ground(x * k, z * k) + 0.05);
    }
    ice.computeVertexNormals();
    kit.add('ice', ice, { uv: true });
  }
  // Snow banked round the shore hides the ice's edge.
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + kit.rand() * 0.1, r = radius + 0.6 + kit.rand() * 0.8;
    kit.drift(Math.cos(a) * r, Math.sin(a) * r, 6 + kit.rand() * 3, 0.35 + kit.rand() * 0.3, 2.6 + kit.rand(), -a);
  }
  // Fishing holes with their tip-up flags.
  for (const [x, z] of [[-3.5, 8.2], [-11.4, 2.4], [5.2, 2.6], [13.6, -9.4], [-2, -6.6], [17.2, 6.4], [-16.4, -7.8]]) {
    const g = kit.ground(x, z);
    kit.cyl('black', 0.24, 0.24, 0.02, { x, y: g + 0.07, z }, 12);
    if (kit.live) kit.add('snow', new THREE.TorusGeometry(0.3, 0.07, 5, 14).rotateX(Math.PI / 2), { x, y: g + 0.07, z });
    kit.box('woodDark', 0.6, 0.03, 0.04, { x: x + 0.35, y: g + 0.09, z, ry: 0.4 });
    kit.rod('woodDark', [x + 0.55, g + 0.09, z - 0.2], [x + 0.55, g + 0.6, z - 0.2], 0.008, 3);
    if (kit.live) kit.add('flag', new THREE.PlaneGeometry(0.16, 0.12, 3, 1).translate(0.08, 0, 0), { x: x + 0.55, y: g + 0.54, z: z - 0.2, ry: structWindYaw(kit), uv: false, tint: [1.0, 0.42, 0.08] });
  }
  // The fishing shacks: one red on runners, one plain board, both with stovepipes.
  const a = structHut(kit, { x: -7.4, z: 4.6, w: 2.0, d: 2.4, h: 2.0, ry: 0.45, wall: 'paint', tint: [0.62, 0.18, 0.13], roof: 'shed', pitch: 0.2, roofMat: 'metal', trim: 'woodDark', door: { side: 's', at: -0.3, width: 0.8, open: 1.4 }, floor: false, windows: [{ side: 'e', at: 0, w: 0.4, h: 0.4, y: 1.3 }] });
  for (const s of [-1, 1]) kit.box('woodDark', 0.12, 0.12, 2.8, { x: a.P(s * 0.8, 0)[0], y: a.lo + 0.02, z: a.P(s * 0.8, 0)[1], ry: 0.45 });
  kit.cyl('iron', 0.06, 0.06, 0.8, { x: a.P(0.6, -0.6)[0], y: a.top + 0.6, z: a.P(0.6, -0.6)[1] }, 8);
  kit.box('wood', 1.5, 0.05, 0.4, { x: a.P(0, -0.85)[0], y: a.hi + 0.45, z: a.P(0, -0.85)[1], ry: 0.45 });
  kit.cyl('black', 0.24, 0.24, 0.02, { x: a.P(0.2, 0.1)[0], y: kit.ground(...a.P(0.2, 0.1)) + 0.075, z: a.P(0.2, 0.1)[1] }, 12);
  kit.item('beans', ...a.P(-0.4, -0.85), { y: a.hi + 0.48 });
  kit.item('cloth', ...a.P(0.5, -0.85), { y: a.hi + 0.48 });
  const b = structHut(kit, { x: 10.6, z: -4.2, w: 1.8, d: 2.0, h: 1.9, ry: -0.35, roof: 'gable', pitch: 0.5, roofMat: 'woodDark', door: { side: 's', at: 0, width: 0.75, open: 1.0 }, floor: false });
  kit.cyl('iron', 0.05, 0.05, 0.9, { x: b.P(-0.5, -0.4)[0], y: b.top + 0.7, z: b.P(-0.5, -0.4)[1] }, 8);
  kit.box('wood', 1.3, 0.05, 0.36, { x: b.P(0, -0.7)[0], y: b.hi + 0.45, z: b.P(0, -0.7)[1], ry: -0.35 });
  kit.item('jerky', ...b.P(0.2, -0.7), { y: b.hi + 0.48 });
  // Aksel's strip: drums half sunk in the ice in a line across the lake.
  for (let i = 0; i < 5; i++) {
    const x = -24 + i * 12, z = 16 - i * 4.5, g = kit.ground(x, z);
    kit.cyl('paint', 0.29, 0.29, 0.5, { x, y: g + 0.18, z, tint: [0.9, 0.36, 0.08] }, 12);
    kit.cyl('snow', 0.27, 0.29, 0.06, { x, y: g + 0.45, z }, 12);
    kit.collide(x, z, 0.34, 0.5);
  }

  // The shore: a jetty, the mining company's sign, the windsock and Varga's fuel.
  const jx = 4.2;
  for (let z = -41; z <= -33; z += 0.42) kit.box('wood', 1.5, 0.06, 0.36, { x: jx, y: Math.max(kit.ground(jx, z), kit.ground(jx, z + 0.4)) + 0.12, z, ry: (kit.rand() - 0.5) * 0.04, tint: 0.75 + kit.rand() * 0.25 });
  for (const z of [-40.6, -37.4, -34]) for (const s of [-1, 1]) {
    const g = kit.ground(jx + s * 0.7, z);
    kit.cyl('log', 0.09, 0.09, 0.8, { x: jx + s * 0.7, y: g + 0.05, z }, 6);
    kit.collide(jx + s * 0.7, z, 0.12, 0.4);
  }
  kit.item('warmer', jx + 0.2, -33.6, { y: kit.ground(jx, -33.6) + 0.15 });
  structSign(kit, 'lake-sign', [['HALVARD MINING CO.', 40], ['LAKE CAMP', 56], ['Shacks off the ice by 1st April', 28], ['by order', 26]], 7.6, -40.8, -0.1, { w: 1.7, h: 0.95, post: 1.0, board: '#3a2e24', ink: '#e8dcc0' });
  kit.item('note:lake-sign', 7.4, -39.7);
  const wx = 14.5, wz = -39.5, wg = kit.ground(wx, wz);
  kit.cyl('iron', 0.05, 0.07, 5.4, { x: wx, y: wg + 2.5, z: wz }, 8);
  kit.collide(wx, wz, 0.15, 5);
  if (kit.live) {
    kit.add('iron', new THREE.TorusGeometry(0.3, 0.02, 4, 14).rotateY(Math.PI / 2), { x: wx + 0.06, y: wg + 5.0, z: wz, ry: structWindYaw(kit), uv: false });
    for (let band = 0; band < 4; band++) {
      const sock = new THREE.CylinderGeometry(0.3 - band * 0.045, 0.3 - (band + 1) * 0.045, 0.45, 12, 2, true).rotateZ(-Math.PI / 2).translate(0.28 + band * 0.45, 0, 0);
      const uv = sock.attributes.uv, sp = sock.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, sp.getX(i) / 1.9, 0.5);
      kit.add('tatter', sock, { x: wx + 0.06, y: wg + 4.95, z: wz, ry: structWindYaw(kit), rz: -0.18, uv: false, tint: band % 2 ? [1.1, 1.08, 1.02] : [1.0, 0.36, 0.06] });
    }
  }
  const fx = -5.2, fz = -41;
  structDrum(kit, fx, fz, [0.2, 0.32, 0.5]);
  structDrum(kit, fx + 0.62, fz + 0.1, [0.2, 0.32, 0.5]);
  structDrum(kit, fx + 0.3, fz - 0.55, [0.2, 0.32, 0.5]);
  structDrum(kit, fx - 1.4, fz + 0.6, [0.5, 0.18, 0.1], true, 1.1);
  structDrum(kit, fx + 1.5, fz - 0.9, [0.2, 0.32, 0.5], true, 0.2);
  // A tarpaulin weighted with stones over the rest of the store.
  const tg = kit.footing(fx - 1.6, fz - 1.3, 2.2, 1.6).lo;
  kit.box('cloth', 2.2, 0.8, 1.6, { x: fx - 1.6, y: tg + 0.38, z: fz - 1.3, ry: 0.2, tint: [0.42, 0.46, 0.34] });
  kit.box('snow', 2.0, 0.1, 1.4, { x: fx - 1.6, y: tg + 0.82, z: fz - 1.3, ry: 0.3 });
  kit.collide(fx - 1.6, fz - 1.3, 1.1, 0.9);
  structFlag(kit, -2.4, -40.2, 'tanks', 'varga-lake', 1.2);
}

/* ---------- The Radio Mast ---------- */
// Varga's relay mast, 38 m of red and white lattice on three guy lines, with the red lamp on
// top, yagis aimed south at a world that never answered, and her radio hut at its foot.
function structSiteRadio(kit) {
  const height = 38, legR = 0.75, step = 1.6, bandLen = height / 7;
  const red = [0.78, 0.13, 0.09], white = [0.95, 0.95, 0.93];
  const leg = (i, y) => [Math.cos(i * 2.094 + 1.571) * legR, y, Math.sin(i * 2.094 + 1.571) * legR];
  const g0 = kit.ground(0, 0);
  kit.box('stone', 2.6, 0.9, 2.6, { y: g0 - 0.2, tint: 1.25 });
  kit.box('snow', 2.5, 0.06, 2.5, { y: g0 + 0.27 });
  for (let y = 0.25; y < height; y += step) {
    const y1 = Math.min(height, y + step);
    const tint = Math.floor(y / bandLen) % 2 ? white : red;
    for (let i = 0; i < 3; i++) {
      kit.rod('paint', leg(i, y), leg(i, y1), 0.045, 5, { tint });
      kit.rod('paint', leg(i, y1), leg((i + 1) % 3, y1), 0.022, 4, { tint });
      kit.rod('paint', leg(i, y), leg((i + 1) % 3, y1), 0.018, 4, { tint });
    }
  }
  kit.collide(0, 0, 1.4, height);
  // The top: a small platform, a lightning rod and the beacon.
  kit.cyl('iron', 0.95, 0.95, 0.06, { y: height + 0.02 }, 3);
  kit.cyl('iron', 0.02, 0.03, 1.6, { y: height + 0.9 }, 5);
  kit.cyl('iron', 0.2, 0.2, 0.08, { y: height + 0.12 }, 10);
  if (kit.live) kit.add('beacon', new THREE.SphereGeometry(0.22, 12, 8), { y: height + 0.34, uv: false });
  // Two yagis pointed south, the way out.
  for (const [y, yaw] of [[30.5, 0.2], [26, -0.35]]) {
    // A local direction that points to world south (+z), whatever the site's turn.
    const sx = Math.sin(yaw - kit.rot), sz = Math.cos(yaw - kit.rot);
    kit.rod('iron', [0, y, 0], [sx * 2.6, y, sz * 2.6], 0.025, 5);
    for (let e = 0; e < 6; e++) {
      const t = 0.9 + e * 0.32;
      kit.rod('iron', [sx * t - sz * 0.42, y, sz * t + sx * 0.42], [sx * t + sz * 0.42, y, sz * t - sx * 0.42], 0.009, 3);
    }
  }
  // Guy lines from three heights to three anchors, each anchor a concrete block.
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.52, ax = Math.cos(a) * 15.5, az = Math.sin(a) * 15.5, ag = kit.ground(ax, az);
    kit.box('stone', 1.2, 0.9, 1.2, { x: ax, y: ag + 0.05, z: az, ry: -a, tint: 1.2 });
    kit.box('snow', 1.1, 0.08, 1.1, { x: ax, y: ag + 0.52, z: az, ry: -a });
    kit.collide(ax, az, 0.85, 0.9);
    for (const y of [12, 24, 36]) {
      const lx = Math.cos(a) * legR, lz = Math.sin(a) * legR;
      kit.rod('iron', [lx, y, lz], [ax - Math.cos(a) * 0.45, ag + 0.5, az - Math.sin(a) * 0.45], 0.012, 3);
    }
  }
  structSign(kit, 'radio-sign', [['DANGER', 58], ['Radio mast  -  do not climb', 30], ['Hollow Station relay', 28]], 2.1, 1.6, 0.6, { w: 1.2, h: 0.75, post: 0.6, board: '#e9e2c8', ink: '#9a1810', font: 'Arial, sans-serif' });

  // The radio hut, a generator in its lean-to, and the feeder out to the mast.
  const hut = structHut(kit, { x: -6.2, z: 5.6, w: 3.4, d: 2.8, h: 2.2, ry: 0.5, roof: 'gable', pitch: 0.35, roofMat: 'metal', door: { side: 's', at: 0.7, width: 0.9, open: 1.3 }, windows: [{ side: 'e', at: 0, w: 0.8, h: 0.6 }, { side: 's', at: -0.8, w: 0.7, h: 0.6 }] });
  const desk = hut.P(0.6, -0.95), deskTop = hut.floor + 0.78;
  kit.box('woodDark', 1.5, 0.06, 0.62, { x: desk[0], y: deskTop - 0.03, z: desk[1], ry: 0.5 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.07, 0.75, 0.56, { x: hut.P(0.6 + s * 0.68, -0.95)[0], y: hut.floor + 0.37, z: hut.P(0.6 + s * 0.68, -0.95)[1], ry: 0.5 });
  const set = hut.P(0.95, -1.08);
  kit.box('iron', 0.7, 0.42, 0.34, { x: set[0], y: deskTop + 0.21, z: set[1], ry: 0.5 });
  if (kit.live) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.38), structSignMaterial('radio-set', () => canvasTexture(128, 64, (c, w, h) => {
      c.fillStyle = '#2a2826';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d8c48a';
      c.fillRect(8, 8, 52, 22);
      c.strokeStyle = '#3a2a1a';
      for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(12 + i * 5.5, 22); c.lineTo(12 + i * 5.5, 28); c.stroke(); }
      c.fillStyle = '#c84a2a';
      c.fillRect(30, 10, 2, 18);
      for (const [x, y, r] of [[80, 20, 9], [106, 20, 9], [80, 46, 7], [106, 46, 7], [34, 46, 10]]) { c.fillStyle = '#111'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#777'; c.fillRect(x - 1, y - r, 2, r); }
    })));
    const [fx, fz] = hut.P(0.95, -0.9);
    face.position.set(fx, deskTop + 0.21, fz);
    face.rotation.y = 0.5;
    kit.extra.push(face);
  }
  kit.item('note:radio-transcript', ...hut.P(0.2, -0.9), { y: deskTop + 0.01 });
  kit.item('chocolate', ...hut.P(-1.1, -0.9), { y: hut.floor + 0.48 });
  kit.box('wood', 0.9, 0.05, 0.4, { x: hut.P(-1.1, -0.95)[0], y: hut.floor + 0.45, z: hut.P(-1.1, -0.95)[1], ry: 0.5 });
  kit.item('thermos', ...hut.P(-0.8, 0.4));
  const gen = hut.P(-2.6, -0.2), gg = kit.ground(...gen);
  kit.box('iron', 1.0, 0.65, 0.6, { x: gen[0], y: gg + 0.32, z: gen[1], ry: 0.5 });
  kit.cyl('paint', 0.25, 0.25, 0.9, { x: gen[0], y: gg + 0.78, z: gen[1], rz: Math.PI / 2, ry: 0.5, tint: [0.6, 0.15, 0.1] }, 10);
  kit.cyl('iron', 0.04, 0.04, 0.9, { x: gen[0] + 0.3, y: gg + 1.0, z: gen[1] }, 6);
  kit.box('metal', 1.5, 0.06, 1.2, { x: gen[0], y: gg + 1.55, z: gen[1], ry: 0.5, rx: 0.15 });
  kit.box('snow', 1.4, 0.08, 1.1, { x: gen[0], y: gg + 1.62, z: gen[1], ry: 0.5, rx: 0.15 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.08, 1.6, 0.08, { x: gen[0] + Math.cos(0.5) * s * 0.7, y: gg + 0.75, z: gen[1] - Math.sin(0.5) * s * 0.7 });
  kit.collide(gen[0], gen[1], 0.7, 1.2);
  kit.item('cloth', gen[0] + 0.4, gen[1] + 0.9);
  structDrum(kit, gen[0] - 0.6, gen[1] - 1.0, [0.25, 0.4, 0.25]);
  const feed = hut.P(1.7, 0);
  kit.rod('iron', [feed[0], hut.top - 0.2, feed[1]], [-0.4, 3.2, 0.3], 0.02, 4);
  structFlag(kit, 5.4, 6.8, 'regulator', 'varga-radio', 1.1);
}

/* ---------- The Dakota ---------- */
// Aksel Holm's Douglas Dakota, down in a whiteout in November 1979: the fuselage broken in
// two and half buried, one wing still on, the other torn away with its engine, cargo spilled
// in the snow, and the grave Varga made for him from a propeller blade and stones.
function structSiteDakota(kit) {
  // Ex-air-force, still in faded olive drab, which shows better than bare metal in the snow.
  const alloy = [0.5, 0.53, 0.38], frames = [];
  // The fuselage's profile, nose (+x) to tail: [x, radius].
  const profile = [[-10.8, 0.12], [-9.6, 0.45], [-7.4, 0.86], [-4.6, 1.14], [-2, 1.22], [3, 1.24], [5.4, 1.2], [6.8, 1.04], [7.8, 0.78], [8.5, 0.42], [8.85, 0.05]];
  const radiusAt = (x) => {
    for (let i = 1; i < profile.length; i++) {
      const [x0, r0] = profile[i - 1], [x1, r1] = profile[i];
      if (x <= x1) return lerp(r0, r1, THREE.MathUtils.clamp((x - x0) / (x1 - x0), 0, 1));
    }
    return profile[profile.length - 1][1];
  };
  const lathe = (from, to) => {
    const pts = [];
    const n = Math.ceil((to - from) / 0.45);
    for (let i = 0; i <= n; i++) {
      const x = lerp(from, to, i / n);
      pts.push(new THREE.Vector2(radiusAt(x), x));
    }
    return new THREE.LatheGeometry(pts, 18).rotateZ(-Math.PI / 2);
  };
  // A frame for each broken piece: where it lies, its heading and its tilt.
  const frame = (x, y, z, yaw, pitch, roll) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, yaw, pitch, 'YZX')), new THREE.Vector3(1, 1, 1));
    frames.push(m);
    return m;
  };
  const put = (mat, geo, m, o = {}) => {
    if (!kit.live) return;
    if (o.uv !== false && STRUCT_TILE[mat]) structProjectUv(geo, STRUCT_TILE[mat], kit.rand(), kit.rand());
    if (o.at) geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...o.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot || [0, 0, 0]))), new THREE.Vector3(1, 1, 1)));
    geo.applyMatrix4(m);
    kit.add(mat, geo, { uv: false, tint: o.tint });
  };
  const local = (m, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m);
  const yaw = 0.55, ox = -1.5, oz = -2.5;
  const g = kit.ground(ox, oz);
  // The front half: nose down and rolled onto its left side.
  const front = frame(ox, g + 0.45, oz, yaw, -0.08, -0.16);
  put('alloy', lathe(0.6, 8.85), front, { tint: alloy });
  // Cockpit glazing and the cabin windows.
  for (const s of [-1, 1]) {
    put('glass', new THREE.BoxGeometry(0.8, 0.32, 0.05), front, { at: [7.25, 0.52, s * 0.62], rot: [s * 0.55, s * 0.5, -0.45] });
    put('glass', new THREE.BoxGeometry(0.5, 0.3, 0.05), front, { at: [6.55, 0.62, s * 0.86], rot: [s * 0.45, 0, -0.1] });
    for (let i = 0; i < 4; i++) put('glass', new THREE.BoxGeometry(0.4, 0.4, 0.05), front, { at: [1.6 + i * 1.05, 0.4, s * 1.2], rot: [0, 0, 0] });
    // The cheat line, and the registration.
    put('paint', new THREE.BoxGeometry(5.6, 0.16, 0.02), front, { at: [3.6, 0.0, s * 1.245], tint: [0.18, 0.28, 0.55] });
  }
  structDakotaLabel(kit, front, 3.2, -0.45, 1.27, 1);
  structDakotaLabel(kit, front, 3.2, -0.45, -1.27, -1);
  // The torn edge: crumpled skin and stringers sticking out.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    put('alloy', new THREE.BoxGeometry(0.35 + kit.rand() * 0.4, 0.04, 0.3), front, { at: [0.5 - kit.rand() * 0.3, Math.cos(a) * 1.2, Math.sin(a) * 1.2], rot: [a, kit.rand() - 0.5, kit.rand() - 0.5], tint: 0.8 });
  }
  put('black', new THREE.CircleGeometry(1.15, 16).rotateY(Math.PI / 2), front, { at: [0.75, 0, 0], uv: false });
  // The left wing, still on, its tip buried; the engine with a bent propeller.
  if (kit.live) {
    const foil = new THREE.Shape();
    foil.moveTo(0, 0);
    foil.bezierCurveTo(0.2, 0.22, 1.2, 0.3, 3.4, 0.05);
    foil.lineTo(3.4, -0.02);
    foil.bezierCurveTo(1.2, -0.1, 0.2, -0.12, 0, 0);
    const wing = new THREE.ExtrudeGeometry(foil, { depth: 11.5, bevelEnabled: false, steps: 6 });
    const p = wing.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getZ(i) / 11.5;
      p.setX(i, 3.4 - p.getX(i) * lerp(1, 0.42, t) - t * 0.6);
      p.setY(i, p.getY(i) * lerp(1, 0.45, t) + t * 0.6);
    }
    wing.computeVertexNormals();
    put('alloy', wing, front, { at: [1.0, -0.7, -0.9], rot: [0, Math.PI, 0.02], tint: alloy });
    put('snow', new THREE.BoxGeometry(2.6, 0.1, 9), front, { at: [2.4, -0.42, -6.4], rot: [0.04, 0, 0.02] });
  }
  put('alloy', new THREE.CylinderGeometry(0.72, 0.6, 2.8, 14).rotateZ(Math.PI / 2), front, { at: [3.6, -0.55, -3.6], tint: [0.42, 0.45, 0.32] });
  put('iron', new THREE.CylinderGeometry(0.74, 0.74, 0.45, 14).rotateZ(Math.PI / 2), front, { at: [5.0, -0.55, -3.6] });
  for (let b = 0; b < 3; b++) {
    const a = b * 2.094 + 0.4;
    put('iron', new THREE.BoxGeometry(0.06, 1.5, 0.18), front, { at: [5.35, -0.55 + Math.cos(a) * 0.75, -3.6 + Math.sin(a) * 0.75], rot: [a, 0.35, b === 1 ? 0.9 : 0.15] });
  }
  // The rear half: thrown back and round, tail fin standing up out of the drift.
  const rear = frame(ox - 8.2, g + 0.25, oz + 2.2, yaw + 0.7, 0.06, 0.1);
  put('alloy', lathe(-10.8, -0.6), rear, { tint: alloy });
  put('black', new THREE.CircleGeometry(1.15, 16).rotateY(-Math.PI / 2), rear, { at: [-0.75, 0, 0], uv: false });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) put('glass', new THREE.BoxGeometry(0.38, 0.38, 0.05), rear, { at: [-1.6 - i * 1.05, 0.4, s * 1.19] });
  if (kit.live) {
    const fin = new THREE.Shape();
    fin.moveTo(0, 0);
    fin.lineTo(3.2, 0);
    fin.lineTo(1.0, 2.6);
    fin.lineTo(0.2, 2.6);
    fin.closePath();
    put('alloy', new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: false }).translate(-3.2, 0, -0.06), rear, { at: [-7.4, 0.55, 0], tint: alloy });
    put('paint', new THREE.BoxGeometry(1.3, 0.5, 0.14), rear, { at: [-9.0, 2.3, 0], tint: [0.18, 0.28, 0.55] });
    const plane = new THREE.Shape();
    plane.moveTo(0, 0);
    plane.lineTo(2.2, 0);
    plane.lineTo(1.6, 4.0);
    plane.lineTo(0.5, 4.0);
    plane.closePath();
    for (const s of [-1, 1]) put('alloy', new THREE.ExtrudeGeometry(plane, { depth: 0.08, bevelEnabled: false }).rotateX(s * Math.PI / 2).translate(-10.2, 0, 0), rear, { at: [0, 0.3, s * 0.3], rot: [s > 0 ? 0.25 : -0.1, 0, 0], tint: alloy });
  }
  // Snow lying along both halves and drifted against their sides.
  if (kit.live) {
    const cap = (from, to) => new THREE.CylinderGeometry(1.29, 1.29, to - from, 8, 1, true, -Math.PI / 2 - 0.55, 1.1).rotateZ(-Math.PI / 2).translate((from + to) / 2, 0, 0);
    put('snow', cap(1.2, 6.2), front, { at: [0, 0.04, 0] });
    put('snow', cap(-7.2, -1.2), rear, { at: [0, 0.03, 0] });
  }
  for (const m of [front, rear]) {
    for (const x of m === front ? [1.5, 4, 6.5] : [-1.5, -4, -6.5]) {
      for (const s of [-1, 1]) {
        const p = local(m, x, -0.6, s * 1.5);
        kit.drift(p.x, p.z, 3.4, 0.38, 2.4, -yaw);
      }
    }
  }
  // Colliders run down each half's spine, the wing and the engine.
  for (let x = 1.2; x <= 8.4; x += 1.2) { const p = local(front, x, 0, 0); kit.collide(p.x, p.z, x > 7 ? 0.7 : 1.25, 2.4); }
  for (let z = -2; z >= -12; z -= 1.3) { const p = local(front, 2.6 - z * 0.04, -0.6, z); kit.collide(p.x, p.z, 0.75, 1.0); }
  for (let x = -1.2; x >= -10.2; x -= 1.2) { const p = local(rear, x, 0, 0); kit.collide(p.x, p.z, x < -8 ? 0.6 : 1.2, 2.6); }

  // The right wing, torn off and upside down twenty metres away, its engine beyond it.
  const torn = frame(6.5, kit.ground(6.5, 9.5) + 0.2, 9.5, yaw - 1.9, 0.05, Math.PI - 0.12);
  if (kit.live) {
    const slab = new THREE.BoxGeometry(3.0, 0.28, 8.5);
    const sp = slab.attributes.position;
    for (let i = 0; i < sp.count; i++) { const t = sp.getZ(i) / 8.5 + 0.5; sp.setX(i, sp.getX(i) * lerp(1, 0.5, t)); }
    slab.computeVertexNormals();
    put('alloy', slab, torn, { tint: 0.9 });
  }
  for (let z = -4; z <= 4; z += 1.4) { const p = local(torn, 0, 0, z); kit.collide(p.x, p.z, 0.9, 0.8); }
  const eg = kit.ground(-9, 9.5);
  kit.cyl('alloy', 0.7, 0.58, 2.6, { x: -9, y: eg + 0.4, z: 9.5, ry: 1.2, rz: Math.PI / 2 + 0.2, tint: [0.42, 0.45, 0.32] }, 14);
  kit.cyl('iron', 0.72, 0.72, 0.42, { x: -9 + Math.cos(1.2) * 1.3, y: eg + 0.6, z: 9.5 - Math.sin(1.2) * 1.3, ry: 1.2, rz: Math.PI / 2 + 0.2 }, 14);
  kit.drift(-8.6, 10.2, 3, 0.6, 1.6, 1.2);
  kit.collide(-9, 9.5, 1.2, 1.2);

  // Spilled cargo: crates, mail sacks and suitcases, half under snow.
  for (const [x, z, s, r] of [[1.8, 3.6, 0.75, 0.3], [3.0, 4.4, 0.6, 1.0], [-0.4, 4.8, 0.55, 0.6], [-4.4, 5.6, 0.7, -0.4], [2.4, 5.6, 0.5, 0.2]]) structCrate(kit, x, z, s, r);
  for (const [x, z, r] of [[0.8, 5.4, 0.4], [-2.6, 6.4, 1.3], [-1.6, 3.8, 2.2]]) {
    const sg = kit.ground(x, z);
    if (kit.live) kit.add('cloth', new THREE.SphereGeometry(0.4, 8, 6).scale(1.3, 0.55, 0.8), { x, y: sg + 0.12, z, ry: r, tint: [0.62, 0.56, 0.42] });
    kit.collide(x, z, 0.4, 0.4);
  }
  for (const [x, z, r, tint] of [[4.4, 3.2, 0.5, [0.45, 0.28, 0.18]], [-3.4, 4.0, -0.8, [0.25, 0.3, 0.42]]]) {
    const sg = kit.ground(x, z);
    kit.box('cloth', 0.7, 0.22, 0.48, { x, y: sg + 0.08, z, ry: r, rz: 0.1, tint });
    kit.box('iron', 0.2, 0.04, 0.04, { x, y: sg + 0.21, z, ry: r });
  }
  kit.item('note:dakota-log', 0.2, 2.4);
  kit.item('medkit', 2.4, 3.0);
  kit.item('beans', -3.4, 5.0, { count: 2 });
  kit.item('cloth', 0.9, 6.3);

  // Aksel's grave, which Varga made: a cairn, a propeller blade, a plate she punched by hand.
  const gx = -8.6, gz = -6.4, gg = kit.ground(gx, gz);
  for (let i = 0; i < 14; i++) {
    const a = kit.rand() * 6.28, r = kit.rand() * 0.8, s = 0.18 + kit.rand() * 0.16;
    if (kit.live) kit.add('stone', new THREE.IcosahedronGeometry(s, 0), { x: gx + Math.cos(a) * r, y: gg + s * 0.5 + (0.8 - r) * 0.3, z: gz + Math.sin(a) * r, rx: kit.rand() * 3, ry: kit.rand() * 3, uv: false, tint: 0.85 });
  }
  if (kit.live) {
    const blade = new THREE.Shape();
    blade.moveTo(-0.08, 0);
    blade.lineTo(0.08, 0);
    blade.quadraticCurveTo(0.16, 0.9, 0.1, 1.55);
    blade.quadraticCurveTo(0, 1.68, -0.1, 1.55);
    blade.quadraticCurveTo(-0.16, 0.9, -0.08, 0);
    kit.add('iron', new THREE.ExtrudeGeometry(blade, { depth: 0.04, bevelEnabled: false }), { x: gx, y: gg + 0.3, z: gz, ry: 0.3, rz: 0.05 });
  }
  structSign(kit, 'dakota-grave', [['AKSEL HOLM', 56], ['pilot', 34], ['1921 - 1979', 40]], gx + 0.1, gz + 0.75, 0.3, { w: 0.62, h: 0.34, post: 0.3, board: '#8a8f96', ink: '#1e2024', font: 'Courier New, monospace' });
  kit.collide(gx, gz, 0.9, 1.5);
  structFlag(kit, 5.8, 6.4, 'altimeter', 'varga-dakota', 2.2);
}

// The airline name and registration down the Dakota's side.
function structDakotaLabel(kit, frame, x, y, z, side) {
  if (!kit.live) return;
  const mat = structSignMaterial('dakota-label', () => canvasTexture(512, 96, (c, w, h) => {
    c.fillStyle = 'rgba(236,232,218,0.92)';
    c.font = 'bold 54px Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('HOLM AIR    LN-HAK', w / 2, h / 2);
  }));
  mat.transparent = true;
  mat.alphaTest = 0.25;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.68), mat);
  mesh.position.set(x, y, z);
  if (side < 0) mesh.rotation.y = Math.PI;
  mesh.applyMatrix4(frame);
  kit.extra.push(mesh);
}

/* ---------- Last Camp ---------- */
// Where the Dakota's three survivors camped under the north wall in 1979 and went up the
// ropes; Varga found the camp in spring, the ropes running up the cliff to nothing.
function structSiteCamp(kit) {
  const crag = structCrag(kit, { cz: -32, a: 62, b: 62, c: 15.5, cy: -16, seed: 3.7 });
  // The fixed ropes, each pinned with pitons and ending where they ended.
  const ropes = [[-6.5, 24, [0.75, 0.16, 0.12]], [1.8, 33, [0.2, 0.34, 0.72]], [9.2, 16, [0.86, 0.68, 0.16]]];
  kit.anim.ends = [];
  for (const [x0, top, tint] of ropes) {
    let prev = null;
    for (let y = -0.5; y <= top; y += 1) {
      const sway = Math.sin(y * 0.35 + x0) * 0.6;
      const s = crag.surface(x0 + sway, y);
      const p = [s[0], s[1], s[2] + 0.28];
      if (prev) kit.rod('rope', prev, p, 0.04, 4, { tint });
      if (Math.round(y) % 5 === 0 && y > 1) kit.box('iron', 0.06, 0.18, 0.08, { x: p[0], y: p[1], z: p[2] - 0.08, tint: 1.3 });
      prev = p;
    }
    // The last metre or so hangs free from the top piton, frayed, moving in the wind.
    if (kit.live) {
      const end = new THREE.Group();
      const piece = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 2.2, 4).translate(0, -1.1, 0), structMats().rope);
      piece.material = structMats().rope;
      end.add(piece);
      end.position.set(prev[0], prev[1], prev[2] + 0.05);
      end.rotation.z = 0.25;
      kit.extra.push(end);
      kit.anim.ends.push({ obj: end, phase: x0 });
    }
  }
  // Their tents: an orange ridge tent still standing, a yellow one fallen in, a blue one torn.
  const tent = (x, z, ry, tint, slump) => {
    const g = kit.footing(x, z, 2.2, 1.8, ry).lo;
    const c = Math.cos(ry), s = Math.sin(ry);
    const h = 1.25 * (1 - slump), half = 0.85;
    const slope = Math.atan2(h, half), panel = Math.hypot(h, half);
    for (const side of [-1, 1]) kit.box('cloth', 2.3, 0.03, panel, { x: x + s * side * half / 2, y: g + h / 2, z: z + c * side * half / 2, ry, rx: side * slope, tint });
    if (kit.live && slump < 0.5) {
      const tri = new THREE.Shape();
      tri.moveTo(-half, 0);
      tri.lineTo(half, 0);
      tri.lineTo(0, h);
      tri.closePath();
      kit.add('cloth', new THREE.ShapeGeometry(tri).rotateY(Math.PI / 2), { x: x - c * 1.15, y: g, z: z + s * 1.15, ry, tint });
    }
    for (const end of [-1, 1]) kit.rod('iron', [x + c * end * 1.1, g - 0.1, z - s * end * 1.1], [x + c * end * 1.1, g + h + 0.05, z - s * end * 1.1], 0.015, 4);
    kit.box('snow', 2.0, 0.08, 0.45, { x: x + s * 0.35, y: g + h * 0.6, z: z + c * 0.35, ry, rx: slope });
    kit.collideLine(x - c * 1.15, z + s * 1.15, x + c * 1.15, z - s * 1.15, h, 0.7);
    return g;
  };
  tent(-4.4, -10.0, 0.25, [1.0, 0.45, 0.12], 0);
  tent(2.6, -11.0, -0.2, [0.95, 0.82, 0.22], 0.72);
  const tg = tent(8.0, -8.6, 0.6, [0.25, 0.42, 0.75], 0.25);
  if (kit.live) {
    for (const [dx, dy, len] of [[0, 0.6, 1.1], [-0.6, 0.4, 0.8]]) kit.add('tatter', new THREE.PlaneGeometry(len, 0.5, 6, 2).translate(len / 2, 0, 0), { x: 8.0 + dx, y: tg + dy, z: -8.6 + 0.4, ry: structWindYaw(kit), uv: false, tint: [0.25, 0.42, 0.75] });
  }
  // The open tent's mouth: the diary just inside, and their rucksacks.
  kit.item('note:climber-diary', -4.4 + Math.cos(0.25) * 2.0, -10.0 - Math.sin(0.25) * 2.0);
  for (const [x, z, r, tint] of [[-6.4, -8.4, 0.4, [0.7, 0.16, 0.12]], [-5.8, -7.9, -0.3, [0.25, 0.4, 0.3]]]) {
    const g = kit.ground(x, z);
    kit.box('cloth', 0.42, 0.62, 0.3, { x, y: g + 0.28, z, ry: r, rx: 0.15, tint });
    kit.box('cloth', 0.38, 0.18, 0.12, { x: x + Math.sin(r) * 0.18, y: g + 0.2, z: z + Math.cos(r) * 0.18, ry: r, tint: [tint[0] * 0.8, tint[1] * 0.8, tint[2] * 0.8] });
    kit.collide(x, z, 0.3, 0.7);
  }
  kit.item('chocolate', -6.0, -7.0, { count: 2 });
  // Their fire, long cold, with a blackened kettle on a tripod.
  const fx = 0.4, fz = -5.6, fg = kit.ground(fx, fz);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    if (kit.live) kit.add('stone', new THREE.IcosahedronGeometry(0.13, 0), { x: fx + Math.cos(a) * 0.5, y: fg + 0.06, z: fz + Math.sin(a) * 0.5, rx: i, ry: i * 2, uv: false });
  }
  for (let i = 0; i < 3; i++) kit.cyl('black', 0.05, 0.05, 0.6, { x: fx, y: fg + 0.08, z: fz, ry: i * 1.2, rz: Math.PI / 2 }, 6);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094;
    kit.rod('iron', [fx + Math.cos(a) * 0.55, fg - 0.05, fz + Math.sin(a) * 0.55], [fx, fg + 1.15, fz], 0.015, 4);
  }
  kit.cyl('black', 0.12, 0.15, 0.2, { x: fx, y: fg + 0.62, z: fz }, 10);
  kit.collide(fx, fz, 0.6, 0.6);
  kit.item('warmer', fx + 1.3, fz + 0.4);
  // Skis stood in the snow, an ice axe, a coiled rope, a sledge.
  for (const [x, z, a, tint] of [[-8.4, -6.0, 0.18, [0.75, 0.2, 0.15]], [-8.0, -6.1, -0.14, [0.75, 0.2, 0.15]], [-7.3, -6.3, 0.08, [0.2, 0.2, 0.25]]]) {
    const g = kit.ground(x, z);
    kit.box('paint', 0.08, 1.85, 0.02, { x, y: g + 0.75, z, rz: a, tint });
  }
  kit.drift(-7.9, -6.2, 1.8, 0.4, 0.9);
  kit.collide(-7.9, -6.2, 0.5, 1.8);
  const ag = kit.ground(3.6, -6.8);
  kit.cyl('woodDark', 0.022, 0.022, 0.75, { x: 3.6, y: ag + 0.25, z: -6.8, rx: 0.15 }, 5);
  kit.box('iron', 0.34, 0.05, 0.05, { x: 3.6, y: ag + 0.62, z: -6.75, rx: 0.15 });
  if (kit.live) kit.add('rope', new THREE.TorusGeometry(0.28, 0.06, 5, 14).rotateX(Math.PI / 2), { x: 4.4, y: kit.ground(4.4, -7.4) + 0.05, z: -7.4, uv: false, tint: [0.75, 0.16, 0.12] });
  const sg = kit.ground(5.6, -3.6);
  kit.box('paint', 0.62, 0.22, 1.5, { x: 5.6, y: sg + 0.12, z: -3.6, ry: 0.4, tint: [0.25, 0.45, 0.3] });
  kit.box('snow', 0.55, 0.08, 1.2, { x: 5.6, y: sg + 0.25, z: -3.6, ry: 0.4 });
  kit.collide(5.6, -3.6, 0.6, 0.3);
  kit.item('cloth', 7.6, -7.0);
  structFlag(kit, 4.0, 2.2, 'harness', 'varga-camp', 0.4);
}

/* ---------- The Frozen Altar ---------- */
// The altar itself is the world's. Around it: a ring of standing stones with a gap to the
// south, the miners' carved tablet, a pair of iron braziers gone cold, stepping stones in.
function structSiteAltar(kit) {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + 0.42 + (i / 9) * (Math.PI * 2 - 0.84);
    const r = 11 + Math.sin(i * 3.1) * 0.6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 2.4 + ((i * 7) % 5) * 0.35;
    const g = kit.ground(x, z);
    if (kit.live) {
      const stone = new THREE.CylinderGeometry(0.42, 0.62, h, 5, 4);
      const p = stone.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const k = 1 + 0.18 * Math.sin(p.getY(v) * 2.3 + v * 1.7 + i);
        p.setX(v, p.getX(v) * k * 1.25);
        p.setZ(v, p.getZ(v) * k * 0.8);
      }
      stone.computeVertexNormals();
      kit.add('cliff', stone, { x, y: g + h / 2 - 0.3, z, ry: -a + Math.PI / 2, rx: Math.sin(i * 2.7) * 0.06, rz: Math.cos(i * 1.9) * 0.08, tint: 0.85 + (i % 3) * 0.08 });
      kit.add('snow', new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.25, 0.65), { x, y: g + h - 0.32, z, ry: -a + Math.PI / 2 });
    }
    kit.drift(x + 0.2, z + 0.3, 1.6, 0.4, 1.1, -a);
    kit.collide(x, z, 0.7, h);
  }
  kit.item('shard', Math.cos(Math.PI * 1.15) * 9.6, Math.sin(Math.PI * 1.15) * 9.6);
  // The tablet the miners cut in 1932, on a plinth facing the way in.
  const tx = -5.4, tz = 6.6, ry = 0.55, tg = kit.ground(tx, tz);
  kit.box('stone', 1.9, 0.5, 0.75, { x: tx, y: tg + 0.05, z: tz, ry, tint: 0.85 });
  kit.box('stone', 1.6, 2.3, 0.32, { x: tx, y: tg + 1.45, z: tz, ry, tint: 0.95 });
  kit.box('snow', 1.6, 0.08, 0.34, { x: tx, y: tg + 2.62, z: tz, ry });
  if (kit.live) {
    const mat = structSignMaterial('altar-tablet', () => structCarvedTexture([['HALVARD MINING CO.', 26], ['MCMXXXII', 30], ['', 10], ['FROM THE FIRST', 24], ['STAR-IRON OF THE HOLLOW', 22], ['WE FORGED THIS BLADE', 24], ['AND SET IT HERE', 24], ['TO KEEP THE WOLVES', 24], ['FROM OUR DOOR', 24], ['', 10], ['MAY ITS FIRE NOT FAIL', 22]]));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.95), mat);
    face.position.set(tx + Math.sin(ry) * 0.165, tg + 1.45, tz + Math.cos(ry) * 0.165);
    face.rotation.y = ry;
    face.receiveShadow = true;
    kit.extra.push(face);
  }
  kit.collideLine(tx - Math.cos(ry) * 0.75, tz + Math.sin(ry) * 0.75, tx + Math.cos(ry) * 0.75, tz - Math.sin(ry) * 0.75, 2.6, 0.38);
  kit.item('note:shrine-tablet', tx + Math.sin(ry) * 1.2, tz + Math.cos(ry) * 1.2);
  // Two braziers, black iron bowls on tripods.
  for (const s of [-1, 1]) {
    const bx = s * 4.9, bz = 3.4, bg = kit.ground(bx, bz);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094;
      kit.rod('iron', [bx + Math.cos(a) * 0.45, bg - 0.05, bz + Math.sin(a) * 0.45], [bx, bg + 1.0, bz], 0.03, 5);
    }
    if (kit.live) kit.add('iron', new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { x: bx, y: bg + 1.18, z: bz, uv: false });
    kit.cyl('black', 0.38, 0.38, 0.04, { x: bx, y: bg + 1.14, z: bz }, 12);
    kit.cyl('snow', 0.3, 0.36, 0.08, { x: bx, y: bg + 1.18, z: bz }, 12);
    kit.collide(bx, bz, 0.45, 1.3);
  }
  // A miner's pick left leaning on a stone, and an old lamp.
  const pa = Math.PI / 2 + 0.42 + (1 / 9) * (Math.PI * 2 - 0.84), px = Math.cos(pa) * 10.2, pz = Math.sin(pa) * 10.2, pg = kit.ground(px, pz);
  kit.rod('woodDark', [px - 0.2, pg, pz + 0.3], [px - 0.05, pg + 0.95, pz + 0.05], 0.025, 5);
  kit.box('iron', 0.7, 0.06, 0.06, { x: px - 0.05, y: pg + 0.95, z: pz + 0.05, ry: 0.4, rz: 0.15 });
  kit.cyl('rust', 0.07, 0.09, 0.22, { x: 2.2, y: kit.ground(2.2, -4.8) + 0.11, z: -4.8 }, 8);
  // Stepping stones up from the south.
  for (let i = 0; i < 7; i++) {
    const z = 17 - i * 1.8, x = Math.sin(i * 1.3) * 0.4;
    kit.cyl('stone', 0.55, 0.6, 0.16, { x, y: kit.ground(x, z) + 0.02, z, ry: i, tint: 0.8 }, 7);
  }
  structFlag(kit, 6.8, 8.4, 'striker', 'varga-altar', 3.6);
}

/* ---------- Chapel of Our Lady of the Snows ---------- */
// The miners' chapel: tarred boards, a steep roof under snow, a belfry and spire over the
// door, stained glass, pews, Our Lady on her plinth and an empty chain where the iron
// chandelier ring once hung. Beside it, eleven crosses for the men of 1934.
function structSiteChapel(kit) {
  const pitch = 0.95;
  const nave = structHut(kit, { x: 0, z: -4, w: 9, d: 5.4, h: 3.2, ry: Math.PI / 2, wall: 'woodV', roof: 'gable', pitch, roofMat: 'woodDark', trim: 'woodDark', overhang: 0.45, door: { side: 'w', at: 0, width: 1.3, open: 1.2 }, windows: [-2.6, 0, 2.6].flatMap((at) => [{ side: 's', at, w: 0.55, h: 1.5, y: 1.75, mat: 'stained' }, { side: 'n', at, w: 0.55, h: 1.5, y: 1.75, mat: 'stained' }]).concat([{ side: 'e', at: 0, w: 0.7, h: 0.9, y: 2.6, mat: 'stained' }]) });
  const ridge = nave.top + 2.7 * Math.tan(pitch);
  // A stone step at the door.
  kit.box('stone', 1.8, 0.4, 0.8, { x: 0, y: nave.lo - 0.05, z: 0.95, tint: 0.85 });
  // The belfry: a square tower through the roof, an open stage for the bell, the spire.
  const bz = -0.4, base = ridge - 1.4, stage = ridge + 1.3, cap = stage + 1.25;
  kit.box('woodV', 1.6, stage - base, 1.6, { x: 0, y: (base + stage) / 2, z: bz });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) kit.box('woodDark', 0.16, cap - stage, 0.16, { x: sx * 0.72, y: (stage + cap) / 2, z: bz + sz * 0.72 });
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 3; i++) {
      const y = stage + 0.12 + i * 0.12;
      kit.box('woodDark', side % 2 ? 0.05 : 1.5, 0.05, side % 2 ? 1.5 : 0.05, { x: [0, 0.75, 0, -0.75][side], y, z: bz + [-0.75, 0, 0.75, 0][side] });
    }
  }
  kit.box('woodDark', 1.8, 0.12, 1.8, { x: 0, y: cap + 0.06, z: bz });
  if (kit.live) {
    kit.add('woodDark', new THREE.ConeGeometry(1.25, 3.6, 4, 1).rotateY(Math.PI / 4), { x: 0, y: cap + 1.9, z: bz, tint: 0.75 });
    kit.add('snow', new THREE.ConeGeometry(1.27, 1.0, 4, 1, true).rotateY(Math.PI / 4), { x: 0, y: cap + 0.62, z: bz });
  }
  kit.box('iron', 0.06, 0.8, 0.06, { x: 0, y: cap + 4.0, z: bz });
  kit.box('iron', 0.42, 0.06, 0.06, { x: 0, y: cap + 4.15, z: bz });
  if (kit.live) {
    const pts = [[0.02, 0.4], [0.12, 0.38], [0.16, 0.25], [0.2, 0.06], [0.28, -0.08], [0.3, -0.12]].map(([r, y]) => new THREE.Vector2(r, y));
    const bell = new THREE.Group();
    const m = structMats();
    const shell = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), m.bronze);
    shell.position.y = -0.38;
    shell.material = m.bronze;
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), m.woodDark);
    bell.add(shell, yoke);
    kit.object(bell, 0, stage + 0.78, bz);
    kit.anim.bell = bell;
  }
  // Pews either side of the aisle, the altar, Our Lady, the lectern, the empty chain.
  const f = nave.floor;
  for (let row = 0; row < 4; row++) {
    const z = -1.6 - row * 1.35;
    for (const s of [-1, 1]) {
      const x = s * 1.48;
      kit.box('woodDark', 1.7, 0.06, 0.42, { x, y: f + 0.45, z });
      kit.box('woodDark', 1.7, 0.45, 0.05, { x, y: f + 0.75, z: z - 0.22, rx: -0.12 });
      for (const e of [-0.8, 0.8]) kit.box('woodDark', 0.05, 0.9, 0.5, { x: x + e, y: f + 0.45, z: z - 0.03 });
      kit.collideLine(s * 0.78, z, s * 2.3, z, 1.0, 0.24);
    }
  }
  kit.item('beans', -1.6, -2.95, { y: f + 0.48 });
  kit.item('warmer', 1.3, -4.3, { y: f + 0.48 });
  kit.box('woodDark', 1.7, 0.95, 0.7, { x: 0, y: f + 0.47, z: -7.5 });
  kit.box('cloth', 1.75, 0.04, 0.78, { x: 0, y: f + 0.96, z: -7.5, tint: [1.15, 1.13, 1.06] });
  kit.box('cloth', 1.75, 0.5, 0.02, { x: 0, y: f + 0.72, z: -7.11, tint: [1.15, 1.13, 1.06] });
  for (const s of [-1, 1]) {
    kit.cyl('bronze', 0.05, 0.07, 0.35, { x: s * 0.6, y: f + 1.15, z: -7.55 }, 8);
    kit.cyl('cloth', 0.025, 0.025, 0.16, { x: s * 0.6, y: f + 1.4, z: -7.55, tint: [1.2, 1.18, 1.1] }, 6);
  }
  kit.collideLine(-0.9, -7.5, 0.9, -7.5, 1, 0.4);
  kit.box('stone', 0.7, 0.9, 0.5, { x: 0, y: f + 0.45, z: -8.15, tint: 0.95 });
  kit.cyl('wood', 0.12, 0.32, 1.15, { x: 0, y: f + 1.47, z: -8.15, tint: [1.3, 1.25, 1.18] }, 10);
  kit.cyl('wood', 0.1, 0.13, 0.12, { x: 0, y: f + 2.1, z: -8.15, tint: [1.3, 1.25, 1.18] }, 8);
  if (kit.live) {
    kit.add('wood', new THREE.SphereGeometry(0.11, 10, 8), { x: 0, y: f + 2.25, z: -8.15, tint: [1.35, 1.3, 1.22], uv: false });
    kit.add('bronze', new THREE.TorusGeometry(0.075, 0.015, 4, 12).rotateX(Math.PI / 2), { x: 0, y: f + 2.36, z: -8.15, uv: false });
  }
  kit.item('bandage', -0.95, -6.85);
  kit.box('woodDark', 0.1, 1.05, 0.1, { x: 1.15, y: f + 0.52, z: -6.6 });
  kit.box('woodDark', 0.5, 0.04, 0.4, { x: 1.15, y: f + 1.08, z: -6.6, rx: 0.3 });
  kit.box('woodDark', 0.4, 0.06, 0.4, { x: 1.15, y: f + 0.03, z: -6.6 });
  kit.box('cloth', 0.32, 0.05, 0.24, { x: 1.15, y: f + 1.12, z: -6.6, rx: 0.3, tint: [0.5, 0.15, 0.12] });
  kit.item('note:chapel-register', 1.15, -6.6, { y: f + 1.12 });
  kit.collide(1.15, -6.6, 0.25, 1.1);
  for (let i = 0; i < 6; i++) kit.box('iron', 0.04, 0.16, 0.04, { x: 0, y: ridge - 0.4 - i * 0.17, z: -4, ry: i * 1.57 });
  kit.box('iron', 0.1, 0.04, 0.04, { x: 0, y: ridge - 1.45, z: -4 });

  // The graveyard: eleven crosses in a picket fence, and the stone for the eleven.
  const gx = 7.8, gz = -3.8, gw = 6.2, gd = 7.6;
  for (let i = 0; i < 11; i++) {
    const row = i < 6 ? 0 : 1, col = row ? i - 6 + 0.5 : i;
    const x = gx - gw / 2 + 0.75 + col * 0.95, z = gz - 1.4 - row * 2.4;
    const g = kit.ground(x, z), lean = Math.sin(i * 2.3) * 0.07;
    kit.box('woodDark', 0.09, 1.15, 0.07, { x, y: g + 0.45, z, rz: lean, tint: 0.85 });
    kit.box('woodDark', 0.55, 0.08, 0.07, { x: x - lean * 0.75, y: g + 0.8, z, rz: lean, tint: 0.85 });
    kit.box('snow', 0.11, 0.05, 0.1, { x: x - lean * 1.1, y: g + 1.04, z, rz: lean });
    kit.drift(x, z + 0.7, 0.75, 0.22, 1.3);
    kit.collide(x, z, 0.14, 1.1);
  }
  const fence = [[gx - gw / 2, gz + gd / 2], [gx + gw / 2, gz + gd / 2], [gx + gw / 2, gz - gd / 2], [gx - gw / 2, gz - gd / 2], [gx - gw / 2, gz + gd / 2]];
  for (let e = 0; e < 4; e++) {
    const [ax, az] = fence[e], [bx, bz] = fence[e + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.32);
    const gate = e === 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(ax, bx, t), z = lerp(az, bz, t);
      if (gate && Math.abs(t - 0.5) < 0.12) continue;
      kit.box('wood', 0.07, 0.85, 0.04, { x, y: kit.ground(x, z) + 0.36, z, ry: e % 2 ? Math.PI / 2 : 0, tint: 0.8 + kit.rand() * 0.25 });
    }
    for (const y of [0.25, 0.62]) {
      if (gate) {
        for (const [t0, t1] of [[0, 0.38], [0.62, 1]]) kit.beam('woodDark', [lerp(ax, bx, t0), kit.ground(ax, az) + y, lerp(az, bz, t0)], [lerp(ax, bx, t1), kit.ground(bx, bz) + y, lerp(az, bz, t1)], 0.05, 0.05);
      } else {
        kit.beam('woodDark', [ax, kit.ground(ax, az) + y, az], [bx, kit.ground(bx, bz) + y, bz], 0.05, 0.05);
      }
    }
    if (gate) {
      kit.collideLine(ax, az, lerp(ax, bx, 0.38), lerp(az, bz, 0.38), 0.9, 0.12);
      kit.collideLine(lerp(ax, bx, 0.62), lerp(az, bz, 0.62), bx, bz, 0.9, 0.12);
    } else {
      kit.collideLine(ax, az, bx, bz, 0.9, 0.12);
    }
  }
  const mx = gx - 1.4, mz = gz + 2.4, mg = kit.ground(mx, mz);
  kit.box('stone', 1.0, 0.95, 0.24, { x: mx, y: mg + 0.42, z: mz, tint: 0.95 });
  kit.box('snow', 0.98, 0.06, 0.24, { x: mx, y: mg + 0.92, z: mz });
  if (kit.live) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.85), structSignMaterial('chapel-stone', () => structCarvedTexture([['ELEVEN MEN', 34], ['OF THE', 24], ['STAR-IRON MINE', 30], ['MCMXXXIV', 30], ['', 14], ['REQUIESCANT', 24], ['IN PACE', 24]])));
    face.position.set(mx, mg + 0.45, mz + 0.125);
    kit.extra.push(face);
  }
  kit.collide(mx, mz, 0.5, 1);
  structFlag(kit, -6.2, 4.6, 'crown', 'varga-chapel', 0.9);
}

/* ---------- The Star-Iron Mine ---------- */
// The Halvard company's adit in the west wall, boarded up in 1934: a timbered portal, rails
// out to the spoil heap where blue star-iron still glints, ore carts, the tool shed, pit
// props and the company's notice.
function structSiteMine(kit) {
  const crag = structCrag(kit, { cz: -32, a: 58, b: 58, c: 17, cy: -16, seed: 7.2 });
  const zf = crag.surface(0, 1.4)[2] - 0.3;
  const pg = kit.ground(0, zf + 1.5);
  // Timber sets running back into the rock, roofed and walled with lagging boards.
  for (const z of [zf, zf + 1, zf + 2, zf + 2.9]) {
    for (const s of [-1, 1]) kit.box('log', 0.26, 3.1, 0.26, { x: s * 1.3, y: pg + 1.3, z, tint: 0.8 });
    kit.box('log', 3.2, 0.3, 0.3, { x: 0, y: pg + 2.95, z, tint: 0.8 });
  }
  for (let i = 0; i < 8; i++) kit.box('woodDark', 0.36, 0.06, 3.3, { x: -1.3 + i * 0.37, y: pg + 3.13, z: zf + 1.45, tint: 0.6 + kit.rand() * 0.2 });
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) kit.box('woodDark', 0.06, 0.44, 3.3, { x: s * 1.45, y: pg + 0.2 + i * 0.46, z: zf + 1.45, tint: 0.45 + kit.rand() * 0.15 });
  kit.box('black', 2.5, 2.85, 0.05, { x: 0, y: pg + 1.4, z: zf + 0.2 });
  kit.box('snow', 3.4, 0.16, 3.5, { x: 0, y: pg + 3.24, z: zf + 1.45 });
  // The boards across the mouth: one missing, one hanging by a nail.
  for (const [y, rz, dx] of [[0.55, 0.04, 0], [1.2, -0.03, 0], [2.4, 0.06, 0], [1.65, 0.75, -0.55]]) kit.box('wood', y === 1.65 ? 1.5 : 2.9, 0.22, 0.05, { x: dx, y: pg + y, z: zf + 3.08, rz, tint: 0.75 });
  if (kit.live) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.3), structSignMaterial('mine-portal', () => structSignTexture([['STAR-IRON  No. 1', 120]], { w: 1024, h: 160, board: '#3b2c20', ink: '#d8c8a0', border: false })));
    board.position.set(0, pg + 2.95, zf + 3.06);
    kit.extra.push(board);
  }
  for (const s of [-1, 1]) kit.collide(s * 1.3, zf + 2.9, 0.3, 3);
  kit.collideLine(-1.2, zf + 3.1, 1.2, zf + 3.1, 3, 0.3);
  kit.collideLine(-1.5, zf + 0.2, -1.5, zf + 2.9, 3, 0.3);
  kit.collideLine(1.5, zf + 0.2, 1.5, zf + 2.9, 3, 0.3);
  kit.rod('iron', [1.55, pg + 2.5, zf + 3.1], [1.75, pg + 2.5, zf + 3.1], 0.02, 4);
  kit.cyl('rust', 0.08, 0.1, 0.22, { x: 1.75, y: pg + 2.3, z: zf + 3.1 }, 8);

  // The rails, out of the adit and round to the heap, on sleepers laid over the ground.
  const curve = new THREE.CatmullRomCurve3([[0, zf + 2.5], [0, -10], [1.2, -4], [4.6, 1.8], [8.6, 5.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const length = curve.getLength(), rail = [[], []];
  for (let d = 0; d <= length; d += 0.7) {
    const t = d / length, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const yaw = Math.atan2(tan.x, tan.z), g = kit.ground(p.x, p.z);
    kit.box('woodDark', 1.3, 0.1, 0.2, { x: p.x, y: g + 0.03, z: p.z, ry: yaw, tint: 0.6 + kit.rand() * 0.2 });
    for (const s of [0, 1]) rail[s].push([p.x + Math.cos(yaw) * (s ? 0.45 : -0.45), g + 0.12, p.z - Math.sin(yaw) * (s ? 0.45 : -0.45)]);
  }
  for (const line of rail) for (let i = 1; i < line.length; i++) kit.beam('rust', line[i - 1], line[i], 0.06, 0.08);
  // An ore cart on the rails, another tipped over at the heap with its load spilled.
  const cart = (p, yaw, roll, y) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    kit.box('rust', 1.0, 0.6, 1.3, { x: p.x, y: y + 0.6, z: p.z, ry: yaw, rz: roll });
    kit.box('iron', 1.08, 0.06, 1.38, { x: p.x, y: y + 0.92, z: p.z, ry: yaw, rz: roll });
    if (!roll) for (const [wx, wz] of [[-0.45, -0.42], [0.45, -0.42], [-0.45, 0.42], [0.45, 0.42]]) kit.cyl('iron', 0.17, 0.17, 0.06, { x: p.x + c * wx + s * wz, y: y + 0.24, z: p.z - s * wx + c * wz, ry: yaw, rz: Math.PI / 2 }, 10);
    kit.collide(p.x, p.z, 0.8, 1);
  };
  const c1 = curve.getPointAt(0.32), t1 = curve.getTangentAt(0.32);
  cart(c1, Math.atan2(t1.x, t1.z), 0, kit.ground(c1.x, c1.z) + 0.02);
  const c2 = new THREE.Vector3(9.4, 0, 7.4);
  cart(c2, 0.6, 1.45, kit.ground(c2.x, c2.z) - 0.1);
  // The spoil heap: grey waste rock, and in it the blue glint of star-iron.
  const hx = 11.5, hz = 10.5, hr = 4.6, hh = 2.1;
  if (kit.live) {
    const heap = new THREE.IcosahedronGeometry(1, 3);
    const p = heap.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.12 * valueNoise(x * 3 + 4, z * 3 + y * 2);
      p.setXYZ(i, x * hr * k, Math.max(y, -0.2) * hh * k, z * hr * k);
    }
    heap.computeVertexNormals();
    kit.add('cliff', heap, { x: hx, y: kit.ground(hx, hz) - 0.25, z: hz, tint: [0.5, 0.5, 0.55] });
    for (let i = 0; i < 26; i++) {
      const a = kit.rand() * 6.28, r = Math.sqrt(kit.rand()) * hr * 0.9;
      const y = hh * Math.sqrt(Math.max(0, 1 - (r / hr) ** 2)) - 0.2;
      kit.add('starIron', new THREE.IcosahedronGeometry(0.05 + kit.rand() * 0.08, 0), { x: hx + Math.cos(a) * r, y: kit.ground(hx, hz) + y, z: hz + Math.sin(a) * r, rx: kit.rand() * 3, ry: kit.rand() * 3, uv: false });
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.collide(hx + Math.cos(a) * hr * 0.6, hz + Math.sin(a) * hr * 0.6, hr * 0.42, hh);
  }
  kit.item('shard', hx - hr * 0.95, hz - 1.2);
  kit.item('shard', hx + 1.4, hz - hr * 0.98);
  // Pit props stacked by the portal, a crate with the company's stencil, the notice.
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    kit.cyl('log', 0.13, 0.13, 3.2, { x: 4.4 + (i - (3 - row) / 2) * 0.27, y: kit.ground(4.4, zf + 4.8) + 0.13 + row * 0.23, z: zf + 4.8, rx: Math.PI / 2, tint: 0.85 }, 7);
  }
  kit.collideLine(4.4, zf + 3.3, 4.4, zf + 6.3, 0.8, 0.6);
  structCrate(kit, 2.9, zf + 3.9, 0.7, 0.35);
  kit.item('medkit', 2.0, zf + 4.6);
  structSign(kit, 'mine-notice', [['NOTICE', 72], ['THIS MINE IS CLOSED', 34], ['BY ORDER OF THE DIRECTORS', 24], ['HALVARD MINING CO.', 32], ['October 1934', 28]], -3.4, zf + 4.8, 0.25, { w: 1.4, h: 1.0, post: 0.95, board: '#e2dccb', ink: '#2a2420' });
  kit.item('note:mine-notice', -3.3, zf + 5.8);
  // The tool shed, door open, a workbench inside.
  const shed = structHut(kit, { x: -8.6, z: -5.4, w: 3.0, d: 2.4, h: 2.2, ry: 0.35, roof: 'gable', pitch: 0.45, roofMat: 'metal', door: { side: 'e', at: 0.2, width: 1.0, open: 1.3 }, windows: [{ side: 's', at: 0, w: 0.6, h: 0.5 }] });
  const bench = shed.P(-0.3, -0.85), benchTop = shed.floor + 0.85;
  kit.box('woodDark', 2.2, 0.07, 0.55, { x: bench[0], y: benchTop - 0.035, z: bench[1], ry: 0.35 });
  for (const s of [-1, 1]) kit.box('woodDark', 0.08, 0.84, 0.5, { x: shed.P(-0.3 + s * 1.0, -0.85)[0], y: shed.floor + 0.42, z: shed.P(-0.3 + s * 1.0, -0.85)[1], ry: 0.35 });
  kit.item('note:miner-letter', ...shed.P(-0.6, -0.85), { y: benchTop });
  kit.cyl('iron', 0.1, 0.1, 0.3, { x: shed.P(0.3, -0.85)[0], y: benchTop + 0.15, z: shed.P(0.3, -0.85)[1] }, 8);
  kit.item('jerky', ...shed.P(0.6, 0.3));
  for (const [ox, rz] of [[-1.2, 0.15], [-0.9, -0.1]]) kit.rod('woodDark', [shed.P(ox, 0.9)[0], shed.floor, shed.P(ox, 0.9)[1]], [shed.P(ox + 0.1, 1.05)[0], shed.floor + 1.3, shed.P(ox + 0.1, 1.05)[1] + rz], 0.025, 5);
  structFlag(kit, -5.2, 3.0, 'burner', 'varga-mine', 2.6);
}

/* ---------- The Breath ---------- */
// The crater's heart: fissures that glow with the Ember's heat far below and breathe steam,
// bare black ground where no snow settles, rime frozen into spires round the edge, and
// Varga's launch frame with her chair still facing the steam.
const BREATH_VENTS = [[0, 0, 1.6], [-4.2, 2.6, 1.1], [3.2, -3.6, 1.3], [-3.0, -6.6, 0.9], [-7.6, -1.6, 1.2], [-1.6, 6.2, 0.8], [6.2, -6.0, 1.0]];

function structSiteBreath(kit) {
  const launch = kit.site.launch || { x: 8, z: 6 };
  kit.drape('scorch', 0, 0, 34, 34, 0, 0.04, 1.2, { uv: false });
  for (const [vx, vz, size] of BREATH_VENTS) {
    const g = kit.ground(vx, vz);
    const n = 7 + Math.round(size * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + kit.rand() * 0.3, r = size * (0.85 + kit.rand() * 0.3), s = size * (0.24 + kit.rand() * 0.16);
      const sulphur = kit.rand() < 0.35;
      if (kit.live) kit.add('cliff', new THREE.IcosahedronGeometry(s, 0), { x: vx + Math.cos(a) * r, y: g + s * 0.3, z: vz + Math.sin(a) * r, rx: kit.rand() * 3, ry: kit.rand() * 3, uv: false, tint: sulphur ? [1.5, 1.3, 0.55] : [0.5, 0.46, 0.44] });
    }
    kit.cyl('black', size * 0.75, size * 0.55, 0.3, { x: vx, y: g - 0.05, z: vz }, 12);
    // The glow deep in the throat, and cracks running out across the rock.
    kit.cyl('ember', size * 0.45, size * 0.45, 0.04, { x: vx, y: g + 0.06, z: vz }, 12);
    for (let i = 0; i < 4; i++) {
      const a = kit.rand() * 6.28, len = size * (1.2 + kit.rand() * 1.4);
      kit.box('ember', 0.06, 0.03, len, { x: vx + Math.sin(a) * (size * 0.6 + len / 2), y: kit.ground(vx + Math.sin(a) * len, vz + Math.cos(a) * len) + 0.05, z: vz + Math.cos(a) * (size * 0.6 + len / 2), ry: a + (kit.rand() - 0.5) * 0.3 });
    }
    kit.collide(vx, vz, size * 0.6, 0.4);
  }
  // Rime spires where the steam freezes as it drifts out of the warmth.
  for (const [x, z, h] of [[-13, 6.5, 3.4], [-11, -9.5, 4.2], [2, -14.5, 2.8], [-6, 13.5, 2.4], [14.5, -9, 3.2], [-16.5, -2, 2.6], [-2, -16.5, 2.2]]) {
    const g = kit.ground(x, z);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.3 + x, d = k ? 0.6 + k * 0.25 : 0, hh = h * (k ? 0.45 + 0.1 * k : 1);
      if (!kit.live) continue;
      const spire = new THREE.ConeGeometry(hh * 0.24, hh, 6, 3);
      const p = spire.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const j = 1 + 0.25 * Math.sin(p.getY(i) * 4 + i * 1.3 + x);
        p.setX(i, p.getX(i) * j);
        p.setZ(i, p.getZ(i) * j);
      }
      spire.computeVertexNormals();
      kit.add('rime', spire, { x: x + Math.cos(a) * d, y: g + hh / 2 - 0.1, z: z + Math.sin(a) * d, rx: Math.sin(a) * 0.12, rz: Math.cos(a) * 0.12 });
    }
    kit.collide(x, z, 0.9, h);
  }
  if (kit.live) {
    const puffs = buildPuffs(70, 0xeef2f8, true);
    kit.object(puffs.group, 0, 0, 0);
    kit.anim.puffs = puffs;
    kit.anim.vents = BREATH_VENTS.map(([x, z, size]) => ({ x, z, size, y: kit.ground(x, z) }));
    kit.anim.emitT = 0;
    kit.anim.hissT = 3;
  }

  // The launch frame: two masts either side of the launch point, a spar between them with a
  // pulley over the balloon's spot, guys to stakes. Nothing stands within 7 m of the spot.
  const lx = launch.x, lz = launch.z;
  const rx = lx / Math.hypot(lx, lz), rz = lz / Math.hypot(lx, lz);
  const side = [-rz, rx];
  const masts = [-1, 1].map((s) => [lx + side[0] * s * 7.6, lz + side[1] * s * 7.6]);
  const tops = masts.map(([x, z]) => [x, kit.ground(x, z) + 12, z]);
  for (const [x, z] of masts) {
    const g = kit.ground(x, z);
    kit.cyl('log', 0.15, 0.2, 12.6, { x, y: g + 6, z }, 8);
    for (let i = 0; i < 8; i++) {
      const a = i * 0.8, r = 0.38 + (i % 2) * 0.1;
      if (kit.live) kit.add('stone', new THREE.IcosahedronGeometry(0.2 + (i % 3) * 0.05, 0), { x: x + Math.cos(a) * r, y: g + 0.1, z: z + Math.sin(a) * r, rx: i, ry: i * 2, uv: false, tint: 0.7 });
    }
    kit.collide(x, z, 0.32, 12);
    // Two guys back from each mast to stakes in the rock.
    const out = [x - lx, z - lz], len = Math.hypot(...out);
    for (const turn of [-0.55, 0.55]) {
      const c = Math.cos(turn), s = Math.sin(turn);
      const dx = (out[0] * c - out[1] * s) / len, dz = (out[0] * s + out[1] * c) / len;
      const sx = x + dx * 5.5, sz = z + dz * 5.5, sg = kit.ground(sx, sz);
      kit.rod('rope', [x, g + 11.6, z], [sx, sg + 0.3, sz], 0.02, 3);
      kit.box('iron', 0.06, 0.55, 0.06, { x: sx, y: sg + 0.15, z: sz, rx: -0.3 });
      kit.collide(sx, sz, 0.12, 0.5);
    }
  }
  kit.rod('log', [tops[0][0], tops[0][1] - 0.5, tops[0][2]], [tops[1][0], tops[1][1] - 0.5, tops[1][2]], 0.12, 7);
  const midY = (tops[0][1] + tops[1][1]) / 2 - 0.5;
  kit.box('iron', 0.24, 0.34, 0.14, { x: lx, y: midY - 0.3, z: lz, ry: Math.atan2(side[0], side[1]) });
  kit.cyl('iron', 0.13, 0.13, 0.05, { x: lx, y: midY - 0.35, z: lz, ry: Math.atan2(side[0], side[1]), rx: Math.PI / 2 }, 10);
  kit.rod('rope', [lx, midY - 0.45, lz], [lx, midY - 7.5, lz], 0.022, 4);
  kit.box('iron', 0.08, 0.22, 0.04, { x: lx, y: midY - 7.6, z: lz });
  // The halyard runs down to a winch at the foot of one mast; pegs up the other to climb by.
  const [wx, wz] = [masts[1][0] + side[0] * 1.1, masts[1][1] + side[1] * 1.1], wg = kit.ground(wx, wz);
  const wy = Math.atan2(side[0], side[1]);
  kit.rod('rope', [lx + 0.05, midY - 0.45, lz], [wx, wg + 0.75, wz], 0.015, 3);
  for (const s of [-1, 1]) {
    kit.box('woodDark', 0.1, 0.9, 0.5, { x: wx + Math.cos(wy) * s * 0.4, y: wg + 0.4, z: wz - Math.sin(wy) * s * 0.4, ry: wy });
  }
  kit.cyl('log', 0.16, 0.16, 0.7, { x: wx, y: wg + 0.75, z: wz, ry: wy, rz: Math.PI / 2 }, 10);
  if (kit.live) kit.add('rope', new THREE.CylinderGeometry(0.19, 0.19, 0.5, 10).rotateZ(Math.PI / 2), { x: wx, y: wg + 0.75, z: wz, ry: wy, uv: false });
  kit.box('iron', 0.04, 0.4, 0.04, { x: wx + Math.cos(wy) * 0.5, y: wg + 0.62, z: wz - Math.sin(wy) * 0.5, ry: wy, rx: 0.5 });
  kit.collide(wx, wz, 0.5, 1);
  for (let y = 0.8; y < 11; y += 0.55) {
    const a = y * 2.2;
    kit.box('woodDark', 0.46, 0.05, 0.05, { x: masts[0][0], y: kit.ground(...masts[0]) + y, z: masts[0][1], ry: a });
  }
  // Planks laid over the rock where the basket will stand, and tether pegs.
  kit.drape('floor', lx, lz, 4.6, 4.6, Math.atan2(rx, rz), 0.05, 0.8, { tint: 0.8 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.785 + Math.atan2(rx, rz), px = lx + Math.sin(a) * 3.3, pz = lz + Math.cos(a) * 3.3;
    const g = kit.ground(px, pz);
    kit.box('iron', 0.05, 0.4, 0.05, { x: px, y: g + 0.12, z: pz });
    if (kit.live) kit.add('rope', new THREE.TorusGeometry(0.16, 0.03, 4, 10).rotateX(Math.PI / 2), { x: px + 0.25, y: g + 0.06, z: pz, uv: false });
  }

  // Varga's chair, facing the steam, and her table with the last page.
  const cx = 15.8, cz = 4.0, cg = kit.ground(cx, cz), face = Math.atan2(-cx, -cz);
  const cc = Math.cos(face), cs = Math.sin(face);
  const at = (ox, oz) => [cx + ox * cc + oz * cs, cz - ox * cs + oz * cc];
  kit.box('woodDark', 0.48, 0.05, 0.46, { x: cx, y: cg + 0.46, z: cz, ry: face });
  // Folding legs crossed under the seat, the back legs running on up into the backrest.
  for (const s of [-1, 1]) {
    const [ax, az] = at(s * 0.22, -0.24), [bx, bz] = at(s * 0.22, 0.22), [kx, kz] = at(s * 0.22, -0.26);
    kit.beam('woodDark', [ax, cg, az], [bx, cg + 0.46, bz], 0.04, 0.04);
    kit.beam('woodDark', [bx, cg, bz], [kx, cg + 0.95, kz], 0.04, 0.04);
  }
  const back = at(0, -0.25);
  kit.box('woodDark', 0.48, 0.3, 0.04, { x: back[0], y: cg + 0.78, z: back[1], ry: face, rx: -0.15 });
  kit.box('cloth', 0.52, 0.5, 0.06, { x: back[0], y: cg + 0.62, z: back[1], ry: face, rx: -0.2, tint: [0.58, 0.16, 0.13] });
  kit.box('snow', 0.4, 0.04, 0.38, { x: cx, y: cg + 0.5, z: cz, ry: face });
  kit.collide(cx, cz, 0.38, 1);
  const tx = 16.6, tz = 2.2, tg = kit.ground(tx, tz), top = tg + 0.72;
  kit.box('wood', 0.8, 0.04, 0.6, { x: tx, y: top - 0.02, z: tz, ry: face });
  for (const s of [-1, 1]) {
    const [ax, az] = [tx + Math.cos(face) * s * 0.34, tz - Math.sin(face) * s * 0.34];
    kit.beam('woodDark', [ax - Math.sin(face) * 0.25, tg, az - Math.cos(face) * 0.25], [ax + Math.sin(face) * 0.25, top - 0.04, az + Math.cos(face) * 0.25], 0.035, 0.035);
    kit.beam('woodDark', [ax + Math.sin(face) * 0.25, tg, az + Math.cos(face) * 0.25], [ax - Math.sin(face) * 0.25, top - 0.04, az - Math.cos(face) * 0.25], 0.035, 0.035);
  }
  kit.cyl('iron', 0.09, 0.1, 0.05, { x: tx + 0.22, y: top + 0.02, z: tz - 0.1 }, 10);
  kit.cyl('glass', 0.07, 0.07, 0.16, { x: tx + 0.22, y: top + 0.13, z: tz - 0.1 }, 10);
  kit.cyl('iron', 0.06, 0.09, 0.05, { x: tx + 0.22, y: top + 0.24, z: tz - 0.1 }, 10);
  kit.cyl('iron', 0.04, 0.035, 0.08, { x: tx - 0.25, y: top + 0.04, z: tz + 0.12 }, 8);
  kit.box('paint', 0.22, 0.06, 0.16, { x: tx - 0.1, y: top + 0.03, z: tz - 0.15, ry: 0.3, tint: [0.3, 0.2, 0.15] });
  kit.collide(tx, tz, 0.48, 0.8);
  kit.item('note:varga-final', tx + 0.02, tz + 0.08, { y: top + 0.01 });
  kit.item('thermos', cx - 1.0, cz + 0.9);

  // Her lean-to: a canvas sheet on poles with a cot and boxes under it.
  const sx = 19.6, sz = 9.6, sface = Math.atan2(-sx, -sz), sc = Math.cos(sface), ss = Math.sin(sface);
  const sat = (ox, oz) => [sx + ox * sc + oz * ss, sz - ox * ss + oz * sc];
  const sg = kit.footing(sx, sz, 3, 2.4, sface).lo;
  for (const s of [-1, 1]) {
    const [px, pz] = sat(s * 1.4, 0.9);
    kit.cyl('log', 0.06, 0.06, 1.9, { x: px, y: sg + 0.9, z: pz }, 6);
  }
  const [r0x, r0z] = sat(-1.5, 0.9), [r1x, r1z] = sat(1.5, 0.9);
  kit.rod('log', [r0x, sg + 1.8, r0z], [r1x, sg + 1.8, r1z], 0.05, 6);
  const [rcx, rcz] = sat(0, -0.15);
  kit.box('cloth', 3.2, 0.03, 2.4, { x: rcx, y: sg + 0.95, z: rcz, ry: sface, rx: -0.72, tint: [0.62, 0.6, 0.48] });
  kit.box('snow', 3.0, 0.08, 1.9, { x: rcx, y: sg + 1.03, z: rcz, ry: sface, rx: -0.72 });
  const cot = sat(0.3, -0.3);
  kit.box('cloth', 1.8, 0.1, 0.7, { x: cot[0], y: sg + 0.35, z: cot[1], ry: sface, tint: [0.35, 0.38, 0.3] });
  kit.box('woodDark', 1.8, 0.3, 0.06, { x: cot[0], y: sg + 0.15, z: cot[1], ry: sface });
  structCrate(kit, ...sat(-1.1, 0.3), 0.5, sface + 0.2, null, false);
  if (kit.live) kit.add('cloth', new THREE.SphereGeometry(0.4, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.2, 0.5, 0.9), { x: sat(-1.1, 0.3)[0], y: kit.ground(...sat(-1.1, 0.3)) + 0.45, z: sat(-1.1, 0.3)[1], tint: [0.74, 0.12, 0.12] });
  kit.collideWalls(sx, sz - 0.0, 3.0, 1.8, sface, 1.8, { side: 's', at: 0, width: 2.4 });

  // Strips of balloon silk drying on a line, crimson and cream.
  const l0 = [9.4, -9.6], l1 = [12.8, -7.6];
  for (const [x, z] of [l0, l1]) { kit.cyl('log', 0.05, 0.06, 2.3, { x, y: kit.ground(x, z) + 1.0, z }, 6); kit.collide(x, z, 0.12, 2); }
  const lineY = Math.min(kit.ground(...l0), kit.ground(...l1)) + 2.0;
  kit.rod('rope', [l0[0], lineY, l0[1]], [l1[0], lineY, l1[1]], 0.012, 3);
  if (kit.live) {
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6, x = lerp(l0[0], l1[0], t), z = lerp(l0[1], l1[1], t);
      const strip = new THREE.PlaneGeometry(1.1 + (i % 3) * 0.15, 0.32, 5, 1).translate(0.55, 0, 0).rotateZ(-Math.PI / 2);
      kit.add('tatter', strip, { x, y: lineY, z, ry: Math.atan2(l1[0] - l0[0], l1[1] - l0[1]) + Math.PI / 2, uv: false, tint: i % 2 ? [1.1, 1.05, 0.95] : [0.72, 0.1, 0.1] });
    }
  }
}

/* ---------- Sites ---------- */
// `face`: a fixed turn, or 'centre' to turn the site's +z towards the crater's heart (and so
// any wall of rock behind it away from the heart).
const STRUCT_SITES = {
  lookout: { face: 0, build: structSiteLookout },
  trapper: { face: 'centre', build: structSiteTrapper },
  station: { face: 'centre', build: structSiteStation, animate: structAnimStation },
  lake: { face: 'centre', build: structSiteLake },
  radio: { face: 'centre', build: structSiteRadio, animate: structAnimRadio },
  dakota: { face: 'centre', build: structSiteDakota },
  camp: { face: 'centre', build: structSiteCamp, animate: structAnimCamp },
  altar: { face: 0, build: structSiteAltar },
  chapel: { face: 'centre', build: structSiteChapel, animate: structAnimChapel },
  mine: { face: 'centre', build: structSiteMine },
  breath: { face: 0, build: structSiteBreath, animate: structAnimBreath },
};

function structRot(site, face) {
  if (typeof face === 'number') return face;
  return Math.atan2(-site.x, -site.z);
}

/* ---------- Moving parts ---------- */
Object.assign(Sfx, {
  // A cracked bronze bell, struck once by the wind.
  chapelBell(level = 1) {
    this.tone(311, 309, 3.6, 0.06 * level, 'sine');
    this.tone(622, 618, 2.4, 0.025 * level, 'sine');
    this.tone(746, 738, 1.6, 0.018 * level, 'triangle');
    this.burst(0.05, 2400, 3, 0.04 * level, 'bandpass');
  },
  ventHiss(level = 1) { this.burst(2.2, 3400, 0.5, 0.06 * level, 'highpass'); },
});

function structAnimStation(anim, dt, time) {
  if (!anim.cups) return;
  const gust = 0.75 + 0.25 * Math.sin(time * 0.5);
  anim.cups.rotation.y += dt * 7 * gust;
  // The vane points into the west wind, hunting a little either side of it.
  anim.vane.rotation.y = anim.vaneYaw + Math.PI + Math.sin(time * 0.7) * 0.22 + Math.sin(time * 2.3) * 0.08;
}

function structAnimRadio(anim, dt, time) {
  const on = (time % 1.6) < 0.4;
  structMats().beacon.emissiveIntensity = on ? 3.2 : 0.25;
}

function structAnimCamp(anim, dt, time) {
  for (const end of anim.ends || []) {
    end.obj.rotation.z = 0.22 + Math.sin(time * 1.3 + end.phase) * 0.16;
    end.obj.rotation.x = Math.sin(time * 0.9 + end.phase * 2) * 0.1;
  }
}

function structAnimChapel(anim, dt, time, group) {
  if (!anim.bell) return;
  const gust = Math.max(0, Math.sin(time * 0.21));
  anim.bell.rotation.x = Math.sin(time * 1.6) * 0.05 * (0.4 + gust);
  anim.tollT = (anim.tollT === undefined ? 12 : anim.tollT) - dt;
  if (anim.tollT <= 0) {
    anim.tollT = 22 + Math.random() * 30;
    const d = Math.hypot(group.position.x - player.pos.x, group.position.z - player.pos.z);
    if (d < 70 && game.state === 'playing') Sfx.chapelBell(1 - d / 70);
  }
}

const breathAt = new THREE.Vector3(), breathVel = new THREE.Vector3();
function structAnimBreath(anim, dt, time, group) {
  structMats().ember.emissiveIntensity = 1.9 + Math.sin(time * 1.7) * 0.5 + Math.sin(time * 4.3) * 0.25;
  if (!anim.puffs) return;
  anim.emitT -= dt;
  while (anim.emitT <= 0) {
    anim.emitT += 0.09;
    const v = anim.vents[Math.floor(Math.random() * anim.vents.length)];
    breathAt.set(v.x + (Math.random() - 0.5) * v.size, v.y + 0.2, v.z + (Math.random() - 0.5) * v.size);
    breathVel.set(0.4 + Math.random() * 0.5, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 0.4);
    anim.puffs.emit(breathAt, breathVel, { life: 3.5 + Math.random() * 2, size: 0.8 + v.size * 0.6, grow: 3.5, alpha: 0.32 });
  }
  anim.puffs.update(dt);
  anim.hissT -= dt;
  if (anim.hissT <= 0) {
    anim.hissT = 5 + Math.random() * 8;
    const d = Math.hypot(group.position.x - player.pos.x, group.position.z - player.pos.z);
    if (d < 35 && game.state === 'playing') Sfx.ventHiss(1 - d / 35);
  }
}

// Points the walls' dissolve at her while she plays; off in scenes, menus and screenshots.
function structTick() {
  const on = game.state === 'playing';
  structFade.value = on ? 1 : 0;
  if (on) structFocus.value.set(player.pos.x, player.pos.y + 1.1, player.pos.z);
}

let structHooked = false;
function structHookRender() {
  if (structHooked) return;
  structHooked = true;
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    before.apply(this, args);
    structTick();
  };
}

/* ---------- Contract ---------- */
// One builder per site id: (site) => THREE.Group, placed at the site's ground.
const SITE_BUILDERS = {};
// (group, dt, time) for anything that moves at a site that's in view.
const SITE_ANIMATORS = {};

for (const [id, def] of Object.entries(STRUCT_SITES)) {
  SITE_BUILDERS[id] = (site) => {
    structHookRender();
    const kit = new StructKit(site, true, structRot(site, def.face));
    def.build(kit);
    const group = kit.finish();
    group.name = `site-${id}`;
    return group;
  };
  SITE_ANIMATORS[id] = (group, dt, time) => {
    if (def.animate) def.animate(group.userData.anim, dt, time, group);
  };
}

// The plan run: colliders, clearings and the sites' items, before any tile is grown.
for (const site of SITES) {
  const def = STRUCT_SITES[site.id];
  if (def) def.build(new StructKit(site, false, structRot(site, def.face)));
}
