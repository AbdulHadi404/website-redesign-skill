# Performance (lab)

http://127.0.0.1:4820 against http://127.0.0.1:4821 · phone, CPU ×4, slow4g, cache off, median of 3 · load average 0.92 → 0.95 on 4 CPUs · 2026-10-01T19:26

Lab numbers from emulated throttling on a local server: they rank builds and catch regressions; they do not predict field data. LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms are the "good" thresholds.

The new build (http://127.0.0.1:4820) sent text (HTML, CSS, JS, SVG, JSON) uncompressed: up to 80 KB a page, 25 KB gzipped (/fees/). Transfer below is as served; the transfer-growth check compares gzip-equivalent sizes, since a production host compresses text.

| Page | LCP (range) | LCP element | FCP | CLS | TBT | Transfer (html / css / js / font / img) | Requests | DOM nodes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 796 ms (792–844) | `h1#hero-title` | 792 ms | 0.001 | 0 ms | 178 KB (11 KB / 31 KB / 20 KB / 96 KB / 18 KB) | 11 | 222 |
| /fees/ | 816 ms (804–864) | `p.lead` | 816 ms | 0.001 | 0 ms | 178 KB (12 KB / 31 KB / 20 KB / 96 KB / 18 KB) | 10 | 259 |
| /contact/ | 752 ms (728–756) | `p.lead` | 752 ms | 0.000 | 0 ms | 164 KB (10 KB / 31 KB / 9 KB / 96 KB / 18 KB) | 8 | 184 |

## Against the baseline

| Page | LCP | CLS | TBT | Transfer |
| --- | --- | --- | --- | --- |
| / | 448 → 796 ms | 0.000 → 0.001 | 0 → 0 ms | 6 KB → 178 KB |
| /fees/ | 428 → 816 ms | 0.000 → 0.001 | 0 → 0 ms | 5 KB → 178 KB |
| /contact/ | 432 → 752 ms | 0.000 → 0.000 | 0 → 0 ms | 7 KB → 164 KB |

## Flags

- ⚠ /: slower than the baseline (LCP 448 → 796 ms) — within budget is not enough when the old build was faster
- ⚠ /fees/: slower than the baseline (LCP 428 → 816 ms) — within budget is not enough when the old build was faster
- ⚠ /contact/: slower than the baseline (LCP 432 → 752 ms) — within budget is not enough when the old build was faster
- ◇ /: transfer 6 KB → 178 KB as served, 3 KB → 123 KB gzip-equivalent (+120 KB, about 0.6 s more on slow 4G: font +96 KB, js +8 KB, css +7 KB, img +6 KB) — what does it buy? Are the fonts self-hosted, woff2, subset and only the weights used; is every script needed on this page; are images sized to their box? Growth can be right; answer it in the report
- ◇ /fees/: transfer 5 KB → 178 KB as served, 3 KB → 123 KB gzip-equivalent (+120 KB, about 0.6 s more on slow 4G: font +96 KB, js +8 KB, css +7 KB, img +6 KB) — what does it buy? Are the fonts self-hosted, woff2, subset and only the weights used; is every script needed on this page; are images sized to their box? Growth can be right; answer it in the report
- ◇ /contact/: transfer 7 KB → 164 KB as served, 4 KB → 117 KB gzip-equivalent (+113 KB, about 0.6 s more on slow 4G: font +96 KB, css +7 KB, img +6 KB) — what does it buy? Are the fonts self-hosted, woff2, subset and only the weights used; is every script needed on this page; are images sized to their box? Growth can be right; answer it in the report
