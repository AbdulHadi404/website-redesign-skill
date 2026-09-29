# website-redesign: R&D report

Branch `claude/festive-planck-435hmn`, 2026-09-28 to 2026-09-29. Two stages: the 2.0 rewrite with four blind evaluations and the merge of the `product-ui-mode` and `greenfield-discovery` branches, then a stage-2 research programme on interactive, game-like and rich experiences, which was concluded before its findings were written into the skill's documents. The skill is the product; `research/` is its lab notebook.

## What the skill can do now that it could not before

- **Frame before designing.** Every route is classified (category, frequency, stakes; expressive, productive or signature), and the intensity is chosen (refine, redesign, rethink). A dashboard used all day, a checkout, a council form and a landing page now get different rules for density, motion, colour's job and success measures.
- **Derive, not pick.** Direction comes from the company's own mark, words and material. Convergence toward the model's prior (and toward the skill's own past outputs) is checked by the swap test, the ledger of past outputs with captures, and a blurred side-by-side.
- **First sites and signature experiences** (from `greenfield-discovery`): discovery when the context is thin (a social profile, a domain to learn), a product definition before the design brief, the rule that a signature experience is never shrunk to fit a website section, and what to do when an experimental prototype overtakes the original.
- **Applications are used, not visited** (from `product-ui-mode`): density defaults, brand moments and sign-in, traps that only show while building, the seam test between the marketing site and the product, and commitment 5 (no code fonts unless the audience reads code), now enforced by `audit.mjs`.
- **Measure what can be measured, judge the rest from renders.** Sixteen scripts, regression-tested in CI (76 cases):
  - `capture`, `audit`, `a11y`, `widgets`, `states`, `parity`, `perf`, `contrast`, `palette`, `fonts`, `compare`;
  - new in stage 2: `motion` (does approved motion exist and survive reduced motion), `sweep` (every width from 320 to 1920 plus zoom), `stress` (real content and real networks), `model` (what a glTF costs before it ships), `libcheck` (licence, activity and size of a code library);
  - plus the stage-2 additions listed below.
- **A fresh-context reviewer and task walkthroughs.** The builder's self-review is not evidence (experiment L: 22/22 "yes" against the reviewer's two "no" and five partials). Walkthroughs attempt the user's tasks on both builds from captures and a marked accessibility tree.
- **Learning loop.** Corrections become lesson rows, finished outputs become ledger rows with a 720 px capture, and mechanical lessons become script checks with regression cases.

## Research performed

**Stage 1 (the 2.0 rewrite).**
- An audit of the 1.x skill.
- Seven research streams (`research/streams/A–G`): AI design skills; components and design systems; assets, typography and colour; accessibility; responsive, mobile and performance; motion, 3D and data visualisation; practice, products and anti-patterns.
- Hands-on tool labs (`experiments/01, a11y-lab, E, F, G, I, J`).
- **Blind evaluations** (`experiments/H-blind-eval`): fresh agents ran the whole skill on five fictional companies across rounds 1–4:
  - a SaaS marketing site;
  - a field tool;
  - a bilingual Arabic/English invoicing dashboard;
  - a tile shop's storefront and checkout;
  - a council's parking-permit service.
- Walkthrough and fresh-reviewer experiments (K, L).

**The merge.**
- An inventory workflow split the two branches into 416 units and compared each against 2.0.
- 27 conflicts were decided in writing (`research/merge/`).
- One editor per destination file, a skeptic per file, then a whole-skill consistency pass that removed 22 contradictions.

**Stage 2.**
- A baseline map of 48 topics against the merged skill.
- Twelve research-and-experiment streams, each with a skeptical re-run of its key measurements and an amendment.
- An integration plan (`research/stage2/`).

## New discoveries

These are the findings that change a decision; the evidence is in the reports cited.

