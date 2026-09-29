<!-- Stream S8, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S8-rtl-mobile-haptics/. The skeptical review is in S8-rtl-mobile-haptics.review.json. -->

# S8: RTL and Arabic-first design at component level, mobile product design, haptics

## What the skill already knew

`multilingual.md` already covers the basics well:
- `lang` and `dir`, logical properties, and a short list of icons to mirror;
- Arabic font families and how each renders digits (measured in experiment I);
- no tracking and no italic on Arabic;
- "set Arabic 10–15% larger with 1.6–1.8 leading";
- font mapping by `unicode-range`;
- numbers in data: `Intl`, bidi marks, right-aligned numeric columns, no `type=number`.

`responsive.md` and `app-ui.md` cover:
- `svh` and safe-area CSS;
- `interactive-widget` and VisualViewport;
- hover styles only inside `(hover: hover)`;
- 44 px targets;
- Hoober's evidence in place of thumb-zone folklore;
- bottom tabs vs drawer;
- honest offline states.

The S6 lab pulled BCD data for `navigator.vibrate`, but none of it reached the skill.

The gaps are at component level:
- keyboard behaviour in RTL;
- drawers and animations in RTL;
- forms and text that hold LTR data;
- Arabic vertical metrics and glyph clipping;
- the new riyal sign;
- sheets and the back gesture;
- haptics;
- any script that checks any of this.

## Findings

### F1. The skill's scripts miss RTL defects entirely [L]
- **`audit.mjs` caught none of the 24 seeded RTL defects.** The Arabic fixture was built twice:
  - built correctly (`fixtures/bilingual.html?lang=ar`), it got 1 fail: a fixed toast covering a focused link, a real non-RTL finding;
  - built with 24 typical mistakes (`&variant=broken`), it got 0 fails.

  The only output lines that differ between the two are type-size statistics (`results.json → auditBaseline`). I re-ran this against the skill at repository HEAD `78aaf9d`.
- **`widgets.mjs` gets the tabs contract backwards for RTL.** It presses ArrowRight and expects the next tab. It therefore FAILs a correct RTL tablist ("ArrowRight does not move focus between tabs") and passes one whose arrows run backwards. This is still true after the round-4 changes to `widgets.mjs` (`results.json → keys.widgetsMjs`).

### F2. The RTL component matrix: sources compared
Sources:
- **Firefox** RTL guidelines (`mozilla/gecko-dev docs/code-quality/coding-style/rtl_guidelines.rst`, "What NOT to mirror") [V].
- **Wikimedia Codex** (`wikimedia/design-codex@8a1caaf`): the style guide `bidirectionality.md` and the icon metadata `codex-icons/src/icons.ts` [V]. Of 293 icons, 89 have `shouldFlip` and 10 ship separate RTL assets. Help flips except in `he` and `yi`.
- **Flutter** Material icons (`flutter/flutter@929df56 packages/flutter/lib/src/material/icons.dart`) [V]. 76 base icons have `matchTextDirection: true`. The number of base icons is 2,233 if you count by the doc-comment class and 2,231 if you count names without the `_sharp/_rounded/_outlined` suffix. The reviewer's 2,231 is the second count; my earlier 2,235 was wrong.
- **UAE design system** (`TDRA-ae/aegov-dls@d309bb5`, MIT) [V].
- **Material, 2014 text**: "Bidirectionality", as quoted in English in `albatrosary/material-design-jp@495e825 Usability/Bidirectionality.md` [V of that copy; m*.material.io is not reachable from here]. Material M2 wording is from search snippets [S].
- **Apple HIG** right-to-left, quoted via the Apple archive and Medium [S].

