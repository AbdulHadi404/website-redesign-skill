<!-- Stream S5, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S5-configurators-editors/. The skeptical review is in S5-configurators-editors.review.json. -->

# S5: Configurators, consumer editors, and undo/redo architecture

## What the skill already knew

The skill already covers the principles of a configurator, learned on The Cake Junction. They are in `discovery.md` §5, §5b and §5c, `ui-ux.md` §7b, `anti-patterns.md` "Product flows and configurators", and the configurator lines in `categories.md` and `realtime-3d.md`:
- start from something the customer understands, and keep one evolving picture on screen;
- show options as pictures, grouped into a few chapters, and never lose a choice;
- label the preview honestly;
- model made-to-order work as request → quote;
- give a signature builder its own full-screen shell;
- don't move the canvas under the pointer; tell a tap by about 6 px of travel;
- one history entry per gesture, with a single-pointer alternative for every drag;
- open on a real default.

The skill also records that the builder direction was rejected. It had been shaped as "five form chapters around a 2D sketch" when it was meant to be the signature experience (`lessons.md` 2026-09-26, `ledger.md`). The guards against repeating that are `SKILL.md` "Signature experience or supporting feature?", `discovery.md` §5b and "Shrinking a signature experience" in `anti-patterns.md`.

It had nothing on:
- incompatible options, or on "needs" versus "taste";
- choosing between steps, a single panel and an editor;
- phone layout, save/share/resume, randomise, analytics or the finish flow;
- editor chrome;
- undo architecture beyond "one entry per gesture";
- 2D preview technology.

The prototype built here has, on purpose, the shape the lesson rejected for a *signature* experience. It is valid evidence for the mechanics (constraints, undo, persistence, analytics, QA) and for *supporting* made-to-order flows. It is not a model for a signature experience.

## Findings

### A. Configurator UX (research)

1. **Configurators are measurably worse than ordinary sites, and handling incompatible choices is where they fail.**
   - NN/g: sites where people customise products score "substantially worse" than regular sites [S, nngroup.com "Customization of UIs and Products"].
   - Leclercq et al. found 11 design flaws across 28 car configurators; 75% had significant flaws [S, "On Studying Bad Practices in Configuration UIs", CEUR Vol-2068 / ResearchGate].
   - The follow-up study found at least one major bad practice in the repair mechanism of 46 of 54 configurators [S, Lacuna summary of "Representing Repairs in Configuration Interfaces"]. What it criticises:
     - invisible propagation (14 configurators);
     - assisted repairs that did not disclose their full effect (11), which surfaced as frustration at checkout;
     - options blocked without saying why.
   - The same summary says car configurators favour assisted (automatic) repair and PC and appliance configurators favour manual repair, and that neither is done well. Nothing I found calls a manual-repair or confirm step a bad practice in itself.
2. **Start from a starting solution.**
   - Across 9 studies, choosing a pre-built "starting solution" and then refining it cut effort and raised satisfaction [S, Hildebrand, Häubl & Herrmann 2014, JMR].
   - NN/g: keep a good default and only a few templates [S, "Customers as Designers"].
   - Defaults lower perceived complexity [S, Dellaert & Stremersch 2005].
3. **The default framing moves spending.** Starting fully loaded and removing options leads to more options and a higher price than starting from a base model and adding. It can also deter buyers with low commitment [S, Park, Jun & MacInnis 2000, JMR]. Default to a best-seller.
4. **Being the designer has value.** Willingness to pay rises for self-designed products, mediated by a sense of accomplishment [S, Franke, Schreier & Kaiser 2010]. The finish and the share are part of the value.
5. **Saving and sharing.**
   - An 8-character "Porsche Code" reloads a build and needs a new code after each change [S, configurator.porsche.com; theautopian.com].
   - Tesla builds the preview with a server-side compositor driven by URL parameters [S, teslaownersonline.com].
   - IKEA's kitchen planner draws complaints about saving and object manipulation [S, inspiredkitchendesign.com].
6. **Randomise.** Baldur's Gate 3's "Randomize appearance" has no undo, and players asked to lock the features they like [S, Larian forums].
7. **Phone layout.**
   - Bottom sheets suit temporary content, not tools that are always needed [S, NN/g "Bottom Sheets"].
   - Wizards fit only real dependencies [S, NN/g "Wizards"].
   - A sticky price bar is the common mobile pattern [S, vendor and blog sources].
8. **Preview technology.** Use layered 2D for colour or material swaps on a few fixed views, and 3D for geometry and all-round viewing [S, threekit, vividworks, kickflip].

### B. Editor chrome and interaction numbers, read from source

- **tldraw defaults** [V, `packages/editor/src/lib/options.ts`]:
  - a drag starts after 4 px (mouse) / 6 px (touch);
  - a drag *from the toolbar* on touch needs 25 px;
  - snap 8 screen px; double-click 450 ms; long-press 500 ms;
  - hit margin 3 / 4 px; handle radius 12 / 20 px;
  - tooltip 700 ms; edge scroll after 8 px and 200 ms; at most 4,000 shapes per page.
- **excalidraw constants** [V, `common/src/constants.ts`, `excalidraw/snapping.ts`, `excalidraw-app/app_constants.ts`]:
  - snap 8 px ÷ zoom; nudge 1 px, 5 px with Shift;
  - double-tap 300 ms; touch context menu 500 ms; autosave debounce 300 ms.
- **Chrome placement.**
  - tldraw keeps undo/redo in the top-left zone from 840 px up and moves them into the bottom toolbar below that [V, `DefaultMenuPanel.tsx`].
  - Below 640 px its style panel becomes a popover opened from the toolbar [V, `MobileStylePanel.tsx`; breakpoints `[0,389,436,476,580,640,840,1023]`].
  - Figma UI3 reverted floating panels to fixed ones and moved the toolbar to the bottom [S, figma.com blog].
  - Canva uses a contextual toolbar, undo at the top left and "All changes saved" [S].
