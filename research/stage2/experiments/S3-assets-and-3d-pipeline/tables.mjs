#!/usr/bin/env node
// Print the report's tables (markdown) from results.json, so every number in the report can be traced to a run.
//   node tables.mjs [sprites|gltf|turntable|blender|licences]
import { readFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('./results.json', import.meta.url), 'utf8'));
const want = process.argv[2];
const KB = (b) => (b == null ? '–' : b >= 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${Math.round(b / 1e3)} KB`);
const n = (x, d = 1) => (x == null ? '–' : typeof x === 'number' ? (Math.round(x * 10 ** d) / 10 ** d).toString() : String(x));
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const out = (title, t) => console.log(`\n### ${title}\n\n${t}\n`);

if (!want || want === 'sprites') {
  const S = R.sprites;
  if (S) {
    const m = S.meta;
    const rows = [];
    for (const set of ['files', 'grid', 'atlas']) for (const fmt of ['png', 'png8', 'webp', 'avif']) {
      const k = `${set}-${fmt}`;
      rows.push([set, fmt, m.sets[set][fmt].requests, KB(m.sets[set][fmt].bytes), n(S.load?.[k]?.totalMs, 0), n(S.loadH2?.[k]?.totalMs, 0), n(S.decode?.[k]?.decodeMs), KB(m.decodedRGBA[set])]);
    }
    out(`Sprite sets: 60 frames of 128 px (atlas ${m.atlas.width}×${m.atlas.height}, trimmed; grid ${m.grid.width}×${m.grid.height})`,
      table(['set', 'format', 'requests', 'bytes', 'load HTTP/1.1 9 Mbps/100 ms (ms)', 'load HTTP/2 (ms)', 'decode warm (ms)', 'decoded RGBA'], rows));
    if (S.quality) out('Lossy format quality (atlas, PSNR vs lossless PNG on mid-grey)', table(['format', 'PSNR dB'], Object.entries(S.quality).map(([k, v]) => [k, v.psnr ?? 'lossless'])));
    const draw = [];
    for (const [k, v] of Object.entries(S.canvasDraw || {})) draw.push(['Canvas 2D', k, n(v.frameMs), '–', '–']);
    for (const [k, v] of Object.entries(S.pixiDraw || {})) draw.push(['PixiJS (SwiftShader)', k, n(v.frameMs), n(v.cpuMs, 2), v.drawCalls]);
    out('300 animated sprites per frame (median ms; Canvas 2D is CPU raster here, Pixi GPU-emulated: compare within an engine only)', table(['engine', 'source', 'frame ms (synced)', 'CPU submit ms', 'draw calls'], draw));
    const misc = [];
    for (const [k, v] of Object.entries(S.parallax || {})) misc.push(['parallax 4 layers', k, n(v.frameMs), n(v.cpuMs, 2), v.drawCalls ?? '–']);
    for (const [k, v] of Object.entries(S.tilemap || {})) misc.push(['tile map 256×256', k + (v.sprites ? ` (${v.sprites} sprites)` : ''), n(v.frameMs), n(v.cpuMs, 2), v.drawCalls ?? '–']);
    for (const [k, v] of Object.entries(S.spineDraw || {})) misc.push(['spineboy run', k, n(v.frameMs), `${n(v.cpuMs, 2)} (update ${n(v.updateMs, 2)})`, v.drawCalls]);
    out('Parallax, tile map, skeletal vs frames', table(['test', 'variant', 'frame ms (synced)', 'CPU ms', 'draw calls'], misc));
    if (S.bleed) {
      const modes = Object.keys(Object.values(S.bleed)[0]);
      out('Atlas bleeding: % of pixels inside a block of edge-to-edge tiles that picked up a neighbour (bleed) or went dark (seam)',
        table(['atlas', ...modes], Object.entries(S.bleed).map(([k, v]) => [k, ...modes.map((md) => (v[md].error ? 'err' : `${v[md].bleedPct} / ${v[md].seamPct}`))])));
    }
    if (S.cssSprite) out('CSS sprite animation, 12 sprites, per second of animation', table(['technique', 'Paint events/s', 'style recalcs/s', 'main-thread ms/s'], Object.entries(S.cssSprite).map(([k, v]) => [k, n(v.paintsPerSec), n(v.styleRecalcsPerSec), n(v.mainThreadMsPerSec, 2)])));
    if (S.spine && !S.spine.error) {
      const sp = S.spine;
      out('Skeletal (Spine) vs baked frames of the same run cycle', table(['asset', 'bytes', 'notes'], [
        ['skeletal: .skel + .atlas + .png (all animations)', KB(sp.skeletal.total), `${sp.animations.length} animations; .skel gzip ${KB(sp.skeletal.skelGzip)}`],
        ['frames: run cycle packed (PNG)', KB(sp.frameAtlas.bytes.png), `${sp.frameCount} frames at 30 fps, atlas ${sp.frameAtlas.width}×${sp.frameAtlas.height}, decoded ${KB(sp.frameAtlas.decodedRGBA)}`],
        ['frames: run cycle packed (WebP q85)', KB(sp.frameAtlas.bytes.webp), ''],
        ['frames: run cycle packed (AVIF q60)', KB(sp.frameAtlas.bytes.avif), ''],
      ]));
    }
    if (S.runtimes) out('2D animation runtimes: minified ESM bundle of the import a project writes (+ WASM)', table(['runtime', 'JS gzip', 'JS brotli', 'WASM brotli'], Object.entries(S.runtimes).filter(([k]) => !k.startsWith('sample')).map(([k, v]) => [k, KB(v.js?.gzip), KB(v.js?.brotli), v.wasm ? KB(v.wasm.brotli) : '–'])));
  }
}

if (!want || want === 'gltf') {
  const G = R.gltf;
  if (G) {
    for (const [name, m] of Object.entries(G.models)) {
      const rows = Object.entries(m.variants).map(([v, r]) => [v, KB(r.bytes), (r.needs || []).join('+') || '–', n(r.loadMs, 0), n(r.firstFrameMs, 0), r.triangles?.toLocaleString('en') ?? '–', r.drawCalls ?? '–', KB(r.textureGpuBytes), r.diffPctOfObject ?? '–', r.psnr === null ? '∞' : r.psnr, n(r.buildMs / 1000, 1)]);
      out(`${name} — ${m.kind} — ${m.licence}`, table(['variant', 'file', 'decoders', 'load+decode ms', 'first frame ms', 'triangles', 'draw calls', 'texture GPU', 'Δ px % of object', 'PSNR dB', 'build s'], rows));
    }
    if (G.decoders) out('Decoder payloads', table(['decoder', 'files', 'gzip', 'brotli'], Object.entries(G.decoders).map(([k, arr]) => [k, arr.length, KB(arr.reduce((s, x) => s + x.gzip, 0)), KB(arr.reduce((s, x) => s + x.brotli, 0))])));
    if (G.modelScriptCheck) {
      const rows = Object.entries(G.modelScriptCheck).map(([k, v]) => [k, v.triangles.join(' / '), v.drawCalls.join(' / '), v.textureGpuBytes.map((x, i) => (i < 2 ? KB(x) : x)).join(' / ')]);
      out('model.mjs (static) vs three.js (measured): value / value / ratio', table(['model / variant', 'triangles', 'draw calls', 'texture GPU'], rows));
    }
  }
}

if (!want || want === 'turntable') {
  const T = R.turntable;
  if (T) out(`Turntable (${T.model}, ${T.frames} frames ${T.frameSize}) vs live viewer`, table(['option', 'bytes', 'requests'], [
    ...Object.entries(T.individual).map(([k, v]) => [`${T.frames} separate ${k}`, KB(v.bytes), v.requests]),
    ...Object.entries(T.sheet).map(([k, v]) => [`one sheet ${k} (${v.dims}, decoded ${KB(v.decodedRGBA)})`, KB(v.bytes), v.requests]),
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
