# The scripts — manual

Read this when you run a script for the first time in a project, or when a finding looks wrong. `SKILL.md` says *when* each script runs; this file says how, and what its output means. Each script's header holds the complete option list.

## Contents

1. Setup and options every script shares
2. Which script answers which question
3. Capturing: `capture.mjs`, `sweep.mjs`, `stress.mjs`, `compare.mjs`
4. Measuring: `audit.mjs`
5. Accessibility: `a11y.mjs`, `widgets.mjs`
6. States, flows and walkthroughs: `states.mjs`
7. Truth and contracts: `parity.mjs`
8. Speed and motion: `perf.mjs`, `motion.mjs`
9. Files, not pages: `contrast.mjs`, `palette.mjs`, `fonts.mjs`, `model.mjs`, `libcheck.mjs`
10. When no script answers: write a probe

## 1. Setup and options every script shares

- `npm install` in this folder once. The page-loading scripts are built on Playwright (`playwright-core`, not `playwright`).
- **Browser**: every script that starts a browser takes `--chrome <path>` or reads `CHROME_PATH` (`a11y.mjs` and `widgets.mjs` read only `CHROME_PATH`). A project-local Playwright newer than the installed browser falls back to any Chromium on disk. `CAPTURE_PROXY` opts into a proxy explicitly; it is never taken from `HTTPS_PROXY`, because Playwright ignores the localhost bypass.
- **Saved state**: pages that only exist with saved state (a filled basket, a signed-in view, a dismissed banner) are audited only if the state exists. Every script that loads a page takes `--storage seed.json` (`{"localStorage": {…}, "sessionStorage": {…}, "cookies": […]}`), seeded before the page's own scripts run. Write one seed per role. For a signed-in view, mint the session server-side (a seed script, a test user, the CLI) and put its cookie in the seed; never type credentials into the page.
- **Build, not dev server**, for anything timed: a dev server reloads while it optimises dependencies, injects a toolbar and serves unminified bundles. The scripts wait out reloads and hide known dev toolbars, but performance is measured only on a production build. A report of "the page kept reloading" means a dev server.
- **Git Bash on Windows**: MSYS rewrites arguments that start with `/` (`/studio` becomes `C:/Program Files/Git/studio`). Pass `--paths pricing app/settings` without the leading slash, or set `MSYS_NO_PATHCONV=1`; the scripts warn when a path looks rewritten.
- **Behind a TLS-intercepting proxy** web fonts can fail silently and every render falls back; `audit.mjs` reports declared families that are not available.
- **Findings are leads.** A false positive is disproved with evidence (a capture, a probe, a request log) written in `DESIGN.md`, never by assertion.

## 2. Which script answers which question

| Script | Question | Phase |
| --- | --- | --- |
| `capture.mjs` | What does each page look like at each width, fold and full, with reveals finished and images decoded? | 1, 5, 6 |
| `sweep.mjs` | What breaks *between* the widths a capture looks at (320–1920 and zoom)? | 6 |
| `stress.mjs` | What do real content and real networks break? | 6 |
| `compare.mjs` | Before/after sheets, blurred squint sheets, contact sheets, pixel diffs | 2, 3, 6, 7 |
| `audit.mjs` | What is measurably wrong on a rendered page, judged by its kind of surface? | 1, 6 |
| `a11y.mjs` | What would a keyboard, zoom, forced-colours or colour-blind user hit that rule engines miss? | 1, 6 |
| `widgets.mjs` | Does each custom widget keep its keyboard contract? | 6 |
| `states.mjs` | What does each state look like; can a user do the task from what is on screen? | 1, 6, 7 |
| `parity.mjs` | What did the redesign add without a source, drop, or break? What do the forms send? | 8 |
| `perf.mjs` | How fast is each page on a throttled phone, old against new? | 1, 6 |
| `motion.mjs` | Does the approved motion exist, and does it survive reduced motion? | 5, 6 |
| `contrast.mjs` | WCAG 2 and APCA for any colours or token file | 3, 4 |
| `palette.mjs` | Logo or photo colours; role scales; tenant colours | 1, 3, 4 |
| `fonts.mjs` | What a font file can do (figures, scripts, metrics, features) | 3 |
| `model.mjs` | What a glTF/GLB costs before it ships | 5 |
| `libcheck.mjs` | Licence class, activity and size of an npm library | 4, 5 |