- **Canvas accessibility in tldraw** [V, `A11y.tsx`, `A11y.test.tsx`]: a skip button selects the first shape in reading order, and a live region announces the selection.
- **Licences.**
  - tldraw's licence forbids production use without a licence key [V, `LICENSE.md`; `npm view` shows "SEE LICENSE"].
  - excalidraw, Yjs, immer, Immutable, zundo and redux-undo are MIT [V].

### C. How mature editors implement undo (read-only source)

**tldraw** [V, `HistoryManager.ts`, `Store.ts`, `Editor.ts`, `SelectTool/childStates/PointingShape.ts`]:
- It records only changes whose source is `'user'`.
- Record diffs are squashed between marks. A drag marks a stopping point; cancel calls `bailToMark`.
- There are three modes: `record`, `record-preserveRedoStack` and `ignore`.
- **Selection is an undo step.** The select tool calls `markHistoryStoppingPoint('selecting shape')` and then `setSelectedShapes`, which records in `record-preserveRedoStack` mode. `_undo` reverts back to the last stop, so Ctrl+Z reverts a selection-only change, and selecting never clears redo.
- **A no-op is never recorded.** `Store.put` skips a record when `validateUsingKnownGoodVersion` returns the known-good object because no property differs (`Store.ts` ~650; `validation.ts` ~700–757).
- Undo applies whole `from` records, so undoing my move also reverts a collaborator's colour change on that shape (lab M1).

**excalidraw** [V, `history.ts` ~117–131, `tests/history.test.tsx` ~889–899, `store.ts`, `delta.ts`]:
- Deltas store only changed keys.
- **Selection is an undo step.** `History.record` pushes every non-empty delta, selection-only appState deltas included, and clears redo only when elements changed. Its own test expects an undo stack of 6 for 3 creates, 2 selection changes and 1 delete, and walks the selection back one Ctrl+Z at a time.
- Undo skips entries with no visible effect, and version fields are excluded.
- Captures are `IMMEDIATELY`, `NEVER` or `EVENTUALLY`.

**Snapshot libraries:**
- zundo: partial snapshots with `diff`, `equality`, `limit`, `handleSet` and `pause`/`resume` [V].
- redux-undo: `limit`, `filter` and `groupBy` [V].

**Yjs UndoManager** [V, `UndoManager.js`]:
- Changes within 500 ms are merged (`captureTimeout`); `trackedOrigins` selects whose changes are recorded.
- It "will never overwrite remote changes", and `keepItem` retains deleted structs.

**Multi-user undo elsewhere:**
- Figma: undo and redo must leave the document unchanged, and a deleted object's properties live in the deleting client's undo buffer [S, figma.com blog].
- Liveblocks: pause history during a drag while broadcasting the positions [S].

### D. What the lab measured

- **Correctness.** Every strategy passed the round trip: final state against a full-copy oracle, undo-all, redo-all, 843 steps [L `history.correctness`, `benchmark[*].correct`; reproduced by the reviewer].
- **At scale, the cost of a pointer move comes from the immutable-update pattern, not from history.** The no-history column matches.
  - Spreading a keyed map costs 49 µs p95 per pointer move at about 300 items and 7.1 ms at 5,000. The reviewer's re-run gave 5.8 ms.
  - Diffs and a persistent map stay at 3–6 µs [L].
  - immer with a `produce` per move costs **roughly 3–16 ms p95 per move at 5,000 items, with or without autofreeze**:
    - the original 5-run cell gave 15.9 ms with freeze and 6.6 ms without;
    - the reviewer got 7.9 and 7.0 ms;
    - the new paired runs gave per-run p95s from 2.6 to 13.6 ms [L `immerFreeze`].
- **The autofreeze penalty** (paired, interleaved runs; load 11–19 on 4 cores) [L `history.immerFreeze`]:
  - It is clear only in small scenes. At 200 items: 171 against 60 µs per move (median of 9 pair ratios 3.1×, range 1.4–7.1×).
  - At 5,000 items it disappears per move: 5.2 against 4.9 ms (1.2×, range 0.54–3.2×). It persists on undo: 3.3 against 2.1 ms (1.7×, range 0.9–2.0×).
  - My original claim of 2.4× at 5,000 items was noise.
- **Memory per step:**
  - command 450–600 B;
  - diffs 0.9–1.1 KB;
  - persistent map 1.4–2.1 KB;
  - immer 1.0–1.5 KB;
  - spread 6–197 KB;
  - naive 94 KB–1.9 MB [L; reproduced within ~1%].
- **Yjs retains deleted content.** History cost 12.5 KB per step, and the client document grew 6.2× (9,494 against 1,519 KB) [L; consistent with `keepItem`].
- **An event log gives cheap, serialisable history but slow undo.** Undo means replay from a checkpoint: 0.47 ms at about 300 items, and 18.7 ms mean / 42 ms p95 at 5,000. The reviewer measured 31 / 82 ms [L].
- **Arrays are a trap for patches.** Deleting the first element of a 1,000-element array produced 1,000 immer patches (52,767 B); a keyed-map delete produced 1 patch (39 B) [L `arrayPitfall`].
- **Yjs time-based merging groups the wrong things.** With defaults, two clicks 50 ms apart became 1 step and a drag with a 650 ms pause became 2. `stopCapturing()` at gesture boundaries plus `captureTimeout: Infinity` gives 2 and 1 [L].
- **Multi-user cases M1–M3 are one scripted scenario each (n = 1).**
  - What follows from each strategy's construction:
    - property granularity keeps a collaborator's other change (M1): command, immer, property deltas and Yjs do; whole-record diffs, snapshots and this event log do not;
    - serialisable history: all but Yjs.
  - What follows from how the lab implemented each strategy:
    - command and immer *threw* on a target a collaborator had deleted, and record diffs resurrected it (M3). Each has no existence guard;
    - property deltas have the guard written in (`strategies.mjs` ~292).
  - With a one-line skip-if-missing guard, command, immer and record diffs all become a no-op in M3 [L `M3_withSkipMissingGuard`]. Snapshots and this event log cannot take such a guard: they restore the whole state or replay from a checkpoint that lacks the remote change.
- **No-op edits.** In the lab only property deltas skipped a no-op edit without an explicit check. That is an artefact of my record-diff implementation: tldraw's real store skips structurally identical records (C). Every strategy needs a no-op check, built in or explicit.

