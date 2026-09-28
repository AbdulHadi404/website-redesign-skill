# Phase 3 — Direction

Goal: a written direction, specific to this company and these users, that decides the visual and interaction system before any code is touched — and that would be recognisably wrong for a different company. Read `lessons.md` and `ledger.md` first, then `anti-patterns.md` ("The model's prior").

Expressive surfaces (marketing, brand, editorial) get an **art direction**: a concept, and every visual layer derived from it. Productive surfaces (apps, dashboards, checkout, services) get an **interaction direction**: model, density, navigation, elevation and state language, with brand expressed through type, colour roles, tone and a few rare moments (§6). Most repos need both, on one token system.

## 1. Position before form

1. **Onlyness.** Write one sentence: *"Our [offering] is the only [category] that [benefit] for [who]"*. If it cannot be written honestly, the site cannot be distinctive honestly — say so in the report, and let clarity carry the design.
2. **Attributes as sliders, not adjectives.** Three to five axes of *this, not that*, each with a concrete example of copy, type or image: "precise, not clinical", "warm, not cute", "confident, not loud". These become the principles in the brief; each must be able to say no.
3. **Sources of form that belong to the company** — every one of these is richer than a style you like:
   - the **logo and wordmark**: sampled colours are the palette's first candidates; letterform construction points at a display face (a geometric techno wordmark wants a geometric grotesk, not a serif); the mark can become a system (label glyph, list marker, watermark, the hero object);
   - the business's **own photographs** — for a social-first brand the newest consistent photo set (its backdrop, its staging) is often a stronger identity asset than the logo: sample it like a logo (`palette.mjs --from photo.png`; the sampler reads PNG, so convert a JPEG first) and consider staging the site the way they stage their work (`discovery.md` §2, `imagery.md` "The client's own photographs");
   - the **moment** the product serves (a call answered, a shipment scanned, a contract signed, a number updating live): concepts built from moments produce imagery, motion and copy that point the same way;
   - the **material** of the business (paper, steel, code, voice, money, soil, light) — surfaces, textures and palettes;
   - the **posture** the buyer needs (safe, fast, expert, calm, ambitious) — typography and pacing;
   - the **customers' world** — photography of it is the cheapest way to make a site *theirs*;
   - the **product itself** — real UI rendered from its real tokens, with obviously fictional data;
   - the **vernacular of the industry** (its documents, instruments, signage) — as reference, never costume.

## 2. Candidates, then one

List **three to seven candidate concepts** — as many as are real; three genuine contenders beat seven written to meet a count — drawn from the sources above, spanning at least three material families (if more than three share one family — all "paper", all "signal" — dig further). Name **what the direction refuses**: the page this category always ships, *and* its predictable opposite (both are ruts). Develop two or three into **style tiles** (type, colour, a few UI elements, one image — no layout) or **element collages** (real fragments: a nav, a card, a chart, a headline), differing in *family* — surfaces, type voice, imagery strategy, composition — not in values. Critique them against the brief and the category dials, pick one whole, and record why the others lost. Never merge parts of two directions: blending averages them back to the default. (Shared *content* is not merging: when every direction must show the same product fragment, the directions differ in how they frame and dress it.) Candidates are thinking, not paperwork: if all three share one material family, keep digging.

If subagents are available, one or two can propose independent directions from the audit and brief alone (never your draft); compare on company-specificity and clarity, pick one whole. Stagger heavy subagents when the plan has usage limits: several at once can exhaust a session window (`realtime-3d.md` §9).

Write the concept as one line a founder would recognise as theirs ("the moment the phone rings", "the ledger", "the workshop floor"), then a paragraph on how it translates to surfaces, type, imagery and motion. If the line would fit any SaaS company ("modern, clean, trustworthy"), it is not a concept yet.

## 3. Direction families (vocabulary, not templates)

Families that regularly produce strong, distinct results — choose from the audit, mix with intent, never default:

- **Editorial** — serif or high-contrast display, generous measure, chapters, photography treated like a magazine. *Now the model's default for anything warm or "premium" — needs a reason from the brand.*
- **Typography-driven** — oversized statements, hairline grids, few or no images.
- **Product-driven** — the UI is the hero and recurs at large size; everything else is quiet.
- **Photographic / cinematic** — full-bleed imagery of the customer's world, one strong treatment, copy on its own ground.
- **Technical / instrument** — dense data, diagrams that explain the system; monospace only when the audience itself reads code (commitment 5 in `SKILL.md`). *Near-black + acid accent is a model default.*
- **Brutalist / raw** — heavy type, hard edges, exposed structure, black and white with one colour.
- **Bright and spacious** — white, air, one accent, soft imagery; approachable consumer products.
- **Corporate-premium** — restrained palette, precise grid, proof-forward.
- **Playful / illustrated** — bespoke illustration or 3D as the identity; needs real assets or a plan to draw them.
- **Luxury** — extreme whitespace, minimal copy, material photography, small type; carried by scale and restraint more than by the face.
- **Data-oriented** — charts and live numbers as visual language; only when the numbers are real.

