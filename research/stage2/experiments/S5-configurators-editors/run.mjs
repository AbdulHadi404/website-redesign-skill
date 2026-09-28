#!/usr/bin/env node
// S5 runner: rebuilds and re-measures everything, writes results.json.
//   node run.mjs                 history lab (correctness + benchmark, 5 runs each) and the prototype checks
//   node run.mjs --only history  just the history lab          --only prototype  just the prototype
//   node run.mjs --runs 5        repetitions per benchmark cell (median reported)
// The benchmark runs every (strategy, scene, operations, mode) cell in a fresh `node --expose-gc` process, one at a time.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produceWithPatches, enablePatches } from 'immer';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const RUNS = argv.includes('--runs') ? +argv[argv.indexOf('--runs') + 1] : 5;
const resultsFile = path.join(here, 'results.json');
const results = existsSync(resultsFile) ? JSON.parse(await readFile(resultsFile, 'utf8')) : {};
const median = (xs) => { const v = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

async function historyLab() {
  const pkg = JSON.parse(await readFile(path.join(here, 'package.json'), 'utf8'));
  const env = { node: process.version, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, date: new Date().toISOString(), deps: pkg.dependencies, runs: RUNS };
  console.log('== correctness');
  const { correctness } = await import('./lab/correctness.mjs');
  const corr = await correctness();

  console.log('== array pitfall (immer patches for one delete)');
  enablePatches();
  const arr = { order: Array.from({ length: 1000 }, (_, i) => `i${i}`) };
  const [, pa] = produceWithPatches(arr, (d) => { d.order.splice(0, 1); });
  const keyed = { items: Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`i${i}`, { z: i }])) };
  const [, pk] = produceWithPatches(keyed, (d) => { delete d.items.i0; });
  const arrayPitfall = { arrayOf1000_deleteFirst: { patches: pa.length, bytes: JSON.stringify(pa).length }, keyedMapOf1000_deleteOne: { patches: pk.length, bytes: JSON.stringify(pk).length } };

  console.log('== benchmark');
  const strategies = ['naive', 'command', 'snapshotSpread', 'snapshotHamt', 'immerPatches', 'immerPatchesNoFreeze', 'recordDiff', 'propDiff', 'yjs', 'eventSourced'];
  const configs = [[200, 1000], [200, 10000], [5000, 1000]];
  const cells = [];
  for (const [scene, ops] of configs) for (const st of strategies) {
    const runs = { history: [], none: [] };
    for (let i = 0; i < RUNS; i++) for (const mode of ['history', 'none']) {
      const name = st === 'immerPatchesNoFreeze' ? 'immerPatches' : st;
      const args = ['--expose-gc', '--max-old-space-size=6144', path.join(here, 'lab/bench-one.mjs'), name, String(scene), String(ops), mode];
      if (i === 0 && mode === 'history') args.push('--serialize');
      const out = execFileSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, IMMER_AUTOFREEZE: st === 'immerPatchesNoFreeze' ? '0' : '1' }, maxBuffer: 1 << 24 });
      runs[mode].push(JSON.parse(out.trim().split('\n').pop()));
    }
    const h = runs.history, n = runs.none, m = (arr, k) => median(arr.map((x) => x[k]));
    const cell = {
      strategy: st, scene, ops, entries: h[0].entries,
      correct: h.every((x) => x.finalOk && x.undoAllOk) && n.every((x) => x.finalOk),
      historyMB: r2(m(h, 'heapMB') - m(n, 'heapMB')), heapWithHistoryMB: r2(m(h, 'heapMB')), heapNoHistoryMB: r2(m(n, 'heapMB')),
      bytesPerEntry: Math.round(((m(h, 'heapMB') - m(n, 'heapMB')) * 1048576) / h[0].entries),
      playMs: r1(m(h, 'playMs')), playMsNoHistory: r1(m(n, 'playMs')),
      updateP95us: r1(m(h, 'updateP95us')), updateP95usNoHistory: r1(m(n, 'updateP95us')), commitP95us: r1(m(h, 'commitP95us')),
      undoMeanUs: r1(m(h, 'undoMeanUs')), undoP95us: r1(m(h, 'undoP95us')), undoMaxUs: r1(m(h, 'undoMaxUs')), redoMeanUs: r1(m(h, 'redoMeanUs')),
      serializedKB: h[0].serializedKB, serializeMs: r1(h[0].serializeMs), docKB: h[0].docKB ?? null, docKBNoHistory: n[0].docKB ?? null,
      spread: { playMs: [Math.min(...h.map((x) => x.playMs)), Math.max(...h.map((x) => x.playMs))].map(r1) },
    };
    cells.push(cell);
    console.log(`${String(scene).padStart(5)} items ${String(ops).padStart(6)} ops  ${st.padEnd(21)} hist ${String(cell.historyMB).padStart(8)} MB  ${String(cell.bytesPerEntry).padStart(7)} B/step  upd p95 ${String(cell.updateP95us).padStart(7)} µs  commit p95 ${String(cell.commitP95us).padStart(8)} µs  undo ${String(cell.undoMeanUs).padStart(8)} µs  json ${String(cell.serializedKB).padStart(8)} KB  ${cell.correct ? 'ok' : 'WRONG'}`);
  }
  results.history = { env, workload: 'mix per user operation: add 20%, drag 35% (20 pointer updates each), recolour 17%, delete 8%, group 8%, select-only 4%, undo 6%, redo 2%; seed 11; no no-op edits', correctness: corr, arrayPitfall, benchmark: cells };
}

if (!only || only === 'history') await historyLab();
if (!only || only === 'prototype') {
  const { prototypeLab } = await import('./prototype-run.mjs');
  results.prototype = await prototypeLab();
}
await writeFile(resultsFile, JSON.stringify(results, null, 2));
console.log(`wrote ${path.relative(process.cwd(), resultsFile)}`);
