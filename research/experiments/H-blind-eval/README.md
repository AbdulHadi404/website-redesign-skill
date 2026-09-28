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

## Across the three rounds

The four outputs (`references/ledger/`, blurred side by side) read as four different products. Three use a deep blue: the two Milkline surfaces from Milkline's navy mark, and Azul's cobalt from its own. Each is the brand's own logo colour, so this is recorded to watch rather than counted as convergence: a fourth blue from a brand whose mark is not blue would be the prior. Each round found less wrong with the direction and more wrong with the tools. By round 3 the design method needed only tie-breakers, and the rest was verification friction, which is where the fixes went.
