// Experiment 1: can a short probe plus cheap signals tier a device? CDP CPU throttling 1x–6x (quiet page) and
// 1x / 4x / 6x on a page still booting (long tasks in flight), 10 runs each. Then five runtime-governor cells (a throttle
// change, a scene slow from its first frame, a scene under 4 fps, an on-demand scene, a 30 Hz display) for governor.js,
// its superseded v1, a drei PerformanceMonitor port and a port of S10's hero.js governor; and detect-gpu on renderer
// strings. Writes results/tiers.json.
//   node run-tiers.mjs [--runs 10] [--smoke] [--only probe|governor]
import { launch, siteRoot, env, newPage, median, pct, r1, r0, load, saveResult, sleep } from './lib/common.mjs';
import { serve } from './lib/serve.mjs';
import { buildTiers } from './lib/build-tiers.mjs';

const args = process.argv.slice(2);
const smoke = args.includes('--smoke');
const RUNS = smoke ? 1 : Number(args[args.indexOf('--runs') + 1]) || 10;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const THROTTLES = { quiet: [1, 2, 3, 4, 5, 6], busy: [1, 4, 6] };
const CONDS = ['quiet', 'busy'];

await buildTiers();
const srv = await serve(siteRoot);
const { browser } = await launch();
const out = { env: env(), method: '', calib: [], runs: [], governor: [], detectGpu: null };
out.method = `Fresh context per run (phone viewport 390×844 @2x). CDP Emulation.setCPUThrottlingRate throttles the renderer main thread only (Chromium thread_cpu_throttler.cc: 200 µs quanta, busy-wait). Probe starts 300 ms after load. measureRefresh() first (20 empty rAF frames, 25th percentile). Frame probe: tier.js makeWork() defaults (200k particles integrated + 1,000 rects on a 128² 2D canvas) once per rAF for 2 s, no early exit, so any shorter probe is evaluated on prefixes of the same runs. cond=busy: twelve ~60 ms (at 1x) CPU tasks every 90 ms during the probe (a page still booting). Classification (the template rule): work median as a fraction of the measured refresh, bands 0.3 / 0.6 (a RAIL-derived heuristic fixed before the runs, not fitted). Labels 1x = strong, 4x = average, 6x = low are a labelling choice; 2x/3x/5x have no label and are reported as the spread of tiers across runs (flip rate). Secondary, in-sample: bands at the geometric midpoints between the throttle levels (2.0× and 4.9× the calibrated 1x median, ${smoke ? 1 : 5} calibration runs). Throttle fidelity per run: a fixed loop timed before and after the probe (and, in cond=busy, each boot task) against its 1x calibration = the slowdown the throttler actually delivered; a run is "throttle-faithful" when that is within ±30% of nominal before and after the probe.`;

async function probeOnce(cpu, cond) {
  const { ctx, page } = await newPage(browser, { cpu });
  const la = load()[0];
  await page.goto(`${srv.url}/tiers/?cond=${cond}`);
  await page.waitForFunction(() => window.__result, null, { timeout: 60000 });
  const r = await page.evaluate(() => window.__result);
  await ctx.close();
  return { cpu, cond, loadavg1: la, ...r };
}

// calibration (independent of the test runs)
if (only !== 'governor') {
for (let i = 0; i < (smoke ? 1 : 5); i++) out.calib.push(await probeOnce(1, 'quiet'));
for (const cond of CONDS) for (const cpu of THROTTLES[cond]) for (let i = 0; i < RUNS; i++) {
  const r = await probeOnce(cpu, cond);
  out.runs.push(r);
  if (smoke || i === 0) console.log(cond, cpu + 'x', 'spin', r1(r.spinBefore), r1(r.spinAfter), 'boot', r1(median(r.bootMs || [])), 'work median', r1(median(r.frame.works.slice(3))), 'gap median', r1(median(r.frame.gaps.slice(3))), 'burst', r1(r.burst.workBest), 'gl', r.gl.renderer?.slice(0, 40), r.gl.caveat, 'dgpu', JSON.stringify(r.detectGpu), 'la', r.loadavg1);
}

// detect-gpu on renderer strings
{
  const { ctx, page } = await newPage(browser, {});
  await page.goto(`${srv.url}/tiers/detectgpu.html`);
  await page.waitForFunction(() => window.__result, null, { timeout: 60000 });
  out.detectGpu = await page.evaluate(() => window.__result);
  await ctx.close();
}
}

