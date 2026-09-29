// Browser support for every signal and API the S11 guidance relies on, read from @mdn/browser-compat-data
// (the primary source MDN and caniuse draw on). Writes results/support.json.
import { createRequire } from 'node:module';
import { saveResult } from './common.mjs';

const require = createRequire(import.meta.url);
const bcd = require('@mdn/browser-compat-data');
const pkg = { version: bcd.__meta?.version || 'unknown' };
const FEATURES = {
  'navigator.hardwareConcurrency': 'api.Navigator.hardwareConcurrency',
  'navigator.deviceMemory': 'api.Navigator.deviceMemory',
  'navigator.connection': 'api.Navigator.connection',
  'NetworkInformation.saveData': 'api.NetworkInformation.saveData',
  'NetworkInformation.effectiveType': 'api.NetworkInformation.effectiveType',
  'Save-Data header': 'http.headers.Save-Data',
  'Device-Memory header': 'http.headers.Device-Memory',
  'navigator.getBattery': 'api.Navigator.getBattery',
  'prefers-reduced-motion': 'css.at-rules.media.prefers-reduced-motion',
  'prefers-reduced-transparency': 'css.at-rules.media.prefers-reduced-transparency',
  'prefers-reduced-data': 'css.at-rules.media.prefers-reduced-data',
  'WEBGL_debug_renderer_info': 'api.WEBGL_debug_renderer_info',
  'webglcontextlost event': 'api.HTMLCanvasElement.webglcontextlost_event',
  'PressureObserver (Compute Pressure)': 'api.PressureObserver',
  'requestIdleCallback': 'api.Window.requestIdleCallback',
  'scheduler.yield': 'api.Scheduler.yield',
  'scheduler.postTask': 'api.Scheduler.postTask',
  'isInputPending': 'api.Scheduling.isInputPending',
  'Long Animation Frames': 'api.PerformanceLongAnimationFrameTiming',
  'Event Timing interactionId (INP)': 'api.PerformanceEventTiming.interactionId',
  'OffscreenCanvas': 'api.OffscreenCanvas',
  'OffscreenCanvas webgl2': 'api.OffscreenCanvas.getContext.webgl2_context',
  'transferControlToOffscreen': 'api.HTMLCanvasElement.transferControlToOffscreen',
  'module workers': 'api.Worker.Worker.options_type_parameter',
  'SharedArrayBuffer': 'javascript.builtins.SharedArrayBuffer',
  'createImageBitmap': 'api.createImageBitmap',
  'TextDecoderStream': 'api.TextDecoderStream',
  'CompressionStream': 'api.CompressionStream',
  'fetchpriority (img)': 'html.elements.img.fetchpriority',
  'link fetchPriority': 'api.HTMLLinkElement.fetchPriority',
  'modulepreload': 'html.elements.link.rel.modulepreload',
  'speculation rules': 'html.elements.script.type.speculationrules',
  'content-visibility': 'css.properties.content-visibility',
  'img decoding': 'html.elements.img.decoding',
  'HTMLImageElement.decode()': 'api.HTMLImageElement.decode',
};
const BROWSERS = ['chrome', 'chrome_android', 'firefox', 'safari', 'safari_ios'];
const get = (p) => p.split('.').reduce((o, k) => o?.[k], bcd);
function describe(s) {
  if (!s) return '?';
  const list = Array.isArray(s) ? s : [s];
  const main = list.find((x) => !x.flags && !x.prefix && !x.alternative_name) || list[0];
  if (!main || main.version_added === false || main.flags) return 'no';
  let v = String(main.version_added);
  if (main.version_removed) v += `–${main.version_removed} (removed)`;
  if (main.partial_implementation) v += ' (partial)';
  return v;
}
const out = { source: `@mdn/browser-compat-data ${pkg.version}`, features: {} };
for (const [label, p] of Object.entries(FEATURES)) {
  const f = get(p);
  if (!f?.__compat) { out.features[label] = { path: p, missing: true }; continue; }
  const row = { path: p };
  for (const b of BROWSERS) row[b] = describe(f.__compat.support[b]);
  const st = f.__compat.status || {};
  row.status = [st.experimental && 'experimental', st.deprecated && 'deprecated', st.standard_track === false && 'non-standard'].filter(Boolean).join(', ') || 'standard';
  out.features[label] = row;
}
await saveResult('support', out);
if (import.meta.url === `file://${process.argv[1]}`) console.table(Object.fromEntries(Object.entries(out.features).map(([k, v]) => [k, { ...v, path: undefined }])));
export default out;
