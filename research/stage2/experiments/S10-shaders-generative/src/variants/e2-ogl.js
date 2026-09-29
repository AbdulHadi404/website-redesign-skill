// e2: the same shader through OGL (Unlicense) — named imports only.
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { run, webglInfo } from '../lib/hero.js';
import { FRAG_BODY } from '../lib/glsl.js';

const VERT = `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
export default function start(bg) {
  let renderer, program, mesh;
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      renderer = new Renderer({ canvas, dpr: 1, alpha: false, antialias: false, depth: false, powerPreference: 'low-power', webgl: 1, autoClear: false });
      const gl = renderer.gl;
      if (!gl) throw new Error('no WebGL');
      program = new Program(gl, { vertex: VERT, fragment: `precision highp float;\n${FRAG_BODY}`, uniforms: { uTime: { value: 0 }, uRes: { value: [1, 1] } } });
      mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
      return { gl, info: webglInfo(gl) };
    },
    // OGL's setSize multiplies by its own dpr; we pass device pixels with dpr 1 and restore the CSS size.
    resize(w, h) { renderer.setSize(w, h); renderer.gl.canvas.style.width = ''; renderer.gl.canvas.style.height = ''; program.uniforms.uRes.value = [w, h]; },
    frame(t) { program.uniforms.uTime.value = t; renderer.render({ scene: mesh }); },
    dispose() { program.remove?.(); },
  });
}