// Governor cells, each for governor.js ('rules'), v1, the drei port ('fpsavg') and the S10 port ('s10'):
//   switch     continuous scene, throttle 1x → 6x at 6 s → 1x at 18 s, observed to 40 s
//   slowstart  continuous scene, 6x from before navigation (slow from the first frame), 25 s
//   steady     a scene too heavy at every level (300/200/120/80 ms of work per frame), 1x, 25 s — expect the floor
//   ondemand   bursts with idle gaps at 1x, 24 s — plus 'rules-nopause' (the loop never calls pause())
//   hz30       continuous light scene at 1x on a simulated 30 Hz display, 20 s — the display, not the scene, is slow
// Throttle changes are timed on the page's clock (performance.now), the same clock as the rAF timestamps.
const GCELLS = {
  switch: { mode: 'continuous', sched: [[0, 1], [6000, 6], [18000, 1]], total: 40000, pre: 1, kinds: ['rules', 'v1', 'fpsavg', 's10'] },
  slowstart: { mode: 'continuous', sched: [], total: 25000, pre: 6, kinds: ['rules', 'v1', 'fpsavg', 's10'] },
  steady: { mode: 'steady', sched: [], total: 25000, pre: 1, kinds: ['rules', 'v1', 'fpsavg', 's10'] },
  ondemand: { mode: 'ondemand', sched: [], total: 24000, pre: 1, kinds: ['rules', 'rules-nopause', 'v1', 'fpsavg', 's10'] },
  hz30: { mode: 'continuous', hz: 30, sched: [], total: 20000, pre: 1, kinds: ['rules', 'v1', 'fpsavg', 's10'] },
};
async function governor(cell, kind) {
  const C = GCELLS[cell];
  const { ctx, page, cdp } = await newPage(browser, { cpu: C.pre });
  const t0 = Date.now();
  await page.goto(`${srv.url}/tiers/governor.html?mode=${C.mode}&gov=${kind}${C.hz ? '&hz=' + C.hz : ''}`);
  const marks = [];
  for (const [at, rate] of C.sched) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    if (at > 0) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    marks.push([await page.evaluate(() => performance.now()), rate]);
  }
  const rest = C.total - (Date.now() - t0);
  if (rest > 0) await sleep(rest);
  const g = await page.evaluate(() => window.__gov());
  await ctx.close();
  const f = g.frames; const t00 = f[0]?.[0] || 0;
  const iv = []; for (let i = 1; i < f.length; i++) iv.push(f[i][0] - f[i - 1][0]);
  const perSec = [];
  for (let s = 0; s < C.total / 1000; s++) {
    const inS = f.filter(([t]) => t - t00 >= s * 1000 && t - t00 < (s + 1) * 1000);
    perSec.push([inS.length, inS.length ? inS[inS.length - 1][1] : null]);
  }
  // interval percentiles at the final level (the last 5 s), what the visitor ends up with
  const lastT = f.length ? f[f.length - 1][0] : 0;
  const tail = []; for (let i = 1; i < f.length; i++) if (f[i][0] > lastT - 5000) tail.push(f[i][0] - f[i - 1][0]);
  return { cell, mode: C.mode, kind, t00, marks: marks.map(([t, r]) => [r0(t - t00), r]), log: g.log.map((e) => ({ ...e, t: e.t - t00 })), refresh: r1(g.refresh), refreshMeasured: r1(g.refreshMeasured), frames: f.length,
    intervals: { p50: r1(pct(iv, 0.5)), p90: r1(pct(iv, 0.9)) }, tail: { p50: r1(pct(tail, 0.5)), p90: r1(pct(tail, 0.9)) }, finalLevel: f.length ? f[f.length - 1][1] : 0, perSec, loadavg1: load()[0] };
}
const GRUNS = smoke ? 1 : 3;
if (only !== 'probe') for (let i = 0; i < GRUNS; i++) for (const [cell, C] of Object.entries(GCELLS)) for (const kind of C.kinds) {
  const r = await governor(cell, kind);
  out.governor.push(r);
  console.log('governor', i, cell, kind, `refresh ${r.refreshMeasured ?? '-'}→${r.refresh ?? '-'} frames ${r.frames} p50/p90 ${r.intervals.p50}/${r.intervals.p90} final L${r.finalLevel} tail p50/p90 ${r.tail.p50}/${r.tail.p90}`, r.log.map((e) => `${e.t}ms ${e.from}→${e.to}${e.floor ? ' FLOOR' : ''}`).join(', '), 'la', r.loadavg1);
}

