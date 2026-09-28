#!/usr/bin/env node
/**
 * Sample a logo's colours, and build role-based OKLCH scales from a brand colour.
 *
 *   node palette.mjs --from public/logo.svg          # colours in the mark, by use
 *   node palette.mjs --from logo.png                 # dominant colours in a raster
 *   node palette.mjs --brand '#1A3CF2' [--name blue] [--dark] [--css out.css]
 *
 * --brand builds a 12-step scale on the Radix role model (design-theory.md B5):
 *   1–2 backgrounds · 3–5 component fills (rest/hover/pressed) · 6–8 borders
 *   (subtle/interactive/strong) · 9 solid (= the brand colour itself) · 10 solid
 *   hover · 11 low-contrast text · 12 high-contrast text
 * Hue is held at the brand hue; lightness is stepped; chroma rises toward the
 * middle and falls at the ends; out-of-gamut steps are clamped by chroma, never
 * by lightness. Steps 11 and 12 are *solved*, not guessed: the darkest
 * lightness that reaches APCA Lc 60 and WCAG 4.5:1 (step 11) / Lc 90 and 7:1
 * (step 12) against step 2 — the Radix targets plus the conformance floor. A tinted neutral scale on the same hue comes
 * with it. The output is a starting point to judge on real surfaces — never
 * judge a colour from a swatch (Albers).
 *
 * Needs colorjs.io (MIT); raster sampling needs pngjs. `npm install` here.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs, importModule } from './lib/env.mjs';

const a = parseArgs();
let Color = await importModule('colorjs.io');
if (Color && typeof Color !== 'function') Color = Color.default ?? null;
if (!Color) { console.error('colorjs.io not found — run `npm install` in the scripts folder.'); process.exit(1); }

const toHex = (c) => c.to('srgb').toGamut({ space: 'srgb' }).toString({ format: 'hex', collapse: false });
const oklch = (c) => { const [l, ch, h] = c.to('oklch').coords; return `oklch(${(l * 100).toFixed(1)}% ${(ch ?? 0).toFixed(3)} ${(h ?? 0).toFixed(1)})`; };
const wcag = (x, y) => x.contrast(y, 'WCAG21');
const apca = (bg, fg) => bg.contrast(fg, 'APCA'); // background first — see contrast.mjs

// ---------------------------------------------------------------- sampling
if (a.from) {
  const file = String(a.from);
  const counts = new Map();
  if (/\.svg$/i.test(file)) {
    const svg = await readFile(file, 'utf8');
    const re = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|[a-z]+)\b/gi;
    for (const m of svg.matchAll(re)) {
      const v = m[1];
      if (/^(none|currentcolor|transparent|inherit|url)$/i.test(v)) continue;
      try { const hx = toHex(new Color(v)); counts.set(hx, (counts.get(hx) || 0) + 1); } catch { /* not a colour */ }
    }
    if (/currentcolor/i.test(svg)) console.log('note: the mark uses currentColor somewhere — its colour comes from the page, not the file.');
  } else {
    const PNG = await importModule('pngjs');
    const png = (PNG.PNG ?? PNG).sync.read(await readFile(file));
    const { data, width, height } = png;
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 60000)));
    for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const q = [0, 1, 2].map((k) => Math.round(data[i + k] / 12) * 12);
      const hx = '#' + q.map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('');
      counts.set(hx, (counts.get(hx) || 0) + 1);
    }
  }
  // merge perceptually close colours (ΔE OK < 0.04)
  const sorted = [...counts.entries()].sort((p, q) => q[1] - p[1]);
  const groups = [];
  for (const [hx, n] of sorted) {
    const c = new Color(hx);
    const g = groups.find((g) => g.c.deltaE(c, 'OK') < 0.04);
    if (g) g.n += n; else groups.push({ c, hx, n });
  }
  const total = groups.reduce((s, g) => s + g.n, 0);
  console.log(`Colours in ${file} (by ${/\.svg$/i.test(file) ? 'number of uses' : 'pixel area'}):\n`);
  console.log('hex       share  oklch                         role guess');
  for (const g of groups.slice(0, 10)) {
    const [l, ch] = g.c.to('oklch').coords;
    const role = (ch ?? 0) < 0.03 ? (l > 0.9 ? 'near-white / ground' : l < 0.25 ? 'near-black / ink' : 'neutral') : 'brand hue';
    console.log(`${g.hx}  ${String(Math.round((g.n / total) * 100)).padStart(4)}%  ${oklch(g.c).padEnd(28)}  ${role}`);
  }
  console.log('\nRecord these in DESIGN.md ("Logo colours sampled"), then build scales: node palette.mjs --brand <hex>');
  if (!a.brand) process.exit(0);
  console.log();
}

// ---------------------------------------------------------------- scales
if (!a.brand) { console.error('Usage: --from <logo.svg|png>  and/or  --brand <colour> [--name blue] [--dark] [--css out.css]'); process.exit(1); }
const brand = new Color(String(a.brand)).to('oklch');
const [BL, BC, BH0] = brand.coords;
const BH = BH0 ?? 0;
const name = a.name || 'brand';
const ROLES = ['app background', 'subtle background', 'component', 'component hover', 'component active', 'subtle border', 'border', 'strong border', 'solid', 'solid hover', 'text (low contrast)', 'text (high contrast)'];

