# Evaluation of the website-redesign skill, on the Milkline herd screen

*Written by the blind-evaluation agent (fresh context; given only the skill path, the fixture repo and the user request). Saved here verbatim from its hand-back, because the harness does not let subagents write report files.*

## Context and caveats

- The skill was read-only. **It changed under me:** six commits landed between 15:15 and 16:07 (the Arabic-digits change to `fonts.mjs`; "Scripts survive real sites … false positives" at 15:47; `widgets.mjs` at 15:55; `parity.mjs` at 16:07). There were also uncommitted edits to `audit.mjs` and `lib/inventory.mjs` at 16:14. My runs straddle these versions. I re-checked the main bugs against the 16:14 files; the ones marked "still present" are.
- I had no subagent tool and no screen reader. The network allowed only GitHub, npm, PyPI and Google Fonts.
- The harness refused to let me write this file or REPORT.md ("Subagents should return findings as text"), so I delivered them as text.

## Time per phase (wall clock, about 65 minutes to the commit)

| Phase | Time | Notes |
| --- | --- | --- |
| 0 Frame | ~1 min reading | the brief went straight into DESIGN.md |
| 1 Audit | ~5 min of runs + ~3 min writing | capture, audit, a11y, dembrandt, palette, a state script for "before" |
| 2 Research | ~2 min | only code references were reachable |
| 3 Direction | ~8 min (~4.5 reading and measuring, ~3.5 writing) | about 80 KB of references |
| 4 System | ~2 min | SYSTEM.md |
| 5 Build | ~7 min first pass | |
| 6 Verify | ~24 min | two fix loops; about a third of it went on proving script false positives |
| 7 Critique | ~9 min | by the builder, not a fresh reviewer |
| 8 Hand-off | ~5 min + reports | |

## Reference files actually read

- **In full:** SKILL.md, framing.md, categories.md, audit.md, research.md, resources/README.md, resources/inspiration.md, resources/type-and-colour.md, lib/saturated-fonts.json, art-direction.md, lessons.md, ledger.md, anti-patterns.md, design-theory.md, app-ui.md, design-systems.md, implementation.md, visual-qa.md, technical-qa.md, templates/DESIGN.md, templates/SYSTEM.md, templates/critique.md.
- **In part:** ui-ux.md §1; accessibility.md §1–3 and §11; motion.md §5 (via grep); responsive.md §8; performance.md §6.
- **Not read:**
  - web-design.md, imagery.md and logo-design.md: expressive or out of scope.
  - multilingual.md: English only.
  - dataviz.md: I removed the fake charts rather than redesigning charts, but arguably I should have read it before deciding on "no charts".
  - resources/assets.md, libraries.md, tools.md, and the remaining sections of the partly read files.
- **Total:** about 190 KB, roughly 50k tokens.

## Where the skill was unclear, contradictory, silent or wrong

1. **There is no profile for gloved, outdoor, offline mobile work tools.**
   - categories.md (Dashboard) says "Body text 12–14 px … Density high".
   - anti-patterns.md calls "Low density: 16 px body, 40–48 px controls and 24 px card padding in a tool used all day" a tell.
   - The audit.mjs signal reads "Body 17px with controls ≥ 48px — marketing density in a work tool".
   - Mobile-first is framed as *consumer*.
   - What I did: classified the screen as a "dashboard used as a mobile-first field tool", wrote a deliberate departure (Principle 2), and justified the signal.
   - Suggestion: add a frontline/field profile covering gloves, glare, noise, interruption and offline use.
2. **The distance tests are applied to working tools.**
   - The SKILL.md gate requires, "for every direction, the similar-brief test, the category test and the ledger comparison".
   - critique.md check 3 is the "Swap test … (A yes here caps the whole critique.) | all".
   - Both collide with SKILL.md's own "familiarity is an asset: keep locations, labels and flows", and nothing says what a passing answer looks like for a productive surface.
   - What I did: answered "intended", and argued the distinctness from the brand layer and the parlour constraints.
