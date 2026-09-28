// Print the catalogue from results.json as one tab-separated table per category (for the report).
// Usage: node lib/table.mjs [category]
import { readFile } from 'node:fs/promises';
const res = JSON.parse(await readFile(new URL('../results.json', import.meta.url), 'utf8'));
const want = process.argv[2];
const kb = (b) => (b == null ? '—' : (b / 1024).toFixed(1));
for (const [cat, title] of Object.entries(res.categories)) {
  if (want && want !== cat) continue;
  console.log(`\n## ${title}`);
  console.log(['id', 'version (date)', 'rel/12m', 'licence (file)', 'npm field', 'commits/12m', 'authors', 'top%', 'last commit', 'initial gz', 'all JS gz', 'css', 'wasm/assets', 'pkgs', 'notes'].join('\t'));
  for (const c of Object.values(res.candidates).filter((x) => x.cat === cat)) {
    const r = c.registry || {}, a = c.activity || {}, s = c.size || {};
    const lic = (c.licences || [])[0] || {};
    const others = (c.licences || []).slice(1).filter((l) => l.classified && l.classified !== lic.classified).map((l) => `${l.pkg}: ${l.classified}`);
    const notes = [r.deprecated && 'DEPRECATED', c.readmeNotice && `README: ${c.readmeNotice}`, c.skip, s.ok === false && `size ERR ${s.error}`, ...others].filter(Boolean).join('; ');
    console.log([c.id, `${r.latest} (${r.latestDate})`, r.releases12m, lic.classified, r.licenseField, a.error ? 'ERR' : a.commits12m, a.authors12m, a.topShare, a.lastCommit, kb(s.initialGz), kb(s.jsGz), kb(s.cssGz), kb(s.assetsGz), s.packages ?? '—', notes].join('\t'));
  }
}
