// The pattern professional canvas tools use, on top of Konva: every object is also an option in a
// "Layers" listbox (roving selection, Delete removes) and the selection has an inspector of native number
// fields (keyboard + single-pointer alternative to dragging, WCAG 2.1.1 and 2.5.7), with a polite status message.
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { report, mount } from './shared.jsx';

const START = [
  { id: 'r1', name: 'Label background', x: 40, y: 40, w: 200, h: 120, fill: '#dfe6ff' },
  { id: 'r2', name: 'Logo block', x: 280, y: 60, w: 120, h: 80, fill: '#2449d8' },
  { id: 'r3', name: 'Price badge', x: 440, y: 120, w: 90, h: 90, fill: '#f2b705' },
];
function App() {
  const [shapes, setShapes] = useState(START);
  const [sel, setSel] = useState('r1');
  const [msg, setMsg] = useState('');
  const tr = useRef(null), refs = useRef({});
  useEffect(() => { tr.current.nodes(sel && refs.current[sel] ? [refs.current[sel]] : []); report('selected', sel || ''); }, [sel, shapes]);
  useEffect(() => report('shapes', shapes.map(({ id, x, y }) => ({ id, x, y }))), [shapes]);
  const cur = shapes.find((s) => s.id === sel);
  const describe = (s) => `${s.name}, ${s.w} by ${s.h} at ${s.x}, ${s.y}`;
  const update = (id, patch) => setShapes((xs) => xs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const onListKey = (e) => {
    const i = shapes.findIndex((s) => s.id === sel);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = shapes[Math.min(shapes.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      setSel(n.id);
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && cur) {
      e.preventDefault();
      const rest = shapes.filter((s) => s.id !== sel);
      setShapes(rest); setSel(rest[Math.min(i, rest.length - 1)]?.id || null);
      setMsg(`${cur.name} deleted. ${rest.length} objects left.`);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div>
        <h2 id="layers-h" style={{ fontSize: 14, margin: '0 0 4px' }}>Layers</h2>
        <ul role="listbox" aria-labelledby="layers-h" tabIndex={0} aria-activedescendant={sel ? 'opt-' + sel : undefined} onKeyDown={onListKey}
          style={{ listStyle: 'none', padding: 0, margin: 0, width: 220, border: '1px solid #ccc', background: '#fff' }}>
          {shapes.map((s) => <li key={s.id} id={'opt-' + s.id} role="option" aria-selected={s.id === sel} onClick={() => setSel(s.id)} style={{ padding: 6, background: s.id === sel ? '#e8ebf2' : 'transparent' }}>{describe(s)}</li>)}
        </ul>
        {cur && <fieldset style={{ marginTop: 12, width: 208 }}>
          <legend>Position of {cur.name}</legend>
          <label>X <input type="number" value={cur.x} onChange={(e) => update(cur.id, { x: +e.target.value })} style={{ width: 64 }} /></label>{' '}
          <label>Y <input type="number" value={cur.y} onChange={(e) => update(cur.id, { y: +e.target.value })} style={{ width: 64 }} /></label>
        </fieldset>}
        <p role="status" className="sr-only">{msg}</p>
      </div>
      <Stage width={600} height={320} style={{ background: '#fff' }} role="img" aria-label={`Label canvas: ${shapes.length} objects. Use the Layers list to select, the Position fields to move.`}>
        <Layer>
          {shapes.map((s) => <Rect key={s.id} ref={(n) => (refs.current[s.id] = n)} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} draggable
            onClick={() => setSel(s.id)} onDragEnd={(e) => update(s.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) })} />)}
          <Transformer ref={tr} />
        </Layer>
      </Stage>
    </div>
  );
}
mount(App, 'Konva editor with an accessible layer');