- **Rule engines see the least where the stakes are highest.** axe reported 0 violations on an interactive canvas nobody can operate by keyboard (S6). Across the stage-1 lab, rule engines caught about a third to a half of 60 seeded barriers (D). The scripted layer (keyboard walk, zoom and reflow, forced colours, widget contracts, focus visibility) closes most of the gap.
- **Interaction beats a page only when the result is the visitor's own, or the value is a system a page can only describe** (S6: Tse's NYT rules, Distill's review, the skill's own Cake Studio record). Published conversion figures for 3D, AR and configurators are vendor-reported or self-selected; the skill must plan measurement rather than cite them.
- **Fidelity is not ambition.** An illustrated, game-like builder with immediate feedback beat a technically good realistic 3D one (Cake Studio). Ambition is set per moment with ceilings by route; fidelity is a separate axis chosen from the brand's material (S6).
- **Choose the renderer from the requirement** (S1):
  - With the main thread 4× slower, DOM and SVG hold about 200 animated objects, Canvas 2D about 400, and a Worker about 700.
  - Engines cost 3–13× the DOM's first frame.
  - One mesh per object does not scale; instancing does.
  - No full engine is accessible on the web.
- **Motion tools differ in ways their docs do not say** (S2):
  - View Transitions swallow input.
  - One common Motion path jumps when interrupted.
  - Scroll features in three libraries never let `requestAnimationFrame` sleep.
  - CSS keeps moving through a blocked main thread.
  - Approved motion is lost between the plan and the build because specs are prose. A machine-checkable spec plus `motion.mjs` closes that.
- **Pixel diffs need stable captures, not thresholds** (S7): a 1 px shift changed fewer pixels than rendering noise. And a model finds only 31–41 % of single-property changes by eye, so reviewers get diff regions.
- **RTL is where the scripts were blind** (S8):
  - `audit.mjs` caught 0 of 24 seeded RTL defects.
  - `widgets.mjs` expected tab arrow keys the wrong way round in RTL.
  - Phone numbers, card numbers and time ranges reverse inside RTL text.
  - Checkmarks never mirror.
- **Much polish is not perceptible at normal size** (S9): macro space and one accent were seen and preferred; radius nesting, alpha borders and layered tinted shadows were not. Set those once in tokens and spend review rounds elsewhere.
- **Tenant colours are untrusted input** (S12). Choosing a fill's label by WCAG first tripled the all-gate pass rate, and Tailwind v4's `@theme` silently breaks per-subtree tenants.

## Experiments (selected; each has one runner and a results file)

| Experiment | Result |
| --- | --- |
| Blind rounds 1–4 (five companies) | Every output derived from the company's own mark and world. Contrast failures 34 → 0 and a11y FAILs 33 → 0 (marketing); clipped cells 122 → 0 (field tool); a11y FAILs 31–69 → 0 with a byte-identical checkout payload (storefront); axe rule types 5–6 → 0, lowest contrast 2.35 → 7.02:1, identical POST body (permits). Each round found fewer direction problems and more tool friction; every finding was reproduced, fixed and added to the regression set. |
| Fresh reviewer vs self-review (L) | Self-review 22/22 "yes"; the fresh reviewer found two "no", five partials and a violated "breaks if". The critique now requires evidence per "yes" and a fresh reviewer where one exists. |
| S1 rendering lab | One scene in eight technologies at 20–2,000 objects, 1× and 4×, with WebGL disabled, drag latency, heap and accessibility. |
| S2 motion lab | Seven interactions in eight tools: interruption, blocked main thread, rest-time `requestAnimationFrame`, reduced motion, bytes; Rive and Lottie runtimes. |
| S5 configurator | An exhaustive test of 13,669 transitions found the first rule set changing a customer's stated need in 237; a history benchmark of four undo strategies at 1,000 and 10,000 operations. |
| S6 canvas toy | Six builds of one toy: canvas-only, DOM stand-ins, form, hybrid, PixiJS default, PixiJS enabled — tasks by keyboard, touch and single pointer; tree contents; alignment; axe. |
| S7 regression engines | Five engines on seeded regressions and noise; `sweep.mjs` and `stress.mjs` on held-out pages (sweep 15 true, 2 intended, 0 false on 17). |
| S9 perceptibility | Twenty polish moves as toggles, captured at 1440 and 390, pair sheets with a hidden key. |
| S12 tenants | Twelve pathological tenant colours × modes; lint rules on 52,310 held-out lines (5 flags, all genuine). |

