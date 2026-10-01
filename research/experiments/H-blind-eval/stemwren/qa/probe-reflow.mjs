// Which element makes the home page wider than a 320 px viewport (a11y.mjs 1.4.10 FAIL)?
import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const url = process.argv[2] || 'http://127.0.0.1:4811/';
const { browser } = await launch();
const page = await browser.newPage({ viewport: { width: 320, height: 256 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
console.log(await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > 325 && r.width) { const p = el.parentElement.getBoundingClientRect(); if (p.right <= 325) out.push(`${el.tagName.toLowerCase()}.${typeof el.className === 'string' ? el.className.split(' ').join('.') : ''} R=${Math.round(r.right)} pos=${getComputedStyle(el).position}`); }
  }
  return { sw: document.documentElement.scrollWidth, out: out.slice(0, 12) };
}));
await browser.close();
