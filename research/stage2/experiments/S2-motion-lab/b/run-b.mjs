// Part B runner: Rive vs Lottie vs SVG/CSS vs sprite for one stateful toggle, plus looping illustrations.
//   node b/run-b.mjs [--runs 5]   → captures/b-results.json (run.mjs folds it into results.json)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { launch, median, round } from '../lib/browser.mjs';
import { parseArgs } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
import { decode } from '../lib/screencast.mjs';
import { buildB } from './build-b.mjs';
const args = parseArgs(); const RUNS = +(args.runs || 5);
const TOGGLES = ['rive-canvas', 'rive-canvas-lite', 'rive-webgl2', 'rive-react', 'lottie-svg', 'lottie-canvas', 'lottie-light', 'dotlottie', 'dotlottie-worker', 'css-svg', 'sprite'];
const LOOPS = ['loop-rive', 'loop-lottie-svg', 'loop-lottie-canvas', 'loop-dotlottie', 'loop-dotlottie-worker'];
const URL_OF = (v) => (v === 'lottie-canvas' ? 'lottie-svg.html?renderer=canvas' : `${v}.html`);
const VIEW = { width: 400, height: 260 };
const REGION = { x: 20, y: 20, width: 300, height: 150 };

async function ctxPage(browser, { reducedMotion = 'no-preference', cpu = 4 } = {}) {
  const ctx = await browser.newContext({ viewport: VIEW, reducedMotion, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__rafN = 0; window.requestAnimationFrame = (cb) => raf((t) => { window.__rafN++; cb(t); }); });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  return { ctx, page, cdp, errors };
}
function regionSig(f) { // a coarse signature of the stage region (to tell frames apart) and how much of it is not white
  const png = decode(f); const sx = png.width / f.w; let ink = 0, n = 0, h = 0;
  for (let y = REGION.y; y < REGION.y + REGION.height; y += 3) for (let x = REGION.x; x < REGION.x + REGION.width; x += 3) {
    const i = (Math.floor(y * sx) * png.width + Math.floor(x * sx)) * 4; const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    n++; if (r + g + b < 740) ink++; h = (h * 31 + (r >> 3) * 7 + (g >> 3) * 3 + (b >> 3)) >>> 0; }
  return { ink: ink / n, h };
}
async function cast(cdp) {
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ wall: f.metadata.timestamp * 1000, data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* closed */ } });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  return { frames, stop: () => cdp.send('Page.stopScreencast').catch(() => {}) };
}
// Time to first frame: navigation start → first painted frame with the element drawn (≥ 3% of the stage not white).
async function ttff(browser, base, v) {
  const { ctx, page, cdp, errors } = await ctxPage(browser);
  const c = await cast(cdp);
  await page.goto(`${base}/captures/b/${URL_OF(v)}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(3500);
  await c.stop();
  const origin = await page.evaluate(() => performance.timeOrigin);
  const loaded = await page.evaluate(() => window.__loaded ?? null);
  await ctx.close();
  const first = c.frames.find((f) => regionSig(f).ink >= 0.03);
  return { ttff: first ? first.wall - origin : null, loadedCb: loaded, errors: errors.slice(0, 2) };
}
// Main-thread cost while the element animates (toggled every 700 ms, 8 times), and at rest afterwards.
async function cost(browser, base, v, loop) {
  const { ctx, page, cdp } = await ctxPage(browser);
  await cdp.send('Performance.enable');
  await page.goto(`${base}/captures/b/${URL_OF(v)}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForFunction(() => window.__loaded, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const a = await m(); const r0 = await page.evaluate(() => window.__rafN); const t0 = Date.now();
  if (!loop) for (let i = 0; i < 8; i++) { await page.evaluate(() => window.__toggle?.()); await page.waitForTimeout(700); }
  else await page.waitForTimeout(5600);
  const b = await m(); const r1 = await page.evaluate(() => window.__rafN); const secs = (Date.now() - t0) / 1000;
  let rest = null;
  if (!loop) { await page.waitForTimeout(1500); const c0 = await m(); const q0 = await page.evaluate(() => window.__rafN); await page.waitForTimeout(2000); const c1 = await m(); const q1 = await page.evaluate(() => window.__rafN);
    rest = { taskMsPerS: ((c1.TaskDuration - c0.TaskDuration) * 1000) / 2, rafPerS: (q1 - q0) / 2 }; }
  await ctx.close();
  return { taskMsPerS: ((b.TaskDuration - a.TaskDuration) * 1000) / secs, scriptMsPerS: ((b.ScriptDuration - a.ScriptDuration) * 1000) / secs, rafPerS: (r1 - r0) / secs, rest };
}
// Reduced motion: does the element still animate after a toggle (or on its own, for loops)?
async function reduced(browser, base, v, loop) {
  const { ctx, page, cdp } = await ctxPage(browser, { reducedMotion: 'reduce', cpu: 1 });
  await page.goto(`${base}/captures/b/${URL_OF(v)}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForFunction(() => window.__loaded, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const c = await cast(cdp); await page.waitForTimeout(100);
  if (!loop) await page.evaluate(() => window.__toggle?.());
  await page.waitForTimeout(1200); await c.stop(); await ctx.close();
  const sigs = new Set(c.frames.map((f) => regionSig(f).h));
  return { distinctFrames: sigs.size, animates: sigs.size >= 4 };
}
// Accessibility: what the accessibility tree gets out of the box, whether Tab reaches it, and whether Space/Enter toggles it.
async function a11y(browser, base, v) {
  const { ctx, page } = await ctxPage(browser, { cpu: 1 });
  await page.goto(`${base}/captures/b/${URL_OF(v)}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForFunction(() => window.__loaded, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const tree = await page.locator('main').ariaSnapshot().catch((e) => `error: ${e.message.slice(0, 80)}`);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? `${e.tagName.toLowerCase()}${e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : ''}` : null; });
  const shot = async () => page.screenshot({ clip: REGION });
  const before = await shot();
  let toggled = false;
  if (focused) { await page.keyboard.press('Space'); await page.waitForTimeout(1300); toggled = !before.equals(await shot()); if (!toggled) { await page.keyboard.press('Enter'); await page.waitForTimeout(1300); toggled = !before.equals(await shot()); } }
  await ctx.close();
  return { tree: tree.replace(/\n/g, ' | ').slice(0, 300), tabReaches: focused, keyboardToggles: toggled };
}
export async function runB() {
  const { base, close } = await serve();
  const { browser } = await launch();
  const sizes = await buildB(browser, base);
  const res = { sizes, toggle: {}, loops: {}, a11y: {}, env: { browser: browser.version(), runs: RUNS, cpuThrottle: 4, note: 'WebGL2 is SwiftShader (CPU): rive-webgl2 numbers are pessimistic and only comparable among themselves' } };
  const agg = (xs, k) => round(median(xs.map((x) => (typeof k === 'function' ? k(x) : x[k]))), 1);
  for (const v of [...TOGGLES, ...LOOPS]) {
    const loop = v.startsWith('loop-');
    const T = []; for (let i = 0; i < RUNS; i++) T.push(await ttff(browser, base, v));
    const C = []; for (let i = 0; i < RUNS; i++) C.push(await cost(browser, base, v, loop));
    const R = await reduced(browser, base, v, loop);
    const row = { ttffMs: agg(T, 'ttff'), ttffRuns: T.map((x) => round(x.ttff, 0)), loadedCbMs: agg(T, 'loadedCb'), taskMsPerS: agg(C, 'taskMsPerS'), scriptMsPerS: agg(C, 'scriptMsPerS'), rafPerS: agg(C, 'rafPerS'),
      restTaskMsPerS: loop ? null : agg(C, (x) => x.rest.taskMsPerS), restRafPerS: loop ? null : agg(C, (x) => x.rest.rafPerS), reducedMotion: R, errors: T[0].errors };
    (loop ? res.loops : res.toggle)[v] = row;
    if (!loop) res.a11y[v] = await a11y(browser, base, v);
    process.stderr.write(`B ${v}: ttff ${row.ttffMs} ms, ${row.taskMsPerS} ms/s\n`);
  }
  res.a11y['rive-semantics'] = await a11y(browser, base, 'rive-semantics');
  await browser.close(); await close();
  await writeFile(path.join(labRoot, 'captures/b-results.json'), JSON.stringify(res, null, 1));
  return res;
}
if (import.meta.url === `file://${process.argv[1]}`) { const r = await runB(); console.log(JSON.stringify({ toggle: r.toggle, loops: r.loops, a11y: r.a11y }, null, 1).slice(0, 6000)); }
