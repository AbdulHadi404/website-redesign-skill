// three.js measuring viewer (bundled by esbuild). window.view(params) loads one GLB and reports:
// initMs (decoders the file needs: Draco / Meshopt / Basis), loadMs (fetch + parse + geometry and texture decode),
// firstFrameMs (compile + upload + first draw, synced), frameMs (median steady frame, synced), draw calls, triangles,
// texture and geometry memory, and a PNG of a fixed camera for the pixel diff.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const median = (xs) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const LIBS = '/nm/three/examples/jsm/libs';

function textureBytes(t) {
  if (t.isCompressedTexture) return t.mipmaps.reduce((s, m) => s + m.data.byteLength, 0);
  const img = t.image; if (!img) return 0;
  const w = img.width || 0, h = img.height || 0;
  return w * h * 4 * (t.generateMipmaps !== false ? 4 / 3 : 1);
}

window.view = async ({ url, needs = [], frame = null, W = 800, H = 600, anim = null, frames = 12, azimuths = null }) => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.toneMapping = THREE.NeutralToneMapping;
  document.body.appendChild(renderer.domElement);
  const gl = renderer.getContext();
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
  let geoBytes = 0;
  for (const g of geos) { for (const a of Object.values(g.attributes)) geoBytes += a.array.byteLength; if (g.index) geoBytes += g.index.array.byteLength; }
  return {
    initMs, loadMs, firstFrameMs, frameMs: median(ft), frame: f, info, instances, skinned,
    textureBytes: texList.reduce((s, t) => s + t.bytes, 0), geometryBytes: geoBytes, textureCount: texList.length,
    compressedTextures: texList.filter((t) => t.compressed).length, maxTexture: Math.max(0, ...texList.map((t) => Math.max(t.w || 0, t.h || 0))),
    png, turntable,
  };
};
window.viewReady = true;
