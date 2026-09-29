import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ITEMS, report, mount } from './shared.jsx';

function App() {
  const [items, setItems] = useState(ITEMS);
  useEffect(() => report('order', items.map((i) => i.label)), [items]);
  return (
    <DragDropContext onDragEnd={({ source, destination }) => {
      if (!destination) return;
      setItems((xs) => { const next = [...xs]; const [m] = next.splice(source.index, 1); next.splice(destination.index, 0, m); return next; });
    }}>
      <Droppable droppableId="stages">
        {(p) => (
          <ul ref={p.innerRef} {...p.droppableProps} aria-label="Project stages" style={{ listStyle: 'none', padding: 0, width: 320 }}>
            {items.map((it, i) => (
              <Draggable key={it.id} draggableId={it.id} index={i}>
                {(d) => <li ref={d.innerRef} {...d.draggableProps} {...d.dragHandleProps} style={{ padding: 6, background: '#fff', margin: 4, ...d.draggableProps.style }}>{it.label}</li>}
              </Draggable>
            ))}
            {p.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}
mount(App, 'hello-pangea dnd');
