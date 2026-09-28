// Motion (motion.dev), vanilla. Durations are SECONDS in Motion: every token goes through s().
import { animate, animateView, inView, press, scroll, stagger } from 'motion';
import { T, reduceGuard } from '../tokens.js';
const $ = (q) => document.querySelector(q);
const s = (ms) => ms / 1000;
const ease = T.ease.out; // Motion takes the bezier points as an array
const HW = new URLSearchParams(location.search).has('hw'); // transform strings (WAAPI, compositor) instead of x/y/scale shorthands

// 1 press — the press gesture; release animates back from wherever the press animation is
press('#press', (el) => {
  animate(el, HW ? { transform: 'scale(0.97)' } : { scale: 0.97 }, { duration: s(T.dur.micro), ease });
  return () => animate(el, HW ? { transform: 'scale(1)' } : { scale: 1 }, { duration: s(T.dur.micro), ease });
});

// 2 list — hand-written FLIP (vanilla layout animation, animateLayout, is in the paid Motion+ package)
const list = $('#list'); const running = new Map();
$('#shuffle').addEventListener('click', () => {
  const lis = [...list.children];
  lis.forEach((li) => running.get(li)?.stop());
  const first = new Map(lis.map((li) => [li, li.getBoundingClientRect().top]));
  list.append(...lis.reverse());
  for (const li of lis) {
    li.style.transform = 'none';
    const dy = first.get(li) - li.getBoundingClientRect().top;
    if (reduceGuard()) continue; // rm
    if (dy) running.set(li, animate(li, HW ? { transform: [`translateY(${dy}px)`, 'none'] } : { y: [dy, 0] }, { duration: s(T.dur.medium), ease }));
  }
});

// 3 sheet — show the dialog, animate y; close it only when the exit finishes and nobody reopened it
const sheet = $('#sheet'), tog = $('#sheet-toggle'); let open = false;
tog.addEventListener('click', () => {
  open = !open; tog.setAttribute('aria-expanded', String(open));
  const rm = reduceGuard(); // rm
  if (open && !sheet.open) { sheet.show(); if (rm) sheet.style.opacity = '0'; else sheet.style.transform = 'translateY(100%)'; }
  const target = rm ? { opacity: open ? 1 : 0 } : HW ? { transform: open ? 'translateY(0%)' : 'translateY(100%)' } : { y: open ? '0%' : '100%' };
  animate(sheet, target, { duration: s(rm ? 150 : T.dur.large), ease }).then(() => { if (!open) sheet.close(); });
});

// 4 view — Motion's view-transition builder (animateView), old slides out, new slides in
const stage = $('#stage');
$('#swap').addEventListener('click', () => {
  const swap = () => { const v = stage.firstElementChild; const toB = v.id === 'view-a'; v.id = toB ? 'view-b' : 'view-a'; v.textContent = toB ? 'B' : 'A'; };
  const rm = reduceGuard(); // rm
  animateView(swap, { duration: s(rm ? 150 : T.dur.page), ease }).add(stage)
    .old(rm ? { opacity: 0 } : { opacity: 0, x: -24 }).new(rm ? { opacity: [0, 1] } : { opacity: [0, 1], x: [24, 0] });
});

// 5 scroll — progress on a scroll timeline; reveals with inView (hidden start state only when motion is allowed)
scroll(animate('#progress', { scaleX: [0, 1] }, { ease: 'linear' }));
if (!reduceGuard()) {
  document.querySelectorAll('.reveal').forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; });
  inView('.reveal', (el) => {
    animate(el, { opacity: 1, y: 0 }, { duration: s(T.dur.medium), ease });
    return () => animate(el, { opacity: 0, y: 16 }, { duration: s(T.dur.medium), ease });
  }, { amount: 0.2 });
}

// 6 ticker — a value animation from the current number
const ticker = $('#ticker'); let cur = 0, num;
const go = (to) => {
  num?.stop();
  if (reduceGuard()) { cur = to; ticker.textContent = to; return; } // rm
  num = animate(cur, to, { duration: s(T.dur.count), ease, onUpdate: (v) => { cur = v; ticker.textContent = Math.round(v); } });
};
$('#tick-hi').addEventListener('click', () => go(1000));
$('#tick-lo').addEventListener('click', () => go(200));

// 7 grid — staggered
const cells = document.querySelectorAll('#grid .cell'); let on = false;
animate(cells, { opacity: 0, y: 12 }, { duration: 0 });
$('#grid-toggle').addEventListener('click', (e) => {
  on = !on; e.currentTarget.setAttribute('aria-pressed', String(on));
  const rm = reduceGuard(); // rm
  animate(cells, rm ? { opacity: on ? 1 : 0, y: 0 } : { opacity: on ? 1 : 0, y: on ? 0 : 12 },
    { duration: s(rm ? 150 : T.dur.medium), ease, delay: rm ? 0 : stagger(s(T.stagger)) });
});
