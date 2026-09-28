// Hand-judged detection matrix for pages/flawed.html (judged from results/*). A cell counts only when the tool
// flags THE seeded defect (not an incidental issue on the same element).
// V = reported as failure/violation/error · R = reported as warning / needs-review / potential · '' = missed
// Columns: axe (wcag2a..22aa + best-practice) · axeX (+experimental) · htmlcs (pa11y) · LH (Lighthouse a11y) · IBM (Equal Access engine) · S (a11y-audit.mjs) · W (widget-contracts.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
const gt = JSON.parse(readFileSync('ground-truth.json', 'utf8'));
const cols = ['axe', 'axeX', 'htmlcs', 'LH', 'IBM', 'S', 'W'];
const M = {
  F01: 'V V V V V V -', F02: 'V V V V V V -', F03: 'V V V V V - -', F04: '. . . . . V -', F05: '. . . . . R -',
  F06: 'V V V V V - -', F06a: 'V V V V V - -', F07: '. . V . R V -', F08: 'V V V V V V -', F09: 'V V V V V V -',
  F10: '. . R . R V V', F11: '. . R . V V V', F12: 'V V . V V V -', F13: 'R R . . V . -', F14: '. . . . R V -',
  F15: '. . . . R . -', F16: 'V V R V . R -', F17: '. . . . R R -', F18: 'V V . V V V -', F20: '. . . . R V -',
  F21: 'V V . V . V -', F22: '. . . . . R -', F22b: '. . . . . . -', F23: '. . . . . . V', F24: 'V V R V V . -',
  F24b: '. . . . . R -', F25: 'V V V V V V -', F26: '. . R . V R -', F27: '. V . V V V -', F28: 'V V R V V V -',
  F29: '. . . . V R -', F30: 'R V V V R V -', F31: '. . . . . R -', F32: '. . . . . V -', F33: '. . . . . V -',
  F34: 'V V . V V V -', F35: '. . R . . . V', F36: '. . . . . . V', F37: '. . . . . V -', F38: '. . . . . V -',
  F39: 'V V R V R V -', F40a: '. . . . R V -', F40b: '. . R . V V -', F40c: '. . . . . V -', F41: '. . . . . V -',
  F42: 'V V . . . . -', F43: '. . . . . . V', F44: '. . R . V V V', F45: '. . R . V V -', F46: 'V V V V V . -',
  F47: '. . . . . . -', F48: '. V R V V V -', F49: '. . . . . . -', F53: '. . . . . V -', F54: 'R R . . V . -',
  F55: 'V V . . V . -', F56: 'V V . V R . -', F57: '. . . . R V -', F58: '. . . . . V -', F59: 'V V V . V V -',
};
const rows = gt.map(([id, what, sc]) => ({ id, what, sc, ...Object.fromEntries(M[id].split(' ').map((v, i) => [cols[i], v === '.' ? '' : v])) }));
const n = rows.length;
const tally = Object.fromEntries(cols.map(c => [c, { V: rows.filter(r => r[c] === 'V').length, R: rows.filter(r => r[c] === 'R').length }]));
const union = (cs, strict) => rows.filter(r => cs.some(c => strict ? r[c] === 'V' : ['V', 'R'].includes(r[c]))).length;
const rules = ['axeX', 'htmlcs', 'LH', 'IBM'];
const out = [];
out.push(`| Flaw | Defect | SC | ${cols.join(' | ')} |`, `|---|---|---|${cols.map(() => '---').join('|')}|`);
for (const r of rows) out.push(`| ${r.id} | ${r.what} | ${r.sc} | ${cols.map(c => r[c] === 'V' ? '●' : r[c] === 'R' ? '◐' : r[c] === '-' ? '–' : '·').join(' | ')} |`);
out.push('', `**Totals (of ${n} seeded defects)** — ● failure · ◐ warning/needs-review only`, '');
for (const c of cols) out.push(`- ${c}: ● ${tally[c].V}, ◐ ${tally[c].R} → any signal ${tally[c].V + tally[c].R} (${Math.round(100 * (tally[c].V + tally[c].R) / n)}%), as failure ${Math.round(100 * tally[c].V / n)}%`);
out.push(`- all four rule engines combined: any signal ${union(rules, false)} (${Math.round(100 * union(rules, false) / n)}%), as failure ${union(rules, true)} (${Math.round(100 * union(rules, true) / n)}%)`);
out.push(`- axe + IBM: any ${union(['axeX', 'IBM'], false)}, failure ${union(['axeX', 'IBM'], true)}`);
out.push(`- rule engines + a11y-audit + widget-contracts: any signal ${union(cols, false)} (${Math.round(100 * union(cols, false) / n)}%), as failure ${union(cols, true)} (${Math.round(100 * union(cols, true) / n)}%)`);
out.push(`- missed by everything: ${rows.filter(r => !cols.some(c => ['V', 'R'].includes(r[c]))).map(r => `${r.id} (${r.what})`).join('; ')}`);
out.push(`- caught ONLY by the scripted audit/contracts (no rule-engine signal): ${rows.filter(r => !rules.some(c => ['V', 'R'].includes(r[c])) && ['S', 'W'].some(c => ['V', 'R'].includes(r[c]))).map(r => r.id).join(' ')}`);
writeFileSync('results/matrix.md', out.join('\n'));
console.log(out.slice(n + 2).join('\n'));
