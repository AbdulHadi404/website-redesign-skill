#!/usr/bin/env node
/**
 * The polish probe as a command: the finish details a script can check on any rendered page.
 * (A candidate for the skill's scripts; lives here until a later stage adopts it.)
 *
 *   node polish-probe.mjs --base http://localhost:3000 --paths / /pricing [--widths 1440,390] [--json out.json]
 *
 * Per page and width: icon family (rendered stroke, outline vs filled, size against the text), icon optical
 * alignment against the cap-height centre, glyphs centred geometrically in round containers, shadow direction /
 * glows / layering / tint, concentric radii (nearest painted rounded ancestor, gap up to 1.5 x the outer radius),
 * opaque grey borders and ghost cards, proportional figures in number slots, short last lines and unbalanced
 * headings, display tracking and leading, hanging bullets and quotes, accent count in the first viewport, pure-grey
 * neutrals, light-edged images without an edge, near-miss left edges (1-24 px) and centred headings over
 * left-aligned content, heading proximity, scale contrast, font-smoothing (macOS-only), corner-shape, and the
 * keyboard focus ring (browser default or designed). Facts, not taste: every flag is a question for the polish pass.
 */
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probePage, focusRing } from './lib/probe.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { launch, parseArgs, asList, urlFor } = await import(pathToFileURL(path.resolve(here, '../../../../skills/website-redesign/scripts/lib/env.mjs')).href);
const a = parseArgs();
const base = a.base || 'http://localhost:3000';
const paths = asList(a.paths, ['/']);
const widths = asList(a.widths, ['1440', '390']).map(Number);
const { browser } = await launch();
const out = {};
try {
  for (const p of paths) for (const w of widths) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    await page.goto(urlFor(base, p), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(probePage);
    if (!mobile) r.focusRing = await focusRing(page);
    (out[p] ||= {})[w] = r;
    console.log(`\n## ${p} at ${w}px`);
    for (const [k, x] of Object.entries(r)) console.log(`${x.flag ? '- ✗' : '- ✓'} ${k}: ${typeof x.value === 'string' ? x.value : JSON.stringify(x.value)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (a.json) await writeFile(String(a.json), JSON.stringify(out, null, 1));
