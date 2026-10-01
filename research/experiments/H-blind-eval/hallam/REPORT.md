# Hallam & Price — website redesign: hand-off report

*Saved by the evaluator from the agent's hand-back: the harness refused the agent's own write of this file.*

For David Hallam and Priya Price. 1 October 2026. Branch `redesign`. It is not merged and not deployed. This repository has no remote, so nothing was pushed.

## 1. What I assumed, because nobody could be asked

I couldn't ask you anything during this job, so I wrote each open question down as an assumption and carried on. Please check these first; each is easy to reverse.

| | Assumption | If I'm wrong |
| --- | --- | --- |
| A1 | People come to the site for five things, in this order: what will it cost me; phone you; do you do my kind of work; send an enquiry; when is my tax deadline. This comes from your own analytics in the README. | Tell me the real order and the home page follows it. |
| A2 | You're happy for the fixed fees in `data/fees.json` to be on the site. Your fees page already says "we offer competitive fixed fees" and links to a fee schedule. That PDF link has been broken since 2022, and 81% of people who open the page leave from it. Every figure is shown exactly as in the file, excluding VAT, with the file's VAT note and date. | Remove the finder and the schedule and the page goes back to "call us for a quote". I'd argue hard against it. |
| A3 | **Your enquiry system accepts a blank business name.** I made "Business name" optional, because individuals and landlords don't have one. See the deploy blocker below. | One attribute makes it required again. |
| A4 | "Annual turnover" stays required for everyone, as it was. | — |
| A5 | The `enquiry_start` event still fires when the contact page loads, so this year's figures compare with last year's. It counts page visits, not people who start typing: "240 started, 31 finished" really means 240 people *looked at* the contact page. | If you want a true "started the form" figure, I can add one new event. Your analytics person decides. |
| A6 | Whatever your server shows after someone sends the form, and any `enquiry_success` event it records, is unchanged. The form still sends the old way. | — |
| A7 | "Younger clients" means sole traders, freelancers, people setting up their first limited company, and landlords. Mostly in their twenties and thirties, mostly finding you on a phone. | — |
| A8 | By "Apple-style, things fly around in 3D as you scroll" you meant "look current and confident", not "we need 3D". Section 3 explains why I didn't build it, and what it would take if you still want it. | It's your call; the options are in section 3. |
| A9 | There are no photographs of you, Priya, the team or the office. The site doesn't depend on them. | Send portraits and one office photo and they go on the team and home pages. |
| A10 | The logo file has a fault (section 6, point 5). I made corrected copies and left your original untouched. | Compare them with your letterhead artwork, or send me the original artwork. |

## 2. Before this goes live (deploy blocker)

1. **Blank business names.** The form now lets people leave "Business name" empty. Your system then receives `business_name=` (empty) instead of being forced to get something.
   - Send one enquiry with a blank business name on a staging copy and check it reaches your CRM.
   - If it doesn't, add `required` to the business-name field in `contact/index.html` and it behaves as before.
   - Everything else the form sends is byte-for-byte the same as today. This was checked by recording both forms (`qa/parity-payloads.md`).
2. **Empty enquiries stop arriving.** In the current repository the form's checking code never runs: it crashes on an analytics call first. So today a blank form sends ten empty fields to your CRM. The new form won't send until the questions are answered. If your CRM relied on those blank submissions for anything, it will see fewer of them.

Nothing else changes what your server receives.

## 3. What changed, and why

**The short version:** the old site hid the two things your visitors want — the price and your phone number. They sat behind a broken PDF and tiny grey text, on a layout phones can't read. The new site puts them first, in your own navy and gold.

- **Your fees are on the site.**
  - The home page opens with "Fixed fees, on the table." and a one-line fee finder: *I'm a sole trader with a turnover of under £50k*. The answer appears in large type: **£45 a month + VAT**. Change either answer and the price changes.
  - "Ask about this fee" opens the enquiry form with those answers already filled in.
  - The fees page shows the whole schedule, marks "Your fee", and prints cleanly on two A4 pages for clients who want paper.
  - Every figure comes straight from `data/fees.json`. When you agree new fees in April and the file changes, the site changes too.
- **Your phone number is one tap away, everywhere.** It's in the header of every page on every phone, and again in large type at the end of each page. It's the most-clicked thing on your site, and 71% of your visitors are on phones.
- **It works on phones.** The old site had no mobile layout: phones showed a shrunken desktop page with text about 5 pixels high. Every page is now designed for a phone first.
- **The enquiry form is easier.**
  - It has the same questions, in the same order, sending the same answers to your CRM.
  - It now has proper labels, the right keyboard for each field, and autofill for name, email and phone.
  - Short lists are tap-to-choose instead of drop-downs.
  - A clear message appears beside each question that needs fixing, instead of a pop-up saying "Please complete all required fields".
