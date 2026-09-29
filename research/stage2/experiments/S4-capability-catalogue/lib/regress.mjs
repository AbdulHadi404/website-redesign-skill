// Regression cases for libcheck.mjs: packages where its heuristics went (or could go) wrong, with the
// verdict a careful human reader gives after reading the shipped licence text and the README.
// Versions are pinned so the tarball (licence file, README) is fixed; registry data and repository READMEs
// are live. Activity (git) is skipped: no expectation depends on it.
//
//   node lib/regress.mjs            prints pass/fail per case; run.mjs --only regress stores it in results.json
//
// Sources for each expectation are the shipped files named in the S4 report (F1) and the review of 2026-09-29.
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../libcheck.mjs';

export const cases = [
  // False RED found in review: README lines about a predecessor or an option, not the package.
  { spec: 'wavesurfer.js@8.0.1', cls: 'A', noRed: true, why: '"deprecated in favor of the merged option" is about an option' },
  { spec: '@maxgraph/core@0.24.0', cls: 'A', noRed: true, why: '"mxGraph (archived in 2020)" is the predecessor' },
  // Repository-wide notice naming two licences: the package's own is in package.json.
  { spec: '@liveblocks/client@3.24.2', cls: 'A', classified: /^Apache-2\.0$/, noRed: true, amber: /other packages in the repo are AGPL/ },
  { spec: '@liveblocks/server@1.9.0', cls: 'C', kind: 'copyleft', red: /AGPL/ },
  // The MIT opening phrase inside a custom licence with a headcount cap.
  { spec: '@remotion/player@4.0.529', cls: 'C', kind: 'procurement', red: /headcount-cap/ },
  // Unmaintained notice only in the repository README, not in the 1.1.2 tarball.
  { spec: 'vaul@1.1.2', red: /README: .*unmaintained/i },
  // Asset licences shipped by npm packages: recognised, not mislabelled.
  { spec: '@fontsource/inter@5.3.0', cls: 'A', classified: /^OFL-1\.1$/, noAmber: /file says/ },
  { spec: '@fontsource-variable/inter@5.3.0', cls: 'A', classified: /^OFL-1\.1$/, noAmber: /file says/ },
  { spec: '@iconify-json/solar@1.2.13', cls: 'B', classified: /^CC-BY-4\.0$/, noRed: true },
  { spec: 'remixicon@4.9.1', cls: 'C', kind: 'restricted use', red: /no-logo-use|no-competing/, noRed2: /\[non-commercial\]/ },
  // A custom licence named only in package.json: read it (libraries.md: free for commercial use since 3.13).
  { spec: 'gsap@3.15.0', cls: '?', noRed: true, amber: /standard-license/ },
  // Proprietary licences that must stay RED.
  { spec: 'highcharts@13.1.1', cls: 'C', kind: 'procurement', red: /vendor-agreement/ },
  { spec: 'ag-grid-enterprise@36.2.0', cls: 'C', kind: 'procurement' },
  { spec: 'tldraw@5.4.2', cls: 'C', kind: 'procurement', red: /licence-key|Production/ },
  { spec: 'polotno@4.14.1', cls: 'C', kind: 'procurement', red: /60 days/ },
  { spec: 'handsontable@18.1.1', cls: 'C', kind: 'procurement' },
  { spec: 'gojs@4.0.4', cls: 'C', kind: 'procurement' },
  { spec: 'dockview-enterprise@8.3.1', cls: 'C', kind: 'procurement' },
  { spec: '@fullcalendar/resource-timeline@6.1.21', cls: 'C', kind: 'procurement' },
  { spec: '@pqina/pintura@8.100.4', cls: 'C', kind: 'procurement', red: /testing|watermark/ },
  { spec: '@bryntum/gantt@7.3.7', cls: 'D', red: /placeholder/ },
  { spec: 'bpmn-js@18.30.1', cls: 'C', kind: 'brand decision', red: /watermark/ },
  // Copyleft and file-level copyleft.
  { spec: 'swapy@1.0.5', cls: 'C', kind: 'copyleft' },
  { spec: 'dragselect@3.1.2', cls: 'C', kind: 'copyleft' },
  { spec: 'ckeditor5@48.5.2', cls: 'C', kind: 'copyleft' },
  { spec: '@imgly/background-removal@1.7.0', cls: 'C', kind: 'copyleft' },
  { spec: '@blocknote/core@0.55.0', cls: 'B', classified: /^MPL-2\.0$/, noRed: true },
  { spec: 'elkjs@0.12.0', cls: 'B', classified: /^EPL-2\.0$/, noRed: true },
  // Permissive, with the traps F1 lists (licence only in the repository root) and churn read from semver.
  { spec: '@excalidraw/excalidraw@0.18.1', cls: 'A', noRed: true },
  { spec: 'react-resizable-panels@4.14.1', cls: 'A', noRed: true },
  { spec: 'sonner@2.0.8', cls: 'A', noRed: true },
  { spec: 'embla-carousel-react@8.6.0', cls: 'A', noRed: true },
  { spec: 'lexical@0.52.0', cls: 'A', noRed: true, amber: /breaking \(0\.x minor\)/, noAmber: /releases in 12 months/ },
  // A package that does not exist.
  { spec: 's4-lab-no-such-package-2026@1.0.0', error: /404/ },
];

