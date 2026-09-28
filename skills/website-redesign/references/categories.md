# Category playbooks — what "good" means per kind of surface

Read in Phase 0 after classifying the routes, and again in Phase 3. The numbers come from design-system source code and open-source products read on 2026-09-28 (Twenty, Cal.com, Plane, Primer, Carbon, GOV.UK Frontend, Fluent 2, Atlassian, Spectrum 2, Apple HIG) and from published research (NN/g, Baymard, Stephen Few); `research/streams/G-…` and `B-…` hold the evidence. They are norms to start from, not laws — a deliberate departure is fine when it is written down with a reason.

## The dials

| Dial | Marketing / landing | SaaS app | Dashboard | Ecommerce | Enterprise / B2B | Docs / dev tools | Fintech | Mobile-first consumer | Content / editorial | Public service |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Frequency | once to a few visits | daily, hours | daily, glance or deep-dive | occasional, task-driven | all day | often, in bursts | daily glance; rare high-stakes acts | many short sessions | daily to occasional | rare |
| Body text | 16–20 px | 13–14 px | 12–14 px | 14–16 px | 13–14 px | 15–16 px prose, 13–14 code | 14–17 px | 16–17 px | 17–21 px | 19 px (16 on phones) |
| Largest text | 48–120 px | 20–28 px | 24–32 px (a few key numbers) | 24–40 px | 20–28 px | 32–48 px | 28–40 px (the balance) | 28–34 px | 32–56 px | 48 px (32 on phones) |
| Density | low | medium–high | high | medium | very high | medium | medium–low | medium | low | low |
| Motion | 1–3 orchestrated moments + quiet reveals | only to explain change; none on keyboard actions | none except live-data updates | micro-feedback, image zoom | none | none in docs | confirmation moments | gesture-driven, physical | none | none |
| Novelty | high, in one place | low | very low | medium (in imagery) | very low | low | low | medium | medium (in typography) | zero |
| Colour's job | identity + one action colour | neutral chrome; accent = action and selection; semantic = status | data encodings + status only | product imagery dominates; one action colour | neutral + status | neutral + syntax | trust colour; unambiguous gains and losses | brand + action | neutral; links | fixed palette |
| Visual weight | the idea, the product, real proof | the user's content and current object | the anomaly; the metric against its target | product image, price, add to cart | the data and the selected record | code, search, the answer | balance, what is due, the next safe action | the one primary action | the article | the question and the Continue button |
| Navigation | top nav ≤ 7 + one CTA | sidebar + command palette + shortcuts | filters + drill-down | search + categories + filters | sidebar + tabs + saved views | left tree + search (⌘K) + on-page TOC | tab bar ≤ 5 | tab bar ≤ 5 / bottom actions | sections + related | linear flow + back link |
| Success | visit → signup/demo, CTA click-through, bounce, CWV | activation, time-to-value, retention, task time, errors | time to detect and act; decision accuracy | conversion, add-to-cart, checkout completion, AOV, search exits | task time, errors, records per hour | time to first successful call, search success | task completion, support contacts, trust | D1/D7 retention, session success | read depth, return visits, subscriptions | completion rate, digital take-up, satisfaction |

Measured reference points: Primer body 14 px with 3 type sizes on an issues page (largest 16 px); Carbon productive set 14 px fixed vs expressive 16 px fluid, table rows 24/32/40/48/64 px; Twenty app 13 px root and 32 px rows; SAP Fiori compact 32 px rows vs cozy 44 px touch; GOV.UK 19/16 px body, 5 px spacing base, no radii, 3 text colours per page; Apple iOS body 17 pt (minimum 11), 44 pt targets; Primer minimum target 16 px on fine pointers, 44 px on coarse.

## Marketing / landing site

- **Goal:** understand what it is, for whom and why it matters in seconds; take one action.
- **Good:** one memorable idea; the product shown large and early; real proof or no proof; chapters with varied compositions; restraint; fast. This is what the rest of this skill's art-direction method is for (`art-direction.md`, `web-design.md`).
- **Typical failures:** the generic skeleton (centred hero + badge pill + two pill buttons + three icon cards + logo wall + pricing + CTA band); invented proof; motion on everything; a slow hero video; the model's "tasteful" recipe.
- **Do not import from apps:** dense tables above the fold; UI chrome used as decoration.

## SaaS app (frequent use)

