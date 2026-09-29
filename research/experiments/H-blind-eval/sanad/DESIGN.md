# Sanad (سند) — design direction for the dashboard

Written 2026-09-28, before implementation. Benchmark for finish: the invoice tables of GOV.UK Frontend and Carbon (exact, tabular, plain), Midday's receivables handling (colour only on what needs doing). This must read as *Sanad's* work — the arch-and-keystone mark, deep teal `#0E5E5A`, saffron `#E0A526` and the IBM Plex Sans Arabic wordmark — not the references', not the purple UI kit it replaces, and not the model's default dashboard.

No user was available for questions. Every point where the skill says "ask the user" is written as **Question → Assumption** and repeated in `REPORT.md`.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/` (Arabic, default, RTL) | operational dashboard inside an invoicing SaaS (fintech dials for money, dashboard dials for layout) | daily glance (owners), weekly/monthly deep work (accountants) | money + legal (ZATCA: VAT number and amounts shown exactly) | productive, reassuring | **redesign** of the brand layer and visual system + **refine** of hierarchy, states, phone layout; KPI *definitions* corrected (a rethink of four numbers, not of the IA) |
| `/?lang=en` (English, LTR) | same screen, same data | desktop, accountants | same | same | same |
| New-invoice dialog (on both) | SaaS form | several times a week | money (wrong amount on a tax invoice) | productive | refine (semantics, labels, validation, VAT preview) |

**Audience and context:** small-business owners in Saudi Arabia, reading Arabic, on phones and laptops, checking who owes them money between jobs; their accountants, reading English on desktops, reconciling totals and VAT against ZATCA returns. Pressure: cash flow and tax compliance — a number that looks wrong is read as the product being wrong.

**Top tasks** (≤ 5, ranked — *assumptions*: there are no analytics, tickets or interviews in the repo; ranked from the README, the nav, the table columns and the user's complaint):
1. Know where the money stands — how much is owed, how much is late, how much is paid. *(owner, daily; assumption)*
2. Chase late payers — who owes what, and how late. *(owner; assumption)*
3. Find one invoice and check its amount, VAT, dates and status. *(both; assumption)*
4. Issue a new invoice (the only action on the page; `invoice_create` is tracked). *(owner; evidence: README analytics note)*
5. Reconcile net, VAT and totals exactly for a VAT return. *(accountant; evidence: README ZATCA note)*

> **Question for the user:** are these the right five, in this order? **Assumption:** yes; the layout follows this order.

**Problems** (severity 0–4 × task importance; each traced to an audit finding below):
1. Amounts are formatted three different ways and in two digit systems in one row; totals drop trailing zeros (`12,748.5`) — tasks 1, 3, 5 (**4**, A1).
2. The four KPIs are mis-defined, rounded and carry invented deltas — tasks 1, 5 (**4**, A2, A3).
3. Phones see two of eight columns; the table cannot scroll; the New-invoice button is clipped at 320 px — tasks 1–4 on the owners' main device (**4**, A5).
4. The dashboard says 3 invoices (SAR 26,758) are late; by the due dates it already has, 13 of 14 unpaid invoices (SAR 80,625.35) are past due — task 2 (**3**, A9).
5. Keyboard users cannot create an invoice at all (Save is a `div`); the dialog has no semantics; Arabic digits typed into the amount are silently dropped — task 4 (**4**, A12).
6. Arabic dates render in the Hijri calendar, English in US month/day/year — the owner and the accountant see different dates for one invoice — tasks 3, 5 (**3**, A4).

**Principles** (each can say no):
1. **Every amount is exact and says what it counts.** Two decimals always, one digit system, the rule and the scope written beside each total. (Opposite a reasonable team could hold: round hero numbers for glanceability.)
2. **Late money outranks earned money.** What needs chasing takes the colour and the first position; paid and totals are context. (Opposite: revenue as the hero.)
3. **Arabic first, mirrored second.** Every layout is drawn in RTL and checked in LTR, never the other way round; numbers keep one alignment in both. (Opposite: design in English, flip with `dir`.)
4. **Colour is for state, the brand is in the frame.** Teal = identity, action, current place; red = late, only; saffron = the keystone, never a status. (Opposite: status pills in a rainbow.)
5. **Keep the learned places.** Summary on top, chart and late list in the middle, invoice table below, New invoice in the table's header. (Opposite: rethink the IA.)

**Non-goals:** no new pages (Clients, Reports, Settings stay out of scope); no backend or persistence (the static front end saves nothing — as before); no change to `data/invoices.json`; no dark theme (none existed; `color-scheme: light` declared); no invoice detail view or editing; no component library.

**Constraints:** static HTML + vanilla JS + CSS, no build; `data/invoices.json` shape (the production API) unchanged; `window.sanadTrack('invoice_create', { amount })` on save; ids used by scripts; Arabic default at `/`, English at `/?lang=en`; the 2024 mark in `assets/logo.svg` (unchanged); WCAG 2.2 AA (aiming at 2.4.13 focus appearance); performance: no framework, fonts self-hosted, total JS < 20 KB; network: Google Fonts CSS unreachable in the test browser — fonts must be self-hosted.

**Success measures** (baselines from `audit/before`):
- Owner can say "how much is owed and how much is late" from the first viewport at 390 px (baseline: impossible — "Overdue" understates late money by SAR 53,867.64; amounts need two lines each).
- Zero mixed digit systems and zero amounts without two decimals (baseline: 48 net/VAT cells unformatted, 5 totals with one decimal, Arabic rows mixing ٠–٩ and 0–9).
- Every column reachable at 320 px (baseline: 2 of 8).
- `audit.mjs`, `a11y.mjs`, `widgets.mjs`: no unjustified fail (baseline: 7 audit fails per page and width, 16 a11y FAILs per language, 3 of 3 widget contracts failing).
- New invoice completable by keyboard alone, in both languages, with Arabic digits (baseline: impossible).

## Audit

**What the company sells, to whom:** e-invoicing for Saudi small businesses — issue ZATCA-compliant tax invoices and see who has paid. Buyers are the owners; the accountants are daily users of the English side.

**The one thing a user should be able to do:** see in one glance how much money is owed, how much of it is late, and from whom — and trust every digit.

**Real proof that exists:** none needed on a dashboard. Real data in the fixture: business name (ar/en), VAT number `310123456700003`, 24 invoices, six months of revenue. The KPI deltas (+12.4 %, −3.1 %, +8 %, +5.2 %) are **not** proof — they are constants in `app.js` (A3).

**Brand assets sampled** (`palette.mjs --from assets/logo.svg`, `audit/palette-logo.txt`): deep teal `#0E5E5A` (oklch 43.7 % 0.071 189.6, 67 % of fills) and saffron `#E0A526` (oklch 75.8 % 0.147 80.8, 33 %). Mark: a thick round-headed arch (سند — "support"; also the word for a financial voucher, سند قبض / سند صرف) with a small rounded-square saffron keystone. Wordmark: "سند · Sanad" set in **IBM Plex Sans Arabic 600** (named in the SVG) — an engineered sans with a Naskh structure; the SVG uses live text, so the wordmark falls back to another face wherever Plex is not installed (it did in our render, `captures/before/assets-logo-svg-1440-logo-fold.png`). Brand family: no parent or sibling surfaces exist in the repo; README calls this "the 2024 identity". The app ignores all of it: a "✦ Sanad" text logo in Poppins (not loaded → a serif fallback) on a violet gradient.

