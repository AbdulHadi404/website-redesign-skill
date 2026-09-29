/**
 * Image-comparison engines run on the same PNG pairs (captures/vr/<mode>/<width>/baseline.png vs <variant>.png),
 * each at the defaults a user gets out of the box (and one "tuned" setting where the tool offers an obvious knob).
 * Records: diff pixel count, verdict (does the tool call it a failure?), median ms of 5 runs, and for the pixelmatch
 * mask the changed regions (bounding boxes) so their usefulness for an agent can be judged.
 */
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { VARIANTS, TRUTH, WIDTHS } from './capture-set.mjs';

const require = createRequire(import.meta.url);
const pexec = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const pwCompare = require('playwright-core/lib/coreBundle').utils.getComparator('image/png');
const resemble = require('@mirzazeyrek/node-resemble-js');
const odiffBin = require.resolve('@odiff/linux-x64/odiff', { paths: [path.join(root, 'node_modules/odiff-bin')] });
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const read = async (f) => PNG.sync.read(await readFile(f));
const crop = (img, w, h) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };

/** pixelmatch as compare.mjs calls it: overlap only, threshold 0.1, AA pixels ignored. */
function pm(A, B, opts) {
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const out = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A, w, h).data, crop(B, w, h).data, out.data, w, h, { threshold: 0.1, ...opts });
  return { n, out, w, h, sizeDiff: A.width !== B.width || A.height !== B.height };
}

/** Changed regions: diff pixels grouped by 8 px dilation into boxes (union-find over a coarse grid). */
export function regions(mask, w, h, cell = 8) {
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const g = new Uint32Array(gw * gh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    // diffMask output: changed pixels are painted red (255,0,0) or the alt colour; untouched are transparent
    if (mask.data[i + 3] > 0 && mask.data[i] > 200 && mask.data[i + 1] < 80) g[Math.floor(y / cell) * gw + Math.floor(x / cell)]++;
  }
  const parent = new Int32Array(gw * gh).map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x; if (!g[i]) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && X < gw && Y < gh && g[Y * gw + X]) parent[find(Y * gw + X)] = find(i); }
  }
  const boxes = new Map();
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x; if (!g[i]) continue;
    const r = find(i); const b = boxes.get(r) || { x0: x, y0: y, x1: x, y1: y, px: 0 };
    b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); b.px += g[i]; boxes.set(r, b);
  }
  return [...boxes.values()].map((b) => ({ x: b.x0 * cell, y: b.y0 * cell, w: (b.x1 - b.x0 + 1) * cell, h: (b.y1 - b.y0 + 1) * cell, px: b.px })).sort((a, b) => b.px - a.px);
}

const ENGINES = {
  'pixelmatch t0.1 (compare.mjs)': async (fa, fb) => { const [A, B] = [await read(fa), await read(fb)]; const r = pm(A, B, {}); return { n: r.n, fail: r.n > 0 || r.sizeDiff }; },
  'pixelmatch t0.1 +AA counted': async (fa, fb) => { const [A, B] = [await read(fa), await read(fb)]; const r = pm(A, B, { includeAA: true }); return { n: r.n, fail: r.n > 0 || r.sizeDiff }; },
  'Playwright comparator (pixelmatch t0.2, maxDiffPixels 0)': async (fa, fb) => {
    const e = pwCompare(await readFile(fb), await readFile(fa), {});
    const n = e ? Number((e.errorMessage.match(/(\d+) pixels/) || [])[1] || 0) : 0;
    return { n, fail: !!e };
  },
  'Playwright comparator ssim-cie94': async (fa, fb) => {
    const e = pwCompare(await readFile(fb), await readFile(fa), { comparator: 'ssim-cie94' });
    const n = e ? Number((e.errorMessage.match(/(\d+) pixels/) || [])[1] || 0) : 0;
    return { n, fail: !!e };
  },
  'odiff (t0.1)': async (fa, fb, out) => odiff(fa, fb, out, []),
  'odiff --aa': async (fa, fb, out) => odiff(fa, fb, out, ['--antialiasing']),
  'resemble (BackstopJS, misMatch 0.1%)': (fa, fb) => new Promise((resolve) => {
    resemble.outputSettings({});
    resemble(fa).compareTo(fb).onComplete((d) => {
      const pct = Number(d.misMatchPercentage);
      resolve({ n: null, pct, fail: !(d.isSameDimensions && pct <= 0.1) });
    });
  }),
};

async function odiff(fa, fb, out, extra) {
  try {
    await pexec(odiffBin, [fa, fb, out, '--parsable-stdout', ...extra]);
    return { n: 0, fail: false };
  } catch (e) {
    // exit 22: pixel differences; stdout "<count>;<percentage>"; exit 21: layout (size) difference
    const m = String(e.stdout || '').trim().match(/^(\d+);([\d.]+)/);
    return { n: m ? Number(m[1]) : null, fail: true, layout: e.code === 21 };
  }
}

