// Experiment 1: can a short probe plus cheap signals tier a device? CDP CPU throttling 1x / 4x / 6x, 10 runs each,
// on a quiet page and on a page still booting (long tasks in flight). Then a runtime governor under a throttle change,
// and detect-gpu on renderer strings. Writes results/tiers.json.
//   node run-tiers.mjs [--runs 10] [--smoke]
import { launch, siteRoot, env, newPage, median, pct, r1, r0, load, saveResult, sleep } from './lib/common.mjs';
import { serve } from './lib/serve.mjs';
import { buildTiers } from './lib/build-tiers.mjs';

const args = process.argv.slice(2);
const smoke = args.includes('--smoke');
const RUNS = smoke ? 1 : Number(args[args.indexOf('--runs') + 1]) || 10;
const THROTTLES = [1, 4, 6];
const CONDS = ['quiet', 'busy'];

await buildTiers();
const srv = await serve(siteRoot);
const { browser } = await launch();
const out = { env: env(), method: '', calib: [], runs: [], governor: [], detectGpu: null };
out.method = `Fresh context per run (phone viewport 390×844 @2x). CDP Emulation.setCPUThrottlingRate throttles the renderer main thread only (Chromium thread_cpu_throttler.cc: 200 µs quanta, busy-wait). Probe starts 300 ms after load. Frame probe: tier.js makeWork() defaults (200k particles integrated + 1,000 rects on a 128² 2D canvas) once per rAF for 2 s, no early exit, so any shorter probe is evaluated on prefixes of the same runs. cond=busy: twelve ~60 ms (at 1x) CPU tasks every 90 ms during the probe (a page still booting). Calibration: ${smoke ? 1 : 5} separate runs at 1x quiet; bands at the geometric midpoints between the throttle levels (2.0× and 4.9× the calibrated 1x median). Throttle fidelity per run: a fixed loop timed before and after the probe (and, in cond=busy, each boot task) against its 1x calibration = the slowdown the throttler actually delivered; a run is "throttle-faithful" when that is within ±30% of nominal before and after the probe.`;

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
for (let i = 0; i < (smoke ? 1 : 5); i++) out.calib.push(await probeOnce(1, 'quiet'));
for (const cond of CONDS) for (const cpu of THROTTLES) for (let i = 0; i < RUNS; i++) {
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

// Governor: continuous scene, throttle 1x → 6x at 6 s → 1x at 18 s, observed to 40 s; on-demand scene at 1x, 24 s;
// each with the governor's rules and with a naive one (every interval counts, no settle time).
async function governor(mode, kind, schedule, total) {
  const { ctx, page, cdp } = await newPage(browser, {});
  await page.goto(`${srv.url}/tiers/governor.html?mode=${mode}&gov=${kind}`);
  const t0 = Date.now();
  const marks = [];
  for (const [at, rate] of schedule) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    marks.push([Date.now() - t0, rate]);
  }
  const rest = total - (Date.now() - t0);
  if (rest > 0) await sleep(rest);
  const g = await page.evaluate(() => window.__gov());
  await ctx.close();
  // per-second summary: frames rendered and level
  const f = g.frames; const t00 = f[0]?.[0] || 0;
  const perSec = [];
  for (let s = 0; s < total / 1000; s++) {
    const inS = f.filter(([t]) => t - t00 >= s * 1000 && t - t00 < (s + 1) * 1000);
    perSec.push([inS.length, inS.length ? inS[inS.length - 1][1] : null]);
  }
  return { mode, kind, marks, log: g.log.map((e) => ({ ...e, t: e.t - t00 })), refresh: r1(g.refresh), perSec, loadavg1: load()[0] };
}
const GRUNS = smoke ? 1 : 3;
for (let i = 0; i < GRUNS; i++) {
  out.governor.push(await governor('continuous', 'rules', [[0, 1], [6000, 6], [18000, 1]], smoke ? 20000 : 40000));
  out.governor.push(await governor('continuous', 'fpsavg', [[0, 1], [6000, 6], [18000, 1]], smoke ? 20000 : 40000));
  out.governor.push(await governor('ondemand', 'rules', [[0, 1]], smoke ? 10000 : 24000));
  out.governor.push(await governor('ondemand', 'fpsavg', [[0, 1]], smoke ? 10000 : 24000));
  console.log('governor run', i, out.governor.slice(-4).map((g) => `${g.mode}-${g.kind}: ${g.log.map((e) => `${e.t}ms ${e.from}→${e.to}`).join(', ')}`).join(' | '));
}

