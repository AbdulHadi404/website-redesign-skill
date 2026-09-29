# <Company> — design direction

Written <date>, before implementation. Benchmark for finish: <reference(s)>. This must read as *this company's* work — not the references', not the previous site's, and not the model's default.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| … | marketing / app / dashboard / commerce / enterprise / docs / fintech / mobile / field / content / service / signature | once · occasional · weekly · daily · all day | none · time · money · legal/health | expressive / productive / signature | refine / redesign / rethink (a first site: rethink, no baseline) |

If `PRODUCT.md` exists (`discovery.md` §5), the routes, top tasks and success measures come from it (its arrival situations and targets); the principles below are design principles — its product rules are not repeated.

**Audience and context:** who, doing what, on which device, under what pressure.

**Top tasks** (≤ 5, ranked; evidence or "assumption"):
1. …

**Problems** (ranked by severity 0–4 × task importance; each traced to an audit finding): …

**Principles** (3–5 that can say no — a reasonable team could hold the opposite): …

**Non-goals:** …

**Constraints:** stack and component library (licence; for a first site, the choice in `discovery/architecture.md`), contracts to preserve, surviving brand assets, legal copy, accessibility level, performance budget, languages/scripts/RTL.

**Success measures** (per category, with the baseline where one exists): …

## Audit

**What the company sells, to whom:** …

**The one thing a visitor or user should remember / be able to do:** …

**Real proof that exists:** … (customers, numbers, product UI, demo, awards — only what is real)

**Brand assets sampled:** logo colours (`palette.mjs --from`), wordmark construction (geometric / humanist / serif / techno / condensed), brand family (parent and sibling surfaces: marks, faces, palettes).

