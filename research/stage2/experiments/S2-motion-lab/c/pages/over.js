// "over": no reduced-motion handling anywhere; a decorative blob floats forever from JavaScript.
const $ = (s) => document.querySelector(s);
const sheet = $('#sheet'), open = $('#open-sheet');
open.addEventListener('click', () => { if (sheet.open) sheet.close(); else sheet.show(); });
$('#close-sheet').addEventListener('click', () => sheet.close());
let t; $('#save').addEventListener('click', () => { const el = $('#toast'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 2500); });
let cur = 'a';
$('#next').addEventListener('click', () => { const swap = () => { $('#view-a').hidden = cur === 'a'; $('#view-b').hidden = cur !== 'a'; cur = cur === 'a' ? 'b' : 'a'; };
  if (document.startViewTransition) document.startViewTransition(swap); else swap(); });
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.1 });
document.querySelectorAll('.feature').forEach((el) => io.observe(el));
const stat = $('#stat'); stat.textContent = '0';
const io2 = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io2.disconnect(); const t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 2500); stat.textContent = Math.round(1280 * k).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); });
io2.observe(stat);
const blob = document.querySelector('.blob');
const float = (now) => { blob.style.transform = `translate(${Math.sin(now / 900) * 20}px, ${Math.cos(now / 1100) * 16}px)`; requestAnimationFrame(float); };
requestAnimationFrame(float);
