<!-- Saved from the evaluation agent's hand-back message: its own write of this file was refused by the harness's rule that subagents return reports as text, and it did not work around the refusal. The text is as the agent wrote it. -->

# Resident parking permits: redesign hand-off

Branch `redesign`: four commits on top of `master`. Not pushed, because the remote is a local fixture. Nothing is deployed.

## First: decisions and facts only the council can give

No one could be asked during this run. For each item below I made an assumption, built on it, and marked it here.

**What the back end receives has not changed.** I sent the same application through the old and the new build and captured the POST body. The two bodies are byte-identical: the same 12 keys, in the same order, with the same value types (`qa/payload-probe.txt`). `apply_start`, `apply_submit` and `apply_success {reference}` fire at the same moments as before.

**One analytics change to confirm with the team that uses the data:** `apply_error {field}` now fires on each step when Continue finds a problem, not once for every empty field on a single final submit. It can also now report `consent` and a badly formatted `email`, which the old form never reported. The event name and payload shape are unchanged, but the counts per session will differ.

**Questions:**
1. **Proof of address is optional, and only its file name is sent.** The old form allowed an empty file and sent only the name. I kept both behaviours, and the field now says "(optional)" because that is what the form does. Does the file go anywhere? If not, residents think they have sent proof when they have not. Should it be required?
2. **The 10-minute timer is removed.** It reloaded the page 10 minutes after it opened, whether or not the resident was typing, and wiped every answer. That broke WCAG 2.2.1 and caused the "timed out and I lost everything" complaint. *Assumption:* the back end has no session limit. If it has one, I'll add a warning with an "extend" button.
3. **The "I am not a robot" check is removed.** It was a mouse-only `<span>`, so keyboard and screen-reader users could never submit. It was also never sent to the server, so it protected nothing. *Assumption:* no front-end bot protection is expected. If you need it, it must be done on the server and be accessible.
4. **The terms and conditions are not linked.** The consent box says "I agree to the terms and conditions (T&Cs)", but there is no terms page in the repo. Where are the terms?
5. **Privacy, Cookies and Accessibility in the footer are not links**, and they were not links before either. I kept the text verbatim. A council must publish an accessibility statement (Public Sector Bodies Accessibility Regulations 2018). I can draft one from the results below if you give me its URL and a contact route.
6. **Payment.** Neither build says how or when residents pay. The price is now shown, but not how to pay it.
7. **Other ways to apply** (phone, paper). None are in the repo, so the page names none.
8. **Copy that needs sign-off:**
   - the CPZ definition: "an area where parking is restricted at set times";
   - calling each zone's hours its "controlled hours";
   - "You should get a decision within 5 days": is that working days?
   - "Permits are free for Blue Badge holders": does the resident have to show the badge?
   - the not-in-a-zone wording.
9. **Top tasks** were taken from the README's six complaints. They are not confirmed, and there is no baseline completion rate in the repo; your analytics hold it.
10. **Answers are kept in `sessionStorage`** until the tab closes or the application is sent. On a shared computer they stay in that tab until it is closed. The uploaded file cannot survive a reload.
11. **JavaScript is still required**, as before. The back end takes JSON, so a no-JavaScript route would need it to accept normal form posts. Without JavaScript the page now says so.

## What changed and why

**Start page (`/`).** The purple "Park with Confidence 🚗" page, with three emoji cards making unsourced claims, is now a service start page. It says:
- what a CPZ is, in one sentence;
- what a permit costs (£20 to £128, free with a Blue Badge);
- what you need before you start;
- how many permits a household can have (2);
- every zone with its streets, controlled hours and prices, in a table that becomes one block per zone on a phone;
- what happens after you apply (a reference number at once, a decision within 5 days).

All of this is read from `data/zones.json`, so the nightly export stays the only source. The "Start now" link keeps `data-track="start"` and still points to `apply/`.

