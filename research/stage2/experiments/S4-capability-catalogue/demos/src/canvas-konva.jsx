import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { mount } from './shared.jsx';

export const SHAPES = [
  { id: 'r1', name: 'Label background', x: 40, y: 40, w: 200, h: 120, fill: '#dfe6ff' },
  { id: 'r2', name: 'Logo block', x: 280, y: 60, w: 120, h: 80, fill: '#2449d8' },
  { id: 'r3', name: 'Price badge', x: 440, y: 120, w: 90, h: 90, fill: '#f2b705' },
];
function App() {
  const [sel, setSel] = useState(null);
  const tr = useRef(null), refs = useRef({});
  useEffect(() => { tr.current.nodes(sel ? [refs.current[sel]] : []); }, [sel]);
  return (
    <Stage width={640} height={320} style={{ background: '#fff', width: 640 }} onMouseDown={(e) => { if (e.target === e.target.getStage()) setSel(null); }}>
      <Layer>
        {SHAPES.map((s) => <Rect key={s.id} ref={(n) => (refs.current[s.id] = n)} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} draggable onClick={() => setSel(s.id)} />)}
        <Transformer ref={tr} />
      </Layer>
    </Stage>
  );
}
mount(App, 'Konva editor');
