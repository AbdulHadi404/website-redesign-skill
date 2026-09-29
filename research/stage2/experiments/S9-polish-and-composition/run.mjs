#!/usr/bin/env node
/**
 * S9 runner: rebuilds and re-measures everything, and writes results.json.
 *
 *   node run.mjs                  # singles (every move alone) + stacks (if judgements.json exists) + sheets
 *   node run.mjs --stage singles  # only the single-move captures, measures, probe and blind sheets
 *   node run.mjs --stage stacks   # only the stacks (needs judgements.json)
 *   node run.mjs --stage checks   # only the small lab checks (focus ring vs corner-shape; what pixelmatch sees)
 *   node run.mjs --stage nofocus  # every move again without the forced focus on the primary action (after review)
 *   node run.mjs --stage outside  # the polish probe (v1 and v2) on eleven pages it was not built on (outside.mjs)
 *   node run.mjs --no-capture     # reuse the captures already in captures/pages
 *
 * Steps: fetch fonts (fetch-assets.mjs) -> serve page/ with each variant's move classes -> render the phone image
 * -> capture every variant at 1440 and 390 with the skill's capture.mjs -> measure each variant against the
 * baseline (pixelmatch %, CIEDE2000 > 1 and > 2.3 areas, the > 2.3 area after a 4x downscale) on the first viewport, the full
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
import { probePage, focusChecks } from './lib/probe.mjs';
import { probeOutside } from './outside.mjs';

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
// the same variants without the forced focus on the primary action (the page's script skips it under m-nofocus)
const NF = ['base', ...MOVES.map((m) => m.id)];
for (const v of NF) variants[`nf-${v}`] = [...variants[v], 'nofocus'];

// ---------------------------------------------------------------- helpers
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Child processes run asynchronously: the fixture's server lives in this process and must keep answering.
function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, argv, { env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    let out = '', err = '';
    c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { err += d; });
    c.on('close', (code, sig) => (code === 0 ? resolve(err ? `${out}\n--- stderr ---\n${err}` : out) : reject(new Error(`${cmd} ${argv.slice(0, 4).join(' ')} … failed (${code ?? sig}):\n${err.slice(-2000)}`))));
  });
}
const exists = async (f) => !!(await stat(f).catch(() => null));
const capFile = (v, w, fold) => path.join(PAGES, `v-${v}-${w}${fold ? '-fold' : ''}.png`);

async function capture(list) {
  await mkdir(PAGES, { recursive: true });
  const t0 = Date.now();
  // Captured in batches, and any variant whose files are missing afterwards is captured again: on a shared
  // machine a long capture process can die part-way (seen once here), and a batch loses less.
  const missing = async () => { const m = []; for (const v of list) for (const w of WIDTHS) if (!(await exists(capFile(v, w, true))) || !(await exists(capFile(v, w, false)))) { m.push(v); break; } return m; };
  for (const v of list) for (const w of WIDTHS) for (const f of [capFile(v, w, true), capFile(v, w, false)]) await rm(f, { force: true });
  for (let attempt = 1; attempt <= 3; attempt++) {
    const todo = await missing();
    if (!todo.length) break;
    for (let i = 0; i < todo.length; i += 6) {
      const batch = todo.slice(i, i + 6);
      const out = await run('node', [path.join(SCRIPTS, 'capture.mjs'), '--base', server.base, '--paths', ...batch.map((v) => `/v/${v}/`), '--widths', WIDTHS.join(','), '--out', PAGES]).catch((e) => String(e));
      await writeFile(path.join(CAP, `capture-${batch[0]}-a${attempt}.log`), out);
    }
  }
  const left = await missing();
  if (left.length) throw new Error(`captures still missing after 3 attempts: ${left.join(', ')}`);
  log(`  captured ${list.length} variants x ${WIDTHS.length} widths in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

async function boxes(browser, list) {
  const out = {};
  for (const w of WIDTHS) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: VIEW[w].h }, deviceScaleFactor: VIEW[w].dpr, isMobile: mobile, hasTouch: mobile });
    for (const v of list) {
      const p = await ctx.newPage();
      await p.goto(`${server.base}/v/${v}/`); await p.evaluate(() => document.fonts.ready);
      (out[v] ||= {})[w] = await p.evaluate((sels) => Object.fromEntries(sels.map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [s, { top: r.top + scrollY, height: r.height, left: r.left, width: r.width }]; })), [...WINDOWS, '.hero .btn-primary', '.btn-publish']);
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
      const r = await p.evaluate(probePage, {});
      if (!mobile) Object.assign(r, await focusChecks(p));
      (out[v] ||= {})[w] = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, { kind: x.kind, flag: x.flag, value: x.value, ...(v === 'base' || v === 'stack-all' ? { detail: x.detail } : {}) }]));
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
    const full = measure(FA, FB, { fullRes: false }); // full pages: pixelmatch and the glance measure only (speed)
    const windows = {};
    for (const s of WINDOWS) {
      const ya = Math.max(0, (bx[ref][w][s].top - 64) * dpr), yb = Math.max(0, (bx[v][w][s].top - 64) * dpr);
      const m = measure(crop(FA, 0, ya, FA.width, h * dpr), crop(FB, 0, yb, FB.width, h * dpr));
      windows[s] = { pm: m.pm, jnd1: m.jnd1, jnd: m.jnd, thumb: m.thumb, meanDE: m.meanDE, ya, yb };
    }
    const { diff, ...foldRest } = fold;
    r[w] = { fold: foldRest, full: { pm: full.pm, thumb: full.thumb, heights: [FA.height, FB.height] }, windows, hot: hotWindow(diff, 400 * dpr / (w < 768 ? 2 : 1), 250 * dpr / (w < 768 ? 2 : 1)) };
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
async function contact(conv, panels, out, { cols = 5, width = 360, title = '', filter = '' } = {}) {
  const imgs = await Promise.all(panels.map(async (p) => ({ ...p, src: `data:image/png;base64,${(await readFile(p.file)).toString('base64')}` })));
  const ctx = await conv.context().browser().newContext();
  const page = await ctx.newPage();
  await page.setViewportSize({ width: cols * (width + 16) + 32, height: 1000 });
  await page.setContent(`<!doctype html><body style="margin:0;background:#e9e9e7;font:600 13px/1.3 system-ui,sans-serif;color:#222">
    <div id="g" style="padding:16px;display:grid;grid-template-columns:repeat(${cols},${width}px);gap:16px;width:max-content">
    ${title ? `<div style="grid-column:1/-1;font-size:15px">${title}</div>` : ''}
    ${imgs.map((p) => `<figure style="margin:0"><figcaption style="margin:0 0 6px;height:34px;overflow:hidden">${p.caption}</figcaption><img src="${p.src}" style="width:100%;display:block;box-shadow:0 0 0 1px #0002;${filter ? `filter:${filter}` : ''}"></figure>`).join('')}
    </div></body>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  const g = await page.$('#g'); const box = await g.boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
  const buf = await g.screenshot({ type: 'jpeg', quality: 80 });
  await writeFile(out, buf);
  await ctx.close();
}

// First viewport only (the forced focus is on the hero's primary action, so the rest of the page is unaffected).
async function measureFold(v, ref) {
  const r = {};
  for (const w of WIDTHS) {
    const { diff, ...m } = measure(await readPng(capFile(ref, w, true)), await readPng(capFile(v, w, true)));
    r[w] = { fold: m };
  }
  return r;
}

// Value structure as numbers: the first viewport in greyscale, blurred 12 px (the 4 px blur of the 1/3-scale sheet),
// and the mean grey (0 black, 1 white) inside each named box grown by 8 px, against the whole viewport's median.
async function valueMasses(conv, file, boxes) {
  const b64 = (await readFile(file)).toString('base64');
  return conv.evaluate(async ([b64, boxes]) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.filter = 'grayscale(1) blur(12px)'; x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const hist = new Uint32Array(256); for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
    let acc = 0, med = 0; const half = d.length / 8; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= half) { med = v; break; } }
    const out = { ground: +(med / 255).toFixed(3) };
    for (const [k, b] of Object.entries(boxes)) {
      const x0 = Math.max(0, Math.floor(b.left - 8)), x1 = Math.min(c.width, Math.ceil(b.left + b.width + 8)), y0 = Math.max(0, Math.floor(b.top - 8)), y1 = Math.min(c.height, Math.ceil(b.top + b.height + 8));
      let s = 0, n = 0, min = 255; for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) { const v = d[(y * c.width + xx) * 4]; s += v; n++; if (v < min) min = v; }
      out[k] = { mean: +(s / n / 255).toFixed(3), min: +(min / 255).toFixed(3) };
    }
    return out;
  }, [b64, boxes]);
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
    // Moves whose change below the fold pixelmatch does not flag (pm 0) but CIEDE2000 does (a 10% hairline, a
    // tint): an extra window sheet each, in their own id series so the p-series stays as judged.
    const extra = [];
    for (const m of MOVES) {
      const wins = Object.entries(measures[m.id][1440].windows);
      if (wins.some(([, x]) => x.pm > 0)) continue;
      const win = wins.sort((x, y) => y[1].jnd1 - x[1].jnd1)[0];
      if (win && win[1].jnd1 > 0) { const [a, b] = await viewFiles(m.id, 1440, win[0], null, 'base', bx); extra.push({ variant: m.id, view: `window-1440 ${win[0]}`, a, b }); }
    }
    const keyQ = extra.length ? await blindSheets(extra, conv, 'q', rng(SEED + 2)) : {};
    await writeFile(path.join(ROOT, 'blind-key.json'), JSON.stringify({ note: 'Key for captures/blind/*.jpg. A reviewer judging the sheets must not open this file or run.mjs output logs first.', seed: SEED, pairs: { ...key, ...keyQ } }, null, 1));
    results.singles = { measures, probe, detected, boxes: bx };
    // shots: the diff heat maps of the first viewport, every move, at both widths
    for (const w of WIDTHS) {
      await contact(conv, ['base2', ...MOVES.map((m) => m.id)].map((v) => ({ file: path.join(CAP, 'diff', `${v}-${w}-fold.png`), caption: `${v}: pm ${measures[v][w].fold.pm}%, glance ${measures[v][w].fold.thumb}%` })), path.join(SHOTS, `diff-fold-${w}.jpg`), { cols: w === 1440 ? 6 : 9, width: w === 1440 ? 300 : 150, title: `Changed pixels (pixelmatch, red) in the first viewport at ${w}, each move against the baseline. "glance" = CIEDE2000 > 2.3 after a 4x downscale.` });
    }
  }

  if (stage === 'all' || stage === 'checks') {
    // Small controlled checks behind findings in the report.
    const lab = {};
    // 1. Does the browser's default focus ring follow corner-shape? (a squircle button, default ring vs solid ring)
    {
      const ctx = await browser.newContext({ viewport: { width: 520, height: 200 }, deviceScaleFactor: 3 });
      const p = await ctx.newPage();
      await p.setContent(`<style>body{margin:0;padding:30px;background:#f4f4f4;display:flex;gap:40px;font:600 16px sans-serif}
        button{height:44px;padding:0 20px;border:0;border-radius:19px;background:#c43d1b;color:#fff}
        .sq{corner-shape:squircle}.solid:focus-visible{outline:2px solid #b8391a;outline-offset:3px}</style>
        <button class="sq" id=a>default ring</button><button class="sq solid" id=b>solid ring</button>`);
      const shots = [];
      for (const id of ['a', 'b']) {
        await p.focus(`#${id}`);
        const bb = await (await p.$(`#${id}`)).boundingBox();
        const f = path.join(CAP, `ring-${id}.png`);
        await p.screenshot({ path: f, clip: { x: bb.x - 10, y: bb.y - 10, width: bb.width + 20, height: bb.height + 20 } });
        // fill colour outside the ring: sample the corner pixels just outside the button's box corner diagonal
        shots.push({ file: f, caption: id === 'a' ? 'corner-shape: squircle + default focus ring (outline-style: auto)' : 'corner-shape: squircle + outline: 2px solid, offset 3px' });
        lab[`ring-${id}`] = await p.evaluate((id) => { const cs = getComputedStyle(document.getElementById(id)); return { outlineStyle: cs.outlineStyle, cornerShape: cs.getPropertyValue('corner-shape') }; }, id);
      }
      await contact(conv, shots, path.join(SHOTS, 'focus-ring-corner-shape.jpg'), { cols: 2, width: 330, title: 'Chromium: the default focus ring is drawn round and ignores corner-shape; a solid outline follows it.' });
      await ctx.close();
    }
    // 2. What pixelmatch (threshold 0.1, the compare.mjs default) and CIEDE2000 see of a 1 px 10% black hairline on white.
    {
      const ctx = await browser.newContext({ viewport: { width: 200, height: 100 } });
      const p = await ctx.newPage();
      const shot = async (css) => { await p.setContent(`<body style="margin:0;background:#fff"><div style="margin:20px;width:160px;height:60px;background:#fff;${css}"></div>`); return readPng(await p.screenshot({ path: path.join(CAP, 'tmp-hairline.png') }).then(() => path.join(CAP, 'tmp-hairline.png'))); };
      const A = await shot(''), B = await shot('box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1)'), C = await shot('box-shadow: 0 2px 8px rgb(0 0 0 / .08)');
      const hb = measure(A, B), sh = measure(A, C);
      lab.hairline10 = { changedPx: Math.round(hb.any / 100 * 200 * 100), pixelmatchPct: hb.pm, de00Over1Pct: hb.jnd1, de00Over2_3Pct: hb.jnd };
      lab.softShadow = { changedPx: Math.round(sh.any / 100 * 200 * 100), pixelmatchPct: sh.pm, de00Over1Pct: sh.jnd1, de00Over2_3Pct: sh.jnd };
      await ctx.close();
    }
    // 3. The skill's audit.mjs concentric-radii check against the probe's, on the baseline and the radius move.
    {
      const out = path.join(CAP, 'audit');
      await run('node', [path.join(SCRIPTS, 'audit.mjs'), '--base', server.base, '--paths', '/v/base/', '/v/radius/', '--widths', '1440', '--no-axe', '--out', out]).catch(() => null); // exits 1 when a page has a fail
      lab.auditConcentric = {};
      for (const v of ['base', 'radius']) {
        const j = JSON.parse(await readFile(path.join(out, `v-${v}-1440.json`), 'utf8').catch(() => 'null'));
        const find = (x) => { if (!x || typeof x !== 'object') return undefined; if (Array.isArray(x.radiusMismatch)) return x.radiusMismatch; for (const y of Object.values(x)) { const r = find(y); if (r) return r; } return undefined; };
        lab.auditConcentric[v] = { audit: find(j) ?? null, probe: results.singles?.probe?.[v]?.[1440]?.concentric?.value ?? null, probeDetail: results.singles?.probe?.[v]?.[1440]?.concentric?.detail ?? null };
      }
    }
    results.labChecks = lab;
    log(`checks: ${JSON.stringify(lab)}`);
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
    // the value-structure (notan) view: greyscale and blurred, where the eye lands before it reads
    await contact(conv, ['base', ...names].map((v) => ({ file: capFile(v, 1440, true), caption: v === 'base' ? 'Baseline' : `${v} (${STACKS[v].length} moves)` })), path.join(SHOTS, 'value-structure-1440.jpg'), { cols: names.length + 1, width: 480, filter: 'grayscale(1) blur(4px)', title: 'First viewport at 1440, greyscale and blurred 4 px (at 1/3 scale): the value masses the eye meets first.' });
  }

  if (stage === 'all' || stage === 'nofocus') {
    // After review: every capture above shows the primary action keyboard-focused (the page focuses it on load so
    // the focus-ring move has a ring to show). Pointer users never see that state on arrival. Here every move is
    // captured again without it, and measured against the unfocused baseline.
    const list = NF.map((v) => `nf-${v}`);
    log('nofocus: capture');
    if (!noCapture) await capture(list);
    const measures = {};
    for (const v of NF.filter((x) => x !== 'base')) measures[v] = await measureFold(`nf-${v}`, 'nf-base');
    const ringOnly = await measureFold('nf-base', 'base'); // what the forced focus alone changes on the baseline
    const bx = await boxes(browser, ['base', 'nf-base', 'accent', 'nf-accent', ...(STACKS ? ['stack-bottom5'] : [])]);
    const masses = {};
    for (const v of Object.keys(bx)) {
      if (!(await exists(capFile(v, 1440, true)))) continue;
      const b = bx[v][1440];
      masses[v] = await valueMasses(conv, capFile(v, 1440, true), { heroCta: b['.hero .btn-primary'], publish: b['.btn-publish'] });
    }
    results.nofocus = { note: 'nf-<move> against nf-base, first viewport only; ringOnly = nf-base against the focused base', measures, ringOnly, valueMasses: masses };
    await contact(conv, [['base', 'Baseline (primary action focused, as judged)'], ['nf-base', 'Baseline, not focused'], ['accent', 'Accent restraint (focused)'], ['nf-accent', 'Accent restraint, not focused']].map(([v, caption]) => ({ file: capFile(v, 1440, true), caption })), path.join(SHOTS, 'value-structure-focus-1440.jpg'), { cols: 4, width: 420, filter: 'grayscale(1) blur(4px)', title: 'Value structure at 1440 with and without the forced focus state (greyscale, blurred 4 px at under 1/3 scale).' });
  }

  if (stage === 'all' || stage === 'outside') {
    log('outside: the probe on pages it was not built on');
    results.outside = await probeOutside(browser);
  }
} finally {
  await browser.close();
  await server.close();
}

// the builder's forced choices on the blind sheets (judgements.json "sheets"), scored against the key
if (judgements?.sheets) {
  // Score against the key the judge was shown (the snapshot in judgements.json); warn if this run's key differs,
  // which would mean the sheets were regenerated differently from the ones judged.
  const bk = JSON.parse(await readFile(path.join(ROOT, 'blind-key.json'), 'utf8'));
  const keyAll = { ...(judgements.keySnapshot || bk.pairs), ...(judgements.stackKeySnapshot || bk.stackPairs || {}) };
  const drift = Object.keys(judgements.keySnapshot || {}).filter((id) => JSON.stringify(bk.pairs?.[id]) !== JSON.stringify(judgements.keySnapshot[id]));
  if (drift.length) console.warn(`⚠ ${drift.length} blind sheets differ from the ones judged (${drift.slice(0, 5).join(', ')}…): judgements are scored against the snapshot`);
  const rows = Object.entries(judgements.sheets).filter(([id]) => keyAll[id]).map(([id, j]) => {
    const k = keyAll[id];
    const control = k.variant === 'null';
    // "better": the side judged more finished; "=" when no difference was seen or no preference
    const correct = control ? j.better === '=' : j.better === k.variantSide;
    const reversed = !control && j.better !== '=' && j.better !== k.variantSide;
    return { id, ...k, seen: j.seen, better: j.better, correct, reversed, note: j.note };
  });
  const by = (f) => rows.reduce((m, r) => { (m[f(r)] ||= []).push(r); return m; }, {});
  const summary = Object.fromEntries(Object.entries(by((r) => `${r.id[0] === 's' ? 'stack' : 'single'} ${r.view.split(' ')[0]}`)).map(([v, rs]) => [v, { n: rs.length, seen: rs.filter((r) => r.seen).length, correct: rs.filter((r) => r.correct).length, reversed: rs.filter((r) => r.reversed).length }]));
  results.blindScore = { judge: judgements.judge, summary, rows };
}

await writeFile(resultsFile, JSON.stringify(results, null, 1));
log(`wrote ${path.relative(process.cwd(), resultsFile)}`);
