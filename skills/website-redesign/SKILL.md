---
name: website-redesign
description: Redesign an existing website or web product so it is genuinely better for its users and genuinely its own — marketing sites, landing pages, SaaS apps, dashboards, ecommerce, docs, fintech, public services, mobile-first products. Runs the full loop — frame the problem (kind of surface, how often it is used, how far to change it), audit the repo and rendered product with measurement scripts, research by problem, derive a direction from the company's own truth, build tokens and components, implement in the existing stack, then verify renders, accessibility, responsiveness, performance and truth-parity with the old site, critique and iterate. Use whenever a user asks to redesign, rebrand, modernise, overhaul, "make premium", "look professional", "level up" or "fix the UX" of a site, app, dashboard or storefront — even if they only say it looks generic, dated, templated, AI-made, cluttered or hard to use, or name a reference they admire. Not for a one-component tweak or a colour change.
---

# Website and product redesign

The job is to turn an existing site or product into one that an excellent studio or product team would have built for *this* company and *these* users — while keeping every fact, route, form, contract and integration intact.

> Preserve the company's truth and its functionality — not its existing visual implementation.

Two failures are common and both feel like success from the inside. On a marketing site: keep the fonts, the palette and the hero, add nicer components, and call it a redesign (a *refresh*). On anything: produce the model's default look — the centre of every design the model has seen — instead of a look derived from the company. This skill is built to make both hard to reach by accident, and to judge a working tool by whether its users get their work done, not by how different it looks.

## Commitments

1. **Frame before you design.** Every route is classified (`references/framing.md`): what kind of surface it is, how often people use it, what is at stake, and how far this redesign should move it. A marketing page, a dashboard used all day and a checkout are judged by different rules; the rules below say which apply where.
2. **Truth is not negotiable.** Product capabilities, prices, claims, customers, numbers, quotes, legal text: only what exists in the repo or from the user. Never invent testimonials, logos, statistics, integrations or features to fill a layout; when proof does not exist, design a page that does not need it. `scripts/parity.mjs` checks this against the old site before hand-off.
3. **The brand's own assets first; the model's prior last.** Sample the logo and wordmark and look at the brand family before choosing any colour or typeface. Then check the direction against the known defaults in `references/anti-patterns.md` ("The model's prior"): the SaaS kit, AI purple, and the "tasteful" recipe this skill itself used to produce (cream paper + serif display with an italic accent + mono uppercase eyebrows + ink chapters + one warm accent). Two companies run through this skill must not come out looking like siblings — check `references/ledger.md`.
4. **Measure what can be measured; render what cannot.** Contrast, targets, focus, overflow, type scale, clipped content, hidden content, claims and routes are measured by the scripts in `scripts/`. Hierarchy, rhythm, fit and finish are judged only from renders you have looked at — never from source.

**Distance, used where it belongs.** On an *expressive* surface under a *redesign* brief (most marketing sites), write down the five things a stranger notices first on the current site (typeface, palette, hero composition, section rhythm, imagery); a redesign changes what those five things are, and a plan that keeps three is a refresh. On a *productive* surface (an app used daily, a checkout, a government form), familiarity is an asset: keep locations, labels and flows people have learned unless the evidence says they fail, and measure the redesign by task success, errors, time and accessibility.

## Workflow

Work through the phases in order; each has a reference with the detailed method. Read a reference when you reach its phase, not all at once — and read by posture: on a productive route, Phase 3 needs `art-direction.md` §6, the app tells in `anti-patterns.md`, `design-theory.md` B5–B7 and C1–C4, and `app-ui.md`, not the expressive method. A **small job** — a refine of one page, one flow or one component family, with no new identity — takes the fast path: 0 → 1 → 4 → 5 → 6 → 8, never skipping 0 or 6. Anything with a new visual identity, or more than a handful of pages, takes the full path.

