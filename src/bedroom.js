// The Pink Bedroom map: a quiet room with no monsters and no weapons.
// "Pink Bedroom (MiSide)" by zHairezt (CC-BY-4.0). See the README for the full credit.
const BEDROOM_Y = 800;
// The model is stored at life size; the room is drawn a little roomier than that.
const BEDROOM_SCALE = 1.25;

function buildBedroom(scene) {
  const file = readGlb(window.BEDROOM_GLB);
  const { json } = file;
  const group = new THREE.Group();
  group.position.y = BEDROOM_Y;
  group.scale.setScalar(BEDROOM_SCALE);
  group.visible = false;

  let floorBox = null;
  json.meshes.forEach((mesh) => {
    for (const primitive of mesh.primitives) {
      const geometry = file.geometry(primitive);
      const def = json.materials[primitive.material];
      const pbr = def.pbrMetallicRoughness;
      const [r, g, b, a] = pbr.baseColorFactor;
      const blend = def.alphaMode === 'BLEND';
      // Pulled down a touch so tone mapping keeps the pinks rich; lamps and the window glow a
      // little, so the bloom picks them up.
      const glow = 0.82 + (def.extras ? def.extras.glow : 0) * 0.6;
      const material = new THREE.MeshBasicMaterial({
        map: pbr.baseColorTexture ? file.texture(pbr.baseColorTexture.index) : null,
        color: new THREE.Color(r * glow, g * glow, b * glow),
        transparent: blend,
        opacity: a,
        depthWrite: !blend,
        alphaTest: def.alphaMode === 'MASK' ? 0.5 : blend ? 0.05 : 0,
        side: THREE.DoubleSide,
        fog: false,
      });
      group.add(new THREE.Mesh(geometry, material));
      if (mesh.name === 'BedroomFloor.001') {
        geometry.computeBoundingBox();
        floorBox = geometry.boundingBox;
      }
    }
  });
  scene.add(group);

  // Walls are the edges of the floor; furniture stands on it as boxes. Tiny things on the
  // floor (shoes, books) are stepped past rather than blocking her.
  const k = BEDROOM_SCALE;
  const wall = { minX: floorBox.min.x * k, maxX: floorBox.max.x * k, minZ: floorBox.min.z * k, maxZ: floorBox.max.z * k };
  const boxes = json.extras.colliders
    .filter(([x0, z0, x1, z1, top]) => top * k > 0.22 && (x1 - x0) * (z1 - z0) * k * k > 0.02)
    .map(([x0, z0, x1, z1]) => ({ x0: x0 * k, z0: z0 * k, x1: x1 * k, z1: z1 * k }));

  return {
    group,
    floorY: BEDROOM_Y,
    spawn: new THREE.Vector3(-0.75 * k, BEDROOM_Y, 1.15 * k),
    setActive(active) { group.visible = active; },
    pushOut(pos, radius) {
      for (const b of boxes) {
        const nx = clamp(pos.x, b.x0, b.x1), nz = clamp(pos.z, b.z0, b.z1);
        const dx = pos.x - nx, dz = pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x = nx + (dx / d) * radius;
          pos.z = nz + (dz / d) * radius;
        } else {
          // Inside the box: leave by the nearest side.
          const exits = [[b.x0 - radius - pos.x, 0], [b.x1 + radius - pos.x, 0], [0, b.z0 - radius - pos.z], [0, b.z1 + radius - pos.z]];
          exits.sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1]));
          pos.x += exits[0][0];
          pos.z += exits[0][1];
        }
      }
      pos.x = clamp(pos.x, wall.minX + radius, wall.maxX - radius);
      pos.z = clamp(pos.z, wall.minZ + radius, wall.maxZ - radius);
    },
    // Keeps the camera inside the room, under the ceiling.
    clampCamera(pos) {
      pos.x = clamp(pos.x, wall.minX + 0.12, wall.maxX - 0.12);
      pos.z = clamp(pos.z, wall.minZ + 0.12, wall.maxZ - 0.12);
      pos.y = clamp(pos.y, BEDROOM_Y + 0.2, BEDROOM_Y + 2.55 * k);
    },
  };
}
