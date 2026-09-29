#!/usr/bin/env node
// S1 rendering lab: rebuild every variant, measure everything, write results.json and results.md.
//
//   node run.mjs                       # everything (≈ 2.5–3 h on 4 shared CPUs)
//   node run.mjs --runs 1              # one run per cell (≈ 25 min), for a quick look
//   node run.mjs --phase main --only pixi,three --n 2000 --throttle 4
//
// Phases: build, shots, throttleprobe, main, sweep, sweepload, instancing, worker, present, domprobe, a11y, a11ywebgl, contextloss, reduced, nowebgl, survey, report (default: all, in that order).
// Results merge into results.json by key, so a partial run replaces only the cells it measured.
//
// CPU throttle: `--throttle 4` is CDP Emulation.setCPUThrottlingRate, which slows ONLY the page's main
// thread. Compositor, raster threads, the GPU process and Workers run at full speed (the throttleprobe
// phase measures this). So "4×" means "main thread 4× slower", not "a phone"; and Worker variants are
// never run above 1×, because a full-speed Worker against a 4×-slowed main thread is not a comparison.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { buildAll, DIST, MAIN, A11Y, EXTRA, VARIANTS } from './lib/build.mjs';
import { serve } from './lib/serve.mjs';
import { launchBrowser, runOne, median } from './lib/measure.mjs';
import { contactSheet } from './lib/sheet.mjs';
import { runSurvey } from './lib/survey.mjs';
import { writeReport } from './lib/report.mjs';
import { domProbe } from './lib/domprobe.mjs';
import { throttleProbe } from './lib/throttleprobe.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const list = (k, d) => (arg(k) ? arg(k).split(',') : d);
const RUNS = Number(arg('runs', 5));
const PHASES = list('phase', ['build', 'shots', 'throttleprobe', 'main', 'sweep', 'sweepload', 'instancing', 'worker', 'present', 'domprobe', 'a11y', 'a11ywebgl', 'contextloss', 'reduced', 'nowebgl', 'survey', 'report']);
// sweepload: part of the 1× sweep again with BURN busy-looping processes running, to show how much the
// object-count limits depend on what else the machine is doing.
const BURN = Number(arg('burn', 3));
const ONLY = arg('only') ? arg('only').split(',') : null;
const NS = list('n', ['20', '200', '2000']).map(Number);
const THROTTLES = list('throttle', ['1', '4']).map(Number);
// Object counts for the CPU renderers, to locate where each one stops holding the frame rate. Measured as
// its own round-robin set per throttle, so every cell of one sweep table shares the same background load.
// Steps are dense around each crossover, so a limit is a bracket between two tested counts.
const SWEEP_NS = {
  1: list('sweepn', ['200', '300', '400', '550', '700', '1000', '1400', '1700', '2000']).map(Number),
  4: list('sweepn', ['100', '200', '300', '400', '500', '700', '1000']).map(Number),
};
const pick = (names) => (ONLY ? names.filter((n) => ONLY.includes(n)) : names);
// CDP throttling does not reach Workers (see throttleprobe), so Worker variants run at 1× only.
const WORKER_VARIANTS = ['canvas2d-worker'];
const throttleOk = (variant, throttle) => throttle === 1 || !WORKER_VARIANTS.includes(variant);
const partialRun = () => !!(ONLY || arg('n') || arg('throttle') || arg('sweepn'));

