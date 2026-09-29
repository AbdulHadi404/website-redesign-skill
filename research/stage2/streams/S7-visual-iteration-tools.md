<!-- Stream S7, saved from the lab agent's hand-back (lab version; the amendment after review is still running and will replace this file). Experiment folder: research/stage2/experiments/S7-visual-iteration-tools/. -->

# S7: Screenshot-driven iteration, visual regression, viewport sweeps and real-content stress

## What the skill already knew

- **Capture and measurement.** `capture.mjs` captures five widths (1440/1280/1024/768/390, plus 320/360/844 in the responsive pass). It finishes motion, decodes images and warns about overflow and text cut at the viewport edge. `audit.mjs` measures one width at a time: overflow culprits, clipped text, dead bands and targets.
- **States and diffs.** `states.mjs` drives states and seeded fixtures (0/200 items, 500 responses, delays). `compare.mjs` draws before/after, blurred and grid sheets. Its `--diff` is pixelmatch at threshold 0.1.
- **What was missing.** `visual-qa.md`'s QA matrix lists content cases (0/1/100+ items, 70-character names, long URLs, missing images, large numbers, translations, RTL) and 200%/400% zoom. Nothing generated those cases or looked between the sampled widths. `tools.md` named Playwright `toHaveScreenshot`, odiff, reg-cli, BackstopJS and Lost Pixel as options without choosing one.
- **Stage 1 (not repeated here).** The fresh-context reviewer, blur and removal tests, bounded rounds, "verify the verifier", and the marked accessibility tree for walkthroughs (experiment K).

## Findings

### Visual regression

1. **`compare.mjs --diff` reports "0 pixels differ" for a visible brand-colour change.**
   - The primary button went from #1d4ed8 to #2563eb: ΔE2000 7.2, and white-text contrast dropped from 6.70 to 5.17.
   - pixelmatch at 0.1 (compare.mjs) and Playwright's default 0.2 both count 0 px at 1280 and at 390. The change needs threshold ≤ 0.05 (11,123 px). A ΔE2000 0.8 token drift is caught only at threshold 0.
   - [L `results.json` vr.thresholdSweep; V `compare.mjs` source `threshold: 0.1`; ΔE from colorjs.io]
2. **Pixel counts cannot tell a regression from environment noise.** At 1280 and threshold 0.1:
   - a 1 px shift of the button row changes 1,530 px;
   - sub-pixel text rendering changes 6,400 px;
   - the headless-shell binary instead of full Chromium changes 4,045 px;
   - a display-P3 colour profile changes 11,792 px.

   No threshold or pixel budget separates them. The only fix is to keep the environment constant. [L vr.engineRows, thresholdSweep]
3. **With the environment constant and captures stabilised, a re-render differs by 0 px.**
   - "Stabilised" means: finite animations finished; infinite ones rewound to t=0 and paused; caret hidden; dynamic regions covered by a solid box.
   - The result held at every threshold, at both widths, across two runs.
   - So threshold 0 is usable inside the agent's own loop. [L vr thresholdSweep, control rows]
4. **Two captures of the same page by today's `capture.mjs` differ by 6,056 px at threshold 0 (225 px at 0.1).**
   - The page's only motion was a spinner and a pulsing bar.
   - Cause: `finishMotion()` pauses infinite animations wherever they happen to be.
   - [L results.motion, `vr/capture-motion.mjs`; V `lib/env.mjs` `if (iterations === Infinity) a.pause()`]
5. **Engines on the same PNG pairs**, stabilised captures, 6 regressions and 4 noise kinds at 2 widths:

   | Engine (as configured) | Regressions caught /12 | Noise flagged /8 | ms per pair (1280 · 390) |
   | --- | --- | --- | --- |
   | pixelmatch t0.1 (compare.mjs today) | 8 (both colour changes missed) | 6 | 597 · 383 |
   | pixelmatch t0.05 | 10 (ΔE 0.8 missed) | 6 | same engine |
   | pixelmatch t0 | 12 | 6 | same engine |
   | Playwright comparator (t0.2) | 8 | 4 (P3 passes) | 347 · 498 |
   | Playwright ssim-cie94 | 10 | 6 | 3,280 · 4,113 |
   | odiff t0.1 (`--aa` the same) | 8 | 6 | 237 · 535 |
   | resemble 0.1% (BackstopJS) | 9 (the removed badge at 1280 missed) | 6 | 887 · 1,126 |
   | reg-cli defaults (thresholds 0) | 12 | 6 | 571 · 842 (per image, process included) |
   | DOM + computed-style snapshot diff (prototype) | 12 | 2 (both are the sub-pixel `translateX(0.3px)`, a real CSS change) | 78 · 41 |

   - The noise every pixel engine flags is always the same kinds: sub-pixel text noise, the other Chromium binary and the P3 profile.
   - With raw captures (spinner running, live timestamp), every engine flagged the plain re-render.
   - Timings come from a shared 4-CPU machine (load average 9–17); compare them only with each other.
   - [L vr.engines; V reg-cli README "0 by default"; V BackstopJS `engineTools.js` default `misMatchThreshold ?? 0.1`]
