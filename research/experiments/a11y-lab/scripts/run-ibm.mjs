// IBM Equal Access engine injected via Playwright (works offline: no CDN fetch).
// Usage: node scripts/run-ibm.mjs flawed.html [policy=WCAG_2_2|IBM_Accessibility]
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { launch, BASE, flawsFor, ms } from './lib.mjs';
const require = createRequire(import.meta.url);
const pageName = process.argv[2] || 'flawed.html';
const policy = process.argv[3] || 'IBM_Accessibility';
const t0 = performance.now();
const browser = await launch(); const page = await browser.newPage();
await page.goto(`${BASE}/${pageName}`);
await page.addScriptTag({ path: require.resolve('accessibility-checker-engine/ace.js') });
const report = await page.evaluate(async (policy) => {
  const checker = new window.ace.Checker();
  const r = await checker.check(document, [policy]);
  // keep only issues (drop passes) to keep output small
  return { counts: r.summary?.counts, results: r.results.filter(i => i.value[1] !== 'PASS').map(i => ({ ruleId: i.ruleId, reasonId: i.reasonId, level: i.value.join('_'), xpath: i.path.dom, message: i.message })) };
}, policy);
const t = ms(t0);
await writeFile(`results/ibm-${pageName.replace('.html', '').replace(/\//g, '-')}.json`, JSON.stringify(report, null, 2));
const agg = {};
for (const r of report.results) {
  const k = `${r.level} | ${r.ruleId}`; agg[k] ??= { n: 0, flaws: new Set() }; agg[k].n++;
  (await flawsFor(page, { xpath: r.xpath })).forEach(f => agg[k].flaws.add(f));
}
console.log(`IBM ${policy} on ${pageName}: ${report.results.length} non-pass results; time ${t}`);
for (const [k, v] of Object.entries(agg).sort()) console.log(k.padEnd(70), String(v.n).padStart(3), [...v.flaws].join(' '));
await browser.close();
