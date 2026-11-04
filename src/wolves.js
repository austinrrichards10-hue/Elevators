// Wolves that roam the forest around the player. They wander in small packs, rest, sit and
// howl, watch her warily when she comes close and bolt if she gets too near. Rarely, one
// charges and bites. Now and then one runs down a hare. Arrows and the axe wound them and
// send them running; two or three good hits bring one down, and she can skin it.
// The wolf itself is built in code (wolfmodel.js).

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
  count: 9, // how many roam around her at once
  spawnMin: 40, spawnMax: 80, despawn: 150,
  walk: 1.3, run: 7, creep: 0.8,
  watch: 22, // closer than this, they stop and watch her
  flee: 9, // closer than this, they run
  length: 1.5, // nose to tail, in metres
  charge: 8, // running speed when it attacks
  bite: 18, // health lost to a bite
  attackChance: 0.12, // how often a wolf that starts watching her charges instead
  attackCooldown: [70, 150], // seconds before any wolf may attack again
  health: 100,
  arrowDamage: [40, 70], // from the lightest draw that fires to a full one
  limp: 0.4, // how fast a wounded wolf can go, against a sound one
  headshot: 1.6, // an arrow to the head does this much more
  axeDamage: 40,
  cornered: 0.3, // chance a badly hurt wolf turns on her instead of running
  remains: 90, // seconds a dead wolf lies in the snow before it's cleared away
  hunt: 0.3, // chance a wandering wolf that notices a hare goes after it
};

// How far each animation carries the wolf in one loop of it, in metres, to keep its paws
// planted: the walk and run are played faster or slower to match how fast it is going.
const WOLF_STRIDE = { walk: 1.0, run: 2.4, creep: 0.5 };
const sdProbe = new THREE.Vector3();

// Where a wolf can be struck, in its own frame (+Z forward, metres): the body is a capsule
// from rump to shoulders, the head a ball out in front.
const WOLF_BODY = { rump: -0.45, shoulders: 0.45, y: 0.5, r: 0.27, head: { z: 0.72, y: 0.7, r: 0.22 } };

class Wolf {
  constructor(x, z) {
    // Its body and its gaits (wolfmodel.js), driven like animation clips.
    const model = buildProceduralWolf();
    this.holder = model.holder;
    this.mixer = model.mixer;
    this.actions = model.actions;
    this.pos = new THREE.Vector3(x, groundHeight(x, z), z);
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.state = 'idle';
    this.timer = 1 + Math.random() * 3;
    this.target = new THREE.Vector3();
    this.anim = null;
    this.health = WOLF.health;
    this.dead = null; // { t, roll, slide, landed, skinned, bury } once it's been killed
    this.prey = null; // the hare it's running down
    this.huntCheck = 4 + Math.random() * 8;
    this.arrows = []; // arrows it's carrying
    this.play('idle');
    this.mixer.update(Math.random() * 3);
    scene.add(this.holder);
  }

  // Blends to another animation. Everything else fades out together, so however fast it
  // changes its mind the weights never add up to more than one whole wolf.
  play(name) {
    if (this.anim === name) return;
    if (!this.weights) this.weights = {};
    const next = this.actions[name];
    if (!(this.weights[name] > 0)) { next.reset().play(); this.weights[name] = this.anim ? 0 : 1; }
    this.anim = name;
  }

  // Each frame: the current animation's share rises, the others' fall, always summing to one.
  blend(dt) {
    const k = 1 - Math.exp(-dt / 0.12);
    let sum = 0;
    for (const key in this.weights) {
      this.weights[key] += ((key === this.anim ? 1 : 0) - this.weights[key]) * k;
      if (key !== this.anim && this.weights[key] < 0.01) { this.weights[key] = 0; this.actions[key].stop(); delete this.weights[key]; continue; }
      sum += this.weights[key];
    }
    for (const key in this.weights) this.actions[key].setEffectiveWeight(this.weights[key] / sum);
  }

