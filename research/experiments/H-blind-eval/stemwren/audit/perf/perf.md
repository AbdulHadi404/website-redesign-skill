# Performance (lab)

http://127.0.0.1:4811 against http://127.0.0.1:4810 · phone, CPU ×4, slow4g, cache off, median of 3 · load average 0.46 → 1.42 on 4 CPUs · 2026-10-01T18:59

Lab numbers from emulated throttling on a local server: they rank builds and catch regressions; they do not predict field data. LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms are the "good" thresholds.

The new build (http://127.0.0.1:4811) sent text (HTML, CSS, JS, SVG, JSON) uncompressed: up to 252 KB a page, 37 KB gzipped (/). The old build (http://127.0.0.1:4810) sent text (HTML, CSS, JS, SVG, JSON) uncompressed: up to 11 KB a page, 4 KB gzipped (/order/). Transfer below is as served; the transfer-growth check compares gzip-equivalent sizes, since a production host compresses text.

| Page | LCP (range) | LCP element | FCP | CLS | TBT | Transfer (html / css / js / font / img) | Requests | DOM nodes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 1000 ms (1000–1008) | `section.hero` | 832 ms | 0.000 | 0 ms | 303 KB (185 KB / 14 KB / 54 KB / 41 KB / 6 KB) | 12 | 1546 |
| /order/ | 1228 ms (1192–1264) | `div#stage-wrap` | 1016 ms | 0.000 | 47 ms | 188 KB (13 KB / 36 KB / 2 KB / 41 KB / 6 KB) | 13 | 4809 |

## Against the baseline

| Page | LCP | CLS | TBT | Transfer |
| --- | --- | --- | --- | --- |
| / (baseline broken) | 768 → 1000 ms | 0.000 → 0.000 | 0 → 0 ms | 8 KB → 303 KB |
| /order/ (baseline broken) | 772 → 1228 ms | 0.000 → 0.000 | 0 → 47 ms | 15 KB → 188 KB |

## Flags

- ⚠ /: slower than the baseline (LCP 768 → 1000 ms), but the old page was measured without files that hold up its largest paint (1 font; see the broken-baseline note), so its LCP here is faster than live. Measure the old page where they load before calling this a regression; until then judge this page against the budget
- ⚠ /order/: slower than the baseline (LCP 772 → 1228 ms), but the old page was measured without files that hold up its largest paint (1 font; see the broken-baseline note), so its LCP here is faster than live. Measure the old page where they load before calling this a regression; until then judge this page against the budget
- ◇ broken baseline on /, /order/: 2 font request(s) failed on the old build. They could not be fetched from this machine (fonts.googleapis.com: net::ERR_CERT_AUTHORITY_INVALID), so the old build was measured without files it downloads in production: its transfer on those pages is lighter than the live site's. On /, /order/ the lost files hold up the largest paint (2 fonts), so its LCP there is faster than the live site's: an LCP comparison on those pages is not a verdict. Judge the new build against the budget as well as the baseline, and say so in the report
- ◇ /: transfer 8 KB → 303 KB as served, 4 KB → 87 KB gzip-equivalent (+83 KB, about 0.4 s more on slow 4G: font +41 KB, js +19 KB, html +13 KB, img +5 KB) — what does it buy? Are the fonts self-hosted, woff2, subset and only the weights used; is every script needed on this page; are images sized to their box? Growth can be right; answer it in the report (part of the gap is what the broken baseline never downloaded)
- ◇ /order/: transfer 15 KB → 188 KB as served, 7 KB → 92 KB gzip-equivalent (+85 KB, about 0.4 s more on slow 4G: font +41 KB, other +28 KB, css +9 KB, img +5 KB) — what does it buy? Are the fonts self-hosted, woff2, subset and only the weights used; is every script needed on this page; are images sized to their box? Growth can be right; answer it in the report (part of the gap is what the broken baseline never downloaded)
