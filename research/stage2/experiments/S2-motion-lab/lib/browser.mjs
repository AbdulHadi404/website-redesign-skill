// Launch Chromium through the skill's own helper (read-only import), so the lab uses the same browser the skill does.
export { launch } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
export const median = (xs) => { const s = [...xs].filter((x) => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const round = (x, d = 1) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 10 ** d) / 10 ** d);
