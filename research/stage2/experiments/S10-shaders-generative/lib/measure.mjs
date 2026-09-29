// Measurements for one page load of one variant. One browser at a time; a fresh context per run.
//
// Numbers and what they mean here (SwiftShader: WebGL and compositing run on the CPU, in the GPU process):
//   ttff        effect's first frame on screen (ms from navigation start); CSS/static: first contentful paint
//   lcp         largest-contentful-paint time and element (the poster <img> or the <h1>)
//   bootBlock   sum of long tasks (>50 ms) on the main thread from navigation to first effect frame + 500 ms
//   fps         main-thread rAF cadence over a 5 s window (a no-op probe loop; the display is 60 Hz)
//   effectFps   frames the effect actually rendered per second (the harness counts draws)
//   busyPct     main-thread task time / wall time
//   cpu         CPU time per process type / wall time (100 = one core); GPU = SwiftShader's rasterisation
//   jsMs        the effect's own JS per frame (update + draw calls), median
import { PNG } from 'pngjs';

export const median = (a) => { const s = a.filter((x) => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const pct = (a, p) => { const s = a.filter((x) => typeof x === 'number').sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : null; };
export const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

// Installed before any page script: counts every requestAnimationFrame callback, keeps the original for the
// probe, and records long tasks, FCP and LCP.
function initScript() {
  const orig = window.requestAnimationFrame.bind(window);
  window.__rafOrig = orig;
  window.__rafCount = 0;
  window.requestAnimationFrame = (cb) => orig((t) => { window.__rafCount++; cb(t); });
  window.__long = [];
  window.__lcp = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp.push({ t: e.startTime, tag: e.element?.tagName, id: e.element?.id, url: (e.url || '').split('/').pop(), size: e.size });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
}

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

export async function newPage(browser, { viewport = { width: 1280, height: 720 }, dsf = 1, reduced = false, throttle = 1 } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(initScript);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  return { ctx, page, cdp, errors };
}

// A measured window: main-thread busy, per-process CPU, rAF callbacks, effect draws; optional probe for cadence.
export async function window_(browser, page, cdp, ms, { probe = false } = {}) {
  const bcdp = await browser.newBrowserCDPSession().catch(() => null);
  if (probe) {
    await page.evaluate(() => {
      window.__probe = { d: [], last: 0, on: true };
      const f = (t) => { if (!window.__probe.on) return; if (window.__probe.last) window.__probe.d.push(t - window.__probe.last); window.__probe.last = t; window.__rafOrig(f); };
      window.__rafOrig(f);
    });
  }
  const s0 = await page.evaluate(() => { const l = window.__lab || {}; l.recording = true; l.jsTimes = []; return { raf: window.__rafCount, draws: l.draws ?? null }; });
  const m0 = await metrics(cdp); const c0 = bcdp && (await procCpu(bcdp));
  await page.waitForTimeout(ms);
  const m1 = await metrics(cdp); const c1 = bcdp && (await procCpu(bcdp));
  const s1 = await page.evaluate(() => {
    const l = window.__lab || {}; l.recording = false;
    if (window.__probe) window.__probe.on = false;
    return { raf: window.__rafCount, draws: l.draws ?? null, js: l.jsTimes || [], probe: window.__probe?.d || [] };
  });
  const wall = m1.Timestamp - m0.Timestamp;
  const cpu = c0 && c1 ? Object.fromEntries(Object.keys(c1).map((k) => [k, r1((100 * (c1[k] - (c0[k] || 0))) / wall)])) : null;
  if (cpu) cpu.total = r1(Object.entries(cpu).filter(([k]) => k !== 'total').reduce((a, [, v]) => a + v, 0));
  const d = s1.probe.slice(2);
  const tot = d.reduce((a, b) => a + b, 0);
  return {
    wall: r1(wall * 1000),
    busyPct: r1((100 * (m1.TaskDuration - m0.TaskDuration)) / wall),
    scriptPct: r1((100 * (m1.ScriptDuration - m0.ScriptDuration)) / wall),
    rafPerSec: r1((s1.raf - s0.raf) / wall),
    effectFps: s1.draws != null && s0.draws != null ? r1((s1.draws - s0.draws) / wall) : null,
    cpu,
    fps: probe && d.length ? r1((d.length / tot) * 1000) : null,
    frameMedian: probe ? r1(median(d)) : null,
    frameP95: probe ? r1(pct(d, 95)) : null,
    over25Pct: probe && d.length ? r1((100 * d.filter((x) => x > 25).length) / d.length) : null,
    jsMs: s1.js.length ? Math.round(median(s1.js) * 100) / 100 : null,
    jsP95: s1.js.length ? Math.round(pct(s1.js, 95) * 100) / 100 : null,
  };
}

export async function load(page, url, { kind, timeout = 60000 } = {}) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout });
  if (kind === 'script' || kind === 'fluid-demo' || kind === 'video') {
    await page.waitForFunction(() => window.__lab?.ttff != null || window.__lab?.fallback || window.__lab?.reducedSkip, null, { timeout, polling: 50 }).catch(() => {});
  }
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const l = window.__lab || {};
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    const lcp = window.__lcp.at(-1) || null;
    const end = (l.ttff ?? fcp ?? 0) + 500;
    const longs = window.__long.filter(([s]) => s <= end);
    return {
      ttff: l.ttff ?? null, fcp, lcp, bootStart: l.bootStart ?? null,
      bootBlock: longs.reduce((a, [, d]) => a + d, 0), tbt: longs.reduce((a, [, d]) => a + Math.max(0, d - 50), 0),
      longest: longs.reduce((a, [, d]) => Math.max(a, d), 0),
      info: l.info || null, fallback: l.fallback || null, failReason: l.failReason || null, reducedSkip: !!l.reducedSkip,
      state: l.state?.() ?? null,
    };
  });
  r.loadWall = Date.now() - t0;
  return r;
}

// Luminance statistics of a screenshot region: for the worst-case contrast of white text on a moving background.
export function regionLuminance(pngBuf, box) {
  const png = PNG.sync.read(pngBuf);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const ys = [];
  for (let y = Math.max(0, box.y | 0); y < Math.min(png.height, (box.y + box.height) | 0); y += 2) {
    for (let x = Math.max(0, box.x | 0); x < Math.min(png.width, (box.x + box.width) | 0); x += 2) {
      const i = (y * png.width + x) * 4;
      ys.push(0.2126 * lin(png.data[i]) + 0.7152 * lin(png.data[i + 1]) + 0.0722 * lin(png.data[i + 2]));
    }
  }
  const p95 = pct(ys, 95), mx = Math.max(...ys);
  const ratio = (L) => r1(((1.05) / (L + 0.05)) * 100) / 100;   // white text on luminance L
  return { p95L: Math.round(p95 * 1000) / 1000, maxL: Math.round(mx * 1000) / 1000, contrastP95: ratio(p95), contrastMax: ratio(mx) };
}
