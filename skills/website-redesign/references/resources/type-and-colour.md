# Type and colour resources

Checked 2026-09-28. Choose faces with the procedure in `art-direction.md` §4 and verify them with `scripts/fonts.mjs`; build colour with `scripts/palette.mjs` and `scripts/contrast.mjs`.

## Font sources

| Source | Licence and terms | Self-host? | Watch for |
| --- | --- | --- | --- |
| Google Fonts | per family: SIL OFL (most), Apache-2.0, Ubuntu Font Licence | yes | **The API strips optional OpenType features** — kept: `tnum`, `pnum`, `frac`, default shaping; dropped: `zero`, `onum`, `case`, small caps, stylistic sets, character variants, `sups/subs`, `dlig`. Measured: Google's Latin Inter is 47 KB with none of its 8 stylistic sets, 14 character variants or slashed zero; the upstream file is 344 KB with all of them. Axes are only served when requested (`family=Inter:opsz,wght@14..32,100..900`). Hosting from Google also sent visitor IPs to Google — a Munich court awarded damages (2022): self-host for EU clients. |
| Fontsource | code MIT; fonts keep their own licences | npm | built from the Google API, so **the same features are stripped**; the `wght` variable file lacks `opsz` (use the `opsz` or `full` files) |
| Upstream releases (GitHub, google/fonts repo binaries) | the family's licence | yes | the full-feature files — use them when a design relies on `zero`, `ss01`, `onum`, small caps; subset with `pyftsubset --layout-features='*'` |
| Fontshare (ITF) | **ITF Free Font License** for most families: free commercial use and self-hosting on your own servers, but **§02 forbids making the fonts available by any means — including a repository or a publicly accessible server**. Some families are OFL. | own site only | **never commit FFL fonts (Satoshi, General Sans, Clash Display, Zodiak, Erode, Boska, Sentient…) to a public repo**; use the Fontshare CDN, a private asset bucket, or an OFL face |
| Velvetyne, Collletttivo, The League of Moveable Type | OFL (check each family) | yes | expressive, less common display faces |
| Uncut.wtf, Open Foundry | catalogues; licence per face | per face | read each licence |
| Adobe Fonts | subscription; no self-hosting; fonts stop when it lapses | no | only for clients who own the subscription |

OFL Reserved Font Names (Plex, Source, Merriweather, Lora, Playfair Display, Lexend/Readex, Libre Baskerville, Quicksand…): the OFL FAQ counts a subsetted webfont as a modification — the risk is small; rename the internal family name of aggressive subsets, or prefer families without an RFN.

## A shortlist by voice

The defaults — Inter, Geist, Roboto, Open Sans, Poppins, Montserrat, DM Sans, Space Grotesk, Instrument Serif — are fine faces that are **no longer decisions** (`scripts/lib/saturated-fonts.json`). This list is a starting point for the procedure, not a replacement default: rotate through it, derive from the wordmark, and verify each face. All are on Google Fonts under OFL unless marked. "tab" = tabular figures by default; "tnum" = available on request.

