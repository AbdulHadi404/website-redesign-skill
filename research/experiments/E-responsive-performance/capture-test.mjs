// Which full-page capture method rasterises lazy images AND keeps viewport-unit sections honest?
import { chromium } from 'playwright';
import sharp from 'sharp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function sampleImages(p, file) {
  // mean luminance-ish of each image box in the screenshot; a blank/grey box has near-zero stdev
  const boxes = await p.evaluate(() => [...document.images].map(i => { const r = i.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }));
  const out = [];
  for (const bx of boxes) {
    try { const s = await sharp(file).extract({ left: Math.round(bx.x), top: Math.round(bx.y), width: Math.round(bx.w), height: Math.round(bx.h) }).stats(); out.push(Math.round(s.channels[0].stdev)); } catch { out.push('oob'); }
  }
  return out;
}
for (const method of ['fullPage-no-scroll', 'fullPage-after-scroll+decode', 'grow-viewport+decode']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); await p.goto('http://localhost:5055/lazy-gallery', { waitUntil: 'load' });
  const hero0 = await p.evaluate(() => document.querySelector('.hero').offsetHeight);
  if (method !== 'fullPage-no-scroll') {
    if (method.startsWith('fullPage')) {
      // scroll through in viewport steps so lazy images load and get composited, then return to top
      await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
    } else {
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      await p.setViewportSize({ width: 390, height: h });
    }
    await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  }
  const file = `reports/cap-${method}.png`;
  await p.screenshot({ path: file, fullPage: method.startsWith('fullPage') });
  const hero1 = await p.evaluate(() => document.querySelector('.hero').offsetHeight);
  const st = await sampleImages(p, file);
  const loaded = await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth).length);
  console.log(method.padEnd(30), `hero ${hero0}->${hero1}px`, `loaded ${loaded}/12`, 'img stdev:', st.join(','));
  await ctx.close();
}
await b.close();
