# Design fundamentals, colour and typography — the theory this skill works to

Read at the start of Phase 3, before deciding a palette, a type scale or a layout system, and again when filling `DESIGN.md`. **Parts B (colour), C (typography) and D (checklists) gate the work; Part A is the vocabulary for judging layout.** Every rule is stated so it can be checked against a render or a token file; numbers are the sources'. They are starting points that a direction may depart from with a written reason — a rule followed against the brand's grain produces a correct, generic page.

---

## Part A — Design fundamentals

### A1. What "good" means

The canon (Rams, Vignelli, Rand, Norman) is assumed knowledge; three consequences do the work here. **Honest**: the design never makes the product look more capable than it is. **Appropriate before attractive**: attractiveness buys tolerance for small friction (the aesthetic–usability effect) but never rescues a broken flow, and in testing it hides real problems behind praise — watch what people do. **Thorough**: nothing arbitrary; every value has a source.

### A2. Gestalt — how the eye groups before it reads

A layout should be explainable by the grouping principles it uses (proximity, similarity, common region, continuity, figure/ground, focal point); if a section cannot be, it is a pile. Two corollaries do most of the work: **space groups before borders do** (more space between groups than within them; a hairline only where space cannot), and **the accent only works if it is rare** (a focal point needs a field of sameness).

### A3. Visual hierarchy — the order the eye takes things in

NN/g's definition: arranging elements so the eye consumes them *in the order of intended importance*. The levers, with the working limits the research gives:

