// Development helper: open each variant once (frozen pose), report errors, renderer and first frame, and screenshot.
import { launch } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
import { serve } from './serve.mjs';
import { DIST, MAIN } from './build.mjs';
import path from 'node:path';

const names = process.argv[2] ? process.argv[2].split(',') : MAIN;
const n = Number(process.argv[3] || 20);
const extra = process.argv[4] || 'freeze';
const { server, base } = await serve(DIST);
const { browser } = await launch();
console.log('browser', browser.version());
for (const name of names) {
  const ctx = await browser.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(r.status() + ' ' + r.url()); });
  await page.goto(`${base}/${name}/?n=${n}&${extra}`);
  try { await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 30000 }); } catch { logs.push('no first frame'); }
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => ({ r: window.__lab?.info?.renderer, ttff: window.__lab?.ttff, errors: window.__lab?.errors }));
  await page.locator('#stage').screenshot({ path: path.join('/tmp/s2-S1', `smoke-${name}.png`) });
  console.log(name.padEnd(16), JSON.stringify(info), logs.join(' | '));
  await ctx.close();
}
await browser.close();
server.close();
