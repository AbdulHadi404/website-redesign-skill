# Inspiration and reference — where to look, and how to use it without copying

Checked 2026-09-28. Choose references by the problem they solve (`research.md`), write the principle you take and what you leave, then put them away while you make.

## Galleries and pattern libraries

| Source | Cost | Best for | Note |
| --- | --- | --- | --- |
| The Component Gallery | free | how ~95 design systems solve the same component (tabs, tables, date pickers, empty states) | the best free source for app UI |
| Mobbin | free tier very limited; Pro paid | real app flows (onboarding, settings, empty states), web and mobile | the best source for app *patterns* |
| Refero | free ≈ 3% of the library; Pro paid | web-app screens searchable by element and style | — |
| Page Flows | paid | recorded user journeys | motion and flow, not stills |
| Checklist Design | free | checklists per page, element and flow | good for design QA |
| Siteinspire | free | hand-picked brand and editorial sites since 2010, filterable | the best signal-to-noise for marketing |
| Land-book, Lapa Ninja, One Page Love, SaaS Landing Page | free | landing pages by category | useful for seeing the generic pattern you must beat |
| Godly, Awwwards | free to browse | ambitious, animated sites | beware importing spectacle into products |
| Httpster, Minimal Gallery | free | eclectic / restrained sites | a good "contrary" reference |

## Design systems worth reading (their documentation *source* is on GitHub)

GOV.UK Design System (forms, error summary, question pages, plain language — the reference for services), USWDS, IBM Carbon (productive vs expressive type and motion; data tables; states; notifications), GitHub Primer (forms, saving, loading thresholds, accessibility sections with "how to test"), Shopify Polaris (resource index/detail, content guidelines — learn, don't borrow its look), Adobe Spectrum 2 (states, attention hierarchy, density), Microsoft Fluent 2 (tokens, motion), Atlassian (token naming, messages), Material 3 (HCT colour, density, motion tokens), Red Hat PatternFly (navigation, wizards, token grammar), Twilio Paste (notifications, voice and tone), Kiwi Orbit (component-page template), Pinterest Gestalt (messaging), Elastic EUI (tables, save patterns). Token packages on npm (`@carbon/styles`, `@primer/primitives`, `@fluentui/tokens`, `@atlaskit/tokens`, `govuk-frontend`) can be rendered and measured locally.

## Open-source products (read their tokens and decisions in code)

| Product | What to learn |
| --- | --- |
| Twenty (CRM) | one company, two philosophies: a 13 px app with 32 px rows; a marketing site at 16–18 px with 120 px display that renders product mock-ups in the app's real tokens and a "fiction palette" for sample data |
| Cal.com | neutral, themeable chrome because the product shows the *customer's* brand (booking pages, embeds) |
| Plane | a written elevation model — one canvas, sibling surfaces, layers inside a surface; no surface in a surface |
| Dub | restrained link-management UI; modal and popover motion tokens |
| Documenso, Formbricks | document signing and forms flows; theming |

## Writing on craft (primary sources)

Vercel's Web Interface Guidelines, Rauno Freiberg's *interfaces* and "Invisible details of interaction design", Emil Kowalski's animation standards, Jakub Krehel's "Details that make interfaces feel better", Refactoring UI (Wathan & Schoger), Linear's redesign write-ups, Stripe's "Designing accessible color systems", GOV.UK's design notes blog, NN/g articles, Baymard's public research, Stephen Few's dashboard papers, Datawrapper's blog, the FT Visual Vocabulary, Chartability.

## Using references without becoming derivative

- Several references per problem, never one; never one reference's whole look.
- Write each as a principle with its *why*, plus what you are deliberately not taking; store it in `DESIGN.md`.
- Put the references away while making; compare against the take/leave table and the swap test afterwards.
- Never lift a section's composition, illustration style or copy structure intact. Brand-clone files ("DESIGN.md of Stripe", "make it look like Linear") are imitation by design — use them, if at all, as evidence of what a system decided, not as a direction.
