// The wolf, built from scratch: a deep-chested grey timber wolf with a ruff at its neck, a
// long muzzle, amber eyes, upright ears and a bushy tail, on four jointed legs. It's posed
// by hand-made gaits (a lateral walk, a gallop, a low stalking creep, an idle with breathing
// and glances, and a sit) that blend into one another. They're offered through the same
// little interface as three.js animation actions (play, stop, weights, time scale), so the
// wolves' behaviour code drives them exactly as it would drive animation clips.

/* ---------- Materials ---------- */
let wolfMats = null;
function getWolfMats() {
  if (wolfMats) return wolfMats;
  // Mottled fur: soft blotches of darker and lighter hair over fine, short, crossing strands.
  const fur = (base, streak) => paintCanvas(128, 128, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 128, y = Math.random() * 128, r = 6 + Math.random() * 16;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, Math.random() < 0.5 ? streak : 'rgba(255,255,255,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * 128, y = Math.random() * 128, a = Math.random() * Math.PI, l = 1.5 + Math.random() * 3;
      g.strokeStyle = Math.random() < 0.5 ? 'rgba(20,16,14,0.25)' : 'rgba(255,255,255,0.1)';
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  });
  const coat = fur('#6e6862', 'rgba(30,26,24,0.35)');
  const pale = fur('#b9b2a8', 'rgba(70,64,58,0.25)');
  const dark = fur('#3a3532', 'rgba(10,8,8,0.4)');
  for (const t of [coat, pale, dark]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); }
  wolfMats = {
    coat: new THREE.MeshStandardMaterial({ map: coat, roughness: 1 }),
    pale: new THREE.MeshStandardMaterial({ map: pale, roughness: 1 }),
    dark: new THREE.MeshStandardMaterial({ map: dark, roughness: 1 }),
    nose: new THREE.MeshStandardMaterial({ color: 0x141112, roughness: 0.35 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xd99a2a, emissive: 0x7a4a08, emissiveIntensity: 0.9, roughness: 0.2 }),
    pupil: new THREE.MeshBasicMaterial({ color: 0x050404 }),
    tooth: new THREE.MeshStandardMaterial({ color: 0xeee8d8, roughness: 0.4 }),
  };
  return wolfMats;
}

