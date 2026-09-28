// Pixel truth for the glyph-extent probe on any page, including scroll containers and real pages.
// For one rendered line of a text node inside a clipping box: draw the same characters, same font, as an unclipped
// overlay exactly on top of the line, and compare two screenshots of the bands just outside the clip edges, with and
// without the overlay. Rows that differ are ink the box cuts off. In a scroll container the line is first scrolled to
// the middle of the scrollport (as far as the scroll range allows): what is still cut then can never be seen.
// run(): (A) the 126 in-sample recipe cases of lab/clip-probe.mjs, to check this truth method against the first one;
// (B) new scroll-container cases; (C) out-of-sample real pages. Each: the probe as first written (scrollAware:false)
// and as fixed, against this truth.
import { createRequire } from 'node:module';
import { glyphClipProbe } from '../lib/glyph-probe.mjs';
const require = createRequire('/home/user/website-redesign-skill/skills/website-redesign/scripts/package.json');
const { PNG } = require('pngjs');

// in-page: set up the overlay for line li of text node nodeIndex; returns geometry or a reason to skip
function setupLine({ nodeIndex, li }) {
  document.getElementById('__gp_overlay')?.remove();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, k = -1; while ((n = walker.nextNode())) { k++; if (k === nodeIndex) break; }
  if (!n) return { skip: 'node gone' };
  const el = n.parentElement;
  let clipper = null, fixed = false;
  for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const cs = getComputedStyle(p); if (/hidden|clip|auto|scroll/.test(cs.overflowY) || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) { clipper = p; break; } }
  for (let p = el; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') fixed = true;
  if (!clipper) return { skip: 'no clipper' };
  const lines = () => { const m = new Map(); const r = document.createRange(); const L = Math.min(n.textContent.length, 400);
    for (let i = 0; i < L; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); if (!b.height) continue; const key = Math.round(b.bottom);
      const x = m.get(key) || { top: b.top, bottom: b.bottom, left: b.left, right: b.right, i0: i, i1: i + 1 }; x.left = Math.min(x.left, b.left); x.right = Math.max(x.right, b.right); x.top = Math.min(x.top, b.top); x.i0 = Math.min(x.i0, i); x.i1 = Math.max(x.i1, i + 1); m.set(key, x); }
    return [...m.values()].sort((a, b) => a.top - b.top); };
  let ls = lines(); if (li >= ls.length) return { skip: 'no line', lines: ls.length };
  const ccs = getComputedStyle(clipper);
  const scroller = /auto|scroll/.test(ccs.overflowY) && clipper.scrollHeight > clipper.clientHeight + 1;
  window.__gpSaved = { clipper, top: clipper.scrollTop };
  if (scroller) { const cr = clipper.getBoundingClientRect(); const ln = ls[li]; clipper.scrollTop += (ln.top + ln.bottom) / 2 - (cr.top + cr.bottom) / 2; ls = lines(); }
  const ln = ls[li];
  const cs = getComputedStyle(el);
  const o = document.createElement('div'); o.id = '__gp_overlay';
  o.style.cssText = `position:${fixed ? 'fixed' : 'absolute'}; margin:0; padding:0; border:0; white-space:pre; line-height:normal; pointer-events:none; z-index:2147483647; color:#000; background:transparent; text-shadow:none`;
  for (const p of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariationSettings', 'fontFeatureSettings', 'fontKerning', 'fontVariantLigatures', 'letterSpacing', 'wordSpacing', 'direction', 'textTransform', 'fontSynthesis']) o.style[p] = cs[p];
  o.textContent = n.textContent.slice(ln.i0, ln.i1).replace(/\s+$/, '');
  if (!o.textContent.trim()) return { skip: 'blank line' };
  document.body.append(o);
  const rect = () => { const r = document.createRange(); r.selectNodeContents(o); return r.getBoundingClientRect(); };
  const ox = fixed ? 0 : scrollX, oy = fixed ? 0 : scrollY;
  o.style.left = `${ln.left + ox}px`; o.style.top = `${ln.top + oy}px`;
  for (let pass = 0; pass < 2; pass++) { const q = rect(); o.style.top = `${parseFloat(o.style.top) + (ln.top - q.top)}px`; o.style.left = `${parseFloat(o.style.left) + (cs.direction === 'rtl' ? ln.right - q.right : ln.left - q.left)}px`; }
  const q = rect();
  const cr = clipper.getBoundingClientRect();
  const clipTop = cr.top + parseFloat(ccs.borderTopWidth), clipBottom = cr.bottom - parseFloat(ccs.borderBottomWidth);
  const outside = ln.top >= clipBottom - 1 || ln.bottom <= clipTop + 1; // clamped away or scrolled out: not shown by design
  return { label: el.closest('[data-case]')?.dataset.case || null, matched: Math.abs(q.top - ln.top) < 1 && Math.abs(q.height - (ln.bottom - ln.top)) < 1.5, outside, scroller, fixed, lines: ls.length,
    x0: Math.max(ln.left, cr.left) - 2, x1: Math.min(ln.right, cr.right) + 2, clipTop, clipBottom };
}
function teardown() { document.getElementById('__gp_overlay')?.remove(); const s = window.__gpSaved; if (s) s.clipper.scrollTop = s.top; window.__gpSaved = null; }

