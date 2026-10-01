# EVAL-NOTES — for the skill's maintainers

Run: blind evaluation, round 5, an Instagram-led florist whose order form is to become a bouquet builder people enjoy on a phone. Skill read from `round5/skill/website-redesign/` (read-only, not modified). Unattended: every open question became a labelled assumption. Branch `redesign`, 8 commits. The harness refused to write a file named `REPORT.md` ("subagents should return findings as text"); its content was returned in the final message instead, as the task allowed. `DESIGN.md`, `PRODUCT.md`, `SYSTEM.md` and `CRITIQUE.md` reference it.

## Time per phase (wall clock 17:58–19:50, about 1 h 50 min; tool calls were fast, so this understates thinking time)

| Phase | Approx. | Notes |
| --- | --- | --- |
| Reading SKILL.md + Phase 0 references | 10 min | framing, categories, discovery, interactive, templates, lessons, ledger |
| 0–1 Frame, discovery write-ups, audit (capture, audit ×2, a11y, states + payload, palette) | 12 min | the scripts made the baseline cheap |
| 2 Research | 5 min | live sites blocked; GOV.UK source read via sparse clone |
| 3 Direction (style tile, linen texture, ledger blur, DESIGN.md) | 15 min | |
| 4–5 Model, illustration engine, key screen, review, rollout, home | 35 min | the illustration was the main craft cost |
| 6 Verify (audits, a11y, widgets, states --axe, sweep, stress, perf, motion, parity, variants) | 25 min | about a third went on proving script findings |
| 7 Critique (blind fallback) + round-1 fixes | 15 min | |
| 8 Hand-off (links, credits, README, report, these notes) | 15 min | |

## What genuinely helped

- **Phase 0 classification with a "signature" row** (`framing.md` §1, `interactive.md` §3). It stopped me from fitting the builder into a page section, and the lesson "builder as five form chapters around a 2D sketch rejected; illustrated, game-like won" (`lessons-log.md`, Cake Junction) pushed fidelity to *illustrated* and the renderer to DOM + SVG at once. `interactive.md` §1's value test (swap / result / first ten seconds) wrote half the interaction section of `DESIGN.md`.
- **`interactive.md` §6 configurator rules**: model before screens, one pure module, needs vs taste, "prevent, explain, warn, repair — never silently", no free text in URLs. These became `bouquet-model.js` and its tests almost verbatim; "test transitions exhaustively" produced a 10,000-transition test.
- **`discovery.md` §2.5 "the logo versus the work"** and the photo set as a brand asset: exactly this client (2017 clip art vs a coherent sage-linen photo set). `palette.mjs --from logo.svg` revealing Open Color defaults (`#d6336c` = pink 7) gave a factual reason to drop the pink.
- **The anti-pattern note that "cream + serif + sage" is the most-named new tell** (`anti-patterns.md` "The model's prior"). Sage was *her* backdrop, so the note forced the rest of the direction away from cream and serif, which I would otherwise have drifted toward for a florist.
- **`states.mjs` with `record` + `parity.mjs --payloads`**: proving the new five-chapter flow sends a byte-identical body to the old one-page form was the single most reassuring check of the job.
- **`states.mjs --aria --each` walkthroughs** found a real defect nothing else did: tapping an out-of-season stem was a dead tap for sighted users (the refusal was only announced to screen readers).
- **`motion.mjs --spec`** found the re-tie animation jumping (my keyed view re-appended nodes, which cancels CSS transitions). I would never have seen that in screenshots.
- **`a11y.mjs`** found the missing `h1` once chapter 1 is hidden, and the 320 px reflow failure; **`sweep.mjs`** found the 360 px header overflow and the 3+1 swatch orphans; **`stress.mjs`** found grids without `minmax(0, 1fr)` and unbreakable names (relevant: `flowers.json` is regenerated daily, so names can change).
- **`audit.mjs`'s "text sits on an image" lead** listed `g.head > g.head-art` as text. I first read that as noise; it was real: my drawing code coerced arrays to comma-joined strings, putting stray `,` text nodes inside the SVG. Fixed, and the lead disappeared.
- **`perf.mjs`'s broken-baseline note**: it said the old site measured fast only because its Google Fonts request failed (certificate error in this environment). Without that I would have reported a false regression.
- **`fonts.mjs --google`** (tabular figures; Kalam has none, so it was kept off prices) and **`fonts.mjs --fallback`** (metric-matched fallbacks pasted straight into CSS).

## Where the skill was unclear, contradictory, silent or wrong

