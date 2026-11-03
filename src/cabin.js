// The plane's cabin, for the opening's first moments aboard, and the seats in it: Miku and
// Teto face each other across a pair of club seats by the windows, over the left wing. One
// of those seats is thrown clear in the crash, with Teto still strapped into it.
// Everything here is in the plane's own space: metres, nose along +Z, left wing along -X.
const CABIN = {
  centre: -1.31, // the fuselage's axis, below the plane's origin
  radius: 1.12, // inside the skin
  floor: -2.15,
  front: 4.1, back: -3.6,
  // Each window: [side, along]. The windows sit a little above a seated eye.
  windows: [[-1, -2.0], [-1, -0.7], [-1, 0.75], [-1, 2.2], [-1, 3.4], [1, 1.4], [1, 2.75], [1, 3.8], [1, -2.1]],
  windowAngle: 1.7, windowHalf: [0.17, 0.17], // from the top, and its half-height (radians) and half-width (metres)
  door: { side: 1, from: -1.0, to: 0.05, top: 0.95, bottom: 2.42 }, // along z, and angles from the top
  // Seats: [x, z, facing (radians about Y)].
  seats: { miku: [-0.46, 0.45, 0], teto: [-0.46, 2.1, Math.PI], spareA: [0.46, 1.35, 0], spareB: [0.46, 2.85, Math.PI] },
};

/* ---------- Seats ---------- */
// A cream leather club seat on a pedestal, facing +Z, its base at the origin. `torn` leaves
// the pedestal ripped off at the floor, with bent rails underneath.
function buildSeat(material, trim, { torn = false, belt = null } = {}) {
  const seat = new THREE.Group();
  const box = (w, h, d, x, y, z, mat = material, rx = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = true;
    seat.add(mesh);
    return mesh;
  };
  if (torn) {
    // The rails it was bolted down by, bent where they tore free.
    for (const side of [-1, 1]) {
      const rail = box(0.04, 0.03, 0.5, side * 0.16, 0.05, 0.02, trim);
      rail.rotation.set(0.25, side * 0.1, 0);
    }
    box(0.36, 0.16, 0.4, 0, 0.17, 0, trim);
  } else {
    box(0.36, 0.25, 0.4, 0, 0.125, 0, trim);
  }
  box(0.52, 0.12, 0.52, 0, 0.36, 0.02);
  const back = box(0.52, 0.64, 0.13, 0, 0.72, -0.26, material, -0.16);
  box(0.32, 0.17, 0.12, 0, 1.12, -0.33, material, -0.16);
  for (const side of [-1, 1]) box(0.08, 0.07, 0.44, side * 0.3, 0.55, 0.0, trim);
  if (belt) {
    // The lap belt across her, buckled.
    box(0.5, 0.025, 0.06, 0, 0.53, 0.14, belt);
    box(0.06, 0.035, 0.04, 0, 0.535, 0.17, trim);
  }
  seat.userData.back = back;
  return seat;
}

