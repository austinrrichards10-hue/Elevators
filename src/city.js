// The city across the sea: Tokyo. The balloon comes down on a beach at its edge, and she walks
// up into it: a seaside promenade, a grid of streets under towers lit window by window at
// night, a station square with a giant screen, a shopping arcade hung with lanterns, live
// houses, the agency's office, and on the skyline to the north, the Tokyo Dome. People walk
// its pavements; some of them will talk to her. The story that plays out here lives in
// idol.js; this file is the place itself, its people, talking, and the stages.

const CITY = {
  y: 3000, // high above everything else, like Teto's arena
  bounds: { x0: -125, x1: 125, z0: -166, z1: 146 },
  beach: { z0: -170, z1: -122 },
  landing: { x: -30, z: -150 },
  dome: { x: 0, z: 640 },
};

const city = {
  active: false, group: null, rects: [], npcs: [], named: {}, crowd: null, talking: null, eHeld: false,
  screen: null, screenT: 0, signs: [], lamps: null, fx: null, venue: null, flags: {}, stepSide: 1,
};

function cityActive() { return city.active; }

/* ---------- Building it ---------- */
// Towers: one box each, their windows drawn by the shader from where they are in the world,
// so a tower of any size gets the right number of floors. Lit windows come on at night.
function buildingMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3) }, uDay: { value: 1 }, uTime: { value: 0 }, uSky: { value: new THREE.Color(0x8fb0d8) } }]),
    fog: true,
    vertexShader: `
      varying vec3 vW; varying vec3 vN; varying vec3 vCol; varying vec3 vLocal; varying vec3 vSize; varying float vSeed; varying float vBase;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vCol = instanceColor;
        vLocal = position;
        vSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vBase = instanceMatrix[3].y;
        // A whole number per building, so every pixel of it agrees on the same random choices.
        vSeed = floor(mod(abs(instanceMatrix[3].x) * 7.0 + abs(instanceMatrix[3].z) * 13.0 + instanceMatrix[3].y * 3.0, 997.0));
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uSun; uniform float uDay; uniform float uTime; uniform vec3 uSky;
      varying vec3 vW; varying vec3 vN; varying vec3 vCol; varying vec3 vLocal; varying vec3 vSize; varying float vSeed; varying float vBase;
      #include <fog_pars_fragment>
      // Hashes without sin(): stable on every GPU, no speckle.
      float hash(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
      float hash2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() {
        vec3 n = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        vec3 L = normalize(uSun);
        float diff = max(dot(n, L), 0.0);
        // Sky light from above, a little bounce from the street below.
        float hemi = 0.55 + 0.45 * n.y;
        vec3 ambient = mix(vec3(0.42, 0.38, 0.36), uSky * 1.05, hemi);
        vec3 light = ambient * (0.35 + 0.65 * uDay) + vec3(1.0, 0.96, 0.88) * diff * 0.85 * uDay;
        // Where on the wall: metres along this face, metres up from the ground.
        bool side = abs(n.x) > 0.5;
        float u = side ? (vLocal.z + 0.5) * vSize.z : (vLocal.x + 0.5) * vSize.x;
        float faceW = side ? vSize.z : vSize.x;
        float y = vLocal.y * vSize.y + vBase;
        float seed = floor(vSeed + 0.5), rnd = hash(vec3(seed, 1.0, 7.0));
        float type = floor(rnd * 4.0); // 0 glass tower, 1 office ribbons, 2 apartments, 3 tiled mid-rise
        if (vSize.y > 55.0 && rnd < 0.7) type = 0.0;
        vec3 base = vCol;
        vec3 col;
        if (abs(n.y) > 0.5) {
          // The roof: gravel and concrete, a darker parapet edge.
          float edge = min(min(vLocal.x + 0.5, 0.5 - vLocal.x) * vSize.x, min(vLocal.z + 0.5, 0.5 - vLocal.z) * vSize.z);
          col = mix(vec3(0.36, 0.36, 0.38), vec3(0.5, 0.5, 0.52), hash2(floor(vW.xz * 2.0)) * 0.4) * (edge < 0.6 ? 0.7 : 1.0) * light;
        } else {
          float floorH = type == 2.0 ? 3.0 : 3.6;
          float fy = fract(y / floorH), floorN = floor(y / floorH);
          float bay = type == 0.0 ? 1.6 : type == 1.0 ? 2.4 : type == 2.0 ? 3.2 : 2.6;
          float fx = fract(u / bay), bayN = floor(u / bay);
          float lit = step(0.45, hash(vec3(bayN + seed * 3.0, floorN, seed)));
          float flick = 0.85 + 0.15 * hash(vec3(bayN + seed * 3.0, floorN, 7.0));
          vec3 warm = mix(vec3(1.0, 0.8, 0.52), vec3(0.78, 0.9, 1.0), step(0.7, hash(vec3(floorN, bayN + seed, 3.0))));
          if (hash(vec3(bayN + seed * 3.0, floorN, 11.0)) > 0.96) warm = vec3(0.5, 0.6, 1.0); // a television
          vec3 night = warm * lit * flick * (1.0 - uDay) * 1.7;
          // Glass: the sky reflected in it, brighter at a glancing angle.
          float fres = pow(1.0 - max(dot(V, n), 0.0), 2.5);
          vec3 refl = mix(uSky * 0.55, uSky * 1.25 + 0.1, fres) * (0.25 + 0.75 * uDay);
          if (type == 0.0) {
            // Curtain wall: tinted glass from top to bottom, fine mullions, a slab line each floor.
            vec3 tint = mix(vec3(0.2, 0.38, 0.5), base, 0.35);
            float mull = step(0.06, fx) * step(fy, 0.92);
            col = mix(vec3(0.25, 0.28, 0.32) * light, tint * 0.6 * light + refl * 0.75 + night * 0.8, mull);
          } else if (type == 1.0) {
            // Ribbon windows between bands of coloured cladding.
            float band = step(0.3, fy) * step(fy, 0.86);
            float mull = step(0.04, fx);
            vec3 glass = vec3(0.12, 0.16, 0.22) * light + refl * 0.55 + night;
            col = mix(base * light, glass, band * mull);
          } else if (type == 2.0) {
            // Apartments: a balcony slab each floor, windows with curtains, the odd AC unit.
            float slab = step(fy, 0.12);
            float win = step(0.15, fx) * step(fx, 0.85) * step(0.28, fy) * step(fy, 0.9);
            vec3 curtain = mix(vec3(0.95, 0.9, 0.8), vec3(0.6, 0.75, 0.9), hash(vec3(bayN + seed * 3.0, floorN, 5.0)));
            vec3 glass = mix(vec3(0.15, 0.18, 0.24) * light + refl * 0.4, curtain * light * 0.6, step(0.6, hash(vec3(bayN + seed * 3.0, floorN, 9.0))) * step(0.55, fy)) + night;
            col = mix(base * light, glass, win);
            col = mix(col, vec3(0.86, 0.86, 0.84) * light, slab);
            float ac = step(0.86, fx) * step(fx, 0.97) * step(0.3, fy) * step(fy, 0.48) * step(0.5, hash(vec3(bayN + seed * 3.0, floorN, 2.0)));
            col = mix(col, vec3(0.85, 0.86, 0.88) * light, ac);
          } else {
            // Tiled mid-rise: punched windows with pale frames and sills.
            float win = step(0.22, fx) * step(fx, 0.78) * step(0.25, fy) * step(fy, 0.82);
            float frame = step(0.18, fx) * step(fx, 0.82) * step(0.21, fy) * step(fy, 0.86) - win;
            float tile = 0.92 + 0.08 * hash2(floor(vec2(u * 4.0, y * 6.0)));
            col = base * tile * light;
            col = mix(col, vec3(0.9, 0.9, 0.88) * light, frame);
            col = mix(col, vec3(0.13, 0.16, 0.22) * light + refl * 0.45 + night, win);
          }
          // A cornice at the top, a plinth at the bottom.
          float top = vSize.y + vBase - y;
          if (top < 0.7) col = mix(base, vec3(0.9), 0.4) * light * 0.85;
          // Soft shadow where the walls meet the street and in the corners.
          float edgeU = min(u, faceW - u);
          float ao = mix(0.62, 1.0, smoothstep(0.0, 6.0, y)) * mix(0.8, 1.0, smoothstep(0.0, 1.2, edgeU));
          col *= ao;
          // At street level on the ground boxes: shopfronts, lit inside, an awning over them.
          if (vBase < 0.5 && y < 4.6) {
            float shop = hash(vec3(floor(u / 7.0), 7.0, seed));
            vec3 awning = shop < 0.25 ? vec3(0.82, 0.18, 0.2) : shop < 0.5 ? vec3(0.12, 0.5, 0.62) : shop < 0.75 ? vec3(0.95, 0.68, 0.18) : vec3(0.28, 0.55, 0.3);
            float mull = step(0.05, fract(u / 3.5));
            vec3 inside = mix(vec3(0.98, 0.84, 0.62), vec3(0.75, 0.92, 1.0), step(0.5, hash(vec3(floor(u / 7.0), 3.0, 1.0))));
            vec3 front = mix(vec3(0.07, 0.08, 0.1), inside * (0.45 + 1.2 * (1.0 - uDay)) * 0.85 + refl * 0.3, mull * step(0.25, y) * step(y, 3.4));
            float stripe = step(0.5, fract(u / 1.2));
            col = y > 3.8 ? mix(awning, awning * 1.25 + 0.1, stripe) * (0.5 + 0.6 * uDay) : front;
          }
        }
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
}

function neonTexture(text, color, bg = '#0b0d18') {
  return paintCanvas(256, 96, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
    g.font = 'bold 54px "Yu Gothic", "Meiryo", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color;
    g.fillText(text, 128, 50, 240);
    g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.fillText(text, 128, 50, 240);
  });
}

// Ground textures: worn asphalt with patches and cracks, grey paving slabs, mown grass.
function cityTexture(size, draw, repeat) {
  const t = paintCanvas(size, size, draw);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}
function asphaltTexture() {
  return cityTexture(256, (g) => {
    g.fillStyle = '#3a3c42'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(20,20,24,${0.12 + Math.random() * 0.1})`; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 20 + Math.random() * 40, 10 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(18,18,20,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  }, [400, 225]);
}
function paveTexture() {
  return cityTexture(128, (g) => {
    g.fillStyle = '#a8a6a0'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { const v = 150 + Math.random() * 30; g.fillStyle = `rgb(${v},${v - 2},${v - 8})`; g.fillRect(x + 1, y + 1, 30, 30); }
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
  }, [14, 12]);
}
function grassTexture() {
  return cityTexture(128, (g) => {
    g.fillStyle = '#5f9048'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3000; i++) { const h = 80 + Math.random() * 40, l = 28 + Math.random() * 18; g.fillStyle = `hsl(${h},45%,${l}%)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 2 + Math.random() * 2); }
  }, [10, 8]);
}

function buildCity() {
  if (city.group) return;
  const G = new THREE.Group();
  G.position.y = CITY.y;
  scene.add(G);
  city.group = G;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const add = (geo, mat, x, y, z, rect) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; G.add(m); return m; };
  // The ground: asphalt, the beach, and the sea beyond.
  // The land runs on to the horizon behind the city; the beach runs along the whole coast.
  const asphalt = add(new THREE.PlaneGeometry(3200, 1800).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.92 }), 0, 0, 778);
  asphalt.castShadow = false;
  const sand = add(new THREE.PlaneGeometry(3200, 60).rotateX(-Math.PI / 2), std(0xe6d3a8, { roughness: 1 }), 0, 0.02, -146);
  sand.castShadow = false;
  city.sea = new THREE.Mesh(new THREE.PlaneGeometry(3200, 1400, 140, 50).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDay: { value: 1 } }]), fog: true, transparent: true,
    vertexShader: `uniform float uTime; varying float vH; varying vec3 vW;
      #include <fog_pars_vertex>
      void main() { vec3 p = position; float h = sin(p.x * 0.05 + uTime * 0.9) * 0.25 + sin(p.z * 0.08 - uTime * 1.3) * 0.2 + sin((p.x + p.z) * 0.13 + uTime * 1.7) * 0.08; p.y += h; vH = h;
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uDay; uniform float uTime; varying float vH; varying vec3 vW;
      #include <fog_pars_fragment>
      void main() { vec3 deep = mix(vec3(0.02, 0.05, 0.12), vec3(0.08, 0.33, 0.52), uDay); vec3 crest = mix(vec3(0.2, 0.3, 0.5), vec3(0.75, 0.9, 1.0), uDay);
        vec3 col = mix(deep, crest, smoothstep(0.15, 0.5, vH));
        float shore = smoothstep(-180.0, -171.0, vW.z); col = mix(col, vec3(0.95), shore * (0.5 + 0.5 * sin(uTime * 2.0 + vW.x * 0.3)) * 0.5);
        gl_FragColor = vec4(col, 0.94);
        #include <fog_fragment>
      }`,
  }));
  city.sea.position.set(0, -0.15, -870);
  G.add(city.sea);
  // Pavements: a raised kerb round every block.
  const pave = new THREE.MeshStandardMaterial({ map: paveTexture(), roughness: 0.9 });
  // Towers, block by block.
  const B = CITY.bounds;
  const towers = [];
  const rect = (x0, x1, z0, z1) => city.rects.push({ x0, x1, z0, z1 });
  const rand = seededRandom(2026);
  const avenues = [-120, -60, 0, 60, 120], streets = [-112, -50, 0, 50, 100, 146];
  // The station square and the arcade are kept open.
  const open = (x, z) => (Math.abs(x) < 28 && z > -48 && z < -4) || (x > -66 && x < -54 && z > -46 && z < 96) || inPark(x, z, 4);
  for (let i = 0; i < avenues.length - 1; i++) {
    for (let j = 0; j < streets.length - 1; j++) {
      const bx0 = avenues[i] + 6, bx1 = avenues[i + 1] - 6, bz0 = streets[j] + 6, bz1 = streets[j + 1] - 6;
      add(new THREE.BoxGeometry(bx1 - bx0 + 4, 0.14, bz1 - bz0 + 4), pave, (bx0 + bx1) / 2, 0.07, (bz0 + bz1) / 2).castShadow = false;
      // Up to three towers on a block, a gap for an alley between.
      const n = 2 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const w = (bx1 - bx0) / n;
        const x0 = bx0 + k * w + 1, x1 = bx0 + (k + 1) * w - 1;
        const depth = (bz1 - bz0) * (0.55 + rand() * 0.4);
        const z0 = rand() < 0.5 ? bz0 : bz1 - depth, z1 = z0 + depth;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (open(cx, cz) || lotTaken(x0, x1, z0, z1)) continue;
        const h = 10 + Math.pow(rand(), 1.6) * (j >= 3 ? 75 : 45);
        towers.push([cx, cz, x1 - x0, h, z1 - z0]);
        rect(x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3);
      }
    }
  }
  // The buildings she can go into (interiors.js).
  buildLots(G, towers, rect);
  // A wall of towers along the north edge, so the city goes on beyond where she can walk.
  for (let x = -140; x <= 140; x += 22) towers.push([x, 162 + rand() * 6, 18, 40 + rand() * 80, 14]);
  for (let x = -200; x <= 200; x += 30) towers.push([x, 230 + rand() * 60, 24, 60 + rand() * 120, 24]);
  for (const side of [-1, 1]) for (let z = -100; z <= 160; z += 24) towers.push([side * (146 + rand() * 6), z, 16, 30 + rand() * 60, 18]);
  // Round the Dome: the towers of Bunkyo, standing back from its plaza.
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; if (Math.cos(a) < -0.55) continue; towers.push([CITY.dome.x + Math.sin(a) * (220 + rand() * 40), CITY.dome.z + Math.cos(a) * (220 + rand() * 40), 26, 40 + rand() * 90, 26]); }
  // Tall towers step back as they rise, with a slimmer top storey on top of them.
  const base = towers.length;
  for (let i = 0; i < base; i++) { const [x, z, w, h, d] = towers[i]; if (h > 38 && rand() < 0.7) towers.push([x, z, w * (0.55 + rand() * 0.2), h * (0.25 + rand() * 0.25), d * (0.55 + rand() * 0.2), h]); }
  const tGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const tMesh = new THREE.InstancedMesh(tGeo, buildingMaterial(), towers.length);
  const m4 = new THREE.Matrix4(), tint = new THREE.Color();
  // A brighter, warmer palette: pastels, terracotta, cream, sage, sky, a few deep tones.
  const palette = [0xe8c8b0, 0xb8d4c8, 0xf0dca0, 0xc8d0e8, 0xd88a6a, 0xf2ece0, 0x9ab8a0, 0xe8b8c8, 0x8aa8c8, 0xd8c8a8, 0x6a7a8a, 0xc87a5a, 0xa8c0d8, 0xf0e0c8];
  towers.forEach(([x, z, w, h, d, y0], i) => {
    m4.makeScale(w, h, d).setPosition(x, y0 || 0, z);
    tMesh.setMatrixAt(i, m4);
    tMesh.setColorAt(i, tint.setHex(palette[(i * 7) % palette.length]));
  });
  // Roofs: water tanks, air-conditioning units, and on the tallest an aerial with a red light.
  const tanks = [], units = [], aerials = [];
  for (const [x, z, w, h, d, y0] of towers) {
    const top = (y0 || 0) + h;
    if (z > 300 || rand() < 0.35) continue;
    for (let k = 0; k < 2 + Math.floor(rand() * 3); k++) units.push([x + (rand() - 0.5) * w * 0.7, top, z + (rand() - 0.5) * d * 0.7, rand() * 3, 1]);
    if (rand() < 0.5) tanks.push([x + (rand() - 0.5) * w * 0.5, top, z + (rand() - 0.5) * d * 0.5, 0, 1]);
    if (top > 70) aerials.push([x, top, z, 0, 1]);
  }
  const roofStd = new THREE.MeshStandardMaterial({ color: 0x8a8e96, roughness: 0.6, metalness: 0.4 });
  instanced(G, new THREE.BoxGeometry(1.6, 1, 1.2).translate(0, 0.5, 0), roofStd, units);
  instanced(G, new THREE.CylinderGeometry(1.2, 1.2, 2.4, 10).translate(0, 2.2, 0), new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.8 }), tanks);
  instanced(G, new THREE.CylinderGeometry(0.1, 0.2, 14, 5).translate(0, 7, 0), roofStd, aerials);
  city.aerialLights = aerials.map(([x, y, z]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xff3030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, y + 14.2, z); s.scale.setScalar(3); G.add(s); return s; });
  tMesh.frustumCulled = false;
  G.add(tMesh);
  city.towers = tMesh;
  rect(-200, B.x0, -200, 400); rect(B.x1, 200, -200, 400); rect(-200, 200, B.z1, 400);
  // Parks, street trees, road markings, traffic, landmarks (citydecor.js).
  city.decor = buildCityDecor(G, rand, rect);
  // Signs over shopfronts, in neon at night.
  const signText = [['ラーメン', '#ff5a6a'], ['カラオケ', '#5ad8ff'], ['COFFEE', '#ffd36a'], ['ゲーム', '#b47aff'], ['居酒屋', '#ff9a4a'], ['BOOKS', '#7affc0'], ['ホテル', '#ff6ad0'], ['寿司', '#ffe07a'], ['MUSIC', '#5affd8'], ['24H', '#9ab0ff']];
  let si = 0;
  for (const [cx, cz, w, h, d, y0] of towers) {
    if (y0) continue; // the set-back top storeys: a sign up there would hang in the air
    if (cz > 150 || Math.abs(cx) > 140 || rand() < 0.35) continue;
    const [text, color] = signText[si++ % signText.length];
    const mat = new THREE.MeshBasicMaterial({ map: neonTexture(text, color), toneMapped: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), mat);
    // On the side facing the nearest street.
    const faceSouth = rand() < 0.5;
    sign.position.set(cx + (rand() - 0.5) * w * 0.5, 4.5 + rand() * 5, faceSouth ? cz - d / 2 - 0.05 : cz + d / 2 + 0.05);
    sign.rotation.y = faceSouth ? Math.PI : 0;
    G.add(sign);
    city.signs.push(mat);
  }
  // The station square: paving, a fountain, benches, and the giant screen.
  add(new THREE.BoxGeometry(56, 0.1, 44), std(0xb3aea4), 0, 0.05, -26).castShadow = false;
  const fountain = add(new THREE.CylinderGeometry(4, 4.4, 0.8, 24), std(0x9a9a9e), 0, 0.4, -26);
  rect(-4.4, 4.4, -30.4, -21.6);
  add(new THREE.CylinderGeometry(3.6, 3.6, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x5aa8d8, roughness: 0.1, metalness: 0.2 }), 0, 0.8, -26);
  void fountain;
  for (const [x, z, r] of [[-14, -16, 0], [14, -16, 0], [-14, -36, 0], [14, -36, 0]]) { const b = add(new THREE.BoxGeometry(3, 0.5, 0.8), std(0x6b4a30), x, 0.25, z); b.rotation.y = r; }
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512; screenCanvas.height = 288;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  // The screen stands on two steel legs at the north edge of the square, with the picture on
  // both faces, so from the street behind it's a screen too and not a black slab in the sky.
  const SZ = -9, screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const front = add(new THREE.PlaneGeometry(24, 13.5), screenMat, 0, 16, SZ - 0.52);
  front.rotation.y = Math.PI;
  front.castShadow = false;
  const backGeo = new THREE.PlaneGeometry(24, 13.5);
  add(backGeo, screenMat, 0, 16, SZ + 0.52).castShadow = false;
  const steel = std(0x3a3e48, { metalness: 0.7, roughness: 0.35 });
  add(new THREE.BoxGeometry(25.4, 14.9, 1), std(0x1d1f26), 0, 16, SZ);
  add(new THREE.BoxGeometry(26.4, 0.5, 1.4), steel, 0, 23.6, SZ);
  add(new THREE.BoxGeometry(26.4, 0.5, 1.4), steel, 0, 8.4, SZ);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(1.2, 23.8, 1.2), steel, s * 13.4, 11.9, SZ);
    add(new THREE.BoxGeometry(2.6, 0.4, 2.6), steel, s * 13.4, 0.2, SZ);
    rect(s * 13.4 - 0.8, s * 13.4 + 0.8, SZ - 0.8, SZ + 0.8);
    // Diagonal braces between the legs and the frame.
    const brace = add(new THREE.BoxGeometry(0.25, 6, 0.25), steel, s * 11.9, 5.6, SZ);
    brace.rotation.z = s * 0.5;
  }
  // A row of little lights along the top edge, and the square's name under the screen.
  for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false }), -12 + i * (24 / 13), 23.95, SZ - 0.6).castShadow = false;
  add(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshBasicMaterial({ map: neonTexture('駅前広場', '#bff6ff', '#0c1a24'), toneMapped: false }), 0, 6.95, SZ - 0.72).rotation.y = Math.PI;
  city.screen = { canvas: screenCanvas, tex: screenTex, mode: 'ad', t: 0 };
  // The shopping arcade: a covered street hung with red lanterns.
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xd8302f, emissive: 0xff4a2a, emissiveIntensity: 0.8, roughness: 0.6 });
  for (let z = -40; z <= 90; z += 6) for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.35, 10, 8), lanternMat, -60 + s * 4.2, 4.2, z).scale.y = 1.3;
  for (let z = -40; z <= 90; z += 18) { const arch = add(new THREE.BoxGeometry(11, 0.4, 0.4), std(0x7a2a24), -60, 5.4, z); void arch; }
  add(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map: neonTexture('商店街', '#ffcf6a', '#5a1a14'), toneMapped: false }), -60, 6.4, -46.5).rotation.y = Math.PI;
  // Street lamps down the avenues, and cherry trees.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
  city.lampGlow = [];
  const poleMat = std(0x2e3036, { metalness: 0.6, roughness: 0.4 });
  for (const ax of avenues) for (let z = -105; z <= 140; z += 16) for (const s of [-1, 1]) {
    if (ax + s * 5.4 < B.x0 || ax + s * 5.4 > B.x1) continue;
    if (Math.abs(ax + s * 5.4) < 28 && z > -48 && z < -4) continue; // the square is open, for the crowds
    if (lotTaken(ax + s * 5.4 - 0.5, ax + s * 5.4 + 0.5, z - 0.5, z + 0.5)) continue;
    add(new THREE.CylinderGeometry(0.08, 0.1, 5.5, 6), poleMat, ax + s * 5.4, 2.75, z).castShadow = false;
    add(new THREE.SphereGeometry(0.25, 8, 6), lampMat, ax + s * 5.4, 5.6, z).castShadow = false;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xffd090, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(ax + s * 5.4, 5.6, z); glow.scale.setScalar(4);
    G.add(glow); city.lampGlow.push(glow);
  }
  // The promenade's row of sakura, the same trees as the parks.
  const prom = [];
  for (let x = -110; x <= 110; x += 13) { if (Math.abs(x + 30) < 8) continue; prom.push([x, 0, -116, rand() * 6, 0.9 + rand() * 0.25]); rect(x - 0.4, x + 0.4, -116.4, -115.6); }
  const promGeo = buildTreeGeometry(41, 'sakura');
  instanced(G, promGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }), prom);
  // Petals on the wind.
  city.petals = buildPuffs(160, 0xffc0d8);
  city.petals.group.children[0].material.uniforms.diffuse.value.multiplyScalar(1.3);
  scene.add(city.petals.group);
  // The seawall and steps down to the beach, a lifeguard tower, a row of beach huts.
  // A low kerb of a seawall she can step over anywhere, with wide stone steps down to the sand.
  add(new THREE.BoxGeometry(3200, 0.3, 1.2), std(0xb8b2a6), 0, 0.15, -122);
  for (let x = -110; x <= 110; x += 44) add(new THREE.BoxGeometry(6, 0.4, 3), std(0xa8a296), x, 0.2, -123.5).castShadow = false;
  add(new THREE.BoxGeometry(2.4, 0.2, 2.4), std(0xe8e2d0), 40, 3, -148); add(new THREE.BoxGeometry(0.2, 3, 0.2), std(0xe8e2d0), 40, 1.5, -148);
  // The Tokyo Dome on the skyline: a vast white cushion of a roof, ringed with light at night.
  const domeGeo = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  city.domeFar = new THREE.Mesh(domeGeo, new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.5, emissive: 0x6a7aa0, emissiveIntensity: 0.15 }));
  city.domeFar.scale.set(110, 34, 110);
  city.domeFar.position.set(CITY.dome.x, 10, CITY.dome.z);
  G.add(city.domeFar);
  add(new THREE.CylinderGeometry(112, 116, 12, 48, 1, true), std(0xd8dce6), CITY.dome.x, 5, CITY.dome.z);
  city.domeRing = new THREE.Mesh(new THREE.TorusGeometry(112, 0.8, 6, 64).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5ad8ff, toneMapped: false }));
  city.domeRing.position.set(CITY.dome.x, 11.5, CITY.dome.z);
  // Its plaza, and searchlights that sweep the sky on show nights.
  add(new THREE.PlaneGeometry(800, 700).rotateX(-Math.PI / 2), std(0x34363c), CITY.dome.x, 0.01, CITY.dome.z).castShadow = false;
  add(new THREE.CircleGeometry(150, 48).rotateX(-Math.PI / 2), std(0x9a9a9e), CITY.dome.x, 0.02, CITY.dome.z).castShadow = false;
  city.searchlights = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(5, 180, 16, 1, true).translate(0, 90, 0), new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(CITY.dome.x + (i - 1.5) * 90, 0, CITY.dome.z - 130);
    G.add(m);
    return m;
  });
  G.add(city.domeRing);
  // The crowd on the pavements.
  // Room for the pedestrians and everyone the story adds.
  city.crowd = buildCrowd(64 + 32);
  for (let i = 0; i < 64; i++) spawnPedestrian(city.crowd, i, rand);
  G.visible = false;
}

/* ---------- People ---------- */
// Everyone in the city is drawn from a handful of instanced parts (legs, body, arms, head,
// hair), each coloured per person, so a crowd costs a few draws.
function buildCrowd(count) {
  const parts = {
    legL: new THREE.CylinderGeometry(0.07, 0.052, 0.8, 10).translate(0, -0.4, 0),
    legR: new THREE.CylinderGeometry(0.07, 0.052, 0.8, 10).translate(0, -0.4, 0),
    body: new THREE.CylinderGeometry(0.19, 0.15, 0.6, 14).scale(1, 1, 0.6).translate(0, 0.3, 0),
    armL: new THREE.CylinderGeometry(0.052, 0.042, 0.58, 8).translate(0, -0.29, 0),
    armR: new THREE.CylinderGeometry(0.052, 0.042, 0.58, 8).translate(0, -0.29, 0),
    head: new THREE.SphereGeometry(0.13, 18, 14),
    hair: new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    // Faces, and for the girls: a flared skirt, long hair down the back, two tails (or one
    // ponytail), a bow.
    eyeL: new THREE.SphereGeometry(0.026, 8, 6).scale(1, 1.45, 0.55),
    eyeR: new THREE.SphereGeometry(0.026, 8, 6).scale(1, 1.45, 0.55),
    skirt: new THREE.CylinderGeometry(0.19, 0.31, 0.36, 16, 1, true).translate(0, -0.16, 0),
    hairLong: new THREE.CylinderGeometry(0.15, 0.12, 0.5, 12, 1, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, -0.22, 0),
    tailL: new THREE.CylinderGeometry(0.09, 0.03, 0.78, 10).translate(0, -0.37, 0),
    tailR: new THREE.CylinderGeometry(0.09, 0.03, 0.78, 10).translate(0, -0.37, 0),
    bow: new THREE.BoxGeometry(0.2, 0.08, 0.05),
  };
  const meshes = {};
  for (const [k, geo] of Object.entries(parts)) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: k.startsWith('eye') ? 0.3 : 0.8, side: k === 'skirt' || k === 'hairLong' ? THREE.DoubleSide : THREE.FrontSide }), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = true;
    m.frustumCulled = false;
    m.count = 0;
    city.group.add(m);
    meshes[k] = m;
  }
  return { meshes, people: [], count };
}

const PEOPLE_COLORS = {
  skin: [0xf2d2b8, 0xe8c09e, 0xd9a882, 0xf5dcc8],
  hair: [0x1a1412, 0x2a1d16, 0x3b2a1e, 0x14141a, 0x7a5030, 0xb8a080],
  top: [0x2b3a5a, 0xe8e2d6, 0x8a2a3a, 0x3a5a4a, 0x22242a, 0xd8a03a, 0x6a4a8a, 0x4a8ab8, 0xf0f0f0],
  legs: [0x22242c, 0x3a3e4a, 0x5a4a3a, 0x1a2a4a, 0x8a8a92],
};

function addPerson(crowd, look) {
  const i = crowd.people.length;
  const p = { i, x: 0, z: 0, yaw: 0, phase: Math.random() * 6, speed: 0, look, wave: 0, cheer: 0, scale: look.scale || 1, bob: 0 };
  // A full crowd takes no more: the extra person exists but isn't drawn.
  if (i >= crowd.count) { p.i = -1; return p; }
  crowd.people.push(p);
  const c = new THREE.Color();
  const set = (k, hex) => crowd.meshes[k].setColorAt(i, c.setHex(hex));
  set('legL', look.legs); set('legR', look.legs); set('body', look.top); set('armL', look.top); set('armR', look.top); set('head', look.skin); set('hair', look.hair);
  set('eyeL', look.eyes || 0x1a1a24); set('eyeR', look.eyes || 0x1a1a24); set('skirt', look.skirt || look.legs); set('hairLong', look.hair); set('tailL', look.hair); set('tailR', look.hair); set('bow', look.bow || look.top);
  for (const m of Object.values(crowd.meshes)) { m.count = crowd.people.length; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  return p;
}

function randomLook(rand = Math.random) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const look = { skin: pick(PEOPLE_COLORS.skin), hair: pick(PEOPLE_COLORS.hair), top: pick(PEOPLE_COLORS.top), legs: pick(PEOPLE_COLORS.legs), scale: 0.92 + rand() * 0.14 };
  if (rand() < 0.45) {
    look.girl = pick(['long', 'long', 'bob', 'pony', 'twin']);
    look.skirt = pick([0x2b3a5a, 0x8a2a3a, 0xe8e2d6, 0x22242a, 0xd8a0b8, 0x5a7ab8, 0x3a5a4a]);
    look.legs = pick([look.skin, look.skin, 0x22242a, 0xf0f0f0]);
    look.scale = 0.9 + rand() * 0.08;
    if (rand() < 0.3) look.bow = pick([0xff8ab8, 0xffffff, 0x39d5c8, 0xd8302f]);
  }
  return look;
}

// Pedestrians walk loops round the blocks.
function spawnPedestrian(crowd, k, rand) {
  const p = addPerson(crowd, randomLook(rand));
  const avenues = [-120, -60, 0, 60, 120], streets = [-112, -50, 0, 50, 100];
  const ai = Math.floor(rand() * 4), sj = Math.floor(rand() * 4);
  const x0 = avenues[ai] + 4.4, x1 = avenues[ai + 1] - 4.4, z0 = streets[sj] + 4.4, z1 = streets[sj + 1] - 4.4;
  p.loop = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  p.s = rand() * 4;
  p.dir = rand() < 0.5 ? 1 : -1;
  p.speed = 1.1 + rand() * 0.5;
  p.walker = true;
}

const cityM = new THREE.Matrix4(), cityQ = new THREE.Quaternion(), cityE = new THREE.Euler(), cityS = new THREE.Vector3(), cityP = new THREE.Vector3();
function placePart(mesh, i, x, y, z, yaw, rx, sc) {
  cityE.set(rx, yaw, 0, 'YXZ');
  cityQ.setFromEuler(cityE);
  cityS.setScalar(sc);
  cityM.compose(cityP.set(x, y, z), cityQ, cityS);
  mesh.setMatrixAt(i, cityM);
}

function poseCrowd(crowd, dt) {
  const M = crowd.meshes;
  for (const p of crowd.people) {
    if (p.walker) {
      // Along the loop, side by side.
      const per = p.loop.length;
      p.s = (p.s + p.dir * dt * p.speed / 40 + per) % per;
      const a = Math.floor(p.s), f = p.s - a, A = p.loop[a], Bp = p.loop[(a + 1) % per];
      p.x = lerp(A[0], Bp[0], f); p.z = lerp(A[1], Bp[1], f);
      p.yaw = Math.atan2((Bp[0] - A[0]) * p.dir, (Bp[1] - A[1]) * p.dir);
      p.phase += dt * p.speed * 5.5;
    } else if (p.target) {
      const dx = p.target.x - p.x, dz = p.target.z - p.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { p.x += (dx / d) * Math.min(d, dt * 1.6); p.z += (dz / d) * Math.min(d, dt * 1.6); p.yaw = Math.atan2(dx, dz); p.phase += dt * 8; }
      else p.target = null;
    }
    const walking = p.walker || p.target ? 1 : 0;
    const swing = Math.sin(p.phase) * 0.5 * walking;
    const s = p.scale, hipY = 0.82 * s + Math.abs(Math.sin(p.phase)) * 0.03 * walking + p.bob;
    const jump = p.cheer > 0 ? Math.abs(Math.sin(game.time * 9 + p.i)) * 0.25 * p.cheer : 0;
    const y = hipY + jump;
    const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
    const side = (d) => [p.x + cos * d, p.z - sin * d];
    let [lx, lz] = side(0.1 * s), [rx, rz] = side(-0.1 * s);
    placePart(M.legL, p.i, lx, y, lz, p.yaw, swing, s);
    placePart(M.legR, p.i, rx, y, rz, p.yaw, -swing, s);
    placePart(M.body, p.i, p.x, y, p.z, p.yaw, 0, s);
    [lx, lz] = side(0.25 * s); [rx, rz] = side(-0.25 * s);
    // Arms swing as they walk, rise as they wave or cheer.
    const up = p.cheer > 0 ? -2.6 + Math.sin(game.time * 9 + p.i) * 0.4 : p.wave > 0 ? -2.4 + Math.sin(game.time * 10) * 0.4 : 0;
    placePart(M.armL, p.i, lx, y + 0.56 * s, lz, p.yaw, -swing + (p.cheer > 0 ? up : 0), s);
    placePart(M.armR, p.i, rx, y + 0.56 * s, rz, p.yaw, swing + up, s);
    placePart(M.head, p.i, p.x, y + 0.75 * s, p.z, p.yaw, 0, s);
    placePart(M.hair, p.i, p.x, y + 0.77 * s, p.z, p.yaw, p.look.girl ? -0.06 : -0.25, s * (p.look.girl ? 1.04 : 1));
    poseLook(M, p, y, s, cos, sin);
    p.wave = Math.max(0, p.wave - dt);
  }
  for (const m of Object.values(M)) m.instanceMatrix.needsUpdate = true;
}

/* ---------- Named people ---------- */
// Someone she can talk to: where they stand, what they look like, and what they say (a
// function from idol.js that picks the right conversation for where the story's at).
function cityNpc(id, opts) {
  const p = addPerson(city.crowd, opts.look || randomLook());
  p.x = opts.x; p.z = opts.z; p.yaw = opts.yaw || 0;
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  marker.scale.set(0.5, 0.5, 1);
  city.group.add(marker);
  const npc = { id, name: opts.name, person: p, marker, talk: opts.talk, home: { x: opts.x, z: opts.z }, hidden: false };
  city.named[id] = npc;
  return npc;
}

let markerTex = null;
function markerTexture() {
  if (markerTex) return markerTex;
  markerTex = paintCanvas(64, 64, (g) => {
    g.fillStyle = '#ffd34a'; g.shadowColor = '#ff9a2a'; g.shadowBlur = 10;
    g.beginPath(); g.moveTo(32, 4); g.lineTo(42, 24); g.lineTo(62, 26); g.lineTo(46, 40); g.lineTo(52, 60); g.lineTo(32, 49); g.lineTo(12, 60); g.lineTo(18, 40); g.lineTo(2, 26); g.lineTo(22, 24); g.fill();
  });
  return markerTex;
}

function hideNpc(id, hidden = true) {
  const n = city.named[id];
  if (!n) return;
  n.hidden = hidden;
  n.person.scale = hidden ? 0.0001 : (n.person.look.scale || 1);
  n.marker.visible = !hidden;
}

function moveNpc(id, x, z, yaw) {
  const n = city.named[id];
  if (!n) return;
  n.person.x = x; n.person.z = z;
  if (yaw !== undefined) n.person.yaw = yaw;
}

/* ---------- Talking ---------- */
// A conversation: a list of lines [speaker, text], and optionally choices at the end, each
// { text, then() }. She stands and faces whoever it is; the camera comes round to them both.
function talk(lines, { choices = null, with: who = null, then = null } = {}) {
  if (city.talking) return;
  const box = $('talk');
  city.talking = { lines, i: 0, choices, then, who, shown: 0, full: false };
  box.classList.remove('hidden');
  document.body.classList.add('talking');
  // A cinematic over-the-shoulder two-shot while they talk.
  const n = who ? city.named[who] : null;
  const prevYaw = player.yaw;
  if (n) player.bodyYaw = Math.atan2(n.person.x - player.pos.x, n.person.z - player.pos.z);
  playScene({
    update(dt) {
      poseAvatar(dt, cityV.set(0, 0, 0), false);
      // Her skin follows her rig only when it's simulated: without this she'd be left behind.
      avatar.simulate(dt);
      updateCityAmbient(dt);
      updateTalk(dt);
      if (n) {
        const mx = (player.pos.x + n.person.x) / 2, mz = (player.pos.z + n.person.z) / 2;
        const dx = n.person.x - player.pos.x, dz = n.person.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
        const sx = -dz / d, sz = dx / d;
        camera.position.set(mx + sx * 3.2 - dx / d * 1.2, CITY.y + 1.7, mz + sz * 3.2 - dz / d * 1.2);
        camera.lookAt(mx, CITY.y + 1.35, mz);
        n.person.yaw = Math.atan2(player.pos.x - n.person.x, player.pos.z - n.person.z);
      }
    },
  });
  void prevYaw;
  showTalkLine();
}

const cityV = new THREE.Vector3();

function showTalkLine() {
  const t = city.talking, box = $('talk');
  const [who, text] = t.lines[t.i];
  box.querySelector('.talk-name').textContent = who || '';
  box.querySelector('.talk-name').classList.toggle('miku', who === 'Miku');
  box.querySelector('.talk-name').classList.toggle('teto', who === 'Teto');
  t.text = text; t.shown = 0; t.full = false;
  box.querySelector('.talk-text').textContent = '';
  box.querySelector('.talk-choices').innerHTML = '';
  box.classList.toggle('thought', who === '(Miku)');
  // A little burble of voice for each line.
  if (who === 'Teto') Sfx.crimsonChatter(text);
  else if (who) Sfx.talkBlip(who === 'Miku' || who === '(Miku)' ? 1.25 : 0.8 + (who.length % 5) * 0.08);
}

function updateTalk(dt) {
  const t = city.talking;
  if (!t || t.full) return;
  t.shown = Math.min(t.text.length, t.shown + dt * 48);
  $('talk').querySelector('.talk-text').textContent = t.text.slice(0, Math.floor(t.shown));
  if (t.shown >= t.text.length) {
    t.full = true;
    if (t.i === t.lines.length - 1 && t.choices) {
      $('talk').querySelector('.talk-choices').innerHTML = t.choices.map((c, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd>${c.text}</button>`).join('');
    }
  }
}

