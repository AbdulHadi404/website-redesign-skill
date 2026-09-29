#!/usr/bin/env node
/**
 * The polish probe as a command: finish details a script can check on any rendered page.
 * (A candidate for the skill's scripts; lives here until a later stage adopts it.)
 *
 *   node polish-probe.mjs --base http://localhost:3000 --paths / /pricing [--widths 1440,390] [--primary '.cta'] [--json out.json]
 *
 * Output per page and width, in three groups (lib/probe.mjs):
 *   Defects          errors nobody intends: non-concentric nesting at gap <= R, a focused control with no visible
 *                    change or the default ring on a corner-shape, a play glyph centred by its box, proportional
 *                    figures in number columns, lone last words, inline icons off the text beside them, a heading
 *                    nearer the previous group than its own (eyebrows count as part of the heading), edges 1-4 px apart.
 *   Style questions  choices a mature system may make on purpose: pure greys, opaque borders, unlayered or untinted
 *                    shadows, loose display leading, centred headings over left-aligned content, text edges 5-24 px
 *                    apart, more than three accent-coloured elements, un-hung bullets, unframed light images, a mixed
 *                    icon set, the browser's default focus ring. Confirm or change; do not "fix" them by rote.
 *   Information      scale ratio, font smoothing (macOS only), corner-shape use.
 * The primary action is --primary (a selector) or the most saturated filled control in the first viewport.
 * Checked on the S9 fixture and on eleven pages it was not built on (outside.mjs); see the S9 report for its limits.
 */
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probePage, focusChecks, grouped } from './lib/probe.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { launch, parseArgs, asList, urlFor } = await import(pathToFileURL(path.resolve(here, '../../../../skills/website-redesign/scripts/lib/env.mjs')).href);
const a = parseArgs();
const base = a.base || 'http://localhost:3000';
const paths = asList(a.paths, ['/']);
const widths = asList(a.widths, ['1440', '390']).map(Number);
const primary = a.primary ? String(a.primary) : null;
const { browser } = await launch();
const out = {};
try {
  for (const p of paths) for (const w of widths) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    await page.goto(urlFor(base, p), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(probePage, { primary });
    if (!mobile) Object.assign(r, await focusChecks(page));
    (out[p] ||= {})[w] = r;
    const g = grouped(r);
    console.log(`\n## ${p} at ${w}px`);
    for (const [label, rows] of [['Defects', g.defect], ['Style questions', g.question], ['Information', g.info]]) {
      console.log(`${label}:`);
      for (const [k, x] of rows) console.log(`${label === 'Information' ? '  -' : x.flag ? '  ✗' : '  ✓'} ${k}: ${typeof x.value === 'string' ? x.value : JSON.stringify(x.value)}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (a.json) await writeFile(String(a.json), JSON.stringify(out, null, 1));
