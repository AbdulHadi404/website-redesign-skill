#!/usr/bin/env node
/**
 * rtl-check.mjs — what an Arabic (or Hebrew, Persian, Urdu) build gets wrong below the level of "dir is set".
 * Experiment prototype for stage-2 stream S8; not part of the skill.
 *
 *   node rtl-check.mjs <url> [--flip] [--width 1280] [--out results/x.json] [--quiet]
 *
 * Without --flip the page is checked as served (an RTL route). With --flip an LTR page is rendered, then
 * <html dir="rtl"> is set on the same DOM (a bidi pseudo-locale, Firefox's intl.l10n.pseudo=bidi) and the two
 * renders are compared: boxes that do not mirror, physical values that stay, icons whose pixels do not flip.
 *
 * Checks (FAIL = wrong for every RTL reader; WARN = usually wrong, confirm; INFO = a decision to record):
 *  css        physical inline-axis declarations in same-origin CSS (margin-left, padding-right, left/right,
 *             border-left, *-left-radius, text-align/float left|right, translateX, x-offset shadows, @keyframes
 *             that move along x), split into plain rules and RTL overrides ([dir=rtl], :dir(rtl), .rtl)
 *  mirror     (--flip) element boxes that do not mirror, with the physical computed values that stayed
 *  icons      directional icons not mirrored; media, clock, check, search and object icons mirrored; the
 *             ambiguous ones (help, volume, log out, charts) listed for a written decision
 *  align      text-align: left inside RTL text (numbers excepted)
 *  arabic     letter-spacing or italic/oblique on Arabic text; glyphs (harakat, hamza, descenders) cut by a
 *             clipping box (lib/glyph-probe.mjs, validated against pixels in lab/clip-probe.mjs)
 *  bidi       LTR data (phone, card, email, time range, signed number) laid out in scrambled order; LTR-data
 *             inputs that inherit RTL
 *  keys       tablist, toolbar, radiogroup, menubar: does ArrowLeft move focus to the left?
 *  drawers    off-canvas panels parked off the left edge in RTL (they slide in from the wrong side)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch } from '/home/user/website-redesign-skill/skills/website-redesign/scripts/lib/env.mjs';
import { glyphClipProbe } from './lib/glyph-probe.mjs';
import { classifyIcon, classifyIconLegacy } from './lib/icon-classify.mjs';
const require = createRequire('/home/user/website-redesign-skill/skills/website-redesign/scripts/package.json');
const { PNG } = require('pngjs');

// ---------------------------------------------------------------- in-page: CSS scan
export function cssScan() {
  const PHYS = ['margin-left', 'margin-right', 'padding-left', 'padding-right', 'left', 'right', 'border-left-width', 'border-right-width',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'];
  const LOGICAL = /margin-inline|padding-inline|inset-inline|border-inline|border-(start|end)-(start|end)-radius|text-align:\s*(start|end)|float:\s*inline/;
  const RTLSEL = /\[dir=?["']?rtl|:dir\(rtl\)|\.rtl\b|:lang\(ar|\[lang=?["']?ar|html\[dir/i;
  const res = { rules: 0, physicalRules: [], overrideRules: 0, logicalRules: 0, crossOrigin: 0, keyframes: [], shadowsX: 0, transformsX: [] };
  const pair = (st, a, b) => { const x = st.getPropertyValue(a), y = st.getPropertyValue(b); return { x, y }; };
  const walk = (rules) => {
    for (const r of rules) {
      if (r.cssRules && !(r instanceof CSSKeyframesRule) && !r.selectorText) { walk(r.cssRules); continue; }
      if (r instanceof CSSKeyframesRule) {
        const moves = [...r.cssRules].some((k) => /translateX\(\s*-?[1-9]|translate\(\s*-?[1-9]|translate3d\(\s*-?[1-9]/.test(k.style.transform || '') || /^-?[1-9]/.test(k.style.translate || '') || k.style.left || k.style.right);
        if (moves) res.keyframes.push(r.name);
        continue;
      }
      if (!r.style) continue;
      res.rules++;
      const st = r.style, sel = r.selectorText || '';
      if (LOGICAL.test(r.cssText)) res.logicalRules++;
      const hits = [];
      for (const [a, b] of [['margin-left', 'margin-right'], ['padding-left', 'padding-right'], ['border-left-width', 'border-right-width']]) {
        const { x, y } = pair(st, a, b);
        if ((x || y) && x !== y) hits.push(x && y ? `${a}:${x}/${b}:${y}` : x ? `${a}:${x}` : `${b}:${y}`);
      }
      const L = st.getPropertyValue('left'), R = st.getPropertyValue('right');
      if ((L || R) && L !== R) hits.push(L && R ? `left:${L}/right:${R}` : L ? `left:${L}` : `right:${R}`);
      for (const [a, b] of [['border-top-left-radius', 'border-top-right-radius'], ['border-bottom-left-radius', 'border-bottom-right-radius']]) {
        const { x, y } = pair(st, a, b); if ((x || y) && x !== y) hits.push(`${a}:${x || '—'}/${b}:${y || '—'}`);
      }
      const ta = st.getPropertyValue('text-align'); if (/^(left|right)$/.test(ta) && !(ta === 'right' && /num|amount|price|money|currency|qty|quantity|total|figure|digit/i.test(sel))) hits.push(`text-align:${ta}`); // numbers align right in both directions (multilingual.md §2a)
      const fl = st.getPropertyValue('float'); if (/^(left|right)$/.test(fl)) hits.push(`float:${fl}`);
      const tf = st.getPropertyValue('transform'); if (/translateX\(\s*-?[1-9]|translate\(\s*-?[1-9]/.test(tf)) res.transformsX.push(`${sel} { transform: ${tf} }`);
      const bs = st.getPropertyValue('box-shadow'); if (bs && bs.split(/,(?![^(]*\))/).some((s) => /^(inset\s+)?-?[1-9][\d.]*px/.test(s.trim()) || /\)\s+-?[1-9][\d.]*px\s+-?[\d.]+/.test(s))) res.shadowsX++;
      if (!hits.length) continue;
      if (RTLSEL.test(sel)) res.overrideRules++;
      else res.physicalRules.push({ selector: sel.slice(0, 80), props: hits.join('; ') });
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { res.crossOrigin++; } }
  return res;
}

// ---------------------------------------------------------------- in-page: element records for the mirror diff
export function snapshot() {
  const W = document.documentElement.clientWidth;
  const out = [];
  let i = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (!el.dataset.rtlcI) el.dataset.rtlcI = String(i); i++;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'contents' || /inset\(50%\)/.test(cs.clipPath)) continue;
    const m = cs.transform !== 'none' ? cs.transform.match(/matrix\(([^)]+)\)/) : null;
    const tx = m ? parseFloat(m[1].split(',')[4]) : 0, sx = m ? parseFloat(m[1].split(',')[0]) : 1;
    out.push({ i: el.dataset.rtlcI, tag: el.tagName.toLowerCase(), display: cs.display, left: r.left, right: r.right, W,
      ml: cs.marginLeft, mr: cs.marginRight, pl: cs.paddingLeft, pr: cs.paddingRight, bl: cs.borderLeftWidth, br: cs.borderRightWidth,
      pos: cs.position, L: cs.left, R: cs.right, ta: cs.textAlign, taBlock: getComputedStyle(el.closest('td,th,p,div,li') || el).textAlign, fl: cs.cssFloat, tx, sx, dir: cs.direction,
      ltrIsland: !!el.closest('[dir=ltr]') && el.closest('[dir=ltr]') !== document.documentElement,
      text: [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ? el.textContent.trim().slice(0, 30) : '' });
  }
  return out;
}

// ---------------------------------------------------------------- in-page: icons
export function findIcons() {
  const CLS = /(^|\s)(icon|fa[srlbd]?|bi|ph|material-(icons|symbols)[\w-]*|lucide|feather|mdi|glyphicon|ti|ri)(-|\s|$)/i;
  const nameOf = (el) => {
    const bits = [el.getAttribute('data-icon'), el.getAttribute('data-lucide'), el.getAttribute('data-feather'), el.getAttribute('name'), el.getAttribute('class')];
    const use = el.querySelector && el.querySelector('use'); if (use) bits.push(use.getAttribute('href') || use.getAttribute('xlink:href'));
    if (el.tagName === 'IMG') bits.push(el.getAttribute('src'), el.getAttribute('alt'));
    if (/material/i.test(el.className?.baseVal ?? el.className ?? '')) bits.push(el.textContent);
    return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  };
  const ctxOf = (el) => { const c = el.closest('a,button,[role=button],[role=link],[role=tab]'); if (!c) return ''; return (c.getAttribute('aria-label') || c.getAttribute('title') || c.textContent || '').trim().slice(0, 40) + (c.getAttribute('rel') ? ` rel=${c.getAttribute('rel')}` : ''); };
  const flipOf = (el) => { let sx = 1; for (let p = el, k = 0; p && k < 4; p = p.parentElement, k++) { const cs = getComputedStyle(p); const m = cs.transform.match(/matrix\(([^)]+)\)/); if (m && parseFloat(m[1].split(',')[0]) < 0) sx *= -1; if (cs.scale && cs.scale !== 'none' && parseFloat(cs.scale) < 0) sx *= -1; } return sx < 0; };
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('svg, i, span, img, [data-icon]')) {
    if (seen.has(el) || (el.tagName.toLowerCase() === 'svg' && el.parentElement?.closest('svg'))) continue;
    const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6 || r.width > 64 || r.height > 64) continue;
    const isIcon = el.tagName.toLowerCase() === 'svg' || el.hasAttribute('data-icon') || CLS.test(el.getAttribute('class') || '') || (el.tagName === 'IMG' && /icon|arrow|chevron/i.test(el.src));
    if (!isIcon) continue;
    seen.add(el);
    el.dataset.rtlcIcon = String(out.length);
    const island = el.closest('[dir=ltr]');
    out.push({ k: out.length, name: nameOf(el).slice(0, 80), context: ctxOf(el), flipped: flipOf(el), dir: getComputedStyle(el).direction,
      ltrIsland: !!island && island !== document.documentElement, x: r.left, y: r.top, w: r.width, h: r.height });
  }
  return out;
}

// the classifier and its name lists live in lib/icon-classify.mjs (generated from Codex, Flutter, Material, Firefox)
export { classifyIcon };

// ---------------------------------------------------------------- in-page: static checks on the RTL render
export function staticChecks(opts = {}) {
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const sel = (el) => { if (el.id) return '#' + el.id; const c = [...el.classList].filter((x) => !x.startsWith('rtlc')).slice(0, 2).join('.'); return el.tagName.toLowerCase() + (c ? '.' + c : ''); };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
  const res = { align: [], tracking: [], italic: [], scrambled: [], ltrInputs: [], drawers: [], htmlDir: document.documentElement.dir || null, bodyDir: document.body.getAttribute('dir') };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seenEl = new Set();
  const tokens = (t) => { const out = []; const re = /[A-Za-z0-9٠-٩]+|[^\sA-Za-z0-9٠-٩؀-ۿ]/g; let m; while ((m = re.exec(t))) out.push({ t: m[0], i: m.index }); return out; };
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent; if (!t.trim()) continue;
    const el = n.parentElement; if (!el || el.closest('script,style,noscript,svg') || !vis(el)) continue;
    const cs = getComputedStyle(el);
    if (!seenEl.has(el)) {
      seenEl.add(el);
      const hidden = el.getBoundingClientRect().width <= 2 || /inset\(50%\)/.test(cs.clipPath) || cs.clip === 'rect(0px, 0px, 0px, 0px)';
      if (cs.direction === 'rtl' && cs.textAlign === 'left' && !/inline/.test(cs.display) && !hidden && /\p{L}/u.test(t)) res.align.push(sel(el));
      if (AR.test(t)) {
        const ls = parseFloat(cs.letterSpacing); const fs = parseFloat(cs.fontSize);
        if (ls && Math.abs(ls / fs) >= 0.01) res.tracking.push(`${sel(el)} (${(ls / fs).toFixed(3)}em)`);
        if (cs.fontStyle !== 'normal') res.italic.push(`${sel(el)} (${cs.fontStyle})`);
      }
    }
    // scrambled LTR data: no Arabic letters, several tokens, laid out in an RTL paragraph
    const blockDir = getComputedStyle(el.closest('p,div,td,th,li,span,label,a,button,dd,dt,h1,h2,h3,h4,h5,h6,section,article') || el).direction;
    const dataLike = /^(?=.*\d)\s*[+\-−]?\s*[$€£¥]?[\d\s().,:%+\-−/]+\s*$|\S+@\S+\.\S+|^\s*(https?:\/\/|www\.)|^\s*[A-Z]{2}\d{2}[\d\sA-Z]{8,}$|\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(t);
    if (blockDir === 'rtl' && !AR.test(t) && !/[֐-׿]/.test(t) && /[0-9A-Za-z]/.test(t) && (dataLike || !opts.flip)) {
      const toks = tokens(t); if (toks.length < 2) continue;
      const bx = toks.map(({ t: s, i }) => { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + s.length); const b = r.getBoundingClientRect(); return { x: b.left, top: b.top, bottom: b.bottom, rects: r.getClientRects().length }; });
      // Order is only meaningful within one line box: a wrapped phrase puts later words on a lower line, further LEFT in
      // an RTL block. Group tokens by line (vertical centre within half a line of the line's first token), then compare
      // visual and logical order line by line. opts.legacyBidi reproduces the first version (one sort over the whole node).
      let groups;
      if (opts.legacyBidi) groups = [toks.map((_, k) => k)];
      else {
        groups = [];
        const byY = toks.map((_, k) => k).filter((k) => bx[k].rects === 1).sort((a, b) => (bx[a].top + bx[a].bottom) - (bx[b].top + bx[b].bottom) || a - b);
        for (const k of byY) {
          const c = (bx[k].top + bx[k].bottom) / 2, g = groups[groups.length - 1];
          if (g && Math.abs(c - g.c) < Math.max(4, (bx[g.ks[0]].bottom - bx[g.ks[0]].top) / 2)) g.ks.push(k); else groups.push({ c, ks: [k] });
        }
        groups = groups.map((g) => g.ks.sort((a, b) => a - b));
      }
      for (const ks of groups) {
        if (ks.length < 2) continue;
        const order = ks.map((k) => [bx[k].x, k]).sort((a, b) => a[0] - b[0]).map(([, k]) => k);
        if (order.every((k, j) => k === ks[j])) continue;
        const alnum = order.filter((k) => /[0-9A-Za-z]/.test(toks[k].t));
        const alnumInOrder = alnum.every((k, j) => j === 0 || k > alnum[j - 1]);
        const lineText = t.slice(toks[ks[0]].i, toks[ks[ks.length - 1]].i + toks[ks[ks.length - 1]].t.length);
        res.scrambled.push({ where: sel(el), text: (groups.length > 1 ? lineText : t.trim()).slice(0, 40), shown: order.map((k) => toks[k].t).join(' '), punctuationOnly: alnumInOrder && !dataLike, lines: groups.length });
        break; // one report per text node
      }
    }

  }
  // inputs holding LTR data that resolve to RTL
  for (const inp of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea')) {
    if (!vis(inp) || !inp.matches(':dir(rtl)')) continue;
    const v = inp.value || '';
    const dataType = /^(email|url|tel)$/.test(inp.type) || /email|tel|url|cc-number|username|iban/i.test(inp.autocomplete || '') || /email|phone|mobile|iban|url|website/i.test(inp.name + ' ' + inp.id);
    const ltrValue = v && !AR.test(v) && /[0-9A-Za-z]/.test(v);
    let scrambled = false;
    if (ltrValue) {
      const p = document.createElement('div'); p.dir = 'rtl'; p.style.cssText = 'position:absolute;top:-9999px;white-space:pre'; p.textContent = v; document.body.append(p);
      const tn = p.firstChild; const toks = tokens(v);
      const xs = toks.map(({ t: s, i }) => { const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + s.length); return r.getBoundingClientRect().left; });
      scrambled = !xs.map((x, k) => [x, k]).sort((a, b) => a[0] - b[0]).every(([, k], j) => k === j); p.remove();
    }
    if (scrambled || dataType) res.ltrInputs.push({ field: sel(inp), type: inp.type, value: v.slice(0, 30), scrambled });
  }
  // off-canvas panels in RTL parked off the left edge
  const W = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('nav, aside, dialog, [role=dialog], [class*=drawer], [class*=offcanvas], [class*=sidebar], [class*=sheet], [class*=side-menu]')) {
    const cs = getComputedStyle(el); if (!/fixed|absolute/.test(cs.position)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 120 || r.height < 120) continue;
    if (r.right <= 1) res.drawers.push({ panel: sel(el), side: 'left', note: 'parked off the LEFT edge' });
    else if (r.left >= W - 1) res.drawers.push({ panel: sel(el), side: 'right', note: 'parked off the right edge' });
  }
  return res;
}

// ---------------------------------------------------------------- arrow keys (Node side, drives the page)
async function arrowKeys(page) {
  const groups = await page.evaluate(() => [...document.querySelectorAll('[role=tablist], [role=toolbar], [role=radiogroup], [role=menubar]')]
    .filter((g) => getComputedStyle(g).direction === 'rtl' && g.getAttribute('aria-orientation') !== 'vertical' && g.getBoundingClientRect().width > 0)
    .slice(0, 6).map((g, k) => { g.dataset.rtlcG = String(k); return { k, role: g.getAttribute('role'), label: g.getAttribute('aria-label') || '' }; }));
  const out = [];
  for (const g of groups) {
    const start = await page.evaluate((k) => {
      const g = document.querySelector(`[data-rtlc-g="${k}"]`);
      const items = [...g.querySelectorAll('[role=tab], [role=radio], [role=menuitem], button, a[href], input[type=radio]')].filter((e) => e.getBoundingClientRect().width > 0);
      const cur = items[Math.floor(items.length / 2)]; // start mid-row, so a wrap-around cannot pass for the right move
      if (!cur) return null; cur.focus(); const r = cur.getBoundingClientRect(); return { x: r.left + r.width / 2, n: items.length };
    }, g.k);
    if (!start || start.n < 2) continue;
    await page.keyboard.press('ArrowLeft');
    const after = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2 }; });
    const moved = Math.abs(after.x - start.x) > 2;
    out.push({ group: `${g.role} "${g.label}"`, arrowLeftMoves: !moved ? 'nowhere' : after.x < start.x ? 'left (correct)' : 'right (backwards)' });
  }
  return out;
}

// ---------------------------------------------------------------- icon pixels
function decode(buf) { return PNG.sync.read(buf); }
function compareIcon(a, b) {
  // ink = pixels that differ from the capture's background (its corner pixel); each capture is then cropped to its
  // ink box so sub-pixel placement cannot pass for a mirror, and compared as coarse density grids.
  const ink = (p) => { const bg = [p.data[0], p.data[1], p.data[2]]; const m = new Uint8Array(p.width * p.height); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) { const i = (y * p.width + x) * 4;
      if (Math.abs(p.data[i] - bg[0]) + Math.abs(p.data[i + 1] - bg[1]) + Math.abs(p.data[i + 2] - bg[2]) > 45) { m[y * p.width + x] = 1; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
    if (x1 < 0) return null; const w = x1 - x0 + 1, h = y1 - y0 + 1, c = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c[y * w + x] = m[(y + y0) * p.width + x + x0];
    return { w, h, c }; };
  const A = ink(a), B = ink(b);
  if (!A || !B) return 'empty';
  if (Math.abs(A.w - B.w) > 3 || Math.abs(A.h - B.h) > 3) return 'changed';
  // coarse 8×8 ink-density grids: sub-pixel anti-aliasing washes out, shape asymmetry (a "?", an arrowhead) stays
  const G = 8, grid = (P, mirror) => { const g = new Float64Array(G * G); for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { if (!P.c[y * P.w + x]) continue; const xx = mirror ? P.w - 1 - x : x; g[Math.min(G - 1, Math.floor((y / P.h) * G)) * G + Math.min(G - 1, Math.floor((xx / P.w) * G))]++; } const t = g.reduce((u, v) => u + v, 0) || 1; return g.map((v) => v / t); };
  const dist = (X, Y) => X.reduce((u, v, i) => u + Math.abs(v - Y[i]), 0) / 2;
  const gA = grid(A, false), gAm = grid(A, true), gB = grid(B, false);
  const selfSym = dist(gA, gAm), same = dist(gA, gB), mir = dist(gAm, gB);
  if (process.env.RTLC_DEBUG) console.error('  icon dist', { selfSym: +selfSym.toFixed(3), same: +same.toFixed(3), mir: +mir.toFixed(3) });
  if (selfSym < 0.03) return 'symmetric';
  if (mir < Math.min(0.06, same * 0.6)) return 'mirrored';
  if (same < Math.min(0.06, mir * 0.6)) return 'same';
  return 'changed';
}
async function iconShots(page, icons) {
  const shots = {};
  // only icons paint while they are captured: neighbouring text and fills cannot leak into the comparison
  const tag = await page.addStyleTag({ content: 'body * { visibility: hidden !important } [data-rtlc-icon], [data-rtlc-icon] * { visibility: visible !important }' });
  for (const ic of icons) {
    try { const h = await page.$(`[data-rtlc-icon="${ic.k}"]`); if (!h) continue; const box = await h.boundingBox(); if (!box || box.x + box.width < 0 || box.x > 5000) continue; shots[ic.k] = decode(await h.screenshot({ animations: 'disabled' })); } catch { /* off-screen or detached */ }
  }
  await tag.evaluate((t) => t.remove());
  return shots;
}

