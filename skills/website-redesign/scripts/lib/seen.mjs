/**
 * The accessibility tree marked with what a sighted user can actually read on this screen.
 *
 * A task walkthrough judged from the tree alone overstates success: the tree names columns clipped inside a
 * sideways scroller, rows under a sticky bar and controls far below the fold as if they were in plain view.
 * Each node here carries a mark when it is not readable on the current screen:
 *
 *   ⟨below⟩ / ⟨above⟩ / ⟨off to the side⟩     outside the viewport; the page scrolls to it
 *   ⟨in a sideways scroller: div.table-wrap⟩ clipped by a scroll container; nothing on screen may say it scrolls
 *   ⟨cut off by div.card⟩                     clipped by overflow hidden/clip; unreachable without a layout change
 *   ⟨covered by header.bar⟩                   another element is painted on top of it
 *   ⟨transparent⟩                             on screen at opacity near zero (often a reveal that has not run)
 *   ⟨screen-reader only⟩                      the 1×1 visually-hidden pattern: intentionally not seen
 *
 * Children inherit their parent's mark and are not re-marked. Bare generic wrappers are dropped from the tree.
 */

const CLASSIFY = (el) => {
  const sel = (n) => {
    if (!n || n.nodeType !== 1) return '?';
    if (n.id) return `#${n.id}`;
    const cls = [...n.classList].filter((c) => !/^(css-|sc-|_|svelte-|astro-)|\d{3,}|:/.test(c)).slice(0, 2);
    return n.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
  };
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { f: 1, sf: 1 };
  if (r.width <= 2 && r.height <= 2) return { f: 0, sf: 0, covered: 'screen-reader only' }; // the 1×1 visually-hidden pattern
  let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
  let clip = null;
  // Walk the containing blocks that clip: a fixed element escapes every ancestor's overflow above it.
  let escaped = getComputedStyle(el).position === 'fixed';
  for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement && !escaped; a = a.parentElement) {
    const cs = getComputedStyle(a);
    const cx = cs.overflowX !== 'visible', cy = cs.overflowY !== 'visible';
    if (cx || cy) {
      const ar = a.getBoundingClientRect();
      const l = ar.left + a.clientLeft, t = ar.top + a.clientTop;
      const before = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
      if (cx) { x0 = Math.max(x0, l); x1 = Math.min(x1, l + a.clientWidth); }
      if (cy) { y0 = Math.max(y0, t); y1 = Math.min(y1, t + a.clientHeight); }
      const after = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
      if (!clip && after < before * 0.5) {
        const scrollsX = /auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1;
        const scrollsY = /auto|scroll/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 1;
        clip = scrollsX && !scrollsY ? `in a sideways scroller: ${sel(a)}` : scrollsX || scrollsY ? `scrolled out of view in ${sel(a)}` : `cut off by ${sel(a)}`;
      }
    }
    if (cs.position === 'fixed') escaped = true;
  }
  // Readable share: the part inside every clipping ancestor and the viewport, against the element's own area
  // (or the viewport's, for an element taller than the screen).
  const area = r.width * r.height, denom = Math.min(area, innerWidth * innerHeight);
  const shown = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const vx0 = Math.max(x0, 0), vy0 = Math.max(y0, 0), vx1 = Math.min(x1, innerWidth), vy1 = Math.min(y1, innerHeight);
  const inView = Math.max(0, vx1 - vx0) * Math.max(0, vy1 - vy0);
  const f = inView / denom, sf = shown / denom;
  const view = y0 >= innerHeight - 1 || (vy1 <= vy0 && y0 > 0) || (inView < shown * 0.5 && r.top > 0) ? 'below'
    : y1 <= 1 || (vy1 <= vy0 && y1 < innerHeight) || (inView < shown * 0.5 && r.bottom < innerHeight) ? 'above' : 'off to the side';
  if (f < 0.6) return { f, sf, clip, view };
  // On screen but see-through: usually a reveal that has not run. Off screen, the same element is just "below".
  let opacity = 1;
  for (let a = el; a; a = a.parentElement) opacity *= parseFloat(getComputedStyle(a).opacity) || 0;
  if (opacity < 0.1) return { f: 0, sf, covered: 'transparent' };
  // Painted over? Sample two interior points of the readable part; both must land on something else.
  const pts = [[(vx0 + vx1) / 2, (vy0 + vy1) / 2], [vx0 + Math.min(8, (vx1 - vx0) / 3), vy0 + Math.min(8, (vy1 - vy0) / 3)]];
  let coveredBy = null;
  for (const [x, y] of pts) {
    const hit = document.elementFromPoint(x, y);
    if (!hit || el.contains(hit) || hit.contains(el)) return { f, sf };
    if (getComputedStyle(hit).pointerEvents === 'none') return { f, sf };
    // Name the layer, not the paragraph inside it: the nearest fixed/sticky/absolute box or dialog that owns the hit.
    let layer = hit;
    for (let a = hit; a && a !== document.body; a = a.parentElement) {
      if (/^(fixed|sticky|absolute)$/.test(getComputedStyle(a).position) || a.matches('dialog,[role=dialog],[role=alertdialog]')) layer = a;
    }
    coveredBy = layer;
  }
  return coveredBy ? { f: 0, sf, covered: `covered by ${sel(coveredBy)}` } : { f, sf };
};

