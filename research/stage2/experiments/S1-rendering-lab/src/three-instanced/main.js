// three.js, orthographic, but with every decoration (and the selection ring) in ONE InstancedMesh:
// a per-instance atlas rectangle (uvRect attribute patched into MeshBasicMaterial), instance slots in
// draw order. One draw call for all items, like PixiJS's automatic batching, but written by hand.
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, MeshBasicMaterial, TextureLoader,
  SRGBColorSpace, Raycaster, Vector2, InstancedMesh, InstancedBufferAttribute, DynamicDrawUsage,
} from 'three';
import {
  W, H, CELL, RING, P_COUNT, FREEZE, ASSETS,
  readParams, installHarness, Model, particle, clampX, clampY, loadAtlas,
} from '../shared/scene.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');
let renderer;
try { renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); } catch (e) {
  lab.errors.push(`WebGLRenderer: ${e.message}`); lab.info.renderer = 'none'; throw e;
}
lab.info.renderer = `three-instanced-${renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl'}`;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(W, H);
const cv = renderer.domElement;
cv.style.touchAction = 'none'; cv.style.display = 'block';
stage.append(cv);
for (const t of ['pointerdown', 'pointermove', 'pointerup']) cv.addEventListener(t, lab.input, { capture: true });

const loader = new TextureLoader();
const [A, atlas, bgTex] = await Promise.all([loadAtlas(), loader.loadAsync(ASSETS + 'atlas.png'), loader.loadAsync(ASSETS + 'bg.png')]);
atlas.colorSpace = SRGBColorSpace; bgTex.colorSpace = SRGBColorSpace;
const rect = (name) => { const f = A.frames[name]; return [f.x / A.w, 1 - (f.y + f.h) / A.h, f.w / A.w, f.h / A.h]; };

const scene = new Scene();
const camera = new OrthographicCamera(0, W, 0, -H, -100, 100);
const bg = new Mesh(new PlaneGeometry(W, H), new MeshBasicMaterial({ map: bgTex, depthTest: false, depthWrite: false }));
bg.position.set(W / 2, -H / 2, -50); bg.renderOrder = -1;
scene.add(bg);

const m = new Model(params.n, params.reduced);
const now = () => (params.freeze ? FREEZE.t : performance.now());
const N = m.items.length + 1; // + the selection ring
const mat = new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false });
mat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec4 uvRect;')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * uvRect.zw + uvRect.xy;');
};
const inst = new InstancedMesh(new PlaneGeometry(1, 1), mat, N);
inst.instanceMatrix.setUsage(DynamicDrawUsage);
const uv = new InstancedBufferAttribute(new Float32Array(N * 4), 4);
inst.geometry.setAttribute('uvRect', uv);
inst.frustumCulled = false;
scene.add(inst);
const ringRect = rect('ring');
const rects = Object.fromEntries(Object.keys(A.frames).map((k) => [k, rect(k)]));

// slot → item id (or -1 for the ring). Rebuilt when z-order or selection changes.
let slots = [];
function layoutSlots() {
  const o = m.order;
  slots = m.selected >= 0 ? [...o.slice(0, -1), -1, o[o.length - 1]] : [...o, -1];
  slots.forEach((id, k) => uv.array.set(id < 0 ? ringRect : rects[m.items[id].frame], k * 4));
  uv.needsUpdate = true;
}
layoutSlots();

const sparks = [];
const spark = (k) => {
  while (sparks.length <= k) {
    const s = new Mesh(new PlaneGeometry(16, 16), new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false }));
    const r = rects.spark; const a = s.geometry.attributes.uv.array;
    a.set([r[0], r[1] + r[3], r[0] + r[2], r[1] + r[3], r[0], r[1], r[0] + r[2], r[1]]);
    s.renderOrder = 10; scene.add(s); sparks.push(s);
  }
  return sparks[k];
};

function select(id) {
  m.selected = id;
  if (id >= 0) m.raise(id);
  layoutSlots();
}

const ray = new Raycaster();
const ndc = new Vector2();
function pick(e) {
  ndc.set((e.offsetX / W) * 2 - 1, -(e.offsetY / H) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // The orthographic ray starts at the camera's mid-depth (z = 0); items sit at z > 0 (renderOrder
  // tie-break), so start it in front of them or they are behind the ray and never hit.
  ray.ray.origin.z = 99;
  let best = -1, bk = -1;
  for (const h of ray.intersectObject(inst, false)) {
    const id = slots[h.instanceId];
    if (id >= 0 && h.instanceId > bk) { bk = h.instanceId; best = id; }
  }
  return best;
}
cv.addEventListener('pointerdown', (e) => {
  const id = pick(e);
  if (id < 0) { select(-1); invalidate(); return; }
  const it = m.items[id];
  select(id);
  m.drag = { id, ox: e.offsetX - it.x, oy: e.offsetY - it.y };
  cv.setPointerCapture(e.pointerId);
  lab.picked.push(id);
  invalidate();
});
cv.addEventListener('pointermove', (e) => {
  if (m.drag) {
    const it = m.items[m.drag.id];
    it.x = clampX(e.offsetX - m.drag.ox); it.y = clampY(e.offsetY - m.drag.oy);
    invalidate(); return;
  }
  const h = pick(e);
  if (h !== m.hovered) { m.hovered = h; cv.style.cursor = h >= 0 ? 'pointer' : 'default'; invalidate(); }
});
const end = () => { if (m.up(now())) lab.drop(); invalidate(); };
cv.addEventListener('pointerup', end);
cv.addEventListener('pointercancel', end);

const M = inst.instanceMatrix.array;
function put(k, x, y, sx) { const o = k * 16; M.fill(0, o, o + 16); M[o] = sx; M[o + 5] = sx; M[o + 10] = 1; M[o + 12] = x; M[o + 13] = -y; M[o + 15] = 1; }
function update() {
  const t = now();
  m.prune(t);
  for (let k = 0; k < slots.length; k++) {
    const id = slots[k];
    if (id < 0) {
      if (m.selected < 0) { put(k, 0, 0, 0); continue; }
      const it = m.items[m.selected];
      put(k, it.x, m.y(it, t), RING * m.scale(m.selected));
    } else {
      const it = m.items[id];
      put(k, it.x, m.y(it, t), CELL * m.scale(id));
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  let k = 0;
  for (const b of m.bursts) {
    const age = t - b.t0;
    for (let i = 0; i < P_COUNT; i++) {
      const p = particle(i, age); if (!p) continue;
      const s = spark(k++); s.visible = true; s.position.set(b.x + p.dx, -(b.y + p.dy), 90); s.scale.setScalar(p.scale); s.material.opacity = p.alpha;
    }
  }
  for (; k < sparks.length; k++) sparks[k].visible = false;
}
let first = true;
function frame() { const t0 = performance.now(); update(); renderer.render(scene, camera); lab.cpu(performance.now() - t0); if (first) { first = false; lab.markFirstFrame(); } }
let scheduled = false;
function invalidate() {
  if (!(params.reduced || params.freeze) || scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; frame(); });
}
if (params.freeze) { m.freeze(); select(m.selected); }
if (params.reduced || params.freeze) frame(); else renderer.setAnimationLoop(frame);

lab.getItem = (id) => ({ x: m.items[id].x, y: m.items[id].y });
lab.topId = () => m.order[m.order.length - 1];
lab.drawCalls = () => renderer.info.render.calls;
