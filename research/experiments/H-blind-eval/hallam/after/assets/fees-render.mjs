// Pure functions that turn data/fees.json and data/services.json into HTML.
// Used in the browser (assets/fees.mjs) and by tools/prerender.mjs, which writes the same HTML into the
// pages so they read correctly without JavaScript. Every figure on the site comes from the data files.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The enquiry form's option values (the CRM reads these; never change them here).
export const BUSINESS_TYPES = [
  { value: 'Sole trader', label: 'a sole trader' },
  { value: 'Limited company', label: 'a limited company' },
  { value: 'Landlord', label: 'a landlord' },
  { value: 'Individual', label: 'an individual' },
  { value: 'Partnership', label: 'a partnership' },
  { value: 'Other', label: 'something else' },
];
export const TURNOVERS = ['Under £50k', '£50k–£90k', '£90k–£150k', '£150k–£500k', 'Over £500k'];
const NEEDS_TURNOVER = new Set(['Sole trader', 'Limited company']);

// "Up to £50k" -> [0, 50]; "£50k–£150k" -> [50, 150]; "Over £150k" -> [150, Infinity]; "Under £50k" -> [0, 50]
export function range(label) {
  const n = [...String(label).matchAll(/£\s?(\d+(?:\.\d+)?)\s?k/gi)].map((m) => Number(m[1]));
  if (/^(up to|under)/i.test(label) && n.length === 1) return [0, n[0]];
  if (/^over/i.test(label) && n.length === 1) return [n[0], Infinity];
  if (n.length === 2) return [n[0], n[1]];
  return null;
}
const within = (inner, outer) => inner && outer && inner[0] >= outer[0] && inner[1] <= outer[1];

const money = (n) => '£' + Number(n).toLocaleString('en-GB');
const perWords = { month: 'a month', year: 'a year' };
export function priceText(p) {
  if (p.price == null) return null;
  return { figure: money(p.price), per: perWords[p.per] || p.per };
}

// The package (and band) that fits a business type and turnover, by the data's own band labels.
export function feeFor(data, type, turnover) {
  const pkg = (id) => data.packages.find((p) => p.id === id);
  const sa = pkg('sa');
  const payroll = pkg('payroll');
  const payrollBand = payroll && payroll.bands && payroll.bands[0];
  const extra = payrollBand && payrollBand.price != null
    ? `Employ people? Payroll is ${money(payrollBand.price)} per employee ${perWords[payrollBand.per] || payrollBand.per}.`
    : '';
  const quote = (name) => ({ kind: 'quote', name, service: '', extra });
  if (type === 'Landlord' || type === 'Individual') {
    if (!sa) return quote('Self Assessment tax return');
    return { kind: 'from', pkg: sa, figure: money(sa.from), per: perWords[sa.per] || sa.per, name: sa.name, service: 'Personal tax', extra: '' };
  }
  const id = type === 'Sole trader' ? 'sole' : type === 'Limited company' ? 'ltd' : null;
  if (!id) return quote(type === 'Partnership' ? 'Partnership accounts' : 'Your accounts and tax');
  const p = pkg(id);
  if (!p) return quote('Your accounts and tax');
  const r = range(turnover);
  const band = (p.bands || []).find((b) => within(r, range(b.turnover)));
  const alsoSa = id === 'sole' && sa ? `Just need your tax return? ${sa.name}: from ${money(sa.from)} ${perWords[sa.per] || sa.per}.` : '';
  if (!band || band.price == null) return { kind: 'quote', pkg: p, band, name: p.name, service: 'Business accounts', extra: alsoSa || extra };
  return { kind: 'band', pkg: p, band, figure: money(band.price), per: perWords[band.per] || band.per, name: p.name, service: 'Business accounts', extra: alsoSa || extra };
}

export const needsTurnover = (type) => NEEDS_TURNOVER.has(type);

export function contactHref(base, type, turnover, service) {
  const q = new URLSearchParams();
  if (type) q.set('business_type', type);
  if (type && needsTurnover(type) && turnover) q.set('turnover', turnover);
  if (service) q.set('service', service);
  return `${base}?${q.toString()}#enquiry`;
}

