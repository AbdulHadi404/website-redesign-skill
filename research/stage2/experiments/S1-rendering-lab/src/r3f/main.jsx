// React Three Fiber: the three.js scene written as React components, idiomatically — one <mesh> per
// decoration with its own useFrame, R3F pointer events (raycast) with pointer capture for drag,
// positions mutated in refs (never React state per frame), React.memo so selection re-renders two items.
import { createRoot } from 'react-dom/client';
import { memo, useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree, addAfterEffect } from '@react-three/fiber';
import { TextureLoader, PlaneGeometry, MeshBasicMaterial, Mesh, SRGBColorSpace } from 'three';
import {
  W, H, HOVER_SCALE, SEL_SCALE, P_COUNT, FREEZE, ASSETS,
  readParams, installHarness, makeItems, bobY, particle, clampX, clampY, loadAtlas,
} from '../shared/scene.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');
const A = await loadAtlas();
const items = makeItems(params.n);
const n = items.length;
const now = () => (params.freeze ? FREEZE.t : performance.now());
const st = { drag: null, rank: items.map((it) => it.id + 1), top: n, topId: n - 1, bursts: [], rect: null, mounted: false };
const wx = (x) => x - W / 2, wy = (y) => H / 2 - y;

function geometryFor(name) {
  const f = A.frames[name];
  const g = new PlaneGeometry(f.w, f.h);
  const u0 = f.x / A.w, u1 = (f.x + f.w) / A.w, v1 = 1 - f.y / A.h, v0 = 1 - (f.y + f.h) / A.h;
  g.attributes.uv.array.set([u0, v1, u1, v1, u0, v0, u1, v0]);
  return g;
}

const Item = memo(function Item({ it, geom, ringGeom, mat, selected, onSelect }) {
  const ref = useRef(); const ringRef = useRef();
  const [hovered, setHovered] = useState(params.freeze && it.id === n - 2);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(() => {
    const me = ref.current;
    const dragging = st.drag?.id === it.id;
    const y = it.y + (params.reduced || dragging ? 0 : bobY(it, now()));
    const s = dragging || selected ? SEL_SCALE : hovered ? HOVER_SCALE : 1;
    const r = st.rank[it.id];
    me.position.set(wx(it.x), wy(y), r * 1e-3); me.renderOrder = r; me.scale.setScalar(s);
    const ring = ringRef.current;
    if (ring) { ring.position.set(wx(it.x), wy(y), r * 1e-3 - 1e-4); ring.renderOrder = r - 0.5; ring.scale.setScalar(s); }
  });
  return (
    <>
      <mesh
        ref={ref} geometry={geom} material={mat}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); invalidate(); }}
        onPointerOut={() => { setHovered(false); invalidate(); }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.target.setPointerCapture(e.pointerId);
          st.rect = e.nativeEvent.target.getBoundingClientRect();
          st.rank[it.id] = ++st.top; st.topId = it.id;
          st.drag = { id: it.id, ox: e.nativeEvent.clientX - st.rect.left - it.x, oy: e.nativeEvent.clientY - st.rect.top - it.y };
          lab.picked.push(it.id);
          onSelect(it.id); invalidate();
        }}
        onPointerMove={(e) => {
          if (st.drag?.id !== it.id) return;
          it.x = clampX(e.nativeEvent.clientX - st.rect.left - st.drag.ox);
          it.y = clampY(e.nativeEvent.clientY - st.rect.top - st.drag.oy);
          invalidate();
        }}
        onPointerUp={(e) => {
          if (st.drag?.id !== it.id) return;
          e.target.releasePointerCapture(e.pointerId);
          st.drag = null;
          if (!params.reduced) st.bursts.push({ x: it.x, y: it.y, t0: now() });
          lab.drop(); invalidate();
        }}
      />
      {selected && <mesh ref={ringRef} geometry={ringGeom} material={mat} />}
    </>
  );
});

function Particles({ geom, atlas }) {
  const pool = useMemo(() => Array.from({ length: P_COUNT * 4 }, () => {
    const me = new Mesh(geom, new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false }));
    me.renderOrder = 1e7; me.visible = false; return me;
  }), [geom, atlas]);
  useFrame(() => {
    const t = now();
    st.bursts = st.bursts.filter((b) => t - b.t0 < 600);
    let k = 0;
    for (const b of st.bursts) {
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

function Scene() {
  const [atlas, bg] = useLoader(TextureLoader, [ASSETS + 'atlas.png', ASSETS + 'bg.png']);
  atlas.colorSpace = SRGBColorSpace; bg.colorSpace = SRGBColorSpace;
  const geoms = useMemo(() => Object.fromEntries(Object.keys(A.frames).map((k) => [k, geometryFor(k)])), []);
  const mat = useMemo(() => new MeshBasicMaterial({ map: atlas, transparent: true, depthTest: false, depthWrite: false }), [atlas]);
  const [selected, setSelected] = useState(params.freeze ? n - 1 : -1);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    st.mounted = true;
    if (params.freeze) { st.rank[n - 1] = ++st.top; st.bursts = [{ x: FREEZE.burst.x, y: FREEZE.burst.y, t0: FREEZE.t - FREEZE.burst.age }]; }
    invalidate();
  }, []);
  return (
    <>
      <mesh position={[0, 0, -50]} renderOrder={-1} onPointerDown={() => setSelected(-1)}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={bg} depthTest={false} depthWrite={false} />
      </mesh>
      {items.map((it) => (
        <Item key={it.id} it={it} geom={geoms[it.frame]} ringGeom={geoms.ring} mat={mat} selected={selected === it.id} onSelect={setSelected} />
      ))}
      <Particles geom={geoms.spark} atlas={atlas} />
    </>
  );
}

const unsub = addAfterEffect(() => { if (st.mounted) { lab.markFirstFrame(); unsub(); } });

function App() {
  return (
    <Canvas
      orthographic flat
      camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      dpr={Math.min(devicePixelRatio || 1, 2)}
      frameloop={params.reduced || params.freeze ? 'demand' : 'always'}
      style={{ width: W, height: H, touchAction: 'none' }}
      onCreated={({ gl }) => {
        lab.info.renderer = `r3f-${gl.capabilities.isWebGL2 ? 'webgl2' : 'webgl'}`;
        for (const t of ['pointerdown', 'pointermove', 'pointerup']) gl.domElement.addEventListener(t, lab.input, { capture: true });
      }}
    >
      <Suspense fallback={null}><Scene /></Suspense>
    </Canvas>
  );
}

lab.getItem = (id) => ({ x: items[id].x, y: items[id].y });
lab.topId = () => st.topId;
createRoot(stage).render(<App />);
