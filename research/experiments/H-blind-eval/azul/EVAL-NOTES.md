# Evaluation of the website-redesign skill (frozen snapshot `f4d6eaf`) on the Azul & Co. storefront

An honest log of how the skill worked on one real job: a five-page static storefront (home, collection, product, basket, checkout) that needed an identity redesign **and** a checkout rethink, with no user available, restricted network, and the skill installed read-only. Findings are numbered so they can be cited; the ten that matter most are summarised at the end.

## 1. Time per phase and what was read

Wall-clock times from `date` stamps taken at each phase boundary (one agent, tool calls in sequence). Phase 6 and Phase 7 overlapped: the first critique round happened inside verification.

| Phase | Clock (UTC) | ≈ minutes | References read (in full unless noted) | Scripts run |
| --- | --- | --- | --- | --- |
| 0 Frame | 16:57–16:59 | 2 (+3 writing the brief later) | `SKILL.md`, `framing.md`, `categories.md`, `templates/DESIGN.md` | — |
| 1 Audit | 16:59–17:09 | 10 | `audit.md`, `ui-ux.md` (needed for the heuristic pass) | `capture.mjs` (25 before captures), `audit.mjs --kind commerce`, `a11y.mjs` ×5, `palette.mjs --from`, own walkthrough probe |
| 2 Research | 17:03–17:09 (overlapped) | 5 | `research.md`, `resources/README.md`, `resources/inspiration.md` | `git clone --sparse` of Shopify Dawn and GOV.UK Frontend |
| 3 Direction | 17:09–17:18 | 9 | `art-direction.md`, `lessons.md`, `ledger.md`, `anti-patterns.md`, `resources/type-and-colour.md`, `lib/saturated-fonts.json`, `design-theory.md`, `app-ui.md`, `web-design.md`, `accessibility.md` (for the Accessibility block) | `fonts.mjs --google` ×7 faces, `palette.mjs --brand` ×2, `contrast.mjs`, `capture.mjs` on two style tiles |
| 4 System | 17:18–17:21 | 3 | `design-systems.md`, `templates/SYSTEM.md` | `fonts.mjs --fallback` ×2 |
| 5 Build | 17:21–17:30 | 9 (first build) | `implementation.md`, `imagery.md`, `motion.md` (lines 1–80 of 188 only) | — |
| 6 Verify | 17:30–18:24 | 54 | `visual-qa.md`, `responsive.md`, `performance.md`, `templates/critique.md` | `capture.mjs` ×9 runs (5 widths, 320/360, landscape, no-JS, forced colours, reduced motion, variants, elements), `states.mjs` (31 states, before + after), `audit.mjs` ×3, `a11y.mjs` ×8 ×3 rounds, `widgets.mjs` ×5, `compare.mjs` many, own probes |
| 7 Critique | 18:05–18:40 (two rounds) | ~20 | `visual-qa.md` §Critique | `compare.mjs --blur`, `capture.mjs --variant all` |
| 8 Hand-off | 18:31–18:52 | ~21 | `technical-qa.md` | `parity.mjs`, own link/contract checker, final `audit.mjs`, `a11y.mjs`, `widgets.mjs` |

**Not read:** `logo-design.md` (the mark was not in scope), `dataviz.md` (no charts), `multilingual.md` (Latin only), `resources/assets.md`, `resources/libraries.md`, `resources/tools.md`, the second half of `motion.md` (one 200 ms cross-fade did not need it), anything in `research/`.

**Where the time went:** about 60% of the job was Phase 6–8, and roughly a third of *that* was spent proving script findings wrong or working around what the scripts could not reach (stateful pages, a mobile-only widget, lazy images, closed `<details>`). The design work (Phases 0–5) took about 45 minutes and was the part the skill helped most.

## 2. Where the skill was unclear, contradictory, silent or wrong

Each item quotes the line, then says what I did.

