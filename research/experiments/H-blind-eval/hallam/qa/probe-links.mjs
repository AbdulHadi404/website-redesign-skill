// Probe: every link and asset on every page answers (local static server), and the fees page prints.
// node qa/probe-links.mjs <skill scripts dir> <base url>
const [dir, base] = process.argv.slice(2);
const { launch } = await import(dir + '/lib/env.mjs');
const { browser } = await launch();
const page = await browser.newPage();
const pages = ['/', '/services/', '/fees/', '/team/', '/contact/'];
const seen = new Map();
for (const p of pages) {
  await page.goto(base + p, { waitUntil: 'networkidle' });
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href], link[href], img[src], source[srcset], script[src]')]
    .map((e) => e.href || e.src || (e.srcset && new URL(e.srcset, location.href).href)).filter(Boolean));
  for (const h of hrefs) if (!seen.has(h)) seen.set(h, p);
}
const rows = [];
for (const [h, from] of seen) {
  if (/^(tel|mailto):/.test(h)) { rows.push(`ok   ${h}  (from ${from})`); continue; }
  const u = new URL(h); u.hash = '';
  const r = await fetch(u.href).catch((e) => ({ status: 'ERR ' + e.message }));
  rows.push(`${r.status === 200 ? 'ok  ' : 'FAIL'} ${r.status} ${h.replace(base, '')}  (from ${from})`);
}
console.log(rows.sort().join('\n'));
await page.goto(base + '/fees/', { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: 'qa/fees-print.pdf', format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
console.log('printed qa/fees-print.pdf');
await browser.close();
