// Experiment 3: the same data job (fetch ~24 MB JSON / 200k records, aggregate, histogram, density grid, top 50,
// points for drawing) done six ways while the harness taps a button every 100 ms. Measures what the person feels:
// input delay and event duration of every tap, the longest main-thread frame gap, LoAF blocking, time to first and
// final result. CPU 1× (fair to workers) and 4× (CDP throttles only the main thread: see the spin check).
// Also: does CDP throttling reach a worker, and what does postMessage cost on the receiving thread.
//   node run-offmain.mjs [--runs 5]
import { launch, siteRoot, env, newPage, median, pct, r0, r1, load, saveResult, sleep } from './lib/common.mjs';
import { serve } from './lib/serve.mjs';
import { buildOffmain } from './lib/build-offmain.mjs';

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 5;
const JOBS = ['main', 'main-yield', 'main-stream', 'worker', 'worker-clone', 'worker-stream', 'binary-main'];
const built = await buildOffmain();
const srv = await serve(siteRoot);
const { browser } = await launch();
const out = { env: env(), built, runs: [], spin: [], payload: [] };

async function once(job, cpu) {
  const { ctx, page, cdp } = await newPage(browser, { cpu, phone: false });
  await page.goto(`${srv.url}/offmain/`, { waitUntil: 'load' });
  await sleep(600);
  const tap = await page.evaluate(() => { const r = document.querySelector('#tap').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const la = load()[0];
  let taps = 0, stop = false;
  const pinger = (async () => {
    while (!stop) {
      cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: tap.x, y: tap.y, button: 'left', clickCount: 1 }).catch(() => {});
      cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tap.x, y: tap.y, button: 'left', clickCount: 1 }).catch(() => {});
      taps++;
      await sleep(100);
    }
  })();
  const r = await page.evaluate((j) => window.__run(j), job);
  await sleep(400);
  stop = true; await pinger; await sleep(300);
  const W = await page.evaluate(() => ({ events: window.__w.events, gaps: window.__w.gaps, loaf: window.__w.loaf, t0: window.__w.t0, t1: window.__w.t1, deser: window.__w.deser }));
  await ctx.close();
  const inWin = (t) => t >= W.t0 && t <= W.t1 + 50;
  const clicks = W.events.filter((e) => inWin(e.start) && /pointerdown|mousedown|pointerup|mouseup|click/.test(e.name));
  // one value per interaction: its longest event
  const byId = new Map();
  for (const e of clicks) { const k = e.id || `${e.name}${e.start}`; const p = byId.get(k); if (!p || e.dur > p.dur) byId.set(k, e); }
  const inter = [...byId.values()];
  const gaps = W.gaps.filter(([t]) => inWin(t)).map(([, g]) => g);
  return {
    job, cpu, loadavg1: la, ms: r.ms, first: r.first, taps,
    slowTaps: inter.length, // interactions whose longest event took ≥ 16 ms
    maxDur: Math.max(0, ...inter.map((e) => e.dur)), maxDelay: Math.max(0, ...inter.map((e) => e.delay)),
    over200: inter.filter((e) => e.dur > 200).length, over100: inter.filter((e) => e.dur > 100).length,
    maxGap: Math.max(0, ...gaps), gapsOver50: gaps.filter((g) => g > 50).length, frames: gaps.length,
    loafBlocking: W.loaf.filter(([t]) => inWin(t)).reduce((a, l) => a + (l[2] || 0), 0), deser: W.deser,
  };
}

for (const cpu of [1, 4]) for (const job of JOBS) for (let i = 0; i < RUNS; i++) {
  const r = await once(job, cpu);
  out.runs.push(r);
  console.log(cpu + 'x', job, i, `done ${r0(r.ms)} first ${r0(r.first)} maxDelay ${r0(r.maxDelay)} maxDur ${r0(r.maxDur)} >200 ${r.over200} maxGap ${r0(r.maxGap)} loaf ${r0(r.loafBlocking)} la ${r.loadavg1}`);
}

// Throttle check and postMessage costs.
for (const cpu of [1, 4]) {
  const { ctx, page } = await newPage(browser, { cpu, phone: false });
  await page.goto(`${srv.url}/offmain/`, { waitUntil: 'load' });
  for (let i = 0; i < 3; i++) out.spin.push({ cpu, ...(await page.evaluate(() => window.__spin())) });
  for (const kind of ['objects', 'objects-20k', 'json-string', 'typed-copy', 'typed-transfer']) {
    await page.evaluate((k) => window.__payload(k), kind); // warm: the worker parses the data once
    for (let i = 0; i < 5; i++) out.payload.push({ cpu, kind, ...(await page.evaluate((k) => window.__payload(k), kind)) });
  }
  await ctx.close();
}
await browser.close();
await srv.close();

const S = {};
for (const cpu of [1, 4]) for (const job of JOBS) {
  const rs = out.runs.filter((r) => r.cpu === cpu && r.job === job);
  const m = (f) => r0(median(rs.map(f)));
  S[`${cpu}x|${job}`] = { runs: rs.length, doneMs: m((r) => r.ms), firstMs: m((r) => r.first), maxDelay: m((r) => r.maxDelay), maxDur: m((r) => r.maxDur), over200: m((r) => r.over200), over100: m((r) => r.over100), taps: m((r) => r.taps), maxGap: m((r) => r.maxGap), gapsOver50: m((r) => r.gapsOver50), loafBlocking: m((r) => r.loafBlocking), deser: m((r) => r.deser ?? NaN), loadavg1: r1(median(rs.map((r) => r.loadavg1))) };
}
const spin = {}; for (const cpu of [1, 4]) { const s = out.spin.filter((x) => x.cpu === cpu); spin[`${cpu}x`] = { worker: r0(median(s.map((x) => x.worker))), main: r0(median(s.map((x) => x.main))) }; }
const payload = {}; for (const cpu of [1, 4]) for (const kind of ['objects', 'objects-20k', 'json-string', 'typed-copy', 'typed-transfer']) { const s = out.payload.filter((x) => x.cpu === cpu && x.kind === kind); payload[`${cpu}x|${kind}`] = { deser: r1(median(s.map((x) => x.deser))), parse: r1(median(s.map((x) => x.parse))), total: r0(median(s.map((x) => x.total))) }; }
out.summary = S; out.spinSummary = spin; out.payloadSummary = payload; out.env.loadavgAtEnd = load();
await saveResult('offmain', out);
console.table(S); console.table(spin); console.table(payload);
