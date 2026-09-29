// Held-out check (added after review): the templates on pages they were not developed on — three S10 hero variants
// (S10-shaders-generative/dist, served read-only) and the skill's tools/regress/fixtures/capture-webgl.html — at CPU
// 1x / 4x / 6x. For each page: governor.js (and the superseded governor-v1.js) hooked into the page's own
// requestAnimationFrame for 15 s, then tier.js detectTier() on the running page (a misuse on purpose: the page is busy,
// its scene already runs, so measureRefresh() cannot see an idle display;
// the probe must still return within its time cap).
// The hook calls governor.frame(ts) once per frame and governor.pause() when a frame was requested from outside a
// frame (an event or a timer), i.e. the page's loop had stopped: the same contract a real integration follows.
// No refreshMs is passed (the page's scene starts before anything could measure it): the governor assumes 60 Hz and
// can only lower that. The hook cannot change what the page renders: the governor level has no effect here, so this
// tests the judging (when it would step down or give up), not the recovery. Writes results/heldout.json.
//   node run-heldout.mjs [--runs 1]
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { launch, here, env, median, r0, r1, load, saveResult, sleep } from './lib/common.mjs';

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 1;
const REPO = path.resolve(here, '../../../..');
const ROOTS = {
  '/s10/': path.join(REPO, 'research/stage2/experiments/S10-shaders-generative/dist/'),
  '/fx/': path.join(REPO, 'tools/regress/fixtures/'),
  '/client/': path.join(here, 'lib/client/'),
};
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.css': 'text/css', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const pre = Object.keys(ROOTS).find((p) => u.startsWith(p));
  if (!pre) return res.writeHead(404).end();
  let f = path.join(ROOTS[pre], u.slice(pre.length));
  if (!f.startsWith(ROOTS[pre])) return res.writeHead(403).end();
  if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;

const INIT = (which) => `
(() => {
  const orig = window.requestAnimationFrame.bind(window);
  const Q = window.__govq = []; let lastTs = -1, inFrame = false, requested = true;
  window.requestAnimationFrame = (cb) => { if (inFrame) requested = true; return orig((ts) => {
    if (ts !== lastTs) {
      lastTs = ts; Q.push(ts);
      const g = window.__gov;
      if (g) { if (!requested) g.pause(); g.frame(ts); }
      requested = false;
    }
    inFrame = true; try { return cb(ts); } finally { inFrame = false; }
  }); };
  import('/client/${which}').then((m) => { const g = m.createGovernor({}); if (!g.pause) g.pause = () => {}; window.__gov = g; }).catch((e) => { window.__govErr = String(e); });
})();`;

const PAGES = ['/s10/e5-three/?nopause', '/s10/d-canvas2d/?nopause', '/s10/f-three-particles/?nopause', '/fx/capture-webgl.html'];
const { browser } = await launch();
const out = { env: env(), method: 'governor hooked into the page rAF for 15 s at each CPU rate, then detectTier() on the running page; no refreshMs given (60 Hz assumed)', runs: [] };
for (let i = 0; i < RUNS; i++) for (const p of PAGES) for (const cpu of [1, 4, 6]) for (const which of ['governor.js', 'governor-v1.js']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(INIT(which));
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const la = load()[0];
  try { await page.goto(base + p, { waitUntil: 'load', timeout: 60000 }); } catch (e) { errs.push('goto ' + e.message.slice(0, 100)); }
  await sleep(15000);
  const g = await page.evaluate(() => {
    const q = window.__govq, d = []; for (let i = 1; i < q.length; i++) d.push(q[i] - q[i - 1]); d.sort((a, b) => a - b);
    return { log: (window.__gov?.log || []).map((e) => ({ ...e, t: Math.round(e.t - (q[0] || 0)) })), level: window.__gov?.level, floor: window.__gov?.floor ?? null, refresh: window.__gov?.refresh, frames: q.length, err: window.__govErr || null, p50: d[d.length >> 1] ?? null, p90: d[Math.floor(d.length * 0.9)] ?? null };
  });
  let t = null;
  if (which === 'governor.js') {
    const w0 = Date.now();
    t = await page.evaluate(async () => { try { const m = await import('/client/tier.js'); const a = await m.detectTier({ needsWebGL: false }); return { cap: a.capability, why: a.why, ms: a.ms, refreshMs: a.refreshMs, probe: a.probe }; } catch (e) { return { err: String(e) }; } }).catch((e) => ({ err: String(e).slice(0, 120) }));
    t.wallMs = Date.now() - w0;
  }
  out.runs.push({ page: p, cpu, governor: which, loadavg1: la, gov: g, tier: t, errs });
  console.log(p, cpu + 'x', which, 'frames', g.frames, 'p50/p90', r1(g.p50), r1(g.p90), 'refresh', r1(g.refresh), 'log', JSON.stringify(g.log.map((e) => [e.t, e.from, e.to, e.floor ? 'F' : ''])), t ? `tier ${t.cap} (${t.why?.slice(0, 70)}) ${t.ms} ms wall ${t.wallMs}` : '', errs.length ? errs : '', 'la', la);
  await ctx.close();
}
await browser.close(); srv.close();
const S = {};
for (const p of PAGES) for (const cpu of [1, 4, 6]) for (const which of ['governor.js', 'governor-v1.js']) {
  const rs = out.runs.filter((r) => r.page === p && r.cpu === cpu && r.governor === which);
  S[`${p}|${cpu}x|${which}`] = { intervalP50: r1(median(rs.map((r) => r.gov.p50))), intervalP90: r1(median(rs.map((r) => r.gov.p90))), stepDowns: rs.map((r) => r.gov.log.filter((e) => e.to > e.from).length), firstDownMs: rs.map((r) => r.gov.log.find((e) => e.to > e.from)?.t ?? null), floorMs: rs.map((r) => r.gov.log.find((e) => e.floor)?.t ?? null), refreshEnd: rs.map((r) => r1(r.gov.refresh)), tier: rs.map((r) => r.tier && r.tier.cap), tierMs: rs.map((r) => r.tier && r.tier.ms), tierWork: rs.map((r) => r.tier && r1(r.tier.probe?.workMedian)), errors: rs.reduce((a, r) => a + r.errs.length, 0) };
}
out.summary = S;
out.env.loadavgAtEnd = load();
await saveResult('heldout', out);
console.table(Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { p50: v.intervalP50, p90: v.intervalP90, downs: v.stepDowns.join(','), first: v.firstDownMs.join(','), floor: v.floorMs.join(','), tier: v.tier.join(','), ms: v.tierMs.join(',') }])));
