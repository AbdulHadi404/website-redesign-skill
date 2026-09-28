// Summarise one or more Lighthouse JSON reports: score, metrics, LCP element + breakdown,
// CLS culprits, render-blocking resources and the top diagnostics.
//   node lh-summary.mjs reports/bad-mobile.report.json [more.json ...]
import { readFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const a = r.audits;
  const v = (id) => a[id]?.displayValue ?? '—';
  console.log(`\n=== ${file}  (Lighthouse ${r.lighthouseVersion}, ${r.configSettings.formFactor}, throttling: ${r.configSettings.throttlingMethod})`);
  console.log(`Performance score: ${Math.round((r.categories.performance?.score ?? 0) * 100)}`);
  console.log(`FCP ${v('first-contentful-paint')} | LCP ${v('largest-contentful-paint')} | TBT ${v('total-blocking-time')} | CLS ${v('cumulative-layout-shift')} | SI ${v('speed-index')}`);

  // LCP element (id changed across versions: largest-contentful-paint-element → lcp-breakdown-insight)
  const lcpEl = a['largest-contentful-paint-element'] ?? a['lcp-breakdown-insight'];
  const lcpItems = JSON.stringify(lcpEl?.details ?? {}).match(/"snippet":"(.*?)(?<!\\)"/);
  if (lcpItems) console.log('LCP element:', lcpItems[1].slice(0, 140));
  for (const id of ['lcp-breakdown-insight', 'lcp-discovery-insight', 'render-blocking-insight', 'cls-culprits-insight',
                    'font-display-insight', 'image-delivery-insight', 'third-parties-insight', 'dom-size-insight',
                    'bootup-time', 'mainthread-work-breakdown', 'unused-javascript', 'total-byte-weight',
                    'render-blocking-resources', 'uses-responsive-images', 'modern-image-formats', 'offscreen-images',
                    'prioritize-lcp-image', 'lcp-lazy-loaded', 'unsized-images', 'layout-shifts', 'font-display', 'viewport']) {
    const au = a[id];
    if (!au) continue;
    if (au.score !== null && au.score >= 0.9 && au.scoreDisplayMode !== 'informative') continue;
    console.log(`  - ${id}: ${au.title}${au.displayValue ? ' — ' + au.displayValue : ''}`);
  }
}
