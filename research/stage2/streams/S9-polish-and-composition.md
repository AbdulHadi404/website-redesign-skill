<!-- Stream S9, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S9-polish-and-composition/. The skeptical review is in S9-polish-and-composition.review.json. -->

# S9: Visual composition and polish. Which refinements are perceptible, and a deliberate polish pass

## What the skill already knew

Existing coverage, by file:
- **`design-theory.md`**
  - A2–A5: Gestalt, hierarchy and the squint test, spacing, grids, rhythm, balance and Williams' four.
  - B5: tinted neutrals (line 118; checklist line 191).
  - C1 and C4: tabular figures, `text-wrap: balance` and hanging punctuation "where supported".
- **`accessibility.md`** line 39: a focus token of 2–3 px solid outline with a 2 px offset at 3:1, never box-shadow alone.
- **`anti-patterns.md`**: bans the ghost card, one radius and one shadow on everything, glow shadows, and grain without a material reason.
- **`audit.mjs`**:
  - fails a control with no visible focus change (lines 314–315);
  - checks concentric radii at the top-left corner only, for gaps up to R (`inventory.mjs` 300–326);
  - checks 1–4 px edge drift.
- **`capture.mjs`**: removal variants and blur sheets.
- **Stream G (§1.6)**: lists the craft layer from Krehel, Vercel and Kowalski, but none of it became a check.

What was missing: nothing said which of these moves a viewer can see. There was no polish step in the phases, no stop rule, no lighting, crop or focal-point method, and no way to see low-contrast changes in a diff.

What this stream adds:
- a perceptibility ranking of 24 moves, with its judge and viewing scale stated;
- the defects that "premium" moves introduce;
- evidence that the skill's diff cannot see surface polish;
- a polish probe split into defects and style questions, checked on 19 pages it was not built on;
- a polish-pass procedure with a stop rule that does not use an unvalidated threshold.

## Findings (tagged; numbers where they exist)

The judge throughout is the builder, blind to sheet and side but not to what the moves were. The 1440 sheets were seen at about 0.63× and the 390 sheets at about 2.2× CSS px. Every first-viewport capture shows the primary action keyboard-focused, which is a forced state (see finding 3).

1. **Composition changes register more readily than micro-polish.**
   - Of 24 moves plus a no-change control (50 first-viewport sheets at 1440 and 390), 18 moves were seen in at least one first viewport and 14 were preferred there.
   - Six were never seen in either first viewport: concentric radii, alpha borders, icon optical alignment and font smoothing, plus crop and image hairline, which are below the fold.
   - The control was seen on 0 of 2 sheets. [L `blindScore`, `judgements.json`]

2. **Three tiers**, labelled by what the builder saw, not by what a user will see [L; table in Experiments]:
   - **Tier 1: seen by the builder in the first viewport and preferred.** Glance is % of the first viewport, 1440 / 390.

     | Move | Glance 1440 / 390 | Note |
     |---|---|---|
     | Spacing rhythm | 18.6 / 34.3 | |
     | Scale | 11.5 / 32.7 | Preferred at 390 only; at 1440 it created a lone word |
     | One alignment edge | 10.9 / 23.7 | |
     | Display leading | 9.1 / 29.6 | |
     | Depth staging | 6.4 at 1440 | Baseline preferred at 390 |

   - **Tier 2: small area at the focal point, seen by the builder and preferred.**

     | Move | Glance 1440 / 390 | Note |
     |---|---|---|
     | Accent restraint | 0.81 / 0.79 | |
     | Button proportion | 0.97 / 8.9 | |
     | One icon family | 2.6 / 3.5 | |
     | Designed focus ring | 0.30 / 1.93 | Keyboard-focus state only |
     | `text-wrap` | 2.8 | |
     | Hung bullets | 1.1 | |
     | Crop, and hairline on a light image | – | Below the fold; preferred in their own window |

   - **Tier 3: not seen by the builder at 0.63× (1440) or 2.2× (390); unproven at normal size.**
     - Concentric radii: 0.13 / 0.62.
     - Alpha borders: 0 / 0.56.
     - `corner-shape: squircle`: 0.13 / 0.38, or 0.08 / 0.20 without the forced focus.
     - Icon optical alignment: 0.23 / 0.68.
     - Shadow system at 390: 0.03, or 0.26 unfocused.
     - Grain at 1440.
     - Font smoothing: 0.

     The 1440 captures are DPR 1. On a DPR-2 display, hairlines and radii are rendered finer, so this tier is untested for how designers actually view pages.
   - **Seen, never preferred:** optical sizes (7.6 / 9.3), tabular figures in a static table, and grain.
   - **Up close, seen is not better** (2× zooms of the densest change):
     - At 1440, 17 of 20 were seen. The variant was preferred on 2 and the baseline on 3.
     - At 390, 16 of 17 were seen, with 4 and 1.
     - On moves that do not move text, 1440 gave 7 of 9 seen with 2 and 2, and 390 gave 8 of 8 seen with 3 and 1.
     - [L `summarise.mjs` zoom table]

