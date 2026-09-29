// Colour helpers shared by the S12 experiments (colorjs.io 0.7.1, the version the skill's scripts use).
import Color from 'colorjs.io';

export { Color };
export const C = (x) => (x instanceof Color ? x : new Color(x));
export const hex = (x) => C(x).to('srgb').toGamut({ space: 'srgb' }).toString({ format: 'hex', collapse: false }).toUpperCase();
// colorjs.io's contrast ignores alpha: '#0000FF80' measures as opaque blue (8.59:1 against white) although it
// paints #7F7FFF over white (3.29:1). So the helpers refuse translucent colours instead of mis-measuring
// them; composite with over() onto the actual ground first. (Added after review.)
export const alphaOf = (x) => { const a = Number(C(x).alpha); return Number.isFinite(a) ? a : 1; };
const opaque = (x) => { const c = C(x); if (alphaOf(c) < 1) throw new RangeError(`translucent colour ${c.toString()}: composite it over its ground with over() before measuring`); return c; };
export const wcag = (a, b) => opaque(a).contrast(opaque(b), 'WCAG21');
// colorjs.io: background.contrast(text, 'APCA') matches the reference APCAcontrast(text, bg)
// (see skills/website-redesign/scripts/contrast.mjs). Absolute value returned.
export const apca = (bg, fg) => Math.abs(opaque(bg).contrast(opaque(fg), 'APCA'));
// The first-round helper, kept only to reproduce the alpha defect in the pathological-input probe.
export const wcagIgnoringAlpha = (a, b) => C(a).contrast(C(b), 'WCAG21');
export const dE = (a, b) => C(a).deltaE(C(b), 'OK'); // ΔE OK (0–1 scale; ×100 for "points")
export const oklch = (x) => { const [l, c, h] = C(x).to('oklch').coords; return { l, c: c ?? 0, h: Number.isFinite(h) ? h : null }; };
// Build an sRGB colour from OKLCH, reducing chroma (never lightness) to fit the gamut.
export const fromOklch = (l, c, h) => new Color('oklch', [Math.min(1, Math.max(0, l)), Math.max(0, c), h ?? 0]).toGamut({ space: 'srgb', method: 'oklch.c' });
// Alpha-composite `fg` at `alpha` over opaque `bg` (sRGB, the way the browser paints it).
export const over = (fg, alpha, bg) => {
  const f = C(fg).to('srgb').coords, b = C(bg).to('srgb').coords;
  return new Color('srgb', f.map((v, i) => v * alpha + b[i] * (1 - alpha)));
};
// sRGB mix, the way `color-mix(in srgb, a p%, b)` does it.
export const mixSrgb = (a, b, p) => over(a, p, b);