## 3. Capturing

### `capture.mjs`

```bash
node capture.mjs --base http://localhost:3000 --paths / /pricing /app --widths 1440,1280,1024,768,390 --out captures --label after
node capture.mjs … --element ".diagram, .timeline svg, .product-fragment"   # artwork at 3×
node capture.mjs … --variant all          # no-text, no-images, no-shadows: removal tests for the critique
node capture.mjs … --reduced-motion --label reduce ; … --dark --label dark ; … --no-js --label nojs ; … --forced-colors
node capture.mjs … --widths 1280 --height 800    # the productive fold
node capture.mjs … --dir rtl --lang ar           # an LTR build flipped right to left
```

What it does, each step from a real failure: scrolls through so observers fire and lazy images load; finishes running animations; awaits every image bitmap; grows the viewport to the document with viewport-unit elements pinned (otherwise a `100vh` hero balloons to the new viewport); writes a `-fold.png` and a full capture. It reports horizontal overflow, phone zoom-out (an overflowing child widens the layout viewport: a 900 px table made a 390 px page lay out at 924), text cut at the viewport edge where no scroll reaches it, and images that painted flat. It prints the WebGL renderer for the first page with a `<canvas>` (in a shadow root or an embedded iframe too) and flags a software one; `--gpu` (or `--headed`) uses a real GPU. On Linux, `--headed` under `xvfb-run` has a display but no GPU. A canvas created only after a click is not there at capture time: pass `--gpu` to get the line. At phone widths, safe-area insets (59/34 px) are emulated when the page sets `viewport-fit=cover` (`--insets t,b,l,r`, `--insets 0`).

- `--mode fullpage` uses Playwright's full-page capture at the real viewport instead of growing it; in some environments that leaves grey boxes. At phone widths Chromium drops touch emulation for shots beyond the viewport, so in `fullpage` mode (and on pages taller than 16,000 px) `(pointer: coarse)` and `(hover: none)` styles are lost: judge those on the fold or in grow mode.
- Motion is settled by removing the hidden start state, never by adding a "shown" class: headless advances compositor transitions unreliably.
- **Verify the verifier.** Before trusting a first batch, capture a known-good page with the same flags. Open every capture once: right route, top of the document, no blank bands. A flat-image warning means the page covers the image or the capture failed to paint it; check in a browser before "fixing" the page. Third-party iframes often paint blank because of bot challenges.

### `sweep.mjs`

Every width from 320 to 1920 (`--from`, `--to`, `--step 8,16`, or `--widths`) and the 200% and 400% zoom equivalents (`--no-zoom` skips them), one load per device class with the viewport resized in place (`--device auto|desktop|mobile`). It reports overflow, edge-cut text, zoom-out, clipped, truncated and overlapping text, measure (`--measure 20,90`), wrapping navigation and button labels, squeezed targets, distorted, cropped or upscaled images, dead bands, the h1 or primary action (`--cta sel`) dropping below the fold, bars covering the screen, visual order against DOM order, and breakpoints, merged into width ranges with a contact sheet of the worst widths and 1:1 crops. Exits 1 on any ✗ range. On held-out pages about 85% of its findings were worth fixing; open the crop before fixing.

### `stress.mjs`