**2.1 Brand hue vs the category test — contradictory, no tie-breaker.**
`art-direction.md` §4: "Keep the brand's hue family unless the user says the identity is the problem." `anti-patterns.md`: "Category test: could someone guess this direction from the category alone … If yes, rework until neither answer is obvious." For a company called *Azul* whose logo is 40% cobalt and 40% white, the brand hue **is** the category cliché (blue-and-white for azulejos). The skill never says which rule wins. I kept the brand's colours, wrote the caveat into `DESIGN.md`, and moved the distance into composition (the wall, the mark as layout, delivery as identity). A one-line rule would settle it: "When the brand's own assets *are* the category's archetype, keep them and take distance from composition and content; say so in the convergence checks."

**2.2 The split-hero warning is in the wrong phase.**
`web-design.md` §3 (read "at the end of Phase 3"): "The hero-beside-a-product-panel and the drawn timeline, in particular, recur across past outputs". But `art-direction.md` §4, the Phase 3 text that actually lists hero options, offers "a split" with no warning, and the ledger comparison in Phase 3 is done in words. I built a copy-left / panel-right split, recorded the Milkline overlap in `DESIGN.md` *as acceptable*, and only saw it was a sibling in the Phase 7 blur sheet (`compare.mjs --blur`). Then I rebuilt the hero. The blur test caught it — good — but a whole build round was wasted. Put the warning next to the hero options in `art-direction.md` §4 and make the ledger comparison a blurred *capture* of the style tile in Phase 3, not only a sentence.

**2.3 `states.json` is supposed to be written in Phase 1, but Phase 1 never mentions it.**
`visual-qa.md`: "Write it once in Phase 1 against the old build and run the same file on the new one". Neither `SKILL.md`'s Phase 1 row nor `audit.md` mentions `states.mjs`; I only read this at Phase 6. I wrote the file then and ran it on both builds; 4 of 31 states failed on the old site because the widgets did not exist there (expected, but it shows the file cannot really be written "against the old build" when the redesign adds widgets).

**2.4 Stateful pages are a blind spot of the whole method.**
`SKILL.md` Phase 1: "Run `scripts/a11y.mjs` on each key template". The basket and checkout are only meaningful with a basket in `localStorage`; `a11y.mjs`, `audit.mjs`, `widgets.mjs`, `capture.mjs` and `parity.mjs` all open a fresh context with no way to seed storage. The skill is silent about this. I added a test-only redirect page (`audit/fixtures/seed-cart.html?to=/cart/`) that seeds the basket and forwards, and pointed the scripts at it. Without that trick the "filled basket" and "filled checkout" were never audited — and that is where the real risk of this job was.

**2.5 "A fresh-context reviewer" has no fallback that works.**
`visual-qa.md`: "When subagents are available, give one only the brief … If no subagent exists, say so in the report and do the first-impression step before re-reading your own direction." No subagent tool was available here. Writing the first impression before re-reading my own `DESIGN.md` is not independence — I wrote it an hour earlier. The critique is recorded as self-review in `CRITIQUE.md`. Suggest: a checklist-style "adversarial pass" with a script that produces the blur, no-text and headlines-only evidence automatically, so the self-reviewer at least has to answer from artefacts.

**2.6 Checkout best practice vs preserved contracts — silent.**
`categories.md`: "one 'Full name' field" and "about eight fields suffice". The brief's contract says keep the field names (`first_name`, `last_name`, `title`, `dob`, `password`…). The skill does not say what to do when a best practice conflicts with a contract. I kept two name fields, and posted `title` and `dob` as empty hidden inputs so every key still reaches the order system, and marked it as a question. A short rule would help: "contract beats pattern; remove from the UI, never from the payload; ask".

**2.7 "An explicit review step" — does an in-page review count?**
`categories.md`: "an explicit review step". My checkout is one page; I added a review panel above the pay button that restates items, destination, delivery and total, and the pay button carries the total. The skill does not say whether that satisfies it. I assumed yes and wrote it down.

**2.8 Guest checkout assumes the backend accepts it — the skill never raises backend risk.**
The biggest real-world risk in this job was whether `/api/checkout` accepts an empty password. Nothing in `technical-qa.md` ("submit every form") covers a contract the front end can exercise only against a stub. I put it first in the report. The skill should say: when a flow change alters what the server receives (fields newly empty, newly optional), list it as a deploy blocker to be tested on staging.

