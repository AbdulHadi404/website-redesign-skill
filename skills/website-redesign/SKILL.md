---
name: website-redesign
description: Redesign a website or web product so it serves its users and is genuinely its own — marketing sites, SaaS apps, dashboards, ecommerce, docs, fintech, public services, mobile-first products — or build a business's first site from its social media. Frames each route (kind of surface, how often used, how far to change it), audits the repo and rendered product with scripts, researches by problem, derives a direction from the company's own truth, proves it on one key screen, builds in the existing stack, and verifies renders, accessibility, performance and truth-parity before a fresh-context critique. Use whenever a user asks to redesign, rebrand, modernise, overhaul, "make premium", "look professional", "level up" or "fix the UX" of a site, app, dashboard or storefront, or to make an app match its marketing site — even if they only say it looks generic, dated, templated, AI-made, cluttered or hard to use, or name a reference they admire. Not for a one-component tweak or a colour change.
---

# Website and product redesign

The job: turn an existing site or product (or, for a business with no site yet, what it shows the world today) into one that an excellent studio or product team would have built for *this* company and *these* users, while keeping every fact, route, form, contract and integration intact.

> Preserve the company's truth and its functionality — not its existing visual implementation.

Three failures feel like success from the inside. A *refresh*: the fonts, palette and hero survive and nicer components arrive. The *model's default*: the look at the centre of every design the model has seen, instead of one derived from the company. And *the wrong yardstick*: a dashboard used all day judged by how different it looks rather than by whether its users get their work done.

## What decides the outcome

Spend attention in this order; each item has gone wrong in real runs (`references/lessons.md`) and outranks everything below it.

1. **The right kind of surface and intensity** — a landing page, a work tool and a checkout need different rules.
2. **Truth and function intact** — an invented number or a lost form field fails a beautiful page.
3. **A direction derived from the company**, then checked against the model's prior and this skill's past outputs.
4. **Judgement from renders, early, and by someone else** — one key screen before the rest; a fresh reviewer at the end.
5. **Measured gates** — accessibility, responsiveness, performance, parity — which the scripts make cheap.

Polish comes last and never rescues a direction.

## Commitments

1. **Frame before you design.** Every route is classified (`references/framing.md`): what kind of surface it is, how often people use it, what is at stake, and how far this redesign should move it.
2. **Truth is not negotiable.** Product capabilities, prices, claims, customers, numbers, quotes, legal text: only what exists in the repo or comes from the user. Never invent testimonials, logos, statistics, integrations or features to fill a layout; when proof does not exist, design a page that does not need it. `scripts/parity.mjs` checks claims, routes, ids and form fields against the old site; on product surfaces, any number the redesign makes more prominent is checked against a query of what it counts (`app-ui.md` §9).
3. **The brand's own assets first; the model's prior last.** Sample the logo and wordmark and look at the brand family before choosing any colour or typeface. Then check the direction against the known defaults (`references/anti-patterns.md`, "The model's prior") — the SaaS kit, AI purple, and the "tasteful" recipe this skill itself used to produce (cream paper, serif display with an italic accent, mono uppercase eyebrows, ink chapters, one warm accent) — and against this skill's past outputs (`references/ledger.md`). Two companies run through this skill must not come out as siblings.
4. **Judge from renders; measure what can be measured.** Contrast, targets, focus, overflow, type scale, clipped and hidden content, claims and routes are measured by the scripts. Hierarchy, rhythm, fit and finish are judged only from renders you have looked at — never from source, and never only by the one who built it.
5. **No code fonts unless the audience reads code.** A developer or infrastructure product whose users read code may use a monospace face; every other site or app gets none — not for labels, data, IDs, passwords, env names, `[placeholders]`, keyboard hints or timers. Set them in the UI face at 500 with tabular figures, with a copy button where a value is copied. A sibling site's mono face is not inherited, and the browser's default monospace for `code`, `kbd`, `samp` and `pre` counts: point the framework's mono token and those elements at the UI face. `scripts/audit.mjs` fails rendered monospace unless `--allow-mono` (implied by `--kind docs`). The owner rejected code-like type on three projects.

