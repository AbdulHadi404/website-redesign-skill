# How well the website-redesign skill worked on the Sanad dashboard

**Skill:** `website-redesign`, frozen snapshot at commit `42ec5bf`.
**Job:** a bilingual (Arabic RTL default, English LTR) invoicing dashboard for Saudi small businesses.
**Environment:** Chromium 1194 (headless), Node 22. Outbound network only to GitHub, npm, PyPI and Google Fonts, and Google Fonts CSS failed through the TLS proxy.
**Setup:** no user was available, so every "ask the user" became an assumption. No subagent tool was available either.

## Verdict in one paragraph

The method got me to a much better dashboard than I would have produced from the brief alone. The biggest wins came from three things:

- **Data rules:** the multilingual and number rules in `multilingual.md` §2a.
- **Truth rules:** the commitment to truth, backed by `parity.mjs`.
- **State tooling:** the state matrix, with `states.mjs` and `widgets.mjs` to prove it.

The skill's weaknesses in this job:

- **Wrong phase for the key reference.** The knowledge this job most needed (digits, RTL numbers, Arabic inputs) is filed under Phase 4. The audit phase and `audit.mjs` do not look for any of it, so the product's central defects were found by hand.
- **Surfaces it did not fit:** a lot of the process machinery (convergence tests, memory test, candidates) is ceremony on a productive surface whose brand is fixed by a supplied logo.
- **Script friction:** about a quarter of Verify went on script quirks: false positives, one crash, and one blind spot.

## 1. Time per phase

Wall-clock, from `date` stamps taken during the run (start 16:51:49, end ≈ 18:15):

| Phase | Clock | Duration | Notes |
| --- | --- | --- | --- |
| 0 Frame | 16:51–16:53, then written with the audit | ≈ 3 min reading, 5 min writing | brief written into `DESIGN.md` together with the audit |
| 1 Audit | 16:52–17:02 | ≈ 10 min | captures, `audit.mjs`, `a11y.mjs` ×2, `widgets.mjs`, `states.mjs` ×2, palette, data arithmetic |
| 2 Research | 17:02–17:08 | ≈ 6 min | GitHub API blocked (403); Midday sparse clone; Carbon, GOV.UK, Primer, Fontsource and Carbon icons from npm; `fonts.mjs` |
| 3 Direction | 17:04–17:10 | ≈ 6 min | reading plus `DESIGN.md` (a long file) |
| 4 System | 17:10–17:14 | ≈ 4 min | `palette.mjs`, tokens, `contrast.mjs`, icon sprite, `SYSTEM.md` |
| 5 Build | 17:13–17:24 | ≈ 11 min | `index.html`, `app.css` and `app.js` rewritten; first renders |
| 6 Verify | 17:24–17:47 | ≈ 23 min | breakpoints, CLS hunt (Lighthouse ×15 runs), forced colours, states, parity |
| 7 Critique | 17:47–17:53 | ≈ 6 min | self-review (no subagent), one round of fixes, full recapture |
| 8 Hand-off | 17:53–18:15 | ≈ 20 min | implementation checks, skip-link / axe investigation, final runs, docs, commit |

About 85 minutes in total. Verify plus hand-off took about half of it, and roughly 10 minutes of that went on script behaviour rather than on the design (items S2, S9–S13 in §4).

## 2. References read

**Read, in phase order:**

- **Entry:** `SKILL.md`.
- **Phase 0:** `framing.md`, `categories.md`.
- **Phase 1:** `audit.md`; `ui-ux.md` (the Phase 1 heuristics checklist); `app-ui.md` (read early for the state matrix); `templates/DESIGN.md`.
- **Phase 2:** `research.md`; `resources/README.md`; `resources/inspiration.md`; `resources/type-and-colour.md` (grep for Plex, Arabic, tabular); `resources/assets.md` (icons section).
- **Phase 3:**
  - `art-direction.md`: §5, §6 and §7 only, as instructed for productive routes.
  - `anti-patterns.md`: the model's prior, hard bans, app tells, logos.
  - `design-theory.md`: B5–B9 and C1–C4.
  - `ledger.md` and `lessons.md` (listed only for expressive routes, but the commitments and the Phase 5 gate need the ledger).
  - `dataviz.md`, and the environment's own `dataviz` skill, because `dataviz.md` tells you to follow it: SKILL, marks-and-anatomy, interaction, choosing-a-form, and the validator run.
