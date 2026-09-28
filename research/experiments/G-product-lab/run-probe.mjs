// Renders each archetype page at 1440 and 390 and runs ui-probe.js against it.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const probe = fs.readFileSync(new URL('./ui-probe.js', import.meta.url), 'utf8');
const base = process.argv[2] || 'http://127.0.0.1:8765';
const pages = [
  ['govuk-guidance', 'content'], ['govuk-question', 'content'], ['primer-issues', 'app'], ['carbon-table', 'app'],
  ['slop-landing', 'marketing'], ['slop-dashboard', 'app'], ['house-style', 'marketing'],
];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const out = {};
for (const [name, kind] of pages) {
  out[name] = { kind };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(`${probe}\n;uiProbe(${JSON.stringify({ kind })})`);
    out[name][w] = r;
    if (w === 1440) await page.screenshot({ path: `shots/${name}-${w}.png` });
    await page.close();
  }
}
await browser.close();
fs.writeFileSync('probe-results.json', JSON.stringify(out, null, 1));
// compact summary
const row = (n, k) => { const f = out[n][1440].facts, m = out[n][390].facts; return [n, k, Object.keys(f.fontFamilies).join('/'), f.distinctFontSizes, f.bodySize, f.maxSize, m.maxSize, f.displayToBodyRatio, f.distinctTextColors, f.distinctRadii, f.topRadii[0] || '-', f.distinctSpacings, f.offFourPxGrid, f.shadows, f.cardLikeContainers, f.shareOfTextInCards, f.centeredTextShare, f.interactiveAboveFold, f.textCharsAboveFold, f.textUnitsAboveFold, f.controlHeights.join(','), f.targetsUnder24px, out[n][1440].score, out[n][1440].tells.map(t => t.id).join('; ')]; };
console.log(['page', 'kind', 'families', 'sizes#', 'body', 'max@1440', 'max@390', 'max/body', 'textColours', 'radii#', 'topRadius', 'spacings#', 'off4px', 'shadows', 'cards', 'text-in-cards', 'centred', 'interactive-in-fold', 'chars-in-fold', 'units-in-fold', 'control-h', '<24px', 'tell-score', 'tells'].join('\t'));
for (const [n, k] of pages) console.log(row(n, k).join('\t'));
