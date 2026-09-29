// Held-out check for libcheck.mjs: packages NOT used while writing its heuristics. The expected verdict for
// each was written down BEFORE the first run (from prior knowledge, then confirmed or corrected by reading the
// shipped licence text and README; corrections are listed in `corrected`). Activity is live (git).
//   node lib/heldout.mjs     → prints agreement; run.mjs --only heldout stores it in results.json
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../libcheck.mjs';

// expect: licence class (A/B/C/D/?), and whether a careful reader would put a RED on it for any reason.
export const heldout = [
  { spec: 'apexcharts', cls: 'C', red: true, note: 'licence changed in 2025: free below a revenue threshold' },
  { spec: 'primereact', cls: 'C', red: true, corrected: 'written down as A/no RED from memory; primereact@11.2.0 LICENSE.md is the commercial PrimeUI licence (revenue, developer and funding caps, licence key required) — libcheck was right, and libraries.md already says so' },
  { spec: '@mui/x-data-grid-premium', cls: 'C', red: true, note: 'commercial' },
  { spec: '@syncfusion/ej2-react-grids', cls: 'C', red: true, note: 'commercial / community licence' },
  { spec: '@progress/kendo-react-grid', cls: 'C', red: true, note: 'commercial' },
  { spec: '@fortawesome/fontawesome-free', cls: 'B', red: false, note: 'icons CC BY 4.0, fonts OFL, code MIT' },
  { spec: 'lucide-react', cls: 'A', red: false },
  { spec: 'react-beautiful-dnd', cls: 'A', red: true, note: 'deprecated on npm' },
  { spec: 'moment', cls: 'A', red: false, amber: true, note: 'README: legacy project in maintenance mode' },
  { spec: 'mapbox-gl', cls: 'C', red: true, note: 'proprietary since v2' },
  { spec: '@amcharts/amcharts5', cls: 'C', red: true, note: 'free licence requires the amCharts logo' },
  { spec: 'froala-editor', cls: 'C', red: true, note: 'commercial' },
  { spec: 'draft-js', cls: 'A', red: true, note: 'repository archived, no longer maintained' },
  { spec: 'pdfjs-dist', cls: 'A', red: false },
  { spec: 'leaflet', cls: 'A', red: false },
  { spec: 'react-quill', cls: 'A', red: true, note: 'dormant since 2022' },
];

export async function runHeldout() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'libcheck-heldout-'));
  const out = [];
  try {
    for (const h of heldout) {
      let r;
      try { r = await check(h.spec, { tmp }); } catch (e) { r = { error: 'crash: ' + e.message }; }
      const cls = r.licenceClass?.cls ?? null;
      const red = !!r.red?.length;
      const amberOk = !h.amber || (r.amber || []).some((x) => /maintenance|legacy/i.test(x));
      const row = { spec: h.spec, amberOk, corrected: h.corrected || null, version: r.version, expected: { cls: h.cls, red: h.red }, got: { cls, kind: r.licenceClass?.kind ?? null, red, classified: r.licence?.classified ?? null }, classAgrees: cls === h.cls, redAgrees: red === h.red, redReasons: (r.red || []).map((x) => x.slice(0, 160)), amber: (r.amber || []).map((x) => x.slice(0, 160)), error: r.error || null };
      out.push(row);
      console.log(`  ${row.classAgrees && row.redAgrees && amberOk ? 'agree   ' : 'DISAGREE'} ${h.spec.padEnd(32)} class ${cls} (exp ${h.cls}) · RED ${red} (exp ${h.red})  ${row.got.classified || r.error}`);
    }
  } finally { await rm(tmp, { recursive: true, force: true }); }
  // firstRun: what the first run (2026-09-29, before the head-section rule) got wrong by the corrected truth.
  return { cases: out.length, classAgree: out.filter((x) => x.classAgrees).length, redAgree: out.filter((x) => x.redAgrees).length, amberAgree: out.filter((x) => x.amberOk).length,
    firstRun: { wrong: ['mapbox-gl: proprietary licence head section read as BSD-3-Clause + MIT (its later sections are third-party notices); fixed by the head-section rule', 'moment: "github:moment/moment" repository shorthand not parsed, so activity was reported unknown (class and RED were right); fixed'], expectationErrors: ['primereact (expected A; the tool said C and was right)'] }, results: out };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await runHeldout();
  console.log(`class agrees ${r.classAgree}/${r.cases}; RED agrees ${r.redAgree}/${r.cases}; maintenance AMBER ${r.amberAgree}/${r.cases}`);
  for (const x of r.results.filter((y) => !y.classAgrees || !y.redAgrees)) console.log('\n' + x.spec, JSON.stringify({ got: x.got, red: x.redReasons, amber: x.amber }, null, 1));
}