/* ---------- The body ---------- */
function wolfPart(geo, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// One leg: a pivot at the shoulder or hip, the upper leg, a knee (or hock) and the lower leg
// down to the paw. `back` legs bend the other way at the hock.
function buildWolfLeg(M, x, y, z, back) {
  const hip = new THREE.Group();
  hip.position.set(x, y, z);
  const upperLen = back ? 0.3 : 0.27, lowerLen = back ? 0.27 : 0.28;
  const thigh = wolfPart(new THREE.CylinderGeometry(back ? 0.085 : 0.065, 0.045, upperLen, 8).translate(0, -upperLen / 2, 0), M.coat, 0, 0, 0, hip);
  if (back) thigh.scale.z = 1.5;
  const knee = new THREE.Group();
  knee.position.y = -upperLen;
  hip.add(knee);
  wolfPart(new THREE.CylinderGeometry(0.038, 0.03, lowerLen, 7).translate(0, -lowerLen / 2, 0), back ? M.coat : M.pale, 0, 0, 0, knee);
  const paw = wolfPart(new THREE.SphereGeometry(0.05, 8, 6), M.pale, 0, -lowerLen, 0.03, knee);
  paw.scale.set(1, 0.55, 1.4);
  return { hip, knee, len: upperLen + lowerLen };
}

function buildProceduralWolf() {
  const M = getWolfMats();
  const holder = new THREE.Group();
  const body = new THREE.Group(); // moved as a whole: bob, pitch, sitting down
  holder.add(body);
  const S = 0.55; // spine height
  // Torso: a deep chest tapering to slim hips, a pale underside.
  // A tapered barrel: shaped along its length so the chest is deep and the waist tucks up.
  const barrel = new THREE.SphereGeometry(1, 20, 14);
  const bp = barrel.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const t = (z + 1) / 2; // 0 at the rump, 1 at the chest
    const girth = 0.78 + 0.32 * Math.sin(t * Math.PI * 0.75);
    // The belly line rises towards the hips; the chest drops deep.
    const drop = y < 0 ? (0.6 + 0.5 * t) : 1;
    bp.setXYZ(i, x * 0.19 * girth, y * 0.22 * girth * drop, z * 0.5);
  }
  barrel.computeVertexNormals();
  wolfPart(barrel, M.coat, 0, S, -0.02, body);
  wolfPart(new THREE.SphereGeometry(0.2, 12, 10), M.pale, 0, S - 0.07, 0.26, body).scale.set(0.8, 1, 0.8);
  wolfPart(new THREE.SphereGeometry(0.17, 10, 8), M.coat, 0, S + 0.03, -0.33, body).scale.set(1, 1, 1.1);
  // The ruff: a thick dark collar of fur round the neck and shoulders.
  wolfPart(new THREE.SphereGeometry(0.23, 12, 10), M.coat, 0, S + 0.08, 0.34, body).scale.set(0.95, 1.0, 0.62);
  // Neck and head, on their own joint.
  const neck = new THREE.Group();
  neck.position.set(0, S + 0.12, 0.42);
  body.add(neck);
  wolfPart(new THREE.CylinderGeometry(0.11, 0.15, 0.3, 10).rotateX(-0.9).translate(0, 0.1, 0.1), M.coat, 0, 0, 0, neck);
  const head = new THREE.Group();
  head.position.set(0, 0.2, 0.22);
  neck.add(head);
  wolfPart(new THREE.SphereGeometry(0.13, 12, 10), M.coat, 0, 0, 0, head).scale.set(1, 0.92, 1.12);
  // Cheeks pale, the muzzle long and tapering, a black nose.
  for (const s of [-1, 1]) wolfPart(new THREE.SphereGeometry(0.07, 8, 6), M.pale, s * 0.08, -0.04, 0.05, head);
  const muzzle = wolfPart(new THREE.CylinderGeometry(0.045, 0.075, 0.2, 9).rotateX(Math.PI / 2), M.pale, 0, -0.03, 0.18, head);
  muzzle.scale.set(1, 0.85, 1);
  wolfPart(new THREE.SphereGeometry(0.03, 8, 6), M.nose, 0, -0.005, 0.285, head).scale.set(1.2, 0.85, 1);
  const jaw = wolfPart(new THREE.CylinderGeometry(0.03, 0.05, 0.16, 8).rotateX(Math.PI / 2), M.pale, 0, -0.075, 0.16, head);
  jaw.scale.set(1, 0.6, 1);
  for (const s of [-1, 1]) {
    // Amber eyes under a dark brow.
    wolfPart(new THREE.SphereGeometry(0.022, 8, 6), M.eye, s * 0.062, 0.035, 0.1, head);
    wolfPart(new THREE.SphereGeometry(0.011, 6, 4), M.pupil, s * 0.068, 0.036, 0.117, head);
    wolfPart(new THREE.BoxGeometry(0.06, 0.018, 0.04), M.dark, s * 0.06, 0.06, 0.09, head).rotation.z = s * 0.25;
    // Tall pointed ears.
    const ear = wolfPart(new THREE.ConeGeometry(0.045, 0.12, 4), M.dark, s * 0.07, 0.13, -0.01, head);
    ear.rotation.set(-0.15, 0, -s * 0.25);
    ear.scale.z = 0.5;
  }
  // The tail: three bushy segments, each on a joint, so it can hang, lift and wag.
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, S + 0.06, -0.46);
  body.add(tailRoot);
  let parent = tailRoot;
  const tail = [];
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.z = i ? -0.14 : 0;
    parent.add(seg);
    wolfPart(new THREE.CapsuleGeometry(0.05 + (i === 1 ? 0.02 : 0), 0.1, 3, 8).rotateX(Math.PI / 2).translate(0, 0, -0.07), i === 2 ? M.dark : M.coat, 0, 0, 0, seg);
    tail.push(seg);
    parent = seg;
  }
  const legs = {
    fl: buildWolfLeg(M, 0.1, S - 0.02, 0.3, false), fr: buildWolfLeg(M, -0.1, S - 0.02, 0.3, false),
    bl: buildWolfLeg(M, 0.1, S - 0.02, -0.33, true), br: buildWolfLeg(M, -0.1, S - 0.02, -0.33, true),
  };
  for (const l of Object.values(legs)) body.add(l.hip);
  const rig = { holder, body, neck, head, jaw, tail, legs };
  const { mixer, actions } = wolfMixer(rig);
  return { holder, root: body, mixer, actions };
}