const RESULTS = path.join(here, 'results.json');
const results = existsSync(RESULTS) ? JSON.parse(await readFile(RESULTS, 'utf8')) : {};
const WORKER_VARIANTS_ = ['canvas2d-worker'];
const save = async () => { await writeFile(RESULTS, JSON.stringify(results, null, 1)); };
// Earlier versions of this runner measured the Worker variant at 4×. CDP throttling never reached the
// Worker, so those cells compared a full-speed Worker with a 4×-slowed main thread: drop them.
for (const sec of ['main', 'sweep', 'worker']) for (const [k, v] of Object.entries(results[sec] || {})) if (WORKER_VARIANTS_.includes(v.cell?.variant) && v.cell.throttle > 1) delete results[sec][k];
// PixiJS rows of a11yPerf measured under SwiftShader (2–3 fps) moved to a11yPerfWebgl / a11yPerfCanvas.
for (const [k, v] of Object.entries(results.a11yPerf || {})) if (/^pixi/.test(v.cell?.variant)) delete results.a11yPerf[k];
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
    missedPct: get((r) => r.steady.missedPct ?? (r.steady.frames ? (100 * r.steady.over25) / r.steady.frames : null)),
    // how many runs had at most 10 % of frames missing a vsync (the "holds" criterion), of how many
    holdsRuns: ok.filter((r) => (r.steady.missedPct ?? (100 * r.steady.over25) / r.steady.frames) <= 10).length,
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
    dragBusyPct: get((r) => r.drag?.window?.busyPct), dragStylePct: get((r) => r.drag?.window?.stylePct), dragLayoutPct: get((r) => r.drag?.window?.layoutPct),
    dragMainMsPerMove: get((r) => r.drag?.window?.mainMsPerMove), dragRendererMsPerMove: get((r) => r.drag?.window?.rendererMsPerMove),
    dragStyleLayoutMsPerMove: get((r) => r.drag?.window?.styleLayoutMsPerMove),
    eventTimingMax: get((r) => (typeof r.drag?.eventTimingMax === 'number' ? r.drag.eventTimingMax : 0)),
    dragOk: ok.every((r) => !r.drag || (r.drag.picked && r.drag.dropped === 1 && Math.abs(r.drag.moved[0]) > 60)),
    heapMB: get((r) => r.heapMB), domNodes: get((r) => r.domNodes),
    jsFiles: ok[0].jsFiles,
  };
}