**Application (`/apply/`, same URL).** One question group per step. The step lives in the URL hash, so the browser Back button works:
1. **Which street do you live on?** The zone is answered as soon as a street is picked, for example "Mill Road is in zone C, Castle Green", with the controlled hours and all three prices. Picking "My street is not on this list" leads to a page that says so plainly.
2. **Your permit.** Each length shows the price for that zone, plus a Blue Badge question and the total.
3. **Your vehicle.**
4. **Your details.** Name, address and contact are kept together so browser autofill fills them in one go. Every field has `autocomplete`, and the phone field is `type="tel"`.
5. **Proof of address.**
6. **Check your answers.** Each answer has a Change link that returns to this page. The consent box is here, then Send.

A confirmation page shows the reference number large, the decision time, and a print button.

Errors follow the GOV.UK pattern:
- a "There is a problem" summary at the top, which takes focus and links to each field;
- the same message beside each field;
- an "Error:" prefix on the page title.

A failed send now says whether the problem was the connection or the service, and keeps every answer. Sending twice is prevented. Pressing Back after sending cannot send again. Opening `/apply/` fresh starts a new application.

**Look.** The colours come from the crest:
- **Harbour blue** `#0b4f6c` for buttons, links and the header rule.
- **Gold** `#f2c14e` only as the keyboard focus fill, with a dark bar.

The typeface is Atkinson Hyperlegible Next, self-hosted (OFL). Residents type and read back registration numbers, postcodes and `HPP-` references, and this face keeps 0/O, 1/I/l and 8/B apart. Google Fonts is no longer called, so no resident IP addresses go to a third party. There are no gradients, cards, emoji or animation. Controls are 48 px tall.

## Measured before → after

| Measure | Before | After | How |
| --- | --- | --- | --- |
| axe-core 4.13 violations (/, /apply/, 1440 and 390) | 5–6 rule types per page | **0** | `audit/before` vs `audit/after` |
| `a11y.mjs` FAIL / WARN, application | 24 / 10 | **0** / 2–4, each triaged below | `audit/after-a11y-{apply,details,check,done}` |
| `a11y.mjs` FAIL / WARN, start page | 5 / 2 | **0 / 0** | `audit/after-a11y-start` |
| Keyboard can submit an application | no | yes | tab orders; `widgets.mjs` |
| Phone layout width at 390 | 451 / 940 px, loads zoomed out | 390 px, no overflow | `audit.mjs` |
| Error location | one sentence, off screen | summary focused + field messages | `widgets.mjs` form-errors PASS on steps 1, 4 and 6 |
| Lowest text contrast | 2.35:1 | 7.02:1 | `audit.mjs`, `contrast.mjs` |
| Field border contrast | 1.08–1.24:1 | 15.5:1 | `a11y.mjs` |
| LCP, phone profile (4× CPU, slow 4G, median of 3) | 632 / 720 ms | 652 / 704 ms | `audit/perf.md` |
| CLS / TBT | 0 / 0 | 0 / 0 | same |
| Transfer | 7 / 9 KB (broken baseline: its Google Fonts request failed, so it never paid for its fonts) | 66 / 74 KB uncompressed, ≈ 39 KB gzip (25 KB fonts) | `perf.mjs`, `gzip -9` |
| Posted payload | — | byte-identical | `qa/payload-probe.txt` |
| Parity | — | every route answers; no unsourced number; `#zones` and `#human` gone from `/apply/` (both deliberate) | `audit/parity.md` |

Task walkthroughs on a 390 px phone, same tasks on both builds (`CRITIQUE.md`, `captures/walk/`):

| Task | Old | New |
| --- | --- | --- |
| Is Mill Road in a zone, and which? | partial: the street is cut off in the table | yes, in 2 actions |
| What does 6 months cost? | partial: the price appears below Submit, off screen | yes, in 2 actions |
| Apply using only a keyboard | no | yes |
| Where is my error? | no: nothing changes on screen | yes: summary focused, field marked |

