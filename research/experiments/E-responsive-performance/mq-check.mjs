// What do interaction media queries report under Playwright emulation? (hover/pointer/any-*)
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const [name, opts] of [['Desktop Chrome', devices['Desktop Chrome']], ['Pixel 7 (isMobile+hasTouch)', devices['Pixel 7']], ['iPad Pro 11 (in Chromium)', { ...devices['iPad Pro 11'], defaultBrowserType: undefined }], ['hasTouch only', { viewport: { width: 800, height: 600 }, hasTouch: true }]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto('http://localhost:5055/primitives');
  const r = await p.evaluate(() => ({ hoverHover: matchMedia('(hover: hover)').matches, pointerFine: matchMedia('(pointer: fine)').matches, pointerCoarse: matchMedia('(pointer: coarse)').matches, anyHover: matchMedia('(any-hover: hover)').matches, anyCoarse: matchMedia('(any-pointer: coarse)').matches,
    small: [...document.querySelectorAll('a[href],button')].map(e => [e.textContent.trim().slice(0,12), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]).filter(([, w, h]) => w > 0 && (w < 44 || h < 44)).slice(0, 6) }));
  console.log(name.padEnd(30), JSON.stringify(r));
  await ctx.close();
}
await b.close();
