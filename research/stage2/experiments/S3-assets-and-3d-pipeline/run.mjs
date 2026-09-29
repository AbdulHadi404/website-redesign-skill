#!/usr/bin/env node
// S3 — assets and 3D pipeline. One command rebuilds and re-measures everything and writes results.json.
//
//   npm install && node run.mjs            # ≈ 1.5–2 h on 4 shared CPUs (KTX2/AVIF encoding and SwiftShader dominate)
//   node run.mjs --runs 1                  # quick look
//   node run.mjs --skip sprites,blender    # run the other parts only
//
// Parts, in order (each can also be run on its own):
//   fetch-assets.mjs   third-party inputs into a cache outside the repo (pinned commits + SHA-256)
//   licences.mjs       primary licence sources re-read and checksummed; Khronos sample-asset licence census
//   run-sprites.mjs    sprite pipeline: files vs CSS grid vs packed atlas; formats; Canvas 2D vs PixiJS; 9-slice,
//                      parallax, tile map; skeletal (Spine) vs frames; 2D animation runtime payloads
//   run-gltf.mjs       glTF pipeline on 4 Khronos models: gltf-transform variants, three.js load/decode/frame, diffs
//   run-turntable.mjs  a 36-frame pre-rendered turntable vs a live three.js viewer of the same product
//   run-blender.mjs    headless Blender export settings (instancing, baked AO, baked lighting, LOD, Draco, camera)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const runs = arg('runs', '5');
const skip = new Set((arg('skip', '') || '').split(',').filter(Boolean));
const steps = [
  ['fetch', ['fetch-assets.mjs']],
  ['licences', ['licences.mjs']],
  ['sprites', ['run-sprites.mjs', '--runs', runs]],
  ['gltf', ['run-gltf.mjs', '--runs', runs]],
  ['turntable', ['run-turntable.mjs']],
  ['blender', ['run-blender.mjs']],
];
for (const [name, args] of steps) {
  if (skip.has(name)) continue;
  const t0 = Date.now();
  console.error(`\n▶ ${name}`);
  execFileSync(process.execPath, args, { cwd: here, stdio: 'inherit' });
  console.error(`✓ ${name} ${Math.round((Date.now() - t0) / 1000)} s`);
}