By default eight mutations that need no page knowledge: pseudo-localisation, huge and negative figures, blocked images, a right-to-left flip with Arabic text, empty lists, and a slow, failing or dropped network. Four more aim at data and run only when pointed at it: long unbroken tokens, empty optional fields, one item, 500 items (`--targets ".product-name, td"`, `--list ".results"`, or `--all`). It reports only what each mutation changed against the unmutated page, with a contact sheet and crops. About three in four default findings were worth fixing on held-out pages; unaimed data mutations mostly report what cannot happen (list-0 on authored cards is a dismissal: write it down). `--only rtl` on an RTL page checks physical `text-align: left` as it stands, then flips to LTR to find what stays put; when the page loads an RTL-only stylesheet, run it on the LTR page instead.

### `compare.mjs`

```bash
node compare.mjs --dir captures                                   # pairs *-before* with *-after*
node compare.mjs --before captures/old --after captures/new --out cmp
node compare.mjs --grid new.png old.png references/ledger/*.jpg --labels New Old --blur 6   # the squint and ledger test
node compare.mjs --grid raw/{000..023}.jpg --labels {000..023} --cols 6 --out raw/contact-000.png
node compare.mjs --before a.png --after b.png --diff cmp/diff.png
```

`--labels` pair with files by position (a shell glob sorts by name); fewer labels than files is fine, `-` keeps one default caption. A label that names another file of the same folder better than its own stops the run and, when the order is clear, prints the order meant (`--labels-as-given` draws them as typed). A grid is one row unless `--cols N`. Keep contact sheets to about 24 images so each fits a screen.

Diffs are for regressions while iterating, never for judging a redesign: compare the same page at the same width from the same browser build, stabilised, and read every changed region at 1:1. No percentage threshold separates a 1 px shift from rendering noise; holding the build constant does. pixelmatch reports 0% for hairline, shadow and tint changes, so flick between two captures at 2× for surface changes.

## 4. Measuring: `audit.mjs`

```bash
node audit.mjs --base http://localhost:3000 --paths / /pricing --widths 1440,390 --kind marketing --out audit/before
node audit.mjs --base http://localhost:3000 --paths /app /app/settings --themes light,dark --kind app --out audit/before-app
```

