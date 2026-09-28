# Experiment H: blind evaluations of the revised skill

**Question.** When a fresh agent is given only the skill, a repository and a user request, does the revised skill produce professional, company-specific work? And where does the skill itself get in the way?

"Fresh" means the agent did not see the research, this conversation or the design intent.

**Method.**

- **Fixtures.** Each fictional company is a realistic, templated repository with specific flaws:
  - **Milkline** (`fixture/`) is a dairy herd-health SaaS. Its marketing site is violet AI-startup slop with an unused brand mark. Its herd dashboard has status shown only as coloured dots, a table clipped on phones, a permanently empty "Alerts" card, and a fake "Synced" message.
  - **Sanad** (round 2) is a bilingual Arabic/English invoicing dashboard for Saudi small businesses.
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

Results are in `sanad/` when the run completes.
