// Evidence for a capture.mjs defect: in grow mode, an <svg> sized in svh is not pinned, so it balloons.
import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const { browser } = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:4811/', { waitUntil: 'networkidle' });
const h1 = await page.evaluate(() => document.querySelector('.hero-art svg').getBoundingClientRect().height);
await page.setViewportSize({ width: 390, height: 3900 });
const h2 = await page.evaluate(() => document.querySelector('.hero-art svg').getBoundingClientRect().height);
console.log(`hero svg height at 844 px viewport: ${h1}; after growing the viewport to 3900 px: ${h2}`);
await browser.close();
