# Design systems — tokens, reuse, and the component layer

Read in Phase 4, and in Phase 1 when inventorying the UI stack. Principles come from the documentation source of GOV.UK, USWDS, Carbon, Primer, Polaris, Spectrum 2, Fluent 2, Atlassian, Material 3, PatternFly, Paste, Orbit, Gestalt and EUI (read 2026-09-28; `research/streams/B-…`). The aim is a system another developer can extend without asking where a value came from.

## 1. Reuse before reinvention

1. **Detect before choosing.** In an existing repo the component layer is already chosen. Restyle it. **Never switch primitive or component libraries inside a visual redesign** (Radix → Base UI, MUI → Mantine): behaviour differences compile fine and act differently, and shadcn's own guidance calls switching "the worst thing you can do for your production app". A migration is a separate project the user approves.
2. **Native HTML first on marketing pages.** `<dialog>`, `<details>`, the `popover` attribute and `<select>` cost 0 kB; every headless library costs 13–60 kB of JavaScript for the same job (measured: Radix Dialog 13.4 kB gzip, Base UI Dialog 22.9 kB, React Aria Modal+Dialog 26.5 kB; with Select, 31.9 / 48.6 / 58.0 kB). Reach for a library only for a genuinely complex widget.
3. **Inventory what exists** (Phase 1): components, where they are reused, one-offs that should become components, one-off values that should become tokens (`audit.mjs` counts distinct sizes, spacings, radii and shadows).
4. **A new component earns its place** when it appears in two or more places or encodes a rule (a state, a keyboard contract) that must not be re-implemented.

For new product work, when there is nothing to reuse (`resources/libraries.md` has the full table, with licences and maintenance):

| If the project is… | Reach for | Avoid |
| --- | --- | --- |
| a marketing site with a few widgets | native HTML; one headless component for a genuinely complex widget | full component kits (MUI, Ant, Mantine, Chakra) — weight and an app look on a brand site |
| a new React app with its own brand | shadcn/ui on Base UI (its default since July 2026), a deliberately chosen style, your own tokens | shipping the default style with one colour changed |
| accessibility, i18n, RTL, dates or tables dominate | React Aria Components (the only library publishing a screen-reader test matrix; 30+ locales) | CSS-only interactive widgets |
| an internal tool where speed beats brand | Mantine 9 or Ant Design 6; TanStack Table or AG Grid Community | building primitives from scratch |
| Vue / Svelte / Solid | Reka UI or Nuxt UI 4 / Bits UI + shadcn-svelte / Ark UI | stale ports (Headless UI Vue, radix-vue, melt-ui/svelte, Kobalte for new work) |

Licence traps change the answer: PrimeReact 11 / PrimeVue 5 / PrimeNG 22 went commercial (July 2026); AG Grid Enterprise and MUI X Pro/Premium are paid; Polaris may only be used for Shopify-integrated apps; Atlassian's system only for Atlassian add-ons; Elastic EUI is SSPL/ELv2; Tailwind Plus is paid and non-redistributable. Unmaintained: Vaul, Reach UI, Joy UI, Polaris React, `@tremor/react`, Glide Data Grid, Pico CSS.

## 2. Tokens in three tiers

Every mature system uses three tiers under different names — primitive → semantic → component (PatternFly: palette → base → semantic; Fluent: global → alias → component; Material: reference → system → component):

- **Primitive**: the raw scales — `blue-9`, `space-4`, `radius-2`. Never used directly in components.
- **Semantic** (role): what the value is *for* — `color.background.danger.subtle`, `color.text.muted`, `color.border.focus`, `space.inset.card`. Components use these. Dark mode and brand themes swap semantic → primitive mappings; nothing else changes.
- **Component**: only where a component needs its own knob (`button.height.compact`).

**One naming grammar, general to specific** — pick one and use it for every token. Atlassian's `color.[property].[role].[emphasis].[state]` (`color.background.selected.bold.pressed`) and PatternFly's `--pf-t--global--background--color--action--plain--clicked` are good models. Name by role, never by value (`--accent`, not `--orange`).

