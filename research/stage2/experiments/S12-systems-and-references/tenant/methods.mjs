// Tenant-layer derivation methods compared in the S12 white-label experiment.
// Every method returns the same role set for one tenant colour and one mode, on the
// SAME locked neutral layer, so only the accent derivation differs between methods.
import { createRequire } from 'node:module';
import { C, Color, hex, wcag, apca, dE, oklch, fromOklch, over, mixSrgb } from '../lib/color.mjs';

const require = createRequire(import.meta.url);

// ------------------------------------------------------------------ locked layer
// Neutrals and status colours a tenant can never change.
export const NEUTRALS = {
  light: { bg: '#FFFFFF', surface: '#F6F6F7', text: '#1C1D21', muted: '#5B5D66', danger: '#C9372C', warning: '#A15C00', success: '#1F7A4D' },
  dark: { bg: '#111113', surface: '#1C1D21', text: '#EDEEF0', muted: '#A3A5AE', danger: '#F87168', warning: '#F5A524', success: '#4CC38A' },
};

// Roles every method fills:
//   accent        solid fill of the primary button (the tenant's colour, where possible)
//   accentHover   hovered primary button
//   onAccent      label on accent / accentHover
//   accentText    links and accent-coloured text on bg and surface
//   accentSubtle  tinted ground: selected row, soft badge
//   onSubtle      text on accentSubtle
//   indicator     checked checkbox / switch-on / selected-tab bar / progress (non-text, 1.4.11)
//   focusRing     2 px focus outline on bg and surface (non-text, 1.4.11 / 2.4.13)
//   buttonBorder  optional 1 px boundary on the primary button (null = none)

// ------------------------------------------------------------------ M0 naive
// The tenant hex dropped into a theme built for one brand: white label, brand for everything.
export function naive(t, mode) {
  const n = NEUTRALS[mode];
  return {
    accent: hex(t), accentHover: hex(mixSrgb('#000', t, 0.1)), onAccent: '#FFFFFF',
    accentText: hex(t), accentSubtle: hex(over(t, mode === 'light' ? 0.12 : 0.18, n.bg)), onSubtle: hex(t),
    indicator: hex(t), focusRing: hex(t), buttonBorder: null,
  };
}

// ------------------------------------------------------------------ M1 auto on-colour only
// M1a: the luma threshold in Cal.com's packages/lib/getBrandColours.tsx `getWCAGContrastColor`
// (gamma-encoded 0.2126R+0.7152G+0.0722B over 255, < 0.5 → white else black). Reimplemented, not copied.
export function autoOnLuma(t, mode) {
  const r = naive(t, mode);
  const [R, G, B] = C(t).to('srgb').coords.map((v) => v * 255);
  const luma = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
  r.onAccent = luma < 0.5 ? '#FFFFFF' : '#000000';
  return r;
}
// M1b: best of white/black by the WCAG 2 ratio (the textbook fix).
export function autoOnWcag(t, mode) {
  const r = naive(t, mode);
  r.onAccent = wcag(t, '#FFFFFF') >= wcag(t, '#000000') ? '#FFFFFF' : '#000000';
  return r;
}

// ------------------------------------------------------------------ M2 Radix custom palette
// radix-ui/website components/generate-radix-colors.tsx (fetched by fetch-vendor.mjs), run as published.
let radixGen;
export async function loadRadix() {
  radixGen = (await import('../vendor/generate-radix-colors.ts')).generateRadixColors;
}
export function radix(t, mode) {
  const n = NEUTRALS[mode];
  const r = radixGen({ appearance: mode, accent: t, gray: '#8B8D98', background: n.bg });
  const s = r.accentScale.map((x) => hex(x));
  // Radix Themes: solid = 9, hover = 10, label = accentContrast, text = 11, soft bg = 3,
  // checkbox/switch fill = 9, focus ring = --focus-8 = accent-8 (themes/src/styles/tokens/color.css).
  return { accent: s[8], accentHover: s[9], onAccent: hex(r.accentContrast), accentText: s[10], accentSubtle: s[2], onSubtle: s[10], indicator: s[8], focusRing: s[7], buttonBorder: null };
}

