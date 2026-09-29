#!/usr/bin/env node
/**
 * Width sweep: every width from 320 to 1920 (and the 200% / 400% zoom equivalents), one page load per device
 * class, the viewport resized in place. For each width it measures what breaks between the widths a capture run
 * looks at, then merges the findings into width ranges and draws a contact sheet of the worst widths.
 *
 *   node sweep.mjs --url http://localhost:3000/pricing
 *   node sweep.mjs --base http://localhost:3000 --paths / /pricing [--from 320 --to 1920 --step 8,16] [--out sweep]
 *
 * Options
 *   --step a[,b]    px between widths: a below 1024, b from 1024 up (default 8,16 → about 190 widths)
 *   --widths list   explicit widths instead of a range
 *   --height N      viewport height for every width (default: 740 below 600, 960 below 1024, 800 above — the fold)
 *   --device d      auto (default: phone emulation — touch, mobile viewport — below 768, desktop from 768),
 *                   desktop or mobile for every width
 *   --no-zoom       skip the zoom equivalents: 1280×720 at 200% (640×360) and 400% (320×180), desktop, not touch
 *   --measure a,b   characters per line allowed in running text (default 20,90)
 *   --cta sel       the primary call to action (default: the first button-like link or button in <main>)
 *   --sheet N       widths in the contact sheet (default 6); --crops N  1:1 crops of the worst findings (default 12)
 *   --settle ms     longest wait for the layout to stop changing after a resize (default 400)
 *   --storage seed.json, --chrome path   as in the other scripts
 *
 * Per width it checks (✗ = a defect at that width, △ = look at it, · = information):
 *   ✗ overflow      the page is wider than the viewport; the outermost culprits (lib/probes.mjs overflowCulprits)
 *   ✗ edge-cut      readable text past the viewport edge that no scroll reaches (a page-level clip)
 *   ✗ zoom-out      phone emulation only: the layout viewport widened — phones show the page zoomed out
 *   ✗ clipped       text cut by its own or an ancestor's overflow: hidden/clip (not a scroller)
 *   △ truncated     text shortened by an ellipsis or line clamp (✗ on a control, heading or nav item)
 *   ✗ overlap       text drawn over other text, or a control drawn over text
 *   △ measure       running text outside the characters-per-line range (--measure)
 *   △ nav-wrap      the primary navigation's items on more than one row; ✗ nav-overflow when an item leaves it
 *   △ label-wrap    a button or button-like link whose label wraps (at widths where it did not)
 *   △ small-target  a control under 24 px at this width but not at every width (squeezed)
 *   △ wide-control  a button wider than 480 px and 60% of a ≥ 768 px viewport
 *   ✗ distorted     an image drawn at an aspect ratio more than 4% off its own (object-fit: fill)
 *   △ cropped       object-fit/background cover showing less than half the image; △ upscaled > 1.5× (blurred)
 *   △ dead-band     a strip taller than max(360 px, 45% of the viewport) with no text, media or controls
 *   ✗ fold          the h1, or the primary CTA, below the fold here although above it at other widths
 *   △ chrome        fixed and sticky bars covering more than 30% of the viewport
 *   △ order         flex/grid children drawn in a different order than the DOM (reading and focus order)
 *   · layout        breakpoints: containers whose column count changes between adjacent widths, and
 *                   document-height jumps over 20% — capture both sides of each and look
 *
 * Writes <out>/<slug>.json (ranges, breakpoints, per-width counts, timings), <out>/<slug>.md, a contact sheet
 * <out>/<slug>-sheet.jpg (the worst widths, each scrolled to its worst finding, findings boxed and numbered) and
 * 1:1 crops <out>/<slug>-crops/*.png. Exit code 1 when any ✗ range is found.
 *
 * The measurements are leads, not verdicts: an intentional truncation, a decorative overlap or a deliberate
 * crop is reported too. Open the crop before fixing, and say which findings you dismissed and why.
 * Only CSS layout is exercised: hover/pointer media queries follow the device class, not the width.
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, asList, launch, open, settle, slugFor, urlFor } from './lib/env.mjs';
import { overflowCulprits } from './lib/probes.mjs';

export const SEV = { overflow: 'error', 'edge-cut': 'error', 'zoom-out': 'error', clipped: 'error', truncated: 'warn', overlap: 'error', measure: 'warn',
  'nav-wrap': 'warn', 'nav-overflow': 'error', 'label-wrap': 'warn', 'small-target': 'warn', 'wide-control': 'warn', distorted: 'error', cropped: 'warn',
  upscaled: 'warn', 'dead-band': 'warn', fold: 'error', chrome: 'warn', order: 'warn', layout: 'info', 'height-jump': 'info' };
const MARK = { error: '✗', warn: '△', info: '·' };
const WEIGHT = { error: 3, warn: 1, info: 0 };

/**
 * In-page probe: one pass over the rendered page at the current viewport. Self-contained (serialised by
 * page.evaluate). Returns findings with element ids stable across widths (data attributes set on first sight).
 */