function advanceTalk(choice = -1) {
  const t = city.talking;
  if (!t) return;
  if (!t.full) { t.shown = t.text.length; updateTalk(0); return; }
  if (t.i < t.lines.length - 1) { t.i++; showTalkLine(); Sfx.swap(); return; }
  if (t.choices && choice < 0) return;
  const pick = t.choices ? t.choices[choice] : null;
  if (t.choices && !pick) return;
  endTalk();
  Sfx.swap();
  if (pick && pick.then) pick.then();
  else if (t.then) t.then();
}

function endTalk() {
  city.talking = null;
  $('talk').classList.add('hidden');
  document.body.classList.remove('talking');
  if (activeScene) endScene();
}

addEventListener('keydown', (e) => {
  if (!city.talking || e.repeat) return;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advanceTalk(); }
  const d = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
  if (d >= 0) { e.preventDefault(); advanceTalk(d); }
});
addEventListener('mousedown', (e) => {
  if (!city.talking) return;
  const btn = e.target.closest && e.target.closest('.talk-choices button');
  if (btn) advanceTalk(+btn.dataset.i);
  else if (e.button === 0) advanceTalk();
});

/* ---------- Places to use ---------- */
// Doors, benches, the busking spot: { x, z, r, label(), use(), active() }.
const CITY_SPOTS = [];
function citySpot(spot) { CITY_SPOTS.push(spot); return spot; }

