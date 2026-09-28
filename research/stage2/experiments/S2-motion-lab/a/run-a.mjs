// Part A runner: the same seven interactions in every tool, measured the same way.
//   node a/run-a.mjs [--runs 5] [--only css,gsap]
// Writes captures/a-results.json (run.mjs folds it into results.json).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { launch, median, round } from '../lib/browser.mjs';
import { buildA, IMPLS } from './build.mjs';
import { parseArgs } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
import { startScreencast, firstRowOfColour } from '../lib/screencast.mjs';

const args = parseArgs();
const RUNS = +(args.runs || 5);
const only = args.only ? String(args.only).split(',') : null;
const harness = await readFile(path.join(labRoot, 'a/harness.js'), 'utf8');
const VIEWPORT = { width: 1000, height: 800 };
const SLOW = 4; // interruption runs play every duration 4x slower (tokens.js ?slow=4), waits scaled the same
const withQ = (q, extra) => (q ? `${q}&${extra}` : `?${extra}`);

const ALL = ['press', 'list', 'sheet', 'view', 'scroll', 'ticker', 'grid'];
export const VARIANTS = [
  { id: 'css', impl: 'css', q: '' },
  { id: 'css-vt-list', impl: 'css', q: '?list=vt', only: ['list'] },
  { id: 'css-vt-list-pe', impl: 'css', q: '?list=vt&vtpe', only: ['list'] },
  { id: 'css-vtpe', impl: 'css', q: '?vtpe', only: ['view'] },
  { id: 'motion', impl: 'motion', q: '' },
  { id: 'motion-hw', impl: 'motion', q: '?hw', only: ['press', 'list', 'sheet'] },
  { id: 'motion-react', impl: 'motion-react', q: '' },
  { id: 'motion-react-vt', impl: 'motion-react', q: '?view=react-vt', only: ['view'] },
  { id: 'gsap', impl: 'gsap', q: '' },
  { id: 'anime', impl: 'anime', q: '' },
  { id: 'spring', impl: 'spring', q: '' },
  { id: 'autoanimate', impl: 'autoanimate', q: '', only: ['list', 'sheet', 'grid'] },
  { id: 'theatre', impl: 'theatre', q: '', only: ['grid'] },
];
const BUTTONS = { press: '#press', shuffle: '#shuffle', sheet: '#sheet-toggle', swap: '#swap', hi: '#tick-hi', lo: '#tick-lo', grid: '#grid-toggle' };

async function openPage(browser, base, v, { reducedMotion = 'no-preference', guard = true, slow = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, reducedMotion, deviceScaleFactor: 1 });
  await ctx.addInitScript(`window.__RM_GUARD = ${guard};`);
  await ctx.addInitScript(harness);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/captures/a/${v.impl}.html${slow !== 1 ? withQ(v.q, `slow=${slow}`) : v.q}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const c = await page.evaluate((B) => Object.fromEntries(Object.entries(B).map(([k, s]) => {
    const r = document.querySelector(s)?.getBoundingClientRect(); return [k, r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null]; })), BUTTONS);
  return { ctx, page, c, errors };
}
const click = async (page, pt) => { if (pt) await page.mouse.click(pt.x, pt.y); };