export function layoutProbe(opts = {}) {
  const { measure = [20, 90], cta: ctaSel = null, track = true } = opts;
  const doc = document.documentElement, body = document.body;
  const vw = doc.clientWidth, vh = innerHeight, sy = scrollY, sx = scrollX;
  const W = (window.__sw ||= { next: 1, sel: new Map() });
  const idOf = (el) => { let id = el.__swid; if (!id) { id = el.__swid = W.next++; } return id; };
  const sel = (el) => {
    const id = idOf(el);
    if (W.sel.has(id)) return W.sel.get(id);
    const part = (e) => {
      if (e.id && !/\d{3,}/.test(e.id)) return `#${e.id}`;
      const cls = [...e.classList].filter((c) => !/^(css-|sc-|_|svelte-|astro-|is-|has-)|\d{3,}|:/.test(c)).slice(0, 2);
      let s = e.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
      const p = e.parentElement;
      if (p && !cls.length) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += `:nth-of-type(${same.indexOf(e) + 1})`; }
      return s;
    };
    const parts = [];
    for (let e = el; e && e !== body && e !== doc && parts.length < 4; e = e.parentElement) { const p = part(e); parts.unshift(p); if (p.startsWith('#')) break; }
    const s = parts.join(' > ');
    W.sel.set(id, s);
    return s;
  };
  const text = (el, n = 40) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const csCache = new Map();
  const cs = (el) => { let c = csCache.get(el); if (!c) { c = getComputedStyle(el); csCache.set(el, c); } return c; };
  const hiddenAnc = (el) => el.closest('[hidden], [inert], [aria-hidden="true"], dialog:not([open]), template');
  const visible = (el) => {
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e && e !== doc; e = e.parentElement) { const c = cs(e); if (c.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(c.clipPath)) return false; }
    return true;
  };
  const inFixed = (el) => { for (let e = el; e && e !== doc; e = e.parentElement) { const p = cs(e).position; if (p === 'fixed' || p === 'sticky') return p; } return null; };
  const box = (r) => ({ x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) });
  const findings = [];
  const add = (check, el, detail, r, extra = {}) => findings.push({ check, id: el ? idOf(el) : 0, sel: el ? sel(el) : '(page)', detail, box: r ? box(r) : el ? box(el.getBoundingClientRect()) : null, ...extra });

  // ---- text runs: one walk, reused by clip, overlap, measure and dead-band checks ----
  const runs = []; // { el, rects }
  const tw = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const rg = document.createRange();
  const elVis = new Map();
  for (let n = tw.nextNode(); n && runs.length < 6000; n = tw.nextNode()) {
    if (!n.data.trim()) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION)$/.test(el.tagName)) continue;
    let v = elVis.get(el);
    if (v === undefined) { v = !hiddenAnc(el) && visible(el) && cs(el).visibility === 'visible'; elVis.set(el, v); }
    if (!v) continue;
    rg.selectNodeContents(n);
    const rects = [...rg.getClientRects()].filter((q) => q.width > 0.5 && q.height > 0.5);
    if (rects.length) runs.push({ el, rects });
  }

  // ---- clipped and truncated text ----
  const clipSeen = new Set();
  const byEl = new Map();
  for (const r of runs) { const u = byEl.get(r.el) || { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity }; for (const q of r.rects) { u.l = Math.min(u.l, q.left); u.t = Math.min(u.t, q.top); u.r = Math.max(u.r, q.right); u.b = Math.max(u.b, q.bottom); } byEl.set(r.el, u); }
  const isControl = (e) => e.matches('a[href], button, [role=button], [role=tab], [role=link], summary, label, input, select');
  for (const [el, u] of byEl) {
    for (let p = el; p && p !== body && p !== doc; p = p.parentElement) {
      const c = cs(p);
      if (/auto|scroll/.test(c.overflowX) || /auto|scroll/.test(c.overflowY)) break; // a scroller: reachable
      const cx = c.overflowX === 'hidden' || c.overflowX === 'clip', cy = c.overflowY === 'hidden' || c.overflowY === 'clip';
      if (!cx && !cy) continue;
      const q = p.getBoundingClientRect();
      if (q.width <= 2 || q.height <= 2) break; // visually hidden wrapper
      const L = q.left + p.clientLeft, T = q.top + p.clientTop, R = L + p.clientWidth, B = T + p.clientHeight;
      const outX = cx && (u.r > R + 2 || u.l < L - 2), outY = cy && (u.b > B + 2 || u.t < T - 2);
      if (!outX && !outY) continue;
      const ell = c.textOverflow === 'ellipsis' || cs(el).textOverflow === 'ellipsis';
      const clamp = c.webkitLineClamp && c.webkitLineClamp !== 'none';
      const key = `${idOf(el)}`;
      if (clipSeen.has(key)) break;
      clipSeen.add(key);
      const lost = outX ? Math.round(Math.max(u.r - R, L - u.l)) : Math.round(Math.max(u.b - B, T - u.t));
      if ((ell && outX) || (clamp && outY)) {
        const strong = isControl(el) || el.closest('h1,h2,h3,h4,nav,th,button,a[href]');
        add('truncated', el, `"${text(el, 30)}" ${clamp ? 'line-clamped' : 'ellipsis'} (${lost}px hidden)`, el.getBoundingClientRect(), { sev: strong ? 'error' : 'warn' });
      } else add('clipped', el, `"${text(el, 30)}" cut ${lost}px by ${p === el ? 'its own' : sel(p)} overflow ${outX ? 'x' : 'y'}`, el.getBoundingClientRect());
      break;
    }
  }

  // ---- overlapping text (and controls drawn over text) ----
  {
    const CELL = 96, grid = new Map();
    const items = [];
    // The part of an element a reader can see: its box cut by every clipping ancestor (text hidden by a card's
    // overflow: hidden cannot overlap anything on screen).
    const clipCache = new Map();
    const clipOf = (el) => {
      if (!el || el === body || el === doc) return [-Infinity, -Infinity, Infinity, Infinity];
      if (clipCache.has(el)) return clipCache.get(el);
      const up = clipOf(el.parentElement);
      const c = cs(el);
      let out = up;
      if (c.overflowX !== 'visible' || c.overflowY !== 'visible') {
        const q = el.getBoundingClientRect();
        out = [c.overflowX !== 'visible' ? Math.max(up[0], q.left) : up[0], c.overflowY !== 'visible' ? Math.max(up[1], q.top) : up[1],
          c.overflowX !== 'visible' ? Math.min(up[2], q.right) : up[2], c.overflowY !== 'visible' ? Math.min(up[3], q.bottom) : up[3]];
      }
      clipCache.set(el, out);
      return out;
    };
    for (const r of runs) {
      if (inFixed(r.el)) continue;
      const [cl, ct, cr, cb] = clipOf(r.el.parentElement);
      for (const q of r.rects) {
        const it = { el: r.el, l: Math.max(q.left, cl), t: Math.max(q.top, ct), r: Math.min(q.right, cr), b: Math.min(q.bottom, cb), text: true };
        if (it.r - it.l > 1 && it.b - it.t > 1) items.push(it);
      }
    }
    for (const c of body.querySelectorAll('button, input:not([type=hidden]), select, textarea, [role=button]')) {
      if (inFixed(c) || hiddenAnc(c) || !visible(c)) continue;
      const q = c.getBoundingClientRect();
      items.push({ el: c, l: q.left, t: q.top, r: q.right, b: q.bottom, text: false });
    }
    items.forEach((it, i) => { for (let gx = Math.floor(it.l / CELL); gx <= Math.floor(it.r / CELL); gx++) for (let gy = Math.floor(it.t / CELL); gy <= Math.floor(it.b / CELL); gy++) { const k = gx + ',' + gy; (grid.get(k) || grid.set(k, []).get(k)).push(i); } });
    const done = new Set();
    let count = 0;
    for (const list of grid.values()) {
      for (let a = 0; a < list.length && count < 40; a++) for (let b = a + 1; b < list.length && count < 40; b++) {
        const A = items[list[a]], B = items[list[b]];
        if (A.el === B.el || (!A.text && !B.text) || A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const iw = Math.min(A.r, B.r) - Math.max(A.l, B.l), ih = Math.min(A.b, B.b) - Math.max(A.t, B.t);
        if (iw < 4 || ih < 4) continue;
        const area = iw * ih, minA = Math.min((A.r - A.l) * (A.b - A.t), (B.r - B.l) * (B.b - B.t));
        if (area < 0.25 * minA) continue;
        const [x, y] = idOf(A.el) < idOf(B.el) ? [A, B] : [B, A];
        const k = idOf(x.el) + ':' + idOf(y.el);
        if (done.has(k)) continue;
        done.add(k); count++;
        // Which one is painted on top: the element hit at the centre of the overlap.
        const hit = document.elementFromPoint(Math.max(A.l, B.l) + iw / 2, Math.max(A.t, B.t) + ih / 2);
        const top = hit && (x.el.contains(hit) || hit.contains(x.el)) ? x.el : hit && (y.el.contains(hit) || hit.contains(y.el)) ? y.el : null;
        const other = top === y.el ? x.el : y.el;
        add('overlap', top || x.el, `${!A.text || !B.text ? 'control over text' : 'text over text'}: "${text(top || x.el, 24)}" / ${sel(other)} "${text(other, 24)}"`,
          new DOMRect(Math.max(A.l, B.l), Math.max(A.t, B.t), iw, ih), { other: idOf(other), otherSel: sel(other) });
      }
    }
  }

  // ---- line length (running text) ----
  if (measure) {
    const [lo, hi] = measure;
    let n = 0;
    for (const el of body.querySelectorAll('p, li, dd, blockquote, figcaption')) {
      if (n > 300) break;
      if (el.querySelector('p, li, div, ul, ol, table') || hiddenAnc(el) || inFixed(el)) continue;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length < 60 || /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(t)) continue;
      if (!visible(el)) continue;
      n++;
      rg.selectNodeContents(el);
      const tops = [];
      for (const q of rg.getClientRects()) if (q.width > 1 && !tops.some((y) => Math.abs(y - q.top) < q.height * 0.5)) tops.push(q.top);
      const lines = Math.max(1, tops.length);
      const cpl = Math.round(t.length / lines);
      if (cpl > hi && (lines >= 2 || t.length > hi)) add('measure', el, `${cpl} characters per line (${lines} line${lines > 1 ? 's' : ''}) > ${hi}`);
      else if (cpl < lo && lines >= 3) add('measure', el, `${cpl} characters per line over ${lines} lines < ${lo} — a squeezed column`);
    }
  }

  // ---- primary navigation ----
  let headerH = null;
  {
    const header = body.querySelector('header, [role=banner]');
    if (header && visible(header)) headerH = Math.round(header.getBoundingClientRect().height);
    const nav = [...body.querySelectorAll('header nav, [role=banner] nav, nav, [role=navigation]')].find((n) => !hiddenAnc(n) && visible(n) && n.getBoundingClientRect().top + sy < 320);
    if (nav) {
      const items = [...nav.querySelectorAll('a[href], button')].filter((a) => !hiddenAnc(a) && visible(a) && !a.closest('[role=menu], ul ul, [aria-expanded="false"] + *'));
      if (items.length >= 2) {
        const rows = [];
        for (const a of items) { const q = a.getBoundingClientRect(); if (!rows.some((y) => Math.abs(y - q.top) < q.height * 0.6)) rows.push(q.top); }
        if (rows.length > 1) add('nav-wrap', nav, `${items.length} items on ${rows.length} rows`);
        const nr = nav.getBoundingClientRect();
        const out = items.filter((a) => { const q = a.getBoundingClientRect(); return q.right > vw + 1 || q.left < -1; });
        if (out.length) add('nav-overflow', out[0], `${out.length} nav item(s) past the viewport edge ("${text(out[0], 20)}")`);
      }
    }
  }

  // ---- controls: squeezed, wrapping labels, stretched ----
  const controls = [];
  for (const c of body.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]')) {
    if (hiddenAnc(c) || !visible(c) || controls.length > 600) continue;
    const c0 = cs(c);
    // Links inside running text are exempt (WCAG 2.5.8 inline exception): an inline link whose parent has its own text.
    if (c.tagName === 'A' && c0.display === 'inline' && [...(c.parentElement?.childNodes || [])].some((n) => n.nodeType === 3 && n.data.trim())) continue;
    const q = c.getBoundingClientRect();
    const buttonLike = c.matches('button, [role=button], input[type=submit], input[type=button]') ||
      (c.tagName === 'A' && ((c0.backgroundColor !== 'rgba(0, 0, 0, 0)' && c0.backgroundColor !== 'transparent') || parseFloat(c0.borderTopWidth) >= 1) && q.height >= 28);
    let lines = 1;
    if (buttonLike && (c.textContent || '').trim()) {
      rg.selectNodeContents(c);
      const tops = [];
      for (const r of rg.getClientRects()) if (r.width > 1 && !tops.some((y) => Math.abs(y - r.top) < r.height * 0.5)) tops.push(r.top);
      lines = Math.max(1, tops.length);
    }
    controls.push({ id: idOf(c), sel: sel(c), w: Math.round(q.width), h: Math.round(q.height), lines, buttonLike, box: box(q), label: text(c, 24) });
    if (buttonLike && vw >= 768 && q.width > 480 && q.width > 0.6 * vw) add('wide-control', c, `"${text(c, 24)}" ${Math.round(q.width)}px wide at a ${vw}px viewport`);
  }

  // ---- images: distortion, crop, upscaling ----
  const dpr = devicePixelRatio || 1;
  for (const img of body.querySelectorAll('img')) {
    if (hiddenAnc(img) || !img.naturalWidth || !visible(img)) continue;
    const q = img.getBoundingClientRect();
    if (q.width < 40 || q.height < 40) continue;
    const c = cs(img);
    const cw = q.width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight) - parseFloat(c.borderLeftWidth) - parseFloat(c.borderRightWidth);
    const ch = q.height - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom) - parseFloat(c.borderTopWidth) - parseFloat(c.borderBottomWidth);
    const nr = img.naturalWidth / img.naturalHeight, rr = cw / ch;
    const svg = /\.svg(\?|#|$)/i.test(img.currentSrc || img.src) || /^data:image\/svg/.test(img.src);
    const src = (img.currentSrc || img.src).split(/[?#]/)[0].split('/').pop().slice(0, 40);
    if (c.objectFit === 'fill' || c.objectFit === '') {
      const off = Math.abs(rr / nr - 1);
      if (off > 0.04) add('distorted', img, `${src} drawn at ${rr.toFixed(2)}:1, its own ratio is ${nr.toFixed(2)}:1 (${Math.round(off * 100)}% ${rr > nr ? 'stretched' : 'squashed'})`);
    } else if (c.objectFit === 'cover') {
      const shown = Math.min(rr / nr, nr / rr);
      if (shown < 0.5) add('cropped', img, `${src}: object-fit cover shows ${Math.round(shown * 100)}% of the image`);
    }
    if (!svg) {
      const scale = (Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * dpr);
      if (c.objectFit === 'cover' ? Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * dpr > 1.5 : scale > 1.5) add('upscaled', img, `${src} ${img.naturalWidth}px wide drawn at ${Math.round(cw * dpr)} device px (${(Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * dpr).toFixed(1)}×)`);
    }
  }
  for (const [el, nat] of window.__swBg || []) {
    if (!el.isConnected || hiddenAnc(el) || !visible(el) || !nat) continue;
    const c = cs(el);
    if (!/cover/.test(c.backgroundSize)) continue;
    const q = el.getBoundingClientRect();
    if (q.width < 80 || q.height < 80) continue;
    const shown = Math.min((q.width / q.height) / (nat.w / nat.h), (nat.w / nat.h) / (q.width / q.height));
    if (shown < 0.5) add('cropped', el, `background ${nat.src}: cover shows ${Math.round(shown * 100)}% of the image`);
  }

  // ---- dead bands ----
  {
    const STEP = 8, docH = Math.max(doc.scrollHeight, body.scrollHeight);
    const occ = new Uint8Array(Math.ceil(docH / STEP) + 1);
    const fill = (t, b) => { for (let y = Math.max(0, Math.floor((t + sy) / STEP)); y <= Math.min(occ.length - 1, Math.floor((b + sy) / STEP)); y++) occ[y] = 1; };
    for (const r of runs) for (const q of r.rects) fill(q.top, q.bottom);
    for (const el of body.querySelectorAll('img, svg, video, canvas, iframe, picture, object, embed, input, select, textarea, button, [style*="background-image"]')) {
      if (hiddenAnc(el) || !visible(el)) continue;
      const q = el.getBoundingClientRect(); if (q.width >= 8 && q.height >= 8) fill(q.top, q.bottom);
    }
    for (const [el] of window.__swBg || []) { if (el.isConnected && visible(el)) { const q = el.getBoundingClientRect(); if (q.width >= 8 && q.height >= 8) fill(q.top, q.bottom); } }
    const minRun = Math.max(360, vh * 0.45);
    let start = null, bands = 0;
    for (let i = 0; i <= occ.length && bands < 4; i++) {
      const empty = i < occ.length && !occ[i];
      if (empty && start === null) start = i;
      else if (!empty && start !== null) {
        const top = start * STEP, h = (i - start) * STEP;
        if (h >= minRun && start > 0 && i < occ.length) {
          // The element that holds most of the band (the smallest one when several hold all of it).
          let owner = null;
          for (const el of body.querySelectorAll('section, header, footer, main > *, body > *, article, div, aside')) {
            const b = el.getBoundingClientRect();
            if (b.width < vw * 0.5) continue;
            const ov = Math.min(b.bottom + sy, top + h) - Math.max(b.top + sy, top);
            if (ov < h * 0.5) continue;
            if (!owner || ov > owner.ov + 1 || (Math.abs(ov - owner.ov) <= 1 && b.height < owner.h)) owner = { el, h: b.height, ov };
          }
          const r = new DOMRect(0, top - sy, vw, h);
          add('dead-band', owner?.el || null, `${Math.round(h)}px with no text, media or control from y=${Math.round(top)}`, r);
          bands++;
        }
        start = null;
      }
    }
  }

  // ---- the fold: h1 and primary CTA ----
  const h1 = [...body.querySelectorAll('h1')].find((h) => !hiddenAnc(h) && visible(h));
  let ctaEl = null;
  if (ctaSel) ctaEl = [...document.querySelectorAll(ctaSel)].find((e) => visible(e)) || null;
  else {
    const scope = body.querySelector('main, [role=main]') || body;
    const buttonIds = new Set(controls.filter((c) => c.buttonLike).map((c) => c.id));
    ctaEl = [...scope.querySelectorAll('a[href], button, [role=button]')].find((e) => buttonIds.has(idOf(e)) && !e.closest('nav, footer, [role=search], form[role=search]')) || null;
  }
  const fold = {};
  if (h1) { const q = h1.getBoundingClientRect(); const lh = parseFloat(cs(h1).lineHeight) || q.height; fold.h1 = { id: idOf(h1), sel: sel(h1), top: Math.round(q.top + sy), below: q.top + sy + Math.min(q.height, lh) > vh, box: box(q) }; }
  if (ctaEl) { const q = ctaEl.getBoundingClientRect(); fold.cta = { id: idOf(ctaEl), sel: sel(ctaEl), label: text(ctaEl, 24), top: Math.round(q.top + sy), below: q.bottom + sy > vh, box: box(q) }; }

  // ---- fixed and sticky chrome ----
  {
    let covered = 0; const bars = [];
    for (const el of body.querySelectorAll('*')) {
      const p = cs(el).position;
      if ((p !== 'fixed' && p !== 'sticky') || hiddenAnc(el) || !visible(el)) continue;
      if (el.parentElement && inFixed(el.parentElement)) continue;
      const q = el.getBoundingClientRect();
      const iw = Math.max(0, Math.min(q.right, vw) - Math.max(q.left, 0)), ih = Math.max(0, Math.min(q.bottom, vh) - Math.max(q.top, 0));
      if (iw * ih < 0.02 * vw * vh) continue;
      // A sticky element counts only where it sticks: at its top offset (a sticky sidebar in flow is not chrome).
      if (p === 'sticky' && !(cs(el).top !== 'auto' && q.height < vh * 0.9)) continue;
      covered += iw * ih; bars.push(el);
    }
    if (covered > 0.3 * vw * vh) add('chrome', bars[0], `fixed/sticky bars cover ${Math.round((covered / (vw * vh)) * 100)}% of the ${vw}×${vh} viewport (${bars.slice(0, 3).map(sel).join(', ')})`);
  }

  // ---- flex/grid containers: column counts (breakpoints) and visual order ----
  const cols = {};
  if (track) {
    let nC = 0;
    for (const el of body.querySelectorAll('*')) {
      if (nC > 400) break;
      const d = cs(el).display;
      if (!/flex|grid/.test(d) || hiddenAnc(el)) continue;
      const kids = [...el.children].filter((k) => { const q = k.getBoundingClientRect(); return q.width > 4 && q.height > 4 && cs(k).position !== 'absolute' && cs(k).position !== 'fixed'; });
      if (kids.length < 2) continue;
      nC++;
      const rects = kids.map((k) => k.getBoundingClientRect());
      // Same row: the boxes overlap vertically by at least half the smaller height (centred columns of unequal
      // height are one row).
      const sameRow = (p, q) => Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > 0.5 * Math.min(p.height, q.height);
      const first = rects.reduce((m, r) => (r.top < m.top ? r : m), rects[0]);
      const n = rects.filter((r) => sameRow(r, first)).length;
      cols[sel(el)] = [n, sel(el), kids.length];
      // Visual order: rows by top (half-height tolerance), then by inline start.
      const rtl = cs(el).direction === 'rtl';
      const order = kids.map((k, i) => ({ i, r: rects[i] })).sort((a, b) => (sameRow(a.r, b.r) ? (rtl ? b.r.right - a.r.right : a.r.left - b.r.left) : a.r.top - b.r.top));
      const moved = order.findIndex((o, j) => o.i !== j);
      if (moved >= 0 && kids.some((k) => k.matches('a, button, input, select, textarea, [tabindex]') || k.querySelector('a[href], button, input, select, textarea, h1, h2, h3, h4, p'))) {
        add('order', el, `children drawn in order ${order.map((o) => o.i + 1).slice(0, 8).join(',')} — DOM order differs (reading and focus order)`);
      }
    }
  }

  return { vw, vh, iw: innerWidth, docW: doc.scrollWidth, docH: Math.max(doc.scrollHeight, body.scrollHeight), findings, controls, fold, cols, headerH,
    clip: [doc, body].some((e) => /hidden|clip/.test(cs(e).overflowX)) };
}

/** Natural sizes of CSS background images (once per page): cover crops need them. */
export async function prepare(page) {
  await page.evaluate(async () => {
    const list = [];
    for (const el of document.body.querySelectorAll('*')) {
      const bg = getComputedStyle(el).backgroundImage;
      const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m && !/^data:image\/svg/.test(m[1])) list.push([el, m[1]]);
      if (list.length >= 40) break;
    }
    window.__swBg = await Promise.all(list.map(([el, url]) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res([el, { w: im.naturalWidth, h: im.naturalHeight, src: url.split('/').pop().slice(0, 40) }]);
      im.onerror = () => res([el, null]);
      im.src = url; setTimeout(() => res([el, null]), 3000);
    })));
  }).catch(() => {});
}

