// Print the lab's results.json as markdown tables (node summarize.mjs [a|b|c]).
import { readFile } from 'node:fs/promises';
const R = JSON.parse(await readFile(new URL('./results.json', import.meta.url), 'utf8'));
const part = process.argv[2];
const kb = (b) => (b == null ? '—' : (b / 1024).toFixed(1));
const out = [];
if ((!part || part === 'a') && R.a) {
  const A = R.a;
  out.push('### A. Bundle, lines, main thread', '', '| tool | JS gz KB (set) | + React | CSS gz KB | LOC (reduced-motion lines) | main-thread task ms (4×, whole set) | script ms | rAF/s at rest | sheet moved during 400 ms block |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const [k, s] of Object.entries(A.sizes)) {
    const c = A.cost[k] || {}; const cp = A.compositor[k];
    out.push(`| ${s.label} | ${kb(s.jsGz)} | ${s.withReactGz ? kb(s.withReactGz) : '—'} | ${kb(s.cssGz)} | ${s.loc} (${s.locRm}) | ${c.task ?? '—'} | ${c.script ?? '—'}${c.scriptMin != null ? ` (${c.scriptMin}–${c.scriptMax})` : ''} | ${c.restRafPerS ?? '—'} | ${cp ? `${cp.movedPx} px${cp.runs ? ` (${Math.min(...cp.runs)}–${Math.max(...cp.runs)})` : ''}` : '—'} |`);
  }
  for (const k of Object.keys(A.cost).filter((k) => !A.sizes[k])) { const c = A.cost[k]; const cp = A.compositor[k]; out.push(`| ${k} (variant) | | | | | ${c.task} | ${c.script} | ${c.restRafPerS ?? '—'} | ${cp ? `${cp.movedPx} px` : '—'} |`); }
  if (A.costOrder) out.push('', `Script-time order kept in rounds: ${['css<gsap', 'gsap<motion', 'anime<motion', 'anime<gsap', 'motion<motion-react', 'motion-react<spring'].map((k) => `${k} ${A.costOrder[k] ?? A.costOrder[k.split('<').reverse().join('<')]?.replace(/^(\d+)\/(\d+)$/, (m, a, b) => `${b - a}/${b}`) ?? '—'}`).join(' · ')}`);
  out.push('', '### A. Interrupted mid-flight (kind, runs)', '');
  const names = ['press', 'list', 'sheet', 'view', 'ticker', 'grid'];
  out.push(`| variant | ${names.join(' | ')} |`, `| --- |${names.map(() => ' --- |').join('')}`);
  for (const [v, x] of Object.entries(A.interrupt)) out.push(`| ${v} | ${names.map((n) => (x[n] ? `${Object.entries(x[n].kinds || {}).map(([k, c]) => `${k} ${c}`).join(', ') || x[n].error || x[n].kind}${x[n].settleMsMedian != null ? ` · ${x[n].settleMsMedian} ms` : ''}${x[n].momentumFrames ? ` · mom ${x[n].momentumFrames}` : ''}` : '')).join(' | ')} |`);
  out.push('', '### A. Reduced motion: normal / out of the box / with the guard we added', '');
  const all = ['press', 'list', 'sheet', 'view', 'scroll', 'ticker', 'grid'];
  out.push(`| variant | ${all.join(' | ')} |`, `| --- |${all.map(() => ' --- |').join('')}`);
  for (const [v, x] of Object.entries(A.single)) out.push(`| ${v} | ${all.map((n) => (x[n] ? `${x[n].normal.state}/${x[n]['reduce-default'].state}/${x[n]['reduce-guard'].state}${n === 'ticker' && x[n].normal.text ? ` (seen "${x[n].normal.text.rendered}", DOM "${x[n].normal.text.dom}")` : ''}` : '')).join(' | ')} |`);
  out.push('', `Motion transform-string repro: ${JSON.stringify(A.motionTransformRepro)}`, '', 'Rest probes (rAF callbacks/s, 1.5 s after the last animation):', '');
  for (const [k, v] of Object.entries(A.restProbes || {})) out.push(`- ${k}: ${v}`);
}
if ((!part || part === 'b') && R.b) {
  const B = R.b;
  out.push('', '### B. Toggle', '', '| runtime | JS gz KB | WASM gz KB | asset gz KB | total gz KB | first frame ms (4×) | main ms/s toggling | rAF/s toggling | ms/s at rest | rAF/s at rest | animates under reduce | a11y tree | Tab | Space/Enter |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |');
  for (const [v, r] of Object.entries(B.toggle)) { const s = B.sizes[v === 'lottie-canvas' ? 'lottie-svg' : v] || {}; const a = B.a11y[v] || {};
    out.push(`| ${v} | ${kb(s.jsGz)}${s.jsGzWithoutReact ? ` (${kb(s.jsGzWithoutReact)} w/o React)` : ''} | ${kb(s.wasmGz)} | ${kb(s.assetGz)} | ${kb((s.jsGz || 0) + (s.wasmGz || 0) + (s.assetGz || 0))} | ${r.ttffMs} | ${r.taskMsPerS} | ${r.rafPerS} | ${r.restTaskMsPerS} | ${r.restRafPerS} | ${r.reducedMotion.animates ? 'yes' : 'no'} (${r.reducedMotion.distinctFrames}) | ${a.tree} | ${a.tabReaches ?? 'no'} | ${a.keyboardToggles ? 'yes' : 'no'} |`); }
  out.push('', '### B. Loops', '', '| runtime | JS gz | WASM gz | asset gz | first frame ms | main ms/s | rAF/s | animates under reduce |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const [v, r] of Object.entries(B.loops)) { const s = B.sizes[v] || {}; out.push(`| ${v} | ${kb(s.jsGz)} | ${kb(s.wasmGz)} | ${kb(s.assetGz)} | ${r.ttffMs} | ${r.taskMsPerS} | ${r.rafPerS} | ${r.reducedMotion.animates ? 'yes' : 'no'} |`); }
  out.push('', `Rive semantics: ${JSON.stringify(B.a11y['rive-semantics'])}`);
}
if ((!part || part === 'c') && R.c) {
  const C = R.c;
  out.push('', '### C. motion.mjs on four builds', '', '| page | spec pass | spec findings TP/FP/FN | flags predicted / truth / TP | seconds |', '| --- | --- | --- | --- | ---: |');
  for (const [v, p] of Object.entries(C.pages)) out.push(`| ${v} | ${p.specPass} | ${p.spec.tp}/${p.spec.fp.length}/${p.spec.fn.length} | ${p.flags.predicted}/${p.flags.truth}/${p.flags.tp} | ${p.seconds} |`);
  out.push('', `Totals: ${JSON.stringify({ spec: { p: C.totals.specFindings.precision, r: C.totals.specFindings.recall, fp: C.totals.specFindings.fp, fn: C.totals.specFindings.fn }, flags: { p: C.totals.flags.precision, r: C.totals.flags.recall }, verdicts: C.totals.entryVerdicts })}`);
  out.push(`Filmstrips fit (every frame inside the image): ${C.totals.filmstripsFit}`);
  for (const [k, h] of Object.entries(C.partAPages || {})) if (h.verdicts) out.push('', `Part A pages, ${k}: animates-or-not ${h.agreementNormal}; reduced outcome ${h.agreementReduce} (reference states ${JSON.stringify(h.referenceReduceStates)}); verdicts ${h.verdicts} (truth: ${h.truthFailing} failing, ${h.truthPassing} passing); findings P ${h.findings.precision} R ${h.findings.recall}`, ...(h.wrongVerdicts || []).map((d) => `- wrong verdict: ${d}`), ...(h.disagreements || []).map((d) => `- disagreement: ${d}`));
  const P = C.pages2 || {};
  for (const [k, v] of Object.entries(P)) if (v?.flagScore) { const f = v.flagScore;
    out.push('', `Pages ${k}: ${f.flags} flags — tp ${f.tp}, fp ${f.fp}, debatable ${f.debatable}, unlabelled ${f.unlabelled}; precision ${f.precision} (${f.precisionDebatableAsFp} counting debatable as wrong)`, ...f.fpList.map((x) => `- fp: ${x}`));
    if (v.specScore) out.push(`Spec rows: verdicts ${v.specScore.verdicts}; findings P ${v.specScore.precision} R ${v.specScore.recall}`, ...v.specScore.detail.map((d) => `- ${d}`)); }
}
console.log(out.join('\n'));
