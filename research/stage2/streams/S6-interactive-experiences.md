<!-- Stream S6, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S6-interactive-experiences/. The skeptical review is in S6-interactive-experiences.review.json. -->

# S6 — Interactive and game-like web experiences: when they beat conventional pages, game UI/UX principles for the web, ambition levels

## What the skill already knew (one short paragraph)

The skill can already classify a feature as a **signature experience** (SKILL.md Phase 0, `framing.md` §1, `categories.md`). For such a feature it knows to:
- write a quality bar in the user's words;
- research the feature as a product;
- prove one vertical slice;
- give it a full-screen route;
- scale quality with tiers instead of shrinking it (`discovery.md` §5b);
- promote a prototype that overtakes the original (§5c).

It also has rules for:
- direct manipulation on a canvas (`ui-ux.md` §7b);
- 3D fidelity and benchmarking (`realtime-3d.md`);
- how often motion may run, and when 3D earns its place (`motion.md` §2, §9).

It already rations expressiveness per route, in four places:
- `categories.md` "The dials", the Motion and Novelty rows;
- `framing.md` §2, "Novelty spent in one place";
- `motion.md` §3, "Expressive allowed";
- `art-direction.md` §4, "One stage per page".

Stage-1 stream G supplies the rule that expressiveness falls as frequency rises.

It has nothing on the following:
- **When to propose** an interactive experience. It only reacts once the user has called something a differentiator.
- **How to tell value from gimmick.**
- **Words for how much a route asks the visitor to operate.** The existing dials talk about motion and novelty, not interaction.
- **Game-UI principles**: juice, onboarding by doing, inventories, rewards.
- **Sound and haptics.**
- **Accessibility of a canvas that people operate.** `accessibility.md` has no canvas or WebGL entry. `motion.md` §9 offers `role="img"` + `aria-label`, which covers a picture, not a control.
- **The Cake Studio lesson**: realistic fidelity is not the quality axis (`lessons.md` 2026-09-28, `ledger.md`).

## Findings (tagged; numbers where they exist)

### F1. Interaction beats a page when it is the message; optional interaction that only reveals more content goes unused

**[V] Archie Tse (NYT), "Why we are doing fewer interactives", Malofiej 2016.** Source: the slides PDF in `github.com/archietse/malofiej-2016`, read with pdf.js. It is a 2016 newsroom finding about *optional* interactions inside news articles.
- "Readers just want to scroll."
- Rule 1: "If you make the reader click or do anything other than scroll, something spectacular has to happen."
- Rule 2: "If you make a tooltip or rollover, assume no one will ever see it. If content is important for readers to see, don't hide it."
- Rule 3: "Getting it to work on all platforms is expensive."
- The NYT dropped steppers, tabs and sliders ("often just a way for the reader to see more stuff … readers weren't getting to all of the content") and moved motion onto scroll: "we still do interactives, but the bar is now VERY high."

**[V] Hohman et al., "Communicating with Interactive Articles", Distill 2020.** Source: `distillpub/post--communicating-with-interactive-articles`, `public/index.html`. I checked that every passage below is in the published body, not in an HTML comment.
- "There is limited empirical evaluation of the effectiveness of interactive articles."
- It cites **Conlen, Kale & Heer 2019** (`conlen2019capture` in its bibliography): "many readers, even those on mobile devices, are interested in utilizing interactivity when it is a core part of the article's message."
- It cites **McKenna et al. 2017**. Participants "largely preferred content to be displayed with a step- or scroll-based navigation as opposed to traditional static articles, but did not find a significant difference in engagement between the two layouts". The two layouts are **step and scroll**, not either one against a static article.
- It cites **Zhi et al.**: comprehension was better in slideshow layouts than in vertical scroll layouts.
- It cautions against using Tse's statement as a law. The statement "has solidified as a rule-of-thumb for designers and many choose not to utilize interactivity because of it … designers are potentially choosing a suboptimal presentation of their story due to this anecdote."
- A footnote says "multimedia studies show large effect sizes for improvement of transfer learning in many cases" (Mayer, *Multimedia Learning*, ch. 12).
- It also names the risk: "not everything needs to be interactive … interactivity may be distracting to readers or the functionality may go unused."

**[S] Peabody Awards: the NYT dialect quiz (2013)** became the most-viewed piece in NYT history at the time. Its payoff is a map of *you*.

**[V] The skill's own record, `lessons.md` 2026-09-26 and 2026-09-28:**
1. A stepper with a sketch was rejected.
2. A realistic 3D studio "looks like The Sims 2".
3. An illustrated, game-like builder won.

**Reading of the evidence.**
- Tse and Distill agree on what fails: optional clicks, tabs, steppers and hovers that only reveal more of what a page could show.
- They disagree on the default. Tse's "readers just want to scroll" describes that class in 2016. Distill calls its use as a general rule an anecdote.
- The successes above share one trait. The interaction produces something that belongs to the user (their cake, their dialect, their model of trust), or it shows a system that a static page cannot show.
- The evidence for learning gains comes from multimedia-learning research that Distill cites, not from web A/B tests.

### F2. Conversion evidence for 3D, AR, configurators and demos is weak and mostly self-selected

| Claim | Source | Reliability |
| --- | --- | --- |
| "Products with 3D/AR content: 94% higher conversion" | [S] Shopify blog, repeated by vendors | **Low.** No methodology is published, and it compares products, not visitors. |
| Rebecca Minkoff: interacting with 3D → 44% more add-to-cart, 27% more orders; AR → 65% more orders | [S] Shopify Plus case study | **Low to moderate.** It compares interactors with non-interactors (self-selection). It is not an A/B test. |
| Audi 2D → real-time 3D configurator: ~66% more engagement, +9% options chosen | [S] vendor round-ups | **Low.** Vendor-reported. |
| Interactive demos: top-25% engagement 50.1%, completion 28.9%, CTR 12.8%; "+15% conversion to contact" | [S] Navattic, State of the Interactive Product Demo 2025 (28,000 demos, 280 surveys) | **Descriptive only.** Vendor data, not causal. |
| Gamification "works" | [S] Hamari, Koivisto & Sarsa, HICSS 2014 | **Moderate.** Effects are positive but depend on context and on the users. |
| Tutorials | [S] Andersen et al., CHI 2012 (45,000 players, 8 tutorial designs, 3 games) | **High for games.** Tutorials raised play time by up to 29% in the most complex game and did not significantly help in the two simpler ones. |
| Endowed progress | [S] Nunes & Drèze 2006, car-wash cards | **Moderate.** 34% vs 19% completion. |

Consequence: never justify an interactive experience with a vendor percentage. Plan the measurement instead:
- the rate of the core verb;
- the finish rate;
- the downstream request, order or signup;
- an A/B test against the best static alternative when traffic allows.

Never compare interactors with non-interactors: that is selection bias.

### F3. Accessibility and pointer targets of an operable canvas: one toy in six builds (details in E1, E4)

**[L] Automated rules miss it.** axe-core reported 0 violations on all six builds (`results/toy.json` → `variants.*.axe`). That includes the canvas-only build (a), which no keyboard or screen-reader user can operate.

**[L] The skill's `a11y.mjs`.**
- It catches the two canvas-only builds (a, e), with 2 true FAILs each:
  - "Clickable (pointerdown listener) but not keyboard focusable";
  - "Nothing on the page receives keyboard focus".
- It raises 3 false FAILs on each correct stand-in build (b, d):
  - two under 2.4.11 ("focused element fully hidden"): `elementFromPoint` returns the canvas, because the stand-ins use `pointer-events: none` so that the canvas keeps its drag;
  - one under 2.1.1 ("clickable canvas not focusable"): the canvas's keyboard path is its stand-ins.
- It also WARNs 4 times, on both b and f, that the controls have "no border in forced-colors mode".

**[L] A parallel DOM of real `<button>`s over the canvas (b).**
- Completes all 3 keyboard tasks in 11 keypresses.
- The accessibility tree names every topping and where it is.
- Costs **+3.4 kB gzip and +192 non-blank lines** over the canvas-only build (8.8 vs 5.4 kB).
- Stand-ins sit ≤ 10 px from their objects on desktop and 7.5 px at 390 px.

**[L] A form or list alternative (c):** 3/3 tasks in 17 keys, +1.5 kB, 0 `a11y.mjs` FAILs. It works in screen-reader browse mode and with voice control ("click Add to cake") with no custom widget code.

**[L] Hybrid (d):** +4.4 kB, and it has both paths.

