---
name: website-redesign
description: Redesign an existing marketing website into a genuinely new, premium, brand-specific design — not a refresh. Runs the full loop — audit the repo and the rendered site, research live reference sites, derive an art direction from the company's own truth, decide keep / replace / remove / create, rebuild the visual system in the existing stack, source licensed imagery when it earns its place, render and inspect at desktop/laptop/tablet/phone, self-critique, iterate, then functional and technical QA. Use this whenever a user asks to redesign, rebrand, "make premium", "make it look like a real design agency did it", modernise, overhaul, or "level up" a marketing site, landing page or homepage — even if they only say "the site looks generic/dated/templated" or name a reference site they admire. Not for small tweaks (one colour, one component) or for application UI inside a product.
---

# Website redesign

The job is to turn a company's existing marketing site into one that looks like an excellent design studio rebuilt it around that company — while keeping every fact, route, form and integration intact. The core principle:

> Preserve the company's truth and its functionality — not its existing visual implementation.

This skill exists because the natural failure mode is subtle and common: keep the fonts, keep the palette, keep the hero shape, add nicer components, and call it a redesign. Everyone involved can see the improvement, and nobody can see the difference. The workflow below is built to make that outcome hard to reach by accident.

## Two commitments before you start

1. **The distance test.** Write down the five things a stranger notices first on the current site (typeface, palette, hero composition, section rhythm, imagery or its absence). A redesign changes what those five things *are*. If your plan keeps three of them, it is a refresh; stop and rethink the direction before writing code.
2. **Truth is not negotiable.** Product capabilities, prices, claims, customers, numbers, legal text: only what exists in the repo or from the user. Never invent testimonials, logos, statistics, integrations or features to fill a layout. When proof does not exist, design a page that does not need it.

## Workflow

Work through the phases in order. Each phase has a reference file with the detailed checklist — read it when you reach that phase, not all at once.

| Phase | Output | Read |
| --- | --- | --- |
| 1. Audit | A written audit: what the company sells, to whom, what the site gets wrong | `references/audit.md` |
| 2. Research | 4–8 live reference sites inspected, principles extracted (never sections copied) | `references/research.md` |
| 3. Art direction | `DESIGN.md` in the repo from `templates/DESIGN.md`, including keep / replace / remove / create | `references/art-direction.md`, `references/anti-patterns.md` |
| 4. Imagery | Licensed assets localised and optimised, or a deliberate decision not to use photography | `references/imagery.md` |
| 5. Implementation | The redesign in the existing stack, on a branch | `references/implementation.md` |
| 6. Visual QA | Full-page renders at 1440 / 1280 / 1024 / 768 / 390, defects fixed | `references/visual-qa.md` |
| 7. Self-critique | `templates/critique.md` filled honestly, weak areas fixed, re-rendered | `references/visual-qa.md` |
| 8. Technical QA | Typecheck, build, tests, links, forms, a11y, performance, SEO | `references/technical-qa.md` |

Two gates sit inside this sequence. **Before implementation**, `DESIGN.md` must show all five first-notice things changed and a keep list shorter than replace + create; if it does not, the direction is a refresh and writing code now only makes that expensive to discover. **Before technical QA**, the critique must have no remaining "no" — a weakness you can see in a render is a task, not a caveat for the report.

Do not skip to implementation because the direction "feels obvious". The direction that feels obvious before the audit is usually the generic one.

### Phase 1 — Audit (understand before judging)

Read the repository the way a new design lead would on day one: every page and route, the layout and shared components, the styling system, fonts, colours, logo and icon assets, existing imagery, animation code, SEO/meta, analytics hooks, forms and any server-side behaviour behind them. Then **run the site and look at it** — a screenshot at desktop and phone width of every page. Code tells you what exists; the render tells you what it feels like.

Write the audit down before forming an opinion about the fix. It should answer: what does the company actually sell, who buys it, what is the one thing a visitor should remember, what real proof exists (customers, numbers, product UI, demos), what must be preserved (functional widgets, anchors other pages link to, form ids wired to scripts, API contracts), and why the current design reads as weak — named specifically ("every h2 is the same size", "three identical card grids", "hero is headline + paragraph + two buttons + screenshot").

### Phase 2 — Research (look at real sites, not memory)

If a browser tool is available, open the user's reference site and several premium sites relevant to this company's category and audience — competitors, adjacent categories, and a couple of best-in-class sites outside the category. Screenshot the first viewport of each and note what makes it feel finished: type scale, whitespace, how the product is shown, the role of imagery, section pacing, restraint. Extract *principles*. Copying a reference section-by-section produces a cheaper imitation of someone else's brand, which is a worse outcome than a mediocre original.

