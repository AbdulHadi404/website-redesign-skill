# Stream B — Component libraries, UI primitives and mature design systems

Research date: 2026-09-28. Scope: what an expert design engineer knows about (1) component libraries / UI primitives and (2) mature open-source design systems, for broadening `website-redesign` from marketing sites to web apps, dashboards, SaaS, ecommerce and enterprise software.

## How this was researched (and its limits)

- **Versions, dates, licenses** come from the npm registry on 2026-09-28 (`npm view <pkg> version time license deprecated`, plus `npm pack` + reading the shipped `LICENSE` file where the license is not a plain OSI identifier). "Last release" = publish date of the current `latest` version.
- **Maintenance** comes from shallow `git clone`s of each repo: commits in the 12 months to 2026-09-28 and the top human committers (bus factor). Bots excluded where noted.
- **Design-system rules** were read from the systems' own documentation *source* in their public repos (GOV.UK, USWDS, Carbon, Primer, Paste, Orbit, Gestalt, EUI, PatternFly, Polaris, Spectrum 2's mirrored docs, SLDS), from token packages on npm (Fluent 2, Atlassian, Material Web), and from WebSearch summaries where no source repo exists (Atlassian guidance pages, SAP Fiori, Material 3 density, SLDS 2). WebSearch-only facts are marked *(secondary)*.
- **Constraint:** the session's egress proxy blocked every documentation website (ui.shadcn.com, base-ui.com, react-spectrum.adobe.com, carbondesignsystem.com, design-system.service.gov.uk, nngroup.com, …) for both WebFetch and curl. Reading the docs source in GitHub is at least as primary; public page URLs are given alongside the source path so readers can open the rendered page.
- **Bundle sizes** were measured, not looked up: each library installed, a Dialog (and Dialog + Select) entry bundled with esbuild (`--minify`, React externalised), gzip -9.
- The shared WebSearch budget ran out near the end; two items (Tailwind Labs' 2026 staffing news, Tailwind Plus pricing) could not be re-verified and are left out rather than stated from memory.

---

## Sources consulted

### Library sources (primary)
- npm registry metadata for ~120 packages (full list in the tables below).
- shadcn/ui changelog MDX, read from source: `apps/v4/content/docs/changelog/*.mdx` in [shadcn-ui/ui](https://github.com/shadcn-ui/ui/tree/HEAD/apps/v4/content/docs/changelog) — especially `2025-12-shadcn-create`, `2026-01-base-ui`, `2026-02-radix-ui`, `2026-03-cli-v4`, `2026-03-luma`, `2026-04-sera`, `2026-05-rhea`, `2026-05-shadcn-eject`, `2026-06-github-registries`, `2026-07-base-ui-default`, `2026-07-react-aria`, `2026-07-toast`, `2026-07-typeset`, `2026-08-questionnaire`, `2026-09-cn`; component docs `components/base/{drawer,chart,command,data-table,calendar}.mdx`.
- React Aria "Quality" page source: [packages/dev/s2-docs/pages/react-aria/quality.mdx](https://github.com/adobe/react-spectrum/blob/HEAD/packages/dev/s2-docs/pages/react-aria/quality.mdx) (public: react-spectrum.adobe.com/react-aria/quality.html).
- Base UI accessibility page source: [docs/src/app/(docs)/react/overview/accessibility/page.mdx](https://github.com/mui/base-ui/tree/HEAD/docs/src/app) and release notes v1.0 → v1.8.
- Radix accessibility page source: [data/primitives/docs/overview/accessibility.mdx](https://github.com/radix-ui/website/blob/HEAD/data/primitives/docs/overview/accessibility.mdx).
- Vaul README ("This repo is unmaintained"): [emilkowalski/vaul](https://github.com/emilkowalski/vaul). Reach UI README ("Reach-UI is currently not maintained!"): [reach/reach-ui](https://github.com/reach/reach-ui).
- PrimeTek license text shipped in `primereact@11.1.0` / `primevue@5.0.1` (`LICENSE.md`); announcement [primeui.dev/nextchapter](https://primeui.dev/nextchapter); [OpenNG: "PrimeNG is no longer open source"](https://www.openng.org/blog/primeng-is-no-longer-open-source).
- AG Grid [community-vs-enterprise doc source](https://github.com/ag-grid/ag-grid/tree/HEAD/documentation/ag-grid-docs/src/content/docs/community-vs-enterprise) and `LICENSE.txt`; MUI X [pagination doc source](https://github.com/mui/mui-x/blob/HEAD/docs/data/data-grid/pagination/pagination.md) ("limited to pages of up to 100 rows").
- Tailwind Plus Elements `LICENSE.md` (npm tarball); Preline `LICENSE` (npm tarball); Shopify Polaris `LICENSE.md` (npm tarball).
- Package source inspection: `sonner` (TOAST_LIFETIME, live region), `cmdk` (ARIA roles), `react-hook-form` (default modes), `@conform-to/*` (default modes), `react-aria-components` exports, `@base-ui/react` exports, `@fluentui/tokens`, `@atlaskit/tokens`, `@material/web` tokens.
- Secondary: [TanStack Table v9 announcement](https://tanstack.com/blog/announcing-tanstack-table-v9); [InfoQ on Base UI v1](https://infoq.com/news/2026/02/baseui-v1-accessible/); [HeroUI v3 release](https://heroui.com/en/docs/react/releases/v3-0-0) / [InfoQ](https://www.infoq.com/news/2026/07/heroui-v3-rewrite/); [Mantine 9 changelog](https://mantine.dev/changelog/9-0-0/); [MUI "Introducing v9"](https://mui.com/blog/introducing-mui-v9/) and [MUI 2026 update](https://mui.com/blog/2026-and-beyond/) (Joy UI on hold, Pigment paused); [Vercel acquires Tremor](https://vercel.com/blog/vercel-acquires-tremor); [Nuxt UI v4](https://nuxt.com/blog/nuxt-ui-v4); [Park UI joins Chakra org](https://park-ui.com/blog/park-ui-joins-the-chakra-ui-organization); [react-day-picker v10](https://daypicker.dev/upgrading); [Ionic 9](https://ionic.io/blog/announcing-ionic-framework-9); [Konsta release notes](https://konstaui.com/release-notes); [Refine v5](https://refine.dev/blog/refine-v5-announcement/); [Polaris React archive](https://github.com/Shopify/polaris-react-archive); [Tailwind Plus vanilla JS / Elements](https://tailwindcss.com/blog/vanilla-js-support-for-tailwind-plus); [daisyUI v5 notes](https://daisyui.com/docs/v5/); [Ant Design changelog](https://ant.design/changelog/); [Glide Data Grid FAQ](https://docs.grid.glideapps.com/faq); [Material Web maintenance-mode note](https://github.com/material-components/material-web/discussions/5642).

### Design-system sources (primary unless marked)
- **GOV.UK Design System** — source [alphagov/govuk-design-system/src](https://github.com/alphagov/govuk-design-system/tree/HEAD/src): [Validation pattern](https://design-system.service.gov.uk/patterns/validation/), [Error summary](https://design-system.service.gov.uk/components/error-summary/), [Error message](https://design-system.service.gov.uk/components/error-message/), [Button](https://design-system.service.gov.uk/components/button/), [Notification banner](https://design-system.service.gov.uk/components/notification-banner/), [Question pages](https://design-system.service.gov.uk/patterns/question-pages/), [Text input](https://design-system.service.gov.uk/components/text-input/), [Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/), [Check answers](https://design-system.service.gov.uk/patterns/check-answers/).
- **USWDS** — source [uswds/uswds-site](https://github.com/uswds/uswds-site): `_includes/forms-guidance.html` ([Form](https://designsystem.digital.gov/components/form/)), `_components/table/guidance/*` ([Table](https://designsystem.digital.gov/components/table/)), `pages/design-tokens/color/*` ([Color tokens](https://designsystem.digital.gov/design-tokens/color/overview/)).
- **IBM Carbon** — source [carbon-design-system/carbon-website/src/pages](https://github.com/carbon-design-system/carbon-website/tree/HEAD/src/pages): [Data table usage](https://carbondesignsystem.com/components/data-table/usage/) + style, [Notification pattern](https://carbondesignsystem.com/patterns/notification-pattern/), [Disabled states](https://carbondesignsystem.com/patterns/disabled-states/), [Read-only states](https://carbondesignsystem.com/patterns/read-only-states-pattern/), [Loading](https://carbondesignsystem.com/patterns/loading-pattern/), [Empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/), [Forms](https://carbondesignsystem.com/patterns/forms-pattern/), [Type sets](https://carbondesignsystem.com/elements/typography/type-sets/), [Spacing](https://carbondesignsystem.com/elements/spacing/overview/), [UI shell left panel](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/), [Text input](https://carbondesignsystem.com/components/text-input/usage/), [Button](https://carbondesignsystem.com/components/button/usage/).
- **GitHub Primer** — source [primer/design/content](https://github.com/primer/design/tree/HEAD/content): `ui-patterns/{notification-messaging,saving,loading,navigation,forms/overview}.mdx`, `components/button.mdx`, `deprecated-components/toast.mdx`.
- **Twilio Paste** — source [twilio-labs/paste/packages/paste-website/src/pages](https://github.com/twilio-labs/paste/tree/HEAD/packages/paste-website/src/pages): [Notifications & feedback](https://paste.twilio.design/patterns/notifications-and-feedback), [Toast](https://paste.twilio.design/components/toast), [Voice & tone](https://paste.twilio.design/foundations/content/voice-and-tone).
- **Kiwi.com Orbit** — source [kiwicom/orbit/docs/src/documentation](https://github.com/kiwicom/orbit/tree/HEAD/docs/src/documentation): `03-components/component.md.template`, `04-design-patterns/04-form-errors.mdx`.
- **Pinterest Gestalt** — source [pinterest/gestalt/docs/pages/foundations/messaging](https://github.com/pinterest/gestalt/tree/HEAD/docs/pages/foundations/messaging).
- **Elastic EUI** — source [elastic/eui/packages/website/docs/patterns](https://github.com/elastic/eui/tree/HEAD/packages/website/docs/patterns): `tables/table-pagination.mdx`, `tables/table-selection.mdx`, `save-buttons.mdx`, `error-messages/error-validation.mdx`.
- **Red Hat PatternFly** — source [patternfly/patternfly-org/…/patternfly-docs/content](https://github.com/patternfly/patternfly-org/tree/HEAD/packages/documentation-site/patternfly-docs/content): [Wizard](https://www.patternfly.org/components/wizard/design-guidelines), [Navigation](https://www.patternfly.org/components/navigation/design-guidelines), [Table](https://www.patternfly.org/components/table/design-guidelines), [Design tokens](https://www.patternfly.org/foundations-and-styles/design-tokens/overview), [Spacers](https://www.patternfly.org/foundations-and-styles/spacers).
- **Shopify Polaris** — source [Shopify/polaris/polaris.shopify.com/content](https://github.com/Shopify/polaris/tree/HEAD/polaris.shopify.com/content): [Resource index layout](https://polaris.shopify.com/patterns/resource-index-layout), [Common actions](https://polaris.shopify.com/patterns/common-actions), [Error messages](https://polaris.shopify.com/content/error-messages).
- **Adobe Spectrum 2** — docs mirrored in [adobe/spectrum-design-data/docs/s2-docs](https://github.com/adobe/spectrum-design-data/tree/HEAD/docs/s2-docs) (public: s2.spectrum.adobe.com): `designing/{states,attention-hierarchy,typography-fundamentals,app-frame-*}.md`, `components/containers/table.md`.
- **Microsoft Fluent 2** — `@fluentui/tokens` source (global font sizes, line heights, spacing, durations, radii); [fluent2.microsoft.design/typography](https://fluent2.microsoft.design/typography) *(secondary)*.
- **Atlassian** — `@atlaskit/tokens` v20.1.0 (`token-metadata.codegen.js`); [Spacing](https://atlassian.design/foundations/spacing), [Messages](https://atlassian.design/patterns/messages/), [License](https://atlassian.design/license) *(secondary)*.
- **Material 3** — `@material/web` 2.5.0 token SCSS (state layers); [M3 density](https://m3.material.io/foundations/layout/grids-spacing/density) *(secondary)*.
- **SAP Fiori** — [Cozy/compact](https://www.sap.com/design-system/fiori-design-web/v1-108/foundations/visual/cozy-compact), [Draft handling](https://www.sap.com/design-system/fiori-design-web/v1-136/foundations/best-practices/global-patterns/object-handling/draft-handling) *(secondary)*.
- **Salesforce SLDS 2** — [What is SLDS 2](https://www.salesforce.com/blog/what-is-slds-2/), [SLDS styling hooks](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-custom-properties.html) *(secondary)*.
- **Research/craft**: [NN/g Data tables: four major user tasks](https://www.nngroup.com/articles/data-tables/), [NN/g Infinite scrolling: when to use it](https://www.nngroup.com/articles/infinite-scrolling-tips/), [NN/g Skeleton screens 101](https://www.nngroup.com/articles/skeleton-screens/), [Jakob Nielsen: Inactive controls — show, disable or hide?](https://jakobnielsenphd.substack.com/p/inactive-buttons), [Konjević: reward early, punish late](https://medium.com/wdstack/inline-validation-in-forms-designing-the-experience-123fb34088ce), [Smashing: live validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/), [Adrian Roselli: Don't use ARIA menu roles for site nav](http://adrianroselli.com/2017/10/dont-use-aria-menu-roles-for-site-nav.html), [Roselli: Defining toast messages](http://adrianroselli.com/2020/01/defining-toast-messages.html), [Scott O'Hara: A toast to accessible toasts](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html), [WCAG issue #976 on toasts and 2.2.1](https://github.com/w3c/wcag/issues/976), [DTCG spec 2025.10 stable](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/), [Nathan Curtis: Naming tokens](https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676).

---

# Part 1 — Component libraries and UI primitives

## 1.1 What changed since mid-2025 (training data is stale here)

These are the facts most likely to be wrong in a model's memory, each verified above:

1. **Base UI shipped v1.0.0 on 2025-12-11** (`@base-ui/react`, MIT, by MUI with several original Radix engineers); 1.8.0 on 2026-09-04. `@base-ui-components/react` is deprecated ("renamed"), and `@mui/base` is deprecated ("replaced by @base-ui/react").
2. **shadcn/ui made Base UI the default on 2026-07-02** ("Projects created on shadcn/create now pick Base UI over Radix 2 to 1"). Radix is "not being deprecated… every update and new component will ship for both libraries". **React Aria became a third first-class base on 2026-07-17** (`npx shadcn init --base aria`).
3. shadcn now has **eight visual styles** (Vega = classic, Nova, Maia, Lyra, Mira, Luma, Rhea, Sera), presets (`--preset <code>`), `shadcn apply` to switch presets in place, CLI v4 with `--dry-run/--diff/--view`, an agent skill (`npx skills add shadcn/ui`), GitHub-repo registries, `shadcn eject`, `shadcn/typeset` (prose styling), and a `cn` package replacing `clsx + tailwind-merge`. In the launch note for `create` the author wrote: *"somewhere along the way, all apps started looking the same. I guess the defaults were a little too good."*
4. **shadcn's Drawer no longer uses Vaul** (now Base UI Drawer); **Vaul's README says the repo is unmaintained**; last release 1.1.2 on 2024-12-14.
5. **cmdk is effectively dormant**: repo moved to `github.com/dip/cmdk`, 1 commit in 12 months, last release 1.1.1 on 2025-03-14. shadcn's `Command` still wraps it.
6. **Radix Primitives is alive but has a bus factor of one**: 217 commits since 2026-01-01, 192 of them by one maintainer; last release `radix-ui@1.6.7` 2026-07-24. Radix Themes: one release in 12 months (3.3.0, 2026-01-31).
7. **PrimeTek relicensed on 2026-07-15**: PrimeReact 11, PrimeVue 5, PrimeNG 22 are commercial ("PrimeUI License") with a license key; free Community tier only for orgs with < $1M revenue, < 5 developers, < 10 employees, < $3M funding. PrimeReact ≤ 10, PrimeVue ≤ 4, PrimeNG ≤ 21 stay MIT (PrimeReact 10.9.9 was still patched on 2026-08-27).
8. **Polaris React is deprecated** (npm deprecation message; archived at `Shopify/polaris-react-archive`); Shopify apps use **Polaris web components** (released 2025-10-01).
9. **MUI**: Material UI v9 (v8 skipped to align with MUI X v9; 9.4.0 on 2026-08-27). **Joy UI is on hold and removed from the repo; Pigment CSS is paused.**
10. **HeroUI v3** (March 2026, ex-NextUI) is a rewrite on **React Aria Components + Tailwind v4**; `@nextui-org/react` is deprecated.
11. **Mantine 9** (2026-03-31) **requires React 19.2+**.
12. **TanStack Table v9 stable on 2026-08-04** (tree-shakable "features", TanStack Store state, prototype-shared row/cell APIs for lower memory). shadcn's data-table guide already targets v9.
13. **react-day-picker v10** (2026-02-26) moves to `@daypicker/react`; cleanup release.
14. **Tremor**: acquired by Vercel (Jan 2025); `@tremor/react` last release 2025-01-13; the copy-paste repo had its last commit 2025-10-10 and none in 2026. Blocks were made MIT.
15. **Nuxt UI v4** merged Nuxt UI Pro into the free MIT library (NuxtLabs joined Vercel); built on Reka UI.
16. `radix-vue` → **Reka UI** (v2). `@melt-ui/svelte` (last release 2025-03-28) → next-gen `melt` (last commit 2026-03); **Bits UI v2** (Svelte 5) is the active Svelte primitive layer.
17. **Material Web (MWC) is in maintenance mode "pending new maintainers"**.
18. **Design Tokens Community Group format reached its first stable version, 2025.10** (not a W3C standard, but implemented by Style Dictionary, Tokens Studio, Terrazzo, Figma, Penpot and others).
19. **Pico CSS** has had no commit since 2025-03-15.
20. **Ionic 9** (announced 2026-08-19), **Konsta UI v5** (iOS 26 + Material 2025 look, Tailwind v4), **Framework7 9** — all active.

## 1.2 Resource table

Legend — *Activity*: commits in the last 12 months (human top committer share where relevant). *A11y evidence*: **A** = publishes a named screen-reader/browser test matrix; **B** = states WAI-ARIA APG conformance and "tested" without a matrix; **C** = relies on a primitive layer (inherits its grade); **D** = CSS-only or ad-hoc. *Use*: **Use** directly / **Learn** from / **Avoid**.

### Headless / accessible primitives

| Library | Framework | License | Latest (date) | Activity (12 mo) | A11y evidence | Use |
|---|---|---|---|---|---|---|
| Base UI `@base-ui/react` | React 17–19 | MIT | 1.8.0 (2026-09-04) | 1,843 commits; multi-maintainer, full-time MUI team | B (APG; "tested on a broad spectrum") | **Use** — default for new React work |
| React Aria / React Aria Components | React | Apache-2.0 | RAC 1.21.1 / react-aria 3.52.1 (2026-09-04) | 907 commits; 3 core maintainers at ~150 each | **A** (VoiceOver macOS Safari/Chrome, JAWS & NVDA on Firefox/Chrome, VoiceOver iOS, TalkBack) + 30+ locales | **Use** — when a11y/i18n is the requirement |
| Radix Primitives `radix-ui` | React | MIT | 1.6.7 (2026-07-24) | ~217 commits in 2026, ~88% one maintainer | B | **Use** in existing projects; don't migrate away without reason |
| Ark UI / Zag.js | React, Vue, Solid, Svelte | MIT | Ark 5.39.2 / Zag 1.44.0 (2026-09-13) | 510 / 856 commits; one lead dominant | B | **Use** for multi-framework systems |
| Ariakit | React | MIT | 0.4.40 (2026-09-14) | ~1,050 human commits, one maintainer | B (strong APG focus, still 0.x) | **Use** selectively / **Learn** |
| Headless UI | React (Vue stale) | MIT | React 2.2.10 (2026-04-07); Vue 1.7.23 (2024-09-09) | 4 commits in 2026 | B | **Avoid** for new non-Tailwind-Plus work |
| Reach UI | React | MIT | 0.18.0 (2022-10-13) | none; README: "not maintained" | — | **Avoid** |
| Bits UI | Svelte 5 | MIT | 2.19.3 (2026-09-22) | 153 commits | B | **Use** (Svelte) |
| Melt (next-gen `melt`) / `@melt-ui/svelte` | Svelte | MIT | 0.44.0 (2026-01-04) / 0.86.6 (2025-03-28) | 32 commits, last 2026-03 | B | **Learn**; prefer Bits UI |
| Kobalte | Solid | MIT | 0.13.14 (2026-09-07) | 26 commits; pre-1.0 | B | **Avoid** for new work; use Ark UI Solid |
| Reka UI (ex-Radix Vue) | Vue 3 | MIT | 2.10.5 (2026-09-21) | 432 commits | B | **Use** (Vue) |

### Styled / copy-in systems

| Library | Built on | License | Latest (date) | Activity | Use |
|---|---|---|---|---|---|
| shadcn/ui (CLI `shadcn`) | Base UI (default) / Radix / React Aria + Tailwind v4 | MIT | 4.21.0 (2026-09-04) | very active | **Use** as source you own; never ship a default style |
| HeroUI v3 | React Aria Components + Tailwind v4 | MIT | 3.2.6 (2026-09-17) | 767 commits | **Use** when you want styled + RAC a11y |
| Mantine 9 | own + Floating UI | MIT | 9.6.3 (2026-09-26) | 1,790 commits (~90% one maintainer) | **Use** for fast internal tools (React ≥ 19.2) |
| Chakra UI v3 | Ark UI + Emotion runtime | MIT | 3.37.0 (2026-08-28) | 441 commits | **Use** if already on Chakra |
| Park UI | Ark UI + Panda CSS | MIT | CLI 1.0.1 (2025-11-20) | 51 commits (one maintainer), last 2026-02 | **Learn** (reference styling for Ark) |
| MUI Material UI v9 | own (Emotion) | MIT | 9.4.0 (2026-08-27) | 1,386 commits | **Use** if already on MUI / Material look wanted |
| MUI Joy UI | — | MIT | 5.0.0-beta.52 (2025-03-18) | on hold, removed from repo | **Avoid** |
| Ant Design 6 | own (CSS-in-JS → CSS variables default) | MIT | 6.6.5 (2026-09-20) | 2,547 commits | **Use** for data-heavy admin, esp. CJK markets |
| PrimeReact 11 / PrimeVue 5 | own | **Commercial (PrimeUI)**; ≤10/≤4 MIT | 11.2.0 (2026-09-28) / 5.0.1 | active | **Avoid** unless licensed; pin MIT majors only knowingly |
| Fluent UI React v9 | own (Griffel) | MIT | 9.74.9 (2026-09-23) | 884 commits | **Use** for Microsoft-ecosystem apps (Teams/Office add-ins) |
| daisyUI 5 | pure CSS Tailwind plugin | MIT | 5.7.46 (2026-09-24) | 605 commits | **Use** for server-rendered/Tailwind-only apps; audit interactive parts |
| Flowbite 4 / flowbite-react | Tailwind + vanilla JS / Floating UI | MIT | 4.0.2 (2026-05-13) / 0.12.17 (2026-02-09) | 171 commits | **Learn**; use cautiously |
| Preline 5 | Tailwind + vanilla JS | MIT **+ "Preline UI Fair Use License"** | 5.0.0 (2026-08-21) | 19 commits | **Learn**; check fair-use terms |
| Tailwind Plus (UI Blocks, Catalyst, Elements) | Headless UI (Catalyst), custom elements (Elements) | **Commercial** | Elements 1.0.22 (2026-01-05) | — | **Use** if purchased; don't redistribute |
| Radix Themes | Radix | MIT | 3.3.0 (2026-01-31) | 1 release / 12 mo | **Avoid** for new work |

### Dashboard, ecommerce, mobile-web, CSS-first, Vue/Svelte

| Library | Purpose | License | Latest (date) | Status | Use |
|---|---|---|---|---|---|
| shadcn charts / blocks | Recharts v3 composition + dashboard/login/sidebar blocks, Base UI & Radix variants | MIT | — | active | **Use** as a start, then restyle |
| Tremor (`@tremor/react` / copy-paste) | charts, KPI cards, trackers (Radix + Recharts + Tailwind) | Apache-2.0 / MIT | 3.18.7 (2025-01-13) | npm stale; copy-paste repo quiet since 2025-10 | **Learn** (blocks are good references) |
| Refine core v5 | headless CRUD/admin framework (TanStack Query 5) | MIT | 5.0.12 (2026-04-02) | 376 commits | **Use** for internal tools with CRUD |
| Shopify Hydrogen | headless storefront framework (React Router 7, Oxygen) | MIT | 2026.4.5 (2026-08-14) | active | **Use** for Shopify storefronts (no visual system imposed) |
| Polaris web components | Shopify admin/app UI | Shopify-restricted MIT | — | current | **Use** only inside Shopify apps |
| Polaris React | — | Shopify-restricted MIT | 13.9.5 (2025-03-26) | **deprecated** | **Avoid** |
| Medusa UI | Medusa admin UI (Radix + React Aria + TanStack Table) | MIT | 4.2.6 (2026-09-28) | active | **Use** for Medusa admin extensions |
| Konsta UI v5 | iOS 26 / Material components in Tailwind v4 (React, Vue, Svelte) | MIT | 5.4.0 (2026-08-25) | 57 commits (one maintainer) | **Use** for native-feel mobile web/PWA |
| Ionic 9 | full mobile app framework (web components + React/Vue/Angular) | MIT | 9.0.5 (2026-09-23) | active | **Use** for Capacitor apps |
| Framework7 9 | iOS/Material mobile framework | MIT | 9.1.3 (2026-08-25) | one maintainer | **Use** for non-React mobile web |
| Pico CSS | classless/semantic CSS | MIT | 2.1.1 (2025-03-15) | dormant | **Learn**; prototypes only |
| Open Props | CSS custom-property token library | MIT | 1.7.23 (2026-01-31); v2 beta | low | **Learn** / use as token seed |
| UnoCSS | atomic CSS engine, presets (wind4 = Tailwind v4 compatible) | MIT | 66.10.5 (2026-09-16) | active | **Use** if the repo already uses it |
| Vuetify 4 | Material components for Vue | MIT | 4.2.2 (2026-09-23) | 1,088 commits | **Use** (Vue, Material) |
| Nuxt UI v4 | Reka UI + Tailwind v4 + TanStack Vue Table | MIT | 4.11.2 (2026-09-22) | 1,113 commits | **Use** (Nuxt) |
| Skeleton v5 | Zag.js + Tailwind (Svelte/React) | MIT | 5.0.1 (2026-08-19) | 503 commits | **Use** (Svelte styled) |
| shadcn-svelte / shadcn-vue | Bits UI / Reka UI ports | MIT | 1.7.0 (2026-09-16) / 2.8.2 (2026-08-08) | active | **Use** |

### Tables, pickers, command palettes, toasts, drawers, forms

| Library | License | Latest (date) | Status | Use |
|---|---|---|---|---|
| TanStack Table v9 | MIT | 9.2.4 (2026-08-28) | 447 commits | **Use** — default headless table |
| AG Grid Community / Enterprise | MIT / **Commercial EULA** | 36.2.0 (2026-09-16) | active | **Use** Community; Enterprise only when licensed (watermark + console error without key) |
| MUI X Data Grid (MIT / Pro / Premium) | MIT / commercial / commercial | 9.14.0 (2026-09-17) | active | **Use** in MUI apps; MIT grid caps pages at 100 rows |
| Glide Data Grid | MIT | 6.0.3 (2024-02-03) | 3 commits in 2026 | **Avoid** for new work unless canvas-scale grids are essential |
| React Aria DatePicker/Calendar/RangeCalendar | Apache-2.0 | — | active | **Use** where i18n/a11y matter |
| react-day-picker v10 (`@daypicker/react`) | MIT | 10.0.1 (2026-05-15) | active | **Use** for calendar grids (shadcn Calendar) |
| MUI X Date Pickers | MIT (range pickers Pro) | 9.14.0 | active | **Use** in MUI apps |
| cmdk | MIT | 1.1.1 (2025-03-14) | dormant | **Use knowingly**; prefer Base UI Autocomplete / RAC Autocomplete for new palettes |
| Sonner | MIT | 2.0.8 (2026-08-09) | low activity, stable | **Use** (4 s default, 3 visible, polite live region) |
| Base UI Toast / RAC `UNSTABLE_Toast` | MIT / Apache-2.0 | — | active / unstable | **Use** Base UI Toast in Base UI stacks |
| Vaul | MIT | 1.1.2 (2024-12-14) | **unmaintained** | **Avoid**; use Base UI Drawer |
| React Hook Form | MIT | 7.89.0 (2026-09-26) | 392 commits | **Use** — default for client forms |
| Conform | MIT | 1.21.1 (2026-08-18) | 181 commits | **Use** for server actions / progressive enhancement |
| TanStack Form | MIT | 1.33.5 (2026-08-11) | 260 commits | **Use** when deep type-safety across frameworks matters |
| Formik | Apache-2.0 | 2.4.9 (2025-11) | low | **Avoid** for new work |

## 1.3 Measured bundle cost (first component, React externalised)

esbuild `--minify`, gzip -9, measured 2026-09-28. These are *cold* costs — the first component pays for shared infrastructure (focus scopes, positioning, i18n), so the marginal cost of further components is lower.

| Entry | min | gzip |
|---|---|---|
| Radix Dialog | 39.5 kB | **13.4 kB** |
| Headless UI Dialog | 45.2 kB | 16.4 kB |
| Ariakit Dialog | 52.7 kB | 19.2 kB |
| Ark UI Dialog | 58.8 kB | 19.4 kB |
| Base UI Dialog | 66.7 kB | 22.9 kB |
| React Aria Components Modal+Dialog | 79.4 kB | 26.5 kB |
| Radix Dialog + Select | 93.6 kB | **31.9 kB** |
| Headless UI Dialog + Listbox | 112.9 kB | 39.6 kB |
| Ark Dialog + Select | 125.4 kB | 40.1 kB |
| Ariakit Dialog + Select | 112.8 kB | 40.4 kB |
| Base UI Dialog + Select | 139.5 kB | 48.6 kB |
| RAC Dialog + Select | 181.1 kB | 58.0 kB |
| Sonner | 33.5 kB | 9.4 kB |
| cmdk (pulls Radix Dialog) | 49.5 kB | 17.0 kB |
| Vaul (pulls Radix Dialog) | 67.6 kB | 21.3 kB |
| Base UI Drawer | 107.3 kB | 37.1 kB |
| Base UI Toast | 70.7 kB | 25.8 kB |
| TanStack Table v9 (sort + filter + pagination features) | 41.5 kB | 13.2 kB |
| React Hook Form | 30.2 kB | 11.1 kB |
| Conform | 25.2 kB | 8.6 kB |
| TanStack Form | 65.2 kB | 17.2 kB |

Reading: all headless libraries sit within ~2× of each other; none is a reason to pick on size alone for an app. React Aria is the heaviest because it ships localisation and interaction normalisation — its `@react-aria/optimize-locales-plugin` strips unused locale strings. For a *marketing* page, every one of these is heavier than the native `<dialog>`, `<details>` and `popover` attribute, which cost 0 kB.

## 1.4 Per-library notes (the ones that matter)

### Base UI — the new default for React
- **What**: 38 unstyled components per the package exports (accordion, alert-dialog, autocomplete, avatar, button, checkbox(-group), collapsible, combobox, context-menu, dialog, drawer, field/fieldset/form, input, menu, menubar, meter, navigation-menu, number-field, otp-field, popover, preview-card, progress, radio(-group), scroll-area, select, separator, slider, switch, tabs, toast, toggle(-group), toolbar, tooltip). Temporal adapters (date-fns, luxon) are in `internals`, which suggests date components are coming; there is no public date picker yet.
- **API**: `render` prop instead of Radix's `asChild` (shadcn's migration skill rewrites `asChild` → `render`); state exposed as data attributes and className functions.
- **When**: new React apps, and anything built with shadcn going forward. Full-time company team; the bus factor is the best of the React headless libraries.
- **When not**: you need a date picker, table, tree or drag-and-drop today (use React Aria); an existing Radix app that works (shadcn: *"the worst thing you can do for your production app is switch component libraries"*).
- **A11y**: states APG conformance and focus management (`initialFocus`/`finalFocus`), recommends APCA "unless your application has strict requirements around compliance"; no published screen-reader matrix. Leaves the visible focus style to you.

### React Aria / React Aria Components — the accessibility and i18n benchmark
- **What**: the widest component set of any headless library: Table (with resizable columns, load-more), GridList, Tree, NavigationTree, DatePicker/Calendar/RangeCalendar (with month/year pickers), ColorPicker, DropZone, Autocomplete, Virtualizer, drag and drop, `UNSTABLE_Toast`. Hooks layer (`react-aria`) for fully custom widgets.
- **Evidence**: the only library here that names its test matrix (VoiceOver macOS in Safari and Chrome; JAWS and NVDA on Windows in Firefox and Chrome; VoiceOver iOS; TalkBack on Android Chrome), 30+ localised languages, calendar/number systems, RTL keyboard behaviour, and normalised press/hover/focus (`data-hovered` not applied on touch — no sticky hover; `data-focus-visible` not on click or programmatic focus). It also documents known automated-checker false positives.
- **When**: government, health, finance, education, anything multi-locale or RTL, anything with dates, anything data-dense (Table/GridList/Tree). Now a shadcn base, and the base of HeroUI v3.
- **When not**: tiny bundles; teams that want Radix-style `asChild` composition.

### Radix Primitives — mature, widely deployed, thinly maintained
- Still the most deployed primitive layer (the whole pre-2026 shadcn ecosystem), MIT, APG-following, unified `radix-ui` package (shadcn `new-york` migrated to it in Feb 2026 via `npx shadcn migrate radix`).
- **Risk**: ~88% of 2026 commits from one person; long-open Combobox/multi-select gaps. Fine to keep; think twice before starting new greenfield work on it.
- **A11y evidence**: "tested in a wide selection of modern browsers and commonly used assistive technologies" — no matrix.

### Ark UI / Zag.js — one state machine, four frameworks
- Zag implements each widget as a framework-agnostic state machine; Ark wraps it for React, Vue, Solid, Svelte. Powers Chakra v3, Park UI and Skeleton v5.
- **When**: a design system that must ship the same behaviour in several frameworks, or Solid (Kobalte is slow and pre-1.0).
- **Risk**: one lead writes most commits; very active nonetheless.

### Ariakit — the most APG-literal, the most "library author" API
- Store-based API (`useDialogStore`, `useSelectStore`), excellent composite/combobox/menu primitives, still 0.x after years. One maintainer. Best *learned from* for how combobox and composite focus should behave.

### Headless UI, Reach UI
- Headless UI: fine inside Tailwind Plus/Catalyst, where it is the intended layer; otherwise low activity (4 commits in 2026) and the Vue package has not shipped since 2024-09.
- Reach UI: unmaintained. Never.

### shadcn/ui and its registry ecosystem
- **What it is now**: a CLI that writes component source into your repo, with a choice of base (Base UI default, Radix, React Aria), eight styles that "rewrite the component code" (geometry, spacing, density — not only colours), presets that encode a whole design system in a short code, and a registry protocol any GitHub repo can publish to (components, hooks, tokens, "agent instructions", CI workflows).
- **Why it matters for a redesign skill**: shadcn is the de-facto starting point of AI-built apps, and its default look is recognisable. Its own author now says the defaults made "all apps… look the same". A redesign that keeps default Vega/`new-york` with a changed accent colour is the app-world equivalent of this skill's "house recipe" failure.
- **Good practice**: pick a base deliberately; start from the style nearest the art direction (Mira/Rhea for dense product UI, Sera for editorial, Lyra for boxy/mono), then replace tokens and geometry; review third-party registry items with `--dry-run/--diff/--view` before writing (they are arbitrary code); `shadcn eject` if you do not want the `shadcn` CSS dependency.
- **Density lesson from Rhea**: shadcn created a separate compact style instead of changing Tailwind's `--spacing` multiplier, because changing it "would change what familiar utilities mean across your app". Density belongs in component sizes, not in redefining the spacing unit.

### HeroUI v3
- Styled, attractive defaults on React Aria Components + Tailwind v4, CSS-only animations, OKLCH variables, BEM-ish modifiers, ships an MCP server and llms.txt. React ≥ 19 peer. Good when a team wants a styled kit with RAC-grade a11y; its look is recognisable too, so restyle.

### Mantine 9
- The most complete batteries-included React kit (100+ components, hooks, dates, charts, schedule, forms) with a single, very prolific maintainer. Requires React 19.2+. Ideal for internal tools where speed beats brand; its look is generic unless themed.

### MUI Material UI v9, Ant Design 6, Fluent UI React v9
- **MUI**: pick when the product already uses it or wants Material; MUI X (Data Grid, Date Pickers, Charts) is the strongest reason to stay. Don't start on Joy UI (on hold) or `@mui/base` (deprecated).
- **Ant Design 6**: data-heavy admin with dense forms and tables, strong in Chinese-language products; v6 defaults to CSS variables (runtime theme switching), React ≥ 18, React Compiler in the UMD build. Very opinionated look.
- **Fluent UI React v9**: for Teams/Office/Microsoft-adjacent products; Fluent 2 tokens are the reference for Microsoft-style density.

### PrimeReact / PrimeVue / PrimeNG
- Technically capable, very large component catalogues, but now commercial with a license key that "may cause the software to display a license notice" when missing. The license also forbids redistributing it "as a component library or development tool". Treat as a procurement decision, not a dependency choice.

### Tailwind-only ecosystems
- **daisyUI 5**: CSS-only component classes and themes on Tailwind v4; v5 modals use native `<dialog>`/popover. Interactive widgets that are CSS-only (dropdowns via focus/`details`) have documented keyboard and ARIA gaps (issue #885, discussion #3135). Fine for server-rendered apps if interactive parts are audited or replaced.
- **Flowbite / Preline**: HTML + vanilla JS plugins; handy for Rails/Laravel/Django. Preline adds a "Fair Use" license (no competing products, attribution for derivative templates).
- **Tailwind Plus** (paid): UI Blocks, templates, **Catalyst** (React app kit on Headless UI) and **Elements** (headless custom elements: autocomplete, command palette, dialog, disclosure, dropdown, popover, select, tabs — works anywhere a `<script>` works). License: one individual per personal license; no redistribution; no products that let end users build products from the components.

### Dashboards
- **shadcn chart** is not a chart library; it composes Recharts v3 with themed tooltip/legend parts ("We do not wrap Recharts"). **Tremor** (now Vercel) is good reference material for KPI cards, trackers and chart framing, but the npm package is stale.
- **Refine** handles data/auth/routing for CRUD apps and lets you bring any UI — good pairing with shadcn or Mantine for internal tools.

### Ecommerce
- **Hydrogen** gives commerce plumbing (Storefront API, cart, analytics, caching, streaming SSR on React Router 7), not a visual system — the storefront design is yours.
- **Polaris** is for Shopify admin surfaces only, and its license forbids using it for stand-alone apps that are not "dissimilar and visually distinct from Shopify products". Learn from its patterns (resource index/detail layouts, common actions); never borrow its look for a non-Shopify product.
- **Medusa UI** is Medusa's admin kit (Radix + React Aria + TanStack Table) — use for admin extensions.

### Mobile-web
- **Konsta UI v5** (Tailwind v4, iOS 26 + Material 2025 look, React/Vue/Svelte) for PWAs that should feel native; **Ionic 9** when you need a full app shell with navigation stacks and Capacitor; **Framework7** for non-React stacks. None is appropriate for a responsive marketing site.

### CSS-first
- **Open Props** is a good token seed (sizes, easings, shadows as custom properties) — useful vocabulary even when not installed. **Pico** is dormant; fine for prototypes and docs. **UnoCSS** only if the repo already uses it.

### Tables and grids
- **TanStack Table v9** is the default: headless, you own markup and a11y (use real `<table>` semantics or ARIA grid consciously). v9 requires declaring features (`tableFeatures()`), and unlisted features and sort/filter functions are tree-shaken out.
- **AG Grid**: Community (MIT) covers sorting, filtering, pagination, editing, custom cells, theming. Enterprise (commercial, per developer per deployment, perpetual + 1 year updates) adds row grouping, aggregation, pivoting, server-side row model, master/detail, Excel export, integrated charts, formulas. Without a key, Enterprise shows a watermark and console error — do not ship it unlicensed.
- **MUI X Data Grid**: MIT grid limits pages to 100 rows; Pro adds tree data, column pinning, multi-sort/filter, row reordering; Premium adds row grouping, aggregation, pivoting, Excel export, clipboard, cell selection.
- **Glide Data Grid**: canvas-rendered, millions of rows, but slow maintenance and its own FAQ admits none of the primary developers are accessibility users. Avoid unless its scale is required.

### Date pickers
- Prefer a **segmented date field + optional calendar** (React Aria DatePicker) for data entry; a **calendar grid** (react-day-picker) for choosing from availability; **three separate fields** for memorable dates like date of birth (GOV.UK "Date input" / USWDS "Memorable date"). Never force a calendar for a date the user already knows.

### Command palettes, toasts, drawers
- **cmdk** works and is ubiquitous, but is dormant; new palettes can be built on Base UI Autocomplete/Combobox or React Aria Autocomplete + Menu (maintained, with documented ARIA).
- **Sonner**: default lifetime 4,000 ms, 3 visible toasts, `aria-live="polite"`. Pause-on-hover is not enough for WCAG 2.2.1 on its own; see the notification rules in Part 2.
- **Drawers**: Base UI Drawer; Vaul is unmaintained.

### Forms
- **React Hook Form** defaults are `mode: onSubmit`, `reValidateMode: onChange`, `shouldFocusError: true` — i.e. the "validate on submit, then reward early" behaviour the design systems recommend (Part 2 §2.6). Keep the defaults.
- **Conform** defaults `shouldValidate: 'onSubmit'`; built for server actions and progressive enhancement (works without JS) — the right fit for React Router/Remix and Next.js server actions.
- **TanStack Form**: headless, type-safe, framework-agnostic; more ceremony.
- Pair any of them with Standard Schema validators (Zod 4, Valibot).

## 1.5 Decision guide

**First rule: detect before choosing.** In an existing repo, the primitive layer is already chosen. Restyle it; do not swap Radix for Base UI (or MUI for Mantine) as part of a visual redesign. Swapping is a separate project with its own risk, and shadcn's own guidance says so.

| If the project is… | Reach for | Never / avoid | Because |
|---|---|---|---|
| A marketing site (Astro, Next static, Eleventy) with a few widgets | Native HTML: `<dialog>`, `<details>`, `popover`, `<select>`; one headless component (Base UI / Radix) only for a genuinely complex widget | MUI, Ant, Mantine, Chakra, Prime, HeroUI | 13–60 kB of JS for what the platform does for free; these kits impose an app look on a brand site |
| A new React SaaS app with its own brand | shadcn/ui on **Base UI**, a deliberately chosen style, your own tokens | Shipping default Vega/`new-york`; Radix Themes; Joy UI | Base UI has the healthiest maintenance; default shadcn is the most recognisable look in AI-built apps |
| A React app where accessibility or i18n is the requirement (gov, health, finance, edu, RTL, many locales, heavy date entry) | **React Aria Components** (or shadcn `--base aria`, or HeroUI v3 for styled) | CSS-only kits for interactive widgets | Only library with a published SR/browser test matrix and localisation for 30+ languages |
| An existing shadcn + Radix app | Stay on Radix; restyle; migrate component-by-component only if asked | A big-bang migration inside a redesign | Behaviour differences compile fine and act differently (shadcn migration reports flag them) |
| An internal tool / admin where speed beats brand | Mantine 9 (React ≥ 19.2) or Ant Design 6; Refine for CRUD; TanStack Table or AG Grid Community | Building primitives from scratch | Hundreds of components, forms and tables out of the box |
| A data-dense enterprise app with grouping/pivot/server-side data | AG Grid Enterprise (licensed) or MUI X Premium; else TanStack Table v9 + virtualisation | Glide Data Grid; unlicensed Enterprise builds | Licensing watermarks; a11y and maintenance of canvas grids |
| A design system shared across React + Vue + Solid + Svelte | Ark UI / Zag.js; Park UI as styling reference | Framework-specific primitives per framework | One behaviour spec, four adapters |
| Vue / Nuxt | Reka UI + shadcn-vue, or Nuxt UI v4 (free); Vuetify for Material | Headless UI Vue (stale), `radix-vue` (renamed) | Maintenance |
| Svelte / SvelteKit | Bits UI + shadcn-svelte; Skeleton v5 for styled | `@melt-ui/svelte` (stale) | Svelte 5 runes support and activity |
| Solid | Ark UI Solid | Kobalte (pre-1.0, slow) | Maintenance |
| Server-rendered Rails / Django / Laravel with Tailwind | daisyUI 5 for styling; Tailwind Plus Elements (paid) or small vanilla JS for behaviour | CSS-only dropdowns/menus without an a11y audit | Known keyboard/ARIA gaps in CSS-only interactive patterns |
| A Shopify admin app | Polaris web components | Polaris React (deprecated); Polaris look-alikes outside Shopify | License restricts use to Shopify-integrated apps |
| A Shopify storefront | Hydrogen + your own design system | Polaris on a storefront | Polaris is admin UI and license-restricted |
| A Medusa admin extension | Medusa UI | — | Consistency with the host admin |
| A native-feeling mobile web app / PWA | Konsta UI v5; Ionic 9 for full app shell + Capacitor | Konsta/Ionic on a responsive marketing site | They emulate OS chrome, which is wrong on a brand site |
| A Microsoft 365 / Teams add-in | Fluent UI React v9 | A foreign visual language | Host consistency |
| Any project considering Prime* | PrimeReact ≤ 10 / PrimeVue ≤ 4 (MIT) only with an exit plan, or buy the license | Installing v11/v5 without eligibility | License key, notices, redistribution limits |

---

# Part 2 — Principles from mature design systems

Quoted rules carry their source; numbers are the systems' own.

## 2.1 Component anatomy

- Every serious system documents a component as **numbered parts** with a name per part (Carbon "Anatomy", Primer "Anatomy", PatternFly numbered anatomy, Orbit "Content structure"). The anatomy is the contract: it names what can be omitted, what is required, and what text lives where. PatternFly's table anatomy, for instance: toolbar, expansion toggle, column headers (with sort), inline actions, selection checkbox, expanded panel — and "If a row includes actions… they should always be placed in the final column."
- Anatomy separates **structure from content**: Carbon splits "Formatting" (anatomy, sizes, alignment) from "Content" (main elements, overflow content); Orbit's template has "Content structure" separate from "Behavior" and "Content".
- **Emphasis is part of anatomy, not decoration.** Carbon button emphasis (primary, secondary, tertiary, ghost, danger); Polaris: "Avoid using more than two shaped or filled buttons within a card"; GOV.UK: warning buttons "only work if used very sparingly. Most services should not need one"; Spectrum 2's *attention hierarchy*: "only one element or group of elements should have high attention on a page."

## 2.2 The full state matrix — what the systems agree and disagree on

**Agreement**
- States come in families: *interaction* (hover, focus, pressed/down, dragged), *selection* (selected, checked, indeterminate, current, expanded), *validation* (error, warning, success), *availability* (disabled, read-only, hidden), *async* (loading/skeleton), plus *empty*. Carbon's text input lists Enabled, Active (typing), Focus, Error, Warning, Disabled, Skeleton, Read-only.
- **Read-only ≠ disabled** (Carbon): disabled "cannot be clicked, selected or interacted with. It is not read by a screen reader… do not need to pass visual contrast"; read-only "can still be focusable, accessible by screen readers, and passes visual contrast" — text stays at 4.5:1 and "should never contain any interactive indicators such as… hover states, or text embellishments (i.e., underlines)." Read-only applies when a *process*, a *lock* (someone else is editing) or *permissions* prevent editing.
- **Hide by permission, disable by dependency** (Carbon): hide what the user has no permission to use ("then and only then will the button be visible" once granted); disable temporarily for unmet prerequisites, and "the component should never fully disappear."
- **Avoid disabled controls** — GOV.UK ("Disabled buttons have poor contrast and can confuse some users, so avoid them if possible"), USWDS ("Avoid disabled states, especially for text inputs… use `aria-disabled=true` instead of the disabled attribute"), Primer ("Do not disable buttons… they won't be discovered as they won't take keyboard focus"), Primer forms ("Do not disable or hide a form's save button even if the form is invalid or has not been changed"). Nielsen: disable only when users should know the feature exists, and explain why and how to enable it.
- **Primer's "inactive" state** is the accessible alternative: muted style, still focusable, *responds* — "Show a dialog on click… It is required to provide some kind of feedback when a user clicks a button"; a tooltip on hover/focus is optional. Don't set `aria-disabled` if clicking does something.
- **Selected uses neutral, not accent** (Spectrum 2): "Selected states use a primary style by default, generally through a gray-800 fill"; the accent version is for a narrowly scoped context with a single clear call to action. Otherwise the selected nav item competes with the primary action.
- **Hover is not a state on touch** (React Aria `data-hovered` "not applied on touch devices, preventing sticky hover states"); **focus-visible** is not shown on pointer click or programmatic focus.
- **Pressed can be shape, not colour**: Spectrum 2 "some components use a change in size instead of color to communicate a down state."
- **Every table row has a hover state** "regardless of if actions or selections can be made" (Spectrum 2).

**Disagreement (and the call for our skill)**
- *Loading buttons*: Carbon "The button would be disabled when inline loading is in progress"; Primer: "don't remove the button from the DOM or pass the `disabled` attribute… it would reset focus"; set `aria-disabled="true"` and announce "Saving profile" via an `aria-live="polite"` region that exists on page load. **Adopt Primer's** — it keeps keyboard users' place.
- *State-layer opacities*: Material's shipped tokens (`@material/web` 2.5.0) use hover 0.08, focus 0.12, pressed 0.12, dragged 0.16. Atlassian and PatternFly name explicit per-state colour tokens instead (`color.background.neutral.hovered`, `…pressed`). **Adopt named state tokens** (they survive dark mode and brand colours); overlays are an implementation of them.

## 2.3 Token architecture

- **Three tiers everywhere, different names**: PatternFly *palette → base → semantic* ("Semantic tokens… are the tokens that you should see and use in most use cases"); Fluent *global → alias → component*; Material *reference → system → component* (`md.ref.palette.*` → `md.sys.color.*` → `md.comp.*`); SLDS 2 replaced design tokens with **global styling hooks** (`--slds-g-*`) consumed by components *(secondary)*; USWDS *system tokens → theme tokens* (+ state tokens).
- **Naming grammar — pick one and use it for every token.** PatternFly: `--pf-t--[scope]--[component]--[property]--[concept]--[variant]--[state]` (e.g. `--pf-t--global--background--color--action--plain--clicked`), general-to-specific, segments skipped when irrelevant. Atlassian: `color.[property].[role].[emphasis].[state]` (`color.background.danger.subtler.hovered`, `color.border.focused`, `color.background.selected.bold.pressed`), plus `elevation.surface.{sunken,raised,overlay}` and `opacity.{disabled,loading}`. Nathan Curtis: namespace / object / base / modifier.
- **Semantic spacing categories** (PatternFly): *action* (padding inside buttons), *control* (padding inside inputs/toggles), *gap* (between elements), *gutter* (layout grid), *inset* (inner padding of structural regions) — "always use these more specific semantic tokens, rather than a global spacer token."
- **Scales with numbers**: Carbon spacing 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160; Fluent 2 spacing none, 2, 4, 6 (sNudge), 8, 10 (mNudge), 12, 16, 20, 24, 32 — with separate horizontal and vertical token sets; Atlassian `space.0…space.1000` named as percent of an 8 px base (`space.100` = 8 px, `space.025` = 2 px), negatives for pulls; PatternFly 4, 8, 16, 24, 32, 48, 64, 80. Fluent motion: 50, 100, 150, 200, 250, 300, 400, 500 ms; radii 0, 2, 4, 6, 8, circular.
- **Contrast encoded in the palette** (USWDS): colour *grades* 0 (white) to 100 (black), consistent across hues; the grade difference ("magic number") predicts contrast — **40+ = AA large, 50+ = AA, 70+ = AAA**. A token system that makes accessible pairs computable is better than one checked after the fact.
- **Theme tokens as roles**: USWDS theme families `base`, `primary`, `secondary`, `accent-warm`, `accent-cool` in a 60/30/10 budget — the same budget the skill's `design-theory.md` already uses.
- **Interchange**: DTCG format 2025.10 is stable; Style Dictionary 5 and Terrazzo read it. Emit tokens as CSS custom properties; keep the JSON as the source when a system spans code and design tools.

## 2.4 Typography: product UI vs marketing

| System | Product body | Marketing / expressive | Scale rule |
|---|---|---|---|
| Carbon | **productive set: 14 px base, fixed headings** ("Product pages have a higher density of information housed inside containers… fixed type styles are a must") | **expressive set: 16 px base, fluid headings** that change size between breakpoints; "Do not use these styles inside a container" | two named sets (`-01` productive, `-02` expressive) |
| Fluent 2 | Body1 14/20; Caption1 12/16; Caption2 10/14 | Subtitle 16/22, 20/28; Title 24/32, 28/36, 32/40; Large title 40/52; Display 68/92 | named ramp |
| Atlassian | `font.body` 14/20; small 12/16; large 16/24 | headings up to xxlarge; separate `font.metric.*` for dashboard numbers | named semantic tokens |
| Spectrum 2 | Component, Body (line-height 1.5; CJK 1.7), Detail styles | font-size-1400/1500 added "for website design and for marketing scenarios"; Black weight never below 18 px | **Major Second, 1.125** ratio; component line height ~130% small → ~115% large |

Principles:
- **Product UI is 14 px-based, fixed, and uses a gentle ratio (≈1.125–1.2); marketing is 16 px-based, fluid, and uses a steeper ratio.** A redesign that spans both (marketing site + app) needs two sets on one token system, not one scale stretched over both.
- **Name type by role, not size**: Spectrum's Heading / Title / Body / Detail / Component / Code; Atlassian's heading / body / metric / code. "Component" text (inside controls) is its own style with its own line height, so labels centre vertically and never sit on half pixels (Spectrum rounds line heights to even pixels).
- **Dashboard numbers get their own style** (Atlassian `font.metric`), and tabular data uses tabular figures and right alignment (USWDS: "Right-align numerical data… consider formatting numbers… in a monospace font").
- **Weight is hierarchy**: Spectrum — bold for titles, file names, user names and button labels; medium for labels beside 1.5 px-stroke icons; regular for anything user-entered or editable.

## 2.5 Spacing and density

- **Density changes padding, not type size**: Spectrum 2 tables — "Density controls vertical spacing while keeping font sizes consistent" (compact / regular / spacious; regular default).
- **Material density scale**: 0, −1, −2, −3, each step removing 4 dp of height/padding (e.g. 36 → 24 px at −3); targets stay ≥ 48×48 dp even when the visual shrinks; "Don't increase density in UIs that involve focused tasks, such as selecting from a menu" *(secondary)*.
- **SAP Fiori**: two modes for the whole app — *cozy* (touch; default touch area 2.75 rem = 44 px) and *compact* (mouse/keyboard; rows and toolbars at 2 rem = 32 px) — set by input modality, with hybrids offering both *(secondary)*.
- **Carbon table rows**: xs 24, sm 32, md 40, lg 48, xl 64 px; the header row always matches the body row height; xl "only… if your data is expected to have 2 lines of content in a single row"; tall toolbar pairs with lg/xl, small toolbar with sm/xs.
- **Implementation lesson (shadcn Rhea)**: make density a *component-size* decision (a compact style or a `data-density` attribute that swaps control heights and paddings), not a change to the base spacing unit.
- **Rule of thumb for the skill**: comfortable is the default; compact is offered (per table or per user preference) in data-heavy views operated by mouse and keyboard; never compact on touch-first surfaces; targets never below 24 px (WCAG 2.5.8), 44 px on touch.

## 2.6 Forms

**Validation timing — consensus**
- **Validate on submit**; don't validate on blur or while typing. GOV.UK: "Do not validate when the user moves away from a field. Wait until they try to move to the next part of the service"; "avoid validating the information in a field before the user has finished entering it… especially for users who type more slowly." Primer: "The default behavior of the web is to perform validation when the user attempts to submit… This lets the user flow quickly through the form."
- **After a failed submit, re-validate live** ("reward early, punish late"): Primer "After a form has been submitted and failed validation, you may switch to inline validation." React Hook Form's defaults already do this (`onSubmit` then `onChange`).
- **Exceptions** where live feedback earns its place: character limits (GOV.UK Character count), availability checks (Primer's repository-name success message), password rules.
- **Dissent**: Kiwi Orbit validates on blur and shows errors as tooltips on focus. It is the outlier; tooltip-only errors are invisible until focus and hard for magnifier users — don't copy it.
- Server-side validation is always required; turn off HTML5 validation UI (`novalidate`) because its bubbles are inconsistent and inaccessible (GOV.UK; Primer: "Browser-native validation messages are not accessible to screen readers").

**Error presentation — the error summary pattern** (GOV.UK, adopted by EUI and Primer)
1. Re-show the page with every answer preserved ("Keep both passing and failing answers").
2. Prefix the `<title>` with "Error: " so screen readers hear it first (GOV.UK, USWDS).
3. An error summary at the top of `main` (below breadcrumbs/back link, above the `h1`), headed "There is a problem", **focused on load**, linking each error to its field (first field of a group; first radio/checkbox).
4. The same message next to each field, after label and hint, with a coloured border connecting message and field; a visually hidden "Error:" prefix.
5. Primer's threshold: an interactive summary for **3 or more errors**; otherwise focus and scroll to the first invalid field. Use `aria-invalid` + `aria-describedby`; **"Live regions should not be used for form validation"** — use focus management.

**Required vs optional — decide by the majority**
- GOV.UK: mark optional fields "(optional)"; "Never mark mandatory fields with asterisks"; don't use `required` (it triggers browser validation).
- USWDS: red asterisk *plus* a sentence explaining it, **and** "optional" on optional fields; one-field forms need neither.
- Primer: mark required fields (login forms excepted).
- Carbon resolves it: "If the majority of the fields are required, mark only the optional field labels with (optional). If the majority of the fields are optional, mark only the required field labels with (required)." Consumer forms → mostly required → mark optional; product configuration → mostly optional → mark required. **Adopt Carbon's rule**, with words rather than symbols where possible.

**Writing error messages** (GOV.UK, Polaris)
- Say what happened and how to fix it; use the question's own words ("How many hours do you work a week?" → "Enter how many hours you work a week").
- Banned: "forbidden", "illegal", "you forgot", "prohibited", "please", "sorry", "valid"/"invalid", "oops", error codes, and generic lines ("An error occurred", "This field is required").
- Instructions for empty fields ("Enter your first name"), descriptions for constraints ("First name must be 35 characters or less") — consistently.
- Polaris: be specific (exact numbers, dates, the merchant's own data); don't bring "we" in unless we caused it; red for must-fix-now, yellow for daily-workflow warnings.
- Track how often each error is seen (GOV.UK).

**Layout and effort**
- One column (Primer: "Don't lay out forms that flow into columns just to reduce the vertical space"; USWDS on screen magnifiers); labels above; field width hints at answer length (GOV.UK fixed-width inputs "Postcode inputs should be postcode-sized"); first required field focused on presentation (Carbon); good defaults (Carbon: current date as a required start date).
- **Start with one thing per page** for linear public services (GOV.UK question pages) — the label or legend *is* the `h1`.
- Prevent double submission (GOV.UK `data-prevent-double-click`, plus server-side idempotency) — Notify users received invitations twice.

**Saving** (Primer, EUI)
- "Never mix save patterns in a single form"; don't mix auto-save and explicit save on one page with multiple forms.
- Explicit save for declarative controls (text, checkbox groups, radios, native selects — screen reader users can't read radio options without selecting them).
- One save button per page; primary appearance if it saves everything, secondary if it saves a section; Cancel to the right of Submit in page forms (bottom-left), to the left in dialogs (bottom-right).
- Label with an active verb (+ object when unclear): "Create", "Save", "Delete", "Update" (Primer); EUI prefers "Save" and reserves "Apply" for non-persistent changes, never the success colour for Save.
- Warn on navigation with unsaved changes (`beforeunload`).

## 2.7 Error, empty and loading states

**Loading — thresholds** (Primer, consistent with NN/g)
- **< 1 s**: show nothing ("Seeing a loading indicator flash… could make the product feel slower").
- **1–3 s**: indeterminate (spinner or skeleton).
- **3–10 s**: determinate progress if at all possible.
- **> 10 s**: determinate, and treat it as a background task so the user can do something else.
- Show each item as soon as it loads; don't wait for the whole collection.
- One screen-reader announcement per cluster of skeletons, not one each; label spinners specifically ("Loading status checks").
- **Skeletons** (Carbon): only for container-based components (tiles, structured lists, tables); not for simple controls (buttons, inputs, checkboxes); never for toasts, menus, dropdown items, modals or loaders themselves; they "should only appear for only a few seconds".

**Empty states** (Carbon types)
- *No data* (first use — explain what will appear and the action that populates it), *user action* (no search results — how to adjust filters; completion confirmation), *error management* (permissions, system issue, configuration required — what went wrong and the corrective action). Body text explains the next action; one primary action (button or inline link); elements left-aligned as a block.

**Errors and degraded experiences**
- Separate pages for "There is a problem with the service", "Page not found" and "Service unavailable" (GOV.UK) — never a validation-style message for eligibility or permission problems.
- Primer's `unavailable` state is for inline degraded experiences: "A row of a data table could not be loaded", "User does not have permissions to perform an action". Degrade the part, not the page.

## 2.8 Notification hierarchy — when to use which

Consolidated from Carbon, Primer, Paste, Gestalt, GOV.UK and Atlassian:

| Surface | Use for | Persistence | Rules |
|---|---|---|---|
| **Field message / help text** | validation and contextual feedback on one control | until fixed | next to the field; same words as the summary |
| **Inline message / section message** | the result of an action in one area; "Issue #21 created" | until resolved or dismissed | place near the action (Primer: "Don't place messaging far from the user action"); Carbon: keep under two lines; Atlassian section message sits above the affected area |
| **Callout** | important information loaded with the page | not dismissible | not triggered by user or system events (Carbon) |
| **Banner (page/system)** | system state, account-wide issues, deadlines, outages | until resolved or dismissed | top of content (GOV.UK: immediately before the `h1`, same width as the content); one at a time — combine or show only the highest priority; never together with an error summary; Atlassian reserves full-width banners for critical loss of data or functionality |
| **Toast / flag** | brief, low-stakes acknowledgement of an action *that isn't otherwise visible* | auto-dismiss only if no action inside | Paste: ~500 ms per word, 2–4 s for 5–10 words, max 140 characters ≈ 30 s; Gestalt: 3–5 s; Carbon: ≤ 3 lines, stack newest on top, fixed width; toasts with actions persist until dismissed; Sonner defaults 4 s / 3 visible |
| **Modal (alert dialog)** | destructive/irreversible confirmation; issues so severe work can't continue | blocks until dismissed | Gestalt: never for task-completion acknowledgements or general information |
| **Full-page confirmation** | high-emotion or record-worthy outcomes (payment, upgrade, submission with a reference number) | page | Paste: when the user may want to copy, screenshot or save it; GOV.UK confirmation pages end linear journeys |
| **Notification centre** | asynchronous, out-of-context events | user-opened | treat as a product feature (Paste) |

Principles:
- **Default to no message when the UI already shows the result.** Primer: "Use success messaging sparingly and rely more on interaction context" — returning to the updated comment is the confirmation; Paste: no toast when a modal closes after Save.
- **Toasts are the weakest choice, not the default.** Primer deprecated its Toast ("Usage for this component is not encouraged") over accessibility issues; auto-dismissing toasts collide with WCAG 2.2.1 Timing Adjustable (WCAG issue #976), and must be announced as status messages (4.1.3) without taking focus. If a toast is used: polite live region, dismiss button, pause on hover *and* focus, no auto-dismiss when it contains an action, and the same information reachable elsewhere.
- **Match prominence to severity and emotion** (Gestalt: blocking > top-of-page > ephemeral; Paste: a celebratory full page for an upgrade, not a toast).
- **Completed is quiet** (GOV.UK task list: "Completed" in black text with no background "will draw more attention to tasks that require action"). Colour belongs to what still needs doing.
- **Never colour alone**: status = colour + icon + words (Carbon status table; GOV.UK success banners use a heading like "Success" for WCAG 1.4.1).

## 2.9 Navigation in complex apps

- **Vertical (side) navigation when there are ≥ 5 primary items or any secondary level** (PatternFly); horizontal for fewer, flat sections.
- **Two levels in the sidebar, not three**: Carbon's left panel "does not support three tiers of navigation… use tabs within the page"; PatternFly allows 3-level expandable but recommends breadcrumbs with flyouts because "the page in view may not be exposed as a selected menu item". Carbon's left panel is 256 px wide with a 4 px selected border.
- **Tabs that change the URL are navigation; tabs that swap panels are tabs — never mix them in one set** (Primer: UnderlineNav vs UnderlinePanels).
- **Parent → child always has a way back** (breadcrumbs or back link — Primer, GOV.UK "Always include a Back link" on question pages).
- **Primary–detail / split layouts** for lists of records (Primer NavList/TreeView in a split page; PatternFly primary-detail; Polaris resource index → resource detail layouts).
- **An app frame has zones** (Spectrum 2): global header, side navigation, content area, a zone for global/view actions (or a side rail), and a zone for transient contextual actions (action bar). Side nav: icon + label required at level 1; width auto-sized to the longest translated label (min 160 px); labels truncate at two lines; minimise *or* hide, never both hamburger and panel controls.
- **Don't use ARIA `menu`/`menubar` for site or app navigation** — it's for application command menus; use links with disclosure buttons (Roselli; APG is a note, not a standard).
- Mobile: PatternFly collapses the steps sidebar of wizards into a dropdown; flyouts "are not mobile friendly".

## 2.10 Tables

- **Design for the four tasks** (NN/g): find records that fit criteria, compare data, view/edit/add a single row, take action on records.
- **Structure**: title that says what the rows have in common, optional description/source (Carbon); caption with source and last-updated date (USWDS); column titles of one or two words, wrapping to two lines then truncating with a tooltip (Carbon); header alignment follows the data (Spectrum 2); **numbers right-aligned with tabular figures** (USWDS); consistent units within a column (USWDS); row actions in the last column (PatternFly), as tertiary icon buttons (Polaris); fewer columns beats more — "easier for users to read down a long list of rows than… across a long list of columns" (USWDS).
- **Sorting**: one column at a time; first click ascending, then toggle (PatternFly); only the sorted column shows its arrow, others show on hover (Carbon); a default sort that serves the primary task, e.g. most recently synced first (PatternFly); `aria-sort` + a polite live region announcing the new order (USWDS); provide raw sort values for formatted numbers and dates (USWDS); no sorting with merged cells or stacked mobile layouts.
- **Selection and bulk actions** (EUI, Carbon): with nothing selected, show "Showing {x}–{y} of {total}"; **don't show the bulk-action menu until something is selected**; then replace the count with a "{n} selected" control that opens actions; header checkbox selects the page, then offers "select all {total}" across pages, then "clear selection"; Carbon's batch-action bar replaces the toolbar and has its own cancel.
- **Pagination vs infinite scroll**: management tables paginate; EUI defaults to **25 rows**, offers **10/25/50/100** (optionally "Show all"), and **persists the user's choice**; "avoid infinite scrolling for basic management tables". NN/g: infinite scroll fits browsing homogeneous feeds, not goal-directed finding (the Back button loses position); "Load more" is the safer middle ground for product listings.
- **Row density**: Carbon 24/32/40/48/64 px; PatternFly default vs compact; Spectrum compact/regular/spacious.
- **Zebra striping is contested**: Carbon and PatternFly offer it for dense data; Spectrum 2 says it "adds visual noise without improving usability" and relies on row dividers + hover + selection. Default: dividers + hover; stripes only for very wide, many-column numeric tables.
- **Responsive**: numeric tables scroll horizontally inside a focusable container (`tabindex="0"`); directory-like tables stack each row into label–value pairs (USWDS; PatternFly stacks automatically when columns don't fit).
- **Placement**: give tables the width; don't nest tables in tables or cramped containers (Carbon).

## 2.11 Complex workflows

- **Wizards** (PatternFly): use for long tasks with a known order or where choices in one step change later steps — not for simple data entry. Numbered steps in a sidebar; visited steps are clickable; later steps disabled to keep order; one primary action in the footer (Next); Back disabled on step 1; Cancel/Close confirms data loss; "Break the workflow into small enough steps that scrolling isn't needed"; modal wizard to keep focus, in-page wizard when users must look things up elsewhere (then offer "Save as draft"); *progressive* wizards add steps as choices are made.
- **Task lists** (GOV.UK) for long, non-linear transactions: the fewest statuses that work ("Completed"/"Incomplete", then "Not yet started"/"In progress"/"Cannot start yet"/"There is a problem" only if research needs them); statuses are adjectives in sentence case; unavailable tasks are grey and unlinked.
- **Check answers** (GOV.UK) immediately before submission for small–medium transactions: summary list with "Change" links (with visually hidden context), which return the user *to the check page*, not through the rest of the flow; a submit button that names the outcome ("Send your claim form").
- **Drafts** (SAP Fiori *(secondary)*): the draft is saved automatically every **20 seconds** while editing; the explicit Save still commits the draft to the active record; on leave, offer **Save / Keep draft / Discard draft**; drafts are visible only to their author; a toggle lets users compare the saved and draft versions.
- **Unsaved changes**: warn on navigation (Primer, PatternFly); keep one edit mode active at a time on pages with separately editable parts (Primer).

## 2.12 Content design, voice and tone

- **Voice is constant, tone flexes with the user's state** (Paste): errors → straightforward, no humour; legal terms → serious; onboarding → instructive with "a dash of motivation"; first completion of a hard task → some celebration. "Never suggest or claim that the product does something it can't."
- **Action labels are verb + noun** (Polaris "Add customer", "Edit address"; Primer "Create", "Save security preferences"); icons on the left of labels; an icon alone only for universal actions (Polaris: add, edit, delete, remove, copy).
- **Consistent terms**: one word per concept across product and site (Paste "Use consistent language for features and products"; GOV.UK same error wording in summary and field).
- **Word lists**: EUI "Preferred words / Words to be avoided" per component; Paste has a product word list; GOV.UK's banned error words (§2.6).
- **Success is often silent** (Primer, Paste) — see §2.8.

## 2.13 Data-dense enterprise UI — synthesis

1. Use the productive type set: 14 px body, fixed headings, 1.125–1.2 ratio, a separate metric style, tabular numerals.
2. Offer density, don't impose it: comfortable default; compact per table or per user; never on touch.
3. One high-attention element per view; selection in neutral fills; status in colour + icon + text.
4. Tables take the width; filters and bulk actions live in a toolbar that transforms on selection; pagination with persisted page size.
5. Read-only is a first-class state (locks, permissions, processes), distinct from disabled.
6. Degrade parts, not pages; messages sit next to their cause.
7. Save patterns are explicit and never mixed; drafts for long edits.
8. Keyboard is a primary input: visible focus everywhere, no disabled-but-important controls, predictable tab order, shortcuts shown (shadcn `Kbd`, Carbon/Primer menus).

## 2.14 How the best systems document a component

| System | Page sections |
|---|---|
| GOV.UK | When to use · When not to use · How it works (variants, rules) · Research on this component (evidence, open questions) |
| Carbon | tabs *Usage / Style / Code / Accessibility*; Usage = Live demo · Overview · Variants · Formatting (anatomy, sizes, emphasis, alignment) · Content · Universal behaviours (states, interactions, loading) · per-variant best practices · Modifiers · Related · References; Accessibility = *What Carbon provides* · *Design recommendations* · *Development considerations* |
| Primer | Usage · Anatomy · Options · Best practices · **Accessibility and usability expectations** (incl. "How to test the component", "Known accessibility issues") |
| Paste | Guidelines · Examples (each variant) · **States** (loading, disabled) · Internationalization · **Composition notes** (content rules) · Do and don't |
| Orbit (template) | Example first · When to use · When not to use (link the alternative) · Component status · Content structure · Behavior (as short imperatives) · Content |
| PatternFly | Usage · Variations · Spacing · Placement · Content considerations · Accessibility |
| EUI | Types · Style · **State** · Button labels (preferred / avoided words) · Usage · Props |
| Gestalt | When to use · When not to use · ARIA attributes · Colour contrast in disabled state · State · Size · Focus style |
| Polaris | Best practices · Content guidelines · Related components · Accessibility (labelling, keyboard support) |

Common core: **when to use / when not (with the alternative)** · **anatomy** · **variants and emphasis** · **states** · **behaviour and keyboard** · **content rules** · **accessibility split into what the component gives you vs what you must do, and how to test it** · **related components** · **evidence**. The distinctive additions worth copying: GOV.UK's *Research* section (claims backed by evidence, open questions listed), Carbon's *What we provide / what you must do* split, Primer's *How to test*, Orbit's rule that guidance is written as short imperatives.

---

# 3. Proposed state matrix for the skill

Replace the current "five states" line in `ui-ux.md` (idle, loading, active/success, empty, error) with a matrix the redesign fills per component. Columns say *what changes* and *what must be true*.

| Family | State | Visual change | Semantics / behaviour | Focusable? | Contrast rule | Token (example) |
|---|---|---|---|---|---|---|
| Interaction | Rest | — | — | yes | text 4.5:1, UI 3:1 | `color.background.neutral` |
| | Hover | fill/tint shift (pointer only) | none; not applied on touch | — | keep text contrast | `…hovered` |
| | Focus-visible | 2 px+ ring, 3:1 vs unfocused; not on click | keyboard/programmatic only | yes | 3:1 (WCAG 2.4.13 AAA) | `color.border.focused` |
| | Pressed / down | darker fill or slight scale | — | — | — | `…pressed` |
| | Dragged | elevation shadow | APG drag alternative required (WCAG 2.5.7) | yes | — | `elevation.surface.overlay` |
| Selection | Selected / checked | **neutral** fill by default; accent only for a single high-attention context | `aria-selected` / `aria-checked` / `aria-pressed` | yes | 3:1 indicator | `color.background.selected` |
| | Indeterminate | dash mark | `aria-checked="mixed"` | yes | 3:1 | — |
| | Current | marker (bar, underline) | `aria-current="page"` | yes | 3:1 | `color.border.selected` |
| | Expanded / open | chevron rotation | `aria-expanded` | yes | — | — |
| Validation | Error | border + icon + message (never colour alone) | `aria-invalid`, `aria-describedby`; error summary on submit | yes | message 4.5:1 | `color.border.danger`, `color.text.danger` |
| | Warning | icon + message | `aria-describedby` | yes | 4.5:1 | `color.text.warning` |
| | Success | only when reassurance is needed (e.g. name available) | `aria-describedby` | yes | 4.5:1 | `color.text.success` |
| Availability | Disabled | reduced emphasis, `not-allowed` cursor | `disabled`; **avoid** — explain why nearby | **no** | exempt (but keep legible) | `color.text.disabled`, `opacity.disabled` |
| | Inactive (Primer) | muted | `aria-disabled` only if activation does nothing; otherwise opens an explanation | **yes** | legible | — |
| | Read-only | no hover, no interactive colour, transparent field | `readonly` / `aria-readonly`; value selectable/copyable | **yes** | **4.5:1** | — |
| | Hidden (permission) | not rendered | — | — | — | — |
| Async | Loading — container | skeleton after 1 s; determinate after 3 s | one polite announcement per cluster | — | — | `opacity.loading` |
| | Loading — action | inline spinner in the control | `aria-disabled="true"`, keep focus, live region message ("Saving profile") | **yes** | — | — |
| | Refreshing / stale | subtle indicator, content stays | — | — | — | — |
| | Empty | first-use / no-results / error-management variant | heading + next action | — | — | — |
| | Error (load) / degraded | inline "unavailable" for the part that failed | message with retry | — | — | `color.text.subtle` |

Rules that go with it:
1. A component spec is not done until every applicable row is designed **and rendered** in visual QA (the skill's Phase 6 already renders widget states — extend it to this list).
2. Name state tokens `role.emphasis.state` (Atlassian/PatternFly grammar), not "blue-600-hover".
3. Prefer inactive + explanation over disabled; never disable Save/Submit to signal invalidity.
4. Selected ≠ accent; one high-attention element per view.

# 4. Proposed component documentation template (for a redesign's `SYSTEM.md`)

For a web-app redesign the skill should produce a short system document next to `DESIGN.md`. Per component or pattern:

```md
## <Component>

<One sentence: what it is for.>

**Use when** — <short imperatives>
**Don't use when** — <case> → use <alternative>

### Anatomy
1. <part> — required/optional, content rule
2. …

### Variants and emphasis
<variant> — when; max one high-emphasis instance per view

### Sizes and density
comfortable | compact — heights, paddings, type style; touch targets ≥ 24 px (44 on touch)

### States
<the state matrix rows that apply, with tokens>

### Behaviour
Keyboard map · focus on open/close · responsive behaviour · what happens on error

### Content
Label rules (verb + noun) · max length · error/empty/success copy · preferred / avoided words

### Accessibility
Provided by <primitive library>: …
We must: labels, focus style, contrast, announcements …
How to test: keyboard path · screen reader phrase expected · zoom 200% / 400%

### Tokens
<semantic tokens this component consumes>

### Related
<components and patterns>

### Evidence and open questions
<why these choices; what we have not verified>
```

Plus four pattern pages every app redesign needs: **Forms & validation**, **Notifications** (the §2.8 table filled for this product), **Loading / empty / error**, **Tables & lists** — each stated as rules with numbers.

# 5. Rejected / avoid list

| Item | Reason |
|---|---|
| Reach UI | Unmaintained (README); last release 2022-10 |
| Vaul | Unmaintained (README); last release 2024-12; shadcn moved to Base UI Drawer |
| `@nextui-org/react` | Deprecated → `@heroui/react` |
| `@mui/base`, `@base-ui-components/react` | Deprecated → `@base-ui/react` |
| Joy UI | On hold, removed from repo |
| Polaris React | Deprecated; Polaris web components replace it |
| `radix-vue` | Renamed → Reka UI |
| `@melt-ui/svelte` | Stale since 2025-03; Bits UI is the active layer |
| Kobalte (for new work) | Pre-1.0, low activity; Ark UI Solid instead |
| Headless UI outside Tailwind Plus | Low activity; Vue package stale since 2024-09 |
| Radix Themes (new work) | One release in 12 months |
| `@tremor/react` | Stale since 2025-01; learn from Tremor blocks instead |
| Glide Data Grid (new work) | Last stable 2024-02; self-reported a11y uncertainty |
| Material Web (MWC) | Maintenance mode pending new maintainers |
| Pico CSS (production) | No commits since 2025-03 |
| Formik (new work) | Low activity; RHF/Conform/TanStack Form are maintained |
| PrimeReact ≥ 11 / PrimeVue ≥ 5 / PrimeNG ≥ 22 without a license | Commercial, license key, notices |
| EUI outside Elastic products | SSPL / Elastic License 2.0, not OSI open source |
| Atlassian Design System components outside Atlassian add-ons | License limits use to software that integrates with Atlassian products |
| Polaris look-alikes outside Shopify | Polaris license condition |
| AG Grid Enterprise / MUI X Pro/Premium unlicensed in production | Watermarks/console errors; license breach |
| Default shadcn style shipped as "the redesign" | The most recognisable generic app look; shadcn's author says so |
| Two styled systems in one app | Conflicting tokens, focus styles and density |
| ARIA `menu` roles for site/app navigation | Wrong pattern; use links + disclosure |
| Orbit-style tooltip-only field errors | Invisible until focus; poor for magnifier and SR users |
| Auto-dismissing toasts that contain actions | WCAG 2.2.1; users lose the action |

# 6. Licensing notes

- **MIT/Apache, no strings**: Base UI, Radix, React Aria, Ark/Zag, Ariakit, Headless UI, shadcn/ui, HeroUI, Mantine, Chakra, MUI core, Ant Design, Fluent UI, daisyUI, Flowbite, Reka UI, Bits UI, Nuxt UI, Vuetify, Skeleton, Konsta, Ionic, Framework7, TanStack, RHF, Conform, Sonner, cmdk, Recharts, react-day-picker, GOV.UK Frontend (MIT), Carbon (Apache-2.0), Primer (MIT), Paste (MIT), PatternFly (MIT), Orbit (MIT), Gestalt (Apache-2.0), Spectrum (Apache-2.0), SLDS CSS (BSD-3-Clause).
- **Open core / commercial tiers**: AG Grid (Community MIT, Enterprise commercial EULA; perpetual per developer per deployment with a year of updates); MUI X (MIT, Pro, Premium); Tailwind Plus incl. Catalyst and Elements (commercial; one individual per personal license; no redistribution; no builder products).
- **Relicensed in 2026**: PrimeTek's PrimeUI License from PrimeReact 11 / PrimeVue 5 / PrimeNG 22 (2026-07-15). Community tier: < $1M revenue, < 5 developers, < 10 employees, < $3M outside funding, annual renewal; commercial $599/developer launch price through 2026, $799 from 2027 *(secondary for prices)*. Earlier majors stay MIT.
- **Use-restricted**: Shopify Polaris (only for apps that integrate with Shopify; stand-alone apps must be visually distinct from Shopify); Atlassian Design System (add-ons for Atlassian products; brand assets not usable); Elastic EUI (SSPL + ELv2); Preline (MIT + Fair Use: no competing products, attribution on derivative templates).
- **Public domain with exceptions**: USWDS (fonts under OFL, icons Apache-2.0).
- **Fonts and icons travel separately**: design-system fonts (Adobe Clean, Atlassian Sans, Segoe UI) are not licensed with the code; never ship a system's typeface into a client redesign because it came with the components.
- **Registries are code from strangers**: shadcn registry items (including GitHub registries) can install files, CI workflows and agent instructions — inspect with `--dry-run/--diff/--view` and check each item's license.

# 7. Recommendations for the skill (not applied — `skills/` untouched)

1. **Audit, apps branch**: record the UI stack (primitive layer, styled kit, table/grid, forms, toasts, date picker) with version, last-release date, 12-month activity and license, using `npm view` and the repo. Flag deprecated/unmaintained items (Vaul, Reach, Joy, Polaris React, Tremor npm) and license traps (Prime ≥ 11, AG Grid Enterprise, MUI X Pro, Tailwind Plus, Polaris, ADS, EUI).
2. **Hard rule**: never switch primitive libraries inside a visual redesign; restyle what exists. Migration is a separate, user-approved project.
3. **New app work**: Base UI via shadcn by default; React Aria when a11y/i18n/dates/tables dominate; native HTML on marketing pages.
4. **Anti-pattern**: add "the default shadcn look" (Vega/new-york + one accent) as the app-world twin of the house-style check; require a chosen style *and* replaced tokens and geometry.
5. **Design theory for product UI**: add Carbon's productive vs expressive split (14 px fixed vs 16 px fluid), the 1.125–1.2 product ratio, role-named type styles (Heading/Title/Body/Detail/Component/Metric/Code), tabular figures for data.
6. **Density**: comfortable default, compact optional, implemented as component sizes; Carbon row heights and Material's 4 px steps as reference; targets never below 24 px.
7. **State matrix**: replace "five states" with §3; render every row in visual QA.
8. **Forms**: validate on submit then live; error summary (focus, title prefix, links); required/optional by majority; never disable Submit; explicit vs auto-save never mixed.
9. **Notifications**: adopt the §2.8 table; toasts last; success mostly silent.
10. **Loading**: Primer thresholds (< 1 s nothing, 1–3 s indeterminate, 3–10 s determinate, > 10 s background); skeletons only for containers.
11. **Tables**: §2.10 checklist (four tasks, sort rules, bulk-action toolbar, 25 default / 10-25-50-100 persisted, no infinite scroll for management tables, right-aligned tabular numbers, responsive scroll vs stack).
12. **A `SYSTEM.md` template** (§4) for app redesigns alongside `DESIGN.md`.
13. **Tokens**: three tiers, one naming grammar (`role.emphasis.state`), semantic spacing categories (action/control/gap/gutter/inset), DTCG-compatible source when design tools are involved.

# 8. Open questions / not verified

- Base UI and Radix publish no named screen-reader matrix; their "tested" claims could not be checked beyond their docs.
- Material 3 state-layer values: shipped tokens say 12% for focus/pressed; some M3 guidance pages have been quoted at 10%. The tokens were used here.
- SAP Fiori, Material density, SLDS 2 and Atlassian messaging rules come from search summaries of the official pages (their sites were unreachable).
- Tailwind Labs' 2026 organisational changes and Tailwind Plus pricing could not be verified this session and are omitted.
- Radix's long-term roadmap under WorkOS is not published; the maintenance assessment rests on commit data.
