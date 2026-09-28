// Frame-cost probe used by run.mjs: n toppings all moving every frame, rendered
// by our own rAF loop; returns JS time per frame (render + proxy sync).
import { KINDS } from './model.js';
export function makeBench(model, view, proxies) {
  return async function bench(n, frames, proxiesOn = true) {
    view.setWobble(false, { quiet: true });
    model.state.limit = 100000;
    for (const it of [...model.state.items]) model.remove(it.id);
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, r = 0.85 * Math.sqrt((i + 0.5) / n);
      model.add(KINDS[i % KINDS.length].id, Math.cos(a) * r, Math.sin(a) * r, { exact: true });
    }
    proxies?.setEnabled(proxiesOn);
    await new Promise((r) => setTimeout(r, 900)); // let pops and particles finish
    view.setWobble(true, { quiet: true });
    const js = [], stamps = [];
    await new Promise((res) => {
      let k = 0;
      const step = (now) => {
        stamps.push(now);
        const t0 = performance.now(); view.render(now); js.push(performance.now() - t0);
        if (++k < frames) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    view.setWobble(false, { quiet: true });
    proxies?.setEnabled(true);
    const sorted = [...js].sort((a, b) => a - b);
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
    return { n, frames, proxiesOn, jsMedianMs: q(0.5), jsP95Ms: q(0.95), frameGapMedianMs: gaps[Math.floor(gaps.length / 2)], domButtons: document.querySelectorAll('button').length };
  };
}
