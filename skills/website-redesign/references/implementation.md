# Phase 5 — Implementation

Goal: the redesign, built in the existing stack, with functionality untouched and the visual system genuinely replaced.

## Ground rules

- Work on a branch. Commit in focused steps with messages that explain the direction, not just the files.
- Stay in the repository's framework, styling approach and build. Rebuild the *visual system*; do not rewrite the application.
- Add a dependency only when a capability genuinely needs it (an image pipeline, a CMS client). Never for a visual effect CSS can do.
- Preserve everything on the audit's preserved-list: routes, anchors, element ids and data attributes wired to scripts, form field names, API contracts, analytics hooks, third-party embeds, legal text. Restyle around them; if a widget's markup must move, keep its ids and re-verify the script that drives it.
- Keep the facts. Improve copy for hierarchy and brevity; never change a claim, a number, a name or a price without the user.
- Remove leaked placeholders (`[TBD]`, `[timeframe]`) from customer-visible copy by restructuring the sentence, not by inventing the value.

## Order of work

1. **Tokens** — palette, type scale, spacing rhythm, radii, shadows, easing, breakpoints. Delete the old ones; do not layer new tokens over them.
2. **Base** — reset, typography rules, surfaces (light/dark chapters), container and chapter primitives, focus styles, selection.
3. **Motion** — the reveal system and the two or three concept-specific moves, with a complete `prefers-reduced-motion` block.
4. **Primitives** — nav, footer, buttons, chapter wrapper, heading pattern, tags/status only if they are *data*.
5. **Product fragments and visuals** — the components that show the product; diagrams; photo containers.
6. **Homepage**, chapter by chapter, in the narrative order from `DESIGN.md`.
7. **Secondary pages** on the same system — no page may still belong to the old design.
8. **Identity assets** — favicon, social image, theme colour, metadata.

## Composition rules that keep pages from looking templated

- Vary the composition per chapter, and let the sequence come from the company's narrative rather than from a favourite order. A voice-product site might run photographic hero → typographic claim → product scene → diagram → photographic chapter → index → closing; a developer tool might run product hero → three product chapters of increasing depth → proof → pricing; a services firm with no UI might run editorial statement → process diagram → environment photography → people → proof → closing. The rule is the same in each: no two adjacent chapters share a structure, and every chapter earns its place.
- Alternate surfaces (light, alternate light, dark, image) so chapters are visible from a distance.
- Prefer rules, columns and whitespace to boxes. If content is a list, render a list; if it is a table, render a table.
- One primary action, repeated; secondary actions as text links.
- Headlines: a real scale, deliberate wrapping (`max-width` in `ch`, `text-wrap: balance`), emphasis handled by the type (italic, colour) not by badges.
- Body copy at a comfortable measure (45–70 characters), never centred in long runs.
- Text on its own ground, always (see `imagery.md`).

## Showing the product

- Faithful fragments of real screens: real column names, real states, real flows. Sample data must be obviously illustrative and never a real customer.
- Show motion of the system where it exists: a row streaming a transcript, a pipeline filling, a progress bar, a diagram with flow.
- If the product offers a live demo the visitor can use on the site, give it a prominent, dedicated surface with its own heading — inputs and results on a solid background, never over a photograph.
- Never draw a capability that does not exist.

## Interaction rules

`ui-ux.md` governs everything a visitor touches: one primary action per view, targets ≥ 44 px (never < 24), forms single-column with labels above and the actions on the field axis, every widget's five states designed, response feedback within 100 ms / skeletons over spinners, motion 100–300 ms ease-out and off under reduced motion, icons with visible labels, nav ≤ 7 items and a labelled mobile menu, error messages next to the field in plain words with the input preserved, no dark patterns, nothing shaped like an ad.

## Engineering discipline

- Semantic HTML: landmarks, one `h1`, heading levels in order, lists as lists, buttons vs links used correctly, labels for inputs, `aria-*` on custom widgets (tabs, menus), a skip link.
- Keyboard: focus visible, tab order sane, menus and tabs operable, Escape closes overlays.
- Contrast: check small text on tinted surfaces; keep a darker accent variant for small text.
- Images: explicit dimensions, responsive sources, lazy below the fold, eager hero with high fetch priority, alt text that describes the image.
- Motion: transitions and transforms only; no layout-affecting animation; reduced-motion disables everything decorative.
- Performance: no runtime framework for static content; fonts subset and swapped; heavy JS only on routes that need it (an embedded CMS studio, a demo).
- Sticky/fixed traps: a `backdrop-filter`, `filter` or `transform` on an ancestor makes it the containing block for fixed children (mobile menus vanish inside headers); put the blur on a pseudo-element.
- Responsive images inside a `<picture>`: the wrapper has no height of its own, so `height: 100%` on the image falls back to intrinsic size — size the wrapper to the container.
- Parallax containers must overscan their section (`inset: -10% 0`) or they expose gaps.
- Percentage-height heroes (`100svh`) balloon in tall captures and push key content below the fold; size heroes by content with a modest minimum.

