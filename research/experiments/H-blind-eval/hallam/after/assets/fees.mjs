// Fee finder, fee schedule, deadlines and services, rendered from the data files at runtime (so the
// partners' April update to data/fees.json shows at once). The HTML already holds a copy written by
// tools/prerender.mjs, so every page reads correctly before or without this script.
import {
  BUSINESS_TYPES, TURNOVERS, feeFor, needsTurnover, contactHref, resultHTML,
  scheduleHTML, updatedText, deadlinesHTML, taxYearPositions, servicesHTML,
} from './fees-render.mjs';

const dataUrl = (f) => new URL(`../data/${f}`, import.meta.url);
const getJSON = (f) => fetch(dataUrl(f)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(f + ' ' + r.status))));
const root = document.documentElement;
const contactBase = root.dataset.contact || 'contact/';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

function initFinder(el, fees) {
  const type = el.querySelector('#ff-type');
  const turnover = el.querySelector('#ff-turnover');
  const clause = el.querySelector('.ff-turnover-clause');
  const result = el.querySelector('.ff-result');
  const more = el.querySelector('.ff-more');
  const ask = el.querySelector('.ff-ask');
  if (!type || !turnover || !result) return;
  // Without JavaScript the page shows a fixed example (.nojs-only); with it, the controls (.js-only) from first paint.

  let first = true;
  const update = () => {
    const t = type.value;
    const showT = needsTurnover(t);
    clause.hidden = !showT;
    const fee = feeFor(fees, t, turnover.value);
    const html = resultHTML(fee);
    if (result.innerHTML.trim() !== html) {
      result.innerHTML = html;
      if (!first && !reduce.matches) {
        result.classList.remove('is-changing');
        void result.offsetWidth; // restart the cross-fade
        result.classList.add('is-changing');
      }
    }
    if (more) { more.textContent = fee.extra || ''; more.hidden = !fee.extra; }
    if (ask) ask.href = contactHref(contactBase, t, turnover.value, fee.service);
    // On the fees page, mark the package and band that fit.
    document.querySelectorAll('.pkg').forEach((p) => {
      const on = fee.pkg && p.dataset.pkg === fee.pkg.id;
      p.classList.toggle('is-yours', !!on);
      const flag = p.querySelector('.pkg-yours');
      if (flag) flag.hidden = !on;
      p.querySelectorAll('tr[data-band]').forEach((r) => r.classList.toggle('is-yours', !!(on && fee.band && r.dataset.band === fee.band.turnover)));
    });
    first = false;
  };
  type.addEventListener('change', update);
  turnover.addEventListener('change', update);
  result.addEventListener('animationend', () => result.classList.remove('is-changing'));
  update();
}

function initTaxYear(el, fees) {
  const pos = taxYearPositions(fees, new Date());
  el.style.setProperty('--today', pos.today.toFixed(4));
  el.querySelector('.ty-label') && (el.querySelector('.ty-label').textContent = `Tax year ${pos.label}`);
  const marks = el.querySelector('.ty-marks');
  if (marks) {
    marks.innerHTML = pos.marks.map((m) => `<span class="ty-mark" style="--at:${m.at.toFixed(4)}"><span class="ty-mark-label">${m.short}</span></span>`).join('') +
      '<span class="ty-now" style="--at:var(--today)"><span class="ty-now-label">Today</span></span>';
  }
  el.classList.add('is-ready');
}

async function run() {
  const needFees = document.querySelector('[data-finder], [data-schedule], [data-deadlines], [data-taxyear], [data-updated], [data-services], #services');
  if (!needFees) return;
  let fees = null;
  try { fees = await getJSON('fees.json'); } catch (e) { console.warn('Fees not refreshed:', e.message); }
  if (fees) {
    document.querySelectorAll('[data-schedule]').forEach((el) => { el.innerHTML = scheduleHTML(fees, contactBase); });
    document.querySelectorAll('[data-updated]').forEach((el) => { const t = updatedText(fees); if (t) el.textContent = t; });
    document.querySelectorAll('[data-vat]').forEach((el) => { if (fees.vat_note) el.textContent = fees.vat_note; });
    document.querySelectorAll('[data-deadlines]').forEach((el) => { el.innerHTML = deadlinesHTML(fees, new Date()); });
    document.querySelectorAll('[data-taxyear]').forEach((el) => initTaxYear(el, fees));
    document.querySelectorAll('[data-finder]').forEach((el) => initFinder(el, fees));
  }
  const svc = document.querySelectorAll('[data-services], #services');
  if (svc.length) {
    try {
      const services = await getJSON('services.json');
      svc.forEach((el) => { el.innerHTML = servicesHTML(services, fees, contactBase, Number(el.dataset.level || 2)); });
    } catch (e) { console.warn('Services not refreshed:', e.message); }
  }
}
run();

export { BUSINESS_TYPES, TURNOVERS };
