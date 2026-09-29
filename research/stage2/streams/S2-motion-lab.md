<!-- Stream S2, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S2-motion-lab/. The skeptical review is in S2-motion-lab.review.json. -->

# S2: Animation libraries in depth, Rive/Lottie, and making approved motion survive implementation

## What the skill already knew

`motion.md` (stage-1 stream F) already covers:
- what motion is for, the "should this move?" gates, and productive/expressive tokens, including `linear()` springs;
- `@starting-style`, the View Transition reduced-motion guard and the scroll-reveal range rule;
- a reduced-motion substitute table ("spinners and progress: keep");
- library sizes and reduced-motion defaults read from source, GSAP's "no charge" licence, and the Rive/dotLottie WASM sizes;
- "nothing runs at rest", but for 3D only.

`DESIGN.md` asks for one prose line per animation. `audit.mjs` flags `transition: all` by regex and content hidden under reduce. `a11y.mjs` flags infinite animations.

Nothing measured the following, and all of it is new here:
- what happens when an animation is interrupted mid-flight;
- whether motion keeps playing while the main thread is blocked;
- which library features keep `requestAnimationFrame` running when nothing moves;
- what Rive and Lottie cost at runtime and what they expose to assistive technology;
- whether an animation the plan promised exists in the build and looks right.

## Findings

Tags: [V] verified this session from a primary source, [L] measured in the lab, [S] search snippet, [K] prior knowledge not re-verified.

Setup: Chromium 141 headless, 4 CPUs shared with other agents (load average 9–18). Versions [V package.json]: motion 13.4.4, gsap 3.15.0, animejs 4.5.0, @react-spring/web 10.1.2, auto-animate 0.10.0, @theatre/core 0.7.2, react 19.3.0. For the interruption test every duration plays 4× slower.

Where a variant was measured in two sessions (5 runs, then 7 runs after review), the counts are pooled. The reviewer's independent reruns are cited as "reviewer".

### A. The same seven interactions in eight tools

**A1. Interruption: does it reverse from the value on screen, or jump?** [L results.a.interrupt]

| Tool | press | list (FLIP) | sheet | view swap | ticker | grid |
| --- | --- | --- | --- | --- | --- | --- |
| CSS transitions + WAAPI | continuous 11/12 | continuous 12/12 | continuous 12/12 | **input swallowed 12/12** (View Transition) | continuous 12/12 | continuous 12/12 |
| Motion vanilla (x/y/scale) | continuous | continuous | continuous | **swallowed 5/5**, and it **only crossfades** (A9) | continuous | continuous |
| Motion vanilla, transform strings | continuous* | continuous 12/12 | **jumps to the old target 10/12** (reviewer 3/3) | | | |
| Motion for React | continuous | continuous | continuous | continuous (AnimatePresence) | continuous | continuous |
| GSAP (`overwrite`) | continuous | continuous (Flip) | continuous | continuous | continuous | continuous |
| anime.js v4 | continuous | continuous (`createLayout`) | continuous | continuous | continuous | continuous |
| React Spring | continuous | continuous | continuous | continuous | continuous | continuous |
| AutoAnimate | – | continuous 11/12 (reviewer 3/3) | continuous (fade + scale) | – | – | **jumps 12/12** |
| Theatre.js | – | – | – | – | – | continuous |

**A View Transition cannot be interrupted** [L].
- Chromium sends clicks to `<html>` for the whole transition (12/12 runs).
- Clicks reach the page only with `:root { view-transition-name: none }` **and** `::view-transition { pointer-events: none }`.
- Even then, a second `startViewTransition` finishes the running one first, so the view jumps **25.6%** of its range (12/12 runs; reviewer 24.4%).
- React `<ViewTransition>` and the root-uncaptured list used the default 250 ms, which ends before the second click, so neither is a real interruption test.

**Motion transform strings** [L a/repro-motion-transform.mjs; reviewer reproduced]:
- Without a from-keyframe they start at `scale(0)`: 0.03 at 50 ms, against 0.972 with the `scale` shorthand. This is the `*` in the table.
- Interrupted, they snap from 55.7 px to 5.5 px within two frames.

**Spring momentum.** Springs carry momentum for 1–2 frames after the interruption. That is correct behaviour, not a jump.

