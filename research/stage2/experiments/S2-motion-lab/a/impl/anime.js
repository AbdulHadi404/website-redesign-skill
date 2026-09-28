// anime.js v4. Durations in MILLISECONDS; cubicBezier() takes the token's points.
import { animate, createLayout, cubicBezier, onScroll, stagger, utils } from 'animejs';
import { T, reduceGuard } from '../tokens.js';
const $ = (q) => document.querySelector(q);
const ease = cubicBezier(...T.ease.out);

// 1 press — composition 'replace' (the default) starts the new tween from the current value
const btn = $('#press');
btn.addEventListener('pointerdown', () => animate(btn, { scale: 0.97, duration: T.dur.micro, ease }));
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, () => animate(btn, { scale: 1, duration: T.dur.micro, ease }));

// 2 list — createLayout (FLIP, v4.2+)
const list = $('#list');
const layout = createLayout(list, { duration: T.dur.medium, ease });
$('#shuffle').addEventListener('click', () => {
  const lis = [...list.children];
  if (reduceGuard()) { list.append(...lis.reverse()); return; } // rm
  layout.update(() => list.append(...lis.reverse()));
});

// 3 sheet
const sheet = $('#sheet'), tog = $('#sheet-toggle'); let open = false;
tog.addEventListener('click', () => {
  open = !open; tog.setAttribute('aria-expanded', String(open));
  const rm = reduceGuard(); // rm
  if (open && !sheet.open) { sheet.show(); utils.set(sheet, rm ? { opacity: 0 } : { y: '100%' }); }
  animate(sheet, { ...(rm ? { opacity: open ? 1 : 0 } : { y: open ? '0%' : '100%' }), duration: rm ? 150 : T.dur.large, ease,
    onComplete: () => { if (!open) sheet.close(); } });
});

// 4 view — crossfade + slide between two stacked views
const stage = $('#stage');
const b = Object.assign(document.createElement('div'), { className: 'view', id: 'view-b', textContent: 'B' });
stage.append(b); utils.set(b, { opacity: 0 });
let cur = $('#view-a'), next = b;
$('#swap').addEventListener('click', () => {
  const rm = reduceGuard(); // rm
  if (+utils.get(next, 'opacity') === 0) utils.set(next, { x: rm ? 0 : 24 });
  animate(cur, { opacity: 0, x: rm ? 0 : -24, duration: rm ? 150 : T.dur.page, ease });
  animate(next, { opacity: 1, x: 0, duration: rm ? 150 : T.dur.page, ease });
  [cur, next] = [next, cur];
});

// 5 scroll — onScroll observers
const bar = $('#progress');
onScroll({ target: document.body, enter: 'top top', leave: 'bottom bottom', onUpdate: (o) => utils.set(bar, { scaleX: o.progress }) });
if (!reduceGuard()) {
  document.querySelectorAll('.reveal').forEach((el) => {
    utils.set(el, { opacity: 0, y: 16 });
    onScroll({ target: el, enter: 'bottom-=10% top', repeat: true,
      onEnterForward: () => animate(el, { opacity: 1, y: 0, duration: T.dur.medium, ease }),
      onLeaveBackward: () => animate(el, { opacity: 0, y: 16, duration: T.dur.medium, ease }) });
  });
}

// 6 ticker — animate a plain object
const ticker = $('#ticker'); const num = { v: 0 };
const go = (to) => {
  if (reduceGuard()) { utils.remove(num); num.v = to; ticker.textContent = to; return; } // rm
  animate(num, { v: to, duration: T.dur.count, ease, onUpdate: () => { ticker.textContent = Math.round(num.v); } });
};
$('#tick-hi').addEventListener('click', () => go(1000));
$('#tick-lo').addEventListener('click', () => go(200));

// 7 grid
const cells = document.querySelectorAll('#grid .cell'); let on = false;
utils.set(cells, { opacity: 0, y: 12 });
$('#grid-toggle').addEventListener('click', (e) => {
  on = !on; e.currentTarget.setAttribute('aria-pressed', String(on));
  const rm = reduceGuard(); // rm
  animate(cells, { opacity: on ? 1 : 0, y: rm ? 0 : on ? 0 : 12, duration: rm ? 150 : T.dur.medium, ease, delay: rm ? 0 : stagger(T.stagger) });
});
