import React from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { mount } from './shared.jsx';

function App() {
  return (
    <div style={{ height: 320, width: 900, background: '#fff' }}>
      <Allotment defaultSizes={[270, 630]}>
        <Allotment.Pane minSize={135} snap><div data-testid="nav" style={{ height: '100%', background: '#eef' }}>Navigation</div></Allotment.Pane>
        <Allotment.Pane><div data-testid="main" style={{ height: '100%' }}>Content</div></Allotment.Pane>
      </Allotment>
    </div>
  );
}
mount(App, 'allotment');