| Phase | Output | Read |
| --- | --- | --- |
| 0. Frame | The brief at the top of `DESIGN.md`: route → category map, frequency, stakes, intensity, top tasks, constraints, success measures | `references/framing.md`, `references/categories.md` |
| 1. Audit | Written audit: company, users and tasks, preserved-list, measured baseline (`audit.mjs`, dembrandt), heuristic findings with severity, UI stack inventory | `references/audit.md`; `references/multilingual.md` §2a for bilingual, RTL or number-heavy products (their central defects are there) |
| 2. Research | 4–8 references chosen by problem, principles extracted, a take/leave table | `references/research.md`, `references/resources/README.md` |
| 3. Direction | Expressive: concept, candidates, typography, colour strategy, composition, imagery, motion. Productive: interaction model, density, navigation, elevation model. Keep / replace / remove / create | Expressive: `references/art-direction.md`, `references/design-theory.md`, `references/anti-patterns.md`, `references/lessons.md`, `references/ledger.md`; `references/logo-design.md` if a mark is in scope. Productive: `references/app-ui.md`, `art-direction.md` §6, the app tells in `anti-patterns.md`, `design-theory.md` B5–B7 and C1–C4 |
| 4. System | Tokens (colour roles, type sets, spacing, radii, elevation, motion), component inventory, state matrix; `SYSTEM.md` for product UI | `references/design-systems.md`, `references/app-ui.md` (product surfaces), `references/multilingual.md` (RTL / non-Latin) |
| 5. Build | The redesign in the existing stack on a branch; assets licensed and localised | `references/implementation.md`, `references/ui-ux.md`, `references/imagery.md`, `references/motion.md`, `references/resources/` |
| 6. Verify | Renders at 1440 / 1280 / 1024 / 768 / 390 (+ element shots, and every widget state via `states.mjs`); `audit.mjs` clean or justified; accessibility, responsive and performance passes | `references/visual-qa.md`, `references/accessibility.md`, `references/responsive.md`, `references/performance.md` |
| 7. Critique | `templates/critique.md` filled from renders, ideally by a fresh-context reviewer; every "no" fixed and re-rendered | `references/visual-qa.md` §Critique |
| 8. Hand-off | Build, tests, `parity.mjs` against the old site, links, forms, metadata; commit, push, report | `references/technical-qa.md` |

Three gates sit inside this sequence:

- **Before Phase 3 (direction):** the brief exists. Every route has a category and an intensity; top tasks are confirmed by the user or written down as assumptions.
- **Before Phase 5 (build):** `DESIGN.md` passes its own checks — for expressive redesigns, all five first-notice things change and *keep* is shorter than *replace + create*, and the similar-brief test, the category test and the ledger comparison are written down (`art-direction.md`); for productive routes the same tests apply to the brand layer only (type, colour roles, marks, tone), and the interaction model is judged by the top tasks, not by distance; the Accessibility block is filled — no palette without its contrast table, no component without its native element or APG pattern, no motion without its reduced-motion substitute (`accessibility.md` §2). A direction that fails them only gets more expensive to discover later.
- **Before Phase 8 (hand-off):** the critique has no remaining "no"; `audit.mjs`, `a11y.mjs` and `widgets.mjs` show no fail you have not fixed or justified in writing — a script false positive is justified with the evidence that disproves it (a capture, a probe, a request log), never by assertion; `parity.mjs` shows no unsourced claim and no lost route, id or form field.

Do not skip to implementation because the direction "feels obvious". The direction that feels obvious before the audit is usually the generic one; the one that feels obvious after several redesigns is usually this skill's own habit.

### Phase 0 — Frame

Classify each route (marketing, SaaS app, dashboard, commerce, enterprise, docs/dev tool, fintech, mobile-first consumer, field/frontline tool, content, public service), note how often people use it and what is at stake, and choose the intensity: **refine** (fix problems inside the current identity), **redesign** (new visual system, same information architecture and flows), or **rethink** (structure, flows and system). The user's words set the starting point ("make it look premium" is a redesign of an expressive surface; "our dashboard is hard to use" is a refine or rethink of a productive one); the evidence can argue for more or less. Write the brief (`framing.md`). The category sets the dials for everything after: body size and density, motion and novelty budget, what colour is for, what gets visual weight, and which metrics define success (`categories.md`).

### Phase 1 — Audit (understand before judging)

Read the repository the way a new design lead would on day one: routes, layouts, shared components, styling system and tokens, fonts, colours, logo and brand family, imagery, motion, SEO/meta, analytics, forms and integrations, and the UI libraries in use with their versions and licences. Run the product and **look at it**, then **measure it**: `scripts/audit.mjs` (contrast on the real ground, focus, targets, overflow, type and spacing inventory, hidden and clipped content, generic-look signals) and, where available, `dembrandt` for the site's actual token set. Run `scripts/a11y.mjs` on each key template and note which accessibility features already work, so the redesign keeps them. Then answer, in writing: what the company sells and to whom; who uses the product, how often, on what device, for which top tasks; what real proof exists; what must be preserved; and why the current design fails — named specifically and rated by severity.

### Phase 2 — Research (look at real things, chosen by problem)

Choose references by the problem they solve (show a complex product simply; build trust without logos; make a dense table scannable), not by category glamour. Mix competitors, adjacent categories, one contrary reference, and — for product UI — mature open-source design systems and open-source products whose tokens you can read. Extract principles into a take/leave table; put the references away while you make. If no browser is available, say so and use design-system repos, npm packages and open-source product code as measurable references.

### Phase 3 — Direction (derive it, do not pick it)