  setState(state, timer) {
    this.state = state;
    this.timer = timer;
    if (state === 'wander') {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 25;
      this.target.set(this.pos.x + Math.cos(a) * d, 0, this.pos.z + Math.sin(a) * d);
    }
    if (state !== 'hunt') this.prey = null;
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
      if (wolfAttack.cooldown <= 0 && !wolves.some((w) => w.state === 'attack') && Math.random() < WOLF.attackChance * (dayNight.isNight() ? 2.5 : 1)) this.charge();
      else this.setState('watch', 3 + Math.random() * 4);
    } else if (this.state === 'wander' && (this.huntCheck -= dt) <= 0) {
      // A hare in the open catches its eye now and then, and it gives chase.
      this.huntCheck = 6 + Math.random() * 8;
      const prey = Math.random() < WOLF.hunt ? rabbitPrey(this.pos, 30) : null;
      if (prey) { this.setState('hunt', 6 + Math.random() * 3); this.prey = prey; }
    }
    if (this.timer <= 0 && this.state !== 'attack') {
      if (this.state === 'flee' || this.state === 'watch') this.setState('wander', 8 + Math.random() * 6);
      else if (this.state === 'wander') this.setState(Math.random() < 0.35 ? 'sit' : 'idle', 3 + Math.random() * 7);
      else this.setState('wander', 8 + Math.random() * 8);
    }

