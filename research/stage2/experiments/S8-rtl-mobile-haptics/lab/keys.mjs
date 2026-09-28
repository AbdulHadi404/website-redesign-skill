// RTL keyboard semantics: does an arrow key move the way it points? Native range and radio group in Chromium, an
// RTL-aware tablist and a copied-from-LTR tablist; and what the skill's widgets.mjs tabs contract says about each.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from '../lib/server.mjs';
const run$ = promisify(execFile);
const SKILL = '/home/user/website-redesign-skill/skills/website-redesign/scripts';

export async function run(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();
  await page.goto(base + '/fixtures/rtl-keys.html');
  const res = { tabs: {}, native: {} };
  const x = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.left + r.width / 2; }, sel);
  for (const id of ['tabs-aware', 'tabs-naive']) {
    const out = {};
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      await page.reload();
      await page.focus(`#${id} [role=tab]:nth-child(2)`);
      const x0 = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.left + r.width / 2; });
      await page.keyboard.press(key);
      const r = await page.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect(); return { id: a.id, x: b.left + b.width / 2, idx: [...a.parentElement.children].indexOf(a) }; });
      out[key] = { movedTo: r.idx === 2 ? 'next (DOM)' : r.idx === 0 ? 'previous (DOM)' : 'stayed', visual: r.x < x0 ? 'left' : r.x > x0 ? 'right' : 'none', followsArrow: (key === 'ArrowLeft') === (r.x < x0) };
    }
    res.tabs[id] = out;
  }
  // native range in RTL
  await page.reload();
  const range = {};
  for (const key of ['ArrowRight', 'ArrowLeft']) {
    await page.evaluate(() => { document.getElementById('range').value = 50; });
    await page.focus('#range');
    await page.keyboard.press(key);
    const v = await page.evaluate(() => +document.getElementById('range').value);
    range[key] = { value: v, change: v > 50 ? 'increase' : v < 50 ? 'decrease' : 'none' };
  }
  // where is the minimum? click near each edge
  const box = await page.locator('#range').boundingBox();
  await page.mouse.click(box.x + 2, box.y + box.height / 2);
  range.valueAtLeftEdge = await page.evaluate(() => +document.getElementById('range').value);
  range.thumbMovesWithArrow = (range.valueAtLeftEdge > 50) === (range.ArrowLeft.change === 'increase');
  res.native.range = range;
  // native radios in RTL
  const radios = {};
  for (const key of ['ArrowLeft', 'ArrowRight']) {
    await page.reload();
    await page.focus('#radios input[value="2"]');
    await page.evaluate(() => { document.querySelector('#radios input[value="2"]').checked = true; });
    const x0 = await x('#radios input[value="2"]');
    await page.keyboard.press(key);
    const r = await page.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect(); return { v: a.value, x: b.left + b.width / 2 }; });
    radios[key] = { checked: r.v, domMove: r.v === '3' ? 'next' : r.v === '1' ? 'previous' : 'none', visual: r.x < x0 ? 'left' : 'right', followsArrow: (key === 'ArrowLeft') === (r.x < x0) };
  }
  res.native.radios = radios;
  await ctx.close();
  // The skill's widgets.mjs tabs contract, unchanged, against both tablists
  const contracts = path.join(root, 'results', 'rtl-tabs-contracts.json');
  await writeFile(contracts, JSON.stringify([{ type: 'tabs', tablist: '#tabs-aware' }, { type: 'tabs', tablist: '#tabs-naive' }], null, 1));
  let stdout = '';
  try { ({ stdout } = await run$('node', [path.join(SKILL, 'widgets.mjs'), base + '/fixtures/rtl-keys.html', contracts], { cwd: root, timeout: 120000 })); }
  catch (e) { stdout = (e.stdout || '') + (e.stderr || ''); }
  res.widgetsMjs = stdout.split('\n').filter((l) => /tabs|Arrow|FAIL|PASS|✓|✗|—/.test(l)).slice(0, 40);
  return res;
}
