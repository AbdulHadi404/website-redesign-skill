# Phase 2 — Research

Goal: calibrate what "finished" looks like for this company's problems, and extract principles you can apply to *their* brand and *their* users. The output is a short take/leave table, not a mood board to copy.

## Choose references by problem

Name the two or three hardest problems the audit found, then choose references that solved them — not the most glamorous sites in the category:

- "Show a complex product simply" · "build trust without customer logos" · "make a 40-column table scannable" · "make a first-time form feel short" · "sell a service with no UI" · "make one screen serve experts and first-timers".
- Interaction problems: "configure a made-to-order product" · "quote before checkout" · "book against finite capacity" · "personalise a template".

Aim for 4–8 references:

- The reference the user named, if any — a quality bar, never a template.
- Two or three direct competitors — in the same city or niche for a local business, noting their price bands — or the closest adjacent category (see what the category expects — Jakob's law — and where everyone looks the same).
- One or two best-in-class examples outside the category whose *problem* is similar.
- For an interaction problem (configure, quote, book, personalise): one or two adjacent products that solved it in another industry — ring and sofa configurators, invitation personalisation, tradespeople's quote flows, salon and tour booking. They teach the interaction; competitors teach the market.
- One deliberately contrary reference, so the direction is chosen rather than defaulted.
- **For product UI: at least one mature design system and one open-source product** whose decisions you can read in code (Primer, Carbon, GOV.UK Frontend, Polaris, Spectrum, Atlassian, PatternFly; Twenty, Cal.com, Plane, Dub, Documenso). They are measurable, their reasoning is written down, and they are reachable even where live sites are not (`resources/inspiration.md`).

When no references were supplied ("make it premium"), this list is the discovery step (`discovery.md` §4); a signature experience is researched as a product — creative tools, editors, configurators and their interaction feel (`discovery.md` §5b).

## Look, then measure

Actually load them. Capture the first viewport and one or two lower sections. For a reference whose system matters (a competitor's type scale, a product's density), measure it rather than guessing: `npx dembrandt <url>` gives its palette, type styles, spacing, radii and motion; `scripts/audit.mjs --base <url> --paths / --kind app` gives sizes, density, targets and signals. For design systems, read the documentation source and token packages (`npm view`, the repo's docs folder).

When a browser pane stops painting (hidden or throttled), screenshots go stale while the DOM still works: read the page text and structure — often enough for an interaction reference — and take visuals later with `scripts/capture.mjs`.

Per reference, two or three lines:

- **Headline / first screen**: what fills it — photography, product, typography, a demo, the user's own data — and how much is empty.
- **Type**: how many sizes, what ratio, body size, whether body copy is comfortable; display vs UI voice.
- **Surfaces and density**: how sections or panels divide; whether cards exist; row and control heights.
- **Product**: shown as real UI, fragments, or not at all — at what size.
- **Imagery**: role (narrative, environment, proof, texture) and treatment.
- **Proof**: how customers, numbers and testimonials appear, and how sparingly.
- **Motion**: what moves, when, and whether it carries meaning.
- **States and edges** (product UI): empty, loading, error, long content, mobile.
- **Restraint**: what they chose *not* to do.

## Extract principles, then put the references away

Turn notes into principles independent of any one site's look:

- "One primary action, repeated; secondary actions are text links."
- "The product appears large and early; each feature sits beside the screen that runs it."
- "The table is the page: filters above, bulk actions appear on selection, detail opens in a side panel."
- "Photography of the customer's world, one treatment, always beside a solid surface for copy."
- "Display type does the branding; UI type stays neutral."

Record in `DESIGN.md` ("References") the problem each reference solves, what was taken *as a principle*, and what was deliberately not taken. A list of URLs is not research. Stop researching a problem when it has changed a decision and further reading would not change another; a reference that changed nothing was browsing. Then stop looking at the references while you make. Copying a reference section by section produces a cheaper imitation of someone else's brand — a worse outcome than a mediocre original — and brand-clone files ("make it look like Stripe") are imitation by design.

## Without a browser or network

If live sites cannot be loaded (no browser tool, or a network policy that blocks them), say so in the report and in `DESIGN.md`, name what would help (a browser tool; the host allowed in the environment's network settings), and use what is reachable: design-system documentation source on GitHub, token packages on npm, open-source product code, and your knowledge of the category — marked as such. When a host's API is refused but git is not (seen: the GitHub REST API returning 403 while `git clone` of the same repository worked), clone instead: `git clone --depth 1 --filter=blob:none --sparse <repo>` then `git sparse-checkout set <dir>`. Never pretend a reference was inspected.
