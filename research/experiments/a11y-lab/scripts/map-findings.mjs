// Map normalised findings [{tool, rule, level, css?, xpath?}] from a JSON file onto the seeded data-flaw ids.
// Usage: node scripts/map-findings.mjs results/norm-pa11y.json flawed.html > results/mapped-pa11y.json
import { readFile } from 'node:fs/promises';
import { launch, BASE, flawsFor } from './lib.mjs';
const [file, pageName = 'flawed.html'] = process.argv.slice(2);
const findings = JSON.parse(await readFile(file, 'utf8'));
const browser = await launch(); const page = await browser.newPage();
await page.goto(`${BASE}/${pageName}`);
const out = [];
for (const f of findings) out.push({ ...f, flaws: await flawsFor(page, f) });
await browser.close();
console.log(JSON.stringify(out, null, 1));
