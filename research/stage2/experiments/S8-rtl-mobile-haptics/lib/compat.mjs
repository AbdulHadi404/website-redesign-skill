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
  clipping: ['css.properties.overflow-x.clip', 'css.properties.overflow-clip-margin', 'css.properties.text-align.match-parent'],
  bidiType: ['css.selectors.dir', 'css.properties.unicode-bidi.plaintext', 'css.properties.unicode-bidi.isolate', 'css.properties.text-justify',
    'css.properties.text-box-trim', 'css.at-rules.font-face.size-adjust', 'css.at-rules.font-face.ascent-override', 'css.properties.font-size-adjust'],
};
const BROWSERS = ['chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android', 'safari', 'safari_ios', 'samsunginternet_android'];

const get = (key) => key.split('.').reduce((o, k) => o?.[k], bcd)?.__compat;
function fmt(st) {
  const arr = Array.isArray(st) ? st : [st];
  const s = arr[0];
  if (!s || s.version_added === false || s.version_added == null) return 'no';
  if (s.version_added === 'preview') return 'preview';
  let v = String(s.version_added);
  if (s.version_removed) v += `–${s.version_removed} (removed)`;
  if (s.partial_implementation) v += ' (partial)';
  if (s.flags) v += ' (flag)';
  if (s.prefix) v += ` (${s.prefix})`;
  return v;
}
export function compat() {
  const out = { bcd: bcd.__meta, webFeatures: '3.40.0', groups: {}, table: null };
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
  out.table = table();
  return out;
}
// The platform table of the S8 report, generated (not typed): one row per feature, desktop and mobile engines apart.
export const TABLE = [
  ['VisualViewport', 'api.VisualViewport'], ['VirtualKeyboard API', 'api.VirtualKeyboard'], ['env(keyboard-inset-*)', 'css.types.env.keyboard-inset-height'],
  ['interactive-widget', 'html.elements.meta.name.viewport.interactive-widget'], ['viewport-fit', 'html.elements.meta.name.viewport.viewport-fit'],
  ['env(safe-area-inset-*)', 'css.types.env.safe-area-inset-bottom'], ['CloseWatcher', 'api.CloseWatcher'], ['dialog closedby', 'html.elements.dialog.closedby'],
  ['Navigation API', 'api.Navigation'], ['navigator.share', 'api.Navigator.share'], ['navigator.vibrate', 'api.Navigator.vibrate'], ['input switch', 'html.elements.input.switch'],
  ['saveData', 'api.NetworkInformation.saveData'], ['prefers-reduced-data', 'css.at-rules.media.prefers-reduced-data'],
  ['overflow-x: clip', 'css.properties.overflow-x.clip'], ['overflow-clip-margin', 'css.properties.overflow-clip-margin'], ['text-align: match-parent', 'css.properties.text-align.match-parent'],
  ['text-justify', 'css.properties.text-justify'], ['@font-face ascent-override', 'css.at-rules.font-face.ascent-override'], ['@font-face size-adjust', 'css.at-rules.font-face.size-adjust'],
];
export function table() {
  const cols = ['chrome', 'chrome_android', 'firefox', 'firefox_android', 'safari', 'safari_ios'];
  const lines = ['| Feature | Chrome | Chrome Android | Firefox | Firefox Android | Safari | Safari iOS | Baseline |', '|---|---|---|---|---|---|---|---|'];
  for (const [label, key] of TABLE) {
    const c = get(key); if (!c) { lines.push(`| ${label} | missing from BCD |||||||`); continue; }
    const wf = Object.entries(features).find(([, f]) => (f.compat_features || []).includes(key));
    // the status of this exact key when web-features has one (a feature groups keys: text-align ≠ text-align: match-parent)
    const st = wf ? (wf[1].status?.by_compat_key?.[key] || wf[1].status) : null;
    const bl = st ? (st.baseline === 'high' ? `high (${st.baseline_high_date})` : st.baseline === 'low' ? `low (${st.baseline_low_date})` : 'no') : '—';
    lines.push(`| ${label} | ${cols.map((b) => fmt(c.support[b]).replace(/–(\d+) \(removed\)/, '–$1, removed')).join(' | ')} | ${bl} |`);
  }
  return lines.join('\n');
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(process.argv[2] === 'table' ? table() : JSON.stringify(compat(), null, 1));