**A2. Main thread** [L results.a.compositor, .cost, .costOrder]

The sheet slide was started, then the main thread was blocked for 400 ms. How far it kept moving:

| Tool | Movement |
| --- | --- |
| CSS | **223 px** (median of 7, range 179–270; first session 224) |
| Motion transform strings | **185 px** (median of 7, range 33–218; first session 224, reviewer 194) |
| Motion shorthands (vanilla and React), GSAP, anime.js, React Spring, AutoAnimate | 0 px in every run |

Both transform paths survive a blocked main thread; the distance depends on load.

Script time for the whole set at 4× CPU throttle, in **7 interleaved rounds** (every round runs every tool once):

| Tool | Median ms | Range |
| --- | ---: | --- |
| CSS | 8.4 | 5.8–11.2 |
| AutoAnimate (3 of 7 interactions) | 17.5 | 13.5–109 |
| Theatre (grid only) | 91 | 81–149 |
| anime.js | 132 | 93–210 |
| Motion vanilla | 136 | 109–162 |
| GSAP | 152 | 98–447 |
| Motion for React | 220 | 171–306 |
| React Spring | 353 | 273–631 |

- **Stable orderings:** CSS below every JS library in 7/7 rounds, Motion below Motion for React in 7/7, and Motion for React below React Spring in 7/7.
- **Not rankable:** GSAP vs Motion held in only 3/7 rounds, and anime.js vs Motion in 3/7.

**A3. `requestAnimationFrame` still firing at rest**

Whole set [L cost.restRafPerS]:
- 0: CSS, Motion for React, AutoAnimate;
- 54–59: Motion vanilla, anime.js, React Spring, Theatre;
- 97.5: GSAP (first session 103.5, reviewer 97).

Single-feature probes (a/rest-probes.mjs, callbacks per second after the last animation) [L; reviewer reproduced 18/18 and found the loops still running at 12 s and 30 s]:

| Feature | rAF/s at rest |
| --- | --- |
| GSAP ScrollTrigger registered, with or without triggers | 73 |
| Motion `scroll(animate(el, { scaleX }))` | 58.5 |
| anime.js `onScroll` | 56.5 |
| React Spring `useScroll` | 59 |
| Motion `scroll()` with a transform string, Motion `scroll(callback)`, Motion for React `useScroll` | 0 |
| Finished tweens in every library | 0 |

**A4. Reduced motion, out of the box** [L]
- Every tool animated everything under `reduce`, except AutoAnimate, which goes instant with no substitute.
- Motion for React with `<MotionConfig reducedMotion="user">` keeps opacity and makes positional values instant. It also kills `whileTap`: 0 intermediate frames, against 13–14 with `transition={{ reduceMotion: false }}` [L repro; V motion-dom `visual-element-target.mjs`].
- Lines of guard code I had to add: CSS 9, Motion 6, GSAP 6, anime.js 6, React Spring 5, Motion for React 3, Theatre 1.

**A5. Bundle size and lines of code for the whole set** [L results.a.sizes; esbuild, minified, gzip -9]

| Tool | JS gzip | Lines of code |
| --- | --- | ---: |
| CSS + WAAPI | **1.2 KB + 0.8 KB CSS** | 76 (after the ticker fix, A8) |
| AutoAnimate | 3.5 KB | 22 |
| React Spring | 21.2 KB | 56 |
| Motion vanilla | 27.7 KB | 61 |
| anime.js | 29.2 KB | 57 |
| Theatre (one sequence) | 35.3 KB | 24 |
| Motion for React | 51.4 KB | 51 |
| GSAP + Flip + ScrollTrigger + CustomEase | 57.0 KB | 64 |

**A6. How each tool expresses intent** [V source]
- **CSS** uses the tokens directly.
- **Motion** takes seconds and bezier arrays.
- **GSAP** takes seconds, and a bezier needs CustomEase path syntax; no `cubic-bezier()` parser.
- **anime.js** takes milliseconds and `cubicBezier()`.
- **React Spring** has no duration tokens; springs have no duration. The productive spring on the list read as 384–511 ms against a 240 ms token in one run and passed in another, so that row is excluded from scoring.
- **AutoAnimate** allows one duration and one easing per parent.
- **Theatre** keeps intent in a Studio JSON file.

