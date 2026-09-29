# Milkline website redesign: report

*The blind-evaluation agent's hand-off report to the (simulated) user, saved verbatim.*

Branch `redesign`. Scope: `index.html`, `pricing.html` and `assets/`. `app/` and `data/` are untouched.

## What changed, and why

The old site was a 2023 AI-startup template with dairy words dropped in: violet-to-blue gradients, a "✨ New: AI-powered" badge, "Supercharge your farm with smart herd insights", emoji icons, a 🐄 emoji instead of your logo, and a wireframe where the product should be.

The new site is built from what is actually yours:

- **Your 2021 mark leads.** Its navy `#14365C` and sky `#2FA4D7` are the palette. The droplet and the rounded bar are the graphics: the droplet marks each cow and each step, and the bar is "the line". The logo is back in the header and footer; the site had never used it.
- **The headline says what Milkline does, in a farmer's words:** "Know which cow to check before the bulk tank does." It is followed by the real mechanism from your own copy: parlour exports and in-line milk meters, yield drops and conductivity rises, often the first sign of mastitis.
- **The product is shown, not described.** The first screen shows a morning milking from the app's demo herd: 40 cows on the line, Rosie (IE1111) flagged with her figures, and the other four flagged cows. It is labelled as illustrative sample data.
- **Proof only as big as it is.** Aoife Brennan's quote leads, with her farm, county and herd size. "2 days earlier" sits beside her name as her report, not as a statistic in an 11 px footnote. Also kept: 340 farms, 99.9% uptime, and 6am–10pm support every day.
- **Readable for your customers.** Body text is 18 px and every text colour passes contrast; 34 text elements failed before. Phone targets are 44–56 px.
- **Pricing is a lookup.** Plans are set by herd size, so the page is now a plain table. The "Most popular" glow is gone.
- **One typeface, self-hosted:** Fira Sans, whose figures line up in columns. It replaces Inter from Google Fonts, which was failing to load in testing.

## The trial form: kept exactly, made easier

Kept exactly:

- the form id, action and method
- `data-track`, the field names and `#visit-msg`
- the JSON POST of the same four fields
- `mlTrack('visit_form_submit')` on submit, and its shim

The request body is identical before and after (`audit/before-form-walk.txt`, `audit/after-form-walk.txt`). Without JavaScript, the form still posts normally.

Improved:

- visible labels
- "(optional)" on Farm and Herd size
- the phone keypad and autofill
- errors named per field, with a summary at the top of the form
- a confirmation that repeats the name and number (a success used to stay red after an earlier error)
- a clear failure message that keeps the answers
- no double submission

## Before and after

- **First screen:** `captures/compare/home-1440-fold.png` and `home-390-fold.png`.
- **Full pages:** `captures/compare/home-1440-full.png`, `home-390-full.png`, `pricing-1440-full.png`, `pricing-390-full.png`.
- **Without JavaScript:** `captures/compare/nojs-before-after.png`. The old page lost its feature section.
- **All widths:** `captures/before/` and `captures/after/`. Form states are in `captures/after/states/`.

## What was checked

| Check | Result |
| --- | --- |
| Renders at five widths, plus 320/360/375 and landscape, each looked at | No horizontal scroll. The phone header fits on one row from 360 px. |
| `audit.mjs` (1440 and 390) | **Before:** 34 contrast failures, 26 controls with no focus, no `lang`/`main`, no `h1` on pricing, 6 cards invisible without JS, 12 generic signals. **After:** 0 contrast failures, 0 axe violations, 0 signals, and one checked false positive. |
| `a11y.mjs` | Before 33 FAIL (home) and 25 FAIL (pricing). After, 0 FAIL on both. |
| `widgets.mjs` form-errors | PASS |
| Form walk (empty, success, server error) | Same request and event as before |
| `parity.mjs` | No route, id, field, metadata or claim lost; one false positive |
| Links and anchors | All resolve. Privacy and Terms are still `#`. |
| Lighthouse 13.5, mobile, median of 3 | Score 100, CLS 0, TBT 0. LCP is 1.80 s (home) and 1.67 s (pricing), within the 2.5 s budget. The old pages measured 1.38 s, but they loaded no fonts. FCP improved from 1.38 s to 1.05 s. |
| Keyboard, reduced motion, forced colours, colour-blind renders, text spacing, 320 px reflow | Checked. The logo was invisible in High Contrast mode; that is fixed. |

## Left out, and why

- **Photography.** Photos of your farms, and of Niamh and Tom in the parlour, would be the strongest addition; the About section is words only today. Stock sites were unreachable here, and AI images would be dishonest.
- **Live competitor sites.** These couldn't be opened here. The form pattern was measured from the GOV.UK Design System's published code instead.
- **A screen-reader test.** None is available here. Please run NVDA or VoiceOver over the form before launch.
- **An independent design review.** The critique is my own, because no second reviewer was available.
- **The herd app.** It was out of scope and not touched. "See the app" now leads into the old template look, so a small refine of the app is recommended.
- **Push and deploy.** Nothing was pushed or deployed.

## Decisions and facts only you can supply

No one was available to answer these, so each one records the assumption I made.

1. **Audience and top tasks.** I assumed Irish and UK dairy farmers with roughly 80–400 cows, whose top tasks are: understand what it does, find the price, start the trial, and decide whether to trust you.
2. **"AI-powered herd intelligence"** was removed as unsupported. Is there a real AI feature, and if so, what does it do?
3. **"Most popular"** was removed as unsourced.
4. **"99.9% uptime"** was kept. Is there a source for it, such as an SLA or a status page?
5. **Privacy and Terms** go nowhere, and the form collects phone numbers. You need a privacy notice.
6. **+353 22 000000** is used in the form's failure message. Is it right for trial enquiries?
7. **`visit_form_submit` fires on every press, including invalid ones.** I kept this so your numbers stay comparable, but it counts attempts, not leads. Consider a separate "sent" event.
8. **The demo-herd figures** are shown with the farm name ("Hegarty Farm") removed. Is that OK?
9. **The domain** `https://milkline.ie/` is used for the canonical and social links (taken from the README).

## Ledger row

Not written, because the skill folder was read-only for this test:

`2026-09-28 | Milkline | marketing / redesign (app out of scope) | Fira Sans 400/600/800 · Nunito Black wordmark as outlines | white + milk-white #F2F7FD · navy #14365C · sky #2FA4D7 from the 2021 mark, Restrained | split hero with a navy product panel (sample herd as droplets on "the line", flagged-cow card and table); droplet/bar as nodes and list markers; GOV.UK-pattern form | no verdict yet`
