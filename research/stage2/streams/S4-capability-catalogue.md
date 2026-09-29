<!-- Stream S4, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S4-capability-catalogue/. The skeptical review is in S4-capability-catalogue.review.json. -->

# S4: Capability discovery — mature open-source libraries for hard UI (before building it yourself)

## What the skill already knew

Stage-1 stream B and `resources/libraries.md` already cover these areas:
- **Headless primitives:** Base UI, React Aria, Radix, Ark and Ariakit.
- **Styled kits:** including the licence traps for PrimeReact 11, Tailwind Plus and MUI X.
- **Other areas:** tables, forms, toasts (Sonner) and drawers (Vaul, marked unmaintained).
- **Command palette:** one row saying cmdk is dormant and to use Base UI or React Aria Autocomplete instead.
- **Date entry, motion, 3D and charts:** with the cost of the first component measured.
- **Proprietary charting:** Highcharts and ApexCharts are marked proprietary in `dataviz.md` §9.

`resources/README.md` has:
- the asset licence classes A–D;
- the rule that the shipped file wins over the `package.json` field;
- three manual shell commands for checking a resource.

Elsewhere in the skill:
- `ui-ux.md` §7b has the canvas rules.
- `app-ui.md` §4 covers the palette and shortcuts.
- `accessibility.md` §4 has the palette focus contract.
- `accessibility.md` §7 has the live-region rules. §7.1 is "exists, empty, before the update".

The skill has nothing on any of these:
- drag and drop, trees, splitters and docking;
- node editors, whiteboards and canvas editors;
- rich text, cropping, image editing and colour pickers;
- upload, virtualisation and timelines;
- shortcuts, gestures, zoom and pan, selection, freehand drawing and collaboration.

It also has no tested keyboard behaviour for any library, and no procedure for finding and judging a code library that its tables do not list. Everything below is new, except where it refines the command-palette row.

## Findings (tagged; numbers where they exist)

Registry, licence, size, code-scan, discovery and libcheck data were re-measured on 2026-09-29. Activity counts commits on the default branch since 2025-09-28, from treeless git clones with bots excluded; that data is from 2026-09-28 and was not re-run.

### F1. Licence traps: the package.json field is not evidence