- **Tax deadlines from your fees file are on the home and fees pages.** The next one is marked, with how many days away it is. That answers "tax return deadline", one of your top searches.
- **You and Priya are on the home page and the team page,** with what each of you looks after. For younger clients, the team page also explains what FCA, ACA and CTA mean.
- **Removed:** the "Latest News: Budget 2015" box, the grey picture placeholders, the fake slideshow dots, the broken PDF link, and "© 2014".
- **Kept:**
  - your logo and your navy and gold;
  - every fact;
  - every page address, so letterheads and email signatures still work;
  - the form's agreement with your CRM;
  - your analytics events.

**About the 3D.** I looked at it seriously, because you asked for it.
- Those Apple pages turn a physical product round as you scroll, because seeing it from every side is the point. You don't sell an object, so there's nothing to turn round, and the 3D would be decoration.
- It would also cost your real visitors. Most are on phones, many on mobile data. That kind of page is usually several megabytes, slow and fiddly on an ordinary Android phone, and it pushes the price and phone number further down.
- What *is* worth taking from Apple is choosing options and watching the price update. That's exactly what your fee finder does. I also took the confident type and the habit of leaving nothing on the page that doesn't need to be there.
- **What moves:** the tax-year bar fills to today as you scroll to it, and the price changes smoothly. Nothing else moves. Anyone with "reduce motion" switched on gets none of it.
- If you still want a 3D or scroll-story piece, the honest version is a separate, optional page (for example "your first year with us, step by step") with its own budget. I'd expect several weeks of work, and I'd measure whether it brings enquiries before putting it on the home page.

**Why it looks the way it does.** The 1988 H&P square is navy with gold letters, so the site *is* that square. The page is navy from the top edge, gold is used only on the button you press, and your figures (fees, dates, phone number) are large, in a serif chosen to echo your wordmark. It is deliberately not the usual accountant's site (navy and gold, a handshake photo, "Welcome to…"): the difference is that yours shows the price.

**Before and after:**
- Phone view: `captures/review/before-after-phone.png`.
- Every page at five widths, old beside new: `captures/compare/` (for example `home-1440.png`, `fees-390.png`, `contact-390.png`).

## 4. What I checked, and how

| Check | Result |
| --- | --- |
| Every page rendered and looked at | Five pages at 1440, 1280, 1024, 768 and 390 px wide (`captures/after/`). Also without JavaScript, on a landscape phone, at every width from 320 to 1920, and at 200% and 400% zoom (`captures/sweep/`). |
| Accessibility (WCAG 2.2 AA) | The automated accessibility checker found 0 problems across 10 page views and 19 interactive states; the old site had up to 10 serious ones per page. Keyboard, zoom and contrast checks: 0 failures on every page (the old contact page had 29). The menu, fee finder and form errors all pass when used by keyboard. **Not done:** a test with a real screen reader — none was available here. It's worth an hour with someone who uses one. |
| Truth | Every price, band and date on the site traces to `data/fees.json`. No claim from the old site was lost. Every page address, form field and analytics hook is still present (`qa/parity.md`). |
| What the form sends | Identical to the old form for the same answers (`qa/parity-payloads.md`). Tested end to end on a phone, from the fee finder to "sent" (`captures/walk/new/`). |
| Speed on a simulated mid-range phone on slow 4G | The main content appears in 0.75–0.82 s, well inside the 2.5 s target, with no layout jumping. The old site was faster (0.43–0.45 s) because it loaded only 2 KB of styles and no typefaces; the difference is mostly the two typefaces (96 KB). Details: `qa/perf-report.md`. |
| Links | All 31 links and files on the five pages answer (`qa/probe-links.txt`). The only link not carried over is the broken PDF. |
| Motion | Every planned movement was checked, including with "reduce motion" on (`qa/motion-*`). Nothing runs when nothing is happening. |
| Analytics | `fees_view` and `enquiry_start` used to crash in this repository, because they ran before the tracking code loaded. They're now recorded. `phone_click` and `enquiry_submit` work as before. |

The design review was mine rather than an independent reviewer's, because no second reviewer was available in this setup. I made it as blind as I could and wrote it up in `CRITIQUE.md`. It produced one round of fixes:
- two gold buttons were visible at once near the bottom of pages;
- landscape phones lost the sticky header;
- printing needed work.

## 5. What I couldn't do

- **Look at other websites.** This environment blocks almost every website, so I couldn't study local competitors or the Apple pages themselves. Where I describe them, it's from general knowledge, and `DESIGN.md` says so.
- **Photographs.** None exist and I couldn't fetch any. The site doesn't need them, but your own photos would make it warmer (A9).
- **Your real form handler, CRM and analytics.** I tested against a stand-in server. The deploy blocker in section 2 needs a staging test.
- **Screen-reader testing** with a real assistive-technology user.

## 6. What you need to decide