/** Resize in place and wait until the layout stops changing (finite animations started by the resize are finished). */
export async function resizeTo(page, width, height, settleMs = 400) {
  await page.setViewportSize({ width, height });
  await page.evaluate(async (ms) => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
    const finish = () => { for (const a of document.getAnimations?.() ?? []) { try { if (a.effect?.getComputedTiming?.().iterations !== Infinity) a.finish(); } catch { /* ignore */ } } };
    const sig = () => `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}:${Math.round(document.body?.getBoundingClientRect().height || 0)}`;
    await raf(); await raf(); finish();
    let s = sig();
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      await new Promise((r) => setTimeout(r, 40)); await raf(); finish();
      const s2 = sig(); if (s2 === s) break; s = s2;
    }
    scrollTo(0, 0);
  }, settleMs).catch(() => {});
}

/** Measure the page at the current viewport: the probe, plus the overflow probe when the page is wider or clips. */
export async function measureAt(page, opts = {}) {
  const r = await page.evaluate(layoutProbe, opts);
  const needOverflow = r.docW > r.vw || r.clip || r.iw > r.vw;
  if (needOverflow) {
    const o = await page.evaluate(overflowCulprits).catch(() => null);
    if (o?.overflow) {
      const c = o.culprits[0];
      const where = c ? await page.evaluate(locate, c.selector).catch(() => null) : null;
      r.findings.push({ check: 'overflow', id: where?.id || 0, sel: c ? c.selector : '(page)', detail: `page ${o.by}px wider than the viewport${o.culprits.length ? `: ${o.culprits.slice(0, 3).map((x) => x.selector).join(', ')}` : ''}`, box: where?.box || null });
    }
    for (const e of o?.cutAtEdge || []) {
      if (e.reach) continue;
      const where = await page.evaluate(locate, e.selector).catch(() => null);
      r.findings.push({ check: 'edge-cut', id: where?.id || 0, sel: e.selector, detail: `"${e.text}" ${e.past}px past the ${e.edge === 'left' ? 'left' : 'right'} edge, which no scroll reaches`, box: where?.box || null });
    }
  }
  if (r.iw > r.vw + 1 && opts.mobile) r.findings.push({ check: 'zoom-out', id: 0, sel: '(page)', detail: `layout viewport ${r.iw}px at a ${r.vw}px screen — phones show the page zoomed out`, box: null });
  for (const f of r.findings) f.sev ||= SEV[f.check] || 'warn';
  return r;
}

