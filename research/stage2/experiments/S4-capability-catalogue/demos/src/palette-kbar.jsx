import React from 'react';
import { KBarProvider, KBarPortal, KBarPositioner, KBarAnimator, KBarSearch, KBarResults, useMatches, useKBar } from 'kbar';
import { COMMANDS, report, mount } from './shared.jsx';

const actions = COMMANDS.map((c) => ({ id: c.id, name: c.label, section: c.group, perform: () => report('ran', c.id) }));
function Results() {
  const { results } = useMatches();
  return <KBarResults items={results} onRender={({ item, active }) => typeof item === 'string'
    ? <div style={{ padding: '4px 8px', fontSize: 12 }}>{item}</div>
    : <div style={{ padding: 8, background: active ? '#eef' : 'transparent' }}>{item.name}</div>} />;
}
function Opener() { const { query } = useKBar(); return <button onClick={() => query.toggle()}>Open command palette</button>; }
function App() {
  return (
    <KBarProvider actions={actions}>
      <Opener />
      <KBarPortal><KBarPositioner style={{ background: 'rgb(0 0 0 / .3)' }}><KBarAnimator style={{ width: 480, background: '#fff' }}>
        <KBarSearch defaultPlaceholder="Type a command or search…" />
        <Results />
      </KBarAnimator></KBarPositioner></KBarPortal>
    </KBarProvider>
  );
}
mount(App, 'kbar palette');
