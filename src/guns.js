// Weapon stats and models. Models face +Z with the grip at the origin and +Y up.
const GUNS = {
  pistol: { name: 'Pistol', note: 'Accurate semi-auto sidearm', auto: false, mag: 12, damage: 34, head: 100, rate: 0.17, spread: 0.006, pellets: 1, reload: 1.5, style: 'mag', kick: 0.05, range: 80, aimFov: 46, sound: 'pistol' },
  smg: { name: 'SMG', note: 'Very fast, weak and wild', auto: true, mag: 32, damage: 15, head: 36, rate: 0.066, spread: 0.03, pellets: 1, reload: 1.9, style: 'mag', kick: 0.022, range: 60, aimFov: 48, sound: 'smg' },
  rifle: { name: 'Assault Rifle', note: 'Steady full-auto all-rounder', auto: true, mag: 30, damage: 25, head: 66, rate: 0.105, spread: 0.012, pellets: 1, reload: 2.2, style: 'mag', kick: 0.034, range: 110, aimFov: 40, sound: 'rifle' },
  shotgun: { name: 'Shotgun', note: 'Pump action, brutal up close', auto: false, mag: 6, damage: 17, head: 26, rate: 0.82, spread: 0.075, pellets: 10, reload: 0.56, style: 'shell', kick: 0.13, range: 40, falloff: true, aimFov: 50, sound: 'shotgun' },
  sniper: { name: 'Sniper Rifle', note: 'Bolt action, scoped, pierces targets', auto: false, mag: 5, damage: 160, head: 500, rate: 1.25, spread: 0.0008, hipSpread: 0.04, pellets: 1, reload: 2.5, style: 'mag', kick: 0.17, range: 170, pierce: true, aimFov: 15, scoped: true, sound: 'sniper' },
};
const GUN_ORDER = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];

