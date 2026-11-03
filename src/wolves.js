// Wolves that roam the forest around the player. They wander in small packs, rest, sit and
// howl, watch her warily when she comes close and bolt if she gets too near. Rarely, one
// charges and bites; an arrow or an axe blow sends it running.
// "Wolf with Animations" by 3DHaupt (CC BY-NC-SA 4.0); see the README.

/* ---------- Loading an animated model ---------- */
// Builds a fresh copy of a glTF node tree each call, with skinned meshes and animation
// clips. Geometry, materials and clips are shared between copies. Nodes are named by their
// index, so one set of clips drives every copy.
function animatedModel(file, materialFor) {
  const { json } = file;
  if (!file.shared) {
    const geometries = new Map();
    file.shared = {
      geometry(meshIndex, p) {
        const key = `${meshIndex}/${p}`;
        if (!geometries.has(key)) geometries.set(key, file.geometry(json.meshes[meshIndex].primitives[p]));
        return geometries.get(key);
      },
      clips: Object.fromEntries((json.animations || []).map((anim) => [anim.name, new THREE.AnimationClip(anim.name, -1, anim.channels.map((channel) => {
        const sampler = anim.samplers[channel.sampler];
        const times = file.accessor(sampler.input).array, values = file.accessor(sampler.output).array;
        const name = `n${channel.target.node}`;
        if (channel.target.path === 'rotation') return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
        return new THREE.VectorKeyframeTrack(`${name}.${channel.target.path === 'translation' ? 'position' : 'scale'}`, times, values);
      }))])),
      joints: new Set((json.skins || []).flatMap((skin) => skin.joints)),
    };
  }
  const { shared } = file;
  const objects = json.nodes.map((node, i) => {
    const obj = shared.joints.has(i) ? new THREE.Bone() : new THREE.Object3D();
    obj.name = `n${i}`;
    if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(obj.position, obj.quaternion, obj.scale);
    if (node.translation) obj.position.fromArray(node.translation);
    if (node.rotation) obj.quaternion.fromArray(node.rotation);
    if (node.scale) obj.scale.fromArray(node.scale);
    return obj;
  });
  json.nodes.forEach((node, i) => (node.children || []).forEach((child) => objects[i].add(objects[child])));
  const root = new THREE.Group();
  for (const i of json.scenes[json.scene || 0].nodes) root.add(objects[i]);
  root.updateMatrixWorld(true);

  json.nodes.forEach((node, i) => {
    if (node.mesh === undefined) return;
    json.meshes[node.mesh].primitives.forEach((primitive, p) => {
      const material = materialFor(node.mesh, json.meshes[node.mesh].name);
      if (!material) return;
      const geometry = shared.geometry(node.mesh, p);
      let mesh;
      if (node.skin !== undefined) {
        const skin = json.skins[node.skin];
        const inverses = file.accessor(skin.inverseBindMatrices).array;
        const bones = skin.joints.map((j) => objects[j]);
        mesh = new THREE.SkinnedMesh(geometry, material);
        objects[i].add(mesh);
        mesh.updateMatrixWorld(true);
        mesh.bind(new THREE.Skeleton(bones, bones.map((_, k) => new THREE.Matrix4().fromArray(inverses, k * 16))), mesh.matrixWorld);
      } else {
        mesh = new THREE.Mesh(geometry, material);
        objects[i].add(mesh);
      }
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    });
  });
  return { root, clips: shared.clips };
}

/* ---------- The wolf ---------- */
const WOLF = {
  count: 6, // how many roam around her at once
  spawnMin: 55, spawnMax: 95, despawn: 150,
  walk: 1.5, run: 8.5, creep: 0.8,
  watch: 22, // closer than this, they stop and watch her
  flee: 9, // closer than this, they run
  length: 1.5, // nose to tail, in metres
  charge: 9.5, // running speed when it attacks
  bite: 18, // health lost to a bite
  attackChance: 0.12, // how often a wolf that starts watching her charges instead
  attackCooldown: [70, 150], // seconds before any wolf may attack again
};

let wolfFile = null;
let wolfMaterials = null;
// The model's own size and facing, measured once so every wolf can be fitted to WOLF.length.
let wolfFit = null;