1. **`--kind` for a phone-first signature route contradicts the category dials.** `framing.md` §1: "a signature route runs `--kind app` for its chrome and controls"; `scripts/README.md` §4 makes `configurator` an alias of `app`. `audit.mjs` then flags "Body 17px with controls ≥ 44px — marketing density in a desk work tool", while `categories.md` "Mobile-first consumer" asks for 16–17 px body and ≥ 44 pt targets. The chrome of a phone configurator is mobile-consumer, not desk app. Needed: a `--kind mobile`/`consumer` profile, or the configurator alias choosing by device.
2. **PRODUCT.md trigger is ambiguous for a site with an existing order backend.** `discovery.md` §1/§5 triggers PRODUCT.md when "orders need a human decision… per-customer state, an operator workflow, capacity". Here there is an operator (the existing order service) and capacity (the same-day cut-off), but both are out of scope. I wrote a PRODUCT.md mainly for its "configurable thing" section. The skill could say "write PRODUCT.md whenever there is a configurable thing, even if the operator side is out of scope; mark lifecycle and operator sections as not built".
3. **Report ordering: two "firsts".** `SKILL.md` "Reporting": deploy blockers come before everything. `SKILL.md` "When to stop and ask": unattended assumptions are "listed first in the report". I put deploy blockers first, assumptions second. Say which wins.
4. **Silent: the fresh-reviewer requirement vs harnesses without a subagent tool.** `SKILL.md` Phase 7 and `visual-qa.md` "Critique" say a fresh reviewer is "not optional" when subagents exist, with a fallback otherwise. Here the only spawning tool (a remote session) could not see local files. The fallback text is fine, but the gate in `SKILL.md` ("the critique has no remaining no") then rests on a self-review. Worth stating how much weight a blind self-review carries and what the report must say.
5. **Silent: the key-screen review subset for signature routes.** `templates/critique.md` gives "1, 3, 4, 7, 15, 17, plus 6 on an expressive route or 25 on a productive one". A signature route is both; I answered 6 and 25. Say so, and consider adding 27 (quality bar) and 23 (breaks if) to the key-screen subset for signature routes. My own first "breaks if" (the bouquet stays in view) was only caught at Phase 7.
6. **Silent: how "breaks if" about what stays in view gets checked.** Captures at rest showed the bouquet; a state scrolled to the chapter's last control showed it gone. Suggest a rule: each "stays in view" promise gets a state that scrolls to the last control.
7. **`templates/DESIGN.md` motion table vs individual transform properties.** The `properties` column examples are `transform, opacity`. I used CSS `scale` (an individual transform property) so the land animation would not fight the positional `transform`; `motion.mjs` accepted `scale, opacity`. A sentence in `motion.md` §2 that individual transform properties are valid `properties` would help.
8. **Unclear: where the motion spec of a key page lives when the move needs setup.** `motion.md` §2 says the `DESIGN.md` table can't carry `setup`, so the wrap crossfade (needs Next first) went to `qa/motion-order-wrap.json`. Fine, but `templates/DESIGN.md` could show a pointer line for "rows with setup live in …".
9. **Gap: Instagram's in-app browser.** For a "brand lives on Instagram" brief, most traffic arrives in Instagram's WebView (no Web Share with files in some versions, unreliable downloads, a short viewport). Neither `responsive.md` nor `discovery.md` mentions it. I designed the share fallback for it but could not test it.
10. **`anti-patterns.md` "Pill shapes" vs the first-notice rule.** Not a contradiction, but it took a hunt: the old site's pink pill buttons were a first-notice thing, and my first build kept the *pill shape* in the new colour. The "refresh disguised as a redesign" check could mention shapes as well as faces, palettes and heroes.
11. **`art-direction.md` §2 asks for style tiles of two or three candidates "differing in family".** For a direction this tightly derived from one asset (her photo set), I built one tile with font candidates rather than three whole tiles, and recorded why the other candidates lost in words. That felt right, but the skill reads as if three tiles are required.

## Script defects (command → what happened → what I expected)

