# Evaluation notes for the skill's maintainers

*Saved by the evaluator from the agent's hand-back: the harness refused the agent's own write of its report, so it returned this file as text too.*

Skill snapshot: `c6e5884 (merge of the second-pass audit)`, installed read-only.

Fixture: the five-page site of a two-partner accountancy practice. The owner asked for "Apple-style 3D as you scroll". The run was unattended, with network access limited to GitHub, npm, PyPI and Google Fonts.

## Time per phase (wall clock, from `date` stamps; about 1 h 35 min in total)

| Phase | Time | Notes |
| --- | --- | --- |
| 0 Frame | 17:55–18:03 (about 8 min) | SKILL.md, framing.md, categories.md, discovery.md (triage only), interactive.md (the 3D request) |
| 1 Audit | 18:03–18:10 (about 7 min) | `audit.mjs` (1 min 32 s), capture, `a11y.mjs` (about 45 s per page), `states.mjs` with recording |
| 2 Research | about 4 min | Network blocked; I npm-packed govuk-frontend into `discovery/raw/`; the rest is category knowledge, labelled as such |
| 3 Direction | about 10 min | lessons, ledger, art-direction, anti-patterns, design-theory, web-design, motion; `fonts.mjs` and `palette.mjs`; DESIGN.md; logo outlining; three style tiles |
| 4–5 System and key screen | 18:15–18:25 (about 10 min) | Key-screen blur changed the direction (navy header) |
| 5 Rollout | 18:25–18:32 | |
| 6 Verify | 18:32–19:02 (about 30 min) | The longest phase; mostly script run time (sweep, stress, perf 3–4 min each) and fixing what they found |
| 7 Critique | 19:02–19:12 | Self-review only (no subagent tool) |
| 8 Hand-off | 19:12–19:30 | Re-runs, README, CREDITS, report |

The brief expected two to three hours. I used about 1.6. The scripts made the measurable gates cheap, so most of the time went to reading and to fixing what they found.

## Where the skill was unclear, contradictory, silent or wrong

1. **Silent: how to answer a client who names a technique.** `interactive.md` §1's value test and the 3D row in `anti-patterns.md` ("Purpose-gated techniques") settled the *decision* in minutes. Nothing tells you how to *report* a no to the owner, though: what to take from his reference instead, what the full version would cost, how to offer it as a separate decision. The Reporting section of SKILL.md only covers deploy blockers and decisions the user owns. I improvised section 3 of the report.
2. **Contradictory: font preloading.** `art-direction.md` §4 item 6 ("at most two files preloaded") and the `performance.md` §1 budget row ("≤ 2 files preloaded") read as advice to preload. On this site, preloading both files cost about 370 ms of first paint on slow 4G with `font-display: swap`. The skill never says "measure whether preloading helps".
3. **Silent: scroll-linked motion that isn't a reveal.** `motion.md` §5 ("a reveal's range must end at `entry 100%`") is written for reveals. For a progress-style fill on an 8 px bar, that rule makes the animation complete within 8 px of scroll. Nothing says to use a named `view-timeline` on a taller block. I departed from the rule and justified it in DESIGN.md.
4. **Unclear: does a kept typeface *category* count as a kept first-notice thing?** SKILL.md ("Distance…") and `art-direction.md` §4–§5 say the typeface must change unless it is a brand asset. I replaced Georgia with Literata — still a serif, chosen from the serif wordmark per `design-theory.md` C3 ("a serif wordmark wants a serif or high-contrast sans"). The skill doesn't say whether "same classification, different face" counts as a change. It's adjacent to the "serif display" house prior in `anti-patterns.md`.
5. **Silent: kept hue family versus surviving hero shape.** The five-things check compares elements, not massing. Keeping navy as a brand asset let the old "white bar + navy box" massing survive, and only the key-screen blur beside the *old* site caught it. The `visual-qa.md` key-screen review does put the old site in the grid, which saved this; but `art-direction.md` §5 frames the blur test as against the ledger only.
6. **Polarity in `templates/critique.md`.** In most rows "yes" means pass. Check 3 (swap test) and check 14 invert that ("A yes here caps the whole critique"). In a Yes/No column this is easy to mis-score; I wrote "no (passes)". Suggestion: phrase every check so that "yes" is the pass.
7. **Unclear: "start `states.json` on the old build now".** This is good advice. But the moment a select becomes radios, the old file's `select` steps fail on the new build. `scripts/README.md` §6 covers it ("one file per build with the same state names"), but SKILL.md's Phase 1 note doesn't say so, so I hit the failure first.
8. **Wrong for this harness: the fresh-context reviewer.** SKILL.md Phase 7 and `visual-qa.md` "Critique" assume a subagent tool exists or not. Here there was no Agent/Task tool. The remote-session tool exists but runs in another container that can't see local captures. The fallback procedure was usable. It could add: "a remote session without your files is not a reviewer; don't publish client captures to give it access".
9. **Box-ticking:**
   - `templates/DESIGN.md` has full-length sections that a five-page static site barely uses: the seam test, productive surfaces, a contrast table that is then repeated in the Accessibility block.
   - The 24-row critique table on a site with no imagery: four rows were "n/a".
   - With every live site blocked, Phase 2's take/leave table is mostly recalled knowledge, which `research.md` itself warns against.
   - Declaring `--derived` patterns for computed day counts felt like paperwork, though it does force writing the formula down.
