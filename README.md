# website-redesign — a Claude Code skill

A skill that makes Claude Code redesign an existing website **or web product** — or build a business's first site from its social media — the way a good studio or product team would. It covers marketing sites, SaaS apps, dashboards, ecommerce, docs, fintech, public services and mobile-first products. The loop:

1. Frame the problem.
2. Audit and measure what exists.
3. Research by problem.
4. Derive a direction from the company's own truth.
5. Build a token and component system.
6. Rebuild in the existing stack.
7. Verify renders, accessibility, responsiveness, performance and truth-parity.
8. Critique against objectives, and iterate.

> Preserve the company's truth and its functionality — not its existing visual implementation.

It is built against three failures:

- **The refresh disguised as a redesign.** On a marketing site: same fonts, same palette, same hero, nicer components.
- **The model's prior.** The look every generated site converges on: the SaaS card kit, AI purple, or the "tasteful" cream, serif and mono recipe this skill itself used to produce. Two companies run through the skill should not come out as siblings.
- **Judging a work tool like a landing page.** A dashboard used all day, a checkout and a government form are measured by task success, errors, time and accessibility, not by how different they look. The skill classifies every route before it designs anything.

## What it does

| Phase | What happens |
| --- | --- |
| 0. Frame | Each route is classified: category, how often it is used, stakes, expressive or productive. Intensity is chosen (refine / redesign / rethink). A brief with top tasks, constraints and success measures goes at the top of `DESIGN.md`. When context is thin (a brand that lives on social media, an unfamiliar industry, no references, a "website" that is really an ordering or booking app, an empty folder), discovery builds it first (`discovery.md`, `templates/PRODUCT.md`); a signature feature — a builder or configurator people play with — is classified as its own route and never shrunk to fit a page. |
| 1. Audit | Read the repo like a new design lead. Run the product and **measure** it with the scripts. List what must be preserved (routes, ids, form fields, analytics, legal copy) and which accessibility features already work. |
| 2. Research | References are chosen by the problem they solve, and principles go into a take/leave table. |
| 3. Direction | **Expressive:** concept, candidates, typography, a named colour strategy, composition, imagery, motion. **Productive:** interaction model, density, navigation, elevation, and a marketing site's brand layer carried into the product without its expressive devices. Convergence checks run against the model's prior and against the ledger of past outputs. The accessibility decisions are made here too. |
| 4. System | Three-tier tokens, type sets per surface, a state matrix, and `SYSTEM.md` for product UI. |
| 5. Build | On a branch, in the existing framework and component library, with functionality untouched. |
| 6. Verify | Captures at five widths plus states and artwork. Measured audit, scripted accessibility checks and widget keyboard contracts, then responsive and performance passes. |
| 7. Critique | A fresh-context reviewer works from the renders only, in at most three rounds. |
| 8. Hand-off | Build and tests, then `parity.mjs` against the old site, or against the discovery sources for a first site (no unsourced claims, no lost routes or fields). Then commit, report, and add a row to the ledger. |

The knowledge base behind it is written as checkable rules with their numbers and sources:

- design, colour and type theory
- UI/UX heuristics
- product-UI patterns (states, density, type for daily use, tables, forms, notifications, dashboards, brand moments and sign-in, visual comfort)
- design systems
- WCAG 2.2 accessibility decided at design time
- responsive and performance budgets
- motion
- real-time 3D and signature interactive experiences
- data visualisation
- Arabic and multilingual typography
- logo construction
- a curated, licence-checked resource layer: components, icons, illustration, photography, fonts, colour tools, motion and chart libraries, QA tools

## The scripts

Measurement replaces guesswork wherever something can be measured. All are in `skills/website-redesign/scripts/`, built on Playwright:

| Script | Answers |
| --- | --- |
| `capture.mjs` | What does every page look like at each width, with reveals finished and images decoded? Also: element shots, reduced-motion, dark, no-JS and forced-colours renders, removal-test variants, and `--gpu` for WebGL, with the renderer printed. |
| `audit.mjs` | What is measurably wrong, judged by the rules for `--kind` marketing, app, field, commerce, docs or service? Checks overflow and phone zoom-out, contrast on the painted ground, invisible focus, targets, fake controls, clipped text, colour-only status, hidden content, fonts that never loaded, LCP/CLS, axe-core, mixed digit systems and misaligned numeric columns, untranslated strings, finish defects (widows, non-concentric corners, dead bands), and generic-look signals. Also: `--themes light,dark`. It fails on rendered monospace unless `--allow-mono`, and exits 1 on fails. |
| `a11y.mjs` | What would keyboard, screen-reader, zoom, forced-colours or colour-blind users hit that rule engines miss? |
| `widgets.mjs` | Do custom widgets keep their keyboard contracts (dialog, tabs, disclosure, live region, form errors, menu button)? |
| `states.mjs` | What does each widget look like loading, empty, failing, offline, stale, with 200 items, open or focused? It drives these states from mocked routes and steps, and flags a scenario or step that changed nothing. With `--aria --each` it drives task walkthroughs: touch taps and swipes, a capture per step, and the accessibility tree marked with what a sighted user cannot read on that screen. `--axe` scans each state with axe-core, overlays open. |
| `parity.mjs` | Did the redesign add unsourced claims, or drop routes, ids, form fields, analytics `data-*` hooks, form submissions or metadata? `--greenfield` for a first site: every claim must appear in `--source`. |
| `contrast.mjs` | WCAG 2 and APCA for any colours or token file. |
| `palette.mjs` | Samples a logo's colours and builds 12-step OKLCH role scales with solved text steps. |
| `fonts.mjs` | What can this font file actually do? Axes, tabular figures per digit system (Latin, Eastern Arabic, Persian), features, scripts; `--fallback` prints a metric-matched fallback `@font-face`. |
| `perf.mjs` | How fast is each page on a throttled phone, old against new, when Lighthouse cannot run (or alongside it)? LCP and its element, CLS, TBT, transfer by type; broken baselines named. |
| `compare.mjs` | Before/after sheets, blurred squint sheets, pixel diffs. |

