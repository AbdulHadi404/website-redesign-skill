# Web design — pages, heroes, responsiveness, performance

What a marketing page is made of and how it is judged. Read at the end of Phase 3 (page narrative) and through Phase 5. Companions: `design-theory.md` (the visual system), `ui-ux.md` (interaction), `implementation.md` (composition rules), `technical-qa.md` (the checklist).

## 1. What a homepage must do (NN/g's five principles)

1. **Be reachable**: the logo links home from every page; the URL is predictable; the homepage looks different from inner pages.
2. **Say what the company does, in seconds**: company name and mark top-left; a tagline that says *what this is and for whom* in the visitor's words; the differentiator, not the category.
3. **Show, don't list**: real content examples above the fold (the product, a real screen, a real offer) rather than category links; a visual cue that there is more below.
4. **Prompt the next step**: descriptive links with high information scent; a clear hierarchy of primary tasks; primary navigation where people expect it.
5. **Keep it simple and standard**: conventions people already know; minimal motion (moving things are read as ads); fast; no pop-ups unless the law requires one.

Two numbers from the same research: a load delay of 1 → 3 s raises bounce by **32%**; people spend most of their viewing time at the **top** of the page.

## 2. The landing-page formula (and the test for the headline)

**Sequence**: nav → hero → proof (only if real) → call to action → features written as objections answered → call to action again → footer. **Purchase = Desire − (Labour + Confusion)** — every chapter either raises desire, or lowers the effort or the doubt; anything else is cut.

**Hero** = header + subheader + one visual + one call to action.

- **Header test**: *"If a visitor read only this sentence, would they know exactly what we sell?"* "Improve your workflow" fails; "Groceries delivered in an hour" passes. Then add the hook — a bold specific claim, or the biggest objection answered in the same breath.
- **Subheader**: one or two sentences: what it *is*, then the specific thing that makes the claim believable.
- **The visual** is the product doing the thing (a real screen, the credential, the live widget) on its own ground — never a decorative photo, never a screenshot floating on a gradient.
- **The call to action** continues the sentence the hero started ("Get your Passport", "Start hiring") — not "Submit", "Learn more", "Request a meeting".

**Features as objections**: each feature is a header that states its value in plain words (no "empower", "revolutionise", "seamless"), a paragraph that answers the doubt a buyer would raise, and an image that shows it working.

