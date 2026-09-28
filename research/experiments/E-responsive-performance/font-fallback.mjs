// Compute a metric-matched fallback @font-face (size-adjust + ascent/descent/line-gap overrides)
// for a web font — the technique behind fontaine, next/font and @capsizecss/core's createFontStack.
//   node font-fallback.mjs <webfont.woff2|ttf> <familyName> <fallback>
//   <fallback> = a capsize metrics name (timesNewRoman, arial, georgia, helvetica, ...) OR a path to a local font file
//   (use the file of the *same weight* you will fall back to — bold fallbacks need bold metrics).
import { fromFile } from '@capsizecss/unpack/fs'; // v4: the Node fs helper lives at /fs
import { createFontStack } from '@capsizecss/core';

const [file, family = 'Web Font', fb = 'timesNewRoman'] = process.argv.slice(2);
const metrics = await fromFile(file);
const fallback = /\.(ttf|otf|woff2?)$/i.test(fb) ? await fromFile(fb) : (await import(`@capsizecss/metrics/${fb}`)).default;
const { fontFamily, fontFaces } = createFontStack([{ ...metrics, familyName: family }, fallback]);
console.log('/* web font */', JSON.stringify({ capHeight: metrics.capHeight, ascent: metrics.ascent, descent: metrics.descent, unitsPerEm: metrics.unitsPerEm, xWidthAvg: metrics.xWidthAvg }));
console.log('/* fallback */', fallback.familyName, fallback.fullName ?? '', fallback.postscriptName ?? '');
console.log(`font-family: ${fontFamily};`);
console.log(fontFaces);