**UI stack inventory:** no framework, no build, no dependencies. `index.html` (48 lines), `assets/app.css` (43 lines, 11 hard-coded colours), `assets/app.js` (64 lines; builds everything with `innerHTML`). Fonts: Tajawal + Poppins from Google Fonts (OFL) — both *without tabular figures* (`resources/type-and-colour.md`), and neither loads here (TLS proxy). No icons (emoji). No analytics library; `window.sanadTrack` is expected to be provided by the host.

**Measured baseline** (`audit/before/audit.md`, `audit/before-a11y-*`, `audit/before-widgets-ar.txt`, `captures/states-before-*`):
- Type sizes 28 · 26 · 16 · 14 · 13 · 12 · 11 px (8 distinct); pills at 11 px; families declared Tajawal 99 % — **not loaded**, fallback rendered.
- Contrast: 19 of 229 text elements fail at 1440 (nav, KPI labels, table headers `#b2bec3` on white = 1.9:1; delta green 2.54:1); search border 1.16:1.
- Focus: invisible on 4 of 4 controls (`*:focus { outline: none }`); 5 pointer-cursor nav `div`s unreachable by keyboard.
- No `lang`, no `main`, no skip link; axe: color-contrast, html-has-lang, landmark-one-main, region.
- 390 px: 151–176 text elements clipped by the table card's `overflow: hidden`; the table is `min-width: 900px`; sidebar `display: none` with no replacement.
- Generic-look signals: violet gradient, emoji as icons ("👋", "🔔"), greeting in the title slot, 7 cards holding 97 % of the text, 4 KPI tiles with % deltas, 1 chart without text or axes.
- LCP ≈ 0.26–0.49 s locally (h1), CLS 0.055 (desktop). Transfer 19 KB.
- States: loading, error and offline render **byte-identical** (blank KPIs, empty panels, header-only table — no message) (`captures/states-before-en/*`, md5 in EVAL-NOTES).
- Dialog (`widgets.mjs`): no dialog semantics, focus not moved, Esc does nothing; Save is a `div` (not focusable); error "Error" not tied to a field; success "✓" not announced.

**Accessibility features that already work (keep):** `dir="rtl"` for Arabic; zoom not blocked; the invoice list is a real `<table>` with `<th>`; the bell and New-invoice controls are `<button>`s; the language link names the target language in its own script ("العربية" / "English").

