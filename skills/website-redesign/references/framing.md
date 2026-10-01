# Phase 0 — Frame the problem

Read before anything else. When the context is thin — no site, a brand that lives on social media, an unfamiliar industry, an empty folder — run the triage in `discovery.md` §1 first, inside this phase. The single biggest predictor of a right or wrong redesign is getting the *kind* of surface right: a landing page, a dashboard used all day and a checkout need different philosophies, and applying one aesthetic everywhere is how a skill tuned for marketing sites breaks a product. The output of this phase is the brief at the top of `DESIGN.md`.

## 1. Classify every route

Most repositories hold more than one kind of surface — a marketing site and an app, a storefront and an account area, docs and a dashboard. Classify **per route or route group**, not per repo, and by the job the route does for the people who use it, not by how it is built today: a public-service start page dressed as a marketing hero is a service page, and the hero is part of what the redesign fixes. One company, two philosophies is normal: Twenty CRM's marketing site sets body at 16–18 px with display up to 120 px and four expressive families; its app uses a 13 px root, one family, a 24 px maximum and 32 px table rows — and the marketing site renders its product mock-ups *at the app's 13 px using the app's real tokens*.

**How to tell a visited route from a used one**

| Signal | Visited (expressive) | Used (productive) |
| --- | --- | --- |
| Who | strangers, once or twice | the same people, daily |
| Session | seconds to minutes, scrolling | minutes to hours, task after task |
| Success | remembered, persuaded, converted | the task done fast, correctly, without strain |
| Reading mode | glancing, then a story | scanning, comparing, entering data |
| Density | one idea per viewport | as high as comprehension allows |
| Navigation | a few pages in a linear story | many tools, jumped between |
| Copy | persuasive | labels, states and instructions of 2–4 words (NN/g) |
| Motion | can carry the concept | explains change and shows live state, nothing more |
| Imagery | photography can carry the concept | almost none — the product's own data |

The signals feed the category and posture below; they do not replace them.

| Category | What it is | Posture |
| --- | --- | --- |
| Marketing / landing | persuades a visitor who arrives a few times at most | expressive |
| SaaS app | recurring work, often for hours | productive |
| Analytics / monitoring dashboard | notice what needs attention, act or explore | productive |
| Ecommerce | find, trust, buy | persuasive in browsing, productive in checkout |
| Enterprise / B2B data | many records processed correctly, all day | productive |
| Dev tools and docs | reach a working integration; find the exact answer | productive (docs), expressive (dev-tool marketing) |
| Fintech / banking | know where the money stands; move it safely | reassuring |
| Mobile-first consumer | one thing, quickly, one-handed, interrupted | tactile |
| Field / frontline tool | spot the exception and act on it, gloved, in glare, with patchy signal | robust |
| Content / editorial | read, understand, return | reading |
| Public service | complete a mandatory task first time, whoever you are | plain |
| Signature experience (builder, configurator, studio, visualiser) | the reason the business is remembered; people play with it and show others | signature — expressive in fidelity and feel, productive in chrome and controls |

Hybrids take the rule of their job. Sign-in, empty states and onboarding are doors: one brand moment, then out of the way (`app-ui.md` §12). Docs keep the productive posture, with prose at a reading size and measure (`categories.md` "Developer tools and documentation"). A calculator inside an app is a tool.

When a marketing site is becoming an application — a transaction needs a human decision (a quote, an approval, a booking), customers have their own state, an operator runs a daily workflow, or capacity is finite — classify the customer routes and the operator's back office separately. The operator's device, often a phone, is recorded like any other route's (`discovery.md` §5, `templates/PRODUCT.md`).

For each route write: category, **frequency** (once · occasional · weekly · daily · all day), **stakes** (what goes wrong if the user errs: nothing · lost time · lost money · legal/health consequence), **device and context** (desk, phone one-handed, shared screen, poor network), and **posture**. Expressive surfaces may spend novelty; productive surfaces spend it almost nowhere. The dials each category sets — body size, density, motion and novelty budget, colour's job, what gets visual weight, navigation model, metrics — are in `categories.md`. Run `audit.mjs` with the matching `--kind`; a signature route runs `--kind app` for its chrome and controls, and the experience itself is judged against its written quality bar (`interactive.md` §3).