function buildGunModel(id) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x24262e, metalness: 0.9, roughness: 0.38 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x15161b, metalness: 0.15, roughness: 0.66 });
  const bright = new THREE.MeshStandardMaterial({ color: 0x8d94a3, metalness: 1, roughness: 0.3 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3320, roughness: 0.55 });
  const group = new THREE.Group();

  const add = (parent, geo, mat, x, y, z, rx = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent, mat, w, h, l, x, y, z, rx = 0) => add(parent, new THREE.BoxGeometry(w, h, l), mat, x, y, z, rx);
  const barrel = (parent, mat, r, l, x, y, z) => add(parent, new THREE.CylinderGeometry(r, r, l, 10).rotateX(Math.PI / 2), mat, x, y, z);

  const makeMag = (x, y, z, w, h, l, tilt, material) => {
    const mag = new THREE.Group();
    mag.position.set(x, y, z);
    mag.rotation.x = tilt;
    box(mag, material, w, h, l, 0, -h / 2, 0);
    group.add(mag);
    return { mag, magLength: h };
  };
  const moving = new THREE.Group();
  group.add(moving);

  const model = {
    group, moving,
    muzzle: new THREE.Object3D(),
    port: new THREE.Vector3(0, 0.06, 0.02),
    leftGrip: new THREE.Vector3(0, -0.05, 0),
    grab: new THREE.Vector3(0, 0.06, 0),
    travel: 0.045,
    readyPos: new THREE.Vector3(-0.1, 0.03, 0.27),
    readyRx: 0.62,
    readyRz: 0.25,
    aimPos: new THREE.Vector3(-0.07, 0.21, 0.27),
    reloadPos: new THREE.Vector3(-0.03, 0.08, 0.27),
    // Carried while sprinting: long guns slung diagonally across the chest.
    runPos: new THREE.Vector3(-0.15, -0.045, 0.2),
    runRx: -0.42,
    runRy: 1.2,
    runRz: 0.3,
    runOneHand: false,
  };

  if (id === 'pistol') {
    box(moving, steel, 0.028, 0.032, 0.185, 0, 0.044, 0.05);
    box(moving, bright, 0.006, 0.008, 0.012, 0, 0.064, 0.13);
    box(group, polymer, 0.026, 0.024, 0.15, 0, 0.018, 0.04);
    box(group, polymer, 0.026, 0.1, 0.04, 0, -0.04, -0.012, 0.2);
    box(group, steel, 0.006, 0.018, 0.04, 0, -0.002, 0.04);
    barrel(group, bright, 0.0065, 0.02, 0, 0.044, 0.15);
    Object.assign(model, makeMag(0, -0.04, -0.01, 0.02, 0.1, 0.032, 0.2, steel));
    model.muzzle.position.set(0, 0.044, 0.165);
    model.leftGrip.set(0.012, -0.055, 0.0);
    model.grab.set(0, 0.046, -0.03);
    model.aimPos.set(-0.04, 0.2, 0.37);
    model.readyPos.set(-0.1, 0.05, 0.24);
    model.reloadPos.set(-0.03, 0.09, 0.27);
    // A pistol stays low in one hand, leaving the other arm free to pump.
    model.runPos.set(-0.12, -0.05, 0.24);
    model.runRx = 0.42;
    model.runRy = 0;
    model.runRz = 0.12;
    model.runOneHand = true;
  } else if (id === 'smg') {
    box(group, steel, 0.04, 0.055, 0.25, 0, 0.03, 0.07);
    box(moving, bright, 0.012, 0.012, 0.03, 0.022, 0.045, 0.02);
    barrel(group, steel, 0.012, 0.09, 0, 0.034, 0.235);
    box(group, polymer, 0.032, 0.09, 0.036, 0, -0.035, -0.015, 0.2);
    box(group, polymer, 0.028, 0.075, 0.03, 0, -0.03, 0.16, -0.12);
    box(group, steel, 0.01, 0.024, 0.14, 0, 0.018, -0.12);
    box(group, polymer, 0.03, 0.06, 0.016, 0, 0.012, -0.192);
    box(group, steel, 0.008, 0.016, 0.018, 0, 0.066, 0.13);
    Object.assign(model, makeMag(0, 0, 0.075, 0.024, 0.16, 0.036, -0.08, steel));
    model.muzzle.position.set(0, 0.034, 0.285);
    model.leftGrip.set(0, -0.055, 0.16);
    model.grab.set(0.022, 0.045, 0.02);
    model.aimPos.set(-0.075, 0.18, 0.25);
    model.readyPos.set(-0.11, 0.0, 0.23);
  } else if (id === 'rifle') {
    box(group, steel, 0.042, 0.06, 0.26, 0, 0.035, 0.05);
    box(group, polymer, 0.046, 0.05, 0.24, 0, 0.04, 0.3);
    barrel(group, steel, 0.009, 0.22, 0, 0.044, 0.5);
    barrel(group, steel, 0.015, 0.05, 0, 0.044, 0.625);
    box(group, polymer, 0.032, 0.09, 0.036, 0, -0.035, -0.012, 0.25);
    box(group, polymer, 0.034, 0.04, 0.17, 0, 0.038, -0.16);
    box(group, polymer, 0.04, 0.1, 0.03, 0, 0.018, -0.25);
    box(group, polymer, 0.024, 0.02, 0.06, 0, 0.076, 0.08);
    box(group, bright, 0.018, 0.024, 0.012, 0, 0.098, 0.1);
    box(group, polymer, 0.026, 0.07, 0.03, 0, -0.018, 0.32, -0.1);
    box(moving, bright, 0.014, 0.012, 0.03, 0, 0.074, -0.03);
    const rifleMag = makeMag(0, 0.005, 0.1, 0.024, 0.16, 0.05, -0.22, steel);
    Object.assign(model, rifleMag);
    model.muzzle.position.set(0, 0.044, 0.655);
    model.leftGrip.set(0, -0.05, 0.32);
    model.grab.set(0, 0.078, -0.04);
    model.aimPos.set(-0.085, 0.165, 0.18);
    model.readyPos.set(-0.12, -0.01, 0.2);
    model.readyRz = 0.5;
    model.reloadPos.set(-0.05, 0.06, 0.24);
  } else if (id === 'shotgun') {
    box(group, steel, 0.04, 0.056, 0.2, 0, 0.03, 0.05);
    barrel(group, steel, 0.0115, 0.56, 0, 0.05, 0.42);
    barrel(group, steel, 0.0105, 0.44, 0, 0.022, 0.36);
    add(group, new THREE.BoxGeometry(0.036, 0.075, 0.03), wood, 0, -0.03, -0.018, 0.34);
    box(group, wood, 0.036, 0.056, 0.2, 0, 0.012, -0.15, -0.13);
    box(group, wood, 0.04, 0.09, 0.024, 0, -0.008, -0.255, -0.13);
    box(group, bright, 0.004, 0.012, 0.004, 0, 0.068, 0.68);
    box(moving, wood, 0.042, 0.034, 0.13, 0, 0.022, 0.33);
    model.muzzle.position.set(0, 0.05, 0.705);
    model.leftGrip.set(0, 0.0, 0.33);
    model.port.set(0.02, 0.04, 0.06);
    model.loadPoint = new THREE.Vector3(0, -0.012, 0.09);
    model.travel = 0.11;
    model.aimPos.set(-0.085, 0.165, 0.18);
    model.readyPos.set(-0.12, -0.01, 0.2);
    model.readyRz = 0.5;
    model.reloadPos.set(-0.06, 0.03, 0.24);
    const shell = new THREE.Group();
    add(shell, new THREE.CylinderGeometry(0.0115, 0.0115, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0xa12024, roughness: 0.5 }), 0, 0.012, 0);
    add(shell, new THREE.CylinderGeometry(0.012, 0.012, 0.016, 8), new THREE.MeshStandardMaterial({ color: 0xc6a25c, metalness: 1, roughness: 0.35 }), 0, -0.02, 0);
    shell.visible = false;
    group.add(shell);
    model.shell = shell;
  } else {
    box(group, wood, 0.04, 0.054, 0.3, 0, 0.018, 0.14);
    box(group, wood, 0.038, 0.05, 0.2, 0, 0.012, -0.14, -0.1);
    box(group, wood, 0.04, 0.1, 0.024, 0, -0.008, -0.25, -0.1);
    add(group, new THREE.BoxGeometry(0.032, 0.08, 0.032), wood, 0, -0.024, -0.015, 0.34);
    box(group, steel, 0.034, 0.042, 0.2, 0, 0.056, 0.035);
    barrel(group, steel, 0.0105, 0.62, 0, 0.058, 0.44);
    barrel(group, steel, 0.015, 0.075, 0, 0.058, 0.775);
    barrel(group, steel, 0.02, 0.27, 0, 0.116, 0.07);
    barrel(group, polymer, 0.026, 0.05, 0, 0.116, 0.2);
    barrel(group, polymer, 0.023, 0.04, 0, 0.116, -0.06);
    box(group, steel, 0.012, 0.03, 0.02, 0, 0.088, 0.1);
    box(group, steel, 0.012, 0.03, 0.02, 0, 0.088, 0.0);
    add(moving, new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), bright, 0.03, 0.054, -0.03).rotation.z = Math.PI / 2;
    add(moving, new THREE.SphereGeometry(0.01, 8, 6), bright, 0.056, 0.054, -0.03);
    Object.assign(model, makeMag(0, 0, 0.08, 0.022, 0.05, 0.08, 0, steel));
    model.muzzle.position.set(0, 0.058, 0.81);
    model.leftGrip.set(0, -0.012, 0.34);
    model.grab.set(0.056, 0.054, -0.03);
    model.travel = 0.07;
    model.aimPos.set(-0.085, 0.14, 0.18);
    model.readyPos.set(-0.12, -0.01, 0.2);
    model.readyRz = 0.5;
    model.reloadPos.set(-0.05, 0.05, 0.24);
  }

  group.add(model.muzzle);
  if (model.mag) {
    model.magRest = model.mag.position.clone();
    model.magBottom = new THREE.Vector3(model.mag.position.x, model.mag.position.y - model.magLength * 0.9, model.mag.position.z);
  }
  return model;
}
