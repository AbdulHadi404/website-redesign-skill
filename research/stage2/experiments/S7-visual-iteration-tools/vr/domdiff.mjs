/**
 * Structural visual diff (prototype): snapshot every rendered element's box, key computed styles, own text,
 * pseudo-element content and the font-face load states, then diff two snapshots by element path.
 * Answers "what changed, in element terms" where a pixel diff answers "which pixels".
 *
 *   const a = await page.evaluate(snapshot, { mask: '[data-dynamic]' });  … b …;  const d = diff(a, b);
 */

/** In-page (serialised by page.evaluate). */
export function snapshot({ mask = '[data-dynamic]' } = {}) {
  const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-top-width', 'border-bottom-color', 'border-bottom-width',
    'border-left-color', 'border-left-width', 'border-right-color', 'border-right-width', 'border-radius', 'box-shadow', 'outline-color', 'outline-width',
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-decoration-line', 'opacity',
    'visibility', 'display', 'transform', 'filter', 'fill', 'stroke', 'object-fit', 'z-index'];
  const keyOf = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const same = e.parentElement ? [...e.parentElement.children].filter((c) => c.tagName === e.tagName) : [e];
      parts.unshift(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}:${same.indexOf(e) + 1}`);
    }
    return parts.join('>');
  };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
  const masked = mask ? [...document.querySelectorAll(mask)] : [];
  const els = [];
  let order = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const shown = cs.display !== 'none' && r.width > 0 && r.height > 0 && cs.visibility !== 'hidden';
    const inMask = masked.some((m) => m.contains(el));
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data).join('').replace(/\s+/g, ' ').trim();
    const style = {};
    for (const p of PROPS) style[p] = cs.getPropertyValue(p);
    for (const ps of ['::before', '::after']) {
      const c = getComputedStyle(el, ps);
      if (c.content && c.content !== 'none' && c.content !== 'normal') style[ps] = `${c.content} ${c.color} ${c.backgroundColor} ${c.width}x${c.height}`;
    }
    const svgAttrs = el instanceof SVGElement && !(el instanceof SVGSVGElement) ? [...el.attributes].map((a) => `${a.name}=${a.value}`).join(' ') : null;
    els.push({ key: keyOf(el), name: name(el), order: order++, shown, masked: inMask,
      box: [r.left + scrollX, r.top + scrollY, r.width, r.height].map((v) => Math.round(v * 2) / 2),
      text: inMask ? '' : own.slice(0, 200), style, svg: svgAttrs, src: el.currentSrc || el.getAttribute?.('src') || null });
  }
  const fonts = [...document.fonts].map((f) => `${f.family.replace(/"/g, '')} ${f.weight} ${f.style}: ${f.status}`);
  return { els, fonts, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight };
}

/** Node side: what changed between two snapshots, grouped so a cascade reads as one cause. */
export function diff(A, B, { tol = 0.5 } = {}) {
  const a = new Map(A.els.map((e) => [e.key, e])), b = new Map(B.els.map((e) => [e.key, e]));
  const removed = [], added = [], styled = [], texted = [], resized = [], moves = new Map();
  for (const [k, e] of a) {
    const f = b.get(k);
    if (!f || (!f.shown && e.shown)) { if (e.shown && !e.masked) removed.push(e.name); continue; }
    if (!e.shown && f.shown) { if (!f.masked) added.push(f.name); continue; }
    if (!e.shown) continue;
    const st = Object.keys({ ...e.style, ...f.style }).filter((p) => e.style[p] !== f.style[p]);
    if (st.length && !e.masked) styled.push({ el: e.name, props: st.map((p) => `${p}: ${e.style[p] ?? '—'} → ${f.style[p] ?? '—'}`) });
    if (e.svg !== f.svg && !e.masked) styled.push({ el: e.name, props: ['svg attributes changed'] });
    if (e.src !== f.src) styled.push({ el: e.name, props: [`src: ${e.src} → ${f.src}`] });
    if (e.text !== f.text && !e.masked) texted.push({ el: e.name, from: e.text.slice(0, 60), to: f.text.slice(0, 60) });
    const [dx, dy, dw, dh] = f.box.map((v, i) => v - e.box[i]);
    if (e.masked) continue;
    if (Math.abs(dw) > tol || Math.abs(dh) > tol) resized.push({ el: e.name, order: e.order, dw, dh, dx, dy });
    else if (Math.abs(dx) > tol || Math.abs(dy) > tol) { const key = `${dx},${dy}`; const m = moves.get(key) || { dx, dy, n: 0, first: e.name }; m.n++; moves.set(key, m); }
  }
  for (const [k, f] of b) if (!a.has(k) && f.shown && !f.masked) added.push(f.name);
  const fontsChanged = B.fonts.filter((f) => !A.fonts.includes(f));
  // A resized element whose size change equals a descendant's is a consequence; keep the innermost ones first.
  resized.sort((x, y) => y.order - x.order);
  const causes = [];
  for (const r of resized) { if (!causes.some((c) => c.dh === r.dh && c.dw === r.dw && c.order > r.order)) causes.push(r); }
  causes.sort((x, y) => x.order - y.order);
  const changed = removed.length + added.length + styled.length + texted.length + resized.length + moves.size + fontsChanged.length > 0;
  const lines = [
    ...fontsChanged.map((f) => `font face now ${f}`),
    ...removed.slice(0, 5).map((n) => `removed: ${n}`), ...(removed.length > 5 ? [`… ${removed.length - 5} more removed`] : []),
    ...added.slice(0, 5).map((n) => `added: ${n}`),
    ...styled.slice(0, 6).map((s) => `${s.el}: ${s.props.slice(0, 3).join('; ')}`), ...(styled.length > 6 ? [`… style changes on ${styled.length - 6} more elements`] : []),
    ...texted.slice(0, 4).map((t) => `${t.el}: text "${t.from}" → "${t.to}"`),
    ...causes.slice(0, 5).map((r) => `${r.el}: size ${r.dw >= 0 ? '+' : ''}${r.dw}×${r.dh >= 0 ? '+' : ''}${r.dh}px`), ...(resized.length > causes.length ? [`(${resized.length - Math.min(5, causes.length)} ancestors resized with them)`] : []),
    ...[...moves.values()].sort((x, y) => y.n - x.n).slice(0, 4).map((m) => `${m.n} element(s) moved by (${m.dx}, ${m.dy}) px, first ${m.first}`),
  ];
  if (A.docH !== B.docH) lines.push(`document height ${A.docH} → ${B.docH}px`);
  return { changed, counts: { removed: removed.length, added: added.length, styled: styled.length, text: texted.length, resized: resized.length, moveGroups: moves.size, fonts: fontsChanged.length }, lines };
}
