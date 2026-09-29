#!/usr/bin/env node
// Fetch the third-party inputs this lab measures. Nothing fetched here is committed: it goes to a cache outside
// the repository (S3_CACHE, default /tmp/s2-S3/cache). Every file is pinned to a commit and a SHA-256.
//
//   node fetch-assets.mjs            # fetch what is missing, verify every checksum
//   node fetch-assets.mjs --print    # print the checksums of what is in the cache (to re-pin after an upstream change)
//
// Licences (checked 2026-09-29 from each asset's metadata.json / the repository's LICENSE):
//   Khronos glTF-Sample-Assets: per model, see LICENCES below. DamagedHelmet carries CC-BY-NC-4.0 for its earlier
//   version, so it is a lab fixture only, never shippable. Spine example art (spineboy): Esoteric Software, no
//   licence stated for the art; lab use only. rive-wasm example .riv files: repository MIT. KTX-Software: Apache-2.0.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const CACHE = process.env.S3_CACHE || '/tmp/s2-S3/cache';
const KHR = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/f36bfdabd1031c3cf6689a50570b8cdf3678b49c/Models';
const SPINE = 'https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/7ce5d0daac13268fa3ed68eb174c2822ef2692c9/examples/spineboy/export';
const RIVE = 'https://raw.githubusercontent.com/rive-app/rive-wasm/eafb1efd0b57eee0c580052989fccef15cf883fa/js/examples/_frameworks/parcel_example_canvas';

const FH = ['FlightHelmet.gltf', 'FlightHelmet.bin', ...['GlassPlasticMat', 'LeatherPartsMat', 'LensesMat', 'MetalPartsMat', 'RubberWoodMat']
  .flatMap((m) => ['BaseColor', 'Normal', 'OcclusionRoughMetal'].map((k) => `FlightHelmet_Materials_${m}_${k}.png`))];

// [local path, url, sha256]  (sha256 null = not yet pinned; --print fills it in)
export const FILES = [
  ['khronos/DamagedHelmet/DamagedHelmet.glb', `${KHR}/DamagedHelmet/glTF-Binary/DamagedHelmet.glb`],
  ['khronos/DamagedHelmet/metadata.json', `${KHR}/DamagedHelmet/metadata.json`],
  ['khronos/Fox/Fox.glb', `${KHR}/Fox/glTF-Binary/Fox.glb`],
  ['khronos/Fox/metadata.json', `${KHR}/Fox/metadata.json`],
  ['khronos/ABeautifulGame/ABeautifulGame.glb', `${KHR}/ABeautifulGame/glTF-Binary/ABeautifulGame.glb`],
  ['khronos/ABeautifulGame/metadata.json', `${KHR}/ABeautifulGame/metadata.json`],
  ['khronos/FlightHelmet/metadata.json', `${KHR}/FlightHelmet/metadata.json`],
  ...FH.map((f) => [`khronos/FlightHelmet/${f}`, `${KHR}/FlightHelmet/glTF/${f}`]),
  ['spine/spineboy-pro.skel', `${SPINE}/spineboy-pro.skel`],
  ['spine/spineboy-pro.json', `${SPINE}/spineboy-pro.json`],
  ['spine/spineboy-pma.atlas', `${SPINE}/spineboy-pma.atlas`],
  ['spine/spineboy-pma.png', `${SPINE}/spineboy-pma.png`],
  ['rive/truck.riv', `${RIVE}/truck.riv`],
  ['rive/birb.riv', `${RIVE}/birb.riv`],
  // Models model.mjs was NOT built on, to check its counts against three.js (run-modelscript.mjs). Lab use only.
  ...['AlphaBlendModeTest', 'GlassHurricaneCandleHolder', 'MorphStressTest', 'SimpleInstancing', 'SpecGlossVsMetalRough', 'ToyCar',
    'TransmissionRoughnessTest', 'TransmissionTest', 'BrainStem', 'CesiumMan'].map((m) => [`extra/${m}/${m}.glb`, `${KHR}/${m}/glTF-Binary/${m}.glb`]),
  ...['MeshPrimitiveModes', 'SimpleSparseAccessor'].map((m) => [`extra/${m}/${m}.gltf`, `${KHR}/${m}/glTF-Embedded/${m}.gltf`]),
  ...['SciFiHelmet.gltf', 'SciFiHelmet.bin', 'SciFiHelmet_AmbientOcclusion.png', 'SciFiHelmet_BaseColor.png', 'SciFiHelmet_MetallicRoughness.png', 'SciFiHelmet_Normal.png'].map((f) => [`extra/SciFiHelmet/${f}`, `${KHR}/SciFiHelmet/glTF/${f}`]),
  // Held out: 22 more Khronos models chosen after model.mjs's counting rules were fixed (transmission, volume,
  // iridescence, sheen, clearcoat, unlit, dispersion, diffuse transmission, texture transforms, negative scale…).
  ...['DragonAttenuation', 'MosquitoInAmber', 'IridescenceLamp', 'SheenChair', 'ClearCoatCarPaint', 'UnlitTest', 'TextureTransformMultiTest',
    'CompareAlphaCoverage', 'DiffuseTransmissionTeacup', 'EmissiveStrengthTest', 'GlassBrokenWindow', 'GlassVaseFlowers', 'AttenuationTest',
    'TransmissionOrderTest', 'SunglassesKhronos', 'DispersionTest', 'NegativeScaleTest', 'MultiUVTest', 'IridescentDishWithOlives',
    'CommercialRefrigerator', 'Corset', 'BoomBox'].map((m) => [`heldout/${m}/${m}.glb`, `${KHR}/${m}/glTF-Binary/${m}.glb`]),
  ['extra/BrainStem-meshopt/BrainStem.gltf', `${KHR}/BrainStem/glTF-Meshopt/BrainStem.gltf`],
  ['extra/BrainStem-meshopt/BrainStem.bin', `${KHR}/BrainStem/glTF-Meshopt/BrainStem.bin`],
  ['extra/ABeautifulGame-KTX2-Draco/ABeautifulGame.glb', `${KHR}/ABeautifulGame/glTF-Binary-KTX-ETC1S-Draco/ABeautifulGame.glb`],
  ['tools/KTX-Software-4.4.2-Linux-x86_64.tar.bz2', 'https://github.com/KhronosGroup/KTX-Software/releases/download/v4.4.2/KTX-Software-4.4.2-Linux-x86_64.tar.bz2', 'a8781bad05f9624edbf910b7f258cd0a4ba7d3e63b49ecc0a0ab440bf6a0a245'],
];

