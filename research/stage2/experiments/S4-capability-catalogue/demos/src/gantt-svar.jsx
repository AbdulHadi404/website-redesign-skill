import React from 'react';
import { Gantt, Willow } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/style.css';
import { mount, report, ITEMS } from './shared.jsx';

// Five tasks (the shared fixture labels), one week apart, three days long; the library's defaults otherwise.
const start = new Date(2026, 9, 5);
const day = (n) => new Date(start.getTime() + n * 86400000);
const tasks = ITEMS.map((it, i) => ({ id: i + 1, text: it.label, start: day(i * 5), end: day(i * 5 + 3), progress: 0, type: 'task' }));
const scales = [{ unit: 'month', step: 1, format: '%F %Y' }, { unit: 'day', step: 1, format: '%j' }];

function App() {
  const init = (api) => {
    window.__gantt = api;
    const sync = () => {
      const st = api.getState();
      report('selected', JSON.stringify(st.selected || []));
      report('tasks', String(api.getState().tasks.toArray ? api.getState().tasks.toArray().length : ''));
    };
    for (const ev of ['select-task', 'delete-task', 'update-task', 'move-task']) api.on(ev, () => setTimeout(sync, 0));
    setTimeout(sync, 0);
  };
  return (
    <div style={{ height: 360, width: 1100, background: '#fff' }}>
      <Willow><Gantt tasks={tasks} scales={scales} init={init} /></Willow>
    </div>
  );
}
mount(App, 'SVAR React Gantt');
