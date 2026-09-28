// Mixed-script lines: does a Latin paragraph keep an even line pitch when Arabic words join it?
// Conditions (Inter 16 px, 300 px measure, Arabic words on some lines):
//  A fallback, line-height normal      font-family: Inter, <Arabic>            line-height: normal
//  B fallback, line-height 1.5         same, line-height 1.5
//  C span, line-height 1.5             <span lang="ar"> with :lang(ar) { font-family: <Arabic> }
//  D span + metric overrides           C, the Arabic face redeclared with ascent/descent-override = Inter's (not in Safari)
//  E span + line-height: 1 on the span C, :lang(ar) { line-height: 1 }  (a fix that works in every engine)
//  F one family, unicode-range         the Arabic face mapped under the Latin family name by unicode-range
// Baselines are read from zero-size inline-block markers after every word (they sit on the baseline).
const ARABIC = [['Noto Naskh Arabic', 'NotoNaskhArabic'], ['Noto Sans Arabic', 'NotoSansArabic'], ['IBM Plex Sans Arabic', 'IBMPlexSansArabic'],
  ['Tajawal', 'Tajawal'], ['Cairo', 'Cairo'], ['Noto Nastaliq Urdu', 'NotoNastaliqUrdu']];
const TEXT = 'Your order ships from Riyadh. The courier (مندوب التوصيل) will call before arriving. Track it under الطلبات الحالية in the app. Payment: بطاقة مدى or cash. Questions? Write to support any time; we answer in English and العربية.';

export async function run(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/fixtures/blank.html');
  const out = { text: TEXT, fonts: {} };
  for (const [fam, file] of ARABIC) {
    const r = await page.evaluate(async ({ fam, file, TEXT }) => {
      // Inter's own metrics as overrides for D (hhea 0.969 / 0.241, gap 0)
      const extra = document.getElementById('extra') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'extra' }));
      extra.textContent = `
        @font-face { font-family: "OV-${fam}"; src: url(/fonts/${file}.ttf); ascent-override: 96.9%; descent-override: 24.1%; line-gap-override: 0%; }
        @font-face { font-family: "UR-Brand"; src: url(/fonts/Inter.ttf); unicode-range: U+0000-05FF, U+2000-206F; }
        @font-face { font-family: "UR-Brand"; src: url(/fonts/${file}.ttf); unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF; }`;
      await document.fonts.load(`16px "T-${fam}"`, 'عربي'); await document.fonts.load('16px "T-Inter"', 'Hx');
      await document.fonts.load(`16px "OV-${fam}"`, 'عربي'); await document.fonts.load('16px "UR-Brand"', 'عربي Hx');
      const conds = {
        A_fallback_normal: { ff: `"T-Inter", "T-${fam}"`, lh: 'normal', span: null },
        B_fallback_1_5: { ff: `"T-Inter", "T-${fam}"`, lh: '1.5', span: null },
        C_span_1_5: { ff: '"T-Inter"', lh: '1.5', span: `font-family: "T-${fam}"` },
        D_span_overrides: { ff: '"T-Inter"', lh: '1.5', span: `font-family: "OV-${fam}"` },
        E_span_lh1: { ff: '"T-Inter"', lh: '1.5', span: `font-family: "T-${fam}"; line-height: 1` },
        F_unicode_range: { ff: '"UR-Brand"', lh: '1.5', span: null },
      };
      const res = {};
      for (const [k, c] of Object.entries(conds)) {
        document.body.innerHTML = '';
        const p = document.createElement('p');
        p.style.cssText = `width: 300px; margin: 20px; font: 16px/${c.lh} ${c.ff}`;
        const parts = TEXT.split(/([؀-ۿ][؀-ۿ\s]*[؀-ۿ])/);
        for (const part of parts) {
          const isAr = /[؀-ۿ]/.test(part);
          const host = isAr && c.span ? Object.assign(document.createElement('span'), { lang: 'ar' }) : null;
          if (host) host.style.cssText = c.span;
          for (const w of part.split(/(\s+)/)) {
            if (!w) continue;
            (host || p).append(document.createTextNode(w));
            if (!/\s/.test(w)) { const m = document.createElement('i'); m.className = 'bl'; m.style.cssText = 'display:inline-block;width:0;height:0'; (host || p).append(m); }
          }
          if (host) p.append(host);
        }
        document.body.append(p);
        const lines = new Map();
        for (const m of p.querySelectorAll('i.bl')) { const y = Math.round(m.getBoundingClientRect().top * 10) / 10; lines.set(y, (lines.get(y) || 0) + 1); }
        const ys = [...lines.keys()].sort((a, b) => a - b);
        const pitches = ys.slice(1).map((y, i) => Math.round((y - ys[i]) * 10) / 10);
        // which lines hold Arabic
        const arLines = new Set();
        for (const n of p.querySelectorAll('i.bl')) { const prev = n.previousSibling; if (prev && /[؀-ۿ]/.test(prev.textContent)) arLines.add(Math.round(n.getBoundingClientRect().top * 10) / 10); }
        res[k] = { lines: ys.length, pitches, spread: pitches.length ? Math.round((Math.max(...pitches) - Math.min(...pitches)) * 10) / 10 : 0,
          arabicLines: ys.map((y, i) => (arLines.has(y) ? i : null)).filter((x) => x !== null), height: Math.round(p.getBoundingClientRect().height * 10) / 10 };
      }
      return res;
    }, { fam, file, TEXT });
    out.fonts[fam] = r;
  }
  await ctx.close();
  return out;
}