// ---------- interruption scenarios ----------
const K = SLOW;
const SCEN = {
  press: { keys: ['press'], ms: 450 * K, from: 1, to: 0.97, final: 1, intType: 'pointerup',
    act: async (p, c) => { await p.mouse.move(c.press.x, c.press.y); await p.mouse.down(); await p.waitForTimeout(40 * K); await p.mouse.up(); } },
  list: { keys: ['list'], ms: 900 * K, from: 0, to: 128, final: 0, intType: 'click', intId: 'shuffle',
    act: async (p, c) => { await click(p, c.shuffle); await p.waitForTimeout(120 * K); await click(p, c.shuffle); } },
  sheet: { keys: ['sheet', 'sheetOp'], ms: 1100 * K, from: 280, to: 0, final: 280, intType: 'click', intId: 'sheet-toggle',
    act: async (p, c) => { await click(p, c.sheet); await p.waitForTimeout(150 * K); await click(p, c.sheet); } },
  view: { keys: ['viewMix', 'viewX'], ms: 1200 * K, from: 0, to: 1, final: 0, intType: 'click', intId: 'swap', key: 'viewMix',
    act: async (p, c) => { await click(p, c.swap); await p.waitForTimeout(150 * K); await click(p, c.swap); } },
  ticker: { keys: ['ticker'], ms: 1500 * K, from: 0, to: 1000, final: 200, intType: 'click', intId: 'tick-lo',
    act: async (p, c) => { await click(p, c.hi); await p.waitForTimeout(300 * K); await click(p, c.lo); } },
  grid: { keys: ['g0', 'g11'], ms: 1200 * K, from: 0, to: 1, final: 0, intType: 'click', intId: 'grid-toggle', key: 'g0', key2: 'g11',
    act: async (p, c) => { await click(p, c.grid); await p.waitForTimeout(150 * K); await click(p, c.grid); } },
};

async function record(page, keys, ms, act) {
  await page.evaluate(({ keys, ms }) => { window.__events.length = 0; window.__p = window.__record(ms, keys); }, { keys, ms });
  await act();
  const samples = await page.evaluate(() => window.__p);
  const events = await page.evaluate(() => window.__events);
  return { samples, events };
}

// Continuity of the animated value at the moment of interruption.
//   continuous        — the first frames after the input continue from the value on screen (retarget or reverse)
//   snaps-to-new      — the value jumps (most of the way) to the new target: the old animation was cut, no motion back
//   jumps-to-old      — the old animation is finished instantly, then (maybe) the new one starts from its end
//   jump              — any other discontinuity (e.g. a restart from the initial value)
function analyseInterrupt(samples, key, tInt, sc) {
  const range = Math.abs(sc.to - sc.from);
  const S = samples.filter((s) => s[key] != null);
  const i0 = S.findLastIndex((s) => s.t < tInt);
  if (i0 < 1 || i0 >= S.length - 3) return { error: 'interrupt outside samples' };
  const v = S.map((s) => s[key]);
  const steps = v.map((x, i) => (i ? Math.abs(x - v[i - 1]) : 0));
  const maxPre = Math.max(...steps.slice(1, i0 + 1));
  const disc = Math.max(steps[i0 + 1], steps[i0 + 2]);
  const reached = (v[i0] - sc.from) / (sc.to - sc.from);
  const dirOld = Math.sign(v[i0] - v[Math.max(0, i0 - 2)]);
  let momentum = 0; for (let i = i0 + 1; i < v.length && Math.sign(v[i] - v[i - 1]) === dirOld && dirOld !== 0; i++) momentum++;
  const tol = range * 0.01;
  let settle = null;
  for (let i = i0 + 1; i < v.length; i++) if (v.slice(i).every((x) => Math.abs(x - sc.final) <= tol)) { settle = S[i].t - tInt; break; }
  const finalOk = Math.abs(v.at(-1) - sc.final) <= tol * 2;
  const continuous = disc <= 1.5 * maxPre + 0.03 * range;
  const after = v[Math.min(v.length - 1, i0 + 2)];
  const kind = continuous ? 'continuous'
    : Math.abs(after - sc.final) <= 0.1 * range ? 'snaps-to-new'
      : Math.abs(after - sc.to) <= 0.1 * range ? 'jumps-to-old' : 'jump';
  return { reachedPct: round(reached * 100, 0), discPct: round((disc / range) * 100, 1), maxPreStepPct: round((maxPre / range) * 100, 1),
    kind, jump: !continuous, momentumFrames: momentum, settleMs: settle == null ? null : round(settle / SLOW, 0), finalOk };
}

