# Design and colour theory — the rules this skill works to

Read this at the start of Phase 3 (art direction), before deciding a palette or a type scale, and again when filling the "Colour" and "Typography" sections of `DESIGN.md`. It is a working reference, not a textbook: every rule below is stated so it can be checked against a render or a token file. Sources are listed at the end.

## 1. Colour is a system of relationships, not a set of swatches

A palette is judged by the relationships between its colours — hue, lightness and chroma — and by how much of each the page uses. Pick relationships first, values second.

### Harmony (hue relationships)

Start from the brand's own hues (sample the logo — `audit.md`) and place them on the wheel before choosing anything else.

| Scheme | What it is | When it works | Watch for |
| --- | --- | --- | --- |
| Monochromatic | one hue, varied lightness/chroma | quiet, editorial, product-led sites | can go flat; needs a strong type or photo layer |
| Analogous | 2–3 adjacent hues (within ~60°) | warmth or coolness as a mood | low contrast between hues — carry hierarchy with lightness |
| Complementary | two hues ~180° apart (orange/blue, purple/yellow) | one brand colour plus its "answer"; high energy | vibrating edges when both are saturated and adjacent; never put them at equal weight |
| Split-complementary | a hue plus the two either side of its complement | most of complementary's contrast with less tension — the usual safe choice | still needs one hue to dominate |
| Triadic | three hues 120° apart | playful, consumer brands | hard to keep premium; desaturate two of the three |

**Rule:** one hue dominates, one supports, one accents. A harmony with three equal voices is a poster, not a site.

### Proportion — the 60 / 30 / 10 budget

Roughly 60% of what the eye sees should be the dominant (neutral) surface, 30% the secondary surface or brand-dark, 10% the accent. The accent's *job* is to mean "act here"; every square metre of accent used as decoration spends that meaning. So:

- **Count large accent-coloured fields as accent spend.** A full-bleed accent chapter can be right once per page, as the identity moment — not three times.
- **The primary call to action is one colour, everywhere.** If a chapter's ground makes that colour impossible, change the chapter's ground, not the button (NN/g: consistency of action colour beats local contrast tricks).
- **Labels, numerals, rules and icons do not get the accent by default.** They take the ink or a muted tint; the accent goes to emphasis and action only. If the accent appears on every heading, it means nothing.
- Dark chapters count toward the 30%; a page whose chapters alternate white → dark → accent → dark → accent has inverted the budget.

### Lightness carries hierarchy; chroma carries emotion; hue carries the label

The three levers do different jobs (brand-psychology writing and Refactoring UI agree on this):

- **Hue** carries the cultural label — blue/navy reads as trust and authority, orange as warmth, value and energy, green as growth and "go", red as urgency. A brand's hue is already chosen; do not relabel it.
- **Chroma (saturation)** carries intensity. A red-leaning orange feels assertive; a peach feels relaxed. Lower chroma to calm a colour, do not shift its hue.
- **Lightness** carries hierarchy and legibility. Nearly every "the text is hard to read" and "nothing stands out" problem is a lightness problem.

### Build scales perceptually (OKLCH / Lab), not in HSL

HSL lightness lies: `hsl(60 70% 50%)` (yellow) is far brighter to the eye than `hsl(240 70% 50%)` (blue). Stripe rebuilt its palette in Lab so that every hue at a given level has the *same* perceived lightness — then any two colours ≥ 5 levels apart pass 4.5:1 for small text and ≥ 4 apart pass 3:1 for large text and icons. OKLCH gives the same property in CSS (`oklch(L C H)`, supported everywhere since 2023).

Procedure for a scale:

1. Fix **H** to the brand hue.
2. Step **L** evenly (e.g. 0.98, 0.95, 0.90, 0.82, 0.70, 0.60, 0.50, 0.40, 0.30, 0.22, 0.15).
3. Let **C** rise toward the middle and fall toward both ends — near-white and near-black cannot hold chroma without clipping, and the eye reads a saturated mid-tone as the "pure" colour. Refactoring UI's version of the same rule: the further from 50% lightness, the more saturation you need to *add* to keep the colour from looking washed out.
4. Rotate H slightly toward a brighter neighbour when lightening (yellow-ward for warm hues) and toward a darker neighbour when darkening — this keeps tints from looking chalky and shades from looking muddy.
5. Check every step actually falls inside sRGB; clamp chroma, never lightness.

