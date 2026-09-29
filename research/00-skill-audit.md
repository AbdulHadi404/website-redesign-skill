# Audit of the skill as it stood on 2026-09-28 (before this R&D session)

Read in full: `SKILL.md`, all 13 references, both templates, `scripts/capture.mjs`, README, plugin manifests. ~1,600 lines.

## What the skill is

A marketing-site redesign workflow: audit → research → art direction (`DESIGN.md`) → imagery → implementation → visual QA at five widths → self-critique → technical QA, plus a lessons log fed by user corrections. Its organising idea is **anti-refresh**: the default outcome of "redesign this" is the same site with nicer components, and the skill is built to make that hard to reach by accident ("the distance test": the five first-notice things must all change).

## Where it is genuinely strong

1. **Truth preservation.** "Preserve the company's truth and its functionality — not its existing visual implementation." Never invent proof; design a page that does not need missing proof. The preserved-list (routes, ids wired to scripts, form names, analytics) is exactly what a careful engineer does.
2. **The correction loop.** `lessons.md` + "Learning from corrections" turns every user rejection into a rule at the cheapest point in the process. This is the best structural idea in the repo and should be kept and extended.
3. **Hard-won rendering traps.** `visual-qa.md` and `implementation.md` contain real, non-obvious engineering knowledge: reveals that fail visible, `fullPage` capture not rasterising un-composited images, `backdrop-filter` trapping fixed children, unsized injected SVGs, scoped styles not reaching child markup, `-100vw` full-bleed positioning, phantom overflow from scaled enter-animations. These come from real failures and are worth more than most generic advice.
4. **Theory with numbers.** `design-theory.md` (Gestalt, hierarchy limits, OKLCH scale building, 60/30/10, WCAG + APCA, CVD numbers, Bringhurst/Butterick) and `ui-ux.md` (Nielsen, laws with numbers, response times, forms, targets) are checkable rather than adjectival.
5. **Brand-first colour and type.** Sample the logo before choosing anything; the brand family audit (parent + siblings); the "house recipe" check against the skill's own convergent style. This directly addresses a real LLM failure (converging on one aesthetic).
6. **Logo method.** Silhouette test, seven tests, present 5–6 directions of different kinds.

## Where it is shallow or missing

