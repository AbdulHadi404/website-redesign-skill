<!-- Stream S12, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S12-systems-and-references/. The skeptical review is in S12-systems-and-references.review.json. -->

# S12: Product types and systems the skill lacks, reference boards for ambitious work, and catching failure after launch

## What the skill already knew

- **Tokens:** strong. It has three tiers, one naming grammar and named state tokens (`design-systems.md` §2).
- **Colour:** `palette.mjs` solves text steps 11/12 for both WCAG and APCA. It picks the label on step 9 by APCA alone and only warns when that label fails. `contrast.mjs` checks one theme per run. Token discipline is enforced only by `audit.mjs` counting distinct values.
- **Contrast policy:** `accessibility.md` makes WCAG 2 the gate and APCA "a design aid … never the gate". `design-theory.md` B6 gives APCA levels by size: Lc 75 for body text, and Lc 60 only at ≥ 24px/400 or ≥ 16px/700.
- **Product types:** `categories.md` has a field/frontline profile (48/56 px targets, glare, freshness honesty). It has nothing on white-label products, POS or kiosks.
- **References:** `research.md` chooses 4–8 references by problem and rejects moodboards. `inspiration.md` lists galleries for app UI and marketing only.
- **After launch:** Phase 8 ends at hand-off. There is no rollout, instrumentation or rollback plan.

Everything below is new. It also reports two measured defects in `palette.mjs` itself.

## Findings

### 1. White-label and multi-tenant products

**What open-source systems let a tenant change: one colour, plus enums.**
- Radix Themes' theme props are all enums: 26 accent scales, `radius` none/small/medium/large/full, `scaling` 90–110%, panel solid/translucent. [V] `radix-ui/themes` `theme.props.tsx`, `props/radius.prop.ts`
- Atlassian's custom theme takes exactly one `brandColor`. Its public entry points (`setGlobalTheme`, `getThemeStyles`, `getThemeHtmlAttrs`, `UNSAFE_loadCustomThemeStyles`) accept only an opaque 6-digit hex through `isValidBrandHex` and skip the custom theme otherwise. `getCustomThemeStyles` itself does not validate. [V] `@atlaskit/tokens` 20.1.0 dist
- Cal.com takes a light and a separate dark brand colour. [V] `packages/lib/getBrandColours.tsx`

