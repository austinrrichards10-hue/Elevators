// HDR render pipeline: scene -> bloom -> tone mapping, grading, vignette and grain.
function createPipeline(renderer, scene, camera) {
  const hdr = { type: THREE.HalfFloatType, depthBuffer: false };
  const main = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const bloomA = new THREE.WebGLRenderTarget(4, 4, hdr);
  const bloomB = new THREE.WebGLRenderTarget(4, 4, hdr);

  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  quadScene.add(quad);

  const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const pass = (fragmentShader, uniforms) => new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false,
  });

  const extract = pass(`
    uniform sampler2D tInput; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tInput, vUv).rgb;
      float b = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * smoothstep(1.05, 1.9, b), 1.0);
    }`, { tInput: { value: null } });

  const blur = pass(`
    uniform sampler2D tInput; uniform vec2 uDir; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tInput, vUv).rgb * 0.227;
      c += (texture2D(tInput, vUv + uDir * 1.385).rgb + texture2D(tInput, vUv - uDir * 1.385).rgb) * 0.316;
      c += (texture2D(tInput, vUv + uDir * 3.231).rgb + texture2D(tInput, vUv - uDir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(c, 1.0);
    }`, { tInput: { value: null }, uDir: { value: new THREE.Vector2() } });

  const composite = pass(`
    uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uTime; varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * 0.75;
      c = aces(c * 0.92);
      // Cool the shadows slightly and lift the contrast.
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c * vec3(0.92, 0.97, 1.1), c, smoothstep(0.0, 0.55, luma));
      c = mix(vec3(luma), c, 0.92);
      vec2 d = vUv - 0.5;
      c *= 1.0 - dot(d, d) * 0.72;
      c = pow(c, vec3(1.0 / 2.2));
      c += (hash(vUv * 917.0 + fract(uTime) * 61.0) - 0.5) * 0.018;
      gl_FragColor = vec4(c, 1.0);
    }`, { tScene: { value: main.texture }, tBloom: { value: bloomA.texture }, uTime: { value: 0 } });

  const drawTo = (material, target) => {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCamera);
  };

  // Lowers internal resolution when the frame rate can't keep up.
  let scale = 1;
  let frames = 0, elapsed = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5) * scale;
    const w = Math.max(2, Math.round(innerWidth * ratio)), h = Math.max(2, Math.round(innerHeight * ratio));
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    main.setSize(w, h);
    bloomA.setSize(w >> 2, h >> 2);
    bloomB.setSize(w >> 2, h >> 2);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  function adapt(dt) {
    frames++;
    elapsed += dt;
    if (elapsed < 2) return;
    const avg = elapsed / frames;
    frames = 0;
    elapsed = 0;
    if (avg > 1 / 36 && scale > 0.5) { scale = Math.max(0.5, scale - 0.15); resize(); }
  }

  function render(dt, time) {
    adapt(dt);
    renderer.setRenderTarget(main);
    renderer.render(scene, camera);

    extract.uniforms.tInput.value = main.texture;
    drawTo(extract, bloomA);
    for (let i = 0; i < 2; i++) {
      blur.uniforms.tInput.value = bloomA.texture;
      blur.uniforms.uDir.value.set(1 / bloomA.width, 0);
      drawTo(blur, bloomB);
      blur.uniforms.tInput.value = bloomB.texture;
      blur.uniforms.uDir.value.set(0, 1 / bloomA.height);
      drawTo(blur, bloomA);
    }
    composite.uniforms.uTime.value = time;
    drawTo(composite, null);
  }

  // Builds every material's shader now, so new things coming into view don't hitch.
  // The HDR target has to be bound: tone mapping and colour space are part of each program.
  function compile() {
    renderer.setRenderTarget(main);
    renderer.compile(scene, camera);
    renderer.setRenderTarget(null);
  }

  return { render, resize, compile };
}
