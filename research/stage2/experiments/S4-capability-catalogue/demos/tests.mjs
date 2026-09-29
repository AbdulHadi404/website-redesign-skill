// Scenarios for the S4 demos: what a keyboard and screen-reader user can do with each library's default
// behaviour (plus the minimum wiring its docs ask for). Every check is a boolean or a recorded value.

const wait = (page, ms = 250) => page.waitForTimeout(ms);

// The focused element, described the way a screen reader would start: role, name, and the option a
// combobox points at through aria-activedescendant.
async function focusInfo(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: 'body' };
    const ad = el.getAttribute('aria-activedescendant');
    const act = ad ? document.getElementById(ad) : null;
    return {
      tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || null, label: el.getAttribute('aria-label') || null,
      text: (el.innerText || el.value || '').trim().slice(0, 60), roledescription: el.getAttribute('aria-roledescription'),
      activedescendant: act ? (act.innerText || '').trim().slice(0, 60) : null, describedby: el.getAttribute('aria-describedby') ? (el.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id)?.textContent?.trim()).join(' ').slice(0, 200)) : null,
    };
  });
}
async function axHas(page, name) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes.some((n) => !n.ignored && n.name?.value === name);
}
const tree = async (page, sel = 'body') => (await page.locator(sel).first().ariaSnapshot().catch((e) => 'ERR ' + e.message)).split('\n').slice(0, 45).join('\n');
const body = (page, key) => page.evaluate((k) => document.body.dataset[k] ?? null, key);
const shoot = async (page, file) => { if (file) await page.screenshot({ path: file, type: 'jpeg', quality: 70 }); };

