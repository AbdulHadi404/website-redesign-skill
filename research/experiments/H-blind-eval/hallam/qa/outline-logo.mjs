// One-off: outline the 2014 logo's live SVG text so it renders the same on every device.
// Georgia is not open-licensed and is missing on Android and Linux, so the text is set in Gelasio
// (SIL OFL, metric-compatible with Georgia). Construction kept: square, serif H&P, name in caps over a
// tracked sub-line, same colours, sizes and tracking. Two repairs, measured in Georgia metrics:
//   - "H&P" at 26 px is 55.5 px wide in a 52 px square -> set at 22 px (47 px), centred.
//   - the sub-line at 11 px with 2 px tracking ends at x = 259 in a 220 px viewBox -> viewBox widened to 262.
// Usage: node qa/outline-logo.mjs <path to fontkit's package dir> <gelasio.woff2>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const [fkDir, fontPath] = process.argv.slice(2);
const fontkit = createRequire(fkDir + '/package.json')('fontkit');
const font = fontkit.openSync(fontPath);
const upm = font.unitsPerEm;
function outline(text, size, x, y, { anchor = 'start', tracking = 0 } = {}) {
  const run = font.layout(text);
  const scale = size / upm;
  let width = run.positions.reduce((a, p) => a + p.xAdvance, 0) * scale + tracking * (text.length - 1);
  let pen = anchor === 'middle' ? x - width / 2 : x;
  const parts = [];
  run.glyphs.forEach((g, i) => {
    const p = g.path.scale(scale, -scale).translate(pen, y);
    const d = p.toSVG();
    if (d) parts.push(d);
    pen += run.positions[i].xAdvance * scale + tracking;
  });
  return { d: parts.join(' ').replace(/(\d+\.\d)\d+/g, '$1'), width };
}
const cap = font.capHeight / upm;
const mark = outline('H&P', 22, 28, 28 + (cap * 22) / 2, { anchor: 'middle' });
const name = outline('HALLAM & PRICE', 18, 64, 26);
const sub = outline('CHARTERED ACCOUNTANTS', 11, 64, 44, { tracking: 2 });
const square = '<rect x="2" y="2" width="52" height="52" fill="#1f3a5f"/>';
const markPath = `<path fill="#c9a227" d="${mark.d}"/>`;
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262 56" width="262" height="56" role="img" aria-label="Hallam &amp; Price Chartered Accountants">
  ${square}
  ${markPath}
  <path fill="#1f3a5f" d="${name.d}"/>
  <path fill="#6b7a8c" d="${sub.d}"/>
</svg>
`;
const compact = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(64 + name.width + 2)} 56" role="img" aria-label="Hallam &amp; Price">
  ${square}
  ${markPath}
  <path fill="#1f3a5f" d="${outline('HALLAM & PRICE', 18, 64, 35.5).d}"/>
</svg>
`;
const markOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" role="img" aria-label="Hallam &amp; Price">
  ${square}
  ${markPath}
</svg>
`;
writeFileSync('assets/logo-outlined.svg', full);
// Reversed lockups for the navy header and footer: the square keeps its navy and gains a gold keyline so it
// still reads as a tile on a navy ground; the name turns white and the sub-line light navy.
const squareRev = '<rect x="2.75" y="2.75" width="50.5" height="50.5" fill="#1f3a5f" stroke="#c9a227" stroke-width="1.5"/>';
writeFileSync('assets/logo-outlined-rev.svg', full.replace(square, squareRev).replace('<path fill="#1f3a5f"', '<path fill="#ffffff"').replace('<path fill="#6b7a8c"', '<path fill="#c9d9ef"'));
writeFileSync('assets/logo-compact-rev.svg', compact.replace(square, squareRev).replace('<path fill="#1f3a5f"', '<path fill="#ffffff"'));
writeFileSync('assets/logo-mark-rev.svg', markOnly.replace(square, squareRev));
writeFileSync('assets/logo-compact.svg', compact);
writeFileSync('assets/logo-mark.svg', markOnly);
console.log({ markWidth: mark.width.toFixed(1), nameWidth: name.width.toFixed(1), subEnds: (64 + sub.width).toFixed(1) });
