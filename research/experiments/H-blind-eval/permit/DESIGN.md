# Harbourside Council resident parking permits: design direction

Written 2026-09-28, before implementation. Benchmark for finish: the GOV.UK Design System's question-page, validation, check-answers and confirmation patterns (read in source, see References). This must read as *Harbourside Council's* service, not as GOV.UK's, not as the previous purple SaaS page, and not as the model's default.

> **Unattended run.** No one from the council could be asked. Every point marked **ASSUMPTION** or **QUESTION** below is something the council owns; the build proceeds on the stated assumption and the report lists them first.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/` start page | public service (start page), currently dressed as a marketing landing page | once a year per household at most (a 3, 6 or 12 month permit) | money and legal (parking without a valid permit; paying for the wrong zone or length) | plain / productive | **rethink**: from a marketing hero to a service start page (the user asked for a redesign; the audit shows the problems are content and structure, not styling) |
| `/apply/` application | public service (transaction) | once per permit | money and legal; personal data | plain / productive | **rethink** of the flow inside the same URL: one question group per step, street first, price before personal details, check answers, confirmation. Fields, events and URL unchanged |

**Audience and context:** Harbourside residents on streets in the four controlled parking zones (CPZs), applying for a permit for their own car, often on a phone, often in one sitting between other things, some with low vision, some keyboard- or screen-reader-only, some with a Blue Badge. The least confident user: an older resident on a phone who does not know what a CPZ is and does not know which zone they are in.

**Top tasks** (ranked; **ASSUMPTION** — derived from the README's contact-centre complaints, not confirmed by the council):
1. Find out whether my street is in a zone, and which one. (Complaints: "I didn't know if my street was in a zone until the end", "What is a CPZ?")
2. Find out what my permit will cost before I type anything personal. ("I didn't find out the price until after I'd typed everything in.")
3. Apply and get a reference, on a phone, without losing my answers. ("I couldn't do it on my phone…", "It timed out and I lost everything.")
4. Fix a mistake when the form rejects something. ("The page told me there was an error but not where.")

**Problems** (severity 0–4 × task importance; each traced to a finding in the Audit below):
1. **4** Keyboard and screen-reader users cannot submit at all: submission requires a fake "I am not a robot" `<span>` that only a mouse can toggle (`a11y.mjs`: pointer 2.1.1 FAIL on `span#human`). Tasks 3.
2. **4** Hard 10-minute timer from page load (not inactivity) that alerts and reloads the page, wiping every answer. `site.js` `setTimeout(… location.reload(), 10*60*1000)`. WCAG 2.2.1 fail. Task 3.
3. **4** The phone layout is 940 px wide and loads zoomed out; the zone table runs off the screen (`audit.mjs` 390: viewport widened to 940 px, overflow by `#zones`). Tasks 1, 3.
4. **4** Errors: one generic sentence at the top, off-screen when the Submit button is pressed (states capture `submit-empty-phone-before.png` shows nothing changed; `states.mjs` reported the server-error click "changed nothing on screen"); no field is marked; offline and server error look identical ("Error 500"). Task 4.
5. **3** Street → zone is never answered: the zone select says "CPZ A–D", the table lists streets in one cell, and "CPZ" is never explained. Tasks 1.
6. **3** Price appears only after both zone and duration are chosen, below the Submit button, and ignores the Blue Badge rule (`rules.blue_badge_free`). Task 2.
7. **3** Seven fields labelled only by placeholders, two selects and the file input without names (`a11y.mjs` names 3.3.2 / 4.1.2; axe `label`, `select-name`); jargon labels "VRM", "CPZ", "Duration", "Make".
8. **3** Field borders 1.24:1 and selects 1.08:1 (1.4.11); muted text 2.52:1 and footer 2.35:1 (1.4.3); no visible focus on buttons (`outline: none`).
9. **2** No `lang`, no `main`, no skip link, heading jump h1 → h3.
10. **2** The start page gives none of what a resident needs (eligibility, zones, prices, what to have ready, what happens next) and makes unverifiable claims instead ("Bank-level security", "Apply in minutes", "Eco-friendly", "New & improved"), with emoji icons and cliché copy (`audit.mjs` signals).
11. **2** Montserrat is requested from Google Fonts on every page: it failed to load here (TLS), it is a third-party request carrying residents' IP addresses, and it is on the saturated-faces list.
12. **2** Blue Badge and consent checkboxes sit on one line (ambiguous); "T&Cs" is not linked to any terms; no `autocomplete`; phone is not `type="tel"`.
13. **1** Footer names Privacy, Cookies and Accessibility but none is a link; a public body's accessibility statement must be reachable (UK PSBAR 2018).