// ── Command palettes ─────────────────────────────────────────────────────────────────────────────
function palette(library, { openKey } = {}) {
  return {
    library,
    async run(page, { shot }) {
      const c = {}, d = {};
      await page.focus('#before');
      await page.keyboard.press('Tab');
      d.trigger = await focusInfo(page);
      await page.keyboard.press('Enter');
      await wait(page, 500);
      c.opensFromKeyboard = (await page.locator('[role=dialog],[role=alertdialog]').count()) > 0 || (await page.locator('[role=combobox],[role=searchbox],input').count()) > 0 && (await page.locator('input:visible').count()) > 0;
      d.focusOnOpen = await focusInfo(page);
      c.focusInSearchField = d.focusOnOpen.tag === 'input';
      c.dialogHasName = await page.evaluate(() => { const dlg = document.querySelector('[role=dialog]'); return !!dlg && !!(dlg.getAttribute('aria-label') || dlg.getAttribute('aria-labelledby')); });
      // Chromium's own accessibility tree (CDP), not Playwright's ariaSnapshot: ariaSnapshot still lists
      // content made `inert`, which screen readers do not get (React Aria hides the background with inert).
      c.backgroundHiddenWhileOpen = !(await axHas(page, 'Before the demo'));
      d.ariaSnapshotListsBackground = (await tree(page)).includes('Before the demo');
      d.treeOpen = await tree(page, '[role=dialog]');
      if (d.treeOpen.startsWith('ERR')) d.treeOpen = await tree(page);
      await shoot(page, shot);
      c.inputRole = d.focusOnOpen.role || (await page.evaluate(() => document.activeElement?.type || null));
      c.groupHeadingsExposed = /group|heading|section/i.test(d.treeOpen) && /Navigate/.test(d.treeOpen);
      await page.keyboard.type('go', { delay: 40 });
      await wait(page, 350);
      c.optionsAfterFilter = await page.locator('[role=option]:visible,[role=menuitem]:visible').count();
      d.afterType = await focusInfo(page);
      await page.keyboard.press('ArrowDown');
      await wait(page, 700);
      d.afterArrow = await focusInfo(page);
      const active = d.afterArrow.activedescendant || (d.afterArrow.role === 'menuitem' || d.afterArrow.role === 'option' ? d.afterArrow.text : null)
        || await page.evaluate(() => document.querySelector('[aria-selected=true],[data-highlighted],[data-selected=true],[data-focused]')?.innerText?.trim() || null);
      c.activeItemExposed = !!(d.afterArrow.activedescendant || d.afterArrow.role === 'menuitem' || d.afterArrow.role === 'option');
      d.activeItem = active;
      await page.keyboard.press('Enter');
      await wait(page, 500);
      d.ran = await body(page, 'ran');
      c.enterRunsActiveCommand = !!d.ran && !!active && d.ran.replace('go-', '').slice(0, 5) === active.replace('Go to ', '').slice(0, 5).toLowerCase();
      c.closesAfterRun = (await page.locator('[role=dialog]:visible').count()) === 0 && (await page.locator('input:visible').count()) === 0;
      d.focusAfterRun = await focusInfo(page);
      c.focusReturnsToTrigger = /Open command palette/.test(d.focusAfterRun.text || '');
      // Empty state
      await page.focus('#before'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await wait(page, 500);
      const annBefore = (await page.evaluate(() => window.__ann.length));
      await page.keyboard.type('zzzz', { delay: 40 });
      await wait(page, 700);
      c.emptyStateShown = await page.getByText('No results', { exact: false }).first().isVisible().catch(() => false);
      const annAfter = await page.evaluate((n) => window.__ann.slice(n), annBefore);
      d.emptyAnnouncements = annAfter;
      c.resultCountOrEmptyAnnounced = annAfter.length > 0;
      const closed = async () => (await page.locator('[role=dialog]:visible').count()) === 0 && (await page.locator('input:visible').count()) === 0;
      await page.keyboard.press('Escape');
      await wait(page, 500);
      c.escapeCloses = await closed();
      if (!c.escapeCloses) { await page.keyboard.press('Escape'); await wait(page, 500); d.secondEscapeCloses = await closed(); }
      d.focusAfterEscape = await focusInfo(page);
      c.escapeReturnsFocus = /Open command palette/.test(d.focusAfterEscape.text || '');
      if (openKey) {
        await page.focus('#before');
        await page.keyboard.press(openKey);
        await wait(page, 500);
        c.globalShortcutOpens = (await page.locator('input:visible').count()) > 0;
      }
      return { checks: c, detail: d };
    },
  };
}

// ── Sortable lists (keyboard reordering) ─────────────────────────────────────────────────────────
// Every demo lists Brief, Wireframes, Visual design, Build, Launch and writes the order to body[data-order].
function sortable(library, drive) {
  return {
    library,
    async run(page, { shot }) {
      const c = {}, d = {};
      d.orderBefore = await body(page, 'order');
      d.tree = await tree(page, '#root');
      await shoot(page, shot);
      await page.focus('#before');
      await page.keyboard.press('Tab');
      d.firstStop = await focusInfo(page);
      c.dragHandleHasName = !!(d.firstStop.label || d.firstStop.text);
      c.instructionsAttached = !!d.firstStop.describedby;
      d.instructions = d.firstStop.describedby;
      const keys = await drive(page, d);
      d.keys = keys;
      await wait(page, 1200);
      d.orderAfter = await body(page, 'order');
      const after = JSON.parse(d.orderAfter || '[]');
      c.keyboardReorders = after.length === 5 && after.indexOf('Brief') > 0;
      d.newIndexOfBrief = after.indexOf('Brief');
      d.focusAfter = await focusInfo(page);
      c.focusStaysOnMovedItem = /Brief/.test(JSON.stringify(d.focusAfter));
      return { checks: c, detail: d };
    },
  };
}
const press = async (page, keys, gap = 180) => { for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(gap); } return keys; };

