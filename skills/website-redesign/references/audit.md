# Phase 1 — Audit

Goal: understand the company, its users and the current product well enough that the redesign is *about them*, with every weakness named, measured where it can be, and rated. Do not propose fixes yet; a diagnosis written before the investigation is finished is where generic redesigns begin.

With no site (a first site from social media, an empty folder), `discovery.md` supplies §2 (the company) from `discovery/brand-audit.md`; the other sections run on whatever the customer meets today — the social profile, a competitor's template, a PDF menu — which stands in for the old site in every later check (`discovery.md`, "When there is no old site").

## 1. The repository

Read, do not skim:

- **Framework and build**: package manifest, config, scripts (`dev`, `build`, `lint`, `test`, `typecheck`); the deployment target and whether pushes deploy anything.
- **Routes and pages**: every page, including legal, error and utility pages; dynamic or server-rendered routes and what they depend on. Classify each (`framing.md`).
- **Layout and shared components**: nav, footer, section wrappers, buttons, headings, and — for product UI — the component inventory (what exists, where it is reused, what is one-off).
- **UI stack**: the primitive layer, styled kit, table/grid, forms, toasts, date picker, charts, icon set, animation library. For each: version, last release, maintenance and **licence** (`npm view <pkg> version time.modified license`). Flag deprecated or unmaintained packages and licence traps (commercial tiers, restricted-use systems, relicensed majors) — `resources/libraries.md` lists the known ones. The stack is restyled, not replaced (`design-systems.md`).
- **Styling system**: tokens, global CSS, utility framework, fonts (families, weights, where and how loaded, licences), palette, radii, shadows, breakpoints.
- **Brand assets**: logo files, favicon, icon sets, guidelines. **Sample the logo's actual colours** (`scripts/palette.mjs --from logo.svg`) and describe the wordmark's construction (geometric, humanist, serif, techno, condensed). For a social-first brand, also sample the newest consistent photo set (`scripts/palette.mjs --from photo.png`; it reads PNG, so convert JPEG first) — its backdrop can carry the brand better than a clip-art logo (`discovery.md` §2). Verify extracted files are real (an SPA often returns an HTML shell for a missing SVG: check with `file` or the first bytes). Collect in order of value: the logo, real product imagery or UI, colours, fonts, mood words.
- **Imagery**: real screenshots, photos, illustrations, video — their licences and their resolution (a 540 px reel cover cannot carry a hero). Real product UI is the most valuable asset a marketing site can have; find out whether the product runs locally for capture.
- **Motion**: animation code, reveal systems, scroll effects, reduced-motion handling (and whether content is hidden until a script runs).
- **SEO and meta**: titles, descriptions, canonical, Open Graph and social image, structured data, sitemap, robots.
- **Analytics, forms and integrations**: tracking snippets and events, form handlers, API routes, embeds (captcha, chat, booking), ids and data attributes scripts depend on.
- **Content**: every headline, claim, number, customer name, price. Copy is a source of truth for what the company believes it sells.
- **Docs and history**: README, design notes, changelog, recent commits.

Write the **preserved-list**: routes, anchors other pages link to, ids and data attributes wired to scripts, form field names, API contracts, analytics events, legal text, embeds. `scripts/parity.mjs` will check it against the new build.

## 2. The company

From the repo and the user, in writing:

- What does the company sell, in one sentence a customer would use? Who buys it, and in what moment?
- The primary value proposition and the two or three strongest capabilities behind it; the pain it removes; the differentiator versus the obvious alternatives.
- What real proof exists: customers, logos, testimonials, numbers, case studies, product UI, a demo, awards. Only what is real — absence of proof is a design constraint, not a gap to fill.
- What should a visitor remember? If the product has a distinctive *moment* — a call answered, a shipment scanned, a number updating live — name it; concepts are built from moments, not adjectives.

## 3. Users and tasks

For productive surfaces this section outweighs the one above: audit use, not impression. Who uses it, how often, on what device, under what pressure; the top tasks (≤ 5) with their evidence, confirmed by the user or marked as assumptions (`framing.md` §4). On a productive surface, add:

- **Frequency**: sort the tasks into daily, weekly and once, taken from the navigation, the data model, analytics or the user. The daily ones are designed first (`app-ui.md` §1).
- **Roles and permissions**: who sees which screens, and what a member without admin rights sees. Write one `--storage` seed per role, so every script audits each role's view.
- **Data at real volume**: seed it as §5 describes before walking any task.

For each top task, walk it in the running product, signed in as the role that does it: steps, fields, decisions, waits, dead ends, and anything the user must remember between screens. Mine whatever evidence exists — analytics, search logs, support tickets, reviews — for what people struggle with and the words they use; cite counts, never invent them.

## 4. The brand family

**Look at the company's other surfaces before deciding anything** — parent company, sibling products, the app, a deck. Record, with captures and sampled values: mark and construction, display and text faces, palette, imagery, tone.

- **What the family already owns**: a display face used across the parent and every product is a documented brand asset, except a monospace face, which is not inherited unless this audience reads code (commitment 5 in `SKILL.md`). The mark's construction is one too. Those survive unless the user says the identity itself is the problem.
- **Where this product must differ**: a sibling is not a competitor — *the same house, a different room*.
- **What a productive route takes**: the brand layer only — mark, colour roles, the display face for one job, status vocabulary, tone — never the site's type scale, layouts or hero imagery (`app-ui.md` §1). The seam test (`art-direction.md` §5) compares brand layers, not layouts: "match the site" never means "replicate the site".

A redesign drawn without this step produces a good-looking orphan.

## 5. The rendered product — look, then measure

