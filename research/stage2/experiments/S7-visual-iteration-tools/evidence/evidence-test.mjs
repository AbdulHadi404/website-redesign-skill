/**
 * Evidence test: do the sweep and stress evidence images show the element each numbered box marks?
 *
 * For each case (a page at one width) the findings are measured with sweep.mjs's probe (or, for right-to-left flips,
 * stress.mjs's mirror check). For each of the first 4 findings: its element gets a magenta outline, the page is marked
 * as the scripts mark it (the sheet cell: all findings, this one first; the crop: this one alone), the first mark is
 * recoloured lime, and the cell and the crop are shot. An image is right ("ok") when the lime box holds the magenta
 * outline: the mark sits on the element as the image draws it. "blank" (one colour over 99.5% of the image) is
 * counted apart: a skip link parked 9,999 px out in a right-to-left page's overflow is rightly shown on empty ground.
 * Findings whose element has no visible area (text cut away entirely, a closed drawer) are not judged.
 * Two implementations run on fresh page loads: "legacy" (the code the review found broken: marks appended to body at
 * any x, full-page clips from x = 0) and "current" (sweep.mjs markFindings/evidenceShot/evidenceCrop).
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { launch, open, settle } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
import { measureAt, prepare, resizeTo, markFindings, evidenceShot, evidenceCrop } from '../../../../../skills/website-redesign/scripts/sweep.mjs';
import { mirrorRecord, mirrorCheck, pageDirection, flipDirection } from '../../../../../skills/website-redesign/scripts/stress.mjs';

/* ---------------- legacy (before the review): copied from the pre-fix sweep.mjs ---------------- */
async function legacyMark(page, marks) {
  await page.evaluate((marks) => {
    const layer = document.createElement('div');
    layer.id = '__sw_marks';
    layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
    marks.forEach((m, i) => {
      if (!m.box) return;
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${m.box.x - 3}px;top:${m.box.y - 3}px;width:${Math.max(6, m.box.w + 6)}px;height:${Math.max(6, m.box.h + 6)}px;outline:3px solid ${m.sev === 'error' ? '#e0112b' : '#e08a00'};outline-offset:0;box-shadow:0 0 0 5px #fff9`;
      const n = document.createElement('div');
      n.textContent = String(i + 1);
      n.style.cssText = `position:absolute;left:${m.box.x - 3}px;top:${Math.max(0, m.box.y - 22)}px;background:${m.sev === 'error' ? '#e0112b' : '#e08a00'};color:#fff;font:700 13px/18px system-ui;padding:0 6px;border-radius:3px`;
      layer.append(d, n);
    });
    document.body.append(layer);
  }, marks);
  return () => page.evaluate(() => document.getElementById('__sw_marks')?.remove());
}
async function legacyShot(page, box, vh, maxH) {
  const { vw, docH } = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, docH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) }));
  const y0 = box ? Math.max(0, Math.min(box.y - Math.round(vh * 0.2), docH - vh)) : 0;
  const h = Math.min(maxH || vh, Math.max(1, docH - y0));
  return page.screenshot({ clip: { x: 0, y: y0, width: vw, height: h }, fullPage: true });
}
async function legacyCrop(page, box) {
  const { vw, iw, docH } = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, iw: innerWidth, docH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) }));
  const pad = 32;
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad - 22) };
  clip.width = Math.min(Math.max(vw, iw) - clip.x, box.w + pad * 2);
  clip.height = Math.min(docH - clip.y, box.h + pad * 2 + 22, 1400);
  if (clip.width < 4 || clip.height < 4) return null;
  return page.screenshot({ clip, fullPage: true }).catch(() => null);
}

/* ---------------- scoring ---------------- */
// The test paints the finding's own element with a magenta outline (outline: no layout change) and recolours the
// first mark's box lime. An evidence image is right when the lime box holds magenta: the mark sits on the element as
// it is drawn in that very image. A full-page shot that re-lays the page out, or a clip from the wrong origin, fails.
export function score(buf, dpr = 1) {
  if (!buf) return { mark: false, aligned: false, blank: true, ok: false };
  const im = PNG.sync.read(buf);
  const { width: W, height: H, data } = im;
  const lime = (i) => data[i] < 60 && data[i + 1] > 200 && data[i + 2] < 60;
  const magenta = (i) => data[i] > 220 && data[i + 1] < 60 && data[i + 2] > 220;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  const hist = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (lime(i)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const k = (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4); hist.set(k, (hist.get(k) || 0) + 1);
  }
  const blank = Math.max(...hist.values()) / (W * H) > 0.995;
  const mark = x1 >= 0;
  let inside = 0, total = 0;
  const pad = 6 * dpr;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!magenta(i)) continue;
    total++;
    if (mark && x >= x0 - pad && x <= x1 + pad && y >= y0 - pad && y <= y1 + pad) inside++;
  }
  const aligned = mark && inside >= 8;
  return { mark, aligned, magentaInside: inside, magentaTotal: total, blank, ok: mark && aligned, W, H };
}

