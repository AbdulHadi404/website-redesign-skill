# Anti-patterns — what makes a site or product read as generated

Read before finalising the direction (Phase 3) and again before building (Phase 5). Each item is common because it is easy; each tells a visitor that nobody designed this. `scripts/audit.mjs` measures many of them — its "generic-look signals" point back to the entries here.

Three kinds of entry:

- **Hard bans** — never, whatever the brief says.
- **Purpose-gated techniques** — allowed only with a one-line reason in `DESIGN.md` that points at *this* company or *this* task ("a real sequence", "the brand's own gradient"). "It looks premium" and "it avoids the obvious" are not reasons.
- **Tells** — patterns that are not wrong in themselves but, stacked together, are the generated look. Each one present needs to have earned its place.

## The refresh disguised as a redesign

For expressive surfaces under a redesign brief (`framing.md`). The most important failure there, because it feels like success from the inside: the display face, palette and hero composition survive "because they work"; new components arrive while nav, footer and section grammar stay the same; the before/after captures look like one site after a good week of polish. The test: name the five things a stranger notices first on the old site; if the new site keeps three, it is a refresh. Fix it at the direction stage. (On a productive surface the opposite is true: keeping what users have learned is a feature, see `framing.md`.)

## The model's prior (and this skill's house style)

Language models sample the centre of the design they have seen. The centre moved once already: first-generation defaults (Inter, Tailwind `indigo-500`, purple-to-blue gradients, the shadcn card kit) drew so much criticism that "tasteful" alternatives were recommended — and those recommendations became the second-generation default. Anthropic's own frontend-design skill (revised 2026-09) now lists where generated design lands; paraphrased:

1. **Warm paper**: a cream ground near `#F4F1EA`, a high-contrast serif display, a terracotta or clay accent near `#D97757`, espresso text.
2. **Dark and acid**: near-black with a single acid-green or vermilion accent and glowing edges.
3. **Broadsheet**: hairline rules, zero radius, dense newspaper columns.
4. **The SaaS card kit**: identical rounded cards, the same soft grey shadow (`rgba(0,0,0,.1)`) under everything, tinted icon tiles.
5. **Template chrome whatever the subject**: a tracked all-caps eyebrow above every heading; meta strings joined with middle dots ("A · B · C") as decoration in eyebrows, bylines and footers — not the brand's own lockup ("سند · Sanad"), and not product specifications or delivery terms, where a separator is the plain way to write "13 × 13 cm · Gloss"; labels built as "WORD — fragment"; tinted near-black standing in for black; a monospace face for small data labels; "→" appended to links and buttons; one word of a headline accented in italic, bold or colour.

**This skill's own former house style is clusters 1 + 3 + 5**: bone or paper surfaces, a serif display with an italic emphasised phrase, monospace uppercase eyebrows, near-black "ink" chapters, one warm accent, hairline rules. Each is a fine choice once; together they are a template, recognised on sight (a 2026 study of 3.2 M Reddit posts found "cream + serif + sage" the most-named new tell). Claude specifically pulls warm, bookish, craft, family and "premium" subjects toward cream, italic serif and lamplight: when a direction says paper, ivory or cream and the logo does not, treat that palette as already spent. In app UI the equivalent is **the default shadcn look** — the stock style with one accent colour changed; shadcn's author wrote that the defaults made "all apps… look the same".

Symptoms: the palette was chosen from taste rather than sampled from the logo; a serif display "because it is distinctive" (distinctive from the old site, not from the last three outputs); mono uppercase labels, or a mono face for "just the values" (passwords, IDs, env names, `[placeholders]`, `Ctrl K` hints), on a company that has nothing to do with code — on the marketing site and inside the product alike (commitment 5 in `SKILL.md`); a viewport-wide wordmark in the footer or behind the hero, which is this skill's habit rather than the brand's (see "Composition"); a concept line about the company with nothing on the page derived from its assets.

**Tests, written into `DESIGN.md` before code:**

