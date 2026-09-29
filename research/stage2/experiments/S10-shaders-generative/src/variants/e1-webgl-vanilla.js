// e1: the fragment shader on a fullscreen triangle with raw WebGL — no library.
import { run, webglInfo } from '../lib/hero.js';
import { FRAG, VERT } from '../lib/glsl.js';

export default function start(bg) {
  let gl, prog, uTime, uRes;
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      // powerPreference low-power: a background never needs the discrete GPU; no depth/stencil/AA for a flat quad.
      // ?gl2: the same GLSL ES 1.0 shader in a WebGL2 context, so the wrapper can time frame 1 with a fence.
      const opts = { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'low-power', premultipliedAlpha: false };
      gl = (new URLSearchParams(location.search).has('gl2') && canvas.getContext('webgl2', opts)) || canvas.getContext('webgl', opts);
      if (!gl) throw new Error('no WebGL');
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one triangle covers the screen
      const loc = gl.getAttribLocation(prog, 'position');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uTime = gl.getUniformLocation(prog, 'uTime');
      uRes = gl.getUniformLocation(prog, 'uRes');
      return { gl, info: webglInfo(gl) };
    },
    resize(w, h) { gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h); },
    frame(t) { gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); },
    dispose() { gl.deleteProgram(prog); },
  });
}
