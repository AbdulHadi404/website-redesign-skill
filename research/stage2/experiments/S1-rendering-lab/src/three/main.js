// three.js, orthographic, flat sprites: one Mesh per decoration (shared material, per-frame UV
// geometry), Raycaster for hover and picking, renderOrder for z. The idiomatic scene-graph way;
// see ../three-instanced for the one-draw-call way.
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, MeshBasicMaterial, TextureLoader,
  SRGBColorSpace, Raycaster, Vector2,
} from 'three';
import {
  W, H, CELL, RING, SPARK, P_COUNT, FREEZE, ASSETS,
  readParams, installHarness, Model, particle, clampX, clampY, loadAtlas,
} from '../shared/scene.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');

let renderer;
try {
  renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  lab.errors.push(`WebGLRenderer: ${e.message}`);
  lab.info.renderer = 'none';
  throw e;
}
lab.info.renderer = `three-${renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl'}`;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(W, H);
renderer.domElement.style.touchAction = 'none';
renderer.domElement.style.display = 'block';
stage.append(renderer.domElement);
const cv = renderer.domElement;
for (const t of ['pointerdown', 'pointermove', 'pointerup']) cv.addEventListener(t, lab.input, { capture: true });

const loader = new TextureLoader();
const [atlasInfo, atlas, bgTex] = await Promise.all([loadAtlas(), loader.loadAsync(ASSETS + 'atlas.png'), loader.loadAsync(ASSETS + 'bg.png')]);
atlas.colorSpace = SRGBColorSpace; bgTex.colorSpace = SRGBColorSpace;

const scene = new Scene();
const camera = new OrthographicCamera(0, W, 0, -H, -100, 100); // y down: world y = -screen y
const bg = new Mesh(new PlaneGeometry(W, H), new MeshBasicMaterial({ map: bgTex, depthTest: false, depthWrite: false }));
bg.position.set(W / 2, -H / 2, -50); bg.renderOrder = -1;
scene.add(bg);

const geoms = {};
function geomFor(name) {
  if (geoms[name]) return geoms[name];
  const f = atlasInfo.frames[name];
  const g = new PlaneGeometry(f.w, f.h);
  const u0 = f.x / atlasInfo.w, u1 = (f.x + f.w) / atlasInfo.w;
  const v1 = 1 - f.y / atlasInfo.h, v0 = 1 - (f.y + f.h) / atlasInfo.h;
  g.attributes.uv.array.set([u0, v1, u1, v1, u0, v0, u1, v0]);
  return (geoms[name] = g);
}
const mat = new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false });

const m = new Model(params.n, params.reduced);
const now = () => (params.freeze ? FREEZE.t : performance.now());
let top = 0;
const meshes = m.items.map((it) => {
  const me = new Mesh(geomFor(it.frame), mat);
  me.userData.id = it.id;
  me.renderOrder = ++top;
  me.position.set(it.x, -it.y, top * 1e-3);
  scene.add(me);
  return me;
});
const ring = new Mesh(geomFor('ring'), mat);
ring.visible = false;
scene.add(ring);
const sparks = [];
const spark = (k) => {
  while (sparks.length <= k) {
    const s = new Mesh(geomFor('spark'), new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false }));
    s.renderOrder = 1e7; scene.add(s); sparks.push(s);
  }
  return sparks[k];
};

function select(id) {
  m.selected = id;
  if (id < 0) { ring.visible = false; return; }
  m.raise(id);
  meshes[id].renderOrder = ++top;
  ring.renderOrder = top - 0.5;
  ring.visible = true;
}

// Picking: the Raycaster against every item mesh, nearest (= highest z) wins.
const ray = new Raycaster();
const ndc = new Vector2();
function pick(e) {
  ndc.set((e.offsetX / W) * 2 - 1, -(e.offsetY / H) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(meshes, false);
  let best = -1, bz = -Infinity;
  for (const h of hits) if (h.object.position.z > bz) { bz = h.object.position.z; best = h.object.userData.id; }
  return best;
}
cv.addEventListener('pointerdown', (e) => {
  const id = pick(e);
  if (id < 0) { select(-1); invalidate(); return; }
  const it = m.items[id];
  select(id);
  meshes[id].position.z = top * 1e-3;
  m.drag = { id, ox: e.offsetX - it.x, oy: e.offsetY - it.y };
  cv.setPointerCapture(e.pointerId);
  lab.picked.push(id);
  invalidate();
});
cv.addEventListener('pointermove', (e) => {
  if (m.drag) {
    const it = m.items[m.drag.id];
    it.x = clampX(e.offsetX - m.drag.ox); it.y = clampY(e.offsetY - m.drag.oy);
    invalidate();
    return;
  }
  const h = pick(e);
  if (h !== m.hovered) { m.hovered = h; cv.style.cursor = h >= 0 ? 'pointer' : 'default'; invalidate(); }
});
const end = () => { if (m.up(now())) lab.drop(); invalidate(); };
cv.addEventListener('pointerup', end);
cv.addEventListener('pointercancel', end);

function update() {
  const t = now();
  m.prune(t);
  for (const it of m.items) {
    const me = meshes[it.id];
    me.position.x = it.x; me.position.y = -m.y(it, t);
    me.scale.setScalar(m.scale(it.id));
  }
  if (m.selected >= 0) {
    const me = meshes[m.selected];
    ring.position.set(me.position.x, me.position.y, me.position.z - 1e-4); ring.scale.copy(me.scale);
  }
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
function frame() {
  update();
  renderer.render(scene, camera);
  if (first) { first = false; lab.markFirstFrame(); }
}
let scheduled = false;
function invalidate() {
  if (!(params.reduced || params.freeze) || scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; frame(); });
}
if (params.freeze) { m.freeze(); select(m.selected); }
if (params.reduced || params.freeze) frame();
else renderer.setAnimationLoop(frame);

lab.getItem = (id) => ({ x: m.items[id].x, y: m.items[id].y });
lab.topId = () => m.order[m.order.length - 1];
lab.drawCalls = () => renderer.info.render.calls;
