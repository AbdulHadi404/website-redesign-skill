# Interactive and signature experiences

Read in Phase 0 when a route or moment might be better as something people operate than as a page — a builder, configurator, studio, viewer, explorable, demo or toy — and again in Phases 3–6 when one is being built. 3D on an ordinary page has its checklist in `motion.md` §9; operable canvases have their accessibility contract in `accessibility.md` §9b. Evidence: `research/stage2/streams/S1`, `S5`, `S6`, `S10`, `S11` and the Cake Studio rows in `lessons-log.md`.

## Contents

1. When interaction beats a page
2. Interaction level and fidelity
3. Signature experiences
4. Choose what renders it
5. Direct manipulation
6. Configurators and made-to-order flows
7. Real-time 3D: two passes, measurement, quality per millisecond
8. From the page into the product
9. Generative and shader visuals
10. Loading a heavy experience

## 1. When interaction beats a page

Interaction wins when the result belongs to the visitor, or when the value is a system a page can only describe. It loses when it only reveals more of what a page could show: NYT's newsroom data found optional clicks, tabs, steppers and hovers went largely unused, while interactive pieces whose payoff was *the reader's own* result (the dialect quiz) were among its most viewed. Distill's review warns that "readers just want to scroll" has hardened into an anecdote; the evidence says: interaction when it is the message.

**Propose, don't only react.** Consider an interactive experience, even unasked, when one of these holds:

1. the visitor's result is *theirs* — a configuration, a personal answer, their own data → a builder, configurator, quiz with a personal result, or recap;
2. the value is a system of cause and effect → an explorable: let them act first, reveal the rule, give full control last;
3. the product is itself interactive → a playground of the real product with sample data, never a video pretending to be a demo;
4. the subject is spatial (angles, fit, place) → a viewer, AR or a map (`motion.md` §9);
5. choosing *is* the product (made-to-order goods) → a configurator (§6).

Otherwise build a conventional page with motion that explains, and keep nothing important behind hover.

**The value test** — answers in `DESIGN.md`; a "no" to any of the first three kills the idea:

1. **Swap**: replace it with the best static equivalent (photo, diagram, video, table). What does the visitor lose? "The wow" is not an answer.
2. **Result**: does the visitor leave with something they did not have — a decision, an artefact, an understanding, a request ready to send?
3. **First ten seconds**: can a first-timer perform the core verb without instructions, starting from a real, beautiful default?
4. **Tenth time**: still fast for a repeat user, with feedback budgeted by frequency (`motion.md` §2)?
5. **Cost**: payload, frame and idle budgets, the accessible equivalent, the art pipeline, device QA and maintenance are all funded.
6. **Evidence plan**: the metric for the core verb, the finish rate and the downstream conversion, tested against the static alternative when traffic allows. Vendor conversion figures for 3D, AR and configurators are self-selected; never cite them as a reason.

## 2. Interaction level and fidelity

Set per route and per moment (hero, explainer, configurator, onboarding, empty state), never per site: a site "at level 4" everywhere is the scroll-jacked landing page. The levels are a synthesis, not a validated scale; their job is to name the dial.

| Level | What the visitor does, and what answers |
| --- | --- |
| 1 Functional | native controls; the answer is a state change shown at once |
| 2 Responsive | level 1 plus feedback on the visitor's own actions and transitions that explain change; nothing moves for its own sake |
| 3 One manipulable element | one thing on the page the visitor operates that answers with *their* result (a template that recolours, a before/after, a live preview of their choices, an explorable figure), shareable in the URL |
| 4 Playful product | a route whose core is a loop: a coherent little world, immediate feedback, verbs introduced by use, a finish worth sharing |
| 5 Immersive world | spatial navigation, rules, sound, narrative — a campaign or a game product with its own team and budget |