/* ---------- Gaits ---------- */
// Each gait gives the pose at phase `p` (0-1 round the loop): leg swings and knee bends,
// the body's height and pitch, head and tail. Angles are in radians; forward swing positive.
const TAU = Math.PI * 2;
const WOLF_GAITS = {
  // A lateral walk: hind left, fore left, hind right, fore right, a quarter apart.
  walk: {
    duration: 1.0,
    pose(p, o) {
      const leg = (k, off, back) => {
        const a = TAU * (p + off);
        o[k + '1'] = Math.sin(a) * (back ? 0.42 : 0.38);
        // The knee bends to lift the paw while it swings forward.
        o[k + '2'] = Math.max(0, Math.cos(a)) * (back ? -0.7 : 0.75);
      };
      leg('bl', 0, true); leg('fl', 0.25, false); leg('br', 0.5, true); leg('fr', 0.75, false);
      o.y = Math.abs(Math.sin(TAU * p * 2)) * 0.015;
      o.pitch = Math.sin(TAU * p * 2) * 0.02;
      o.headP = 0.12 + Math.sin(TAU * p * 2) * 0.04;
      o.headY = Math.sin(TAU * p) * 0.05;
      o.tailUp = -0.55; o.tailWag = Math.sin(TAU * p) * 0.15;
    },
  },
  // A gallop: the forelegs nearly together, then the hind legs, the spine flexing between.
  run: {
    duration: 0.5,
    pose(p, o) {
      const leg = (k, off, back) => {
        const a = TAU * (p + off);
        o[k + '1'] = Math.sin(a) * (back ? 0.95 : 0.9);
        o[k + '2'] = Math.max(0, Math.cos(a)) * (back ? -1.2 : 1.35);
      };
      leg('fl', 0, false); leg('fr', 0.08, false); leg('bl', 0.5, true); leg('br', 0.58, true);
      o.y = 0.06 + Math.sin(TAU * p) * 0.06;
      o.pitch = Math.sin(TAU * p + 1.2) * 0.12;
      o.headP = 0.3 - Math.sin(TAU * p) * 0.08;
      o.headY = 0;
      o.tailUp = -0.05 + Math.sin(TAU * p) * 0.1; o.tailWag = 0;
    },
  },
  // A stalk: belly low, head down and forward, slow deliberate steps.
  creep: {
    duration: 1.4,
    pose(p, o) {
      const leg = (k, off, back) => {
        const a = TAU * (p + off);
        o[k + '1'] = Math.sin(a) * 0.3 + (back ? 0.35 : -0.25);
        o[k + '2'] = (back ? -0.9 : 0.8) + Math.max(0, Math.cos(a)) * (back ? -0.4 : 0.4);
      };
      leg('bl', 0, true); leg('fl', 0.25, false); leg('br', 0.5, true); leg('fr', 0.75, false);
      o.y = -0.14; o.pitch = 0.04;
      o.headP = 0.55; o.headY = Math.sin(TAU * p) * 0.04;
      o.tailUp = -0.9; o.tailWag = 0;
    },
  },
  // Standing: breathing, looking about now and then, the tail stirring, an ear flick.
  idle: {
    duration: 8,
    pose(p, o) {
      for (const k of ['fl', 'fr', 'bl', 'br']) { o[k + '1'] = 0; o[k + '2'] = 0; }
      o.bl1 = 0.05; o.br1 = -0.03;
      o.y = Math.sin(TAU * p * 6) * 0.006;
      o.pitch = 0;
      const look = Math.sin(TAU * p) * 0.6 + Math.sin(TAU * p * 3 + 1) * 0.15;
      o.headY = look; o.headP = -0.05 + Math.sin(TAU * p * 2) * 0.1;
      o.tailUp = -0.75; o.tailWag = Math.sin(TAU * p * 4) * 0.12;
    },
  },
  // Sitting: haunches down, forelegs straight, chest up, the tail curled on the snow.
  sit: {
    duration: 5,
    pose(p, o) {
      o.fl1 = -0.5; o.fr1 = -0.5; o.fl2 = 0; o.fr2 = 0;
      o.bl1 = 1.35; o.br1 = 1.35; o.bl2 = 2.3; o.br2 = 2.3;
      o.y = -0.06; o.pitch = 0.5;
      o.headP = -0.12 + Math.sin(TAU * p * 2) * 0.05; o.headY = Math.sin(TAU * p) * 0.4;
      o.tailUp = -0.2; o.tailWag = Math.sin(TAU * p * 3) * 0.06;
    },
  },
};

