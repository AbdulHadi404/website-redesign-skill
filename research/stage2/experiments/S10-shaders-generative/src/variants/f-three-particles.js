// f: three.js particles — 40,000 points whose motion is computed in the vertex shader (no per-frame JS
// per particle), additive blending. The "particle field" look, done the GPU way.
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, ShaderMaterial, AdditiveBlending, Color } from 'three';
import { run, webglInfo } from '../lib/hero.js';
import { NOISE } from '../lib/glsl.js';

const q = new URLSearchParams(location.search);
const N = Number(q.get('n') || 40000);
export function particles() {
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // A river of points: a band that meanders across the hero (the brand's subject), denser at its core.
    const x = (Math.random() - 0.5) * 9, g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    pos[i * 3] = x; pos[i * 3 + 1] = 0.55 * Math.sin(x * 0.7 + 0.8) - 0.15 + g() * 0.32; pos[i * 3 + 2] = -0.8 + g() * 1.1 + 0.3 * Math.cos(x * 0.5);
    seed[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('seed', new BufferAttribute(seed, 1));
  const mat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, cA: { value: new Color('#76dbd6') }, cB: { value: new Color('#fa856b') } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPx; attribute float seed; varying float vSeed; varying float vFade;
      ${NOISE}
      void main() {
        vec3 p = position;
        float t = uTime * 0.08;
        p.x = mod(p.x + uTime * (0.10 + 0.08 * seed) + 4.5, 9.0) - 4.5;                        // drift downstream, wrap
        p.y += 0.55 * (sin(p.x * 0.7 + 0.8) - sin(position.x * 0.7 + 0.8));                  // stay on the meander
        p += 0.22 * vec3(snoise(vec3(p.xz * 0.5, t + seed)), snoise(vec3(p.zx * 0.5 + 7.0, t)), snoise(vec3(p.xy * 0.5 + 3.0, t)));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (1.6 + 3.0 * seed) * (3.0 / -mv.z);
        vSeed = seed; vFade = smoothstep(9.0, 2.0, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 cA; uniform vec3 cB; varying float vSeed; varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vFade * 0.8;
        gl_FragColor = vec4(mix(cA, cB, step(0.93, vSeed)) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  return { points: new Points(geo, mat), mat };
}

export function threeScene(canvas, { antialias = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias, alpha: false, powerPreference: 'low-power', stencil: false, depth: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(new Color('#09122a'));
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 16 / 9, 0.1, 50);
  camera.position.set(0, 0.9, 4.2); camera.lookAt(0, 0, -0.6);
  const { points, mat } = particles();
  scene.add(points);
  return { renderer, scene, camera, mat, points };
}

export default function start(bg) {
  let s;
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      s = threeScene(canvas);
      return { gl: s.renderer.getContext(), info: webglInfo(s.renderer.getContext()) };
    },
    resize(w, h, dpr) { s.renderer.setSize(w, h, false); s.camera.aspect = w / h; s.camera.updateProjectionMatrix(); s.mat.uniforms.uPx.value = dpr; },
    frame(t) { s.mat.uniforms.uTime.value = t; s.renderer.render(s.scene, s.camera); },
    dispose() { s.renderer.dispose(); },
  });
}