- `--kind`: `marketing` (default), `app`, `field`, `commerce`, `content`, `docs` or `service`, or a category name (dashboard, fintech…). A signature route runs `app` for its chrome and controls; `signature`, `configurator`, `builder`, `studio` and `visualiser` are aliases.
- `--themes light,dark` (or `no-preference`) runs every path × width × theme; `--theme-key` for a stored choice. On a productive surface, run every route (from the router, the pages directory or the sitemap).
- **What it checks**: overflow and phone zoom-out, text cut at the viewport edge, contrast on the painted ground, invisible focus, targets, fake controls, clipped content and glyphs cut by their box (measured by ink, for every script), colour-only status, headings and landmarks, images, content hidden without JavaScript or under reduced motion, console errors and undefined custom properties, the type, spacing and radius inventory (text under 12 px; 11 px only for one uppercase word), fonts that never loaded, saturated faces carrying the page, LCP/CLS from an unthrottled load (a smoke test, not a performance number), axe-core, numbers and scripts, an RTL block, a phone block, finish (widows, left edges 1–4 px apart, concentric radii, dead bands), and generic-look signals (◆, each pointing at `anti-patterns.md`).
- **Monospace**: it fails any page that renders monospace text (input values and `code`/`kbd` defaults included) unless `--allow-mono` (implied by `--kind docs`): commitment 5 in `SKILL.md`.
- **Axe**: WCAG 2.0–2.2 A/AA plus best practice and two experimental rules (`td-has-header`, `label-content-name-mismatch`). Critical and serious violations are fails, the rest warnings, rolled up by rule in `audit.md` (`## axe across pages`); each view's JSON keeps every node. `--no-axe` skips it. Motion is settled before scanning: a scan mid-fade reports false contrast failures.
- **Overflow semantics**: a page that clips itself (`overflow-x: hidden|clip` on html and body, or on a section) stops a fault reaching `scrollWidth`. In Chromium a clip on `html`, or on `body` while `html`'s overflow is visible, applies to the viewport: `scrollWidth` still grows and phones still zoom out, so the line reads "Horizontal overflow", naming the widening element. When `html`'s overflow is not visible (`html, body { overflow-x: hidden }`, or `html { overflow-y: scroll }` with `body { overflow-x: hidden }`), `body` clips its own box and the line reads "Text past the viewport". A clipping section reads "Text cut off by an overflow:hidden/clip container". Text the page scrolls to, or a single-line ellipsis whose box fits, is not a fault.
- **Concentric radii**: a rounded element whose radius at a corner is more than 4 px above the outer radius minus the gap, against its nearest painted rounded ancestor, on all four corners, only where the gap is at most the outer radius; discs and pills are skipped. Nestings further in appear only in the JSON (`radiusFarIn`).
- **Numbers and scripts** (`multilingual.md` §2a): two digit systems in one row, `type=number` on RTL pages, numeric columns judged by where their digits paint row against row (when all values paint at one width, it narrows one and sees which edge holds; right edges that hold pass whatever `text-align` says), decimals, other-script strings, greetings in several languages.
- **RTL block** (lines `RTL [check]`, on any right-to-left page or one holding Arabic): fails `text-align: left` in RTL text, tracking or italics on Arabic, LTR data out of order within a line (a sign, currency, time range, phone number), scrambled LTR-data fields, a start drawer parked off the left, an arrow pointing against its label, and a never-mirror icon that is flipped (check, media, clock, search; `rotate` and `scale` count); warns on directional icons with no flip, email/phone/IBAN fields laid out RTL, English phrases whose end punctuation moves, x-moving keyframes and glyphs from a system fallback font. It does not press arrow keys: `widgets.mjs` does.
- **Phone block** (lines `Phone [check]`, at phone widths): content revealed only by `:hover` fails (only rules whose media query matches the phone width, and only when they hide text, a control or an informative image); `type=number` for a code, phone or card number fails; the wrong keyboard, a missing `autocomplete` or a field under 16 px warns; no `:active` state under a transparent tap highlight warns; controls in fixed bars under the emulated insets fail only with `viewport-fit=cover`; fixed bars over a focused field with a 336 px keyboard are checked only with `interactive-widget=resizes-content`; a primary action pinned in the top third warns.
- Exits 1 when any page has a fail or could not be audited (2 on a bad `--kind`, theme or `--theme-key`).

## 5. Accessibility

### `a11y.mjs`

```bash
node a11y.mjs http://localhost:3000/app --out a11y/app     # per key template
```

What rule engines miss, with evidence: names from Chromium's accessibility tree (placeholder-only and title-only names, label-in-name, filename alts), the heading and landmark outline, a keyboard walk with pixel-diff focus detection (invisible and weak rings, focus hidden under sticky UI on the reverse walk, traps, unreachable controls), pointer-only controls, targets, form-control boundary contrast, `autocomplete` and paste blocking, reflow at 320 and 640, text spacing, forced colours, colour-vision renders and motion. Output: FAIL / WARN / INFO lines with the criterion and element, `audit.json`, and PNGs to look at (`reflow-320.png`, `text-spacing.png`, `forced-colors.png`, `vision-*.png`).