async function interruptRun(browser, base, v, name) {
  const sc = SCEN[name];
  const { ctx, page, c, errors } = await openPage(browser, base, v, { slow: SLOW });
  const { samples, events } = await record(page, sc.keys, sc.ms, () => sc.act(page, c));
  await ctx.close();
  const key = sc.key || sc.keys[0];
  const clicks = events.filter((e) => e.type === sc.intType);
  // The second input must reach the control. During a view transition Chromium hit-tests the root element,
  // so the click lands on <html> and the transition cannot be interrupted at all.
  const second = clicks.at(-1);
  if (!second) return { error: 'no input event', errors };
  if (sc.intId && second.id !== sc.intId) {
    const S = samples.filter((s) => s[key] != null); const v = S.map((s) => s[key]);
    return { kind: 'input-swallowed', swallowedBy: second.tag.toLowerCase(), finalValue: v.at(-1), jump: false, errors: errors.slice(0, 3) };
  }
  const tInt = second.t;
  const r = analyseInterrupt(samples, key, tInt, sc);
  if (sc.key2) r.last = analyseInterrupt(samples, sc.key2, tInt, sc);
  if (name === 'sheet') r.opacityDip = samples.some((s) => s.sheet < 279 && s.sheetOp > 0.02 && s.sheetOp < 0.98);
  r.errors = errors.slice(0, 3);
  r.trace = samples.map((s) => [round(s.t - tInt, 0), s[key]]).filter((_, i) => i % 2 === 0);
  return r;
}

// ---------- single-trigger runs: does it move, fade or change instantly (for reduced-motion comparison) ----------
const SINGLE = {
  press: { keys: ['press'], ms: 500, act: async (p, c) => { await p.mouse.move(c.press.x, c.press.y); await p.mouse.down(); await p.waitForTimeout(250); await p.mouse.up(); },
    classify: (S) => ({ moves: S.some((s) => s.press < 0.995), fades: false, final: S.at(-1).press > 0.995 }) },
  list: { keys: ['list'], ms: 700, act: async (p, c) => click(p, c.shuffle),
    classify: (S) => ({ moves: S.some((s) => s.list > 2 && s.list < 126), fades: false, final: Math.abs(S.at(-1).list - 128) < 2 }) },
  sheet: { keys: ['sheet', 'sheetOp'], ms: 800, act: async (p, c) => click(p, c.sheet),
    classify: (S) => ({ moves: S.some((s) => s.sheet > 2 && s.sheet < 278), fades: S.some((s) => s.sheetOp > 0.03 && s.sheetOp < 0.97), final: S.at(-1).sheet < 1 && S.at(-1).sheetOp > 0.99 }) },
  view: { keys: ['viewMix', 'viewX'], ms: 900, act: async (p, c) => click(p, c.swap),
    classify: (S) => ({ moves: S.some((s) => s.viewX > 1), fades: S.some((s) => s.viewMix > 0.03 && s.viewMix < 0.97), final: S.at(-1).viewMix > 0.97 }) },
  // A 500 ms user-like scroll (one scrollTo per frame) that brings reveal #2 fully into view.
  scroll: { keys: ['reveal2', 'reveal2y', 'progress', 'scrollFrac'], ms: 1300, act: async (p) => { await p.evaluate(() => new Promise((res) => {
      const y1 = document.querySelector('#r2').getBoundingClientRect().top + scrollY - 500; const t0 = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - t0) / 500); scrollTo(0, y1 * k); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step); })); },
    classify: (S) => { const during = S.filter((s) => s.scrollFrac > 0.01);
      const err = during.map((s) => Math.abs((s.progress ?? 0) - s.scrollFrac));
      return { moves: during.some((s) => Math.abs(s.reveal2y) > 0.5), fades: during.some((s) => s.reveal2 > 0.03 && s.reveal2 < 0.97), final: S.at(-1).reveal2 > 0.99,
        progressErrMean: err.length ? round(err.reduce((a, b) => a + b, 0) / err.length, 4) : null, progressErrMax: err.length ? round(Math.max(...err), 4) : null }; } },
  ticker: { keys: ['ticker'], ms: 1100, act: async (p, c) => click(p, c.hi),
    classify: (S) => ({ moves: new Set(S.map((s) => s.ticker)).size > 3, fades: false, final: S.at(-1).ticker === 1000 }) },
  grid: { keys: ['g0', 'g11', 'g11y'], ms: 1000, act: async (p, c) => click(p, c.grid),
    classify: (S) => ({ moves: S.some((s) => s.g11y > 0.5 && s.g11y < 11.5), fades: S.some((s) => s.g11 > 0.03 && s.g11 < 0.97), final: S.at(-1).g11 > 0.99 }) },
};

