# Design fundamentals, colour and typography — the theory this skill works to

Read at the start of Phase 3 (art direction), before deciding a palette, a type scale or a layout system, and again when filling `DESIGN.md`. It is a working reference: every rule is stated so it can be checked against a render or a token file, and the numbers are the ones the sources give. Companion files: `ui-ux.md` (interaction, forms, states, accessibility), `web-design.md` (pages, heroes, responsiveness, performance), `logo-design.md` (marks and identity).

---

## Part A — Design fundamentals

### A1. What "good" means

- **Dieter Rams' ten principles** are still the shortest complete definition: good design is innovative, useful, aesthetic, understandable, unobtrusive, honest, long-lasting, thorough down to the last detail, environmentally friendly, and *as little design as possible* — "less, but better". Two of them do most of the work on the web: **honest** (it does not make the product look more capable than it is — no invented proof, no fabricated capability) and **thorough** ("nothing must be arbitrary or left to chance").
- **Vignelli's canon**: every piece of design is judged on three axes — *semantics* (does it mean the right thing for this company?), *syntactics* (is it built with discipline: one grid, one type family, consistent spacing?), *pragmatics* (can people read it, use it, find it?). Ambiguity, fashion and visual noise are the enemies; timelessness is the goal. Vignelli used a handful of typefaces for a lifetime — restraint is a design decision, not a limitation.
- **Paul Rand**: a design gets its meaning from the quality of the thing it stands for, not the other way round; likes and dislikes "should play no part" — judge by whether it *works* (distinctive, visible, adaptable, memorable, universal, durable, simple).
- **The aesthetic-usability effect** (Kurosu & Kashimura 1995, 26 ATM designs, 252 people; Tractinsky replications): people rate attractive interfaces as easier to use, and are more tolerant of small friction in them. Attractiveness is therefore functional — but it masks *minor* problems only; it does not rescue a broken flow, and in testing it hides real problems behind praise (watch what people do, not what they say).
- **Norman's three levels** — visceral (the first-glance feeling), behavioural (using it), reflective (what it says about me). A marketing site is judged viscerally in the first second, behaviourally on the first scroll and tap, reflectively when the visitor decides whether it is "for people like me". Design each level on purpose.

### A2. Gestalt — how the eye groups before it reads

Every layout is explained by two or three of these; if a chapter cannot be explained by any of them, it is a pile.

| Principle | The eye assumes… | Use it for |
| --- | --- | --- |
| Proximity | things close together belong together | a label near its field, a caption near its image; *more space between groups than within them* |
| Similarity | things that look alike are the same kind | one button style = one meaning; every link looks like a link |
| Common region | things inside one boundary are a group | a sheet, a panel, a table — the boundary does the grouping, not a border on each item |
| Continuity | the eye follows a line, curve or alignment | a rail, a timeline path, a column edge; alignment is continuity |
| Closure | the eye completes a missing shape | negative-space marks, cropped photographs, partially shown next slides |
| Figure / ground | one thing is the subject, the rest is ground | one focal object per view; copy always has a ground of its own |
| Symmetry and order (Prägnanz) | the simplest, most stable reading wins | simple geometry reads before ornament; balance reads as calm |
| Uniform connectedness | things visibly linked are related | a line joining nodes, a shared background band |
| Common fate | things that move together belong together | staggered reveals, accordion arrows pointing the same way |
| Focal point / von Restorff | the one that differs is remembered | one accent element per viewport; the primary action |
| Emergence | the whole is seen before the parts | a logo or illustration reads at a glance or it does not |

Two corollaries the sources stress: **spacing groups before borders do** (use space and a change of ground first; a hairline only where space cannot), and **the accent only works if it is rare** (von Restorff needs a field of sameness to stand out from).

### A3. Visual hierarchy — the order the eye takes things in

NN/g's definition: arranging elements so the eye consumes them *in the order of intended importance*. The levers, with the working limits the research gives:

