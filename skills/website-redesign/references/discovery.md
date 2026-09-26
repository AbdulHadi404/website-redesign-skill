# Phase 0 — Discovery (when the context is thin)

> **The less reliable product and design context you are given, the more deliberately you build that context yourself before designing.**

Phase 1 assumes there is a site to audit and a company that already knows what it sells online. Many briefs have neither: a business that lives on Instagram, a first website, an unfamiliar industry, a "make it better" with no reference, or a "website" that turns out to be an application with an operator behind it. In those cases the audit has nothing to audit, and a designer who starts drawing produces the category's template. Discovery is the phase that replaces the missing audit with evidence.

Read this before Phase 1 whenever the triage below says so. Its outputs are research documents and a product definition (`templates/PRODUCT.md`), and then Phases 1–8 run as usual, with "the old site" replaced by whatever the customer meets today (the social profile, a competitor's template, a PDF menu).

## 1. Triage: how much discovery does this need?

Decide in the first minutes, in writing. Several rows can apply.

| Situation | Signals | What to add before designing |
| --- | --- | --- |
| **Redesign of a working site** | A repo, a clear product, known customers | Nothing. Phase 1 is enough. |
| **No site; the brand lives on social media** | An Instagram/TikTok/Facebook page is the main asset | §2 social audit: the profile *is* the old site and the brand guidelines |
| **Unfamiliar domain** | You cannot list the variables a customer chooses, or what the operator needs to act | §3 domain research until you can |
| **No references supplied** | "Make it premium", "like a real studio did it" | §4 references: direct, adjacent-problem, and one deliberately different |
| **The website is becoming an application** | Orders need a human decision (quote, approval, booking), per-customer state, an operator workflow, capacity | §5 both sides, one shared record; `templates/PRODUCT.md` |
| **Greenfield stack** | Empty folder, "choose the foundation" | §6 architecture decision recorded before scaffolding |
| **Long-running, multi-session work** | Big scope, the user expects to return later | §7 project memory from day one |

**How much is enough.** Discovery is not a timer. Stop researching a topic when it has changed a decision and further reading would not change another. Every topic must end in a written consequence ("servings in the customer's words, not diameters", "quote-first, not checkout"). A topic that produced no decision was browsing. Keep the research, drop the topic.

## 2. Social media as brand input

When the profile is the brand, study it like an archive, not a feed.

1. **Collect everything, programmatically.** Scrolling and eyeballing samples the newest dozen posts. Pull every post's image URL and caption from the page DOM into structured data (and the story highlights frame by frame), then download the media **with the user's permission** into a local research folder that is not shipped or committed. Social pages block most export paths (CSP, popups, downloads). A form POST to a local receiver, or reading the DOM in chunks, usually works.
2. **Contact sheets, numbered.** Tile every image with its index and look at all of it. Numbering lets you cite evidence ("posts 000–060 share one backdrop") and pick heroes later.
3. **Census, then signature.** Count what the business actually makes, by category. Then separate the **signature** (the work that is recognisably theirs) from the **bread-and-butter** (what pays the bills and looks like everyone else's). Lead the site with the signature and give the rest a category.
4. **Photography eras and sets.** Most accounts have eras (kitchen bench, then a white cloth, then a proper backdrop). The newest consistent set is often a stronger identity asset than the logo. **Sample its colours from the photos** like you sample a logo, and consider staging the site the way they stage their photos.
5. **The logo versus the work.** Social-first businesses often have a logo made before their style matured (clip-art, generated, multicolour). When the logo and the work disagree, follow the work, keep the logo's meaningful parts (name, lockup, a colour, a motif), and put any refinement to the owner as a proposal.
6. **Highlights and pinned posts are the FAQ, price list, reviews and policies.** Read every frame: size or serving charts, "how to order", customer messages (real proof, usable verbatim with permission), process videos.
7. **Voice from captions.** Person (first or third), tone, humour, spelling habits and the phrases customers repeat back. The site's copy should sound like the owner on a good day, not like an agency.
8. **Customers from captions and tags.** Occasions, communities, languages and cultural or dietary requirements shape navigation, trust signals and even which facts go in the hero.
9. **How the business runs today.** DMs, lead times in the bio, screenshots of customer messages, "link in bio". These reveal the pain the product should remove, which is usually information lost in chat.

Write it up as `research/…brand-audit.md`, citing post numbers. It replaces Phase 1's company audit.

## 3. Learning an unfamiliar domain

Research the domain until you can answer, without guessing:

- **The configuration variables.** What does a customer choose, what does each option depend on, and which choices only appear after another (progressive disclosure comes from the dependency graph, not from taste)?
- **The customer's words versus the trade's words.** Customers know "how many people", "heart-shaped", "less sweet". The trade says "8-inch double barrel", "Lambeth". Design in the first vocabulary, and label with the second only as a hint.
- **The workflow.** From first contact to fulfilment: which steps need a human, what information is required before each one, and where orders stall.
- **Pricing mechanics.** What drives price (and what barely does), whether a price can be computed or must be quoted, and the local range. Never invent a business's prices. Design the UI to work honestly when prices are unknown.
- **Capacity and time.** Lead times, what a day or week can hold, rush rules, seasonality.
- **Physical and regulatory constraints.** Transport, storage, heat, allergens, licensing. These become care instructions, validation and things the site must not claim.

The output is a short domain document that records **only what changed a decision**, with its sources.

## 4. References when none were supplied

Choose them for the *problem*, not the category:

- **Direct competitors** in the same city or niche, to learn the market's structure and price bands, and what customers already expect.
- **Adjacent products that solved the same interaction problem**: configurators (rings, sofas, sneakers), template personalisation (invitations, cards), quote-and-approve flows (tradespeople, event vendors), booking with capacity (salons, tours).
- **One deliberately different tone**, so the direction is chosen rather than defaulted.

Record each as **Reference → Useful because → Lesson we apply → Deliberately not taken**. A list of URLs is not research. When a browser pane will not render (hidden, throttled), read the page text; structure and copy are often enough for an interaction reference.

## 5. When the website is becoming an application

Signals: a transaction needs a human decision, customers have state (an order, a booking, a quote), someone runs a daily workflow behind the site, or capacity is finite. Then:

- **Design both sides around one shared record.** The customer creates it (a specification), the operator acts on it, and both see the same words for its state.
- **Model the lifecycle with few, meaningful statuses** that match real decisions. Track money separately from status, and **derive** what can be derived (for example "due this week" from the date) instead of making the operator click it.
- **Find the operator's device.** Owner-operators run their business from a phone. A desktop CRM or CMS admin on a phone is the wrong tool even when it is free.
- **CRM, CMS admin, or custom?** Choose a generic system when the work is generic (contacts, pipelines) and the volume justifies it. Build a small purpose-built back office when the work is domain-specific (a visual spec, capacity, references) and the operator is one person. Keep an export path either way.
- **Honesty is a product feature.** Estimates only from the operator's own numbers; "quoted personally" when they are missing; policies shown from settings, not hard-coded copy.
- **Configurators:** start from what the customer understands (a finished example or a shape), keep one evolving picture of *their* object in view, show options as pictures of that option, group choices into a few chapters, never lose a choice on going back, and label any generated preview honestly (a sketch is not a render).

Write the result in `templates/PRODUCT.md`: journeys, principles, IA, the configurator model, lifecycle, operator views, and V1 versus later. That document is what the art direction and the architecture follow.

## 6. Greenfield architecture, decided not defaulted

Before scaffolding, write a requirements table (what the *product* needs: static SEO pages, an interactive client, uploads, auth for whom, capacity rules, notifications, cost at the business's scale, who maintains it), then compare real options, including "use an existing product". Record the choice and why each major alternative lost. Check the facts that bite small businesses: **free hosting tiers that forbid commercial use**, databases that pause when idle, adapters that drop image optimisation. Keep the core portable (standard runtime, an ORM, a storage interface) so hosting stays a later, reversible decision that needs the user's approval.

## 7. Project memory for long projects

From the first hour, keep the repository able to brief a new session:

- `CLAUDE.md`: what the product is, the principles that must not break, the stack and commands, the repo map, business rules, and what needs the user's approval.
- `progress.md`: the current state, what was tested and how, what was not, and known limitations.
- `todo.md`: a prioritised backlog of deliverables, plus **questions only the owner can answer**.
- Decisions live in the document they belong to (product, architecture, design), not in chat.

Update them *during* the work. A session that ends without updating them has left the next one to guess.

## 8. Permissions discovery needs

Downloading a client's social media, reading their stories (which may notify them), creating accounts, publishing and pushing all belong to the user. Ask once, precisely (what, from where, how much, where it will be stored), and keep raw research material out of the shipped repo.
