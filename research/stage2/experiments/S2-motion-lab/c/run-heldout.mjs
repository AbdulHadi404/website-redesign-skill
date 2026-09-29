// motion.mjs on the six Part A pages, each twice: out of the box (no reduced-motion guard) and with the guard on
// (?guard, the pages' own substitutes). The reference is the Part A runner's own, independent in-page sampler
// (results.json → a.single[page][row]: normal, reduce-default, reduce-guard).
//   node c/run-heldout.mjs   → captures/c-heldout.json
// Honest status of this set: the unguarded pages were used while motion.mjs was developed (its reduced run is
// 41/42 "still moves", so agreement there says little); the guarded run is the balanced test of the reduced-motion
// classifier (moves / fades / instant all occur), and three of its CSS rows were fixed after a reviewer ran it.
// Pass/fail verdicts are scored against c/truth-partA.json (normal-run categories, from the page sources) plus the
// reduced-motion category derived from Part A's sampler with the rules in reducedTruth() below.
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { buildA } from '../a/build.mjs';
import { CATS } from './cats.mjs';
const scripts = path.resolve(labRoot, '../../../../skills/website-redesign/scripts');
const PAGES = ['css', 'motion', 'motion-react', 'gsap', 'anime', 'spring'];
const run = (args) => new Promise((res) => { const c = spawn(process.execPath, ['motion.mjs', ...args], { cwd: scripts, stdio: ['ignore', 'pipe', 'pipe'] }); let o = ''; c.stdout.on('data', (d) => { o += d; }); c.stderr.on('data', (d) => { o += d; }); c.on('close', (code) => res({ code, o })); });
const catOf = (p) => (CATS.find(([, re]) => re.test(p)) || ['other'])[0];
const aNorm = (s) => (s === 'moves' || s === 'fades' ? 'animates' : 'static');
const mNorm = (s) => (s === 'animates' ? 'animates' : 'static');
// Part A calls a counting number "moves" (its value changes over frames); motion.mjs calls it "still animates (text …)"
const redOf = (o) => (/still moves|still animates/.test(o) ? 'moves' : /substituted/.test(o) ? 'fades' : 'instant');
/** Does Part A's measurement under reduce satisfy the spec's `reduced` value? (motion.md §6 semantics) */
export function reducedTruth(expected, ref) {
  const S = ref.state;
  if (expected === 'keep') return S === 'moves';
  if (expected === 'instant' || expected === 'static') return S === 'instant';
  if (expected === 'fade') return S === 'instant' || (S === 'fades' && ref.doneMs <= 300);
  return true;
}
export async function runHeldout() {
  const results = JSON.parse(await readFile(path.join(labRoot, 'results.json'), 'utf8'));
  const A = results.a.single;
  const truth = JSON.parse(await readFile(path.join(labRoot, 'c/truth-partA.json'), 'utf8'));
  const spec = JSON.parse(await readFile(path.join(labRoot, 'a/spec.json'), 'utf8'));
  await buildA();
  const { base, close } = await serve();
  const out = { unguarded: { rows: [] }, guarded: { rows: [] } };
  for (const guard of [false, true]) {
    const set = guard ? out.guarded : out.unguarded; const mode = guard ? 'reduce-guard' : 'reduce-default';
    for (const p of PAGES) {
      const dir = path.join(labRoot, 'captures/c', `heldout-${p}${guard ? '-guard' : ''}`);
      await run([`${base}/captures/a/${p}.html${guard ? '?guard' : ''}`, '--spec', path.join(labRoot, 'a/spec.json'), '--out', dir, '--filmstrip', 'none', '--no-audit']);
      const rep = JSON.parse(await readFile(path.join(dir, 'motion.json'), 'utf8'));
      for (const x of rep.spec) {
        const ref = A[p]?.[x.id]; if (!ref) continue;
        const entry = spec.motion.find((e) => e.id === x.id);
        const cats = [...new Set(x.problems.map(catOf))];
        const want = [...(truth.normal[p]?.[x.id] || [])]; if (!reducedTruth(entry.reduced, ref[mode])) want.push('reduced');
        const uncertain = truth.uncertain.includes(`${p}|${x.id}`);
        set.rows.push({ page: p, id: x.id, uncertain,
          motionMjs: { normal: x.normal?.state, reduce: x.reduced?.outcome, pass: x.pass, cats, problems: x.problems },
          partA: { normal: ref.normal.state, reduce: ref[mode].state, reduceDoneMs: ref[mode].doneMs },
          truth: want, agreeNormal: mNorm(x.normal?.state) === aNorm(ref.normal.state), agreeReduce: x.reduced ? redOf(x.reduced.outcome) === ref[mode].state : null });
      }
      process.stderr.write(`heldout ${p}${guard ? ' (guard)' : ''}\n`);
    }
    const R = set.rows, S = R.filter((r) => !r.uncertain);
    const refCounts = {}; for (const r of R) refCounts[r.partA.reduce] = (refCounts[r.partA.reduce] || 0) + 1;
    const tp = S.flatMap((r) => r.motionMjs.cats.filter((c) => r.truth.includes(c)).map((c) => `${r.page}|${r.id}|${c}`));
    const fp = S.flatMap((r) => r.motionMjs.cats.filter((c) => !r.truth.includes(c)).map((c) => `${r.page}|${r.id}|${c}`));
    const fn = S.flatMap((r) => r.truth.filter((c) => !r.motionMjs.cats.includes(c)).map((c) => `${r.page}|${r.id}|${c}`));
    Object.assign(set, {
      agreementNormal: `${R.filter((r) => r.agreeNormal).length}/${R.length}`,
      agreementReduce: `${R.filter((r) => r.agreeReduce).length}/${R.filter((r) => r.agreeReduce != null).length}`,
      referenceReduceStates: refCounts,
      verdicts: `${S.filter((r) => r.motionMjs.pass === (r.truth.length === 0)).length}/${S.length}`,
      truthFailing: S.filter((r) => r.truth.length).length, truthPassing: S.filter((r) => !r.truth.length).length,
      findings: { tp: tp.length, fp, fn, precision: +(tp.length / (tp.length + fp.length) || 0).toFixed(3), recall: +(tp.length / (tp.length + fn.length) || 0).toFixed(3) },
      excluded: R.filter((r) => r.uncertain).map((r) => `${r.page}|${r.id}`),
      disagreements: R.filter((r) => !r.agreeNormal || r.agreeReduce === false).map((r) => `${r.page}/${r.id}: motion.mjs ${r.motionMjs.normal}/${r.motionMjs.reduce} vs Part A ${r.partA.normal}/${r.partA.reduce}`),
      wrongVerdicts: S.filter((r) => r.motionMjs.pass !== (r.truth.length === 0)).map((r) => `${r.page}/${r.id}: truth [${r.truth}] got [${r.motionMjs.cats}] ${r.motionMjs.problems.join('; ')}`),
    });
  }
  await close();
  await writeFile(path.join(labRoot, 'captures/c-heldout.json'), JSON.stringify(out, null, 1));
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) { const r = await runHeldout(); for (const k of ['unguarded', 'guarded']) { const { rows, ...rest } = r[k]; console.log(k, JSON.stringify(rest, null, 1)); } }