/** An element named by lib/probes.mjs's selector (it may start with "… > "): its sweep id and document box. */
function locate(selector) {
  // Several elements can match the short selector: take the one that reaches furthest past the viewport edges.
  let el = null;
  const past = (e) => { const r = e.getBoundingClientRect(); return Math.max(r.right - document.documentElement.clientWidth, -r.left); };
  for (const s of [selector.replace(/^… > /, ''), selector.split(' > ').slice(-2).join(' > '), selector.split(' > ').pop()]) {
    let all = [];
    try { all = [...document.querySelectorAll(s)]; } catch { all = []; }
    if (all.length) { el = all.reduce((m, e) => (past(e) > past(m) ? e : m), all[0]); break; }
  }
  if (!el) return null;
  const W = (window.__sw ||= { next: 1, sel: new Map() });
  if (!el.__swid) el.__swid = W.next++;
  const r = el.getBoundingClientRect();
  return { id: el.__swid, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } };
}

export const keyOf = (f) => `${f.check}|${f.sel}`;

/** Merge per-width findings into ranges over the sampled widths. */
function toRanges(samples) {
  const byKey = new Map();
  samples.forEach((s, i) => {
    for (const f of s.findings) {
      const k = keyOf(f);
      const e = byKey.get(k) || { check: f.check, sel: f.sel, sev: f.sev, hits: [] };
      if (WEIGHT[f.sev] > WEIGHT[e.sev]) e.sev = f.sev;
      e.hits.push({ i, width: s.label || s.width, w: s.width, detail: f.detail, box: f.box, id: f.id });
      byKey.set(k, e);
    }
  });
  const ranges = [];
  for (const e of byKey.values()) {
    let cur = null;
    for (const h of e.hits) {
      if (cur && h.i === cur.lastI + 1 && samples[h.i].pass === samples[cur.lastI].pass) { cur.to = h.width; cur.lastI = h.i; cur.n++; continue; }
      cur = { check: e.check, sev: e.sev, sel: e.sel, from: h.width, to: h.width, lastI: h.i, n: 1, detail: h.detail, at: h.w, box: h.box, id: h.id, pass: samples[h.i].pass };
      ranges.push(cur);
    }
  }
  return ranges.map(({ lastI, ...r }) => r).sort((a, b) => WEIGHT[b.sev] - WEIGHT[a.sev] || b.n - a.n);
}

