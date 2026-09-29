// Keyboard and screen-reader operation for the decorations, shared by every variant that opts in.
//
// One tab stop for the whole set (roving tabindex). Arrow keys move focus between decorations;
// Enter or Space picks the focused one up; arrow keys then move it (Shift = bigger steps); Enter or
// Space places it (the same "drop" as a mouse drag: particles and the counter); Escape puts it back.
// A polite live region says what happened. This is the keyboard operation WCAG 2.1.1 asks for; the
// names and roles are what 4.1.2 asks for.
//
// A keyboard path does NOT satisfy WCAG 2.5.7 (Dragging Movements) on its own: that criterion wants a
// single-pointer alternative. So the same module also provides tap-to-place: tap (click) a decoration
// to pick it up, then tap a spot to place it there, or tap it again to put it down. The variant calls
// kb.tap(id) when a pointerdown/up on an item did not move, and kb.placeAt(x, y) on the next tap while
// kb.carrying() >= 0.
//
// Two modes:
//  - native: the variant's own elements (DOM <button>s, SVG <g>s) become the focusable items.
//  - overlay: a parallel DOM layer of transparent <button>s sits over a canvas, one per item. The
//    variant must call kb.sync(id) from the one function that moves an object (pointer drag, keyboard,
//    tap-to-place, undo), never per frame, so the cost is DOM nodes and one style write per move.
import { itemLabel, clampX, clampY } from './scene.js';

const STEP = 8, BIG = 32;
// Overlay buttons are positioned with transform, which needs no layout; ?lefttop writes left/top instead
// (to measure the difference: every left/top write re-lays out the layer).
const LEFTTOP = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lefttop');
const place = (b, p) => {
  if (LEFTTOP) { b.style.left = `${p.x - 24}px`; b.style.top = `${p.y - 24}px`; } else b.style.transform = `translate(${p.x - 24}px,${p.y - 24}px)`;
};

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
      b.style.cssText = 'position:absolute;left:0;top:0;width:48px;height:48px;margin:0;padding:0;border:0;background:transparent;pointer-events:none;border-radius:50%';
      place(b, pos(it.id));
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
  const sync = (id) => { if (layer) place(els[id], pos(id)); };
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
      actions.moveTo(g.id, g.x0, g.y0);
      actions.cancel?.(g.id);
      say(`Put back ${itemLabel(items[g.id], n)}.`);
      return;
    }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[k]) {
      e.preventDefault();
      if (grabbed) {
        const s = e.shiftKey ? BIG : STEP;
        actions.move(grabbed.id, dirs[k][0] * s, dirs[k][1] * s);
      } else {
        const d = k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1;
        focusItem((id + d + n) % n);
      }
      return;
    }
    if (k === 'Home' || k === 'End') { e.preventDefault(); if (!grabbed) focusItem(k === 'Home' ? 0 : n - 1); }
  };
  (layer || host).addEventListener('keydown', onKey);

  // Tap-to-place: the single-pointer alternative to dragging (WCAG 2.5.7).
  let carrying = -1;
  const tap = (id) => {
    if (carrying === id) {
      carrying = -1;
      actions.cancel?.(id);
      say(`Put down ${itemLabel(items[id], n)}.`);
      return;
    }
    carrying = id;
    actions.select(id);
    say(`Picked up ${itemLabel(items[id], n)}. Tap where it should go, or tap it again to put it down.`);
  };
  const placeAt = (x, y) => {
    if (carrying < 0) return false;
    const id = carrying; carrying = -1;
    actions.moveTo(id, clampX(x), clampY(y));
    actions.drop(id);
    say(`Placed ${itemLabel(items[id], n)}.`);
    return true;
  };
  return { sync, layer, els, tap, placeAt, carrying: () => carrying };
}

/** Pointer moved less than this (px) between down and up: a tap, not a drag. */
export const TAP_SLOP = 6;
