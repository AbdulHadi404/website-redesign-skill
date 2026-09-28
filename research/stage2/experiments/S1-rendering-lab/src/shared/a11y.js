// Keyboard and screen-reader operation for the decorations, shared by every variant that opts in.
//
// One tab stop for the whole set (roving tabindex). Arrow keys move focus between decorations;
// Enter or Space picks the focused one up; arrow keys then move it (Shift = bigger steps); Enter or
// Space places it (the same "drop" as a mouse drag: particles and the counter); Escape puts it back.
// A polite live region says what happened. This is the single-pointer / keyboard alternative to
// dragging that WCAG 2.5.7 and 2.1.1 ask for.
//
// Two modes:
//  - native: the variant's own elements (DOM <button>s, SVG <g>s) become the focusable items.
//  - overlay: a parallel DOM layer of transparent <button>s sits over a canvas, one per item, moved
//    only when the item moves (never per frame), so the cost is DOM nodes, not frame time.
import { itemLabel } from './scene.js';

const STEP = 8, BIG = 32;

export function attachKeyboard({ host, items, n, elements = null, pos, actions }) {
  const live = document.getElementById('live');
  const say = (msg) => { if (live) { live.textContent = ''; live.textContent = msg; } };
  let layer = null;
  let els = elements;
  if (!els) {
    layer = document.createElement('div');
    layer.className = 'kb-layer';
    layer.setAttribute('role', 'group');
    layer.setAttribute('aria-label', 'Decorations on the cake');
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    els = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kb-item';
      b.style.cssText = 'position:absolute;width:48px;height:48px;margin:0;padding:0;border:0;background:transparent;pointer-events:none;border-radius:50%';
      const p = pos(it.id);
      b.style.left = `${p.x - 24}px`; b.style.top = `${p.y - 24}px`;
      return b;
    });
    layer.append(...els);
    host.append(layer);
    const css = document.createElement('style');
    css.textContent = '.kb-item:focus-visible{outline:3px solid #1a237e;outline-offset:2px;box-shadow:0 0 0 6px #fff}';
    document.head.append(css);
  } else if (host) {
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', 'Decorations on the cake');
  }
  els.forEach((el, i) => {
    el.setAttribute('tabindex', i === n - 1 ? '0' : '-1');
    el.setAttribute('aria-label', itemLabel(items[i], n));
    if (el.tagName.toLowerCase() !== 'button') el.setAttribute('role', 'button');
    el.dataset.kb = String(i);
  });
  const help = document.createElement('p');
  help.id = 'kb-help';
  help.className = 'sr-only';
  help.textContent = 'Press Enter to pick up a decoration, arrow keys to move it, Enter to place it, Escape to put it back.';
  document.body.append(help);
  els.forEach((el) => el.setAttribute('aria-describedby', 'kb-help'));

  let current = n - 1;         // roving focus index (item id)
  let grabbed = null;          // { id, x0, y0 }
  const focusItem = (id) => {
    els[current]?.setAttribute('tabindex', '-1');
    current = id;
    els[current].setAttribute('tabindex', '0');
    els[current].focus();
  };
  const sync = (id) => {
    if (!layer) return;
    const p = pos(id);
    els[id].style.left = `${p.x - 24}px`; els[id].style.top = `${p.y - 24}px`;
  };
  const onKey = (e) => {
    const t = e.target.closest?.('[data-kb]');
    if (!t) return;
    const id = Number(t.dataset.kb);
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (!grabbed) {
        const p = pos(id);
        grabbed = { id, x0: p.x, y0: p.y };
        actions.select(id);
        say(`Picked up ${itemLabel(items[id], n)}. Arrow keys move it; Enter places it; Escape puts it back.`);
      } else {
        actions.drop(grabbed.id);
        say(`Placed ${itemLabel(items[grabbed.id], n)}.`);
        grabbed = null;
      }
      return;
    }
    if (k === 'Escape' && grabbed) {
      e.preventDefault();
      const g = grabbed; grabbed = null;
      actions.moveTo(g.id, g.x0, g.y0); sync(g.id);
      actions.cancel?.(g.id);
      say(`Put back ${itemLabel(items[g.id], n)}.`);
      return;
    }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[k]) {
      e.preventDefault();
      if (grabbed) {
        const s = e.shiftKey ? BIG : STEP;
        actions.move(grabbed.id, dirs[k][0] * s, dirs[k][1] * s); sync(grabbed.id);
      } else {
        const d = k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1;
        focusItem((id + d + n) % n);
      }
      return;
    }
    if (k === 'Home' || k === 'End') { e.preventDefault(); if (!grabbed) focusItem(k === 'Home' ? 0 : n - 1); }
  };
  (layer || host).addEventListener('keydown', onKey);
  return { sync, layer, els };
}
