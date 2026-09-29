# Milkline — design direction

Written 2026-09-28, before implementation. Benchmark for finish: GOV.UK Design System (forms and plain words) and the finish of a good agricultural-engineering catalogue. It has to read as *Milkline's* work: not the references', not the 2023 template's, and not the model's default.

No user was available to answer questions. Everything below marked **Assumption** is my call, and the questions are collected at the end of `REPORT.md`.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/` (`index.html`): story, features, proof | marketing / landing | once to a few visits, while a farmer weighs up a trial | lost time for the farmer, a lost lead for Milkline | expressive | **redesign** |
| `/#visit`: the trial form | marketing conversion form (form rules apply inside an expressive page) | once | a lost lead; a farmer who can't tell whether it worked | productive inside expressive | **redesign** of the look, **refine** of behaviour (same fields, endpoint and event) |
| `/pricing.html` | marketing / pricing | occasional; comes back before deciding | money: the farmer has to know exactly what they will pay | expressive, plainer | **redesign** |
| `/app/` (herd dashboard) | SaaS app, daily | daily, at milking | health/animal welfare | productive | **out of scope**: a separate project. Audited only as a brand-family surface. Not touched. |

**Audience and context:** owners and managers of Irish and UK dairy herds, about 80–400 cows (the two named farms have 180 and 210). They read on a phone in the yard or parlour office between milkings, or on a laptop in the evening. Some are in their fifties and sixties and read in bright daylight, in gloves or with wet hands. They have been sold "smart farming" before and are wary of hype. Their words are *parlour*, *milk meters*, *conductivity*, *bulk tank*, *relief milker*, *withdrawal period* and *herd size*, not *insights* or *intelligence*. **Assumption** (no analytics or research in the repo). This comes from the site's own copy and the README.

**Top tasks** (ranked; **all assumptions**, since no analytics, search logs or support data exist in the repo):
1. Understand in a few seconds what Milkline does for *my* herd (it flags cows early, from my own parlour data) and whether it works with my parlour.
2. Find the price for *my* herd size, and what happens after the trial.
3. Start the free trial (name, farm, herd size, phone), then know it worked and that someone will ring.
4. Decide whether to trust the company: who is behind it, where they are, a real farm that uses it, support hours, the company registration.
5. Look at the app (`/app/`), a secondary step for the curious.

**Problems** (severity 0–4 × task importance; each traced to an audit finding below):
1. **4: the trial form (task 3).** Fields are named only by placeholders (a11y: 4 × 3.3.2 FAIL). Field borders have 1.16:1 contrast (4 × 1.4.11 FAIL). There is no visible focus. The only error is "Invalid input" in red, with no field named and nothing announced. A success shown after an earlier error stays red. There is no `autocomplete`, and the phone field is not `type=tel` (walkthrough in `audit/before-form-walk.txt`).
2. **3: nothing says dairy or Milkline (tasks 1 and 4).** Violet-to-cyan gradients, gradient text, a "✨ New: AI-powered" pill, emoji icons in lavender tiles, a 🐄 emoji in place of the 2021 logo, and cliché copy ("supercharge", "all-in-one", "work smarter"). The real brand mark (navy and sky droplet, Nunito Black wordmark) appears nowhere (audit signals; README).
3. **3: grey copy fails contrast (tasks 1, 2 and 4).** 23 of 43 text elements on `/` and 11 of 28 on `/pricing.html` are below AA. All body and feature copy is `#9ca3af` on white (2.54:1), and "340 farms" is 1.47:1. Farmers reading outdoors on a phone cannot read the part that explains the product.
4. **3: the product is described, never shown (task 1).** The hero "screenshot" is a wireframe placeholder (gradient with white bars). It has no alt text, it is lazy-loaded in the first viewport, and it is the LCP element.
5. **3: without JavaScript, all six feature cards are invisible** (the `.reveal` opacity trap).
6. **2: proof is presented misleadingly or unreadably.** "2 days earlier mastitis detection" sits in a statistics row as if it were a measured product outcome, but it is one farm's report, in an 11 px footnote at 1.47:1. "99.9% uptime" and "Most popular" have no source in the repo.
7. **2: structure and semantics.** No `lang`, no `main`, no skip link, and no `h1` on pricing. On a phone the `h2` (48 px) is larger than the `h1` (44 px), and 13 text sizes are in use.
8. **2: pricing is a lookup presented as a choice.** Plans are set by herd size, but the page shows three competing cards with a "Most popular" badge and a scaled, glowing middle card.
9. **1: dead legal links.** Privacy and Terms go to `#`, on a site that collects phone numbers. This can't be fixed without content from the company, so it is flagged.

**Principles** (each one rules things out):
1. **Speak parlour, not platform.** Every claim uses the farmer's nouns and a unit (litres, mS/cm, cows, €/month). A sentence that would fit any SaaS company gets cut.
2. **Show the alert, not the adjective.** The product appears as its real output (a flagged cow with her numbers) before any feature list.
3. **Readable at arm's length in daylight.** Body text at least 18 px on the marketing pages. Every text pair at least AA, body targeting 7:1. Controls at least 48 px tall.
4. **One action, the same everywhere.** "Start free trial" is the only filled button on every page. Everything else is a text link.
5. **Proof only as big as it is.** A single farm's report is shown as that farm's words, with name and herd size. It never becomes a headline statistic.

**Non-goals:** the herd app (`app/`) and its data contract (`data/`); new pages (privacy, terms, case studies) whose content only Milkline can supply; new claims, customers or integrations; a new logo (the 2021 mark stays); a CMS or build step (the site stays static HTML, CSS and a little JS).

**Constraints:** static HTML with no build, served as files. The form must keep `id="visit-form"`, `action="/api/visit"`, `method="post"`, `data-track="visit_form_submit"`, fields `name`, `farm`, `herd_size`, `phone`, `#visit-msg`, a JSON POST, and `window.mlTrack('visit_form_submit')` on submit. The anchors `#features`, `#story` and `#visit` are linked from pricing. The link `app/`, the phone link `tel:+35322000000`, and the legal line "© 2026 Milkline Ltd, Mallow, Co. Cork. Registered in Ireland 651234." all stay. The brand mark is `assets/logo.svg` (2021). Accessibility: WCAG 2.2 AA. Performance budget: no web font over roughly 60 KB per page in total, no third-party requests (Google Fonts is currently a cross-origin request and fails in this environment), and LCP is text or a local SVG. Language is English (Ireland), `lang="en-IE"`, with no RTL.

