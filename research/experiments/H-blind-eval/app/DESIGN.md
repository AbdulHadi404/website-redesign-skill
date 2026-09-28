# Milkline herd screen: design direction

Written 2026-09-28, before implementation. Scope: `app/` only (the herd dashboard). The marketing pages (`/`, `/pricing.html`) belong to another project and are not touched. Benchmark for finish: the plainness of GOV.UK Frontend and the touch sizing of Primer's coarse-pointer tokens, applied to Milkline's own navy and sky. The screen has to read as Milkline's parlour tool. It must not look like a generic SaaS dashboard, and it must not look like this skill's usual output.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/app/` herd screen | operational monitoring dashboard, used as a mobile-first field tool | daily, at every milking (about 2 × a day), in short interrupted glances | animal health, and money: a missed mastitis case costs the cow's welfare and the milk; milk from a cow under treatment going into the tank is a legal and financial problem | productive | **rethink of this one screen's layout** (order, phone layout, states). Same data, same single screen, same labels. See the note below |
| `/`, `/pricing.html` | marketing | occasional | none | expressive | **out of scope** (another project) |

Intensity note. The request was "fix the UX", which `framing.md` maps to refine or rethink. The audit (below) shows that on a phone the status column and the alert list cannot be reached at all. A refine inside the current layout cannot fix that, so the screen's order changes. The information architecture stays the same: one screen, a herd list, alerts, notes, and the same nav items on desktop.

**Audience and context:** dairy farmers and relief milkers. They use their own phones in the milking parlour at about 5 am. The pit is lit by fluorescent tubes, the screen gets wet and smeared, and they often wear wet nitrile or rubber gloves. The phone signal is patchy or absent. Usually one hand is free and the other is on a cluster or a gate. Two pressures dominate. First, don't miss a flagged cow before her milk goes into the tank. Second, answer the vet quickly on the phone ("what's 1629's conductivity?").

**Top tasks.** No analytics, tickets or interviews were supplied. The ranking comes from the user's own words and from the product's existing actions. **Question for the user:** "Are these the right five, in this order?" **Assumption:** yes.
1. See which cows need attention this milking, and why. *Evidence: "they miss alerts".*
2. Find one cow by tag number or name and read her figures. *Evidence: "can't find a cow quickly when the vet rings".*
3. Mark a cow as checked after dealing with her. *Evidence: the existing "Mark as checked" action and its `cow_checked` event. Its frequency is an assumption.*
4. Know whether what is on screen is current, or a copy saved before the signal dropped. *Evidence: "sometimes with no signal". The marketing site also promises "Works offline".*
5. Leave a note for the relief milker. *Evidence: the existing field. Its frequency is an assumption.*

**Problems**, ranked by severity (0–4) × task. Each traces to an audit finding below:
1. **(4, task 1)** On a phone the Status column is clipped off-screen, and the Alerts panel always says "No data" and sits under 40 rows. Alerts cannot be seen on a phone. → A1, A2
2. **(4, task 4)** No signal means a blank herd with no message. The "Sync" button shows "Synced" without syncing, which is false system status. → A3
3. **(4, task 2)** The search field sits about 1,000 px down on a phone behind decorative tiles, and its text is 13 px (iOS zooms the page when it gets focus). Results do not show status. The cow panel is 420 px wide on a 390 px phone, so its close control is off-screen. → A4, A5
4. **(3, tasks 1–3)** Targets are too small for gloves: the icon buttons are 18 × 18 and the close "✕" is a text glyph. Nothing except two inputs is keyboard-reachable, and zoom is blocked. → A6
5. **(3, task 1)** Status is shown by colour alone (dots). Alert and watch cannot be told apart under deuteranopia. 102 text elements fail contrast. → A7
6. **(3, honesty)** The KPI deltas ("↑ 2", "↑ 3.1 %", "↓ 0.4") and all four sparklines are hard-coded, not data. The greeting is hard-coded to "Tom". → A8
7. **(2, task 3)** "Mark as checked" is a `div`. It keeps nothing, offers no undo, and its toast is not announced. → A9
8. **(2, task 5)** The note field has no label and no save, so text typed into it goes nowhere. → A10

**Principles.** Each one can say no:
1. **Exceptions before inventory.** At every width, the cows that need action come before the herd list. *Says no to:* KPI tiles above everything, and a side panel of alerts below the fold. (Its opposite, list first with alerts on the side, is what most herd tools ship.)
2. **One gloved thumb.** Every target is at least 48 px tall on touch, the rows and main actions are 56 px, and targets have at least 8 px between them. Nothing depends on hover or precision. *Says no to:* the SaaS density norm of 32 px rows and 13 px body.
3. **Say where the numbers came from.** The screen always names the milking and when it last updated. Offline shows the saved copy with its time. It is never blank and never a fake "Synced".
4. **Only numbers the sync service sent.** No invented deltas, sparklines or trends. A comparison appears only if it is computed from the same JSON and labelled as such.
5. **Words, then shape, then colour.** Every status is a word with an icon shape, and colour is the third cue. Normal cows stay quiet (grey), so colour only ever means "look here".

**Non-goals:** the marketing pages. The data shape and the sync service. Rota, vet log and settings screens (they stay "coming soon"). Push notifications. A framework or build step. Sorting, filtering by group, and history charts.

**Constraints:** static HTML + CSS + vanilla JS, no build and no dependencies. The `data/herd.json` shape stays fixed; in production it comes from `/api/herd`. Every id and hook in the preserved-list below stays. The logo SVG stays: navy `#14365C`, sky `#2FA4D7`, wordmark in Nunito Black. Accessibility target is WCAG 2.2 AA, plus 2.4.13 and 2.3.3. Budget: first render under 1 s on a mid-range Android over 3G, and under 100 KB of fonts. Language is en-IE.

