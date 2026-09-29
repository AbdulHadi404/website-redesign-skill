#!/usr/bin/env node
/**
 * Inspect font families before choosing them: what a face can actually do.
 *
 *   node fonts.mjs path/to/Font.woff2 [more files…]
 *   node fonts.mjs --google "Inter" "IBM Plex Sans Arabic" "Source Serif 4"
 *   node fonts.mjs --google "Alegreya" --style italic [--weight 700]   the instance to inspect
 *   node fonts.mjs brand.woff2 --fallback arial        # metric-matched fallback @font-face (no layout shift on swap)
 *   node fonts.mjs brand-700.woff2 --fallback arial:700 --family "Brand"   # match the weight you fall back to
 *
 * --fallback takes arial, helvetica, helveticaNeue, timesNewRoman, georgia, segoeUI, roboto, verdana, tahoma,
 * trebuchetMS, courierNew, appleSystem, notoSans, openSans, ubuntu (optionally :700, :italic), or a path to a
 * local font file. It prints size-adjust and ascent/descent/line-gap overrides computed from the real metrics
 * (Capsize, MIT), the way fontaine and next/font do.
 *
 * Reports per face: format and size, weight/style, variable axes (wght, opsz,
 * wdth, slnt…), glyph count, scripts in the layout tables, script subsets
 * offered (Google), OpenType features relevant to design decisions —
 * tabular/lining/oldstyle figures (tnum/lnum/onum) — per digit system (Latin, Eastern Arabic, Persian), slashed zero, case-
 * sensitive forms, fractions, small caps, stylistic sets and character
 * variants — whether the *default* figures are already tabular, and
 * x-height and cap-height as a share of the em (large x-height = legible at
 * small UI sizes; small = elegant, needs size).
 *
 * Use it to answer questions a font specimen page does not: "does this sans
 * have tabular figures for the dashboard?", "is there an Arabic companion?",
 * "is it variable or four static files?", "will 14px body read?".
 *
 * Vertical metrics and clipping, per face (all in em):
 *   - hhea, typo and win ascent/descent (and line gaps) and USE_TYPO_METRICS, and the line box each platform builds
 *     from them: Windows (DirectWrite) takes win unless USE_TYPO_METRICS is set, then typo; Chromium on Linux and
 *     Android takes typo with USE_TYPO_METRICS, else hhea (measured here); macOS and iOS take hhea. "⚠ the line box
 *     differs by platform" when their ascents or descents differ by 0.05 em or more (Tajawal: win 1.016/0.375 on
 *     Windows, hhea 0.643/0.357 elsewhere; a smaller difference is listed without the ⚠), and every number below is
 *     then given per platform. The Windows and Apple figures are arithmetic on the font's tables, not a render there.
 *   - what `line-height: normal` resolves to: ascent + descent + line gap (on Windows without USE_TYPO_METRICS, the
 *     gap is what hhea's line spacing exceeds win's by, if anything).
 *   - the clip floor: the least line-height whose line box holds the ink of a content class, for boxes that clip
 *     (truncate, line-clamp, overflow: hidden, a fixed-height chip, button or row). Not a reading-comfort rule:
 *     unclipped paragraphs may let marks spill into the leading. Arabic: plain, vocalised (harakat) and stacked
 *     (hamza and shadda with harakat), two strings each, every class including the lighter ones; Latin: plain and
 *     accented capitals. Shaped with fontkit (marks positioned; a variable face at wght 400, or --weight), within
 *     about 0.013 em of Chromium's ink on Arabic faces; the floors are minima for these strings, rounded up, not
 *     universal constants. "⚠ line-height: normal is below the plain floor" when it is 0.05 em or more below (0.4 px
 *     of ink a side at 16 px): Almarai, Alexandria, Readex Pro.
 *   - for a face with Arabic: glyphs in the Arabic block (U+0600–06FF), which of ڤ گ پ چ ی ک ٫ ٬ ﷼ ؟ ٪ it lacks
 *     (without ٫ ٬ a number that Intl formats for ar-SA or ar-EG switches font mid-number: ⚠), and the Saudi riyal
 *     sign U+20C1 (with --google: whether the family has it, and whether Google's standard CSS serves it at all).
 *
 * Needs fontkit (MIT): `npm install` in this folder. --google needs network
 * access to fonts.googleapis.com (behind a proxy on Node ≥ 22.21 run with
 * NODE_USE_ENV_PROXY=1).
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, importModule } from './lib/env.mjs';

const a = parseArgs();
let fontkit = await importModule('fontkit');
if (fontkit && !fontkit.create && fontkit.default) fontkit = fontkit.default;
if (!fontkit?.create) { console.error('fontkit not found — run `npm install` in the scripts folder.'); process.exit(1); }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const FEATURES = {
  tnum: 'tabular figures', pnum: 'proportional figures', lnum: 'lining figures', onum: 'oldstyle figures', zero: 'slashed zero',
  case: 'case-sensitive forms', frac: 'fractions', sups: 'superscripts', subs: 'subscripts', ordn: 'ordinals', smcp: 'small caps', c2sc: 'caps to small caps',
  ss01: 'stylistic sets', cv01: 'character variants', calt: 'contextual alternates', liga: 'ligatures', dlig: 'discretionary ligatures', swsh: 'swashes',
  init: 'Arabic joining forms', rlig: 'required ligatures', mark: 'mark positioning', kern: 'kerning',
};

async function inspect(buf, label, extra = {}) {
  let font = fontkit.create(buf);
  if (font.fonts) font = font.fonts[0]; // collection
  const feats = new Set(font.availableFeatures || []);
  const scripts = new Set();
  for (const t of [font.GSUB, font.GPOS]) for (const s of t?.scriptList || []) scripts.add(s.tag.trim());
  const upm = font.unitsPerEm;
  const axes = font.variationAxes || {};
  const ss = [...feats].filter((f) => /^ss\d\d$/.test(f));
  const cv = [...feats].filter((f) => /^cv\d\d$/.test(f));
  const named = Object.keys(FEATURES).filter((f) => feats.has(f) && !/^ss01$|^cv01$/.test(f));
  const cover = (s) => [...s].every((ch) => font.hasGlyphForCodePoint?.(ch.codePointAt(0)) ?? font.characterSet.includes(ch.codePointAt(0)));
  // Each digit system is checked on its own: many Arabic faces have tabular Latin digits and proportional Eastern ones.
  const figures = [];
  for (const [name, set] of Object.entries({ 'Latin 0–9': '0123456789', 'Eastern Arabic ٠–٩': '٠١٢٣٤٥٦٧٨٩', 'Persian ۰–۹': '۰۱۲۳۴۵۶۷۸۹' })) {
    if (!cover(set)) continue;
    const widths = (f) => { try { return font.layout(set, f).glyphs.map((g) => g.advanceWidth); } catch { return [...set].map((c) => font.glyphForCodePoint(c.codePointAt(0)).advanceWidth); } };
    const byDefault = new Set(widths({})).size === 1, withTnum = new Set(widths({ tnum: true })).size === 1;
    figures.push(`${name} ${byDefault ? 'tabular by default' : withTnum ? 'proportional; tabular with tnum' : '✗ proportional even with tnum — columns of these digits will not align'}`);
  }
  const coverage = {
    'Latin (basic)': cover('AaZz09'), 'Latin ext.': cover('ĄąŁłŐőȘș'), Vietnamese: cover('ơưạ'), Greek: cover('ΑαΩω'), Cyrillic: cover('ДдЖж'),
    Arabic: cover('ابجدهوز'), 'Arabic-Indic digits': cover('٠١٢٣'), Hebrew: cover('אבג'), Devanagari: cover('अआक'),
  };
  console.log(`\n${label}`);
  // Typographic names (IDs 16/17) where present — legacy ID 1/2 names turn a static 400 into "ExtraLight — Regular" —
  // plus the usWeightClass the file actually carries.
  const nm = (id) => { try { return font.getName?.(id) || null; } catch { return null; } };
  const fam = nm('preferredFamily') || font.familyName, sub = nm('preferredSubfamily') || font.subfamilyName;
  const wt = font['OS/2']?.usWeightClass;
  console.log(`  ${fam} — ${sub}${wt ? ` (weight ${wt}${Object.keys(font.variationAxes || {}).length ? ', default instance' : ''})` : ''}${extra.subsets ? ` · Google subsets: ${extra.subsets.join(', ')}` : ''}`);
  console.log(`  ${extra.bytes ? `${Math.round(extra.bytes / 1024)} KB` : ''}${extra.format ? ` ${extra.format}` : ''} · ${font.numGlyphs} glyphs · upm ${upm}`);
  if (Object.keys(axes).length) console.log(`  variable: ${Object.entries(axes).map(([k, v]) => `${k} ${v.min}–${v.max} (default ${v.default})`).join(', ')}`);
  console.log(`  x-height ${(font.xHeight / upm).toFixed(3)} em · cap height ${(font.capHeight / upm).toFixed(3)} em · x/cap ${(font.xHeight / font.capHeight).toFixed(2)}`);
  console.log(`  figures: ${figures.join(' · ') || 'no digits'}${feats.has('zero') ? ' · slashed zero' : ''}`);
  console.log(`  features: ${named.map((f) => f).join(' ')}${ss.length ? ` · stylistic sets ${ss.join(' ')}` : ''}${cv.length ? ` · character variants ${cv.length}` : ''}`);
  console.log(`  layout scripts: ${[...scripts].join(' ') || '—'} · covers: ${Object.entries(coverage).filter(([, v]) => v).map(([k]) => k).join(', ')}`);
  try { vertical(font, extra); } catch (e) { console.log(`  vertical metrics: could not be read (${String(e.message).slice(0, 80)})`); }
}

// ---- vertical metrics, the line box per platform, clip floors, Arabic coverage ------------------------------------
// Two strings per Arabic class: the second is heavy on descenders and below-marks (kasra, kasratan), which the first
// lacks. Each class includes the lighter ones (vocalised = max(plain, vocalised)).
const CLIP = {
  Arabic: {
    plain: ['الخدمات الإلكترونية', 'جميع الحقوق محفوظة ويمكن مراجعتها'],
    vocalised: ['كُتُبٌ جَمِيلَةٌ', 'يُرِيدُ جِيرَانِي عِنَبًا'],
    stacked: ['أُمَّهَاتٌ إِلَيْكُمْ لَأَنَّ آمِينَ', 'إِنَّ جِئْتُمْ بِأَسْئِلَةٍ لِأُمِّي'],
  },
  Latin: { plain: ['Hxgjpy'], 'accented capitals': ['ÉÅÇgjpy'] },
};
// Letters and signs an Arabic product meets beyond the core alphabet: Gulf and Maghreb loan letters, Persian and Urdu
// letters, Intl's Arabic decimal and group separators, the old riyal ligature, the Arabic question mark and percent.
const ARABIC_EXTRA = [['ڤ', 0x6A4], ['گ', 0x6AF], ['پ', 0x67E], ['چ', 0x686], ['ی', 0x6CC], ['ک', 0x6A9], ['٫', 0x66B], ['٬', 0x66C], ['﷼', 0xFDFC], ['؟', 0x61F], ['٪', 0x66A]];
const RIYAL = 0x20C1;
const RIYAL_NO = 'no: declare a unicode-range: U+20C1 face from a font that has it under this family (multilingual.md)';
const f3 = (x) => String(+x.toFixed(3));
const up2 = (x) => (Math.ceil(x * 100 - 1e-6) / 100).toFixed(2); // a minimum: rounded up
const same = (p, q) => Math.abs(p.a - q.a) < 0.01 && Math.abs(p.d - q.d) < 0.01;

/**
 * The line box each platform builds: ascent a, descent d, line gap (em), grouped by platform. Windows (DirectWrite)
 * takes win unless USE_TYPO_METRICS, then typo; without it, the GDI external leading (what hhea's line spacing exceeds
 * win's by) is its line gap [K]. Chromium on Linux and Android (FreeType through Skia) takes typo with
 * USE_TYPO_METRICS, else hhea: measured, a face with the bit set and typo ≠ hhea got typo's box and gap. macOS and
 * iOS (CoreText) take hhea [K].
 */
