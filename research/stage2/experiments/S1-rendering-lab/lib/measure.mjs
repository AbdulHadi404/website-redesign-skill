// One measured page load of one variant: first frame, steady-state frames, main-thread busy time,
// per-process CPU, a scripted drag while everything animates (input → frame latency, Event Timing),
// and the JS heap. One browser at a time; a fresh context per run.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillScripts = path.resolve(here, '../../../../../skills/website-redesign/scripts');

export async function launchBrowser(extraArgs = []) {
  const pw = await import(pathToFileURL(path.join(skillScripts, 'node_modules/playwright-core/index.js')).href).then((m) => m.default ?? m);
  const candidates = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'];
  const args = ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none', ...extraArgs];
  for (const executablePath of candidates) {
    if (executablePath && existsSync(executablePath)) return pw.chromium.launch({ headless: true, executablePath, args });
  }
  // Fall back to the skill's own launcher (finds Playwright's or a system Chromium).
  const { launch } = await import(pathToFileURL(path.join(skillScripts, 'lib/env.mjs')).href);
  return (await launch()).browser;
}

export const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

async function metrics(cdp) {
  const { metrics: list } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(list.map((m) => [m.name, m.value]));
}
async function procCpu(bcdp) {
  try {
    const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo');
    const by = {};
    for (const p of processInfo) by[p.type] = (by[p.type] || 0) + p.cpuTime;
    return by;
  } catch { return null; }
}

export function frameStats(deltas) {
  if (!deltas?.length) return { frames: 0 };
  const total = deltas.reduce((a, b) => a + b, 0);
  return {
    frames: deltas.length,
    fps: r1((deltas.length / total) * 1000),
    median: r1(median(deltas)), p95: r1(pct(deltas, 95)), max: r1(Math.max(...deltas)),
    over25: deltas.filter((d) => d > 25).length,        // frames that missed a 60 Hz deadline by half a frame or more
    longShare: r1((100 * deltas.filter((d) => d > 25).reduce((a, b) => a + b, 0)) / total),
  };
}