3. **The DESIGN.md template is written for marketing pages.** "Concept … a founder would recognise", "Candidates … spanning at least three material families", "Memory test: what a visitor describes", "Ledger — … dark-chapter colour", "Imagery: 'none' must be argued". About a third of it did not apply. I turned the concept candidates into interaction-model candidates.
4. **The font advice contradicts itself.** resources/type-and-colour.md recommends "Nunito (tab)", "IBM Plex Sans" (listed first in two rows) and "Newsreader". `saturated-fonts.json` lists nunito, ibm plex sans and newsreader as saturated, so following the shortlist trips the audit signal.
5. **The skill tells you to edit itself.** Phase 8 says "Add a row to references/ledger.md", and "Learning from corrections" says "Change the skill … proactively". Nothing covers a read-only or shared install. I put the ledger row in the report.
6. **It is silent on how to capture states.**
   - SKILL.md Phase 6 asks for "every state of every widget". visual-qa.md explains how to click, but no script drives states.
   - I wrote `audit/tools/states.mjs` (about 230 lines, 30 scenarios). This was the biggest tooling cost, and it found three real bugs.
7. **The gate demands what a tool cannot always give.** SKILL.md and technical-qa.md require "every widget contract passing". widgets.mjs has false negatives (script problem 6), and only audit.mjs and a11y.mjs failures can be "justified in writing".
8. **It is silent on offline data and sync honesty.**
   - app-ui.md's state matrix has "Refreshing / stale" and "Degraded" rows, and mobile-first mentions "offline and slow-network states".
   - Nothing covers offline-first design, labelling a saved copy, or service workers.
   - I nearly shipped a service worker that cached the JSON, which would have made stale data look fresh. The final design came from farmOS Field Kit's connection states and first principles.
9. **dembrandt setup is under-explained, and it was of little use here.** "`BROWSER_CDP_ENDPOINT` connects it to an existing Chromium" is true, but the skill doesn't say how to start one; I launched `chrome --remote-debugging-port`. dembrandt found five colours, called the grey icon buttons `primary: rgb(229,231,235)`, and missed the indigo `#4f46e5` entirely. The skill does warn that its roles are guesses. It added little on a 40-line stylesheet.
10. **`compare.mjs --dir` expects before and after in one folder** (the `--label` convention). The obvious layout, `captures/before` + `captures/after`, which the task required, silently yields nothing, and no doc mentions it.
11. **widgets.mjs scopes `submit` under `form` without saying so.** The code does `${c.form} ${c.submit}`, which only the example implies. Passing a full selector gave "test error: locator.waitFor: Timeout 3000ms exceeded".
12. **The Phase 3 reading load is heavy for a productive route.** art-direction.md + design-theory.md + anti-patterns.md + lessons.md come to about 80 KB, mostly brand and marketing. What was useful here was art-direction §6, the App-UI tells, and design-theory B5–B7. The "Read at" column could split by posture.
13. **"Must not be slower" is ambiguous when the baseline is broken.** performance.md says "the redesign must not be slower", but the old page's web font never loaded, so its baseline LCP was artificially low. I reported both and justified the difference.
14. **The toast guidance leaves out one detail.** accessibility.md says "Toast … role=status present at load"; app-ui.md says no auto-dismiss when a toast carries an action. Neither says to keep the buttons out of the live region, and if you don't, "Undo Dismiss" is read aloud. I split the message region from the actions.
15. **The stop-and-ask rule for top tasks worked.** SKILL.md says to stop and ask when there is "no evidence" for the top tasks. With no user available, the assumption path worked. No complaint.

## Script problems (command → output)

1. **`capture.mjs --no-js` hangs forever.**
   - Command, run on the *unmodified old build* as a control: `node capture.mjs --base http://localhost:5763 --paths /app/ --widths 390 --out …/nojs-control --label nojs --no-js`.
   - Output: nothing until `timeout 90` fired, then "✗ /app/ at 390px not captured: page.evaluate: Target page, context or browser has been closed". An earlier combined capture died the same way (exit 143).
   - Cause: `lib/env.mjs` `settleOnce` sleeps with `setTimeout` inside the page, and page timers never fire when JavaScript is off. There is no timeout. **Still present.** My workaround is `audit/tools/nojs.mjs`.