const BAND = 30;
async function bandDiff(page, which, g) {
  // bring the band into the viewport (window scroll moves the overlay with the text unless both are fixed)
  const edge = which === 'top' ? g.clipTop : g.clipBottom;
  const vh = page.viewportSize().height;
  let dy = 0;
  if (!g.fixed && (edge - BAND < 0 || edge + BAND > vh)) { dy = await page.evaluate((y) => { const s0 = scrollY; scrollTo(scrollX, s0 + y - 200); return scrollY - s0; }, edge); }
  const e = edge - dy;
  const y0 = which === 'top' ? Math.max(0, Math.floor(e - BAND)) : Math.ceil(e), y1 = which === 'top' ? Math.floor(e) : Math.min(vh, Math.ceil(e + BAND));
  const x0 = Math.max(0, Math.floor(g.x0)), x1 = Math.min(page.viewportSize().width, Math.ceil(g.x1));
  let rows = 0;
  if (y1 - y0 >= 1 && x1 - x0 >= 1) {
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    const A = PNG.sync.read(await page.screenshot({ clip }));
    await page.evaluate(() => { document.getElementById('__gp_overlay').style.visibility = 'hidden'; });
    const B = PNG.sync.read(await page.screenshot({ clip }));
    await page.evaluate(() => { document.getElementById('__gp_overlay').style.visibility = 'visible'; });
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) { const i = (y * A.width + x) * 4; if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 60) { rows++; break; } }
  }
  if (dy) await page.evaluate((d) => scrollBy(0, -d), dy);
  return rows;
}

// truth for one text node: the worst line
export async function nodeTruth(page, nodeIndex, maxLines = 6) {
  let top = 0, bottom = 0, lines = 0, unmatched = 0, skipped = null, label = null;
  for (let li = 0; li < maxLines; li++) {
    const g = await page.evaluate(setupLine, { nodeIndex, li });
    if (g.skip) { if (li === 0) skipped = g.skip; await page.evaluate(teardown); break; }
    lines = g.lines; label = g.label;
    if (!g.outside) {
      if (!g.matched) unmatched++;
      top = Math.max(top, await bandDiff(page, 'top', g));
      bottom = Math.max(bottom, await bandDiff(page, 'bottom', g));
    }
    await page.evaluate(teardown);
    if (li + 1 >= g.lines) break;
  }
  return { top, bottom, lines, unmatched, skipped, label };
}