**2.9 The ledger cites captures that are not in the snapshot.**
`ledger.md` rows point at `research/experiments/H-blind-eval/marketing/captures/compare-home-1440-fold.jpg`; the frozen snapshot has `research/experiments/H-blind-eval/` but not those images. `SKILL.md` also says `research/` "lives in the skill's repository … not in an installed copy". So critique check 14 ("blurred first viewport beside … the last `ledger.md` project that has a capture") cannot run from an installed skill. I used the image from the live checkout at `/home/user/website-redesign-skill/research/…` (read-only) and disclose it here.

**2.10 Reference and script disagree about Gloock.**
`resources/type-and-colour.md`: "**Gloock** (tnum)". `fonts.mjs --google "Gloock"`: "figures: Latin 0–9 ✗ proportional even with tnum — columns of these digits will not align". Piazzolla is listed in "Editorial serif, text" with no warning and `fonts.mjs` reports the same. The script is more likely right (it reads the served file); the list should be regenerated from the script.

**2.11 Imagery rule vs a maker's shop.**
`imagery.md`/`art-direction.md`: "If the company's world is photographable and free-licence photography of it exists, 'none' has to be argued". The argument that decided it here is not in the skill: stock photographs of *azulejos* would show another maker's tiles on a maker's shop — a truth problem, not a taste one. Worth one line under "When it does not".

**2.12 Search on a 12-product shop.**
`responsive.md` §5 (Ecommerce, phone): "a search field (not just an icon)". With twelve designs and working filters, search is pointless; the old site had a fake search icon linking to `#`. I removed it. The rule should scale with catalogue size.

**2.13 The DESIGN.md template asks for things twice.**
The Accessibility block in `templates/DESIGN.md` and the component/state content in `templates/SYSTEM.md` overlap heavily for a checkout; I ended up with the same focus, target and form rules in both. "A two-page site does not need every section of this template at full length" helps, but there is no guidance for which document owns what when both exist.