**Distance, used where it belongs.** On an *expressive* surface under a *redesign* or *rethink* brief (most marketing sites, and a first site), name the five things a stranger notices first on the current site (typeface, palette, hero composition, section rhythm, imagery); the redesign changes them, except a documented brand asset kept on purpose and named with its reason in `DESIGN.md` (`art-direction.md` §5). On a *productive* surface (an app used daily, a checkout, a government form), familiarity is an asset: keep the locations, labels and flows people have learned unless the evidence says they fail, and judge the redesign by task success, errors, time and accessibility.

## Choose the path

Frame always runs first; it tells you which row applies. Several can apply to one repo (a marketing redesign often travels with a refine of the app it links to).

| Situation | Path | Read for the direction |
| --- | --- | --- |
| **Small job**: refine one page, one flow or one component family, identity kept | Fast path: 0 → 1 → 4 → 5 → 6 → 8. `DESIGN.md` holds the Brief and the Accessibility block; the job is usually its own key screen, so the rollout gate folds into the critique: checks 1, 2 and 15–20 of `templates/critique.md`, by a fresh reviewer when one is available. Scope decides the path, not how much the look changes | the category in `categories.md`; `app-ui.md` for a product screen |
| **Expressive** redesign or rethink (marketing, editorial, a first site) | Full path; art direction | `art-direction.md`, `design-theory.md`, `anti-patterns.md`, `web-design.md`, `ledger.md`, the digest in `lessons.md`; `logo-design.md` if a mark is in scope |
| **Productive** route (app, dashboard, admin, checkout, public service, field tool) | Full path; interaction direction; convergence checks on the brand layer only | `app-ui.md`, `categories.md`, `art-direction.md` §5–§6, the app tells in `anti-patterns.md`, `design-theory.md` B and C |
| **Thin context**: a brand that lives on social media, an unfamiliar domain, no references, an empty folder, a "website" that is really an ordering or booking application | Discovery inside Phase 0, before the audit (`discovery.md` §1) | `discovery.md`, `templates/PRODUCT.md` |
| **Interaction could beat a page**: a builder, configurator, studio, 3D viewer, explorable, or a feature the user calls the reason the business is remembered | Classify it in Phase 0; it may be a signature route of its own | `interactive.md` |

## Workflow

Work through the phases in order. Read a reference when you reach its phase, not all at once.

| Phase | Output | Read |
| --- | --- | --- |
| 0. Frame | The brief at the top of `DESIGN.md`: route → category, frequency, stakes, posture, intensity; top tasks; constraints; success measures. When context is thin, the discovery write-ups first | `framing.md`, `categories.md`, `discovery.md` |
| 1. Audit | Company, users and tasks; the preserved-list; the measured baseline; rated findings; the UI stack | `audit.md`; `multilingual.md` §2a for bilingual, RTL or number-heavy products |
| 2. Research | References chosen by problem; a take/leave table | `research.md`, `resources/inspiration.md` |
| 3. Direction | Expressive: concept, candidates, type, colour strategy, composition, imagery, motion spec. Productive: interaction model, density, navigation, elevation, state language, brand layer. Content priority per key template. Keep / replace / remove / create | the row of "Choose the path" |
| 4. System | Tokens (colour roles, type sets, spacing, radii, elevation, motion), component inventory, state matrix; `SYSTEM.md` for product UI | `design-systems.md`, `app-ui.md`, `multilingual.md` |
| 5. Build | The key screen first, reviewed; then the redesign in the existing stack on a branch | `implementation.md`, `ui-ux.md`, `imagery.md`, `motion.md`, `resources/` |
| 6. Verify | Captures, sweeps and states; `audit.mjs`, accessibility, responsive and performance passes; motion spec; polish pass | `visual-qa.md`, `accessibility.md`, `responsive.md`, `performance.md` |
| 7. Critique | `templates/critique.md` filled from renders by a fresh reviewer; every "no" fixed and re-rendered | `visual-qa.md` "Critique" |
| 8. Hand-off | Build, tests, parity, links, forms, metadata; commit, push, report; ledger row | `technical-qa.md` |

## Gates

