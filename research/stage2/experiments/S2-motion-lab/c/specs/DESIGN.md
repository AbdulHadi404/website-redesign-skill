# Ledgerline — DESIGN.md (fixture)

## Motion language — as the plan wrote it

> Subtle, delightful micro-interactions throughout: buttons respond to touch, cards lift gently on hover, the plan
> comparison slides up smoothly, features fade in as you scroll, and the customer count animates up. Everything
> respects reduced motion.

Nothing in that paragraph can be checked: no trigger, element, property, duration or substitute. The table below
is the same intent in the form `scripts/motion.mjs --spec DESIGN.md` reads (tokens are the page's `--dur-*`, else
motion.md §4).

## Motion spec

| id | trigger | on | target | properties | duration | easing | reduced | stagger | interrupt | job |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cta-press | press | #cta | #cta | transform | micro | out | keep | | | feedback |
| cta-hover | hover | #cta | #cta | background-color | micro | out | keep | | | feedback |
| plan-hover | hover | #plan-pro | #plan-pro | transform, box-shadow | small | out | fade | | | feedback |
| sheet-open | click | #open-sheet | #sheet | transform | large | out | fade | | 120 | orientation |
| toast | click | #save | #toast | transform, opacity | medium | out | fade | | | state change |
| features-reveal | scroll | #features | .feature | transform, opacity | medium | out | static | 40 | | orientation |
| stat-count | scroll | #stat | #stat | text | 800 | out | instant | | | state change |
| hero-in | load | #hero-title | #hero-title | transform, opacity | hero | emphasized | fade | | | brand expression |
| panel-swap | click | #next | #panel .view | transform, opacity | page | out | fade | | 150 | orientation |