Chroma bands that stay safe: neutrals C ≤ 0.02, tinted surfaces 0.02–0.06, "muted" brand 0.10–0.16, "rich" brand 0.16–0.25. Above 0.25 most hues clip somewhere in the scale.

### Neutrals are tinted, and you need more of them than you think

Pure grey (#888) looks dead beside a coloured accent. Give the greys a whisper of the brand's dark hue (C 0.005–0.02) — cool for blue/navy brands, warm for orange/brown ones — so surfaces, rules and secondary text all belong to the same family. Refactoring UI: plan for 8–10 greys, and a near-black (a dark tint of the brand hue) rather than #000.

### The 12-step role scale

Radix's scale is the clearest statement of *what each lightness is for*, and it transfers to any hue:

| Steps | Role |
| --- | --- |
| 1–2 | page and subtle component backgrounds |
| 3–5 | component background: rest, hover, pressed/selected |
| 6–8 | borders: non-interactive, interactive, strong/focus ring |
| 9–10 | solid fills (the highest-chroma step is 9): buttons, badges; 10 = hover |
| 11–12 | text: secondary (Lc ≥ 60 on step 2) and primary (Lc ≥ 90 on step 2) |

You do not need twelve tokens, but you do need to know which of these roles a token is playing — a "border" colour used as body text is the usual failure.

### Text on a coloured ground

Do not put grey text on a coloured background. Pick a colour of the *same hue* as the ground, with lower chroma and either much lower or much higher lightness (Refactoring UI). White on saturated orange or yellow usually fails: `#fff` on `#FF5A1F` is ~3.1:1 — fine at display sizes, not for a sentence. Use the brand dark (navy, ink) for body copy on a warm field and keep white for headlines only.

### Contrast — measure with both scales

- **WCAG 2.x** (the legal floor): 4.5:1 for text under ~24px regular / 19px bold, 3:1 for larger text and for meaningful graphics and controls. AAA is 7:1 / 4.5:1.
- **APCA** (the perceptual truth): Lc 90 for body columns, Lc 75 minimum for body, Lc 60 for content text you want read (≥ 24px/400 or 16px/700), Lc 45 for headlines and fine pictograms (≥ 36px/400 or 24px/700), Lc 30 placeholders and disabled, Lc 15 the lowest discernible non-text edge. Negative values are light-on-dark; dark mode needs *more* margin, not less, because WCAG overstates contrast between two dark colours.
- Check pairs on the **rendered** grounds, including tinted surfaces and image chapters; a muted text colour that passes on white often fails on the grey alternate surface.

### Semantic colours are data, not decoration

Green means succeeded, red means failed, amber means attention — and nothing else on the page uses those hues. A green "verified" mark stays meaningful only if green is never a decorative accent.

## 2. Typography

- **One display family and one text family** is enough; a third (data, code) only if the product is technical. Body text 15–25px on the web, line spacing 120–145% of the size, measure 45–90 characters (aim for 60–70).
- **Build the sizes from a scale, not by taste.** The classic scale doubles every five steps (`f = f₀ · 2^(i/5)`): 12, 14, 16, 18, 21, 24, 30, 36, 48, 60, 72 (and on). Alternatives: a fixed ratio (1.25 for calm, 1.333–1.5 for editorial drama, 1.618 for very few, very large steps). Pick the ratio to suit the voice, then *use every step you define* — a scale with unused levels is a swatch, not a system.
- **Hierarchy by weight and colour before size** (Refactoring UI). Two or three weights and two or three text colours (primary, secondary, muted) do more than five sizes. De-emphasise the surroundings rather than shouting the headline.
- **Caps need tracking (5–12%) and brevity (under one line).** A run of tracked capitals in a condensed or geometric grotesk at 10–12px reads as a terminal, a spec sheet, or code — *even without a monospace face*. For a consumer, services, hiring or manufacturing brand, prefer sentence case in the text face at 600 weight, and reserve small caps for a single device (one label style), not for every label on the page. Strings that look like machine output (`P<CLEOHR<<SANTOS<<<<`, hashes, serials) read as code no matter the font; if the concept needs the object, draw it (a signature line, a stamp), do not typeset it.
- **Match the display face to the wordmark's construction** (see `art-direction.md`): a geometric rounded mark wants a geometric or humanist grotesk; a serif wordmark wants a serif or a high-contrast sans. Condensed industrial faces belong to signage, sport and workwear brands; they read as "harsh" on a product about people unless the copy is warm enough to carry them.
- Bold or italic for emphasis, never both; underline only for links.

## 3. Layout and hierarchy

- **Gestalt does the work before colour does.** Proximity (things close together are one thing), similarity (same style = same kind), common region (a shared ground groups), continuity (the eye follows a line or a path), closure (the eye completes a shape), figure/ground (one clear subject per view), focal point (one thing stands out), symmetry/balance. Every chapter should be explainable by two of these.
- **Spacing is a scale too.** A constrained set (4, 8, 12, 16, 24, 32, 48, 64, 96, 128) with *more space between groups than within them*. Start with too much whitespace and remove.
- **Hierarchy by de-emphasis.** To make one thing important, quieten its neighbours (lighter weight, muted colour, smaller) instead of making it louder.
- **Borders last.** Separate with space and a change of ground first; a hairline only where space cannot do it. A page ruled everywhere reads as a form.
- **Shadows are elevation, not decoration.** Two or three levels at most; a hard offset shadow is a legitimate flat-design device. Shadow colour is a dark tint of the ground's hue, never black.
- **Contrast of composition.** Adjacent chapters differ in *structure* (a split, a register, a diagram, a statement), not only in colour. See `implementation.md`.

## 4. Logos and marks

- **Silhouette test first.** Before sizes, colours or a lockup, look at the mark as a flat shape at 24px and ask what a stranger sees. Circles inside circles, a dot in a round counter, two bumps, a slot on a rounded rectangle (a battery) — the eye reads bodies and objects before it reads letters, and a mark that needs explaining has already failed. List every unintended reading you can find; if any is embarrassing or off-brand, redraw before showing it.
- Two colours, three at most. The mark must survive as **one colour** (ink on white, white on ink, white on the brand field) without losing its idea.
- Legible at **16px** (favicon) and dignified at **160px**. If the idea depends on a detail smaller than 1/16 of the mark's height, it is decoration and will vanish in the tab strip — design so the mark degrades gracefully (the simple form remains when the detail goes).
- The mark's geometry sets the display face: rounded square + geometric letter → geometric sans; a seal or crest → serif or humanist.
- Build the motif into a system: the same construction becomes the favicon, the app icon, a watermark, a list marker, a stamp.
- A wordmark is set in the display face with tighter tracking than running text (−2 to −4%), and never in the body face.

## 5. The palette checklist (fill this before implementation)

- [ ] Brand hues sampled from the logo files; harmony named (which scheme, which hue dominates).
- [ ] Neutrals tinted with the brand-dark hue; ≥ 8 steps, roles assigned per the 12-step table.
- [ ] Accent has: a solid (step 9), a hover (10), a text-safe dark (11, ≥ 4.5:1 on white and on the grey surface), a tint surface (2), and nothing else.
- [ ] Colour budget estimated per page: dominant / secondary / accent ≈ 60 / 30 / 10; accent-coloured fields counted; the primary action is one colour everywhere.
- [ ] Every text/ground pair used on the site listed with its WCAG ratio and APCA Lc, on the real ground.
- [ ] Semantic colours (ok / warn / danger) reserved for state.
- [ ] Type scale written out with the ratio, and every step used somewhere.
- [ ] Caps and tracked labels limited to one device; nothing on the page typeset to look like machine output.

## Sources read for this reference

- Refactoring UI (Wathan & Schoger), "Building your colour palette" and the hierarchy/spacing chapters, via published summaries.
- Radix Colors, "Understanding the scale" — the 12-step role model and its APCA guarantees.
- Stripe, "Designing accessible color systems" — Lab-based lightness levels and the 5-level / 4-level contrast rule.
- APCA documentation, "Easy intro" — Lc thresholds by size and weight.
- ColorArchive, "OKLCH: why perceptual colour space changes how you build palettes"; the OKLCH CSS spec.
- Nielsen Norman Group, "Using color to enhance your design" — restraint, 60-30-10, consistency of action colour.
- Supercharge Design, "Colour harmonies in UI"; UXPin, "How to choose a colour palette for UI design".
- Butterick, *Practical Typography*, "Summary of key rules". Spencer Mortensen, "The typographic scale".
- Interaction Design Foundation, Gestalt principles. Brand colour-psychology writing (Ignyte, Brand Master Academy, Logodesign.net) for hue/chroma/lightness roles and logo colour counts.
