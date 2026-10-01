# Experiment H: blind evaluations of the revised skill

**Question.** When a fresh agent is given only the skill, a repository and a user request, does the revised skill produce professional, company-specific work? And where does the skill itself get in the way?

"Fresh" means the agent did not see the research, this conversation or the design intent.

**Method.**

- **Fixtures.** Each fictional company is a realistic, templated repository with specific flaws:
  - **Milkline** (`fixture/`) is a dairy herd-health SaaS. Its marketing site is violet AI-startup slop with an unused brand mark. Its herd dashboard has status shown only as coloured dots, a table clipped on phones, a permanently empty "Alerts" card, and a fake "Synced" message.
  - **Sanad** (round 2) is a bilingual Arabic/English invoicing dashboard for Saudi small businesses: purple-gradient chrome, two digit systems, Hijri dates on the Arabic page, constant KPI deltas, and a phone view showing 2 of 8 columns.
  - **Azul & Co** (round 3) is a tile shop: an ecommerce storefront with collection, product, cart and checkout pages.
- **Instructions to each agent.** Follow the skill phase by phase, deliver the work and the report, and write `EVAL-NOTES.md`: an honest account of where the skill was unclear, contradictory, silent or wrong, every script defect, what helped and what was box-ticking.
- **Isolation.** No user is available, so questions become labelled assumptions. The network is limited to GitHub, npm, PyPI and Google Fonts.

## Round 1 (skill at commits `88dd2ba`–`f223e4b`; it changed during the run, see lessons)

| Run | Surface | Result | Evidence |
| --- | --- | --- | --- |
| `marketing/` | Milkline marketing site, redesign | The palette and motif come from the unused 2021 mark (navy/sky, droplet and "the line"). The headline speaks in the farmer's words. A real product fragment built from the demo herd, labelled as illustrative. Proof tied to its source. A herd-size pricing table. The trial-form contract was kept byte for byte. Contrast failures went from 34 to 0 and a11y FAILs from 33/25 to 0/0. Generic-look signals went from 12 to 0. | `marketing/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `captures/` |
| `app/` | Milkline herd screen, field tool, rethink | The screen is now exceptions-first: flagged cows under a pinned tag search, with status shown as a word, a shape and a colour. Targets are sized for gloves. A freshness chip shows how recent the data is, and there is an honest offline mode. Fake KPI deltas were removed. The brand comes from the logo. Clipped cells went from 122/287 to 0, and a11y FAILs from 63 to 0. | `app/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `SYSTEM.md`, `captures/` |

Neither output looks like the SaaS kit or like this skill's old house style. Both were derived from the company's own mark and world.

### What the agents found, and what changed

**The skill assumed a desk and a marketing page.**

- The desk-dashboard numbers and the "low density" app tell pushed a gloved, 5 am, patchy-signal field tool the wrong way.
- The distance tests, the critique's swap test and half of `DESIGN.md` were written for expressive pages.
- *Changed:*
  - a field/frontline profile and `audit.mjs --kind field`
  - convergence tests scoped to the brand layer on productive routes
  - a productive reading of the template
  - freshness and offline honesty (`app-ui.md` §7b)

**Rules demanded checks the tools could not perform.**

- "Render every state" had no tool, so both agents wrote their own.
- The ledger comparison needed captures that the ledger did not keep.
- *Changed:*
  - `states.mjs`
  - ledger rows now carry capture paths
  - critique checks that match the tools

**Script defects.** The agents found about 30, and a third of their verification time went on disproving false positives. All were reproduced and fixed, then regression-tested on the lab fixtures:

- `capture.mjs --no-js` hung.
- Focus rings on `::after` were not seen.
- Sticky-bar z-order was ignored.
- The accessibility tree was read out of document order.
- Corner sampling fell outside rounded corners.
- "Enter does nothing" was reported after a refresh that re-rendered identical text.
- `compare.mjs --dir` failed silently.
- `palette.mjs` labelled a step "focus" at 2.48:1.
- `parity.mjs` misread units, missed `data-*` hooks, and matched claims inside other numbers.
- The no-text variant erased icons.
- Element shots included sticky bars.
- Labels were split on commas.
- `fonts.mjs` gave confusing names.

**Contradictions.**

- The font shortlist recommended faces that the saturated list flags.
- Commissioner was offered as a tabular alternative and has no tabular figures.
- The error summary was placed above the `h1` even for forms at the bottom of a long page.
- The skill asked agents to edit itself mid-job, and to push to any remote.
- The chapter table read like a recipe that re-created an earlier ledger project.

All are fixed. See `lessons.md` (2026-09-28 rows) and the commits "Script fixes from the blind evaluation", "Skill content from the blind evaluation" and "states.mjs".

**Method lesson.** The skill changed under both agents while they ran. Evaluations now run on a frozen snapshot (a detached worktree), and findings are applied afterwards.

## Round 2 (frozen snapshot `42ec5bf`)

The Sanad bilingual dashboard is chosen to exercise what round 1 did not touch:

- Arabic and English
- RTL
- financial figures
- digit systems and calendars
- charts

| Run | Surface | Result | Evidence |
| --- | --- | --- | --- |
| `sanad/` | Sanad invoicing dashboard, Arabic (default) and English, fintech | Brand layer derived from the supplied 2024 mark: the teal arch, the saffron keystone (reused as the current-place marker), and IBM Plex Sans Arabic, named in the logo's SVG. Every amount has one digit system, two decimals, right alignment and tabular figures in both languages. Gregorian dates on both pages (the Arabic page had been showing Hijri). Four KPI deltas that were constants in `app.js` removed; four totals redefined, each with its rule written under it. A past-due panel shows that 13 of 14 unpaid invoices are late, not the 3 the old panel listed. The new-invoice dialog accepts Arabic digits. a11y FAILs 16 → 0 in both languages; widget contracts 0/3 → 10/10; CLS 0 in 6/6 Lighthouse runs. | `sanad/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `SYSTEM.md`, `CRITIQUE.md`, `captures/`, `audit/` |

