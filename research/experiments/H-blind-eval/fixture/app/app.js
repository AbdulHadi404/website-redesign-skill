// Renders the herd dashboard from the sync service's JSON (same shape in production: /api/herd).
let HERD = [];
const $ = (s) => document.querySelector(s);

async function load() {
  const r = await fetch('../data/herd.json');
  const d = await r.json();
  HERD = d.herd;
  $('#greeting').textContent = `Good morning, Tom 👋`;
  $('#kpis').innerHTML = [
    ['Cows milked', d.totals.cows, '↑ 2', ''],
    ['Litres this milking', d.totals.litres.toLocaleString('en-IE'), '↑ 3.1%', ''],
    ['Average per cow', d.totals.avg, '↓ 0.4', 'down'],
    ['Alerts', d.totals.alerts, '↑ 2', 'down'],
  ].map(([l, v, delta, cls]) => `<div class="card kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="delta ${cls}">${delta}</div><svg width="100%" height="40" viewBox="0 0 100 40"><path d="M0 30 Q 20 5 40 20 T 80 10 T 100 15" fill="none" stroke="#6366f1" stroke-width="2"/></svg></div>`).join('');
  render(HERD);
}

function render(rows) {
  $('#herd-body').innerHTML = rows.map((c, i) => `
    <tr class="cow-row" data-i="${i}" data-tag="${c.tag}">
      <td>${c.tag}</td><td>${c.name}</td><td>${c.group}</td><td>${c.lastYield}</td>
      <td class="${c.change < 0 ? 'chg-down' : 'chg-up'}">${c.change > 0 ? '+' : ''}${c.change}</td>
      <td>${c.conductivity}</td><td><span class="st-dot st-${c.status}"></span></td>
      <td>${c.lastMilked}</td><td>${c.daysInMilk}</td><td class="rowact">⋯</td>
    </tr>`).join('');
  document.querySelectorAll('.cow-row').forEach((tr) => tr.addEventListener('click', () => openPanel(rows[+tr.dataset.i])));
}

function openPanel(c) {
  $('#cow-detail').innerHTML = `<h3>${c.name} <small>${c.tag}</small></h3>
    <p>Group: ${c.group}<br>Yield: ${c.lastYield} L (${c.change > 0 ? '+' : ''}${c.change})<br>Conductivity: ${c.conductivity} mS/cm<br>Days in milk: ${c.daysInMilk}</p>`;
  $('#cow-panel').hidden = false;
  $('#mark-checked').onclick = () => { closePanel(); toast(`${c.name} marked as checked`); window.mlTrack?.('cow_checked'); };
}
function closePanel() { $('#cow-panel').hidden = true; }
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }

$('#herd-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  render(HERD.filter((c) => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q)));
});
$('#sync-btn').addEventListener('click', () => toast('Synced'));
load();
