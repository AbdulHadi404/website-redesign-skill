// React Three Fiber with every decoration (and the selection ring) in ONE <instancedMesh>: the same
// GPU path as three-instanced (per-instance atlas rectangle patched into MeshBasicMaterial, one draw
// call), written the R3F way — one useFrame writes all instance matrices, R3F pointer events on the
// instanced mesh (e.instanceId) with pointer capture for drag, React state only for selection.
// It also shows the WebGL failure path R3F needs: <Canvas fallback> is <canvas> fallback content,
// which no browser shows when only WebGL is missing, and a failed renderer throws outwards; so check
// for WebGL before mounting and wrap the canvas in an error boundary whose fallback is the poster.
import { createRoot } from 'react-dom/client';
import { Component, useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree, addEffect, addAfterEffect } from '@react-three/fiber';
import { TextureLoader, PlaneGeometry, MeshBasicMaterial, Mesh, SRGBColorSpace, InstancedBufferAttribute, DynamicDrawUsage } from 'three';
import {
  W, H, CELL, RING, P_COUNT, FREEZE, ASSETS,
  readParams, installHarness, Model, particle, clampX, clampY, loadAtlas,
} from '../shared/scene.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');
const A = await loadAtlas();
const m = new Model(params.n, params.reduced);
const N = m.items.length + 1; // + the selection ring
const now = () => (params.freeze ? FREEZE.t : performance.now());
const wx = (x) => x - W / 2, wy = (y) => H / 2 - y;
const rect = (name) => { const f = A.frames[name]; return [f.x / A.w, 1 - (f.y + f.h) / A.h, f.w / A.w, f.h / A.h]; };
const rects = Object.fromEntries(Object.keys(A.frames).map((k) => [k, rect(k)]));

// slot → item id (or -1 for the ring), in draw order; rebuilt when z-order or selection changes.
let slots = [];
function layoutSlots(uv) {
  const o = m.order;
  slots = m.selected >= 0 ? [...o.slice(0, -1), -1, o[o.length - 1]] : [...o, -1];
  slots.forEach((id, k) => uv.array.set(id < 0 ? rects.ring : rects[m.items[id].frame], k * 4));
  uv.needsUpdate = true;
}
// Topmost item under the pointer: the hit with the highest slot (later slots draw on top).
function topHit(intersections) {
  let best = -1, bk = -1;
  for (const h of intersections) {
    if (h.instanceId == null) continue;
    const id = slots[h.instanceId];
    if (id >= 0 && h.instanceId > bk) { bk = h.instanceId; best = id; }
  }
  return best;
}

function Decorations({ atlas }) {
  const ref = useRef();
  const invalidate = useThree((s) => s.invalidate);
  const [, setSelected] = useState(-1);                    // React re-renders only on selection
  const { geom, mat, uv } = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    const u = new InstancedBufferAttribute(new Float32Array(N * 4), 4);
    g.setAttribute('uvRect', u);
    const mt = new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false });
    mt.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 uvRect;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * uvRect.zw + uvRect.xy;');
    };
    return { geom: g, mat: mt, uv: u };
  }, [atlas]);
  const select = (id) => { m.selected = id; if (id >= 0) m.raise(id); layoutSlots(uv); setSelected(id); invalidate(); };
  useEffect(() => {
    ref.current.instanceMatrix.setUsage(DynamicDrawUsage);
    if (params.freeze) m.freeze();
    select(m.selected);
    st.mounted = true;
  }, []);
  useFrame(() => {
    const t = now();
    m.prune(t);
    const M = ref.current.instanceMatrix.array;
    const put = (k, x, y, s) => { const o = k * 16; M.fill(0, o, o + 16); M[o] = s; M[o + 5] = s; M[o + 10] = 1; M[o + 12] = wx(x); M[o + 13] = wy(y); M[o + 15] = 1; };
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
    ref.current.instanceMatrix.needsUpdate = true;
  });
  const local = (e) => { const r = e.nativeEvent.target.getBoundingClientRect(); return [e.nativeEvent.clientX - r.left, e.nativeEvent.clientY - r.top]; };
  return (
    <instancedMesh
      ref={ref} args={[geom, mat, N]} frustumCulled={false}
      onPointerDown={(e) => {
        const id = topHit(e.intersections);
        if (id < 0) return;
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
        const [x, y] = local(e); const it = m.items[id];
        m.drag = { id, ox: x - it.x, oy: y - it.y };
        lab.picked.push(id);
        select(id);
      }}
      onPointerMove={(e) => {
        const [x, y] = local(e);
        if (m.drag) { const it = m.items[m.drag.id]; it.x = clampX(x - m.drag.ox); it.y = clampY(y - m.drag.oy); invalidate(); return; }
        const h = topHit(e.intersections);
        if (h !== m.hovered) { m.hovered = h; e.nativeEvent.target.style.cursor = h >= 0 ? 'pointer' : 'default'; invalidate(); }
      }}
      onPointerOut={(e) => { if (!m.drag && m.hovered >= 0) { m.hovered = -1; e.nativeEvent.target.style.cursor = 'default'; invalidate(); } }}
      onPointerUp={(e) => {
        if (!m.drag) return;
        e.target.releasePointerCapture(e.pointerId);
        if (m.up(now())) lab.drop();
        invalidate();
      }}
    />
  );
}