3. **"Location beats area" is a hypothesis, not a finding.**
   - Small changes on the primary action were seen and preferred: accent (0.81 %) and buttons (0.97 %). Both sit at or above the fitted glance line, though, so they do not show that location overrides area.
   - The one case below the line was the focus ring (0.30 %). It was captured in a forced state: `page/index.html` focuses the primary action on load in every variant, so every judged sheet shows a keyboard-focus ring that a pointer user never sees on arrival.
   - Grain (5.8 % changed, unseen) is noise that averages out, not a test of location.
   - Re-measured without the forced state [L `results.nofocus`]:
     - The forced focus alone changes 0.15 % (1440) and 0.95 % (390) of the glance.
     - Every other move's glance moved by at most 0.66 points, and the glance rule's seen or not-seen call changed on 1 of 50 sheets (focusring@390, by construction).
     - The squircle's measured change at 390 halves without the ring, so its "judged worse at 390" rests on the ring defect.
   - The judgements themselves cannot be redone blind; I have seen the key.

4. **The five least-visible moves together** (radius, border, icon alignment, squircle, shadow) changed 1.1 % / 1.6 % glance, against 18.6 / 34.3 for rhythm alone [L]. The builder's preferences on the stack sheets carry no weight (finding 5). One observation from them is a defect in its own right: removing card borders under a 5 % shadow left the pricing cards with almost no edge (s06).

5. **Stack preferences are unblinded and carry no evidential weight.**
   - The stacks were defined after the single-move key was opened, and the judge's notes name signature moves ("designed focus ring", "one accent", "neutral ticks").
   - s01 and s07 record the stray depth slab at 390, yet the stack was still preferred.
   - s08's preference mostly reflects `balance` repairing a lone word that the scale move created.
   - What stands is the measurement: all 24 against the top five differ by 20.5 % / 21.3 % glance [L].

6. **The skill's diff cannot see surface polish** (this does not depend on the judge) [L `labChecks`]:
   - A 1 px 10 %-black hairline changed 436 px. Pixelmatch at `compare.mjs`'s threshold reports 0 %; CIEDE2000 > 1 reports 2.18 %.
   - A soft 8 % shadow changed 3,124 px; pixelmatch 0 %, ΔE00 > 1 4.22 %.
   - In the page, the shadow move scored pm < 0.01 % against ΔE00 > 1 2.53 %, and the neutral tint scored pm 0 % against 54 %.
   - As a predictor of "seen" (50 sheets, same judge, threshold fitted on the same sheets) [L `summarise.mjs`]:

     | Measure | Fitted | Leave-one-out |
     |---|---|---|
     | Glance (ΔE00 > 2.3 after 4× downscale) | 47 | 43 |
     | ΔE00 > 1 at full resolution | 45 | 44 |
     | ΔE00 > 2.3 at full resolution | 45 | 43 |
     | pixelmatch | 42 | 39 |
     | "Always seen" (base rate) | 32 | – |

   - The glance threshold (0.785 %) is set by one sheet (shadow@1440, seen) against iconalign@390 (0.682 %, unseen).
   - Conclusion: every ΔE measure beats pixelmatch by 4–5 sheets, but the glance's advantage over full-resolution ΔE disappears under leave-one-out. No threshold is validated.

7. **"Premium" moves introduced defects that only a render shows** [L]:
   - Scale 48→64 px and tracking −0.025 em each re-broke the 1440 headline ("go" and "you go" left alone). The probe's lone-word check caught scale's h1 but not tracking's two-word runt.
   - `corner-shape: squircle` with the default ring leaves the fill poking out of the ring. Chromium draws `outline-style: auto` round and ignores `corner-shape`; a solid outline follows it [L `shots/focus-ring-corner-shape.jpg`]. The v2 probe now flags this ("6 of 7 focused controls show the default ring on a non-round corner-shape"); it is the only check that any single move introduced [L `singles.probe.squircle`].
   - The depth plane read as a stray slab at 390.
   - Demoting the panel's "Publish" to an outline read weaker up close.

