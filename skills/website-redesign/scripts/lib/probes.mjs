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
    // in inventory.mjs reports that) or, when it too runs past the edge, is cut with the text by body or html.
    let reachable = false, cutBelow = false;
    for (let p = el.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll') { reachable = true; break; }
      if (o !== 'hidden' && o !== 'clip') continue;
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
