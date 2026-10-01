# Phase 0 (continued) — Discovery, when the context is thin

> **The less reliable product and design context you are given, the more deliberately you build that context yourself before designing.**

Audit (Phase 1) assumes there is a site to audit and a company that already knows what it sells online. Many briefs have neither: a business that lives on Instagram, a first website, an unfamiliar industry, a "make it better" with no reference, or a "website" that turns out to be an application with an operator behind it. In those cases the audit has little to work on, and a designer who starts drawing produces the category's template. Discovery supplies the evidence the audit lacks; the audit still runs, on whatever exists.

Frame (`framing.md`) always runs, and this triage happens inside it. When the triage says so, discovery runs before Audit. Its outputs are write-ups in `discovery/` and, when the site is becoming an application, a product definition (`templates/PRODUCT.md`). Then Phases 1–8 run as usual.

**When there is no old site.** What the customer meets today plays the old site: the social profile, a competitor's template, a PDF menu. Take the five first-notice things from it and from the category template. When it is a URL you may load, run `audit.mjs` and `capture.mjs` on it now, and at Phase 6 compare performance with `perf.mjs --base <new> --before <stand-in URL> --paths /`; when it is not, say there is no measured baseline and hold the new build to the `performance.md` §1 budgets. The intensity is **rethink** with no baseline (`framing.md` §2), and the brief says so. At hand-off, run `parity.mjs --greenfield --after <new> --crawl 40 --source discovery src` (`technical-qa.md`, "Parity with the old site"): every claim on the new site must be in the transcribed highlights, captions and owner's answers (write the answers into `discovery/` as they arrive). `src` is searched too, so a number or quote typed into a component counts as sourced: keep claims in content or data files that come from the owner or `discovery/`, never in components. Route, id, field and metadata parity do not apply; the script reports them as not applicable, and the Phase 8 gate accepts that run.

**The project's discovery folder.** In the project, discovery output goes in `discovery/`. The write-ups (`discovery/brand-audit.md`, `discovery/domain.md`, `discovery/architecture.md`) are committed as project memory. Raw downloads (media, scraped captions, highlight frames) go in `discovery/raw/`, which is listed in `.gitignore` and never shipped. Elsewhere in this skill, `research/…` means the skill repository's own evidence, not this folder.

## 1. Triage: how much discovery does this need?

Decide in the first minutes of Frame, in writing. Several rows can apply.

| Situation | Signals | What to add before designing |
| --- | --- | --- |
| **Redesign of a working site** | A repo, a clear product, known customers | Nothing beyond Frame and Audit (`framing.md`, `audit.md`). |
| **No site; the brand lives on social media** | An Instagram/TikTok/Facebook page is the main asset | §2 social audit: the profile *is* the old site and the brand guidelines |
| **Unfamiliar domain** | You cannot list the variables a customer chooses, or what the operator needs to act | §3 domain research until you can |
| **No references supplied** | "Make it premium", "like a real studio did it" | §4 references: direct, adjacent-problem, and one deliberately different |
| **The website is becoming an application** | Orders need a human decision (quote, approval, booking), per-customer state, an operator workflow, capacity | §5 both sides, one shared record; `templates/PRODUCT.md` |
| **Greenfield stack** | Empty folder, "choose the foundation" | §6 architecture decision recorded before scaffolding |
| **Long-running, multi-session work** | Big scope, the user expects to return later | §7 project memory from day one |

A website becoming an application (its operator routes are a surface of their own) and a signature feature (`interactive.md` §3) are also classified per route in `framing.md` §1.

**How much is enough.** Discovery is not a timer. Stop researching a topic when it has changed a decision and further reading would not change another. Every topic must end in a written consequence ("servings in the customer's words, not diameters", "quote-first, not checkout"). A topic that produced no decision was browsing. Keep the research, drop the topic.

## 2. Social media as brand input

When the profile is the brand, study it like an archive, not a feed.