| Surface (`framing.md` §1) | Ceiling |
| --- | --- |
| Public service; enterprise; docs prose | 1 (docs: a runnable playground of the real product, level 3, when the product is interactive) |
| SaaS app, dashboard, fintech, field tool; checkout, forms and account areas anywhere | 2 (one expressive *motion* moment at first run or after a long task; a calculator inside an app is a tool) |
| Content and editorial | 1, plus an explorable figure at 3 when the argument is a system or the result is personal |
| Marketing, dev-tool marketing, ecommerce browsing, mobile-first consumer | 2, plus one level-3 element per page; a 4 only as a route of its own |
| Signature route | the experience 4 (5 only with a team and budget); its chrome and controls 2 |

**Fidelity is a separate axis** — plain, illustrated or stylised, rendered and realistic — chosen from the brand's material and the quality bar, never maximised. A technically good realistic 3D builder lost to an illustrated, game-like one with immediate feedback: realism without character read as dated ("like The Sims 2"), while a coherent illustrated world read as the brand.

**Invariants at every level**: the task can be completed without the interaction (an equivalent path); keyboard and screen-reader paths (`accessibility.md` §9b); reduced motion removes juice but keeps state; sound off until chosen; a poster or still first and a failure path; zero `requestAnimationFrame` at rest; content visible without JavaScript; no dark patterns, gamification layers (points, badges, streaks) or tutorial tours for discoverable mechanics.

**The loop**, written before building a level-3 or level-4 experience: promise (what a page cannot give) · core verbs (≤ 3) · loop (action → feedback within 100 ms → a visible state that is theirs → a reason to act again) · default (a real, beautiful starting state, never empty) · first ten seconds · how each verb is discovered · feedback channels, each with a fallback · loading (what is playable first) · mobile (reach; a tap for every gesture) · failure (no WebGL, low memory, offline) · finish and hand-off (saved in the URL, handed into a request, order or signup) · measure.

## 3. Signature experiences

A feature meant to *be* the differentiator — the studio, configurator or visualiser people will play with and show others — is classified as a signature route (`framing.md` §1): expressive in fidelity and feel, productive in chrome and controls. The trap: reducing it to "a stepper with a small preview" because it had to fit between two website sections.

1. **Write the experiential quality bar first, in the user's words** ("someone opens it and thinks *what is this?*", "people would screen-record it"). Everything after is judged against it, not against a feature list.
2. **Research it as a product**: the best real products doing anything similar, in and outside the category (configurators, creative tools, editors, character creators) — what makes their interaction satisfying, how they load, how they work on phones.
3. **Give it its own shell**: a full-screen route or app with its own interaction model and asset pipeline, sharing the brand layer (type, colour roles, motion tokens, tone), never the website's layout, and never squeezed into a section or an iframe for convenience.
4. **Prove one vertical slice before breadth**: one excellent instance — one product, one scene, one flow — with real materials, motion and direct manipulation. More options only after the slice passes the bar.
5. **Scale quality, don't delete it**: tiers and fallbacks that keep the look (§7); optimise the ambitious version instead of designing a lesser one "for performance". Its budget is its own column in `performance.md` §1.
6. **Keep it practical**: it must also remove real ambiguity from ordering — better specifications, fewer messages. Spectacle that improves neither understanding, confidence, sharing nor ordering does not belong.

**When an experiment overtakes the original** (a second, deliberately different attempt that the user prefers): keep the original on an unlisted route as the fallback; write the migration as a list (routes, data model, save and load, order submission, admin views, share links, tests, every screenshot and sentence describing the old version); move the business functionality, not only the front end (a version field lets both document shapes live in one table); regenerate marketing material from the new product; re-evaluate the website around it; remove the original only after `parity.mjs` and `states.mjs` pass on desktop and phone.

**The site around it.** A signature product raises the visual expectations of its website. The site shares its art direction, motion personality and small motifs without becoming product UI, and uses its own strengths (photography, story, trust) to lead people in:

