# Azul & Co. — the redesign, what changed, and what we need from you

Everything is on the `redesign` branch, committed. Not pushed or deployed: the branch's remote is a local copy, not your repository.

## In short

- **Buying is easier.** You no longer need an account to check out; it's an optional "Save my details for next time" under the email field. Delivery cost is shown on every page, beside every price and inside every total, and the "calculated on the next page" note (there was no next page) is gone. The checkout shows the full amount, delivery included, on the pay button ("Place order and pay £113.95").
- **It looks like you now.** Your 2022 painted mark sets everything: cobalt, white and one ochre corner. The header uses the mark itself; the "Our story" section is built in its shape (four quarters, one ochre). Headlines are set in an italic serif chosen to match your hand-lettered wordmark. The first thing a visitor sees is one of your designs laid edge to edge as a wall — the pattern appears where four tiles meet.
- **Choosing is easier.** Size and finish are real, keyboard-usable choices; a calculator turns square metres into a tile count; the product page shows the running total and how much it covers; adding to the basket now confirms what was added; the basket lets you change quantities and remove lines.
- **Nothing you rely on changed:** the `data/products.json` shape, every checkout field name, the JSON post to `/api/checkout` (checked: same keys, plus `cart`), the `add_to_cart` and `purchase_attempt` analytics events, the `data-track` hooks, the `azul-cart` basket storage, and every URL.

Before/after first screen at desktop: `captures/compare/home-1440-fold.png`. Checkout on a phone: `captures/compare/checkout-390.png`. Every basket and checkout state with a filled basket: `captures/states/*-after.png` (the same scenarios on the old site: `*-before.png`).

## Before this goes live — five things only you can confirm

1. **Can your order system take an order with an empty password?** Guest checkout depends on it. The form still sends `password` and `password_confirm` (empty unless the customer opts in). The old page refused to submit without a password, so the server may never have received a blank one. **Test this on staging before launch** — it is the one change that could affect payments.
2. **`title` and `dob` are now sent empty** (the form no longer asks for them, but still posts both as hidden empty fields). Neither was ever required, so the order system should already cope; please confirm. (Asking for a date of birth "for our records" is also hard to justify under UK GDPR.)
3. **Free delivery: "over £150" or "£150 and over"?** I assumed strictly over £150 (the cautious reading). If your system gives it at exactly £150, change `>` to `>=` in `deliveryFor()` in `assets/shop.js`.
4. **Delivery facts I inferred from `products.json`:** that £7.95 and £18.00 are flat per-order rates, that the £18 rate covers Ireland, France and Germany, and that `lead_time_days` is shown as "Lead time N days". If EU customers may pay import VAT or duties, tell me and I'll add the line.
5. **Stripe Elements** still mounts into `id="stripe-element"`; its placeholder text changed from the developer note to "Card details". Mount it once on staging to check it sits well in the new field.

## Questions I would have asked you (answered with assumptions for now)

- **Top tasks** (assumed, in order): find out what an order really costs; pay without an account; choose design, size, finish and quantity; browse by pattern and colour; trust a small maker. The first two come from your numbers; the rest are my inference.
- **Does price vary by size?** Your data has one price per design and the basket always charged it, so I show "£6.50 a tile" instead of the old "From £6.50".
- **Samples.** The story says "samples arrive in two working days" and `products.json` has `sample_pack: 4.5`, but there is no way to order samples on the site. I kept the sentence and built nothing new. A sample-pack product is probably the most useful next addition — what does £4.50 cover?
- **Returns and privacy.** The footer's "Delivery & returns" and "Privacy" linked to `#`. "Delivery" now goes to a real delivery section on the home page; I found no returns information anywhere, so I could not write it; "Privacy" still points to `#`. Please send both texts.
- **Your traced wordmark.** `assets/logo.svg` sets "Azul & Co." as live Georgia italic text, not the traced hand-lettering the README describes. I set it in Alegreya italic to match the headlines; send the traced outlines and they will replace it.
- **Photographs.** None were in the repo and photo sites were blocked here; I also would not put stock photos of other makers' tiles on your shop. Workshop photos, Inês painting, and an installed wall (Hannah's splashback in Bath, with permission) would make the biggest difference next.
- **Where the painting happens.** You wrote "we hand-paint … and sell them online from Bristol"; the site says "painted by hand in a small workshop outside Lisbon" and "Handmade in Portugal". I kept the site's wording.
- **Company details** "Company no. 12345678" and "14 Tile Yard, Bristol BS1 4XX" look like placeholders; kept word for word as legal copy. Please confirm.
- **Discount codes.** The code box in this copy rejects every code (it did before, with a pop-up); it now says so on the page, behind a "Have a discount code?" link. I assume the real check is on your server.
- **Newsletter** used to be pre-ticked; it is now unticked (UK PECR/GDPR consent).

