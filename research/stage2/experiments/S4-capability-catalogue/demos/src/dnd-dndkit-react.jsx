import React, { useState, useEffect } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { ITEMS, report, mount } from './shared.jsx';

const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
function Row({ id, index }) {
  const { ref, handleRef } = useSortable({ id, index });
  return (
    <li ref={ref} style={{ display: 'flex', gap: 8, padding: 6, background: '#fff', margin: 4 }}>
      <button ref={handleRef} aria-label={`Reorder ${byId[id].label}`}>⠿</button>{byId[id].label}
    </li>
  );
}
function App() {
  const [ids, setIds] = useState(ITEMS.map((i) => i.id));
  useEffect(() => report('order', ids.map((i) => byId[i].label)), [ids]);
  return (
    <DragDropProvider onDragEnd={(event) => setIds((xs) => move(xs, event))}>
      <ul aria-label="Project stages" style={{ listStyle: 'none', padding: 0, width: 320 }}>{ids.map((id, index) => <Row key={id} id={id} index={index} />)}</ul>
    </DragDropProvider>
  );
}
mount(App, 'dnd-kit react');