export async function runOne(browser, base, o) {
  const { variant, n, throttle = 1, reduced = false, load = 0, idle = false, drag = true, windowMs = 5000, warmMs = 1000, timeoutMs = 120000 } = o;
  const ctx = await browser.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const bcdp = await browser.newBrowserCDPSession().catch(() => null);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await cdp.send('Performance.enable');
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const qs = new URLSearchParams({ n: String(n) });
  if (load) qs.set('load', String(load));
  if (idle) qs.set('idle', '');
  for (const k of (o.extra || '').split(',').filter(Boolean)) qs.set(k, '');
  const url = `${base}/${variant}/?${qs}`;
  const out = { variant, n, throttle, reduced, load, idle, url, errors };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: timeoutMs, polling: 50 });
  } catch (e) {
    out.failed = `no first frame: ${e.message.split('\n')[0]}`;
    out.info = await page.evaluate(() => window.__lab?.info).catch(() => null);
    await ctx.close();
    return out;
  }
  const first = await page.evaluate(() => ({
    ttff: window.__lab.ttff, info: window.__lab.info,
    js: performance.getEntriesByType('resource').filter((r) => /\.js$/.test(r.name)).map((r) => r.name.split('/').pop()),
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
  }));
  Object.assign(out, { ttff: r1(first.ttff), fcp: r1(first.fcp), info: first.info, jsFiles: first.js });

  await page.waitForTimeout(warmMs);
  const m0 = await metrics(cdp); const c0 = bcdp && (await procCpu(bcdp));
  await page.evaluate(() => window.__lab.start());
  await page.waitForTimeout(windowMs);
  await page.evaluate(() => window.__lab.stop());
  const m1 = await metrics(cdp); const c1 = bcdp && (await procCpu(bcdp));
  const st = await page.evaluate(() => window.__lab.stats());
  const wall = m1.Timestamp - m0.Timestamp;
  out.steady = {
    ...frameStats(st.frames),
    main: st.mainFrames ? frameStats(st.mainFrames) : undefined,
    busyPct: r1((100 * (m1.TaskDuration - m0.TaskDuration)) / wall),
    scriptPct: r1((100 * (m1.ScriptDuration - m0.ScriptDuration)) / wall),
    stylePct: r1((100 * (m1.RecalcStyleDuration - m0.RecalcStyleDuration)) / wall),
    layoutPct: r1((100 * (m1.LayoutDuration - m0.LayoutDuration)) / wall),
    cpuPct: c0 && c1 ? Object.fromEntries(Object.keys(c1).map((k) => [k, r1((100 * (c1[k] - (c0[k] || 0))) / wall)])) : null,
    drawCalls: await page.evaluate(() => window.__lab.drawCalls?.() ?? null),
    // The scene's own JS per frame (update + render call): median / p95 ms, and frames it covered.
    js: st.js?.length ? { median: r1(median(st.js) * 100) / 100, p95: r1(pct(st.js, 95) * 100) / 100, frames: st.js.length } : null,
    rafCalls: st.rafCalls ?? null,
  };
  // CPU time of the renderer process (main thread + compositor + raster + workers) per displayed frame.
  // Honest under SwiftShader, unlike busyPct: a main thread blocked waiting for the emulated GPU is
  // "busy" in TaskDuration but burns no CPU.
  if (out.steady.cpuPct?.renderer != null && out.steady.fps) out.steady.rendererMsPerFrame = r1((out.steady.cpuPct.renderer * 10) / out.steady.fps);

  if (drag) {
    const box = await page.locator('#stage').boundingBox();
    const id = await page.evaluate(() => window.__lab.topId());
    const getPos = (i) => page.evaluate((k) => (window.__lab.getItemAsync ? window.__lab.getItemAsync(k) : window.__lab.getItem(k)), i);
    const p0 = await getPos(id);
    await page.evaluate(() => window.__lab.start());
    await page.mouse.move(box.x + p0.x - 30, box.y + p0.y - 30);
    await page.mouse.move(box.x + p0.x, box.y + p0.y, { steps: 4 });
    await page.waitForTimeout(100);
    await page.mouse.down();
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(box.x + p0.x + i * 4, box.y + p0.y + i * 2);
      await new Promise((r) => setTimeout(r, 16));
    }
    await page.mouse.up();
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__lab.stop());
    const ds = await page.evaluate(() => window.__lab.stats());
    const p1 = await getPos(id);
    const moves = ds.lat.filter((l) => l.type === 'pointermove');
    const downs = ds.lat.filter((l) => l.type === 'pointerdown' || l.type === 'pointerup');
    const et = ds.ev.filter((e) => /pointerdown|pointerup|click|mousedown|mouseup/.test(e.name));
    out.drag = {
      picked: ds.picked.includes(id), moved: [r1(p1.x - p0.x), r1(p1.y - p0.y)], dropped: ds.drops,
      moveToFrame: { median: r1(median(moves.map((l) => l.toFrame))), p95: r1(pct(moves.map((l) => l.toFrame), 95)), count: moves.length },
      moveDelay: { median: r1(median(moves.map((l) => l.delay))), p95: r1(pct(moves.map((l) => l.delay), 95)) },
      downUpToFrame: r1(Math.max(0, ...downs.map((l) => l.toFrame))),
      eventTimingMax: et.length ? r1(Math.max(...et.map((e) => e.dur))) : '<16',
      eventTiming: et.map((e) => ({ name: e.name, dur: r1(e.dur), delay: r1(e.delay), proc: r1(e.proc) })),
      frames: frameStats(ds.frames),
      mainLatToFrame: ds.mainLat ? r1(median(ds.mainLat.filter((l) => l.type === 'pointermove').map((l) => l.toFrame))) : undefined,
    };
  }
  try {
    await cdp.send('HeapProfiler.collectGarbage');
    const h = await cdp.send('Runtime.getHeapUsage');
    out.heapMB = r1(h.usedSize / 1048576);
  } catch { /* ignore */ }
  const nodes = await metrics(cdp);
  out.domNodes = nodes.Nodes;
  await ctx.close();
  return out;
}
