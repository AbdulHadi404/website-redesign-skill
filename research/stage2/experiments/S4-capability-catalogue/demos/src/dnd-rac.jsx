import React, { useEffect } from 'react';
import { GridList, GridListItem, Button, useDragAndDrop } from 'react-aria-components';
import { useListData } from 'react-stately';
import { ITEMS, report, mount } from './shared.jsx';

function App() {
  const list = useListData({ initialItems: ITEMS });
  useEffect(() => report('order', list.items.map((i) => i.label)), [list.items]);
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ 'text/plain': list.getItem(key).label })),
    onReorder(e) {
      if (e.target.dropPosition === 'before') list.moveBefore(e.target.key, e.keys);
      else if (e.target.dropPosition === 'after') list.moveAfter(e.target.key, e.keys);
    },
  });
  return (
    <GridList aria-label="Project stages" items={list.items} dragAndDropHooks={dragAndDropHooks} style={{ width: 320 }}>
      {(item) => (
        <GridListItem textValue={item.label} style={{ display: 'flex', gap: 8, padding: 6, background: '#fff', margin: 4 }}>
          <Button slot="drag" aria-label={`Reorder ${item.label}`}>⠿</Button>{item.label}
        </GridListItem>
      )}
    </GridList>
  );
}
mount(App, 'React Aria GridList DnD');
