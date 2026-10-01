import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const { browser } = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4811/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
console.log(await page.evaluate(() => ['.hero', '.hero-grid', '.hero-art', '#hero-link', '.hero-art svg'].map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${s} x=${r.x|0} y=${r.y|0} w=${r.width|0} h=${r.height|0} pos=${cs.position} disp=${cs.display}`; })));
await browser.close();