**Success measures** (operational dashboard + mobile):

| Measure | Baseline (measured on the old screen at 390 px) | Target |
| --- | --- | --- |
| Flagged cows visible without scrolling | 0 of 5 (the status column is clipped and the Alerts panel says "No data" at y ≈ 4,300 px) | 5 of 5 names in the first viewport, or a count plus the first 3 |
| Distance to the search field | ≈ 1,000 px of scrolling | in the first viewport, and sticky while scrolling |
| Taps to read one cow's conductivity by tag | scroll + 4 digits + tap (then the panel overflows the screen) | 4 digits + 1 tap, with the value in the result row itself |
| Offline sessions that show herd data | 0 % | 100 % after one successful sync on that phone |
| `cow_checked` events per flagged cow (existing analytics) | unknown (the event exists) | rising after release. Ask for the baseline |

## Audit

**What the company sells, to whom:** Milkline (Mallow, Co. Cork; founded 2019 by a large-animal vet and a farmer) sells herd-health alerts, milking rotas and vet records to Irish and UK dairy farms. It is priced by herd size, from €39 a month. The product reads parlour exports and in-line meters and flags cows whose yield drops or whose milk conductivity rises.

**The one thing a user should be able to do:** at the start of milking, see the few cows to check and why, and find any cow by her number in seconds.

**Real proof that exists:** on the marketing site: 340 farms, one quoted customer (Aoife Brennan, Brennan Farm), and "2 days earlier" detection as a footnoted self-report. None of it belongs in the app. The app's proof is its own data: `data/herd.json`, which in this repo is sample data for Hegarty Farm, Mallow, morning milking, 2026-09-28, 40 cows.

**Brand assets sampled:** the logo colours (`palette.mjs --from assets/logo.svg`) are **navy `#14365C` (67 %)** and **sky `#2FA4D7` (33 %)**. The wordmark is **Nunito Black**, a rounded humanist sans tracked −10. The mark is a droplet over a rule. Brand family: the marketing site does *not* use the brand. It uses Inter, Tailwind indigo `#4f46e5`, gradient text and a 🐄 emoji instead of the logo, and the app copies that. So the documented brand assets are the logo file and its README description, not the current pages.

**Measured baseline** (`audit/before/audit.md`, `audit/before-a11y/`, `audit/before-dembrandt/app.json`, captures in `captures/before/`):
- Type: 9 sizes at 1440 (26 · 17 · 16 · 15 · 14 · 13 · 12 · 11 px) and 8 at 390. Body 13 px, table headers 11 px. Inter is declared but **never loads** (blocked), so the page renders in a fallback. Weight 400 carries 94 %.
- Contrast: 102 of 392 text elements fail at 1440 (98 of 386 at 390). Grey labels are 2.06:1, green "+" changes 2.28:1, the "No data" empty state 1.68:1, nav items 2.64:1.
- Focus: `*:focus { outline: none }`, so 5 of 5 tab stops have no visible focus. Only 5 controls are tabbable. The 5 nav items and 40 rows are `div`/`tr` with click handlers and cannot be reached by keyboard.
- Targets: 3 icon buttons at 18 × 18 with no visible labels. The modal close is a "✕" glyph in a `span`.
- Overflow: the table has `min-width: 880px` inside `overflow: hidden`. **122 cells are clipped at 1440 and 287 at 390**, including the whole Status column on a phone.
- Status by colour alone: 40 dots with no text. In the deuteranopia render, up and down changes are the same colour.
- Zoom blocked (`maximum-scale=1`). No `lang`. Headings skip h2→h4. Only one landmark (`main`).
- CLS 0.762 at 1440 (the table fills in after the fetch). LCP 644 ms locally.
- Signals: greeting in the title slot, 7 cards holding 97 % of the text, 4 charts with no data, 3 icon-only controls, a "No data" empty state, emoji as icons.
- Accessibility features that already work, to keep: none of note. The search input and note input are native `input`s, and the table is a real `<table>` with `<th>`.