// A stand-in for three.js's animation mixer: actions with time, time scale and weight, and an
// update that blends every running gait's pose and sets the rig from it.
function wolfMixer(rig) {
  const actions = {};
  const POSE_KEYS = ['fl1', 'fl2', 'fr1', 'fr2', 'bl1', 'bl2', 'br1', 'br2', 'y', 'pitch', 'headP', 'headY', 'tailUp', 'tailWag'];
  for (const [name, gait] of Object.entries(WOLF_GAITS)) {
    const clip = { duration: gait.duration, name };
    actions[name] = {
      gait, time: 0, timeScale: 1, weight: 1, running: false,
      reset() { this.time = 0; return this; },
      play() { this.running = true; return this; },
      stop() { this.running = false; return this; },
      isRunning() { return this.running; },
      setEffectiveWeight(w) { this.weight = w; return this; },
      getEffectiveWeight() { return this.running ? this.weight : 0; },
      getClip() { return clip; },
    };
  }
  const pose = {}, blended = {};
  const mixer = {
    clipAction: (name) => actions[name],
    stopAllAction() { for (const a of Object.values(actions)) a.stop(); },
    update(dt) {
      let total = 0;
      for (const k of POSE_KEYS) blended[k] = 0;
      for (const a of Object.values(actions)) {
        if (!a.running || a.weight <= 0) continue;
        a.time = (a.time + dt * a.timeScale) % a.gait.duration;
        if (a.time < 0) a.time += a.gait.duration;
        a.gait.pose(a.time / a.gait.duration, pose);
        for (const k of POSE_KEYS) blended[k] += (pose[k] || 0) * a.weight;
        total += a.weight;
      }
      if (total <= 0) return;
      for (const k of POSE_KEYS) blended[k] /= total;
      const b = blended, L = rig.legs;
      L.fl.hip.rotation.x = -b.fl1; L.fl.knee.rotation.x = b.fl2;
      L.fr.hip.rotation.x = -b.fr1; L.fr.knee.rotation.x = b.fr2;
      L.bl.hip.rotation.x = -b.bl1; L.bl.knee.rotation.x = b.bl2;
      L.br.hip.rotation.x = -b.br1; L.br.knee.rotation.x = b.br2;
      rig.body.position.y = b.y;
      rig.body.rotation.x = -b.pitch;
      // Sitting tips the chest up from the hips, so the rump stays on the snow.
      rig.body.position.z = Math.min(0, b.pitch) * 0.3;
      rig.neck.rotation.x = b.headP * 0.5;
      rig.head.rotation.set(b.headP * 0.5, b.headY, 0);
      rig.tail[0].rotation.x = b.tailUp;
      rig.tail[1].rotation.x = b.tailUp * 0.3 - 0.15;
      rig.tail[2].rotation.x = -0.2;
      for (const seg of rig.tail) seg.rotation.y = b.tailWag;
      // Mouth slightly open when running hard.
      rig.jaw.rotation.x = actions.run.running ? actions.run.weight * 0.25 : 0;
    },
  };
  return { mixer, actions };
}