**Success measures** (marketing): trial-form submissions per visit, which marketing already tracks through `visit_form_submit`. Note that this event currently fires on *every submit attempt, including invalid ones*, so the baseline counts attempts, not leads (see Audit). Other measures: a five-second test ("what does this company do, and for whom?"), zero contrast failures (baseline 23 + 11), zero keyboard-focus failures (baseline 15 + 11), and content visible without JavaScript (baseline: 6 cards hidden).

## Audit

**What the company sells, to whom:** herd-health software for dairy farms. It reads the farm's parlour software exports and in-line milk meters and flags any cow whose yield drops or whose milk conductivity rises, often the first sign of mastitis. It also runs the milking rota (milkers swap shifts by text), keeps the vet visit log (treatments, withdrawal periods, shareable with the vet), shows yield per cow, group and milking, and works offline in the parlour. It sells to dairy farmers in Ireland and the UK, priced by herd size. Farm-hours phone support runs 6am–10pm, every day.

**The one thing a visitor should remember:** *"It tells me which cow to check before the bulk tank does."* The distinctive moment is **the morning a cow is flagged**. Rosie, IE1111, is down 8.8 L with conductivity 6.77 mS/cm, and the relief milker knows to check her without ringing the farmer. The founders' origin story ("tired of finding out about mastitis from the bulk tank") and the only customer quote describe this same moment.

**Real proof that exists** (only what is in the repo):
- The founders, named with credentials and place: Dr Niamh O'Sullivan (large-animal vet) and Tom Hegarty (milks 210 cows near Mallow), Cork, 2019.
- One customer quote: Aoife Brennan, Brennan Farm, Co. Cork, 180 cows. "We catch mastitis about two days earlier than we used to, and the relief milker knows what to check without ringing me."
- "340 farms", "trusted by farms across Ireland and the UK".
- "99.9% uptime": **no source in the repo**. Kept as an existing claim and flagged for confirmation.
- The company registration: Milkline Ltd, Mallow, Co. Cork, Registered in Ireland 651234.
- Real product UI: `/app/` runs locally with sample data in `data/herd.json` (40 cows, "Hegarty Farm, Mallow", 5 flagged: 2 alert, 3 watch). This sample data is the honest source for product fragments.
- Not proof: `assets/app-screenshot.png` is a wireframe placeholder, not the product.

**Brand assets sampled:**
- `palette.mjs --from assets/logo.svg` gives `#14365C` navy, 67% of the mark, oklch(32.9% 0.078 253); and `#2FA4D7` sky, 33%, oklch(67.8% 0.125 232). The mark is a droplet (sky) over a short rounded bar (navy): milk, and the line.
- Wordmark: lower-case "milkline" in **Nunito Black**, a rounded humanist sans, tracked −10 (`letter-spacing="-1"` at 54 px). It is soft, friendly and agricultural-cooperative rather than techy.
- Brand family: the herd app (`/app/`, captured in `captures/brand-family/`) *also* ignores the mark. It uses Inter, indigo `#4f46e5`/`#6366f1`, a 🐄 emoji logo and "Good morning, Tom 👋". So the only real identity asset in the family is the 2021 mark and its two colours. Neither site has a documented display face, so none has to be kept, but the wordmark's construction (rounded humanist) is a constraint on what sits next to it.

**Measured baseline** (`audit/before/`, `audit/before-audit-stdout.txt`, `audit/before-a11y-*`, `audit/before-dembrandt.*`):
- Type: Inter declared but **never loads** (the Google Fonts request fails with ERR_CERT_AUTHORITY_INVALID here, so text renders in the Arial fallback). 13 text sizes on `/`: 72 · 56 · 48 · 22 · 20 · 18 · 16 · 15 · 14 · 13.5 · 13 · 12 · 11. Weights 400 (83%) and 800. The phone `h1` (44 px) is smaller than the `h2` (48 px).
- Contrast: 23/43 text elements fail on `/`, 11/28 on `/pricing.html`. The worst is `#d1d5db` on white at 1.47:1. The footer is `#6b7280` on `#0f0f23` at 3.9:1.
- Focus: none visible on any control (`a:focus, button:focus, input:focus { outline: none }`): 15/15 on `/`, 11/11 on pricing. Nothing shows in forced-colours mode either.
- Semantics: no `lang`, no `main`, no skip link, no `h1` on pricing. axe: color-contrast, html-has-lang, image-alt, landmark-one-main, region.
- Hidden content: 6 `.reveal` cards invisible without JS.
- Images: the placeholder screenshot has no alt, no dimensions, `loading=lazy` in the first viewport, and is served at 1200 px for 342 px on a phone. It is the LCP at 1440.
- Targets: 5 of 12 controls under 44 px on a phone.
- dembrandt: 7 colours (`#8b5cf6` accent, `#3b82f6`, greys), 15 text styles, spacing on no clear system (14, 18.72, 11, 60 px…), radii 999 / 20 / 12, one breakpoint at 700 px, and one 0.8 s ease motion.
- Signals: gradient text ×6, violet gradients 9 of 9, glass nav, emoji icons, 6 icon tiles, 7 cards, 4/4 pill buttons, Inter (first-wave saturated face), one-accented-phrase headlines ×2, a pill badge above the headline, cliché copy (supercharge, all-in-one, empowers, work smarter, seamlessly).

**Accessibility features that already work (keep):** the form is a real `<form>` with a real submit `<button>` and a no-JS POST action. Links are real `<a>` elements. There is a sticky nav but nothing is obscured under it (no 2.4.11 findings). Page titles exist.