**Must be preserved (functionality and truth):**
- Routes / anchors: `/app/` (index.html); the `#herd` anchor (the old nav links to it).
- Element ids and hooks: `#greeting`, `#kpis`, `#herd`, `#herd-search`, `#herd-body`, `#alerts`, `#note` with `data-track="note_add"`, `#cow-panel`, `#cow-detail`, `#mark-checked`, `#toast`, `#sync-btn`; `closePanel()` (it was a global called from inline HTML); `tr.cow-row[data-tag]`.
- Contracts: `fetch('../data/herd.json')` (the production equivalent is `/api/herd`) with the shape `{farm, date, milking, herd[{tag,name,group,lastYield,change,conductivity,status,lastMilked,daysInMilk}], totals{cows,litres,avg,alerts}}`, read-only; the analytics call `window.mlTrack?.('cow_checked')`.
- Legal copy: none in the app.

**Why the current design fails** (heuristic passes: Nielsen, a first-time relief milker, keyboard only, and a 390 px phone with a thumb. Severity was rated in a separate step):
- **A1 (4)** The Status column is clipped away on phones by `overflow:hidden` + `min-width:880px`. Even at 1280, "Milked", "DIM" and part of "Status" are clipped. *Visibility of system status.*
- **A2 (4)** The Alerts card is never filled (`#alerts` always says "No data" although `totals.alerts = 5`). On a phone it sits after all 40 rows. A KPI says "5" but links nowhere. *Visibility; recognition over recall.*
- **A3 (4)** No offline, error or loading state: `fetch` fails silently and leaves an empty table under "Good morning 👋". The sync button fakes success. *Visibility; error recovery; honesty.*
- **A4 (3)** Search is 13 px text in a placeholder-only field, below four tiles. It has no "no match" state, and matches don't show status. *Efficiency; error recovery.*
- **A5 (3)** The detail modal is 420 px fixed on 390 px screens, so the close control is off-screen. It has no Esc, no focus management, and figures without comparison. *User control; consistency.*
- **A6 (3)** Targets are sized for a mouse (18 px icon buttons, 41 px rows, 13 px nav items). Pinch-zoom is disabled. *Mobile, gloved use.*
- **A7 (3)** Status by colour alone, and failing contrast throughout (see above). *Accessibility.*
- **A8 (3)** Fabricated KPI deltas and sparklines; a hard-coded first name. *Honesty (hard ban).*
- **A9 (2)** Mark as checked: a `div`, nothing kept, no undo, toast not announced. *Feedback; control.*
- **A10 (2)** The note field goes nowhere, and nothing says so. *Visibility; honesty.*
- **A11 (2)** The nav is hidden on phones. 3 of 5 items open `alert()` "coming soon" boxes. *Consistency; dead ends.*
- **A12 (1)** Off-brand: indigo SaaS kit, emoji logo, no Milkline mark. *Aesthetic; trust.*

**Cognitive walkthrough, top 3 tasks, phone 390 px:**
- *Task 1, see flagged cows.* Will they notice the action is available? **No**: the status column is off-screen and "Alerts 5" is a tile with no link. Will they see progress? **No**: the Alerts card says "No data". → A1, A2
- *Task 2, the vet asks about 1629.* Will they find the search? Only after scrolling past four tiles. Will they connect results to the answer? The row shows yield but not conductivity or status, so they must tap. Will they see the result? The panel opens partly off-screen with no close. → A4, A5
- *Task 3, mark checked.* The action is visible in the panel. After acting, will they see progress? **No**: a 2.5 s toast, the row doesn't change, and a reload forgets it. → A9

## References

Live sites could not be loaded: the environment allows only GitHub, npm, PyPI and Google Fonts, and a test fetch of `https://www.gov.uk/` returned no response. The references were read as **source code and token packages** instead. Anything marked *(knowledge)* was not inspected in this session.

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| farmOS Field Kit (GPL-3.0; cloned from GitHub, `packages/field-kit/src/http/connection.js`, `shell/AppBar.vue`) | an offline-first farm PWA used outdoors | connection is a **named state machine** (good / poor / none / in progress) and its state is always in the app bar | its icon-only cloud status with no words and no time; its floating dismissible alert toasts for errors |
| GOV.UK Frontend 6.5.1 (MIT; npm tarball, `notification-banner/_mixin.scss`, `helpers/_focused.scss`) | status that must not be missed; plain words | a system message is a **banner at the top of the content, one at a time, heading + one sentence + action**; a focus style that is thick, solid and high-contrast rather than subtle | the yellow focus colour itself (Milkline is not a government brand); 19 px body as a fixed rule |
| Primer primitives 11.10.0 (MIT; npm, `dist/css/functional/size/*.css`) | touch targets without making the desktop view baggy | **target size switches on the pointer**: `--control-minTarget-coarse: 2.75rem` vs `fine: 1rem`, via the `-auto` tokens | the 44 px coarse minimum as the goal: gloves need more, so 48–56 px here |
| ISA-101 "high-performance HMI" practice for plant control screens *(knowledge)* | operators missing alarms in a sea of colour | **normal is grey; colour is only for abnormal**; alarms carry priority by shape + colour + text | the grey-everything aesthetic for the whole app; alarm acknowledgement workflows |
| iOS Contacts / phone dialler *(knowledge; the contrary reference)* | find one record by a number, one-handed | search pinned at the top of a list; a **number pad for numbers** (the dialler) | making search the home screen (it would bury task 1) |
| Twenty / Linear-style SaaS density *(knowledge; the reference this rejects)* | dense desktop tables | nothing, deliberately: 13 px text and 32 px rows are right at a desk and wrong in a parlour with gloves | — |

