// axe-core via Playwright. Usage: node scripts/run-axe.mjs flawed.html [--all-rules]
// Writes results/axe-<page>.json and prints a compact, agent-friendly summary.
import { AxeBuilder } from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { launch, BASE, flawsFor, ms } from './lib.mjs';

const pageName = process.argv[2] || 'flawed.html';
const allRules = process.argv.includes('--all-rules');
const t0 = performance.now();
const browser = await launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE}/${pageName}`);
let builder = new AxeBuilder({ page });
// WCAG 2.0/2.1/2.2 A+AA plus best practices. --all-rules also enables experimental rules
// (e.g. label-content-name-mismatch, p-as-heading... tags 'experimental').
builder = builder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', ...(allRules ? ['experimental'] : [])]);
const results = await builder.analyze();
const tScan = ms(t0);
await writeFile(`results/axe-${pageName.replace('.html', '')}${allRules ? '-all' : ''}.json`, JSON.stringify(results, null, 2));
const rows = [];
for (const v of results.violations) {
  const flaws = new Set();
  for (const n of v.nodes) (await flawsFor(page, { css: n.target.flat().join(' ') })).forEach(f => flaws.add(f));
  rows.push({ rule: v.id, impact: v.impact, wcag: v.tags.filter(t => /^wcag\d{3,}$/.test(t)).join(','), nodes: v.nodes.length, flaws: [...flaws].join(' ') });
}
console.log(`axe ${results.testEngine.version} on ${pageName}: ${results.violations.length} rules violated, ${results.violations.reduce((a, v) => a + v.nodes.length, 0)} nodes; ${results.incomplete.length} needs-review; ${results.passes.length} passed; time ${tScan}`);
console.table(rows);
console.log('needs review:', results.incomplete.map(i => `${i.id}(${i.nodes.length})`).join(', '));
await browser.close();