- **Similar-brief test:** write one line describing what this plan would look like for a *different* company in the same category. If it is the same plan, it is the prior.
- **Category test:** could someone guess this direction from the category alone — or from the category plus "avoid the obvious"? If yes, rework until neither answer is obvious.
- **Second-order test:** is any choice here justified only by being the opposite of a default ("not purple", "not Inter")? A reason must point at the company.
- **Ledger test:** compare the one-sentence direction with the rows in `ledger.md`, and with any other site this user built with this skill. If the sentence fits both, change the *family* (surfaces, display voice, label device, imagery strategy), not the values.

**Faces.** `scripts/lib/saturated-fonts.json` holds a dated list of faces generated sites reach for (first wave: Inter, Roboto, Poppins, Montserrat…; second wave: Fraunces, Instrument Serif, Playfair, Space Grotesk, Geist, DM Sans, Outfit, Plus Jakarta…). A face on it needs a documented reason: a brand asset, or a need no other face meets (tabular figures, a script, a width axis) — a subject association ("books want a serif", "tech wants mono") is never that reason. Refresh the list; never replace it with a list of "good" fonts — that is how the second wave happened. `audit.mjs` reports saturated faces carrying the page.

## Hard bans

- **Invented proof**: fabricated metrics, customers, logos, testimonials, reviews, ratings, "Trusted by 10,000+ teams", live-looking data that is not live. Sample data in product fragments must read as obviously illustrative. `parity.mjs` checks new claims against the old site and the repo.
- **Content that starts hidden and needs a transition to appear** (`.reveal { opacity: 0 }` + an observer). Every path where the transition does not run — no JavaScript, a background tab, reduced motion, a headless capture — leaves a hole. The page is finished by default; a script-added root class hides things only so they can arrive (`implementation.md`). `audit.mjs` runs a no-JS and a reduced-motion render to catch it.
- **Animating a photograph in** (wipes, clip-path reveals on `<img>`): when it fails it degrades to "missing image", not "no animation".
- **Status or emphasis carried by a coloured stripe alone** (the accent-stripe card: a coloured left or top border as the only signal of status, category or "most popular") — encode status as a word, an icon with a label, or a position. A stripe *beside* a message that states the problem in words (GOV.UK's error group) is information, not this.
- **Meaning by colour alone** anywhere (status dots, gains and losses, required fields).
- **Emoji or Unicode glyphs as UI icons** (⚡🔒🚀 feature icons, ✨ badges, ✓ bullets): they render differently on every platform and "✨" has no shared meaning.
- **Placeholder images or placeholder hosts shipped** (`placehold.co`, `picsum`, `via.placeholder.com`, "image goes here").
- **A chart presented as data that has no data**: bars and sparklines without axes, values, units or period.
- **Copy on the busy part of a photograph**; grey text on a coloured ground (use the same hue at low chroma).
- **Dark patterns**: confirmshaming, fake urgency or scarcity, pre-ticked consent, hidden costs, roach motels (`ui-ux.md` §10).

- **Removing the focus ring** (`outline: none`, `*:focus { outline: 0 }`) without an equally visible replacement — or replacing it with a faint box-shadow, which forced colours deletes.
- **Placeholder as the only label**; a clickable `div`, `span` or `<a>` without `href` standing in for a button; `role="menu"` on site navigation; custom checkboxes drawn with backgrounds and shadows; information that lives only in a hover tooltip; `user-scalable=no` or `maximum-scale=1`; fixed-height text cards that clip when text grows. `a11y.mjs` catches all of these except the tooltip, which needs a look.
- **"Accessibility overlay" widgets** offered as the fix.

## Purpose-gated techniques (allowed with a written reason)

| Technique | Allowed when | Otherwise |
| --- | --- | --- |
| Eyebrow above a heading (tracked caps or small label) | it carries information the heading does not; at most one per three sections | front-load the heading instead |
| Numbered markers (01, 02, 03) | the content really is a sequence | a list or plain headings |
| Monospace | the product's users read code (developer or infrastructure tools, code samples) — `SKILL.md` commitment 5 | the UI face at 500 with `tabular-nums` for IDs, passwords, env names, `[placeholders]`, key hints and timers; a copy button for copied values. The browser's default monospace on `code`/`kbd`/`samp`/`pre` counts: point those elements and the framework's mono token at the UI face |
| Tracked small capitals as a label system | one device per page, in a face that is not condensed and hard | sentence case in the text face at 600 |
| Glass / `backdrop-filter` | over a calm ground, with a scrim, on at most one surface | a solid surface |
| Gradient | one purposeful gradient from the brand's own adjacent hues | solid fills |
| Grain, noise, texture, stripes, grid-paper backgrounds | traceable to the business's material (paper fibre, a map grid, a blueprint) | nothing |
| An accented word in a headline (italic, colour, face switch) | the brand's voice genuinely uses it, once | weight, size or plain words |
| Serif display with italic emphasis | the wordmark or brand family is built that way | a face derived from the wordmark's construction |
| Cream / paper ground | the logo or brand family uses it | a ground derived from the brand's colours |
| Dark theme | the use scene is dark (night use, media, long screen sessions) — one sentence of physical scene | light, or both themes |
| Pill shapes | small controls, tags, filters | a radius scale by role |
| Cards | independent, actionable objects (a product, a document, a person) | lists, tables, panels divided by space |
| Hover lift / scale | objects that can be picked up or dragged; `@media (hover: hover)` only | a contrast change |
| Big numbers | real, sourced, and the most useful thing to say | words |
| Carousel | ≤ 5 frames, manual, with visible controls, and the content also reachable elsewhere | a static layout |
| Library illustration | restyled into one consistent line, palette and radius | drawn SVG from the brand's geometry, photography or none |
| 3D / WebGL | the object *is* the product, or the data is spatial; not on the marketing pages around a live 3D product, which use stills rendered by the product instead (`motion.md` §9) | a photograph or a diagram |
| Scroll-jacking / smooth-scroll libraries | never on content pages, and never on a site that frames a signature product; elsewhere only inside a contained, skippable story | native scroll |

## Composition

- Hero = headline + paragraph + two pill buttons + a dashboard screenshot (or a glowing blob), centred; a pill badge ("✨ New …") above the headline; three or more calls to action in the hero; a hero that overflows the first viewport because the sticky header was not counted against it (`calc(100svh - header)`).
- **Two primary buttons in one viewport.** A persistent header CTA in the action colour beside the hero's primary action gives the first screen two "do this" signals, often in different words. While the hero action is on screen, the header CTA is secondary (outline or quiet); it takes the primary style only once the hero action has scrolled away, or on pages without one.
- **A hero object that falls below the first phone screen.** Headline, lede, two stacked buttons and a facts row can push the photograph or product past 844 px, so on a phone the "hero" is a paragraph. Order the hero head → object → body on narrow screens (grid areas on desktop), and check the 390 × 844 `-fold.png` from `capture.mjs`.
- Heading → paragraph → three cards, repeated down the page; identical rounded containers; icon grids (small icon, bold label, two lines, times six); three or more consecutive image-and-text splits (zigzag); fewer than four layout families in eight sections; sections that restate the same mood.
- Every heading the same size; every section the same width, padding and alignment; more space below a heading than above it.
- Cards used for content that is a list, a table, a diagram or a paragraph; cards inside cards.
- The stepper timeline (a thin rule with dots or icons — reads as a progress bar) and its opposite, the grid pretending to be a timeline. A timeline the user will call beautiful has a drawn path through nodes, milestone artwork on alternating sides, and a vertical rail on phones.
- A site made only of type, rules and data fragments: disciplined, but it reads as unfinished to a founder. Every expressive redesign needs a designed graphics layer in one line style — milestone art, spot illustrations, glyphs, a motif-based watermark family of small, complete ornaments, never a viewport-wide mark — in the brand's palette.
- A hero visual floating on a flat ground with only a watermark behind it: the hero object needs its own surface.
- **Massive branding as a flourish.** A viewport-wide wordmark or mark parked in the footer or behind the hero is this skill's own habit, not the brand's: it fills a band with nothing a visitor can use. The lockup appears once in the header and once at footer size; identity comes from the system, not from scale. A user asked for it to be removed on sight (`lessons.md` 2026-09-28, CleoHR website).
- Pill badges and chips as decoration ("NEW", "AI-POWERED", version labels in the hero); scroll cues ("Scroll to explore", bouncing chevrons); decorative locale, time or weather strips.

## Colour and surface

- Purple/violet/indigo or blue-to-purple gradients regardless of brand (Tailwind UI's `indigo-500` is the origin — its author apologised for it); cyan-on-dark.
- Glowing blobs, mesh gradients, aurora backgrounds and grain as a substitute for composition; zero-offset coloured glow shadows; a radial spotlight behind the hero.
- The ghost card: a 1 px border under a wide soft shadow. One radius and one shadow on everything.
- Gradient-filled text; gradient buttons as the primary action.
- Accent colour on every heading, icon and border until it means nothing; more than one full-bleed accent chapter per page, or the accent used as a field *and* as the button colour so the primary action changes colour to stay visible (`design-theory.md` B3).
- One background for the whole page, so it has no chapters (expressive surfaces).
- Light or dark chosen by category ("dark because it is a dev tool") instead of by use scene.

## Typography

- Keeping the existing families because they already load; a single grotesk at one weight; display type that is body type made bigger.
- Uppercase tracking on long text; centred paragraphs wider than 70 characters; headlines wrapped by chance rather than by intent (`text-wrap: balance`).
- **Tracked capitals in a condensed or geometric grotesk at 10–13 px as the label system** — eyebrows, field labels, chips, tabs, numerals. To a non-designer it reads as a terminal or a spec sheet even with no monospace loaded. One small-caps device per page at most; the rest sentence case in the text face.
- **The browser's default monospace on `kbd`/`code`** (a `Ctrl K` or `Esc` hint): it renders a code font nobody chose, and `audit.mjs` fails it like any other monospace (commitment 5 in `SKILL.md`).
- **Typesetting an object that looks like machine output** (an MRZ strip, a hash, a serial block) as "authenticity": it reads as code. Draw the object (a signature line, a seal) or leave it out.
- Display over ~6 rem on a long headline; tracking tighter than −0.04 em; `tracking-tighter` on 800+ weights as "the AI hero recipe"; italic descenders clipped by `line-height: 1` (italic words with g, j, p, q, y need ≥ 1.1 and room below).
- Em-dash saturation in the copy (eight or more at roughly one per 500 characters); Title Case Headings where the brand writes in sentence case.
- A face with no tabular figures used for prices, tables or dashboards (`fonts.mjs` tells you, per digit system; DM Sans, Poppins, Fraunces, Instrument Serif, Tajawal and Almarai have none, and most Arabic families — Plex Sans Arabic and Cairo included — have proportional Eastern Arabic digits).

## App-UI tells

Different from the landing-page list; they apply to product surfaces (`app-ui.md`):

- Marketing type in a work tool: page titles over 28 px (32 px only for a dashboard or home screen whose title stands alone); an eyebrow above and a lead below the title on every screen; a page header taller than ~120 px before the main object; a greeting — "Welcome back, Alex 👋" — in the title slot, where the title should name the place and scope (on a home screen a greeting may sit only as a secondary line under that title).
- Card soup: two-thirds of the text inside bordered, shadowed, rounded boxes, where real products use tables, lists and panels divided by space.
- A row of KPI tiles ("$45,231.89 · +20.1% from last month") with no target, no meaning and no link to the records.
- Decorative charts; boilerplate "AI insights".
- Low density: 16 px body, controls 40 px or taller and rows 48 px or taller, and 24 px card padding in a *desk* tool used all day; marketing chapter padding (100+ px) and leads between sections that push the main object below the fold. (Not in a field or frontline tool used on a phone with gloves — there generous targets and type are the requirement; `categories.md`. Chapter padding is wrong in any product.)
- A toast for every save (confirmation belongs at the trigger); modals for everything; every action a filled button; icon-only toolbars without labels, tooltips or shortcuts.
- Missing states: blank containers, eternal spinners, "No data".
- A gradient upsell card in the sidebar competing with the work.
- Selected items in the accent colour, competing with the primary action (selection takes a neutral fill).

Test: open the busiest screen at 1280 × 800 (`capture.mjs --widths 1280 --height 800`). If the first rows of its main table, board or form are not visible, or anything read daily is under 12 px (11 px only for a single uppercase word) or in tracked capitals other than one- or two-word column or group labels, the marketing site's expression has leaked in (next section).

## Marketing expression transplanted into a productive surface

The failure of "make the app match the site": the brand layer is right and the ergonomics are wrong. It photographs well and tires the people who use it all day. Eyebrows over every heading, long leads under every title and italic emphasis are marketing devices: in an app they are read once and then paid for on every screen. Symptoms, all seen in one redesign (`lessons.md` 2026-09-25, Brio3 app):

- **Display-size page titles on every screen** — a 40 px serif with an eyebrow index above it and a two-line lead below: 180 px of header before the first row of data, on every page, read once and scrolled past for ever. Page titles are 20–28 px (32 px only for a dashboard or home screen whose title stands alone), fixed, in one band with the actions (`app-ui.md` §3).
- **The site's small-caps label device as the product's label system** — 10–11 px tracked mono capitals on window bars, table heads, status words and stat labels. Caps are glanceable for a word or two in isolation (NN/g, "Typography for Glanceable Reading") and tiring down a column of statuses and sentences. Caps only for one- or two-word labels (short column heads, one-word nav-group labels) at 11–12 px (11 px only for a single word), tracked 0.05–0.06 em, in the UI face and never a condensed or hard grotesk; together they count as the page's one caps device. Statuses and anything scanned down a column stay in sentence case in the UI face.
- **Serif record names and serif numerals in lists and KPIs** — a display cut at 18–38 px where a 15–16 px semibold UI face scans faster, and many serif display faces have no tabular figures. The display face gets one job: page titles, plus the sign-in screen (`app-ui.md` §3).
- **The marketing hero photograph and its tagline on the sign-in screen.** The user is already a customer and sees this door every morning; it is a utility. Form first; brand from the mark and at most one abstract graphic derived from it (`app-ui.md` §12).
- **"Windows" and editorial frames copied as decoration** around every object, such as title bars that only repeat the title below them.
- **Marketing hairlines on controls.** A 12–24 % border reads as refined on a landing page and fails WCAG 1.4.11 (3:1) on an input. The accent used as a focus ring often fails 3:1 on a light ground too; the ring takes the darker accent-for-text token (`accessibility.md` §2).
- **Contrast checked on the main surface only.** Muted text that passes on the page ground fails on the hover row, the zebra stripe, the selected fill, the segmented control's track or the secondary panel. Measure every surface the text sits on, in every theme (`accessibility.md` §2).
- **Marketing whitespace.** The site's chapter padding and leads between sections carried into the app, so the main object starts below the fold on a laptop (numbers under "App-UI tells").

The test at the end of "App-UI tells" catches most of these.

## Product flows and configurators

- **Shrinking a signature experience to fit the website.** A feature the user described as the reason the business is remembered, built as a stepper with a thumbnail preview between two sections. If people are meant to *play* with it, it needs a full-screen shell, direct manipulation, real materials and light, and a quality bar proved with a prototype (`discovery.md` §5b, `ui-ux.md` §7b).

When the site takes orders, bookings or requests, these read as generated or simply fail:

- **The giant form.** Twenty dropdowns in a column, however well styled. Group decisions into a few chapters, ask what the customer knows ("how many people?") and infer the trade term.
- **Steps named after the data model.** "Toppings (1)", "Toppings (2)", "Step 7 of 11". Name steps after the customer's decisions, and keep them few enough that the step navigation fits one row on a phone.
- **Options as words.** A select of trade terms the customer cannot picture. Show each option as a picture of *that option on their thing*, with a text name and the trade term as a small hint.
- **A preview that only appears at the end.** The customer sees their object change while they choose. On phones the preview is pinned, within the sticky-UI budget (`accessibility.md` §2), and it is labelled honestly (a sketch is not a photo).
- **A price the business cannot honour.** Instant totals built from invented or placeholder numbers. Show an estimate only from the owner's numbers and only when every part is priced; otherwise say who will quote it and when.
- **Back loses the choice.** Going back, reloading or closing the tab must not reset the configuration. Keep it in the URL and in local storage, and audit mid-configuration states by seeding them with `--storage`.
- **Checkout for things that need a human.** Carts and card forms for work that must be confirmed, quoted or scheduled. Model the real workflow (request → quote → approval → deposit) and say what happens next at every step.

## Imagery and illustration

- Stock photography that could belong to any company (handshakes, laptops on white desks, smiling headsets); images used as texture rather than narrative (remove it — is information lost?).
- A library illustration scene used as-is (the "diverse flat people with laptops" system is recognised before the message); SVG "illustrations" assembled from primitive shapes to imitate pictures (authored geometry and real diagrams are fine; SVG pretending to be a photograph is not); faked physicality — CSS bevels, embossing, stamped metal, chalk.
- A raster buried under a near-opaque wash; images scaled or rotated on hover; a 1:1 crop on every image; labels or pills laid over photographs; fake photo credits.
- Hot-linked images from temporary URLs; AI-generated people, teams, customers or offices (dishonest, uncopyrightable, and subject to disclosure duties in the EU from August 2026).

## Custom artwork and diagrams

Illustration you draw yourself fails in ways stock imagery never does. Each reads as "unfinished" rather than "wrong", which is why it survives a full-page review — inspect element by element (`visual-qa.md`):

- **Debris**: marks, dots or lines floating outside the object they belong to.
- **Elements that break their container**: a glyph overflowing its circle, a chip hanging off a tile.
- **A label or badge covering data**: lay out the data first, then reserve the corner the label needs.
- **Diagram labels outside the viewBox**: size the viewBox around the labels; give labels a halo (`paint-order: stroke fill`).
- **Labels that collide** or are crossed by connectors: lay nodes out on a column or an arc.
- **Disconnected objects**: parts that should touch and do not.
- **Decoration that escapes its surface**: give the surface a real element with `overflow: hidden` and put the watermark inside it.
- **A watermark clipped to a meaningless wedge**: make it a small, complete ornament in a corner without copy, never a viewport-wide mark ("Composition").
- **Positioning inside a full-bleed container**: a ground bleeding with `left: -100vw; right: -100vw` moves its own edges 100vw away; anchor children back to the visible panel.

## Logos and marks

- A mark with an unintended silhouette (a dot in a round counter, two rounded lobes, a slot on a rounded rectangle): look at it as a flat shape at 24 px and name what a stranger sees first.
- A "concept" that has to be explained. A mark derived from a library icon (every library icon is shared by thousands of sites; Remix Icon's licence forbids it outright).
- A third-party logo recoloured, redrawn, animated or placed to imply endorsement.

## Copy

- "Powerful", "seamless", "next-generation", "revolutionise", "supercharge", "unlock", "elevate", "streamline", "empower", "all-in-one", "world-class", "cutting-edge".
- Launch-theatre phrases ("Built for the way you work", "Meet your new…", "The future of…"); slogan cadence repeated across sections ("X. No Y.", "Not a feature. A platform."); poetic or performative-craftsman section labels ("Field notes", "Quietly trusted by"); micro-meta sentences under headings.
- "Get started" and "Learn more" as the only calls to action; two labels for one intent on one page ("Get in touch" and "Let's talk"); a button label that wraps at desktop.
- Default AI pricing tiers ($9 / $19 / $29 / $49 / $99 / $199) and suspiciously round statistics; "Built with ♥ and ☕" footers.
- Paragraphs where a sentence would do; happy talk (sentences that say nothing — count them); headlines that could sit above any product. Product UI copy that sounds like an advert: if a sentence could appear in a homepage hero, rewrite it until it sounds like product UI.

## Motion

- Fade-and-slide-up on every section at the same delay; hover transitions on every card.
- Motion on things done tens or hundreds of times a day; any animation on keyboard-triggered actions.
- Bounce or elastic easing on UI; `ease-in` on entrances; entrances from `scale(0)` (start at 0.9–0.97 with opacity); `transition: all`.
- Parallax, particles, counters or looping animations that carry no meaning; animation that shifts layout or makes scrolling heavy; hover motion on touch devices.
- No reduced-motion handling — or reduced motion that deletes content instead of the movement.

## Process

- Judging the result from source without rendering it; testing one viewport; trusting a capture without a control (a known-good page through the same script).
- Reporting weaknesses in the final message instead of fixing them; the builder certifying its own fixes.
- A rubric that checks only first-generation tells (Inter, purple) certifies second-generation ones.
- Deploying to production without being asked; inventing anything to fill a layout.