await browser.close();
await srv.close();

// ---- analysis ----
const base = median(out.calib.map((r) => median(r.frame.works.slice(3))));
const bands = [base * 2, base * Math.sqrt(24)];
const truth = { 1: 'strong', 4: 'average', 6: 'low' };
const cls = (ms) => (ms < bands[0] ? 'strong' : ms < bands[1] ? 'average' : 'low');
const baseGap = median(out.calib.map((r) => median(r.frame.gaps.slice(3))));
// frame-interval classification: frames slower than the display → the work didn't fit; use the median interval
// against the refresh, which is all a naive "fps probe" sees.
const clsGap = (ms) => (ms < 1000 / 60 * 1.25 ? 'strong' : ms < 1000 / 60 * 2.5 ? 'average' : 'low');
const PREFIX = [6, 12, 24, 48, 90];
const analysis = { base: r1(base), bands: bands.map(r1), baseGap: r1(baseGap), byCell: {} };
for (const cond of CONDS) for (const cpu of THROTTLES) {
  const rs = out.runs.filter((r) => r.cpu === cpu && r.cond === cond);
  const cell = { cond, cpu, truth: truth[cpu], runs: rs.length, loadavg1: r1(median(rs.map((r) => r.loadavg1))) };
  const works = rs.map((r) => median(r.frame.works.slice(3)));
  cell.workMedian = r1(median(works)); cell.workRange = [r1(Math.min(...works)), r1(Math.max(...works))];
  cell.workCV = r1(100 * Math.sqrt(works.reduce((s, w) => s + (w - median(works)) ** 2, 0) / works.length) / median(works));
  cell.full2s = { correct: works.filter((w) => cls(w) === truth[cpu]).length, got: works.map(cls) };
  cell.prefix = Object.fromEntries(PREFIX.map((n) => {
    const ws = rs.map((r) => median(r.frame.works.slice(3, 3 + n)));
    // time the prefix took: warm-up + n frames of intervals
    const ms = rs.map((r) => r.frame.gaps.slice(0, 2 + n).reduce((s, x) => s + x, 0));
    return [n, { correct: ws.filter((w) => cls(w) === truth[cpu]).length, ms: r0(median(ms)) }];
  }));
  // early-exit rule as tier.js implements it (min 12 frames, 12 consecutive frames clearly inside one band)
  cell.earlyExit = rs.map((r) => {
    const w = r.frame.works; let same = 0, prev = -1;
    for (let i = 3 + 12; i <= w.length; i++) {
      const m = median(w.slice(3, i)); const b = ['strong', 'average', 'low'].indexOf(cls(m));
      const edge = bands.reduce((d, e) => Math.min(d, Math.abs(Math.log(m / e))), Infinity);
      if (b === prev && edge > Math.log(1.25)) same++; else same = 0; prev = b;
      if (same >= 12) return { frames: i, ms: r0(r.frame.gaps.slice(0, i - 1).reduce((s, x) => s + x, 0)), tier: cls(m) };
    }
    return { frames: w.length, ms: r0(r.frame.ms), tier: cls(median(w.slice(3))), timeout: true };
  });
  cell.earlyExitCorrect = cell.earlyExit.filter((e) => e.tier === truth[cpu]).length;
  cell.earlyExitMs = r0(median(cell.earlyExit.map((e) => e.ms)));
  const gaps = rs.map((r) => median(r.frame.gaps.slice(3)));
  cell.gapMedian = r1(median(gaps)); cell.gapRange = [r1(Math.min(...gaps)), r1(Math.max(...gaps))];
  cell.gapCorrect = gaps.filter((g) => clsGap(g) === truth[cpu]).length;
  const bursts = rs.map((r) => r.burst.workBest);
  cell.burstMedian = r1(median(bursts)); cell.burstRange = [r1(Math.min(...bursts)), r1(Math.max(...bursts))];
  cell.burstMs = r1(median(rs.map((r) => r.burst.ms)));
  const bb = median(out.calib.map((r) => r.burst.workBest));
  const clsB = (ms) => (ms < bb * 2 ? 'strong' : ms < bb * Math.sqrt(24) ? 'average' : 'low');
  cell.burstCorrect = bursts.filter((b) => clsB(b) === truth[cpu]).length;
  // throttle fidelity: delivered slowdown vs nominal
  const spin1 = median(out.calib.map((r) => r.spinBefore ?? r.spin));
  const boot1 = spin1 * (2.5e7 / 1.6e6);
  const eff = rs.map((r) => ({ before: r.spinBefore / spin1, after: r.spinAfter / spin1, boot: r.bootMs?.length ? median(r.bootMs) / boot1 : null }));
  const faithful = (e) => Math.abs(Math.log(e.before / cpu)) < Math.log(1.3) && Math.abs(Math.log(e.after / cpu)) < Math.log(1.3);
  cell.throttleDelivered = { before: r1(median(eff.map((e) => e.before))), after: r1(median(eff.map((e) => e.after))), boot: r1(median(eff.map((e) => e.boot))), bootRange: cond === 'busy' ? [r1(Math.min(...eff.map((e) => e.boot))), r1(Math.max(...eff.map((e) => e.boot)))] : null };
  const fi = rs.map((r, i) => faithful(eff[i]));
  cell.faithfulRuns = fi.filter(Boolean).length;
  cell.full2sFaithful = { correct: works.filter((w, i) => fi[i] && cls(w) === truth[cpu]).length, of: cell.faithfulRuns };
  cell.earlyExitFaithful = { correct: cell.earlyExit.filter((e, i) => fi[i] && e.tier === truth[cpu]).length, of: cell.faithfulRuns };
  cell.signals = rs[0]?.signals; cell.gl = rs[0]?.gl; cell.detectGpu = rs[0]?.detectGpu;
  cell.detectGpuMs = r1(median(rs.map((r) => r.detectGpuMs))); cell.glMs = r1(median(rs.map((r) => r.glMs)));
  analysis.byCell[`${cond}|${cpu}x`] = cell;
}
// governor summary
analysis.governor = ['continuous|rules', 'continuous|fpsavg', 'ondemand|rules', 'ondemand|fpsavg'].map((k) => {
  const [mode, kind] = k.split('|');
  const gs = out.governor.filter((g) => g.mode === mode && g.kind === kind);
  return {
    k, runs: gs.length,
    changes: gs.map((g) => g.log.length),
    firstDownAfterThrottleMs: gs.map((g) => { const d = g.log.find((e) => e.to > e.from && e.t >= 6000); return d ? d.t - 6000 : null; }),
    falseDownBeforeThrottle: gs.map((g) => g.log.filter((e) => e.to > e.from && (mode === 'ondemand' || e.t < 6000)).length),
    finalLevel: gs.map((g) => g.log.length ? g.log[g.log.length - 1].to : 0),
    upAfterReleaseMs: gs.map((g) => { const u = g.log.find((e) => e.to < e.from && e.t >= 18000); return u ? u.t - 18000 : null; }),
    logs: gs.map((g) => g.log),
  };
});
out.analysis = analysis;
// keep raw per-frame arrays out of the saved file except for the first run of each cell (size)
const seen = new Set();
out.runs = out.runs.map((r) => { const k = `${r.cond}|${r.cpu}`; const keep = !seen.has(k); seen.add(k); return keep ? r : { ...r, frame: { frames: r.frame.frames, ms: r.frame.ms, workMedian: median(r.frame.works.slice(3)), gapMedian: median(r.frame.gaps.slice(3)) } }; });
out.calib = out.calib.map((r) => ({ workMedian: median(r.frame.works.slice(3)), gapMedian: median(r.frame.gaps.slice(3)), burst: r.burst.workBest, spinBefore: r.spinBefore, spinAfter: r.spinAfter, loadavg1: r.loadavg1 }));
out.env.loadavgAtEnd = load();
await saveResult(smoke ? 'tiers-smoke' : 'tiers', out);
console.log(JSON.stringify({ base: analysis.base, bands: analysis.bands, cells: Object.fromEntries(Object.entries(analysis.byCell).map(([k, c]) => [k, { thr: c.throttleDelivered, faithful: c.faithfulRuns, okFaithful: c.full2sFaithful, work: c.workMedian, cv: c.workCV, ok2s: c.full2s.correct, early: c.earlyExitCorrect, earlyMs: c.earlyExitMs, gap: c.gapMedian, gapOk: c.gapCorrect, burst: c.burstMedian, burstOk: c.burstCorrect }])), governor: analysis.governor.map((g) => ({ k: g.k, changes: g.changes, down: g.firstDownAfterThrottleMs, falseDown: g.falseDownBeforeThrottle, up: g.upAfterReleaseMs })) }, null, 1));
