#!/usr/bin/env node
// S4 runner — rebuilds and re-measures everything and writes results.json.
//
//   npm install --legacy-peer-deps --ignore-scripts     (once; versions are pinned in package.json)
//   NODE_USE_ENV_PROXY=1 node run.mjs                   all steps
//   node run.mjs --only size,a11y                      a subset of the steps below
//   node run.mjs --runs 5                              repetitions per a11y demo; each check is reported as passes/runs
//
// Steps
//   meta       npm registry: latest version and date; releases in the last 12 months split into stable, pre-release
//              (nightly/canary/beta) and breaking-by-semver (new 0.MINOR or MAJOR lines); deps; deprecation; weekly
//              downloads; README notices about this package (package README, then the repository's root README)
//   licence    the LICENSE file shipped in each installed package, classified from its text (not the package.json field);
//              a missing or pointer-only file falls back to the repository's root licence, then to the package.json field;
//              then the licence class A–D of resources/README.md
//   activity   GitHub over git (treeless, shallow since 2025-09-28): commits, human authors, top author share
//   size       esbuild minimal usage per candidate (React/Vue/Svelte external), gzip -9; initial vs lazy JS, CSS, WASM;
//              and `scan`: keyboard handlers and ARIA in everything the entry bundles, attributed to packages
//   increments what React Aria / Base UI components cost on top of a base set of their own primitives
//   theming    CSS files the package ships and the custom properties they define (how it takes a design system)
//   discovery  whether a plain npm search (libcheck --search) finds each category's leader (18 queries)
//   regress    libcheck.mjs on 34 regression cases (lib/regress.mjs)
//   heldout    libcheck.mjs on 16 packages not used while writing it (lib/heldout.mjs)
//   inert      whether Playwright's ariaSnapshot lists inert / aria-hidden content that Chromium's tree excludes (F9)
//   a11y       demos/*.jsx built with React and driven by Playwright: keyboard operation and the accessibility tree
//
// Network: meta, licence, activity, discovery, regress and heldout need registry.npmjs.org and github.com; size,
// increments, theming, inert and a11y run offline.
// Everything else the lab contains: catalogue.mjs (the 142 candidates), libcheck.mjs (the proposed skill script),
// demos/ (sources + tests.mjs + run-a11y.mjs), lib/table.mjs (prints the catalogue tables from results.json).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, candidates } from './catalogue.mjs';
import { registry, licence, activity, readmeNotice, CUTOFF } from './lib/meta.mjs';
import { measure } from './lib/size.mjs';
import { theming } from './lib/theming.mjs';
import { scanBundle } from './lib/scan.mjs';
import { search, effectiveClass } from './libcheck.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : ['meta', 'licence', 'activity', 'size', 'increments', 'theming', 'discovery', 'regress', 'heldout', 'inert', 'a11y'];
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
  const metas = await pool(candidates, 3, (c) => registry(c.pkgs[0]));
  candidates.forEach((c, i) => { results.candidates[c.id].registry = metas[i]; });
  const notices = await pool(candidates, 8, (c) => readmeNotice(here, c.pkgs[0], c.repo));
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
// Licence class A–D (resources/README.md terms) from the first package's licence plus its README notices.
for (const c of candidates) {
  const x = results.candidates[c.id];
  const l = (x.licences || [])[0];
  if (l) x.licenceClass = effectiveClass({ ...l, readmeNotice: x.readmeNotice?.notice ?? null, readmeProcurement: x.readmeNotice?.procurement ?? null });
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
    // scan: keyboard handlers and ARIA in everything the entry bundles (all dependencies), attributed to packages
    results.candidates[c.id].scan = r.ok ? await scanBundle(r) : null;
    delete r.outDir;
    results.candidates[c.id].size = r;
    console.log(' ', c.id.padEnd(24), r.ok ? `initial ${(r.initialGz / 1024).toFixed(1)} KB gz · all JS ${(r.jsGz / 1024).toFixed(1)} · css ${(r.cssGz / 1024).toFixed(1)} · assets ${(r.assetsGz / 1024).toFixed(1)} · ${r.packages} pkgs` : 'ERR ' + r.error);
  }
}

