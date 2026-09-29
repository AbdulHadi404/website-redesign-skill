/**
 * Engine timing on the same PNG pairs (stable captures from capture-set.mjs), repeated and interleaved: in each round
 * every engine runs once on every pair, in a rotated order, so load from other processes falls on all engines alike.
 * Decode is included for all (pngjs for the JS engines; odiff decodes natively in its own process).
 * Median per engine and width; the load average before and after is recorded.
 */
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const require = createRequire(import.meta.url);
const pexec = promisify(execFile);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pwCompare = require('playwright-core/lib/coreBundle').utils.getComparator('image/png');
const resemble = require('@mirzazeyrek/node-resemble-js');
const odiffBin = require.resolve('@odiff/linux-x64/odiff', { paths: [path.join(root, 'node_modules/odiff-bin')] });
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const ENGINES = {
  'pixelmatch t0.1 (compare.mjs)': async (fa, fb) => {
    const [A, B] = [PNG.sync.read(await readFile(fa)), PNG.sync.read(await readFile(fb))];
    const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
    const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
    return pixelmatch(crop(A).data, crop(B).data, null, w, h, { threshold: 0.1 });
  },
  'Playwright comparator (t0.2)': async (fa, fb) => pwCompare(await readFile(fb), await readFile(fa), {}),
  'Playwright ssim-cie94': async (fa, fb) => pwCompare(await readFile(fb), await readFile(fa), { comparator: 'ssim-cie94' }),
  'odiff (t0.1)': async (fa, fb) => pexec(odiffBin, [fa, fb, '/tmp/s2-S7/odiff-timing.png', '--parsable-stdout']).catch(() => null),
  'resemble (BackstopJS)': (fa, fb) => new Promise((r) => { resemble.outputSettings({}); resemble(fa).compareTo(fb).onComplete(r); }),
};

export async function runTiming(capRoot, { reps = 7, variants = ['control', 'shift1', 'colour'] } = {}) {
  const loadBefore = os.loadavg().map((x) => Math.round(x * 10) / 10);
  const times = {};
  const names = Object.keys(ENGINES);
  for (let r = 0; r < reps; r++) for (const width of [1280, 390]) for (const v of variants) {
    const dir = path.join(capRoot, 'stable', String(width));
    const order = names.map((_, i) => names[(i + r) % names.length]);
    for (const n of order) {
      const t0 = performance.now();
      await ENGINES[n](path.join(dir, 'baseline.png'), path.join(dir, `${v}.png`));
      ((times[n] ||= {})[width] ||= []).push(performance.now() - t0);
    }
  }
  const out = Object.fromEntries(Object.entries(times).map(([n, byW]) => [n, Object.fromEntries(Object.entries(byW).map(([w, xs]) => [w, { medianMs: Math.round(median(xs)), n: xs.length, min: Math.round(Math.min(...xs)), max: Math.round(Math.max(...xs)) }]))]));
  const rank = (w) => Object.entries(out).sort((a, b) => a[1][w].medianMs - b[1][w].medianMs).map(([n, v]) => `${n} ${v[w].medianMs}`);
  return { reps, variants, loadBefore, loadAfter: os.loadavg().map((x) => Math.round(x * 10) / 10), engines: out, order1280: rank(1280), order390: rank(390) };
}
