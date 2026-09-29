// e3: the same shader through regl (MIT).
import createREGL from 'regl';
import { run, webglInfo } from '../lib/hero.js';
import { FRAG, VERT } from '../lib/glsl.js';

export default function start(bg) {
  let regl, draw, size = [1, 1];
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('no WebGL');
      regl = createREGL({ gl });
      draw = regl({
        frag: FRAG, vert: VERT,
        attributes: { position: [-1, -1, 3, -1, -1, 3] },
        uniforms: { uTime: regl.prop('t'), uRes: () => size },
        count: 3, depth: { enable: false },
      });
      return { gl, info: webglInfo(gl) };
    },
    resize(w, h) { size = [w, h]; regl.poll(); },
    frame(t) { regl.poll(); draw({ t }); },
    dispose() { regl.destroy(); },
  });
}