**Must be preserved (functionality and truth):**
- Routes: `/` (Arabic), `/?lang=en` (English); the language link (`#lang-toggle`) points between them.
- Element ids: `lang-toggle`, `bell`, `hello`, `kpis`, `chart`, `overdue-list`, `filter`, `new-invoice`, `invoices`, `rows`, `modal`, `f-client`, `f-amount`, `f-save`, `f-msg`; `tr.inv-row[data-id]`; `data-i18n` keys.
- Contracts: `GET data/invoices.json` with its current shape; `window.sanadTrack('invoice_create', { amount: Number })` fired when a new invoice is saved, with the amount the user entered.
- Legal / ZATCA: the VAT number and every amount exactly as the API returns them (never recomputed, never rounded).
- Learned locations: sidebar with Dashboard, Invoices, Clients, Reports, Settings in that order; summary on top; chart + late list; invoice table; New invoice in the table header.

**Why the current design fails** (discovery in four single-lens passes — Nielsen, a first-time owner, keyboard only, a 390 px thumb — then merged and rated separately):

| # | Finding | Heuristic / lens | Severity |
| --- | --- | --- | --- |
| A1 | **Amounts formatted three ways.** Totals via `toLocaleString()` drop trailing zeros (`SAR 12,748.5`, `306.9`, `840.1`, `1,056.7`); Net and VAT are raw (`1928.24`, `20257.3`, no grouping); in Arabic, totals and KPIs use ٠–٩ (`ar-SA` default) while Net, VAT and ids use 0–9 — two digit systems in one row. All columns `text-align: left`, proportional figures → nothing lines up. This *is* "the numbers don't line up and look wrong". | match with real world; consistency | 4 |
| A2 | **KPIs mis-defined.** "Outstanding" (SAR 54,822) = *sent* only, excluding the overdue invoices that are also outstanding; "VAT collected" (SAR 27,192) includes SAR 9,314.58 of VAT on 4 drafts never issued; "Total revenue" (SAR 55,484) = paid invoices in this list, contradicting the chart (September alone SAR 81,240.25); all rounded to whole riyals (`Math.round`). | match with real world; error prevention | 4 |
| A3 | **Invented deltas.** `pct(12.4)`, `pct(-3.1)`, `pct(8)`, `pct(5.2)` are constants; no period; "−3.1 %" on Outstanding is red although falling receivables are good. Unsourced numbers on a money screen. | honesty (framing §5) | 4 |
| A4 | **Dates.** `toLocaleDateString('ar-SA')` renders Hijri in Chromium (`١٤٤٨/٤/١٧ هـ`) while English renders `9/15/2026` (US order, ambiguous to Saudi readers); `new Date('YYYY-MM-DD')` is UTC midnight, so west of UTC every date shows a day early. Owner and accountant cannot read the same date to each other. | consistency; match with real world | 3 |
| A5 | **Phone layout broken.** Table `min-width: 900px` in an `overflow: hidden` card: 2 of 8 columns visible at 390 and 320, no scroll; the New-invoice button clipped at 320; nav hidden with no replacement; KPI values wrap "ر.س" onto a second line. Most owners use phones. | 390 px thumb pass | 4 |
| A6 | **Hierarchy.** Greeting "مرحباً أحمد 👋" in the h1 slot at 28 px; KPI labels 12 px at 1.9:1; the nav items the same pale grey as disabled text; every panel an identical shadowed card. | aesthetic and minimalist; app tells | 2 |
| A7 | **English page is partly Arabic.** "+ فاتورة جديدة", "بحث...", the dialog's placeholders and "حفظ" are hard-coded Arabic; "No data" and "Error" are English on the Arabic page. | consistency | 3 |
| A8 | **RTL by `dir` only.** `text-align: left`, `margin-right`, `border-right` hard-coded; the close "×" sits at the physical right; the chart has no labels, so its direction is undefined. | Arabic-first lens | 2 |
| A9 | **Lateness hidden.** 13 of 14 unpaid invoices are past their due date (SAR 80,625.35), 5 of them by 90+ days; 11 are still "Sent". The "Overdue" panel lists 3. INV-2026-1051 is "Overdue" on its due date. 3 drafts (incl. INV-2026-1047, SAR 49,843.15) are past their due date and were never issued. | visibility of system status | 3 |
| A10 | **Chart without data.** Six bars, no axis, no values, no months, no unit, hard-coded purple; `svg` without a name. | hard ban: "a chart presented as data that has no data" | 3 |
| A11 | **Accessibility barriers.** No `lang`; no `main`; focus removed globally; nav `div`s with `cursor: pointer`; search named by placeholder only; 1.16:1 input border; 1.9:1 text; 11 px pill text; status by pill colour. | keyboard pass; WCAG 1.3.1, 1.4.3, 1.4.11, 2.1.1, 2.4.7, 3.1.1, 3.3.2 | 3 |
| A12 | **New invoice cannot be completed by keyboard.** Dialog is a `div`; focus stays behind it; Esc does nothing; close "×" and Save are `div`s; inputs labelled by placeholder; "Amount" does not say whether VAT is included; `type="number"` silently drops Arabic digits (`١٠٠٠` → empty → "Error"); error in English only, red text only; success "✓" unannounced. | error prevention; recovery; keyboard | 4 |
| A13 | **No loading, error or empty states.** A failed fetch leaves blank panels with no message; loading, error and offline are identical; empty overdue says "No data" in English. | visibility of system status | 3 |
| A14 | **Not Sanad.** Violet gradient bar, "✦" glyph logo, emoji icons, Poppins; the 2024 mark and its colours appear nowhere. | brand; trust ("doesn't feel trustworthy enough for money") | 2 |
| A15 | **Identity missing.** The business name and VAT number are in the data and never shown. | credibility (ui-ux §11); ZATCA | 2 |
| A16 | **One-halala question in the data.** INV-2026-1050: VAT 3,038.59 on net 20,257.30 (15 % = 3,038.595 → 3,038.60 half-up). Displayed exactly as the API returns it; flagged, not "fixed". | honesty | 1 |

