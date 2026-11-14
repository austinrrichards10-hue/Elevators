// Miku, from the rigged model embedded in models/miku.js, loaded with three.js's GLTF loader, and
// animated live: she breathes, her head turns to look at things before her body follows, and her
// arms move through gestures (hands behind her back, explaining, a hand to her mouth when she
// laughs, a wave, reaching out when she sings...), each arm solved as a two-bone chain every frame.
//
// The export carries the rig's physics colliders as visible meshes ("mmd_tools_rigid_…"); they're
// hidden. Most bone names were garbled in the export, so bones are found by the numbers on the
// ends of their names and by the elbow helper bones (Left_/Right_EllbowSupport).
// She stands facing -z in her own space (the way a camera looks).
const Miku = (() => {
  const HEIGHT = 1.58;

  // ---------- Poses ----------
  // Where each hand goes, relative to the point between her shoulders, in metres, in her own
  // space (she faces +z, her left is +x), and which way each elbow points. L is her left hand.
  const P = (L, R, pl, pr, extra = {}) => ({ L, R, pl, pr, ...extra });
  const POSES = {
    behind: P([0.025, -0.37, -0.1], [-0.025, -0.37, -0.1], [1, 0, -0.5], [-1, 0, -0.5]),
    sides: P([0.19, -0.56, 0.04], [-0.19, -0.56, 0.04], [0.2, 0, -1], [-0.2, 0, -1]),
    clasp: P([0.03, -0.43, 0.15], [-0.03, -0.42, 0.16], [1, 0, -0.6], [-1, 0, -0.6]),
    shy: P([0.03, -0.38, 0.15], [-0.03, -0.37, 0.16], [1, 0, -0.6], [-1, 0, -0.6], { headPitch: -0.28, headRoll: 0.08 }),
    chest: P([0.06, -0.2, 0.19], [-0.05, -0.17, 0.2], [1, -0.7, -0.3], [-1, -0.7, -0.3]),
    explainR: P([0.17, -0.53, 0.07], [-0.22, -0.3, 0.27], [0.3, 0, -1], [-1, -0.6, -0.3], { move: 'R' }),
    explainL: P([0.22, -0.3, 0.27], [-0.17, -0.53, 0.07], [1, -0.6, -0.3], [-0.3, 0, -1], { move: 'L' }),
    ask: P([0.21, -0.34, 0.24], [-0.21, -0.34, 0.24], [1, -0.8, -0.2], [-1, -0.8, -0.2], { headRoll: -0.1, move: 'B' }),
    excited: P([0.16, -0.08, 0.19], [-0.16, -0.08, 0.19], [1, -1, 0], [-1, -1, 0], { headPitch: 0.06, move: 'B' }),
    giggle: P([0.04, -0.33, 0.17], [-0.01, 0.06, 0.15], [1, 0, -0.5], [-1, -1, 0], { headPitch: -0.1, headRoll: 0.12 }),
    think: P([0.0, -0.32, 0.16], [-0.03, 0.06, 0.13], [1, -0.3, -0.5], [-1, -1, 0], { headRoll: 0.14, headPitch: 0.05 }),
    wave: P([0.17, -0.53, 0.07], [-0.3, 0.17, 0.09], [0.3, 0, -1], [-1, -1, -0.2], { wave: true }),
    reach: P([0.06, -0.2, 0.19], [-0.34, -0.1, 0.3], [1, -0.7, -0.3], [-1, -0.6, -0.4], { headPitch: 0.1 }),
    heart: P([0.035, -0.12, 0.19], [-0.035, -0.12, 0.19], [1, -1, -0.2], [-1, -1, -0.2], { headPitch: 0.05 }),
  };

  function build(gltf) {
    const model = gltf.scene;
    model.traverse((o) => {
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

    // `rig` is her own space: facing +z, in metres. It's turned round to face -z for the game.
    const rig = new THREE.Group();
    rig.add(model);
    const turn = new THREE.Group();
    turn.rotation.y = Math.PI;
    turn.add(rig);
    const group = new THREE.Group();
    group.add(turn);
    group.updateMatrixWorld(true);

    const anim = /[?&]rest/.test(location.search) ? null : makeAnimator(model, rig);
    return { group, model, update: anim ? anim.update : () => {}, height: HEIGHT };
  }

  // ---------- The animator ----------
  function makeAnimator(model, rig) {
    const bone = (re) => { let b = null; model.traverse((o) => { if (o.isBone && re.test(o.name)) b = o; }); return b; };
    const chest = bone(/2_012$/), neck = bone(/_013$/), head = bone(/_014$/);
    const arm = (side) => {
      const support = bone(new RegExp('^' + side + '_EllbowSupport_\\d+$'));
      if (!support) return null;
      const elbow = support.parent, upper = elbow.parent.parent;
      const wt = elbow.children.find((k) => k.isBone);
      const wrist = (wt && wt.children.find((k) => k.isBone)) || wt;
      return wrist ? { upper, elbow, wrist } : null;
    };
    const arms = { L: arm('Left'), R: arm('Right') };
    if (!arms.L || !arms.R) return null;
    const restOf = (b) => (b ? b.quaternion.clone() : null);
    const rest = new Map();
    for (const b of [chest, neck, head, arms.L.upper, arms.L.elbow, arms.R.upper, arms.R.elbow]) if (b) rest.set(b, restOf(b));

    const v = () => new THREE.Vector3();
    const wpos = (o) => o.getWorldPosition(v());
    const toRig = (p) => rig.worldToLocal(p);
    const dirToWorld = (d) => d.clone().transformDirection(rig.matrixWorld);
    const rigQuat = new THREE.Quaternion();

    // Arm lengths, in rig space.
    rig.updateMatrixWorld(true);
    const len = {};
    for (const k of ['L', 'R']) {
      const c = arms[k];
      len[k] = [toRig(wpos(c.upper)).distanceTo(toRig(wpos(c.elbow))), toRig(wpos(c.elbow)).distanceTo(toRig(wpos(c.wrist)))];
    }

    function aim(b, from, to, dirWorld) {
      const cur = wpos(to).sub(wpos(from)).normalize();
      const turn = new THREE.Quaternion().setFromUnitVectors(cur, dirWorld.normalize());
      const world = b.getWorldQuaternion(new THREE.Quaternion());
      const parent = b.parent.getWorldQuaternion(new THREE.Quaternion());
      b.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
      b.updateMatrixWorld(true);
    }
    // Turns bone b by `q`, a rotation given in rig space, about its own pivot.
    function rotateRig(b, q) {
      if (!b) return;
      const qw = rigQuat.clone().multiply(q).multiply(rigQuat.clone().invert());
      const pq = b.parent.getWorldQuaternion(new THREE.Quaternion());
      b.quaternion.copy(pq.clone().invert().multiply(qw).multiply(pq).multiply(b.quaternion));
      b.updateMatrixWorld(true);
    }
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const qFrom = (pitch, yaw, roll) => new THREE.Quaternion().setFromEuler(euler.set(-pitch, yaw, roll, 'YXZ'));

    // Live state: where each hand is heading and where it is, eased; head angles, sprung.
    const hand = {}, pole = {}, via = { L: null, R: null };
    for (const k of ['L', 'R']) { hand[k] = new THREE.Vector3(...POSES.behind[k]); pole[k] = new THREE.Vector3(...POSES.behind['p' + k.toLowerCase()]); }
    const look = { yaw: 0, pitch: 0, roll: 0, vy: 0, vp: 0 };
    let headPitch = 0, headRoll = 0, chestYaw = 0;
    let poseName = 'behind';

    function solveArm(k, mid) {
      const c = arms[k], sx = k === 'L' ? 1 : -1;
      const S = toRig(wpos(c.upper));
      const [a, b] = len[k];
      const T = mid.clone().add(hand[k]);
      const toT = T.clone().sub(S);
      const d = Math.min(Math.max(toT.length(), Math.abs(a - b) + 0.01), (a + b) * 0.998);
      const u = toT.normalize();
      const along = (a * a - b * b + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, a * a - along * along));
      const pl = pole[k].clone();
      pl.sub(u.clone().multiplyScalar(u.dot(pl)));
      if (pl.lengthSq() < 1e-6) pl.set(sx, 0, -1);
      pl.normalize();
      const E = S.clone().add(u.clone().multiplyScalar(along)).add(pl.multiplyScalar(h));
      aim(c.upper, c.upper, c.elbow, dirToWorld(E.clone().sub(S)));
      const Ew = toRig(wpos(c.elbow));
      aim(c.elbow, c.elbow, c.wrist, dirToWorld(S.clone().add(u.clone().multiplyScalar(d)).sub(Ew)));
    }

    // opts: { lookAt: world point or null, glance: {yaw, pitch} or null, pose, speaking, t }
    function update(dt, t, opts) {
      const pose = POSES[opts.pose] || POSES.behind;
      poseName = opts.pose;
      // Put every animated bone back to its rest pose, then build the frame's pose on top.
      for (const [b, q] of rest) b.quaternion.copy(q);
      model.updateMatrixWorld(true);
      rig.getWorldQuaternion(rigQuat);

      // Breathing and a slow weight shift in the chest, and a little twist toward what she looks at.
      const breath = Math.sin(t * 1.7);
      chestYaw += (look.yaw * 0.22 - chestYaw) * Math.min(1, dt * 4);
      rotateRig(chest, qFrom(breath * 0.012 + (opts.speaking ? Math.sin(t * 9) * 0.006 : 0), chestYaw, Math.sin(t * 0.43) * 0.02));

      // Hands ease toward the pose; crossing from behind her back to in front (or back) goes
      // out round her sides instead of through her.
      const k1 = 1 - Math.exp(-dt * 5.5);
      for (const k of ['L', 'R']) {
        const sx = k === 'L' ? 1 : -1;
        const goal = new THREE.Vector3(...pose[k]);
        const crossing = (hand[k].z < -0.02 && goal.z > 0.02) || (hand[k].z > 0.02 && goal.z < -0.02);
        if (crossing && Math.abs(hand[k].x) < 0.17) via[k] = new THREE.Vector3(sx * 0.24, Math.min(hand[k].y, goal.y) - 0.04, 0.0);
        if (via[k] && Math.abs(hand[k].x - via[k].x) < 0.03) via[k] = null;
        const target = via[k] || goal;
        // Talking hands move a little with the words.
        if (opts.speaking && pose.move && (pose.move === k || pose.move === 'B')) target.add(new THREE.Vector3(Math.sin(t * 5.3 + sx) * 0.015, Math.sin(t * 7.1 + sx * 2) * 0.025, Math.sin(t * 4.1) * 0.012));
        if (pose.wave && k === 'R') target.x += Math.sin(t * 7) * 0.07;
        hand[k].lerp(target, k1);
        pole[k].lerp(new THREE.Vector3(...pose['p' + k.toLowerCase()]), k1);
      }
      chest && chest.updateMatrixWorld(true);
      const mid = toRig(wpos(arms.L.upper)).add(toRig(wpos(arms.R.upper))).multiplyScalar(0.5);
      solveArm('L', mid);
      solveArm('R', mid);

      // Head: look at the target (or glance), sprung so it eases in and settles, leading the
      // body. Neck takes 40% of the turn, the head the rest.
      let wantYaw = 0, wantPitch = 0;
      if (opts.lookAt && head) {
        const hp = toRig(wpos(head)), tp = toRig(opts.lookAt.clone());
        const d = tp.sub(hp);
        wantYaw = Math.atan2(d.x, d.z);
        wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      } else if (opts.glance) { wantYaw = opts.glance.yaw; wantPitch = opts.glance.pitch; }
      wantYaw = Math.max(-1.0, Math.min(1.0, wantYaw));
      wantPitch = Math.max(-0.45, Math.min(0.4, wantPitch));
      const K = 26, C = 2 * Math.sqrt(K) * 0.9;
      look.vy += (K * (wantYaw - look.yaw) - C * look.vy) * dt;
      look.vp += (K * (wantPitch - look.pitch) - C * look.vp) * dt;
      look.yaw += look.vy * dt;
      look.pitch += look.vp * dt;
      const k2 = 1 - Math.exp(-dt * 4);
      headPitch += ((pose.headPitch || 0) - headPitch) * k2;
      headRoll += ((pose.headRoll || 0) - headRoll) * k2;
      // Talking: small nods with the words.
      const nod = opts.speaking ? Math.sin(t * 8.3) * 0.025 + Math.sin(t * 3.1) * 0.02 : 0;
      const p = look.pitch + headPitch + nod, y = look.yaw - chestYaw, r = headRoll + Math.sin(t * 0.37) * 0.025;
      rotateRig(neck, qFrom(p * 0.4, y * 0.4, r * 0.4));
      rotateRig(head, qFrom(p * 0.6, y * 0.6, r * 0.6));
    }

    return { update, get pose() { return poseName; } };
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

  return { load, POSES };
})();
