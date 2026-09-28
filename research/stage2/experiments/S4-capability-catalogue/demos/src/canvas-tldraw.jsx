import React from 'react';
import { Tldraw, toRichText } from 'tldraw';
import 'tldraw/tldraw.css';
import { mount } from './shared.jsx';

function App() {
  return (
    <div style={{ position: 'relative', width: 900, height: 480 }}>
      <Tldraw onMount={(editor) => {
        window.editor = editor;
        editor.createShapes([
          { type: 'geo', x: 60, y: 60, props: { geo: 'rectangle', w: 200, h: 100, richText: toRichText('Brief') } },
          { type: 'geo', x: 320, y: 80, props: { geo: 'ellipse', w: 160, h: 100, richText: toRichText('Build') } },
          { type: 'geo', x: 560, y: 60, props: { geo: 'rectangle', w: 160, h: 100, richText: toRichText('Launch') } },
        ]);
        editor.selectNone();
      }} />
    </div>
  );
}
mount(App, 'tldraw');