## Direction

**Concept (productive surface):** **"The list you check before the cups go on."** The screen is the farmer's pre-milking checklist. It shows who needs looking at, why, and whether the numbers are fresh. Behind that is the whole herd, searchable by the number on the cow's tag.

**Candidates considered** (interaction models, since this is a productive surface):
1. **Exceptions first, one scrolling screen** (chosen): banner if offline → search → "Needs attention" list → herd list → notes. Details open in a bottom sheet.
2. *Bottom tab bar* (Alerts | Herd | Notes). Lost because it splits the vet-call flow and adds navigation to a one-screen tool with 40 rows.
3. *Search-first dialler* (a big keypad as the home screen). The fastest way to find a cow, but it buries task 1. Its number pad survives as the "123" keyboard toggle on search.
4. *Keep the 10-column table and let it scroll sideways on phones.* The least change, but status stays off-screen and sideways scrolling with a wet glove fails.
5. *A card per cow.* Card soup: 40 cards ≈ 6,000 px.

**Refuses:** the KPI-tile dashboard (four number tiles + sparklines + a greeting). It also refuses the predictable opposite: a stripped, single-colour "minimal" list where alert and normal cows look alike.

**First viewport, exactly (390 × 844):**
1. A navy app bar, 56 px: the Milkline mark in white at 24 px, farm name, and a **status chip** ("Updated 05:42", "Updating…" or "No signal · 05:42") next to a labelled **Refresh** button (48 × 48, icon + word).
2. A context line: "Morning milking · Mon 28 Sep · 40 cows · 959 L" in 15 px muted text.
3. The **Find a cow** field, 56 px tall, 18 px text, with a "123" keypad toggle (48 px) on its right. The pair is sticky under the top edge while the page scrolls.
4. **Needs attention: 2 alerts, 3 to watch.** *While a search is typed, this section hides below 1024 px so the matches sit directly under the search box.* This was found in the first render: the result row was below five cards. Cards (72 px tall), alerts first and then watch, each sorted by yield drop. Each card shows the status badge (word + shape), the name at 20 px, the tag at 17 px, and the two reasons as numbers: "Yield 33.1 L (−8.8)" and "Cond. 6.77". With the app bar and search, three cards fit in the first viewport and the section heading states the full count.
- The primary action ("Mark as checked") lives in the bottom sheet, 56 px, full width, in the thumb zone.

**Desktop (≥ 1024 px):** the old frame is kept because it was learned: sidebar on the left, a title row, the herd table on the left, alerts on the right. The alerts panel becomes **"Needs attention"**, sticky at the top of the right column. The table fits without clipping (Group and Days in milk stay; it scrolls inside its own labelled region only below 1100 px). The cow detail is the same `<dialog>`, as a centred panel.

**Productive surfaces:**
- *Interaction model:* the user reads a list of cows and acts on one at a time. Tapping a cow opens its detail in a modal `<dialog>` (a bottom sheet on phones). Checking is optimistic, with **Undo** in a snackbar. Search filters as you type, matching the tag's digits or the name and ignoring "IE" and spaces.
- *Navigation model:* one place. The desktop sidebar keeps Overview and Herd (now real links) and lists Rota, Vet log and Settings as visibly **"Coming soon"** text rather than buttons that open alert boxes. No nav bar on phones: the screen is the app, and the other places don't exist yet.
- *Density:* one comfortable density. On touch (`pointer: coarse`), rows and controls are 56 px and the body is 17 px. On a fine pointer, table rows are 44 px and the body is 16 px. No compact mode (non-goal).
- *Elevation model:* **canvas** (tinted neutral) → **surfaces** (white: attention cards, herd list, notes; one level, never nested) → **layers** (dialog + scrim, snackbar). The status chip and badges are flat.
- *State language:* calm and literal, in farm words. "No signal. Showing the herd as saved at 05:42." / "No cow matches '2999'." / "Nothing needs attention this milking." / "Rosie checked · Undo".
- *Where brand shows:* the navy app bar with the real Milkline mark (inline SVG, so it can use the webfont); Nunito, the wordmark's face, for headings and cow names; sky as the action colour family. It never shows in custom controls or motion.

