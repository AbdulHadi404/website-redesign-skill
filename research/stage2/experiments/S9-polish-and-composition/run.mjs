#!/usr/bin/env node
/**
 * S9 runner: rebuilds and re-measures everything, and writes results.json.
 *
 *   node run.mjs                  # singles (every move alone) + stacks (if judgements.json exists) + sheets
 *   node run.mjs --stage singles  # only the single-move captures, measures, probe and blind sheets
 *   node run.mjs --stage stacks   # only the stacks (needs judgements.json)
 *   node run.mjs --no-capture     # reuse the captures already in captures/pages
 *
 * Steps: fetch fonts (fetch-assets.mjs) -> serve page/ with each variant's move classes -> render the phone image
 * -> capture every variant at 1440 and 390 with the skill's capture.mjs -> measure each variant against the
 * baseline (pixelmatch %, CIEDE2000 JND area, JND area after a 4x downscale) on the first viewport, the full
 * page and viewport-sized windows on the sections below the fold -> run the polish probe (lib/probe.mjs) on
 * every variant -> build blind A/B sheets with the skill's compare.mjs (sides and pair ids randomised with a
 * fixed seed; the key goes to blind-key.json, never onto a sheet) -> stacks from judgements.json -> shots/.
 * Needs: npm install here (pixelmatch, pngjs) and the skill's scripts installed (playwright-core, Chromium).
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, stat, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MOVES, REAL, WINDOWS } from './lib/moves.mjs';
import { serve } from './lib/serve.mjs';
import { readPng, crop, upscale, measure, hotWindow, toJpeg, writePng } from './lib/img.mjs';
import { probePage, focusRing } from './lib/probe.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(ROOT, '../../../../skills/website-redesign/scripts');
const { launch } = await import(pathToFileURL(path.join(SCRIPTS, 'lib/env.mjs')).href);
const args = process.argv.slice(2);
const stage = args.includes('--stage') ? args[args.indexOf('--stage') + 1] : 'all';
const noCapture = args.includes('--no-capture');
const CAP = path.join(ROOT, 'captures');
const PAGES = path.join(CAP, 'pages');
const BLIND = path.join(CAP, 'blind');
const SHOTS = path.join(ROOT, 'shots');
const WIDTHS = [1440, 390];
const VIEW = { 1440: { h: 900, dpr: 1 }, 390: { h: 844, dpr: 2 } };
const SEED = 20260928;
const log = (...x) => console.log(...x);

// ---------------------------------------------------------------- variants
const judgementsFile = path.join(ROOT, 'judgements.json');
const judgements = JSON.parse(await readFile(judgementsFile, 'utf8').catch(() => 'null'));
const STACKS = judgements?.stacks || null; // { 'stack-top5': [...], ... } written from the single-move judgements
const variants = { base: [], base2: [] };
for (const m of MOVES) variants[m.id] = [m.id];
if (STACKS) Object.assign(variants, STACKS);

// ---------------------------------------------------------------- helpers
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Child processes run asynchronously: the fixture's server lives in this process and must keep answering.
function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, argv, { env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    let out = '', err = '';
    c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { err += d; });
    c.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} ${argv.slice(0, 4).join(' ')} … failed (${code}):\n${err.slice(-2000)}`))));
  });
}
const exists = async (f) => !!(await stat(f).catch(() => null));
const capFile = (v, w, fold) => path.join(PAGES, `v-${v}-${w}${fold ? '-fold' : ''}.png`);

async function capture(list) {
  await mkdir(PAGES, { recursive: true });
  const t0 = Date.now();
  const out = await run('node', [path.join(SCRIPTS, 'capture.mjs'), '--base', server.base, '--paths', ...list.map((v) => `/v/${v}/`), '--widths', WIDTHS.join(','), '--out', PAGES]);
  await writeFile(path.join(CAP, `capture-${list[0]}-${list.length}.log`), out);
  log(`  captured ${list.length} variants x ${WIDTHS.length} widths in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const v of list) for (const w of WIDTHS) if (!(await exists(capFile(v, w, true)))) throw new Error(`missing capture ${capFile(v, w, true)}`);
}

async function boxes(browser, list) {
  const out = {};
  for (const w of WIDTHS) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: VIEW[w].h }, deviceScaleFactor: VIEW[w].dpr, isMobile: mobile, hasTouch: mobile });
    for (const v of list) {
      const p = await ctx.newPage();
      await p.goto(`${server.base}/v/${v}/`); await p.evaluate(() => document.fonts.ready);
      (out[v] ||= {})[w] = await p.evaluate((sels) => Object.fromEntries(sels.map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [s, { top: r.top + scrollY, height: r.height }]; })), WINDOWS);
      await p.close();
    }
    await ctx.close();
  }
  return out;
}

async function probeAll(browser, list) {
  const out = {};
  for (const w of WIDTHS) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: VIEW[w].h }, deviceScaleFactor: VIEW[w].dpr, isMobile: mobile, hasTouch: mobile });
    for (const v of list) {
      const p = await ctx.newPage();
      await p.goto(`${server.base}/v/${v}/`); await p.evaluate(() => document.fonts.ready);
      const r = await p.evaluate(probePage);
      if (!mobile) r.focusRing = await focusRing(p);
      (out[v] ||= {})[w] = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, { flag: x.flag, value: x.value }]));
      await p.close();
    }
    await ctx.close();
  }
  return out;
}

async function measureVariant(v, bx, ref = 'base') {
  const r = {};
  for (const w of WIDTHS) {
    const { h, dpr } = VIEW[w];
    const [A, B] = [await readPng(capFile(ref, w, true)), await readPng(capFile(v, w, true))];
    const fold = measure(A, B, { diffOut: true });
    const [FA, FB] = [await readPng(capFile(ref, w, false)), await readPng(capFile(v, w, false))];
    const full = measure(FA, FB);
    const windows = {};
    for (const s of WINDOWS) {
      const ya = Math.max(0, (bx[ref][w][s].top - 64) * dpr), yb = Math.max(0, (bx[v][w][s].top - 64) * dpr);
      const m = measure(crop(FA, 0, ya, FA.width, h * dpr), crop(FB, 0, yb, FB.width, h * dpr));
      windows[s] = { pm: m.pm, jnd: m.jnd, thumb: m.thumb, meanDE: m.meanDE, ya, yb };
    }
    const { diff, ...foldRest } = fold;
    r[w] = { fold: foldRest, full: { pm: full.pm, jnd: full.jnd, thumb: full.thumb, heights: [FA.height, FB.height] }, windows, hot: hotWindow(diff, 400 * dpr / (w < 768 ? 2 : 1), 250 * dpr / (w < 768 ? 2 : 1)) };
    await mkdir(path.join(CAP, 'diff'), { recursive: true });
    await writePng(path.join(CAP, 'diff', `${v}-${w}-fold.png`), diff);
  }
  return r;
}

// Blind sheets: one per (variant, view). The sheet shows only "A" and "B"; which is the variant is in the key.
async function blindSheets(items, conv, prefix, rand) {
  await mkdir(BLIND, { recursive: true });
  const order = items.map((x) => ({ x, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const key = {};
  for (const [i, it] of order.entries()) {
    const id = `${prefix}${String(i + 1).padStart(2, '0')}`;
    const variantLeft = rand() < 0.5;
    const files = variantLeft ? [it.b, it.a] : [it.a, it.b];
    const tmp = path.join(BLIND, `${id}.png`);
    await run('node', [path.join(SCRIPTS, 'compare.mjs'), '--grid', ...files, '--labels', 'A', 'B', '--out', tmp]);
    const png = await readPng(tmp);
    await toJpeg(conv, png, path.join(BLIND, `${id}.jpg`), 0.85);
    await rm(tmp);
    key[id] = { variant: it.variant, reference: it.ref || 'base', view: it.view, variantSide: variantLeft ? 'A' : 'B' };
  }
  return key;
}

// Crops used by the sheets: the first viewport (as captured), a below-the-fold window, and a 2x zoom on the
// densest change in the first viewport.
async function viewFiles(v, w, view, hot, ref = 'base', bx) {
  const dir = path.join(CAP, 'views'); await mkdir(dir, { recursive: true });
  const { h, dpr } = VIEW[w];
  if (view === 'fold') return [capFile(ref, w, true), capFile(v, w, true)];
  const outA = path.join(dir, `${ref}-${v}-${w}-${view.replace(/\W+/g, '')}-a.png`), outB = path.join(dir, `${ref}-${v}-${w}-${view.replace(/\W+/g, '')}-b.png`);
  if (view === 'zoom') {
    const [A, B] = [await readPng(capFile(ref, w, true)), await readPng(capFile(v, w, true))];
    const [x, y, cw, ch] = hot;
    await writePng(outA, upscale(crop(A, x, y, cw, ch), 2)); await writePng(outB, upscale(crop(B, x, y, cw, ch), 2));
  } else {
    const [A, B] = [await readPng(capFile(ref, w, false)), await readPng(capFile(v, w, false))];
    await writePng(outA, crop(A, 0, Math.max(0, (bx[ref][w][view].top - 64) * dpr), A.width, h * dpr));
    await writePng(outB, crop(B, 0, Math.max(0, (bx[v][w][view].top - 64) * dpr), B.width, h * dpr));
  }
  return [outA, outB];
}

// A contact sheet drawn by the browser (the layout compare.mjs cannot do: many panels in a grid, with captions).
async function contact(conv, panels, out, { cols = 5, width = 360, title = '' } = {}) {
  const imgs = await Promise.all(panels.map(async (p) => ({ ...p, src: `data:image/png;base64,${(await readFile(p.file)).toString('base64')}` })));
  const page = await conv.context().newPage();
  await page.setViewportSize({ width: cols * (width + 16) + 32, height: 1000 });
  await page.setContent(`<!doctype html><body style="margin:0;background:#e9e9e7;font:600 13px/1.3 system-ui,sans-serif;color:#222">
    <div id="g" style="padding:16px;display:grid;grid-template-columns:repeat(${cols},${width}px);gap:16px;width:max-content">
    ${title ? `<div style="grid-column:1/-1;font-size:15px">${title}</div>` : ''}
    ${imgs.map((p) => `<figure style="margin:0"><figcaption style="margin:0 0 6px;height:34px;overflow:hidden">${p.caption}</figcaption><img src="${p.src}" style="width:100%;display:block;box-shadow:0 0 0 1px #0002"></figure>`).join('')}
    </div></body>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  const g = await page.$('#g'); const box = await g.boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
  const buf = await g.screenshot({ type: 'jpeg', quality: 80 });
  await writeFile(out, buf);
  await page.close();
}

// ---------------------------------------------------------------- main
const resultsFile = path.join(ROOT, 'results.json');
const results = JSON.parse(await readFile(resultsFile, 'utf8').catch(() => '{}'));
results.generated = new Date().toISOString();
results.environment = { node: process.version, platform: `${process.platform} ${process.arch}`, widths: WIDTHS, views: VIEW, seed: SEED };

await run('node', [path.join(ROOT, 'fetch-assets.mjs')]);
const server = await serve(ROOT, variants);
log(`serving ${server.base}`);
const { browser } = await launch();
results.environment.chromium = browser.version();
const conv = await browser.newPage();
try {
  // the phone image the page shows (a light-edged image for the image-hairline move)
  {
    const p = await browser.newPage({ viewport: { width: 300, height: 560 }, deviceScaleFactor: 2 });
    await p.goto(`${server.base}/phone.html`); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, 'page/img/phone.png') }); await p.close();
  }

  if (stage === 'all' || stage === 'singles') {
    const singles = ['base', 'base2', ...MOVES.map((m) => m.id)];
    log('singles: capture');
    if (!noCapture) await capture(singles);
    log('singles: boxes, probe');
    const bx = await boxes(browser, singles);
    const probe = await probeAll(browser, ['base', ...MOVES.map((m) => m.id)]);
    log('singles: measure');
    const measures = {};
    for (const v of ['base2', ...MOVES.map((m) => m.id)]) { measures[v] = await measureVariant(v, bx); log(`  ${v.padEnd(11)} fold1440 pm ${measures[v][1440].fold.pm}% jnd ${measures[v][1440].fold.jnd}% thumb ${measures[v][1440].fold.thumb}% | fold390 pm ${measures[v][390].fold.pm}% thumb ${measures[v][390].fold.thumb}%`); }
    // probe: which checks flip between the baseline and each move
    const detected = {};
    for (const m of MOVES) {
      detected[m.id] = {};
      for (const w of WIDTHS) detected[m.id][w] = Object.keys(probe.base[w]).filter((k) => probe.base[w][k].flag && !probe[m.id][w][k]?.flag);
    }
    // blind sheets: the first viewport at both widths, the most-changed window below the fold at 1440, a 2x zoom
    const items = [];
    for (const m of MOVES) {
      for (const w of WIDTHS) {
        const [a, b] = await viewFiles(m.id, w, 'fold');
        items.push({ variant: m.id, view: `fold-${w}`, a, b });
      }
      const win = Object.entries(measures[m.id][1440].windows).sort((x, y) => y[1].pm - x[1].pm)[0];
      if (win && win[1].pm > 0) { const [a, b] = await viewFiles(m.id, 1440, win[0], null, 'base', bx); items.push({ variant: m.id, view: `window-1440 ${win[0]}`, a, b }); }
      for (const w of WIDTHS) {
        const hot = measures[m.id][w].hot;
        if (hot) { const [a, b] = await viewFiles(m.id, w, 'zoom', hot); items.push({ variant: m.id, view: `zoom-${w}`, a, b }); }
      }
    }
    log(`singles: ${items.length} blind sheets`);
    const key = await blindSheets(items, conv, 'p', rng(SEED));
    await writeFile(path.join(ROOT, 'blind-key.json'), JSON.stringify({ note: 'Key for captures/blind/*.jpg. A reviewer judging the sheets must not open this file or run.mjs output logs first.', seed: SEED, pairs: key }, null, 1));
    results.singles = { measures, probe, detected, boxes: bx };
    // shots: the diff heat maps of the first viewport, every move, at both widths
    for (const w of WIDTHS) {
      await contact(conv, ['base2', ...MOVES.map((m) => m.id)].map((v) => ({ file: path.join(CAP, 'diff', `${v}-${w}-fold.png`), caption: `${v}: pm ${measures[v][w].fold.pm}%, glance ${measures[v][w].fold.thumb}%` })), path.join(SHOTS, `diff-fold-${w}.jpg`), { cols: w === 1440 ? 6 : 9, width: w === 1440 ? 300 : 150, title: `Changed pixels (pixelmatch, red) in the first viewport at ${w}, each move against the baseline. "glance" = CIEDE2000 > 2.3 after a 4x downscale.` });
    }
  }

  if ((stage === 'all' || stage === 'stacks') && STACKS) {
    const names = Object.keys(STACKS);
    log(`stacks: ${names.join(', ')}`);
    if (!noCapture) await capture(names);
    const bx = await boxes(browser, ['base', ...names]);
    const probe = await probeAll(browser, names);
    const measures = {};
    for (const v of names) measures[v] = await measureVariant(v, bx);
    // stack against stack: does everything beyond the top five add anything visible?
    const vsTop = {};
    for (const v of names.filter((n) => n !== 'stack-top5')) vsTop[v] = await measureVariant(v, bx, 'stack-top5');
    const items = [];
    for (const v of names) {
      for (const w of WIDTHS) { const [a, b] = await viewFiles(v, w, 'fold'); items.push({ variant: v, view: `fold-${w}`, a, b }); }
      const win = Object.entries(measures[v][1440].windows).sort((x, y) => y[1].pm - x[1].pm)[0];
      if (win && win[1].pm > 0) { const [a, b] = await viewFiles(v, 1440, win[0], null, 'base', bx); items.push({ variant: v, view: `window-1440 ${win[0]}`, a, b }); }
    }
    for (const w of WIDTHS) { const [a, b] = [capFile('stack-top5', w, true), capFile('stack-all', w, true)]; items.push({ variant: 'stack-all', ref: 'stack-top5', view: `fold-${w}`, a, b }); }
    const key = await blindSheets(items, conv, 's', rng(SEED + 1));
    const bk = JSON.parse(await readFile(path.join(ROOT, 'blind-key.json'), 'utf8').catch(() => '{"pairs":{}}'));
    bk.stackPairs = key;
    await writeFile(path.join(ROOT, 'blind-key.json'), JSON.stringify(bk, null, 1));
    results.stacks = { definition: STACKS, measures, vsTop5: vsTop, probe };
    // shots: the four first viewports side by side at each width
    for (const w of WIDTHS) {
      await run('node', [path.join(SCRIPTS, 'compare.mjs'), '--grid', capFile('base', w, true), ...names.map((n) => capFile(n, w, true)), '--labels', 'Baseline', ...names.map((n) => `${n} (${STACKS[n].length} moves)`), '--labels-as-given', '--out', path.join(CAP, `stacks-${w}.png`)]);
      await toJpeg(conv, await readPng(path.join(CAP, `stacks-${w}.png`)), path.join(SHOTS, `stacks-fold-${w}.jpg`), 0.8, w === 1440 ? 0.75 : 0.6);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

// the judgements (written by hand from the blind sheets, see README) joined with the measures
if (judgements?.singles && results.singles) {
  results.judged = {};
  for (const [id, j] of Object.entries(judgements.singles)) {
    const m = results.singles.measures[id];
    results.judged[id] = { ...j, fold1440: m?.[1440].fold, fold390: m?.[390].fold, probeDetected1440: results.singles.detected[id]?.[1440] };
  }
}
await writeFile(resultsFile, JSON.stringify(results, null, 1));
log(`wrote ${path.relative(process.cwd(), resultsFile)}`);
