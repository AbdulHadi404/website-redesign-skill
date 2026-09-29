// e5: the same shader as a three.js ShaderMaterial on a fullscreen plane (what many teams do "because three is there").
import { WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, RawShaderMaterial, Vector2 } from 'three';
import { run, webglInfo } from '../lib/hero.js';
import { FRAG, VERT } from '../lib/glsl.js';

export default function start(bg) {
  let renderer, scene, camera, mat;
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      scene = new Scene();
      camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
      mat = new RawShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uTime: { value: 0 }, uRes: { value: new Vector2(1, 1) } }, depthTest: false, depthWrite: false });
      scene.add(new Mesh(new PlaneGeometry(2, 2), mat));
      return { gl: renderer.getContext(), info: webglInfo(renderer.getContext()) };
    },
    resize(w, h) { renderer.setSize(w, h, false); mat.uniforms.uRes.value.set(w, h); },
    frame(t) { mat.uniforms.uTime.value = t; renderer.render(scene, camera); },
    dispose() { renderer.dispose(); },
  });
}
