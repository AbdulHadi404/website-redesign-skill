# Libraries — components, tables, forms, motion, 3D, charts

Checked 2026-09-28 (versions and dates from the npm registry, licences from the shipped files, activity from the repos; sizes measured with esbuild, minified + gzip, React external). **First rule: detect what the repo already uses and restyle it** — switching libraries is a separate project (`design-systems.md` §1).

## Headless primitives

| Library | Framework | Licence | Status | Accessibility evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| Base UI (`@base-ui/react`) | React | MIT | 1.8 (2026-09); full-time MUI team; **shadcn's default base since 2026-07** | states APG conformance, no published matrix | use — default for new React work |
| React Aria / React Aria Components | React | Apache-2.0 | active (3 core maintainers) | **the only one publishing a screen-reader/browser test matrix**; 30+ locales; widest set (Table, Tree, DatePicker, DnD) | use when accessibility, i18n, dates or tables dominate |
| Radix Primitives (`radix-ui`) | React | MIT | alive; ~88% of 2026 commits by one maintainer | states APG conformance | use in existing apps; think twice for greenfield |
| Ark UI / Zag.js | React, Vue, Solid, Svelte | MIT | active | APG | use for multi-framework systems |
| Ariakit | React | MIT | one maintainer, still 0.x | strongly APG-literal | learn (combobox, composite focus) |
| Reka UI (ex-Radix Vue) · Bits UI (Svelte 5) | Vue · Svelte | MIT | active | APG | use |
| Headless UI | React (Vue stale since 2024-09) | MIT | 4 commits in 2026 | APG | only inside Tailwind Plus/Catalyst |
| Reach UI · Kobalte (new work) · `@melt-ui/svelte` | — | MIT | unmaintained / pre-1.0 / stale | — | avoid |

Measured first-component cost: Radix Dialog 13.4 KB, Headless UI 16.4, Ariakit 19.2, Ark 19.4, Base UI 22.9, React Aria 26.5; with Select: 31.9 / 39.6 / 40.4 / 40.1 / 48.6 / 58.0 KB. None is a reason to choose on size; on a marketing page, native `<dialog>`, `<details>` and `popover` cost 0 KB.

## Styled kits

| Kit | Built on | Licence | Verdict |
| --- | --- | --- | --- |
| shadcn/ui | Base UI (default) / Radix / React Aria + Tailwind v4; 8 styles, presets, registries | MIT | use as source you own — **never ship a default style with one colour changed**; review registry items with `--dry-run/--diff` |
| HeroUI v3 | React Aria Components + Tailwind v4 | MIT | use when you want styled + RAC accessibility; restyle its look |
| Mantine 9 | own (React ≥ 19.2) | MIT | internal tools where speed beats brand |
| Chakra v3 / Park UI | Ark UI | MIT | use if already on Chakra; Park UI as reference |
| MUI Material UI v9 | own (Emotion) | MIT | if already on MUI or Material is wanted (MUI X is the reason to stay); **Joy UI is on hold**, `@mui/base` deprecated |
| Ant Design 6 | own | MIT | data-heavy admin, CJK markets |
| Fluent UI React v9 | own | MIT | Microsoft 365 / Teams products |
| daisyUI 5 · Flowbite · Preline | Tailwind CSS classes + vanilla JS | MIT (Preline adds a "fair use" clause) | server-rendered apps; audit CSS-only interactive widgets for keyboard and ARIA gaps |
| Tailwind Plus (UI Blocks, Catalyst, Elements) | Headless UI / custom elements | **commercial**, per individual, no redistribution | only if purchased |
| PrimeReact 11 / PrimeVue 5 / PrimeNG 22 | own | **commercial since 2026-07-15** (free tier: < $1M revenue, < 5 developers); earlier majors MIT | a procurement decision, not a dependency choice |
| Polaris web components · Atlassian Design System · Elastic EUI | own | **use-restricted** (Shopify-integrated apps only · Atlassian add-ons only · SSPL/ELv2) | learn from their docs; don't use elsewhere |
| Radix Themes · Pico CSS · Material Web · Polaris React | — | — | avoid for new work (inactive / deprecated / maintenance mode) |
| Konsta UI v5 · Ionic 9 · Framework7 | native-feel mobile web | MIT | PWAs and Capacitor apps only — never on a brand site |
| Open Props · UnoCSS | CSS tokens / atomic engine | MIT | a token seed / if the repo uses it |