## What not to do

- Do not keep the old stylesheet and append; replace it and delete what is dead.
- Do not leave the nav, footer or a secondary page in the old identity "for later".
- Do not ship anything you have not rendered.

## Restyling something a script renders

"Keep the widget, restyle it through its class names" is the right instruction and the most common way to ship a broken screen, because the class names are only half the contract. **Open the file that writes the markup and read it** before writing a line of CSS for it:

- Which element carries which class, and how they nest. A rule written for `.card > .title` does nothing if the script emits `.card > .row > .title`, and the defect looks like "the CSS did not load" rather than like a selector miss.
- Whether it injects SVG, and whether those marks have intrinsic dimensions (usually not — see `visual-qa.md`).
- Which classes are states (`.open`, `.active`, `.is-partial`) and which are structure.
- Whether it sets inline styles — an `animation-delay` on a card is inert if you removed the animation, and an inline `style` will beat your rule.

Then drive the widget through every state and look at each one. A results list, a loading state and an error state are three different renders of the same class names, and the direction has to survive all three.

## The reveal, written safely

If the direction uses scroll reveals, write them so the page is finished without JavaScript:

```css
.reveal { opacity: 1; }                                  /* the default */
.motion .reveal { opacity: 0; transform: translateY(10px); transition: ...; }
.motion .reveal.in { opacity: 1; transform: none; }
```

```js
if (!matchMedia("(prefers-reduced-motion: reduce)").matches &&
    document.visibilityState === "visible") {
  document.documentElement.classList.add("motion");
  /* observe, add .in, and keep a fail-safe timeout */
}
```

No JavaScript, a background tab, or a reduced-motion preference all render the finished page rather than a column of holes.

## Three layout rules learned the hard way

- **Single-column fallbacks are `minmax(0, 1fr)`, never `1fr`.** `1fr` alone is `minmax(auto, 1fr)`; a nowrap child sets the track's minimum and the column runs past the viewport on phones, where the page's own `overflow: clip` then hides it from every detector that reads `scrollWidth`. Grid and flex children that hold nowrap text also get `min-width: 0`.
- **A drawn glyph component is `inline-block` (or `inline-flex`) with its own size.** A bare `<span>` with a width is ignored in a block context and its SVG fills the column.
- **The reduced-motion block zeroes delays as well as durations.** `transition-delay: 0s !important` beside `transition-duration: 0.01ms !important`, or a settled state still arrives late.

## Accessibility that the render does not show

Found by an axe pass and a keyboard pass over two finished prototypes, after the visual QA had passed:

- **A theme switch belongs in the header, on every page at every width — never only in the footer.** A control that changes the whole site's legibility has to be reachable before the visitor scrolls; the footer copy can stay as a labelled group.
- **Drawn product fragments are `user-select: none`.** The film, the credential, the dashboard rows, the thread, the covers: they are illustrations captioned as invented, and a drag across the hero should not select the fake UI. Real controls (a form, an estimator) stay selectable.
- **Accent text is measured on the darkest ground it lands on.** An orange that passes 4.5:1 on ivory fails on the alternate chapter one shade down; pick the token for the darker surface, not the hero.
- **The focus ring passes 3:1 in every theme.** A light theme that reuses the dark theme's orange outline gives 2.8:1 on ivory; give the light theme its own outline colour.
- **Form errors describe their field only while shown.** `aria-invalid` plus `aria-describedby` set when the error appears and removed when it clears; a permanently wired `aria-describedby` reads the error as a description of a valid field.
- **A mobile sheet is a modal.** `role="dialog"`, `aria-modal`, and `inert` on `main` and `footer` while it is open, so tabbing cannot leave it.
- **A live region announces the answer, not the panel.** `aria-live` on the total line of an estimator, never on the whole calculator.
- **Decoration that loops stops within five seconds** (a breathing dot, a turning ring) or gets a pause control (a looping film). Reduced-motion is respected on top, not instead.
- **Field boundaries at 3:1.** Hairline inputs on a sheet fail non-text contrast; use a dedicated field-line token.
- **Buttons wrap below 380px.** A `nowrap` primary action with a long label is the usual 320px reflow failure.
- **Heading order is per page, not per component.** A sidebar list of `h3`s under an `h1` with no `h2` is a break; the axe `heading-order` rule catches what the render cannot.