**Principles** (each can say no):
1. **Answer before you ask.** Eligibility (street → zone) and price come before any personal detail. A reasonable team could put "Your details" first.
2. **One question group per screen, and nothing hidden behind the end.** No step reveals a fact that would have changed an earlier answer.
3. **The resident's words, not ours.** "Parking zone", "registration number", "how long" — "CPZ" appears once, explained. No marketing sentence in a transaction.
4. **Nothing the resident typed is lost** — not to a timer, not to a reload, not to a failed send.
5. **The crest carries the brand; the controls stay plain.** Brand lives in the header, colour roles and focus state, never in custom controls.

**Non-goals:** changing the back end, the posted fields, the analytics events or the URLs; adding accounts, save-and-return by email, payment, or address lookup (none exist in the back end); a new visual identity for the council (the crest stays as it is); pages the repo does not contain (privacy, cookies, accessibility statement).

**Constraints:** static HTML + one CSS + one JS file, no build step, no framework, no component library (restyle, don't add one). Contracts: `POST /api/apply` JSON with exactly `full_name, email, phone, address_line1, postcode, zone, vehicle_reg, vehicle_make, permit_length, proof_of_address` (file name), `blue_badge`, `consent`; `window.hbcTrack(event, props)` with `apply_start`, `apply_submit`, `apply_error {field}`, `apply_success {reference}`; URLs `/` and `/apply/` (printed letters); `data/zones.json` read-only (nightly export). Surviving brand asset: `assets/crest.svg` (2019). Legal: WCAG 2.2 AA (the UK Public Sector Bodies Accessibility Regulations 2018 require it of council websites, plus an accessibility statement). Performance: works on a slow phone connection — LCP ≤ 2.5 s at slow 4G, page weight under 60 KB compressed (measured after build: ≈ 39 KB for `/apply/`, of which 25 KB is the two font files). English only, LTR.

**Success measures** (public service): completion rate `apply_start` → `apply_success` (and `/apply/` visits → `apply_success`, since letters link straight to it); `apply_error` count per field per submission; contact-centre calls in the six complaint categories; share of applications from phones. **Baseline: none in the repo** — the council's analytics hold it (QUESTION).

## Audit

**What the council offers, to whom:** a resident parking permit (3, 6 or 12 months) for people living on one of 15 streets in four controlled parking zones: A Old Harbour, B Station Hill, C Castle Green, D Northshore (`data/zones.json`, updated 2026-09-27).

**The one thing a resident should be able to do:** find out whether they qualify and what it costs, then apply and leave with a reference number.

**Real proof that exists:** the zones, streets, controlled hours and prices; the rules (at most 2 permits per household, free for Blue Badge holders, proof documents accepted, decision in 5 days). Nothing else. The old start page's claims have no source.

**Brand assets sampled:** `palette.mjs --from assets/crest.svg` → harbour blue `#0b4f6c` (oklch 40.3% 0.079 233), gold `#f2c14e` (oklch 83.4% 0.141 85), white. A shield with two gold waves and a white lighthouse. No wordmark file: "Harbourside Council" is set in the page font in uppercase with wide tracking. No brand family available (no other council surfaces in the repo; live sites unreachable).

**Measured baseline** (`audit.mjs --kind service`, 1440 and 390, in `audit/before/`; `a11y.mjs` in `audit/before-a11y-*`):
- Type: 7 sizes on `/` (52 / 28 / 18 / 17.5 / 15 / 13 / 12), 4 on `/apply/`; body 15 px; Montserrat declared, not loaded (fallback rendered).
- Contrast: footer 2.35:1, muted text 2.52:1; field borders 1.24:1, selects 1.08:1.
- Focus: none on `.btn` (`outline: none`), in normal and forced-colours modes.
- Targets and layout: phone viewport widened to 451 px (`/`) and 940 px (`/apply/`).
- Semantics: no `lang`, no landmarks, no skip link, h1 → h3; axe critical `label` ×1, `select-name` ×2.
- Signals: violet/indigo gradients ×3, emoji icons, "seamless / empowers / unlock / streamlined".
- LCP ~0.4 s local (h1); CLS 0.031 on `/apply/` (the table arrives after fetch).
- Accessibility features already working (keep): `novalidate` on the form; the page title exists; the viewport does not block zoom. Nothing else.

**Must be preserved (functionality and truth):**
- Routes: `/`, `/apply/`, `/data/zones.json`, `/assets/crest.svg`, `/assets/site.css`, `/assets/site.js`.
- Ids and hooks: `form#apply`, `#errors`, `#price`, `#zones` (script hooks in the old build; `#zones` and `#human` are replaced — see Remove), `data-track="start"` on the start link.
- Form fields: the twelve names above, with the same value types (strings; `blue_badge` and `consent` booleans; `proof_of_address` the file's name or `""`); the same required set as the old validation (every text/select field; not the file; consent).
- Analytics: the `hbcTrack` stub line, verbatim; `apply_start` on the start link click; `apply_submit` before the POST; `apply_error {field}`; `apply_success {reference}`.
- Legal copy: "© 2026 Harbourside Council", "Privacy", "Cookies", "Accessibility", the consent statement.

**Why the current design fails:** see Problems 1–13 above; in one sentence — it is a marketing page wrapped around a form that hides its two answers (zone and price) until the end, then punishes mistakes and slowness.

**The five things a stranger notices first** (expressive-only rule; recorded because the start page changes category): purple→blue gradient header and hero; "Park with Confidence 🚗" centred hero; three emoji icon cards; pill gradient buttons; Montserrat-like geometric sans. All five go.

**Walkthrough of the old build (cognitive, phone, keyboard):**
- Task 1: the resident must scroll a table that is cut off at the right on a phone to find their street; "CPZ" unexplained → fails at "will they notice the correct action".
- Task 2: price appears only after two selects are set, below Submit → fails "will they see progress".
- Task 3 by keyboard: Tab never reaches "I am not a robot" → cannot submit. By pointer on a phone: submitting with a gap shows a message above the fold that is not in view → fails "will they see progress".
- Task 4: the message names no field → fails "will they connect the action with the effect".

## References

Live sites could not be loaded (network policy allows only GitHub, npm, PyPI and Google Fonts). Measured instead: the GOV.UK Design System documentation source (`alphagov/govuk-design-system`, sparse clone, `src/patterns/`), `govuk-frontend@6.5.1` and `nhsuk-frontend@10.6.1` from npm (tokens and SCSS). USWDS and council permit services are from knowledge, marked as such.

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| GOV.UK "Check a service is suitable" + "Start using a service" patterns (source) | Tell people early whether they qualify and what it costs | Eligibility asked inside the service as the first question; the start page carries cost, what you need and other ways to apply | A separate eligibility checker (one street question is enough) |
| GOV.UK question pages, validation, check answers, confirmation (source) | Forms people finish first time | One question group per page; back link; label/legend as the `h1`; validate on Continue; error summary focused with links; `Error:` title prefix; check answers with Change links returning to the check page; confirmation with reference | GDS Transport, the crown, GOV.UK black header and green button — brand of another body |
| `govuk-frontend@6.5.1` tokens | Focus that is unmistakable | A focus state that changes the control's fill (yellow + black bar) rather than a thin ring: rebuilt in the crest's gold + ink | Their yellow `#ffdd00` |
| `nhsuk-frontend@10.6.1` | Same patterns, a different house | A body can adopt the patterns and keep its own colour, header and tone | NHS blue, the NHS header layout |
| USWDS step indicator (knowledge) — the contrary reference | Showing progress in a longer form | Nothing structural: GOV.UK's guidance (research-backed) warns that segmented indicators showing all steps go unnoticed and do not scale on phones; a plain "Step 2 of 5" caption is used instead | The segmented bar |
| Council permit services in general (knowledge, not inspected) | Category expectations | Postcode or street first is common; prices shown per zone | Account creation before eligibility |

## Direction

This is a productive (plain) surface. Concept, material-family candidates and the memory test are skipped by the template's rule; the brand-layer convergence checks are below.

**Interaction-model candidates** (against the top tasks):
1. *Keep one long page, fixed* (labels, errors, responsive table). Lost: complaint 1 and 5 are about order, not styling — one page still shows price after personal details unless reordered, and a 12-field phone page with a file input is long to correct.
2. *One page, reordered into sections with live price.* Better, but the error pattern on a long page still sends the resident up and down, and "nothing is lost" needs the same persistence anyway.
3. **Question groups, one per screen, inside `/apply/`** (chosen): street → permit length and Blue Badge (with prices for *their* zone) → vehicle → name, address and contact (kept together so browser autofill fills them in one tap) → proof of address → check answers and consent → confirmation. The URL keeps `/apply/`; each step has a hash (`#vehicle`) so the browser Back button works; answers are kept in `sessionStorage` so a reload or an accidental Back loses nothing.
4. *Address lookup first* (postcode → address → zone). Lost: no lookup back end exists; the data maps streets, not addresses.

**First viewport, exactly:**
- `/` at 390: white header (crest 36 px + "Harbourside Council"), service name "Resident parking permits" under a harbour-blue rule; `h1` "Apply for a resident parking permit" (32 px); two short paragraphs: what it is (zone explained once) and what it costs from/to; the harbour-blue "Start now" button inside the first viewport. Below: "Before you start" list, "Zones, streets and prices" table (fits 390 without scrolling sideways), "After you apply".
- `/apply/` step 1 at 390: back link, caption "Step 1 of 6", `h1` label "Which street do you live on?", hint, a full-width native select of the 15 streets + "My street is not on this list", then the answer panel ("Quay Street is in zone A, Old Harbour…") once chosen, and "Continue".

**Navigation model:** linear, with a back link on every step and Change links on the check page. **Density:** low (public-service dial): body 19 px desktop / 17 px phone, controls 48 px high. **Elevation model:** one flat canvas; two tinted panels only (the zone answer and the confirmation). No cards, no shadows. **State language:** "There is a problem" + field messages in the question's words; send failure and offline told apart; the confirmation keeps the reference in large type. **What users have learned that stays:** nothing structural is learned for a once-a-year task; the URLs and the "Start" link location stay. **Where brand shows:** the crest in the header, harbour blue as the action and heading-rule colour, gold as the focus fill — the crest's two colours, each with one job.

**Breaks if:** (1) a price or zone fact appears only after personal details; (2) any control is custom-drawn where a native one exists; (3) any error message fails to say which field and how to fix it.

**Convergence checks (brand layer only; short form):** Brand layer derived from the supplied crest — harbour blue `#0b4f6c` from the shield as the action colour and header rule, gold `#f2c14e` from the waves as the focus fill; the council name set in the UI face. One free choice was made: the typeface.
- *Similar-brief test* — for another council this plan would take that council's crest colours and its own name; the interaction model would be the same GOV.UK-derived flow, which is correct for the category (Jakob's law, public-service dial "novelty: zero").
- *Category test* — the interaction model is guessable from the category, deliberately. The brand layer is not: gold-as-focus and the crest palette come from this council's mark.
- *Second-order test* — "not Montserrat, not purple" are not the reasons; the face was chosen for registration numbers and postcodes (below) and the colours are sampled.
- *Ledger* — one sentence: "White canvas, harbour-blue header rule and buttons, gold focus fill, Atkinson Hyperlegible Next throughout, no display face, no label device, no dark chapter." Nearest rows: *Sanad* (teal action + saffron marker on a teal-tinted canvas) and *Milkline herd* (Atkinson Hyperlegible Next for tags). Differences: white canvas, not tinted; gold is only a focus/interaction state, never a marker; no display face at all; GOV.UK-style question pages rather than a dashboard. The shared face is a legibility choice for identifiers in both — recorded here so the maintainer can judge whether the skill is converging on it.

## Typography

- **One family:** Atkinson Hyperlegible Next (Braille Institute; OFL 1.1; `@fontsource/atkinson-hyperlegible-next@5.3.0`), 400 and 700, Latin subset, self-hosted woff2, 12 KB each, `font-display: swap`, metric-matched Arial fallback from `fonts.mjs --fallback` (size-adjust 99.6%). **Why:** residents type and read back registration numbers, postcodes and the `HPP-` reference, where 0/O, 1/I/l and 8/B confusions cause real errors; this face was designed to keep those apart for low-vision readers. Tabular figures available (`tnum`) for the price table. Not on the saturated list.
- **Set** (fixed sizes, ratio ≈ 1.25, two breakpoints): 16 px (small: footer, caption on phones) · 17 / 19 px body and inputs (phone / ≥ 641 px) · 22 / 27 px `h2` · 32 / 44 px `h1`. Every step is used. Line height 1.45 body, 1.15 headings. Measure ≤ 36 em (≈ 70 characters).
- No display face, no caps/tracked label device (the old uppercase tracked council name is set in sentence case, 700).

## Colour

**Strategy:** Restrained. White canvas; ink text; harbour blue for actions, links and the header rule (≈ 10% of a view); gold only as the focus state; red only for errors. Light only (a public form; dark mode not in scope). **Use scene:** a phone in daylight, a kitchen table.

| Token (role) | Value | Use | On white | APCA |
| --- | --- | --- | --- | --- |
| `--canvas` | `#ffffff` | page | — | — |
| `--surface-tint` | `#eef5f9` | zone answer panel, table header | — | — |
| `--ink` | `#0f2733` | text, input borders | 15.46:1 | 102 |
| `--ink-2` | `#3e5663` | hints, captions, secondary text | 7.73:1 (7.02 on tint) | 87 |
| `--rule` | `#b9c6cd` | decorative dividers only | — | — |
| `--action` | `#0b4f6c` | buttons, links, header rule | 8.94:1 (8.12 on tint) | 90 |
| `--action-hover` | `#073a50` | button hover, link hover | ≈ 12:1 | — |
| `--on-action` | `#ffffff` | text on buttons and the confirmation panel | 8.94:1 on action | −95 |
| `--focus` | `#f2c14e` | focus fill / halo | ink on gold 9.21:1 | 70 |
| `--danger` | `#b42318` | error text, error border, error-summary border | 6.57:1 (5.97 on tint) | 81 |
| selected | native (radio/checkbox checked state) | no custom selection colour | — | — |

Non-text: input and radio/checkbox borders `--ink` 2 px (15.5:1); focus = gold fill + 3 px ink bar on links and buttons, 3 px gold outline + 2 px inset ink on inputs (the ink thickening is the ≥ 3:1 change; gold on white alone is 1.68:1 and is never the only cue).

## Layout and space

One column, max 40 rem for questions (≈ two-thirds of a 960 px container), 60 rem container for header and start page tables. Gutters 16 px phone, 32 px ≥ 641 px. Spacing scale 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Radii: 0 on inputs and panels; 4 px on buttons only. No cards, no shadows except the button's 2 px bottom edge.

## Imagery and graphics

None. The crest is the only graphic. Icons: none needed (the error and warning states use words; the file input is native).

## Motion

None. No transitions on anything (a once-a-year form has nothing to animate; focus and hover change instantly). Reduced-motion therefore needs no substitute; `scroll-behavior` stays default.

## Interaction

- **Primary action per screen:** one harbour-blue button, bottom of the step, full width on phones: "Start now" (start page), "Continue" (steps), "Send application" (check page). Secondary actions are links ("Back", "Change", "Print this page").
- **Forms:** all twelve fields kept; labels above; hints for reg, address, proof; validation on Continue, then live on the fields that failed; error summary (always, even for one error — one pattern everywhere) focused, linking to fields; `Error:` title prefix; messages in the question's words. Required/optional: every field is required except proof of address, marked "(optional)" — **ASSUMPTION**, matching the old validation.
- **Targets:** 48 px controls; radios and checkboxes 32 px boxes with the whole label as the target.
- **Performance budget:** LCP element = the first text block; two 12 KB fonts, one CSS (4 KB gz), one JS (7 KB gz); no third parties.

## Accessibility

WCAG 2.2 AA (legal floor for a UK council website); aiming for 2.4.13 Focus Appearance and 2.3.3.

- **Contrast table:** above (Colour). Non-text: input/radio/checkbox borders ink 15.5:1; button edge `--action-hover`; focus described above.
- **Focus token:** gold fill + ink 3 px underline bar on links and buttons; gold 3 px outline + 2 px inset ink on inputs, selects, radios, checkboxes and the file input; `outline` kept in forced colours (`Highlight`). No sticky UI, so no `scroll-padding` needed.
- **Targets:** 24 px floor everywhere; 44–48 px for every form control and button.
- **320 px state:** single column; the zones table stacks each zone into its own block below 480 px (no sideways scroll); header wraps.
- **Colour independence:** errors carry the word "Error:" (visually hidden prefix) and a message; links underlined; required/optional in words.
- **Motion:** none (so no substitute needed).
- **Forced colours:** native controls; 2 px borders on inputs and buttons (buttons get a transparent border so they keep a shape); focus as `outline`.
- **Component map:** start link → `<a href class="button">`; buttons → `<button>`; street → native `<select>`; permit length → radios in `<fieldset><legend>`; Blue Badge and consent → native checkboxes in their own fieldsets; proof → native `<input type="file">` with `<label>`; error summary and send-failure box → a focusable `div` (`tabindex="-1"`) wrapping a `role="alert"` container, as GOV.UK Frontend marks it up; focus moves to it (changed in Phase 6: the first version had no live role and relied on focus alone — `widgets.mjs` live contract failed it); zone answer → `role="status"` region present at load; check answers → `<dl>`; step change → update `document.title` and focus the step's `h1` (one choice, everywhere); zones table → `<table>` with `<caption>` and `th scope`.
- **Forms:** GOV.UK error pattern; "(optional)" on the one optional field; `autocomplete`: `name`, `email`, `tel`, `address-line1`, `postal-code`; `type="email"`, `type="tel"`; `spellcheck="false"` on email, reg, postcode; `autocapitalize="characters"` on reg and postcode; paste allowed; no timer.
- **Announcements:** zone answer and price: `role="status"` (polite). Send failure: focus moves to the message. Success: focus to the confirmation `h1`.
- **Data:** the zones/prices table has a caption and row headers.
- **Preserved features:** `novalidate`; zoom not blocked.

## Keep / replace / remove / create

**Keep:** URLs; field names and value types; analytics stub, event names and payloads; `form#apply`, `#errors`, `#price`, `data-track="start"`; the crest; `data/zones.json` as the single source of zones and prices; the footer's legal words; `novalidate`.

**Replace:** Montserrat → self-hosted Atkinson Hyperlegible Next; purple gradients → crest palette; pill buttons → square-ish 48 px buttons with a focus fill; placeholder labels → visible labels and hints; the one-page form → six question steps + check answers + confirmation on `/apply/`; the zone select → a street question that derives the zone; the price line → prices shown per zone on `/` and per length in step 2; "Error 500" → send-failure and offline messages that keep answers; the marketing start page → a service start page.

**Remove:** the 10-minute timer and its warning text; the fake "I am not a robot" check (**ASSUMPTION**: it protected nothing — it is client-side only and never sent; real bot protection belongs on the server); the three claim cards and the "New & improved" badge; emoji; cliché copy; the Google Fonts request; `#zones` as a wide table inside the form (the zones table moves to the start page, stacked on phones).

**Create:** street → zone lookup from `zones.json`; step engine with hash history and `sessionStorage`; error summary + field errors; check-answers page with Change links; confirmation page with the reference and print; zones-and-prices table; "not in a zone" exit; send-failure/offline states; skip link, landmarks, `lang`; `SYSTEM.md`.
