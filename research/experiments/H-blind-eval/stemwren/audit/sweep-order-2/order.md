## http://127.0.0.1:4811/order/

147 widths in 32.7 s (223 ms per width, 2 page loads). Sheet: `audit/sweep-order-2/order-sheet.jpg`.

| | check | widths | element | at the first width |
| --- | --- | --- | --- | --- |
| △ | order | 1024–1920 | `#order` | children drawn in order 1,3,2 — DOM order differs (reading and focus order) |

**Breakpoints** (3) — capture both widths of each and compare:
- 352 → 360 (phone): #actionbar: 1 → 2 per row (2 items)
- 760 → 768: div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(1) > fieldset.swatches: 2 → 4 per row (4 items); div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(2) > fieldset.swatches: 2 → 4 per row (4 items); div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(6) > fieldset.swatches: 2 → 4 per row (4 items)
- 1016 → 1024: #tray: 3 → 1 per row (3 items); #tray > div.tray-group:nth-of-type(1) > ul.tray-list: 6 → 4 per row (6 items); #tray > div.tray-group:nth-of-type(2) > ul.tray-list: 4 → 3 per row (4 items); document height 1361 → 1924px

1:1 crops of the worst findings: `audit/sweep-order-2/order-crops/01-order-1024.png`
