import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/website-redesign-skill/skills/website-redesign/scripts/node_modules/playwright-core');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5762/app/'); await p.waitForTimeout(700);
await p.focus('#herd-body .name-btn[data-tag="IE1074"]'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(200);
await p.screenshot({ path: process.argv[2] }); await b.close();
