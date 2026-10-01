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
 *   node model.mjs hero.glb --ktx2                   # prefer KTX2 over a smaller WebP when GPU memory is the limit
 *
 * Reports: file size (and gzip), requests, meshes, primitives, triangles (as stored and as drawn, with instancing),
 * draw calls, materials (and costly features: transmission, volume, blend), textures (count, dimensions, format,
 * bytes, estimated GPU memory), animations (clips, keyframes), skins, morph targets, compression extensions, what
 * dominates the bytes, unreferenced and duplicated data — then flags each budget line it breaks, with the command,
 * and prints one gltf-transform pipeline for the whole file plus what the page's loader needs (Draco/Meshopt/KTX2).
 * Also catches three silent breakages found in the lab (research/stage2 S3): KTX2 normal/ORM maps tagged sRGB (the
 * ktx2-encoder package's default), glass (transmission/volume) on GPU instances after quantization (three.js ignores
 * instance scale for glass thickness), and a .gltf whose .bin or textures are missing.
 *
 * No dependencies: it reads the GLB/JSON and the image headers itself. Numbers are estimates of what three.js r186
 * (GLTFLoader + WebGLRenderer) will do with the file:
 *  - Textures counted are the ones three.js uploads: core PBR slots plus the material extensions GLTFLoader reads, a
 *    physical map only when its factor is on, base colour only for unlit. Spec/gloss (KHR_materials_pbrSpecularGlossiness)
 *    is not read by three.js at all: flagged, and converted first in the pipeline.
 *  - GPU texture memory: PNG/JPEG/WebP/AVIF upload as RGBA8, 4 B/px, + 1/3 for mipmaps; KTX2 stays compressed at
 *    1 B/px (+ 1/3 when the file carries mips): three.js transcodes UASTC to ASTC 4x4 or BC7 and ETC1S to BC7 on
 *    desktop GPUs. Phones that take ETC1S as ETC1 use 0.5 B/px for opaque textures, so there it is an upper bound.
 *    Checked against the texStorage2D allocations three.js requests (research S3: run-gltf, run-modelscript).
 *  - Draw calls and triangles: one draw per primitive per node (per primitive for an EXT_mesh_gpu_instancing node,
 *    whose triangles count once per instance); BLEND + doubleSided primitives are drawn twice (back, then front);
 *    when a material transmits (transmissionFactor > 0), the opaque objects are drawn again for the transmission
 *    pass, plus one back-face draw per double-sided transmissive primitive where the browser lacks
 *    WEBGL_multisampled_render_to_texture (desktop browsers). Checked against renderer.info (research S3).
 * The tier budgets are starting points, not laws (see `interactive.md` §7 and `motion.md` §9); override them.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const TIERS = {
  // A product / hero model on a page, judged on a mid-tier phone. AR-viewer guidance usually quoted is ≤ 100k
  // triangles and ≤ 2048² textures; a model inside a page on a phone wants less (textures ≤ 1024²).
  mobile: { bytes: 1.5e6, tris: 100_000, calls: 30, texture: 1024, vram: 48e6, materials: 10 },
  // The same model on a desktop page.
  desktop: { bytes: 3e6, tris: 300_000, calls: 100, texture: 2048, vram: 128e6, materials: 20 },
  // A whole scene on its own route (a signature experience), loaded after a poster.
  scene: { bytes: 8e6, tris: 1_000_000, calls: 300, texture: 2048, vram: 256e6, materials: 64 },
};

const COMPONENT = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

