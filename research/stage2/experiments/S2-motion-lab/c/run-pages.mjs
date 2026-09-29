// motion.mjs on pages it was not developed on (c/pages.json): 'dev' = the five pages a reviewer ran (their false
// positives drove fixes, so they are development pages now) and 'heldout' = pages frozen before those fixes and
// never used to tune it. Flags are scored with hand labels (c/labels.json: tp / fp / debatable, each with the
// reason read from the page source); held-out spec rows with c/truth-pages.json (written from Bootstrap's SCSS
// before the first run). --before also runs the pre-review motion.mjs (git show of the stage-2 snapshot) on the
// dev pages, for a before/after count.
// --frozen also runs the version frozen before the first held-out run (c/versions/motion-508abfa4.mjs) on the
// held-out pages: the held-out numbers proper; the current version's held-out numbers come after fixes made from them.
//   node c/fetch-ext.mjs && node c/run-pages.mjs [--before] [--frozen] [--set dev|heldout] [--rescore]
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { fetchExt } from './fetch-ext.mjs';
import { catOf } from './cats.mjs';
import { parseArgs } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
const repo = path.resolve(labRoot, '../../../..');
const scripts = path.join(repo, 'skills/website-redesign/scripts');
const BEFORE_COMMIT = '7ac7c9a'; // stage-2 snapshot holding the motion.mjs the reviewer ran
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12);
const run = (script, args) => new Promise((res) => { const t0 = Date.now(); const c = spawn(process.execPath, [script, ...args], { cwd: scripts, stdio: ['ignore', 'pipe', 'pipe'] }); let o = ''; c.stdout.on('data', (d) => { o += d; }); c.stderr.on('data', (d) => { o += d; }); c.on('close', (code) => res({ code, o, ms: Date.now() - t0 })); });
const fileOf = (p) => (p.startsWith('ext/') ? path.join(labRoot, 'captures', p) : path.join(repo, p));
const urlOf = (base, p) => `${base}/${path.relative(repo, fileOf(p)).split(path.sep).join('/')}`;

// The version frozen before the held-out pages were first run (sha256 508abfa4…), kept verbatim in c/versions/;
// a runnable copy (import path rewritten) goes to captures/.
async function frozenScript() {
  const file = path.join(labRoot, 'captures/before/motion-508abfa4.mjs');
  const src = await readFile(path.join(labRoot, 'c/versions/motion-508abfa4.mjs'), 'utf8');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, src.replace("from './lib/env.mjs'", `from '${path.join(scripts, 'lib/env.mjs')}'`));
  return file;
}
async function beforeScript() {
  const file = path.join(labRoot, 'captures/before/motion-v1.mjs');
  if (!existsSync(file)) {
    const src = execFileSync('git', ['-C', repo, 'show', `${BEFORE_COMMIT}:skills/website-redesign/scripts/motion.mjs`]).toString();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, src.replace("from './lib/env.mjs'", `from '${path.join(scripts, 'lib/env.mjs')}'`));
  }
  return file;
}

function scoreFlags(pages, labels) {
  const all = []; const byKind = {};
  for (const [name, p] of Object.entries(pages)) for (const f of p.flags) {
    const l = labels[name]?.[`${f.kind}|${f.sel}`]?.label || 'unlabelled';
    all.push({ page: name, kind: f.kind, sel: f.sel, label: l });
    byKind[f.kind] ??= { tp: 0, fp: 0, debatable: 0, unlabelled: 0 }; byKind[f.kind][l]++;
  }
  const n = (l) => all.filter((x) => x.label === l).length;
  return { flags: all.length, tp: n('tp'), fp: n('fp'), debatable: n('debatable'), unlabelled: n('unlabelled'),
    precision: +(n('tp') / (n('tp') + n('fp')) || 0).toFixed(3), precisionDebatableAsFp: +(n('tp') / (n('tp') + n('fp') + n('debatable')) || 0).toFixed(3),
    byKind, fpList: all.filter((x) => x.label === 'fp').map((x) => `${x.page}: ${x.kind} ${x.sel}`), unlabelledList: all.filter((x) => x.label === 'unlabelled').map((x) => `${x.page}: ${x.kind}|${x.sel}`) };
}