/* ---------- The cabin ---------- */
// The fuselage's inside: a curved wall with the windows and the door left open, a carpeted
// floor, end bulkheads, a strip of light along the ceiling and the seats. Unlit, with soft
// light baked in, so the alarm can wash it red.
function buildCabin() {
  const cabin = new THREE.Group();
  const C = CABIN;
  const wallMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide });
  const point = (angle, z, r = C.radius) => new THREE.Vector3(-Math.sin(angle) * r, C.centre + Math.cos(angle) * r, z);
  // Angles run from the top of the fuselage, positive towards the left (-X). The wall
  // meets the floor at ±floorAngle.
  const floorAngle = Math.acos((C.floor - C.centre) / C.radius);
  const holes = [];
  for (const [side, z] of C.windows) {
    const a = -side * C.windowAngle;
    holes.push({ a0: a - C.windowHalf[0], a1: a + C.windowHalf[0], z0: z - C.windowHalf[1], z1: z + C.windowHalf[1] });
  }
  const d = C.door;
  const doorA0 = -d.side * d.bottom, doorA1 = -d.side * d.top;
  holes.push({ a0: Math.min(doorA0, doorA1), a1: Math.max(doorA0, doorA1), z0: d.from, z1: d.to });
  // The wall: a grid round the fuselage, leaving out the cells over the holes.
  const pos = [], col = [];
  // Light from the ceiling strip falls off down the walls; panel seams every half metre.
  const shade = (a, z) => {
    const up = Math.cos(a);
    const seam = Math.abs(((z - C.back) % 0.5) - 0.25) > 0.235 ? 0.82 : 1;
    return (0.42 + 0.36 * Math.max(0, up) ** 0.7 + 0.04 * Math.sin(a * 6)) * seam;
  };
  const quad = (a0, a1, z0, z1) => {
    const p = [point(a0, z0), point(a1, z0), point(a1, z1), point(a0, z1)];
    const s = [shade(a0, z0), shade(a1, z0), shade(a1, z1), shade(a0, z1)];
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(p[i].x, p[i].y, p[i].z); col.push(s[i] * 0.98, s[i] * 0.9, s[i] * 0.8); }
  };
  // From the floor on the right, over the top, down to the floor on the left.
  const aSteps = 96, zStep = 0.05;
  for (let i = 0; i < aSteps; i++) {
    const a0 = lerp(-floorAngle, floorAngle, i / aSteps), a1 = lerp(-floorAngle, floorAngle, (i + 1) / aSteps);
    const am = (a0 + a1) / 2;
    for (let z = C.back; z < C.front - 1e-6; z += zStep) {
      const zm = z + zStep / 2;
      if (holes.some((h) => am > h.a0 && am < h.a1 && zm > h.z0 && zm < h.z1)) continue;
      quad(a0, a1, z, Math.min(C.front, z + zStep));
    }
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  cabin.add(new THREE.Mesh(wallGeo, wallMat));
  // Window surrounds: a soft frame round each opening.
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xc9c2b4, side: THREE.DoubleSide });
  for (const h of holes.slice(0, -1)) {
    const frame = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 28), frameMat);
    const mid = point((h.a0 + h.a1) / 2, (h.z0 + h.z1) / 2, C.radius - 0.012);
    frame.position.copy(mid);
    frame.lookAt(new THREE.Vector3(0, mid.y, mid.z));
    frame.scale.set(1, 0.95, 1);
    cabin.add(frame);
  }
  // Floor and bulkheads.
  const halfFloor = Math.sqrt(C.radius ** 2 - (C.floor - C.centre) ** 2);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(halfFloor * 2, C.front - C.back).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x232634 }));
  carpet.position.set(0, C.floor, (C.front + C.back) / 2);
  cabin.add(carpet);
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(0.38, C.front - C.back).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a3e52 }));
  aisle.position.set(0, C.floor + 0.002, (C.front + C.back) / 2);
  cabin.add(aisle);
  const bulkMat = new THREE.MeshBasicMaterial({ color: 0x7d7568, side: THREE.DoubleSide });
  for (const z of [C.front, C.back]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(C.radius, 40), bulkMat);
    disc.position.set(0, C.centre, z);
    cabin.add(disc);
  }
  // The cockpit door in the front bulkhead, shut.
  const cockpit = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.6), new THREE.MeshBasicMaterial({ color: 0x5b554c, side: THREE.DoubleSide }));
  cockpit.position.set(0, C.floor + 0.8, C.front - 0.01);
  cabin.add(cockpit);
  // The ceiling's light strip, which the alarm turns red.
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1dc).multiplyScalar(1.6) });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, C.front - C.back - 0.3), lightMat);
  strip.position.set(0, C.centre + C.radius - 0.03, (C.front + C.back) / 2);
  cabin.add(strip);

  // The door: a curved panel filling its opening, with a handle and a small window.
  const door = new THREE.Group();
  const doorPos = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const a0 = lerp(doorA0, doorA1, i / steps), a1 = lerp(doorA0, doorA1, (i + 1) / steps);
    const p = [point(a0, d.from, C.radius - 0.01), point(a1, d.from, C.radius - 0.01), point(a1, d.to, C.radius - 0.01), point(a0, d.to, C.radius - 0.01)];
    for (const k of [0, 1, 2, 0, 2, 3]) doorPos.push(p[k].x, p[k].y, p[k].z);
  }
  const doorGeo = new THREE.BufferGeometry();
  doorGeo.setAttribute('position', new THREE.Float32BufferAttribute(doorPos, 3));
  const doorCentre = point((doorA0 + doorA1) / 2, (d.from + d.to) / 2, C.radius - 0.01);
  doorGeo.translate(-doorCentre.x, -doorCentre.y, -doorCentre.z);
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x8e877a, side: THREE.DoubleSide });
  door.add(new THREE.Mesh(doorGeo, doorMat));
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.22), new THREE.MeshBasicMaterial({ color: 0x55565c }));
  handle.position.set(-0.05, 0.02, 0.2);
  door.add(handle);
  const seam = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 20), new THREE.MeshBasicMaterial({ color: 0x8a8476, side: THREE.DoubleSide }));
  seam.position.set(-0.03, 0.35, -0.05);
  seam.rotation.y = Math.PI / 2;
  door.add(seam);
  // A glow round its edge as the seal goes.
  const leak = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.45), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  leak.position.set(0.02, 0, 0);
  leak.rotation.y = Math.PI / 2;
  door.add(leak);
  door.position.copy(doorCentre);
  cabin.add(door);

  // Seats.
  const leather = new THREE.MeshBasicMaterial({ color: 0xa89a82 });
  const trim = new THREE.MeshBasicMaterial({ color: 0x45433f });
  const seats = {};
  for (const [name, [x, z, yaw]] of Object.entries(C.seats)) {
    const seat = buildSeat(leather, trim);
    seat.position.set(x, C.floor, z);
    seat.rotation.y = yaw;
    cabin.add(seat);
    seats[name] = seat;
  }
  // The fold-out table between Miku's seat and Teto's, walnut with a pale edge.
  const tableTop = CABIN.floor + 0.6;
  const table = new THREE.Group();
  const wood = new THREE.MeshBasicMaterial({ color: 0x5a3e2b });
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.6), wood);
  top.position.y = tableTop;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.012, 0.62), new THREE.MeshBasicMaterial({ color: 0xc9b89a }));
  edge.position.y = tableTop - 0.022;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, tableTop - CABIN.floor, 10), trim);
  leg.position.y = (tableTop + CABIN.floor) / 2;
  table.add(top, edge, leg);
  table.position.set(-0.6, 0, C.seats.teto[1] - 0.72);
  cabin.add(table);
  // Oxygen masks, folded away in the ceiling until they drop.
  const masks = [];
  const maskMat = new THREE.MeshBasicMaterial({ color: 0xf2c84b });
  const cordMat = new THREE.LineBasicMaterial({ color: 0xe9e2d0 });
  for (const [x, z] of [[-0.5, 0.75], [-0.5, 1.65], [0.5, 1.65], [0.5, 2.55]]) {
    const top = new THREE.Vector3(x * 0.85, C.centre + C.radius * 0.86, z);
    const mask = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.08, 12), maskMat);
    const cord = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -0.5, 0)]), cordMat);
    const holder = new THREE.Group();
    holder.position.copy(top);
    holder.add(mask, cord);
    mask.position.y = -0.5;
    holder.visible = false;
    cabin.add(holder);
    masks.push({ holder, phase: Math.random() * 6 });
  }
  // Loose things that fly for the door when it goes: papers, cups, a magazine.
  const loose = [];
  const paper = new THREE.MeshBasicMaterial({ color: 0xf4f1ea, side: THREE.DoubleSide });
  const cup = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mag = new THREE.MeshBasicMaterial({ color: 0xd14a6b, side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {
    const kind = i % 4;
    const geo = kind === 1 ? new THREE.CylinderGeometry(0.035, 0.028, 0.09, 10) : kind === 3 ? new THREE.BoxGeometry(0.21, 0.01, 0.28) : new THREE.PlaneGeometry(0.21, 0.28);
    const mesh = new THREE.Mesh(geo, kind === 1 ? cup : kind === 3 ? mag : paper);
    mesh.visible = false;
    cabin.add(mesh);
    // The first few sit on the table, and are there to see before the door goes.
    const onTable = i < 3;
    const home = onTable
      ? new THREE.Vector3(table.position.x + (i - 1) * 0.16, tableTop + (kind === 1 ? 0.063 : 0.022), table.position.z + (i - 1) * 0.12)
      : new THREE.Vector3((Math.random() - 0.5) * 1.2, C.floor + 0.4 + Math.random() * 0.9, -1.5 + Math.random() * 4.5);
    if (onTable && kind !== 1) mesh.rotation.set(-Math.PI / 2, 0, i * 0.7);
    loose.push({ mesh, home, onTable, vel: new THREE.Vector3(), spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9), gone: false });
  }
  const mist = buildPuffs(60, 0xf4f6ff);
  cabin.add(mist.group);
  cabin.visible = false;
  return { group: cabin, wallMat, lightMat, door, doorCentre, leak, seats, masks, loose, mist };
}