// ── Resizable panels ─────────────────────────────────────────────────────────────────────────────
function panels(library) {
  return {
    library,
    async run(page, { shot }) {
      const c = {}, d = {};
      const w = () => page.evaluate(() => Math.round(document.querySelector('[data-testid=nav]').getBoundingClientRect().width));
      d.widthStart = await w();
      d.tree = await tree(page, '#root');
      await shoot(page, shot);
      // Pointer drag first, from the separator's own box, then put the layout back with a reload.
      const box = await page.evaluate(() => { const r = document.querySelector('[data-testid=nav]').getBoundingClientRect(); return { x: r.right, y: r.top + r.height / 2 }; });
      await page.mouse.move(box.x + 3, box.y); await page.mouse.down(); await page.mouse.move(box.x + 83, box.y, { steps: 8 }); await page.mouse.up();
      await wait(page, 300);
      d.widthAfterPointer = await w();
      c.pointerResizes = d.widthAfterPointer !== d.widthStart;
      await page.reload(); await wait(page, 600);
      await page.focus('#before');
      await page.keyboard.press('Tab');
      d.firstStop = await focusInfo(page);
      c.separatorFocusable = await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && a.id !== 'after' && !a.closest('[data-testid=nav]') && !a.closest('[data-testid=main]'); });
      d.separator = await page.evaluate(() => { const a = document.activeElement; return Object.fromEntries([...a.attributes].filter((x) => /^(role|aria-|tabindex)/.test(x.name)).map((x) => [x.name, x.value])); });
      c.roleSeparator = d.separator.role === 'separator';
      c.hasValueNow = 'aria-valuenow' in d.separator;
      c.hasName = !!(d.separator['aria-label'] || d.separator['aria-labelledby']);
      await press(page, ['ArrowRight', 'ArrowRight', 'ArrowRight']);
      d.widthAfterArrows = await w();
      c.arrowsResize = d.widthAfterArrows > d.widthStart;
      d.valueAfterArrows = await page.evaluate(() => document.activeElement.getAttribute('aria-valuenow'));
      await press(page, ['End']);
      d.widthAfterEnd = await w();
      await press(page, ['Home']);
      d.widthAfterHome = await w();
      c.homeKey = d.widthAfterHome < d.widthAfterArrows;
      await press(page, ['Enter'], 300);
      d.widthAfterEnter = await w();
      c.enterTogglesCollapse = d.widthAfterEnter !== d.widthAfterHome;
      d.stepPercent = d.valueAfterArrows != null && d.separator['aria-valuenow'] != null ? (+d.valueAfterArrows - +d.separator['aria-valuenow']) / 3 : null;
      return { checks: c, detail: d };
    },
  };
}

// ── Node editor ──────────────────────────────────────────────────────────────────────────────────
const flow = {
  library: '@xyflow/react',
  async run(page, { shot }) {
    const c = {}, d = {};
    await page.waitForSelector('.react-flow__node');
    await wait(page, 500);
    d.tree = await tree(page, '#root');
    await shoot(page, shot);
    d.nodes = await page.evaluate(() => [...document.querySelectorAll('.react-flow__node')].map((n) => ({ id: n.dataset.id, role: n.getAttribute('role'), roledescription: n.getAttribute('aria-roledescription'), label: n.getAttribute('aria-label'), tabindex: n.getAttribute('tabindex'), describedby: !!n.getAttribute('aria-describedby') })));
    d.edges = await page.evaluate(() => [...document.querySelectorAll('.react-flow__edge')].map((n) => ({ role: n.getAttribute('role'), label: n.getAttribute('aria-label'), tabindex: n.getAttribute('tabindex'), roledescription: n.getAttribute('aria-roledescription') })));
    c.nodesFocusable = d.nodes.every((n) => n.tabindex === '0');
    c.nodesHaveNameByDefault = d.nodes.filter((n) => n.id !== 'a').every((n) => !!n.label);
    c.nodeNameWhenAriaLabelSet = !!d.nodes.find((n) => n.id === 'a')?.label;
    c.edgesFocusable = d.edges.length > 0 && d.edges.every((e) => e.tabindex === '0');
    c.edgesHaveName = d.edges.every((e) => !!e.label);
    c.edgeNamesUseNodeLabels = d.edges.every((e) => /Order placed|Payment|Shipped/.test(e.label || ''));
    d.wrapperRole = await page.evaluate(() => document.querySelector('.react-flow')?.getAttribute('role') || document.querySelector('[role=application]')?.className || null);
    c.handlesKeyboardReachable = await page.evaluate(() => [...document.querySelectorAll('.react-flow__handle')].some((h) => h.tabIndex >= 0));
    c.controlsNamed = await page.evaluate(() => [...document.querySelectorAll('.react-flow__controls button')].every((b) => !!b.getAttribute('aria-label') || !!b.title));
    // Tab to the first node, select, move
    await page.focus('#before');
    let found = false;
    for (let i = 0; i < 12 && !found; i++) { await page.keyboard.press('Tab'); found = await page.evaluate(() => document.activeElement?.classList.contains('react-flow__node')); }
    c.tabReachesNode = found;
    d.focusedNode = await focusInfo(page);
    const pos = () => page.evaluate(() => document.activeElement?.style.transform);
    d.posStart = await pos();
    await press(page, ['Enter']);
    c.enterSelects = await page.evaluate(() => document.activeElement?.classList.contains('selected'));
    await press(page, ['ArrowRight', 'ArrowRight', 'ArrowDown']);
    d.posAfter = await pos();
    c.arrowsMoveSelectedNode = d.posAfter !== d.posStart;
    await press(page, ['Backspace'], 400);
    d.nodeCountAfterDelete = await page.locator('.react-flow__node').count();
    c.deleteKeyRemovesNode = d.nodeCountAfterDelete === 2;
    d.edgeCountAfterDelete = await page.locator('.react-flow__edge').count();
    d.focusAfterDelete = await focusInfo(page);
    c.focusSurvivesDelete = d.focusAfterDelete.tag !== 'body';
    return { checks: c, detail: d };
  },
};