/** Cross-width checks: width-dependent small targets and wrapping labels, fold regressions, breakpoints. */
function crossWidth(samples) {
  const ctl = new Map();
  // Element ids are per page load: key them by pass.
  const ck = (s, c) => `${s.passName}:${c.id}`;
  for (const s of samples) for (const c of s.controls) { const e = ctl.get(ck(s, c)) || { lines1: false, small: 0, n: 0 }; e.n++; if (Math.min(c.w, c.h) < 24) e.small++; if (c.lines === 1) e.lines1 = true; ctl.set(ck(s, c), e); }
  let staticSmall = 0;
  for (const [, e] of ctl) if (e.small === e.n) staticSmall++;
  for (const s of samples) {
    for (const c of s.controls) {
      const e = ctl.get(ck(s, c));
      if (Math.min(c.w, c.h) < 24 && e.small < e.n) s.findings.push({ check: 'small-target', sev: 'warn', id: c.id, sel: c.sel, detail: `"${c.label}" ${c.w}×${c.h}px here, ≥ 24 px at other widths`, box: c.box });
      if (c.buttonLike && c.lines >= 2 && e.lines1) s.findings.push({ check: 'label-wrap', sev: 'warn', id: c.id, sel: c.sel, detail: `"${c.label}" wraps to ${c.lines} lines (${c.w}×${c.h}px)`, box: c.box });
    }
  }
  for (const which of ['h1', 'cta']) {
    const pass = new Map();
    for (const s of samples) { const f = s.fold[which]; if (!f || s.pass === 'zoom') continue; const e = pass.get(s.pass) || { above: 0, below: 0 }; f.below ? e.below++ : e.above++; pass.set(s.pass, e); }
    for (const s of samples) {
      const f = s.pass !== 'zoom' && s.fold[which]; const e = f && pass.get(s.pass);
      if (f?.below && e.above > 0) s.findings.push({ check: 'fold', sev: 'error', id: f.id, sel: f.sel, detail: `${which === 'h1' ? 'h1' : `primary CTA "${f.label}"`} at y=${f.top}, below the ${s.vh}px fold (above it at ${e.above} other width${e.above > 1 ? 's' : ''})`, box: f.box });
    }
  }
  const breaks = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (a.pass === 'zoom' || b.pass === 'zoom') continue; // phone → desktop at the device-class boundary is compared too
    const changed = [];
    for (const [id, [n, sel, kids]] of Object.entries(b.cols)) { const p = a.cols[id]; if (p && p[0] !== n) changed.push(`${sel}: ${p[0]} → ${n} per row (${kids} items)`); }
    const hj = a.docH && Math.abs(b.docH - a.docH) / a.docH > 0.2;
    if (changed.length || hj) breaks.push({ between: [a.width, b.width], pass: b.pass, changes: changed.slice(0, 6), more: Math.max(0, changed.length - 6), heightJump: hj ? `${a.docH} → ${b.docH}px` : null });
  }
  // Flip-flops: a container whose per-row count goes back and forth as the width only grows.
  const seq = new Map();
  for (const s of samples) for (const [id, [n, sel]] of Object.entries(s.cols)) { const e = seq.get(`${s.pass}:${id}`) || { sel, ns: [] }; if (s.pass !== 'zoom') e.ns.push([s.width, n]); seq.set(`${s.pass}:${id}`, e); }
  const flips = [];
  for (const e of seq.values()) {
    let dir = 0, turns = 0;
    for (let i = 1; i < e.ns.length; i++) { const d = Math.sign(e.ns[i][1] - e.ns[i - 1][1]); if (!d) continue; if (dir && d !== dir) turns++; dir = d; }
    if (turns) flips.push(`${e.sel}: per-row count ${e.ns.map((x) => x[1]).filter((v, i, arr) => i === 0 || v !== arr[i - 1]).join(' → ')} as the width grows`);
  }
  return { breaks, flips, staticSmall };
}