- **Phase 4:** `multilingual.md` (read at the end of Phase 1, before Phase 4; see U1); `design-systems.md`; `templates/SYSTEM.md`; `accessibility.md` §1–3.
- **Phase 5:** `implementation.md`.
- **Phase 6:** `visual-qa.md`; `accessibility.md` §11; `performance.md` §6; `responsive.md` §8.
- **Phase 7:** `templates/critique.md`.
- **Phase 8:** `technical-qa.md`.

**Not read:**

- `web-design.md`, `imagery.md`, `logo-design.md`, `art-direction.md` §1–4 and §8: expressive-only, or the mark was out of scope.
- `motion.md`: the motion budget was "nothing moves", so I relied on `ui-ux.md` §7 and `app-ui.md` §10.
- `design-theory.md` Parts A and D (Part D is the "fill before implementation" checklists).
- `accessibility.md` §4–10 and §12–13, and `responsive.md` §1–7.
- `resources/libraries.md` and `resources/tools.md`: no library was added.

## 3. Where the skill was unclear, contradictory, silent or wrong

Each item gives the line, the problem, and what I did instead.

- **U1. The key reference is in the wrong phase (silent in the audit).**
  - *Line:* `SKILL.md` phase table: "4. System … `references/multilingual.md` (RTL / non-Latin)". `audit.md` §5's weakness list ("Typography… Composition… Hero… Colour… Imagery… Motion… Mobile… States… Consistency") has nothing on digits, calendars, RTL alignment or bilingual parity.
  - *Problem:* the user's complaints ("numbers don't line up", "amounts look wrong") were exactly the §2a material.
  - *What I did:* read `multilingual.md` at the end of Phase 1. It turned up a real functional bug the audit checklist would have missed: `type="number"` drops Arabic digits, so an owner typing `١٢٥٠` gets "Error" (`audit/before-probe-track.json`). For RTL or non-Latin products it belongs in Phase 1.
- **U2. Calendars are not mentioned (silent).**
  - *Line:* `multilingual.md` §2a: "Say which digits, in code… never rely on the region."
  - *Problem:* the same trap exists for calendars and is not mentioned. In Chromium, `toLocaleDateString('ar-SA')` rendered Hijri (`١٤٤٨/٤/١٧ هـ`) while Node's ICU gave Gregorian for the same call. So the owner (Arabic) and the accountant (English) saw different dates for one invoice. The skill is also silent on `new Date('YYYY-MM-DD')` being parsed as UTC, which shows the previous day west of UTC.
  - *What I did:* `ar-SA-u-ca-gregory-nu-latn`, with dates parsed as calendar dates at `timeZone: 'UTC'`.
- **U3. Exact money versus compact numbers (contradictory).**
  - *Lines:*
    - `categories.md` (fintech): "one currency format (0 or 2 decimals, never mixed)".
    - `dataviz.md` §5: "compact notation on axes and tiles ('1.2M')".
    - `dataviz.md` intro: "If the environment has a dedicated data-visualisation skill (e.g. `dataviz`), follow its palette and mark specs". That skill says: "Stat tile … value (auto-compact: 1,284 / 12.9K / $4.2M)" and "Proportional figures for big numbers".
  - *Problem:* the README says ZATCA needs amounts shown exactly, so compact tiles would be wrong here.
  - *What I did:* exact two-decimal values in tiles; compact numbers only on the chart axis.
- **U4. `text-align: right` versus logical properties (contradictory unless read together).**
  - *Lines:* `multilingual.md` §1: "Logical properties everywhere (… `text-align: start`)". `implementation.md`: "RTL-ready: logical properties throughout". Against them, §2a: "Numeric columns are `text-align: right` in both directions (not `end`)".
  - *Problem:* Carbon, which `inspiration.md` recommends reading, does the opposite (`td[align='right'] { text-align: end }`). §1 should carry the exception.
  - *What I did:* followed §2a, documented it in `SYSTEM.md`, and noted the Carbon difference in `DESIGN.md` References.
- **U5. Nav items with no destination (silent).**
  - *Lines:* `accessibility.md` §3: "never `div`, `span`, or `<a>` without `href`". `anti-patterns.md`: "a clickable `div`… or `<a>` without `href` standing in for a button".
  - *Problem:* nothing covers a *learned* nav item whose route doesn't exist in the repo (Clients, Reports, Settings).
  - *What I did:* inert text labels (no pointer, no role), plus a question to the user.
