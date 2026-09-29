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
| 5. Build | On a branch, in the existing framework and component library (for a first site, the stack chosen in discovery, `discovery.md` §6), with functionality untouched. |
| 6. Verify | Captures at five widths plus states and artwork. Measured audit, scripted accessibility checks and widget keyboard contracts, then responsive and performance passes. |
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
- real-time 3D and signature interactive experiences
- data visualisation
- Arabic and multilingual typography
- logo construction
- a curated, licence-checked resource layer: components, icons, illustration, photography, fonts, colour tools, motion and chart libraries, QA tools

## The scripts

Measurement replaces guesswork wherever something can be measured. All are in `skills/website-redesign/scripts/`; the ones that load pages are built on Playwright:

| Script | Answers |
| --- | --- |
| `capture.mjs` | What does every page look like at each width, with reveals finished and images decoded? Also: element shots (`--element`), reduced-motion, dark, no-JS and forced-colours renders (`--reduced-motion`, `--dark`, `--no-js`, `--forced-colors`), removal-test variants (`--variant`), and `--gpu` (or `--headed`) for WebGL. It reports overflow, phone zoom-out and text cut at the viewport edge, and prints the WebGL renderer for the first page with a `<canvas>`, flagging a software one. Options: `--base`, `--paths`, `--widths`, `--height`, `--dpr`, `--label`, `--out`, `--mode` (`grow` or `fullpage`). |
| `sweep.mjs` | What breaks between the widths a capture looks at? Every width from 320 to 1920 and the 200% and 400% zoom equivalents: overflow, text cut at the edge, clipped, truncated and overlapping text, wrapping navigation, squeezed targets, distorted images, the h1 or main action falling below the fold, and the breakpoints, merged into width ranges with a contact sheet of the worst widths. Options: `--url`, or `--base` and `--paths`; `--from`, `--to`, `--step`, `--widths`, `--height`, `--device`, `--out`. |
| `audit.mjs` | What is measurably wrong, judged by the rules for `--kind` marketing, app, field, commerce, content, docs or service (a signature route runs `app` for its chrome and controls; `signature`, `configurator`, `builder`, `studio` and `visualiser` or `visualizer` are aliases)? Checks overflow and phone zoom-out, text cut at the viewport edge, contrast on the painted ground, invisible focus, targets, fake controls, clipped text, colour-only status, hidden content, fonts that never loaded, text under 12 px, LCP/CLS, axe-core, mixed digit systems and misaligned numeric columns, untranslated strings, finish defects (widows, non-concentric corners, dead bands), and generic-look signals. Also: `--themes light,dark` (or `no-preference`), with `--theme-key` for a stored choice. It fails on rendered monospace unless `--allow-mono`, rolls axe findings up by rule (`--no-axe` skips axe-core), and exits 1 on a fail or a page it could not audit (2 on a bad `--kind` or theme, or a `--theme-key` without a key). Options: `--base`, `--paths`, `--widths`, `--height`, `--out`, `--focus N`. |
| `a11y.mjs` | What would keyboard, screen-reader, zoom, forced-colours or colour-blind users hit that rule engines miss? It audits what is rendered, so a wizard is run once per step. Options: a `<url>`, `--width`, `--height`, `--tabs N`, `--out`. |
| `widgets.mjs` | Do custom widgets keep their keyboard contracts (dialog, tabs, disclosure, live region, form errors, menu button)? The contracts are a small JSON of selectors, with `"before"` set-up steps and the activating `"keys"`; `--device` (`phone`, `tablet`, `desktop`) or `--width` and `--height` set the viewport, and a contract can carry its own `"device"` or `"viewport"`. A message counts as announced when it reaches a live region or when focus moves to the message itself; a toast that takes focus fails. |
| `states.mjs` | What does each widget look like loading, empty, failing, offline, stale, with 200 items, open or focused? It drives these states from mocked routes and steps, flags a scenario or step that changed nothing, and says why a failing step's target refused. With `--aria --each` it drives task walkthroughs: touch taps and swipes, a capture per step, and the accessibility tree marked with what a sighted user cannot read on that screen. `--axe` scans each state with axe-core, overlays open; a critical or serious violation fails the state, and so does a scan that missed what the state opened (`"axe": "no-scroll"` scans that state without scrolling, `"axe": false` skips it). `"record"` keeps each build's requests under its `--label`, for `parity.mjs --payloads`. Options: `--base`, `--out`, `--only a,b`, `--gpu`, `--headed`. |
| `motion.mjs` | Does the approved motion exist in the build, and does it survive reduced motion? Without a spec it audits what moves (`transition: all`, animated layout properties, durations off the tokens, linear easing, hover and focus that change nothing, loops that never sleep, reduced-motion handling); with `--spec` (a `motion-spec` block in `DESIGN.md`, or JSON) it triggers each entry and samples every frame, normally and under reduced motion, and `--filmstrip` draws the frames. Options: a `<url>` (or `--url`), or `--base` and `--path`; `--device` (`desktop` or `phone`), `--times`, `--jpeg`, `--no-audit`, `--max`, `--strict`, `--out`. |
| `parity.mjs` | Did the redesign (`--after`) add claims the old site (`--before`) does not source, or drop routes, ids, form fields, analytics `data-*` hooks, form submissions or metadata? Routes come from `--paths` or `--crawl N`; `--derived` lists values computed from data, and `--removed` declares deliberate removals. `--payloads` compares what each build's forms send (`--ignore` for keys that change on every submission). `--greenfield` for a first site: every claim must appear in `--source`. `--out` saves the report. |
| `contrast.mjs` | WCAG 2 and APCA for any colours or token file. |
| `palette.mjs` | Samples a logo's colours and builds 12-step OKLCH role scales with solved text steps. |
| `fonts.mjs` | What can this font file actually do? Axes, tabular figures per digit system (Latin, Eastern Arabic, Persian), features, scripts; `--fallback` prints a metric-matched fallback `@font-face`. |
| `perf.mjs` | How fast is each page on a throttled phone, old against new, when Lighthouse cannot run (or alongside it)? LCP and its element, CLS, TBT, transfer by type; broken baselines and failed requests named on either build, a slower page excused only when the old one lost a file that holds up its largest paint or was an error page, and transfer growth questioned. Options: `--base`, `--paths`, `--before` (the old build), `--runs`, `--device` (`phone` or `desktop`), `--cpu`, `--net` (`slow4g`, `fast4g`, `none`), `--out`. |
| `model.mjs` | What will this glTF model cost? Bytes, triangles, draw calls, textures and their GPU memory, against a `--tier` budget (`mobile`, `desktop`, `scene`) (or `--max-bytes`, `--max-tris`, `--max-calls`, `--max-texture`, `--max-vram`, `--max-materials`), with the gltf-transform command for each line over it. `--json` for a machine-readable report, `--fail` to fail a build. No browser. |
| `compare.mjs` | Before/after sheets (`--before` and `--after`, or `--dir`), blurred squint sheets (`--blur`), pixel diffs (`--diff`), and grids of any captures (`--grid`, `--cols` to wrap them). `--labels` are checked against the file names, so a caption on the wrong panel stops the run (`--labels-as-given` draws them as typed). `--out` names the sheet. |

Every script that loads a page takes `--storage seed.json` to seed localStorage, sessionStorage or cookies, so a filled basket or a signed-in view can be audited. `contrast.mjs`, `palette.mjs`, `fonts.mjs`, `model.mjs`, `compare.mjs` and `parity.mjs --payloads` load none of your pages.

Requirements: Node ≥ 18, `npm install` in `skills/website-redesign/scripts/`, and a Chromium. The scripts find Playwright's browsers on disk; set `CHROME_PATH` or pass `--chrome <path>` to choose one (`a11y.mjs` and `widgets.mjs` read only `CHROME_PATH`), or run `npm run browser`. They work offline against a local dev server. For an application you also need a way to run it locally with realistic data — screens are judged with real volumes, not empty states alone. In Git Bash on Windows, set `MSYS_NO_PATHCONV=1` or pass `--paths` without the leading slash.

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