**Cognitive walkthrough, top three tasks (before):**
- *Where does the money stand?* (1) The user looks at the KPI row — yes. (2) Notices "Outstanding" and "Overdue" — yes. (3) Connects them to "what I'm owed" — **no**: Outstanding excludes overdue, Overdue excludes 10 late "Sent" invoices; the deltas look like performance but are constants. (4) Progress — n/a.
- *Chase late payers:* the "Overdue invoices" panel lists 3 rows of the same client with amounts but no invoice number, due date or days late — **no** way to act.
- *Create an invoice:* the button is visible — yes; the dialog opens — yes by mouse, **no** by keyboard (Save unreachable); "Amount" — **no** (net or gross?); after Save, "✓" — **weak** (nothing changes, nothing is announced).

**The five first-notice things:** not applicable (productive route). For the record, a stranger notices: the violet gradient bar, the "Hello Ahmed 👋" greeting, four white KPI cards with coloured percentages, a lilac bar chart, pastel status pills. The brand layer changes all five; the *layout order* is kept on purpose (learned locations).

## References

Live competitor sites (Qoyod, Wafeq, Zoho Books Arabic, Stripe) **could not be inspected** — the environment only reaches GitHub, npm, PyPI and Google Fonts. What was read instead is code and token packages, fetched 2026-09-28:

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| Midday (`midday-ai/midday`, open-source invoicing; `invoice-status.tsx`, `tables/invoices/columns.tsx`, `format-amount.tsx`) | show receivables without alarm fatigue | *Unpaid* is neutral; only *overdue* carries colour. The due-date cell shows the date and, for unpaid invoices only, a second line of relative lateness. Dates are handled as UTC calendar dates. Amounts always through one formatter with fixed fraction digits. | 10–11 px pill text; overdue yellow `#FFD02B` on a 10 % tint (≈ 1.5:1); avatars in rows; blurred floating bulk bar |
| GOV.UK Frontend 6.5.1 (npm; `components/table/_mixin.scss`, `helpers/_typography.scss`) | exact numbers people check | `govuk-table__cell--numeric` = `tabular-nums` + right-aligned, header aligned with its numbers; table caption; plain words; error-summary pattern. Contrary reference for the brand layer: zero decoration. | its zero-brand posture and 19 px body — Sanad has an identity to show |
| IBM Carbon (`@carbon/styles` 1.116, `data-table/_data-table.scss`) and Carbon icons | dense tables; an icon set drawn with Plex | productive type at 14 px fixed; rows 40 px default; icon set drawn by the same foundry as Plex (square terminals, 16 px drawings). | Carbon maps `align="right"` to logical `text-align: end` — in RTL that left-aligns numbers and breaks decimal alignment (`multilingual.md` §2a); we use physical `right` in both directions |
| GitHub Primer primitives 11.10 (`functional/size/size.css`, `typography.css`) | control sizes that work for mouse and touch | controls 28 / 32 / 40 px; caption size only for single lines ("the small sizing doesn't pass accessibility requirements") | Primer's neutral grey chrome |
| Saudi e-invoicing practice (from knowledge, **not inspected**; treated as a hypothesis) | what a Saudi accountant expects | tax invoices carry the seller's VAT number and Gregorian dates; amounts to two decimals in SAR | anything visual — not seen |

## Direction (productive)

**Productive surfaces — interaction-model candidates**, judged against the top tasks:

| Candidate | Serves | Loses because | Result |
| --- | --- | --- | --- |
| A. The current layout, repaired (KPI row, chart + late list, table) | learned locations; tasks 1, 3, 4 | on its own it still hides lateness (task 2) | **base** |
| B. Exceptions-first: a "Past due" list with ageing, first on phones | task 2, task 1 | pushing the summary and table down breaks learned locations on desktop | **merged into A**: the late list stays in the middle row beside the chart but gains ageing buckets, days late and invoice numbers, and **swaps sides with the chart** so it comes first in reading order (start side on desktop, directly after the summary on phones) — the one learned location this redesign changes, because A9 (lateness hidden, severity 3) is about exactly this panel |
| C. An aged-receivables report (buckets × clients) | accountants, task 5 | a report, not a glance; owners don't read ageing matrices | **reduced** to a five-bucket strip inside the late panel |
| D. A queue ("chase next") | task 2 | Sanad sends no reminders from here — a queue would promise an action that does not exist | lost |
| E. A single table with filters and totals (no summary) | tasks 3, 5 | owners lose the glance (task 1) | **merged**: the table gains status filters, sorting, totals footer; the summary stays |

