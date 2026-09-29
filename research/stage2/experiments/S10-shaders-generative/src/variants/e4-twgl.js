// e4: the same shader through twgl.js (MIT) — named imports from the ESM build.
import { createProgramInfo, createBufferInfoFromArrays, setBuffersAndAttributes, setUniforms, drawBufferInfo } from 'twgl.js';
import { run, webglInfo } from '../lib/hero.js';
import { FRAG, VERT } from '../lib/glsl.js';

export default function start(bg) {
  let gl, pi, bi, size = [1, 1];
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('no WebGL');
      pi = createProgramInfo(gl, [VERT, FRAG]);
      if (!pi) throw new Error('shader failed');
      bi = createBufferInfoFromArrays(gl, { position: { numComponents: 2, data: [-1, -1, 3, -1, -1, 3] } });
      gl.useProgram(pi.program);
      setBuffersAndAttributes(gl, pi, bi);
      return { gl, info: webglInfo(gl) };
    },
    resize(w, h) { gl.viewport(0, 0, w, h); size = [w, h]; },
    frame(t) { setUniforms(pi, { uTime: t, uRes: size }); drawBufferInfo(gl, bi); },
    dispose() { gl.deleteProgram(pi.program); },
  });
}