## 2. Choose the intensity

| Intensity | Changes | Keeps | Typical asks |
| --- | --- | --- | --- |
| **Refine** | problems found in the audit: hierarchy, contrast, states, density, copy, responsiveness, performance | identity, information architecture, flows, learned locations | "our dashboard is hard to use", "fix the mobile experience", "make it accessible", "tidy this up" |
| **Redesign** | the visual system: type, colour roles, composition, imagery, components' look, motion | information architecture, flows, facts, routes, contracts | "make it look premium / like a real studio did it", "rebrand the site", "it looks generic / AI-made" |
| **Rethink** | structure: IA, navigation, flows, page inventory, plus the system | facts, routes (or redirects), contracts, data | "nobody finds anything", "the onboarding loses people", "we're repositioning" |

A first site (greenfield) runs as **rethink** with no baseline, and the brief says so. What the customer meets today — the social profile, a competitor's template, a PDF menu — stands in for "the old site", and the five first-notice things come from it and from the category template (`discovery.md`); the five-things and keep < replace + create rules below apply to it as to any expressive redesign.

The user's words set the starting point; the audit can argue for more or less. Say so when it does ("you asked for a visual redesign; the audit shows the checkout's problems are structural"), and let the user decide if the scope grows. Intensity is per route too: a marketing-site redesign often travels with a refine of the app it links to.

**What the classification switches on or off**

| Rule | Expressive, redesign or rethink (a first site included) | Productive (any intensity) |
| --- | --- | --- |
| Five first-notice things must change, except a documented brand asset kept on purpose and named with its reason (`art-direction.md` §4–§5); keep < replace + create | yes | no — keep what users have learned unless evidence says it fails |
| Hero concept, a page argument, composition that changes when content changes kind | yes | no — repeat the right layout; one layout family per task type |
| Motion | two or three concept moves, each with a job; content finished without them | only to explain change; nothing on keyboard actions or anything done 100+ times a day; on what is done tens of times a day, ≤ 150 ms colour or opacity at most (`motion.md` §2) |
| Novelty | spent in one place | near zero; brand lives in type, colour roles, tone, empty states and rare moments |
| Density | low, generous | medium to very high; density modes where users differ |
| Success measured by | memorability, clarity in five seconds, conversion, credibility | task success, time, errors, learnability, accessibility |
| Critique rows that matter most | distance, first viewport, rhythm, tells | top tasks, states, density, consistency, keyboard |

Signature routes spend novelty and fidelity on the experience itself, while their chrome and controls follow the productive column; how much any route or moment asks the visitor to operate is its interaction level, with a ceiling per surface (`interactive.md` §2).

**Redesign risk on used routes.** People who use a product daily pay for every change before they benefit from it. On a productive redesign or rethink: keep task and feature parity, old against new; learned locations keep their place or get a signpost; nothing costs a migration (redirects work; accounts, saved views and drafts survive); legibility beats novelty. Expect change aversion — dissatisfaction that fades within a few weeks for people who stay — and tell it apart from real failure by outcomes (task success, errors, support contacts), not by the volume of complaint. Recommend a staged rollout or opt-in period with a named metric and a rollback trigger (`technical-qa.md`, "After launch").

## 3. Qualities that are often confused

A redesign must be **appropriate first**; attractive-but-inappropriate is the characteristic failure of a marketing-trained eye. A redesign that treats an application like a landing page fails its users slowly: every screen costs a scroll, every label is a little harder to read, every visit replays an entrance nobody needs.