// ------------------------------------------------------------------ M3 Atlassian custom theme
// @atlaskit/tokens getCustomThemeStyles({ UNSAFE_themeOptions: { brandColor } }) — Jira/Confluence custom themes.
const { getCustomThemeStyles } = require('@atlaskit/tokens/dist/cjs/get-custom-theme-styles.js');
const ATL = { light: { inverse: '#FFFFFF', focus: '#4688EC' }, dark: { inverse: '#1F1F21', focus: '#8FB8F6' } }; // tokens themes/atlassian-{light,dark}.js
export function atlassian(t, mode) {
  const out = getCustomThemeStyles({ colorMode: mode, UNSAFE_themeOptions: { brandColor: t } });
  const css = out.find((x) => x.id === mode)?.css ?? '';
  const v = (k) => { const m = new RegExp(`--ds-${k}:\\s*([^;]+);`).exec(css); if (!m) throw new Error(`atlassian ${t} ${mode}: no ${k}`); return hex(m[1].trim()); };
  return {
    accent: v('background-brand-bold'), accentHover: v('background-brand-bold-hovered'), onAccent: ATL[mode].inverse,
    accentText: v('link'), accentSubtle: v('background-selected'), onSubtle: v('text-selected'),
    indicator: v('background-selected-bold'), focusRing: ATL[mode].focus, buttonBorder: null,
  };
}

// ------------------------------------------------------------------ M4/M5 Material 3 dynamic colour
// @material/material-color-utilities 0.4.0 (needs lib/register-ext.mjs: its ESM has extensionless imports).
let MCU;
export async function loadMcu() { MCU = await import('@material/material-color-utilities'); }
function material(Scheme) {
  return (t, mode) => {
    const s = new MCU[Scheme](MCU.Hct.fromInt(MCU.argbFromHex(hex(t))), mode === 'dark', 0);
    const g = (k) => MCU.hexFromArgb(s[k]).toUpperCase();
    const primary = g('primary'), onPrimary = g('onPrimary');
    return {
      accent: primary, accentHover: hex(over(onPrimary, 0.08, primary)), // M3 hover state layer 8 %
      onAccent: onPrimary, accentText: primary, accentSubtle: g('primaryContainer'), onSubtle: g('onPrimaryContainer'),
      indicator: primary, focusRing: g('secondary'), buttonBorder: null, // M3 focus indicator uses the secondary role
    };
  };
}
export const materialTonalSpot = material('SchemeTonalSpot');
export const materialFidelity = material('SchemeFidelity');

