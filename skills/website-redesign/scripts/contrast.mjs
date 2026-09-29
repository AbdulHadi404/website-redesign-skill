#!/usr/bin/env node
/**
 * Contrast of text/ground pairs — WCAG 2 ratio and APCA Lc — for any CSS colour
 * (hex, rgb, hsl, oklch, lab, color()).
 *
 *   node contrast.mjs '#6b7280' '#ffffff'
 *   node contrast.mjs --fg '#111' '#555' 'oklch(0.55 0.2 30)' --bg '#fff' '#f4f1ea' '#0b0b0c'
 *   node contrast.mjs --css src/styles/tokens.css --fg text text-muted accent-ink --bg surface surface-alt
 *
 * With --css, names are custom properties (with or without the leading --)
 * read from the file; var() references between them are resolved.
 * Needs colorjs.io (MIT) for APCA and non-hex formats: `npm install` in this
 * scripts folder. Without it, hex/rgb pairs still get the WCAG ratio.
 *
 * Reading the result (see design-theory.md B6):
 *   WCAG 2  AA: 4.5 body text, 3 large text (≥24px, or ≥18.66px bold), 3 for
 *           icons, control boundaries and focus rings (1.4.11). AAA: 7 / 4.5.
 *   APCA Lc (absolute value): 90 preferred body, 75 body minimum, 60 other
 *           content text, 45 headlines/large, 30 placeholder/disabled/spot, 15
 *           non-text minimum. Negative Lc = light text on a dark ground.
 * WCAG 2 is the legal/conformance measure; APCA is the better predictor of
 * readability, especially on dark grounds, where WCAG overstates contrast.
 */
import { readFile } from 'node:fs/promises';
import { parseArgs, asList, importModule } from './lib/env.mjs';

const a = parseArgs();
let Color = await importModule('colorjs.io');
if (Color && typeof Color !== 'function') Color = Color.default ?? null;

const vars = {};
if (a.css) {
  const src = await readFile(a.css, 'utf8');
  for (const m of src.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] ??= m[2].trim();
}
const resolve = (v, depth = 0) => {
  const key = v.replace(/^--/, '');
  let val = vars[key] ?? v;
  while (/var\(--([\w-]+)[^)]*\)/.test(val) && depth++ < 10) val = val.replace(/var\(--([\w-]+)[^)]*\)/g, (_, k) => vars[k] ?? `var(--${k})`);
  return val;
};

function srgb(css) {
  if (Color) {
    const c = new Color(css).to('srgb');
    return { rgb: c.coords.map((v) => Math.min(1, Math.max(0, v ?? 0)) * 255), alpha: c.alpha, color: c };
  }
  const h = /^#([0-9a-f]{3,8})$/i.exec(css.trim());
  if (h) {
    const s = h[1].length <= 4 ? [...h[1]].map((x) => x + x).join('') : h[1];
    return { rgb: [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)), alpha: s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1 };
  }
  const m = /rgba?\(([^)]+)\)/.exec(css);
  if (m) { const p = m[1].split(/[\s,/]+/).map(parseFloat); return { rgb: p.slice(0, 3), alpha: p[3] ?? 1 }; }
  throw new Error(`Cannot parse "${css}" without colorjs.io — run npm install in the scripts folder.`);
}
const lum = (rgb) => {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};
const flatten = (fg, bg) => fg.rgb.map((v, i) => v * fg.alpha + bg.rgb[i] * (1 - fg.alpha));
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function pair(fgCss, bgCss) {
  const bg = srgb(resolve(bgCss));
  const fgRaw = srgb(resolve(fgCss));
  const fgRgb = flatten(fgRaw, bg);
  const [L1, L2] = [lum(fgRgb), lum(bg.rgb)].sort((x, y) => y - x);
  const ratio = (L1 + 0.05) / (L2 + 0.05);
  let apca = null;
  if (Color) {
    // colorjs.io: background.contrast(text, 'APCA') matches the reference APCAcontrast(text, bg).
    // The reverse call order silently returns a different number.
    apca = new Color('srgb', bg.rgb.map((v) => v / 255)).contrast(new Color('srgb', fgRgb.map((v) => v / 255)), 'APCA');
  }
  return { fg: fgCss, bg: bgCss, fgHex: hex(fgRgb), bgHex: hex(bg.rgb), ratio, apca };
}

const grade = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large / UI' : 'fail');
const apcaUse = (lc) => {
  const x = Math.abs(lc);
  return x >= 90 ? 'any text' : x >= 75 ? 'body text' : x >= 60 ? 'content text ≥ 16px/500' : x >= 45 ? 'headlines ≥ 24px, icons' : x >= 30 ? 'placeholder, disabled, spot text' : x >= 15 ? 'non-text edges only' : 'invisible';
};

let fgs = asList(a.fg), bgs = asList(a.bg);
if (!fgs.length && !bgs.length && a._.length >= 2) { fgs = [a._[0]]; bgs = [a._[1]]; }
if (!fgs.length || !bgs.length) {
  console.error("Usage: node contrast.mjs '#555' '#fff'   or   --fg a b c --bg x y   [--css tokens.css]");
  process.exit(1);
}

const rows = [];
for (const b of bgs) for (const f of fgs) rows.push(pair(f, b));
const w = Math.max(...rows.map((r) => r.fg.length), 4);
const wb = Math.max(...rows.map((r) => r.bg.length), 6);
console.log(`${'text'.padEnd(w)}  ${'ground'.padEnd(wb)}  WCAG      grade          ${Color ? 'APCA Lc  readable for' : ''}`);
for (const r of rows) {
  const lc = r.apca === null ? '' : `${r.apca >= 0 ? ' ' : ''}${r.apca.toFixed(1).padStart(5)}  ${apcaUse(r.apca)}`;
  console.log(`${r.fg.padEnd(w)}  ${r.bg.padEnd(wb)}  ${r.ratio.toFixed(2).padStart(5)}:1  ${grade(r.ratio).padEnd(13)}  ${lc}`);
}
