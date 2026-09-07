# Phase 1 — Audit

Goal: understand the company and the current site well enough that the redesign is *about them*. Do not propose fixes yet; a diagnosis written before the investigation is finished is where generic redesigns begin.

## 1. The repository

Read, do not skim:

- **Framework and build**: package manifest, config, scripts (`dev`, `build`, `lint`, `test`, `typecheck`). Note the deployment target and whether pushes deploy anything.
- **Routes and pages**: every page, including legal, error and utility pages. Note dynamic or server-rendered routes and what they depend on.
- **Layout and shared components**: nav, footer, section wrappers, buttons, heading styles. Which are reused where.
- **Styling system**: tokens, global CSS, utility framework, fonts (families, weights, where loaded), palette, radii, shadows, breakpoints.
- **Brand assets**: logo files, favicon, icon sets, brand guidelines or docs if they exist. **Sample the logo's actual colours** (a few lines of Python or an eyedropper — record the hex values in `DESIGN.md`) and describe the wordmark's construction (geometric, humanist, serif, techno, condensed). These are the starting point for the palette and the display face; note the *meaning* of the mark as a motif you can turn into a system.
- **Imagery**: real screenshots, photos, illustrations, videos. Real product UI is the most valuable asset a marketing site can have — find out whether any exists and whether the product can be run locally for capture.
- **Motion**: existing animation code, reveal systems, scroll effects, reduced-motion handling.
- **SEO and meta**: titles, descriptions, canonical, Open Graph and social image, structured data, sitemap, robots.
- **Analytics, forms and integrations**: tracking snippets, form handlers, API routes, third-party embeds (captcha, chat, booking), anything with ids or data attributes that scripts depend on.
- **Content**: every headline, paragraph, claim, number, customer name, price. Copy is a source of truth for what the company believes it sells.
- **Docs and history**: README, design notes, changelog, recent commits — they explain constraints you would otherwise trip over.

Write down everything that **must be preserved** as an explicit list: routes, anchors other pages link to, element ids wired to scripts, form field names, API contracts, analytics events, legal text, third-party embeds. You will restyle around these; you will not break them.

## 2. The company

From the repo and anything the user gave you, answer in writing:

- What does the company sell, in one sentence a customer would use?
- Who buys it — role, company type, the moment they are in when they look for it?
- What is the primary value proposition, and what are the two or three strongest capabilities behind it?
- What pain does it remove? What is the differentiator versus obvious alternatives?
- What real proof exists: customers, logos, testimonials, numbers, case studies, product UI, a live demo, awards? List only what is real. Absence of proof is a design constraint, not a gap to fill with invention.
- What should a visitor remember after leaving?

If the product has a distinctive *moment* — a call being answered, a shipment arriving, a document signed, a number updating live — name it. Concepts are built from moments, not from adjectives.

## 3. The rendered site

Run the project and look at every page at desktop and phone width. Capture full pages (see `visual-qa.md` for methods). Then name the weaknesses specifically. Vague diagnoses ("feels dated") produce vague fixes; specific ones produce direction:

- Typography: same size everywhere, no display scale, default weights, no line-length control, headline wrapping left to chance.
- Composition: one section template repeated (heading → paragraph → grid of three), everything centred, everything the same width, no chapters.
- Hero: headline + paragraph + two buttons + a screenshot or an abstract blob.
- Colour: palette used decoratively rather than as a system; accent colour on everything.
- Imagery: none, or stock photos that could belong to any company.
- Product: described in bullets, never shown.
- Motion: none, or generic fade-ups on everything, or animation with no meaning.
- Mobile: desktop layout squeezed, not designed.
- Consistency: nav and footer from a different era than the homepage; secondary pages untouched.

## 4. Audit output

Write the audit into `DESIGN.md` (section "Audit") using `templates/DESIGN.md`. Include the preserved-list. This document is what the art direction will be derived from, and the record the user can check your reasoning against.