**State tokens are named, not computed**: `…hovered`, `…pressed`, `…selected`, `…disabled` as explicit tokens survive dark mode and brand colours; opacity overlays (Material's 0.08 hover, 0.12 focus/pressed) are one implementation of them.

**Semantic spacing categories** (PatternFly): *control* (padding inside inputs and buttons), *inset* (inner padding of regions), *gap* (between elements), *gutter* (layout grid). A scale is a scale — Carbon 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160; GOV.UK is built on 5 px (5–60) and is no worse for it. Consistency of one scale is the quality rule, not a particular base.

**Contrast computable from the palette**: USWDS grades every colour 0 (white) to 100 (black) across hues; a grade difference of 40+ passes AA-large, 50+ AA, 70+ AAA. `palette.mjs` builds scales with the same property (text steps solved for Lc 60 / 4.5:1 and Lc 90 / 7:1).

**Interchange**: the DTCG design-token format reached its first stable version (2025.10) and is read by Style Dictionary, Tokens Studio, Terrazzo, Figma and Penpot. Emit CSS custom properties; keep a JSON source when the system spans code and design tools. Tailwind v4 projects put tokens in `@theme`.

## 3. Type sets per surface

- **Productive** (product UI): 14 px base (13 in dense tools), fixed sizes, a gentle ratio of 1.125–1.2, role names — heading, title, body, label, detail, metric, code. Carbon: "fixed type styles are a must" inside containers. Atlassian gives dashboard numbers their own `font.metric` style.
- **Expressive** (marketing, editorial): 16 px base or more, fluid headings (`clamp()`), a steeper ratio (1.25–1.5+), a display face with its own voice. Carbon: "Do not use these styles inside a container".
- One token system, two sets. A scale stretched over both is wrong for both.
- **Weight is hierarchy**: bold for titles and button labels; medium beside 1.5 px-stroke icons; regular for anything the user typed (Spectrum 2).
- Component text (inside controls) is its own style with a line height rounded to even pixels, so labels centre.

## 4. Density

Density changes **padding and heights, not font size** (Spectrum 2: "Density controls vertical spacing while keeping font sizes consistent"). Comfortable is the default; compact is offered per table or per user on mouse-and-keyboard surfaces, never on touch. Reference heights: Carbon rows 24 / 32 / 40 / 48 / 64 px; Material steps of 4 px per density level with targets kept ≥ 48 dp; SAP Fiori compact 32 px vs cozy 44 px. Implement density as component sizes (a `data-density` attribute swapping control and row heights), not by redefining the spacing unit — shadcn made a separate compact style rather than changing Tailwind's spacing multiplier for exactly this reason.

## 5. The state matrix

Every interactive component fills the applicable rows of the matrix in `app-ui.md` §2 — interaction (rest, hover, focus-visible, pressed, dragged), selection (selected, indeterminate, current, expanded), validation (error, warning, success), availability (disabled, inactive, read-only, hidden), async (loading, refreshing, empty, degraded). A component is not done until every applicable row is designed **and rendered** in Phase 6.

## 6. Documenting the system

For product surfaces write `templates/SYSTEM.md`. The common core across the best systems' component pages: **when to use / when not (with the alternative)** · **anatomy** (numbered parts, required or optional, content rules) · **variants and emphasis** (one high-emphasis instance per view) · **states** · **behaviour and keyboard** · **content rules** (verb + noun labels; preferred and avoided words) · **accessibility split into what the library provides and what you must do, and how to test it** (Carbon, Primer) · **related** · **evidence and open questions** (GOV.UK's research sections). Write guidance as short imperatives (Orbit).

Plus four pattern pages every product redesign needs, stated as rules with numbers: **forms and validation**, **notifications**, **loading / empty / error**, **tables and lists** (`app-ui.md`).

## 7. Keeping it honest

- Every value in a component traces to a token; every token to a role. `audit.mjs` distinct-value counts (sizes, spacings, radii, shadows) before and after show whether the system actually consolidated.
- Fonts and icons travel separately from code licences: a design system's typeface (Adobe Clean, Atlassian Sans, Segoe UI) is not licensed with its components.
- Registry items (shadcn registries, GitHub registries) are code from strangers: inspect with `--dry-run / --diff / --view` and check each item's licence before writing it into the repo.
