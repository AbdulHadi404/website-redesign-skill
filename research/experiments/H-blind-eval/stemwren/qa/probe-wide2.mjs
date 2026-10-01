import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const url = process.argv[2] || 'http://127.0.0.1:4811/order/';
const { browser } = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log(await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.closest('.tray-scroll, .stage')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > 400) out.push(`${el.tagName.toLowerCase()}#${el.id}.${typeof el.className === 'string' ? el.className : ''} L=${Math.round(r.left)} R=${Math.round(r.right)}`);
  }
  return { iw: innerWidth, sw: document.documentElement.scrollWidth, out: out.slice(0, 20) };
}));
await browser.close();
