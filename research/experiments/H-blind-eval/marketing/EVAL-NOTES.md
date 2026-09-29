# Evaluation of the website-redesign skill on the Milkline job

*Written by the blind-evaluation agent (fresh context; given only the skill path, the fixture repo and the user request). Saved verbatim from its hand-back, because the harness does not let subagents write report files. The skill changed under it once: `a11y.mjs` was edited mid-run, so its final pricing-page run used a newer version than the home-page run.*

## Time per phase (wall clock, about 72 min in total)

| Phase | Minutes | Notes |
| --- | --- | --- |
| Setup: read SKILL.md, README and code | 0–2 | |
| 0 Frame | 2–3 | brief written together with the audit |
| 1 Audit | 3–9 | 10 captures, `audit.mjs`, `a11y.mjs` ×2, palette, dembrandt via CDP, app capture, form walk |
| 2 Research | 9–12 | reachability checks; `govuk-frontend` and `@carbon/type` measured from npm |
| Brief, audit and references written up | 12–13 | |
| 3 Direction | 13–18 | about 130 KB of reading; `fonts.mjs` ×2, palette, contrast, logo outlining, 3 style tiles |
| 4 System and 5 Build | 18–27 | |
| 6 Verify | 27–52 | mostly tool runtime: `a11y.mjs` about 45 s per run × 6, a 400 s `--no-js` hang, 12 Lighthouse runs |
| 7 Critique | 52–58 | |
| 8 Hand-off | 58–66 | |
| Report | 66–72 | |

## Reference files actually read

- **Read in full:** `SKILL.md`, `framing.md`, `categories.md`, `audit.md`, `research.md`, `resources/README.md`, `resources/inspiration.md`, `art-direction.md`, `lessons.md`, `ledger.md`, `anti-patterns.md`, `design-theory.md` (Parts A–D), `resources/type-and-colour.md`, `imagery.md`, `design-systems.md`, `implementation.md`, `visual-qa.md`, `technical-qa.md`, `templates/DESIGN.md`, `templates/critique.md`.
- **Read only the sections the skill pointed to:** `ui-ux.md` §1, §10, §11; `web-design.md` §2–3; `accessibility.md` §1–3, §6–7, §11; `motion.md` §2 and §6; `responsive.md` §8; `performance.md` §6.
- **Not read:** `app-ui.md`, `dataviz.md`, `multilingual.md`, `logo-design.md`, `resources/assets.md`, `resources/libraries.md`, `resources/tools.md`, `templates/SYSTEM.md` (reasons under "Skipped").

## Where the skill was unclear, contradictory, too long, silent or wrong

1. **Error summary placement.** `accessibility.md` §6 says to put "an **error summary** at the top of `main` (above the `h1`)". That is wrong for a marketing page whose form sits at the bottom: the summary would appear several screens away. I put it at the top of the form, and `widgets.mjs` passed it.
2. **Showing the product "in its real tokens".** `categories.md` says "the marketing site shows the product in the product's real tokens", and `implementation.md` says "rendered at the product's real type size with its real tokens". The skill is silent when the product itself (`app/`, out of scope) wears the template look being removed. Following it literally would bring back the indigo, Inter and emoji. I used the new tokens at close to the app's size (16 px fragment text, against the app's 13 px) and wrote the deviation down.
3. **Saturated faces on the shortlist.**
   - `resources/type-and-colour.md` says "This list is a starting point… not a replacement default", then lists IBM Plex Sans, Newsreader and Nunito with no mark, although all three are in `saturated-fonts.json`.
   - It also offers "Commissioner (flare axis)" among the warm humanists as an alternative to DM Sans "(which has no tabular figures)". Commissioner has none either: `fonts.mjs` reported "✗ proportional even with tnum".
