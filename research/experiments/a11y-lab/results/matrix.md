| Flaw | Defect | SC | axe | axeX | htmlcs | LH | IBM | S | W |
|---|---|---|---|---|---|---|---|---|---|
| F01 | No lang on <html> | 3.1.1 | ● | ● | ● | ● | ● | ● | – |
| F02 | Empty <title> | 2.4.2 | ● | ● | ● | ● | ● | ● | – |
| F03 | img without alt | 1.1.1 | ● | ● | ● | ● | ● | – | – |
| F04 | Filename as alt (IMG_2931.png) | 1.1.1 | · | · | · | · | · | ● | – |
| F05 | Decorative image with descriptive alt | 1.1.1 | · | · | · | · | · | ◐ | – |
| F06 | Low-contrast body text #aaa on white (2.3:1) | 1.4.3 | ● | ● | ● | ● | ● | – | – |
| F06a | Low-contrast logo text on dark header | 1.4.3 | ● | ● | ● | ● | ● | – | – |
| F07 | Placeholder used as the only label | 3.3.2/4.1.2 | · | · | ● | · | ◐ | ● | – |
| F08 | Icon link with no name | 2.4.4/4.1.2 | ● | ● | ● | ● | ● | ● | – |
| F09 | Icon button with no name | 4.1.2 | ● | ● | ● | ● | ● | ● | – |
| F10 | role=button div, not focusable, no key handler | 2.1.1 | · | · | ◐ | · | ◐ | ● | ● |
| F11 | Clickable div (onclick), no role, no keyboard | 2.1.1/4.1.2 | · | · | ◐ | · | ● | ● | ● |
| F12 | Focusable link inside aria-hidden | 4.1.2 | ● | ● | · | ● | ● | ● | – |
| F13 | aria-label on a generic div | 4.1.2 (ARIA misuse) | ◐ | ◐ | · | · | ● | · | – |
| F14 | role=menu used for site navigation | 4.1.2 (ARIA misuse) | · | · | · | · | ◐ | ● | – |
| F15 | Redundant role=navigation on <nav> | best practice | · | · | · | · | ◐ | · | – |
| F16 | Heading levels skip h1→h4 | 1.3.1 (bp) | ● | ● | ◐ | ● | · | ◐ | – |
| F17 | Fake headings (styled divs) | 1.3.1 | · | · | · | · | ◐ | ◐ | – |
| F18 | No main landmark / content outside landmarks | 1.3.1/2.4.1 (bp) | ● | ● | · | ● | ● | ● | – |
| F20 | Focus outline removed, no replacement | 2.4.7 | · | · | · | · | ◐ | ● | – |
| F21 | Positive tabindex | 2.4.3 | ● | ● | · | ● | · | ● | – |
| F22 | Required marked by red * only | 1.4.1/3.3.2 | · | · | · | · | · | ◐ | – |
| F22b | Trend up/down by colour only | 1.4.1 | · | · | · | · | · | · | – |
| F23 | Error message not associated, not announced | 3.3.1/4.1.3 | · | · | · | · | · | · | ● |
| F24 | Invalid autocomplete token | 1.3.5 | ● | ● | ◐ | ● | ● | · | – |
| F24b | Missing autocomplete on phone/name | 1.3.5 | · | · | · | · | · | ◐ | – |
| F25 | select without label | 4.1.2 | ● | ● | ● | ● | ● | ● | – |
| F26 | Radio group without fieldset/legend | 1.3.1 | · | · | ◐ | · | ● | ◐ | – |
| F27 | Data table without <th> | 1.3.1 | · | ● | · | ● | ● | ● | – |
| F28 | Invalid aria-sort; sort control is a td with onclick | 4.1.2/2.1.1 | ● | ● | ◐ | ● | ● | ● | – |
| F29 | SVG chart with no text alternative | 1.1.1 | · | · | · | · | ● | ◐ | – |
| F30 | Duplicate id used by aria-labelledby (name ≠ visible label) | 4.1.2/2.5.3 | ◐ | ● | ● | ● | ◐ | ● | – |
| F31 | Ambiguous 'Click here' links | 2.4.4 | · | · | · | · | · | ◐ | – |
| F32 | Auto-moving ticker, no pause | 2.2.2 | · | · | · | · | · | ● | – |
| F33 | prefers-reduced-motion ignored | 2.3.3 (AAA)/2.2.2 | · | · | · | · | · | ● | – |
| F34 | 16×16 targets 2px apart | 2.5.8 | ● | ● | · | ● | ● | ● | – |
| F35 | Div modal: no role, no focus move, no trap, no Esc | 4.1.2/2.4.3/2.1.2 | · | · | ◐ | · | · | · | ● |
| F36 | Toast not in a live region | 4.1.3 | · | · | · | · | · | · | ● |
| F37 | Fixed 1100px layout, no reflow at 320px | 1.4.10 | · | · | · | · | · | ● | – |
| F38 | Fixed-height cards clip under text spacing | 1.4.12 | · | · | · | · | · | ● | – |
| F39 | Viewport meta disables zoom | 1.4.4 | ● | ● | ◐ | ● | ◐ | ● | – |
| F40a | Icon as CSS background-image (lost in forced colors) | 1.1.1/1.4.11 | · | · | · | · | ◐ | ● | – |
| F40b | Custom checkbox div (box-shadow, no role/keyboard) | 4.1.2/2.1.1/1.4.11 | · | · | ◐ | · | ● | ● | – |
| F40c | Focus shown only by low-contrast box-shadow (gone in forced colors) | 2.4.7/2.4.13 | · | · | · | · | · | ● | – |
| F41 | Input borders 1.2:1 | 1.4.11 | · | · | · | · | · | ● | – |
| F42 | Link in text distinguished by colour only | 1.4.1 | ● | ● | · | · | · | · | – |
| F43 | Disclosure button without aria-expanded | 4.1.2 | · | · | · | · | · | · | ● |
| F44 | Tabs: not focusable, no aria-selected/controls, no arrows | 4.1.2/2.1.1 | · | · | ◐ | · | ● | ● | ● |
| F45 | <a> without href used as a button | 2.1.1/4.1.2 | · | · | ◐ | · | ● | ● | – |
| F46 | iframe without title | 4.1.2 | ● | ● | ● | ● | ● | · | – |
| F47 | Foreign phrase without lang | 3.1.2 | · | · | · | · | · | · | – |
| F48 | Visible 'Search', aria-label 'Go' | 2.5.3 | · | ● | ◐ | ● | ● | ● | – |
| F49 | Spinner with no text/status | 4.1.3 | · | · | · | · | · | · | – |
| F53 | Paste blocked on password | 3.3.8 | · | · | · | · | · | ● | – |
| F54 | aria-describedby points at missing id | 4.1.2 / 1.3.1 | ◐ | ◐ | · | · | ● | · | – |
| F55 | Empty table header cell | 1.3.1 (bp) | ● | ● | · | · | ● | · | – |
| F56 | <li> outside a list | 1.3.1 | ● | ● | · | ● | ◐ | · | – |
| F57 | Skip link never visible on focus | 2.4.7/2.4.1 | · | · | · | · | ◐ | ● | – |
| F58 | Sticky header hides focused elements | 2.4.11 | · | · | · | · | · | ● | – |
| F59 | Empty heading | 1.3.1/2.4.6 | ● | ● | ● | · | ● | ● | – |

**Totals (of 60 seeded defects)** — ● failure · ◐ warning/needs-review only

- axe: ● 21, ◐ 3 → any signal 24 (40%), as failure 35%
- axeX: ● 24, ◐ 2 → any signal 26 (43%), as failure 40%
- htmlcs: ● 12, ◐ 12 → any signal 24 (40%), as failure 20%
- LH: ● 21, ◐ 0 → any signal 21 (35%), as failure 35%
- IBM: ● 26, ◐ 11 → any signal 37 (62%), as failure 43%
- S: ● 34, ◐ 8 → any signal 42 (70%), as failure 57%
- W: ● 7, ◐ 0 → any signal 7 (12%), as failure 12%
- all four rule engines combined: any signal 41 (68%), as failure 33 (55%)
- axe + IBM: any 40, failure 32
- rule engines + a11y-audit + widget-contracts: any signal 57 (95%), as failure 51 (85%)
- missed by everything: F22b (Trend up/down by colour only); F47 (Foreign phrase without lang); F49 (Spinner with no text/status)
- caught ONLY by the scripted audit/contracts (no rule-engine signal): F04 F05 F22 F23 F24b F31 F32 F33 F36 F37 F38 F40c F41 F43 F53 F58