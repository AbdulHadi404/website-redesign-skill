# Stage 2 integration plan

Written after the twelve stream reports (`streams/`) and before any of them reached the skill. It decides what enters the skill, where, and what does not. The streams proposed about 140 changes; this plan adopts most of them, merges the ones that overlap, and rejects some.

## Three layers, kept apart

- **Core (`SKILL.md`)** gets only what changes a decision every run: when to *propose* an interactive experience, ambition set per moment with fidelity as a separate axis, the motion spec as a gate, capability discovery before building hard UI, the polish pass, and a plan for after launch. Everything else is a pointer. `SKILL.md` must end **shorter** than it is now (6,281 words): the options manual that grew inside its Scripts table (1,750 words) moves to `scripts/README.md`, and the table keeps one line per script.
- **Specialist references** hold the method, the numbers and the checklists. Four new files, each read only when its situation arises:
  - `references/interactive.md` — S6, S1's choice of renderer, S3's sprite scenes, sound and haptics (S6 + S8).
  - `references/configurators.md` — S5: configurators, consumer editors, undo/redo by product size.
  - `references/generative-visuals.md` — S10: the purpose gate, the medium, budgets, the production checklist.
  - `references/resources/hard-ui.md` — S4: capability discovery and the library lookup.
- **Research archive** (`research/stage2/`) keeps the evidence, the experiments and the rejected ideas. Nothing there is needed to act.

## Where overlapping proposals go (one home each)

| Topic | Proposed by | Home | Others get |
| --- | --- | --- | --- |
| Choosing what renders a scene (DOM → SVG → Canvas → Worker → Pixi/Phaser → three/R3F → engine) | S1 (into `realtime-3d.md` §1a), S5 (preview tree), S3 (runtime choice) | `interactive.md` §"Choose what renders it" | `realtime-3d.md` §1 and `configurators.md` preview section point to it |
| Accessible canvas / WebGL | S6 (§9b contract), S1 (G2 sync and SVG focus), S4 (Layers listbox) | `accessibility.md` new section "Canvas, WebGL and game-like interaction" | `motion.md` §9 accessibility line points to it; `interactive.md` names it as an invariant |
| Sound and haptics | S6 §7, S8 (app-ui haptics rules) | `interactive.md` §"Sound and haptics" | `app-ui.md` §10 one pointer line |
| Nothing runs at rest | S1 G4 (per engine), S2 A3 (per library feature), S10, S11 (`pause()`) | `motion.md` §9 "Nothing runs at rest" table | — |
| Editor chrome, thresholds | S5 G2, S4 D6 | `configurators.md` §"Editor chrome" | `ui-ux.md` §7b keeps its rules, gains the thresholds line and a pointer |
| Governor and tiers | S10 (inline governor), S11 (`tier.js`, `governor.js`) | `realtime-3d.md` §6 + `templates/code/` | `generative-visuals.md` uses the same governor (S11: `stepUp: false`) |
| Loading a heavy module | S11, S1 G7 | `performance.md` new section | `motion.md` §9 "Load late" points to it |
| Licences of assets | S3 (matrix), S10 (Table D, community code), S4 (code libraries A–D) | `resources/README.md` classes + `resources/assets.md` sections | CREDITS template in `imagery.md` |
| Reference boards, inspiration for ambitious work | S12, S6 G11 | `research.md` (board step), `resources/inspiration.md` | — |
| Finish and polish | S9 | `visual-qa.md` "Polish pass", `design-theory.md` A6 | `art-direction.md` §4 finish vocabulary, critique check 22 |

## Decisions that change or reverse something the skill says

1. **Ambition is set per moment, not per site, and fidelity is a separate axis** (S6). A 1–5 scale per moment with ceilings by route (used/productive ≤ 2; visited: one moment above 2 per journey; a signature canvas ≤ 5 with chrome ≤ 2). Fidelity (plain · illustrated · rendered) is chosen from the brand's material, never maximised: the Cake Studio lesson.
2. **The skill proposes interactive experiences when one of four conditions holds** (the result is theirs; the value is a system; the product is interactive or spatial; choosing is the product), instead of only reacting when the user names a differentiator (S6 G1). Otherwise the conventional page wins.
3. **A generative/shader background may pass** — a partial reversal of "perpetual background shader = decoration" (S10) — only when it is driven by the company's real data or a documented material, and a still and a pre-rendered loop were rejected in writing.
4. **The poster is the LCP** whenever its visible box is smaller than the viewport (S10 replaces the "a WebGL canvas never becomes the LCP; the poster does" line with the exact condition).
5. **`role="img"` alone is not the accessibility answer for an operable canvas** (S6/S1): stand-ins present from load, named from the model, an equivalent path, narration.
6. **Motion's transform-string path is not the default for smoothness under load** (S2): it survives a blocked main thread but jumps when interrupted; use it with `[from, to]` keyframes for moves the user cannot reverse.
7. **View Transitions swallow input for their duration** (S2): not for swaps people repeat quickly.
8. **Checkmarks never mirror in RTL** (S8, every source agrees) — replaces "systems disagree"; **arrow keys follow the visual arrow in RTL**; `widgets.mjs` has this backwards and is fixed.
9. **Tenant colours are untrusted input; the gate stays WCAG, APCA warns** (S12) — consistent with `accessibility.md`.
10. **Lint enforcement ships at warning level with a baseline** (S12); never another company's design-system plugin or strict-value defaults.
11. **Undo architecture is chosen by product size** (S5): snapshots for configurators; diffs or a persistent map for editors with thousands of objects; property deltas or Yjs for multi-user; never an immer `produce` per pointer move at scale.