- **U6. Loading rule versus layout-shift rule (contradictory in practice).**
  - *Lines:* `app-ui.md` §8: "under 1 s show nothing; 1–3 s … skeleton". `app-ui.md` §10: "No layout shift from late data: reserve space, match skeletons to the final layout".
  - *Problem:* following the first literally (empty containers for a second) produced Lighthouse CLS 0.26–0.75. Two more CLS sources had no guidance at all:
    - the English page mirroring from RTL after first paint, a hazard of client-side i18n on a static RTL page;
    - `font-display: swap`, which `design-theory.md` C4 recommends ("`font-display: swap` (or `optional` …)").
  - *What I did:*
    - skeletons laid out in the static HTML but invisible until 1 s;
    - `dir` set in `<head>`, with the untranslated body hidden until the strings are swapped (1.5 s fail-safe);
    - `font-display: optional` with preload.
    - CLS is now 0 in 6 of 6 runs.
- **U7. Stop-and-ask versus assume (contradictory).**
  - *Lines:* `SKILL.md` "When to stop and ask": "the top tasks when there is no evidence for them". `framing.md` §4 and the Phase 3 gate: "confirmed by the user or written down as assumptions".
  - *What I did:* followed the gate (assumptions), as the task instructions also require.
- **U8. Which parts of the direction template apply (unclear).**
  - *Lines:* `templates/DESIGN.md`: productive routes skip "Concept, material-family candidates and the memory test". `art-direction.md` §5 lists "**Breaks if** … and the **memory test**" as a convergence check to write into `DESIGN.md`, and §5 applies to productive routes' brand layer.
  - *What I did:* wrote a one-line brand-layer memory test.
- **U9. Nature of the convergence tests (partly wrong).**
  - *Lines:* `art-direction.md` §5 and the `SKILL.md` gate require the similar-brief, category and ledger tests before Phase 5.
  - *Problem:* when the user supplies a logo whose colours and wordmark face are named in the file, the brand layer is determined by the assets, and the tests can only confirm that. They took a paragraph each and changed nothing.
  - *Suggestion:* when the brand layer is fully derived from supplied assets, the tests should collapse to one line: "derived from the supplied mark: teal, saffron, Plex".
- **U10. `ui-ux.md` framed for the wrong surface (unclear).**
  - *Lines:* its title is "UI / UX — the interaction rules a marketing site still has to obey", and it says "Read this before implementation (Phase 5)". `audit.md` §6 uses its §1 as the Phase 1 heuristic checklist for any surface.
  - *What I did:* used it in Phase 1 anyway.
  - It also leaks a repo-internal line: "a provider (this repo's own hard rule)".
- **U11. Fresh-context reviewer assumes a tool (silent / wrong for this environment).**
  - *Lines:* `visual-qa.md` §Critique: "When subagents are available, give one only the brief…".
  - *Problem:* no subagent tool was available. The fallback ("say so … do the first-impression step before re-reading") is honest but weak. The skill offers no mechanical alternative, such as a blind "describe this screenshot" pass through a separate model call, or at least `--blur` and `--variant no-text` sheets made before re-reading.
- **U12. Unfair performance baseline (silent).**
  - *Lines:* `audit.md` §6: "a performance baseline … the redesign must not be slower".
  - *Problem:* the "before" baseline was artificially fast because its Google Fonts failed behind the TLS proxy (18 KB, LCP 1.38 s simulated). `visual-qa.md` lists the proxy font trap for renders but not its effect on the performance baseline.
  - *What I did:* noted that the comparison is unfair; my 2.3 s LCP (225 KB, 126 KB of it fonts) is within the 2.5 s budget.
- **U13. Is a brand-tinted neutral "neutral"? (unclear).**
  - *Lines:* `app-ui.md` §1: "a *neutral* fill for selection". The DESIGN template: "selected | … | neutral, not accent".
  - *What I did:* used teal step 3 (`#e0f1ef`), a brand-tinted neutral, plus a second cue. The skill doesn't say whether that counts.
- **U14. Middle-dot rule versus the brand's own lockup (unclear).**
  - *Line:* `anti-patterns.md` lists "meta strings joined with middle dots ('A · B · C')" as a template tell.
  - *Problem:* the brand's own lockup is "سند · Sanad". I kept it (it is the logo) and avoided dots elsewhere. A clause like "unless it is the brand's own mark" would help.
- **U15. Colour budget for "deviations" (silent).**
  - *Lines:* `categories.md` dashboard: "deviations carry the visual weight".
  - *Problem:* no budget for how much red is too much. In the squint sheet my ageing bars outweigh the figures they summarise. I left that as a judgement call for the user.