| Voice | Families | Notes |
| --- | --- | --- |
| Precise, engineered (infrastructure, fintech, B2B that isn't a dev tool) | **IBM Plex Sans** (tab; Serif, Mono, Condensed, Arabic, JP, KR siblings), **Schibsted Grotesk** (tnum, zero), **Archivo** (width axis 62–125; tnum, zero, onum), **Hanken Grotesk**, **Host Grotesk** (tab), **Red Hat Display + Text** (tnum, zero), **Geologica** (sharpness axis) | instead of Inter or Geist; instead of Space Grotesk try **Familjen Grotesk** or **Chivo** (both tab, zero) |
| Warm, humanist (services, health, education, people-first) | **Source Sans 3** (tab), **Fira Sans** (full numeric set), **Alegreya Sans** (+ Alegreya serif), **Commissioner** (flare axis), **Atkinson Hyperlegible Next** (legibility-first), **Reddit Sans** (18 variants, tnum, zero), **Rethink Sans**, **Radio Canada Big** | instead of DM Sans (which has no tabular figures) |
| Editorial serif, text | **Literata** (opsz 7–72), **Source Serif 4** (opsz, tab), **Newsreader** (opsz, tab), **Spectral** (tab), **Petrona**, **Piazzolla**, **Merriweather** (now variable), **Gelasio** (Georgia-metric: no fallback shift), STIX Two Text | long reading |
| Editorial serif, display | **Gloock** (tnum), **Young Serif**, **Bodoni Moda** (opsz), **Playfair** (the 2023 family, opsz 5–1200 — not Playfair Display), **Fraunces** (SOFT and WONK axes; no tabular figures — headings only), Libre Caslon Display, Imbue, Ibarra Real Nova | instead of Instrument Serif or DM Serif Display (neither has tabular figures). The warm serif display is itself the model's prior — needs a brand reason |
| Institutional, civic | **Public Sans** (USWDS; tnum), **Atkinson Hyperlegible Next**, **Noto Sans** (tab, global scripts), Source Sans 3, IBM Plex Sans, **Overpass** (highway-sign heritage; tnum, zero) | — |
| Playful, friendly | **Shantell Sans** (informality axes), **Fredoka**, **Recursive** (casual and mono axes: one family for UI and code), **Nunito** (tab), **Rubik** (Arabic + Hebrew included), **Epilogue**, **Afacad Flux**, Unbounded (wide display) | instead of Poppins or Outfit. Bricolage Grotesque is common in indie-startup sites since 2024 — semi-default |
| Luxury, high-contrast | Bodoni Moda, Playfair 2023, Gloock, Italiana, Marcellus, Gilda Display, Prata, Bellefair, Tenor Sans | luxury is carried by scale, space and restraint more than by the face; avoid Cormorant (tiny x-height, the luxury-template cliché) and Cinzel |
| Data-heavy UI | **IBM Plex Sans**, **Roboto Flex** (tab; 13 axes), **Public Sans**, **Reddit Sans**, **Red Hat Text**, **Source Sans 3**, **Noto Sans**, **Barlow** (+ Condensed for dense tables), Archivo, Chivo | tabular figures and a slashed zero; for a sales, services or manufacturing brand, figures in the sans with `tabular-nums` — not a mono |
| Condensed display (signage, sport, industrial, workwear only) | Big Shoulders, Barlow Condensed, Sofia Sans Condensed, Saira, Anybody, Archivo at wdth 62, League Gothic, Antonio (tab) | instead of Oswald, Bebas Neue or Anton — condensed industrial faces read harsh on people products |
| Monospace (developer and infrastructure products only) | JetBrains Mono, IBM Plex Mono, Martian Mono, Azeret Mono, Spline Sans Mono, Red Hat Mono, Atkinson Hyperlegible Mono | — |
| Arabic, CJK, Devanagari | see `multilingual.md` | — |

**No tabular figures at all** (never for prices, tables, dashboards): DM Sans, Poppins, Fraunces, Instrument Serif, DM Serif Display, Albert Sans, Be Vietnam Pro, Libre Franklin, Urbanist, League Spartan, Oswald, Big Shoulders, Playfair Display, Libre Baskerville, and the Arabic faces Tajawal, Almarai, El Messiri, Changa, Markazi Text.

**Pairing**: concord in x-height matters most when faces share a line (measured x-height/em: Inter 0.546, Plex 0.516, Source Sans 3 0.478, Literata 0.507, Newsreader 0.426, Cormorant 0.386) — correct a mismatch with `font-size-adjust: ex-height 0.52` (Baseline 2024) or by size. Superfamilies are the safest pairing: Plex Sans + Serif, Source Sans 3 + Serif 4, Alegreya Sans + Alegreya, Red Hat Display + Text, Noto Sans + Serif.

**Variable and optical sizes**: families with `opsz` (Inter, Fraunces, Newsreader, Literata, Source Serif 4, Bodoni Moda, Playfair 2023, Roboto Flex/Serif, Merriweather, Bricolage, Big Shoulders…) adjust automatically with `font-optical-sizing: auto` — only if the axis is actually loaded. Custom axes (SOFT, WONK, SHRP, FLAR) are brand levers: pick one setting per role and tokenise it; never animate them for decoration. Loading, subsetting and fallback metrics: `performance.md` §4. `text-box: trim-both cap alphabetic` (Baseline 2026-08) aligns type to boxes without Capsize-style negative margins.

## Colour tools

| Tool | For | Licence | Note |
| --- | --- | --- | --- |
| `scripts/palette.mjs`, `scripts/contrast.mjs` | logo sampling, OKLCH role scales, WCAG + APCA | (this skill) | built on colorjs.io |
| Radix Colors | the 12-step role model, light and dark, alpha variants | MIT | use its step semantics even with custom hues |
| Leonardo (Adobe) | palettes generated to target contrast ratios | Apache-2.0 | "every token must hit 4.5:1 on each surface" |
| Huetone | LCH/OKLCH scale editor with APCA views | MIT | hand-tuning scales |
| oklch.com | OKLCH picker with gamut display | MIT | P3 vs sRGB checks |
| Harmonizer (Evil Martians) | OKLCH + APCA palette generator | licence not confirmed | use the tool; don't vendor its code |
| colorjs.io / culori / chroma-js | conversions, gamut mapping, contrast in code | MIT / MIT / BSD+Apache | **APCA argument order**: colorjs.io's `background.contrast(text, 'APCA')` matches the reference; the reverse call returns a different number |
| apca-w3 | the APCA reference | **"Limited W3 License"** — fine for checking web content, not for bundling into other products | verify with it; don't ship it |
| Tailwind v4 palette | 22 hues × 11 steps in OKLCH | MIT | a good reference for chroma shaping; recognisable if used unmodified |
| Material Color Utilities (HCT) | tone-based roles, dynamic colour | Apache-2.0 | the source of the "tone difference ≈ contrast" rule |
| Coolors, AI palette generators | mood exploration | freemium | moods, not systems — never ship a five-swatch palette without roles and a contrast table |
| Realtime Colors | preview a palette on a mock site | free to use; source code CC BY-NC-ND | don't copy its code |

**Gamut rule**: when an OKLCH colour is out of sRGB, reduce chroma, never lightness or hue (`palette.mjs` does). A logo colour outside sRGB gets a P3 token with an sRGB fallback. A sequential ramp should have an even perceptual step — check it in greyscale too.

## Data palettes

Keep a separate data palette in the tokens; the brand accent is rarely a good series colour. Categorical: **Okabe–Ito** (`#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #000000`) or Paul Tol's schemes, ≤ 7 hues, context in grey. Sequential: viridis, cividis (optimised for colour-vision deficiency) or a single hue light → dark. Diverging: ColorBrewer (RdBu, PuOr) around a meaningful midpoint — never red–green. Status colours stay reserved for status (`dataviz.md`).