1. **`capture.mjs` (grow mode) does not pin viewport-unit heights on SVG elements.** `node scripts/capture.mjs --base … --paths / --widths 390` → the full capture of a hero whose inline `<svg>` is `height: 38svh` shows the bouquet pushed out of the (clipped) hero; only a eucalyptus fragment remains. `lib/env.mjs` `growToDocument()` filters `e instanceof HTMLElement` and reads `offsetHeight`, so `SVGSVGElement`s are never pinned. Probe: 321 px at an 844 px viewport → 1482 px after growing (`qa/probe-svh.out.txt`). Expected: pin SVG roots too, via `getBoundingClientRect().height`. The `-fold.png` and `--mode fullpage` were correct.
2. **`parity.mjs` ignores claims on the old site that are hidden at load.** The old home page had three testimonials in a rotator (two `display: none`). Only the visible one was reported as dropped; `--removed` for the other two then warned "matched nothing that was removed". Expected: hidden text counted (or at least a note that hidden text was skipped), since rotators and tabs are where testimonials live.
3. **`perf.mjs` writes `perf.md` into the current working directory.** `node scripts/perf.mjs --base … --before … --paths / /order/` left `perf.md` in the client repo root; `scripts/README.md` §8 does not mention it or an `--out`. Expected: an `--out` like the other scripts, or documentation.
4. **`states.mjs` overwrites its summary when run twice with the same `--label` into the same `--out`.** Two state files (order, home) with `--label after` → `states-after.md` held only the second run. Expected: the summary named by scenario file, or appended.
5. **`contrast.mjs` crashes with a stack trace on an unparseable argument.** `node contrast.mjs "#18261d on #8ea283"` → uncaught `TypeError: Could not parse … as a color` from colorjs.io. User error, but expected: a usage line.
6. **`sweep.mjs` flags a sticky bottom bar as a reading-order problem.** "`#order` children drawn in order 1,3,2" at ≥ 1024 px: the sticky action bar is drawn mid-page in the stitched capture. Expected: sticky and fixed elements excluded from visual-order checks.
7. **`a11y.mjs` reports browser UA shadow DOM as page markup.** "button "Show date picker" is named only by a title tooltip ⟶ div#picker" is inside Chromium's `<input type="date">`. Expected: skip user-agent shadow roots.
8. **`a11y.mjs` 1.4.12 "Text already clipped by overflow:hidden" counts visually hidden text.** On `section.hero` (which clips the large bouquet) the only clipped text was a `.visually-hidden` caption (`qa/probe-hero-clip.out.txt`). Expected: elements clipped to 1 × 1 px by the standard visually-hidden pattern excluded.
9. **`widgets.mjs` contract for a phone-only control fails at the default desktop size.** `{ "type": "disclosure", "button": ".menu-button" }` → "exists but is not visible at 1280×800 — give the contract "device": "phone"". The message is excellent; the README §5 contract examples just don't show `"device"`.
10. **`capture.mjs`'s widened-viewport warning doesn't name the culprit when it is clipped to 1 px.** The tray's visually hidden legends widened the phone layout to 1058 px; I found them only with my own probe (`qa/probe-wide*.mjs`), because the clipped legends sit inside a scroller and are 1 px wide. Expected: the warning names the element whose box extends furthest right, clipped or not.

Not defects, but friction: `a11y.mjs` found Chromium under `/opt/pw-browsers` without `CHROME_PATH` (README §1 says it reads only `CHROME_PATH`; that line looks stale — `widgets.mjs` I ran with it set, so I can't say). The scripts' `audit.mjs` "Phone [safe-area]" information line appears on every phone view without `viewport-fit=cover`, which is noise for a design that isn't edge-to-edge.

## What felt like box-ticking

- **Filling all 27 critique checks myself as the builder** after the key-screen subset had already been answered. The checks that found things were 23 (breaks if), 15/21 (labels) and 16 (states); the walkthroughs found more than the checklist did. With no fresh reviewer, the long table is mostly a record.
- **The full convergence-test paragraph set** when the brand layer was almost entirely fixed by the client's own photo set. `art-direction.md` §5's "short form" covers a supplied logo and brand guide; it could also cover "a photo set fixes the ground and materials".
- **`SYSTEM.md`** for a five-chapter checkout on a static site with no component library. I wrote a short one because Phase 4 says "SYSTEM.md for product UI"; its state matrix was useful, but the token section mostly repeats `DESIGN.md`.
- **`stress.mjs` RTL mutation** on an English-only local shop's site: every finding was dismissed in writing. It runs by default; for a site with no RTL in scope it could be opt-in.

## Workarounds

- **Google Fonts blocked in the browser** (certificate error through the proxy), while `curl` could fetch them: fonts were downloaded with curl and self-hosted (which the skill recommends anyway).
- **No live references**: GOV.UK guidance was read from a sparse git clone; everything else was marked as recalled.
- **The old form uses `alert()`/`confirm()`**: stubbed with `eval` steps in `states.mjs` so the payload could be recorded.
- **No order backend**: `qa/serve.py` stands in for `POST /api/order` and logs bodies; `states.mjs` route mocks were used for recordings.
- **Chapter states behind progress** (later chapters only open after earlier ones are valid): `--storage` seeds (`qa/seeds/details.json`, `check.json`) let `audit.mjs` and `a11y.mjs` open them directly. This worked well: the `--storage` lesson from round 3 paid off.
- **No subagent**: blind self-review fallback (blurred sheets and no-text render first, first impression written before re-reading `DESIGN.md`).
