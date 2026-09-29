// three.js measuring viewer (bundled by esbuild). window.view(params) loads one GLB and reports:
// initMs (decoders the file needs: Draco / Meshopt / Basis), loadMs (fetch + parse + geometry and texture decode),
// firstFrameMs (compile + upload + first draw, synced), frameMs (median steady frame, synced), draw calls, triangles,
// texture and geometry memory, and a PNG of a fixed camera for the pixel diff.
// Texture memory is MEASURED, not estimated: the WebGL2 context is wrapped so every texStorage2D / texImage2D /
// compressedTexImage2D three.js issues is recorded against the texture object it allocates; the bytes of the GL
// textures behind the materials' textures are summed from the internal format, size and mip levels requested.
// (What the driver adds on top, e.g. padding, is not visible to WebGL.) `repeat` loads the file a second time on
// the warm loader, to separate one-time decoder start-up (worker, WASM compile) from the decode itself.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const median = (xs) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const LIBS = '/nm/three/examples/jsm/libs';

// bytes per pixel (uncompressed) or per 4×4 block (compressed) of the internal formats three.js uses
const BPP = { 0x8058: 4, 0x8c43: 4, 0x8051: 3, 0x8c41: 3, 0x8229: 1, 0x822b: 2, 0x881a: 8, 0x8814: 16, 0x822d: 2, 0x822f: 4, 0x8d62: 2, 0x8056: 2, 0x8057: 2 };
const BLOCK = { 0x8e8c: 16, 0x8e8d: 16, 0x93b0: 16, 0x93d0: 16, 0x9278: 16, 0x9279: 16, 0x9274: 8, 0x9275: 8, 0x8d64: 8, 0x83f0: 8, 0x83f1: 8, 0x83f2: 16, 0x83f3: 16, 0x8c4c: 8, 0x8c4d: 8, 0x8c4e: 16, 0x8c4f: 16 };
const levelBytes = (fmt, w, h) => (BLOCK[fmt] ? Math.ceil(w / 4) * Math.ceil(h / 4) * BLOCK[fmt] : w * h * (BPP[fmt] ?? 4));
function instrument(gl) {
  const alloc = new Map(); // WebGLTexture → { bytes, fmt, w, h, levels }
  const bound = new Map();
  let unit = gl.getParameter(gl.ACTIVE_TEXTURE);
  const o = { activeTexture: gl.activeTexture.bind(gl), bindTexture: gl.bindTexture.bind(gl), texStorage2D: gl.texStorage2D.bind(gl), texImage2D: gl.texImage2D.bind(gl), compressedTexImage2D: gl.compressedTexImage2D.bind(gl) };
  gl.activeTexture = (u) => { unit = u; o.activeTexture(u); };
  gl.bindTexture = (t, tex) => { bound.set(`${unit}:${t}`, tex); o.bindTexture(t, tex); };
  const target = (t) => bound.get(`${unit}:${t}`);
  gl.texStorage2D = (t, levels, fmt, w, h) => {
    let bytes = 0;
    for (let l = 0; l < levels; l++) bytes += levelBytes(fmt, Math.max(1, w >> l), Math.max(1, h >> l));
    const tex = target(t);
    if (tex) alloc.set(tex, { bytes, fmt, w, h, levels });
    return o.texStorage2D(t, levels, fmt, w, h);
  };
  gl.texImage2D = (...a) => {
    const [t, level, fmt] = a;
    let w, h;
    if (a.length >= 8) { w = a[3]; h = a[4]; } else { const src = a[5]; w = src?.width || src?.videoWidth || 0; h = src?.height || src?.videoHeight || 0; }
    const tex = target(t);
    if (tex) { const r = alloc.get(tex) || { bytes: 0, fmt, w, h, levels: 0 }; r.bytes += levelBytes(fmt, w, h); r.levels++; if (level === 0) { r.w = w; r.h = h; } alloc.set(tex, r); }
    return o.texImage2D(...a);
  };
  gl.compressedTexImage2D = (...a) => {
    const [t, level, fmt, w, h, , data] = a;
    const tex = target(t);
    if (tex) { const r = alloc.get(tex) || { bytes: 0, fmt, w, h, levels: 0 }; r.bytes += data?.byteLength ?? levelBytes(fmt, w, h); r.levels++; alloc.set(tex, r); }
    return o.compressedTexImage2D(...a);
  };
  return alloc;
}

function textureBytes(t) {
  if (t.isCompressedTexture) return t.mipmaps.reduce((s, m) => s + m.data.byteLength, 0);
  const img = t.image; if (!img) return 0;
  const w = img.width || 0, h = img.height || 0;
  return w * h * 4 * (t.generateMipmaps !== false ? 4 / 3 : 1);
}