4. **The skill's own recipe converges.** `web-design.md` §3 offers "Diagram / process | a drawn path with nodes and milestone art" and a hero object "on its own panel". The ledger's Brandigade row reads "calendar hero on a sky panel… drawn timeline with milestone art". The ledger test caught the sibling risk, but the recipe causes it. I kept the line, because it is the company's name, and dropped the milestone art.
5. **The ledger comparison can't be run.** `visual-qa.md` asks for "the blurred first viewport beside the old site and the last `ledger.md` project". The ledger holds text only, with no captures or links. I compared in words.
6. **No fresh reviewer.** SKILL.md says "Prefer a fresh-context reviewer (a subagent…)". No subagent tool was available here, and the only fallback is self-critique, so the critique is marked as self-review.
7. **The content-free test doesn't match the tool.** Critique template #12 says "Content-free render (`* { color: transparent }`, logo hidden)". `capture.mjs --variant no-text` does not hide the logo `<img>`, and it erases every `currentColor` SVG, which here was the whole graphics layer.
8. **"Small jobs" is undefined.** SKILL.md says "Small jobs take the fast path: 0 → 1 → 4 → 5 → 6 → 8" but never defines small. I treated two pages under a redesign brief as the full path.
9. **The skill tells the agent to edit itself mid-job.** Phase 8 says "Add a row to `references/ledger.md`", and "Learning from corrections" says "Change the skill so it is less likely next time". Both have an agent writing into a shared skill during a client job, which was impossible here. The ledger row is in the report instead.
10. **"Push" has no conditions.** Phase 8 says "commit, push the branch", with no guidance for when the remote is not a preview host. Here it was a local fixture, so I didn't push.
11. **Too long to act on in parts.**
    - Before any code, Phase 3 requires `art-direction`, `lessons`, `ledger`, `anti-patterns` and `design-theory`. The pre-build gate adds `type-and-colour`, `web-design` §2–3, `imagery` and `accessibility` §2. That is about 130 KB.
    - Rules repeat across files: the reveal rule appears in 5 files, the mono rule in 4.
    - Design-theory Part A (Rams, Vignelli, Gestalt) did not change a single decision here.
12. **No tool for fallback metrics.** `design-theory.md` C4 asks for "Metric-matched fallbacks computed from the actual fallback face and weight (fontaine, Capsize…)". No script does this, although `fonts.mjs` already loads fonts. I wrote a fontTools snippet (size-adjust 103.97%).
13. **Mismatched `--kind` in an example.** `audit.md` §5 runs `--paths / /pricing /app … --kind marketing`, which puts the app route under the marketing kind. `framing.md` says "Run `audit.mjs` with the matching `--kind`".
14. **Dangling evidence references.** Several references cite `research/streams/…` as evidence, but that folder sits at the repo root, outside `skills/website-redesign/`. A standalone install loses those references.
15. **"Never merge directions" is ambiguous** when every direction must visualise the product. Tile B (product-driven) and tile A share the product fragment, while `art-direction.md` says "Never merge parts of two directions".
16. **Useful fallbacks.** When the environment blocked things, the skill's fallback instructions were clear and worked: `research.md` "Without a browser or network", `imagery.md` "If you cannot fetch images", and "none must be argued".

## Script problems (command → output)

- **S1 `capture.mjs --no-js` hangs forever.**
  - `node capture.mjs --base http://localhost:5761 --paths / --widths 1440 --out … --label nojs --no-js` printed nothing for 400 s and was killed.
  - On control pages (pricing, a static tiles page), `timeout 60 …` ended it with "Terminated, exit 143".
  - A probe with JS disabled showed: "sync evaluate: resolved / fonts.ready: resolved / setTimeout sleep: TIMEOUT after 3000ms".
  - Cause: `lib/env.mjs` `settleOnce` awaits `sleep()`, built on `setTimeout`, inside `page.evaluate`. In a script-disabled page it never fires, and there is no timeout. I worked around it with my own screenshot script.
