import React from 'react';
import { Splitter } from '@ark-ui/react/splitter';
import { mount } from './shared.jsx';

function App() {
  return (
    <Splitter.Root panels={[{ id: 'nav', minSize: 15, collapsible: true, collapsedSize: 0 }, { id: 'main' }]} defaultSize={[30, 70]} style={{ display: 'flex', height: 320, width: 900, background: '#fff' }}>
      <Splitter.Panel id="nav"><div data-testid="nav" style={{ height: '100%', background: '#eef' }}>Navigation</div></Splitter.Panel>
      <Splitter.ResizeTrigger id="nav:main" aria-label="Resize navigation" style={{ width: 6, background: '#99a', border: 0, padding: 0 }} />
      <Splitter.Panel id="main"><div data-testid="main" style={{ height: '100%' }}>Content</div></Splitter.Panel>
    </Splitter.Root>
  );
}
mount(App, 'Ark Splitter');