2. **audit.mjs misses focus rings on pseudo-elements.**
   - Output: "✗ No visible focus change on 28 of 40 tabbed controls: button.name-btn …".
   - Cause: it compares only the element's own computed style, and my ring is drawn on `::after`. That is the stretched hit-area pattern accessibility.md itself recommends.
   - a11y.mjs's pixel diff reports 0 FAIL on the same page, and `focus-row-390-after.png` shows the ring. **Still present.**
3. **audit.mjs ignores z-order for sticky UI.**
   - Output: "✗ Focused control hidden under a fixed/sticky element: a.skip … under nav.side".
   - Cause: it checks bounding-box overlap only. `elementFromPoint` at the link's centre returns the skip link. **Still present** (audit.mjs line 99).
4. **audit.mjs measures contrast for off-screen elements.**
   - Output: "✗ `a.skip` #0f2438 on #14365c = 1.29:1".
   - Cause: the link sits at `top:-100px` and cannot be scrolled into view. `inventory.mjs` clamps the sample point to y=1 and so measures the app bar. Elements it cannot place should be skipped.
5. **a11y.mjs lists headings in the wrong order.**
   - Output on the before run: "WARN outline 1.3.1 Heading level jumps h1 → h4 ("Alerts")", and "Headings: h1 Good morning, Tom 👋 · h4 Alerts · h2 Notes … · h2 Herd".
   - The document order is h1, h2 Herd, h4 Alerts, h2 Notes; audit.mjs correctly said "2→4".
   - Cause: the nodes returned by `Accessibility.getFullAXTree` are not in document order.
6. **widgets.mjs "Enter does nothing" is a false negative.**
   - Output: "FAIL live #sync-btn ✗ [2.1.1] Enter on the focused trigger does nothing — falling back to click".
   - Enter does re-fetch: herd.json requests went from 1 to 2.
   - Cause: the check is `before === after` on page length and counts, and the refreshed text has the same length. **Still present** (widgets.mjs line 66).
7. **a11y.mjs samples inside rounded corners.**
   - Output: "WARN 2.4.12 Focused element partly covered (3/5 sample points) ⟶ a.skip".
   - Cause: the sample points sit 2 px inside the corners, and on a 10 px radius hit-testing excludes the corner. Likely a false positive.
8. **audit.mjs reports declared fonts, not rendered ones.** One report says "Families: Inter 100%" and "Saturated face … Inter 100% [first-wave]", and also "Declared font families not available — the page renders in a fallback: Inter".
9. **audit.mjs says "1 of 52 controls are under 44px" without naming it.** The JSON has only `"under44": 1`. I had to write a probe; it found a real 28×34 px mark link, which I fixed.
10. **audit.mjs expects a footer in an app.** With `--kind app` it reports "Missing landmarks: footer", and app screens rarely have one.
11. **compare.mjs `--dir` fails silently.** Pointed at a folder whose before and after captures are in separate subfolders, it prints nothing, raises no error and exits 0.
12. **palette.mjs labels a failing step "focus".**
    - Step 8 is labelled "strong border / focus" at 2.48:1 against step 2, in both the navy and neutral scales. That is below the 3:1 accessibility.md §2 requires for the focus token.
    - The neutral scale's step 9 is labelled "solid (brand)".
13. **fonts.mjs shows confusing names.** The static Source Sans 3 400 file shows as "Source Sans 3 ExtraLight — Regular", and the Nunito variable file as "Nunito ExtraLight … (default 200)". That makes it hard to confirm which weight is being shipped.
14. **parity.mjs reports old problems as new, and misses unit-less numbers.** It reports "/pricing.html ✗ no h1", though the old page had no h1 either. It flagged "3.1%" but missed the fabricated deltas "↑ 2" and "↓ 0.4". (parity.mjs was rewritten at 16:07, after my run.)
15. **Cosmetic.** Element-shot names repeat the label ("app-1440-el-el-side_brand-1.png"), and audit.mjs's usage header omits `--kind`.
16. **dembrandt 0.36.0 helped, but added little here** (see point 9 in the previous section).