If there is no browser access, say so plainly, name what would help (a browser MCP or the built-in preview browser), and continue from the audit — but state in `DESIGN.md` that references were not inspected live.

### Phase 3 — Art direction (derive it, do not pick it)

The direction must come from the company: what it sells, the emotion of the moment it serves, who is buying, and the assets that actually exist. Name the concept in one line that a founder would recognise as *theirs* ("the moment the phone rings", "the ledger", "the workshop floor") and let that drive every choice. Two unrelated companies run through this skill should produce two clearly different sites; if your direction would fit any SaaS company, it is not a direction yet.

Decide, in writing, each of: display and body typography (new families unless the existing ones are a genuine, documented brand asset); a palette built as a system (surfaces, text, lines, one accent); composition philosophy; the hero concept; the product visualisation strategy; the imagery strategy (photography, product UI, illustration, typography-only — chosen, not defaulted); the motion language. Then the four lists: **keep**, **replace**, **remove**, **create**. If `keep` is the longest list, the direction is too conservative — revisit it now, while it is cheap.

Read `references/anti-patterns.md` before finalising the direction and again before implementation. It is the list of things that make a site read as generated.

### Phase 4 — Imagery (optional, but never accidental)

Photography earns its place when it carries the concept (people in the moment the product serves, the environment the customer works in, an abstract that embodies the idea). It does not earn its place as decoration. When you do use it: only genuinely free-licensed sources (watch for paid tiers mixed into search results), download originals into the project's asset system, apply one consistent treatment so the set reads as a series, serve through the framework's image pipeline with explicit dimensions, and record credits. If you cannot fetch images, tell the user exactly which capability to enable rather than shipping placeholders. Product UI rebuilt as faithful fragments, diagrams and pure typography are equally valid choices — often stronger for technical products.

### Phase 5 — Implementation (rebuild the system, not the app)

Work on a branch. Rebuild the visual system from tokens upward — type scale, palette, spacing rhythm, surfaces, motion — then the shared primitives (nav, footer, buttons, section wrappers, headings), then pages. Keep business logic, routes, forms, ids and server contracts exactly as they are; restyle around them. Stay in the existing framework and add dependencies only when a capability genuinely needs one. Give the page rhythm through *different compositions per chapter* (typographic, product-dominated, photographic, split, index, closing) instead of one section template repeated. Show the product instead of describing it: real screens as HTML fragments with clearly illustrative sample data, a live demo if the product has one. Text always gets its own solid ground — never sit copy on the busy part of a photograph.

### Phase 6 — Visual QA (you cannot judge a redesign from source)

Run the site and capture full pages at 1440, 1280, 1024, 768 and 390. Look at the captures, not the code. Check overflow, wrapping, cropping, alignment, whitespace, sticky and fixed elements, the open mobile menu, hover and reveal states, and every interactive widget in each of its states. Fix what you find and re-capture. `references/visual-qa.md` covers reliable capture methods and the rendering traps that bite most often.

### Phase 7 — Self-critique (the honest pass)

Put the old first viewport next to the new one and ask whether a stranger would call them two generations of the same site or two different companies' work. Fill `templates/critique.md`: memorable first viewport, distinctive typography, visual rhythm, repetition, card count, purposeful imagery, product shown not described, anything that reads as AI-generated, intentional mobile, credible next to the researched references. Every "no" becomes a fix, not a sentence in the final report. Re-render after the fixes. It is normal for the first implementation to fail this pass; the skill expects at least one iteration.

### Phase 8 — Technical QA and hand-off

Typecheck, lint, build and test with the project's own commands. Click every nav link, CTA and footer link; submit every form; exercise every widget; check the mobile menu, keyboard focus, contrast, reduced-motion behaviour, image loading (lazy below the fold, eager for the hero), metadata and social image, analytics hooks. Commit with a message that explains the direction, push the branch, and use the project's preview mechanism if it has one. Do not deploy to production unless the user asks.

## Reporting

Lead with what changed and why, in the user's language. State what was verified and how (renders at which widths, which flows exercised, which commands passed). State plainly what was left out and why (missing proof, missing assets, missing capability). Share the before/after captures. Ask for a decision only where the user genuinely owns it: production deployment, unresolved facts, brand assets only they have.

## When to stop and ask

Only when blocked by something the user must do: credentials, a paid resource, a capability the environment lacks (browser, image download) that the result materially depends on, or a factual question the repo cannot answer (a price, a claim, a legal line). Everything else — including the creative direction — is your call to make and defend.
