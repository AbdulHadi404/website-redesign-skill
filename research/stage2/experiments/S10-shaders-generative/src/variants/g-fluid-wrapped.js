// g (wrapped): PavelDoGreat/WebGL-Fluid-Simulation (MIT, © 2017 Pavel Dobryakov), patched at build time
// (lib/build.mjs → patchFluid) into a module the production wrapper drives:
//   no GUI, analytics or promo; no global Space/P key handlers; no touch preventDefault (the page scrolls);
//   capped device pixel ratio; throws when WebGL is missing (→ poster); the wrapper owns the loop
//   (pause off-screen/hidden/by the visitor, reduced motion, context loss); brand colours; ambient splats.
// ?lite → quality tier: dye 512, no bloom, no sunrays.
import fluid from 'fluid-sim';
import { run, webglInfo } from '../lib/hero.js';

const q = new URLSearchParams(location.search);
const BRAND = [[0.46, 0.86, 0.84], [0.03, 0.46, 0.53], [0.98, 0.52, 0.42], [0.3, 0.7, 0.8]];
export default function start(bg) {
  let sim, next = 0.5;
  run(bg, {
    kind: 'webgl',
    ownsSize: true,
    init(canvas) {
      sim = fluid(canvas, {
        dprCap: Number(q.get('dpr') || 2),
        ditherUrl: new URL('./LDR_LLL1_0.png', import.meta.url).href,
        color: () => { const c = BRAND[(Math.random() * BRAND.length) | 0]; return { r: c[0] * 0.15, g: c[1] * 0.15, b: c[2] * 0.15 }; },
        lite: q.has('lite'),
        back: { r: 9, g: 18, b: 42 },          // brand navy instead of the demo's black
      });
      return { gl: sim.gl, info: webglInfo(sim.gl) };
    },
    frame(t) {
      if (t > next) { sim.splats(1); next = t + 2.5; }   // ambient motion without input
      sim.update();
    },
  });
}
