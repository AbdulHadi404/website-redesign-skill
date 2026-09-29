// DOM + CSS: two elements per decoration — an outer box positioned by `transform` (set on drag) and an
// inner one that bobs (a CSS animation of `translate`, which runs on the compositor) and scales on
// :hover / selection. Z-order is z-index; particles use the Web Animations API.
// (One element is not enough: the individual `translate`/`scale` properties apply *outside* `transform`,
// so scaling the positioned element also scales its position.)
import {
  CELL, BOB_AMP, BOB_PERIOD, HOVER_SCALE, SEL_SCALE, P_COUNT, P_LIFE, P_DIST, FREEZE, ASSETS,
  readParams, installHarness, makeItems, bobY, clampX, clampY, loadImage, loadAtlas,
} from '../shared/scene.js';
import { attachKeyboard, TAP_SLOP } from '../shared/a11y.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
lab.info.renderer = 'dom';
const stage = document.getElementById('stage');
const [{ frames }] = await Promise.all([loadAtlas(), loadImage(ASSETS + 'atlas.png'), loadImage(ASSETS + 'bg.png')]);

const q = (f) => `-${f.x}px -${f.y}px`;
const css = document.createElement('style');
css.textContent = `
#stage{background:url(${ASSETS}bg.png) 0 0/800px 600px}
.item{position:absolute;left:0;top:0;width:${CELL}px;height:${CELL}px;margin:-24px 0 0 -24px;cursor:pointer;touch-action:none;border-radius:50%}
.spr{position:absolute;inset:0;animation:bob ${BOB_PERIOD}ms linear infinite}
.spr::after{content:"";position:absolute;inset:0;background:url(${ASSETS}atlas.png) no-repeat}
${Object.entries(frames).filter(([k]) => k !== 'ring' && k !== 'spark').map(([k, f]) => `.f-${k} .spr::after{background-position:${q(f)}}`).join('\n')}
.item.sel .spr::before{content:"";position:absolute;left:-8px;top:-8px;width:64px;height:64px;background:url(${ASSETS}atlas.png) no-repeat ${q(frames.ring)}}
.item:hover .spr,.item.hov .spr{scale:${HOVER_SCALE}}
.item.sel .spr,.item.drag .spr{scale:${SEL_SCALE}}
.item.drag .spr{animation:none}
.item:focus-visible{outline:3px solid #1a237e;outline-offset:2px}
@keyframes bob{
  0%{translate:0 0;animation-timing-function:cubic-bezier(.61,1,.88,1)}
  25%{translate:0 -${BOB_AMP}px;animation-timing-function:cubic-bezier(.12,0,.39,0)}
  50%{translate:0 0;animation-timing-function:cubic-bezier(.61,1,.88,1)}
  75%{translate:0 ${BOB_AMP}px;animation-timing-function:cubic-bezier(.12,0,.39,0)}
  100%{translate:0 0}}
@media (prefers-reduced-motion:reduce){.spr{animation:none}}
.p{position:absolute;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;pointer-events:none;z-index:100000}
.pi{width:16px;height:16px;background:url(${ASSETS}atlas.png) no-repeat ${q(frames.spark)}}
`;
document.head.append(css);

const items = makeItems(params.n);
const sprs = [];
const els = items.map((it) => {
  const el = document.createElement('div');
  el.className = `item f-${it.frame}`;
  el.dataset.id = String(it.id);
  el.style.transform = `translate(${it.x}px,${it.y}px)`;
  const spr = document.createElement('div');
  spr.className = 'spr';
  spr.style.animationDelay = `${-(it.phase * BOB_PERIOD)}ms`;
  el.append(spr); sprs.push(spr);
  return el;
});
stage.append(...els);

let top = 0, selected = -1, drag = null, rect = null;
let kb = null;   // keyboard layer + tap-to-place (a11y build only)
const place = (id) => { els[id].style.transform = `translate(${items[id].x}px,${items[id].y}px)`; };
const raise = (id) => { els[id].style.zIndex = String(++top); };
const select = (id) => {
  if (selected >= 0) els[selected].classList.remove('sel');
  selected = id;
  if (id >= 0) { els[id].classList.add('sel'); raise(id); }
};

function burst(x, y, age = 0) {
  if (params.reduced) return;
  for (let i = 0; i < P_COUNT; i++) {
    const a = (2 * Math.PI * i) / P_COUNT;
    const o = document.createElement('div'); o.className = 'p';
    o.style.transform = `translate(${x}px,${y}px)`;
    const inner = document.createElement('div'); inner.className = 'pi';
    o.append(inner); stage.append(o);
    const a1 = o.animate([{ translate: '0 0' }, { translate: `${Math.cos(a) * P_DIST}px ${Math.sin(a) * P_DIST}px` }],
      { duration: P_LIFE, easing: 'cubic-bezier(0.33,1,0.68,1)', fill: 'forwards' });
    const a2 = inner.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.5 }], { duration: P_LIFE, fill: 'forwards' });
    if (age) { for (const an of [a1, a2]) { an.currentTime = age; an.pause(); } } else a1.onfinish = () => o.remove();
  }
}

const drop = (id) => { burst(items[id].x, items[id].y); lab.drop(); };

stage.addEventListener('pointerdown', (e) => {
  lab.input(e);
  const el = e.target.closest?.('.item');
  rect = stage.getBoundingClientRect();
  // Tap-to-place: while a decoration is carried, a tap anywhere else places it there.
  if (__A11Y__ && kb.carrying() >= 0 && (!el || Number(el.dataset.id) !== kb.carrying())) {
    e.preventDefault();
    kb.placeAt(e.clientX - rect.left, e.clientY - rect.top);
    return;
  }
  if (!el) { select(-1); return; }
  e.preventDefault();
  const id = Number(el.dataset.id);
  select(id);
  lab.picked.push(id);
  drag = { id, ox: e.clientX - rect.left - items[id].x, oy: e.clientY - rect.top - items[id].y, sx: e.clientX, sy: e.clientY };
  el.classList.add('drag');
  el.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
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
stage.addEventListener('pointerup', end);
stage.addEventListener('pointercancel', end);

lab.getItem = (id) => ({ x: items[id].x, y: items[id].y });
lab.topId = () => items.length - 1;

if (params.freeze) {
  for (const it of items) { sprs[it.id].style.animation = 'none'; sprs[it.id].style.translate = `0 ${bobY(it, FREEZE.t)}px`; }
  select(items.length - 1);
  if (items.length > 1) els[items.length - 2].classList.add('hov');
  burst(FREEZE.burst.x, FREEZE.burst.y, FREEZE.burst.age);
}

if (__A11Y__) {
  kb = attachKeyboard({
    host: stage, items, n: items.length, elements: els,
    pos: (id) => items[id],
    actions: {
      select: (id) => { select(id); els[id].classList.add('drag'); },
      move: (id, dx, dy) => { items[id].x = clampX(items[id].x + dx); items[id].y = clampY(items[id].y + dy); place(id); },
      moveTo: (id, x, y) => { items[id].x = x; items[id].y = y; place(id); },
      drop: (id) => { els[id].classList.remove('drag'); drop(id); },
      cancel: (id) => { els[id].classList.remove('drag'); },
    },
  });
}

requestAnimationFrame(() => lab.markFirstFrame());
