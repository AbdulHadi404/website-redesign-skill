// Full-page screenshot at a width (viewport grown to the document so every image rasterises).
//   node shot.mjs <url> <width> <out.png> [mobile]
import { chromium } from 'playwright';
const [url, w = '390', out = 'shot.png', mobile] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: +w, height: 800 }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
const p = await ctx.newPage(); await p.goto(url, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
await p.setViewportSize({ width: +w, height: Math.min(h, 15000) });
await p.screenshot({ path: out }); await b.close(); console.log(out, w, h);
