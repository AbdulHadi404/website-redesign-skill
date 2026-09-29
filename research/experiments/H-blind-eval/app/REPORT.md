# Herd screen: what changed, and why

*The blind-evaluation agent's hand-off report to the (simulated) user, saved verbatim.*

**Branch:** `app-ux`, committed but not pushed or deployed. **Scope:** only `app/`. `data/herd.json`, the marketing pages and `assets/` are untouched.

## The short version

Farmers were missing alerts because **on a phone, the alerts could not be seen at all**:

- The table was cut off at the right edge, and that hid the whole Status column.
- The "Alerts" box always said "No data", even when five cows were flagged.
- On a phone, that box sat below all 40 cows.
- Finding a cow when the vet rang meant scrolling about 1,000 px to a small search box. The result row didn't show the cow's status, and tapping it opened a panel wider than the phone, with its close button off-screen.
- With no signal the screen went blank, and "Sync" said "Synced" whatever happened.

The herd screen now opens on **the cows that need looking at**, and it was designed for the phone first:

- **"Needs attention" comes first.** Flagged cows sit right under the search box, alerts before watches.
  - Each card shows the status as a word and a shape, not only a colour, plus the two reasons as numbers: yield change and conductivity.
  - All five of today's flagged cows fit on a phone screen without scrolling.
  - Normal cows stay grey, so colour only ever means "look here".
- **"Find a cow" is at the top and stays there while you scroll.**
  - Type the tag digits ("1629", "IE 1629" and "ie1629" all work) or a name.
  - On a phone the matches appear directly under the box. Each row shows yield, conductivity and status, so the vet's question is answered without another tap.
  - Pressing Enter on a single match opens her.
  - A **"123" button** switches the phone to the number keypad, which is much easier with gloves. The phone remembers the choice.
- **Sized for wet gloves.** On touch screens, rows and main buttons are 56 px and nothing is smaller than 48 px. Text is 17 px. Pinch-zoom works again; the old page blocked it.
- **It says whether the numbers are fresh.**
  - The bar always shows "Updated 05:42", "Updating…" or "No signal · saved 05:42".
  - The app keeps the last good copy of the herd on the phone. With no signal it shows that copy under a banner that says so, and it warns if the copy is from an earlier milking. It never passes old data off as current.
  - "Refresh" really re-fetches now.
  - A small offline shell (`app/sw.js`) lets the screen open with no signal at all.
- **Checking a cow sticks.**
  - "Mark as checked" is a big button at the bottom of the cow's sheet. The cow then shows "Checked 05:52" and moves to the end of the list, with an **Undo**.
  - Checks are kept on this phone for this milking.
  - The existing `cow_checked` analytics event still fires.
- **The cow sheet fits the phone.**
  - It is a bottom sheet with a visible **Close**.
  - It shows yield with its change, conductivity next to the **herd median for this milking** (worked out from the same data and labelled as such), days in milk, and last milked.
  - Esc closes it, and focus goes back to the cow you came from.
- **Honest numbers only.**
  - The four summary tiles showed made-up changes ("↑ 3.1 %", "↓ 0.4", …) and decorative squiggles that weren't charts of anything. These are gone.
  - The real totals (40 cows, 959 L, 24.0 L average) stay, as one line.
  - "Good morning, Tom 👋" became the farm and the milking, taken from the data: "Hegarty Farm, Mallow · Morning milking · Mon 28 Sept".
- **It looks like Milkline.**
  - The navy and sky come from your logo, and the real droplet mark replaces the 🐄 emoji.
  - Headings use Nunito, your wordmark's typeface.
  - Tag numbers and figures use Atkinson Hyperlegible Next, chosen because it tells `I`, `l` and `1` (and `O` and `0`) apart in "IE1111".
  - The fonts are self-hosted, so nothing loads from Google.
- **The desktop layout people know is kept:** sidebar, herd table on the left with the same columns in the same order, alerts on the right. It is now readable and works by keyboard. Rota, Vet log and Settings show "Coming soon" instead of popping up alert boxes.
- **The relief-milker note** now has a label and a Save button. Before, it had neither, so whatever was typed went nowhere. It says plainly that notes stay on this phone for now, because nothing exists yet to share them.

## Questions I would have asked you (no one was available, so each is an assumption)