- **Before Phase 3 (direction):** the brief exists. Every route has a category and an intensity; top tasks are confirmed by the user or written down as assumptions.
- **Before Phase 5 (build):** `DESIGN.md` passes its own checks. Expressive redesigns and rethinks: every first-notice thing changes except a documented brand asset, *keep* is shorter than *replace + create*, and the convergence checks are written down (`art-direction.md` §5). Productive routes: the same checks on the brand layer only, and the interaction model is argued from the top tasks. Always: the Accessibility block is filled — no palette without its contrast table, no component without its native element or APG pattern, no motion without its reduced-motion substitute (`accessibility.md` §2).
- **Before rolling out (inside Phase 5):** the key screen is built, rendered at 1440 and 390, blurred beside the old site and the ledger captures, and reviewed (critique checks 1, 3, 4, 7, 15 and 17, plus 6 on an expressive route or 25 on a productive one). A direction that fails here is changed here, where it is cheap.
- **Before Phase 8 (hand-off):** the critique has no remaining "no"; `audit.mjs`, `states.mjs --axe`, `a11y.mjs` and `widgets.mjs` show no fail you have not fixed or disproved with evidence, so no critical or serious axe violation remains on any route, in any theme, or in any open or stepped state; every moderate or minor axe finding is fixed or justified in writing; every `motion.mjs --spec` row passes; `parity.mjs` shows no unsourced claim and no lost route, id or form field (on a first site, `parity.mjs --greenfield` shows no unsourced claim).

Do not skip to implementation because the direction "feels obvious". The direction that feels obvious before the audit is usually the generic one; the one that feels obvious after several redesigns is usually this skill's own habit.

## Phase notes

**0 — Frame.** Classify each route by the job it does, not by how it is built today (a public-service start page dressed as a marketing hero is a service page); note frequency and stakes; choose the intensity: **refine** (fix problems inside the identity), **redesign** (new visual system, same structure and flows) or **rethink** (structure, flows and system). The user's words set the starting point; the evidence can argue for more or less, and the user decides if scope grows. A first site with no old build is a rethink with no baseline: what the customer meets today (the social profile, a competitor's template, a PDF menu) stands in for the old site wherever a check needs one. Before designing any interactive feature, classify it: a supporting feature stays simple and fits the page; a candidate where interaction beats a page, or a signature experience, follows `interactive.md` §1–§3 — never shrunk to fit a website section. A route that turns out to be an application (a human decision, per-customer state, an operator, capacity) gets `templates/PRODUCT.md` before the brief (`discovery.md` §5).

**1 — Audit (understand before judging).** Read the repo the way a new design lead would on day one, run the product, **look at it**, then **measure it** (`audit.mjs`, `a11y.mjs`, `perf.mjs`). Record the accessibility features that already work as well as the barriers: the redesign keeps the first and beats the second. Write the `--storage` seeds for pages that only exist with saved state, and start `states.json` on the old build now, so Phase 6 compares like with like. Then answer in writing what the company sells and to whom, who uses the product for which top tasks, what real proof exists, what must be preserved, and why the current design fails, specifically and with severity.

**2 — Research (look at real things, chosen by problem).** References solve the audit's hardest problems; extract principles into a take/leave table and put the references away while you make. Without a browser, say so and use design-system source and open-source product code as measurable references.

**3 — Direction (derive it, do not pick it).** Expressive: a concept from the company's moment, material and assets; three to seven real candidates across at least three material families; what the direction refuses; typography, a named colour strategy, composition, the first viewport exactly, imagery, and motion written as a spec `motion.mjs` can check (`motion.md` §2). Productive: interaction model, density, navigation, elevation and state language; brand in type, colour roles, tone and a few moments, never in custom controls. When a marketing site exists, it gives the product its brand layer, never its expressive devices (`art-direction.md` §6). For each key template, write its content priority — what must be seen first, second and third — before any layout. Run the convergence checks before code (`art-direction.md` §5); the ledger comparison is a picture, not a sentence.

**4 — System (tokens upward).** Restyle the component library and tokens the codebase already has; switching libraries is a separate project the user approves. Three token tiers with role names, type sets per surface, spacing and radius scales, an elevation model, motion tokens, and the state matrix every interactive component fills.