// ── Canvas editors ───────────────────────────────────────────────────────────────────────────────
const canvasRaw = {
  library: 'konva + react-konva (Transformer), no extra work',
  async run(page, { shot }) {
    const c = {}, d = {};
    await page.waitForSelector('canvas');
    await wait(page, 400);
    await shoot(page, shot);
    d.tree = await tree(page, '#root');
    c.shapesInAccessibilityTree = /Rectangle|Circle|Label/.test(d.tree);
    d.focusables = await page.evaluate(() => [...document.querySelectorAll('#root *')].filter((e) => e.tabIndex >= 0).length);
    c.anyFocusableInCanvas = d.focusables > 0;
    await page.focus('#before'); await page.keyboard.press('Tab');
    d.afterTab = await focusInfo(page);
    c.tabLeavesCanvasImmediately = d.afterTab.tag === 'button' && /After/.test(d.afterTab.text);
    return { checks: c, detail: d };
  },
};

const canvasA11y = {
  library: 'konva + react-konva + an accessible layers list and inspector (this lab)',
  async run(page, { shot }) {
    const c = {}, d = {};
    await page.waitForSelector('canvas');
    await wait(page, 400);
    d.tree = await tree(page, '#root');
    c.shapesInAccessibilityTree = /Logo block/.test(d.tree);
    await page.focus('#before'); await page.keyboard.press('Tab');
    d.first = await focusInfo(page);
    c.tabReachesLayers = d.first.role === 'listbox';
    await press(page, ['ArrowDown']);
    d.afterArrow = await focusInfo(page);
    d.selected = await body(page, 'selected');
    c.arrowSelectsShape = d.selected === 'r2';
    await shoot(page, shot);
    await press(page, ['Tab']);
    d.field = await focusInfo(page);
    const x0 = JSON.parse(await body(page, 'shapes')).find((s) => s.id === 'r2').x;
    await press(page, ['ArrowUp', 'ArrowUp', 'ArrowUp']);
    const x1 = JSON.parse(await body(page, 'shapes')).find((s) => s.id === 'r2').x;
    c.inspectorFieldMovesShape = x1 === x0 + 3;
    await press(page, ['Shift+Tab']);
    await press(page, ['Delete'], 300);
    c.deleteRemovesShape = JSON.parse(await body(page, 'shapes')).length === 2;
    d.focusAfterDelete = await focusInfo(page);
    c.focusStaysInList = d.focusAfterDelete.role === 'listbox';
    return { checks: c, detail: d };
  },
};