6. **End-to-end tools** (baseline, then one run per variant; out of the box and with the dynamic region masked):

   | Tool | Out of the box | Dynamic region masked | Seconds per run | Setup and maintenance |
   | --- | --- | --- | --- | --- |
   | Playwright Test `toHaveScreenshot` 1.63 | every run fails on the timestamp (12/12 caught, 8/8 noise) | 8/12 (both colour changes missed at t0.2), noise 4/8 | 8.0–9.5 | a config and a spec; active (1.63.0) |
   | BackstopJS 6.3.25 | 11/12, noise 7/8 | 9/12 (removed badge at 1280 = 0.09% < 0.1%; ΔE 0.8 both widths), noise 6/8 | 3.2–3.5 | 19.6 MB unpacked, 18 dependencies; last release 2024-09-07 |
   | Lost Pixel 3.22 (open-source mode) | 12/12, noise 6/6 | 12/12, noise 4/6 (sub-pixel text, P3) | 4.1–4.2 | 22 dependencies; last release 2024-11-14; pins playwright-core 1.47.2, which cannot launch full Chromium 141, only the headless shell |

   Sources: [L vr.pipelines; V npm metadata; V `lost-pixel/node_modules/playwright-core/package.json`; L the launch test this session: full chromium-1194 "Target page, context or browser has been closed", headless shell OK].
   - Playwright's defaults are confirmed from the installed package: threshold 0.2, animations "disabled", caret "hide", scale "css", and it retakes until "two consecutive stable screenshots". [V `@playwright/test` `types/test.d.ts`; V `playwright-core/lib/coreBundle.js`]
7. **Percentage thresholds hide small regressions on long pages.** BackstopJS at 0.1% missed a removed "New" badge at 1280 (0.09% of the page). [L]
8. **What an agent can act on.**
   - A pixelmatch mask clustered into 8 px cells gives 1–5 boxes for a local regression. Examples: the 1 px shift gives 5 boxes over the hero buttons; the removed badge gives one 40×16 box. Naming the smallest element under each box's centre names the fault (removed badge → `article.card`).
   - A font fallback or a reflow gives 58–144 boxes. The structural diff groups those into one cause: "font face FrauncesMissing: error", "42 elements moved by (0, 60.5) px", "a.btn-primary background-color rgb(29,78,216) → rgb(37,99,235)".
   - The structural diff alone separates noise from change: when the DOM is identical and only pixels differ, the difference comes from the environment.
   - [L vr.domDiff, vr.hybrid (20/20 cases classified; the two sub-pixel cases count as changed, which they are in code)]
9. **Hosted services (documentation only, not tested).**
   - Chromatic: default `diffThreshold` 0.063, YIQ distance, to absorb anti-aliasing. [S chromatic.com/docs/threshold]
   - Argos: threshold 0–1, default 0.5 "tuned to absorb anti-aliasing noise"; ignore a recurring diff by fingerprint; Playwright integration through `argosScreenshot`. [S argos-ci.com docs]
   - Percy Visual Review Agent (October 2025): bounding boxes around meaningful changes, natural-language summaries, "filters 40% of visual changes that are rendering noise". [S browserstack.com release notes]
   - All three need an account and CI. The skill's local loop does not need them. Their output shape (boxes, element, cause) is the target.
10. **Storybook, Loki and reg-suit.**
    - Loki 0.35.1: last release 2024-08.
    - @storybook/test-runner 0.24.5: active, but only useful where a project already has Storybook.
    - reg-suit 0.14.5: a CI wrapper around reg-cli.
    - The skill works on pages and flows, so building Storybook would test a harness the redesign doesn't have. [V npm metadata]

