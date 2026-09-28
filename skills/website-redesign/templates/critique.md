# Critique — round <n> of at most 3

Fill this from the **renders**, with the old first viewport beside the new one (`compare.mjs`). Best done by a fresh-context reviewer given only the brief, `DESIGN.md` and the capture paths; the builder's account of its own fixes is not evidence.

**Evidence rule.** A "yes" names a capture file and what in it shows the answer — and is then hunted: look for the capture that would prove it wrong, starting with check 23. Hierarchy, rhythm, clarity and fit cannot be answered from source. Before hand-off, re-open each cited capture and try to prove the "yes" wrong.

## First impression (write before reading `DESIGN.md`)

- This page communicates: …
- The first three things my eye lands on: 1. … 2. … 3. … — the intended order was: …
- One word: …
- Areas I cannot name within two seconds: …

## Critique against objectives

One line per point: **objective → element → effect → why** (principle or evidence). Not "I like it" and not "make it blue".

- …

## Checks

| # | Question | Applies to | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | Is the surface appropriate to its category — density, type sizes, motion, colour's job (`categories.md`)? | all | | | |
| 2 | Can each top task be done from this screen with obvious next steps, on a phone and by keyboard? | all | | | |
| 3 | **Swap test:** replace the company and product names — would the page still fit the nearest competitor? (A yes here caps the whole critique.) On productive routes, ask it of the brand layer only (type, colour roles, marks, tone): a familiar interaction model is often right. | all | | | |
| 4 | Is anything reading as generated — the model's prior, the SaaS kit, the tells in `anti-patterns.md`? Every `audit.mjs` signal fixed or justified in `DESIGN.md`? | all | | | |
| 5 | Would a stranger call before/after two different companies' work? Are the five first-notice things all changed? | expressive + redesign | | | |
| 6 | Is the first viewport memorable without reading the copy? Does the hero pass the headline test, with the action continuing its sentence? | expressive | | | |
| 7 | Is the typography distinctive where it should be and quiet where it should be, with a real scale that is actually used? | all | | | |
| 8 | Rhythm: no two adjacent chapters share a composition (expressive) / one layout per kind of task, applied consistently (productive)? | all | | | |
| 9 | Are boxes and cards rare, and only where content is card-shaped? One elevation model? | all | | | |
| 10 | Is the product shown (real UI, faithful fragments, a demo), not only described? | expressive | | | |
| 11 | Does every image have a purpose and one treatment? **Image removed:** does the first viewport lose information? | where imagery | | | |
| 12 | **Content-free render** (`capture.mjs --variant no-text`: glyphs and logo gone, icons and shapes kept): still recognisably this design? **Shadows removed** (`--variant no-shadows`): still finished? | expressive | | | |
| 13 | **Headlines only** (h1–h3 in order): does the story or the structure read? | all | | | |
| 14 | **Blurred** first viewport beside the old site and the `ledger.md` captures in `references/ledger/` (`compare.mjs --grid new.png old.png references/ledger/*.jpg --blur 6`) — done first on the Phase 3 style tile, so a sibling is caught before it is built; where the ledger row has no capture, compare the one-sentence directions in words: could a stranger mistake them? | expressive | | | |
| 15 | One primary action per view, one colour everywhere; selected ≠ accent? | all | | | |
| 16 | Every widget's applicable states designed *and rendered* — loading, empty, error, disabled/read-only, long content, 0/1/many (`app-ui.md` state matrix)? | all with widgets | | | |
| 17 | Colour budget per the named strategy; every text pair ≥ 4.5:1 (3:1 large) on its real ground; no meaning by colour alone? | all | | | |
| 18 | Mobile designed, not squeezed: stack order, sizes, targets ≥ 44 px for primary actions, navigation transformed, tables handled (`responsive.md`)? | all | | | |
| 19 | Accessibility pass done — keyboard walkthrough, visible focus never hidden, 200%/400% zoom reflow, screen-reader names, forced colours, reduced motion (`accessibility.md`)? | all | | | |
| 20 | Performance within budget — LCP element eager and sized, fonts subset, no layout shift, JS limited to what routes need (`performance.md`)? | all | | | |
| 21 | Copy short enough to be read; no happy talk, no clichés, product UI written as product UI; one label per intent? | all | | | |
| 22 | Would it hold up beside the Phase 2 references — in finish, restraint and hierarchy? | all | | | |
| 23 | **Breaks if:** each of the three things `DESIGN.md` says would betray the direction — found in the renders or not? Name the capture that proves it holds (a direction's own rule is the easiest to stop seeing). | all | | | |
| 24 | **Images tell the truth:** does any image contradict the copy beside it ("each tile slightly different" over identical repeats), or show the product altered — faded, filtered, idealised — so a buyer would be misled? | where imagery | | | |

## Task walkthroughs (productive routes)

The evidence for check 2. Follow `visual-qa.md`, "Task walkthroughs": the same tasks on the old and the new build, on the user's device, judged from the captures.

| Task (in the user's words) | Build | Result: yes / partial / no, and the answer given | User actions | Dead taps | Doubts (capture, moment) | Named but not readable |
| --- | --- | --- | --- | --- | --- | --- |
| | old | | | | | |
| | new | | | | | |

**Weakest screen or chapter and why:** …

**Fixes made in this round** (one batch; then one full recapture): …

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390 — captures: …

**Status of last round's findings:** resolved / partial / unresolved, each with the capture that shows it.

**Remaining "no" answers** (must be empty before hand-off; if any survive round 3, or a round resolved nothing, stop and show this table to the user): …