const tldraw = {
  library: 'tldraw (evaluated in a development environment; production needs a licence key)',
  async run(page, { shot }) {
    const c = {}, d = {};
    await page.waitForSelector('.tl-canvas', { timeout: 20000 });
    await wait(page, 1500);
    await shoot(page, shot);
    d.watermark = await page.evaluate(() => !!document.querySelector('[class*=watermark]'));
    d.tree = await tree(page, '#root');
    c.shapesInAccessibilityTree = /Rectangle|Ellipse|Brief|Build/.test(d.tree.replace(/button[^\n]*/g, ''));
    // Tab from the page start to the skip-to-canvas button
    await page.focus('#before');
    let found = null;
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); const f = await focusInfo(page); if (/canvas/i.test(f.text || f.label || '')) { found = f; break; } }
    c.skipToCanvasButton = !!found;
    d.skip = found;
    const n0 = (await page.evaluate(() => window.__ann.length));
    if (found) { await press(page, ['Enter'], 600); }
    d.afterSkip = await page.evaluate((n) => window.__ann.slice(n), n0);
    await press(page, ['Tab'], 500);
    d.afterTab = await page.evaluate((n) => window.__ann.slice(n), n0);
    c.selectionAnnounced = d.afterTab.some((a) => /of \d/.test(a));
    d.firstAnnouncementInInsertedRegion = d.afterTab.some((a) => a.startsWith('[inserted]'));
    d.watermarkText = await page.evaluate(() => document.querySelector('[class*=watermark]')?.innerText?.replace(/\s+/g, ' ').trim() || null);
    const before = await page.evaluate(() => JSON.stringify(window.editor?.getSelectedShapes().map((s) => [s.x, s.y])));
    await press(page, ['ArrowRight', 'ArrowRight'], 250);
    const after = await page.evaluate(() => JSON.stringify(window.editor?.getSelectedShapes().map((s) => [s.x, s.y])));
    d.move = [before, after];
    c.arrowsMoveSelection = !!before && before !== after && before !== '[]';
    return { checks: c, detail: d };
  },
};

const excalidraw = {
  library: '@excalidraw/excalidraw',
  async run(page, { shot }) {
    const c = {}, d = {};
    await page.waitForSelector('canvas', { timeout: 20000 });
    await wait(page, 1500);
    await shoot(page, shot);
    d.tree = await tree(page, '#root');
    c.shapesInAccessibilityTree = /Brief|Build|rectangle/i.test(d.tree.replace(/(button|radio)[^\n]*/g, ''));
    d.toolbar = (d.tree.match(/radio "[^"]+"/g) || []).slice(0, 12);
    c.toolbarNamed = d.toolbar.length > 5;
    // Can a keyboard user select one element? Try Tab through the app and look for a selection.
    await page.focus('#before');
    const sel = () => page.evaluate(() => (window.excalidrawAPI ? Object.keys(window.excalidrawAPI.getAppState().selectedElementIds).length : -1));
    let selected = 0;
    for (let i = 0; i < 40 && !selected; i++) { await page.keyboard.press('Tab'); selected = await sel(); }
    c.tabSelectsAnElement = selected > 0;
    // Select all by shortcut, then arrows move (click an empty spot of the canvas first so the app has focus)
    const box = await page.evaluate(() => { const r = document.querySelector('.excalidraw').getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height - 90 }; });
    await page.mouse.click(box.x, box.y);
    await press(page, ['Escape', 'Control+a'], 300);
    d.selectedAfterCtrlA = await sel();
    const pos = () => page.evaluate(() => JSON.stringify(window.excalidrawAPI.getSceneElements().map((e) => [e.x, e.y])));
    const p0 = await pos();
    await press(page, ['ArrowRight', 'ArrowRight']);
    c.arrowsMoveSelection = (await pos()) !== p0;
    return { checks: c, detail: d };
  },
};