| Area | State | Why it matters |
| --- | --- | --- |
| **Scope / product type** | Explicitly marketing sites only; "Not for application UI inside a product". Every rule assumes a persuasive, scroll-narrative page. | The user wants SaaS apps, dashboards, ecommerce, enterprise, mobile-first handled. Worse: several rules are *actively wrong* for apps (see below). |
| **Users and tasks** | The audit asks what the company sells and who buys it. It never asks who *uses* it, how often, on what device, what the top tasks are, or what data exists (analytics, support tickets, reviews). | Product decisions (density, what gets visual weight, what is progressively disclosed) come from task frequency and importance, not from brand. |
| **Redesign intensity** | One intensity: maximum distance. "If the plan keeps three of the five first-notice things, it is a refresh; stop." | For a frequently used app, familiarity is an asset (learned locations, muscle memory, Jakob's law). A dashboard redesign that changes everything taxes every existing user. The intensity must be *chosen* from the problem. |
| **Design systems** | "Tokens upward" in one line. No token architecture (primitive → semantic → component), no state matrix, no component inventory, no reuse-before-reinvent step. | Maintainability; consistency; most real redesigns are inside codebases with an existing component library. |
| **Component/library knowledge** | None. No guidance on headless primitives, when a library is appropriate, their a11y quality or weight. | The skill reinvents or defaults; the user explicitly asked for "use existing tools instead of reinventing". |
| **Resources** | Google Fonts / Fontshare / Fontsource; Unsplash / Pexels / Pixabay. Nothing on icons, illustration, flags, avatars, patterns, colour tools, charts, 3D, QA tools. | The agent falls back on memory (Lucide + Inter + Unsplash) — itself a generic-AI signature. |
| **Typography selection** | Strong on *rules*, weak on *choosing*: no guidance for picking a family by voice, avoiding over-used defaults, multilingual (Arabic + Latin), numeric-heavy UI, font loading. | The user named repeated fashionable fonts as a failure. |
| **Accessibility** | A checklist in `ui-ux.md` §8 and `technical-qa.md`. No automated tooling, no manual test procedure, no ARIA patterns/misuse, no focus management for apps, no forms depth, no zoom/reflow/forced-colours checks, no cognitive a11y. | Automated tools catch only a fraction of issues; the rest need a procedure the agent can execute. |
| **Responsive** | Content-driven breakpoints and five capture widths. No container queries, intrinsic layout, fluid type caveats, nav transformation beyond "Menu", responsive tables, density, 320px reflow, landscape, zoom. | "Works on mobile" ≠ designed for mobile; apps and tables are the hard cases. |
| **Motion** | Durations and the safe-reveal pattern. No decision framework for *whether* to animate, no productive vs expressive distinction, no library guidance, no View Transitions / scroll-driven CSS. | Apps need near-zero decorative motion; marketing can carry expressive motion. |
| **Performance** | CWV thresholds; hero eager; fonts swap. No JS budget, hydration, library weight, GPU cost, low-end device testing, measurement procedure. | "A beautiful redesign that performs badly is not successful." |
| **Data visualisation** | Nothing, beyond "data-oriented direction only when numbers are real". | Dashboards are an explicit target. |
| **Tooling** | One capture script. | Most QA claims (contrast, target size, overflow, a11y, type-scale discipline) could be *measured*, not eyeballed. |

## Where it relies on generic instincts or has internal problems

- **The capture script does not do what `visual-qa.md` says a capture script must do.** The lessons (grow the viewport to document height, `await img.decode()`, strip the class that hides reveals) were written into prose but never into `capture.mjs`, which still uses `fullPage: true` with an 844/900 viewport and a fixed settle. The known failure is still in the shipped tool.
- `SKILL.md` says "Two commitments" and lists three.
- Several rules are phrased as universals when they are marketing-specific: "cards only for card-shaped content (often: no cards)", "no two adjacent chapters share a composition", "alternate surfaces", "one full-bleed accent field", "hero concept", "chapters". In an app, repeating one list layout *is* correct; cards are often the right container for dashboard widgets; surfaces should be calm and consistent.
- "Mono only for developer products" is correct as a voice rule, but the fix ("tabular figures in the sans") needs a companion: which sans faces actually have good tabular figures.
- The anti-patterns list is built from one user's corrections on two marketing projects. It is precise but narrow; it lacks the widely recognised AI-UI tells (gradient text, emoji icons, the tinted-icon-square feature grid, fake metrics dashboards, "✨ New" badge pills, etc.) and all app-UI tells (everything a card, modals for everything, missing states, no density control).
- The research phase looks only at reference *sites*. It never consults design-system documentation, pattern research (Baymard, NN/g), or the product's own evidence (analytics, support tickets, reviews).
- "Good redesign" is judged by distance + distinctiveness + critique rubric. There is no measure of task success, accessibility conformance, or performance regression inside the critique itself (only in technical QA afterwards).
- `design-theory.md` A3 hierarchy limits ("no more than three sizes in a view") are marketing-page heuristics; product UI legitimately uses more text styles at small steps.

## Decision for this session

1. Keep the skill's identity and name (install paths depend on it), its truth rule, its lessons loop, its rendering traps and its theory.
2. Add a **framing step** that classifies the surface (marketing / app / dashboard / ecommerce / docs / enterprise / mobile-first) and the **redesign intensity** (polish → refresh → redesign → re-platform), and route to category playbooks; make the distance test apply where it belongs.
3. Add user/task research to the audit.
4. Build tested tooling so QA claims are measured.
5. Add focused modules only where they change decisions: accessibility, responsive, motion, performance, design systems, product-category playbooks, data-viz, and a curated resource layer.
6. Keep research notes out of the installed skill (`research/` at repo root).