async function singleRun(browser, base, v, name, mode) {
  const sc = SINGLE[name];
  const opts = mode === 'normal' ? { reducedMotion: 'no-preference', guard: true } : mode === 'reduce-default' ? { reducedMotion: 'reduce', guard: false } : { reducedMotion: 'reduce', guard: true };
  const { ctx, page, c, errors } = await openPage(browser, base, v, opts);
  const { samples, events } = await record(page, sc.keys, sc.ms, () => sc.act(page, c));
  await ctx.close();
  const t0 = events.find((e) => e.type === (name === 'scroll' ? 'scroll' : name === 'press' ? 'pointerdown' : 'click'))?.t ?? samples[0].t;
  const S = samples.filter((s) => s.t >= t0 - 1);
  const r = sc.classify(S.length ? S : samples);
  // time until the last change
  const key = SINGLE[name].keys[0];
  let lastChange = null; for (let i = S.length - 1; i > 0; i--) if (JSON.stringify(sc.keys.map((k) => S[i][k])) !== JSON.stringify(sc.keys.map((k) => S[i - 1][k]))) { lastChange = S[i].t - t0; break; }
  r.doneMs = lastChange == null ? 0 : round(lastChange, 0);
  r.state = r.moves ? 'moves' : r.fades ? 'fades' : 'instant';
  if (errors.length) r.errors = errors.slice(0, 2);
  return r;
}

// ---------- compositor: does the sheet keep moving while the main thread is blocked for 400 ms? ----------
async function compositorRun(browser, base, v) {
  const { ctx, page } = await openPage(browser, base, v);
  const cast = await startScreencast(page);
  await page.waitForTimeout(300);
  const block = await page.evaluate(() => new Promise((res) => { document.querySelector('#sheet-toggle').click();
    requestAnimationFrame(() => requestAnimationFrame(() => res(window.__busy(400)))); }));
  await page.waitForTimeout(600);
  const frames = await cast.stop();
  await ctx.close();
  const tops = frames.filter((f) => f.wall > block.t0 + 30 && f.wall < block.t1 - 5).map((f) => firstRowOfColour(f, 100, [26, 127, 55]));
  const vals = tops.map((t) => (t == null ? 800 : t));
  // No screencast frame during the block means nothing on screen changed: the sheet froze.
  return { framesInBlock: vals.length, movedPx: vals.length ? round(Math.max(...vals) - Math.min(...vals), 0) : 0 };
}

