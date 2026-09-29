#!/usr/bin/env node
// Does the skill's model.mjs count what three.js actually draws and allocates, on models it was NOT built on?
// For each model: model.mjs's static numbers (triangles drawn, draw calls, texture GPU bytes) against three.js r186 in
// headless Chromium: renderer.info after one frame, and the texStorage2D/texImage2D allocations three.js made for
// the materials' textures (gltf/viewer.js wraps the WebGL2 context). Counts are deterministic: one load each.
// Inputs: 15 Khronos sample models fetched by fetch-assets.mjs (CACHE/extra: the reviewer's check set, three of which
// exposed the double-sided BLEND, double-sided glass and spec/gloss rules), 22 held-out Khronos models chosen after
// those fixes (CACHE/heldout), plus every file run-modelcheck.mjs
// produced with model.mjs's own printed pipeline (BUILD/modelcheck/*/*.opt.glb). Writes results.json → "modelscript".
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { serve, BUILD, CACHE, LAB } from './lib/serve.mjs';
import { mergeResults, launchLab, SKILL_SCRIPTS } from './lib/common.mjs';

const EXTRA = [
  'AlphaBlendModeTest/AlphaBlendModeTest.glb', 'GlassHurricaneCandleHolder/GlassHurricaneCandleHolder.glb', 'MorphStressTest/MorphStressTest.glb',
  'SimpleInstancing/SimpleInstancing.glb', 'SpecGlossVsMetalRough/SpecGlossVsMetalRough.glb', 'ToyCar/ToyCar.glb',
  'TransmissionRoughnessTest/TransmissionRoughnessTest.glb', 'TransmissionTest/TransmissionTest.glb', 'MeshPrimitiveModes/MeshPrimitiveModes.gltf',
  'SimpleSparseAccessor/SimpleSparseAccessor.gltf', 'SciFiHelmet/SciFiHelmet.gltf', 'BrainStem/BrainStem.glb', 'BrainStem-meshopt/BrainStem.gltf',
  'CesiumMan/CesiumMan.glb', 'ABeautifulGame-KTX2-Draco/ABeautifulGame.glb',
].map((f) => ({ label: f.split('/')[0], file: path.join(CACHE, 'extra', f), url: `/cache/extra/${f}`, set: 'Khronos, not used to build model.mjs' }));
const HELDOUT = ['DragonAttenuation', 'MosquitoInAmber', 'IridescenceLamp', 'SheenChair', 'ClearCoatCarPaint', 'UnlitTest', 'TextureTransformMultiTest',
  'CompareAlphaCoverage', 'DiffuseTransmissionTeacup', 'EmissiveStrengthTest', 'GlassBrokenWindow', 'GlassVaseFlowers', 'AttenuationTest',
  'TransmissionOrderTest', 'SunglassesKhronos', 'DispersionTest', 'NegativeScaleTest', 'MultiUVTest', 'IridescentDishWithOlives',
  'CommercialRefrigerator', 'Corset', 'BoomBox'].map((m) => ({ label: m, file: path.join(CACHE, 'heldout', m, `${m}.glb`), url: `/cache/heldout/${m}/${m}.glb`, set: 'held out: chosen after the rules were fixed' }));
const OUTPUTS = [];
const mc = path.join(BUILD, 'modelcheck');
if (existsSync(mc)) for (const d of await readdir(mc)) for (const f of await readdir(path.join(mc, d))) if (f.endsWith('.opt.glb')) OUTPUTS.push({ label: `${d} → pipeline output`, file: path.join(mc, d, f), url: `/build/modelcheck/${d}/${f}`, set: 'model.mjs pipeline outputs (run-modelcheck)' });

{ // always rebuild the viewer bundle (it carries the allocation instrumentation)
  await build({ entryPoints: [path.join(LAB, 'gltf/viewer.js')], bundle: true, format: 'esm', minify: true, outfile: path.join(BUILD, 'gltf-viewer.js'), logLevel: 'silent' });
  await writeFile(path.join(BUILD, 'gltf-viewer.html'), `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#e8e6e1}canvas{display:block}</style><script type=module src="/build/gltf-viewer.js"></script>`);
}
const srv = await serve();
const { browser, version } = await launchLab();
const out = { env: { chromium: version }, models: {} };
let match = 0, total = 0;
for (const m of [...EXTRA, ...HELDOUT, ...OUTPUTS]) {
  if (!existsSync(m.file)) { out.models[m.label] = { error: 'not fetched' }; continue; }
  const j = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), m.file, '--json'], { maxBuffer: 64 << 20 }).toString());
  const needs = [j.compression.includes('KHR_draco_mesh_compression') && 'draco', (j.compression.includes('EXT_meshopt_compression') || j.compression.includes('KHR_meshopt_compression')) && 'meshopt', j.compression.includes('KHR_texture_basisu') && 'ktx2'].filter(Boolean);
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  let r;
  try {
    await page.goto(`${srv.url}/build/gltf-viewer.html`);
    await page.waitForFunction(() => window.viewReady === true);
    r = await page.evaluate((p) => window.view(p), { url: m.url, needs, frames: 1 });
  } catch (e) { r = { error: String(e.message).slice(0, 200) }; } finally { await page.close(); }
  if (r.error) { out.models[m.label] = { set: m.set, error: r.error }; console.error(m.label, r.error); continue; }
  delete r.png;
  const row = {
    set: m.set, bytes: j.bytes, compression: j.compression, specGloss: j.specGloss, doubleSidedBlend: j.doubleSidedBlendPrimitives, transmissionBackfaceDraws: j.transmissionBackfaceDraws,
    triangles: [j.trianglesDrawn, r.info.triangles], drawCalls: [j.drawCalls, r.info.calls], textureGpuBytes: [j.textureGpuBytes, r.textureAllocBytes],
    glTextures: r.glTextures, imagesCounted: j.images.filter((i) => i.used).length, allocFormats: r.textureAllocFormats, msrtt: r.msrtt, bptc: r.bptc,
  };
  row.match = { triangles: row.triangles[0] === row.triangles[1], drawCalls: row.drawCalls[0] === row.drawCalls[1], textureGpuBytes: Math.abs(row.textureGpuBytes[0] - row.textureGpuBytes[1]) <= Math.max(1024, 0.01 * row.textureGpuBytes[1]) };
  row.allMatch = Object.values(row.match).every(Boolean);
  total++; if (row.allMatch) match++;
  out.models[m.label] = row;
  console.error(m.label.padEnd(44), row.allMatch ? 'match' : 'MISMATCH', JSON.stringify({ tris: row.triangles, calls: row.drawCalls, tex: row.textureGpuBytes }));
}
const bySet = {};
for (const r of Object.values(out.models)) if (r.set && !r.error) { const b = (bySet[r.set] ||= { models: 0, allThreeMatch: 0 }); b.models++; if (r.allMatch) b.allThreeMatch++; }
out.summary = { models: total, allThreeMatch: match, bySet };
await browser.close();
await srv.close();
await mergeResults('modelscript', out);
console.log(`modelscript: ${match}/${total} match`);
