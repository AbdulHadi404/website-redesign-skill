# website-redesign — a Claude Code skill

A skill that makes Claude Code redesign an existing website **or web product** — or build a business's first site from its social media — the way a good studio or product team would. It covers marketing sites, SaaS apps, dashboards, ecommerce, docs, fintech, public services and mobile-first products. The loop:

1. Frame the problem; when the context is thin, run discovery before the audit.
2. Audit and measure what exists (for a first site, what the business shows the world today).
3. Research by problem.
4. Derive a direction from the company's own truth.
5. Build a token and component system.
6. Rebuild in the existing stack (for a first site, the stack chosen in discovery).
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
| 0. Frame | Each route is classified: category, how often it is used, stakes, expressive, productive or signature. Intensity is chosen (refine / redesign / rethink). A brief with top tasks, constraints and success measures goes at the top of `DESIGN.md`. When context is thin (a brand that lives on social media, an unfamiliar industry, no references, a "website" that is really an ordering or booking app, an empty folder), discovery builds it first (`discovery.md`, `templates/PRODUCT.md`); a signature feature — a builder or configurator people play with — is classified as its own route and never shrunk to fit a page. |
| 1. Audit | Read the repo like a new design lead. Run the product and **measure** it with the scripts. List what must be preserved (routes, ids, form fields, analytics, legal copy) and which accessibility features already work. For a first site, what the customer meets today (a social profile, a PDF menu) stands in for the old site. |
| 2. Research | References are chosen by the problem they solve, and principles go into a take/leave table. |
| 3. Direction | **Expressive:** concept, candidates, typography, a named colour strategy, composition, imagery, motion. **Productive:** interaction model, density, navigation, elevation, and a marketing site's brand layer carried into the product without its expressive devices. Convergence checks run against the model's prior and against the ledger of past outputs. The accessibility decisions are made here too. |
| 4. System | Three-tier tokens, type sets per surface, a state matrix, and `SYSTEM.md` for product UI. |
| 5. Build | The key screen first — built for real, rendered, blurred beside past outputs and reviewed — then the system rolled out on a branch, in the existing framework and component library, with functionality untouched. |
| 6. Verify | Captures at five widths, a sweep of every width, states and artwork, real-content stress. Measured audit, scripted accessibility checks and widget keyboard contracts, responsive, performance and motion-spec passes, then a polish pass, macro to micro. |
| 7. Critique | A fresh-context reviewer works from the renders only, in at most three rounds. |
| 8. Hand-off | Build and tests, then `parity.mjs` against the old site (no unsourced claims, no lost routes or fields), or with `--greenfield` against the discovery sources for a first site (every claim sourced). Then commit, report, and add a row to the ledger. |

The knowledge base behind it is written as checkable rules with their numbers and sources:

- design, colour and type theory
- UI/UX heuristics
- product-UI patterns (states, density, type for daily use, tables, forms, notifications, dashboards, brand moments and sign-in, visual comfort)
- design systems
- WCAG 2.2 accessibility decided at design time
- responsive and performance budgets
- motion
- interactive and signature experiences: when interaction beats a page, interaction level and fidelity, choosing a renderer, configurators, real-time 3D
- data visualisation
- Arabic and multilingual typography
- logo construction
- a curated, licence-checked resource layer: components, icons, illustration, photography, fonts, colour tools, motion and chart libraries, QA tools

## The scripts

Measurement replaces guesswork wherever something can be measured. Sixteen scripts in `skills/website-redesign/scripts/`, regression-tested in CI against pages with known defects; `scripts/README.md` is their manual.

