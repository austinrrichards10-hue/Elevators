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
  // She's modelled in an A-pose. Her hands are clasped behind her back: each arm is solved as a
  // two-bone chain (shoulder → elbow → wrist) reaching a point at the small of her back, with the
  // elbows bending out and back. In the model's own space she faces +z, so her left is +x.
  // Each value can be overridden from the URL to tune the pose, e.g. ?hy=0.4&hz=0.17.
  const q = new URLSearchParams(location.search);
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
  const HAND_DROP = num('hy', 0.37);   // how far below the shoulders the hands meet
  const HAND_BACK = num('hz', 0.1);    // how far behind the shoulders' centre line
  const HAND_GAP = num('hx', 0.025);   // each hand's offset from her midline (left over right)
  const ELBOW_OUT = num('eo', 1), ELBOW_BACK = num('eb', 0.5);

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

  function armChain(model, side) {
    // Exactly the helper itself, not its "…_EllbowSupport_end" tip bone one link further down.
    const helper = new RegExp('^' + side + '_EllbowSupport_\\d+$');
    let support = null;
    model.traverse((o) => { if (o.isBone && helper.test(o.name)) support = o; });
    if (!support) return null;
    const elbow = support.parent, upper = elbow.parent.parent;
    const wristTwist = elbow.children.find((k) => k.isBone);
    const wrist = (wristTwist && wristTwist.children.find((k) => k.isBone)) || wristTwist;
    return wrist ? { upper, elbow, wrist } : null;
  }

  const wpos = (o) => o.getWorldPosition(new THREE.Vector3());

  function relaxArms(model) {
    model.updateMatrixWorld(true);
    const arms = [['Left', 1], ['Right', -1]].map(([side, sx]) => ({ sx, c: armChain(model, side) })).filter((a) => a.c);
    if (arms.length < 2) return;
    // The point between her shoulders; the hands meet below and behind it.
    const mid = wpos(arms[0].c.upper).add(wpos(arms[1].c.upper)).multiplyScalar(0.5);
    for (const { sx, c } of arms) {
      const S = wpos(c.upper);
      const a = S.distanceTo(wpos(c.elbow)), b = wpos(c.elbow).distanceTo(wpos(c.wrist));
      const T = new THREE.Vector3(mid.x + sx * HAND_GAP, mid.y - HAND_DROP, mid.z - HAND_BACK);
      // Two-bone IK: where the elbow sits so the upper arm and forearm reach T.
      const toT = T.clone().sub(S);
      const d = Math.min(toT.length(), (a + b) * 0.999);
      const u = toT.normalize();
      const along = (a * a - b * b + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, a * a - along * along));
      const pole = new THREE.Vector3(sx * ELBOW_OUT, 0, -ELBOW_BACK);
      pole.sub(u.clone().multiplyScalar(u.dot(pole))).normalize();
      const E = S.clone().add(u.clone().multiplyScalar(along)).add(pole.multiplyScalar(h));
      aim(c.upper, c.upper, c.elbow, E.clone().sub(S));
      aim(c.elbow, c.elbow, c.wrist, T.clone().sub(wpos(c.elbow)));
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
