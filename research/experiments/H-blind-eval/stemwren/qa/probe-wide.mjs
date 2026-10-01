import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const url = process.argv[2] || 'http://127.0.0.1:4811/order/';
const { browser } = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log(await page.evaluate(() => {
  const out = []; const W = 390;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 && r.width > 0) {
      // only report elements whose parent does not also overflow (the root cause)
      const p = el.parentElement.getBoundingClientRect();
      if (p.right <= W + 1 || el.parentElement === document.body) out.push(`${el.tagName.toLowerCase()}#${el.id}.${[...el.classList].join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    }
  }
  const ts = document.querySelector(".tray-scroll"); const cs = getComputedStyle(ts); const info = { ox: cs.overflowX, oy: cs.overflowY, sw: ts.scrollWidth, cw: ts.clientWidth, mq: matchMedia("(min-width: 1024px)").matches, vv: visualViewport.width }; const chain = [info]; let e = document.querySelector(".tray-scroll"); while (e) { chain.push(`${e.tagName.toLowerCase()}.${[...e.classList].join(".")} w=${Math.round(e.getBoundingClientRect().width)} disp=${getComputedStyle(e).display} minw=${getComputedStyle(e).minWidth}`); e = e.parentElement; } return { innerWidth, scrollWidth: document.documentElement.scrollWidth, roots: out.slice(0, 15), chain };
}));
await browser.close();