// ------------------------------------------------------------------ M6 S12 safety rules
// Keep the tenant's exact colour on large fills where a legible label exists; derive a
// separate strong accent for text, indicators and focus; gate every text pair on WCAG 4.5:1
// AND APCA Lc 60, every non-text pair on 3:1; move only OKLCH lightness (chroma clamped to
// the sRGB gamut, hue kept), and only as far as the gates need.
export const S12_GATES = { text: 4.5, lc: 60, nonText: 3, nearGroundRatio: 1.5, nearGroundChroma: 0.1 };
// A tenant hue "collides" with a status colour when both are chromatic and their hues are within 30°.
export function statusCollisions(colours, mode) {
  const n = NEUTRALS[mode], out = [];
  for (const k of ['danger', 'warning', 'success']) {
    const s = oklch(n[k]);
    for (const c of colours) {
      const a = oklch(c);
      if (a.c < 0.06 || a.h === null) continue;
      const dh = Math.abs(((a.h - s.h + 540) % 360) - 180);
      if (dh <= 30) { out.push(k); break; }
    }
  }
  return out;
}
const WHITE = '#FFFFFF';
export function s12(t, mode, gates = S12_GATES) {
  const n = NEUTRALS[mode];
  const T = oklch(t);
  const achromatic = T.c < 0.02;
  const H = achromatic ? 265 : T.h; // a cool neutral hue for greys, black and white
  const Cc = achromatic ? Math.min(T.c, 0.012) : T.c;
  const ink = hex(fromOklch(0.2, Math.min(0.03, Cc * 0.3), H));
  const bestOn = (fill) => {
    const c = [WHITE, ink].map((on) => ({ on, w: wcag(fill, on), lc: apca(fill, on) }));
    return c.sort((a, b) => b.lc - a.lc)[0];
  };
  const solidOk = (fill) => { const b = bestOn(fill); return b.w >= gates.text && b.lc >= gates.lc; };
  const flags = [];
  // 1. accent: the tenant colour itself unless it vanishes into the ground or no label is legible on it.
  let accent = hex(t);
  // "vanishes": low luminance contrast with the ground AND too little chroma to stand out by hue.
  const nearGround = wcag(t, n.bg) < gates.nearGroundRatio && T.c < gates.nearGroundChroma;
  const lighterGoesAway = oklch(n.bg).l < 0.5; // dark mode: move away from the ground by lightening
  if (nearGround || !solidOk(accent)) {
    flags.push(nearGround ? 'tenant colour ≈ page ground: fill moved' : 'no legible label on tenant colour: fill lightness moved');
    let found = null;
    for (let d = 0.005; d <= 1 && !found; d += 0.005) {
      const dirs = nearGround ? [lighterGoesAway ? +1 : -1] : [-1, +1];
      for (const s of dirs) {
        const L = T.l + s * d;
        if (L < 0 || L > 1) continue;
        const c = hex(fromOklch(L, Cc, H));
        if (solidOk(c) && (!nearGround || wcag(c, n.bg) >= gates.nonText)) { found = c; break; }
      }
    }
    accent = found ?? accent;
  }
  const on = bestOn(accent).on;
  // 2. hover: 0.05 OKLCH L away from the label, as long as the label still passes.
  const A = oklch(accent);
  const hoverDir = on === WHITE ? -1 : +1;
  let accentHover = accent;
  for (const d of [0.05, 0.04, 0.03, 0.02]) {
    const c = hex(fromOklch(A.l + hoverDir * d, A.c, A.h ?? H));
    if (wcag(c, on) >= gates.text && apca(c, on) >= gates.lc) { accentHover = c; break; }
  }
  // 3. subtle ground, then 4. strong accent solved against bg, surface and the subtle ground.
  const accentSubtle = hex(mode === 'light' ? fromOklch(0.965, Math.min(Cc, 0.12) * 0.3, H) : fromOklch(0.29, Math.min(Cc, 0.12) * 0.5, H));
  const grounds = [n.bg, n.surface, accentSubtle];
  const textOk = (c) => grounds.every((g) => wcag(c, g) >= gates.text && apca(g, c) >= gates.lc);
  let strong = hex(t);
  if (!textOk(strong)) {
    const dir = mode === 'light' ? -1 : +1;
    for (let d = 0.005; d <= 1; d += 0.005) {
      const L = T.l + dir * d;
      if (L < 0 || L > 1) break;
      const c = hex(fromOklch(L, Cc, H));
      if (textOk(c)) { strong = c; break; }
    }
  }
  // 5. the primary button keeps a 1 px boundary in the strong accent when its fill is < 3:1 on the ground.
  const buttonBorder = wcag(accent, n.bg) < gates.nonText ? strong : null;
  if (achromatic) flags.push('achromatic brand: selection needs a non-colour cue (weight, check, bar)');
  for (const k of statusCollisions([accent, strong], mode)) flags.push(`accent hue ≈ ${k}: ${k} states must carry icon + word, never colour alone`);
  return { accent, accentHover, onAccent: on, accentText: strong, accentSubtle, onSubtle: strong, indicator: strong, focusRing: strong, buttonBorder, flags };
}