function nearestCityThing() {
  let best = null, bestD = Infinity;
  for (const n of Object.values(city.named)) {
    if (n.hidden) continue;
    const d = Math.hypot(n.person.x - player.pos.x, n.person.z - player.pos.z);
    if (d < 2.2 && d < bestD) { best = { label: () => `Press E to talk to ${n.name}`, use: () => n.talk(n) }; bestD = d; }
  }
  for (const s of CITY_SPOTS) {
    if (s.active && !s.active()) continue;
    const d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
    if (d < (s.r || 2.4) && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/* ---------- Each frame ---------- */
function updateCityAmbient(dt) {
  // Scenes in the city keep the time of day (talks, shows, the Dome).
  if (activeScene) updateSky(dt);
  const k = dayNight.light;
  const night = 1 - k;
  city.towers.material.uniforms.uDay.value = 0.25 + 0.75 * k;
  city.towers.material.uniforms.uSky.value.copy(world.sky.material.uniforms.uHorizon.value).lerp(world.sky.material.uniforms.uZenith.value, 0.45);
  city.towers.material.uniforms.uSun.value.copy(world.sunOffset).normalize();
  city.sea.material.uniforms.uTime.value = game.time;
  city.sea.material.uniforms.uDay.value = 0.15 + 0.85 * k;
  for (const g of city.lampGlow) g.material.opacity = night * 0.9;
  for (const m of city.signs) m.color.setScalar(0.45 + night * 0.75);
  city.domeRing.material.color.setHSL((game.time * 0.05) % 1, 0.8, 0.35 + night * 0.35);
  scene.fog.color.setRGB(lerp(0.06, 0.66, k), lerp(0.08, 0.74, k), lerp(0.16, 0.86, k));
  scene.fog.density = 0.0017;
  poseCrowd(city.crowd, dt);
  updateCityDecor(dt);
  if (city.aerialLights) { const on = Math.floor(game.time * 0.9) % 2 === 0; for (const s of city.aerialLights) s.material.opacity = on ? 1 : 0.15; }
  // No bow in the city: she left the wilds behind.
  bowModel.group.visible = false;
  if (balloonModel) balloonModel.group.visible = false;
  for (const n of Object.values(city.named)) {
    n.marker.position.set(n.person.x, 2.15 + Math.sin(game.time * 3) * 0.06, n.person.z);
    n.marker.visible = !n.hidden && idolHasNews(n.id);
  }
  // Petals drifting over the promenade and the square.
  if (Math.random() < dt * 14) city.petals.emit(cityV.set(player.pos.x + (Math.random() - 0.5) * 30, CITY.y + 4 + Math.random() * 4, player.pos.z + (Math.random() - 0.5) * 30), cityP.set(1 + Math.random(), -0.5, (Math.random() - 0.5)), { life: 6, size: 0.08, grow: 0, alpha: 0.95 });
  city.petals.update(dt);
  updateScreen(dt);
}

function updateCity(dt) {
  updateCityAmbient(dt);
  // What's in reach, and E to use it.
  const pressed = keys.KeyE && !city.eHeld;
  city.eHeld = !!keys.KeyE;
  const thing = city.talking ? null : nearestCityThing();
  setPrompt(thing ? (typeof thing.label === 'function' ? thing.label() : thing.label) : '');
  if (thing && pressed) thing.use();
  updateIdol(dt);
  updateNav();
  updatePhone(dt);
  updateInteriors();
  // The city's music follows the clock: bright pop by day, a late-night piano after dark.
  if (!show.active && (Sfx.trackName === 'city' || Sfx.trackName === 'cityNight')) Sfx.playMusic(cityMusic());
}

function cityClamp(pos) {
  if (!city.active) return;
  if (city.inside && interiorClamp(pos)) return;
  pos.y = CITY.y;
  const B = CITY.bounds;
  pos.x = clamp(pos.x, B.x0, B.x1);
  pos.z = clamp(pos.z, B.z0, B.z1);
  for (const r of city.rects) {
    if (pos.x < r.x0 - 0.3 || pos.x > r.x1 + 0.3 || pos.z < r.z0 - 0.3 || pos.z > r.z1 + 0.3) continue;
    // Out by the shortest way.
    const dl = pos.x - (r.x0 - 0.3), dr = r.x1 + 0.3 - pos.x, db = pos.z - (r.z0 - 0.3), df = r.z1 + 0.3 - pos.z;
    const m = Math.min(dl, dr, db, df);
    if (m === dl) pos.x = r.x0 - 0.3; else if (m === dr) pos.x = r.x1 + 0.3; else if (m === db) pos.z = r.z0 - 0.3; else pos.z = r.z1 + 0.3;
  }
}

function cityStep() {
  const sand = player.pos.z < CITY.beach.z1;
  Sfx.hit({ dur: 0.07, freq: sand ? 900 : 2600, to: sand ? 500 : 1800, q: 1.2, vol: sand ? 0.06 : 0.045, type: 'bandpass', pan: (city.stepSide = -city.stepSide) * 0.15 });
}

/* ---------- The giant screen ---------- */
function updateScreen(dt) {
  const S = city.screen;
  S.t += dt;
  if (S.t < 0.25) return;
  S.t = 0;
  const g = S.canvas.getContext('2d'), w = 512, h = 288, t = game.time;
  const mode = idolScreen();
  if (mode === 'teto') {
    // Teto's music video: red, black, drills spinning, her name in huge letters.
    g.fillStyle = '#12020a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(255,${40 + i * 8},${70 + i * 5},${0.12 + 0.05 * Math.sin(t * 4 + i)})`; g.beginPath(); g.arc(256 + Math.cos(t * 2 + i) * 160, 144 + Math.sin(t * 3 + i) * 80, 40 + i * 4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff2d55'; g.font = 'bold 120px sans-serif'; g.textAlign = 'center'; g.fillText('TETO', 256 + Math.sin(t * 9) * 3, 170);
    g.fillStyle = '#ffd0dc'; g.font = '22px sans-serif'; g.fillText('CRIMSON DRILL PARADE  ·  #1 THIS WEEK', 256, 230);
  } else if (mode === 'summit') {
    g.fillStyle = '#060814'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#39d5c8'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#ff2d55');
    g.fillStyle = grad; g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
    g.fillText('IDOL SUMMIT', 256, 100); g.font = 'bold 30px sans-serif'; g.fillText('TOKYO DOME', 256, 150);
    g.fillStyle = '#fff'; g.font = '24px sans-serif'; g.fillText('SNOWDROP  ×  TETO', 256, 210);
  } else if (mode === 'miku') {
    g.fillStyle = '#04141a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(57,213,200,${0.15 + 0.1 * Math.sin(t * 3 + i)})`; g.fillRect((i * 37 + t * 60) % w, 0, 6, h); }
    g.fillStyle = '#c8fff6'; g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.fillText('SNOWDROP', 256, 150);
    g.fillStyle = '#ffffff'; g.font = '22px sans-serif'; g.fillText(`${SONGS.sakura.title.toUpperCase()}  ·  OUT NOW`, 256, 200);
  } else {
    // Adverts: cola, a phone, a ramen chain, a weather report, round and round.
    const ads = [['#e8303a', 'ICE COLA', '冷たい！'], ['#2a6aff', 'STAR PHONE 9', 'SEE MORE'], ['#ffb02a', 'RAMEN GO', 'NOW 24H'], ['#3ac08a', 'TOKYO 22°C', 'CLEAR SKIES']];
    const [bg, a, b] = ads[Math.floor(t / 6) % ads.length];
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.15)'; for (let i = 0; i < 8; i++) g.fillRect(0, (i * 40 + t * 30) % h, w, 14);
    g.fillStyle = '#fff'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.fillText(a, 256, 150);
    g.font = '28px "Yu Gothic", sans-serif'; g.fillText(b, 256, 205);
  }
  S.tex.needsUpdate = true;
}

/* ---------- Coming and going ---------- */
function enterCity(at = CITY.landing) {
  buildCity();
  city.active = true;
  city.inside = null;
  aiming = false; cancelDraw();
  city.group.visible = true;
  world.setGroundHidden(true);
  document.body.classList.add('in-city');
  player.pos.set(at.x, CITY.y, at.z);
  player.yaw = player.bodyYaw = at.yaw !== undefined ? at.yaw : 0;
  scene.fog.density = 0.0017;
  survival.tool = 'bow';
  avatar.setVisible(true);
  idolSetup();
  // Her balloon, lying where it came down on the beach.
  if (!city.balloon && balloonModel) { city.balloon = balloonModel.group.clone(true); city.balloon.visible = true; city.group.add(city.balloon); }
  if (city.balloon && !city.voyaging) { city.balloon.position.set(CITY.landing.x - 4, 0, CITY.landing.z - 3); city.balloon.rotation.set(0, 0.4, 0); }
  Sfx.playMusic(cityMusic());
}

function leaveCity() {
  if (!city.group) return;
  city.active = false;
  city.group.visible = false;
  world.setGroundHidden(false);
  document.body.classList.remove('in-city');
  bowModel.group.visible = true;
  scene.fog.density = FOG_DENSITY;
  scene.fog.color.setHex(FOG_COLOR);
}

function resetCity() {
  if (city.talking) endTalk();
  leaveCity();
  resetIdol();
}

function saveCity() {
  return { active: city.active, idol: saveIdol(), at: city.active ? streetPos() : null };
}

function loadCity(data) {
  loadIdol(data.idol);
  enterCity(data.at || CITY.landing);
  say('Back in the city.', 2.5);
}

function cityKey(code) {
  if (!city.active) return false;
  if (code === 'KeyP') { togglePhone(); return true; }
  if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'KeyQ' || code === 'KeyZ') return true;
  if (code === 'KeyJ') { togglePhone('schedule'); return true; }
  return false;
}

// In the city her hands are empty: no bow, no axe, nothing to swing or draw.
function cityClick() { return city.active; }

/* ---------- Sounds ---------- */
Object.assign(Sfx, {
  talkBlip(pitch = 1) {
    for (let i = 0; i < 3; i++) this.voice({ from: (420 + Math.random() * 120) * pitch, to: (380 + Math.random() * 80) * pitch, dur: 0.06, vol: 0.035, type: 'triangle', delay: i * 0.07 });
  },
  fameChime() {
    [784, 988, 1175, 1568].forEach((f, i) => this.voice({ from: f, dur: 0.6, vol: 0.06, delay: i * 0.08, verb: 0.6 }));
  },
  cheer(level = 1) {
    this.hit({ dur: 2.2, freq: 1200, q: 0.4, vol: 0.25 * level, type: 'bandpass', attack: 0.3, verb: 0.5 });
    this.hit({ dur: 1.6, freq: 3000, q: 0.6, vol: 0.08 * level, type: 'bandpass', attack: 0.2, delay: 0.1 });
  },
});

function cityMusic() { return dayNight.isNight() ? 'cityNight' : 'city'; }

// Is this spot on a road, where nobody should stand about? (The square, the arcade and the
// beach promenade are open to walk across.)
function cityOnRoad(x, z) {
  if (Math.abs(x) < 28 && z > -48 && z < -4) return false;
  if (x > -66 && x < -54 && z > -46 && z < 96) return false;
  if (z < -116) return false;
  return [-120, -60, 0, 60, 120].some((a) => Math.abs(x - a) < 4.4) || [-112, -50, 0, 50, 100, 146].some((s) => Math.abs(z - s) < 4.4);
}

// The face and, for the girls, the skirt, the hair and the bow.
const LOOK_HIDE = -60;
function poseLook(M, p, y, s, cos, sin) {
  const hy = y + 0.75 * s, L = p.look, g = L.girl, i = p.i;
  const at = (fwd, right, up) => [p.x + sin * fwd * s + cos * right * s, hy + up * s, p.z + cos * fwd * s - sin * right * s];
  const hide = (m) => placePart(m, i, p.x, LOOK_HIDE, p.z, 0, 0, 0.0001);
  let q = at(0.141, 0.047, -0.004); placePart(M.eyeL, i, q[0], q[1], q[2], p.yaw, 0, s);
  q = at(0.141, -0.047, -0.004); placePart(M.eyeR, i, q[0], q[1], q[2], p.yaw, 0, s);
  if (!g) { hide(M.skirt); hide(M.hairLong); hide(M.tailL); hide(M.tailR); hide(M.bow); return; }
  placePart(M.skirt, i, p.x, y + 0.06 * s, p.z, p.yaw, 0, s);
  const sway = Math.sin(p.phase * 0.5 + game.time * 1.5) * 0.06;
  if (g === 'bob') { q = at(-0.01, 0, 0.06); placePart(M.hairLong, i, q[0], q[1], q[2], p.yaw, 0, s * 0.72); }
  else { q = at(-0.01, 0, 0.05); placePart(M.hairLong, i, q[0], q[1], q[2], p.yaw, 0.05, s * (g === 'long' ? 1.08 : 0.8)); }
  if (g === 'twin') {
    q = at(-0.03, 0.19, 0.1); placePart(M.tailL, i, q[0], q[1], q[2], p.yaw, 0.14 + sway, s);
    q = at(-0.03, -0.19, 0.1); placePart(M.tailR, i, q[0], q[1], q[2], p.yaw, 0.14 - sway, s);
  } else if (g === 'pony') {
    q = at(-0.15, 0, 0.1); placePart(M.tailL, i, q[0], q[1], q[2], p.yaw, 0.32 + sway, s * 0.95);
    hide(M.tailR);
  } else { hide(M.tailL); hide(M.tailR); }
  if (L.bow) { q = at(-0.06, 0, 0.15); placePart(M.bow, i, q[0], q[1], q[2], p.yaw, -0.4, s); } else hide(M.bow);
}