export async function runPages({ rescore = false, sets = ['dev', 'heldout'], before = false, frozen = false } = {}) {
  const def = JSON.parse(await readFile(path.join(labRoot, 'c/pages.json'), 'utf8'));
  const labels = existsSync(path.join(labRoot, 'c/labels.json')) ? JSON.parse(await readFile(path.join(labRoot, 'c/labels.json'), 'utf8')) : {};
  const truth = JSON.parse(await readFile(path.join(labRoot, 'c/truth-pages.json'), 'utf8')).spec;
  if (!rescore) await fetchExt();
  const { base, close } = rescore ? { base: '', close: async () => {} } : await serve(repo);
  const res = { motionMjs: sha(path.join(scripts, 'motion.mjs')) };
  const variants = [['current', path.join(scripts, 'motion.mjs')], ...(before ? [['before', await beforeScript()]] : []), ...(frozen ? [['frozen', await frozenScript()]] : [])];
  for (const set of sets) {
    for (const [ver, script] of variants) {
      if (ver === 'before' && set !== 'dev') continue; // the pre-review version: dev pages only
      if (ver === 'frozen' && set !== 'heldout') continue; // the version frozen before the held-out run: held-out only
      const pages = {};
      for (const pg of def[set]) {
        const out = path.join(labRoot, 'captures/pages', ver, pg.name);
        const args = [urlOf(base, pg.path), '--out', out, '--jpeg', ...(pg.spec ? ['--spec', path.join(labRoot, pg.spec)] : ['--filmstrip', 'none'])];
        const r = rescore ? { code: null, ms: NaN } : await run(script, args);
        let rep; try { rep = JSON.parse(await readFile(path.join(out, 'motion.json'), 'utf8')); } catch { pages[pg.name] = { error: r.o?.slice(-400), flags: [] }; continue; }
        pages[pg.name] = { file: sha(fileOf(pg.path)), exit: r.code, seconds: Math.round(r.ms / 1000), flags: rep.flags.map((f) => ({ kind: f.kind, sel: f.sel, level: f.level, detail: f.detail.slice(0, 160) })),
          spec: rep.spec.map((x) => ({ id: x.id, pass: x.pass, cats: [...new Set(x.problems.map(catOf))], problems: x.problems, reduced: x.reduced?.outcome, normal: x.normal?.state, filmstripFit: x.filmstripFit })) };
        process.stderr.write(`pages ${set}/${ver} ${pg.name}: ${rep.flags.length} flags${rep.spec.length ? `, spec ${rep.spec.filter((x) => x.pass).length}/${rep.spec.length}` : ''}\n`);
      }
      const key = `${set}${ver === 'before' ? 'Before' : ver === 'frozen' ? 'Frozen' : ''}`;
      res[key] = { flagScore: scoreFlags(pages, labels), pages };
      // spec rows (held-out Bootstrap pages): verdicts and categories against the truth written from the SCSS
      const rows = Object.entries(pages).flatMap(([name, p]) => (p.spec || []).filter(() => truth[name]).map((x) => ({ name, ...x, truth: truth[name][x.id] || [] })));
      if (rows.length) {
        const tp = rows.flatMap((r) => r.cats.filter((c) => r.truth.includes(c)).map((c) => `${r.name}|${r.id}|${c}`));
        const fp = rows.flatMap((r) => r.cats.filter((c) => !r.truth.includes(c)).map((c) => `${r.name}|${r.id}|${c}`));
        const fn = rows.flatMap((r) => r.truth.filter((c) => !r.cats.includes(c)).map((c) => `${r.name}|${r.id}|${c}`));
        res[key].specScore = { rows: rows.length, verdicts: `${rows.filter((r) => r.pass === (r.truth.length === 0)).length}/${rows.length}`, tp: tp.length, fp, fn,
          precision: +(tp.length / (tp.length + fp.length) || 0).toFixed(3), recall: +(tp.length / (tp.length + fn.length) || 0).toFixed(3),
          detail: rows.map((r) => `${r.name}/${r.id}: truth [${r.truth}] got [${r.cats}] ${r.problems.join('; ').slice(0, 300)}`) };
      }
    }
  }
  await close();
  await writeFile(path.join(labRoot, 'captures/pages-results.json'), JSON.stringify(res, null, 1));
  return res;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  const r = await runPages({ rescore: !!args.rescore, before: !!args.before, frozen: !!args.frozen, sets: args.set ? String(args.set).split(',') : undefined });
  for (const [k, v] of Object.entries(r)) if (v.flagScore) { const { byKind, ...s } = v.flagScore; console.log(k, JSON.stringify(s, null, 1), v.specScore ? JSON.stringify(v.specScore, null, 1) : ''); }
}
