// h: variant f + pmndrs/postprocessing (Zlib). ?fx=none|bloom|grain|ca|vignette|all|allsmaa|allsmaa1
// One EffectPass merges the chosen effects into a single fullscreen shader (the library's main advantage),
// but only one convolution effect per pass: SMAA next to chromatic aberration throws "Convolution effects
// cannot be merged" (allsmaa1 shows it), so allsmaa puts SMAA in a second pass.
import { EffectComposer, RenderPass, EffectPass, BloomEffect, NoiseEffect, ChromaticAberrationEffect, VignetteEffect, BlendFunction, SMAAEffect } from 'postprocessing';
import { Vector2, HalfFloatType, UnsignedByteType } from 'three';
import { run, webglInfo } from '../lib/hero.js';
import { threeScene } from './f-three-particles.js';

const q = new URLSearchParams(location.search);
const fx = q.get('fx') || 'all';
export default function start(bg) {
  let s, composer;
  run(bg, {
    kind: 'webgl',
    init(canvas) {
      s = threeScene(canvas);
      // lab flags for the black-level check: ?fbt=u8 (8-bit buffers); ?bg=clear is handled in threeScene()
      composer = new EffectComposer(s.renderer, { frameBufferType: q.get('fbt') === 'u8' ? UnsignedByteType : HalfFloatType });
      composer.addPass(new RenderPass(s.scene, s.camera));
      const effects = [];
      const on = (k) => fx === k || fx.startsWith('all');
      if (on('bloom')) effects.push(new BloomEffect({ intensity: 1.2, luminanceThreshold: 0.4, luminanceSmoothing: 0.4, mipmapBlur: true }));
      if (on('ca')) effects.push(new ChromaticAberrationEffect({ offset: new Vector2(0.0012, 0.0008), radialModulation: true, modulationOffset: 0.3 }));
      if (on('vignette')) effects.push(new VignetteEffect({ offset: 0.3, darkness: 0.6 }));
      if (on('grain')) { const n = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false }); n.blendMode.opacity.value = 0.18; effects.push(n); }
      if (fx === 'allsmaa1') effects.push(new SMAAEffect());
      if (effects.length) composer.addPass(new EffectPass(s.camera, ...effects));
      if (fx === 'allsmaa') composer.addPass(new EffectPass(s.camera, new SMAAEffect()));
      return { gl: s.renderer.getContext(), info: { ...webglInfo(s.renderer.getContext()), fx } };
    },
    resize(w, h, dpr) { s.renderer.setPixelRatio(1); composer.setSize(w, h, false); s.camera.aspect = w / h; s.camera.updateProjectionMatrix(); s.mat.uniforms.uPx.value = dpr; },
    frame(t, dt) { s.mat.uniforms.uTime.value = t; composer.render(dt); },
    dispose() { composer.dispose(); s.renderer.dispose(); },
  });
}