await browser.close();
await srv.close();

// ---- governor analysis → results/governor.json ----
if (only !== 'probe') {
  const G = {};
  for (const [cell, C] of Object.entries(GCELLS)) for (const kind of C.kinds) {
    const gs = out.governor.filter((g) => g.cell === cell && g.kind === kind);
    const downs = (g) => g.log.filter((e) => e.to > e.from);
    const thr = (g) => g.marks.find(([, r]) => r === 6)?.[0];
    const rel = (g) => g.marks.find(([t, r]) => r === 1 && t > 1000)?.[0];
    G[`${cell}|${kind}`] = {
      runs: gs.length,
      refreshMeasured: gs.map((g) => g.refreshMeasured), refreshEnd: gs.map((g) => g.refresh),
      intervalP50: gs.map((g) => g.intervals.p50),
      stepDowns: gs.map((g) => downs(g).length),
      firstDownMs: gs.map((g) => { const d = downs(g).find((e) => cell !== 'switch' || e.t >= thr(g)); return d ? d.t - (cell === 'switch' ? thr(g) : 0) : null; }),
      falseDowns: gs.map((g) => (cell === 'switch' ? downs(g).filter((e) => e.t < thr(g)).length : cell === 'ondemand' || cell === 'hz30' ? downs(g).length : 0)),
      floorMs: gs.map((g) => g.log.find((e) => e.floor)?.t ?? null),
      upAfterReleaseMs: cell === 'switch' ? gs.map((g) => { const u = g.log.find((e) => e.to < e.from && e.t >= rel(g)); return u ? u.t - rel(g) : null; }) : undefined,
      finalLevel: gs.map((g) => g.finalLevel), tailP50: gs.map((g) => g.tail.p50), tailP90: gs.map((g) => g.tail.p90),
      loadavg1: gs.map((g) => g.loadavg1),
    };
  }
  await saveResult(smoke ? 'governor-smoke' : 'governor', { env: { ...env(), loadavgAtEnd: load() }, cells: GCELLS, summary: G, runs: out.governor.map(({ perSec, ...g }) => ({ ...g, perSec })) });
  console.log(JSON.stringify(G, null, 0).replace(/\},"/g, '},\n"'));
}
if (only === 'governor') process.exit(0);

// ---- probe analysis → results/tiers.json ----
const R = (r) => r.refreshMs || 1000 / 60;
const EDGES = [0.3, 0.6];
const tierOf = (ms, refresh) => { const f = ms / refresh; return f < EDGES[0] ? 'strong' : f < EDGES[1] ? 'average' : 'low'; };
const base = median(out.calib.map((r) => median(r.frame.works.slice(3))));
const bands = [base * 2, base * Math.sqrt(24)];
const truth = { 1: 'strong', 4: 'average', 6: 'low' };
const cls = (ms) => (ms < bands[0] ? 'strong' : ms < bands[1] ? 'average' : 'low');
const baseGap = median(out.calib.map((r) => median(r.frame.gaps.slice(3))));
// frame-interval classification: what a naive "fps probe" sees (the median interval against 60 Hz)
const clsGap = (ms) => (ms < 1000 / 60 * 1.25 ? 'strong' : ms < 1000 / 60 * 2.5 ? 'average' : 'low');
const PREFIX = [6, 12, 24, 48, 90];
const count = (xs) => xs.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {});
const analysis = { rule: 'work median / measured refresh: < 0.3 strong, < 0.6 average, else low', base: r1(base), inSampleBands: bands.map(r1), baseGap: r1(baseGap), refreshMeasured: null, byCell: {} };
analysis.refreshMeasured = { median: r1(median(out.runs.map(R))), range: [r1(Math.min(...out.runs.map(R))), r1(Math.max(...out.runs.map(R)))] };
for (const cond of CONDS) for (const cpu of THROTTLES[cond]) {
  const rs = out.runs.filter((r) => r.cpu === cpu && r.cond === cond);
  const cell = { cond, cpu, label: truth[cpu] || null, runs: rs.length, loadavg1: r1(median(rs.map((r) => r.loadavg1))) };
  const works = rs.map((r) => median(r.frame.works.slice(3)));
  const fr = rs.map((r, i) => works[i] / R(r));
  cell.workMedian = r1(median(works)); cell.workRange = [r1(Math.min(...works)), r1(Math.max(...works))];
  cell.fraction = { median: Math.round(median(fr) * 100) / 100, min: Math.round(Math.min(...fr) * 100) / 100, max: Math.round(Math.max(...fr) * 100) / 100 };
  cell.workCV = r1(100 * Math.sqrt(works.reduce((s, w) => s + (w - median(works)) ** 2, 0) / works.length) / median(works));
  // the template rule, full 2 s
  const got = rs.map((r, i) => tierOf(works[i], R(r)));
  const dist = count(got); const modal = Math.max(...Object.values(dist));
  cell.rule2s = { dist, correct: truth[cpu] ? got.filter((g) => g === truth[cpu]).length : null, flipRate: Math.round((1 - modal / rs.length) * 100) / 100 };
  // heavier work unit (the same page doing 2× the per-frame JS): arithmetic on the same runs
  const got2 = rs.map((r, i) => tierOf(2 * works[i], R(r)));
  cell.rule2sDoubleWork = count(got2);
  cell.prefix = Object.fromEntries(PREFIX.map((n) => {
    const g = rs.map((r) => tierOf(median(r.frame.works.slice(3, 3 + n)), R(r)));
    const ms = rs.map((r) => r.frame.gaps.slice(0, 2 + n).reduce((s, x) => s + x, 0));
    return [n, { dist: count(g), correct: truth[cpu] ? g.filter((x) => x === truth[cpu]).length : null, ms: r0(median(ms)) }];
  }));
  // early exit as tier.js implements it (min 12 frames, 12 consecutive frames clearly inside one band; 1.5 s cap)
  cell.earlyExit = rs.map((r) => {
    const w = r.frame.works; let same = 0, prev = -1; const E = EDGES.map((e) => e * R(r));
    let elapsed = 0;
    for (let i = 1; i <= w.length; i++) {
      elapsed += r.frame.gaps[i - 2] || 0;
      if (elapsed >= 1500) return { frames: i, ms: r0(elapsed), tier: i - 3 >= 12 ? tierOf(median(w.slice(3, i)), R(r)) : 'undetermined', timeout: true };
      if (i < 3 + 12) continue;
      const m = median(w.slice(3, i)); const t = tierOf(m, R(r)); const b = ['strong', 'average', 'low'].indexOf(t);
      const edge = E.reduce((d, e) => Math.min(d, Math.abs(Math.log(m / e))), Infinity);
      if (b === prev && edge > Math.log(1.25)) same++; else same = 0; prev = b;
      if (same >= 12) return { frames: i, ms: r0(elapsed), tier: t };
    }
    return { frames: w.length, ms: r0(r.frame.ms), tier: tierOf(median(w.slice(3)), R(r)), timeout: true };
  });
  cell.earlyExitDist = count(cell.earlyExit.map((e) => e.tier));
  cell.earlyExitCorrect = truth[cpu] ? cell.earlyExit.filter((e) => e.tier === truth[cpu]).length : null;
  cell.earlyExitMs = r0(median(cell.earlyExit.map((e) => e.ms)));
  cell.earlyExitMsRange = [r0(Math.min(...cell.earlyExit.map((e) => e.ms))), r0(Math.max(...cell.earlyExit.map((e) => e.ms)))];
  // in-sample bands (calibration midpoints), for comparison with the first report
  cell.inSample2s = { dist: count(works.map(cls)), correct: truth[cpu] ? works.filter((w) => cls(w) === truth[cpu]).length : null };
  const gaps = rs.map((r) => median(r.frame.gaps.slice(3)));
  cell.gapMedian = r1(median(gaps)); cell.gapRange = [r1(Math.min(...gaps)), r1(Math.max(...gaps))];
  cell.gapDist = count(gaps.map(clsGap)); cell.gapCorrect = truth[cpu] ? gaps.filter((g) => clsGap(g) === truth[cpu]).length : null;
  const bursts = rs.map((r) => r.burst.workBest);
  cell.burstMedian = r1(median(bursts)); cell.burstRange = [r1(Math.min(...bursts)), r1(Math.max(...bursts))];
  cell.burstMs = r1(median(rs.map((r) => r.burst.ms)));
  const bb = median(out.calib.map((r) => r.burst.workBest));
  const clsB = (ms) => (ms < bb * 2 ? 'strong' : ms < bb * Math.sqrt(24) ? 'average' : 'low');
  cell.burstCorrect = truth[cpu] ? bursts.filter((b) => clsB(b) === truth[cpu]).length : null;
  // throttle fidelity: delivered slowdown vs nominal
  const spin1 = median(out.calib.map((r) => r.spinBefore ?? r.spin));
  const boot1 = spin1 * (2.5e7 / 1.6e6);
  const eff = rs.map((r) => ({ before: r.spinBefore / spin1, after: r.spinAfter / spin1, boot: r.bootMs?.length ? median(r.bootMs) / boot1 : null }));
  const faithful = (e) => Math.abs(Math.log(e.before / cpu)) < Math.log(1.3) && Math.abs(Math.log(e.after / cpu)) < Math.log(1.3);
  cell.throttleDelivered = { before: r1(median(eff.map((e) => e.before))), after: r1(median(eff.map((e) => e.after))), boot: r1(median(eff.map((e) => e.boot))), bootRange: cond === 'busy' ? [r1(Math.min(...eff.map((e) => e.boot))), r1(Math.max(...eff.map((e) => e.boot)))] : null };
  const fi = rs.map((r, i) => faithful(eff[i]));
  cell.faithfulRuns = fi.filter(Boolean).length;
  cell.rule2sFaithful = { dist: count(got.filter((g, i) => fi[i])), of: cell.faithfulRuns };
  cell.signals = rs[0]?.signals; cell.gl = rs[0]?.gl; cell.detectGpu = rs[0]?.detectGpu;
  cell.detectGpuMs = r1(median(rs.map((r) => r.detectGpuMs))); cell.glMs = r1(median(rs.map((r) => r.glMs))); cell.refreshCostMs = r0(median(rs.map((r) => r.refreshCostMs)));
  analysis.byCell[`${cond}|${cpu}x`] = cell;
}
out.analysis = analysis;
delete out.governor;
// keep raw per-frame arrays out of the saved file except for the first run of each cell (size)
const seen = new Set();
out.runs = out.runs.map((r) => { const k = `${r.cond}|${r.cpu}`; const keep = !seen.has(k); seen.add(k); return keep ? r : { ...r, frame: { frames: r.frame.frames, ms: r.frame.ms, workMedian: median(r.frame.works.slice(3)), gapMedian: median(r.frame.gaps.slice(3)) } }; });
out.calib = out.calib.map((r) => ({ workMedian: median(r.frame.works.slice(3)), gapMedian: median(r.frame.gaps.slice(3)), refreshMs: r.refreshMs, burst: r.burst.workBest, spinBefore: r.spinBefore, spinAfter: r.spinAfter, loadavg1: r.loadavg1 }));
out.env.loadavgAtEnd = load();
await saveResult(smoke ? 'tiers-smoke' : 'tiers', out);
console.log(JSON.stringify({ refresh: analysis.refreshMeasured, base: analysis.base, cells: Object.fromEntries(Object.entries(analysis.byCell).map(([k, c]) => [k, { thr: c.throttleDelivered, faithful: c.faithfulRuns, work: c.workMedian, frac: c.fraction, rule: c.rule2s, p24: c.prefix[24], early: c.earlyExitDist, earlyMs: c.earlyExitMs, dbl: c.rule2sDoubleWork, gap: c.gapDist, burstOk: c.burstCorrect }])) }, null, 1));
