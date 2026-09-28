// polish probe: runs in the page (page.evaluate(probePage)) and reports the finish details a script can check.
// Each check returns { flag, value, detail }. flag = the finish problem is present. Facts, not taste: a flag is
// a question for the polish pass, never a rule to obey blindly.
export function probePage() {
  const px = (v) => parseFloat(v) || 0;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && px(cs.opacity) > 0; };
  const name = (el) => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1; const cx1 = cvs.getContext('2d', { willReadFrequently: true });
  const memo = new Map();
  const rgba = (s) => {
    s = String(s); if (!s || s === 'none') return null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    if (memo.has(s)) return memo.get(s);
    // oklch(), color-mix() and other computed forms: paint one pixel and read it back (alpha from the form's "/ a")
    cx1.clearRect(0, 0, 1, 1); cx1.fillStyle = '#000'; cx1.fillStyle = s; cx1.fillRect(0, 0, 1, 1);
    const d = cx1.getImageData(0, 0, 1, 1).data; const v = d[3] ? { r: Math.round(d[0] * 255 / d[3]), g: Math.round(d[1] * 255 / d[3]), b: Math.round(d[2] * 255 / d[3]), a: +(d[3] / 255).toFixed(3) } : { r: 0, g: 0, b: 0, a: 0 };
    memo.set(s, v); return v;
  };
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const oklabC = ({ r, g, b }) => { // chroma in OKLab
    const R = toLin(r), G = toLin(g), B = toLin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return Math.hypot(a, bb);
  };
  const lum = ({ r, g, b }) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const all = [...document.querySelectorAll('body *')].filter(vis);
  const vh = innerHeight;
  const res = {};
  const ctx = document.createElement('canvas').getContext('2d');
  const fontOf = (el) => { const cs = getComputedStyle(el); return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };

  // 1. Icon family: rendered stroke width, outline vs filled, size relative to the text beside it.
  const icons = [...document.querySelectorAll('svg')].filter((s) => vis(s) && !s.closest('.brand, [class*="logo" i], a[href="/"]'))
    .filter((s) => { const r = s.getBoundingClientRect(); return r.width >= 8 && r.width <= 48; });
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
    const pr = s.parentElement.getBoundingClientRect();
    const media = px(getComputedStyle(s.parentElement).borderTopLeftRadius) >= pr.width / 2 - 1; // a glyph in a disc (play, avatar)
    return { icon: name(s.parentElement) + ' > svg', size: +r.width.toFixed(1), textSize, ratio: +(r.width / textSize).toFixed(2), kind: filled && !stroked ? 'filled' : stroked && !filled ? 'outline' : 'mixed', stroke: strokes.length ? +Math.max(...strokes).toFixed(2) : null, media };
  });
  const strokesR = iconRows.map((i) => i.stroke).filter((x) => x != null);
  const kinds = [...new Set(iconRows.filter((i) => !i.media).map((i) => i.kind))];
  const inline = iconRows.filter((i) => i.size <= 24 && !i.media);
  const ratios = inline.map((i) => i.ratio);
  const strokeSpread = strokesR.length ? Math.max(...strokesR) - Math.min(...strokesR) : 0;
  const ratioSpread = ratios.length ? Math.max(...ratios) - Math.min(...ratios) : 0;
  res.iconFamily = { flag: strokeSpread > 0.5 || kinds.length > 1 || ratioSpread > 0.4, value: { strokeRange: strokesR.length ? [Math.min(...strokesR), Math.max(...strokesR)] : null, kinds, ratioRange: ratios.length ? [Math.min(...ratios), Math.max(...ratios)] : null }, detail: iconRows };

  // 2. Optical vertical alignment: the drawn icon's centre against the cap-height centre of the text beside it.
  const align = [];
  for (const s of icons) {
    const host = s.parentElement;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() && !n.parentElement.closest('svg, .sr') ? 1 : 3) });
    const t = walker.nextNode();
    if (!t) continue;
    const range = document.createRange(); range.selectNodeContents(t);
    const line = [...range.getClientRects()][0];
    if (!line) continue;
    const ir = s.getBoundingClientRect();
    if (Math.abs(ir.top - line.top) > line.height * 1.5 && !(ir.top < line.bottom && ir.bottom > line.top)) continue; // not on the same row
    ctx.font = fontOf(t.parentElement);
    const m = ctx.measureText('H');
    const base = line.top + m.fontBoundingBoxAscent; const capMid = base - m.actualBoundingBoxAscent / 2;
    let bb; try { bb = s.getBBox(); } catch { bb = null; }
    const vb = s.viewBox?.baseVal; const k = vb && vb.width ? ir.height / vb.height : 1;
    const drawnMid = bb && vb ? ir.top + (bb.y - vb.y + bb.height / 2) * k : ir.top + ir.height / 2;
    align.push({ icon: name(host), offset: +(drawnMid - capMid).toFixed(2) });
  }
  const off = align.filter((a) => Math.abs(a.offset) > 1);
  res.iconAlign = { flag: off.length > 0, value: `${off.length} of ${align.length} icons more than 1 px off the cap-height centre of their text`, detail: align };

  // 2b. Icons in round containers (play buttons, avatars): drawn bounding-box centre against the container centre.
  const disc = [];
  for (const s of icons) {
    const c = s.parentElement; const cs = getComputedStyle(c);
    if (!(px(cs.borderTopLeftRadius) >= c.getBoundingClientRect().width / 2 - 1)) continue;
    const cr = c.getBoundingClientRect(), ir = s.getBoundingClientRect();
    let bb; try { bb = s.getBBox(); } catch { continue; }
    const vb = s.viewBox.baseVal; const k = ir.width / vb.width;
    const dx = ir.left + (bb.x - vb.x + bb.width / 2) * k - (cr.left + cr.width / 2);
    disc.push({ icon: name(c), dxFromCentre: +dx.toFixed(2), drawnWidth: +(bb.width * k).toFixed(1) });
  }
  res.discIcons = { flag: disc.some((d) => Math.abs(d.dxFromCentre) < 0.5), value: disc.length ? `${disc.filter((d) => Math.abs(d.dxFromCentre) < 0.5).length} of ${disc.length} icons in round containers centred geometrically (a triangle needs ~1/12 of its width to the right)` : 'none', detail: disc };

  // 3. Shadows: light direction, glows, layering, tint.
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
  const mixedDir = xs.size > 1 || [...ys].some((y) => y < 0) || glows.length > 0;
  res.shadows = { flag: mixedDir, value: { elements: sh.length, distinct: new Set(sh.map((x) => getComputedStyle(x.el).boxShadow)).size, xSigns: [...xs], ySigns: [...ys], glows, layeredShare: sh.length ? +(layered / sh.length).toFixed(2) : 0, tintedShare: flat.length ? +(tinted / flat.length).toFixed(2) : 0 }, detail: sh.map((x) => ({ el: name(x.el), shadow: getComputedStyle(x.el).boxShadow })) };
  res.shadowFinish = { flag: sh.length > 0 && (layered / sh.length < 0.5 || tinted === 0), value: `layered ${layered}/${sh.length}, tinted layers ${tinted}/${flat.length}` };

  // 4. Concentric radii: a rounded child near a rounded parent's corner should have about outer radius minus the gap.
  const nonConc = [];
  const painted = (cs) => (rgba(cs.backgroundColor)?.a ?? 0) > 0 || px(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
  const rounded = all.filter((el) => { const cs = getComputedStyle(el); return px(cs.borderTopLeftRadius) > 0 && painted(cs); });
  for (const c of rounded) {
    const cr = c.getBoundingClientRect(); const r = px(getComputedStyle(c).borderTopLeftRadius);
    if (r >= cr.height / 2 - 1) continue; // pills are a role, not a nesting
    let p = c.parentElement; while (p && p !== document.body && !rounded.includes(p)) p = p.parentElement; // nearest painted rounded ancestor
    if (!p || p === document.body) continue;
    const pr = p.getBoundingClientRect(); const R = px(getComputedStyle(p).borderTopLeftRadius);
    if (R >= pr.height / 2 - 1) continue;
    const corners = [[cr.left - pr.left, cr.top - pr.top], [pr.right - cr.right, cr.top - pr.top], [cr.left - pr.left, pr.bottom - cr.bottom], [pr.right - cr.right, pr.bottom - cr.bottom]];
    for (const [dx, dy] of corners) {
      if (dx < 0 || dy < 0 || dx > R * 1.5 + 2 || dy > R * 1.5 + 2) continue; // not near that corner
      const gap = Math.min(dx, dy); const want = Math.max(0, R - gap);
      if (r - want > 4) { nonConc.push(`${name(c)} r${+r.toFixed(1)} in ${name(p)} r${+R.toFixed(1)}, gap ${gap.toFixed(0)} (want ~${want.toFixed(0)})`); break; }
    }
  }
  res.concentric = { flag: nonConc.length > 0, value: `${nonConc.length} nested corners not concentric`, detail: [...new Set(nonConc)].slice(0, 12) };

  // 5. Borders: opaque grey hairlines, and the ghost card (a border under a soft shadow).
  const bordered = all.filter((el) => { const cs = getComputedStyle(el); return px(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none' && (rgba(cs.borderTopColor)?.a ?? 0) > 0 && !/^(input|select|textarea|button)$/i.test(el.tagName) && !el.matches('.btn, .chip, a'); });
  const opaqueGrey = bordered.filter((el) => { const c = rgba(getComputedStyle(el).borderTopColor); return c.a === 1 && oklabC(c) < 0.01; });
  const ghost = bordered.filter((el) => { const L = layers(getComputedStyle(el).boxShadow).filter((l) => !l.inset && l.color?.a > 0); const c = rgba(getComputedStyle(el).borderTopColor); return L.length === 1 && L[0].blur >= 6 && c.a === 1 && oklabC(c) < 0.01; });
  res.borders = { flag: ghost.length > 0 || (bordered.length > 0 && opaqueGrey.length === bordered.length), value: `${bordered.length} bordered containers, ${opaqueGrey.length} opaque grey, ${ghost.length} ghost cards (opaque grey border under one soft shadow)`, detail: ghost.map(name) };

  // 6. Figures: numbers in cells and number slots should be tabular when the face's default figures are not.
  const numEls = all.filter((el) => el.children.length === 0 && /^[£$€]?[\d.,]+%?$/.test(el.textContent.trim()) && (el.closest('td, th') || el.matches('.num, [data-num]') || getComputedStyle(el).textAlign === 'right'));
  const propDigits = (el) => { ctx.font = fontOf(el); return Math.abs(ctx.measureText('1111').width - ctx.measureText('0000').width) > 0.5; };
  const notTab = numEls.filter((el) => !/tabular-nums/.test(getComputedStyle(el).fontVariantNumeric) && propDigits(el));
  res.figures = { flag: notTab.length > 0, value: `${notTab.length} of ${numEls.length} number slots in proportional figures`, detail: notTab.slice(0, 6).map((e) => `${name(e)} "${e.textContent.trim()}"`) };

  // 7. Wrapping: headings not balanced; one-word or very short last lines in headings and paragraphs.
  const lines = (el) => { const r = document.createRange(); r.selectNodeContents(el); const L = []; for (const q of r.getClientRects()) { const l = L.find((x) => Math.abs(x.top - q.top) < 3); if (l) { l.left = Math.min(l.left, q.left); l.right = Math.max(l.right, q.right); } else L.push({ top: q.top, left: q.left, right: q.right }); } return L.sort((a, b) => a.top - b.top); };
  const heads = all.filter((el) => /^H[1-3]$/.test(el.tagName) || el.matches('.pull p'));
  const unbalanced = heads.filter((el) => !/balance|pretty/.test(getComputedStyle(el).textWrapStyle || getComputedStyle(el).textWrap));
  const shortLast = all.filter((el) => /^(H[1-3]|P|LI)$/.test(el.tagName)).filter((el) => { const L = lines(el); if (L.length < 2) return false; const last = L.at(-1), prev = L.at(-2); return (last.right - last.left) < 0.25 * (prev.right - prev.left); });
  res.wrapping = { flag: shortLast.length > 0, value: `${shortLast.length} blocks with a last line under a quarter of the line above; ${unbalanced.length} of ${heads.length} headings without text-wrap balance/pretty`, detail: shortLast.map((e) => `${name(e)} "${e.textContent.trim().slice(0, 40)}"`) };

  // 8. Display setting: tracking and leading at display sizes.
  const disp = all.filter((el) => px(getComputedStyle(el).fontSize) >= 40 && el.textContent.trim() && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const dispRows = disp.map((el) => { const cs = getComputedStyle(el); const fs = px(cs.fontSize); const block = !/^inline/.test(cs.display); return { el: name(el), size: fs, trackingEm: +(px(cs.letterSpacing) / fs).toFixed(3), leading: !block ? 'n/a' : cs.lineHeight === 'normal' ? 'normal' : +(px(cs.lineHeight) / fs).toFixed(2) }; });
  res.displayType = { flag: dispRows.some((d) => d.trackingEm >= 0 || d.leading === 'normal' || (typeof d.leading === 'number' && d.leading > 1.2)), value: dispRows.map((d) => `${d.el} ${d.size}px tracking ${d.trackingEm}em leading ${d.leading}`).join('; ') };

  // 9. Hanging punctuation and bullets: does the text edge of lists and quotes line up with the text above?
  const hang = [];
  for (const q of all.filter((el) => el.matches('blockquote p, .pull p') && /^[“"‘']/.test(el.textContent.trim()))) {
    hang.push({ el: name(q), hung: px(getComputedStyle(q).textIndent) < 0 });
  }
  for (const list of all.filter((el) => /^(UL|OL)$/.test(el.tagName))) {
    const prev = list.previousElementSibling || list.parentElement.querySelector('h1,h2,h3,p');
    const li = list.querySelector('li'); if (!prev || !li) continue;
    const tw = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? 1 : 3) }); const t = tw.nextNode(); if (!t) continue;
    const rr = document.createRange(); rr.selectNodeContents(t); const tx = rr.getClientRects()[0]?.left;
    const pr = document.createRange(); pr.selectNodeContents(prev); const px0 = pr.getClientRects()[0]?.left;
    if (tx == null || px0 == null) continue;
    const indent = tx - px0;
    // a bullet can only hang where the margin can take it (the gutter left of the column is wider than the indent)
    if (Math.abs(indent) >= 1 && px0 < indent + 4) { hang.push({ el: name(list), textIndentFromAbove: +indent.toFixed(1), hung: true, note: 'no margin to hang into' }); continue; }
    hang.push({ el: name(list), textIndentFromAbove: +indent.toFixed(1), hung: Math.abs(indent) < 1 });
  }
  res.hanging = { flag: hang.some((h) => !h.hung), value: `${hang.filter((h) => !h.hung).length} of ${hang.length} lists and quotes with the text edge indented past the edge above`, detail: hang };

  // 10. Accent restraint: elements painted in the primary action's colour.
  const primary = document.querySelector('.btn-primary, [data-primary], button[type=submit]');
  const acc = primary ? rgba(getComputedStyle(primary).backgroundColor) : null;
  const same = (c) => c && acc && c.a > 0.5 && Math.abs(c.r - acc.r) + Math.abs(c.g - acc.g) + Math.abs(c.b - acc.b) < 60;
  const accentEls = acc ? all.filter((el) => el !== primary && !primary.contains(el) && el.getBoundingClientRect().top < vh && !el.matches('a:not(.btn)') && (() => { const cs = getComputedStyle(el); return ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke'].some((k) => (k === 'borderTopColor' ? px(cs.borderTopWidth) > 0 : true) && same(rgba(cs[k]))) && (el.childNodes.length === 0 || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el instanceof SVGElement || px(cs.borderTopWidth) > 0 || rgba(cs.backgroundColor)?.a > 0.5); })()) : [];
  res.accent = { flag: accentEls.length > 3, value: `${accentEls.length} elements in the first viewport painted in the primary action's colour`, detail: accentEls.slice(0, 12).map(name) };

  // 11. Neutrals: are the greys pure (chroma ~0) or tinted?
  const greys = new Map();
  for (const el of all) { const cs = getComputedStyle(el); for (const k of ['color', 'backgroundColor', 'borderTopColor']) { if (k === 'borderTopColor' && !(px(cs.borderTopWidth) > 0)) continue; const c = rgba(cs[k]); if (!c || c.a < 0.99) continue; const L = lum(c); if (L > 0.97 || L < 0.002) continue; const C = oklabC(c); if (C < 0.03) greys.set(`${c.r},${c.g},${c.b}`, C); } }
  const pure = [...greys.values()].filter((C) => C < 0.002).length;
  res.neutrals = { flag: greys.size > 0 && pure / greys.size > 0.5, value: `${pure} of ${greys.size} grey colours in use are pure grey (OKLab chroma < 0.002)` };

  // 12. Images: light-edged images on a light ground with no edge (outline, border, shadow, inner ring).
  const imgs = [];
  for (const img of all.filter((el) => el.tagName === 'IMG' && el.complete && el.naturalWidth)) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d', { willReadFrequently: true });
    try { x.drawImage(img, 0, 0, 64, 64); } catch { continue; }
    const d = x.getImageData(0, 0, 64, 64).data; let s = 0, n = 0;
    for (let i = 0; i < 64; i++) for (const [px0, py] of [[i, 0], [i, 63], [0, i], [63, i]]) { const j = (py * 64 + px0) * 4; s += lum({ r: d[j], g: d[j + 1], b: d[j + 2] }); n++; }
    const edge = s / n;
    let g = img.parentElement, bg = null; while (g && !bg) { const c2 = rgba(getComputedStyle(g).backgroundColor); if (c2 && c2.a > 0.5) bg = c2; g = g.parentElement; }
    const ground = bg ? lum(bg) : 1;
    const framed = [img, img.parentElement].some((e) => { const cs = getComputedStyle(e); const after = getComputedStyle(e, '::after'); return (cs.outlineStyle !== 'none' && px(cs.outlineWidth) > 0) || px(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none' || (after.content !== 'none' && after.boxShadow !== 'none'); });
    imgs.push({ img: img.getAttribute('src'), edgeLum: +edge.toFixed(2), groundLum: +ground.toFixed(2), framed });
  }
  res.imageEdges = { flag: imgs.some((i) => i.edgeLum > 0.8 && i.groundLum > 0.8 && !i.framed), value: `${imgs.filter((i) => i.edgeLum > 0.8 && i.groundLum > 0.8 && !i.framed).length} light-edged images on a light ground with no edge`, detail: imgs };

  // 13. Alignment: left edges of text blocks that nearly, but not exactly, line up (1-24 px apart), and centred
  // headings above left-aligned content.
  const inComponent = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (px(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none') return true; } return false; };
  const blocks = all.filter((el) => (/^(H1|H2|H3|P)$/.test(el.tagName) || el.matches('.brand')) && getComputedStyle(el).textAlign !== 'center' && !inComponent(el));
  const edges = [...new Set(blocks.map((el) => Math.round(el.getBoundingClientRect().left)))].sort((a, b) => a - b);
  const near = []; for (let i = 1; i < edges.length; i++) if (edges[i] - edges[i - 1] >= 1 && edges[i] - edges[i - 1] <= 24) near.push([edges[i - 1], edges[i]]);
  const centred = all.filter((el) => /^(H2|H3|P)$/.test(el.tagName) && getComputedStyle(el).textAlign === 'center' && el.parentElement.querySelector('.steps, .plans, table, ul, .card'));
  res.alignment = { flag: near.length > 0 || centred.length > 0, value: `${near.length} near-miss left edges (1-24 px), ${centred.length} centred headings or ledes above left-aligned content`, detail: { near, centred: centred.map(name) } };

  // 14. Proximity: a heading should sit closer to what it introduces than to what came before.
  const prox = [];
  for (const h of all.filter((el) => /^H[23]$/.test(el.tagName))) {
    const next = h.nextElementSibling; if (!next) continue;
    let prev = h.previousElementSibling; for (let a = h; !prev && a.parentElement && a.parentElement !== document.body; a = a.parentElement) prev = a.parentElement.previousElementSibling;
    const r = h.getBoundingClientRect();
    if (!prev) continue;
    const above = r.top - prev.getBoundingClientRect().bottom;
    if (above < 0) continue; // side by side, not above
    const below = next.getBoundingClientRect().top - r.bottom;
    prox.push({ el: name(h), above: Math.round(above), below: Math.round(below) });
  }
  const badProx = prox.filter((p) => p.below >= p.above);
  res.proximity = { flag: badProx.length > 0, value: `${badProx.length} of ${prox.length} headings as close to or closer to what precedes them than to what they introduce`, detail: badProx };

  // 15. Scale contrast in the first viewport.
  const firstVp = all.filter((el) => el.getBoundingClientRect().top < vh && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const maxFs = Math.max(...firstVp.map((el) => px(getComputedStyle(el).fontSize)));
  const bodyFs = px(getComputedStyle(document.body).fontSize);
  res.scale = { flag: false, value: `largest text in the first viewport ${maxFs}px = ${(maxFs / bodyFs).toFixed(2)} x body` };

  // 16. Declarations with no effect off macOS, and corner shape.
  const smooth = getComputedStyle(document.documentElement).webkitFontSmoothing;
  res.smoothing = { flag: false, value: `-webkit-font-smoothing: ${smooth || 'auto'} (changes rendering on macOS only)` };
  res.cornerShape = { flag: false, value: `${all.filter((el) => (getComputedStyle(el).cornerShape || getComputedStyle(el).getPropertyValue('corner-shape')) && !/^round/.test(getComputedStyle(el).getPropertyValue('corner-shape') || 'round')).length} elements with a non-round corner-shape` };
  return res;
}

// Node side: keyboard focus ring (Tab through the first controls; is the ring the browser default?).
export async function focusRing(page, n = 6) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const rows = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    rows.push(await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''), style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset }; }));
  }
  const r = rows.filter(Boolean);
  const auto = r.filter((x) => x.style === 'auto');
  return { flag: auto.length > 0, value: `${auto.length} of ${r.length} focused controls show the browser's default ring (outline-style: auto)`, detail: r };
}
