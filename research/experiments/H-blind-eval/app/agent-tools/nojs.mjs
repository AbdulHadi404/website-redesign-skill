// Stand-in for `capture.mjs --no-js`, which hangs (its settle step sleeps with in-page setTimeout).
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/website-redesign-skill/skills/website-redesign/scripts/node_modules/playwright-core');
const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, javaScriptEnabled: false });
const p = await ctx.newPage(); await p.goto(base + '/app/'); await p.waitForTimeout(800);
await p.screenshot({ path: out }); console.log(out); await b.close();
