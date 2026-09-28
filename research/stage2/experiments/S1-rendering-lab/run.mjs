#!/usr/bin/env node
// S1 rendering lab: rebuild every variant, measure everything, write results.json and results.md.
//
//   node run.mjs                       # everything (≈ 1.5–2 h on 4 shared CPUs)
//   node run.mjs --runs 1              # one run per cell (≈ 25 min), for a quick look
//   node run.mjs --phase main --only pixi,three --n 2000 --throttle 4
//
// Phases: build, shots, main, worker, present, domprobe, a11y, contextloss, reduced, nowebgl, survey, report (default: all, in that order).
// Results merge into results.json by key, so a partial run replaces only the cells it measured.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { buildAll, DIST, MAIN, A11Y, VARIANTS } from './lib/build.mjs';
import { serve } from './lib/serve.mjs';
import { launchBrowser, runOne, median } from './lib/measure.mjs';
import { contactSheet } from './lib/sheet.mjs';
import { runSurvey } from './lib/survey.mjs';
import { writeReport } from './lib/report.mjs';
import { domProbe } from './lib/domprobe.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const list = (k, d) => (arg(k) ? arg(k).split(',') : d);
const RUNS = Number(arg('runs', 5));
const PHASES = list('phase', ['build', 'shots', 'main', 'worker', 'present', 'domprobe', 'a11y', 'contextloss', 'reduced', 'nowebgl', 'survey', 'report']);
const ONLY = arg('only') ? arg('only').split(',') : null;
const NS = list('n', ['20', '200', '2000']).map(Number);
const THROTTLES = list('throttle', ['1', '4']).map(Number);
const pick = (names) => (ONLY ? names.filter((n) => ONLY.includes(n)) : names);

const RESULTS = path.join(here, 'results.json');
const results = existsSync(RESULTS) ? JSON.parse(await readFile(RESULTS, 'utf8')) : {};
const save = async () => { await writeFile(RESULTS, JSON.stringify(results, null, 1)); };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Median of each numeric leaf across runs (for the summary rows).
function summarise(runs) {
  const ok = runs.filter((r) => !r.failed);
  const get = (f) => median(ok.map(f).filter((x) => typeof x === 'number'));
  if (!ok.length) return { failed: runs[0]?.failed, info: runs[0]?.info };
  return {
    runs: ok.length, renderer: ok[0].info?.renderer,
    ttff: get((r) => r.ttff),
    fps: get((r) => r.steady.fps), frameMedian: get((r) => r.steady.median), frameP95: get((r) => r.steady.p95),
    over25: get((r) => r.steady.over25), longShare: get((r) => r.steady.longShare),
    mainFps: get((r) => r.steady.main?.fps), mainP95: get((r) => r.steady.main?.p95),
    busyPct: get((r) => r.steady.busyPct), scriptPct: get((r) => r.steady.scriptPct),
    rendererCpu: get((r) => r.steady.cpuPct?.renderer), gpuCpu: get((r) => r.steady.cpuPct?.GPU), browserCpu: get((r) => r.steady.cpuPct?.browser),
    rendererMsPerFrame: get((r) => r.steady.rendererMsPerFrame),
    jsMs: get((r) => r.steady.js?.median), jsP95: get((r) => r.steady.js?.p95),
    rafCalls: get((r) => r.steady.rafCalls),
    drawCalls: get((r) => r.steady.drawCalls),
    moveToFrame: get((r) => r.drag?.moveToFrame.median), moveToFrameP95: get((r) => r.drag?.moveToFrame.p95),
    moveDelay: get((r) => r.drag?.moveDelay.median), moveDelayP95: get((r) => r.drag?.moveDelay.p95),
    dragFps: get((r) => r.drag?.frames.fps),
    eventTimingMax: get((r) => (typeof r.drag?.eventTimingMax === 'number' ? r.drag.eventTimingMax : 0)),
    dragOk: ok.every((r) => !r.drag || (r.drag.picked && r.drag.dropped === 1 && Math.abs(r.drag.moved[0]) > 60)),
    heapMB: get((r) => r.heapMB), domNodes: get((r) => r.domNodes),
    jsFiles: ok[0].jsFiles,
  };
}