- **Goal:** get recurring work done fast and without errors. Every flourish is paid for hundreds of times.
- **Good:** the user's content outranks the chrome (Linear's 2024 redesign dimmed the sidebar, shrank icons, removed coloured backgrounds from nav); opinionated defaults over settings; progressive disclosure through intent (Notion's `/` menu); a command palette that shows each command's shortcut so users graduate to it; optimistic updates with undo; inline editing and inline confirmation; designed empty states; state in the URL (filters, tabs, pagination); one named elevation model (Plane: one canvas → sibling surfaces → layers inside a surface; never a surface nested in a surface).
- **Numbers:** 13–14 px body; controls 28–32 px (36 in touch contexts); rows 32–40 px; 4 px spacing base; radii 4–8 px; low-alpha two-layer shadows only for overlays.
- **Typical failures:** card soup; marketing-size headings; "Welcome back, Alex 👋" in the title slot; a toast for every save; modals for forms that could be inline; every action a filled button; icon-only toolbars without labels or shortcuts; missing states.
- **Do not import from marketing:** big hero type, scroll reveals, hover lifts, gradients and glow, testimonial energy, illustration in the chrome.
- Details: `app-ui.md`.

## Analytics and monitoring dashboards

- **Two kinds** (NN/g): *operational* — is anything wrong, act now; *analytical* — explore and decide. Decide which before placing anything. Stephen Few's definition of the first: the most important information, consolidated on one screen so it can be monitored at a glance.
- **Good:** three to five decision-driving metrics, each with a target or comparison and a period; deviations carry the visual weight, not raw totals; position and length encodings (bars, lines); colour used sparingly to flag; axis values, units and freshness on every chart; drill-down to the records; alert states distinct from normal.
- **Few's recurring mistakes:** exceeding one screen, no context (target or comparison), excessive precision, the wrong measure, the wrong chart, meaningless variety, decoration (3D, gauges, dials, pies), misused colour.
- **The AI version:** four KPI tiles reading "+20.1% from last month" with no target; unlabelled sparklines; a donut of "traffic sources"; boilerplate "AI insights". Details: `dataviz.md`.

## Ecommerce

- **Goal:** find the right product, trust it, buy it without friction. Distinctiveness belongs in imagery, tone and content, never in custom checkout controls.
- **Product lists** (Baymard): "mediocre or worse" on 58% of desktop and 78% of mobile sites (2025); filters for every attribute shown in the list; multi-select filters; "Load more" with lazy loading outperforms both pagination and infinite scroll; several thumbnails per product.
- **Product page:** price, variant and add-to-cart prominent and unique; an in-scale image (42% of users judge size from images; 28% of sites have none); delivery date and cost visible early; on phones, a persistent buy bar is common.
- **Checkout — hard constraints:** guest checkout as the most prominent option; total cost including shipping and fees visible before the last step (extra costs are the top abandonment reason at 48%, forced accounts 26%, trust 25%, length 22%); about eight fields suffice where the average is 11.3; one "Full name" field; Address line 2, Company and Coupon behind links; billing = shipping by default; an explicit review step; single-column forms with labels above; `autocomplete` on every field.
- **Do not import from marketing:** scroll-jacking, animated reveals of product images, novel form controls, low-contrast pastel buttons.

## Enterprise / B2B data software

- **Goal:** process many records correctly and quickly — often in a tool the user did not choose.
- **Tables serve four tasks** (NN/g): find records (search and filters prominent), compare (frozen headers, aligned tabular numerals, hover rows), view or edit one (detail panel, inline edit), act (selection + bulk actions that appear only once something is selected). Management tables paginate — 25 rows default, 10/25/50/100 offered, the choice remembered — rather than scroll infinitely.
- **Density:** offered, not imposed — comfortable default, compact per table or per user on mouse-and-keyboard surfaces, never on touch; density changes padding and row height, not font size.
- **Power features:** saved and shared views; multi-criteria filters; keyboard navigation and shortcuts shown in tooltips and the command palette; pinned identifier columns; column customisation; drafts for long edits.
- **Read-only is a state**, distinct from disabled (locks, permissions, processes) — focusable and full-contrast. Details: `app-ui.md`.

## Developer tools and documentation

- **Docs structure** (Diátaxis): tutorials (learning), how-to guides (goals), reference (information), explanation (understanding). Mixing them is the main failure.
- **Good:** Stripe's three columns (navigation, prose, live code); the user's own keys when signed in; copy buttons; a first successful call within minutes; ⌘K search; an on-page table of contents; a version switch.
- **Numbers:** prose 15–16 px at 60–75 characters; code 13–14 px monospace. Monospace belongs here — and, per `lessons.md`, essentially only here.
- The dev tool's *marketing* can be expressive, but it shows real code and real UI.

## Fintech and banking

- **Goal:** know where my money stands; move it safely.
- **Hard constraints:** every fee, rate and arrival time before commitment (Wise's transfer flow); transaction states always visible; deliberate friction (review, confirm) on high-stakes acts; gains and losses carry sign *and* colour, never colour alone; tabular numerals; one currency format (0 or 2 decimals, never mixed); required risk text keeps its prominence — regulation (e.g. the UK FCA's "fair, clear and not misleading" and Consumer Duty) forbids burying it, and selective emphasis can mislead even when every sentence is true.
- **Brand** can be bold in marketing; the product stays calm.

## Mobile-first consumer

- **Goal:** one thing, quickly, one-handed, often interrupted.
- **Good:** 16–17 px body; targets ≥ 44 × 44 pt (48 dp); one or two prominent buttons per view, with *style*, not size, marking the preferred one (Apple HIG); a tab bar for navigation (≤ 5 single-word items, never used for actions, never hidden or disabled); primary actions in the lower two-thirds; every gesture with a visible alternative; physical, interruptible motion; offline and slow-network states; safe-area insets; inputs ≥ 16 px (iOS zooms smaller ones).
- **Do not import from desktop marketing:** hover-dependent affordances, wide multi-column heroes, tiny tracked-caps labels. Details: `responsive.md`.

## Field and frontline tools (work done away from a desk)

Farm, warehouse, clinical, site, retail-floor and delivery tools: a phone or rugged tablet used many times a shift, one-handed or gloved, in glare, noise or cold, with patchy signal and constant interruption. The dashboard and SaaS numbers above are desk numbers; applying them here produces the missed alert. (Found in a blind test of this skill on a dairy herd screen: the desk defaults and the "low density" app tell both pushed toward exactly the wrong thing.)

- **Goal:** spot the exception, find the record, act on it, and trust what the screen says about how fresh it is.
- **Dials:** body 16–18 px; key figures 20–32 px; targets **48 px minimum, 56 px for gloved or wet hands**, with 8 px between; density low–medium, **exceptions first** (the items needing action before the full list); motion none; colour reserved for status, with a word and a shape beside it; contrast aiming at 7:1 for outdoor glare; one screen per job plus search.
- **Input:** search that tolerates how people type identifiers (spaces, case, partial tag numbers); a numeric-keypad mode (`inputmode="numeric"`) for codes; no drag, swipe-only or long-press as the only way; no hover.
- **Connectivity honesty:** always say how fresh the data is ("Updated 05:42", "No signal · saved 05:42"); keep the last good copy and label it as a copy; never show "Synced" without a successful sync; a service worker caches the app shell, never the data as if it were current; retry that the user can see.
- **Interruption:** actions are undoable and survive a reload (kept locally and labelled "on this phone" until they sync); drafts persist; the screen reopens where it was.
- **Success:** time to detect and act on an exception, missed-alert rate, errors, and whether it still works on a bad day (no signal, gloves, sun).
- **Typical failures:** a desk table squeezed onto a phone (the status column cut off); an alerts panel below forty rows; a sync button that always says "Synced"; tiny icon buttons; colour-only status in sunlight.

## Content and editorial

- **Goal:** read, understand, come back. Weight belongs to the article.
- **Good:** 17–21 px body at 45–75 characters; generous leading; a strong heading hierarchy; real bylines and dates; related content that is related; brand expressed through typography and per-story art direction.
- **Ads**, if any: the Coalition for Better Ads caps mobile ad density at 30% of the main content height; pop-ups, prestitials, autoplay video with sound and large sticky ads fail its standard.

## Public services

- **Goal:** complete a mandatory task first time, whoever you are.
- **Principles** (GOV.UK): start with user needs; do less; do the hard work to make it simple; this is for everyone; be consistent, not uniform.
- **Hard constraints:** one thing per page to start with (the question is the `h1`, inside the legend); an error summary at the top, focused on submit, linking to each field; a back link; plain words; "Continue" as the button; no decoration. Brand expression is effectively zero, by principle.

## When a repo holds several categories

Give each its own type set and density on one token system (Carbon's productive and expressive sets are the model). Share the truth: the marketing site shows the product in the product's real tokens, with obviously fictional data. When the product is out of scope *and* still wears the look the redesign is removing, do not import that look back into the marketing site: render the fragment in the new tokens at the product's real type size and density, say so in `DESIGN.md`, and recommend a refine of the product so the two meet. Never let marketing type, motion or gradients leak into the app, or app density into the landing page.