| Library | What the shipped text says | Consequence | Evidence |
|---|---|---|---|
| **tldraw 5.x** (also `@tldraw/sync`, `@tldraw/assets`) | "tldraw license": you may use it in Development Environments. You may **not** use it in a Production Environment without a trial or commercial licence key. It enforces the key, detects the deployment environment, shows a watermark and "may collect and transmit usage data". | Not an option for a client product unless the client buys it. Worth studying as an accessibility pattern (F8, P11). | [V] repo `LICENSE.md`; the package ships only a pointer. [L] the unlicensed build renders "Get a license for production". |
| **Polotno 4** | Evaluation, development and testing for 60 days. After that, and for **any production use, including internal tools**, a subscription is required. No reverse engineering. | Procurement. | [V] `polotno/LICENSE.md` |
| **GoJS 4** | Proprietary licence agreement. Keys are for non-commercial use only. | Procurement. | [V] `license.html`, README |
| **Handsontable 18** | Free only for personal or evaluation use outside production. No competing products. | Procurement. | [V] `LICENSE.txt` |
| **dockview-enterprise** (Software Licence Agreement v1.5) | Proprietary, per developer, annual. The paid modules are:<br>• **KeyboardNavigation:** F6 / Shift+F6 cycles groups; Ctrl+[ / Ctrl+] switches tabs; Ctrl+Shift+\ jumps to the tab strip; focus is restored when a panel closes; Tab is contained in floating groups and Escape returns focus.<br>• **KeyboardDocking:** Ctrl+M starts a two-phase keyboard move with screen-reader narration; Ctrl+Shift+arrows move focus to the adjacent group.<br>• Also layout history, pinned and multi-row tabs, smart guides and auto-hide edges.<br>Without a key it shows a watermark and logs a console message. **MIT `dockview-core` already ships the keyboard model inside a group:**<br>• `role=tablist/tab/tabpanel` and roving tabindex;<br>• Arrow keys, Home and End;<br>• Enter or Space activates a tab;<br>• Delete or Backspace closes a tab and keeps focus in the tablist. | Keyboard use within one group is free. Moving between groups, re-docking by keyboard, and focus management after close or float are paid: budget the licence or build F6 cycling and focus restore yourself. | [V] `dockview-core.js` (`_onKeyDown`, `_closeTab`, `setAttribute("role","tablist")`). [V] dockview-enterprise `LICENCE.md` and the doc comments in `keyboardNavigationService.d.ts` and `keyboardDockingService.d.ts`. |
| **swapy 1.x** | GPL-3.0; the README sells a commercial licence. Dormant. | A closed product needs to buy it. | [V] |
| **DragSelect** | GPL-3.0 or commercial. | Same. | [V] |
| **CKEditor 5, TinyMCE 8** | GPL-2.0-or-later **or** commercial. TinyMCE adds its self-hosted terms and conditions. | Closed-source use needs a licence. | [V] |
| **BlockNote** | Core is MPL-2.0. `@blocknote/xl-*` is GPL-3.0 or commercial. | Core is fine; `xl-*` is a trap. | [V] |
| **@imgly/background-removal** | AGPL-3.0. | Avoid in closed products. | [V] |
| **Liveblocks** | The client and React packages are Apache-2.0 **per their package.json**. Their shipped `LICENSE` is a repository-wide notice: most code is Apache-2.0; `@liveblocks/server` and the `liveblocks` CLI are AGPL-3.0-or-later. The notice ends "Each package's own LICENSE or package.json specifies its applicable license". | The client is fine. Self-hosting the server brings AGPL obligations. | [V] the LICENSE in `@liveblocks/client` 3.24.2; the `@liveblocks/server` 1.9.0 tarball |
| **Remotion** | A custom licence that opens with MIT's words "Permission is hereby granted, free of charge". Free use is limited to individuals, for-profit companies with **up to 3 employees**, non-profits and evaluation. Everyone else needs a Company License. | Procurement for most clients. | [V] `LICENSE.md` |
| **FullCalendar Premium** (resource timeline and others) | Tri-licensed: commercial, CC BY-NC-ND (trial and non-commercial) or GPLv3. **FullCalendar 7 standard is MIT.** | Resource views cost money. | [V] |
| **@virtuoso.dev/message-list** | Commercial, with an evaluation licence. `react-virtuoso` is MIT. | Procurement. | [V] |
| **Bryntum** (`@bryntum/gantt`) | A public *placeholder*. `package.json` says "MIT"; no licence ships; a postinstall script prints an error. The real package is on a private registry. | The public package is class D. The product is a purchase. | [V] README, `postinstall.js` |
| **Pintura** (and FilePond's image-edit plugin) | No licence file; `package.json` points to a vendor URL. The README says "This package is for testing … will overlay a watermark on top of the editor and output image". | Procurement. | [V] |
| **bpmn-js** | MIT-style, but "the bpmn.io watermark … MUST NOT be removed or changed". | A client brand decision: a third-party logo stays visible. | [V] |
| **mapbox-gl ≥ 2** (found by the held-out test) | "Mapbox Web SDK … All rights reserved … licensed under the Mapbox TOS for use only with the relevant Mapbox product(s)". Later sections of the same file are BSD-3-Clause and MIT notices for v1.13-era and third-party code. | Needs a Mapbox account; a naive reader sees "BSD + MIT". | [V] `mapbox-gl@3.31.0` `LICENSE.txt` |
| **elkjs · JointJS core · Replicache** | EPL-2.0 (430 KB gz) · MPL-2.0 · "Replicache Terms of Service". | File-level copyleft · file-level copyleft · custom terms to read. | [V] |
| **DHTMLX Gantt 10 Community** | Now MIT. Auto-scheduling, critical path, resources, baselines and the framework wrappers are PRO. SVAR Gantt is MIT plus PRO. | Open-core. | [V] (the earlier GPL licence is [K]) |

**No licence file in the package**, although `package.json` says MIT or BSD: Excalidraw, react-arborist, @headless-tree, Slate, Rete, Lumino, tui-image-editor, @xzdarcy/react-timeline-editor and @panzoom/panzoom. For these the repository root licence is the evidence. [V]

**Traps for any automated licence reader**, all found and handled while building `libcheck.mjs` [L `lib/regress.mjs`]:
- The MPL-2.0 text names the GPL family as "Secondary Licenses".
- GPL-3.0 §13 names the AGPL. It also says "impose a license fee" and "noncommercially".
- **The OFL and Remotion's licence both open with MIT's "Permission is hereby granted, free of charge".**
- Liveblocks ships a multi-licence repository notice.
- Mapbox's proprietary head section is followed by third-party BSD and MIT notices.
- Remix Icon's "Commercial and Non-Commercial Use" heading grants rights; it does not restrict them.
- Highcharts' file only points to external licence agreements.

### F2. Maintenance traps [V registry + git]

**Dormant but popular.** Downloads are not a maintenance signal:

| Library | Last release | Commits in 12 months | Downloads/week |
|---|---|---|---|
| react-dnd | 2022-04 | 0 | 6.3M |
| @use-gesture/react | 2024-03 | 0 | 7.8M |
| hammerjs | 2016 | 0 | 2.2M |
| Moveable | 2023-12 | 0 | 634k |
| selecto | 2023-12 | 0 | 666k |
| split.js | 2022 | 0 | 482k |
| golden-layout | 2022 | 9 | 22k |
| Rete core | 2025-06 | 0 | 91k |
| Quill 2 | 2024-11 | 0 | 7.8M |
| litegraph.js | 2024-01 | 0 | 2k |
| tui-image-editor | 2022 | 0 | 36k |
| vanilla-colorful | 2022 | 0 | 704k |
| mousetrap | 2020 | 0 | 1.1M |
| kbar | 2026-08 | 8 (one author) | 349k |
| cmdk | 2025-03 | 1 | 52.4M (pulled in by shadcn) |

**Churn is counted in breaking-by-semver versions, not tags.** The earlier "releases per year" figure included nightly, canary and beta tags. Stable and pre-release counts now come separately, and "breaking" means a new 0.MINOR line before 1.0 or a new MAJOR after it:

| Library | Stable releases / 12 mo | Pre-release tags / 12 mo | Breaking versions / 12 mo |
|---|---|---|---|
| Lexical 0.52 | 19 | 230 | **16** |
| BlockNote 0.55 | 36 | 2 | **16** |
| @tanstack/react-hotkeys 0.12 | 30 | — | **13** |
| virtua 0.52 | 53 | — | 9 |
| react-dropzone 20.x | 24 | — | 6 |
| @dnd-kit/react 0.5 | 10 | 129 | 4 |
| tldraw | 48 | 1,844 | 1 |
| Handsontable | 7 | 733 | 2 |
| CKEditor | 26 | 639 | 2 |

Pin exact versions of the 0.x libraries with many breaking versions: Lexical, BlockNote, TanStack Hotkeys and virtua.

**Frozen stable APIs, with the work happening elsewhere:**
- `@dnd-kit/core` and `sortable` have had no release since 2024-12, while the repository (486 human commits) ships `@dnd-kit/react` 0.x.
- react-data-grid is `7.0.0-beta.61`.
- Filerobot has had 51 betas and 0 stable releases in 12 months, with 3 human commits.

**Bus factor above 90 %** (top author's share of human commits):
- Pragmatic DnD 98, TinyBase 99, react-window 97, virtua 97, react-grid-layout 96, cropperjs 96.
- react-virtuoso 95, FullCalendar 95, react-resizable-panels 94, gridstack 94, react-easy-crop 94.
- react-zoom-pan-pinch 93, Yjs 93, react-arborist 93.
- flexlayout-react, rc-dock and react-mosaic 100.

This is normal at this layer of the ecosystem. It argues for thin wrappers, not for avoiding these libraries.

**Finished, not dead:** d3-zoom and d3-polygon have not changed since 2021–23, and React Flow builds on them. The test for a finished library is whether active projects depend on it (F7).

### F3. Tested accessibility of the top picks

There are 18 demos. Each ran 5 times in fresh headless Chromium contexts, and every check came out 5/5 or 0/5 [L `results.a11y`]. The 17 demos from the first attempt were re-run by the reviewer with identical results. The palette, reorder, splitter, React Flow and canvas tables are unchanged from the first attempt.

**Command palettes** (8 commands in 3 groups):

| Check | cmdk | React Aria Autocomplete + Menu | Base UI Autocomplete `inline` + Dialog | kbar |
|---|---|---|---|---|
| Opens from the keyboard; focus in the field | ✓ | ✓ | ✓ | ✓ |
| Dialog has a name | ✓ | ✓ | ✓ | ✗ (no dialog role) |
| Background hidden from AT (CDP tree) | ✓ | ✓ (`inert`) | ✓ | ✗ |
| Field role · groups | combobox · groups | searchbox · groups | combobox · groups | combobox · **headers exposed as options** |
| Enter runs the item and closes | ✓ | ✓ | ✓ | ✓ |
| **Focus returns to the opener** | **✗ (goes to `body`)** | ✓ | ✓ | ✓ |
| Empty state shown / announced | ✓ / ✗ | ✓ / ✗ | ✓ / **✓** ("No results found.") | ✗ / ✗ |
| Escape closes and returns focus | ✓ / ✗ | first Escape clears the field, the second closes | ✓ / ✓ | ✓ / ✓ |

**Keyboard reordering** (move the first of 5 items down two places):

| Library | Keys | What is announced by default |
|---|---|---|
| dnd-kit core + sortable | Space ↓ ↓ Space | "Draggable item **i1** was moved over droppable area **i2**" (internal ids) |
| @dnd-kit/react 0.5 | Space ↓ ↓ Space | "Picked up draggable item **i1**." … "dropped over droppable target **i1**" (ids; moves are silent) |
| React Aria GridList + useDragAndDrop | → Enter ↓×3 Enter | "Insert between Wireframes and Visual design" … "Drop complete." |
| Pragmatic DnD + move menu | Enter, Enter "Move down", twice | whatever you pass to `announce()`, delayed 1000 ms |
| @hello-pangea/dnd | Space ↓ ↓ Space | "You have moved the item from position 1 to position 3" |

All five reorder the item and keep focus on it. Pragmatic's core has no keyboard dragging; its documented alternative is the menu this demo builds.

**Resizable panels:**
- react-resizable-panels 4: APG splitter ✓, 5 % steps, Home/End, Enter collapses, F6 cycles separators [V `onDocumentKeyDown.ts`].
- Ark/Zag Splitter: ✓, 1 % steps, but `aria-orientation=horizontal` on a vertical divider.
- allotment: the separator is **not focusable**.

**React Flow 12:**
- ✓ Nodes and edges are focusable.
- ✓ Enter selects a node; arrows move it 5 px (Shift ×4).
- ✓ Backspace deletes.
- ✗ Nodes are unnamed unless you set `ariaLabel`.
- ✗ Edges are named by id ("Edge from a to b").
- ✗ Handles are not keyboard-reachable (WCAG 2.5.7).
- ✗ Focus goes to `body` after a delete.
- The wrapper is `role="application"`.

**Canvas editors:**
- Konva + Transformer exposes nothing to the accessibility tree.
- The lab's accessible layer for Konva passed 6/6 checks: a Layers listbox, an inspector with X/Y fields, and a status message.
- tldraw: a skip button, Tab selects shapes, and it announces "Build, Ellipse. 2 of 3". Its first announcement goes into a region inserted already populated [L, V].
- Excalidraw: Tab never selects an object.

**Gantt: SVAR React Gantt 2.7.3 with defaults (new)** [L `gantt-svar`, 5/5 or 0/5]:

| Check | Result |
|---|---|
| Task list exposed as an ARIA grid (`grid`, 6 `row`, 4 `columnheader`, 20 `gridcell`); task names in the tree | ✓ |
| Tab reaches the task list: the grid, then each column header as a separate tab stop | ✓ (4 tab stops) |
| Arrow keys move through rows and select tasks | ✓ (selection 1 → 2) |
| Selection exposed to AT (`aria-selected`) | **✗** |
| Timeline bars focusable | **✗** (`tabindex=-1`, no role; named only by their text) |
| Enter opens a cell editor; keyboard changes a duration; arrows move a bar in time | **✗ ✗ ✗** |
| Delete key removes a task | ✗ |
| Backspace removes the selected task | ✓ (no confirmation, no announcement) |
| Focus after the delete | **✗ `body`** |
| Live-region announcements | none |

The keyboard support lives in the dependencies [L `candidates.svar-gantt.scan.byPackage`; V `@svar-ui/grid-store` hotkeys]:
- `@svar-ui/grid-store`: arrows, Enter, F2, Home/End, Ctrl+Z/Y.
- `@svar-ui/react-grid`: ARIA grid roles and `aria-colindex`/`rowindex`.
- `@svar-ui/react-gantt`: binds Backspace, Ctrl+C/V/X/D and undo.

Scheduling itself (moving or resizing bars) is pointer-only by default. SVAR's separate `Editor` component was not tested.

### F4. Stated accessibility: keyboard handlers and ARIA in everything the entry bundles [L code scan, crude]

The earlier scan read only each candidate's own package folder. It called SVAR "no keyboard, no ARIA", which was wrong. The scan now reads every JS chunk that esbuild ships for the minimal entry, so all bundled dependencies count, and it attributes matches to the packages that contributed input bytes (`lib/scan.mjs`, run inside the `size` step).

Its first version still missed @hello-pangea/dnd's and React Flow's arrow keys. Those are written as constant runs (`=37,…=38,…=39,…=40`) and as unquoted object keys (`ArrowUp:`). After the patterns were widened, the scan agrees with every demo result in F3.

The table's **Accessibility** column now shows either "tested (demo)" or the scan verdict. Across 131 built candidates:

| Scan verdict | Count |
|---|---|
| Keyboard + ARIA | 54 |
| Keyboard only | 19 |
| Key handler, no arrows or ARIA | 11 |
| ARIA only | 4 |
| None found | 43 |

**Keyboard + ARIA found:**
- Grids: react-data-grid, RevoGrid, Tabulator, AG Grid, jspreadsheet.
- Gantts: DHTMLX Gantt (`grid`/`treegrid` plus key maps) and SVAR (see F3).
- Trees: React Aria Tree, @headless-tree, react-complex-tree, react-arborist.
- Docking: dockview, flexlayout-react, rc-dock, Lumino.
- Pickers: react-colorful, pickr, Coloris, vanilla-colorful, React Aria ColorPicker.
- Virtualisers: react-window 2 and the React Aria Virtualizer.
- Other: svelte-dnd-action, Uppy, the React Aria DropZone, Schedule-X, PhotoSwipe, Cropper.js 2.

**Keyboard only:** react-easy-crop, react-image-crop (one `aria-label` per handle), Rete (in `rete-area-plugin`), X6, Slate, Plate, react-zoom-pan-pinch, @viselect.

**ARIA only:** FullCalendar 7, react-big-calendar, FilePond, mermaid.

**None found:**
- react-grid-layout, golden-layout, JointJS core, Konva, Moveable, interact.js.
- @panzoom/panzoom, d3-zoom, svg-pan-zoom, frappe-gantt, wavesurfer.js.
- react-virtuoso, virtua, TanStack Virtual (headless: you render the ARIA).
- swapy, SortableJS, vue-draggable-plus, react-dnd, the Pragmatic core, allotment, split.js, iro.js, react-advanced-cropper, Dropzone.js.

Gridstack, react-mosaic, Fabric, vis-timeline and maxGraph have key handlers but no arrow keys or ARIA.

Presence is not quality. Treat the scan as a pointer to what to test in a demo.

### F5. Cost [L]

Method: esbuild with minimal usage, React external, gzip -9. "Initial" means the entry chunk plus its static imports. A re-run left every size in the catalogue within 64 bytes.

**Heavy:**
- tldraw 570 KB.
- Excalidraw 368 KB + 2.1 MB lazy.
- elkjs 430 KB.
- Filerobot 340 KB.
- BlockNote 320 KB + 106 KB lazy.
- GoJS 274 KB.
- AG Grid Community 198 KB.
- mermaid 179 KB + 1.3 MB lazy.
- X6 168, bpmn-js 165, Handsontable 162, CKEditor 159, vis-timeline 159, Tiptap StarterKit 123, Konva 100 KB.

**CRDTs:** Yjs + y-websocket is 30 KB. Automerge 3 needs 1,117 KB gz of WASM and Loro 1,053 KB.

**Tiny and good:** react-colorful 3.8, react-image-crop 3.9, virtua 4.1, react-window 4.7, @panzoom/panzoom 3.6, @viselect 4.6, perfect-freehand 1.9, tinykeys 1.0, Pragmatic core 7.1, TanStack Virtual 7.7, react-dropzone 6.2 KB.

**Primitive-layer components cost more than the standalone library, even on top of that layer** (replaces the earlier unmeasured claim that they "share most code"). This is the `increments` step, over a realistic base set:
- React Aria base: Button, Dialog, Modal, ListBox, Menu, TextField = **48.5 KB**.
- Base UI base: Dialog, Menu, Popover = **55.9 KB**.

| Added to the base | Alone | Base + it | **Increment** | Standalone alternative |
|---|---|---|---|---|
| React Aria GridList + useDragAndDrop | 72.5 | 86.2 | **+37.6** | dnd-kit core + sortable 16.2 |
| React Aria Tree + useDragAndDrop | 74.5 | 88.5 | **+40.0** | @headless-tree 9.0 |
| React Aria ColorPicker family | 74.7 | 85.4 | **+36.8** | react-colorful 3.8 |
| React Aria DropZone + FileTrigger | 36.1 | 70.4 | **+21.8** | react-dropzone 6.2 |
| React Aria Virtualizer + ListBox | 43.1 | 57.3 | **+8.8** | TanStack Virtual 7.7 |
| React Aria Autocomplete (+ SearchField) | 47.5 | 52.7 | **+4.2** | cmdk 17.7 |
| Base UI Autocomplete | 53.0 | 71.0 | **+15.0** | cmdk 17.7 |

On size, the primitive layer wins only for the palette and roughly ties for virtualisation. For DnD, trees, colour and upload it costs 2–10× the standalone library. Its reason to exist is tested behaviour and consistency: React Aria had the best default DnD announcements (F3), plus 30+ locales [V].

### F6. How well each library takes a design system [L]

Measured as the CSS custom properties defined in each library's shipped CSS (unchanged):

| Tier | Libraries (custom properties) | What it means |
|---|---|---|
| Many | SVAR 304, AG Grid 213, Excalidraw 209, DHTMLX 187, FullCalendar 7 157, tldraw 128, dockview 119, RevoGrid 116, flexlayout 71, BlockNote 52, react-complex-tree 44, React Flow 38 | Theme through variables |
| Few | Uppy 36, frappe-gantt 20, react-data-grid 16, FilePond 8, react-image-crop 6, allotment 5 | Partly themeable |
| None | Tabulator, vis-timeline, Quill, react-big-calendar, gridstack, Lumino, react-mosaic | Theme by overriding selectors |

React Flow (`base.css` against `style.css`) and FullCalendar 7 (`skeleton.css`) ship structural-only stylesheets, which are the easiest to put on the client's tokens.

### F7. Discovery methods

**npm search is the weakest source** [L `results.discovery`, 18 queries]:
- Its `score.detail` fields are constant and carry no signal.
- `libcheck --search` keeps only results that contain every query word, ranked by downloads.
- Across 18 designer phrasings:
  - no recommended leader in the top 12 for **7 queries**;
  - only some of the leaders for **5 more**;
  - every leader for **6**.
- Failure modes:
  - Unrelated tools rank first: "command menu" returns `inquirer`, "node editor" returns `@inquirer/editor`.
  - Commercial vendors with many subpackages rank high: Syncfusion tops "kanban board".
  - A proprietary product's internal packages fill the top: `@tldraw/utils` and others for "infinite canvas", where Excalidraw is missing.
  - Dormant packages appear: react-trello (2021) and jkanban (2020).
  - Heavy near-misses appear: mermaid tops "gantt".

**Dependency lists of products that already do the thing well are better leads** [V]:
- Excalidraw depends on perfect-freehand, roughjs, pica, browser-fs-access, fuzzy, jotai and radix-ui.
- tldraw depends on Tiptap, rbush and idb.
- React Flow's core depends on d3-drag and d3-zoom.

**Activity data:** the GitHub API was not reachable. Treeless shallow git clones gave exact commit and author counts in about a second per repo [L].

### F8. Architecture patterns from design-engineering codebases (read only)

P1–P11 are unchanged:
- **P1** Engine separate from bindings (`@xyflow/system`).
- **P2** Choose the rendering layer by what each object needs: DOM/SVG when it needs a name and focus; canvas plus a DOM accessibility layer for thousands of objects.
- **P3** Split the scene from the interaction (Excalidraw's three canvases).
- **P4** One command registry that feeds the palette, shortcuts, menus and undo (Excalidraw `actions/types.ts`).
- **P5** History:
  - capture levels: `IMMEDIATELY`, `NEVER` for remote changes and initialisation, `EVENTUALLY`;
  - Escape during a gesture bails back to the mark taken at its start (tldraw `Translating.ts`).
- **P6** Tools as state charts. tldraw's drag threshold is 4 px fine / 6 px coarse; double-click 450 ms; long press 500 ms.
- **P7** JavaScript sets data attributes and variables; CSS moves things. Unmount only after `getAnimations()` settles (Sonner, Base UI `useAnimationsFinished`).
- **P8** Gesture numbers:
  - Sonner: dismiss at ≥ 45 px or > 0.11 px/ms; rubber band `1/(1.5+|d|/20)`.
  - Vaul: close at > 0.4 px/ms or 25 % travel; damping `8·(ln(v+1)−2)`; `cubic-bezier(.32,.72,0,1)` over 500 ms; no drag within 500 ms of opening.
- **P9** External stores read through selectors.
- **P10** A theming contract: public variable plus default, structural CSS separate from themed CSS.
- **P11** tldraw's keyboard and screen-reader model for canvases.

All are [V] from source; the reviewer checked the constants.

**P12. Live regions for bursts (revised).** The "mount it empty" half is already `accessibility.md` §7.1. What is new: when messages come in rapid bursts (drag moves, typing-driven result counts), debounce them so only the last one is spoken. Pragmatic's `announceDelay = 1000` ms is a library default, **not a tested rule**: no screen reader was run. Single status messages ("Saved", cart updates) stay immediate as in §7.2. tldraw inserts its first region already populated [V].

### F9. A defect in the skill's own tooling [L `results.inert`]

Playwright 1.63 `ariaSnapshot()` lists `inert` content in both modes, and `mode:'ai'` also lists `aria-hidden` content. Chromium's CDP tree excludes both. The test is now in the lab (`lib/inerttest.mjs`, `run.mjs --only inert`).

`scripts/lib/seen.mjs` builds the walkthrough's marked tree from `ariaSnapshot({mode:'ai'})` without testing for these attributes. The fix: treat any element for which `el.closest('[inert],[aria-hidden="true"]')` is true as not readable.

## Experiments (what you built, how to re-run, results tables)

`research/stage2/experiments/S4-capability-catalogue/` is 2.4 MB without `node_modules`.

**Files:**
- `catalogue.mjs`: 142 candidates in 24 categories, each with a framework (fw), kind, packages, repo and minimal entry.
- `run.mjs`: the single runner that writes `results.json`. Steps:
  - `meta`: stable, pre-release and breaking counts; deps; README notices from the package README and then the repo root README.
  - `licence`: shipped text, then repo root, then the `package.json` field; plus the class A–D.
  - `activity`: treeless git.
  - `size`: esbuild + gzip, plus `scan`.
  - `increments`.
  - `theming`.
  - `discovery`: 18 queries.
  - `regress`.
  - `heldout`.
  - `inert`.
  - `a11y`: 18 demos.
- `libcheck.mjs`: the proposed skill script (D10). The lab's `lib/meta.mjs` and `lib/size.mjs` wrap it.
- `lib/regress.mjs`: 34 pinned regression cases.
- `lib/heldout.mjs`: 16 held-out packages.
- `lib/scan.mjs`: the keyboard and ARIA code scan.
- `lib/inerttest.mjs`: the F9 test.
- `lib/table.mjs [--compact]`: prints the catalogue table.
- `demos/src/*.jsx` with `demos/tests.mjs` and `demos/run-a11y.mjs`. New: `gantt-svar.jsx`.
- `shots/*.jpg`: 18 screenshots.

**Re-run:**
```
cd research/stage2/experiments/S4-capability-catalogue
npm install --legacy-peer-deps --ignore-scripts
NODE_USE_ENV_PROXY=1 node run.mjs --runs 5                     # everything, about 60 min
node run.mjs --only size,increments,theming,inert               # offline subset
NODE_USE_ENV_PROXY=1 node run.mjs --only regress,heldout        # libcheck tests, about 8 min
node demos/run-a11y.mjs gantt-svar --runs 5                     # one demo
NODE_USE_ENV_PROXY=1 node libcheck.mjs react-resizable-panels --size
node lib/table.mjs --compact
```

**Limits of the numbers:**
- Sizes: React external, minimal entries, gzip (not brotli).
- Activity: monorepos (React Aria, Tiptap, Remotion, mermaid) count the whole repository.
- The scan: string presence only.
- Accessibility checks: pass counts, not timings.

**libcheck regression** [L `results.libcheckRegress`]: **34/34 pass.** The cases cover:
- the reviewer's false REDs: wavesurfer.js and @maxgraph/core;
- Liveblocks (client A with an AMBER naming the AGPL; server C copyleft);
- Remotion (C procurement);
- vaul (RED from the repo README);
- OFL and CC-BY assets: the two Inter packages and Solar;
- Remix Icon (C "restricted use"; the evidence quotes the prohibitions);
- GSAP ("?", read it; no "all rights reserved");
- Highcharts and AG Grid Enterprise;
- all the F1 traps;
- Lexical (AMBER from breaking versions, not tags);
- a 404 package.

These are **training cases**: the heuristics were fixed on them.

**libcheck held-out test** [L `results.libcheckHeldout`]: 16 packages not used while writing it. Expected verdicts were written down before the first run.

| Package | Classified from shipped text | Class | RED |
|---|---|---|---|
| apexcharts@7.6.1 | proprietary | C procurement | ✓ |
| primereact@11.2.0 | proprietary | C procurement | ✓ |
| @mui/x-data-grid-premium@9.14.0 | proprietary | C procurement | ✓ |
| @syncfusion/ej2-react-grids@34.2.9 | proprietary | C procurement | ✓ |
| @progress/kendo-react-grid@16.1.0 | proprietary | C procurement | ✓ |
| @fortawesome/fontawesome-free@7.3.1 | OFL-1.1 + CC-BY | B | — |
| lucide-react@1.48.0 | ISC + MIT | A | — |
| react-beautiful-dnd@13.1.1 | Apache-2.0 | A | ✓ (deprecated on npm; README "Archived"; dormant) |
| moment@2.31.0 | MIT | A | — (AMBER: "legacy project, now in maintenance mode") |
| mapbox-gl@3.31.0 | proprietary (later sections: third-party notices) | C procurement | ✓ |
| @amcharts/amcharts5@5.20.8 | proprietary | C procurement | ✓ |
| froala-editor@5.4.0 | proprietary | C procurement | ✓ |
| draft-js@0.11.7 | MIT | A | ✓ (dormant; AMBER maintenance mode) |
| pdfjs-dist@6.3.289 | Apache-2.0 | A | — |
| leaflet@1.9.4 | BSD-2-Clause | A | — |
| react-quill@2.0.0 | MIT | A | ✓ (dormant) |

- **First run: 15/16 correct on both class and RED.**
  - Mapbox was read as BSD + MIT. The head-section rule fixes it.
  - For PrimeReact I had written A from memory. libcheck said C and was right; `libraries.md` already says so.
  - moment's `github:` repository shorthand was not parsed, so its activity showed as unknown; that is fixed.
- After the fixes: 16/16. Those fixes were made on held-out cases, so **the unbiased figure is 15/16.**

**Discovery probe** [L `results.discovery`]:

| Query | Recommended leaders | Found in top 12 | Top 3 by downloads |
|---|---|---|---|
| command palette | cmdk, Base UI, React Aria | **none** | kbar; react-cmdk (2023); react-command-palette |
| drag drop sortable | dnd-kit, Pragmatic | **none** | sortablejs; hello-pangea; vuedraggable (2020) |
| resizable panels | react-resizable-panels | ✓ | react-resizable-panels; dockview; dockview-react |
| split view | react-resizable-panels | **none** | split.js (2022); dockview; dockview-react |
| node editor | @xyflow/react | **none** | @inquirer/external-editor; @inquirer/editor; prosemirror-trailing-node |
| flow diagram react | @xyflow/react | ✓ | @xyflow/system; @xyflow/react; @reactflow/core |
| rich text editor | Tiptap, Lexical | Tiptap only | @tiptap/core; quill; react-quill (2022) |
| virtual list | TanStack, react-window, virtua | virtua only | rc-virtual-list; @rc-component/virtual-list; virtua |
| image crop | react-image-crop, react-easy-crop, cropperjs | 2 of 3 | jimp; @jimp/plugin-crop; react-easy-crop |
| gantt | SVAR, DHTMLX, frappe | ✓ | **mermaid**; devexpress-gantt; frappe-gantt |
| color picker | react-colorful | ✓ | react-colorful; @rc-component/color-picker; … |
| file upload resumable | Uppy, tus | ✓ | tus-js-client; @uppy/core; @mux/upchunk |
| command menu | as palette | **none** | **inquirer**; @wordpress/commands; cmdk-base |
| kanban board | dnd-kit, Pragmatic, hello-pangea | **none** | **@syncfusion/ej2-kanban**; react-trello (2021); Syncfusion React |
| whiteboard | Excalidraw, tldraw | **none** | informedk12-whiteboard; @larksuite/whiteboard-cli; … |
| infinite canvas | Excalidraw, tldraw, React Flow | tldraw only | **@tldraw/utils, tlschema, editor** (internal packages) |
| tree view react | React Aria, @headless-tree, react-arborist | react-arborist only | react-json-view-lite; react-json-view (2021); @rc-component/tree |
| docking layout | dockview, flexlayout-react | ✓ | dockview-core; dockview; dockview-react |

**Catalogue results table** (`node lib/table.mjs --compact`, 2026-09-29).

Column abbreviations:
- **Fw**: R = React, Sv = Svelte, So = Solid, Ng = Angular, JS = vanilla, WC = web components.
- **Deps**: direct dependencies; "+ fw" means framework peers only.
- **[class]**: A–D per D3.
- **Stable rel. (+pre)**: releases in 12 months.
- **Breaking**: new 0.MINOR or MAJOR lines in 12 months.
- **Accessibility**: a demo in F3, or the F4 code scan.
- n/m = not measured.

| Category | Library | Fw | Kind | Deps | Licence (shipped text) [class] | Latest | Stable rel./12 mo (+pre) | Breaking/12 mo | Human commits/12 mo (top %) | DL/wk | Initial gz KB | Accessibility |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| command-palette | cmdk | R | headless | 4 + fw | MIT [A] | 1.1.1 (2025-03) | 0 | 0 | 1 (100) | 52.4M | 17.7 | tested (palette-cmdk) |
| command-palette | kbar | R | headless | 5 + fw | MIT [A] | 1.0.0 (2026-08) | 1 | 1 | 8 (100) | 349k | 31.0 | tested (palette-kbar) |
| command-palette | Base UI Autocomplete + Dialog | R | headless | 5 + 3 peers | MIT [A] | 1.8.0 (2026-09) | 10 (+2 pre) | 1 | 1395 (44) | 16.8M | 53.0 | tested (palette-baseui) |
| command-palette | React Aria Autocomplete + Menu + Modal | R | headless | 7 + fw | Apache-2.0 [A] | 1.21.1 (2026-09) | 11 (+243 pre) | 0 | 912 (18) | 5.3M | 47.5 | tested (palette-rac) |
| command-palette | Bits UI Command | Sv | headless | 6 + 1 peers | MIT [A] | 2.19.3 (2026-09) | 38 | 0 | 114 (46) | 1.2M | n/m | — |
| command-palette | ninja-keys | WC | styled | 3 | MIT [A] | 1.2.2 (2022-07) | 0 | 0 | 0 (—) | 34k | 16.1 | code: kbd only |
| dnd | @dnd-kit/core + sortable | R | headless | 3 + fw | MIT [A] | 6.3.1 (2024-12) | 0 | 0 | 486 (58) | 29.6M | 16.2 | tested (dnd-dndkit) |
| dnd | @dnd-kit/react | R | headless | 4 + fw | MIT [A] | 0.5.0 (2026-06) | 10 (+129 pre) | 4 | 486 (58) | 1.6M | 36.9 | tested (dnd-dndkit-react) |
| dnd | Pragmatic drag and drop | JS | headless | 3 | Apache-2.0 [A] | 4.0.0 (2026-09) | 11 | 3 | 147 (98) | 1.7M | 7.1 | tested (dnd-pragmatic) |
| dnd | React Aria GridList + useDragAndDrop | R | headless | 7 + fw | Apache-2.0 [A] | 1.21.1 (2026-09) | 11 (+243 pre) | 0 | 912 (18) | 5.3M | 72.5 | tested (dnd-rac) |
| dnd | @hello-pangea/dnd | R | headless | 5 + fw | Apache-2.0 [A] | 18.0.1 (2025-02) | 0 | 0 | 1 (100) | 3.5M | 30.6 | tested (dnd-pangea) |
| dnd | react-dnd | R | headless | 5 + 3 peers | MIT [A] | 16.0.1 (2022-04) | 0 | 0 | 0 (—) | 6.3M | 13.1 | code: none found |
| dnd | sortablejs | JS | headless | 0 | MIT [A] | 1.15.7 (2026-02) | 1 | 0 | 2 (100) | 4.8M | 12.5 | code: none found |
| dnd | @formkit/drag-and-drop | JS, R, Vue | headless | 0 + 1 peers | MIT [A] | 0.6.1 (2026-06) | 2 (+1 pre) | 1 | 53 (79) | 125k | 8.8 | code: keys, no ARIA |
| dnd | swapy | JS | headless | 0 | GPL-3.0 [C copyleft] | 1.0.5 (2025-01) | 0 | 0 | 0 (—) | 18k | 7.6 | code: none found |
| dnd | vue-draggable-plus | Vue | headless | 1 + 1 peers | MIT [A] | 0.6.1 (2026-01) | 1 | 0 | 6 (17) | 329k | 14.6 | code: none found |
| dnd | svelte-dnd-action | Sv | headless | 0 + fw | MIT [A] | 0.9.79 (2026-08) | 14 | 0 | 46 (41) | 313k | 12.1 | code: kbd+ARIA |
| tree | React Aria Tree + useDragAndDrop | R | headless | 7 + fw | Apache-2.0 [A] | 1.21.1 (2026-09) | 11 (+243 pre) | 0 | 912 (18) | 5.3M | 74.5 | code: kbd+ARIA |
| tree | @headless-tree/core | R | headless | 0 | MIT [A] | 1.7.0 (2026-05) | 7 (+16 pre) | 0 | 45 (89) | 405k | 9.0 | code: kbd+ARIA |
| tree | react-complex-tree | R | styled | 0 + fw | MIT [A] | 2.6.4 (2026-08) | 4 | 0 | 17 (47) | 81k | 17.8 | code: kbd+ARIA |
| tree | react-arborist | R | styled | 5 + fw | MIT [A] | 3.16.0 (2026-07) | 22 | 0 | 74 (93) | 813k | 33.2 | code: kbd+ARIA |
| grid-layout | react-grid-layout | R | headless | 6 + fw | MIT [A] | 2.2.4 (2026-07) | 10 | 1 | 141 (96) | 4.3M | 20.9 | code: none found |
| grid-layout | gridstack | JS | styled | 0 | MIT [A] | 14.0.0 (2026-09) | 14 | 2 | 328 (94) | 623k | 24.8 | code: keys, no ARIA |
| resizable | react-resizable-panels | R | headless | 0 + fw | MIT [A] | 4.14.1 (2026-09) | 69 (+22 pre) | 1 | 287 (94) | 41.9M | 19.5 | tested (panels-rrp) |
| resizable | Ark UI / Zag Splitter | R, Vue, So, Sv | headless | 69 + fw | MIT [A] | 5.39.2 (2026-09) | 27 | 0 | 407 (82) | 1.1M | 17.1 | tested (panels-ark) |
| resizable | allotment | R | styled | 6 + fw | MIT [A] | 1.20.5 (2025-12) | 1 | 0 | 20 (95) | 310k | 9.9 | tested (panels-allotment) |
| resizable | split.js | JS | headless | 0 | MIT [A] | 1.6.5 (2022-01) | 0 | 0 | 0 (—) | 482k | 2.4 | code: none found |
| docking | dockview | R (+ JS, Vue, Ng) | styled | 1 | MIT [A] | 8.3.1 (2026-09) | 30 (+30 pre) | 4 | 1613 (75) | 465k | 89.8 | code: kbd+ARIA |
| docking | dockview-enterprise | R (+ JS, Vue, Ng) | styled | 1 | proprietary [C procurement] | 8.3.1 (2026-09) | 6 (+7 pre) | 2 | 1613 (75) | 118 | n/m | — |
| docking | flexlayout-react | R | styled | 0 + fw | MIT [A] | 0.11.1 (2026-09) | 16 | 3 | 25 (100) | 93k | 49.2 | code: kbd+ARIA |
| docking | rc-dock | R | styled | 6 + fw | Apache-2.0 [A] | 4.0.2 (2026-09) | 2 (+1 pre) | 1 | 5 (100) | 42k | 59.8 | code: kbd+ARIA |
| docking | react-mosaic-component | R | styled | 10 + fw | Apache-2.0 [A] | 7.2.1 (2026-09) | 5 (+1 pre) | 1 | 71 (100) | 83k | 40.2 | code: keys, no ARIA |
| docking | golden-layout | JS | styled | 0 | MIT [A] | 2.6.0 (2022-09) | 0 | 0 | 9 (100) | 22k | 29.5 | code: none found |
| docking | @lumino/widgets | JS | styled | 11 | BSD-3-Clause [A] | 2.9.0 (2026-07) | 6 | 0 | 35 (29) | 154k | 47.5 | code: kbd+ARIA |
| node-editor | React Flow | R (Sv: @xyflow/svelte) | styled | 3 + 2 peers | MIT [A] | 12.12.0 (2026-09) | 15 | 0 | 502 (29) | 13.7M | 58.1 | tested (flow-xyflow) |
| node-editor | Rete.js v2 + React plugin | JS core; R/Vue/Ng/Sv/Lit renderers | engine | 1 | MIT [A] | 2.0.6 (2025-06) | 0 | 0 | 0 (—) | 91k | 36.9 | code: kbd only |
| node-editor | JointJS | JS | engine | 0 | MPL-2.0 [B] | 4.3.3 (2026-09) | 10 (+6 pre) | 0 | 145 (40) | 55k | 127.6 | code: none found |
| node-editor | AntV X6 | JS | engine | 4 | MIT [A] | 3.1.8 (2026-08) | 13 (+9 pre) | 0 | 124 (49) | 139k | 168.2 | code: kbd only |
| node-editor | @maxgraph/core | JS | engine | 0 | Apache-2.0 [A] | 0.24.0 (2026-07) | 3 | 3 | 92 (51) | 44k | 107.4 | code: keys, no ARIA |
| node-editor | litegraph.js | JS | engine | 0 | MIT [A] | 0.7.18 (2024-01) | 0 | 0 | 0 (—) | 2k | 121.0 | code: kbd only |
| node-editor | baklavajs | Vue | styled | 5 | MIT [A] | 2.8.1 (2025-11) | 2 | 0 | 31 (71) | 9k | 23.7 | code: none found |
| node-editor | gojs | JS | engine | 0 | proprietary [C procurement] | 4.0.4 (2026-09) | 18 (+2 pre) | 1 | 19 (100) | 262k | 274.1 | code: kbd+ARIA |
| flowchart | mermaid | JS | engine | 23 | MIT [A] | 12.0.0 (2026-09) | 15 | 1 | 2287 (15) | 18.4M | 178.9 +1311.4 lazy | code: ARIA only |
| flowchart | @dagrejs/dagre | JS | engine | 1 | MIT [A] | 3.1.1 (2026-08) | 8 | 2 | 111 (77) | 5.2M | 16.4 | code: none found |
| flowchart | elkjs | JS | engine | 0 | EPL-2.0 [B] | 0.12.0 (2026-07) | 2 | 1 | 44 (66) | 9.6M | 430.4 | code: none found |
| flowchart | bpmn-js Modeler | JS | styled | 8 | MIT + watermark, keep-logo [C brand decision] | 18.30.1 (2026-09) | 35 | 0 | 272 (63) | 293k | 165.4 | code: kbd+ARIA |
| whiteboard | @excalidraw/excalidraw | R | styled | 31 + fw | MIT [A] | 0.18.1 (2026-04) | 1 (+51 pre) | 0 | 274 (50) | 670k | 367.5 +2142.2 lazy +79.3 wasm/assets | tested (canvas-excalidraw) |
| whiteboard | tldraw | R | styled | 16 + fw | proprietary [C procurement] | 5.4.2 (2026-09) | 48 (+1844 pre) | 1 | 1846 (35) | 493k | 570.0 | tested (canvas-tldraw) |
| canvas-editor | Konva + react-konva | JS, R, Vue, Sv | engine | 0 + 2 peers | MIT [A] | 10.7.0 (2026-09) | 24 | 0 | 324 (89) | 3.1M | 99.7 | tested (canvas-konva, canvas-konva-a11y) |
| canvas-editor | Fabric.js 7 | JS | engine | 0 | MIT [A] | 7.4.0 (2026-05) | 8 (+1 pre) | 1 | 134 (57) | 1.1M | 86.1 | code: keys, no ARIA |
| canvas-editor | Moveable | R (JS: moveable) | headless | 13 | MIT [A] | 0.56.0 (2023-12) | 0 | 0 | 0 (—) | 634k | 74.3 | code: none found |
| canvas-editor | interact.js | JS | headless | 1 | MIT [A] | 1.10.28 (2026-08) | 1 | 0 | 12 (100) | 771k | 29.0 | code: none found |
| canvas-editor | polotno | R | styled | 27 + 3 peers | proprietary [C procurement] | 4.14.1 (2026-09) | 104 (+54 pre) | 2 | — | 35k | n/m | — |
| rich-text | Tiptap 3 | R, Vue, JS | headless | 3 + 4 peers | MIT [A] | 3.31.3 (2026-09) | 85 | 0 | 832 (36) | 17.8M | 123.2 | code: kbd+ARIA |
| rich-text | Lexical | R (core JS) | headless | 1 + 1 peers | MIT [A] | 0.52.0 (2026-09) | 19 (+230 pre) | 16 | 771 (27) | 6.7M | 84.9 | code: kbd+ARIA |
| rich-text | ProseMirror | JS | engine | 3 | MIT [A] | 1.4.4 (2025-10) | 1 | 0 | 24 (92) | 23.3M | 76.2 | code: kbd+ARIA |
| rich-text | BlockNote | R | styled | 21 + 6 peers | MPL-2.0 [B] | 0.55.0 (2026-09) | 36 (+2 pre) | 16 | 534 (39) | 637k | 319.5 +105.9 lazy | code: kbd+ARIA |
| rich-text | Slate + slate-react + history | R | headless | 0 | MIT [A] | 0.126.2 (2026-08) | 7 (+9 pre) | 4 | 60 (28) | 3.1M | 57.7 | code: kbd only |
| rich-text | Plate | R | headless | 7 + fw | MIT [A] | 53.3.14 (2026-09) | 37 (+2 pre) | 4 | 882 (37) | 428k | 147.8 | code: kbd only |
| rich-text | Quill 2 | JS | styled | 4 | BSD-3-Clause [A] | 2.0.3 (2024-11) | 0 | 0 | 0 (—) | 7.8M | 58.0 | code: kbd+ARIA |
| rich-text | Editor.js | JS | styled | 3 | Apache-2.0 [A] | 2.31.7 (2026-09) | 7 | 0 | 11 (36) | 331k | 64.0 | code: kbd only |
| rich-text | Milkdown | JS | headless | 21 | MIT [A] | 7.22.2 (2026-09) | 16 | 0 | 117 (54) | 450k | 108.3 | code: kbd+ARIA |
| rich-text | CKEditor 5 | JS | styled | 60 | GPL-2.0+ or commercial (dual) [C copyleft] | 48.5.2 (2026-09) | 26 (+639 pre) | 2 | 3117 (13) | 1.1M | 158.6 | code: kbd+ARIA |
| rich-text | TinyMCE | JS | styled | 0 | GPL-2.0+ or commercial (dual) [C copyleft] | 8.9.2 (2026-09) | 19 | 0 | 583 (11) | 1.3M | 175.9 | code: kbd+ARIA |
| crop | Cropper.js 2 | WCs | styled | 2 | MIT [A] | 2.2.0 (2026-08) | 4 | 0 | 57 (96) | 1.9M | 12.1 | code: kbd+ARIA |
| crop | react-easy-crop | R | styled | 1 + fw | MIT [A] | 6.2.3 (2026-07) | 14 (+30 pre) | 1 | 35 (94) | 3.7M | 7.5 | code: kbd only |
| crop | react-image-crop | R | styled | 0 + fw | ISC [A] | 11.1.2 (2026-06) | 3 | 0 | 7 (100) | 2.9M | 3.9 | code: kbd only |
| crop | react-advanced-cropper | R | styled | 3 + fw | MIT [A] | 0.20.1 (2025-03) | 0 | 0 | 4 (75) | 197k | 24.5 | code: none found |
| image-edit | Filerobot Image Editor | R (+ JS) | styled | 7 + 2 peers | MIT [A] | 5.0.0-beta.159 (2026-06) | 0 (+51 pre) | 0 | 3 (33) | 66k | 339.8 | code: kbd+ARIA |
| image-edit | tui-image-editor | JS | styled | 3 | MIT [A] | 3.15.3 (2022-04) | 0 | 0 | 0 (—) | 36k | 195.0 | code: kbd only |
| image-edit | Pintura | JS + wrappers | styled | 0 | custom (package.json only) [C procurement] | 8.100.4 (2026-09) | 29 | 0 | — | 11k | n/m | — |
| image-edit | @imgly/background-removal | JS | engine | 3 + 1 peers | AGPL-3.0 [C copyleft] | 1.7.0 (2025-07) | 0 | 0 | 0 (—) | 151k | n/m | — |
| colour | react-colorful | R | styled | 0 + fw | MIT [A] | 5.8.1 (2026-09) | 4 | 0 | 13 (85) | 6.8M | 3.8 | code: kbd+ARIA |
| colour | React Aria ColorPicker family | R | headless | 7 + fw | Apache-2.0 [A] | 1.21.1 (2026-09) | 11 (+243 pre) | 0 | 912 (18) | 5.3M | 74.7 | code: kbd+ARIA |
| colour | vanilla-colorful | WCs | styled | 0 | MIT [A] | 0.7.2 (2022-11) | 0 | 0 | 0 (—) | 704k | 2.8 | code: kbd+ARIA |
| colour | @simonwep/pickr | JS | styled | 0 | MIT [A] | 1.10.2 (2026-09) | 3 | 0 | 13 (92) | 271k | 8.0 | code: kbd+ARIA |
| colour | @jaames/iro | JS | styled | 2 | MPL-2.0 [B] | 5.5.2 (2021-07) | 0 | 0 | 0 (—) | 75k | 10.0 | code: none found |
| colour | @melloware/coloris | JS | styled | 0 | MIT [A] | 0.25.0 (2025-06) | 0 | 0 | 0 (—) | 48k | 5.3 | code: kbd+ARIA |
| upload | Uppy 6 | JS + R/Vue/Sv/Ng | styled | 9 | MIT [A] | 6.1.0 (2026-09) | 7 | 1 | 708 (34) | 1.4M | 91.3 | code: kbd+ARIA |
| upload | filepond | JS + wrappers | styled | 0 | MIT [A] | 4.32.12 (2026-03) | 3 (+86 pre) | 0 | 21 (62) | 318k | 40.5 | code: ARIA only |
| upload | react-dropzone | R | headless | 2 + 1 peers | MIT [A] | 20.1.2 (2026-09) | 24 | 6 | 47 (79) | 15.0M | 6.2 | code: keys, no ARIA |
| upload | tus-js-client | JS | engine | 7 | MIT [A] | 4.3.1 (2025-01) | 0 (+1 pre) | 0 | 16 (63) | 2.1M | 15.7 | code: none found |
| upload | React Aria DropZone + FileTrigger | R | headless | 7 + fw | Apache-2.0 [A] | 1.21.1 (2026-09) | 11 (+243 pre) | 0 | 912 (18) | 5.3M | 36.1 | code: kbd+ARIA |
| upload | Dropzone.js | JS | styled | 0 | MIT [A] | 6.3.5 (2026-09) | 10 | 1 | 96 (58) | 677k | 11.7 | code: none found |
| virtual | @tanstack/react-virtual | R, Vue, Sv, So, Ng, Lit | headless | 1 + fw | MIT [A] | 3.14.13 (2026-09) | 28 | 0 | 80 (39) | 27.9M | 7.7 | code: none found |
| virtual | react-window 2 | R | headless | 0 + fw | MIT [A] | 2.3.3 (2026-09) | 12 (+6 pre) | 0 | 106 (97) | 7.6M | 4.7 | code: kbd+ARIA |
| virtual | react-virtuoso | R | headless | 0 + fw | MIT [A] | 4.18.15 (2026-09) | 19 | 0 | 326 (95) | 3.8M | 19.7 | code: none found |
| virtual | virtua | R, Vue, So, Sv | headless | 0 + 3 peers | MIT [A] | 0.52.8 (2026-09) | 53 | 9 | 375 (97) | 1.2M | 4.1 | code: none found |
| virtual | React Aria Virtualizer + ListBox | R | headless | 7 + fw | Apache-2.0 [A] | 1.21.1 (2026-09) | 11 (+243 pre) | 0 | 912 (18) | 5.3M | 43.1 | code: kbd+ARIA |
| virtual | @virtuoso.dev/message-list | R | headless | 1 + fw | proprietary [C procurement] | 1.18.1 (2026-09) | 23 (+5 pre) | 0 | — | 22k | n/m | — |
| data-grid | react-data-grid 7 | R | styled | 0 + fw | MIT [A] | 7.0.0-beta.61 (2026-07) | 0 (+4 pre) | 0 | 113 (87) | 676k | 13.9 | code: kbd+ARIA |
| data-grid | AG Grid Community | R, Vue, Ng, JS | styled | 2 | MIT [A] | 36.2.0 (2026-09) | 14 | 2 | 2584 (14) | 3.8M | 198.1 | code: kbd+ARIA |
| data-grid | tabulator-tables | JS | styled | 0 | MIT [A] | 6.5.3 (2026-09) | 5 | 0 | 145 (25) | 198k | 101.7 | code: kbd+ARIA |
| data-grid | @revolist/revogrid | WC + wrappers | styled | 0 | MIT [A] | 4.28.2 (2026-09) | 73 | 0 | 341 (73) | 38k | 26.8 +81.3 lazy | code: kbd+ARIA |
| data-grid | handsontable | JS + wrappers | styled | 0 | proprietary [C procurement] | 18.1.1 (2026-09) | 7 (+733 pre) | 2 | 1632 (28) | 347k | 162.4 | code: kbd+ARIA |
| data-grid | jspreadsheet-ce | JS | styled | 2 | MIT [A] | 5.0.4 (2025-08) | 0 | 0 | 18 (50) | 75k | 129.1 | code: kbd+ARIA |
| data-grid | Univer | JS | styled | 9 | Apache-2.0 [A] | 1.0.2 (2026-09) | 36 (+83 pre) | 16 | 1238 (31) | 351k | n/m | — |
| timeline | vis-timeline | JS | styled | 0 + 9 peers | Apache-2.0 + MIT (one file) [A] | 8.5.4 (2026-08) | 7 | 0 | 25 (76) | 286k | 159.2 | code: keys, no ARIA |
| timeline | frappe-gantt | JS | styled | 0 | MIT [A] | 1.2.2 (2026-02) | 5 | 0 | 39 (49) | 235k | 13.0 | code: none found |
| timeline | SVAR React Gantt | R (+ Sv, Vue) | styled | 17 + fw | MIT [A] | 2.7.3 (2026-09) | 14 | 1 | 20 (70) | 112k | 81.3 | tested (gantt-svar) |
| timeline | dhtmlx-gantt | JS | styled | 0 | MIT [A] | 10.0.3 (2026-09) | 9 | 1 | 9 (100) | 43k | 174.3 | code: kbd+ARIA |
| timeline | @bryntum/gantt | JS + wrappers | styled | 0 | MIT (package.json only) [D] | 7.3.7 (2026-09) | 15 | 1 | — | 97 | n/m | — |
| timeline | @xzdarcy/react-timeline-editor | R | styled | 6 + fw | MIT [A] | 1.0.0 (2026-01) | 1 (+1 pre) | 1 | 3 (100) | 11k | 65.8 | code: kbd+ARIA |
| timeline | wavesurfer.js + regions + timeline | JS | engine | 0 | BSD-3-Clause [A] | 8.0.1 (2026-09) | 17 (+5 pre) | 1 | 92 (68) | 1.5M | 21.8 | code: none found |
| timeline | FullCalendar 7 | JS, R, Vue, Ng | styled | 3 + 1 peers | MIT [A] | 7.1.0 (2026-09) | 6 (+8 pre) | 1 | 152 (95) | 291k | 75.2 | code: ARIA only |
| timeline | @fullcalendar/resource-timeline | JS + wrappers | styled | 3 + 2 peers | GPL-3.0 or commercial (dual) [C procurement] | 6.1.21 (2026-06) | 2 (+2 pre) | 0 | 1435 (98) | 298k | n/m | — |
| timeline | @schedule-x/calendar | JS + wrappers | styled | 0 + 3 peers | MIT [A] | 4.9.0 (2026-09) | 25 | 1 | 95 (87) | 176k | 49.1 | code: kbd+ARIA |
| timeline | react-big-calendar | R | styled | 16 + fw | MIT [A] | 1.20.0 (2026-06) | 2 | 0 | 12 (67) | 1.5M | 55.1 | code: ARIA only |
| timeline | @remotion/player | R | engine | 1 + fw | proprietary [C procurement] | 4.0.529 (2026-09) | 171 | 0 | 10667 (59) | 1.7M | 97.9 | code: kbd only |
| shortcuts | tinykeys | JS | headless | 0 | MIT [A] | 4.0.1 (2026-09) | 3 | 1 | 21 (90) | 402k | 1.0 | code: keys, no ARIA |
| shortcuts | @tanstack/react-hotkeys | R (+ core) | headless | 2 + fw | MIT [A] | 0.12.1 (2026-09) | 30 | 13 | 92 (65) | 1.2M | 14.4 | code: kbd only |
| shortcuts | react-hotkeys-hook | R | headless | 0 + fw | MIT [A] | 5.3.3 (2026-06) | 9 | 0 | 104 (85) | 5.1M | 2.5 | code: kbd only |
| shortcuts | hotkeys-js | JS | headless | 0 | MIT [A] | 4.0.8 (2026-09) | 9 (+7 pre) | 1 | 60 (88) | 1.7M | 3.4 | code: kbd only |
| shortcuts | @github/hotkey | JS | headless | 0 | MIT [A] | 3.1.4 (2026-03) | 2 | 0 | 19 (47) | 30k | 2.3 | code: keys, no ARIA |
| shortcuts | mousetrap | JS | headless | 0 | Apache-2.0 [A] | 1.6.5 (2020-01) | 0 | 0 | 0 (—) | 1.1M | 2.7 | code: keys, no ARIA |
| gesture | @use-gesture/react | R (+ JS) | headless | 1 + fw | MIT [A] | 10.3.1 (2024-03) | 0 | 0 | 0 (—) | 7.8M | 9.6 | code: none found |
| gesture | Motion for React, LazyMotion + domMax | R (+ JS, Vue) | headless | 2 + fw | MIT [A] | 13.4.4 (2026-09) | 72 (+15 pre) | 1 | 1095 (85) | 25.4M | 41.1 | code: keys, no ARIA |
| gesture | @neodrag/vanilla | JS, R, Vue, Sv, So | headless | 0 | MIT [A] | 2.3.1 (2025-06) | 0 (+3 pre) | 0 | 0 (—) | 4k | 2.3 | code: none found |
| gesture | hammerjs | JS | headless | 0 | MIT [A] | 2.0.8 (2016-04) | 0 | 0 | 0 (—) | 2.2M | 7.3 | code: none found |
| zoom-pan | react-zoom-pan-pinch | R | headless | 0 + fw | MIT [A] | 4.2.0 (2026-09) | 11 | 1 | 60 (93) | 2.8M | 14.2 | code: kbd only |
| zoom-pan | @panzoom/panzoom | JS | headless | 0 | MIT [A] | 4.6.2 (2026-04) | 2 | 0 | 8 (100) | 1.0M | 3.6 | code: none found |
| zoom-pan | panzoom | JS | headless | 3 | MIT [A] | 9.4.4 (2026-03) | 1 | 0 | 5 (80) | 165k | 6.9 | code: kbd only |
| zoom-pan | d3-zoom + d3-selection | JS | headless | 5 | ISC [A] | 3.0.0 (2021-06) | 0 | 0 | 0 (—) | 35.5M | 15.9 | code: none found |
| zoom-pan | svg-pan-zoom | JS | headless | 0 | BSD-2-Clause [A] | 3.6.2 (2024-10) | 0 | 0 | 1 (100) | 829k | 8.2 | code: none found |
| zoom-pan | PhotoSwipe 5 | JS | styled | 0 | MIT [A] | 5.4.4 (2024-05) | 0 | 0 | 3 (67) | 612k | 4.5 +16.9 lazy | code: kbd+ARIA |
| selection | @viselect/vanilla | JS, R, Vue, Preact | headless | 0 | MIT [A] | 3.10.1 (2026-09) | 2 | 0 | 21 (81) | 41k | 4.6 | code: kbd only |
| selection | selecto | JS + wrappers | headless | 10 | MIT [A] | 1.26.3 (2023-12) | 0 | 0 | 0 (—) | 666k | 18.9 | code: kbd only |
| selection | dragselect | JS | headless | 0 | GPL-3.0+ or commercial (dual) [C copyleft] | 3.1.2 (2025-10) | 1 | 0 | 56 (100) | 12k | 10.8 | code: kbd only |
| selection | @air/react-drag-to-select | R | headless | 1 + fw | MIT [A] | 5.0.11 (2025-06) | 0 | 0 | 0 (—) | 48k | 2.7 | code: none found |
| selection | d3-polygon | JS | headless | 0 | ISC [A] | 3.0.1 (2021-06) | 0 | 0 | 0 (—) | 23.8M | 0.2 | code: none found |
| freehand | perfect-freehand | JS | headless | 0 | MIT [A] | 1.2.3 (2026-02) | 1 | 0 | 5 (80) | 3.0M | 1.9 | code: none found |
| freehand | signature_pad | JS | headless | 0 | MIT [A] | 5.1.4 (2026-07) | 3 | 0 | 12 (50) | 2.9M | 4.4 | code: none found |
| collab | Yjs + y-websocket | JS | engine | 1 | MIT [A] | 13.6.33 (2026-09) | 6 (+8 pre) | 0 | 225 (93) | 10.5M | 30.4 | code: none found |
| collab | Yjs + Hocuspocus provider | JS | engine | 3 + 2 peers | MIT [A] | 4.7.0 (2026-09) | 20 (+12 pre) | 1 | 175 (85) | 1.4M | 32.3 | code: none found |
| collab | Automerge 3 | JS | engine | 0 | MIT [A] | 3.5.0 (2026-09) | 13 (+8 pre) | 0 | 215 (54) | 73k | 9.1 +1117.1 wasm/assets | code: none found |
| collab | Loro | JS | engine | 0 | MIT [A] | 1.16.3 (2026-09) | 44 | 0 | 156 (74) | 148k | 12.6 +1053.1 wasm/assets | code: none found |
| collab | Liveblocks client + React | R (+ JS) | service | 1 | Apache-2.0 (repo notice: other packages AGPL-3.0) [A] | 3.24.2 (2026-09) | 48 (+103 pre) | 0 | 516 (29) | 447k | 66.2 | code: none found |
| collab | PartySocket | JS | engine | 1 + fw | MIT [A] | 1.3.0 (2026-06) | 15 (+8 pre) | 0 | 138 (88) | 3.5M | 4.0 | code: none found |
| collab | TinyBase | JS + R | engine | 0 + 28 peers | MIT [A] | 10.0.1 (2026-09) | 40 (+61 pre) | 4 | 1267 (99) | 18k | 17.9 | code: none found |
| collab | perfect-cursors | JS | headless | 1 | MIT [A] | 1.0.5 (2022-01) | 0 | 0 | 0 (—) | 136k | 1.9 | code: none found |
| collab | Rocicorp Zero | R, So, JS | engine | 49 | Apache-2.0 [A] | 1.9.0 (2026-08) | 48 (+535 pre) | 3 | 1473 (26) | 243k | n/m | — |
| collab | replicache | JS | engine | 4 | custom [?] | 15.3.0 (2025-07) | 0 | 0 | 0 (—) | 12k | n/m | — |

## Decision guidance for the skill

### D1. `references/resources/hard-ui.md` (new): the lookup to consult before building complex UI

The file opens with the D2 procedure, then this table.

**Stack rule:** use the primitive layer the repo already has for **consistency**: the same tokens, focus model and announcements. It is **not a size argument**:
- On top of a React Aria base (48.5 KB), DnD adds 37.6 KB, Tree 40.0, ColorPicker 36.8 and DropZone 21.8. That is 2–10× the standalone library (F5).
- It is smaller only for the palette (+4.2 KB against cmdk's 17.7).
- Choose the primitive layer when its tested behaviour matters (React Aria's DnD announcements, i18n). Otherwise use the small library and write the announcements yourself.

| Need | Use | Or, when… | Avoid, because… |
|---|---|---|---|
| Command palette | Base UI `Autocomplete inline` in a Dialog: passed every check, including the announced empty state | React Aria Autocomplete + Menu if the app is on React Aria (+4.2 KB; Escape clears first; add a result-count status) | cmdk in new work: dormant, and it drops focus to `body`. kbar: no dialog role, background exposed. Commands come from one registry (P4). |
| Sortable list (React) | dnd-kit core + sortable (16.2 KB), **with your own `announcements` using item labels** | React Aria GridList + `useDragAndDrop` on React Aria stacks (best default announcements, +37.6 KB); Pragmatic (7.1 KB) **plus a move menu** | react-dnd (dead); swapy and DragSelect (GPL); SortableJS or vue-draggable-plus without a move menu |
| Sortable (Vue, Svelte) | vue-draggable-plus + a move menu; svelte-dnd-action (keyboard + ARIA in code) | — | — |
| Tree with DnD | @headless-tree (9 KB, ARIA tree, keyboard) | React Aria Tree on React Aria stacks (+40 KB); react-arborist when virtualised | — |
| Dashboard tiles | react-grid-layout or gridstack **plus a keyboard "Move / resize widget" dialog** (no keyboard or ARIA found in either) | often better: a fixed grid plus a reorder list | — |
| Split view | react-resizable-panels 4 | Ark/Zag Splitter outside React (set `aria-orientation` yourself) | allotment (not focusable); split.js; CSS `resize` (no keyboard; no effect on iOS [V BCD 8.1.3]) |
| Docking / IDE layout | **Question the need first**; resizable panels + tabs cover most products | dockview (MIT): tabs inside a group are keyboard-operable for free. **Cross-group focus (F6), keyboard re-docking, and focus restore/containment are paid**; build them or buy. flexlayout-react (ARIA, one maintainer). | golden-layout (stale) |
| Node editor | React Flow 12: `ariaLabel` on every node and edge, a "Connect to…" menu (2.5.7), focus kept after delete, dagre for layout | maxGraph (Apache; 3 breaking 0.x versions a year); JointJS core (MPL, class B) | Rete (dormant core), litegraph, GoJS (proprietary) |
| Diagrams for reading | mermaid rendered **at build time** | elkjs in a Worker (EPL, 430 KB) | 1.5 MB of mermaid on a marketing page; bpmn-js unless the client accepts its logo |
| Whiteboard | Excalidraw (MIT), lazy-loaded (368 KB + 2.1 MB); add a list view of elements | tldraw only if the client buys a licence | a whiteboard embedded on a marketing page |
| Canvas object editor | ≤ ~200 objects: DOM/SVG + interact.js. More objects: Konva. Either way **add the Layers listbox + inspector + status layer** (6/6 in the lab) | Fabric 7 | Moveable, selecto (dormant); Polotno (subscription) |
| Rich text | Tiptap 3 (MIT) | Lexical: **pin exact versions** (16 breaking 0.x versions in 12 months; 19 stable releases + 230 nightlies). BlockNote for block editing: core MPL, **not** `xl-*`, also 16 breaking versions. Plate for shadcn stacks. | CKEditor or TinyMCE unless licensed; Quill (dormant) |
| Image crop | react-image-crop (3.9 KB, arrow keys, labelled handles) | react-easy-crop for avatars; Cropper.js 2 outside React | react-advanced-cropper |
| Image adjustments | CSS `filter` / `ctx.filter` | Konva filters | Filerobot (51 betas, 0 stable releases); tui-image-editor; Pintura without a licence decision |
| Colour | `<input type=color>` when no alpha is needed. **Alpha/colorspace: Safari 18.4 only; Firefox preview; Chrome none** [V BCD 8.1.3] | react-colorful (3.8 KB, sliders with `aria-valuetext`); React Aria ColorPicker on React Aria stacks (+36.8 KB) | iro.js (dormant, no ARIA) |
| Upload | react-dropzone (6.2 KB) + a real `<input type=file>` button; tus-js-client for resumable uploads | React Aria DropZone + FileTrigger on React Aria stacks (+21.8 KB); Uppy 6 Dashboard (91 KB) | FilePond's image edit (Pintura) |
| Long lists | Pagination (`app-ui.md` §5); `content-visibility:auto` | TanStack Virtual (render the ARIA yourself); react-window 2 (grid roles, `aria-setsize`/`posinset`); the React Aria Virtualizer (+8.8 KB) | Virtualising content users need to Ctrl+F or read in browse mode |
| Grids beyond TanStack | react-data-grid 7 (ARIA grid, 14 KB; still beta) | AG Grid Community (198 KB) | Handsontable; Tabulator when it must be themed |
| Calendar | FullCalendar 7 (MIT; ARIA found, **keyboard not**: test it) or Schedule-X (keyboard + ARIA in code) | resource views: FullCalendar Premium | react-big-calendar |
| Gantt | **SVAR React Gantt (MIT)**. Its task list is a tested ARIA grid with arrow-key selection and Backspace delete. Scheduling is pointer-only by default. Add:<br>• a keyboard path to change dates and durations (SVAR's `Editor` or editable columns; untested);<br>• `aria-selected` on the selected row;<br>• confirm or undo, plus a status message, on delete;<br>• focus to the next row after a delete (it drops to `body`). | DHTMLX Community (MIT; ARIA treegrid + key maps in code; untested); PRO editions for scheduling logic; frappe-gantt for read-only charts (nothing found) | Bryntum's public npm package (a placeholder, class D) |
| Media timeline | wavesurfer.js 8 plus your own keyboard (none found) | — | Remotion without checking company size |
| Shortcuts | tinykeys (1 KB) or react-hotkeys-hook; `aria-keyshortcuts`; single-key shortcuts need an off switch (2.1.4 [K]) | @github/hotkey | mousetrap; @tanstack/react-hotkeys until it settles (13 breaking 0.x versions) |
| Gestures | Pointer Events + `touch-action` + `setPointerCapture`, with the P8 numbers | Motion drag when Motion is already present | @use-gesture, hammerjs |
| Zoom and pan | @panzoom/panzoom or react-zoom-pan-pinch **plus +/−/Reset buttons** | PhotoSwipe 5 for galleries | — |
| Marquee / lasso | @viselect (4.6 KB); d3-polygon; Shift/Ctrl+click and Ctrl+A | — | DragSelect (GPL); selecto |
| Freehand / signature | perfect-freehand; signature_pad **plus a typed-name alternative** | — | — |
| Multiplayer | Yjs + Hocuspocus | Liveblocks hosted (client Apache-2.0; a self-hosted server is AGPL) | Automerge or Loro on a page budget (~1 MB of WASM) |

### D2. The capability-discovery procedure (new)

Put it at the top of `hard-ui.md`. Add one line to `SKILL.md` Workflow → Phase 5 (**extends**).

1. **When.** The design needs any of:
   - direct manipulation;
   - more than ~200 items in view;
   - rich text;
   - graphs;
   - a time axis the user edits;
   - multiplayer;
   - resumable upload;
   - a composite keyboard model.
2. **Order of options.** Go down this list and stop at the first that serves:
   - (a) a simpler pattern;
   - (b) the platform: `<dialog>` + `commandfor` (Chrome 135, Safari 26.2, Firefox 144 [V BCD]), `popover`, `inert`, Pointer Events, CSS `filter`;
   - (c) the repo's primitive layer, for consistency (not size, F5);
   - (d) `hard-ui.md`;
   - (e) search;
   - (f) build it yourself only when every candidate is class C or D, or the need is under ~150 lines. Record why in `DESIGN.md`.
3. **Where to search, in this order:**
   1. `hard-ui.md`.
   2. The component lists of the primitive layer in use: React Aria, Base UI, Ark/Zag, Bits, Reka.
   3. The dependency lists of products that already do it well (F7).
   4. **Last:** `libcheck --search` with three phrasings. It yields **candidate names only**. Measured: in 18 designer queries, no recommended leader in the top 12 for 7, and only some of them for 5 more. It also surfaces vendor subpackages, dormant packages and unrelated CLI tools (F7).
   5. WebSearch for names only, never listicles as evidence.
4. **Judging in ten minutes.**
   - `node scripts/libcheck.mjs <pkg> --size --entry "…"` gives:
     - the licence class A–D with the restrictive sentences quoted;
     - stable, pre-release and breaking counts;
     - bus factor, downloads and size;
     - RED/AMBER flags.
   - **The flags are triage for a human to read, not a gate:**
     - RED means "do not adopt until someone has read the quoted evidence and decided". For a purchase, the client decides; write it into `DESIGN.md` as a question.
     - AMBER means "write it down and mitigate": pin the version, wrap it, lazy-load it.
     - Measured: 34/34 regression cases; **15/16 correct on held-out packages at the first run**.
   - Then read the README and the last three changelog entries.
   - Then try its demo, or a 20-line one:
     - keyboard only;
     - names and roles in the CDP tree (not ariaSnapshot, F9);
     - live-region text;
     - `states.mjs --axe`.

### D3. `resources/README.md` (extends: a code-library row for each class, the libcheck line, two new rules)

- **Keep the three manual commands.** That README is about assets, and libcheck is scoped to code libraries. libcheck recognises OFL and CC texts only so that it does not mislabel them.
- Add one line: "For **code libraries**: `node scripts/libcheck.mjs <pkg>` (licence class, activity, size; triage)."
- **Map code libraries onto the existing classes.** The letters keep their meaning:
  - **A (ship freely):** MIT, ISC, Apache-2.0, BSD, 0BSD, Unlicense.
  - **B (ship with a condition):** MPL-2.0 and EPL-2.0 (file-level copyleft: keep the notices; publish changes to the library's own files; your code is unaffected). This extends B from "credit" to "a condition".
  - **C (only with a human decision recorded in `DESIGN.md`):**
    - *copyleft*: GPL, AGPL, LGPL, and GPL-or-commercial dual licences;
    - *brand decision*: a third-party logo or watermark must stay visible (bpmn-js);
    - *procurement*: paid, source-available, trial-limited, or capped by headcount or revenue. Examples: tldraw, Polotno, GoJS, Handsontable, dockview-enterprise, FullCalendar Premium, Remotion company use, Highcharts, AG Grid Enterprise, Mapbox GL ≥ 2, Pintura. Here the human decision is the client buying the licence.
  - **D (reject):** no licence text or field anywhere; non-commercial only; placeholder packages (Bryntum's public npm package). If the client then buys the real product, its contract makes it a C procurement item.
- **Add two rules.** Do not repeat "the shipped file wins"; it is already there.
  - A licence file can be a pointer (a URL, "SEE LICENSE IN", or a one-line link), a repository-wide notice ("each package's … package.json specifies": read the `package.json` field), or a proprietary licence followed by third-party notices (read the first section).
  - A placeholder package can claim MIT.

### D4. `resources/libraries.md`: replaces the command-palette row and adds a pointer

New row: "Base UI Autocomplete `inline` or React Aria Autocomplete + Menu (tested, `hard-ui.md`). cmdk only where it already exists, and then restore focus to the opener yourself."

Add at the top: "Hard UI: `hard-ui.md`."

### D5. `accessibility.md` §3, §4 and §7: extends

- **Sortable:**
  - a handle named "Reorder ‹item›";
  - instructions in `aria-describedby`;
  - Space/Enter, arrows, Space, Escape;
  - announcements name items and positions, **never ids**;
  - focus stays on the moved item;
  - a move menu.
- **Splitter:** `role=separator` with value attributes; `aria-orientation` equal to the divider's orientation; arrows, Home/End, Enter, F6.
- **Node editor:** named nodes and edges; a keyboard way to connect; focus kept after delete.
- **Gantt (new, from `gantt-svar`):**
  - the task list is a grid;
  - the selected row has `aria-selected`;
  - every date change a bar drag can make is also possible from the keyboard (an editor or editable cells);
  - delete confirms or offers undo, announces, and moves focus to the next row.
- **Canvas:** a Layers listbox + inspector, or the tldraw model; announce "‹label›, ‹type›. n of total".
- **§7 (extends §7.2, cites §7.1 rather than repeating it):**
  - For bursts of rapid successive messages (drag moves, typing-driven result counts), debounce so only the last is spoken.
  - Pragmatic uses 1000 ms. That is a library default [V], not a screen-reader-tested rule.
  - Single status messages stay immediate.

`scripts/widgets.mjs` (**extends**): add the contract types `palette`, `sortable`, `splitter` and `gantt`, using the pass/fail scenarios in `demos/tests.mjs`.

### D6. `ui-ux.md` §7b: extends (unchanged)

- Drag threshold 4 px on fine pointers, 6 px on coarse.
- Double-click 450 ms; long press 500 ms.
- Escape returns to the mark taken at the gesture's start.
- Remote and initial changes never enter undo.
- Every canvas object is also a DOM row with an inspector.

### D7. `motion.md` §5: extends (unchanged)

- State in data attributes, motion in CSS; unmount after `getAnimations()`.
- P8 gesture numbers as defaults.

### D8. `app-ui.md` §13 traps: extends

- cmdk does not return focus.
- dnd-kit's default announcements read ids.
- React Flow nodes are unnamed and edges are named by id.
- Canvas libraries expose nothing to AT.
- allotment's separator is not focusable.
- SVAR Gantt's bars are pointer-only, and focus drops to `body` after Backspace deletes.
- **dockview: cross-group keyboard navigation (F6), keyboard docking and focus restore are in the paid tier**; the tablist inside a group is free.

### D9. `performance.md` §5: extends (unchanged)

Load heavy editors by route or interaction, render static diagrams at build time, and count the WASM when choosing a CRDT.

### D10. Scripts

`scripts/libcheck.mjs` (**new, proposed**). It was not copied into `skills/`, because this brief named no new script. Conditions for promoting it:
- Promote it together with its regression cases (`lib/regress.mjs`, 34 cases) as a self-test, and add every future wrong verdict as a case.
- Its header states its scope (code libraries) and that its flags are triage.
- It needs Node 18+ and git.
- It supports `pkg@version`, `pkg=owner/repo`, `--size`, `--entry`, `--json` and `--search`.

`scripts/lib/seen.mjs` (**bug**): treat content with an `inert` or `aria-hidden` ancestor as not readable (F9).

## Rejected ideas and why

- **npm search scores and download ranking as quality signals.** The score fields are constant. Downloads reward transitive installs and vendors with many subpackages (F7).
- **Trusting the `package.json` licence field**, or grepping licence texts for keywords (F1 classifier traps).
- **libcheck RED as an automatic block.** Its heuristics were wrong on 5 packages outside the lab, and still 1 in 16 on held-out packages. A human reads the quoted evidence.
- **Choosing the primitive layer to save bytes.** Measured, it costs 2–10× more for DnD, trees, colour and upload (F5).
- **A blanket 1-second delay on live regions.** It contradicts §7's immediate status messages, and it is untested with screen readers.
- **A single-package code scan** (it missed SVAR). Presence-in-code as proof of accessibility (it only points at what to test).
- **Stars and the GitHub API.** tldraw as the default whiteboard (licence). Game engines as canvas editors (out of scope). Date pickers (already covered).

## Open questions and limits of this evidence

- **Screen-reader behaviour is inferred** from headless Chromium's accessibility tree, focus and live-region text. No NVDA, JAWS or VoiceOver run; no Safari or Firefox; no touch drag.
- **Demos test defaults plus the documented minimum wiring.** SVAR's `Editor` component and editable columns were not tested; neither were DHTMLX's `keyboard_navigation` plugin, FullCalendar's keyboard support, or the React Aria Tree and ColorPicker.
- **The F4 scan is string presence.** Its first version missed two libraries' arrow keys, so a "none found" is weaker evidence than a "found".
- **libcheck evidence is small:**
  - 34 regression cases, which are training cases;
  - 16 held-out packages, where the expected verdicts came partly from memory. One of mine was wrong: PrimeReact.
  - Licence readings are engineering triage, not legal advice.
- **Sizes are for minimal usage**, gzip. Activity counts cover whole monorepos, and the window moves. The discovery probe has 18 queries with one wording each.
- **Not tested:** RTL and i18n of announcements, virtualisation with screen readers, collaboration under latency (S5).

## Changes after review

1. **Blocking: libcheck verdicts wrong in both directions.** Fixed in `libcheck.mjs`; re-measured. `lib/regress.mjs` has 34 pinned cases (all reviewer packages plus the F1 traps), 34/34 pass. `lib/heldout.mjs` has 16 new packages:
   - First run 15/16. Mapbox's head section was misread; fixed. My PrimeReact expectation was wrong; the tool was right. A moment repo-shorthand bug was also fixed.
   - Changes to the classifier:
     - Procurement flags now escalate even when an OSI phrase matched. New flags: time-limited, paid, vendor-agreement, no-logo-use.
     - Multi-licence repository notices use the section naming the package, then the `package.json` field.
     - README notices must be about this package ("this repo/package is…", "`name` is…", a top-of-README banner). The package README is read first, then the repo root README. "Maintenance mode" gives an AMBER. A README procurement detector was added (Pintura).
     - The MIT test now needs the full grant ("to any person obtaining a copy of this software").
     - Evidence prefers restrictive passages.
   - D2, D10 and Rejected now say the flags are triage.
   - Catalogue licence cells now come from `table.mjs` unedited. Liveblocks and Remotion are correct at the source.
2. **D3 scope and classes.** libcheck is scoped to code libraries; the manual asset commands are kept. OFL, CC-BY, CC-BY-SA, CC-BY-NC and CC0 tests were added, along with a `package.json` field fallback before "no licence".
   - Results: Solar → B, both Inter packages → OFL-1.1 (A), GSAP → "?" (read it), Remix Icon → C "restricted use" with the prohibitions quoted.
   - Code libraries are mapped onto A–D with unchanged meanings. Procurement is class C (a human decision); unstated or placeholder packages are D.
   - "The shipped file wins" is not re-added.
3. **dockview.** Verified `dockview-core`'s free tablist keyboard handling and the enterprise service doc comments [V]. F1, D1 and D8 now say which parts are paid: F6 group cycling, keyboard docking, and focus restore and containment.
4. **F4 / SVAR.** The scan now covers every bundled package (`lib/scan.mjs`, in the size step, attributed per package). The pattern gaps it exposed were fixed (constant runs, unquoted keys, key-code maps). I also added a **SVAR Gantt demo** (`gantt-svar`, 14 checks, 5/5 or 0/5): the task list is a keyboard- and ARIA-operable grid; the bars and date editing are pointer-only. F4, D1, D5 and D8 were corrected. The Rete row was corrected to "keyboard only".
5. **Colour BCD.** Corrected to "alpha/colorspace: Safari 18.4 only (Firefox preview, Chrome none)" [V BCD 8.1.3 `html.elements.input.alpha` / `colorspace`].
6. **Churn.** The registry step now records stable, pre-release and breaking-by-semver counts. The table, F2 and D1 show them, and libcheck's pre-1.0 flag uses breaking versions (Lexical: 16). maxGraph (3 breaking versions) no longer gets a misleading "major versions" flag.
7. **Primitive-layer cost.** Added the `increments` step. It reproduces the reviewer's figures (+37.6 DnD, +36.8 colour, +15.0 Base UI Autocomplete) and adds Tree, DropZone, Virtualizer and Autocomplete. F5 and the D1 stack rule now say "consistency, not size".
8. **D2 search order.** The order is now: hard-ui.md → primitive component lists → dependency lists of products → npm search last, for names only. The probe grew to 18 queries (the reviewer's plus "docking layout"): no leader in the top 12 for 7, partial for 5.
9. **Live regions.** P12 and D5 now limit debouncing to bursts, mark 1000 ms as Pragmatic's default [V] rather than a tested rule, cite §7.1 instead of re-adding it, and keep single status messages immediate.
10. **Table fields.** `lib/table.mjs` now prints framework, kind (headless/styled/engine/service), direct deps (+ peers), licence with class, stable (+pre) releases, breaking versions, and accessibility ("tested (demo)" or the code-scan verdict). The full table above is its raw output.
11. **Also fixed while re-checking:**
    - The F9 test moved from `/tmp` into the lab (`lib/inerttest.mjs`, `run.mjs --only inert`), so it survives a restart.
    - The SVAR demo's scale format strings were corrected. This was cosmetic; the checks are unaffected.
    - Every size in the catalogue re-measured within 64 bytes.

Files are in `/home/user/website-redesign-skill/research/stage2/experiments/S4-capability-catalogue/`:
- `libcheck.mjs`
- `run.mjs`
- `results.json`
- `lib/regress.mjs`
- `lib/heldout.mjs`
- `lib/scan.mjs`
- `lib/inerttest.mjs`
- `lib/table.mjs`
- `lib/meta.mjs`
- `demos/src/gantt-svar.jsx`
- `demos/tests.mjs`
- `shots/gantt-svar.jpg`