- **S2 `audit.mjs` false positive: skip link.** It reported "✗ Focused control hidden under a fixed/sticky element: a.skip "Skip to content" under header.site-header". A probe showed `{"topmost":"skip","z":"100"}`, and the screenshot shows the link on top. Lines 94–100 test rectangle overlap only and ignore stacking order.
- **S3 `a11y.mjs` false positive: skip link.** It reported "WARN keyboard 2.4.12 Focused element partly covered (2/5 sample points) ⟶ a.skip". The sample points (line 331) sit 2 px inside the corners, which is outside an 8 px border radius.
- **S4 `a11y.mjs` heading order.** The outline is built from CDP's full accessibility-tree order, not document order. On the old pricing page it printed "h2 Simple, transparent pricing · h2 Questions · h3 Which parlours… · h3 Up to 150 cows…", although the plan `h3`s come first in the DOM. The level-jump check runs on that order (lines 118–162).
- **S5 `a11y.mjs` inconsistent verdicts.** Identical inputs on the old home page got "FAIL 2.4.7 No visible focus indicator ⟶ input" for the first and "WARN 2.4.13 Focus indicator weak: 0px changed…" for the other three. Probably caret-blink timing.
- **S6 `a11y.mjs` forced colours.**
  - The stated reason was wrong: "No visible focus in forced-colors mode (box-shadow focus rings are removed — use outline)" was reported for a page that uses `outline: none` and has no box-shadow ring.
  - It also missed a real failure: the navy logo `<img>` became invisible on a black High Contrast ground. I found that by looking at `forced-colors.png`.
- **S7 `audit.mjs` contrast false positives that come and go.** The first run after the build reported:
  - "`a.skip` #ffffff on #ffffff = 1:1": the link is off-screen and has its own navy background.
  - "`th > span.visually-hidden` #4a6280 on #14365c = 1.96:1": visually hidden text.

  Later runs, with nothing in either element changed, did not report them.
- **S8 `parity.mjs` claim pattern.** It reported "✗ "6.77 mS"": the claim regex's `ms\b` (milliseconds, case-insensitive) matches "mS/cm". Meanwhile "33.1 L" and "−8.8 L" are not treated as claims at all.
- **S9 `parity.mjs` preserved-list gaps.**
  - It never compares `data-*` attributes or the form `method`, so the preserved analytics hook (`data-track`) could be deleted without a warning.
  - When nothing is lost, "## Per page: ids, form fields, metadata" prints a bare heading with no "✓ none", unlike every other section.
- **S10 `widgets.mjs` form-errors.** `{"submit": "#visit-form button[type=submit]"}` produced "FAIL form-errors ✗ test error: locator.waitFor: Timeout 3000ms exceeded." The script builds `${c.form} ${c.submit}` (line 184). The header comment doesn't say the selector is relative, and the error doesn't print it.
- **S11 `widgets.mjs` live contract on a form.** It reported "FAIL live ✗ [4.1.3] Nothing announced; visible message not in a live region: "There is a problem…"". The contract cannot fill fields first, so a form's async status can't be tested. For validation errors it also contradicts `accessibility.md` §7.6 ("focus does the announcing").
- **S12 `capture.mjs --variant no-text`.** Transparent text also erases `currentColor` SVG icons, and the logo is not hidden.
- **S13 `capture.mjs --element` includes sticky UI.** The 390 px `.panel` shot had the sticky header painted across the middle of the element.
- **S14 `compare.mjs --labels` splits on commas.** `--labels "before, no JS" "after, no JS"` produced the panels "before" and "no JS". This is undocumented.
- **S15 `palette.mjs` with a dark brand colour.**
  - For navy (L 0.33), the solved step 12 "text (high contrast)", `#283f59`, is *lighter* than step 9, the brand itself.
  - Step 8, labelled "strong border / focus", is about 2.45:1 in every scale, below the 3:1 WCAG 1.4.11 needs, so the label invites a failing focus ring.
  - The neutral scale's step 9 is labelled "solid (brand)".
- **S16 `audit.mjs` misses a heading inversion.** On the old phone page it reported "Heading sizes closer than 1.2× apart: 48→44", but didn't say the `h2` was *larger* than the `h1`.
- **S17 Heuristic noise in `a11y.mjs`.**
  - "Focus jumps back up the page (See pricing → Your name)" fires on an ordinary two-column form chapter.
  - "Looks like a heading" fires on the stat figures "2 days" and "6am–10pm".
