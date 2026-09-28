// GSAP 3 core + Flip + ScrollTrigger + CustomEase. Durations are SECONDS; a cubic-bezier needs CustomEase.
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { T, reduceGuard } from '../tokens.js';
gsap.registerPlugin(Flip, ScrollTrigger, CustomEase);
const $ = (q) => document.querySelector(q);
const s = (ms) => ms / 1000;
const [x1, y1, x2, y2] = T.ease.out;
const ease = CustomEase.create('out', `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);

// 1 press — overwrite:'auto' kills the conflicting tween; the new one starts from the current scale
const btn = $('#press');
btn.addEventListener('pointerdown', () => gsap.to(btn, { scale: 0.97, duration: s(T.dur.micro), ease, overwrite: 'auto' }));
for (const ev of ['pointerup', 'pointerleave', 'pointercancel'])
  btn.addEventListener(ev, () => gsap.to(btn, { scale: 1, duration: s(T.dur.micro), ease, overwrite: 'auto' }));

// 2 list — Flip plugin
const list = $('#list');
$('#shuffle').addEventListener('click', () => {
  const lis = [...list.children];
  const state = Flip.getState(lis);
  list.append(...lis.reverse());
  if (reduceGuard()) return; // rm
  Flip.from(state, { duration: s(T.dur.medium), ease });
});

// 3 sheet
const sheet = $('#sheet'), tog = $('#sheet-toggle'); let open = false;
tog.addEventListener('click', () => {
  open = !open; tog.setAttribute('aria-expanded', String(open));
  const rm = reduceGuard(); // rm
  if (open && !sheet.open) { sheet.show(); gsap.set(sheet, rm ? { opacity: 0, yPercent: 0 } : { yPercent: 100 }); }
  gsap.to(sheet, { ...(rm ? { opacity: open ? 1 : 0 } : { yPercent: open ? 0 : 100 }), duration: s(rm ? 150 : T.dur.large), ease, overwrite: true,
    onComplete: () => { if (!open) sheet.close(); } });
});

// 4 view — crossfade + slide between two stacked views (no view transitions in GSAP)
const stage = $('#stage');
const b = Object.assign(document.createElement('div'), { className: 'view', id: 'view-b', textContent: 'B' });
stage.append(b); gsap.set(b, { autoAlpha: 0 });
let cur = $('#view-a'), next = b;
$('#swap').addEventListener('click', () => {
  const rm = reduceGuard(); // rm
  if (gsap.getProperty(next, 'opacity') === 0) gsap.set(next, { x: rm ? 0 : 24 });
  gsap.to(cur, { autoAlpha: 0, x: rm ? 0 : -24, duration: s(rm ? 150 : T.dur.page), ease, overwrite: true });
  gsap.to(next, { autoAlpha: 1, x: 0, duration: s(rm ? 150 : T.dur.page), ease, overwrite: true });
  [cur, next] = [next, cur];
});

// 5 scroll — ScrollTrigger scrub for progress; batch for reveals
gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
if (!reduceGuard()) {
  gsap.set('.reveal', { opacity: 0, y: 16 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 90%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: s(T.dur.medium), ease, overwrite: true }),
    onLeaveBack: (els) => gsap.to(els, { opacity: 0, y: 16, duration: s(T.dur.medium), ease, overwrite: true }),
  });
}

// 6 ticker
const ticker = $('#ticker'); const num = { v: 0 };
const go = (to) => {
  if (reduceGuard()) { gsap.killTweensOf(num); num.v = to; ticker.textContent = to; return; } // rm
  gsap.to(num, { v: to, duration: s(T.dur.count), ease, overwrite: true, onUpdate: () => { ticker.textContent = Math.round(num.v); } });
};
$('#tick-hi').addEventListener('click', () => go(1000));
$('#tick-lo').addEventListener('click', () => go(200));

// 7 grid
const cells = gsap.utils.toArray('#grid .cell'); let on = false;
gsap.set(cells, { opacity: 0, y: 12 });
$('#grid-toggle').addEventListener('click', (e) => {
  on = !on; e.currentTarget.setAttribute('aria-pressed', String(on));
  const rm = reduceGuard(); // rm
  gsap.to(cells, { opacity: on ? 1 : 0, y: rm ? 0 : on ? 0 : 12, duration: s(rm ? 150 : T.dur.medium), ease, stagger: rm ? 0 : s(T.stagger), overwrite: true });
});
