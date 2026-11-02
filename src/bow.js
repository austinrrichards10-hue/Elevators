// The bow and its arrows. The bow faces +Z with its grip at the origin and +Y up; the
// string sits behind the grip, towards the archer.
const BOW = {
  name: 'Bow',
  height: 1.0,
  drawTime: 0.75, // seconds to a full draw
  minSpeed: 22, // arrow speed at the lightest draw that still fires, in m/s
  maxSpeed: 68,
  minDraw: 0.2, // letting go before this lowers the arrow instead of firing it
  gravity: 9.8,
  arrowLength: 0.56,
};

// One set of arrow parts shared by every arrow: the nock at the origin, the tip along +Z.
let arrowParts = null;
function buildArrowMesh() {
  if (!arrowParts) {
    const shaft = new THREE.CylinderGeometry(0.0045, 0.0045, BOW.arrowLength - 0.05, 5).rotateX(Math.PI / 2).translate(0, 0, (BOW.arrowLength - 0.05) / 2);
    const head = new THREE.ConeGeometry(0.011, 0.06, 6).rotateX(Math.PI / 2).translate(0, 0, BOW.arrowLength - 0.03);
    // Three vanes, set 120 degrees apart near the nock.
    const vane = new THREE.PlaneGeometry(0.022, 0.1).rotateX(Math.PI / 2).translate(0.013, 0, 0.08);
    const vanes = [0, 1, 2].map((i) => vane.clone().rotateZ((i * Math.PI * 2) / 3));
    arrowParts = {
      shaft, head, vanes,
      wood: new THREE.MeshStandardMaterial({ color: 0xb48a5a, roughness: 0.7 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8d94a3, metalness: 1, roughness: 0.35 }),
      feather: new THREE.MeshStandardMaterial({ color: 0xd8344f, roughness: 0.8, side: THREE.DoubleSide }),
    };
  }
  const p = arrowParts;
  const arrow = new THREE.Group();
  arrow.add(new THREE.Mesh(p.shaft, p.wood), new THREE.Mesh(p.head, p.steel));
  for (const vane of p.vanes) arrow.add(new THREE.Mesh(vane, p.feather));
  arrow.traverse((o) => { o.castShadow = true; });
  return arrow;
}

function buildBowModel() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3320, roughness: 0.55 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x22181a, roughness: 0.9 });
  const group = new THREE.Group();
  const half = BOW.height / 2;

  // Each limb sweeps back towards the archer, then curls forward again at the tip. Limbs
  // pivot at the grip so they can flex as the string comes back.
  const limb = (sign) => {
    const pivot = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.06 * sign, 0.012),
      new THREE.Vector3(0, half * 0.4 * sign, -0.04),
      new THREE.Vector3(0, half * 0.82 * sign, -0.07),
      new THREE.Vector3(0, half * sign, -0.04),
    ]);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.01, 6), wood);
    mesh.castShadow = true;
    const tip = new THREE.Object3D();
    tip.position.set(0, half * sign, -0.04);
    pivot.add(mesh, tip);
    group.add(pivot);
    return { pivot, tip };
  };
  const top = limb(1), bottom = limb(-1);
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.13, 8), leather);
  riser.position.z = 0.012;
  riser.castShadow = true;
  group.add(riser);

  const stringGeo = new THREE.BufferGeometry();
  stringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xe8e2d0 }));
  string.frustumCulled = false;
  group.add(string);

  // The nocked arrow rests on the left of the grip.
  const arrow = buildArrowMesh();
  arrow.visible = false;
  group.add(arrow);

  const tipTop = new THREE.Vector3(), tipBottom = new THREE.Vector3();
  const model = {
    group, arrow,
    nock: new THREE.Vector3(),
    drawLength: 0.6,
    // `draw` runs 0 to 1. The limbs bend, the string comes back to `drawLength` behind the
    // grip, and the arrow shows while one is nocked.
    setDraw(draw, nocked) {
      top.pivot.rotation.x = -0.16 * draw;
      bottom.pivot.rotation.x = 0.16 * draw;
      tipTop.copy(top.tip.position).applyEuler(top.pivot.rotation);
      tipBottom.copy(bottom.tip.position).applyEuler(bottom.pivot.rotation);
      model.nock.set(0, 0, lerp(tipTop.z, -model.drawLength, draw));
      const pos = stringGeo.attributes.position;
      pos.setXYZ(0, tipTop.x, tipTop.y, tipTop.z);
      pos.setXYZ(1, model.nock.x, model.nock.y, model.nock.z);
      pos.setXYZ(2, tipBottom.x, tipBottom.y, tipBottom.z);
      pos.needsUpdate = true;
      arrow.visible = nocked;
      arrow.position.set(0.016, 0, model.nock.z);
    },
  };
  model.setDraw(0, false);
  return model;
}
