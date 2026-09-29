import React, { useState } from 'react';
import { Command } from 'cmdk';
import { COMMANDS, GROUPS, report, mount } from './shared.jsx';

function App() {
  const [open, setOpen] = useState(false);
  return (<>
    <button onClick={() => setOpen(true)}>Open command palette</button>
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette">
      <Command.Input placeholder="Type a command or search…" />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        {GROUPS.map((g) => (
          <Command.Group key={g} heading={g}>
            {COMMANDS.filter((c) => c.group === g).map((c) => (
              <Command.Item key={c.id} value={c.label} onSelect={() => { report('ran', c.id); setOpen(false); }}>{c.label}</Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  </>);
}
mount(App, 'cmdk palette');