const BOOLEAN = new Set(['json', 'fail', 'interactive', 'ktx2', 'help']);
function parseArgs(argv) {
  const o = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o.files.push(a); continue; }
    const k = a.slice(2);
    const next = argv[i + 1];
    if (BOOLEAN.has(k) || next === undefined || next.startsWith('--')) o[k] = true; else { o[k] = next; i++; }
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
    const model = b[dfd + 12], transfer = b[dfd + 14]; // DFD basic block: colorModel, colorPrimaries, transferFunction (1 linear, 2 sRGB)
    const blockSize = b.readUInt16LE(dfd + 10);
    const samples = Math.max(1, Math.round((blockSize - 24) / 16));
    const codec = model === 163 ? 'etc1s' : model === 166 ? 'uastc' : `vk${b.readUInt32LE(12)}`;
    return { format: 'ktx2', codec, width, height, levels, supercompression: ['none', 'basislz', 'zstd', 'zlib'][scheme] || scheme, transfer: transfer === 2 ? 'srgb' : transfer === 1 ? 'linear' : transfer, alpha: codec === 'etc1s' ? samples > 1 : undefined };
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
  const external = [], missing = [];
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
    missing.push(b.uri);
    return null;
  });
  const view = (i) => { const v = json.bufferViews[i]; const buf = buffers[v.buffer]; return buf ? buf.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength) : null; };
  const images = (json.images || []).map((im) => {
    let data = null, dataUri = false;
    if (im.bufferView !== undefined) data = view(im.bufferView);
    else if (im.uri?.startsWith('data:')) { data = Buffer.from(im.uri.split(',')[1], 'base64'); dataUri = true; }
    else if (im.uri) { const p = path.join(dir, decodeURIComponent(im.uri)); if (existsSync(p)) { data = readFileSync(p); external.push({ uri: im.uri, bytes: data.length }); } else missing.push(im.uri); }
    return { name: im.name || im.uri || '', mime: im.mimeType || '', data, dataUri };
  });
  return { raw, json, buffers, images, external, missing, view, isGLB: raw.toString('ascii', 0, 4) === 'glTF' };
}