8. **Platform no-ops and support.**
   - Font smoothing plus `optimizeLegibility` changed 0 px in Chromium 141 on Linux [L]; it takes effect on macOS only [S dbushell.com 2024; V BCD lists it only under `font-smooth`].
   - `hanging-punctuation`: full support in Safari only [V BCD]. Hanging by hand needs a margin to hang into, and at 390 there was none [L].
   - `text-wrap-style: pretty`: Chrome 130 and Safari 26, not Firefox; `balance` works everywhere [V BCD]. Chromium's `pretty` targets one-word last lines [S Chrome for Developers], so two ledes keep a short last line in the 24-move stack [L].
   - `corner-shape`: Chrome 139 only. `text-box-trim`: Chrome 133, Safari 18.2, Firefox 154 [V BCD].
   - The weight-only Google Sans Flex file is the frozen "18pt" instance with no opsz axis [V `fonts.mjs`].

9. **One light is a system convention; tint is not.**
   - Material's umbra, penumbra and ambient maps have x = 0 at every level. Level 0 is no shadow; y runs from 1 px at level 1 up to 11 (umbra), 24 (penumbra) and 9 px (ambient) at level 24. The colour is black at 0.20 / 0.14 / 0.12, so untinted [V material-components-web `packages/mdc-elevation/_elevation-theme.scss` lines 39–42 and 44–128, MIT].
   - Vercel asks for layered shadows and hue-tinted borders and shadows [V vercel-labs/web-interface-guidelines `AGENTS.md` lines 81 and 147–150].
   - Krehel calls non-concentric radii "the most common thing that makes interfaces feel off" [V jakubkrehel/make-interfaces-feel-better `skills/make-interfaces-feel-better/SKILL.md`]. In this lab the move was not seen at the tested sizes.

10. **Value structure shows the focal-point failure as numbers.**
    - Greyscale and a 12 px blur at 1440, mean grey in each button box (0 black, 1 white), against a ground of 0.957:

      | Variant | Hero CTA | Publish |
      |---|---|---|
      | Baseline | 0.598 | 0.659 |
      | Baseline without the forced focus | 0.624 | 0.659 |
      | Accent restraint | 0.598 | 0.937 (the second mass disappears) |
      | Bottom-five stack | 0.600 | 0.658 (same as the baseline) |

    - So there are two near-equal dark masses with or without the forced focus [L `nofocus.valueMasses`, `shots/value-structure-focus-1440.jpg`].
    - This fits first-impression research: judgements form in 17–50 ms and are driven by complexity and prototypicality, and white space raises perceived quality [S Lindgaard 2006; Tuch 2012; Pracejus et al. 2006].

11. **`audit.mjs` concentric check: one coverage gap and one bug.**
    - It missed 1 of 3 flagged nestings on the baseline: the Publish button (r12 in panel-foot r12, gap 12 = R), which sits at the right-hand corner the audit does not check.
    - The other two, a status chip at gap 17 and a panel-foot at gap 13, both in r12, are gap > R cases the audit excludes by design.
    - Its one report, a circular play disc inside a button, is a false positive: discs and pills are a role, not a nesting.
    - The probe (v2) now checks four corners and the nearest painted rounded ancestor, skips discs and pills, flags only at gap ≤ R, and lists R < gap ≤ 1.5 R as information. That removes v1's dashboard false positive (input r10 in card r18, gap 22). [V `inventory.mjs` 300–326; L `labChecks.auditConcentric`, `outside`]
    - Concentric radii are Tier 3, so this check finds a defect, not a perceptible improvement.

