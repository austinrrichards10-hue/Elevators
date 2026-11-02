// Character models, built from primitives. All of them face +Z at rotation 0.
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x07080f, side: THREE.BackSide });

function part(parent, geo, material, x = 0, y = 0, z = 0, outline = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (outline) {
    const hull = new THREE.Mesh(geo, OUTLINE_MAT);
    hull.scale.setScalar(1 + outline);
    mesh.add(hull);
  }
  parent.add(mesh);
  return mesh;
}

function buildHeroine() {
  const toon = (color) => new THREE.MeshToonMaterial({ color });
  const skin = toon(0xf4e3df), cloth = toon(0xd9dcf0), crimson = toon(0xb3264d);
  const hair = toon(0xc62f5c), black = toon(0x15151f), brass = toon(0xb99a5a);
  const root = new THREE.Group();

  const makeLeg = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.72, 0);
    part(pivot, new THREE.CylinderGeometry(0.075, 0.058, 0.58, 8), skin, 0, -0.29, 0, 0.1);
    part(pivot, new THREE.BoxGeometry(0.12, 0.13, 0.22), black, 0, -0.65, 0.04, 0.08);
    root.add(pivot);
    return pivot;
  };
  const legL = makeLeg(0.1), legR = makeLeg(-0.1);

  part(root, new THREE.CylinderGeometry(0.15, 0.3, 0.3, 9), cloth, 0, 0.84, 0, 0.05);
  part(root, new THREE.CylinderGeometry(0.3, 0.37, 0.16, 9), crimson, 0, 0.62, 0, 0.05);
  part(root, new THREE.CylinderGeometry(0.37, 0.385, 0.03, 9), black, 0, 0.53, 0);
  for (const x of [-0.08, 0.08]) part(root, new THREE.BoxGeometry(0.012, 0.28, 0.012), black, x, 0.84, 0.235).rotation.x = -0.45;

  part(root, new THREE.CylinderGeometry(0.135, 0.15, 0.36, 9), cloth, 0, 1.15, 0, 0.05);
  part(root, new THREE.BoxGeometry(0.07, 0.03, 0.34), crimson, 0, 1.33, 0);
  const strap = part(root, new THREE.BoxGeometry(0.028, 0.38, 0.03), black, 0, 1.17, 0.14);
  strap.rotation.z = 0.65;
  for (const y of [1.06, 1.14, 1.22]) {
    for (const x of [-0.045, 0.045]) part(root, new THREE.SphereGeometry(0.012, 5, 4), brass, x, y, 0.145);
  }

  const makeArm = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.29, 0);
    part(pivot, new THREE.CylinderGeometry(0.07, 0.078, 0.18, 7), cloth, 0, -0.07, 0, 0.1);
    part(pivot, new THREE.CylinderGeometry(0.08, 0.08, 0.035, 7), crimson, 0, -0.17, 0);
    part(pivot, new THREE.CylinderGeometry(0.055, 0.045, 0.28, 7), skin, 0, -0.3, 0, 0.1);
    part(pivot, new THREE.CylinderGeometry(0.058, 0.058, 0.09, 7), black, 0, -0.41, 0);
    part(pivot, new THREE.SphereGeometry(0.052, 6, 5), skin, 0, -0.48, 0, 0.1);
    root.add(pivot);
    return pivot;
  };
  const armL = makeArm(0.2), armR = makeArm(-0.2);

  // The pistol sits along the arm: local -Y is forward and +Z is up when the arm is raised.
  const gun = new THREE.Group();
  gun.position.set(0, -0.5, 0);
  const steel = toon(0xcfc6e6);
  part(gun, new THREE.BoxGeometry(0.05, 0.25, 0.06), steel, 0, -0.08, 0.045, 0.08);
  part(gun, new THREE.BoxGeometry(0.042, 0.06, 0.13), black, 0, 0.02, -0.02, 0.08);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.22, 0.045);
  gun.add(muzzle);
  armR.add(gun);

  const head = new THREE.Group();
  head.position.y = 1.56;
  part(head, new THREE.IcosahedronGeometry(0.235, 2), skin, 0, 0, 0, 0.04);
  for (const x of [-0.09, 0.09]) {
    const white = part(head, new THREE.SphereGeometry(0.052, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), x, -0.015, 0.2);
    white.scale.set(0.9, 1.15, 0.28);
    const iris = part(head, new THREE.SphereGeometry(0.036, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb01232 }), x, -0.02, 0.222);
    iris.scale.set(0.9, 1.25, 0.25);
    const lash = part(head, new THREE.BoxGeometry(0.11, 0.016, 0.014), OUTLINE_MAT.clone(), x, 0.045, 0.214);
    lash.material.side = THREE.FrontSide;
  }
  const crown = part(head, new THREE.IcosahedronGeometry(0.262, 1), hair, 0, 0.055, -0.035, 0.04);
  crown.scale.set(1, 0.98, 1);
  for (const [x, height, tilt] of [[-0.13, 0.2, 0.25], [-0.03, 0.26, 0.1], [0.08, 0.22, -0.18], [0.17, 0.16, -0.32]]) {
    const fringe = part(head, new THREE.ConeGeometry(0.08, height, 4), hair, x, 0.16 - height * 0.28, 0.2);
    fringe.rotation.set(Math.PI, 0, tilt);
  }
  // Side ringlets, stacked rings that taper as they drop.
  for (const side of [-1, 1]) {
    const ringlet = new THREE.Group();
    ringlet.position.set(side * 0.31, 0.03, -0.03);
    for (let i = 0; i < 4; i++) {
      const size = 0.125 - i * 0.02;
      const ring = part(ringlet, new THREE.CylinderGeometry(size, size * 0.86, 0.082, 7), hair, 0, 0.12 - i * 0.085, 0, 0.09);
      ring.rotation.z = side * 0.14;
    }
    head.add(ringlet);
  }
  root.add(head);

  return { root, legL, legR, armL, armR, head, muzzle };
}