- **U16. Research without network (wrong expectation).**
  - *Lines:* `research.md`: "Actually load them."
  - *What happened:* the fallback worked (npm and git). But the GitHub REST API returned 403 ("GitHub access to this repository is not enabled"), while `git clone --filter=blob:none --sparse` of the same repository worked. The skill's fallback text names "design-system repos, npm packages" but not "use git, not the API".

## 4. Script problems

Each item gives the command and what it printed.

- **S1. `capture.mjs` cannot render a bare SVG document.**
  - *Command:* `node capture.mjs --base http://localhost:5811 --paths /assets/logo.svg --widths 1440 --out captures/before --label logo --element svg`
  - *Output:* `✗ /assets/logo.svg at 1440px not captured: page.evaluate: TypeError: Cannot read properties of null (reading 'children')` (a fold PNG was still written).
  - *Why it matters:* `audit.md` says to look at the logo; there is no tool path for it.
- **S2. `states.mjs` resolves fixture paths oddly and crashes on a missing file.**
  - *What happens:* `file` is resolved relative to the *config file's* directory (undocumented; the example `"fixtures/herd-200.json"` reads as project-relative). A missing file kills the whole run from inside the route handler.
  - *Command:* `node states.mjs audit/config/states-before-ar.json --base http://localhost:5811 --out captures/states-before-ar --label before`
  - *Output:* `Error: ENOENT: no such file or directory, open '…/audit/config/audit/fixtures/empty.json' … at async page.route… Node.js v22.22.2`
  - *Result:* states after "offline" never ran. It should fail the one state.
- **S3. `states.mjs` only compares each state with the first.**
  - *What happened:* on the old build, `loading`, `error` and `offline` were byte-identical to each other (md5 `5c5977d127007e7ec995b93b23d547fd` ×3). That is the most important finding of that run (no error or loading state exists), and it was not flagged; I found it with `md5sum`.
  - *Suggestion:* flag every pair of identical states.
- **S4. `audit.mjs`'s greeting detector is English-only.**
  - *Output:* "A greeting ('Welcome back, …', 'Good morning, …') sits in the title slot" for `Hello Ahmed 👋`, but nothing for `مرحباً أحمد 👋` on the default Arabic page.
- **S5. No `--kind` for dashboards or fintech.**
  - `audit.mjs --kind` offers `marketing|app|field|commerce|content|docs|service`, while `categories.md` defines dashboard and fintech categories. I used `app`.
- **S6. `audit.mjs` cannot see this product's central defects.**
  - *Not detected:* mixed digit systems in one row; amounts without fixed decimals; numeric columns not aligned; Hijri or ambiguous dates; untranslated strings on the English page ("+ فاتورة جديدة" and "بحث..." on `/?lang=en`); `type="number"` inputs on an RTL page.
  - Every item in `multilingual.md` §4's checklist is manual.
  - It does report "Browser surfaces left at defaults: … tabular numerals", which is the only hint.
- **S7. `a11y.mjs` reflow check misses clipped content.**
  - It passes a page that clips rather than scrolls. At 320 px the old page lost 6 of 8 table columns and the New-invoice button (`audit/before-a11y-ar/reflow-320.png` shows it), yet there was no reflow FAIL. `audit.mjs` did catch it at 390 ("Text cut off by an overflow:hidden/clip container (151)").
- **S8. `a11y.mjs` has no language-of-parts check (3.1.2).**
  - The old English page's "العربية" link had no `lang` and was not flagged.
- **S9. `audit.mjs` measures visually-hidden headings at the browser default size.**
  - *Output:* "Heading sizes inverted: h2 23px > h1 20px" for a visually-hidden `h2` sized by the browser default (22.5 px).
  - It is a false positive, but it led to a good fix (a global `h2` size).
- **S10. `audit.mjs` "colour alone" false positive.**
  - *Output:* `✗ Status carried by colour alone (2 dots with no text or name): td.bar-cell > span.bar #b3261e`
  - These are `aria-hidden` ageing bars inside rows whose `th` names the period, with the amount and count beside them (`audit/after-a11y-ar/aria-snapshot.yml` lines 46–59). This is the only ✗ left in the final audit.