## What I removed, and why

- "Best sellers" — the code simply showed the first four products in the file, so the label wasn't true. Replaced by all twelve designs, grouped by pattern.
- The search and wishlist icons — they linked to `#`; neither feature exists. With twelve designs, the pattern and colour filters do the job.
- "Timeless Tiles For Modern Living / Elevate your space…" — generic theme copy.
- The Google Fonts request for Montserrat — it did not load in testing and it sent visitors' IP addresses to Google. The new fonts are self-hosted (92 KB).
- Page titles reading "Azul __T__ Co" (a template placeholder) — every page now has a real title, description and social image (`assets/og-image.png`).

## How it was checked

- **Renders** of every page at 1440, 1280, 1024, 768 and 390 px wide, before and after; after also at 360, 320 and a phone held sideways, with JavaScript off, in high-contrast mode and with reduced motion. I looked at them, not just the code (`captures/`; `captures/compare/` first).
- **31 scripted states** (`audit/states.json`, run on old and new site): empty, filled, long and very large baskets; discount code refused; sold out; added to basket; area calculator; filters with no results; product data failing and slow; checkout errors, EU delivery, placing, success, server error, empty basket; mobile menu open.
- **Measured audit** (`audit/before/`, `audit/after/`). Before, every page failed: invisible keyboard focus, no `lang`, no `main`, no `h1` on three pages, low-contrast text, placeholder-only labels, 5–29 axe-core violations per page. After: one reported failure, a proven fault in the checking script (evidence in `DESIGN.md`, "Verification record").
- **Accessibility script** (`audit/after-a11y/`): from 31–69 failures per page to **0 on all eight page states**, filled basket and checkout included; the one remaining warning is explained.
- **Keyboard contracts** (`audit/widgets/`): all pass — add to basket, area calculator and sold-out messages announced; quantity, remove and discount messages announced; GOV.UK-style error summary (focus moves to it, it links to each field, page title starts "Error:"); "Placing your order…" announced. The mobile menu was checked at phone width by a separate probe (`audit/widgets/menu-probe-390.txt`).
- **Parity with the old site** (`audit/parity.md`): every route, id, form field, `data-*` hook, form action and piece of metadata is still there. The figures it called "unsourced" come from `products.json` or are labelled arithmetic ("about 52 × 52 cm").
- **Links and the checkout contract** (`audit/functional-checks.txt`): every internal link answers; the `#main`, `#about` and `#delivery` anchors exist; the analytics events have the old shape; the post has exactly the old keys (newsletter left out when unticked, as before); no console errors.
- **Speed** (`audit/perf/perf-throttled.txt`, simulated phone: 4× slower CPU and slow 4G, median of three): pages show their main content in 1.1–1.4 s (Google's "good" limit is 2.5 s), with no layout shift. The old site measured 0.6–1.0 s only because its web font never loaded.
- **Not done:** a real screen-reader test (none available here — please spend ten minutes with VoiceOver on an iPhone before launch); Lighthouse and dembrandt (the environment would not run downloaded tools); live competitor sites (blocked — I studied the source of Shopify's Dawn theme and the GOV.UK Design System instead).

## What I'd do next

1. A sample-pack product, once you decide what it contains.
2. Workshop and installed-room photography.
3. A "see as a wall" view on the collection page — it is the least "you" page now.
4. Returns and privacy pages.

## For the skill's maintainer

The skill was installed read-only, so the ledger row and lessons go here rather than into `references/ledger.md` and `references/lessons.md`.

**Ledger row:**
`2026-09-28 | Azul & Co. storefront — blind eval (capture: captures/after/home-1440-after-fold.png) | ecommerce: redesign (home, collection, product) + rethink (basket, checkout) | Alegreya italic (from the italic hand-lettered wordmark) · Alegreya Sans 400/700 | white · ink #15203D · cobalt #1F3F8F from the 2022 mark, ochre #E3B23C as a single-corner accent; Restrained with one cobalt field | statement over a full-bleed wall of the product laid edge to edge (switchable design); the mark's quartered square as the story chapter; delivery cost as identity (header line, every total); GOV.UK-pattern guest checkout | none (test)`

**Lessons** are in `EVAL-NOTES.md`. The top four: the split hero was built and only caught by the blur test at critique, although `web-design.md` warns about it; `audit.mjs` misreads text inside a closed `<details>` and italic-only fonts; no script except `states.mjs` can seed `localStorage`, so basket and checkout states can't be audited; `widgets.mjs` cannot test mobile-only widgets.