// For the tenant-admin preview: the nearest safe fill for each label colour (white or ink),
// so the tenant chooses between two legible versions of their colour instead of getting one silently.
export function labelOptions(t, mode, gates = S12_GATES) {
  const n = NEUTRALS[mode];
  const T = oklch(t);
  const H = T.c < 0.02 ? 265 : T.h, Cc = T.c < 0.02 ? Math.min(T.c, 0.012) : T.c;
  const ink = hex(fromOklch(0.2, Math.min(0.03, Cc * 0.3), H));
  const out = {};
  for (const [name, on] of [['whiteLabel', WHITE], ['darkLabel', ink]]) {
    let best = null;
    for (let d = 0; d <= 1 && !best; d += 0.005) for (const s of d ? [-1, +1] : [0]) {
      const L = T.l + s * d; if (L < 0 || L > 1) continue;
      const c = d ? hex(fromOklch(L, Cc, H)) : hex(t);
      if (wcag(c, on) >= gates.text && apca(c, on) >= gates.lc && !(wcag(c, n.bg) < gates.nearGroundRatio && oklch(c).c < gates.nearGroundChroma)) { best = c; break; }
    }
    out[name] = best ? { fill: best, label: on, dE: Math.round(dE(t, best) * 1000) / 10 } : null;
  }
  return out;
}

export const METHODS = [
  { id: 'M0-naive', label: 'Naive: tenant hex everywhere, white label', fn: naive },
  { id: 'M1a-luma-on', label: 'Auto on-colour by luma threshold (Cal.com getWCAGContrastColor rule)', fn: autoOnLuma },
  { id: 'M1b-wcag-on', label: 'Auto on-colour: best of black/white by WCAG ratio', fn: autoOnWcag },
  { id: 'M2-radix', label: 'Radix custom palette generator (radix-ui/website)', fn: radix },
  { id: 'M3-atlassian', label: 'Atlassian custom theme (@atlaskit/tokens 20.1.0)', fn: atlassian },
  { id: 'M4-m3-tonalspot', label: 'Material 3 SchemeTonalSpot (material-color-utilities 0.4.0)', fn: materialTonalSpot },
  { id: 'M5-m3-fidelity', label: 'Material 3 SchemeFidelity (material-color-utilities 0.4.0)', fn: materialFidelity },
  { id: 'M6-s12', label: 'S12 rules: exact tenant fill where safe, OKLCH-L solved strong accent, WCAG 4.5 + APCA Lc 60 gates', fn: s12 },
  { id: 'M6w-s12-wcag-only', label: 'S12 rules with the WCAG gate only (no APCA)', fn: (t, m) => s12(t, m, { ...S12_GATES, lc: 0 }) },
  { id: 'M6s-s12-lc75', label: 'S12 rules with APCA Lc 75 on every text pair (body-text strict)', fn: (t, m) => s12(t, m, { ...S12_GATES, lc: 75 }) },
];

// Every text/ground and non-text pair measured, with its gate.
export const PAIRS = [
  { id: 'T1', kind: 'text', what: 'button label on accent', fg: 'onAccent', bg: 'accent' },
  { id: 'T2', kind: 'text', what: 'button label on hovered accent', fg: 'onAccent', bg: 'accentHover' },
  { id: 'T3', kind: 'text', what: 'link / accent text on page', fg: 'accentText', bg: 'n.bg' },
  { id: 'T4', kind: 'text', what: 'link / accent text on surface', fg: 'accentText', bg: 'n.surface' },
  { id: 'T5', kind: 'text', what: 'text on selected row / soft badge', fg: 'onSubtle', bg: 'accentSubtle' },
  { id: 'N1', kind: 'nontext', what: 'checked checkbox / switch / tab bar on page', fg: 'indicator', bg: 'n.bg' },
  { id: 'N2', kind: 'nontext', what: 'focus ring on page', fg: 'focusRing', bg: 'n.bg' },
  { id: 'N3', kind: 'nontext', what: 'focus ring on surface', fg: 'focusRing', bg: 'n.surface' },
  { id: 'N4', kind: 'advisory', what: 'primary button boundary on page (fill or 1 px border)', fg: 'buttonEdge', bg: 'n.bg' },
];