async function matrix(browser, base, section, cells) {
  results[section] ??= {};
  const keyOf = (c) => [c.label ?? c.variant, c.n, `${c.throttle}x`, c.load ? `load${c.load}` : '', c.reduced ? 'reduced' : ''].filter(Boolean).join('|');
  // Round-robin inside each group of comparable cells (same N, throttle, load, reduced): run 1 of every
  // variant, then run 2 of every variant, … so drifting background load on the shared CPUs hits every
  // variant alike instead of whichever happened to run during a busy minute.
  const groups = new Map();
  for (const c of cells) { const g = [c.n, c.throttle, c.load, c.reduced].join('|'); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); }
  for (const group of groups.values()) {
    const runs = new Map(group.map((c) => [keyOf(c), []]));
    const failed = new Set();
    const reps = Math.max(...group.map((c) => c.runs ?? RUNS));
    for (let i = 0; i < reps; i++) {
      for (const c of group) {
        const key = keyOf(c);
        if (failed.has(key) || i >= (c.runs ?? RUNS)) continue;
        const r = await runOne(browser, base, c);
        r.loadavg = os.loadavg().map((x) => Math.round(x * 10) / 10);
        runs.get(key).push(r);
        if (r.failed) { log(key, 'FAILED', r.failed); failed.add(key); }
      }
    }
    for (const c of group) {
      const key = keyOf(c);
      const s = summarise(runs.get(key));
      s.loadavg1 = median(runs.get(key).map((r) => r.loadavg?.[0]).filter((x) => x != null));
      results[section][key] = { cell: c, summary: s, runs: runs.get(key) };
      log(section, key, `ttff ${s.ttff} fps ${s.fps} p95 ${s.frameP95} js ${s.jsMs}/${s.jsP95} rms/f ${s.rendererMsPerFrame} busy ${s.busyPct}% gpu ${s.gpuCpu}% move→frame ${s.moveToFrame}/${s.moveToFrameP95} ET ${s.eventTimingMax} heap ${s.heapMB} ok ${s.dragOk} load ${s.loadavg1}`);
    }
    await save();
  }
}

async function shots(browser, base) {
  await mkdir(path.join(here, 'shots'), { recursive: true });
  const tmp = path.join(os.tmpdir(), 's2-S1-shots'); await mkdir(tmp, { recursive: true });
  results.shots = { note: 'Frozen pose (same time, selection, hover and particle burst in every variant); pixel difference vs canvas2d with pixelmatch threshold 0.1.', diffs: {} };
  for (const n of [200, 2000]) {
    const entries = [];
    let ref = null;
    for (const v of ['canvas2d', ...MAIN.filter((x) => x !== 'canvas2d')]) {
      const ctx = await browser.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(`${base}/${v}/?n=${n}&freeze`);
      await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
      await page.waitForTimeout(400);
      const file = path.join(tmp, `${v}-${n}.png`);
      await page.locator('#stage').screenshot({ path: file });
      await ctx.close();
      const png = PNG.sync.read(await readFile(file));
      if (!ref) ref = png;
      const diff = pixelmatch(ref.data, png.data, null, png.width, png.height, { threshold: 0.1 });
      results.shots.diffs[`${v}|${n}`] = Math.round((10000 * diff) / (png.width * png.height)) / 100;
      entries.push({ file, label: `${v} (${results.shots.diffs[`${v}|${n}`]}% px differ)` });
    }
    await contactSheet(entries, path.join(here, 'shots', `scene-n${n}.jpg`));
    log('shots', n, JSON.stringify(results.shots.diffs));
  }
  await save();
}

