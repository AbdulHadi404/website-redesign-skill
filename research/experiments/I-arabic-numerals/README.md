# Experiment I — Arabic and Latin numerals in dashboards

**Question.** What does a bilingual Arabic/English dashboard need to get right about numbers? This covers:

- which digits each locale produces
- whether the digits line up in tables
- where signs land in right-to-left layouts
- what inputs do with Arabic digits

The skill's `multilingual.md` claimed that several Arabic families had "tabular figures by default". That claim had been checked against Latin digits only.

**Setup.** 2026-09-28:

- Node 22.22 (ICU 78.2, CLDR 48)
- headless Chromium 141.0.7390.37
- fontkit on the Google Fonts subsets as served (and on IBM's own npm release of Plex Sans Arabic and Fontsource's packages, for comparison)

`./fetch-fonts.sh` re-downloads the fonts, which are not committed. Then run `node intl.mjs`, `node lab.mjs`, `node digit-swap.mjs` and `node fontcheck.mjs sweep/*.woff2`.

## Findings

### 1. `ar` alone gives Western digits now; the region decides

In both Node's ICU 78 and Chromium 141, `Intl.NumberFormat('ar')` resolves to the `latn` numbering system: `1,234.5`.

| Locale | Digits | Example |
| --- | --- | --- |
| `ar-EG`, `ar-SA` | Eastern Arabic (`arab`) | `١٬٢٣٤٫٥` |
| `ar-AE` | Western | `1,234.5` |
| `ar-MA`, `ar-DZ` | Western, comma decimal | `1.234,5` |
| `fa-IR` | Persian (`arabext`) | `۱٬۲۳۴٫۵`, with U+2212 MINUS |

**Consequence:** the digit system is a product decision. Set it explicitly (`ar-SA-u-nu-latn` or `…-u-nu-arab`) rather than letting the locale imply it. See `intl-node.json` and `results.json`.

### 2. Formatted strings carry invisible bidi marks

Arabic-locale output wraps numbers in marks:

| Output | Marks |
| --- | --- |
| Western-digit percent | LRM (U+200E): `⟨LRM⟩-4.2⟨LRM⟩%⟨LRM⟩` |
| Eastern-digit percent | ALM (U+061C): `⟨ALM⟩-٤٫٢٪⟨ALM⟩` |
| Currency | RLM / LRM plus NBSP |

These marks are what make the sign render on the correct side (finding 3). They also break:

- string comparison in tests
- naive parsing
- CSV export: strip them for machine output

### 3. Hand-built strings put signs on the wrong side in RTL

In an RTL cell, the JavaScript string `"-4.2%"` renders as `4.2%-` and `"+1234.5%"` as `1234.5%+`. The minus lands visually to the right of the digits. `Intl` output for `ar-AE` keeps `-4.2%` in LTR order. `ar-EG` renders the Arabic-script convention (minus at the right, `٪` at the left).

`<bdi dir="ltr">` around a Western-digit value also works.

**Rule:** never concatenate numbers, signs and units by hand in an RTL interface. See `rtl-tables.png` and `results.json → signSide`.

### 4. Most Arabic fonts have proportional Eastern Arabic digits, and `tnum` does not fix them

Font files sweep (`sweep-arabic.txt`, `sweep-latin.txt`):

| Eastern Arabic digits ٠–٩ | Families (Google Fonts as served) |
| --- | --- |
| **tabular by default** | Noto Sans Arabic, Noto Kufi Arabic, Noto Naskh Arabic, Amiri, Mada, Markazi Text, Harmattan, Scheherazade New, Reem Kufi, Handjet |
| **tabular only with `tnum`** | Vazirmatn, Lateef |
| **proportional, no `tnum`** | IBM Plex Sans Arabic, Cairo, Almarai, Tajawal, Alexandria, Beiruti, Readex Pro, Rubik, Changa, El Messiri, Kufam, Lalezar, Baloo Bhaijaan 2, Zain, Marhey, Blaka, Playpen Sans Arabic |

Two points about the "proportional" row:

- **It is not a Google subsetting artefact.** IBM's own `@ibm/plex-sans-arabic` 1.1.0 release has the same proportional Eastern digits (263–630 units) and no `tnum`. Fontsource's Cairo and Tajawal files match Google's.
- **Latin digits are a separate question.** These are tabular by default in Plex Sans Arabic's Latin, Cairo, Noto, Amiri, Mada, Harmattan, Beiruti, Kufam, Vazirmatn, Scheherazade and Lateef. They are tabular with `tnum` in Alexandria, Rubik, Zain and Baloo Bhaijaan 2. They stay proportional even with `tnum` in Almarai, Tajawal, Readex Pro, Changa, El Messiri, Lalezar, Reem Kufi, Markazi Text, Marhey, Blaka and Playpen Sans Arabic.

The earlier claims ("Cairo: tabular by default", "IBM Plex Sans Arabic: tabular by default; Eastern Arabic digits") were true only for the Latin digits.

### 5. The fix when the brand face has proportional Eastern digits

Declare the brand family twice under one name. One declaration serves the text; the other serves only the digits from a face that has tabular ones:

```css
@font-face { font-family: "Brand"; src: url(plex-arabic.woff2) format("woff2");
  unicode-range: U+0600-065F, U+066A, U+066D-06EF, U+06FA-06FF, U+FB50-FDFF, U+FE70-FEFF; }
@font-face { font-family: "Brand"; src: url(noto-sans-arabic.woff2) format("woff2");
  unicode-range: U+0660-0669, U+066B-066C, U+06F0-06F9; }   /* ٠–٩, ٫ ٬, ۰–۹ */
```

Measured result: Plex alone gives digit advances of 7.4–17.6 px at 28 px. With the swap, every digit is 16.02 px, and decimals line up in right-aligned cells (`digit-swap.png`). Check the digit shapes match the text's weight and stroke by eye.

### 6. `type="number"` silently drops Arabic digits

Test conditions: Chromium 141, text inserted as an IME would insert it.

- Typing `١٢٣` into `<input type="number">` leaves `value === ""`, with **no `badInput` flag**: the user sees nothing and gets no error.
- `type="text"` with `inputmode="numeric"` or `"decimal"` keeps `١٢٣` / `١٢٫٥` / `۱۲۳` as typed, and `Number()` of them is `NaN`.

A 1-line normaliser converts them:

```js
s.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0)
 .replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/[؜‎‏]/g, '')
```

It turns `١٢٬٣٤٥٫٥` into 12345.5 and round-trips `Intl` `ar-EG` output.

**Rule:** for Arabic and Persian users, use text inputs with `inputmode`, and normalise digits before validating.

### 7. Alignment of numeric columns in RTL

Both Western and Eastern Arabic numbers are written most-significant digit first, left to right, so the units digit is always at the right. `text-align: right` therefore aligns place values in both directions (`rtl-tables.png`, `digit-swap.png`). `text-align: end`, which is the left edge in RTL, aligns the most significant digits instead. That is wrong for comparison unless every value has the same width.

A trailing Arabic-convention minus (Eastern digits) shifts negatives by one character. Two ways to keep the columns aligned:

- give every value a sign (`signDisplay: 'always'`)
- put direction in its own column or as a word

## What changed in the skill

`references/multilingual.md`:

- the font table now distinguishes Latin from Eastern Arabic digits
- a numerals-in-data section: locale-explicit formatting, bidi marks, no hand-built strings, the digit-swap recipe, text inputs with normalisation, and right-aligned numeric columns

`references/dataviz.md` points to that section for Arabic dashboards.