function analyse(file, budget) {
  const { raw, json, images, external, missing, view, isGLB } = load(file);
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
  // How three.js r186 (WebGLRenderer + GLTFLoader) draws a primitive, from its source:
  //  - a material transmits only when transmissionFactor > 0 (GLTFLoader copies the factor; the spec default is 0);
  //  - KHR_materials_unlit wins over every other material extension;
  //  - alphaMode BLEND + doubleSided is drawn twice, back faces then front faces (renderObject, forceSinglePass false);
  //  - when anything transmits, the opaque objects are drawn again into the transmission render target, and each
  //    double-sided transmissive primitive gets one more back-face draw there when the browser lacks
  //    WEBGL_multisampled_render_to_texture (all desktop browsers; some Android GPUs have it) (renderTransmissionPass).
  const matKind = (mi) => {
    const m = materials[mi] || {}, e = m.extensions || {};
    const unlit = !!e.KHR_materials_unlit;
    return { blend: m.alphaMode === 'BLEND', doubleSided: !!m.doubleSided, transmissive: !unlit && (e.KHR_materials_transmission?.transmissionFactor ?? 0) > 0 };
  };
  let drawCalls = 0, drawnTris = 0, instancedNodes = 0, instances = 0;
  const usedMeshes = new Set(), usedMaterials = new Set();
  let transmissionPrims = 0, opaquePrims = 0, blendPrims = 0, opaqueTris = 0, backfaceDraws = 0, backfaceTris = 0, twoPassBlend = 0;
  for (const i of reachable) {
    const n = nodes[i];
    if (n.mesh === undefined) continue;
    usedMeshes.add(n.mesh);
    const m = meshes[n.mesh];
    const inst = n.extensions?.EXT_mesh_gpu_instancing;
    const count = inst ? (acc[Object.values(inst.attributes || {})[0]]?.count || 1) : 1;
    if (inst) { instancedNodes++; instances += count; }
    for (const p of m.primitives) {
      if (p.material !== undefined) usedMaterials.add(p.material);
      const k = matKind(p.material);
      const t = primTris(p) * count;
      const passes = k.blend && k.doubleSided ? 2 : 1;
      if (passes === 2) twoPassBlend++;
      drawCalls += passes;
      drawnTris += t * passes;
      if (k.transmissive) { transmissionPrims++; if (k.doubleSided) { backfaceDraws++; backfaceTris += t; } }
      else if (k.blend) blendPrims++;
      else { opaquePrims++; opaqueTris += t; }
    }
  }
  const transmissionPass = transmissionPrims > 0 ? opaquePrims + backfaceDraws : 0;
  if (transmissionPrims > 0) drawnTris += opaqueTris + backfaceTris;
  const storedTris = meshTris.reduce((a, b) => a + b, 0);

  // Textures three.js r186 actually uploads for the used materials, with the slot that uses them. GLTFLoader ignores
  // extensions it does not implement (KHR_materials_pbrSpecularGlossiness since r147: the model renders untextured),
  // unlit materials use only the base colour, and WebGLPrograms binds a physical map only when its factor is on.
  const texSlots = new Map(), ignoredSlots = new Map();
  const note = (map, ref, slot) => { if (!ref || typeof ref.index !== 'number') return; if (!map.has(ref.index)) map.set(ref.index, new Set()); map.get(ref.index).add(slot); };
  const EXT_TEX = {
    KHR_materials_clearcoat: (e) => ((e.clearcoatFactor ?? 0) > 0 ? ['clearcoatTexture', 'clearcoatRoughnessTexture', 'clearcoatNormalTexture'] : []),
    KHR_materials_sheen: () => ['sheenColorTexture', 'sheenRoughnessTexture'],
    KHR_materials_specular: () => ['specularTexture', 'specularColorTexture'],
    KHR_materials_transmission: (e) => ((e.transmissionFactor ?? 0) > 0 ? ['transmissionTexture'] : []),
    KHR_materials_volume: (e, m) => ((m.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0) > 0 ? ['thicknessTexture'] : []),
    KHR_materials_iridescence: (e) => ((e.iridescenceFactor ?? 0) > 0 ? ['iridescenceTexture', 'iridescenceThicknessTexture'] : []),
    KHR_materials_anisotropy: (e) => ((e.anisotropyStrength ?? 0) > 0 ? ['anisotropyTexture'] : []),
    EXT_materials_bump: () => ['bumpTexture'],
  };
  const allTex = (o, map, pre = '') => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (/Texture$/.test(k)) note(map, v, pre + k); else allTex(v, map, pre); } };
  for (const mi of usedMaterials) {
    const m = materials[mi] || {}, e = m.extensions || {}, pbr = m.pbrMetallicRoughness || {};
    note(texSlots, pbr.baseColorTexture, 'baseColorTexture');
    if (e.KHR_materials_unlit) { const rest = { ...m, pbrMetallicRoughness: { ...pbr, baseColorTexture: undefined } }; allTex(rest, ignoredSlots, 'unlit:'); continue; }
    note(texSlots, pbr.metallicRoughnessTexture, 'metallicRoughnessTexture');
    for (const k of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) note(texSlots, m[k], k);
    for (const [name, ex] of Object.entries(e)) {
      const slots = EXT_TEX[name] ? EXT_TEX[name](ex, m) : [];
      for (const [k, v] of Object.entries(ex || {})) if (/Texture$/.test(k)) note(slots.includes(k) ? texSlots : ignoredSlots, v, slots.includes(k) ? k : `${name}:${k}`);
    }
  }
  const texSource = (t) => t.extensions?.KHR_texture_basisu?.source ?? t.extensions?.EXT_texture_webp?.source ?? t.extensions?.EXT_texture_avif?.source ?? t.source;
  const usedImages = new Map();
  for (const [ti, slots] of texSlots) { const s = texSource(json.textures[ti]); if (s !== undefined) { if (!usedImages.has(s)) usedImages.set(s, new Set()); slots.forEach((x) => usedImages.get(s).add(x)); } }
  const ignoredImages = new Map(); // referenced, but three.js never uploads them (see above)
  for (const [ti, slots] of ignoredSlots) { const s = texSource(json.textures[ti]); if (s !== undefined && !usedImages.has(s)) { if (!ignoredImages.has(s)) ignoredImages.set(s, new Set()); slots.forEach((x) => ignoredImages.get(s).add(x)); } }
  const imageRows = images.map((im, i) => {
    const info = im.data ? imageInfo(im.data, im.mime) : { format: im.mime || 'missing' };
    return { i, name: im.name, bytes: im.data?.length || 0, ...info, used: usedImages.has(i), slots: [...(usedImages.get(i) || ignoredImages.get(i) || [])], ignoredByThree: ignoredImages.has(i) || undefined, gpu: Math.round(gpuBytes(info)), dataUri: im.dataUri, hash: im.data ? createHash('sha1').update(im.data).digest('hex') : null };
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
  if (missing.length) add('over', `${missing.length} referenced file(s) missing next to the .gltf (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', …' : ''}): sizes and texture numbers below are incomplete`, 'copy the .bin and textures next to the .gltf, or inspect the packaged .glb');
  // A KTX2 header's transfer function decides how three.js samples it: data maps must be linear, colour maps sRGB.
  const DATA_SLOTS = new Set(['normalTexture', 'occlusionTexture', 'metallicRoughnessTexture']);
  const COLOUR_SLOTS = new Set(['baseColorTexture', 'emissiveTexture']);
  const dataAsSrgb = imageRows.filter((r) => r.format === 'ktx2' && r.transfer === 'srgb' && r.slots.some((x) => DATA_SLOTS.has(x)));
  if (dataAsSrgb.length) add('over', `${dataAsSrgb.length} KTX2 data texture(s) (${[...new Set(dataAsSrgb.flatMap((r) => r.slots))].join(', ')}) tagged sRGB: three.js will decode them as colour and the shading breaks`, 're-encode those slots as linear (gltf-transform uastc/etc1s set this from the slot; ktx2-encoder needs isInputSRGB: false and isSetKTX2SRGBTransferFunc: false)');
  const colourAsLinear = imageRows.filter((r) => r.format === 'ktx2' && r.transfer === 'linear' && r.slots.some((x) => COLOUR_SLOTS.has(x)) && !r.slots.some((x) => DATA_SLOTS.has(x)));
  if (colourAsLinear.length) add('over', `${colourAsLinear.length} KTX2 colour texture(s) tagged linear: colours will look washed out`, 're-encode base colour / emissive with the sRGB transfer function');
  // Glass on GPU instances: three.js scales transmission thickness by modelMatrix only, not by the instance matrix.
  // When the instance SCALE is not 1 (quantize/optimize moves each mesh's scale there), the glass renders at the wrong
  // thickness (measured on the chess scene: the glass pawns darkened after optimize; see research S3).
  const volumeMat = (mi) => matKind(mi).transmissive;
  let glassInstances = 0, glassInstancesUnknown = 0, glassInstanced = 0;
  for (const i of reachable) {
    const n = nodes[i], inst = n.extensions?.EXT_mesh_gpu_instancing;
    if (!inst || n.mesh === undefined || !meshes[n.mesh].primitives.some((p) => volumeMat(p.material))) continue;
    glassInstanced++;
    const a = acc[inst.attributes?.SCALE];
    if (!a) continue;
    const bv = json.bufferViews[a.bufferView];
    if (a.componentType !== 5126 || !bv || bv.extensions?.EXT_meshopt_compression || bv.extensions?.KHR_meshopt_compression) { if (ext.has('KHR_mesh_quantization')) glassInstancesUnknown++; continue; }
    const d = view(a.bufferView);
    if (!d) continue;
    const stride = bv.byteStride || 12, off = a.byteOffset || 0;
    for (let k = 0; k < a.count; k++) for (let c = 0; c < 3; c++) if (Math.abs(d.readFloatLE(off + k * stride + c * 4) - 1) > 1e-3) { glassInstances++; k = a.count; break; }
  }
  if (glassInstances || glassInstancesUnknown) add(glassInstances ? 'over' : 'advice', `${glassInstances || glassInstancesUnknown} GPU-instanced node(s) with transmission/volume materials${glassInstances ? ' and a non-unit instance scale' : ' (instance scale compressed; probably non-unit after quantization)'}: three.js ignores instance scale for glass thickness, so the glass renders too thick or too thin`, `re-run the pipeline from the un-instanced source with --instance false, or use --compress draco (its decoded positions keep their scale; meshopt/quantize move it into the instances)`);
  const allKtx2 = images.length > 0 && imageRows.filter((r) => r.used).every((r) => r.format === 'ktx2');
  // Geometry codec for the pipeline. Meshopt by default (7 KB decoder instead of 59 KB, compresses animation too; on
  // transfer size after brotli the two were within ±10 % on multi-mesh models, research S3). Keep Draco when the input
  // is already Draco: gltf-transform decodes it on read and re-encodes at its own defaults, and on the Khronos KTX2 +
  // Draco chess scene the geometry went 0.73 → 1.51 MB with Draco, → 2.41 MB with meshopt (run-modelcheck).
  // Keep Draco too when glass is already GPU-instanced (see glassInstanced below).
  const dracoIn = ext.has('KHR_draco_mesh_compression');
  const geoCodec = dracoIn || glassInstanced ? 'draco' : 'meshopt';
  const specGloss = materials.some((m, mi) => usedMaterials.has(mi) && m.extensions?.KHR_materials_pbrSpecularGlossiness);
  if (size > budget.bytes) {
    add('over', `transfer ${MB(size)} > ${MB(budget.bytes)}${texShare > 0.5 ? ` — textures are ${Math.round(texShare * 100)} % of it: start there` : ''}`,
      allKtx2 && texShare > 0.25 ? `KTX2 is already GPU-compressed; to shrink the download, lower the size (re-encode from the source textures with --texture-size ${Math.max(256, budget.texture / 2)}), use ETC1S instead of UASTC where a slot tolerates it, or accept WebP (smaller file, 4× the GPU memory)`
        : texShare > 0.25 ? `gltf-transform optimize ${f} ${o} --compress ${geoCodec} --texture-compress webp --texture-size ${budget.texture}` : `gltf-transform optimize ${f} ${o} --compress ${geoCodec}`);
  }
  const meshopt = ext.has('EXT_meshopt_compression') || ext.has('KHR_meshopt_compression');
  if (!meshopt && !ext.has('KHR_draco_mesh_compression') && geoStored > 150e3)
    add('advice', `geometry stored uncompressed (${MB(geoStored)})`, `gltf-transform meshopt ${f} ${o}   # decoder 7 KB brotli vs Draco's 59 KB + a worker; also compresses animation`);
  if (drawnTris > budget.tris)
    add('over', `${Math.round(drawnTris).toLocaleString('en')} triangles drawn > ${budget.tris.toLocaleString('en')}${transmissionPass ? ` (incl. ${Math.round(opaqueTris + backfaceTris).toLocaleString('en')} redrawn for the transmission pass${backfaceTris ? `, ${Math.round(backfaceTris).toLocaleString('en')} of them back faces of double-sided glass, drawn only where WEBGL_multisampled_render_to_texture is missing` : ''})` : ''}`, `gltf-transform simplify ${f} ${o} --ratio 0.5 --error 0.001   # then check silhouettes; or bake detail into normal maps / LODs in the DCC tool`);
  const calls = drawCalls + transmissionPass;
  const shared = [...reachable].filter((i) => nodes[i].mesh !== undefined && !nodes[i].extensions?.EXT_mesh_gpu_instancing).map((i) => nodes[i].mesh);
  const repeats = shared.length - new Set(shared).size;
  if (calls <= budget.calls && repeats >= 4) add('advice', `${repeats} nodes reuse a mesh without GPU instancing`, `gltf-transform instance ${f} ${o} --min 2   # one draw call per repeated mesh`);
  if (calls > budget.calls) {
    add('over', `~${calls} draw calls > ${budget.calls}${transmissionPass ? ` (incl. ~${transmissionPass} for the transmission pass)` : ''}`,
      repeats >= 2 && !ext.has('EXT_mesh_gpu_instancing') ? `gltf-transform instance ${f} ${o} --min 2   # ${repeats} nodes reuse a mesh; three.js GLTFLoader turns this into InstancedMesh` : `gltf-transform optimize ${f} ${o} --join true --flatten true --palette true   # merges static meshes and materials`);
  }
  if (maxTex > budget.texture) add('over', `texture ${maxTex}px > ${budget.texture}px`, `gltf-transform resize ${f} ${o} --width ${budget.texture} --height ${budget.texture}`);
  if (texVram > budget.vram) {
    // Resizing to the tier's texture size may be enough; KTX2 only when it is not (it costs 2–3× the download of WebP).
    const resized = used.reduce((s2, r) => { const k = Math.min(1, budget.texture / Math.max(r.width || 1, r.height || 1)); return s2 + (r.format === 'ktx2' ? r.gpu : (r.width || 0) * k * (r.height || 0) * k * 4 * 4 / 3); }, 0);
    const half = budget.texture / 2;
    const resizedHalf = used.reduce((s2, r) => { const k = Math.min(1, half / Math.max(r.width || 1, r.height || 1)); return s2 + (r.format === 'ktx2' ? r.gpu : (r.width || 0) * k * (r.height || 0) * k * 4 * 4 / 3); }, 0);
    add('over', `texture GPU memory ~${MB(texVram)} > ${MB(budget.vram)}`, resized <= budget.vram
      ? `gltf-transform resize ${f} ${o} --width ${budget.texture} --height ${budget.texture}   # → ~${MB(resized)} as RGBA; KTX2 would cut it 4× more but costs 2.5–5× the download`
      : half >= 512 && resizedHalf <= budget.vram
        ? `gltf-transform resize ${f} ${o} --width ${half} --height ${half}   # → ~${MB(resizedHalf)} as RGBA (at ${budget.texture}px it would be ~${MB(resized)}); or KTX2 at ${budget.texture}px for the same memory and more detail, 2.5–5× the download (--ktx2)`
        : `KTX2 (see the pipeline line: UASTC level 2 for normal/ORM, ETC1S for colour)   # even resized RGBA would need ~${MB(resized)}; needs KTX-Software 4.4+ (ktx) on PATH`);
  }
  if (usedMaterials.size > budget.materials) add('over', `${usedMaterials.size} materials > ${budget.materials}`, `gltf-transform palette ${f} ${o}   # merges simple materials into palette textures`);
  const unused = { nodes: nodes.length - anyScene.size, meshes: meshes.length - new Set([...anyScene].map((i) => nodes[i].mesh).filter((x) => x !== undefined)).size, materials: materials.length - usedMaterials.size, images: imageRows.filter((r) => !r.used && !r.ignoredByThree).length };
  if (unused.meshes > 0 || unused.materials > 0 || unused.images > 0) add('advice', `unreferenced data: ${Object.entries(unused).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')}`, `gltf-transform prune ${f} ${o}`);
  if (dupImages > 0) add('advice', `${dupImages} duplicated image(s)`, `gltf-transform dedup ${f} ${o}`);
  const totalKeys = anims.reduce((s, a) => s + a.keyframes, 0);
  if (totalKeys > 5000 && !meshopt) add('advice', `${totalKeys.toLocaleString('en')} animation keyframes`, `gltf-transform resample ${f} ${o} && gltf-transform meshopt ${o} ${o}   # resample is lossless; meshopt also compresses animation`);
  if (imageRows.some((r) => r.dataUri) || (!isGLB && external.length > 3)) add('advice', !isGLB && external.length > 3 ? `.gltf with ${external.length} external files (${external.length + 1} requests)` : 'base64 data URIs (+33 % bytes)', `gltf-transform copy ${f} ${f.replace(/\.gltf$/i, '')}.glb`);
  const sgImages = imageRows.filter((r) => r.ignoredByThree && r.slots.some((x) => x.startsWith('KHR_materials_pbrSpecularGlossiness')));
  if (specGloss) add('over', `spec/gloss materials (KHR_materials_pbrSpecularGlossiness): three.js GLTFLoader (r147+) ignores the extension, so they render with their metal/rough fallback or untextured${sgImages.length ? ` (${sgImages.length} image(s) never uploaded; not counted above)` : ''}`, `gltf-transform metalrough ${f} ${o}   # converts to metal/rough (+ KHR_materials_specular/ior); the pipeline below starts with it`);
  const ignoredOther = imageRows.filter((r) => r.ignoredByThree && !sgImages.includes(r));
  if (ignoredOther.length) add('advice', `${ignoredOther.length} image(s) referenced only where three.js does not read them (${[...new Set(ignoredOther.flatMap((r) => r.slots))].slice(0, 4).join(', ')}): shipped bytes that never reach the GPU`, 'drop the unused extension or its textures in the DCC tool, or set the factor that enables them');
  if (costly.some((c) => /transmission|volume/.test(c))) add('advice', `${costly.filter((c) => /transmission|volume/.test(c)).join(', ')}: three.js renders an extra transmission pass`, 'keep glass for the hero only, or fake it with an alpha-blended material on phones');
  if (dracoIn) add('info', 'Draco geometry: the page needs the Draco decoder (59 KB WASM + wrapper, brotli; 81 KB JS fallback) and a worker, against 7 KB for meshopt', `for meshopt, re-export from the uncompressed source (re-encoding decoded Draco grew the lab's chess scene); the pipeline below keeps Draco`);
  // One pipeline for the whole file (the individual fixes above each start from the original).
  // Texture choice, measured: KTX2 buys 4× the texels per byte of GPU memory but costs 2.5–5× the download of WebP
  // at the same size (UASTC normal/ORM maps dominate). So: WebP at the tier's size if that fits the GPU budget; else
  // WebP at half that size (≥ 512) if that fits — the same GPU memory as KTX2 at full size, for a fraction of the bytes;
  // KTX2 only when neither fits, or when --ktx2 says the detail of the full size is needed.
  // Spec/gloss images start to count once metalrough has converted them.
  const plan = specGloss ? [...used, ...sgImages] : used;
  const vramAt = (c) => plan.reduce((s, r) => { const k = Math.min(1, c / Math.max(r.width || 1, r.height || 1)); return s + (r.format === 'ktx2' ? r.gpu : (r.width || 0) * k * (r.height || 0) * k * 4 * 4 / 3); }, 0);
  let cap = budget.texture;
  const vramResized = vramAt(cap);
  let texFmt = plan.length === 0 ? null : plan.every((r) => r.format === 'ktx2') ? null : vramResized > budget.vram ? 'ktx2' : 'webp';
  let halved = false;
  if (texFmt === 'ktx2' && !budget.ktx2 && cap / 2 >= 512 && vramAt(cap / 2) <= budget.vram) { texFmt = 'webp'; cap /= 2; halved = true; }
  const interactive = !!budget.interactive;
  // Glass already on GPU instances: quantization (meshopt/quantize) would move the mesh scale into the instances,
  // which three.js ignores for transmission thickness; Draco keeps positions at their scale (measured: PSNR 40 vs 36).
  const steps = [`--compress ${geoCodec}`];
  // KTX2: optimize's own ktx2 path runs UASTC at quality 4 (measured: > 10 min for one 1K texture on a shared 4-CPU
  // machine), so the pipeline leaves textures to explicit uastc (level 2, RDO, Zstandard) and etc1s steps.
  // Textures first: gltf-transform decodes meshopt on read and does not re-encode it, so optimize (meshopt) runs last.
  // metalrough before anything else; then the KTX2 steps; optimize last.
  const head = [];
  let cur = f;
  const then = (cmd) => { head.push(cmd(cur, o)); cur = o; };
  if (specGloss) then((a, b) => `gltf-transform metalrough ${a} ${b}`);
  const planMax = Math.max(0, ...plan.map((r) => Math.max(r.width || 0, r.height || 0)));
  if (texFmt === 'ktx2') {
    if (planMax > cap) then((a, b) => `gltf-transform resize ${a} ${b} --width ${cap} --height ${cap}`);
    then((a, b) => `gltf-transform uastc ${a} ${b} --slots '{normalTexture,occlusionTexture,metallicRoughnessTexture}' --level 2 --rdo --zstd 18`);
    then((a, b) => `gltf-transform etc1s ${a} ${b} --quality 255`);
  }
  if (texFmt === 'ktx2' || (plan.length && plan.every((r) => r.format === 'ktx2'))) steps.push('--texture-compress false');
  else {
    if (texFmt) steps.push(`--texture-compress ${texFmt}`);
    if (planMax > cap) steps.push(`--texture-size ${cap}`);
  }
  if (drawnTris <= budget.tris) steps.push('--simplify false');
  // optimize instances a mesh only from 5 copies; at 2 the lab's chess scene stored 1.85 MB of geometry instead of 3.01
  const glassRepeats = (() => { const seen = new Map(); for (const i of reachable) { const n = nodes[i]; if (n.mesh === undefined || n.extensions?.EXT_mesh_gpu_instancing) continue; if (meshes[n.mesh].primitives.some((p) => volumeMat(p.material))) seen.set(n.mesh, (seen.get(n.mesh) || 0) + 1); } return [...seen.values()].some((c) => c >= 2); })();
  if (glassRepeats && !glassInstanced) steps.push('--instance false');
  else if (repeats >= 2) steps.push('--instance-min 2');
  if (interactive) steps.push('--join false --flatten false --palette false');
  const pipeline = flags.some((x) => x.level !== 'info') ? `${head.map((x) => `${x} && `).join('')}gltf-transform optimize ${cur} ${o} ${steps.join(' ')}` : null;
  const pipelineNotes = [];
  if (pipeline && !interactive) pipelineNotes.push('optimize joins, flattens and palettes by default: if code addresses parts or materials by name (a configurator, a hover highlight), pass --interactive for a pipeline that keeps them');
  if (pipeline && (dracoIn || meshopt)) pipelineNotes.push(`the input is already ${dracoIn ? 'Draco' : 'meshopt'}-compressed: gltf-transform decodes it on read and re-encodes it at its own defaults (Draco: 14-bit positions, 10-bit normals, 12-bit UVs), so the output can be LARGER than the input even after simplify (Khronos KTX2 + Draco chess scene: 12.11 MB → 12.88 MB with --compress draco, 13.79 MB with meshopt, while triangles fell 68 %). Run the pipeline on the uncompressed source if you have it; otherwise compare the output's size with the input's before shipping${dracoIn ? '. Draco is kept because it grew less; meshopt\'s decoder is smaller (7 vs 59 KB brotli)' : ''}`);
  if (pipeline && specGloss) pipelineNotes.push('metalrough first: three.js does not read spec/gloss materials, so they must be converted before anything is shipped');
  if (pipeline && glassInstanced) pipelineNotes.push('Draco, not meshopt: glass (transmission/volume) is already GPU-instanced here, and quantization would put the mesh scale where three.js does not apply it to glass thickness');
  if (pipeline && glassRepeats && !glassInstanced) pipelineNotes.push('--instance false: repeated glass meshes stay separate objects, because three.js ignores instance scale for glass thickness once quantization moves the scale there');
  if (pipeline && halved) pipelineNotes.push(`WebP at ${cap}px: ${budget.texture}px RGBA would need ~${(vramResized / 1e6).toFixed(0)} MB of GPU memory, ${cap}px ~${(vramAt(cap) / 1e6).toFixed(0)} MB. If the model is shown large enough to need ${budget.texture}px detail, pass --ktx2 for KTX2 at ${budget.texture}px (same GPU memory, 2.5–5× the download)`);
  if (pipeline && texFmt === 'ktx2') pipelineNotes.push(`KTX2 because ${budget.ktx2 ? 'you asked for it' : `even ${cap}px RGBA textures would need ~${(vramResized / 1e6).toFixed(0)} MB of GPU memory`}; expect 2.5–5× the download of WebP. Needs KTX-Software 4.4+ (ktx) on PATH, or the ktx2-encoder npm package with linear data slots`);
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
    materials: materials.length, materialsUsed: usedMaterials.size, costlyMaterialFeatures: costly, blendPrimitives: blendPrims, doubleSidedBlendPrimitives: twoPassBlend, transmissionPassDraws: transmissionPass, transmissionBackfaceDraws: backfaceDraws, specGloss,
    textures: (json.textures || []).length, images: imageRows.map(({ hash, dataUri, i, ...r }) => r), maxTexture: maxTex,
    textureBytes: texBytes, textureGpuBytes: Math.round(texVram), geometryBytesStored: geoStored, geometryGpuBytes: geoGpu, animationBytesStored: animStored,
    cameras: (json.cameras || []).length, lights: (json.extensions?.KHR_lights_punctual?.lights || []).length,
    animations: anims, skins: skins.length, maxJoints: Math.max(0, ...skins), morphTargets, unused, duplicateImages: dupImages,
    missingFiles: missing, budget, flags, pipeline, pipelineNotes, loaderNeeds: needs, ok: !flags.some((x) => x.level === 'over'),
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
  for (const im of r.images) { const k = `${im.format}${im.codec ? '/' + im.codec : ''}${im.width ? ` ${im.width}×${im.height}` : ''}`; byFmt[k] = (byFmt[k] || 0) + 1; }
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
  console.log('usage: node model.mjs <file.glb|.gltf>… [--tier mobile|desktop|scene] [--max-bytes N] [--max-tris N] [--max-calls N] [--max-texture PX] [--max-vram MB] [--max-materials N] [--interactive] [--ktx2] [--json] [--fail]');
  console.log('tiers (starting points, not laws):');
  for (const [k, t] of Object.entries(TIERS)) console.log(`  ${k.padEnd(8)} ≤ ${t.bytes / 1e6} MB transfer, ≤ ${t.tris.toLocaleString('en')} triangles drawn, ≤ ${t.calls} draw calls, textures ≤ ${t.texture}px, texture GPU memory ≤ ${t.vram / 1e6} MB, ≤ ${t.materials} materials`);
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
if (args.ktx2) budget.ktx2 = true;
const results = [];
for (const file of args.files) {
  try { results.push(analyse(file, budget)); } catch (e) { results.push({ file, error: e.message, ok: false }); }
}
if (args.json) console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 1));
else for (const r of results) r.error ? console.log(`\n${r.file}: ${r.error}`) : print(r);
if (results.some((r) => r.error)) process.exit(2);
if (args.fail && results.some((r) => !r.ok)) process.exit(1);
