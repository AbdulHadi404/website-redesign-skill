# Stream A: the ecosystem of AI design, frontend and UI/UX agent instructions

Research date: 2026-09-28. Scope: open-source material that teaches coding agents to design and build good UI (skills, plugins, subagents, rules files, leaked platform prompts, MCP servers, linters, benchmarks), studied for what our `website-redesign` skill should adopt, link or ignore.

Everything below was read from the primary text (cloned repos, git history, raw files), except where a source is marked "secondary" (search-result summaries of pages the egress proxy blocked). Star counts come from the GitHub search API on the research date. "Last commit" is the date of the newest commit in the clone.

---

## 0. The short version

1. **The ecosystem has converged on one diagnosis: models sample the centre of the distribution.** Anthropic calls it "distributional convergence" (Nov 2025 blog). The fix most projects reached for in 2025 was a list of bans plus a list of "distinctive" alternatives. That fix produced a **second-generation monoculture**: cream paper, a high-contrast serif with an italic accent word, terracotta, tracked mono eyebrows, hairline rules, acid-green-on-black. Anthropic's own frontend-design skill (revised 2026-09-03), impeccable and gstack all now name these clusters explicitly. **Our skill's "house style" (lessons 2026-09-07) is exactly clusters 1, 3 and 5 of Anthropic's calibration list.** It is the model's prior, not a quirk of our skill, and the other projects treat it that way.
2. **Recommended-font lists age into ban lists within months.** The Anthropic cookbook (2025) recommended Fraunces, Space Grotesk, Playfair, Bricolage, Newsreader and IBM Plex as "impact choices". By 2026 impeccable's detector lists Fraunces, Instrument Serif, Geist, Space Grotesk, Plus Jakarta and Recoleta as the "newer monoculture". gstack: "A long list of 'good' fonts is how the last convergence happened." The durable approach is procedures plus a dated saturation list, not recommendations.
3. **The strongest projects verify rather than instruct.** Impeccable (61 deterministic detector rules, two-tier hooks, a fresh-context finish reviewer, a two-round ceiling), plugin87 (44 measured gates, blind cold-start evals, an adversarial critic), gstack (letter grades, grep and aggregation thresholds, regression baselines) and OpenAI's short-lived frontend-skill (removal tests) turn taste into checks that can be run and fail.
4. **Popularity is not quality.** The most-starred UI skill (ui-ux-pro-max, 131k★) maps "SaaS" to Tailwind blue-600 plus glassmorphism, and "Micro SaaS" to indigo-500. That is the generic recipe, stored as a database. A third-party benchmark that scored Anthropic's skill 18/18 graded outputs that sit inside the clusters now called slop.

---

## 1. Search log

