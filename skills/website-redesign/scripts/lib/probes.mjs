/**
 * In-page probes. Each function is serialised into the page by Playwright's
 * page.evaluate(fn, arg), so it must be self-contained (no closures over
 * module scope).
 */

/** Horizontal overflow and the outermost elements that cause it. */
export function overflowCulprits() {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const by = doc.scrollWidth - vw;
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join('');
    const parent = el.parentElement && el.parentElement !== document.body ? sel(el.parentElement) + ' > ' : '';
    return (parent.length > 80 ? '… > ' : parent) + el.tagName.toLowerCase() + cls;
  };
  // An element is clipped if an ancestor below <body> clips overflow-x.
  // (Stop at body: `body { overflow-x: hidden }` hides the scrollbar, not the fault.)
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o !== 'visible') return true;
    }
    return false;
  };
  const out = [], culpritEls = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && cs.visibility === 'hidden') continue;
    if (clipped(el)) continue;
    const parent = el.parentElement;
    const pr = parent?.getBoundingClientRect();
    const parentAlsoOver = parent && parent !== document.body && pr && (pr.right > vw + 1 || pr.left < -1) && !clipped(parent);
    if (!parentAlsoOver) { out.push({ selector: sel(el), right: Math.round(r.right), width: Math.round(r.width) }); culpritEls.push(el); }
  }

  // Readable text past the viewport edge. When html's overflow is not visible, html's overflow-x goes to the viewport
  // and body clips its own box by its own overflow-x: so `html, body { overflow-x: hidden | clip }`, and just as
  // well `html { overflow-y: scroll }` (overflow-x then computes to auto) with `body { overflow-x: hidden }`, leave
  // scrollWidth at the viewport width, the check above sees nothing, and the render shows copy cut at the edge (a
  // nowrap chip that widened a `1fr` track, a label pushed out of a flex row). With html's overflow visible, body's
  // goes to the viewport instead and body clips nothing itself (`clip` says which: 'body', 'viewport' or null).
  // Text cut by a clipping container below body is inventory.mjs clippedText's finding, not this one; text inside a
  // real scroller is reachable; a single-line ellipsis whose own box fits is a deliberate truncation; a box wholly
  // off-screen (a carousel slide) is not cut. When the page does overflow, text inside a culprit above is already
  // reported, and text that runs out of its own box past the end edge is added to the culprits (`text: true`): it
  // widened the page, and no element box did.
  // Each item says whether a sideways scroll of the page reaches it (`reach`: past the end edge, within the
  // scrollable width, and the page scroller is not clipped) and whether it is past the start edge (`start`: left in
  // a left-to-right page, where nothing ever scrolls). Text the page scrolls to is still listed (callers name it as
  // what widened the page), except on a page whose html or body is itself a scroller, where it never was.
  const hcs = getComputedStyle(doc), bcs = getComputedStyle(document.body);
  const clips = (o) => o === 'hidden' || o === 'clip';
  const rootVisible = hcs.overflowX === 'visible' && hcs.overflowY === 'visible';
  const viewportX = rootVisible ? bcs.overflowX : hcs.overflowX, bodyX = rootVisible ? 'visible' : bcs.overflowX;
  const clip = clips(bodyX) ? 'body' : clips(viewportX) ? 'viewport' : null;
  const rtl = bcs.direction === 'rtl';
  const bodyRange = /auto|scroll/.test(bodyX) ? document.body.scrollWidth - document.body.clientWidth : 0;
  const scrollerPage = [document.body, doc].some((t) => /auto|scroll/.test(getComputedStyle(t).overflowX));
  const cutAtEdge = [], textCulprits = [];
  const NO_TEXT = /^(hidden|checkbox|radio|range|color|file|image)$/i;
  const nowrap = (c) => c.whiteSpace === 'nowrap' || c.whiteSpace === 'pre' || c.textWrapMode === 'nowrap';
  const shortText = (t) => t.replace(/\s+/g, ' ').trim().slice(0, 40);
  const reported = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName) || el instanceof SVGElement) continue;
    const control = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !(el.tagName === 'INPUT' && NO_TEXT.test(el.type));
    const own = control ? null : [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (control ? !String(el.tagName === 'SELECT' ? el.selectedOptions?.[0]?.text || '' : el.value || el.getAttribute('placeholder') || '').trim() : !own.length) continue;
    const eb = el.getBoundingClientRect();
    if (eb.width <= 1 || eb.height <= 0) continue;
    // The readable box: the text's own line boxes (a padded block past the edge with its words inside is not cut).
    let L = Infinity, R = -Infinity;
    if (control) { L = eb.left; R = eb.right; } else {
      const rg = document.createRange();
      for (const n of own) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 0.5 && q.height > 0.5) { L = Math.min(L, q.left); R = Math.max(R, q.right); } }
      if (!(R > L)) continue;
    }
    const cs = getComputedStyle(el);
    if (['hidden', 'clip'].includes(cs.overflowX)) { L = Math.max(L, eb.left); R = Math.min(R, eb.right); }
    if (!((L < vw && R > vw + 1) || (R > 0 && L < -1))) continue;
    if (el.closest('[hidden], [inert], [aria-hidden="true"], dialog:not([open])') || (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))) continue;
    // visibility is inherited (a child may set it back to visible); opacity and a visually-hidden clip are not.
    let skip = cs.visibility !== 'visible';
    for (let e = el; e && e !== doc && !skip; e = e.parentElement) {
      const c = e === el ? cs : getComputedStyle(e);
      if (parseFloat(c.opacity) === 0 || c.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(c.clipPath)) skip = true;
    }
    if (skip) continue;
    // Single-line ellipsis on the element or its parent, whose clipping box fits in the viewport.
    const ell = [el, el.parentElement].find((e) => e && e !== document.body && getComputedStyle(e).textOverflow === 'ellipsis' && (nowrap(getComputedStyle(e)) || nowrap(cs)));
    if (ell) { const b = ell.getBoundingClientRect(); if (b.left >= -1 && b.right <= vw + 1) continue; }
    // Walk up: a real scroller makes it reachable; a clipping box below body either cuts the text itself (clippedText
    // in inventory.mjs reports that) or, when it too runs past the edge, is cut with the text by body or html. A box
    // is a real scroller only when it scrolls sideways: `overflow-y: auto` makes overflow-x compute to auto as well,
    // and such a box with nothing to scroll sideways clips like a hidden one (a 420px panel on a 390px phone).
    let reachable = false, cutBelow = false;
    for (let p = el.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) { reachable = true; break; }
      if (o === 'visible') continue;
      const q = p.getBoundingClientRect();
      if (R > q.right + 2 || L < q.left - 2) { cutBelow = true; break; }
      L = Math.max(L, q.left); R = Math.min(R, q.right);
    }
    if (reachable || cutBelow) continue;
    const pastRight = L < vw && R > vw + 1, pastLeft = R > 0 && L < -1;
    if (!pastRight && !pastLeft) continue;
    // The page scrolls to it: past the end edge, within the scrollable width, with the scroller not clipped (the
    // viewport, or body when it scrolls its own box). A fixed box does not move when the page scrolls.
    const past = pastRight ? R - vw : -L, start = rtl ? pastRight : !pastRight;
    const fixed = (() => { for (let e = el; e && e !== doc; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true; return false; })();
    const grows = by > 0 && !start && !fixed && past <= by + 1; // it widened the document
    const reach = (grows && !clips(viewportX)) || (!start && !fixed && past <= bodyRange + 1);
    if (by > 0 && culpritEls.some((c) => c === el || c.contains(el))) continue;
    if (reported.some((r) => r.contains(el))) continue;
    reported.push(el);
    if (grows && textCulprits.length < 8) textCulprits.push({ selector: sel(el), right: Math.round(R), width: Math.round(eb.width), past: Math.round(past), ...(pastRight ? {} : { edge: 'left' }), text: true });
    if (reach && scrollerPage) continue;
    const text = shortText(control ? (el.type === 'password' ? '(password)' : el.value || el.getAttribute('placeholder') || '') : own.map((n) => n.nodeValue).join(' '));
    cutAtEdge.push({ selector: sel(el), right: Math.round(R), past: Math.round(past), ...(pastRight ? {} : { edge: 'left' }), text, reach, start });
    if (cutAtEdge.length >= 8) break;
  }
  return { overflow: by > 0, by, viewport: vw, culprits: [...out, ...textCulprits].slice(0, 8), cutAtEdge, clip };
}