window.view = async ({ url, needs = [], frame = null, W = 800, H = 600, anim = null, frames = 12, azimuths = null, repeat = false }) => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.toneMapping = THREE.NeutralToneMapping;
  document.body.appendChild(renderer.domElement);
  const gl = renderer.getContext();
  const alloc = instrument(gl);
  const px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

  const loader = new GLTFLoader();
  const t0 = performance.now();
  if (needs.includes('draco')) { const d = new DRACOLoader().setDecoderPath(`${LIBS}/draco/gltf/`); await d._initDecoder(); loader.setDRACOLoader(d); }
  if (needs.includes('meshopt')) { await MeshoptDecoder.ready; loader.setMeshoptDecoder(MeshoptDecoder); }
  if (needs.includes('ktx2')) { const k = new KTX2Loader().setTranscoderPath(`${LIBS}/basis/`).detectSupport(renderer); await k.init(); loader.setKTX2Loader(k); }
  const initMs = performance.now() - t0;

  const t1 = performance.now();
  const gltf = await loader.loadAsync(url);
  const loadMs = performance.now() - t1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e6e1');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(gltf.scene);
  let mixer = null;
  if (anim && gltf.animations.length) {
    mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations[Math.min(anim.clip, gltf.animations.length - 1)]).play();
    mixer.setTime(anim.time);
  }
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene, true);
  const f = frame || { center: box.getCenter(new THREE.Vector3()).toArray(), size: box.getSize(new THREE.Vector3()).toArray() };
  const radius = 0.5 * Math.hypot(...f.size);
  const camera = new THREE.PerspectiveCamera(35, W / H, radius / 100, radius * 100);
  const dir = new THREE.Vector3(0.55, 0.35, 1).normalize();
  const c = new THREE.Vector3().fromArray(f.center);
  camera.position.copy(c).addScaledVector(dir, radius / Math.sin(THREE.MathUtils.degToRad(35 / 2)) * 1.05);
  camera.lookAt(c);

  const t2 = performance.now();
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera); sync();
  const firstFrameMs = performance.now() - t2;
  const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, programs: renderer.info.programs?.length };
  const png = renderer.domElement.toDataURL('image/png');
  // Optional turntable: re-render from several azimuths (degrees) around the vertical axis, same distance and height.
  let turntable = null;
  if (azimuths) {
    turntable = [];
    const off = camera.position.clone().sub(c);
    for (const a of azimuths) {
      camera.position.copy(c).add(off.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(a)));
      camera.lookAt(c);
      renderer.render(scene, camera);
      turntable.push(renderer.domElement.toDataURL('image/png'));
    }
  }

  const ft = [];
  for (let i = 0; i < frames; i++) { const s = performance.now(); if (mixer) mixer.update(1 / 60); renderer.render(scene, camera); sync(); ft.push(performance.now() - s); }
  if (mixer) mixer.setTime(anim.time);

  // memory: unique textures on materials, and geometry buffers
  const tex = new Set(), geos = new Set();
  let instances = 0, skinned = 0;
  gltf.scene.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    if (o.isInstancedMesh) instances += o.count;
    if (o.isSkinnedMesh) skinned++;
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) for (const v of Object.values(m)) if (v && v.isTexture) tex.add(v);
  });
  const texList = [...tex].map((t) => ({ w: t.image?.width, h: t.image?.height, compressed: !!t.isCompressedTexture, format: t.format, bytes: Math.round(textureBytes(t)) }));
  // measured: the GL allocations behind the materials' textures (textures sharing one GL object count once)
  const glTex = new Set();
  for (const t of tex) { const w = renderer.properties.get(t).__webglTexture; if (w) glTex.add(w); }
  let allocBytes = 0; const allocFormats = {}; let unallocated = 0;
  for (const w of glTex) { const r = alloc.get(w); if (!r) { unallocated++; continue; } allocBytes += r.bytes; const k = `0x${r.fmt.toString(16)}`; allocFormats[k] = (allocFormats[k] || 0) + 1; }
  let loadMs2 = null;
  if (repeat) { const t3 = performance.now(); await loader.loadAsync(url); loadMs2 = performance.now() - t3; }
  const exts = gl.getSupportedExtensions() || [];
  let geoBytes = 0;
  for (const g of geos) { for (const a of Object.values(g.attributes)) geoBytes += a.array.byteLength; if (g.index) geoBytes += g.index.array.byteLength; }
  return {
    initMs, loadMs, firstFrameMs, frameMs: median(ft), frame: f, info, instances, skinned,
    textureBytes: texList.reduce((s, t) => s + t.bytes, 0), textureAllocBytes: allocBytes, textureAllocFormats: allocFormats, glTextures: glTex.size, glTexturesNotAllocated: unallocated, loadMs2,
    msrtt: exts.includes('WEBGL_multisampled_render_to_texture'), bptc: exts.includes('EXT_texture_compression_bptc'), geometryBytes: geoBytes, textureCount: texList.length,
    compressedTextures: texList.filter((t) => t.compressed).length, maxTexture: Math.max(0, ...texList.map((t) => Math.max(t.w || 0, t.h || 0))),
    png, turntable,
  };
};
window.viewReady = true;