function widthsFor(a) {
  if (a.widths) return asList(a.widths).map(Number).filter(Boolean).sort((x, y) => x - y);
  const from = Number(a.from) || 320, to = Number(a.to) || 1920;
  const [s1, s2] = asList(a.step, ['8', '16']).map(Number);
  const out = [];
  for (let w = from; w <= to; w += w < 1024 ? s1 : (s2 || s1)) out.push(w);
  if (out.at(-1) !== to) out.push(to);
  return out;
}
const heightFor = (w, a) => Number(a.height) || (w < 600 ? 740 : w < 1024 ? 960 : 800);

/** A contact sheet laid out and captured by the browser (no native image dependency). */
export async function drawSheet(browser, cells, out, { title = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#e8e8e6;font:13px/1.35 system-ui,sans-serif;color:#1b1b1b">
    <div id="g" style="display:flex;flex-wrap:wrap;gap:18px;padding:18px;width:${Math.min(1600, cells.length * 420 + 36)}px;align-items:flex-start">
    ${title ? `<div style="flex-basis:100%;font:600 15px system-ui">${esc(title)}</div>` : ''}
    ${cells.map((c) => `<figure style="margin:0;width:${c.cellW || 380}px"><figcaption style="margin:0 0 6px;font-weight:600">${esc(c.label)}</figcaption>
      <img src="data:image/png;base64,${c.png.toString('base64')}" style="width:100%;display:block;box-shadow:0 0 0 1px #0003">
      ${c.notes ? `<ol style="margin:6px 0 0;padding-left:18px">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>` : ''}</figure>`).join('')}
    </div></body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const g = await page.$('#g');
  const bb = await g.boundingBox();
  await page.setViewportSize({ width: Math.ceil(bb.width), height: Math.min(Math.ceil(bb.height), 12000) });
  await mkdir(path.dirname(out), { recursive: true });
  await g.screenshot({ path: out, type: /\.jpe?g$/.test(out) ? 'jpeg' : 'png', ...(/\.jpe?g$/.test(out) ? { quality: 78 } : {}) });
  await page.close();
}

/** Boxes and numbers over findings (absolute overlays, no layout change); returns a remover. */
export async function markFindings(page, marks) {
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
  }, marks).catch(() => {});
  return () => page.evaluate(() => document.getElementById('__sw_marks')?.remove()).catch(() => {});
}