// ---------------------------------------------------------------- main
export async function check(browser, url, { flip = false, width = 1280, legacy = false } = {}) {
  // legacy: the first version's bidi order (one sort per text node), glyph clip edges (scrollers not unrolled) and icon
  // lists (hand-written regexes), for the before/after runs in run.mjs
  const classify = legacy ? classifyIconLegacy : classifyIcon;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  const findings = [];
  const add = (level, check, message, examples = []) => findings.push({ level, check, message, count: examples.length || undefined, examples: examples.slice(0, 60) });
  let mirror = null, iconVerdicts = [];
  const css = await page.evaluate(cssScan);
  if (flip) {
    const A = await page.evaluate(snapshot);
    const iconsA = await page.evaluate(findIcons);
    const shotsA = await iconShots(page, iconsA);
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; if (document.body.getAttribute('dir') === 'ltr') document.body.removeAttribute('dir'); });
    await page.waitForTimeout(100);
    const B = Object.fromEntries((await page.evaluate(snapshot)).map((r) => [r.i, r]));
    const iconsB = await page.evaluate(findIcons);
    const shotsB = await iconShots(page, iconsB);
    // boxes
    const failing = new Set(); const kept = new Map(); const off = new Map();
    for (const a of A) {
      const b = B[a.i]; if (!b || b.ltrIsland || b.display === 'inline' && !['svg', 'img'].includes(b.tag)) continue;
      if (a.taBlock === 'right' && b.taBlock === 'right') continue; // deliberately right-aligned in both (numeric cells)
      const expectLeft = a.W - a.right;
      if (Math.abs(b.left - expectLeft) > 2 && Math.abs(b.right - b.left - (a.right - a.left)) < 2) { failing.add(a.i); off.set(a.i, Math.round(Math.abs(b.left - expectLeft))); }
      const why = [];
      for (const [l, r, name] of [['ml', 'mr', 'margin'], ['pl', 'pr', 'padding'], ['bl', 'br', 'border']]) if (a[l] !== a[r] && b[l] === a[l] && b[r] === a[r]) why.push(`${name}-left ${a[l]} / right ${a[r]}`);
      // a physical reset of a UA logical default (ul { padding-left: 0 } over padding-inline-start: 40px) leaks on the other side in RTL
      for (const [l, r, name] of [['ml', 'mr', 'margin'], ['pl', 'pr', 'padding']]) if (a[l] === a[r] && b[l] !== b[r]) why.push(`RTL adds ${name}: left ${b[l]} / right ${b[r]} (a physical reset of a logical default)`);
      if (a.pos !== 'static' && a.L !== a.R && b.L === a.L && b.R === a.R) why.push(`left ${a.L} / right ${a.R}`);
      if (a.ta === 'left' && b.ta === 'left' && a.text && !/^[\d\s.,%+\-−٠-٩٫٬]+$/.test(a.text)) why.push('text-align left');
      if (a.fl !== 'none' && b.fl === a.fl) why.push(`float ${a.fl}`);
      if (Math.abs(a.tx) > 0.5 && b.tx === a.tx) why.push(`translateX ${a.tx}px`);
      if (why.length) kept.set(a.i, { el: `${a.tag}${a.text ? ` "${a.text}"` : ''}`, why: why.join(', ') });
    }
    const parentOf = await page.evaluate(() => Object.fromEntries([...document.body.querySelectorAll('[data-rtlc-i]')].map((e) => [e.dataset.rtlcI, e.parentElement?.dataset.rtlcI ?? null])));
    const descr = await page.evaluate(() => Object.fromEntries([...document.body.querySelectorAll('[data-rtlc-i]')].map((e) => [e.dataset.rtlcI, e.id ? '#' + e.id : e.tagName.toLowerCase() + ([...e.classList].filter((c) => !c.startsWith('rtlc')).slice(0, 2).map((c) => '.' + c).join(''))])));
    const roots = [...failing].filter((i) => !failing.has(parentOf[i]));
    mirror = { checked: A.length, notMirrored: failing.size, roots: roots.length, keptPhysical: kept.size };
    const reason = (i) => kept.get(i) ? ` — ${kept.get(i).why}` : kept.get(parentOf[i]) ? ` — parent ${descr[parentOf[i]]}: ${kept.get(parentOf[i]).why}` : '';
    // a box more than 8 px from its mirrored place is visibly wrong; 3–8 px is an asymmetry to look at (often a partial
    // [dir=rtl] override that adds the new side without resetting the old one)
    const far = roots.filter((i) => legacy || off.get(i) > 8), near = roots.filter((i) => !legacy && off.get(i) <= 8); // legacy: every root FAILs
    if (far.length) add('FAIL', 'mirror', 'Boxes that do not mirror when the page turns RTL (topmost only; > 8 px from the mirrored place)', far.map((i) => `${descr[i]} (${off.get(i)} px off)${reason(i)}`));
    if (near.length) add('WARN', 'mirror', 'Boxes 3–8 px from their mirrored place in RTL (topmost only)', near.map((i) => `${descr[i]} (${off.get(i)} px off)${reason(i)}`));
    const keptList = [...kept.entries()].map(([i, k]) => `${descr[i]}: ${k.why}`);
    if (keptList.length) add('WARN', 'mirror', 'Physical values that stay the same in RTL (computed styles, LTR vs RTL render)', keptList);
    // icons by pixels
    for (const ic of iconsA) {
      const a = shotsA[ic.k], b = shotsB[ic.k]; if (!a || !b) continue;
      const verdict = compareIcon(a, b), c = classify(ic.name, ic.context), icB = iconsB[ic.k] || ic;
      iconVerdicts.push({ name: ic.name, class: c.class, strength: c.strength, sources: c.sources, family: c.family, note: c.note, pixels: verdict, context: ic.context, island: icB.ltrIsland });
    }
    const lbl = (v) => `${v.name}${v.context ? ` in "${v.context}"` : ''}${v.sources ? ` [${v.sources.join('+')}]` : ''}`;
    const dirNot = iconVerdicts.filter((v) => v.class === 'directional' && v.pixels === 'same' && !v.island);
    const neverYes = iconVerdicts.filter((v) => v.class === 'never' && v.pixels === 'mirrored');
    for (const [lvl, st] of [['FAIL', 'strong'], ['WARN', 'weak']]) {
      const d = dirNot.filter((v) => v.strength === st), n = neverYes.filter((v) => v.strength === st);
      if (d.length) add(lvl, 'icons', `Directional icons that do not mirror${st === 'weak' ? ' (one source mirrors this name)' : ''}`, d.map(lbl));
      if (n.length) add(lvl, 'icons', `Icons that must not mirror but do (${st === 'strong' ? 'checks, media, circular time, search' : 'one source: calendar, edit, keyboard, camera'})`, n.map(lbl));
    }
    const amb = iconVerdicts.filter((v) => v.class === 'ambiguous');
    if (amb.length) add('INFO', 'icons', 'Icons the sources disagree on — record the decision (mirrored here: yes/no)', amb.map((v) => `${v.name}: ${v.pixels} — ${v.note || ''}`));
  } else {
    // static: flipped state from transforms, semantics from the control's label
    const icons = await page.evaluate(findIcons);
    for (const ic of icons) {
      const c = classify(ic.name, ic.context);
      if (ic.ltrIsland ? c.class !== 'never' : ic.dir !== 'rtl') continue; // a media player kept LTR still must not flip its icons
      iconVerdicts.push({ name: ic.name, class: c.class, strength: c.strength, sources: c.sources, family: c.family, note: c.note, flipped: ic.flipped, context: ic.context });
    }
    const lbl = (v) => `${v.name}${v.context ? ` in "${v.context}"` : ''}${v.sources ? ` [${v.sources.join('+')}]` : ''}`;
    const pointing = (v) => { const side = /right|forward|next|end/i.test(v.name) ? 'right' : /left|back|prev|start/i.test(v.name) ? 'left' : null; if (!side) return null; return v.flipped ? (side === 'right' ? 'left' : 'right') : side; };
    // what the control does, from its label (English and Arabic): forward actions must point left in RTL, backward ones right
    const FWD = legacy ? /next|التالي|forward|continue|متابعة|تقدم|rel=next|save|حفظ|submit/i : /\bnext\b|التالي|التالى|forward|continue|proceed|متابعة|تابع|استمر|أكمل|اكمل|المزيد|اقرأ|read more|learn more|see all|view all|عرض الكل|get started|ابدأ|rel=next|\bsave\b|حفظ|submit|إرسال|ارسال|أرسل|\bsend\b/i;
    const BWD = legacy ? /prev|السابق|back|رجوع|عودة|rel=prev/i : /\bprev|السابق|\bback\b|رجوع|عودة|العودة|ارجع|الرجوع|للخلف|rel=prev/i;
    const wrongWay = iconVerdicts.filter((v) => {
      if (v.class !== 'directional') return false;
      const p = pointing(v); if (!p) return false;
      if (FWD.test(v.context)) return p === 'right';
      if (BWD.test(v.context)) return p === 'left';
      return false;
    });
    if (wrongWay.length) add('FAIL', 'icons', 'Arrows that point against the RTL reading direction for their action', wrongWay.map((v) => `${v.name} in "${v.context}"`));
    for (const [lvl, st] of [['FAIL', 'strong'], ['WARN', 'weak']]) {
      const n = iconVerdicts.filter((v) => v.class === 'never' && v.strength === st && v.flipped);
      if (n.length) add(lvl, 'icons', `Icons that must not mirror but are flipped (${st === 'strong' ? 'checks, media, circular time, search' : 'one source: calendar, edit, keyboard, camera'})`, n.map(lbl));
    }
    const unflippedDir = iconVerdicts.filter((v) => v.class === 'directional' && !v.flipped && !wrongWay.includes(v));
    if (unflippedDir.length) add('WARN', 'icons', 'Directional icons with no flip in RTL — confirm each points the reading way (or was swapped for its mirror)', unflippedDir.map(lbl));
    const amb = iconVerdicts.filter((v) => v.class === 'ambiguous');
    if (amb.length) add('INFO', 'icons', 'Icons the sources disagree on — record the decision', amb.map((v) => `${v.name}: ${v.flipped ? 'flipped' : 'not flipped'} — ${v.note || ''}`));
  }
  // CSS findings
  if (css.physicalRules.length) add(flip ? 'WARN' : 'INFO', 'css', `Rules with physical inline-axis values (${css.physicalRules.length} of ${css.rules} rules; ${css.overrideRules} RTL overrides; ${css.logicalRules} rules use logical properties${css.crossOrigin ? `; ${css.crossOrigin} cross-origin sheets not read` : ''})`, css.physicalRules.map((r) => `${r.selector} { ${r.props} }`));
  if (css.keyframes.length) add('WARN', 'css', 'Keyframes that move along x — give them an RTL variant or a direction variable', css.keyframes);
  if (css.transformsX.length) add('INFO', 'css', 'Transforms with an x translation (drawers, slides): transforms never flip with dir', css.transformsX);
  if (css.shadowsX) add('INFO', 'css', `${css.shadowsX} box-shadows with an x offset: decide whether the light source mirrors (Material: elevation shadows fall straight down)`);
  // static rendered checks on the RTL state
  const st = await page.evaluate(staticChecks, { flip, legacyBidi: legacy });
  if (!st.htmlDir && st.bodyDir === 'rtl') add('WARN', 'structure', 'dir="rtl" is on <body>, not <html>: the root, scrollbars and anything outside body stay LTR');
  if (st.align.length) add('FAIL', 'align', 'text-align: left inside RTL text', st.align);
  if (st.tracking.length) add('FAIL', 'arabic', 'Letter-spacing on Arabic text (breaks or spaces the joins)', st.tracking);
  if (st.italic.length) add('FAIL', 'arabic', 'Italic/oblique on Arabic text (synthesised slant; use weight or colour)', st.italic);
  const scr = st.scrambled.filter((s) => !s.punctuationOnly), punct = st.scrambled.filter((s) => s.punctuationOnly);
  if (scr.length) add('FAIL', 'bidi', 'LTR data shown in scrambled order in RTL text — wrap in <bdi dir="ltr"> or format with Intl', scr.map((s) => `${s.where}: "${s.text}" reads as "${s.shown}"`));
  if (punct.length) add('WARN', 'bidi', 'LTR phrases in RTL text without dir/lang: their punctuation jumps to the other end', punct.map((s) => `${s.where}: "${s.text}"`));
  const badInputs = st.ltrInputs.filter((i) => i.scrambled);
  if (badInputs.length) add('FAIL', 'bidi', 'Inputs whose LTR value is laid out in scrambled order (dir="ltr" on the field, aligned with the form)', badInputs.map((i) => `${i.field} [${i.type}] "${i.value}"`));
  const rtlData = st.ltrInputs.filter((i) => !i.scrambled);
  if (rtlData.length) add('WARN', 'bidi', 'Email/phone/URL/IBAN fields that inherit RTL: values starting with digits or ending in punctuation will scramble', rtlData.map((i) => `${i.field} [${i.type}]`));
  const leftDrawers = st.drawers.filter((d) => d.side === 'left');
  if (leftDrawers.length) add('FAIL', 'drawers', 'Off-canvas panels parked off the LEFT edge in RTL: they slide in from the wrong side', leftDrawers.map((d) => d.panel));
  const glyphs = await page.evaluate(glyphClipProbe, { scripts: 'arabic', scrollAware: !legacy });
  if (glyphs.clipped.length) add('FAIL', 'arabic', `Arabic glyphs cut by a clipping box (${glyphs.clipped.length} of ${glyphs.checked} clipped text runs)`, glyphs.clipped.map((g) => `${g.selector} in ${g.clipper}${g.scroller ? ' (scroller)' : ''}: top ${g.topPx}px, bottom ${g.bottomPx}px cut (${g.font}, line-height ${g.lineHeight}) "${g.text}"`));
  const keys = await arrowKeys(page);
  const back = keys.filter((k) => k.arrowLeftMoves.startsWith('right'));
  if (back.length) add('FAIL', 'keys', 'Arrow keys run backwards in RTL: ArrowLeft moves focus to the right', back.map((k) => k.group));
  await ctx.close();
  const summary = { FAIL: findings.filter((f) => f.level === 'FAIL').length, WARN: findings.filter((f) => f.level === 'WARN').length, INFO: findings.filter((f) => f.level === 'INFO').length };
  return { url, mode: flip ? 'flip' : 'as-served', width, summary, mirror, css: { rules: css.rules, physicalRules: css.physicalRules.length, overrideRules: css.overrideRules, logicalRules: css.logicalRules }, keys, icons: iconVerdicts, findings };
}

export function print(r) {
  const lines = [`\n${r.mode === 'flip' ? 'FLIP' : 'RTL'} ${r.url} @${r.width}: ${r.summary.FAIL} fail, ${r.summary.WARN} warn, ${r.summary.INFO} info`];
  for (const f of r.findings) { lines.push(`  ${f.level.padEnd(4)} [${f.check}] ${f.message}${f.count ? ` (${f.count})` : ''}`); for (const e of f.examples.slice(0, 12)) lines.push(`         · ${e}`); if (f.examples.length > 12) lines.push(`         … ${f.examples.length - 12} more`); }
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2); const url = args.find((a) => !a.startsWith('--') && /^https?:|^file:/.test(a));
  if (!url) { console.error('usage: node rtl-check.mjs <url> [--flip] [--width 1280] [--out file.json]'); process.exit(2); }
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const { browser } = await launch();
  const r = await check(browser, url, { flip: args.includes('--flip'), width: Number(get('--width')) || 1280 });
  await browser.close();
  if (get('--out')) { await mkdir(path.dirname(get('--out')), { recursive: true }); await writeFile(get('--out'), JSON.stringify(r, null, 1)); }
  console.log(print(r));
  process.exit(r.summary.FAIL ? 1 : 0);
}
