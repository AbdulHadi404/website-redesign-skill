// "static": the behaviour is all there; the motion never arrives.
const $ = (s) => document.querySelector(s);
const sheet = $('#sheet'), open = $('#open-sheet');
open.addEventListener('click', () => { if (sheet.open) sheet.close(); else sheet.show(); open.setAttribute('aria-expanded', String(sheet.open)); });
$('#close-sheet').addEventListener('click', () => sheet.close());
let t; $('#save').addEventListener('click', () => { const el = $('#toast'); el.classList.add('show'); clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 2500); });
let cur = $('#view-a'), other = $('#view-b');
$('#next').addEventListener('click', () => { cur.hidden = true; other.hidden = false; [cur, other] = [other, cur]; });
document.querySelectorAll('.feature').forEach((el) => el.classList.add('fade-in'));
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('visible')));
document.querySelectorAll('.fade-in').forEach((el) => io.observe(el));
// "animated counter": the number is printed, never counted
$('#stat').textContent = (1280).toLocaleString('en-US');
