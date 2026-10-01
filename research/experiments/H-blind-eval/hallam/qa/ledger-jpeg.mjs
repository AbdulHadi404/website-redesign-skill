// The 720 px JPEG of the new 1440 first viewport, for the skill's ledger (references/ledger/).
const [dir, url, out] = process.argv.slice(2);
const { launch } = await import(dir + '/lib/env.mjs');
const { browser } = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.5 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
await browser.close();
console.log(out);
