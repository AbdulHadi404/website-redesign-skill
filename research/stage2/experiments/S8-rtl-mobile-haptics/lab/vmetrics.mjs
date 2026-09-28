// Arabic vertical metrics against CSS line boxes.
// 1. Font-file metrics (fontkit): hhea, OS/2 typo and win values, USE_TYPO_METRICS, the Saudi riyal sign.
// 2. In Chromium: ink extents of UI strings (canvas measureText, i.e. shaped, marks positioned) versus the
//    ascent/descent the line box is built from; the analytic minimum line-height that contains the ink.
// 3. Ground truth by pixels: each string set at line-heights 1.0–2.0 in single-line boxes; ink found in the
//    screenshot and compared with the box. Validates the arithmetic the glyph-extent probe uses.
// 4. Visual size: Latin x-height and cap height vs Arabic tooth ("body") and alef height.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root } from '../lib/server.mjs';

const require = createRequire('/home/user/website-redesign-skill/skills/website-redesign/scripts/package.json');
const fontkit = require('fontkit');
const { PNG } = require('pngjs');

export const FONTS = [
  ['NotoNaskhArabic', 'Noto Naskh Arabic', 'ar'], ['NotoSansArabic', 'Noto Sans Arabic', 'ar'], ['NotoKufiArabic', 'Noto Kufi Arabic', 'ar'],
  ['IBMPlexSansArabic', 'IBM Plex Sans Arabic', 'ar'], ['Tajawal', 'Tajawal', 'ar'], ['Cairo', 'Cairo', 'ar'], ['Almarai', 'Almarai', 'ar'],
  ['ReadexPro', 'Readex Pro', 'ar'], ['Alexandria', 'Alexandria', 'ar'], ['Vazirmatn', 'Vazirmatn', 'ar'], ['NotoNastaliqUrdu', 'Noto Nastaliq Urdu', 'ur'],
  ['Inter', 'Inter', 'la'], ['IBMPlexSans', 'IBM Plex Sans', 'la'], ['NotoSans', 'Noto Sans', 'la'],
];
// UI strings, from ordinary to worst case. ar_stack stacks hamza + haraka on alef above and below, shadda + fatha.
export const STRINGS = {
  la: { latin: 'Hxgjpy', latin_acc: 'ÉÅÇgjpy' },
  ar: { ar_plain: 'الخدمات الإلكترونية', ar_vocal: 'كُتُبٌ جَمِيلَةٌ', ar_stack: 'أُمَّهَاتٌ إِلَيْكُمْ لَأَنَّ آمِينَ' },
  ur: { ur_plain: 'اردو زبان میں خوش آمدید', ar_stack: 'أُمَّهَاتٌ إِلَيْكُمْ لَأَنَّ آمِينَ' },
};
const LH = [1.0, 1.1, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0, 2.2];

// Ink extents from fontkit's own shaper (no browser): what scripts/fonts.mjs could report. Compared with canvas below.
async function fontkitInk(file, strings) {
  let f = fontkit.create(await readFile(path.join(root, 'fonts', file + '.ttf')));
  if (f.variationAxes?.wght) f = f.getVariation({ wght: 400 });
  const u = f.unitsPerEm, out = {};
  for (const [k, s] of Object.entries(strings)) {
    let run; try { run = f.layout(s, /[\u0600-\u06FF]/.test(s) ? { script: 'arab', direction: 'rtl' } : undefined); } catch (e) { out[k] = { error: String(e.message).slice(0, 60) }; continue; } // fontkit's GPOS code throws on some faces (Noto Nastaliq)
    let top = -1e9, bot = 1e9;
    run.glyphs.forEach((g, i) => { const b = g.bbox, p = run.positions[i]; if (isFinite(b.maxY) && b.maxY > b.minY) { top = Math.max(top, b.maxY + p.yOffset); bot = Math.min(bot, b.minY + p.yOffset); } });
    out[k] = { inkAscent: +(top / u).toFixed(3), inkDescent: +(-bot / u).toFixed(3) };
  }
  return out;
}