/** In the page: paint the finding's element (by sweep id, else by selector and box) and report its visible area. */
function paint(f) {
  document.querySelectorAll('[data-ev-target]').forEach((e) => { e.style.removeProperty('outline'); e.style.removeProperty('outline-offset'); e.removeAttribute('data-ev-target'); });
  let el = null;
  if (f.id) for (const e of document.querySelectorAll('*')) if (e.__swid === f.id) { el = e; break; }
  if (!el && f.sel && !/^\(/.test(f.sel)) {
    let all = [];
    try { all = [...document.querySelectorAll(f.sel.replace(/ \(\d+×\)$/, '').replace(/^… > /, ''))]; } catch { all = []; }
    const d = (e) => { const r = e.getBoundingClientRect(); return Math.abs(r.left + scrollX - f.box.x) + Math.abs(r.top + scrollY - f.box.y) + Math.abs(r.width - f.box.w) + Math.abs(r.height - f.box.h); };
    el = all.sort((a, b) => d(a) - d(b))[0] || null;
    if (el && d(el) > 8) el = null;
  }
  if (!el) return { found: false, visible: 0 };
  // Visible area: the box cut by every clipping ancestor.
  const r = el.getBoundingClientRect();
  let [l, t, rr, b] = [r.left, r.top, r.right, r.bottom];
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    const c = getComputedStyle(p);
    if (c.overflowX !== 'visible') { const q = p.getBoundingClientRect(); l = Math.max(l, q.left); rr = Math.min(rr, q.right); }
    if (c.overflowY !== 'visible') { const q = p.getBoundingClientRect(); t = Math.max(t, q.top); b = Math.min(b, q.bottom); }
  }
  const cs = getComputedStyle(el);
  const hidden = cs.visibility !== 'visible' || (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
  el.setAttribute('data-ev-target', '');
  el.style.setProperty('outline', '3px solid #ff00ff', 'important');
  el.style.setProperty('outline-offset', '-3px', 'important');
  return { found: true, visible: hidden ? 0 : Math.max(0, rr - l) * Math.max(0, b - t) };
}
const limeFirst = () => { const b = document.querySelector('#__sw_marks > div'); if (b) b.style.setProperty('outline-color', '#00ff00'); };

/* ---------------- cases ---------------- */
export function cases(base, R) {
  const E = `${base}/fixtures/evidence`;
  const sanad = `${R}/research/experiments/H-blind-eval/sanad/fixture/`, stem = `${R}/research/experiments/H-blind-eval/stemwren/fixture/`;
  const wiz = `${R}/tools/regress/fixtures/a11y-wizard.html`;
  return [
    { name: 'fixture ltr-long', url: `${E}/ltr-long.html`, width: 390, mobile: true, target: '#a' },
    { name: 'fixture rtl-overflow', url: `${E}/rtl-overflow.html`, width: 320, mobile: true, target: '#a' },
    { name: 'fixture rtl-overflow', url: `${E}/rtl-overflow.html`, width: 1280, mobile: false, target: '#a' },
    { name: 'fixture zoom-out (width=1100)', url: `${E}/zoomout.html`, width: 344, mobile: true, target: '#a' },
    { name: 'Sanad (native RTL)', url: sanad, width: 320, mobile: true },
    { name: 'Sanad (native RTL)', url: sanad, width: 344, mobile: true },
    { name: 'Sanad (native RTL)', url: sanad, width: 368, mobile: true },
    { name: 'Sanad (native RTL)', url: sanad, width: 1280, mobile: false },
    { name: 'Stemwren (width=1100, autosized)', url: stem, width: 344, mobile: true },
    { name: 'Stemwren (width=1100, autosized)', url: stem, width: 390, mobile: true },
    { name: 'a11y-wizard flipped to RTL', url: wiz, width: 390, mobile: true, flip: true },
    { name: 'a11y-wizard flipped to RTL', url: wiz, width: 768, mobile: false, flip: true },
    { name: 'a11y-wizard flipped to RTL', url: wiz, width: 1280, mobile: false, flip: true },
  ];
}

async function findingsFor(page, c) {
  if (c.target) return page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [{ check: 'target', sev: 'error', sel, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } }]; }, c.target);
  if (c.flip) {
    await page.evaluate(pageDirection);
    await page.evaluate(mirrorRecord, {});
    await page.evaluate(flipDirection, { to: 'rtl' });
    await page.waitForTimeout(150);
    return (await page.evaluate(mirrorCheck, { to: 'rtl' })).map((f) => ({ ...f, sev: 'warn' }));
  }
  const r = await measureAt(page, { mobile: c.mobile });
  return r.findings.filter((f) => f.sev !== 'info' && f.box && f.box.w > 0 && f.box.h > 0);
}

