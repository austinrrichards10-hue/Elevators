// Miku, from the rigged model embedded in models/miku.js, loaded with three.js's GLTF loader.
// The model is an MMD-style rig: her arms are posed by turning the arm bones, not by moving the mesh.
// The export also carries the rig's physics colliders as visible meshes ("mmd_tools_rigid_…"),
// which are hidden. She stands facing -z in her own space (the way a camera looks).
const Miku = (() => {
  const HEIGHT = 1.58;

  function build(gltf) {
    const model = gltf.scene;
    const bones = {};
    model.traverse((o) => {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.some((m) => /^mmd_tools_rigid/.test(m.name))) { o.visible = false; return; }
        o.frustumCulled = false;   // skinned meshes' bounds don't follow the pose
      }
    });

    // Scale to height and stand her on y = 0, centred.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    model.traverse((o) => { if (o.isMesh && o.visible) box.expandByObject(o); });
    const size = box.getSize(new THREE.Vector3());
    const s = HEIGHT / size.y;
    model.scale.multiplyScalar(s);
    const centre = box.getCenter(new THREE.Vector3());
    model.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);

    if (!/[?&]rest/.test(location.search)) relaxArms(model);   // ?rest shows the model's own pose, for checking

    // The model faces +z; turn her to face -z like the rest of the game expects.
    const turn = new THREE.Group();
    turn.rotation.y = Math.PI;
    turn.add(model);
    const group = new THREE.Group();
    group.add(turn);
    return { group, model, bones, height: HEIGHT };
  }

  // The rig's Japanese bone names didn't survive the export, but each elbow has a helper bone
  // named Left_/Right_EllbowSupport. Elbow = its parent; upper arm = two bones above the elbow
  // (upper arm → arm twist → elbow → wrist twist → wrist).
  // She's modelled in an A-pose (arms ~35° below horizontal). Only the shoulder joint turns:
  // the upper-arm bone swings the whole arm down, shoulder to wrist, as one straight piece. The
  // elbows are left as modelled. In the model's own space she faces +z, so her left is +x.
  const ARM_OUT = 0.1, ARM_FWD = 0.02;    // how far the arm leans out from her side / forward

  function aim(bone, from, to, dir) {
    // Turn `bone` so the line from `from` to `to` (both moved by it) points along `dir` (model space).
    const a = from.getWorldPosition(new THREE.Vector3()), b = to.getWorldPosition(new THREE.Vector3());
    const cur = b.sub(a).normalize();
    const turn = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
    const world = bone.getWorldQuaternion(new THREE.Quaternion());
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
    bone.updateMatrixWorld(true);
  }

  function relaxArms(model) {
    model.updateMatrixWorld(true);
    for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
      let support = null;
      // Exactly the helper itself, not its "…_EllbowSupport_end" tip bone one link further down.
      const helper = new RegExp('^' + side + '_EllbowSupport_\\d+$');
      model.traverse((o) => { if (o.isBone && helper.test(o.name)) support = o; });
      if (!support) continue;
      const elbow = support.parent, upper = elbow.parent.parent;
      const wristTwist = elbow.children.find((k) => k.isBone);
      const wrist = (wristTwist && wristTwist.children.find((k) => k.isBone)) || wristTwist || elbow;
      aim(upper, upper, wrist, new THREE.Vector3(sx * ARM_OUT, -1, ARM_FWD));
    }
  }

  // Loads the model script after the page is up, so the start screen appears straight away.
  function load(onReady) {
    const s = document.createElement('script');
    s.src = 'models/miku.js';
    s.onload = () => {
      const raw = atob(window.MIKU_GLB);
      window.MIKU_GLB = null;
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      new GLTFLoader().parse(bytes.buffer, '', (gltf) => onReady(build(gltf)), (err) => { console.error(err); onReady(null); });
    };
    s.onerror = () => onReady(null);
    document.body.appendChild(s);
  }

  return { load };
})();