// ── Gantt ────────────────────────────────────────────────────────────────────────────────────────
// SVAR React Gantt with its defaults: what a keyboard and screen-reader user can do with five tasks.
async function axSummary(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const live = nodes.filter((n) => !n.ignored);
  const roles = {};
  for (const n of live) { const r = n.role?.value; if (r) roles[r] = (roles[r] || 0) + 1; }
  const named = (re) => live.filter((n) => re.test(n.name?.value || '')).map((n) => `${n.role?.value}: ${n.name?.value}`.slice(0, 80));
  return { roles, taskNames: named(/^(Brief|Wireframes|Visual design|Build|Launch)$/) };
}
const gantt = {
  library: '@svar-ui/react-gantt (defaults)',
  async run(page, { shot }) {
    const c = {}, d = {};
    await page.waitForSelector('.wx-bar, [data-id]', { timeout: 8000 }).catch(() => {});
    await wait(page, 600);
    await shoot(page, shot);
    d.ax = await axSummary(page);
    c.gridRolesExposed = !!(d.ax.roles.grid || d.ax.roles.treegrid || d.ax.roles.table) && !!(d.ax.roles.row);
    c.taskNamesInTree = d.ax.taskNames.length >= 5;
    // Bars in the chart: focusable? named?
    d.bars = await page.evaluate(() => [...document.querySelectorAll('.wx-bar')].map((b) => ({ tabindex: b.getAttribute('tabindex'), role: b.getAttribute('role'), label: b.getAttribute('aria-label'), text: (b.innerText || '').trim().slice(0, 30) })));
    c.barsFocusable = d.bars.length > 0 && d.bars.every((b) => b.tabindex !== null && +b.tabindex >= 0);
    c.barsNamed = d.bars.length > 0 && d.bars.every((b) => !!b.label || !!b.text);
    // Tab through the widget: record each stop until focus leaves it.
    await page.focus('#before');
    d.tabStops = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const f = await focusInfo(page);
      const inside = await page.evaluate(() => !!document.activeElement?.closest('#root'));
      if (!inside) { d.leftAfter = i; d.leftTo = f; break; }
      d.tabStops.push(`${f.tag}${f.role ? '[' + f.role + ']' : ''} ${f.label || f.text || ''}`.slice(0, 60));
    }
    c.tabReachesWidget = d.tabStops.length > 0;
    // Focus the first grid row (or cell) and try the grid's keys.
    await page.focus('#before');
    let inGrid = false;
    for (let i = 0; i < 10 && !inGrid; i++) { await page.keyboard.press('Tab'); inGrid = await page.evaluate(() => !!document.activeElement?.closest('.wx-grid, [role=grid], [role=treegrid], [role=table]')); }
    c.tabReachesTaskList = inGrid;
    d.gridFocus = await focusInfo(page);
    d.selected0 = await body(page, 'selected');
    await press(page, ['ArrowDown'], 300);
    d.selected1 = await body(page, 'selected');
    d.focusAfterDown = await focusInfo(page);
    await press(page, ['ArrowDown'], 300);
    d.selected2 = await body(page, 'selected');
    c.arrowKeysMoveInTaskList = d.selected1 !== d.selected2 || JSON.stringify(d.gridFocus) !== JSON.stringify(d.focusAfterDown);
    d.ariaSelected = await page.evaluate(() => [...document.querySelectorAll('[aria-selected=true]')].map((e) => (e.innerText || '').trim().slice(0, 30)));
    c.selectionExposedToAT = d.ariaSelected.length > 0;
    // The keyboard alternative to dragging a bar: edit the duration cell in the task list (Enter, type, Enter).
    const barW = () => page.evaluate(() => [...document.querySelectorAll('.wx-bar')].map((b) => b.style.width).join(','));
    d.widthsBefore = await barW();
    await press(page, ['ArrowRight', 'ArrowRight'], 200);
    d.cellBeforeEdit = await focusInfo(page);
    await press(page, ['Enter'], 400);
    d.editorFocus = await focusInfo(page);
    c.enterOpensCellEditor = d.editorFocus.tag === 'input' || d.editorFocus.tag === 'textarea';
    if (c.enterOpensCellEditor) { await page.keyboard.press('Control+a'); await page.keyboard.type('6'); await press(page, ['Enter'], 500); }
    d.widthsAfter = await barW();
    c.keyboardEditsDuration = d.widthsBefore !== d.widthsAfter;
    d.focusAfterEdit = await focusInfo(page);
    await press(page, ['ArrowLeft', 'ArrowLeft'], 200);
    // Keyboard date edit: is there any key that moves the selected task in time?
    const barPos = () => page.evaluate(() => [...document.querySelectorAll('.wx-bar')].map((b) => b.style.left).join(','));
    d.barsBefore = await barPos();
    await press(page, ['ArrowRight', 'ArrowRight'], 250);
    d.barsAfterArrows = await barPos();
    c.keyboardMovesTaskDates = d.barsBefore !== d.barsAfterArrows;
    // Delete from the keyboard (grid-store hotkey) and where focus goes.
    const count = () => page.locator('.wx-bar').count();
    d.barCount0 = await count();
    await press(page, ['Delete'], 500);
    d.barCountAfterDeleteKey = await count();
    c.deleteKeyRemovesTask = d.barCountAfterDeleteKey === d.barCount0 - 1;
    await press(page, ['Backspace'], 500); // SVAR binds backspace (not delete) for "delete task"
    d.barCount1 = await count();
    c.backspaceRemovesTask = d.barCount1 === d.barCountAfterDeleteKey - 1;
    d.focusAfterDelete = await focusInfo(page);
    c.focusSurvivesDelete = d.focusAfterDelete.tag !== 'body';
    d.dialogsAfterDelete = await page.locator('[role=dialog],[role=alertdialog]').count();
    return { checks: c, detail: d };
  },
};