10. **Silent: what a fixed-fee, data-driven static site should do about no-JavaScript.** The skill says content must be visible without JavaScript and data must come from files, but not how to reconcile them in a build-less static repo. I wrote a small pre-render tool (`tools/prerender.mjs`) that shares one renderer with the browser. A paragraph in `implementation.md` would help.

## Script defects (command → what happened → what I expected)

1. **`parity.mjs`, single-digit prices.**
   - Command: `node parity.mjs --before :4821 --after :4820 --crawl 40 --source data --derived "/^(in )?\d+ days$/i" --out qa/parity.md`.
   - Happened: "✗ £8" reported as unsourced, although `data/fees.json` has `{"turnover":"Per employee","price":8,"per":"month"}`. The cause is line 588: `bareNumber(c).length >= 2 && (…regex… || sourceValues.has(…))`. The length gate also blocks the `sourceValues` match.
   - Expected: the "⚠ same figure?" treatment given to £45 and £285, or at least "single-digit, cannot verify" rather than ✗.
2. **`motion.mjs`, scroll-linked rows.**
   - Command: `node motion.mjs http://127.0.0.1:4820/ --spec qa/motion-deadlines.json --jpeg --out qa/motion-deadlines`.
   - Happened: "✗ year-fill — static: changed in one frame (no animation)". Two causes. The scroll trigger jumps rather than stepping, so a scroll-linked animation resolves in one frame. And because the page sets `html { scroll-behavior: smooth }`, the filmstrip shows unrelated parts of the page mid-scroll.
   - Expected: `scripts/README.md` §8 says scroll-driven animations are "scroll-linked: no duration or easing check". Instead the row fails. My probe (`qa/probe-yearfill.mjs`, `qa/probe-yearfill.txt`) shows the fill is position-mapped (0 → 0.25 → 0.87 → 1), reversible, and static under reduced motion.