| Element | Rule for the skill | Material | Apple | Firefox | Codex | Flutter icons | aegov / lab |
|---|---|---|---|---|---|---|---|
| Back/next arrows, chevrons, breadcrumb separators, pagination, row "open" | mirror | mirror ("the most important icons for mirroring are back and forward") [V] | mirror | mirror | mirror | mirror (but `keyboard_arrow_left/right` do **not**, an inconsistency) | aegov breadcrumb separators `rtl:-scale-x-100` [V] |
| Undo/redo, reply/forward, send | mirror | undo/redo: "choose circular or horizontal" [V] | — | mirror (direction) | Undo/Redo flip | mirror | — |
| External link / open in new | mirror | — | — | mirror (listed) | LinkExternal, NewWindow flip | mirror | — |
| Log in / log out / exit | **disagreement**; record a decision | — | — | implied mirror | flip | **no** | — |
| Help "?" | mirror for ar/fa/ur, not he/yi | — | — | — | flips except `he`, `yi` | mirror (all RTL) | — |
| Lists, indent, text-align, quotes | mirror (quotes: **disagreement**) | "icons that contain representations of text need careful mirroring" [V] | — | mirror (reader icon) | ListBullet, Indent, Quotes flip | list/indent mirror; `format_quote` no | — |
| People, faces | mirror when the figure faces text (**disagreement**) | "should typically mirror, especially if they appear close to text" [V] | — | — | UserAdd, UserGroup, UserTalk… flip | `person_add` etc. no | — |
| Search magnifier | **don't** | "the search icon … should not be mirrored" (right-handed) [V] | — | "should look right-handed" (ambiguous) | don't (right-hand objects) | no | — |
| Edit / pencil | don't | — | — | — | don't (right-hand objects; "edit" is in its don't image) | no | — |
| Checkmark | **don't**: every source checked agrees; this replaces the skill's "systems disagree" | "a camera and a check mark remain unmirrored intentionally" [V] | — | don't | don't | no | — |
| Clock, history, refresh, spinner (circular time) | don't | "a clock icon or a circular refresh or progress indicator … should not be mirrored" [V] | don't (clocks) | — | don't (time); its "Update" is two horizontal arrows and flips | no | — |
| Media controls, media timeline | don't; keep the player `dir="ltr"` | "Media playback buttons and the progress indicator are not mirrored" [V] | don't (video controls, timeline) | don't | don't | no | — |
| Volume | **disagreement**: record a decision; outside a player, mirroring is the majority view | **mirror**: "icons that hint at a specific direction, like the speaker icon, are mirrored"; "a volume icon with a slider at its right side should be mirrored" [V] | — | — | VolumeUp/Down **flip**; VolumeOff has an RTL asset | no | — |
| Sliders, progress along a line, steppers, rating, toggle thumb | mirror | mirror | mirror (sliders, progress) | mirror (progress) | mirror (HalfStar flips) | `star_half` mirrors | native `<input type=range>` in RTL: min on the right, ArrowLeft increases [L] |
| Charts: time axis | **disagreement**: pick one and record it | "time moves from right to left" [V] | "graphs don't flip; x and y axes stay" [S] | "time right-to-left" | don't mirror if interpretation suffers | `show_chart`, `trending_*` mirror | Chart.js `rtl` flag covers only legend and tooltip |
| Tabs, bottom nav, drawer items | DOM order = reading order; first item on the right | ✓ | ✓ | "Left arrow must select the item on the left" | ✓ | — | **Disagreement on arrow keys.** aegov `custom.js` binds ArrowRight to the next tab and ArrowLeft to the previous one in DOM order, ignoring direction [V]. Run as shipped in RTL, ArrowLeft moves focus to the tab on the *right* [L `keys.tabs["aegov (custom.js as shipped)"]`] |
| Drawer / side sheet entrance | from inline-start (right in RTL) | ✓ | — | translateX keyframes need RTL variants [V] | — | — | aegov drawer `placement:'left'` is physical [V]; vaul `direction` and Base UI `swipeDirection` are physical [V] |
| Numbers, phone numbers, postcodes, URLs, emails | never mirror; keep LTR | "numbers are also text" (localise numerals) [V] | "don't reverse numerals" | LTR, `text-align: match-parent` | phone **left-aligned in both** vs URLs/emails aligned to reading direction | — | see F3 |
| Shadows / light | elevation shadows fall straight down; an x offset is a brand decision | vertical elevation [K] | — | — | — | — | the checker reports x offsets as INFO |

**Arrow keys.** The WAI-ARIA APG contains no RTL guidance at all [V: `w3c/aria-practices@3f094fd`, no "right-to-left/RTL" under `content/`]. The implementations make the key follow the visual arrow:
- Radix swaps ArrowLeft and ArrowRight when `dir="rtl"` [V: `radix-ui/primitives@f7ecd5a roving-focus-group.tsx getDirectionAwareKey`].
- React Aria's `TabsKeyboardDelegate` notes "ArrowLeft always moves to the next tab in RTL". Its radio group, grid and slider (`reverseX`) are direction-aware too [V: `adobe/react-spectrum@62c27d9`].
- Firefox's guideline says the same.
- So do Chromium's native radios and range input [L].

An Arabic-first government system, aegov, does the opposite (DOM-order arrows) [V + L]. The rule stays "follow the arrow", on the strength of Firefox's written guideline and the four implementations. The skill should say that this is a convention some systems do not follow.

### F3. RTL mechanics, measured [L unless tagged]
**LTR data in RTL text** (`fixtures/bidi.html`, `results.json → bidi.values`):

| Value | Plain text in RTL |
|---|---|
| email `sara.ahmed@…`, IBAN `SA03 8000…`, URL, `INV-2026-0042`, `2026-09-28` | ok |
| `2024.sara@example.sa` | shows `sara@example.sa.2024` |
| `+966 50 123 4567` | shows `4567 123 50 966+` |
| `4111 1111 1111 1111` | shows `1111 1111 1111 4111` |
| `09:00 - 17:00` | shows `17:00 - 09:00` (meaning reverses) |
| `-4.2%` | shows `4.2%-` |
| an English phrase that *starts* with a number, e.g. "60% of visitors said yes" (GOV-SA page with `dir=rtl`) | the number jumps to the far end of the line: "…said yes 60%" (`results/oos/rtl-govsa-rtl.json`) |

`<bdi>` or `dir="ltr"` fixes all of them. Plain English that only *wraps* inside an RTL block is **not** scrambled: its later words sit on lower lines, further left, which is correct. Only its final punctuation moves (`fixtures/bidi-wrap.html`).

**Inputs:**
- Chromium's UA stylesheet forces `direction:ltr` only on `type=tel` and `type=date`. `email`, `url`, `text` and `number` inherit RTL, so an email that starts with digits scrambles as it is typed.
- `dir="auto"` on an empty field resolves to **ltr** in Chromium 141, so an Arabic placeholder sits on the left unless `text-align` is set.
- `text-align: match-parent`, Firefox's recommended pattern, works in Chromium only with the `-webkit-` prefix (BCD: Chrome 16 `-webkit-`; Firefox 40; Safari 15.4) [V BCD + L `CSS.supports`]. It then computes to `right`.

**Truncation:**
- An Arabic name in an LTR container with `text-overflow: ellipsis` loses its *beginning*. `dir="auto"` or `unicode-bidi: plaintext` keeps the start.
- `String.slice(0,5)` on "مُحَمَّدٌ…" yields 3 letters plus their harakat. Slice by `Intl.Segmenter` graphemes instead.

**Physical resets of UA logical defaults leak in RTL.**
- Bootstrap's LTR sheet sets `.nav { padding-left: 0 }` over the UA's `padding-inline-start: 40px`. Flipping `dir` then adds `padding-right: 40px`.
- Flip mode found this on both in-sample Bootstrap pages.
- It also found it out of sample on Bootstrap carousel, the GOV-SA pagination and tabs, and GOV.UK. The reviewer confirmed this.

**Bootstrap's RTLCSS build (the open-source project run):**
- `dashboard-rtl`: 0 FAIL. One WARN: `bi #puzzle` is not flipped, and Codex flips Puzzle, so this is one source's view only.
- `checkout-rtl`: 1 FAIL, the discount `−$5` renders `$5−`; and 1 WARN, the email field inherits RTL.
- The LTR sheet of the same pages cannot serve RTL by flipping `dir`: 421 of 2,549 rules are physical, and 12–18 box roots do not mirror.

**Transforms, `translate`, `@keyframes` and `transform-origin` never flip with `dir`** [V Firefox guide].
- The broken fixture's drawer (`left:0; translateX(-100%)`) enters from the left in RTL.
- The good fixture uses `translateX(calc(-100% * var(--dir)))` with `:dir(rtl){--dir:-1}`.

**Arabic-first design systems ship these anti-patterns** [V]:
- GOV-SA's 2020 system sets `[dir="rtl"] * { text-align: right; }`. Its licence is declared only as `"gpl-3.0"` in `package.json`; there is no LICENSE file. It also uses physical-plus-override pairs, e.g. `.govsa-checkbox__checkmark { left: 0 }` with `[dir=rtl] … { right: 0 }` and no reset of `left`.
- aegov uses `-ml-2.5 rtl:-mr-2.5 rtl:ml-0` and `md:text-left rtl:md:text-right`, forces `direction:ltr` on the slick carousel track, and uses the DOM-order arrow keys described in F2.

### F4. Arabic vertical metrics and clipping [L]
The line box is built from the font's ascent and descent. Arabic marks and hamza reach far past both.

**Minimum line-height that keeps the ink inside the line box.** This is the clip threshold for `overflow:hidden`, `truncate`, `line-clamp` and fixed-height boxes. It is **not** a reading-comfort rule: unclipped paragraphs may let marks spill into the leading.
- Method: ink from Chromium canvas `measureText` at 100 px, checked against pixels at 60 px; the arithmetic is within ≤ 1.7 px of the pixels (`results.json → vmetrics.fonts[*].floors`).
- **Two strings per class.** The second string is heavy on descenders and below-marks (kasra, kasratan), which the first lacks.
- Each class also includes the lighter classes (vocalised = max(plain, vocalised)), so these are **conservative minima for these strings at this size**, not universal constants.

| Face | `normal` | plain | vocalised | stacked hamza/shadda | Windows plain / voc / stacked | U+0600–06FF glyphs | missing |
|---|---|---|---|---|---|---|---|
| Noto Naskh Arabic | 1.70 | 1.02 | 1.31 | 1.84 | same | 256 | — |
| Noto Sans Arabic | 2.11 | 1.41 | 1.59 | 1.85 | same | 256 | — |
| Noto Kufi Arabic | 1.90 | 1.30 | 1.58 | 1.85 | same | 256 | — |
| IBM Plex Sans Arabic | 1.51 | 1.27 | **1.60** | 1.74 | same | 252 | — |
| Tajawal | 1.20 | 1.04 | 1.65 | 1.92 | **1.40 / 1.42 / 1.56** | **67** | گ چ ی ک **٫ ٬** ﷼ |
| Cairo | 1.87 | 1.37 | 1.59 | 1.59 | same | 102 | ﷼ |
| Almarai | **1.12** | **1.46** | 1.62 | 1.78 | same | 104 | — |
| Readex Pro | **1.25** | **1.67** | 1.71 | 1.89 | same | 73 | گ پ چ ی ک ﷼ |
| Alexandria | **1.22** | **1.46** | 1.86 | 1.96 | same | 101 | ﷼ |
| Vazirmatn | 1.57 | 1.17 | 1.48 | 1.85 | same | 142 | — |
| Noto Nastaliq Urdu | 2.50 | 2.03 (Urdu) | — | 2.6 | same | 214 | — |
| Latin reference: Inter / IBM Plex Sans / Noto Sans | 1.21 / 1.31 / 1.36 | 1.15 / 1.17 / 1.26 | accented capitals 1.27 / 1.21 / 1.26 | | | | |

What the table shows:
- **Platform.**
  - The main floors assume the engine builds the line box from **hhea**. That is what Chromium on Linux did for all 14 faces (`linuxMetricsFrom: "hhea"`). macOS CoreText and Android FreeType do the same [K].
  - Windows DirectWrite uses **winAscent/winDescent** unless `USE_TYPO_METRICS` is set [K]. Nine of the ten Arabic faces set it with typo = hhea, so their floors are the same on Windows.
  - **Tajawal does not set it.** Its hhea is 0.643/0.357 and its win metrics are 1.016/0.375. The same ink therefore needs **1.40 / 1.42 / 1.56** on Windows, against 1.04 / 1.65 / 1.92 on Linux and macOS. The platforms differ in both directions.
  - The reviewer's "about 1.29 vocalised on Windows" is my first vocalised string. The second string raises it to 1.42.
  - My earlier "Tajawal overflows its line box by 0.3 em" holds only for hhea platforms.
- **The second strings changed floors**: Plex vocalised 1.39 → 1.60, Cairo 1.12 → 1.59, Readex plain 1.25 → 1.67. The old "vocalised" string had fewer descenders than the plain one, as the reviewer noted. Max(plain, vocalised) fixes the ordering.
- **`line-height: normal` is too small even for plain text** in Almarai (1.12 vs 1.46), Alexandria (1.22 vs 1.46) and Readex (1.25 vs 1.67), and in Tajawal on Windows (1.20 vs 1.40).
- Tajawal lacks the Arabic decimal and group separators `٫ ٬`. `Intl` output for `ar-SA` or `ar-EG` therefore falls back to another font in the middle of a number.
- fontkit's own shaper reproduces the canvas ink extents to ≤ 0.013 em on all Arabic faces, so `fonts.mjs` could report the floors without a browser. fontkit throws on Noto Nastaliq's GPOS.

**Component clipping.** Six faces × three strings, with pixel truth against the probe (`lab/clip-probe.mjs`, `shots/clip-sheet.jpg`). These are the recipes the probe was developed on, so the numbers are in-sample. Each cell counts how many of the 6 faces lose ≥ 1 px of ink, then the maximum loss.

| Recipe | Plain | Vocalised | Stacked | Max loss |
|---|---|---|---|---|
| chip 12/16 px, truncate | 0 | 0 | 5 | 2 px |
| button, 36 px flex, `line-height: 1` | 0 | 0 | 0 | 0 px (the flex box is the clip) |
| table-cell div, 14/20, `truncate` | 0 | 4 | 6 | 4 px |
| nav link, 16/24, truncate | 0 | 2 | 6 | 5 px |
| heading, 28 px/1.1, `line-clamp-2` | 5 | 6 | 6 | 14 px |
| aegov hero recipe, 40 px/1.1, `line-clamp-2` | 5 (descenders, 2–4 px) | 5 | 6 | 16 px |
| **fix**: `overflow-x:clip; overflow-y:visible` + ellipsis | 0 | 0 | 1 | 1 px (a measurement artefact) |

When stacked marks are cut, hamza-plus-haraka reads as a different letter: لَأَنَّ becomes لآن in the sheet.

**The glyph-extent probe** (`lib/glyph-probe.mjs`):
- **Scroll containers.** It now judges a scroll container (overflow auto/scroll whose content scrolls on the block axis) against its **whole scrollable area**, not its scrollport. A line crossing the scrollport edge can be scrolled into view. Ink outside the scrollable area can never be seen, because ink overflow does not extend that area.
- Hidden, clip and line-clamp boxes are judged as before.
- **Validation** (`lab/clip-truth.mjs`, `results.json → cliptruth`). This uses a second, independent pixel truth. The same characters are drawn as an unclipped overlay on top of the line. The bands just outside the clip edges are captured three times: without the overlay, with it, and without it again. Pixels that change on their own are ignored. In a scroll container the line is first scrolled to the middle of the scrollport.

| Set | Cases | Probe as fixed: TP / FP / FN / TN | First version: TP / FP / FN / TN |
|---|---|---|---|
| In-sample recipes, original truth (page with vs without clips) | 126 | 53 / 0 / 4 / 69 (unchanged: no scrollers) | same |
| In-sample recipes, overlay truth | 108 (the 18 `overflow-x:clip` cases have no block-axis clipper) | 51 / 2 / 2 / 53 | same |
| **New: scroll containers** (6 faces × 2 strings × roomy panel, tight panel, scrolling `tbody`) | 96 text runs | **13 / 0 / 0 / 83** | 13 / **14** / 0 / 69 |
| **Out of sample: real pages** (GOV-SA RTL, Bootstrap dashboard/checkout/album/blog/carousel-rtl, tools/regress capture-reach-rtl, and my broken fixture); every flagged run plus ≤ 20 sampled unflagged runs per page | 68 | 2 / **0** / 0 / 66 | 2 / 3 / 0 / 63 (the reviewer's 3 GOV-SA `tbody` FAILs) |

Notes on the validation:
- The two truth methods give the same verdict on 105 of 108 recipe cases, with |difference| median 0 px, p90 1 px, max 1 px. Their disagreements are 1 px boundary cases.
- On real pages only 2 of 68 cases had real clipping, and both are on my own fixture. The real pages therefore show that false alarms are gone, not how sensitive the probe is on real pages. 6 carousel-rtl runs could not be measured (hidden slides).
- The probe runs in-page in well under 1 s.

**Mixed-script line pitch** (Inter 16 px, measure 300 px, `lab/mixed.mjs`):
- `line-height: normal` with font fallback gives uneven lines: a spread of 3–8 px, and 14 px with Nastaliq.
- A fixed line-height with fallback inside the same text node stays even.
- `<span lang="ar">` with its own family grows its lines by 1–4 px.
- Three fixes all reach 0 spread:
  - `line-height: 1` on the inline Arabic span (works everywhere);
  - `ascent-/descent-override`, which is "preview" in Safari and absent on iOS [V BCD];
  - one family name mapped by `unicode-range`.

**"Set Arabic 10–15% larger" depends on the face.** This is the size-adjust that would match each face's Arabic body (median top of ه م ص و ٮ) to Inter's x-height:
- 100–106% for Kufi-derived or geometric faces (Alexandria, Cairo, Noto Kufi);
- 111–118% for Almarai, Tajawal and Readex;
- 127–144% for Naskh-structured faces (Plex Arabic, Noto Sans and Naskh Arabic, Vazirmatn).

Matching alef height to cap height instead gives 89–112%. The honest range is 100–120%, chosen by the face's structure and judged on a mixed line.

**Saudi riyal sign U+20C1** (Unicode 17):
- Only 3 of 36 Google families have it: Noto Naskh Arabic, Roboto and Scheherazade New. The reviewer re-probed this and got the same result.
- `Intl` never outputs it; it gives `ر.س.` or `SAR`. Checked with Node ICU 78 / CLDR 48 and with Chromium 141 [L].
- The OFL one-glyph face `@emran-alhaddad/saudi-riyal-font` (1.3 KB woff2) also maps **A, B, C, D** and the private-use code point U+E900 [V]. Confine it with `unicode-range: U+20C1` [L renders].
- CDP `CSS.getPlatformFontsForNode` names the font that actually drew a glyph (here, Unifont as the system fallback), so a coverage check is possible.

**Justification.** Chromium 141 justifies Arabic with spaces only: the maximum word gap is 13 px against 3.8 px in a 15 rem column. `text-justify` arrives in Chrome 145 and is absent from Safari [V BCD].

**Bytes.** Google Fonts Arabic subset at weight 400 [L]:

| Face | KB |
|---|---|
| Tajawal | 8.7 |
| Readex | 9.5 |
| Alexandria | 12.2 |
| Cairo | 13.0 |
| Vazirmatn | 20.6 |
| Almarai | 30.9 |
| Plex | 41.8 |
| Noto Kufi | 42.9 |
| Noto Sans | 47.7 |
| Naskh | 51.4 |
| Nastaliq | 155.6 |

The small ones are small partly because their coverage is thin.

**The Saudi DGA Platforms Code**, as transcribed by the third-party `dga-design-auditor@0aa7c34` [V of that repository, not the DGA source]:
- sets IBM Plex Sans (Arabic) with display sizes such as 36/44 and **−2% tracking**;
- gives no Arabic-specific line heights and no tracking reset.

36/44 is 1.22, below the 1.60 that vocalised Plex Arabic needs in a clipping box.

### F5. Mobile [L unless tagged]
**Safe areas: emulate them only when the page opts in.**
- CDP `Emulation.setSafeAreaInsetsOverride` gives non-zero `env(safe-area-inset-*)` in headless Chromium 141 (59/34 applied). This corrects the baseline's claim that "env() insets are 0 in emulation".
- The override ignores `viewport-fit`. Without `viewport-fit=cover`, iOS keeps the page inside the safe area and `env()` is 0 [S: WebKit's "Designing Websites for iPhone X"; GitHub issue reports; WebKit bug 272779 on left/right insets]. Unconditional emulation is therefore **stricter than iOS** and produces FAILs no iPhone shows.
- `mobile-check.mjs` now applies the insets and raises the FAIL **only when the viewport meta has `viewport-fit=cover`**. Without it, it reports one INFO.
- The same gate now applies to the keyboard model. The resizes-content check runs only with `interactive-widget=resizes-content`. The default, resizes-visual, leaves fixed bars behind the keyboard and gets an INFO to check on a device.

**`CSS.forcePseudoState(':active')` verifies pressed states.** Transitions must be disabled first: Bootstrap's 150 ms `.btn` transition otherwise produced 2 false "no pressed state" reports.

**Playwright `isMobile + hasTouch`** matches `(hover: none)` and `(pointer: coarse)`.

**`mobile-check.mjs` results:**
- The fixed fixture is clean: 0/0/0 in portrait and in landscape.
- **Broken fixture** (portrait): 3 FAIL, 6 WARN, 1 INFO. It now has `viewport-fit=cover` and `interactive-widget=resizes-content`, as copied from a template, but its CSS never pads with `env()` and never sets scroll padding. The findings:
  - FAIL: 8 controls in fixed or sticky bars inside the inset zones (the header 49 px under the Dynamic Island; the tab bar in the home-indicator zone);
  - FAIL: a `.row:hover .actions` reveal that is hidden on touch;
  - FAIL: 5 `type=number` fields for phone, card, CVC, postcode and OTP;
  - WARN: 19 keyboard and autofill problems;
  - WARN: 15 controls with no pressed state (tap highlight turned off);
  - WARN: 15 targets under 44 px, and 11 packed closer than 8 px;
  - WARN: the fixed buy bar covers 3 focused fields with the keyboard open;
  - WARN: the primary action sits in the top third, needing a regrip for either thumb.
- **The same broken screen with a plain viewport meta** (`&meta=plain`): 2 FAIL, 5 WARN, 3 INFO. The safe-area and keyboard checks drop to INFO; everything else is unchanged.
- **Bootstrap `checkout-rtl` at phone width** (no cover): 0 FAIL, 3 WARN, 3 INFO. The WARNs are 44 px targets (a 38 px button and 19 px footer links), no pressed state on 3 links, and card/CVC fields that bring the text keyboard with 4 missing autocompletes. The former "no viewport-fit" WARN is now an INFO.
- **Out of sample** (7 pages): the first version raised 4 FAIL examples and the gated version 2. The two dropped FAILs are Bootstrap offcanvas-navbar's ordinary `fixed-top` navbar, whose page has no cover. The two kept are GOV.UK-style 18 px icon buttons that wrap 3 px apart at 390 px, so the WCAG 2.5.8 spacing exception fails; this is a TP.

**Thumb evidence:**
- Hoober 2013: 1,333 observations; 49% one-handed, 36% cradled, 15% two-handed; people are most accurate at the centre [S A List Apart].
- About 7 mm error at the centre vs about 11 mm at the edges [K].
- The overlay (`shots/thumb-*.jpg`) is a stated heuristic: pivot 5 mm outside the lower edge, 25–65 mm natural reach, 85 mm stretch, a 5 mm edge band. Only its coarse conclusion is robust: a primary action in the top third needs a regrip for either hand.

**Sheets:**
- **vaul is unmaintained** (README; latest npm 1.1.2 on 2024-12-14) [V]. Its constants:
  - dismiss above 0.4 px/ms velocity or past 25% of the height;
  - drag locked for 100 ms after an inner scroll;
  - 0.5 s ease `[0.32,0.72,0,1]`.

  Its direction is physical, and its `Handle` is a `div onClick`, so snap points cannot be cycled by keyboard [V].
- **Base UI `@base-ui/react@1.8.0`** (2026-09-04, MIT) has a Drawer [V]:
  - `swipeDirection` is physical (up/down/left/right);
  - it has `snapPoints` and `snapToSequentialPoints`;
  - it closes on Android back through `CloseWatcher` (the code says "Chromium-only"; Android only);
  - it handles the keyboard with a VisualViewport-based provider.

**Platform support** [V: generated by `lib/compat.mjs table()` from BCD 8.1.3 and web-features 3.40.0, per-key Baseline status; "preview" = Safari Technology Preview]:

| Feature | Chrome | Chrome Android | Firefox | Firefox Android | Safari | Safari iOS | Baseline |
|---|---|---|---|---|---|---|---|
| VisualViewport | 61 | 61 | 91 | 68 | 13 | 13 | high (2024-02-10) |
| VirtualKeyboard API | 94 | 94 | no | no | no | no | no |
| env(keyboard-inset-*) | 94 | 94 | no | no | no | no | — |
| interactive-widget | no | 108 | no | 133 | no | no | — |
| viewport-fit | no | 135 | no | 79 | no | 11 | — |
| env(safe-area-inset-*) | 69 | 69 | 65 | 65 | 11 | 11 | high (2022-07-15) |
| CloseWatcher | 126 | 126 | 149 | 149 | preview | no | no |
| dialog closedby | 134 | 134 | 141 | 141 | preview | no | no |
| Navigation API | 102 | 102 | 147 | 147 | 26.2 | 26.2 | low (2026-01-13) |
| navigator.share | 128 | 61 | 71 (flag) | 79 | 12.1 | 12.2 | no |
| navigator.vibrate | 32 | 32 | 16–129, removed | 79 (partial) | no | no | no |
| input switch | no | no | no | no | 17.4 | 17.4 | no |
| saveData | 65 | 65 | no | no | no | no | no |
| prefers-reduced-data | 85 (flag) | 85 (flag) | no | no | no | no | no |
| overflow-x: clip | 90 | 90 | 81 | 81 | 16 | 16 | high (2025-03-12) |
| overflow-clip-margin | 90 (partial) | 90 (partial) | 102 | 102 | no | no | no |
| text-align: match-parent | 16 (-webkit-) | 18 (-webkit-) | 40 | 40 | 15.4 | 15.4 | no |
| text-justify | 145 | 145 | 55 | 55 | no | no | no |
| @font-face ascent-override | 87 | 87 | 89 | 89 | preview | no | no |
| @font-face size-adjust | 92 | 92 | 92 | 92 | 17 | 17 | low (2024-07-25) |

### F6. Haptics
Support [V BCD, table above]:
- `navigator.vibrate` works on Chrome and Samsung Internet on Android.
- Firefox Android is "partial": it returns true but does not vibrate. Firefox desktop removed it in 129.
- Safari and iOS never support it.
- Chrome requires a user gesture (since 60) and blocks it in cross-origin iframes (since 55).
- `<input type=checkbox switch>` exists only in Safari 17.4+. Chromium treats it as a plain checkbox [L].

On iOS the haptic comes from toggling a switch:
- `ios-haptics@3.2.0` (MIT, 1.2 KB entry) lays a transparent `<label>` over the element. The label forwards the user's real tap to a hidden switch [V code].
- `web-haptics@0.0.6` (MIT) emulates intensity on Android by pulse-width modulation of `vibrate`, and toggles switches on iOS [V]. Its presets (`patterns.ts`) are: selection 8 ms, rigid 10 ms, light 15 ms, medium 25 ms, heavy 35 ms, success 30 + 40 ms (60 ms apart), warning 40 + 40 ms, error four pulses of 40–50 ms, and buzz 1,000 ms [V].
- Search summaries say programmatic triggering worked on iOS 17.4–26.4 and that Apple patched it in 26.5 [S HN/npm pages]. That is consistent with ios-haptics moving to forwarding real taps.

Guidance:
- **Android**: "Given the choice of buzzy haptics or no haptics for touch feedback, choose no haptics", and use the system constants [S developer.android.com]. The web cannot reach those constants.
- **Apple**: short haptics that complement discrete events; avoid overuse [S HIG "Playing haptics"].
- **web-haptics' bundled agent skill (`SKILL.md`) contradicts itself** [V]:
  - its rules say "Do not overuse. If every tap vibrates, nothing feels special";
  - its anti-patterns list "Haptic on every tap (fatigue)";
  - yet its quick reference maps "Primary button tap", "Secondary button" and "Modal appear" to haptics.

  An agent that follows the quick reference will overuse haptics.

## Experiments
Folder: `/home/user/website-redesign-skill/research/stage2/experiments/S8-rtl-mobile-haptics/`.

Re-run with `npm install && bash fetch.sh && node run.mjs`. It takes about 4 minutes on the shared 4-CPU machine (3 min 58 s). It rebuilds `results.json`, `results/rtl/*.json`, `results/mobile/*.json`, `results/oos/*.json` and `shots/*.jpg`. `node run.mjs <part>` refreshes one part and merges it; the parts are icons, compat, vmetrics, clip, cliptruth, mixed, bidi, keys, files, haptics, rtl, auditBaseline, mobile and oos.

`fetch.sh` pins every input:
- google/fonts@23e54b5 and twbs/bootstrap@46a8804;
- Codex `icons.ts`@8a1caaf and Flutter `icons.dart`@929df56;
- aegov `custom.js`@d309bb5;
- GOV-SA@babbe60 (dist page, with its CSS and JS tags added, as LTR and with `dir=rtl`);
- this repository's `tools/regress` pages, read with `git show f62da94:…` so the working tree is untouched.

Fonts and node_modules are git-ignored. The folder is 1.4 MB without them. The run used Chromium 141.0.7390.37 and Node 22.22.2.

| Built | File | Result |
|---|---|---|
| Bilingual component page, EN/AR, fixed and broken variants | `fixtures/bilingual.html`, `bilingual.css`, `bilingual-broken.css`, `icons.js` | `shots/bilingual-ar-good.jpg`, `shots/bilingual-ar-broken.jpg` |
| RTL checker | `rtl-check.mjs` (as served, or `--flip` pseudo-RTL mirror diff; `legacy` option = first version, for before/after) | tables below |
| Icon name lists, generated from the sources | `lab/icon-lists.mjs` → `lib/icon-names.json`; classifier `lib/icon-classify.mjs` | 161 mirror keys (Codex 89 flip + 10 RTL assets; Flutter 76); only 4 keys mirrored by both sources |
| Bidi regression page (wrapped English sentence, wrapped brand name, multi-sentence paragraph, isolated phrases; wrapped phone number, time range, signed %) | `fixtures/bidi-wrap.html` | first version 7 FAIL (4 FP); fixed 3 FAIL (all seeded positives) + 1 WARN (punctuation only) |
| Glyph-extent probe, two pixel truths | `lib/glyph-probe.mjs`, `lab/clip-probe.mjs`, `lab/clip-truth.mjs` | F4 |
| Vertical metrics, coverage, fontkit vs canvas, Windows arithmetic | `lab/vmetrics.mjs` | F4 table |
| Mixed-script line pitch | `lab/mixed.mjs` | F4 |
| Bidi fields, truncation, justification, riyal | `lab/bidi.mjs`, `fixtures/bidi.html`, `lab/fontfiles.mjs` | F3, F4; `shots/bidi.jpg` |
| RTL keys: native controls, tablists, the aegov handler as shipped, `widgets.mjs` | `lab/keys.mjs`, `fixtures/rtl-keys.html` | F1, F2 |
| Mobile checker (cover/keyboard-gated) with thumb overlay | `mobile-check.mjs`, `fixtures/mobile.html` (`?variant=broken`, `&meta=plain`), `mobile*.css` | F5; `shots/thumb-*.jpg` |
| Haptics and compat (the table is generated) | `lab/haptics.mjs`, `lib/compat.mjs` | F5, F6 |
| `audit.mjs` baseline | `run.mjs → auditBaseline` | F1 |
| Out-of-sample set: first version vs fixed, with judged FAILs | `run.mjs → oos`, `oos-labels.json` | table below |

**RTL checker on the in-sample pages** (FAIL/WARN/INFO, ms):

| Run | FAIL | WARN | INFO | ms |
|---|---|---|---|---|
| fixture AR good (as served) | 0 | 0 | 1 | 471 |
| fixture AR broken | 10 | 3 | 4 | 493 |
| fixture EN good `--flip` | 0 | 0 | 1 | 5,826 |
| fixture EN broken `--flip` | 8 | 5 | 3 | 5,651 |
| Bootstrap dashboard-rtl / checkout-rtl | 0 / 1 | 1 / 1 | 4 / 2 | 685 / 317 |
| Bootstrap dashboard / checkout `--flip` | 1 / 2 | 3 / 3 | 3 / 1 | 2,693 / 739 |

Timings vary run to run by up to 2× (the reviewer saw 7.0 s where I saw 9.1 s). Compare them only as orders of magnitude.

**Of the 24 seeded defects:**
- **As served** caught all 24: 14 at FAIL, 1 at WARN, and 9 only as INFO. The 9 are physical layout rules, and as-served mode cannot tell deliberate from wrong.
- **Flip** raised 14 to FAIL and 5 to WARN, and 1 appeared only as INFO. Two margins moved from FAIL to WARN because they are only 8 px off (see Changes). It missed 4: the Arabic-only typography, since flip mode has no Arabic text.
- **Icons.**
  - As served, it flagged 15 of 15 directional icons and 5 of 5 never-mirror icons.
  - Flip flagged 11 of 15 directional icons (3 are in the off-canvas drawer) and 4 of 5 never-mirror icons.
  - Help and logout, previously counted as directional, are now reported as "sources disagree" (INFO), as the matrix says.
- No false alarms on the fixed variant in either mode.

**Out-of-sample set.** The pages were not used to build the checkers; they are the reviewer's 15 plus the aegov tab page and `bidi-wrap.html`. "Examples" counts individual FAIL items.

| Page | Mode | First version: FAIL examples | Fixed: FAIL examples | Fixed F/W/I |
|---|---|---|---|---|
| Bootstrap album-rtl | as served | 0 | 0 | 0/0/2 |
| Bootstrap blog-rtl | as served | 6 (italic ×6) | 8 (italic ×6; chevron-right in "أكمل القراءة" ×2, **now FAIL**) | 2/0/2 |
| Bootstrap carousel-rtl | as served | 1 (© 2017–2026) | 1 | 1/0/2 |
| Bootstrap album / carousel / sidebars | flip | 2 / 11 / 28 | 2 / 10 / 24 | 1/2/1, 2/3/1, 1/3/1 |
| GOV-SA | flip | 46 (mirror 43, glyph 3) | 38 (mirror) | 1/3/1 |
| GOV-SA with `dir=rtl` | as served | **56** (bidi 53, glyph 3) | **1** ("60% of vistors…") | 1/1/2 |
| regress parity-new / capture-reach-rtl / audit-numbers | as served | 0 / 0 / 0 | 0 / 0 / 0 | — |
| regress parity-old | as served | 1 (+12.4%) | 1 | 1/0/0 |
| regress GOV.UK | flip | 8 (bidi 2 on a wrapped error message) | 6 (align 4, mirror 2) | 2/3/0 |
| regress dashboard / app-traps | flip | 10 / 0 | 7 (`th` align) / 0 | 1/3/1, 0/0/0 |
| aegov tabs (as shipped) | as served | 1 (keys) | 1 | 1/0/0 |
| `bidi-wrap.html` | as served | 7 | 3 | 1/1/0 |
| **Total RTL** | | **177** | **102**: 94 TP, **0 FP**, 8 not traced | |
| **Total mobile** (7 pages) | | 4 | 2 (2 TP) | |

Notes on the out-of-sample set:
- Every fixed FAIL example is judged in `oos-labels.json`, with a reason for each.
- Flip-mode mirror FAILs answer "can this LTR build serve RTL by flipping `dir`?". Those that name the physical value that stays are counted TP.
- The 8 untraced ones are GOV-SA flip boxes 19–959 px off, where GOV-SA's own `[dir=rtl]` overrides are also in play.
- By check, fixed: bidi 6/6 TP, icons 2/2, Arabic typography 6/6, align 13/13, keys 1/1, targets 2/2.

**Glyph probe validation:** see F4.

**Keys** [L `keys.tabs`]:

| Tablist | ArrowLeft moves to | Follows the arrow |
|---|---|---|
| RTL-aware (Radix/React Aria style) | next tab, on the left | yes |
| Copied from LTR | previous tab, on the right | no |
| aegov `custom.js` as shipped | previous tab, on the right | no |

## Decision guidance for the skill

**`multilingual.md` §1, icons (replaces the icon bullet).**
- **Mirror**:
  - back/next/prev arrows and chevrons (breadcrumbs, pagination, row open);
  - undo/redo (or choose the circular reading, as Material allows);
  - reply/forward/send, external link, lists, indent;
  - sliders and progress along a line, steppers, rating fills (half-star);
  - the "?" of help for Arabic, Persian and Urdu (not Hebrew or Yiddish).
- **Never mirror**:
  - checkmarks (Material, Firefox and Codex agree; this replaces "systems disagree");
  - media controls and timelines (keep the player `dir="ltr"`);
  - clocks, history, refresh and spinners;
  - the search magnifier and pencil/edit (right-handed objects);
  - logos, and text inside icons (swap language-specific glyphs such as B/I/U).
- **Record a decision** where the sources disagree:
  - volume: Material and Codex mirror the speaker, Flutter does not. Outside a media player mirror it; inside an LTR player follow the player;
  - log in/out and quote marks: Codex flips, Flutter does not;
  - people icons: Material and Codex mirror a figure facing text;
  - the chart time axis: Material and Firefox run time right to left, Apple and Codex keep graphs.
- Never write a blanket `[dir=rtl] svg { transform: scaleX(-1) }`.

**`multilingual.md` new §1b, components in RTL.**
- Tabs, bottom nav and steppers follow DOM order, with the first item on the right.
- **Arrow keys follow the arrow**: ArrowLeft moves left, which is "next" in RTL.
  - Sources: Firefox's guideline, Radix, React Aria, and native radios and range inputs.
  - APG is silent.
  - aegov does the opposite, so do not copy an Arabic system's tab script without checking this.
- Drawers and side sheets enter from inline-start. Library directions (vaul, Base UI `swipeDirection`, aegov placement) are physical: map them by `dir`.
- Transforms, keyframes and `transform-origin` need `var(--dir)` or `:dir(rtl)` variants.
- Scroll-snap reels mirror for free. JS carousels must be checked: first slide on the right, "next" arrow pointing left.
- Position toasts and dropdowns with `inset-inline-*`. Watch for toasts covering row actions at inline-end.
- Never reset a UA logical default with a physical property: use `padding-inline-start: 0`, not `padding-left: 0`, on lists. The leak appeared on every system tested.
- Never write physical-plus-override pairs (`left:0` + `[dir=rtl] right:0`). Use one logical property.

**`multilingual.md` new §1c, LTR data in RTL.**
- Use the scramble table (F3).
- Put phone numbers, card numbers, time ranges, signed values and English phrases that *start with a number* in `<bdi dir="ltr">` or `<span dir="ltr" lang="en">`.
- English that only wraps is fine; its end punctuation moves, so mark `lang`/`dir` on embedded phrases.
- Fields for email, URL, phone, IBAN, card and codes get `dir="ltr"`, aligned to the form with `.form:dir(rtl) input[dir=ltr] { text-align: right }` or `text-align: -webkit-match-parent; text-align: match-parent`. Chromium needs the prefix.
- Don't rely on `dir="auto"` for empty fields: in Chromium it resolves to ltr.
- User-content names with an ellipsis get `dir="auto"` or `unicode-bidi: plaintext`.
- Truncate in JS with `Intl.Segmenter`, never with `slice`.

**`multilingual.md` §2 (extends; replaces rule 3's fixed "10–15%" and adds a clipping rule; the 1.6–1.8 body-leading rule stands).**
- **Clipping boxes.** Every Arabic text box that clips (`truncate`, `line-clamp`, a fixed-height chip, button or row with `overflow:hidden`, a scroll panel with no block padding) needs a line-height at or above the floor for the content it will hold.
  - The conservative minima from the F4 table: plain 1.0–1.7 by face, vocalised 1.3–1.9, stacked/Quranic 1.6–2.0, Nastaliq 2.1+.
  - Use the chosen face's own number (from `fonts.mjs`), not one constant.
  - Or truncate with `overflow-x: clip; overflow-y: visible; text-overflow: ellipsis` (Safari 16+).
- **`line-height: normal` is not safe** for Almarai, Alexandria, Readex or (on Windows) Tajawal.
- **Platform-dependent faces.** Faces with `USE_TYPO_METRICS` off and win ≠ hhea (Tajawal) change their line box between Windows and macOS/Linux [K]. Take the larger floor of the two: for Tajawal, plain 1.40, vocalised 1.65, stacked 1.92.
- Arabic headings never at Latin's 1.1–1.2.
- **Size-adjust by structure**: Kufi and geometric faces 100–108%, Naskh-structured faces 110–120%; judge on a mixed line.
- **Arabic inline in Latin paragraphs**: one family name mapped by `unicode-range`, or `:lang(ar) { line-height: 1 }` on inline spans. `ascent-override` is not shipped in Safari.
- **Check coverage before choosing a face**: Tajawal lacks ٫ ٬ گ چ; Readex lacks the Persian letters.
- **Riyal sign**:
  - add a `unicode-range: U+20C1` face (a Noto Naskh subset or the OFL one-glyph face) under the brand family;
  - insert the sign via `formatToParts`, because `Intl` won't;
  - give it a text alternative ("ريال سعودي").
- Never justify Arabic UI text; never insert tatweel into content.
- Arabic fonts cost 9–51 KB per weight subset (156 KB for Nastaliq); preload one.

**`multilingual.md` §4 checks (extends).** Add checks for:
- keys that follow the arrows;
- drawer side;
- LTR fields;
- glyph clipping;
- coverage and the riyal sign;
- the flip run plus the as-served run.

**`responsive.md` §3 (extends).**
- `viewport-fit=cover` is a design choice for edge-to-edge layouts. Once it is set, every fixed or sticky bar pads with `max(…, env(safe-area-inset-*))`.
- Without cover the browser keeps the page inside the safe area, and there is nothing to pad.
- Fixed bars need `scroll-padding-block-end`, or hide while typing, when `interactive-widget=resizes-content` is set.
- The keyboard-open check is a model (viewport minus about 336 px [K]).

**`responsive.md` §4 input table (extends).**

| Purpose | Markup |
|---|---|
| email | `type=email autocomplete=email autocapitalize=off` |
| phone | `type=tel autocomplete=tel` |
| card | `inputmode=numeric autocomplete=cc-number` |
| CVC | `inputmode=numeric autocomplete=cc-csc` |
| OTP | `inputmode=numeric autocomplete=one-time-code` |
| postcode | text, `autocomplete=postal-code` |
| amount | `inputmode=decimal` |
| search | `type=search enterkeyhint=search` |

Use `type=number` only for true quantities. Keep font-size ≥ 16 px. Give every control a visible `:active` state when `-webkit-tap-highlight-color` is transparent.

**`responsive.md` new §5b, sheets and the back gesture.**
- A bottom sheet built on `<dialog>` has:
  - a grab handle *and* a close button;
  - snap points reachable without dragging (a button cycles them);
  - dismiss thresholds as in vaul (0.4 px/ms or 25%);
  - an inner-scroll lock;
  - body scroll locked;
  - Android back closing it (`CloseWatcher`, or a history entry where it is absent; Safari iOS has neither CloseWatcher nor `closedby`);
  - iOS edge-swipe treated as history back;
  - side sheets entering from inline-start.
- Prefer a maintained library (Base UI Drawer) or native `<dialog>` over vaul.
- Use native `input type=date` pickers on phones.
- Use `navigator.share` with a copy fallback: absent on Firefox desktop (flag only), present on Firefox Android 79+ and Safari 12.1+.
- Use `Save-Data` only as a server hint (Chromium only).
- Save state on `visibilitychange`/`pagehide` for interruptions [K].

**`app-ui.md` §10 Feel, new haptics rules.**
1. Haptics are an optional extra channel: iPhones get none from `vibrate`, and Firefox Android is silent.
2. At most one haptic per user action, short and single, fired at the moment of a visible state change. Never on ordinary taps, scrolling, typing or anything the user did not trigger.
   - As a starting point for durations, web-haptics' presets are about 8–15 ms for a selection tick and 25–35 ms for a confirm, with success as 2 pulses [V `patterns.ts`]. These are a library's choices, not platform guidance.
   - Android's guidance is to use the system constants [S], which the web cannot reach.
3. Always pair a haptic with a visual state change.
4. Use a real `<input type=checkbox switch>` for real toggles (native haptic in Safari). Do not lay the iOS switch hack over general buttons: it is undocumented and Apple has already changed it [S].
5. Offer an off switch if more than two or three moments buzz.
6. Do not take web-haptics' quick reference as policy: it maps every button press and modal to a haptic and contradicts its own anti-patterns.

**`accessibility.md` §3 keyboard contracts (extends).** "In RTL, Left/Right follow the visual arrow. APG does not say; Firefox's guideline, Radix, React Aria and native controls agree; some Arabic design systems, such as aegov, use DOM order."

**`visual-qa.md` / `technical-qa.md` (extends): device-only checks.** These cannot be verified here; tell users to check them on an iPhone:
- toolbar collapse and `svh`/`dvh`;
- fixed bars and the keyboard (`visualViewport`);
- safe areas with `viewport-fit` auto vs cover, in portrait and landscape, including iOS 26 bottom bars without cover (see Open questions);
- input zoom below 16 px;
- `:active` without a touchstart listener [K];
- date and select pickers, rubber-band scrolling, the switch haptic;
- Arabic font fallback and the U+20C1 system glyph;
- Tajawal-like faces on Windows.

**Scripts** (recommendations; nothing under `skills/` was edited):
- **`audit.mjs` (extends).** When the page is RTL or holds Arabic, add a block (about 0.5–0.9 s per page):
  - (a) the glyph-extent probe (`lib/glyph-probe.mjs`, scroll-aware): FAIL on a ≥ 1 px ink cut. Run it for all scripts, since accented Latin capitals clip too.
  - (b) `text-align:left` on block text in RTL, excluding numbers: FAIL.
  - (c) letter-spacing ≥ 0.01 em or italic on Arabic runs: FAIL.
  - (d) LTR text laid out out of order *within one line box*. FAIL when letters or digits reorder, or when a data-like value (sign, currency, time range) reorders. WARN when only end punctuation moves. Out of sample: 6/6 TP, where the first version raised 64 examples with 58 FP. Also: LTR-data inputs resolved to RTL: FAIL if scrambled, else WARN.
  - (e) off-canvas panels parked off the left in RTL: FAIL.
  - (f) icon checks, with names from the generated lists (`lib/icon-names.json`):
    - FAIL when a never-mirror icon backed by two or more sources is flipped;
    - FAIL when an arrow points against its label ("next/التالي/أكمل/المزيد…" must point left);
    - WARN for single-source names and unflipped directional icons;
    - INFO where the sources disagree;
    - unknown names never FAIL.
  - (g) a count of physical declarations and x-moving `@keyframes`: INFO/WARN.
  - (h) glyphs drawn by a system fallback font (`CSS.getPlatformFontsForNode`, sampled): WARN.

  At phone width, add:
  - hover-only reveals (rule scan plus a visibility test): FAIL;
  - no pressed state with the tap highlight off (`forcePseudoState`, transitions disabled): WARN;
  - the input keyboard table: `type=number` for codes is a FAIL; a wrong keyboard, missing autocomplete or < 16 px is a WARN;
  - **controls inside the emulated insets: FAIL only when the viewport meta has `viewport-fit=cover`**; without cover, one INFO;
  - the keyboard-cover model only with `interactive-widget=resizes-content`;
  - the primary action in the top third (regrip for both thumbs): WARN.

  The existing clipped-text probe compares boxes, not ink, and should call the new probe.
- **New `rtl.mjs`** (the `--flip` mode of `rtl-check.mjs`): a pseudo-RTL mirror diff of boxes (FAIL when > 8 px from the mirrored place, WARN at 3–8 px), kept physical values, "RTL adds padding" leaks and icon pixels (coarse 8×8 ink grids after cropping). It is heavier (1–6 s), so it stays a separate script for the Phase 6 RTL pass. It needs a brief that names the file.
- **`widgets.mjs` (fix).** The tabs contract must read the tablist's direction and expect ArrowLeft to reach the next tab in RTL, or better, the visually adjacent tab in the arrow's direction.
- **`capture.mjs` (extends).**
  - `--dir rtl` sets `html[dir]` via `addInitScript` for pseudo-RTL captures; this is the flag missing from the checklist.
  - At phone widths, apply safe-area insets through CDP **only when the page's viewport meta has `viewport-fit=cover`**, so bars show whether they pad; `--insets 0` disables this.
  - **The thumb overlay does not belong in `capture.mjs`** (see Rejected).
- **`fonts.mjs` (extends).** Report:
  - hhea/typo/win metrics and `USE_TYPO_METRICS`, with a flag when the line box differs by platform;
  - `line-height: normal`;
  - the minimum line-height per content class (plain, vocalised, stacked; two strings each) via `fontkit.layout`, which is ≤ 0.013 em off Chromium;
  - Arabic-block coverage and missing ڤ گ پ چ ی ک ٫ ٬ ﷼ ؟ ٪;
  - U+20C1.

## Rejected ideas and why
- **The thumb overlay in `capture.mjs`.** The reach model's parameters are not measured, and the skill rightly calls heat maps folklore. The overlay invites cramming actions into the lower third. Keep only the one robust conclusion, as an audit WARN.
- **Flip mode alone.** It missed all 4 Arabic-typography defects.
- **The static CSS scan alone.** It cannot tell a deliberate physical value (numeric columns) from a mistake, so it stays INFO.
- **Unconditional safe-area emulation**, as I first proposed. It FAILs ordinary sticky headers on pages without cover, where iOS itself keeps them clear.
- **Sorting bidi tokens over a whole text node**, as I first did. Every wrapped English phrase in RTL read as "scrambled": 58 of 64 examples out of sample were FP.
- **Hand-written icon name regexes.** They contradicted the sources: half-star, user-add and sort were classed "never", and double chevrons and box arrows were missed.
- **`ascent-override` as the mixed-script fix**: not in shipped Safari.
- **`text-align: match-parent` unprefixed**: fails in Chromium.
- **`dir="auto"` on every field**: an empty field resolves to ltr.
- **Blanket RTL rules** (GOV-SA's `[dir=rtl] * { text-align:right }`, flipping every icon): they break LTR islands, numbers and media.
- **One size-adjust for all Arabic faces**: the measured spread is 100–144%.
- **One line-height floor for all Arabic faces**: plain text alone needs 1.0–1.7 depending on the face.
- **vaul as the default sheet**: unmaintained, physical direction, handle not keyboard-operable.
- **The iOS switch-overlay haptic on general buttons**: undocumented, patched once already [S], and the invisible label intercepts taps.
- **Justified Arabic in the browser; hand-inserted tatweel.**
- **`overflow-clip-margin` as the clipping fix**: not in Safari; `overflow-x: clip` covers the case.

## Open questions and limits of this evidence
- **Engine.** Only headless Chromium 141 on Linux was available. Nothing about WebKit or iOS Safari is verified here; the device list is in the guidance above. Firefox's bidi and form behaviour is also unverified.
- **Other platforms' line boxes** (Windows DirectWrite win metrics, macOS CoreText hhea) are [K]. The Windows floors are arithmetic on measured ink with win metrics, not a Windows render.
- **Floors** come from two strings per class at one size (60 px pixels, 100 px canvas). They are minima for those strings. Stacked marks in Quranic text can go further.
- **Safe areas without cover.** I rely on WebKit's documentation and on reports that `env()` is 0 without cover [S]. Some GitHub issue titles report bottom bars under the home indicator without cover on current iOS; I cannot verify that. The INFO tells users to check bottom bars on a device.
- **Keyboard.** The check models only resizes-content (Android with the meta tag). iOS and Chrome default to resizes-visual, which is not modelled.
- **Haptics** cannot be felt in headless Chromium. `vibrate()` returns true because activation was already set by Playwright, so gesture gating was not observable.
- **Riyal.** The survey reflects Google Fonts on 2026-09-28. Device system fonts (iOS 26, Android 16, Windows) are unknown, and screen-reader names for U+20C1 are untested.
- **Glyph probe:**
  - It measures with the element's font stack, so runs that mix fallback fonts are approximate.
  - It covers text nodes, not input values.
  - It costs one Range call per character (capped at 400).
  - Its recipe validation is in-sample.
  - The real-page set held only 2 truly clipped runs, so its sensitivity on real pages is not established; only the absence of false alarms is.
- **Out-of-sample FAIL judgements** in `oos-labels.json` are mine (with reasons), not independent. 8 GOV-SA flip boxes are untraced.
- **Icon names.** The flip icon check misses off-screen icons. Name matching depends on class names, `data-icon` and `use href`. The generated lists inherit name collisions across libraries: Codex "Update" is horizontal arrows while Material "update" is circular, and it gets only a WARN because only one source backs it.
- **Secondary sources.** The DGA rules were read through a third-party transcription. Material text is the 2014 version via a GitHub copy; current M2/M3 wording and Apple wording are from search snippets.
- **Charts.** The claim that "most Arabic financial products" draw left-to-right time axes remains unverified.

Sources: [Material bidirectionality (2014 text, GitHub copy)](https://github.com/albatrosary/material-design-jp/blob/master/Usability/Bidirectionality.md) · [Material M2 bidirectionality](https://m2.material.io/design/usability/bidirectionality.html) · [Apple HIG right-to-left (archive)](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPInternational/SupportingRight-To-LeftLanguages/SupportingRight-To-LeftLanguages.html) · [Codex bidirectionality](https://doc.wikimedia.org/codex/latest/style-guide/bidirectionality.html) · [Designing Websites for iPhone X (WebKit)](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) · [WebKit bug 272779](https://bugs.webkit.org/show_bug.cgi?id=272779) · [Safe-area insets resolve to zero without viewport-fit=cover (issue)](https://github.com/SimianW/share-tally/issues/136) · [Bottom tab bar under the home indicator (issue)](https://github.com/ACMaster03/asia-nomad-trip-planner/issues/69) · [How We Hold Our Gadgets](https://alistapart.com/article/how-we-hold-our-gadgets/) · [Android haptics principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles) · [HIG Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) · [ios-haptics](https://github.com/tijnjh/ios-haptics) · [HN: Web-Haptics](https://news.ycombinator.com/item?id=47268240) · [Saudi riyal sign](https://en.wikipedia.org/wiki/Saudi_riyal_sign) · [Inter issue #842](https://github.com/rsms/inter/issues/842) · [Saudi-Riyal-Font](https://github.com/emran-alhaddad/Saudi-Riyal-Font) · [aegov-dls](https://github.com/TDRA-ae/aegov-dls) · [dga-design-auditor](https://github.com/MuathAlfouzan/dga-design-auditor) · [GOV-SA design system](https://github.com/GOV-SA/design-system-gov.sa)

Key files:
- `/home/user/website-redesign-skill/research/stage2/experiments/S8-rtl-mobile-haptics/run.mjs`
- `…/rtl-check.mjs`
- `…/mobile-check.mjs`
- `…/lib/glyph-probe.mjs`
- `…/lib/icon-classify.mjs`
- `…/lib/icon-names.json`
- `…/lab/clip-truth.mjs`
- `…/fixtures/bidi-wrap.html`
- `…/oos-labels.json`
- `…/results.json`
- `…/shots/`

## Changes after review

1. **Blocking: the bidi detector ignored line breaks.** Accepted.
   - `staticChecks` now groups tokens by line box (vertical centre within half a line of the line's first token) and compares visual and logical order within each line. `punctuationOnly` is computed per line.
   - Added `fixtures/bidi-wrap.html` with 4 negative cases (wrapped cell, wrapped sentence, wrapped brand name with a number, isolated phrases), 1 WARN case (a multi-sentence paragraph) and 3 positive cases (a phone number that wraps, a time range, a signed %). First version: 7 FAIL examples (4 FP). Fixed: exactly the 3 positives, plus 1 WARN.
   - Out of sample, bidi FAIL examples fell from 64 to 6, all TP: carousel ©, parity-old +12.4%, and the 3 seeded ones. The sixth, which the reviewer's patch did not settle, is GOV-SA's "60% of vistors said yes…". Here a *number* moves to the far end of the line, so it is a TP, not punctuation.
   - GOV-SA with `dir=rtl` went from 53 bidi FAIL examples to 1. GOV.UK flip went from 2 to 0.
   - Kept in audit (d) as FAIL, with the validation numbers attached.
2. **Blocking: safe-area FAIL without cover.** Accepted.
   - `mobile-check.mjs` now emulates insets and FAILs only when the viewport meta has `viewport-fit=cover`. Without cover it reports one INFO.
   - I applied the same gate to the keyboard model (`interactive-widget=resizes-content`). The same objection applied there, although the reviewer did not raise it.
   - The broken fixture now has cover and resizes-content without `env()` or scroll padding: 3 FAIL / 6 WARN / 1 INFO; its safe-area FAIL is now a defect a real iPhone would show. A `&meta=plain` variant shows the gate: 2 FAIL / 5 WARN / 3 INFO.
   - Bootstrap offcanvas-navbar's fixed-top FAIL is gone. Out of sample, mobile FAIL examples fell from 4 to 2, both TP.
   - The `capture.mjs` recommendation and the wording are fixed: emulation without cover is *stricter* than iOS.
3. **Glyph probe and scroll containers.** Accepted.
   - Instead of skipping lines that straddle the edge, the probe judges a scroller against its whole scrollable area. Ink outside that area stays a FAIL, because ink overflow does not extend it. This kept the seeded `span.note-text` and `div.cell-name` TPs.
   - Built a second, independent pixel truth (`lab/clip-truth.mjs`). It agrees with the first on 105/108 recipes.
   - Added 96 new scroll-container runs (fixed 13/0/0, first version 14 FP) and 68 real-page runs (fixed 0 FP, first version 3 FP, the reviewer's GOV-SA ones).
   - The report now says the 126 recipe cases are in-sample, and that the real pages contain too few true clips to measure sensitivity.
   - Two harness bugs fixed while doing this: smooth scrolling (Bootstrap's `scroll-behavior`) moved the page under the captures, and toggling overlay visibility changed how neighbouring text was painted.
4. **aegov tabs "no arrow keys" was false.** Accepted.
   - Corrected from `custom.js`: ArrowRight/ArrowLeft go to the next/previous tab in DOM order and ignore direction [V].
   - `lab/keys.mjs` now runs aegov's own handler, loaded verbatim, on its tab markup in RTL: ArrowLeft moves to the tab on the right [L].
   - The matrix marks this as a disagreement. `rtl-check` FAILs it, on Firefox's guideline plus the implementations; out of sample, aegov FAILs.
5. **Volume and Material.** Accepted. Verified in the 2014 Material text (GitHub copy): the speaker icon and "a volume icon with a slider at its right side should be mirrored" [V]. The volume row is now "record a decision; outside a player mirroring is the majority view". The same text is cited for checkmarks, search, clocks, media and people; people icons are a new row.
6. **Line-height floors.** Accepted.
   - Added a second string per class, heavy on descenders and below-marks.
   - Floors are now max over the strings, and each class includes the lighter classes.
   - Added the Windows (win-metrics) arithmetic and recorded which table this engine used (hhea for all 14 faces).
   - Tajawal's floors differ by platform in both directions (Windows 1.40/1.42/1.56 vs 1.04/1.65/1.92). The reviewer's 1.29 becomes 1.42 with the second string.
   - Other floors rose: Plex vocalised 1.39 → 1.60, Cairo 1.12 → 1.59, Readex plain 1.25 → 1.67. The guidance is now "use the face's own number; conservative minima; about clipping, not reading comfort".
7. **Icon classifier lists.** Accepted.
   - `lab/icon-lists.mjs` generates `lib/icon-names.json` from Codex (`shouldFlip` and RTL assets) and Flutter (`matchTextDirection`), with the "never" lists of Material, Firefox and Codex, minus anything a source mirrors, and the disagreement rows.
   - Severity follows agreement: two or more sources → FAIL; one source → WARN; disagreement → INFO; unknown → never FAIL.
   - Added the double-chevron and box-arrow patterns, trailing-digit names (`check2`, `calendar3`) and Arabic action verbs (أكمل، تابع، استمر، المزيد، اقرأ، العودة…).
   - Result: `star-half` is now directional, `user-plus` and `playlist_add` are weak directional, `sort` is weak directional, and `chevron-double-right` and `box-arrow-up-right` are directional. The blog-rtl chevron in "أكمل القراءة" is now a FAIL, and both examples are TP.
   - The seeded fixture still scores 15/15 and 5/5 as served, and 11/15 and 4/5 in flip, with 0 false alarms.
8. **Haptics durations and web-haptics.** Accepted.
   - The durations are now tagged as web-haptics' presets [V `patterns.ts`: selection 8, light 15, medium 25, heavy 35, success 30 + 40 ms], called a library's choice, and contrasted with Android's system constants [S].
   - The rule now leads with "short, single, paired with a visual change".
   - web-haptics' `SKILL.md` is now described as internally inconsistent, with its own anti-pattern lines quoted.
9. **Platform table.** Accepted.
   - The table is now generated by `lib/compat.mjs table()` from BCD 8.1.3, with Firefox Android and Safari desktop columns, "preview" kept, and Baseline read per compat key. The per-key reading fixed a second error: `text-align: match-parent` had inherited `text-align`'s "high" status.
   - `navigator.share` now reads Firefox 71 (flag) / Firefox Android 79 / Safari 12.1. `dialog closedby`, `CloseWatcher` and `ascent-override` read "preview" in Safari.
   - Rows for `overflow-x: clip`, `overflow-clip-margin` and `match-parent` were added.

Also changed:
- **Flip-mode mirror severity.** Roots > 8 px from their mirrored place stay FAIL; 3–8 px is now WARN. This came from judging the out-of-sample FAILs, where GOV-SA's partial overrides and 6–8 px margins were over-reported. As a side effect, 2 seeded margins (8 px) moved from FAIL to WARN in flip mode, which now scores 14 FAIL / 5 WARN / 1 INFO / 4 missed, where it was 16 / 3 / 1 / 4.
- **Out-of-sample set added to the runner** (`run.mjs → oos`): the reviewer's 15 pages plus 2. Every page runs with the first version (`legacy`) and the fixed version, and every fixed FAIL is judged in `oos-labels.json`. The inputs are pinned in `fetch.sh`: the GOV-SA build, extra Bootstrap examples, the regress pages via `git show`, and the Codex, Flutter and aegov sources.
- **Flutter base-icon count** corrected to 2,233 by doc class, or 2,231 by name suffix. The count of mirrored base icons, 76, is unchanged.
- **GOV-SA licence** is now described as declared only in `package.json`.
- **Runner time** is now about 4 minutes.