**Measured baseline** (`audit.mjs`, dembrandt): type sizes in use, families, contrast failures, focus, targets, overflow, signals, LCP/CLS. (A first site: "no measured baseline"; what the customer meets today — the social profile, a competitor's template, a PDF menu — is recorded here as the stand-in for the old site.)

**Must be preserved (functionality and truth):**
- Routes / anchors: …
- Element ids, data attributes and form fields wired to scripts or analytics: …
- Server contracts / integrations / analytics events: …
- Legal copy: …

**Why the current design fails** (specific, with severity): …

**The five things a stranger notices first** (expressive redesign or rethink, a first site included; each one changes except a documented brand asset kept under `art-direction.md` §4–§5; a first site takes them from what the customer meets today and the category template):
1. … 2. … 3. … 4. … 5. …
Kept, and why (a brand asset only — a face the brand family uses, the brand's hue family, assets that are the category's archetype): … (anything else kept makes this a refresh)

## References

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| … | … | … | … |

(If references could not be inspected live, say so, and name what was measured instead — design-system repos, open-source product code.)

## Direction

Fill the parts that apply. **Expressive** routes: everything below except the experiential quality bar and "Productive surfaces". **Productive** routes (apps, dashboards, field tools, checkout, services): "Productive surfaces", "First viewport", "Breaks if" and the convergence checks *for the brand layer only*; skip Concept, material-family candidates and the memory test. **Signature** routes (builder, configurator, studio, visualiser): the experiential quality bar first; the experience itself is directed like an expressive route (Concept, candidates, fidelity and materials, its motion and feel), with its interaction model from `ui-ux.md` §7b; its chrome and controls fill "Productive surfaces" (`discovery.md` §5b). A two-page site does not need every section of this template at full length — the Brief, Accessibility, Colour, Typography and Keep/replace/remove/create always; the rest as far as they change a decision. When `SYSTEM.md` also exists, each rule lives in one place: `DESIGN.md` holds decisions and their reasons (the accessibility block says *which* commitments this product makes and why); `SYSTEM.md` holds how components carry them out (focus ring, target sizes, error pattern). Refer, don't repeat.

**Concept** (expressive surfaces) — one line a founder would recognise as theirs: **"…"**

**Experiential quality bar** (signature routes), in the user's words: "…" (for example "people would screen-record it"). Everything on the route is judged against it, not against a feature list.

**Candidates considered** (three to seven real ones from the company's own world — its moment, material, customers' world, product, industry vernacular — spanning at least three material families), and why each lost: …

**Refuses:** the page this category always ships — and its predictable opposite.

**First viewport, exactly:** what is where, at what scale, and where the primary action sits (for product routes: the top-task screen, same level of detail).

**Productive surfaces** (if any):
- Interaction model: the candidates considered (a table with filters, an exceptions-first list, a queue, a map…) and why each won or lost against the top tasks; the one chosen: …
- Brand layer carried over from the marketing site or brand: mark, colour roles and their meanings, display face and its one job, status vocabulary. Expressive devices deliberately not carried over: …
- Navigation model (sidebar, top bar, rail, none) and, for a sidebar, its groups (≤ 7 per group); phone pattern (`responsive.md` §5), tab titles, accelerators (palette, shortcuts): …
- Density (and density modes), page-header height budget and what sits above the 1280 × 800 fold; elevation model (canvas / surface / layer); state language, including freshness and offline (`app-ui.md` §7b): …
- What users have learned that stays: …
- Brand moments (2–3): sign-in, first-run/empty states, success after a long task, and how each shows the brand: … The sign-in treatment (form first, no marketing hero photograph or tagline): … A greeting never takes the title slot.
- Checklist: `app-ui.md` §14, ticked before implementation.

**Breaks if:** three things that would betray this direction.

**Memory test:** what a visitor describes an hour later. (If the answer is a mood, the direction is not decided yet.)

**Convergence checks:**
- Similar-brief test — this plan for a different company in the category would be: … (must differ)
- Category test — guessable from the category, or from category + "avoid the obvious"? …
- Second-order test — any choice justified only as the opposite of a default? …
- Ledger — the direction in one sentence (surfaces, display voice and emphasis device, label device, dark-chapter colour, accent): … compared with `ledger.md` rows and this user's other sites: …
- Seam test (productive routes, when a marketing site exists) — moving from the site into the product, is the house recognisable (mark, colour, voice) and the product calmer, denser and faster than the site? …

## Typography

- Type sets: expressive (marketing) with its ratio and every size listed — every step used somewhere; productive (app): the fixed type roles in `SYSTEM.md` Foundations.
- Display: family, weights, axes (opsz, wdth), tracking at display sizes, line height — and why it matches the wordmark's construction or the brand family.
- Text / UI: family, weights, measure; tabular figures available (`fonts.mjs`)?
- Monospace: **none** — or the one-line reason this audience reads code (commitment 5 in `SKILL.md`). Where the framework has a mono token, point it at the UI face; `code`/`kbd`/`samp`/`pre` inherit the UI face.
- Caps/tracked-label device: at most one, and which. Nothing typeset to look like machine output.
- Scripts and languages: companion faces (`multilingual.md`), size adjustment, RTL.
- Licence, source and loading for each family (self-hosted? features preserved? no FFL fonts in a public repo).

## Colour

**Strategy:** Restrained (60/30/10) / Committed (one saturated hue carries 30–60%) / Full palette / Drenched — and why.

**Harmony and sources:** which hue dominates, supports, accents — from the sampled logo hues.

**Use scene** (light / dark / both): one sentence of physical scene.

**Scales:** OKLCH, H fixed, L stepped, C shaped (`palette.mjs`); neutral tint hue and chroma; status colours reserved; data palette separate (`dataviz.md`).

**Contrast table:** every text/ground pair actually used, including state grounds on productive surfaces — hover, selected, zebra, secondary panels — and dark mode; WCAG ratio and APCA Lc on the real ground (`contrast.mjs`).

| Token (role) | Value | Use |
| --- | --- | --- |
| surface / surface-alt / surface-raised | … | … |
| text-strong / text / text-muted | … | … |
| border / border-strong | … | … |
| accent (action) / accent-hover / accent-text | … | action only on productive surfaces (action and emphasis on expressive routes); contrast-safe variant for small text |
| selected | … | neutral, not accent |
| status: danger / warning / success / info | … | state only — never decoration |
| focus ring | … | ≥ 3:1 against both the control and its ground |

## Layout and space

Containers, grid and gutters per breakpoint; spacing scale; vertical rhythm per chapter; how surfaces change between chapters (expressive) or how panels divide (productive); asymmetry; whether cards exist, and for what.

## Imagery and graphics

(On a productive route the hero, narrative and imagery budget shrinks to the sign-in and empty states, `app-ui.md` §12. A productive screen with no images or illustrations writes "none" and its icon set here.) Photography / product UI / illustration / diagrams / typography-only — chosen and argued (if the company's world is photographable, "none" must be argued). Source, licence class, treatment, pipeline, credits location. The drawn graphics layer: its line style and the motif it comes from.

## Motion

Productive vs expressive tokens (durations, easings); the two or three concept moves (expressive surfaces only); the reveal system (finished by default); reduced-motion substitutions; what never moves. Sites that frame a signature product: the signature moments list instead of a reveal system, each researched first, with the hand-over into the product (`art-direction.md` §4).

## Interaction

- Primary action per key screen (label, colour, placement): …
- Components and the state-matrix rows each needs (see `SYSTEM.md` for product UI): …
- Forms: fields kept, labels, validation timing (on submit, then live), error summary, required/optional marking: …
- Targets, thumb zone, mobile navigation: …
- Performance budget: LCP element, fonts, JS, third parties: …

## Accessibility

Filled before any code (`accessibility.md` §2). WCAG 2.2 AA; aiming for 2.4.13 and 2.3.3.

- **Contrast table** (above, in Colour) plus non-text pairs: input border, checkbox outline, switch track, focus ring, meaningful icons, chart marks — each ≥ 3:1 on its real ground, per theme.
- **Focus token:** colour per surface, width, offset; sticky-UI heights → `scroll-padding`: …
- **Targets:** 24 px floor everywhere; every target 44 px on coarse pointers (hit area; `accessibility.md` §2); the dense-table action pattern on fine pointers: …
- **320 px state:** nav, sidebars, toolbars, record lists (a name and a meta line), comparison tables (own scroll region), dialogs: …
- **Colour independence:** the second cue for status, trend, required, error, selected, links, series: …
- **Motion:** each move → its reduced-motion substitute; what auto-moves or auto-updates, and its pause control: …
- **Forced colours:** borders on controls, `currentColor` icons, how selected/on states show: …
- **Component map:** component → native element / APG pattern (`accessibility.md` §3), app shortcuts and how they can be turned off: …
- **Forms:** error pattern, optional/required convention, `autocomplete` map, sign-in approach (passkey / email link; paste allowed): …
- **Announcements:** status vs alert messages; SPA route change (focus the `h1` *or* announce): …
- **Data:** chart summary + table policy, encodings beyond colour: …
- **Preserved features:** what the current site already does right (skip link, live regions, captions, …): …

## Page narrative (expressive routes)

(Productive routes: skip; see the brand moments under "Productive surfaces" above.)

Headline test: the hero sentence a stranger would understand alone — "…"

1. … (why this chapter exists; why this composition rather than heading → paragraph → cards)

## Keep / replace / remove / create

**Keep:** … **Replace:** … **Remove:** … **Create:** …

(Expressive redesign or rethink: if *keep* is not shorter than *replace + create*, the direction is still a refresh. Productive: keep what users have learned unless the audit shows it fails — and say which.)

## Secondary pages

(Skip for a single-screen job.) How each page adopts the system; what changes structurally.