/** Refresh the box of each finding from its element id at the current width (boxes move as the width changes). */
async function currentBoxes(page, marks) {
  return page.evaluate((marks) => {
    const all = document.body.querySelectorAll('*');
    const byId = new Map(); for (const e of all) if (e.__swid) byId.set(e.__swid, e);
    return marks.map((m) => { const e = m.id && byId.get(m.id); if (!e) return m; const r = e.getBoundingClientRect(); return { ...m, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } }; });
  }, marks);
}

async function shotAround(page, box, vw, vh, docH, { pad = 24, maxH } = {}) {
  const y0 = box ? Math.max(0, Math.min(box.y - Math.round(vh * 0.2), docH - vh)) : 0;
  const h = Math.min(maxH || vh, Math.max(1, docH - y0));
  return page.screenshot({ clip: { x: 0, y: y0, width: vw, height: h }, fullPage: true });
}

async function sweepPage(browser, url, a, outDir) {
  const t0 = Date.now();
  const all = widthsFor(a);
  const device = a.device || 'auto';
  const passes = [];
  const mobileWs = device === 'mobile' ? all : device === 'desktop' ? [] : all.filter((w) => w < 768);
  const desktopWs = device === 'mobile' ? [] : device === 'desktop' ? all : all.filter((w) => w >= 768);
  if (mobileWs.length) passes.push({ name: 'phone', mobile: true, widths: mobileWs.map((w) => ({ width: w, height: heightFor(w, a) })) });
  const zoom = a['no-zoom'] ? [] : [{ width: 640, height: 360, label: '640 (1280 at 200%)' }, { width: 320, height: 180, label: '320 (1280 at 400%)' }];
  if (desktopWs.length || zoom.length) passes.push({ name: 'desktop', mobile: false, widths: [...desktopWs.map((w) => ({ width: w, height: heightFor(w, a) })), ...zoom.map((z) => ({ ...z, zoom: true }))] });
  const measure = a.measure === undefined ? [20, 90] : asList(a.measure).map(Number);
  const samples = [];
  const settleMs = Number(a.settle) || 400;
  const pages = [];
  let loads = 0;
  for (const p of passes) {
    const first = p.widths[0];
    const ctx = await browser.newContext({ viewport: { width: first.width, height: first.height }, deviceScaleFactor: p.mobile ? 2 : 1, isMobile: p.mobile, hasTouch: p.mobile });
    const page = await ctx.newPage();
    await open(page, url); loads++;
    if (/^(chrome-error:|about:blank)/.test(page.url())) throw new Error(`the page did not load (${url}) — is the server running?`);
    await settle(page);
    await prepare(page);
    for (const w of p.widths) {
      await resizeTo(page, w.width, w.height, settleMs);
      const r = await measureAt(page, { measure, cta: a.cta || null, mobile: p.mobile });
      samples.push({ ...r, width: w.width, height: w.height, label: w.label || String(w.width), pass: w.zoom ? 'zoom' : p.name, passName: p.name });
    }
    pages.push({ pass: p, ctx, page });
  }
  const ms = Date.now() - t0;
  const cross = crossWidth(samples);
  const ranges = toRanges(samples);
  const perWidth = samples.map((s) => ({ width: s.label, errors: s.findings.filter((f) => f.sev === 'error').length, warns: s.findings.filter((f) => f.sev === 'warn').length }));

  // Worst widths: most weighted findings, at least 24 px apart, zoom widths when they have findings.
  const score = (s) => s.findings.reduce((n, f) => n + WEIGHT[f.sev], 0);
  const ranked = samples.map((s, i) => ({ s, i, sc: score(s) })).filter((x) => x.sc > 0).sort((x, y) => y.sc - x.sc || x.s.width - y.s.width);
  const chosen = [];
  // The worst width of each class first (phone < 600, tablet < 1024, desktop, zoom), then the next worst anywhere.
  const cls = (s) => (s.pass === 'zoom' ? 'zoom' : s.width < 600 ? 'phone' : s.width < 1024 ? 'tablet' : 'desktop');
  const limit = Number(a.sheet) || 6;
  for (const c of ['phone', 'tablet', 'desktop', 'zoom']) { const x = ranked.find((r) => cls(r.s) === c); if (x && chosen.length < limit) chosen.push(x); }
  for (const x of ranked) { if (chosen.length >= limit) break; if (chosen.includes(x) || chosen.some((c) => c.s.pass === x.s.pass && Math.abs(c.s.width - x.s.width) < 24)) continue; chosen.push(x); }
  const slug = slugFor(new URL(url).pathname + new URL(url).search);
  const cells = [];
  const crops = [];
  const cropDir = path.join(outDir, `${slug}-crops`);
  for (const x of chosen.sort((p, q) => p.i - q.i)) {
    const { page } = pages.find((pp) => pp.pass.name === x.s.passName);
    await resizeTo(page, x.s.width, x.s.height, settleMs);
    const top = x.s.findings.filter((f) => f.sev !== 'info').sort((p, q) => WEIGHT[q.sev] - WEIGHT[p.sev]).slice(0, 8);
    const marks = await currentBoxes(page, top);
    const rm = await markFindings(page, marks);
    const docH = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    const png = await shotAround(page, marks.find((m) => m.box && m.box.h > 0)?.box, x.s.vw, x.s.height, docH, { maxH: Math.round(x.s.height * 1.4) });
    await rm();
    cells.push({ label: `${x.s.label} px${x.s.pass === 'zoom' ? '' : ` (${x.s.passName})`} — ${x.s.findings.filter((f) => f.sev === 'error').length} ✗, ${x.s.findings.filter((f) => f.sev === 'warn').length} △`, png, notes: marks.map((m) => `${MARK[m.sev]} ${m.check}: ${m.sel} — ${m.detail}`.slice(0, 140)), cellW: 380 });
  }
  // 1:1 crops of the worst ranges, at the first width of each range.
  const nCrops = a.crops === undefined ? 12 : Number(a.crops);
  await rm(cropDir, { recursive: true, force: true });
  if (nCrops > 0) await mkdir(cropDir, { recursive: true });
  for (const r of ranges.filter((r) => r.sev !== 'info').slice(0, nCrops)) {
    const s = samples.find((s) => s.label === String(r.from) && s.pass === r.pass) || samples.find((s) => s.label === String(r.from));
    if (!s) continue;
    const { page } = pages.find((pp) => pp.pass.name === s.passName);
    await resizeTo(page, s.width, s.height, settleMs);
    const [m] = await currentBoxes(page, [{ ...r, box: r.box }]);
    if (!m.box || m.box.w < 1 || m.box.h < 1) continue;
    const rm = await markFindings(page, [m]);
    const docH = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    const pad = 32;
    const clip = { x: Math.max(0, m.box.x - pad), y: Math.max(0, m.box.y - pad - 22), width: 0, height: 0 };
    clip.width = Math.min(Math.max(s.vw, s.iw) - clip.x, m.box.w + pad * 2);
    clip.height = Math.min(docH - clip.y, m.box.h + pad * 2 + 22, 1400);
    const file = path.join(cropDir, `${String(crops.length + 1).padStart(2, '0')}-${r.check}-${String(r.from).split(' ')[0]}.png`);
    if (clip.width > 4 && clip.height > 4) { await page.screenshot({ path: file, clip, fullPage: true }).catch(() => null); crops.push({ file, check: r.check, sel: r.sel, width: r.from }); }
    await rm();
  }
  const sheetFile = cells.length ? path.join(outDir, `${slug}-sheet.jpg`) : null;
  if (sheetFile) await drawSheet(browser, cells, sheetFile, { title: `${url} — worst widths (findings boxed and numbered; captions below each)` });
  for (const pp of pages) await pp.ctx.close();
  return { url, loads, widths: samples.length, ms, msPerWidth: Math.round(ms / samples.length), ranges, breakpoints: cross.breaks, flips: cross.flips, staticSmallTargets: cross.staticSmall, perWidth, sheet: sheetFile, crops };
}