- **S11. `audit.mjs` runs axe in whatever state the focus walk left.**
  - *Output:* `✗ axe-core: target-size (serious, 1)` on `#brand-link` at 390.
  - *Cause:* the page's own skip link, left focused by the focus walk and covering the logo link. Not reproducible with a clean axe run.
  - *Reproduction:* `audit/config/probe-axe2.mjs`, output in `audit/after-axe-target-size-probe.txt`.
  - *Outcome:* useful in the end, because it pushed me to the GOV.UK in-flow skip link. But the report does not say which state it measured, and it took about 8 minutes to diagnose.
- **S12. `widgets.mjs` form-errors output contradicts itself.**
  - It prints `! [4.1.3] Errors were neither focused nor announced via a live region` and, in the same block, `✓ focus moved to the first invalid field (#f-client)` (`audit/after-widgets.txt`).
- **S13. `parity.mjs` is English-centric and cannot recognise derived values.**
  - *Reported as unsourced:* `"104 days"`, `"30 days"`, `"50K"`, `"17.7%"`. These are computed from API fields: days late, bucket limits, axis ticks, month-on-month change.
  - *Reported as dropped:* `"6/5"` and `"9/5"` (old US-format dates) and `"5.2% Month"` (a tokenisation artefact).
  - *Missed entirely:* the old Arabic page's claims in Eastern Arabic digits (`٥٥٬٤٨٤ ر.س`, the fake `12.4%+`), so the default language's truth was not checked.
  - *Suggestion:* add a `--derived` allowlist or a way to declare computed values.
- **S14. The environment's `dataviz` validator fails the brand teal.**
  - *Command:* `validate_palette.js "#5e8f8b,#0e5e5a" --mode light` gave `[FAIL] Chroma floor … #0e5e5a 0.071`.
  - The validator is scoped to categorical palettes and my chart is a single series with emphasis. Not a bug in this skill, but `dataviz.md` sends you there.
- **S15. Lighthouse CLS is bimodal (no script involved).**
  - *Command:* `npx lighthouse@12.8.2 … --only-categories=performance` gave CLS 0 / 0 / 0.417 on the *old* build and 0.003 / 0.52 / 0.52 on my first build.
  - `performance.md`'s "median of 3–5 runs" was essential. A single run would have said either "fine" or "broken" at random.

**What worked well:** `audit.mjs` (font-availability, clipping and CLS checks), `a11y.mjs` (keyboard walk, forced-colours and colour-vision renders), `widgets.mjs`, `contrast.mjs --css` with `var()` resolution, `palette.mjs`, `fonts.mjs` (per-digit-system tabular report), `compare.mjs` and `capture.mjs --element / --no-js / --forced-colors`. None of them needed `CHROME_PATH` tweaks beyond setting it once.

## 5. Rules that changed the design for the better

1. **Commitment 3, "sample the logo… look at the brand family first".** The SVG names **IBM Plex Sans Arabic**, which became the type system. Teal and saffron got distinct roles, with saffron as the keystone and the "you are here" marker. Without this rule I would have picked a common Arabic UI face.
2. **`multilingual.md` §2a plus the `lessons.md` row on Plex's Eastern digits.** From these came:
   - an explicit digit system;
   - right-aligned numeric columns in both directions;
   - text inputs that accept `٠–٩`;
   - the knowledge that Plex's Eastern digits are proportional, which drove the Western-digits assumption.
   Together they fix "numbers don't line up" at the root.
