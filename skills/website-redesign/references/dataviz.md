# Data visualisation — dashboards, analytics, and charts on marketing pages

Read whenever a surface shows numbers as charts or KPI tiles. If the environment has a dedicated data-visualisation skill (e.g. `dataviz`), follow its palette and mark specs for the charts themselves; this file holds what a redesign needs to decide around them, and where the two disagree about money (below), this file wins. Evidence: `research/streams/F-…` (Tufte, Cleveland & McGill, Stephen Few, Datawrapper, the FT Visual Vocabulary, Chartability; libraries measured 2026-09-28).

## 1. Decide which kind of chart first

| | Monitoring (dashboard) | Analytical (exploration) | Explanatory (marketing, editorial, reports) |
| --- | --- | --- | --- |
| Question | is anything wrong or changing? | why, where, which? | what should I take away? |
| Density | high but calm; small multiples, sparklines, bullet graphs | medium–high, interactive | low: one message per chart |
| Colour | greys; colour only for exceptions and status | categorical for series, sequential for magnitude | grey + one highlight |
| Interaction | drill-down links, a time range | filter, brush, zoom, linked views, sortable tables, export | none; must read as a static image |
| Motion | none beyond a ≤ 250 ms value transition on update | ≤ 300 ms transitions that keep object constancy | an optional reveal that explains; otherwise none |
| Failure | gauges, 3D, KPI tiles with no comparison | everything at once, no defaults | fake or decorative charts |

## 2. Principles

- **Perceptual accuracy** (Cleveland & McGill): position on a common scale > position on non-aligned scales > length, direction, angle > area > volume, curvature > shading and saturation. Bars and dots beat pies; aligned small multiples beat stacked bars; colour encodes category or status, not precise quantity.
- **Data-ink** (Tufte): erase non-data ink — heavy gridlines, borders, backgrounds, 3D, shadows. Small multiples beat one overloaded chart.
- **Context** (Few): a number alone is not information. Every metric has a target, a previous period or a benchmark. Bullet graphs replace gauges; sparklines give trend next to a KPI. The core picture fits one screen.
- **Grey is the most important colour** (Datawrapper): grey for context, one highlight for the point. Direct labels instead of legends.
- **Choose by relationship** (FT Visual Vocabulary): deviation, correlation, ranking, distribution, change over time, part-to-whole, magnitude, spatial, flow. "Many readers will assume the relationships you show them to be causal."

## 3. Chart choice

| To show | Default | Alternatives | Avoid |
| --- | --- | --- | --- |
| Change over time, few series | line, direct-labelled | area (one series), columns (few discrete periods) | dual-axis lines |
| Change over time, many series | small multiples, or grey lines + one highlighted | heatmap | a spaghetti chart with a 12-colour legend |
| Magnitude / comparison | horizontal bar, sorted | dot plot, lollipop | 3D bars; bars not starting at zero |
| Ranking | ordered bar | slope chart | unordered bars |
| Part-to-whole | 100% stacked bar or one bar with ≤ 5 segments | treemap, waffle | pies or donuts with more than 3–5 slices; multiple pies |
| Deviation from zero/target | diverging bar | bullet graph | good/bad by colour alone |
| Distribution | histogram | box plot, strip/beeswarm | a mean-only bar |
| Correlation | scatterplot | connected scatter, XY heatmap | dual axes |
| Spatial | choropleth of rates (never raw counts) | tile or hex map | a choropleth of population |
| A single KPI | big number + delta vs comparison + period + sparkline | bullet graph vs target | a gauge; a number with no comparison |
| Exact values people look up | **a table** (right-aligned, tabular figures, sortable) | a table with inline bars | a chart |

## 4. Dashboard rules