**Breaks if:** (1) anything decorative returns above the "Needs attention" list; (2) a green "OK" colour spreads across 35 normal cows, so that colour stops meaning "look here"; (3) the status chip ever says "Updated" when the data came from the saved copy.

**Memory test:** "It opens on the five cows I have to look at, and I can punch in a tag number with my glove on."

**Convergence checks:**
- *Similar-brief test:* for a different operational mobile tool (say a warehouse picker app) this plan would also be "exceptions first, search, list, bottom sheet". **This is intended.** On a productive surface the skill says familiar patterns are an asset. The Milkline-specific parts are the parlour constraints (glove targets, number-pad toggle for tag digits, offline freshness as a first-class state), the domain reasons on each card (yield drop, conductivity), and the brand layer (navy bar and mark, Nunito from the wordmark). The whole direction does not pass the test and is not meant to; those three layers do.
- *Category test:* from "dashboard" alone you would guess KPI tiles + chart + table. From "dashboard + avoid the obvious" you would guess a minimal list. Neither is this screen, which is ordered by the parlour routine.
- *Second-order test:* "not Inter" is not a reason used here. The type choice rests on the wordmark (Nunito) and on legibility of tag digits (Atkinson Hyperlegible Next). "Grey for normal" rests on the alert-noticing problem, not on a dislike of colour.
- *Ledger:* "white surfaces on a cool navy-tinted canvas; Nunito (wordmark face) for headings and Atkinson Hyperlegible Next for data; no caps label device; no dark chapters; navy chrome with a sky-family action colour; status red and amber reserved." Compared with `ledger.md` (brio3: paper + serif italic + mono eyebrows; Brandigade: logo blues + calendar hero; CleoHR: Bricolage + orange + duotone photos), it shares only "palette from the logo's blues" with Brandigade, and that rule comes from the skill, not from taste. It shares no surface, face, label device or hero form.

## Typography