**5 — Build (key screen first, then the system).** Tokens and base first. Then build the one screen that carries the most risk — the homepage's first viewport and the section after it on an expressive route; the busiest top-task screen with real data on a productive one — in the real stack with real content, and pass the rollout gate. Where the user is engaged in the conversation, show them the key screen before rolling out; in an unattended run, record its review and continue. Then primitives, product fragments, pages, secondary pages and identity assets, on a branch, with business logic, routes, forms, ids and contracts untouched (`implementation.md`). Add a dependency only when a capability needs it and its licence, size and maintenance are checked (`scripts/libcheck.mjs`).

**6 — Verify (renders and measurements).** Capture every page at 1440, 1280, 1024, 768 and 390, sweep every template you touched across all widths, render every widget state, and stress key templates with real content (`visual-qa.md`). Run `audit.mjs` (every route on a productive surface, every theme the site has), the accessibility layer (`accessibility.md` §10–§11; a keyboard walk of each top task on a productive surface), the responsive pass, `perf.mjs` against the old build, and `motion.mjs --spec`. Then the polish pass, macro to micro (`visual-qa.md`, "Polish pass"). Fix and re-capture; never close a loop on the assumption that a change did what you intended.

**7 — Critique (the honest pass).** A fresh-context reviewer, given only the brief, the direction and the captures (state captures included), fills `templates/critique.md`; the builder's account of its own work is not evidence (on the same captures a self-review answered 22 of 22 checks "yes" where a fresh reviewer found two "no" and five partials). Without a subagent tool, say so and make the self-review as blind as the tools allow (`visual-qa.md`, "Critique"). On a productive route, attempt each top task from the captures (`visual-qa.md`, "Task walkthroughs"). At most three rounds; if a "no" survives the third, or a round resolves nothing, put the table in front of the user.

**8 — Hand-off.** The project's own typecheck, lint, build and tests; `parity.mjs` against the old build (claims, routes, ids, fields, analytics hooks; `--payloads` for what forms send); every link clicked and form submitted; metadata and social image. Any change to what the server receives is a deploy blocker, listed first. On a productive rethink, recommend a staged rollout with a named metric and a rollback trigger (`technical-qa.md`, "After launch"). For a public-sector or EU-facing service, draft the accessibility statement. Commit with a message that explains the direction; push the working branch when the remote is the project's own; do not deploy to production unless asked. Add a row to `references/ledger.md` (or, when this skill is installed read-only or shared, put the row in the report for its maintainer).

## Scripts

All in `scripts/`; `npm install` there once. `scripts/README.md` is the manual: shared options (`--storage` for saved state, `--chrome`), what each finding means, and how to write a probe when no script answers. Scripts report facts, not taste: a clean audit is not a good design, and a finding is a lead to check, never a rule to obey.

| Script | Answers |
| --- | --- |
| `capture.mjs` | each page at each width, fold and full; element shots; reduced-motion, dark, no-JS, forced-colours, RTL and removal variants |
| `sweep.mjs` | what breaks between widths, 320–1920 and zoom |
| `stress.mjs` | what real content and real networks break |
| `compare.mjs` | before/after, blurred squint, contact and ledger sheets; pixel diffs |
| `audit.mjs` | what is measurably wrong, by `--kind` of surface and theme |
| `a11y.mjs`, `widgets.mjs` | what rule engines miss; widget keyboard contracts |
| `states.mjs` | every widget state; task walkthroughs (`--aria --each`); axe on open overlays (`--axe`); request recording |
| `parity.mjs` | unsourced and dropped claims, lost routes, ids and fields; form payloads; `--greenfield` |
| `perf.mjs` | throttled lab performance, old against new |
| `motion.mjs` | approved motion present and correct under reduced motion |
| `contrast.mjs`, `palette.mjs`, `fonts.mjs` | colour pairs; logo, photo and tenant palettes; what a font file can do |
| `model.mjs`, `libcheck.mjs` | what a glTF costs; what a library's licence and activity are |