## What was verified, and how

- **Renders:** both pages at 1440, 1280, 1024, 768 and 390; plus no-JavaScript, forced-colours and colour-vision renders.
- **States:** 26 on the new build and 7 on the old, with `/api/apply` mocked through `states.mjs` routes. They cover:
  - street chosen, and not in a zone;
  - every error, and fixing an error;
  - Blue Badge free;
  - check answers, and missing consent;
  - sending, success, server error, offline;
  - the zones file failing, on both pages;
  - a reload keeping the answers;
  - very long content.
- **Flows** (`qa/history-probe.txt`): browser Back and Forward, a deep link to a later step (sent back to the first unanswered one), Change and back to the check page, the resend guard after success, and a fresh start after success.
- **Accessibility**, the manual procedure from the skill's `accessibility.md` §11:
  - **Keyboard walk:** the skip link comes first, focus is visible everywhere, and each step's heading takes focus.
  - **Names and states:** read from the accessibility tree.
  - **Announcements:** the zone answer and the price use `role="status"`; errors and send failures move focus, inside `role="alert"`.
  - **Forms:** submitted empty and with a wrong email format.
  - **Reflow** at 320 and 640 px, and **text spacing:** clean.
  - **Forced colours:** controls keep their borders and focus uses `Highlight`.
  - **Colour vision:** errors are shown in words, not colour alone.
  - **Motion:** there is none.
  - **Screen reader:** not tested, because none is available here. **Recommended follow-up:** NVDA with Chrome, and VoiceOver on iOS Safari.
- **Remaining a11y.mjs warnings, triaged:**
  - **`autocomplete` on the street select and the file input: script false positive.** `street-address` cannot match a street-name option, and the HTML spec does not apply `autocomplete` to file inputs. On steps where these fields are hidden, the probe found `getClientRects().length === 0`.
  - **"Looks like a heading: Your permit will cost £128": false positive.** The element is in a hidden step; it has 0 client rects on the check page.
  - **2.4.13 (AAA) weak focus on "Change address": not reproduced.** `captures/focus-change-link.png` shows a gold fill and a 64 × 6 px ink bar, and the Back link, with the same style, passes.
- **Deliberate removals that parity reports:** `#zones` (the table moved to the start page), `#human` (robot check removed), "10 minutes" (the timer text).

## Left out, and why

- A fresh-context design review: there was no subagent or second model, so I used the skill's fallback in `CRITIQUE.md`.
- Live reference sites: the network is limited to GitHub, npm, PyPI and Google Fonts, so I read the GOV.UK Design System, govuk-frontend and nhsuk-frontend from source.
- A social image: none existed and none was asked for.
- Address lookup, payment and save-and-return: the back end has none of them.
- A screen-reader test (see above).

## Files

- `DESIGN.md`, `SYSTEM.md`, `CRITIQUE.md`, `CREDITS.md`, `EVAL-NOTES.md`.
- `audit/`: measurements before and after.
- `captures/`: renders, states, walkthroughs, and the sheets `before-after-390.png` and `critique-blur-1440.png`.
- `qa/`: scenarios, seeds, contracts, probes and their outputs.

## For the skill's maintainer (read-only install, so nothing was edited)

**Ledger row:**

`2026-09-28 | Harbourside Council resident parking permits — blind test on a fixture | public service / rethink of start page + application flow (fields, events, URLs frozen) | Atkinson Hyperlegible Next 400/700 only, no display face (legible reg numbers, postcodes, references) | white · ink #0f2733 · harbour blue #0b4f6c action from the 2019 crest; crest gold #f2c14e only as the focus fill; red #b42318 errors only; Restrained | no hero: GOV.UK-pattern start page with a zones-and-prices table that stacks per zone on phones; street-first question pages, zone answered on selection; check answers; confirmation panel | none (test)`

Lessons and script defects are in `EVAL-NOTES.md`.
