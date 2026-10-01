// Disproves a11y.mjs "Text already clipped by overflow:hidden" on section.hero: lists every text-bearing element
// inside the hero whose box crosses the hero's clipping box, at 390 and 1440, with text spacing applied.
import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const { browser } = await launch();
for (const w of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 844 } });
  await page.goto('http://127.0.0.1:4811/', { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
  await page.waitForTimeout(300);
  console.log(w, await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    return [...document.querySelectorAll('.hero h1, .hero p, .hero a, .hero figcaption')].map((el) => {
      const r = el.getBoundingClientRect();
      const clipped = r.left < hero.left - 1 || r.right > hero.right + 1 || r.top < hero.top - 1 || r.bottom > hero.bottom + 1;
      return `${el.tagName.toLowerCase()}${el.className ? '.' + el.className : ''} ${clipped ? 'CLIPPED' : 'inside'} ${el.classList.contains('visually-hidden') ? '(visually hidden by design)' : ''}`;
    });
  }));
  await page.close();
}
await browser.close();
