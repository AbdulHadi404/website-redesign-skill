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
  const out = [];
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
    if (!parentAlsoOver) out.push({ selector: sel(el), right: Math.round(r.right), width: Math.round(r.width) });
  }
  return { overflow: by > 0, by, viewport: vw, culprits: out.slice(0, 8) };
}
