// Advance widths of Western, Eastern Arabic and Persian digits, default and with tnum, straight from the font files.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../skills/website-redesign/scripts/package.json', import.meta.url));
const fontkit = require('fontkit');
const sets = { latn: '0123456789', arab: '٠١٢٣٤٥٦٧٨٩', arabext: '۰۱۲۳۴۵۶۷۸۹' };
const files = process.argv.slice(2);
for (const f of files) {
  const font = fontkit.openSync(f);
  const feats = font.availableFeatures;
  const row = [f.replace('fonts/', '').padEnd(34), `tnum:${feats.includes('tnum') ? 'y' : 'n'}`];
  for (const [k, s] of Object.entries(sets)) {
    const has = [...s].every((c) => font.hasGlyphForCodePoint(c.codePointAt(0)));
    if (!has) { row.push(`${k}: —`); continue; }
    const w = (tn) => font.layout(s, tn ? { tnum: true } : {}).glyphs.map((g) => g.advanceWidth);
    const a = w(false), b = w(true);
    const desc = (x) => (new Set(x).size === 1 ? `tab(${x[0]})` : `prop(${Math.min(...x)}–${Math.max(...x)})`);
    row.push(`${k}: ${desc(a)} → tnum ${desc(b)}`);
  }
  console.log(row.join('  '));
}
