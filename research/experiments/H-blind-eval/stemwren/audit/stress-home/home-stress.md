## http://127.0.0.1:4811/

1 mutations at 390, 768, 1280 px in 22 s. Sheet: `audit/stress-home/home-stress-sheet.jpg`.

| mutation | width | applied | new ✗ | new △ |
| --- | --- | --- | --- | --- |
| pseudo | 390 | 74 text(s) changed | 2 | 0 |
| pseudo | 768 | 74 text(s) changed | 1 | 1 |
| pseudo | 1280 | 74 text(s) changed | 0 | 0 |

**What breaks what** (element × mutation; details below):

| element | pseudo |
| --- | --- |
| `header.site-header.linen > a.btn.header-cta` | ✗ overflow |
| `(page)` | ✗ zoom-out |
| `#site-nav` | ✗ overflow |
| `#site-nav > ul > li:nth-of-type(1) > a` | △ label-wrap |

**pseudo @ 390px** (`audit/stress-home/home/pseudo-390.jpg`)
- ✗ overflow: `header.site-header.linen > a.btn.header-cta` — page 122px wider than the viewport: header.site-header.linen > a.btn.header-cta
- ✗ zoom-out: `(page)` — layout viewport 512px at a 390px screen — phones show the page zoomed out

**pseudo @ 768px** (`audit/stress-home/home/pseudo-768.jpg`)
- ✗ overflow: `#site-nav` — page 337px wider than the viewport: #site-nav, header.site-header.linen > a.btn.header-cta
- △ label-wrap: `#site-nav > ul > li:nth-of-type(1) > a` ×2 — navigation item "[Îñ šéášöñvérwáltüñ]" now wraps (2 lines)

1:1 crops: `audit/stress-home/home/crops/01-pseudo-390-overflow.png`, `audit/stress-home/home/crops/02-pseudo-768-overflow.png`
