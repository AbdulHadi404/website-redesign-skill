// In-page sampler, injected before any page script. Reads the animated values of the seven interactions every
// frame, and logs input events with their timestamps, so interruption behaviour is measured, not eyeballed.
(() => {
  const q = (s) => document.querySelector(s);
  const mat = (el) => { const t = getComputedStyle(el).transform; return t && t !== 'none' ? new DOMMatrixReadOnly(t) : new DOMMatrixReadOnly(); };
  const R = (window.__read = window.__read || {});
  const defaults = {
    press: () => { const e = q('#press'); return e ? +mat(e).a.toFixed(4) : null; },
    list: () => { const l = q('#list'), li = l && l.querySelector('[data-id="1"]'); if (!li) return null;
      // during a view transition the visible item is the ::view-transition-group pseudo, not the element
      const vt = document.getAnimations().find((a) => a.effect?.pseudoElement === '::view-transition-group(li-1)');
      if (vt) { const t = getComputedStyle(document.documentElement, '::view-transition-group(li-1)').transform;
        if (t && t !== 'none') return +(new DOMMatrixReadOnly(t).f - l.getBoundingClientRect().top).toFixed(2); }
      return +(li.getBoundingClientRect().top - l.getBoundingClientRect().top).toFixed(2); },
    sheet: () => { const s = q('#sheet'); if (!s || !s.isConnected) return 280; const cs = getComputedStyle(s); if (cs.display === 'none') return 280;
      return +Math.max(0, Math.min(280, s.getBoundingClientRect().top - (innerHeight - 280))).toFixed(2); },
    sheetOp: () => { const s = q('#sheet'); if (!s || !s.isConnected || getComputedStyle(s).display === 'none') return 0; return +(+getComputedStyle(s).opacity).toFixed(3); },
    ticker: () => { const e = q('#ticker'); return e ? parseFloat((e.textContent || '').replace(/[^\d.-]/g, '')) || 0 : null; },
    g0: () => { const c = q('#grid')?.children[0]; return c ? +(+getComputedStyle(c).opacity).toFixed(3) : 0; },
    g11: () => { const c = q('#grid')?.children[11]; return c ? +(+getComputedStyle(c).opacity).toFixed(3) : 0; },
    g11y: () => { const c = q('#grid')?.children[11]; return c ? +mat(c).f.toFixed(2) : 0; },
    progress: () => { const e = q('#progress'); return e ? +mat(e).a.toFixed(4) : null; },
    scrollFrac: () => +(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(4),
    reveal2: () => { const e = q('#r2'); return e ? +(+getComputedStyle(e).opacity).toFixed(3) : null; },
    viewX: () => { let m = 0; document.querySelectorAll('#stage .view').forEach((v) => { if (+getComputedStyle(v).opacity > 0.01) m = Math.max(m, Math.abs(mat(v).e)); });
      for (const a of document.getAnimations()) { const pe = a.effect?.pseudoElement || ''; if (!/^::view-transition-(old|new)/.test(pe)) continue;
        const cs = getComputedStyle(document.documentElement, pe); const t = cs.transform; if (t && t !== 'none') m = Math.max(m, Math.abs(new DOMMatrixReadOnly(t).e));
        const tr = cs.translate; if (tr && tr !== 'none') m = Math.max(m, Math.abs(parseFloat(tr) || 0)); }
      return +m.toFixed(2); },
    viewMix: () => { const st = q('#stage'); if (!st) return null;
      const vt = document.getAnimations().filter((a) => /^::view-transition-(new|old)/.test(a.effect?.pseudoElement || ''));
      const newP = vt.find((a) => a.effect.pseudoElement.startsWith('::view-transition-new'));
      if (newP) { const cur = st.querySelector('.view')?.id; const op = +getComputedStyle(document.documentElement, newP.effect.pseudoElement).opacity;
        return +(cur === 'view-b' ? op : 1 - op).toFixed(3); }
      const b = q('#view-b'), a = q('#view-a'); const ob = b ? +getComputedStyle(b).opacity : 0, oa = a ? +getComputedStyle(a).opacity : 0;
      return ob + oa > 0 ? +(ob / (ob + oa)).toFixed(3) : null; },
    reveal2y: () => { const e = q('#r2'); return e ? +mat(e).f.toFixed(2) : null; },
  };
  for (const [k, f] of Object.entries(defaults)) if (!R[k]) R[k] = f;
  const events = (window.__events = []);
  for (const type of ['pointerdown', 'pointerup', 'click', 'scroll'])
    addEventListener(type, (e) => events.push({ t: performance.now(), wall: performance.timeOrigin + performance.now(), type, id: e.target?.id || '', tag: e.target?.tagName || '' }), { capture: true, passive: true });
  window.__record = (ms, keys) => new Promise((resolve) => {
    const out = []; const t0 = performance.now();
    const loop = () => { const t = performance.now(); const s = { t }; for (const k of keys) { try { s[k] = window.__read[k](); } catch { s[k] = null; } } out.push(s);
      if (t - t0 < ms) requestAnimationFrame(loop); else resolve(out); };
    requestAnimationFrame(loop);
  });
  window.__busy = (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms); return { t0, t1: Date.now() }; };
})();
