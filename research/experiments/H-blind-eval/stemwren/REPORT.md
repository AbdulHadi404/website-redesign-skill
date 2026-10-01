# Stem & Wren — redesign hand-off

*Saved by the evaluator from the agent's hand-back: the harness refused the agent's own write of this file.*

To: Wren. From: the studio. Branch: `redesign` (not merged, not deployed, no remote pushed).

## 1. Before anything goes live: check these with whoever runs the order service

The order form still sends the same message to the shop's order service (`POST /api/order`), with the same twelve fields in the same order. For an identical order it is byte-for-byte the same as today's form (recorded and compared: `captures/states/requests/`). But some *values* it can now send are new, and only the order service can say whether it accepts them. Please test each on a staging copy before launch:

1. **More than three kinds of stem.** The old form allowed three flower lines; the builder allows up to six kinds, and the same flower in two colours (e.g. peach and blush garden roses) as two entries. If the service rejects more than three, change one number, `MAX_LINES` in `assets/bouquet-model.js`, to 3, and the builder will say so in words.
2. **Delivery date format.** Always sent as `DD/MM/YYYY`, as the old placeholder asked. The old form sent whatever people typed.
3. **Postcode format.** Sent tidied, e.g. `LS17 6AB` even if typed `ls176ab`. The old form sent it as typed, and priced "ls176ab" with no delivery charge because it only matched postcodes with a space.
4. **Colours** now come only from the stock sheet's colour list (no free text). Size is always worked out from the stem count, so it can no longer contradict it.
5. **Orders the site now refuses to send** (they were sent before):
   - fewer than 5 or more than 25 stems;
   - stems out of season for the delivery month, or out of stock;
   - postcodes outside zones A–C;
   - same-day orders after 1pm, or outside zone A.

   If the shop ever accepts any of these by arrangement, they need a different route (phone, Instagram).
6. **Analytics:** the same four events with the same details. `order_error` now fires when someone presses *Next* on a part of the order with a problem, not only at the final button, and `size` errors can no longer happen. Error counts will not compare one-to-one with the old numbers.

## 2. Questions I couldn't ask you, and what I assumed

Nobody could be asked during this job, so each open question became a written assumption. Please confirm or correct them; most are one-line changes.

| | Assumption | Why it matters | Where to change it |
| --- | --- | --- | --- |
| A1 | The top tasks are: see it before ordering; know the price as you go; only order what you can get; order quickly on a phone (and know if today is possible); share it. Taken from your customers' messages in the README | the whole design is ordered by these | `DESIGN.md` brief |
| A2 | The order service accepts more than three stem lines | see section 1, item 1 | `MAX_LINES` |
| A3 | The service reads `delivery_date` as DD/MM/YYYY | see section 1, item 2 | `payloadDate()` |
| A4 | "In season" is judged by the **delivery** month, not today's month | someone ordering on 31 October for 2 November can't have dahlias | `availability()` |
| A5 | You don't deliver outside zones A–C, so those orders aren't sent | the old form sent them with no delivery price | `validate()` |
| A6 | You deliver every day; zones B and C start the next day; same day only for zone A before 13:00 UK time. The data gives no closures, Sundays or lead times beyond that | the day chips | `deliveryDays()` |
| A7 | Payment isn't taken on the website (the contract has no payment field). The thank-you screen says only what's true: the order number, the total, where and when, "keep the order number" | no promise is made about how payment or confirmation happens | `done()` in `assets/order.js` |
| A8 | The three old testimonials ("Sarah", "James", "Emma") couldn't be traced to real customers, so they're gone. If they're real and you have permission, they can come back; real quotes from your DMs would be better | invented proof would be worse than none | `index.html` |
| A9 | Your Instagram photos weren't available (they're on your phone), so the site uses drawings staged like your photos: the bouquet seen from above on sage linen. The sage was set from your description, not sampled | if your linen is a different green, the match weakens | `--linen` in `assets/site.css`; `qa/tools/make-linen.mjs` |
| A10 | "Free card with every order" is still true | it's on the home page and in the builder | `index.html`, `order/index.html` |
| A11 | The starting bouquets are *inspired by* your posts: peach garden roses, lisianthus and eucalyptus in kraft and twine; café-au-lait dahlias; peonies in a hat box; pick & mix tulips; plus one deep-red mix of my own. The stem counts are mine | the site opens on "Peach season"; out-of-season ones show "Back in May" etc. | `STARTERS` in `assets/bouquet-model.js` |
| A12 | Collection from the shop isn't offered online: `delivery.json` has it, but the order contract has no field to say "collect" | needs a field in the order service | — |
| A13 | Privacy and Terms still point nowhere, as before. The order form collects names, addresses, email and phone numbers, so a privacy notice is needed under UK GDPR | legal | footer links |
| A14 | No new analytics events were added. To measure sharing you'd need one more event (e.g. `bouquet_share` with only the method: link or picture), never the card text | the "shares" measure can't be read without it | `share()` in `assets/order.js` |