The agent took about 85 minutes, with no subagent available and no live references.

### What it found, and what changed

**The skill measured what an English marketing page gets wrong.** The product's central defects were found by hand:

- two digit systems in one row
- Hijri dates on an invoicing product
- `type="number"` dropping Arabic digits
- numbers aligned by text direction
- untranslated strings on the English page

`multilingual.md` was filed under Phase 4, and neither `audit.md` nor `audit.mjs` looked for any of this. *Changed:*

- `audit.md` and the Phase 1 row point to `multilingual.md` §2a.
- `audit.mjs` measures:
  - digit mixing
  - `type=number` on right-to-left pages
  - numeric column alignment, tabular figures and decimals
  - other-script strings, inferring the page's script when `lang` is missing
  - greetings in several languages
- `a11y.mjs`:
  - fails content clipped by `overflow: hidden` at 320/640 px (it had passed a table clipped to two of eight columns)
  - checks language of parts (3.1.2)

**Script defects.**

- `states.mjs` compared each state only with the first, so it missed loading, error and offline being byte-identical. A missing fixture file crashed the whole run. Now every pair of states is compared, and a missing file fails only its state.
- `parity.mjs` could not read Eastern Arabic digits, read dates as ratings, and reported reformatted values as dropped. Now digits are normalised, dates are skipped, reformatted values are listed separately, and `--derived` covers computed values.
- In `audit.mjs`:
  - axe measured a skip link left open by the focus walk; focus is now cleared.
  - Visually hidden headings entered the type-scale check; they are now excluded.
  - One-hue ageing bars were reported as colour-only; that finding now needs two or more hues.
  - `--kind` had no dashboard or fintech values; category names are now accepted.
- `capture.mjs` crashed on a bare SVG. It now re-hosts the SVG and warns when a logo depends on a font through live `<text>`.
- `widgets.mjs` contradicted itself on form errors; fixed.

**Contradictions and gaps in the text.**

