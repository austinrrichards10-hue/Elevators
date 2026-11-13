// The elevator car: a twelve-sided glass cylinder riding the outside of the tower.
// Nine of its faces are glass and look out over the city; the three at the back are steel,
// with the doors and the floor readout. A handrail runs round the glass at waist height.
// Local space: origin at the centre of the floor, +z out toward the city, -z toward the tower.
const Elevator = (() => {
  const R = 1.7, H = 2.7, SEG = 12;
  const OFF = Math.PI / SEG;                 // turn the polygon so a glass face looks straight out
  const GLASS_START = -3 * Math.PI / 4, GLASS_LEN = 3 * Math.PI / 2;

  function floorDisplay() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    let shown = null;
    function set(label, moving) {
      const key = label + (moving ? 'v' : '');
      if (key === shown) return;
      shown = key;
      g.fillStyle = '#05080c'; g.fillRect(0, 0, 256, 96);
      g.fillStyle = '#7ff0e6';
      g.font = 'bold 64px Consolas, monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, 150, 50);
      if (moving) { g.beginPath(); g.moveTo(40, 34); g.lineTo(76, 34); g.lineTo(58, 64); g.closePath(); g.fill(); }
      tex.needsUpdate = true;
    }
    return { tex, set };
  }

  function build() {
    const cab = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x2b303c, metalness: 0.65, roughness: 0.42, flatShading: true });
    const trim = new THREE.MeshStandardMaterial({ color: 0xc3cad6, metalness: 0.9, roughness: 0.25, flatShading: true });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x41444f, metalness: 0.1, roughness: 0.85, flatShading: true });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4c, metalness: 0.5, roughness: 0.5, flatShading: true, side: THREE.DoubleSide });
    const teal = new THREE.MeshBasicMaterial({ color: 0x39c5bb });

    const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); cab.add(m); return m; };

    // Floor, with a teal ring of light round its outer edge.
    add(new THREE.CylinderGeometry(R + 0.12, R + 0.06, 0.3, SEG, 1, false, OFF), metal, 0, -0.15, 0);
    add(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.02, SEG, 1, false, OFF), floorMat, 0, -0.005, 0);
    add(new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.022, SEG, 1, false, OFF), new THREE.MeshStandardMaterial({ color: 0x2a5f63, roughness: 0.7, flatShading: true }), 0, -0.002, 0);
    const glowRing = add(new THREE.TorusGeometry(R + 0.13, 0.035, 4, SEG * 2), teal, 0, -0.08, 0);
    glowRing.rotation.x = Math.PI / 2;
    // Underside: a faceted cone tapering away beneath the car.
    add(new THREE.CylinderGeometry(R + 0.06, 0.35, 0.7, SEG, 1, false, OFF), metal, 0, -0.65, 0);

    // Ceiling, with a ring light.
    add(new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.26, SEG, 1, false, OFF), metal, 0, H + 0.13, 0);
    add(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.02, SEG, 1, false, OFF), new THREE.MeshStandardMaterial({ color: 0x1b1e26, roughness: 0.9 }), 0, H - 0.005, 0);
    const lightRing = add(new THREE.TorusGeometry(R * 0.6, 0.04, 4, SEG * 2), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }), 0, H - 0.04, 0);
    lightRing.rotation.x = Math.PI / 2;
    const lamp = new THREE.PointLight(0xffe4bd, 7, 8, 1.6);
    lamp.position.set(0, H - 0.4, 0.2);
    cab.add(lamp);
    // Cool light from the city, coming in through the glass.
    const cityGlow = new THREE.PointLight(0x9aa8ff, 2.2, 5, 1.5);
    cityGlow.position.set(0.3, 1.3, 2.6);
    cab.add(cityGlow);
    // Roof: a hub and the cable sheave.
    add(new THREE.CylinderGeometry(R * 0.45, R + 0.1, 0.4, SEG, 1, false, OFF), metal, 0, H + 0.46, 0);
    const sheave = add(new THREE.TorusGeometry(0.35, 0.08, 4, 10), trim, 0, H + 0.95, 0);
    sheave.rotation.y = Math.PI / 2;

    // The glass, three quarters of the way round.
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xb6e6ff, transparent: true, opacity: 0.09, roughness: 0.05, metalness: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const glass = add(new THREE.CylinderGeometry(R, R, H, 9, 1, true, GLASS_START, GLASS_LEN), glassMat, 0, H / 2, 0);
    glass.renderOrder = 2;

    // Steel at the back, facing the tower.
    add(new THREE.CylinderGeometry(R, R, H, 3, 1, true, GLASS_START + GLASS_LEN, 2 * Math.PI - GLASS_LEN), wallMat, 0, H / 2, 0);

    // Mullions between the panes, and frame bands top and bottom.
    for (let i = 0; i <= 9; i++) {
      const a = GLASS_START + (i / 9) * GLASS_LEN;
      const m = add(new THREE.BoxGeometry(0.06, H, 0.07), trim, Math.sin(a) * R, H / 2, Math.cos(a) * R);
      m.rotation.y = a;
    }
    add(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.12, SEG, 1, true, OFF), trim, 0, 0.06, 0).material.side = THREE.DoubleSide;
    add(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.1, SEG, 1, true, OFF), trim, 0, H - 0.05, 0);

    // Handrail round the glass at waist height, on short brackets.
    const railR = R - 0.11, railY = 0.98;
    const pts = [];
    const railFrom = GLASS_START + 0.12, railTo = GLASS_START + GLASS_LEN - 0.12;
    for (let i = 0; i <= 36; i++) {
      const a = railFrom + (i / 36) * (railTo - railFrom);
      pts.push(new THREE.Vector3(Math.sin(a) * railR, railY, Math.cos(a) * railR));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.024, 6, false), trim);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 9; i++) {
      const a = GLASS_START + ((i + 0.5) / 9) * GLASS_LEN;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const b = add(new THREE.CylinderGeometry(0.013, 0.013, R - railR, 5), trim, dir.x * (R + railR) / 2, railY, dir.z * (R + railR) / 2);
      b.quaternion.setFromUnitVectors(up, dir);
    }
    for (const a of [railFrom, railTo]) add(new THREE.SphereGeometry(0.03, 6, 4), trim, Math.sin(a) * railR, railY, Math.cos(a) * railR);

    // Doors on the middle steel face, and the floor readout above them.
    const faceZ = -R * Math.cos(Math.PI / SEG) + 0.03;
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8a92a3, metalness: 0.85, roughness: 0.3, flatShading: true });
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.39, 2.15, 0.03), doorMat, s * 0.2, 1.075, faceZ);
    add(new THREE.BoxGeometry(0.88, 0.08, 0.05), trim, 0, 2.19, faceZ);
    const display = floorDisplay();
    add(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: display.tex }), 0, 2.4, faceZ + 0.01);
    // A little call panel beside the doors, with a lit button.
    add(new THREE.BoxGeometry(0.12, 0.3, 0.02), trim, 0.62, 1.2, faceZ + 0.08).rotation.y = -0.5;
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), teal, 0.62, 1.24, faceZ + 0.1).rotation.x = Math.PI / 2;

    // The carriage that clamps the car to the tower's rails.
    add(new THREE.BoxGeometry(1.9, H + 0.8, 0.5), metal, 0, H / 2, -R - 0.12);

    return { group: cab, R, H, setFloor: display.set };
  }

  return { build, R, H };
})();
