## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/` home | ecommerce — browse and trust | occasional (a few visits across one renovation project) | lost money (a wrong-looking wall; a few hundred pounds) | expressive (persuade) | **redesign** |
| `/collection/` | ecommerce — product list | occasional, task-driven | lost time | persuasive, list-productive | **redesign** (IA and filters kept) |
| `/product/?id=…` | ecommerce — product page | occasional, task-driven | lost money (wrong size, wrong quantity) | persuasive → productive at the buy box | **redesign** + refine of the buy box (radio groups, quantity, feedback) |
| `/cart/` | ecommerce — basket | once per order | lost money (surprise costs) | productive | **rethink** of the page's job (show the full cost, edit lines) |
| `/checkout/` | ecommerce — checkout | once per order | lost money; personal data | productive | **rethink** of the flow (guest first, delivery cost before paying); field names, POST and events kept |

The owners asked for two things: "make it feel like us" (a redesign of the expressive routes) and "make buying easier" (a rethink of cart and checkout, backed by their own numbers). The audit agrees with both and adds one thing they did not ask for: the product page gives no feedback when you add to basket and has keyboard-unreachable size and finish controls.

**Audience and context.** People doing up a kitchen splashback, bathroom, hallway or fireplace in the UK (and some in Ireland, France and Germany — the checkout's country list). They browse on a phone in the evening, often more than once, often with a partner or tiler, and buy on whichever device is to hand. They buy by the tile but think in square metres; they worry about how many to order, what delivery costs, breakage and how long it takes. **Assumption:** device split and audience are inferred from the category and the repo; there is no analytics export in the repo.

**Top tasks** (ranked):
1. **Find out what an order will really cost, delivery included** — evidence: README, "the most common support email is 'how much is delivery?'"; the old checkout says "Shipping and taxes will be calculated on the next page", and there is no next page.
2. **Pay without being forced to make an account** — evidence: README, "41% of checkouts are abandoned at the account step".
3. **Choose a design, size, finish and the right number of tiles** — evidence: the product data (3 sizes × 2 finishes, price per tile, `lead_time_days`), the quantity field labelled "Quantity (tiles)". The "how many for my wall" part is an **assumption** (no search logs or tickets in the repo).
4. **Browse the designs by pattern and colour** — evidence: the nav (Stars, Lattice) and the collection filters (pattern, colour, sort).
5. **Decide whether to trust a small maker** — evidence: the story and the one customer quote exist on the home page; **assumption** that it matters to conversion.

**Problems** (severity 0–4 × task importance; each traced to the audit below):
1. Delivery cost hidden until after payment is submitted; "next page" promise is false (4 × task 1).
2. Account creation (email + password + confirm) is the first thing checkout asks for, and is required (4 × task 2).
3. Checkout asks for 16 inputs, including date of birth "for our records", title and company; newsletter is pre-ticked (3 × task 2; the pre-tick is also a UK PECR/GDPR consent problem).
4. Size and finish "pills" are `<span>`s: unreachable by keyboard, no selected state for assistive tech (3 × task 3).
5. Adding to basket gives no feedback except a number in the header; the basket cannot change quantities or remove lines (3 × task 3).
6. Nothing on the site looks hand-painted, Portuguese or like Azul & Co.: the founder's mark is not used; Montserrat tracked capitals and a beige gradient (2 × identity, the owners' first complaint).
7. No visible focus anywhere (`*:focus { outline: none }`), placeholder-only labels, no `lang`, no `main`, no `h1` on three pages (3 × every task for keyboard and screen-reader users).

**Principles** (each can say no):
1. **The price you see is the price you pay.** Delivery cost sits next to every price and total; nothing is "calculated later". (A reasonable shop defers shipping to checkout — the bought theme does.)
2. **Show the tile laid, not just the tile.** Where a design appears large, it appears as a panel of tiles meeting at the joins, with its real size. (Most tile shops show a single square or a styled room.)
3. **Ask only what the order needs.** No account, date of birth or title to buy; everything optional is marked "(optional)" or one tap away.
4. **The founder's mark is the system.** Cobalt, white and one ochre corner come from the 2022 painted mark; no colour or device is added that the mark does not suggest.
5. **Checkout is plain.** Brand lives in type, colour and words there; controls are native and familiar.

**Non-goals.** No new routes or pages; no new products, sample ordering or accounts area; no change to the order system, Stripe integration, cart storage key or product data shape; no photography (none exists in the repo and photo hosts are blocked — see Imagery); no logo redesign.

**Constraints.**
- Stack: static HTML + one CSS file + one vanilla JS file, served statically (production is "the same templates on a small Node server"). No build, no framework, no component library. No tests, lint or typecheck commands exist.
- Contracts to preserve: `data/products.json` shape; checkout `form#checkout-form[action="/api/checkout"][method=post]` and the field names `email password password_confirm title first_name last_name company address1 address2 city postcode country phone dob newsletter`; the JSON POST body `{...fields, cart}` with `content-type: application/json`; `#stripe-element`; `window.dataLayer` events `add_to_cart {item_id, quantity}` and `purchase_attempt`; `data-track` attributes `add_to_cart`, `begin_checkout`, `purchase`; localStorage key `azul-cart` and its item shape `{id, name, size, finish, qty, price}`; element ids used by the script (`cart-count`, `cart-link`, `featured`, `grid`, `f-pattern`, `f-colour`, `f-sort`, `pdp`, `p-img`, `p-name`, `p-price`, `p-sizes`, `p-finishes`, `p-qty`, `add`, `cart-rows`, `subtotal`, `coupon`, `apply`, `checkout-form`, `pay`, `checkout-msg`); anchor `/#about`; query `?pattern=` and `?id=`.
- Surviving brand assets: `assets/logo.svg` (mark + wordmark), the 12 tile scans. Legal copy: the footer company line.
- Accessibility: WCAG 2.2 AA floor; aim for 2.4.13 and 2.3.3. EU customers → the European Accessibility Act applies to the storefront.
- Performance budget: LCP ≤ 2.5 s on a mid phone; ≤ 120 KB of fonts; no new JS dependencies.
- Language: British English, Latin script only; Portuguese place names keep their accents (Belém, Évora, Óbidos, Nazaré, Inês).

**Success measures** (baselines from the owners where they exist):
- Checkout abandonment at the account step: 41% (2025) → the step no longer exists; measure `begin_checkout` → `purchase_attempt` → order.
- "How much is delivery?" support emails: the most common email (2025) → should fall; count per month.
- Add-to-basket rate on product pages and average order value (the free-delivery threshold is now visible).
- Accessibility: axe 0 violations, `a11y.mjs` 0 FAIL on all five pages (baseline: 5–69 FAIL per page).