Run the project and look at every page at desktop and phone width (`visual-qa.md` for capture). Before judging a productive route, run it with realistic data seeded locally: the longest names, the most rows, zero rows, the error rows (`states.mjs` fixtures); empty states alone prove nothing. When the project has no way to seed such data, ask for one (a seed script, a test account) before auditing. Then measure:

```bash
node scripts/audit.mjs --base http://localhost:3000 --paths / /pricing --widths 1440,390 --kind marketing --out audit/before
node scripts/audit.mjs --base http://localhost:3000 --paths /app /app/settings --widths 1440,390 --themes light,dark --kind app --out audit/before-app   # one --kind per category; every route of a productive surface
npx dembrandt http://localhost:3000 --wcag --save-output      # optional: the site's actual token set
node scripts/a11y.mjs http://localhost:3000/ --out audit/before-a11y   # per key template
```

`audit.mjs` runs in every theme the site has (`--themes light,dark`) and, on a productive surface, on every route (the route list, or `parity.mjs --crawl`); `states.mjs --axe` scans overlays (menus, dialogs, the phone drawer) in their open state and every stepped state (`accessibility.md` §10). `audit.mjs` gives the baseline: type sizes in use and their shares, families and whether they load, rendered monospace, contrast failures on the real ground, invisible focus, targets, overflow and phone zoom-out, clipped and colour-only content, content hidden without JavaScript or under reduced motion, headings and landmarks, image problems, console errors, LCP/CLS, axe-core, and the generic-look signals. dembrandt (MIT; when it cannot download its own browser, start one with `chrome --headless=new --remote-debugging-port=9222 &` and set `BROWSER_CDP_ENDPOINT=http://localhost:9222`) extracts the token set actually in use — palette with roles, type styles, spacing, radii, shadows, motion — which is the objective version of "the five things a stranger notices first". Treat its role labels as guesses; on a small stylesheet it adds little beyond `audit.mjs`. `a11y.mjs` adds the keyboard, focus, zoom, spacing, forced-colours and colour-vision baseline. Record the accessibility baseline: contrast of every text token on every surface it appears on, input borders and focus rings against 3:1, targets, keyboard walk, phone layout. List the barriers *and the accessibility features that already work* (skip link, live regions, labels, error pattern, reduced-motion code, `lang`, captions) — the redesign must not lose them, and must beat the baseline: every recorded barrier fixed or justified (`accessibility.md` §1).

Then name the weaknesses specifically — vague diagnoses produce vague fixes:

- Typography: same size everywhere, no display scale, default weights, no measure control, headlines wrapped by chance — or, in an app, marketing sizes and too many sizes. Anywhere: a monospace face for an audience that does not read code.
- Composition: one section template repeated; everything centred and the same width; no chapters — or, in an app, card soup and no elevation model.
- Hero: headline + paragraph + two buttons + a screenshot or a blob.
- Colour: used decoratively rather than as a system; accent on everything; status by colour alone.
- Imagery: none, or stock that could belong to anyone. Product: described, never shown.
- Motion: none, generic fade-ups on everything, or motion on frequent actions.
- Mobile: desktop squeezed; tables overflowing; navigation hidden without a label.
- States: blank empties, eternal spinners, unstyled errors.
- Efficiency (productive surfaces): screens where the main object starts below the fold at 1280 × 800, actions that need a round trip, lists without filters, missing keyboard paths, modals that hide the data they refer to.
- Numbers and languages (bilingual, RTL, financial or data-heavy products — read `multilingual.md` §2a now, not at Phase 4): two digit systems on one screen, numeric columns aligned by text direction instead of place value, decimals that vary, dates in an unintended calendar or shifted a day by UTC parsing, `type="number"` inputs that drop Arabic digits, untranslated strings on a language variant. `audit.mjs` measures most of these; the calendar and the arithmetic (do the totals add up, and to what?) need a probe.
- Consistency: nav and footer from another era; secondary pages untouched.

## 6. Heuristic evaluation and walkthrough

Run the evaluation the way professionals do, adapted for one agent:

1. **Several independent passes, each with one lens**: Nielsen's ten heuristics (`ui-ux.md` §1); a first-time visitor with the persona written down; keyboard only; a 390 px phone with a thumb. Record findings only — no severity yet.
2. **Merge and deduplicate**, then **rate severity in a separate step** (rating while discovering is unreliable): 0 not a problem · 1 cosmetic · 2 minor · 3 major · 4 catastrophe — from frequency × impact × persistence, plus market impact on commercial flows.
3. **Cognitive walkthrough of the top three tasks**: at each step ask (1) will the user try to achieve the right effect? (2) will they notice the correct action is available? (3) will they connect the action with the effect they want? (4) after acting, will they see progress? Any "no" is a finding.

Also note the interaction and trust basics: widget states (idle / loading / active / empty / error and the rest of the matrix in `app-ui.md`); forms (field count, labels, validation timing, autofill); targets and the primary action's position on a phone; reading (the headline test, words per chapter, front-loaded headings); credibility (a real organisation, real people, contact, freshness, zero errors); and a performance baseline (field data at p75 if it exists, otherwise Lighthouse at phone emulation — the redesign must not be slower).

## 7. Audit output

Write the audit into `DESIGN.md` ("Brief" and "Audit") using `templates/DESIGN.md`, including the preserved-list, the measured baseline and the rated findings. It is what the direction will be derived from and the record the user can check the reasoning against. Keep the `audit/before` output: the Phase 6 run is compared with it. With no site, run §5 on what the customer meets today when it is a URL you may load; otherwise record that there is no measured baseline, and the new build is held to the `performance.md` §1 budgets.
