// Demonstrates the viewport-unit trap in "grow the viewport to the document height" captures:
// any vh/svh/dvh/lvh-sized section is re-laid-out against the new, huge viewport.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); await p.goto('http://localhost:5055/primitives');
const measure = () => p.evaluate(() => ({ doc: document.documentElement.scrollHeight, cover: Math.round(document.querySelector('.cover').getBoundingClientRect().height),
  vhSized: [...document.querySelectorAll('body *')].filter(el => /(^|\s)(\d+(\.\d+)?)(s|l|d)?v(h|b|min|max)/.test(el.getAttribute('style') || '')).length }));
const before = await measure();
await p.setViewportSize({ width: 360, height: before.doc });
const after = await measure();
console.log({ before, afterGrow: after });
await p.setViewportSize({ width: 360, height: 800 });
await p.screenshot({ path: 'reports/prim-360-fullpage.png', fullPage: true });
console.log('fullPage at 800 viewport, cover height:', (await measure()).cover);
await b.close();
