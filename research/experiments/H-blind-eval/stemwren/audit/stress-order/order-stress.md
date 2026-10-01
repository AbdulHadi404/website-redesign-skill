## http://127.0.0.1:4811/order/

8 mutations at 390, 768, 1280 px in 147 s. Sheet: `audit/stress-order/order-stress-sheet.jpg`. Loading filmstrip: `audit/stress-order/order-slow.jpg`.

| mutation | width | applied | new ✗ | new △ |
| --- | --- | --- | --- | --- |
| pseudo | 390 | 249 text(s) changed | 3 | 0 |
| numbers | 390 | 57 text(s) changed | 0 | 0 |
| no-images | 390 | 2 image request(s) blocked | 0 | 0 |
| rtl | 390 | dir=rtl lang=ar; 173 element(s) checked for mirroring; 249 text(s) in Arabic | 1 | 4 |
| list-0 | 390 | fieldset.swatches: 4 → 0 label; fieldset.swatches: 4 → 0 label; fieldset.swatches: 4 → 0 label; ul#lines.lines: 3 → 0 li | 0 | 0 |
| slow | 390 | 5 frames; CLS 0.093; load event at 2.5 s; loading indicators seen: p.loading | 0 | 1 |
| errors | 390 | 3 data request(s) answered 500 | 0 | 0 |
| offline | 390 | 3 data request(s) aborted | 0 | 0 |
| pseudo | 768 | 249 text(s) changed | 3 | 0 |
| numbers | 768 | 57 text(s) changed | 0 | 0 |
| no-images | 768 | 2 image request(s) blocked | 0 | 0 |
| rtl | 768 | dir=rtl lang=ar; 150 element(s) checked for mirroring; 249 text(s) in Arabic | 1 | 4 |
| list-0 | 768 | fieldset.swatches: 4 → 0 label; fieldset.swatches: 4 → 0 label; fieldset.swatches: 4 → 0 label; ul#lines.lines: 3 → 0 li | 0 | 0 |
| pseudo | 1280 | 249 text(s) changed | 6 | 0 |
| numbers | 1280 | 57 text(s) changed | 1 | 0 |
| no-images | 1280 | 2 image request(s) blocked | 0 | 0 |
| rtl | 1280 | dir=rtl lang=ar; 150 element(s) checked for mirroring; 249 text(s) in Arabic | 1 | 4 |
| list-0 | 1280 | fieldset.swatches: 4 → 0 label; fieldset.swatches: 4 → 0 label; fieldset.swatches: 4 → 0 label; ul#lines.lines: 3 → 0 li | 0 | 0 |

**What breaks what** (element × mutation; details below):

| element | pseudo | numbers | rtl | slow |
| --- | --- | --- | --- | --- |
| `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag` | ✗ protrusion, ✗ overlap |  | ✗ protrusion |  |
| `div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add` | ✗ overlap |  |  |  |
| `#lines > li.line:nth-of-type(3) > span.line-name` | ✗ overlap |  |  |  |
| `a.skip-link` |  |  | △ not-mirrored |  |
| `#stage-size` |  |  | △ not-mirrored |  |
| `#stage-tools` |  |  | △ not-mirrored |  |
| `ul.tray-list > li.stem-card.is-in > button.stem-add > span.stem-count` |  |  | △ not-mirrored |  |
| `#sc-lisianthus` | ✗ protrusion |  |  |  |
| `#chapter-list > li:nth-of-type(4) > a` | ✗ nav-overflow |  |  |  |
| `… > span.tag` | ✗ overflow |  |  |  |
| `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.stem-price` |  | ✗ protrusion |  |  |
| `p#status.visually-hidden` |  |  |  | △ late-shift |

