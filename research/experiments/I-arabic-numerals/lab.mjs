// Arabic + Latin numerals in Chromium: Intl in the browser, digit widths per font, RTL table rendering,
// and what numeric inputs do with Eastern Arabic digits. Usage: node lab.mjs (writes results.json + PNGs)
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { launch } from '../../../skills/website-redesign/scripts/lib/env.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const AR = 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC';
const LA = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const fams = { Plex: ['plex-arabic', 'ibm-plex-sans-arabic-latin'], Noto: ['noto-arabic', 'noto-sans-arabic-latin'], Cairo: ['cairo-arabic', 'cairo-latin'], Tajawal: ['tajawal-arabic', 'tajawal-latin'], Almarai: ['almarai-arabic', 'almarai-latin'] };
const faces = Object.entries(fams).map(([f, [a, l]]) => `@font-face{font-family:"${f}";src:url(fonts/${a}.woff2) format("woff2");unicode-range:${AR}}@font-face{font-family:"${f}";src:url(fonts/${l}.woff2) format("woff2");unicode-range:${LA}}`).join('\n');

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${faces}
body{font:16px Plex,sans-serif;margin:24px;background:#fff;color:#111}
table{border-collapse:collapse;margin-bottom:24px}td,th{border-bottom:1px solid #ddd;padding:6px 12px}
th{font-weight:600;text-align:start}.num{font-variant-numeric:tabular-nums}
.end{text-align:end}.right{text-align:right}.left{text-align:left}
.iso{unicode-bidi:isolate}.ltr{direction:ltr;unicode-bidi:isolate}
caption{text-align:start;font-weight:700;padding:6px 0}
</style></head><body><div id="t"></div>
<label>number <input id="n" type="number"></label>
<label>text numeric <input id="tn" type="text" inputmode="numeric"></label>
<label>decimal <input id="td" type="text" inputmode="decimal"></label>
</body></html>`;

const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html); }
  try { const b = await readFile(path.join(here, decodeURIComponent(req.url))); res.setHeader('content-type', 'font/woff2'); res.end(b); } catch { res.statusCode = 404; res.end(); }
}).listen(0);
const port = server.address().port;
const { browser } = await launch({});
const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
await page.goto(`http://localhost:${port}/`);
await page.evaluate(async () => { for (const f of ['Plex','Noto','Cairo','Tajawal','Almarai']) await Promise.all(['0123456789','٠١٢٣٤٥٦٧٨٩','ابج'].map((t) => document.fonts.load(`16px "${f}"`, t))); await document.fonts.ready; });

const out = {};
out.browser = browser.version();

// 1. Intl in the browser (ICU may differ from Node's)
out.intl = await page.evaluate(() => {
  const L = ['ar', 'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA', 'ar-u-nu-latn', 'ar-SA-u-nu-latn', 'fa-IR', 'he-IL'];
  const show = (s) => [...s].map((c) => ({ '؜': '⟨ALM⟩', '‎': '⟨LRM⟩', '‏': '⟨RLM⟩', ' ': '⟨NBSP⟩', '−': '⟨MINUS⟩' })[c] || c).join('');
  return L.map((l) => ({ l, ns: new Intl.NumberFormat(l).resolvedOptions().numberingSystem, n: show(new Intl.NumberFormat(l).format(1234.5)), pct: show(new Intl.NumberFormat(l, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(-0.042)) }));
});

// 2. Digit advance widths per font, default vs tabular-nums, Western and Eastern Arabic digits
out.digits = await page.evaluate(async (fams) => {
  const r = {};
  for (const f of fams) await Promise.all(['0123456789', '٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹'].map((t) => document.fonts.load(`40px "${f}"`, t)));
  r.loaded = [...document.fonts].filter((ff) => ff.status === 'loaded').map((ff) => `${ff.family} ${ff.unicodeRange.slice(0, 12)}`);
  for (const f of fams) {
    for (const set of [['latn', '0123456789'], ['arab', '٠١٢٣٤٥٦٧٨٩'], ['arabext', '۰۱۲۳۴۵۶۷۸۹']]) {
      for (const tab of [false, true]) {
        const w = [];
        for (const d of set[1]) {
          const s = document.createElement('span');
          s.textContent = d.repeat(10); s.style.cssText = `font:400 40px "${f}";position:absolute;white-space:nowrap;${tab ? 'font-variant-numeric:tabular-nums' : ''}`;
          document.body.append(s); w.push(Math.round(s.getBoundingClientRect().width * 10) / 100); s.remove();
        }
        const used = document.fonts.check(`40px "${f}"`, set[1]);
        r[`${f} ${set[0]}${tab ? ' tnum' : ''}`] = { equal: Math.max(...w) - Math.min(...w) < 0.05, min: Math.min(...w), max: Math.max(...w), fontHasGlyphs: used };
      }
    }
  }
  return r;
}, Object.keys(fams));

// 3. RTL table: the same values formatted three ways, with three alignment choices
await page.evaluate(() => {
  const vals = [1234.5, -4.2, 0.35, -1250, 98765.25];
  const fmt = {
    'ar-EG (٠-٩)': (v) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
    'ar-AE (0-9)': (v) => new Intl.NumberFormat('ar-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
    'raw JS toFixed': (v) => v.toFixed(2),
    'pct ar-EG': (v) => new Intl.NumberFormat('ar-EG', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(v / 100),
    'pct ar-AE': (v) => new Intl.NumberFormat('ar-AE', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(v / 100),
    'raw "-4.2%"': (v) => `${v > 0 ? '+' : ''}${v}%`,
  };
  let h = '';
  for (const [align, cls] of [['text-align:end (numbers at the left edge in RTL)', 'end'], ['text-align:right', 'right'], ['text-align:left', 'left']]) {
    h += `<table><caption>${align}</caption><tr>${Object.keys(fmt).map((k) => `<th>${k}</th>`).join('')}</tr>`;
    for (const v of vals) h += `<tr>${Object.values(fmt).map((f) => `<td class="num ${cls}">${f(v)}</td>`).join('')}</tr>`;
    h += '</table>';
  }
  document.getElementById('t').innerHTML = h;
});
await page.screenshot({ path: path.join(here, 'rtl-tables.png'), fullPage: true });

// 3b. where does the minus sign land? measure x of the sign glyph vs the digits, per format, in an RTL cell
out.signSide = await page.evaluate(() => {
  const cases = { 'raw -4.2%': '-4.2%', 'ar-AE Intl': new Intl.NumberFormat('ar-AE', { style: 'percent', maximumFractionDigits: 1 }).format(-0.042), 'ar-EG Intl': new Intl.NumberFormat('ar-EG', { style: 'percent', maximumFractionDigits: 1 }).format(-0.042), 'raw -1,250.00 in <bdi dir=ltr>': null };
  const res = {};
  for (const [k, text] of Object.entries(cases)) {
    const td = document.createElement('div'); td.style.cssText = 'direction:rtl;font:24px Plex;display:inline-block';
    if (text === null) { const b = document.createElement('bdi'); b.dir = 'ltr'; b.textContent = '-1,250.00'; td.append(b); } else td.textContent = text;
    document.body.append(td);
    const node = (td.firstChild.nodeType === 3 ? td.firstChild : td.firstChild.firstChild);
    const s = node.textContent; const minusAt = [...s].findIndex((c) => c === '-' || c === '−');
    const r = document.createRange(); const idx = s.indexOf(s.match(/[-−]/)[0]);
    r.setStart(node, idx); r.setEnd(node, idx + 1); const mx = r.getBoundingClientRect().x;
    const dIdx = s.search(/[0-9٠-٩]/); r.setStart(node, dIdx); r.setEnd(node, dIdx + 1); const dx = r.getBoundingClientRect().x;
    res[k] = { text: s.replace(/؜/g, '⟨ALM⟩').replace(/‎/g, '⟨LRM⟩'), minusVisually: mx > dx ? 'right of the digits' : 'left of the digits' };
    td.remove();
  }
  return res;
});

// 4. inputs: type Eastern Arabic and Persian digits, read what the page gets
out.inputs = {};
for (const [sel, typed] of [['#n', '١٢٣'], ['#n', '123'], ['#n', '١٢٫٥'], ['#tn', '١٢٣'], ['#td', '١٢٫٥'], ['#tn', '۱۲۳']]) {
  await page.fill(sel, '');
  await page.focus(sel); await page.keyboard.insertText(typed);
  out.inputs[`${sel} ← ${typed}`] = await page.$eval(sel, (el) => ({ value: el.value, valueAsNumber: el.type === 'number' ? el.valueAsNumber : undefined, Number: Number(el.value), validity: el.validity.badInput ? 'badInput' : 'ok' }));
}
out.normalise = await page.evaluate(() => {
  const toLatn = (s) => s.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x6F0).replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/[؜‎‏]/g, '');
  return { '١٢٬٣٤٥٫٥': Number(toLatn('١٢٬٣٤٥٫٥')), '۱۲۳': Number(toLatn('۱۲۳')), 'Intl ar-EG output round-trip': Number(toLatn(new Intl.NumberFormat('ar-EG').format(-4321.5)).replace(/,/g, '')) };
});

await writeFile(path.join(here, 'results.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
