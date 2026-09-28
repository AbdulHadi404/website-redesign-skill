// Exercise the analytics hooks: cow_checked on Mark as checked, note_add on Save note.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/website-redesign-skill/skills/website-redesign/scripts/node_modules/playwright-core');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const p = await b.newPage();
await p.addInitScript(() => { window.mlEvents = []; window.mlTrack = (e) => window.mlEvents.push(e); });
await p.goto(process.argv[2] + '/app/'); await p.waitForTimeout(700);
await p.$eval('[data-tag="IE1111"]', (el) => el.click()); await p.waitForTimeout(200);
await p.$eval('#mark-checked', (el) => el.click()); await p.waitForTimeout(200);
const hasNoteForm = await p.$('#note-form');
if (hasNoteForm) { await p.fill('#note', 'test note'); await p.$eval('#note-form button[type=submit]', (el) => el.click()); await p.waitForTimeout(200); }
await p.goto(process.argv[2] + '/app/#herd'); await p.waitForTimeout(500);
console.log(process.argv[2], 'events:', JSON.stringify(await p.evaluate(() => window.mlEvents)), 'anchor #herd exists:', !!(await p.$('#herd')));
await b.close();
