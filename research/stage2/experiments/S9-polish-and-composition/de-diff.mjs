#!/usr/bin/env node
// Two captures of the same page: what pixelmatch reports (compare.mjs's measure) next to the CIEDE2000 areas it
// misses. The reference for porting into compare.mjs --diff (report guidance F); until then, run it by hand.
//   node de-diff.mjs before.png after.png
// Prints % of the common area: pm (pixelmatch 0.1), ΔE>1 and ΔE>2.3 at full resolution, and glance (ΔE>2.3 after a
// 4x box downscale). Warns when pixelmatch says 0 but ΔE>1 does not: a hairline, soft shadow or tint changed.
import { readPng, measure } from './lib/img.mjs';
const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error('usage: node de-diff.mjs before.png after.png'); process.exit(2); }
const m = measure(await readPng(a), await readPng(b));
console.log(`pm ${m.pm}%  ΔE>1 ${m.jnd1}%  ΔE>2.3 ${m.jnd}%  glance ${m.thumb}%${m.sizeDiffers ? '  (sizes differ: common area only)' : ''}`);
if (m.pm === 0 && m.jnd1 > 0) console.log('pixelmatch reports 0 %, but CIEDE2000 > 1 changed: a hairline, soft shadow or tint moved. "0 %" is not "unchanged".');