### E. What the prototype taught (cake configurator: a supporting made-to-order flow)

- **Taste must never repair a need.** This was found in review and is now measured.
  - The first rule set turned "heart" at 30 people into a cake for 20, cheaper and too small.
  - Over the same 400 configurations it changed a need in 237 of 12,531 single changes:
    - 202 were triggered by a taste choice (for example heart at 50 people → 20 people);
    - 35 by a people change that turned piped writing into a plaque [L `model.firstRuleSetAsReviewed`, fixture `lab/fixtures/model-v1-as-reviewed.js`].
  - Now the needs are `people`, `message` and `text`, and a taste option that would change one is inactive with its reason:
    - heart above 20 people → "Heart cakes serve up to 20 people";
    - a tier count whose top is too small to pipe on → "3 tiers leave a 5-inch top tier, too small to pipe your message on".
  - A people change repairs the tiers, not the message.
  - Result: **0 of 13,669 transitions change a need**; 0 invalid; 0 overrides of the option just chosen [L `model.needs`].
- **Repairs:**
  - 1,290 transitions (9%) need one;
  - all 1,290 are announced on the option beforehand, because the hint runs the same rules on the hypothetical choice;
  - 878 choices are inactive with a reason: 660 fourth decorations, 160 hearts above 20 people, 42 tier counts that break piping, 16 piping on a small top [L].
- **Randomise:** 2,000 of 2,000 runs valid, all keeping the headcount and the whole message; 2,000 distinct [L].
- **Free text leaks through three channels.** The first build closed only one of them.
  - Analytics event parameters: closed from the start (only the length is sent).
  - The URL: the query string carried `tx=Happy 30th Maya` for all 299 configurations with words [L fixture check]. A GA4 page_view (page_location), server logs and every shared link would receive it.
  - Undo/redo analytics: they sent the step label, which quotes the typed text. I found this while fixing the URL.

  Now the words live only in the local draft and the request. A reload or the person's own link gets them back; someone else's link opens the design without them. Words were found in 0 of 33 recorded page URLs, including after undo and redo, 0 analytics events and 0 copied links [L `behaviour.text`, `behaviour.persistence`].
- **A live region must hold only the message.**
  - The first notice put Undo and Dismiss inside `role="status"`, so a screen reader would read "…one tier. Undo Dismiss". axe does not flag it.
  - Now the text is an always-present live node and the buttons sit beside it: 0 controls inside live regions while a notice shows [L `behaviour.repair.buttonsInsideLiveRegions`].
  - Moving the listener to the buttons also removed an `a11y.mjs` 2.1.1 FAIL. The FAIL had appeared once the empty notice container stayed in the layout: a delegated click listener on an empty, 0-height container reads as a pointer-only control.
- **Repaint per pointer move** (median of 5 fresh-page runs; ranges of the run medians) [L `behaviour.renderCost`]:
  - redrawing the whole view on every move of a drag on the heaviest cake: 10.4 ms median (8.9–11.4) / 14.6 ms p95 at 4× CPU slowdown; 2.3 / 4.4 ms at 1×;
  - repainting only the moving part: 0.8 (0.3–2.0) / 3.2 ms at 4×; 0.3 / 0.5 ms at 1×.

  Earlier single runs and the reviewer's runs had the same ordering and different absolute numbers.
- **Re-rendering a form while someone types breaks it.** It lost the caret and the date segments; updating the messages in place fixed it [L `behaviour.keyboard`].
- **Test tooling:**
  - Playwright's `click` on an option whose control is `aria-disabled` waits for "enabled" (it retargets the label to its input) [L]. Use `force` in Playwright, or a `tap` step in `states.mjs`.
  - `states.mjs` does not hang on such an element. Its click falls back to `el.click()` after 4 s and logs "blocked for a pointer (covered?)", which is misleading here [V, `states.mjs` ~357–363].
  - `audit.mjs`'s "chart(s) with no text" signal counted 3 SVGs at 1440 and at 390 on the prototype: the labelled preview `svg#cake` (role="img", aria-labelledby → a 1-sentence description) plus two `aria-hidden` preset thumbnails [L `scripts.auditChartSignalProbe`; the predicate copied from `lib/inventory.mjs` ~64 and ~827 reproduces audit's own count]. The detector accepts `aria-label`, `<title>` and `<text>`, but neither `aria-labelledby` nor `aria-hidden` on the SVG itself. With both accepted: 0.

## Experiments

**Folder:** `/home/user/website-redesign-skill/research/stage2/experiments/S5-configurators-editors/`. It holds about 0.8 MB tracked; no third-party assets. Fonts come from `fetch-fonts.mjs` into the git-ignored `prototype/fonts/`, raw captures go to the git-ignored `captures/`, and the JPEGs in `shots/` total about 500 KB.

**Re-run:** `npm install && node run.mjs`. Options:
- `--only history`: about 60 min: the 5-run benchmark, correctness, the array pitfall and the freeze pairs;
- `--only correctness`: about 10 s;
- `--only freeze`: about 20 min;
- `--only prototype`: about 7 min;
- `--only workloads`.

Everything is written to `results.json`. The prototype stage needs the skill's `scripts/` installed and python3 with Pillow.

**Re-run this session** (load 7–19 on 4 shared cores): correctness, the freeze pairs and the whole prototype stage. The 30 benchmark cells were not re-run; the reviewer's independent re-run matched memory within ~1% and every ordering and `correct` flag. Benchmarked code paths are unchanged: the new `skipMissing` option defaults to off and adds one boolean test per undo.

### 1. History lab

**Files:** `lab/model.mjs`, `lab/strategies.mjs`, `lab/bench-one.mjs`, `lab/correctness.mjs`.

**Model:** a keyed map of items.

**Selection model:** (a) in G2. Selection is not an undo step, never clears redo, and is restored with the undone edit. excalidraw and tldraw use model (b); see C.

**Workload:** seeded 11; add 20%, drag 35% (20 pointer updates each), recolour 17%, delete 8%, group 8%, select-only 4%, undo 6%, redo 2%.