**A7. GSAP licence** [V; S gsap.com/community/standard-license]
- The npm package has no LICENSE file. Its `license` field reads "Standard 'no charge' license".
- The README says it is free including all plugins, for commercial use.
- Barred in no-code visual animation tools that compete with Webflow.

**A8. The number people see: a CSS `counter()` trap.** The lab itself fell into it (new).
- For a full session my CSS ticker showed **"01000"**. The `<output>` kept its static "0" and `::after` appended `counter(n)`.
- Nothing I had built caught it:
  - the Part A harness read `--n`;
  - motion.mjs read textContent and `--n`;
  - the accessibility tree read `status "1000": "0"` because of an `aria-label` [L; the reviewer's screenshot].
- `counter()` output exists only in the layout tree of the pseudo-element, not in `textContent` [L DOMSnapshot]. It cannot be selected, found or translated, and it is integer-only with no grouping [K].
- The pattern that works [L results.a.single.css.ticker]:
  - count with `.counting::after { content: counter(n) / "" }` (empty alt text, so assistive technology skips it);
  - empty the DOM text while counting;
  - write the final value as DOM text on `transitionend`, or at once when nothing transitions (under reduce).
  - Result: seen "1000", DOM "1000", tree `status: "1000"` in normal, reduce and guarded runs.
- motion.mjs confirmed seen = DOM text at rest for all six tools' tickers (12/12 runs).

**A9. Motion's `animateView()` silently drops `x`/`y`** (new).
- The source says the view path "hands keyframes straight to WAAPI, so Motion's `x`/`y` shorthands … have no effect. Warn and skip — use `transform`" [V motion-dom 13.4.4 `dist/es/view/start.mjs`].
- The pseudo-elements get only opacity keyframes [L a/probe-motion-view.mjs].
- So the lab's own Motion view only crossfaded, and nobody noticed by eye. Both independent samplers and motion.mjs ("spec'd properties that did not change: transform") caught it.
- It is a console warning, not an error: the "plan says slide, build ships a fade" failure.

### B. Rive vs Lottie vs animated SVG/CSS for one stateful toggle (not re-run; the reviewer reproduced rest-b 7/7 and the WASM sizes)

Samples came from pinned commits of MIT repositories [V LICENSE]: rive-wasm and rive-react `.riv` files, dotlottie-web `sm/toggle.lottie` and `hamster.lottie`. The CSS/SVG version and a 31-frame WebP sprite were built here.

| Runtime | Total gz | First frame (4× CPU) | Main thread while toggling (ms/s) | rAF/s at rest |
| --- | ---: | ---: | ---: | ---: |
| Native `<button role=switch>` + SVG/CSS | **0.2 KB** | **98 ms** | 80 | 0 |
| Sprite (`steps()`) | 49.7 KB | 131 ms | 81 | 0 |
| lottie-web light (SVG) | 50.5 KB | 285 ms | 277 | 0 |
| lottie-web full, SVG / canvas | 79.6 KB | 387 / 290 ms | 307 / 751 | 0 |
| dotLottie (487 KB WASM) | 504 KB | 414 ms | 255 | **58** |
| dotLottie in a Worker | 511 KB | 444 ms | **19.5** | 0 |
| Rive canvas-lite (356 KB WASM) | 409 KB | 530 ms | 428 | **57** |
| Rive canvas (795 KB WASM) | 855 KB | 942 ms | 390 | **55** |
| Rive webgl2 (SwiftShader, so pessimistic) | 957 KB | 1920 ms | 975 | 58 |

**Static pictures that keep ticking** [L]:
- Rive and main-thread dotLottie keep `requestAnimationFrame` running at about 58/s while showing 1 distinct frame.
- `stopRendering()` and `freeze()` bring it to 0; lottie-web stops by itself.

**Reduced motion** [L; V grep]: no Rive or Lottie runtime reads `prefers-reduced-motion`.

**Accessibility tree** [L]:
- Rive and dotLottie canvases expose nothing.
- lottie-web SVG exposes an unnamed `img`; `rendererSettings.title` and `description` name it [V].
- Only the native switch is focusable and operable.
- Rive `semanticsMode: 'enabled'` builds a named DOM overlay, but Tab stopped on the canvas and Space/Enter did nothing. The editor feature is Early Access [V rive.d.ts; S rive.app].

**Rive runtime** [V]:
- It warns "state machine inputs are deprecated … use data binding".
- Its default WASM URLs are unpkg and jsDelivr, so self-host.

**Authoring cost** [S]:
- Rive: export needs a paid plan (Cadet $9 per seat per month and up).
- LottieFiles: $19.99–24.99 per user per month.
- Bodymovin is free [K].

### C. Why plans mention motion and ship static, and `motion.mjs`

**How motion gets lost:**
- The plan's sentence has no trigger, element, property, duration or substitute.
- The build has `transition: all` on things that never change, reveal classes with no CSS, and counters that print the final value.
- A reduced-motion reset kills press feedback.
- Two lab examples: Motion silently dropping `x` (A9), and a counter showing "01000" (A8).
- Figma Motion exports and the `get_motion_context` MCP tool exist but were not tested [S figma.com/blog].

**`skills/website-redesign/scripts/motion.mjs`** (the only file this stream creates under skills/; sha256 `ebfb3d45…`)
- **Spec:** a table or JSON block in `DESIGN.md` with `id · trigger · on · target · properties · duration · easing · reduced · stagger · interrupt · job`. `reduced` is one of keep, fade, instant, static, pause.
- **How each row is tested:** the row is triggered for real and sampled every frame, then run again under `reduce`.
- **What it reports:** animates / instant / nothing; duration and easing (exact from Animation objects, or a range from samples for JS libraries); properties; stagger; the reduced-motion outcome; lost content; interruption continues / jumps / swallowed.
- **Filmstrips:** now sized to fit all 16 frames; scroll rows are cropped to the target.

Behaviour added after review:
- A two-frame change whose middle value lies between start and end counts as animation (JS libraries have no Animation object).
- A one-step change with dropped frames near the trigger is re-measured up to twice, then reported with a "frames were dropped" caveat.
- Sampled easing is not judged with fewer than 4 frames inside the motion.
- Scroll-driven reveals are detected from animations present before the trigger.
- A reduced-motion fade is timed without `::view-transition-group`.
- `text` rows compare the text people see (layout tree, so counters count) with the DOM text.
- Hover and press count as changed if they start an animation.
- Native selects, checkboxes, radios and unstyled buttons are not judged for hover.
- `no-reduced-motion` is raised only if something moves.
- Spinners are exempt (kept under reduce, §6).
- `scale-zero` applies only to entrances, not loops.
- 1 ms "animations" under reduce are treated as instant.
- Appearing from a `display:none` parent is not a layout jump.

**Evidence** [L results.c]

| Set | What it tests | Result | Status |
| --- | --- | --- | --- |
| 4 fixture builds (36 rows, 76 flags) | findings, flags, verdicts | findings 42 TP / 0 FP / 0 FN; flags 76/76; verdicts 36/36; filmstrips all 16 frames inside | development, optimistic |
| Part A pages, unguarded (41 rows) | verdicts; truth: 35 failing, 6 passing | verdicts 41/41; reduced outcome 42/42, but the reference is 41 "moves" / 1 "fades", so that agreement is **uninformative** | development |
| Part A pages, guarded `?guard` (41 rows) | reduced-motion classifier on a **balanced** reference (moves 5, instant 18, fades 19); verdicts (4 failing, 37 passing) | reduced outcome **42/42**; verdicts **41/41**; findings 4 TP / 0 FP / 0 FN | partly development: its 3 CSS failures were fixed after review; spring list excluded |
| Dev pages: the reviewer's 5 plus the ticker bug | flag precision, pre-review vs now | 97 → 77 flags; FP 20 → 0; precision 0.787 → 1.0 (3 debatable) | development: fixes tuned here |
| **Held-out: 15 pages** frozen before the fixes, version `508abfa4` kept in c/versions/ | flag precision, labelled with reasons and pixel evidence | **147 flags: 79 TP, 24 FP, 44 debatable → precision 0.767** (0.537 if debatable counts as wrong) | **held out** |
| **Held-out spec rows** (Bootstrap, truth written from SCSS before the run) | verdicts and findings | **verdicts 7/7**; findings 10 TP / 1 FP / 0 FN | **held out** |
| The same 15 pages after 4 fixes | same | 123 flags: 79 TP, 1 FP, 43 debatable (0.988); spec 7/7, 10/0/0 | no longer held out |
| Starved page (JS 100 ms press; main thread blocked 45 of 60 ms / 70 of 80 ms) | load sensitivity, 5 runs each | current: passes 5/5 and 4/5 (the fifth says "frames were dropped"); pre-review: 1/5 and 0/5 (all "static") | development |

Held-out pages: 8 Bootstrap visual-test pages (twbs/bootstrap@46a8804), the animate.css docs, the Hover.css demo, 3 G-product-lab pages and 2 H-blind-eval fixtures.

The 24 held-out false positives had three causes:
1. **Hover effects that are keyframe animations** (15). The Hover.css pulses and wobbles start and end at rest; motion.mjs finished them before comparing.
2. **Bootstrap's `spinner-grow` loader keyframes** (8). One rule on 8 pages, read as a `scale(0)` entrance.
3. **animate.css's 1 ms reduce rule** (1), read as motion.

The single spec false positive was a modal appearing from a `display:none` parent, read as a "layout jump".

- **Weakest check:** `hover-none` was the weakest held-out check at 18 TP / 15 FP.
- **Debatable flags:** 33 of the 44 are `off-token` on pages that define no motion tokens (judged against motion.md defaults).

## Experiments

- **Folder:** `research/stage2/experiments/S2-motion-lab/`, 1.2 MB without node_modules and captures.
- **Full re-run:** `npm install && npm run fetch && node run.mjs` (about 2.5 h on this machine; one browser at a time).
- **Parts:** `--only a|b|c`. `node run.mjs --only a --variants css,gsap [--cost-only|--no-cost]` re-measures some variants and merges them into results.json. `node run.mjs --only c --rescore` re-scores without a browser. `node summarize.mjs [a|b|c]` prints the tables.
- **Part A files:**
  - `a/run-a.mjs`: interruption, reduced-motion states, compositor survival, interleaved cost rounds, and the ticker's seen/DOM/tree text via `lib/text.mjs`;
  - `a/repro-motion-*.mjs`, `a/rest-probes.mjs`, `a/probe-motion-view.mjs`.
- **Part B files:** `b/run-b.mjs`, `b/rest-b.mjs`; assets are fetched by `fetch-assets.mjs`.
- **Part C files:**
  - `c/run-c.mjs` (fixtures, `c/truth.json`);
  - `c/run-heldout.mjs` (Part A pages, `c/truth-partA.json`);
  - `c/run-pages.mjs --before --frozen` (dev and held-out pages from `c/pages.json`, labels in `c/labels.json`, pixel evidence in `c/labels-pixel-evidence.json` from `c/verify-hover.mjs`, spec truth in `c/truth-pages.json`);
  - `c/stress-press.mjs`;
  - `c/fetch-ext.mjs` (third-party pages cloned at pinned commits into the git-ignored `captures/ext/`; nothing redistributed).
- **Shots:** `shots/c-*.jpg` are filmstrips 1542 px wide with all 16 frames.

## Decision guidance for the skill

1. **`motion.md` §2: replace the one-line format with a new subsection, "The motion spec".**
   - Every promised animation is a row in the format above. `target` is a selector that exists in the build.
   - "Subtle", "smooth" or "delightful" never stand without a row.
   - **Gate** before Phase 5 is done: `node scripts/motion.mjs <url> --spec DESIGN.md --jpeg`. Every spec row passes, or the row changes with a written reason. A failure carrying "frames were dropped" is re-run on a quiet machine before anyone acts on it.
   - **Audit flags are advisory, not a gate: do not use `--strict` as one.** Held-out precision was 0.77 for the frozen version. `off-token` is noise on sites without tokens.
   - Attach the filmstrips to the Phase 6 critique.
2. **Extend other files.**
   - `templates/DESIGN.md` "## Motion": the table header and one example row.
   - `SKILL.md` scripts table: a new row for `motion.mjs`.
   - `technical-qa.md` motion item: "spec rows pass; flags reviewed; no `raf-at-rest` on app pages".
   - `implementation.md` step 3: "build from the spec rows".
3. **`motion.md` §8: replace the library table with a job → tool table.**

   | Job | Use | Evidence |
   | --- | --- | --- |
   | State changes, hover, press, sheets, toasts, staggers | CSS transitions; `@starting-style` for display | continuous; 223 px of movement under a 400 ms block; 0 rAF at rest; 2.0 KB for all seven |
   | Counters and tickers | A WAAPI/JS writer that updates textContent through `Intl.NumberFormat` (decimals, grouping, currency). A CSS `@property` + `counter()` only for integer, decorative counts, drawn only while counting (`content: counter(n) / ""`), with the final value written to the DOM text | A8 |
   | List reorder | Hand-written WAAPI FLIP, AutoAnimate (switches itself off under reduce, no substitute), or Motion `layout` in React | not a View Transition if people re-sort quickly |
   | Route/page changes | View Transitions, kept ≤ 400 ms | they swallow input; for in-component swaps people repeat, use transitions or AnimatePresence |
   | Scroll progress and reveals | CSS scroll-driven, with an IntersectionObserver fallback | not ScrollTrigger, anime.js `onScroll` or React Spring `useScroll`, which never sleep |
   | React exits, shared layout, gestures | Motion with `MotionConfig reducedMotion="user"`, plus `transition.reduceMotion: false` on press feedback | |
   | Authored marketing timelines | GSAP, marketing pages only | its idle loop is accepted there |

   GSAP, Motion and anime.js cost the same order of script time (their order flips between rounds). Motion for React costs about 1.6× vanilla Motion, and React Spring the most. So don't pick among the first three on cost. Not Theatre.js. Not React Spring for new work.
4. **`motion.md` §7: replace** "animate the transform string when smoothness under load matters" with:
   - Transform strings survive a blocked main thread but jump when interrupted (10/12) and start from `scale(0)` without a from-keyframe. Use them with `[from, to]` keyframes, only for moves the user cannot reverse.
   - `animateView()` ignores `x`/`y`: use `transform: 'translateX(…)'`.
   - **Extend** "nothing runs at rest" to motion libraries: the A3 features, Rive `stopRendering()`, dotLottie `freeze()`.
5. **`motion.md` §5, View Transitions: extend.**
   - Input goes to `<html>` for the whole transition.
   - To stay interactive, set `:root { view-transition-name: none }` and `::view-transition { pointer-events: none }`, and accept a 25% jump on the second transition.
6. **`motion.md` §6: extend.**
   - Motion for React "user" removes press feedback.
   - AutoAnimate goes instant.
   - Rive, dotLottie and lottie-web ignore the preference.
   - A counted number must end as DOM text, under reduce too.
7. **New `motion.md` subsection, "Illustrated, stateful elements."** Decision tree:
   - A control is a native element with CSS/SVG states. A Rive or Lottie picture may sit inside it with the canvas `aria-hidden`.
   - A decorative loop is CSS/SVG, a sprite or a video, never a WASM runtime.
   - A few illustrations: lottie-web light, with `title` and `description` set.
   - A `.lottie` state machine: dotLottie in a Worker.
   - Rive only for pointer- or data-driven state: canvas-lite, a paid editor plan, and stop rendering when it settles.
   - Always self-host the WASM, show a poster first, and never autoplay under reduce.
8. **`accessibility.md` motion inventory and `visual-qa.md` filmstrips: extend** to point at the spec and `motion.mjs`.

## Rejected ideas

- **Detecting motion from `getAnimations()` alone.** It is blind to GSAP, anime.js and React Spring.
- **Taking duration as first-to-last visible change.** It undercounts decelerating tails; a range is reported instead.
- **Summing View Transition pseudo-element values.** A symmetric slide or crossfade keeps the sum constant, so each pseudo-element is compared separately.
- **Filmstrips by seeking `currentTime`.** It is blind to JS libraries. Screencast frames are used, with clocks aligned.
- **Reading the counter's text from the accessibility tree.** It showed `aria-label`/DOM text, not what was on screen ("01000"). The layout tree (DOMSnapshot) is used instead.
- **Counting any two-frame change as animation.** A class toggled in two steps would pass. Only a strictly-between middle value counts.
- **Adding busy-loop processes to test load sensitivity.** They would have distorted other agents' benchmarks; the stress page blocks only its own main thread.
- **Judging hover by computed styles alone on held-out pages.** The labels use pixel diffs, so motion.mjs is not graded by its own method.
- **Comparing Rive and Lottie on the same asset.** Impossible, since the formats differ.
- **Theatre.js for UI:** 35 KB for one sequence, an AGPL Studio, no release since 2024-05.
- **A separate `motion.json` spec.** It would not be reviewed; the spec lives in `DESIGN.md`.

## Open questions and limits of this evidence

- **Timing:** everything ran in headless Chromium 141 on a shared, loaded machine. Main-thread numbers are relative, WebGL2 ran on SwiftShader, and nothing ran on a real GPU or phone.
- **Browser coverage:** View Transition input blocking was measured in Chromium only.
- **Held-out labels** were written by one labeller (me), with reasons, and pixel evidence for hover and press. Other flag kinds were labelled from source. The 0.988 post-fix figure is on pages I had already seen.
- **Tokens:** `off-token` should become one page-level note when a site has no tokens. Not implemented; that is 33 debatable flags.
- **Spinner exemption:** a small decorative rotating badge would also be exempt.
- **Not covered by motion.mjs:** canvas/WebGL/Rive/Lottie frames, shadow DOM, and React `<ViewTransition>`.
- **Rive:** semantics keyboard behaviour and `stopRendering()` side effects are untested.
- **Part B** was not re-run this session.
- **Pricing and Figma Motion** come from snippets only.

## Changes after review

1. **"Held-out … never used for tuning", no negatives, verdicts not scored.**
   - Dropped "never used for tuning"; each set is now labelled with its status.
   - Added the guarded Part A pages (`?guard`), whose reference is balanced (moves 5 / instant 18 / fades 19): reduced outcome 42/42.
   - Scored verdicts against `c/truth-partA.json` plus a reduced-motion truth derived from Part A's own sampler: guarded 41/41 (4 failing rows), unguarded 41/41 (35 failing rows).
   - Added a real held-out set, frozen before any fix: 15 pages and 7 Bootstrap spec rows with truth from SCSS. Result: flag precision 0.767 and verdicts 7/7.
2. **Flag false positives on unseen pages.**
   - Implemented every suggested fix: native controls and unstyled buttons; the fingerprint now reads decoration thickness/offset, border widths and styles, background size/position and weight; no-reduced-motion only when something moves; spinners exempt, per §6; the JS two-frame rescue, with retries and a dropped-frames caveat.
   - Pre-review vs current on the reviewer's pages plus the ticker bug: 20 → 0 false positives.
   - The held-out run then found 3 new causes, which were fixed afterwards and are reported separately.
   - The load failure was reproduced on a starved page: 0/5 → 4/5 at the harsher level.
3. **The CSS techniques failed as a gate.**
   - Scroll-linked detection now uses animations present before the trigger.
   - `text` is satisfied by a changing custom property or rendered text.
   - The fade check excludes `::view-transition-group`.
   - The guarded CSS page now passes 7/7.
   - The gate is restated: spec rows are the gate; flags are advisory.
4. **The CSS ticker showed "01000".**
   - Confirmed, and fixed with the counting-class pattern.
   - Added a seen/DOM/tree text assertion in Part A and a seen-vs-DOM check in motion.mjs. The dev fixture `c/fixtures/ticker-bug.html` is caught.
   - The job table now limits `counter()` to integer, decorative counts.
5. **Filmstrips clipped at 1280 px; scroll strips showed the wrong area.**
   - Strips are now sized to their content, and scroll rows are cropped to the target: all 16 frames inside, 1542 px wide.
6. **Numbers that did not reproduce.**
   - css-vtpe: 29.5% corrected to 25.6% (12/12; reviewer 24.4%).
   - AutoAnimate list: continuous 11/12, reported as continuous.
   - Motion transform-string compositor: now a median of 7 with its range (185, 33–218), not 224.
   - Motion transform-string sheet interruption: 10/12 jumps.
   - Script time: re-measured in interleaved rounds. The GSAP-below-Motion claim is withdrawn: 3/7.
7. **Other problems found during the fixes.**
   - Motion's `animateView()` drops `x`/`y`; the lab's view only crossfaded.
   - `node run.mjs --only a` ran zero variants: fixed with `--variants`.
   - A `\b` in a template literal broke the `?guard` check: fixed before any measurement used it.
   - `changedProps` ignored the new two-frame rule, giving a flaky props failure: fixed before the final run.
