// Pragmatic drag and drop gives pointer drag only; Atlassian's accessibility guidance is a drag-handle button
// that opens a menu of move actions, with a live-region announcement. This demo wires both.
import React, { useState, useEffect, useRef } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region';
import { ITEMS, report, mount } from './shared.jsx';

function MoveMenu({ item, index, count, onMove }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null), menu = useRef(null);
  const actions = [['Move up', index - 1, index > 0], ['Move down', index + 1, index < count - 1], ['Move to top', 0, index > 0], ['Move to bottom', count - 1, index < count - 1]];
  useEffect(() => { if (open) menu.current?.querySelector('[role=menuitem]:not([aria-disabled=true])')?.focus(); }, [open]);
  const onKeyDown = (e) => {
    const items = [...menu.current.querySelectorAll('[role=menuitem]:not([aria-disabled=true])')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === 'Escape') { setOpen(false); btn.current.focus(); }
  };
  return (<>
    <button ref={btn} aria-haspopup="menu" aria-expanded={open} aria-label={`Reorder ${item.label}`} onClick={() => setOpen((o) => !o)}>⠿</button>
    {open && <div ref={menu} role="menu" aria-label={`Move ${item.label}`} onKeyDown={onKeyDown} style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', marginTop: 28 }}>
      {actions.map(([label, to, ok]) => (
        <div key={label} role="menuitem" tabIndex={-1} aria-disabled={!ok || undefined} style={{ padding: 4, opacity: ok ? 1 : 0.5 }}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && ok) { e.preventDefault(); setOpen(false); onMove(index, to); } }}
          onClick={() => { if (ok) { setOpen(false); onMove(index, to); } }}>{label}</div>
      ))}
    </div>}
  </>);
}
function Row({ item, index, count, onMove }) {
  const ref = useRef(null);
  useEffect(() => combine(
    draggable({ element: ref.current, getInitialData: () => ({ id: item.id }) }),
    dropTargetForElements({ element: ref.current, getData: () => ({ id: item.id }) }),
  ), [item.id]);
  return <li ref={ref} data-id={item.id} style={{ display: 'flex', gap: 8, padding: 6, background: '#fff', margin: 4, position: 'relative' }}><MoveMenu item={item} index={index} count={count} onMove={onMove} />{item.label}</li>;
}
function App() {
  const [items, setItems] = useState(ITEMS);
  const [focusId, setFocusId] = useState(null);
  useEffect(() => report('order', items.map((i) => i.label)), [items]);
  useEffect(() => { if (focusId) document.querySelector(`[data-id=${focusId}] button`)?.focus(); }, [items, focusId]);
  useEffect(() => monitorForElements({ onDrop({ source, location }) {
    const t = location.current.dropTargets[0]; if (!t) return;
    setItems((xs) => reorder({ list: xs, startIndex: xs.findIndex((x) => x.id === source.data.id), finishIndex: xs.findIndex((x) => x.id === t.data.id) }));
  } }), []);
  const onMove = (from, to) => {
    const moved = items[from];
    setItems(reorder({ list: items, startIndex: from, finishIndex: to }));
    setFocusId(moved.id);
    announce(`${moved.label} moved to position ${to + 1} of ${items.length}`);
  };
  return <ul aria-label="Project stages" style={{ listStyle: 'none', padding: 0, width: 320 }}>{items.map((i, k) => <Row key={i.id} item={i} index={k} count={items.length} onMove={onMove} />)}</ul>;
}
mount(App, 'Pragmatic DnD + move menu');