References cite evidence as `research/…`: that folder lives in the skill's repository (github.com/AbdulHadi404/website-redesign-skill), not in an installed copy, and nothing in it is needed to act. A client project's discovery notes go in its own `discovery/` folder, with raw downloads in `discovery/raw/`, git-ignored and never shipped.

## The knowledge base

| File | Holds | Read at |
| --- | --- | --- |
| `framing.md`, `categories.md`, `discovery.md`, `templates/PRODUCT.md` | classifying routes, intensity, the brief and question bank; the category dials and playbooks; discovery when context is thin | Phase 0 |
| `audit.md`, `research.md` | the repo, company, users, brand family and rendered-product audit; references by problem | Phases 1–2 |
| `art-direction.md`, `design-theory.md`, `anti-patterns.md`, `lessons.md`, `ledger.md`, `logo-design.md` | deriving a direction, convergence checks, the productive interaction direction; colour, type and layout with numbers; the prior and the tells; every correction so far; every past output; marks | Phase 3 |
| `interactive.md` | when interaction beats a page, interaction level and fidelity, signature experiences, choosing a renderer, configurators, real-time 3D, generative visuals | Phase 0 when a candidate appears; Phases 3–6 |
| `design-systems.md`, `app-ui.md` | tokens, reuse, component libraries, tenant themes; product-UI density, type, navigation, tables, forms, states, dashboards, brand moments | Phases 3–5 |
| `ui-ux.md`, `web-design.md`, `implementation.md`, `imagery.md`, `motion.md` | interaction rules and numbers; page and landing craft; build order and engineering traps; sourcing and treating images; motion spec, tokens and tools | Phases 3–5 |
| `visual-qa.md`, `accessibility.md`, `responsive.md`, `performance.md`, `dataviz.md`, `multilingual.md`, `technical-qa.md` | capture, polish and critique; WCAG 2.2 decided at design time and proven; responsive, performance and chart rules; Arabic and multilingual; hand-off | Phases 4–8, and wherever the product calls for them |
| `resources/` | components, icons, illustration, photography, fonts, colour tools, motion, 3D and chart libraries, QA tools and inspiration, with licences checked and dated | whenever you need an asset or a library |

## Learning from corrections

Every revision the user asks for is evidence that something in this skill let the mistake through. Before or right after fixing the work:

1. Name the root cause in one line: the missing rule, not the symptom. A "no" from your own critique that the skill could have caught earlier counts too.
2. Change the skill at the cheapest point (framing, audit or direction beats a warning at the end). If the lesson is mechanical, put it in a script: prose describing a check no tool performs is how a known capture bug survived three lessons. Write the reasoning rule ("research the domain's configuration variables before designing a configurator"), never the project's facts or one person's taste as a universal look. A correction the user has had to make more than once becomes a commitment plus a script check (commitment 5 is one).
3. Add a row to `references/lessons-log.md`; update the digest in `references/lessons.md` when the rule is new; record the finished output in `references/ledger.md`.

Do this proactively and tell the user what changed. If the skill's folder is read-only or shared, write the proposed change in the report instead.

## Reporting

Lead with what changed and why, in the user's language — and, before that, any deploy blocker (a change to what the server receives that only staging can confirm). State what was verified and how (widths rendered, scripts run and their results, flows exercised, commands passed), and plainly what was left out and why (missing proof, assets, capability, network access). Share before/after captures. Ask for a decision only where the user owns it: production deployment, unresolved facts, brand assets only they have, a component-library migration, a paid resource, an action that belongs to them.

## When to stop and ask

Only when blocked by something the user must decide or provide: credentials, a paid resource or licence, a capability the environment lacks that the result depends on (browser, network access to a host, image download), the top tasks when there is no evidence for them, a fact the repo cannot answer (a price, a claim, a legal line), or an action that belongs to the user — downloading a client's social media or reading their stories (which may notify them), creating accounts, publishing, or pushing a new repository to a remote. Ask once, precisely: what, from where, how much, where it will be stored. Pushing the working branch to the project's own remote is not one of them. When no one can be asked (an unattended run), write each as a labelled assumption, build on it, and list it first in the report; an action that belongs to the user is never assumed. Everything else — the creative direction included — is your call to make and defend.
