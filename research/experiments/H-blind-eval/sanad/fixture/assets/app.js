// Sanad dashboard. Arabic is the default; ?lang=en switches to English.
const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar';
const T = {
  ar: { dashboard: 'لوحة التحكم', invoices: 'الفواتير', clients: 'العملاء', reports: 'التقارير', settings: 'الإعدادات', revenue: 'الإيرادات الشهرية', overdue: 'فواتير متأخرة', recent: 'أحدث الفواتير', number: 'رقم الفاتورة', client: 'العميل', issued: 'تاريخ الإصدار', due: 'تاريخ الاستحقاق', net: 'المبلغ', vat: 'الضريبة', total: 'الإجمالي', status: 'الحالة', new: 'فاتورة جديدة', hello: 'مرحباً أحمد 👋', paid: 'مدفوعة', sent: 'مرسلة', overdueS: 'متأخرة', draft: 'مسودة', kTotal: 'إجمالي الإيرادات', kOut: 'مستحقات', kOver: 'متأخرات', kVat: 'ضريبة القيمة المضافة', toggle: 'English' },
  en: { dashboard: 'Dashboard', invoices: 'Invoices', clients: 'Clients', reports: 'Reports', settings: 'Settings', revenue: 'Monthly revenue', overdue: 'Overdue invoices', recent: 'Recent invoices', number: 'Invoice #', client: 'Client', issued: 'Issued', due: 'Due', net: 'Amount', vat: 'VAT', total: 'Total', status: 'Status', new: 'New invoice', hello: 'Hello Ahmed 👋', paid: 'Paid', sent: 'Sent', overdueS: 'Overdue', draft: 'Draft', kTotal: 'Total revenue', kOut: 'Outstanding', kOver: 'Overdue', kVat: 'VAT collected', toggle: 'العربية' },
}[lang];
if (lang === 'ar') document.documentElement.setAttribute('dir', 'rtl');
document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T[el.dataset.i18n]; });
document.getElementById('hello').textContent = T.hello;
const toggle = document.getElementById('lang-toggle');
toggle.textContent = T.toggle; toggle.href = lang === 'ar' ? '?lang=en' : '?';

const money = (n) => (lang === 'ar' ? n.toLocaleString('ar-SA') + ' ر.س' : 'SAR ' + n.toLocaleString('en-US'));
const pct = (n) => (n > 0 ? '+' : '') + n + '%';

fetch('data/invoices.json').then((r) => r.json()).then((d) => {
  const inv = d.invoices;
  const sum = (f) => Math.round(inv.filter(f).reduce((a, x) => a + x.total, 0));
  const kp = [
    [T.kTotal, money(sum((x) => x.status === 'paid')), pct(12.4), ''],
    [T.kOut, money(sum((x) => x.status === 'sent')), pct(-3.1), 'bad'],
    [T.kOver, money(sum((x) => x.status === 'overdue')), pct(8), 'bad'],
    [T.kVat, money(Math.round(inv.reduce((a, x) => a + x.vat, 0))), pct(5.2), ''],
  ];
  document.getElementById('kpis').innerHTML = kp.map(([l, v, dl, c]) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="d ${c}">${dl}</div></div>`).join('');

  // chart: bars, colours hard-coded, no axis
  const svg = document.getElementById('chart');
  const max = Math.max(...d.revenue_by_month.map((m) => m.total));
  svg.innerHTML = d.revenue_by_month.map((m, i) => `<rect x="${i * 16 + 4}%" y="${200 - (m.total / max) * 180}" width="10%" height="${(m.total / max) * 180}" rx="8" fill="${i === 5 ? '#6c5ce7' : '#dcd6ff'}"></rect>`).join('');

  document.getElementById('overdue-list').innerHTML = inv.filter((x) => x.status === 'overdue').map((x) => `<div class="ov"><span><span class="dot"></span>${lang === 'ar' ? x.client_ar : x.client_en}</span><span>${money(x.total)}</span></div>`).join('') || '<div class="ov">No data</div>';

  const render = (rows) => {
    document.getElementById('rows').innerHTML = rows.map((x) => `<tr class="inv-row" data-id="${x.id}"><td>${x.id}</td><td>${lang === 'ar' ? x.client_ar : x.client_en}</td><td>${new Date(x.issued).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td><td>${new Date(x.due).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td><td>${x.net}</td><td>${x.vat}</td><td>${money(x.total)}</td><td><span class="pill ${x.status}">${T[x.status === 'overdue' ? 'overdueS' : x.status]}</span></td></tr>`).join('');
  };
  render(inv);
  document.getElementById('filter').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    render(inv.filter((x) => (x.id + x.client_ar + x.client_en).toLowerCase().includes(q)));
  });
});

document.getElementById('new-invoice').addEventListener('click', () => { document.getElementById('modal').style.display = 'grid'; });
document.getElementById('f-save').addEventListener('click', () => {
  const amt = document.getElementById('f-amount').value;
  const msg = document.getElementById('f-msg');
  if (!amt) { msg.textContent = 'Error'; msg.style.color = 'red'; return; }
  window.sanadTrack?.('invoice_create', { amount: Number(amt) });
  msg.textContent = '✓'; msg.style.color = 'green';
});