function lineBoxes(font) {
  const u = font.unitsPerEm, o = font['OS/2'], h = font.hhea;
  const hhea = { table: 'hhea', a: h.ascent / u, d: -h.descent / u, gap: h.lineGap / u };
  if (!o || !(o.winAscent + o.winDescent)) return { hhea, typo: null, win: null, useTypo: null, groups: [{ names: ['every platform'], ...hhea }] };
  const typo = { table: 'typo', a: o.typoAscender / u, d: -o.typoDescender / u, gap: o.typoLineGap / u };
  const win = { table: 'win', a: o.winAscent / u, d: o.winDescent / u };
  win.gap = Math.max(0, hhea.a + hhea.d + hhea.gap - win.a - win.d);
  const useTypo = !!o.fsSelection?.useTypoMetrics;
  const per = [['macOS', hhea], ['iOS', hhea], ['Linux', useTypo ? typo : hhea], ['Android', useTypo ? typo : hhea], ['Windows', useTypo ? typo : win]];
  const groups = [];
  for (const [name, box] of per) {
    const g = groups.find((x) => same(x, box) && Math.abs(x.gap - box.gap) < 0.01);
    if (g) g.names.push(name); else groups.push({ ...box, names: [name] });
  }
  if (groups.length === 1) groups[0].names = ['every platform'];
  return { hhea, typo, win, useTypo, groups };
}

