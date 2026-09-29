// Inline SVG: one <g> per decoration referencing a <symbol> that crops the atlas. Bob is a CSS
// animation on the `translate` property (SVG children are not composited: every frame repaints the
// SVG on the main thread), hover is :hover, z-order is document order, particles the Web Animations API.
import {
  W, H, CELL, RING, SPARK, BOB_AMP, BOB_PERIOD, HOVER_SCALE, SEL_SCALE, P_COUNT, P_LIFE, P_DIST, FREEZE, ASSETS,
  readParams, installHarness, makeItems, bobY, clampX, clampY, loadImage, loadAtlas,
} from '../shared/scene.js';
import { attachKeyboard, TAP_SLOP } from '../shared/a11y.js';

const NS = 'http://www.w3.org/2000/svg';
// ?outline (keyboard build only): draw focus with CSS outline instead of the ring shape, to show why not.
const OUTLINE = __A11Y__ && new URLSearchParams(location.search).has('outline');
const params = readParams();
const lab = installHarness(__VARIANT__, params);
lab.info.renderer = 'svg';
const stage = document.getElementById('stage');
const [atlas] = await Promise.all([loadAtlas(), loadImage(ASSETS + 'atlas.png'), loadImage(ASSETS + 'bg.png')]);
const { frames } = atlas;

const css = document.createElement('style');
css.textContent = `
.item{cursor:pointer;touch-action:none}
.bob{animation:bob ${BOB_PERIOD}ms linear infinite;transform-box:view-box;transform-origin:0 0}
.item:hover .bob,.item.hov .bob{scale:${HOVER_SCALE}}
.item.sel .bob,.item.drag .bob{scale:${SEL_SCALE}}
.item.drag .bob{animation:none}
.item:focus-visible{outline:none}
.focus{display:none;fill:none;pointer-events:none}.item:focus-visible .focus{display:inline}
${OUTLINE ? '.item:focus-visible .spr{outline:3px solid #1a237e}' : ''}
@keyframes bob{
  0%{translate:0 0;animation-timing-function:cubic-bezier(.61,1,.88,1)}
  25%{translate:0 -${BOB_AMP}px;animation-timing-function:cubic-bezier(.12,0,.39,0)}
  50%{translate:0 0;animation-timing-function:cubic-bezier(.61,1,.88,1)}
  75%{translate:0 ${BOB_AMP}px;animation-timing-function:cubic-bezier(.12,0,.39,0)}
  100%{translate:0 0}}
@media (prefers-reduced-motion:reduce){.bob{animation:none}}
.p{pointer-events:none}
`;
document.head.append(css);

const mk = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const svg = mk('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'display:block' });
const defs = mk('defs');
for (const [k, f] of Object.entries(frames)) {
  const sym = mk('symbol', { id: `f-${k}`, viewBox: `${f.x} ${f.y} ${f.w} ${f.h}` });
  sym.append(mk('image', { href: ASSETS + 'atlas.png', width: atlas.w, height: atlas.h }));
  defs.append(sym);
}
svg.append(defs, mk('image', { href: ASSETS + 'bg.png', width: W, height: H }));
const layer = mk('g'); const fx = mk('g');
svg.append(layer, fx);

const items = makeItems(params.n);
const bobs = [];
const els = items.map((it) => {
  const g = mk('g', { class: 'item', 'data-id': it.id, transform: `translate(${it.x} ${it.y})` });
  const b = mk('g', { class: 'bob', style: `animation-delay:${-(it.phase * BOB_PERIOD)}ms` });
  b.append(mk('use', { class: 'spr', href: `#f-${it.frame}`, x: -CELL / 2, y: -CELL / 2, width: CELL, height: CELL }));
  g.append(b); bobs.push(b);
  return g;
});
layer.append(...els);
stage.append(svg);
// An explicit focus ring. CSS outline on an SVG element is drawn around its bounding box, and a <use>
// of a <symbol> that crops the sprite atlas reports the whole atlas strip as its box (512×72 here), so
// an outline would frame half the cake. One ring for the whole set, moved into whichever item has focus
// (one per item cost 2 nodes × N and ~13 % of the frame rate at N = 2000).
// The focusin listener goes on the HTML stage: in Chromium an SVG element with a focus listener becomes
// a Tab stop itself (?focusonsvg puts it on the <g> layer to show that).
if (__A11Y__ && !OUTLINE) {
  const focusRing = mk('g', { class: 'focus' });
  focusRing.append(mk('circle', { r: 30, stroke: '#fff', 'stroke-width': 7 }), mk('circle', { r: 30, stroke: '#1a237e', 'stroke-width': 3 }));
  const on = new URLSearchParams(location.search).has('focusonsvg') ? layer : stage;
  on.addEventListener('focusin', (e) => { const g = e.target.closest?.('.item'); if (g) g.append(focusRing); });
}
const ring = mk('use', { href: '#f-ring', x: -RING / 2, y: -RING / 2, width: RING, height: RING });

let selected = -1, drag = null, rect = null;
let kb = null;   // keyboard layer + tap-to-place (a11y build only)
const place = (id) => els[id].setAttribute('transform', `translate(${items[id].x} ${items[id].y})`);
const select = (id) => {
  if (selected >= 0) els[selected].classList.remove('sel');
  selected = id;
  if (id >= 0) { els[id].classList.add('sel'); bobs[id].prepend(ring); layer.append(els[id]); } else ring.remove();
};

function burst(x, y, age = 0) {
  if (params.reduced) return;
  for (let i = 0; i < P_COUNT; i++) {
    const a = (2 * Math.PI * i) / P_COUNT;
    const o = mk('g', { class: 'p', transform: `translate(${x} ${y})` });
    const mid = mk('g'); const u = mk('use', { href: '#f-spark', x: -SPARK / 2, y: -SPARK / 2, width: SPARK, height: SPARK });
    mid.append(u); o.append(mid); fx.append(o);
    const a1 = mid.animate([{ translate: '0 0' }, { translate: `${Math.cos(a) * P_DIST}px ${Math.sin(a) * P_DIST}px` }],
      { duration: P_LIFE, easing: 'cubic-bezier(0.33,1,0.68,1)', fill: 'forwards' });
    const a2 = u.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.5 }], { duration: P_LIFE, fill: 'forwards' });
    if (age) { for (const an of [a1, a2]) { an.currentTime = age; an.pause(); } } else a1.onfinish = () => o.remove();
  }
}
const drop = (id) => { burst(items[id].x, items[id].y); lab.drop(); };

