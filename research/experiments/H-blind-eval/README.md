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