export function resultHTML(fee) {
  if (fee.kind === 'quote') {
    return `<p class="ff-figure ff-figure--words">We’ll quote you</p><p class="ff-name">${esc(fee.name)}: ask us for a tailored fixed-fee quote.</p>`;
  }
  const from = fee.kind === 'from' ? '<span class="ff-from">from</span> ' : '';
  return `<p class="ff-figure">${from}<span class="ff-price">${esc(fee.figure)}</span> <span class="ff-per">${esc(fee.per)} <span class="ff-vat">+ VAT</span></span></p><p class="ff-name">${esc(fee.name)}</p>`;
}

// ---------- The fee schedule (fees page) ----------
function bandsTable(p) {
  const rows = p.bands.map((b) => {
    const t = priceText(b);
    const fee = t ? `<span class="fig">${esc(t.figure)}</span> ${esc(t.per)}` : 'We’ll quote you';
    return `<tr data-band="${esc(b.turnover)}"><th scope="row">${esc(b.turnover)}</th><td>${fee}</td></tr>`;
  }).join('');
  const head = p.bands.length === 1 && !range(p.bands[0].turnover) ? 'Basis' : 'Turnover';
  return `<table class="bands"><caption class="vh">${esc(p.name)} fees</caption><thead><tr><th scope="col">${head}</th><th scope="col">Fee + VAT</th></tr></thead><tbody>${rows}</tbody></table>`;
}
const ASK = { sa: ['Individual', 'Personal tax'], sole: ['Sole trader', 'Business accounts'], ltd: ['Limited company', 'Business accounts'], payroll: ['', 'Payroll'] };

export function scheduleHTML(data, contactBase) {
  const cards = data.packages.map((p) => {
    const price = p.bands
      ? bandsTable(p)
      : `<p class="pkg-price"><span class="ff-from">from</span> <span class="fig">${esc(money(p.from))}</span> ${esc(perWords[p.per] || p.per)} + VAT</p>`;
    const [type, service] = ASK[p.id] || ['', ''];
    const href = contactHref(contactBase, type, '', service);
    return `<article class="pkg" id="fee-${esc(p.id)}" data-pkg="${esc(p.id)}" aria-labelledby="fee-${esc(p.id)}-title">
  <p class="pkg-yours" hidden>Your fee</p>
  <h3 id="fee-${esc(p.id)}-title">${esc(p.name)}</h3>
  <p class="pkg-for">For ${esc(p.for.charAt(0).toLowerCase() + p.for.slice(1))}</p>
  ${price}
  <p class="pkg-inc-title">Included</p>
  <ul class="ticks">${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  <a class="btn btn-secondary" href="${esc(href)}">Ask about this fee<span class="vh">: ${esc(p.name)}</span></a>
</article>`;
  }).join('\n');
  return cards;
}

