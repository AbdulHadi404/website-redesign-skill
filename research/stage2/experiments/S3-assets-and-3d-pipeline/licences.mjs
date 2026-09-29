#!/usr/bin/env node
// Re-read the primary licence sources this stream cites (pinned commits on GitHub; the only vendor sources this
// sandbox can reach), record a checksum and the lines that matter, and census the Khronos sample-asset licences.
// Writes results.json → "licences". Vendor pages that could not be fetched (kenney.nl, sketchfab.com, itch.io,
// mixamo, opengameart.org, lottiefiles.com, rive.app, blender.org) are search-snippet evidence in the report, not here.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { mergeResults } from './lib/common.mjs';

const RAW = 'https://raw.githubusercontent.com';
const SOURCES = {
  'spine-runtimes LICENSE (4.3)': [`${RAW}/EsotericSoftware/spine-runtimes/7ce5d0daac13268fa3ed68eb174c2822ef2692c9/LICENSE`, /Integration of the Spine Runtimes|each user of the Products must obtain their own/],
  'spine-runtimes examples/readme.txt (no licence stated for the example art)': [`${RAW}/EsotericSoftware/spine-runtimes/7ce5d0daac13268fa3ed68eb174c2822ef2692c9/examples/readme.txt`, /licen/i],
  'DragonBonesJS LICENSE': [`${RAW}/DragonBones/DragonBonesJS/64b6c69ae35777c2404be68c9192e2c56906079e/LICENSE`, /MIT License|Permission is hereby granted/],
  'rive-wasm LICENSE (runtime)': [`${RAW}/rive-app/rive-wasm/eafb1efd0b57eee0c580052989fccef15cf883fa/LICENSE`, /MIT License/],
  'lottie-web LICENSE.md': [`${RAW}/airbnb/lottie-web/bede03d25d232826e0c9dca1733d542d8a7754fb/LICENSE.md`, /MIT|Permission is hereby granted/],
  'pixijs LICENSE': [`${RAW}/pixijs/pixijs/ef0c0a79b4e147d2ba8cf3b26b5efcb13f3ca307/LICENSE`, /MIT|Permission is hereby granted/],
  'glTF-Transform LICENSE.md': [`${RAW}/donmccurdy/glTF-Transform/41156dfa2324ac6c44ddf0a40ec0da194c4731d6/LICENSE.md`, /MIT|Permission is hereby granted/],
  'meshoptimizer LICENSE.md': [`${RAW}/zeux/meshoptimizer/4c203430ca565cb59a468a91922c76c208169536/LICENSE.md`, /MIT|Permission is hereby granted/],
  'Kenney Starter-Kit-City-Builder LICENSE.md (a code+asset starter kit: MIT, not the CC0 of the asset packs)': [`${RAW}/KenneyNL/Starter-Kit-City-Builder/4535092b740b378b700efd9df9e27a631815b84a/LICENSE.md`, /MIT License/],
  'Poly Haven site: public/locales/en/license.json (the asset licence page text)': [`${RAW}/Poly-Haven/polyhaven.com/b1a6aa13afc03ae00860f6ac5fe6d5daf8e95356/public/locales/en/license.json`, /CC0|any purpose|do not need to give credit|redistribute/],
  'Poly Haven site code LICENSE (the website code, not the assets)': [`${RAW}/Poly-Haven/polyhaven.com/b1a6aa13afc03ae00860f6ac5fe6d5daf8e95356/LICENSE`, /AFFERO/],
  'Freesound sounds/fixtures/licenses.json': [`${RAW}/MTG/freesound/327cefdcbf5d543c561537550662e919a176130e/sounds/fixtures/licenses.json`, /"name"/],
  'NASA-3D-Resources README.md': [`${RAW}/nasa/NASA-3D-Resources/master/README.md`, /free and without copyright|usage guidelines/],
  'Smithsonian OpenAccess README.md': [`${RAW}/Smithsonian/OpenAccess/master/README.md`, /CC0|Open Access/],
  'glTF-Blender-IO docs: glTF Material Output / occlusion, GPU instances': [`${RAW}/KhronosGroup/glTF-Blender-IO/093ad93ce4750dd496266806309ba75d5f755752/docs/blender_docs/scene_gltf2.rst`, /glTF Material Output|EXT_mesh_gpu_instancing|Instances must/],
  // Asset-pack licence files as the packs ship them (vendored copies in public repositories; the vendor sites are not reachable here).
  'Kenney pack License.txt (vendored in excaliburjs/Excalibur)': [`${RAW}/excaliburjs/Excalibur/760a28a8544d477a496cbb72a14ac68ff9583354/src/spec/assets/images/sprite-sheet-spec/genericItems_spriteSheet_License.txt`, /CC0|commercial|Credit/],
  'Kenney Starter-Kit-3D-Platformer README (code MIT, assets CC0)': [`${RAW}/KenneyNL/Starter-Kit-3D-Platformer/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0/README.md`, /CC0|MIT License/],
  'Quaternius pack License.txt (vendored in arn0ld87/Luther-Game)': [`${RAW}/arn0ld87/Luther-Game/c9a068d50cbe579c79b273af5d4ce766413826c3/game/assets/licenses/Quaternius_MegaKit_CC0_License.txt`, /CC0|FREE version|PRO/],
  'Liberated Pixel Cup README (OpenGameArt: CC-BY 3.0 / OGA-BY 3.0)': [`${RAW}/ElizaWy/LPC/f07f7f5892e67c932c68f70bb04472f2c64e46bc/README.md`, /OGA-BY|CC-BY|credit\.txt/],
  'CC BY 4.0 legal code (Khronos LICENSES/): technical modifications, attribution': [`${RAW}/KhronosGroup/glTF-Sample-Assets/f36bfdabd1031c3cf6689a50570b8cdf3678b49c/LICENSES/CC-BY-4.0.txt`, /technical modifications|Adapted Material\.|indicate if You modified|URI or hyperlink to a resource/],
  'Tiled COPYING (editor GPL, libtiled BSD)': [`${RAW}/mapeditor/tiled/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/COPYING`, /GPL|BSD/],
  'LDtk LICENSE': [`${RAW}/deepnight/ldtk/6d69bd1d6be92f01ac30778f6a934f0da8448b16/LICENSE`, /MIT License/],
  'Blender release/text/copyright.txt (the program is GPL)': [`${RAW}/blender/blender/0ae04d3e782c4f393950d2df9f764fd7688ef3ca/release/text/copyright.txt`, /GNU GPL|General Public License/],
};

