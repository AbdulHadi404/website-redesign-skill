// What people see in an element, including CSS generated content (::before/::after, counter()), read from the
// layout tree (CDP DOMSnapshot); next to its DOM textContent and its accessibility-tree line. The same method as
// scripts/motion.mjs (renderedText), kept separate because motion.mjs is a CLI with no exports.
export async function textOf(page, sel) {
  const dom = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; e.setAttribute('data-text-probe', ''); return (e.textContent || '').replace(/\s+/g, ' ').trim(); }, sel);
  if (dom == null) return null;
  const cdp = await page.context().newCDPSession(page);
  try {
    const snap = await cdp.send('DOMSnapshot.captureSnapshot', { computedStyles: [] });
    const d = snap.documents[0], S = snap.strings, N = d.nodes;
    const probe = N.attributes.findIndex((at) => { for (let i = 0; i < at.length; i += 2) if (S[at[i]] === 'data-text-probe') return true; return false; });
    const txt = new Map(); d.layout.nodeIndex.forEach((ni, k) => { const t = d.layout.text[k]; if (t >= 0) txt.set(ni, (txt.get(ni) || '') + S[t]); });
    const kids = new Map(); N.parentIndex.forEach((p, i) => { if (!kids.has(p)) kids.set(p, []); kids.get(p).push(i); });
    const pseudo = new Map(); (N.pseudoType?.index || []).forEach((ni, k) => pseudo.set(ni, S[N.pseudoType.value[k]]));
    const order = (i) => { const ks = kids.get(i) || []; return [...ks.filter((k) => ['marker', 'before'].includes(pseudo.get(k))), ...ks.filter((k) => !pseudo.has(k)), ...ks.filter((k) => pseudo.get(k) === 'after')]; };
    const walk = (i) => (txt.get(i) || '') + order(i).map(walk).join('');
    const rendered = probe < 0 ? null : walk(probe).replace(/\s+/g, ' ').trim();
    await page.evaluate((s) => document.querySelector(s)?.removeAttribute('data-text-probe'), sel);
    const aria = await page.locator(sel).first().ariaSnapshot().catch(() => null);
    return { rendered, dom, aria };
  } finally { await cdp.detach().catch(() => {}); }
}
