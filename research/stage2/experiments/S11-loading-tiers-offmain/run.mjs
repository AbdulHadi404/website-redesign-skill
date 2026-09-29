// S11 — loading experiences, device tiers, off-main-thread work. One runner: fetches the test photos, rebuilds every
// fixture, re-measures everything (one benchmark browser at a time), and merges results/*.json into results.json.
//   node run.mjs                 everything (≈ 2 h on a shared 4-CPU machine: tiers ≈ 35 min, loading ≈ 50 min)
//   node run.mjs unit|tiers|heldout|loading|placeholders|offmain|streaming|support|budget   one part, then re-merge
//   (tiers writes results/tiers.json and results/governor.json; heldout runs the templates on S10's pages)
//   node run.mjs merge           only re-merge results/*.json (and redraw shots/*.jpg charts)
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { here, readResult } from './lib/common.mjs';
import { fetchAssets } from './fetch-assets.mjs';
import { renderCharts } from './lib/charts.mjs';

const PARTS = {
  support: ['lib/support.mjs'],
  budget: ['lib/budget.mjs'],
  unit: ['lib/governor-unit.mjs'],
  tiers: ['run-tiers.mjs', '--runs', '10'],
  heldout: ['run-heldout.mjs', '--runs', '2'],
  placeholders: ['run-placeholders.mjs', '--runs', '5'],
  offmain: ['run-offmain.mjs', '--runs', '5'],
  loading: ['run-loading.mjs', '--runs', '5'],
  streaming: ['run-streaming.mjs', '--runs', '5'],
};
const want = process.argv.slice(2);
const parts = want.length ? want.filter((w) => w !== 'merge') : Object.keys(PARTS);
if (!want.includes('merge') || want.length > 1) await fetchAssets();
for (const p of parts) {
  if (!PARTS[p]) { console.error(`unknown part ${p}`); process.exit(2); }
  console.error(`\n=== ${p} ===`);
  const r = spawnSync(process.execPath, PARTS[p], { cwd: here, stdio: 'inherit' });
  if (r.status !== 0) { console.error(`${p} failed (${r.status})`); process.exit(1); }
}

// Merge: keep summaries and analysis; the raw per-run arrays stay in results/<part>.json.
const [support, budget, tiers, placeholders, offmain, loading, streaming, governor, heldout, governorUnit] = await Promise.all(['support', 'budget', 'tiers', 'placeholders', 'offmain', 'loading', 'streaming', 'governor', 'heldout', 'governor-unit'].map(readResult));
const merged = {
  stream: 'S11 — loading experiences, device tiers and progressive degradation, off-main-thread work',
  generated: new Date().toISOString(),
  howToRerun: 'cd research/stage2/experiments/S11-loading-tiers-offmain && npm install && node run.mjs',
  caveats: [
    'Headless Chromium on a shared 4-CPU Xeon (other agents running; load average recorded per run). Relative comparisons only.',
    'CDP Emulation.setCPUThrottlingRate slows only the renderer main thread (Chromium thread_cpu_throttler.cc: 200 µs quanta, busy-wait); workers, the GPU process and raster threads run at host speed. The spin check in offmain measures this.',
    'WebGL runs on SwiftShader (CPU). No GPU number here predicts a real phone.',
    'Network throttling is Chromium request-level emulation over HTTP/1.1 localhost, not packet shaping.',
    'CDP CPU throttling busy-waits in a signal handler even on an idle page (offmain.throttlerIdleBurn): a throttled browser loads the host, so benchmarks here run one browser at a time and record the load average per run.',
  ],
  support: support?.features,
  budget,
  tiers: tiers && { env: tiers.env, method: tiers.method, analysis: tiers.analysis, detectGpu: tiers.detectGpu, calib: tiers.calib },
  governor: governor && { env: governor.env, cells: governor.cells, summary: governor.summary, unit: governorUnit },
  heldout: heldout && { env: heldout.env, method: heldout.method, summary: heldout.summary },
  placeholders: placeholders && { env: placeholders.env, items: placeholders.built.items, decoders: placeholders.built.decoders, progressiveBytes: placeholders.built.progressive, heroLqipBytes: placeholders.built.heroLqipBytes, decode: placeholders.decodeSummary, film: placeholders.filmSummary, curves: placeholders.film.filter((f) => f.curve).map((f) => ({ net: f.net, k: f.k, curve: f.curve })) },
  offmain: offmain && { env: offmain.env, dataset: offmain.built, summary: offmain.summary, visual: offmain.visualSummary, spin: offmain.spinSummary, payload: offmain.payloadSummary, throttlerIdleBurn: offmain.idleBurnSummary },
  loading: loading && { env: loading.env, provenance: loading.provenance, profile: loading.profile, variants: loading.built.variants, sizes: loading.built.sizes, journeys: loading.journeys, summary: loading.summary, perf: loading.perf },
  streaming: streaming && { env: streaming.env, profile: streaming.profile, built: streaming.built, summary: streaming.summary },
};
await writeFile(path.join(here, 'results.json'), JSON.stringify(merged, null, 1));
console.error('wrote results.json');
console.error('charts:', (await renderCharts()).join(', '));