function mk(l, c, h = BH) { return new Color('oklch', [l, c, h]).toGamut({ space: 'srgb', method: 'oklch.c' }); }

function scale({ dark = false, chroma = BC, neutral = false }) {
  // Lightness for steps 1–8 (Radix-like spacing); chroma share per step.
  const Ls = dark ? [0.17, 0.2, 0.25, 0.29, 0.33, 0.38, 0.44, 0.53] : [0.99, 0.975, 0.945, 0.915, 0.88, 0.84, 0.78, 0.7];
  const Cs = neutral ? [0.25, 0.35, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9] : [0.06, 0.12, 0.26, 0.38, 0.48, 0.58, 0.7, 0.85];
  const steps = Ls.map((l, i) => mk(l, chroma * Cs[i]));
  // 9: the brand itself (light); on dark, lifted if it would sink into the ground.
  let solid = neutral ? mk(dark ? 0.6 : 0.55, chroma) : mk(BL, BC);
  if (dark && !neutral && Math.abs(apca(steps[1], solid)) < 30) solid = mk(Math.max(BL, 0.62), BC * 0.9);
  const hover = mk(solid.coords[0] + (dark ? 0.05 : -0.05), (solid.coords[1] ?? 0) * 1.02);
  // 11 and 12: search lightness for the APCA target *and* the WCAG ratio against
  // step 2 — Lc 60 alone can land at ~3.5:1, which fails WCAG AA for small text.
  const solve = (target, ratio) => {
    let best = null;
    for (let i = 0; i <= 200; i++) {
      const l = dark ? 0.55 + i * 0.0022 : 0.75 - i * 0.0033;
      const c = mk(l, chroma * (neutral ? 0.9 : 0.7));
      if (Math.abs(apca(steps[1], c)) >= target && wcag(steps[1], c) >= ratio) { best = c; break; }
    }
    return best ?? mk(dark ? 0.98 : 0.1, chroma * 0.3);
  };
  return [...steps, solid, hover, solve(60, 4.5), solve(90, 7)];
}

function table(title, s, dark) {
  const ground = s[1];
  const white = new Color('#fff'), black = new Color('#111');
  console.log(`${title}\n`);
  console.log('step  role                     hex      oklch                         vs step 2: WCAG   APCA');
  s.forEach((c, i) => {
    const w = wcag(ground, c), p = apca(ground, c);
    console.log(`${String(i + 1).padStart(4)}  ${ROLES[i].padEnd(23)}  ${toHex(c)}  ${oklch(c).padEnd(28)}  ${w.toFixed(2).padStart(6)}:1  ${p.toFixed(0).padStart(5)}`);
  });
  // Non-text contrast (WCAG 1.4.11): the lightest step that reaches 3:1 against both grounds — for the focus ring
  // and for control borders that carry meaning (inputs, checkboxes). Decorative borders may stay lighter.
  const ok = s.map((c, i) => [i, Math.min(wcag(s[0], c), wcag(s[1], c))]).filter(([, r]) => r >= 3).sort((x, y) => x[1] - y[1]);
  const threeToOne = ok.length ? ok[0][0] : 11;
  console.log(`\n  focus ring and meaningful control borders (≥ 3:1 on steps 1 and 2): step ${threeToOne + 1} ${toHex(s[threeToOne])} (${wcag(s[1], s[threeToOne]).toFixed(2)}:1)${threeToOne > 7 ? ' — steps 6–8 are for decorative borders only' : ''}`);
  const onSolid = [white, black].sort((x, y) => Math.abs(apca(s[8], y)) - Math.abs(apca(s[8], x)))[0];
  console.log(`\n  text on step 9: ${toHex(onSolid)} (WCAG ${wcag(s[8], onSolid).toFixed(2)}:1, APCA ${apca(s[8], onSolid).toFixed(0)})${wcag(s[8], onSolid) < 4.5 ? ' — below 4.5:1: use step 9 for large text, icons and fills; darken to step 10/11 for small text' : ''}`);
  console.log();
}

const light = scale({});
const neutralChroma = Math.min(0.02, Math.max(0.006, BC * 0.08));
const neutral = scale({ chroma: neutralChroma, neutral: true });
table(`${name} — light`, light);
table(`neutral (tinted with hue ${BH.toFixed(0)}, chroma ${neutralChroma.toFixed(3)}) — light`, neutral);
let darkS, darkN;
if (a.dark) {
  darkS = scale({ dark: true });
  darkN = scale({ dark: true, chroma: neutralChroma, neutral: true });
  table(`${name} — dark`, darkS, true);
  table('neutral — dark', darkN, true);
}

if (a.css) {
  const vars = (prefix, s) => s.map((c, i) => `  --${prefix}-${i + 1}: ${oklch(c)}; /* ${toHex(c)} ${ROLES[i]} */`).join('\n');
  let css = `:root {\n${vars(name, light)}\n${vars('neutral', neutral)}\n}\n`;
  if (darkS) css += `@media (prefers-color-scheme: dark) {\n  :root {\n${vars(name, darkS).replace(/^/gm, '  ')}\n${vars('neutral', darkN).replace(/^/gm, '  ')}\n  }\n}\n`;
  await writeFile(String(a.css), css);
  console.log(`wrote ${a.css}`);
}