**Must be preserved (functionality and truth):**
- Routes / anchors: `/` (`index.html`), `/pricing.html`, `app/` (linked "See the app"), `#features`, `#story`, `#visit` (targets of pricing's nav and CTA links), `tel:+35322000000`.
- Element ids, data attributes and fields: `#visit-form`, `#visit-msg`, `data-track="visit_form_submit"`, `name` / `farm` / `herd_size` / `phone`, `action="/api/visit"`, `method="post"`.
- Contracts / analytics: `site.js` POSTs JSON (`content-type: application/json`) of the four fields to the form's `action`, and calls `window.mlTrack(form.dataset.track)` on the submit event *before* validation. The shim `window.mlTrack = window.mlTrack || …` must stay, because the tag manager injects the real one. The required fields in the current script are `name` and `phone`.
- Legal: "© 2026 Milkline Ltd, Mallow, Co. Cork. Registered in Ireland 651234.", "Prices exclude VAT.", Privacy and Terms links (currently `#`, kept and flagged).
- Metadata: home title "Milkline", description "Herd health alerts, milking rotas and vet records for dairy farms."; pricing title "Pricing — Milkline" (no description).

**Heuristic findings** (passes: Nielsen, first-time farmer, keyboard only, 390 px thumb; merged, then rated):

| # | Finding | Heuristic / lens | Severity |
| --- | --- | --- | --- |
| H1 | Errors say "Invalid input" without naming the field or the fix. Colour is the only cue, and nothing is announced or focused. | 9 Recover from errors; keyboard | 4 |
| H2 | Placeholder-only labels. Once a farmer types, the field's purpose disappears, and "Herd size" gives no hint of the format. | 6 Recognition; phone | 3 |
| H3 | The headline "Supercharge your farm with smart herd insights" does not say what the product does. The concrete sentence is buried in the first feature card, in grey. | 2 Match real world; first-time farmer | 3 |
| H4 | No focus is visible anywhere, so a keyboard user cannot see where they are. | keyboard | 3 |
| H5 | "✨ New: AI-powered herd intelligence" makes a claim that nothing else on the site explains or supports. | 2 Match; credibility | 2 |
| H6 | "See the app" opens a dashboard with a fictional farm and no explanation or way back. | 3 User control | 2 |
| H7 | The pricing "Most popular" glow and scale suggest a choice where herd size decides the plan. | 8 Minimalist; 2 Match | 2 |
| H8 | On a phone, the nav shows only the brand and the CTA. Pricing and About are unreachable except through the footer (Pricing only). | phone | 2 |
| H9 | The success message, once shown, stays red if an error came first. | 1 System status | 2 |
| H10 | Privacy and Terms are dead `#` links on a form that collects phone numbers. | credibility | 2 (blocked on content) |

**Cognitive walkthrough, task 3 (start a trial):** (1) Will they try? Yes, the CTA is everywhere. (2) Will they notice the action? The CTA jumps to a form of four unlabeled pills in one row; on a phone the fields stack, with no labels. (3) Will they connect the action with the effect? "Start free trial" is followed by "We'll ring you". The sub-copy says so, but in grey at 2.54:1. (4) Will they see progress? Only "Thanks! We will ring you." in the colour of any earlier error, not announced, and with no statement of when. **"No" at steps 2 and 4.**

**Why the current design fails:** it is the 2023 AI-SaaS template with dairy nouns dropped in. Nothing in its type, colour, imagery or composition comes from Milkline, dairy farming or the 2021 mark. It fails its own users on contrast, labels and focus. It hides the one concrete thing the product does behind "smart herd insights", and puts a wireframe where the product should be.

**The five things a stranger notices first** (expressive + redesign; all five change):
1. **Typeface:** Inter (rendering as Arial here) at 800, 72 px, tight tracking, one sans for everything.
2. **Palette:** violet-to-blue-to-cyan gradients on lavender radial blobs over white, with pale grey copy.
3. **Hero composition:** everything centred. Pill badge, then a two-line headline with a gradient phrase, then a grey subline, then two pill buttons, then a large rounded "screenshot" with a heavy shadow.
4. **Section rhythm:** each section is a centred `h2`, a grey sub-line, then a 3×2 grid of icon cards or a row of gradient numbers. All on white, all the same width.
5. **Imagery:** emoji icons in lavender tiles, a 🐄 emoji as the logo, and a wireframe placeholder as the product.

## References

Live sites could not be loaded. Outbound HTTP to every site except GitHub raw, npm, PyPI and Google Fonts is blocked in this environment, and github.com itself returned 403. What was *measured* came from npm packages. What is marked "knowledge" was not inspected, and is labelled so here and in the report.

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| GOV.UK Design System, `govuk-frontend@6.5.1` (measured from the package: `components/input`, `error-summary`, `settings/_measurements.scss`, `_typography-responsive.scss`) | A form that works first time for anyone, including older, rushed or low-confidence users | Labels above fields, always visible. Inputs 40 px+, 2 px borders, 19 px text. Errors: a summary at the top, focused on submit, linking to each field, plus a message on the field itself. A 3 px focus outline that stays visible in forced colours. Plain verbs. | The GOV.UK look (Transport/Arial, black header, yellow focus), the "Continue" flatness, the crown. Milkline is a company, not a service. |
| IBM Carbon, `@carbon/type@11.68.0` (measured: `scss/_styles.scss`) | Hierarchy without shouting; two type sets on one system | Expressive headings rely on size and space at *regular to semibold* weight (expressive-heading-05 is 32 px regular), not 800 black. A separate productive set for product fragments. | IBM Plex, Carbon's grey-10 corporate look and 16-column grid. |
| Twenty CRM marketing site (knowledge plus this skill's `categories.md` notes; github.com returned 403) | Showing the real product on a marketing page, honestly | Product fragments built in HTML at the app's real size, with obviously sample data, beside the claim they prove. | Its dark developer-tool aesthetic and animated hero. |
| The co-op milk statement / monthly milk docket (knowledge; the farmer's own document, not a website) | Earning trust from farmers in their own terms | Farmers already trust a plain tabular statement of their own numbers with units (litres, butterfat %, protein %, SCC). Numbers with units in tabular figures, ruled rows, a clear total line. | Its dot-matrix, low-budget print look. No skeuomorphic paper. |
| Herdwatch, MooCall, Lely, DeLaval (direct competitors and parlour makers; knowledge only, not loaded) | What the category expects (Jakob's law), and where everyone looks the same | Farmers expect to see the actual phone or desktop screens, a plain price and a phone number. | The category default: green fields at golden hour, stock Holsteins, phone mockups at an angle, "join 10,000 farmers" banners, green-everything palettes. |
| Irish Cattle Breeding Federation / Teagasc publications (contrary reference: institutional, dense, plain; knowledge only) | Authority without marketing | Authority from specificity: named people, named places, units, dates. | The institutional clutter, PDF-first delivery and density. |

## Direction

**Onlyness:** "Milkline is herd-health software that reads the parlour data a dairy farm already has and tells the farmer and the relief milker which cow to check that morning, built by a large-animal vet and a Cork dairy farmer." (It can be written honestly. The differentiator is the pairing of the parlour's own data with the vet-and-farmer origin, not a feature list.)

**Attributes (this, not that):**
- *Practical, not techy*: "flags any cow whose yield drops or whose conductivity rises", never "smart herd insights". Figures always carry units.
- *Sure, not loud*: a sturdy humanist sans at 800 for headlines, no gradient, no accented word, no badge.
- *Warm, not cute*: the rounded Nunito wordmark and the droplet stay. No cartoon cows, no emoji, no gingham, no hand-lettering.
- *Plain-spoken, not rustic*: the farmer's own nouns, set cleanly. The vernacular is a reference, not a costume (no chalkboards, no barn wood).

**Concept: "Caught on the line."** The milk line is the stainless pipe that carries every cow's milk from the cluster to the bulk tank, and the company is named after it. Milkline watches each cow's milk on the way down the line and flags the one to check *before* the tank shows it. The founders' story ("tired of finding out about mastitis from the bulk tank") and the only customer quote describe the same moment. How it translates:
- **Surfaces:** milk-white (a faint blue-white, the colour of milk in a clear line) and white. The navy of the mark carries the product panel and the footer.
- **Graphics layer:** the mark's own geometry. The 7-unit rounded navy bar becomes *the line* (a rule with round caps), and the sky droplet becomes the node and list marker. In the hero, a whole herd sits along the line as droplets, one per cow, from the sample herd's real statuses.
- **Imagery:** the product's output (the flagged cows with their numbers) as HTML fragments built from `data/herd.json`, labelled as a sample herd.
- **Type:** Fira Sans, a sturdy humanist sans with tabular figures, so numbers with units line up.
- **Motion:** once, in the hero, the herd fills along the line from left to right, as if the morning's milking is being read, and the flagged cows are marked last.

**Candidates considered** (seven, across five material families):
1. **Caught on the line** (the mark's geometry and the parlour pipeline; brand-geometric plus product). **Chosen.** It comes from the name, the mark and the product's moment at once.
2. **The morning list** (product UI, drenched navy, Atkinson Hyperlegible Next; style tile B). It lost because the drenched field and the slashed-zero display read as a monitoring tool rather than a company. Its best idea (the flagged-cow list as the hero) is part of the product layer every direction would carry, so it was not merged in as a separate device.
3. **The parlour board** (vernacular: the whiteboard and marker where farmers write cow numbers). Lost: costume, and handwriting fails "serious".
4. **The milk statement** (paper: the co-op's monthly docket, ruled tables). Lost: it lands on the broadsheet/paper cluster of the model's prior, and it has nothing to do with the mark.
5. **Tail paint and leg bands** (colour signal: the marks farmers put on treated cows). Lost: it would turn red, green and amber into decoration, and those must stay reserved for status (design-theory B9). It also leaves the brand's hue family.
6. **Yard at six** (photography: real Irish yards and parlours at morning milking). This is the right answer if Milkline can supply its own photographs, but none can be sourced here (network blocked, AI imagery banned), so the design must not depend on it. Offered in the report.
7. **The co-op notice** (civic/institutional: white, navy, big plain type; style tile C). Trustworthy but anonymous. It would fit any agricultural body.

Style tiles A, B and C were rendered and compared: `captures/direction/home-1440-style-tiles.png`.

**Refuses:** the page this category always ships (golden-hour fields, stock Holsteins, an angled phone mockup, "Join 10,000 farmers", green everything). Also its predictable opposite, the dark "precision agriculture" dashboard with glowing data and an acid accent. And the page the template already is (violet gradients, a pill badge, icon cards).

**First viewport, exactly (1440 × 900; sticky header 72 px):**
- The header holds the outlined logo on the left at 36 px high. Right: "How it works", "Pricing", "About" as 18 px text links, then "Start free trial" as a navy button.
- Below it, a two-column split on white (columns 6/6, container 1200 px).
  - Left column: the `h1` "Know which cow to check before the bulk tank does." at about 60 px / 800, three lines, balanced. Then an 21 px lead sentence with the real mechanism (parlour exports and in-line milk meters, yield drop or conductivity rise, often the first sign of mastitis). Then the navy "Start free trial" button (56 px tall) with, beside it, the text link "See the app". Under the button, one line of 16 px microcopy: "30 days free. No card. We'll ring you to set up your parlour export."
  - Right column: a navy panel (radius 16) holding the product fragment. At the top, the label "Morning milking · sample herd, 40 cows". Then the herd line: 40 droplets on the line in two rows of 20, sky for "ok", with the 2 alert and 3 watch cows marked by shape *and* word. Then a white card for **Rosie, IE1111**: yield 33.1 L (−8.8 L), conductivity 6.77 mS/cm, 31 days in milk, milked 05:18, the status "Check this morning". Then a short list of the other four flagged cows. The panel bottom stays inside the first viewport at 1440 × 900.
- On a phone (390): the `h1` at 36 px, then the lead, the button (full width) and the microcopy. The panel follows below the fold, with droplets in four rows of 10.

**Breaks if:** (1) a gradient, glow or glass surface comes back; (2) the product panel shows numbers that are not in `data/herd.json`, or is not labelled as a sample; (3) the droplet or the line is used as decoration where it means nothing (a watermark, a bullet on everything, a wiggly divider).

**Memory test:** "The dairy one with the row of little milk drops, where one cow was flagged red with her litres and conductivity, and the line about the bulk tank."

**Convergence checks:**
- *Similar-brief test:* the same method for a different agri company (a calving-sensor maker) would give a different plan: that brand's own mark, a calving alert on a phone at 2am, and probably a dark scene, because the use scene is night. This plan's devices (the line, the droplets, a herd of 40, conductivity) come from Milkline's name, mark and data, and would be wrong for them. Pass.
- *Category test:* from "agritech" alone you would guess green fields and a phone mockup. From "agritech, avoid the obvious" you would guess a dark precision-farming dashboard. Neither is this. Pass.
- *Second-order test:* Fira Sans is chosen for its humanist construction next to a humanist wordmark, its tabular figures, and its l/1/I distinction for tag numbers like IE1111, not because "not Inter". The light theme comes from the use scene (a phone in daylight in the yard), not "not dark". Navy and sky come from the mark, not "not purple". Pass.
- *Ledger:* one sentence: "White and milk-white surfaces; Fira Sans 800 display with no emphasis device; sentence-case 600 labels (no caps or eyebrow system); the navy of the mark as the one product panel and the footer, with no ink chapters; accent = the logo's sky droplet; hero = split with a product panel of real sample data on the line." Compared with `ledger.md`: brio3 (paper, italic serif, mono eyebrows, ink chapters, warm accent) differs on every term. **Brandigade** also ended "built from the logo's blues" with a hero object "on a sky panel" and a drawn timeline, so the risk of a sibling is real. The palette overlap is dictated by both logos, which is legitimate. The difference has to come from the family. Here there are no illustrations and no milestone art. The hero object is live-looking *product data* (clearly labelled as a sample), not a drawn calendar. The panel is navy, not sky. The only diagram is a mechanism (what flows from the parlour to the farmer), with labels, not a timeline. CleoHR (Bricolage, photography under a duotone, a stamp mark) differs. **Noted for the skill:** `web-design.md`'s chapter table itself prescribes "a drawn path with nodes and milestone art" and a hero object "on its own panel", so the skill's own recipe pulls outputs toward Brandigade.

## Typography

- **Expressive set (marketing), base 18 px, about 1.25 ratio, fluid headings:** 14 (legal, captions) · 16 (labels, hints, microcopy) · 18 (body) · 21 (lead) · 24 (`h3`) · `h2` clamp(30 → 42 px) · `h1` clamp(36 → 60 px). Max/min is 1.4 and 1.67, both ≤ 2.5, so zoom still works. Every step is used: 14 footer, 16 labels, 18 body, 21 lead, 24 register terms, `h2` per chapter, `h1` once.
- **Productive set (product fragments only):** 14 (meta) · 16 (row text) · 20 (the flagged cow's name and figures), with tabular figures on. The app itself uses 13 px. The fragment runs slightly larger because it is read at marketing distance, and that is noted as a deliberate deviation.
- **Display:** Fira Sans 800, tracking −0.015em at `h1`/`h2`, line height 1.04 (`h1`) and 1.12 (`h2`), `text-wrap: balance`. Why it matches: the wordmark is a *rounded humanist* sans. Design-theory C3 asks for a humanist grotesk beside it. Fira (Spiekermann, from the FF Meta lineage) is a sturdy, practical humanist sans. It sits next to the rounded wordmark without copying its roundness, which would read soft ("warm, not cute").
- **Text / UI:** Fira Sans 400 (body) and 600 (labels, buttons, register terms). Measure 62ch. `fonts.mjs --google "Fira Sans"`: figures proportional by default, tabular with `tnum`, x-height 0.527 (large, which helps legibility for older readers). The lowercase l has a tail, so IE1111 does not collapse into bars.
- **Data face:** none. Figures use Fira Sans with `font-variant-numeric: tabular-nums` (Milkline is not a developer product, so no monospace, per `lessons.md`).
- **Caps / tracked-label device:** none. Labels are sentence case at 600. There are no eyebrows.
- **Rejected after `fonts.mjs`:** Commissioner (no tabular figures, even with `tnum`), Atkinson Hyperlegible Next (excellent legibility, but at display sizes its slashed zero and quirks read technical; tile B), Nunito for text (the wordmark's face, but on the saturated list and soft at text sizes). Nunito survives *only inside the mark*, as outlines.
- **Licence and loading:** Fira Sans, SIL OFL 1.1, from `@fontsource/fira-sans@5.3.0` (latin subset). Self-hosted in `assets/fonts/` with the licence file, weights 400/600/800 (3 × about 24 KB = about 74 KB), `font-display: swap`, the two most important weights preloaded, with a metric-adjusted Arial fallback. The Google Fonts request for Inter is removed (it was a third-party request, it failed here, and it sent visitor IPs to Google).
- **Logo:** the 2021 `assets/logo.svg` sets its wordmark as live `<text>` in Nunito Black, so as an `<img>` it falls back to a default sans (verified in the tiles capture). `assets/logo-milkline.svg` and `-reverse.svg` are the same mark with the wordmark outlined from Nunito Black 900 (OFL): geometry and colours unchanged, and the original file kept.

## Colour

**Strategy: Restrained (60/30/10).** White and milk-white carry about 60%. Navy about 30% (headings, the hero product panel, the footer). Sky about 10% (droplets, the line's highlights, focus on dark). The primary action is navy everywhere. It never sits on the navy panel or the footer, so it never has to change colour.

**Harmony and sources:** analogous blues from the mark only. Navy `#14365C` (H 253) dominates, and sky `#2FA4D7` (H 232) supports. Status colours (red, amber, green) are reserved for cow status inside product fragments. They never decorate.

**Use scene:** light. A farmer reads this on a phone in the yard in daylight, or on a laptop in the evening, and a light ground holds up in glare. There is no dark theme: the old site had none, and nothing in the use scene asks for one. `color-scheme: light` is declared.

**Scales:** `palette.mjs --brand '#14365C'` and `--brand '#2FA4D7'` (`audit/palette-*.txt`). Neutrals are the navy-tinted steps. The solved step 8 "focus" (2.48:1) was *not* used for focus: it fails 3:1.

**Contrast table** (`contrast.mjs`, measured on the real grounds):

| Token (role) | Value | Use | On `#fff` | On milk `#f2f7fd` | On navy `#14365C` |
| --- | --- | --- | --- | --- | --- |
| `--surface` | `#ffffff` | page ground | — | — | — |
| `--surface-milk` | `#f2f7fd` | alternate chapters | — | — | — |
| `--surface-navy` | `#14365C` | hero product panel | — | — | — |
| `--surface-deep` | `#0c2440` | footer | — | — | — |
| `--ink-strong` | `#14365C` | headings, figures | 12.27:1 / Lc 97.7 | 11.39:1 / Lc 92.6 | — |
| `--ink` | `#283f59` | body | 10.79:1 / Lc 94.9 | 10.02:1 / Lc 89.8 | — |
| `--ink-muted` | `#4a6280` | microcopy, captions, meta | 6.27:1 / Lc 81.2 | 5.82:1 / Lc 76.0 | — |
| `--on-navy` | `#ffffff` | text on the navy panel and footer | — | — | 12.27:1 (15.65 on deep) |
| `--on-navy-muted` | `#b6cde8` | secondary text on navy | — | — | 7.53:1 / Lc −68 (9.60 on deep) |
| `--action` / hover | `#14365C` / `#05294e` | primary button fill (white label 12.27:1) | 12.27:1 fill vs ground | 11.39:1 | never used here |
| `--link` | `#0f6f9b` | inline links (plus underline) | 5.57:1 | 5.18:1 | — |
| `--sky` | `#2FA4D7` | droplets and the mark on navy; never text on light | 2.83:1 (decoration only on light) | 2.63:1 | 4.33:1 (graphics ✓) |
| `--line` | `#14365C` | the milk line rule | 12.27:1 | 11.39:1 | — (sky on navy) |
| `--border-field` | `#4a6280` | input borders (2 px) | 6.27:1 ✓ 1.4.11 | 5.82:1 | — |
| `--rule` | `#c7daf0` | hairline dividers in registers (decorative; grouping is by space first) | 1.4:1 (not relied on) | — | — |
| `--focus` | `#0f6f9b` (light) / `#b1dff9` (navy) | 3 px outline, 2 px offset | 5.57:1 | 5.18:1 | 8.64:1 |
| `--alert` text / tint | `#b42318` / `#fdecea` | "Check this morning" | 6.57:1 | 6.10:1 | — |
| `--watch` text / tint | `#8a4b00` / `#fff4e0` | "Watch" | 6.80:1 | 6.32:1 | — |
| `--ok` text | `#1d6b3a` | "OK" (legend only) | 6.53:1 | 6.06:1 | — |
| `--error` | `#b42318` | form errors (always with words and a 4 px bar beside the message) | 6.57:1 | 6.10:1 | — |

## Layout and space

- Container 1200 px max. Gutters 20 px (phone), 32 px (tablet), 40 px (desktop). 12-column grid at ≥ 1024 px, one column below 768 px.
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Chapters are 96 px apart vertically on desktop and 64 px on phone. Inside a chapter, 24–48 px. Inside components, 8–16 px.
- Radii by role: 4 (status tags), 8 (buttons, inputs, the cow card), 16 (the product panel, the form panel). There are no pills.
- Elevation: one layer only. The cow card on the navy panel gets a two-layer shadow, because it sits on top of the herd line. Nothing else has a shadow.
- Cards: only the cow card (an independent object) and the form panel (a real form). Features are a ruled register, not cards. Pricing is a table, not cards.
- One deliberate grid break: the milk line in "How it works" runs past the container to the viewport edge on the right, because the line continues to the tank.

## Imagery and graphics

- **Product fragments** are the imagery: the herd line and the flagged-cow card in the hero, and the mechanism diagram in "How it works". Every figure comes from `data/herd.json` (the demo herd, "Hegarty Farm, Mallow", 40 cows, 5 flagged), each fragment is labelled "Sample herd", and no customer names are used for data.
- **Graphics layer:** drawn in SVG from the mark: the rounded navy bar (the line) and the sky droplet (a node or marker). It has one stroke weight (7 units at the mark's scale, 6 px in the diagram) and round caps. The glyphs are the droplet (ok), a droplet with a red ring and "!" (alert), and a half-filled droplet (watch). Shape carries status as well as colour.
- **Photography:** none in this build, **by constraint, not choice.** Photos of Milkline's own farms (Brennan Farm, Tom Hegarty's parlour) would be the strongest addition. Stock cannot be fetched here and AI imagery is banned. The design does not depend on photographs. It is asked for in the report.
- The wireframe placeholder `app-screenshot.png` is removed from the page (the file is left in `assets/`, unused, so that nothing else linking to it breaks).

## Motion

- Expressive tokens: `--dur-1: 160ms` (hover/press), `--dur-3: 600ms` (the hero sequence), easing `cubic-bezier(.2,.7,.2,1)` (ease-out) for entrances. There is no bounce and no `transition: all`.
- **The one concept move:** the herd fills along the line in the hero. Each droplet scales from 0.9 and fades from 0.4 to 1, staggered 15 ms from left to right (the whole sequence is about 0.9 s). Then the alert and watch markers and the Rosie card appear (opacity, 8 px rise, 300 ms). It plays once, on load.
- **Written safe:** everything is visible by default. A script adds `html.motion-ok` only when `prefers-reduced-motion: no-preference`, and the keyframes run *from* a reduced state *to* the finished state with `animation-fill-mode: backwards`, so if the animation never runs, the content is already finished. The old `.reveal` opacity-0 trap is deleted.
- **Reduced motion:** the final state is shown immediately (substitution, no deletion).
- **Never moves:** text, buttons (except a 160 ms colour change on hover), the form, pricing, anything on scroll.

## Interaction

- **Primary action on every page:** "Start free trial". Navy, 56 px tall in the hero, 48 px in the header. It links to `index.html#visit` (or `#visit` on the home page). Every secondary action is an underlined text link ("See the app", "See pricing", "Ring us").
- **Components and states:** button (rest / hover / focus-visible / active / disabled-while-sending); text link (rest / hover / focus / visited stays the same colour); text input (rest / hover / focus / invalid / disabled while sending); error summary (hidden / shown and focused); status message `#visit-msg` (empty / sending / sent / failed); nav (desktop / phone, with no hidden menu).
- **Form** (fields, names and endpoint unchanged):
  - "Your name" (`name`, required, `autocomplete="name"`)
  - "Farm name (optional)" (`farm`, `autocomplete="organization"`)
  - "Herd size (optional)" (`herd_size`, `inputmode="numeric"`, hint "Cows in milk, roughly")
  - "Phone number" (`phone`, required, `type="tel"`, `autocomplete="tel"`, hint "We'll ring between 6am and 10pm")
  - Labels sit above fields. Validation happens on submit (the same two required fields as today). Errors appear in a summary at the top of the form, headed "There is a problem", which is focused and links to each field, with the same message beside each field, `aria-invalid` and `aria-describedby`. The `<title>` is prefixed with "Error: ".
  - Messages: "Enter your name" and "Enter a phone number so we can ring you".
  - Success: `#visit-msg` (`role="status"`) says "Thanks, {name}. We'll ring you on {phone} to set up your parlour export." Failure: "That didn't send. Try again, or ring us on +353 22 000 000." (the same tel number as pricing).
- **Analytics contract kept exactly:** `window.mlTrack(form.dataset.track)` fires on the submit event *before* validation (the current behaviour, preserved). A JSON POST to `form.action` with the same four keys.
- **Targets:** every control is at least 44 × 44 px; primary actions and inputs are 48–56 px. The phone nav shows the logo, "Pricing" and "Start free trial" (all ≥ 44 px), and the "How it works" and "About" anchors are reachable in the page and the footer.
- **Performance budget:** LCP is the `h1` (text) on every width. Fonts are about 74 KB self-hosted. JS is one small file (≤ 4 KB), with no third parties and no images above the fold except inline SVG.

## Accessibility

Filled before any code (`accessibility.md` §2). WCAG 2.2 AA, aiming for 2.4.13 and 2.3.3.

- **Contrast table:** see Colour. Every text pair is ≥ 5.18:1 and body is ≥ 10:1.
- **Non-text pairs:** input borders `#4a6280` at 6.27:1; the focus ring at 5.57:1 (light) and 8.64:1 (navy); ok droplets are sky on navy at 4.33:1; alert and watch markers carry a word as well.
- **Focus token:** `outline: 3px solid var(--focus); outline-offset: 2px`, with `--focus` redefined on the navy panel and footer. `:focus-visible` only for mouse; inputs show focus always. Sticky header 72 px means `scroll-padding-top: 88px`. The header becomes static when the viewport is under 500 px tall.
- **Targets:** 24 px floor, 44 px for everything tappable. Inline links in running text are exempt (the spacing exception).
- **320 px state:** single column, the nav wraps to two lines if needed (logo; Pricing plus CTA), the herd line in rows of 10, the pricing *table* stacks as a list with labelled figures (it is simple enough to stack rather than scroll), and the form at full width.
- **Colour independence:** cow status is a word plus a droplet shape; errors are words plus a bar plus an "Error:" prefix; links in text are underlined; the herd line has a text legend and a visually hidden summary ("40 cows milked; 2 to check this morning, 3 to watch").
- **Motion:** one hero sequence under 1 s, with reduced motion showing the final state at once. Nothing auto-updates or loops.
- **Forced colours:** buttons and inputs have real borders (a transparent 2 px border on filled buttons), focus is an outline, SVG uses `currentColor` where it carries meaning, and droplet status shapes differ by shape.
- **Component map:** nav → `header > nav[aria-label="Main"] > ul > li > a`, with `aria-current="page"` on Pricing when there; skip link → `a.skip` to `#main`; the herd line → `figure` with `figcaption` and an `svg role="img"` + `aria-labelledby` pointing to a text summary; the cow list → `ul`; the process → `ol`; features register → `dl`; pricing → `table` with `caption` and `th scope`; FAQ → `h3` + `p` (three questions, all open, so no disclosure is needed); form → `form` with `label for` / `input` / `button type=submit`; error summary → a plain `div` with a heading and `tabindex="-1"`. Per §6, **focus moves to the summary** and does the announcing, so it takes no `role="alert"` (which would announce twice); `#visit-msg` → `role="status"`, present and empty at load.
- **Forms:** GOV.UK error pattern (above), "(optional)" on the two optional fields, and `autocomplete` map: name→`name`, farm→`organization`, phone→`tel`, herd_size→`off`.
- **Announcements:** `#visit-msg` is `role="status"` (sending, sent, failed). Validation errors move focus to the summary. There is no SPA.
- **Data:** the herd line has a text summary plus a legend, and the flagged cows are also a real list with numbers and units.
- **Preserved features:** a real form, a real button, a no-JS POST fallback (`action` and `method` kept), real links, page titles. **Added:** `lang="en-IE"`, `main`, a skip link, one `h1` per page, labels, focus, `autocomplete`, and a live status.

## Page narrative (expressive routes)

**Headline test:** "Know which cow to check before the bulk tank does." Would a dairy farmer who read only this know what we sell? Yes: something that tells them which cow has a problem before it shows up in the tank. The lead sentence adds the mechanism (parlour exports, milk meters, yield and conductivity) that makes it believable.

**`/` (index.html)**
1. **Hero** (split on white: copy / navy product panel). What it is, the moment it serves, the proof that it is real software, and the action.
2. **Proof** (statement on milk): Aoife Brennan's quote at display size, with her farm, county and herd size; "2 days earlier" tied to her by name, not presented as a product statistic; then "Used on 340 farms across Ireland and the UK". Real proof, compact, as big as it is.
3. **How it works** (`#features`; diagram on white): the actual mechanism as an ordered path along the milk line. (1) your parlour's daily export and in-line meters, then (2) Milkline checks every cow after every milking, then (3) you and your relief milker see who to check, then (4) treatments and withdrawal periods go in the vet log. Plus the offline note. A diagram because it is a real flow. The line breaks the grid to the right edge.
4. **Everything else it does** (register on milk): a ruled two-column list with a droplet marker for milking rota, vet visit log, yield per cow / group / milking, works offline, and farm-hours support. It is a list because these are items, not objects: no cards and no icons.
5. **About** (`#story`; statement on white): "Started in Cork in 2019 by a vet and a farmer.", the two named founders with their roles side by side, and the bulk-tank sentence. There are no photos, because none exist.
6. **Start a free trial** (`#visit`; split on milk): the left side says what happens next (a numbered list: fill this in, we ring you and set up your parlour export, 30 days with everything, nothing happens after unless you choose a plan) plus a line on prices. The right side is the form on a white panel.
7. **Footer** (deep navy): the reversed mark, the legal line, and links to pricing, the app, privacy and terms.

## Keep / replace / remove / create

**Keep:** every fact and number (the prices, 340 farms, the quote, the founders, support hours, 99.9% uptime flagged, the registration line); the routes, anchors, form id, fields, endpoint and event; the `mlTrack` shim; the 2021 mark and its two colours; static HTML with no build.

**Replace:** the typeface (Inter via Google, then Fira Sans self-hosted); the palette (violet gradients to the navy and sky of the mark); the hero (centred badge + gradient headline + two pills + wireframe, becomes a split headline + product panel from real sample data); the section grammar (centred `h2` + grey sub + card grid, becomes chapters with a statement, a diagram, a register and a form split); the nav (emoji brand, becomes the outlined mark, with phone-reachable links); the footer; the pricing composition (three cards with a "popular" glow, becomes a herd-size table); the form (placeholder pills, becomes labelled fields with a GOV.UK error pattern); the copy for the headline and section heads (cliché, becomes the farmer's words); the 🐄 emoji brand; `site.js` (keeps the contract, gains labels, errors and status).

**Remove:** the "✨ New: AI-powered herd intelligence" pill (a claim with no support elsewhere on the site; flagged to the user); the "Most popular" badge (a popularity claim with no source, on a price set by herd size, not by choice); gradient text; radial blobs; the glass nav; the emoji icons and icon tiles; the `.reveal` hide-until-scrolled; the wireframe screenshot on the page; the Google Fonts request; `outline: none`.

**Create:** the outlined logo files; the herd-line product fragment; the flagged-cow card; the mechanism diagram along the line; the droplet list marker and the status glyphs; the error summary, field errors and status message; the pricing table; the skip link and `main`; the self-hosted font files and licence; the social/meta description for pricing.

(Keep is 6 items, Replace + Create is 12 + 11. The direction is a redesign, not a refresh. All five first-notice things change: typeface, palette, hero composition, section rhythm, imagery.)

## Secondary pages

**`/pricing.html`** adopts the same header, footer, tokens and type. Structurally:
1. `h1` "Priced by herd size", with the three facts in the lead: every plan includes every feature; 30-day free trial, no card; prices exclude VAT.
2. A table: *Herd size · Per month (ex VAT) · action*. Rows: "Up to 150 cows, €39, Start free trial"; "Up to 400 cows, €79, Start free trial"; "Over 400 cows · multiple parlours or units, Let's talk, Ring us (tel)". There is no highlighted plan.
3. "What every plan includes": the same register as the home page.
4. "Questions": the three questions, all open.
5. A closing statement with "Try it free for 30 days" and the button to `index.html#visit`.

`/app/` is not touched (out of scope). The seam is noted in the report: "See the app" leads from the new site into the old template look.

## Verification: what remains, and why it is accepted

Final runs are in `audit/` (after the round-1 critique fixes). Every item below was checked in a render or a probe, not just accepted from the tool.

| Tool | Finding | Verdict |
| --- | --- | --- |
| `audit.mjs` 1440 (both pages) | ✗ "Focused control hidden under a fixed/sticky element: a.skip under header.site-header" | **False positive.** The skip link is `z-index: 100` over the sticky header; `elementFromPoint` at its centre returns the skip link, and the screenshot shows it on top (`captures/after/states/skip-link-focused.png`). The check compares rectangles and ignores stacking order. |
| `a11y.mjs` (both pages) | WARN 2.4.12 "Focused element partly covered (2/5 sample points)": skip link | **False positive.** The sample points sit 2 px inside each corner, which is outside the 8 px `border-radius`, so they hit the header behind the link. |
| `a11y.mjs` home | WARN 2.4.3 "Focus jumps back up the page (See pricing → Your name)" | **Accepted.** In the trial chapter, the left column (what happens next) is read before the right column (the form), and DOM order matches that reading order. The form's top is higher than the end of the left column, which is all the heuristic sees. |
| `a11y.mjs` home | WARN 1.3.1 "Looks like a heading": "2 days", "6am–10pm" | **Accepted.** These are figures in a facts list (`ul.facts`), each paired with its caption; they are not section headings. |
| `a11y.mjs` | INFO `forced-color-adjust: none` on two `img` | **Deliberate.** The logo images get a fixed plate so the navy or white wordmark stays visible in any forced-colours theme; without it the header mark vanished on black. |
| `parity.mjs` | ✗ unsourced claim "6.77 mS" | **False positive.** 6.77 is Rosie's conductivity in `data/herd.json`, and "mS/cm" is the unit in `app/app.js`. The claim pattern matched `ms` (milliseconds), case-insensitively. The fragment is labelled "Illustrative data from the demo herd". |
| Lighthouse 13.5 mobile | LCP 1.80 s (home) and 1.67 s (pricing), against 1.38 s before | **Accepted, within budget (≤ 2.5 s).** The baseline loaded *no* web fonts, because its Google Fonts request failed in this environment. The new page self-hosts 74 KB of Fira Sans (preloaded 400 and 800). FCP improved from 1.38 s to 1.05 s. CLS 0 and TBT 0 in both. |
| (not run) | Screen reader smoke test | **Deferred.** No NVDA, JAWS or VoiceOver here; recommended before launch. |

**Contract checks:** `audit/after-form-walk.txt` shows the JSON body keys and values identical to `audit/before-form-walk.txt`, the same `content-type: application/json`, the same endpoint, and `visit_form_submit` recorded on every submit, including invalid ones, exactly as before. One intentional difference: a second press *while a submission is in flight* is ignored (no second POST and no second event).
