# Second-pass audit of the skill (2026-10-01)

A deep review of `skills/website-redesign/` after the R&D merge, aimed at making the skill more deliberate rather than larger. Every file was read in full, alongside the research report, the stage-2 integration plan and the twelve stage-2 stream reports.

## 1. Major weaknesses found

1. **The core was too heavy to steer by.** `SKILL.md` was 6,339 words (≈ 8.5k tokens; Anthropic's guidance is a body under ~5k), with a 1,750-word options manual inside it, the phases described twice, and the gates restated in prose. A typical expressive run read ~36,600 words of references before building. Nothing said which of the many instructions mattered most.
2. **Research was added without being translated into behaviour.** The stage-2 programme (rendering choice, interaction levels, motion verification, polish, configurators, generative visuals, loading) was archived "pending integration". The most expensive lesson — an illustrated, game-like builder beat a technically good 3D one — appeared nowhere in the documents, which only taught how to make 3D look better.
3. **Broken connections between parts.** `motion.mjs` checks a machine-readable motion spec that `motion.md` and the `DESIGN.md` template never described, so approved motion was still lost between plan and build. The script options were documented in four places (SKILL.md, README, `tools.md`, references) and had begun to drift.
4. **Stale rules that later evidence had overturned**: "animate the transform string when smoothness under load matters" (it jumps when interrupted); "a WebGL canvas never becomes the LCP" (the poster is the LCP whenever it is smaller than the viewport); "design systems disagree on checkmarks in RTL" (they never mirror); `role="img"` as the canvas accessibility answer; "a perpetual background shader is decoration" beside a shipped hero-shader template.
5. **One owner's taste had become a structural house style.** The lessons from four projects for one client were generalised as rules: alternate surfaces white → grey → tint → dark, no two adjacent chapters alike, "fewer than four layout families in eight sections" is a tell, one deliberate grid break, a drawn graphics layer on every expressive page, a timeline with "milestone artwork on alternating sides", a fixed landing-page sequence (nav → hero → proof → CTA → features → CTA). Together they describe a recognisable page — the opposite of the skill's goal — and push towards collage-like inconsistency.
6. **Convergence the checks could not see.** Every ledger row was compared one by one, but the five blind-test outputs were all Restrained, on white, with a blue-family action colour, and two used the same typeface. The design theory called Restrained "the right default for most sites"; the ledger's example row modelled the split hero the skill warns against.
7. **Process gaps.** Visual judgement happened only after every page was built (a sibling hero was caught at the final critique and rebuilt). No content priority or information-architecture step existed between the brief and the layout. Success measures were defined in the brief and never checked after launch; there was no rollout or change-aversion guidance for products used daily. The researched polish pass, width sweep and content-stress loop had scripts but no method in the documents.
8. **Redundancy**: the monospace rule appeared in about fifteen places, the error-summary rule in six, loading thresholds in four, signature-experience guidance in seven files, the convergence tests in two full copies; `ui-ux.md` stated the forms rules twice in one file. The 44 KB lessons file was read at Phase 3 although its digest was the only part needed.
9. **Evaluation process.** All four blind-test fixture brands had blue-family marks, and of the five briefs three were productive, one mixed (a storefront with a checkout rethink) and only one purely expressive; the categories never run blind include docs, enterprise, a mobile-first consumer app and content. A skill can pass every such round and still converge on expressive work.

## 2. What changed and why

- **`SKILL.md` rewritten** around "what decides the outcome" (surface, truth, derived direction, early judgement from renders, measured gates — polish last), five unchanged commitments, a **path table** (small job, expressive, productive, thin context, interactive candidate) that routes reading, four gates, and short phase notes. 3,772 words.
- **The key-screen review** (new gate inside Phase 5): build the riskiest screen for real, render it at 1440 and 390, blur it beside the old site and the ledger, answer a subset of the critique, and fix the direction there — where a professional studio would review a key comp — instead of discovering problems after every page exists. Shown to the user when they are engaged.
- **Content priority per key template** before layout (`art-direction.md` §4), and a **content inventory** for rethinks (`audit.md`).
- **`interactive.md`** replaces `realtime-3d.md` and becomes the one home for: when interaction beats a page and the value test; interaction level per moment with ceilings by surface, and fidelity as a separate axis; signature experiences, prototype promotion and the site around them; choosing a renderer; direct manipulation; configurators (model first, needs vs taste, prevent/explain/warn/repair, no free text in URLs); real-time 3D; page-to-product hand-over; a purpose gate for generative visuals; loading heavy modules.
- **The motion spec** (`motion.md` §2, `templates/DESIGN.md`) in exactly the table format `motion.mjs` parses (verified), and a hand-off gate that every row passes; a job → tool table replacing the library list; View Transitions' input swallowing; the "nothing runs at rest" list per library.
- **`visual-qa.md`**: the key-screen review, the width loop (sweep → worst widths → stress → stable diffs), and a **polish pass** macro to micro with a stop rule, built on the finding that macro space and a single accent are perceived while radius nesting, alpha borders and tinted shadows are not.
- **Redesign risk and after launch**: parity, learned locations, migration cost, change aversion judged by outcomes, staged rollout with a rollback trigger (`framing.md` §2); where each success measure is read and when (`technical-qa.md`).
- **Composition rules rewritten as reasoning**: repeat where content is parallel, change where it changes kind; structure visible by whatever means the direction chose; colour proportions follow the named strategy; Restrained needs a reason on expressive routes.
- **The ledger read as a set**, with the observed habit stated; the example row corrected.
- **`scripts/README.md`**: one manual for options and finding semantics, gathered from SKILL.md and six references.
- **Lessons**: `lessons.md` is now a digest written as "mistake → rule now", grouped by phase, with an explicit caution against generalising one client's taste; the full record moved to `lessons-log.md` (history kept, pointers updated to current homes).
- Stale rules fixed as listed in weakness 4; the plugin version is 2.1.0.

## 3. Removed or simplified

- From `SKILL.md`: the options manual, the probe snippet, the shared-flag paragraph (all in `scripts/README.md`), and the duplicated phase descriptions.
- From references: script-behaviour paragraphs in `accessibility.md` §10, `visual-qa.md`, `technical-qa.md`, `performance.md` §6, `responsive.md` §4 and `multilingual.md` §4 (now in the manual); the duplicate convergence tests in `anti-patterns.md`; the transplanted-expression detail that restated `app-ui.md`; `web-design.md`'s copies of the performance, responsive and imagery rules and its fixed landing-page sequence; `ui-ux.md`'s restatements of loading, motion and WCAG 2.2 and its second forms section; the textbook parts of `design-theory.md` Part A (Rams, Vignelli, Gestalt definitions) in favour of their checkable consequences, plus a short set of composition checks from painting and photography; signature content spread over `discovery.md` §5b–§5c, `art-direction.md` §4, `categories.md` and `anti-patterns.md`.
- Rigid counts replaced by judgements: three sizes per view, two big things, one grid break, 60/30/10 as a universal checkbox, four layout families in eight sections, alternating grounds, "cards: often not".
- **Deliberately not added** from the stage-2 plan: separate `configurators.md`, `generative-visuals.md` and `resources/hard-ui.md` references (folded into one file, or left in the archive); POS and kiosk playbooks and a white-label category section (niche for a redesign skill; tenant contrast stays in `design-systems.md` §8); a mandatory reference-board document (one sentence in `research.md` instead); a finish vocabulary per personality (practitioner vocabulary, not evidence); the hard-UI library lookup (the archive keeps it; `libcheck.mjs` is the tool).

## 4. Research done for this pass

- Anthropic's skill-authoring guidance (platform docs): a body under ~5k tokens, add only what the model does not already know, match the degree of freedom to the fragility of the task, references one level deep with contents for long files, feedback loops. It validated moving the manual out, trimming textbook theory, and keeping low-freedom rules for verification while giving creative choices high freedom.
- Anthropic's current frontend-design skill: short, opinionated, "spend your boldness in one place", a plan reviewed against the brief before building — consistent with the key-screen review and the model's-prior clusters this skill already uses.
- Professional workflow: style tiles and element collages before full comps, then a system; NN/g on incremental versus radical redesign and change aversion (dissatisfaction that settles in weeks for retained users; phased rollouts recover faster). These backed the key-screen gate and the rollout guidance.
- The stage-2 stream reports were re-read for their decision guidance; only decisions that change behaviour on ordinary projects were integrated.

## 5. Why it is stronger in real redesign work

- **It knows what matters**: a priority order and a path table mean a dashboard refine, a first site from Instagram and a fashion rebrand each read a different, smaller set, about 29% less on a typical expressive run.
- **It catches the expensive mistakes earlier**: the direction is judged on one real screen, blurred beside past outputs, before the site is built; content priority is fixed before layout.
- **It is less likely to converge**: composition follows content rather than an alternation recipe, colour strategy is argued rather than defaulted, and the ledger is read as a set.
- **It handles ambitious work deliberately**: it can propose interaction when a page would lose, choose a level and a fidelity per moment, pick a renderer from requirements, and refuse spectacle that fails the value test.
- **Plans survive into builds**: motion is a checked spec; the polish pass, width sweep and stress loop are a method, not just scripts.
- **It finishes like a product team**: rollout risk, change aversion and a plan to read the success measures after launch.

## Still open

1. ~~**Blind round 5**~~ — run on 2026-10-01 against this version (`experiments/H-blind-eval/README.md`, "Round 5"); both outputs chose Committed strategies. Still open: fixtures chosen for diversity: a warm or saturated brand mark, an expressive category (restaurant, fashion, culture, portfolio), a Committed or Drenched outcome, and the categories never run blind (docs, enterprise, mobile-first consumer, content).
2. A fresh-reviewer comparison with a second subject and reviewer, to separate method from reviewer taste.
3. Real devices and assistive technology (GPU numbers, iOS Safari, VoiceOver, NVDA), unchanged from the stage-2 report.
4. Promoting a polish probe into a script after an independent verdict pass (S9 kept it as a candidate).
