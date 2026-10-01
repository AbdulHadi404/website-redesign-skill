# Multilingual and right-to-left

Read when the product serves more than one language or script, and always for Arabic, Hebrew, Persian or Urdu. Tested facts (headless Chrome 154, fontTools on the upstream font binaries, 2026-09-28) are in `research/streams/C-…` §8.8.

## 1. Structure and direction

- `lang` on `<html>` and on any passage in another language; `dir="rtl"` on `<html>` for RTL pages. Mixed runs and user content get `dir="auto"` or `<bdi>`; phone numbers, code, URLs and product codes stay LTR inside `<bdi dir="ltr">`.
- **Logical properties everywhere** (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-start-start-radius`, `text-align: start`); flex and grid follow direction. A redesign that uses physical properties has to be redone for RTL. **The one exception is numbers in columns:** `text-align: right` in both directions, so place values line up (§2a). Some systems (Carbon) use `end` for numeric cells; that aligns the most significant digit in RTL, which is wrong for comparison.
- Mirror the *composition* (image side, reading order of a sequence, the side a drawer opens from), not photographs — flipping photos breaks text, logos and handedness.
- **Icons**: mirror directional ones — back/forward, chevrons, navigation arrows, reply, undo/redo, text alignment, indentation, progress along a line. Do **not** mirror checkmarks, clocks and circular refresh arrows, media playback controls and their progress bars, search magnifiers, physical objects, or logos (every system that documents checkmarks agrees they stay). In a right-to-left row of tabs, radios or toolbar buttons, arrow keys follow the visual arrow: ArrowLeft moves to the next item (`accessibility.md` §3). Implement with `:dir(rtl) .icon-dir { transform: scaleX(-1) }` or the set's own prop (Phosphor's `mirrored`).
- Language switchers name each language in its own script ("العربية", "English"); flags are for countries, not languages (and flag emoji do not render on Windows).
- Test with real translated strings: German and Finnish run ~30% longer than English; Arabic is shorter in characters but taller.

## 2. Arabic + Latin typography

**Prefer a family designed as a bilingual system** — matching stroke logic matters more than matching style names:

| Family (Arabic) | Voice | Latin companion | Digits: Latin 0–9 / Eastern ٠–٩ | Good for |
| --- | --- | --- | --- | --- |
| IBM Plex Sans Arabic | engineered, Naskh structure | IBM Plex Sans | tabular / **proportional, no `tnum`** | fintech, government tech, bilingual product UI (static weights 100–700); borrow Eastern digits for data (§2a) |
| Noto Sans / Kufi / Naskh Arabic | neutral, widest coverage; Kufi for headlines, Naskh for reading | Noto Sans / Serif | tabular / tabular | neutral multilingual systems; the safe choice for Eastern-digit data (large files — subset) |
| Readex Pro | readability-led, geometric | Lexend | proportional even with `tnum` / proportional; no Persian digits | education, accessibility-led brands — not data |
| Alexandria | geometric | Montserrat (built in) | `tnum` / proportional | a geometric brand voice |
| Cairo | compact Kufi-based; very common in the region | Titillium Web | tabular / **proportional, no `tnum`** | compact UI and headlines (variable 200–1000) |
| Beiruti (2024) | modern geometric | built-in harmonised Latin | tabular / proportional | a fresher alternative to Tajawal/Almarai |
| Vazirmatn | Persian/Arabic UI sans | Roboto-based | tabular / `tnum` | Persian-first sites, app UI, data |
| Rubik | rounded, friendly; Arabic + Hebrew + Cyrillic | same family | `tnum` / proportional | playful multi-script brands |
| Mada | modernist, road-sign heritage | Source Sans (modified) | tabular / tabular | small UI sizes, data |
| Markazi Text / Amiri | Naskh text / classical book Naskh | built in | Markazi proportional / tabular; Amiri tabular / tabular | editorial / literary text, not UI |
| Tajawal, Almarai | very common geometric (Gulf, Saudi) | built in | proportional even with `tnum` / proportional (Tajawal lacks Persian digits) | simple consumer sites — never data |

"Tabular" was measured from the font files as served (Google Fonts and the foundries' npm releases, 2026-09-28; `research/experiments/I-arabic-numerals/`). Latin and Eastern Arabic digits are separate glyphs with separate widths — a family can align one set and not the other.

Display extras (one moment, never body): Reem Kufi (reads historical/Islamic by design), El Messiri, Changa, Lalezar, Rakkas, Aref Ruqaa.

Check any candidate with `scripts/fonts.mjs --google "Family"`: it reports the Arabic subset, tabular figures and digit coverage.

**Rules**

1. **Never track Arabic.** Letter-spacing adds uneven gaps after non-joining letters (Chrome now keeps the joins; older and other engines break them). Designs with negative display tracking must reset it: `:lang(ar) { letter-spacing: 0 }`.
2. **No italic for Arabic.** Chrome synthesises a fake slanted oblique. `:lang(ar) { font-synthesis: weight }` and `:lang(ar) em { font-style: normal; font-weight: 600 }` — emphasis by weight or colour.
3. **Size and leading**: Arabic reads smaller at the same size — set it ~10–15% larger and body line-height ~1.6–1.8. Match optically by eye with both scripts on one line. In a box that clips (truncated, clamped, fixed-height), use the chosen face's own floor from `fonts.mjs` (its "clip floor" line per content class: plain, vocalised, stacked), per platform when it prints "⚠ the line box differs by platform" — faces with USE_TYPO_METRICS on and typo ≠ hhea change their line box between Apple platforms and Chromium on Linux and Android, and Tajawal's `normal` is 1.39 on Windows, at its plain floor. `line-height: normal` is not safe for Almarai, Alexandria or Readex Pro (`fonts.mjs` flags a face whose `normal` is 0.05 em or more below its plain floor).
4. **Map fonts by script under one family name**, so each script gets its face and its size correction:

```css
@font-face { font-family: "Brand"; src: url(/fonts/brand-latin.woff2) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122; }
@font-face { font-family: "Brand"; src: url(/fonts/plex-arabic.woff2) format("woff2");
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF;
  size-adjust: 112%; }
body { font-family: "Brand", system-ui, sans-serif; }
```

   Without `unicode-range`, order matters: every Arabic family tested includes Latin glyphs, so listing it first gives English text the Arabic font's Latin.
5. **Numerals are the client's decision**: Western digits (0–9) are common across the Maghreb and many Gulf and Levant products; Eastern Arabic (٠–٩) in parts of Egypt and the Gulf; Persian (۰–۹) for Farsi and Urdu. Set the system explicitly — the locale alone no longer implies it (§2a).
6. **Subsetting keeps shaping**: `--layout-features='*'` — Arabic needs `init`, `medi`, `fina`, `rlig`, `mark`.
7. **Display tracking, uppercase and small caps don't exist** in Arabic; a design whose hierarchy relies on them needs another device (weight, size, colour) on the Arabic side.
8. **The Saudi riyal sign (U+20C1)**: `fonts.mjs` reports whether a face draws it. On Google Fonts load it with a second stylesheet, `css2?family=<Family>&text=%E2%83%81`: none of the standard subsets serves it, even for Noto Naskh Arabic, Roboto and Scheherazade New, which draw it.

## 2a. Numbers in data (dashboards, tables, prices, forms)

Measured in Chromium 141 and ICU 78 (`research/experiments/I-arabic-numerals/`):

- **Say which digits, in code.** `Intl.NumberFormat('ar')` now gives Western digits; `ar-EG` and `ar-SA` give Eastern Arabic, `ar-AE` Western, `ar-MA` Western with a decimal comma, `fa-IR` Persian. Write `ar-SA-u-nu-latn` or `ar-SA-u-nu-arab` — never rely on the region.
- **Say which calendar, in code.** `ar-SA` formats dates in the Hijri (Umm al-Qura) calendar in Chromium 141 but in the Gregorian calendar in Node 22 (ICU 78, CLDR 48) — the default follows the engine's CLDR version, so the same code renders different dates on the server and the client (a hydration mismatch) and across browser versions. Invoices, due dates and financial reports need an explicit calendar and digit system (`ar-SA-u-ca-gregory-nu-latn`, or `-u-ca-islamic-umalqura` where Hijri is wanted, and then usually both shown); never `toLocaleDateString('ar-SA')` bare.
- **Parse date-only values as calendar dates.** `new Date('2026-09-15')` is midnight UTC, so every user west of UTC sees 14 September; format such values with `timeZone: 'UTC'` (or build the date from its parts). Due dates and invoice dates are calendar dates, not instants.
- **Never build a number string by hand in RTL.** `"-4.2%"` in an RTL cell renders as `4.2%-`. `Intl` output carries invisible bidi marks (LRM, or ALM for Eastern digits) that put the sign on the right side; a Western-digit value outside `Intl` goes in `<bdi dir="ltr">`. Strip those marks (`/[\u061C\u200E\u200F]/g`) from anything machine-read: CSV exports, test assertions, parsers.
- **Tabular digits for the digits you show.** Most Arabic families have *proportional* Eastern Arabic digits and no `tnum` (table above) — `tabular-nums` does nothing. Either choose a family with tabular Eastern digits for data, or borrow only the digits under the same family name:

```css
@font-face { font-family: "Brand"; src: url(/fonts/plex-arabic.woff2) format("woff2");
  unicode-range: U+0600-065F, U+066A, U+066D-06EF, U+06FA-06FF, U+FB50-FDFF, U+FE70-FEFF; }
@font-face { font-family: "Brand"; src: url(/fonts/noto-sans-arabic-digits.woff2) format("woff2");
  unicode-range: U+0660-0669, U+066B-066C, U+06F0-06F9; }   /* ٠–٩ ٫ ٬ ۰–۹ from a tabular face */
```

  Check the borrowed digits' weight and stroke against the text by eye; `scripts/fonts.mjs` reports whether a file's digits are tabular.
- **Numeric columns are `text-align: right` in both directions** (not `end`): numbers are written with the units digit on the right in every digit system, so right alignment lines up place values. Headers of numeric columns align with their numbers. A trailing Arabic-convention minus shifts negatives by one digit — give every value a sign (`signDisplay: 'always'`) or show direction in its own column or word. `audit.mjs` judges a numeric column by where its digits paint, so a right-aligned badge or stacked phone row passes whatever `text-align` says.
- **Inputs: never `type="number"` for Arabic or Persian users.** Chromium drops typed `١٢٣` silently — `value` is empty and nothing is flagged invalid. Use `type="text" inputmode="numeric"` (or `"decimal"`), accept every digit system and normalise before validating:

```js
const toLatn = (s) => s.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x6F0)
  .replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/[\u061C\u200E\u200F]/g, '');
