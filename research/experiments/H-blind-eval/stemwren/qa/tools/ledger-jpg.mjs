// The ledger capture the skill asks for: the 1440 first viewport at 720 px wide, JPEG.
import { launch } from '../../../skill/website-redesign/scripts/lib/env.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
const { browser } = await launch();
const page = await browser.newPage();
const b64 = readFileSync(src).toString('base64');
const data = await page.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = 720; c.height = Math.round(img.height * 720 / img.width);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.82);
}, b64);
writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await browser.close(); console.log(out);
