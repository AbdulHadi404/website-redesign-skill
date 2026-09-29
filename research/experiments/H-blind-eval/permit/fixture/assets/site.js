// Harbourside permits. Analytics via window.hbcTrack(event, props).
window.hbcTrack = window.hbcTrack || ((e, p) => { (window.hbcEvents ||= []).push([e, p || {}]); });
document.querySelectorAll('[data-track="start"]').forEach((a) => a.addEventListener('click', () => hbcTrack('apply_start')));
const form = document.getElementById('apply');
if (form) {
  let human = false;
  document.getElementById('human').addEventListener('click', (e) => { human = !human; e.target.style.background = human ? '#7c3aed' : ''; });
  fetch('../data/zones.json').then((r) => r.json()).then((d) => {
    const sel = form.zone, body = document.querySelector('#zones tbody');
    for (const z of d.zones) {
      sel.insertAdjacentHTML('beforeend', `<option value="${z.code}">CPZ ${z.code}</option>`);
      body.insertAdjacentHTML('beforeend', `<tr><td>${z.code}</td><td>${z.name}</td><td>${z.streets.join(', ')}</td><td>${z.hours}</td></tr>`);
    }
    form.addEventListener('change', () => {
      const z = d.zones.find((x) => x.code === sel.value), m = form.permit_length.value;
      document.getElementById('price').textContent = z && m ? `Fee: £${z.prices[m]}` : '';
    });
  });
  setTimeout(() => { alert('Your session has expired.'); location.reload(); }, 10 * 60 * 1000);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const missing = [...form.elements].filter((el) => el.name && el.type !== 'checkbox' && el.type !== 'file' && !el.value);
    if (missing.length || !human || !form.consent.checked) {
      document.getElementById('errors').innerHTML = '<p class="err">There was a problem with your submission. Please check the form and try again.</p>';
      missing.forEach((m) => hbcTrack('apply_error', { field: m.name }));
      return;
    }
    const data = Object.fromEntries([...form.elements].filter((el) => el.name).map((el) => [el.name, el.type === 'checkbox' ? el.checked : el.type === 'file' ? (el.files[0]?.name || '') : el.value]));
    hbcTrack('apply_submit');
    const res = await fetch('/api/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }).catch(() => null);
    const j = res && res.ok ? await res.json() : null;
    if (j) { hbcTrack('apply_success', { reference: j.reference }); form.innerHTML = '<p>Thank you. Your application has been received.</p>'; }
    else document.getElementById('errors').innerHTML = '<p class="err">Error 500</p>';
  });
}
