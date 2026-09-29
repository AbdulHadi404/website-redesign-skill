// AutoAnimate: one call per parent; it animates children added, removed or moved. Only the interactions that are
// "a parent's children changed" apply: list reorder, sheet mount/unmount, grid reveal by insertion.
import autoAnimate from '@formkit/auto-animate';
import { T } from '../tokens.js';
const $ = (q) => document.querySelector(q);
const easing = `cubic-bezier(${T.ease.out})`;

// 2 list
const list = $('#list');
autoAnimate(list, { duration: T.dur.medium, easing });
$('#shuffle').addEventListener('click', () => list.append(...[...list.children].reverse()));

// 3 sheet — mounted into a wrapper; AutoAnimate's default enter/exit is a fade + scale, not a slide
const sheet = $('#sheet'), tog = $('#sheet-toggle');
const holder = document.createElement('div'); holder.id = 'sheet-holder'; sheet.before(holder); sheet.remove();
autoAnimate(holder, { duration: T.dur.large, easing });
tog.addEventListener('click', () => {
  const open = !holder.contains(sheet);
  if (open) { holder.append(sheet); sheet.show(); } else sheet.remove();
  tog.setAttribute('aria-expanded', String(open));
});

// 7 grid — cells inserted and removed (no stagger in AutoAnimate)
const grid = $('#grid'); const cells = [...grid.children]; cells.forEach((c) => c.remove());
autoAnimate(grid, { duration: T.dur.medium, easing });
$('#grid-toggle').addEventListener('click', (e) => {
  const on = !grid.children.length;
  if (on) grid.append(...cells); else cells.forEach((c) => c.remove());
  e.currentTarget.setAttribute('aria-pressed', String(on));
});