For **expressive** surfaces: derive a concept from the company's moment, material and assets; list 5–7 candidates across at least three material families; state what the direction refuses (the page this category always ships, and its predictable opposite); decide typography, a named colour strategy, composition, the first viewport exactly, imagery and motion. For **productive** surfaces: decide the interaction model, density, navigation model, elevation model and state language; brand shows in type, colour roles, tone and a few considered moments, not in custom controls. Before writing code, run the similar-brief test, the category test and the ledger comparison — on the whole direction for expressive routes, on the brand layer for productive ones. Then write keep / replace / remove / create.

### Phase 4 — System (tokens upward)

Detect what the codebase already has — its component library, tokens, primitives — and restyle rather than replace it; switching component libraries is a separate project the user must approve. Build tokens in three tiers (primitive → semantic → component) with role names, type sets per surface (expressive and productive), a spacing and radius scale, an elevation model, motion tokens, and the state matrix every interactive component must fill. For product UI, write `templates/SYSTEM.md`.

### Phase 5 — Build (rebuild the system, not the app)

Work on a branch. Tokens → base → motion → primitives → product fragments → pages → secondary pages → identity assets. Keep business logic, routes, forms, ids and contracts exactly as they are. Stay in the existing framework; add a dependency only when a capability genuinely needs it and its licence, size and maintenance are checked (`resources/`). Content is finished by default and motion only removes the hidden start state (`implementation.md`, "The reveal, written safely"). Show the product instead of describing it; text always sits on its own ground.

### Phase 6 — Verify (renders and measurements)

Capture every page at 1440, 1280, 1024, 768 and 390 with `scripts/capture.mjs`, element shots of artwork, and every state of every widget with `scripts/states.mjs` (the same scenario file on the old and the new build); look at the captures. Run `scripts/audit.mjs` at 1440 and 390 with the right `--kind`, `scripts/a11y.mjs` on each key template and `scripts/widgets.mjs` on each custom widget, then the manual accessibility pass (`accessibility.md` §11), the responsive pass and a performance run. Fix and re-capture; do not close a loop on the assumption that a change did what you intended.

### Phase 7 — Critique (the honest pass)

Fill `templates/critique.md` from the renders: objective → element → effect → why, removal and swap tests, the category fit, the tells. Prefer a fresh-context reviewer (a subagent given only the brief, `DESIGN.md` and the capture paths) — the builder's account of its own fixes is not evidence. Without one, say so, and write the first impression from the blurred sheet before re-reading your own direction. For a productive route, a walkthrough is stronger evidence than opinion: attempt each top task with `states.mjs --aria --each`, choosing each step from what the capture shows (`visual-qa.md`, "Task walkthroughs"), and record result, actions and doubts on the old and the new build. Every "no" becomes a fix and a re-render. At most three rounds; if a "no" survives the third, or a round resolves nothing, put the table in front of the user.

### Phase 8 — Hand-off

Typecheck, lint, build and test with the project's own commands. Run `scripts/parity.mjs` against the old build: every new number and quote sourced, every dropped fact deliberate, every old route, id, form field, form submission and `data-*` analytics hook accounted for. Click every link, submit every form, check metadata and the social image. Commit with a message that explains the direction; push the branch when the remote is the project's own (a local mirror or a test fixture is not), and use the project's preview mechanism if it has one. Do not deploy to production unless asked. Add a row to `references/ledger.md` — or, when this skill is installed read-only or shared by a team, put the row and any lesson in the report for its maintainer instead of editing it mid-job.

## Scripts

All in `scripts/` (run `npm install` there once; Playwright-based; each prints what it found and why it matters). Pages that depend on saved state — a filled basket, a signed-in view, a dismissed banner — are only audited if the state exists: every script takes `--storage seed.json` (`{"localStorage": {…}, "sessionStorage": {…}, "cookies": […]}`), seeded before the page's own scripts run.

