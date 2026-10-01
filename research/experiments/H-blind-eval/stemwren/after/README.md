# Stem & Wren — website

Florist in Chapel Allerton, Leeds (shop + local delivery). Static site; orders go to the shop's order service.

- `/` — home
- `/order/` — the bouquet order form
- `data/flowers.json` — stems, colours, price per stem, season months, stock (exported each morning from the shop's stock sheet; do not edit by hand)
- `data/wraps.json` — wraps and ribbons
- `data/delivery.json` — delivery zones by postcode district, prices, same-day cut-off
- `social/` — the shop's recent Instagram posts (captions and photo descriptions exported by the owner; the photos themselves are on her phone)
- `assets/` — styles, script, logo (`logo.svg`, bought as clip art in 2017)

Contracts:
- `POST /api/order` (JSON) with `size`, `stems` (array of `{ id, colour, count }`), `wrap`, `ribbon`, `card_message`, `delivery_date`, `delivery_postcode`, `recipient_name`, `recipient_address`, `sender_name`, `sender_email`, `sender_phone`. Returns `{ "order": "SW-xxxxx", "total": 0.00 }`. The shop's order service recalculates the price; the site's figure is for the customer.
- Analytics: `window.swTrack(event, props)` with `order_start`, `order_submit`, `order_error` (`{ field }`), `order_success` (`{ order, total }`).
- `/order/` is the link in the Instagram bio and on printed cards; it must keep working.

Rules from the owner:
- A bouquet has 5 to 25 stems. Petite 5–9, Classic 10–17, Grand 18–25; the size is what the stem count says.
- Out-of-season stems cannot be ordered (the wholesaler doesn't have them); out-of-stock ones neither.
- Same-day delivery if ordered before 13:00 and the postcode district is in zone A.

What customers say (messages and calls, last quarter):
- "Can I see what it'll look like before I order?" (most common, several a day)
- "I picked peonies in October and then you rang me to change them."
- "I only found out the price at the very end."
- "The form is so long on my phone."
- "Your Instagram is gorgeous, the website doesn't look like the same shop."

## Redesign (October 2026) — what's where

- `/order/` is now a bouquet builder in five chapters (flowers, wrap & card, delivery, you & them, check & send). It still posts the same JSON to `POST /api/order` and fires the same `swTrack` events. `?b=…&w=…&r=…&t=…` holds a shared bouquet (stems, wrap, ribbon, arrangement — never the card or anyone's details).
- `assets/bouquet-model.js` — the rules (5–25 stems, size from the count, seasons by delivery month, stock, zones, same-day before 13:00 UK time, prices, the payload). `assets/bouquet-art.js` — the drawings. `assets/order.js` — the builder. `assets/home.js` — the home page's live parts.
- The home page's in-season row and hero are re-read from `data/` on every visit; a copy is baked into `index.html` for browsers without JavaScript. Re-bake when the month changes: `node qa/tools/bake-home.mjs`.
- Tests: `node --test qa/model.test.mjs`. Local preview with a stand-in order service (logs every payload to `qa/orders.log`): `python3 qa/serve.py 8000`.
- Design decisions: `PRODUCT.md`, `DESIGN.md`, `SYSTEM.md`; evidence in `audit/`, `captures/`, `CRITIQUE.md`. `qa/`, `audit/`, `captures/`, `discovery/` and the `*.md` documents are not part of the site and need not be deployed.
