# Phase 3 — Art direction

Goal: a written direction, specific to this company, that decides the visual system before any code is touched — and that would be recognisably wrong for a different company.

## Derive the concept from the company

Start from the audit, not from a style you like. Read `lessons.md` first. Useful prompts:

- What do the **logo and wordmark** already say? Their colours are the palette's first candidates; their letterform construction points at a display face (a geometric techno wordmark wants a geometric grotesk, not a serif). The mark can become a system: label glyph, list marker, watermark, the hero object.

- What is the **moment** the product serves? (a call answered, a shipment scanned, a contract signed, a dashboard updating). Concepts built from a moment produce imagery, motion and copy that all point the same way.
- What is the **material** of the business? (paper, steel, code, voice, money, people, light). Materials suggest surfaces, textures and palettes.
- What is the **posture** the buyer needs to feel? (safe, fast, expert, calm, ambitious, precise). Posture suggests typography and pacing.
- What **real assets** exist? A product with a beautiful UI wants to be shown large. A service business with no UI wants photography or typography. A data product wants its data.

Write the concept as one line a founder would recognise as theirs, then a paragraph on how it translates to surfaces, type, imagery and motion. If the line would fit a random SaaS company ("modern, clean, trustworthy"), it is not a concept yet.

## Direction families (examples, not templates)

The right answer differs per company. Some families that regularly produce strong, distinct results — choose from the audit, mix with intent, and never default:

- **Editorial** — serif display, generous measure, chapters, photography treated like a magazine.
- **Typography-driven** — oversized statements, hairline grids, few or no images; the type is the identity.
- **Product-driven** — the UI is the hero and recurs at large size; everything else is quiet.
- **Photographic / cinematic** — full-bleed imagery of the customer's world with a strong consistent treatment; copy on its own solid ground.
- **Technical / instrument** — monospace details, dense data, dark surfaces, diagrams that actually explain the system.
- **Brutalist / raw** — heavy type, hard edges, exposed structure, black and white with one colour.
- **Bright and spacious** — white, air, one accent, soft imagery; for approachable consumer-facing products.
- **Corporate-premium** — restrained palette, precise grid, proof-forward, serif or humanist grotesk.
- **Playful / illustrated** — bespoke illustration or 3D as the identity; needs real illustration assets or a clear plan to create them.
- **Luxury** — extreme whitespace, minimal copy, product or material photography, small type.
- **Data-oriented** — charts and live numbers as visual language; only when the numbers are real.

Two unrelated companies should land in different places on this list. If the last three redesigns you did all landed in the same family, be suspicious of yourself.

## Decide every layer, in writing

Fill `templates/DESIGN.md`. The decisions that matter most:

**Typography.** A face the whole brand family already uses (`audit.md` §2b) is a documented brand asset: keep it and re-set it, unless the user says the identity itself is the problem. "Distance from the old site" is never a reason to drop it — distance comes from surfaces, composition, imagery and scale, not from swapping to whatever face is fashionable. Apply `design-theory.md` §2: a scale with a stated ratio, hierarchy by weight and colour before size, caps tracked and brief, and — for any company that is not a developer or infrastructure product — no condensed tracked capitals as a label system, which read as code even without a monospace face. Choose new families unless the existing ones are a documented brand asset with a reason to survive. Match the voice to the business: monospace belongs to developer and infrastructure products; a sales, services, consumer or manufacturing company gets its data in the sans or display face with tabular figures. Emphasis can be weight contrast, colour or size — the serif italic is one option, not the default. Decide display and body (and a data/mono face if the concept wants one), weights, tracking at display sizes, line heights, uppercase usage, and a real scale (hero › chapter › statement › panel › h3 › body › small › label) where every level gets used. Typography alone should make the new site read as a different generation. Free sources with proper licences: Google Fonts, Fontshare, Fontsource; check each family's licence before using it.