// Accessibility: what the tree exposes, whether the keyboard layer works, what it costs.
async function a11y(browser, base) {
  results.a11y ??= { tree: {}, keyboard: {} };
  for (const v of pick([...MAIN, ...A11Y])) {
    const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/${v}/?n=20`);
    await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    // Tab into the page up to 6 times; record what gets focus inside the stage.
    let tabs = 0, focusInStage = null;
    for (; tabs < 6; tabs++) {
      await page.keyboard.press('Tab');
      focusInStage = await page.evaluate(() => {
        const a = document.activeElement; const s = document.getElementById('stage');
        return a && s.contains(a) && a !== s ? { tag: a.tagName.toLowerCase(), role: a.getAttribute('role'), name: a.getAttribute('aria-label') || a.getAttribute('title') } : null;
      });
      if (focusInStage) break;
    }
    const snap = await page.locator('#stage').ariaSnapshot().catch((e) => `ERR ${e.message}`);
    const tabStops = await page.evaluate(() => [...document.querySelectorAll('#stage button, #stage [tabindex], #stage a[href]')].filter((e) => e.tabIndex >= 0).length);
    const lines = snap.split('\n');
    results.a11y.tree[v] = {
      focusable: !!focusInStage, tabsToFocus: focusInStage ? tabs + 1 : null, focused: focusInStage, tabStops,
      buttons: lines.filter((l) => /button/.test(l)).length, snapshotHead: lines.slice(0, 6).join('\n'), snapshotLines: lines.length,
    };
    if (focusInStage && A11Y.includes(v) && v !== 'pixi-pixia11y') {
      const before = await page.evaluate(() => { const id = Number(document.activeElement.dataset?.kb ?? -1); return { id, pos: id >= 0 ? window.__lab.getItem(id) : null }; });
      await page.keyboard.press('Enter');
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
      for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
      const after = await page.evaluate((id) => ({ pos: id >= 0 ? window.__lab.getItem(id) : null, count: document.getElementById('count').textContent, live: document.getElementById('live').textContent, selected: document.activeElement?.getAttribute('aria-label') }), before.id);
      results.a11y.keyboard[v] = {
        item: before.id, movedBy: before.pos && after.pos ? [after.pos.x - before.pos.x, after.pos.y - before.pos.y] : null,
        counter: after.count, live: after.live,
        pass: after.count === '1' && before.pos && after.pos && after.pos.x - before.pos.x === 24 && after.pos.y - before.pos.y === 16,
      };
    } else if (focusInStage) {
      // Built-in engine accessibility (PixiJS): does Enter select, do arrows move?
      // The focused item is the first object in the display list (one tab stop per object).
      const before = await page.evaluate(() => ({ sel: window.__lab.selectedId?.(), p0: window.__lab.getItem(0) }));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      const mid = await page.evaluate(() => window.__lab.selectedId?.());
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({ pos: window.__lab.getItem(0), count: document.getElementById('count').textContent, focused: document.activeElement?.getAttribute('aria-label') }));
      results.a11y.keyboard[v] = {
        enterSelects: before.sel !== mid && mid === 0, arrowsMove: after.pos.x !== before.p0.x || after.pos.y !== before.p0.y,
        counter: after.count, focusedAfterArrows: after.focused, pass: false,
        note: 'Enter/Space fire a click on the overlay <button>, which PixiJS forwards as click/pointertap; there is no keyboard move, so drag has no keyboard equivalent.',
      };
    }
    log('a11y', v, JSON.stringify(results.a11y.tree[v].focused), results.a11y.tree[v].buttons, 'buttons', JSON.stringify(results.a11y.keyboard[v] ?? null));
    await ctx.close();
    await save();
  }
  const cells = [];
  for (const v of pick(['dom', 'dom-a11y', 'svg', 'svg-a11y', 'pixi', 'pixi-a11y', 'pixi-pixia11y'])) for (const n of [200, 2000]) cells.push({ variant: v, n, throttle: 1 });
  await matrix(browser, base, 'a11yPerf', cells);
}

async function nowebgl(base) {
  const browser = await launchBrowser(['--disable-webgl', '--disable-3d-apis']);
  results.nowebgl = { flags: '--disable-webgl --disable-3d-apis', variants: {} };
  const entries = [];
  const tmp = path.join(os.tmpdir(), 's2-S1-shots'); await mkdir(tmp, { recursive: true });
  for (const v of pick(MAIN)) {
    const r = await runOne(browser, base, { variant: v, n: 200, throttle: 1, windowMs: 2000, warmMs: 300, timeoutMs: 20000 });
    const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    await page.goto(`${base}/${v}/?n=200&freeze`);
    await page.waitForTimeout(2500);
    const file = path.join(tmp, `nowebgl-${v}.png`);
    await page.locator('#stage').screenshot({ path: file });
    const webgl = await page.evaluate(() => { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); });
    await ctx.close();
    results.nowebgl.variants[v] = { renderer: r.info?.renderer ?? null, firstFrame: !r.failed, ttff: r.ttff ?? null, fps: r.steady?.fps ?? null, dragOk: !!(r.drag?.picked && r.drag?.dropped === 1), errors: [...new Set([...(r.errors || []), ...errs])].slice(0, 3), webglAvailable: webgl };
    entries.push({ file, label: `${v}: ${results.nowebgl.variants[v].renderer ?? 'no renderer'}` });
    log('nowebgl', v, JSON.stringify(results.nowebgl.variants[v]));
    await save();
  }
  await contactSheet(entries, path.join(here, 'shots', 'no-webgl.jpg'));
  await browser.close();
}

// Frames the display compositor actually presented (viz DrawAndSwap per second, from a trace). rAF on
// the main thread cannot see compositor-driven CSS animations, which keep moving while the main
// thread is blocked; this counts what reached the screen, whatever produced it.
async function presented(browser, base) {
  results.presented = { note: 'viz Display::DrawAndSwap events per second over a 3 s trace, after 1.5 s warm-up, with the harness rAF loop off (?idle), so only the page\'s own work runs; busy % = main-thread TaskDuration share; median of runs. load = 50 ms of main-thread busy work every 100 ms.', cells: {} };
  for (const load of [0, 50]) {
    for (const n of [200, 2000]) {
      for (const v of pick(['dom', 'svg', 'canvas2d', 'canvas2d-worker', 'pixi'])) {
        const fpsRuns = [], busyRuns = [];
        for (let i = 0; i < Math.min(RUNS, 3); i++) {
          const ctx = await browser.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 1 });
          const page = await ctx.newPage();
          const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
          await page.goto(`${base}/${v}/?n=${n}&idle${load ? `&load=${load}` : ''}`);
          await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
          await page.waitForTimeout(1500);
          const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
          await browser.startTracing(page, { categories: ['viz', 'cc'] });
          const t0 = Date.now();
          await page.waitForTimeout(3000);
          const buf = await browser.stopTracing();
          const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
          busyRuns.push(Math.round((1000 * (m1.TaskDuration - m0.TaskDuration)) / (m1.Timestamp - m0.Timestamp)) / 10);
          const secs = (Date.now() - t0) / 1000;
          const ev = JSON.parse(buf.toString()).traceEvents;
          const swaps = ev.filter((e) => e.name === 'Display::DrawAndSwap' && (e.ph === 'X' || e.ph === 'B')).length;
          fpsRuns.push(Math.round((10 * swaps) / secs) / 10);
          await ctx.close();
        }
        const key = `${v}|${n}|load${load}`;
        results.presented.cells[key] = { variant: v, n, load, fps: median(fpsRuns), busyPct: median(busyRuns), runs: fpsRuns };
        log('presented', key, JSON.stringify(results.presented.cells[key]));
        await save();
      }
    }
  }
}

// WebGL context loss (a phone reclaiming GPU memory, a driver reset): lose and restore the context with
// WEBGL_lose_context while the scene animates, then check the scene comes back.
async function contextLoss(browser, base) {
  results.contextLoss = { note: 'WEBGL_lose_context.loseContext(), 500 ms, restoreContext(), 1.5 s; pixel difference of the stage vs just before the loss (the bob animation alone moves a few %); frames = scene JS frames counted in the 1 s after restore.', variants: {} };
  const tmp = path.join(os.tmpdir(), 's2-S1-shots'); await mkdir(tmp, { recursive: true });
  const entries = [];
  for (const v of pick(['pixi', 'phaser', 'three', 'three-instanced', 'r3f'])) {
    const ctx = await browser.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 160)); });
    await page.goto(`${base}/${v}/?n=200`);
    await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    const a = path.join(tmp, `ctx-${v}-before.png`), b = path.join(tmp, `ctx-${v}-after.png`);
    await page.locator('#stage').screenshot({ path: a });
    const lost = await page.evaluate(async () => {
      const c = document.querySelector('#stage canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const ext = gl?.getExtension('WEBGL_lose_context');
      if (!ext) return { ok: false, why: gl ? 'no WEBGL_lose_context' : 'no context from getContext' };
      let lostEv = 0, restoredEv = 0;
      c.addEventListener('webglcontextlost', () => lostEv++);
      c.addEventListener('webglcontextrestored', () => restoredEv++);
      ext.loseContext();
      await new Promise((r) => setTimeout(r, 500));
      ext.restoreContext();
      await new Promise((r) => setTimeout(r, 1500));
      window.__lab.start();
      await new Promise((r) => setTimeout(r, 1000));
      window.__lab.stop();
      const st = await window.__lab.stats();
      return { ok: true, lostEv, restoredEv, framesAfter: st.js.length, isLost: gl.isContextLost() };
    });
    await page.locator('#stage').screenshot({ path: b });
    await ctx.close();
    const pa = PNG.sync.read(await readFile(a)), pb = PNG.sync.read(await readFile(b));
    const diff = pixelmatch(pa.data, pb.data, null, pa.width, pa.height, { threshold: 0.1 });
    const r = { ...lost, diffPct: Math.round((10000 * diff) / (pa.width * pa.height)) / 100, errors: [...new Set(errs)].slice(0, 3) };
    r.recovered = !!(lost.ok && !lost.isLost && lost.framesAfter > 0 && r.diffPct < 25);
    results.contextLoss.variants[v] = r;
    entries.push({ file: b, label: `${v} after restore: ${r.recovered ? 'recovered' : 'NOT recovered'} (${r.diffPct}% px)` });
    log('contextLoss', v, JSON.stringify(r));
    await save();
  }
  await contactSheet(entries, path.join(here, 'shots', 'context-loss.jpg'));
}

async function main() {
  log('phases', PHASES.join(','), 'runs', RUNS);
  results.meta = {
    ...(results.meta || {}),
    date: new Date().toISOString(), node: process.version, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, platform: `${os.platform()} ${os.release()}`,
    method: 'Fresh browser context per run; viewport 860×720 at DPR 1; stage 800×600. Warm-up 1 s after the first frame, then a 5 s window (rAF deltas, CDP Performance.getMetrics TaskDuration, SystemInfo.getProcessInfo CPU per process type), then a scripted drag of the top item (30 pointer moves 16 ms apart) while everything animates, then heap after GC. CPU throttle with Emulation.setCPUThrottlingRate (renderer main thread). Medians across runs.',
  };
  if (PHASES.includes('build')) { results.build = { ...(results.build || {}), ...(await buildAll()) }; await save(); log('built'); }
  const { server, base } = await serve(DIST);
  const needBrowser = PHASES.some((p) => ['shots', 'main', 'worker', 'present', 'domprobe', 'a11y', 'contextloss', 'reduced'].includes(p));
  const browser = needBrowser ? await launchBrowser() : null;
  if (browser) {
    const probe = await browser.newPage();
    results.meta.chromium = browser.version();
    results.meta.webgl = await probe.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const d = gl?.getExtension('WEBGL_debug_renderer_info');
      return gl ? { renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) } : null;
    });
    results.meta.offscreenCanvasInWorker = await probe.evaluate(() => typeof OffscreenCanvas === 'function' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype);
    await probe.close();
  }
  if (PHASES.includes('shots')) await shots(browser, base);
  if (PHASES.includes('main')) {
    const cells = [];
    for (const n of NS) for (const throttle of THROTTLES) for (const variant of pick(MAIN)) cells.push({ variant, n, throttle });
    await matrix(browser, base, 'main', cells);
  }
  if (PHASES.includes('worker')) {
    // Main-thread Canvas 2D vs the same drawing in a Worker, with 50 ms of other main-thread work every 100 ms.
    const cells = [];
    for (const throttle of THROTTLES) for (const n of [200, 2000]) for (const variant of pick(['canvas2d', 'canvas2d-worker', 'pixi', 'dom'])) cells.push({ variant, n, throttle, load: 50 });
    await matrix(browser, base, 'worker', cells);
  }
  if (PHASES.includes('present')) await presented(browser, base);
  if (PHASES.includes('domprobe')) { results.domProbe = await domProbe(browser, { runs: Math.min(RUNS, 3) }); await save(); }
  if (PHASES.includes('a11y')) await a11y(browser, base);
  if (PHASES.includes('contextloss')) await contextLoss(browser, base);
  if (PHASES.includes('reduced')) {
    // prefers-reduced-motion: no bob, no particles, render on demand; idle cost with no harness loop.
    const cells = [];
    for (const variant of pick(MAIN)) cells.push({ variant, n: 200, throttle: 1, reduced: true, idle: true, runs: Math.min(RUNS, 3) });
    if (pick(['pixi']).length) cells.push({ variant: 'pixi', label: 'pixi+Ticker.system.stop()', extra: 'stopSystemTicker', n: 200, throttle: 1, reduced: true, idle: true, runs: Math.min(RUNS, 3) });
    await matrix(browser, base, 'reduced', cells);
  }
  if (browser) await browser.close();
  if (PHASES.includes('nowebgl')) await nowebgl(base);
  server.close();
  if (PHASES.includes('survey')) { results.survey = await runSurvey({ runs: RUNS }); await save(); }
  if (PHASES.includes('report')) { await writeReport(results, path.join(here, 'results.md')); log('report written'); }
  await save();
}

await main();
