// S2 motion lab — one runner that rebuilds and re-measures everything and writes results.json.
//   npm install && node fetch-assets.mjs && node run.mjs [--only a|b|c|x] [--runs 5]
// Part A: seven interactions × eight tools (a/run-a.mjs), Motion transform-string repro, rest (rAF) probes.
// Part B: Rive / Lottie / dotLottie / SVG+CSS / sprite for one stateful toggle, plus loops (b/run-b.mjs).
// Part C: skills/website-redesign/scripts/motion.mjs on four builds of one page, scored against c/truth.json.
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
  results.a = trim(await runA());
  results.a.motionTransformRepro = await reproMotion();
  results.a.restProbes = await restProbes();
  const { reproMotionReduce } = await import('./a/repro-motion-reduce.mjs');
  results.a.motionReduceRepro = await reproMotionReduce();
}
if (only.includes('b')) { const { runB } = await import('./b/run-b.mjs'); const { restB } = await import('./b/rest-b.mjs'); results.b = await runB(); results.b.restCheck = await restB(); }
// --only x: just the two small follow-up checks that a and b also run (Motion React reduced-motion repro, Part B at-rest check)
if (only.includes('x')) {
  const { reproMotionReduce } = await import('./a/repro-motion-reduce.mjs'); const { restB } = await import('./b/rest-b.mjs');
  results.a.motionReduceRepro = await reproMotionReduce(); results.b.restCheck = await restB();
}
if (only.includes('c')) { const { runC } = await import('./c/run-c.mjs'); results.c = await runC(); }
await writeFile(file, JSON.stringify(results, null, 1));
console.log(`results.json written (${only.join(', ')})`);