### Access conditions (verified with curl through the agent proxy)
- **Reachable:** `github.com` (git clone), `raw.githubusercontent.com`, `anthropic.com`, `claude.com`. The GitHub search API worked through the MCP tool.
- **Blocked:** the per-repo GitHub REST API (commit history came from deepening clones instead: `git fetch --unshallow --filter=blob:none`). Also blocked by the egress proxy: `impeccable.style`, `developers.openai.com`, `the-decoder.com`, `simonwillison.net`, `cursor.directory`, `skills.sh`, `ui-skills.com`, `mcpmarket.com`, `vercel.com`, `x.com`, `reddit.com`, `news.ycombinator.com`, `figma.com`, `playwright.dev`, `emilkowal.ski`, `rauno.me`. Where a blocked page mattered (OpenAI's GPT-5.4 frontend post, impeccable detector docs), I used the source repo instead (git history of `openai/skills`, the impeccable rule registry in Rust) or secondary search summaries, marked as such.

### GitHub repository searches (sorted by stars)
`frontend design skill claude` · `ui ux skill agent design stars:>500` · `design review agent playwright claude code` · `web interface guidelines vercel` · `ui-ux-pro-max` · `design skills agents stars:>2000` · `awesome design.md` · `openai skills codex` · `cursor rules ui design` · `accessibility agents claude code wcag` · `visual regression screenshot agent claude design verification` (0 results) · per-owner lookups for star counts.

### GitHub code searches
`"Hard rejection" "litmus" filename:SKILL.md` (1,194 hits, nearly all gstack forks) · `"feel premium if all decorative shadows were removed"` (305 hits; led to the removed OpenAI frontend-skill) · `"distributional convergence" frontend aesthetics` · `"AI slop" path:.cursor/rules`.

### Web searches
"Claude Code skill frontend design AI slop anti-patterns 2026" · "impeccable design skill pbakaus github" · "Designing Delightful Frontends with GPT-5.4 … hard rejection litmus" · "OpenAI frontend-prompt guide GPT-5.5 …" · "claude.com blog improving frontend design through skills distributional convergence" · "DesignArena benchmark AI website design 2026" · "Gemini CLI extension frontend design skill anti slop 2026" · "Anthropic Claude Design launch 2026".

### Pages fetched
`claude.com/blog/improving-frontend-design-through-skills` (fetched; the page states 2025-11-12, a search snippet says 2026-06-21, probably a re-date).

### Repos cloned and read (47 in total; the main ones)
`anthropics/skills` (+ history of `skills/frontend-design`), `anthropics/claude-cookbooks` (sparse: `coding/prompting_for_frontend_aesthetics.ipynb`), `anthropics/claude-code` plugin copy (raw; identical to the skills version), `anthropics/claude-plugins-official` (marketplace.json scanned for design plugins), `pbakaus/impeccable`, `garrytan/gstack`, `Leonxlnx/taste-skill`, `openai/skills` (+ history: frontend-skill added 2026-03-20, removed 2026-04-23), `nextlevelbuilder/ui-ux-pro-max-skill`, `vercel-labs/web-interface-guidelines`, `vercel-labs/agent-skills`, `OneRedOak/claude-code-workflows`, `emilkowalski/skill(s)`, `ibelick/ui-skills`, `superdesigndev/superdesign-skill`, `wilwaldon/Claude-Code-Frontend-Design-Toolkit`, `VoltAgent/awesome-design-md`, `google-labs-code/stitch-skills`, `alchaincyf/huashu-design`, `Owl-Listener/designer-skills`, `plugin87/ux-ui-agent-skills`, `Laith0003/ux-skill`, `dani-z/frontend-design-skill-benchmark`, `addyosmani/web-quality-skills`, `bencium/bencium-claude-code-design-skill`, `arvindrk/extract-design-system`, `mistyhx/frontend-design-audit`, `b1rdmania/claude-brand-skills`, `ehmo/platform-design-skills`, `JimLiu/baoyu-design`, `meodai/skill.color-expert`, `Community-Access/accessibility-agents`, `ChromeDevTools/chrome-devtools-mcp` (sparse: docs), `microsoft/playwright-mcp` (sparse), `GoogleChrome/modern-web-guidance`, `x1xhlol/system-prompts-and-models-of-ai-tools` (v0, Lovable), `spencergoldade/cursor-designer`, `saralobo/rules-design-bible`, `PatrickJS/awesome-cursorrules`, `MickeyAlton33/web-designer-plugin`, `TuahaJawaid/looks-expensive`, `kylezantos/design-motion-principles` (listing only), `Ilm-Alan/frontend-design`, `miqdadbadjuber/anti-slop`.

---

## 2. Projects studied

Verdict key: **(a)** adopt the idea into our skill · **(b)** link as a resource · **(c)** ignore.

### 2.1 Anthropic `frontend-design` skill
- **URL:** https://github.com/anthropics/skills/tree/main/skills/frontend-design (identical copy in `anthropics/claude-code/plugins/frontend-design`, listed in the official plugin marketplace).
- **Maintenance:** repo 178,766★, last commit 2026-09-24. The SKILL.md has three generations: 2025-12 (original "BOLD aesthetic" text), 2026-06-09 (#1293, rewrite adding the calibration), 2026-09-03 (#1713, "avoid generic design defaults").
- **License:** Apache-2.0 (`skills/frontend-design/LICENSE.txt`, verified).
- **What it is:** a 71-line skill: studio-lead persona, ground the design in the subject, design principles, a two-pass process (plan, then review the plan against the brief before building), restraint, and a writing section.
- **Ideas worth learning:**
  - **A calibration list of where generated design lands**, with hex anchors. Verbatim (2026-09-03): "(1) a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell); (2) a near-black background with a single bright acid-green or vermilion accent; (3) a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns; (4) the SaaS-card kit … the same soft grey shadow (rgba(0,0,0,.1)) …; (5) template chrome that appears whatever the subject: a tracked-out ALL-CAPS eyebrow label above every heading; meta strings joined with middle dots ('A · B · C'); labels built as 'WORD — fragment' with a spaced em dash; tinted near-black (#0B0B0B, #111) standing in for black; a monospace face for small data labels; a '→' appended to link and button text."
  - **Default typographic tells:** "Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color. Using all caps for labels. Adding unnecessary typographic labels above content." Our house style's "serif display with an italic emphasised phrase" is tell #1.
  - **The similar-prompt self-test:** review the plan and revise any part that "reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar)". This is cheap and checkable.
  - **Numbered markers only for real sequences**: "Before adding numbered markers, check the content really is a sequence."
  - **Motion:** "fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated"; motion answering a user action is welcome.
  - **Memory across projects:** "Human creatives have memory and always try to do something new, so if you have a space to quickly jot down notes about what you've tried, it can help you in future passes."
  - **Its own evolution is the lesson.** The 2025 text told agents to "Pick an extreme", use "gradient meshes, noise textures … grain overlays", "staggered reveals", and "NEVER converge on common choices (Space Grotesk, for example)". The 2026 text reverses motion, bans the accent-word treatment and names the clusters that the 2025 instructions helped create.
- **Weak or generic:** no verification procedure beyond "taking screenshots to review if your environment supports it"; no numbers other than an 80-character line length; the writing section is generic UX-writing advice.
- **Verdict: (a).** Adopt the calibration clusters, the similar-prompt test and the "memory" note. Put them in `anti-patterns.md` / `art-direction.md` and connect them explicitly to our house-style lesson.

### 2.2 Anthropic cookbook "Frontend Aesthetics: A Prompting Guide" and the claude.com blog
- **URL:** https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb · https://claude.com/blog/improving-frontend-design-through-skills
- **Maintenance:** notebook last touched 2026-09-24; the blog page says 2025-11-12. **License:** MIT (repo LICENSE).
- **Ideas:** three strategies: guide design dimensions individually, reference inspirations (IDE themes, cultural aesthetics), call out defaults. Isolated prompts per dimension (typography-only, theme-locked). Names the phenomenon: "You tend to converge toward generic, 'on distribution' outputs."
- **Weak:** its "Impact choices" font list (JetBrains Mono, Fira Code, Space Grotesk, Playfair Display, Crimson Pro, Fraunces, Clash Display, Satoshi, Cabinet Grotesk, IBM Plex, Bricolage Grotesque, Newsreader) and "Use extremes: 100/200 weight vs 800/900 … Size jumps of 3x+" became the next monoculture. It is historical evidence for why we must not ship recommendation lists.
- **Verdict: (c)** as instruction; cite it as evidence in the rationale.

### 2.3 impeccable (Paul Bakaus)
- **URL:** https://github.com/pbakaus/impeccable (site impeccable.style was blocked; read from the repo).
- **Maintenance:** 71,993★, last commit 2026-09-24, very active (Rust engine, CLI, browser extension, VS Code extension, hooks for Claude Code, Codex, Cursor, Copilot and Grok).
- **License:** Apache-2.0 (verified); `NOTICE.md` credits ehmo/platform-design-skills (MIT) for its iOS and Android references.
- **What it is:** one skill (`skill/SKILL.src.md`, 89 lines) routing to 38 reference files (craft-floor, new-work, critique at 841 lines, audit, polish, typeset, colorize, layout, animate and more), 4 subagents (finish-reviewer, documenter, asset-producer, manual-edit-applier), and a deterministic detector (61 rules) run by a CLI, by hooks, or from the browser.
- **Ideas worth learning (the richest source in this stream):**
  - **Redesign semantics:** "Refinement preserves; redesign replaces. … Redesign keeps product truth, content, function … but treats the old look as evidence and anti-reference … Never split the difference into polish on the discarded look." This matches our refresh-versus-redesign doctrine almost word for word.
  - **Visitor modes by surface, not product:** Persuade (marketing, pricing), Operate (app, dashboards), Read (docs, articles, changelogs), Experience (portfolios). "A tool's landing page is still Persuade … a docs index is Read, not Persuade."
  - **A model-specific prior block** (`<claude>` in `new-work.md`): "warm, bookish, family, and child-facing subjects come out as cream grounds, serif display with italic accents, and lamplight, even when the assigned direction never asked for them. Treat that first palette as already spent. … when [the direction] says cream, paper, parchment, ivory, or lamplight for a Persuade surface the brief did not pin, the rendition failed." There are matching `<codex>` and `<gemini>` blocks in `craft-floor.md`.
  - **The category test:** "if someone could guess your aesthetic from the category alone, or from category-plus-avoidance, rework until neither answer is obvious." Also: "landing on cream plus serif for a book subject is the default wearing the subject's clothes."
  - **Concept derivation with a diversity constraint:** name the page this category always ships and its predictable opposite (both "the rut", excluded); list seven concrete systems, artifacts, places or rituals from the audience's world; "When more than three of the seven share one material family … dig until the list spans at least three families."
  - **A direction contract** of six blocks (~150 words): THESIS (including "the category-default arrangement it refuses"), OWN-WORLD ("specific enough to be recognizable with all content removed"), STORY, FIRST VIEWPORT ("the exact composition, what is where and at what scale, and where the primary action sits"), FORM, FINISH. "If a block reads like a mood, the direction is not decided yet."
  - **Colour strategy chosen before colours:** Restrained, Committed (one saturated colour carries 30–60% of the surface), Full palette, Drenched. "Dark or light is never a default: write one sentence of physical scene."
  - **Reflex faces:** "Fraunces, Playfair Display, Cormorant, Lora, Crimson, Newsreader, Syne, Space Grotesk, Space Mono, IBM Plex, Inter-as-display, DM Sans, DM Serif, Outfit, Plus Jakarta Sans, Instrument Sans. Naming one of these faces anyway requires a reason no other face could satisfy, and a subject association is never that reason." The detector's `OVERUSED_FONTS` adds Inter, Roboto, Open Sans, Lato, Montserrat, Arial, Helvetica, Instrument Serif, Geist, Mona Sans and Recoleta, with brand-domain exemptions (Geist on vercel.com and so on).
  - **The craft floor, loaded immediately before any UI edit:** contrast ≥4.5:1 / 3:1; secondary text on coloured surfaces tinted from the hue, "never gray"; "shadows carry an offset and a soft blur. A zero-offset colored halo is decoration"; "more space above a heading than below it. Read the computed values"; body measure 65–75ch, display max 6rem, tracking floor −0.04em; "one authored moment … Exponential ease-out from an already-visible default"; **browser surfaces**: "Text selection, the caret, custom scrollbars, focus rings, underline offset, and the numerals in tabular data all ship with browser defaults … the cheapest signal that a page was built rather than assembled, and the one models skip most reliably."
  - **Refuse list:** same-size icon cards; the hero-metric template; the kicker or eyebrow ("a ban, not a default: no brief earns it back"); section numbers; gradient text; decorative glass; coloured `border-left/right` over 1px; hard offset shadows outside neobrutalism; mono as a costume; system display faces; glyph or emoji icons; geometric masks faking organic contours; light or dark picked by category; ghost cards (a 1px border under a wide soft shadow); card radii 12–16px ("pills are for small controls"); sketchy SVG scenes and feTurbulence grain; stripes and grid backgrounds without a real canvas, map or blueprint under them.
  - **Verification discipline:**
    - "Verify in bounded passes, not a loop … two rounds is the ceiling."
    - "A capture is evidence only when it is valid … open every file once and confirm it shows what its name claims."
    - Typeset and layout: "Answer each item with rendered or source evidence … Do not substitute a bare 'yes' for verification."
  - **Separate, fresh-context finish reviewer** (`agents/impeccable-finish-reviewer.md`):
    - "a reviewer that inherits your transcript inherits your framing, your optimism, and your abstractions."
    - It inventories the screenshots "in your own words before reading the direction contract."
    - Fixed dispositions: `recapture | rebuild | fix | ship`.
    - "The parent's narration of what was fixed is not evidence; a claimed fix you cannot see in the recaptures is unresolved."
    - Mandatory TYPE, MATERIAL and GROUND rows. On GROUND: "drift toward the rendition prior (warm cream on light grounds, blue-black slate on dark) is the direction to hunt."
    - "faked physicality (CSS bevels, embossing, stamped-metal or chalk effects …) … imitation material is the single most reliable mark of machine-made design."
  - **Anti-anchoring critique:** Assessment A (design judgement) and Assessment B (detector plus browser) run in isolated subagents; "Assessment A must finish before detector findings enter the parent synthesis context". A degraded single-context run must print a banner. Nielsen heuristics are scored 0–4 with `n/a` renormalisation for marketing surfaces ("Most real interfaces score 20-32 out of 40"), plus a cognitive-load checklist (≤4 options per decision point) and personas.
  - **Two-tier hooks:** per-edit PostToolUse runs only the "immediate tier" (broken images, overflow, contrast, gradient text, glow, design-system drift); the full taste rule set runs once on `Stop`.
  - **The detector's 61 rules**, many with thresholds (extracted from `crates/foundation/src/registry.rs`):
    - flat type hierarchy: adjacent roles under 1.25×
    - em-dash overuse: at least 8, at about 1 per 500 characters
    - tight leading: under 1.3
    - wide tracking: over 0.05em on body text
    - tiny body text: under 12px; undersized UI text: under 11px
    - long lines: over ~80 characters
    - `content-hidden-at-rest`: a large share of text at opacity 0 after reveals had their chance
    - also `cream-palette`, `italic-serif-display`, `hero-eyebrow-chip`, `kicker-above-heading`, `numbered-section-labels`, `aphoristic-cadence`, `theater-slop-phrase`, `icon-tile-stack`, `buried-raster`, `organic-clip-path`, `shape-assembled-illustration`, `radial-spotlight-glow`, `pulsing-dot`, `blinking-cursor`, `marquee`, `heading-rhythm`, `first-viewport-column-overflow`, `text-occlusion`, `edge-flush-cards`, `script-error`, `gpt-thin-border-wide-shadow`, `codex-grid-background`, `image-hover-transform`, and design-system drift rules checked against DESIGN.md.
  - **Author assets, never substitute chrome:** "Gradients, glass, generic icon tiles, and many-vertex clip-path polygons where an authored asset belongs are the gap wearing chrome." For imagery: "Search for the subject's physical object rather than the category; one decisive photo beats five mediocre ones."
- **Weak or overbuilt:**
  - Enormous procedural surface: dice-rolled "concept-seed" directions, decision pages served on localhost, comp-led builds with pixel-diff gates at 72%, font fingerprint matching, image-generated comps.
  - Much of it depends on its own binary and on image generation.
  - The dice mechanism is interesting as an anti-convergence device, but it hands art direction to chance, which fights our "derive from the company" core.
  - Some rules are opinion stated as law (eyebrows banned outright).
  - The text is dense to the point of being hard for a model to follow reliably.
- **Verdict: (a)** for the calibration and `<claude>` prior, the category test, the seven-candidates-across-three-families rule, the refuses/own-world/first-viewport fields, colour strategies, browser surfaces, the evidence rule, capture validity, the fresh-context reviewer, bounded rounds, and a set of detector rules re-implemented as our own checks. **(b)** link the detector (`npx impeccable detect <url> --json`) as an optional mechanical pass. **(c)** for dice, comps and the build state machine.

### 2.4 gstack design skills (Garry Tan)
- **URL:** https://github.com/garrytan/gstack (`design-review/`, `design-consultation/`, `plan-design-review/`, `design-shotgun/`, `review/design-checklist.md`).
- **Maintenance:** 134,382★, last commit 2026-09-26. **License:** MIT, with `NOTICE.md` declaring Apache-2.0 material derived from impeccable (calibration, visitor modes, craft-floor reflexes, font procedure). It is a good model for our own attribution.
- **What it is:** a 23-tool Claude Code "stack". The design parts are:
  - `/design-review`: live audit, then fix loop, then verify, with letter grades.
  - `/design-consultation`: builds DESIGN.md with the user.
  - `/plan-design-review`: 7 scored passes over a plan before code.
  - `/design-shotgun`: variants.
  - A lite checklist run on diffs.
- **Ideas worth learning:**
  - **First-impression protocol**, run before any analysis. The agent writes three things:
    - "The site communicates [what]."
    - "The first 3 things my eye goes to are: [1], [2], [3]" (the hierarchy check: "are these the 3 things the designer intended? If not, the visual hierarchy is lying").
    - A one-word verdict.
    - Plus the **Page Area Test**: "Areas you can't name in 2 seconds are poorly defined."
  - **Rendered design-system extraction** in one browser script: computed font families (flag more than 3), colours (flag more than 12 non-grey), heading sizes and weights, touch targets under 44px, navigation timing. For us this is an objective "five first-notice things" inventory.
  - **Confidence-tiered mechanical checks** with aggregation thresholds:
    - HIGH (grep-exact): side-tab borders, gradient text, bounce easing, zero-offset glow, display over 6rem, tracking under −0.04em, `system-ui` as primary face.
    - MEDIUM (aggregate): "if more than 60% of text containers center, flag it"; "if more than 80% [of border-radius values] share one value of 16px or more, flag it"; `backdrop-filter` on more than one container; a monospace stack on non-code selectors; no `::selection`, `caret-color`, `accent-color`, `scrollbar-color`, `text-underline-offset` or `font-variant-numeric` means browser surfaces are unthemed.
    - LOW (visual): the 3-column icon grid; cookie-cutter rhythm.
    - A classification of AUTO-FIX, ASK and POSSIBLE.
  - **Litmus checks and hard-rejection criteria**, which it credits to OpenAI's March 2026 guidance (see 2.6).
  - **Scoring:** 10 weighted categories graded A–F, plus a separate "AI Slop Score". "Each High-impact finding drops one letter grade. Each Medium-impact finding drops half a letter grade." Regression mode compares against `design-baseline.json`.
  - **Self-regulation in the fix loop:** a "design-fix risk" percentage (+15% per revert, +5% per component file, +20% for touching unrelated files); stop and ask above 20%; hard cap of 30 fixes.
  - **Font procedure** (derived from impeccable): name the audience's world and mode; shortlist three faces per role; apply exclusions; **verify each family's exact name, weights, licence and loading URL, and omit faces you cannot verify**. The "freely available faces on no default list" are kept "Short on purpose. A long list of 'good' fonts is how the last convergence happened." A banned-in-any-role list: Papyrus, Comic Sans, Lobster, Impact, … Raleway, Clash Display, Courier New.
  - **Taste profile across sessions:** approved and rejected fonts, colours, layouts and aesthetics, with confidence decaying by 0.95 per week. When a request contradicts a strong signal, it says so.
  - **Independent "outside voices":** a Codex run and a Claude subagent each receive the same product brief, never your draft ("keep your proposed direction out of their prompts"), then the proposals are synthesised.
  - **Three-layer research synthesis:** tried-and-true, new-and-popular, first principles, with a "EUREKA" check when first principles show the category convention fails this product.
  - **Copy checks:** "happy talk" word count ("This page has X words. Y (Z%) are happy talk."), theater phrases ("Built for the way you work", "Meet your new…"), "Get Started / Learn More as the only CTAs".
  - **Trunk test** for navigation (six questions; 3 or fewer answered is a FAIL); the **goodwill reservoir**.
- **Weak:** very long files (1,936 lines for design-review), heavy harness ceremony (telemetry, preambles, AskUserQuestion formats); the Krug-based UX principles are textbook. The grade weighting is arbitrary (AI Slop counts only 5% of the design score).
- **Verdict: (a)** first-impression protocol, rendered extraction, aggregation thresholds, font verification, the short-list principle, the taste ledger, independent proposals, the happy-talk count, and fix-loop self-regulation. **(b)** link `/design-review` as a complementary audit tool. **(c)** the grades as a headline metric (a single letter hides too much for our use).

### 2.5 taste-skill (Leonxlnx), including `redesign-skill`
- **URL:** https://github.com/Leonxlnx/taste-skill
- **Maintenance:** 90,813★, last commit 2026-09-26; v2 labelled "experimental". **License:** MIT (verified).
- **What it is:** a family of skills: `taste-skill` v2 (1,206 lines), `redesign-skill` (178 lines), variants (`gpt-tasteskill`, soft, brutalist, minimalist), image-generation-first skills, a brandkit skill, and a small "laziness research" folder.
- **Ideas worth learning (mechanically countable rules):**
  - **Eyebrow count:** "Maximum 1 eyebrow per 3 sections … count instances of `uppercase tracking` … If count > ceil(sectionCount / 3), the output fails." It is called "the #1 violated rule in production tests."
  - **Section-layout repetition:** "A landing page with 8 sections must use at least 4 different layout families"; **zigzag cap**: no third consecutive image-and-text split.
  - **Hero discipline:** headline ≤2 lines at desktop; sub-text ≤20 words and ≤4 lines; top padding ≤`pt-24`; at most 4 text elements; no trust strip, pricing teaser or tagline under the CTAs in the hero; the logo wall goes under the hero.
  - **CTA rules:** no CTA label wraps at desktop; **one label per intent** ("Get in touch" + "Let's talk" on one page fails).
  - **Premium-consumer palette ban**, with hex anchors: backgrounds `#f5f1ea #f7f5f1 #fbf8f1 #efeae0 #ece6db #faf7f1 #e8dfcb`, accents `#b08947 #b6553a #9a2436 #9c6e2a #bc7c3a #7d5621`, text `#1a1714 #1a1814 #1b1814`, plus a **palette-rotation rule** across consecutive projects.
  - **Italic descender clearance:** italic display words containing y, g, j, p or q need line-height ≥1.1 plus bottom reserve. A real rendering bug.
  - **"Production-test tells"** found by testing:
    - "Quietly trusted by" headers
    - poetic section labels ("From the field", "Field notes")
    - locale, time or weather strips
    - version labels in the hero (V0.6, BETA)
    - `Brand · No. 01` sub-eyebrows
    - scroll cues
    - decorative status dots
    - photo-credit captions on stock images
    - decoration text strips at the hero bottom (`BRAND. MOTION. SPATIAL.`)
    - floating top-right sub-text in section headers
    - generic step labels ("Stage 1 / Stage 2")
    - micro-meta sentences under eyebrows
    - scoring bars with filled tracks
    - a hairline under every row of a spec table
  - **Redesign protocol:** detect the mode (greenfield, preserve or overhaul; ask once if ambiguous). "What never changes silently": URL structure, primary nav labels, form field names and order ("breaks analytics + autofill"), logo and wordmark, legal and consent copy. "SEO migration is the #1 redesign risk."
  - **Strategic omissions** ("what AI typically forgets"): legal links, back navigation, a custom 404, form validation, a skip link, cookie consent.
  - **Copy self-audit:** re-read every visible string and flag grammatically broken, unclear-referent, "cute-but-wrong wordplay" and "passive-aggressive humility, fake-craftsman labels" strings. Rewrite; "AI-generated cute copy is worse than boring copy."
- **Weak or wrong for us:**
  - `redesign-skill` is a *refresh* skill: "Do not rewrite from scratch. Improve what's there."; fix priority is "Font swap → palette cleanup → hover states". That is the failure mode our skill exists to prevent.
  - It recommends Geist, Outfit, Cabinet Grotesk and Satoshi (Geist and Outfit are on impeccable's overused list), grain, mesh gradients, "staggered entry … Never mount everything at once", and picsum placeholders.
  - Content advice drifts into fabrication: "Use organic, messy data (47.2%, +1 (312) 847-1928)", "Randomize [blog] dates to appear real". That conflicts with our truth commitment.
  - "Page Theme Lock" (no light/dark section inversion) conflicts with chaptered pages.
  - The total em-dash ban is a blunt instrument (impeccable's saturation threshold is better).
  - "Hand-rolled decorative SVGs strongly discouraged" conflicts with our lesson that a site needs a drawn graphics layer.
  - The dials (VARIANCE 8, MOTION 6, DENSITY 4 as a baseline) are a default of their own.
- **Verdict: (a)** eyebrow ratio, layout-family and zigzag counts, one-label-per-intent, CTA no-wrap, italic descender clearance, the production-test tell list, what-never-changes-silently, strategic omissions, copy self-audit. **(c)** its redesign sequence, font and texture recommendations, and fake-data advice.

### 2.6 OpenAI `frontend-skill` (Codex), and the GPT-5.4 frontend post
- **URL:** `openai/skills` git history: added `skills/.curated/frontend-skill` in 82d2c5b (2026-03-20), removed in 11c6438 (2026-04-23, "Remove curated frontend and web game skills"). The content moved to docs (`developers.openai.com/api/docs/guides/frontend-prompt`, blocked; the current `openai-docs` prompting guide points there). Mirrors exist (e.g. `lingxling/awesome-skills-cn`).
- **Maintenance:** the repo has 27,765★; the skill is no longer maintained in-repo. **License:** Apache-2.0 (`LICENSE.txt` in the skill folder at 11c6438^, verified).
- **Ideas worth learning (the best checkable tests of the lot):**
  - "Before building, write three things: visual thesis … content plan … interaction thesis."
  - **Removal tests:** "If the first viewport still works after removing the image, the image is too weak. If the brand disappears after hiding the nav, the hierarchy is too weak."
  - **Litmus checks:** "Is the brand or product unmistakable in the first screen? Is there one strong visual anchor? Can the page be understood by scanning headlines only? Does each section have one job? Are cards actually necessary? Does motion improve hierarchy or atmosphere? Would the design still feel premium if all decorative shadows were removed?"
  - **Reject these failures:** "Generic SaaS card grid as the first impression; Beautiful image with weak brand presence; Strong headline with no clear action; Busy imagery behind text; Sections that repeat the same mood statement; Carousel with no narrative purpose; App UI made of stacked cards instead of layout."
  - **Viewport budget:** "If the first screen includes a sticky/fixed header, that header counts against the hero … `calc(100svh - header-height)`."
  - **Utility copy for product UI:** "If a sentence could appear in a homepage hero or ad, rewrite it until it sounds like product UI." Also "If deleting 30 percent of the copy improves the page, keep deleting."
  - The current OpenAI prompting guide (in `skills/.system/openai-docs/references/prompting-guide.md`): "Render the artifact before finalizing. Inspect the rendered output for layout, clipping, spacing, missing content, and visual consistency."
- **Weak:** a "full-bleed hero" default and "no cards by default" are house style; "Ship at least 2-3 intentional motions" pushes motion; it defaults to Framer Motion and a React stack.
- **Verdict: (a)** the removal tests, litmus questions, rejection list, viewport budget and utility-copy rule. All of these are directly checkable in our critique.

### 2.7 plugin87/ux-ui-agent-skills
- **URL:** https://github.com/plugin87/ux-ui-agent-skills · 1,484★ · last commit 2026-09-16 · **MIT** (verified).
- **What it is:** a design-system kit (DTCG tokens, 50 components, 138 DESIGN.md libraries) with **44 objective gates** (31 render in real Chrome), an adversarial `design-critic` agent, and blind cold-start evals whose outputs are kept unedited "as the record of what a cold-start agent produced".
- **Ideas worth learning:**
  - **Correctness is measured, quality is judged.** "A passing gate is never evidence of taste." The README separates "Is it correct? Measured" from "Is it any good? Judged, never scored".
  - **Reduced-motion parity gate** (`verify_reduced_motion.mjs`): render at `no-preference` and at `reduce`. Signal C, **PARITY LOSS**: "An element that is visible at no-preference becomes invisible under reduce — the classic bug where content starts at opacity:0 and is revealed only by an entrance animation." This is exactly the failure behind our 2026-09-10 lesson, turned into a check.
  - **Interactive truth gate** (`verify_interactive.mjs`): a control declaring `aria-pressed/expanded/selected` whose click changes nothing fails. "Invisible state": the attribute flips but nothing looks different.
  - **Token-by-intent:** a "Delete" control filled with a non-danger hue fails.
  - **Taste audit** from computed styles: heading/body ratio under 2.0× is HIGH ("premium ≥ ~2.5x"); 3 or more equal-size same-class siblings; paragraphs over ~80ch measured with a real `ch`; more than 6 accent hues; pure #000/#fff.
  - **Critic stance:** "The work is mediocre until the render proves otherwise." It screenshots at 1280 and 390 in light and dark, then clicks every control. "Every finding names its evidence." The output lists "What is actually good (at most two, so the rest is credible)" and "What I could not judge". "A critique that manufactures Critical findings to look rigorous is as useless as one that praises everything."
  - **Evals with provenance:** "a run without that context is not evidence of anything"; cold-start runs found 7 defects that in-session runs never hit.
- **Weak:** oriented to app and design-system UI, not marketing art direction; heavy (36k lines).
- **Verdict: (a)** reduced-motion parity, interactive truth, the critic stance and output format, and blind evals for our own skill. **(b)** link it as a gate reference.

### 2.8 Vercel Web Interface Guidelines, and `web-design-guidelines` in `vercel-labs/agent-skills`
- **URLs:** https://github.com/vercel-labs/web-interface-guidelines (911★, last commit 2026-08-17, **MIT**) · https://github.com/vercel-labs/agent-skills (31,659★, last commit 2026-08-28, MIT per README).
- **What it is:** a terse rule list (`command.md`) used as a review command outputting `file:line` findings. The agent skill **fetches the rules at run time** from the raw GitHub URL, so they are always current.
- **Ideas:** a dense set of checkable implementation rules, many missing from our technical QA:
  - never `transition: all`
  - `touch-action: manipulation`
  - `overscroll-behavior: contain` in drawers
  - `env(safe-area-inset-*)` for full-bleed layouts
  - `color-scheme: dark` plus `<meta name="theme-color">`
  - `scroll-margin-top` on heading anchors
  - `text-wrap: balance` or `pretty`
  - `…` rather than `...`, and curly quotes
  - non-breaking spaces (`10&nbsp;MB`, brand names)
  - `translate="no"` on brand names
  - `min-w-0` on flex children so text can truncate
  - `fetchpriority="high"` for above-fold images
  - "Autoplay motion >5 seconds … needs pause, stop, or hide controls"
  - "Interactive states increase contrast"
  - "Warn before navigation with unsaved changes"
  - placeholders end with `…` and show an example
- **Weak:** React/Next-centric; the copy rules are Vercel house style ("Title Case for headings/buttons", which contradicts sentence-case advice elsewhere); nothing on visual design quality.
- **Verdict: (a)** merge the missing implementation checks into `technical-qa.md` with attribution (MIT). **(b)** link. The runtime-fetch pattern is noted but not recommended for us (remote instructions are a trust risk, and our rules are versioned in-repo).

### 2.9 Emil Kowalski, `emilkowalski/skills`
- **URL:** https://github.com/emilkowalski/skills (clone URL `emilkowalski/skill` redirects) · 41,603★ · last commit 2026-09-24 · **MIT**.
- **What it is:** animation and design-engineering skills (review-animations with `STANDARDS.md`, animate, find-animation-opportunities, emil-design-eng, apple-design, mobile-native).
- **Ideas (concrete numbers):**
  - Frequency table: "100+ times/day … No animation. Ever."; tens of times a day, reduce drastically.
  - "Never `ease-in` on UI." Strong curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
  - Durations: button press 100–160ms, tooltips 125–200ms, dropdowns 150–250ms, modals 200–500ms. "UI animations stay under 300ms."
  - "Never `scale(0)`. Start from `scale(0.9–0.97)` + `opacity: 0`." Origin-aware popovers.
  - Stagger 30–80ms between items; "never block interaction while it plays".
  - Transitions are interruptible; keyframes restart from zero. `@starting-style` for entry.
  - Gate hover motion: `@media (hover: hover) and (pointer: fine)` ("touch fires false hovers on tap").
  - Mask imperfect crossfades with `filter: blur(2px)`; Framer Motion `x/y` shorthands are not hardware-accelerated.
- **Weak:** product-UI motion focus; little on marketing-page choreography.
- **Verdict: (a)** frequency rule, ease-in ban, curves, the scale(0) rule, the hover gate and stagger range into `ui-ux.md` §motion (MIT, attribute). **(b)** link.

### 2.10 huashu-design (花叔 / alchaincyf)
- **URL:** https://github.com/alchaincyf/huashu-design · 24,508★ · last commit 2026-09-22 · **MIT**.
- **What it is:** a Chinese-language HTML-native design skill (prototypes, slides, animation, MP4 export) with 20 "design philosophies", a 5-dimension review and a verification protocol.
- **Ideas (quotes translated by me):**
  - **Assets over spec.** Recognisability ranking: logo > product image or render > UI screenshot > colour values > fonts > mood words. "Extracting only colours and fonts without the logo, product images or UI violates this protocol"; "drawing the product with CSS silhouettes or SVG instead of real product images violates this protocol". Download verification: `file logo.svg` and `head -c 90` to confirm a real SVG rather than a 106-byte HTML shell from an SPA.
  - **Concept as dimension 0 with a veto:** "If the design still works after swapping the client or product name, it is a template: concept ≤5", and "when concept ≤5, the overall score is capped at 6.0". Also: "Cover all text and the logo. Can you still recognise the subject?"
  - **Rule 0 of verification, verify the verification tool:** "Before trusting any rendering, confirm the renderer itself renders correctly … run a known-correct file through the same renderer as a control." Then add a renderer-independent mechanical check (character-level text diff source against output, element counts): "a renderer can fool the eye; it cannot fool a count".
  - **Real-image honesty test:** "Remove this image. Is information lost? If not, it is decoration, and decoration is slop."
  - Heading/body ratio ≥2.5× ("title at least 3× body"); whitespace ≥40% of the area (60%+ for minimalism).
- **Weak:** much is about slides and video; the "design philosophies" are named-designer styles (Kenya Hara and so on), a costume risk.
- **Verdict: (a)** the swap test, the cover-text test, verify-the-verifier, the text-diff truth check, the asset ranking and download verification, the image honesty test. **(c)** philosophies, slides and video.

### 2.11 ibelick/ui-skills
- **URL:** https://github.com/ibelick/ui-skills · 9,203★ · last commit 2026-09-28 · **MIT**.
- **What it is:** `baseline-ui` (Tailwind app-UI constraints), `improve-ui` (read-only audit and plans), fixing-accessibility, fixing-metadata, fixing-motion-performance, create-design-md.
- **Ideas:**
  - `improve-ui`'s epistemics: a finding needs three proofs: **Contract** (a binding decision or direct contradiction), **Runtime** (proof the value reaches the surface), **Correction** (one change determined by evidence). "Source can prove token, typography, color, spacing … violations … Hierarchy, prominence, density, clarity, discoverability, usability, and perceived coherence require rendered or user evidence."
  - A **falsification pass**: "re-open every cited source and try to falsify each candidate"; stop at three findings.
  - `baseline-ui` rules: never `h-screen` (use `h-dvh`); animations never exceed 200ms for interaction feedback; pause looping animations off-screen; never animate large `blur()`/`backdrop-filter`; `will-change` only during animation.
- **Weak:** "NEVER add animation unless it is explicitly requested" and "NEVER use gradients" are app-UI minimalism that doesn't fit art-directed marketing; Tailwind-specific.
- **Verdict: (a)** the source-versus-render evidence rule and the falsification pass in our critique. **(b)** link. **(c)** baseline-ui bans for marketing.

### 2.12 OneRedOak/claude-code-workflows, `design-review`
- **URL:** https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review · 3,893★ · **last commit 2025-09-14 (a year stale)** · **MIT**.
- **What it is:** the early, widely copied Playwright-MCP design-review subagent, a slash command and a CLAUDE.md snippet.
- **Ideas:** **two-speed verification**: a "Quick Visual Check" immediately after every front-end change (navigate, compare to principles, screenshot at 1440, check console), then the comprehensive subagent review for milestones. "Live Environment First." A triage matrix (Blocker, High, Medium, Nit). Console errors are part of design review.
- **Weak:** generic ("world-class design standards of … Stripe, Airbnb, and Linear"); "Problems Over Prescriptions" makes agent-to-agent handoff vaguer, not better; WCAG 2.1 only; no anti-slop content.
- **Verdict: (b)** as historical baseline. **(a)** only the two-speed idea and console capture.

### 2.13 nextlevelbuilder/ui-ux-pro-max-skill
- **URL:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill · 131,175★ (the most-starred UI skill) · last commit 2026-09-27 · **MIT**.
- **What it is:** a Python search tool over CSV "design intelligence": 192 product palettes, 79 styles, 74 font pairings, 119 UX guidelines, 22 stacks, with a `--design-system` command that aggregates product → style → palette → typography and persists a MASTER.md.
- **What the data says:** `SaaS (General)` → "Glassmorphism + Flat Design", "Trust blue", primary `#2563EB`; `Micro SaaS` → primary `#6366F1` (indigo-500); `landing.csv` pattern 1 → "Hero parallax, feature card hover lift, CTA glow on hover", "Features: Card bg #FAFAFA". This is the generic output, codified. Category → palette lookup is precisely the "guess the aesthetic from the category" failure that impeccable and gstack test for.
- **Useful bits:** the query discipline ("one dominant intent, 2–5 terms, retry once, never present a 0-result search as data") and an honest-fallback rule. The UX guideline rows are fine but textbook.
- **Verdict: (c)** for direction. At most, cite it as a negative example of category-driven design.

### 2.14 dani-z/frontend-design-skill-benchmark (cautionary)
- **URL:** https://github.com/dani-z/frontend-design-skill-benchmark · 24★ · 2026-03-07 · no licence file.
- **What it is:** 3 tasks × with and without Anthropic's skill, graded on 6 assertions (avoid Inter, avoid purple, non-standard layout, CSS variables, keyframes present, "distinctive POV"). Score: 18/18 with the skill, 5/18 without.
- **Why it matters:** the "with skill" outputs are:
  - warm paper `#f5f0e8` + Playfair Display + DM Mono captions + "numbered feature grid" + `@keyframes fadeUp with staggered delays`;
  - warm paper `#f7f4ef` + Playfair numerals + DM Mono;
  - `#c8f135` acid lime + JetBrains Mono + "blinking cursor in logo, scanline texture overlay".

  These are clusters 1, 3 and 2 of the 2026 calibration list, and several detector rules (`italic-serif-display`, `numbered-section-labels`, `blinking-cursor`, `overused-font`). **A rubric that only checks first-generation tells certifies second-generation slop.**
- **Verdict: (a)** as a methodological lesson for our own evals: grade cluster membership and cross-output distance, not only the absence of Inter and purple.

### 2.15 b1rdmania/claude-brand-skills
- **URL:** https://github.com/b1rdmania/claude-brand-skills · 22★ · last commit 2026-02-23 · **no LICENSE file** (README: "Use these for your own projects, modify as needed. Attribution appreciated but not required."). Treat as ideas only.
- **Ideas:**
  - **The Blur Test:** "At 20% visibility (squint or blur the screenshot), the page's layout silhouette should be distinguishable from the anti-references. If a blurred screenshot of your page could be mistaken for a blurred screenshot of Stripe, the composition isn't distinctive enough."
  - **Diverge, kill, mutate:** 3–5 structurally different variants, each naming the convention it fights; "No blending. 'Take the header from V2 and the body from V4' is averaging. Kill one, keep the other." "Kill the safe ones."
  - An honest "confession" framing: "I can generate divergence but I can't evaluate it."
- **Verdict: (a)** the blur test (it makes our distance test measurable) and "kill, don't blend". Paraphrase; don't copy text.

### 2.16 JimLiu/baoyu-design
- **URL:** https://github.com/JimLiu/baoyu-design · 4,207★ · last commit 2026-09-23 · **MIT** (but `references/upstream-system-prompt.md` reproduces a proprietary product prompt; do not reuse that file).
- **Ideas:**
  - **Vision probe** before any screenshot-based verification. If the model or provider can't see images, "skip visual screenshot inspection and perform the text checks" and say so.
  - A read-only **fork verifier** that does not inherit the transcript and returns `done | needs_work`.
  - For overflow it dumps computed `box-sizing`, `display`, `min-height` and flex properties of the element and its parent, so the fix hits the root cause.
  - It collects every defined custom property and reports `var(--x)` references that are never defined.
  - "Don't say the work is done or complete — it's out for review until the verifier reports back."
- **Verdict: (a)** vision probe, the undefined-variable check, root-cause probe output. Paraphrase.

### 2.17 Laith0003/ux-skill
- **URL:** https://github.com/Laith0003/ux-skill · 76★ · last commit 2026-09-25 · **MIT**.
- **What it is:** an offline regex linter (154 anti-pattern entries, last updated 2026-09-23), an MCP server and brand specs.
- **New tells worth keeping:**
  - `placeholder-as-pricing` ("$9 / $19 / $29 / $49 / $99 / $199 are the prices AI reaches for")
  - `trust-badge-no-source` ("Trusted by 1000+ teams")
  - `round-number-stats`
  - `timestamp-just-now` in static markup
  - `footer-built-with-love-coffee`
  - `decorative-accent-ruler` (short 1–2px ornament under headings)
  - `aspect-ratio-1-1-default`
  - `text-3xl md:text-4xl lg:text-5xl` "tutorial cadence"
  - `letterspacing-tracking-tight-display` (tracking-tighter on 800+ weight as "the AI hero recipe")
  - `cta-buttons-clustered-in-hero` (3 or more)
  - `full-viewport-width-overflow` (`100vw` includes the scrollbar)
- **Weak:** mostly regex over source, many code-hygiene rules, and `imagery-mandatory-missing` contradicts typography-only directions.
- **Verdict: (a)** harvest the handful of new tells into our anti-patterns. **(c)** the tool itself.

### 2.18 Google Stitch skills, VoltAgent/awesome-design-md and the DESIGN.md format
- **URLs:** https://github.com/google-labs-code/stitch-skills (8,385★, 2026-08-17, **Apache-2.0**) · https://github.com/VoltAgent/awesome-design-md (118,516★, 2026-09-21, **MIT**; a fork titled "pre-paywall" notes links now route to a paid getdesign.md).
- **What it is:** DESIGN.md (introduced by Google Stitch) is a plain-markdown design system: Visual Theme & Atmosphere, Color Palette & Roles (descriptive name + hex + role), Typography Rules, Component Stylings, Layout Principles. awesome-design-md is 73 DESIGN.md files "extracted" from brand sites (Stripe, Linear, Vercel and so on) so agents can "build me a page that looks like this."
- **Ideas:** DESIGN.md is becoming a de facto interop file read by Stitch, Claude Design and several skills. The "descriptive name + hex + functional role" colour entry is a good pattern.
- **Weak:** brand-clone files encourage imitation, which is the opposite of our research rule ("extract principles, never sections"). Stitch's `taste-design` recommends Fraunces and Instrument Serif as "distinctive modern serifs" and bans centred heroes at variance > 4. That is another snapshot of drifting consensus.
- **Verdict: (a)** keep our `templates/DESIGN.md` loosely compatible with the Stitch section names so other tools can read it (a cheap interop win). **(c)** brand-clone files as direction sources.

### 2.19 meodai/skill.color-expert
- **URL:** https://github.com/meodai/skill.color-expert · 594★ · last commit 2026-09-23 · **CC BY 4.0** (attribution required; permits adaptation).
- **Ideas:**
  - Gamut mapping: "Reduce chroma, not lightness or hue" when an OKLCH colour is out of gamut (Culori `clampChroma`); JS `oklch→hex` truncates, and CSS maps automatically.
  - The test for a sequential ramp is a **flat perceptual derivative**, in colour and in greyscale.
  - Relative colour syntax for hover states: `oklch(from var(--brand) calc(l * 0.9) c h)`.
  - Tools: Huetone, Leonardo, dittoTones, Color Buddy (lint), okpalette (OKLCH extraction from images, useful for sampling logo colours).
  - "Never recommend coolors.co: it … picks from a hardcoded list of 7,821 pre-made ones."
- **Verdict: (a)** gamut rule and ramp test into `design-theory.md` (with CC BY attribution). **(b)** link as the deep colour reference.

### 2.20 GoogleChrome/modern-web-guidance
- **URL:** https://github.com/GoogleChrome/modern-web-guidance · last commit 2026-09-21 · **Apache-2.0** (listed in Anthropic's official plugin marketplace).
- **What it is:** a search CLI (`npx modern-web-guidance search "<query>"`) over guides with Baseline support status, covering view transitions, scroll-driven animation, `font-size-adjust`, `contrast-color()`, scrollbars, forms and more.
- **Ideas:**
  - **Scroll-driven reveals with no JavaScript:** keyframes with only a `from` state and `backwards` fill, `animation-timeline: view()`, `animation-range: entry`, wrapped in `@media (prefers-reduced-motion: no-preference)` and `@supports ((animation-timeline: view()) and (animation-range: entry))`. The page is finished without JS, and unsupported browsers just see content. This is a stronger version of our "reveal, written safely".
  - `font-size-adjust: from-font` for visually stable font fallbacks (Baseline 2024).
- **Verdict: (a)** add the CSS scroll-driven reveal as the preferred form in `implementation.md`, with our JS inversion as fallback. **(b)** link the tool for implementation lookups.

### 2.21 Verification MCPs and tools
- **Chrome DevTools MCP**: https://github.com/ChromeDevTools/chrome-devtools-mcp · 52,695★ · 2026-09-28 · **Apache-2.0**. Tools include `take_screenshot`, `take_snapshot`, `emulate`, `resize_page`, `list_console_messages`, `get_css_styles`, `performance_start_trace`/`performance_analyze_insight` (with CrUX field data), `lighthouse_audit` (accessibility, SEO, best practices and "agentic browsing"; **excludes performance**), `screencast_start`. **(b)** link for Phase 8.
- **Playwright MCP**: https://github.com/microsoft/playwright-mcp · 37,653★ · 2026-09-25 · **Apache-2.0**. The standard browser tool behind most design-review agents. **(b)**
- **addyosmani/web-quality-skills**: 2,852★ · 2026-08-24 · **MIT**. Notes that Lighthouse 13 moved Performance to shared Performance Insights (do not demand retired audit IDs); keeps "measured findings separate from hypotheses found only in code". **(b)**
- **arvindrk/extract-design-system**: 229★ · 2026-06-19 · **MIT**. `npx extract-design-system <url>` extracts colours, fonts, spacing, radius and shadows from any public site via Playwright. Useful for the audit (objective first-notice inventory) and research (measure reference sites). Its safety line fits us: "Do not treat a single page as proof of a whole product design system." **(b)**
- **Community-Access/accessibility-agents**: 416★ · 2026-09-23 · **MIT**. 108 specialist skills (contrast-master, aria-specialist, cognitive-accessibility and more). It covers `forced-colors` (Windows High Contrast), which our technical QA does not. **(b)**, and **(a)** the forced-colors check.
- **Figma MCP** (available in this environment): relevant only when a redesign starts from Figma. **(c)** for our core flow.

### 2.22 Leaked platform prompts (v0, Lovable) via x1xhlol/system-prompts-and-models-of-ai-tools
- **URL:** https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools · last commit 2026-08-11 · repo **GPL-3.0**; the prompts themselves are proprietary. **Ideas only; do not copy.**
- **v0:** "ALWAYS use exactly 3-5 colors total", at most 2 font families, "Avoid gradients entirely unless explicitly asked", "NEVER generate abstract shapes like gradient circles, blurry squares, or decorative blobs as filler", no emoji icons, and a `GenerateDesignInspiration` tool called before design work (a separate model writes the brief).
- **Lovable:** mandates semantic tokens, and its example tokens are `--gradient-primary: linear-gradient(135deg, …)` and `--shadow-glow: 0 0 40px hsl(var(--primary-glow) / 0.4)`, plus "wow them … Otherwise you'll feel bad." **This is a source of the glow and gradient tells** in the training data of later models.
- **Verdict: (c)** as instruction; useful as an explanation for why glow and gradient tokens recur.

### 2.23 Others examined (shorter)
- **superdesigndev/superdesign-skill** (610★, MIT): tied to a paid canvas CLI. One good idea, the **logo invariant**: an available logo must render wherever the design has a logo position; "never substitute initials, emoji, generic marks, invented SVGs, or text alone". **(a)** that line; **(c)** otherwise.
- **Owl-Listener/designer-skills** (2,788★, MIT): 60+ textbook skills (Fitts, Hick, proximity, critique-*). `critique-brand-consistency` checks a render against mood.md, voice.md and tokens.md, and "if a file is missing … do not invent brand rules". **(c)**, since we already cover the canon.
- **ehmo/platform-design-skills** (MIT): HIG and Material distillations; the source of impeccable's native references. **(c)** (not our platform).
- **bencium** (MIT): generic app-UI audit; also uses a LESSONS.md of design corrections, independent confirmation of our lessons-log pattern. **(c)**
- **mistyhx/frontend-design-audit** (91★, MIT): 15 heuristics with 0–4 severity. **(c)** (covered by our ui-ux.md).
- **MickeyAlton33/web-designer-plugin** (100★, MIT): a "signature move" requirement and a brief-before-code block; its "Rotate through: warm editorial, bold brand color, …" is itself a convergent menu. **(c)**
- **TuahaJawaid/looks-expensive** (22★, MIT): derivative of impeccable (has a NOTICE). **(c)**
- **Ilm-Alan/frontend-design** (127★, MIT): eight "aesthetic anchors" with exact tokens (one, "Aurora Maximalism", *is* the purple-glow look). Costumes, not derivation. One good device: each anchor has a **"Breaks if:"** line naming what would violate it. **(a)** that device only.
- **miqdadbadjuber/anti-slop** (MIT): rules split into a "Hard Gate" and a **"Purpose-Gate (technique allowed, purpose required)"**, a useful middle category between banned and free. **(a)** the categorisation.
- **Cursor rules** (`spencergoldade/cursor-designer` GPL-3.0; `saralobo/rules-design-bible`, no licence; `PatrickJS/awesome-cursorrules` CC0): stack conventions and Figma API recipes; nothing on art direction or verification. **(c)**
- **wilwaldon/Claude-Code-Frontend-Design-Toolkit** (1,151★) and **bergside/awesome-design-skills** (2,962★): discovery lists only. **(b)** for readers, not for the skill.
- **Design Arena** (designarena.ai, secondary via search): crowdsourced Bradley–Terry leaderboard for website generation (Sept 2026 leaders reported as Kimi K3 1361, Muse Spark 1.3 1343, Claude Fable 5.1 1330). Measures preference, not brand fit. **(c)**

---

## 3. Cross-cutting ideas worth adopting (ranked)

Ranked by expected impact on our failure modes (refresh-not-redesign, house style, broken renders, invented proof), times how checkable they are, divided by cost. Each item names its sources and a concrete change. No edits to `skills/` were made in this stream.

### 1. Name the model's prior, including Claude's own, and test against it at the direction stage
**Sources:** Anthropic frontend-design (5 clusters with hexes), impeccable (`<claude>` rendition prior, category and category-plus-avoidance test, ground-drift hunt), gstack ("three looks"), taste-skill (premium-consumer hex bans), dani-z (evidence that the clusters pass naive rubrics).
**Proposal:** in `anti-patterns.md`, retitle "The skill's own house style" to **"The model's prior (and this skill's house style)"**.
- Open it with the calibration clusters and their hex anchors: cream `#F4F1EA`, terracotta `#D97757`, tinted near-black `#0B0B0B`/`#111`, acid-green or vermilion on near-black, the broadsheet hairline look, the SaaS-card kit with `rgba(0,0,0,.1)`, and the template chrome list (eyebrows, `A · B · C` meta strings, `WORD — fragment` labels, mono data labels, `→` appended to CTAs).
- State plainly that our 2026-09-07 house style is clusters 1 + 3 + 5.
- Add two tests to `art-direction.md` and fields to `templates/DESIGN.md`:
  - **(a) the similar-brief test**: write one line of what this plan would look like for a *different* company in the same category. If it is the same plan, it is the prior.
  - **(b) the category test**: "could someone guess this direction from the category alone, or from the category plus 'avoid the obvious'?"
- Add a Claude-specific line: warm, bookish, craft, family and "premium" subjects pull towards cream, italic serif and lamplight. If the direction says paper, ivory or cream and the logo does not, treat that palette as already spent.

### 2. Replace recommendation lists with a dated saturation list and a verification procedure for type
**Sources:** impeccable reflex faces and detector `OVERUSED_FONTS`, gstack (short-on-purpose list, verify name, weights, licence and URL), Anthropic cookbook (historical evidence), Stitch taste-design versus taste-skill v2 (contradicting "distinctive" picks), our lesson (Instrument Serif).
**Proposal:**
- Add a **"Saturated faces (as of 2026-09)"** list to `design-theory.md` §typography: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Arial, Helvetica, system-ui, Space Grotesk, Space Mono, Fraunces, Playfair Display, Cormorant, Lora, Crimson, Newsreader, Syne, IBM Plex Sans/Serif, DM Sans/Serif, Outfit, Plus Jakarta Sans, Instrument Sans/Serif, Geist, Mona Sans, Recoleta.
- Rule: a saturated face may be the *display* voice only when it is a documented brand asset (our existing exemption). A subject association ("books want a serif", "tech wants mono") is never the reason.
- Procedure: shortlist three faces per role from the audience's world; verify exact family name, weights, licence and loading URL from the foundry or Google Fonts/Fontshare listing; record them in DESIGN.md.
- **Do not add a "good fonts" list.**
- Date the list and tell future editors to refresh it rather than extend it.

### 3. A per-user output ledger, read in Phase 3 and cited by the distance field
**Sources:** gstack taste profile (approve/reject, 0.95/week decay), Anthropic "creatives have memory … jot down notes", taste-skill palette rotation, our Commitment 3 ("must not come out looking like siblings").
**Proposal:** add `references/ledger.md`, an append-only table next to `lessons.md` with one row per finished redesign:
- date and project
- display face and body face
- palette hexes (surface, text, accent) and colour strategy
- hero form, chapter kinds, motif
- the user's verdicts ("liked the timeline", "rejected mono labels")

Phase 3 reads the last rows. `templates/DESIGN.md` "Distance from the house recipe" must cite them: "differs from <project> on face, palette family and hero form". Lessons record mistakes; the ledger records outputs, and the house-style failure was about outputs.

### 4. A fresh-context reviewer for the self-critique, anchored on renders rather than on our intentions
**Sources:** impeccable finish-reviewer (no transcript; inventory before contract; dispositions; "narration is not evidence"; Assessment A before detector), plugin87 design-critic ("mediocre until the render proves otherwise"; at most two positives; "what I could not judge"), gstack outside voices, baoyu fork verifier, OneRedOak design-review agent.
**Proposal:** in `visual-qa.md` Phase 7, when a subagent tool exists, run the critique in a subagent that receives only:
- the audit summary (what is sold, to whom)
- DESIGN.md's concept, refuses and first-viewport lines
- the capture file paths (old and new)
- `templates/critique.md`

It must list what it sees in the first viewport *before* reading DESIGN.md. After fixes, send the recaptures back for **resolved / partial / unresolved** scoring. The build thread may not mark its own fixes resolved. If no subagent is available, say so in the report (impeccable's "degraded" banner idea). This directly targets the "optimism of the builder" that let several of our lessons ship.

### 5. Removal tests, and a blur test, in the critique template (most can be scripted)
**Sources:** OpenAI frontend-skill (remove the image; hide the nav; remove decorative shadows; headlines-only scan), huashu (swap the name; cover the text and logo), impeccable (OWN-WORLD "recognizable with all content removed"; memory test), b1rdmania (blur silhouette versus anti-references), gstack (first three fixations; page-area test).
**Proposal:** add rows to `templates/critique.md`, each with a procedure:
- **Name swap:** replace the company name and product nouns. Would the page still fit a competitor? If yes, the concept fails, and nothing else can score yes (huashu's veto).
- **Content-free render:** inject `* { color: transparent !important }` and hide `img[alt*=logo]`. Is it still recognisably *this* design?
- **Image removed:** hide the hero image. If the first viewport still works, the image is decoration.
- **Shadows removed:** inject `* { box-shadow: none !important }`. Does it still feel finished?
- **Headlines only:** extract h1–h3 in order. Does the story read?
- **Blur silhouette:** first viewport at 1440, downscaled to ~96px and blurred, beside the old site and the last ledger project. Would a stranger mistake them?
- **First three fixations:** named, compared with DESIGN.md's intended order.

`scripts/capture.mjs` could gain `--variant no-text|no-images|no-shadows` flags to produce these captures. Cheap and mechanical.

### 6. Bounded rounds with batched fixes, and a stop rule
**Sources:** impeccable (two inspection rounds, fixes batched, "stop the moment a round resolves nothing"), gstack (risk % and 30-fix cap), OpenAI ("revise until the rendered output matches", unbounded, the thing the others moved away from).
**Proposal:** our "expect at least one iteration" and "no remaining no" gate stay. Add a budget:
- each critique round produces one batch of fixes, then one full recapture;
- at most three self-directed rounds;
- if a "no" survives round three, or a round resolves nothing, stop and put the critique table in front of the user with the captures, rather than polishing indefinitely.

This prevents both premature stopping and thrash.

### 7. A rendered tell scanner (our own script), plus the optional impeccable detector
**Sources:** impeccable detector (61 rules, thresholds), gstack HIGH/MEDIUM aggregation thresholds, plugin87 `taste_audit`/`slop_tells`, Laith0003 tells, taste-skill eyebrow ratio.
**Proposal:** add `scripts/tells.mjs`, run on the built site at 1440 and 390, reporting counts rather than verdicts:
- font families in use against the saturated list (display role flagged)
- largest heading ÷ body size (flag < 2.0; any adjacent role step < 1.25)
- % of text containers centred (flag > 60%)
- % of border-radius values sharing one value ≥16px (flag > 80%)
- eyebrow count (short uppercase or tracked element immediately before h1/h2) against ceil(sections/3)
- coloured `border-left`/`border-right` > 1px on boxes (our accent-stripe lesson)
- `background-clip: text`
- zero-offset coloured shadows
- cream ground (the page background within the cream hex family, or OKLCH L > 0.93 with warm hue and low chroma; exact thresholds to be tuned against captures)
- em-dash density (≥8 at ≥1 per 500 characters)
- buzzword hits
- runs of ≥3 equal siblings
- paragraphs > 80ch
- body < 16px
- tracking < −0.04em
- display > 6rem
- unthemed browser surfaces (no `::selection`, `accent-color`, `text-underline-offset`)
- `document.fonts` failures
- console errors

The skill treats output as leads for the critique, never as a pass. Optionally document `npx impeccable detect <url> --json` as a second opinion (the user installs it; Apache-2.0).

### 8. Make the reveal trap impossible: reduced-motion parity, a no-JS capture, and CSS scroll-driven reveals
**Sources:** plugin87 `verify_reduced_motion` (parity loss), impeccable `content-hidden-at-rest`, Google modern-web-guidance (scroll-driven entry effects under `@supports` and reduced-motion guards), Emil (`@starting-style`, interruptibility), our lessons 2026-09-10.
**Proposal:**
- `capture.mjs` gains a parity pass: render with `prefers-reduced-motion: reduce` and with JavaScript disabled. Report any element with visible text or image at no-preference whose bounding box or opacity makes it invisible in either variant.
- `implementation.md` "The reveal, written safely" leads with the CSS-only scroll-driven form:
  - keyframes with only a `from` state and `backwards` fill
  - `animation-timeline: view()` and `animation-range: entry`
  - inside `@media (prefers-reduced-motion: no-preference)` and `@supports`
- Keep our JS inversion as the fallback.

### 9. Verify the verifier: a control capture, file validation and a vision probe
**Sources:** huashu Rule 0 (control experiment with a known-good file), impeccable capture validity, baoyu vision probe, our lessons (headless grey boxes chased twice).
**Proposal:** add to `visual-qa.md` "Capturing reliably":
- **(a)** Before trusting the first batch, capture one known-good live page (the current production site) with the same script and the same flags. If images come out grey there too, it is the harness, not the page.
- **(b)** After each batch, open every file once and confirm it shows what its name says: right route, document top, no blank bands, sensible dimensions.
- **(c)** If the session cannot view images, say so and switch to DOM checks: visible text length, element counts, bounding boxes, `naturalWidth`, overflow, console. Do not claim visual review.

### 10. A mechanical truth check: diff the claims between the old and new site
**Sources:** huashu (character-level text diff and counts, independent of the renderer), impeccable ("truth binds claims, not demonstrations"), taste-skill (fake-precise numbers flagged), Laith0003 (`placeholder-as-pricing`, `trust-badge-no-source`, `round-number-stats`), our Commitment 2.
**Proposal:** a small `scripts/claims.mjs`, or a documented procedure, that extracts visible text from the old and new builds for each route and lists:
- **(i)** numbers, prices, percentages, dates, customer or brand names and quotes present on the new site but found neither on the old site nor in the repo or user material. Each must be sourced or removed.
- **(ii)** facts present on the old site but missing from the new one. Each needs a conscious "remove" entry in DESIGN.md.

This turns "never invent proof" and "keep every fact" into a checked list. No other project has it as a redesign-specific check, and it fits our core principle exactly.

### 11. Direction-contract fields that force a real decision
**Sources:** impeccable (THESIS with "the arrangement it refuses", OWN-WORLD, FIRST VIEWPORT exact, "if a block reads like a mood, the direction is not decided yet"; seven candidates across ≥3 material families; the rut and its predictable opposite excluded), Ilm-Alan ("Breaks if:"), OpenAI (visual thesis and interaction thesis), gstack (memorable-thing question).
**Proposal:** `templates/DESIGN.md` gains:
- **Refuses:** the page this category always ships, and its predictable opposite.
- **Candidate concepts considered:** 5–7 from the company's own world, spanning ≥3 material families, with the chosen one and why the others lost.
- **First viewport, exactly:** what, where, at what scale, and where the action sits.
- **Breaks if:** three things that would betray this direction.
- **Memory test:** what a visitor describes an hour later. If the answer is a mood, the direction is not done.

### 12. Evidence rules for every critique answer
**Sources:** impeccable ("do not substitute a bare 'yes'"), ibelick (source proves tokens; hierarchy and clarity need rendered evidence; falsification pass), plugin87 ("every finding names its evidence").
**Proposal:** in `templates/critique.md`, a "yes" requires a capture filename plus what in it shows the answer. Hierarchy, rhythm and clarity questions cannot be answered from source. Before hand-off, re-open each cited capture and try to falsify the "yes".

### 13. Implementation and technical-QA additions (small, checkable)
**Sources:** Vercel guidelines, Community-Access (`forced-colors`), baoyu (undefined `var(--x)`), Google (`font-size-adjust: from-font`), Emil (motion numbers, hover gate), impeccable and gstack (browser surfaces), OneRedOak, baoyu and impeccable (console errors).
**Proposal:**
- **`technical-qa.md`:**
  - console errors and uncaught exceptions captured during every capture run
  - undefined custom properties
  - `forced-colors: active` render
  - no `transition: all`
  - `color-scheme` and `theme-color` set
  - `scroll-margin-top` on anchors
  - `overscroll-behavior: contain` in the mobile menu
  - `env(safe-area-inset-*)` on fixed bars
  - `touch-action: manipulation`
  - `text-wrap: balance` on headings
  - curly quotes, `…` and `&nbsp;` in figures and units
  - `translate="no"` on brand names
  - `100vw` overflow (scrollbar)
- **`implementation.md`:** themed browser surfaces (`::selection`, `caret-color`, `accent-color`, `scrollbar-color`, `text-underline-offset`, `tabular-nums`); `font-size-adjust: from-font`.
- **`ui-ux.md` §motion:**
  - frequency rule (no animation on 100+/day interactions)
  - never ease-in on UI
  - named strong curves
  - never `scale(0)` (start 0.9–0.97)
  - stagger 30–80ms
  - hover motion gated by `@media (hover: hover) and (pointer: fine)`

### 14. Surface modes inside a marketing redesign, and light or dark from the use scene
**Sources:** impeccable, gstack and OpenAI (Persuade, Operate, Read, Experience; classify per section for hybrids; "If a sentence could appear in a homepage hero … rewrite it until it sounds like product UI"; "Light or dark comes from the use scene").
**Proposal:** a short section in `web-design.md`:
- A redesign touches Read pages too (blog, docs, changelog, legal): measure 65–75ch, no hero theatre, headings closer to what follows.
- Product fragments we rebuild as HTML are Operate surfaces and need utility copy, not marketing voice.
- Add a one-sentence use-scene line to DESIGN.md that decides light or dark.

### 15. Name the colour strategy before the colours
**Sources:** impeccable, gstack (Restrained, Committed, Full palette, Drenched).
**Proposal:** `design-theory.md`: our 60/30/10 budget is the *Restrained* strategy. Add Committed (one saturated hue carries 30–60% of the surface), Full palette and Drenched as named alternatives. DESIGN.md states which one, which stops 60/30/10 being applied to a brand whose identity *is* a field of colour. This complements the existing "one identity field per page" rule rather than replacing it.

### 16. Copy tells for marketing pages (our copy section has three bullets)
**Sources:** gstack (theater phrases, happy-talk ratio, "Get Started/Learn More only"), impeccable (aphoristic cadence "X. No Y.", theater framing), taste-skill production tells, Laith0003 (default pricing tiers, unsourced trust claims, "Built with love").
**Proposal:** expand `anti-patterns.md` §Copy with:
- launch-theatre phrases ("Built for the way you work", "Meet your new…", "The future of…")
- slogan cadence repeated across sections ("X. No Y.", "Not a feature. A platform.")
- poetic section labels ("Field notes", "From the field", "On the bench")
- micro-meta sentences under headings
- "Quietly trusted by"
- decorative locale, time or weather strips
- version labels and scroll cues
- generic step labels
- one label per CTA intent
- the happy-talk ratio as a critique measurement

### 17. Brand-asset protocol details
**Sources:** huashu (logo > product image > UI screenshot > colour > font; verify downloads with `file` and `head -c`), superdesign (logo invariant), meodai (okpalette and OKLCH extraction).
**Proposal:** `audit.md` §logo:
- verify extracted logo files are real (SPAs often return an HTML shell)
- rank what to collect: logo, then product imagery or real UI, then colours, then fonts
- wherever the design has a logo slot, the real logo renders; never initials, glyphs or invented marks
- sample logo colours in OKLCH

### 18. Independent candidate directions, then "kill, don't blend"
**Sources:** gstack outside voices (same brief, not your draft), b1rdmania diverge/kill/mutate, impeccable challengers and verdicts.
**Proposal (optional, when subagents exist):** in Phase 3, spawn one or two subagents with only the audit and brief to propose a concept line, face roles, palette strategy and hero form. Compare them with ours on two axes (company-specificity, product clarity) and pick one whole. Never merge parts of two directions. Record the declined ones in DESIGN.md's candidate list.

### 19. Evals for our own skill that measure second-order convergence
**Sources:** dani-z (flawed rubric), plugin87 (blind cold-start evals with provenance), impeccable (cluster calibration).
**Proposal** for `research/experiments`:
- run the skill blind (a subagent without this conversation) on three fictional or real companies from different categories;
- grade (i) cluster membership against the calibration list, (ii) pairwise distance between the three outputs (faces, palette family, hero form, blur silhouette), (iii) claims-diff violations, (iv) render-validity failures;
- keep the raw outputs unedited.

### 20. Structural ideas for organising the skill
**Sources:** impeccable (craft floor loaded immediately before edits, not during planning; model-specific `<claude>` blocks; two-tier hooks), security-guidance plugin in the official marketplace (pattern warnings on edit plus review on Stop), Vercel (rules fetched at run time), taste-skill and miqdadbadjuber (hard bans versus purpose-gated techniques).
**Proposals:**
- **(a)** Split `anti-patterns.md` into **Hard bans** (fabricated proof, content hidden at rest, accent-stripe cards, emoji icons) and **Purpose-gated** techniques (eyebrows, numbered markers, mono, glass, gradients, grain: allowed only with a written reason in DESIGN.md). This reduces the all-or-nothing tension the ecosystem shows (impeccable's absolute eyebrow ban versus Anthropic's "structure is information").
- **(b)** A short "floor" block of pre-edit checks read at the start of Phase 5.
- **(c)** Optionally document a PostToolUse hook recipe that runs `tells.mjs` or the impeccable detector on edited files, off by default, since hooks change the user's settings.
- **(d)** Do not fetch rules at run time.

---

## 4. Anti-patterns and tells of AI UI listed by these sources (deduplicated)

Legend: **✓** already in our `anti-patterns.md` (or elsewhere in the skill) · **~** partly covered · **NEW** not covered. Sources: A = Anthropic frontend-design; Ck = Anthropic cookbook; I = impeccable (skill or detector id); G = gstack; T = taste-skill; O = OpenAI frontend-skill; P = plugin87; L = Laith0003; H = huashu; V = v0 prompt; E = Emil Kowalski; Vc = Vercel; B = b1rdmania; Bo = baoyu.

### Palette and surface
- Purple/violet/indigo gradients; blue-to-purple; cyan-on-dark (A, Ck, I `ai-color-palette`, G, T, L, V, H) ✓
- **Warm cream or paper ground as the "tasteful" default** (`#F4F1EA`; taste-skill's hex family `#f5f1ea…#e8dfcb`) with terracotta or clay (`#D97757`), brass or oxblood accents and espresso text (A, I `cream-palette`, G look 1, T) ~ (named only as our house style; no hexes, not framed as the model prior) NEW framing
- Near-black with one acid-green, neon or vermilion accent and glowing edges (A, I, G look 2) NEW
- Tinted near-black `#0B0B0B`/`#111` standing in for black (A) NEW. Note that T and I say the opposite: "never pure #000". The real rule is "don't default either way".
- Zero-offset coloured glow shadows; radial halo or spotlight behind the hero (I `dark-glow`, `radial-halo`, `radial-spotlight-glow`, G, L, Lovable's `--shadow-glow`) ~ ("glowing blobs")
- Hairline border plus wide soft shadow, the "ghost card" (I `gpt-thin-border-wide-shadow`) NEW
- One radius on everything; the same `rgba(0,0,0,.1)` shadow under everything (A, G ">80% share one radius ≥16px", I, P, T) ✓ ("identical rounded containers")
- Glassmorphism by default; `backdrop-filter` on more than one container (I, G, T, L) ✓
- Grain or noise overlays, repeating stripes, grid-paper backgrounds without a real canvas (I `repeating-stripes-gradient`, `codex-grid-background`, L `noise-texture-overlay`; note Ck and T once *recommended* grain) ~ (grain listed)
- Gradient text (A, I `gradient-text`, G, L) NEW (not listed)
- Gradient buttons as the primary CTA (G) NEW
- Grey text on coloured backgrounds (I `gray-on-color`) NEW
- Light or dark chosen by category ("dark because dev tool") instead of use scene (I, G) NEW
- Multiple accent colours; accent everywhere (T, P, V "3–5 colors") ✓ (60/30/10, one identity field)

### Typography
- Inter, Roboto, Arial or system-ui as the display voice (everyone) ~ (we only say "keeping existing families")
- **Second-wave saturated faces:** Fraunces, Instrument Serif/Sans, Playfair, Newsreader, Space Grotesk, Geist, Plus Jakarta, DM Sans/Serif, Outfit, Syne, IBM Plex, Recoleta, Cormorant, Lora, Crimson (I, G, T) NEW
- **One word or phrase accented in italic, bold or colour in a headline**; italic serif display as the hero (A, I `italic-serif-display`, G look 3, T) ~ (named as house style only)
- Tracked all-caps eyebrow above every heading; hero eyebrow or pill chip (A, I `kicker-above-heading`, `hero-eyebrow-chip`, G, T ratio) ✓ (house style, tracked-caps lesson)
- Monospace for small data labels or as a "technical" costume (A, I, G) ✓
- Numbered section markers 01/02/03 when the content is not a sequence (A, I `numbered-section-labels`, T) NEW
- Meta strings joined with middle dots ("A · B · C"); `WORD — fragment` labels (A, T "middle-dot rationed") NEW
- `→` appended to link and button text; bouncing arrow on CTAs (A, L) NEW
- Flat type hierarchy: adjacent roles < 1.25×, heading/body < 2× (I `flat-type-hierarchy`, P, H "≥2.5×") ~ (design-theory has a scale; no numeric floor)
- Oversized display > 6rem on a long headline; `tracking-tighter` on 800+ weight as the "AI hero recipe"; tracking < −0.04em (I `oversized-h1`, `extreme-negative-tracking`, G, L) NEW
- Title Case headings (L, T; contradicted by Vercel's guidelines) NEW (ours implies sentence case)
- Italic descenders clipped by `leading-none` (T) NEW
- Em-dash saturation; spaced em-dash labels (I threshold ≥8 at ~1/500 chars, T total ban, A) NEW
- Tailwind `text-3xl md:text-4xl lg:text-5xl` tutorial cadence (L) NEW

### Layout and composition
- Hero = headline + paragraph + two buttons + screenshot; centred everything (>60% centred containers) (A, G, O, T, L) ✓
- Hero-metric template: big number + small label + stats + gradient (A, I, G "three big numbers") NEW
- Three equal cards; icon-in-rounded-square above every heading (A kit, I `icon-tile-stack`, G, T, L) ✓
- Nested cards (I, G) ~
- Same layout family repeated; zigzag of 3+ image-and-text splits; fewer than 4 layout families in 8 sections (T, G cookie-cutter rhythm) ~ (we say "different compositions per chapter"; no count)
- Split header: big headline left, tiny explainer floating right (T) NEW
- Hero overflowing the first viewport; sticky header not counted against the hero (T, O viewport budget, I `first-viewport-column-overflow`) NEW
- Trust strip, pricing teaser or tagline crammed under the hero CTAs; 3+ CTAs in the hero (T, L) NEW
- Bento with empty cells or all white-on-white text tiles (T) NEW
- Hairline under every row of a long spec list (T) NEW
- Carousel with no narrative purpose; auto-scrolling logo marquee (O, G, I `marquee`) NEW
- Sections that repeat the same mood statement (O) NEW
- More space below a heading than above it (I `heading-rhythm`, G) NEW
- Flush cards cut at the scroller edge; text occluded by overlapping layers (I) ~ (our artwork-debris rules)

### Components, chrome and browser defaults
- Coloured side-stripe (`border-left` > 1px) as status or emphasis (I `side-tab`, G, P) ✓ (accent-stripe card)
- Pill badges "NEW / AI-POWERED / BETA"; version labels in the hero (T, L) ✓/NEW (version labels)
- Decorative pulsing status dots; decorative blinking cursor (I, T) NEW
- Emoji or Unicode glyphs as icons; emoji bullets (I, G, T, V, L, P) NEW (we only require one line style)
- Default Lucide/Feather everywhere; rocket for "launch", shield for "security" (T) NEW
- Sparklines, progress rings or fake avatars filling space; scoring bars with filled tracks (I, G, T) NEW
- Every secondary action in a modal (I, G, T) NEW (marketing: low relevance)
- **Browser surfaces left at defaults:** selection, caret, scrollbar, focus ring, underline offset, tabular numerals (I, G) NEW
- Scroll cues ("Scroll to explore", bouncing chevrons) (T, Stitch) NEW
- Decorative accent ruler under headings (L) NEW
- Logo wall with category labels under each logo; plain-text wordmarks for real customers (T) NEW

### Imagery and illustration
- Stock photos that could belong to anyone; decorative images carrying no information (G, O, H "remove it — is information lost?") ✓
- Gradient blobs, floating circles and wavy dividers as filler (V, G, H) ✓
- **Shape-assembled SVG "illustrations"** and sketchy doodle scenes; CSS-drawn product objects (I `shape-assembled-illustration`, sketchy-SVG ban, G, H, T) ~ (our artwork rules cover *broken* artwork, not *cheap* artwork). Note the tension: our lessons require a drawn graphics layer, so the rule should be "authored geometry and diagrams yes; SVG imitating pictures no" (impeccable's exact distinction).
- Geometric or many-vertex `clip-path` masks faking organic contours (I `organic-clip-path`) NEW
- Raster buried under a near-opaque wash or at near-zero opacity (I `buried-raster`) NEW
- Faked physicality: CSS bevels, embossing, stamped metal, chalk ("the single most reliable mark of machine-made design", I finish-reviewer) NEW (relevant to our "stamp" motifs)
- Pills or labels overlaid on photos; fake photo-credit captions (T) NEW
- Image scale or rotate on hover (I `image-hover-transform`, G, L) NEW
- 1:1 crop on every image (L) NEW
- Placeholder or picsum or unseeded images shipped (I `broken-image`, L) ✓

### Motion
- Fade-and-slide-up on every section; hover transitions on every card (A, I, G) ✓
- Content hidden at rest, depending on a reveal (I `content-hidden-at-rest`, P parity loss) ✓ (lesson; now make it checkable)
- Bounce or elastic easing (I, G) NEW; ease-in on UI (E) NEW
- Layout-property animation; `transition: all` (I, G, Vc, L) ✓/NEW (`transition: all`)
- `scale(0)` entrances (E) NEW
- Animating a photograph in (ours) ✓
- Keyboard-frequent interactions animated (E) n/a for marketing

### Copy and content
- Buzzwords: seamless, supercharge, elevate, unleash, revolutionize, streamline, empower, next-generation, cutting-edge, world-class, AI-powered, "unlock the potential" (everyone) ✓
- Launch-theatre phrases: "Built for the way you work", "Meet your new…", "The future of…", "Welcome to X" (G `theater-slop-phrase`) NEW
- Aphoristic cadence repeated: "X. No Y." / "Not a feature. A platform." (I `aphoristic-cadence`, G "Short. Punchy. Fragments.") NEW
- Poetic or performative-craftsman labels ("Field notes", "Quietly trusted by", "On our desks") and micro-meta sentences (T) NEW
- "Get Started" / "Learn More" as the only CTAs; duplicate CTA intents with different labels (G, T, L) NEW
- Happy talk and instructions nobody reads (G ratio) ~ (we cite NN/g word counts)
- Default AI pricing tiers $9/$19/$29/$49/$99/$199 (L) NEW
- Unsourced "Trusted by 1000+ teams"; suspiciously round stats (99.9%, 10×) (L, T, G "three big numbers") ✓ (fabrication rule) / NEW (as a tell)
- Fake testimonials with avatars and five stars (G, L) ✓
- Lorem ipsum, "John Doe", "Acme" (T, L) ✓ (sample data rule)
- "Built with love / coffee" footers (L) NEW
- Locale, time or weather strips (T) NEW

### Process tells
- Judging from source; one viewport (ours, O, P, G) ✓
- Self-certifying fixes; a reviewer that shares the builder's context (I, P) NEW
- Trusting a renderer without a control (H) ~ (our capture lessons)
- A rubric that checks only first-order tells (dani-z) NEW (for our evals)

---

## 5. Verification-loop techniques found (what to steal, and how)

| # | Technique | Source | How it would work in our skill |
|---|---|---|---|
| 1 | **Control capture**: run a known-good page through the same renderer first | huashu Rule 0 | Capture the live production site with `capture.mjs` before trusting captures of the dev build |
| 2 | **Capture validity check**: open each file, confirm it shows what its name says | impeccable | A checklist step after every batch; the reviewer returns "recapture" rather than judging bad evidence |
| 3 | **Vision probe**: confirm the model can see images; otherwise use DOM checks and disclose it | baoyu | One line in `visual-qa.md` |
| 4 | **Two-speed loop**: quick check after each change, full review at milestones | OneRedOak; impeccable hooks (per-edit mechanical, Stop deep) | During Phase 5: tells scan plus the 390/1440 first viewport after each chapter; the full five-width set at Phase 6 |
| 5 | **Bounded rounds**: batch fixes, recapture the same files, at most 2–3 rounds, stop if a round resolves nothing | impeccable, gstack (risk % and cap) | Section 3, item 6 |
| 6 | **Fresh-context reviewer** with no transcript; inventory before contract; fixed dispositions; resolved/partial/unresolved re-scoring | impeccable, plugin87, baoyu | Section 3, item 4 |
| 7 | **Isolated A/B assessments**: human-style judgement first, detector second, synthesise | impeccable critique | Critique subagent first, then `tells.mjs` output merged by the main thread |
| 8 | **Outside voices**: a second model or subagent proposes from the same brief | gstack | Section 3, item 18 |
| 9 | **First-impression protocol**: "communicates…", first three fixations, one word; page-area test | gstack | Critique rows |
| 10 | **Removal tests**: no image, no nav, no shadows, no text/logo, name swap, headlines only | OpenAI, huashu, impeccable | CSS injection variants in `capture.mjs` |
| 11 | **Blur silhouette comparison** against old site and anti-references | b1rdmania | Downscale-and-blur tile of first viewports; optional SSIM as a flag only |
| 12 | **Rendered token extraction**: fonts, colours, headings, touch targets | gstack Phase 2, extract-design-system | Audit (objective five-things inventory) and after build (verify DESIGN.md was followed) |
| 13 | **Aggregation thresholds**: % centred, % same radius, eyebrow ratio, heading/body ratio, accent hue count | gstack, taste-skill, plugin87, impeccable | `scripts/tells.mjs` |
| 14 | **Deterministic detector** as an optional second opinion | impeccable CLI (`npx impeccable detect <url> --json`) | Documented option; treat findings as leads |
| 15 | **Reduced-motion parity and no-JS render** | plugin87 | `capture.mjs --parity` |
| 16 | **Interactive truth**: state-bearing controls must change something visibly when clicked | plugin87 | Widget-state pass in Phase 6 (tabs, accordions, menu toggles) |
| 17 | **Root-cause probes**: dump computed box model and flex properties of an overflowing element and its parent | baoyu | Add to the overflow detector in `visual-qa.md` |
| 18 | **Undefined CSS variable scan** | baoyu | `tells.mjs` |
| 19 | **Console and uncaught error capture** during renders | OneRedOak, baoyu, impeccable `script-error`, gstack | `capture.mjs` logs page errors per route |
| 20 | **Claims diff**, old against new visible text | huashu (text diff idea) applied to our truth rule | `scripts/claims.mjs` (Section 3, item 10) |
| 21 | **Evidence per answer**: a filename plus what it shows; source cannot prove hierarchy; falsification pass | impeccable, ibelick, plugin87 | `templates/critique.md` |
| 22 | **Heuristic scoring with n/a renormalisation** (Nielsen 0–4, marketing max /32) | impeccable | Optional in Phase 8 for interactive widgets; not for art direction |
| 23 | **Letter grades and regression baseline** (`design-baseline.json`) | gstack | Skip grades; the *baseline* idea maps to storing before and after tells counts |
| 24 | **Lighthouse via DevTools MCP** (`lighthouse_audit` excludes performance; use `performance_start_trace` for CWV with CrUX) | Chrome DevTools MCP, web-quality-skills | Phase 8 tooling note |
| 25 | **Blind cold-start evals with provenance** | plugin87 | Section 3, item 19 |

---

## 6. Rejected or low-value projects, and why

- **nextlevelbuilder/ui-ux-pro-max-skill (131k★):** category → palette/style lookup produces the category default (SaaS → blue-600 + glassmorphism; Micro SaaS → indigo-500; CTA glow on hover). This is the failure our skill is built to prevent. The star count reflects convenience, not quality.
- **VoltAgent/awesome-design-md (118k★) and brand-clone DESIGN.md libraries (awesome-claude-design, ios-design-md, and plugin87's 138 systems):** designed for "make it look like Stripe", which is imitation; research should extract principles. Keep only the DESIGN.md section conventions (Section 2.18).
- **taste-skill `redesign-skill`:** a refresh procedure ("Do not rewrite from scratch", font swap first) plus fake-data advice ("randomize dates to appear real", "organic, messy data"). Individual counting rules are adopted (Section 2.5); the procedure is rejected.
- **Stitch `taste-design`:** recommends Fraunces and Instrument Serif and "perpetual micro-motion"; a frozen 2025 view.
- **Ilm-Alan/frontend-design:** eight costume presets (one is the purple-glow look); nothing derived from the client. Only the "Breaks if" device is kept.
- **superdesign:** product-bound (paid CLI and canvas). Only the logo invariant is kept.
- **OneRedOak design-review:** a year stale, generic persona, no anti-slop content; superseded by gstack and impeccable. Only the two-speed idea is kept.
- **Laith0003/ux-skill:** regex-over-source, heavy on code hygiene, some rules contradict typography-led directions. A handful of tells are harvested.
- **Owl-Listener designer-skills, mistyhx audit, bencium:** textbook heuristics we already cover in `ui-ux.md`.
- **Cursor rules ecosystem** (cursor-designer GPL-3.0, design-bible without a licence, awesome-cursorrules CC0): stack conventions and Figma API recipes; nothing on art direction or verification.
- **MickeyAlton33/web-designer-plugin, looks-expensive, design-taste merges:** derivative of Anthropic, impeccable and taste-skill, with rotation menus that reintroduce convergence.
- **Leaked v0 and Lovable prompts:** licensing (GPL repo, proprietary content) and they *encode* tells (Lovable's glow and gradient tokens). Used only as evidence.
- **Design Arena:** preference Elo across models; says nothing about brand fit or truth.
- **dani-z benchmark:** rejected as a method, kept as a cautionary example.
- **Impeccable's dice and comp machinery:** creative direction by random draw and pixel-diffing against generated comps is heavy, depends on image generation, and conflicts with derive-from-the-company. Its underlying goal (breaking the ranking rut) is met more cheaply by the seven-candidates rule and independent proposals.

---

## 7. Licensing notes

Our repo is **MIT** (`LICENSE`, © 2026 Abdul Hadi). Implications:

| Source | License (verified from file unless noted) | What we may do |
|---|---|---|
| Anthropic `frontend-design` | Apache-2.0 (`skills/frontend-design/LICENSE.txt`) | Paraphrase freely. If we copy text substantially (e.g. the calibration list verbatim), keep an Apache-2.0 notice, include the license text (e.g. `licenses/Apache-2.0.txt`) and state that we modified it. Short quotes with attribution for commentary are fine. |
| impeccable | Apache-2.0 (+ `NOTICE.md` crediting ehmo, MIT) | Same as above. Rule *ideas* and ids (e.g. `side-tab`, `cream-palette`) can be reimplemented in our own script; credit impeccable. Linking or invoking its CLI is fine (the user installs it). |
| gstack | MIT, with portions derived from impeccable (Apache-2.0) as declared in its NOTICE | MIT text needs the copyright notice kept if copied. Impeccable-derived portions carry Apache obligations, so attribute both if we lift those parts. gstack's NOTICE is a good template for ours. |
| OpenAI `frontend-skill` (removed 2026-04-23) | Apache-2.0 (skill `LICENSE.txt` at commit 11c6438^) | The license still covers that version; cite the commit. Paraphrase the litmus and removal tests. |
| taste-skill | MIT | May adapt with attribution. |
| plugin87 ux-ui-agent-skills | MIT | May adapt (e.g. the parity-gate logic) with attribution. |
| Vercel web-interface-guidelines, agent-skills | MIT | May merge the implementation checklist with attribution. |
| Emil Kowalski skills | MIT | May adapt the motion numbers with attribution. |
| ibelick ui-skills, huashu-design, baoyu-design, Laith0003, Owl-Listener, extract-design-system, web-quality-skills, accessibility-agents, Ilm-Alan, miqdadbadjuber, superdesign | MIT | May adapt with attribution. **Exception:** baoyu's `references/upstream-system-prompt.md` reproduces a proprietary product prompt; do not reuse it. |
| Anthropic cookbooks | MIT | Cite as evidence. |
| Google stitch-skills, modern-web-guidance; Chrome DevTools MCP; Playwright MCP | Apache-2.0 | Link or invoke; paraphrase guidance. |
| meodai skill.color-expert | **CC BY 4.0** | Adaptation allowed with attribution, a license link and an indication of changes. |
| b1rdmania claude-brand-skills | **No LICENSE file** (README: "Use these for your own projects, modify as needed. Attribution appreciated but not required.") | Treat as all rights reserved for text; use *ideas* (blur test, kill-don't-blend) in our own words, credited. |
| dani-z benchmark, saralobo design-bible | No licence | Ideas and citation only. |
| x1xhlol system-prompts (v0, Lovable) | GPL-3.0 repo; underlying prompts proprietary | Do not copy; cite only as evidence. |
| spencergoldade cursor-designer | GPL-3.0 | Do not incorporate text (copyleft would conflict with MIT distribution). |
| PatrickJS awesome-cursorrules | CC0 | Free, but nothing needed. |

**Recommendation:** if any adaptation lands in `skills/`, add a top-level `NOTICE.md` (modelled on gstack's). It should list each source, its license and which of our files contain derived material. Include `licenses/Apache-2.0.txt` and the CC BY 4.0 link. Prefer paraphrase plus citation, which avoids most obligations, and quote only short load-bearing lines.

---

## 8. Coordination note: overlap with scripts added by another stream (state of `skills/` at the end of this research)

While this stream ran, uncommitted work from elsewhere appeared under `skills/website-redesign/scripts/` (`audit.mjs`, `contrast.mjs`, `palette.mjs`, `lib/`, and changes to `capture.mjs`). I did not edit any of it. Read against the proposals above:

- **Already covered by `audit.mjs`:** overflow and its culprit; type inventory (sizes, families, weights, measure, centred and justified runs, tight leading, text under 12px); painted-ground contrast; keyboard focus visibility and focus hidden under sticky bars; target sizes; headings, landmarks, lang and axe; image alt, dimensions and lazy LCP; **the no-JS reveal trap** (part of item 8); LCP/CLS; and "signals" (gradient text, violet gradients, backdrop blur, emoji icons, icon tiles, card and pill counts, over-used families, cliché copy, big-number claims). `palette.mjs` already clamps out-of-gamut steps "by chroma, never by lightness" (meodai's rule).
- **Not yet covered; candidates to add to `audit.mjs` signals rather than a new `tells.mjs`:**
  - a **reduced-motion parity** render (visible at no-preference but invisible at `reduce`)
  - **console and page errors**
  - **undefined `var(--x)`**
  - a **`forced-colors`** render
  - **eyebrow ratio** (short tracked or uppercase element immediately before h1/h2, against ceil(sections/3))
  - **one-radius share** (>80% of radii equal and ≥16px)
  - **coloured side-stripe borders** (>1px `border-left/right` on boxes)
  - **zero-offset coloured shadows**
  - **cream/paper ground** detection (page background in the warm off-white family)
  - **single italic or colour-accented word in a heading**
  - **em-dash density** (≥8 at ≥1 per 500 characters)
  - **launch-theatre and aphoristic-cadence copy**
  - **unthemed browser surfaces** (`::selection`, `accent-color`, `text-underline-offset`, `font-variant-numeric` on figures)
  - **heading/body ratio** below 2.0 and adjacent steps below 1.25
  - **% centred** above 60%
- **The over-used family list in `lib/inventory.mjs`** (`inter, geist, poppins, montserrat, dm sans, space grotesk, instrument serif, plus jakarta sans, manrope, outfit, roboto, open sans, lato, sora, satoshi, general sans`) lacks the second-wave display serifs that the 2026 sources flag: Fraunces, Playfair Display, Newsreader, Cormorant, Lora, Crimson, Recoleta, DM Serif, plus Syne, IBM Plex, Instrument Sans, Space Mono, Mona Sans. It *includes* Satoshi and General Sans, which gstack lists as "freely available faces on no default list" (verified 2026-09-08). That disagreement is itself evidence for item 2: date the list, cite where each entry came from, and treat it as a signal to justify, not a ban.
- **Items 10 (claims diff) and 5 (removal-test capture variants)** have no counterpart yet.