/** Ink extents (em above and below the baseline) of a shaped string, marks positioned; null when a glyph is missing. */
function ink(font, s) {
  if ([...s].some((ch) => ch.trim() && !font.hasGlyphForCodePoint(ch.codePointAt(0)))) return null;
  const run = font.layout(s);
  let top = -Infinity, bot = Infinity;
  run.glyphs.forEach((g, i) => {
    const b = g.bbox, y = run.positions[i].yOffset || 0;
    if (isFinite(b.maxY) && b.maxY > b.minY) { top = Math.max(top, b.maxY + y); bot = Math.min(bot, b.minY + y); }
  });
  return isFinite(top) ? { a: top / font.unitsPerEm, d: -bot / font.unitsPerEm } : null;
}

/**
 * Clip floors per content class, as a function of the line box {a, d}: the least line-height L whose half-leading
 * (L − a − d) / 2 on each side holds the ink, i.e. L ≥ 2·inkAscent − a + d and L ≥ 2·inkDescent − d + a. The max over
 * a class's strings, and every class includes the lighter ones; null for a class the face has no glyphs for.
 */
function clipFloors(font, classes) {
  const inks = Object.entries(classes).map(([cls, strings]) => [cls, strings.map((s) => ink(font, s)).filter(Boolean)]);
  return (box) => {
    const r = {};
    let prev = -Infinity;
    for (const [cls, ks] of inks) {
      if (!ks.length) { r[cls] = null; continue; }
      prev = Math.max(prev, ...ks.map((k) => Math.max(2 * k.a - box.a + box.d, 2 * k.d - box.d + box.a)));
      r[cls] = prev;
    }
    return r;
  };
}

