#!/usr/bin/env node
// Does the skill's model.mjs give advice that works? For each fetched model: inspect it, run the single pipeline
// model.mjs prints (exactly as printed, through bash), inspect the result again, and record before → after.
// No browser. Needs fetch-assets.mjs first. Writes results.json → "modelcheck".
import { execFileSync } from 'node:child_process';
import { mkdir, cp, readFile } from 'node:fs/promises';
import zlib from 'node:zlib';
import path from 'node:path';
import { MODELS } from './gltf/pipeline.mjs';
import { CACHE, BUILD, LAB } from './lib/serve.mjs';
import { mergeResults, SKILL_SCRIPTS } from './lib/common.mjs';

const KTX = path.join(CACHE, 'tools/KTX-Software-4.4.2-Linux-x86_64');
const ENV = { ...process.env, PATH: `${KTX}/bin:${path.join(LAB, 'node_modules/.bin')}:${process.env.PATH}`, LD_LIBRARY_PATH: `${KTX}/lib:${process.env.LD_LIBRARY_PATH || ''}` };
const model = (file, args) => JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), file, '--json', ...args], { maxBuffer: 64 << 20 }).toString());
const brotli = async (f) => zlib.brotliCompressSync(await readFile(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }).length;
const pick = (j) => ({ bytes: j.bytes, geometryBytesStored: j.geometryBytesStored, textureBytes: j.textureBytes, trianglesDrawn: j.trianglesDrawn, drawCalls: j.drawCalls, textureGpuBytes: j.textureGpuBytes, maxTexture: j.maxTexture, compression: j.compression, over: j.flags.filter((f) => f.level === 'over').map((f) => f.what.split(' — ')[0]), ok: j.ok });
// Inputs the script was not tuned on (fetched by fetch-assets.mjs into CACHE/extra): an already KTX2 + Draco scene,
// and a spec/gloss model (three.js does not read spec/gloss; the pipeline must convert it first).
const SRC = { ...Object.fromEntries(Object.entries(MODELS).map(([k, v]) => [k, v.src])), 'ABeautifulGame-KTX2-Draco': 'extra/ABeautifulGame-KTX2-Draco/ABeautifulGame.glb', SpecGlossVsMetalRough: 'extra/SpecGlossVsMetalRough/SpecGlossVsMetalRough.glb' };
const CASES = [
  ['DamagedHelmet', []], ['FlightHelmet', []], ['FlightHelmet', ['--ktx2']], ['Fox', []], ['ABeautifulGame', ['--tier', 'scene']], ['ABeautifulGame', ['--tier', 'scene', '--interactive']],
  ['ABeautifulGame-KTX2-Draco', ['--tier', 'scene']], ['SpecGlossVsMetalRough', []],
];
const out = {};
for (const [name, args] of CASES) {
  const dir = path.join(BUILD, 'modelcheck', `${name}${args.join('').replace(/[^a-z0-9]+/gi, '_')}`);
  await mkdir(dir, { recursive: true });
  const srcDir = path.join(CACHE, path.dirname(SRC[name]));
  await cp(srcDir, dir, { recursive: true });
  const file = path.basename(SRC[name]);
  const before = model(path.join(dir, file), args);
  if (!before.pipeline) { out[`${name} ${args.join(' ')}`.trim()] = { pipeline: null, note: 'within budget: model.mjs prints no pipeline', before: pick(before) }; console.error(name, 'within budget'); continue; }
  const t0 = performance.now();
  let error = null;
  try { execFileSync('bash', ['-c', before.pipeline], { cwd: dir, env: ENV, stdio: 'ignore' }); } catch (e) { error = String(e.message).slice(0, 200); }
  const ms = Math.round(performance.now() - t0);
  const optFile = path.join(dir, file.replace(/\.(glb|gltf)$/i, '') + '.opt.glb');
  const after = error ? null : model(optFile, args);
  const rec = { pipeline: before.pipeline, before: { ...pick(before), brotli: file.endsWith('.glb') ? await brotli(path.join(dir, file)) : null }, after: after && { ...pick(after), brotli: await brotli(optFile) }, ms, error };
  // The other geometry codec, same pipeline otherwise: is the printed choice the smaller one?
  const alt = before.pipeline.includes('--compress draco') ? before.pipeline.replace('--compress draco', '--compress meshopt') : before.pipeline.replace('--compress meshopt', '--compress draco');
  const altFile = optFile.replace(/\.opt\.glb$/, '.alt.glb');
  try {
    execFileSync('bash', ['-c', alt.split(file.replace(/\.(glb|gltf)$/i, '') + '.opt.glb').join(path.basename(altFile))], { cwd: dir, env: ENV, stdio: 'ignore' });
    const a = model(altFile, args);
    rec.otherCodec = { pipeline: alt, ...pick(a), brotli: await brotli(altFile) };
  } catch (e) { rec.otherCodec = { pipeline: alt, error: String(e.message).slice(0, 200) }; }
  out[`${name} ${args.join(' ')}`.trim()] = rec;
  console.error(name, args.join(' '), JSON.stringify({ before: pick(before).bytes, after: after?.bytes, alt: rec.otherCodec?.bytes, ms, error }));
}
await mergeResults('modelcheck', out);
console.log('modelcheck: done');
