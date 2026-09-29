# Stream D — Accessibility for sites, web apps, dashboards, SaaS, ecommerce and enterprise UI

Research stream D for broadening the `website-redesign` skill beyond marketing sites. Date: **2026-09-28**. Nothing in `skills/` was edited. The reusable lab lives in `research/experiments/a11y-lab/`.

**Evidence tags used throughout**

- **[V]** Verified this session from a primary source: W3C/WAI, GOV.UK, MDN or tool source repositories cloned from GitHub; npm package data; tool READMEs.
- **[L]** Observed in the tooling lab this session (§12).
- **[K]** From prior knowledge, not re-verified this session. The environment blocked `webaim.org`, `w3.org`, `deque.com`, `adrianroselli.com`, `sarasoueidan.com`, `scottohara.me`, `tetralogical.com`, `inclusive-components.design`, `matuzo.at`, `highcharts.com`, `ada.gov`, `federalregister.gov` and `eur-lex` for both WebFetch and Bash. The session's shared WebSearch budget ran out after one query. Treat [K] items as "true when last known" and re-check them before quoting them to a client.

---

## 0. The short version: what the skill should change

1. **Target WCAG 2.2 AA everywhere, and gate on it.** It is ISO/IEC 40500:2025 [V]. WAI says the 2026 EN 301 549, the EAA's standard, uses WCAG 2.2 [V]. Meeting 2.2 AA also meets the WCAG 2.1 AA that ADA Title II cites [V]. WCAG 3 is still a Working Draft (September 2026) and its contrast method is "yet to be determined" [V], so it can't be conformed to. APCA stays a design aid, not a pass/fail gate.
2. **Make accessibility a design-time decision, not a Phase 8 checklist.** About half of the WCAG 2.2 A/AA criteria are set at art direction or in the design system:
   - contrast and non-text contrast
   - the focus token
   - target sizes
   - the 320 px layout
   - text containers that grow
   - motion and reduced motion
   - colour-independent status and data encodings
   - sticky-UI budgets
   - consistent help and navigation
   - the auth and timeout flows

   Add an **Accessibility block to `DESIGN.md`** and a **component → native element / APG pattern map** before any code is written (§14).
3. **Native HTML first.** These are now dependable:
   - `<dialog>` with `showModal()` [V: Baseline widely available]. In Chromium 141 it gave focus-in, an inert background, Esc to close and focus return with no extra JS [L].
   - `inert` [V: widely available since 2025-10].
   - `popover` [V: Baseline 2025].
   - invoker `command`/`commandfor` [V: Baseline since 2025-12].
   - `<details name>` [V: Baseline 2024].

   Customizable `<select>` (`appearance: base-select`) is progressive enhancement only: Chromium 135+ and Safari 27, no Firefox [V].
4. **ARIA only where native HTML can't do the job, and only as a complete APG contract.** "No ARIA is better than bad ARIA … a role is a promise" (APG) [V]. The worst habitual misuse in app shells is `role="menu"` for site navigation. APG's own disclosure-navigation example explicitly does not use the menu role [V].
5. **Automation catches less than half of the defects that matter. Use three layers:**
   - Rule engines: axe-core with `wcag22aa`, plus IBM's engine for the keyboard and widget heuristics axe lacks.
   - The two scripted checkers built in this stream: **`a11y-audit.mjs`** (keyboard walk with pixel-diff focus detection, focus obscuring, reflow, text spacing, forced colours, colour-vision renders, reduced motion, targets, names) and **`widget-contracts.mjs`** (drives dialog, tabs, disclosure, live-region and form-error behaviour by keyboard).
   - A **manual script** (§13), plus a short screen-reader smoke test when one is available.

   On 60 seeded defects [L]:
   - All four rule engines together raised a failure on 55% and any signal on 68%.
   - Adding the two scripts raised this to 85% failures and 95% any signal. These scripts were tuned on the lab page, but calibration on independent W3C APG pages found only true positives after tuning.
6. **Forms follow the GOV.UK error pattern** [V]:
   - error summary at the top with focus moved to it
   - "There is a problem" heading, with links to each field
   - an inline message beside each field
   - `Error:` prefixed to the `<title>`
   - no validation on blur
   - input preserved on error
7. **Live regions exist in the DOM before their content changes.** Use `role="status"` for toasts and results and `role="alert"` only for urgent messages. Move focus only for blocking errors and dialogs [L][V].
8. **SPA route changes** update `document.title`, then either move focus to the new view's `h1` (`tabindex="-1"`) or announce the change. Within-view changes (filters, sorting) announce a result count and leave focus alone [K].
9. **Dashboards and data:**
   - Every chart gets a title that states the insight, a short text summary, a data table and a non-colour encoding.
   - Every KPI is plain text.
   - Sortable headers are `<th aria-sort>` with a `<button>` inside.
   - Auto-refreshing panels need a pause control (2.2.2) [V] and must not announce every tick.
10. **Never use overlay or "accessibility widget" products** as a substitute [K]. They don't fix source defects.

---

## 1. Sources

| Source | Used for | Access |
|---|---|---|
| W3C WCAG 2.2 normative SC text + Understanding (`w3c/wcag`: `guidelines/sc/22/*`, `understanding/`) | Exact wording of 2.4.11, 2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8 | git clone 2026-09-28 [V] |
| WAI website source (`w3c/wai-website`): WCAG overview, news posts | WCAG 2.2 dates, ISO/IEC 40500:2025, "the 2026 version of EN 301 549 uses WCAG 2.2", WCAG 3 drafts (2025-09-04, 2026-03-03, 2026-09-10; W3C blog 2026-09-25) | git [V] |
| WCAG 3 editor's draft source (`w3c/wcag3`, last commit 2026-09-17) | Contrast: "The contrast algorithm used in WCAG 3 is yet to be determined"; "Text contrast sufficient (minimum) … @@[contrast measure to be determined]"; 12 guideline groups | git [V] |
| WAI laws and policies dataset (`w3c/wai-policies-prototype`, last commit 2026-06-24) | EU entry: EAA → WCAG 2.2; US entry: 2024 ADA Title II rule → WCAG 2.1 AA; Section 508 → WCAG 2.0 | git [V] |
| WAI-ARIA Authoring Practices (`w3c/aria-practices`) | Keyboard contracts for dialog, disclosure, tabs, combobox, listbox, menu button, grid, treeview, toolbar, carousel; "Read me first"; disclosure-navigation note on the menu role; example pages used for calibration | git [V] |
| W3C COGA "Making Content Usable" design guide (`w3c/coga`, last commit 2025-12-19) | 8 objectives, 57 patterns | git [V] |
| GOV.UK Design System source (`alphagov/govuk-design-system`) | Error summary, error message and validation pattern; the WCAG 2.2 public-sector date (Oct 2024) | git [V] |
| GOV.UK accessibility-tool-audit (`alphagov/accessibility-tool-audit`, data last changed 2019-05-22) | 142 barriers × 13 tools | git [V] |
| MDN (`mdn/content`) | Forced-colours overridden properties; dialog, popover and select docs | git [V] |
| `web-features` 3.40.0, `@mdn/browser-compat-data` 8.1.3 (npm) | Baseline status of the native primitives | npm [V] |
| axe-core 4.13.0 README and rule metadata | "on average 57% of WCAG issues automatically"; "zero false positives (bugs notwithstanding)"; rule tags | npm [V] |
| Tools run in the lab: axe-core 4.13.0 + @axe-core/playwright 4.13.0, pa11y 10.0.0 (htmlcs + axe runners), Lighthouse 13.5.0, IBM accessibility-checker-engine 4.0.34 (archive 02 Sep 2026), Playwright 1.56.1, Chromium 141 (`chromium-1194`) | Experiments | local [L] |
| WebAIM Million 2026 | Six most common failures, errors per page | Search-result snippets only (webaim.org blocked) [V-secondary]; 2025 numbers [K] |
| Deque automated-coverage study (2021), Adrian Roselli, Sara Soueidan, Scott O'Hara, Léonie Watson, Heydon Pickering, Manuel Matuzović, Highcharts docs, WebAIM screen-reader survey | Practitioner patterns cited as [K] | not reachable |

---

## 2. Where things stand (2026-09-28)

- **WCAG 2.2** [V]:
  - W3C Recommendation 5 Oct 2023, updated 12 Dec 2024.
  - Adds 9 criteria. 4.1.1 Parsing is obsolete.
  - The versions are backwards compatible: meeting 2.2 meets 2.1 and 2.0.
  - It is ISO/IEC 40500:2025 (identical to the October 2023 text). W3C expects the December 2024 text to become ISO/IEC 40500:2026 by late 2026.
- **WCAG 3** [V]: still a Working Draft. Drafts were published September 2025, March 2026 and September 2026, and a W3C blog post on 2026-09-25 covered "stakes and challenges". The contrast measure is undecided, marked "exploratory" in the source. Nothing in WCAG 3 can be conformed to or cited for compliance.
- **European Accessibility Act**:
  - The WAI dataset lists the EAA (Directive 2019/882, enacted 2019-06-27) against WCAG 2.2 [V].
  - The WAI overview says "The 2026 version of EN 301 549 uses WCAG 2.2" [V].
  - Obligations apply to covered products and services from 28 June 2025. Covered services include e-commerce, consumer banking, e-books, transport ticketing, e-communications and audiovisual access [K].
  - Microenterprises providing services are exempt [K].
  - Services built on products already in use can continue until 28 June 2030 [K].
  - Enforcement and penalties are set by each member state [K].
  - Consequence for the skill: any EU-facing ecommerce or SaaS redesign is in scope.
- **US ADA Title II**:
  - DOJ web rule (Federal Register 2024-04-24) requires WCAG 2.1 AA for state and local government [V].
  - Compliance dates in the rule: 24 April 2026 for entities serving ≥ 50,000 people; 26 April 2027 for smaller entities and special districts [K].
  - I could not reach ada.gov to check for any 2025–26 amendment. Verify before advising.
  - Title III (private businesses) still has no technical regulation, but courts and settlements use WCAG 2.x AA [K].
  - Section 508 federal standard: WCAG 2.0 AA [V].
- **UK public sector**: the GOV.UK Design System retired its WCAG 2.2 call-outs after the October 2024 date by which public-sector bodies had to meet 2.2 [V].
- **Practical rule for the skill**: build to WCAG 2.2 AA. Aim for 2.4.13 Focus Appearance (AAA) and 2.3.3 Animation from Interactions (AAA) because they are cheap when designed in.

---

## 3. What fails most (and what that data cannot see)

**WebAIM Million 2026** (automated WAVE scan of 1,000,000 home pages):

- Detected errors rose **10.1% to 56.1 per page** (2025: ~51).
- **Low contrast** is on **83.9%** of home pages (2025: 79.1%). It has been the #1 failure in every report since 2019.
- Four of the six top categories got more common. Only **missing alt text** and **missing document language** improved [V-secondary].
- A secondary headline puts 2026 pages with detected WCAG failures at **95.9%** [V-secondary].
- 2025 shares for the other categories [K]:
  - missing alt 55.5%
  - missing form labels 48.2%
  - empty links 45.4%
  - empty buttons 29.6%
  - missing `lang` 15.8%
  - 94.8% of pages failing
- WebAIM has repeatedly found that pages using ARIA carry markedly more detected errors than pages without it [K]. That is a correlation, but it is consistent with APG's "no ARIA is better than bad ARIA" [V].

| WebAIM top-6 | WCAG SC | Auto-detectable? | Where the skill prevents it |
|---|---|---|---|
| Low contrast text | 1.4.3 | yes | Art direction: contrast table per surface and theme |
| Missing alt text | 1.1.1 | presence yes, quality no | Content: an alt decision for every image; charts get summaries |
| Missing form input labels | 1.3.1, 3.3.2, 4.1.2 | yes, except placeholder-as-label: axe accepts it [L] | Implementation: visible `<label for>` always |
| Empty links | 2.4.4, 4.1.2 | yes | Icon links carry visually-hidden text |
| Empty buttons | 4.1.2 | yes | Icon buttons carry `aria-label` or hidden text |
| Missing document language | 3.1.1 | yes | Template: `<html lang>` |