async function regCli(dir, mode, width, tmp) {
  // reg-cli compares folders: expected/<variant>.png = the baseline, actual/<variant>.png = the variant.
  const exp = path.join(tmp, 'expected'), act = path.join(tmp, 'actual'), diff = path.join(tmp, 'diff');
  await rm(tmp, { recursive: true, force: true });
  await mkdir(exp, { recursive: true }); await mkdir(act, { recursive: true });
  for (const v of VARIANTS) { await cp(path.join(dir, 'baseline.png'), path.join(exp, `${v}.png`)); await cp(path.join(dir, `${v}.png`), path.join(act, `${v}.png`)); }
  const bin = path.join(root, 'node_modules/.bin/reg-cli');
  const times = [];
  let json;
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    try { execFileSync(bin, [act, exp, diff, '-J', path.join(tmp, 'reg.json'), '-I', '--diffFormat', 'png'], { stdio: 'pipe' }); } catch { /* -I: exit 0 anyway */ }
    times.push(performance.now() - t0);
    json = JSON.parse(await readFile(path.join(tmp, 'reg.json'), 'utf8'));
  }
  const failed = new Set(json.failedItems.map((f) => path.basename(f, '.png')));
  return Object.fromEntries(VARIANTS.map((v) => [v, { fail: failed.has(v), msPerImage: Math.round(median(times) / VARIANTS.length) }]));
}

export async function runEngines(capRoot, outDir) {
  await mkdir(outDir, { recursive: true });
  const rows = [];
  for (const mode of ['raw', 'stable']) for (const { width } of WIDTHS) {
    const dir = path.join(capRoot, mode, String(width));
    for (const v of VARIANTS) {
      const fa = path.join(dir, 'baseline.png'), fb = path.join(dir, `${v}.png`);
      for (const [name, fn] of Object.entries(ENGINES)) {
        // Detection once per pair; timing (median of 5, file decode included) on one pair per mode and width.
        const reps = v === 'colour' ? 5 : 1;
        const times = []; let r;
        for (let i = 0; i < reps; i++) { const t0 = performance.now(); r = await fn(fa, fb, path.join(outDir, `odiff-${mode}-${width}-${v}.png`)); times.push(performance.now() - t0); }
        rows.push({ engine: name, mode, width, variant: v, regression: TRUTH[v], fail: r.fail, diffPixels: r.n ?? null, pct: r.pct ?? null, ms: reps === 5 ? Math.round(median(times)) : null });
      }
      // Regions from pixelmatch's mask (what an agent would be pointed at).
      const [A, B] = [await read(fa), await read(fb)];
      const r = pm(A, B, { diffMask: true });
      const boxes = regions(r.out, r.w, r.h);
      rows.push({ engine: 'pixelmatch regions (8px clusters)', mode, width, variant: v, regression: TRUTH[v], fail: boxes.length > 0, diffPixels: r.n, boxes: boxes.slice(0, 6), boxCount: boxes.length,
        changedArea: boxes.reduce((s, b) => s + b.w * b.h, 0), imageArea: r.w * r.h });
    }
    const rc = await regCli(dir, mode, width, path.join('/tmp/s2-S7/reg', `${mode}-${width}`));
    for (const v of VARIANTS) rows.push({ engine: 'reg-cli (defaults)', mode, width, variant: v, regression: TRUTH[v], fail: rc[v].fail, diffPixels: null, ms: rc[v].msPerImage });
  }
  await writeFile(path.join(outDir, 'engines.json'), JSON.stringify(rows, null, 1));
  return rows;
}

/** Confusion summary per engine and mode: regressions caught, noise flagged. */
export function summarise(rows) {
  const out = {};
  for (const r of rows) {
    const k = `${r.engine} | ${r.mode}`;
    const s = (out[k] ||= { engine: r.engine, mode: r.mode, caught: 0, regressions: 0, falseAlarms: 0, noise: 0, missed: [], flaggedNoise: [], msMedian: [] });
    if (r.regression) { s.regressions++; if (r.fail) s.caught++; else s.missed.push(`${r.variant}@${r.width}`); }
    else { s.noise++; if (r.fail) { s.falseAlarms++; s.flaggedNoise.push(`${r.variant}@${r.width}`); } }
    if (r.ms != null) s.msMedian.push(r.ms);
  }
  return Object.values(out).map((s) => ({ ...s, msMedian: s.msMedian.length ? median(s.msMedian) : null }));
}

/** pixelmatch counts across thresholds (stable captures): where noise stops and colour regressions start. */
export async function thresholdSweep(capRoot, thresholds = [0, 0.02, 0.05, 0.08, 0.1, 0.15, 0.2]) {
  const out = [];
  for (const { width } of WIDTHS) {
    const dir = path.join(capRoot, 'stable', String(width));
    const A = await read(path.join(dir, 'baseline.png'));
    for (const v of VARIANTS) {
      const B = await read(path.join(dir, `${v}.png`));
      const row = { width, variant: v, regression: TRUTH[v] };
      for (const t of thresholds) row[`t${t}`] = pm(A, B, { threshold: t }).n;
      out.push(row);
    }
  }
  return out;
}
