// Does Motion's animateView() move the view (x: ±24) or only fade it? Reads the keyframes of the view-transition
// pseudo-element animations right after the click on the Motion (vanilla) page, and the computed transform of
// ::view-transition-new over the transition.
//   node a/probe-motion-view.mjs   → prints JSON (also used to write c/truth-partA.json's motion|view entry)
import { launch } from '../lib/browser.mjs';
import { serve } from '../lib/server.mjs';
export async function probeMotionView() {
  const { base, close } = await serve(); const { browser } = await launch();
  const page = await browser.newPage();
  await page.goto(`${base}/captures/a/motion.html`); await page.waitForTimeout(400);
  const r = await page.evaluate(() => new Promise((res) => {
    document.querySelector('#swap').click(); const out = { keyframes: null, transforms: [] }; const t0 = performance.now();
    const tick = () => { const vt = document.getAnimations().filter((a) => (a.effect?.pseudoElement || '').startsWith('::view-transition'));
      if (!out.keyframes && vt.length) out.keyframes = vt.map((a) => ({ pseudo: a.effect.pseudoElement, duration: a.effect.getTiming().duration, keyframes: a.effect.getKeyframes().map((k) => Object.fromEntries(Object.entries(k).filter(([p]) => !['computedOffset', 'composite'].includes(p)))) }));
      const pe = vt.find((a) => a.effect.pseudoElement.startsWith('::view-transition-new'))?.effect.pseudoElement;
      if (pe) { const cs = getComputedStyle(document.documentElement, pe); out.transforms.push([Math.round(performance.now() - t0), cs.transform, cs.translate, cs.opacity]); }
      if (performance.now() - t0 < 700) requestAnimationFrame(tick); else res(out); };
    requestAnimationFrame(tick); }));
  await browser.close(); await close();
  return r;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await probeMotionView(), null, 1).slice(0, 3000));
