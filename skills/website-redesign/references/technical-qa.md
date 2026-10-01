# Phase 8 — Technical QA, hand-off and after launch

Goal: prove the product still works, tells the truth, is accessible, fast and indexable — and hand it over in a way the user can act on.

## Project checks

Run the project's own commands and report their real output: typecheck / lint, production build (image generation, CMS fetches, embedded app bundles included), tests. Do not skip a failing test; fix it or explain exactly why it fails.

## Parity with the old site

Run the old build (main) and the new one side by side:

```bash
node scripts/parity.mjs --before http://localhost:4000 --after http://localhost:3000 --crawl 40 --source src content --out parity.md
```

- **Unsourced claims** (numbers, prices, percentages, ratings, quotes found neither on the old site nor in the sources): find the source or remove them. Values computed from data go to `--derived`.
- **Dropped claims**: each is a deliberate "Remove" in `DESIGN.md`, declared with `--removed`, or restored.
- **Routes** answer or redirect; **ids, form fields and analytics hooks** from the preserved-list are present; **metadata** is complete.

How claims are matched, and how to declare removals: `scripts/README.md` §7.

**A first site has no old build.** Run `parity.mjs --greenfield --after http://localhost:3000 --crawl 40 --source discovery src`: every claim is checked against the discovery write-ups, the owner's answers and the content. Transcribe social highlights, customer messages, PDF menus and screenshots of reviews into `discovery/` first, or every real testimonial and price is flagged. Keep claims in content or data files, never typed into components. The performance and accessibility baselines come from the stand-in when it is a page you may load (`discovery.md`, "When there is no old site"); otherwise the new site is held to the gates and budgets alone.

## Functional checks

Exercise, don't inspect: every nav link, footer link, anchor and call to action, on desktop and in the open mobile menu; every form — validation (on submit, then live), error summary, honeypot or captcha, success and error states, no double submission; every widget through every state; external links and `mailto:`; analytics hooks, consent banners and embeds still load where they did; unsaved-changes warnings. Pages that exist only with saved state are exercised with it (`--storage`). Every multi-step flow is walked end to end on the phone device with `states.mjs --each`, stepping with `tap`.

**What the server receives.** A front end can prove a form still posts the same keys; it cannot prove the backend accepts the new values. Where the backend runs locally, drive each writing flow through the new UI and check the stored records. Either way, every change to what the server receives — a field now empty or optional, a guest order with no password, a value in a new format — is a **deploy blocker** to test on staging, listed first in the report. When a pattern conflicts with a preserved contract (the order system expects `first_name` and `last_name`), the contract wins: remove fields from the interface, never from the payload, and ask. Record the submit request on both builds (`states.mjs` `"record"`, `--label before` / `--label after`) and diff with `parity.mjs --payloads`.

## Accessibility

The gates are in `accessibility.md` §12: no `audit.mjs` fail on any route or theme (including rendered monospace unless the users read code — commitment 5), no critical or serious axe violation in any open or stepped state, every moderate or minor finding fixed or justified, `a11y.mjs` 0 FAIL with every WARN triaged, every widget contract passing, the manual procedure (§11) recorded, and the Phase 1 baseline beaten. Report tool versions and counts before and after, and what still needs real assistive-technology testing. For a public-sector or EU-facing service, draft the accessibility statement from these results.

## Productive surfaces

For routes Phase 0 classified as used rather than visited, and for the chrome and controls of a signature experience, in addition:

