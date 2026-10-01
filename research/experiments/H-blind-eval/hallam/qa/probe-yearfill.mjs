// Probe: is the tax-year fill position-mapped to scroll (scroll-driven, reversible), and static under reduce?
// node qa/probe-yearfill.mjs <skill scripts dir> <url>
const [dir, url] = process.argv.slice(2);
const { launch } = await import(dir + '/lib/env.mjs');
const { browser } = await launch();
for (const reduce of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  const top = await page.evaluate(() => document.querySelector('.ty-track').getBoundingClientRect().top + scrollY);
  const rows = [];
  for (const off of [900, 700, 500, 300, 100, 500, 900]) {
    await page.evaluate((y) => window.scrollTo(0, y), top - off);
    await page.waitForTimeout(120);
    rows.push(await page.evaluate((o) => {
      const f = document.querySelector('.ty-fill');
      const m = getComputedStyle(f).transform;
      const sx = m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1]);
      return `tax-year bar ${o}px from the top of an 844px screen → fill scaleX ${sx.toFixed(2)}`;
    }, off));
  }
  console.log(reduce ? 'reduce:' : 'no-preference:', '\n  ' + rows.join('\n  '));
  await ctx.close();
}
await browser.close();
