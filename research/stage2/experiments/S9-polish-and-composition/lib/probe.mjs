// Polish probe (v2, after review). Runs in the page: page.evaluate(probePage, { primary }) and reports finish
// details a script can check. Each check returns { kind, flag, value, detail }:
//   kind 'defect'   an error nobody intends (non-concentric nesting at gap <= R, no visible focus ring, a triangle
//                   centred by its box, proportional figures in a number column, a lone last word, an icon off the
//                   text it sits beside, a heading nearer the previous group than its own, edges 1-4 px apart)
//   kind 'question' a style choice a mature system may make on purpose (pure greys, opaque borders, unlayered
//                   shadows, loose display leading, centred headings, many accent-coloured elements, un-hung bullets,
//                   an unframed light image, a mixed icon set). A flag is a question for the polish pass, not a fault.
//   kind 'info'     a measurement with no flag (scale ratio, font smoothing, corner-shape use)
// No class names from any one page: structure, computed style and roles only. The primary action can be named with
// opts.primary (a selector); otherwise it is the most saturated filled control in the first viewport.
export function probePage(opts) {
  const primarySel = (opts && opts.primary) || null;
  const px = (v) => parseFloat(v) || 0;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && px(cs.opacity) > 0; };
  // visually hidden text (the clip / clip-path / 1 px box patterns every sr-only utility uses)
  const hidden = (el) => { for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); const r = a.getBoundingClientRect(); if (cs.display === 'none' || cs.visibility === 'hidden') return true; if (/^rect\(0/.test(cs.clip) || /inset\(50%\)/.test(cs.clipPath) || ((cs.position === 'absolute' || cs.position === 'fixed') && (r.width <= 2 || r.height <= 2) && cs.overflow === 'hidden')) return true; } return false; };
  const name = (el) => el.tagName.toLowerCase() + (el.classList && el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1; const cx1 = cvs.getContext('2d', { willReadFrequently: true });
  const memo = new Map();
  const rgba = (s) => {
    s = String(s); if (!s || s === 'none') return null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    if (memo.has(s)) return memo.get(s);
    // oklch(), color-mix() and other computed forms: paint one pixel and read it back
    cx1.clearRect(0, 0, 1, 1); cx1.fillStyle = '#000'; cx1.fillStyle = s; cx1.fillRect(0, 0, 1, 1);
    const d = cx1.getImageData(0, 0, 1, 1).data; const v = d[3] ? { r: Math.round(d[0] * 255 / d[3]), g: Math.round(d[1] * 255 / d[3]), b: Math.round(d[2] * 255 / d[3]), a: +(d[3] / 255).toFixed(3) } : { r: 0, g: 0, b: 0, a: 0 };
    memo.set(s, v); return v;
  };
  const COLOR_RE = /(rgba?|oklch|oklab|lab|lch|hsla?|color)\([^()]*(\([^()]*\)[^()]*)*\)|#[0-9a-f]{3,8}\b/gi;
  const stops = (bgImage) => (bgImage && bgImage !== 'none' ? (bgImage.match(COLOR_RE) || []).map(rgba).filter((c) => c && c.a > 0.5) : []);
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const oklab = ({ r, g, b }) => {
    const R = toLin(r), G = toLin(g), B = toLin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const oklabC = (c) => { const [, a, b] = oklab(c); return Math.hypot(a, b); };
  const okDist = (c1, c2) => { const p = oklab(c1), q = oklab(c2); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  const lum = ({ r, g, b }) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const all = [...document.querySelectorAll('body *')].filter(vis);
  const vh = innerHeight;
  const res = {};
  const ctx = document.createElement('canvas').getContext('2d');
  const fontOf = (el) => { const cs = getComputedStyle(el); return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };
  const textNodes = (host) => { const out = []; const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() && !n.parentElement.closest('svg') && !hidden(n.parentElement) ? 1 : 3) }); for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n); return out; };
  const isLogo = (el) => !!el.closest('[class*="logo" i], [class*="brand" i], [id*="logo" i], [aria-label*="logo" i], [rel="home"], a[href="/"], a[href="./"], a[href="index.html"]');

  // ---- 1. Icon family (question): rendered stroke width, outline vs filled, size relative to the text beside it.
  const icons = [...document.querySelectorAll('svg')].filter((s) => vis(s) && !hidden(s) && !isLogo(s))
    .filter((s) => { const r = s.getBoundingClientRect(); return r.width >= 8 && r.width <= 48; });
  const discOf = (s) => { const c = s.parentElement; const cr = c.getBoundingClientRect(); return px(getComputedStyle(c).borderTopLeftRadius) >= Math.min(cr.width, cr.height) / 2 - 1 && Math.abs(cr.width - cr.height) < 2 ? c : null; };
  const iconRows = icons.map((s) => {
    const r = s.getBoundingClientRect();
    const vb = s.viewBox?.baseVal; const scale = vb && vb.width ? r.width / vb.width : 1;
    let stroked = 0, filled = 0; const strokes = [];
    for (const sh of s.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse')) {
      const cs = getComputedStyle(sh);
      const f = cs.fill !== 'none' && rgba(cs.fill)?.a !== 0; const st = cs.stroke !== 'none' && px(cs.strokeWidth) > 0;
      if (f && !st) filled++; if (st) { stroked++; strokes.push(cs.vectorEffect === 'non-scaling-stroke' ? px(cs.strokeWidth) : px(cs.strokeWidth) * scale); }
    }
    const textSize = px(getComputedStyle(s.parentElement).fontSize);
    return { icon: name(s.parentElement) + ' > svg', size: +r.width.toFixed(1), textSize, ratio: +(r.width / textSize).toFixed(2), kind: filled && !stroked ? 'filled' : stroked && !filled ? 'outline' : 'mixed', stroke: strokes.length ? +Math.max(...strokes).toFixed(2) : null, media: !!discOf(s) };
  });
  const strokesR = iconRows.map((i) => i.stroke).filter((x) => x != null);
  const kinds = [...new Set(iconRows.filter((i) => !i.media).map((i) => i.kind))];
  const ratios = iconRows.filter((i) => i.size <= 24 && !i.media).map((i) => i.ratio);
  const strokeSpread = strokesR.length ? Math.max(...strokesR) - Math.min(...strokesR) : 0;
  const ratioSpread = ratios.length ? Math.max(...ratios) - Math.min(...ratios) : 0;
  res.iconFamily = { kind: 'question', flag: strokeSpread > 0.5 || kinds.length > 1 || ratioSpread > 0.4, value: { icons: iconRows.length, strokeRange: strokesR.length ? [Math.min(...strokesR), Math.max(...strokesR)] : null, kinds, ratioRange: ratios.length ? [Math.min(...ratios), Math.max(...ratios)] : null }, detail: iconRows };

  // ---- 2. Icon optical alignment (defect): only inline icons (<= 24 px) that share a line box with visible text
  // right beside them; the drawn centre against the cap-height centre of that text.
  const align = [];
  for (const s of icons) {
    const ir = s.getBoundingClientRect();
    if (ir.width > 24 || ir.height > 24 || discOf(s)) continue;
    // the label is text in the icon's own control, list item or label (up to two levels up, never past one)
    let host = s.parentElement;
    for (let up = 0; up < 2 && host && !textNodes(host).length && !host.matches('a, button, label, li, summary, [role=button], [role=link], [role=menuitem], [role=tab]'); up++) host = host.parentElement;
    if (!host) continue;
    let hit = null;
    for (const t of textNodes(host)) {
      const fs = px(getComputedStyle(t.parentElement).fontSize);
      const range = document.createRange(); range.selectNodeContents(t);
      for (const q of range.getClientRects()) {
        const gapH = Math.max(q.left - ir.right, ir.left - q.right);
        if (q.top < ir.bottom && q.bottom > ir.top && gapH >= -1 && gapH <= 1.5 * fs) { hit = { t, q }; break; }
      }
      if (hit) break;
    }
    if (!hit) continue;
    ctx.font = fontOf(hit.t.parentElement);
    const m = ctx.measureText('H');
    const capMid = hit.q.top + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent / 2;
    let bb; try { bb = s.getBBox(); } catch { bb = null; }
    const vb = s.viewBox?.baseVal; const k = vb && vb.height ? ir.height / vb.height : 1;
    const drawnMid = bb && vb && vb.height ? ir.top + (bb.y - vb.y + bb.height / 2) * k : ir.top + ir.height / 2;
    align.push({ icon: name(s.parentElement), text: hit.t.textContent.trim().slice(0, 24), offset: +(drawnMid - capMid).toFixed(2) });
  }
  const off = align.filter((a) => Math.abs(a.offset) > 1);
  res.iconAlign = { kind: 'defect', flag: off.length > 0, value: `${off.length} of ${align.length} inline icons more than 1 px off the cap-height centre of the text beside them`, detail: align };

  // ---- 3. Asymmetric glyphs in round containers (defect): a play triangle centred by its bounding box looks
  // off-centre; its area centroid should move toward the middle (about 1/12 of the glyph's width).
  const disc = [];
  for (const s of icons) {
    const c = discOf(s); if (!c) continue;
    const shapes = [...s.querySelectorAll('path, polygon')];
    if (shapes.length !== 1) continue;
    const g = shapes[0]; let len; try { len = g.getTotalLength(); } catch { continue; }
    if (!len) continue;
    const P = []; for (let i = 0; i < 96; i++) { const p = g.getPointAtLength((i / 96) * len); P.push([p.x, p.y]); }
    let A = 0, cxA = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; const cr = x0 * y1 - x1 * y0; A += cr; cxA += (x0 + x1) * cr; }
    if (Math.abs(A) < 1e-6) continue;
    const centroidX = cxA / (3 * A);
    let bb; try { bb = s.getBBox(); } catch { continue; }
    const asym = (centroidX - (bb.x + bb.width / 2)) / bb.width; // about -0.17 for a right-pointing triangle
    if (Math.abs(asym) < 0.05) continue; // symmetric glyph: geometric centring is right
    const cr = c.getBoundingClientRect(), ir = s.getBoundingClientRect(); const vb = s.viewBox.baseVal; const k = ir.width / vb.width;
    const dx = ir.left + (bb.x - vb.x + bb.width / 2) * k - (cr.left + cr.width / 2);
    disc.push({ icon: name(c), asymmetry: +asym.toFixed(2), boxOffsetFromCentre: +dx.toFixed(2), drawnWidth: +(bb.width * k).toFixed(1) });
  }
  const boxCentred = disc.filter((d) => Math.abs(d.boxOffsetFromCentre) < 0.5);
  res.discIcons = { kind: 'defect', flag: boxCentred.length > 0, value: disc.length ? `${boxCentred.length} of ${disc.length} asymmetric glyphs in round containers centred by their box (move the glyph ~1/12 of its width away from its heavy side: a right-pointing play glyph moves right)` : 'none', detail: disc };

  // ---- 4. Shadows (question): light direction, glows, layering, tint.
  const layers = (v) => (v === 'none' ? [] : v.split(/,(?![^(]*\))/).map((l) => {
    const cm = l.match(/(rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)|#[0-9a-f]{3,8}\b/i); const color = cm ? rgba(cm[0]) : null; const nums = l.replace(cm ? cm[0] : '', '').trim().split(/\s+/).filter((x) => /^-?[\d.]+px$|^0$/.test(x)).map(px);
    return { inset: /inset/.test(l), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, color };
  }));
  const sh = all.map((el) => ({ el, L: layers(getComputedStyle(el).boxShadow).filter((l) => !l.inset && l.color && l.color.a > 0 && (l.blur > 0 || l.x || l.y)) })).filter((x) => x.L.length);
  const flat = sh.flatMap((x) => x.L);
  const xs = new Set(flat.map((l) => Math.sign(l.x))), ys = new Set(flat.map((l) => Math.sign(l.y)));
  const glows = sh.filter((x) => x.L.some((l) => l.x === 0 && l.y === 0 && l.blur >= 8)).map((x) => name(x.el));
  const tinted = flat.filter((l) => oklabC(l.color) > 0.01).length;
  const layered = sh.filter((x) => x.L.length >= 2).length;
  res.shadows = { kind: 'question', flag: xs.size > 1 || [...ys].some((y) => y < 0) || glows.length > 0, value: { elements: sh.length, distinct: new Set(sh.map((x) => getComputedStyle(x.el).boxShadow)).size, xSigns: [...xs], ySigns: [...ys], glows }, detail: sh.map((x) => ({ el: name(x.el), shadow: getComputedStyle(x.el).boxShadow })).slice(0, 12) };
  res.shadowFinish = { kind: 'question', flag: sh.length > 0 && (layered / sh.length < 0.5 || tinted === 0), value: `layered ${layered}/${sh.length}, tinted layers ${tinted}/${flat.length}` };

  // ---- 5. Concentric radii (defect). All four corners, the nearest painted rounded ancestor, pills and discs
  // skipped (a role, not a nesting). Flag only at gap <= R, where the rule inner = R - gap applies; a child farther
  // in (R < gap <= 1.5 R) is listed as information, as audit.mjs excludes it by design.
  const nonConc = [], farIn = [];
  const painted = (cs) => (rgba(cs.backgroundColor)?.a ?? 0) > 0 || px(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
  const rounded = new Set(all.filter((el) => { const cs = getComputedStyle(el); return px(cs.borderTopLeftRadius) > 0 && painted(cs); }));
  for (const c of rounded) {
    const cr = c.getBoundingClientRect(); const r = px(getComputedStyle(c).borderTopLeftRadius);
    if (r >= Math.min(cr.height, cr.width) / 2 - 1) continue;
    let p = c.parentElement; while (p && p !== document.body && !rounded.has(p)) p = p.parentElement;
    if (!p || p === document.body) continue;
    const pr = p.getBoundingClientRect(); const R = px(getComputedStyle(p).borderTopLeftRadius);
    if (R >= Math.min(pr.height, pr.width) / 2 - 1) continue;
    const corners = [[cr.left - pr.left, cr.top - pr.top], [pr.right - cr.right, cr.top - pr.top], [cr.left - pr.left, pr.bottom - cr.bottom], [pr.right - cr.right, pr.bottom - cr.bottom]];
    for (const [dx, dy] of corners) {
      if (dx < 0 || dy < 0 || dx > R * 1.5 + 2 || dy > R * 1.5 + 2) continue;
      const gap = Math.min(dx, dy); const want = Math.max(0, R - gap);
      if (r - want <= 4) continue;
      const row = `${name(c)} r${+r.toFixed(1)} in ${name(p)} r${+R.toFixed(1)}, gap ${gap.toFixed(0)} (want ~${want.toFixed(0)})`;
      (gap <= R ? nonConc : farIn).push(row); break;
    }
  }
  res.concentric = { kind: 'defect', flag: nonConc.length > 0, value: `${nonConc.length} nested corners not concentric at gap <= R; ${farIn.length} more at R < gap <= 1.5 R (information)`, detail: { defects: [...new Set(nonConc)].slice(0, 12), farIn: [...new Set(farIn)].slice(0, 12) } };

  // ---- 6. Borders (question): opaque grey container borders, and a border under a single soft shadow.
  const control = (el) => /^(input|select|textarea|button|fieldset|legend|a|summary|option|hr|img)$/i.test(el.tagName) || el.getAttribute('role') === 'button' || !!el.closest('button, a, [role=button]');
  const bordered = all.filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return px(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none' && (rgba(cs.borderTopColor)?.a ?? 0) > 0 && !control(el) && px(cs.borderTopLeftRadius) < r.height / 2 - 1; });
  const opaqueGrey = bordered.filter((el) => { const c = rgba(getComputedStyle(el).borderTopColor); return c.a === 1 && oklabC(c) < 0.01; });
  const ghost = bordered.filter((el) => { const L = layers(getComputedStyle(el).boxShadow).filter((l) => !l.inset && l.color?.a > 0); const c = rgba(getComputedStyle(el).borderTopColor); return L.length === 1 && L[0].blur >= 6 && c.a === 1 && oklabC(c) < 0.01; });
  res.borders = { kind: 'question', flag: ghost.length > 0 || (bordered.length > 0 && opaqueGrey.length === bordered.length), value: `${bordered.length} bordered containers, ${opaqueGrey.length} opaque grey, ${ghost.length} with an opaque grey border under one soft shadow`, detail: ghost.slice(0, 8).map(name) };

  // ---- 7. Figures in columns (defect): numbers in table cells or right-aligned number slots set in proportional
  // figures, when the face's default figures are proportional.
  const numEls = all.filter((el) => el.children.length === 0 && /^[£$€¥+\-−]?[\d][\d.,:]*\s?%?$/.test(el.textContent.trim()) && (el.closest('td, th') || el.matches('[data-num], data, output') || getComputedStyle(el).textAlign === 'right' || getComputedStyle(el).textAlign === 'end'));
  const propDigits = (el) => { ctx.font = fontOf(el); return Math.abs(ctx.measureText('1111').width - ctx.measureText('0000').width) > 0.5; };
  const notTab = numEls.filter((el) => !/tabular-nums/.test(getComputedStyle(el).fontVariantNumeric) && propDigits(el));
  res.figures = { kind: 'defect', flag: notTab.length > 0, value: `${notTab.length} of ${numEls.length} number slots in columns set in proportional figures`, detail: notTab.slice(0, 6).map((e) => `${name(e)} "${e.textContent.trim()}"`) };

  // ---- 8. Lone last words (defect): a heading, paragraph or list item whose last line is under a quarter of the
  // line above. Heading wrap settings are information.
  // lines of an element from its visible text nodes only (element boxes, icons and swatches do not make lines)
  const lines = (el) => { const L = []; for (const t of textNodes(el)) { const r = document.createRange(); r.selectNodeContents(t); for (const q of r.getClientRects()) { if (!q.width || !q.height) continue; const mid = (q.top + q.bottom) / 2; const l = L.find((x) => mid > x.top && mid < x.bottom); if (l) { l.left = Math.min(l.left, q.left); l.right = Math.max(l.right, q.right); } else L.push({ top: q.top, bottom: q.bottom, left: q.left, right: q.right }); } } return L.sort((a, b) => a.top - b.top); };
  const heads = all.filter((el) => /^H[1-3]$/.test(el.tagName) || el.matches('blockquote, blockquote p'));
  const unbalanced = heads.filter((el) => !/balance|pretty/.test(getComputedStyle(el).textWrapStyle || getComputedStyle(el).textWrap));
  const shortLast = all.filter((el) => /^(H[1-3]|P|LI|BLOCKQUOTE)$/.test(el.tagName) && !hidden(el) && !el.querySelector('button, input, select, textarea, [role=button]')).filter((el) => { const L = lines(el); if (L.length < 2) return false; const last = L.at(-1), prev = L.at(-2); return (last.right - last.left) < 0.25 * (prev.right - prev.left); });
  res.wrapping = { kind: 'defect', flag: shortLast.length > 0, value: `${shortLast.length} blocks with a last line under a quarter of the line above (${heads.length - unbalanced.length} of ${heads.length} headings use text-wrap balance or pretty)`, detail: shortLast.slice(0, 8).map((e) => `${name(e)} "${e.textContent.trim().slice(0, 40)}"`) };

  // ---- 9. Display setting (question): leading at display sizes. Tracking is reported, not flagged: in the lab
  // tightening it re-broke the headline.
  const disp = all.filter((el) => px(getComputedStyle(el).fontSize) >= 40 && !/^inline/.test(getComputedStyle(el).display) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && lines(el).length >= 2);
  const dispRows = disp.map((el) => { const cs = getComputedStyle(el); const fs = px(cs.fontSize); return { el: name(el), size: fs, trackingEm: +(px(cs.letterSpacing) / fs).toFixed(3), leading: cs.lineHeight === 'normal' ? 'normal' : +(px(cs.lineHeight) / fs).toFixed(2) }; });
  res.displayType = { kind: 'question', flag: dispRows.some((d) => d.leading === 'normal' || d.leading > 1.2), value: dispRows.length ? dispRows.map((d) => `${d.el} ${d.size}px leading ${d.leading} tracking ${d.trackingEm}em`).join('; ') : 'no multi-line display text' };

  // ---- 10. Hanging bullets and quotes (question): the text edge of lists and quotes against the text above.
  const hang = [];
  for (const q of all.filter((el) => el.matches('blockquote, blockquote p') && /^[“"‘'«]/.test(el.textContent.trim()) && !el.querySelector('p'))) hang.push({ el: name(q), hung: px(getComputedStyle(q).textIndent) < 0 });
  for (const list of all.filter((el) => /^(UL|OL)$/.test(el.tagName) && !el.closest('nav, [role=navigation], table') && getComputedStyle(el).display !== 'flex' && getComputedStyle(el).display !== 'grid')) {
    const prev = list.previousElementSibling; const li = list.querySelector('li'); if (!prev || !li || !/^(H[1-6]|P)$/.test(prev.tagName)) continue;
    const t = textNodes(li)[0]; if (!t) continue;
    const rr = document.createRange(); rr.selectNodeContents(t); const tx = rr.getClientRects()[0]?.left;
    const pr = document.createRange(); pr.selectNodeContents(prev); const px0 = pr.getClientRects()[0]?.left;
    if (tx == null || px0 == null) continue;
    const indent = tx - px0;
    if (Math.abs(indent) >= 1 && px0 < indent + 4) { hang.push({ el: name(list), textIndentFromAbove: +indent.toFixed(1), hung: true, note: 'no margin to hang into' }); continue; }
    hang.push({ el: name(list), textIndentFromAbove: +indent.toFixed(1), hung: Math.abs(indent) < 1 });
  }
  res.hanging = { kind: 'question', flag: hang.some((h) => !h.hung), value: `${hang.filter((h) => !h.hung).length} of ${hang.length} lists and quotes with the text edge indented past the edge above`, detail: hang };

  // ---- 11. Accent restraint (question): elements in the first viewport painted in the primary action's colour.
// Form controls, logos and the text of plain links are not counted.
  // The primary is opts.primary, or the most saturated filled control in the first viewport (fill or gradient).
  const fills = (el) => { const cs = getComputedStyle(el); const bg = rgba(cs.backgroundColor); return [...(bg && bg.a > 0.5 ? [bg] : []), ...stops(cs.backgroundImage)]; };
  const controls = all.filter((el) => el.matches('a, button, [role=button], input[type=submit], input[type=button]') && el.getBoundingClientRect().top < vh && el.getBoundingClientRect().height >= 24);
  let primary = primarySel ? document.querySelector(primarySel) : null; let how = primarySel ? `selector ${primarySel}` : '';
  if (!primary) {
    const cand = controls.map((el) => { const f = fills(el); const C = f.length ? Math.max(...f.map(oklabC)) : 0; const r = el.getBoundingClientRect(); return { el, C, area: r.width * r.height }; }).filter((x) => x.C > 0).sort((a, b) => b.C - a.C || b.area - a.area);
    if (cand[0]) { primary = cand[0].el; how = 'most saturated filled control in the first viewport'; }
  }
  const acc = primary ? fills(primary).filter((c) => oklabC(c) >= 0.04) : [];
  const same = (c) => c && c.a > 0.5 && oklabC(c) >= 0.04 && acc.some((a) => okDist(a, c) < 0.06);
  const formCtl = (el) => /^(input|select|textarea|fieldset|legend|option|label)$/i.test(el.tagName);
  const accentEls = acc.length ? all.filter((el) => el !== primary && !primary.contains(el) && !el.contains(primary) && !formCtl(el) && !isLogo(el) && el.getBoundingClientRect().top < vh && (() => {
    const cs = getComputedStyle(el);
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const cands = [];
    // text links keep their link colour: the colour of a plain (unfilled, unbordered) link's text is not counted
    const link = el.closest('a'); const plainLink = link && !fills(link).length && !(px(getComputedStyle(link).borderTopWidth) > 0);
    if ((ownText || el instanceof SVGElement) && !plainLink) cands.push(rgba(cs.color), rgba(cs.fill), rgba(cs.stroke));
    if (px(cs.borderTopWidth) > 0) cands.push(rgba(cs.borderTopColor));
    cands.push(...fills(el));
    return cands.some(same);
  })()) : [];
  // an element and its own painted child count once
  const tops = accentEls.filter((el) => !accentEls.some((o) => o !== el && o.contains(el)));
  res.accent = { kind: 'question', flag: tops.length > 3, value: acc.length ? `${tops.length} elements in the first viewport in the primary action's colour (primary: ${name(primary)}, by ${how})` : primary ? `primary action (${name(primary)}) is not chromatic: accent count not applicable` : 'no filled primary action found in the first viewport', detail: tops.slice(0, 12).map(name) };

  // ---- 12. Neutrals (question): are the greys pure (chroma ~0) or tinted? (design-theory.md B5 asks for tinted.)
  const greys = new Map();
  for (const el of all) { const cs = getComputedStyle(el); for (const k of ['color', 'backgroundColor', 'borderTopColor']) { if (k === 'borderTopColor' && !(px(cs.borderTopWidth) > 0)) continue; const c = rgba(cs[k]); if (!c || c.a < 0.99) continue; const L = lum(c); if (L > 0.97 || L < 0.002) continue; const C = oklabC(c); if (C < 0.03) greys.set(`${c.r},${c.g},${c.b}`, C); } }
  const pure = [...greys.values()].filter((C) => C < 0.002).length;
  res.neutrals = { kind: 'question', flag: greys.size > 0 && pure / greys.size > 0.5, value: `${pure} of ${greys.size} grey colours in use are pure grey (OKLab chroma < 0.002)` };

  // ---- 13. Images (question): light-edged images on a light ground with no edge.
  const imgs = [];
  for (const img of all.filter((el) => el.tagName === 'IMG' && el.complete && el.naturalWidth)) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d', { willReadFrequently: true });
    try { x.drawImage(img, 0, 0, 64, 64); x.getImageData(0, 0, 1, 1); } catch { continue; }
    const d = x.getImageData(0, 0, 64, 64).data; let s = 0, n = 0;
    for (let i = 0; i < 64; i++) for (const [px0, py] of [[i, 0], [i, 63], [0, i], [63, i]]) { const j = (py * 64 + px0) * 4; s += lum({ r: d[j], g: d[j + 1], b: d[j + 2] }); n++; }
    const edge = s / n;
    let g = img.parentElement, bg = null; while (g && !bg) { const c2 = rgba(getComputedStyle(g).backgroundColor); if (c2 && c2.a > 0.5) bg = c2; g = g.parentElement; }
    const ground = bg ? lum(bg) : 1;
    const framed = [img, img.parentElement].some((e) => { const cs = getComputedStyle(e); const after = getComputedStyle(e, '::after'); return (cs.outlineStyle !== 'none' && px(cs.outlineWidth) > 0) || px(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none' || (after.content !== 'none' && after.boxShadow !== 'none'); });
    imgs.push({ img: (img.getAttribute('src') || '').slice(0, 60), edgeLum: +edge.toFixed(2), groundLum: +ground.toFixed(2), framed });
  }
  res.imageEdges = { kind: 'question', flag: imgs.some((i) => i.edgeLum > 0.8 && i.groundLum > 0.8 && !i.framed), value: `${imgs.filter((i) => i.edgeLum > 0.8 && i.groundLum > 0.8 && !i.framed).length} light-edged images on a light ground with no edge`, detail: imgs };

  // ---- 14. Edges (defect) and alignment (question). Left edges of text blocks outside components: 1-4 px apart
  // is an error; 5-24 px apart, and centred headings over left-aligned content below, are choices to confirm.
  const inComponent = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (px(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none' || ((rgba(cs.backgroundColor)?.a ?? 0) > 0.5 && a.getBoundingClientRect().width < innerWidth * 0.9)) return true; } return false; };
  const blocks = all.filter((el) => /^(H1|H2|H3|P)$/.test(el.tagName) && getComputedStyle(el).textAlign !== 'center' && !inComponent(el) && !hidden(el));
  const edgeOf = (el) => { const t = textNodes(el)[0]; if (!t) return null; const r = document.createRange(); r.selectNodeContents(t); const q = r.getClientRects()[0]; if (!q) return null; const rtl = getComputedStyle(el).direction === 'rtl'; return { dir: rtl ? 'rtl' : 'ltr', x: Math.round(rtl ? q.right : q.left) }; };
  const near = [], offset = [];
  for (const dir of ['ltr', 'rtl']) {
    const edges = [...new Set(blocks.map(edgeOf).filter((e) => e && e.dir === dir).map((e) => e.x))].sort((a, b) => a - b);
    for (let i = 1; i < edges.length; i++) { const d = edges[i] - edges[i - 1]; if (d >= 1 && d <= 4) near.push([dir, edges[i - 1], edges[i]]); else if (d > 4 && d <= 24) offset.push([dir, edges[i - 1], edges[i]]); }
  }
  res.edges = { kind: 'defect', flag: near.length > 0, value: `${near.length} pairs of text start edges 1-4 px apart (left edges for left-to-right text, right edges for right-to-left)`, detail: near };
  const leftBelow = (el) => { const nx = el.nextElementSibling || el.parentElement.nextElementSibling; if (!nx) return false; const kids = nx.children.length >= 2 ? [...nx.children] : [nx]; return kids.some((k) => getComputedStyle(k).textAlign !== 'center' && textNodes(k).length); };
  const centred = all.filter((el) => /^(H2|H3)$/.test(el.tagName) && getComputedStyle(el).textAlign === 'center' && leftBelow(el));
  res.alignment = { kind: 'question', flag: offset.length > 0 || centred.length > 0, value: `${offset.length} text edges 5-24 px from another, ${centred.length} centred headings over left-aligned content`, detail: { offset, centred: centred.slice(0, 8).map(name) } };

  // ---- 15. Proximity (defect): a heading should sit closer to what it introduces than to what precedes it.
  // - A short one-line label directly above (eyebrow, kicker, step number) that sits nearer the heading than whatever
  //   precedes it is part of the heading.
  // - Out-of-flow elements (absolute, fixed) are skipped.
  // - A heading that opens a painted container (its own background, border or shadow) is skipped: the container's
  //   edge makes the group, not the spacing; so is a heading whose predecessor sits in the same card or panel.
  const inFlow = (e) => vis(e) && !/^(absolute|fixed)$/.test(getComputedStyle(e).position) && !hidden(e);
  const bgOf = (e) => { for (let a = e; a; a = a.parentElement) { const c = rgba(getComputedStyle(a).backgroundColor); if (c && c.a > 0.5) return `${c.r},${c.g},${c.b}`; } return '255,255,255'; };
  const boxed = (e) => { const cs = getComputedStyle(e); return px(cs.borderTopWidth) > 0 || px(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none' || ((rgba(cs.backgroundColor)?.a ?? 0) > 0.5 && e.parentElement && bgOf(e) !== bgOf(e.parentElement)); };
  const before = (el) => { let crossed = false; for (let a = el; a && a !== document.body; a = a.parentElement) { let s = a.previousElementSibling; while (s && !inFlow(s)) s = s.previousElementSibling; if (s) return { prev: s, crossed }; if (a.parentElement && a.parentElement !== document.body && boxed(a.parentElement)) crossed = true; } return { prev: null, crossed }; };
  const gapAbove = (e, p) => e.getBoundingClientRect().top - p.getBoundingClientRect().bottom;
  const shortLine = (e) => { const t = e.textContent.trim(); return !/^(H[1-6]|A|BUTTON|UL|OL|TABLE|IMG|SVG|FIGURE|FORM|FIELDSET)$/i.test(e.tagName) && t.length > 0 && t.length <= 60 && e.querySelectorAll('*').length <= 2 && lines(e).length === 1; };
  const prox = [];
  for (const h of all.filter((el) => /^H[23]$/.test(el.tagName) && inFlow(el))) {
    let next = h.nextElementSibling; while (next && !inFlow(next)) next = next.nextElementSibling;
    if (!next) continue;
    let top = h; let { prev, crossed } = before(h);
    if (prev && !crossed && prev.parentElement === h.parentElement && shortLine(prev)) {
      const b2 = before(prev);
      if (!b2.prev || b2.crossed || gapAbove(prev, b2.prev) < 0 || gapAbove(h, prev) < gapAbove(prev, b2.prev)) { top = prev; ({ prev, crossed } = b2); }
    }
    if (!prev || crossed) continue;
    // inside a component (a card or panel narrower than the page) the container makes the group: skip
    let comp = null; for (let a = h.parentElement; a && a !== document.body && !comp; a = a.parentElement) if (boxed(a) && a.getBoundingClientRect().width < innerWidth * 0.9) comp = a;
    if (comp && comp.contains(prev)) continue;
    const above = gapAbove(top, prev);
    if (above < 0) continue; // side by side, not above
    const below = next.getBoundingClientRect().top - h.getBoundingClientRect().bottom;
    prox.push({ el: name(h), text: h.textContent.trim().slice(0, 30), label: top !== h ? top.textContent.trim().slice(0, 20) : null, above: Math.round(above), below: Math.round(below) });
  }
  const badProx = prox.filter((p) => p.below >= p.above);
  res.proximity = { kind: 'defect', flag: badProx.length > 0, value: `${badProx.length} of ${prox.length} headings as close to or closer to what precedes them than to what they introduce`, detail: badProx };

  // ---- information
  const firstVp = all.filter((el) => el.getBoundingClientRect().top < vh && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const maxFs = Math.max(...firstVp.map((el) => px(getComputedStyle(el).fontSize)));
  const bodyFs = px(getComputedStyle(document.body).fontSize) || 16;
  res.scale = { kind: 'info', flag: false, value: `largest text in the first viewport ${maxFs}px = ${(maxFs / bodyFs).toFixed(2)} x body` };
  const smooth = getComputedStyle(document.documentElement).webkitFontSmoothing;
  res.smoothing = { kind: 'info', flag: false, value: `-webkit-font-smoothing: ${smooth || 'auto'} (changes rendering on macOS only)` };
  res.cornerShape = { kind: 'info', flag: false, value: `${all.filter((el) => !/^round/.test(getComputedStyle(el).getPropertyValue('corner-shape') || 'round')).length} elements with a non-round corner-shape` };
  return res;
}

// Node side (returns two checks, focusRing and focusRingDefault): the keyboard focus ring. Real Tab presses; for each focused control, compare its focused and
// unfocused styles (outline, box-shadow, border, background, colour, underline, ::before/::after) as audit.mjs does.
// Defect: a control with no visible change on focus, or the default ring (outline-style: auto, drawn round) on an
// element with a non-round corner-shape. Question: how many controls show the browser's default ring.
export async function focusChecks(page, n = 8) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const rows = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const row = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      if (e.hasAttribute('data-probe-seen')) return 'wrapped';
      e.setAttribute('data-probe-seen', '');
      const settle = (x) => { for (const a of x.getAnimations?.({ subtree: true }) ?? []) { try { a.finish(); } catch { /* infinite */ } } };
      const ring = (cs) => [cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineStyle + cs.outlineWidth + cs.outlineColor : 'none', cs.boxShadow, cs.borderColor, cs.backgroundColor, cs.color, cs.textDecorationLine];
      const fp = (x) => { settle(x); const own = ring(getComputedStyle(x)); const ps = ['::before', '::after'].map((p) => { const c = getComputedStyle(x, p); return c.content === 'none' || c.content === 'normal' ? '' : ring(c).concat(c.opacity).join('|'); }); return own.concat(ps); };
      const cs = getComputedStyle(e);
      const style = cs.outlineStyle; const shape = cs.getPropertyValue('corner-shape') || 'round';
      const focused = fp(e); e.blur(); const unfocused = fp(e); e.focus({ preventScroll: true });
      const names = ['outline', 'box-shadow', 'border', 'background', 'colour', 'underline', '::before', '::after'];
      return { el: e.tagName.toLowerCase() + (e.classList.length ? '.' + e.classList[0] : '') + (e.textContent.trim() ? ` "${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 20)}"` : ''), style, changed: names.filter((_, i) => focused[i] !== unfocused[i]), autoOnShape: style === 'auto' && !/^round/.test(shape) };
    });
    if (row === 'wrapped') break;
    rows.push(row);
  }
  await page.evaluate(() => document.querySelectorAll('[data-probe-seen]').forEach((e) => e.removeAttribute('data-probe-seen')));
  const r = rows.filter(Boolean);
  const none = r.filter((x) => !x.changed.length), onShape = r.filter((x) => x.autoOnShape), auto = r.filter((x) => x.style === 'auto');
  return {
    focusRing: { kind: 'defect', flag: none.length > 0 || onShape.length > 0, value: `${none.length} of ${r.length} focused controls show no visible change; ${onShape.length} show the default ring on a non-round corner-shape`, detail: r },
    focusRingDefault: { kind: 'question', flag: auto.length > 0, value: `${auto.length} of ${r.length} focused controls use the browser's default ring (outline-style: auto)` },
  };
}

// Group a probe result for printing: defects, then style questions, then information.
export function grouped(r) {
  const g = { defect: [], question: [], info: [] };
  for (const [k, x] of Object.entries(r)) (g[x.kind] || g.info).push([k, x]);
  return g;
}