**[L] Pointer targets are a canvas property, separate from stand-in size.**
- WCAG 2.5.8 applies to what the pointer actually hits. In b that is the canvas's hit test, because the stand-ins ignore the pointer.
- The measurement: in each direction, binary-search the largest whole-pixel offset from a topping's centre at which a drag still grabs it.
- The first version of b set its hit radius in canvas units, 28 units, which is 56 px at 480 px wide. At 390 px the canvas scales to 358 px:

  | Build | Desktop | 390 px, coarse pointer |
  | --- | --- | --- |
  | First version (`?hit=legacy`) | 54 px | 40 px (below the skill's 44 px coarse-pointer rule, `accessibility.md` §2 Targets) |
  | Current (radius at least 12 CSS px, or 22 CSS px on coarse pointers) | 54 px | 43–44 px |

  The method reads up to 2 px low; the designed values are 56 and 44 px.
- **Pixi's default hit test is the drawn shape.** The candle can be grabbed across only **11 px on desktop and 8 px at 390 px**, the strawberry across 26 / 18 px. Both are below the 24 px floor.

**[V][L] PixiJS 8.21.0's built-in `AccessibilitySystem` (e, f).** This is the default a developer reaches for.
- **It never activates on desktop with default options.** Tab adds no layer (0 interactive nodes before and after Tab). No `keydown` listener exists until `_activate()` has run (`lib/accessibility/AccessibilitySystem.mjs`). The regression came from #11700 and was fixed on `main` on 2026-09-25 (#12220, commit a3052f8), but the fix is **not released**: npm latest is 8.21.0, published 2026-09-17.
- **Its layer disappears on mouse movement.** With `enabledByDefault: true` (f), four palette buttons exist at load. Any mouse movement removes them (4 → 0), because `deactivateOnMouseMove` defaults to true. Tab brings them back.
- **Names never update.** The title is set only in `_addChild`. After a move, the tree still says "Strawberry 1, near the centre" while the strawberry sits at the top left.
- **There is no live region, and Enter is the only verb.** Enter and Space map to click, so moving and removing are impossible by keyboard: 1/3 tasks.
- **The overlay is offset by the canvas's own position on the page.**
  - Cause [V]: `CanvasObserver` appends the overlay to `canvas.parentNode` and sets `translate(rect.left, rect.top)` from `canvas.getBoundingClientRect()`.
  - Measured [L]:

    | Canvas parent | Desktop | 390 px |
    | --- | --- | --- |
    | Positioned (the usual `position: relative` wrapper) | 130 px | 144 px |
    | Positioned, canvas 900 px lower and scrolled into view | 1,022 px | 1,043 px |
    | Static | ≤ 12 px (still aligned after scrolling) | ≤ 9 px |

  - Inside a positioned parent, the page position is applied twice.
- **Item stand-ins are pointer targets that are too small.** They take the object's bounds: 12 px on desktop, 9 px at 390 px. Unlike b's stand-ins, they receive the pointer: `accessiblePointerEvents` defaults to `"auto"` (`accessibilityTarget.mjs`, applied at `AccessibilitySystem.mjs:399`). So they are targets below 24 px themselves.
- **The engine costs 234 kB gzip**, against 5.4 kB for the hand-built canvas.
- **The default ticker keeps calling `requestAnimationFrame` at rest.** Measured e 16–72 and f 24–66 calls per second across six full runs (five mine, one the reviewer's); the rate depends on machine load. The on-demand canvas measured 0.

**[L] Methodology disclosure.** The Pixi builds now use the engine's default drawing buffer (`preserveDrawingBuffer: false`) everywhere except in one measurement. The reduced-motion frame count reads `toDataURL`, so it loads e and f with `?pdb=1`. In the first report they always set `preserveDrawingBuffer: true`, and the report did not say so.

**[V] Other engines.**
- Phaser 4.2.1 ships no accessibility layer (no `aria-` in `dist`).
- Babylon 9.28's `@babylonjs/accessibility` builds a React "HTML twin" from `accessibilityTag` and observes changes to the tags.
- `@react-three/a11y` 3.0.0 renders real DOM elements, with roles limited to button, togglebutton, link, content and image, plus an announcer. It has no drag or move semantics.

**[L] Reduced motion.** The canvas-only build (a) keeps its juice under `prefers-reduced-motion`: 8–9 distinct frames in the 0.5 s after a drop, against 1 for b, c and d.

**[L] Stand-in synchronisation cost when every object moves every frame.** Build b, 180 frames, median of 5 per run. Style recalc is CPU work, so the numbers compare only within this lab.

| Moving toppings | Style recalc per frame, stand-ins on (5 runs: 2 before review, the reviewer's, 2 after) | JS per frame, final run (stand-ins off → on) |
| --- | --- | --- |
| 10 | 0.14–0.21 ms | 0.1 → 0.2 ms |
| 50 | 0.39–0.59 ms | 0.3 → 0.4 ms |
| 200 | 1.34–2.23 ms | 0.8 → 1.0 ms |

- Without stand-ins, style recalc is ≤ 0.007 ms per frame. That is about 7–11 µs per moving stand-in at 200: negligible for a builder, and worth throttling for hundreds of animated objects.
- **[L] Writing a layout property per frame is expensive (one intermediate run, not kept in the runner).** A version of the stand-in code wrote each stand-in's width with every move and read the canvas width once per stand-in. It measured 4.0 ms style recalc and 5.9 ms JS per frame at 200 toppings. The final code writes only `transform` per frame and writes size only when it changes.

**[V] BCD 8.1.3: `Element.ariaNotify()` is available in Chrome/Edge 141, Firefox 150 and Safari 27.** Notes: announcements can be dropped on macOS VoiceOver when another event competes, and are never spoken on ChromeOS. It is a candidate for canvas narration, with a `role="status"` fallback.

**[L] The canvas probe, v2 (E4).** It reaches the expected verdict on 50 of 50 runs (25 pages, each with and without reduced motion), with 0 crashes and 0 navigations. v1 had 5 false results and 1 crash on the same kinds of page.

### F4. What the celebrated open-source web games teach, and what they never do

These were read from source at pinned commits (`fetch-sources.sh`); the figures are in `results/sources.json`.

**[V] 2048** (`style/main.scss`, `js/keyboard_input_manager.js`).
- The whole feedback budget per move:
  - tile moves take 100 ms;
  - a new tile "appears" over 200 ms after a 100 ms delay;
  - a merge "pops" over 200 ms, scaling 0 → 1.2 → 1;
  - the "+N" score float takes 600 ms.
- Input never waits for the animation.
- Twelve keys map to four directions (arrows, WASD, Vim HJKL), plus swipe.

**[V] Juicy Breakout** (Jonasson & Purho, "Juice it or lose it", Nordic Game Indie Night 2012; `Settings.as`).
- Juice is **31 boolean switches (30 off by default) plus numeric tunings, in 10 labelled groups**, layered over a working base.
- The groups are colours, tween-in, stretch and squeeze, sounds, particles, screen shake, freeze or hit-stop (0–320 ms), personality and glitch.
- Because juice is additive and every layer can be switched off, it maps directly onto reduced-motion and sound settings.

**[V][L] A Dark Room** (`script/*.js`).
- The game starts with **one control**.
- `run-sources.mjs` plays it with a greedy script for 40 simulated minutes under a fake clock, with `Math.random` seeded (`results.json` → `sources.adarkroomPlay`). Controls first appeared at these simulated minutes:
  - *light fire* 0, *stoke fire* 0.5, *gather wood* 1 (with a second place);
  - *trap* and *cart* 4, *check traps* 4.5, *hut* 5.5;
  - *lodge* 13.5, *trading post* 22.5, *tannery* 30.5, *smokehouse* 33.5.
- Visible controls went 1 → 5 → 6 → 7 → 10 at minutes 0, 5, 10, 20 and 40. Resource rows went 0 → 8 by minute 10.
- **Progress is shown in the world, not in a bar.** The places rename themselves: "A Dark Room" becomes "A Firelit Room" (0.5 min). "A Silent Forest" becomes "A Lonely Hut" (17.5), then "A Tiny Village" (20.5), then "A Modest Village" (33.5).
- **The second place is taught by use.** The builder becomes useful only when the player returns to the room (`onArrival`).
- **Sound is off until chosen.** An in-world prompt appears after 3 s ("ears flooded with new sensations. perhaps silence is safer?", with *enable audio* and *disable audio*). The choice persists, and a `sound on.` toggle stays in the menu.
- **It is mouse-only.** Every control is a `<div class="button">` with no tabindex or role, and costs appear only in hover tooltips.

**[V] The Evolution of Trust.**
- Its chapters are ordered by file name: `0_Intro, 1_OneOff, 2_Iterated, 3_Tournament, 4_Evolution, 5_Distrust, 6_Noise, 7_Sandbox, 8_Conclusion`. **The full-control sandbox comes 8th of 11 slide files.**
- All the copy lives in one `words.html`: 3,404 words of text by the runner's count (3,524 by a plain word count of the file, which includes markup). That single file made its many translations possible, and would make a text alternative possible.
- Sound is on by default (Howler), with an ON/OFF toggle.

**[V] Accessibility signals across nine celebrated codebases.**
- The nine: A Dark Room, 2048, Juicy Breakout, Trust, Polygons, Chrome Music Lab, Bruno Simon's folio-2019, Hextris and BrowserQuest. Only authored sources were read, excluding `lib`, `vendor` and `build` folders.
- The count is 0 in all nine for `aria-*`, for live regions and for `prefers-reduced-motion`.
- Game references teach *feel* and *sequencing*, never accessibility, so the skill must add the accessibility contract itself.

### F5. Game-UX literature that transfers (search snippets and prior knowledge)

- **[S] Celia Hodent's seven usability pillars** (adapted from Nielsen): signs and feedback, clarity, form follows function, consistency, minimum workload, error prevention and recovery, flexibility. Her engage-ability pillars are motivation, emotion and game flow.
- **[S] Fagerholt & Lorentzon 2009 ("Beyond the HUD", Chalmers):** game UI is diegetic, non-diegetic, spatial or meta, placed on two axes (inside the fiction or not; inside the 3D space or not).
- **[S] Koichi Hayashida's kishōtenketsu for Mario levels:** introduce a mechanic, develop it, twist it, conclude, within about five minutes.
- **[S] Game Accessibility Guidelines:** organised in basic, intermediate and advanced tiers across motor, cognitive, vision, hearing, speech and general.
- **[S] Xbox Accessibility Guidelines:** 23 guidelines.
- **[K] Swink, *Game Feel* (2008):** real-time control, simulated space, polish.
- **[K] Kurtenbach & Buxton:** marking menus.
- **[K] Self-determination theory** (Ryan, Rigby & Przybylski 2006): autonomy, competence, relatedness.
- **[S] The EU Digital Fairness Act** (Commission proposal expected Q4 2026) targets "addictive design" (streaks, variable rewards, infinite scroll, autoplay) alongside dark patterns.

### F6. Sound and haptics

**[L] Payloads** (esbuild, minified, gzip-9; `results/audio.json`):

| Option | Size |
| --- | --- |
| Raw Web Audio (the toy's two synthesised blips, toggle and gesture gate) | 0.5 kB |
| ZzFX 1.3.2 | 1.05 kB |
| Howler 2.2.4 core | 8.1 kB |
| Howler 2.2.4 full (package main, with the spatial plugin) | 10.0 kB |
| Tone.js 15.1.22, one `Synth`, tree-shaken | 60.9 kB |
| Tone.js whole namespace | 82.8 kB |
| One 0.13 s click as an uncompressed WAV | 11.5 kB |

**[L] Chromium 141's default policy.**
- An `AudioContext` created at load is `suspended`, and is still suspended at 500 ms.
- `navigator.vibrate()` returns `false` before user activation.
- After one click the context is `running` and `vibrate` returns `true`.
- With `--autoplay-policy=no-user-gesture-required` the context runs without a gesture. A test suite that uses that flag cannot verify "silent until interaction".
- Pitfall: Playwright's `evaluate()` runs with a user gesture and falsely reports activation. Measure from page scripts instead.

**[V] BCD 8.1.3.**
- `Navigator.vibrate`:
  - Chrome and Chrome Android 32, Edge 79, Samsung Internet 2.0. It requires a user gesture since Chrome 60 and is not supported in cross-origin iframes.
  - Firefox desktop removed it in 129.
  - Firefox Android: "vibration is disabled" (the call returns true but nothing vibrates).
  - Safari and iOS never supported it.
  - So web haptics reach only Chromium-based Android browsers.
- Single-engine features:
  - `Navigator.audioSession`: Safari/iOS 16.4 only (experimental).
  - `input switch`: Safari 17.4 only (non-standard).
  - `Navigator.getAutoplayPolicy`: Firefox 112 only.
- `Element.requestFullscreen` on iOS: "Only available on iPad, not on iPhone … swiping down exits fullscreen mode, making it unsuitable for some use cases like games". A signature experience's full-screen shell must therefore be a full-viewport route, not the Fullscreen API.

**[S] iOS.**
- Pages with an `AudioContext` get the "ambient" audio session, which obeys the ring/silent switch. That is the right behaviour for UI sounds; `audioSession.type = "playback"` bypasses the switch.
- Libraries such as `ios-haptics` trigger haptics by toggling a hidden `<input type=checkbox switch>`. Apple reportedly closed that path in iOS 26.5. It is a hack; do not build on it.

## Experiments (what you built, how to re-run, results tables)

**Folder:** `/home/user/website-redesign-skill/research/stage2/experiments/S6-interactive-experiences/`, 1.3 MB without `node_modules`.

**Re-run everything:**

```sh
npm install
sh fetch-sources.sh     # clones 11 repositories at pinned commits into /tmp/s2-S6 (outside the repo)
node run.mjs            # toy → audio → sources → probe, one browser at a time; writes results.json
```

The final run exited 0 for all four parts: toy 863 s, audio 5 s, sources 801 s, probe 257 s. Each part also runs on its own:

- `node run-toy.mjs [--quick] [--only b,f,hit]`
- `node run-audio.mjs [--no-browser]`
- `node run-sources.mjs [--minutes 40] [--no-play]`
- `node run-probe.mjs [--only name] [--no-external]`
- `node lib/probe-canvas.mjs <url> [--reduce] [--viewport 1280x900]`, which exits 1 on any FAIL

**Environment.** Chromium 141.0.7390.37 headless with SwiftShader, on 4 shared CPUs under load from other agents. Timings are medians of 5 and are comparable only among themselves.

### E1. The accessible-canvas toy ("Top the cake")

The same state model (`toy/model.js`) drives every build: 4 toppings, 9 zones, add, move and remove, 40 at most. Each view is a separate module.

| Build | What it is |
| --- | --- |
| a | Canvas 2D only, pointer drag, juice always on. Hit radius at least 12 CSS px, or 22 on coarse pointers. |
| b | a plus a parallel DOM. The palette is an APG toolbar (roving tabindex). Each topping is a real `<button>` over it, sized to its hit area, with `pointer-events: none`: arrows move it, Shift moves it further, Delete removes it and moves focus to the next item. One `role="status"` exists at load. Tap-to-arm then tap-to-place (WCAG 2.5.7). Juice is off under reduced motion. Sound is off by default behind an `aria-pressed` toggle. `?hit=legacy` restores the first version's hit radius and stand-ins. |
| c | Form only: radios for topping and zone, "Add to cake", and an ordered list with a position `<select>` and Remove per item. The canvas is `role="img"`, named by the model's summary. |
| d | b plus c. |
| e | PixiJS 8.21.0 with `accessible = true` and `accessibleTitle` on every object; engine defaults, including the drawing buffer. |
| f | e with `accessibilityOptions.enabledByDefault = true`. |

Tasks:
- **T1:** add a strawberry at the centre.
- **T2:** add a candle at the top left.
- **T3:** remove the strawberry.

Results (`results/toy.json`, final run; functional results were identical in both post-review runs):

| | a canvas | b stand-ins | c form | d hybrid | e Pixi default | f Pixi enabled |
| --- | --- | --- | --- | --- | --- | --- |
| Own code, gzip (decimal kB) / non-blank lines | 5.4 / 277 | 8.8 / 469 | 6.9 / 355 | 9.8 / 533 | 4.3 / 205 | 4.4 / 205 |
| Engine, gzip | — | — | — | — | 234 kB | 234 kB |
| Interactive AX nodes: load → after mouse move → after Tab | 0 → 0 → 0 | 5 → 5 → 5 | 14 → 14 → 14 | 19 → 19 → 19 | 0 → 0 → 0 | 4 → 0 → 4 |
| Keyboard tasks (keys) | 0/3 | 3/3 (11) | 3/3 (17) | 3/3 (11) and 3/3 (19) | 0/3 | 1/3, silent |
| Announcements for T1 / T2 / T3 | none | 1 / 3 / 1 | 1 / 1 / 1 | as b and c | none | none |
| Seeded state readable from the tree (3 items) | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 |
| Names follow a move | — | yes | yes | yes | — | no (stale) |
| Stand-in max offset, desktop / 390 px | — | 10 / 7.5 px | — | 10 / 7.5 px | — | 130 / 144 px |
| Smallest item stand-in, desktop / 390 px (takes the pointer?) | — | 56 / 44 px (no) | — | 56 / 44 px (no) | — | 12 / 9 px (yes) |
| Pointer drag T1–T3 | 3/3 | 3/3 | — | 3/3 | 3/3 | 3/3 |
| Single-pointer (tap) T1–T3 | 0/3 | 3/3 | form 3/3 | 3/3 | 1/3 | 1/3 |
| Touch tap / touch drag at 390 px | no / yes | yes / yes | yes (form) | yes / yes | yes (adds at centre) / yes | yes / yes |
| Distinct frames after a drop under reduced motion | 8–9 | 1 | 1 | 1 | 1 (no juice) | 1 |
| `requestAnimationFrame` calls per second at rest (six runs) | 0 | 0 | 0 | 0 | 16–72 | 24–66 |
| `AudioContext`s before the sound toggle | 0 | 0 | 0 | 0 | 0 | 0 |
| axe violations | 0 | 0 | 0 | 0 | 0 | 0 |
| `a11y.mjs` FAIL | 2 (true) | 3 (false) | 0 | 3 (false) | 2 (true) | 1 (true), plus 4 title-only-name WARNs |
| `probe-canvas.mjs` v2 | FAIL | PASS | PASS | PASS | FAIL | WARN (Enter adds silently; no stand-ins over the canvas) |

**Pointer hit targets on the canvas** (smallest dimension, CSS px; see F3 for the method):

| Object | b current, desktop / 390 coarse | b first version, desktop / 390 coarse | e Pixi (drawn shape), desktop / 390 |
| --- | --- | --- | --- |
| Strawberry | 54 / 43 | 54 / 40 | 26 / 18 |
| Candle | 54 / 43 | 54 / 40 | 11 / 8 |
| Item stand-in box | 56 / 44 (covers the hit area) | 44 / 33 (smaller than the hit area) | — |

**Pixi overlay offset**, worst stand-in (see F3): positioned parent 130 / 144 px; positioned and 900 px lower 1,022 / 1,043 px; static parent ≤ 12 / ≤ 9 px, scrolled or not.

**What works:**
1. One model and two views. The DOM view is a view, not a re-implementation, so it cannot drift from the canvas.
2. Real buttons that exist from load, positioned over the object, covering its hit area, and named from the model on every change.
3. A hit area set in CSS px, so a scaled-down canvas does not shrink it.
4. Keyboard verbs on the object: arrows, Shift, Delete, Enter.
5. One polite status line that exists before any change and narrates results, not frames. A zone change is narrated at once; the resting position once, after 700 ms.
6. A form or list that does every task, for browse-mode, voice and switch users.

**What fails:**
- a canvas labelled as nothing;
- an engine flag trusted without testing;
- stand-ins created lazily or removed on mouse movement;
- names that do not follow state;
- hit areas defined in canvas units, which fall below 44 px on a phone;
- shape-based hit tests on thin objects;
- stand-ins that take the pointer at 12 px;
- automated rule engines treated as the proof.

### E2. Sound, haptics and compatibility

`run-audio.mjs` produced the F6 tables. It also emits BCD 8.1.3 rows for 26 features: vibration, audio, activation, autoplay, audio session, `switch`, gamepad haptics, fullscreen, orientation lock, speech, `ariaNotify`, reduced motion and reduced transparency, forced colours, contrast, WebGPU, OffscreenCanvas, `touch-action` and view transitions. The reviewer's run was byte-identical.

### E3. Source reading and the A Dark Room playthrough

`run-sources.mjs` produces the F4 facts:
- accessibility-signal counts for nine repositories;
- the 2048 timings;
- the Juicy Breakout toggle catalogue;
- A Dark Room's markup and sound default;
- Trust's chapter order and copy file.

It also plays A Dark Room for 40 simulated minutes under Playwright's fake clock, **with `Math.random` seeded (mulberry32)**. The script:
- presses only the visible controls in the current place;
- stokes the fire only while it is below roaring;
- walks to the next place every 20 s;
- declines audio;
- never embarks.

Two seeded 10-minute plays were identical. An unseeded play is not reproducible: the first report's unseeded run first showed the trading post at 37 min, and an unseeded run after review showed none by 40.

| Simulated minute | 0 | 5 | 10 | 20 | 40 |
| --- | --- | --- | --- | --- | --- |
| Visible controls | 1 | 5 | 6 | 7 | 10 |
| Places (tabs) | 1 | 2 | 2 | 2 | 2 |
| Resource rows | 0 | 3 | 8 | 8 | 8 |

### E4. Canvas probe v2 (`lib/probe-canvas.mjs`) and its validation (`run-probe.mjs` → `results/probe.json`)

**What v2 does per canvas of at least 200×200 px.**

1. **Listeners.**
   - Counts pointer listeners on the canvas, on same-size wrappers (≤ 2× its area; this is React Three Fiber's event source), and in React `__reactProps$` handlers.
   - Reports body, document and window listeners separately.
   - Drops listeners registered by Playwright's own injected script.
2. **Exposure.** The canvas's role and name, whether it is `aria-hidden`, and any fallback content.
3. **Baseline.** Canvas pixels are captured with CDP `Page.captureScreenshot` clipped to the canvas's current box. That capture sees WebGL drawn with `preserveDrawingBuffer: false`. It takes at least 5 captures over 0.7 s with no input. If the canvas changes on its own, pixel change stops counting as evidence.
4. **Tab walk.** It tabs until an element repeats, reading each stop's rect and every canvas's rect in the same evaluation, so scrolling cannot make them disagree.
5. **Keys.** Keys are pressed only on widgets: buttons, checkboxes, radios, sliders, selects, and a focusable canvas.
   - Never on links or text fields.
   - Only when the canvas is pointer-operable.
   - Main-frame navigations are aborted with `page.route`.
   - Sampling starts at the keypress, so it records both the change and the distinct frames after it.
6. **What counts as a response.** Any of:
   - live-region text or an `ariaNotify` call;
   - a state change on the focused control;
   - a pixel change, if focus stayed on the control or moved to a newly created element.
7. **Verdicts.**
   - **FAIL:** pointer-operable with no keyboard path. The message tells the reader to record it and hide the canvas if the effect is decorative.
   - **WARN:** not narrated; keyboard path only beside the canvas; keys on the canvas itself; stand-ins that take the pointer below 24 px; animating at rest under reduced motion (2.2.2 / 2.3.3); more than 2 frames after a change under reduced motion.
   - **INFO:** `requestAnimationFrame` running at rest.

**Validation: 25 pages, each run with and without reduced motion, 50/50 agreeing with the expected verdict, 0 crashes, 0 navigations.** "Review" marks the reviewer's pages that v1 got wrong. The other stage-2 pages are served read-only from their folders when present.

| Page | Expected (reduce / no preference) | v1 | v2 |
| --- | --- | --- | --- |
| toy a, e | FAIL / FAIL | FAIL | FAIL |
| toy b, c, d | PASS / PASS | PASS | PASS |
| toy f (default buffer) | WARN / WARN | FAIL | WARN |
| review: b, canvas below the fold | PASS / PASS | false FAIL | PASS |
| review: b after a 70-link nav | PASS / PASS | false FAIL (stopped at 60) | PASS (74 Tabs) |
| b with juice that ignores reduced motion | WARN / PASS | — | WARN (6 frames) / PASS |
| review: WebGL, stand-in and status, default buffer | PASS / PASS | false FAIL | PASS |
| same with `preserveDrawingBuffer` | PASS / PASS | PASS | PASS |
| WebGL, mouse only, default buffer | FAIL / FAIL | — | FAIL |
| review: animated hero, CTA link over canvas, hue on pointerdown | FAIL / FAIL (plus a motion WARN) | crash (followed the link) | FAIL; stays on the page |
| hero that follows the pointer, `aria-hidden`, still under reduce | PASS / PASS | — | PASS (hover INFO) |
| review: drag toy, listeners on the wrapper div | FAIL / FAIL | false PASS | FAIL |
| React-style synthetic handler (simulated, not React) | FAIL / FAIL | — | FAIL |
| canvas that animates by itself, with stand-in and status | PASS / PASS | — | PASS (narration is the evidence) |
| focusable game canvas, arrow keys, silent | WARN / WARN | — | WARN |
| configurator, radios beside the canvas, drag to spin | WARN / WARN | — | WARN |
| static canvas, no name | WARN / WARN | — | WARN |
| static WebGL canvas with fallback content | PASS / PASS | — | PASS |
| S2 Rive rating | FAIL / FAIL | FAIL | FAIL |
| S2 Rive semantics | FAIL / FAIL | FAIL | FAIL |
| S10 fluid demo (decorative, links over it) | FAIL / FAIL | navigated to `#` | FAIL; stays on the page |
| regress `capture-webgl` (static, fallback text) | PASS / PASS | WARN | PASS (fallback content is its text alternative) |

**Time per page.** 3–9 s for most pages. The S10 fluid demo took 21–48 s, because each SwiftShader capture there took about 1.6 s.

## Decision guidance for the skill

### G1. `SKILL.md` Phase 0, "Signature experience or supporting feature?" — extends

Add this paragraph after the existing one:

"**Propose, don't only react.** Even when the user has not asked, consider an interactive experience for a route or moment when one of these holds:

1. the visitor's result is *theirs*: a configuration, a personal answer, their own data;
2. the value is a system of cause and effect that a static page can only describe;
3. the product is itself interactive or spatial;
4. choosing *is* the product, as with configurable goods.

Then run the value test and set its interaction level within the route's ceiling (`references/interactive.md` §2–§3).

When none of the four holds, or the value test fails, build a conventional page with motion that explains. This default is a cost argument, not a finding that readers avoid interaction:
- the NYT's 2016 finding covers optional clicks, tabs and hovers that only reveal more content;
- Distill (2020) warns that the finding has hardened into an anecdote-driven rule."

### G2. NEW `references/interactive.md` — "Interactive and game-like experiences"

Read it in Phase 0 when a candidate appears, and again in Phase 3.

**§1 When interaction beats a page — decision tree**

1. Is the payoff personal (their object, answer or data)? → Build a **builder, configurator, quiz with a personal result, or recap**.
2. Is the point a system (trade-offs, time, feedback loops)? → Build an **explorable**: let them act first, reveal the rule, give full control last (Trust's sandbox comes 8th of 11).
3. Is the product itself interactive? → Offer a **playground or demo of the real product** with sample data, never a video disguised as one.
4. Is the subject spatial (angles, fit, place)? → Build a **viewer, AR or map** (`motion.md` §9).
5. Is the goal memory or sharing for a visited brand whose audience plays? → **One level-3 stage on the page**, tied to the product's own verb. A level 4 only as a route of its own (ceiling table, §3).
6. None of these? → A **conventional page** at the route's ceiling: motion that explains, nothing important behind hover (Tse rule 2).

**§2 Value-vs-gimmick test.** Write the answers in `DESIGN.md`. Any "no" in 1–3 kills the idea.

1. **Swap test.** Replace it with the best static equivalent (photo, diagram, video, table, plain list). What does the visitor lose? "The wow" is not an answer.
2. **Result test.** Does the visitor leave with something they did not have: a decision, an artefact, an understanding, a request ready to send?
3. **First-10-seconds test.** Can a first-timer perform the core verb without instructions, starting from a beautiful real default? (Andersen: tutorials do not help discoverable mechanics.)
4. **Tenth-time test.** Is it still fast for repeat users, with juice budgeted by frequency (`motion.md` §2)?
5. **Cost test.** Are all of these funded: payload, frame and idle budgets; the accessibility equivalent (G3); the content and art pipeline; device QA; maintenance? (Tse rule 3.)
6. **Evidence plan.** Name the metric for the core verb, the finish rate and the downstream conversion. Plan an A/B test against the static alternative when traffic allows. Never compare interactors with non-interactors, and never cite vendor uplift figures as a reason.

**§3 Interaction level per route and moment — a synthesis, not a validated scale**

**What the levels are.**
- No source defines a five-step scale. The levels below are this stream's synthesis of F1–F6 and E1, untested with clients.
- Their job is to name the steps of a dial the skill already has, for interaction. `categories.md`'s Motion and Novelty rows and `motion.md` §3 say how much a surface may *move* and how much novelty it may spend. The levels say how much the visitor *operates*, and what answers back.
- They are set per route and per moment (hero, explainer, configurator route, onboarding, empty state, 404), never per site.

**Relation to intensity.** The skill should call them "interaction levels", to keep them apart from `framing.md` §2's intensity:
- intensity says how much of today's site changes (refine, redesign, rethink);
- the interaction level says how much a route asks of the visitor.

The two are independent. A refine may lower an over-animated route from 3 to 2, and a rethink does not license a 4.

**Fidelity is a separate axis:** plain, illustrated or stylised, or rendered and realistic, chosen from the brand's material and the quality bar. Cake Studio showed that level 4 illustrated beat level 4 realistic.

| Level | What the visitor does, and what answers | Existing dial words it names | Typical cost (payload measured; effort [K]) | Evidence to move up |
| --- | --- | --- | --- | --- |
| 1 Functional | Native controls. The answer is a state change shown at once: checked, added, an error summary, a confirmation page. No decorative motion. | Motion "none"; Novelty "zero" or "very low" (`categories.md`) | 0 kB JS | — |
| 2 Responsive | Level 1 plus feedback motion on the visitor's own actions (100–300 ms), transitions that explain change, and confirmation moments. Nothing moves for its own sake; nothing reacts that the visitor did not touch. | Motion "only to explain change", "micro-feedback", "confirmation moments", "none except live-data updates" | CSS/WAAPI, 0–4 kB; hours to days | a state change worth explaining |
| 3 One manipulable element | One element on the page that the visitor operates and that answers with *their* result: a template that recolours, a before/after, a live preview of their choices, a scrubbable or explorable figure, a draggable object. The result is shareable in the URL. | `art-direction.md` §4 "one stage per page" ("one thing that responds"); `framing.md` §2 "novelty spent in one place"; Novelty "high, in one place" | own 2D code 5.4–9.8 kB gzip including accessibility (E1), or three.js/model-viewer at 131–297 kB; days to 2 weeks | the swap and result tests pass; "what will mine look like?" or "how does it work?" is a real question |
| 4 Playful product | A route whose core is a loop (toy, builder, studio): a coherent little world, juice as switchable layers, optional sound, verbs introduced by use, a finish worth sharing. | `categories.md` "Signature experiences"; `framing.md` §2, signature routes | an engine or custom canvas (Pixi 234 kB gzip; Howler 8 kB), an art pipeline, device QA; weeks | the user names a play reaction as the goal; a vertical slice passes the written bar; the value test passes |
| 5 Immersive world | Spatial navigation, characters, rules or goals, sound design, possibly narrative. | outside the skill's default range | engines 250 kB–1.5 MB+ (`motion.md` §9), physics, audio; months, with game skills | a campaign or product goal that only play serves, with a budget and a team |

**Ceilings — the only copy of this table.** `framing.md` and §1 point here. It refines the Motion and Novelty rows for interaction and changes one existing cell, marked below.

| Surface (`framing.md` §1) | Ceiling | Where it comes from | Exception |
| --- | --- | --- | --- |
| Public service | 1 | `categories.md`: Motion "none", Novelty "zero", "no decoration" | none. Feedback is a state (error summary, confirmation page), not motion or a reacting element. |
| Enterprise / B2B; docs prose | 1 | Motion "none"; "none in docs" | docs: a runnable example or playground of the real product (level 3) when the product is itself interactive (§1 branch 3) |
| SaaS app, dashboard, fintech, field tool; checkout, forms and account in any category | 2 | Motion "only to explain change", "none except live-data updates", "confirmation moments"; `motion.md` §2 | one expressive *motion* moment in first-run onboarding, success after a long task or an empty state (`motion.md` §3); the interaction stays at 2. A calculator inside an app is a tool (`framing.md` §1). |
| Content / editorial | 1 | Motion "none"; Novelty "medium (in typography)" | **Refines** the Motion "none" cell (`categories.md`): allow an explorable figure at level 3 when the argument is a system or the result is personal (§1 branches 1–2) and the swap and result tests pass (Trust, Polygons, the dialect quiz, Distill). The prose around it stays at 1. |
| Marketing / landing, dev-tool marketing, ecommerce browsing, mobile-first consumer | 2, plus one level-3 stage per page | `framing.md` §2; `art-direction.md` §4; Marketing "1–3 orchestrated moments"; Ecommerce "micro-feedback" | a level 4 only as a route of its own (next row) |
| Signature route (builder, configurator, studio, visualiser) | the experience 4 (5 only for a campaign or a game product with a budget and a team); chrome and controls 2 | `categories.md` "Signature experiences"; `framing.md` §2 | — |

The unit is **per page**, as in `art-direction.md` §4. A stricter "per journey" limit was considered and dropped for lack of evidence.

**Invariants at every level:**
- the task can be completed without the interaction (an equivalent);
- keyboard and screen-reader paths (G3);
- reduced motion removes juice but keeps state;
- sound off until chosen;
- a poster or still first, and a failure path;
- zero `requestAnimationFrame` at rest;
- no dark patterns;
- content visible without JS.

**§4 Kinds of interactive experience**

| Kind | Job | What makes it work | Typical failure | Examples |
| --- | --- | --- | --- | --- |
| Configurator | remove ambiguity; show *their* product | one evolving picture, options as pictures, honest price, save/share URL | stepper with a thumbnail; options that do not change the picture | Nike By You, Porsche [K]; Audi 3D [S] |
| Studio / builder | the user makes an artefact | direct manipulation, a coherent world, immediate feedback, undo, a finish moment | pro-tool chrome; empty canvas; realism without character | Cake Studio [V lessons]; Chrome Music Lab [V repo] |
| Showroom / viewer | inspect an object | poster, orbit and zoom, AR, facts in text | slow, traps the scroll | Rebecca Minkoff 3D/AR [S]; `<model-viewer>` [K] |
| Interactive story / scrollytelling | carry an argument with visuals | position-mapped scroll, the finished state as fallback | scroll-jacking, hidden text | NYT "Snow Fall" [K]; Apple product pages [K] |
| Browser game / advergame | memory, time with the brand | a 30–90 s loop tied to the product's verb, a shareable result | an unrelated game with a logo | Google Doodle games, Chrome Dino [K]; Messenger (Awwwards Dev SOTY 2025) [S] |
| Explorable | understand a system | act first, then the rule, full control last | sandbox first | Trust, Parable of the Polygons [V]; Distill [V] |
| Product demo / playground | try before signing up | the real product, sample data, a guided first action | a video pretending to be a demo | Navattic data [S]; Stripe docs with live keys [K] |
| Immersive landing page | a brand impression | one stage, poster-first LCP, content in the DOM | loader, scroll hijack, LCP > 2.5 s | Awwwards SOTY 2025 F1 driver site [S] |
| Spatial / 3D navigation | explore a place or collection spatially | only when the domain is spatial | 3D navigation for flat content | Bruno Simon folio [V repo: 0 ARIA] |
| Interactive map | where | map and list parity, keyboard, clustering | content only on the map | NYT dialect quiz map [S] |
| Portfolio | show craft | the work reachable in one click beside the toy | a game that gates the work | folio-2019 [V] |
| Game-like onboarding | learn by doing | first action in seconds, a checklist of real tasks, one verb at a time | tour overlays, fake points | A Dark Room [V]; Andersen [S] |
| Interactive ecommerce | choose | a quiz with a transparent result, try-on, shade finder | a quiz as a lead-capture gate | Warby Parker, Sephora [K] |
| Personal recap | a result about me, to share | data the user recognises, a finish card | generic stats | NYT dialect quiz [S]; Spotify Wrapped [K] |

**§5 Interaction-loop template.** Also a block, "The interaction loop", in `templates/PRODUCT.md`. Fill it for the candidate and for two references.

| Row | Answer |
| --- | --- |
| Promise | what the visitor gets that a page cannot give |
| Core verbs (≤ 3) | e.g. pick, place, recolour |
| Loop | action → feedback (≤ 100 ms) → visible state that is theirs → a reason to act again |
| Default | the beautiful real starting state (never empty) |
| First 10 seconds | what is seen; the first action without instructions |
| Affordances and discoverability | signifiers; nothing important on hover only |
| Progression | which verb is introduced when, unlocked by use (kishōtenketsu for a sequence) |
| Reward | the artefact or the understanding; extrinsic rewards only if honest |
| Feedback channels | visual · motion · text or narration · sound · haptic, each with its fallback |
| Responsiveness | INP ≤ 200 ms, feedback ≤ 100 ms, 60 fps on the phone profile |
| Loading | poster; what is playable first; what loads late |
| Performance | JS and asset budget, frame budget, 0 `requestAnimationFrame` at rest |
| Mobile | thumb reach; a tap alternative for every gesture; hit areas ≥ 44 px on coarse pointers; orientation |
| Accessibility | stand-ins, equivalent, narration, reduced motion, captions (G3) |
| Failure and fallback | no WebGL, low memory, JS error, offline |
| Finish and hand-off | the artefact saved in the URL; handed into a request, order or signup |
| Measure | core-verb rate, finish rate, downstream conversion, against static |

Example row, 2048 [V]:
- one verb (slide);
- feedback: a 100 ms move, a 200 ms pop and a 600 ms score float;
- the reward is the merged number;
- 12 keys plus swipe;
- no narration, and nothing for reduced motion.

**§6 Game-UI rules that transfer to web products**

1. **The screen always answers three questions** (Hodent): what can I do, what just happened, what next.
2. **HUD.** Keep non-diegetic chrome minimal. Put state on the object where possible (a label on the cake, not a panel), without covering the object or moving the canvas (`ui-ux.md` §7b).
3. **Palettes and inventories.** Items are drawn as the thing and named. Show counts where supply is finite. A disabled item says why. The palette is an APG toolbar: one Tab stop, then arrows.
4. **Customisation screens:**
   - one evolving preview;
   - undo;
   - "surprise me" or templates;
   - compare and before/after;
   - save slots = shareable URLs.
5. **Radial menus** only for pointer or gamepad contexts with ≤ 8 options, always with a linear equivalent. Never the web default.
6. **Progress shows real progress.** A head start is legitimate only if the progress is real. Endowed progress works, so it can be abused.
7. **Tooltips teach nothing that matters.** Hover goes unseen and does not exist on touch (Tse), so teach in context at the moment of need.
8. **Contextual controls** appear beside the selection. The same actions also live in a persistent place for keyboard users.
9. **Drag and drop:** a ghost, snapping, valid drop zones, cancel on Esc or on a drop outside, plus tap and keyboard equivalents (`ui-ux.md` §7b, E1).
10. **Object manipulation.** Hit areas and handles are at least 24 px, and 44 px on coarse pointers, measured at the rendered size (G3 rule 2). Offer numeric or step entry as the alternative.
11. **Hover, selection and focus** are three different visual states. Show hover only under `(hover: hover)`.
12. **Juice** is layers over a working base, each switchable (Juicy Breakout), within 100–300 ms per action (2048). Input never waits.
    - Under reduced motion, remove shake, particles, flashes and squash; keep the state change.
    - Spend it on meaningful events, not on every hover.
13. **Onboarding by doing:**
    - start with **one** verb (A Dark Room: 1 control at the start, 5 by minute 5, 10 by minute 40 in the seeded play);
    - show progress in the world's own terms (its places rename themselves, from "A Silent Forest" to "A Modest Village"), not only as a bar;
    - bring in a new verb only once the previous one has been used;
    - give a tutorial only for mechanics that cannot be discovered;
    - give full control last.
14. **Rewards reward the user's goal, not engagement.**
    - No streak pressure, variable rewards, loot boxes, fake scarcity or confirmshaming.
    - These are dark patterns (`ui-ux.md` §10) and targets of the EU Digital Fairness Act.
15. **Input parity:**
    - every action works by pointer, touch and keyboard, and can be named by voice;
    - 2048 gives 12 keys plus swipe for 4 verbs;
    - commerce makes no timing or dexterity demands.
16. **Save and resume.** State survives a reload and is shareable. A Dark Room autosaves to `localStorage`; see also `anti-patterns.md` "Back loses the choice".
17. **Exits.** No traps. Esc closes. A visible way back to the site lands where the user left.

**§7 Sound and haptics** (from F6)

- **Off until chosen,** with a visible, labelled toggle (`aria-pressed`) whose state is remembered.
  - Ask once, in the product's voice (as A Dark Room does), or offer the toggle at the first interaction.
  - Create the `AudioContext` inside the gesture that turns sound on.
  - Go silent while the tab is hidden.
- **Every sound duplicates a visual and a text outcome.**
  - Speech or meaningful audio gets captions.
  - Audio over 3 s gets its own control (WCAG 1.4.2).
  - Music and effects get separate volumes when both exist (GAG).
- **Payload.**
  - Blips: synthesised Web Audio (0.5 kB) or ZzFX (1 kB).
  - Real samples: Howler core (8 kB).
  - Never Tone.js for UI sounds (61–83 kB).
- **iOS.** Keep the default ambient session, which respects the silent switch. Do not set `playback` for UI sounds.
- **Haptics.**
  - Only `navigator.vibrate`, on Chromium Android, after a gesture: progressive enhancement, never the only feedback.
  - Ship no iOS `switch` hacks.
  - Treat reduced motion as a proxy for "less stimulation".
- **Sound identity.** One to three sounds drawn from the brand's material: a bakery's soft pop, not a casino chime. Most productive surfaces get none.

**§8 Delight, novelty, friction; brand through interaction**

- **Delight** helps the goal and survives the tenth use.
- **Novelty** wears off with repetition, so it is budgeted by frequency.
- **Friction** is deliberate, and only on high-stakes steps.
- **Brand in interaction:**
  - a motion personality (spring constants per brand, `motion.md`);
  - microcopy in the world's voice;
  - one signature verb that feels unique (piping icing, not "add item");
  - shapes and icons drawn in the world's style;
  - density set by the task.
- **The world must be coherent before it is rich.** A consistent illustrated style with immediate feedback beats inconsistent realism (Cake Studio).

### G3. `accessibility.md` — NEW §9b "Canvas, WebGL and game-like interaction" (the contract)

Also add one row to the §2 decision table: "Canvas or game interaction: hit areas, stand-ins, equivalent, narration, sound default (§9b)."

1. **One model, two views.** The canvas and a DOM view read and change one state model through the same commands.
2. **Pointer targets (WCAG 2.5.8; §2 Targets).**
   - Each object's hit area on the canvas is at least 24 × 24 CSS px, and 44 × 44 on coarse pointers, at the rendered size.
   - Set the hit radius in CSS px, not in canvas units. A canvas scaled to a phone shrinks canvas units: E1 went from 56 to 40 px at 390 px until the radius was set in CSS px.
   - Do not hit-test the drawn shape of thin objects. Pixi's default does, which makes the candle grabbable across 11 px, and 8 px at 390 px.
3. **Stand-ins.**
   - A real `<button>` (or APG widget) per palette entry and per object.
   - **Present from load**: never created on Tab, never removed on mouse movement.
   - Positioned over the object, at most about 10 px off.
   - Named from the model and **renamed on every change**.
   - Its box **covers at least the object's hit area and carries the focus ring**. The box is what focus shows, and what a screen reader's explore-by-touch finds [K].
   - When the canvas owns dragging, stand-ins take `pointer-events: none`, and rule 2 is the target-size rule.
   - Stand-ins that do take the pointer (Pixi's, through `accessiblePointerEvents: 'auto'`) are targets themselves and must meet rule 2.
   - Move them with `transform` only, and write their size only when it changes. An intermediate version that also wrote the size and read the canvas width with every move cost 4.0 ms style recalc per frame at 200 objects in one run, against 1.3–2.2 ms.
4. **Keyboard verbs.** Enter adds or selects. Arrows move; Shift moves further. Delete removes and moves focus to the next item, or else to the palette. Esc cancels. The palette is a toolbar with roving tabindex.
5. **Narration.**
   - One `role="status"` present at load. Or use `element.ariaNotify()` where supported, with the status region as fallback.
   - Announce outcomes ("Candle 1 added near the top left. 2 toppings on the cake."), not frames.
   - Announce a zone change at once, and the resting position once, after about 700 ms.
6. **An equivalent.** A form or list that completes every task, in the page or one click away. A canvas that is only a picture is `role="img"`, named by the model's summary, or has fallback content.
7. **Single-pointer alternatives to every drag** (WCAG 2.5.7): tap to arm, tap to place, with a visible hint.
8. **Motion.** Juice off under reduced motion; render on demand; 0 `requestAnimationFrame` at rest. A canvas that animates by itself stops within 5 s or gets a pause control (2.2.2).
9. **Sound:** as in G2 §7.
10. **Colour.**
    - Put non-colour cues on the canvas: shape, label, pattern.
    - Forced colours do not repaint canvas pixels, so the stand-ins and the list must carry the boundaries.
    - `a11y.mjs` WARNs that borderless stand-ins lose their shape in forced colours [L]. A transparent border fixes that [K].
11. **Never trust an engine flag; verify in the render.** Pixi 8.21.0's layer failed five ways:
    - it never activated on desktop by default;
    - it vanished on mouse movement;
    - its names went stale;
    - it was offset by the canvas's page position;
    - its 12 px stand-ins take the pointer.

**Verification:**
- a keyboard walkthrough of the top tasks;
- the accessibility tree after a move (do names follow?);
- the canvas probe as a gate (G10a);
- hit areas measured at 390 px with a coarse pointer;
- a touch tap and a touch drag;
- stand-in alignment.

axe passing proves nothing here: it reported 0 violations on the unusable builds.

### G4. `motion.md` §9 checklist, "Accessibility" line — replaces

"`alt` on model-viewer; a canvas that only shows something is `role="img"` + `aria-label` from the model (or has fallback content); a canvas people operate follows `accessibility.md` §9b (hit areas, stand-ins, an equivalent, narration) — `role="img"` alone leaves it unusable by keyboard and screen reader."

Add: "An engine's ticker runs at rest by default (Pixi measured 16–72 `requestAnimationFrame` calls per second idle, depending on load): stop it and render on change."

### G5. `categories.md` — extends

- **"Signature experiences" › Good:** "fidelity is chosen, not maximised: a coherent illustrated or stylised world with feedback under 100 ms often beats realistic 3D (Cake Studio); technology follows the look, and Canvas 2D, SVG or DOM carry most 2D builders at a few kB."
- **"Signature experiences" › Typical failures:** "an engine's accessibility flag trusted untested; hit areas defined in canvas units; sound on by default; a portfolio or site whose content is reachable only by playing."
- **"The dials", Motion row, Content / editorial cell — refines** "none" to "none as decoration; an explorable that carries the argument (`interactive.md` §3)". No other cell changes; the interaction ceilings live only in `interactive.md` §3.

### G6. `framing.md` — extends

- **§1:** "For each route also record its **interaction ceiling** from `interactive.md` §3 beside its posture." This points to the table; it does not copy numbers.
- **§2:** add one sentence after the intensity table: "Intensity (how much changes) and interaction level (how much the visitor operates, `interactive.md` §3) are independent."
- **§6 brief:** add "**Interactive moments:** each with its level, fidelity, value-test answers and evidence plan (`interactive.md`)".

### G7. `discovery.md` §5b — extends

- **Step 2:** research each reference by filling the interaction-loop template, not by collecting screenshots.
- **Step 4:** the vertical slice proves *feel* first (feedback under 100 ms, a coherent world, a real default), and fidelity after.
- **New step:** "When the slice is technically good but lacks character, try a second attempt in a different *style*, not more fidelity (§5c)."

### G8. `anti-patterns.md` — NEW section "Interactive and game-like tells"

- interaction that only reveals content a page could show: steppers, tabs or sliders "to see more stuff";
- information in hover only;
- a tutorial overlay before the first action;
- sound on by default;
- juice that ignores reduced motion;
- a loader before any content;
- a game unrelated to the product's verb;
- a portfolio behind a game;
- points, badges or streaks for engagement;
- an engine accessibility flag as the accessibility plan;
- canvas stand-ins created on Tab;
- hit areas that shrink below 44 px on a phone;
- vendor conversion statistics as justification.

### G9. `templates/PRODUCT.md` and `templates/DESIGN.md` — extends

- **`PRODUCT.md`:** add "The interaction loop" (G2 §5) under "The configurable thing".
- **`DESIGN.md`:**
  - Brief: one line per interactive moment giving its level and fidelity.
  - Accessibility block: add "**Canvas or game interaction:** hit areas at 390 px, stand-ins, equivalent, narration, sound default, engine checks".
  - Motion block: add "**Juice layers** and their reduced-motion state".

### G10. Scripts — proposals only (the brief named no new skill scripts)

**(a) Promote `lib/probe-canvas.mjs` v2 to `scripts/canvas.mjs`.** Copy `run-probe.mjs`'s 21 lab pages into `tools/regress/fixtures` with their expected verdicts as the regress checks.
- **Usage:** `node scripts/canvas.mjs <url> [--reduce] [--viewport WxH]`. It exits 1 on FAIL. Run it once with `--reduce` and once without.
- **Validation:** 50/50 runs agree with the expected verdicts on 25 pages (E4).
- **Limits to write into its header:**
  - It is a gate, not a task walkthrough: PASS means one narrated keyboard path exists.
  - It cannot tell decorative pointer effects from functional ones. Those FAIL with an instruction to record the exemption.
  - Listeners only on body, document or window give a WARN.
  - On a canvas that animates by itself, only narration or control state counts as evidence.
  - The idle `requestAnimationFrame` count misses loops that captured `requestAnimationFrame` before the probe wrapped it. The S10 fluid demo read 2–5 per second while animating.
  - React detection has been tested only on a simulation.
  - It does not find canvases inside shadow roots or iframes. It covers one viewport and does not model screen-reader browse mode.
  - It presses keys, so run it on staging or a fixture. Main-frame navigations are aborted, but in-page state changes.
  - WebGL checks depend on compositor captures, which are slow on heavy pages under SwiftShader (about 1.6 s each on the fluid demo).

**(b) Fix the false FAILs in `a11y.mjs`:**
- In the 2.4.11 obscured-focus check, set `pointer-events: auto` on the focused element and its ancestors before `elementFromPoint`.
- Downgrade "Clickable canvas not focusable" to WARN when Tab stops lie inside the canvas box, and point to the canvas probe.

### G11. `research.md` "Choose references by problem" — extends

Sources for game-like problems:
- the Game UI Database, with screens by type such as inventory, customisation and HUD [K];
- the Game Accessibility Guidelines and the Xbox Accessibility Guidelines [S];
- open-source games read for sequencing (`fetch-sources.sh`).

## Rejected ideas and why

- **A single site-wide 1–5 dial.** Categories and frequency already vary per route and moment, and a site at level 4 everywhere is the scroll-jacked landing page Tse abandoned. Replaced by per-moment interaction levels, with one ceiling table and a separate fidelity axis.
- **A per-journey limit on moments above level 2.** It is stricter than `art-direction.md` §4's "one stage per page", and no evidence supports it.
- **"Readers just want to scroll" as the default rule.** It is a 2016 newsroom finding about optional reveal-more interactions. Distill documents how it hardened into an anecdote-driven rule. The four conditions and the value test are the gate.
- **Treating realism as the premium default.** Cake Studio's realistic 3D lost to an illustrated world. Fidelity is chosen from the brand.
- **`role="img"` + `aria-label` as the answer for a canvas people operate** (the current `motion.md` §9 line). It is right for pictures and leaves an operable canvas unusable (build a: 0/3 tasks).
- **Engine accessibility systems as the solution.** Pixi 8.21.0 failed as measured in F3, and Phaser has none. An engine may help, but only a verified contract counts.
- **Stand-ins created on first Tab.** Screen-reader browse-mode and voice users never press Tab first.
- **Stand-in size as the target-size rule.** When stand-ins ignore the pointer, the canvas hit area is the target. The rule is split in two (G3 rules 2–3).
- **Rule engines as proof.** axe reported 0 violations on every build, including the unusable ones.
- **Promoting the v1 probe.** It gave false results on WebGL with the default buffer, on canvases below the fold, on long Tab orders and on wrapper listeners, and it crashed on a link. v2 replaces it (E4).
- **Gamification layers** (points, badges, streaks) to lift engagement on websites. The evidence depends on context (Hamari 2014), and they conflict with `ui-ux.md` §10 and the coming EU Digital Fairness Act.
- **Tutorial tours for simple mechanics.** They do not help with discoverable mechanics (Andersen, CHI 2012).
- **Tone.js or audio files for UI blips.** 61–83 kB, or 11.5 kB per uncompressed click, when 0.5–1 kB of synthesis does it.
- **Vibration, or the iOS `switch` hack, as a feedback channel.** Vibration reaches Chromium Android only; the hack is non-standard and reportedly patched.
- **The Fullscreen API for a signature shell.** It is iPad-only on iOS and exits on a swipe.
- **Vendor conversion figures (94%, 44%, 66%) in decision guidance.** They are self-selected or unpublished.

## Open questions and limits of this evidence

- **No real assistive technology was run.** Coverage comes from Chromium's accessibility tree and a log of live-region mutations. Untested:
  - NVDA, VoiceOver and TalkBack behaviour (browse mode on stand-ins, verbosity);
  - explore-by-touch on stand-in boxes;
  - `ariaNotify` on macOS.
- **The lab machine is not a device.** Headless Chromium used SwiftShader on a shared, loaded machine.
  - Idle `requestAnimationFrame` rates, style-recalc costs and capture times are comparative, not device numbers.
  - The Pixi idle rate ranged 16–72 per second across runs.
- **Hit targets were measured in emulation.** Measured by synthetic drags in Chromium, not with fingers. The method reads up to 2 px low.
- **The Pixi findings are version-specific (8.21.0).** The Tab-activation fix exists only on `main`. Re-check the offset and the stale names on the next release.
- **The probe's limits are listed in G10(a).** The largest gap: it cannot judge whether a pointer effect is decorative.
- **The A Dark Room pacing is a seeded greedy bot's.** Later unlocks vary by more than 15 simulated minutes between unseeded runs, and humans read and hesitate. What transfers is the one-verb start, the order of introduction and the renaming of places.
- **No public A/B test compares a game-like builder with a static alternative.** Every conversion figure found is vendor-reported or self-selected.
- **The interaction levels and the ceiling table are a synthesis,** not tested with clients. They need a check against real briefs before they become rules.
- **Only payloads were measured.** The effort estimates per level are [K].
- **iOS haptics, the audio-session behaviour and the 26.5 patch come from search snippets only.**

## Changes after review

**1. (Blocking) The probe was not ready to promote.** Rewritten as `lib/probe-canvas.mjs` v2, and validated by a new runner part, `run-probe.mjs`: 25 pages × 2 motion settings, 50/50 agreement, 0 crashes, 0 navigations. Each defect the reviewer named, and what changed:
- **Blank `toDataURL` on WebGL.** Pixels now come from CDP captures clipped to the canvas's current box. A keyboard-operable WebGL page with the default buffer now PASSes, and a mouse-only one FAILs.
- **Stale canvas box.** Both rects are read in the same evaluation. The below-the-fold page now PASSes.
- **Fixed 60-stop Tab walk.** The walk now runs until an element repeats. The 70-link page PASSes after 74 Tabs.
- **Keys pressed on links.** Keys are now pressed only on widgets, and main-frame navigations are aborted. The animated-hero page no longer crashes and the S10 demo no longer navigates.
- **Listeners on the canvas only.** Now counted on same-size wrappers and in React props too. The wrapper-listener toy FAILs; body/document/window listeners are reported separately. I also found that Playwright injects its own window listeners after its first element action, and filtered them out.
- **No baseline for self-animating canvases.** There is now a no-input baseline. A canvas that animates by itself must show narration or a control-state change.
- **Undisclosed drawing buffer.** e and f now use the default drawing buffer except in the frame count (`?pdb=1`), and F3 says so.
- **Fallback content.** One disagreement with the review's expectation: static canvases with fallback content now PASS instead of WARN, because per the HTML spec the fallback content is the canvas's text alternative. This changes `capture-webgl` from WARN to PASS.
- **f's verdict.** It moved from FAIL to WARN, for a stated reason: v2 finds Pixi's displaced buttons beside the canvas, and Enter on them adds a topping silently.
- G10(a) now lists the probe's limits and proposes promotion together with the validation fixtures.

**2. McKenna was misread.**
- F1 now reports McKenna as preference for step or scroll over static articles, with no significant engagement difference *between step and scroll*.
- F1 also adds Distill's caveat ("solidified as a rule-of-thumb … suboptimal presentation … due to this anecdote"), the Conlen et al. citation behind "core part of the article's message", and the footnote on large effect sizes for transfer learning.
- G1 no longer uses "readers just want to scroll" as the rule. It labels the default as a 2016 news-graphics finding and a cost argument, and keeps the four conditions plus the value test as the gate.

**3. Three inconsistent ceilings.**
- There is now one ceiling table, in `interactive.md` §3. G2 §1 and G6 point to it; the numbers G6 used to repeat are gone.
- Public service is capped at 1, citing `categories.md` ("Motion none, Novelty zero, no decoration").
- Content is capped at 1, with an explicit level-3 explorable exception when the swap and result tests pass. This refines `categories.md`'s Content Motion cell, and G5 says so.
- Level 2 no longer contains a reacting element; the template that recolours and the before/after moved to level 3, which removes the conflict with public service.
- The report now also notes that `categories.md` already sets Enterprise and docs to Motion "none".

**4. The five-level scale was presented as research-backed.**
- §3 is now labelled "a synthesis, not a validated scale", and says no source defines five levels.
- The levels are defined as the vocabulary for the existing Motion/Novelty dial, per route and moment. The "Existing dial words it names" column shows which lines each level names.
- The scale is renamed "interaction level", with a stated relation to `framing.md` §2's intensity: the two are independent.
- The rule now counts per page, as `art-direction.md` §4 does. The per-journey version was dropped and is listed under rejected ideas.

**5. Stand-in size was conflated with pointer target size.**
- G3 is split into rule 2 (canvas hit areas: 24 px, or 44 px on coarse pointers, at the rendered size) and rule 3 (the stand-in box covers the hit area and carries the focus ring). "Not scaled down with the canvas" is gone.
- The runner now measures hit areas by binary-searched drags, and records whether each stand-in takes the pointer.
- The toy is fixed:
  - hit radius set in CSS px (22 on coarse pointers);
  - stand-ins sized to the hit area;
  - `?hit=legacy` keeps the first version measurable. Its phone hit area was 40 px, below the skill's 44 px rule, with 33 px stand-ins.
- The Pixi criticism is restated with evidence. Its 12 / 9 px stand-ins do take the pointer (`accessiblePointerEvents: "auto"` [V]), and its canvas hit test is the drawn shape (candle 11 / 8 px [L]).
- One mistake of my own was caught along the way. The first version of the fix wrote the stand-in's size every frame and read layout once per stand-in, which pushed the cost to 4.0 ms at 200 objects. It was fixed, the benchmark re-run is back at 1.34–1.41 ms, and G3 now carries that caution.

**Timings.**
- Idle `requestAnimationFrame` is now reported as a range over six runs, including the reviewer's: e 16–72, f 24–66. f's 66 comes from the reviewer's run, so the old "24–48" was too narrow.
- Stand-in style recalc now spans five runs: 0.14–0.21, 0.39–0.59 and 1.34–2.23 ms.

**Newly found while re-measuring: A Dark Room was not reproducible.**
- The unseeded play diverged between runs. After review, trap first appeared at 4 min instead of 3.5, and there was no trading post by 40 min.
- `run-sources.mjs` now seeds `Math.random`. Two seeded 10-minute plays were identical, and F4, E3 and G2 §6 use the seeded numbers.
- The reviewer's 10-minute match with the first report was therefore partly luck, and the old later figures (lodge 15.5, trading post 37, "A Tiny Village" at 37) are replaced.

**Costs.** Own-code sizes changed slightly with the fixes (a 5.4, b 8.8, c 6.9, d 9.8, e 4.3, f 4.4 kB gzip, decimal). The table now states its units.

The final `node run.mjs` exited 0 for all four parts. Results are in `results.json` and `results/{toy,audio,sources,probe}.json` in the experiment folder. Main new or changed files there: `lib/probe-canvas.mjs`, `run-probe.mjs`, `probe-fixtures/`, `run-toy.mjs`, `run-sources.mjs`, `run.mjs`, `toy/canvas-view.js`, `toy/proxy-layer.js`, `toy/pixi-view.js`, `lib/serve.mjs`.