- **Scale**: no more than three sizes in a view (small / medium / large); at most two "big" things per viewport or nothing is big. Web ranges the article cites: 14–16 body, 18–22 subhead, up to ~32 for a heading inside content; display type on a landing page runs above that but still on one scale (Part C).
- **Colour and contrast**: saturated for the important, desaturated for the rest; at most 2 primary + 2 secondary colours in a simple design and no more than 3 contrast levels; never hierarchy by colour alone (colour blindness, Part B).
- **Weight and style**: bold and colour before size — de-emphasise the surroundings to make one thing important (Refactoring UI). Two or three text colours (primary / secondary / muted) and two or three weights carry more hierarchy than five sizes.
- **Position and reading pattern**: the top-left of a Western page and the first two words of a line are read first; the F-pattern is what people do *when the design gives them no better cues* — headings, front-loaded sentences, bold key terms and lists turn it into a "layer-cake" scan (`ui-ux.md` §6).
- **Space**: more space around an element raises its importance; grouped things sit closer than unrelated things.
- **The squint (blur) test**: blur the render to ~3px. What still reads is the hierarchy you actually shipped. If nothing reads, or the wrong thing does, fix the layout, not the copy.

### A4. Space, grid and rhythm

- **Whitespace is active.** Macro whitespace (between chapters and columns) sets pace and perceived quality; micro whitespace (between lines, letters, list items) sets legibility. The correct amount is "more than feels comfortable, then remove a little".
- **A spacing scale**, not ad-hoc values: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Vertical space between chapters is one of the large steps; inside a chapter, one of the middle ones; inside a component, the small ones. Every spacing decision is a choice *from the scale*.
- **Grids** (Müller-Brockmann, the Swiss school; the 12-column web grid). Kinds: manuscript (one column of text), column, modular (columns × rows), hierarchical (regions sized by importance). On the web: a 12-column container with fixed gutters gives 2/3/4/6-column layouts for free; content chooses the span, not the device. A **baseline grid** (line-height as the unit; all vertical spacing in multiples of it) is what makes a page feel "set" rather than "placed".
- **Rhythm** is variation on a beat: chapters alternate composition and surface; within a chapter, repetition (same card, same row) is the beat and one break in it is the emphasis. A page of identical chapters has no rhythm; a page where every chapter is different has no beat.
- **Alignment is the cheapest quality**: everything sits on a column edge or a baseline. Centred text is for one or two lines; long centred paragraphs are a mistake (Part C).
- **Balance** can be symmetrical (calm, institutional) or asymmetrical (energy, editorial). Asymmetry needs a counterweight — a large quiet area balancing a small loud one — or it reads as unfinished.
- **Break the grid on purpose, once**: a bleed, an overlap, an element crossing a rule. One break is a design decision; three are chaos.

### A5. Robin Williams' four, as a final pass

Contrast (if two things are not the same, make them very different), Repetition (repeat the visual devices — the stamp, the rule, the sheet — so the page is one system), Alignment (nothing placed arbitrarily; every element has a visual connection to another), Proximity (related things together). A chapter that fails one of these will look "off" without anyone being able to say why.

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

### B3. Proportion — the 60 / 30 / 10 budget

~60% dominant neutral surface, ~30% secondary (alternate surface or the brand dark), ~10% accent. The accent's *job* is "act here"; every square metre spent on decoration spends that meaning.

- A full-bleed accent field is right **once** per page, as the identity moment.
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

**Neutrals are tinted** with the brand-dark hue (cool for a navy brand, warm for a brown one); plan 8–10 of them and a near-black that is a dark tint, not #000.

**The 12-step role scale** (Radix): 1–2 page/subtle backgrounds · 3–5 component rest/hover/pressed · 6–8 borders (non-interactive, interactive, strong/focus) · 9–10 solid fills (9 = highest chroma) and hover · 11–12 text (secondary ≥ Lc 60 on step 2, primary ≥ Lc 90). You need not ship twelve tokens; you must know which role each token plays.

### B6. Text on colour, and contrast

- Grey text on a coloured ground is wrong; use the *same hue* at low chroma and very different lightness. White on a saturated warm hue usually fails for body text (`#fff` on `#FF5A1F` ≈ 3.1:1): display sizes only; body copy on a warm field takes the brand dark.
- **WCAG 2.x**: 4.5:1 for text below ~24px regular / 19px bold; 3:1 for larger text, icons and control boundaries; AAA 7:1 / 4.5:1. **APCA** (perceptual): Lc 90 body columns, 75 body minimum, 60 content text (≥ 24px/400 or 16px/700), 45 headlines and pictograms, 30 placeholders/disabled, 15 the faintest non-text edge. Dark mode needs *more* margin — WCAG overstates contrast between two dark colours.
- Measure every pair **on its rendered ground** and table it in `DESIGN.md`.

