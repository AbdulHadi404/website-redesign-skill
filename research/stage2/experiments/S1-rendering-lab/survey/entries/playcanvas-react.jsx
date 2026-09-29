import { createRoot } from 'react-dom/client';
import { Application, Entity } from '@playcanvas/react';
import { Camera, Render, Light } from '@playcanvas/react/components';
import { useApp } from '@playcanvas/react/hooks';
import { useEffect } from 'react';
import { ready, host } from './_ready.js';
function Mark() { const app = useApp(); useEffect(() => { app?.once('frameend', () => ready('webgl')); }, [app]); return null; }
createRoot(host()).render(
  <div style={{ width: 800, height: 600 }}>
    <Application>
      <Entity position={[0, 0, 4]}><Camera /></Entity>
      <Entity rotation={[45, 30, 0]}><Light type="directional" /></Entity>
      <Entity><Render type="box" /></Entity>
      <Mark />
    </Application>
  </div>,
);
