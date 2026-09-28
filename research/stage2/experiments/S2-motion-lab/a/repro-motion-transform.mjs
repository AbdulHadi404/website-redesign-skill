// Minimal repro: Motion's hardware-accelerated path (transform strings, WAAPI) vs its x/y/scale shorthands.
//   node a/repro-motion-transform.mjs   → prints JSON; run.mjs stores it as results.a.motionTransformRepro
import { build } from 'esbuild';
import path from 'node:path';
import { launch } from '../lib/browser.mjs';
import { serve, labRoot } from '../lib/server.mjs';
export async function reproMotion() {
await build({ entryPoints: [path.join(labRoot, 'a/repro-motion-entry.js')], bundle: true, format: 'esm', outfile: path.join(labRoot, 'captures/tmp/m.bundle.js'), logLevel: 'error' });
const { base, close } = await serve(); const { browser } = await launch();
const page = await browser.newPage();
await page.goto(base + '/a/'); // same origin as the bundle (the 404 body is replaced below)
await page.setContent(`<div id=a style="width:100px;height:100px;background:red"></div><div id=b style="width:100px;height:100px;background:blue;transform:translateY(100px)"></div>`);
await page.addScriptTag({ url: base + '/captures/tmp/m.bundle.js', type: 'module' });
await page.waitForFunction(() => window.animate);
const r = await page.evaluate(async () => {
  const sx = (e) => { const t = getComputedStyle(e).transform; return t === 'none' ? 1 : new DOMMatrix(t).a; };
  const ty = (e) => { const t = getComputedStyle(e).transform; return t === 'none' ? 0 : new DOMMatrix(t).f; };
  const out = {};
  const a = document.getElementById('a'), b = document.getElementById('b');
  // 1: transform string from 'none'
  animate(a, { transform: 'scale(0.5)' }, { duration: 1 });
  await new Promise((r) => setTimeout(r, 50)); out.scaleAt50ms_from_none = +sx(a).toFixed(3);
  // 1b: x shorthand / scale shorthand
  const a2 = a.cloneNode(); a2.id = 'a2'; a2.style.transform = ''; document.body.append(a2);
  animate(a2, { scale: 0.5 }, { duration: 1 });
  await new Promise((r) => setTimeout(r, 50)); out.scaleShorthandAt50ms = +sx(a2).toFixed(3);
  // 2: interrupt a WAAPI transform animation mid-flight
  animate(b, { transform: 'translateY(0px)' }, { duration: 1 });
  await new Promise((r) => setTimeout(r, 300)); out.bBefore = +ty(b).toFixed(1);
  animate(b, { transform: 'translateY(100px)' }, { duration: 1 });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); out.bAfter2Frames = +ty(b).toFixed(1);
  return out;
});
await browser.close(); await close();
return r;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await reproMotion()));