- **One stage per page**: one thing that responds; the rest barely moves. The premium sites in most categories win on photography and restraint.
- **The world moves around the photograph, never the photograph**: light, frames and captions may respond to pointer or scroll; the product image stays put from first paint (it is the LCP and the evidence).
- **Continuity beats transition**: the picture they clicked becomes the thing they use (§8).
- **No smooth-scroll library, and no WebGL on these pages when the product is live 3D**: stills rendered by the product carry them. Scroll storytelling is position-mapped and reversible (`motion.md` §5).
- **Budget**: the stricter lab budget for pages around a signature product (`performance.md` §1), judged on a phone from filmstrips.

## 4. Choose what renders it

Write one line per question into `DESIGN.md`: how many objects move at once at peak; whether depth, lighting and materials are needed or a flat illustration reads correctly; effects on many objects; text in the scene (people read, edit, translate it); operability (keyboard, screen reader, single pointer); a game loop; the host (its own route, a busy app, a section of a scrolling page); the route's budget; whether it must work where WebGL fails. Then take the first level that satisfies every answer.

| Level | Take it when | Move on when |
| --- | --- | --- |
| **DOM + CSS** (default) | up to a few hundred animated objects; images, text, controls; translation, selection and accessibility for free; instant first frame | more objects animate at once than it holds on the target device, or effects CSS cannot do per object |
| **Inline SVG** | vector geometry: paths, connectors, diagrams, maps; crisp zoom | same limits as DOM at about twice the cost |
| **Canvas 2D** (Konva or Fabric for an object model) | pixel work (brushes, trails), or ~1,000+ moving objects, or a page whose main thread is busy | GPU effects or far more objects |
| **Canvas 2D in a Worker** | the main thread is busy and drags must stay fast | an idle page (it only adds a frame of latency) |
| **PixiJS** | thousands of sprites or particles; filters, blend modes, masks | depth or models; a real game |
| **Phaser** | the scene *is* a game: physics, tilemaps, cameras | a toy without a game loop (PixiJS, at half the bytes) |
| **three.js / React Three Fiber** | depth, perspective, lighting, materials, orbit, glTF | flat sprites; past a few hundred meshes use instancing |
| **A full engine** (Unity, Godot, PlayCanvas editor) | content authored there by a game team, behind an explicit "Play" | anything that must be operable: no engine exposes DOM accessibility on the web |

Rules that held in the lab (main thread 4× slower, no GPU; relative, not phone numbers): an engine's first frame is 3–13× the DOM's, so no engine on a marketing page and a poster or DOM version first; one mesh per object does not scale and instancing cuts the JavaScript 8–14×; levels from Canvas up need the parallel keyboard layer and tap-to-place of `accessibility.md` §9b; text people read stays in the DOM; matter-js (26 KB) for toy physics. Confirm limits on a mid-tier Android and an iPhone before stating them.

## 5. Direct manipulation

For canvases where people select, orbit, drag and edit — every one of them, a signature experience included.