function vertical(font0, extra) {
  // Ink at the weight text is set in by default: 400 on a variable face (or --weight).
  const wght = font0.variationAxes?.wght, w = Number(a.weight) || 400;
  const font = wght && w >= wght.min && w <= wght.max && w !== wght.default ? font0.getVariation({ wght: w }) : font0;
  const L = lineBoxes(font0);
  const t = (x) => `${f3(x.a)}/${f3(x.d)} gap ${f3(x.gap)}`;
  const tables = [`hhea ${t(L.hhea)}`, L.typo && `typo ${same(L.typo, L.hhea) && Math.abs(L.typo.gap - L.hhea.gap) < 0.001 ? 'as hhea' : t(L.typo)}`,
    L.win && `win ${f3(L.win.a)}/${f3(L.win.d)}`, L.useTypo === null ? 'no OS/2 table' : `USE_TYPO_METRICS ${L.useTypo ? 'on' : 'off'}`].filter(Boolean);
  // Distinct ascent/descent pairs (the gap moves no ink), each with every platform that builds it.
  const boxes = [];
  for (const g of L.groups) { const b = boxes.find((x) => same(x, g)); if (b) b.names.push(...g.names); else boxes.push({ ...g, names: [...g.names] }); }
  const on = (g) => g.names.join(', ');
  // A difference under 0.05 em (0.8 px at 16 px) moves no visible ink: listed, not flagged.
  const spread = Math.max(...boxes.map((p) => Math.max(...boxes.map((q) => Math.max(Math.abs(p.a - q.a), Math.abs(p.d - q.d))))));
  const one = boxes.length > 1 ? '' : L.groups.length > 1 ? ' → the same ascent and descent on every platform; the line gap differs' : ' → one line box on every platform';
  console.log(`  vertical metrics (ascent/descent, em): ${tables.join(' · ')}${one}`);
  if (boxes.length > 1) console.log(`  ${spread >= 0.05 ? '⚠ the line box differs by platform' : 'the line box differs slightly by platform'}: ${boxes.map((b) => `${f3(b.a)}/${f3(b.d)} from ${b.table} on ${on(b)}`).join('; ')}${spread >= 0.05 ? '. Size clipping boxes for the larger floor.' : ''}`);
  const normals = L.groups.map((g) => ({ g, v: g.a + g.d + g.gap }));
  console.log(`  line-height: normal = ${normals.map(({ g, v }) => `${v.toFixed(2)}${L.groups.length > 1 ? ` (${on(g)})` : ''}`).join(' · ')}`);
  // Clip floors per script the face covers (its plain strings), per line box.
  const measured = [], warn = [];
  for (const [script, classes] of Object.entries(CLIP)) {
    if (!Object.values(classes)[0].every((s) => [...s].every((ch) => !ch.trim() || font.hasGlyphForCodePoint(ch.codePointAt(0))))) continue;
    try { measured.push([script, clipFloors(font, classes)]); } catch (e) {
      warn.push(`clip floor, ${script}: fontkit cannot lay out this face (${String(e.message).slice(0, 60)}); measure the ink in a browser`);
    }
  }
  if (measured.length) {
    const cells = (box) => measured.map(([script, at]) => `${script}: ${Object.entries(at(box)).map(([cls, v]) => `${cls} ${v == null ? '— (no glyphs)' : up2(v)}`).join(', ')}`).join(' · ');
    const head = 'clip floor (least line-height whose line box holds the ink: for truncate, line-clamp, overflow: hidden and fixed heights; not a reading rule)';
    if (boxes.length === 1) console.log(`  ${head}: ${cells(boxes[0])}`);
    else { console.log(`  ${head}:`); for (const b of boxes) console.log(`    ${on(b)}: ${cells(b)}`); }
    // line-height: normal well below the plain floor: a clipping box set at normal cuts ordinary text. 0.05 em under
    // it is 0.4 px a side at 16 px (1 px at 40 px); less is not flagged.
    for (const [script, at] of measured) for (const { g, v } of normals) {
      const plain = at(g).plain;
      if (plain != null && plain - v >= 0.05) warn.push(`⚠ line-height: normal (${v.toFixed(2)}${L.groups.length > 1 ? ` on ${on(g)}` : ''}) is below the ${script} plain floor (${up2(plain)}): a clipping box at normal cuts about ${((plain - v) * 8).toFixed(1)} px of plain ${script} ink at 16 px`);
    }
  }
  for (const x of warn) console.log(`  ${x}`);
  if (!font.hasGlyphForCodePoint(0x627)) { // no Arabic
    if (font.hasGlyphForCodePoint(RIYAL)) console.log('  riyal sign U+20C1 ✓');
    return;
  }
  let block = 0;
  for (let c = 0x600; c <= 0x6FF; c++) if (font.hasGlyphForCodePoint(c)) block++;
  const missing = ARABIC_EXTRA.filter(([, c]) => !font.hasGlyphForCodePoint(c)).map(([ch]) => ch);
  const riyal = extra.riyal ?? (font.hasGlyphForCodePoint(RIYAL) ? '✓' : RIYAL_NO);
  console.log(`  Arabic block U+0600–06FF: ${block} of 256 glyphs · ${missing.length ? `missing ${missing.join(' ')}` : 'has ڤ گ پ چ ی ک ٫ ٬ ﷼ ؟ ٪'} · riyal sign U+20C1 ${riyal}`);
  const seps = ['٫', '٬'].filter((c) => missing.includes(c));
  if (seps.length) console.log(`  ⚠ no ${seps.join(' ')} (Arabic decimal and group separators): a number Intl formats for ar-SA or ar-EG switches to a fallback font mid-number`);
}