## Scripts

**Fix (correctness):** `widgets.mjs` RTL tabs (S8); `palette.mjs` step-9 label by WCAG with APCA as tie-break, step 11 against steps 2 and 3 (S12); `lib/seen.mjs` treats `inert`/`aria-hidden` ancestors as unreadable (S4); `lib/inventory.mjs` chart-label filter (`aria-labelledby` to text, `role="img"` names, `aria-hidden` SVGs) (S5); `a11y.mjs` false FAILs on canvas stand-ins with `pointer-events: none` (S6); `audit.mjs` concentric radii: four corners, nearest painted rounded ancestor, skip discs and pills (S9).

**Extend (validated prototypes exist):** `audit.mjs` RTL and phone block from S8's lab (glyph-extent clipping for all scripts; `text-align:left` in RTL; tracking or italic on Arabic; LTR data reordered within a line; icon-mirroring checks against the generated lists; hover-only reveals and the input keyboard table at phone width; insets only with `viewport-fit=cover`); `capture.mjs --dir rtl`; `fonts.mjs` vertical metrics, minimum line-height per content class, Arabic coverage and U+20C1; `compare.mjs --diff` warns when pixelmatch reports 0 % but ΔE00 > 1 covers an area; `palette.mjs --tenant` and `--tenant-set`; `perf.mjs` prints the load average.

**Promote:** `libcheck.mjs` (S4) with its 34 regression cases as a self-test; `templates/code/tier.js` and `governor.js` (S11); `templates/code/hero-effect.js` (S10). Already in `scripts/` and to be documented and regression-tested: `motion.mjs` (S2), `model.mjs` (S3), `sweep.mjs` and `stress.mjs` (S7).

**Not promoted (kept in research as candidates, each needs an independent verdict pass first):** S9's `polish.mjs` probe, S8's `rtl.mjs` flip diff, S6's canvas probe as its own script, S5's `configurator.mjs`, S11's `journey.mjs` and `governor-check.mjs`, S10's moving-contrast mode.

## Rejected

- A single site-wide ambition dial (S6): a site "at level 4" everywhere is the scroll-jacked landing page.
- Justifying an interactive experience with vendor conversion figures (94 %, 44 %, 66 %): self-selected or unpublished (S6).
- Engine accessibility systems as the accessibility plan (PixiJS 8.21.0 measured failing five ways) (S6, S1).
- Tutorials and tours for discoverable mechanics; gamification layers (points, badges, streaks) on websites (S6).
- Tone.js or audio files for UI blips; the iOS `switch` haptic hack; the Fullscreen API for a signature shell (S6, S8).
- Theatre.js; React Spring for new work; GSAP outside authored marketing timelines (S2).
- A thumb-zone overlay in `capture.mjs` (S8): reach is judged in the walkthrough, not painted on captures.
- `stylelint-declaration-strict-value` with its defaults, or another company's design-system lint plugin (S12).
- A numeric perceptibility threshold for polish (S9): not validated; the stop rule is qualitative.
- Per-effect post-processing cost figures from SwiftShader (S10): only real-GPU numbers may be stated.

## Order of work

1. Scripts (owners per script, then a skeptic, then repair; regression cases returned, not written), in parallel with the documents.
2. Documents, one editor per destination file, each given this plan's decisions for its file and pointers into the stream reports; a skeptic per file.
3. `SKILL.md` last, by one editor, once the references it points to exist; then a whole-skill consistency pass (three runs: an interactive signature build, a productive app, an RTL marketing site).
4. Regression set and `check-skill`; then blind round 5 on a frozen snapshot (Stem & Wren: an interactive builder is warranted; Hallam & Price: restraint is).
