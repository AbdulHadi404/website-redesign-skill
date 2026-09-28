#!/usr/bin/env node
// S4 runner — rebuilds and re-measures everything and writes results.json.
//
//   npm install --legacy-peer-deps --ignore-scripts     (once; versions are pinned in package.json)
//   NODE_USE_ENV_PROXY=1 node run.mjs                   all steps
//   node run.mjs --only size,a11y                      a subset: meta, licence, activity, size, theming, a11y
//   node run.mjs --runs 5                              repetitions per a11y demo (median of timings; pass/fail must agree)
//
// Steps
//   meta      npm registry: latest version and date, releases in the last 12 months, deps, deprecation
//   licence   the LICENSE file shipped in each installed package, classified from its text (not the package.json field)
//   activity  GitHub over git (treeless, shallow since 2025-09-28): commits, human authors, top author share
//   size      esbuild minimal usage per candidate (React/Vue/Svelte external), gzip -9; initial vs lazy JS, CSS, WASM
//   theming   CSS files the package ships and the custom properties they define (how it takes a design system)
//   a11y      demos/*.jsx built with React and driven by Playwright: keyboard operation and the accessibility tree
//
// Network: meta and activity need the npm registry and github.com; size, licence and a11y run offline.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, candidates } from './catalogue.mjs';
import { registry, licence, activity, readmeNotice, CUTOFF } from './lib/meta.mjs';
import { measure } from './lib/size.mjs';
import { theming } from './lib/theming.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : ['meta', 'licence', 'activity', 'size', 'theming', 'a11y'];
const RUNS = argv.includes('--runs') ? +argv[argv.indexOf('--runs') + 1] : 5;
const WORK = process.env.S4_WORK || path.join(os.tmpdir(), 's2-S4');
const resultsFile = path.join(here, 'results.json');
const results = existsSync(resultsFile) ? JSON.parse(await readFile(resultsFile, 'utf8')) : {};
const pkg = JSON.parse(await readFile(path.join(here, 'package.json'), 'utf8'));

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

results.env = { node: process.version, cpus: os.cpus().length, date: new Date().toISOString().slice(0, 10), cutoff: CUTOFF, esbuild: pkg.dependencies.esbuild };
results.categories = Object.fromEntries(categories);
results.candidates ??= {};
for (const c of candidates) {
  const prev = results.candidates[c.id] || {};
  results.candidates[c.id] = { ...prev, id: c.id, cat: c.cat, label: c.label || c.pkgs[0], pkgs: c.pkgs, repo: c.repo, fw: c.fw, kind: c.kind, skip: c.skip || null };
}

if (only.includes('meta')) {
  console.log('== meta (npm registry)');
  const metas = await pool(candidates, 8, (c) => registry(c.pkgs[0]));
  candidates.forEach((c, i) => { results.candidates[c.id].registry = metas[i]; });
  const notices = await pool(candidates, 8, (c) => readmeNotice(here, c.pkgs[0]));
  candidates.forEach((c, i) => { results.candidates[c.id].readmeNotice = notices[i]; });
}

if (only.includes('licence')) {
  console.log('== licence (shipped files)');
  for (const c of candidates) {
    const ls = [];
    for (const p of c.pkgs) ls.push(await licence(here, p, c.repo));
    results.candidates[c.id].licences = ls;
  }
}

if (only.includes('activity')) {
  console.log('== activity (git)');
  const repos = [...new Set(candidates.map((c) => c.repo).filter(Boolean))];
  const acts = await pool(repos, 4, async (r) => { const a = await activity(r, path.join(WORK, 'git')); process.stdout.write('.'); return a; });
  const byRepo = Object.fromEntries(repos.map((r, i) => [r, acts[i]]));
  for (const c of candidates) results.candidates[c.id].activity = c.repo ? byRepo[c.repo] : null;
  console.log();
}

if (only.includes('size')) {
  console.log('== size (esbuild + gzip -9)');
  for (const c of candidates) {
    if (!c.entry) { results.candidates[c.id].size = null; continue; }
    const r = await measure(c.id, c.entry, { buildDir: path.join(WORK, 'build'), root: here, assets: c.assets, alias: c.alias });
    delete r.packageList;
    results.candidates[c.id].size = r;
    console.log(' ', c.id.padEnd(24), r.ok ? `initial ${(r.initialGz / 1024).toFixed(1)} KB gz · all JS ${(r.jsGz / 1024).toFixed(1)} · css ${(r.cssGz / 1024).toFixed(1)} · assets ${(r.assetsGz / 1024).toFixed(1)} · ${r.packages} pkgs` : 'ERR ' + r.error);
  }
}

if (only.includes('theming')) {
  console.log('== theming surface (shipped CSS)');
  for (const c of candidates) {
    const t = [];
    for (const p of c.pkgs) { const r = await theming(here, p); if (r && r.cssFiles) t.push({ pkg: p, ...r }); }
    results.candidates[c.id].theming = t;
  }
}

if (only.includes('a11y')) {
  console.log('== a11y demos');
  const { runA11y } = await import('./demos/run-a11y.mjs');
  results.a11y = await runA11y({ root: here, work: path.join(WORK, 'demos'), runs: RUNS });
}

await writeFile(resultsFile, JSON.stringify(results, null, 1) + '\n');
console.log('wrote', path.relative(process.cwd(), resultsFile));