// the probe (fixed and first version) vs truth on the current page. Flagged nodes are all measured; unflagged ones are
// sampled evenly up to `sample`.
export async function score(page, { scripts = 'all', sample = 25, label = '' } = {}) {
  const now = await page.evaluate(glyphClipProbe, { scripts, detail: true, scrollAware: true });
  const old = await page.evaluate(glyphClipProbe, { scripts, detail: true, scrollAware: false });
  const oldBy = Object.fromEntries(old.nodes.map((x) => [x.nodeIndex, x]));
  const flagged = (x) => x && (x.topPx > 0.75 || x.bottomPx > 0.75);
  const pick = now.nodes.filter((x) => flagged(x) || flagged(oldBy[x.nodeIndex]));
  const rest = now.nodes.filter((x) => !pick.includes(x));
  const step = Math.max(1, Math.ceil(rest.length / sample));
  const sampled = rest.filter((_, i) => i % step === 0).slice(0, sample);
  const cases = [];
  for (const x of [...pick, ...sampled]) {
    const t = await nodeTruth(page, x.nodeIndex);
    if (t.skipped) continue;
    const o = oldBy[x.nodeIndex];
    cases.push({ page: label, case: t.label, selector: x.selector, clipper: x.clipper, scroller: x.scroller, text: x.text, truthTopPx: t.top, truthBottomPx: t.bottom, lines: t.lines, unmatched: t.unmatched,
      probe: { topPx: x.topPx, bottomPx: x.bottomPx }, probeFirstVersion: o ? { topPx: o.topPx, bottomPx: o.bottomPx } : null, sampledUnflagged: !pick.includes(x) });
  }
  return { checked: now.checked, flaggedNow: now.nodes.filter(flagged).length, flaggedFirstVersion: old.nodes.filter(flagged).length, unflaggedPopulation: rest.length, unflaggedSampled: sampled.length, cases };
}

export function confusion(cases, key) {
  let tp = 0, fp = 0, fn = 0, tn = 0; const fpList = [], fnList = [];
  for (const c of cases) {
    const t = c.truthTopPx >= 1 || c.truthBottomPx >= 1, p = c[key] && (c[key].topPx > 0.75 || c[key].bottomPx > 0.75);
    if (t && p) tp++; else if (!t && p) { fp++; fpList.push(`${c.page} ${c.selector}${c.scroller ? ' (scroller)' : ''} "${c.text}"`); } else if (t && !p) { fn++; fnList.push(`${c.page} ${c.selector} truth ${c.truthTopPx}/${c.truthBottomPx}px "${c.text}"`); } else tn++;
  }
  return { tp, fp, fn, tn, fpList: fpList.slice(0, 20), fnList: fnList.slice(0, 20) };
}

// B. scroll containers: 6 faces × 2 strings × 3 recipes, content taller than the box so it scrolls
const FONTS = ['Tajawal', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Almarai', 'Cairo', 'Alexandria'];
const STR = { vocal: 'كُتُبٌ جَمِيلَةٌ لِلْقِرَاءَةِ فِي الْمَسَاءِ', stack: 'إِلَيْكُمْ لَأَنَّ أُمَّهَاتٌ آمِينَ' };
const SCROLL = {
  // a list or panel that scrolls, generous leading: lines cross the scrollport edge mid-scroll, no ink is lost
  panelRoomy: 'height:100px; overflow-y:auto; font-size:16px; line-height:2; padding:0 8px; width:300px',
  // the same panel with tight leading and no block padding: the first line's marks sit above the scroll range
  panelTight: 'height:100px; overflow-y:auto; font-size:16px; line-height:1.1; padding:0 8px; width:300px',
  // a table body that scrolls (display:block tbody, as in GOV-SA), cells with padding
  tbody: 'display:block; max-height:120px; overflow:auto; font-size:15px; line-height:1.5; width:320px',
};
async function scrollCases(page, base) {
  await page.goto(base + '/fixtures/blank.html');
  await page.evaluate(async ({ FONTS, STR, SCROLL }) => {
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid; grid-template-columns: repeat(3, 360px); gap: 60px 40px; padding: 50px';
    for (const f of FONTS) for (const [rn, css] of Object.entries(SCROLL)) for (const [sn, s] of Object.entries(STR)) {
      const cell = document.createElement('div'); cell.style.cssText = 'min-height:150px';
      if (rn === 'tbody') {
        const t = document.createElement('table'); t.style.cssText = `border-collapse:collapse; font-family:"T-${f}"`;
        const tb = document.createElement('tbody'); tb.style.cssText = css; tb.dataset.case = `${f}|${rn}|${sn}`;
        for (let i = 0; i < 6; i++) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.style.cssText = 'padding:6px 8px; border-bottom:1px solid #ddd'; td.textContent = s; tr.append(td); tb.append(tr); }
        t.append(tb); cell.append(t);
      } else {
        const d = document.createElement('div'); d.style.cssText = css + `; font-family:"T-${f}"`; d.dataset.case = `${f}|${rn}|${sn}`;
        d.textContent = Array(5).fill(s).join(' ، '); cell.append(d);
      }
      grid.append(cell);
    }
    document.body.append(grid);
    for (const f of FONTS) await document.fonts.load(`16px "T-${f}"`, 'عربي');
    await document.fonts.ready;
  }, { FONTS, STR, SCROLL });
}

