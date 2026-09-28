// In-page probe (pass to page.evaluate): text whose INK (marks, ascenders, descenders) is cut by a clipping box.
// Line boxes are built from the font's ascent/descent, but Arabic marks and stacked hamza/harakat reach far past
// them (lab/vmetrics.mjs), and nothing in layout says so: getBoundingClientRect and scrollHeight never see ink.
// Method: split each text node into its rendered lines (Range rects), measure every line's ink with canvas
// measureText (shaped by the same engine), place it on the line's baseline (rect.bottom − fontBoundingBoxDescent),
// and compare with the padding box of the nearest clipping ancestor (overflow hidden/clip/auto/scroll, line-clamp).
// Options: { scripts: 'arabic' | 'all', minPx: 0.75, limit: 400 }
export function glyphClipProbe(opts = {}) {
  const minPx = opts.minPx ?? 0.75, all = opts.scripts === 'all', limit = opts.limit ?? 400;
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const ctx = document.createElement('canvas').getContext('2d');
  const sel = (el) => { if (el.id) return '#' + el.id; const c = [...el.classList].slice(0, 2).join('.'); return el.tagName.toLowerCase() + (c ? '.' + c : ''); };
  const clipperOf = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const clipY = /hidden|clip|auto|scroll/.test(cs.overflowY) || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
      if (clipY) return p;
      if (cs.position === 'fixed') return null;
    }
    return null;
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, checked = 0;
  while ((n = walker.nextNode()) && checked < limit) {
    const text = n.textContent;
    if (!text.trim() || (!all && !AR.test(text))) continue;
    const el = n.parentElement;
    if (!el || el.closest('svg, script, style, noscript')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const clipper = clipperOf(el);
    if (!clipper) continue;
    checked++;
    const cr = clipper.getBoundingClientRect(), ccs = getComputedStyle(clipper);
    const clip = { top: cr.top + parseFloat(ccs.borderTopWidth), bottom: cr.bottom - parseFloat(ccs.borderBottomWidth) };
    if (cr.width < 2 || cr.height < 2) continue;
    // group characters by rendered line
    const lines = new Map();
    const r = document.createRange();
    const L = Math.min(text.length, 400);
    for (let i = 0; i < L; i++) {
      r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getBoundingClientRect(); if (!b.height) continue;
      const key = Math.round(b.bottom);
      const line = lines.get(key) || { top: b.top, bottom: b.bottom, chars: '' };
      line.chars += text[i]; lines.set(key, line);
    }
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    let worst = null;
    for (const line of lines.values()) {
      if (line.top >= clip.bottom - 1 || line.bottom <= clip.top + 1) continue; // a line meant to be hidden (clamped away)
      const m = ctx.measureText(line.chars.trim() || line.chars);
      const baseline = line.bottom - m.fontBoundingBoxDescent;
      const inkTop = baseline - m.actualBoundingBoxAscent, inkBottom = baseline + m.actualBoundingBoxDescent;
      const top = clip.top - inkTop, bottom = inkBottom - clip.bottom;
      // the last visible line of a clamp or a single-line box: its descenders count; a partially shown later line does not
      if (top > minPx || bottom > minPx) {
        const w = { topPx: Math.round(Math.max(0, top) * 10) / 10, bottomPx: Math.round(Math.max(0, bottom) * 10) / 10 };
        if (!worst || w.topPx + w.bottomPx > worst.topPx + worst.bottomPx) worst = w;
      }
    }
    if (worst) {
      const fs = parseFloat(cs.fontSize);
      out.push({ selector: sel(el), clipper: clipper === el ? 'self' : sel(clipper), text: text.trim().slice(0, 40), font: `${cs.fontSize} ${cs.fontFamily.split(',')[0]}`,
        lineHeight: cs.lineHeight === 'normal' ? 'normal' : +(parseFloat(cs.lineHeight) / fs).toFixed(2), boxHeight: Math.round(cr.height), ...worst });
    }
  }
  return { checked, clipped: out };
}