**2.14 "Performance: Lighthouse at phone emulation" with no in-skill fallback.**
`performance.md` §6 and `technical-qa.md` rely on `npx lighthouse`; `audit.mjs` explicitly says its LCP is "not a performance number". When `npx` is unavailable (here: blocked by the environment's permission policy), the skill has no script of its own. I wrote a 40-line Playwright probe (CDP CPU ×4, slow-4G, median of 3; `audit/perf/perf-throttled.txt`). It should be a script in `scripts/`.

**2.15 Minor: the order in `SKILL.md` for font budget vs design.**
`performance.md` gives "≤ 2 files preloaded, ≤ 100 KB WOFF2 in total", but Phase 3 (`art-direction.md` typography) never mentions the budget. I chose Alegreya (upright + italic) and Alegreya Sans (400/500/700/italic) = 184 KB, and had to cut four files in Phase 6. Put the budget into the typography step.

## 3. Script problems (command → output → what was wrong)

**3.1 `audit.mjs` contrast: text inside a closed `<details>` is sampled against whatever is painted under it.**
`node scripts/audit.mjs --base http://localhost:5831 --paths "/product/?id=AZ-101" --widths 1440,390 --kind commerce --out audit/after`
→ `✗ Contrast below WCAG AA on 1 of 72 text elements: #area-calc #1f3f8f on #1f3f8f = 1:1 (needs 4.5, 17px)`
Cause (reproduced in `audit/evidence/probe-fonts-and-area-calc.txt`): Chromium returns a client rect for the text of a button inside a closed `<details>`; `elementsFromPoint` at that point hits the cobalt "Add to basket" button (`"stack":["BUTTON#add bg=rgb(31, 63, 143)", …]`). The real pair is cobalt on white, 9.70:1. Fix: skip elements whose ancestor `<details>` is closed (or whose `checkVisibility()` is false).

**3.2 `audit.mjs` fonts: an italic-only family is reported as "not available".**
Same command, first after-run on `/collection/`, `/cart/`, `/checkout/` →
`✗ Declared font families not available — the page renders in a fallback: Alegreya (font file blocked, 404, or never loaded).`
`document.fonts` on the same page: `"Alegreya italic 400 900 loaded"`. `lib/inventory.mjs` `probe()` measures the family with no `font-style`, so a family served only in italic (or only in the weights the page uses) is compared as upright and matches the fallback. Fix: probe with the computed style and weight of the elements that use the family, or read `document.fonts` status.

**3.3 `widgets.mjs` has a fixed 1280 × 800 viewport.**
`node scripts/widgets.mjs "http://localhost:5831/" audit/widgets/home.contracts.json` with `{ "type": "disclosure", "button": "#menu-toggle" }` →
`FAIL disclosure #menu-toggle  ✗ test error: locator.click: Timeout 30000ms exceeded.`
The Menu button only exists below 900 px. No `--width` option, and a 30 s timeout per failure. I checked the contract with my own probe at 390 px (`audit/widgets/menu-probe-390.txt`) — which found a real bug (after opening the menu, Tab jumped to "Basket" instead of the menu's links) that `widgets.mjs` could never have seen.

**3.4 No storage seeding except in `states.mjs`.** (See 2.4.) `a11y.mjs <url>` has no `--storage`; neither have `audit.mjs`, `widgets.mjs` (whose `before` steps support `fill`, `click`, `check`, `wait` only — not `eval` or storage), `capture.mjs` or `parity.mjs`. Worked around with `audit/fixtures/seed-cart.html`.

**3.5 `capture.mjs` flags images that are clipped on purpose.**
`node scripts/capture.mjs --base http://localhost:5831 --paths / --widths 1440,1024,390 …` →
`home-1440.png (5265px tall · ⚠ 2 image(s) painted flat (tile-08.svg, tile-08.svg) — either something on the page covers them, or the capture failed to rasterise them: check in a browser, or retry with --mode fullpage)`
They are tiles below the crop of a wall with `overflow: hidden` (`audit/evidence/wall-clipping-probe.txt`). The advice ("retry with --mode fullpage") would not help. The check should ignore images fully outside their nearest clipping ancestor.

**3.6 `parity.mjs` claim matching is string-based.**
`node scripts/parity.mjs --before http://localhost:5832 --after http://localhost:5831 --paths / /collection/ "/product/?id=AZ-101" /cart/ /checkout/ --source data README.md --out audit/parity.md` →
`✗ "£150." ✗ "£18.00." ✗ "3 days" ✗ "£18.00" ✗ "4 ×" ✗ "52 ×" ✗ "0.02 m" ✗ "4 Review"`
`£18.00` is `"eu": 18.0` in `data/products.json`; `3 days` is `lead_time_days: 3`; `4 Review` is a step number beside the heading "Review and pay"; `0.02 m` is "0.02 m²" with the superscript dropped. Every one is a false positive that needed a written justification. Normalising numbers (18.0 = 18.00) and not treating a number followed by a heading word as a claim would remove most of them. (The id / field / `data-*` / form-action / metadata checks were exactly right and very useful.)

**3.7 `a11y.mjs` measures focus appearance only on the focused element's own box.**
`node scripts/a11y.mjs http://localhost:5831/` (first build, card focus ring drawn on the `<li>` via `:has(a:focus-visible)`) →
`WARN keyboard 2.4.13 Focus indicator weak: 243px changed by ≥3:1, a 2px perimeter is 392px ⟶ a "Alfama Star"` (×12)
The ring was 3 px around the whole card, well over the 2.4.13 area. Arguably a limitation, not a bug — and changing the card to a single block link was a better design anyway — but the message should say "indicator outside the element's box not measured".
Then, after the change (whole card one link, `aria-labelledby` naming it "Alfama Star £6.50 a tile") →
`FAIL names 2.5.3 Visible label "Alfama Star Cobalt, star pattern £6.50 a tile Lead time 3 days" is not part of accessible name "Alfama Star £6.50 a tile"` (×12)
Treating *all* text inside a card link as its "visible label" is stricter than 2.5.3 intends, but I removed `aria-labelledby` (the name is now the full card text) rather than argue.

**3.8 `a11y.mjs` colour-vision and forced-colour renders miss lazy images.**
`audit/after-a11y/home/vision-deuteranopia.png` (earlier run) shows blank squares where lazy-loaded tile images in the lower rows never loaded; `capture.mjs` scrolls through the page first, `a11y.mjs` does not.

**3.9 `fonts.mjs --google` reports only the default upright instance.**
`NODE_USE_ENV_PROXY=1 node scripts/fonts.mjs --google "Alegreya" …` → `Alegreya — Regular (weight 400, default instance)`; no way to ask for the italic, which was the face I was choosing. I downloaded the italic file and ran `fonts.mjs` on it directly. Also `fonts.mjs … --fallback georgia:italic` prints no `line-gap-override` while `--fallback arial` does — harmless but inconsistent.

**3.10 `audit.mjs` "accented headline" signal on checkout step numbers.**
`◆ Headline with one accented word/phrase (italic, colour or face switch) ×4: 1Contact [1]; 2Delivery address [2]` — a numbered step badge in a real sequence. Purpose-gated, justified in `DESIGN.md`; the heuristic could skip `aria-hidden` children.

**3.11 Not script bugs, but environment gaps the skill assumes away.**
`npx -y dembrandt http://localhost:5832/ --wcag --save-output` → refused by the environment's permission policy ("Code from External"). Lighthouse via `npx` was therefore not attempted. The skill lists both as the normal route; neither has an in-repo fallback (see 2.14).

**What worked well:** `capture.mjs` (reliable, the viewport-pinning and self-check are genuinely useful; 25 captures in under two minutes), `states.mjs` (the single best tool here — 31 states, storage seeding, route mocking for slow/failed/500 responses, before and after from one file), `palette.mjs` and `contrast.mjs` (fast, correct, the solved text steps are the right idea), `compare.mjs --blur` (it caught the sibling hero), `parity.mjs`'s structural checks, `a11y.mjs`'s tab-order dump and placeholder-only-name check (axe passed the old checkout's placeholder labels; `a11y.mjs` failed all 13).

## 4. Rules that changed the design for the better

1. **Sample the logo first** (Commitment 3). The mark gave the palette, the single-ochre-corner accent rule, and the structure of the story chapter (a quartered square with one ochre quarter). The owners' complaint was "nothing says us"; the answer was already in their own file.
2. **Match the display face to the wordmark's construction** (`design-theory.md` C3). An italic hand-lettered wordmark → Alegreya italic for display. It reads "hand-painted" without a single brush texture.
3. **The saturated-font list.** Montserrat (the old theme) and the second-wave faces I would otherwise have reached for (Fraunces, Instrument Serif) were off the table; `fonts.mjs` then ruled out Gloock and Piazzolla for prices.
4. **"The visual is the product doing the thing" + the in-scale image finding.** Led to the wall hero and the 4 × 4 panel with real dimensions ("about 52 × 52 cm") — the concept "Where four tiles meet" came straight out of it.
5. **The ecommerce checkout hard constraints** (`categories.md`): guest first, total cost before the last step, Address 2 / Company / Coupon behind links, labels above, `autocomplete` everywhere. This *was* the fix for the owners' two numbers.
6. **Truth rules + `parity.mjs`.** Removed "Best sellers" (unsourced), "From £6.50" (no size pricing exists), the fake search and wishlist icons; made delivery, price and lead-time copy render from `products.json` so the nightly export keeps it true.
7. **The blur test against the ledger.** It caught the split hero; the rebuilt statement-over-wall hero is the strongest thing on the site.
8. **GOV.UK error pattern and "validate on submit, then live".** Clean, testable (`widgets.mjs form-errors` passes every step).
9. **"Content is finished by default" / no reveals.** Zero motion bugs, zero no-JS holes, reduced motion trivially correct.
10. **The keyboard walk, the state matrix and `audit.mjs`'s inventories.** Found real bugs: the menu tab order, stepper inputs with no 3:1 boundary, a missing thousands separator (£8638.00), a stale line total, CLS 0.37 on the collection from JS-inserted cards — and the type-size inventory showed 10 sizes on the home page (three off-scale one-offs), folded back into the scale at the very end.

## 5. Rules that felt like box-ticking

1. **"Five to seven candidates across three material families."** Two were real contenders (the wall and the blue glaze); the other five were written to meet the count. The skill even says "three real ones beat seven written to meet a count", yet the template and the gate ask for 5–7.
2. **Similar-brief / category / second-order tests as prose.** Useful as a prompt, but with no tie-breaker (2.1) they produced a paragraph of caveats rather than a decision. The blurred-capture comparison did more in one image.
3. **The middle-dot "meta string" tell** applied to natural copy ("13 × 13 cm · Gloss", "UK delivery £7.95 · free over £150"). I rewrote them as sentences; the page is not better for it.
4. **Justifying numbered checkout steps** as a purpose-gated technique because a heuristic misfired.
5. **Filling both `DESIGN.md`'s Accessibility block and `SYSTEM.md`** with the same rules for one checkout.
6. **Capturing 5 widths × 5 pages with element shots** (130+ files): the fold captures and a handful of full pages were what I actually looked at; the rest exist to satisfy "renders at 1440 / 1280 / 1024 / 768 / 390".
7. **Writing a ledger row** into a report because the skill is read-only — fine, but it will only matter if someone copies it back.

## 6. What I skipped, and why

- **dembrandt and Lighthouse** — `npx` downloads were refused by the environment; replaced by `audit.mjs` and a Playwright throttled probe.
- **A fresh-context critique reviewer** — no subagent tool in this environment; self-review recorded as such.
- **A screen-reader smoke test** — no assistive technology available; deferred to the owners (VoiceOver, 10 minutes).
- **Live reference sites** — the network allowed only GitHub, npm, PyPI and Google Fonts; references came from Dawn and GOV.UK Frontend source plus knowledge, labelled as such.
- **Photography** — none in the repo, photo hosts blocked, and stock azulejo photos would misrepresent the product; argued in `DESIGN.md`.
- **`logo-design.md`** — the mark was not in scope.
- **A sticky phone buy bar** (`responsive.md` §5) — the buy box starts within the first screen on phones after the reorder; noted, not built.
- **Search** — 12 products, working filters (2.12).
- **A dark theme** — tiles must be judged against white; argued from the use scene.
- **Pushing the branch** — the remote is a local fixture (`SKILL.md` Phase 8 says not to push to one).
- **Editing `ledger.md` / `lessons.md`** — the skill is read-only; the row and lessons are in `REPORT.md` and here.
- **Stripe styling** — not wired in this copy; only the container was restyled.

## 7. Top ten findings

1. **Stateful commerce pages are a blind spot**: only `states.mjs` can seed `localStorage`; `audit.mjs`, `a11y.mjs`, `widgets.mjs`, `capture.mjs` and `parity.mjs` cannot, so the filled basket and checkout — where the risk was — are unaudited unless you invent a seed page (2.4, 3.4).
2. **The split-hero warning lives in the wrong phase** (`web-design.md`, read after the hero is chosen); the build had to be redone after the Phase 7 blur test caught a sibling of the last ledger output (2.2).
3. **Brand-hue rule vs category test has no tie-breaker** when the brand's own assets are the category archetype (a company called *Azul* with a cobalt logo) (2.1).
4. **`audit.mjs` samples text inside closed `<details>`** against the element painted beneath it and reports a 1:1 contrast failure (3.1).
5. **`audit.mjs` reports italic-only web fonts as "not available"** because its probe measures upright text (3.2).
6. **`widgets.mjs` runs only at 1280 × 800**, so mobile-only widgets (the Menu disclosure) cannot be tested; a hand probe at 390 found a real tab-order bug it would have missed (3.3).
7. **`parity.mjs` needs number normalisation**: "£18.00" vs `18.0` in the data, "4 Review" and "0.02 m" are false "unsourced claims" (3.6).
8. **No in-skill performance measurement** once `npx lighthouse` is unavailable; a throttled Playwright probe should ship in `scripts/` (2.14, 3.11).
9. **The fresh-context critique has no working fallback** in environments without subagents; self-review is not independence (2.5).
10. **The skill is silent on backend risk and on contract-vs-best-practice conflicts** in checkout rethinks (empty password for guests, `title`/`dob` removed from the UI but still posted) — the single highest-stakes decision in this job had no rule behind it (2.6, 2.8).