3. **`motion.mjs`, scroll-row placeholder.** A spec row with `"duration": "-"` fails with 'duration token "-" not found'. `motion.md` §2's own example table uses "—" (em dash) for the scroll row. Expected: both placeholders accepted, or the JSON form documented as "omit the field". Omitting it worked.
4. **`capture.mjs`, grow mode and IntersectionObserver.** `-fold.png` is cut from a viewport grown to the full document height. So UI driven by IntersectionObserver is captured in a state no real screen shows. On `/contact/` the header Call button rendered "quiet" because the submit button 3,000 px down counted as on screen. Expected: take the fold at the real viewport height before growing, or warn in `scripts/README.md` §3.
5. **`sweep.mjs`, "text over text" on display type.** It reported the £45 figure overlapping its caption, and the deadline day "31" overlapping the month, at most widths. These are font content-area boxes: Literata's content area is 1.485 em at line-height 1.05. The ink is clear (`captures/sweep/home-crops/01-overlap-768.png`, `02-overlap-768.png`). Expected: ink-based overlap, like `audit.mjs`'s glyph-clipping measure.
6. **`sweep.mjs`, measure.** "99 characters per line" on the finder sentence counts every `<option>` inside the two `<select>`s as running text. Expected: skip option text.
7. **`audit.mjs`, suspected heading false positive.** "Heading levels skipped: 1→3 at 'David Hallam'" on `/team/` while the page had a visually hidden `<h2>` (clip/clip-path pattern) before the `h3`s. axe's heading-order didn't flag it. I made the `h2` visible afterwards, so I couldn't re-confirm. Expected: count visually hidden headings, since they are in the accessibility tree.
8. **`states.mjs`, axe on the mocked response page.** States whose last step submits a form to a mocked route end on the mock's HTML. axe then failed the state for the *fixture's* missing `lang` ("html-has-lang serious") and marked it ✗. Expected: a note that the final page came from a route mock, or skip axe on mocked documents. I fixed the mock.
9. **`capture.mjs`, web fonts in captures.** Style-tile pages that link Google Fonts captured silently in fallback fonts, because captures don't use the proxy (by design: `CAPTURE_PROXY`). `audit.mjs` reports undeclared fonts, but `capture.mjs` gave no warning. Expected: a one-line "N web fonts failed to load" on captures.
10. **Documentation nit, `perf.mjs`.** It writes `perf.md` to the current directory by default. The `scripts/README.md` §8 example doesn't show `--out`, so the report landed in the client repository's root until I moved it.

## What genuinely helped

- **The key-screen blur beside the old site and the ledger.** It caught a real refresh signal (the old hero's massing) while changing direction still cost minutes.
- **Reading the ledger as a set.** "Five of five outputs Restrained, white ground, blue-family action colour" pushed me to a Committed strategy with gold as the action colour — a choice argued from this brand rather than habit. The archetype rule in `art-direction.md` §5 resolved "navy and gold is the accountancy cliché" cleanly.
- **The `interactive.md` §1 value test, plus the 3D row in `anti-patterns.md`.** A fast, defensible answer to the owner's 3D request, which also produced the right alternative (a level-3 fee finder whose result is the visitor's own).
- **`audit.mjs` console errors.** They surfaced `hpTrack is not defined` on the baseline, which led to finding that the old form's validation never ran, and that `enquiry_start` counts page loads.
- **`states.mjs` with `record`, plus `parity.mjs --payloads`.** The form's payload proved byte-identical; the one deliberate change (blank business name) was isolated as the deploy blocker.
- **`widgets.mjs` contracts** (disclosure, live region, form-errors, roving) and `a11y.mjs`. Concrete pass/fail evidence in under a minute per page.
- **`sweep.mjs`** found two real bugs that my five capture widths missed: the "Recommendation" radio overflowing at 360–408 px, and the nav wrapping at 960–976 px.
- **`stress.mjs`, slow network** found the layout shift when the module revealed controls and the tax-year line.
- **`perf.mjs` old-against-new** made the font-preload regression visible and measurable.
- **`palette.mjs`, `contrast.mjs`, `fonts.mjs`.** Fast and exact; `fonts.mjs --fallback` produced the metric overrides.
- The commitment against monospace, and the house-recipe description in `anti-patterns.md`, kept the type decisions honest.

## What I had to work around

- **No subagent tool:** a blind-as-possible self-review, labelled in `CRITIQUE.md`.
- **No image library (no PIL):** I wrote a small pngjs crop script in my scratchpad to inspect long captures; `compare.mjs` covered grids.
- **Every reference site and image host blocked:** I used govuk-frontend's npm package as the one inspected reference, and argued "no photography" in writing.
- **The harness refused to write `REPORT.md`,** so its content is in my final message, as the brief allowed.
- **The logo SVG relies on live Georgia text and doesn't fit its own box:** I outlined it with fontkit (already installed with the skill's scripts) and Gelasio, keeping the original file.