    let want = this.heading, speed = 0, anim = 'idle';
    // Wounded, it can only limp.
    const lame = this.wounded ? WOLF.limp : 1;
    if (this.state === 'flee') {
      want = toPlayer + Math.PI;
      speed = WOLF.run * lame;
      anim = 'run';
    } else if (this.state === 'attack') {
      want = toPlayer;
      speed = WOLF.charge * lame;
      anim = 'run';
    } else if (this.state === 'hunt') {
      const prey = this.prey;
      if (!prey || !rabbitCatchable(prey)) {
        this.setState('wander', 6 + Math.random() * 6);
      } else {
        const px = prey.pos.x - this.pos.x, pz = prey.pos.z - this.pos.z;
        want = Math.atan2(px, pz);
        // A short all-out sprint: faster than its usual run, and about as fast as a hare.
        speed = WOLF.run * 1.3;
        anim = 'run';
        if (Math.hypot(px, pz) < 1.2) {
          rabbitCaught(prey, this);
          this.setState('feed', 7 + Math.random() * 6);
        }
      }
    } else if (this.state === 'feed') {
      // Crouched over what it caught.
      anim = 'creep';
    } else if (this.state === 'watch') {
      want = toPlayer;
      // If she's a little close it turns and slinks off a few paces (never backwards), then
      // turns round again to hold still and stare.
      if (dist < 14) { want = toPlayer + Math.PI; speed = WOLF.walk; anim = 'walk'; }
    } else if (this.state === 'wander') {
      want = Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z);
      speed = WOLF.walk;
      anim = 'walk';
      if (Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) < 1.5) this.timer = 0;
    } else if (this.state === 'sit') {
      anim = 'sit';
    }
    const fast = this.state === 'flee' || this.state === 'attack' || this.state === 'hunt';
    // A tree or rock in the way: swing round it, committing to one side for a moment, rather
    // than grinding into it.
    if (speed > 0.5) {
      this.avoidT = Math.max(0, (this.avoidT || 0) - dt);
      const look = 1.2 + speed * 0.18;
      sdProbe.set(this.pos.x + Math.sin(this.heading) * look, 0, this.pos.z + Math.cos(this.heading) * look);
      const bx = sdProbe.x, bz = sdProbe.z;
      pushOutOfColliders(sdProbe, 0.55);
      if (Math.hypot(sdProbe.x - bx, sdProbe.z - bz) > 0.02) {
        // Turn the way the obstacle pushed the probe.
        const side = Math.sign(Math.cos(this.heading) * (sdProbe.x - bx) - Math.sin(this.heading) * (sdProbe.z - bz)) || 1;
        this.avoidSide = this.avoidT > 0 ? this.avoidSide : side;
        this.avoidT = 0.6;
      }
      if (this.avoidT > 0) want = this.heading + this.avoidSide * 1.1;
    }
    // Turning at a limited rate, so a running wolf carves an arc instead of spinning on the
    // spot, and slows into a tight turn.
    const turn = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
    const rate = fast ? 3.4 : 2.2;
    const step = clamp(turn * (1 - Math.exp(-6 * dt)), -rate * dt, rate * dt);
    this.heading += step;
    speed *= 1 - 0.55 * Math.min(1, Math.abs(turn) / 1.6);
    this.speed += (speed - this.speed) * (1 - Math.exp(-(speed > this.speed ? 3 : 5) * dt));
    this.turnRate = step / Math.max(dt, 1e-4);
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    pushOutOfColliders(this.pos, 0.45);
    // Keep them inside the world, turning back from the edge.
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > WORLD_RADIUS - 5) { this.pos.x *= (WORLD_RADIUS - 5) / r; this.pos.z *= (WORLD_RADIUS - 5) / r; this.target.set(0, 0, 0); }
    this.pos.y = groundHeight(this.pos.x, this.pos.z);

    // Slowing to a stop, a running wolf drops to a walk before it stands, rather than
    // galloping on the spot.
    if (anim === 'idle' && this.speed > 0.6) anim = 'walk';
    if (anim === 'run' && this.speed < WOLF.walk * 1.6) anim = 'walk';
    this.play(anim);
    // Its legs keep pace with the ground: each animation plays as fast as its stride needs
    // for the speed it's actually going, so its paws don't skate across the snow.
    const pace = (name) => Math.abs(this.speed) * this.actions[name].getClip().duration / WOLF_STRIDE[name];
    this.actions.walk.timeScale = clamp(pace('walk'), 0.5, 2.4);
    this.actions.run.timeScale = clamp(pace('run'), 0.8, 2.4);
    this.actions.creep.timeScale = this.state === 'feed' ? 0.12 : clamp(pace('creep'), 0.4, 2);
    this.blend(dt);
    this.mixer.update(dt);
    // Its body follows the slope it's on, nose up a rise and down a dip, standing on the
    // snow under both its fore and hind paws; and it leans into its turns when it's running.
    const fx = Math.sin(this.heading) * 0.6, fz = Math.cos(this.heading) * 0.6;
    const front = groundHeight(this.pos.x + fx, this.pos.z + fz), back = groundHeight(this.pos.x - fx, this.pos.z - fz);
    const pitch = -Math.atan2(front - back, 1.2);
    const bank = clamp(-this.turnRate * this.speed * 0.035, -0.3, 0.3);
    this.pitch = lerp(this.pitch || 0, pitch, 1 - Math.exp(-10 * dt));
    this.bank = lerp(this.bank || 0, bank, 1 - Math.exp(-6 * dt));
    this.holder.position.copy(this.pos);
    this.holder.position.y = Math.min(front, back) + Math.abs(front - back) * 0.35;
    this.holder.rotation.order = 'YXZ';
    this.holder.rotation.set(this.pitch, this.heading, this.bank);
    // A wounded wolf favours one leg: a dip and a lurch with every other stride.
    if (this.wounded && Math.abs(this.speed) > 0.3) {
      this.limpT = (this.limpT || 0) + dt * Math.abs(this.speed) * 1.6;
      this.holder.position.y -= Math.max(0, Math.sin(this.limpT)) * 0.08;
      this.holder.rotation.z += Math.sin(this.limpT) * 0.08;
    }
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

  // Startled without being hurt: a yelp, and it bolts.
  scare() {
    Sfx.wolfYelp(1);
    this.setState('flee', 6 + Math.random() * 3);
  }

  // Wounded by `by` ('arrow', 'axe' or 'katana'). It yelps and runs, and the pack scatters
  // with it; badly hurt and cornered, it may turn on her instead. Returns true if it died.
  hurt(amount, by) {
    if (this.dead) return false;
    this.health -= amount;
    if (this.health <= 0) { this.die(by); return true; }
    this.wounded = true;
    const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    if (this.health < WOLF.health * 0.5 && dist < 14 && this.state !== 'attack' && !wolves.some((w) => w.state === 'attack') && Math.random() < WOLF.cornered) {
      Sfx.wolfYelp(1);
      this.charge();
    } else {
      this.scare();
    }
    for (const wolf of wolves) {
      if (wolf !== this && wolf.state !== 'attack' && wolf.state !== 'flee' && Math.hypot(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z) < 25) wolf.setState('flee', 4 + Math.random() * 3);
    }
    return false;
  }

  // Brought down: it cries out, stumbles on a little through the snow and tips onto its
  // side. `push` is an extra shove along the ground, from a blow.
  die(by, push) {
    if (this.dead) return;
    const forward = this.speed * 0.7;
    this.dead = {
      t: 0,
      roll: (Math.random() < 0.5 ? -1 : 1) * 1.42,
      slide: new THREE.Vector3(Math.sin(this.heading) * forward, 0, Math.cos(this.heading) * forward),
      skinned: false,
      landed: false,
      bury: null, // seconds since she started heaping snow over it
    };
    if (push) this.dead.slide.add(push);
    this.health = 0;
    this.state = 'dead';
    this.prey = null;
    const i = wolves.indexOf(this);
    if (i >= 0) wolves.splice(i, 1);
    wolfRemains.push(this);
    const d = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    Sfx.wolfDeath(Math.max(0.2, 1 - d / 80));
    const centre = this.bodyCentre(new THREE.Vector3());
    burst(centre.setY(this.pos.y + 0.4), 0xf2f5ff, 14, 2.4);
    burst(centre, 0x8a7f74, 6, 1.4);
    this.skinEntry = addInteractable({
      x: this.pos.x, z: this.pos.z, r: 2.2,
      label: 'Press E to skin the wolf',
      active: () => this.dead && this.dead.landed && !this.dead.skinned,
      use: () => this.skin(),
    });
    emitGame('creatureKilled', 'wolf', by);
  }

  // Which part of it a point is inside: 'head', 'body' or null. Only a standing wolf.
  struck(p) {
    const b = WOLF_BODY, s = Math.sin(this.heading), c = Math.cos(this.heading);
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dy = p.y - this.pos.y;
    const along = dx * s + dz * c, side = dx * c - dz * s;
    if (Math.hypot(along - b.head.z, dy - b.head.y, side) < b.head.r) return 'head';
    const t = clamp(along, b.rump, b.shoulders);
    if (Math.hypot(along - t, dy - b.y, side) < b.r) return 'body';
    return null;
  }

  // How far (x, z) is from its body along the ground, from rump to nose.
  distanceTo(x, z) {
    const b = WOLF_BODY, s = Math.sin(this.heading), c = Math.cos(this.heading);
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const along = dx * s + dz * c, side = dx * c - dz * s;
    return Math.hypot(along - clamp(along, b.rump, b.head.z), side) - b.r;
  }

  // Where the middle of its body is, standing or lying on its side.
  bodyCentre(out) {
    const roll = this.dead ? this.dead.roll * smooth(this.dead.t / 0.65) : 0;
    const side = -Math.sin(roll) * WOLF_BODY.y;
    return out.set(this.pos.x + Math.cos(this.heading) * side, this.pos.y + Math.cos(roll) * WOLF_BODY.y, this.pos.z - Math.sin(this.heading) * side);
  }

  // A dead wolf: the legs slow and stop, it tips over, and after a while it's cleared away.
  // A skinned one is covered over with snow.
  updateDead(dt) {
    const d = this.dead;
    d.t += dt;
    if (d.slide.lengthSq() > 1e-4) {
      this.pos.addScaledVector(d.slide, dt);
      d.slide.multiplyScalar(Math.exp(-3.5 * dt));
      pushOutOfColliders(this.pos, 0.45);
      this.pos.y = groundHeight(this.pos.x, this.pos.z);
    }
    const u = smooth(d.t / 0.65);
    if (d.t < 0.8) {
      this.actions[this.anim].timeScale = 1 - u;
      this.mixer.update(dt);
    }
    if (!d.landed && u >= 1) {
      d.landed = true;
      const at = this.bodyCentre(new THREE.Vector3());
      at.y = this.pos.y + 0.15;
      burst(at, 0xf2f5ff, 18, 2.6);
      if (Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z) < 40) Sfx.thud();
    }
    if (d.bury !== null) {
      d.bury += dt;
      if (d.bury > 1.2 && d.bury < 3.2 && Math.random() < dt * 8) burst(this.bodyCentre(wolfTmp), 0xf2f5ff, 4, 1.4);
    }
    // A small bounce as it lands, then it lies still.
    const settle = d.landed ? Math.sin(Math.min(1, (d.t - 0.65) / 0.35) * Math.PI) * 0.06 * (1 - Math.min(1, (d.t - 0.65) / 0.35)) : 0;
    const roll = d.roll * u - Math.sign(d.roll) * settle;
    this.holder.position.copy(this.pos);
    this.holder.position.y += 0.15 * Math.abs(Math.sin(roll)) - (d.bury === null ? 0 : smooth((d.bury - 1.2) / 2.2) * 0.8);
    this.holder.rotation.set(0, this.heading, roll);
    if (this.skinEntry) {
      const centre = this.bodyCentre(wolfTmp);
      this.skinEntry.x = centre.x;
      this.skinEntry.z = centre.z;
    }
  }

  // She takes the pelt and the meat, and heaps snow over what's left.
  skin() {
    if (!this.dead || this.dead.skinned) return;
    this.dead.skinned = true;
    packAdd('wolfpelt', 1, { quiet: true });
    packAdd('wolf_raw', 1, { quiet: true });
    Sfx.skinning();
    const at = this.bodyCentre(new THREE.Vector3());
    burst(at, 0x8a7f74, 10, 1.6);
    this.bury();
  }

  // Whether it's done lying in the snow. A skinned wolf goes once it's buried. Any other
  // is cleared away after a minute and a half, the moment she's far off or looking
  // elsewhere; if she stands watching it for much longer, the snow buries it too.
  spent() {
    const d = this.dead;
    if (d.bury !== null) return d.bury > 3.4;
    if (d.t < WOLF.remains) return false;
    const toX = this.pos.x - camera.position.x, toZ = this.pos.z - camera.position.z;
    const dist = Math.hypot(toX, toZ);
    if (dist > 30) return true;
    camera.getWorldDirection(wolfTmp);
    if ((toX * wolfTmp.x + toZ * wolfTmp.z) / Math.max(0.01, dist) < 0.3) return true;
    if (d.t > WOLF.remains * 2) this.bury();
    return false;
  }

  // Snow heaped over it: it settles out of sight in a few puffs.
  bury() {
    if (this.dead.bury === null) this.dead.bury = 0;
    if (this.skinEntry) { removeInteractable(this.skinEntry); this.skinEntry = null; }
  }

  dispose() {
    scene.remove(this.holder);
    this.holder.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
    this.mixer.stopAllAction();
    if (this.skinEntry) { removeInteractable(this.skinEntry); this.skinEntry = null; }
  }
}
const wolfTmp = new THREE.Vector3();