function wolfMaterial(meshIndex, name) {
  if (!wolfMaterials) {
    const tex = (i) => wolfFile.texture(i);
    wolfMaterials = {
      fur: new THREE.MeshStandardMaterial({ map: tex(0), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1, color: 0xd8d8d8 }),
      body: new THREE.MeshStandardMaterial({ map: tex(3), roughness: 0.95, color: 0xd0d0d0 }),
      eyes: new THREE.MeshStandardMaterial({ map: tex(6), emissive: 0x6a5a20, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x24201e, roughness: 0.7 }),
    };
  }
  if (/^Plane/.test(name)) return null; // a ground plane in the file, not part of the wolf
  if (/fur/.test(name)) return wolfMaterials.fur;
  if (/eyes/.test(name)) return wolfMaterials.eyes;
  if (/Wolf1/.test(name)) return wolfMaterials.body;
  return wolfMaterials.dark;
}

function buildWolfModel() {
  if (!wolfFile) wolfFile = readGlb(WOLF_GLB);
  const model = animatedModel(wolfFile, wolfMaterial);
  if (!wolfFit) {
    const box = new THREE.Box3().setFromObject(model.root, true);
    const size = box.getSize(new THREE.Vector3());
    wolfFit = { scale: WOLF.length / size.z, lift: -box.min.y };
  }
  const holder = new THREE.Group();
  model.root.scale.setScalar(wolfFit.scale);
  model.root.position.y = wolfFit.lift * wolfFit.scale;
  model.root.rotation.y = WOLF_TURN;
  holder.add(model.root);
  return { holder, root: model.root, clips: model.clips };
}
// The model faces -Z; this turns its nose to +Z, the game's forward.
const WOLF_TURN = Math.PI;

class Wolf {
  constructor(x, z) {
    const model = buildWolfModel();
    this.holder = model.holder;
    this.mixer = new THREE.AnimationMixer(model.root);
    this.actions = {};
    for (const [key, clip] of Object.entries({ run: '01_Run', walk: '02_walk', creep: '03_creep', idle: '04_Idle', sit: '05_site' })) {
      this.actions[key] = this.mixer.clipAction(model.clips[clip]);
    }
    this.pos = new THREE.Vector3(x, groundHeight(x, z), z);
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.state = 'idle';
    this.timer = 1 + Math.random() * 3;
    this.target = new THREE.Vector3();
    this.anim = null;
    this.play('idle');
    this.mixer.update(Math.random() * 3);
    scene.add(this.holder);
  }

  play(name) {
    if (this.anim === name) return;
    const next = this.actions[name];
    next.reset().play();
    if (this.anim) this.actions[this.anim].crossFadeTo(next, 0.35, false);
    this.anim = name;
  }

  setState(state, timer) {
    this.state = state;
    this.timer = timer;
    if (state === 'wander') {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 25;
      this.target.set(this.pos.x + Math.cos(a) * d, 0, this.pos.z + Math.sin(a) * d);
    }
  }