**What this data cannot see.** The Million only measures what an automated scanner can find. It says nothing about the following classes, which in my lab were caught by no rule engine and only by scripted or manual checks [L]:

- keyboard operability of custom widgets
- visible focus
- focus order and focus management
- status messages
- error handling
- reflow
- text spacing
- motion
- forced colours
- meaning conveyed by colour alone
- alt-text quality
- link purpose

Those are the defects a redesign most often introduces, which is why they get the most attention in §13–14.

---

## 4. WCAG 2.2 A/AA organised by decision point

Check column:

- **A**: rule engines catch the common failures (axe and/or IBM).
- **S**: the lab scripts catch them (`a11y-audit.mjs` / `widget-contracts.mjs`).
- **M**: needs human judgement or assistive-technology verification.

Levels are the SC's own. The 55 A/AA criteria are each listed once, where they are decided. 4.1.1 is obsolete.

### 4.1 Decided at art direction / design system (goes into `DESIGN.md`)

| SC | Lvl | The decision and the rule | Check |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | Table every text/ground pair actually used, in every theme and chapter. **4.5:1** for text; **3:1** for large text (≥ 24 px regular or ≥ 18.66 px bold). Keep a darker "accent-for-text" token. White on a mid brand blue is the classic trap: white on `#3b82f6` is 3.68:1 and failed in the lab [L]. | A |
| 1.4.11 Non-text Contrast | AA | **3:1** against adjacent colours for control boundaries (input borders, checkbox outlines, toggles), focus rings, icons that carry meaning, and chart marks and series. A light-grey input border (`#e3e3e3` on white = 1.2:1) fails. The lab found it; rule engines did not [L]. | S, M |
| 1.4.1 Use of Color | A | Status, trend, required, error, selected, link-in-text and chart series each need a second cue: icon + text, underline, dash or marker, direct label. | A (links only), S (vision renders), M |
| 2.4.7 Focus Visible | AA | One focus token: `outline` 2–3 px solid + 2 px offset, ≥ 3:1 against the component and the surface. Aim for 2.4.13 (AAA): indicator area ≥ a 2 CSS px perimeter with ≥ 3:1 change [V]. Use `outline`, never box-shadow alone, because forced colours sets box-shadow to none [V]. | S |
| 2.4.11 Focus Not Obscured (Min) | AA | Budget sticky UI (header, footer bar, cookie banner, chat bubble) so a focused control is never entirely hidden [V]. Engineering: `scroll-padding-top/bottom` equal to the sticky heights; make sticky bars static on short viewports. | S (reverse Tab walk) |
| 2.5.8 Target Size (Min) | AA | ≥ 24×24 CSS px, or the spacing exception (24 px circles don't intersect), or the inline/equivalent/UA/essential exceptions [V]. Design to 44 for touch-primary actions. For dense tables: row actions ≥ 24 px with ≥ 8 px gaps, or one "Actions" menu button per row. | A, S |
| 1.4.10 Reflow | AA | Design the **320 CSS px** state (= 1280 px at 400%). No two-direction scrolling except 2-D content (data tables, maps, diagrams, video, toolbars that must stay visible). | S |
| 1.4.4 Resize Text | AA | 200% without loss; never block zoom in the viewport meta; size type in `rem`. | A (viewport), S (640 px) |
| 1.4.12 Text Spacing | AA | No fixed heights or `overflow:hidden` on text containers; cards grow. The test values: line-height 1.5, paragraph spacing 2em, letter 0.12em, word 0.16em. | S |
| 1.4.5 Images of Text | AA | Live text for headings, buttons, chart labels and "quote" graphics. | M |
| 1.3.4 Orientation | AA | Never lock orientation. | A |
| 1.4.13 Content on Hover or Focus | AA | Tooltip and popover design: **dismissible** (Esc), **hoverable** (pointer can move onto it), **persistent**. Never put essential info only in a hover tooltip; use a toggletip. | M |
| 2.2.2 Pause, Stop, Hide | A | Anything that moves, blinks or scrolls automatically for > 5 s alongside other content, and any auto-updating content (tickers, carousels, live dashboards, background video), needs a pause/stop/hide control, placed before the moving content. | S (+M) |
| 2.3.1 Three Flashes | A | No flashing more than 3×/s. The motion language says so. | M |
| 3.2.3 Consistent Navigation | AA | Repeated navigation keeps the same relative order across pages and app views. | M (snapshot diff) |
| 3.2.4 Consistent Identification | AA | Same function, same name and icon everywhere ("Delete" is never also "Remove"). | M |
| 3.2.6 Consistent Help | A | Contact, chat and help links sit in the **same order relative to other content** on every page [V]. | M |
| 2.4.5 Multiple Ways | AA | Search + navigation (or a sitemap) for multi-page sites. | M |
| 2.5.7 Dragging Movements | AA | Every drag (kanban, reorder, sliders, map pan, upload drop-zones) has a single-pointer non-drag alternative, e.g. "Move up/down" or "Move to…" [V]. | M (+contract) |
| 3.3.8 Accessible Authentication (Min) | AA | No memory, transcription or puzzle step without an alternative. Allow password managers and paste [V]. Offer passkeys or an email link; puzzle CAPTCHAs only with an alternative. | S (paste), M |
| 3.3.7 Redundant Entry | A | Never ask twice in one process: prefill, or "Same as shipping" [V]. | M |
| 2.2.1 Timing Adjustable | A | Session timeouts warn ≥ 20 s ahead and allow a simple extend ≥ 10×, or are ≥ 20 h. Preserve data across re-auth. | M |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Checkout, payments, account deletion and data submission are reversible, checked, or confirmed with a review step. | M |
| 1.2.1–1.2.5 media | A/AA | Choosing video means budgeting captions, transcripts and audio description. No autoplay with sound. | A (presence), M |
| 1.4.2 Audio Control | A | No autoplaying audio > 3 s without a control. | A |

### 4.2 Decided in content (copy, alt, titles)

| SC | Lvl | Rule | Check |
|---|---|---|---|
| 1.1.1 Non-text Content | A | Decide per image. **Informative**: say what matters. **Decorative**: `alt=""`. **Functional**: say what the control does. **Complex** (chart, diagram): short alt plus a longer summary or data table. Never a filename; lab regex catches `IMG_2931.png` [L]. | A (missing), S (filename/decorative), M (quality) |
| 1.3.3 Sensory Characteristics | A | Instructions never rely only on shape, position, colour or sound ("the green button on the right"). | M |
| 2.4.2 Page Titled | A | "Specific page – Product". SPAs update it on every route; prefix "Error:" after a failed submit (GOV.UK). | A (presence), M |
| 2.4.4 Link Purpose (In Context) | A | Link text says where it goes. No repeated "Click here" or "Read more" pointing to different destinations. | S (generic/duplicate), M |
| 2.4.6 Headings and Labels | AA | Descriptive and unique; the first two words carry the meaning. | M |
| 2.5.3 Label in Name | A | The accessible name contains the visible label's words in order, ideally at the start. `aria-label="Go"` on a button showing "Search" fails. | A (axe experimental, IBM), S |
| 3.1.1 / 3.1.2 Language (page / parts) | A/AA | `<html lang>`; `lang` on foreign-language phrases, product names in other languages, and multilingual switchers ("Deutsch" with `lang="de"`). | A / M |
| 3.3.2 Labels or Instructions | A | Visible label for every field; format hints before the field; mark **optional** fields (GOV.UK) rather than asterisks, or explain the asterisk once. | A (partial), S, M |
| 3.3.3 Error Suggestion | AA | Error messages say how to fix it, in the label's words. No "invalid", "please" or "oops" (GOV.UK) [V]. | M (+contract) |

### 4.3 Decided in implementation

| SC | Lvl | Rule | Check |
|---|---|---|---|
| 1.3.1 Info and Relationships | A | Real `h1`–`h6`, lists, `<table>` with `<caption>`/`<th scope>`, `<fieldset>`/`<legend>` for radio and checkbox groups, `<label for>`, landmarks. Fake headings (styled divs) and header-less data tables are the misses [L]. | A (partial), S, M |
| 1.3.2 Meaningful Sequence | A | DOM order = reading order. CSS `order`, grid placement and `flex-direction: row-reverse` must not scramble it. `reading-flow` is Chromium-only [V]. | S (jump heuristic), M |
| 1.3.5 Identify Input Purpose | AA | `autocomplete` tokens on personal-data fields: `name`, `email`, `tel`, `street-address`, `postal-code`, `country-name`, `bday`, `organization`, `username`, `current-password`/`new-password`, `one-time-code`, `cc-*`. Invalid tokens are auto-detected; missing ones need the script [L]. | A (invalid), S (missing) |
| 2.1.1 Keyboard | A | Everything operable by keyboard: native controls, or APG keyboard contracts. Clickable `div`s, `<a>` without `href` and `role="button"` without `tabindex`/key handling are the misses [L]. | S, W |
| 2.1.2 No Keyboard Trap | A | Focus can always leave, except inside a modal, where Esc closes it. | S, W |
| 2.1.4 Character Key Shortcuts | A | Single-key shortcuts can be turned off or remapped, or are active only on focus. Common in enterprise apps: Gmail-style `j`/`k`/`e`. | M |
| 2.4.1 Bypass Blocks | A | A skip link that becomes visible on focus, plus landmarks and headings. | A (landmarks), S |
| 2.4.3 Focus Order | A | Logical order, no positive `tabindex`. Focus is **managed**: into dialogs, back to the trigger on close, to the next item after a delete, to the `h1` or an announcement on SPA route change. | A (tabindex), S, W |
| 2.5.1 Pointer Gestures | A | Pinch, multi-finger and path gestures have single-tap alternatives (map ± buttons). | M |
| 2.5.2 Pointer Cancellation | A | Activate on click/up-event, never on `mousedown`/`pointerdown`. | M |
| 2.5.4 Motion Actuation | A | Shake or tilt features have UI alternatives and can be disabled. | M |
| 3.2.1 On Focus / 3.2.2 On Input | A | Focusing, or changing a select or radio, never navigates or submits on its own (no auto-submitting filter selects without warning). | M, W |
| 3.3.1 Error Identification | A | The error is described in text, the field has `aria-invalid="true"`, and the message is tied via `aria-describedby`. | W |
| 4.1.2 Name, Role, Value | A | Native first. ARIA widgets expose role, name and states (`aria-expanded`, `aria-selected`, `aria-pressed`, `aria-checked`, `aria-current`), and states update. | A, S, W |
| 4.1.3 Status Messages | AA | Toasts, "saved", result counts and cart updates go through a pre-existing live region (`role="status"`/`alert`). | W |
| (4.1.1 Parsing) | — | Obsolete in 2.2 [V]. Duplicate ids still break `aria-labelledby`/`describedby` (a 4.1.2 or 1.3.1 failure) [L]. | A |

**User preferences** (no single SC, but part of 2.3.3 AAA, 1.4.11 and 2.4.7 in practice):

- `prefers-reduced-motion`, `forced-colors`, `prefers-contrast` and `prefers-color-scheme` are all Baseline widely available [V].
- They are design decisions (§9–10) with engineering hooks.

---

## 5. Semantic HTML first; ARIA second; the APG keyboard contracts

### 5.1 Rules

1. **Use the native element if one exists.** In forced colours, browsers pick system colours from native semantics, not ARIA roles: a `div role="button"` does not get `ButtonText` [V, MDN].
2. **Don't change native semantics.** Don't write `<h2 role="button">` (it destroys the heading) or `<button role="link">`. The legitimate exception: `<ul role="list">` when `list-style:none` makes Safari/VoiceOver drop list semantics [K].
3. **Every ARIA widget honours its APG keyboard contract.** "A role is a promise" [V].
4. **Never hide focusable content from AT** (`aria-hidden` or `role="presentation"` on focusable elements) [V: axe `aria-hidden-focus`].
5. **Every interactive element has an accessible name.** Prefer visible text; `aria-label` only for icon-only controls; `aria-labelledby` to reuse visible text.

### 5.2 Component → element / pattern map for web apps (the implementation default)

| Component | Use | Notes |
|---|---|---|
| Action | `<button type="button">` | Never `div`/`span`/`a` without `href` |
| Navigation | `<a href>`; `aria-current="page"` on the current item | Links go places; buttons do things |
| Toggle | `<button aria-pressed>`, or `<input type="checkbox">` (switch styling) | `role="switch"` + `aria-checked` if it's an on/off setting |
| Show/hide section, FAQ | `<details>/<summary>`; exclusive accordion `<details name="x">` [V Baseline 2024] | Or `button[aria-expanded][aria-controls]` |
| Site nav dropdown / mega menu | **Disclosure navigation**: `nav > ul > li > button[aria-expanded] + ul` of links | Not `role=menu` (APG) [V] |
| App action menu ("⋯", "Account") | APG **menu button** (`aria-haspopup="menu"`, `role=menu/menuitem`, arrows, Esc), or a `popover` list of buttons | Only real command menus get `role=menu` |
| Modal | `<dialog>` + `showModal()`, `aria-labelledby` = its heading | Inert background, Esc, focus in/out handled natively [L] |
| Non-modal popup, toggletip | `popover` + `<button popovertarget>` (or `command="toggle-popover"`) | Popover adds no role and no focus trap; give it the right semantics |
| Tooltip | `popover="hint"` (Chromium 151, Firefox 153, no Safari) [V], or a described-by tooltip that meets 1.4.13 | Never the only carrier of essential info |
| Tabs | APG tabs: `tablist`/`tab`/`tabpanel`, roving tabindex, arrows, Home/End | Tabs that navigate to other URLs are **nav links**, not tabs |
| Select | `<select>`; `appearance: base-select` as enhancement (Chromium 135+, Safari 27, not Firefox) [V] | Keeps native semantics and keyboard |
| Autocomplete / typeahead | APG **combobox** (listbox popup, `aria-activedescendant`) | `<datalist>` for simple suggestion lists |
| Multi-select list | `<select multiple>` or APG listbox; checkboxes in a `fieldset` for filters | Faceted filters are checkbox groups |
| Data table | `<table>` + `<caption>` + `<th scope>`; sortable = `th[aria-sort]` > `button` | Not `role=grid` for static tables |
| Spreadsheet-like / editable cells | APG **grid** (arrows, Home/End, Ctrl+Home/End, PageUp/Down) [V] | Only when cells are interactive |
| File / folder tree | APG **treeview**; site nav trees → nested lists + disclosure | |
| Toolbar (≥ 3 related controls) | `role="toolbar"`, one Tab stop, arrows between controls [V] | Editors, table bulk-action bars |
| Carousel | APG carousel: rotation control **first**, stops on focus/hover, slides as `group`/`region` with names [V] | Prefer no auto-rotation |
| Range | `<input type="range">` | Custom slider = APG slider |
| Progress / measurement | `<progress>`, `<meter>` | |
| Toast / save status / result count | `role="status"` region present at load | `role="alert"` only for urgent errors |
| Breadcrumb, pagination, stepper | `nav[aria-label] > ol`, `aria-current="page"` / `"step"` | |
| Search | `<search>` element [V widely available 2026-04] + form + label | |
| Card with one destination | One real link (the title); extend its hit area with a pseudo-element [K Pickering] | Don't nest links/buttons inside a clickable card |

### 5.3 Native primitives: support on 2026-09 (web-features 3.40.0) [V]

| Feature | Baseline | Support notes | Use now? |
|---|---|---|---|
| `<dialog>` | widely (since 2024-09) | All | **Yes**: default for modals |
| `inert` | widely (since 2025-10-11) | All | **Yes**: off-canvas drawers, hidden slides |
| `:focus-visible` | widely | All | **Yes** |
| `forced-colors`, `prefers-contrast`, `prefers-reduced-motion` | widely | All | **Yes** |
| `popover` | newly (2025-01-27) | Chrome 116, Firefox 125, Safari 17 / iOS 18.3 | **Yes**, with fallback testing on older iOS |
| invoker commands (`command`/`commandfor`) | newly (2025-12-12) | Chrome 135, Firefox 144, Safari 26.2 | Yes, with a JS fallback for older browsers |
| `<details name>` | newly (2024-09) | All | Yes |
| `<search>` | widely (2026-04) | All | Yes |
| `:user-invalid` | widely (2026-05) | All | Yes: error styling after interaction |
| `field-sizing` | newly (2026-06) | All | Yes (auto-growing textareas) |
| `dialog closedby` | no | Chrome 134, Firefox 141, **no Safari** | Enhancement only |
| customizable select `appearance: base-select` | no | Chrome/Edge 135, Safari 27, **no Firefox** | Enhancement only |
| `popover="hint"` | no | Chrome 151, Firefox 153 | Enhancement only |
| interest invokers (`interestfor`) | no | Chrome 142 only | No |
| `hidden="until-found"` | no | Chrome 102, Firefox 148 | Enhancement |
| `reading-flow` | no | Chrome 137 only | No |
| `focusgroup` | no support | — | No: roving tabindex still needs JS |

### 5.4 APG keyboard contracts that matter most for apps [V: APG source]

- **Dialog (modal)**:
  - Focus moves inside on open: to the first focusable element, or to a static element at the start for long content.
  - Tab and Shift+Tab cycle inside; Esc closes; focus returns to the invoker.
  - Native `showModal()` provides all of this. The lab confirmed focus return in Chromium 141 [L].
- **Disclosure**: Enter and Space toggle; `aria-expanded` reflects the state.
- **Tabs**:
  - Tab enters the tab list on the active tab; the next Tab goes to the panel.
  - Left/Right move between tabs and wrap; Home and End are optional.
  - Activation is either automatic (selection follows focus) or manual (Enter/Space).
  - Only the active tab has `tabindex="0"`.
- **Combobox**:
  - The input is in the Tab sequence; the popup is not.
  - Down moves into the popup; Esc dismisses; Enter accepts.
  - Alt+Down opens without moving focus (optional).
  - Printable characters type.
- **Listbox**:
  - Up/Down move; Home/End are recommended above 5 options.
  - Type-ahead is recommended above 7 options.
  - Multi-select uses Space, or Shift+arrows / Ctrl+A.
- **Menu button**: Enter, Space or Down opens and focuses the first item; Up focuses the last. Inside the menu: arrows, Esc closes and returns focus to the button.
- **Grid (data grid)**:
  - Arrows move cell to cell and stop at edges.
  - PageUp/PageDown by author-set rows.
  - Home/End for the row; Ctrl+Home/End for the grid.
  - Tab leaves the grid.
- **Treeview**:
  - Right opens a closed node, or moves to the first child.
  - Left closes an open node, or moves to the parent.
  - Up/Down move; Home/End; Enter activates.
  - Type-ahead recommended.
- **Toolbar**: one Tab stop; Left/Right between controls; Home/End optional.
- **Carousel**:
  - Auto-rotation stops when anything inside gets focus and resumes only via the rotation control.
  - The rotation control comes first in the carousel's Tab sequence.
  - Next/Previous don't move focus.

---

## 6. Keyboard and focus: rules and recipes

**Rules**

- Every pointer action has a keyboard equivalent.
- Focus order follows reading order.
- No positive `tabindex`.
- Content hidden off-canvas or collapsed is not focusable: `hidden`, `inert` or `display:none`, never just `opacity:0` or `translateX(-100%)` [L: focusable content inside `aria-hidden` was caught; invisible skip links were caught].

**Focus style recipe** (one token, all surfaces, survives forced colours):

```css
:root { --focus: #1f5fd1; }            /* ≥ 3:1 against every surface it lands on */
.on-dark { --focus: #ffffff; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
/* never `*:focus { outline: none }` without a replacement */
@media (forced-colors: active) { :focus-visible { outline-color: Highlight; } }
html { scroll-padding-top: calc(var(--header-h) + 16px); }   /* 2.4.11: sticky header never hides focus */
```

Box-shadow rings are decoration only. They disappear in forced colours [V MDN; L] and are often too weak for 2.4.13. The lab's `rgba(59,130,246,.4)` shadow produced 0 pixels with a ≥ 3:1 change [L].

**SPA route changes** [K, the Gatsby/Marcy Sutton research and Next.js route announcer lineage]:

1. Update `document.title`.
2. Move focus to the new view's `h1` (`tabindex="-1"`), or keep focus and announce "Navigated to *Title*" via a polite live region. Pick one per app and apply it everywhere.
3. Restore scroll position and focus on Back where the framework allows.
4. For in-view updates (filter, sort, paginate), keep focus on the control and announce "24 results" via `role="status"`.

**Focus management moments**:

| Moment | Where focus goes |
|---|---|
| Dialog opens | Inside (first control, or `autofocus`) |
| Dialog closes | The invoker; if it's gone, a logical fallback (the list heading) |
| Item deleted from a list | The next item's primary control, else the previous one, else the list heading. Never `body`. |
| Inline edit saved | Back to the edit trigger |
| Error on submit | The error summary (GOV.UK) |
| "Load more" | The first new item |
| Wizard step change | The step heading |

**Skip links**: the first focusable element, visible on focus, targets `<main id tabindex="-1">`. Test by activating it: focus must land in `main`, with the target not under the sticky header [L].

**Roving tabindex** for tabs, toolbars, radio-like groups, menus and grids. The lab's `fixed.html` has a 15-line implementation:

- one item has `tabindex="0"`, the rest `-1`
- arrow keys move `tabindex` and `focus()`
- Home/End jump
- selection follows or is separate

`focusgroup` isn't shipped anywhere yet [V], so JS is still required.

**Keyboard shortcuts (enterprise)**:

- Document shortcuts in a `?` dialog.
- Don't hijack screen-reader or browser keys.
- Single-character shortcuts must be remappable or disable-able, or active only on focus (2.1.4).

---

## 7. Screen readers

### 7.1 Manual testing basics [K]

| AT | Start | Essentials |
|---|---|---|
| **NVDA** (Windows, free) + Firefox or Chrome | Ctrl+Alt+N | NVDA key = Insert (or Caps Lock). Read all NVDA+↓. Stop Ctrl. Quick keys in browse mode: **H** headings (1–6 by level), **D** landmarks, **K** links, **F** form fields, **B** buttons, **T** tables (Ctrl+Alt+arrows inside). **NVDA+F7** elements list. **NVDA+Space** browse/focus mode. Tools → Speech Viewer gives a transcript. |
| **JAWS** (Windows) + Chrome | — | Same quick keys (H, R regions, F, T). Insert+F6 headings list, Insert+F7 links list. Common in enterprise and government. |
| **VoiceOver** (macOS) + Safari | Cmd+F5 | VO = Ctrl+Option. VO+→/← move. VO+Space activate. **VO+U rotor** (headings, landmarks, links, form controls). VO+Cmd+H next heading. VO+A read all. Turn on Safari "Press Tab to highlight each item". |
| **VoiceOver** (iOS) + Safari | Triple-click side button (shortcut) | Swipe right/left = next/previous. Double-tap = activate. Rotor = two-finger rotate, then swipe up/down. Two-finger swipe up = read all. Two-finger scrub = back/escape. |
| **TalkBack** (Android) + Chrome | Hold both volume keys 3 s (if the shortcut is on) | Swipe right/left. Double-tap. Reading controls to navigate by headings, links or controls. |

**Smoke test per key template** (10 minutes):

1. Headings list reads as an outline.
2. Landmarks list is short and named.
3. Every form field announces label, required state, hint and error.
4. Each custom widget announces role, name and state, and state changes are spoken.
5. Toasts and results are spoken once.
6. Dialogs announce their name, and focus returns on close.

Minimum matrix for a product: NVDA+Chrome/Firefox, VoiceOver+Safari (macOS and iOS), plus JAWS+Chrome for enterprise buyers and TalkBack+Chrome for Android-heavy audiences.

### 7.2 What an agent can do without a screen reader

- **Chromium's own accessibility tree via CDP**: `Accessibility.getFullAXTree`. For every node it gives role, name, **name sources** (placeholder, title, aria-label, labelfor, contents), description, `ignored` + reasons (aria-hidden, inert) and states (focusable, expanded, selected, level, invalid, required). This is what the lab audit uses for:
  - unnamed controls
  - **placeholder-only names** (which axe accepts) [L]
  - title-only names
  - label-in-name mismatches
  - filename alts
  - heading and landmark outlines

  `DOM.resolveNode` maps nodes back to elements.
- **Playwright** `locator.ariaSnapshot()`: a YAML role/name tree, with `expect(locator).toMatchAriaSnapshot()` for regression tests of landmarks, headings and names.
  - Playwright computes roles and names itself; it is not Chromium's tree. It reported `<summary>` as `text` while Chromium exposes a disclosure triangle [L]. Cross-check anything surprising with CDP.
  - Playwright **1.63** (hoisted into the lab by `@axe-core/playwright`) adds `page.ariaSnapshot({ mode: 'ai', boxes: true })` and `ariaSnapshotJSON()`. Its typings no longer include `page.accessibility`, which **1.56.1** still has (deprecated) [L].
- **`getByRole(role, { name })`** as a proxy: if a script can't find the Save button by role and name, neither can a screen-reader user's element list.
- **Tab-walk transcript**: the audit prints the Tab order as `role "name" [state]` lines. That is roughly what a screen-reader user hears tabbing in focus mode, and it exposed a focusable link inside `aria-hidden` as an empty stop [L].
- **Announcement recorder**: a `MutationObserver` on live regions plus "visible text not in a live region" (in `widget-contracts.mjs`). It told the lab's silent toast ("Export started", not announced) apart from the fixed one [L].
- **Limits**: none of this reproduces screen-reader heuristics:
  - browse vs focus mode
  - verbosity
  - whether an `aria-sort` change is spoken
  - live-region timing quirks
  - VoiceOver+Safari differences

  Mark complex widgets as "AT verification recommended" in the hand-off report.

### 7.3 Live regions and announcements: rules

1. The region must **exist, empty, before** the update. Inject text later. A region inserted together with its text is often not announced [K; the lab fixed page follows this and was announced by the recorder [L]].
2. Use `role="status"` (polite) for toasts, "Saved", result counts, cart updates and loading→loaded. Use `role="alert"` (assertive) only for urgent, blocking problems. Don't put `aria-live` on large or frequently changing containers such as tickers, live charts or chat logs without throttling. Announce summaries instead.
3. Keep messages short and self-contained ("Export started. We'll email the file."). Identical consecutive messages may not be re-read: clear, then set [K].
4. Don't move focus to toasts. Toasts with actions (Undo) must persist until dismissed, or the action must also be reachable elsewhere (2.2.1 timing) [K].
5. Async results: show "Loading…" in the status region if it takes more than ~1 s, then "12 results". Set `aria-busy="true"` on the region being replaced.
6. Blocking form errors: move focus to the error summary (GOV.UK). Focus does the announcing, so no live region is needed [V].
7. Spinners: an icon alone is silent (lab F49 was missed by every tool). Pair it with text in a status region: `<p role="status"><span class="spinner" aria-hidden="true"></span> Syncing…</p>` [L].

---

## 8. Forms and errors

**Labels**

- Visible `<label for>` above the field.
- Never placeholder-as-label: htmlcs flags it (F68) and axe passes it [L].
- Hints are separate text tied with `aria-describedby`.
- Radio and checkbox groups use `<fieldset><legend>`. IBM fails their absence; htmlcs warns; axe is silent [L].

**Required and optional**

- GOV.UK marks **optional** fields `(optional)`, validates server-side, turns off HTML5 validation (`novalidate`) and does **not** add `required` [V].
- If you use asterisks, explain the asterisk once and set `required`/`aria-required`. Never colour-only [L].

**Errors (GOV.UK pattern)** [V]:

- Show the page again with the answers kept. Prefix `<title>` with "Error: ".
- **Error summary** at the top of `main` (below breadcrumbs, above `h1`):
  - heading "There is a problem"
  - **move keyboard focus to it**
  - link each message to its field (first field for multi-field questions, first option for radios)
  - same wording as the inline messages
- **Inline message** after the label and hint, with a hidden "Error:" prefix. The field gets `aria-invalid="true"` and an `aria-describedby` that includes the message id [L].
- **Wording**:
  - say what happened and how to fix it
  - use the label's words ("Enter how many hours you work a week")
  - separate messages for empty, too long, wrong format
  - no "invalid", "please", "sorry", "oops", "forbidden" or codes
- **Timing**: validate on submit. **Do not validate when the user moves away from a field**, and avoid validating while typing unless research supports it; the character count is the exception [V].
- Accept varied formats and strip stray spaces and punctuation from numbers and codes (Postel, GOV.UK) [V].

**Input types and autocomplete**

- `type=email`/`tel`/`url`/`number`, used sparingly (`inputmode="numeric"` for codes and card numbers).
- `autocomplete` tokens as in §4.3.
- `spellcheck="false"` on emails and codes.

**Accessible authentication (3.3.8)**:

- Allow paste and password managers (`autocomplete="current-password"`/`new-password`, never `onpaste="return false"`; the lab script flags `onpaste` attributes and `paste` listeners [L]).
- Add a show-password toggle.
- Use `autocomplete="one-time-code"` for OTPs.
- Offer passkeys or a magic link.
- No transcription or puzzle CAPTCHA without an alternative.

**Redundant entry (3.3.7)**: prefill from earlier steps; "Billing same as shipping".

**Ecommerce checkout specifics**:

- `cc-name`, `cc-number`, `cc-exp`, `cc-csc`, shipping/billing address tokens.
- A review step before payment (3.3.4).
- Price changes announced via status.
- Strikethrough prices need text ("Was $40, now $30"), because `<del>`/`<s>` are not announced by default in most screen readers [K].

---

## 9. Visual: contrast, focus, colour, spacing, reflow, forced colours, themes, targets

- **Contrast**:
  - **WCAG 2 ratios are the gate**: 4.5:1 text, 3:1 large text, 3:1 UI and graphics. Every law cites WCAG 2.x [V].
  - APCA is not adopted; WCAG 3's measure is undecided [V].
  - Keep APCA Lc (already in `design-theory.md`) as an advisory for type weight, size and dark-mode tuning. Where WCAG 2 passes but APCA looks weak, improve it; where WCAG 2 fails, it fails.
  - Test on the real rendered ground: image chapters, tints, dark mode.
- **Non-text contrast** 1.4.11 (see §4.1). Common failures:
  - light input borders
  - ghost buttons
  - toggles whose on/off differ only in hue
  - chart gridlines carrying meaning
  - selected rows shown only by a pale tint
- **Colour**:
  - Links in body text are underlined. axe `link-in-text-block` flags colour-only links; Lighthouse passed the same page [L].
  - Status dots and trend arrows need text. The lab's colour-only status dots were missed by every tool and are obvious in the achromatopsia render [L].
- **Text spacing and resize**: no fixed-height text boxes. The lab's fixed-height KPI cards clipped under the 1.4.12 overrides, and one already clipped at default spacing [L].
- **Reflow at 320 px** (the lab checks 320×256 and 640×512):
  - Stack sidebars.
  - Wrap toolbars.
  - Tables scroll inside their own labelled, focusable region (`role="region" aria-labelledby tabindex="0"`). axe's `scrollable-region-focusable` expects this; IBM wrongly fails `tabindex` on a region [L].
  - Dialogs get `max-height: 100dvh; overflow:auto`.
  - Embeds get `max-width:100%`. My own fixed page first overflowed at 320 because an iframe was 300 px + 24 px padding; the audit caught it [L].
- **Forced colours (Windows contrast themes)**: MDN lists what is overridden [V]:
  - `color`, `background-color`, border, outline, text-decoration and column-rule colours, SVG `fill`/`stroke`.
  - `box-shadow` and `text-shadow` → none.
  - Non-URL `background-image` → none.
  - Text gets a backplate.

  Observed in Chromium 141 [L]:
  - Buttons defined only by background lost their shape.
  - A custom box-shadow checkbox vanished.
  - Status dots and trend colours were all flattened to white.
  - A `background-image` icon became near-invisible.
  - The box-shadow focus ring disappeared.
  - Hard-coded SVG stroke/fill colours were kept, so dark icons on the black canvas would vanish.

  Recipe:
  - Give controls `border: 1px solid transparent`.
  - Draw focus with `outline`.
  - SVG icons use `currentColor`.
  - Show selected/on states with a border, underline or icon, not a background alone.
  - Use native checkboxes and radios (`accent-color`).
  - Use `forced-color-adjust: none` only on tiny swatches that are also labelled.
  - Don't build a separate high-contrast theme; make small tweaks only [V MDN].
- **`prefers-contrast: more`**: thicken borders, drop translucency and blur, promote muted text to full text colour.
- **Dark mode**:
  - Re-table contrast per theme.
  - Saturated accents need lighter tints on dark surfaces.
  - Shadows stop signalling elevation, so use surface steps and borders.
  - Logos and transparent images may disappear.
  - Focus colour per theme.
  - Set `color-scheme` so native controls and scrollbars follow.
  - Forced colours override both themes.
- **Targets** (2.5.8): see §4.1.
  - axe's `target-size` is the only axe rule tagged `wcag22aa` [L].
  - **pa11y's axe runner does not run `wcag22aa`** [L]. Its runOnly tags are wcag2a, wcag21a, wcag2aa, wcag21aa and best-practice.
  - Plain stacked text-link lists at ~17 px line height fail the spacing exception. Both axe and the lab script flagged this on the W3C APG pages [L].

---

## 10. Motion and cognition

**`prefers-reduced-motion: reduce`: what to remove versus keep**

| Remove or replace | Keep, shortened or cross-faded (≤ 200 ms) |
|---|---|
| Parallax and scroll-linked movement; scroll-jacking | Colour and opacity state feedback (hover, press, selected) |
| Large zooms, scales and rotations; page-slide and view transitions that move large areas | Focus movement and small in-place transitions as fades |
| Auto-advancing carousels, marquees and tickers; background video autoplay | Progress indicators. Spinners are small; better replaced by a static "Loading…" or a slow opacity pulse (the lab's fixed page swaps to a static dotted ring) |
| `scroll-behavior: smooth` | User-started media (with controls) |
| Shake-on-error, bounce, confetti, looping decorative loops | Essential motion (a drag preview under the pointer) |

**Authoring pattern for new code**: motion is opt-in, e.g. `@media (prefers-reduced-motion: no-preference) { .reveal { animation: … } }`, so the default is still [K, Tatiana Mac's "no-motion-first"]. The "kill switch" (`animation-duration: .01ms !important`) is acceptable for retrofits.

**Vestibular triggers** [K]:

- large-area motion not started by the user
- parallax at different speeds
- zoom and scale
- spinning
- horizontal movement of backgrounds behind text
- auto-scrolling

2.3.3 (AAA) says motion started by interaction can be disabled. Aim for it.

**2.2.2 Pause, Stop, Hide** [V]: anything moving for > 5 s alongside other content, or any auto-updating content, needs pause/stop/hide:

- the pause button comes **before** the moving content in the DOM
- carousels stop on focus/hover (APG)
- dashboards: auto-refresh can be paused, or its frequency controlled

**Cognitive accessibility: W3C COGA "Making Content Usable"** [V]. There are eight objectives:

1. understand what things are and how to use them
2. find what they need
3. clear and understandable content
4. avoid mistakes and know how to correct them
5. help users focus
6. processes don't rely on memory
7. help and support
8. adaptation and personalisation

57 patterns sit under them. The ones that bind a web-app redesign, as checkable rules:

- **Purpose, steps, controls**:
  - make the page purpose clear (o1p01)
  - familiar hierarchy and design (o1p02)
  - consistent visual design (o1p03)
  - make each step clear (o1p04)
  - clearly identify controls (o1p05)
  - make the relationship between controls and content clear (o1p06)
  - icons that help, with text (o1p07)
  - easy route home (o1p08)
- **Finding**:
  - most important tasks easy to find (o2p01)
  - understandable hierarchy (o2p02)
  - clear page structure (o2p03)
  - search (o2p06)
- **Plain language**:
  - clear words (o3p01)
  - simple tense and voice (o3p02)
  - no double negatives (o3p03)
  - literal language (o3p04)
  - succinct text (o3p05)
  - one instruction per step (o3p09)
  - white space (o3p10)
  - foreground not obscured by background (o3p11)
  - explain implied content (o3p12)
  - alternatives for numbers (o3p13)
- **Mistakes**:
  - controls don't move unexpectedly (o4p01)
  - let users go back (o4p02)
  - fees and charges stated at the start (o4p03)
  - forms that prevent mistakes (o4p04)
  - easy undo (o4p05)
  - visible labels (o4p06)
  - accept different formats (o4p08)
  - **avoid data loss and timeouts** (o4p09)
  - provide feedback (o4p10)
  - familiar units (o4p12)
- **Focus**:
  - limit interruptions such as modals and chat pop-ups (o5p01)
  - short critical paths (o5p02)
  - avoid too much content (o5p03)
  - tell users what they need before a task (o5p04)
- **Memory**:
  - login without memory or cognitive tests (o6p01)
  - simple single-step login (o6p02)
  - don't make users calculate or memorise (o6p05)
- **Help**:
  - human help (o7p01)
  - alternatives for complex information (o7p02)
  - state results and disadvantages of choices (o7p03)
  - help for forms and non-standard controls (o7p04)
  - easy to find help (o7p05)
  - reminders (o7p07)
- **Personalisation**:
  - users control when content moves or changes (o8p01)
  - don't block extensions and APIs (o8p02)
  - support simplification (o8p03)
  - familiar, personalisable interface (o8p04)

**Timeouts**:

- Warn with ≥ 20 s to extend (2.2.1).
- Preserve entered data through re-authentication (2.2.5 AAA; COGA o4p09).
- Tell users the time limit before a timed task starts (COGA o5p04).

**Consistency** (3.2.3 / 3.2.4 / 3.2.6):

- One name per thing across the product.
- Help in the same relative order.
- Navigation in the same order.
- In apps, the same action sits in the same place in every record view.

---

## 11. Data tables, charts and dashboards (plus ecommerce and enterprise specifics)

**Tables**

- `<caption>` (visible or visually hidden) naming the table.
- `<th scope="col">` and `<th scope="row">` for the row key (customer name, date).
- Split complex multi-level headers into simpler tables before reaching for `headers`/`id`.
- Numbers right-aligned with `font-variant-numeric: tabular-nums`.
- **Sortable columns**:
  - `aria-sort="ascending|descending"` sits only on the currently sorted `<th>`.
  - Inside each sortable header is a `<button>` whose name is the column name. Show the direction with an icon plus the attribute.
  - Optionally announce "Sorted by Amount, descending" via `role="status"`, since not every screen reader announces `aria-sort` changes [K].
  - The lab's invalid `aria-sort="up"` on a `td` with `onclick` was caught by axe/IBM/Lighthouse for the attribute, and by the audit for "clickable but not focusable" [L].
- **Row selection**: a checkbox per row named with the row ("Select Contoso invoice"), and a header "Select all" checkbox with the mixed state.
- **Row actions**: named buttons ("Edit Contoso invoice"), not ten identical "Edit"s.
- **Expandable rows**: a button in the first cell with `aria-expanded` controlling the detail row.
- **Empty and filtered states** are text ("No invoices match 'Contoso'") announced via status after a filter.
- **Narrow screens**: the table scrolls inside `role="region" aria-labelledby tabindex="0"`. Don't convert to `display:block`, which strips table semantics in some browsers [K Roselli].
- **`role="grid"`** only for spreadsheet-like interactive cells, with the full APG grid contract [V]. Never for read-only data.

**Charts**

- A title that **states the insight** ("Revenue up 55% since March").
- A 1–2 sentence text summary.
- Units and period.
- A **data table** (visible, or in `<details>` "Show chart data as a table").
- Static SVG: `role="img"` + `aria-labelledby` pointing at `<title>` + `<desc>`, so hundreds of path nodes aren't exposed [L fixed page].
- Series distinguishable without colour: **direct labels, dash patterns, markers**. Marks ≥ 3:1 against the background and against adjacent series (1.4.11).
- No hover-only information: tooltips reachable by keyboard and touch, and compliant with 1.4.13.
- **Interactive charts** (Highcharts' accessibility module is the reference design [K]):
  - keyboard navigation Tab into the chart, arrows between points and series
  - a screen-reader region before the chart with type, axes, ranges and summary
  - point descriptions (value, category, series)
  - an optional "announce new data" for live charts
  - a linked data table / export
  - pattern fills and high-contrast themes
  - sonification

  If you build your own, the cheaper accessible default is a good static chart plus the data table.
- IBM flagged the unlabelled SVG chart; axe did not (axe's `svg-img-alt` only applies to `role="img"`). The audit warns on any sizeable SVG with shapes and no name [L].

**Dashboards**

- `h1` = dashboard name. Each widget is a `<section aria-labelledby>` with an `h2`. Landmarks only for major panels (filters, main content), not every card.
- **KPI tile** = text: label, value, change **in words** ("up 4.2% vs August") with an arrow glyph `aria-hidden` [L].
- **Filters**: a `<form>` with fieldsets. The time-range control is a radio group, segmented control or `<select>`. Results announce a count.
- **Loading**: skeletons with `aria-busy` on the region, plus a status message if it takes more than ~1 s.
- **Errors**: per widget, as text.
- **Auto-refresh**: a pause control (2.2.2) and "Last updated 10:32" text. Never announce every tick.
- **Notifications badge**: the count goes in the link's name ("Notifications, 3 unread").
- **Density**: see targets (§4.1). Dense mode must still meet 24 px.

**Ecommerce** [mix of V/K]:

- Product alt text describes the variant shown.
- Colour swatches are radio groups with text names.
- Quantity steppers are named buttons ("Increase quantity of Blue mug"), or a labelled number input.
- Add-to-cart confirms via status and shows the cart count in the cart link's name.
- Faceted filters are checkbox groups with result-count announcements.
- Carousels follow APG, or are avoided.
- Checkout follows §8. Price presentation doesn't rely on strikethrough alone.

**Enterprise** [K]:

- Drag-and-drop alternatives (2.5.7).
- Keyboard shortcut help.
- Bulk-action toolbar (`role="toolbar"`) announcing results.
- Wizards as `ol` with `aria-current="step"`.
- Long forms with section headings, save-draft, and data preserved across timeouts.
- Ask vendors of embedded components for an Accessibility Conformance Report (VPAT 2.5 INT). Don't assume.

---

## 12. Tooling experiment (lab)

### 12.1 Setup

- **Location**: `research/experiments/a11y-lab/` (scratch copy in the session scratchpad).
- **Pages**:
  - `pages/flawed.html`: a SaaS dashboard with **60 seeded defects**, each tagged `data-flaw="F.."`; ground truth in `ground-truth.json`.
  - `pages/fixed.html`: the same UI done right, usable as a reference implementation:
    - native dialog
    - APG tabs
    - GOV.UK error summary
    - sortable table
    - chart + table fallback
    - live region
    - forced-colours, reduced-motion and dark-mode tokens
  - `pages/probe/ibm-label.html`: the IBM false-positive probe.
- **Independent calibration**: three W3C APG example pages (tabs, modal dialog, disclosure navigation) served from the `w3c/aria-practices` checkout.
- **Environment notes**:
  - Only npm, GitHub and raw.githubusercontent are reachable.
  - Postinstall scripts of pa11y/puppeteer and accessibility-checker try to download Chrome from blocked hosts: install with `--ignore-scripts` (or `PUPPETEER_SKIP_DOWNLOAD=1`) and point every tool at the existing Chromium.
  - `accessibility-checker` (the IBM CLI) fetches its rule engine from `cdn.jsdelivr.net` at runtime (blocked). The `accessibility-checker-engine` npm package ships `ace.js`, so the lab injects it directly with Playwright (`scripts/run-ibm.mjs`). That works offline and is simpler.

### 12.2 Commands that worked

```bash
cd research/experiments/a11y-lab
npm i --ignore-scripts                    # playwright 1.56.1, @axe-core/playwright 4.13, axe-core 4.13, pa11y 10, lighthouse 13.5, accessibility-checker-engine 4.0.34
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome   # or omit to use Playwright's bundled browser
node scripts/serve.mjs 4173 pages &       # static server (tools need http://, not file://)

# 1 axe-core via Playwright (WCAG 2.0/2.1/2.2 A+AA + best practice; --all-rules adds experimental rules)
node scripts/run-axe.mjs flawed.html --all-rules          # or any URL: node scripts/axe-url.mjs <url> [--experimental]
# 2 pa11y with both runners (config sets executablePath, runners, levelCapWhenNeedsReview: "warning")
npx pa11y --config ./pa11y.json --reporter json http://localhost:4173/flawed.html > results/pa11y-flawed.json
# 3 Lighthouse accessibility category
npx lighthouse http://localhost:4173/flawed.html --only-categories=accessibility --output=json \
  --output-path=results/lh-flawed.json --chrome-flags="--headless=new --no-sandbox" --quiet
# 4 IBM Equal Access engine, injected (policies: IBM_Accessibility | WCAG_2_2)
node scripts/run-ibm.mjs flawed.html IBM_Accessibility
# 5 scripted audit of what rule engines miss (keyboard, focus, reflow, spacing, forced colours, vision, motion, targets, names)
node scripts/a11y-audit.mjs http://localhost:4173/flawed.html --out results/audit-flawed
# 6 keyboard-driven widget contracts
node scripts/widget-contracts.mjs http://localhost:4173/flawed.html contracts-flawed.json
# everything, both pages
./run-all.sh ; node matrix.mjs
```

### 12.3 Per-tool results on the flawed page

| Tool | Time (incl. browser launch) | Output | Flawed page | Fixed page | Notes for an agent |
|---|---|---|---|---|---|
| **axe-core 4.13** (default WCAG + best-practice tags) | 1.4–1.9 s | JSON: rule id, impact, WCAG tags, CSS targets, failureSummary, helpUrl; `incomplete` = needs review | 22 rules / 63 nodes violated; 4 needs-review | **0 violations**; experimental adds 3 `p-as-heading` FPs on KPI numbers | Best structure for agents. **Passes placeholder-as-label.** No default rules for tables without `th` or label-in-name (experimental). Only `target-size` covers a WCAG-2.2-new SC. Needs a page from `browser.newContext()`, not `browser.newPage()`. |
| **pa11y 10** (htmlcs + axe) | ~2.6 s | Flat JSON list: runner, code, type, selector, message | htmlcs 27 errors / 22 warnings; axe 26 errors / 37 warnings | 7 htmlcs warnings (generic "verify"); **3 axe "errors" were FPs until `levelCapWhenNeedsReview: "warning"` was set** | Default `levelCapWhenNeedsReview: 'error'` promotes axe needs-review to errors. The axe runner skips `wcag22aa` (no target-size). htmlcs adds **F68 placeholder-only label (error)**, **G90 onclick-without-keyboard** warnings on every inline-handler clickable, F96 label-in-name, H71 radios without fieldset, F77 duplicate id. htmlcs tests `display:none` content. |
| **Lighthouse 13.5** a11y category | ~12 s | Huge JSON; weighted 0–100 score; 10 "manual" reminder audits | Score **46**; 20 failed audits | **100** | A subset of axe. Experimental audits weight 0 (`td-has-header`, `label-content-name-mismatch` fail but don't move the score). Passed `link-in-text-block`, which standalone axe failed. `empty-heading` is informative only. A score of 100 means nothing about keyboard, focus or ARIA contracts. Slowest; least useful. |
| **IBM Equal Access engine 4.0.34** (injected) | ~0.7 s | JSON with XPath locations; levels violation / potential / recommendation / manual | 99 non-pass results; strongest on widget and keyboard heuristics | 42 non-pass: **5 violation-level FPs** + 16 "potential/manual" reminders | Unique catches: `aria_eventhandler_role_valid` (clickable div/span/`a` without href), `widget_tabbable_exists` (role=button/tabs not focusable), `aria_keyboard_handler_exists` and `widget_tabbable_single` (role=menu nav), `aria_child_tabbable`, `svg_graphics_labelled` (**unlabelled chart**), `table_headers_exists`, `input_checkboxes_grouped`, `label_name_visible`, `element_tabbable_visible` (invisible skip link). XPath into inline SVG doesn't resolve with `document.evaluate`. Very noisy "potential" items (`style_focus_visible` ×23 on the good page). |
| **a11y-audit.mjs** (this stream) | 29–37 s (two 6.5 s motion probes, two keyboard walks with pixel diffs) | FAIL/WARN/INFO lines with SC and element; `audit.json`; screenshots (reflow 320/640, text spacing, forced colours, achromatopsia, deuteranopia); ARIA snapshot; Tab-order transcript; heading and landmark outline | 92 FAIL / 35 WARN / 4 INFO | **0 FAIL**, 1 WARN (auto-rotating news: confirm a pause control, which exists), 4 INFO | Designed for agents. Complements rule engines; doesn't duplicate them. |
| **widget-contracts.mjs** (this stream) | 5–6 s for 5 widgets | PASS/FAIL per contract with ✓ / ✗ / ! lines | 5/5 contracts fail, 15 ✗ | 5/5 pass (after fixing a genuine gap it found) | Needs a small JSON of selectors per page (the agent writes it from the component inventory). |

### 12.4 Detection matrix

● = reported as a failure; ◐ = warning / needs review only; · = missed; – = out of that tool's scope.

- **axe** = default tags. **axeX** = + experimental.
- **S** = `a11y-audit.mjs`. **W** = `widget-contracts.mjs`.
- Cells are hand-judged. A tool gets credit only when it flags *the seeded defect*, not an incidental issue on the same element; e.g. the "Advanced filters" button was flagged for contrast, not for its missing `aria-expanded`.

| Flaw | Defect | SC | axe | axeX | htmlcs | LH | IBM | S | W |
|---|---|---|---|---|---|---|---|---|---|
| F01 | No lang on `<html>` | 3.1.1 | ● | ● | ● | ● | ● | ● | – |
| F02 | Empty `<title>` | 2.4.2 | ● | ● | ● | ● | ● | ● | – |
| F03 | img without alt | 1.1.1 | ● | ● | ● | ● | ● | – | – |
| F04 | Filename as alt (IMG_2931.png) | 1.1.1 | · | · | · | · | · | ● | – |
| F05 | Decorative image with descriptive alt | 1.1.1 | · | · | · | · | · | ◐ | – |
| F06 | Low-contrast text #aaa on white (2.3:1) | 1.4.3 | ● | ● | ● | ● | ● | – | – |
| F06a | Low-contrast logo text on dark header | 1.4.3 | ● | ● | ● | ● | ● | – | – |
| F07 | Placeholder used as the only label | 3.3.2/4.1.2 | · | · | ● | · | ◐ | ● | – |
| F08 | Icon link with no name | 2.4.4/4.1.2 | ● | ● | ● | ● | ● | ● | – |
| F09 | Icon button with no name | 4.1.2 | ● | ● | ● | ● | ● | ● | – |
| F10 | role=button div, not focusable, no key handler | 2.1.1 | · | · | ◐ | · | ◐ | ● | ● |
| F11 | Clickable div (onclick), no role, no keyboard | 2.1.1/4.1.2 | · | · | ◐ | · | ● | ● | ● |
| F12 | Focusable link inside aria-hidden | 4.1.2 | ● | ● | · | ● | ● | ● | – |
| F13 | aria-label on a generic div | 4.1.2 (misuse) | ◐ | ◐ | · | · | ● | · | – |
| F14 | role=menu used for site navigation | 4.1.2 (misuse) | · | · | · | · | ◐ | ● | – |
| F15 | Redundant role=navigation on `<nav>` | best practice | · | · | · | · | ◐ | · | – |
| F16 | Heading levels skip h1→h4 | 1.3.1 (bp) | ● | ● | ◐ | ● | · | ◐ | – |
| F17 | Fake headings (styled divs) | 1.3.1 | · | · | · | · | ◐ | ◐ | – |
| F18 | No main landmark / content outside landmarks | 1.3.1/2.4.1 (bp) | ● | ● | · | ● | ● | ● | – |
| F20 | Focus outline removed, no replacement | 2.4.7 | · | · | · | · | ◐ | ● | – |
| F21 | Positive tabindex | 2.4.3 | ● | ● | · | ● | · | ● | – |
| F22 | Required marked by red * only | 1.4.1/3.3.2 | · | · | · | · | · | ◐ | – |
| F22b | Trend/status by colour only | 1.4.1 | · | · | · | · | · | ·\* | – |
| F23 | Error message not associated, not announced | 3.3.1/4.1.3 | · | · | · | · | · | · | ● |
| F24 | Invalid autocomplete token | 1.3.5 | ● | ● | ◐ | ● | ● | · | – |
| F24b | Missing autocomplete on phone/name | 1.3.5 | · | · | · | · | · | ◐ | – |
| F25 | select without label | 4.1.2 | ● | ● | ● | ● | ● | ● | – |
| F26 | Radio group without fieldset/legend | 1.3.1 | · | · | ◐ | · | ● | ◐ | – |
| F27 | Data table without `<th>` | 1.3.1 | · | ● | · | ● | ● | ● | – |
| F28 | Invalid aria-sort; sort "button" is a td with onclick | 4.1.2/2.1.1 | ● | ● | ◐ | ● | ● | ● | – |
| F29 | SVG chart with no text alternative | 1.1.1 | · | · | · | · | ● | ◐ | – |
| F30 | Duplicate id in aria-labelledby (name ≠ visible label) | 4.1.2/2.5.3 | ◐ | ● | ● | ● | ◐ | ● | – |
| F31 | Ambiguous "Click here" links | 2.4.4 | · | · | · | · | · | ◐ | – |
| F32 | Auto-moving ticker, no pause | 2.2.2 | · | · | · | · | · | ● | – |
| F33 | prefers-reduced-motion ignored | 2.3.3/2.2.2 | · | · | · | · | · | ● | – |
| F34 | 16×16 targets 2 px apart | 2.5.8 | ● | ● | · | ● | ● | ● | – |
| F35 | Div modal: no role, no focus move/trap, no Esc | 4.1.2/2.4.3/2.1.2 | · | · | ◐ | · | · | · | ● |
| F36 | Toast not in a live region | 4.1.3 | · | · | · | · | · | · | ● |
| F37 | Fixed 1100 px layout, no reflow at 320 | 1.4.10 | · | · | · | · | · | ● | – |
| F38 | Fixed-height cards clip under text spacing | 1.4.12 | · | · | · | · | · | ● | – |
| F39 | Viewport meta disables zoom | 1.4.4 | ● | ● | ◐ | ● | ◐ | ● | – |
| F40a | Icon as CSS background-image | 1.1.1/1.4.11 | · | · | · | · | ◐ | ● | – |
| F40b | Custom checkbox div (box-shadow, no role/keyboard) | 4.1.2/2.1.1 | · | · | ◐ | · | ● | ● | – |
| F40c | Focus only a low-contrast box-shadow | 2.4.7/2.4.13 | · | · | · | · | · | ● | – |
| F41 | Input borders 1.2:1 | 1.4.11 | · | · | · | · | · | ● | – |
| F42 | Link in text by colour only | 1.4.1 | ● | ● | · | · | · | · | – |
| F43 | Disclosure button without aria-expanded | 4.1.2 | · | · | · | · | · | · | ● |
| F44 | Tabs: not focusable, no aria-selected/controls, no arrows | 4.1.2/2.1.1 | · | · | ◐ | · | ● | ● | ● |
| F45 | `<a>` without href used as a button | 2.1.1/4.1.2 | · | · | ◐ | · | ● | ● | – |
| F46 | iframe without title | 4.1.2 | ● | ● | ● | ● | ● | · | – |
| F47 | Foreign phrase without lang | 3.1.2 | · | · | · | · | · | · | – |
| F48 | Visible "Search", aria-label "Go" | 2.5.3 | · | ● | ◐ | ● | ● | ● | – |
| F49 | Spinner with no text/status | 4.1.3 | · | · | · | · | · | · | – |
| F53 | Paste blocked on password | 3.3.8 | · | · | · | · | · | ● | – |
| F54 | aria-describedby → missing id | 4.1.2/1.3.1 | ◐ | ◐ | · | · | ● | · | – |
| F55 | Empty table header cell | 1.3.1 (bp) | ● | ● | · | · | ● | · | – |
| F56 | `<li>` outside a list | 1.3.1 | ● | ● | · | ● | ◐ | · | – |
| F57 | Skip link never visible on focus | 2.4.7/2.4.1 | · | · | · | · | ◐ | ● | – |
| F58 | Sticky header hides focused elements | 2.4.11 | · | · | · | · | · | ● | – |
| F59 | Empty heading | 1.3.1/2.4.6 | ● | ● | ● | · | ● | ● | – |

\* F22b is visible to a reviewer in the audit's `vision-achromatopsia.png` (four identical grey status dots) and `forced-colors.png` (all dots white). No automated rule flags it.

**Totals over 60 seeded defects**

| Tool / combination | Any signal | As failure |
|---|---|---|
| axe (default) | 24 (40%) | 21 (35%) |
| axe + experimental | 26 (43%) | 24 (40%) |
| htmlcs (via pa11y) | 24 (40%) | 12 (20%) |
| Lighthouse | 21 (35%) | 21 (35%) |
| **IBM engine** | **37 (62%)** | 26 (43%) |
| All four rule engines | **41 (68%)** | **33 (55%)** |
| + a11y-audit + widget-contracts | **57 (95%)** | **51 (85%)** |

- **Missed by every tool**: F22b (colour-only status; visible in the vision render), F47 (language of parts), F49 (silent spinner).
- **Caught only by the scripted layer**: F04, F05, F22, F23, F24b, F31, F32, F33, F36, F37, F38, F40c, F41, F43, F53, F58.
- **Extra true positives nobody seeded**:
  - white on `#3b82f6` buttons at 3.68:1 (all engines)
  - 18 px-tall nav and sidebar links failing 2.5.8 (axe, Lighthouse, audit)

### 12.5 False positives observed

- **axe**: none at default tags (as its README claims [V]). Experimental `p-as-heading` flagged large KPI numbers.
- **pa11y**: its default needs-review → error promotion produced 3 errors on the good page: colour contrast on `aria-hidden` ▲ glyphs, and `frame-tested`.
- **IBM**: 5 violation-level FPs on the good page:
  - skip link "not in a landmark" (standard practice)
  - `tabindex="0"` on a labelled scrollable table region (the pattern axe's `scrollable-region-focusable` asks for)
  - `lang` missing inside an `about:blank` iframe
  - `aria_complementary_labelled` for the single `<aside>` (stricter than ARIA)
  - a correctly associated label hidden with the modern `clip-path: inset(50%)` visually-hidden technique reported as "no associated label"

  The probe page reproduced the last one: the legacy `clip: rect(0 0 0 0)` form passes. Ship visually-hidden utilities with both properties.
- **a11y-audit** (before tuning; all fixed):
  - event delegation on a list of links
  - a hidden container with a click listener
  - `<summary>` role mapping
  - iframe focus stops
  - 2.4.13 area when the element touches the viewport edge
  - shadow-DOM focus (the APG SkipTo component)
  - label-in-name compared as a substring instead of words in order
  - script initialisation counted as "auto-updating"
  - 2-D tables at 320 px (now WARN, per the 1.4.10 exception)

  After tuning:
  - `fixed.html`: 0 FAIL.
  - The 3 APG pages: 2–9 FAILs each, all true positives. axe independently agrees on the target-size failures, and the disclosure-navigation page's nav really overflows at 320 px.
  - The only WARNs are AAA 2.4.13 area estimates and the 1.4.10 table exception.
- **widget-contracts**: 0 FPs on the APG dialog, tabs and disclosure-navigation pages.

### 12.6 Gotchas worth writing into the skill

1. `@axe-core/playwright` throws "Please use browser.newContext()" if the page came from `browser.newPage()`.
2. Installing `@axe-core/playwright` hoists a newer `playwright-core` (1.63 here) than the pinned `playwright` (1.56.1). Launch with an explicit `executablePath`; never run `playwright install` in locked-down environments.
3. The pa11y axe runner:
   - Set `levelCapWhenNeedsReview: "warning"`.
   - It doesn't include `wcag22aa`.
   - `chromeLaunchConfig.executablePath` is needed when puppeteer's download is skipped.
4. The Lighthouse score is not a conformance measure: 46 → 100 on pages that differ in ~60 defects, most of which Lighthouse can't see.
5. Include axe's `experimental` tag in review mode: `td-has-header` and `label-content-name-mismatch` are valuable. Triage `p-as-heading` manually.
6. Tools test hidden content differently. htmlcs reports on `display:none` subtrees (the closed modal); axe and IBM skip them. Contract tests must open things to test them.

### 12.7 How much can automation find? Reconciling the 30–57% claims

The numbers answer different questions:

- **Deque, by issue volume**: "on average 57% of WCAG issues automatically" [V README]. It came from a 2021 study of Deque's own audits, ~13,000 pages/states and ~300,000 issues [K]. Volume is dominated by high-frequency, easily detected defects (contrast, names, alt, labels), so volume coverage looks high.
- **GOV.UK, by distinct barrier** (the dataset itself, data dated 2019-05) [V]:
  - 142 barriers; best single tool ~40% (error or warning); **axe ~30%**.
  - 122 of 142 (86%) found by at least one of 13 tools; 20 by none.

  Barrier coverage is lower because each barrier type counts once.
- **This lab, by distinct defect type in an app-like page** [L]:
  - axe 40–43%; IBM 62% (any signal); the four engines together 68% any signal, 55% as failures.
  - Adding scripted keyboard, focus, zoom, preference and contract checks: 95% / 85%.
  - Caveats: I seeded the page, so the defect mix is my choice. The scripts were tuned on it, and calibration on independent APG pages kept them honest on FPs, not on recall. And "caught" means *flagged*, not *judged correct*.

**Working estimate for the skill**:

- Rule engines alone surface roughly **a third to a half of distinct barriers**, and around **half or more by volume**.
- Adding agent-run scripted checks (keyboard walk, focus visibility, zoom and spacing, forced colours, motion, widget contracts) brings **most mechanically observable barriers** into view.
- A meaningful residue always needs judgement or real assistive technology:
  - **Meaning and quality**: alt text, link purpose in context, headings describing content, error-message helpfulness, instructions, plain language (COGA), language of parts.
  - **Semantics choices**: is this visually bold text a heading? Is this a data table? Should this be a menu or a disclosure?
  - **Order logic**: does the focus/reading order make sense, and is focus placed sensibly after each action?
  - **Screen-reader experience**: verbosity, double announcements, browse vs focus mode, whether state changes are spoken, live-region timing, VoiceOver+Safari quirks.
  - **Time, motion, media**: whether motion is vestibular-triggering or essential; caption and audio-description accuracy; timeouts and session behaviour.
  - **Cross-page consistency** (3.2.3/3.2.4/3.2.6) and redundant entry across a flow.
  - **Pointer and gesture alternatives** (2.5.1/2.5.2/2.5.7), orientation, and content on hover (1.4.13).
  - **Authentication flows** (3.3.8) and error prevention for transactions (3.3.4).

---

## 13. Manual test script for an agent (with a browser tool or Playwright)

Run it per **key template** (home/landing, list/table view, detail view, form/checkout, dashboard) and per **critical flow**. Record every result in the hand-off report.

0. **Baseline.** Serve the built site. Run:
   - axe on each template: `node scripts/axe-url.mjs <url> --experimental`
   - `node scripts/a11y-audit.mjs <url> --out a11y/<slug>`
   - `node scripts/widget-contracts.mjs <url> <slug>.contracts.json`, where the contracts JSON lists each custom widget from the component inventory.

   Fix every FAIL before the manual pass.
1. **Keyboard walk** (the audit's Tab-order transcript plus per-stop screenshots, or by hand):
   1. Load the page and press Tab. The first stop is a visible **skip link**. Enter moves focus into `main`, and the `h1` is not under the sticky header.
   2. Keep pressing Tab to the end. Every control the pointer can use is reached, in reading order, with a **visible indicator** at every stop. Nothing invisible gets focus (closed menus, off-canvas panels, hidden slides). Focus never gets stuck.
   3. Shift+Tab back to the top. No focused control is hidden under sticky or fixed UI (2.4.11).
   4. Operate every widget by its APG contract (§5.4):
      - buttons with Enter and Space
      - tabs, radios, menus and listboxes with arrows
      - Esc closes dialogs, popovers and menus, and **focus returns**
      - deleting a row moves focus sensibly
   5. At 390 px: the menu toggle has a name and `aria-expanded`. Esc closes the open menu and returns focus. If the menu covers the page, the background is inert.
2. **Names, roles, states** (CDP accessibility tree or `locator.ariaSnapshot()`):
   - Every interactive node has a meaningful, unique name (icon buttons; repeated row actions include the row).
   - Every name contains its visible label (2.5.3).
   - States are present and update: expanded, selected, pressed, checked, current, invalid, required.
   - The heading outline reads like a table of contents.
   - Landmarks: one `main`, named `nav`s.
   - Image names make sense out of context; decorative images are absent from the tree.

   ```js
   const cdp = await page.context().newCDPSession(page);
   const { nodes } = await cdp.send('Accessibility.getFullAXTree');
   nodes.filter(n => !n.ignored && ['button','link','textbox','combobox','checkbox','radio','tab','menuitem','switch'].includes(n.role?.value))
        .forEach(n => console.log(n.role.value, JSON.stringify(n.name?.value), (n.properties||[]).map(p => `${p.name}=${p.value.value}`).join(' ')));
   ```
3. **Announcements** (the contracts' recorder, or MutationObserver on live regions): for every async action (save, add to cart, filter, delete, export, copy link), a message appears in a live region that **existed before**. A blocking submit error moves focus to the error summary. Loading longer than ~1 s says so.
4. **Forms**: submit empty, then with wrong formats. Check:
   - error summary: focused, linked, same wording as inline
   - inline messages tied by `aria-describedby`; `aria-invalid`
   - "Error:" in the title
   - input preserved
   - optional fields marked
   - `autocomplete` tokens present
   - paste works in password and code fields; show-password exists
   - no validation on blur
5. **Zoom and reflow**:
   - Viewport **320×256** and **640×512** (`page.setViewportSize`): no horizontal page scroll except 2-D content in its own scroll container; nothing clipped or overlapping.
   - Sticky bars don't eat the screen at 320×256. Make them static on short viewports.
6. **Text spacing**: inject `*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}`. No clipped or overlapping text.
7. **Forced colours**: `page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' })`, then repeat with `colorScheme: 'light'`. Review the capture:
   - every control has a visible boundary
   - focus is visible
   - icons are visible
   - selected/on states are distinguishable
   - charts are legible
8. **Colour vision**: CDP `Emulation.setEmulatedVisionDeficiency({ type: 'achromatopsia' | 'deuteranopia' })` and capture. Every status, trend, series, required marker and error is still distinguishable without hue.
9. **Motion**:
   - `page.emulateMedia({ reducedMotion: 'reduce' })`: no parallax, auto-rotation, large movement or smooth scrolling. `document.getAnimations()` shows no infinite or long animations.
   - Without the preference: anything moving or auto-updating for > 5 s has a pause control placed before it.
10. **Contrast on real renders**: re-run axe `color-contrast` in dark mode (`emulateMedia({ colorScheme: 'dark' })`) and on image or tinted chapters. Check non-text contrast of inputs, toggles, focus rings and chart marks (1.4.11) against the `DESIGN.md` table.
11. **Targets at 390 px**: the audit's `targets` section, plus a look at dense tables and toolbars.
12. **Content pass**:
    - titles are unique
    - headings descriptive
    - link text describes the destination
    - alt text right for each image's role
    - `lang` on foreign phrases
    - error messages follow GOV.UK wording
    - COGA plain-language check: one instruction per sentence, no jargon or double negatives, literal language
13. **Across pages**: compare `ariaSnapshot()` of `banner`/`navigation`/`contentinfo` across 3–5 routes. Navigation and help sit in the same order; the same functions have the same names.
14. **Screen-reader smoke test** (if NVDA or VoiceOver is available; otherwise list it as a recommended follow-up), per §7.1.
15. **Report**: automated results (tool versions, counts before and after), manual results by step, known issues with SC and severity, and what needs real-AT verification.

---

## 14. Proposed accessibility module for the skill

### 14.1 New files

- **`references/accessibility.md`** (~250 lines, the rules from §4–11 in the skill's checkable-rule style). It replaces `ui-ux.md` §8 and the Accessibility block of `technical-qa.md`, which become pointers. Sections:
  1. Standard and scope (WCAG 2.2 AA; why; APCA advisory; WCAG 3 not citable)
  2. Design-time decisions
  3. Component → element/pattern map with keyboard contracts
  4. Focus and SPA rules
  5. Forms and errors
  6. Live regions
  7. Visual, preferences and themes
  8. Tables, charts and dashboards
  9. Automated checks
  10. Manual script
  11. Reporting
- **`scripts/a11y-audit.mjs`** and **`scripts/widget-contracts.mjs`** (from the lab). Optionally fold `axe-url.mjs` in as `--axe` so one command runs the rule engine and the scripted layer. Dependencies are `playwright` + `@axe-core/playwright`; IBM's `accessibility-checker-engine` is an optional `--ibm` flag.
  - `capture.mjs` uses puppeteer-core. Puppeteer can do the same emulation (`emulateMediaFeatures` for forced-colors and reduced-motion, CDP vision deficiency), but Playwright's `ariaSnapshot`, `emulateMedia({forcedColors})` and the official axe integration make it the better base.
- **`templates/DESIGN.md`: an Accessibility block**, filled at art direction:
  - Contrast table per surface and theme (WCAG ratio = gate, APCA Lc = note), plus non-text pairs (input border, focus ring, chart marks, toggle states).
  - Focus token (colour per surface, width, offset) and the sticky-UI budget (heights → `scroll-padding`).
  - Target minimums (24 floor / 44 touch primary) and the dense-table action pattern.
  - 320 px layout decisions: nav collapse, table scroll regions, toolbar wrap.
  - Motion inventory, each with its reduced-motion replacement, and which auto-moving content gets a pause control.
  - Colour-independence plan (status, trend, required, series, links).
  - Forced-colours plan (borders, currentColor icons, selected states).
  - Dark-mode token deltas, if themed.
  - Component inventory → native element / APG pattern (the §5.2 map filtered to this product), with the keyboard map for app shortcuts.
  - Forms: error pattern, required/optional convention, autocomplete map; auth approach (passkey or magic link; paste allowed).
  - Announcement strategy (status vs alert; SPA route-change choice).
  - Charts and data: summary + table policy, encodings.

### 14.2 Where it plugs into the phases

| Phase | Addition |
|---|---|
| 1 Audit | Run axe + `a11y-audit.mjs` on the current site. List existing barriers **and existing accessibility features to preserve** (skip links, live regions, labels, error patterns, reduced-motion code, `lang`). A redesign must not regress; the audit baseline is the proof. |
| 3 Art direction | Fill the DESIGN.md Accessibility block. **Gate**: no palette without a contrast table; no component without a mapped element/pattern; no motion without a reduced-motion variant. |
| 5 Implementation | `accessibility.md` §3–8 rules. Visually-hidden utility with both `clip` and `clip-path`; `:focus-visible` outline token; `scroll-padding`; `prefers-reduced-motion` and `forced-colors` blocks in the base layer (next to `implementation.md` "Base" and "Motion"). |
| 6 Visual QA | Add to the capture set: 320×256 reflow, forced colours (dark and light), achromatopsia, text spacing. `a11y-audit.mjs` produces them. |
| 8 Technical QA | **Gates**: axe 0 violations at `wcag2a..wcag22aa`; `a11y-audit.mjs` 0 FAIL (WARNs triaged in the report); every custom widget's contract PASS; the manual script run and recorded; screen-reader smoke test done or explicitly deferred. |
| Hand-off | Report: tool versions and counts, manual results, known issues with SC, what needs real-AT testing. For EU-facing services and public-sector sites, offer a draft accessibility statement (Directive 2016/2102 for public sector; the EAA requires service information on accessibility [K]). |

### 14.3 Implementation rules (the short list the reference should open with)

1. Native element first; ARIA only with the full APG contract.
2. Every control has a visible label or text; icon-only controls get `aria-label`, and their SVG gets `aria-hidden="true" focusable="false"`.
3. One `:focus-visible` outline token; never `outline:none` without a replacement; `scroll-padding` for sticky UI.
4. Modals = `<dialog>.showModal()`; menus of links = disclosure; popups = `popover`; hidden panels = `hidden`/`inert`.
5. Forms = GOV.UK pattern; autocomplete tokens; paste allowed.
6. Status messages through pre-existing `role="status"` regions; blocking errors move focus.
7. SPA: title update + focus or announce on route change; result counts announced in-view.
8. Tables: `caption`, `th scope`, `aria-sort` on `th`, button inside, own scroll region at narrow widths.
9. Charts: insight title + summary + data table + non-colour encoding; static SVG is `role="img"` with a name.
10. Preferences: reduced motion (opt-in motion), forced colours (borders, outline, currentColor), `prefers-contrast`, dark-mode contrast re-check.
11. Layout: works at 320 px, text containers grow, targets ≥ 24 px, sticky bars within budget.
12. Motion or auto-updating content > 5 s gets a pause control, placed before it.

### 14.4 Additions to `anti-patterns.md`

- `outline: none` on focus
- placeholder-as-label
- clickable `div`s
- `role="menu"` site navigation
- hover-only tooltips carrying information
- colour-only status
- auto-rotating carousels
- fixed-height text cards
- `user-scalable=no`
- white text on mid-saturation brand blue/orange (fails 4.5:1)
- box-shadow-only focus rings
- custom checkboxes drawn with background/box-shadow
- "accessibility overlay" widgets
- visually-hidden utilities using only `clip-path` (IBM false positive; older AT) — use `clip` + `clip-path`

---

## 15. ARIA misuse list (what to grep for and fix)

| # | Misuse | Why it's wrong | Fix | Caught by [L] |
|---|---|---|---|---|
| 1 | `role="button"` (or any widget role) on `div`/`span` without `tabindex="0"` and Enter/Space handling | "A role is a promise" [V]; unreachable by keyboard | `<button>` | IBM, audit, contracts |
| 2 | Clickable `div`/`span`/`img`/`td` with `onclick` and no role | Invisible to AT and keyboard | `<button>`, or a link | IBM, htmlcs (warn), audit |
| 3 | `<a>` without `href` (or `href="#"`/`javascript:`) as an action | Not focusable, or announced as a link | `<button type="button">` | IBM, audit |
| 4 | `aria-label` on generic `div`/`span`/`p` | Prohibited on generic roles; unreliable | Visible text, a heading, or a proper role with a name | IBM, axe (review) |
| 5 | `aria-hidden="true"` on focusable elements or their ancestors | Screen readers land on "nothing" | `inert`/`hidden`, or remove from the Tab order | axe, IBM, LH, audit |
| 6 | `role="menu"`/`menubar`/`menuitem` for site navigation | Promises app-menu keyboard behaviour and changes SR mode; APG doesn't use it for nav [V] | `nav > ul` of links + disclosure buttons | IBM (potential), audit |
| 7 | `role="tablist"` for links to other pages | Tabs switch panels in place | `nav` links + `aria-current="page"` | — (manual) |
| 8 | Tabs without `aria-selected`/`aria-controls`, all tabs in Tab order, no arrow keys | Broken contract | APG tabs with roving tabindex | IBM, audit, contracts |
| 9 | Redundant or overriding roles (`<nav role="navigation">`, `<button role="button">`, `<h2 role="button">`) | Noise, or destroys native semantics | Remove. Keep `ul role="list"` only for the Safari list-style case | IBM (recommendation) |
| 10 | `aria-label` that contradicts the visible text | Fails 2.5.3; voice users can't say the label | Name = visible label (+ extra words after) | axe (exp), IBM, audit |
| 11 | `aria-labelledby`/`describedby`/`controls` → missing or duplicate ids | Name or description silently lost | Unique ids; test references | axe (review), IBM, htmlcs |
| 12 | Invalid values or attributes on the wrong role (`aria-sort="up"`, `aria-selected` on a plain button, `aria-sort` on a `td`) | Ignored or misread | Valid tokens on the right role | axe, IBM, LH |
| 13 | `aria-expanded` missing, never updated, or on the panel instead of the button | State unknown to SR users | On the controlling button; update it | contracts |
| 14 | `role="dialog"` without a name, focus management or inert background; `aria-modal="true"` on a non-modal layer | SR users read the page behind | `<dialog>.showModal()` + `aria-labelledby` | contracts |
| 15 | `aria-live` added at the same moment as the text, on huge containers, or `role="alert"` for routine toasts | Missed, or noisy announcements | Pre-existing `role="status"`; `alert` only when urgent | contracts |
| 16 | `role="presentation"`/`none` on data tables or focusable elements | Strips semantics | Remove | axe/IBM (partly) |
| 17 | `title` as the only name for icon buttons | Not reliably exposed; invisible on touch and keyboard | `aria-label` or hidden text + a visible tooltip | audit (warn) |
| 18 | Placeholder as the only label | Disappears on input; low contrast | `<label>` | htmlcs, audit (axe passes it) |
| 19 | `role="grid"` on read-only tables; `role="application"` on regions | Forces app mode; arrow keys hijacked | Plain `<table>`; remove `application` | manual |
| 20 | `aria-haspopup="true"` on buttons that open disclosures or navigation | Announces "menu" | Omit `aria-haspopup`; use `aria-expanded` | manual |
| 21 | SVG icons inside named buttons not hidden; `role="img"` SVG without a name | Double or empty announcements | `aria-hidden="true" focusable="false"` on the icon; name on the control | IBM, audit |
| 22 | `tabindex` > 0; `tabindex="0"` sprinkled on static text | Scrambled order; noise | Remove. `tabindex="0"` only on scrollable regions and widgets | axe, LH, audit |
| 23 | Overlay or accessibility-widget scripts as the "fix" | Don't repair source defects; can conflict with AT [K] | Fix the source | — |

---

## 16. Most-failed criteria (for prioritising a redesign's checks)

**By frequency on the web** (WebAIM Million 2026 [V-secondary] / 2025 [K]):

1. **1.4.3** low-contrast text: 83.9% of home pages (2026)
2. **1.1.1** missing alt: ~55% (2025; improved in 2026)
3. **1.3.1 / 3.3.2 / 4.1.2** missing form labels: ~48% (2025)
4. **2.4.4 / 4.1.2** empty links: ~45% (2025)
5. **4.1.2** empty buttons: ~30% (2025)
6. **3.1.1** missing document language: ~16% (2025; improved in 2026)

**The high-frequency failures automated scans cannot count**, which a redesign most often introduces. Evidence: the lab's rule-engine blind spots [L] plus practitioner consensus [K]:

- **2.4.7 / 2.4.13** focus removed or too weak (`outline:none`, faint box-shadow rings)
- **2.1.1 / 4.1.2** custom widgets not keyboard-operable or missing role/state (clickable divs, fake tabs, menus, custom selects and checkboxes)
- **2.4.3** focus not managed (dialogs, SPA routes, deletions)
- **4.1.3** status messages silent (toasts, cart updates, result counts, spinners)
- **3.3.1 / 3.3.3** errors not identified in text, not associated, not focused
- **1.4.11** non-text contrast (input borders, toggles, focus rings, chart marks)
- **1.4.10 / 1.4.4 / 1.4.12** reflow, zoom and spacing breakage (fixed-width layouts, fixed-height cards)
- **1.4.1** colour-only meaning (status dots, trends, required markers, links)
- **2.4.11** focus hidden under sticky headers or cookie bars (new in 2.2)
- **2.5.8** small targets in dense UIs (new in 2.2)
- **2.2.2** auto-moving or auto-updating content without pause
- **1.3.1** fake headings and header-less tables
- **2.5.3** name ≠ visible label

---

## 17. Open items to verify when network access allows

- WebAIM Million 2026 per-category percentages and the ARIA/error correlation figures (webaim.org).
- ADA Title II compliance dates: any DOJ amendment in 2025–26 (ada.gov, Federal Register).
- EAA transposition and enforcement status by member state, and the formal publication reference of the 2026 EN 301 549 (ETSI, EUR-Lex).
- WCAG 3 intro timeline (w3.org/WAI/standards-guidelines/wcag/wcag3-intro/) and the September 2026 conformance-model questions.
- Screen-reader usage shares (WebAIM Screen Reader Survey, latest edition).
- Current Highcharts accessibility-module options (for the chart section's wording).
- Deque's 2021 study methodology details (deque.com).

## 18. Lab file index (`research/experiments/a11y-lab/`)

| Path | What |
|---|---|
| `pages/flawed.html`, `pages/fixed.html`, `pages/probe/ibm-label.html` | Test pages. `fixed.html` is a compact reference implementation of every pattern in §5–11. |
| `scripts/a11y-audit.mjs` | Scripted audit (keyboard, focus, obscuring, names, outline, pointer-only, targets, non-text contrast, autocomplete, paste, structure, reflow, spacing, forced colours, vision, motion) |
| `scripts/widget-contracts.mjs` | Keyboard-driven contracts: dialog, tabs, disclosure, live, form-errors, menu-button |
| `scripts/run-axe.mjs`, `scripts/axe-url.mjs`, `scripts/run-ibm.mjs`, `scripts/lib.mjs`, `scripts/map-findings.mjs`, `scripts/serve.mjs` | Tool runners and helpers |
| `pa11y.json`, `run-all.sh`, `contracts-*.json`, `ground-truth.json`, `matrix.mjs`, `package.json` | Config, one-shot runner, contracts, ground truth, matrix generator |
| `results/` | `matrix.md`; audit transcripts (flawed, fixed, 3 APG pages); contract outputs; axe and Lighthouse summaries; IBM and pa11y JSON; ARIA snapshots; forced-colours, reflow-320 and achromatopsia captures |
