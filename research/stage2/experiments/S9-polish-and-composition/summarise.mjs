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
// leave-one-out: fit the threshold on 49 sheets, predict the 50th (an honest estimate of the fitted rule)
const loo = (metric) => {
  let ok = 0;
  for (let i = 0; i < rows.length; i++) {
    const train = rows.filter((_, j) => j !== i);
    let top = null;
    for (const t of [...new Set(train.map((r) => r[metric]))].sort((a, b) => a - b)) { const k = train.filter((r) => (r[metric] >= t && t > 0) === r.seen).length; if (!top || k > top.k) top = { t, k }; }
    if ((rows[i][metric] >= top.t && top.t > 0) === rows[i].seen) ok++;
  }
  return ok;
};
// the sheets either side of the fitted threshold: how much margin the rule has
const bracket = (metric, t) => {
  const lowSeen = rows.filter((r) => r.seen && r[metric] >= t).sort((a, b) => a[metric] - b[metric])[0];
  const highUnseen = rows.filter((r) => !r.seen && r[metric] < t).sort((a, b) => b[metric] - a[metric])[0];
  return `lowest seen above: ${lowSeen ? `${lowSeen.v} ${f(lowSeen[metric], 3)}` : '–'}; highest unseen below: ${highUnseen ? `${highUnseen.v} ${f(highUnseen[metric], 3)}` : '–'}`;
};
console.log('\n## Which measure predicts "seen" (first-viewport sheets; builder judge, fitted on the same sheets)\n');
console.log('| Measure | Best threshold (% of viewport) | Right (fitted) | Right (leave-one-out) | Margin | Misclassified |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const k of ['pm', 'jnd1', 'jnd', 'thumb']) { const b = best(k); console.log(`| ${k} | ≥ ${f(b.t, 3)} | ${b.ok} / ${b.n} | ${loo(k)} / ${b.n} | ${bracket(k, b.t)} | ${b.miss.join('; ')} |`); }
const always = rows.filter((r) => !r.seen).length;
console.log(`\nA rule that says "not seen" for every sheet gets ${always} / ${rows.length}; "seen" for every sheet gets ${rows.length - always} / ${rows.length}.`);

// zoom sheets: seen, but preferred? Split by moves that move or re-break text (their zooms compare shifted content)
const LAYOUT = new Set(['scale', 'rhythm', 'align', 'depth', 'leading', 'tracking', 'wrap', 'opsz', 'hang', 'buttons', 'iconstroke']);
console.log('\n## Zoom sheets (2x crops of the densest change)\n');
console.log('| Zoom | Moves | Sheets | Seen | Variant preferred | Baseline preferred |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const view of ['zoom-1440', 'zoom-390']) for (const [label, test] of [['all', () => true], ['no text moved', (v) => !LAYOUT.has(v)], ['text moved', (v) => LAYOUT.has(v)]]) {
  const rs = Object.entries(J.sheets).map(([id, j]) => ({ j, k: key[id] })).filter((x) => x.k && x.k.view === view && test(x.k.variant));
  console.log(`| ${view} | ${label} | ${rs.length} | ${rs.filter((x) => x.j.seen).length} | ${rs.filter((x) => x.j.seen && x.j.better === x.k.variantSide).length} | ${rs.filter((x) => x.j.seen && x.j.better !== '=' && x.j.better !== x.k.variantSide).length} |`);
}

if (R.stacks) {
  console.log('\n## Stacks\n');
  console.log('| Stack | Moves | 1440 pm | 1440 glance | 390 glance | vs top 5: 1440 glance | vs top 5: 390 glance | probe flags left (1440) |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [n, list] of Object.entries(R.stacks.definition)) {
    const m = R.stacks.measures[n]; const t = R.stacks.vsTop5?.[n];
    const flags = Object.entries(R.stacks.probe[n][1440]).filter(([, x]) => x.flag).map(([k, x]) => `${k}${x.kind === 'defect' ? ' (defect)' : ''}`);
    console.log(`| ${n} | ${list.length} | ${f(m[1440].fold.pm)} | ${f(m[1440].fold.thumb)} | ${f(m[390].fold.thumb)} | ${t ? f(t[1440].fold.thumb) : '–'} | ${t ? f(t[390].fold.thumb) : '–'} | ${flags.join(', ') || '–'} |`);
  }
  const baseFlags = (kind) => Object.entries(R.singles.probe.base[1440]).filter(([, x]) => x.flag && x.kind === kind).map(([k]) => k);
  console.log(`\nBaseline probe flags (1440): defects ${baseFlags('defect').join(', ')}; style questions ${baseFlags('question').join(', ')}`);
}
if (J.stackKeySnapshot) {
  console.log('\n## Stack sheets (builder: blind to side, NOT blind to move identity; the stacks were defined after the single-move key was opened, and the notes name signature moves, so these carry no evidential weight)\n');
  console.log('| Sheet | Variant | Against | View | Seen | Verdict |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const [id, k] of Object.entries(J.stackKeySnapshot)) {
    const j = J.sheets[id]; if (!j) continue;
    const verdict = !j.seen ? 'not seen' : j.better === '=' ? 'no preference' : j.better === k.variantSide ? 'variant preferred' : 'reference preferred';
    console.log(`| ${id} | ${k.variant} | ${k.reference} | ${k.view} | ${j.seen ? 'yes' : 'no'} | ${verdict}${j.note ? ` (${j.note})` : ''} |`);
  }
}
if (R.singles?.probe) {
  console.log('\n## Probe on the fixture (v2): what each move clears\n');
  const b = R.singles.probe.base;
  const flagged = (w, kind) => Object.entries(b[w]).filter(([, x]) => x.flag && x.kind === kind).map(([k]) => k);
  console.log(`Baseline 1440: defects [${flagged(1440, 'defect').join(', ')}], style questions [${flagged(1440, 'question').join(', ')}]`);
  console.log(`Baseline 390: defects [${flagged(390, 'defect').join(', ')}], style questions [${flagged(390, 'question').join(', ')}]`);
  const clears = Object.entries(R.singles.detected).filter(([, d]) => (d[1440] || []).length || (d[390] || []).length).map(([m, d]) => `${m}: ${[...new Set([...(d[1440] || []), ...(d[390] || [])])].join(', ')}`);
  console.log(`Moves that clear a baseline flag at either width (${clears.length}): ${clears.join('; ')}`);
}

if (R.nofocus) {
  console.log('\n## Without the forced focus state (nf-<move> against nf-base, first viewport)\n');
  console.log(`The forced focus alone (focused baseline against unfocused baseline): glance 1440 ${f(R.nofocus.ringOnly[1440].fold.thumb)}, 390 ${f(R.nofocus.ringOnly[390].fold.thumb)}; pm 1440 ${f(R.nofocus.ringOnly[1440].fold.pm)}\n`);
  console.log('| Move | glance 1440 focused → unfocused | glance 390 focused → unfocused | pm 1440 focused → unfocused | judged (fold 1440 · 390, on focused sheets) |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const m of MOVES) {
    const a = R.singles.measures[m.id], b = R.nofocus.measures[m.id]; if (!b) continue;
    console.log(`| ${m.id} | ${f(a[1440].fold.thumb)} → ${f(b[1440].fold.thumb)} | ${f(a[390].fold.thumb)} → ${f(b[390].fold.thumb)} | ${f(a[1440].fold.pm)} → ${f(b[1440].fold.pm)} | ${cell(m.id, 'fold-1440')} · ${cell(m.id, 'fold-390')} |`);
  }
  // does the fitted rule still classify the judged sheets the same way on unfocused measures?
  const nfRows = rows.map((r) => { const [v, w] = r.v.split('@'); const m = R.nofocus.measures[v]?.[w]?.fold; return m ? { ...r, thumb: m.thumb } : null; }).filter(Boolean);
  const t = best('thumb').t;
  const agree = nfRows.filter((r) => (r.thumb >= t) === (rows.find((q) => q.v === r.v).thumb >= t)).length;
  console.log(`\nGlance rule (≥ ${f(t, 3)}) gives the same seen / not-seen call on focused and unfocused measures for ${agree} of ${nfRows.length} sheets; changed: ${nfRows.filter((r) => (r.thumb >= t) !== (rows.find((q) => q.v === r.v).thumb >= t)).map((r) => r.v).join(', ') || 'none'}.`);
  if (R.nofocus.valueMasses) {
    console.log('\nValue masses at 1440 (greyscale, 12 px blur; mean grey inside each button box + 8 px; 0 black, 1 white):\n');
    console.log('| Variant | ground (median) | hero CTA mean / min | Publish mean / min |');
    console.log('| --- | --- | --- | --- |');
    for (const [v, x] of Object.entries(R.nofocus.valueMasses)) console.log(`| ${v} | ${x.ground} | ${x.heroCta.mean} / ${x.heroCta.min} | ${x.publish.mean} / ${x.publish.min} |`);
  }
}

if (R.outside) {
  const rev = JSON.parse(await readFile(new URL('./outside-review.json', import.meta.url), 'utf8').catch(() => '{}'));
  console.log('\n## The probe on pages it was not built on (v1 as first reported, v2 after review)\n');
  console.log('| Page | v1 flags (1440 + 390) | v2 defects (1440 + 390) | v2 style questions (1440) | hand verdict on v2 defects |');
  console.log('| --- | --- | --- | --- | --- |');
  const sets = {};
  for (const [id, x] of Object.entries(R.outside)) {
    if (x.missing) { console.log(`| ${id} | missing | | | |`); continue; }
    const fl = (ver, kind) => [...new Set([1440, 390].flatMap((w) => Object.entries(x[ver][w]).filter(([, y]) => y.flag && (!kind || y.kind === kind)).map(([k]) => k)))];
    const q = Object.entries(x.v2[1440]).filter(([, y]) => y.flag && y.kind === 'question').map(([k]) => k);
    const S = (sets[x.set || 'tuned-on'] ||= { TP: 0, FP: 0, boundary: 0, unverified: 0, unreviewed: 0 });
    const verdicts = fl('v2', 'defect').map((k) => { const v = rev.pages?.[id]?.[k]; S[v ? v.verdict : 'unreviewed']++; return `${k}: ${v ? v.verdict : 'unreviewed'}`; });
    console.log(`| ${id} (${x.set || 'tuned-on'}) | ${fl('v1').join(', ') || '–'} | ${fl('v2', 'defect').join(', ') || '–'} | ${q.join(', ') || '–'} | ${verdicts.join('; ') || '–'} |`);
  }
  for (const [set, c] of Object.entries(sets)) console.log(`\nv2 defect flags (page × check) on ${set} pages: ${c.TP} true, ${c.FP} false, ${c.boundary} boundary, ${c.unverified} unverified${c.unreviewed ? `, ${c.unreviewed} NOT YET REVIEWED` : ''}.`);
  if (rev.heldOutFirstRun) { const h = rev.heldOutFirstRun; console.log(`\nHeld-out pages, first run (before the two fixes): ${h.flags} defect flags: ${h.tp} true, ${h.boundary} boundary, ${h.fp} false (${h.falsePositives.map((x) => `${x.page} ${x.check}`).join('; ')}).`); }
  if (rev.v1Errors) {
    console.log('\nv1 errors the review found, and what v2 does:\n');
    for (const x of rev.v1Errors) {
      const now = R.outside[x.page]?.v2?.[x.width]?.[x.check];
      const st = !now ? 'n/a' : x.expect === 'flag' ? (now.flag ? 'flags (right)' : 'no flag (wrong)') : x.expect === 'no flag' ? (now.flag ? 'still flags (wrong)' : 'no flag (right)') : x.expect === 'style question' ? `reported as ${now.kind}` : String(now.value);
      console.log(`- ${x.page} ${x.check} @${x.width}: ${x.what} → v2: ${st}${x.v2note ? ` (${x.v2note})` : ''}`);
    }
  }
}

if (R.labChecks) console.log(`\n## Lab checks\n\n\`\`\`json\n${JSON.stringify(R.labChecks, null, 1)}\n\`\`\``);