**Chosen interaction model:** the learned dashboard, made exact. A summary strip of four defined totals (each with its rule and count) → a monthly revenue chart with axis and values beside a *Past due* panel (ageing strip + the invoices to chase, most late first) → the invoice table (search, status filter, sort, exact totals footer, New invoice). The new-invoice dialog becomes a native `<dialog>` with labelled fields and a live VAT/total preview.

**Navigation model:** places in a sidebar at the inline start (right in Arabic), ≤ 5 items, the current one marked with `aria-current` and the saffron keystone. Clients, Reports and Settings have no destination in this repository — they stay visible (learned) but are *not* rendered as controls.
> **Question:** where should Clients, Reports and Settings link? **Assumption:** they are production routes outside this repo; they stay as inert labels so nothing pretends to be clickable. The Invoices item links to the invoice table on this page.

On phones the sidebar becomes a horizontal list under the top bar; New invoice becomes a full-width bottom bar in the thumb zone.

**Density:** desk: 14 px body (Arabic optically ~15 px via `size-adjust`), rows 40 px, controls 32–36 px. Phone: 15–16 px body, inputs 16 px, targets ≥ 44 px, the table becomes stacked rows. No density toggle (24 rows; not a management table) — a non-goal.

**Elevation model:** canvas (teal-tinted neutral) → surfaces (white panels, 1 px border, no shadow) → overlay (the dialog, the only shadow). No surface inside a surface: the summary is one surface divided by hairlines, not four cards.

**State language:** every panel has loading (skeleton after 1 s), error (says what failed, with Retry — degrade the part), empty (why + next action) and the data's freshness ("Loaded 17:12", with Refresh). Status = word + shape + colour: Paid (filled check, neutral), Sent (hollow circle, neutral), Overdue (filled alert, red), Draft (dashed circle, neutral). Lateness in words ("92 days late", "متأخرة 92 يومًا").

**What users have learned that stays:** page order (summary → middle row → invoice table), the sidebar and its labels, the table's eight columns in their order, the status words, New invoice in the table header (desktop), the language link in the top bar. **What changes on purpose:** in the middle row the late panel moves to the start side and the chart to the end side (reason above); below 1200 px the sidebar becomes a row under the top bar; on phones New invoice is pinned at the bottom.

**Where brand shows:** the mark and the Plex wordmark in the top bar; teal for the primary action, links, focus and the current-place fill; the saffron keystone as the current-place marker and in the dialog's saved state; Plex Sans Arabic everywhere; the arch outline in empty states. Not in controls, not in motion.

**First viewport, exactly (1440 × 900, Arabic):** top bar 56 px — mark + "سند" wordmark at the inline start, greeting and avatar, notifications and "English" at the inline end. Sidebar 216 px at the right. Content: h1 "لوحة التحكم" (20 px) with the business name and VAT number beneath (14 px), freshness + Refresh at the inline end, a one-line scope sentence (which invoices the totals cover; the date lateness is counted to). Summary strip (4 cells, values 24 px Plex 600, 2 decimals, unit after): *Awaiting payment* · *Past due date* (red icon, "2 of them marked Overdue") · *Paid* · *VAT on issued invoices*. Below, the Past due panel (start side, ~53 %) and the chart (end side, ~47 %); the ageing strip and the first four late invoices are in the fold at 900 px. At 390 px: summary cells stack two-by-two, then the Past due panel, then chart, then invoices; New invoice pinned at the bottom.

**Breaks if:** (1) any amount appears with other than two decimals or in a second digit system; (2) any colour other than red marks a status, or red appears on something that is not late; (3) a number appears that the API did not give or that the page does not show how to derive.

**Convergence checks (brand layer only):**
- *Similar-brief test* — for another Saudi invoicing product the *layout* would be similar (receivables first, exact tables), which is right for a productive surface; the brand layer — arch-and-keystone mark, Plex Sans Arabic from the wordmark, deep teal chrome accents, the keystone as the "you are here" marker — would not fit Qoyod or Wafeq.
- *Category test* — "fintech dashboard" predicts navy/blue + green/red and a revenue hero. This direction is teal-from-the-mark, red only for late, no green, and leads with what is owed.
- *Second-order test* — "not purple" is not the reason for teal; the mark is. Plex is not "a better Inter"; it is the face named in the logo file.
- *Ledger* — one sentence: "white surfaces on a teal-tinted canvas, IBM Plex Sans Arabic 400/600 for everything, no label device beyond sentence-case 12 px labels, no dark chapters, teal action + saffron keystone marker, red for late only." Compared with `ledger.md`: brio3/Brandigade (paper + serif + mono), CleoHR (blue + Bricolage), Milkline (navy + Fira/Nunito/Atkinson; navy chrome). Nearest is the Milkline herd screen (tinted cool canvas); Sanad keeps chrome white rather than dark-brand, uses a different hue family (teal 190° vs navy 250°), a different face and a warm keystone accent. Not a sibling.