/**
 * Text whose INK (marks, accents, ascenders, descenders) is cut by the box that clips it, in any script. Line boxes
 * are built from the font's ascent and descent, but Arabic marks and stacked hamza/harakat, and accented Latin
 * capitals, reach past them, and nothing in layout says so: getBoundingClientRect and scrollHeight never see ink.
 * Method (stage-2 stream S8, lib/glyph-probe.mjs, validated against two independent pixel truths): split each text
 * node into its rendered lines, measure each line's ink with canvas measureText (shaped by the same engine), place
 * it on the line's baseline (the fragment's bottom − fontBoundingBoxDescent) and compare it with the padding box of
 * the nearest box that clips the block axis (overflow hidden/clip/auto/scroll, paint containment). A scroll
 * container whose content scrolls on the block axis is judged against its whole scrollable area, not its scrollport:
 * a line crossing the scrollport edge scrolls into view, ink outside the scrollable area never does. Lines wholly
 * outside the clip (clamped away, or content cut off) are not ink cuts: they are counted as hidden lines.
 * An absolutely positioned box is clipped only by its containing block and what contains that; a fixed one by
 * nothing (transformed ancestors aside). Inline boxes and table rows ignore overflow. Body and html never count:
 * their overflow goes to the viewport, which scrolls.
 * The letters are measured as drawn: text-transform applied (in the text's language), small caps through the
 * canvas's fontVariantCaps; under CSS zoom or a transform that scales (a thumbnail, a slide preview) the ink scales
 * with the fragment, and text that is rotated or skewed is not judged.
 * Each text node costs one Range: the whole string's ink is placed on every line first, and only a node that this
 * conservative estimate flags is measured again line by line (a Range per character, up to 400).
 * opts: { scripts: 'all' | 'arabic' (default 'all'), minPx: 1 (flag a cut of at least this), limit: 600 (clipped
 *   text nodes measured), mark: false }. With mark, every measured element gets data-audit-ink="top,bottom" (its own
 *   text's ink extent in document coordinates, for inventory.mjs's clipped-text check), and each reported one
 *   data-audit-ink-k="<index into clipped>".
 * Returns { checked, clipped: [{ k (one per element), selector, clipper, text, font, lineHeight, boxHeight, scroller, topPx, bottomPx }], ms }.
 */
