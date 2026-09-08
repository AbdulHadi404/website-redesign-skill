# website-redesign — a Claude Code skill

A skill that makes Claude Code approach a marketing-site redesign the way a good design studio would: investigate the company, research live references, derive an art direction from the company's own truth, decide what to keep / replace / remove / create, rebuild the visual system in the existing stack, render the result at five widths, critique it honestly, iterate, and only then run technical QA.

It encodes one hard-won lesson: the default outcome of "redesign this site" is a *refresh* — same fonts, same palette, same hero shape, nicer components. This skill is built to make that outcome hard to reach by accident, and to make the result specific to each company rather than to one house style.

> Preserve the company's truth and its functionality — not its existing visual implementation.

## What it does

- **Audit** the repository and the rendered site: product, audience, proof that actually exists, everything that must be preserved (routes, ids wired to scripts, forms, integrations), and *specific* reasons the current design reads as weak.
- **Research** live reference sites when a browser is available, extracting principles rather than sections.
- **A knowledge base** written from the primary sources, stated as checkable rules with their numbers: design fundamentals, colour and typography (`references/design-theory.md`), interaction and accessibility (`references/ui-ux.md`), pages and performance (`references/web-design.md`), marks and identity (`references/logo-design.md`).
- **Design and colour theory** as a working reference (`references/design-theory.md`): harmony and the 60/30/10 budget, perceptual (OKLCH) scales and the 12-step role scale, WCAG and APCA contrast, typographic scale and caps rules, Gestalt, logo construction — with a palette checklist that must be complete before any code.
- **Art direction** written down before code: a concept derived from the company, typography, a colour system, layout philosophy, hero concept, product visualisation, imagery strategy, motion — and explicit keep / replace / remove / create lists, with a check that flags a plan that is still a refresh.
- **Imagery** only when it carries the concept: licensed sources, localised and optimised assets, one consistent treatment, credits — or a deliberate decision to use product UI, diagrams or typography instead.
- **Implementation** in the existing framework, tokens upward, with functionality untouched and composition varied chapter by chapter.
- **Lessons log** (`references/lessons.md`): every user correction becomes a rule somewhere in the skill, so the next run does not repeat it.
- **Visual QA** from full-page renders at 1440 / 1280 / 1024 / 768 / 390, then a **self-critique** whose every "no" becomes a fix and a re-render.
- **Technical QA**: typecheck, build, tests, links, forms, widgets, accessibility, performance, SEO — and a hand-off that reports what was verified and what the user must decide.

Two unrelated companies run through this skill should produce two clearly different websites.

## Install

**Copy into Claude Code's skills folder** (personal, available in every project):

```bash
git clone https://github.com/AbdulHadi404/website-redesign-skill.git
cp -r website-redesign-skill/skills/website-redesign ~/.claude/skills/website-redesign
```

Or into one project only: copy it to `<repo>/.claude/skills/website-redesign`.

**Or as a plugin** (Claude Code plugin marketplace):

```bash
claude plugin marketplace add AbdulHadi404/website-redesign-skill
claude plugin install website-redesign@website-redesign-skill
```

Restart the session (or open a new one) so the skill is listed.

## Use

Ask in plain language; the skill triggers on redesign / rebrand / "make it premium" / "looks generic" requests, or invoke it directly:

```
Use the website redesign skill to completely redesign this marketing site.
Benchmark quality against https://www.example.com but keep our facts and forms.
```

```
/website-redesign — the homepage feels templated. Audit it, research a few premium
sites in our category, propose a new direction and implement it.
```

```
Rebrand this landing page. We sell fleet insurance to logistics companies; our
customers are dispatch managers. Don't invent stats we don't have.
```

Claude then works through audit → research → art direction (it writes a `DESIGN.md` in the repo) → implementation on a branch → renders and critique → iteration → technical QA, and reports with before/after captures. It stops to ask only for things you own: credentials, a capability the environment lacks, a fact the repo cannot answer, or a production deployment.

## Prerequisites and optional capabilities

- A repository with a runnable marketing site (any framework; the skill works inside the existing stack).
- **Recommended:** a browser capability in Claude Code — the built-in preview browser, or a browser MCP — so references can be inspected live and the result rendered. Without it the skill says so and works from the audit alone.
- **Recommended for photography:** the ability to fetch files (a fetch-capable runtime such as Node, or a browser tool). Imagery is optional; the skill explains what to enable if it is missing rather than shipping placeholders.
- **Optional:** `puppeteer-core` and a local Chrome for `scripts/capture.mjs`, the bundled full-page capture helper used in visual QA.

## Layout

```
skills/website-redesign/
  SKILL.md                 the workflow and its commitments (read on trigger)
  references/
    audit.md               repository, company and rendered-site audit
    research.md            how to inspect references and extract principles
    art-direction.md       deriving a direction; direction families; keep/replace/remove/create
    anti-patterns.md       what makes a site read as generated — incl. the "refresh" failure
    imagery.md             sourcing, licences, localising, treatment, text-over-photo rules
    implementation.md      order of work, composition rules, engineering discipline, rendering traps
    visual-qa.md           capture methods, per-width checks, the self-critique
    technical-qa.md        functional, accessibility, performance, SEO, hand-off
  templates/
    DESIGN.md              the art-direction document the skill writes into the repo
    critique.md            the self-critique scorecard
  scripts/
    capture.mjs            full-page captures at several widths (puppeteer-core)
```

## Licence

MIT.
