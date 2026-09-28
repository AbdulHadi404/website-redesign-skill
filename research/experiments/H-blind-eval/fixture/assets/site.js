// analytics shim (the real one is injected by the tag manager in production)
window.mlTrack = window.mlTrack || function (ev) { (window.mlEvents = window.mlEvents || []).push(ev); };

// scroll reveal
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('visible')));
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// visit form — posts to /api/visit; marketing tracks submissions
const form = document.getElementById('visit-form');
if (form) form.addEventListener('submit', async (e) => {
  e.preventDefault();
  window.mlTrack(form.dataset.track);
  const msg = document.getElementById('visit-msg');
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || !data.phone) { msg.textContent = 'Invalid input'; msg.style.color = 'red'; return; }
  try {
    const r = await fetch(form.action, { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } });
    msg.textContent = r.ok ? 'Thanks! We will ring you.' : 'Something went wrong';
  } catch { msg.textContent = 'Something went wrong'; }
});
