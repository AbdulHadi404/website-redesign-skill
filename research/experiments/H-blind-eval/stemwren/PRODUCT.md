# Stem & Wren — product definition

Written 2026-10-01 in Phase 0 from `discovery/` (`brand-audit.md`, `domain.md`). The source of truth for what is built: if a decision stops matching how the shop works, change it here first. `PRODUCT.md` (what we build) → `DESIGN.md` brief (how each route is classified and judged) → the CSS tokens in `assets/site.css` (how components carry it out).

## What we are building

A bouquet builder people enjoy: a customer picks stems one at a time and watches *their* bouquet come together, wrapped in the shop's own wraps, with the price always in view, then sends it to the shop's existing order service (`POST /api/order`). The customer side is this website. The operator side — the shop's order service and whatever Wren uses to see orders — exists already and is **out of scope**; the shared record is the order payload, whose shape does not change.

## Who it is for

| Arrival situation | What they know | Path | Target |
| --- | --- | --- | --- |
| Taps "Order" in the Instagram bio on a phone, having just seen a bouquet they love (most orders) | the look, roughly; not the price or what's in season | `/order/` opens on a beautiful in-season bouquet already made; they change it, then send | first stem changed within 10 s; order sent in under 3 minutes |
| Needs flowers today for someone in LS7/LS8 | the occasion and the address | `/order/` → keep the starter or tweak → postcode → "Today" offered if true | knows whether today is possible before typing any personal detail |
| Wants something specific (peonies, "the peach one") | a flower's name or a post | the tray shows every stem; unavailable ones say when they're back | never orders a stem the shop can't get |
| Arrives at the home page from Google or a printed card | the shop's name | home → what's in season now → "Make your bouquet" | reaches `/order/` in one tap |
| Was sent a link to someone else's bouquet | the bouquet | `/order/?b=…` opens that bouquet (without anyone's card message) | can order the same, or change it |

## Principles (settle arguments with these)

1. Never offer a stem the shop can't get on the delivery date; say when it's back instead.
2. Never show a price the shop hasn't set; the figure on the site is the data's figure and the shop's service has the last word (README).
3. The size is what the stem count says; nobody chooses a size.
4. The order service's payload, values and analytics events keep their shape; the interface changes instead.
5. A customer's words (the card message, names, addresses) never go into a URL or analytics.
6. The picture is an illustration and says so; the real bouquet is tied by hand.

## Information architecture

| Route | Purpose |
| --- | --- |
| `/` | The shop: what it is, where it is, what's in season this month, the door to the builder |
| `/order/` | The builder (signature) and the order (checkout), one route, chapters inside it; the Instagram bio and printed cards link here |
| `/order/?b=<code>` | A shared or restored bouquet (stems, wrap, ribbon only) |

Not made a page: a catalogue of fixed bouquets (the shop sells build-your-own only today), an "Occasions" page (occasions are starters, not navigation), a separate checkout route (the contract has one submit, and `/order/` must keep working).

**Taxonomy:** stable — the shop, the builder. Filters — none needed at 12 stems. Tags — seasons (shown, never navigation).

## The configurable thing

- **Model:** `assets/bouquet-model.js`, one pure module used by the builder and by the tests in `qa/`: flowers, colours, counts (total 5–25), size derived, wraps, ribbons, delivery zone from postcode, same-day rule in UK time, season by delivery month, stock, price, URL encoding (stems, wrap, ribbon only), and the payload builder that produces exactly the old keys in the old order.
- **Flow (chapters, named after the customer's decisions):** 1 **Flowers** (the builder) · 2 **Wrap & card** · 3 **Delivery** (postcode first, then day) · 4 **You & them** (recipient, sender) · 5 **Check & send** (in-page review restating stems, wrap, card, where, when and the total; the total on the button). Going back never loses a choice; the picture stays in view on phones in every chapter.
- **Preview:** an illustrated flat lay seen from above on sage linen, like her photographs; flowers in their chosen colours, arranged by kind, wrapped in the chosen wrap and ribbon. Labelled "An illustration — every bouquet is tied by hand, so yours will be its own."
- **Estimate:** Σ stems + wrap + ribbon (+ zone delivery once the postcode is known). Shown from the first second. Refuses a delivery figure until a postcode matches a zone; says "We don't deliver to <district> yet" when none does.
- **Starting from an example:** opens on an in-season starter drawn from her posts (post 1's peach garden roses, white lisianthus and eucalyptus in kraft and twine; stem counts ours, labelled "inspired by"). Every part is editable. Other starters appear only when in season for the delivery date.

## Lifecycle (shared by customer and operator)

Out of scope: the shop's service owns it. The site knows two states — *sent* (the service answered with an order number) and *not sent* (validation or network failure, nothing lost).

| Lifecycle status | Meaning | Who acts next | Customer sees |
| --- | --- | --- | --- |
| Draft | in the builder, saved on this phone (stems, wrap, ribbon, card in local storage) | customer | their bouquet when they come back |
| Sent | service returned `SW-xxxxx` | the shop | order number, the service's total, a summary |

## The operator side

Not built. Recommendation for later: if Wren tracks orders on her phone, the order email or service view should show the same stems in the same words as the builder.

## V1 and later

**V1:** builder, chapters, live price, season and stock rules, same-day logic, share link, saved draft, home page rebuilt around the builder.
**Later (needs Wren):** her photographs on the home page; collection from the shop (needs a contract field); privacy and terms pages; an analytics event for sharing; a refined mark.

## Open questions only the owner can answer

Listed with their working assumptions at the top of `REPORT.md` (A1–A14).