**Memory test** (productive, brand layer): "the teal arch with the gold square; the numbers all line up; it told me SAR 80k is late."

## Typography

- **Type set (productive only)**, ratio ≈ 1.2, fixed px (no fluid type in an app): 12 (label, table header, detail) · 14 (body, table cells, controls) · 16 (panel titles) · 20 (h1) · 24 (summary values). Line heights 16 / 20 (Arabic 24) / 24 / 28 / 32. Weights 400 and 600 only.
- **Family:** IBM Plex Sans Arabic (OFL-1.1, Fontsource 5.3.0 — Arabic + Latin subsets, self-hosted woff2). Reason: it is the face named in the brand's wordmark; it is a bilingual system with a Latin identical to IBM Plex Sans. On `saturated-fonts.json`'s radar (Plex ◆) — justified as a documented brand asset.
- **Figures** (`fonts.mjs`, `audit/fonts-plex.txt`): Latin 0–9 **tabular by default**; Eastern Arabic ٠–٩ **proportional, no `tnum`**. Hence Western digits in both languages (below).
- **Numerals — the client's decision** (`multilingual.md` §2 rule 5). > **Question:** Western (0–9) or Eastern Arabic (٠–٩) digits on the Arabic side? **Assumption:** Western digits in both languages: they are tabular in the brand face, ZATCA invoices and the VAT number are written in them, invoice ids are Latin anyway, and owner and accountant then read identical figures. Set in code (`ar-SA-u-nu-latn`), one constant to change; switching to Eastern digits also needs the digit-borrowing `unicode-range` recipe (§2a) because Plex's Eastern digits would not align.
- **Calendar:** Gregorian in both languages, day-month-year with the month in words (`ar-SA-u-ca-gregory-nu-latn`, `en-GB`). > **Question:** do owners want Hijri dates shown as well? **Assumption:** no — invoices, due dates and VAT periods are Gregorian.
- **Arabic rules:** no tracking, no synthetic italic (`font-synthesis: weight`), Arabic face `size-adjust: 106%`, body line-height 1.7 in Arabic.
- **Caps/tracked-label device:** none. Labels are sentence case, 12 px, 400, muted.
- **Loading:** four woff2 files (Arabic 400/600, Latin 400/600) ≈ 126 KB, `unicode-range` per subset, all four preloaded, **`font-display: optional`** (changed from `swap` in Phase 6: a late swap moved the whole dashboard — Lighthouse CLS 0.26–0.75; a daily-use app has the files cached after the first visit).

## Colour

**Strategy:** Restrained — tinted neutrals carry ~90 %, teal ~8 % (action, current place, chart), red only on late items, saffron as a keystone spot (< 0.5 %).

