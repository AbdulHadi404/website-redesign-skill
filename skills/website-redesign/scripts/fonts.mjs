#!/usr/bin/env node
/**
 * Inspect font families before choosing them: what a face can actually do.
 *
 *   node fonts.mjs path/to/Font.woff2 [more files…]
 *   node fonts.mjs --google "Inter" "IBM Plex Sans Arabic" "Source Serif 4"
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
  console.log(`  ${font.familyName} — ${font.subfamilyName}${extra.subsets ? ` · Google subsets: ${extra.subsets.join(', ')}` : ''}`);
  console.log(`  ${extra.bytes ? `${Math.round(extra.bytes / 1024)} KB` : ''}${extra.format ? ` ${extra.format}` : ''} · ${font.numGlyphs} glyphs · upm ${upm}`);
  if (Object.keys(axes).length) console.log(`  variable: ${Object.entries(axes).map(([k, v]) => `${k} ${v.min}–${v.max} (default ${v.default})`).join(', ')}`);
  console.log(`  x-height ${(font.xHeight / upm).toFixed(3)} em · cap height ${(font.capHeight / upm).toFixed(3)} em · x/cap ${(font.xHeight / font.capHeight).toFixed(2)}`);
  console.log(`  figures: ${figures.join(' · ') || 'no digits'}${feats.has('zero') ? ' · slashed zero' : ''}`);
  console.log(`  features: ${named.map((f) => f).join(' ')}${ss.length ? ` · stylistic sets ${ss.join(' ')}` : ''}${cv.length ? ` · character variants ${cv.length}` : ''}`);
  console.log(`  layout scripts: ${[...scripts].join(' ') || '—'} · covers: ${Object.entries(coverage).filter(([, v]) => v).map(([k]) => k).join(', ')}`);
}

async function google(family) {
  const q = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:ital,wght@0,400;0,700&display=swap`;
  let css = await fetch(q, { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!css) css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`, { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!css) { console.log(`\n${family}: not found on Google Fonts (or no network).`); return; }
  const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)].map((m) => ({ subset: m[1], body: m[2] }));
  const subsets = [...new Set(faces.map((f) => f.subset))];
  const pick = faces.find((f) => f.subset === 'latin') || faces[0];
  const url = /url\(([^)]+)\)/.exec(pick.body)[1];
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  // The latin subset is inspected for figures and features; for a script-specific family inspect that subset too.
  await inspect(buf, `${family} (Google Fonts, ${pick.subset} subset)`, { subsets, bytes: buf.length, format: 'woff2' });
  const script = faces.find((f) => ['arabic', 'hebrew', 'devanagari', 'thai', 'bengali'].includes(f.subset));
  if (script) {
    const u = /url\(([^)]+)\)/.exec(script.body)[1];
    const b = Buffer.from(await fetch(u).then((r) => r.arrayBuffer()));
    await inspect(b, `${family} (Google Fonts, ${script.subset} subset)`, { bytes: b.length, format: 'woff2' });
  }
}

const families = asList(a.google);
for (const f of families) await google(f);
for (const file of a._) {
  const buf = await readFile(file);
  await inspect(buf, path.basename(file), { bytes: (await stat(file)).size, format: path.extname(file).slice(1) });
}
if (!families.length && !a._.length) console.error('Usage: node fonts.mjs <font files…>  |  --google "Family" ["Family" …]');
