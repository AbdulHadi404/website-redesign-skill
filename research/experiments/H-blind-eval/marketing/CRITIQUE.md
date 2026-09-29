# Critique: round 1 and round 2 (of at most 3)

**Reviewer:** the builder. No subagent tool was available in this session, so there was **no fresh-context reviewer**; that caveat applies to every "yes" below. The first impression was written from the blurred sheet (`captures/compare/home-1440-fold-blur.png`) and the removal variants *before* re-reading `DESIGN.md`, as `visual-qa.md` asks when no subagent exists.

## First impression (written before re-reading `DESIGN.md`)

- **This page communicates:** a sober, specific software company for dairy farmers. It tells you which cow has a problem, and shows you what that looks like.
- **The first three things my eye lands on:** 1. the `h1` block (large navy, top-left); 2. the navy panel with the rows of droplets; 3. the navy "Start free trial" button. The intended order was h1, then panel, then action, which matches.
- **One word:** dependable.
- **Areas I cannot name within two seconds:** the small legend under the droplet rows ("35 OK · 3 watch · 2 alert") and the "Sample herd" label. Both are small by intent, but the legend carries the meaning of the droplet shapes.

## Critique against objectives

- *Farmers must trust it* → the hero panel shows a cow's yield, change and conductivity with units → the product is visibly real software speaking their terms → Stanford credibility: "make claims verifiable", "show expertise" (`home-1440-after-fold.png`).
- *Say what it does in five seconds* → the `h1` "Know which cow to check before the bulk tank does." plus the mechanism sentence → passes the header test; the old "Supercharge your farm with smart herd insights" did not (`compare/home-1440-fold.png`).
- *Look like Milkline, not an AI startup* → the navy/sky and droplet-on-a-line all come from the 2021 mark; there is no gradient, glass, badge or emoji → the five first-notice things all changed (`compare/home-1440-fold-blur.png`: the two blurred panels are unmistakably different pages).
- *Proof only as big as it is* → "2 days" now sits beside Aoife Brennan's quote with her farm named, not as a headline statistic → the source travels with the claim (`home-1440-after-el-facts-1.png`).
- *The trial form must keep working and be usable* → labels above, a GOV.UK error summary, a status region → `widgets.mjs` form-errors PASS; `audit/after-form-walk.txt` shows the same JSON body and the same `mlTrack` event as before.
- *Weakness* → the About chapter is only type and two rules → it is the one chapter with no visual event → the design has nothing honest to put there without a photograph of the founders (`home-1280-after.png`, the About band).

## Checks

