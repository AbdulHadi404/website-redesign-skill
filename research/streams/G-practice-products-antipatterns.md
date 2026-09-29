# Stream G: professional practice, product categories, real products and AI-generated UI tells

Research for broadening the `website-redesign` skill from "make a marketing site distinctive" to "redesign any web product appropriately". Written 2026-09-28.

**Scope:** (1) how experienced designers actually work; (2) design philosophy per product category; (3) principles taken from excellent real products, with measured data; (4) a catalogue of AI-generated UI tells with detection heuristics; (5) a method for originality that does not become derivative.

**Environment limits, stated plainly.** This sandbox's egress policy blocked live product sites, NN/g, Baymard, Figma, Linear, Vercel, GOV.UK and the inspiration galleries (403 at the proxy). The work was therefore done in three ways:
- **Primary sources that were reachable.** GitHub (open-source product code and design-system repos), npm (published design-system CSS and tokens), Apple's HIG JSON, and anthropic.com / claude.com.
- **Web-search summaries.** Used for sources that could not be fetched; these are marked *(secondary)* where a number matters.
- **A local rendering lab.** Real design-system CSS was rendered with Playwright/Chromium and measured with a computed-style probe that I wrote and calibrated here. Everything is reproducible from `research/experiments/G-product-lab/`.

---

## 0. The findings that should change the skill (read this first)

1. **Classify before you design (a new "Gate 0").** The single biggest predictor of a right or wrong redesign is the product category and how often people use it. Measured in one company's own code, **Twenty CRM**:
   - **Marketing site.** 16 px root, body 16–18 px, stepped display sizes up to **120 px**, four expressive families (Host Grotesk, Aleo, Azeret Mono, VT323), motion tokens 150–600 ms.
   - **App.** **13 px root**, Inter only, largest size **24 px**, 32 px table rows, 4 px spacing, motion 75 / 150 / 300 ms.
   - Same brand, two philosophies. The site renders its product mockups *at the app's own 13 px size, using the app's real tokens* (`preview-font-size.ts`).

   The skill must choose the philosophy per route: many repositories contain both a marketing site and an app.
