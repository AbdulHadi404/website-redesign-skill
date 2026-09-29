#!/usr/bin/env node
// Print the report's tables (markdown) from results.json, so every number in the report can be traced to a run.
//   node tables.mjs [sprites|gltf|decode|modelscript|closeup|isolate|modelcheck|turntable|blender|licences]
// Timings print as "median (min–max)" over the runs stored in results.json.
import { readFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('./results.json', import.meta.url), 'utf8'));
const want = process.argv[2];
const KB = (b) => (b == null ? '–' : b >= 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${Math.round(b / 1e3)} KB`);
const n = (x, d = 1) => (x == null ? '–' : typeof x === 'number' ? (Math.round(x * 10 ** d) / 10 ** d).toString() : String(x));
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const out = (title, t) => console.log(`\n### ${title}\n\n${t}\n`);
// "median (min–max)" when the runner stored a range
const mr = (x, rg, d = 0) => (x == null ? '–' : rg ? `${n(x, d)} (${n(rg[0], d)}–${n(rg[1], d)})` : n(x, d));

if (!want || want === 'sprites') {
  const S = R.sprites;
  if (S) {
    const m = S.meta;
    const rows = [];
    for (const set of ['files', 'grid', 'atlas']) for (const fmt of ['png', 'png8', 'webp', 'avif']) {
      const k = `${set}-${fmt}`;
      rows.push([set, fmt, m.sets[set][fmt].requests, KB(m.sets[set][fmt].bytes), mr(S.load?.[k]?.totalMs, S.load?.[k]?.range?.totalMs), mr(S.loadH2?.[k]?.totalMs, S.loadH2?.[k]?.range?.totalMs), mr(S.decode?.[k]?.decodeMs, S.decode?.[k]?.range?.decodeMs, 1), KB(m.decodedRGBA[set])]);
    }
    out(`Sprite sets: 60 frames of 128 px (atlas ${m.atlas.width}×${m.atlas.height}, trimmed; grid ${m.grid.width}×${m.grid.height})`,
      table(['set', 'format', 'requests', 'bytes', 'load HTTP/1.1 9 Mbps/100 ms (ms)', 'load HTTP/2 (ms)', 'decode warm (ms)', 'decoded RGBA'], rows));
    if (S.quality) out('Lossy format quality (atlas, PSNR vs lossless PNG on mid-grey)', table(['format', 'PSNR dB'], Object.entries(S.quality).map(([k, v]) => [k, v.psnr ?? 'lossless'])));
    const draw = [];
    for (const [k, v] of Object.entries(S.canvasDraw || {})) draw.push(['Canvas 2D', k, mr(v.frameMs, v.range?.frameMs, 1), '–', '–']);
    for (const [k, v] of Object.entries(S.pixiDraw || {})) draw.push(['PixiJS (SwiftShader)', k, mr(v.frameMs, v.range?.frameMs, 1), mr(v.cpuMs, v.range?.cpuMs, 2), v.drawCalls]);
    out('300 animated sprites per frame (median ms; Canvas 2D is CPU raster here, Pixi GPU-emulated: compare within an engine only)', table(['engine', 'source', 'frame ms (synced)', 'CPU submit ms', 'draw calls'], draw));
    const misc = [];
    for (const [k, v] of Object.entries(S.parallax || {})) misc.push(['parallax 4 layers', k, mr(v.frameMs, v.range?.frameMs, 1), mr(v.cpuMs, v.range?.cpuMs, 2), v.drawCalls ?? '–']);
    for (const [k, v] of Object.entries(S.tilemap || {})) misc.push(['tile map 256×256', k + (v.sprites ? ` (${v.sprites} sprites)` : ''), mr(v.frameMs, v.range?.frameMs, 1), mr(v.cpuMs, v.range?.cpuMs, 2), v.drawCalls ?? '–']);
    for (const [k, v] of Object.entries(S.spineDraw || {})) misc.push(['spineboy run', k, mr(v.frameMs, v.range?.frameMs, 1), `${mr(v.cpuMs, v.range?.cpuMs, 2)} (update ${mr(v.updateMs, v.range?.updateMs, 2)})`, v.drawCalls]);
    out('Parallax, tile map, skeletal vs frames', table(['test', 'variant', 'frame ms (synced)', 'CPU ms', 'draw calls'], misc));
    if (S.bleed) {
      const modes = Object.keys(Object.values(S.bleed)[0]);
      out('Atlas bleeding: % of pixels inside a block of edge-to-edge tiles that picked up a neighbour (bleed) or went dark (seam)',
        table(['atlas', ...modes], Object.entries(S.bleed).map(([k, v]) => [k, ...modes.map((md) => (v[md].error ? 'err' : `${v[md].bleedPct} / ${v[md].seamPct}`))])));
    }
    if (S.cssSprite) out('CSS sprite animation, 12 sprites: main thread per second of animation, and composited layers (CDP LayerTree; area × 4 B/px, upper bound on raster memory)', table(['technique', 'Paint events/s', 'style recalcs/s', 'main-thread ms/s', 'layers drawing content', 'largest layer', 'layer area MB'], Object.entries(S.cssSprite).map(([k, v]) => [k, n(v.paintsPerSec), n(v.styleRecalcsPerSec), mr(v.mainThreadMsPerSec, v.range?.mainThreadMsPerSec, 2), v.layers ?? '–', v.largestLayerW ? `${v.largestLayerW}×${v.largestLayerH}` : '–', v.layerAreaMB != null ? n(v.layerAreaMB, 1) : '–'])));
    if (S.spine && !S.spine.error) {
      const sp = S.spine;
      out('Skeletal (Spine) vs baked frames of the same run cycle', table(['asset', 'bytes', 'notes'], [
        ['skeletal: .skel + .atlas + .png (all animations)', KB(sp.skeletal.total), `${sp.animations.length} animations; .skel gzip ${KB(sp.skeletal.skelGzip)}`],
        ['frames: run cycle packed (PNG)', KB(sp.frameAtlas.bytes.png), `${sp.frameCount} frames at 30 fps, atlas ${sp.frameAtlas.width}×${sp.frameAtlas.height}, decoded ${KB(sp.frameAtlas.decodedRGBA)}`],
        ['frames: run cycle packed (WebP q85)', KB(sp.frameAtlas.bytes.webp), ''],
        ['frames: run cycle packed (AVIF q60)', KB(sp.frameAtlas.bytes.avif), ''],
      ]));
    }
    if (S.runtimes) out('2D animation runtimes: minified ESM bundle of the import a project writes (+ WASM)', table(['runtime', 'JS gzip -9', 'WASM gzip -9', 'JS brotli', 'WASM brotli'], Object.entries(S.runtimes).filter(([k]) => !k.startsWith('sample')).map(([k, v]) => [k, KB(v.js?.gzip), v.wasm ? KB(v.wasm.gzip) : '–', KB(v.js?.brotli), v.wasm ? KB(v.wasm.brotli) : '–'])));
  }
}

if (!want || want === 'gltf') {
  const G = R.gltf;
  if (G) {
    for (const [name, m] of Object.entries(G.models)) {
      const rows = Object.entries(m.variants).filter(([v]) => !v.startsWith('geo-only')).map(([v, r]) => [v, KB(r.bytes), KB(r.brotli), (r.needs || []).join('+') || '–', mr(r.loadMs, r.range?.loadMs), mr(r.firstFrameMs, r.range?.firstFrameMs), r.triangles?.toLocaleString('en') ?? '–', r.drawCalls ?? '–', KB(r.textureAllocBytes ?? r.textureGpuBytes), r.diffPctOfObject ?? '–', r.psnr === null ? '∞' : r.psnr, n(r.buildMs / 1000, 1)]);
      out(`${name} — ${m.kind} — ${m.licence} (n = ${Object.values(m.variants)[0]?.n} runs per variant, one session)`, table(['variant', 'file', 'brotli', 'decoders', 'load+decode ms', 'first frame ms', 'triangles', 'draw calls', 'texture GPU (allocated)', 'Δ px % of object', 'PSNR dB', 'build s'], rows));
    }
    if (G.decoders) out('Decoder payloads', table(['decoder', 'files', 'gzip', 'brotli'], Object.entries(G.decoders).map(([k, arr]) => [k, arr.length, KB(arr.reduce((s, x) => s + x.gzip, 0)), KB(arr.reduce((s, x) => s + x.brotli, 0))])));
    if (G.modelScriptCheck) {
      const rows = Object.entries(G.modelScriptCheck).map(([k, v]) => [k, v.triangles.join(' / '), v.drawCalls.join(' / '), v.textureGpuBytes.map((x, i) => (i < 2 ? KB(x) : x)).join(' / ')]);
      const all = Object.values(G.modelScriptCheck), eq = (a) => a[2] === 1;
      out(`model.mjs (static) vs three.js (renderer.info; texture = texStorage2D allocations): value / value / ratio — ${all.length} variants; triangles equal in ${all.filter((v) => eq(v.triangles)).length}, draw calls in ${all.filter((v) => eq(v.drawCalls)).length}, texture bytes (ratio 1.00) in ${all.filter((v) => eq(v.textureGpuBytes) || (v.textureGpuBytes[0] === 0 && v.textureGpuBytes[1] === 0)).length}`, table(['model / variant', 'triangles', 'draw calls', 'texture GPU'], rows));
    }
  }
}

if (!want || want === 'decode') {
  const G = R.gltf;
  if (G) {
    const rows = [];
    for (const [name, m] of Object.entries(G.models)) for (const v of ['geo-only', 'geo-only draco', 'geo-only meshopt']) {
      const r = m.variants[v]; if (!r) continue;
      rows.push([name, v.replace('geo-only', 'geometry') || 'geometry', KB(r.bytes), KB(r.brotli), mr(r.initMs, r.range?.initMs, 1), mr(r.loadMs, r.range?.loadMs, 1), mr(r.loadMs2, r.range?.loadMs2, 1), r.n]);
    }
    if (rows.length) out('Geometry decode, textures removed: decoder init, first load (cold: includes Draco worker start and WASM compile), second load of the same file on the warm loader (ms, median (min–max))', table(['model', 'variant', 'file', 'brotli', 'decoder init', 'load cold', 'load warm', 'runs'], rows));
  }
}

if (!want || want === 'modelscript') {
  const M = R.modelscript;
  if (M) {
    const rows = Object.entries(M.models).map(([k, v]) => v.error ? [k, v.set || '', 'err: ' + v.error, '', '', ''] : [k, v.set, v.triangles.map((x) => x.toLocaleString('en')).join(' / '), v.drawCalls.join(' / '), v.textureGpuBytes.map(KB).join(' / '), v.allMatch ? 'yes' : 'NO']);
    out(`model.mjs vs three.js on models it was not built on (model.mjs / three.js) — ${M.summary.allThreeMatch}/${M.summary.models} match on all three (${Object.entries(M.summary.bySet || {}).map(([k, b]) => `${k}: ${b.allThreeMatch}/${b.models}`).join('; ')})`, table(['model', 'set', 'triangles', 'draw calls', 'texture GPU', 'all match'], rows));
  }
}

if (!want || want === 'closeup') {
  const C = R.closeup;
  if (C?.pipelineOutputs) {
    const rows = [];
    for (const [name, vs] of Object.entries(C.pipelineOutputs)) for (const [v, r] of Object.entries(vs)) rows.push([name, v, KB(r.bytes), r.normal.error ? 'err' : `${r.normal.diffPct} % · ${r.normal.psnr ?? '∞'} · ${r.normal.psnrObject ?? '∞'}`, r.closeup.error ? 'err' : `${r.closeup.diffPct} % · ${r.closeup.psnr ?? '∞'} · ${r.closeup.psnrObject ?? '∞'}`]);
    out('Pipeline outputs vs lab variants, against the original: pixels differing · PSNR whole view · PSNR over the object (dB)', table(['model', 'file', 'bytes', 'normal framing', `close-up (${C.zoom}× closer)`], rows));
  }
  if (C) for (const [name, vs] of Object.entries(C.models)) out(`${name} at hero size (camera ${C.zoom}× closer): difference from the original`, table(['variant', 'pixels differing %', 'PSNR dB'], Object.entries(vs).map(([v, r]) => [v, r.error ? 'err' : r.diffPct, r.error ? r.error : r.psnr ?? '∞'])));
}

if (!want || want === 'isolate') {
  const I = R.isolate;
  if (I) out(`${I.model}: gltf-transform optimize defaults switched off one at a time (textures untouched)`, table(['variant', 'bytes', 'triangles drawn', 'draw calls', 'instances', 'pixels differing % of view', 'PSNR dB'], Object.entries(I.variants).map(([k, v]) => [k, KB(v.bytes), v.trianglesDrawn?.toLocaleString('en'), v.drawCalls, v.instances, v.diffPctOfView, v.psnrView ?? '∞'])));
}

if (!want || want === 'modelcheck') {
  const M = R.modelcheck;
  if (M) {
    out('model.mjs: the printed pipeline, run as printed, before → after', table(['model / flags', 'bytes', 'brotli after', 'geometry stored', 'texture GPU', 'triangles drawn', 'draw calls', 'budget lines over after', 'run s'], Object.entries(M).filter(([, v]) => v && v.before).map(([k, v]) => [k, v.after ? `${KB(v.before.bytes)} → ${KB(v.after.bytes)}` : `${KB(v.before.bytes)} (${v.note || v.error})`, v.after ? KB(v.after.brotli) : '–', v.after ? `${KB(v.before.geometryBytesStored)} → ${KB(v.after.geometryBytesStored)}` : KB(v.before.geometryBytesStored), v.after ? `${KB(v.before.textureGpuBytes)} → ${KB(v.after.textureGpuBytes)}` : KB(v.before.textureGpuBytes), v.after ? `${v.before.trianglesDrawn.toLocaleString('en')} → ${v.after.trianglesDrawn.toLocaleString('en')}` : v.before.trianglesDrawn.toLocaleString('en'), v.after ? `${v.before.drawCalls} → ${v.after.drawCalls}` : v.before.drawCalls, v.after ? (v.after.over.join('; ') || 'none') : '–', v.ms ? n(v.ms / 1000) : '–'])));
    out('The same pipelines with the other geometry codec (Draco ↔ meshopt swapped)', table(['model / flags', 'printed codec: bytes · brotli · geometry', 'other codec: bytes · brotli · geometry'], Object.entries(M).filter(([, v]) => v && v.after && v.otherCodec && !v.otherCodec.error).map(([k, v]) => [k, `${v.pipeline.includes('--compress draco') ? 'draco' : 'meshopt'}: ${KB(v.after.bytes)} · ${KB(v.after.brotli)} · ${KB(v.after.geometryBytesStored)}`, `${v.otherCodec.pipeline.includes('--compress draco') ? 'draco' : 'meshopt'}: ${KB(v.otherCodec.bytes)} · ${KB(v.otherCodec.brotli)} · ${KB(v.otherCodec.geometryBytesStored)}`])));
  }
}

if (!want || want === 'turntable') {
  const T = R.turntable;
  if (T) out(`Turntable (${T.model}, ${T.frames} frames ${T.frameSize}) vs live viewer`, table(['option', 'bytes', 'requests'], [
    ...Object.entries(T.individual).map(([k, v]) => [`${T.frames} separate ${k}`, KB(v.bytes), v.requests]),
    ...Object.entries(T.sheet).map(([k, v]) => [`one sheet ${k} (${v.dims}, decoded ${KB(v.decodedRGBA)})`, KB(v.bytes), v.requests]),
    ...Object.entries(T.individual2x || {}).filter(([k]) => k !== 'frameSize').map(([k, v]) => [`${T.frames} separate ${k} at 2× (${T.individual2x.frameSize}, decoded ${KB(v.decodedRGBA)})`, KB(v.bytes), v.requests]),
    ['live: three.js viewer JS (gzip)', KB(T.live.threeViewerJs.gzip), 1],
    ...Object.entries(T.live.glb).map(([k, v]) => [`live: GLB ${k}`, KB(v.bytes), 1]),
  ]));
}

if (!want || want === 'blender') {
  const B = R.blender;
  if (B && !B.skipped) {
    out(`Blender ${B.blender} exports`, table(['export', 'bytes', 'export ms', 'nodes', 'meshes', 'draw calls', 'instances', 'triangles', 'images', 'extensions'], Object.entries(B.exports).map(([k, v]) => { const i = B.inspect[k] || {}; return [k, KB(v.bytes), v.ms, i.nodes, i.meshes, i.drawCalls, i.instances, i.triangles, (i.images || []).join(', ') || '–', (i.extensions || []).join(', ') || '–']; })));
    out('Bakes', table(['bake', 'ms', 'size', 'samples'], Object.entries(B.bakes).map(([k, v]) => [k, v.ms, v.size, v.samples])));
    const post = Object.entries(B.inspect).filter(([k]) => k.includes('→'));
    if (post.length) out('Post-processing the Blender exports with gltf-transform', table(['step', 'bytes', 'details'], post.map(([k, v]) => [k, KB(v.bytes), v.animations ? v.animations.map((a) => `${a.name}: ${a.keyframes} keys`).join(', ') + ` (animation ${KB(v.animationBytesStored)})` : [(v.extensions || []).join(', '), (v.images || []).join(', ')].filter(Boolean).join(' · ')])));
  }
}

if (!want || want === 'licences') {
  const L = R.licences;
  if (L) {
    out('Primary licence sources re-read', table(['source', 'status', 'sha256 (first 12)'], Object.entries(L.sources).map(([k, v]) => [k, v.status || v.error, (v.sha256 || '').slice(0, 12)])));
    out(`Khronos glTF-Sample-Assets @${L.khronosSampleAssets.commit.slice(0, 7)}: ${L.khronosSampleAssets.models} models`, table(['licence set', 'models'], Object.entries(L.khronosSampleAssets.census).sort((a, b) => b[1] - a[1])));
  }
}
