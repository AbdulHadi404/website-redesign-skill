# <Business> — product definition

Written <date> in Phase 0 from `discovery/` (`discovery.md` §5). The source of truth for what is built: if a decision stops matching how the business actually works, change it here first. Order of documents: `PRODUCT.md` (what we build) → the `DESIGN.md` brief (how each route is classified and judged) → `SYSTEM.md` (how components carry it out); refer, don't repeat.

## What we are building

One paragraph: the customer side, the operator side, and the record they share.

## Who it is for

The 3–5 real arrival situations (where they came from, what they already know, what they want to do in the next five minutes), each with the path the product gives them and a target ("request sent in under 3 minutes"). These are the source of the `DESIGN.md` brief's top tasks; each target becomes a success measure there.

## Principles (settle arguments with these)

5–7 product and business rules, each specific enough to decide a disagreement ("never show a price the owner hasn't set"). The 3–5 design principles live in the `DESIGN.md` brief and are not repeated here.

## Information architecture

| Route | Purpose |
| --- | --- |

Each route is then classified in the `DESIGN.md` brief (`framing.md` §1).

What was deliberately *not* made a page, and why.

**Taxonomy:** stable navigation (the business's persistent identity), filters (occasions or uses), and tags (trends, which are never navigation).

## The configurable thing (if any)

- **Model:** every variable, its options, and its dependencies. This is the single source of truth for preview, summary, estimate, messages and the stored record.
- **Flow:** a few chapters, not a field list. What is asked, what is inferred, and what only appears conditionally.
- **Preview:** how the customer sees their choices, and how honestly it is labelled (a sketch is not a render).
- **Estimate:** the formula (only the owner's own numbers), what makes it refuse to show a number, and how it is worded.
- **Starting from an example:** which parts stay fixed and which are editable.

## Lifecycle (shared by customer and operator)

| Lifecycle status | Meaning | Who acts next | Customer sees |
| --- | --- | --- | --- |

A few lifecycle statuses, each matching a real decision, in the same words on both sides. Money tracked separately from lifecycle status (how). Derived states (which; "due this week" comes from the date, and the operator never clicks it).

## The operator side

The views the operator needs, in the order of their day ("what needs me today" first), on the device they actually use. Why a generic CRM, CMS or spreadsheet was or wasn't chosen. Operator routes are classified and specified in `DESIGN.md` and `SYSTEM.md` like any other.

## V1 and later

**V1:** … **Later:** …

## Open questions only the owner can answer

Prices, policies, contact details, claims, permission to quote customers… Keep this list in step with the owner's questions in `todo.md` (`discovery.md` §7).