| # | Question | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- |
| 1 | Appropriate to the category (density, sizes, motion, colour's job)? | Yes | `home-1440-after.png`: body 18 px, display 60 px, low density, one motion move, colour = identity + one action colour; `audit/after-audit-stdout.txt` type sizes 60→14 | — |
| 2 | Each top task doable, with obvious next steps, on a phone and by keyboard? | Yes | `home-390-after-fold.png` shows the CTA in the first viewport; the "Pricing" link is reachable in the phone header (`captures/after/responsive/phone-header-320-360-375-390.png`); `a11y` tab order reaches every control; form walk passes | — |
| 3 | **Swap test**: rename to the nearest competitor. Does it still fit? | Mostly no | The droplet-on-a-line motif is Milkline's own mark; the founders and the bulk-tank line are Milkline's. **Partial yes:** the navy/sky palette is common in dairy (DeLaval is blue). The palette is the brand's own, so this is accepted, and distance comes from the mark geometry and content. | Accepted, reason recorded |
| 4 | Anything reading as generated? Every signal fixed or justified? | Yes (fixed) | Round 1 `audit.mjs` flagged "side-stripe borders" (founders) and "5 A · B · C meta strings". Both removed (`home-1440-after-el-panel-1.png`: a real table, no middle dots). The final audit has no ◆ signals. | done |
| 5 | Before/after read as two different companies' work? All five first-notice things changed? | Yes | `compare/home-1440-full.png`, `compare/pricing-1440-full.png` | — |
| 6 | First viewport memorable without the copy; headline test; action continues the sentence? | Yes | `variants/home-1440-v-no-text.png` still shows the navy panel, white card and line rows (see the note on droplets below). The action "Start free trial" continues "30 days free…". | — |
| 7 | Typography distinctive where it should be, quiet elsewhere, real scale used? | Yes | 9 sizes at 1440, all from the scale; one family at 3 weights; tabular figures in the panel (`home-1440-after-el-panel-1.png` columns align) | — |
| 8 | No two adjacent chapters share a composition? | Yes | Split (hero), then statement + facts (proof), then diagram (how), then register, then statement (about), then split form (trial) | — |
| 9 | Boxes and cards rare; one elevation model? | Yes | Cards: the Rosie card and the form panel only; one shadow (`audit`: "1 distinct shadows") | — |
| 10 | Product shown, not only described? | Yes | The hero panel is built from `data/herd.json`, labelled "Illustrative data from the demo herd" | — |
| 11 | Images purposeful; image removed loses information? | Yes | `variants/home-1440-v-no-images.png`: the logo disappears (as it should); nothing else is an image | — |
| 12 | Content-free render recognisable; shadow-free still finished? | Partly | `v-no-text.png`: the panel, line rows and bands survive, but **the droplets vanish too**, because they are `currentColor` SVG and the variant sets `color: transparent` (a capture artefact, noted in EVAL-NOTES). `v-no-shadows.png`: unchanged apart from the Rosie card losing its lift. | Artefact; no page fix |
| 13 | Headlines only: does the story read? | Yes | `a11y` outline: "Know which cow to check…" › "What farmers say" › "How it works" (Your parlour / Every cow, every milking / Who to check / Into the vet log) › "Everything else it does" › "Built by a vet and a farmer…" › "Try it free for 30 days" | — |
| 14 | Blurred beside the old site and the last ledger project? | Old: yes. Ledger: **not possible** | `compare/home-1440-fold-blur.png`. No Brandigade captures exist in this environment; the comparison was done in words in DESIGN.md "Ledger". | Stated as a limit |
| 15 | One primary action per view, one colour everywhere? | Yes | Navy "Start free trial" in the header, hero, form and pricing rows; every secondary action is an underlined link | — |
| 16 | Widget states designed *and rendered*? | Yes | `captures/after/states/form-sent-errors.png` (errors), `form-sent.png` (sent), `form-failed.png` (failed, answers kept); "sending" verified in `audit/after-form-walk.txt` | — |
| 17 | Colour budget; every text pair ≥ 4.5:1; no meaning by colour alone? | Yes | `audit.mjs` has no contrast fails (final run); droplet status by shape plus words (`audit/after-a11y-home/vision-achromatopsia.png`) | — |
| 18 | Mobile designed, not squeezed? | Yes (after round 1) | Round 1 found the phone header wrapping to 2 rows (124 px, sticky) and the flagged list forcing 382 px at 320. Both fixed: one-row header from 360, static on phones; the table stacks (`captures/after/responsive/flagged-table-320.png`; `a11y` reflow passes) | done |
| 19 | Accessibility pass done? | Yes, with one gap | `a11y.mjs` 0 FAIL on both pages; `widgets.mjs` PASS; skip link lands in `main`; forced colours fixed for the logo images. **No screen-reader test**: none is available here, so it is recommended as a follow-up. | Follow-up |
| 20 | Performance within budget? | Yes | Lighthouse 13.5 mobile, median of 3: LCP 1.80 s home / 1.67 s pricing (≤ 2.5 s), CLS 0, TBT 0. Slower LCP than the old page's 1.38 s, whose fonts never loaded here; see REPORT. | Explained |
| 21 | Copy short, no clichés, one label per intent? | Yes | "Start free trial" is the only label for the trial; the cliché list from the audit is gone (final audit has no cliché signal) | — |
| 22 | Holds up beside the Phase 2 references? | Yes for forms (GOV.UK pattern measured in `widgets.mjs`); **judged from knowledge** for the rest, since no reference could be rendered here | — | — |

**Weakest chapter and why:** About. It is type only, because no photograph of the founders exists. The fix is content Milkline owns (a photo of Niamh and Tom in the parlour), not design. It is requested in the report.

**Fixes made in round 1** (one batch; then a full recapture):
- phone header one row and static;
- the flagged-cow list became a table, stacked on narrow phones (reflow at 320);
- middle-dot meta strings removed;
- the founders' stripe device removed;
- the story `h2` put back on the scale;
- icon collapse in narrow cells fixed;
- logos in forced colours;
- `aria-disabled` instead of `disabled` while sending;
- the facts column widened at 1024;
- "365 days" restored (parity);
- two widows fixed.

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390, in `captures/after/` (home recaptured after the last fixes; pricing after the round-1 CSS).

**Round 2: status of round 1 findings:** all resolved, each with the capture above. Round 2 found no new "no".

**Remaining "no" answers:** none. Two partials are recorded with reasons: #3 (palette shared with the category, but it is the brand's own) and #12 (a capture artefact).