- It audits only what is rendered: wizard steps other than the current one (`hidden`), a closed drawer, a closed `<details>`, a `content-visibility: hidden` panel are skipped. Run it once per step or state (the step's URL hash, `--storage`) and scan the rest with `states.mjs --axe`. Content that blinks counts as rendered.
- Autocomplete: no token is suggested for file inputs, or for a `<select>` other than a country, town or birth date; in `address[city]` or `address-postcode` the part after "address" names the field.
- The 2.4.13 focus-area estimate is taken with the element scrolled clear of the viewport edges.
- **Canvas**: a clickable canvas that takes no focus is a FAIL unless a Tab stop over it stands in for it (a key on it changes the canvas's own pixels, or it paints nothing until focused, or lets the pointer through): then a WARN that names them, to check against `accessibility.md` §9b. A painted control that changes nothing drawn (a Sound toggle) is not a stand-in. It presses Enter, arrows or Space on those controls only, with navigations and non-GET requests blocked, and proves one key path, not the tasks.

### `widgets.mjs`

```bash
node widgets.mjs http://localhost:3000/app a11y/app.contracts.json   # per custom widget
```

Contracts, written from the component inventory:

```json
[
  { "type": "dialog", "trigger": "#invite-open" },
  { "type": "tabs", "tablist": "[role=tablist]" },
  { "type": "disclosure", "button": "#filters-toggle" },
  { "type": "live", "trigger": "#export" },
  { "type": "form-errors", "form": "#settings", "submit": "button[type=submit]" },
  { "type": "menu-button", "button": "#account" },
  { "type": "roving", "group": "[role=toolbar]" },
  { "type": "slider", "slider": "#price" },
  { "type": "palette", "trigger": "#search-open", "keys": ["Control+k"] },
  { "type": "sortable", "list": "#stages" },
  { "type": "splitter", "separator": "[role=separator]" }
]
```

- `"before"` steps (`fill`, `select`, `click`, `tap`, `check`, `focus`, `press`, `wait`) set up a state first; a failing step fails the contract. `"keys"` sets the activating keys (default `["Enter"]`; a radio or checkbox `["Space"]`, a `<select>` `["ArrowDown"]`; Enter in a radio or checkbox submits the form, so that contract is reported as not tested). A palette takes `"query"` and `"none"`; a sortable `"handle"` and `"items"` (without a handle only a control marked or named as one is pressed). A tabs contract may name a wrapper.
- **What each checks**: dialog (focus in, trap, Esc, return); tabs (roving tabindex, arrows, selection); disclosure (`aria-expanded`); live (the message reaches a region that existed before, or focus moves to the message itself — an error summary or the first invalid field — and what is spoken on that focus carries it; focus moved to a toast fails, `accessibility.md` §7.4); form-errors (summary focused and linked, `aria-invalid`, `aria-describedby`); menu-button; roving (one Tab stop; arrows move and come back; a radio is checked as focus moves); slider (name, value, direction, Home/End); palette (a named modal dialog, focus in its search, results and "no results" announced, Escape returns focus; results are never run); sortable (a named handle with instructions; pick up, move, drop, cancel; announcements name items, not ids); splitter (a focusable named `role="separator"` with `aria-valuenow` and a matching orientation).
- **Direction**: arrow keys follow the visual arrow (`accessibility.md` §3). In right-to-left, ArrowLeft must reach the next item; DOM-order arrows fail as "the arrow keys run backwards". Orientation is `aria-orientation`, else the role's default.

## 6. States, flows and walkthroughs: `states.mjs`

```bash
node states.mjs states.json --base http://localhost:3000 --out captures/states --label after
node states.mjs states.json --axe              # axe on each state's final screen, overlays open
node states.mjs walk.json --aria --each --out captures/walk/new   # a task walkthrough
```

One JSON of states, each a route to mock (delay, fail, 500, a fixture of 0 or 200 items), a storage seed, a device and a few steps (`click`, `tap`, `swipe`, `fill`, `press`, `hover`). Write it in Phase 1 against the old build and run the same file on the new one. When the flow itself is rethought (one long form becomes steps), keep one file per build with the same state names, so before/after pairs still line up.

- It records console errors per state, flags a scenario or step that changed nothing (a wrong selector, a route pattern that never matched), and flags states that render identically to each other (loading, error and offline looking the same). A failing step says why its target refused (not rendered, inside a closed `<details>`, inert, disabled, covered — by what —, cut off by an overflow or a clip-path, a select without that option) and leaves a `-failed.png`. Clicks fall back to the element's own `click()` when a sticky bar intercepts; step flows with `tap`, which reports what a finger actually hit.
- `--axe` scans each state's final screen (menus, dialogs, palettes, drawers open). A critical or serious violation fails the state, and so does settling that closed what the steps opened (a menu that closes on scroll): set `"axe": "no-scroll"` or `false` on that state. To scan a sheet mid-flow, add a state that stops there. Each writes `<state>-<device>[-<label>].axe.json`.
- `"record"` on a route or state keeps each request whole (size and SHA-256 included) under `requests/<label>/`, one folder per `--label`, for `parity.mjs --payloads`.
- `--aria --each`: a capture per step with a tap ring, and the accessibility tree marked with what a sighted user cannot read on that screen: ⟨below⟩, ⟨cut off by …⟩, ⟨in a sideways scroller⟩, ⟨covered by …⟩, ⟨transparent⟩, ⟨inert⟩, ⟨aria-hidden⟩. It reports dead taps ("changed nothing on screen") and what each tap hit and its size. The protocol is in `visual-qa.md`, "Task walkthroughs".
- Also `--only a,b`, `--gpu` / `--headed` as in `capture.mjs`.

## 7. Truth and contracts: `parity.mjs`

```bash
node parity.mjs --before http://localhost:4000 --after http://localhost:3000 --crawl 40 --source src content --out parity.md
node parity.mjs --greenfield --after http://localhost:3000 --crawl 40 --source discovery src --out parity.md
node parity.mjs --payloads captures/states/requests/before captures/states/requests/after
```

- **Unsourced claims**: numbers, prices, percentages, ratings and quotes on the new site found neither on the old site nor in `--source`. A claim counts as on the old site only within one block of text, or as the same value with its own unit attached ("£45" sources "£45.00"; "Zone 70" and "Minutes…" in two list items do not source "70 minutes"). Eastern Arabic digits are normalised. Values computed from data go to `--derived` (one pattern per argument).
- **Dropped claims** are restored or declared with `--removed` (one pattern per argument: a pattern with a digit matches a claim, three or more words a quotation, an id, field or route exactly, `/regex/i` a regex). A value still on the page counts as "same value, new format" only when it is surely the same figure: four or more significant digits and not a year, or its own unit or currency attached.
- **Routes, ids, form fields, form submissions, `data-*` analytics hooks, metadata**: every old route answers or redirects; every preserved hook is present.
- **`--greenfield`**: claims checked against `--source` only (folders and text files; transcribe PDFs and screenshots into `.md` first); route, id, field and metadata parity are reported as not applicable.
- **`--payloads`** diffs what each build's forms send: keys removed or added, value types and values, key order, and a changed method, path, query or Content-Type. Values that change on every submission (CSRF tokens, nonces, idempotency keys, captcha responses) are compared for presence and type; add others with `--ignore <key>`. It never compares a recording with itself.

## 8. Speed and motion

### `perf.mjs`

```bash
node perf.mjs --base http://localhost:3000 --before http://localhost:4000 --paths / /pricing
```

Lighthouse's mobile profile (4× CPU, slow 4G, cache off), median of runs: LCP and its element, FCP, CLS, TBT (the lab stand-in for INP), transfer by type, requests and DOM size, old against new. It needs nothing beyond this folder's Playwright, so it runs where `npx lighthouse` cannot; its numbers track Lighthouse's closely enough to rank builds. It names every request that failed on either build. A lost font, render-blocking stylesheet, parser-blocking script or first-viewport image makes a page flatteringly fast; a regression is excused only by one of those (or an error page) on the old build, never by its failed analytics. It asks what transfer growth over 50 KB buys (gzip-equivalent), says when only one server compresses text, and prints the machine's load average, which makes timings relative. Measures the main thread only: CDP throttling does not slow workers, the compositor or the GPU.

### `motion.mjs`

```bash
node motion.mjs http://localhost:3000/ --spec DESIGN.md --jpeg     # the gate: every spec row passes
node motion.mjs http://localhost:3000/                             # an audit of what moves
```

With `--spec` (a fenced `motion-spec` block in `DESIGN.md`, a table with id, trigger and target columns, or a JSON file: the format is in `motion.md` §2), each entry is triggered for real and sampled every frame, normally and under reduced motion: whether it animated, its duration and easing against the tokens, the properties that moved, the stagger, interruption, and whether reduced motion stopped, substituted or left it moving. Filmstrips per entry (`--filmstrip`, `--times`). Without a spec it flags `transition: all`, animated layout properties, durations off the tokens, linear easing on movement, `scale(0)` entrances, hover and focus that change nothing, buttons without press feedback, infinite animations, reduced-motion handling and `requestAnimationFrame` firing at rest. Audit flags are advisory (held-out precision 0.77): never use `--strict` as a gate. A failure that says frames were dropped is re-run on a quiet machine before anyone acts on it. Canvas, WebGL, Lottie and Rive frames are invisible to it. `--device phone` skips hover.

## 9. Files, not pages

These read files and load none of your pages; neither does `parity.mjs --payloads`.

- **`contrast.mjs`**: WCAG 2 ratio and APCA Lc for any CSS colours, or a token file (`--css`). With `--css` it keeps the first value it finds for each token, so it checks one theme per run: pass the dark values as literals or in a file that defines them first.
- **`palette.mjs`**: `--from logo.svg|photo.png` samples a mark or a photo set (PNG; convert JPEG first). `--brand <colour>` builds 12-step OKLCH role scales, light and dark, with a tinted neutral scale; step 9 is the brand colour; text steps solved for Lc 60 and 4.5:1 against steps 2 and 3, and Lc 90 and 7:1; step 9's label is whichever of white or #111 passes WCAG, APCA breaking a tie. `--tenant '#RRGGBB' [--dark] --ground <page> <surface>` checks one white-label colour; `--tenant-set tenants.txt` checks a set and exits 1 on a WCAG failure (APCA only warns). Run a tenant accent that sits on a coloured band with that band as its own `--ground`.
- **`fonts.mjs`**: axes, OpenType features, tabular figures per digit system, script and Arabic coverage, the riyal sign, x-height, the line box per platform and clip floors per content class; `--google "Family"` reads the file Google actually serves; `--fallback arial:700` prints a metric-matched fallback `@font-face`.
- **`model.mjs`**: bytes (and gzip), triangles as drawn, draw calls, materials, texture sizes and estimated GPU memory, animations, compression; flags each line over the `--tier` budget (`mobile`, `desktop`, `scene`; override with `--max-*`) with the gltf-transform command that fixes it; `--interactive` for a model whose parts the code addresses by name; `--fail` for the build.
- **`libcheck.mjs`**: licence class A–D (restrictive sentences quoted; the shipped LICENSE over the package field), releases, activity, adoption, `--size`. Triage for a human, never a gate; exits 1 only when a package could not be checked. Several versions in one run show a licence change.

## 10. When no script answers: write a probe

A few lines saved under `qa/` with their output beside them. It is the evidence a disproved false positive needs.

```js
import { launch, open, settle } from '<skill>/scripts/lib/env.mjs'; // launch() returns { browser, chromium }
const { browser } = await launch(); const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await open(page, 'http://localhost:3000/apply/'); await settle(page);
console.log(await page.evaluate(() => [...document.querySelectorAll('select')].map((e) => [e.name, e.checkVisibility()])));
await browser.close();
```

`settle()` makes lazy images eager, scrolls through and back, finishes `document.getAnimations()` and decodes images; `freezeMotion()` also zeroes CSS timing before a scan. A hand-run axe or screenshot needs the same, or it reports contrast failures on text that is mid-fade. `@axe-core/playwright` needs a page from `browser.newContext()`, not `browser.newPage()`.
