<!-- Saved from the evaluation agent's hand-back message: its own write of this file was blocked by the harness's rule that subagents return reports as text. The text is as the agent wrote it. -->

# Sanad dashboard redesign — report

Branch `redesign`. Scope: `index.html` and `assets/`. `data/invoices.json` is unchanged. The reasoning is in `DESIGN.md`, the component rules in `SYSTEM.md`, and the review in `CRITIQUE.md`.

## What changed, and why

**1. The numbers are now correct and line up, in both languages.** The complaint that "the amounts look wrong sometimes" had six concrete causes in the old code:

| Before | After |
| --- | --- |
| Totals dropped trailing zeros (`SAR 12,748.5`, `306.9`). Net and VAT were printed raw (`20257.3`, with no grouping). | Every amount goes through one formatter and always has two decimals (`12,748.50`). Sums are added up in whole halalas, so there is no floating-point drift. |
| The Arabic page mixed two digit systems in one row: `٥٥٬٤٨٤` in totals, `1928.24` in net. | One digit system on both pages (Western 0–9, see decision D1). It is set in code, so it no longer depends on the browser's locale. |
| Every column was left-aligned in proportional figures. | Amount columns are right-aligned in **both** directions, with tabular figures, so the decimal points line up. There is a totals row, and the currency is in the column header. |
| Arabic dates came out in the Hijri calendar (`١٤٤٨/٤/١٧ هـ`) and English dates as US `9/15/2026`, so the owner and the accountant saw different dates for the same invoice. Dates were also shifted a day early for anyone west of UTC. | Both pages use Gregorian dates written as day, month name, year (`15 سبتمبر 2026`, `15 Sept 2026`). They are parsed as calendar dates, so there is no time-zone shift. |
| "Outstanding" left out overdue invoices. "VAT collected" included SAR 9,314.58 of VAT on drafts that were never issued. "Total revenue" contradicted the revenue chart. KPIs were rounded to whole riyals. | Four totals, each with its rule written underneath: **Awaiting payment** 81,579.38 (14 invoices, Sent or Overdue) · **Past due date** 80,625.35 (13 invoices, 2 of them marked Overdue) · **Paid** 55,483.85 · **VAT on issued invoices** 17,877.81 (drafts excluded). A scope line says which invoices these totals cover and the date that lateness is counted to. |
| The KPI deltas `+12.4%`, `−3.1%`, `+8%` and `+5.2%` were constants typed into `app.js`. | Removed. The only comparison left is one the data supports: September against August, from `revenue_by_month`, marked "to date". |

**2. The dashboard now shows what is late.** Using the due dates the API already returns, **13 of your 14 unpaid invoices are past due (SAR 80,625.35), and 5 of them are more than 90 days late.** The old "Overdue" panel listed only 3 invoices. The new *Past due* panel shows:

- an ageing strip (not yet due, 1–30, 31–60, 61–90 and 90+ days)
- the most-late invoices, with invoice number, days late and amount
- a note that 3 drafts are past their due date and were never issued, including INV-2026-1047 for SAR 49,843.15

The panel moved to the start side of the middle row, which is the one learned position this redesign changes. The API's own status words are unchanged (see question Q1).

**3. It looks like Sanad.** The purple gradient, the "✦ Sanad" text logo and the emoji are gone.

- **Mark and colour:** the 2024 mark (the arch and the saffron keystone) sits in the top bar and in the favicon. Deep teal `#0E5E5A` from the mark is used for actions, links, focus rings and the chart.
- **Saffron:** it appears only as the keystone, which also marks your current place in the navigation.
- **Red:** it means "late" and nothing else. There is no green; "Paid" is shown quietly, with a check icon.
- **Type:** **IBM Plex Sans Arabic**, the face named in the logo file, is self-hosted and replaces Tajawal and Poppins. Neither of those has tabular figures, and neither loaded in our test browser anyway. The icons are IBM's Carbon set, drawn for Plex.

