import React, { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { COMMANDS, GROUPS, report, mount } from './shared.jsx';

const grouped = GROUPS.map((g) => ({ value: g, items: COMMANDS.filter((c) => c.group === g) }));

function App() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>Open command palette</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / .3)' }} />
        <Dialog.Popup aria-label="Command palette" style={{ position: 'fixed', top: '10vh', left: '50%', translate: '-50% 0', width: 480, background: '#fff', padding: 8 }}>
          <Autocomplete.Root items={grouped} inline open autoHighlight itemToStringValue={(c) => c.label}>
            <Autocomplete.Input aria-label="Search commands" placeholder="Type a command or search…" />
            <Autocomplete.Empty>No results found.</Autocomplete.Empty>
            <Autocomplete.List>
              {(group) => (
                <Autocomplete.Group key={group.value} items={group.items}>
                  <Autocomplete.GroupLabel>{group.value}</Autocomplete.GroupLabel>
                  <Autocomplete.Collection>
                    {(c) => <Autocomplete.Item key={c.id} value={c} onClick={() => { report('ran', c.id); setOpen(false); }}>{c.label}</Autocomplete.Item>}
                  </Autocomplete.Collection>
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
          </Autocomplete.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
mount(App, 'Base UI palette');