1. **Are the top five tasks right, and in this order?** (1) see flagged cows, (2) find a cow for the vet, (3) mark checked, (4) know whether the data is fresh, (5) leave a note. *Assumed yes.*
2. **What does "change" compare against: the previous milking, or her average?** *Assumed litres against the previous milking*, shown as "−8.8 L change".
3. **What rule makes a cow "alert" or "watch"?** *No thresholds were invented.* The screen shows the sync service's status and the two measures your site says drive it.
4. **Should "checked" and notes sync between phones?** That needs an API, which is on the data side. *Assumed not for now.* Both are kept on the device and labelled "on this phone".
5. **Did the Notifications and Account squares have planned behaviour?** They did nothing. *Assumed no, so they were removed.*
6. **Does your tag manager already listen to `data-track="note_add"`?** Saving a note now calls `mlTrack('note_add')`, following the `visit-form` pattern. If the tag manager also binds to the attribute, notes would be counted twice.
7. **Are you happy to keep the offline shell?** `app/sw.js` is a new moving part. It caches only the app itself, never the herd data. To remove it, delete the file and the register lines in `app.js`.

## What was verified, and how

- **Renders** at 1440 / 1280 / 1024 / 768 / 390, before and after (`captures/before`, `captures/after`), plus dark, forced colours, reduced motion and no-JavaScript.
  - 31 state captures: loading, refreshing, offline with and without a saved copy, offline reload through the service worker, server error, stale data, search by tag, name and no match, keypad, the cow sheet, checked / undo / reopened, all checked, no flags, 15 flags with a 52-character name, note error and saved, hover, keyboard focus, and landscape.
  - Side-by-side sheets are in `captures/compare/`.
- **`audit.mjs --kind app`** at 1440 and 390:

  | Measure | Before | After |
  | --- | --- | --- |
  | Contrast failures | 102 / 98 | 0 real |
  | Clipped text | 122 / 287 | 0 |
  | Colour-only status | 40 | 0 |
  | Targets under 24 px | 3 | 0 |
  | Fake controls | 45 | 0 |
  | axe-core violation types | 6 | 0 |
  | Type sizes | 9 | 6 / 4 |
  | CLS at 1440 | 0.762 | 0.000 |

  The four remaining ✗ are measured false positives, explained in `DESIGN.md` → "Verification notes".
- **`a11y.mjs`** (1280 and 390): 63 FAIL → 0 FAIL, with one warning triaged.
- **`widgets.mjs`:**
  - The cow sheet passes the full dialog contract, from both the card and the table.
  - The note form passes the error contract.
  - The Refresh status is announced. The script marks Refresh "Enter does nothing", but Enter demonstrably re-fetches; the script inferred "nothing happened" from an unchanged page size.
  - The old screen failed both of its contracts.
- **`parity.mjs`** against the old build: no lost route, id or form field, and no unsourced number. The only dropped "claim" is the fabricated "3.1%".
- **Lighthouse 13.5** (phone, median of 3):

  | | LCP | FCP | CLS | Score |
  | --- | --- | --- | --- | --- |
  | Old | 1.38 s | 1.38 s | 0 | — |
  | New | 1.58 s | 1.05 s | 0.001 | 1.00 |

  The old baseline is flattering, because its web font never loaded. The new LCP is the first flagged cow, which waits for the herd data, and it is inside the 2.5 s budget.
- **Flows exercised by script:** check → Undo → recheck; search → Enter → sheet; offline → Try again; note empty → error → save → delete. `cow_checked` and `note_add` were confirmed to fire, and the `#herd` anchor still resolves.

## Left out, and why

- **Screen-reader testing** (NVDA / VoiceOver / TalkBack): not available here. It is the first follow-up I would book, on an Android phone with TalkBack.
- **An independent design review:** no subagent was available, so `CRITIQUE.md` is by the builder and says so.
- **Live competitor sites:** the network was blocked. I read references as source code (farmOS Field Kit, GOV.UK Frontend, Primer) or used knowledge, and labelled which is which.
- **The marketing pages** are still indigo and Inter with the 🐄 logo; they belong to the marketing project.

## Decisions that are yours

- Answers to questions 2–7 above.
- Whether "checked" and notes should sync across phones (this needs a small API).
- Deploying. Nothing has been pushed or deployed.

## Ledger row

The skill's `references/ledger.md` was read-only for this job, so the row is recorded here:

`2026-09-28 | Milkline herd screen (static app) | dashboard, mobile-first field tool / rethink of one screen | Nunito 800 (wordmark face) · Atkinson Hyperlegible Next | cool navy-tinted canvas #EDF1F5 · navy #14365C chrome · action #0B5F8A (sky family); red/amber reserved for status; Restrained | exceptions-first list + sticky tag search + bottom sheet; status = word + shape + colour; offline freshness chip | no user verdict yet`
