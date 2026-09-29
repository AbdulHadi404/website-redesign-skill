<!-- Stream S7, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S7-visual-iteration-tools/. The skeptical review is in S7-visual-iteration-tools.review.json. -->

# S7 — Screenshot-driven iteration, visual regression, viewport sweeps and real-content stress

## What the skill already knew

The skill already had these tools:
- **`capture.mjs`** captures five widths (1440/1280/1024/768/390, plus 320/360/844 in the responsive pass). It finishes motion, decodes images and warns about overflow.
- **`audit.mjs`** measures one width at a time. **`states.mjs`** drives states and seeded fixtures.
- **`compare.mjs --diff`** runs pixelmatch at threshold 0.1.

`visual-qa.md`'s QA matrix lists content cases (0/1/100+ items, long names and URLs, missing images, big numbers, translation, RTL) and 200%/400% zoom. Nothing generated those cases, and nothing looked between the sampled widths. `tools.md` named Playwright `toHaveScreenshot`, odiff, reg-cli, BackstopJS and Lost Pixel without choosing one.

Stage 1 established the following, and this report does not repeat it: the fresh-context reviewer, blur and removal tests, bounded rounds, "verify the verifier", and the marked accessibility tree.

## Findings (tagged; numbers where they exist)

### Visual regression

1. **`compare.mjs --diff` reports "0 pixels differ" for a visible brand-colour change.**
   - The change: button #1d4ed8 → #2563eb, ΔE2000 7.2, white-text contrast 6.70 → 5.17.
   - pixelmatch at 0.1 (as `compare.mjs` calls it) and Playwright's default 0.2 both count 0 px at both widths.
   - The change needs threshold ≤ 0.05 (11,123 px). A ΔE 0.8 token drift is caught only at 0.
   - Sources: [L `vr.thresholdSweep`]; [V `compare.mjs` `threshold: 0.1`]; ΔE and contrast from colorjs (the reviewer re-checked them).

2. **Pixel counts cannot tell a regression from environment noise.** At 1280 and t0.1:

   | Case | Pixels changed |
   | --- | --- |
   | 1 px shift of the button row (a regression) | 1,530 |
   | sub-pixel text (noise) | 6,400 |
   | headless shell instead of full Chromium (noise) | 4,045 |
   | display-P3 profile (noise) | 11,792 |

   [L `vr.thresholdSweep`, reproduced by the reviewer to ±1 px]