// Metric-matched fallback: the fallback face scaled and its vertical metrics overridden so that text set in it
// occupies the same space as the web font — no reflow (CLS) when the web font arrives.
async function fallbackFace(buf, label) {
  const unpack = await importModule('@capsizecss/unpack'), core = await importModule('@capsizecss/core');
  if (!unpack?.fromBuffer || !core?.createFontStack) { console.log('  fallback: install @capsizecss/core and @capsizecss/unpack (`npm install` in this folder)'); return; }
  const web = await unpack.fromBuffer(buf);
  const [fbName, variant] = String(a.fallback).split(':');
  let fb;
  if (/\.(ttf|otf|woff2?)$/i.test(fbName)) fb = await unpack.fromBuffer(await readFile(fbName));
  else {
    const lib = JSON.parse(await readFile(path.join(path.dirname(new URL(import.meta.url).pathname), 'lib/fallback-metrics.json'), 'utf8')).fonts;
    const key = Object.keys(lib).find((k) => k.toLowerCase() === fbName.toLowerCase());
    if (!key) { console.log(`  fallback: unknown "${fbName}" — one of ${Object.keys(lib).join(', ')}, or a font file path`); return; }
    fb = variant ? (lib[key].variants?.[variant] || lib[key]) : lib[key];
  }
  const family = String(a.family || web.familyName || label).replace(/"/g, '');
  const { fontFamily, fontFaces } = core.createFontStack([{ ...web, familyName: family }, fb]);
  console.log(`  metric-matched fallback (${fb.fullName || fb.familyName}):\n    font-family: ${fontFamily};\n${String(fontFaces).trim().split('\n').map((l) => '    ' + l).join('\n')}`);
}

async function google(family) {
  // --style italic / --weight 600 pick the instance to inspect (a display face chosen for its italic is judged on it).
  const italic = a.style === 'italic' ? 1 : 0, weight = Number(a.weight) || 400;
  const q = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:ital,wght@${italic},${weight}${italic || weight !== 400 ? '' : ';0,700'}&display=swap`;
  let css = await fetch(q, { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!css) css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`, { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!css) { console.log(`\n${family}: not found on Google Fonts (or no network).`); return; }
  const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)].map((m) => ({ subset: m[1], body: m[2] }));
  const subsets = [...new Set(faces.map((f) => f.subset))];
  if (italic && !faces.some((f) => /font-style:\s*italic/.test(f.body))) console.log(`\n${family}: no italic on Google Fonts — inspecting the upright.`);
  const want = (f) => (!italic || /font-style:\s*italic/.test(f.body));
  const pick = faces.find((f) => f.subset === 'latin' && want(f)) || faces.find((f) => f.subset === 'latin') || faces[0];
  const url = /url\(([^)]+)\)/.exec(pick.body)[1];
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  // The latin subset is inspected for figures and features; for a script-specific family inspect that subset too.
  await inspect(buf, `${family}${/italic/.test(pick.body) ? ' Italic' : ''} (Google Fonts, ${pick.subset} subset)`, { subsets, bytes: buf.length, format: 'woff2' });
  if (a.fallback) await fallbackFace(buf, family);
  const script = faces.find((f) => ['arabic', 'hebrew', 'devanagari', 'thai', 'bengali'].includes(f.subset));
  if (script) {
    const u = /url\(([^)]+)\)/.exec(script.body)[1];
    const b = Buffer.from(await fetch(u).then((r) => r.arrayBuffer()));
    const riyal = script.subset === 'arabic' ? await googleRiyal(family, faces) : undefined;
    await inspect(b, `${family} (Google Fonts, ${script.subset} subset)`, { bytes: b.length, format: 'woff2', riyal });
  }
}