### B7. Colour vision deficiency

About **8% of men and 0.4–0.5% of women** have a congenital deficiency; deuteranomaly (weak green) alone is ~5% of men; blue-yellow forms are ~0.01%. Red-green deficiency confuses **red / green / orange / brown**, **blue / purple**, **cyan / grey**, **rose / grey**, **yellow / neon green**. Rules: never encode meaning by hue alone — pair colour with a word, a mark, a position or a pattern; keep status colours far apart in *lightness*, not only hue; check the palette in a deuteranopia simulation; an orange accent beside a green "ok" is a real risk unless the lightness differs clearly.

### B8. Dark mode

Not pure black or pure white (use `rgb(5 5 5)`-ish grounds and `rgb(250 250 250)`-ish text to avoid halation); **elevation by lightness** (higher surfaces are lighter — Material's overlay scale); **desaturate accents** (a saturated brand colour on a dark ground vibrates; Material uses the 200-tone); text at three opacities (≈ 87 / 60 / 38%); dim or slightly desaturate photographs (most people prefer it); invert icons, not photos; `currentColor` for inline SVG; tokens named by role (`--accent`) never by value (`--orange`). Every colour token gets a dark value or the theme is not a theme.

### B9. Semantic colours are data

Green = succeeded / available, red = failed / danger, amber = attention — and nothing decorative uses those hues. A green "verified" mark keeps its meaning only while green is never an accent.

---

## Part C — Typography

### C1. The rules with numbers (Bringhurst, Butterick, the web adaptations)

- **Body size** 15–25px on the web (16 is the default and a fine baseline); **line spacing** 120–145% (1.5 for a long measure); **measure** 45–90 characters including spaces — aim 60–70 (the "69 characters" middle); **ragged right**, never justified on the web (rivers, hyphenation).
- **Paragraphs**: space *or* indent, never both; one line-height between paragraphs, or a 1-en indent on every paragraph after the first.
- **Capitals**: letterspace all strings of capitals and small caps by 5–12%; all-caps only for less than a line; **never letterspace lower case** without a reason.
- **Figures**: tabular (monospaced) figures in tables and anywhere numbers align; proportional elsewhere. Titling figures with full caps, text figures otherwise.
- **Punctuation**: real quotes and apostrophes (‘ ’ “ ”), en dash for ranges (17–25), em dash for breaks, one ellipsis glyph, hard spaces inside short numerical expressions ("$164 per hire", "3 min"). Hang quotation marks and bullets outside the margin where the design is fine enough to show it.
- **Emphasis**: bold *or* italic, never both; underline only for links.
- **Hyphenation**: at least two characters left behind and three taken forward; never more than three hyphenated lines in a row; never begin a column with the last line of a paragraph.

### C2. Scale and rhythm

- "Don't compose without a scale" (Bringhurst 3.1.1). Build sizes from a ratio and use every step you define. The classic scale doubles every five steps: `f = f₀ · 2^(i/5)` → 12 · 14 · 16 · 18 · 21 · 24 · 30 · 36 · 42 · 48 · 55 · 63 · 72 · 96. Alternatives: 1.25 (calm), 1.333–1.5 (editorial), 1.618 (very few, very large steps).
- Line-height falls as size rises: 1.5 for body, 1.3 for subheads, 1.05–1.15 for display, 0.95–1.0 only for very large single lines.
- **Vertical rhythm**: pick the body line-height as the unit and set every vertical margin and padding to a multiple of it; heading line-heights are chosen so they add up to whole units.
- **Fluid type** on the web: `clamp(min, vw-based, max)` between the phone and desktop steps, so headings scale with the viewport without a breakpoint per size.

### C3. Choosing and pairing families

- One display family and one text family is enough; a third (data or code) only for a technical product.
- **Pairing**: contrast in *classification* (a geometric sans display with a humanist sans text; a sans with a serif), concord in *proportion* (similar x-height and width so they sit on one line together); never two faces from the same classification but different families (two slab serifs, two grotesks — discord). One superfamily with weights is the safest pairing of all. Assign each face a fixed role; match moods (a playful display on a formal text face jars).
- **Match the display face to the wordmark's construction** (`art-direction.md`): a rounded geometric mark wants a geometric or humanist grotesk; a serif wordmark wants a serif or high-contrast sans; a condensed industrial face belongs to signage, sport and workwear brands and reads as harsh on a product about people.
- **Voice**: monospace is a developer voice; **tracked small capitals in a hard grotesk at 10–13px read as a spec sheet or code even without a monospace face** — for consumer, services, hiring or manufacturing brands use sentence case in the text face at 600, and allow at most one small-caps device on the page. Strings that look like machine output (an MRZ line, a hash, a serial block) read as code whatever the font: draw the object or leave it out.
- **Hierarchy by weight and colour before size**: two or three weights and text colours do more than five sizes; de-emphasise neighbours instead of enlarging the subject.

### C4. Web mechanics

- Load only the weights used; `font-display: swap` (or `optional` for non-critical faces); preconnect to the font host; subset if self-hosting; prefer variable fonts when three or more weights are needed.
- Body colour is a dark tint of the brand hue, not #000; secondary text one step lighter; muted one more — all three measured on every surface they appear on.
- `text-wrap: balance` for headings, `max-width` in `ch` for measure, `font-variant-numeric: tabular-nums` where figures align, `hanging-punctuation` where supported.
- Never let a JSX/Astro entity swallow a leading space (a rendering trap noted in this repo's own docs): write the character.

---

## Part D — Checklists (fill before implementation)

**Palette**

- [ ] Brand hues sampled from the logo files; harmony named; which hue dominates, supports, accents.
- [ ] Neutrals tinted with the brand-dark hue; ≥ 8 steps with roles assigned per the 12-step table.
- [ ] Accent has exactly: solid (9), hover (10), text-safe dark (11, ≥ 4.5:1 on white and on the alternate surface), tint surface (2).
- [ ] Budget per page ≈ 60/30/10; accent fields counted; the primary action is one colour everywhere; labels and numerals off the accent.
- [ ] Every text/ground pair in use tabled with WCAG ratio and APCA Lc on the real ground; dark-mode values for every token if the site themes.
- [ ] Deuteranopia check: no meaning by hue alone; status colours differ in lightness.
- [ ] Semantic colours reserved for state.

**Typography**

- [ ] Scale ratio stated; sizes listed; every step used.
- [ ] Body 15–25px, line-height 1.4–1.55, measure 60–70ch, ragged right.
- [ ] Display face justified by the wordmark's construction; pairing contrasts in classification, concords in proportion.
- [ ] At most one caps/tracked device; caps tracked 5–12%; nothing typeset to look like machine output.
- [ ] Only the weights used are loaded; swap/preconnect; no layout shift from fonts.

**Layout**

- [ ] One spacing scale; vertical rhythm on the body line-height; a container and gutter per breakpoint.
- [ ] Each chapter explainable by two Gestalt principles; the squint test shows the intended hierarchy.
- [ ] ≤ 3 sizes and ≤ 2 "big" elements per viewport; one focal element; one accent element.
- [ ] Space and ground group content before borders do; cards only for card-shaped content.
- [ ] One deliberate grid break per page at most.

## Sources read for this reference

Rams (Vitsœ, "Ten principles for good design"); Vignelli, *The Vignelli Canon*; Rand, "Logos, Flags, and Escutcheons" (1991) and the Rand test; Kurosu & Kashimura / Tractinsky via NN/g, "The Aesthetic-Usability Effect"; Norman, *The Design of Everyday Things* and *Emotional Design*; NN/g, "Visual Hierarchy in UX", "Gestalt Principles" and IxDF's Gestalt overview; Wikipedia, "Grid (graphic design)" (Müller-Brockmann, the Swiss school); Williams, *The Non-Designer's Design Book*; Albers, *Interaction of Color* (via Wikipedia); Itten, *The Art of Color* — the seven contrasts (via Wikipedia); Material Color Utilities README (HCT, tonal palettes, tone-difference contrast); Radix Colors, "Understanding the scale"; Stripe, "Designing accessible color systems"; APCA "Easy intro"; Refactoring UI (palette, hierarchy, spacing chapters via summaries); web.dev, "prefers-color-scheme" (dark-mode guidance); Wikipedia, "Color blindness" (prevalence, confusion lines); Wikipedia, "Color psychology" (Labrecque & Milne, caveats); Butterick, *Practical Typography*; Bringhurst via *The Elements of Typographic Style Applied to the Web*; Smashing Magazine, "Technical Web Typography" (2011) and "Best Practices of Combining Typefaces" (2010); Spencer Mortensen, "The typographic scale".