async function one(name, [url, re]) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { url, status: res.status };
    const text = await res.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => re.test(l)).slice(0, 6).map((l) => l.slice(0, 220));
    return { url, status: 200, sha256: createHash('sha256').update(text).digest('hex'), bytes: text.length, lines };
  } catch (e) { return { url, error: e.message }; }
}

const out = { sources: {} };
for (const [k, v] of Object.entries(SOURCES)) out.sources[k] = await one(k, v);

// Khronos glTF-Sample-Assets: census of per-model licences (metadata.json of every model), at a pinned commit.
const dir = process.env.S3_KHR_CLONE || '/tmp/s2-S3/glTF-Sample-Assets-census';
const COMMIT = 'f36bfdabd1031c3cf6689a50570b8cdf3678b49c';
try {
  if (!existsSync(dir)) {
    execFileSync('git', ['clone', '-q', '--filter=blob:none', '--sparse', '--no-checkout', 'https://github.com/KhronosGroup/glTF-Sample-Assets.git', dir]);
    execFileSync('git', ['-C', dir, 'sparse-checkout', 'set', '--no-cone', '/Models/*/metadata.json', '/LICENSES/*']);
    execFileSync('git', ['-C', dir, 'checkout', '-q', COMMIT]);
  }
  const models = readdirSync(path.join(dir, 'Models')).filter((m) => existsSync(path.join(dir, 'Models', m, 'metadata.json')));
  const census = {}, restricted = {};
  for (const m of models) {
    const j = JSON.parse(readFileSync(path.join(dir, 'Models', m, 'metadata.json'), 'utf8'));
    const lic = [...new Set((j.legal || []).map((l) => l.spdx || l.license))].sort();
    const key = lic.filter((x) => !x.startsWith('LicenseRef-LegalMark')).join(' + ') || 'none';
    census[key] = (census[key] || 0) + 1;
    if (lic.some((x) => !['CC0-1.0', 'CC-BY-4.0'].includes(x) && !x.startsWith('LicenseRef-LegalMark'))) restricted[m] = lic;
  }
  out.khronosSampleAssets = { commit: COMMIT, models: models.length, census, restricted, trademarkNotices: models.filter((m) => /LegalMark/.test(readFileSync(path.join(dir, 'Models', m, 'metadata.json'), 'utf8'))).length };
} catch (e) { out.khronosSampleAssets = { error: e.message }; }

// NASA-3D-Resources: is there a LICENSE file at all, and how many ready-made GLBs? (tree only, no blobs)
try {
  const nd = process.env.S3_NASA_CLONE || '/tmp/s2-S3/nasa3d';
  if (!existsSync(nd)) execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', 'https://github.com/nasa/NASA-3D-Resources.git', nd]);
  const files = execFileSync('git', ['-C', nd, 'ls-tree', '-r', '--name-only', 'HEAD'], { maxBuffer: 16 << 20 }).toString().split('\n').filter(Boolean);
  out.nasa3d = { commit: execFileSync('git', ['-C', nd, 'rev-parse', 'HEAD']).toString().trim(), files: files.length, licenceFiles: files.filter((f) => /(^|\/)(licen[cs]e|copying)/i.test(f)), glb: files.filter((f) => /\.glb$/i.test(f)).length };
} catch (e) { out.nasa3d = { error: e.message }; }

await mergeResults('licences', out);
console.log(JSON.stringify({ sources: Object.fromEntries(Object.entries(out.sources).map(([k, v]) => [k, v.status || v.error])), khronos: out.khronosSampleAssets.census }, null, 1));