**pseudo @ 390px** (`audit/stress-order/order/pseudo-390.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag` ×11 — "[Gárdéñvérwáltüñ röšé]" runs 76px out of the right of its own box
- ✗ overlap: `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag` ×2 — text over text: "[Gárdéñvérwáltüñ röšé]" / ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add > span.tag "[Röšévérw]"
- ✗ overlap: `#lines > li.line:nth-of-type(3) > span.line-name` — text over text: "[3 šílvér döllár éüçálýp" / #lines > li.line:nth-of-type(3) > span.line-price "£4.20"

**rtl @ 390px** (`audit/stress-order/order/rtl-390.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add > span.tag` — "تسجيل الدخول" runs 18px out of the left of its own box
- △ not-mirrored: `a.skip-link` — positioned element stays 8px from the left and 200px from the right in RTL (left/right)
- △ not-mirrored: `#stage-size` — positioned element stays 16px from the left and 188px from the right in RTL (left/right)
- △ not-mirrored: `#stage-tools` — positioned element stays 194px from the left and 16px from the right in RTL (left/right)
- △ not-mirrored: `ul.tray-list > li.stem-card.is-in > button.stem-add > span.stem-count` ×3 — positioned element stays 65px from the left and 3px from the right in RTL (left/right)

**list-0 @ 390px**
- · empty-list: `fieldset.swatches` ×3 — emptied (4 → 0 label): look at the capture — is there an empty state, or just a heading over nothing?
- · empty-list: `ul#lines.lines` — emptied (3 → 0 li): look at the capture — is there an empty state, or just a heading over nothing?

**slow @ 390px**
- △ late-shift: `p#status.visually-hidden` — moved down 483px after it first showed at 1.9 s; above it form#order.panel 486 → 968px — reserve the space (a skeleton of the final height, image dimensions)

**errors @ 390px**
- · content-lost: `form#order.panel` — 1559 → 262 characters of text; the page says "…. Check your connection, then try again. In your bouquet Start again…"

**offline @ 390px**
- · content-lost: `form#order.panel` — 1559 → 262 characters of text; the page says "…. Check your connection, then try again. In your bouquet Start again…"

**pseudo @ 768px** (`audit/stress-order/order/pseudo-768.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag` ×11 — "[Gárdéñvérwáltüñ röšé]" runs 76px out of the right of its own box
- ✗ overlap: `ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add > span.tag` ×2 — text over text: "[Röšévérw]" / ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag "[Gárdéñvérwáltüñ röšé]"
- ✗ overlap: `div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add` ×2 — control over text: ",,,,,,,,,,, [Áddvérwá á]" / ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag "[Gárdéñvérwáltüñ röšé]"

**rtl @ 768px** (`audit/stress-order/order/rtl-768.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add > span.tag` — "تسجيل الدخول" runs 18px out of the left of its own box
- △ not-mirrored: `a.skip-link` — positioned element stays 8px from the left and 578px from the right in RTL (left/right)
- △ not-mirrored: `#stage-size` — positioned element stays 24px from the left and 558px from the right in RTL (left/right)
- △ not-mirrored: `#stage-tools` — positioned element stays 564px from the left and 24px from the right in RTL (left/right)
- △ not-mirrored: `ul.tray-list > li.stem-card.is-in > button.stem-add > span.stem-count` ×3 — positioned element stays 65px from the left and 3px from the right in RTL (left/right)

**list-0 @ 768px**
- · empty-list: `fieldset.swatches` ×3 — emptied (4 → 0 label): look at the capture — is there an empty state, or just a heading over nothing?
- · empty-list: `ul#lines.lines` — emptied (3 → 0 li): look at the capture — is there an empty state, or just a heading over nothing?

**pseudo @ 1280px** (`audit/stress-order/order/pseudo-1280.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag` ×10 — "[Gárdéñvérwáltüñ röšé]" runs 72px out of the right of its own box
- ✗ protrusion: `#sc-lisianthus` — "[Ûñtíl Öçtöbérvérwáltüñgs]" runs 9px out of the left of #tray > div.tray-group:nth-of-type(2)
- ✗ overlap: `ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add > span.tag` ×6 — text over text: "[Röšévérw]" / ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag "[Gárdéñvérwáltüñ röšé]"
- ✗ overlap: `div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add` — control over text: ",,,,,,,,,,, [Áddvérwá á]" / ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.tag "[Gárdéñvérwáltüñ röšé]"
- ✗ nav-overflow: `#chapter-list > li:nth-of-type(4) > a` — 2 nav item(s) past the viewport edge ("[Ýöü & thémvérwáltüñ")
- ✗ overflow: `… > span.tag` — page 39px wider than the viewport: … > span.tag

**numbers @ 1280px** (`audit/stress-order/order/numbers-1280.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(1) > button.stem-add > span.stem-price` ×2 — "£1,234,567,890.99 a stem" runs 3px out of the left of #tray > div.tray-group:nth-of-type(2)

**rtl @ 1280px** (`audit/stress-order/order/rtl-1280.jpg`)
- ✗ protrusion: `ul.tray-list > li.stem-card:nth-of-type(2) > button.stem-add > span.tag` — "تسجيل الدخول" runs 14px out of the left of its own box
- △ not-mirrored: `a.skip-link` — positioned element stays 8px from the left and 1090px from the right in RTL (left/right)
- △ not-mirrored: `#stage-size` — positioned element stays 23px from the left and 519px from the right in RTL (left/right)
- △ not-mirrored: `#stage-tools` — positioned element stays 556px from the left and 24px from the right in RTL (left/right)
- △ not-mirrored: `ul.tray-list > li.stem-card.is-in > button.stem-add > span.stem-count` ×3 — positioned element stays 69px from the left and 3px from the right in RTL (left/right)

**list-0 @ 1280px**
- · empty-list: `fieldset.swatches` ×3 — emptied (4 → 0 label): look at the capture — is there an empty state, or just a heading over nothing?
- · empty-list: `ul#lines.lines` — emptied (3 → 0 li): look at the capture — is there an empty state, or just a heading over nothing?

1:1 crops: `audit/stress-order/order/crops/01-pseudo-390-protrusion.png`, `audit/stress-order/order/crops/02-pseudo-390-overlap.png`, `audit/stress-order/order/crops/03-rtl-390-protrusion.png`, `audit/stress-order/order/crops/04-pseudo-768-protrusion.png`, `audit/stress-order/order/crops/05-pseudo-768-overlap.png`, `audit/stress-order/order/crops/06-rtl-768-protrusion.png`, `audit/stress-order/order/crops/07-pseudo-1280-protrusion.png`, `audit/stress-order/order/crops/08-pseudo-1280-protrusion.png`, `audit/stress-order/order/crops/09-numbers-1280-protrusion.png`, `audit/stress-order/order/crops/10-rtl-1280-protrusion.png`
