perf — phone, CPU ×4, slow4g, cache off, median of 3
load average 0.92 on 4 CPUs (start)

before: http://127.0.0.1:4821
✓ /  LCP 448 ms (p)  CLS 0.000  TBT 0 ms  6 KB (3 KB gzipped)
✓ /fees/  LCP 428 ms (footer)  CLS 0.000  TBT 0 ms  5 KB (3 KB gzipped)
✓ /contact/  LCP 432 ms (footer)  CLS 0.000  TBT 0 ms  7 KB (4 KB gzipped)

after: http://127.0.0.1:4820
✓ /  LCP 796 ms (h1#hero-title)  CLS 0.001  TBT 0 ms  178 KB (123 KB gzipped)
✓ /fees/  LCP 816 ms (p.lead)  CLS 0.001  TBT 0 ms  178 KB (123 KB gzipped)
✓ /contact/  LCP 752 ms (p.lead)  CLS 0.000  TBT 0 ms  164 KB (117 KB gzipped)

load average 0.95 on 4 CPUs (end)
3 flag(s), 3 note(s) to answer in the report (◇) · perf.md