function markdown(res) {
  const L = [];
  L.push(`## ${res.url}`, '');
  L.push(`${res.widths} widths in ${(res.ms / 1000).toFixed(1)} s (${res.msPerWidth} ms per width, ${res.loads} page load${res.loads > 1 ? 's' : ''}).${res.sheet ? ` Sheet: \`${res.sheet}\`.` : ''}`, '');
  const probs = res.ranges.filter((r) => r.sev !== 'info');
  if (!probs.length) L.push('No problem ranges found. The layout checks are leads, not a verdict: look at the breakpoints below.', '');
  else {
    L.push('| | check | widths | element | at the first width |', '| --- | --- | --- | --- | --- |');
    for (const r of probs.slice(0, 60)) L.push(`| ${MARK[r.sev]} | ${r.check} | ${r.from === r.to ? r.from : `${r.from}–${r.to}`} | \`${r.sel.replace(/\|/g, '\\|')}\` | ${String(r.detail).replace(/\|/g, '\\|')} |`);
    if (probs.length > 60) L.push(`| | | | | … ${probs.length - 60} more in the JSON |`);
    L.push('');
  }
  if (res.flips.length) L.push('**Per-row counts that go back and forth as the width grows** (a layout that cannot decide):', ...res.flips.map((f) => `- ${f}`), '');
  if (res.breakpoints.length) {
    L.push(`**Breakpoints** (${res.breakpoints.length}) — capture both widths of each and compare:`);
    for (const b of res.breakpoints.slice(0, 25)) L.push(`- ${b.between[0]} → ${b.between[1]}${b.pass === 'phone' ? ' (phone)' : ''}: ${[...b.changes, b.more ? `+${b.more} more` : '', b.heightJump ? `document height ${b.heightJump}` : ''].filter(Boolean).join('; ')}`);
    L.push('');
  }
  if (res.staticSmallTargets) L.push(`${res.staticSmallTargets} control(s) are under 24 px at every width — audit.mjs reports those with the 2.5.8 spacing exception.`, '');
  if (res.crops?.length) L.push(`1:1 crops of the worst findings: ${res.crops.map((c) => `\`${c.file}\``).join(', ')}`, '');
  return L.join('\n');
}

async function main() {
  const a = parseArgs();
  const urls = a.url ? asList(a.url) : asList(a.paths, ['/']).map((p) => urlFor(a.base || 'http://localhost:3000', p));
  const outDir = a.out || 'sweep';
  await mkdir(outDir, { recursive: true });
  const { browser } = await launch({ chrome: a.chrome });
  let anyError = false;
  const md = ['# Width sweep', ''];
  try {
    for (const url of urls) {
      try {
        const res = await sweepPage(browser, url, a, outDir);
        const slug = slugFor(new URL(url).pathname + new URL(url).search);
        await writeFile(path.join(outDir, `${slug}.json`), JSON.stringify(res, null, 1));
        const m = markdown(res);
        await writeFile(path.join(outDir, `${slug}.md`), m);
        md.push(m);
        console.log(m);
        if (res.ranges.some((r) => r.sev === 'error')) anyError = true;
      } catch (e) {
        anyError = true;
        console.error(`✗ ${url} not swept: ${String(e?.message || e).split('\n')[0]}`);
      }
    }
  } finally { await browser.close(); }
  if (urls.length > 1) await writeFile(path.join(outDir, 'sweep.md'), md.join('\n'));
  process.exitCode = anyError ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