Two unrelated companies should land in different places. If the last three outputs in `ledger.md` share a family, be suspicious of yourself.

## 4. Decide every layer, in writing

Fill `templates/DESIGN.md`. The decisions that matter most:

**Typography.** A face the whole brand family already uses (`audit.md` §4) is a documented brand asset: keep it and re-set it unless the user says the identity is the problem — distance comes from surfaces, composition, imagery and scale, not from swapping to a fashionable face. A monospace face is the exception: a sibling site that uses one does not make it transferable (`audit.md` §4). Otherwise (no family face to keep, or only a mono one):

1. Name the voice from the attributes and the wordmark's construction (`design-theory.md` C3).
2. Shortlist three faces per role (display, text/UI, code only if the audience reads code) from `resources/type-and-colour.md` and the wider catalogues — **not** from memory, which returns the saturated list.
3. Check each with `scripts/fonts.mjs`: the features you rely on (tabular figures for any numbers that align; slashed zero; optical sizes), scripts you need, x-height for small UI sizes — and that the file you will actually serve keeps them (Google Fonts and Fontsource strip optional features).
4. Verify the exact family name, weights, licence (OFL/Apache for public repos; Fontshare's FFL fonts must not be committed to a public repository) and loading route. Omit anything you cannot verify.
5. A face on `scripts/lib/saturated-fonts.json` needs a written reason no other face could satisfy.
6. The whole set fits the font budget before it is chosen, not after: at most two files preloaded and about 100 KB of WOFF2 in total (`performance.md`). A display italic plus a text family in four styles is already over it; count the files now.

Then set the scales (`design-theory.md` C1–C3): an expressive set for marketing routes, a productive set for product routes; hierarchy by weight and colour before size; caps tracked and brief; at most one small-caps device. A monospace face only for a developer or infrastructure product whose users read code — never as a label, data or values face otherwise, and never carried over from a sibling site; everyone else sets data in the sans with tabular figures (commitment 5). No condensed tracked capitals as a label system either: they read as code without a mono face. Emphasis can be weight, colour or size — the serif italic is one option, not the default.

**Colour.** Name the strategy first (`design-theory.md` B3): **Restrained** (60/30/10 — the default for most sites), **Committed** (one saturated brand hue carries 30–60% of the surface), **Full palette** (several hues with jobs — playful and consumer brands, data-rich sites), or **Drenched** (the page *is* the colour). Decide light or dark from one sentence of physical use scene, never from the category. Start from the sampled logo colours (`palette.mjs --from`) and build outward (`palette.mjs --brand`): tinted neutrals, one action colour everywhere, status colours reserved, a data palette separate from the brand scale, every text pair measured on its real ground (`contrast.mjs`). Keep the brand's hue family unless the user says the identity is the problem; avoid the reflexive purple/blue gradient unless the brand genuinely owns it. For a social-first brand whose logo predates its style (clip-art, generated, multicolour), the newest consistent photo set counts as a brand asset beside the logo: keep the logo's meaningful parts (name, lockup, a colour, a motif), take the ground from the photographs' backdrop where it carries the brand better (the photograph and the page then read as one surface), and put any refinement of the mark to the owner as a proposal.

**Layout philosophy.** `design-theory.md` Part A: a spacing scale, a grid and baseline rhythm, hierarchy limits, Gestalt-explainable chapters, one deliberate grid break. Containers, gutters, rhythm per chapter, how surfaces change, how much asymmetry, whether cards exist at all (often: not).

**Hero concept and first viewport.** Describe the first viewport *exactly*: what is where, at what scale, where the primary action sits, and what the sticky header costs it. Not headline + paragraph + two buttons + screenshot. Options: an oversized statement over a photograph with copy on its own ground; the product itself, large, doing the thing; a live demo usable in the first viewport; a split; typography interacting with an image; a composition of product fragments. **The split (copy left, a product panel right) is the hero this skill's past outputs converge on** (`ledger.md`): choose it only when the brief makes it the best answer, and then check it in Phase 3, not Phase 7 — blur the style tile beside the last ledger captures (`compare.mjs --grid … --blur 6`, captures in `references/ledger/`). A round-3 test built one, saw the sibling only in the Phase 7 blur, and rebuilt the hero.

**Product visualisation.** Real screenshots if they exist; otherwise faithful HTML fragments of real screens, at the product's real type size and tokens, with obviously illustrative data (never customer names). Show state and flow — a row expanding, a pipeline filling, a number changing. Never a capability that does not exist.

**Imagery strategy.** Photography, product, illustration, diagrams, or none — chosen and argued (`imagery.md`). If the company's world is photographable and free-licence photography of it exists, "none" has to be argued, not defaulted to. "None" never means no graphics: plan a drawn graphics layer in the brand's line style (milestone art, spot illustrations, glyphs, a motif-based watermark family of small, complete ornaments, never a viewport-wide mark: `anti-patterns.md` "Composition") so the page has visual events between the type.

**Motion language.** Two or three moves that carry the concept, plus quiet reveals written to fail visible — or, on productive surfaces, only motion that explains change (`motion.md`). All of it substituted, not deleted, under `prefers-reduced-motion`.

When the site frames a **signature product experience** (`framing.md` §1: a builder, configurator, studio or visualiser), decide motion as a short list of *signature moments* rather than a reveal system, and research them first: the best sites in the category, the tool per effect, the hand-over into the product, the phone cost. Then:

- **One stage per page.** Each page gets one thing that responds (the hero object, an assembly, the gallery). Fade-ups on every section cancel each other; the premium sites in most categories barely animate and win on photography and restraint.
- **The world moves around the photograph, never the photograph.** Light, shadow, frames, ornaments and captions may respond to the pointer or the scroll; the product photo stays put from first paint (it is the LCP and the evidence).
- **Continuity beats transition.** One shared element (the product's own picture) morphs from the page into the experience and back. The way back lands on the element it left: scroll the destination into view first, or the morph flies off-screen. The experience boots behind a still identical to its first live frame, with no loader during the hand-over; ordinary loading rules still apply everywhere else (`app-ui.md` §8). Recipe: `realtime-3d.md` §7.
- **Scroll storytelling is position-mapped and reversible**, drawn from the product's own parts (layers rendered by the product's pipeline, not mock-ups), pinned for at most ~2.5 screens (`motion.md` §5). The finished state is the fallback and the reduced-motion state, and the essential object is visible before the scroll starts.
- **A template that reacts on the page** (recolour, swap a part) is the bridge into a configurator: the page shows what the visitor could make beside what the company has made, then hands the choice into the product through the URL.
- **Tools, in order:** CSS transitions, scroll-driven animations (`view()`/`scroll()` timelines, `position: sticky` pinning) and View Transitions before any library. When the product is live 3D, these marketing pages carry no WebGL: stills rendered by the product carry them and the live 3D starts in the product (elsewhere the gate in `motion.md` §9 stands). No smooth-scroll library on a site that frames a signature product.
- **Budget and judging:** the phone budget for pages around a signature product in `performance.md` §1 (a lab budget, stricter than the field targets, which still apply). Judge on a phone and on the real GPU, from filmstrips of the transitions: not from screenshots, and not on a desktop monitor alone (`motion.md` §7).

## 5. Convergence checks (before code)

Write each into `DESIGN.md`. On **productive** routes they apply to the brand layer only (§6) — type, colour roles, marks, status vocabulary, tone, empty and success moments; the interaction model is judged by the top tasks and by what users have learned, and "a competitor's app works the same way" is often the right answer, not a failure. A passing productive answer reads like: "the layout follows the task (exceptions first, search pinned); the brand layer — logo palette, wordmark face, droplet status marks — would not fit a competitor".

- **Similar-brief test**: one line describing what this plan would be for a different company in the same category. Same plan → it is the prior.
- **Category test**: guessable from the category alone, or from the category plus "avoid the obvious"? Rework until neither is obvious. **When the brand's own assets are the category's archetype** (a tile shop called Azul whose mark is cobalt and white), the assets win: keep them, and take the distance from composition, content and the product itself. Say so in this test rather than repainting the brand to escape its own category.
- **Second-order test**: any choice justified only as the opposite of a default? A reason must point at the company.
- **House-recipe and ledger check**: the direction in one sentence — surfaces, display face and emphasis device, label device, dark-chapter colour, accent — compared with the recipe in `anti-patterns.md` and the rows in `ledger.md` (and any `DESIGN.md` in the user's other projects). If the sentence fits both, change the family: different surfaces, a display face chosen from the wordmark, a label device that is not mono uppercase, an accent from the logo.
- **Breaks if** (three things that would betray the direction) and the **memory test** (what a visitor describes an hour later).
- **Seam test** (productive routes, when a marketing site exists): a user moving from the site into the product recognises the house — mark, colour, voice — and immediately finds the product calmer, denser and faster than the site. Tested on the site's identity, never its layout: "match the site" never means "replicate the site" (§6).

**Short form, when the brand layer is fully supplied.** If the company's own assets fix the brand layer — a logo whose colours and wordmark face are named in the file, a brand guide in use — the tests can only confirm the derivation. Write one line instead of a paragraph per test: "Brand layer derived from the supplied mark: teal #0E5E5A and saffron #E0A526 from the arch and keystone, IBM Plex Sans Arabic named in the wordmark; no free choices left to converge." Run the full tests on whatever *was* chosen freely (a secondary face, an illustration style, a data palette). The seam test still runs in full when a marketing site exists: it judges the product against the site, not the derivation.

## 6. Productive surfaces: the interaction direction

For apps, dashboards, admin, checkout, services and field tools, decide in writing (`app-ui.md`, `categories.md`). The candidates in §2 become **interaction-model candidates** (a table with filters, an exceptions-first list, a map, a queue, a calendar), judged against the top tasks:

- **Interaction model** — what the user manipulates (records, documents, a canvas, a queue), and how: inline editing vs forms vs side panels; optimistic updates with undo; keyboard shortcuts for top tasks; a command palette if actions are many.
- **Navigation model** — places (sidebar, ≤ two levels), views of one object (tabs), commands (palette), with state in the URL.
- **Density** — body and control sizes from the category dials; whether density modes are offered, to whom.
- **Elevation model** — canvas → surfaces → layers, named, with the nesting rule; cards only for independent objects.
- **State language** — the state matrix rows every component needs, and how loading, empty and error read in this product's voice.
- **Brand layer that carries over** — the mark and its construction; the colour roles and their meanings (which hue is action, which is status, which is ground); the display face with one job (page titles, and sign-in) at product sizes, while panel titles, record names and numbers stay in the UI face; the status vocabulary; the tone, made shorter. Where the marketing site hands over to the product, the seam test (§5) checks that this layer arrived.
- **What does not** — display sizes and fluid type; eyebrow-plus-lead heading stacks; editorial chapters and chapter padding; photography as concept (sign-in is a utility screen, form first: never the marketing hero photograph or its tagline, and at most one abstract graphic derived from the mark); decorative motion; persuasive copy (`anti-patterns.md` "Marketing expression transplanted into a productive surface"). Nor does brand go into custom controls or motion on frequent actions.
- **Brand moments** — two or three: sign-in, first-run and empty states, success after a long task; everything else quiet and consistent. A greeting never takes the page-title slot, which names the place (`anti-patterns.md` "App-UI tells"); on a home screen it may sit as a secondary line under that title. Details: `app-ui.md` §1 and §12.

Keep what users have learned unless the audit shows it fails; say which learned things change and why.

## 7. Keep / replace / remove / create

- **Keep**: facts and copy structure; functional widgets and their ids; routes and anchors; contracts; a logo motif with meaning; the framework and component library; learned locations and flows on productive surfaces.
- **Replace**: fonts, palette, hero, nav, footer, section grammar, product presentation, secondary pages, social image, favicon if the identity changes — on expressive surfaces; tokens, density, states and whatever the audit rated 3–4 on productive ones.
- **Remove**: decorative gradients, textures, card grids, chips, badges, icon grids, animations without meaning, placeholder copy, anything invented.
- **Create**: new primitives (chapter wrapper, heading pattern, button variants), product fragments, diagrams, the graphics layer, imagery pipeline, missing states, `SYSTEM.md` for product UI.

Expressive + redesign: if **keep** is the longest list, the direction is still a refresh — go back to the concept before writing code.

## 8. Page narrative (expressive routes)

Use the chapter kinds and the landing-page formula in `web-design.md` §2–3, and run the headline test on the hero before writing anything else. Reorganise the homepage around what a visitor must understand in seconds: what it is, who it is for, why it matters, why to trust it, what to do next. For every section ask why it deserves to exist and whether it is the most *visual* way to say it. Vary composition chapter by chapter — typographic, product, photographic, split, index, closing. Real proof gets a compact chapter; missing proof gets no chapter.