Things only you have: the shop's phone number and opening hours (not on the site because they're not in the repo), your photographs, and permission to quote customers.

## 3. What changed, and why

**The order page is now a bouquet you make, not a form you fill in.** It opens on a finished, in-season bouquet: peach garden roses, white lisianthus and eucalyptus in kraft paper and twine, drawn lying on your sage linen the way you photograph everything. Below it is a row of stems, each drawn with its handwritten kraft tag like your "Which one are you?" post. Tap one and it lands in the bouquet. The size (Petite, Classic, Grand) follows the count, and the price is always in the top corner. "Re-tie" rearranges the bouquet, because no two hand-tied bouquets come out the same. Stems you can't get that month stay in the row, greyed, saying "Back in May", so nobody picks peonies in October again.

**The rest of the order is five short parts:** Flowers, Wrap & card, Delivery, You & them, Send. On a phone they come one at a time, with the bouquet always in view (it moves into the top bar once the picture scrolls away). The postcode comes first in Delivery, so the delivery price and whether *today* is possible appear before anyone types an address. The last step restates everything, with the total on the button. If something's missing, the page says exactly what and where; if the connection drops, nothing is lost.

**Sharing:** "Share" makes a picture of their bouquet on your linen, with your name and the order link, ready for Instagram. It also gives a link that opens the same bouquet for someone else; the link never carries their card message.

**The home page** is your table too:
- the bouquet across the linen with "Make your own bouquet";
- what's in season *this month*, straight from the stock sheet each morning, each stem one tap from a bouquet;
- the hand-written card ("for Mum x", with your caption);
- real delivery zones and prices;
- the green door at number 14.

**Why it looks like this:** your customers said the site didn't look like the same shop. The old site was a framework's default pink, a script font that never actually loaded, emoji and gradient tiles. Everything now comes from your own materials: the sage linen, kraft, twine and handwriting in your posts, and the dark green door for buttons. The flowers bring the colour. Type is a sturdy, plain sans (Familjen Grotesk), with a felt-pen hand (Kalam) only where you'd write by hand: the name, the tags and the card.

Before and after: `captures/compare/home-1440-fold.png`, `home-390-fold.png`, `order-1440-fold.png`, `order-390-fold.png`.

## 4. What was checked, and how

