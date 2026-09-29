// S11 — loading experiences, device tiers, off-main-thread work. One runner: fetches the test photos, rebuilds every
// fixture, re-measures everything (one benchmark browser at a time), and merges results/*.json into results.json.
//   node run.mjs                 everything (≈ 60–80 min on a shared 4-CPU machine)
//   node run.mjs tiers|loading|placeholders|offmain|support|budget   one part, then re-merge
//   node run.mjs merge           only re-merge results/*.json
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { here, readResult } from './lib/common.mjs';
import { fetchAssets } from './fetch-assets.mjs';

const PARTS = {
  support: ['lib/support.mjs'],
  budget: ['lib/budget.mjs'],
  tiers: ['run-tiers.mjs', '--runs', '10'],
  placeholders: ['run-placeholders.mjs', '--runs', '5'],
  offmain: ['run-offmain.mjs', '--runs', '5'],
  loading: ['run-loading.mjs', '--runs', '5'],
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
const [support, budget, tiers, placeholders, offmain, loading] = await Promise.all(['support', 'budget', 'tiers', 'placeholders', 'offmain', 'loading'].map(readResult));
const merged = {
  stream: 'S11 — loading experiences, device tiers and progressive degradation, off-main-thread work',
  generated: new Date().toISOString(),
  howToRerun: 'cd research/stage2/experiments/S11-loading-tiers-offmain && npm install && node run.mjs',
  caveats: [
    'Headless Chromium on a shared 4-CPU Xeon (other agents running; load average recorded per run). Relative comparisons only.',
    'CDP Emulation.setCPUThrottlingRate slows only the renderer main thread (Chromium thread_cpu_throttler.cc: 200 µs quanta, busy-wait); workers, the GPU process and raster threads run at host speed. The spin check in offmain measures this.',
    'WebGL runs on SwiftShader (CPU). No GPU number here predicts a real phone.',
    'Network throttling is Chromium request-level emulation over HTTP/1.1 localhost, not packet shaping.',
  ],
  support: support?.features,
  budget,
  tiers: tiers && { env: tiers.env, method: tiers.method, analysis: tiers.analysis, detectGpu: tiers.detectGpu, calib: tiers.calib },
  placeholders: placeholders && { env: placeholders.env, items: placeholders.built.items, decoders: placeholders.built.decoders, progressiveBytes: placeholders.built.progressive, decode: placeholders.decodeSummary, film: placeholders.filmSummary },
  offmain: offmain && { env: offmain.env, dataset: offmain.built, summary: offmain.summary, spin: offmain.spinSummary, payload: offmain.payloadSummary },
  loading: loading && { env: loading.env, profile: loading.profile, variants: loading.built.variants, sizes: loading.built.sizes, journeys: loading.journeys, summary: loading.summary, perf: loading.perf },
};
await writeFile(path.join(here, 'results.json'), JSON.stringify(merged, null, 1));
console.error('wrote results.json');
