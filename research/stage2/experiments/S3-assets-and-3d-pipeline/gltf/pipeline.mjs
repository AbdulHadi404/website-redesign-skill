// Build every glTF variant with the gltf-transform CLI (exactly the commands a project would run), timing each.
// Inputs come from the fetch cache; outputs go to BUILD/gltf/<model>/<variant>.glb.
import { execFileSync } from 'node:child_process';
import { mkdir, stat, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { LAB, BUILD, CACHE } from '../lib/serve.mjs';

const CLI = path.join(LAB, 'node_modules/.bin/gltf-transform');
const KTX = path.join(CACHE, 'tools/KTX-Software-4.4.2-Linux-x86_64');
const ENV = { ...process.env, PATH: `${KTX}/bin:${process.env.PATH}`, LD_LIBRARY_PATH: `${KTX}/lib:${process.env.LD_LIBRARY_PATH || ''}` };

export const MODELS = {
  DamagedHelmet: { src: 'khronos/DamagedHelmet/DamagedHelmet.glb', kind: 'PBR hero object (1 mesh, 5 JPEG textures 2048²)', animated: false, licence: 'CC-BY-4.0 + CC-BY-NC-4.0 (earlier version) — lab only, not shippable', shots: false },
  FlightHelmet: { src: 'khronos/FlightHelmet/FlightHelmet.gltf', kind: 'multi-part PBR object (6 meshes, 15 PNG textures 2048²)', animated: false, licence: 'CC0-1.0' },
  Fox: { src: 'khronos/Fox/Fox.glb', kind: 'skinned, animated character (3 clips)', animated: true, licence: 'CC0-1.0 model + CC-BY-4.0 rig/animation and conversion' },
  ABeautifulGame: { src: 'khronos/ABeautifulGame/ABeautifulGame.glb', kind: 'scene of many meshes (chess set: 33 nodes, shared meshes, transmission)', animated: false, licence: 'CC-BY-4.0' },
};

const RESIZE = (n) => ['resize', '--width', String(n), '--height', String(n)];
// UASTC level 2 (the encoder default) + RDO + zstd. `optimize --texture-compress ktx2` uses level 4, which took minutes per
// 1K texture here; it is measured separately ('optimize 1k ktx2') on the small models only.
const UASTC = ['uastc', '--slots', '{normalTexture,occlusionTexture,metallicRoughnessTexture}', '--level', '2', '--rdo', '--rdo-lambda', '4', '--zstd', '18'];
const ETC1S = ['etc1s', '--quality', '255'];

/** Variant recipes: a list of CLI steps, run in order. `clean` = dedup + prune (+ resample for animation) + weld. */
export function recipes(m) {
  const clean = [['dedup'], ['prune'], ...(m.animated ? [['resample']] : []), ['weld']];
  const r = {
    original: [['copy']],
    clean,
    quantize: [...clean, ['quantize']],
    draco: [...clean, ['draco']],
    meshopt: [...clean, ['meshopt', '--level', 'high']],
    'simplify50+meshopt': [...clean, ['simplify', '--ratio', '0.5', '--error', '0.001'], ['meshopt', '--level', 'high']],
    'tex1k-webp': [...clean, RESIZE(1024), ['webp']],
    'tex1k-avif': [...clean, RESIZE(1024), ['avif']],
    'tex1k-ktx2': [...clean, RESIZE(1024), UASTC, ETC1S],
    // ETC1S in every slot, normal maps included: the smallest KTX2, at a quality cost to normals/ORM.
    'tex1k-ktx2-etc1s': [...clean, RESIZE(1024), ETC1S],
    // The same UASTC/ETC1S split encoded by the ktx2-encoder npm package (WASM): no KTX-Software install needed.
    'tex1k-ktx2-wasm': [...clean, RESIZE(1024), ['node:gltf/ktx2-wasm.mjs']],
    // ...and with the package's README defaults, which tag normal/ORM maps as sRGB (the pitfall, kept as evidence).
    'tex1k-ktx2-wasm-readme': [...clean, RESIZE(1024), ['node:gltf/ktx2-wasm.mjs', '--readme-defaults']],
    // Geometry only (every texture removed), so geometry decode can be timed without texture fetch and decode.
    'geo-only': [...clean, ['node:gltf/strip-textures.mjs']],
    'geo-only draco': [...clean, ['node:gltf/strip-textures.mjs'], ['draco']],
    'geo-only meshopt': [...clean, ['node:gltf/strip-textures.mjs'], ['meshopt', '--level', 'high']],
    'optimize (defaults, webp)': [['optimize', '--compress', 'meshopt', '--texture-compress', 'webp']],
    'optimize 1k webp': [['optimize', '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024']],
    'optimize 1k ktx2': [['optimize', '--compress', 'meshopt', '--texture-compress', 'ktx2', '--texture-size', '1024']],
    'optimize 1k avif draco': [['optimize', '--compress', 'draco', '--texture-compress', 'avif', '--texture-size', '1024']],
  };
  if (m.name === 'DamagedHelmet') r['tex2k-ktx2'] = [...clean, UASTC, ETC1S];
  // `optimize --texture-compress ktx2` runs UASTC at quality 4. On this shared 4-CPU machine (load ≈ 15) one 1K
  // DamagedHelmet texture was still encoding after 10.5 min (2026-09-29 run, stopped by hand), so the variant runs
  // only on Fox, whose single texture is a base colour (ETC1S). Pass --slow-ktx to run it everywhere.
  if (!process.argv.includes('--slow-ktx') && m.name !== 'Fox') delete r['optimize 1k ktx2'];
  if (m.name === 'FlightHelmet' || m.name === 'ABeautifulGame') { delete r['tex1k-ktx2-wasm']; delete r['tex1k-ktx2-wasm-readme']; } // single-threaded WASM on 15–33 textures: minutes each here
  if (m.name === 'ABeautifulGame') {
    r.instance = [...clean, ['instance', '--min', '2']];
    r['optimize 1k webp, no join/flatten'] = [['optimize', '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024', '--join', 'false', '--flatten', 'false', '--instance-min', '2']];
  }
  return r;
}

export const cmdString = (steps) => steps.map(([c, ...a]) => (c.startsWith('node:') ? `node ${c.slice(5)} in.glb out.glb` : `gltf-transform ${c} in.glb out.glb${a.length ? ' ' + a.map((x) => (/[{}* ]/.test(x) ? `'${x}'` : x)).join(' ') : ''}`)).join(' && ');

export async function buildModel(name, { only } = {}) {
  const m = { ...MODELS[name], name };
  const dir = path.join(BUILD, 'gltf', name);
  await mkdir(dir, { recursive: true });
  const src = path.join(CACHE, m.src);
  const out = {};
  for (const [variant, steps] of Object.entries(recipes(m))) {
    if (only && !only.includes(variant)) continue;
    const file = path.join(dir, `${variant.replace(/[^a-z0-9]+/gi, '_')}.glb`);
    const t0 = performance.now();
    let input = src;
    try {
      for (const [i, [cmd, ...args]] of steps.entries()) {
        const tmp = i === steps.length - 1 ? file : `${file}.step${i}.glb`;
        if (cmd.startsWith('node:')) execFileSync(process.execPath, [path.join(LAB, cmd.slice(5)), input, tmp, ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
        else execFileSync(CLI, [cmd, input, tmp, ...args], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
        if (input !== src) await rm(input, { force: true });
        input = tmp;
      }
      out[variant] = { file, bytes: (await stat(file)).size, buildMs: Math.round(performance.now() - t0), commands: cmdString(steps) };
    } catch (e) {
      out[variant] = { error: String(e.stderr || e.message).split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400), commands: cmdString(steps) };
    }
    console.error(`${name} ${variant}: ${out[variant].bytes ?? out[variant].error} (${out[variant].buildMs ?? '-'} ms)`);
  }
  return { model: m, variants: out };
}
