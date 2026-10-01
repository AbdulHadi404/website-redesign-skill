# Web design — pages, heroes, narrative

What a marketing or content page is made of and how it is judged. Read at the end of Phase 3 (page narrative) and through Phase 5. The visual system is `design-theory.md`; interaction is `ui-ux.md`; responsive, performance and imagery rules are `responsive.md`, `performance.md` and `imagery.md`.

**Surface modes inside one site.** Classify sections, not just sites: *persuade* (home, product, pricing — this file), *operate* (the product, account areas, checkout — `app-ui.md`), *read* (blog, docs, changelog, legal — measure 60–70 characters, generous leading, no hero theatre), *experience* (a portfolio or campaign — expressive by design). Product fragments rebuilt as HTML on a marketing page are *operate* surfaces: product copy at the product's own type size.

## 1. What a homepage must do

NN/g's five principles, as checks:

1. **Reachable**: the logo links home from every page; the homepage looks different from inner pages.
2. **Says what the company does, in seconds**: name and mark top-left; a line that says *what this is and for whom* in the visitor's words; the differentiator, not the category.
3. **Shows, doesn't list**: the product, a real screen or a real offer above the fold, with a cue that there is more.
4. **Prompts the next step**: descriptive links with information scent; one primary action.
5. **Simple and standard where it should be**: conventions people know for navigation and controls; novelty spent on the idea, not on where the menu is. Moving things read as ads; pop-ups only where the law requires one.

People spend most of their viewing time at the top of the page, and read 20–28% of its words (`ui-ux.md` §3).

## 2. The hero and the page's argument

**The headline test**: *"If a visitor read only this sentence, would they know exactly what we sell?"* "Improve your workflow" fails; "Groceries delivered in an hour" passes. Then add the hook: a specific claim, or the biggest objection answered in the same breath. The sub-line says what it *is*, then what makes the claim believable. The call to action continues the sentence the hero started ("Get your passport", "Start hiring"), never "Submit" or "Learn more".

**The hero's visual** is the company's strongest evidence — the product doing the thing, the work, the place, the people — on its own ground; never a decorative photo or a screenshot floating on a gradient. Its *form* comes from the direction (`art-direction.md` §4): a statement over photography, the product large, a live demo, typography as the image. Headline + paragraph + two buttons + a screenshot is the generated default; so, in this skill's history, is copy-left/panel-right.

**The argument, not a fixed sequence.** Order the page by the questions the visitor brings, in the order they bring them: what is it, is it for me, does it work, can I trust it, what does it cost, what do I do. Purchase = desire − (labour + confusion): every section raises desire or lowers effort or doubt, and anything else is cut. Features read best as objections answered — a header that states the value in plain words, a paragraph that answers the doubt, an image that shows it working. Proof is only what exists; where there is none, the page must not need it, and an empty logo wall is a credibility hole.

**Validation**: two people outside the market (is it clear? appealing?) and two inside it (is it different from the alternatives?), when the user can arrange it.

## 3. Rhythm and composition

A page is a sequence of sections (elsewhere in this skill, "chapters"), each with one job. Rhythm is variation on a beat:

- **Repeat where content is parallel** (three plans, six features, a list of cases): one layout, so the eye compares. **Change where content changes kind** (a claim, a product scene, a process, an index, proof, the close): the change of layout tells the visitor something new has started.
- **Make structure visible from a distance** by whichever means the direction chose: space, scale, a change of ground, a rule, imagery. Alternating grounds is one means, not the default.
- **One identity moment** — a full-bleed brand field, a photograph, an oversized statement — earns its weight by being rare.
- Read the ledger before choosing forms: the hero beside a product panel and the drawn timeline recur across this skill's past outputs.

Composition vocabulary, not a recipe:

| Section kind | Compositions that suit it |
| --- | --- |
| Product or demo | the product at full width on its own ground, with a heading that says what to try |
| Process / how it works | a sequence drawn in the company's own terms — a path, a schedule, an annotated screen — vertical on phones |
| Index / what is included / FAQ | a ruled list, a two-column table, a register |
| Statement | one line at display size, one action |
| Proof | compact, real, specific; logos only with permission |
| Closing | the primary action restated, then the footer |

## 4. Navigation, header, footer

- **Header**: mark + wordmark left (links home), 5–7 links at most, the primary action right; on phones the primary action stays visible and the links go behind a labelled "Menu" (`responsive.md` §5). While the hero's primary action is on screen, the header action is styled secondary, so one thing per view says "do this". A theme switch, if any, sits in the header on every page, never only in the footer. The sticky header gains a rule or shadow only once the page scrolls.
- **Footer**: the map of the site, the legal row, contact; on a consumer site, the categories or regions served, if real. The lockup at footer size.
- Every section people might link to gets a real address and `scroll-margin-top` for the sticky header.

## 5. Metadata and social

A unique `<title>` and description per page; canonical; Open Graph and Twitter tags with a social image regenerated in the new identity; `theme-color`; a favicon set from the current mark; `robots` correct (a review build is `noindex`); sitemap and structured data if they existed before.

## 6. The page checklist

- [ ] The headline test passes; the action continues its sentence; one primary action per view.
- [ ] The content priority from `DESIGN.md` is what a blurred capture shows first.
- [ ] The product, work or evidence is shown in the first two viewports, not only described.
- [ ] Sections repeat where content is parallel and change where it changes kind; structure is visible from a distance.
- [ ] Proof is real or absent; every image has a job; copy short enough to be read.
- [ ] Rendered and looked at from 390 to 1440 (`responsive.md` §8); the LCP element eager and sized (`performance.md` §2).
- [ ] Header, footer and metadata as above.

## Sources read for this reference

NN/g, "Homepage Design: 5 Fundamental Principles", "How Little Do Users Read", "Photos as Web Content", "Designing Effective Carousels", "Mobile Navigation Patterns"; Julian Shapiro, "Landing Pages" (the growth handbook); Stanford Web Credibility Project; Refactoring UI.