Every script takes `--storage seed.json` to seed localStorage, sessionStorage or cookies, so a filled basket or a signed-in view can be audited.

Requirements: Node ≥ 18, `npm install` in `skills/website-redesign/scripts/`, and a Chromium. The scripts find Playwright's browsers on disk; set `CHROME_PATH` to choose one, or run `npm run browser`. They work offline against a local dev server. For an application you also need a way to run it locally with realistic data — screens are judged with real volumes, not empty states alone. In Git Bash on Windows, set `MSYS_NO_PATHCONV=1` or pass `--paths` without the leading slash.

## Install

**Copy into Claude Code's skills folder** (personal, available in every project):

```bash
git clone https://github.com/AbdulHadi404/website-redesign-skill.git
cp -r website-redesign-skill/skills/website-redesign ~/.claude/skills/website-redesign
cd ~/.claude/skills/website-redesign/scripts && npm install
```

To install for one project only, copy it to `<repo>/.claude/skills/website-redesign` instead.

**Or as a plugin** (Claude Code plugin marketplace):

```bash
claude plugin marketplace add AbdulHadi404/website-redesign-skill
claude plugin install website-redesign@website-redesign-skill
```

Restart the session (or open a new one) so the skill is listed.

## Use

Ask in plain language. The skill triggers on redesign, rebrand, "make it premium", "looks generic" and "fix the UX" requests. You can also invoke it directly:

```
Use the website redesign skill to redesign our marketing site. We sell fleet
insurance to logistics companies; don't invent stats we don't have.
```

```
We only have an Instagram page. Build our first website — and a way for
customers to order custom cakes.
```

```
/website-redesign — our admin dashboard is cluttered and people miss alerts.
Audit it and fix the UX without touching the API.
```

```
Our app no longer looks like our new marketing site. Bring the product into
the same brand — but people use it all day, so keep it readable, dense and
accessible.
```

```
Our checkout converts badly on phones. Redesign the flow; keep the payment
integration and analytics events exactly as they are.
```

Claude writes a `DESIGN.md` (with a `PRODUCT.md` before it when a site is becoming an application, and a `SYSTEM.md` for product UI) in the repo, works on a branch, and reports with before/after captures and the measured results. It stops to ask only for things you own: credentials, a capability the environment lacks, a fact the repo cannot answer, a paid resource, a component-library migration, downloading your social media, creating accounts, pushing a new repository to a remote, or a production deployment.

**Recommended:** a browser capability so live references can be inspected, and network access to image sources for photography. Without them the skill says what it could not do rather than faking it.

## Layout

```
skills/website-redesign/
  SKILL.md                 the workflow, commitments, gates, scripts and knowledge-base map
  references/
    framing.md             classifying surfaces, intensity, the brief, the question bank
    categories.md          category dials and playbooks (marketing, app, dashboard, commerce, …)
    discovery.md           Phase 0 for thin context: triage, social audit, domain learning, product/app thinking, signature experiences
    audit.md, research.md, art-direction.md
    design-theory.md       fundamentals, colour, typography — with numbers
    design-systems.md      tokens, reuse before reinvention, component libraries
    app-ui.md              product UI: states, density and type, navigation, tables, forms, dashboards, sign-in and brand moments
    ui-ux.md, web-design.md
    accessibility.md       WCAG 2.2 AA by decision point, native-first map, scripted + manual checks
    responsive.md, performance.md, motion.md, dataviz.md, multilingual.md
    realtime-3d.md         signature real-time 3D: two passes, benchmarks, quality per ms, pipelines, adaptive quality
    imagery.md, logo-design.md, implementation.md, visual-qa.md, technical-qa.md
    anti-patterns.md       the model's prior, hard bans, purpose-gated techniques, tells
    lessons.md, ledger.md  every correction so far; every finished output
    resources/             licence-checked components, assets, type and colour, libraries, tools, inspiration
  templates/               DESIGN.md, SYSTEM.md, PRODUCT.md, critique.md
  scripts/                 the measurement scripts above
research/                  the evidence behind 2.0: audit, research streams, experiments, labs, blind evaluations
tools/check-skill.mjs      repository check (frontmatter, cross-references, script syntax), run in CI
tools/regress.mjs          the scripts against pages with known defects and clean pages (tools/regress/fixtures, the a11y lab), run in CI
```

## Licence

MIT. Some rules are paraphrased from other open-source design skills and guidelines; see `NOTICE.md`.