// Returns the browser it ended with: if the browser dies mid-run (another process on this shared machine
// killed Chromium once), it is relaunched with the same flags and the run is repeated.
async function matrix(browser, base, section, cells) {
  results[section] ??= {};
  const keyOf = (c) => [c.label ?? c.variant, c.n, `${c.throttle}x`, c.load ? `load${c.load}` : '', c.reduced ? 'reduced' : ''].filter(Boolean).join('|');
  // Round-robin inside each group of comparable cells (same N, throttle, load, reduced): run 1 of every
  // variant, then run 2 of every variant, … so drifting background load on the shared CPUs hits every
  // variant alike instead of whichever happened to run during a busy minute.
  const groups = new Map();
  for (const c of cells) { const g = c.group ?? [c.n, c.throttle, c.load, c.reduced].join('|'); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); }
  for (const group of groups.values()) {
    const runs = new Map(group.map((c) => [keyOf(c), []]));
    const failed = new Set();
    const reps = Math.max(...group.map((c) => c.runs ?? RUNS));
    for (let i = 0; i < reps; i++) {
      for (const c of group) {
        const key = keyOf(c);
        if (failed.has(key) || i >= (c.runs ?? RUNS)) continue;
        let r;
        for (let attempt = 0; ; attempt++) {
          try { r = await runOne(browser, base, c); break; } catch (e) {
            if (attempt >= 2) throw e;
            log(key, 'run threw, retrying:', e.message.split('\n')[0]);
            if (!browser.isConnected()) browser = await launchBrowser(browser.__args || []);
          }
        }
        r.loadavg = os.loadavg().map((x) => Math.round(x * 10) / 10);
        runs.get(key).push(r);
        if (r.failed) { log(key, 'FAILED', r.failed); failed.add(key); }
      }
      // Keep what has been measured so far (a long group is ~30 min).
      for (const c of group) { const k = keyOf(c); if (runs.get(k).length) results[section][k] = { cell: c, summary: { ...summarise(runs.get(k)), partial: true }, runs: runs.get(k) }; }
      await save();
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
  return browser;
}

async function shots(browser, base) {
  await mkdir(path.join(here, 'shots'), { recursive: true });
  const tmp = path.join(os.tmpdir(), 's2-S1-shots'); await mkdir(tmp, { recursive: true });
  results.shots = { note: 'Frozen pose (same time, selection, hover and particle burst in every variant); pixel difference vs canvas2d with pixelmatch threshold 0.1.', diffs: {} };
  for (const n of [200, 2000]) {
    const entries = [];
    let ref = null;
    for (const v of ['canvas2d', ...MAIN.filter((x) => x !== 'canvas2d'), ...EXTRA]) {
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
  const focusShots = [];
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
    if (A11Y.includes(v) && v !== 'pixi-pixia11y') {
      results.a11y.tapToPlace ??= {}; results.a11y.overlaySync ??= {}; results.a11y.focusRing ??= {};
      results.a11y.tapToPlace[v] = await tapToPlaceTest(browser, base, v);
      results.a11y.overlaySync[v] = await overlaySyncTest(browser, base, v);
      if (v === 'pixi-a11y') results.a11y.overlaySync['pixi-a11y ?nosync (earlier bug)'] = await overlaySyncTest(browser, base, v, '&nosync');
      const shot = path.join(os.tmpdir(), 's2-S1-shots', `focus-${v}.png`);
      await mkdir(path.dirname(shot), { recursive: true });
      results.a11y.focusRing[v] = await focusRingTest(browser, base, v, shot);
      focusShots.push({ file: shot, label: `${v}: ring ${results.a11y.focusRing[v].indicatorBox} by ${results.a11y.focusRing[v].drawnBy}` });
      if (v === 'svg-a11y') {
        // What the first Tab into the stage focuses, with the focusin listener on the HTML stage vs on an SVG <g>.
        results.a11y.firstTab = { 'svg-a11y': await firstTabTest(browser, base, v), 'svg-a11y ?focusonsvg': await firstTabTest(browser, base, v, '&focusonsvg') };
        log('a11y first Tab', JSON.stringify(results.a11y.firstTab));
        // The same SVG build with a CSS outline instead of the ring shape.
        const shot2 = path.join(os.tmpdir(), 's2-S1-shots', 'focus-svg-a11y-outline.png');
        results.a11y.focusRing['svg-a11y ?outline'] = await focusRingTest(browser, base, v, shot2, '&outline');
        focusShots.push({ file: shot2, label: `svg-a11y with CSS outline: ring ${results.a11y.focusRing['svg-a11y ?outline'].indicatorBox}` });
      }
      log('a11y tap-to-place', v, JSON.stringify(results.a11y.tapToPlace[v]), 'overlay sync', JSON.stringify(results.a11y.overlaySync[v]), 'focus', JSON.stringify(results.a11y.focusRing[v]));
    }
    await save();
  }
  // Rebuild the sheet from every focus capture on disk (a partial run re-captures only some of them).
  if (focusShots.length) {
    const dir = path.join(os.tmpdir(), 's2-S1-shots');
    const all = ['dom-a11y', 'svg-a11y', 'svg-a11y ?outline', 'pixi-a11y'].map((k) => {
      const t = results.a11y.focusRing?.[k];
      const file = path.join(dir, k === 'svg-a11y ?outline' ? 'focus-svg-a11y-outline.png' : `focus-${k}.png`);
      return t && existsSync(file) ? { file, label: `${k}: ring ${t.indicatorBox} by ${t.drawnBy}` } : null;
    }).filter(Boolean);
    await contactSheet(all, path.join(here, 'shots', 'focus-ring.jpg'));
  }
  // Cost of the layer. DOM and SVG do not use WebGL. The PixiJS builds are measured with WebGL disabled,
  // on PixiJS's own Canvas 2D renderer: under SwiftShader they ran at 2–3 fps, where frame time, busy %
  // and drag latency cannot show a small cost.
  const cells = [];
  for (const v of pick(['dom', 'dom-a11y', 'svg', 'svg-a11y'])) for (const n of [200, 2000]) cells.push({ variant: v, n, throttle: 1 });
  if (!ONLY) results.a11yPerf = {};
  browser = await matrix(browser, base, 'a11yPerf', cells);
  const pc = [];
  for (const throttle of THROTTLES) for (const n of [200, 2000]) {
    for (const v of pick(['pixi', 'pixi-a11y', 'pixi-pixia11y'])) pc.push({ variant: v, n, throttle });
    // The same keyboard build without the per-move sync, to isolate what the sync costs during a drag,
    // and with the sync writing left/top instead of transform.
    if (pick(['pixi-a11y']).length) {
      pc.push({ variant: 'pixi-a11y', label: 'pixi-a11y ?nosync', extra: 'nosync', n, throttle });
      pc.push({ variant: 'pixi-a11y', label: 'pixi-a11y ?lefttop', extra: 'lefttop', n, throttle });
    }
  }
  if (pc.length) {
    const nb = await launchBrowser(['--disable-webgl', '--disable-3d-apis']);
    if (!partialRun()) results.a11yPerfCanvas = {};
    await matrix(nb, base, 'a11yPerfCanvas', pc);
    await nb.close();
  }
  return browser;
}

const stagePos = (page, id) => page.evaluate((k) => {
  const s = document.getElementById('stage').getBoundingClientRect();
  const it = window.__lab.getItem(k);
  const b = document.querySelector(`[data-kb="${k}"]`)?.getBoundingClientRect();
  return { item: it, stage: { x: s.x, y: s.y }, control: b ? { x: b.x + b.width / 2 - s.x, y: b.y + b.height / 2 - s.y } : null };
}, id);

// WCAG 2.5.7 single-pointer alternative: tap a decoration (no movement), then tap a spot to place it.
async function tapToPlaceTest(browser, base, v) {
  const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/${v}/?n=20`);
  await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const id = await page.evaluate(() => window.__lab.topId());
  const p0 = await stagePos(page, id);
  const count0 = await page.evaluate(() => document.getElementById('count').textContent);
  await page.mouse.click(p0.stage.x + p0.item.x, p0.stage.y + p0.item.y);
  await page.waitForTimeout(250);
  const mid = await page.evaluate(() => document.getElementById('live').textContent);
  const target = { x: p0.item.x < 400 ? p0.item.x + 160 : p0.item.x - 160, y: p0.item.y < 300 ? p0.item.y + 90 : p0.item.y - 90 };
  await page.mouse.click(p0.stage.x + target.x, p0.stage.y + target.y);
  await page.waitForTimeout(400);
  const p1 = await stagePos(page, id);
  const after = await page.evaluate(() => ({ count: document.getElementById('count').textContent, live: document.getElementById('live').textContent }));
  await ctx.close();
  const err = Math.hypot(p1.item.x - target.x, p1.item.y - target.y);
  return {
    item: id, target, landed: [p1.item.x, p1.item.y], offPx: Math.round(err * 10) / 10,
    afterFirstTap: mid, afterSecondTap: after.live, counter: `${count0} → ${after.count}`,
    pass: err <= 1 && Number(after.count) === Number(count0) + 1 && /^Picked up/.test(mid) && /^Placed/.test(after.live),
  };
}

// After a MOUSE drag, is the keyboard control (and so its focus ring and the screen reader's focus
// rectangle) still over the object?
async function overlaySyncTest(browser, base, v, extra = '') {
  const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/${v}/?n=20${extra}`);
  await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  // Native builds (DOM, SVG): the focusable element is the object itself, so there is nothing to sync.
  if (!(await page.evaluate(() => !!document.querySelector('.kb-layer')))) { await ctx.close(); return { native: true, pass: 'n/a (the control is the object)' }; }
  const id = await page.evaluate(() => window.__lab.topId());
  const p0 = await stagePos(page, id);
  const ax = p0.stage.x + p0.item.x, ay = p0.stage.y + p0.item.y;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(ax + i * 10, ay + i * 6); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(400);
  const p1 = await stagePos(page, id);
  await ctx.close();
  // Drift = how far the control's box moved relative to the object (0 when the layer is synced).
  const drift = p0.control && p1.control ? Math.hypot((p1.control.x - p1.item.x) - (p0.control.x - p0.item.x), (p1.control.y - p1.item.y) - (p0.control.y - p0.item.y)) : null;
  return { item: id, moved: [p1.item.x - p0.item.x, p1.item.y - p0.item.y], object: [p1.item.x, p1.item.y], control: p1.control && [Math.round(p1.control.x), Math.round(p1.control.y)], driftPx: drift == null ? null : Math.round(drift * 10) / 10, pass: drift != null && drift <= 6 };
}

async function firstTabTest(browser, base, v, extra = '') {
  const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/${v}/?n=20${extra}`);
  await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  let first = null;
  for (let i = 0; i < 6 && !first; i++) {
    await page.keyboard.press('Tab');
    first = await page.evaluate(() => { const a = document.activeElement; return document.getElementById('stage').contains(a) && a.id !== 'stage' ? `<${a.tagName.toLowerCase()}${a.getAttribute('role') ? ` role=${a.getAttribute('role')}` : ''}> "${a.getAttribute('aria-label') ?? ''}"` : null; });
  }
  await ctx.close();
  return { firstFocus: first, pass: !!first && !/role=group/.test(first) };
}

// Where is the focus indicator drawn? Tab into the set, move focus twice, then measure the focused
// element's box and the box of what actually draws the ring, and keep a screenshot.
async function focusRingTest(browser, base, v, shotFile, extra = '') {
  const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/${v}/?n=20&freeze${extra}`);
  await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.getElementById('stage').contains(document.activeElement))) break; }
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const s = document.getElementById('stage').getBoundingClientRect();
    const a = document.activeElement; const id = Number(a.dataset.kb);
    const it = window.__lab.getItem(id);
    const box = (e) => { const b = e.getBoundingClientRect(); return { cx: b.x + b.width / 2 - s.x, cy: b.y + b.height / 2 - s.y, w: Math.round(b.width), h: Math.round(b.height) }; };
    const el = box(a);
    const rings = [...a.querySelectorAll('.focus')].filter((e) => getComputedStyle(e).display !== 'none');
    const ind = rings.length ? box(rings[rings.length - 1]) : el;   // otherwise the outline is drawn around the element's box
    return { id, item: it, element: el, indicator: ind, drawnBy: rings.length ? 'explicit ring shape' : 'CSS outline on the element box' };
  });
  await page.locator('#stage').screenshot({ path: shotFile });
  await ctx.close();
  const off = Math.hypot(r.indicator.cx - r.item.x, r.indicator.cy - r.item.y);
  return { ...r, elementBox: `${r.element.w}×${r.element.h}`, indicatorBox: `${r.indicator.w}×${r.indicator.h}`, indicatorOffPx: Math.round(off), pass: off <= 6 && r.indicator.w <= 80 && r.indicator.h <= 80 };
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
  // The engines' own Canvas 2D fallbacks, measured like the main matrix: a CPU-only comparison of engine
  // overhead against vanilla Canvas 2D that SwiftShader cannot distort.
  const cells = [];
  for (const n of [200, 2000]) for (const variant of pick(['canvas2d', 'pixi', 'phaser'])) cells.push({ variant, n, throttle: 1, runs: Math.min(RUNS, 3) });
  await matrix(browser, base, 'nowebglPerf', cells);
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
    method: 'Fresh browser context per run; viewport 860×720 at DPR 1; stage 800×600. Warm-up 1 s after the first frame, then a 5 s window (rAF deltas, CDP Performance.getMetrics TaskDuration, SystemInfo.getProcessInfo CPU per process type), then a scripted drag of the top item (30 pointer moves 16 ms apart) while everything animates, then heap after GC. CPU throttle with CDP Emulation.setCPUThrottlingRate, which slows only the page\'s main thread: the compositor, raster threads, GPU process and Workers stay at full speed (throttleprobe), so "4×" = "main thread 4× slower", not a phone, and Worker variants run at 1× only. Medians across runs.',
  };
  if (PHASES.includes('build')) { results.build = { ...(results.build || {}), ...(await buildAll()) }; await save(); log('built'); }
  const { server, base } = await serve(DIST);
  const needBrowser = PHASES.some((p) => ['shots', 'throttleprobe', 'main', 'sweep', 'sweepload', 'instancing', 'worker', 'present', 'domprobe', 'a11y', 'a11ywebgl', 'contextloss', 'reduced'].includes(p));
  let browser = needBrowser ? await launchBrowser() : null;
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
    for (const n of NS) for (const throttle of THROTTLES) for (const variant of pick(MAIN)) if (throttleOk(variant, throttle)) cells.push({ variant, n, throttle });
    browser = await matrix(browser, base, 'main', cells);
  }
  if (PHASES.includes('sweep')) {
    const cells = [];
    // One round-robin group per throttle across every N and variant, so drifting load hits every N alike.
    for (const throttle of THROTTLES) for (const n of SWEEP_NS[throttle] ?? SWEEP_NS[1]) for (const variant of pick(['dom', 'svg', 'canvas2d', 'canvas2d-worker'])) if (throttleOk(variant, throttle)) cells.push({ variant, n, throttle, group: `sweep|${throttle}` });
    if (!partialRun()) results.sweep = {};   // a full sweep replaces the old one (no stale cells from other step sets)
    browser = await matrix(browser, base, 'sweep', cells);
  }
  if (PHASES.includes('sweepload')) {
    const cells = [];
    for (const n of [400, 700, 1000, 1400]) for (const variant of pick(['dom', 'svg', 'canvas2d', 'canvas2d-worker'])) cells.push({ variant, n, throttle: 1, group: 'sweepload', runs: Math.min(RUNS, 3) });
    const burners = Array.from({ length: BURN }, () => spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }));
    try {
      if (!partialRun()) results.sweepLoad = {};
      results.sweepLoadMeta = { burners: BURN, note: `${BURN} extra processes each spinning one CPU core for the whole phase, on top of whatever else the machine runs; compare with the same cells of the 1× sweep.` };
      browser = await matrix(browser, base, 'sweepLoad', cells);
    } finally { for (const b of burners) b.kill('SIGKILL'); }
  }
  if (PHASES.includes('instancing')) {
    // One mesh per item vs one InstancedMesh, in vanilla three.js and in React Three Fiber, as one set.
    const cells = [];
    for (const n of [200, 2000]) for (const throttle of THROTTLES) for (const variant of pick(['three', 'three-instanced', 'r3f', 'r3f-instanced'])) cells.push({ variant, n, throttle });
    browser = await matrix(browser, base, 'instancing', cells);
    // R3F's WebGL failure path: <Canvas fallback> vs a WebGL check + error boundary with a poster.
    const nb = await launchBrowser(['--disable-webgl', '--disable-3d-apis']);
    results.instancingNoWebgl = {};
    for (const v of pick(['r3f', 'r3f-instanced'])) {
      const ctx = await nb.newContext({ viewport: { width: 860, height: 720 } });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
      await page.goto(`${base}/${v}/?n=200`);
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        const img = document.querySelector('#stage img');
        const box = img?.getBoundingClientRect();
        return { renderer: window.__lab?.info?.renderer ?? null, posterVisible: !!(img && img.complete && img.naturalWidth > 0 && box.width > 0 && box.height > 0), canvases: document.querySelectorAll('#stage canvas').length, stageChildren: document.getElementById('stage').children.length };
      });
      results.instancingNoWebgl[v] = { ...r, errors: [...new Set(errs)].slice(0, 2) };
      log('instancing no-webgl', v, JSON.stringify(results.instancingNoWebgl[v]));
      await ctx.close();
    }
    await nb.close();
    await save();
  }
  if (PHASES.includes('worker')) {
    // Main-thread Canvas 2D vs the same drawing in a Worker, with 50 ms of other main-thread work every
    // 100 ms. 1× only: CDP throttling slows the main thread but not the Worker (throttleprobe).
    const cells = [];
    for (const n of (arg('n') ? NS : [200, 700, 2000])) for (const variant of pick(['canvas2d', 'canvas2d-worker', 'dom'])) cells.push({ variant, n, throttle: 1, load: 50 });
    if (!partialRun()) results.worker = {};
    browser = await matrix(browser, base, 'worker', cells);
  }
  if (PHASES.includes('present')) await presented(browser, base);
  if (PHASES.includes('throttleprobe')) { results.throttleProbe = await throttleProbe(browser, { runs: RUNS }); await save(); }
  if (PHASES.includes('domprobe')) { results.domProbe = await domProbe(browser, { runs: RUNS }); await save(); }
  if (PHASES.includes('a11y')) browser = await a11y(browser, base);
  if (PHASES.includes('a11ywebgl')) {
    // PixiJS's built-in AccessibilitySystem is registered only for the WebGL and WebGPU renderers, so its
    // per-frame cost can only be measured on WebGL (SwiftShader here): read JS ms/frame, not fps.
    const cells = [];
    for (const v of pick(['pixi', 'pixi-a11y', 'pixi-pixia11y'])) cells.push({ variant: v, n: 2000, throttle: 1 });
    if (!partialRun()) results.a11yPerfWebgl = {};
    browser = await matrix(browser, base, 'a11yPerfWebgl', cells);
  }
  if (PHASES.includes('contextloss')) await contextLoss(browser, base);
  if (PHASES.includes('reduced')) {
    // prefers-reduced-motion: no bob, no particles, render on demand; idle cost with no harness loop.
    const cells = [];
    for (const variant of pick(MAIN)) cells.push({ variant, n: 200, throttle: 1, reduced: true, idle: true, runs: Math.min(RUNS, 3) });
    if (pick(['pixi']).length) cells.push({ variant: 'pixi', label: 'pixi+Ticker.system.stop()', extra: 'stopSystemTicker', n: 200, throttle: 1, reduced: true, idle: true, runs: Math.min(RUNS, 3) });
    browser = await matrix(browser, base, 'reduced', cells);
  }
  if (browser) await browser.close();
  if (PHASES.includes('nowebgl')) await nowebgl(base);
  server.close();
  if (PHASES.includes('survey')) { results.survey = await runSurvey({ runs: RUNS }); await save(); }
  if (PHASES.includes('report')) { await writeReport(results, path.join(here, 'results.md')); log('report written'); }
  await save();
}

await main();
