# Hallam & Price — design direction

Written 1 October 2026, before implementation. Benchmark for finish: the price-as-you-choose pages of good product shops (the part of "Apple-style" worth taking), GOV.UK's form pattern for the enquiry. This must read as *this practice's* work — not the references', not the 2014 site's, and not the model's default.

This was an unattended run: nobody could be asked. Every open question is written as a labelled assumption, built on, and listed first in the hand-off report:

- **A1** Top tasks are the five below, ranked from the README's analytics; the partners have not confirmed them.
- **A2** Showing the fees from `data/fees.json` on `/fees/` and in the finder is wanted (the partners publish fixed fees and the old page promised a "fee schedule"). Figures appear exactly as in the file, ex VAT, with its VAT note and date.
- **A3** The CRM accepts an empty `business_name` (now optional, for people who don't trade under a business name). **Deploy blocker** until confirmed on staging; one attribute restores the old rule.
- **A4** Turnover stays required for everyone, including individuals and landlords, as before (no change to what the CRM receives); the hint says a rough figure is fine.
- **A5** `enquiry_start` keeps firing on contact-page load, as before, so the 240-a-month baseline stays comparable — it counts page loads, not started forms.
- **A6** The server's response to `POST /api/enquiry` (its thank-you page and any `enquiry_success` call) is unchanged; the form still submits natively.
- **A7** "Younger clients" means sole traders, freelancers, first-time company directors and landlords in their twenties and thirties who find the practice on a phone.
- **A8** "Apple-style 3D as you scroll" is read as "look current and confident", not as a literal brief for WebGL; the 3D option is written up in `REPORT.md` as David's decision, with its costs.
- **A9** No photographs exist; the site is designed not to need them, and portraits and an office photograph are requested.
- **A10** The logo's live SVG text is outlined (in Gelasio, the open-licence Georgia-metric face) and fitted to its own box; the original `assets/logo.svg` is untouched. The partners should compare it with their letterhead artwork or supply the original.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/` home | marketing | once to a few visits | money (choosing who files your tax) | expressive | redesign |
| `/fees/` | marketing — the price list (read and compare); also reached from the letterhead and email signature | occasional; existing clients return | money | expressive in type, productive in the schedule itself | **rethink** of the page's job: the fees themselves instead of a PDF link broken since 2022 (A2) |
| `/services/` | marketing | occasional | time | expressive, quiet | redesign |
| `/team/` | marketing | occasional | none | expressive, quiet | redesign |
| `/contact/` — the enquiry form | transaction (lead form) | once | time and a lost client: 240 page loads a month, 31 sent | productive | **rethink of the form's presentation**; field names, order, values, method and endpoint frozen |
| Fee finder (home and `/fees/`) | a supporting interactive element (`interactive.md` §1, case 1: the result is the visitor's own fee) | once per visit | money | expressive feel, productive controls | create — level 3 |

The client asked for a redesign "like those Apple-style sites where things fly around in 3D as you scroll". The audit argues for more on two routes (fees, form: the problems are structural) and for less on one dimension (3D motion: see "Interaction" — it fails the value test). Both are written down as assumptions for David to overrule (A2, A8).

**Audience and context:** sole traders, landlords, small limited companies and individuals in and around Sheffield, increasingly younger (A7): freelancers, first-time company directors, people filing their first Self Assessment. 71% arrive on a phone, mostly from a search for a price or a deadline, often at the moment they realise they need an accountant (a letter from HMRC, a January deadline). Existing clients arrive from the letterhead and email signature for `/fees/` and `/contact/`.

**Top tasks** (≤ 5, ranked from the practice's own analytics in `README.md`; not confirmed by the partners — A1):
1. **Find out what it will cost me** — 38% of visitors open `/fees/` and 81% of them leave from it; a top search is "how much does an accountant cost for a sole trader".
2. **Phone the practice** — the phone number is the most clicked element on phones; 71% of visits are phones.
3. **Check they do my kind of work, here** — "self assessment accountant sheffield", "limited company accountant sheffield".
4. **Send an enquiry** — the form loads 240 times a month and is sent 31 times (13%).
5. **Check a tax deadline** — "tax return deadline" is a top search.

**Problems** (severity 0–4 × task importance; each traced to the audit below):
1. **4 · task 1** — `/fees/` shows no fees: its only content is a link to `fee-schedule-2019.pdf`, which 404s, while the real fees sit unused in `data/fees.json`.
2. **4 · tasks 1–5** — the site has no viewport meta and a fixed 960 px wrapper: every phone (71% of visits) loads it zoomed out to 980 px with 13 px text rendering at about 5 px.
3. **3 · task 4** — the form: ten unlabelled table cells (5 critical `label` + 5 `select-name` axe violations), no field types or autofill, 12 px inputs that make iOS zoom, field borders at 1.2–1.4:1, an `alert()` for errors, an asterisk on everything and a shouting "SUBMIT".
4. **3 · tasks 1, 4** — the analytics calls on `/fees/` and `/contact/` run before `site.js` defines `hpTrack`: `ReferenceError: hpTrack is not defined` on both pages. In this repo `fees_view` and `enquiry_start` never record, the form's validation is never attached, and an empty form posts ten empty fields to the CRM (recorded: `captures/states/requests/before/contact-empty-submit-phone-before.json`). Production may define `hpTrack` earlier (A5).
5. **3 · task 2** — the phone number is 11 px text in a top bar (7 px on a phone after the zoom-out).
6. **2 · task 5** — the deadlines exist in `data/fees.json` and appear nowhere.
7. **2 · trust** — stale and broken content: "Latest News: Budget 2015" linking to `#`, "© 2014", grey image placeholders, fake slider dots, gold links at 2.4:1, accreditation chips at 2.85:1.
8. **2 · brand** — the logo's text is live SVG text in Georgia; on Android and Linux (no Georgia) "H&P" spills out of the square and "CHARTERED ACCOUNTANTS" is cut off (seen in every capture).

**Principles** (each can say no):
1. **The figure before the sales line.** If a price, a date or a phone number exists, it is shown, large, before any sentence about service. (Opposite a reasonable team would hold: "lead with reassurance, reveal prices after contact".)
2. **One tap to a person.** On every phone screen the call action is visible in the header without scrolling. (Opposite: "push everyone through the form so the CRM gets the lead".)
3. **Plain words, chartered facts.** Sentence case, no adjectives the practice cannot prove, credentials explained once. (Opposite: "professional, proactive, personal".)
4. **Moves only to explain a change.** Motion shows a price changing or where the tax year has got to; nothing flies for its own sake. (Opposite: the client's own request — see A8.)

**Non-goals:** no 3D, WebGL, scroll-jacking or smooth-scroll library; no new pages, blog or news (the old "Latest News" goes); no CMS, framework or build step; no change to what the CRM receives except one flagged field (A3); no invented reviews, client logos, statistics, hours or promises.

**Constraints:** static HTML/CSS/JS, no build; `data/fees.json` (edited by the partners each April, not by hand) and `data/services.json` stay the sources and are read at runtime as before; contracts: `POST /api/enquiry` form-encoded with ten fields in their current names and order, `window.hpTrack(event, props)` with `enquiry_start`, `enquiry_submit`, `enquiry_success`, `fees_view`, `phone_click`; `/fees/` and `/contact/` URLs printed on letterhead; legal line "Registered to carry on audit work in the UK by the ICAEW." kept verbatim; the 1988 lettermark (`assets/logo.svg`) kept; WCAG 2.2 AA; phone-first performance (LCP ≤ 2.5 s on slow 4G, ≤ 100 KB of fonts in two files); English only, LTR.

**Success measures** (baselines from `README.md`):
- `/fees/` exits: 81% → under 50% within three months; fee-page visitors who go on to call or enquire (new: `phone_click` and `enquiry_submit` after `fees_view`).
- Enquiries sent: 31 a month from 240 contact-page loads (13%) → 25%.
- Phone clicks on phones: hold or rise (it is the best channel; the form must not cannibalise it).
- Zero console errors; zero critical or serious axe violations (baseline: 4 rule types, 10 serious-or-critical rule hits on `/contact/`).
- Phone LCP no worse than the old build on slow 4G (`perf.mjs`).

## Audit

**What the company sells, to whom:** a two-partner chartered accountancy practice (est. 1988, nine staff) in Kelham Island, Sheffield, doing personal tax and Self Assessment, year-end accounts, VAT and Making Tax Digital, payroll and business advice for individuals, landlords, sole traders, partnerships and small limited companies — at fixed fees the partners agree each April.

**The one thing a visitor should remember / be able to do:** "They show you the price — £45 a month for a sole trader — and you can just ring them."

**Real proof that exists:** ICAEW chartered accountants (registered for audit by the ICAEW); Xero Certified; HMRC Agent; founded 1988; two named partners with credentials (David Hallam FCA, Priya Price ACA CTA) and seven accountants and bookkeepers; a published fixed-fee schedule dated 6 April 2026; an address in Kelham Island with parking. No testimonials, client names, reviews, numbers of clients, photographs or opening hours exist — none are shown.

**Brand assets sampled** (`palette.mjs --from assets/logo.svg`): navy `#1f3a5f` (50%, the square and the name), gold `#c9a227` (25%, the H&P letters), slate `#6b7a8c` (25%, "CHARTERED ACCOUNTANTS"). Wordmark: Georgia caps, a transitional screen serif, name over a tracked sub-line; the lettermark is a navy square with a gold serif "H&P". No brand family beyond the letterhead (not seen). The mark renders in the visitor's fonts; where Georgia is missing it breaks (problem 8).

**Measured baseline** (`audit/before/audit.md`, `audit/before-a11y/`, `captures/before/`, `captures/states/*-before.png`):
- Type: 13 px body in Helvetica Neue (not available → Arial/Liberation fallback), headings Georgia 26–40 px; 4–6 sizes per page; 400/700 only; text under 12 px in the top bar and footer.
- Colour: grey `#666` text on white, navy and gold; contrast fails on gold links (2.42:1), accreditation chips (2.85:1), the footer (4.43:1).
- Phone: layout viewport 980 px on every page (no viewport meta, 960 px wrapper); nav targets 34 px tall; form inputs 12 px (iOS zooms), wrong keyboards, no autocomplete.
- Structure: no `main`, no skip link, two `h1` on the home page, heading jumps h1→h3 on four pages; the form is a layout table without headers.
- Accessibility: axe — `label` (critical, 5), `select-name` (critical, 5), `color-contrast` (serious, up to 7 per page), `landmark-one-main`, `region`, `heading-order`; `a11y.mjs` — 29 FAIL on `/contact/` (no names, field boundaries 1.2–1.4:1, reflow fails at 320 and 640).
- Errors: `hpTrack is not defined` on `/fees/` and `/contact/`.
- Performance: tiny (≈ 7 KB, no web fonts); LCP is the h1 or a paragraph. The redesign adds fonts and must stay fast on slow 4G.
- **What already works and is kept:** `lang="en"`, real text (no text in images), a `tel:` link, a native form POST that works without JavaScript, almost no JavaScript, no autoplay or motion.

**Must be preserved (functionality and truth):**
- Routes: `/`, `/services/`, `/fees/`, `/team/`, `/contact/`; `data/fees.json`, `data/services.json`, `assets/site.css`, `assets/site.js`, `assets/logo.svg` stay at their paths.
- Element ids and fields: `#enquiry` (form), `#services` (the services container the page script fills); fields `name`, `email`, `phone`, `business_name`, `business_type`, `turnover`, `service`, `message`, `preferred_contact`, `how_heard` — same names, same DOM order (= payload order), same option values (`Sole trader` … `Other`; `Under £50k` … `Over £500k`; `Personal tax` … `Business advice`; `Phone`, `Email`; `Google`, `Recommendation`, `Other`).
- Contracts: `POST /api/enquiry`, `application/x-www-form-urlencoded`, native submission (the server's response owns the success page and, presumably, `enquiry_success` — A6); `window.hpTrack(event, props)` and its `window.hpEvents` queue; `enquiry_start` on contact-page load, `enquiry_submit` on a valid submit, `fees_view` on fees-page load, `phone_click` on any `tel:` link.
- Legal copy: "Registered to carry on audit work in the UK by the ICAEW." and the address "3 Cotton Mill Walk, Kelham Island, Sheffield S3 8DH".
- Facts: every price, band, inclusion, VAT note and deadline in `data/fees.json`, rendered from the file.

**Why the current design fails** (specific, with severity): problems 1–8 above. In one line: the site hides the two things its visitors came for — the price and the phone number — behind a broken PDF and an 11 px top bar, on a layout that phones cannot read.

**The five things a stranger notices first** (old site):
1. **Typeface** — small Georgia headings over 13 px grey Arial.
2. **Palette** — navy bar and box, a gold rule under the header, a grey page around a white 960 px column, a charcoal footer.
3. **Hero composition** — a navy "slider" box: "Welcome to Hallam & Price", one line, three fake carousel dots.
4. **Section rhythm** — boxed fixed-width column; three bordered cards with grey image placeholders and "Read more »"; an "About Us" paragraph; a row of grey accreditation chips; dark footer.
5. **Imagery** — empty grey placeholders; no photography.

Kept, and why: **the lettermark and wordmark** (the 1988 mark, on the letterhead; repaired, not redrawn — A10) and **the navy and gold hue family** (they are the lettermark's own two colours, used since 1988). Everything else above changes: the faces (Georgia → Literata, a different contemporary serif chosen from the wordmark's construction; Arial → Schibsted Grotesk), the palette's strategy and roles (grey page and charcoal footer go; navy becomes a committed field; gold moves from failing link text to the action fill), the hero (a typographic fee finder), the rhythm (full-width chapters, no placeholder cards) and the imagery (figures at image scale and the lettermark square as the graphic motif).

## References

Live sites could not be loaded: the environment's network policy refuses every host except GitHub, npm, PyPI and Google Fonts (tested: apple.com, gov.uk, icaew.com, design-system.service.gov.uk, upload.wikimedia.org, images.unsplash.com all refused). The one reference inspected is GOV.UK Frontend 6.5.1, read from its npm package (`discovery/raw/`, git-ignored). The others are category knowledge, marked as such, and changed decisions only where noted.

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| The Apple sites David named (recalled, **not inspected**) | look current to younger buyers | the "choose your options, watch the price change" configure step; one idea per screen; confident type at large sizes; restraint everywhere else | 3D objects and scroll-scrubbed image sequences (there is no physical product to turn round), pinned scroll-jacked chapters, multi-megabyte pages on 71% phone traffic |
| GOV.UK Frontend 6.5.1 (source **inspected**: error-summary, input, label, radios) | make a ten-field form finishable on a phone | labels above fields; hints tied by `aria-describedby`; 40 px inputs at 19 px with a 2 px border; an error summary that takes focus and links to fields; radios for short option lists; validate on submit | its look (Transport, black and yellow focus); one question per page (the CRM contract wants one ten-field POST) |
| Online fixed-fee accountants (category knowledge, **not inspected**) | price transparency | a monthly fixed price by business type and turnover band, visible before contact | sign-up checkouts, app-first pitches, "trusted by thousands" statistics |
| Local high-street practices (category knowledge, **not inspected**) | what the category looks like, to avoid it | — | navy and gold with handshake stock, "Welcome to…", hidden fees, "Read more" cards — the template this site is today |
| A shop's tariff board (contrary reference, from everyday life) | a price read at a glance | the figure is the largest thing; the description is small and under it; one line per item | — |

## Direction

**Concept — "On the table."** Everything a new client wants to know before they ring — the fee, the deadline, the people, the phone number — is put on the table, set large, before anyone asks. It comes from the practice's own material (a fixed-fee schedule the partners agree each April and a list of deadlines, both already in the repo, both hidden) and from its moment (someone with a tax problem holding a phone). The navy of the lettermark becomes the table: a committed navy field carrying the fee finder, the price at image scale in the brand serif, gold reserved for "do this".

**Candidates considered** (from the company's own world; four material families) and why each lost:
1. **"On the table" — the published price as the hero** (material: the fee schedule; family: typographic, figures at image scale). **Chosen**: it answers top tasks 1 and 2 in the first viewport and is the one thing local competitors do not do.
2. **"The tax year on the wall"** (material: the office year-planner; family: data/diagram — the tax year drawn from 6 April with today and the next deadline marked). Lost: it answers task 5, the least frequent, and turns the hero into a calendar while the price stays hidden. Its content survives as a chapter, drawn in the chosen direction's language (dates set large).
3. **"The square"** (material: the 1988 lettermark tile; family: graphic system — a grid of navy squares, one per service, the mark as list marker and module). Lost: it becomes a tile grid (the icon-card tell) and puts the brand's shape ahead of the visitor's question.
4. **"The mill"** (material: Kelham Island's red brick and the cotton mill on the address; family: photographic). Lost: no photographs exist in the repo and every image host is refused here; a page that needs photography cannot be built honestly today. Proposed to David as a later addition (his own photographs of the office and the partners).
5. **"The ledger page"** (material: ruled ledger paper, double-ruled totals; family: editorial). Lost: costume, and it is this skill's own house style (hairlines, broadsheet).

**Refuses:** the category's page (navy and gold, a handshake or calculator photo, "Welcome to", "professional, personal, proactive", "Read more") — and its predictable opposite (a dark, glowing "fintech" landing page with 3D coins). Also refuses: fake proof, a news section nobody maintains, and any 3D.

**Content priority:**
- **Home:** 1. what this is and where (chartered accountants, Kelham Island, Sheffield) + *your* fee (the finder) · 2. call or ask about that fee · 3. what we do and for whom · then the deadlines, the two partners, the close. One step away: the full schedule, each service, the form.
- **Fees:** 1. the finder and the full schedule (packages, bands, prices, VAT note, date agreed) · 2. what each includes · 3. ask about this fee / call · then deadlines.
- **Contact:** 1. call (the number, large) · 2. the enquiry form · 3. where we are.
- **Services:** 1. the five services with who each is for · 2. the matching fee · 3. call / ask.
- **Team:** 1. the two partners, their credentials in plain words · 2. the team of seven · 3. accreditations · then call / ask.

**Interaction** (`interactive.md` §1–§2):
- *3D or scroll-scrubbed motion as asked* — value test: **Swap**: replace it with a still or nothing; the visitor loses nothing but "the wow" — **fail**. **Result**: they leave with nothing they did not have — **fail**. Killed at the first two questions. Also: 71% phones, no product to turn round, `motion.md` §9 lists "a scroll-scrubbed camera flight" as decoration. Written up for David as a decision he owns, with costs (A8).
- *The fee finder* — value test: **Swap**: the static schedule (which stays on `/fees/`, printable and complete); the visitor loses the step of mapping themselves to a band, and the hand-over of their answers into the enquiry form (three of ten fields filled). **Result**: their own fee, and a request half-written. **First ten seconds**: two native selects in a sentence with a real default (sole trader, under £50k → £45 a month). **Tenth time**: instant; no animation over 240 ms. **Cost**: ≈ 3 KB of JavaScript, no library. **Evidence plan**: `/fees/` exit rate and enquiries carrying a business type that matches the finder's choice. **Level 3** (marketing ceiling: one level-3 element per page). Fidelity: plain — type and colour only. Renderer: DOM and CSS.

**Key screen:** the home page's first viewport and the chapter after it, at 390 × 844 first (71% phones) and 1440. Review result: see "Key screen review" at the end.

**First viewport, exactly** (390 × 844): sticky navy header 64 px — the reversed lockup left (gold keyline on the navy square, white name; links home), "Call" and "Menu" right (Call outlined while the hero's own action is on screen, gold once it has scrolled away). Below, the navy field fills the rest of the screen: a 15 px line "Chartered accountants in Kelham Island, Sheffield, since 1988"; the `h1` "Fixed fees, on the table." in Literata 600 at 40 px; the finder sentence at 22 px — "I'm *a sole trader* with a turnover of *under £50k*" — the two selects drawn as underlined gold-edged blanks; the price "£45" at 96 px with "a month + VAT" beside it and "Sole trader accounts and tax return" under it; a primary button "Ask about this fee" (gold) and a quiet link "See every fee". The phone number is in the header. At 1440 × 900: the navy header (76 px) carries the full reversed lockup, the five links and "Call 0114 270 0418", and runs straight into the navy field — one field from the top edge (the key-screen review moved it there); the field is a 12-column grid — the `h1` spans columns 1–7 at 72 px; the finder sentence runs below it at 36 px across columns 1–8; the price block sits in columns 1–6 under it at 160 px, with the includes list in columns 8–12 aligned to the price's baseline. No photograph, no panel right of the headline: one column of statement, choice and answer.

**Breaks if:**
1. A price, band or date appears that is not in `data/fees.json` (or differs from it).
2. On a phone, calling takes more than one tap from any scroll position.
3. Anything moves that does not explain a change.

**Memory test:** "The Kelham Island accountants who just show you the price — £45 a month for a sole trader — big, on a navy page; I could ring them from the top of the screen."

**Convergence checks:**
- **Similar-brief test** — the same plan for another practice would be "show your fees"; but this one's form comes from its own assets: the lettermark's navy square as the field, its gold as the only action colour, its serif wordmark as the price face, its own fee bands and deadlines. A practice with no published fees cannot have this page.
- **Category test** — the category guess is navy + gold + stock photo + "Welcome"; "avoid the obvious" would be dark fintech with gradients. This is neither: the brand's own colours, kept because they are the lettermark (the archetype rule, `art-direction.md` §5), with distance taken from composition and content — the price as the hero.
- **Second-order test** — no choice is justified only as the opposite of a default: committed navy because the mark *is* a navy field; the price large because it is task 1; no photography because none exists and the hosts are refused, not "to be different".
- **Ledger** — the direction in one sentence: *committed navy fields from the lettermark with white reading chapters; Literata 600 display with no italic or accented word, prices and dates as the image; no label device (sentence case); navy as the "dark chapter"; gold from the mark as the only action colour.* Against the house recipe (paper, italic serif, mono eyebrows, ink chapters, warm accent): no paper, no italic, no eyebrows or mono, the dark chapters are the brand's navy rather than near-black ink. Against the rows: five of the last five blind-test outputs chose **Restrained, a white ground and a blue-family action colour**; this one chooses **Committed**, and its action colour is **gold**, not blue. It shares the blue-family *brand* (navy) with four of them and a gold/saffron secondary with three (Azul's ochre corner, Sanad's saffron keystone, Harbourside's crest-gold focus); the reason is this brand's own: navy and gold *are* the 1988 lettermark. The ledger's recurring hero forms (split copy/panel, full-bleed photo wall, no hero) are not used: the hero is one typographic column with a working control. The blur sheet beside the ledger captures is at `captures/review/ledger-blur.png` (key screen review).
- **Seam test** — not applicable (no product behind the site).

## Typography

- **Type set (expressive, all routes):** body 18 px (17 px under 400 px wide), line-height 1.55; ratio ≈ 1.333 fluid. Steps, each used: 14 (legal line, footer meta — never under 14), 15 (small print, hints), 17/18 (body), 20 (lead, list titles), 24 (h3, finder on phones), 30 (h2 on phones), 40 (h2 desktop / h1 on phones), 56 (h1 inner pages desktop), 72 (home h1 desktop), and the figure sizes 96 (price, phones) and 160 (price, desktop). Fluid clamps keep max ≤ 2.5 × min.
- **Display: Literata 600** (optical-size axis 7–72 loaded, so large sizes get the display cut). Why: the wordmark is a Georgia transitional serif in caps; Literata is a contemporary serif with the same sturdy, screen-born construction, a large x-height (0.51) and tabular lining figures (`tnum`) — the prices and dates are set in it, so its figures carry the concept. Tracking −0.01 em at 40 px and above; line-height 1.05–1.1. No italic anywhere.
- **Text / UI: Schibsted Grotesk 400/500/700** (variable wght), x-height 0.527 — concord with Literata's 0.51; classification contrast serif/grotesk. Tabular figures with `tnum` for every price and date in running text and tables. Measure 62ch.
- **Monospace: none.** The audience does not read code. `code, kbd, samp, pre { font-family: inherit }` in the base layer.
- **Caps/tracked-label device: none.** Sentence case everywhere; the logo's own tracked sub-line is the only tracked capitals, inside the mark.
- Scripts: Latin only; English.
- Licence and loading: both SIL OFL 1.1 (Google Fonts), self-hosted WOFF2 from the files Google serves (latin subset): Literata 49 KB, Schibsted Grotesk 47 KB — 96 KB in two files. **Not preloaded**: measured with `perf.mjs` (slow 4G, 4× CPU), preloading both delayed first paint (LCP 1148 ms → 776 ms without preloads) because the fonts competed with the stylesheet; `font-display: swap` with metric-matched fallbacks (`fonts.mjs --fallback georgia:700` / `arial`) keeps the swap shift at CLS ≤ 0.017. Neither face is on the saturated list. The logo outlines use Gelasio (OFL) at build time only; it is not served.

## Colour

**Strategy: Committed.** The lettermark is a navy field with gold letters; the site takes that literally: navy carries 35–45% of every page (the hero "table", the fee finder band on `/fees/`, the close, the footer), white carries the reading chapters, and gold is used only as the action fill. The ledger's last five outputs were all Restrained; this brand is a field of colour, so it gets one.

**Harmony and sources:** navy dominates (from the square and the name), white supports, gold acts (from the H&P letters). Slate `#6b7a8c` from the sub-line becomes the neutral tint hue. Status red only for errors.

**Use scene:** light — a phone in daylight, in an office or on a sofa, often in a hurry. No dark theme (the site has none; the use scene does not ask for one).

**Scales:** built with `palette.mjs --brand #1f3a5f` and `--brand #c9a227` (OKLCH, hue fixed, chroma shaped); neutrals tinted with the navy hue at chroma ≤ 0.009.

**Contrast table** (`contrast.mjs`, measured on the real grounds):

| Token (role) | Value | Use | Pair → WCAG / APCA |
| --- | --- | --- | --- |
| `--paper` (surface) | `#ffffff` | reading chapters, form | — |
| `--mist` (surface-alt) | `#f3f7fd` | alternate chapter, input ground in hover, selected radio ground | — |
| `--navy` (brand field) | `#1f3a5f` | hero, close, footer, selected chip | white on it 11.48:1 / −100 |
| `--navy-deep` (field hover, footer base) | `#122d51` | footer, button hover on navy | white 13.4:1 |
| `--ink` (text-strong) | `#15253b` | body text and headings on paper | on paper 15.44:1 / 102; on mist 14.6:1 |
| `--ink-2` (text) | `#4a5d78` | secondary text, hints | on paper 6.71:1 / 83; on mist 6.24:1 / 78 |
| `--on-navy` / `--on-navy-2` | `#ffffff` / `#c9d9ef` | text on navy / secondary text on navy | 11.48:1 / 8.01:1 (−75) |
| `--gold` (action fill) | `#c9a227` | primary buttons, the finder's blanks on navy | ink on gold 6.38:1 / 53; gold on navy 4.75:1 (non-text ≥ 3:1) |
| `--gold-hover` | `#d8b443` | primary hover (lighter, so ink stays readable) | ink on it 7.6:1 |
| `--gold-edge` (action border, accent text on paper) | `#81681c` | 1 px border that gives the gold button a 3:1 edge on white; never body text | on paper 5.34:1 |
| `--line` (border, decorative) | `#c9d9ef` | rules between list items, table rows | decorative only |
| `--field` (input border) | `#4a5d78` | input, select, radio and checkbox borders | on paper 6.71:1 (≥ 3:1) |
| `--danger` | `#b42318` | error text, error border, error summary edge | on paper 6.57:1 / 81 |
| `--focus` on paper / on navy | `#1f3a5f` / `#ffffff` | 3 px outline, 2 px offset | navy on white 11.48:1; white on navy 11.48:1; both ≥ 3:1 against the gold button they ring (navy vs gold 4.75:1; white vs gold 2.25:1 → on navy fields the ring around a gold button sits outside a 2 px navy gap, so it is measured against navy) |
| selected (finder option, radio) | `--navy` fill, white text | — | 11.48:1 |

## Layout and space

- Container 1200 px max with 24 px gutters (16 px under 400 px); 12-column grid on desktop, 4 on phones.
- Spacing scale (4-based): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Chapters: 64 px (phone) / 96–128 px (desktop) vertical; within a chapter 24–48; inside components 8–16.
- Chapters are told apart by ground (navy ↔ white ↔ mist) and by scale, never by boxes. **Cards exist for one object only: a fee package** (an independent object with its own action). Services and deadlines are ruled lists; the team is a two-column statement.
- The lettermark's square is the one graphic motif: a 12 px navy square as list marker and the "you are here" marker on the tax-year line. Nothing else decorative.

## Imagery and graphics

Photography — **none, argued:** the practice's world is photographable (the office, the partners, Kelham Island), but the repo has no photographs, the client cannot be asked, and every image host is refused in this environment. Stock photography of "accountants" would be the category template. The design does not need photographs: its visual events are the figures at image scale (prices, dates, the phone number), the navy field and the tax-year line. Asked of David in the hand-off report: portraits of the two partners and one photograph of the office, for the team chapter and the close.

Icons: none except a phone glyph in the Call button and a menu glyph, drawn inline as SVG in `currentColor`, each beside its word.

Social image: `assets/og.png`, rendered from the home hero (navy field, mark, "Fixed fees, on the table.").

## Motion

Expressive surface, productive controls. Tokens from `motion.md` §4 (`--dur-micro` 100, `--dur-small` 150, `--dur-medium` 240, `--ease-out`). Three moves, each with a job; the page is finished without any of them:
1. **The fee changes** (state change / causality): when either finder answer changes, the figure and its line cross-fade with a 6 px rise, 240 ms ease-out. Reduced: instant swap.
2. **The tax year fills to today** (explanation): on browsers with scroll-driven animations, the tax-year line on the deadlines chapter draws from 6 April to today as the block scrolls up, position-mapped and reversible. Its range runs from the block being fully on screen (`entry 100%`) to the block reaching mid-screen (`cover 50%`) on a named view timeline of the whole block — a deliberate departure from "end at entry 100%": the first build used the 8 px bar as its own timeline and finished drawing within 8 px of scroll (`qa/probe-yearfill.txt`). Content follows the block on every page that has it, so the range always completes. Reduced, or unsupported: drawn to today from the start (static).
3. **The phone menu opens** (orientation): the menu panel slides 8 px and fades in, 240 ms. Reduced: fade only.

Never moves: the price on load, any image, any heading, scroll position (no smooth scroll except anchor jumps, off under reduced motion), anything at rest.

| id | trigger | on | target | properties | duration | easing | reduced |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fee-change | key:ArrowDown | #ff-turnover | .ff-result | opacity, transform | medium | out | instant |
| button-press | press | .hero .btn-primary | .hero .btn-primary | transform | micro | out | keep |

(`year-fill` and `menu-open` are checked on their own page and device: `qa/motion-deadlines.json` and `qa/motion-menu-phone.json`.)

## Interaction and performance

- Primary action per key screen: home — "Ask about this fee" (gold, under the price); fees — "Ask about this fee" per package; contact — "Send enquiry"; header — "Call" (gold on phones, where it is the primary; on desktop the number as a quiet header link while the hero's button is on screen).
- Components and states: button (primary gold, secondary outline-on-navy/paper, link) — rest, hover, focus-visible, pressed, disabled-never; select (rest, hover, focus, invalid); radio chips (rest, hover, focus, checked, invalid); text input and textarea (rest, hover, focus, invalid, filled); error summary; fee finder result (default, changed, "quoted personally" variant, no-JS variant); menu (closed, open); fee package (default, highlighted match).
- **Forms:** all ten fields kept, in their order, with their names and values; labels above; three short-option questions become native radio groups (business type, preferred contact, how heard) and two stay selects (turnover, service — five options each, kept as selects so the finder's prefill and the old values stay identical; radios considered and rejected for turnover because "Over £500k"/"Under £50k" read well in a select); `type=email`, `type=tel`, `autocomplete` (`name`, `email`, `tel`, `organization`); validate on submit, then live as each field is fixed; error summary at three or more errors, else focus the first invalid field; required by default, with "(optional)" on the one optional field (A3); "Send enquiry" button; the answers carried in from the finder pre-select business type, turnover and service.
- Targets: 48 px controls on phones, 44 px minimum; nav and footer links 44 px tall on coarse pointers; Call reachable from the sticky header.
- Performance budget: LCP element is the home `h1` (text — no image in the first viewport); two font files ≤ 100 KB, not preloaded (measured, above); one CSS file; JS on pages that need it only (≈ 20 KB unminified on home and fees, 9 KB on contact, 3 KB elsewhere), deferred or module; no third parties. Measured: phone LCP 752–816 ms (old build 428–448 ms), CLS ≤ 0.001, TBT 0 (`qa/perf-report.md`).

## Accessibility

Filled before any code (`accessibility.md` §2). WCAG 2.2 AA; aiming for 2.4.13 and 2.3.3.

- **Contrast table:** above (Colour). Non-text: input borders `#4a5d78` on white 6.71:1; radio outline the same; the gold button's 1 px `#81681c` edge on white 5.34:1, and the gold fill against navy 4.75:1; the focus ring navy on paper 11.48:1, white on navy 11.48:1; the finder's blanks on navy: a 2 px gold underline (4.75:1).
- **Focus token:** `outline: 3px solid var(--focus); outline-offset: 2px`; `--focus` navy on paper and mist, white on navy fields; `Highlight` in forced colours. Sticky header height (64 px phone / 76 px desktop) → `scroll-padding-top: calc(var(--header-h) + 16px)`.
- **Targets:** 24 px floor everywhere; 44 px on coarse pointers (all buttons, nav links, radio rows, selects 48 px). Radios: the native 22 px input sits inside a 48 px full-width label row, which is the target (`audit.mjs` counts the input).
- **320 px state:** header = mark + Call + Menu (the wordmark sub-line drops to the lettermark lockup if needed); finder sentence wraps per clause; price at 72 px; fee packages stack; the bands table inside each package is a two-column list that fits 288 px; the form is single-column; no horizontal scroll anywhere.
- **Colour independence:** errors: icon + "Error:" + text + border; required/optional in words; the matched fee package carries the words "Your fee" as well as the navy edge; links in running text underlined; the current nav item has `aria-current` and an underline.
- **Motion:** fee-change → instant swap; year-fill → static at today; menu-open → fade; nothing auto-moves or loops; no smooth scroll under reduce.
- **Forced colours:** buttons and inputs carry real borders (transparent where invisible); focus is an outline; icons in `currentColor`; the matched package keeps its "Your fee" word; the selected radio uses the native control.
- **Component map:** nav → `nav > ul > a` with `aria-current="page"`; phone menu → disclosure `button[aria-expanded][aria-controls]` + list of links (Esc closes, focus returns); finder → two native `<select>` with labels, result in a `role="status"` region present at load; fee schedule → headings + `dl`/table per package (`<table>` with `<caption>` and `th scope` for bands); deadlines → `ol` of dates with `<time>`; form → native inputs, `fieldset`/`legend` for radio groups, `<button type="submit">`; error summary → `div` with heading, focused, `role="alert"` content.
- **Forms:** GOV.UK error pattern; "(optional)" on the one optional field, `required` on the rest; autocomplete map: name → `name`, email → `email`, phone → `tel`, business_name → `organization`; message textarea no autocomplete. Paste allowed.
- **Announcements:** finder result → `role="status"` (polite), the price line only; form errors → focus moves (summary or field); no toasts.
- **Data:** no charts. The tax-year line is decorative support for dates that are listed as text; `aria-hidden` with the dates in an `ol`.
- **Preserved features:** `lang="en"`; real text; `tel:` link; a form that posts without JavaScript (validation then falls back to native `required`).

## Page narrative (home)

Headline test: *"Fixed fees, on the table."* with, directly above it, "Chartered accountants in Kelham Island, Sheffield, since 1988" — a stranger reading the two knows what is sold, where, and the hook (you can see the price). The h1 alone says the differentiator; the line above it says the category, in the visitor's search words ("accountants … Sheffield").

1. **The table (hero, navy):** the finder and your fee — the answer to task 1, with the call/ask actions. A working control, not a picture of one.
2. **What we do (white):** five services as a ruled list — name, who it's for, what it covers, the fee "from" where one exists — because the content is parallel and an index; not cards.
3. **Dates to know (mist):** the three deadlines from `fees.json` as large dates with what each is for, the next one marked, and the tax-year line. Changes composition because the content changes kind (a sequence in time).
4. **Who you'll deal with (white):** the two partners, set as a two-column statement — name and letters large, what each looks after — plus the team of seven, the accreditations as plain facts, and the address. Proof that exists, compact.
5. **Close (navy):** "Ring us, or tell us what you need" — the phone number at display size, the "Send an enquiry" action, the address and parking line. Then the footer (legal line verbatim).

## Keep / replace / remove / create

**Keep:** the lettermark and wordmark (repaired rendering; reversed variants for the navy header and footer); navy and gold as the hue family; every fact, price, date and legal line; routes; form fields, names, order and values; analytics calls and the `hpTrack` queue; the data files and their runtime rendering.

**Replace:** typefaces (Georgia/Arial → Literata/Schibsted Grotesk); palette strategy and roles (grey page, charcoal footer, gold links → committed navy fields, gold action); hero (slider box → fee finder); header (top bar + nav → sticky header with Call and a phone menu); footer; section grammar (boxed column and placeholder cards → full-width chapters, ruled lists); the fees page (PDF link → the schedule); the form's presentation (table → labelled single column, radios, error summary); the about paragraph (→ the partners and facts); accreditation chips (→ plain text facts); favicon and social image (from the mark).

**Remove:** "Latest News: Budget 2015" and its `#` link; the broken PDF link; grey image placeholders; fake slider dots; "Welcome to"; "© 2014" (→ the current year); `alert()` validation; "SUBMIT"; asterisks.

**Create:** the fee finder; the fee schedule renderer; the deadlines chapter with the tax-year line; the phone menu; the error summary pattern; the outlined logo (A10); a print stylesheet for `/fees/`; the social image; `qa/` probes and state files.

Keep (3 items) is shorter than replace (11) + create (9).

## Secondary pages

- **Fees:** navy band with the finder at the top (the same component; the matching package highlighted with "Your fee"), then the schedule as four package cards (the only cards on the site), the VAT note and "Fees agreed 6 April 2026" from the file, then deadlines, then the close. Prints cleanly on A4 (header, menu and finder hidden; schedule and contact details kept).
- **Services:** an inner-page header (navy, h1 56 px) and the services as a ruled list rendered from `data/services.json` into `#services`, each with its matching fee line and "Ask about this" link.
- **Team:** inner header; the partners statement; the team line; accreditations and the legal line in words.
- **Contact:** inner header with the phone number at display size; the form on white; where we are.

## Key screen review (Phase 5 rollout gate)

Reviewed by the builder — this harness has no subagent tool, so no fresh-context reviewer was available at this gate (see `CRITIQUE.md` for the blind-as-possible procedure used at Phase 7). Captures: `captures/key/home-1440-key3-fold.png`, `captures/key/home-390-key3-fold.png`, full pages beside them; blur sheets `captures/review/ledger-blur.png` (new, old, four ledger captures) and `captures/review/key-390-blur.png`.

**Round 1 → direction changed here.** The first build (`captures/key/home-1440-key2-fold.png`) kept a white header over a navy hero. Blurred beside the old site it read as the old composition stretched to full width: white band, then a navy box. That is the old hero's massing surviving — a refresh signal on one of the five first-notice things. Fix (a direction change, not a screen tweak): the navy field now starts at the top edge — the header is navy on every page with a reversed lockup (gold keyline on the square, white name) — so the first viewport is one navy field holding a statement, a choice and an answer. Also: the price and h1 scaled up on desktop (h1 72 → 88 px), the finder sentence set on one line at desktop, the full lockup with its sub-line used at desktop widths, fee lines no longer set with tabular figures (they spaced the colons apart), "Ask about …" labels written per service.

**What the blurred sheet communicates (written before re-reading the direction):** a deep blue screen with a big serif statement, one very large number and one gold button; the old site is a grey page with a small blue box and three grey placeholders; the ledger captures are all white pages (a split with a navy panel, a statement over a tile wall, a plain service page, a dashboard). The blur reproduces the content priority: statement → the figure → the action.

| # | Check (key-screen subset) | Answer | Evidence |
| --- | --- | --- | --- |
| 1 | Surface appropriate to its category | yes | `home-390-key3-fold.png`: marketing type scale (40/88 px display, 18 px body), one idea per viewport, motion limited to the fee change |
| 3 | Swap test — would it fit the nearest competitor? | no (passes) | the hero *is* this practice's fee schedule and lettermark; a competitor without published fixed fees cannot use the page; the copy names Kelham Island and 1988 |
| 4 | Reading as generated? | no (passes), with one watch item | no eyebrows, no mono, no italic accent, no cards in the hero, no gradient; `audit.mjs` signals checked at Phase 6. Watch: navy + gold is the accountancy category's palette — kept as the 1988 lettermark's own colours, distance taken from composition and content (DESIGN.md "Category test") |
| 6 | First viewport memorable without the copy; headline test; action continues the sentence | yes | the £45 at image scale on a full navy field is the memory; h1 + the line above it pass the headline test; "Ask about this fee" continues "your fee is £45" |
| 7 | Typography distinctive where it should be, quiet elsewhere; real scale | yes | Literata 600 only for the statement, figure, dates and names; Schibsted for everything read; sizes 15/18/20/24/30–40/40–88/88–160 all used on this page |
| 15 | One primary action per view, one colour everywhere | yes | `home-390-key3-fold.png`: only "Ask about this fee" is gold; the header Call is outlined while it is on screen (`site.js` swaps it to gold once the hero action scrolls away) |
| 17 | Colour budget; contrast; no meaning by colour alone | yes (measured in Phase 6) | Committed: navy ≈ 45% of the home page by height (hero, close, footer); pairs in the contrast table; the finder's blanks carry a chevron and an underline, not colour alone |

Result: passes after the round-1 direction change. Rolled out to the other pages on this system.


## Verification notes (Phase 6–8)

**Derived values** (computed in the browser from the data files and the visitor's clock, never typed): the deadline years and "in N days" (`fees-render.mjs` `upcoming()`: the next occurrence of each `deadlines[].date` on or after today); the tax-year label and positions (6 April to 5 April); the "from" figures on the services list (the lowest priced band of each package). Declared to `parity.mjs` with `--derived`.

**Findings dismissed, with evidence:**
- `parity.mjs` "£8 has no source": `data/fees.json` payroll band `{"turnover":"Per employee","price":8,"per":"month"}`; the script only matches bare numbers of two or more digits.
- `audit.mjs` "big-number claims 31, 31, 31": the three deadline days from `data/fees.json`.
- `audit.mjs` "controls under 44 px": radio inputs (22 px) inside 48 px label rows that are the target.
- `audit.mjs` "Phone [thumb]: primary action pinned in the top third (Call)": the phone number has been at the top of every page since 2014 and is the most clicked element on phones; it stays where people have learned to find it, and is repeated in flow in every closing chapter.
- `sweep.mjs` "text over text" on the price/its line and the deadline day/month: font content-area boxes overlapping under tight display leading; no ink overlaps at any width (`captures/sweep/home-crops/01-overlap-768.png`, `02-overlap-768.png`).
- `sweep.mjs` "measure 99 characters" on the finder sentence: the selects' option lists are counted as text.
- `sweep.mjs` "fold" at 320–352 px: the price is in the first screen; "Ask about this fee" starts just below it, and Call is in the header.
- `stress.mjs` numbers, pseudo-localisation and RTL findings: English-only site; prices are two or three digits from the data file; long-word overflow was fixed anyway (`overflow-wrap: anywhere`).
- `motion.mjs` "year-fill changed in one frame": its scroll trigger jumps; the probe scrolling in steps shows the fill mapped to position and reversible, and static under reduced motion (`qa/probe-yearfill.txt`).
- `states.mjs` axe failures on `contact-sent`: they were on the test's own mocked thank-you page (no `lang`); the mock was made valid and the states re-run clean.