- **S18 Environment: the skill changed mid-test.** `a11y.mjs` was modified by another process at 16:17:46 (skill repo commit `f223e4b`, 16:21). My final pricing run used the new version (grouped "(×2)" output); the home run used the old one.
- **What worked well:**
  - Chromium was found without `CHROME_PATH`.
  - `fonts.mjs --google` worked with `NODE_USE_ENV_PROXY=1`.
  - dembrandt worked through `BROWSER_CDP_ENDPOINT`.
  - The generic-look signals were accurate.

## Rules and checks that changed the design for the better

- **Sample the logo and look at the brand family** (SKILL commitment 3; `audit.md` §4). The palette and the motif came from the unused 2021 mark. The family check also showed the app is off-brand, so the mark is the only real asset.
- **"Verify extracted files are real"** (`audit.md` §1). It exposed the logo's live-text wordmark falling back without Nunito, which led to outlined logo files.
- **The truth and parity rules:**
  - "2 days" moved next to its source.
  - "Most popular" and "AI-powered" were removed as unsourced, and flagged for the user.
  - Parity made me restore a dropped "365 days".
- **The `a11y.mjs` placeholder-label and non-text-contrast checks.** They led to labelled fields with 2 px borders at 6.3:1; axe alone had passed the old placeholders.
- **The reveal hard ban, plus `audit.mjs`'s no-JS render.** Content is now finished by default; the old site hid 6 cards.
- **`fonts.mjs`** rejected Commissioner, which has no tabular figures.
- **`contrast.mjs` with APCA** led me to lighten the red on navy: it passed WCAG at 5.55:1, but APCA Lc −52 is headline-only.
- **Running `audit.mjs` after the build** caught tells I had introduced myself: the founders' stripe and the middle-dot meta strings. Replacing them produced a real `<table>` for the flagged cows, which is better data design.
- **`a11y.mjs` reflow at 320 px** found my table forcing 382 px; it now stacks.
- **Element-level inspection** (`visual-qa.md`) found icons collapsing in narrow cells and the phone header wrapping to two rows. The sticky-UI budget made the phone header static.
- **The headline test, "show the product" and "imagery must be argued"** produced the hero panel built from real demo data instead of a stock photo or a wireframe.
- **The GOV.UK error pattern**, measured from npm, gave the error summary.
- **"Proof only as big as it is", plus the pricing-tier tells,** turned pricing into a herd-size table.
- **Style tiles** caught that Atkinson Hyperlegible Next reads as technical at display size.

## Rules that felt like box-ticking or got in the way

- **"Keep is shorter than replace + create"** can be gamed by choosing how finely to count.
- **"5–7 candidates across ≥ 3 material families."** Three of mine (parlour board, tail paint, milk statement) were strawmen written to meet the count. Only the "refuses" line was useful.
- **"Several independent passes" in the heuristic evaluation** is performative for one agent.
- **The ledger/blur comparison and critique #22** ("beside the Phase 2 references") cannot be done when nothing can be rendered.
- **The DESIGN.md template** has about 15 sections, which is a lot for a two-page site. The Accessibility-block gate before code was worth it; the rest is heavy.
- **The volume of theory in Phase 3** (Part A, Norman's levels, Itten's contrasts) did not change any decision.

## Skipped, and why

- **`app-ui.md` and `SYSTEM.md`:** no product surface was in scope.
- **`logo-design.md`:** the mark was kept and only outlined.
- **`multilingual.md`:** English only.
- **`resources/assets.md`, `libraries.md`, `tools.md`:** no libraries were added, and photos were unreachable.
- **`dataviz.md`:** probably should not have been skipped. The herd strip is a small unit chart, but nothing in the skill routes a marketing product fragment to `dataviz.md`.
- **Live reference research:** the network was blocked, so I used npm packages instead.
- **Fresh-context reviewer:** no subagent tool.
- **Screen-reader test:** no assistive technology available.
- **Push, and the ledger and lessons rows:** the remote was the local fixture, and the skill folder was read-only for this test.
- **`capture.mjs --no-js`:** it hangs, so I replaced it with my own script.
- **Dark mode:** the use scene is daylight, so no dark theme was built.
- **200% zoom by hand:** covered by `a11y.mjs` reflow at 640.
- **`REPORT.md` and `EVAL-NOTES.md` in the repo:** the harness blocked writing them, so the content was returned as text.