2. **The "distance test" is right for marketing and wrong almost everywhere else.** In an app used daily, a checkout, or a government service, visual difference from the old version is not a goal; familiarity is an asset (Jakob's law, muscle memory). In those categories, measure distance in **task success, time and errors**, not in how different the first viewport looks. The same applies to the "keep list shorter than replace + create" gate.
3. **The skill's current house style is now the most recognised AI tell of 2026.** Several sources converge on this:
   - Anthropic's own `frontend-design` skill lists "cream background near #F4F1EA + high-contrast serif display + terracotta accent" as tell #1, and "tracked all-caps eyebrow above every heading, a mono face for small labels" as tell #5.
   - A Reddit-mined study (3.2 M posts, 3,033 on-topic comments) ranks "cream + serif + sage" as the new top tell.
   - My probe flags a page built on the skill's own recipe.

   The lesson is *second-order convergence*: any look a skill recommends becomes the next default. The skill should prescribe a **method** (derive the look from brand assets, category and references), never a palette or a typeface.
4. **Expressiveness budget = 1 / frequency.** Rauno Freiberg ("novelty is an exclamation mark"), Emil Kowalski (no animation for actions performed 100+ times a day) and Carbon (productive vs expressive type and motion) all say the same thing.
   - Carbon's measured tokens: productive 70 / 110 / 150 / 240 ms; expressive 400 / 700 ms.
   - Carbon type base: 14 px productive, 16 px expressive.

   In apps: no scroll reveals, no hover lifts, no animation on keyboard actions; motion only to explain change.
5. **Density has numbers, and they differ by category.** Measured or read from source:

   | Surface | Body text | Controls / rows | Largest text |
   | --- | --- | --- | --- |
   | Apps | 12–14 px (Twenty 13, Primer 14, Carbon 14) | controls 28–32 px (Primer 24–48; shadcn 36); rows 32 px (Twenty; Carbon options 24 / 32 / 40 / 48 / 64; Fiori compact 32 vs cozy 44) | 16–28 px |
   | GOV.UK | 19 px desktop / 16 px mobile | 5 px spacing base | 48 px |
   | Marketing | 16–20 px | — | 48–120 px |

   Platform references:
   - iOS body 17 pt (minimum 11 pt); macOS body 13 pt.
   - Primer switches the minimum target by pointer: 16 px for fine pointers, 44 px for coarse.
6. **App-UI tells are a different list from landing-page tells.** The landing-page tells are purple gradients and hero badges. The app tells:
   - everything in cards (the probe measures >45% of text inside cards);
   - a row of KPI tiles with "+20.1% from last month";
   - charts with no axes or values;
   - "Welcome back, Alex 👋" as the page title;
   - a toast for every save;
   - icon-only toolbars;
   - pill buttons and marketing-sized headings in a work tool.

   Professionals use tables and lists for collections, one elevation model (canvas → surface → layer, as Plane does), inline confirmation (Rauno: "a temporary inline checkmark on copy, not a notification") and 13–14 px text.
7. **The tells are machine-detectable from the rendered DOM.** `ui-probe.js` reads computed styles, so it works for any framework, and it separated the archetypes cleanly:

   | Page | Probe score |
   | --- | --- |
   | GOV.UK (2 pages) | 0 |
   | GitHub Primer app page | 0 |
   | Carbon enterprise table | 0 |
   | Typical AI SaaS landing | 25 |
   | Typical AI dashboard | 18 |
   | The skill's own house style | 5 |

   It complements a source-grep scanner (`devibe_scan.py` from the Reddit study). Rule weights follow the evidence; bento grids, glassmorphism and "aurora blobs" are low or rejected, so the skill should not over-rotate on them.
8. **Run heuristic evaluation the professional way.**
   - Several independent passes; findings first, **severity in a separate step** (NN/g: severity rated during discovery is unreliable).
   - Severity 0–4 from frequency × impact × persistence.
   - Add a cognitive walkthrough (four questions per step) on the top tasks.

   For an agent, "several evaluators" becomes several independent passes with different lenses (heuristics, persona, keyboard only, phone), merged afterwards.
9. **Start from top tasks, not from pages.** McGovern: 5–10 tasks account for most use. The agent can infer candidates from routes, navigation, analytics, support tickets, search logs and reviews when they are available. It should confirm them with the user, then build IA and hierarchy around them. In apps and ecommerce the "hero" is the top task.
10. **Critique against objectives, not taste** (Connor & Irizarry, *Discussing Design*). Every critique line reads: *objective → element → effect → why*. Design principles are decision tools only if they pass Matt Ström's tests: memorable, help you say no, not a truism (the opposite is something a reasonable team might believe), applicable.
11. **In conversion-critical flows, "distinctive" is the wrong goal.** Baymard *(secondary)*:
    - average checkout 5.1 steps and 11.3 fields when about 8 suffice;
    - abandonment 70.19%;
    - reasons: 48% extra costs, 26% forced account, 25% trust, 22% too long/complicated;
    - product lists "mediocre or worse" on 58% of desktop and 78% of mobile sites;
    - "Load more" beats pagination and infinite scroll.

    GOV.UK starts every form at *one thing per page*. Brand lives in photography, tone and content, not in custom checkout controls.
12. **Originality comes from the brief, not the moodboard.**
    - Onlyness statement (Neumeier) → attribute sliders ("this, not that") → references chosen by *problem* → principles extracted into a take/leave table → 2–3 style tiles or element collages (Warren, Mall) → critique against objectives.
    - Put the references away while making.
    - A direction must fail the swap test: it would be wrong for the nearest competitor.

---

## 1. Professional process and mental models

### 1.1 What each discipline optimises (and how each fails)

| Role | Optimises for | Characteristic artefacts | Failure mode when working alone |
| --- | --- | --- | --- |
| Product designer | The right problem, the right scope, the business outcome | Problem statements, flows, prioritised scope, success metrics | Ships a coherent flow that nobody needed |
| UX designer / researcher | Fit to users' tasks and mental models | Top tasks, JTBD, task analysis, IA, usability findings | Correct but lifeless; weak visual hierarchy |
| UI / visual designer | Hierarchy, legibility, identity, consistency | Type scale, colour roles, grids, component visuals, style tiles | Beautiful screens that ignore states and edge cases |
| Interaction designer | Behaviour: feedback, states, transitions, input | State diagrams, prototypes, motion specs | Clever interactions in high-frequency paths |
| Design engineer (Vercel, Rauno Freiberg, Emil Kowalski, Paco Coursey, Jakub Krehel) | The feel in the real medium: timing, focus, hit areas, optical alignment, performance | Production components, interaction guidelines, review checklists | Polishes the wrong thing |
| Design-system engineer | Consistency and scale: tokens, components, docs, a11y by default | Token pipelines, component APIs, usage docs | Systemises before the product knows what it is |
| CRO / conversion designer | Measured behaviour change on key funnels | Hypotheses, experiments, funnel analysis | Optimises to a local maximum; dark patterns |

The skill currently embodies the visual designer and parts of the art director. Broadening it means adding the product/UX front end (tasks, IA, problem framing), the interaction/design-engineering middle (states, feel, density) and the QA back end.

### 1.2 Research methods an agent can use, and how to run them

| Method | What it answers | How professionals run it | Agent-feasible version |
| --- | --- | --- | --- |
| **Top-tasks analysis** (Gerry McGovern) | The small set of tasks that matter most | 50–100 candidate tasks from feedback, search logs, analytics, stakeholders and competitors; rationalised to a list without overlaps; users pick up to 5 from a randomised list; McGovern's original guidance is 400+ respondents; votes come out wildly unequal | Build the candidate list from the repo (routes, nav labels, CTAs, form purposes), analytics, search queries, support tickets and reviews if the user supplies them. Rank by evidence. **Ask the user to confirm the top 5.** State it as an assumption if unconfirmed |
| **Jobs to be done: switch interview** (Moesta/Spiek) | Why people switch and what the product is hired for | Timeline interview of ~10 recent switchers (first thought → passive looking → active looking → deciding → consuming); forces of progress: push of the situation, pull of the new, anxiety of the new, habit of the present | Read reviews, testimonials, sales copy and support themes for push, pull, anxiety and habit statements. The anxieties become trust content; the habits become migration and import features |
| **Task analysis** | The steps, decisions and information needed per task | Hierarchical task analysis; observe or interview | Write the step list per top task from the running product; count clicks, fields and decisions; note where information must be remembered between steps |
| **Analytics / support / review mining** | Where people struggle, in their own words | Tag tickets and reviews (deductive and inductive coding); triangulate: an issue appearing in reviews, tickets *and* surveys outranks one appearing in a single channel | If data exists in the repo or from the user, code it into themes and cite counts. Never invent it |
| **Stakeholder interviews** | Business goals, constraints, politics, success measures | 30–60 min each: goals, metrics, risks, non-negotiables | A written questionnaire to the user (short; only what the repo cannot answer) |
| **Content audit** | What exists, what is ROT (redundant, outdated, trivial) | Inventory every page and asset; rate against goals; decide keep / rewrite / merge / delete | Crawl routes; produce an inventory table (URL, purpose, top task served, word count, last updated, verdict) |
| **Card sorting** | Users' mental model of groupings | Open sort, 30–50 cards, ~15 participants (Nielsen: 15 gives ≈0.90 correlation; Tullis & Wood suggested 20–30) | Not feasible without users; use existing label vocabulary, search terms and competitor IA as proxies, and say so |
| **Tree testing** | Whether a proposed hierarchy is findable | Text-only tree; task-based ("where would you find…"); success and directness rates; NN/g prefers tree testing to closed card sorts for validation | A proxy test: for each top task, record the path and label a user would have to predict; flag ambiguous labels and anything deeper than 3 levels |
| **Heuristic evaluation** (Nielsen) | Usability problems by inspection | 3–5 evaluators work independently, each in ~2 passes (overview, then element by element); findings merged; severity rated *afterwards* by each evaluator independently from the merged list (~30 min); 0–4 scale (see below) | Run 3+ independent passes with different lenses (the 10 heuristics; a first-time persona; keyboard only; 390 px phone). Merge and deduplicate, then rate severity in a separate step with screenshots |
| **Cognitive walkthrough** (Wharton et al.) | Learnability of specific tasks for first-time users | Define persona, task, start and end state, the correct action sequence; at each step ask the 4 questions below | Fully feasible; run it on the top 3 tasks |
| **Usability testing** | Real behaviour | 5 users per round finds ~85% of problems *if* each problem's discovery rate is ~31% (with 20%, about 9 users); think-aloud; iterate test → fix → retest; quantitative studies need ~20+ | Recommend it in the report; the agent cannot fake it |
| **A/B testing / CRO** | Causal effect of a change on a metric | Pre-registered sample size and MDE; no peeking (continuous monitoring can push false positives past 30%) or use sequential methods; low-traffic sites cannot A/B as their primary method; small tests converge on a local maximum, so radical change needs research, not tests | Recommend tests only where traffic permits; never claim uplift numbers the redesign has not measured |

**Severity scale (NN/g):** 0 not a problem · 1 cosmetic · 2 minor · 3 major (high priority) · 4 catastrophe (fix before release). Rate from **frequency** (common or rare), **impact** (easy or hard to overcome) and **persistence** (one-off, or bothers users repeatedly). Add *market impact* for commercially important flows.

**Cognitive walkthrough, the four questions at each step:**
1. Will the user try to achieve the right effect?
2. Will the user notice the correct action is available?
3. Will the user associate the action with the effect they want?
4. After acting, will the user see that progress is being made?

Spencer's streamlined version keeps two: *will the user know what to do?* and *will they know they did the right thing?* Write the persona first; otherwise evaluators substitute their own expert model.

### 1.3 Problem framing and the design brief

Professionals convert findings into **problem statements**, then **"How might we…"** questions, then a **brief**. The brief the skill should write for every redesign (and put at the top of `DESIGN.md`):

- **Category and surfaces** (per route): marketing / app / dashboard / commerce / content / service / docs, plus frequency of use.
- **Audience and context:** who, doing what, on which device, under what pressure (time, money, compliance, stress).
- **Top tasks** (≤ 5, ranked) and the **primary objective** per key screen.
- **Problems**, ranked by severity × task importance, each traceable to evidence.
- **Principles:** 3–5, each passing the Ström tests (see §1.5).
- **Non-goals:** what this redesign deliberately does not do.
- **Constraints:** tech stack, contracts to preserve, brand assets that survive, legal copy, accessibility level, performance budgets.
- **Success measures:** per category (see §2), with the baseline if it exists.

### 1.4 Critique (the self-critique pass should be run this way)

*Discussing Design* (Adam Connor & Aaron Irizarry): critique is **analysis of design choices against the product's objectives**. It is not a reaction ("I like it") and not direction ("make it blue"). Their framing for each point:
1. **Objective**: what is this screen or element trying to achieve?
2. **Element**: which specific choice?
3. **Effect**: does it help or hurt the objective, and how?
4. **Why**: the reason, grounded in principle or evidence.

When objectives are not agreed, the design principles act as the centring tool.

Figma runs several named critique formats and picks one per need:
- a **jam** (30 min heads-down, everyone drops references and ideas into a shared file) when stuck;
- a **workshop** at kickoff;
- a **standing critique** for reviewing options;
- **pair design** for complex problems;
- **async critique** in a shared file for inclusivity.

For an agent, the useful translation is to critique in **named modes**, each producing a list of *objective → element → effect → why* lines that become tasks:
- the whole-page review against objectives;
- the stranger's five-second test;
- the task walkthrough;
- the category-fit review (§2 dials);
- the AI-tell review (§4).

### 1.5 Design principles as decision tools

Matt Ström's tests: a principle must be **memorable**, **help you say no** ("one primary action per screen" rather than "minimise actions"), be **not a truism** (reversibility: the opposite must be a position a reasonable team could hold, e.g. "don't solve every edge case") and be **applicable**.

Real examples that pass:
- GOV.UK: "do the hard work to make it simple", "do less", "be consistent, not uniform".
- Linear: opinionated over configurable. Saarinen: "I don't think you can build the optimal tool for anything if it's very flexible or endlessly customizable."
- Superhuman: speed as the product (sub-100 ms interactions).
- Fiori: role-based, adaptive, simple, coherent, delightful.
- Airbnb DLS: unified, universal, iconic, conversational.

Examples that fail: "clean", "modern", "user-friendly", "delightful" standing alone.

### 1.6 The craft layer (design engineering)

Consolidated from Vercel's *Web Interface Guidelines*, Rauno Freiberg's *interfaces*, Emil Kowalski's design-engineering skill, Jakub Krehel's *Details that make interfaces feel better* and *Refactoring UI*:

- **Frequency decides motion** (Kowalski):

  | How often it happens | Motion |
  | --- | --- |
  | 100+/day (shortcuts, command palette) | none |
  | Tens/day (hover, list navigation) | remove or reduce |
  | Occasional (modals, drawers, toasts) | standard |
  | Rare (onboarding, celebration) | delight allowed |

  UI animations stay under ~300 ms (press 100–160, tooltip 125–200, dropdown 150–250, modal 200–500). Use ease-out for enter; never ease-in for UI. Never `transition: all`. Never scale from 0 (start at 0.9–0.95). Popovers scale from their trigger; modals stay centred. Exits are softer than enters. Rauno: switching theme should not trigger transitions.
- **Feedback relative to the trigger:** an inline check on copy rather than a toast; highlight the invalid field. Loading buttons keep their label. Add a ~150–300 ms show-delay and a ~300–500 ms minimum for spinners and skeletons to avoid flicker. Update optimistically and roll back with Undo.
- **State lives in the URL:** filters, tabs, pagination, expanded panels; deep-link everything; Back restores scroll.
- **Forms:** Enter submits; labels are clickable; don't pre-disable submit; errors sit next to fields and focus moves to the first error; `autocomplete`, `type` and `inputmode` set; input font ≥ 16 px on mobile (iOS zoom); never block paste; warn on unsaved changes.
- **Surfaces:** layered shadows (ambient + direct), semi-transparent borders, **concentric radii** (outer = inner + padding; Krehel: "the most common thing that makes interfaces feel off"), shadows for elevation and borders for structure, a 1 px 10%-opacity outline on images, optical alignment (±1 px).
- **Type:** tabular numerals for anything compared or updating; `text-wrap: balance` for headings and `pretty` for body; no weight change on hover (it shifts layout); weights < 400 avoided; medium headings 500–600.
- **Refactoring UI tactics:** start with too much white space, then remove; hierarchy by weight and colour before size; emphasise by de-emphasising; on coloured backgrounds use a same-hue tint, not grey; labels are a last resort (let the data format speak); fewer borders (use spacing, background shifts, shadows); design in greyscale first; don't design too early at high fidelity.
- **Accessibility floor:** keyboard everywhere (WAI-ARIA patterns); visible `:focus-visible` rings never covered by sticky UI; hit target ≥ 24 px (44 on touch); icon-only buttons named; status never by colour alone; honour `prefers-reduced-motion`.

### 1.7 Design QA: the matrix a design engineer walks before shipping

Every key screen and component is checked across five axes, and "done" means every cell was looked at in a render, not in source.

| Axis | Values |
| --- | --- |
| **State** | default, hover, focus-visible, active/pressed, selected, disabled, loading, success, error, empty (first-use / no-results / cleared), partial/sparse, dense/overflowing, permission-denied, offline |
| **Content extremes** | 0, 1, typical, 100+ items; 1-character and 70-character names; long words and URLs; missing images; non-Latin text; large numbers and currencies; RTL if supported |
| **Viewport and input** | 390 / 768 / 1024 / 1280 / 1440 / ultra-wide (50% zoom); touch vs fine pointer (`@media (hover: hover)`); keyboard-only; 200% zoom |
| **Theme and preferences** | light/dark, `prefers-reduced-motion`, forced-colours / high contrast, Windows scrollbars visible |
| **Performance** | throttled CPU and network; skeletons match final layout (no CLS); interaction latency (Vercel: POST/PATCH/DELETE < 500 ms; Superhuman targets < 100 ms for UI response) |

### 1.8 A professional redesign workflow with decision gates

This improves on "research → product → users → inspect → problems → constraints → comparables → direction → IA/hierarchy → system/tokens → prototype → implement → responsive → a11y → perf → visual QA → refine". The changes: classification comes first; problem framing is a written brief; prototypes of *top tasks* precede full implementation; and each gate names what it prevents.

| # | Phase | Output | Gate: must be true to continue | Prevents |
| --- | --- | --- | --- | --- |
| 0 | **Classify** | Route-by-route category map + frequency of use + stakes; the category "dials" (§2.0) | Every route has a governing philosophy (expressive or productive) | Marketing aesthetics in an app; app density on a landing page |
| 1 | **Understand the product and the business** | What it sells or does, for whom, business model, real proof, brand family (existing §2b) | The one-sentence product description a customer would use | A redesign about nothing |
| 2 | **Understand users and tasks** | Top tasks (≤ 5), JTBD forces, contexts and devices; evidence sources listed | Top tasks confirmed by the user, or written as explicit assumptions | Designing pages instead of tasks |
| 3 | **Inspect** | Rendered audit at 5 widths; heuristic evaluation (multi-pass, severity separate); cognitive walkthrough of top tasks; content inventory; IA map; component, token and state inventory; a11y, perf and AI-tell baselines | Every finding has severity and evidence | Vague diagnoses ("feels dated") |
| 4 | **Frame** | Brief (§1.3): problems ranked, HMWs, principles (Ström-tested), non-goals, constraints, success measures | Principles pass reversibility; non-goals written | Scope creep, taste arguments |
| 5 | **Comparables** | 4–8 references chosen by *problem* (category leaders, adjacent, one contrary); take/leave table of principles | Each reference yields a principle *and* an explicit "not taking" | Copying a look |
| 6 | **Direction** | Marketing: 2–3 style tiles or element collages → one chosen. Apps: interaction model, density, surface/elevation model, navigation model | Swap test (wrong for the nearest competitor); convergence check vs house recipes and earlier outputs; fits the category dials | Generic or house-style output |
| 7 | **Structure** | IA and navigation; screen inventory; content-first wireframes with real copy; one primary action per screen | Each top task reachable with predictable labels; ≤ 3 levels | Pretty pages with lost users |
| 8 | **System** | Tokens: type scale per category, spacing, colour roles (surface/text/border/accent/status/data), radii scale, elevation model, motion tokens (productive and expressive); component state matrix | Contrast passes; every component has all states designed | One-off styling, inconsistent states |
| 9 | **Prototype key flows** | The first viewport / hero *or* the top-task screens, built in code and rendered | Critique against objectives has no "no" on the top tasks | Discovering direction problems after full build |
| 10 | **Implement** | Full redesign in the existing stack; contracts preserved | Build, typecheck and tests pass | Broken functionality |
| 11 | **QA** | Design QA matrix (§1.7); a11y (WCAG 2.2 AA); perf (CWV); AI-tell probe; second critique | No severity 3–4 issue open; no high-weight tell without a written justification | Shipping visible defects |
| 12 | **Measure and refine** | Post-launch metrics plan per category; A/B only if traffic permits | Metrics named with baselines | "Looks better" as the only outcome |

**Fast path for small work:** phases 0, 3, 4, 8, 10 and 11 only. Never skip 0 or 11.

### 1.9 The senior designer's question bank

Ask these, answer them in writing, and let unanswerable ones become explicit assumptions or questions for the user.

**Business and outcome**
- What does success look like in 6 months, and which number would move?
- Who pays, who uses, and are they the same person?
- What is the one thing a visitor or user must be able to do here?
- What must not change: contracts, legal copy, brand assets, URLs, workflows people have muscle memory for?
- What have they tried before, and why did it fail?

**Users and tasks**
- What are the top 5 tasks, and what evidence says so?
- How often does a typical user come here: once, monthly, daily, all day?
- What are they doing just before and just after?
- What device, environment, time pressure, attention level? One hand on a phone, or two screens at a desk?
- What do they fear (anxiety) and what are they used to (habit)?
- Who is the least confident user we must still serve?

**Content and structure**
- What content exists, what is missing, and what is ROT?
- Are labels in the users' words or the org chart's?
- Where does the user have to remember something between steps?
- What is the navigation model, and does it match the frequency of use (hub, tabs, sidebar, command palette)?

**Interaction and states**
- What happens on success, on error, when empty, when loading, when there are 10,000 of them?
- What is the primary action on each screen, and is there exactly one?
- What is destructive, and is it confirmable or undoable?
- Can every flow be done with the keyboard? On a 390 px screen with a thumb?

**Visual**
- What is the most important thing on this screen, and is it visually the most important?
- What can be removed? What is decoration pretending to be structure?
- Does colour carry meaning or decoration? How many colours are doing jobs?
- Does the type scale have a reason (ratio, category norm), and is every step used?
- Would this look right for our nearest competitor? If yes, it isn't ours.

**System and maintainability**
- Is this a token, a component, a pattern or a one-off, and should it be?
- Will the next developer understand where this value came from?
- What will break when the content doubles or is translated to German?

**Quality, ethics, risk**
- Who is excluded by this choice (contrast, motion, target size, reading level, language)?
- Is anything here fake: metrics, logos, testimonials, urgency?
- What would a regulator, a support agent or a lawyer flag?

**Measurement**
- How will we know it worked? What is the baseline? Can we A/B test, or must we research?

### 1.10 Seven qualities that are often confused

| Quality | Definition | How to test it | Typical conflict |
| --- | --- | --- | --- |
| **Attractive** | Pleasing and coherent at first sight; creates trust and tolerance (aesthetic-usability effect) | Five-second test; side-by-side against category leaders | Can mask usability problems in testing |
| **Usable** | Top tasks completed effectively, efficiently, with satisfaction | Walkthrough, usability test, task time and errors | Efficiency features (density, shortcuts) can look "busy" |
| **Appropriate** | Fits category, audience, frequency and stakes; the right *philosophy* | Category dials (§2.0); stranger asked "what is this, and is it serious?" | The distinctive choice is often inappropriate in apps, checkouts and services |
| **Accessible** | Usable by people with disabilities and in constrained contexts | WCAG 2.2 AA, keyboard, screen reader, zoom, reduced motion, contrast (APCA as a second opinion) | Low-contrast "elegant" greys; motion-heavy expression |
| **Polished** | The invisible details are correct: alignment, radii, timing, states, copy | Design QA matrix (§1.7); slow-motion review | Polish on the wrong screen is waste |
| **Maintainable** | Built from tokens and components; values have sources; low one-off count | Distinct values per property (the probe counts sizes, radii, spacings, colours); component reuse | Bespoke art direction versus the system |
| **Performant** | Fast to load and respond (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75) | Lighthouse / field data, throttled | Big imagery, web fonts, motion libraries |

A redesign must be **appropriate first**. Attractive-but-inappropriate is the characteristic failure of a skill tuned for marketing.

---

## 2. Product-category playbooks

### 2.0 The category dials

Set these in Gate 0; they constrain every later decision.

| Dial | Marketing / landing | SaaS app (frequent) | Analytics / monitoring | Ecommerce | Enterprise / B2B data | Dev tools and docs | Fintech / banking | Mobile-first consumer | Content / editorial | Government / public service |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Usage frequency | once to a few visits | daily, hours | daily, glance or deep-dive | occasional, task-driven | all day | often, in bursts | daily glance; rare high-stakes acts | many short sessions | daily to occasional | rare, once |
| Posture | expressive | productive | productive | persuasive + productive | productive | productive (docs), expressive (marketing) | reassuring | tactile | reading | plain |
| Body text | 16–20 px | 13–14 px | 12–14 px | 14–16 px | 13–14 px | 15–16 px prose, 13–14 code | 14–17 px | 16–17 px | 17–21 px | 19 px (16 mobile) |
| Largest text | 48–120 px | 20–28 px | 24–32 px (a few key numbers) | 24–40 px | 20–28 px | 32–48 px | 28–40 px (balance) | 28–34 px | 32–56 px | 48 px (32 mobile) |
| Density | low | medium-high | high | medium | very high | medium | medium-low | medium | low | low |
| Motion budget | 1–3 orchestrated moments | only to explain change; none on keyboard actions | none except live-data updates | micro-feedback, image zoom | none | none (docs) | confirmation moments | gesture-driven, physical | none | none |
| Novelty budget | high (in one place) | low | very low | medium (brand in imagery) | very low | low | low | medium | medium (in typography) | zero |
| Colour role | identity + one action colour | neutral chrome; accent = action/selection; semantic = status | data encodings + status only | product imagery dominates; one action colour | neutral + status | neutral + syntax | trust colour + unambiguous gains and losses | brand + action | neutral; links | fixed palette |
| What gets visual weight | the idea, the product, proof | the user's content and current object | the anomaly, the KPI vs target | product image, price, add to cart | the data and the selected record | code, search, the answer | balance, what's due, the next safe action | the one primary action | the article | the question and the Continue button |
| Navigation model | top nav ≤ 7, one CTA | sidebar + command palette + shortcuts | filters + drill-down | search + category + filters | sidebar + tabs + saved views | left tree + search (⌘K) + on-page TOC | tab bar (≤ 5) | tab bar (≤ 5) / bottom actions | sections + related | linear flow, back link |
| Key metrics | conversion to signup or demo, CTR, bounce, CWV | activation, time-to-value, retention, task time, HEART | time-to-insight, accuracy of decisions | conversion, AOV, add-to-cart rate, abandonment, search exit | task time, errors, throughput | time-to-first-call, search success, doc CSAT | task completion, support contacts, trust/NPS | D1/D7 retention, session success | reading depth, return visits, subscription | completion rate, digital take-up, cost per transaction, satisfaction |

**Sources for the numbers** (measured, §3): Twenty app (13 px root, 32 px rows), Primer (body 14, controls 24–48), Carbon (productive 14 vs expressive 16; rows 24–64), Fiori (compact 32 vs cozy 44), GOV.UK Frontend (19/16, scale 80/48/36/27/24/19/16/14), Apple HIG (iOS body 17 pt, minimum 11; macOS 13), Twenty website (display 120, body 16–18), shadcn (36 px buttons, 24 px card padding).

### 2.1 Marketing / landing site
- **Primary goal:** understand what it is, for whom and why it matters in seconds, then take one action.
- **Frequency:** once or a few visits; no learning curve allowed.
- **Visual weight:** the idea (headline), the product shown, and real proof.
- **What good looks like:** one memorable idea; the product large and early; varied chapters; restraint; fast.
- **Typical mistakes:** the generic skeleton (centred hero + badge + two pills + 3 icon cards + logos + pricing + CTA band); fabricated proof; motion on everything; slow hero media.
- **Don't import from apps:** dense tables in the first viewport; UI chrome as decoration.
- **Metrics:** visit-to-signup/demo, CTA CTR, scroll depth to proof, bounce, CWV.
- *(This is what the current skill already does well; keep it, and gate it by category.)*

### 2.2 SaaS web app (frequently used)
- **Primary goal:** get recurring work done fast and without errors.
- **Frequency:** daily, often hours. Familiarity and speed dominate; every flourish is paid for hundreds of times (Rauno's semantic-satiation argument).
- **Visual weight:** the user's content and the current object. Chrome recedes. Linear's 2024 redesign *dimmed the sidebar* so "the main content area … takes precedence", made tabs compact, reduced and shrank icons, and removed coloured team-icon backgrounds.
- **Density:**
  - 13–14 px body, 28–32 px controls, 32–40 px rows;
  - 4 px spacing base;
  - radii 4–8 px (Twenty: 4 / 8; Primer: 6);
  - two-layer low-alpha shadows only for overlays.
- **Navigation:**
  - sidebar for places;
  - tabs for views of one object;
  - a command palette (⌘K) that shows each command's shortcut, so users learn it passively (Superhuman);
  - keyboard shortcuts for top tasks;
  - URL-addressable state.
- **What good looks like:**
  - opinionated defaults over settings (Linear);
  - progressive disclosure (Notion's `/` menu reveals power in proportion to intent);
  - optimistic UI;
  - inline editing;
  - designed empty states that teach the next action;
  - one elevation model (Plane: one canvas → sibling surfaces → layers; never a surface nested in a surface).
- **Typical mistakes:** card soup; marketing-size headings; greeting headers; toasts for every save; modals for forms that could be inline; every action as a filled button; icon-only toolbars without tooltips and shortcuts; missing states.
- **Don't import from marketing:** big hero type, scroll reveals, hover lifts, gradients, glow, testimonial energy, illustration in chrome.
- **Metrics:**
  - activation (define the event that predicts retention);
  - time-to-value;
  - retention;
  - task time and error rate;
  - HEART (Happiness, Engagement, Adoption, Retention, Task success, with goals → signals → metrics).

### 2.3 Analytics / monitoring dashboard
- **Primary goal:** see whether something needs attention and act on it (operational), or explore and decide (analytical). NN/g distinguishes the two. Stephen Few: "a visual display of the most important information … consolidated and arranged on a single screen so the information can be monitored at a glance."
- **Visual weight:** deviations from target or normal, not raw totals. Encode quantity with **position and length** (bars, lines: preattentive), and use colour sparingly to flag.
- **Few's recurring mistakes:**
  - exceeding one screen;
  - inadequate context (no target, no comparison);
  - excessive precision;
  - wrong measure;
  - wrong chart;
  - meaningless variety;
  - decoration (3D, gauges, dials, pies);
  - colour misuse.
- **Density:** high; small multiples; sparklines; tabular numerals; 12–14 px.
- **What good looks like:**
  - 3–5 decision-driving metrics with comparison and target;
  - every chart with axis values, units and period;
  - drill-down to the records;
  - timestamps and freshness shown;
  - alert states distinct from normal.
- **Typical mistakes (and the AI version):** KPI tiles showing "+20.1% from last month" with no target or meaning; unlabelled bars; a donut for "traffic sources"; "AI insights" boilerplate; 14 cards of everything the database can produce.
- **Metrics:** time to detect and to act; decision accuracy; alert precision.

### 2.4 Ecommerce
Evidence is Baymard *(secondary via search)*: 200,000+ hours of research, 4,400+ think-aloud sessions.
- **Primary goal:** find the right product, trust it, buy it without friction.
- **Product lists:**
  - "mediocre or worse" on 58% of desktop and 78% of mobile sites (2025);
  - 38% of sites lack filters for all attributes shown in the list; 14% don't allow multi-select filters;
  - "Load more" + lazy-loading outperformed pagination (users browse more) and infinite scroll (lost place, unreachable footer, can't bookmark);
  - show several thumbnails per product.
- **Product page:**
  - 42% of users try to judge size from images, but 28% of sites have no "in scale" image;
  - images with descriptive text or graphics help (52% of sites don't);
  - price, variant and add-to-cart prominent and unique.
- **Cart and checkout:**
  - average checkout 5.1 steps and 11.3 fields (2024) when about 8 fields suffice;
  - abandonment averages 70.19%;
  - excluding "just browsing" (42%), the reasons are: extra costs 48%, forced account 26%, didn't trust the site with card details 25%, slow delivery 23%, too long/complicated 22%.
  - Fixes: guest checkout as the most prominent option; one "Full name" field; hide Address line 2, Company and Coupon behind links (a visible coupon field sends people off-site to hunt codes); postcode lookup; billing = shipping by default; delayed account creation; an explicit order-review step; total cost visible early.
- **Mobile:** the page is long, so a persistent buy bar (price + CTA + variant state) is common. Uplift numbers circulating for it are vendor claims (unverified).
- **What gets visual weight:** product photography, price, the buy action, delivery date and cost.
- **Don't import from marketing:** scroll-jacking, animated reveals of product images, novel form controls, pastel "brand" buttons with low contrast.
- **Metrics:** conversion rate, add-to-cart rate, checkout completion, AOV, search exit rate, filter usage, returns due to size or expectation.

### 2.5 Enterprise / B2B data-heavy software
- **Primary goal:** process many records correctly and quickly; often the user did not choose the tool.
- **Density:** the highest.
  - Carbon rows 24 / 32 / 40 / 48 / 64 px (xl only for two-line content; header row matches row size; toolbar size pairs with row size).
  - Fiori compact (32 px rows, for mouse and keyboard) vs cozy (44 px touch targets).
  - Material density −1 to −3 (each step −4 px), applied to tables and long forms, not globally.
- **Tables** support four tasks (NN/g): **find** records (search and filter prominence), **compare** (frozen headers, zebra or hover rows, aligned numerals), **view/edit one** (detail panel, inline edit), **act** (checkbox selection + batch actions; for large selections make "select all 3,200 matching" explicit).
- **Power features:**
  - saved and shared views;
  - multi-criteria filters;
  - j/k navigation, x to select, `/` to search;
  - bulk actions with undo;
  - pinned identifier columns;
  - column customisation;
  - keyboard shortcuts discoverable via tooltips and the palette.
- **NN/g's guidelines for complex apps:** promote learning by doing; help users move to more efficient methods; flexible, fluid pathways; reduce clutter *without reducing capability*; make critical information salient.
- **Don't import from marketing:** whitespace-heavy layouts, big type, cards around rows, hover animations, colour as decoration.
- **Metrics:** task time, error rate, records per hour, training time, support tickets.

### 2.6 Developer tools and documentation
- **Primary goal:** get to a working integration fast; find the exact answer.
- **Docs IA:** Diátaxis separates **tutorials** (learning), **how-to guides** (goals), **reference** (information) and **explanation** (understanding). Mixing them is the main docs failure.
- **Stripe's model:**
  - three columns: navigation, prose, live code;
  - the user's own test keys injected when signed in;
  - prose ↔ code line highlighting;
  - copy buttons;
  - a first test payment within minutes;
  - docs authored in Markdoc, keeping content separate from code;
  - the tight loop docs ↔ API ↔ dashboard matters more than the polish.
- **Density:** prose 15–16 px with a 60–75 character measure; code 13–14 px mono; ⌘K search; on-page TOC; version selector.
- **The marketing side of dev tools** may be expressive, but it shows real code and real UI. Monospace belongs here (and, per the skill's lessons, *only* here).
- **Metrics:** time-to-first-successful-call, search success, docs CSAT, support deflection.

### 2.7 Fintech / banking
- **Primary goal:** know where my money stands; move it safely.
- **Trust mechanics:**
  - show every fee, rate and arrival time *before* commitment (Wise's transfer flow: mid-market rate, exact fee, arrival estimate, recipient details);
  - transaction states always visible;
  - intentional friction on high-stakes acts (confirmation, review screen);
  - never ambiguous colour for money: gains and losses need sign *and* colour.
- **Numbers:** tabular numerals; currency formatting consistent (0 or 2 decimals, never mixed; Vercel copy rule); locale-aware formats.
- **Regulated copy:** UK FCA "fair, clear and not misleading"; a promotion can mislead through selective emphasis even when every statement is true; risk warnings must be prominent; the Consumer Duty requires *supporting understanding*, not just avoiding deception. Design cannot shrink or bury required text.
- **Brand:** can be bold in marketing (Wise: forest green + lime, Wise Sans at weight 900; 342 languages supported). Inside the product, calm.
- **Metrics:** task completion (send, pay, freeze card), support contacts per active user, complaint rate, trust/NPS.

### 2.8 Mobile-first consumer product
- **Primary goal:** one thing, quickly, one-handed, often interrupted.
- **Norms (Apple HIG, read from source):**
  - body 17 pt, minimum 11 pt; hit region ≥ 44 × 44 pt;
  - one or two prominent buttons per view at most; use *style, not size*, to mark the preferred choice;
  - tab bars are for navigation, not actions; keep them visible; don't disable or hide tabs (explain empty states instead); single-word labels; avoid overflow "More" tabs; badges only for critical information.
  - Material: 48 dp targets, density applied only where feedback isn't affected.
- **Hand and thumb:** primary actions in the lower two-thirds (Hoober: 49% one-handed).
- **What good looks like:** gesture + visible alternative; physical, interruptible motion (springs); instant feedback; offline and slow-network states; the web version respects safe areas and a 16 px minimum input size.
- **Don't import from desktop marketing:** hover-dependent affordances, wide multi-column heroes, tiny tracked-caps labels.
- **Metrics:** D1/D7/D30 retention, session success, crash-free sessions, notification opt-in.

### 2.9 Content / editorial site
- **Primary goal:** read, understand, come back.
- **Weight:** the article. Measure 45–75 characters; body 17–21 px; generous line height; strong heading hierarchy; inverted pyramid; real bylines and dates (credibility); related content that is actually related.
- **Ads:** the Coalition for Better Ads mobile standard caps ad density at **30%** of main-content height. Pop-ups, prestitials, auto-play video with sound and large sticky ads fail the standard.
- **Brand:** expressed mainly through typography, and through art direction of imagery per story.
- **Metrics:** read depth, time on article, return visits, subscriptions, newsletter sign-ups.

### 2.10 Government / public service
- **Primary goal:** complete a mandatory task first time, whoever you are.
- **GOV.UK Service Standard:** 14 points in three groups. Meeting users' needs: understand users and their needs, solve a whole problem, joined-up experience, make it simple, make sure everyone can use it… Providing a good service, and using the right technology.
- **Design principles:** start with user needs; do less; design with data; do the hard work to make it simple; iterate; this is for everyone; understand context; build services not websites; be consistent not uniform; make things open.
- **Patterns:** one thing per page (question pages: one question, the question as the `h1` in the legend; start there and group only when research says so; it helps low-confidence users, mobile, errors, branching and save-and-return); error summary at the top linking to fields; back link; "Continue" as the button.
- **Measured GOV.UK Frontend** (§3.2): one family; 5 sizes per page; 2 weights; ≤ 6 text colours; no radii, no cards, no gradients; body 19 px (16 mobile); spacing on a **5 px** base (5–60). A 4 px grid is not a universal quality rule; *consistency* is.
- **Don't import:** anything decorative. Brand expression is effectively zero, by principle ("be consistent, not uniform" across services).
- **Metrics:** completion rate, digital take-up, cost per transaction, user satisfaction (the four KPIs historically published on GOV.UK's performance platform).

---

## 3. Excellent real products: measured data and reusable principles

### 3.1 Tokens read from open-source product code and published design systems

Primary sources read in this session from GitHub and npm.

| Product / system | Families | Base / body | Scale | Radii | Spacing | Density markers | Motion | Colour notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Twenty app** (CRM) | Inter only | **13 px root** | 8, 11, 12, 13, 16, 20, 24 px (0.625–1.85 rem) | 2, 4, 8, 16, 20, 40, pill | 4 px base | table rows **32 px**, cell padding 8 px, checkbox column 32 px; icons 14/16/20/24 with strokes 1.6/2/2.5 | 75 / 150 / 300 ms (1.5 s slow) | text greys from a 12-step ramp (gray12 primary → gray7 extra-light); shadows two-layer, 4–8% alpha |
| **Twenty website** (same company, marketing) | Host Grotesk, Aleo, Azeret Mono, VT323 (+ Inter for product mockups) | 16 px root; body 16–18 | stepped, not fluid ("the Linear model"): display 80 → 120 px, heading-xl 60 → 80, heading-lg 40 → 60 … eyebrow 18 | 2 px base | 4 px base | product mockups rendered at 13 px with the app's real theme; a "fiction palette" for illustrative data | 150, 200, 220, 300, 400, 600 ms | accent inherited from the product (`#3e63dd`) |
| **Cal.com** | `--font-sans` + `--font-cal` (display) | — | — | 0, 2, 4, 6, 8, 12, 16, 24, pill | Tailwind | semantic surfaces: `emphasis / default / subtle / muted / inverted` | — | default **brand is near-black** `hsl(221 39% 11%)`; booking pages take the *customer's* brand colour, so the chrome stays neutral |
| **Dub** | Satoshi (display), Inter (default), Geist Mono | — | adds 10 px `2xs` | — | Tailwind | — | modals 0.2 s `cubic-bezier(.16,1,.3,1)`; popovers 0.4 s | — |
| **Plane** | — | — | — | — | — | written elevation model: one `canvas` at the root; sibling `surface-1/2/3` (never nested); `layer-1/2/3` stacked inside a surface; overlays may reuse a surface because they are a different plane | — | — |
| **shadcn/ui v4** (new-york defaults = the AI default) | inherits (usually Inter/Geist) | text-sm (14) in tables, inputs text-base → md:text-sm | — | `--radius: 0.625rem` (10 px); Card `rounded-xl` ≈ 14 px | Card `px-6 py-6 gap-6` (24 px) | Button `h-9` (36 px); table header `h-10` (40 px); Card = `border + shadow-sm` | — | background `oklch(1 0 0)` |
| **GitHub Primer** | system stack (Mona Sans in newer builds) | body-medium **14**, small 12, large 16 | title 16 / 20 / 32; display 40 | 3, 6, 12, pill | 4 px base | controls **24 / 28 / 32 / 40 / 48**; min target **16 px fine pointer, 44 px coarse** | — | — |
| **IBM Carbon** | IBM Plex | productive **14**, expressive **16** | productive vs expressive sets | 0 (square by default) | 2/4/8 based | rows 24 / 32 / 40 / 48 / 64; default button 48 | productive vs expressive easings; fast-01 70, fast-02 110, moderate-01 150, moderate-02 240, slow-01 400, slow-02 700 ms | — |
| **GOV.UK Frontend** | GDS Transport | **19 px** desktop / 16 mobile | 80 / 48 / 36 / 27 / 24 / 19 / 16 / 14 (mobile 53 / 32 / 24 / 18 / 18 / 16 / 14 / 12) | none | **5 px** base: 5, 10, 15, 20, 25, 30, 40, 50, 60 | — | none | — |
| **Apple HIG** | SF Pro | iOS body **17 pt** (min 11); macOS **13 pt** (min 10) | Large Title 34 (iOS default) … Caption 11 | — | — | buttons 28 / 32 / 44 / 52 / 64 pt; hit region ≥ 44 pt | — | one or two prominent buttons per view |

### 3.2 Rendered archetypes, measured with `ui-probe.js` at 1440 × 900

Real CSS for GOV.UK Frontend 5, Primer CSS 21 and Carbon Styles 1; Tailwind 3 for the AI archetypes; hand CSS for the skill's house style.

| Page | Families | Distinct sizes | Body / max (1440) | Max at 390 | Max ÷ body | Text colours | Dominant radius | Shadows | Card-like boxes (share of text) | Centred text | Interactive in fold | Text units in fold | Control heights | Row height | Tell score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GOV.UK guidance | 1 | 5 | 19 / 48 | 32 | 2.5 | 3 | none | 1 | 0 (0%) | 1% | 9 | 22 | 43 | — | **0** |
| GOV.UK question | 1 | 5 | 19 / 36 | 30 | 1.9 | 6 | none | 1 | 0 | 3% | 12 | 19 | 38–40 | — | **0** |
| GitHub issues (Primer) | 1 | **3** | 12–14 / **16** | 16 | 1.3 | 6 | 6 px | 3 | 0 | 9% | **31** | 54 | 32 | 79 (2-line) | **0** |
| Cloud console (Carbon) | 1 | 4 | 14 / 28 | 28 | 2.0 | 4 | none | 0 | 0 | 0% | 20 | **90** | 48 | **32** | **0** |
| AI SaaS landing | 1 (Inter) | 8 | 16 / 72 | 48 | 4.5 | **11** | 16 px ×12 | **13** | **14 (66%)** | 39% | 7 | 19 | 36–62 | — | **25** |
| AI dashboard | 1 (Inter) | 5 | 14 / **30** | 30 | 2.1 | 7 | 12 px ×10 | 11 | 9 (69%) | 7% | 12 | 52 | 30–44 | — | **18** |
| Skill house style | 3 (Inter, JetBrains Mono, Instrument Serif) | 8 | 20 / 88 | 88 (no responsive step) | 4.4 | 5 | none | 0 | 0 | 0% | 5 | 13 | 52 | — | **5** |

**What the numbers say:**
- **Real app systems use very few sizes and a small max ÷ body ratio** (Primer 3 sizes, ratio 1.3; Carbon 4 sizes, ratio 2.0). Marketing pages run ratios of 4–5.
- **The AI dashboard's 30 px greeting** is larger than Primer's largest text (16 px) and Carbon's page title (28 px).
- **Information density is not word count.** The Carbon table shows **90 text units** above the fold vs 52 for the AI dashboard and 19 for the AI landing page.
- **Real systems put zero content in cards.** Both AI archetypes put two-thirds of their text inside bordered, shadowed, rounded boxes.
- **Colour discipline:** GOV.UK uses 3 text colours on a page; the AI landing uses 11.
- **Rules that mislead:** GOV.UK is "off the 4 px grid" on 7 values because it is on a 5 px grid, so the skill should check *consistency of a scale*, not a specific base. Primer has 16 targets under 24 px (native checkboxes, counters): dense desktop tools legitimately use small targets on fine pointers, and Primer's own tokens switch to 44 px on coarse pointers. The probe reports these facts but does not score them as tells.

### 3.3 Principles from specific products (reusable, not visual)

| Product | Principle to reuse | Evidence |
| --- | --- | --- |
| **Linear** | The content area outranks navigation: dim the chrome, shrink icons, remove decorative colour from nav | 2024 redesign part II: sidebar dimmer, tabs compact, fewer and smaller icons, coloured team-icon backgrounds removed |
| | Generate themes from a few inputs in a perceptual space | LCH; 3 variables (base, accent, contrast) instead of 98 |
| | Opinionated over configurable; quality as the differentiator; small teams; intuition over A/B tests for craft decisions | Karri Saarinen, First Round / Sequoia |
| | Stepped (not fluid) type, reflowed with `text-wrap: balance` | Cited as "the Linear model" in Twenty's type-scale source |
| **Stripe** | Colour systems built in a perceptual space so contrast levels are predictable across hues | "Designing accessible color systems" (2019): CIELAB, with a tool to visualise the scales |
| | Docs: three columns (nav / prose / live code), personalised keys, prose ↔ code highlighting | Stripe docs, Markdoc |
| | The loop between docs, API and dashboard matters more than polish | Stripe docs teardowns |
| **Vercel** | Written, testable interface guidelines; "interfaces succeed because of hundreds of choices" | Web Interface Guidelines, also shipped as an agent skill |
| | Near-monochrome UI; colour reserved for status | Geist system; Cal.com follows the same pattern |
| **Notion** | Progressive disclosure through intent: the `/` menu shows power in proportion to what you type | Notion guides *(secondary)* |
| | Calm chrome, comfortable measure | ~720 px measure, 1.7 line height *(secondary)* |
| **Raycast / Superhuman** | Speed as the product | Sub-100 ms targets (Superhuman aims for 50–60 ms) |
| | No open/close animation for something used hundreds of times a day | Kowalski on Raycast |
| | The command palette displays each shortcut, so users graduate to it | Superhuman |
| **Things 3** | Tactile, purposeful motion in a consumer tool; every animation carries meaning; craft consistency across platforms | Reviews *(secondary)* |
| **Airbnb** | A design language needs principles *and* an evolving ecosystem, not static atoms | DLS: unified, universal, iconic, conversational |
| **Shopify Polaris** | Content is part of the design system | Polaris: shortest, clearest path; "every word … adds noise"; too much content makes a tool feel cheap, too little confuses |
| **GOV.UK** | Plainness as a principle; one thing per page; research decides when to group | Service Standard, design principles, question-pages pattern |
| | Performance and accessibility by default | 19 px body, no decoration (§3.2) |
| **Monzo / Wise** | Transparency is the brand: fees, rates and timings shown before commitment | Fintech UX sources *(secondary)* |
| | A typeface can be built for global reach | Wise Sans, 342 languages |
| **Apple product pages** | One message per chapter; the product rendered huge; copy minimal; chapters alternate surfaces; motion reveals *the thing being described at the moment it is described* | Page analyses *(secondary)* |
| | Brand expression lives in the marketing, never in the OS controls | HIG: system controls are consistent |
| **Cal.com** | When your product displays the *customer's* brand (booking pages, embeds), your own chrome must be neutral and themeable | `--cal-brand` default near-black; per-theme CSS variables for embeds |
| **Twenty** | Marketing and app are two design systems sharing one truth | The website imports app tokens to render product mockups at app size; illustrative data uses a "fiction palette" (never real customers) |
| **Plane** | Name the elevation model | Canvas / surface / layer, with written rules; this prevents card-in-card soup |

### 3.4 Cross-cutting principles extracted from all of the above

1. **Frequency sets the novelty and motion budget.** High-frequency surfaces are quiet, fast and familiar. Rare moments may be expressive.
2. **The user's object is the hero in apps; the idea is the hero in marketing.**
3. **Colour is information in tools.** Neutral chrome, one action or selection colour, semantic colours for status, a dedicated data palette for charts.
4. **Few sizes, used consistently.** Apps get by with 3–5 type sizes; a size that appears once is a smell.
5. **One elevation model, named.** Cards are an elevation, not a layout primitive.
6. **Every state is designed**, including empty, error and dense.
7. **Content is design:** plain labels in users' words, one name per thing, and a verb that stays the same from button ("Publish") to toast ("Published").
8. **Show the real product** in marketing, rendered from real tokens, with obviously fictional data.
9. **Principles you can say no with,** written down.

---

## 4. AI-generated UI tells: catalogue with detection

### 4.1 Why it happens

- **Distributional convergence** (Anthropic, "Improving frontend design through Skills"): "safe design choices … dominate web training data. Without direction, Claude samples from this high-probability center." Result: Inter, purple gradients on white, minimal animation.
- **Framework defaults as training data.** Adam Wathan (Aug 2025, >1 M views): *"I'd like to formally apologize for making every button in Tailwind UI `bg-indigo-500` five years ago, leading to every AI generated UI on earth also being indigo."* shadcn/ui and Tailwind examples are the best-documented UI code on the web, and v0 is trained specifically on them.
- **No asset pipeline.** Emoji, Lucide icons in tinted squares and gradients need no images, so models reach for them.
- **Second-order convergence.** Anti-slop advice becomes the new default. Anthropic's blog notes the model then converges on Space Grotesk. The Reddit study's own first version recommended cream, forest green and Fraunces, "exactly the look people now recognize as AI-tasteful". Anthropic's current skill lists cream + serif + terracotta, near-black + acid green, broadsheet hairlines, the SaaS-card kit, and tracked-caps eyebrows / middle-dot meta / "→" links as today's clusters.

### 4.2 How loud each tell is

JCarterJohnson/vibecoded-design-tells: 3,214,533 posts across 47 subreddits, 3,033 comments from 125 "why do AI sites all look the same" threads; adversarially verified (11 of 12 held). The share of on-topic comments naming each tell:

| Tell | Share |
| --- | --- |
| "Screams AI / soulless" | 6.4% |
| "All looks the same / template" | 6.1% |
| shadcn / Tailwind default kit | 2.5% |
| AI purple | 2.3% |
| Gradients / gradient text | 2.0% |
| Too many animations | 1.1% |
| Rounded corners / pills | 0.8% |
| Dark + neon glow | 0.7% |
| Emoji / ✨ / 🚀 | 0.5% |
| Generic sans (Inter / Geist) | 0.4% (understated) |
| Three-column feature cards | 0.4% |
| Glassmorphism | 0.2% |
| Same hero | 0.2% |
| Centred + endless whitespace | 0.2% |
| **Bento grid** | **0.1%** |
| Mesh / blob / aurora backgrounds | **rejected** as a keyword artefact |

**Conclusion:** weight the default kit, purple and gradients highest. Do not chase bento grids, dark mode itself, or tasteful blobs. The *loudest* complaint is sameness, which no single rule captures; that is why the originality method (§6) matters more than the blocklist.

### 4.3 The catalogue

`w` is the weight used by `ui-probe.js`. "Detect" gives the computed-style rule and threshold as implemented.

#### A. Visual tells: marketing surfaces

| Tell | Why it happens | Why it hurts | What a professional does instead | Detect (probe rule, w) |
| --- | --- | --- | --- | --- |
| **AI purple** (indigo/violet primary) | Tailwind UI `indigo-500`, starter templates | "Nobody chose this"; brand erased | Primary derived from the logo / brand; if purple *is* the brand, an off-default purple with a chosen neutral ramp | > 35% of saturated colours with HSL hue 235–290 (`ai-purple`, 3) |
| **Gradient text** | `bg-clip-text text-transparent` in every template | Top-voted complaint; hurts legibility and selection | Solid colour; emphasis by weight, size or colour | Any element with a gradient background clipped to text (`gradient-text`, 3) |
| **Gradients everywhere** (buttons, logo tile, CTA band, avatars) | Cheap "depth" | Nothing is special; muddy hierarchy | Solid fills; at most one purposeful gradient (analogous stops) | ≥ 5 gradient backgrounds (`gradient-everywhere`, 2) |
| **Coloured glow shadows / neon on dark** | `shadow-indigo-500/30`, "premium" prompts | Unasked-for glow reads as generated | Neutral, layered, low-alpha shadows; elevation only where there is a layer | ≥ 2 box-shadows with a saturated colour at ≥ 15% alpha (`coloured-glow-shadows`, 2) |
| **Emoji as icons** (⚡🔒🚀, ✨ badge, ✓ bullets) | No asset pipeline | Renders differently per platform; signals low effort. NN/g: ✨ has no shared meaning (0 of 106 people read the four-point star as "AI") | A single real icon set at matched stroke weight, or no icon | ≥ 2 elements whose own text is emoji-only, or emoji inside headings, nav, buttons or badges (`emoji-as-ui`, 2) |
| **Tinted icon tiles** (icon in a pastel rounded square, ×3–6) | The shadcn / Tailwind feature-grid block | Six equal cards say nothing is more important | A list, a table, a diagram, or the product itself; vary the composition | ≥ 3 square 32–72 px boxes with light saturated background, radius ≥ 8, ≤ 2 characters (`tinted-icon-tiles`, 2) |
| **Card soup** (every section as identical cards) | Card is the default container in every kit | No hierarchy; rhythm dies; more borders and shadows than content | Cards only for independent, actionable objects; lists, tables and prose otherwise | ≥ 6 card-like boxes (edge + radius ≥ 8 + padding ≥ 12) holding > 45% of the text (`card-soup`, 2) |
| **Pill everything / one big radius** | `rounded-full` / `rounded-2xl` defaults | Uniform softness; hierarchy flattened | A small radius scale by role, concentric radii, pills only for tags/chips | ≥ 4 pill buttons (`pill-everything`, 1); dominant radius ≥ 12 px on ≥ 8 boxes (`one-big-radius`, 1) |
| **Centred everything** | The hero template | Ragged, slow reading; no axis; sameness | A strong left axis; centre only short, symmetric moments | ≥ 80% of ≥ 3 section headings centred (`centred-section-headings`, 1); > 45% of text centred (`centred-everything`, 1) |
| **Badge pill above the hero** ("✨ New: AI-powered…") | Template | Pure chrome; often not news | Only when there is real news, as a link to it | Pill-shaped element < 44 px tall directly before the `h1` (`badge-pill-above-hero`, 1) |
| **Eyebrow above every heading** (tracked caps, mono) | Template; also the skill's own house style | Labels restate headings; code voice on non-code brands | Headings that front-load meaning; labels only where they add information | ≥ 60% of `h2` preceded by ≤ 14 px uppercase or tracked text (`eyebrow-above-every-heading`, 1); tracked-caps / mono chrome (`mono/tracked-caps chrome`, 1) |
| **Hover lift on everything** | `hover:scale-105`, `hover:-translate-y-1` | Motion without meaning; touch devices flash it | Hover changes contrast only; lift reserved for draggable or pickable objects | ≥ 3 elements matched by moving/scaling `:hover` rules (`hover-lift-everywhere`, 1) |
| **Glassmorphism** | Trend, Apple Liquid Glass | Contrast failures over busy backgrounds | Solid surfaces for text; blur only over calm backgrounds with a scrim (NN/g) | ≥ 2 backdrop-filter surfaces (`glass-blur`, 1). Low weight, as the data says |
| **The "tasteful default"** (cream + serif display + italic accent + sage/terracotta; hairlines; ink chapters) | Anti-slop advice converged here (Anthropic cluster 1; Reddit tell 0) | Now recognised on sight as "AI trying to be tasteful" | Look derived from the brand's assets, category and references; if cream + serif is genuinely the brand, write down why | Page background HSL L 0.88–0.985, hue 25–60, S > 0.15, *and* a serif heading face (`tasteful-default`, 3) |
| **Default fonts** (Inter/Geist as "no choice"; Instrument Serif/Fraunces/Playfair as "tasteful choice"; Space Grotesk as the second-order default) | Starter templates; first-order anti-slop advice | Nobody chose the voice | A face chosen for a reason (wordmark construction, voice, category) and a real pairing | Report `fontFamilies`; flag single-family Inter/Geist on *marketing* pages (not apps, where Inter is legitimate) |

#### B. App-UI tells: the less obvious list

| Tell | Why it happens | Why it hurts | Professional alternative | Detect |
| --- | --- | --- | --- | --- |
| **Marketing type in an app** (30–48 px headings, "Welcome back, Alex 👋") | Landing-page priors | Wastes the most valuable pixels; slows scanning | Page title names the place and scope (16–28 px); greeting only on true home or onboarding | Max text ≥ 32 px in `kind:'app'` (`marketing-type-in-app`, 2); greeting regex (`greeting-header`, 1) |
| **KPI tile row** ("$45,231.89 +20.1% from last month" ×4) | shadcn dashboard example | Numbers without targets, context or action; often fabricated | 3–5 decision metrics with target and comparison, linked to their records; sparklines; tabular numerals | ≥ 3 cards containing a % delta and ≥ 24 px text (`kpi-tile-row`, 1) |
| **Decorative charts** (bars with no axis, a donut "Traffic sources") | Charts as illustration | A picture of data, not data; misleads | Labelled axes, units, period, values on hover and in a table; position and length encodings (Few, NN/g) | ≥ 5 text-less filled bars of varied height or a conic-gradient pie with no digits nearby (`decorative-charts`, 2) |
| **Everything in cards** | Card as default container | Box noise; lost alignment; lower density | Tables and lists for collections; panels divided by space and hairlines; one elevation model (Plane) | Card-soup rule |
| **Low density** (16 px body, 40–48 px controls, 24 px card padding) | Marketing and mobile priors; shadcn defaults (36 px buttons, 24 px card padding) | More scrolling, less comparison, slower expert work | 13–14 px body, 28–32 px controls, 32 px rows, density modes (Fiori/Carbon/Material) | Body ≥ 16 and min control ≥ 40 in an app (`low-density-app`, 1) |
| **Toasts for routine success** | "Feedback" reflex | Far from the trigger; disappears; annoys | Inline confirmation at the trigger (Rauno); toasts for background events and undo | Fixed element in the bottom 40% with success/saved/updated text (`success-toast`, 0: advisory) |
| **Modals for everything** | Easiest container | Blocks context; trains reflexive dismissal (NN/g) | Inline expansion, side panels, dedicated pages; modals only for interruptions that need a decision | Manual review (count `dialog` / `[role=dialog]` triggers per screen) |
| **Every action is a filled button** | Button component overuse | No primary action; Hick's law | One primary per view (HIG: "one or two prominent buttons"); secondary as quiet buttons or links; tertiary in menus | Count of filled buttons per viewport > 2 (extend the probe) |
| **Icon-only toolbars** | Space saving, "clean" look | Only a few icons are universal; hover tooltips don't exist on touch | Visible labels for anything not universal; tooltip + shortcut on desktop; a named `aria-label` always | ≥ 3 icon-only buttons (`icon-only-toolbar`, 1) |
| **Missing states** | Happy-path generation | Blank containers, spinners forever, "No records" | Designed empty (first-use / no-results / cleared), loading (skeleton matching layout), error (cause + fix), dense | Manual: design-QA matrix (§1.7) |
| **Fake live data** ("Active now +573", "AI insights: revenue is trending up!") | Filler | Erodes trust in all the real numbers | Real or clearly fictional sample data; no boilerplate "insights" | `big-number-claims` (1) + copy review |
| **Upgrade upsell in the sidebar with a gradient** | Template | Chrome competes with work | Plan and upgrade in settings/billing, contextually when a limit is hit | Gradient-everywhere + manual review |

#### C. Copy and proof tells

- **Generic copy.** Supercharge, seamless, streamline, unlock, revolutionary, game-changer, cutting-edge, blazing, transform your, all-in-one, world-class, elevate. Probe rule `generic-copy` (w 2) at ≥ 3 hits. Fix: say what the product does, for whom, with a concrete noun and verb.
- **Unsupported big numbers** ("10x", "99.9%", "50K+ happy customers"). Probe rule `big-number-claims` (1) at ≥ 3. Fix: only real, sourced numbers; otherwise design a page that doesn't need them.
- **Fake social proof.** Five-star testimonials from "Sarah Johnson, CEO, TechCorp"; greyscale "Trusted by" wordmarks of fictional companies. Probe rules `five-star-testimonials` (1), `generic-copy` ("trusted by"). This is also a deceptive pattern; the skill's truth rule already forbids it.
- **Three-tier pricing with a "Most popular" glow.** `most-popular-tier` (0: advisory). Fine if true and if the tiers are real.
- **Template chrome strings** (Anthropic): meta joined with middle dots ("A · B · C"); "WORD — fragment" labels; a "→" appended to every link and button.

#### D. Process tells

These are not visible in a single screenshot, but they are what produce the other tells:
- judging from source;
- one viewport only;
- happy-path content only;
- the same component recipe on every section;
- no brand asset sampled before choosing colours;
- no written reason for any choice.

### 4.4 Detection tooling for the skill

- **`ui-probe.js`** (this stream; `research/experiments/G-product-lab/ui-probe.js`). A single function, `uiProbe({kind})`, run with Playwright's `page.evaluate`. It returns:
  - `facts`: families, sizes, body and max size, ratio, text and background colours, radii, spacings, shadows, gradients, card share, centred share, tracked caps, mono share, characters per line, interactive and text units in the fold, control and row heights, sub-24 px targets, pills, icon-only buttons, emoji-as-UI, hover-move rules, generic copy hits, big-number claims;
  - `tells` with weights and a `score`.

  Validated on 7 archetypes (§3.2): real systems 0; AI landing 25; AI dashboard 18 (11 at 390 px); house style 5. It is framework-agnostic because it reads the rendered result.
- **`devibe_scan.py`** (Reddit study, MIT). Greps the source for Tailwind and CSS signatures (`bg-clip-text text-transparent`, `from-purple-* to-blue-*`, the stock shadcn Card string, `--radius: 0.5rem`, cream hexes, Instrument Serif/Fraunces). It is useful before rendering and in CI, and complements the probe.
- **Suggested use:**
  - Run the probe in Phase 3 (baseline) and Phase 11 (QA) at 1440 and 390, with `kind` set from Gate 0.
  - Any `w ≥ 2` tell must be fixed or justified in writing in `DESIGN.md`.
  - Treat the score as a smoke alarm, not a grade: a page can score 0 and still be generic. The swap test and critique against objectives remain the real checks.

---

## 5. Inspiration sources: free vs paid, and how to use them

| Source | Cost | Best for | Notes |
| --- | --- | --- | --- |
| **Mobbin** | Free tier very limited (latest ~4 apps, few flows, 3 collections, no downloads); Pro ≈ £8–15/month | Real app flows (mobile + web), onboarding, settings, empty states | The best source for app *patterns*; screens are real products |
| **Refero** | Free ≈ 3% of library (searches capped); Pro ≈ $10/month | Web app screens with strong search by element and style | Web-first; 142k+ screens |
| **Page Flows** (ex-Screenlane) | $199/year for 3 users | Recorded user journeys with annotations | Motion and flow, not stills |
| **Land-book** | Free | Landing pages, daily | Marketing only |
| **Godly** | Free | Ambitious, animated marketing sites | Beware copying spectacle into products |
| **Lapa Ninja** | Free | Landing pages by category | Marketing only |
| **SaaS Landing Page** | Free | SaaS landing sections by type | Good for seeing the *generic* pattern you must beat |
| **Httpster** | Free | Fresh, eclectic sites | Good as the "contrary" reference |
| **Minimal Gallery** | Free | Restrained, typographic sites | — |
| **Siteinspire** | Free | Hand-picked since 2010; filter by style, type and subject | Highest signal-to-noise for editorial and brand sites |
| **One Page Love** | Free | One-pagers | Marketing only |
| **Awwwards** | Free to browse | Experimental, award-driven | Often inappropriate for products |
| **The Component Gallery** | Free | 60 components × 95 design systems (2,600+ examples) | **Best free source for app UI**: how serious systems solve tabs, tables, date pickers and empty states |
| **Checklist Design** | Free | Checklists per page, element and flow | Useful for design QA |
| **Open-source products** (Cal.com, Dub, Documenso, Plane, Twenty, Formbricks) + **open design systems** (Primer, Carbon, GOV.UK, Polaris, Atlassian, Fiori, Material) | Free, and reachable from this sandbox via GitHub/npm | Real tokens, component code, written philosophies (Plane's surface model, Twenty's type-scale comments) | The most *reliable* references for an agent: measurable, licensable to learn from, and not blocked here |

**Using inspiration without copying:**
- Choose references by *problem*: show a complex product simply; build trust without logos; make a table scannable.
- Gather several per problem, never one.
- Write what each does and **why**, as a principle, plus what you are *not* taking.
- Then **put the references away** while making.
- Check the result against the take/leave table and the swap test.
- Never lift a section's composition, illustration style or copy structure intact.

---

## 6. Originality: deriving a direction rather than picking a template

The method (for marketing and brand surfaces; for apps, steps 1–3 feed the interaction model and the tone, not decoration):

1. **Position.** Write the onlyness statement: *"Our [offering] is the only [category] that [benefit]"*, plus what, how, who, where, why and when (Neumeier, *Zag*). If it can't be written, the site can't be distinctive honestly; say so.
2. **Attributes as sliders, not adjectives.** Pick 3–5 attributes and place each on a *this ↔ not that* axis with a concrete example: "precise ↔ not clinical", "warm ↔ not cute", "confident ↔ not loud". Define each with a sample of copy, type and image (adjectives alone "lead to vague content"). These become the design principles; test them for reversibility.
3. **Sources of form that belong to the company.** Many of these are in the skill already:
   - the logo's colours and construction;
   - the moment the product serves;
   - the material of the business;
   - the customers' own world (photography);
   - the product itself (real UI rendered from real tokens, as Twenty does);
   - the vernacular of the industry (documents, instruments, signage), used as *reference* rather than costume.
4. **References by problem** (§5), each with take/leave.
5. **Make 2–3 directions at the right fidelity.**
   - A mood board sets the ballpark but is too vague to decide from.
   - **Style tiles** (Samantha Warren) fix fonts, colours and UI elements without a layout: "a middle ground between moodboards … too vague and comps … too literal".
   - **Element collages** (Dan Mall) assemble real fragments (a nav, a card, a chart, a headline) to show how the system behaves.

   Directions must differ on *family* (surfaces, type voice, imagery strategy, composition), not on values.
6. **Critique the directions against objectives** (§1.4) and the category dials (§2.0). Then pick one and write why.
7. **Convergence checks before code:**
   - **Swap test:** would this be right for the nearest competitor? If yes, it isn't a direction.
   - **House-recipe test:** does the one-sentence direction match the skill's known defaults (Anthropic's five clusters; the Reddit tell 0; the skill's own paper/serif/mono/ink/one-accent recipe), or an earlier output for this user?
   - **Second-order test:** did we pick this *because* it is the opposite of the obvious default? "Not purple" is not a reason; a reason must point at the company.
8. **Spend boldness in one place** (Anthropic's skill: "remove one accessory"). One memorable element; everything else disciplined.
9. **Keep a log of looks produced** (the skill's `lessons.md` already does this for corrections). Extend it to record each output's direction sentence so later runs can check distance.

---

## 7. Specific recommendations for the skill (prioritised)

1. **Add Gate 0: Classify** to `SKILL.md`, plus a new `references/product-categories.md` built from §2 (the dials table plus the ten playbooks).
   - Make the distance test, the keep-list gate, the hero rules and the motion language **conditional on category**.
   - For productive surfaces, replace them with task-based success criteria.
   - Change the description and trigger text so app, dashboard, ecommerce, docs and service redesigns route correctly, rather than being excluded ("Not for … application UI inside a product" should go).
2. **Rewrite the house-style anti-pattern around second-order convergence.** Cite Anthropic's five clusters and the Reddit ranking. Forbid the skill from recommending specific palettes or fonts as defaults anywhere (including examples that become defaults). Keep "derive from assets".
3. **Add `references/app-ui.md`:**
   - density numbers;
   - navigation models;
   - tables (NN/g's four tasks, Carbon row sizes, bulk actions, saved views);
   - dashboards (Few's mistakes; operational vs analytical);
   - an elevation model (Plane);
   - states (§1.7);
   - productive motion (Carbon tokens, Kowalski's frequency table);
   - command palette and shortcuts;
   - the app-UI tells (§4.3 B).
4. **Upgrade the audit** (`audit.md`):
   - top-tasks inference and confirmation;
   - multi-pass heuristic evaluation with severity rated separately (0–4, frequency × impact × persistence);
   - a cognitive walkthrough of the top 3 tasks;
   - a content inventory with ROT verdicts;
   - a component/state inventory;
   - an AI-tell baseline (probe).
5. **Add a written brief** (§1.3) to `templates/DESIGN.md`: category map, top tasks, ranked problems, Ström-tested principles, non-goals, success measures.
6. **Change the critique template to *objective → element → effect → why*** with named critique modes. Keep "every 'no' becomes a fix".
7. **Ship the probe** (`ui-probe.js`) with the skill scripts. Run it at baseline and in QA at 1440 and 390 with `kind`, and require a justification for any `w ≥ 2` tell. Optionally vendor `devibe_scan.py`-style source checks into the audit script.
8. **Research phase:** when live sites are unreachable, use open-source products and design systems from GitHub/npm as measurable references, together with the Component Gallery / Mobbin / Refero list in §5 for when a browser is available.
9. **Ecommerce, fintech and government modules:** the Baymard checkout rules, fee transparency and regulated-copy prominence, and the GOV.UK one-thing-per-page pattern belong in the category reference as *hard constraints*. Brand expression in those flows is limited to imagery, tone and content.

---

## 8. Sources

**Read directly from primary sources in this session (GitHub / npm / Apple / Anthropic)**
- Vercel, *Web Interface Guidelines*: https://github.com/vercel-labs/web-interface-guidelines (README.md, AGENTS.md); https://vercel.com/design/guidelines
- Rauno Freiberg, *interfaces*: https://github.com/raunofreiberg/interfaces
- Emil Kowalski, design-engineering skill and animation standards: https://github.com/emilkowalski/skills
- Jakub Krehel, *make-interfaces-feel-better*: https://github.com/jakubkrehel/make-interfaces-feel-better
- Anthropic, `frontend-design` skill: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Anthropic / Claude blog, "Improving frontend design through Skills": https://claude.com/blog/improving-frontend-design-through-skills
- JCarterJohnson, *vibecoded-design-tells* (data, tells catalogue, `devibe_scan.py`, "choosing a look"): https://github.com/JCarterJohnson/vibecoded-design-tells
- Twenty CRM (app tokens `packages/twenty-ui/design-tokens`, `twenty-front/src/index.css`, `RecordTableRowHeight.ts`; website tokens `packages/twenty-website/src/tokens`, `fonts/README.md`, `app-preview/preview-font-size.ts`): https://github.com/twentyhq/twenty
- Cal.com (`packages/config/theme/tokens.css`): https://github.com/calcom/cal.com
- Dub (`packages/tailwind-config/tailwind.config.ts`): https://github.com/dubinc/dub
- Plane (`packages/tailwind-config/AGENTS.md`, "Design System Philosophy Guide"): https://github.com/makeplane/plane
- Documenso, Formbricks (theme files inspected): https://github.com/documenso/documenso, https://github.com/formbricks/formbricks
- shadcn/ui v4 registry (new-york-v4 card, button, table, input; `apps/v4/app/globals.css`): https://github.com/shadcn-ui/ui
- GOV.UK Frontend 5 (npm `govuk-frontend`: `settings/_typography-responsive.scss`, `_spacing.scss`, dist CSS)
- GitHub Primer (npm `@primer/css` 21.5.1 and 22.3.2; `@primer/primitives` size and typography tokens)
- IBM Carbon (npm `@carbon/styles` CSS; `@carbon/motion` tokens and easings)
- Apple Human Interface Guidelines (typography, buttons, tab bars, layout), via developer.apple.com JSON: https://developer.apple.com/design/human-interface-guidelines/

**Via web-search summaries** (pages blocked for direct fetch here; used for methods and statistics)
- NN/g:
  - How to conduct a heuristic evaluation: https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/
  - Severity ratings: https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/
  - Cognitive walkthroughs: https://www.nngroup.com/articles/cognitive-walkthroughs/
  - Why you only need to test with 5 users: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/
  - Card sorting, how many users: https://www.nngroup.com/articles/card-sorting-how-many-users-to-test/
  - Tree testing: https://www.nngroup.com/articles/tree-testing/
  - Data tables, four major user tasks: https://www.nngroup.com/articles/data-tables/
  - 8 design guidelines for complex applications: https://www.nngroup.com/articles/complex-application-design/
  - Dashboards and preattentive processing: https://www.nngroup.com/articles/dashboards-preattentive/
  - Modal and nonmodal dialogs: https://www.nngroup.com/articles/modal-nonmodal-dialog/
  - The sparkles icon problem: https://www.nngroup.com/articles/ai-sparkles-icon-problem/
  - Glassmorphism: https://www.nngroup.com/articles/glassmorphism/
  - Design principles: https://www.nngroup.com/articles/design-principles/
- Cognitive walkthrough (Wharton et al.; Spencer): https://en.wikipedia.org/wiki/Cognitive_walkthrough
- Gerry McGovern, *Top Tasks*: https://gerrymcgovern.com/books/top-tasks-a-how-to-guide/; MeasuringU: https://measuringu.com/top-tasks/
- JTBD / switch interview, forces of progress: https://jobstobedone.org/
- Adam Connor & Aaron Irizarry, *Discussing Design* (O'Reilly): https://www.oreilly.com/library/view/discussing-design/9781491902394/
- Figma, "How we do design critiques at Figma": https://www.figma.com/blog/design-critiques-at-figma/
- Matt Ström-Awn, "What makes a good design principle?": https://mattstromawn.com/writing/principles/
- Refactoring UI (Wathan & Schoger): https://refactoringui.com/
- Rauno Freiberg, "Invisible Details of Interaction Design": https://rauno.me/craft/interaction-design
- Linear:
  - How we redesigned the Linear UI (part II): https://linear.app/now/how-we-redesigned-the-linear-ui
  - A design reset (part I): https://linear.app/now/a-design-reset
  - First Round Review on Linear: https://review.firstround.com/linears-path-to-product-market-fit/
  - Karri Saarinen's 10 rules (Figma blog): https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/
- Stripe:
  - Designing accessible color systems: https://stripe.com/blog/accessible-color-systems
  - Markdoc: https://stripe.dev/blog/markdoc
- Superhuman (speed, command palette): https://www.lennysnewsletter.com/p/superhumans-secret-to-success-rahul-vohra
- Airbnb DLS: https://karrisaarinen.com/posts/building-airbnb-design-system/
- Adam Wathan's indigo tweet: https://x.com/adamwathan/status/1953510802159219096
- Baymard:
  - Checkout usability: https://baymard.com/research/checkout-usability
  - Minimise form fields: https://baymard.com/blog/checkout-flow-average-form-fields
  - Cart abandonment rate: https://baymard.com/lists/cart-abandonment-rate
  - Product list UX 2025: https://baymard.com/blog/current-state-product-list-and-filtering
  - Filters for list info: https://baymard.com/blog/have-filters-for-list-item-info
  - In-scale images: https://baymard.com/blog/in-scale-product-images
  - Payment UX: https://baymard.com/blog/payment-ux
  - Pagination vs infinite scroll vs load more (Smashing Magazine): https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/
- GOV.UK:
  - Service Standard: https://www.gov.uk/service-manual/service-standard
  - Design principles: https://www.gov.uk/guidance/government-design-principles
  - Question pages: https://design-system.service.gov.uk/patterns/question-pages/
  - One thing per page: https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
- Carbon:
  - Motion: https://carbondesignsystem.com/elements/motion/overview/
  - Typography: https://carbondesignsystem.com/guidelines/typography/type-sets/
  - Data table: https://carbondesignsystem.com/components/data-table/style/
- SAP Fiori cozy/compact density: https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/visual/cozy-compact
- Material density: https://m3.material.io/foundations/layout/grids-spacing/density
- Atlassian design principles: https://atlassian.design/resources/atlassian-design-principles/
- Shopify Polaris content fundamentals: https://polaris-react.shopify.com/content/fundamentals
- Stephen Few, "Common Pitfalls in Dashboard Design": https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- Google HEART (Kerry Rodden): https://kerryrodden.com/heart/
- Diátaxis: https://diataxis.fr/
- FCA COBS 4.2, fair, clear and not misleading: https://handbook.fca.org.uk/handbook/cobs4/cobs4s2
- Coalition for Better Ads, 30% mobile ad density: https://www.betterads.org/mobile-ad-density-higher-than-30/
- Wise design system and Wise Sans: https://medium.com/transferwise-design/going-everywhere-meet-the-new-wise-design-system-863731563f71; https://type-01.com/wise-sans-the-font-update-shaping-wises-visual-identity/
- Style tiles and element collages: https://v3.danmall.com/articles/rif-element-collages/; https://aneventapart.com/news/post/faster-design-decisions-with-style-tiles-by-samantha-warren-an-event-apart
- Marty Neumeier, the onlyness test: https://www.martyneumeier.com/the-onlyness-test
- Inspiration libraries:
  - Mobbin vs Refero: https://mobbin.com/blog/mobbin-vs-refero
  - Mobbin alternatives (Page Flows, Refero): https://www.toolworthy.ai/blog/mobbin-alternatives
  - The Component Gallery: https://component.gallery/
  - Checklist Design: https://www.checklist.design/
  - Land-book: https://land-book.com/
- AI-slop discourse:
  - Why every AI-built website looks the same: https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p
  - Why your AI keeps building the same purple gradient website: https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
  - Stop building AI slop data dashboards: https://handyai.substack.com/p/stop-building-ai-slop-data-dashboards

**Reproducing the measurements.** Serve `research/experiments/G-product-lab/pages/` over HTTP. Supply CSS from npm in `pages/css/` (`govuk-frontend@5` dist CSS + `assets/`, `@primer/css@21` `primer.css`, `@carbon/styles@1` `styles.min.css`, and a Tailwind 3 build of the `slop-*` pages). Then run `node run-probe.mjs http://127.0.0.1:8765`, using Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Captures are in `shots/`; full results are in `probe-results.json`.