| Check | Result |
| --- | --- |
| Pages rendered at 1440, 1280, 1024, 768, 390 | `captures/after/`. Every width from 320 to 1920 px and 200%/400% zoom swept (`audit/sweep`): no overflow or clipped text left |
| Every state of the order (15) and the home page (3), phone and desktop, scanned for accessibility while open | `captures/states/*-after.png`: no critical or serious axe violation (old site: 6 unnamed selects, 21 contrast failures) |
| Automated audit, both pages and every order chapter | 0 fails (old site: phone page zoomed out to 1101 px, fonts never loaded, no `lang`, no `main`) |
| Keyboard and screen-reader contracts (share dialog, live announcements, error summary, phone menu) | all pass (`widgets.mjs`) |
| In-depth accessibility (`a11y.mjs`) | 0 fails on the home page and on every order chapter tested (old order page: 47 fails). One AAA-level warning left: the stem row is partly under the sticky bar when focused; AA only requires that it's not hidden |
| Your rules (5–25 stems, sizes, seasons, stock, zones, same-day before 1pm UK time, prices, the payload) | 11 automated tests, including more than 10,000 add/remove combinations: `node --test qa/model.test.mjs` |
| The order payload | byte-identical to the old form for the same order |
| Analytics events | same names and details (`qa/probe-analytics.out.txt`) |
| Old pages, links, anchors, ids | every route and preserved id answers; `/order/`, `#occasions` and `#about` kept; every link works except Privacy and Terms (A13) |
| Facts | every price and claim on the new site comes from the old site, the data files, your Instagram export or the README (`audit/parity.md`); totals are calculated from the data |
| Speed on a mid phone over slow 4G (4× slower CPU) | largest paint in 1.0 s (home) and 1.2 s (order); no layout shift. The old site measured faster only because its Google fonts failed to load in this test |
| Animation | the three moves (a stem landing, re-tie, wrap change) checked frame by frame, and switched off for people who ask for reduced motion |
| No JavaScript; Windows high-contrast mode | home works fully; the order page shows a plain notice with the shop's address instead of dead buttons (`captures/variants/`) |
| Task walkthroughs on old and new (see it first; peonies in October; price to LS8; today?) | old: no / no / no (the "today" question wasn't walked on the old build); new: yes / yes / yes / yes (`CRITIQUE.md`) |

**Critique** (`CRITIQUE.md`): two rounds; five problems found and fixed:
- the picture scrolled away while choosing ribbons;
- a refused stem gave no visible reason;
- one action had two button labels;
- buttons stayed showing but did nothing when the stem data failed to load;
- some tap targets were too small.

It was a self-review made as blind as possible; no independent reviewer was available in this setup.

## 5. What I couldn't do, and why

- **Your photographs** aren't in the repo. Drawings stand in; the home page's season and shop sections are laid out so a photo can replace a drawing.
- **Looking at competitors' and reference sites live** wasn't possible: this environment can't reach most websites. References come from published design-system source (GOV.UK) and memory, and say so (`DESIGN.md`).
- **Testing inside Instagram's own browser, on a real phone, or with a real screen reader**: none available here. Please try the order on your phone from the Instagram bio link, especially "Share". Instagram's browser may not offer the phone's share sheet; the site then shows the picture to press and hold, and a "Copy link" button.
- **Testing against your real order service**: a stand-in was used (`qa/serve.py`), hence the list in section 1.
- **A new logo** was not in scope. The 2017 clip art is no longer shown (its typeface never loaded on anyone's device); the name is set in the handwriting face. A proper mark drawn from your handwriting or the green door would be a good next step.
- **The home → builder animation** (the bouquet morphing into the builder) was planned and left out. The builder draws after it loads its data, so there is nothing to morph into at the moment the page changes.

## 6. Decisions that are yours

1. The staging tests in section 1, then whether to launch.
2. The assumptions in section 2, especially A2, A4, A5, A6 and A13.
3. Whether to add the share event (A14) and collection from the shop (A12).
4. Sending photos (the backdrop and a few bouquets), and the shop's phone number and hours.

## 7. After launch: how we'll know it worked

| Measure | Where to read it | Baseline | When |
| --- | --- | --- | --- |
| Orders finished ÷ order page visits | `order_success` ÷ `order_start` | your current numbers from the same events | weekly for the first month |
| Where people get stuck | `order_error` by field | current numbers, but now fired per part, so compare trends, not raw counts | weekly |
| Calls to swap out-of-season or out-of-stock stems | your phone log | "several" today | after a month; should be zero |
| "Can I see what it'll look like?" messages | your DMs | several a day | after a month |
| Shares | needs the A14 event | none | from when it's added |
| Speed on real phones | Core Web Vitals (Search Console) | — | after 28 days of traffic |

If finished orders drop rather than rise in the first two weeks, compare the `order_error` fields to find the part that's failing. The old order page is still on `main` if you need to roll back.

## 8. Files

- `PRODUCT.md`: what we built.
- `DESIGN.md`: brief, audit, direction and verification record.
- `SYSTEM.md`: how the parts work.
- `CRITIQUE.md`, `CREDITS.md`.
- `discovery/`: notes from your Instagram export and the stem data.
- `qa/`: tests, preview server and probes.
- `audit/` and `captures/`: evidence.

None of these need deploying; the site itself is `index.html`, `order/`, `assets/` and `data/`.

---

## For the skill's maintainer (installed read-only, so not written into the skill)

**Ledger row** (home capture: `captures/ledger/2026-10-01-stemwren-home.jpg`, 720 px wide; builder capture: `captures/ledger/2026-10-01-stemwren-order.jpg`):

| Date | Project | Category / intensity | Display · text faces | Palette (ground · ink · accent) and strategy | Hero form and signature devices | User's verdicts |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-01 | Stem & Wren florist — blind test on a fixture (capture: `references/ledger/2026-10-01-stemwren-home.jpg`) | signature configurator (bouquet builder) + checkout chapters + marketing home / rethink | Familjen Grotesk 400–700 for all set text · Kalam (handwriting) only for the wordmark, stem tags, size label and card | textured sage linen #8ea283 from the owner's described photo backdrop · ink #18261d · door green #1e3a2b action; kraft #c9a77c tags; flowers as the only accents; Committed | the customer's own illustrated bouquet lying large across the linen, passing under the copy (no panel); a flat-lay row of single stems with handwritten kraft tags; five-chapter builder with the bouquet always in view; share picture | none (test) |

**Proposed lessons** (root cause → cheapest place to change the skill):

1. **Visually hidden text widened the page twice, from inside sideways scrollers.** `.visually-hidden` legends and link prefixes are `position: absolute`; with no positioned ancestor inside the scroller, they sit at their static position far to the right and grow the document.
   → `implementation.md` "Engineering discipline": every horizontal scroller is `position: relative`. Mechanical part: `capture.mjs` and `audit.mjs` already say "layout viewport widened"; have them name the widening element even when it is clipped to 1 px.
2. **An absolutely positioned element keeps its `grid-area` when its containing block is a grid container.** The area resolves to an implicit zero-size one, and the hero art vanished.
   → A trap in `visual-qa.md` "Rendering traps": reset `grid-area: auto` when a grid child becomes absolutely positioned.
3. **Re-appending a DOM node to keep draw order cancels its CSS transition.** Keyed SVG stems jumped instead of gliding; `motion.mjs --spec` caught it.
   → `interactive.md` §5: in a keyed view, update existing nodes in place and insert new ones in order; never move a node you want to animate.
4. **A refusal announced only to screen readers is a dead tap for everyone else.** Found by the `states.mjs --aria --each` walkthrough.
   → `interactive.md` §6.3 "explain": every refusal is visible where the finger is, and announced.
5. **The direction's own first "breaks if" was violated by scrolling, not by layout.** The bouquet left the screen while choosing ribbons. Captures at rest could not show it; a state scrolled to the chapter's last control did.
   → `visual-qa.md` key-screen review: for each "breaks if" about what stays in view, capture the state scrolled to each step's last control.
6. **`--kind configurator` audits a phone consumer configurator against desk-app density**, contradicting `categories.md` "Mobile-first consumer".
   → Add a `--kind mobile` (or `consumer`) profile to `audit.mjs`, and have `framing.md` §1 say which kind the chrome of a phone-first signature route should run.

Script defects, unclear or contradictory guidance, what helped, and timings are in `EVAL-NOTES.md`.
