// Screenshot helper for quick looks during the build: node qa/shot.mjs <url> <out.png> [w] [h] [fullPage 0|1] [dpr]
import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const [url, out, w = 390, h = 844, full = '0', dpr = '2', wait = '600'] = process.argv.slice(2);
const { browser } = await launch();
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, isMobile: +w < 800, hasTouch: +w < 800 });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: full === '1' });
console.log(out, errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no console errors');
await browser.close();
