#!/usr/bin/env node
/**
 * The polish probe on pages it was not built on: other fixtures in this repository (read, never edited), each served
 * read-only from its own folder. Runs the frozen first version (lib/probe-v1.mjs) and the current one (lib/probe.mjs)
 * at 1440 and 390. The first eleven pages are the ones v2 was revised against after review ('tuned-on'); the last seven
 * were added afterwards and run once without changing the probe ('held-out') and records every flag, so the report can show what the review fixes changed. Each page's HTML is
 * hashed: if another stream edits a page later, the hash in results.json shows the result is for an older copy.
 *
 *   node outside.mjs            # writes results.json "outside" (run.mjs --stage outside does the same)
 *   node outside.mjs --out x.json   # writes only x.json
 *
 * The hand verdicts on each defect flag (true or false positive, with the reason) are in outside-review.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveDir } from './lib/serve.mjs';
import * as v2 from './lib/probe.mjs';
import * as v1 from './lib/probe-v1.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '../../../..');
// [id, site root (relative to the repo), path under it, note]
export const OUTSIDE = [
  ['slop', 'tools/regress/fixtures', '/slop.html', 'regress fixture: AI-slop landing (gradient accents, outline: none)'],
  ['dashboard', 'tools/regress/fixtures', '/dashboard.html', 'regress fixture: SaaS dashboard (outline: none)'],
  ['finish', 'tools/regress/fixtures', '/finish.html', 'regress fixture: finish defects for audit.mjs'],
  ['govuk', 'tools/regress/fixtures', '/govuk.html', 'regress fixture: GOV.UK page with govuk-frontend CSS'],
  ['house-style', 'research/experiments/G-product-lab/pages', '/house-style.html', 'G lab: editorial marketing page with eyebrows'],
  ['govuk-question', 'research/experiments/G-product-lab/pages', '/govuk-question.html', 'G lab: question page; its css/govuk.css is absent, so it renders unstyled'],
  ['a11y-fixed', 'research/experiments/a11y-lab/pages', '/fixed.html', 'a11y lab: fixed app page (visually hidden text)'],
  ['s7-vr', 'research/stage2/experiments/S7-visual-iteration-tools/fixtures/vr', '/index.html', 'S7: landing with card icons'],
  ['s8-mobile', 'research/stage2/experiments/S8-rtl-mobile-haptics', '/fixtures/mobile.html', 'S8: mobile app page, ink primary'],
  ['s8-bidi', 'research/stage2/experiments/S8-rtl-mobile-haptics', '/fixtures/bidi.html', 'S8: bidi table page'],
  ['h-fixture', 'research/experiments/H-blind-eval/fixture', '/index.html', 'H: blind-eval marketing fixture'],
  // The reviewer's S8 mobile case: served from fixtures/, so its absolute /fixtures/mobile.css 404s and the page is unstyled.
  ['s8-mobile-nocss', 'research/stage2/experiments/S8-rtl-mobile-haptics/fixtures', '/mobile.html', 'S8 mobile page with its stylesheet missing (reproduces the review run)'],
  // Held out: added after v2 was revised against the eleven pages above, run once, not tuned on (see the report).
  ['hallam', 'research/experiments/H-blind-eval/hallam/fixture', '/index.html', 'H: Hallam fixture (professional services)', 'held-out'],
  ['permit', 'research/experiments/H-blind-eval/permit/fixture', '/index.html', 'H: permit service fixture (public sector)', 'held-out'],
  ['sanad', 'research/experiments/H-blind-eval/sanad/fixture', '/index.html', 'H: Sanad invoicing dashboard fixture (RTL)', 'held-out'],
  ['stemwren', 'research/experiments/H-blind-eval/stemwren/fixture', '/index.html', 'H: Stemwren shop fixture', 'held-out'],
  ['s8-bilingual', 'research/stage2/experiments/S8-rtl-mobile-haptics', '/fixtures/bilingual.html', 'S8: bilingual Arabic/English page', 'held-out'],
  ['s10-static', 'research/stage2/experiments/S10-shaders-generative/dist/a-static', '/index.html', 'S10: static landing', 'held-out'],
  ['e-good', 'research/experiments/E-responsive-performance/site', '/good.html', 'E: responsive page (its fonts and images are not in the folder)', 'held-out'],
];
const WIDTHS = [1440, 390];

export async function probeOutside(browser) {
  const out = {};
  for (const [id, root, p, note, set = 'tuned-on'] of OUTSIDE) {
    const abs = path.join(REPO, root);
    const html = await readFile(path.join(abs, p)).catch(() => null);
    if (!html) { out[id] = { note, set, missing: true }; continue; }
    const srv = await serveDir(abs);
    const failed = [];
    const row = { note, set, page: `${root}${p}`, sha256: createHash('sha256').update(html).digest('hex').slice(0, 16), v1: {}, v2: {}, failedRequests: failed };
    try {
      for (const w of WIDTHS) {
        const mobile = w < 768;
        for (const [ver, mod] of [['v1', v1], ['v2', v2]]) {
          const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
          const page = await ctx.newPage();
          page.on('response', (r) => { if (r.status() >= 400 && ver === 'v2' && w === 1440) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
          await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // offline: no third-party requests
          await page.goto(srv.base + p, { waitUntil: 'load', timeout: 20000 }).catch(() => null);
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(150);
          const r = await page.evaluate(mod.probePage, {});
          if (!mobile) { if (mod.focusChecks) Object.assign(r, await mod.focusChecks(page)); else r.focusRing = await mod.focusRing(page); }
          row[ver][w] = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, { kind: x.kind, flag: x.flag, value: x.value, detail: ver === 'v2' ? x.detail : undefined }]));
          await ctx.close();
        }
      }
    } finally { await srv.close(); }
    out[id] = row;
  }
  return out;
}

// Standalone: probe, merge into results.json
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { launch } = await import(pathToFileURL(path.resolve(ROOT, '../../../../skills/website-redesign/scripts/lib/env.mjs')).href);
  const { browser } = await launch();
  let o; try { o = await probeOutside(browser); } finally { await browser.close(); }
  const oi = process.argv.indexOf('--out');
  if (oi > 0) await writeFile(process.argv[oi + 1], JSON.stringify(o, null, 1)); // a separate file (results.json untouched)
  else {
    const f = path.join(ROOT, 'results.json');
    const R = JSON.parse(await readFile(f, 'utf8').catch(() => '{}'));
    R.outside = o;
    await writeFile(f, JSON.stringify(R, null, 1));
  }
  for (const [id, x] of Object.entries(o)) {
    if (x.missing) { console.log(`${id}: missing`); continue; }
    const fl = (ver, w, kind) => Object.entries(x[ver][w]).filter(([, y]) => y.flag && (!kind || y.kind === kind)).map(([k]) => k);
    console.log(`${id.padEnd(15)} v1@1440 [${fl('v1', 1440).join(' ')}]\n${''.padEnd(15)} v2@1440 defects [${fl('v2', 1440, 'defect').join(' ')}] questions [${fl('v2', 1440, 'question').join(' ')}]\n${''.padEnd(15)} v2@390  defects [${fl('v2', 390, 'defect').join(' ')}]${x.failedRequests.length ? `\n${''.padEnd(15)} failed: ${x.failedRequests.slice(0, 4).join(', ')}` : ''}`);
  }
}
