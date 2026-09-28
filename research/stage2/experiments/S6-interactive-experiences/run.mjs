#!/usr/bin/env node
/**
 * run.mjs — rebuild and re-measure everything in S6, one browser at a time,
 * and merge the parts into results.json.
 *
 *   npm install
 *   sh fetch-sources.sh            # open-source games read by run-sources.mjs (outside the repo)
 *   node run.mjs [--quick] [--skip toy,audio,sources]
 *
 * Parts (each also runs on its own):
 *   run-toy.mjs      the accessible-canvas toy: six variants, keyboard/pointer/touch
 *                    walkthroughs, accessibility tree, axe, the skill's a11y.mjs,
 *                    lib/probe-canvas.mjs, stand-in alignment, proxy frame cost (5 runs)
 *   run-audio.mjs    UI-sound payloads (esbuild), MDN browser-compat rows, Chromium's
 *                    gesture gating of AudioContext and navigator.vibrate
 *   run-sources.mjs  static facts from open-source games; A Dark Room played under a fake clock
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = (process.argv.includes('--skip') ? process.argv[process.argv.indexOf('--skip') + 1] : '').split(',');
const quick = process.argv.includes('--quick');
const parts = [
  ['toy', 'run-toy.mjs', quick ? ['--quick'] : []],
  ['audio', 'run-audio.mjs', []],
  ['sources', 'run-sources.mjs', quick ? ['--minutes', '10'] : ['--minutes', '40']],
];
const status = {};
for (const [name, file, args] of parts) {
  if (skip.includes(name)) { status[name] = 'skipped (previous results kept)'; continue; }
  const t0 = Date.now();
  console.error(`=== ${name}: node ${file} ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [path.join(here, file), ...args], { cwd: here, stdio: ['ignore', 'inherit', 'inherit'] });
  status[name] = { exit: r.status, seconds: Math.round((Date.now() - t0) / 1000) };
}
const read = async (f) => { try { return JSON.parse(await readFile(path.join(here, 'results', f), 'utf8')); } catch { return null; } };
const results = { generated: new Date().toISOString(), runner: 'node run.mjs', status, toy: await read('toy.json'), audio: await read('audio.json'), sources: await read('sources.json') };
await writeFile(path.join(here, 'results.json'), JSON.stringify(results, null, 2));
console.log(`results.json written (${Object.entries(status).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : `exit ${v.exit}, ${v.seconds}s`}`).join('; ')})`);