```

- **Charts**: axis labels, tooltips and data labels through the same formatter; a time axis keeps its reading direction decision recorded in `SYSTEM.md` (mirrored with the layout, or left-to-right as in most Arabic financial products — pick one and apply it everywhere).

## 3. Other scripts (brief)

- **CJK**: never self-host a monolithic font — use sliced `unicode-range` files (Google serves 100+ slices per family) or system stacks for body with a web face for headings; body line-height ~1.7–1.8; no italics, no letter-spacing on body; check `word-break: auto-phrase` (Japanese) and `text-autospace`. Faces: Noto Sans/Serif JP/SC/TC/KR, IBM Plex Sans JP/KR, Zen Kaku Gothic New, M PLUS 1p, BIZ UDPGothic.
- **Devanagari**: taller line-height (≥ 1.6) for the headline and stacked matras; keep full GSUB/GPOS when subsetting. Faces: Noto Sans Devanagari, Mukta, Hind, Anek Devanagari, Tiro Devanagari Hindi, Martel. (Poppins includes Devanagari — one legitimate reason to use it.)
- **Hebrew**: RTL rules as above; Rubik, Noto Sans Hebrew, Assistant, Heebo.

## 4. Checks

- [ ] `lang` and `dir` set; logical properties throughout; the RTL render captured at phone and desktop widths (`capture.mjs` against the RTL route, and `capture.mjs --dir rtl --lang ar` on the left-to-right build for the flip run).
- [ ] `audit.mjs` on the RTL pages: its RTL block runs whenever a page is right-to-left or holds Arabic (what it checks: `scripts/README.md` §4); `widgets.mjs` checks arrow-key direction; `stress.mjs --only rtl` finds what did not mirror.
- [ ] Directional icons mirrored, non-directional ones not; composition mirrored, photographs not.
- [ ] Arabic text: no tracking, no synthetic italic, size and leading adjusted, numerals as decided.
- [ ] Data: digit system set in code; no hand-built number strings; the digits actually shown are tabular (measured, not assumed); numeric columns right-aligned; numeric inputs are text inputs that accept Arabic and Persian digits.
- [ ] Long translations fit: buttons, nav, tables, headings (no truncated labels).