**Proof**: only what exists — real customers, real numbers, real product. Where there is none, the design must not need it (the audit's rule); an empty logo wall or an invented testimonial is a credibility hole, not a placeholder.

**Copy**: specific beats vague every time; benefits to the reader, not achievements of the company; short. People read 20–28% of the words (`ui-ux.md` §3).

**Validation**: show it to two people outside the market (is it clear? appealing?) and two inside it (is it different from the alternatives?) before calling it done.

## 3. Chapters and rhythm

A page is a sequence of chapters, each with one job, one composition and one surface:

| Chapter kind | Composition | When |
| --- | --- | --- |
| Hero | split (copy / object), or one statement over a product panel | always first |
| Product / demo | the product at full width on its own panel, with a heading that says what to try | early — the product is the proof |
| Diagram / process | a drawn path with nodes and milestone art; vertical rail on phones | "how it works" |
| Index / register | a ruled list, a two-column table, a numbered ledger | features, FAQ, what is included |
| Statement | one line at display size, one action | a claim, a price, the closing |
| Split | copy beside a panel or drawn object | a secondary product feature, referrals, a comparison |
| Field | a full-bleed brand-colour chapter — once per page | the identity moment |
| Closing | statement + one action; then the footer | always last |

No two adjacent chapters share a composition; surfaces alternate (white → grey → tint → dark) so structure is visible from a distance; the accent field appears once. Cards only for card-shaped content. The full composition rules are in `implementation.md`.

## 4. Responsive strategy

- `<meta name="viewport" content="width=device-width, initial-scale=1">`; relative units; fluid grids (`fr`, `minmax`, `auto-fit`); images `max-width: 100%` **with `width` and `height` attributes** so nothing shifts while they load.
- **Breakpoints come from the content, not from devices**: design at ~360–390 first, widen until the layout has more space than it needs, add a breakpoint there. Major breakpoints change the layout; minor ones adjust margins, sizes and positions.
- **Measure** is the usual trigger: when a text block passes ~70–80 characters, cap the column or add a column.
- Do not hide content by screen size — information needs do not depend on the device; reorder, resize, collapse.
- Test the mid widths (1024, 768) as carefully as the ends: two-column heroes squeeze there first.
- Sticky header + anchors: `scroll-margin-top`. A `backdrop-filter` on a sticky header traps fixed descendants — put the blur on a pseudo-element.

## 5. Performance is design

- **Core Web Vitals** at the 75th percentile, mobile and desktop separately: **LCP ≤ 2.5 s** (needs improvement to 4 s; poor beyond), **INP ≤ 200 ms** (to 500), **CLS ≤ 0.1** (to 0.25). TTFB and FCP diagnose LCP.
- The hero image or panel is the LCP candidate: eager, `fetchpriority="high"`, sized explicitly, modern format, ~150–300 KB; everything below the fold lazy.
- Fonts: preconnect, only the weights used, swap; no layout shift from late fonts (matching fallback metrics or `size-adjust`).
- No runtime framework for static content; client JS only where a route needs it (a live widget, a demo).
- Third-party embeds (chat, analytics, captcha) are the usual CLS and INP culprits; load them late and reserve their space.

## 6. Navigation, header, footer

- Header: mark + wordmark left (links home), ≤ 5–7 links, the primary action right; on phones the primary action stays visible and the links go behind a labelled "Menu". The sticky header gains a rule or shadow only once the page has scrolled.
- Footer: the map of the site (product, company, legal), the legal row, a restated brand line; on a consumer site, the categories or regions served, if real. A large wordmark in the footer is a legitimate identity moment.
- Every section that people might link to gets a real address (no `#` fragments if the project has that rule) and `scroll-margin-top` for the sticky header.

## 7. Imagery on marketing pages

- Real people who work at the company, real product screens, real objects — looked at. Decorative stock — ignored (`ui-ux.md` §3).
- One consistent treatment so a set reads as a series; copy always on its own ground (split, fade-to-surface, or panel); hero eager, the rest lazy; credits recorded. Full sourcing rules in `imagery.md`.
- When there is no photography, the graphics layer is drawn — diagrams, milestone art, glyphs, watermarks — in one line style and the brand palette, and it is inspected element by element (`visual-qa.md`).

## 8. Metadata and social

Unique `<title>` and description per page; canonical; Open Graph and Twitter tags with a social image regenerated in the new identity; theme-colour; a favicon set (SVG + PNG fallbacks) from the current mark; `robots` correct (a review build is `noindex`); sitemap and structured data if they existed before.

## 9. The page checklist

- [ ] Header test passes on the hero headline; the CTA continues its sentence.
- [ ] The product is shown in the first two viewports.
- [ ] Every chapter has one job, one composition, one surface; no two adjacent alike; the accent field appears once.
- [ ] Proof is real or absent; no stock filler; every image has a job.
- [ ] Word count is short enough to be read (aim for headings and first sentences that carry the page alone).
- [ ] 360/390, 768, 1024, 1280, 1440 rendered and looked at; no horizontal scroll; measure ≤ 80ch everywhere.
- [ ] LCP element eager and sized; fonts subset/swapped; CLS sources reserved.
- [ ] Nav ≤ 7 items; mobile menu labelled and thumb-sized; primary action visible at every width.
- [ ] Metadata, social image, favicon, robots.

## Sources read for this reference

NN/g, "Homepage Design: 5 Fundamental Principles", "How Little Do Users Read", "Photos as Web Content", "Designing Effective Carousels", "Mobile Navigation Patterns"; Julian Shapiro, "Landing Pages" (the growth handbook); web.dev, "Responsive Web Design Basics" and "Web Vitals"; Stanford Web Credibility Project; Refactoring UI and the composition rules in this skill's `implementation.md`.