1. **Collect everything, programmatically.** Scrolling and eyeballing samples the newest dozen posts. Pull every post's image URL and caption from the page DOM into structured data (and the story highlights frame by frame), then download the media **with the user's permission** (§8) into `discovery/raw/`. Social pages block most export paths (CSP, popups, downloads). A form POST to a local receiver, or reading the DOM in chunks, usually works.
2. **Contact sheets, numbered.** Name each image by its index (`discovery/raw/000.jpg` …) and look at every sheet of 24, six across: `node scripts/compare.mjs --grid discovery/raw/{000..023}.jpg --labels {000..023} --cols 6 --out discovery/raw/contact-000.png`, then `{024..047}`, and so on (the braces need bash or zsh; on the last sheet give only the numbers that exist). Numbering lets you cite evidence ("posts 000–060 share one backdrop") and pick heroes later.
3. **Census, then signature.** Count what the business actually makes, by category. Then separate the **signature** (the work that is recognisably theirs) from the **bread-and-butter** (what pays the bills and looks like everyone else's). Lead the site with the signature and give the rest a category.
4. **Photography eras and sets.** Most accounts have eras (kitchen bench, then a white cloth, then a proper backdrop). The newest consistent set is often a stronger identity asset than the logo. **Sample its colours from the photos** like you sample a logo (`scripts/palette.mjs --from photo.png`; it reads PNG, so convert JPEG first), and consider staging the site the way they stage their photos (`imagery.md`, "The client's own photographs").
5. **The logo versus the work.** Social-first businesses often have a logo made before their style matured (clip-art, generated, multicolour). When the logo and the work disagree, follow the work, keep the logo's meaningful parts (name, lockup, a colour, a motif), and put any refinement of the mark to the owner as a proposal. The brand layer still comes from the brand's own assets (`SKILL.md` commitment 3): for a social-first brand whose logo predates its style, the newest consistent photo set counts as a brand asset beside the logo.
6. **Highlights and pinned posts are the FAQ, price list, reviews and policies.** Read every frame: size or serving charts, "how to order", customer messages (real proof, usable verbatim with permission), process videos. Transcribe highlights and customer messages into `discovery/` so `parity.mjs --source` finds them; otherwise every real testimonial is flagged as unsourced.
7. **Voice from captions.** Person (first or third), tone, humour, spelling habits and the phrases customers repeat back. The site's copy should sound like the owner on a good day, not like an agency.
8. **Customers from captions and tags.** Occasions, communities, languages and cultural or dietary requirements shape navigation, trust signals and even which facts go in the hero.
9. **How the business runs today.** DMs, lead times in the bio, screenshots of customer messages, "link in bio". These reveal the pain the product should remove, which is usually information lost in chat.

Write it up as `discovery/brand-audit.md`, citing post numbers. It is the source for `audit.md` §2 (the company); the rest of the audit runs on whatever exists.

## 3. Learning an unfamiliar domain

Research the domain until you can answer, without guessing:

- **The configuration variables.** What does a customer choose, what does each option depend on, and which choices only appear after another? The disclosure order in the UI follows this dependency graph, not taste (`ui-ux.md` §4).
- **The customer's words versus the trade's words.** Customers know "how many people", "heart-shaped", "less sweet". The trade says "8-inch double barrel", "Lambeth". Design in the first vocabulary, and label with the second only as a hint.
- **The workflow.** From first contact to fulfilment: which steps need a human, what information is required before each one, and where orders stall.
- **Pricing mechanics.** What drives price (and what barely does), whether a price can be computed or must be quoted, and the local range. Never invent a business's prices. Design the UI to work honestly when prices are unknown.
- **Capacity and time.** Lead times, what a day or week can hold, rush rules, seasonality.
- **Physical and regulatory constraints.** Transport, storage, heat, allergens, licensing. These become care instructions, validation and things the site must not claim.

The output is `discovery/domain.md`: short, and recording **only what changed a decision**, with its sources.

## 4. References when none were supplied

Choose them by problem (`research.md`, "Choose references by problem"): local direct competitors for the market's structure and price bands, adjacent products that solved the same interaction problem, and one deliberately different tone. Record them in the `DESIGN.md` "References" table. A list of URLs is not research.

## 5. When the website is becoming an application

Signals: a transaction needs a human decision, customers have state (an order, a booking, a quote), someone runs a daily workflow behind the site, or capacity is finite. Then:

- **Design both sides around one shared record.** The customer creates it (a specification), the operator acts on it, and both see the same words for its state.
- **Model the lifecycle with few, meaningful lifecycle statuses** that match real decisions. Track money separately from lifecycle status, and **derive** what can be derived (for example "due this week" from the date) instead of making the operator click it.
- **Find the operator's device.** Owner-operators run their business from a phone. A desktop CRM or CMS admin on a phone is the wrong tool even when it is free. Classify the operator routes in `framing.md` §1 like any other; they are often mobile-first or field-like.
- **CRM, CMS admin, or custom?** Choose a generic system when the work is generic (contacts, pipelines) and the volume justifies it. Build a small purpose-built back office when the work is domain-specific (a visual spec, capacity, references) and the operator is one person. Keep an export path either way.
- **Honesty is a product feature.** Estimates only from the operator's own numbers; "quoted personally" when they are missing; policies shown from settings, not hard-coded copy.
- **Configurators and signature features:** model the options before the screens, and classify any feature meant to be the reason the business is remembered as a signature route (`interactive.md` §3, §6).

Write the result in `templates/PRODUCT.md`: journeys, principles, IA, the configurator model, lifecycle, operator views, and V1 versus later. That document is what the art direction and the architecture follow; the `DESIGN.md` brief then takes its surfaces, top tasks and success measures from it (its arrival situations and their targets) and does not restate its principles.

## 6. Greenfield architecture, decided not defaulted

This is the exception to "stay in the existing framework" (`SKILL.md` Phase 5, `design-systems.md` §1): there is none yet.

Before scaffolding, write a requirements table (what the *product* needs: static SEO pages, an interactive client, uploads, auth for whom, capacity rules, notifications, cost at the business's scale, who maintains it), then compare real options, including "use an existing product". Record the requirements, the choice and why each major alternative lost in `discovery/architecture.md`, committed with the other write-ups; `DESIGN.md` Constraints and `CLAUDE.md` (§7) name the stack and point to it. Check the facts that bite small businesses: **free hosting tiers that forbid commercial use**, databases that pause when idle, adapters that drop image optimisation. Keep the core portable (standard runtime, an ORM, a storage interface) so hosting stays a later, reversible decision that needs the user's approval.

## 7. Project memory for long projects

Only for multi-session, greenfield or long work. From the first hour, keep the repository able to brief a new session:

- `CLAUDE.md`: what the product is, the principles that must not break, the stack and commands, the repo map, business rules, and what needs the user's approval. Extend an existing `CLAUDE.md` rather than overwrite it, and tell the user it was written.
- `progress.md`: the current state, what was tested and how, what was not, and known limitations.
- `todo.md`: a prioritised backlog of deliverables, plus **questions only the owner can answer**.
- Decisions live in the document they belong to (`PRODUCT.md`, `discovery/architecture.md`, `DESIGN.md`), not in chat.

Update them *during* the work. A session that ends without updating them has left the next one to guess.

## 8. Permissions discovery needs

Downloading a client's social media, reading their stories (which may notify them), creating accounts, publishing, and pushing a new repository to a remote belong to the user; ask once, precisely (what, from where, how much, where it will be stored). Pushing the working branch of an existing project follows `SKILL.md` Phase 8. Raw material stays out of the shipped repo, in `discovery/raw/` (see the folder note above).