let PINS = {};
const pinFile = new URL('./fetch-pins.json', import.meta.url);
try { PINS = JSON.parse(await readFile(pinFile, 'utf8')); } catch { /* first run */ }

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

async function fetchOne([rel, url, pinned]) {
  const out = path.join(CACHE, rel);
  const want = pinned || PINS[rel];
  if (existsSync(out)) {
    const got = sha(await readFile(out));
    if (!want || got === want) return { rel, sha256: got, cached: true };
    console.error(`checksum changed for ${rel}; refetching`);
  }
  await mkdir(path.dirname(out), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha(buf);
  if (want && got !== want) throw new Error(`checksum mismatch for ${rel}: ${got} != ${want}`);
  await writeFile(out, buf);
  return { rel, sha256: got, cached: false, bytes: buf.length };
}

export async function fetchAll({ print = false } = {}) {
  const results = [];
  for (let i = 0; i < FILES.length; i += 6) results.push(...await Promise.all(FILES.slice(i, i + 6).map(fetchOne)));
  // Unpack KTX-Software (toktx/ktx for gltf-transform's etc1s/uastc commands).
  const ktxDir = path.join(CACHE, 'tools/KTX-Software-4.4.2-Linux-x86_64');
  if (!existsSync(path.join(ktxDir, 'bin/ktx')) && process.platform === 'linux') {
    execFileSync('tar', ['-xjf', path.join(CACHE, 'tools/KTX-Software-4.4.2-Linux-x86_64.tar.bz2'), '-C', path.join(CACHE, 'tools')]);
  }
  const pins = Object.fromEntries(results.map((r) => [r.rel, r.sha256]));
  const unpinned = results.filter((r) => !PINS[r.rel] && !FILES.find((x) => x[0] === r.rel)?.[2]);
  if (unpinned.length && !print) {
    // First fetch of a newly listed file: pin it (existing pins are never rewritten without --print).
    for (const r of unpinned) PINS[r.rel] = r.sha256;
    await writeFile(pinFile, JSON.stringify(PINS, null, 1) + '\n');
    console.error(`pinned ${unpinned.length} new checksum(s) in fetch-pins.json`);
  }
  if (print || Object.keys(PINS).length === 0) {
    await writeFile(pinFile, JSON.stringify(pins, null, 1) + '\n');
    console.error(`pinned ${results.length} checksums in fetch-pins.json`);
  }
  return { cache: CACHE, files: results.length, fetched: results.filter((r) => !r.cached).length, ktxDir };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await fetchAll({ print: process.argv.includes('--print') });
  console.log(JSON.stringify(r));
}
