// "gsap": the same spec with GSAP 3 + ScrollTrigger + CustomEase; reduced motion through gsap.matchMedia().
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
gsap.registerPlugin(ScrollTrigger, CustomEase);
const $ = (s) => document.querySelector(s);
const out = CustomEase.create('out', 'M0,0 C0.2,0 0,1 1,1');
const emph = CustomEase.create('emph', 'M0,0 C0.05,0.7 0.1,1 1,1');
const mm = gsap.matchMedia();
mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
  const { reduce } = ctx.conditions;
  // press: scale on pointer down/up (essential feedback, kept under reduce)
  document.querySelectorAll('.btn').forEach((b) => {
    b.addEventListener('pointerdown', () => gsap.to(b, { scale: 0.97, duration: 0.1, ease: out, overwrite: 'auto' }));
    for (const ev of ['pointerup', 'pointerleave']) b.addEventListener(ev, () => gsap.to(b, { scale: 1, duration: 0.1, ease: out, overwrite: 'auto' }));
  });
  // plan hover: lift + shadow; shadow only under reduce
  document.querySelectorAll('.plan').forEach((p) => {
    p.addEventListener('mouseenter', () => gsap.to(p, { y: reduce ? 0 : -4, boxShadow: '0 8px 24px rgba(0,0,0,.12)', duration: 0.15, ease: out, overwrite: 'auto' }));
    p.addEventListener('mouseleave', () => gsap.to(p, { y: 0, boxShadow: '0 1px 2px rgba(0,0,0,.08)', duration: 0.15, ease: out, overwrite: 'auto' }));
  });
  // sheet
  const sheet = $('#sheet'), open = $('#open-sheet'); let isOpen = false;
  open.addEventListener('click', () => { isOpen = !isOpen; open.setAttribute('aria-expanded', String(isOpen));
    if (isOpen && !sheet.open) { sheet.show(); gsap.set(sheet, reduce ? { opacity: 0, yPercent: 0 } : { yPercent: 100, opacity: 1 }); }
    gsap.to(sheet, { ...(reduce ? { opacity: isOpen ? 1 : 0 } : { yPercent: isOpen ? 0 : 100 }), duration: reduce ? 0.15 : 0.3, ease: out, overwrite: true, onComplete: () => { if (!isOpen) sheet.close(); } }); });
  $('#close-sheet').addEventListener('click', () => { if (isOpen) open.click(); });
  // toast
  let t; $('#save').addEventListener('click', () => { const el = $('#toast'); gsap.fromTo(el, reduce ? { opacity: 0 } : { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduce ? 0.15 : 0.24, ease: out, overwrite: true });
    clearTimeout(t); t = setTimeout(() => gsap.to(el, { opacity: 0, duration: 0.15 }), 2500); });
  // panel swap: crossfade + slide, interruptible (overwrite)
  let cur = $('#view-a'), other = $('#view-b'); gsap.set(other, { opacity: 0 }); other.removeAttribute('hidden');
  $('#next').addEventListener('click', () => { gsap.to(cur, { opacity: 0, x: reduce ? 0 : -24, duration: reduce ? 0.15 : 0.4, ease: out, overwrite: true });
    if (gsap.getProperty(other, 'opacity') === 0) gsap.set(other, { x: reduce ? 0 : 24 });
    gsap.to(other, { opacity: 1, x: 0, duration: reduce ? 0.15 : 0.4, ease: out, overwrite: true }); [cur, other] = [other, cur]; });
  if (!reduce) {
    // hero entrance, feature reveals, counter — only when motion is allowed; content is finished otherwise
    gsap.from('#hero-title', { opacity: 0, y: 12, duration: 0.7, ease: emph });
    gsap.set('.feature', { opacity: 0, y: 16 });
    ScrollTrigger.batch('.feature', { start: 'top 85%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.24, ease: out, stagger: 0.04 }) });
    const stat = $('#stat'); const n = { v: 0 }; stat.textContent = '0';
    ScrollTrigger.create({ trigger: stat, start: 'top 75%', once: true, onEnter: () => gsap.to(n, { v: 1280, duration: 0.8, ease: out, onUpdate: () => { stat.textContent = Math.round(n.v).toLocaleString('en-US'); } }) });
  } else {
    gsap.from('#hero-title', { opacity: 0, duration: 0.15, ease: out });
  }
});
