# Performance (lab)

http://localhost:5843 against http://localhost:5841 · phone, CPU ×4, slow4g, cache off, median of 3 · 2026-09-28T19:50

Lab numbers from emulated throttling on a local server: they rank builds and catch regressions; they do not predict field data. LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms are the "good" thresholds.

| Page | LCP (range) | LCP element | FCP | CLS | TBT | Transfer (html / css / js / font / img) | Requests | DOM nodes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 652 ms (648–660) | `p.lead` | 652 ms | 0.000 | 0 ms | 66 KB (3 KB / 14 KB / 21 KB / 25 KB / 1 KB) | 8 | 80 |
| /apply/ | 704 ms (696–724) | `p#street-hint` | 640 ms | 0.000 | 0 ms | 74 KB (11 KB / 14 KB / 21 KB / 25 KB / 1 KB) | 8 | 176 |

## Against the baseline

| Page | LCP | CLS | TBT | Transfer |
| --- | --- | --- | --- | --- |
| / | 632 → 652 ms | 0.000 → 0.000 | 0 → 0 ms | 7 KB → 66 KB |
| /apply/ | 720 → 704 ms | 0.000 → 0.000 | 0 → 0 ms | 9 KB → 74 KB |

## Flags

- ✓ none
