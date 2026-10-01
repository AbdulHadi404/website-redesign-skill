// Every link on both pages: same-site URLs must answer 200, in-page anchors must exist. External links are listed, not fetched.
import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const base = process.argv[2] || 'http://127.0.0.1:4811';
const { browser } = await launch();
const page = await browser.newPage();
const out = [];
for (const path of ['/', '/order/']) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ text: a.textContent.trim().slice(0, 40), href: a.getAttribute('href'), abs: a.href })));
  for (const l of links) {
    const u = new URL(l.abs);
    if (u.origin !== new URL(base).origin) { out.push(`${path}  external  ${l.href}  "${l.text}"`); continue; }
    if (l.href === '#') { out.push(`${path}  ⚠ points nowhere  "${l.text}"`); continue; }
    if (u.hash && u.pathname === new URL(base + path).pathname) {
      const ok = await page.evaluate((id) => !!document.getElementById(id), u.hash.slice(1));
      out.push(`${path}  ${ok ? '✓' : '✗'} anchor ${u.hash}  "${l.text}"`); continue;
    }
    const r = await page.request.get(u.origin + u.pathname + u.search);
    let anchor = '';
    if (u.hash) anchor = ' (anchor on that page checked separately)';
    out.push(`${path}  ${r.status() === 200 ? '✓' : '✗ ' + r.status()} ${l.href}  "${l.text}"${anchor}`);
  }
}
console.log([...new Set(out)].join('\n'));
await browser.close();