3. **With the build held constant and captures stabilised, re-renders match to the pixel.** Real pages add a few isolated pixels and one unstable case.
   - My control: 10 pages × 2 widths × 3 repeats, each capture in its own launch.
   - Recipe **once** (finish, pause and mask, then shoot 300 ms later):
     - 59 of 60 pairs are 0 px.
     - Astro's project page at 1280 differed by 1,741 px in one repeat. The current-page nav pill was caught mid-way through a `background-color` transition that started after the stabilisation pass.
   - Recipe **strict** (also `transition: none`, and finish again right before the shot):
     - 59 of 60 pairs are 0 px.
     - One pair had 1 isolated pixel, 0 at t0.1.
   - The reviewer's control: 13 of 14 at 0 px, and Astro home 2 isolated px.
   - [L `control.byRecipe`; reviewer's run]

4. **`browser.version()` cannot tell the two Chromium builds apart, but CDP can.**
   - The difference: full Chromium and the headless shell both report `141.0.7390.37`. `Browser.getVersion().product` says `Chrome/…` for one and `HeadlessChrome/…` for the other, and `SystemInfo.getInfo().commandLine` gives the executable and flags. [L `guard.versions`]
   - How the skill picks a build:
     - Playwright 1.63 launches the headless shell for any headless launch without a channel (`getExecutableName`). [V `playwright-core/lib/coreBundle.js`]
     - The skill's `launch()` uses the full build with `--gpu` (`channel: 'chromium'`) and with `--headed`. When the default shell is missing it falls through to the first binary on disk, which in this container is full chromium-1194. [V `lib/env.mjs` `launchBrowser`]
     - `npx playwright-core install chromium` (the skill's own `browser` script) installs both builds. [V `browsers.json` `installByDefault`; K]
     - So `capture.mjs` and `capture.mjs --gpu` can capture with different builds, a difference of about 4,000 px with nothing changed.
   - A sidecar guard fixes this (`vr/build-guard.mjs`):
     - It refused shell-vs-full, where an unguarded diff counts 4,045 px, and P3-vs-sRGB (11,792 px).
     - It allowed a re-render in a separate launch (0 px).
     - [L `guard.pairs`]

5. **Today's `capture.mjs` shows two different frames of the same page:** 6,056 px at t0 (225 px at t0.1) in my run, 5,948 (103) in the reviewer's. `finishMotion()` pauses infinite animations wherever they happen to be, so the frame is random. [L `motion`; V `lib/env.mjs`]

6. **Engines on the same stabilised PNG pairs** (6 regressions and 4 noise kinds, at 2 widths):

   | Engine | Regressions caught /12 | Noise flagged /8 | ms per pair, 1280 · 390 (interleaved median) |
   | --- | --- | --- | --- |
   | pixelmatch t0.1 (`compare.mjs`) | 8 (both colour changes missed) | 6 | 162 · 247 |
   | pixelmatch t0 | 12 | 6 | same engine |
   | Playwright comparator t0.2 | 8 | 4 (P3 passes) | 182 · 348 |
   | Playwright ssim-cie94 | 10 (ΔE 0.8 missed) | 6 | 859 · 1,652 |
   | odiff t0.1 | 8 | 6 | **74 · 131** |
   | resemble 0.1% (BackstopJS) | 9 (removed badge at 1280, ΔE 0.8 missed) | 6 | 202 · 410 |
   | reg-cli defaults (thresholds 0) | 12 | 6 | 571 · 842 per image, process included (first run, not interleaved) |
   | DOM + computed-style diff (prototype) | 12 | 2 (both are `translateX(0.3px)`, a real CSS change) | 78 · 41 (first run) |

   - Timings: 7 rounds × 3 pairs, engine order rotated each round, load average 12. odiff is the fastest at both widths, as the reviewer found; my first report's mixed ordering was load noise. [L `timing`; `vr.engines`]

7. **End-to-end tools** (baseline, then one run per variant):
   - **Playwright Test 1.63:** 12/12 caught and 8/8 noise flagged out of the box (the timestamp fails every run). Masked: 8/12 and 4/8. 8.0–9.5 s per run here, 4.9–6.6 s in the reviewer's run.
   - **BackstopJS 6.3.25:** 11/12 and 7/8. Masked: 9/12 and 6/8. 3.2–3.5 s per run.
   - **Lost Pixel 3.22:** 12/12 and 6/6. Masked: 12/12 and 4/6. It pins playwright-core 1.47.2, which launches only the headless shell here.
   - Sources: [L `vr.pipelines`, the reviewer matches]; [V npm metadata: BackstopJS 2024-09-07, Lost Pixel 2024-11-14]

8. **Percentage thresholds hide small regressions on long pages.** BackstopJS at 0.1% missed a removed badge: 0.09% of the page. [L]

9. **What an agent can act on.**
   - An 8 px-clustered pixelmatch mask gives 1–5 boxes for a local change: 5 for the 1 px shift, one 40×16 box for the removed badge.
   - The structural diff turns a reflow's 58–144 boxes into one cause.
   - When the DOM is identical and only pixels differ, the environment changed. [L `vr.domDiff`, `vr.hybrid`]

10. **Hosted services and other runners.**
    - Hosted services (documentation only): Chromatic `diffThreshold` 0.063; Argos default 0.5; Percy's review agent draws boxes and summaries. [S vendor docs]
    - Loki 0.35.1 was last released in 2024-08. reg-suit wraps reg-cli. The Storybook runner assumes a Storybook the redesign doesn't have. [V npm]

### Width sweep (`sweep.mjs`)

11. **Speed:** 147 widths plus 2 zoom cases in a median 24.7 s per page, 141 ms per width. The median is 150 ms per width on the held-out-2 pages. [L `sweep.totals`, `holdout2.sweep.totals`]

12. **Seeded recall: 14 of 14.** [L `sweep-lab.recall`, reviewer 14/14]

13. **Precision.** The headline is actionable precision: TP ÷ all finding keys, where a key is check + element. TP means real and worth fixing; INT means real, rightly aimed, but intended or harmless; FP means not real, the wrong element, or caused by the tool (now labelled FP consistently).

    | Set | Keys | TP / INT / FP | Actionable |
    | --- | --- | --- | --- |
    | Tuning pages | 59 | 52 / 7 / 0 | 88% |
    | Tuning, unseeded | 36 | 31 / 5 / 0 | 86% |
    | Old held-out | 17 | 15 / 1 / 1 | 88% |
    | **Held-out-2, first pass, scripts frozen** | **50** | **40 / 7 / 3** | **80%** (INT 14%, FP 6%) |
    | Held-out-2 after the fixes it prompted (not held-out) | 47 | 40 / 7 / 0 | 85% |

    - **Old held-out set:** the Hallam dead band is now FP (a painted band). The set is narrow, as the review said:
      - 12 of its 17 keys are the same 3 faults of one fixed-width template, repeated over 4 routes (no viewport meta, `.wrap` overflow, nav overflow).
      - `basket` and `a11y-wizard` gave 0 keys.
      - Only 1 key lies outside the default widths: a 320–336 px lede measure, INT.
    - **Held-out-2 set:** 12 pages — Stem & Wren home and order, the Carbon and Primer pages with their npm CSS, and Bootstrap's album, pricing, checkout and dashboard, plus album-rtl, checkout-rtl, dashboard-rtl and blog-rtl.
    - **The 3 first-pass FPs:**
      - 2 dead bands over aria-hidden SVG placeholders, which the probe treated as absent.
      - Carbon's fixed full-width header named as the overflow culprit, when it only follows a layout viewport the table widened.
    - [L `results.holdout2FirstPass.sweep.totals.keys`, `holdout2.sweep.totals.keys`; `verdicts.json`]

14. **What the default capture widths miss, on held-out pages.**
    - Held-out-2: 9 of 50 keys (7 TP) never occur at 1440/1280/1024/768/390, and 3 (2 TP) are missed even with 320/360/844 added. 12 keys occur only at the zoom cases.
    - Primer's issue page overflows over 408–616 px through its filter row, a different element from the header that overflows at 390.
    - Bootstrap pricing's header links run past the rule only at 320–328.
    - On the tuning pages the figures are 14 of 59 and 8 of 59.
    - [L `…totals.keys.notAtDefaultWidths`, `notAtResponsiveWidths`]

15. **Overflow culprits.**
    - Only elements past the end edge can widen a page (the left edge in RTL, or innerWidth − clientWidth on a widened phone viewport).
    - A full-width fixed or sticky bar that merely follows a widened layout viewport is now dropped when another culprit exists. The bar itself is dropped, not its contents: Stem & Wren's nav inside a sticky header stays a culprit.
    - [L Carbon and Stem & Wren re-runs; the owner's `lib/probes.mjs` still lacks both]

16. **ReDeCheck's failure types** inform three checks: protrusion, wrap-orphan and small-range layouts. Its small-range threshold is `< 5` px. It is Java + Firefox 46 and was not run. [V `RLGAnalyser.java`, MIT]

17. **Evidence images now show the element each box marks.**
    - The test (`evidence/evidence-test.mjs`): paint the finding's element magenta, recolour its mark lime, and require the lime box to hold magenta in the image. There are 35 findings on 8 pages and fixtures.
    - Results:
      - On the same 19 judged findings, the pre-review code was right on 9 of 19 sheet cells and 13 of 19 crops: 5 marks off the image, 5 misaligned. Now it is right on 19 of 19 and 19 of 19.
      - For native-RTL `rtl` runs, without flipping back to RTL 9 of 10 were aligned; with the flip back, 16 of 16. The flip-back case is clearest in `shots/evidence-before-after.jpg`.
    - Two cells are correctly "blank": a skip link parked 9,999 px out in an RTL page's overflow.
    - The causes:
      - **Right-to-left pages:** marks at negative x widened the page leftwards, because RTL overflow is scrollable, and clips started at x = 0.
      - **Zoomed-out phone pages (Stem & Wren):** a full-page screenshot changed the page scale from 0.31 to 0.25 and the scroll height from 5,316 to 4,699, so text autosizing moved the text away from the marks.
      - **The native-RTL flip:** the page was shot in its flipped direction.
    - [L `evidence.summary`, `shots/evidence-before-after.jpg`]

### Real-content stress (`stress.mjs`)

18. **Seeded recall: 17 of 17.** [L `stress-lab.recall`, reviewer 17/17]

19. **Precision by finding key (actionable = TP ÷ all):**

    | Set | Keys | TP / INT / FP | Actionable |
    | --- | --- | --- | --- |
    | Tuning pages, final scripts, all 12 mutations | 131 | 103 / 2 / 26 | 79% |
    | Tuning, unseeded | 70 | 44 / 2 / 24 | 63% (FP 34%, all caused by the tool) |
    | Old held-out | 25 | 13 / 2 / 10 | 52% |
    | **Held-out-2, first pass, frozen, all 12** | **113** | **62 / 4 / 47** | **55%** (FP 42%, all caused by the tool) |
    | Held-out-2 after the fixes (not held-out) | 98 | 64 / 7 / 27 | 65% |

    **By mutation, both held-out sets, first pass** (TP / keys): pseudo 38/42, rtl 13/16, no-images 5/6, errors+offline 4/4, list-0 6/12, numbers 1/4, long 8/33, empty 0/4, list-500 0/5, slow 0/12 (all artefacts, finding 20).

    - The **default set** (the eight below): 67/96 (70%) → 69/90 (77%) with the final scripts.
    - The **data-aimed four** (long, empty, list-1, list-500) run unaimed: 8/42 (19%).
    - `stress.mjs` now runs only the eight by default: pseudo, numbers, no-images, rtl, list-0, slow, errors, offline. The data-aimed ones run with `--targets`/`--list`, `--only` or `--all`. [L `/tmp`-free runner output; `verdicts.json`]

20. **The late-shift check measured a layout that was never painted.**
    - The mechanism:
      - At 0.6 s, with a render-blocking stylesheet still loading, script reads an unstyled layout (`#cards` top 44 px).
      - `requestAnimationFrame` fires only 1.9 s later, when the styled page (top 616 px) is first painted. [L probe `rbtest.mjs`]
      - All 10 late-shift findings on held-out-2 and 4 on tuning pages were this artefact. The filmstrips show nothing moving.
    - My original report's "the permit site moves 346 px after first paint" was wrong and is relabelled FP.
    - Snapshots now wait for a painted frame. The re-run then found only moves the filmstrips confirm:
      - permit-apply footer: 144 px, when the zones table fills at 3.0 s;
      - Milkline herd table: 376 px;
      - Stem & Wren order footer: 195 px;
      - Stem & Wren home: a 56 px shrink below the fold, probably a font swap;
      - the seeded lab shift: 196 px.
    - "blank" now reports the first painted frame (Carbon 6.7 s, Primer 5.3 s).
    - [L `stress`/`holdout2` slow rows, filmstrips]

21. **RTL, on controls with a truth list** (`fixtures/rtl-truth.json`):

    | Page | Expected found | Other keys |
    | --- | --- | --- |
    | S8 bilingual en, logical CSS | 0 of 0 | 0 |
    | S8 bilingual ar, logical CSS | 0 of 0 | 0 |
    | S8 en-broken | 8 of 8 | 1, a consequence (TP) |
    | S8 ar-broken | 8 of 8 | 1, a consequence (TP) |
    | Sanad ar (native RTL) | 5 of 5 `text-align: left` rules | 0 |
    | Sanad `?lang=en` | 5 of 5 | 0 |

    - **The 8 broken-variant items:** badge `right:2px`, alert icon, toast, drawer, lede, hint, caption, th/td.
    - **Out of scope, listed in the truth file:** `margin-left:auto`, `margin-right`, `padding-right`, directional shadow, slide-in direction, icon flips, font rules.
    - The reviewer's ~10 Sanad false-positive keys and the avatar protrusion are gone.
    - **Native RTL is now handled:**
      - check physical `text-align: left` as the page stands;
      - flip to LTR (keeping lang and text) and report only what stays put;
      - flip back to RTL for the evidence.
    - **Not flipped** when the page loads an RTL-only stylesheet: the four Bootstrap RTL pages load `bootstrap.rtl.min.css` and gave 0 RTL findings.
    - Initials in avatars are no longer translated.
    - [L `rtl`, `holdout2`]

22. **Held-out faults the stress run found:**
    - Stem & Wren order fails silently on 500 and offline (`flowers.forEach`, uncaught).
    - Missing empty states on Carbon's and Primer's lists and Bootstrap's album and dashboards.
    - Physical CSS that stays put in RTL: Bootstrap's `.float-end`, `.text-start` and form-check margins, and Primer's subnav floats.
    - Translated labels overflow on Bootstrap pricing's nav and footer, and on Primer's filters and tabs.
    - Long product names push prices out of Bootstrap's checkout cart.
    - Carbon's table has no horizontal scroller, so big numbers or long cells widen the page.
    - Unsized logos. [L `verdicts.json` notes]

23. **Cost:** 92–142 s per page for all 12 mutations at 3 widths. Text and list mutations take about 3 s each, no-images about 7 s, slow about 6 s. The default eight take less. [L `stress.targets.perMutation`]

### How a model should look at screenshots

These findings are unchanged from my first report (the reviewer confirmed the DiffSpot numbers).
- **DiffSpot:** the best model finds 40.7% of single-property changes; Claude Opus 4.7 finds 31.2% (41.2 / 30.5 / 21.8 by tier), with 99.6% specificity. [V leaderboard]
- **Downscaling:** a 780 × 16,000 px capture is shown at 0.125 scale. [V tool output]
- **Crops and numbered marks** help small details. [S ICLR 2025; Set-of-Mark]
- **Close calls** are near coin flips for model judges. [S arXiv 2510.08783]
- **Extracted text** helps every model. [S Design2Code]
- **Interaction** matters more than static renders. [S arXiv 2604.19750, 2609.02088, 2607.01728; the IDs exist, checked by search]
- **Grid overlays:** no evidence found either way. [S; K]

## Experiments

Everything is in `research/stage2/experiments/S7-visual-iteration-tools/`.
- **Rebuild everything:** `npm install && ./fetch-sites.sh && node run.mjs` (about 95 min).
- **One section:** `node run.mjs <sections>`. Sections: vr, motion, guard, control, timing, evidence, rtl, sweep, stress, holdout, holdout2, sheets, score.
- **Held-out-2 first pass with the frozen scripts:** `S7_FROZEN=1 node run.mjs holdout2`, using `frozen/sweep-668ca747ac00.mjs` and `frozen/stress-1cdd07f25219.mjs`.
- **Labelling:** `node verdict-keys.mjs` lists unlabelled keys; `node run.mjs score` re-applies `verdicts.json`.
- **Provenance:** every section records the SHA-256 prefixes of the script versions it ran. The final numbers come from sweep `656ee69cd500` and stress `aaec5fe02925`; the stress file now differs only in its header comment (`f4cca18d063c`).
- **Size:** the folder is 4.4 MB without `captures/` and `node_modules`, and `shots/` holds 8 JPEGs (2.7 MB).

| Experiment | Built | Result |
| --- | --- | --- |
| VR fixture, engines, pipelines, DOM diff | unchanged from the first report | findings 1–2, 6–9 |
| **guard** (new) | `vr/build-guard.mjs`: capture plus sidecar (product, revision, executable, rendering flags, DPR), and a diff that refuses mismatches | refused shell (4,045 px) and P3 (11,792 px); re-render 0 px |
| **control** (new) | `vr/control.mjs`: 10 pages × 2 widths × 3 repeats × 2 recipes, separate launches | once: 59/60 at 0 px; strict: 59/60 at 0 and 1 × 1 px |
| **timing** (new) | `vr/timing.mjs`: interleaved rounds | odiff fastest at both widths |
| **evidence** (new) | `evidence/evidence-test.mjs` plus `fixtures/evidence/` (RTL overflow, width=1100 zoom-out, long LTR) | legacy 9/19 cells → 19/19; all current 35/35 |
| **rtl** (new) | `fixtures/rtl-truth.json`, run on S8's `bilingual.html` (4 variants, read in place) and Sanad | 8/8, 8/8, 0 on the logical-CSS variants, 5/5, 5/5 |
| **holdout2** (new) | `lib/extra-pages.mjs` builds Bootstrap examples (MIT, S8's pinned commit) and Carbon/Primer CSS from npm; 12 pages | finding 13 and finding 19 tables |
| Seeded labs, tuning, old held-out | re-run with the final scripts | 14/14, 17/17; tables in findings 13 and 19 |

## Decision guidance for the skill

### 1. `resources/tools.md` › "Visual regression and comparison" (replaces)

> - **In the skill's loop:** pixelmatch (already in `compare.mjs`) at threshold 0, on stabilised, masked captures made by one recorded build; changed regions as boxes plus the element under each; a DOM/computed-style diff for the cause.
> - **No threshold separates** a 1 px shift (1,530 px) from rendering noise (4,045–11,792 px); holding the build constant does.
> - **Projects already on Playwright Test:** `toHaveScreenshot` with `mask` and `threshold` ≤ 0.05 (0.2 missed a ΔE 7 change); baselines made in the CI image.
> - **Don't add:** BackstopJS (percentage threshold, 2024), Lost Pixel (pins Playwright 1.47), Loki, or a Storybook runner.
> - **odiff** is the fastest engine (74/131 ms against pixelmatch's 162/247) but detects the same and is a native binary: optional, not needed.
> - **Hosted review** only when the team wants a CI UI.

### 2. `visual-qa.md`: "Regression diffs while iterating" (new, after "Capturing reliably")

1. **One build, recorded and checked.**
   - Each capture writes a sidecar: `Browser.getVersion().product`, revision, executable, rendering flags and DPR.
   - `browser.version()` is not enough: it is identical for full Chromium and the headless shell.
   - Never compare a `--gpu` or `--headed` capture with a plain one; on a standard install they are different binaries.
   - After a browser update, re-baseline.
2. **Stabilise right before the shot.**
   - Finish finite animations and transitions; rewind infinite ones to t=0 and pause.
   - Add `transition: none`, hide the caret, and cover dynamic regions.
   - Wait for fonts and image decoding, then finish once more immediately before the capture.
3. **Control first.**
   - Capture the same page twice, in two launches. Expect 0 px.
   - A few isolated pixels that the region list names are acceptable after a 1:1 look.
   - A region over a component, such as a nav pill or a spinner, means something is still moving: fix the stabilisation.
4. **Baselines:** one per route × width × state × theme, rolled forward each round. (Unchanged.)
5. **Diff at threshold 0.** Name the element for every region and open its 1:1 crop. Same DOM with different pixels means the environment changed.
6. **Never use a percentage threshold,** and never judge detail from a full-page diff.

### 3. Requests to the script owners (new; S7 did not edit these files)

- **`compare.mjs --diff`:**
  - default threshold 0;
  - `<diff>.json` with regions (`vr/engines.mjs` `regions()`), and boxes drawn on the diff;
  - refuse, or with `--force` warn loudly, when the two sidecars differ (prototype: `vr/build-guard.mjs`).
- **`capture.mjs`:**
  - write the sidecar (`browserBuild()` is exported from `sweep.mjs` today; move it to `lib/env.mjs`);
  - `--mask sel`;
  - the strict stabilisation;
  - rewind infinite animations in `finishMotion`;
  - optional `--snapshot` for the DOM diff.
- **`lib/probes.mjs` `overflowCulprits`:** keep only culprits past the end edge; look left in RTL; drop full-width fixed or sticky bars that only follow a widened layout viewport. `sweep.mjs` does all three locally.

### 4. The width loop (extends `visual-qa.md` "What to check, per width" and `responsive.md` §8)

The protocol tree from my first report stands: sweep, then capture the worst widths, look at folds and 1:1 crops, run the regression against the last round, and stress before the critique. One addition:
- On a phone page with no device-width viewport, sheet cells and crops show what the screen shows, zoomed out. A full-page re-render would move the text away from its marks.

`SKILL.md` Phase 6: sweep every template touched; stress every key template before the critique.

### 5. Real content (extends `visual-qa.md` QA matrix, `multilingual.md` §4, `technical-qa.md` "Real data")

- **Default run:** `stress.mjs` runs the eight mutations that need no page knowledge. On held-out pages, 77% of their findings were worth fixing with the final scripts.
- **Data-aimed mutations** (long, empty, list-1, list-500) run only when pointed at data: `--targets ".product-name, td"` and `--list ".results"`. Unaimed, 19% of their findings were worth fixing.
- **On brochure pages,** list-0 findings about authored cards are dismissals; write them down.
- **RTL, `stress.mjs --only rtl`:**
  - On an LTR page it flips the page to RTL.
  - On a page that is already RTL, it checks physical `text-align: left` as the page stands, then flips to LTR to find what stays put. That flip is useful when the Arabic and English locales share one stylesheet (Sanad, S8).
  - When the page loads an RTL-only stylesheet (`bootstrap.rtl.css`), run it on the LTR page instead.
- **What to expect:**
  - sweep: about 85% of held-out keys worth fixing;
  - stress, default set: about 3 in 4;
  - late-shift: only moves that the filmstrip shows.

### 6. Looking at screenshots (extends `visual-qa.md` "Critique")

Unchanged: never ask "what changed?" without diff regions; judge detail from 1:1 crops; numbered marks on every sheet; don't let a model choose between close variants; give facts alongside the images.

### 7. `tools.md` › "This skill's scripts" (extends)

- Add rows for `sweep.mjs` and `stress.mjs`.
- Stress usage:
  - `node stress.mjs --url …` runs the default eight;
  - `--targets`/`--list` add the data-aimed mutations;
  - `--all` runs all twelve;
  - `--only rtl` checks mirroring.

### 8. `tools/regress` (new; suggested, not edited)

- **Groups:** sweep-lab 14/14 and stress-lab 17/17.
- **Controls:**
  - GOV.UK fixture: 0 sweep findings;
  - S8 bilingual en and ar: 0 RTL findings each;
  - en-broken and ar-broken: 8/8 each;
  - Sanad: 5/5 `text-align` rules, 0 others.
- Run `evidence/evidence-test.mjs` as a sheet regression test.

## Rejected ideas and why

- **Looser thresholds, or percentage thresholds.** Regressions change fewer pixels than the noise does, and percentages scale with page length.
- **A hard "the control must read 0 px" rule.** 1–2 isolated pixels occur between launches (Astro home, the VR fixture). Name them and look at them instead.
- **`browser.version()` as the build check.** It is identical for the two builds that differ by 4,045 px.
- **Stabilising once, well before the shot.** A late transition slipped through (Astro project, 1,741 px).
- **BackstopJS, Lost Pixel, Loki, reg-suit, or Storybook for a page redesign.** Same reasons as in my first report.
- **Running data-aimed mutations on every page.** On held-out pages, 8 of 42 of their findings were worth fixing.
- **Flipping a native-RTL page that loads an RTL-only stylesheet.** Its LTR locale loads other CSS, so the flip reports nothing actionable.
- **Loading-state checks that read layout without waiting for a painted frame.** They measure layouts nobody sees.
- **Counting mis-aimed findings as INT.** Relabelled as FP (cause: tool) throughout.

## Open questions and limits of this evidence

- **One rater, who wrote the tools.** A fresh rater would likely move some TP to INT.
- **The fresh held-out set is modest.**
  - Its 12 pages are about 7 distinct templates, since Bootstrap's RTL pages are twins of the LTR ones.
  - Bootstrap's examples use placeholder content, and blog-rtl lacks its docs-bundle nav-scroller CSS in this build.
  - Carbon and Primer are in-repo demos with the real CSS.
  - No large commercial site could be reached from this network.
- **Post-fix numbers are not held-out.** The first-pass numbers are the honest ones.
- **Shared `lib/probes.mjs`.** Other agents edited it during these runs. Only a new function was added; `overflowCulprits` is unchanged, which I checked with git diff.
- **Timings** come from a shared 4-CPU machine (load average 4–13), and another stream's benchmark ran concurrently.
- **Open cause:** the load-to-load label-wrap difference on Bootstrap's dashboard sidebar is unexplained. The guard (label-wrap only for mutations that change text) hides it rather than explaining it.
- **Unchanged limits from my first report:** zoom is emulated; the pseudo growth table is [K]; the structural diff keys elements by DOM path; model-critique gains were not lab-tested.

## Changes after review

1. **Sanad false positives on an already-RTL page (should-fix, agreed).**
   - `stress.mjs` now detects the page's direction and treats a native-RTL page as described in finding 21:
     - check physical `text-align: left` as it stands;
     - flip to LTR, keeping lang and text, and report only what stays put;
     - flip back to RTL for the evidence;
     - skip the flip when the page loads an RTL-only stylesheet;
     - leave avatar initials alone.
   - Tuning on S8's fixture exposed two more bugs, now fixed:
     - an `[aria-hidden] ~ *` exclusion hid a badge;
     - the thresholds were too coarse for small parents.
   - Result: Sanad ar and en each give only the 5 real `text-align` rules; S8 gives 8/8 on both broken variants and 0 on the logical-CSS ones; the Bootstrap RTL pages give 0.
   - I did not edit `tools/regress`; Sanad and S8 are suggested for it in §8.

2. **Blank evidence on RTL pages (should-fix, agreed and extended).**
   - Marks now sit in a clipped layer that is the size of the document and starts at its scroll origin.
   - Clips start from the scroll origin.
   - Zoomed-out phone pages are shot as the screen shows them.
   - Native-RTL flips are shot back in RTL.
   - An alignment test checks it: 9/19 → 19/19 cells, 13/19 → 19/19 crops, all current 35/35 (finding 17).

3. **FP-free headlines (should-fix, agreed).**
   - The headline is now TP ÷ keys, with INT and FP shares.
   - 44 tool-caused INT keys and 4 late-shift TP keys were relabelled FP (cause: tool).
   - The old held-out set's narrowness is stated in finding 13.
   - A frozen-script first pass on 12 fresh pages gave sweep 80% and stress 55% actionable.
   - The fixes it prompted:
     - aria-hidden placeholders counted as occupying space;
     - fixed full-width bars not named as culprits;
     - late-shift measured on painted frames;
     - the 6,000-run text cap no longer reads as empty space;
     - a lone "@" is no longer treated as an e-mail;
     - page chrome is treated as authored;
     - control labels are never emptied;
     - label-wrap only under mutations that change text;
     - the default mutation set narrowed to eight.
   - The removed `holdoutPreFix` record came from an earlier script version that this runner cannot reproduce.

4. **The threshold-0 control is brittle and the build is not known (should-fix, agreed with one correction).**
   - The rule now reads "0 px, or a few isolated pixels named and looked at".
   - A 60-pair, two-recipe control added the strict stabilisation step.
   - Recording only `browser.version()` and the path, as suggested, would not catch the shell/full switch. The sidecar also records the CDP product and rendering flags, and the guard prototype refuses mismatches.
   - The concrete silent-switch path is documented: `--gpu` and `--headed` launch full Chromium; a plain launch uses the headless shell when it is installed.

5. **Also corrected:**
   - The engine timing ordering (odiff fastest).
   - Motion given as a range.
   - The wrong "permit moves 346 px" claim.
   - The Milkline "unverified" dead band, found to be the text-run cap.

Files are in `/home/user/website-redesign-skill/`:
- `skills/website-redesign/scripts/sweep.mjs` (1,003 lines)
- `skills/website-redesign/scripts/stress.mjs` (899 lines)
- In `research/stage2/experiments/S7-visual-iteration-tools/`:
  - `run.mjs`
  - `results.json`
  - `verdicts.json`
  - `verdict-keys.mjs`
  - `fetch-sites.sh`
  - `lib/extra-pages.mjs`
  - `frozen/`
  - `evidence/evidence-test.mjs`
  - `vr/build-guard.mjs`
  - `vr/control.mjs`
  - `vr/timing.mjs`
  - `fixtures/rtl-truth.json`
  - `fixtures/evidence/`
  - `shots/evidence-before-after.jpg`
  - `shots/rtl-sanad-ar-sheet.jpg`
  - `shots/rtl-s8-en-broken-sheet.jpg`
  - `shots/holdout2-sweep-stemwren-home-sheet.jpg`
