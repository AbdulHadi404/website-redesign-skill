# Research behind website-redesign 2.0

This folder holds the evidence for the 2.0 rewrite of `skills/website-redesign/`, carried out on 2026-09-28. The skill is the product; this folder is its lab notebook. Nothing here is loaded by the skill, so it can be long, and it keeps the negative results too.

**Evidence conventions.** The stream reports tag their claims:

- **[V]** verified this session from a primary source (a cloned repository, package data, a standard's source text)
- **[L]** observed in a lab experiment
- **[K]** prior knowledge not re-verified

The environment allowed only GitHub, npm, PyPI and Google Fonts. Most live websites, blogs and documentation hosts returned 403, so live products were studied through their open-source design systems and code, and every browser experiment ran on local fixtures. Where that limits a finding, the report says so.

## Map

| Path | What it is |
| --- | --- |
| `00-skill-audit.md` | The audit of the 1.x skill: strengths worth keeping, weaknesses, inconsistencies (including a capture script that still had the bug its own lessons described) |
| `streams/A-ai-design-skills-ecosystem.md` | ~45 AI design skills, prompts, Cursor rules and MCPs, read from source: what each does well or badly, the ideas worth adopting (ranked), a deduplicated catalogue of AI-UI tells, verification-loop techniques, rejections, licensing |
| `streams/B-components-and-design-systems.md` | Component libraries and design systems as of 2026-09 (what changed since 2025, measured bundle costs, a decision guide); what mature systems agree on for state matrices, tokens, type, density, forms, errors, notifications, navigation, tables and documentation |
| `streams/C-assets-typography-colour.md` | Icons, illustration, photography, patterns, placeholders, fonts and colour tools, each with a licence class, and the traps (Google Fonts feature stripping, Fontshare FFL, Remix Icon's mark clause, Lucide brand-icon removal) |
| `streams/D-accessibility.md` | WCAG 2.2 by decision point, native-first primitives and APG contracts, forms, live regions, forced colours, tables and charts, cognition; a tool lab measuring what each engine catches on 60 seeded defects |
| `streams/E-responsive-mobile-performance.md` | Responsive principles with numbers, performance budgets per product type, the UI-decision → metric map, and a lab of font CLS, fluid type, viewport-unit and bundle experiments |
| `streams/F-motion-3d-dataviz.md` | Motion jobs, gates, tokens and techniques (support checked), reduced-motion behaviour of the major libraries, 3D and WebGL guidance, chart choice and chart-library costs, with a lab |
| `streams/G-practice-products-antipatterns.md` | How professional designers and design engineers work; product-category playbooks; measured data from excellent real products (via their open-source systems); a catalogue of AI-UI tells with detection methods; originality |
| `experiments/01-qa-tooling.md` | The hands-on tool evaluation that produced the skill's scripts: fixtures, per-tool verdicts, the 13 findings that changed the skill |
| `experiments/a11y-lab/` | Flawed and fixed SaaS pages (60 seeded defects with ground truth), tool runners, contracts, results and the detection matrix. Its scripts became `scripts/a11y.mjs` and `scripts/widgets.mjs` |
| `experiments/E-responsive-performance/`, `experiments/F-motion-lab/`, `experiments/G-product-lab/` | The labs behind streams E, F and G (scripts, pages, measurements) |
| `experiments/H-blind-eval/` | Fresh agents ran the revised skill end to end on fixture companies (round 1: a marketing redesign and a field-tool app fix; round 2: a bilingual Arabic/English invoicing dashboard; round 3: an ecommerce tile shop with a checkout rethink; rounds 2–3 on frozen snapshots) and wrote what worked, what was wrong and what the scripts got wrong; what changed as a result |
| `experiments/I-arabic-numerals/` | Digit systems, bidi marks, sign placement in RTL tables, tabular Eastern Arabic digits across 29 families, `type="number"` dropping Arabic digits, and `ar-SA` dates defaulting to Hijri in Chromium but Gregorian in Node — each turned into rules in `multilingual.md` §2a and a per-digit-system check in `fonts.mjs` |
| `experiments/L-fresh-review/` | A fresh-context reviewer against the builder's self-review on the same captures: 22/22 "yes" against two "no", five partials and a violated "breaks if"; why self-review missed them, and the critique checks added |
| `experiments/K-walkthrough/` | Task walkthroughs from captures: a fresh agent attempted two farmer tasks on the old and new herd screens. What it caught that checklists miss, where the tree and selector scrolling overstated success, and the driver changes that followed (marked tree, touch taps and swipes, dead-step detection) |
| `experiments/J-real-site-robustness/` | The scripts run on real code (AstroWind on Astro's dev server; the shadcn-admin React/Radix dashboard): 21 process errors — dev-server reloads, toolbars, transitions, smooth scroll, sr-only text, oklch colours, runtime CSS variables, scrollers, `<details>`, clipboard — found and fixed, with the fixtures as a regression set |

## What was tested hands-on

- **Capture**: viewport growth with viewport-unit pinning versus full-page capture; mobile layout-viewport widening; step scrolling with animation finishing; image decode; the flat-image self-check.
- **Measurement**:
  - contrast on the painted ground (`elementsFromPoint`) and WCAG 2 versus APCA on dark grounds
  - focus visibility by property change and by pixel diff
  - clipped content, colour-only status, invisible-without-JS content
  - unavailable web fonts behind a TLS proxy
- **Accessibility engines** on the same 60 seeded defects: axe-core, HTML_CodeSniffer via pa11y, Lighthouse, IBM Equal Access, plus the scripted layer. Also a false-positive calibration on W3C APG example pages and GOV.UK Frontend.
- **Palette generation**: APCA-only versus dual APCA + WCAG solving for text steps.
- **Font files**: Google Fonts versus upstream features and axes; tabular figures across Latin and Arabic families.
- **Motion**:
  - scroll-driven reveal ranges
  - View Transition reduced-motion guards
  - `linear()` springs
  - library sizes and defaults
- **Performance**:
  - font fallback metrics and CLS
  - fluid type zoom behaviour
  - chart and component bundle costs
  - `content-visibility`
- **Tools**: dembrandt, colorjs.io, fontkit, pixelmatch, Lighthouse, unlighthouse, svgo, sharp, css-analyzer, purgecss and knip were each installed and run. Verdicts are in `experiments/01-qa-tooling.md`.
- **Blind evaluations** (experiment H): fresh agents ran the whole skill on four fictional companies, each in a different category — a marketing site, a field tool, a bilingual financial dashboard and an ecommerce storefront (a public-service form is round 4). Rounds 2 onward ran on frozen snapshots; every finding was reproduced, fixed and added to the regression set.
- **Task walkthroughs** (experiment K): an agent attempting farmers' tasks from captures, and the driver changes that stopped the accessibility tree and selector scrolling from overstating success.
- **Figures in the type shortlist**: every family in `type-and-colour.md` checked with `fonts.mjs --google` (three had no tabular figures, one of them listed as having them).
- **`perf.mjs` against a hand-written probe**: the same pages within 25 ms of LCP.
- **The regression set** (`tools/regress.mjs`, run in CI): the a11y lab, GOV.UK Frontend, slop and dashboard fixtures, finish defects, the old Milkline and Sanad builds, parity on an Arabic pair, storage seeding, card links, clipped versus covered images, CLS and TBT. A deliberate break fails it; its first CI run caught a font-dependent expectation, now moved to a deterministic fixture.

## Principles the research converged on

1. **Frame before designing.** A dashboard used all day, a checkout and a landing page need different rules. The category and the intensity (refine / redesign / rethink) decide density, motion budget, colour's job and the success metrics.
2. **Measure whatever can be measured.** Keep judgement for hierarchy, fit and finish, and make that judgement from renders, never from source.
3. **The model's prior is a set of clusters, and the old skill had its own.** Convergence is checked, not wished away: the similar-brief test, the category test, the second-order test and a ledger of past outputs.
4. **Derive from the company.** Logo colours and wordmark construction come first; references are chosen by the problem they solve; principles are extracted, never sections.
5. **Accessibility is decided at art direction.** Rule engines see about a third to a half of barriers. Scripted keyboard, zoom, forced-colours and widget-contract checks bring most of the rest into view. A residue always needs a human or real assistive technology.
6. **Licences are part of the design.** Every resource has a class (A free, B credit required, C share-alike or restricted, D proprietary), checked at source and dated.
7. **Mechanical lessons go into scripts.** A rule in prose that no tool performs is how the 1.x capture bug survived three lessons.

## Rejected (and why), in brief

Full lists: A §6, C §11, F §5.

- **Category → palette lookup skills** (ui-ux-pro-max): they produce exactly the category default.
- **Brand-clone DESIGN.md libraries**: they are imitation. Only their section conventions were kept.
- **Refresh procedures and "make fake data look real" advice** (parts of taste-skill): these conflict with the truth commitment.
- **Costume presets and rotation menus**: they reintroduce convergence.
- **Random-draw creative direction and pixel-diffing against generated comps**: heavy, and they conflict with deriving a direction from the company.
- **Leaked product prompts** (GPL or proprietary): used as evidence of tells only.
- **Lighthouse's accessibility score as a gate**: it went from 46 to 100 between two pages sixty defects apart.
- **pa11y's defaults**: they promote needs-review items to errors, and it has no WCAG 2.2 rules.
- **An `--ibm` flag in `a11y.mjs`** (injecting IBM's `accessibility-checker-engine`). Measured against what the skill already runs (axe with experimental rules, plus `a11y.mjs` and `widgets.mjs`) on the lab's 61 seeded defects, IBM adds one new signal: a redundant `role=navigation`, which is not a barrier. It also upgrades four warnings to failures (a radio group without a fieldset, an unlabelled SVG chart, a dangling `aria-describedby`, `aria-label` on a generic `div`). In exchange it produces five violation-level false positives on the clean page. Coverage goes from 56 to 57 defects with any signal, and from 47 to 51 as failures, at the cost of noise the agent would have to disprove.
- **Resources rejected on staleness, consent or licence grounds**: Feather, UI Faces, placeholder hosts, Material Symbols' full font, AI-generated "customers".

## Open items and future work

- **Re-verify [K] items when network access allows**:
  - WebAIM Million category shares
  - ADA Title II dates
  - EAA transposition
  - Highcharts accessibility options
  - NN/g navigation numbers
  - Russell's budget table
- **Live-site studies** (Linear, Stripe, Shopify admin, GOV.UK services) with `dembrandt` and `capture.mjs` once egress allows. The product-lab probe (`experiments/G-product-lab/ui-probe.js`) is ready for it.
- **A small corpus of before/after redesigns** to regression-test the skill's taste checks. The ledger and its shipped captures (`skills/website-redesign/references/ledger/`) are the start of it; the four blind-test outputs are the first entries.
- **A real-device performance pass** on a mid-range Android phone (backdrop-filter, shadows, long lists). `perf.mjs` ranks builds; it does not predict field data.
- **Screen-reader and real-user checks.** Every evaluation so far ended at "no screen reader available" and "no users". A VoiceOver and NVDA smoke test of one blind-test output would calibrate how much of `a11y.mjs` and `widgets.mjs`'s PASS survives real assistive technology.
- **Categories not yet run blind:** docs and developer tools, enterprise admin, a mobile-first consumer app, a content or editorial site.
- **The fresh-context reviewer** was exercised once (experiment L, one subject); a second subject and a second reviewer per subject would show how much of its result is reviewer taste.