export function glyphClipProbe(opts = {}) {
  const t0 = performance.now();
  const minPx = opts.minPx ?? 1, arabicOnly = opts.scripts === 'arabic', limit = opts.limit ?? 600;
  const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const ctx = document.createElement('canvas').getContext('2d');
  const sel = (el) => { if (el.id) return '#' + el.id; const c = [...el.classList].slice(0, 2).map((x) => '.' + x).join(''); const p = el.parentElement; const own = el.tagName.toLowerCase() + c; return p && p !== document.body && !el.id && !c ? `${p.id ? '#' + p.id : p.tagName.toLowerCase() + [...p.classList].slice(0, 1).map((x) => '.' + x).join('')} > ${own}` : own; };
  // The letters as drawn, not as written: text-transform changes them (an uppercased "shipping" has no descenders).
  // Small caps go to the canvas as fontVariantCaps; small caps asked for through font-feature-settings (which canvas
  // cannot take) are measured as capitals, whose ink is no taller and has no descenders.
  const CAPS = new Set(['small-caps', 'all-small-caps', 'petite-caps', 'all-petite-caps', 'unicase', 'titling-caps']);
  const same = (x) => x;
  const drawnAs = (c, el) => {
    const tt = c.textTransform;
    // the case mapping of the text's language, as the browser applies it (Turkish i uppercases to İ, with a dot)
    let lang = el.closest('[lang]')?.getAttribute('lang') || undefined;
    try { 'i'.toLocaleUpperCase(lang); } catch { lang = undefined; }
    if (tt === 'uppercase' || /["'](smcp|c2sc|pcap|c2pc)["'](?!\s*(0|off)\b)/.test(c.fontFeatureSettings || '') || (CAPS.has(c.fontVariantCaps) && !('fontVariantCaps' in ctx))) return (x) => x.toLocaleUpperCase(lang);
    if (tt === 'lowercase') return (x) => x.toLocaleLowerCase(lang);
    if (tt === 'capitalize') return (x) => x.replace(/(^|[^\p{L}\p{N}'’])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
    return same;
  };
  const csMemo = new Map();
  const cs = (e) => { let c = csMemo.get(e); if (!c) { c = getComputedStyle(e); csMemo.set(e, c); } return c; };
  const NO_OVERFLOW = /^(inline|contents|none|table-row|table-row-group|table-header-group|table-footer-group|table-column|table-column-group)$/;
  const clips = (c) => !NO_OVERFLOW.test(c.display) && (/hidden|clip|auto|scroll/.test(c.overflowY) || /paint|strict|content/.test(c.contain));
  const holdsAbs = (c) => c.position !== 'static' || c.transform !== 'none' || c.perspective !== 'none' || c.filter !== 'none' || /paint|layout|strict|content/.test(c.contain) || /transform|perspective|filter/.test(c.willChange);
  const clipMemo = new Map();
  const clipperOf = (el) => {
    if (clipMemo.has(el)) return clipMemo.get(el);
    let found = null;
    for (let p = el, escaping = false; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const c = cs(p);
      if (escaping && holdsAbs(c)) escaping = false;
      if (!escaping && clips(c)) { found = p; break; }
      if (c.position === 'fixed') break;
      if (c.position === 'absolute') escaping = true;
    }
    clipMemo.set(el, found);
    return found;
  };
  const hiddenText = (el) => {
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return true;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const c = cs(e);
      if (c.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(c.clipPath)) return true;
    }
    const b = el.getBoundingClientRect();
    return b.width <= 2 || b.height <= 2;
  };
  const sy = scrollY;
  const out = [], inkOf = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let n, checked = 0;
  while ((n = walker.nextNode()) && checked < limit) {
    const text = n.data;
    if (!text.trim() || (arabicOnly && !AR.test(text))) continue;
    const el = n.parentElement;
    if (!el || el.closest('svg, script, style, noscript, template, textarea, select, option')) continue;
    const clipper = clipperOf(el);
    if (!clipper || hiddenText(el)) continue;
    const cr = clipper.getBoundingClientRect(), ccs = cs(clipper);
    if (cr.width < 2 || cr.height < 2) continue;
    checked++;
    // overflow: clip honours overflow-clip-margin (Chromium, Firefox; not Safari): the clip edge moves out by that much
    const margin = ccs.overflowY === 'clip' ? parseFloat(ccs.overflowClipMargin) || 0 : 0;
    const clip = { top: cr.top + parseFloat(ccs.borderTopWidth) - margin, bottom: cr.bottom - parseFloat(ccs.borderBottomWidth) + margin };
    const scroller = /auto|scroll/.test(ccs.overflowY) && clipper.scrollHeight > clipper.clientHeight + 1;
    if (scroller) { clip.top -= clipper.scrollTop; clip.bottom = clip.top + clipper.scrollHeight; }
    const c = cs(el);
    // The font as drawn: small caps change the ink (a scale, from CSS zoom or a transform, is read off the fragments)
    ctx.font = `${c.fontStyle} ${c.fontWeight} ${c.fontSize} ${c.fontFamily}`;
    if (CAPS.has(c.fontVariantCaps) && 'fontVariantCaps' in ctx) ctx.fontVariantCaps = c.fontVariantCaps;
    const drawn = drawnAs(c, el);
    // Lines: the node's fragments grouped by their bottom edge (a bidi line splits into several fragments).
    range.selectNodeContents(n);
    const frags = [...range.getClientRects()].filter((q) => q.height > 0 && q.width > 0);
    if (!frags.length) continue;
    const whole = ctx.measureText(drawn(text.trim()));
    // A text fragment is exactly as tall as the font's ascent + descent (equal to the pixel on 1,100 nodes of
    // fixtures, Bootstrap, GOV-SA and the blind-eval builds), so a fragment of another height is scaled: CSS zoom or a
    // transform (a thumbnail, a slide preview) scales the ink with it. The element's box must scale alike on both
    // axes; rotated or skewed text leaves no block axis to judge and is skipped.
    const fh = whole.fontBoundingBoxAscent + whole.fontBoundingBoxDescent;
    let s = 1;
    if (fh > 0 && Math.abs(frags[0].height - fh) > 0.5) {
      const b = el.getBoundingClientRect(), ky = el.offsetHeight ? b.height / el.offsetHeight : 0;
      if (!ky || !el.offsetWidth || Math.abs(b.width - ky * el.offsetWidth) > 2 + 0.03 * b.width) continue;
      s = frags[0].height / fh;
    }
    const judge = (lines) => {
      let worst = null, hiddenLines = 0, inkTop = Infinity, inkBottom = -Infinity;
      for (const line of lines) {
        const m = line.m;
        const baseline = line.bottom - s * m.fontBoundingBoxDescent;
        const top = baseline - s * m.actualBoundingBoxAscent, bottom = baseline + s * m.actualBoundingBoxDescent;
        inkTop = Math.min(inkTop, top); inkBottom = Math.max(inkBottom, bottom);
        if (line.top >= clip.bottom - 1 || line.bottom <= clip.top + 1) { hiddenLines++; continue; }
        const cutTop = clip.top - top, cutBottom = bottom - clip.bottom;
        if (cutTop >= minPx || cutBottom >= minPx) {
          const w = { topPx: Math.round(Math.max(0, cutTop) * 10) / 10, bottomPx: Math.round(Math.max(0, cutBottom) * 10) / 10 };
          if (!worst || w.topPx + w.bottomPx > worst.topPx + worst.bottomPx) worst = w;
        }
      }
      return { worst, hiddenLines, inkTop, inkBottom };
    };
    const byBottom = new Map();
    for (const q of frags) { const k = Math.round(q.bottom); const l = byBottom.get(k); if (l) l.top = Math.min(l.top, q.top); else byBottom.set(k, { top: q.top, bottom: q.bottom }); }
    const rough = judge([...byBottom.values()].map((l) => ({ ...l, m: whole })));
    let res = rough, extent = rough;
    if (rough.worst && byBottom.size > 1) {
      // The conservative estimate flags a cut: measure each line's own characters.
      const lines = new Map();
      const L = Math.min(text.length, 400);
      for (let i = 0; i < L; i++) {
        range.setStart(n, i); range.setEnd(n, i + 1);
        const b = range.getBoundingClientRect(); if (!b.height) continue;
        const key = Math.round(b.bottom);
        const line = lines.get(key) || { top: b.top, bottom: b.bottom, chars: '' };
        line.chars += text[i]; lines.set(key, line);
      }
      if (lines.size) res = judge([...lines.values()].map((l) => ({ ...l, m: ctx.measureText(drawn(l.chars.trim() || l.chars)) })));
      // the exact extent only when every character was measured; past 400, the rough one covers all the lines
      if (text.length <= 400) extent = res;
    }
    if (opts.mark && Number.isFinite(extent.inkTop)) {
      const prev = inkOf.get(el);
      inkOf.set(el, prev ? [Math.min(prev[0], extent.inkTop + sy), Math.max(prev[1], extent.inkBottom + sy)] : [extent.inkTop + sy, extent.inkBottom + sy]);
    }
    if (res.worst) {
      const fs = parseFloat(c.fontSize);
      // One key per element (its first reported text node), so a caller can match the element's other runs too.
      const k = +(el.getAttribute('data-audit-ink-k') ?? out.length);
      if (opts.mark && !el.hasAttribute('data-audit-ink-k')) el.setAttribute('data-audit-ink-k', String(k));
      out.push({ k, selector: sel(el), clipper: clipper === el ? 'self' : sel(clipper), text: text.replace(/\s+/g, ' ').trim().slice(0, 40), font: `${c.fontSize} ${c.fontFamily.split(',')[0].replace(/["']/g, '').trim()}`,
        lineHeight: c.lineHeight === 'normal' ? 'normal' : +(parseFloat(c.lineHeight) / fs).toFixed(2), boxHeight: Math.round(cr.height), scroller, ...res.worst });
    }
  }
  if (opts.mark) for (const [el, [a, b]] of inkOf) el.setAttribute('data-audit-ink', `${a.toFixed(1)},${b.toFixed(1)}`);
  return { checked, clipped: out, ms: Math.round(performance.now() - t0) };
}
