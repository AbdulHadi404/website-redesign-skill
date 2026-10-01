import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const { browser } = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4811/order/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log(await page.evaluate(() => {
  const b = document.getElementById('actionbar'); const r = b.getBoundingClientRect(); const f = document.getElementById('order').getBoundingClientRect();
  const cs = getComputedStyle(b);
  return { bar: [r.top, r.bottom, r.height], form: [f.top, f.bottom], pos: cs.position, hidden: b.hidden, display: cs.display, inner: innerHeight, doc: document.documentElement.scrollHeight };
}));
await browser.close();