**Atlassian (Jira/Confluence custom themes)** [V] `get-custom-theme-styles.js`, `generate-token-map.js`, `custom-theme-token-contrast-check.js`
- It builds a 10-step HCT ramp and keeps the exact hex as the bold fill only when it reaches ≥ 4.5:1 against white.
- A second pass darkens `text.brand`, `link`, `text.selected` and `border.brand` until they reach 4.5:1 (text) or 3:1 (borders).
- The focus ring is not themed (#4688EC light, #8FB8F6 dark).
- Style tags are capped at 10.
- **Measured on 1,500 random colours × 2 modes [L] `random`:**
  - It reached every gate in 99.9% of tenant-modes. The 3 failures were a white label on mid greens at 3.93–3.97:1, in light mode.
  - It moved the fill in 58.5% of tenant-modes (median ΔE 19.6 among the moved fills).

**Material 3** [V] `color_spec_2021.ts`; [L]
- `primary` is always tone 40 (light) or 80 (dark), with contrast curves 4.5:1 and 7:1.
- It re-tones every tenant: 100% moved, median ΔE 20.2 on random colours.
- It invents a hue for achromatic brands: #000000 becomes rose, #F0F0F0 becomes teal.
- Version 0.4.0 does not import in Node ESM without a resolve hook.

**Radix custom palette generator** [V] `radix-ui/website` `generate-radix-colors.tsx`; [L]
- It keeps the hex as step 9 unless ΔE < 25 against the background.
- The label is white unless |APCA| < 40.
- It needs colorjs.io 0.5.2.

**Cal.com's `getWCAGContrastColor` is not WCAG.** It uses gamma-encoded luma < 0.5, which puts white on #FF0000 at 4.0:1. [V]; [L]

**The skill's own `palette.mjs --brand --dark` fails as a tenant generator** [L] `M7-palette-mjs`, run unmodified as a child process, with roles mapped as the script advises:
- All gates pass in only **3/24** tenant-modes; text pairs 65.8%.
- **Defect 1: the label on step 9 is chosen by APCA alone.** It picks white on #FF7A00 at 2.61:1, on #FF69B4 at 2.65:1 and on jade at 3.08:1, where #111 gives about 7–8:1. T1 fails in 14/24. The script's advice ("use step 9 for large text") also fails 3:1 there.
- **Defect 2: step 11 is solved to exactly 4.5:1 on step 2.** On step 3 (the Radix soft-badge and selected-row ground) it gives 4.11–4.19:1 in **12/12** light tenants.
- The dark-mode lift of step 9 (black → #868686, navy → #7288A6) keeps a white label at 3.0–3.6:1.
- **The one-line label fix, simulated (M7f):** 3/24 → 9/24 all-gates, text 65.8% → 87.5%. On a 100-colour random subsample, all-gates 12% → 35.5%. The remaining failures are step 11 on step 3, and non-text on fills lighter than 3:1.

**General label fact:** for any opaque sRGB colour, the better of black or white is ≥ 4.58:1 WCAG. But 11.3% of the cube cannot reach APCA Lc 60 with either label, and 46% cannot reach Lc 75 (worst case Lc 55 at #08B78F). [L] `labelSweep`, 35,937 colours
- So a WCAG-first label never needs the fill to move, except near the page ground.
- An APCA gate on a body-size label is unreachable for about half of all colours without moving the brand.

**Where tenants fail:**
- **Pairs that are not the button:** links, selected rows, the focus ring and checked indicators. Naive setups fail 9–13 of 24 tenant-modes on each of these.
- **Labels picked once instead of per state:** a label chosen for the base colour fails on hover.
- **Radix's accent-8 focus ring** fails 3:1 in 13/24. [L]; [V] `outline: 2px solid var(--focus-8)`

**Untrusted input.** colorjs.io's `contrast()` ignores alpha. The first-round helpers therefore measured `#0000FF80` as opaque blue with a white label at 8.59:1, although it paints #7F7FFF on white at 3.29:1. `transparent` was reported at 21:1 and paints at 1:1. [L] `inputProbe`

**Tailwind v4 delivery** [L] `tailwindTenant`, tailwindcss 4.3.3 in Chromium:
- `@theme { --color-accent: var(--tenant-accent) }` compiles to `var(--color-accent)`, which resolves once at `:root`. `[data-tenant]` subtrees for red and jade both painted the root blue.
- It works only when `data-tenant` is on `<html>`.
- `@theme inline` compiles to `var(--tenant-accent)` and paints each subtree correctly, including `bg-accent/50`.

**axe blind spot.** axe-core 4.13 files text at about 1.01:1 under *incomplete*, not violations (axe applies this below 1.01, [V] per review). Agreement with the computed pairs was 99.8% of 1,560 checks. All 3 disagreements were an invisible yellow link. [L] `axeCheck`

**Status collisions.** Pure red and orange share a hue with danger (orange also with warning), and jade with success (≤ 30° apart). [L]

### 2. POS, counter and kiosk: what really differs from the field profile

**A real open-source POS screen set** (Odoo `point_of_sale/static/src/app`): product, payment, receipt, tip, scale, cashier login, screensaver and a customer display. [V]
- Odoo patches out the generic offline plugin so it can keep selling offline. It queues orders and shows a persistent offline icon. [V] `offline_plugin.js`, `pos_store.js`, `navbar.xml`
- Product tiles without images have a min-height of 6rem (5rem on large screens). [V] `product_card.scss`

**Offline card payments are a business rule, not only a UI state.**
- Square: upload within 72 h; the merchant is liable for declines. [S] squareup.com help 7777
- Stripe Terminal: $10,000 per-transaction cap offline. [S] docs.stripe.com/terminal
- So the UI never says "Paid" for an unconfirmed offline card. [K]

**Cashier grids and tips**
- Cashier grids have a fixed layout and short labels. [S] shopify.dev "smart grid"
- Higher default tip percentages lowered satisfaction, and a hidden "no tip" option is a dark pattern. [S] ResearchGate; uxdesign.cc

**Kiosk law**
- The EAA covers self-service terminals from 28 June 2025; terminals already in use may run to end of life, at most 20 years. [S] EUR-Lex summary
- EN 301 549 5.1.3: closed functionality needs a non-visual mode, audio output and interruptible speech. [S] ETSI v3.2.1
- EN 301 549 8.3.2: operable parts between 380 and 1,220 mm. [S] accessible.canada.ca
- ADA 707 (ATMs and fare machines). [S]
- The US Access Board's kiosk NPRM was withdrawn on 29 January 2025. [S] kioskindustry.org, lflegal.com

**Scanner input (keyboard wedge)**
- People were never mistaken for scans: 0/75 per run, across 3 runs.
- Timing-only detection is fragile under CPU load.
- onscan.js 1.5.2 defaults leak every scanned code into a focused field: 20/20 in every run. [L]; [V] `onscan.js` validates only after the burst, and `preventDefault` is off.

**What is genuinely different from field tools:**
1. Throughput under a queue: fixed, spatial-memory layouts and in-place voids.
2. Two audiences on two screens.
3. Scanner, scale, cash drawer, printer and card reader.
4. Offline as a selling mode with liability limits.
5. Kiosk only: untrained walk-up users, idle reset, legally required reach bands and audio.

### 3. Token enforcement after hand-off (re-measured on held-out code after review)

**stylelint-declaration-strict-value** misses rgb/hsl/oklch with its defaults (9/12). With `ignoreFunctions: false` it flags every `calc(var())`; 120 of 189 flags on Radix Themes were var-derived. [V] README; [L]

**stylelint core rules (CSS-E, recommended)** [L] `lint-results.json` `heldOut.css`
- Lengths are checked only on padding, margin, gap, font-size and radius, and only above 2 px (0.125rem), either sign. Positional properties are not checked by default.
- It still catches 12/12 on the fixture (2 debatable false positives).
- On four token-first stylesheets it produced **no positional flags and no nudges ≤ 2 px**:

| Held-out stylesheet | Lines | First-round CSS-D | CSS-E | What CSS-D flagged that E drops |
|---|---|---|---|---|
| Radix Themes components (61 files) | 7,380 | 11 | 5 | 5 nudges ≤ 2 px, 1 positional |
| tldraw 5.4.2 `ui.css` | 2,337 | 115 | 73 | 23 positional, 19 nudges |
| ckeditor5 48.5.2 | 7,625 | 184 | 136 | 27 positional, 21 nudges |
| ag-grid-community 36.2.0 | 8,588 | 146 | 59 | 69 positional, 18 nudges |

(Token-definition lines, 100–101 in ckeditor5 and 40 in ag-grid, are excluded, as `ignoreFiles` would exclude the token file.)

- Every remaining flag is a literal, but not every literal is a violation:
  - ckeditor5 writes `#0000` instead of `transparent` 25 times.
  - ag-grid's colour-picker hue gradient has to be literal (7 flags).
  - ckeditor5's `hsla(var(--x), .2)` is token-derived (6 flags).
- Repeated literals point at missing tokens: tldraw has `font-size: 12px` × 13.

**ESLint for style objects (JS-E1t, second round)** [L] `heldOut.tsx`; judged by an independent AST classifier in `lint/style-context.mjs`
- Every check is scoped to a style context: a JSX `style`/`sx`/`css` attribute, `css()`/`styled*()` arguments, or a `CSSProperties`-typed object.
- Key regexes are anchored, keys are token-owned only, lengths must be > 2 px, and percentages are excluded.
- **On 5 style-object codebases it never saw** (tldraw, BlockNote react and shadcn, react-arborist, @lexical/react: 356 files, 52,310 lines):
  - E1t: **5 flags, all 5 raw literals in styles**. I also checked all 5 by hand.
  - The first-round scoped E1s: 41 flags, of which 5 were raw literals, 2 debatable and 34 false positives. The false positives were floating-ui `padding` options, tldraw's `color: 'black'` enum, schema `backgroundColor: "string"`, `fontSizeAdjustment`, `bottom: '100%'` and `-10000px`.
- **Recall against the classifier's wider reference set** (32 raw style values):
  - E1t catches 5/7 outside SVG attributes. It misses react-arborist's style object held in an untyped `placeholderStyle` variable.
  - It catches 0/25 named colours on SVG `fill`/`stroke` attributes, by design. 23 of these are in a debug overlay and 2 are pattern-mask white/black.
- On the fixture E1t catches 7/11 with 0 false positives. The 4 misses are Tailwind-class lines, which E3 covers; **E5t = E1t + E3 catches 11/11 with 0/16 false positives.**

**Tailwind v4 `@theme` lockdown** stops default-scale classes. Arbitrary values (`p-[13px]`, `text-[#f00]`) still compile, so a lint is needed. [L] On shadcn/ui, 19 of 27 raw arbitrary values are `ring-[3px]`: a missing focus-ring-width token. [L]

**Company design-system plugins** (Atlassian `ensure-design-token-usage`, Primer, Kong) only work inside their own system: recall 7/11 for Atlassian's rule. [L]; [V]

### 4. Reference boards and inspiration

**Evidence**
- Designers copy the features of an example, even ones they are told are flawed. [S] Jansson & Smith 1991
- Far-field analogies give more novel concepts. [S] Chan et al. 2011
- Kleon: steal from many sources, transform what you take, credit it. [S]
- Studio practice: annotate each image with what to take and what to ignore, sort into lanes, cut to 15–25 images. [S] cgwire, Ave Design Studio
- NN/g places mood boards in Define/Ideate. [S]
- Kulkarni, Dow & Klemmer 2014. [S] title only

**Decision:** a formal, narrow board of qualities, for expressive and signature work only, with anti-clone rules (Decision guidance, point 6).

**Sources, checked by search:** Game UI Database (55k+ screenshots) [S], Interface In Game [S], Codrops Hub (MIT demos) [S], Configurator Database (1,400+) [S], Rive Marketplace [S], design.duolingo.com [S].

### 5. Detecting failure after launch

**Documented redesign failures and their early signals** (all [S] from news and trade coverage):

| Case | What went wrong | Early signal | Lesson |
|---|---|---|---|
| Digg v4, 2010 | Removed learned features | "Quit Digg" day 5 days after launch; traffic −26% US / −34% UK | Feature parity is part of the design |
| M&S.com, 2014 | Forced re-registration, broken checkout | 3.2m of 6m accounts re-registered; online sales −8.1% | Account migration is a conversion event |
| Snapchat, 2018 | Split friends and media | 1.2m-signature petition | Daily users fell for the first time |
| Skype, 2017 | Stories-like "Highlights" | Retired a year later | Don't bury the core task |
| Twitter, 2021 | Chirp font and high-contrast buttons | Eye-strain reports within days | Accessibility complaints lead; more contrast is not always better |
| Instagram, 2018 | A small test went broad by accident | Backlash | Reverted in ~2 h; test the kill switch |
| Sonos, 2024 | Removed features; VoiceOver regressions | Ratings fell to 2.8 (iOS) / 1.3 (Play) | A redesign tied to backend changes loses its rollback |

**Good patterns:** Figma UI3 was opt-in first, then the default [S]. Reddit kept old.reddit [S].

**PostHog frustration signals** [V] `posthog-js` `rageclick.ts`, `entrypoints/dead-clicks-autocapture.ts`, `browser-common/…/autocapture-utils.ts`
- **Rage click:** each click within 30 px (Manhattan) of the previous one and < 1,000 ms after it; the 3rd such click counts.
- **Dead click:** no mutation within 2,500 ms, no scroll within 100 ms and no selection change within 100 ms. A caret moving in an editable field counts as a response. Anchors and modifier-key clicks are skipped, and one click per node per second is counted.

**RUM snippet, second round** [L] `labs`
- **Before:** the first-round snippet's dead-click logic produced false dead clicks on form fields. On pinned copies of three regression fixtures, one click per element:

| Fixture | False dead clicks (first round) | Elements hit |
|---|---|---|
| a11y-wizard, without its ticker | 19 of 31 clicks | labels, inputs, selects, file inputs, a `tabindex=-1` heading |
| dashboard | 1 of 11 | the input |
| app-traps | 2 of 2 | label and input |

- **After:** the second-round snippet gave 0 false dead clicks and found 10/10 truly dead controls on the dashboard.
- **Clicks in a fast sequence:**
  - The first-round snippet found only 1 of the 10 dead dashboard controls: focus moving to the next clicked button hid the rest.
  - The second-round snippet found 10/10 but logged 1 false rage click per sequence. PostHog's chained rule counts three different adjacent targets clicked < 1 s apart (18 px icon buttons 24 px apart; "Change" links in consecutive rows) as rage.
- **Masking, measured on both versions and shared with PostHog:**
  - A mutation from a later click masks an earlier dead click.
  - A page with a 1.5 s DOM ticker masks every dead click. The a11y-wizard fixture gained such a ticker during this stream, and neither version reported anything on it.

**Core Web Vitals thresholds:** LCP 2,500/4,000 ms, INP 200/500 ms, CLS 0.1/0.25. [V] web-vitals 6.2.2

**Measurement framework:** HEART with Goals–Signals–Metrics [S]. Comparing new-user cohorts separates change aversion from regression [K].

## Experiments

Folder: `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/`

**How to re-run**
- `npm install && node run.mjs` runs everything in about 9–11 min under load, one browser at a time.
- `node run.mjs --only tenant|lint|labs` re-runs one part.
- `fetch-vendor.mjs` downloads everything third-party into `vendor/` (git-ignored; it writes its own `.gitignore`), at pinned commits and versions:
  - the Radix generator;
  - shadcn/ui and Radix Themes;
  - npm tarballs of tldraw 5.4.2, @blocknote/react and shadcn 0.55.0, react-arborist 3.16.0, @lexical/react 0.52.0, ckeditor5 48.5.2 and ag-grid-community 36.2.0.
- `labs/fixtures/` holds pinned copies of the three regression fixtures, plus `a11y-wizard-noticker.html` with its one ticker script removed.

**Outputs**
- `results.json`, plus the detail files `tenant/tenant-results.json`, `lint/lint-results.json` and `labs/labs-results.json`.
- `shots/tenant-sheet.jpg` (542 KB): 5 pathological tenants × (naive, palette.mjs, Atlassian, M3, S12) × light/dark.
- The tracked files total about 2.7 MB.

### E1: Tenant contrast (`tenant/methods.mjs`, `tenant/run-tenant.mjs`, `tenant/tw-tenant.mjs`)

**Setup**
- 12 tenants: #FFFF00, #F0F0F0, #000000, #FF0000, grey #8A8F98, #1A3CF2, jade #00A86B, #FF7A00, #00D1FF, #6B21A8, navy #0B1F3A, #FF69B4.
- Light and dark mode on one locked neutral layer.
- Text pairs T1–T5: label on button, label on hovered button, link on page, link on surface, text on selected row.
- Non-text pairs N1–N3: checked indicator, focus ring on page, focus ring on surface.
- Fidelity is ΔE OK × 100 between the tenant's colour and the button fill.

| Method | Text ≥ 4.5 | + Lc 60 | + Lc 75 | Non-text ≥ 3 | All gates | APCA label warnings | Fidelity ΔE median L/D | Exact hex kept L/D |
|---|---|---|---|---|---|---|---|---|
| M0 naive (hex everywhere, white label) | 43.3% | 32.5% | 28.3% | 61.1% | 4/24 | – | 0 / 0 | 12 / 12 |
| M1a luma label (Cal.com rule) | 66.7% | 42.5% | 35.0% | 61.1% | 11/24 | – | 0 / 0 | 12 / 12 |
| M1b best black/white by WCAG | 66.7% | 40.8% | 33.3% | 61.1% | 11/24 | – | 0 / 0 | 12 / 12 |
| M2 Radix generator | 71.7% | 60.8% | 25.0% | 50.0% | 3/24 | – | 0 / 0 | 9 / 10 |
| **M7 skill's `palette.mjs`** | 65.8% | 45.8% | 15.0% | 88.9% | **3/24** | – | 0 / 0 | 12 / 8 |
| M7f palette.mjs + WCAG-first label | 87.5% | 45.0% | 14.2% | 88.9% | 9/24 | – | 0 / 0 | 12 / 8 |
| M3 Atlassian custom theme | 100% | 79.2% | 47.5% | 100% | 24/24 | – | 11.0 / 15.7 | 4 / 5 |
| M4 Material 3 tonal spot | 100% | 92.5% | 50.0% | 100% | 24/24 | – | 24.8 / 18.7 | 0 / 0 |
| M5 Material 3 fidelity | 100% | 80.0% | 49.2% | 100% | 24/24 | – | 17.7 / 19.7 | 1 / 0 |
| **M6 S12, second round (WCAG gates; APCA warns)** | 100% | 81.7% | 80.0% | 100% | 24/24 | 13/24 | **0 / 0** | **11 / 10** |
| M6w first-round code, WCAG only | 100% | 70.8% | 39.2% | 100% | 24/24 | – | 0.7 / 1.5 | 6 / 5 |
| M6a first round as reported (Lc 60 gate) | 100% | 100% | 42.5% | 100% | 24/24 | – | 1.75 / 4.8 | 6 / 5 |
| M6s first round, Lc 75 gate | 100% | 100% | 100% | 100% | 24/24 | – | 4.5 / 6.55 | 5 / 4 |

- In the reviewer's palette.mjs mapping (focus = step 8) non-text was 56.9%. I used the focus step that palette.mjs itself prints.

**What the M6 rows prove, and what they do not**
- **The gate columns of every M6 row are true by construction.** s12() solves exactly the measured pairs, so these rows show only that it runs.
- **The independent results are fidelity and robustness.** M6 is *equally safe with more fidelity*. It is not *safer*.
- **Atlassian's 24/24 (99.9% on random colours) and Material's 100% are the independent evidence** that the safety targets can be reached.

**M6 moves the fill only near the page ground:**
- #F0F0F0 in light mode → #949494 (ΔE 28.9);
- #000000 in dark mode → #626262 (ΔE 49.6);
- navy in dark mode → #4B6281 (ΔE 25.1).

**Held-out distribution** [L] `random`: 1,500 seeded random colours × 2 modes; palette.mjs on the first 100.

| Method | All gates | Fill moved | ΔE of moved fills: median / p90 / max | APCA label warning |
|---|---|---|---|---|
| M6 second round | 100% (by construction) | 7.9% (5.5% because neither white nor the tinted ink reached 4.5:1; 2.4% near the ground) | 1.4 / 25.5 / 32.1 | 47.7% |
| M6a first round (Lc 60 gate) | 100% (by construction) | 37.5% | 5.4 / 9.5 / 40.6 | – |
| M3 Atlassian | 99.9% | 58.5% | 19.6 / 40 / 80.1 | – |
| M4 Material tonal spot | 100% | 100% | 20.2 / 41 / 65.1 | – |
| M7 palette.mjs (100 colours) | 12.0% | 19% (dark-mode lift) | 17.1 / 37.1 / 43.5 | – |
| M7f palette.mjs + label fix | 35.5% | 19% | same | – |

- There were 0 exceptions in 3,000 s12() calls.

**Admin options** (light mode, nearest fill per label; "reads well" means Lc ≥ 75):

| Tenant | Exact fill with WCAG-passing label | Nearest fill that reads well |
|---|---|---|
| Pure red | ink at 4.55:1, Lc 39 | #E80000 with white, ΔE 4.7 |
| Jade | ink at 5.84:1, Lc 46 | #00884F with white, ΔE 9.5 |
| Orange | ink at 6.96:1, Lc 53 | #BF5700 with white, ΔE 14.9 |
| Cyan | ink at 9.93:1, Lc 69 | #4DDDFF with ink, ΔE 4.3 |

**Input probe** [L] `inputProbe`:
- The second-round code refuses `#0000FF80`, `transparent`, `rgba(…,0.5)`, `#F00`, `red` and `oklch(…)`, as Atlassian's `isValidBrandHex` does.
- `lib/color.mjs` now throws on translucent colours instead of mis-measuring them.

**Tailwind probe:**

| Theme block | Tenant set on `<html>` | Tenant set on a subtree |
|---|---|---|
| plain `@theme` | pass | **fail** (both subtrees paint the root blue) |
| `@theme inline` | pass | pass |

**axe cross-check:** 1,560 checks, 99.8% agreement.

### E2: Lint setups (`lint/run-lint.mjs`, `lint/style-context.mjs`, fixtures in `lint/fixture/src/`)

**Fixture:** 12 CSS violations / 26 legitimate lines; 11 TSX violations / 16 legitimate lines.

| Setup | Fixture: caught | Fixture: false positives | Held-out |
|---|---|---|---|
| CSS-A core + unit ban | 12/12 | 2/26 | Radix 51 |
| CSS-D (first round) | 12/12 | 2/26 | 11 / 115 / 184 / 146 |
| **CSS-E (recommended)** | 12/12 | 2/26 | **5 / 73 / 136 / 59** |
| CSS-E + positional (opt-in) | 12/12 | 2/26 | 5 / 90 / 150 / 109 |
| CSS-B1 strict-value, defaults | 9/12 | 0 | 110 / 115 / 220 / 80 |
| CSS-B2 strict-value, no functions | 12/12 | 2/26 | 189 / 152 / 279 / 219 |
| JS-E1 core, unscoped | 10/11 | 2/16 | 43 flags: 5 true, 2 debatable, 36 false |
| JS-E1s first-round scoped | 10/11 | 0/16 | 41 flags: 5 true, 2 debatable, 34 false |
| **JS-E1t style-scoped (recommended, warn)** | 7/11 (misses only Tailwind lines) | 0/16 | **5 flags: 5 true**; shadcn 0 |
| JS-E2 Atlassian | 7/11 | 2/16 | – |
| JS-E3 better-tailwindcss, locked | 4/11 | 0/16 | shadcn 37 (27 raw, 19 `ring-[3px]`) |
| JS-E4 eslint-plugin-tailwindcss | 4/11 | 1/16 | – |
| JS-E5 = E1s + E3 | 11/11 | 0/16 | – |
| **JS-E5t = E1t + E3** | 11/11 | 0/16 | – |

- CSS held-out order: Radix Themes / tldraw ui.css / ckeditor5 / ag-grid. JS held-out: the five style-object codebases.
- The tldraw, ckeditor5 and ag-grid held-out sets, and the style-object TSX set, were added after review. I wrote the fixture myself, and CSS-E and E1t were designed after reading review findings about these codebases, so only the codebases' labels are independent.

### E3: POS scanner input (`labs/pos-scan.html`, `labs/pos-onscan.html`)

- 5 runs per cell, with the search field focused.
- Gap maxima in this run were 20–104 ms; the first run reached 284 ms and the reviewer's run had a load average of about 19.

| Detector | Scans recognised at 4/15/25/40 ms per key: this run | Range over 3 runs | People mistaken for scans | Scanned codes leaked into the field (range) |
|---|---|---|---|---|
| Burst-gate 35 ms | 5, 5, 5, 0 | 4–5, 2–5, 1–5, 0 | 0/25 | 5–13 / 20 |
| Burst-gate 50 ms | 5, 5, 5, 3 | 4–5, 4–5, 4–5, 0–3 | 0/25 | 2–7 / 20 |
| onscan.js defaults | 5, 5, 4, 0 | 4–5, 4–5, 0–4, 0 | 0/25 | 20/20 in every run |

### E4: Post-launch snippet (`labs/rum.js` second round, `labs/rum-v1.js` first round, `labs/rum-lab.html`)

- Sizes: 2,962 B gzip including its comment header (the first round was 1,925 B), plus web-vitals attribution at 5,465 B.
- 15 scripted sessions × 5 runs:

| Session | Second round | First round |
|---|---|---|
| The 7 original sessions (rage, slow button, double/triple click, working button, INP, error) | 5/5 each | 5/5 each |
| Rage click: 3 clicks 600 ms apart | 5/5 | 0/5 |
| Click an email field and type | 5/5 | 0/5 (false dead) |
| Click the label of a field | 5/5 | 0/5 |
| Toggle a checkbox | 5/5 | 0/5 |
| Control that answers only by scrolling | 5/5 | 0/5 |
| Truly dead button | 5/5 | 5/5 |
| Dead button, then a working one 400 ms later | missed 5/5 (known limit) | missed |
| Dead button on a page with a ticker | missed 5/5 (known limit) | missed |

- INP on the 350 ms handler was 352–432 ms, rated "needs-improvement".
- The fixture results are in Findings §5.

### E5: How large a change a rollout can detect (two proportions, α 0.05, power 0.8)

Unchanged; the reviewer checked it by hand.

| Baseline rate | Daily visitors | 50/50 split | 10% on new design |
|---|---|---|---|
| 2% | 3,000 | 19.1% | 31.9% |
| 10% | 3,000 | 8.2% | 13.7% |
| 2% | 300 | 60.5% | 100.9% |
| Task success 80% | 300 | 4.3% | – |

## Decision guidance for the skill

### 1. `categories.md`: new section "White-label and multi-tenant products" (new; plus a row in "When a repo holds several categories")

- **A tenant may change:**
  - one brand colour, as an opaque `#RRGGBB` only, with an optional dark-mode override;
  - a logo slot: SVG, light and dark variants, a square mark, a fixed max height with clear space;
  - radius and density as enums;
  - a font from a licensed, performance-checked list.
- **Locked:** neutrals, text colours, status colours, the focus ring, and the spacing and type scales.
- **Every tenant colour is untrusted input.** Test with the 12 pathological colours from E1, translucent and non-hex strings, and every real tenant.

### 2. `design-systems.md`: new §8 "Tenant themes"

1. **Two roles:**
   - `brand`: the tenant's exact hex on large fills, with its own label solved for each state.
   - `accent-strong`: OKLCH lightness solved from the tenant colour, used for links, selected text, indicators and focus.
2. **The gate is WCAG, which keeps `accessibility.md`'s rule** (APCA is "a design aid … never the gate"):
   - Every text pair and state ≥ 4.5:1; every non-text pair ≥ 3:1.
   - **The tenant's fill is never moved for APCA.**
   - The label is the one of white or ink that passes WCAG; APCA only breaks a tie.
   - APCA below the size-aware level of `design-theory.md` B6 (Lc 75 for body-size labels, including 14px/600 buttons; Lc 60 only at ≥ 24px/400 or ≥ 16px/700) is a **warning** in the admin preview.
   - Derived text (`accent-strong`) is solved for WCAG 4.5 **and** Lc 75 where reachable, as `palette.mjs` does for step 11, because it costs no brand fidelity.
   - *This replaces the first-round draft, which made APCA Lc 60 a gate and conflicted with `accessibility.md` without saying so.*
3. **Moving the fill:** only when it vanishes into the ground (< 1.5:1 and chroma < 0.1), or when no label passes WCAG. Change lightness only and keep the hue. A fill below 3:1 on the page gets a 1 px `accent-strong` border.
4. **Achromatic brands:** use a neutral hue and never invent one. **Status hue within 30°:** those states keep an icon and a word. **Dark mode:** derived, with an override.
5. **Admin preview:**
   - real components in both modes;
   - the pass/fail list;
   - each APCA warning with the nearest fills that read well (e.g. pure red keeps #FF0000 with a dark label at 4.55:1, Lc 39; #E80000 with white reads at Lc 75, ΔE 4.7);
   - the tenant chooses; the default is the exact hex.
6. **Delivery:** a server-rendered `[data-tenant]` custom-property block. In Tailwind v4 use **`@theme inline { --color-accent: var(--tenant-accent); }`**. Plain `@theme` resolves at `:root`, so it works only with one tenant set on `<html>` and silently breaks subtree tenants, including a side-by-side preview. [L]
7. **CI:**
   - The tenant × mode × pair matrix exits 1 on a WCAG failure only and lists APCA warnings.
   - Add a two-tenant render check: two subtrees, and the computed colours must differ as expected.
   - Composite translucent colours before measuring, or refuse them.
   - Don't rely on axe alone.

### 3. Scripts (proposed, in this order; no skill file edited)

1. **`palette.mjs` label rule (a defect fix, first):** print the step-9 label that passes WCAG, with APCA as the tie-break, and warn with the passing step when neither passes. Measured effect: 3/24 → 9/24 all-gates; T1 failures 14 → 0.
2. **`palette.mjs` step 11:** solve it against steps 2 **and** 3, because on step 3 it gives 4.11–4.19:1 today. The effect of this fix is proposed, not measured.
3. **`palette.mjs --tenant <#RRGGBB> [--dark] [--json] [--label 14/600]`:** a port of `s12()`, `parseTenantHex()` and `labelOptions()` from `tenant/methods.mjs` (about 120 lines, colorjs.io only). It emits roles, warnings and the admin options.
4. **`--tenant-set tenants.txt`:** exit 1 on a WCAG failure; warnings printed.
5. **`contrast.mjs --css base.css --theme a.css b.css`:** removes the one-theme-per-run limit.

### 4. `technical-qa.md`

**"Contrast of the token matrix" (extends):** add tenant presets, the pathological set and the axe ~1:1 note.

**"Enforcement hand-off" (new):** ship the lint configs at **warning level with a baseline**. Block only new violations, and only after a trial on the project's own code: the held-out JS evidence is 5 flags on 52k lines.
- **CSS:** stylelint core rules as in CSS-E, with the token file in `ignoreFiles`:
  ```json
  {"color-no-hex": true, "color-named": "never",
   "function-disallowed-list": ["rgb","rgba","hsl","hsla","hwb","lab","lch","oklab","oklch","color"],
   "declaration-property-value-disallowed-list": {
     "/^(padding|margin|gap|row-gap|column-gap)/": ["<BIG_LENGTH>"], "font-size": ["<BIG_LENGTH>"], "/radius$/": ["<BIG_LENGTH>"]}}
  ```
  - `BIG_LENGTH` is the regex in `lint/run-lint.mjs`: a px/rem length above 2 px, either sign, not inside `var()`.
  - Positional properties are opt-in.
  - Legitimate literals (a hue gradient, `#0000`) take a disable comment, or `transparent`.
- **JS/TSX:** `no-restricted-syntax` with `STYLE_SCOPED_SELECTORS` (E1t).
- **Tailwind:** the `@theme` lockdown (default scales reset in `@theme`; var-mapped tokens in `@theme inline`), plus better-tailwindcss `no-unknown-classes` and `no-restricted-classes`.
- **Report repeated literals as token candidates:** `ring-[3px]` × 19, `font-size: 12px` × 13.
- **Do not use:** strict-value with its defaults, or another company's design-system plugin.

### 5. `categories.md`: new "Point of sale and counter screens" and "Self-service kiosks" (new)

**POS:**
- **Success metrics:** seconds per transaction, taps per item, void rate, offline-queue failures.
- **Layout:** stable grid positions, never auto-reordered; tiles ≥ 80–96 px (Odoo uses 5–6 rem); keys ≥ 56 px; change due as the largest element.
- **Recovery:** in-place void and edit; manager override without logging out; cashier PIN switch.
- **Scanner:** capture at document level; configure a scanner prefix and suffix and detect on those; an average-gap gate of about 50 ms only as a fallback; never let a scan reach a focused field.
- **Offline:** keep selling with a queued-count badge; show per-transaction limits; label offline card sales "approved offline — pending".
- **Customer display:** mirrors cart and totals; never shows staff data.
- **Tips and receipts:** "No tip" as large as the other options; receipts by print, email, SMS or none.

**Kiosk:**
- An attract loop, then idle reset with a ≥ 20 s "still there?" warning.
- The 380–1,220 mm reach band, mapped to screen y, with a reach mode.
- Audio jack and interruptible speech.
- Targets ≥ 64 CSS px [K].
- In-app zoom; crash reload.
- EAA / EN 301 549 in the EU. In the US, the ADA general duty applies and there is no kiosk rule.

**`accessibility.md` (extends):** a short "Kiosks and closed functionality" note.

### 6. `research.md`: new step "Reference board" (expressive and signature posture only)

- **Output:** `discovery/board.md` (tile, source and credit, lane, take, ignore, translation) and `board.png` built with `compare.mjs --grid`.
- **Size:** 12–20 crops across six lanes.
- **Anti-clone rules:**
  - ≥ 50% of tiles from outside the web;
  - ≤ 2 tiles per source, none from competitors;
  - crops only;
  - each tile yields a named quality and a measurable translation.
- Put the board away while making, and check each quality in the Phase 7 critique. The blur-compare step is proposed, not tested.

**`art-direction.md` §2 (extends):** style tiles take their type, colour and image decisions from the board's translations.

### 7. `resources/inspiration.md`: new "Sources for ambitious work"

Unchanged from the first round: game UI, interactive and 3D, motion, illustration and character, editors, and configurators; at most 5 per area, each with "when useful" and "the trap".

### 8. `technical-qa.md`: new "After launch", plus a proposed `templates/LAUNCH.md` and `templates/rum.js` (the second-round `labs/rum.js`)

1. **Rollback plan in the hand-off report:** what is behind a flag, how to revert, and which migrations are irreversible.
2. **Baseline for 2–4 weeks, per template and device:**
   - task success and time;
   - funnel steps;
   - JS errors per 1,000 sessions;
   - rage and dead clicks per 1,000 sessions;
   - support topics;
   - RUM p75 LCP, INP and CLS;
   - an accessibility channel.
3. **Rollout:** flag → internal → 5–10% or opt-in beta → 50% → 100%. Keep a holdback only where E5 says the traffic can detect a change. Test the kill switch.
4. **Roll back when:**
   - a drop larger than the detectable change is sustained for 48 h;
   - JS errors on a key flow reach ≥ 2× baseline;
   - payment or submit failures rise;
   - an assistive-technology blocker appears on a top task;
   - a key template crosses into "poor" on a Core Web Vital.
5. **Iterate when:**
   - rage or dead clicks reach ≥ 2× baseline on an element;
   - a support topic is up 25% week on week;
   - a vital slips from good;
   - comfort complaints appear.
6. **Compare frustration signals only like with like: the same template, with the same background activity.**
   - A ticker or live region hides dead clicks: it silenced detection completely in the lab and on a fixture.
   - PostHog's chained rule counts quick clicks across adjacent small targets as rage.
   - The multipliers are judgement, not measurement.
7. **When the detectable change at 4 weeks is > 10%,** claim no A/B result; use guardrails and 5 task tests.

### 9. `anti-patterns.md`: new "Redesign failures and their first signals" (the table in Findings §5)

## Rejected ideas and why

- **APCA as a hard gate on tenant text.** It contradicts `accessibility.md`, and it is unreachable for about half of all colours (46% below Lc 75 with either label). On random colours it moved the brand fill in 37.5% of cases. APCA is kept as a size-aware warning and a target for derived roles.
- **Material dynamic colour for tenants.** It moves 100% of fills (median ΔE 20) and invents hues.
- **Auto label alone:** 11/24.
- **The skill's `palette.mjs` as it stands, as a tenant generator:** 3/24; 12% on random colours.
- **A tenant-themed focus ring:** Radix's accent-8 ring fails in 13/24.
- **Plain `@theme` mapping tenant variables.** It breaks tenants set on a subtree.
- **Accepting any CSS colour string as a tenant colour,** and alpha-blind contrast helpers.
- **Positional properties and ≤ 2 px nudges as token violations.** They made up 45–74% of the first-round CSS flags.
- **Unscoped property-name selectors in ESLint:** 34 of 41 held-out flags were false positives.
- **Treating focus change as a response to a click.** It hid 9 of 10 truly dead controls in a click sequence.
- **Strict-value with defaults; company lint plugins; `no-arbitrary-value`.**
- **onscan.js; timing-only scanner detection as the primary method.**
- **Generic moodboards; fixed big-tech rollback percentages; a native or game-dev direction for POS and kiosks.**

## Open questions and limits of this evidence

- **E1:**
  - The gate columns of the S12 rows are true by construction. Only fidelity and robustness are independent.
  - Methods share my locked neutrals.
  - sRGB only.
  - ΔE is a proxy for "still the brand".
  - The WCAG-first label gives black-ish on pure red (4.55:1, Lc 39). Whether tenants accept that or pick #E80000 with white is untested with people.
  - The tinted ink (OKLCH L 0.2) forces a small fill move in 5.5% of random colours; pure black would not.
  - The near-white light-mode move (to 3:1) is a first-round choice I did not revisit.
- **E2:**
  - The fixture is mine, and CSS-E and E1t were designed after reading review findings about these codebases.
  - The held-out JS sample is small (5 true flags). The classifier is rule-based; I checked the 5 E1t hits and the 41 E1s hits by reading them. The reviewer's hand count of the E1s hits was 63% false positives against my classifier's 83%.
  - Messy legacy code is untested.
- **E3:** synthetic key timing under shared CPU; real scanners are [K].
- **E4:**
  - Synthetic sessions in headless Chromium.
  - The fixtures have no click handlers, so ground truth is native behaviour only.
  - `a11y-wizard.html` changed during this stream (commit 4e324ca added a ticker). The reviewer's run used the earlier, uncommitted version, which is not recoverable. The pinned no-ticker copy removes only that script from the committed version.
- **Unverified here:**
  - EN 301 549 clause text (search snippets only);
  - kiosk target sizes;
  - Snap's exact quarter;
  - Sonos's "could not roll back";
  - Kulkarni et al. findings;
  - Chakra, Panda and Polaris theming.
- **Not built:** the board blur check, a tenant admin UI, and the `palette.mjs` step-11 fix.

Main files:
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/run.mjs`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/results.json`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/tenant/methods.mjs`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/tenant/tw-tenant.mjs`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/lint/run-lint.mjs`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/lint/style-context.mjs`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/labs/rum.js`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/labs/run-labs.mjs`
- `/home/user/website-redesign-skill/research/stage2/experiments/S12-systems-and-references/shots/tenant-sheet.jpg`

## Changes after review

**1. Tailwind `@theme` recipe (§8 point 8): agreed and fixed.**
- `tenant/tw-tenant.mjs` confirms it in Chromium: plain `@theme` fails for subtree tenants (red and jade subtrees paint the root blue) and passes only on `<html>`; `@theme inline` passes both, including `bg-accent/50`.
- The guidance now requires `@theme inline` and adds a two-tenant render check to CI.
- The lint fixture `tailwind-locked.css` now puts var-mapped tokens in `@theme inline`. Lockdown results are unchanged.

**2. JS-E1s false positives on held-out code: agreed and fixed.**
- `fetch-vendor.mjs` now pins the five codebases from npm.
- The new E1t is scoped to style contexts, with anchored key regexes, token-owned keys, lengths > 2 px and no percentages. It ships at warning level.
- On 356 files and 52,310 lines: E1s gave 41 flags (34 false positives by the independent AST judge in `lint/style-context.mjs`); E1t gave 5 flags, all genuine. Recall is 5/7 outside SVG attributes.
- CI blocking is now conditional on a trial on the project's own code.

**3. CSS-D positional flags and nudges: agreed and fixed.**
- CSS-E drops positional properties (opt-in) and lengths ≤ 2 px.
- It was re-measured on Radix Themes, tldraw, ckeditor5 and ag-grid: 11/115/184/146 → 5/73/136/59, with 0 positional and 0 nudges.
- The categoriser now separates positional, nudge, negative-margin, raw-colour and token-definition categories. "11, all raw" is corrected: 5 of the 11 were nudges and 1 was positional.

**4. APCA gate contradicting `accessibility.md`: agreed and fixed.**
- The recommended M6 now uses WCAG as the exit-1 gate, a WCAG-first label, the fill never moved for APCA, and a size-aware APCA warning at the `design-theory.md` levels. Derived text is solved for Lc 75 where reachable.
- The conflict is named in §8 point 2. The first-round rules are kept as M6a for comparison.

**5. "By construction" and fidelity understated: agreed and fixed.**
- The caveat now covers all M6 gate columns.
- The rows are reframed as "equal safety, more fidelity", with Atlassian (99.9% on random colours) and Material as independent evidence that the targets can be reached.
- A seeded 1,500-colour × 2-mode distribution is added. The first-round rules moved 37.5% of fills (median 5.4, p90 9.5, max 40.6, matching the reviewer's numbers); the second-round rules move 7.9%.

**6. palette.mjs never measured: agreed and fixed.**
- M7 (the script run unmodified, roles as it advises) gives 3/24 all-gates and 65.8% text; T1 fails 14/24 because the label is chosen by APCA alone.
- A second defect was found: step 11 on step 3 is 4.11–4.19:1 in 12/12 light tenants.
- M7f simulates the WCAG-first label fix: 9/24.
- The label fix is now the first proposed script change, before `--tenant`.

**7. Alpha ignored: agreed and fixed.**
- `parseTenantHex()` accepts only opaque `#RRGGBB`, as Atlassian's `isValidBrandHex` does.
- `lib/color.mjs` `wcag`/`apca` now throw on translucent colours.
- `inputProbe` reproduces the defect (`#0000FF80` reported at 8.59:1, painted at 3.29:1; `transparent` 21:1 against 1:1) and shows the refusal. Translucent inputs are added to the pathological set.

**8. rum.js false dead clicks, and the PostHog claim: agreed and fixed.**
- The second-round snippet:
  - skips inputs, textareas, selects, contenteditable, labels with a control and anchors;
  - counts scroll, range or editing selection changes, and input/change events within 100 ms;
  - records responses per candidate;
  - no longer counts focus changes;
  - dedupes one click per element per second;
  - uses PostHog's rage rule (Manhattan distance to the previous click, < 1 s between clicks), with the triple-click-select difference stated.
- It was re-run on the lab (15 sessions, 5 new; second round 5/5 on each, first round fails the 5 new ones) and on pinned fixture copies. The first round's false dead clicks (19/31, 1/11, 2/2) went to 0.
- New measured limits: masking by later mutations and by background tickers; false rage on adjacent small targets in fast sequences. Both are now part of the guidance.

**Also changed:**
- `fetch-vendor.mjs` writes `vendor/.gitignore`.
- The regression fixtures are pinned in `labs/fixtures/`, because `a11y-wizard.html` changed during the stream.
- The scanner lab was re-run and ranges over three runs are reported. The ordering holds and onscan.js leaked 20/20 every time.
- The axe cross-check now covers 13 methods (1,560 checks, 99.8%).
- Total runtime is about 10–11 min under load.
