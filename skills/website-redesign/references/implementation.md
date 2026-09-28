# Phase 5 — Build

Goal: the redesign, built in the existing stack, with functionality untouched and the visual system genuinely replaced (or, for a refine, genuinely fixed).

## Ground rules

- Work on a branch. Commit in focused steps with messages that explain the direction, not just the files.
- Stay in the repository's framework, styling approach, build and **component library**. Rebuild the visual system; do not rewrite the application; do not swap primitive or component libraries inside a redesign (`design-systems.md` §1).
- Add a dependency only when a capability genuinely needs it — and only after checking its licence, size and maintenance (`resources/libraries.md`). Never for an effect CSS can do.
- Preserve everything on the audit's preserved-list: routes, anchors, ids and data attributes wired to scripts, form field names, API contracts, analytics hooks, embeds, legal text. If a widget's markup must move, keep its ids and re-verify the script that drives it. `parity.mjs` checks this at the end.
- Keep the facts. Improve copy for hierarchy and brevity; never change a claim, a number, a name or a price without the user. Remove leaked placeholders (`[TBD]`) by restructuring the sentence, not by inventing the value.

## Order of work

1. **Tokens** — colour roles, type sets (expressive and/or productive), spacing, radii, elevation, motion, density, breakpoints. Delete the old ones; do not layer new tokens over them.
2. **Base** — reset, typography rules, surfaces, container and chapter primitives, focus styles, selection and other browser surfaces.
3. **Motion** — the reveal system and the concept moves, with a complete reduced-motion block (`motion.md`).
4. **Primitives** — nav, footer, buttons, inputs, chapter wrapper, heading pattern; tags and status only if they are data.
5. **Product fragments and visuals** — the components that show the product (in its real type size and tokens), diagrams, photo containers, the drawn graphics layer.
6. **Pages** in the narrative order from `DESIGN.md` (expressive) or top-task order (productive) — every state of every component on them.
7. **Secondary pages** on the same system — no page may still belong to the old design.
8. **Identity assets** — favicon, social image, theme colour, metadata.

## Composition (expressive surfaces)

- Vary the composition per chapter; let the sequence come from the company's narrative. A voice-product site might run photographic hero → typographic claim → product scene → diagram → photographic chapter → index → closing; a developer tool: product hero → three product chapters of increasing depth → proof → pricing; a services firm without UI: editorial statement → process diagram → environment photography → people → proof → closing. No two adjacent chapters share a structure; every chapter earns its place.
- Alternate surfaces so chapters are visible from a distance.
- Prefer rules, columns and whitespace to boxes. A list renders as a list, a table as a table.
- One primary action, repeated; secondary actions as text links.
- Headlines on a real scale, wrapped deliberately (`max-width` in `ch`, `text-wrap: balance`), emphasis by the type, not by badges. Body at 45–75 characters, never centred in long runs.
- Text on its own ground, always (`imagery.md`).

On **productive** surfaces the rule inverts: one layout per kind of task, applied consistently; the user's content gets the width; chrome recedes (`app-ui.md`).

## Showing the product

- Faithful fragments of real screens — real column names, states and flows — rendered at the product's real type size with its real tokens, and sample data that is obviously illustrative (a "fiction palette" of names and numbers; never a real customer).
- Show the system moving where it does: a row streaming, a pipeline filling, a number updating.
- A fragment that shows numbers — a chart, a strip, a table of figures — is a chart at marketing scale: `dataviz.md` applies (labels, units, a period, no decorative sparklines, tabular figures).
- A live demo the visitor can use gets a prominent, dedicated surface with its own heading, inputs and results on a solid background.
- Never draw a capability that does not exist.

## Interaction

`ui-ux.md` and `app-ui.md` govern everything a visitor touches: one primary action per view; targets ≥ 44 px on touch (never < 24); forms single-column, labels above, validated on submit then live, an error summary; every component's applicable states designed; feedback within 100 ms; motion only to explain change on productive surfaces; icons with visible labels; navigation with a labelled mobile menu; nothing shaped like an ad; no dark patterns.

## Engineering discipline