**Colour.** Work through `design-theory.md` §1 and its checklist: name the harmony, budget the page 60/30/10 (accent fields count as accent), build the scales perceptually (OKLCH), tint the neutrals, keep one action colour everywhere, and keep labels and numerals off the accent. Start from the sampled logo colours and build outward — deepen or lighten them for contrast, derive the surfaces as tints, and keep the brand's hue family unless the user says the identity is the problem. Build a system, not a swatch: background surfaces (at least two, so chapters can alternate), elevated surface, text at three strengths, line colour, one accent used for action and emphasis only, and the accent's darker variant for small text on light surfaces (contrast). Avoid the reflexive purple/blue gradient unless the brand genuinely owns it. Keep brand recognition where it helps — a logo motif, a colour the customers know — and rebuild everything around it.

**Layout philosophy.** Apply `design-theory.md` Part A: a spacing scale, a grid and baseline rhythm, hierarchy limits (three sizes, two big things), Gestalt-explainable chapters, one deliberate grid break. Container widths, gutters, vertical rhythm per chapter, how surfaces change between chapters, how much asymmetry, whether cards exist at all (often: no).

**Hero concept.** Not headline + paragraph + two buttons + screenshot. Options that work depending on the company: oversized editorial statement over a photograph with copy on its own ground; the product itself, large, doing the thing; a live demo the visitor can use in the first viewport; a split composition; typography interacting with an image; a full-width composition of product fragments. Pick the one the concept demands.

**Product visualisation.** Real screenshots if they exist. Otherwise faithful HTML fragments of real screens with sample data that is obviously illustrative (never customer names). Never a fabricated capability. Show state and flow — a row expanding into a transcript, a pipeline filling, a number changing — rather than a static frame.

**Imagery strategy.** Photography, product, illustration, diagrams, or none — chosen and justified (see `imagery.md`). **If the company's world is photographable and free-licence photography of it exists, "none" has to be argued, not defaulted to.** A page of type, rules and drawn tiles is disciplined and forgettable; the customer's own world on the page is the cheapest way to make a site *theirs*. "None" never means *no graphics*: plan a drawn graphics layer in the brand's line style (milestone art, spot illustrations, glyphs, a watermark family from the logo) so the page has visual events between the type.

**Motion language.** Two or three moves that carry the concept (a masked photo reveal, a word-rise on serif headlines, dots travelling a diagram, a live transcript), plus quiet scroll reveals. Nothing that exists only to move. All of it off under `prefers-reduced-motion`.

## Keep / replace / remove / create

List each explicitly:

- **Keep**: facts and copy structure; functional widgets and their ids; routes and anchors; server contracts; a logo motif if it has meaning; the framework.
- **Replace**: fonts, palette, hero, nav, footer, section grammar, product presentation, secondary pages, the social image, the favicon if the identity changes.
- **Remove**: decorative gradients, textures, card grids, chips, badges, icon grids, animations without meaning, placeholder copy that leaked into production.
- **Create**: new primitives (chapter wrapper, heading pattern, button variants), product fragments, diagrams, imagery pipeline, new components the concept needs.

If **keep** is the longest list, the direction is still a refresh. Go back to the concept before writing code.

## House-recipe check (before writing code)

Write the direction in one sentence: surfaces, display face and emphasis device, label device, dark-chapter colour, accent. Compare it with the recipe in `anti-patterns.md` ("The skill's own house style") and with any other site the user has built with this skill (look for a `DESIGN.md` in their other projects). If the sentence would fit both, change the family: different surfaces, a display face chosen from the wordmark, a label device that is not mono uppercase, an accent from the logo. Record the comparison in `DESIGN.md` under "Distance from the house recipe".

## Page narrative

Use the chapter kinds and the landing-page formula in `web-design.md` §2–3, and run the headline test on the hero before writing anything else.


Reorganise the homepage from scratch around what a visitor must understand in seconds: what it is, who it is for, why it matters, why to trust it, what to do next. For every section ask why it deserves to exist and whether it is the most *visual* way to say it. Vary composition chapter by chapter so the page has rhythm: a typographic chapter, a product chapter, a photographic chapter, a split, an index, a closing. Real proof gets a compact chapter; missing proof gets no chapter.