## Changes to the skill

- **Stage 1 and the merge** (in the skill now):
  - `SKILL.md`: phases 0–8 with gates, five commitments, the fast path.
  - References:
    - `discovery.md`, `realtime-3d.md` and `PRODUCT.md` (from the branches);
    - `app-ui.md` §12–14, `framing.md`, `categories.md`, `multilingual.md`;
    - `visual-qa.md`, `technical-qa.md`, `accessibility.md`, `motion.md`, `performance.md`.
  - Templates: `DESIGN.md`, `SYSTEM.md`, `critique.md`.
  - The ledger and lessons.
  - The scripts and their regression cases.
- **Round 4's findings**: one error-summary rule across files; focus-or-live-region in `widgets.mjs`; `a11y.mjs` audits only rendered content; request recording in `states.mjs` and `parity.mjs --payloads`/`--removed`; broken baselines named by `perf.mjs`; routes classified by their job; the accessibility statement in Phase 8.
- **Stage 2 scripts (landed, each verified by a skeptic and regression-tested):**
  - new scripts: `motion.mjs`, `sweep.mjs`, `stress.mjs`, `model.mjs`, `libcheck.mjs`;
  - `templates/code/`: `tier.js` and `governor.js` for device tiers, `hero-effect.js` for a poster-first shader background;
  - `audit.mjs` RTL and phone checks: a seeded bilingual page went from 0 to 22 of 24 defects found, and out of sample every fail was real. Also glyph clipping measured by ink for all scripts, concentric radii on four corners, and chart labels;
  - `widgets.mjs`: arrow keys follow the visual arrow in RTL, plus contracts for command palettes, sortable lists, splitters, roving toolbars and sliders;
  - `a11y.mjs`: no false failures on accessible canvas stand-ins;
  - `capture.mjs --dir rtl` and safe-area insets;
  - `fonts.mjs`: vertical metrics, clip floors and Arabic coverage;
  - `palette.mjs`: the fill's label chosen by WCAG, and `--tenant`;
  - `perf.mjs`: the load average of the machine.
- **Stage 2 documents: only what the landed scripts need.** That is the new `accessibility.md` §9b (canvas, WebGL and game-like interaction), tenant themes in `design-systems.md` §8, the RTL, riyal-sign and phone rules the checks cite in `multilingual.md` and `responsive.md`, and one clause per changed script row. Everything else is archived with an integration plan that names 31 destination files and four new references (`interactive.md`, `configurators.md`, `generative-visuals.md`, `resources/hard-ui.md`), the decisions that change existing rules, and a word budget per file. Integrating them is the next session's first task.

## Resource intelligence

- **Licence classes A–D** are checked at source, with the shipped LICENSE over the package field:
  - fonts, icons, illustration, photography;
  - code libraries (S4: MPL and EPL as class B, procurement-gated tools as class C, placeholder packages as D);
  - 3D, texture, sprite and sound sources (S3);
  - community effect code (S10: Shadertoy defaults to CC BY-NC-SA).
- **Library lookup for hard UI**: about 25 needs, with tested keyboard behaviour and traps (S4 `hard-ui` table, and `libcheck.mjs` for triage).
- **Measured costs**: animation stacks, scene engines, audio (Web Audio 0.5 KB against Tone.js 61–83 KB), decoders (meshopt 7 KB against Draco 59 KB brotli), glTF recipes (S1–S3, S6).
- **Curated sources** for ambitious work (game UI, interactive and 3D, motion, illustration, editors, configurators), at most five per area, each with its trap (S12).

## Workflow improvements