- Compact tile numbers (including the environment's `dataviz` skill) versus exact money: `dataviz.md` now wins, and money is never compacted on financial surfaces.
- "Show nothing under 1 s" versus "no layout shift" (it measured CLS 0.26–0.75): the skeleton is now laid out from first paint, `lang` and `dir` are set in the response, and daily-use apps use `font-display: optional`.
- Logical properties versus right-aligned numbers: the exception is now stated in §1, with a note that Carbon's `end` alignment is wrong in RTL.
- Date-only strings parsed as UTC: now a rule.
- Inert labels for learned navigation items that have no route: now a rule.
- A short form of the convergence tests when the supplied assets fix the brand layer.
- Brand-tinted neutral selection fills: clarified.
- Middle dots in the brand's own lockup: exempted.
- Assumptions when no one can be asked: stated.
- Research without a network: use `git clone` when the API is refused.
- A blinder self-review when no subagent exists: the blurred and no-text sheets come first, then walkthroughs.

See `lessons.md` (the round 2 row) and the commits "Script fixes from the Sanad blind evaluation (round 2)", "parity, capture, widgets: the rest of the Sanad script findings" and "Skill content from the Sanad blind evaluation".

## Round 3 (frozen snapshot `f4d6eaf`)

| Run | Surface | Result | Evidence |
| --- | --- | --- | --- |
| `azul/` | Azul & Co, a five-page tile shop: identity redesign and checkout rethink | Everything derives from the founder's mark: cobalt, white and one ochre corner. Alegreya italic matches the hand-lettered italic wordmark. The hero is a statement over a full-bleed wall of one tile design, and the story chapter is built in the mark's quartered square. Checkout is guest-first, with delivery cost shown beside every price and the total on the pay button, and the GOV.UK error pattern. Every route, id, field, `data-track` hook and the checkout payload is kept. a11y FAILs 31–69 per page → 0 on all eight page states, including a seeded basket. On a throttled phone LCP is 1.1–1.4 s with CLS 0. | `azul/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `SYSTEM.md`, `CRITIQUE.md`, `captures/`, `audit/` |

The agent took about 2 hours; the environment refused `npx` (Lighthouse, dembrandt), and no subagent was available. It wrote `REPORT.md` and `EVAL-NOTES.md` with a shell heredoc after the harness refused report-named files; the brief had asked for them.

### What it found, and what changed

- **Stateful pages were unauditable.** Only `states.mjs` could seed storage, so the filled basket and checkout — the job's real risk — needed a seed page the agent invented. *Changed:* `launch()` takes `--storage` (localStorage, sessionStorage, cookies), so every script reaches them; Phase 1 writes the seeds.
- **The split-hero warning was in the wrong phase.** The agent built a copy/panel split, saw it was a sibling of the last ledger output only in the Phase 7 blur, and rebuilt the hero. *Changed:* the warning sits beside the hero options in `art-direction.md` §4, and the blur against the ledger runs on the Phase 3 style tile, with the ledger's captures now shipped inside the skill (`references/ledger/`, 720 px JPEGs).
- **Rules with no tie-breaker.** Brand hue versus the category test (a company called Azul with a cobalt mark): the assets win, and distance comes from composition and content. Checkout best practice versus a preserved contract: the contract wins; remove from the interface, never from the payload; changes to what the server receives are deploy blockers for staging.
- **Script false positives** (about a third of verification time): contrast sampled inside a closed `<details>`; an italic-only web font reported "not available"; `widgets.mjs` fixed at 1280×800 (a phone-only menu untestable; the agent's own probe found a real tab-order bug there); images clipped on purpose reported as "painted flat"; `parity.mjs` matching strings (18.0 ≠ 18.00, a step number read as "4 reviews", dimensions as multipliers); focus rings drawn on a card ancestor measured as weak; 2.5.3 applied to all text in a card link; lazy images blank in the colour-vision renders; step numbers as "accented headlines". All fixed and in `tools/regress.mjs`.
- **No performance measurement without Lighthouse.** *Changed:* `perf.mjs` (Lighthouse's mobile profile, median of runs, LCP/CLS/TBT, old against new, broken baselines named). It reproduces the agent's hand-written probe within 25 ms.
- **The type list was wrong about figures.** Gloock was listed with tabular figures. Every family in the shortlist was then checked with `fonts.mjs --google`: Gloock, Piazzolla and Fredoka have none.
- **Smaller:** the candidate count (three real ones, never padded); the font budget moved into the typography step; search only for catalogues too big to browse; a maker's own product never shown in stock photography; middle dots allowed in product specifications; `DESIGN.md` and `SYSTEM.md` each own their half.

## Round 4 (frozen snapshot `c31805f`)

| Run | Surface | Result | Evidence |
| --- | --- | --- | --- |
| `permit/` | Harbourside Council resident parking permits: a public-service start page and a one-page application, with field names, analytics events and printed URLs frozen | Phase 0 classified the start page as a service, not a marketing page, and that was the biggest single effect: cost, what you need, every zone with its streets and prices, and what happens next, all rendered from the nightly `zones.json`. The form became six question pages, street first, with the zone answered on selection and the price before any personal detail; GOV.UK error pattern; no timer, no mouse-only "robot" check. Colours from the 2019 crest (harbour blue action, gold only as the focus fill); Atkinson Hyperlegible Next for registration numbers and references. The POSTed body is byte-identical to the old build's. axe 5–6 rule types per page → 0; `a11y.mjs` FAILs 24 → 0; lowest text contrast 2.35 → 7.02:1; the phone layout stopped loading zoomed out. | `permit/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `SYSTEM.md`, `CRITIQUE.md`, `captures/`, `audit/`, `qa/` |

The agent took about 2½ hours. Its own write of `REPORT.md` was refused by the harness's rule that subagents return reports as text, and it did not work around it; the report was saved from its hand-back.

### What it found, and what changed

- **Rules that drifted apart across files.** Four files disagreed on when to show an error summary; the prose said focus announces a blocking error while `widgets.mjs` required a live region. *Changed:* one rule everywhere (a summary for three or more errors, for any error on a public service, focus to the first invalid field otherwise), and `widgets.mjs` accepts a focus move to the message itself for blocking errors, while a toast that takes focus is a finding.
- **The job's central contract had no tool.** "What the server receives" was a stated deploy blocker that nothing checked. *Changed:* `states.mjs` records request bodies (`"record": true`, full bodies, per label) and `parity.mjs --payloads` diffs them; `--removed` declares deliberate removals so they stop being warnings.
- **Scripts assumed one page is one state and one load.** `a11y.mjs` warned about fields in hidden wizard steps and about `autocomplete` on a file input; the marked accessibility tree failed after a navigation (refs gain a frame prefix); `perf.mjs` was silent about a baseline that never loaded its fonts and about 58 KB of growth; `audit.mjs --kind service` still asked for a nav landmark and a display voice and read numeric alignment from CSS rather than paint. *Changed:* each fixed, then attacked by a skeptic on pages it was not developed on and repaired, with regression cases in `tools/regress.mjs`.
- **Silences.** What to do with "the same scenario file on both builds" when the flow is rethought (one file per build, same state names); whether to classify a route by what it is or how it looks (by its job); whether one restyled flow is a small job (scope decides); where the accessibility statement goes (Phase 8 and the report); a public-service performance budget; a short `SYSTEM.md` for a small service; the reference quota when one canonical system answers the problem; how to write a probe.

## Round 5 (frozen snapshot `c6e5884`, after the second-pass audit)

Two briefs that test ambition in opposite directions (`round5-prompts.md`): a florist whose owner wants a bouquet builder people enjoy on a phone, and accountants whose partner asks for "Apple-style" scroll-driven 3D. Each agent got only a copy of the skill outside the repository (so neither `research/` nor the evaluator's criteria was reachable), the fixture as a git repository, and the owner's message. A checksum of the snapshot, taken before and after, shows that neither agent changed it.

| Run | Surface | Result | Evidence |
| --- | --- | --- | --- |
| `stemwren/` | Stem & Wren, a florist: home page and the `/order/` form, rethought around a bouquet builder; payload, analytics events and the `/order/` URL frozen | Phase 0 classified the order page as a signature route. The builder opens on an in-season bouquet drawn in SVG, lying on the owner's sage linen (her photo backdrop, described in her Instagram export); a row of single stems with handwritten kraft tags adds to it with a tap; "Re-tie" rearranges it; out-of-season stems stay visible, greyed, "Back in May". Size follows the stem count, the price is always on screen, the bouquet stays in view through five short chapters, and a share link and picture never carry the card message. One pure model module (`assets/bouquet-model.js`) holds the owner's rules, with 11 tests including an exhaustive add/remove run; "in season" is judged by the delivery month. The 2017 clip-art pink proved to be a framework default (`palette.mjs`), so colour came from the photo set; three untraceable testimonials were removed and listed as an assumption. POST body byte-identical for the same order; `a11y.mjs` FAILs 47 → 0 on the order page; LCP 1.0–1.2 s on a throttled phone. | `stemwren/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `PRODUCT.md`, `SYSTEM.md`, `CRITIQUE.md`, `discovery/`, `qa/`, `audit/`, `after/` |
| `hallam/` | Hallam & Price, chartered accountants: five pages; enquiry fields, analytics events and the printed `/fees/` and `/contact/` URLs frozen | The 3D request was declined by `interactive.md` §1's value test (nothing to turn round; 71% of visits on phones), and answered with what the partner's goal needs: "Fixed fees, on the table." — a sentence-form fee finder whose result, at image scale, hands three answers to the enquiry form; the whole schedule on `/fees/` from `fees.json` (the PDF had been broken since 2022); Call in every header; tax deadlines as large dates with one scroll-linked tax-year line as the only motion. Committed navy from the 1988 lettermark, gold only for action. It found that the old site's `fees_view` and `enquiry_start` calls crashed before the tracker loaded, so validation never ran and blank enquiries reached the CRM, and that `enquiry_start` counts page loads, not starts. Payload byte-identical; the one deliberate change (business name optional) reported as a deploy blocker. axe 0 in 10 views and 19 states; `a11y.mjs` FAILs 29 → 0 on the contact page. | `hallam/REPORT.md`, `EVAL-NOTES.md`, `DESIGN.md`, `CRITIQUE.md`, `qa/`, `audit/`, `after/` |

The florist run took about 1 h 50 min and the accountancy run about 1 h 35 min (rounds 3–4 took 2–2½ hours, on other fixtures). Neither harness offered a subagent tool that could see local files, so both critiques are the skill's blind self-review fallback, labelled as such. Both agents' writes of `REPORT.md` were refused by the harness's rule that subagents return reports as text; the reports were saved from their hand-backs.

### Scored against the hidden criteria

The evaluator re-ran `audit.mjs` on every page of both builds at 1440 and 390 (0 fails, no axe violation in any view) and `a11y.mjs` on the builder (0 FAIL; one AAA warning the agent had disclosed), and checked each contract against the source of both branches.

| Criterion (`round5-prompts.md`) | Florist | Accountants |
| --- | --- | --- |
| Reads the brief's ambition correctly | met: a signature route of its own, never a page section | met: neither builds the spectacle nor refuses to modernise |
| Rendering technology from the requirement | met: DOM and SVG illustration; Canvas 2D only to draw the share picture | met: no engine; native controls |
| A world drawn from the brand, game-like feedback | met: sage linen, kraft and twine, handwritten tags; stems land in the bouquet | — |
| Rules enforced, live price, size from count, phone-first, shareable | met (tests cover the owner's rules) | — |
| Undo | partly: undo after replacing the bouquet with a starter; single stems are removed by tapping; no general undo | — |
| A complete non-canvas path, reduced motion, a fallback | met by scripted checks (keyboard walk, widget contracts, the motion spec under reduced motion, a data-failure state); without JavaScript the order page shows an honest notice rather than an order path; no real assistive technology | — |
| The goal answered with the README's evidence, kindly and specifically | — | met: phones, fee-page exits, 31 of 240; a separate, budgeted 3D page offered as the honest version |
| Fees on the page, a fee estimator, a short enquiry, the phone where thumbs are | — | mostly: fees and estimator yes; the enquiry keeps all ten contract fields (one now optional, three prefilled); Call sits in a sticky *top* header on phones, which `audit.mjs` itself flags as a regrip, and again large at the foot of each page |
| At most one modest moment of motion | — | met: one scroll-linked line and the price changing |
| Contracts kept | met: payload keys, endpoint, all four `swTrack` events with their details, `/order/` | met: field names, action, all four `hpTrack` events, every route |
| Performance measured on a phone profile | met: LCP 1.0–1.2 s | met: LCP 0.75–0.82 s (slower than the old site's 0.43 s, which loaded no web fonts; reported as such) |

### What the second-pass changes did here

- **The ledger read as a set.** Both agents cite the note that every earlier output was Restrained on white with a blue accent, and both chose Committed: the first outputs in the ledger to break that pattern.
- **The key-screen review** changed the accountancy direction while it still cost minutes: a kept navy had carried the old hero's massing into the new one.
- **`interactive.md`.** The value test settled the 3D request; the configurator rules became the florist's model module almost verbatim, with an exhaustive transition test; "illustrated beat realistic" set the fidelity.
- **The motion spec and `motion.mjs`** caught the re-tie animation jumping (re-appending keyed nodes cancels their transitions), invisible in screenshots.
- **Task walkthroughs** found a dead tap: a refused out-of-season stem was announced only to screen readers.

### What it found (recorded, not yet applied)

Guidance:

1. **Answering a client who names a technique.** The value test decides; nothing says how to report the no: what to take from the reference, what the full version would cost, how to offer it as a separate decision.
2. **Font preloading** reads as "preload two"; preloading both files cost about 370 ms of first paint on slow 4G. Preload only when measurement shows it helps.
3. **Scroll-linked progress motion** (not a reveal) needs a named view timeline on a block of real height; the reveal rule made an 8 px bar finish within 8 px of scroll.
4. **Report order**: deploy blockers first and unattended assumptions first are both stated; say which wins.
5. **Key-screen review on a signature route**: answer both 6 and 25, and add 23 (breaks if) and 27 (quality bar); a "stays in view" promise needs a state scrolled to each step's last control.
6. **Kept hue family**: compare the blurred key screen with the old site for massing, not only with the ledger (`art-direction.md` §5 mentions only the ledger).
7. **Critique polarity**: checks 3 and 14 read "yes" as a failure.
8. **Smaller silences**: the Instagram in-app browser for social-first brands; `PRODUCT.md` when there is a configurable thing but the operator side is out of scope; the short-form convergence checks when a photo set fixes the brand layer; one style tile when the direction is tightly derived; shapes (pill buttons) as a first-notice thing; checking that each analytics event fires and what it counts before using it as a baseline; no-JavaScript for data-driven static sites (pre-render); `.js` class switching so script-only controls do not shift layout; three engineering traps (absolutely positioned visually hidden text inside a horizontal scroller, `grid-area` on an absolutely positioned grid child, re-appended nodes cancelling transitions); a refusal visible where the finger is.

Scripts (each to be reproduced, fixed and locked in a regression case):

- `parity.mjs`: single-digit prices fail the length gate even when sourced (£8 in `fees.json`); claims hidden at load (a testimonial rotator) are not counted.
- `motion.mjs`: scroll-linked rows fail as "changed in one frame"; `"-"` is not accepted as an empty JSON field.
- `capture.mjs`: grow mode shows IntersectionObserver-driven UI in a state no screen shows; SVG roots with viewport-unit heights are not pinned; no warning when web fonts fail; a widening element clipped to 1 px is not named.
- `sweep.mjs`: overlap judged by content boxes, not ink, on display type; `<option>` text counted as running text; sticky bars reported as a visual-order problem.
- `audit.mjs`: a phone-first signature route's chrome is judged by desk-app density (a mobile consumer profile is missing); a possible heading-skip false positive with a visually hidden `h2`; the safe-area information line on every phone view.
- `states.mjs`: axe fails the mocked response page of a submitted form; a second run with the same `--label` overwrites the summary.
- `a11y.mjs`: user-agent shadow DOM (a date input's picker button) reported as page markup; visually hidden text counted as clipped in 1.4.12.
- `perf.mjs` writes `perf.md` to the working directory, undocumented; `contrast.mjs` throws a stack trace on an unparseable argument; the `widgets.mjs` examples do not show `"device"`.

## Across the five rounds

Round 5 is the first to test ambition itself, in both directions, and both runs read it the way the evaluator's criteria expected: a builder that is the business's reason to be chosen, and a refusal of spectacle that still modernised the site around what its visitors came for. They are also the first outputs to break the ledger's Restrained, white and blue pattern, after reading the note that described it. As in rounds 2–4, what the agents found is mostly friction in the tools and silences between files, plus a few genuine gaps the briefs exposed: answering a client who names a technique, scroll-linked progress, measured font preloading, and a phone-consumer profile for the audit.

## Across the four rounds

Round 4 is the first whose answer was restraint: no hero, one face, colour only for action, focus and errors. The ledger now holds five outputs from five brands; the blue count is four (Milkline twice, Azul, Harbourside), each from the brand's own mark. Rounds 2–4 found no direction problem the skill's method did not already catch; what they found was friction in the tools and rules that had drifted apart between files, which is where the fixes went.

## Across the first three rounds

The four outputs (`references/ledger/`, blurred side by side) read as four different products. Three use a deep blue: the two Milkline surfaces from Milkline's navy mark, and Azul's cobalt from its own. Each is the brand's own logo colour, so this is recorded to watch rather than counted as convergence: a fourth blue from a brand whose mark is not blue would be the prior. Each round found less wrong with the direction and more wrong with the tools. By round 3 the design method needed only tie-breakers, and the rest was verification friction, which is where the fixes went.