/* ---------- Sitting ---------- */
const seatQ = new THREE.Quaternion(), seatM = new THREE.Matrix4(), seatV = new THREE.Vector3();

// Sits an avatar in a seat: her hips on the cushion, thighs along it and shins down to the
// floor, in the seat's space (`seat` is the seat's Object3D, already placed in the world).
// `slump` (0 to 1) lets her sag to one side, out cold; the hands go where `hands` puts them,
// in her chest's space: { l, r, poleL, poleR }.
function poseSeated(a, seat, { slump = 0, hands = null, head = null, lean = 0 } = {}) {
  seat.updateMatrixWorld(true);
  seat.getWorldQuaternion(seatQ);
  a.root.quaternion.copy(seatQ);
  // Her root sits on the floor under the front of the cushion, her hips back on it.
  seatV.set(0, 0, -0.02).applyMatrix4(seat.matrixWorld);
  a.root.position.copy(seatV);
  a.hips.position.y = 0.5;
  a.hips.rotation.set(0, 0, slump * 0.1);
  a.chest.rotation.set(0.05 + slump * 0.3 + lean, slump * 0.15, slump * 0.32);
  for (const [leg, splay] of [[a.legL, 0.1], [a.legR, -0.1]]) {
    leg.thigh.rotation.set(-1.5, 0, splay * (1 + slump));
    leg.shin.rotation.set(1.48 - slump * 0.25, 0, 0);
  }
  a.head.rotation.set(head ? head.x : 0.1 + slump * 0.35, head ? head.y : slump * 0.45, head ? head.z : slump * 0.42);
  const s = a.armL.upper.position;
  const h = hands || {
    l: seatV.set(s.x + 0.16 + slump * 0.08, s.y - 0.46, 0.14 - slump * 0.05).clone(),
    r: new THREE.Vector3(-s.x - 0.16 - slump * 0.08, s.y - 0.46, 0.14 - slump * 0.05),
  };
  solveArm(a.armL, h.l, h.poleL || POLE_L);
  solveArm(a.armR, h.r, h.poleR || POLE_R);
  a.armL.hand.quaternion.identity();
  a.armR.hand.quaternion.identity();
}
