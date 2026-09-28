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

**A first site has no old build.** What the customer meets today (the social profile, a competitor's template, a PDF menu) plays the old site in the other checks, but parity has nothing to crawl. Run `node scripts/parity.mjs --greenfield --after http://localhost:3000 --crawl 40 --source discovery src --out parity.md`: it checks every claim against the sources only and reports route, id, field and metadata parity as not applicable (the new site's metadata is still checked under "SEO and metadata"). Transcribe social highlights, customer messages and the owner's answers into `discovery/` first (`discovery.md` §2), or every real testimonial and price is flagged as unsourced. Checks measured against the old build (the performance baseline, accessibility counts before and after) use the stand-in's `audit.mjs` run where one was made (`discovery.md` §1); where none was, report them as not applicable and hold the new site to the `DESIGN.md` budget and the gates alone.

## Functional checks

Exercise, don't inspect: every nav link, footer link, in-page anchor and call to action, on desktop and in the open mobile menu; every form — fields, validation (on submit, then live), error summary, honeypot or captcha, success and error states, no double submission; every widget through every state (script it when a backend is unavailable); external links and `mailto:` addresses; analytics hooks, consent banners and embeds still load where they did; unsaved-changes warnings on long forms. Pages that exist only with saved state (a filled basket, a signed-in view) are exercised with it: `--storage` on every script. For a signed-in view, mint the session server-side and put its cookie in the seed; never type credentials into the page. Walk every multi-step flow (builder, booking, checkout) end to end on the phone device with `states.mjs --each`, stepping with `tap`, and look at every step's capture (`visual-qa.md` "Capturing reliably").

**What the server receives.** A front end can prove a form still posts the same keys; it cannot prove the backend accepts the new values. Where the backend runs locally, drive each writing flow through the new UI and check the stored records, not just the screen. Either way, list every change to what the server receives — a field now empty or optional, a guest order with no password, a value in a new format — first in the report; each one not proven against a running backend is a deploy blocker to test on staging.

## Accessibility

WCAG 2.2 AA is the floor. `audit.mjs` (axe-core plus measured contrast, focus and targets) on every route (the route list or `parity.mjs --crawl`) at 1440 and 390 in every theme the site has (`--themes light,dark`, plus `--theme-key` when the site stores the choice); `states.mjs --axe` with the mobile menu, dialogs, the palette and panels open, at phone width as well as desktop; `a11y.mjs` on each key template; `widgets.mjs` on every custom widget; then the manual procedure in `accessibility.md` §11 (keyboard walk, names and states, announcements, forms, zoom and reflow, text spacing, forced colours, colour vision, motion, content, cross-page consistency, a screen-reader smoke test or an explicit deferral). **Gates**: no `audit.mjs` fail (no critical or serious axe violation, no rendered monospace unless `--allow-mono` for users who read code — commitment 5 in `SKILL.md`), every moderate or minor finding fixed or justified in writing; `a11y.mjs` 0 FAIL with every WARN triaged; every widget contract passing. Report tool versions and counts before and after, and what still needs real assistive-technology testing.

Also check:

- A theme switch in the header on every page at every width, not only in the footer (`accessibility.md` §8). On a productive surface, a theme item in the header's account or settings menu counts.
- Illustrative product fragments on expressive pages are not selectable (`user-select: none`), so a drag across the hero does not select fake UI; real controls stay selectable, and so do read-only values in the product (`app-ui.md` §2).
- No viewport-wide wordmark or mark in the footer or behind the hero. This one is a brand check, not an accessibility one (`anti-patterns.md` "Composition").

## Productive surfaces

For routes that Phase 0 classified as used rather than visited, whatever the category's posture word, and for the chrome and controls of a signature experience (`framing.md` §1), in addition to the above:

- **Automated accessibility signed in**: the `audit.mjs` and `states.mjs --axe` runs above cover every route behind sign-in too (`--storage`), in every theme and with overlays open; the usual finds are in `app-ui.md` §13.
- **Keyboard walk of the top tasks** (`framing.md` §4): create, edit, filter, act, recover from an error, without a mouse. Focus always visible and never under a sticky bar (`accessibility.md` §11).
- **Contrast of the token matrix**: every text token on every surface token it sits on, hover, selected, zebra, secondary panels and dark mode included; input borders, focus ring and switch tracks at 3:1 (`contrast.mjs --css`).
- **The busiest screen at 1280 × 800** (`capture.mjs --widths 1280 --height 800`): the first rows of its main object (table, board, list or form) visible without scrolling.
- **Real data**: longest names, many rows, zero rows, errors (`states.mjs` fixtures).
- **The data checked.** For any number the redesign makes more prominent (a new column, a coloured count, a chart), query the stored records for what it counts, and report a mismatch to the data owner instead of relabelling it in the UI (`app-ui.md` §9).
- **Zoom 200 % and reflow at 320 px**: nothing lost or overlapping (`accessibility.md` §11).

## Performance

Lighthouse at phone emulation (or `perf.mjs --before` where Lighthouse cannot run), median of 3–5 runs, same version as the baseline, LCP *element* checked; the budget in `DESIGN.md` met; the redesign not slower than the audit baseline (`performance.md` §6).

## Implementation checks

Many adapted from Vercel's Web Interface Guidelines (MIT):

- No `transition: all`; animations on `transform`/`opacity`; reduced-motion guard on View Transitions (`animation-name: none` on the group); Motion wrapped in `MotionConfig reducedMotion="user"`; chart animations off or short.
- `color-scheme` and `<meta name="theme-color">` set; themed browser surfaces (`::selection`, `accent-color`, `caret-color`, `text-underline-offset`); `tabular-nums` where figures align; `text-wrap: balance` on headings.
- `scroll-margin-top` on anchors under a sticky header; `overscroll-behavior: contain` in drawers and mobile menus; `env(safe-area-inset-*)` on fixed bars; `touch-action: manipulation` on controls; hover effects inside `@media (hover: hover)`.
- Inputs with `type`, `inputmode`, `autocomplete`; ≥ 16 px on phones; paste allowed; placeholders show an example and are never the label.
- Typography: curly quotes and apostrophes, `…` not `...`, non-breaking spaces in `10&nbsp;MB` and brand names, `translate="no"` on brand names.
- `code`, `kbd`, `samp`, `pre` and any mono token set to the UI face unless the users read code (commitment 5 in `SKILL.md`).
- Single-column fallbacks written `minmax(0, 1fr)`, never `1fr` (`1fr` is `minmax(auto, 1fr)`: one nowrap child widens the track past a phone viewport, and the page's `overflow: clip` hides it from checks that read `scrollWidth`); `min-width: 0` on grid and flex children that hold nowrap text or must truncate; no `100vw` widths (the scrollbar makes them overflow).
- Buttons wrap below 380 px: a `nowrap` primary action with a long label is the usual 320 px reflow failure.
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
- Leave the repo documented: `PRODUCT.md` where one was written, `DESIGN.md`, `SYSTEM.md` for product UI, `CREDITS.md`, the `discovery/` write-ups (never `discovery/raw/`), any README changes.
- Add a row to `references/ledger.md` — faces, palette, strategy, hero form, the user's verdicts.