### Width sweep (`sweep.mjs`, new)

11. **Speed.** One page load per device class, resized in place: 147 widths plus two zoom cases in a median 24.1 s per page. The median was 140 ms per width across 15 pages, on a loaded machine. [L sweep.totals]
12. **Seeded recall: 14 of 14** defects on the sweep lab. Each defect sits between the widths a capture run samples. [L sweep-lab.recall]
13. **Precision** by finding key (check + element), each checked by eye in the 1:1 crops and sheets:
    - pages used while tuning: 59 keys; TP 52, INT 7, FP 0;
    - those without seeded defects: 36 keys; TP 31, INT 5, FP 0;
    - held-out pages never used for tuning (Hallam & Price, `basket.html`, `a11y-wizard.html`, Astro `/work/h20/`): 17 keys; TP 15, INT 2, FP 0.

    TP means real and worth fixing; INT means real but intended or harmless; FP means not real, or pinned on the wrong element. These are after tuning. The development runs produced about ten false-positive classes, all fixed; they are listed under Experiments. One more appeared when the held-out set was re-run: text autosizing on a page without a viewport meta, fixed. [L verdicts.json, results.json]
14. **What the default capture widths miss.**
    - 9 of the 36 non-seeded findings (25%) never occur at 1440/1280/1024/768/390.
    - 6 of 36 (17%) don't occur even with 320/360/844 added.
    - Examples:
      - On the slop and Milkline heroes, from 1520 px the inline `img.shot` fits on the buttons' line. The primary call to action drops from y 553 to y 1229, below the fold, beyond the widest default capture.
      - Pricing and feature grids squeeze to 16–18 characters a line at 704–808.
      - Astro's skill boxes do the same at 800–960.
      - Astro's header social icons wrap 5 + 1 at 992–1056 (a 1024 capture shows it, but nothing points at it).

    [L sweep.totals.notAtDefaultWidths, notAtResponsiveWidths]
15. **Overflow names the element past the edge, not the one pushing it.**
    - Larder's Sign-in button is pushed out by a `nowrap` nav.
    - In right-to-left pages the shared probe looked the wrong way and named full-width blocks. `sweep.mjs` now looks for culprits past the left edge, or past innerWidth − clientWidth when a phone's layout viewport has widened.
    - The underlying fix belongs in `lib/probes.mjs` (owner). [L]
16. **ReDeCheck's failure types** are collision, element protrusion, viewport protrusion, incorrect wrapping and small-range layouts; its small-range threshold is 5 px. ReDeCheck itself is Java, Firefox 46 and Selenium (2018) and was not run. `sweep.mjs` adds three checks modelled on it: protrusion out of a drawn box, a lone item on the last row of a wrapping grid, and arrangements that hold at one sampled width only. [V github.com/redecheck/redecheck `RLGAnalyser.java`, MIT; S ACM ISSTA 2017 snippets]

### Real-content stress (`stress.mjs`, new)

17. **Seeded recall: 17 of 17** content-fragility defects on the stress lab. Each defect is invisible with the page's own copy and working API. [L stress-lab.recall]
18. **Precision** by finding key:
    - pages used while tuning: 135 keys; TP 105, INT 29, FP 0, 1 not verified;
    - without seeded defects: 73 keys; TP 45, INT 27, 1 not verified;
    - held-out pages, first run: 27 keys; TP 11, INT 13, FP 3;
    - held-out pages, re-run after the three fixes that first run prompted: 25 keys; TP 13, INT 12, FP 0.

    The FP-free result on the held-out set is after fixing what it showed. The high INT share comes from brochure pages: `long`, `list-0` and `list-500` treat authored cards and badges as data. These mutations are leads to point at data routes with `--targets` or `--list`. [L verdicts.json, results.holdoutPreFix, results.holdout]