| Script | Use it for |
| --- | --- |
| `capture.mjs` | Full-page and first-viewport captures at several widths; element shots at 3× for artwork; `--reduced-motion`, `--dark`, `--no-js`, `--forced-colors` renders; `--variant` removal tests (no text, no images, no shadows) |
| `audit.mjs` | Measured audit of a rendered page (`--kind marketing|app|field|commerce|content|docs|service`): overflow and zoom-out, contrast on the painted ground, invisible focus, targets, fake controls, clipped content, colour-only status, headings/landmarks, images, no-JS and reduced-motion hidden content, console errors, type/spacing/radius inventory, unavailable fonts, LCP/CLS, axe-core, numbers and scripts (digit systems, numeric columns, `type=number` on RTL, untranslated strings), finish (widows, concentric radii, dead bands), generic-look signals. `--kind` also takes category names (dashboard, fintech, ecommerce, …) |
| `a11y.mjs` | What rule engines miss: keyboard walk with focus visibility, focus hidden under sticky UI, traps, pointer-only controls, names from the accessibility tree, form-control contrast, autocomplete, reflow at 320/640, text spacing, forced colours, colour-vision renders, motion |
| `widgets.mjs` | Keyboard contracts of custom widgets (`--device phone` or per-contract `"device"` for phone-only widgets) — dialog, tabs, disclosure, live region, form errors, menu button — from a small JSON of selectors |
| `states.mjs` | Every widget state rendered: loading, empty, error, offline, stale, long and many items, open, focused — from a JSON of routes, fixtures and steps; flags scenarios and steps that changed nothing. With `--aria --each`, a task-walkthrough driver: touch taps and swipes, a capture per step, and the accessibility tree marked with what is not readable on screen |
| `parity.mjs` | Old site vs new: unsourced and dropped claims (Eastern Arabic digits normalised; reformatted values told apart; `--derived` for values computed from data), missing routes, lost ids, form fields, `data-*` analytics hooks and form submissions, metadata |
| `contrast.mjs` | WCAG 2 and APCA for any CSS colours or token files |
| `palette.mjs` | Sample a logo's colours; build 12-step OKLCH role scales (light/dark) with solved text steps |
| `fonts.mjs` | What a font can do before you choose it: axes, tabular figures per digit system (Latin, Eastern Arabic, Persian), features, script coverage, x-height; `--fallback arial` prints a metric-matched fallback `@font-face` |
| `perf.mjs` | Throttled lab performance when Lighthouse cannot run, or before/after on every page when it can: LCP and its element, CLS, TBT, transfer by type; flags regressions and broken baselines |
| `compare.mjs` | Before/after sheets, blurred squint sheets, pixel diffs for regressions |

Scripts report facts, not taste. A clean audit is not a good design, and a signal is a question to answer, not a rule to obey.

References cite evidence as `research/…`: that folder lives in the skill's repository (github.com/AbdulHadi404/website-redesign-skill), not in an installed copy. It is background — nothing in it is needed to act.

## The knowledge base

| File | Holds | Read at |
| --- | --- | --- |
| `references/framing.md`, `references/categories.md` | classifying surfaces, intensity, the brief, the question bank; the category dials and eleven playbooks (field and frontline tools included) | Phase 0 |
| `references/design-theory.md` | colour theory, strategies, OKLCH scales, contrast; typography rules, scales, pairing, product vs marketing type; checklists (Parts B–D gate the work); Rams, Vignelli, Gestalt, hierarchy and grids as background (Part A) | Phases 3–4 |
| `references/design-systems.md`, `references/app-ui.md` | tokens, reuse before reinvention, component libraries and when to use them, state matrix, `SYSTEM.md`; product-UI density, navigation, tables, forms, notifications, loading/empty/error, dashboards | Phases 3–5 (product surfaces) |
| `references/ui-ux.md`, `references/web-design.md` | heuristics, laws with numbers, reading, feedback, forms, targets, writing, dark patterns; homepage and landing-page craft, chapters | Phases 3–5 |
| `references/accessibility.md`, `references/responsive.md`, `references/performance.md`, `references/motion.md`, `references/dataviz.md`, `references/multilingual.md` | the specialist passes | when the phase or the product calls for them |
| `references/anti-patterns.md`, `references/lessons.md`, `references/ledger.md` | the model's prior and the tells; every correction so far; every past output | Phase 3 and before Phase 5 |
| `references/resources/` | where to find components, icons, illustration, photography, fonts, colour tools, motion, 3D and chart libraries, QA tools and inspiration — with licences checked and dated | whenever you need an asset or a library |

## Learning from corrections

Every revision the user asks for is evidence that something in this skill let the mistake through. Before or right after fixing the work:

1. Name the root cause in one line — the missing rule, not the symptom.
2. Change the skill so it is less likely next time, at the cheapest point (framing, audit or direction beats a warning at the end). If the lesson is mechanical, put it in a script — prose that describes a check the tools do not perform is how the capture bug survived three lessons.
3. Log it in `references/lessons.md`; record the finished output in `references/ledger.md`.

Do this proactively and tell the user what changed in the skill. If the skill's folder is read-only or shared, write the proposed change in the report instead of editing it.

## Reporting

Lead with what changed and why, in the user's language. State what was verified and how (widths rendered, scripts run and their results, flows exercised, commands passed). State plainly what was left out and why (missing proof, assets, capability, network access). Share before/after captures. Ask for a decision only where the user owns it: production deployment, unresolved facts, brand assets only they have, a component-library migration, a paid resource.

## When to stop and ask

Only when blocked by something the user must decide or provide: credentials, a paid resource or licence, a capability the environment lacks that the result depends on (browser, network access to a host, image download), the top tasks when there is no evidence for them, or a fact the repo cannot answer (a price, a claim, a legal line). When no one can be asked (an unattended run), write each of these down as a labelled assumption, build on it, and list it first in the report; the gates accept either. Everything else — including the creative direction — is your call to make and defend.