async function fileMetrics(file) {
  const buf = await readFile(path.join(root, 'fonts', file + '.ttf'));
  const f = fontkit.create(buf);
  const o = f['OS/2'] || {}, u = f.unitsPerEm;
  const r = (v) => Math.round((v / u) * 1000) / 1000;
  return {
    upm: u, hheaAscent: r(f.hhea.ascent), hheaDescent: r(-f.hhea.descent), hheaLineGap: r(f.hhea.lineGap),
    typoAscender: r(o.typoAscender), typoDescender: r(-o.typoDescender), typoLineGap: r(o.typoLineGap),
    winAscent: r(o.winAscent), winDescent: r(o.winDescent), useTypoMetrics: !!o.fsSelection?.useTypoMetrics,
    hasRiyalSign: f.hasGlyphForCodePoint(0x20C1), version: f.version,
    arabicBlockCoverage: Array.from({ length: 256 }, (_, i) => 0x600 + i).filter((c) => f.hasGlyphForCodePoint(c)).length,
    // characters an Arabic product meets beyond the core alphabet: Gulf/Maghreb loan letters, Persian/Urdu letters,
    // Intl's Arabic decimal and group separators, the old riyal ligature
    missing: Object.entries({ 'ڤ': 0x6A4, 'گ': 0x6AF, 'پ': 0x67E, 'چ': 0x686, 'ی': 0x6CC, 'ک': 0x6A9, 'ٰ': 0x670, '؟': 0x61F, '٪': 0x66A, '٫': 0x66B, '٬': 0x66C, '﷼': 0xFDFC, 'ـ': 0x640 })
      .filter(([, c]) => !f.hasGlyphForCodePoint(c)).map(([k]) => k).join(' ') || null,
  };
}

// Ink bounds (rows with any pixel darker than 200) inside [y0, y1) of a PNG, over the whole width.
function inkRows(png, y0, y1) {
  let top = null, bottom = null;
  for (let y = Math.max(0, y0); y < Math.min(png.height, y1); y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i] < 200) { if (top === null) top = y; bottom = y + 1; break; }
    }
  }
  return { top, bottom };
}

