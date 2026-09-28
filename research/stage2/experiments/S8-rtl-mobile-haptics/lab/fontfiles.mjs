// What an Arabic face costs as served (Google Fonts, weight 400, woff2 per unicode-range subset), and what naive
// string truncation does to vocalised Arabic (code units vs grapheme clusters).
import { readdir, stat, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const fontkit = createRequire('/home/user/website-redesign-skill/skills/website-redesign/scripts/package.json')('fontkit');
import path from 'node:path';
import { root } from '../lib/server.mjs';

export async function run() {
  const dir = path.join(root, 'fonts', 'served');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.woff2'));
  const fam = {};
  for (const f of files) {
    const [name, ...sub] = f.replace('.woff2', '').split('-');
    (fam[name] ??= {})[sub.join('-')] = (await stat(path.join(dir, f))).size;
  }
  const served = Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, { arabicKB: v.arabic ? +(v.arabic / 1024).toFixed(1) : null, latinKB: v.latin ? +(v.latin / 1024).toFixed(1) : null, subsets: Object.keys(v) }]).sort((a, b) => (a[1].arabicKB ?? 0) - (b[1].arabicKB ?? 0)));
  // truncation
  const name = 'مُحَمَّدٌ عَبْدُ الرَّحْمٰنِ';
  const seg = [...new Intl.Segmenter('ar', { granularity: 'grapheme' }).segment(name)].map((s) => s.segment);
  const cut = (n) => name.slice(0, n);
  const orphan = (s) => /[ً-ٰٟ]$/.test(s) ? 'ends on a mark' : /[ً-ٰٟ]/.test(s.slice(-1)) ? 'mark' : 'clean';
  const truncation = {
    text: name, codeUnits: name.length, graphemes: seg.length,
    slice5: { value: cut(5), shows: 'م ُ ح َ م — the harakat count as characters, so 5 "characters" is 3 letters', graphemeSlice5: seg.slice(0, 5).join('') },
    lastGraphemeOfSlice4: orphan(cut(4)),
    rule: 'truncate by grapheme (Intl.Segmenter) or let CSS do it (text-overflow / line-clamp); never String.slice on user-visible Arabic',
  };
  // U+20C1 SAUDI RIYAL SIGN in Google Fonts families (fetch.sh asked the API for a one-glyph subset of each)
  const rdir = path.join(root, 'fonts', 'riyal');
  const riyal = { has: [], lacks: [] };
  for (const css of (await readdir(rdir)).filter((f) => f.endsWith('.css'))) {
    const w = path.join(rdir, css.replace('.css', '.woff2'));
    const ok = existsSync(w) && fontkit.create(await readFile(w)).hasGlyphForCodePoint(0x20C1);
    riyal[ok ? 'has' : 'lacks'].push(css.replace('.css', ''));
  }
  return { served, truncation, riyalSignInGoogleFonts: riyal };
}
