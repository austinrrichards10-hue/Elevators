// The building the elevator runs through. For most of the ride the car is shut in a concrete
// shaft, with a caged lamp on the wall every floor sliding past. A few floors are sky decks:
// two-storey glass rooms built out from the tower, where the shaft is glass too and the city
// opens up. The car stops at each one for a while. The ground floor is the lobby.
// World space: the tower face is at z = City.TOWER_HALF, and the car rides at x = 0, z = cabZ.
const Building = (() => {
  // Cab floor heights the car stops at, top to bottom. The first is where the ride starts,
  // the last is the ground.
  const DECKS = [280, 196, 112, 40, 0.32];
  const ROOM_H = 7.2;       // floor to ceiling in a deck
  const ROOM_HALF = 10;     // a deck runs 20 m along the tower face...
  const ROOM_OUT = 6;       // ...and reaches this far past the car's centre
  const SW = 2.35;          // the shaft's inner half-width

  function concreteTexture() {
    // One floor of shaft wall (4 m tall, 4 m wide): board-marked concrete, the slab edge at the
    // bottom and a caged lamp at head height. Returns the colour map and the glow map.
    const S = 256;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#5d6069'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      const v = 80 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v},${v + 6},${Math.random() * 0.25})`;
      g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < S; y += 32) g.fillRect(0, y, S, 1);              // formwork board lines
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(32 + i * 40, 20 + (i % 2) * 140, 2, 0, 7); g.fill(); }   // tie holes
    g.fillStyle = '#3b3d44'; g.fillRect(0, S - 22, S, 22);               // slab edge
    g.fillStyle = '#c9a43c'; g.fillRect(0, S - 26, S, 4);                // painted safety line
    g.fillStyle = '#2a2c31'; g.fillRect(118, 80, 20, 28);                // lamp cage
    g.fillStyle = '#ffe2a8'; g.fillRect(122, 84, 12, 20);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    const e = document.createElement('canvas'); e.width = e.height = S;
    const ge = e.getContext('2d');
    ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
    const glow = ge.createRadialGradient(128, 94, 2, 128, 94, 70);
    glow.addColorStop(0, 'rgba(255,214,150,1)'); glow.addColorStop(0.15, 'rgba(255,190,120,0.55)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
    ge.fillStyle = glow; ge.fillRect(0, 0, S, S);
    ge.fillStyle = '#fff1d0'; ge.fillRect(122, 84, 12, 20);
    const emissive = new THREE.CanvasTexture(e);
    emissive.colorSpace = THREE.SRGBColorSpace;
    emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
    return { map, emissive };
  }

  function build(scene, cabZ) {
    const TH = City.TOWER_HALF, FH = City.FLOOR_H;
    const ZF = cabZ + SW;             // inside face of the shaft's front wall
    const ZD = cabZ + ROOM_OUT;       // a deck's outer glass
    const group = new THREE.Group();
    scene.add(group);

    const tex = concreteTexture();
    const concrete = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.92, metalness: 0 });
    const shell = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.8, metalness: 0.3, flatShading: true });
    const slab = new THREE.MeshStandardMaterial({ color: 0x24262d, roughness: 0.35, metalness: 0.2 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x2a2e38, metalness: 0.75, roughness: 0.35, flatShading: true });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xa9d8ff, transparent: true, opacity: 0.07, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const panelLight = new THREE.MeshBasicMaterial({ color: 0xdfe8ff });
    const bench = new THREE.MeshStandardMaterial({ color: 0x5a4a3e, roughness: 0.7, flatShading: true });

    const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); group.add(m); return m; };
    // A wall face of concrete facing `normal`, with its texture tiled one repeat per floor.
    const face = (w, y0, y1, x, z, rotY) => {
      const h = y1 - y0;
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / FH, (uv.getY(i) * h + y0) / FH);
      const m = new THREE.Mesh(geo, concrete);
      m.position.set(x, y0 + h / 2, z); m.rotation.y = rotY;
      group.add(m);
    };

    // The shaft, in runs of solid wall between the decks.
    const roomBottom = (D) => Math.max(0, D - 0.45), roomTop = (D) => D + ROOM_H;
    const spans = [];
    let y = City.TOWER_TOP;
    for (const D of DECKS) { if (y > roomTop(D)) spans.push([roomTop(D), y]); y = roomBottom(D); }
    const depth = ZF - TH;
    for (const [y0, y1] of spans) {
      const h = y1 - y0, my = (y0 + y1) / 2;
      // Outer shell, then the concrete inside faces.
      box(0.4, h, depth + 0.4, shell, -SW - 0.2, my, TH + depth / 2 + 0.2);
      box(0.4, h, depth + 0.4, shell, SW + 0.2, my, TH + depth / 2 + 0.2);
      box(SW * 2 + 0.8, h, 0.4, shell, 0, my, ZF + 0.2);
      face(depth, y0, y1, -SW + 0.001, TH + depth / 2, Math.PI / 2);
      face(depth, y0, y1, SW - 0.001, TH + depth / 2, -Math.PI / 2);
      face(SW * 2, y0, y1, 0, ZF - 0.001, Math.PI);
    }

    // The decks.
    for (const D of DECKS) {
      const y0 = roomBottom(D), y1 = roomTop(D);
      const floorTop = D - 0.02;
      // Floor and ceiling slabs, each with a hole where the shaft passes through.
      for (const [sy, sh] of [[floorTop - 0.25, 0.5], [y1 + 0.3, 0.6]]) {
        const sideW = ROOM_HALF - SW;
        box(sideW, sh, ZD - TH, slab, -(SW + sideW / 2), sy, TH + (ZD - TH) / 2);
        box(sideW, sh, ZD - TH, slab, SW + sideW / 2, sy, TH + (ZD - TH) / 2);
        box(SW * 2, sh, ZD - ZF, slab, 0, sy, ZF + (ZD - ZF) / 2);
      }
      // Ceiling light panels.
      for (let x = -ROOM_HALF + 2; x <= ROOM_HALF - 2; x += 4) {
        for (const z of [ZD - 1.6, TH + 1.8]) {
          if (Math.abs(x) < SW + 0.8 && z < ZF + 1) continue;
          box(1.6, 0.02, 0.5, panelLight, x, y1 - 0.01, z);
        }
      }
      // Glass all round the outside: the front and both ends, with mullions and a rail.
      const glassH = y1 - floorTop;
      const front = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, glassH), glass);
      front.position.set(0, floorTop + glassH / 2, ZD); front.renderOrder = 1; group.add(front);
      for (const s of [-1, 1]) {
        const end = new THREE.Mesh(new THREE.PlaneGeometry(ZD - TH, glassH), glass);
        end.position.set(s * ROOM_HALF, floorTop + glassH / 2, TH + (ZD - TH) / 2); end.rotation.y = Math.PI / 2; end.renderOrder = 1; group.add(end);
      }
      for (let x = -ROOM_HALF; x <= ROOM_HALF + 0.01; x += 2.5) box(0.08, glassH, 0.12, steel, x, floorTop + glassH / 2, ZD);
      for (const s of [-1, 1]) for (let z = TH + 2.5; z < ZD; z += 2.5) box(0.12, glassH, 0.08, steel, s * ROOM_HALF, floorTop + glassH / 2, z);
      box(ROOM_HALF * 2, 0.05, 0.05, steel, 0, floorTop + 1.05, ZD - 0.25);
      for (const s of [-1, 1]) box(0.05, 0.05, ZD - TH, steel, s * (ROOM_HALF - 0.25), floorTop + 1.05, TH + (ZD - TH) / 2);
      // The shaft is glass where it passes through the deck.
      const shaftGlass = [
        [SW * 2, 0, ZF, Math.PI], [ZF - TH, -SW, TH + (ZF - TH) / 2, Math.PI / 2], [ZF - TH, SW, TH + (ZF - TH) / 2, -Math.PI / 2],
      ];
      for (const [w, x, z, r] of shaftGlass) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(w, glassH), glass);
        g.position.set(x, floorTop + glassH / 2, z); g.rotation.y = r; g.renderOrder = 1; group.add(g);
      }
      for (const [x, z] of [[-SW, ZF], [SW, ZF], [-SW, TH + 0.1], [SW, TH + 0.1]]) box(0.14, glassH, 0.14, steel, x, floorTop + glassH / 2, z);
      // Benches facing out over the city.
      for (const x of [-7, -4.5, 4.5, 7]) {
        box(1.8, 0.08, 0.5, bench, x, floorTop + 0.45, ZD - 1.9);
        box(0.1, 0.42, 0.4, steel, x - 0.75, floorTop + 0.21, ZD - 1.9);
        box(0.1, 0.42, 0.4, steel, x + 0.75, floorTop + 0.21, ZD - 1.9);
      }
    }

    // One soft light that follows the car to whichever deck is nearest, so the rooms read as
    // lit without every deck paying for its own light.
    const deckLight = new THREE.PointLight(0xcfdcff, 0, 26, 1.4);
    group.add(deckLight);

    // How open the view is at cab height y: 1 inside a deck, 0 deep in the shaft.
    function openness(y) {
      let best = 0;
      for (const D of DECKS) {
        const below = D - 4, above = D + ROOM_H - 2;
        const k = y < below ? 1 - (below - y) / 6 : y > above ? 1 - (y - above) / 6 : 1;
        best = Math.max(best, k);
      }
      return Math.max(0, Math.min(1, best));
    }

    function update(cabY) {
      let near = DECKS[0];
      for (const D of DECKS) if (Math.abs(D - cabY) < Math.abs(near - cabY)) near = D;
      deckLight.position.set(0, near + ROOM_H - 1.2, cabZ + 3.5);
      deckLight.intensity = 30 * openness(cabY);
    }

    return { update, openness };
  }

  // The floor number a deck is on.
  const floorOf = (D) => Math.max(1, Math.round(D / City.FLOOR_H));

  return { build, DECKS, floorOf };
})();
