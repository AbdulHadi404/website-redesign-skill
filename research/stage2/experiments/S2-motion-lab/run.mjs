// S2 motion lab — one runner that rebuilds and re-measures everything and writes results.json.
//   npm install && node fetch-assets.mjs && node c/fetch-ext.mjs && node run.mjs [--only a|b|c|x] [--runs 5] [--variants css,gsap]
// Part A: seven interactions × eight tools (a/run-a.mjs), Motion transform-string repro, rest (rAF) probes.
// Part B: Rive / Lottie / dotLottie / SVG+CSS / sprite for one stateful toggle, plus loops (b/run-b.mjs).
// Part C: skills/website-redesign/scripts/motion.mjs on four builds of one page (c/truth.json), the six Part A pages
//   guarded and not (c/run-heldout.mjs, c/truth-partA.json), five dev pages before/after and 15 held-out pages
//   (c/run-pages.mjs, c/labels.json, c/truth-pages.json; third-party pages fetched by c/fetch-ext.mjs), and a
//   starved-page stress test (c/stress-press.mjs).
// One benchmark browser at a time; medians of --runs (default 5). Chromium headless, SwiftShader for WebGL.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { labRoot } from './lib/server.mjs';
import { parseArgs } from '../../../../skills/website-redesign/scripts/lib/env.mjs';
const args = parseArgs();
const only = args.only ? String(args.only).split(',') : ['a', 'b', 'c'];
const file = path.join(labRoot, 'results.json');
const results = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
results.env = { date: new Date().toISOString(), node: process.version, cpus: os.cpus().length, platform: process.platform,
  versions: Object.fromEntries(['motion', 'gsap', 'animejs', '@react-spring/web', '@formkit/auto-animate', '@theatre/core', 'react', 'lottie-web', '@lottiefiles/dotlottie-web', '@rive-app/canvas', '@rive-app/canvas-lite', '@rive-app/webgl2', '@rive-app/react-canvas', 'esbuild']
    .map((p) => [p, JSON.parse(readFileSync(path.join(labRoot, 'node_modules', p, 'package.json'), 'utf8')).version])) };
const trim = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'trace' ? undefined : v)));
if (only.includes('a')) {
  const { runA } = await import('./a/run-a.mjs');
  const { reproMotion } = await import('./a/repro-motion-transform.mjs');
  const { restProbes } = await import('./a/rest-probes.mjs');
  // --variants css,autoanimate re-measures only those variants and merges them into the existing results
  // (--cost-only / --no-cost limit it further); without --variants, Part A is replaced as a whole.
  const fresh = trim(await runA());
  if (args.variants && results.a) { for (const k of ['sizes', 'interrupt', 'single', 'compositor', 'cost']) results.a[k] = { ...results.a[k], ...fresh[k] };
    if (fresh.costOrder && Object.keys(fresh.costOrder).length) results.a.costOrder = fresh.costOrder; results.a.env = fresh.env; }
  else results.a = fresh;
  if (!args.variants) { // the repros and probes are not per-variant: they run with a full Part A only
    results.a.motionTransformRepro = await reproMotion();
    results.a.restProbes = await restProbes();
    const { reproMotionReduce } = await import('./a/repro-motion-reduce.mjs');
    results.a.motionReduceRepro = await reproMotionReduce();
  }
}
if (only.includes('b')) { const { runB } = await import('./b/run-b.mjs'); const { restB } = await import('./b/rest-b.mjs'); results.b = await runB(); results.b.restCheck = await restB(); }
// --only x: just the two small follow-up checks that a and b also run (Motion React reduced-motion repro, Part B at-rest check)
if (only.includes('x')) {
  const { reproMotionReduce } = await import('./a/repro-motion-reduce.mjs'); const { restB } = await import('./b/rest-b.mjs');
  results.a.motionReduceRepro = await reproMotionReduce(); results.b.restCheck = await restB();
}
if (only.includes('c')) { const { runC } = await import('./c/run-c.mjs'); const prev = results.c; results.c = await runC({ rescore: !!args.rescore });
  if (args.rescore && prev) for (const [v, p] of Object.entries(results.c.pages)) p.seconds = prev.pages?.[v]?.seconds; } // --rescore: re-score the last reports
await writeFile(file, JSON.stringify(results, null, 1));
console.log(`results.json written (${only.join(', ')})`);
