# Multilingual and right-to-left

Read when the product serves more than one language or script, and always for Arabic, Hebrew, Persian or Urdu. Tested facts (headless Chrome 154, fontTools on the upstream font binaries, 2026-09-28) are in `research/streams/C-…` §8.8.

## 1. Structure and direction

- `lang` on `<html>` and on any passage in another language; `dir="rtl"` on `<html>` for RTL pages. Mixed runs and user content get `dir="auto"` or `<bdi>`; phone numbers, code, URLs and product codes stay LTR inside `<bdi dir="ltr">`.
- **Logical properties everywhere** (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-start-start-radius`, `text-align: start`); flex and grid follow direction. A redesign that uses physical properties has to be redone for RTL.
- Mirror the *composition* (image side, reading order of a sequence, the side a drawer opens from), not photographs — flipping photos breaks text, logos and handedness.
- **Icons**: mirror directional ones — back/forward, chevrons, navigation arrows, reply, undo/redo, text alignment, indentation, progress along a line. Do **not** mirror clocks and circular refresh arrows, media playback controls and their progress bars, physical objects, or logos. Design systems disagree on checkmarks — decide once and record it. Implement with `:dir(rtl) .icon-dir { transform: scaleX(-1) }` or the set's own prop (Phosphor's `mirrored`).
- Language switchers name each language in its own script ("العربية", "English"); flags are for countries, not languages (and flag emoji do not render on Windows).
- Test with real translated strings: German and Finnish run ~30% longer than English; Arabic is shorter in characters but taller.

## 2. Arabic + Latin typography

**Prefer a family designed as a bilingual system** — matching stroke logic matters more than matching style names:

| Family (Arabic) | Voice | Latin companion | Numerals | Good for |
| --- | --- | --- | --- | --- |
| IBM Plex Sans Arabic | engineered, Naskh structure | IBM Plex Sans | tabular by default; Eastern Arabic and Persian digits | fintech, government tech, bilingual product UI (static weights 100–700) |
| Noto Sans / Kufi / Naskh Arabic | neutral, widest coverage; Kufi for headlines, Naskh for reading | Noto Sans / Serif | tnum, tabular default | neutral multilingual systems (large files — subset) |
| Readex Pro | readability-led, geometric | Lexend | slashed zero; no Persian digits | education, accessibility-led brands |
| Alexandria | geometric | Montserrat (built in) | tnum, onum | a geometric brand voice |
| Cairo | compact Kufi-based; very common in the region | Titillium Web | tabular by default | compact UI and headlines (variable 200–1000) |
| Beiruti (2024) | modern geometric | built-in harmonised Latin | tabular default, tnum | a fresher alternative to Tajawal/Almarai |
| Vazirmatn | Persian/Arabic UI sans | Roboto-based | tabular default, tnum | Persian-first sites, app UI |
| Rubik | rounded, friendly; Arabic + Hebrew + Cyrillic | same family | tnum | playful multi-script brands |
| Mada | modernist, road-sign heritage | Source Sans (modified) | tabular default | small UI sizes |
| Markazi Text / Amiri | Naskh text / classical book Naskh | built in | Amiri tabular; Markazi no tnum | editorial / literary text, not UI |
| Tajawal, Almarai | very common geometric (Gulf, Saudi) | built in | **no tabular figures** (Tajawal also lacks Persian digits) | simple consumer sites — never data |

Display extras (one moment, never body): Reem Kufi (reads historical/Islamic by design), El Messiri, Changa, Lalezar, Rakkas, Aref Ruqaa.

Check any candidate with `scripts/fonts.mjs --google "Family"`: it reports the Arabic subset, tabular figures and digit coverage.

**Rules**

1. **Never track Arabic.** Letter-spacing adds uneven gaps after non-joining letters (Chrome now keeps the joins; older and other engines break them). Designs with negative display tracking must reset it: `:lang(ar) { letter-spacing: 0 }`.
2. **No italic for Arabic.** Chrome synthesises a fake slanted oblique. `:lang(ar) { font-synthesis: weight }` and `:lang(ar) em { font-style: normal; font-weight: 600 }` — emphasis by weight or colour.
3. **Size and leading**: Arabic reads smaller at the same size — set it ~10–15% larger and body line-height ~1.6–1.8. Match optically by eye with both scripts on one line.
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
5. **Numerals are the client's decision**: Western digits (0–9) are common across the Maghreb and many Gulf and Levant products; Eastern Arabic (٠–٩) in parts of Egypt and the Gulf; Persian (۰–۹) for Farsi and Urdu. Set the system explicitly (`Intl.NumberFormat('ar-EG-u-nu-latn')` or `'…-u-nu-arab'`), check the font has the glyphs, and keep `tabular-nums` for alignment.
6. **Subsetting keeps shaping**: `--layout-features='*'` — Arabic needs `init`, `medi`, `fina`, `rlig`, `mark`.
7. **Display tracking, uppercase and small caps don't exist** in Arabic; a design whose hierarchy relies on them needs another device (weight, size, colour) on the Arabic side.

## 3. Other scripts (brief)

- **CJK**: never self-host a monolithic font — use sliced `unicode-range` files (Google serves 100+ slices per family) or system stacks for body with a web face for headings; body line-height ~1.7–1.8; no italics, no letter-spacing on body; check `word-break: auto-phrase` (Japanese) and `text-autospace`. Faces: Noto Sans/Serif JP/SC/TC/KR, IBM Plex Sans JP/KR, Zen Kaku Gothic New, M PLUS 1p, BIZ UDPGothic.
- **Devanagari**: taller line-height (≥ 1.6) for the headline and stacked matras; keep full GSUB/GPOS when subsetting. Faces: Noto Sans Devanagari, Mukta, Hind, Anek Devanagari, Tiro Devanagari Hindi, Martel. (Poppins includes Devanagari — one legitimate reason to use it.)
- **Hebrew**: RTL rules as above; Rubik, Noto Sans Hebrew, Assistant, Heebo.

## 4. Checks

- [ ] `lang` and `dir` set; logical properties throughout; the RTL render captured at phone and desktop widths (`capture.mjs` against the RTL route or with `dir` toggled).
- [ ] Directional icons mirrored, non-directional ones not; composition mirrored, photographs not.
- [ ] Arabic text: no tracking, no synthetic italic, size and leading adjusted, numerals as decided, tabular where aligned.
- [ ] Long translations fit: buttons, nav, tables, headings (no truncated labels).
