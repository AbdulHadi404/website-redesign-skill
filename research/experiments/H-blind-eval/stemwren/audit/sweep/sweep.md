# Width sweep

## http://127.0.0.1:4811/

147 widths in 21.8 s (149 ms per width, 2 page loads).

No problem ranges found. The layout checks are leads, not a verdict: look at the breakpoints below.

**Breakpoints** (4) — capture both widths of each and compare:
- 376 → 384 (phone): header.site-header.linen: 2 → 3 per row (3 items)
- 752 → 760 (phone): footer.site-footer > div.wrap-w.footer-grid: 1 → 2 per row (2 items)
- 896 → 904: #occasions > div.wrap-w.card-band-grid: 1 → 2 per row (2 items); #delivery > div.wrap-w.delivery-grid: 1 → 2 per row (2 items); #about > div.wrap-w.shop-grid: 1 → 2 per row (2 items)
- 1088 → 1104: #season-row: 12 → 6 per row (12 items)

## http://127.0.0.1:4811/order/

147 widths in 32.1 s (218 ms per width, 2 page loads). Sheet: `audit/sweep/order-sheet.jpg`.

| | check | widths | element | at the first width |
| --- | --- | --- | --- | --- |
| △ | order | 1024–1920 | `#order` | children drawn in order 1,3,2 — DOM order differs (reading and focus order) |

**Breakpoints** (3) — capture both widths of each and compare:
- 352 → 360 (phone): #actionbar: 1 → 2 per row (2 items)
- 760 → 768: div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(1) > fieldset.swatches: 2 → 4 per row (4 items); div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(2) > fieldset.swatches: 2 → 4 per row (4 items); div.tray-group:nth-of-type(1) > ul.tray-list > li.stem-card:nth-of-type(6) > fieldset.swatches: 2 → 4 per row (4 items)
- 1016 → 1024: #tray: 3 → 1 per row (3 items); #tray > div.tray-group:nth-of-type(1) > ul.tray-list: 6 → 4 per row (6 items); #tray > div.tray-group:nth-of-type(2) > ul.tray-list: 4 → 3 per row (4 items); document height 1361 → 1932px

1:1 crops of the worst findings: `audit/sweep/order-crops/01-order-1024.png`
