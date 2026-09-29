// Can a brand Arabic face with proportional Eastern digits borrow tabular digits from another face via unicode-range?
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { launch } from '../../../skills/website-redesign/scripts/lib/env.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:"Brand";src:url(fonts/plex-arabic.woff2) format("woff2");unicode-range:U+0600-065F,U+066A,U+066D-06EF,U+06FA-06FF,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:"Brand";src:url(fonts/noto-arabic.woff2) format("woff2");unicode-range:U+0660-0669,U+066B-066C,U+06F0-06F9}
@font-face{font-family:"PlexOnly";src:url(fonts/plex-arabic.woff2) format("woff2")}
body{font:28px/1.6 Brand;margin:24px} .p{font-family:PlexOnly} td{padding:4px 16px;text-align:right;font-variant-numeric:tabular-nums}
</style></head><body><table><tr><th>Brand (Plex text + Noto digits)</th><th class="p">Plex only</th></tr>
${[1111.11, 8888.88, 1234.5, 90.07, 12].map(v => { const s = new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(v); return `<tr><td>${s} ريال</td><td class="p">${s} ريال</td></tr>`; }).join('')}
</table></body></html>`;
const server = createServer(async (req, res) => { if (req.url === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html); } try { res.end(await readFile(path.join(here, req.url))); } catch { res.statusCode = 404; res.end(); } }).listen(0);
const { browser } = await launch({});
const page = await browser.newPage();
await page.goto(`http://localhost:${server.address().port}/`);
await page.evaluate(async () => { await document.fonts.load('28px Brand', '١٢٣ابج'); await document.fonts.load('28px PlexOnly', '١٢٣ابج'); });
const w = await page.evaluate(() => {
  const m = (fam) => [...'٠١٢٣٤٥٦٧٨٩'].map((d) => { const s = document.createElement('span'); s.style.cssText = `font:28px ${fam};position:absolute`; s.textContent = d.repeat(10); document.body.append(s); const x = s.getBoundingClientRect().width / 10; s.remove(); return Math.round(x * 100) / 100; });
  return { brand: m('Brand'), plexOnly: m('PlexOnly') };
});
console.log(JSON.stringify(w));
await page.screenshot({ path: path.join(here, 'digit-swap.png') });
await browser.close(); server.close();