export async function run(browser, base, realPages = []) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const out = { note: 'truth: unclipped overlay vs page, rows differing in 30 px bands outside the clip edges (scrollers: line scrolled to the middle first); probe flags > 0.75 px, truth counts ≥ 1 px', sets: {} };
  // A. the in-sample recipe page of lab/clip-probe.mjs (same page builder)
  const { buildRecipePage } = await import('./clip-probe.mjs');
  await buildRecipePage(page, base);
  const A = await score(page, { scripts: 'arabic', sample: 1000, label: 'recipes' });
  out.sets.inSampleRecipes = { ...pick(A), probe: confusion(A.cases, 'probe'), probeFirstVersion: confusion(A.cases, 'probeFirstVersion') };
  // B. scroll containers
  await scrollCases(page, base);
  const B = await score(page, { scripts: 'arabic', sample: 1000, label: 'scroll' });
  const perRecipe = {};
  for (const c of B.cases) {
    const r = (c.case || '||').split('|')[1]; perRecipe[r] ??= { cases: 0, truthCut: 0, flaggedNow: 0, flaggedFirstVersion: 0, maxTruthPx: 0 };
    const P = perRecipe[r]; P.cases++; const t = Math.max(c.truthTopPx, c.truthBottomPx); if (t >= 1) P.truthCut++; P.maxTruthPx = Math.max(P.maxTruthPx, t);
    if (c.probe.topPx > 0.75 || c.probe.bottomPx > 0.75) P.flaggedNow++; if (c.probeFirstVersion && (c.probeFirstVersion.topPx > 0.75 || c.probeFirstVersion.bottomPx > 0.75)) P.flaggedFirstVersion++;
  }
  out.sets.scrollContainers = { ...pick(B), perRecipe, probe: confusion(B.cases, 'probe'), probeFirstVersion: confusion(B.cases, 'probeFirstVersion') };
  // C. real pages the probe was not built on
  await page.setViewportSize({ width: 1280, height: 900 });
  const C = [];
  for (const [label, url] of realPages) {
    await page.goto(base + url, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important }' });
    const r = await score(page, { scripts: 'all', sample: 20, label });
    C.push(...r.cases);
    out.sets[`page:${label}`] = pick(r);
  }
  out.sets.realPages = { cases: C.length, probe: confusion(C, 'probe'), probeFirstVersion: confusion(C, 'probeFirstVersion'), unmatchedOverlays: C.filter((c) => c.unmatched).length };
  out.cases = { recipes: A.cases.length, scroll: B.cases, real: C };
  out.recipeCases = A.cases.map((c) => ({ case: c.case, truthTopPx: c.truthTopPx, truthBottomPx: c.truthBottomPx }));
  await ctx.close();
  return out;
}
const pick = (r) => ({ checked: r.checked, flaggedNow: r.flaggedNow, flaggedFirstVersion: r.flaggedFirstVersion, unflaggedPopulation: r.unflaggedPopulation, unflaggedSampled: r.unflaggedSampled });
