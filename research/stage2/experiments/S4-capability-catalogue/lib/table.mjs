// Print the catalogue from results.json (for the report).
//   node lib/table.mjs [category] [--compact]    --compact: one table for all categories
// Columns: framework, kind (headless / styled / engine / service), direct deps (+ peers), licence as classified
// from the shipped text with its class A–D (resources/README.md), latest version, releases in 12 months split
// into stable (+ pre-release tags), breaking-by-semver versions, human commits (top author's share), weekly
// downloads, initial JS gz, and accessibility: "tested" (a demo in demos/, see results.a11y) or the crude code
// scan of everything the entry bundles (keyboard + ARIA / keyboard only / ARIA only / none found).
import { readFile } from 'node:fs/promises';
const res = JSON.parse(await readFile(new URL('../results.json', import.meta.url), 'utf8'));
const compact = process.argv.includes('--compact');
const want = process.argv.slice(2).find((a) => !a.startsWith('--'));
const kb = (b) => (b == null ? '—' : (b / 1024).toFixed(1));
const dl = (n) => (n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
const short = (l) => l.replace(' (several licences in one file)', ' (one file)').replace(' (later sections: third-party notices)', '').replace('NO LICENCE FILE (package or repo root)', 'none shipped').replace('custom / proprietary', 'proprietary');
// Which demo tested which candidate (demos/tests.mjs).
const DEMOS = {
  cmdk: ['palette-cmdk'], 'rac-autocomplete': ['palette-rac'], 'base-ui-autocomplete': ['palette-baseui'], kbar: ['palette-kbar'],
  'dnd-kit-classic': ['dnd-dndkit'], 'dnd-kit-react': ['dnd-dndkit-react'], 'rac-dnd': ['dnd-rac'], 'pragmatic-dnd': ['dnd-pragmatic'], 'hello-pangea-dnd': ['dnd-pangea'],
  'react-resizable-panels': ['panels-rrp'], 'ark-splitter': ['panels-ark'], allotment: ['panels-allotment'], 'xyflow-react': ['flow-xyflow'],
  'react-konva': ['canvas-konva', 'canvas-konva-a11y'], tldraw: ['canvas-tldraw'], excalidraw: ['canvas-excalidraw'], 'svar-gantt': ['gantt-svar'],
};
const SCAN = { 'keyboard + ARIA': 'code: kbd+ARIA', 'keyboard only': 'code: kbd only', 'ARIA only': 'code: ARIA only', 'key handler, no arrows or ARIA': 'code: keys, no ARIA', 'none found': 'code: none found' };
const a11y = (c) => (DEMOS[c.id] ? `tested (${DEMOS[c.id].join(', ')})` : c.scan ? SCAN[c.scan.verdict] : '—');
const fwShort = (f) => (f || '').replace('vanilla', 'JS').replace('web component', 'WC').replace(/React/g, 'R').replace(/Svelte/g, 'Sv').replace(/Angular/g, 'Ng').replace(/Solid/g, 'So');
const lic = (c) => {
  const l0 = (c.licences || [])[0] || {};
  let l = short(l0.classified || '?');
  if (l0.fieldOnly) l += ' (package.json only)';
  if (l0.notice && l0.noticeOthers?.length) l += ` (repo notice: other packages ${l0.noticeOthers.join(', ')})`;
  const k = c.licenceClass; return k ? `${l} [${k.cls}${k.kind ? ' ' + k.kind : ''}]` : l;
};
const rel = (r) => (r.stableReleases12m == null ? '—' : `${r.stableReleases12m}${r.preReleases12m ? ` (+${r.preReleases12m} pre)` : ''}`);
const deps = (r) => (r.deps == null ? '—' : `${r.deps}${r.peerDeps?.length ? ` + ${r.peerDeps.filter((p) => !/^react(-dom)?$|^vue$|^svelte$/.test(p)).length ? r.peerDeps.filter((p) => !/^react(-dom)?$|^vue$|^svelte$/.test(p)).length + ' peers' : 'fw'}` : ''}`);
const sizeOf = (c) => { const s = c.size || {}; return c.skip ? 'n/m' : s.ok ? kb(s.initialGz) + (s.jsGz - s.initialGz > 512 ? ` +${kb(s.jsGz - s.initialGz)} lazy` : '') + (s.assetsGz > 10240 ? ` +${kb(s.assetsGz)} wasm/assets` : '') : 'ERR'; };
const act = (a) => (a && a.repo && !a.error ? `${a.humanCommits12m} (${a.topShare ?? '—'})` : '—');

if (compact) {
  console.log('| Category | Library | Fw | Kind | Deps | Licence (shipped text) [class] | Latest | Stable rel./12 mo (+pre) | Breaking/12 mo | Human commits/12 mo (top %) | DL/wk | Initial gz KB | Accessibility |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [cat] of Object.entries(res.categories)) {
    if (want && want !== cat) continue;
    for (const c of Object.values(res.candidates).filter((x) => x.cat === cat)) {
      const r = c.registry || {};
      console.log(`| ${cat} | ${c.label.replace(/ \(.*\)$/, '')} | ${fwShort(c.fw)} | ${c.kind} | ${deps(r)} | ${lic(c)} | ${r.latest} (${(r.latestDate || '').slice(0, 7)}) | ${rel(r)} | ${r.breaking12m ?? '—'} | ${act(c.activity)} | ${dl(r.weeklyDownloads)} | ${sizeOf(c)} | ${a11y(c)} |`);
    }
  }
  process.exit(0);
}
for (const [cat, title] of Object.entries(res.categories)) {
  if (want && want !== cat) continue;
  console.log(`\n### ${title}\n`);
  console.log('| Library | Fw · kind · deps | Version (date) | Stable rel. (+pre) · breaking | Licence [class] | Commits/12 mo · authors · top % | Last commit | DL/wk | Initial JS gz KB (+lazy) | CSS vars | Accessibility |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of Object.values(res.candidates).filter((x) => x.cat === cat)) {
    const r = c.registry || {}, a = c.activity || {};
    const others = [...new Set((c.licences || []).slice(1).map((l) => l.classified).filter((x) => x && x !== ((c.licences || [])[0] || {}).classified))];
    const th = (c.theming || []).reduce((m, t) => Math.max(m, t.customProperties), 0);
    const flags = [r.deprecated && 'deprecated', c.readmeNotice?.notice && 'README notice'].filter(Boolean).join(', ');
    console.log(`| ${c.label}${flags ? ' — ' + flags : ''} | ${c.fw} · ${c.kind} · ${deps(r)} | ${r.latest} (${r.latestDate}) | ${rel(r)} · ${r.breaking12m ?? '—'} | ${lic(c)}${others.length ? '; also ' + others.map(short).join(', ') : ''} | ${a && !a.error && a.repo ? `${a.humanCommits12m} · ${a.authors12m} · ${a.topShare ?? '—'}` : '—'} | ${a?.lastCommit || '—'} | ${dl(r.weeklyDownloads)} | ${sizeOf(c)} | ${th || '—'} | ${a11y(c)} |`);
  }
}
