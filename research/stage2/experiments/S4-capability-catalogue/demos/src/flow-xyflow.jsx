import React, { useCallback } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { mount } from './shared.jsx';

// Node "a" sets ariaLabel (the documented way to name a node); "b" and "c" rely on defaults.
const initialNodes = [
  { id: 'a', position: { x: 0, y: 0 }, data: { label: 'Order placed' }, ariaLabel: 'Order placed' },
  { id: 'b', position: { x: 220, y: 80 }, data: { label: 'Payment captured' } },
  { id: 'c', position: { x: 440, y: 0 }, data: { label: 'Shipped' } },
];
const initialEdges = [{ id: 'a-b', source: 'a', target: 'b' }, { id: 'b-c', source: 'b', target: 'c' }];

function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((p) => setEdges((es) => addEdge(p, es)), []);
  return (
    <div style={{ width: 900, height: 420, background: '#fff' }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
        <Background /><Controls />
      </ReactFlow>
    </div>
  );
}
mount(App, 'React Flow');