Object.assign(Sfx, {
  // A wolf's last cry: a yelp that breaks and falls away into a whimper.
  wolfDeath(level = 1) {
    this.glide([[0, 820], [0.08, 1240], [0.3, 640], [0.75, 420], [1.1, 360]], 0.075 * level, 'triangle', 22);
    this.burst(0.35, 600, 0.8, 0.22 * level);
  },
  // A knife working through hide, in two long strokes.
  skinning() {
    this.burst(0.32, 2400, 2.2, 0.1, 'bandpass');
    setTimeout(() => this.burst(0.26, 1700, 2.2, 0.09, 'bandpass'), 260);
  },
  // An arrow thumping into fur and muscle rather than wood.
  arrowFlesh() { this.burst(0.07, 480, 1.1, 0.34); this.tone(130, 70, 0.07, 0.18, 'triangle'); },
});

/* ---------- The packs ---------- */
const wolves = [];
// The dead, lying where they fell until they're skinned or cleared away.
const wolfRemains = [];
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
  for (const wolf of [...wolfRemains]) {
    wolf.updateDead(dt);
    if (wolf.spent() || Math.hypot(wolf.pos.x - player.pos.x, wolf.pos.z - player.pos.z) > WOLF.despawn) {
      wolf.dispose();
      wolfRemains.splice(wolfRemains.indexOf(wolf), 1);
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

// The living wolves go; the dead stay where they lie, so waking by a fire after a death
// doesn't take away a wolf she brought down.
function clearWolves() {
  for (const wolf of wolves) wolf.dispose();
  wolves.length = 0;
  howlTimer = 20;
  wolfAttack.cooldown = 40;
}

// For a fresh run.
function clearWolfRemains() {
  for (const wolf of wolfRemains) wolf.dispose();
  wolfRemains.length = 0;
}

// An item's name for a toast, with a fallback while the item list isn't loaded.
function creatureItemName(id, fallback) {
  return ITEMS[id] ? itemName(id, 1).toLowerCase() : fallback;
}
