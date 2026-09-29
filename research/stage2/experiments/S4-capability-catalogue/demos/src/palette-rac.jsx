import React, { useState } from 'react';
import { Autocomplete, Button, Dialog, DialogTrigger, Header, Input, Menu, MenuItem, MenuSection, Modal, ModalOverlay, SearchField, useFilter, Keyboard } from 'react-aria-components';
import { COMMANDS, GROUPS, report, mount } from './shared.jsx';

function App() {
  const [open, setOpen] = useState(false);
  const { contains } = useFilter({ sensitivity: 'base' });
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button>Open command palette</Button>
      <ModalOverlay isDismissable style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / .3)' }}>
        <Modal style={{ maxWidth: 480, margin: '10vh auto', background: '#fff', padding: 8 }}>
          <Dialog aria-label="Command palette">
            <Autocomplete filter={contains}>
              <SearchField aria-label="Search commands" autoFocus><Input placeholder="Type a command or search…" /></SearchField>
              <Menu onAction={(id) => { report('ran', String(id)); setOpen(false); }} renderEmptyState={() => 'No results found.'}>
                {GROUPS.map((g) => (
                  <MenuSection key={g}>
                    <Header>{g}</Header>
                    {COMMANDS.filter((c) => c.group === g).map((c) => (
                      <MenuItem key={c.id} id={c.id} textValue={c.label}>{c.label}</MenuItem>
                    ))}
                  </MenuSection>
                ))}
              </Menu>
            </Autocomplete>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
mount(App, 'React Aria palette');
