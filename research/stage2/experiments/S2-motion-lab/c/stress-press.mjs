// Load sensitivity of motion.mjs: the GSAP fixture's 100 ms press (JavaScript-driven, no Animation object) checked
// N times on a copy of the page whose main thread is busy most of the time (a timer blocks it for --block ms every
// --every ms, so frames arrive ~every 60 ms, as on a starved machine), with the current motion.mjs and the
// pre-review one. A reviewer's run on a loaded machine read this press as "static: changed in one frame"; the fix
// is the between-value rule plus a re-run when frames were dropped across the change. The busy page loads only its
// own renderer, not the other processes sharing the machine.
//   node c/stress-press.mjs [--runs 5] [--block 45] [--every 60]   → captures/stress-press-<block>-<every>.json
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { buildC } from './build-c.mjs';
import { parseArgs } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
const scripts = path.resolve(labRoot, '../../../../skills/website-redesign/scripts');
const run = (script, args) => new Promise((res) => { const c = spawn(process.execPath, [script, ...args], { cwd: scripts, stdio: ['ignore', 'pipe', 'pipe'] }); let o = ''; c.stdout.on('data', (d) => { o += d; }); c.stderr.on('data', (d) => { o += d; }); c.on('close', (code) => res({ code, o })); });
export async function stressPress({ runs = 5, block = 45, every = 60 } = {}) {
  await buildC();
  const html = await readFile(path.join(labRoot, 'captures/c/gsap.html'), 'utf8');
  await writeFile(path.join(labRoot, 'captures/c/gsap-busy.html'), html.replace('<head>', `<head><script>setInterval(() => { const t = performance.now(); while (performance.now() - t < ${block}); }, ${every});</script>`));
  const all = JSON.parse(await readFile(path.join(labRoot, 'c/specs/motion.json'), 'utf8'));
  const specFile = path.join(labRoot, 'captures/stress/press-spec.json');
  await mkdir(path.dirname(specFile), { recursive: true });
  await writeFile(specFile, JSON.stringify({ tokens: all.tokens, motion: [all.motion.find((x) => x.id === 'cta-press')] }));
  const before = path.join(labRoot, 'captures/before/motion-v1.mjs'); // written by c/run-pages.mjs (git show of the reviewed version)
  const { base, close } = await serve();
  const out = { block, every, runs, load: os.loadavg().map((x) => +x.toFixed(1)), current: [], before: [] };
  try {
    for (let i = 0; i < runs; i++) for (const [k, script] of [['current', path.join(scripts, 'motion.mjs')], ['before', before]]) {
      const dir = path.join(labRoot, 'captures/stress', `${k}-${i}`);
      await run(script, [`${base}/captures/c/gsap-busy.html`, '--spec', specFile, '--out', dir, '--filmstrip', 'none', '--no-audit']);
      const rep = JSON.parse(await readFile(path.join(dir, 'motion.json'), 'utf8')); const x = rep.spec[0];
      out[k].push({ pass: x.pass, state: x.normal?.state, retries: x.normal?.retries ?? null, problems: x.problems });
      process.stderr.write(`stress ${k} ${i}: ${x.pass ? 'pass' : x.problems[0]}\n`);
    }
  } finally { await close(); }
  out.loadAfter = os.loadavg().map((x) => +x.toFixed(1));
  out.summary = Object.fromEntries(['current', 'before'].map((k) => [k, `${out[k].filter((x) => x.state === 'animates').length}/${runs} read as animating`]));
  await writeFile(path.join(labRoot, `captures/stress-press-${block}-${every}.json`), JSON.stringify(out, null, 1));
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) { const a = parseArgs(); const r = await stressPress({ runs: +(a.runs || 5), block: +(a.block || 45), every: +(a.every || 60) }); console.log(JSON.stringify(r.summary)); }
