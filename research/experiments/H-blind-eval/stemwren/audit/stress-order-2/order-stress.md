## http://127.0.0.1:4811/order/

2 mutations at 390, 768, 1280 px in 64 s. Sheet: `audit/stress-order-2/order-stress-sheet.jpg`.

| mutation | width | applied | new ✗ | new △ |
| --- | --- | --- | --- | --- |
| pseudo | 390 | 249 text(s) changed | 1 | 0 |
| numbers | 390 | 57 text(s) changed | 0 | 0 |
| pseudo | 768 | 249 text(s) changed | 0 | 0 |
| numbers | 768 | 57 text(s) changed | 0 | 0 |
| pseudo | 1280 | 249 text(s) changed | 1 | 0 |
| numbers | 1280 | 57 text(s) changed | 0 | 0 |

**What breaks what** (element × mutation; details below):

| element | pseudo |
| --- | --- |
| `#lines > li.line:nth-of-type(3) > span.line-name` | ✗ overlap |
| `#chapter-list > li:nth-of-type(4) > a` | ✗ nav-overflow |

**pseudo @ 390px** (`audit/stress-order-2/order/pseudo-390.jpg`)
- ✗ overlap: `#lines > li.line:nth-of-type(3) > span.line-name` — text over text: "[3 šílvér döllár éüçálýp" / #lines > li.line:nth-of-type(3) > span.line-price "£4.20"

**pseudo @ 1280px** (`audit/stress-order-2/order/pseudo-1280.jpg`)
- ✗ nav-overflow: `#chapter-list > li:nth-of-type(4) > a` — 2 nav item(s) past the viewport edge ("[Ýöü & thémvérwáltüñ")

1:1 crops: `audit/stress-order-2/order/crops/01-pseudo-390-overlap.png`, `audit/stress-order-2/order/crops/02-pseudo-1280-nav-overflow.png`