- **Never move the canvas under the pointer in response to the pointer.** Only persistent panels offset the view; an inspector opened by a selection floats over it. (Selecting an object opened the inspector and re-centred the view, so the object slid away before it could be dragged.)
- **Tell a tap from the end of an orbit by pointer travel** (about 6 px), or every orbit ends by selecting whatever was under the finger.
- **One history entry per gesture**: record the undo point when a drag or slider gesture starts, update without history while it moves, commit on release.
- **Drag from a library with a ghost** that shows exactly where the item lands, hidden where it cannot go; on touch, lift the ghost above the fingertip, and start a drag from a sideways-scrolling tray only on an upward pull.
- **Every drag has a single-pointer alternative**: tap to pick up, tap a spot to place (WCAG 2.5.7). A keyboard path does not satisfy 2.5.7.
- **Start from a real, beautiful default** (the client's signature piece), never an empty scene; it replaces the first-use empty state.
- **Undo by product size**: whole-state snapshots for a configurator; diffs or a persistent map for an editor with thousands of objects (spread snapshots cost 7 ms per move at that scale, diffs microseconds); property deltas or Yjs for multi-user. Persist the document, not the stack.

These faults never show in one screenshot. Test with a scripted gesture at a phone device: `states.mjs` `tap` and `swipe` steps with `--each`, comparing the capture after the tap with the one after the swipe.

## 6. Configurators and made-to-order flows

For a signature configurator, §3 and §5 lead and chapters are the accessible form path beside the canvas. For supporting ordering flows:

1. **Model before screens.** One pure module holds options, rules, prices, lead times and URL encoding; the UI, the server's validation and the tests all import it. Classify each option as a **need** (a fact the customer gave: headcount, date, a dietary requirement, the words of a message) or **taste**. Test transitions exhaustively: every single change must end valid, never override the option just chosen, and never change a need unless that need is what changed (a first rule set silently changed a stated need in 237 of 13,669 transitions).
2. **Start from what the customer understands**: a finished example or a shape, 3–6 starting solutions with a best-seller default; ask "how many people?", not the trade's term.
3. **Constraints: prevent, explain, warn, repair — never silently.** Options impossible for a need are not offered, with what unlocks them; an option people still look for is inactive with its reason beside it; an option that will change another says so before it is chosen; a repair of *taste* options happens inline with a notice and Undo; a repair that removes something priced asks first.
4. **One evolving picture of *their* object** stays in view, options shown as pictures of that option on their thing, labelled honestly (a sketch is not a render), with a scale cue; on phones the preview is pinned within the sticky-UI budget.
5. **A few chapters named after the customer's decisions**, never "Step 7 of 11" or the data model's names; going back never loses a choice.
6. **Price honestly**: an estimate only from the owner's numbers and only when every part is priced; otherwise who will quote it and when. Work that needs a human is modelled as request → quote → approval → deposit, saying what happens next at every step — not a cart and card form.
7. **Save, share, resume**: the configuration in the URL and local storage, **except free text** — page views, server logs and shared links all receive the query string; keep words in the local draft and the request, or save the design server-side behind an unguessable id. Analytics never carry free text either. Audit mid-configuration states with `--storage` seeds.

## 7. Real-time 3D: two passes, measurement, quality per millisecond

A signature 3D experience needs the mindset of a small real-time graphics team: budgets in milliseconds per frame, triangles, draw calls and megabytes.

- **Two passes, in this order.** Interaction first: manipulation, selection, camera, undo, saving, the finish moment, proved on one slice. Then a dedicated fidelity pass — materials, light, shadows, anti-aliasing, composition — as its own R&D project. Don't mix them, and don't declare it finished after the first.
- **Measure before and after.** A benchmark harness first: fixed scenes (plain, typical, heavy), quality tiers, device profiles and camera angles; record frame time (mean, p95), draw calls, triangles, texture memory, JavaScript per frame, load time and transfer. Production build only; real GPU in a focused window (`visual-qa.md`, "3D and WebGL experiences"). Isolate costs with experiment flags (`?msaa=0&ao=0`) instead of intuition, and keep a log of failed experiments.
- **Perceived quality is not polygon count.** In order of value per millisecond: accumulate jittered frames while the camera rests (free supersampling and soft shadows); bake occlusion; light like a photographer shoots the subject (a large soft key, a bounce, a rim, image-based softboxes); materials that differ by physics, not colour (cap near-white albedos so whites keep form); cache what does not move; render on demand. Geometry detail comes last and usually goes down.
- **Offline preprocessing**: bake, decimate and compress in a repeatable pipeline (source → bake → LODs → validate → compress → budgets → hashed files → manifest) before the second asset. Budgets per asset, enforced by a build step that fails (`scripts/model.mjs --fail`; defaults in `motion.md` §9). Meshopt by default (its decoder is 8 KB against Draco's 75 KB gzip; Meshopt decodes on the main thread unless `MeshoptDecoder.useWorkers(n)` is called). Textures: KTX2 in a real-time scene, where GPU memory is scarce; WebP in a page viewer, where transfer is.
- **Adaptive quality instead of a smaller design.** Tiers change resolution, effects and tessellation, never the lights, materials or composition, so the lowest tier still looks intentional. `templates/code/tier.js` picks the starting tier (URL override first, the display refresh measured while only the poster shows, WebGL and software-renderer checks, a start guess that only lowers, a probe of the top tier's own frame cost); `templates/code/governor.js` steps down on slow windows judged against the measured refresh, over runs of continuous frames, never in the first seconds — call `frame(now)` on every rendered frame and `pause()` whenever the loop stops, or an on-demand scene degrades to its floor. Capture every tier via `?tier=`.
- **Parallelise the R&D** across side agents with distinct missions (rendering techniques, materials, mobile limits, pipeline, competitor teardown), each writing a findings file; keep decisions in the main thread, and stagger heavy agents where usage is limited.

## 8. From the page into the product

When the real product improves, the marketing catches up: replace screenshots, demos and copy with captures from the real product at its own camera angles, never mock-ups of it.

The strongest website → product moment is continuity: the picture they clicked becomes the thing they use.

- Render each template or saved design the page offers from the exact view the product opens on, and record where the subject sits in the still.
- Give the page's still and the product's loading poster the same shared-element name (`view-transition-name`, React `<ViewTransition>`) and the same image file, warmed on hover, focus or touch with the product's code chunk.
- **Don't start the engine during the morph**: a shared-element morph animates size on the main thread, and engine start-up stretched a 0.56 s morph to 3.8 s. Mount the canvas when the morph ends; then move the poster onto the live subject's projected box and dissolve it, holding the camera still until then. The way back lands on the element it left: scroll it into view first.
- Replacing someone's work with a template is undoable, and the entry URL is rewritten so a reload reopens their work.
- Verify with a filmstrip from a compositor screencast on a production build; screenshots do not capture view transitions.

## 9. Generative and shader visuals

A moving background (a shader, particles, a canvas field) is decoration by default. It passes only when `DESIGN.md` records both:

- **a source**: it is driven by the company's real data (a named feed) or a documented material or behaviour of the product (a named reference photo or spec) — or the product is itself visual, and the page shows its real output;
- **why not a still or a loop**: a still and a pre-rendered loop were considered and rejected for a stated reason (it responds to input or live data, must never repeat, or must stay sharp where video cannot). "It feels alive" is not a reason.

Never behind productive surfaces, and never on pages around a live 3D product. Pick the cheapest medium that meets the requirement: a still (a render of the effect, grain baked in); a loop (CSS transform and opacity on pre-softened gradients, or a short AV1 video — never animated SVG filters or `@property` gradients over large areas, which kept the main thread 78–89% busy); a fragment shader in a WebGL2 context only for input, data or never-repeating motion (raw WebGL and a small wrapper is about 4 KB; three.js only if the page already ships it). Background JavaScript ≤ 10 KB gzip; render scale 0.5 with the pixel ratio capped at 2; 30 fps is enough for slow fields. Build from `templates/code/hero-effect.js` (poster first, crossfade on a WebGL2 fence, paused off-screen and hidden, governor, context-loss recovery, a Pause/Play control, never imported under reduced motion) and design a calm zone under the copy. Shadertoy code is CC BY-NC-SA by default; credit every borrowed function in `CREDITS.md`.

## 10. Loading a heavy experience

"Heavy" means the bytes needed before it is usable exceed what the target network delivers in about a second.

- **Its own route**: the poster first (the LCP while it is smaller than the viewport; a full-viewport poster is ignored and the route's first text becomes the LCP, so keep it in the HTML); the core and low-resolution assets right after it; the rest at low priority in yielded chunks; progress by bytes.
- **A section on a content page**: never eager (it delays the LCP and costs everyone the bytes) and never booted on idle (on slow 4G that costs the same as eager). A poster plus a start control, with the module warmed on approach (`modulepreload` and a low-priority fetch when it comes within a viewport, or on `pointerenter`/`focus`) — measured waits of 0.2 s instead of 7.5–13.8 s. Skip warming on Save-Data and the low tier.
- **Off the main thread**: first send only the columns the view needs; a worker returns summaries and transferred typed arrays, never an object graph (posting 200k objects back was slower than doing the job on the main thread). A visual that competes with input should first stop and render on demand; only one that must animate while people interact moves to OffscreenCanvas.