| Quality | What it means | How to test it |
| --- | --- | --- |
| Attractive | coherent and pleasing at first sight; buys tolerance (aesthetic–usability effect) | five-second test; beside the category's best |
| Usable | top tasks completed effectively and efficiently | cognitive walkthrough, task time, errors, usability test |
| Appropriate | fits category, audience, frequency and stakes | the category dials; "what is this, and is it serious?" |
| Accessible | usable with disabilities and in constrained contexts | `accessibility.md`: WCAG 2.2 AA, keyboard, screen reader names, zoom, motion |
| Polished | the invisible details are right: alignment, radii, timing, states, copy | the design QA matrix in `visual-qa.md` |
| Maintainable | built from tokens and components; every value has a source | distinct-value counts in `audit.mjs`; component reuse |
| Performant | fast to load and to respond (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75) | `performance.md` |
| Responsive | designed for each viewport class, not squeezed | `responsive.md`; renders at five widths; zoom and reflow |

## 4. Users and top tasks

Start from tasks, not pages (Gerry McGovern: a handful of tasks account for most use). Build the candidate list from the repo — routes, navigation labels, calls to action, form purposes, search — and from whatever evidence the user can give: analytics, search logs, support tickets, reviews, sales notes. Rank by evidence, keep at most five, and **ask the user to confirm them**; if they cannot, write them in the brief as assumptions. For each top task note the start, the end, the steps and decisions, and where the user must remember something between steps. In apps and commerce the top task *is* the hero.

Mine words, not just numbers: reviews and tickets say what people fear (anxieties become trust content), what they are used to (habits become migration and import features), and the words they use (labels come from here, not from the org chart). Never invent this evidence; its absence is written down as an assumption.

## 5. The question bank

Answer in writing; the unanswerable ones become assumptions or questions for the user.

- **Outcome.** What would success look like in six months, and which number would move? Who pays and who uses — the same person? What must not change: contracts, legal copy, brand assets, URLs, workflows people have in their fingers? What was tried before?
- **Users.** Who uses this, how often, on what device, under what pressure (time, money, compliance, stress)? What do they do just before and just after? Who is the least confident user we must still serve?
- **Tasks and hierarchy.** What is the primary task per screen, and is there exactly one primary action? What deserves the most visual weight — and is it visually the most important thing now? What is frequent and what is rare? What must be immediately visible, and what can be one step away (never more than two levels of disclosure)?
- **Surface.** Is this persuasion, work, reading, or a transaction? Marketing experience or working software? What does the category expect (Jakob's law), and where would breaking the expectation pay off?
- **Brand.** What existing brand language must survive — mark, face, colours, tone? What should change, and why?
- **Constraints.** Framework, component library and its licence, CMS, hosting, performance budget, accessibility level (WCAG 2.2 AA is the floor; the European Accessibility Act and ADA Title II make it legal, not optional, for many clients), languages and scripts, RTL.
- **Reuse.** What components, tokens and patterns already exist that can be restyled rather than reinvented?
- **Reality.** What happens with long names, 10,000 rows, zero rows, slow networks, errors, translations to German or Arabic, a cheap Android phone, 200% zoom, a keyboard only?
- **Honesty.** Is anything here fake — metrics, logos, testimonials, urgency? What would a regulator, a support agent or a lawyer flag?
- **Measurement.** How will we know it worked, what is the baseline, and can it be A/B tested, or must it be judged by research?

## 6. The brief (top of `DESIGN.md`)

- **Surfaces:** route → category, frequency, stakes, posture, intensity.
- **Audience and context:** who, doing what, on which device, under what pressure.
- **Top tasks:** ranked, ≤ 5, with the evidence (or "assumption").
- **Problems:** ranked by severity × task importance, each traceable to an audit finding.
- **Principles:** three to five that can say no. A principle passes if a reasonable team could hold its opposite ("one primary action per screen", "the user's content outranks our chrome"); "clean", "modern" and "user-friendly" fail.
- **Non-goals:** what this redesign deliberately does not do.
- **Constraints:** stack, contracts to preserve, surviving brand assets, legal copy, accessibility level, performance budget, languages.
- **Success measures:** per category, with the baseline where one exists.

The brief is short — half a page. If it cannot be written, the redesign is not ready to start, and the gap is the first thing to tell the user. When context is thin, build it rather than guess (`discovery.md`); if the project has a `PRODUCT.md` (`templates/PRODUCT.md`), the surfaces, top tasks and success measures come from it (its routes, arrival situations and targets), and its product principles are not restated here.