19. **Which mutations found real faults on pages that were not seeded:**
    - **pseudo** (+35%, and more on short strings). A 25-character compound word runs out of GOV.UK's error summary at 390. Astro's display headings are cut at the viewport edge under a page-level clip. Permit cards overflow at 768. Milkline's `nowrap` greeting overflows.
    - **numbers.** KPI tiles on both dashboards overflow.
    - **rtl.** `text-align: left` on 6 of 8 sites. A toast placed with `right:`, a drawer and a skip link placed with `left:`. The `left: -9999px` skip link gives an RTL page 9,999 px of sideways scroll. GOV.UK Frontend's grid columns float left.
    - **no-images.** Unsized logos and crests jump 16 → 56 px and 0 → 36 px when they arrive.
    - **slow.** Milkline: CLS 0.93 while loading. The permit site moves 346 px after first paint.
    - **errors / offline.** Uncaught `d.zones is not iterable` and "Failed to fetch" on the permit and Milkline pages, with no message on screen.

    [L results.stress, verdicts.json]
20. **Cost.** 92–148 s per page for 12 mutations at three widths; network mutations run at the first width only. Median per mutation: 3.3–3.9 s for text and list mutations, 7.3 s for no-images, 6.3 s for slow. [L stress.targets.perMutation]

### How a model should look at screenshots

21. **Models miss most single-property changes between two screenshots.**
    - DiffSpot has 4,400 web-UI pairs, each differing by one CSS property.
    - The best model finds 40.7% of the changes (Gemini 3.1 Pro).
    - Claude Opus 4.7 finds 31.2% (41.2 / 30.5 / 21.8 by easy, medium and hard tier), with 99.6% specificity on unchanged pairs.
    - Neither pixel magnitude nor CLIP distance predicts which changes are missed.
    - [V github.com/Tencent/DiffSpot README and leaderboard image]
    - So the skill must never ask a model "what changed?" without a diff pointing at the change.
22. **Downscaling hides detail.**
    - This session's tools showed images at most 2,000 px on the long edge ("original 1636×3894, displayed at 840×2000"). [V this session's Read output]
    - A 390 px phone page captured at DPR 2 and 8,000 CSS px tall is 780 × 16,000 px. It is shown at 0.125 scale: 16 px text becomes 4 px and a 1 px shift disappears.
    - Details must be judged from 1:1 crops, composition from folds.
    - At sheet scale, 13 px text in the sweep and stress sheets was unreadable; the crops were legible. [L]
23. **Crops and marks help small details.** Model accuracy falls as the subject gets smaller, and cropping to the region helps. [S "MLLMs Know Where to Look", ICLR 2025] Numbered marks on regions improve grounding. [S Set-of-Mark, arXiv 2310.11441] The sweep and stress sheets draw numbered boxes with a numbered caption list.
24. **Close calls are near coin flips.** Model judges predict human UI preferences only slightly above 50% when the human difference is small. [S "MLLM as a UI Judge", arXiv 2510.08783] Don't let a model pick between close variants.
25. **Extracted text helps; self-revision helps only strong models.** In Design2Code, adding extracted text helped every model; comparing a render with the reference helped only the strongest (GPT-4V). [S arXiv 2403.03163] Give the reviewer measured facts (sweep and stress lists, DOM diff lines) alongside the images.
26. **Interaction matters more than static renders.** Visual feedback plus interaction raised GUI-code success from 21.7% to 28.3%. [S "Coding with Eyes", arXiv 2604.19750] Failures under runtime interaction are invisible in static screenshots. [S RILA, arXiv 2609.02088] Trained change captioners suppress noise better than pixel-based regression testing. [S WUICC, arXiv 2607.01728]
27. **No evidence was found for grid overlays** as an aid to model judgement of alignment. `audit.mjs` measures 1–4 px edge drift directly. [S: none found; K]

## Experiments

Everything is in `research/stage2/experiments/S7-visual-iteration-tools/`.