export function updatedText(data) {
  const d = new Date(data.updated + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// ---------- Deadlines ----------
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function parseDayMonth(s) {
  const m = String(s).trim().match(/^(\d{1,2})\s+([a-z]+)/i);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[2].toLowerCase());
  return mi < 0 ? null : { day: Number(m[1]), month: mi };
}
// Deadlines in the order they next fall after `today` (a Date), each with its next date. Without `today`
// (the no-JavaScript copy), the order of the tax year from April.
export function upcoming(data, today) {
  const list = (data.deadlines || []).map((d) => ({ ...d, dm: parseDayMonth(d.date) })).filter((d) => d.dm);
  if (!today) {
    const key = (d) => ((d.dm.month - 3 + 12) % 12) * 40 + d.dm.day; // tax year order, April first
    return list.sort((a, b) => key(a) - key(b)).map((d) => ({ ...d, next: null, days: null }));
  }
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return list.map((d) => {
    let y = today.getFullYear();
    let t = Date.UTC(y, d.dm.month, d.dm.day);
    if (t < t0) t = Date.UTC(++y, d.dm.month, d.dm.day);
    return { ...d, next: new Date(t), days: Math.round((t - t0) / 86400000) };
  }).sort((a, b) => a.next - b.next);
}

export function deadlinesHTML(data, today) {
  const items = upcoming(data, today);
  return items.map((d, i) => {
    const [day, ...rest] = d.date.trim().split(/\s+/);
    const year = d.next ? ` ${d.next.getUTCFullYear()}` : '';
    const iso = d.next ? d.next.toISOString().slice(0, 10) : '';
    const when = d.days == null ? '' : d.days === 0 ? 'today' : d.days === 1 ? 'tomorrow' : `in ${d.days} days`;
    const next = i === 0 && today ? ' is-next' : '';
    const time = iso ? `<time datetime="${iso}">` : '<span>';
    const end = iso ? '</time>' : '</span>';
    return `<li class="deadline${next}">${time}<span class="dl-day">${esc(day)}</span> <span class="dl-month">${esc(rest.join(' '))}${esc(year)}</span>${end}<span class="dl-what">${esc(d.what)}</span>${when ? `<span class="dl-when">${i === 0 ? '<strong>Next deadline,</strong> ' : ''}${esc(i === 0 ? when : when.charAt(0).toUpperCase() + when.slice(1))}</span>` : '<span class="dl-when" aria-hidden="true">&nbsp;</span>'}</li>`;
  }).join('');
}

// Where today and each deadline sit along the UK tax year (6 April to 5 April), as fractions 0–1.
export function taxYearPositions(data, today) {
  const start = (y) => Date.UTC(y, 3, 6);
  const y0 = today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6) ? today.getFullYear() : today.getFullYear() - 1;
  const a = start(y0);
  const b = start(y0 + 1);
  const at = (t) => (t - a) / (b - a);
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const marks = (data.deadlines || []).map((d) => {
    const dm = parseDayMonth(d.date);
    if (!dm) return null;
    let t = Date.UTC(y0, dm.month, dm.day);
    if (t < a) t = Date.UTC(y0 + 1, dm.month, dm.day);
    return { date: d.date, short: d.date.replace(/^(\d+\s+\w{3})\w*/, '$1'), at: at(t) };
  }).filter(Boolean);
  return { today: at(t0), marks, label: `${y0}/${String((y0 + 1) % 100).padStart(2, '0')}` };
}

// ---------- Services ----------
const SERVICE_FEES = {
  tax: (d) => { const p = d.packages.find((x) => x.id === 'sa'); return p ? `From ${money(p.from)} ${perWords[p.per] || p.per} + VAT` : ''; },
  business: (d) => {
    const lows = ['sole', 'ltd'].map((id) => d.packages.find((x) => x.id === id)).filter(Boolean)
      .map((p) => ({ p, b: (p.bands || []).filter((b) => b.price != null).sort((x, y) => x.price - y.price)[0] })).filter((x) => x.b);
    return lows.map(({ p, b }, i) => `${i ? p.for.toLowerCase() : p.for} from ${money(b.price)} ${perWords[b.per] || b.per}`).join('; ') + (lows.length ? ', + VAT' : '');
  },
  vat: (d) => { const p = d.packages.find((x) => x.id === 'ltd'); return p && p.includes.some((i) => /VAT/.test(i)) ? 'Quarterly VAT returns are included in the limited company package; otherwise we’ll quote you' : 'We’ll quote you'; },
  payroll: (d) => { const p = d.packages.find((x) => x.id === 'payroll'); const b = p && p.bands && p.bands[0]; return b && b.price != null ? `${money(b.price)} per employee ${perWords[b.per] || b.per} + VAT` : ''; },
  advice: () => 'We’ll quote you',
};
const ASK_LABEL = { tax: 'Ask about personal tax', business: 'Ask about accounts', vat: 'Ask about VAT', payroll: 'Ask about payroll', advice: 'Ask about advice' };
const SERVICE_FORM = { tax: 'Personal tax', business: 'Business accounts', vat: 'VAT', payroll: 'Payroll', advice: 'Business advice' };

export function servicesHTML(services, fees, contactBase, headingLevel = 2) {
  const h = `h${headingLevel}`;
  return `<ul class="service-list" role="list">${services.map((s) => {
    const fee = fees && SERVICE_FEES[s.id] ? SERVICE_FEES[s.id](fees) : '';
    const href = contactHref(contactBase, '', '', SERVICE_FORM[s.id] || '');
    return `<li class="service" id="service-${esc(s.id)}"><${h} class="service-name">${esc(s.name)}</${h}><p class="service-summary">${esc(s.summary)}</p>${fee ? `<p class="service-fee">${esc(fee)}</p>` : ''}<a class="service-ask" href="${esc(href)}">${esc(ASK_LABEL[s.id] || 'Ask about this')}<span class="vh">: ${esc(s.name)}</span></a></li>`;
  }).join('')}</ul>`;
}