/**
 * Returns the marked tree as YAML-like text, with a header that counts what is named but not readable.
 * Falls back to the plain tree on Playwright versions without ai-mode snapshots.
 */
export async function seenTree(page) {
  let snap;
  try { snap = await page.locator('body').ariaSnapshot({ mode: 'ai', timeout: 8000 }); }
  catch { return (await page.locator('body').ariaSnapshot({ timeout: 5000 }).catch((e) => `# aria snapshot failed: ${e.message}`)) + '\n'; }
  const lines = snap.split('\n');
  // Refs gain a frame-generation prefix after a navigation (e3 on the first page, f1e3 after a link is followed).
  const refs = [...new Set(lines.flatMap((l) => [...l.matchAll(/\[ref=([a-z]*\d*e\d+)\]/g)].map((m) => m[1])))].slice(0, 2500);
  // An older Playwright ignores mode: 'ai' and returns no refs: say so rather than implying everything is readable.
  if (!refs.length) return `# This Playwright cannot mark what is readable on screen (needs ai-mode snapshots); judge from the capture.\n${snap}\n`;
  const marks = new Map();
  // CDP pipelines these; a thousand refs take about a second.
  await Promise.all(refs.map((ref) => page.locator(`aria-ref=${ref}`).evaluate(CLASSIFY, null, { timeout: 2000 }).then((m) => marks.set(ref, m)).catch(() => {})));
  const vp = page.viewportSize() || { width: 0, height: 0 };
  const scrollY = await page.evaluate(() => Math.round(scrollY)).catch(() => 0);

  const out = [];
  // own = this node's mark; seen = the mark a reader of the printed tree assumes here (a dropped wrapper's is never shown)
  const stack = [];
  const counts = new Map();
  for (const line of lines) {
    const indent = line.search(/\S/);
    if (indent < 0) continue;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const inherited = stack.length ? stack[stack.length - 1].seen : '';
    const parentOwn = stack.length ? stack[stack.length - 1].own : '';
    const ref = line.match(/\[ref=([a-z]*\d*e\d+)\]/)?.[1];
    // A container counts as seen while any real part of it is (its children carry their own marks); a leaf needs
    // most of itself on screen to be read.
    const m = ref && marks.get(ref);
    const leaf = !/:\s*$/.test(line);
    const limit = leaf ? 0.6 : 0.05;
    // Clipping outranks the viewport: a row below the fold scrolls into view, a column cut off by a card never does.
    const mark = !m ? parentOwn : m.covered ? m.covered : m.f >= limit ? '' : m.clip && m.sf < limit ? m.clip : m.view;
    const clean = line.replace(/ \[ref=[a-z]*\d*e\d+\]/g, '').replace(/ \[cursor=pointer\]/g, '');
    // A bare wrapper ("- generic:" with no name or text) adds depth, not information.
    // Kept when it carries a new mark, so its children need not repeat it.
    const drop = /^\s*- generic:?\s*$/.test(clean) && mark === inherited;
    const dropped = stack.filter((s) => s.drop).length;
    stack.push({ indent, drop, own: mark, seen: drop ? inherited : mark });
    if (drop) continue;
    if (leaf && mark && !/^\s*- \/url:/.test(line)) counts.set(mark, (counts.get(mark) || 0) + 1);
    const shown = clean.slice(dropped * 2);
    const tag = mark === inherited ? '' : mark || 'on screen';
    out.push(!tag ? shown : /:$/.test(shown) ? `${shown.slice(0, -1)} ⟨${tag}⟩:` : `${shown} ⟨${tag}⟩`);
  }
  const hidden = [...counts].filter(([k]) => !/^(below|above|off to the side)$/.test(k));
  const head = [
    `# Screen ${vp.width}×${vp.height}, scrolled to y=${scrollY}. ⟨…⟩ marks nodes that are in the tree but not readable on this screen.`,
    hidden.length ? `# Named but not readable here: ${hidden.map(([k, n]) => `${n}× ${k}`).join('; ')}.` : '# Everything named on this screen is readable (apart from what the page scrolls to).',
    '# Judge from the capture; use this for selectors. A marked node is something the user cannot see yet.',
  ];
  return head.join('\n') + '\n' + out.join('\n') + '\n';
}