- **Rebuild everything:** `npm install && ./fetch-sites.sh && node run.mjs`. This takes about 60 minutes on 4 shared CPUs.
- **One section:** `node run.mjs vr | motion | sweep | stress | holdout | holdout-sweep | holdout-stress | sheets | score`.
- **Relabel:** `node verdict-keys.mjs` lists findings without a verdict. After labelling in `verdicts.json`, `node run.mjs score` re-applies the verdicts.
- **Captures** go to `captures/` (git-ignored). Sheets go to `shots/` (2.9 MB, this repository's fixtures only). The folder minus `captures/` and `node_modules` is 3.8 MB.

| Experiment | Built | Result |
| --- | --- | --- |
| Visual-regression fixture | `fixtures/vr/index.html?v=…`: a page with a live timestamp, a random count and a spinner. Six regressions: 1 px shift, heading font fallback, token ΔE 7.2, token ΔE 0.8, removed badge, one-sentence reflow. Four noise kinds: re-render, `translateX(0.3px)` on text, headless-shell binary, display-P3 profile. 1280@1 and 390@2. `vr/capture-set.mjs` captures raw and stabilised | engine and tool tables above; `shots/vr-diffs-390.jpg` |
| Engines | `vr/engines.mjs`: pixelmatch (as compare.mjs calls it, and with AA pixels counted), Playwright comparator (default and ssim-cie94), odiff, resemble, reg-cli, a threshold sweep, and region clustering | table in finding 5 |
| End-to-end tools | `vr/pipelines.mjs` and `vr/pw/`: Playwright Test, BackstopJS (Playwright engine) and Lost Pixel, each out of the box and masked | table in finding 6 |
| Structural diff | `vr/domdiff.mjs` (snapshot of every element's box, 31 computed properties, own text, pseudo-elements and font-face states, keyed by DOM path) and `vr/run-domdiff.mjs` (plus the element that owns each pixel region) | 12/12 regressions, no environment noise flagged, 41–78 ms |
| capture.mjs determinism | `fixtures/vr/spinner.html` and `vr/capture-motion.mjs` | 6,056 px differ at t0 |
| Sweep lab | `fixtures/sweep-lab/` plus `truth.json` (14 seeded) | 14/14 |
| Stress lab | `fixtures/stress-lab/` (the Larder page with a `fetch` of `api/orders.json` and a skeleton) plus `truth.json` (17 seeded) | 17/17 |
| Pages used while tuning | 6 regression fixtures from `tools/regress/fixtures/`; the permit old build (home and apply); Milkline home and app; the Astro 7.3.5 "portfolio" example, 4 routes (MIT, commit faac481) | tables below |
| Held-out pages | the Hallam & Price fixture (4 routes), `basket.html`, `a11y-wizard.html`, Astro `/work/h20/` and `/about/` | sweep 17 keys, 15 TP / 2 INT / 0 FP. Stress, first run 11 TP / 13 INT / 3 FP; re-run after the fixes 13 TP / 12 INT / 0 FP |

The permit redesign ("new" build) is not in the repository; only its captures are. The old build was used.

**Sweep, per page** (all from `results.json`):

| Page | Keys | TP / INT / FP | Not at the 5 default widths | Wall time |
| --- | --- | --- | --- | --- |
| sweep-lab (seeded) | 23 | ranges: 44 / 5 / 0 | 5 | 28.6 s |
| slop | 8 | 22 / 0 / 0 | 3 | 29.7 s |
| dashboard, app-traps, card, states-overflow | 1–4 each | all TP | 0–1 | 21–25 s |
| permit home, permit apply | 2 each | all TP | 0 | 23–25 s |
| Milkline home, Milkline app | 2, 1 | all TP | 1, 0 | 26–28 s |
| Astro home, about, work, project | 5, 2, 3, 1 | 10 TP, 6 INT | 4 | 24–26 s |
| GOV.UK fixture | 0 | none | 0 | 20 s |

**False-positive classes found and fixed while tuning** (these are where a naive checker goes wrong):

- 1 px sub-pixel "overflow" with no element past the edge.
- Whole-card links treated as buttons, giving wide-control, label-wrap and "CTA below the fold" findings.
- A form's Continue button taken as the page's call to action.
- The call to action changing identity between widths.
- Siblings with the same short selector interleaving their width ranges.
- The overlap check ignoring a title's own `overflow: hidden`.
- Gradient-filled links not counted as buttons.
- 42 clipped cells from one clipping card (now reported once, as that card).
- Pages without a viewport meta: text autosizing changes control sizes between widths and between loads.
- A skip link parked at `left: -9999px` named as the overflow culprit.
- Right-to-left culprit search looking the wrong way.
- Page sections, table cells and prose paragraphs detected as lists.
- The whole page's text matched as the "error message".
- Images matched by URL when two images share a file.
- A gradient pill counted as "text sitting on an image".
- Baseline keys that included positions, so a list cut to one row reported its old faults as new.
- "Squeezed" reported for a two-line label that became one line.
- Long tokens in authored headings.

## Decision guidance for the skill

### 1. `resources/tools.md` › "Visual regression and comparison" (replaces the paragraph)

> **Decision.**
> - Inside the skill's own loop: pixelmatch, which is already a dependency of `compare.mjs`, at threshold 0 on stabilised, masked captures from the same machine and browser build; changed regions reported as boxes and named elements; and a DOM/computed-style snapshot diff that states the cause. In the fixture test no threshold separated a 1 px shift (1,530 px) from rendering noise (4,045–11,792 px). Fixing the environment and stabilising the capture made a re-render 0 px.
> - In a project that already runs Playwright Test: `toHaveScreenshot` per width, with `mask` on dynamic regions and `threshold` of 0.05 or lower. The default 0.2 missed a ΔE 7 brand-colour change. Generate baselines in the CI image, never on a laptop.
> - Do not add BackstopJS or Lost Pixel. Their last releases were 2024. BackstopJS's 0.1% area threshold missed a removed badge. Lost Pixel pins Playwright 1.47, which cannot launch current full Chromium.
> - Do not add Loki or a Storybook runner to a page redesign.
> - reg-cli (Wasm, thresholds 0) and odiff are acceptable engines but add nothing pixelmatch lacks.
> - Hosted review (Argos, Chromatic, Percy) only when the team wants a review UI in CI.
> - A diff never judges a redesign; it guards iterations and later changes.

### 2. `visual-qa.md`: new subsection "Regression diffs while iterating", after "Capturing reliably"

1. **Same environment or no diff.** Same machine, same Chromium build, same flags and same DPR. After a browser update, re-capture the baseline; do not loosen the threshold.
2. **Stabilise:**
   - finish finite animations; rewind infinite ones to t=0 and then pause;
   - hide the caret;
   - cover dynamic regions with a solid box: `time`, relative dates, counters, live prices, carousels, video, `<canvas>`, ads and third-party iframes, and anything marked `[data-dynamic]`;
   - wait for fonts and images.
3. **Control first.** Capture the same page twice. It must read 0 px. If it doesn't, the capture is unstable; fix that before trusting any diff.
4. **Baseline naming.** One baseline per route × width × state × theme, named like the captures. The baseline rolls forward each round, so compare against the previous round, never the old site.
5. **Diff at threshold 0.** For each changed region, name the element and look at its 1:1 crop. If the change was intended, accept it. If not, fix it. If the DOM is identical and only pixels changed, it is the environment: re-baseline.
6. **Never** use a percentage threshold. Never judge detail from a full-page diff image.

### 3. Requests to the script owners (new)

These are for the owners to implement; S7 did not edit these files.

- **`compare.mjs --diff`:**
  - default threshold 0 (today 0.1), with `--threshold`;
  - write `<diff>.json` with regions (8 px clustering, as in `vr/engines.mjs` `regions()`);
  - draw the boxes on the diff;
  - print "0 px" only when it is 0.
- **`capture.mjs`:**
  - `--mask sel` (solid boxes);
  - rewind infinite animations to `currentTime = 0` before pausing (`lib/env.mjs` `finishMotion`);
  - optional `--snapshot`, writing the `vr/domdiff.mjs` snapshot beside each capture so that `compare.mjs --dom a.json b.json` can name causes.
- **`lib/probes.mjs` `overflowCulprits`:** keep only culprits past the end edge; in RTL, look left (and at innerWidth − clientWidth on a widened phone viewport). `sweep.mjs` does this locally today.

### 4. The width loop protocol

This extends `visual-qa.md` "What to check, per width" and `responsive.md` §8. The first checkbox changes from "captures at the widths above" to the protocol below.

```
after every layout or CSS change, per template touched
 ├─ node scripts/sweep.mjs --base <url> --paths <route> --out sweep      (~25 s per page)
 │    ├─ every ✗ range: fix, re-sweep
 │    ├─ every △: open its crop in <slug>-crops/; fix it, or write the dismissal in DESIGN.md
 │    └─ "Breakpoints" and "back and forth": capture both sides of each and look
 ├─ node scripts/capture.mjs --widths 1440,1280,1024,768,390,<the sheet's worst widths>
 ├─ look: the -fold.png at each width, then the sweep crops at 1:1; never judge detail from a full-page sheet
 ├─ regression against the last round (§2): changed regions only, each one intended or fixed
 └─ before the critique, and again after the last round of fixes:
      node scripts/stress.mjs --base <url> --paths <key templates> --out stress   (~2 min per page)
        ✗ fix · △ judge · a network fault on a data route → keep it as a states.mjs scenario in the project's tests
```

- In `responsive.md` §7, add a note: the sweep's zoom cases are 1280×720 at 200% (640×360) and at 400% (320×180), desktop, not touch.
- In `SKILL.md` Phase 6, add one line: sweep every template touched, and stress every key template before the critique.

### 5. Real content

This extends `visual-qa.md` "The design QA matrix" (content row), `multilingual.md` §4, and `technical-qa.md` "Productive surfaces › Real data".

- Content row: "generated by `stress.mjs`; seeded scenarios that must be kept go into `states.mjs`".
- Multilingual: before building RTL, run `stress.mjs --only rtl` for what will not mirror (physical `left`/`right`, `text-align: left`, parked skip links). Run `--only pseudo` for German-length labels.
- Real data: point `long`, `empty` and `list-*` at the data with `--targets` and `--list`. On brochure pages their findings are mostly authored content; dismiss those in writing.
- **Stress usage:**

```bash
node scripts/stress.mjs --base http://localhost:3000 --paths / /products /account --out stress
node scripts/stress.mjs --url http://localhost:3000/products --only pseudo,long,numbers,empty,list-0,list-500 \
     --list ".results" --targets ".product-name, .price, td"
node scripts/stress.mjs --url http://localhost:3000/ --only rtl                   # before an RTL build
node scripts/stress.mjs --url http://localhost:3000/app --only slow,errors,offline --api "**/api/**"
```

- **Reading a stress run.** `<slug>-stress.md` has a table of mutation × width, then "what breaks what" (element × mutation), then the findings. `<slug>-stress-sheet.jpg` shows each mutation scrolled to its worst finding with numbered boxes. `<slug>-slow.jpg` is the throttled-load filmstrip. `crops/` holds 1:1 crops.
- **Sweep usage:**
  - `node scripts/sweep.mjs --url <page>` or `--base … --paths …`
  - `--step 8,16`
  - `--widths list`
  - `--no-zoom`
  - `--measure 20,90`
  - `--cta sel`
- **Reading a sweep run.** `<slug>.md` has a table of ranges with ✗/△/·, the element and the first width's detail, then breakpoints, flips and small-range layouts. `<slug>-sheet.jpg` shows the worst width per device class. `<slug>-crops/` holds 1:1 crops. Exit code 1 on any ✗.

### 6. Looking at screenshots

This extends `visual-qa.md` "Critique", step 1 and the fallback. The reviewer packet gets the sweep and stress sheets, crops and `.md` files as well as the captures. The rules:

- **Never ask "what changed?".** Give the model the diff regions. Models find 31–41% of single-property changes by eye.
- **Detail from crops.** Judge detail from 1:1 crops, composition from folds.
- **Numbered marks.** Every sheet shown to a reviewer carries numbered marks and a caption list.
- **Close calls.** Don't use the model to choose between close variants.
- **Facts with images.** Pair every image with its measured facts.

### 7. `resources/tools.md` › "This skill's scripts" (extends)

Two new rows:

- `sweep.mjs`: what breaks between the widths a capture samples (320–1920 plus zoom), as width ranges with the element named, a sheet and crops.
- `stress.mjs`: what breaks with real content and real networks (pseudo-localisation, long tokens, empty fields, big and negative numbers, missing images, RTL, 0/1/500 items, slow, 500, offline).

### 8. `tools/regress` (new)

Add groups `sweep` and `stress` with `sweep-lab` and `stress-lab` and their `truth.json`, asserting 14/14 and 17/17. Add the GOV.UK fixture as a sweep control (0 findings). Suggested for the owner; S7 did not edit it.

## Rejected ideas and why

- **Relaxing thresholds to absorb cross-machine noise.** Real regressions change fewer pixels than the noise does (1,530 vs 4,045–11,792). Fix the environment instead.
- **Percentage thresholds (BackstopJS 0.1%).** They scale with page length, and a removed badge on a long page fell under them.
- **Adopting BackstopJS, Lost Pixel, Loki or reg-suit.** Their last releases were 2024, they are heavy (BackstopJS is 19.6 MB), and Lost Pixel cannot drive current full Chromium. They add nothing the skill's pixelmatch plus Playwright Test lacks.
- **SSIM comparator.** 6–10× slower, it still flags the noise, and it still misses the ΔE 0.8 drift.
- **odiff as the default.** Faster on some pairs, but the same detection and a native binary to install.
- **Building Storybook to test visually.** A page redesign has no component harness, and building one would test the harness.
- **Binary-searching every breakpoint to 1 px (ReDeCheck).** Steps of 8 and 16 px locate a range well enough to fix. Arrangements that hold at one sampled width are reported instead.
- **Asking a model to spot differences, or to choose between close variants.** DiffSpot and "MLLM as a UI Judge" (findings 21 and 24).
- **Grid overlays for alignment judgement.** No evidence found; `audit.mjs` measures edges directly.
- **Long tokens and `empty` on all text.** On brochure pages they were mostly noise from authored copy. They are now limited to data-like slots (list items, cells, names, e-mails, URLs, `--targets`).
- **Treating label wrap as a fault in stress.** A button that wraps is the right fallback (`technical-qa.md` "Buttons wrap below 380 px"). Only navigation labels, and buttons wrapping to 3 or more lines, are flagged.

## Open questions and limits of this evidence

- **One rater, who wrote the tools.** Every verdict is the tool author's; a fresh rater would likely mark more INT and some TP as INT. Precision on the tuning pages is after tuning; the held-out numbers are the honest ones. Sweep held-out: 15 TP / 2 INT / 0 FP of 17. Stress held-out: 11 TP / 13 INT / 3 FP on the first pass; 13 / 12 / 0 after the fixes that pass prompted.
- **Small real-site sample.** One real open-source site (Astro's portfolio example, 6 routes) plus fixtures that imitate real old sites. No large commercial site could be reached from this network.
- **Unverified finding.** One stress finding stays unverified: the Milkline `list-500` dead band did not reproduce by eye.
- **Held-out pages without a data API.** On the Hallam pages `errors` and `offline` were skipped, so those mutations were exercised only on the permit and Milkline fixtures.
- **Zoom emulation.** Zoom is emulated as a resized viewport at DPR 1. That matches media-query behaviour, but it is not Chrome's own zoom. [K]
- **Mutation calibration.** The pseudo-localisation growth table (+100% up to 10 characters … +35% for long text) follows IBM's translation-growth guidance from memory [K]. RTL uses fixed Arabic sample strings rendered in DejaVu Sans.
- **Slow and throttling.** "slow" uses 562 ms round trip, 1.4 Mbit/s and 4× CPU; local servers make light pages load fast even so. Layout-shift CLS only counts shifts on screen, hence the extra "late-shift" check, which compares section positions.
- **Timings.** All timings come from a shared 4-CPU container (load average 9–17). They compare only within this run.
- **The structural diff is still a prototype** (`vr/domdiff.mjs`). It keys elements by DOM path, so inserting a node renames every later sibling. It needs a stable-id strategy before it goes into `capture.mjs` or `compare.mjs`.
- **Not tested in the lab.** Whether crops, numbered marks and a fresh reviewer measurably improve an agent's own critique was not tested; there was no subagent tool. The evidence is DiffSpot [V] and the papers [S].
- **Not covered by these scripts.** The fold check auto-picks a call to action; override it with `--cta`. `sweep.mjs` does not exercise hover or pointer changes. `stress.mjs` does not open menus or dialogs; `states.mjs` does.

Files:
- /home/user/website-redesign-skill/skills/website-redesign/scripts/sweep.mjs (new, 898 lines)
- /home/user/website-redesign-skill/skills/website-redesign/scripts/stress.mjs (new, 819 lines)
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/run.mjs
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/results.json
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/verdicts.json
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/verdict-keys.mjs
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/fetch-sites.sh
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/fixtures/ (`vr/`, `sweep-lab/` + `truth.json`, `stress-lab/` + `truth.json`)
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/vr/ (`engines.mjs`, `pipelines.mjs`, `domdiff.mjs`, `run-domdiff.mjs`, `capture-set.mjs`, `capture-motion.mjs`, `pw/`)
- /home/user/website-redesign-skill/research/stage2/experiments/S7-visual-iteration-tools/shots/ (8 JPEG sheets, 2.9 MB)
