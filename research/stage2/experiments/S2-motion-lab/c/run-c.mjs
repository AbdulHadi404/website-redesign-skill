// Part C: run the skill's motion.mjs on four builds of one page and score it against truth.json.
//   node c/run-c.mjs   → captures/c/report-<variant>/, c/reports/<variant>.md, shots/c-*.jpg, captures/c-results.json
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { buildC, VARIANTS } from './build-c.mjs';
const scripts = path.resolve(labRoot, '../../../../skills/website-redesign/scripts');
const SPEC = { static: 'c/specs/DESIGN.md', good: 'c/specs/DESIGN.md', over: 'c/specs/motion.json', gsap: 'c/specs/motion.json' };
const SHOTS = { good: ['features-reveal', 'sheet-open'], static: ['sheet-open'], over: ['plan-hover', 'panel-swap'], gsap: ['features-reveal'] };
// order matters: a reduced-motion message may mention a "custom property"
const CATS = [['static', /^static/], ['reduced', /^reduced motion/], ['interrupt', /^interrupted/], ['duration', /^duration/], ['easing', /easing|curve fits/], ['props', /propert|layout/], ['stagger', /^stagger/]];
const catOf = (p) => (CATS.find(([, re]) => re.test(p)) || ['other'])[0];
const run = (args) => new Promise((res) => { const t0 = Date.now(); const c = spawn(process.execPath, ['motion.mjs', ...args], { cwd: scripts, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; }); c.on('close', (code) => res({ code, out, ms: Date.now() - t0 })); });
const score = (pred, truth) => { const P = new Set(pred), T = new Set(truth); const tp = [...P].filter((x) => T.has(x)); return { tp: tp.length, fp: [...P].filter((x) => !T.has(x)), fn: [...T].filter((x) => !P.has(x)) }; };
export async function runC({ rescore = false } = {}) { // rescore: score the reports already in captures/c without running the browser
  const truth = JSON.parse(await readFile(path.join(labRoot, 'c/truth.json'), 'utf8'));
  if (!rescore) await buildC();
  const { base, close } = rescore ? { base: '', close: async () => {} } : await serve();
  await mkdir(path.join(labRoot, 'c/reports'), { recursive: true }); await mkdir(path.join(labRoot, 'shots'), { recursive: true });
  const res = { pages: {}, totals: {} };
  const allSpec = { tp: 0, fp: [], fn: [] }, allFlag = { tp: 0, fp: [], fn: [] }; let entries = 0, verdictOk = 0;
  for (const v of VARIANTS) {
    const out = path.join(labRoot, 'captures/c', `report-${v}`);
    const r = rescore ? { code: null, ms: NaN } : await run([`${base}/captures/c/${v}.html`, '--spec', path.join(labRoot, SPEC[v]), '--out', out, '--jpeg']);
    const rep = JSON.parse(await readFile(path.join(out, 'motion.json'), 'utf8'));
    await copyFile(path.join(out, 'motion.md'), path.join(labRoot, 'c/reports', `${v}.md`));
    for (const id of SHOTS[v] || []) await copyFile(path.join(out, `filmstrip-${id}.jpg`), path.join(labRoot, 'shots', `c-${v}-${id}.jpg`)).catch(() => {});
    const predSpec = rep.spec.flatMap((x) => [...new Set(x.problems.map(catOf))].map((c) => `${x.id}|${c}`));
    const truthSpec = Object.entries(truth.spec[v]).flatMap(([id, cs]) => cs.map((c) => `${id}|${c}`));
    const s = score(predSpec, truthSpec);
    for (const x of rep.spec) { entries++; if (x.pass === (truth.spec[v][x.id].length === 0)) verdictOk++; }
    const predFlags = rep.flags.map((f) => `${f.kind}|${f.sel}`);
    const f = score(predFlags, truth.flags[v]);
    allSpec.tp += s.tp; allSpec.fp.push(...s.fp.map((x) => `${v}:${x}`)); allSpec.fn.push(...s.fn.map((x) => `${v}:${x}`));
    allFlag.tp += f.tp; allFlag.fp.push(...f.fp.map((x) => `${v}:${x}`)); allFlag.fn.push(...f.fn.map((x) => `${v}:${x}`));
    res.pages[v] = { exit: r.code, seconds: Math.round(r.ms / 1000), specPass: `${rep.spec.filter((x) => x.pass).length}/${rep.spec.length}`,
      spec: { tp: s.tp, fp: s.fp, fn: s.fn }, flags: { predicted: predFlags.length, truth: truth.flags[v].length, tp: f.tp, fp: f.fp, fn: f.fn },
      problems: Object.fromEntries(rep.spec.map((x) => [x.id, x.problems])), reduced: Object.fromEntries(rep.spec.map((x) => [x.id, x.reduced?.outcome])) };
    process.stderr.write(`C ${v}: spec ${res.pages[v].specPass}, flags ${predFlags.length}, ${res.pages[v].seconds}s\n`);
  }
  await close();
  const pr = (x) => ({ precision: +(x.tp / (x.tp + x.fp.length) || 0).toFixed(3), recall: +(x.tp / (x.tp + x.fn.length) || 0).toFixed(3), tp: x.tp, fp: x.fp, fn: x.fn });
  res.totals = { specFindings: pr(allSpec), flags: pr(allFlag), entryVerdicts: `${verdictOk}/${entries}` };
  // held-out: the Part A pages, compared with the Part A runner's own sampler (needs captures/a-results.json)
  try { const { runHeldout } = await import('./run-heldout.mjs'); const h = rescore ? JSON.parse(await readFile(path.join(labRoot, 'captures/c-heldout.json'), 'utf8')) : await runHeldout(); res.heldout = { agreementNormal: h.agreementNormal, agreementReduce: h.agreementReduce, disagreements: h.disagreements }; } catch (e) { res.heldout = { error: e.message }; }
  await writeFile(path.join(labRoot, 'captures/c-results.json'), JSON.stringify(res, null, 1));
  return res;
}
if (import.meta.url === `file://${process.argv[1]}`) { const r = await runC(); console.log(JSON.stringify(r.totals, null, 1)); }