export async function runEvidence(base, R, outDir) {
  await mkdir(outDir, { recursive: true });
  const { browser } = await launch({});
  const rows = [];
  try {
    for (const c of cases(base, R)) {
      for (const impl of ['legacy', 'current']) {
        const height = c.mobile ? 740 : 800, dpr = c.mobile ? 2 : 1;
        const ctx = await browser.newContext({ viewport: { width: c.width, height }, deviceScaleFactor: dpr, isMobile: c.mobile, hasTouch: c.mobile });
        const page = await ctx.newPage();
        await open(page, c.url); await settle(page); await prepare(page);
        await resizeTo(page, c.width, height);
        const all = (await findingsFor(page, c)).slice(0, 8);
        const mark = impl === 'legacy' ? legacyMark : markFindings;
        for (const [i, f] of all.slice(0, 4).entries()) {
          const t = await page.evaluate(paint, f);
          if (!t.found) { rows.push({ case: c.name, width: c.width, impl, finding: `${f.check} ${f.sel}`.slice(0, 90), skipped: 'element not found' }); continue; }
          // The sheet cell: every finding marked (as the scripts do), this one first, shot around it.
          let rm = await mark(page, [f, ...all.filter((x) => x !== f)]);
          await page.evaluate(limeFirst);
          const cell = impl === 'legacy' ? await legacyShot(page, f.box, height, Math.round(height * 1.4)).catch(() => null) : await evidenceShot(page, f.box, { height, maxH: Math.round(height * 1.4) }).catch(() => null);
          await rm();
          // The crop: this finding alone (as the scripts do).
          rm = await mark(page, [f]);
          await page.evaluate(limeFirst);
          let crop = null;
          if (impl === 'legacy') crop = await legacyCrop(page, f.box);
          else { const tmp = path.join(outDir, 'tmp-crop.png'); if (await evidenceCrop(page, f.box, tmp)) crop = await readFile(tmp); }
          await rm();
          const slug = `${c.name.replace(/\W+/g, '-')}-${c.width}-${impl}-${i + 1}`.toLowerCase().replace(/-+/g, '-');
          if (cell) await writeFile(path.join(outDir, `${slug}-cell.png`), cell);
          if (crop) await writeFile(path.join(outDir, `${slug}-crop.png`), crop);
          rows.push({ case: c.name, width: c.width, impl, finding: `${f.check} ${f.sel}`.slice(0, 90), box: f.box, visible: Math.round(t.visible), cell: score(cell, dpr), crop: score(crop, dpr), file: slug });
        }
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  // Findings whose element has no visible area (text entirely cut away) cannot be shown by any shot: counted apart.
  const judged = rows.filter((x) => !x.skipped && x.visible >= 16);
  const sum = (impl, k) => { const r = judged.filter((x) => x.impl === impl); return { images: r.length, ok: r.filter((x) => x[k].ok).length, blank: r.filter((x) => x[k].blank).length, markMissing: r.filter((x) => !x[k].mark).length, misaligned: r.filter((x) => x[k].mark && !x[k].aligned).length }; };
  const byCase = {};
  for (const r of judged) { const k = `${r.case} @ ${r.width}`; const e = (byCase[k] ||= { legacy: { n: 0, cellOk: 0, cropOk: 0 }, current: { n: 0, cellOk: 0, cropOk: 0 } })[r.impl]; e.n++; if (r.cell.ok) e.cellOk++; if (r.crop.ok) e.cropOk++; }
  return { summary: { legacy: { cell: sum('legacy', 'cell'), crop: sum('legacy', 'crop') }, current: { cell: sum('current', 'cell'), crop: sum('current', 'crop') }, notJudged: rows.length - judged.length }, byCase, rows };
}