**What worked well in the scripts:**

- audit.mjs's clipped-text, colour-only status and "No data" detection
- a11y.mjs's 320 px reflow check (it caught my overflow) and its keyboard pixel diff
- widgets.mjs's dialog contract
- capture.mjs at five widths, which was reliable
- palette.mjs's solved text steps, and contrast.mjs with APCA
- compare.mjs's `--grid`/`--blur` sheets, the fastest way to review 30 states

## Rules and checks that changed the design for the better

1. **"Text clipped by an overflow:hidden card … invisible to axe"** (visual-qa.md), with audit.mjs's check, found the root cause of the missed alerts.
2. **"Never 'No data'"** (app-ui.md), with the audit signal, showed the Alerts card was never filled, despite `totals.alerts = 5`.
3. **The hard bans on invented proof and on "a chart … that has no data"** removed the fake deltas and sparklines. They also led to Principle 4 and the labelled herd median.
4. **"Logo first" and "a face the brand family uses is a documented asset"** gave the navy/sky palette and Nunito.
5. **"Choosing, not remembering … verify with fonts.mjs"** made me render a specimen, which picked Atkinson Hyperlegible Next for its distinct I/l/1 and O/0.
6. **"Render every state … long, many, zero"** found three bugs:
   - search results were hidden under the cards, so the vet task still failed
   - an overridden `[hidden]` showed both check buttons at once
   - long names wrapped badly
7. **The contrast table before code, plus APCA,** changed the dark-theme muted text from `#9fb0c2` (Lc −56) to `#b3c2d1` (Lc −66.5) before the build.
8. **"Choose the quietest notification … no auto-dismiss with an action"** gave one snackbar with Undo and a status chip instead of toasts.
9. **"Must not be slower" plus the Lighthouse median** found CLS 0.114 from late-arriving data, which I fixed to 0.001. It also measured a JSON preload that made things worse, which I reverted.
10. **"Keep learned locations"** kept the desktop layout: table on the left, alerts on the right, same column order and labels.
11. **Native-first `<dialog>`** passed the dialog contract on the first run.
12. **"Sticky bars become static on short viewports"** led to the landscape fix.
13. **"Visual weight: the anomaly"** kept normal cows uncoloured.

## Box-ticking or in the way

- The similar-brief, category, second-order and ledger tests on a working tool (point 2 above).
- The marketing-oriented sections of DESIGN.md. Critique checks 5, 6, 10, 11, 12 and 14 did not apply.
- Running dembrandt on a 40-line stylesheet.
- The ledger sentence's vocabulary ("dark-chapter colour", "emphasis device").
- The volume of Phase 3 reading for a productive route.
- widgets.mjs asking for an "Error:" title prefix on a one-field inline form inside an app.
- About a third of Phase 6 went on proving script false positives (script problems 1–7).

## Skipped, and why

- **Fresh-context reviewer:** no subagent tool, so the builder wrote the critique and says so.
- **Screen-reader smoke test:** no assistive technology available; deferred.
- **Live reference sites:** the network was blocked. I used research.md's source-code fallback (farmOS Field Kit, GOV.UK Frontend 6.5.1, Primer primitives 11.10.0). ISA-101 and iOS came from memory and are labelled as such.
- **`--variant` removal tests:** they are for expressive surfaces only.
- **Some reference files:** web-design.md, imagery.md, logo-design.md, multilingual.md and dataviz.md.
- **Ledger and lessons updates:** the skill was read-only.
- **git push:** only a commit was requested.
- **Real Android device, throttled INP measurement, 200% zoom at 1280:** not done. a11y.mjs's 320/640 reflow checks cover zoom partly.