- Evaluations run on frozen snapshots; findings are applied afterwards and locked in regression cases.
- Script false positives are disproved with a probe, never by assertion; `SKILL.md` shows how to write one.
- Every workflow used adversarial verification: a skeptic per file or script that re-ran measurements on pages the work was not developed on.
- Merges are done unit by unit with written decisions, not by resolving text conflicts.
- For iteration across widths and content: sweep every template touched, stress key templates before the critique, diff at threshold 0 on stable captures, judge detail from 1:1 crops (S7; tools landed, documentation pending).

## Interactive-design improvements

- **In the skill now:**
  - the signature-experience gate;
  - discovery for a builder;
  - "interaction first, then a fidelity pass";
  - direct manipulation on a canvas (`ui-ux.md` §7b);
  - the benchmark harness and adaptive quality (`realtime-3d.md`).
- **Researched and specified, pending integration:**
  - when to propose an interactive experience, the value test, ambition per moment with fidelity as its own axis, and the interaction-loop template;
  - game-UI rules for web products;
  - the accessible-canvas contract;
  - sound and haptics;
  - the renderer decision table;
  - configurators, editors and undo by product size;
  - generative visuals with a purpose gate;
  - loading heavy modules and device tiers.

## Rejected ideas

Full lists are in each report.

- Category → palette lookups, brand-clone design files and costume presets (they reintroduce convergence).
- Lighthouse's accessibility score as a gate, and an IBM engine flag (noise for one signal).
- A site-wide ambition dial.
- Vendor conversion statistics as justification.
- Engine accessibility flags as the accessibility plan.
- Gamification layers and tutorial tours for discoverable mechanics.
- Theatre.js, and React Spring for new work.
- Percentage thresholds for visual diffs, BackstopJS and Lost Pixel.
- A thumb-zone overlay on captures.
- Lint strict-value defaults.
- Per-effect GPU costs from a machine without a GPU.

## Remaining gaps

1. **Stage 2 into the skill's documents**, per `research/stage2/01-integration-plan.md`, with a skeptic per file and a consistency pass. The core file should end shorter: the script options move out of `SKILL.md` into a scripts manual.
2. **Blind round 5**, prepared and not run (`experiments/H-blind-eval/round5-prompts.md`):
   - Stem & Wren, a florist where a bouquet builder is warranted;
   - Hallam & Price, accountants asking for Apple-style 3D, where restraint is the answer.
3. **Real devices and real assistive technology**: GPU numbers, iOS Safari, VoiceOver and NVDA. Every lab here ran on headless Chromium with SwiftShader on a shared machine.
4. **Categories not yet run blind**: docs and developer tools, enterprise admin, a mobile-first consumer app, a content site.
5. **Live-site studies and re-verifying [K] claims** once the network allows. Most live sites returned 403 here.

## Research coverage

| Area | Depth |
| --- | --- |
| UI/UX, design engineering, accessibility, responsive, performance, typography (incl. Arabic numerals), colour, design systems, product categories, visual QA, licensing, AI aesthetics | Researched, measured and integrated in stage 1; exercised in four blind rounds |
| Product UI, first sites and signature experiences | Integrated through the merge |
| Interactive and game-like experiences, game UI, rendering technology, web game engines | Researched with labs (S1, S6); specified, not yet integrated |
| Animation libraries, Rive and Lottie, motion verification | S2; `motion.mjs` landed |
| Assets, sprites, 3D pipelines, licensing of game assets | S3; `model.mjs` landed |
| Hard-UI libraries, capability discovery, design-engineering architecture | S4; libcheck landed |
| Configurators, editors, undo/redo | S5; specified |
| Screenshot iteration, visual regression, width sweeps, content stress | S7; `sweep.mjs` and `stress.mjs` landed |
| RTL components, Arabic metrics, mobile, haptics | S8; the script checks landed (`audit.mjs`, `widgets.mjs`, `capture.mjs`, `fonts.mjs`); the document rules are specified |
| Composition and polish | S9; specified |
| Shaders and generative visuals | S10; specified |
| Loading, device tiers, off-main-thread | S11; specified |
| White-label, POS and kiosk, token enforcement, reference boards, after launch | S12; specified |
| Sound and haptics; delight and branding through interaction | S6, S8; specified |
