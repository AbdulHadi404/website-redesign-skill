# Experiment K: task walkthroughs from captures

**Question.** Can an agent answer "can the user do the top task?" by attempting it through `states.mjs` captures, rather than by reading the screen's code? What does that catch that the checklist misses, and where does it mislead?

**Setup.** 2026-09-28.

- **Screens.** The Milkline herd screen: the old build (App A, the round-1 fixture) and the round-1 redesign (App B).
- **Device.** Phone, 390×844, touch.
- **Tasks.** Two, in the farmer's words:
  1. "What was IE1629's conductivity this morning?"
  2. "Which cows do I need to check before letting them out?"
- **Tester.** A fresh agent that had not seen either build. It drove `states.mjs --aria` and judged from the PNGs. It used the accessibility tree only to write selectors, and wrote down every time the tree told it something the screen did not.

## First run (driver as of `eb05775`)

| Task | Build | Result | User actions | Captures viewed |
| --- | --- | --- | --- | --- |
| 1 | old | **Yes**: 6.42 mS/cm, with no time on the reading | 2 | 3 |
| 1 | new | **Yes**: 6.42 mS/cm, from this morning's milking | 0 (on the home screen) | 2 |
| 2 | old | **Partial**: five cows, found by revealing a hidden column and counting rows across four captures. The app's own Alerts panel said "No data". | about 10 | 12 |
| 2 | new | **Yes**: two Alert cows and three Watch cows, by name | 0 | 1 |

The tester spent about six minutes on the four attempts (16 driver runs, 19 captures viewed). The scenarios are in `first-run/*.json`.

**What it caught that the checklist does not ask:**

- An "Alerts 5" tile above an Alerts panel that says "No data" (`first-run/A-alerts-no-data.png`).
- The answer to task 1 in a column clipped off the phone screen, with nothing hinting that more columns exist (`first-run/A-task1-s2-table-clipped.png`).
- The cow's name scrolling away exactly when its status dot comes into view (`first-run/A-status-without-names.png`).
- A tap on the sheet's backdrop that opened another cow instead of closing the sheet.
- A conductivity reading with no time on it.
- On the new build: "Cond." without a unit on the cards; no word on whether "Watch" cows need checking before turnout; the sticky search bar covering the column headers once scrolled.

Having to state the answer as the farmer would give it to the vet forced a judgement of confidence, which no checklist asks for.

**Where it misled.** The old build's task 2 looked far better than a real user would find it:

- **The tree leaked knowledge.** The first `.aria.yml` named seven columns that the screen did not show, so the tester went looking for them. A first-time user has no cue that they exist.
- **Selector scrolling reached what no finger can.** `scroll: "role=cell[name='Cond.']"` calls `scrollIntoView`, which scrolls even an `overflow: hidden` container. The herd table sits in `div#herd.card` with `overflow: hidden` and is not a scroller at all. No swipe could have revealed those columns.
- **Clicks by accessible name** hit controls the user could not identify: the three top-right buttons render as blank grey squares.
- **Row counting across captures** is patient work that a farmer at 5 am would not do.

The first run also hit two driver problems. A `scroll` with a number was assumed to be relative, when it scrolls the window to an absolute y. A failed selector left no capture of where the attempt stopped. The tester also reported "no Close button" on the cow sheet. The re-run below shows the ✕ exists, but sits below the fold.

## What changed in the driver (`states.mjs`, `lib/seen.mjs`)

| Problem | Change |
| --- | --- |
| The tree names what the screen does not show | `--aria` writes the tree with each node a sighted user cannot read on that screen marked: ⟨below⟩ / ⟨above⟩, ⟨cut off by …⟩ (overflow hidden), ⟨in a sideways scroller: …⟩, ⟨covered by …⟩ (the overlay layer is named), ⟨transparent⟩ on screen, ⟨screen-reader only⟩. A header counts what is named but not readable. Leaves are marked when under 60% is readable; containers only when almost none is. Uses Playwright's ai-mode snapshot refs (`aria-ref=`); `playwright-core` is now pinned at ^1.63, and a Playwright without them gets the plain tree with a header saying so. |
| Selector scrolling reaches clipped content | `swipe {at, dx, dy}` drags a finger with CDP touch events. It scrolls the page or a real scroller, and not an `overflow: hidden` box (checked: a scroller moved 187 px, the hidden box 0). `scroll` is documented as absolute and for state checks only. |
| Acting by name, not by sight | `tap [x, y]` (or a selector) is a touch tap. The log names what was hit, its size, and whether it is a control (`td "Main herd" 153×41 (no control semantics)`). |
| Dead taps were judged by eye | Every click, tap, press and swipe is followed by a screen comparison. 12 changed CSS pixels or fewer is reported as "changed nothing on screen". |
| A failing step left nothing to look at | A failing step leaves `…-failed.png` (and its marked tree), and the error names the step number. |
| Replaying to see each step | `--each` captures after every step, and `--aria` draws a ring where the last tap landed. |
| The scripts loaded a stale global Playwright | `launch()` resolved `playwright` in every root before `playwright-core` in any. The sandbox's global `playwright` 1.56 shadowed the pinned `playwright-core` 1.63. Resolution now goes root by root: the project's copy, then the skill's, then a global one. |

## Driver re-run (`driver-rerun/`)

Old build, task 2, finger-only steps (`a.json`):

1. **Tap the "Alerts" tile.** It reports *changed nothing on screen*: a 125×14 div with no control semantics.
2. **Swipe the herd table left.** It reports *changed nothing on screen*. This is the finding the first run missed: the columns cannot be revealed on a phone.
3. **Swipe the page up.** The Alerts panel comes into view.
4. **Tap a row.** It opens a sheet. The marked tree (`old/old-task2-phone.aria.yml`) shows:
   - 287 cells cut off by `#herd`
   - 40 nodes covered by `#cow-panel`
   - the sheet's ✕ ⟨below⟩ the fold, which is why the first run reported "no Close button"

The ring in `old/old-task2-phone.png` shows where the tap landed.

New build (`b.json`): a card tap, Escape, a swipe and a search tap all register as changes. There are no false dead-tap reports.

The state regression set (11 scenarios on the new build) gives the same results as before: the identical-state and broken-selector cases are still caught, and the broken selector now leaves a capture.

## What it cannot show

Reach, tap accuracy, gloves, glare, fatigue, and real screen readers. The driver taps the exact centre of whatever it is given. It is a walkthrough, not a usability test with people. The protocol in `visual-qa.md` ("Task walkthroughs") says so, and counts an answer assembled by cross-referencing captures as "partial".

## Rejected

- **Jittered "fat finger" taps.** Random offsets make runs unrepeatable, and target size and spacing are already measured (`audit.mjs` 44/48 px lists and the 2.5.8 spacing check).
- **A persistent step-by-step session.** Replaying from a fresh load costs seconds and keeps every run reproducible. `--each` gives the whole path in one run.