- **One productive set, two densities.** Fixed sizes on a ratio of about 1.18: **14 · 15 · 17 · 20 · 24 · 28 px** (detail · label · body · title · heading · cow name in the sheet). The desktop body is 16 px. Every step is used: 14 for table headers on desktop, 15 for context and muted text, 17 for body and rows, 20 for card names and section headings, 24 for the page title on desktop, 28 for the cow's name in the sheet.
- **Display / headings: Nunito** 800 for headings and 900 for the wordmark only, as static files (the variable file was dropped for size). It is the wordmark's own face (the logo README says Nunito Black). It is on `saturated-fonts.json` (first wave), and the reason for using it is that it is a documented brand asset. `fonts.mjs` on the variable file: tabular figures by default, x-height 0.484. The shipped static files are 16.5 KB each. It is used only for headings and cow names, never for figures in the table.
- **Text and data: Atkinson Hyperlegible Next**, 400 and 700. It was chosen for **tag digits read under glare**: in a rendered specimen (below), it is the only candidate that separates `I` / `l` / `1` and `O` / `0` in "IE1111". `fonts.mjs`: tnum available (turned on with `font-variant-numeric: tabular-nums` for all figures), x-height 0.496 (it concords with Nunito's 0.484), 12 KB per weight. It is not on the saturated list.
- Shortlist and why the others lost: Source Sans 3 (tab by default, but `I`/`l` are identical and there is no slashed zero); Nunito alone (`I`/`l`/`1` too close for tag numbers); IBM Plex Sans (on the saturated list, and the skill's own shortlist offers no reason it is needed here). Specimen: `audit/font-specimen.png`.
- No caps or tracked label device. Section headings are sentence case in Nunito 800. No monospace.
- Language en-IE, Latin only.
- Licence and loading: both are SIL OFL 1.1, from `@fontsource-variable/nunito` 5.3.0 and `@fontsource/atkinson-hyperlegible-next` 5.3.0, **self-hosted** in `app/fonts/` with the licence text. Each loads with `font-display: swap`, only the latin subset and only the weights used. Google Fonts is not used: it is blocked in the test environment, and self-hosting avoids sending farmers' IPs to Google (EU).

## Colour

**Strategy:** Restrained. Neutrals carry about 85 % of the screen, navy chrome about 10 %, and colour for action and status the rest. In the herd list, colour appears only on abnormal rows.

**Harmony and sources:** navy `#14365C` (logo, 67 %) dominates as chrome and ink tint. Sky `#2FA4D7` (logo, 33 %) supports as the *action family*. It is darkened to `#0b5f8a` for text and filled buttons because sky itself is 2.83:1 with white. Red and amber are reserved for status. Green is used only for "Checked", never for normal.

**Use scene:** a parlour pit under fluorescent light at 5 am, with a wet phone at arm's length, so **light theme by default** for maximum contrast under glare. A **dark theme follows the phone's setting** (`prefers-color-scheme`) for the dark yard and night checks.

**Scales:** built with `palette.mjs --brand '#14365C'` and `--brand '#2FA4D7' --dark`. Neutrals are tinted to navy hue 253 at chroma ≤ 0.01. The tokens are picked from those scales and adjusted where a measured pair needed it.

**Contrast table** (`contrast.mjs`, WCAG ratio / APCA Lc, measured on the real ground):

| Token (role) | Light | Dark | Pairs (light) | Pairs (dark) |
| --- | --- | --- | --- | --- |
| canvas | `#edf1f5` | `#0b1520` | — | — |
| surface | `#ffffff` | `#122130` | — | — |
| text-strong | `#0f2438` | `#f1f5f9` | 15.79 / 102.6 on surface; 13.91 / 94.0 on canvas | 14.91 / −98.8 on surface |
| text | `#243a52` | `#d5dfe9` | 11.65 / 96.7; 10.27 / 88.1 | 12.10 / −84.3 |
| text-muted | `#52657a` | `#b3c2d1` | 6.00 / 80.0; 5.28 / 71.3 | 8.98 / −66.5 (the first pick, `#9fb0c2`, was Lc −56: too low on dark, replaced) |
| border (dividers) | `#c3cdd8` | `#2a3b4e` | 1.61, decorative only | 1.43, decorative only |
| border-control (inputs) | `#6d7f93` | `#7f93a8` | 4.11 on surface, 3.62 on canvas (≥ 3 ✓) | 5.16 on surface ✓ |
| action (button fill) / on-action | `#0b5f8a` / `#fff` | `#6cc4ee` / `#06202f` | 6.96 / −88.6 | 8.58 / 64.1 |
| action-hover | `#094d70` | `#8fd3f3` | 9.10 | — |
| action-text (links, text buttons) | `#0b5f8a` | `#7fcdf2` | 6.96 on surface, 6.13 on canvas | 9.27 |
| bar (app bar) / on-bar / on-bar-muted | `#14365c` / `#fff` / `#c9d9ec` | `#0a1a2b` / `#f1f5f9` / `#b3c2d1` | 12.27; 8.54 | 13.02; — |
| selected | neutral fill `#e4eaf1` + 2 px navy border | `#1a2c3f` + border | text 10+ | — |
| status alert: text / subtle fill / solid + on-solid | `#b42318` / `#fde8e6` / `#b42318` + `#fff` | `#ff9b91` / `#3a1512` / `#ff9b91` + `#2a0906` | 6.57 on surface; 5.59 on fill; badge 6.57 | 8.05; 7.99; 9.08 |
| status watch | `#8a5300` / `#fff1d1` / `#f0b429` + `#3b2600` (1 px `#8a5300` border) | `#f5c86a` / `#33260a` / `#f0b429` + `#2a1c00` | 6.33; 5.65; badge 7.70 | 10.38; 9.39; 8.91 |
| status checked (success) | `#1b6b3a` / `#e3f3e8` | `#7fd6a0` / `#0f2a1b` | 6.54; 5.68 | 9.35; 8.80 |
| info (offline banner) | `#0f3654` on `#e3f1fa` | `#cfe6f7` on `#0f2a40` | 10.88 | 11.44 |
| focus ring | `#0f2438`, 3 px, 2 px offset | `#f1f5f9` | 15.79 on surface, 13.91 on canvas | 14.91 |
| focus ring on the navy bar | `#ffffff` | `#f1f5f9` | 12.27 on the bar | 13.02 |

## Layout and space

- Spacing scale (4 px base): 4 · 8 · 12 · 16 · 24 · 32 · 48. Semantic names are `--space-control`, `--space-inset`, `--space-gap` and `--space-gutter`.
- Phone (< 768): a single column with a 16 px gutter; the search is sticky.
- Tablet (768–1023): single column, 24 px gutter; the herd table shows 5 columns.
- Desktop (≥ 1024): sidebar 208 px + content. Content is a grid of `minmax(0, 1fr) 360px` (herd | Needs attention), max-width 1320.
- Radii: controls 10, surfaces 14, sheet 20 (top corners). The pill shape is for status badges only.
- Cards exist only for the flagged cows (independent, actionable objects). The herd list and notes are plain surfaces with rows divided by 1 px rules.

## Imagery and graphics

None, argued. This is a working tool, and photography of cows would only push the list down. The graphics layer is the Milkline mark (inline SVG) and a small set of drawn status icons in one 2 px stroke style on a 20 px grid: an alert octagon, a watch triangle, a checked tick, refresh, search, close, a no-signal icon and a chevron. They are drawn in `currentColor` so forced colours and the dark theme keep them. There are no emoji anywhere.

## Motion

- Productive tokens: `--dur-fast: 120ms`, `--dur-base: 200ms`, `--ease-out: cubic-bezier(.2,.8,.2,1)`.
- Only three things move. The **sheet slides up** (200 ms), which explains where the detail came from. The **snackbar fades** (120 ms). The **refresh icon turns** while a request runs, which is state, not decoration.
- Under reduced motion, each is substituted: the sheet appears in place with an opacity change, the snackbar appears in place, and the refresh icon stays still while the chip text says "Updating…".
- Never animated: list filtering, checking a cow, rows appearing, anything triggered from the keyboard.

## Interaction

- **Primary action per screen:** list view has none; the rows are the actions. The detail sheet's primary is "Mark as checked" (action fill, full width, 56 px, at the bottom). After checking, the button becomes "Checked 05:52 · Undo" in success text. There is one high-emphasis button per view.
- **Components and their state rows:** in `SYSTEM.md`.
- **Forms:** search (label "Find a cow"; hint "Tag number or name"; `type=search`, `inputmode` toggles text/numeric, `enterkeyhint=search`, `autocomplete=off`, 18 px). The relief-milker note gets a visible label, a hint, and a **Save note** button. It saves on this phone only and says so. Its `id`/`data-track` are kept. It is validated on submit only (an empty note says "Write a note first").
- **Targets and thumb zone:** 56 px rows and main buttons on touch, 48 px minimum, 8 px gaps. The sheet's actions sit at the bottom. The search sits at the top, following the Contacts convention (Jakob's law).
- **Offline:** a small service worker (`app/sw.js`) caches **only the app shell** (HTML, CSS, JS, fonts, logo), network-first with a 4 s timeout, so the screen opens with no signal. *Changed during build:* the first plan also cached the herd JSON in the service worker. That was dropped, because the app would then receive old data looking like a fresh network response and the chip would say "Updated". The data now always goes to the network. The app keeps the last good JSON in `localStorage` with the time it arrived (or the response's `Date` header if a cache answered), and labels it as saved when it uses it.
- **Performance budget:** LCP is the "Needs attention" heading or the first card: 1.58 s median in Lighthouse mobile simulation, against a budget of 2.5 s. CLS ≤ 0.1. Fonts: static Nunito 800 (16.5 KB; 900 at 16.7 KB loads only on desktop for the wordmark) + Atkinson 400/700 (12 + 13 KB), so 41 KB on phones. JS is 23 KB unminified, and there are no third parties. *Changed during build:* the variable Nunito (39 KB) was replaced by static 800/900. The herd section is hidden until the first data render, which took CLS from 0.114 to 0.001. A JSON preload was tried and reverted because it slowed LCP (`audit/perf/lighthouse.md`).

## Accessibility

WCAG 2.2 AA; aiming for 2.4.13 and 2.3.3.

- **Contrast table:** above. Non-text pairs: input border 4.11 / 3.62:1; the watch badge has a 1 px `#8a5300` border (6.33:1) because its amber fill is only 1.86:1 against white; icons use their text colour (≥ 6:1); the focus ring is 13.9–15.8:1.
- **Focus token:** `outline: 3px solid var(--focus)`, `outline-offset: 2px`, using `:focus-visible`. On the navy bar it uses a white ring. `scroll-padding-top` is 128 px (the sticky search is about 112 px measured, plus 16) so focused rows are never hidden under it. On viewports shorter than 500 px (landscape phones) the search stops sticking (`captures/after/states/landscape-844x390-scrolled-after.png`).
- **Targets:** at least 48 × 48 on touch, 56 for rows and primary actions. On a fine pointer, at least 32 px. There are no inline icon-only targets under 44.
- **320 px state:** the app bar wraps (chip and Refresh on their own row). Cards go single column. The herd list shows 4 columns (Tag | Cow + status | Yield + change | Cond.), with tighter padding below 360 px and no horizontal scroll (verified by `a11y.mjs` reflow at 320). The sheet is `width: 100%`, `max-height: 92dvh`, and scrolls inside.
- **Colour independence:** status = word + shape + colour (Alert ⬣, Watch ▲, Checked ✓, OK = the word "OK" in muted text). Change = sign + number ("−8.8"), and the colour is dropped on change entirely because it is not a status. Selected/current uses a border + `aria-current`. Links in text are underlined.
- **Motion:** see above. Nothing auto-updates without the user asking (no polling), so no pause control is needed. Nothing flashes.
- **Forced colours:** every control has a real border (transparent where it is not otherwise visible). Icons use `currentColor`. The focus is an outline. The badge uses `forced-color-adjust: none` only on the status icon shape, and otherwise relies on its word.
- **Component map:** app bar → `header[role=banner]`; nav → `nav[aria-label="Main"] > ul > a[aria-current]`; "coming soon" items → plain text in the list with "Coming soon" (not links); refresh → `button`; status chip → `p[role=status]`; offline banner → `section[role=region][aria-labelledby]` with a heading and a Retry `button` (not `alert`, because it loads with the page); search → `search > form > label + input[type=search]` + a `button[aria-pressed]` keypad toggle; result count → `p[role=status]`; Needs attention → `section > h2 + ol > li > button` (one real button per card); herd → `table` + `caption` + `th[scope]`, and the name cell holds a `button` (row click is a mouse convenience only); detail → `<dialog>` + `showModal()`, `aria-labelledby` the cow's name, Esc and focus return native, plus a visible "Close" button; snackbar → `#toast[role=status]` present at load, not auto-dismissed while it holds Undo (it waits 10 s, and pauses while focused); note → `form` + `label` + `textarea`-sized `input` (kept as `input#note` for the hook) + submit `button`, with the result shown inline in a `role=status` message.
- **Forms:** search has no validation. The note is validated on submit (an empty note says "Write a note first") with focus kept on the field. No personal-data fields, so no `autocomplete` map (search is `autocomplete=off`).
- **Announcements:** `status` for sync results ("Updated 05:42", "No signal, showing the saved copy from 05:42"), search counts ("3 cows match"), checks ("Rosie checked"). `alert` is used for nothing: flagged cows are content, not interruptions.
- **Data:** no charts. The summary numbers are text, and the table has a caption.
- **Preserved features:** the native inputs and the semantic `<table>` are kept, now labelled.

## Keep / replace / remove / create

**Keep:** the single-screen structure; the herd table on desktop with the same columns and order (Tag, Name, Group, Yield, Change, Cond., Status, Milked, Days in milk); the alerts panel on the right on desktop; the sidebar and its five labels; the label words ("Herd", "Mark as checked", "Notes for the relief milker"); every id and hook in the preserved-list; the fetch contract and `cow_checked` event; the tag order of the herd list.

**Replace:** the palette (indigo → the logo's navy + sky roles); the fonts (Inter, never loaded → Nunito + Atkinson Hyperlegible Next, self-hosted); the emoji logo → the real mark; the greeting → the farm and milking; the `div` controls → buttons and links; the fixed modal → `<dialog>` sheet; the colour dots → word + shape badges; the fake "Synced" toast → real refresh with status; the placeholder-only inputs → labelled fields; the density (13 px / 41 px rows → 17 px / 56 px on touch).

**Remove:** the four KPI tiles' fake deltas and fake sparklines; the "⋯" row glyph; `maximum-scale=1`; `*:focus { outline: none }`; `alert()` "coming soon" pop-ups; the 18 px unlabeled icon buttons (Notifications and Account had no behaviour).

**Create:** the "Needs attention" list; the status chip and offline banner; the saved-copy cache and service worker; search matching on tag digits, the keypad toggle and the "no match" state; checked state with Undo, kept per milking on this phone; a herd median comparison in the detail ("herd median 5.2", computed from the same JSON and labelled); loading, empty, error and stale states; the dark theme; `SYSTEM.md`.

Two things removed from the desktop header need a decision from the user. **Notifications** and **Account** were grey 18 px squares with no behaviour, so they were removed rather than restyled. **Question:** do they have planned behaviour? **Assumption:** no.

## Secondary pages

None in scope. The marketing pages still carry the old indigo/Inter look and the fabricated-looking hero screenshot (`assets/app-screenshot.png`). That is flagged for the marketing project, not changed.

## Verification notes (Phase 6), with every remaining script "fail" justified

- `audit.mjs` "No visible focus change on 28–31 name buttons" is a **false positive**. The focus ring is drawn on the button's `::after`, which covers the whole row. `audit.mjs` compares only the element's own computed style, not its pseudo-elements. Evidence: `a11y.mjs` (a pixel diff) passes every tab stop, and `captures/after/states/focus-row-390-after.png` shows the ring around the whole row.
- `audit.mjs` "skip link hidden under nav.side" (1440) is a **false positive**. The check tests bounding-box overlap and ignores z-order. `document.elementFromPoint` at the link's centre returns the link, and the render shows it on top.
- `audit.mjs` "a.skip contrast 1.29:1" (390) is a **false positive**. The link is off-screen (`top: -100px`) until focused, and the sampler clamps to the viewport and measures the navy bar underneath. Focused, it is `#0f2438` on `#ffffff` (15.79:1).
- `audit.mjs` signal "Body 17px with controls ≥ 48px — marketing density in a work tool" is **deliberate**: see Principle 2 and the gloved, wet, one-handed parlour context. The category default of 13–14 px and 28–32 px controls is for desk tools.
- `widgets.mjs` "live #sync-btn: Enter does nothing" is a **false negative**. Enter does trigger a refetch: a check counted herd.json requests going 1 → 2 after Enter (`audit/tools` + `EVAL-NOTES.md`). The script infers "nothing happened" from an unchanged DOM size, and the chip's final text has the same length as before.
- `a11y.mjs` WARN "skip link partly covered (3/5 sample points)": the link is on top at its centre. The script samples points 2 px inside each corner, and with a 10 px radius those points are outside the rounded shape, so hit-testing returns whatever is underneath. This is most likely a false positive. Accepted.
- `parity.mjs`: the only dropped claim is "3.1%", one of the fabricated KPI deltas, removed on purpose (see Remove). `/pricing.html` "no h1" was already true before; that page is out of scope.