**4. It works on phones, by keyboard, and in both languages.**

- **Phones:** the old phone view showed 2 of 8 columns and could not scroll. Each invoice is now a stacked row that shows all eight values. The navigation is visible, and *New invoice* is pinned where a thumb reaches.
- **English page:** it used to contain Arabic ("+ فاتورة جديدة", "بحث…", the dialog's fields). It is now fully English.
- **New-invoice dialog:** it is now a real dialog with labelled fields, and it can be completed by keyboard, which was impossible before because *Save* was a `div`. It accepts **Arabic digits**: the old `type="number"` field silently discarded `١٢٥٠` and showed "Error" (`audit/before-probe-track.json`). It rejects a third decimal place and shows VAT (15 %) and the total before you save. `window.sanadTrack('invoice_create', { amount })` still fires with the amount entered.
- **Loading, errors and empty data:** each now has its own state, and there is a *Refresh* button that reports whether it worked. Before, loading, error and offline all looked like an empty page.

## Before and after

- First screen, desktop: `captures/compare/fold-1440-ar.png`, `captures/compare/fold-1440-en.png`
- First screen, phone: `captures/compare/fold-390-ar.png`, `captures/compare/fold-390-en.png`
- Full phone page: `captures/compare/full-390-ar.png`
- Blurred ("squint") comparison: `captures/compare/squint-1440-ar.png`
- Every width: `captures/before/*`, `captures/after/*` (1440, 1280, 1024, 768 and 390, both languages), plus the no-JS, forced-colours and reduced-motion renders in `captures/after/`
- Every state (loading, error, offline, stale copy, empty, one invoice, 200 invoices, long names and 7-digit amounts, search with no results, filter and sort, chart hover and table, row hover, the dialog's open, error, Arabic-digit preview and saved states, keyboard focus, and phone states): `captures/states-after-ar/`, `captures/states-after-en/`. The same scenarios on the old build are in `captures/states-before-*`.

## What was verified, and how

| Check | Before | After |
| --- | --- | --- |
| `audit.mjs --kind app`, 1440 and 390, both languages | 7 fails per page and width: contrast (19 elements at 1.9:1), invisible focus on 4 of 4 controls, 5 fake nav controls, no `lang`, fonts not loading, 151–176 clipped elements at 390, axe (contrast, lang, landmarks) | 1 finding: the ageing bars flagged as "colour alone". This is a false positive: each bar is `aria-hidden` inside a row whose header states the period in words, with the amount and count beside it (see the ageing table in `audit/after-a11y-*/aria-snapshot.yml`). axe finds 0 violations. Type sizes 12/14/16/20/24. CLS 0. |
| `a11y.mjs`, both languages | 16 FAIL, 9 or 5 WARN | 0 FAIL, 0 WARN |
| `widgets.mjs`: dialog, form errors, save announcement, disclosure, filter announcement | 3 of 3 contracts failing | 10 of 10 passing across both languages |
| `states.mjs` (23 scenarios per language) | loading, error and offline rendered byte-identical | every scenario renders differently; no console errors apart from the simulated failures |
| `parity.mjs` against the old build | — | All routes, ids, form fields and metadata kept. "Dropped" items: the four invented deltas (removed on purpose) and US-style dates (reformatted). "Unsourced" items: days late, bucket limits, axis ticks and "17.7%". All of these are computed from API fields. |
| Lighthouse 12.8.2, mobile, 3 runs each | Arabic: score 0.98 / 0.98 / 0.80, LCP 1.38 s, CLS 0 / 0 / 0.42. The old page's fonts failed to load here, so its 18 KB is not a production figure. | Arabic and English: score 0.98 in all 6 runs, LCP 2.26–2.33 s (budget 2.5 s), CLS 0, 225 KB (126 KB of it fonts) |
| Analytics and form probe | Arabic digits dropped; `1250.555` tracked | `invoice_create` fires once with `{amount: 1250.5}` for `١٢٥٠٫٥٠` and for `1,250.5`. It does not fire for an empty amount or for three decimals. |
| `node --check assets/app.js` | — | passes. The project has no build, lint or test commands. |

**Not verified:**

- **Screen readers:** no screen reader was available. An NVDA + Chrome and VoiceOver + Safari smoke test is recommended.
- **Real devices:** no real phone was tested.
- **Real users:** no testing with owners or accountants.
- **Live references:** competitor sites could not be opened because the network is restricted. The design references were read from code and npm packages instead.

## Decisions for you

The questions below were marked "ask the user" in the method. No one was available, so each is followed by the assumption I built on.

- **Q1: Past due or Overdue.** Eleven invoices are still "Sent" although their due date has passed, and INV-2026-1051 is "Overdue" on its due date. Should the API mark invoices overdue from the due date?
  - *Assumption:* the API's status is shown exactly as returned, and lateness is shown separately as "past due date", worked out from the due date. If the API starts setting the status, the two will simply agree.
- **D1: Digits.** Should the Arabic page use Western (0–9) or Eastern Arabic (٠–٩) digits?
  - *Assumption:* Western, on both pages. They are tabular in the brand face, the VAT number and invoice ids already use them, and owner and accountant read the same figures. Plex's Eastern digits are proportional, so switching would need a borrowed digit font. The locale is one constant in `app.js`.
- **D2: Hijri dates.** Do owners want Hijri dates shown alongside Gregorian?
  - *Assumption:* no.
- **D3: New-invoice amount.** Is the amount in the dialog before or after VAT?
  - *Assumption:* before VAT, matching the table's "Amount" column. The analytics payload is unchanged.
- **D4: VAT rounding.** INV-2026-1050's VAT is 3,038.59, but 15 % of 20,257.30 is 3,038.595, which rounds half-up to 3,038.60. The screen shows the API's figure exactly. The dialog's preview rounds half-up. Please confirm which rounding the backend uses for ZATCA.
- **D5: Unwired navigation.** Clients, Reports and Settings have no destination in this repo. They are shown as plain labels, not as fake links. Where should they go?
- **D6: Other questions.**
  - Does `revenue_by_month` include VAT, and is it invoiced or collected revenue?
  - Are the five top tasks in `DESIGN.md` the right ones?
- **Production:** nothing is deployed and nothing was pushed.

## Left out, and why

- **Invoice detail, editing, reminders:** these pages or features don't exist in this repo, and the dashboard doesn't pretend they do.
- **Saving an invoice:** as before, the static front end only fires the analytics event. The dialog's "Invoice saved" state mirrors the old "✓".
- **Dark theme, density toggle, keyboard shortcuts:** none of these existed before; they are recorded as non-goals.
- **Social image or Open Graph tags:** this is a signed-in app page.
- **Language switching before first paint:** the static page is Arabic, and English swaps the strings in with JavaScript. In production the server should render the right language. There is a fail-safe that stops the English page staying hidden if the script fails.

## For the skill's maintainer

The skill is read-only here, so its ledger row is given below instead of being written into the skill.

**Ledger row:**

`2026-09-28 | Sanad dashboard — blind test on a fixture (capture: captures/after/home-1440-after-fold.png) | fintech dashboard, productive / redesign of brand layer + refine | IBM Plex Sans Arabic 400/600 (the face named in the wordmark SVG), Western tabular digits in both languages | white surfaces on teal-tinted canvas #F3F6F6 · ink #10201F · teal #0E5E5A action from the 2024 arch; saffron #E0A526 only as keystone / current-place marker; red #B3261E for late only, no green; Restrained | no hero: summary strip of four defined totals, exceptions-first Past-due panel with ageing strip, labelled revenue chart, exact invoice table with totals row; Carbon icons | none (test)`

**Proposed lessons:** see `EVAL-NOTES.md` §8.
