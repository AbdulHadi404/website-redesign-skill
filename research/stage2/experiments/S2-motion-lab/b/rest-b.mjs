// Is it the runtime or the asset that keeps rendering at rest? For each page: rAF callbacks per second and how many
// visually distinct frames the stage shows over 3 s, with no input (idle) and 2 s after one toggle (settled).
//   node b/rest-b.mjs   (needs b/build-b.mjs to have run; run.mjs runs it after run-b)
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { serve, labRoot } from '../lib/server.mjs';
import { launch, median } from '../lib/browser.mjs';
import { decode } from '../lib/screencast.mjs';
const REGION = { x: 20, y: 20, width: 300, height: 150 };
const sig = (f) => { const png = decode(f); const sx = png.width / f.w; let h = 0; for (let y = REGION.y; y < REGION.y + REGION.height; y += 3) for (let x = REGION.x; x < REGION.x + REGION.width; x += 3) { const i = (Math.floor(y * sx) * png.width + Math.floor(x * sx)) * 4; h = (h * 31 + (png.data[i] >> 3) * 7 + (png.data[i + 1] >> 3) * 3 + (png.data[i + 2] >> 3)) >>> 0; } return h; };
export async function restB(runs = 3) {
  // one extra page: Rive's star rating, whose idle state is a still frame
  await build({ stdin: { contents: `import { Rive, RuntimeLoader } from '@rive-app/canvas'; RuntimeLoader.setWasmUrl('/captures/b/wasm/rive-canvas.wasm');
    window.__r = new Rive({ src: '/captures/b-assets/rating.riv', canvas: document.getElementById('c'), stateMachines: 'State Machine 1', autoplay: true, onLoad: () => { window.__r.resizeDrawingSurfaceToCanvas(); window.__loaded = performance.now(); } });
    window.__toggle = () => { const i = window.__r.stateMachineInputs('State Machine 1').find((x) => x.name === 'rating'); i.value = i.value === 4 ? 2 : 4; };`, resolveDir: labRoot }, bundle: true, minify: true, format: 'esm', outfile: path.join(labRoot, 'captures/b/rive-rating.js'), logLevel: 'silent' });
  const html = (await readFile(path.join(labRoot, 'captures/b/rive-canvas.html'), 'utf8')).replace('/captures/b/rive-canvas.js', '/captures/b/rive-rating.js').replace('<title>rive-canvas', '<title>rive-rating');
  await writeFile(path.join(labRoot, 'captures/b/rive-rating.html'), html);
  const { base, close } = await serve(); const { browser } = await launch();
  const out = {};
  for (const v of ['rive-canvas', 'rive-rating', 'rive-canvas-lite', 'dotlottie', 'dotlottie-worker', 'lottie-svg', 'css-svg']) {
    const rows = { idle: [], settled: [] };
    for (let r = 0; r < runs; r++) for (const phase of ['idle', 'settled']) {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 260 } });
      await ctx.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__n = 0; window.requestAnimationFrame = (cb) => raf((t) => { window.__n++; cb(t); }); });
      const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
      await page.goto(`${base}/captures/b/${v}.html`); await page.waitForFunction(() => window.__loaded, null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (phase === 'settled') { await page.evaluate(() => window.__toggle?.()); await page.waitForTimeout(2500); }
      const frames = []; cdp.on('Page.screencastFrame', async (f) => { frames.push({ data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* closed */ } });
      await cdp.send('Page.startScreencast', { format: 'png' });
      const n0 = await page.evaluate(() => window.__n); await page.waitForTimeout(3000); const n1 = await page.evaluate(() => window.__n);
      await cdp.send('Page.stopScreencast').catch(() => {});
      rows[phase].push({ rafPerS: (n1 - n0) / 3, distinct: new Set(frames.map(sig)).size });
      await ctx.close();
    }
    out[v] = Object.fromEntries(Object.entries(rows).map(([k, xs]) => [k, { rafPerS: median(xs.map((x) => x.rafPerS)), distinctFrames: median(xs.map((x) => x.distinct)) }]));
    process.stderr.write(`rest ${v} ${JSON.stringify(out[v])}\n`);
  }
  await browser.close(); await close();
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await restB(), null, 1));
