// Validates lib/glyph-probe.mjs against pixels. Five common clipping components × three strings × five Arabic
// faces. Ground truth: screenshot as built, then with every clip removed; rows that differ above or below the
// clipping box are ink the component cut off. Writes shots/clip-sheet.jpg.
import { createRequire } from 'node:module';
import path from 'node:path';
import { root } from '../lib/server.mjs';
import { glyphClipProbe } from '../lib/glyph-probe.mjs';
const require = createRequire('/home/user/website-redesign-skill/skills/website-redesign/scripts/package.json');
const { PNG } = require('pngjs');

const FONTS = ['Tajawal', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Almarai', 'Cairo'];
const STR = { plain: 'الخدمات الإلكترونية', vocal: 'كُتُبٌ جَمِيلَةٌ', stack: 'إِلَيْكُمْ لَأَنَّ أُمَّهَاتٌ' };
// The component recipes as they are usually written (Tailwind equivalents in comments).
const COMPONENTS = {
  chip: 'font-size:12px; line-height:16px; padding:2px 8px; border-radius:999px; background:#eef; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block; max-width:260px', // text-xs leading-4 px-2 py-0.5 truncate
  button: 'font-size:14px; line-height:1; height:36px; padding:0 16px; display:inline-flex; align-items:center; overflow:hidden; white-space:nowrap; background:#123; color:#fff; border-radius:6px', // h-9 leading-none truncate
  cell: 'font-size:14px; line-height:20px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:300px', // a <div class="truncate leading-5"> inside a 40px row
  clamp: 'font-size:28px; line-height:1.1; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; max-width:320px; font-weight:600', // line-clamp-2 leading-[1.1]
  nav: 'font-size:16px; line-height:1.5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:300px', // truncate leading-6
};

export async function run(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + '/fixtures/blank.html');
  await page.evaluate(async ({ FONTS, STR, COMPONENTS }) => {
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid; grid-template-columns: repeat(3, 360px); gap: 44px 40px; padding: 40px; justify-content:start';
    let k = 0;
    for (const f of FONTS) for (const [cname, css] of Object.entries(COMPONENTS)) for (const [sname, s] of Object.entries(STR)) {
      const cell = document.createElement('div'); cell.style.cssText = 'height: 88px; display:flex; align-items:center';
      const el = document.createElement('div'); el.id = `c${k++}`; el.dataset.case = `${f}|${cname}|${sname}`;
      el.style.cssText = css + `; font-family: "T-${f}"`;
      el.textContent = s; cell.append(el); grid.append(cell);
    }
    document.body.append(grid);
    for (const f of FONTS) await document.fonts.load(`16px "T-${f}"`, 'عربي');
    await document.fonts.ready;
  }, { FONTS, STR, COMPONENTS });
  const rects = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.id, c: e.dataset.case, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }));
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 1400, height: H });
  const before = PNG.sync.read(await page.screenshot());
  await page.screenshot({ path: path.join(root, 'shots', 'clip-sheet.jpg'), type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1240, height: Math.min(H, 2200) } });
  const probe = await page.evaluate(glyphClipProbe, { scripts: 'arabic' });
  await page.addStyleTag({ content: '[data-case] { overflow: visible !important; -webkit-line-clamp: unset !important; text-overflow: clip !important }' });
  const after = PNG.sync.read(await page.screenshot());
  const rowsDiff = (y0, y1, x0, x1) => { let n = 0; for (let y = Math.max(0, Math.floor(y0)); y < Math.min(before.height, Math.ceil(y1)); y++) { for (let x = Math.max(0, Math.floor(x0)); x < Math.min(before.width, Math.ceil(x1)); x++) { const i = (y * before.width + x) * 4; if (Math.abs(before.data[i] - after.data[i]) > 40) { n++; break; } } } return n; };
  const byId = Object.fromEntries(probe.clipped.map((c) => [c.selector.replace('#', ''), c]));
  const cases = rects.map((r) => {
    const truthTop = rowsDiff(r.top - 34, r.top, r.left - 4, r.right + 4);
    const clamp = r.c.includes('|clamp|');
    const truthBottom = clamp ? null : rowsDiff(r.bottom, r.bottom + 34, r.left - 4, r.right + 4);
    const p = byId[r.id];
    return { case: r.c, truthTopPx: truthTop, truthBottomPx: truthBottom, probeTopPx: p ? p.topPx : 0, probeBottomPx: p ? p.bottomPx : 0 };
  });
  // agreement: a case is "clipped" when ≥ 1 px of ink is lost (truth) / predicted > 0.75 px (probe)
  let tp = 0, fp = 0, fn = 0, tn = 0; const errs = [];
  for (const c of cases) {
    const t = c.truthTopPx >= 1 || (c.truthBottomPx ?? 0) >= 1;
    const pr = c.probeTopPx > 0.75 || (c.truthBottomPx !== null && c.probeBottomPx > 0.75);
    if (t && pr) tp++; else if (!t && pr) fp++; else if (t && !pr) fn++; else tn++;
    errs.push(Math.abs(c.truthTopPx - c.probeTopPx)); if (c.truthBottomPx !== null) errs.push(Math.abs(c.truthBottomPx - c.probeBottomPx));
  }
  errs.sort((a, b) => a - b);
  const summary = { cases: cases.length, truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn,
    medianAbsErrorPx: errs[Math.floor(errs.length / 2)], p90AbsErrorPx: errs[Math.floor(errs.length * 0.9)], maxAbsErrorPx: errs[errs.length - 1] };
  // per component: how many of the 15 (font × string) cases lose ink
  const perComponent = {};
  for (const c of cases) { const [, comp, s] = c.case.split('|'); const k = `${comp}`; perComponent[k] ??= { plain: 0, vocal: 0, stack: 0, maxLossPx: 0 };
    const lost = Math.max(c.truthTopPx, c.truthBottomPx ?? 0); if (lost >= 1) perComponent[k][s]++; perComponent[k].maxLossPx = Math.max(perComponent[k].maxLossPx, lost); }
  await ctx.close();
  return { summary, perComponent: { note: 'count of the 5 faces that lose ≥ 1 px of ink, per string', ...perComponent }, cases };
}