## Tables, forms, feedback, pickers

| Need | Use | Avoid |
| --- | --- | --- |
| Headless table | TanStack Table v9 (stable 2026-08; MIT; ~10–13 KB with features) | building sort/filter/pagination by hand |
| Grid with grouping, pivot, server-side data | AG Grid Community (MIT) or Enterprise (**commercial**; watermark and console error without a key); MUI X Pro/Premium (commercial; the MIT grid caps pages at 100 rows) | shipping Enterprise unlicensed; Glide Data Grid for new work (stale, self-reported a11y gaps) |
| Forms | React Hook Form (defaults = validate on submit, then live — keep them); Conform for server actions / progressive enhancement; TanStack Form for deep type-safety | Formik for new work |
| Validation schemas | Zod 4 (`zod/mini` 5 KB vs 90 KB classic), Valibot | — |
| Toasts | Sonner (4 s default, 3 visible, polite live region) or Base UI Toast — sparingly (`app-ui.md` §7) | auto-dismissing toasts with actions |
| Drawers | Base UI Drawer | **Vaul (unmaintained)** |
| Command palette | cmdk works but is dormant (1 commit in a year); Base UI or React Aria Autocomplete for new palettes | — |
| Date entry | a segmented date field + optional calendar (React Aria DatePicker); react-day-picker v10 (`@daypicker/react`) for availability grids; three fields for memorable dates (GOV.UK) | a forced calendar for a date the user knows |
| Dates in code | `Intl.DateTimeFormat` (0.1 KB); date-fns (5.6 KB) or dayjs (3.3 KB) | moment (20 KB); luxon unless you need zones everywhere |

## Motion

CSS and the Web Animations API first (0 KB). Then: `motion/mini` (3.8 KB), anime.js `waapi` (4.7 KB), AutoAnimate (3.1 KB, respects reduced motion), Motion for React with `LazyMotion` + `domAnimation` (27.5 KB; **defaults to ignoring reduced motion** — wrap in `MotionConfig reducedMotion="user"`), GSAP core 27 KB / + ScrollTrigger 44 KB (free for commercial use incl. all plugins since 3.13, not OSI; barred in no-code tools competing with Webflow), Lenis 5.5 KB (smooth scroll — only inside a contained, skippable story on a marketing page, never site-wide: `motion.md` §5), dotLottie 13.5 KB + **485 KB WASM**, Rive 56 KB + **787 KB WASM**, lottie-web 77 KB. Theatre.js studio is AGPL and unmaintained. Details: `motion.md` §8.

## 3D

`<model-viewer>` 297 KB (Apache-2.0; product viewers and AR; set `touch-action="pan-y"`); three.js 131 KB basic scene (MIT); React Three Fiber + drei 243 KB + React (MIT); OGL 13.8 KB (Unlicense); Babylon.js 259 KB with deep imports — 1,550 KB from the root barrel (Apache-2.0); Spline runtime 1,062 KB (proprietary, no licence field). Asset pipeline `@gltf-transform/cli` (MIT). CC0 assets: Poly Haven, Kenney. Details and the checklist: `motion.md` §9.

## Charts

Recharts 3 (MIT, 108 KB, accessible by default), uPlot (MIT, 22.7 KB, dense time series), ECharts from `echarts/core` (Apache-2.0, 167 KB tree-shaken), Observable Plot (ISC, 95 KB or static at build time), visx / D3 (MIT / ISC, bespoke), Chart.js (MIT, 53 KB tree-shaken, ignores reduced motion). **Highcharts is proprietary** (a licence for any commercial or internal business use); **ApexCharts is proprietary since 5.3.0** (free only under $2M revenue); `@tremor/react` is stale since 2025-01 (use Tremor's copy-paste components). Details: `dataviz.md` §9.
