import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { mount } from './shared.jsx';

function App() {
  return (
    <Group orientation="horizontal" style={{ height: 320, width: 900, background: '#fff' }}>
      <Panel id="nav" defaultSize="30%" minSize="15%" collapsible collapsedSize="0%"><div data-testid="nav" style={{ height: '100%', background: '#eef' }}>Navigation</div></Panel>
      <Separator aria-label="Resize navigation" style={{ width: 6, background: '#99a' }} />
      <Panel id="main"><div data-testid="main" style={{ height: '100%' }}>Content</div></Panel>
    </Group>
  );
}
mount(App, 'react-resizable-panels');