/**
 * U+20C1 on Google Fonts. No subset file says whether the family has it (it is in none of the standard subsets'
 * unicode-ranges, even for the families that draw it), so ask the API for a one-character font: it answers 400 when the
 * family has no glyph. Then say whether the standard CSS would serve it. undefined (the subset file decides) when
 * the probe cannot run.
 */
async function googleRiyal(family, faces) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&text=%E2%83%81`, { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  const url = css && /url\(([^)]+)\)/.exec(css)?.[1];
  const res = url ? await fetch(url).catch(() => null) : null;
  if (!res || (!res.ok && res.status !== 400)) return undefined;
  let has = false;
  if (res.ok) { try { let f = fontkit.create(Buffer.from(await res.arrayBuffer())); if (f.fonts) f = f.fonts[0]; has = f.hasGlyphForCodePoint(RIYAL); } catch { return undefined; } }
  if (!has) return RIYAL_NO;
  const ranges = faces.flatMap((f) => (/unicode-range:\s*([^;]+)/.exec(f.body)?.[1] || '').split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((x) => parseInt(x, 16))));
  const served = ranges.some(([lo, hi = lo]) => RIYAL >= lo && RIYAL <= hi);
  return served ? '✓' : "in the family, but none of Google's standard subsets serves it: load a second stylesheet with &text=%E2%83%81 (it adds a unicode-range: U+20C1 face to the family), or self-host a subset that has it";
}

const families = asList(a.google);
for (const f of families) await google(f);
for (const file of a._) {
  const buf = await readFile(file);
  await inspect(buf, path.basename(file), { bytes: (await stat(file)).size, format: path.extname(file).slice(1) });
  if (a.fallback) await fallbackFace(buf, file);
}
if (!families.length && !a._.length) console.error('Usage: node fonts.mjs <font files…>  |  --google "Family" ["Family" …]');
