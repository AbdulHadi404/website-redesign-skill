import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/website-redesign-skill/skills/website-redesign/scripts/node_modules/playwright-core');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); await p.goto('http://localhost:5762/app/'); await p.waitForTimeout(700);
await p.evaluate(() => scrollTo(0, 600)); await p.waitForTimeout(200);
await p.screenshot({ path: process.argv[2] });
console.log(await p.evaluate(() => { const f = document.querySelector('#find').getBoundingClientRect(); return { searchHeight: Math.round(f.height), searchTopAfterScroll: Math.round(f.top), position: getComputedStyle(document.querySelector('#find')).position, viewport: innerHeight }; }));
await b.close();
