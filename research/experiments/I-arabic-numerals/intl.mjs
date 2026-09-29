// What Intl actually emits for Arabic-script locales: digits, separators and invisible bidi marks.
const locales = ['en', 'ar', 'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA', 'ar-DZ', 'ar-u-nu-latn', 'ar-EG-u-nu-latn', 'fa-IR', 'ur-PK', 'he-IL'];
const marks = { '؜': 'ALM', '‎': 'LRM', '‏': 'RLM', ' ': 'NBSP', ' ': 'NNBSP', '⁦': 'LRI', '⁧': 'RLI', '⁨': 'FSI', '⁩': 'PDI', '−': 'MINUS', '٫': 'AR-DEC', '٬': 'AR-THOU', '٪': 'AR-PCT' };
const show = (s) => [...s].map((c) => marks[c] ? `⟨${marks[c]}⟩` : c).join('');
const digitSet = (s) => /[٠-٩]/.test(s) ? 'arab ٠-٩' : /[۰-۹]/.test(s) ? 'arabext ۰-۹' : /[0-9]/.test(s) ? 'latn 0-9' : '?';
const rows = [];
for (const l of locales) {
  const nf = (o) => new Intl.NumberFormat(l, o);
  const r = {
    locale: l,
    resolvedNumberingSystem: nf().resolvedOptions().numberingSystem,
    digits: digitSet(nf().format(1234567.89)),
    number: show(nf().format(1234567.89)),
    negativePercent: show(nf({ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(-0.042)),
    positivePercent: show(nf({ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(0.031)),
    currency: show(nf({ style: 'currency', currency: l.startsWith('fa') ? 'IRR' : l.includes('EG') ? 'EGP' : l.includes('AE') ? 'AED' : l.startsWith('he') ? 'ILS' : l.startsWith('ur') ? 'PKR' : 'SAR' }).format(-1250.5)),
    compact: show(nf({ notation: 'compact' }).format(1250000)),
    unit: show(nf({ style: 'unit', unit: 'liter', maximumFractionDigits: 1 }).format(22.6)),
    date: show(new Intl.DateTimeFormat(l, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 8, 28, 5, 12)))),
  };
  rows.push(r);
}
console.log(`Node ${process.version}, ICU ${process.versions.icu}, CLDR ${process.versions.cldr}`);
console.log(JSON.stringify(rows, null, 1));