12. **The polish probe (v2): what it is, and how it did outside its fixture.**
    - **Defects** (errors nobody intends):
      - concentric at gap ≤ R;
      - no visible focus change, or the default ring on a non-round `corner-shape`;
      - an asymmetric glyph centred by its box;
      - proportional figures in number columns;
      - lone last words;
      - inline icons off the text beside them (≤ 24 px, label in the icon's own control, visually hidden text excluded);
      - headings as close to what precedes them as to what follows (eyebrows, kickers and step numbers count as part of the heading; component-internal and out-of-flow cases are skipped);
      - text edges 1–4 px apart (right edges for RTL).
    - **Style questions:** pure greys, opaque borders, unlayered shadows, display leading, centred headings, offsets of 5–24 px, the accent count, un-hung bullets, unframed light images, a mixed icon set, and the default ring.
    - It uses no class names from the fixture. The primary action is found as the most saturated filled control in the first viewport (fill or gradient), or passed with `--primary`. [V `lib/probe.mjs`]
    - **On the fixture** it raises 5 defects and 11 style questions, and 13 moves each clear their own flag. This is a self-test: the baseline was built to trip these checks.
    - **On pages it was not built on** (builder verdicts, not blind) [L `outside`, `outside-review.json`]:
      - Eleven pages were used to revise v2 after review; every v1 error the reviewer listed is resolved there.
      - Seven held-out pages were then run once: of 11 defect flags, 7 were true, 2 were at the check's boundary (sanad button at gap = R; a 1.33 px sort icon) and 2 were false (card titles inside a bordered card; a runt caused by an inline button).
      - After fixing both classes: 19 true, 0 false, 2 boundary and 1 unverified across all 19 pages. The held-out set is now spent, so this is not an independent estimate.
    - It cannot judge scale, rhythm, depth, crop, grain, proportion, optical size or wrap quality. Its proximity check did not flag the baseline's rhythm problem, which was the most visible move.

13. **Failure cases** [S; grades A company statement, B independent measurement].

    | Case | Grade | What happened |
    |---|---|---|
    | Sonos 2024 | A | Features removed; guidance cut by about $100M |
    | Snapchat 2018 | A | Daily users 191M → 188M |
    | M&S 2014 | A | Online sales −8.1 %; every customer had to re-register |
    | Digg v4 2010 | B | Traffic −26 % (US), −34 % (UK) |
    | Skype 2017 | B | App Store rating 3.5 → 1.5 |
    | Twitter 2021 | A | Contrast reduced within days |
    | Instagram 2022 | A | Rollback |
    | Liquid Glass 2025 | A | Legibility toggle added |
    | Windows 8 | A | Start button returned |

    Outcry that did not mean failure: Facebook 2008 and Reddit's `old.reddit`. Research: hidden navigation made tasks 39 % slower on desktop and 15 % slower on mobile, and weak signifiers cost 22 % more time (NN/g).

## Experiments

**What I built,** in `research/stage2/experiments/S9-polish-and-composition/`:
- **Fixture.** A fixture page (`page/`) with 24 moves plus a null control, each a class on `<html>`.
- **Captures.** Every variant at 1440 and 390 (DPR 2), with the skill's `capture.mjs`.
- **Measures** (`lib/img.mjs`), against the baseline on the first viewport, the full page and windows below the fold:
  - pixelmatch;
  - CIEDE2000 > 1 and > 2.3;
  - glance (ΔE > 2.3 after a 4× downscale).
- **Blind sheets.** 104 single-move sheets, 3 extra windows and 14 stack sheets, drawn by `compare.mjs` with a seeded randomisation; the key is in `blind-key.json`.
- **After review, added:**
  - a `nofocus` stage: every move re-captured without the forced focus, plus value masses;
  - probe v2 (`lib/probe.mjs`), with v1 frozen as `lib/probe-v1.mjs` for comparison;
  - `outside.mjs`, which runs both versions on 19 pages from other folders, read-only and hash-recorded;
  - `outside-review.json` (hand verdicts);
  - `de-diff.mjs`, a pixelmatch against ΔE CLI to port;
  - leave-one-out, margin and zoom tables in `summarise.mjs`.

**Re-run:**
```bash
npm install
node run.mjs
node summarise.mjs
```
`node run.mjs` took 17 min 31 s at a load average of 7–10. It runs these stages: singles, checks, stacks, nofocus, outside.

Reproducibility:
- Against the committed pre-review `results.json`, all 2,406 `singles.measures` leaves match, as do 384 `stacks.measures`, 288 `vsTop5` and 1,217 `blindScore` leaves.
- `blind-key.json` is byte-identical.
- `summarise.mjs` output is identical across runs.
- The folder is 2.1 MB without `node_modules` and `captures/`; `shots/` holds seven JPEGs (836 KB).

Environment: Chromium 141.0.7390.37, headless on Linux, Node 22.

**Single moves.** Glance and pm are % of the first viewport. Verdicts: + variant preferred, − baseline preferred, = seen with no preference, · not seen.

| Move | glance 1440 / 390 | unfocused glance 1440 / 390 | pm 1440 | first viewport 1440 · 390 | window | zoom 1440 · 390 | clears probe flag |
|---|---|---|---|---|---|---|---|
| rhythm | 18.57 / 34.31 | 18.55 / 33.91 | 7.85 | + · + | + | − · = | – |
| scale | 11.49 / 32.71 | 11.52 / 32.05 | 5.49 | − · + | + | = · = | – |
| align | 10.89 / 23.75 | 10.87 / 23.10 | 3.92 | + · + | + | = · = | alignment |
| leading | 9.10 / 29.65 | 9.03 / 29.46 | 3.49 | + · + | = | = · = | displayType |
| opsz | 7.59 / 9.26 | same | 2.71 | = · = | = | = · = | – |
| depth | 6.41 / 0.91 | same | 1.47 | + · − | = | = | – |
| grain | 5.76 / 6.89 | same | 0.96 | · · = | · | = · = | – |
| tracking | 3.06 / 3.25 | same | 1.00 | − · + | = | = · + | – |
| wrap | 2.84 / 3.25 | same | 1.18 | + · + | + | = · = | – |
| iconstroke | 2.59 / 3.50 | same | 0.96 | + · + | + | · · · | iconFamily |
| tnum | 1.66 / 0.95 | same | 0.61 | = · = | · | + · = | figures |
| hang | 1.11 / 0 | same | 0.45 | + · · | = | = | hanging |
| buttons | 0.97 / 8.93 | 1.01 / 8.71 | 0.47 | + · + | – | = · = | – |
| accent | 0.81 / 0.79 | same | 0.42 | + · + | + | − · + | accent |
| shadow | 0.79 / 0.03 | 0.85 / 0.26 | <0.01 | + · · | = | · | shadows, shadowFinish |
| focusring | 0.30 / 1.93 | 0 / 0 | 0.12 | + · + | – | + · + | focusRingDefault |
| iconalign | 0.23 / 0.68 | same | 0.07 | · · · | – | = · = | iconAlign, discIcons |
| radius | 0.13 / 0.62 | 0.11 / 0.57 | 0.04 | · · · | · | = · = | concentric |
| squircle | 0.13 / 0.38 | 0.08 / 0.20 | 0.04 | · · − | · | − · − | (introduces focusRing) |
| border | 0 / 0.56 | same | 0.05 | · · · | · | · · + | borders |
| neutrals | 51.16 / 63.13 | 51.18 / 63.58 | 0 | + · + | = | – | neutrals |
| crop | below fold | – | 0 | · · · | + | – | – |
| imgoutline | below fold | – | 0 | · · · | + | – | imageEdges |
| smoothing | 0 / 0 | – | 0 | · · · | – | – | – |
| null | 0 / 0 | – | 0 | · · · | – | – | – |

**Predictor table (fitted and leave-one-out),** 50 sheets, builder judge:

| Measure | Threshold | Fitted | Leave-one-out | Sheets either side |
|---|---|---|---|---|
| glance | ≥ 0.785 % | 47 | 43 | shadow@1440 0.785 seen; iconalign@390 0.682 not seen |
| ΔE > 1 | ≥ 0.708 % | 45 | 44 | accent@1440 seen; shadow@390 not seen |
| ΔE > 2.3 | ≥ 0.186 % | 45 | 43 | focusring@1440 seen; radius@1440 not seen |
| pixelmatch | ≥ 0.080 % | 42 | 39 | accent@390 seen; iconalign@1440 not seen |

**Stacks** (measures [L]; preferences unblinded, no weight):

| Stack | pm 1440 | glance 1440 / 390 | Probe flags left at 1440 (defects in bold) |
|---|---|---|---|
| top5 (rhythm, scale, align, leading, neutrals) | 8.63 | 72.2 / 76.9 | 13 (**5**) |
| bottom5 (radius, border, iconalign, squircle, shadow) | 0.14 | 1.1 / 1.6 | 11, including the **focusRing** that squircle introduces |
| rest (19) | 5.35 | 15.3 / 21.3 | 4 (**wrapping**) |
| all (24) | 9.16 | 68.8 / 77.4; vs top5 20.5 / 21.3 | 1 (**wrapping**, two ledes) |

**Probe outside the fixture** (v2 defects; verdicts are the builder's):

| Set | Pages | Defect flags | True | Boundary | False | Unverified |
|---|---|---|---|---|---|---|
| Revised against (after review) | 12 incl. the reviewer's unstyled S8 case | 13 | 12 | 0 | 0 | 1 |
| Held out, first run | 7 | 11 | 7 | 2 | 2 | 0 |
| Held out, after the two fixes | 7 | 9 | 7 | 2 | 0 | 0 |

v1 errors from the review are all resolved in v2:
- Focus: rings removed with `outline: none` are now flagged on slop, dashboard and h-fixture.
- Accent:
  - The slop primary is now found through its gradient.
  - Inputs and fieldsets are no longer counted: v1 counted 17 on S8 unstyled and 4 on govuk-question.
- iconAlign: false positives of +14.5 and −12.5 px are gone.
- Proximity: the eyebrow and step-number flags on house-style are gone.
- Concentric: gap 22 > R on dashboard is now information, not a flag.
- Neutrals and centred headings on govuk and h-fixture are now style questions.

**Lab checks:**
- Hairline: 436 px changed; pm 0 %, ΔE > 1 2.18 %.
- Soft shadow: 3,124 px changed; pm 0 %, ΔE > 1 4.22 %.
- The default ring ignores `corner-shape`; a solid ring follows it.
- `audit.mjs` on the baseline: 1 false positive (the play disc) and the gap ≤ R Publish case missed. The probe: 1 defect plus 2 information rows.

## Decision guidance for the skill

**A. `visual-qa.md`, new section "Polish pass (Phase 6, after the captures, before the critique)", plus one line in SKILL.md Phase 6 (extends).**

- **Entry.** Content is final, the layout is stable at every width, and states are designed. Polish never rescues a direction.
- **Capture state.** Composition captures show no focused control. Capture focus, hover and press separately with `states.mjs`. A focused control alone changed 0.95 % of the phone first viewport [L].
- **Order, macro to micro.** Macro moves re-break lines and move everything below; rhythm changed 34 % of the phone first viewport [L].
  1. **Glance** at the first viewport at 1440 and 390, plus a greyscale blur sheet. Check by eye:
     - two or three value masses, with one dark or saturated mass on the primary action;
     - one large element;
     - more space between groups than within them;
     - depth planes staged per breakpoint (look at the 390 capture separately).

     The probe helps only with the accent count (style question `accent`) and edges (defect `edges`, question `alignment`).
  2. **Type.** Set display leading, then tracking together with `text-wrap: balance`, and `pretty` on body text. Recapture and read every heading and lede's breaks at 390, 768 and 1440. The probe's `wrapping` catches one-word runts but missed a two-word one [L].
  3. **Tokens, never per component.**
     - One light: x = 0, and y and blur growing with elevation [V Material].
     - Layering and tint are a house choice [K]; Material's shadows are untinted.
     - Borders by role; input borders at 3:1 (`accessibility.md`).
     - A radius scale with concentric nesting where the gap is ≤ R.
     - Neutrals per `design-theory.md` B5.
     - Texture only with a material reason.
  4. **Components, from 2× element crops.**
     - One height per button size and one primary per view.
     - One icon family, with stroke tied to text weight.
     - Play glyphs moved about 1/12 of their width toward the point.
     - Tabular figures in columns.
     - Focus ring: solid 2 px outline, 2–3 px offset, 3:1, following the shape. Never the default ring on a `corner-shape` element.
     - A 1 px 10 % inner hairline on light-edged images.

     Use 2× crops to find defects, not to judge whether a refinement is better: at 2× most moves were seen and few were preferred [L].
  5. **States and motion** with `states.mjs` and `motion.mjs`.
  6. **Verify.** Recapture and re-run the probe. Diffing rounds is manual until F lands: `compare.mjs` pixelmatch reports 0 % for hairline, shadow and tint changes [L], so flick between the two captures at 2× for surface changes.
- **Stop rule.** No numeric perceptibility threshold until one is validated. Stop when:
  1. every probe defect is fixed or justified in one line, and every style question is answered (kept on purpose, or changed) in `DESIGN.md`;
  2. there is no new line-break regression at 390, 768 and 1440;
  3. or two rounds have been done.
- **Tier-3 items** (radius, alpha borders, icon alignment, corner shape) are not seen at the tested sizes and are unproven at normal size. Set them once in tokens or shared components, where they cost nothing per screen. Do not spend a round on one-off instances.

**B. `design-theory.md`, new A6 "Composition from other disciplines", plus three items in the Part D layout checklist (extends)** [K, except where tagged]:
- **Value structure:** 2–3 masses and one focal mass. Check with a greyscale and blur sheet; the button-box values in finding 10 [L] show how to make it numeric.
- **Silhouette:** check the no-text variant at 25 %.
- **Frame for the subject:** mark the focal box with `data-focal` and keep it inside the crop at every width.
- **Depth cues agree:** overlap, a larger shadow and higher contrast on the nearer plane, staged per breakpoint.
- **One light.**
- **Eye path:** entry at the strongest contrast, ending at the action.
- **No tangents:** no edges 1–6 px apart.
- **CMF per plane** (colour, material and finish), tabled in `DESIGN.md`.
- **One perspective.**

**C. `art-direction.md` §4 (extends), a finish vocabulary per personality** [K], with the lab's facts attached:
- Macro space and one accent were seen and preferred [L].
- Alpha borders (0 % at 1440), radius and concentric nesting (0.13 %), and a layered, tinted shadow (seen only on the notification at 1440; 0.03 % at 390) were not perceptible here [L].
- For tinted neutrals, cite `design-theory.md` B5; do not restate it.
- The rows themselves (cheap, premium, playful, technical, luxurious, trustworthy) are practitioner vocabulary, not measured results.

**D. `anti-patterns.md` (extends):**
- `-webkit-font-smoothing` presented as a cross-platform fix;
- relying on `hanging-punctuation` in Chromium;
- `corner-shape` without a solid focus ring (the probe now detects this);
- type-scale or tracking changes shipped without re-reading line breaks;
- card borders removed without a visible edge left;
- depth planes designed at one width.

**E. `framing.md`: new section after §2 (choosing the intensity), "Redesign risk checks"** [S]:
- task and feature parity, old against new;
- learned locations keep their place or get a signpost;
- no migration cost (redirects, and accounts and saved state survive);
- legibility over material;
- no borrowed novelty over the top task;
- a staged rollout or opt-out, a named metric and a rollback trigger;
- judge outcomes, not outcry.

**F. Scripts** (a later stage; nothing under `skills/` was edited):
- **`compare.mjs --diff` (extends).** Print the ΔE00 > 1 area. Warn "pixelmatch 0 % is not unchanged" when pm is 0 and ΔE00 > 1 is above 0; this rests on the lab check, not the judge. Print the glance figure as information only. `de-diff.mjs` and `lib/img.mjs` `measure()` are the reference implementation.
- **`audit.mjs` concentric (extends).**
  - Check four corners.
  - Use the nearest painted rounded ancestor.
  - Skip discs and pills; this fixes the play-disc false positive.
  - Keep gap ≤ R. Report R < gap ≤ 1.5 R as information at most.
- **`scripts/polish.mjs` (new), promoted from `lib/probe.mjs` v2** with its defects, style questions and information output and `--primary`. Its focus check mirrors `audit.mjs` and adds the corner-shape case. Before promotion, run one verdict pass on new pages by a reviewer who did not build it.
- **`compare.mjs --grey` (extends).** For the value-structure sheet.

**G. `templates/critique.md` check 22, finish (extends).** Add: "Polish pass done: probe defects fixed or justified, style questions answered in `DESIGN.md`; headline and lede breaks re-read at 390, 768 and 1440 after any type change; the focus ring is solid and follows the shape."

## Rejected ideas and why

- **A numeric glance threshold in the stop rule.** It was fitted on the same 50 sheets, its leave-one-out score (43) is no better than full-resolution ΔE (44), it is set by one borderline sheet, it misses the focal-point ring, and it is not in the scripts.
- **The glance measure as "the best predictor".** Its advantage over full-resolution ΔE disappears under leave-one-out.
- **A "premium score".** Visibility is not preference: scale scored 11.5 % and was judged worse at 1440.
- **Treating the Krehel and Vercel lists as equal-weight checklists.** They mix all three tiers.
- **Font smoothing as a polish step.** It changed 0 px here and only applies on macOS.
- **Squircles as a premium default.** Chromium-only, barely measurable, and they broke the default focus ring.
- **Grain as generic polish.** Not seen at 1440, and it is gated by material.
- **Pixelmatch as a perceptibility measure.**
- **Stack preferences as evidence.** They were unblinded.
- **Taste flags presented as defects (the v1 "facts, not taste" wording).** They fire on mature systems (GOV.UK) and contradict the lab: v1 flagged zero tracking, which made the 1440 headline worse.
- **Concentric checks widened to 1.5 R as defects.** This added a false positive (dashboard) for a property that was not perceptible.

## Open questions and limits of this evidence

- **One judge.** Every perceptibility and preference result comes from the builder, blind to side but not to move identity. The naive-reviewer step (`captures/blind` plus `blind-key.json`, protocol in `README.md`) has not been run.
- **Viewing scale.** 1440 sheets were seen at about 0.63× (DPR-1 captures), 390 sheets at about 2.2× CSS px, and zooms at 2×. No DPR-2 desktop test was done.
- **Forced focus.** Every judged sheet shows the primary action focused. The re-measurement shows this barely moves any other move's numbers, but the judgements cannot be redone blind.
- **Probe verdicts.** They are the builder's, not blind. The held-out set is spent, and style questions were not scored (they are questions).
- **One fixture.** One font, a light theme, Linux Chromium only, stills only.
- **The control** was calibrated on 2 sheets.
- **Side-by-side viewing** exaggerates tint shifts, and preference is not trust or conversion.
- **Failure-case numbers** are from snippets, with mixed causes.

Files, under `/home/user/website-redesign-skill/research/stage2/experiments/S9-polish-and-composition/`:
- runners and tools: `run.mjs`, `summarise.mjs`, `outside.mjs`, `polish-probe.mjs`, `de-diff.mjs`, `fetch-assets.mjs`
- libraries: `lib/probe.mjs` (v2), `lib/probe-v1.mjs` (frozen), `lib/img.mjs`, `lib/moves.mjs`, `lib/serve.mjs`
- fixture: `page/`
- data: `results.json`, `judgements.json`, `blind-key.json`, `outside-review.json`
- `README.md`
- sheets in `shots/`, including the new `value-structure-focus-1440.jpg`

## Changes after review

1. **Blocking: stop rule and tier labels.**
   - Removed the numeric threshold. The stop rule is now: defects resolved or justified and style questions answered, no line-break regression at 390, 768 and 1440, at most two rounds.
   - Relabelled the tiers as "seen by the builder" and "not seen at 0.63× (1440) or 2.2× (390); unproven at normal size".
   - Replaced Tier 3's "log and stop" with a cost rule (tokens and shared components only).
   - Added leave-one-out (glance 43 / 50, ΔE > 1 44, pixelmatch 39), the margin sheets and the base rate (32 / 50). These confirm the reviewer's point and change the finding: the glance measure no longer "wins".
   - I did not run a naive reviewer: I have no subagent tool here, and a fresh cloud session would not have the git-ignored captures. The protocol is in `README.md`.
2. **Probe.**
   - Rewrote it as v2:
     - role-based primary detection (fill or gradient) or `--primary`;
     - focus now flags no visible ring, or the default ring on `corner-shape`;
     - iconAlign limited to inline icons with their own label, with visually hidden text excluded generically;
     - labels (eyebrows, kickers, step numbers), component and out-of-flow rules for proximity;
     - RTL edges;
     - output split into defects, style questions and information;
     - "facts, not taste" dropped.
   - Ran v1 and v2 on 19 outside pages, including the reviewer's cases and 7 held-out pages, with hand verdicts in `outside-review.json`.
   - Held-out first run: 7 true, 2 boundary, 2 false of 11. Both false-positive classes were then fixed, and the held-out set is declared spent.
   - The v1 errors the reviewer listed are resolved on the pages where they occurred.
3. **Concentric (finding 11).**
   - Reworded as "missed 1 of 3 (right-hand corner, gap = R); the other two are gap > R, excluded by design", plus the play-disc audit bug.
   - The probe now flags only at gap ≤ R and lists up to 1.5 R as information; the dashboard false positive is gone.
   - Guidance F now keeps gap ≤ R.
4. **Forced focus.**
   - Added the `nofocus` stage (26 variants re-captured, value masses measured) and a new shot.
   - Finding 3 is now a hypothesis, supported by accent and buttons, with the ring noted as a forced state and grain removed as a location example.
   - The forced state is stated in Limits and at the top of Findings.
   - The squircle's 390 result is attributed to the ring defect (glance halves without it).
   - The value-structure result survives without the forced focus (0.624 against 0.659).
5. **Finish vocabulary.** The rows are now tagged [K], with the measured facts attached (macro space and one accent seen and preferred; alpha borders, radius and shadow finish not perceptible). Tinted neutrals are cited to `design-theory.md` B5, which is now listed under what the skill already knew. Material's shadows are noted as untinted.
6. **Stacks.**
   - Marked as unblinded to move identity, with no evidential weight, in the report and in the `summarise.mjs` heading.
   - Added the s01/s07 slab note and the s08 repair note.
   - Added the zoom result: 17 of 20 seen at 1440, 2 preferred and 3 baseline, also split by whether text moved.
7. **Unrunnable checks.** Step 6 is now "manual until F lands", with `de-diff.mjs` as the reference implementation. Step 1's spacing check is eye-only, and the proximity citation is removed.
8. **Smaller corrections.**
   - Material ranges corrected: x = 0; y from 1 px at level 1 to 24 px; level 0 has no shadow; black at 0.20 / 0.14 / 0.12.
   - Krehel path corrected to `skills/make-interfaces-feel-better/SKILL.md`.
   - Vercel lines corrected to 81 and 147–150.
   - Runtime updated to 17.5 min with the new stages.
   - Critique guidance moved from check 12 (content-free render) to check 22 (finish).
   - The `framing.md` placement now names the actual section.