- **Semantic HTML first**: landmarks, one `h1`, ordered headings, lists as lists, `<button>` for actions and `<a>` for navigation, labels for inputs, native `<dialog>`, `<details>` and `popover` before ARIA. ARIA only where HTML has no element, and then the full pattern (`accessibility.md`).
- **Keyboard**: visible `:focus-visible` rings (≥ 2 px, 3:1, and a transparent `outline` so forced-colours mode keeps them), sane order, Escape closes overlays, focus moved on open and restored on close.
- **Contrast** measured on real grounds (`contrast.mjs`); a darker accent variant for small text.
- **Images**: explicit dimensions, responsive sources, lazy below the fold, eager hero with `fetchpriority="high"`, alt text that says what the image shows (or `alt=""` if decorative).
- **Density** as component sizes (`[data-density=compact]` swapping control and row heights), not a new spacing unit.
- **Browser surfaces**: `::selection`, `accent-color` on native controls, `caret-color`, `text-underline-offset`, `color-scheme`, `theme-color` — the cheapest signal that a page was built rather than assembled.
- **Fonts**: self-hosted WOFF2, subset, `font-display: swap` (or `optional`), metric-matched fallbacks computed from the actual fallback file, `font-size-adjust` where faces share a line.
- **Performance**: no runtime framework for static content; islands for widgets; heavy libraries only on routes that need them, loaded late (`performance.md`).
- **Sticky and fixed traps**: a `backdrop-filter`, `filter` or `transform` on an ancestor makes it the containing block for fixed children — put the blur on a pseudo-element. Input-mode media queries go *after* the base rules.
- **Responsive images in `<picture>`**: the wrapper has no height of its own — size it to the container.
- **Heights**: heroes sized by content with a modest minimum (`min(100svh, 56rem)`), never `height: 100vh`; parallax containers overscan their section.
- **RTL-ready**: logical properties throughout, except numeric columns, which are `text-align: right` in both directions (`multilingual.md` §1, §2a).

## What not to do

- Do not keep the old stylesheet and append; replace it and delete what is dead (knip, PurgeCSS).
- Do not leave the nav, footer or a secondary page in the old identity "for later".
- Do not ship anything you have not rendered.

## Restyling something a script renders

"Keep the widget, restyle it through its class names" is the right instruction and the most common way to ship a broken screen, because the class names are only half the contract. **Open the file that writes the markup and read it** before writing a line of CSS for it:

- Which element carries which class, and how they nest — a rule for `.card > .title` does nothing if the script emits `.card > .row > .title`, and the defect looks like "the CSS did not load".
- Whether it injects SVG, and whether those marks have intrinsic dimensions (usually not).
- Which classes are states (`.open`, `.active`, `.is-partial`) and which are structure.
- Whether it sets inline styles — an inline `style` beats your rule.

Then drive the widget through every state and look at each one.

## The reveal, written safely

Content is finished by default. Where supported, prefer the CSS scroll-driven reveal — no JavaScript, and a range that ends at `entry 100%` so the last element can finish (`motion.md` §5):

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
  }
}
@keyframes reveal { from { opacity: 0; transform: translateY(16px); } }
```

The JavaScript fallback inverts the usual pattern — a root class *hides* things so they can arrive, and is only added when a visitor can see them:

```css
.reveal { opacity: 1; }                                  /* the default */
.motion .reveal { opacity: 0; transform: translateY(10px); transition: opacity 240ms var(--ease-out), transform 240ms var(--ease-out); }
.motion .reveal.in { opacity: 1; transform: none; }
```

```js
if (!matchMedia("(prefers-reduced-motion: reduce)").matches &&
    document.visibilityState === "visible") {
  document.documentElement.classList.add("motion");
  /* observe, add .in, and keep a fail-safe timeout */
}
```

No JavaScript, a background tab, a reduced-motion preference or a headless capture all render the finished page rather than a column of holes. Never on a photograph. `audit.mjs` fails any content that is invisible without JavaScript or under reduced motion.

## Dialogs, popovers, toasts without a library

`<dialog>` and the `popover` attribute with `@starting-style` and `transition-behavior: allow-discrete` animate in *and out* of `display: none` with no JavaScript (Baseline 2024; `motion.md` §5 has the CSS). They bring focus handling, light dismiss and the top layer with them.