const GHOUL_GEO = {
  torso: new THREE.CylinderGeometry(0.2, 0.14, 0.7, 6),
  head: new THREE.IcosahedronGeometry(0.2, 0),
  limb: new THREE.BoxGeometry(0.1, 0.72, 0.1),
  eye: new THREE.SphereGeometry(0.035, 5, 4),
};
const EYE_MAT = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, fog: false });
const RAG_MAT = new THREE.MeshLambertMaterial({ color: 0x1b2036, flatShading: true });

function buildGhoul(runner) {
  const skin = new THREE.MeshLambertMaterial({ color: runner ? 0x8d9bc8 : 0x69759f, flatShading: true });
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.x = runner ? 0.55 : 0.28;
  body.position.y = 0.76;
  root.add(body);
  part(body, GHOUL_GEO.torso, RAG_MAT, 0, 0.35, 0);
  const head = part(body, GHOUL_GEO.head, skin, 0, 0.86, 0.04);
  head.scale.y = 1.15;
  for (const x of [-0.075, 0.075]) part(body, GHOUL_GEO.eye, EYE_MAT, x, 0.87, 0.2);

  const limb = (parent, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    part(pivot, GHOUL_GEO.limb, skin, 0, -0.36, 0);
    parent.add(pivot);
    return pivot;
  };
  return {
    root, skin,
    armL: limb(body, 0.27, 0.64),
    armR: limb(body, -0.27, 0.64),
    legL: limb(root, 0.13, 0.76),
    legR: limb(root, -0.13, 0.76),
  };
}

function buildBoss() {
  const armor = new THREE.MeshLambertMaterial({ color: 0x2a3049, flatShading: true });
  const trim = new THREE.MeshLambertMaterial({ color: 0x6a7596, flatShading: true });
  const cape = new THREE.MeshLambertMaterial({ color: 0x481226, flatShading: true, side: THREE.DoubleSide });
  const glow = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, fog: false });
  const root = new THREE.Group();

  const leg = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.45, 0);
    part(pivot, new THREE.BoxGeometry(0.46, 1.45, 0.5), armor, 0, -0.72, 0);
    part(pivot, new THREE.BoxGeometry(0.52, 0.32, 0.52), trim, 0, -0.72, 0.05);
    root.add(pivot);
    return pivot;
  };
  const legL = leg(0.36), legR = leg(-0.36);

  part(root, new THREE.CylinderGeometry(0.82, 0.55, 1.45, 7), armor, 0, 2.15, 0);
  part(root, new THREE.BoxGeometry(0.28, 0.62, 0.1), glow, 0, 2.3, 0.72);
  part(root, new THREE.BoxGeometry(1.2, 2.5, 0.08), cape, 0, 1.75, -0.72).rotation.x = -0.1;

  const head = new THREE.Group();
  head.position.y = 3.2;
  part(head, new THREE.IcosahedronGeometry(0.42, 0), armor);
  for (const x of [-0.15, 0.15]) part(head, new THREE.SphereGeometry(0.06, 5, 4), glow, x, 0.03, 0.36);
  for (let i = 0; i < 5; i++) {
    const a = -1 + i * 0.5;
    const spike = part(head, new THREE.ConeGeometry(0.075, 0.62, 4), trim, Math.sin(a) * 0.36, 0.48 - Math.abs(a) * 0.1, Math.cos(a) * 0.18 - 0.02);
    spike.rotation.z = -a * 0.42;
  }
  root.add(head);

  const arm = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.7, 0);
    part(pivot, new THREE.IcosahedronGeometry(0.46, 0), trim);
    part(pivot, new THREE.BoxGeometry(0.34, 1.45, 0.36), armor, 0, -0.75, 0);
    root.add(pivot);
    return pivot;
  };
  const armL = arm(1.02), armR = arm(-1.02);

  const sword = new THREE.Group();
  sword.position.set(0, -1.5, 0);
  part(sword, new THREE.BoxGeometry(0.11, 0.13, 3.3), glow, 0, 0, 1.75);
  part(sword, new THREE.BoxGeometry(0.34, 0.08, 3.1), armor, 0, -0.02, 1.65);
  part(sword, new THREE.BoxGeometry(1, 0.2, 0.18), trim, 0, 0, 0.1);
  armR.add(sword);

  return { root, legL, legR, armL, armR, head };
}
