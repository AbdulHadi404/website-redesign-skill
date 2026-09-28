// Print the catalogue from results.json as one markdown table per category (for the report).
// Usage: node lib/table.mjs [category] [--compact]   (--compact: one table, fewer columns)
import { readFile } from 'node:fs/promises';
const res = JSON.parse(await readFile(new URL('../results.json', import.meta.url), 'utf8'));
const compact = process.argv.includes('--compact');
const want = process.argv.slice(2).find((a) => !a.startsWith('--'));
const kb = (b) => (b == null ? '—' : (b / 1024).toFixed(1));
const dl = (n) => (n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
const short = (l) => l.replace(' (several licences in one file)', ' (repo notice)').replace('NO LICENCE FILE (package or repo root)', 'none shipped').replace('custom / proprietary', 'proprietary');
if (compact) {
  console.log('| Category | Library | Licence (file) | Latest | Rel./12 mo | Human commits/12 mo (top %) | DL/wk | Initial gz KB |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [cat] of Object.entries(res.categories)) {
    if (want && want !== cat) continue;
    for (const c of Object.values(res.candidates).filter((x) => x.cat === cat)) {
      const r = c.registry || {}, a = c.activity || {}, s = c.size || {};
      const lic = short(((c.licences || [])[0] || {}).classified || '?');
      const size = c.skip ? 'n/m' : s.ok ? kb(s.initialGz) + (s.jsGz - s.initialGz > 512 ? ` +${kb(s.jsGz - s.initialGz)} lazy` : '') + (s.assetsGz > 10240 ? ` +${kb(s.assetsGz)} wasm/assets` : '') : 'ERR';
      console.log(`| ${cat} | ${c.label.replace(/ \(.*\)$/, '')} | ${lic} | ${r.latest} (${(r.latestDate || '').slice(0, 7)}) | ${r.releases12m} | ${a && a.repo && !a.error ? `${a.humanCommits12m} (${a.topShare ?? '—'})` : '—'} | ${dl(r.weeklyDownloads)} | ${size} |`);
    }
  }
  process.exit(0);
}
for (const [cat, title] of Object.entries(res.categories)) {
  if (want && want !== cat) continue;
  console.log(`\n### ${title}\n`);
  console.log('| Library | Version (date) | Rel./12 mo | Licence (shipped file) | Commits/12 mo · authors · top % | Last commit | DL/wk | Initial JS gz KB (+lazy) | CSS vars |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const c of Object.values(res.candidates).filter((x) => x.cat === cat)) {
    const r = c.registry || {}, a = c.activity || {}, s = c.size || {};
    const lic = (c.licences || [])[0] || {};
    const others = [...new Set((c.licences || []).slice(1).map((l) => l.classified).filter((x) => x && x !== lic.classified))];
    const th = (c.theming || []).reduce((m, t) => Math.max(m, t.customProperties), 0);
    const lazy = s.ok && s.jsGz - s.initialGz > 512 ? ` (+${kb(s.jsGz - s.initialGz)})` : '';
    const wasm = s.ok && s.assetsGz > 10240 ? ` + ${kb(s.assetsGz)} assets` : '';
    const size = c.skip ? 'n/m' : s.ok ? kb(s.initialGz) + lazy + wasm : 'ERR';
    const flags = [r.deprecated && 'deprecated', c.readmeNotice && 'README notice'].filter(Boolean).join(', ');
    console.log(`| ${c.label}${flags ? ' — ' + flags : ''} | ${r.latest} (${r.latestDate}) | ${r.releases12m} | ${lic.classified}${others.length ? '; also ' + others.join(', ') : ''} | ${a && !a.error && a.repo ? `${a.humanCommits12m} · ${a.authors12m} · ${a.topShare ?? '—'}` : '—'} | ${a?.lastCommit || '—'} | ${dl(r.weeklyDownloads)} | ${size} | ${th || '—'} |`);
  }
}
