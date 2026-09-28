// Browser support for the mobile, haptics and bidi features this stream discusses, straight from
// @mdn/browser-compat-data (and web-features for the Baseline status). No network, no browser.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bcd = require('@mdn/browser-compat-data');
let features = {};
try { features = (await import('web-features')).features; } catch { /* optional */ }

export const KEYS = {
  haptics: ['api.Navigator.vibrate', 'html.elements.input.switch'],
  viewportKeyboard: ['api.VisualViewport', 'api.VirtualKeyboard', 'api.VirtualKeyboard.overlaysContent', 'css.types.env.keyboard-inset-height',
    'html.elements.meta.name.viewport.interactive-widget', 'html.elements.meta.name.viewport.interactive-widget.resizes-content',
    'html.elements.meta.name.viewport.viewport-fit', 'css.types.env.safe-area-inset-bottom'],
  backAndSheets: ['api.CloseWatcher', 'html.elements.dialog.closedby', 'html.global_attributes.popover', 'css.properties.overscroll-behavior',
    'api.Navigation', 'api.Navigator.share'],
  inputs: ['html.global_attributes.inputmode', 'html.global_attributes.enterkeyhint', 'html.global_attributes.autocapitalize', 'css.properties.field-sizing',
    'html.elements.input.type_date'],
  pointer: ['css.at-rules.media.hover', 'css.at-rules.media.any-hover', 'css.selectors.active', 'css.properties.touch-action.manipulation'],
  lowBandwidth: ['api.NetworkInformation.saveData', 'css.at-rules.media.prefers-reduced-data'],
  bidiType: ['css.selectors.dir', 'css.properties.unicode-bidi.plaintext', 'css.properties.unicode-bidi.isolate', 'css.properties.text-justify',
    'css.properties.text-box-trim', 'css.at-rules.font-face.size-adjust', 'css.at-rules.font-face.ascent-override', 'css.properties.font-size-adjust'],
};
const BROWSERS = ['chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android', 'safari', 'safari_ios', 'samsunginternet_android'];

const get = (key) => key.split('.').reduce((o, k) => o?.[k], bcd)?.__compat;
function fmt(st) {
  const arr = Array.isArray(st) ? st : [st];
  const s = arr[0];
  if (!s || s.version_added === false || s.version_added == null) return 'no';
  let v = String(s.version_added);
  if (s.version_removed) v += `–${s.version_removed} (removed)`;
  if (s.partial_implementation) v += ' (partial)';
  if (s.flags) v += ' (flag)';
  if (s.prefix) v += ` (${s.prefix})`;
  return v;
}
export function compat() {
  const out = { bcd: bcd.__meta, groups: {} };
  for (const [group, keys] of Object.entries(KEYS)) {
    out.groups[group] = {};
    for (const key of keys) {
      const c = get(key);
      if (!c) { out.groups[group][key] = 'missing from BCD'; continue; }
      const row = {};
      for (const b of BROWSERS) row[b] = fmt(c.support[b]);
      row.status = c.status;
      const notes = [];
      for (const b of BROWSERS) for (const s of [].concat(c.support[b] || [])) for (const n of [].concat(s.notes || [])) notes.push(`${b}: ${n.replace(/<[^>]+>/g, '')}`);
      if (notes.length) row.notes = notes;
      const wf = Object.entries(features).find(([, f]) => (f.compat_features || []).includes(key));
      if (wf) row.baseline = { feature: wf[0], status: wf[1].status?.baseline ?? null, low: wf[1].status?.baseline_low_date ?? null, high: wf[1].status?.baseline_high_date ?? null };
      out.groups[group][key] = row;
    }
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(compat(), null, 1));