export async function run(browser, base) {
  const out = { note: 'em units; ink measured at 60 px (pixels) and 100 px (canvas); Chromium headless, --font-render-hinting=none', fonts: {} };
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(base + '/fixtures/blank.html');
  for (const [file, family, script] of FONTS) {
    const rec = { family, script, file: await fileMetrics(file), strings: {} };
    const strings = STRINGS[script];
    const fam = `T-${family}`;
    await page.evaluate(async (fam) => { await document.fonts.load(`60px "${fam}"`, 'أبجد Hxg'); await document.fonts.ready; }, fam);
    // Canvas + DOM measures
    const m = await page.evaluate(({ fam, strings }) => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `100px "${fam}"`;
      const res = { strings: {} };
      for (const [k, s] of Object.entries(strings)) {
        const t = c.measureText(s);
        res.strings[k] = { inkAscent: t.actualBoundingBoxAscent / 100, inkDescent: t.actualBoundingBoxDescent / 100, fontAscent: t.fontBoundingBoxAscent / 100, fontDescent: t.fontBoundingBoxDescent / 100 };
      }
      const q = (s) => { const t = c.measureText(s); return t.actualBoundingBoxAscent / 100; };
      res.xHeight = q('x'); res.capHeight = q('H'); res.alefHeight = q('ا');
      // Arabic 'body' (the x-height analogue): median top of dotless bowls and loops — heh, meem, sad, waw, dotless beh
      const b = ['ه', 'م', 'ص', 'و', 'ٮ'].map(q).sort((x, y) => x - y); res.bodyHeight = b[2];
      // line-height: normal in the DOM
      const d = document.createElement('div'); d.style.cssText = `font: 100px "${fam}"; line-height: normal; white-space: nowrap; position: absolute`;
      d.textContent = Object.values(strings)[0]; document.body.append(d);
      res.lineHeightNormal = d.getBoundingClientRect().height / 100; d.remove();
      return res;
    }, { fam, strings });
    rec.lineHeightNormal = +m.lineHeightNormal.toFixed(3);
    rec.visual = { xHeight: +m.xHeight.toFixed(3), capHeight: +m.capHeight.toFixed(3), bodyHeight: +m.bodyHeight.toFixed(3), alefHeight: +m.alefHeight.toFixed(3) };
    const fkInk = await fontkitInk(file, strings);
    for (const [k, s] of Object.entries(strings)) {
      const a = m.strings[k];
      const A = a.fontAscent, D = a.fontDescent;
      // Line box of height L centred on the content area (A + D): needs L >= 2·inkAscent − A + D and L >= 2·inkDescent − D + A.
      const lmin = Math.max(2 * a.inkAscent - A + D, 2 * a.inkDescent - D + A, a.inkAscent + a.inkDescent);
      // Pixel ground truth: one box per line-height, generous gaps.
      const FS = 60, GAP = 130;
      const cells = await page.evaluate(({ fam, s, LH, FS, GAP, rtl }) => {
        document.body.innerHTML = '';
        const wrap = document.createElement('div'); wrap.style.cssText = `position:absolute; left:20px; top:0; direction:${rtl ? 'rtl' : 'ltr'}`;
        document.body.append(wrap);
        let y = GAP;
        const rects = [];
        for (const L of LH) {
          const d = document.createElement('div');
          d.style.cssText = `position:absolute; top:${y}px; left:0; font: ${FS}px/${L} "${fam}"; white-space:nowrap`;
          d.textContent = s; wrap.append(d);
          const r = d.getBoundingClientRect(); rects.push({ L, top: r.top, bottom: r.bottom });
          y += r.height + GAP;
        }
        return { rects, height: y };
      }, { fam, s, LH, FS, GAP, rtl: script !== 'la' });
      await page.setViewportSize({ width: 1400, height: Math.ceil(cells.height) });
      const png = PNG.sync.read(await page.screenshot({ fullPage: false }));
      const sweep = cells.rects.map(({ L, top, bottom }) => {
        const ink = inkRows(png, Math.floor(top - GAP / 2), Math.ceil(bottom + GAP / 2));
        const over = { top: ink.top === null ? 0 : Math.max(0, top - ink.top), bottom: ink.bottom === null ? 0 : Math.max(0, ink.bottom - bottom) };
        // predicted from canvas metrics
        const half = (L - A - D) / 2;
        const pred = { top: Math.max(0, (a.inkAscent - A - half) * FS), bottom: Math.max(0, (a.inkDescent - D - half) * FS) };
        return { L, overTopPx: Math.round(over.top * 10) / 10, overBottomPx: Math.round(over.bottom * 10) / 10, predTopPx: Math.round(pred.top * 10) / 10, predBottomPx: Math.round(pred.bottom * 10) / 10 };
      });
      const firstSafe = sweep.find((r) => r.overTopPx <= 1 && r.overBottomPx <= 1)?.L ?? null;
      const maxErr = Math.max(...sweep.map((r) => Math.max(Math.abs(r.overTopPx - r.predTopPx), Math.abs(r.overBottomPx - r.predBottomPx))));
      rec.strings[k] = {
        text: s, inkAscent: +a.inkAscent.toFixed(3), inkDescent: +a.inkDescent.toFixed(3), lineAscent: +A.toFixed(3), lineDescent: +D.toFixed(3),
        minLineHeight: +lmin.toFixed(2), firstSafeInSweep: firstSafe, probeMaxErrorPx60: +maxErr.toFixed(1),
        fontkitVsCanvasEm: fkInk[k].error ? fkInk[k].error : +Math.max(Math.abs(fkInk[k].inkAscent - a.inkAscent), Math.abs(fkInk[k].inkDescent - a.inkDescent)).toFixed(3),
        clipAt: Object.fromEntries(sweep.filter((r) => [1.0, 1.2, 1.5].includes(r.L)).map((r) => [r.L, { topPx60: r.overTopPx, bottomPx60: r.overBottomPx }])),
      };
    }
    out.fonts[family] = rec;
  }
  // Visual-size pairing, two heuristics: Arabic body vs Latin x-height, and alef vs Latin cap height.
  // The size-adjust that would equalise each (a starting point to judge by eye, not an answer).
  const pair = {};
  for (const latin of ['Inter', 'IBM Plex Sans', 'Noto Sans']) {
    const L = out.fonts[latin].visual;
    pair[latin] = Object.fromEntries(Object.values(out.fonts).filter((f) => f.script === 'ar').map((f) => [f.family,
      { byBody: Math.round((L.xHeight / f.visual.bodyHeight) * 100) + '%', byAlef: Math.round((L.capHeight / f.visual.alefHeight) * 100) + '%' }]));
  }
  out.sizeAdjustToMatch = pair;
  await page.context().close();
  return out;
}
