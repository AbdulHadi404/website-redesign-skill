#!/usr/bin/env node
// S1 rendering lab: rebuild every variant, measure everything, write results.json and results.md.
//
//   node run.mjs                       # everything (≈ 1.5–2 h on 4 shared CPUs)
//   node run.mjs --runs 1              # one run per cell (≈ 25 min), for a quick look
//   node run.mjs --phase main --only pixi,three --n 2000 --throttle 4
//
// Phases: build, shots, main, worker, a11y, reduced, nowebgl, survey, report (default: all, in that order).
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

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const list = (k, d) => (arg(k) ? arg(k).split(',') : d);
const RUNS = Number(arg('runs', 5));
const PHASES = list('phase', ['build', 'shots', 'main', 'worker', 'a11y', 'reduced', 'nowebgl', 'survey', 'report']);
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
    rendererCpu: get((r) => r.steady.cpuPct?.renderer), gpuCpu: get((r) => r.steady.cpuPct?.gpu), browserCpu: get((r) => r.steady.cpuPct?.browser),
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
  for (const c of cells) {
    const key = [c.variant, c.n, `${c.throttle}x`, c.load ? `load${c.load}` : '', c.reduced ? 'reduced' : ''].filter(Boolean).join('|');
    const runs = [];
    for (let i = 0; i < (c.runs ?? RUNS); i++) {
      const r = await runOne(browser, base, c);
      runs.push(r);
      if (r.failed) { log(key, 'FAILED', r.failed); break; }
    }
    const s = summarise(runs);
    results[section][key] = { cell: c, summary: s, runs };
    log(section, key, `ttff ${s.ttff} fps ${s.fps} p95 ${s.frameP95} busy ${s.busyPct}% gpu ${s.gpuCpu}% move→frame ${s.moveToFrame}/${s.moveToFrameP95} ET ${s.eventTimingMax} heap ${s.heapMB} ok ${s.dragOk}`);
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
    const lines = snap.split('\n');
    results.a11y.tree[v] = {
      focusable: !!focusInStage, tabsToFocus: focusInStage ? tabs + 1 : null, focused: focusInStage,
      buttons: lines.filter((l) => /button/.test(l)).length, snapshotHead: lines.slice(0, 6).join('\n'), snapshotLines: lines.length,
    };
    if (focusInStage && A11Y.includes(v)) {
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
      const before = await page.evaluate(() => window.__lab.getItem(window.__lab.topId()));
      await page.keyboard.press('Enter');
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({ pos: window.__lab.getItem(window.__lab.topId()), count: document.getElementById('count').textContent }));
      results.a11y.keyboard[v] = { enterActivates: 'dispatches click/pointertap to the sprite', arrowsMove: after.pos.x !== before.pos.x, counter: after.count, pass: false };
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

async function main() {
  log('phases', PHASES.join(','), 'runs', RUNS);
  results.meta = {
    ...(results.meta || {}),
    date: new Date().toISOString(), node: process.version, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, platform: `${os.platform()} ${os.release()}`,
    method: 'Fresh browser context per run; viewport 860×720 at DPR 1; stage 800×600. Warm-up 1 s after the first frame, then a 5 s window (rAF deltas, CDP Performance.getMetrics TaskDuration, SystemInfo.getProcessInfo CPU per process type), then a scripted drag of the top item (30 pointer moves 16 ms apart) while everything animates, then heap after GC. CPU throttle with Emulation.setCPUThrottlingRate (renderer main thread). Medians across runs.',
  };
  if (PHASES.includes('build')) { results.build = { ...(results.build || {}), ...(await buildAll()) }; await save(); log('built'); }
  const { server, base } = await serve(DIST);
  const needBrowser = PHASES.some((p) => ['shots', 'main', 'worker', 'a11y', 'reduced'].includes(p));
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
  if (PHASES.includes('a11y')) await a11y(browser, base);
  if (PHASES.includes('reduced')) {
    // prefers-reduced-motion: no bob, no particles, render on demand; idle cost with no harness loop.
    const cells = [];
    for (const variant of pick(MAIN)) cells.push({ variant, n: 200, throttle: 1, reduced: true, idle: true, runs: Math.min(RUNS, 3) });
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