export const scenarios = {
  'palette-cmdk': palette('cmdk'),
  'palette-rac': palette('react-aria-components Autocomplete + Menu'),
  'palette-baseui': palette('@base-ui/react Autocomplete (inline) + Dialog'),
  'palette-kbar': palette('kbar', { openKey: 'Control+k' }),
  'dnd-dndkit': sortable('@dnd-kit/core + @dnd-kit/sortable (defaults)', (p) => press(p, ['Space', 'ArrowDown', 'ArrowDown', 'Space'], 250)),
  'dnd-dndkit-react': sortable('@dnd-kit/react (defaults)', (p) => press(p, ['Space', 'ArrowDown', 'ArrowDown', 'Space'], 250)),
  'dnd-rac': sortable('react-aria-components GridList + useDragAndDrop', async (p, d) => {
    // The row takes focus first; the drag button is reached with ArrowRight (grid navigation), Enter starts the drag.
    const keys = ['ArrowRight', 'Enter', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter'];
    const seen = [];
    for (const k of keys) { await p.keyboard.press(k); await p.waitForTimeout(250); seen.push([k, (await focusInfo(p)).text || (await focusInfo(p)).label]); }
    d.walk = seen;
    return keys;
  }),
  'dnd-pragmatic': sortable('@atlaskit/pragmatic-drag-and-drop + an action menu (the library\'s documented keyboard alternative)', (p) => press(p, ['Enter', 'Enter', 'Enter', 'ArrowDown', 'Enter'], 250)),
  'dnd-pangea': sortable('@hello-pangea/dnd', (p) => press(p, ['Space', 'ArrowDown', 'ArrowDown', 'Space'], 300)),
  'panels-rrp': panels('react-resizable-panels'),
  'panels-ark': panels('@ark-ui/react Splitter'),
  'panels-allotment': panels('allotment'),
  'flow-xyflow': flow,
  'canvas-konva': canvasRaw,
  'canvas-konva-a11y': canvasA11y,
  'canvas-tldraw': tldraw,
  'canvas-excalidraw': excalidraw,
  'gantt-svar': gantt,
};