**Harmony and sources:** hue 190° (the mark's teal) dominates chrome and data; saffron 81° (the keystone) is the complement, used as a point; red 27° is reserved for status.

**Use scene:** light only — an owner on a phone in a bright shop, an accountant at a desk.

**Scales:** `palette.mjs --brand '#0E5E5A'` and `--brand '#E0A526'` (`audit/palette-teal.txt`, `audit/palette-saffron.txt`); neutrals tinted at hue 190, chroma ≤ 0.02; text steps darkened past the solved step 11 so muted text has margin (≥ 6:1 rather than 4.5:1 exactly). Status red chosen for ≥ 4.5:1 as text on its tint. No green anywhere: success would sit next to a teal accent and blur the "colour = late" rule, and "Paid is quiet" (app-ui §7).

| Token (role) | Value | Use |
| --- | --- | --- |
| `--canvas` / `--surface` / `--surface-sunken` | `#f3f6f6` / `#ffffff` / `#f7f9f9` | page / panels, dialog / table header, skeleton |
| `--text-strong` / `--text` / `--text-muted` | `#10201f` / `#27393a` / `#526361` | titles, numbers / body / labels, meta |
| `--border-subtle` / `--border-control` | `#dfe5e4` / `#7c8a88` | dividers (decorative) / inputs, filter chips (≥ 3:1) |
| `--accent` / `--accent-hover` / `--accent-text` / `--on-accent` | `#0e5e5a` / `#00504c` / `#0e5e5a` / `#ffffff` | primary button, links, chart |
| `--selected` | `#e3efee` (teal step 3.5) | current nav fill, pressed filter chip — plus a text/shape cue |
| `--keystone` | `#e0a526` | the mark's keystone; current-place marker (never text, never status) |
| `--danger` / `--danger-subtle` / `--danger-border` | `#b3261e` / `#fbeceb` / `#e8b4b0` | past due / overdue: text, icon, tint |
| `--focus` | `#0e5e5a` 2 px outline, 2 px offset | every focusable element |
| `--chart-bar` / `--chart-bar-latest` | `#6e9f9b`→ see table / `#0e5e5a` | past months / latest month |

**Contrast table** (`contrast.mjs --css assets/tokens.css`; full output in `audit/contrast-tokens.txt`). Every pair actually used, WCAG 2 / APCA Lc:

| Text or mark | Ground | WCAG | APCA | Use |
| --- | --- | --- | --- | --- |
| `--text-strong` #10201f | surface #fff / canvas #f3f6f6 | 16.82 / 15.48 | 103.7 / 98.0 | titles, numbers |
| `--text` #27393a | surface / canvas / selected #e3efee… | 12.12 / 11.15 / 10.39 | 97.7 / 91.9 / 87.2 | body, table cells |
| `--text-muted` #526361 | surface / canvas / surface-sunken | 6.33 / 5.83 / 5.99 | 81.5 / 75.8 / 77.7 | labels, rules, table headers |
| `--accent-text` #0e5e5a | surface / canvas | 7.59 / 6.98 | 86.0 / 80.2 | links, quiet buttons |
| `--danger` #b3261e | surface / danger-subtle | 6.54 / 5.70 | 80.8 / 71.5 | late notes (text), bars |
| `--danger-strong` #93201a | surface / danger-subtle | 8.53 / 7.43 | 88.0 / 78.6 | late figure, Overdue tag text, errors |
| `--selected-text` #164441 | selected #e0f1ef | 9.29 | 84.5 | current nav, pressed chip |
| white | accent #0e5e5a / accent-hover #00504c | 7.59 / 9.33 | −90.8 / −95.4 | primary button |
| `--border-control` #7c8a88 (non-text) | surface / canvas | 3.59 / 3.30 | — | inputs, chips (≥ 3:1) |
| `--focus` #0e5e5a (non-text) | surface / canvas / selected | 7.59 / 6.98 / 6.50 | — | focus ring |
| `--chart-bar` #5e8f8b (non-text) | surface | 3.63 | — | past months |
| `--chart-bar-latest` #0e5e5a | surface | 7.59 | — | latest month |
| `--keystone` #e0a526 (non-text) | surface | 2.19 ✗ | — | **decorative only**: the current-place marker duplicates `aria-current` + fill + weight, and the logo keystone; never the sole signal |

`audit.mjs` after: 0 text elements below AA on the painted ground, both languages, 1440 and 390 (`audit/after/audit.md`).

## Layout and space

Sidebar 216 px (desk ≥ 1024), content max-width 1200 px, gutter 24 px (16 px on phones). Grid: summary 4 columns (2 × 2 below 900 px, 1 × 4 stacked below 360 px); chart 2 fr + Past due 1 fr (stacked below 1024 px); table full width. Spacing 4 · 8 · 12 · 16 · 24 · 32. Radii: controls 6 px, panels 8 px, dialog 12 px, status tags 999 px (tags only). Panels divided by space and 1 px borders; no shadows except the dialog.

## Imagery and graphics

No photography or illustration: this is a working screen whose content is the user's invoices; any image would compete with the numbers. The graphics layer is the mark itself — the arch outline appears once, in empty states ("nothing past due"), drawn from `logo.svg`'s path. Icons: IBM Carbon icons (Apache-2.0, drawn for Plex; 16 px; square terminals), inlined as SVG with `currentColor`. Credits in `assets/CREDITS.md`.

## Motion

Productive: none on anything frequent. The dialog backdrop fades in 120 ms (ease-out); nothing else animates. `prefers-reduced-motion: reduce` → no transition. Skeletons do not shimmer. Values never count up. Nothing auto-updates.

## Interaction

- **Primary action:** "فاتورة جديدة / New invoice" — teal filled button, in the invoice table's header (learned); on phones, pinned full-width at the bottom. The only filled button on the screen.
- **Components and state rows:** see `SYSTEM.md` (summary cell, status tag, filter chips, table with sort and totals, past-due list, chart, dialog form, top bar, sidebar).
- **Form:** fields kept (client, amount). Labels above. "Client" with a `<datalist>` of the business's clients; "Amount before VAT (SAR)" as `type="text" inputmode="decimal"` accepting 0–9, ٠–٩ and ٫. Live preview of VAT (15 %) and total (preview only — the backend's figures are the invoice's). Validate on submit, then live; errors beside each field, first invalid field focused; both fields required, marked "(required)" in words? — both are required, so neither is marked; the hint says so once. Save prevents double submission by replacing the form with a saved state.
> **Question:** is the dialog's amount the net (before VAT) or the total? **Assumption:** net — it matches the table's "Amount" column, which is net. The analytics payload is unchanged: `{ amount: Number(<what the user typed, normalised>) }`.
- **Targets:** 32–36 px desk controls with ≥ 8 px gaps; 44 px on coarse pointers; the bottom bar button 48 px.
- **Performance budget:** LCP ≤ 2.5 s on Lighthouse mobile (measured 2.26–2.33 s, element `#scope`); CLS ≤ 0.1 (measured 0); fonts ≈ 126 KB; JS ≤ 20 KB gzip (measured 12.2 KB); no third parties (Google Fonts removed). Space for data-driven content is reserved by skeletons in the static HTML; the English page sets `dir` in `<head>` and hides the Arabic source strings until they are swapped (fail-safe 1.5 s).

## Accessibility

WCAG 2.2 AA; aiming for 2.4.13 and 2.3.3.

- **Contrast table:** in Colour (measured). Non-text: input and chip borders `#7c8a88` on white ≥ 3:1; focus ring `#0e5e5a` on white and on `#f3f6f6` ≥ 7:1; chart bars ≥ 3:1 on white; status icons in text colour.
- **Focus token:** `outline: 2px solid var(--focus); outline-offset: 2px` on `:focus-visible` everywhere, never removed; `scroll-padding-bottom: 72px` on phones for the pinned bottom bar, `scroll-padding-top: 8px`.
- **Targets:** 24 px floor everywhere; 44 px on `(pointer: coarse)`; filter chips 32 px desk / 44 px touch.
- **320 px state:** top bar wraps (mark + language link on the first line); nav as a horizontal list that wraps; summary cells stack; table becomes stacked rows (each a list item with label–value pairs, numbers right-aligned); dialog full-width with `max-height: 100dvh` and its own scroll.
- **Colour independence:** status = word + icon shape; late = words ("92 days late") + icon; current nav = `aria-current` + weight + keystone + fill; sort = arrow + `aria-sort`; chart = values in labels and a data table.
- **Motion:** the dialog fade → none under reduced motion. Nothing auto-updates (so no pause control).
- **Forced colours:** controls keep transparent borders that become visible; focus is an outline; icons use `currentColor`; the pressed filter chip shows a check icon and `aria-pressed`, not only a fill; the keystone is supplementary.
- **Component map:** top bar `header` + logo `a[href]` (home, current language) · language link `a[href][lang][hreflang]` · notifications `button` (icon-only, `aria-label`) · sidebar `nav[aria-label] > ul > li > a[aria-current]` / inert label · page `main` with one `h1` · summary `section[aria-labelledby]` with `dl` cells · chart `figure > svg[role=img][aria-labelledby]` + `figcaption` + `details` "show as table" (`table`) · past-due `section` with `ol` · invoices `section` + `search > label + input` + status filter = `button[aria-pressed]` group in a labelled `div role=group` + `table > caption, th[scope][aria-sort] > button` + `tfoot` · live result count `p[role=status]` · New invoice `button` → `dialog` via `showModal()` with `aria-labelledby`, `form[novalidate]`, labelled inputs, `button type=submit`, close `button[aria-label]`. No custom ARIA widgets. No keyboard shortcuts (a non-goal).
- **Forms:** GOV.UK/Primer pattern — validate on submit, focus the first invalid field (2 fields → no summary), messages linked by `aria-describedby`, `aria-invalid`; no `autocomplete` tokens apply (a client company name is not the user's personal data) — `autocomplete="off"` on amount only; paste allowed.
- **Announcements:** result count after filtering = `role=status` (polite); data load failures = inline message with Retry, focus not moved; save result = the dialog's saved state receives focus on its heading.
- **Data:** chart has a text summary in its caption and a "Show as table" disclosure; every amount on screen is also text.
- **Preserved features:** `dir=rtl` (now in the static HTML, with `lang`), zoom allowed, real `<table>`, native buttons, language names in their own script.

## Keep / replace / remove / create

**Keep:** page order and learned locations (except the middle-row swap argued above); the eight table columns and their order; status words; all ids and the `sanadTrack` call; the `?lang=en` route; the data contract; the language link's wording.

**Replace:** Tajawal/Poppins from Google Fonts → self-hosted IBM Plex Sans Arabic; purple palette → tokens from the mark; "✦ Sanad" → the mark + Plex wordmark; the greeting h1 → "Dashboard" h1 with business name and VAT number (greeting moves to the top bar); KPI tiles → a defined summary strip; "Overdue invoices" → "Past due" with ageing and invoice numbers; bar chart → labelled chart with axis, values and a table; the modal `div` → `<dialog>` form; emoji → Carbon icons; all physical CSS → logical properties.

**Remove:** the invented deltas; the violet gradient; card shadows; `*:focus { outline: none }`; `Math.round` on money; `type="number"`; hard-coded Arabic in the English page; pointer cursors on non-controls.

**Create:** tokens (`assets/tokens.css`); loading, error, offline, empty and no-results states; status filter; sorting; totals footer; freshness + Refresh; the phone layout (stacked rows, bottom action bar, horizontal nav); VAT/total preview; the saved state; `SYSTEM.md`; `assets/CREDITS.md`.

## Secondary pages

None in scope. Clients, Reports and Settings would adopt `assets/tokens.css` and the table/panel patterns in `SYSTEM.md`.