  update(dt) {
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    this.timer -= dt;

    // Too close: bolt away from her. Close: stop and watch, creeping round at a distance.
    // Once in a long while a watching wolf charges instead; see wolfAttack.
    if (this.state === 'attack') {
      if (dist < 1.5) this.bite();
      else if (this.timer <= 0) this.setState('flee', 4 + Math.random() * 2);
    } else if (dist < WOLF.flee && this.state !== 'flee') {
      this.setState('flee', 4 + Math.random() * 3);
      if (dist < 60) Sfx.wolfYelp(1 - dist / 60);
    } else if (dist < WOLF.watch && (this.state === 'wander' || this.state === 'idle' || this.state === 'sit')) {
      if (wolfAttack.cooldown <= 0 && !wolves.some((w) => w.state === 'attack') && Math.random() < WOLF.attackChance) this.charge();
      else this.setState('watch', 3 + Math.random() * 4);
    }
    if (this.timer <= 0 && this.state !== 'attack') {
      if (this.state === 'flee' || this.state === 'watch') this.setState('wander', 8 + Math.random() * 6);
      else if (this.state === 'wander') this.setState(Math.random() < 0.35 ? 'sit' : 'idle', 3 + Math.random() * 7);
      else this.setState('wander', 8 + Math.random() * 8);
    }

    let want = this.heading, speed = 0, anim = 'idle';
    if (this.state === 'flee') {
      want = toPlayer + Math.PI;
      speed = WOLF.run;
      anim = 'run';
    } else if (this.state === 'attack') {
      want = toPlayer;
      speed = WOLF.charge;
      anim = 'run';
    } else if (this.state === 'watch') {
      want = toPlayer;
      // Edge away if she's a little close, otherwise hold still and stare.
      if (dist < 14) { speed = -WOLF.creep; anim = 'creep'; }
    } else if (this.state === 'wander') {
      want = Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z);
      speed = WOLF.walk;
      anim = 'walk';
      if (Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) < 1.5) this.timer = 0;
    } else if (this.state === 'sit') {
      anim = 'sit';
    }
    const turn = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
    this.heading += turn * (1 - Math.exp(-(this.state === 'flee' || this.state === 'attack' ? 6 : 3) * dt));
    this.speed += (speed - this.speed) * (1 - Math.exp(-5 * dt));
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    pushOutOfColliders(this.pos, 0.45);
    // Keep them inside the world, turning back from the edge.
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > WORLD_RADIUS - 5) { this.pos.x *= (WORLD_RADIUS - 5) / r; this.pos.z *= (WORLD_RADIUS - 5) / r; this.target.set(0, 0, 0); }
    this.pos.y = groundHeight(this.pos.x, this.pos.z);

    this.play(anim);
    if (anim === 'walk') this.actions.walk.timeScale = Math.max(0.4, Math.abs(this.speed) / WOLF.walk);
    if (anim === 'creep') this.actions.creep.timeScale = Math.max(0.4, Math.abs(this.speed) / WOLF.creep);
    this.mixer.update(dt);
    this.holder.position.copy(this.pos);
    this.holder.rotation.y = this.heading;
  }

  // Charges at her with a growl, which gives her a moment to dodge or strike first.
  charge() {
    this.setState('attack', 9);
    wolfAttack.cooldown = WOLF.attackCooldown[0] + Math.random() * (WOLF.attackCooldown[1] - WOLF.attackCooldown[0]);
    Sfx.growl();
  }

  // One bite, unless she's mid-dodge, then it breaks off and runs.
  bite() {
    const dodging = player.dodge && player.dodge.t < 0.44;
    if (!dodging) hurtPlayer(WOLF.bite, 'wolf');
    this.setState('flee', 5 + Math.random() * 3);
  }

  // Struck by an arrow or the axe: a yelp, and it bolts.
  scare() {
    Sfx.wolfYelp(1);
    this.setState('flee', 6 + Math.random() * 3);
  }

  dispose() {
    scene.remove(this.holder);
    this.mixer.stopAllAction();
  }
}

/* ---------- The packs ---------- */
const wolves = [];
let howlTimer = 20;
// Attacks are rare: after one, no wolf charges again for a minute or two.
const wolfAttack = { cooldown: 40 };

function spawnPack() {
  const a = Math.random() * Math.PI * 2, d = WOLF.spawnMin + Math.random() * (WOLF.spawnMax - WOLF.spawnMin);
  const cx = player.pos.x + Math.cos(a) * d, cz = player.pos.z + Math.sin(a) * d;
  if (Math.hypot(cx, cz) > WORLD_RADIUS - 20) return;
  const size = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < size && wolves.length < WOLF.count; i++) {
    wolves.push(new Wolf(cx + (Math.random() - 0.5) * 8, cz + (Math.random() - 0.5) * 8));
  }
}

function updateWolves(dt) {
  wolfAttack.cooldown -= dt;
  for (const wolf of [...wolves]) {
    if (Math.hypot(wolf.pos.x - player.pos.x, wolf.pos.z - player.pos.z) > WOLF.despawn) {
      wolf.dispose();
      wolves.splice(wolves.indexOf(wolf), 1);
    } else {
      wolf.update(dt);
    }
  }
  if (wolves.length < WOLF.count - 1) spawnPack();
  // Now and then one howls, and the sound carries.
  howlTimer -= dt;
  if (howlTimer <= 0 && wolves.length) {
    howlTimer = 25 + Math.random() * 35;
    const wolf = wolves[Math.floor(Math.random() * wolves.length)];
    const d = Math.hypot(wolf.pos.x - player.pos.x, wolf.pos.z - player.pos.z);
    Sfx.howl(Math.max(0.15, 1 - d / 160));
  }
}

function clearWolves() {
  for (const wolf of wolves) wolf.dispose();
  wolves.length = 0;
  howlTimer = 20;
  wolfAttack.cooldown = 40;
}
