// Held-out check of motion.mjs: the Part A pages (built for a different purpose, never used to tune the checker),
// with a spec of their seven interactions. motion.mjs's verdicts are compared with the Part A runner's own,
// independent sampler (captures/a-results.json, "normal" and "reduce-default" = out of the box, no guard).
//   node c/run-heldout.mjs   → captures/c-heldout.json
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
const scripts = path.resolve(labRoot, '../../../../skills/website-redesign/scripts');
const PAGES = ['css', 'motion', 'motion-react', 'gsap', 'anime', 'spring'];
const run = (args) => new Promise((res) => { const c = spawn(process.execPath, ['motion.mjs', ...args], { cwd: scripts, stdio: ['ignore', 'pipe', 'pipe'] }); let o = ''; c.stdout.on('data', (d) => { o += d; }); c.stderr.on('data', (d) => { o += d; }); c.on('close', (code) => res({ code, o })); });
const normOf = (s) => (s === 'animates' ? 'animates' : 'static');
const aNorm = (s) => (s === 'moves' || s === 'fades' ? 'animates' : 'static');
const redOf = (o) => (/still moves/.test(o) ? 'moves' : /substituted/.test(o) ? 'fades' : 'instant');
export async function runHeldout() {
  const A = JSON.parse(await readFile(path.join(labRoot, 'captures/a-results.json'), 'utf8'));
  const { base, close } = await serve();
  const rows = []; let n = 0, okN = 0, okR = 0, nR = 0;
  for (const p of PAGES) {
    const out = path.join(labRoot, 'captures/c', `heldout-${p}`);
    await run([`${base}/captures/a/${p}.html`, '--spec', path.join(labRoot, 'a/spec.json'), '--out', out, '--filmstrip', 'none', '--no-audit']);
    const rep = JSON.parse(await readFile(path.join(out, 'motion.json'), 'utf8'));
    for (const x of rep.spec) {
      const ref = A.single?.[p]?.[x.id]; if (!ref) continue;
      const mn = normOf(x.normal?.state), an = aNorm(ref.normal.state);
      const mr = x.reduced ? redOf(x.reduced.outcome) : null, ar = ref['reduce-default'].state === 'moves' ? 'moves' : ref['reduce-default'].state === 'fades' ? 'fades' : 'instant';
      n++; if (mn === an) okN++; if (mr) { nR++; if (mr === ar) okR++; }
      rows.push({ page: p, id: x.id, motionMjs: { normal: x.normal?.state, reduce: x.reduced?.outcome, problems: x.problems }, partA: { normal: ref.normal.state, reduce: ref['reduce-default'].state }, agreeNormal: mn === an, agreeReduce: mr === ar });
    }
    process.stderr.write(`heldout ${p}\n`);
  }
  await close();
  const res = { agreementNormal: `${okN}/${n}`, agreementReduce: `${okR}/${nR}`, disagreements: rows.filter((r) => !r.agreeNormal || !r.agreeReduce), rows };
  await writeFile(path.join(labRoot, 'captures/c-heldout.json'), JSON.stringify(res, null, 1));
  return res;
}
if (import.meta.url === `file://${process.argv[1]}`) { const r = await runHeldout(); console.log(JSON.stringify({ n: r.agreementNormal, r: r.agreementReduce, dis: r.disagreements.map((d) => `${d.page}/${d.id}: mjs ${d.motionMjs.normal}/${d.motionMjs.reduce} vs A ${d.partA.normal}/${d.partA.reduce}`) }, null, 1)); }
