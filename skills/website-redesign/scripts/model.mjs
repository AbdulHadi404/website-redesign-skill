#!/usr/bin/env node
/**
 * model.mjs — what is in a glTF model, what it will cost, and the gltf-transform commands that fix it.
 *
 *   node model.mjs hero.glb                          # report against the "mobile" tier
 *   node model.mjs scene.glb --tier scene            # tiers: mobile | desktop | scene
 *   node model.mjs a.glb b.gltf --json               # machine-readable
 *   node model.mjs public/models/*.glb --fail        # exit 1 when any file is over budget (use in the build)
 *   node model.mjs hero.glb --max-bytes 1200000 --max-tris 60000 --max-calls 20 --max-texture 1024 --max-vram 24
 *   node model.mjs configurator.glb --interactive    # parts/materials addressed by name: the pipeline keeps them
 *
 * Reports: file size (and gzip), requests, meshes, primitives, triangles (as stored and as drawn, with instancing),
 * draw calls, materials (and costly features: transmission, volume, blend), textures (count, dimensions, format,
 * bytes, estimated GPU memory), animations (clips, keyframes), skins, morph targets, compression extensions, what
 * dominates the bytes, unreferenced and duplicated data — then flags each budget line it breaks, with the command,
 * and prints one gltf-transform pipeline for the whole file plus what the page's loader needs (Draco/Meshopt/KTX2).
 *
 * No dependencies: it reads the GLB/JSON and the image headers itself. Numbers are estimates:
 *  - GPU texture memory: PNG/JPEG/WebP/AVIF decode to RGBA8, 4 B/px, + 1/3 for mipmaps; KTX2 stays compressed on the
 *    GPU at 1 B/px (+ 1/3 when the file carries mip levels): three.js transcodes UASTC to ASTC 4x4 or BC7 and ETC1S
 *    to BC7 on desktop GPUs, all 1 B/px (measured: 1.00 of three.js's own allocation). Phones that take ETC1S as ETC1
 *    use 0.5 B/px for opaque textures, so on a phone this is an upper bound. A browser with no compressed format at
 *    all falls back to RGBA 4 B/px (rare with WebGL2).
 *  - Draw calls: one per primitive per node (one per primitive for an EXT_mesh_gpu_instancing node); a material with
 *    KHR_materials_transmission makes three.js draw the opaque objects a second time, counted as such.
 * The tier budgets are starting points, not laws (see `realtime-3d.md` §5 and `motion.md` §9); override them.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const TIERS = {
  // A product / hero model on a page, judged on a mid-tier phone. Platform AR viewers ask for ≤ 100k triangles
  // and textures ≤ 2048 (Scene Viewer, AR Quick Look); a page model on a phone wants less.
  mobile: { bytes: 1.5e6, tris: 100_000, calls: 30, texture: 1024, vram: 48e6, materials: 10 },
  // The same model on a desktop page.
  desktop: { bytes: 3e6, tris: 300_000, calls: 100, texture: 2048, vram: 128e6, materials: 20 },
  // A whole scene on its own route (a signature experience), loaded after a poster.
  scene: { bytes: 8e6, tris: 1_000_000, calls: 300, texture: 2048, vram: 256e6, materials: 64 },
};

const COMPONENT = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

function parseArgs(argv) {
  const o = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o.files.push(a); continue; }
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) o[k] = true; else { o[k] = next; i++; }
  }
  return o;
}

// ---------- image headers ----------
function imageInfo(buf, mimeHint = '') {
  const b = buf;
  const u32be = (o) => b.readUInt32BE(o), u16be = (o) => b.readUInt16BE(o);
  if (b.length > 24 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') {
    return { format: 'png', width: u32be(16), height: u32be(20), alpha: [4, 6].includes(b[25]) || b.includes(Buffer.from('tRNS')) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { format: 'jpeg', height: u16be(o + 5), width: u16be(o + 7), alpha: false };
      o += 2 + u16be(o + 2);
    }
    return { format: 'jpeg' };
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { format: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, alpha: false };
    if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return { format: 'webp', width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1, alpha: !!((v >> 28) & 1) }; }
    if (chunk === 'VP8X') return { format: 'webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), alpha: !!(b[20] & 0x10) };
    return { format: 'webp' };
  }
  if (b.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(b.toString('ascii', 8, 32))) {
    const i = b.indexOf('ispe');
    const alpha = b.indexOf('auxC') > 0 && b.includes(Buffer.from('alpha'));
    return i > 0 ? { format: 'avif', width: u32be(i + 8), height: u32be(i + 12), alpha } : { format: 'avif' };
  }
  if (b.length > 80 && b.toString('latin1', 1, 7) === 'KTX 20') {
    const width = b.readUInt32LE(20), height = b.readUInt32LE(24), levels = b.readUInt32LE(40), scheme = b.readUInt32LE(44), dfd = b.readUInt32LE(48);
    const model = b[dfd + 12];
    const blockSize = b.readUInt16LE(dfd + 10);
    const samples = Math.max(1, Math.round((blockSize - 24) / 16));
    const codec = model === 163 ? 'etc1s' : model === 166 ? 'uastc' : `vk${b.readUInt32LE(12)}`;
    return { format: 'ktx2', codec, width, height, levels, supercompression: ['none', 'basislz', 'zstd', 'zlib'][scheme] || scheme, alpha: codec === 'etc1s' ? samples > 1 : undefined };
  }
  return { format: mimeHint.replace('image/', '') || 'unknown' };
}

function gpuBytes(img) {
  const px = (img.width || 0) * (img.height || 0);
  const mips = 4 / 3;
  if (img.format === 'ktx2') return px * 1 * ((img.levels || 1) > 1 ? mips : 1); // see the header
  return px * 4 * mips;
}

// ---------- glTF ----------
function load(file) {
  const raw = readFileSync(file);
  const dir = path.dirname(file);
  let json, bin = null;
  const external = [];
  if (raw.toString('ascii', 0, 4) === 'glTF') {
    let o = 12;
    while (o < raw.length) {
      const len = raw.readUInt32LE(o), type = raw.readUInt32LE(o + 4);
      const data = raw.subarray(o + 8, o + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
      else if (type === 0x004e4942) bin = data;
      o += 8 + len;
    }
  } else json = JSON.parse(raw.toString('utf8'));
  const buffers = (json.buffers || []).map((b, i) => {
    if (b.uri === undefined) return bin;
    if (b.uri.startsWith('data:')) return Buffer.from(b.uri.split(',')[1], 'base64');
    const p = path.join(dir, decodeURIComponent(b.uri));
    if (existsSync(p)) { external.push({ uri: b.uri, bytes: statSync(p).size }); return readFileSync(p); }
    return null;
  });
  const view = (i) => { const v = json.bufferViews[i]; const buf = buffers[v.buffer]; return buf ? buf.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength) : null; };
  const images = (json.images || []).map((im) => {
    let data = null, dataUri = false;
    if (im.bufferView !== undefined) data = view(im.bufferView);
    else if (im.uri?.startsWith('data:')) { data = Buffer.from(im.uri.split(',')[1], 'base64'); dataUri = true; }
    else if (im.uri) { const p = path.join(dir, decodeURIComponent(im.uri)); if (existsSync(p)) { data = readFileSync(p); external.push({ uri: im.uri, bytes: data.length }); } }
    return { name: im.name || im.uri || '', mime: im.mimeType || '', data, dataUri };
  });
  return { raw, json, buffers, images, external, isGLB: raw.toString('ascii', 0, 4) === 'glTF' };
}

function analyse(file, budget) {
  const { raw, json, images, external, isGLB } = load(file);
  const ext = new Set(json.extensionsUsed || []);
  const acc = json.accessors || [];
  const meshes = json.meshes || [], nodes = json.nodes || [], materials = json.materials || [];

  // reachable graph
  const reachable = new Set();
  const sceneIdx = json.scene ?? 0;
  const roots = json.scenes?.length ? (json.scenes[sceneIdx]?.nodes || []) : nodes.map((_, i) => i);
  const allSceneRoots = (json.scenes || []).flatMap((s) => s.nodes || []);
  const walk = (i, seen = reachable) => { if (seen.has(i)) return; seen.add(i); for (const c of nodes[i]?.children || []) walk(c, seen); };
  roots.forEach((i) => walk(i));
  const anyScene = new Set(); allSceneRoots.forEach((i) => walk(i, anyScene));

  // triangles and draw calls in the default scene
  const primTris = (p) => {
    const mode = p.mode ?? 4;
    const n = p.indices !== undefined ? acc[p.indices]?.count : acc[p.attributes?.POSITION]?.count;
    if (!n) return 0;
    if (mode === 4) return n / 3;
    if (mode === 5 || mode === 6) return Math.max(0, n - 2);
    return 0;
  };
  const meshTris = meshes.map((m) => m.primitives.reduce((s, p) => s + primTris(p), 0));
  let drawCalls = 0, drawnTris = 0, instancedNodes = 0, instances = 0;
  const usedMeshes = new Set(), usedMaterials = new Set();
  let transmissionPrims = 0, opaquePrims = 0, blendPrims = 0;
  for (const i of reachable) {
    const n = nodes[i];
    if (n.mesh === undefined) continue;
    usedMeshes.add(n.mesh);
    const m = meshes[n.mesh];
    const inst = n.extensions?.EXT_mesh_gpu_instancing;
    const count = inst ? (acc[Object.values(inst.attributes || {})[0]]?.count || 1) : 1;
    if (inst) { instancedNodes++; instances += count; }
    drawCalls += m.primitives.length;
    drawnTris += meshTris[n.mesh] * count;
    for (const p of m.primitives) {
      if (p.material !== undefined) usedMaterials.add(p.material);
      const mat = materials[p.material] || {};
      if (mat.extensions?.KHR_materials_transmission) transmissionPrims++;
      else if (mat.alphaMode === 'BLEND') blendPrims++;
      else opaquePrims++;
    }
  }
  const transmissionPass = transmissionPrims > 0 ? opaquePrims : 0;
  const storedTris = meshTris.reduce((a, b) => a + b, 0);

  // textures referenced by used materials, with the slot that uses them
  const texSlots = new Map();
  const visit = (o, slot) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object' && typeof v.index === 'number' && /Texture$/.test(k)) { if (!texSlots.has(v.index)) texSlots.set(v.index, new Set()); texSlots.get(v.index).add(k); }
      else visit(v, k);
    }
  };
  for (const mi of usedMaterials) visit(materials[mi]);
  const texSource = (t) => t.extensions?.KHR_texture_basisu?.source ?? t.extensions?.EXT_texture_webp?.source ?? t.extensions?.EXT_texture_avif?.source ?? t.source;
  const usedImages = new Map();
  for (const [ti, slots] of texSlots) { const s = texSource(json.textures[ti]); if (s !== undefined) { if (!usedImages.has(s)) usedImages.set(s, new Set()); slots.forEach((x) => usedImages.get(s).add(x)); } }
  const imageRows = images.map((im, i) => {
    const info = im.data ? imageInfo(im.data, im.mime) : { format: im.mime || 'missing' };
    return { i, name: im.name, bytes: im.data?.length || 0, ...info, used: usedImages.has(i), slots: [...(usedImages.get(i) || [])], gpu: Math.round(gpuBytes(info)), dataUri: im.dataUri, hash: im.data ? createHash('sha1').update(im.data).digest('hex') : null };
  });
  const used = imageRows.filter((r) => r.used);
  const texVram = used.reduce((s, r) => s + r.gpu, 0);
  const texBytes = imageRows.reduce((s, r) => s + r.bytes, 0);
  const maxTex = Math.max(0, ...used.map((r) => Math.max(r.width || 0, r.height || 0)));
  const dupImages = imageRows.length - new Set(imageRows.filter((r) => r.hash).map((r) => r.hash)).size;

  // geometry and animation bytes (as stored), GPU geometry (as decoded)
  const animAcc = new Set();
  for (const a of json.animations || []) for (const s of a.samplers || []) { animAcc.add(s.input); animAcc.add(s.output); }
  const accBytes = (a) => (a ? a.count * (NCOMP[a.type] || 1) * (COMPONENT[a.componentType] || 4) : 0);
  let geoGpu = 0;
  const geoAcc = new Set();
  for (const mi of usedMeshes) for (const p of meshes[mi].primitives) { for (const a of Object.values(p.attributes || {})) geoAcc.add(a); if (p.indices !== undefined) geoAcc.add(p.indices); for (const t of p.targets || []) for (const a of Object.values(t)) geoAcc.add(a); }
  for (const a of geoAcc) geoGpu += accBytes(acc[a]);
  const imageViews = new Set(images.map((_, i) => json.images[i].bufferView).filter((v) => v !== undefined));
  const views = json.bufferViews || [];
  // Meshopt-compressed views record the decoded length in byteLength and the stored length in the extension.
  const storedLen = (v) => v.extensions?.EXT_meshopt_compression?.byteLength ?? v.extensions?.KHR_meshopt_compression?.byteLength ?? v.byteLength;
  let animStored = 0;
  const animViews = new Set([...animAcc].map((a) => acc[a]?.bufferView).filter((v) => v !== undefined));
  for (const v of animViews) animStored += storedLen(views[v]);
  const binTotal = views.reduce((s, v) => s + storedLen(v), 0);
  const imgInViews = [...imageViews].reduce((s, v) => s + views[v].byteLength, 0);
  const geoStored = Math.max(0, binTotal - imgInViews - animStored);

  // animation, skins, morphs
  const anims = (json.animations || []).map((a) => {
    let keys = 0, dur = 0;
    for (const s of a.samplers) { const inp = acc[s.input]; keys += inp?.count || 0; dur = Math.max(dur, inp?.max?.[0] || 0); }
    return { name: a.name || '', channels: a.channels.length, keyframes: keys, duration: Math.round(dur * 100) / 100 };
  });
  const skins = (json.skins || []).map((s) => s.joints.length);
  const morphTargets = Math.max(0, ...meshes.flatMap((m) => m.primitives.map((p) => (p.targets || []).length)));
  const costly = [...new Set(materials.flatMap((m) => Object.keys(m.extensions || {})).filter((k) => /transmission|volume|clearcoat|sheen|iridescence|anisotropy|dispersion|pbrSpecularGlossiness/.test(k)))];

  const size = raw.length + external.reduce((s, e) => s + e.bytes, 0);
  const gz = gzipSync(raw, { level: 6 }).length + external.reduce((s, e) => s + e.bytes, 0); // images barely gzip
  const compression = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_mesh_quantization', 'KHR_texture_basisu', 'EXT_texture_webp', 'EXT_texture_avif'].filter((e) => ext.has(e));

  // ---------- flags ----------
  const f = path.basename(file), o = f.replace(/\.(glb|gltf)$/i, '') + '.opt.glb';
  const flags = [];
  const add = (level, what, fix) => flags.push({ level, what, fix });
  const MB = (x) => `${(x / 1e6).toFixed(2)} MB`;
  const texShare = size ? texBytes / size : 0;
  const allKtx2 = images.length > 0 && imageRows.filter((r) => r.used).every((r) => r.format === 'ktx2');
  if (size > budget.bytes) {
    add('over', `transfer ${MB(size)} > ${MB(budget.bytes)}${texShare > 0.5 ? ` — textures are ${Math.round(texShare * 100)} % of it: start there` : ''}`,
      allKtx2 && texShare > 0.25 ? `KTX2 is already GPU-compressed; to shrink the download, lower the size (re-encode from the source textures with --texture-size ${Math.max(256, budget.texture / 2)}), use ETC1S instead of UASTC where a slot tolerates it, or accept WebP (smaller file, 4× the GPU memory)`
        : texShare > 0.25 ? `gltf-transform optimize ${f} ${o} --compress meshopt --texture-compress webp --texture-size ${budget.texture}` : `gltf-transform optimize ${f} ${o} --compress meshopt`);
  }
  const meshopt = ext.has('EXT_meshopt_compression') || ext.has('KHR_meshopt_compression');
  if (!meshopt && !ext.has('KHR_draco_mesh_compression') && geoStored > 150e3)
    add('advice', `geometry stored uncompressed (${MB(geoStored)})`, `gltf-transform meshopt ${f} ${o}   # decoder ~7 KB gzip; Draco's is larger`);
  if (drawnTris > budget.tris)
    add('over', `${Math.round(drawnTris).toLocaleString('en')} triangles drawn > ${budget.tris.toLocaleString('en')}`, `gltf-transform simplify ${f} ${o} --ratio 0.5 --error 0.001   # then check silhouettes; or bake detail into normal maps / LODs in the DCC tool`);
  const calls = drawCalls + transmissionPass;
  const shared = [...reachable].filter((i) => nodes[i].mesh !== undefined && !nodes[i].extensions?.EXT_mesh_gpu_instancing).map((i) => nodes[i].mesh);
  const repeats = shared.length - new Set(shared).size;
  if (calls <= budget.calls && repeats >= 4) add('advice', `${repeats} nodes reuse a mesh without GPU instancing`, `gltf-transform instance ${f} ${o} --min 2   # one draw call per repeated mesh`);
  if (calls > budget.calls) {
    add('over', `~${calls} draw calls > ${budget.calls}${transmissionPass ? ` (incl. ~${transmissionPass} for the transmission pass)` : ''}`,
      repeats >= 2 && !ext.has('EXT_mesh_gpu_instancing') ? `gltf-transform instance ${f} ${o} --min 2   # ${repeats} nodes reuse a mesh; three.js GLTFLoader turns this into InstancedMesh` : `gltf-transform optimize ${f} ${o} --join true --flatten true --palette true   # merges static meshes and materials`);
  }
  if (maxTex > budget.texture) add('over', `texture ${maxTex}px > ${budget.texture}px`, `gltf-transform resize ${f} ${o} --width ${budget.texture} --height ${budget.texture}`);
  if (texVram > budget.vram) add('over', `texture GPU memory ~${MB(texVram)} > ${MB(budget.vram)}`, `gltf-transform optimize ${f} ${o} --texture-compress ktx2 --texture-size ${budget.texture}   # UASTC for normal/ORM, ETC1S for colour; needs KTX-Software 4.4+ (ktx) on PATH`);
  if (usedMaterials.size > budget.materials) add('over', `${usedMaterials.size} materials > ${budget.materials}`, `gltf-transform palette ${f} ${o}   # merges simple materials into palette textures`);
  const unused = { nodes: nodes.length - anyScene.size, meshes: meshes.length - new Set([...anyScene].map((i) => nodes[i].mesh).filter((x) => x !== undefined)).size, materials: materials.length - usedMaterials.size, images: imageRows.filter((r) => !r.used).length };
  if (unused.meshes > 0 || unused.materials > 0 || unused.images > 0) add('advice', `unreferenced data: ${Object.entries(unused).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')}`, `gltf-transform prune ${f} ${o}`);
  if (dupImages > 0) add('advice', `${dupImages} duplicated image(s)`, `gltf-transform dedup ${f} ${o}`);
  const totalKeys = anims.reduce((s, a) => s + a.keyframes, 0);
  if (totalKeys > 5000 && !meshopt) add('advice', `${totalKeys.toLocaleString('en')} animation keyframes`, `gltf-transform resample ${f} ${o} && gltf-transform meshopt ${o} ${o}   # resample is lossless; meshopt also compresses animation`);
  if (imageRows.some((r) => r.dataUri) || (!isGLB && external.length > 3)) add('advice', !isGLB && external.length > 3 ? `.gltf with ${external.length} external files (${external.length + 1} requests)` : 'base64 data URIs (+33 % bytes)', `gltf-transform copy ${f} ${f.replace(/\.gltf$/i, '')}.glb`);
  if (costly.includes('KHR_materials_pbrSpecularGlossiness')) add('advice', 'spec/gloss materials (deprecated)', `gltf-transform metalrough ${f} ${o}`);
  if (costly.some((c) => /transmission|volume/.test(c))) add('advice', `${costly.filter((c) => /transmission|volume/.test(c)).join(', ')}: three.js renders an extra transmission pass`, 'keep glass for the hero only, or fake it with an alpha-blended material on phones');
  if (ext.has('KHR_draco_mesh_compression')) add('info', 'Draco geometry: the decoder is a separate ~65–200 KB download (JS or WASM) plus worker start-up', `re-encode with meshopt if you control the pipeline: gltf-transform meshopt ${f} ${o}`);
  // One pipeline for the whole file (the individual fixes above each start from the original).
  // WebP when the textures fit the GPU budget once resized; KTX2 when even resized RGBA would not (KTX2 is 1 B/px on
  // the GPU but, measured, 2–3× the transfer of WebP at the same size, and needs KTX-Software on PATH).
  const cap = budget.texture;
  const vramResized = used.reduce((s, r) => { const k = Math.min(1, cap / Math.max(r.width || 1, r.height || 1)); return s + (r.format === 'ktx2' ? r.gpu : (r.width || 0) * k * (r.height || 0) * k * 4 * 4 / 3); }, 0);
  const texFmt = used.length === 0 ? null : used.every((r) => r.format === 'ktx2') ? null : vramResized > budget.vram ? 'ktx2' : 'webp';
  const interactive = !!budget.interactive;
  const steps = [`--compress meshopt`];
  if (texFmt) steps.push(`--texture-compress ${texFmt}`);
  if (maxTex > cap) steps.push(`--texture-size ${cap}`);
  if (drawnTris <= budget.tris) steps.push('--simplify false');
  if (interactive) steps.push('--join false --flatten false --palette false');
  const pipeline = flags.some((x) => x.level !== 'info') ? `gltf-transform optimize ${f} ${o} ${steps.join(' ')}${ext.has('KHR_draco_mesh_compression') ? '   # re-encodes Draco as meshopt' : ''}` : null;
  const pipelineNotes = [];
  if (pipeline && !interactive) pipelineNotes.push('optimize joins, flattens and palettes by default: if code addresses parts or materials by name (a configurator, a hover highlight), pass --interactive for a pipeline that keeps them');
  if (pipeline && texFmt === 'ktx2') pipelineNotes.push(`KTX2 because even ${cap}px RGBA textures would need ~${(vramResized / 1e6).toFixed(0)} MB of GPU memory; expect a larger download than WebP. Needs KTX-Software 4.4+ (ktx) on PATH`);
  if (pipeline) pipelineNotes.push(`then check: node model.mjs ${o}${budget.name !== 'mobile' ? ' --tier ' + budget.name : ''}, and compare renders at the page's camera (visual diff) before shipping`);
  // What the page's loader must be given for this file.
  const needs = [];
  if (ext.has('KHR_draco_mesh_compression')) needs.push('DRACOLoader + draco decoder files (self-host them)');
  if (meshopt) needs.push('MeshoptDecoder (three/examples/jsm/libs/meshopt_decoder.module.js)');
  if (ext.has('KHR_texture_basisu')) needs.push('KTX2Loader + basis transcoder files (self-host them), detectSupport(renderer)');
  if (ext.has('EXT_texture_avif')) needs.push('AVIF decoding (fallback image needed for old browsers)');
  const rasterColour = used.filter((r) => r.format !== 'ktx2');
  if (rasterColour.length && rasterColour.every((r) => r.format === 'png') && texBytes > 500e3) add('advice', `${rasterColour.length} PNG textures (${MB(texBytes)})`, `gltf-transform webp ${f} ${o}   # or avif; keep PNG only for pixel art or lossless data`);

  return {
    file, tier: budget.name, bytes: size, gzipBytes: gz, requests: 1 + external.length, container: isGLB ? 'glb' : 'gltf',
    generator: json.asset?.generator || '', extensionsUsed: [...ext], extensionsRequired: json.extensionsRequired || [], compression,
    scenes: (json.scenes || []).length, nodes: nodes.length, meshes: meshes.length, primitives: meshes.reduce((s, m) => s + m.primitives.length, 0),
    trianglesStored: Math.round(storedTris), trianglesDrawn: Math.round(drawnTris), drawCalls: calls, instancedNodes, instances,
    materials: materials.length, materialsUsed: usedMaterials.size, costlyMaterialFeatures: costly, blendPrimitives: blendPrims,
    textures: (json.textures || []).length, images: imageRows.map(({ hash, dataUri, i, ...r }) => r), maxTexture: maxTex,
    textureBytes: texBytes, textureGpuBytes: Math.round(texVram), geometryBytesStored: geoStored, geometryGpuBytes: geoGpu, animationBytesStored: animStored,
    cameras: (json.cameras || []).length, lights: (json.extensions?.KHR_lights_punctual?.lights || []).length,
    animations: anims, skins: skins.length, maxJoints: Math.max(0, ...skins), morphTargets, unused, duplicateImages: dupImages,
    budget, flags, pipeline, pipelineNotes, loaderNeeds: needs, ok: !flags.some((x) => x.level === 'over'),
  };
}

function print(r) {
  const MB = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)} MB` : `${Math.round(x / 1e3)} KB`);
  const L = [];
  L.push(`\n${r.file}  [tier: ${r.tier}]  ${r.ok ? 'within budget' : 'OVER BUDGET'}`);
  L.push(`  transfer   ${MB(r.bytes)} (${r.container}, ${r.requests} request${r.requests > 1 ? 's' : ''}; gzip ≈ ${MB(r.gzipBytes)})   compression: ${r.compression.join(', ') || 'none'}`);
  L.push(`  bytes      textures ${MB(r.textureBytes)} · geometry ${MB(r.geometryBytesStored)} · animation ${MB(r.animationBytesStored)}`);
  L.push(`  geometry   ${r.meshes} meshes, ${r.primitives} primitives, ${r.trianglesStored.toLocaleString('en')} triangles stored, ${r.trianglesDrawn.toLocaleString('en')} drawn${r.instances ? ` (${r.instances} GPU instances on ${r.instancedNodes} nodes)` : ''}, ~${r.drawCalls} draw calls, GPU ≈ ${MB(r.geometryGpuBytes)}`);
  L.push(`  materials  ${r.materialsUsed} used of ${r.materials}${r.costlyMaterialFeatures.length ? ` · ${r.costlyMaterialFeatures.join(', ')}` : ''}${r.blendPrimitives ? ` · ${r.blendPrimitives} blended primitives` : ''}`);
  L.push(`  textures   ${r.images.filter((i) => i.used).length} images, max ${r.maxTexture}px, GPU ≈ ${MB(r.textureGpuBytes)}`);
  const byFmt = {};
  for (const im of r.images) { const k = `${im.format}${im.codec ? '/' + im.codec : ''} ${im.width}×${im.height}`; byFmt[k] = (byFmt[k] || 0) + 1; }
  L.push(`             ${Object.entries(byFmt).map(([k, v]) => `${v}× ${k}`).join(' · ')}`);
  if (r.cameras || r.lights) L.push(`  scene      ${r.cameras} camera(s), ${r.lights} punctual light(s)`);
  if (r.animations.length || r.skins) L.push(`  animation  ${r.animations.length} clip(s): ${r.animations.map((a) => `${a.name || '?'} ${a.duration}s/${a.keyframes} keys`).join(', ')}${r.skins ? ` · ${r.skins} skin(s), max ${r.maxJoints} joints` : ''}${r.morphTargets ? ` · ${r.morphTargets} morph targets` : ''}`);
  const b = r.budget;
  L.push(`  budget     ≤ ${MB(b.bytes)}, ≤ ${b.tris.toLocaleString('en')} tris, ≤ ${b.calls} calls, textures ≤ ${b.texture}px, texture GPU ≤ ${MB(b.vram)}, ≤ ${b.materials} materials (starting points — override with --max-*)`);
  if (r.loaderNeeds.length) L.push(`  loader     needs ${r.loaderNeeds.join('; ')}`);
  for (const x of r.flags) L.push(`  ${x.level === 'over' ? '✗' : x.level === 'advice' ? '→' : 'i'} ${x.what}\n      ${x.fix}`);
  if (r.pipeline) L.push(`  pipeline   ${r.pipeline}${r.pipelineNotes.map((n) => `\n             ${n}`).join('')}`);
  console.log(L.join('\n'));
}

const args = parseArgs(process.argv.slice(2));
if (!args.files.length || args.help) {
  console.log('usage: node model.mjs <file.glb|.gltf>… [--tier mobile|desktop|scene] [--max-bytes N] [--max-tris N] [--max-calls N] [--max-texture PX] [--max-vram MB] [--max-materials N] [--interactive] [--json] [--fail]');
  process.exit(args.help ? 0 : 1);
}
const tier = String(args.tier || 'mobile');
if (!TIERS[tier]) { console.error(`unknown tier ${tier}: ${Object.keys(TIERS).join(', ')}`); process.exit(1); }
const budget = { name: tier, ...TIERS[tier] };
if (args['max-bytes']) budget.bytes = Number(args['max-bytes']);
if (args['max-tris']) budget.tris = Number(args['max-tris']);
if (args['max-calls']) budget.calls = Number(args['max-calls']);
if (args['max-texture']) budget.texture = Number(args['max-texture']);
if (args['max-vram']) budget.vram = Number(args['max-vram']) * 1e6;
if (args['max-materials']) budget.materials = Number(args['max-materials']);
if (args.interactive) budget.interactive = true;
const results = [];
for (const file of args.files) {
  try { results.push(analyse(file, budget)); } catch (e) { results.push({ file, error: e.message, ok: false }); }
}
if (args.json) console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 1));
else for (const r of results) r.error ? console.log(`\n${r.file}: ${r.error}`) : print(r);
if (args.fail && results.some((r) => !r.ok)) process.exit(1);