if (only.includes('increments')) {
  // What a primitive-layer component costs ON TOP OF the primitives an app already ships (the realistic
  // question for "use the layer you already have"), against the standalone library for the same job.
  console.log('== increments over a base set of primitives');
  const merge = (...entries) => {
    const by = new Map();
    for (const e of entries) for (const m of e.matchAll(/export \{([^}]*)\} from '([^']+)'/g)) {
      const set = by.get(m[2]) || new Set(); m[1].split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => set.add(x)); by.set(m[2], set);
    }
    return [...by].map(([mod, names]) => `export { ${[...names].join(', ')} } from '${mod}';`).join('\n');
  };
  const entryOf = (id) => candidates.find((c) => c.id === id).entry;
  const bases = {
    'react-aria-components': `export { Button, Dialog, DialogTrigger, Modal, ListBox, ListBoxItem, Menu, MenuItem, TextField, Input, Label } from 'react-aria-components';`,
    '@base-ui/react': `export { Dialog } from '@base-ui/react/dialog'; export { Menu } from '@base-ui/react/menu'; export { Popover } from '@base-ui/react/popover';`,
  };
  const adds = [
    ['react-aria-components', 'rac-dnd', 'dnd-kit-classic'], ['react-aria-components', 'rac-tree', 'headless-tree'], ['react-aria-components', 'rac-color', 'react-colorful'],
    ['react-aria-components', 'rac-autocomplete', 'cmdk'], ['react-aria-components', 'rac-virtualizer', 'tanstack-virtual'], ['react-aria-components', 'rac-dropzone', 'react-dropzone'],
    ['@base-ui/react', 'base-ui-autocomplete', 'cmdk'],
  ];
  const b = {};
  for (const [layer, entry] of Object.entries(bases)) { const r = await measure('inc-base-' + layer.replace(/\W/g, ''), entry, { buildDir: path.join(WORK, 'build'), root: here }); b[layer] = r.initialGz; console.log(`  base ${layer}: ${(r.initialGz / 1024).toFixed(1)} KB`); }
  results.increments = { bases: Object.fromEntries(Object.entries(bases).map(([k, e]) => [k, { entry: e, initialGz: b[k] }])), rows: [] };
  for (const [layer, id, alt] of adds) {
    const combined = await measure('inc-' + id, merge(bases[layer], entryOf(id)), { buildDir: path.join(WORK, 'build'), root: here });
    const alone = results.candidates[id]?.size?.initialGz ?? null;
    const altC = candidates.find((c) => c.id === alt);
    const altSize = altC ? (await measure('inc-alt-' + alt, altC.entry, { buildDir: path.join(WORK, 'build'), root: here, assets: altC.assets, alias: altC.alias })).initialGz : null;
    const row = { layer, id, standaloneGz: alone, combinedGz: combined.initialGz, incrementGz: combined.initialGz - b[layer], alternative: alt, alternativeGz: altSize };
    results.increments.rows.push(row);
    console.log(`  ${id.padEnd(22)} alone ${(alone / 1024).toFixed(1)} · base+it ${(combined.initialGz / 1024).toFixed(1)} · increment ${(row.incrementGz / 1024).toFixed(1)} KB  vs ${alt} ${(altSize / 1024).toFixed(1)} KB`);
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

if (only.includes('discovery')) {
  // Does a plain npm search find the category leader? Query words a designer would type; the leader is the
  // library this catalogue recommends. libcheck --search keeps results containing every word, ranked by downloads.
  console.log('== discovery (npm search)');
  const probes = [
    ['command palette', ['cmdk', '@base-ui/react', 'react-aria-components']], ['drag drop sortable', ['@dnd-kit/core', '@dnd-kit/react', '@atlaskit/pragmatic-drag-and-drop']],
    ['resizable panels', ['react-resizable-panels']], ['split view', ['react-resizable-panels']], ['node editor', ['@xyflow/react']],
    ['flow diagram react', ['@xyflow/react']], ['rich text editor', ['@tiptap/core', 'lexical']], ['virtual list', ['@tanstack/react-virtual', 'react-window', 'virtua']],
    ['image crop', ['react-image-crop', 'react-easy-crop', 'cropperjs']], ['gantt', ['@svar-ui/react-gantt', 'dhtmlx-gantt', 'frappe-gantt']],
    ['color picker', ['react-colorful']], ['file upload resumable', ['@uppy/core', 'tus-js-client']],
    // Added after review (2026-09-29): six more phrasings a designer would type.
    ['command menu', ['cmdk', '@base-ui/react', 'react-aria-components']], ['kanban board', ['@dnd-kit/core', '@atlaskit/pragmatic-drag-and-drop', '@hello-pangea/dnd']],
    ['whiteboard', ['@excalidraw/excalidraw', 'tldraw']], ['infinite canvas', ['@excalidraw/excalidraw', 'tldraw', '@xyflow/react']],
    ['tree view react', ['react-aria-components', '@headless-tree/core', 'react-arborist']], ['docking layout', ['dockview', 'flexlayout-react']],
  ];
  results.discovery = [];
  for (const [q, leaders] of probes) {
    const rows = await search(q, 12);
    await new Promise((ok) => setTimeout(ok, 800));
    const names = rows.map((r) => r.name);
    results.discovery.push({ query: q, leaders, found: leaders.filter((l) => names.includes(l)), top: rows.slice(0, 6).map((r) => `${r.name} (${r.weekly}/wk, ${r.date})`) });
    console.log(' ', q.padEnd(22), 'leaders found:', leaders.filter((l) => names.includes(l)).join(', ') || 'none');
  }
}

if (only.includes('regress')) {
  // libcheck.mjs on packages where its heuristics once went wrong (pinned tarballs, live registry).
  console.log('== libcheck regression cases');
  const { regress } = await import('./lib/regress.mjs');
  results.libcheckRegress = await regress();
}

if (only.includes('heldout')) {
  // libcheck.mjs on packages not used while writing it; expected verdicts written down before the first run.
  console.log('== libcheck held-out packages');
  const { runHeldout } = await import('./lib/heldout.mjs');
  results.libcheckHeldout = await runHeldout();
}

if (only.includes('inert')) {
  console.log('== inert / aria-hidden in ariaSnapshot vs CDP (F9)');
  const { inertTest } = await import('./lib/inerttest.mjs');
  results.inert = await inertTest();
  console.log(' ', JSON.stringify(results.inert));
}

if (only.includes('a11y')) {
  console.log('== a11y demos');
  const { runA11y } = await import('./demos/run-a11y.mjs');
  results.a11y = await runA11y({ root: here, work: path.join(WORK, 'demos'), runs: RUNS });
}

await writeFile(resultsFile, JSON.stringify(results, null, 1) + '\n');
console.log('wrote', path.relative(process.cwd(), resultsFile));
