# Domain — what a bouquet order is made of

Written 2026-10-01. Sources: `README.md` (owner's rules), `data/*.json`, `social/posts.md`, and general knowledge of hand-tied floristry (marked *general*). Only what changed a decision is recorded.

## The configuration variables and their dependencies

| Variable | Options (source) | Depends on | Need or taste | Decision |
| --- | --- | --- | --- | --- |
| Stems: flower × colour × count | 12 flowers, 1–4 colours each (`flowers.json`) | delivery month (season), today's stock | taste | Chosen by tapping stems, one at a time, as in post 9; colour picked per stem type from the data's list, never typed (old free-text colour let people ask for colours that don't exist) |
| Total stems | 5–25 (owner) | stems | — | Enforced live; the add control stops at 25 and the send control explains below 5 |
| Size | Petite 5–9, Classic 10–17, Grand 18–25 (owner) | total stems only | — | **Derived, never asked** ("the size is what the stem count says"); shown as a label that changes as stems are added; sent as `Petite`/`Classic`/`Grand` exactly as the old `<option>` values |
| Wrap | 4 (`wraps.json`), £0–£9 | — | taste | Pictures of each wrap on *their* bouquet |
| Ribbon | 4, £0–£2 | — | taste | Same |
| Card message | free text | — | need (her words) | Kept out of the URL and of analytics (`interactive.md` §6.7) |
| Delivery postcode | zones A/B/C by district (`delivery.json`) | — | need | Asked first in the delivery chapter: it decides price and whether today is possible |
| Delivery date | any date | zone (same-day only A), time of day (before 13:00), **season of every chosen stem** | need | Asked after the postcode; days that would make a chosen stem unavailable say so |
| Recipient name, address; sender name, email, phone | free text | — | need | Labels above fields, `autocomplete`, right keyboards |

**Dependency order for disclosure** (follows the graph, not taste): stems → (size derived) → wrap & ribbon → card → postcode → date → recipient → sender → review.

## Customer words vs trade words

Customers say "how big", "what it'll look like", "the peach one", "for Mum". The trade (and the data) says focal / filler / foliage, "kind", stems. Decision: the tray groups stems as **Flowers**, **Little flowers** and **Greenery** (customer words) for the data's `focal`, `filler`, `foliage`; size names stay Petite / Classic / Grand (the shop's own words, already in the contract).

## Pricing mechanics

Price = Σ(stem price × count) + wrap + ribbon + delivery zone price (`order.js` on the old site, matching the README). The shop's order service recalculates; the site's figure is for the customer (README). Decision: the running total is always on screen; delivery shows "from £4.95" until a postcode is known, then the zone price; the total on the review step and the Send button includes everything. Copy says the shop confirms the final price, because it does.

## Capacity and time

Same-day only if ordered before 13:00 (UK time, not the phone's) and the district is in zone A. Nothing is said about lead times for zones B and C, closures or Sundays: *assumption A6* — next day onward, every day. Decision: compute "now" in `Europe/London`; offer "Today" only when it is true; dates as a row of day chips for the next two weeks plus a native date field for later.

## Seasonality and stock

`season` is a list of months; `stock` is a boolean exported each morning. Sweet pea is out of stock (and out of season in October). In October 2026: available are garden rose, rose, dahlia, lisianthus, chrysanthemum, eucalyptus, pittosporum, gypsophila; not available: peony (May–June), ranunculus (Jan–May), tulip (Jan–Apr), sweet pea (no stock; May–July). Dahlias and garden roses and lisianthus end with October.

Decision (*assumption A4*): season is judged by the **delivery date's month**. Before a date is chosen, the earliest possible delivery date is assumed. Unavailable stems stay in the tray, visibly resting, with the reason and when they return ("Back in May"), because people look for peonies (post 6 is the second-most-liked). If a later date choice would make a chosen stem unavailable, the date chip says so before it is chosen, and choosing it asks to swap or remove those stems — never silently.

## Physical constraints (general)

A hand-tied bouquet is a spiral of stems bound at one point; heads form a loose dome, foliage frames it. A single bouquet with 25 stems is a big armful; with 5 it is a posy. Decision: the illustration arranges stems by kind (foliage outermost, focal in the centre, fillers in the gaps), scales the arrangement with the count, and is labelled as an illustration: "every bouquet is tied by hand, so yours will be its own".