3. **Commitment 2 (truth) plus `parity.mjs`.** This led to removing the constant KPI deltas, rewriting the KPI definitions with the rule written under each figure, and displaying the API's VAT exactly even where it disagrees with half-up rounding.
4. **`categories.md` dashboards ("deviations carry the visual weight … the metric against its target") and `app-ui.md` §9.** They produced the Past-due panel and the ageing strip, and the finding that 13 of 14 unpaid invoices are past due.
5. **`app-ui.md` §7b (freshness).** It produced the "Loaded at" line, a Refresh that actually re-fetches, and "Showing the copy loaded at …" when a refresh fails.
6. **The state matrix plus `states.mjs`.** Loading, error, offline, stale, empty, one, many and long states were all designed and rendered. The old build had none.
7. **`accessibility.md` §3, native first.** `<dialog>`, `<details>`, `<search>`, `button[aria-pressed]` and `th[aria-sort] > button` meant all 10 widget contracts passed with no ARIA widgets.
8. **The `visual-qa.md` trap: "A `@media (pointer: coarse)` rule placed before the base rule is silently overridden".** That was exactly my bug (nav items stayed 36 px on touch), and the note saved a debugging loop.
9. **Forced-colours renders.** They showed the logo, the chart and the Paid icon disappearing (SVG fills are not forced).
10. **"Keep what users have learned" (`framing.md`).** It stopped me rethinking the layout. The one learned position I did change (the late panel's side) had to be argued in writing.

## 6. Rules that felt like box-ticking here

- **Convergence tests:** similar-brief, category, second-order, ledger and memory tests on a productive screen whose brand layer is fully supplied (U9).
- **Template slots with nothing to decide:** "Five first-notice things", "Imagery", "Page narrative" and "Secondary pages" are carried in the DESIGN template for a single productive page.
- **Irrelevant rows in the Accessibility block:** sign-in, dragging, media and transactions do not apply to this screen. The block is still valuable as a whole.
- **Research take/leave table without live references:** it mostly re-confirmed `multilingual.md` and `app-ui.md` rather than adding new principles. The one genuinely new input was Midday's rule that "Unpaid is neutral, only Overdue is coloured".
- **Expressive-only critique rows:** rows 5, 6, 10, 11, 12 and 14 of `templates/critique.md` stay in the table for productive work.

## 7. What I skipped, and why

- **`dembrandt`:** optional, and `audit.md` itself says it "adds little" on a small stylesheet (90 lines here).
- **Live competitor research (Qoyod, Wafeq, Zoho Books Arabic, Stripe):** blocked by the network. Code and npm references were used instead and marked as such.
- **Fresh-context reviewer subagent:** no subagent tool was available (U11).
- **Removal-test variants (`capture.mjs --variant`):** these are expressive-only critique rows.
- **Dark-mode renders:** there is no dark theme (a non-goal). `color-scheme: light` is declared.
- **Other manual checks:** screen-reader smoke test (none available); landscape phone; real device; INP; 200% / 400% zoom at 1280 beyond `a11y.mjs`'s 320 and 640 reflow renders. All were skipped for lack of the tool or of time.
- **Pushing the branch:** the remote is a local fixture (`SKILL.md` Phase 8 says not to push such remotes).
- **Editing `ledger.md` and `lessons.md`:** the skill is read-only. The ledger row is in the report, and the proposed lessons are in §8 below.
- **`design-theory.md` Part D checklists:** the DESIGN template already carried every decision they ask for.

## 8. Proposed changes to the skill (for its maintainer)

1. **`audit.md`:** add "RTL and number audit" to Phase 1 for any non-Latin or bilingual product. Point to `multilingual.md` §2a there, not only in Phase 4.
2. **`audit.mjs`:** add checks for:
   - mixed digit systems within one element or row;
   - currency-looking values without fixed decimals;
   - numeric table columns not right-aligned, or without tabular figures;
   - `input[type=number]` on `dir=rtl` pages;
   - strings in the other script on a language variant (`lang=en` page containing Arabic outside `[lang=ar]`);
   - a multilingual greeting detector;
   - hidden headings excluded from the type-scale checks;
   - axe run before the focus walk, or with focus reset.
3. **`multilingual.md`:** add a "Calendars and dates" block: `-u-ca-gregory` or `-u-ca-islamic-umalqura` chosen explicitly, `ar-SA` differing between engines, date-only strings parsed as UTC.
4. **`app-ui.md` §8 and `performance.md`:** reconcile "show nothing under 1 s" with "no layout shift": lay out skeletons invisibly from first paint. For static bilingual pages, set `dir` in `<head>`. For a daily-use app, `font-display: optional` plus preload is the safer default.
5. **`dataviz.md`:** state that money on fintech or tax surfaces is never compacted in tiles, and that this overrides an environment `dataviz` skill.
6. **`states.mjs`:** flag *pairwise* identical states; document that fixture paths are relative to the config file; fail one state on an ENOENT instead of crashing the run.
7. **`a11y.mjs`:** make reflow detect clipping by `overflow: hidden`, not only scrolling; add a language-of-parts check.
8. **`parity.mjs`:** extract claims in Eastern Arabic digits; add `--derived` (or read a `derived:` list from `DESIGN.md`) for computed values.
9. **`widgets.mjs`:** remove the contradictory 4.1.3 warning when focus did move to the first invalid field.
10. **`capture.mjs`:** handle SVG documents, or add a `--file logo.svg` mode.
11. **`anti-patterns.md` / `accessibility.md`:** add guidance for learned navigation items whose routes are out of scope ("render as inert labels and ask").
12. **`art-direction.md` §5:** add a short form of the convergence tests for when the brand layer is fully derived from supplied assets.