function Particles({ atlas }) {
  const pool = useMemo(() => Array.from({ length: P_COUNT * 4 }, () => {
    const g = new PlaneGeometry(16, 16); const r = rects.spark;
    g.attributes.uv.array.set([r[0], r[1] + r[3], r[0] + r[2], r[1] + r[3], r[0], r[1], r[0] + r[2], r[1]]);
    const me = new Mesh(g, new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false }));
    me.renderOrder = 10; me.visible = false; return me;
  }), [atlas]);
  useFrame(() => {
    const t = now();
    let k = 0;
    for (const b of m.bursts) {
      const age = t - b.t0;
      for (let i = 0; i < P_COUNT && k < pool.length; i++) {
        const p = particle(i, age); if (!p) continue;
        const me = pool[k++]; me.visible = true; me.position.set(wx(b.x + p.dx), wy(b.y + p.dy), 90); me.scale.setScalar(p.scale); me.material.opacity = p.alpha;
      }
    }
    for (; k < pool.length; k++) pool[k].visible = false;
  });
  return <group>{pool.map((o, i) => <primitive key={i} object={o} />)}</group>;
}

const st = { mounted: false };
function Scene() {
  const [atlas, bg] = useLoader(TextureLoader, [ASSETS + 'atlas.png', ASSETS + 'bg.png']);
  atlas.colorSpace = SRGBColorSpace; bg.colorSpace = SRGBColorSpace;
  const invalidate = useThree((s) => s.invalidate);
  return (
    <>
      <mesh position={[0, 0, -50]} renderOrder={-1} onPointerDown={() => { if (!m.drag) { m.selected = -1; invalidate(); } }}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={bg} depthTest={false} depthWrite={false} />
      </mesh>
      <Decorations atlas={atlas} />
      <Particles atlas={atlas} />
    </>
  );
}

const unsub = addAfterEffect(() => { if (st.mounted) { lab.markFirstFrame(); unsub(); } });
let t0 = null;
addEffect(() => { t0 = performance.now(); });
addAfterEffect(() => { if (t0 != null) { lab.cpu(performance.now() - t0); t0 = null; } });

// The failure path: a poster (the real picture of the scene) when WebGL is missing or the renderer throws.
const Poster = () => <img src={ASSETS + 'bg.png'} width={W} height={H} alt="A round cake on a table, ready to decorate (the interactive editor needs WebGL)" style={{ display: 'block' }} />;
class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { lab.errors.push(String(err?.message || err)); lab.info.renderer = 'poster'; lab.markFirstFrame(); }
  render() { return this.state.failed ? <Poster /> : this.props.children; }
}
const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

function App() {
  if (!hasWebGL()) { lab.info.renderer = 'poster'; requestAnimationFrame(() => lab.markFirstFrame()); return <Poster />; }
  return (
    <WebGLBoundary>
      <Canvas
        orthographic flat
        camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={Math.min(devicePixelRatio || 1, 2)}
        frameloop={params.reduced || params.freeze ? 'demand' : 'always'}
        style={{ width: W, height: H, touchAction: 'none' }}
        onCreated={({ gl }) => {
          lab.info.renderer = `r3f-instanced-${gl.capabilities.isWebGL2 ? 'webgl2' : 'webgl'}`;
          lab.drawCalls = () => gl.info.render.calls;
          for (const t of ['pointerdown', 'pointermove', 'pointerup']) gl.domElement.addEventListener(t, lab.input, { capture: true });
        }}
      >
        <Suspense fallback={null}><Scene /></Suspense>
      </Canvas>
    </WebGLBoundary>
  );
}

lab.getItem = (id) => ({ x: m.items[id].x, y: m.items[id].y });
lab.topId = () => m.order[m.order.length - 1];
createRoot(stage).render(<App />);