function judge(c, r) {
  const fails = [];
  const reds = (r.red || []).join('\n'), ambers = (r.amber || []).join('\n');
  if (c.error) { if (!c.error.test(r.error || '')) fails.push(`expected error ${c.error}, got ${r.error || 'none'}`); return fails; }
  if (r.error) return [`unexpected error ${r.error}`];
  if (c.cls && r.licenceClass.cls !== c.cls) fails.push(`class ${r.licenceClass.cls}, expected ${c.cls}`);
  if (c.kind && r.licenceClass.kind !== c.kind) fails.push(`kind ${r.licenceClass.kind}, expected ${c.kind}`);
  if (c.classified && !c.classified.test(r.licence.classified)) fails.push(`classified "${r.licence.classified}"`);
  if (c.noRed && r.red.length) fails.push('unexpected RED: ' + reds.slice(0, 160));
  if (c.red && !c.red.test(reds)) fails.push(`RED lacks ${c.red}`);
  if (c.noRed2 && c.noRed2.test(reds)) fails.push(`RED quotes ${c.noRed2}`);
  if (c.amber && !c.amber.test(ambers)) fails.push(`AMBER lacks ${c.amber}`);
  if (c.noAmber && c.noAmber.test(ambers)) fails.push(`AMBER has ${c.noAmber}`);
  return fails;
}

export async function regress() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'libcheck-regress-'));
  const out = [];
  try {
    for (const c of cases) {
      let r;
      try { r = await check(c.spec, { tmp, withActivity: false }); } catch (e) { r = { name: c.spec, error: 'crash: ' + e.message }; }
      const fails = judge(c, r);
      out.push({ spec: c.spec, pass: !fails.length, fails, class: r.licenceClass ? `${r.licenceClass.cls}${r.licenceClass.kind ? ' ' + r.licenceClass.kind : ''}` : null, classified: r.licence?.classified ?? null, red: r.red || [], amber: r.amber || [], error: r.error || null });
      console.log(`  ${fails.length ? 'FAIL' : 'pass'}  ${c.spec.padEnd(42)} ${out.at(-1).class ?? r.error}  ${fails.join('; ')}`);
    }
  } finally { await rm(tmp, { recursive: true, force: true }); }
  return { cases: out.length, passed: out.filter((x) => x.pass).length, results: out };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await regress();
  console.log(`${r.passed}/${r.cases} pass`);
  process.exit(r.passed === r.cases ? 0 : 1);
}