| Script | Answers |
| --- | --- |
| `capture.mjs` | each page at each width, fold and full, with reveals finished and images decoded; element shots; reduced-motion, dark, no-JS, forced-colours, RTL and removal variants |
| `sweep.mjs`, `stress.mjs` | what breaks between widths (320–1920 and zoom); what real content and real networks break |
| `compare.mjs` | before/after, blurred squint, contact and ledger sheets; pixel diffs |
| `audit.mjs` | what is measurably wrong, judged by the kind of surface: contrast on the painted ground, focus, targets, overflow, clipped and hidden content, axe-core, numbers and scripts, an RTL and a phone block, finish, generic-look signals; fails rendered monospace unless the audience reads code |
| `a11y.mjs`, `widgets.mjs` | what keyboard, zoom, forced-colours and colour-blind users hit that rule engines miss; widget keyboard contracts, RTL-aware |
| `states.mjs` | every widget state from mocked routes; task walkthroughs from captures; axe on open overlays; request recording |
| `parity.mjs` | unsourced or dropped claims, lost routes, ids, fields and analytics hooks; what forms send; claims on a first site checked against the discovery sources |
| `perf.mjs`, `motion.mjs` | throttled performance, old against new; whether the approved motion exists and survives reduced motion |
| `contrast.mjs`, `palette.mjs`, `fonts.mjs` | colour pairs; logo, photo and tenant palettes; what a font file can do |
| `model.mjs`, `libcheck.mjs` | what a glTF costs; a library's licence class, activity and size |

Requirements: Node ≥ 18, `npm install` in `skills/website-redesign/scripts/`, and a Chromium (`CHROME_PATH` or `--chrome <path>` to choose one, or `npm run browser`). They work offline against a local server. For an application you also need a way to run it locally with realistic data.

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

Ask in plain language. The skill triggers on redesign, rebrand, "make it premium", "looks generic" and "fix the UX" requests, and on requests to build a business's first site from its social media or to make an app match its marketing site. You can also invoke it directly:

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

Claude writes a `DESIGN.md` (with a `PRODUCT.md` before it when a site is becoming an application, and a `SYSTEM.md` for product UI) in the repo, works on a branch, and reports with before/after captures and the measured results. For a first site the "before" is what the business shows today, and the brief says there is no measured baseline. It stops to ask only for things you own: credentials, a capability the environment lacks, a fact the repo cannot answer, a paid resource, a component-library migration, downloading your social media or reading your stories (which may notify you), creating accounts, pushing a new repository to a remote, or a production deployment.

**Recommended:** a browser capability so live references can be inspected, and network access to image sources for photography. Without them the skill says what it could not do rather than faking it.

## Layout

```
skills/website-redesign/
  SKILL.md                 what decides the outcome, commitments, the path table, phases, gates, the knowledge-base map
  references/
    framing.md, categories.md, discovery.md        Phase 0: classifying routes, category dials, thin-context discovery
    audit.md, research.md                          Phases 1–2
    art-direction.md, design-theory.md             Phase 3: deriving a direction; colour, type and layout with numbers
    anti-patterns.md, lessons.md, ledger.md        the model's prior and the tells; the lessons digest; every past output
    lessons-log.md                                 the full, append-only record behind the digest
    interactive.md                                 when interaction beats a page; signature experiences, configurators, 3D, generative visuals
    design-systems.md, app-ui.md                   tokens and components; product UI
    ui-ux.md, web-design.md, implementation.md, imagery.md, motion.md, logo-design.md
    visual-qa.md, accessibility.md, responsive.md, performance.md, dataviz.md, multilingual.md, technical-qa.md
    resources/                                     licence-checked components, assets, type and colour, libraries, tools, inspiration
  templates/               DESIGN.md, SYSTEM.md, PRODUCT.md, critique.md; code/ (tier.js, governor.js, hero-effect.js)
  scripts/                 the measurement scripts and their manual (README.md)
research/                  the evidence: audits, research streams, experiments, blind evaluations, stage 2, the second-pass audit
tools/check-skill.mjs      repository check (frontmatter, cross-references, script syntax), run in CI
tools/regress.mjs          the scripts against pages with known defects and clean pages, run in CI
```

## Licence

MIT. Some rules are paraphrased from other open-source design skills and guidelines; see `NOTICE.md`.