1. One screen for the core picture at the primary breakpoint; details one click away.
2. **KPI tile anatomy**: plain label · value (tabular figures, sensible precision) · comparison (delta vs previous period or target, with sign *and* arrow *and* colour) · period · optional sparkline. Tiles never animate their counters. Three to five tiles that drive decisions — not every number the database has.
3. **Status colours are reserved**: red, amber and green mean status only, never series identity.
4. **Tables are first-class**: numbers right-aligned with `font-variant-numeric: tabular-nums`, units in the header, sticky header, sortable with `aria-sort`, density toggle (`app-ui.md` §5).
5. Consistent scales across comparable small multiples; say so when they are independent.
6. Freshness shown ("Updated 2 min ago"); updates transition values in ≤ 250 ms or not at all; build animations never re-run on refresh — override the library defaults (Recharts 1,500 ms; Chart.js and ECharts 1,000 ms, and they ignore reduced motion).
7. Every chart has loading (a skeleton in the chart's shape), empty ("No data for this period" + next step), error and partial-data states. Never a zero line pretending to be data.
8. Dense or live series use canvas (uPlot, ECharts, Chart.js with decimation); many small SVG charts of ≤ 1–2k points are fine.

## 5. Colour, numbers and text

- **Categorical**: ≤ 7 hues, context series in grey. Okabe–Ito is the reference colour-blind-safe set (`#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #000000`; the yellow for fills only on white). **Sequential**: one hue light → dark, or viridis/cividis. **Diverging**: two hues around a meaningful midpoint (zero, target), never red–green. The brand accent is rarely a good data colour: keep a separate data palette in the tokens.
- Never colour alone: direct labels, shapes, dash patterns, decals.
- Marks ≥ 3:1 against the background, text ≥ 4.5:1, chart text ≥ 12 px.
- Dark mode: re-tune, don't invert — lighter, slightly desaturated hues, lower gridline contrast, marks still ≥ 3:1.
- Titles state the finding in explanatory charts ("Churn halved after the onboarding redesign"); dashboards name the metric plainly. A subtitle for measure and unit; a source line.
- Numbers through `Intl.NumberFormat` with the locale; compact notation on axes, and on tiles only where the figure is a magnitude to glance at ("1.2M visits"); full precision in tables and tooltips. **Money on invoicing, accounting, tax, payments and billing surfaces is never compacted**, in tiles included: the exact amount with its fixed decimals is the figure people reconcile against (and tax regimes such as ZATCA require it). Compact only the axis ticks; consistent decimals per column; percentages vs percentage points distinguished; a true minus sign. Arabic and Persian interfaces: the digit system set in code, no hand-built number strings in RTL, digits that are tabular in the font actually used, numeric columns right-aligned (`multilingual.md` §2a).
- Bars start at zero; lines may not (say so); about five round ticks; dates formatted for the range.

## 6. Responsive charts

Fewer ticks as width shrinks; columns become **horizontal bars** on narrow screens rather than rotated labels; direct labels fall back to a key; a taller aspect ratio on phones; tooltip targets ≥ 24 px or a tap-to-show value row; a "Show as table" option; small multiples stack vertically; never a horizontally scrolling chart.

## 7. Accessible charts (Chartability's critical tests)

Marks ≥ 3:1 and text ≥ 4.5:1 · the information available to screen readers (not only visual) · text ≥ 12 px · no seizure risk · keyboard mirrors mouse (focus = hover, Enter/Space = click) · interaction cues and instructions · custom keys only while the chart has focus · an explanation of purpose and how to read it · a title, summary or caption · reading level ≤ grade 9 · **a data table** unless the text already carries everything · appropriate density · navigation that is not tedious · the user's style changes respected.

Minimum implementation: a static SVG chart gets `role="img"` and an `aria-label` that states the takeaway; a canvas chart gets `role="img"` + `aria-label` and a table beside it; an interactive chart gets keyboard focus, arrow keys between points and announced values (Highcharts' accessibility module, AG Charts and Recharts 3's `accessibilityLayer` do this). Always a "View data as table" disclosure.

## 8. Charts on marketing pages

No fake charts: growth curves without axes, data or source; illustrative sparklines in feature cards; counters counting to invented numbers. A screenshot or faithful fragment of the real product's dashboard, with obviously sample data, is the honest way to show a product. A chart appears only when it carries a true, sourced claim — then it follows the explanatory rules, renders statically (ideally at build time — zero JavaScript is the best chart performance), and has a text equivalent.

## 9. Libraries (min+gzip, React excluded; measured)

| Situation | Choose | Size | Licence / notes |
| --- | --- | --- | --- |
| React app, standard business charts | Recharts 3 (or shadcn charts on it) | 108 KB line chart | MIT; `accessibilityLayer` on by default; respects reduced motion; set `animationDuration`; slow beyond ~5k points (3.2 s at 100k) |
| Dense time series, monitoring, live data | uPlot | 22.7 KB | MIT; flat render cost to 100k points (82–110 ms); add the table and label yourself |
| Large analytical apps, many chart types, maps | ECharts, from `echarts/core` | 167 KB tree-shaken (372 KB full) | Apache-2.0; `aria` descriptions and decals; SVG server rendering |
| Editorial or explanatory charts | Observable Plot, or static SVG at build time | 95 KB (0 KB if pre-rendered) | ISC |
| Bespoke, branded, interactive | visx (React) or D3 | 23–61 KB / 24 KB subset | MIT / ISC |
| Simple charts, any framework | Chart.js tree-shaken, with decimation | 53 KB | MIT; ignores reduced motion; 4 s at 100k points without decimation |
| Strict accessibility with budget | Highcharts + accessibility module | 142 KB | **proprietary — commercial and internal business use need a licence** |

Traps: **ApexCharts is proprietary since 5.3.0** (free only under $2M annual revenue); `@tremor/react` is stale since 2025-01 and pulls deprecated Recharts 2 (use Tremor's copy-paste components instead); AG Charts Community is 397 KB and did not shrink with module registration.
