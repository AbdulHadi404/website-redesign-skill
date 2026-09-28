# Phase 8 — Technical QA and hand-off

Goal: prove the product still works, tells the truth, is accessible, fast and indexable — and hand it over in a way the user can act on.

## Project checks

Run the project's own commands and report their real output: typecheck / lint, production build (including image generation, CMS fetches, embedded app bundles), tests. Do not skip a failing test; fix it or explain exactly why it fails.

## Parity with the old site

Run the old build (main) and the new one side by side:

```bash
node scripts/parity.mjs --before http://localhost:4000 --after http://localhost:3000 --crawl 40 --source src content --out parity.md
```

- **Unsourced claims** (numbers, prices, percentages, ratings, quotes on the new site found neither on the old site nor in the sources): find the source or remove them.
- **Dropped claims**: each is a deliberate "Remove" in `DESIGN.md`, or restored.
- **Routes**: every old route answers, or redirects.
- **Ids and form fields**: anchors, script and analytics hooks and field names from the audit's preserved-list are all still present.
- **Metadata**: title, description, canonical, Open Graph image, one h1 per page.

## Functional checks

Exercise, don't inspect: every nav link, footer link, in-page anchor and call to action, on desktop and in the open mobile menu; every form — fields, validation (on submit, then live), error summary, honeypot or captcha, success and error states, no double submission; every widget through every state (script it when a backend is unavailable); external links and `mailto:` addresses; analytics hooks, consent banners and embeds still load where they did; unsaved-changes warnings on long forms. Pages that exist only with saved state (a filled basket, a signed-in view) are exercised with it: `--storage` on every script.

**What the server receives.** A front end can prove a form still posts the same keys; it cannot prove the backend accepts the new values. List every change to what the server receives — a field now empty or optional, a guest order with no password, a value in a new format — as a deploy blocker to test on staging, first in the report.

## Accessibility

WCAG 2.2 AA is the floor. `audit.mjs` (axe-core plus measured contrast, focus and targets) at 1440 and 390; `a11y.mjs` on each key template; `widgets.mjs` on every custom widget; then the manual procedure in `accessibility.md` §11 (keyboard walk, names and states, announcements, forms, zoom and reflow, text spacing, forced colours, colour vision, motion, content, cross-page consistency, a screen-reader smoke test or an explicit deferral). **Gates**: axe 0 violations; `a11y.mjs` 0 FAIL with every WARN triaged; every widget contract passing. Report tool versions and counts before and after, and what still needs real assistive-technology testing.

## Performance

Lighthouse at phone emulation (or `perf.mjs --before` where Lighthouse cannot run), median of 3–5 runs, same version as the baseline, LCP *element* checked; the budget in `DESIGN.md` met; the redesign not slower than the audit baseline (`performance.md` §6).

## Implementation checks

Many adapted from Vercel's Web Interface Guidelines (MIT):

- No `transition: all`; animations on `transform`/`opacity`; reduced-motion guard on View Transitions (`animation-name: none` on the group); Motion wrapped in `MotionConfig reducedMotion="user"`; chart animations off or short.
- `color-scheme` and `<meta name="theme-color">` set; themed browser surfaces (`::selection`, `accent-color`, `caret-color`, `text-underline-offset`); `tabular-nums` where figures align; `text-wrap: balance` on headings.
- `scroll-margin-top` on anchors under a sticky header; `overscroll-behavior: contain` in drawers and mobile menus; `env(safe-area-inset-*)` on fixed bars; `touch-action: manipulation` on controls; hover effects inside `@media (hover: hover)`.
- Inputs with `type`, `inputmode`, `autocomplete`; ≥ 16 px on phones; paste allowed; placeholders show an example and are never the label.
- Typography: curly quotes and apostrophes, `…` not `...`, non-breaking spaces in `10&nbsp;MB` and brand names, `translate="no"` on brand names.
- `min-width: 0` on flex children that must truncate; no `100vw` widths (the scrollbar makes them overflow).
- No undefined CSS custom properties, no console errors or uncaught exceptions (`audit.mjs` reports both).
- Forced-colours render (`capture.mjs` with a forced-colours context, or DevTools rendering emulation): focus rings drawn with `box-shadow` alone disappear — add a transparent outline.

## Assets and licences

- Every third-party asset in `CREDITS.md` with source, licence class and credit text; class B assets credited visibly; no class C or D assets without a recorded decision (`resources/README.md`).
- No placeholder hosts: grep for `placehold|picsum|placeholder\.com|via\.placeholder|dummyimage|loremflickr|source\.unsplash\.com`.
- No Fontshare FFL font files committed to a public repository; OpenType features used in CSS exist in the served files (`fonts.mjs`); fonts self-hosted for EU clients.
- Material Symbols requested with `&icon_names=`; icons imported by name; no third-party CDN for WASM or decoders where a CSP or privacy commitment exists.
- No Remix Icon glyph used as a mark; no AI-generated people presented as real.

## SEO and metadata

Unique title and description per page; canonical URLs; Open Graph and Twitter tags with a social image regenerated in the new identity; structured data still valid if it existed; sitemap and robots correct (a review build is `noindex`); favicon set and theme colour updated.

## Hand-off

- Commit on the branch with a message that explains the direction and the notable engineering decisions. Push. Share the preview URL if the project has previews. Do not merge or deploy to production unless asked.
- Report: what changed and why; what was verified and how (widths rendered, scripts run and their results, flows exercised, commands passed); what was left out and why; what the user must decide.
- Leave the repo documented: `DESIGN.md`, `SYSTEM.md` for product UI, `CREDITS.md`, any README changes.
- Add a row to `references/ledger.md` — faces, palette, strategy, hero form, the user's verdicts.
