// RTL keyboard semantics: does an arrow key move the way it points? Native range and radio group in Chromium, an
// RTL-aware tablist and a copied-from-LTR tablist, the UAE design system's own tab handler (aegov custom.js, run as
// shipped on its tab markup in RTL); and what the skill's widgets.mjs tabs contract says about each.

// aegov-dls@d309bb5 js/src/components/custom.js (MIT): its tab keyboard block, loaded verbatim into a page with the
// system's tab markup (data-tabs-toggle, role=tab buttons) in RTL. Written to <ext>/aegov-tabs.html.
export async function buildAegovPage() {
  const src = await readFile(path.join(ext, 'sources', 'aegov-custom.js'), 'utf8');
  const a = src.indexOf('// Tabs ARIA keyboard navigation'), b = src.indexOf('// Auto focus for model close button');
  const block = src.slice(a, b);
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>aegov tabs in RTL</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:24px} ul{display:flex;gap:4px;list-style:none;padding:0} button{padding:6px 12px;border:1px solid #888;background:#fff;font:inherit}</style></head><body>
<ul data-tabs-toggle="#tab-content" role="tablist" aria-label="aegov">
${['الطلبات', 'الفواتير', 'الإعدادات'].map((t, i) => `<li role="presentation"><button id="g${i + 1}" data-tabs-target="#gp${i + 1}" type="button" role="tab" aria-controls="gp${i + 1}" aria-selected="${i === 0}">${t}</button></li>`).join('\n')}
</ul>
<div id="tab-content">${[1, 2, 3].map((i) => `<div id="gp${i}" role="tabpanel">${i}</div>`).join('')}</div>
<script>
${block}
</script></body></html>`;
  await (await import('node:fs/promises')).writeFile(path.join(ext, 'aegov-tabs.html'), html);
  return '/ext/aegov-tabs.html';
}
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { root, ext } from '../lib/server.mjs';
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
  // the aegov handler as shipped
  const aegovUrl = await buildAegovPage();
  {
    const out = {};
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      await page.goto(base + aegovUrl);
      await page.focus('#g2');
      const x0 = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.left + r.width / 2; });
      await page.keyboard.press(key);
      const r = await page.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect(); return { id: a.id, x: b.left + b.width / 2 }; });
      out[key] = { movedTo: r.id === 'g3' ? 'next (DOM)' : r.id === 'g1' ? 'previous (DOM)' : 'stayed', visual: r.x < x0 ? 'left' : r.x > x0 ? 'right' : 'none', followsArrow: (key === 'ArrowLeft') === (r.x < x0) };
    }
    res.tabs['aegov (custom.js as shipped)'] = out;
  }
  await page.goto(base + '/fixtures/rtl-keys.html');
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
