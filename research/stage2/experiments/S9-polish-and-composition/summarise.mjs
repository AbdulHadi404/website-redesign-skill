#!/usr/bin/env node
// Prints the report tables from results.json and judgements.json (Markdown). node summarise.mjs > tables.md
import { readFile } from 'node:fs/promises';
import { MOVES } from './lib/moves.mjs';

const R = JSON.parse(await readFile(new URL('./results.json', import.meta.url), 'utf8'));
const J = JSON.parse(await readFile(new URL('./judgements.json', import.meta.url), 'utf8'));
const key = J.keySnapshot;
const f = (x, d = 2) => (x == null || Number.isNaN(x) ? '–' : x === 0 ? '0' : x < 0.01 ? '<0.01' : x.toFixed(d));

// per move: what the builder saw per view, and whether the variant was preferred
const byMove = {};
for (const [id, j] of Object.entries(J.sheets)) {
  const k = key[id]; if (!k) continue;
  const view = k.view.split(' ')[0];
  const verdict = !j.seen ? '·' : j.better === '=' ? '=' : j.better === k.variantSide ? '+' : '−';
  ((byMove[k.variant] ||= {})[view] ||= []).push(verdict);
}
const cell = (v, view) => (byMove[v]?.[view] || ['n/a']).join('');

console.log('## Single moves\n');
console.log('Measures are % of the first viewport: pm = pixelmatch (threshold 0.1), ΔE>1 and ΔE>2.3 = CIEDE2000 at full resolution, glance = ΔE>2.3 after a 4× downscale. Builder verdicts per sheet: · not seen, = seen but no preference, + variant preferred, − baseline preferred. 1440 sheets were viewed at ~0.6×, 390 sheets at ~2.2× CSS px, zoom sheets at 2× the capture.\n');
console.log('| Move | Family | 1440 pm | 1440 ΔE>1 | 1440 ΔE>2.3 | 1440 glance | 390 glance | fold 1440 | fold 390 | window | zoom 1440 | zoom 390 | probe flags it |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const m of MOVES) {
  const s = R.singles.measures[m.id];
  const det = R.singles.detected?.[m.id]?.[1440] || [];
  console.log(`| ${m.id} | ${m.family} | ${f(s[1440].fold.pm)} | ${f(s[1440].fold.jnd1)} | ${f(s[1440].fold.jnd)} | ${f(s[1440].fold.thumb)} | ${f(s[390].fold.thumb)} | ${cell(m.id, 'fold-1440')} | ${cell(m.id, 'fold-390')} | ${cell(m.id, 'window-1440')} | ${cell(m.id, 'zoom-1440')} | ${cell(m.id, 'zoom-390')} | ${det.join(', ') || '–'} |`);
}

if (R.blindScore) {
  console.log('\n## Blind score (builder)\n');
  console.log('| View | Sheets | Seen | Variant preferred (or "=" on the control) | Baseline preferred |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const [v, x] of Object.entries(R.blindScore.summary)) console.log(`| ${v} | ${x.n} | ${x.seen} | ${x.correct} | ${x.reversed} |`);
}

// how well each measure predicts "seen" on the first-viewport sheets
const rows = [];
for (const [id, j] of Object.entries(J.sheets)) {
  const k = key[id]; if (!k || !/^fold-/.test(k.view)) continue;
  const w = Number(k.view.split('-')[1]);
  const m = R.singles.measures[k.variant]?.[w]?.fold; if (!m) continue;
  rows.push({ seen: j.seen, pm: m.pm, jnd1: m.jnd1, jnd: m.jnd, thumb: m.thumb, v: `${k.variant}@${w}` });
}
const best = (metric) => {
  let top = null;
  for (const t of [...new Set(rows.map((r) => r[metric]))].sort((a, b) => a - b)) {
    const ok = rows.filter((r) => (r[metric] >= t && t > 0) === r.seen).length;
    if (!top || ok > top.ok) top = { t, ok };
  }
  const miss = rows.filter((r) => (r[metric] >= top.t && top.t > 0) !== r.seen).map((r) => `${r.v} (${r.seen ? 'seen' : 'not seen'})`);
  return { ...top, n: rows.length, miss };
};
console.log('\n## Which measure predicts "seen" (first-viewport sheets)\n');
console.log('| Measure | Best threshold (% of viewport) | Sheets classified right | Misclassified |');
console.log('| --- | --- | --- | --- |');
for (const k of ['pm', 'jnd1', 'jnd', 'thumb']) { const b = best(k); console.log(`| ${k} | ≥ ${f(b.t, 3)} | ${b.ok} / ${b.n} | ${b.miss.join('; ')} |`); }

if (R.stacks) {
  console.log('\n## Stacks\n');
  console.log('| Stack | Moves | 1440 pm | 1440 glance | 390 glance | vs top 5: 1440 glance | vs top 5: 390 glance | probe flags left (1440) |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [n, list] of Object.entries(R.stacks.definition)) {
    const m = R.stacks.measures[n]; const t = R.stacks.vsTop5?.[n];
    const flags = Object.entries(R.stacks.probe[n][1440]).filter(([, x]) => x.flag).map(([k]) => k);
    console.log(`| ${n} | ${list.length} | ${f(m[1440].fold.pm)} | ${f(m[1440].fold.thumb)} | ${f(m[390].fold.thumb)} | ${t ? f(t[1440].fold.thumb) : '–'} | ${t ? f(t[390].fold.thumb) : '–'} | ${flags.join(', ') || '–'} |`);
  }
  const baseFlags = Object.entries(R.singles.probe.base[1440]).filter(([, x]) => x.flag).map(([k]) => k);
  console.log(`\nBaseline probe flags (1440): ${baseFlags.join(', ')}`);
}
if (R.labChecks) console.log(`\n## Lab checks\n\n\`\`\`json\n${JSON.stringify(R.labChecks, null, 1)}\n\`\`\``);