**Method:** every cell runs 5 times in a fresh `node --expose-gc` process; figures are medians. History cost = heap after GC with history minus heap without.

**Strategies:**
- naive full copies (the reference);
- command pattern;
- immutable snapshots, as object-spread copies and as an Immutable.js persistent map;
- immer patches, with and without autofreeze;
- record diffs (tldraw-style);
- property deltas (excalidraw-style);
- Yjs UndoManager;
- event log with checkpoints.

**Benchmark (median of 5).** Upd = pointer-update p95; Commit = commit p95; Undo = undo mean; History JSON = serialised size (Yjs history can't be serialised).

**Start 200 → end 340 items, 1,000 operations (7,520 pointer updates, 843 steps)**

| Strategy | History | Bytes per step | Upd (µs) | Commit (µs) | Undo (µs) | History JSON |
| --- | --- | --- | --- | --- | --- | --- |
| naive | 75.7 MB | 94,166 | 0.7 | 925 | 847 | 38.8 MB |
| command | 0.38 MB | 475 | 0.9 | 4.4 | 0.7 | 135 KB |
| snapshot (spread) | 4.9 MB | 6,088 | 48.8 | 228 | 0.2 | 38.8 MB |
| snapshot (persistent map) | 1.2 MB | 1,451 | 5.4 | 10.3 | 0.2 | 38.8 MB |
| immer patches | 0.95 MB | 1,176 | 167 | 354 | 219 | 318 KB |
| immer, no freeze | 0.96 MB | 1,198 | 69 | 287 | 239 | 318 KB |
| record diff | 0.72 MB | 901 | 2.8 | 8.9 | 0.9 | 481 KB |
| property delta | 0.70 MB | 875 | 2.4 | 13.8 | 0.8 | 178 KB |
| Yjs | 4.2 MB | 5,277 | 28.1 | 57.7 | 80 | n/a |
| event log | 1.2 MB | 1,431 | 0.6 | 4.7 | 466 | 120 KB |

**Start 200 → end 463 items, 10,000 operations (72,020 pointer updates, 8,424 steps)**

| Strategy | History | Bytes per step | Upd (µs) | Undo (µs) |
| --- | --- | --- | --- | --- |
| naive | 1,158 MB | 144,096 | 0.5 | 1,563 |
| command | 4.8 MB | 602 | 0.6 | 2.5 |
| snapshot (spread) | 82.4 MB | 10,255 | 149 | 0.5 |
| snapshot (persistent map) | 16.5 MB | 2,052 | 3.4 | 0.2 |
| immer patches | 12.1 MB | 1,506 | 581 | 532 |
| immer, no freeze | 12.1 MB | 1,504 | 223 | 598 |
| record diff | 8.9 MB | 1,108 | 2.6 | 1.5 |
| property delta | 8.8 MB | 1,092 | 2.5 | 2.1 |
| Yjs | 100.8 MB (document 9.5 MB vs 1.5 MB without UndoManager) | 12,551 | 22.7 | 118 |
| event log | 17.8 MB | 2,210 | 0.3 | 1,280 (p95 3,870) |

**Start 5,000 → end 5,167 items, 1,000 operations (843 steps).** Immer timings here are noisy; use the paired table below.

| Strategy | History | Bytes per step | Upd (µs) | Commit (µs) | Undo (µs) |
| --- | --- | --- | --- | --- | --- |
| naive | 1,530 MB | 1,902,621 | 1.1 | 106,106 | 49,627 |
| command | 0.36 MB | 453 | 2.2 | 6.7 | 1.2 |
| snapshot (spread) | 158 MB | 197,070 | 7,076 | 5,718 | 0.2 |
| snapshot (persistent map) | 1.4 MB | 1,736 | 5.7 | 21.7 | 0.2 |
| immer patches | 0.84 MB | 1,048 | 15,877 (playMs 35–84 s) | 12,977 | 7,276 |
| immer, no freeze | 0.83 MB | 1,031 | 6,584 | 5,985 | 2,644 |
| record diff | 0.76 MB | 941 | 3.0 | 14 | 0.8 |
| property delta | 0.71 MB | 878 | 2.8 | 20.6 | 1.2 |
| Yjs | 2.6 MB | 3,218 | 21.7 | 53.4 | 129 |
| event log | 14.8 MB | 18,376 | 0.6 | 12 | 18,705 |

**Immer autofreeze, paired and interleaved** [L `history.immerFreeze`]. Each pair runs freeze-on and freeze-off back to back, alternating the order.

| Scene | Pairs | Upd p95, freeze on / off | Ratio (range) | Undo mean, on / off | Ratio (range) | Load |
| --- | --- | --- | --- | --- | --- | --- |
| 200 → 340 items | 9 | 171 / 60 µs | 3.1× (1.4–7.1) | 402 / 270 µs | 1.6× (0.9–3.7) | 13.5–14.6 |
| 5,000 → 5,167 items | 7 | 5.2 / 4.9 ms | 1.2× (0.54–3.2) | 3.3 / 2.1 ms | 1.7× (0.9–2.0) | 11.2–18.9 |

**Correctness** (`results.json history.correctness`). All nine strategies passed:
- one drag is one step;
- undo restores selection;
- a new edit clears redo; selecting keeps redo;
- Escape mid-drag restores the state and records nothing;
- the final state and selection match the oracle;
- undo-all and redo-all (843 steps).

M1–M3 are the multi-user cases:
- **M1:** I move an item, a collaborator recolours it, I undo. Does their colour survive?
- **M2:** we both change the same property. Whose value wins when I undo?
- **M3:** I move an item, a collaborator deletes it, I undo.

| Strategy | Edit that changes nothing adds no step | Persists | M1 keeps their colour | M2 same property | M3 as benchmarked | M3 with a skip-missing guard |
| --- | --- | --- | --- | --- | --- | --- |
| naive / spread / persistent map | ✗ (2 empty steps) | ✓ 38.8 MB | ✗ | mine overwrites | resurrects | not possible (whole-state restore) |
| command | ✗ (1) | ✓ 135 KB | ✓ | mine overwrites | throws TypeError (no guard) | no-op |
| immer patches | ✗ | ✓ 318 KB | ✓ | mine overwrites | throws (no guard) | no-op |
| record diff | ✗ (lab artefact; tldraw skips it) | ✓ 481 KB | ✗ | mine overwrites | resurrects (no guard) | no-op |
| property delta | ✓ | ✓ 178 KB | ✓ | mine overwrites | no-op (guard built in) | same |
| Yjs | ✗ | ✗ | ✓ | **theirs kept** | no-op | n/a |
| event log | ✗ | ✓ 154 KB | ✗ (remote events not in the log) | mine overwrites | resurrects | not possible (replay) |

### 2. Cake configurator prototype

**Files:** `prototype/` (`model.js` rules, prices and URL encoding; `history.js`; `render.js` procedural SVG; `app.js`; about 102 KB of source, no dependencies), plus `prototype-run.mjs`, `prototype-states.json` and `lab/fixtures/model-v1-as-reviewed.js`, the first rule set kept for the comparison. The brand is fictional (Crumb & Co.), the prices are labelled as samples, and all artwork is my own procedural SVG.

**What it is.** It is a *supporting* made-to-order ordering flow: chapters around a 2D sketch. That shape was rejected for The Cake Junction's *signature* builder (`lessons.md` 2026-09-26), and it is used here only to test the mechanics.

**What it applies:**
- **Start and randomise:** four presets drawn by the same renderer, and "Surprise me" (taste only).
- **Options:** chapters in dependency order, as free tabs.
- **Constraints:** four constraint levels, with needs protected.
- **Preview:** a scale cue and dimensions in words; the camera frames geometry only; tapping a part opens its chapter; the flowers can be dragged, with a slider alternative; a cut-slice view.
- **Price and time:** a live estimate and lead-time date minimum.
- **Saving:** the URL (no free text), a local draft with the words, a resume notice and "Copy link".
- **Undo:** snapshot undo that follows the gesture, merge and no-op rules; labels are announced.
- **Finish:** a review with "Change" links, an error summary and a confirmation.
- **Analytics:** a `dataLayer` with no free text.

**Shots** (all in `shots/`):
- `prototype-1440/768/390.jpg`, from `capture.mjs` (0 warnings);
- `states-phone-sheet.jpg` (8 phone states, including `inactive-need`);
- `repair-desktop.jpg`, `review-desktop.jpg`;
- `renderer-gallery.jpg`.

**Skill scripts** [L `prototype.scripts`, final run]:

| Script | Result |
| --- | --- |
| `capture.mjs` at 1440, 768 and 390 | 0 warnings |
| `audit.mjs --kind app` at 1440 and 390 | 0 fails; axe: 0 violations; 6 and 5 type sizes. Signals: 5 gradient backgrounds (check by eye); "3 charts" at each width (preview + 2 aria-hidden thumbnails; 0 with the proposed fix) |
| `a11y.mjs` at 1280 | 0 FAIL, 2 WARN: ellipsis truncation of the tab value line under text-spacing overrides; the full value is in the panel |
| `a11y.mjs` at 390 | 0 FAIL, 0 WARN |
| `states.mjs --axe`, 11 states (phone steps use `tap`) | 11/11 captured; 0 critical or serious; every tap reports its target, no fallback notes |

**Behaviour tests** [L `prototype.behaviour`], all passing:

| Check | Result |
| --- | --- |
| Heart at 20 people, 2 tiers | Hint beforehand: "Changes to one tier". Then 1 step; 20 people, 1 tier, heart. Live text "Heart cakes are one tier, so we made it one tier."; 0 controls inside live regions; one undo restores; "Undone: Shape: Heart" announced |
| Heart at 30 people (a taste option against a need) | Inactive, with "Heart cakes serve up to 20 people" beside it; the tap changes nothing (0 steps, still 30 people); logged as unmet demand |
| Fourth decoration | Inactive, "Up to three decorations"; nothing changes |
| No-op; redo | No step for a no-op; redo 1 after undo, 0 after a new change |
| Sliders | A pointer drag = 1 step; 10 arrow presses = 1 step; a new step after a 1.2 s pause; Escape = 0 steps, value restored |
| Canvas | Drag = 1 step (mouse and touch); Escape = 0; a 2 px wobble is a tap that opens Decorate and focuses the slider; the canvas never moved; decorations never moved the camera; size did |
| Typing a 15-character message | 1 step; not in analytics, not in 33 recorded page URLs (undo/redo included) |
| Links | 119-character query without the words; a new context opens the same design without the words; reload keeps the cake and the words; the bare URL resumes; the clipboard holds the link, without the words |
| Keyboard only | 77 presses (43 navigation); the empty submit focuses the error summary and the title becomes "Error: …"; the second submit reaches "Request sent", with focus on it |
| Phone 390×844 | preview 36% of the height; bottom bar visible; no overflow |
| Render cost | As in E (median of 5 runs) |
| Model | 13,669 transitions; 0 invalid; 0 overrides; 0 needs changed (first rule set: 237); 400/400 link round trips, exact apart from the words; 0 of 299 texts in the query; 4/4 hostile links open a valid cake; renderer 0.76 ms median in Node, SVG 22 KB median |

## Decision guidance for the skill

### G1. New reference `references/configurators.md`

**New.** Pointers:
- `discovery.md` §5: extends the "Configurators:" bullet with one pointer.
- `categories.md` Ecommerce "Configurators and made-to-order goods": extends, pointer to the whole file.
- `categories.md` "Signature experiences": extends, but points **only** to §1, §3, §7, §8 and §11 (model, constraints, save/share, undo, analytics).
- `realtime-3d.md` opening: extends, pointer to the preview-technology tree in §4.

**First line of the file:** "If this is the signature experience (`framing.md` §1), `discovery.md` §5b/§5c and `ui-ux.md` §7b come first: direct manipulation and fidelity lead, and chapters are the accessible, form-based path beside the canvas, not the experience. A builder shaped as five form chapters around a 2D sketch was rejected as The Cake Junction's signature experience (`lessons.md` 2026-09-26). §2, §4 and §5 below are for supporting and made-to-order ordering flows."

**1. Model before screens.**
- One pure module holds options, rules, prices, lead times, URL encoding, randomise and the description.
- The UI, the server's validation and the tests all import it.
- Classify every option as a **need** (a fact the customer gave: headcount, date, dietary requirement, the words of a message) or **taste**.
- Test it exhaustively. Every single change from a few hundred configurations must end valid, must never override the option just chosen, and must never change a need unless that need is the option being changed [L: 13,669 transitions, 0/0/0].

**2. Option architecture** (supporting flows):
- up to about 8 independent decisions: one panel;
- dependent chains: chapters in dependency order that can be jumped between, with the review always reachable;
- a wizard only when a step truly cannot be shown earlier;
- placing and arranging: an editor (G2).

Open with 3–6 starting solutions and a best-seller default. "Surprise me" changes taste only, never lands on a choice that undoes a need, and is undoable.

**3. Constraints: prevent, explain, warn, repair.** In this order:
1. Downstream options impossible for a need are not offered. Say what unlocks them.
2. An option people still look for is **inactive with its reason beside it**. It stays focusable (`aria-disabled`) and logs the tap as unmet demand. **A taste option that would change a need is always inactive with its reason, or asks first** ("Heart cakes serve up to 20 people") [L: the first rule set changed a need in 237 transitions].
3. An option that will change another says so before it is chosen. Compute the hint from the rules on the hypothetical choice, never from a hand-written list.
4. When it is chosen, repair other *taste* options automatically. An inline notice in the customer's words and an Undo; choice plus repairs = one history step.

   Prefer this inline, automatic repair when the change is cheap and reversible. **Confirm first** when a repair would remove a priced option or package, the way car configurators handle packages [K].

Never repair silently, and always say the full effect: undisclosed automatic repairs and invisible propagation are what the surveys criticise [S Lacuna].

**4. Preview** (supporting flows):
- Always on screen, and labelled honestly.
- A scale cue plus dimensions in words.
- The camera frames geometry only; tapping a part opens its chapter.
- Hidden choices get their own small view.
- During a gesture repaint only the moving part [L: 0.8 against 10.4 ms at 4×].
- Technology follows the requirement:
  - colour or material swaps on 1–3 fixed views: layered 2D or a server compositor;
  - parametric geometry or an illustrated look: SVG or canvas;
  - all-round viewing or fitting into a room: `realtime-3d.md`.

**5. Layout** (supporting flows):
- Desktop and landscape: a preview column plus a 400–440 px panel (tabs, one scroller, a bottom bar with the estimate and one primary action).
- Portrait: fixed rows, with the preview at 36–40 dvh [L: 0.36].
- No modal bottom sheet over the preview.
- Undo and redo leave the top corners on phones.

**6. Price and time.**
- A live estimate plus a per-unit figure; the breakdown in the review.
- "We confirm the final price" whenever a human quotes.
- Lead time becomes the date field's minimum.

**7. Save, share, resume.**
- The configuration lives in the URL (short keys, `replaceState`, defensive decode) **except free text**: page views (page_location), server logs and shared links all receive the query string.
- Keep the words in the local draft and the request. If they must travel with a link, save the design server-side behind an unguessable id.
- A local draft debounced about 300 ms with "Welcome back · Start again"; share feedback in place; a version field on saved documents.

**8. Undo in a configurator.**
- Whole-configuration snapshots with:
  - one gesture = one step;
  - same-control nudges merged within 1 s;
  - one step per visit to a text field;
  - no step for a no-op;
  - repairs inside the same step;
  - labels announced;
  - Ctrl/⌘+Z except inside text fields;
  - undo never switches chapters.
- Persist the configuration, not the stack.

**9. Finish and hand-off.**
- A review with "Change" per row; validation on submit; an error summary at 3+ errors.
- Re-validate **in place**; never re-render a form while someone types.
- A confirmation with a reference and dated next steps.

**10. Accessibility.**
- Native inputs; the preview is `role="img"` with a generated one-sentence description.
- Every gesture has a control.
- Notices: the message goes in an always-present polite live region, and Undo and Dismiss sit **outside** it (`accessibility.md` §7.4, `app-ui.md`). axe does not catch this; test it.
- Bind handlers on the buttons, not on the container.
- Measure keyboard-only completion.

**11. Analytics.**
- Events: `configurator_viewed{entry}`, `preset_applied`, `first_change{ms}`, `option_changed{key,value,source}`, `constraint_resolved{rule}`, `inactive_option_tapped{key,value,reason}`, `randomised`, `undo{key}` / `redo{key}`, `link_copied`, `review_opened`, `validation_failed{fields}`, `request_submitted`.
- **Never send free text:** not in parameters, not in step labels (they quote what was typed), not in page URLs.

**12. Checklist.**
- [ ] Model plus exhaustive test: 0 invalid, 0 overrides, 0 needs changed.
- [ ] Starting solutions; Surprise me changes taste only and is undoable.
- [ ] All four constraint levels; hints computed from the rules; one step per choice plus repairs; a confirm for priced removals.
- [ ] Preview scale cue and honest label; camera frames geometry only; gesture repaint.
- [ ] Portrait shell with fixed rows; two columns in landscape.
- [ ] URL/draft round trip without free text; reload and bare-URL resume; hostile links.
- [ ] Undo contract checks.
- [ ] 0 controls inside live regions while a notice shows.
- [ ] Keyboard-only completion; axe clean in every state.
- [ ] No free text in events, labels or any page URL (record every URL).
- [ ] `states.mjs` covers each chapter, a repair, an inactive need, the review errors and "sent", with `tap` on the phone.

### G2. Editor chrome rules

**Extends `ui-ux.md` §7b** with a new subsection "Editor chrome".

- **Layout.**
  - Canvas first.
  - Tools in a bottom-centre toolbar or a left rail.
  - A fixed right-hand inspector on desktop; Figma reverted floating panels [S].
  - A contextual toolbar with 3–6 actions.
  - Below about 640 px the inspector becomes a popover or sheet.
  - Undo/redo at the top left on desktop and in the bottom toolbar on phones [V tldraw].
- **Thresholds** (replace §7b's single "about 6 px"):
  - drag after 4 px (mouse) / 6 px (touch);
  - about 25 px for a drag from a toolbar or tray on touch;
  - snap 8 screen px;
  - double-click 300–450 ms; long-press 500 ms;
  - nudge 1 px, 5–10 px with Shift;
  - hit margin 3–4 px; handles 12 / 20 px [V].
- **Selection: choose one model and use it everywhere.** In both, a selection change never clears redo, and undoing an edit restores the selection that went with it.
  - **(a) Selection is not an undo step.** Every Ctrl+Z changes the design. This is the lab's model and, I believe, Figma's [K]. Suits consumer editors driven by touch (card makers, room planners, avatar builders), where people tap around a lot [K].
  - **(b) A selection-only change is its own undo step that keeps redo** (excalidraw, tldraw [V]). Suits diagramming and whiteboards, where a large multi-selection is costly to rebuild [K]. Cost: more presses to reach a content change; excalidraw's own test has 6 steps for 3 creates, 2 selections and 1 delete.
  - Either way: a skip link that selects the first object, and a live region announcing the selection [V tldraw].
- **Layers.** Show a layer list only when objects overlap or nest, or there are more than about 10 [K]; `]` / `[` for z-order.
- **Shortcuts.** Single letters, ⌘G, ⌘D, ⇧1/⇧2, and ⌘/ for a shortcuts dialog. Tooltips show the shortcut; nothing fires while typing.
- **Saving and history UI.** A local autosave debounced about 300 ms with a quiet saved state; undo and redo always visible; named versions only for documents people come back to.
- **First run.** A real template; coach marks only for gestures that can't be discovered.
- **Technology.** tldraw needs a licence key in production; excalidraw is MIT [V].

### G3. History architecture by product size

**New section in `configurators.md`.** `ui-ux.md` §7b's "one history entry per gesture" is extended with the contract below and a pointer here.

| Product | Choose | Evidence |
| --- | --- | --- |
| Configurator or form-like builder (one user) | whole-document snapshots with the §8 rules, capped at 100–200 steps | a few hundred bytes per step; prototype |
| Single-user editor with a few hundred objects | any diff strategy, a persistent map, or spread snapshots | spread 49–149 µs per move, 6–10 KB per step [L] |
| Single-user editor with thousands of objects | property deltas or record diffs; the command pattern when operations are few. **Not** spread snapshots, and not an immer `produce` per pointer move | spread 7.1 ms p95 per move; immer about 3–16 ms p95 per move with or without freeze; diffs and a persistent map 3–6 µs [L] |
| App already on immer | patches per *committed action*; preview the drag outside immer; keyed maps, not arrays. Autofreeze off helps only in small scenes and on undo | 3.1× per move at 200 items (171 against 60 µs, both far inside a frame); 1.2× at 5,000 (range 0.54–3.2×); undo 1.7×; 1,000 patches for one array delete [L] |
| Real-time multi-user | property deltas with a skip-missing guard, or Yjs UndoManager with `trackedOrigins`, `stopCapturing()` at boundaries, `captureTimeout: Infinity`, selection in `meta`, `clear()` at session end | property granularity (M1); Yjs: history not serialisable, 12.5 KB per step, document 6.2× [L] |
| Audit trail or time travel | event log with checkpoints, remote events included | 1.4 KB per step; undo 18.7–31 ms mean at 5,000 items [L] |

**The contract, for every choice:**
- Record only committed local user actions: not remote changes, not the initial load; selection per the G2 model.
- One gesture = one step.
- Cancel restores, records nothing and keeps redo.
- A no-op adds no step (built in or explicit).
- Undo restores selection; a new edit clears redo; selecting never does.
- Every step carries a label; labels stay out of analytics.
- **Multi-user.** Undo reverts only the properties I changed. Whole-record diffs, snapshots and replay cannot, by construction. Undo also skips records a collaborator deleted: every strategy needs this one-line guard. The lab showed it for command, immer and record diffs, one scripted case each.

### G4. Scripts and QA

**Extends `technical-qa.md` and `visual-qa.md`.**
- Use `prototype-states.json` as the `states.mjs --axe` template for configurators. Phone steps use `tap`, as `visual-qa.md` "Flows" requires; include an `inactive-need` state.
- Run `a11y.mjs` at 1280 and 390, and `audit.mjs --kind app`.
- **Inactive options.** A `click` step on an `aria-disabled` option waits 4 s, then falls back to `el.click()` with a misleading "blocked for a pointer" note [V `states.mjs` ~357–363]. Use `tap`.
- `prototype-run.mjs → behaviour()` checks what screenshots can't:
  - steps per gesture; Escape cancels;
  - tap slop; the canvas doesn't move on tap;
  - URL, reload and resume;
  - keyboard-only completion;
  - no free text in any event or page URL;
  - 0 controls inside live regions;
  - needs protected.

  Proposed as a future `scripts/configurator.mjs`, named only; no script was created under `skills/`.
- **Fix for `audit.mjs`** (`lib/inventory.mjs` charts filter ~827): treat `aria-labelledby` that resolves to text, or an accessible name on `role="img"`, as labelled, and skip SVGs that are themselves `aria-hidden`. On the prototype this takes the count from 3 to 0 at both widths [L].
- **Note for `a11y.mjs`.** Its delegation exemption (`hasControls`) is evaluated at scan time. An empty container that later receives buttons is reported as a pointer-only control. That was right to push the prototype toward handlers on the buttons, but the message could say "empty delegation container".

### G5. New tells for `anti-patterns.md` "Product flows and configurators"

**Extends.**
- A repair that changes what the customer told you (headcount, date, the words).
- Silent repairs, or repairs that don't say their full effect; disabled options with no reason.
- Randomise that overrides needs or has no undo.
- A camera that reframes on every option; a preview with no sense of scale.
- A full re-render on every pointer move.
- Undo grouped by time.
- Undo and Dismiss inside the live region.
- A bottom sheet over the preview on phones.
- A form that re-renders while someone types.
- Free text in analytics, step labels or the URL.

## Rejected ideas and why

- **Grouping undo by time:** it merged two clicks 50 ms apart and split a paused drag [L].
- **Per-move snapshots or per-move immer `produce` at scale:** milliseconds per move at 5,000 items, against microseconds for diffs [L].
- **The command pattern as the default for large editors.** By construction it is the smallest, per-property and serialisable [L]. The cost is authoring: every operation needs a hand-written inverse and a no-op check, while diffs derive both from the state change. Its M3 throw was a missing guard in my lab, not a property of the pattern.
- **CRDTs by default:** only for real-time multi-user work. History costs memory, the document stops shrinking, and the stack can't be serialised [L/V].
- **An event log as undo for large documents:** undo at 5,000 items is 18.7–31 ms mean [L].
- **Persisting the undo stack in a configurator:** no user value.
- **Repairing a need to make a taste option fit:** 237 transitions in the first rule set did this [L].
- **A modal dialog for every conflict** [K]: it interrupts cheap, reversible repairs. Keep a confirm step for removing priced options.
- **Free text in the share URL:** it reaches analytics, logs and whoever receives the link [L].
- **A bottom sheet or wizard-only flow on phones; auto-framing on every change; a fully loaded default** [S Park et al.; K].

## Open questions and limits of this evidence

- **Product teardowns are snippets only** [S]: Nike By You, IKEA, Porsche, Tesla, Canva and the games. WebFetch was blocked. The repair-study figures come from a secondary summary.
- **Selection models (a) and (b), and the guidance on layers, are judgement** [K]. No user data compares them.
- **Needs versus taste is a per-product decision.** The prototype's `people` / `message` / `text` is one reasonable split; a bakery might treat the tier count as a need.
- **No user testing.** The prices are fictional, and the prototype shows the patterns can be built and measured, not that they convert.
- **Noisy CPU.** Load was 7–19 on 4 shared cores. Memory is stable; timings are good for ranking only. The immer and render-cost figures now come from paired or median-of-5 runs with ranges, but a quiet machine would narrow them.
- **The benchmark tables were not re-run** this session. The reviewer's re-run matched them.
- **The Yjs growth** is client-side, with an UndoManager.
- **Not tested:** real devices, iOS, screen readers (only the accessibility tree and axe), GPU rendering, saved-variant comparison, accounts and layered photographic previews.

## Changes after review

1. **G1 contradicted the Cake Junction lesson (blocking).** Agreed.
   - G1 now opens with the scoping line, cites `lessons.md` 2026-09-26 and scopes §2, §4 and §5 to supporting and made-to-order flows.
   - "Signature experiences" links only to §1, §3, §7, §8 and §11.
   - "What the skill already knew" and the Experiments section say the prototype's shape is the rejected one and why it is still valid evidence for the mechanics.
2. **Selection attribution was wrong.** Agreed and verified:
   - `history.ts` ~117–131;
   - `history.test.tsx` ~889–899 (6 steps including 2 selections);
   - tldraw's `markHistoryStoppingPoint` before `setSelectedShapes` and `_undo`.

   Corrected the `strategies.mjs` header, section C and the lab description. G2 now presents models (a) [K] and (b) [V] with a recommendation per product type [K].
3. **"Never use a modal conflict dialog" was [K] presented as [S].** Agreed; a new search found only criticism of invisible propagation, undisclosed effects and ad-hoc repair [S Lacuna].
   - Tagged [K] and softened: inline automatic repair with Undo for cheap, reversible changes; confirm first for priced removals.
   - Removed from the survey attribution in Rejected ideas.
4. **A repair lowered a stated need.** Agreed.
   - Added `NEEDS`; `unavailableReason` blocks taste options that would change a need; `resolve` repairs tiers rather than the message on a people change.
   - New exhaustive test: 0 of 13,669 transitions change a need, against 237 of 12,531 in the first rule set (fixture kept).
   - New browser test: heart at 30 people is inactive, with 0 steps and still 30 people.
   - The showcase repair is now heart at 20 people, 2 tiers → one tier; `prototype-states.json` has an `inactive-need` state.
5. **M1–M3 findings were lab artefacts.** Agreed.
   - Added an opt-in `skipMissing` guard (default off, so benchmarked behaviour is unchanged). With it, command, immer and record diffs become a no-op in M3.
   - Marked each case n = 1, ranked strategies by construction, and dropped "throws" as grounds against the command pattern.
   - Also corrected the no-op claim: tldraw's store skips identical records [V].
6. **Free text in the URL.** Agreed.
   - `encode()` no longer writes the words. The draft keeps them and restores them for a matching link.
   - The test records every page URL at every history change and analytics event: 0 of 33 contain the words; copied links carry no words.
   - Also found and fixed: `undo`/`redo` events sent the step label, which quotes the text. They now send the key.
7. **Undo and Dismiss inside the live region.** Agreed.
   - Split into an always-present `#notice-text` (`role="status"`) and `#notice-actions` beside it. The region was also inside a `display:none` container before; it now stays in the accessibility tree.
   - New test: 0 controls inside live regions.
   - The change briefly produced an `a11y.mjs` 2.1.1 FAIL on the delegated listener; handlers now bind to the buttons, and the result is back to 0 FAIL.
8. **The immer autofreeze penalty did not reproduce.** Agreed. New paired, interleaved experiment (`--only freeze`): 3.1× per move at 200 items but 1.2× (0.54–3.2×) at 5,000; undo 1.7×. Rewrote D, G3 and Rejected ideas: about 3–16 ms per move at 5,000 items either way.
9. **The audit chart diagnosis was wrong.** Agreed. Added `chartProbe()`, whose copy reproduces audit's count: `svg#cake` (role="img" with aria-labelledby) plus 2 aria-hidden thumbnails at both widths. The proposed fix now accepts `aria-labelledby` and a named `role="img"` and skips aria-hidden SVGs: 3 → 0.
10. **The states template and the states.mjs inference.** Agreed. Phone steps now use `tap`, and 11/11 states capture with tap trails. The inference now reads: `states.mjs` falls back to `el.click()` after 4 s with a misleading note.

Also changed:
- Render cost is now the median of 5 fresh-page runs with ranges.
- The runner gained `--only correctness` and `--only freeze`, and its time estimates were updated.
- The stale timing comment in `app.js` was removed.
