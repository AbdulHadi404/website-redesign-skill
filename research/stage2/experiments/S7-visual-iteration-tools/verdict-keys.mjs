#!/usr/bin/env node
/**
 * Lists every finding key in results.json that verdicts.json does not label yet (or all with --all), with one example,
 * so each can be checked by eye in the crops and sheets and given a verdict:
 *   TP  the condition is real and a designer would fix it
 *   INT the condition is real, the tool aimed at the right thing, but it is intended or harmless
 *   FP  not real, pinned on the wrong element, or caused by the tool (a mutation aimed at authored copy as if it were
 *       data, a list detector that took prose or sections for a list, a check that ignores what is painted) —
 *       tool-caused FPs carry "cause": "tool"
 *   node verdict-keys.mjs [sweep|stress|rtl] [--all]
 */
import { readFile } from 'node:fs/promises';
const R = JSON.parse(await readFile(new URL('./results.json', import.meta.url), 'utf8'));
let V = {};
try { V = JSON.parse(await readFile(new URL('./verdicts.json', import.meta.url), 'utf8')); } catch { /* none yet */ }
const normSel = (s) => String(s).replace(/:nth-of-type\(\d+\)/g, ':nth-of-type(n)').replace(/ \(\d+×\)$/, '');
const which = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const all = process.argv.includes('--all');
for (const sec of which.length ? which : ['sweep', 'stress', 'rtl']) {
  const seen = new Set();
  if (sec === 'rtl') {
    for (const t of R.rtl?.targets || []) for (const e of t.extra || []) { const k = `${t.name}|${e.key}`; if (seen.has(k) || (!all && V.rtl?.[k])) continue; seen.add(k); console.log(JSON.stringify(k), '//', e.detail.slice(0, 110)); }
    continue;
  }
  for (const holder of [R, R.holdout || {}, R.holdout2 || {}]) {
    for (const t of holder[sec]?.targets || []) {
      for (const f of t.ranges || t.findings || []) {
        const k = sec === 'sweep' ? `${t.name}|${f.check}|${normSel(f.sel)}` : `${t.name}|${f.mutation}|${f.check}|${normSel(f.sel)}`;
        if (seen.has(k) || (!all && V[sec]?.[k])) continue;
        seen.add(k);
        console.log(JSON.stringify(k), '//', f.sev, sec === 'sweep' ? `${f.from}–${f.to}` : `@${f.width}`, String(f.detail).slice(0, 110));
      }
    }
  }
}