// ---------- main-thread cost of the whole set, 4x CPU throttle, no sampler ----------
async function costRun(browser, base, v, idle) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  await ctx.addInitScript('window.__RM_GUARD = true;');
  // count requestAnimationFrame callbacks, to see whether anything keeps ticking at rest
  await ctx.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__rafN = 0;
    window.requestAnimationFrame = (cb) => raf((t) => { window.__rafN++; cb(t); }); });
  const page = await ctx.newPage();
  await page.goto(`${base}/captures/a/${v.impl}.html${v.q}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const c = await page.evaluate((B) => Object.fromEntries(Object.entries(B).map(([k, s]) => { const r = document.querySelector(s)?.getBoundingClientRect(); return [k, r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null]; })), BUTTONS);
  const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const a = await m();
  const W = (ms) => page.waitForTimeout(ms);
  const has = (k) => !v.only || v.only.includes(k);
  if (!idle) {
    if (has('press')) { await page.mouse.move(c.press.x, c.press.y); await page.mouse.down(); await W(150); await page.mouse.up(); } await W(300);
    if (has('list')) await click(page, c.shuffle); await W(400);
    if (has('sheet')) await click(page, c.sheet); await W(500);
    if (has('view')) await click(page, c.swap); await W(600);
    if (has('ticker')) await click(page, c.hi); await W(1000);
    if (has('grid')) await click(page, c.grid); await W(800);
    for (const y of [300, 600, 900]) { await page.evaluate((y) => scrollTo(0, y), y); await W(200); }
  } else await W(300 + 400 + 500 + 600 + 1000 + 800 + 600 + 150);
  await W(500);
  const b = await m();
  // then 2 s at rest: anything still ticking?
  const n0 = await page.evaluate(() => window.__rafN);
  const r0 = await m(); await W(2000); const r1 = await m();
  const n1 = await page.evaluate(() => window.__rafN);
  await ctx.close();
  return { task: (b.TaskDuration - a.TaskDuration) * 1000, script: (b.ScriptDuration - a.ScriptDuration) * 1000,
    layout: (b.LayoutDuration - a.LayoutDuration) * 1000, style: (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000,
    restTaskPerS: ((r1.TaskDuration - r0.TaskDuration) * 1000) / 2, restRafPerS: (n1 - n0) / 2 };
}

export async function runA() {
  const sizes = await buildA();
  const { base, close } = await serve();
  const { browser } = await launch();
  const results = { sizes, interrupt: {}, single: {}, compositor: {}, cost: {}, env: { browser: browser.version(), runs: RUNS, viewport: VIEWPORT } };
  const variants = VARIANTS.filter((v) => !only || only.includes(v.id) || only.includes(v.impl));
  for (const v of variants) {
    const list = v.only || ALL;
    results.interrupt[v.id] = {}; results.single[v.id] = {};
    for (const name of list) {
      if (SCEN[name]) {
        const runs = []; for (let i = 0; i < RUNS; i++) runs.push(await interruptRun(browser, base, v, name));
        const ok = runs.filter((r) => !r.error);
        const pick = ok.length ? [...ok].sort((x, y) => (x.discPct ?? 0) - (y.discPct ?? 0))[ok.length >> 1] : runs[0];
        const kinds = {}; for (const r of ok) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
        results.interrupt[v.id][name] = { ...pick, kinds, runs: ok.length, discPctMedian: median(ok.map((r) => r.discPct)), settleMsMedian: median(ok.map((r) => r.settleMs)) };
      }
      results.single[v.id][name] = {};
      for (const mode of ['normal', 'reduce-default', 'reduce-guard']) results.single[v.id][name][mode] = await singleRun(browser, base, v, name, mode);
      process.stderr.write(`A ${v.id} ${name}\n`);
    }
    if (list.includes('sheet')) { const cr = []; for (let i = 0; i < 3; i++) cr.push(await compositorRun(browser, base, v)); results.compositor[v.id] = { movedPx: median(cr.map((r) => r.movedPx)), framesInBlock: median(cr.map((r) => r.framesInBlock)) }; }
    const costs = []; for (let i = 0; i < RUNS; i++) costs.push(await costRun(browser, base, v, false));
    results.cost[v.id] = Object.fromEntries(['task', 'script', 'layout', 'style', 'restTaskPerS', 'restRafPerS'].map((k) => [k, round(median(costs.map((c) => c[k])), 1)]));
  }
  const idles = []; for (let i = 0; i < RUNS; i++) idles.push(await costRun(browser, base, { impl: 'css', q: '' }, true));
  results.cost.idleBaseline = Object.fromEntries(['task', 'script', 'layout', 'style', 'restTaskPerS', 'restRafPerS'].map((k) => [k, round(median(idles.map((c) => c[k])), 1)]));
  await browser.close(); await close();
  await mkdir(path.join(labRoot, 'captures'), { recursive: true });
  await writeFile(path.join(labRoot, 'captures/a-results.json'), JSON.stringify(results, null, 1));
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) { const r = await runA(); console.log(JSON.stringify({ interrupt: r.interrupt }, (k, v) => (k === 'trace' ? undefined : v), 1).slice(0, 4000)); }