1. **Going live:** test the blank business name on staging (section 2), then merge the `redesign` branch and deploy as you normally do. I haven't deployed anything.
2. **Publishing the fees:** whether you're happy for them to be on the site (A2).
3. **The 3D question** (section 3).
4. **Photographs:** portraits and an office photograph, if you'd like them on the site.
5. **The logo.**
   - The 2014 logo file doesn't fit its own box in any font: "H&P" is wider than the navy square, and "CHARTERED ACCOUNTANTS" runs off the edge. On Android phones, which don't have the Georgia font, it looks worse.
   - I made corrected copies (`assets/logo-outlined.svg` and related files). They keep the same design, with the letters converted to shapes in a Georgia-compatible open-licence typeface, "H&P" fitted inside the square, and the box widened.
   - Compare them with your letterhead. If you have the original artwork, I'd rather use that.
6. **Your web address for search engines.** I didn't add canonical links because I couldn't confirm whether it's `www.hallamprice.co.uk` or `hallamprice.co.uk`.

## 7. How we'll know it worked

| Measure | Where to read it | Starting point | Read again |
| --- | --- | --- | --- |
| People leaving from the fees page | Your analytics: exits from `/fees/` | 81% | 4 and 12 weeks after launch |
| Enquiries sent | `enquiry_submit` per month, and the CRM | 31 a month | Monthly |
| Enquiries per contact-page visit | `enquiry_submit` ÷ `enquiry_start` | 13% (31 / 240) | Monthly; target 25% |
| Phone calls from the site | `phone_click` | The most-clicked element on phones | Monthly; it should hold or rise |
| Fee-page visitors who then call or enquire | `phone_click` or `enquiry_submit` after `fees_view` | New | After 4 weeks |
| Speed on real phones | Google Search Console, Core Web Vitals | — | After 28 days of traffic |

If enquiries per visit haven't moved after three months, the next thing to change is the form (one question per screen), not the look.

## 8. For the skill's maintainer (the skill is installed read-only)

**Ledger row** for `references/ledger.md`. The JPEG for `references/ledger/` is `captures/review/ledger-2026-10-01-accountancy-home.jpg`.

| Date | Project | Category / intensity | Display · text faces | Palette (ground · ink · accent) and strategy | Hero form and signature devices | User's verdicts |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-01 | Two-partner chartered accountancy, Sheffield — blind test on a fixture (capture: `references/ledger/2026-10-01-accountancy-home.jpg`) | marketing / redesign + fees-page rethink + enquiry-form presentation rethink (contract frozen) | Literata 600 (opsz) · Schibsted Grotesk 400–700; logo text outlined in Gelasio | navy #1F3A5F field from the 1988 lettermark, from the top edge (header, hero, close, footer) · white reading chapters · ink #15253B · lettermark gold #C9A227 as the only action colour; **Committed** | typographic hero: statement + sentence-form fee finder (two native selects) + the price at image scale (88–160 px), result handed to the enquiry form; deadlines as large dates with a scroll-linked tax-year line; ruled service list with navy-square markers; no photography; client's "Apple 3D scroll" request declined by the value test | none (test) |

**Proposed lessons.** Each names the root cause, then the cheapest place to fix it. Evidence is in EVAL-NOTES.

1. **A kept brand colour can carry the old hero's shape into the new one.** A white header band over a navy box survived at full width, and only the key-screen blur caught it. Fix in `art-direction.md` §5 or `visual-qa.md` (key-screen review): when the hue family is kept, compare the blurred first viewport against the *old site* for massing, not only against the ledger.
2. **The client named a spectacle technique (3D scroll) for a business with no object.** The value test killed it cleanly, but no reference says how to answer the client: what to take from the reference, what the full version would cost, and how to offer it as a separate decision. Fix: a short "When the user names a technique" note in `framing.md` §2 and in the Reporting section of `SKILL.md`.
3. **Analytics baselines can measure something other than their name.** `enquiry_start` fires on page load, and two events crashed before their stub loaded. Fix in `audit.md` §1: on the old build, check that each contract event actually fires and what it counts, before using it as a baseline.
4. **Preloading both font files delayed first paint on slow 4G.** LCP was 1148 ms with both preloaded and 776 ms with none (CLS 0.017 with metric fallbacks). `art-direction.md` §4 item 6 and `performance.md` §1 read as "preload two". Reword to: at most two, and only if measurement shows it helps.
5. **A scroll-driven range on a thin element completes within its own height.** An 8 px bar used as its own view timeline drew within 8 px of scroll. Fix in `motion.md` §5: name a view timeline on a block of real height. Separately, `motion.mjs` cannot verify scroll-linked rows (see EVAL-NOTES, script defects).
6. **Showing script-only controls on pre-rendered pages shifts the layout** when a module toggles `hidden`. Fix in `implementation.md`: set a `.js` class in `<head>` and switch with CSS (`html:not(.js) .js-only`), so JavaScript changes behaviour, not layout.