- **Scale**: few sizes per view, used on purpose — on a marketing viewport usually three, with at most one or two "big" things or nothing is big; display type runs above body on one scale (Part C). Product UI runs flatter: three to five sizes on a screen with a largest-to-body ratio of ~1.3–2 (Primer's issues page: three sizes, largest 16 px; Carbon: four, largest 28 px), where marketing pages run 4–5× (`categories.md`). A size used once is a smell.
- **Colour and contrast**: saturated for the important, desaturated for the rest; few contrast levels for text (primary, secondary, muted); never hierarchy by colour alone (Part B).
- **Weight and style**: bold and colour before size — de-emphasise the surroundings to make one thing important (Refactoring UI). Two or three text colours (primary / secondary / muted) and two or three weights carry more hierarchy than five sizes.
- **Position and reading pattern**: the top-left of a Western page and the first two words of a line are read first; the F-pattern is what people do *when the design gives them no better cues* — headings, front-loaded sentences, bold key terms and lists turn it into a "layer-cake" scan (`ui-ux.md` §3).
- **Space**: more space around an element raises its importance; grouped things sit closer than unrelated things.
- **The squint (blur) test**: blur the render to ~3px. What still reads is the hierarchy you actually shipped. If nothing reads, or the wrong thing does, fix the layout, not the copy.

### A4. Space, grid and rhythm

- **Whitespace is active.** Macro whitespace (between chapters and columns) sets pace and perceived quality; micro whitespace (between lines, letters, list items) sets legibility. The correct amount is "more than feels comfortable, then remove a little" — on expressive surfaces. Productive surfaces take their spacing from the 4 px step of `app-ui.md` §3, not the scale below: 20–32 px gaps between sections, never marketing chapter padding that pushes the main object (table, board, form) below the fold.
- **A spacing scale**, not ad-hoc values: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Vertical space between chapters is one of the large steps; inside a chapter, one of the middle ones; inside a component, the small ones. Every spacing decision is a choice *from the scale*.
- **Grids** (Müller-Brockmann, the Swiss school; the 12-column web grid). Kinds: manuscript (one column of text), column, modular (columns × rows), hierarchical (regions sized by importance). On the web: a 12-column container with fixed gutters gives 2/3/4/6-column layouts for free; content chooses the span, not the device. A **baseline grid** (line-height as the unit; all vertical spacing in multiples of it) is what makes a page feel "set" rather than "placed".
- **Rhythm** is variation on a beat: repetition where content is parallel is the beat; a change where content changes kind is the accent. A page of identical sections has no rhythm; a page where every section is different has no beat.
- **Alignment is the cheapest quality**: everything sits on a column edge or a baseline. Centred text is for one or two lines; long centred paragraphs are a mistake (Part C).
- **Balance** can be symmetrical (calm, institutional) or asymmetrical (energy, editorial). Asymmetry needs a counterweight — a large quiet area balancing a small loud one — or it reads as unfinished.
- **Break the grid only on purpose**: a bleed, an overlap, an element crossing a rule is emphasis because the grid holds everywhere else; breaks that are not chosen read as mistakes.

### A5. Composition checks borrowed from painting and photography

**Value structure**: two or three masses of value, one focal mass on the thing that matters — check with a greyscale blurred sheet. **Silhouette**: the no-text variant at 25% still reads as this design. **One light**: shadows agree on a direction and grow with elevation. **No tangents**: edges that almost meet (1–6 px apart) look like mistakes; align them or separate them clearly. **Eye path**: entry at the strongest contrast, ending at the action.

---

## Part B — Colour

### B1. Colour is relative (Albers) — and there are seven kinds of contrast (Itten)

- **Albers, *Interaction of Color*:** "colour deceives continually" — the same colour reads differently on different grounds (simultaneous contrast); one colour can be made to look like two, two like one. Consequence for the web: **never judge a colour from a swatch; judge it on the surface it will sit on, next to the colours it will sit beside.** A muted text colour that passes on white fails on the grey chapter; an orange that sings on white looks dirty on cream.
- **Itten's seven contrasts** are the vocabulary for *what kind* of contrast a design is using: hue (different hues), light–dark (value — the one that carries hierarchy and legibility), cold–warm (temperature — mood), complementary (opposites — energy, and vibration if both are saturated), simultaneous (Albers' effect), saturation (pure against greyed — the cheapest way to make one thing pop), extension (*proportion* — Goethe's light values say yellow needs a quarter of the area of violet to balance it; a small area of a bright colour balances a large area of a dull one). The 60/30/10 budget below is contrast of extension made into a rule.
- **Munsell → CIELAB → HCT/OKLCH**: colour has three perceptual dimensions — hue, value/lightness, chroma — and only a perceptual space keeps them independent. HSL lies about lightness (yellow at 50% is far brighter than blue at 50%). Material's HCT and CSS's OKLCH both give a lightness ("tone") that predicts contrast: in HCT, **a tone difference of ~40 ≈ 3:1 and ~50 ≈ 4.5:1**, which is why Material assigns roles by tone (primary 40 on a light scheme, 80 on dark; the "on-" colour 100 / 20; containers 90 / 30; surface 99 / 10) and gets WCAG for free. Stripe's Lab-based palette does the same: any two colours ≥ 5 levels apart pass 4.5:1.

### B2. Harmony — hue relationships

Sample the brand's hues from the logo first (`audit.md`) and place them on the wheel before choosing anything.

| Scheme | What it is | When it works | Watch for |
| --- | --- | --- | --- |
| Monochromatic | one hue, varied lightness/chroma | quiet, editorial, product-led | flat; needs a strong type or photo layer |
| Analogous | 2–3 hues within ~60° | a mood (warm, cool) | low hue contrast — carry hierarchy with lightness |
| Complementary | ~180° apart (orange/blue) | one brand colour plus its answer; energy | vibrating edges when both are saturated; never equal weight |
| Split-complementary | a hue plus the two beside its complement | most of the contrast, less tension — the usual safe choice | one hue must still dominate |
| Triadic | three hues 120° apart | playful consumer brands | rarely premium; desaturate two of the three |

**Rule:** one hue dominates, one supports, one accents. Three equal voices is a poster, not a site.

### B3. Proportion — name the strategy, then budget it

Choose the colour strategy before any colour, and write it in `DESIGN.md`:

- **Restrained** — neutrals carry the page, one accent does the work: the 60/30/10 budget below. Right for nearly all product UI and many sites — and the strategy every blind-test output in `ledger.md` chose, so on an expressive route it needs a reason from the brand too.
- **Committed** — one saturated brand hue carries 30–60% of the surface (a brand whose identity *is* a field of colour).
- **Full palette** — several hues, each with a job (playful consumer brands, data-rich or wayfinding sites).
- **Drenched** — the page *is* the colour; type and imagery sit inside it.

Whichever is chosen, the primary action keeps one colour everywhere and status colours stay reserved. Light or dark is decided by one sentence of physical use scene (night use, media), never by the category ("dark because it is a dev tool"); an all-day app offers both and follows the OS (B8).

**The Restrained budget (60 / 30 / 10).** ~60% dominant neutral surface, ~30% secondary (alternate surface or the brand dark), ~10% accent. The accent's *job* is "act here"; every square metre spent on decoration spends that meaning. Committed and Drenched pages move the brand hue into the 60 or 30 and give the action a colour that still stands out against it.

- Under Restrained, a full-bleed accent field is an identity moment: rare, or it stops being one.
- **The primary action is one colour everywhere.** If a chapter's ground makes that colour impossible, change the ground, not the button.
- Labels, numerals, rules, icons, chips do **not** take the accent by default; they take ink or a muted tint.
- Dark chapters count toward the 30%; a page alternating white → dark → accent → dark → accent has inverted the budget.

### B4. The three levers do three jobs

- **Hue** carries the cultural label. The research that actually holds (Labrecque & Milne 2012, brand-personality ratings of logos): red and orange → *excitement*; blue → *competence* and *sophistication*; black → *competence/power*; purple → *sophistication*; and purchase intent rises when the perceived personality matches the product. Caveats the literature insists on: associations vary by culture (British and Chinese respondents diverged), depend on product category, and pop-psychology charts overstate everything. Use hue for the personality the company has, not the one a chart promises.
- **Chroma** carries intensity: a red-leaning orange is assertive, a peach is relaxed. Calm a colour by lowering chroma, never by shifting hue.
- **Lightness** carries hierarchy and legibility. Nearly every "hard to read" and "nothing stands out" is a lightness problem.

### B5. Building scales

1. Fix **H** to the brand hue. 2. Step **L** evenly (0.98 → 0.15). 3. Shape **C**: rise toward the middle, fall at both ends (near-white and near-black cannot hold chroma). 4. Rotate H slightly warmer when lightening warm hues, cooler when darkening. 5. Clamp chroma, never lightness, to stay in sRGB.

Chroma bands: neutrals ≤ 0.02; tinted surfaces 0.02–0.06; muted brand 0.10–0.16; rich brand 0.16–0.25.

`scripts/palette.mjs --brand <colour>` builds the scale this way (light and dark, with a tinted neutral scale), keeps step 9 as the brand colour itself, clamps out-of-gamut steps by chroma, and *solves* the text steps: step 11 at APCA Lc 60 **and** WCAG 4.5:1 against steps 2 **and** 3 (solved on step 2 alone it gave 4.11–4.19:1 on step 3, the soft-badge and selected-row ground), step 12 at Lc 90 **and** 7:1 against step 2 (solving for APCA alone produced a 3.6:1 "text" step that fails WCAG). The label on step 9 is the one of white or #111 that passes WCAG 4.5:1; APCA only breaks a tie. When neither passes, the script says so and names the nearest step that carries a small-text label. A logo colour outside sRGB gets a P3 token with an sRGB fallback. A sequential ramp should step evenly — check it in greyscale.

**Neutrals are tinted** with the brand-dark hue (cool for a navy brand, warm for a brown one); plan 8–10 of them and a near-black that is a dark tint, not #000. For an all-day work surface the ground is a low-chroma neutral tinted with the brand hue, not pure white and not cream unless the brand owns it; keep large saturated fields out of the work area.

**The 12-step role scale** (Radix): 1–2 page/subtle backgrounds · 3–5 component rest/hover/pressed · 6–8 borders (non-interactive, interactive, strong/focus) · 9–10 solid fills (9 = highest chroma) and hover · 11–12 text (secondary ≥ Lc 60 on step 2, primary ≥ Lc 90). You need not ship twelve tokens; you must know which role each token plays.

### B6. Text on colour, and contrast

- Grey text on a coloured ground is wrong; use the *same hue* at low chroma and very different lightness. White on a saturated warm hue usually fails for body text (`#fff` on `#FF5A1F` ≈ 3.1:1): display sizes only; body copy on a warm field takes the brand dark.
- **WCAG 2.x**: 4.5:1 for text below ~24px regular / 19px bold; 3:1 for larger text, icons and control boundaries; AAA 7:1 / 4.5:1. **APCA** (perceptual): Lc 90 body columns, 75 body minimum, 60 content text (≥ 24px/400 or 16px/700), 45 headlines and pictograms, 30 placeholders/disabled, 15 the faintest non-text edge. Dark mode needs *more* margin — WCAG overstates contrast between two dark colours.
- Measure every pair **on its rendered ground** and table it in `DESIGN.md` (`scripts/contrast.mjs` prints WCAG and APCA for any CSS colours or a token file; `audit.mjs` measures every text element against the ground painted under it).
- **Measured**: on a near-black ground (`#0f0f23`) `oklch(0.62 0.19 264)` passes WCAG AA at 5.02:1 yet reads at APCA Lc −36 (spot text only), and white at 60% passes AAA at 7.18:1 yet reads at Lc −50 (headlines only). On dark themes, trust APCA over the ratio for body text.

### B7. Colour vision deficiency

About **8% of men and 0.4–0.5% of women** have a congenital deficiency; deuteranomaly (weak green) alone is ~5% of men; blue-yellow forms are ~0.01%. Red-green deficiency confuses **red / green / orange / brown**, **blue / purple**, **cyan / grey**, **rose / grey**, **yellow / neon green**. Rules: never encode meaning by hue alone — pair colour with a word, a mark, a position or a pattern; keep status colours far apart in *lightness*, not only hue; check the palette in a deuteranopia simulation; an orange accent beside a green "ok" is a real risk unless the lightness differs clearly.

### B8. Dark mode

Light mode gives better reading acuity for most people; dark mode helps people with cataracts or cloudy optics, and in dim rooms (NN/g). So an all-day app offers both, follows the OS by default and remembers the choice (`app-ui.md` §10).

Not pure black or pure white (use `rgb(5 5 5)`-ish grounds and `rgb(250 250 250)`-ish text to avoid halation); **elevation by lightness** (higher surfaces are lighter — Material's overlay scale); **desaturate accents** (a saturated brand colour on a dark ground vibrates; Material uses the 200-tone); text at three opacities (≈ 87 / 60 / 38%); dim or slightly desaturate photographs (most people prefer it); invert icons, not photos; `currentColor` for inline SVG; tokens named by role (`--accent`) never by value (`--orange`). Every colour token gets a dark value or the theme is not a theme.

### B9. Semantic colours are data

Green = succeeded / available, red = failed / danger, amber = attention — and nothing decorative uses those hues. A green "verified" mark keeps its meaning only while green is never an accent.

---

## Part C — Typography

### C1. The rules with numbers (Bringhurst, Butterick, the web adaptations)

- **Body size** is a category dial (`categories.md`): 16–20px on marketing pages (16 is the default and a fine baseline), up to 21px for long reading; product UI 13–14px (C2). **Line spacing** for body text 1.4–1.55, 1.5 by default (Latin; Arabic, CJK and Devanagari take more: `multilingual.md`); **measure** 60–70 characters including spaces (the "69 characters" middle), 75 at most, 45 the floor for a narrow column; **ragged right**, never justified on the web (rivers, hyphenation).
- **Paragraphs**: space *or* indent, never both; one line-height between paragraphs, or a 1-en indent on every paragraph after the first.
- **Capitals**: letterspace all strings of capitals and small caps by 5–12%; all-caps only for less than a line; **never letterspace lower case** without a reason. In product UI, capitals only for labels of one or two words in isolation (column heads, one-word nav-group labels) at 12 px (11 px only for a single word) in the UI face, never a condensed or hard grotesk, tracked 0.05–0.06 em; NN/g found uppercase faster for a word or two and slower for anything read in sequence, so statuses, multi-word strings and anything scanned down a column stay in sentence case (`app-ui.md` §3).
- **Figures**: tabular figures — fixed-width digits in the text face (`font-variant-numeric: tabular-nums`), not a monospace font — in tables and anywhere numbers align; proportional elsewhere. Titling figures with full caps, text figures otherwise.
- **Punctuation**: real quotes and apostrophes (‘ ’ “ ”), en dash for ranges (17–25), em dash for breaks, one ellipsis glyph, hard spaces inside short numerical expressions ("$164 per hire", "3 min"). Hang quotation marks and bullets outside the margin where the design is fine enough to show it.
- **Emphasis**: bold *or* italic, never both; underline only for links.
- **Hyphenation**: at least two characters left behind and three taken forward; never more than three hyphenated lines in a row; never begin a column with the last line of a paragraph.

### C2. Scale and rhythm

- "Don't compose without a scale" (Bringhurst 3.1.1). Build sizes from a ratio and use every step you define. The classic scale doubles every five steps: `f = f₀ · 2^(i/5)` → 12 · 14 · 16 · 18 · 21 · 24 · 30 · 36 · 42 · 48 · 55 · 63 · 72 · 96. Alternatives: 1.25 (calm), 1.333–1.5 (editorial), 1.618 (very few, very large steps).
- Line-height falls as size rises: 1.5 for body (1.4–1.55, C1), 1.3 for subheads, 1.05–1.15 for display, 0.95–1.0 only for very large single lines.
- **Vertical rhythm**: pick the body line-height as the unit and set every vertical margin and padding to a multiple of it; heading line-heights are chosen so they add up to whole units.
- **Fluid type** on the web: `clamp(min, rem + vw, max)` between the phone and desktop steps, so headings scale with the viewport without a breakpoint per size — with a rem part in the preferred value and **max ≤ 2.5 × min**, or zoom cannot enlarge it enough (WCAG 1.4.4; a 32 → 120 px hero clamp fails, a `5vw` headline does not grow at all when zoomed — `responsive.md` §2).
- **Two sets on one system** when a repo holds marketing and product: an *expressive* set (16 px base or more, fluid, ratio 1.25–1.5+) and a *productive* set (13–14 px base, fixed sizes, ratio 1.125–1.2, role names — page title, section heading, small heading, body, label and caption, metric, and code only when the users read code, as in C3). Carbon's rule: expressive styles never inside a container. One scale stretched over both is wrong for both (`design-systems.md` §3).

### C3. Choosing and pairing families

- One display family and one text family is enough; a third (code) only when the audience reads code — never a data or values face (commitment 5 in `SKILL.md`).
- **Pairing**: contrast in *classification* (a geometric sans display with a humanist sans text; a sans with a serif), concord in *proportion* (similar x-height and width so they sit on one line together); never two faces from the same classification but different families (two slab serifs, two grotesks — discord). One superfamily with weights is the safest pairing of all. Assign each face a fixed role; match moods (a playful display on a formal text face jars).
- **Match the display face to the wordmark's construction** (`art-direction.md`): a rounded geometric mark wants a geometric or humanist grotesk; a serif wordmark wants a serif or high-contrast sans; a condensed industrial face belongs to signage, sport and workwear brands and reads as harsh on a product about people.
- **Voice**: monospace is a developer voice; **tracked small capitals in a hard grotesk at 10–13px read as a spec sheet or code even without a monospace face** — for consumer, services, hiring or manufacturing brands use sentence case in the text face at 600, and allow at most one small-caps device on the page; a product's column heads and group labels together count as its one small-caps device. Strings that look like machine output (an MRZ line, a hash, a serial block) read as code whatever the font: draw the object or leave it out.
- **Hierarchy by weight and colour before size**: two or three weights and text colours do more than five sizes; de-emphasise neighbours instead of enlarging the subject.
- **Choosing, not remembering**: memory returns the saturated faces (`scripts/lib/saturated-fonts.json`). Name the voice, shortlist three faces per role from `resources/type-and-colour.md` and the wider catalogues, and verify each with `scripts/fonts.mjs` — tabular figures (DM Sans, Poppins, Fraunces and Instrument Serif have none), the scripts you need, optical sizes, x-height for small UI text — in the file you will actually serve.

### C4. Web mechanics

- Load only the weights used; `font-display: swap` (or `optional` for non-critical faces); self-host (a CDN font is never shared across sites since cache partitioning, and the EU has fined Google-hosted fonts); subset keeping the layout features you use; a variable font from the second weight on.
- **Google Fonts and Fontsource strip optional OpenType features** (`zero`, `onum`, `case`, small caps, stylistic sets, character variants) and serve axes only when requested — CSS that asks for them silently does nothing. Self-host the upstream file when the design relies on them (`resources/type-and-colour.md`).
- Metric-matched fallbacks computed from the *actual* fallback face and weight (`scripts/fonts.mjs <file> --fallback arial:700`, or fontaine, Capsize, framework font modules); a wrong override measured 26× worse CLS than none (`performance.md` §4).
- Body colour is a dark tint of the brand hue, not #000; secondary text one step lighter; muted one more — all three measured on every surface they appear on.
- `text-wrap: balance` for headings, `max-width` in `ch` for measure, `font-variant-numeric: tabular-nums` where figures align, `hanging-punctuation` where supported.
- Never let a JSX/Astro entity swallow a leading space (a rendering trap noted in this repo's own docs): write the character.

---

## Part D — Checklists (fill before implementation)

**Palette**

- [ ] Brand hues sampled from the logo files (`palette.mjs --from`); harmony named; which hue dominates, supports, accents.
- [ ] Colour strategy named (Restrained / Committed / Full palette / Drenched); light or dark from the use scene, both for an all-day app (B8).
- [ ] Neutrals tinted with the brand-dark hue; ≥ 8 steps with roles assigned per the 12-step table.
- [ ] The accent has a solid, a hover, a text-safe dark (≥ 4.5:1 on every ground it sits on) and a tint surface.
- [ ] Proportions per the named strategy; the primary action is one colour everywhere; labels and numerals off the accent.
- [ ] Every text/ground pair in use tabled with WCAG ratio and APCA Lc on the real ground; dark-mode values for every token if the site themes.
- [ ] Deuteranopia check: no meaning by hue alone; status colours differ in lightness.
- [ ] Semantic colours reserved for state.

**Typography**

- [ ] Scale ratio stated; sizes listed; every step used.
- [ ] Body size from the category dial (`categories.md`; product UI 13–14px), line-height 1.4–1.55 (1.5 by default), measure 60–70ch and never over 75ch, ragged right (C1).
- [ ] Display face justified by the wordmark's construction; pairing contrasts in classification, concords in proportion.
- [ ] At most one caps/tracked device; caps tracked 5–12%; nothing typeset to look like machine output.
- [ ] Only the weights used are loaded; swap; self-hosted; no layout shift from fonts.
- [ ] Every face verified with `fonts.mjs` (tabular figures where numbers align; scripts; features in the served file); none on the saturated list without a written reason.
- [ ] Separate expressive and productive sets if the repo has both; fluid clamps keep max ≤ 2.5 × min.

**Layout**

- [ ] One spacing scale; vertical rhythm on the body line-height; a container and gutter per breakpoint.
- [ ] The blurred render reproduces the content priority in `DESIGN.md`; one focal element per viewport.
- [ ] Few sizes per view, each used on purpose; space and ground group content before borders do; cards only for independent objects.
- [ ] Any grid break is deliberate; edges align or clearly separate.

## Sources read for this reference

Rams (Vitsœ, "Ten principles for good design"); Vignelli, *The Vignelli Canon*; Rand, "Logos, Flags, and Escutcheons" (1991) and the Rand test; Kurosu & Kashimura / Tractinsky via NN/g, "The Aesthetic-Usability Effect"; Norman, *The Design of Everyday Things* and *Emotional Design*; NN/g, "Visual Hierarchy in UX", "Gestalt Principles" and IxDF's Gestalt overview; Wikipedia, "Grid (graphic design)" (Müller-Brockmann, the Swiss school); Williams, *The Non-Designer's Design Book*; Albers, *Interaction of Color* (via Wikipedia); Itten, *The Art of Color* — the seven contrasts (via Wikipedia); Material Color Utilities README (HCT, tonal palettes, tone-difference contrast); Radix Colors, "Understanding the scale"; Stripe, "Designing accessible color systems"; APCA "Easy intro"; Refactoring UI (palette, hierarchy, spacing chapters via summaries); web.dev, "prefers-color-scheme" (dark-mode guidance); Wikipedia, "Color blindness" (prevalence, confusion lines); Wikipedia, "Color psychology" (Labrecque & Milne, caveats); Butterick, *Practical Typography*; Bringhurst via *The Elements of Typographic Style Applied to the Web*; Smashing Magazine, "Technical Web Typography" (2011) and "Best Practices of Combining Typefaces" (2010); Spencer Mortensen, "The typographic scale". Added 2026-09-28: IBM Carbon type sets (productive/expressive); Spectrum 2 typography; the impeccable and gstack colour-strategy vocabulary (Restrained, Committed, Full palette, Drenched); WCAG Understanding 1.4.4 and utopia-core's WCAG check for fluid type; NN/g, "Dark Mode vs. Light Mode" and "Typography for Glanceable Reading"; measurements from this skill's own scripts (`research/experiments/`).