- **Signed in**: the `audit.mjs` and `states.mjs --axe` runs on every route behind sign-in, one `--storage` seed per role (`app-ui.md` §13 lists the usual finds).
- **Keyboard walk of the top tasks**: create, edit, filter, act, recover from an error, without a mouse; focus always visible and never under a sticky bar.
- **The token matrix**: every text token on every surface token it sits on — hover, selected, zebra, secondary panels, dark mode — and input borders, focus ring and switch tracks at 3:1. White-label products: `palette.mjs --tenant-set` over every real tenant plus a pathological set (#FFFF00, #F0F0F0, #000000, #FF0000, #8A8F98, #1A3CF2, #00A86B, #FF7A00, #00D1FF, #6B21A8, #0B1F3A, #FF69B4), with the product's own grounds (`design-systems.md` §8).
- **The busiest screen at 1280 × 800**: the first rows of its main object visible without scrolling.
- **Real data**: longest names, many rows, zero rows, errors.
- **The data checked**: for any number the redesign makes more prominent, query what it counts; report a mismatch to the data owner instead of relabelling it (`app-ui.md` §9).
- **Zoom 200% and reflow at 320 px** on the busiest screens, not only the key templates.

## Performance and motion

Lighthouse at phone emulation (or `perf.mjs --before` where Lighthouse cannot run), median of 3–5 runs, same version as the baseline, LCP *element* checked; the `DESIGN.md` budget met; the redesign not slower than the audit baseline (`performance.md` §6). Every `motion.mjs --spec` row passes; flags reviewed; no `requestAnimationFrame` at rest on app pages.

## Implementation checks

Many adapted from Vercel's Web Interface Guidelines (MIT):

- No `transition: all`; animations on `transform`/`opacity`; reduced-motion guard on View Transitions (`animation-name: none` on the group); Motion wrapped in `MotionConfig reducedMotion="user"`; chart animations off or short.
- `color-scheme` and `<meta name="theme-color">`; themed browser surfaces (`::selection`, `accent-color`, `caret-color`, `text-underline-offset`); `tabular-nums` where figures align; `text-wrap: balance` on headings.
- `scroll-margin-top` on anchors under a sticky header; `overscroll-behavior: contain` in drawers and menus; `env(safe-area-inset-*)` on fixed bars; `touch-action: manipulation` on controls; hover effects inside `@media (hover: hover)`.
- Inputs with `type`, `inputmode`, `autocomplete`; ≥ 16 px on phones; paste allowed; placeholders show an example and are never the label.
- Typography: curly quotes and apostrophes, `…` not `...`, non-breaking spaces in `10&nbsp;MB` and brand names, `translate="no"` on brand names.
- `code`, `kbd`, `samp`, `pre` and any mono token set to the UI face unless the users read code.
- Single-column fallbacks written `minmax(0, 1fr)`; `min-width: 0` on grid and flex children that hold nowrap text; no `100vw` widths; buttons wrap below 380 px.
- No undefined CSS custom properties, console errors or uncaught exceptions (`audit.mjs` reports both).
- Focus rings drawn as outlines (a `box-shadow` ring disappears in forced colours); illustrative product fragments `user-select: none`, real controls and read-only values selectable.
- A theme switch, if any, in the header on every page; no viewport-wide wordmark in the footer or behind the hero.
- **Enforcement for the team that keeps it**: when the project wants lint rules for tokens (no raw hex, no off-scale lengths), ship them at warning level with a baseline, blocking only new violations after a trial on the project's own code; never another company's design-system lint plugin.

## Assets and licences

- Every third-party asset in `CREDITS.md` with source, licence class and credit text; class B assets credited visibly; no class C or D asset without a recorded decision (`resources/README.md`).
- No placeholder hosts: grep for `placehold|picsum|placeholder\.com|via\.placeholder|dummyimage|loremflickr|source\.unsplash\.com`.
- No Fontshare FFL font files committed to a public repository; OpenType features used in CSS exist in the served files (`fonts.mjs`); fonts self-hosted for EU clients.
- Icons imported by name; no third-party CDN for WASM or decoders where a CSP or privacy commitment exists; no Remix Icon glyph used as a mark; no AI-generated people presented as real.

## SEO and metadata

Unique title and description per page; canonical URLs; Open Graph and Twitter tags with a social image regenerated in the new identity; structured data still valid if it existed; sitemap and robots correct (a review build is `noindex`); favicon set and theme colour updated.

## Hand-off

- Commit on the branch with a message that explains the direction and the notable engineering decisions. Push the working branch when the remote is the project's own (a local mirror or a test fixture is not); a first push of a new repository belongs to the user. Share the preview URL if the project has previews. Do not merge or deploy to production unless asked.
- Report: deploy blockers first; what changed and why; what was verified and how; what was left out and why; what the user must decide.
- Leave the repo documented: `PRODUCT.md` where one was written, `DESIGN.md`, `SYSTEM.md` for product UI, `CREDITS.md`, the `discovery/` write-ups and `discovery/architecture.md` on a first site (never `discovery/raw/`), any README changes.
- Add a row to `references/ledger.md` — faces, palette, strategy, hero form, the user's verdicts — or, when the skill is installed read-only or shared, put the row and any lesson in the report for its maintainer.

## After launch

A redesign is a hypothesis until its success measures move. In the report, name for each success measure in the brief: where it is read (an analytics event, a funnel, support tickets, Core Web Vitals field data), its baseline, and when to read it again. Where analytics events the measures need do not exist, propose them (never free text in events or URLs). For a productive rethink, recommend a staged rollout or opt-in period, a rollback trigger stated as a number, and a reading of outcomes two to six weeks in, after change aversion has had time to settle (`framing.md` §2). When a later session returns to the project, compare the measures before proposing more change.