svg.addEventListener('pointerdown', (e) => {
  lab.input(e);
  const g = e.target.closest?.('.item');
  rect = svg.getBoundingClientRect();
  // Tap-to-place: while a decoration is carried, a tap anywhere else places it there.
  if (__A11Y__ && kb.carrying() >= 0 && (!g || Number(g.dataset.id) !== kb.carrying())) {
    e.preventDefault();
    kb.placeAt(e.clientX - rect.left, e.clientY - rect.top);
    return;
  }
  if (!g) { select(-1); return; }
  e.preventDefault();
  const id = Number(g.dataset.id);
  select(id);  // re-appends the <g> to raise it, so capture after
  lab.picked.push(id);
  drag = { id, ox: e.clientX - rect.left - items[id].x, oy: e.clientY - rect.top - items[id].y, sx: e.clientX, sy: e.clientY };
  g.classList.add('drag');
  g.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove', (e) => {
  lab.input(e);
  if (!drag) return;
  const it = items[drag.id];
  it.x = clampX(e.clientX - rect.left - drag.ox); it.y = clampY(e.clientY - rect.top - drag.oy);
  place(drag.id);
});
const end = (e) => {
  lab.input(e);
  if (!drag) return;
  els[drag.id].classList.remove('drag');
  // A press that did not move is a tap: pick up (or put down) for tap-to-place instead of dropping.
  if (__A11Y__ && e.type === 'pointerup' && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < TAP_SLOP) {
    const id = drag.id; drag = null; kb.tap(id); return;
  }
  drop(drag.id);
  drag = null;
};
svg.addEventListener('pointerup', end);
svg.addEventListener('pointercancel', end);

lab.getItem = (id) => ({ x: items[id].x, y: items[id].y });
lab.topId = () => items.length - 1;

if (params.freeze) {
  for (const it of items) { bobs[it.id].style.animation = 'none'; bobs[it.id].style.translate = `0 ${bobY(it, FREEZE.t)}px`; }
  select(items.length - 1);
  if (items.length > 1) els[items.length - 2].classList.add('hov');
  burst(FREEZE.burst.x, FREEZE.burst.y, FREEZE.burst.age);
}

if (__A11Y__) {
  kb = attachKeyboard({
    host: layer, items, n: items.length, elements: els,
    pos: (id) => items[id],
    actions: {
      // select() re-appends the <g> to raise it, which drops focus; restore it only if it had it.
      select: (id) => { const had = document.activeElement === els[id]; select(id); els[id].classList.add('drag'); if (had) els[id].focus(); },
      move: (id, dx, dy) => { items[id].x = clampX(items[id].x + dx); items[id].y = clampY(items[id].y + dy); place(id); },
      moveTo: (id, x, y) => { items[id].x = x; items[id].y = y; place(id); },
      drop: (id) => { els[id].classList.remove('drag'); drop(id); },
      cancel: (id) => { els[id].classList.remove('drag'); },
    },
  });
}

requestAnimationFrame(() => lab.markFirstFrame());
