# <Product> — system

For product surfaces (apps, dashboards, account areas, admin). Written in Phase 4, next to `DESIGN.md`. Order of documents: `PRODUCT.md` (when there is one) → `DESIGN.md` → `SYSTEM.md`; this one holds how components carry out the decisions above it, so refer, don't repeat. Short imperatives, numbers where they exist. The component library already in the repo is the starting point — this document restyles and completes it; it does not replace it (`design-systems.md`).

## Foundations

**Stack:** primitive layer (Base UI / Radix / React Aria / native…), styled layer, table, forms, toasts, date picker — each with version, licence and maintenance status.

**Tokens** (three tiers; role names; one grammar, e.g. `color.background.danger.subtle.hovered`):

- Colour roles: surfaces (canvas, surface-1/2/3, overlay), text (strong, default, muted, on-accent), border (subtle, default, strong, field — the input boundary at ≥ 3:1 on its surface, focus), decorative (the faint neutral for dots, rules and disabled strokes; never text — grep its text uses, placeholders included, before shipping; `design-systems.md` §2), action (accent, hover, pressed), selected (neutral), status (danger, warning, success, info — each with text, border, subtle fill), data palette (categorical, sequential, diverging).
- Type: the productive set, as fixed roles with line heights — page title (20–28 px) / section / panel title / body 14/20 / secondary / label and caption (≥ 12 px; 11 only for a single uppercase word) / numerals (24–32 px semibold in the UI face, tabular) / code only when users read code (`SKILL.md` commitment 5) — with families and weights (`design-systems.md` §3); tabular figures for data.
- Space: scale and semantic categories (inset, gap, gutter, control padding).
- Radii by role (control, container, overlay, pill for tags only); concentric rule (outer = inner + padding).
- Elevation model: which layers exist and the rule for nesting (never a surface inside a surface).
- Motion: productive durations and easing; what never animates (`motion.md`).
- Density modes: comfortable (default) and compact (where, for whom); controls 32 px default, 28 compact, 36–40 on touch-first; rows 40 px comfortable, 32 compact; page padding 24–32 px desktop, 16 px phone; section gaps 20–32 px; page-header band 72–120 px (`app-ui.md` §3); targets never under 24 px (44 on touch).

## Patterns (one section each, stated as rules)

### Forms and validation
Validate on submit, then live after a failed submit; error summary at ≥ 3 errors (focused, `Error:` title prefix, links to fields), else focus the first invalid field; messages next to fields in the question's words; required/optional marked by whichever is the minority, in words; never disable Submit to signal invalidity; one save pattern per form; warn on unsaved changes.

### Notifications
Field message → inline/section message → banner → toast (only for events not otherwise visible, polite live region, no auto-dismiss if it holds an action) → modal (destructive or blocking only) → full-page confirmation. Success is usually silent. Status = colour + icon + words.

### Loading, empty, error
Under 1 s nothing; 1–3 s indeterminate or skeleton (containers only); 3–10 s determinate; over 10 s a background task. Empty: first-use (what will appear, the action that fills it), no-results (how to adjust), permission/error (what went wrong, the fix). Degrade the part, not the page.

### Tables and lists
The four tasks (find, compare, view/edit one, act); sorting and its announcement; selection → bulk-action bar; pagination with a remembered page size; numbers right-aligned with tabular figures; responsive behaviour (scroll in a focusable container, or stack rows).

### Navigation
Places (sidebar ≤ two levels) vs views of one object (tabs) vs commands (palette with shortcuts); current location marked with `aria-current`; state in the URL.

## Components

For each component or pattern that the redesign touches:

```md
## <Component>
<One sentence: what it is for.>
**Use when** — … **Don't use when** — … → use <alternative>
### Anatomy
1. <part> — required/optional, content rule
### Variants and emphasis
<variant> — when; at most one high-emphasis instance per view
### Sizes and density
comfortable | compact — heights, paddings, type role
### States
rest · hover (pointer only) · focus-visible · pressed · selected · disabled / inactive / read-only · loading · error · empty — with tokens (see the matrix in `app-ui.md`)
### Behaviour
keyboard map · focus on open/close · responsive behaviour · error handling
### Content
label rules (verb + noun) · max length · error / empty / success copy · preferred and avoided words
### Accessibility
provided by <library>: … · we must: labels, focus style, contrast, announcements · how to test: keyboard path, expected screen-reader phrase, 200% / 400% zoom
### Related
…
### Evidence and open questions
why these choices; what has not been verified
```
