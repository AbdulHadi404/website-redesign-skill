import React from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { mount } from './shared.jsx';

const elements = convertToExcalidrawElements([
  { type: 'rectangle', x: 60, y: 60, width: 200, height: 100, label: { text: 'Brief' } },
  { type: 'ellipse', x: 320, y: 80, width: 160, height: 100, label: { text: 'Build' } },
  { type: 'rectangle', x: 560, y: 60, width: 160, height: 100, label: { text: 'Launch' } },
]);
function App() {
  return (
    <div style={{ width: 900, height: 480 }}>
      <Excalidraw initialData={{ elements, scrollToContent: true }} excalidrawAPI={(api) => { window.excalidrawAPI = api; }} />
    </div>
  );
}
mount(App, 'Excalidraw');
