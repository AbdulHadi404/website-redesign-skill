// Experiment 2c: HTML streaming vs buffered SSR vs client rendering, for a listing whose data takes 1.2 s from the
// backend. Phone profile (390×844 @2x), CPU 4×, slow 4G, cache off, median of --runs. Writes results/streaming.json.
//   node run-streaming.mjs [--runs 5]
import { launch, env, newPage, NETS, median, r0, load, saveResult, sleep } from './lib/common.mjs';
import { buildStreaming, serveStreaming } from './lib/build-streaming.mjs';

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 5;
const VARIANTS = ['buffered', 'streamed', 'csr', 'csr-all'];
const built = await buildStreaming();
const srv = await serveStreaming();
const { browser } = await launch();
const out = { env: env(), built, profile: 'phone 390×844 @2x, CPU 4×, slow 4G (150 ms RTT, 1.6 Mbps), cache off; backend delay 1200 ms on the page (buffered, streamed) or on /api/items (csr, csr-all)', runs: [] };
for (let i = 0; i < RUNS; i++) for (const v of VARIANTS) {
  const { ctx, page } = await newPage(browser, { cpu: 4, net: NETS.slow4g, cache: false });
  const la = load()[0];
  await page.goto(`${srv.url}/stream/${v}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => performance.getEntriesByName('list').length > 0, null, { timeout: 60000 });
  await sleep(1200);
  const r = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { ...window.__o, list: performance.getEntriesByName('list')[0].startTime, ttfb: n.responseStart, htmlDone: n.responseEnd }; });
  await ctx.close();
  out.runs.push({ variant: v, loadavg1: la, ...r });
  console.log(v, i, `TTFB ${r0(r.ttfb)} FCP ${r0(r.fcp)} LCP ${r0(r.lcp)} (${r.lcpEl}) list ${r0(r.list)} CLS ${r.cls.toFixed(3)} la ${la}`);
}
await browser.close();
await srv.close();
const S = {};
for (const v of VARIANTS) {
  const rs = out.runs.filter((r) => r.variant === v);
  const m = (f) => r0(median(rs.map(f)));
  S[v] = { runs: rs.length, ttfb: m((r) => r.ttfb), fcp: m((r) => r.fcp), lcp: m((r) => r.lcp), lcpEl: rs[0].lcpEl, listVisible: m((r) => r.list), htmlDone: m((r) => r.htmlDone), cls: +median(rs.map((r) => r.cls)).toFixed(3) };
}
out.summary = S;
out.env.loadavgAtEnd = load();
await saveResult('streaming', out);
console.table(S);
