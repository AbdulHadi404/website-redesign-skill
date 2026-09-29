import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ITEMS, report, mount } from './shared.jsx';

function Row({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, display: 'flex', gap: 8, padding: 6, background: '#fff', margin: 4 }}>
      <button {...attributes} {...listeners} aria-label={`Reorder ${item.label}`}>⠿</button>{item.label}
    </li>
  );
}
function App() {
  const [items, setItems] = useState(ITEMS);
  useEffect(() => report('order', items.map((i) => i.label)), [items]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
      if (over && active.id !== over.id) setItems((xs) => arrayMove(xs, xs.findIndex((x) => x.id === active.id), xs.findIndex((x) => x.id === over.id)));
    }}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul aria-label="Project stages" style={{ listStyle: 'none', padding: 0, width: 320 }}>{items.map((i) => <Row key={i.id} item={i} />)}</ul>
      </SortableContext>
    </DndContext>
  );
}
mount(App, 'dnd-kit sortable');
