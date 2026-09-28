// "good": JS only toggles state; motion lives in good.css. The counter is the one JS animation.
const $ = (s) => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sheet = $('#sheet'), open = $('#open-sheet');
open.addEventListener('click', () => { if (sheet.open) sheet.close(); else sheet.show(); open.setAttribute('aria-expanded', String(sheet.open)); });
$('#close-sheet').addEventListener('click', () => { sheet.close(); open.setAttribute('aria-expanded', 'false'); });
let t; $('#save').addEventListener('click', () => { const el = $('#toast'); el.classList.add('show'); clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 2500); });
// panel: swap which view is shown; transitions retarget if clicked again mid-flight
let cur = $('#view-a'), other = $('#view-b');
$('#next').addEventListener('click', () => { cur.classList.add('leaving'); cur.setAttribute('hidden', ''); other.classList.remove('leaving'); other.removeAttribute('hidden'); [cur, other] = [other, cur]; });
// reveal (implementation.md, "The reveal, written safely")
if (!reduce && document.visibilityState === 'visible') {
  document.documentElement.classList.add('motion');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
  document.querySelectorAll('.feature').forEach((el) => io.observe(el));
  setTimeout(() => document.querySelectorAll('.feature').forEach((el) => el.classList.add('in')), 8000); // fail-safe
}
// counter: final value in the markup; counts up only when motion is allowed
const stat = $('#stat'); const target = 1280; const fmt = (n) => Math.round(n).toLocaleString('en-US');
const bez = (x1, y1, x2, y2) => (x) => { let lo = 0, hi = 1, u = x; for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; const cx = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3; if (cx < x) lo = u; else hi = u; } return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3; };
const ease = bez(0.2, 0, 0, 1);
if (!reduce) {
  stat.textContent = '0';
  const io2 = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io2.disconnect(); const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 800); stat.textContent = fmt(target * ease(k)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, { threshold: 0.5 });
  io2.observe(stat);
}
