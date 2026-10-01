# Lessons — what this skill got wrong, and the rule now

Read at the start of Phase 3, and again when a direction resembles a past project. Each line is a mistake this skill has made and the rule that now prevents it. The full record — dates, projects, root causes, every change — is `lessons-log.md`; read it when adding a lesson or when a mistake looks familiar.

Most early lessons came from a handful of projects for one owner. Keep the generalisation, not the taste: "the hero object needs a ground of its own" is a rule; "a calendar on a sky panel" was one project's answer.

## Framing and discovery

- **Applied marketing rules to a work tool**, and desk-tool rules to a phone used with gloves → classify every route by its job, frequency and context before designing (`framing.md`, `categories.md`); convergence checks apply to a productive route's brand layer only.
- **Assumed a repo and a site** when the brief was a social profile and an empty folder → discovery triage inside Phase 0 (`discovery.md` §1).
- **Shrank the differentiator** (a builder meant to delight became a stepper between two sections) → classify signature experiences in Phase 0, give them their own route and a written quality bar (`interactive.md` §3).
- **Promoted a winning prototype without its business behaviour** → move the data model, saving, ordering and marketing material with it (`interactive.md` §3).

## Direction and convergence

- **Kept the fonts, palette and hero and called it a redesign** → name the five first-notice things; each changes unless it is a documented brand asset.
- **Produced its own house style** (paper, italic serif, mono eyebrows, ink chapters, warm accent) for unrelated companies, and sampled the logo last → logo and brand family first; similar-brief, category, second-order and ledger checks before code (`art-direction.md` §5).
- **Ignored the brand family** and swapped the family's own display face "for distance" → audit parent and sibling surfaces; a family face is a kept brand asset (`audit.md` §4).
- **Repainted a brand to escape its own category** → when the brand's assets are the category archetype, keep them and take distance from composition and content.
- **Built a hero that was a sibling of the last output**, caught only at the final critique → blur the style tile and the key screen beside the ledger captures before rolling out.
- **Set imagery to "none" by default**, leaving a page of type and tiles → imagery is argued; a page without photography still needs visual events (product, diagrams, a graphics layer or type at real scale).

## Typography and colour

- **Monospace or tracked condensed capitals as a "data" voice** on brands whose audience does not read code — values, key hints, a sibling's mono face, browser defaults included; rejected three times → commitment 5, enforced by `audit.mjs`.
- **Typeset machine output** (an MRZ strip, a hash) as "authenticity" → it reads as code; draw the object or leave it out.
- **Used the accent as three full-bleed fields**, so the primary button changed colour to stay visible → name a colour strategy; the action colour is one colour everywhere (`design-theory.md` B3).
- **Judged Arabic digits by their Latin companions**, left calendars and digit systems to the locale default → measure each digit system; set calendar and numbering in code (`multilingual.md` §2a).

## Composition and graphics

- **Status as a coloured stripe; a timeline drawn as a stepper; a hero object floating on a flat ground** → status is a word or labelled mark; a sequence is drawn in the company's own terms; the hero object gets a surface of its own.
- **Two primary buttons in the first viewport; a phone hero that was only a paragraph** → header CTA secondary while the hero's is on screen; head → object → body on phones.
- **A viewport-wide wordmark as a flourish** (this skill's habit, removed by the user) → identity comes from the system, not from scale.
- **Debris and clipped artwork in drawn graphics**, invisible at page scale → inspect artwork element by element at 3×.

## Product UI

- **Dressed a product in its marketing site's expression** (display serif titles with eyebrows and leads, tracked mono labels, the hero photograph on sign-in) → carry the brand layer, never the expressive devices (`app-ui.md` §1, §12).
- **Checked contrast on the main ground only** → every state ground, every theme, input borders and focus at 3:1.
- **Promoted a number without checking what it counts** → query the records; a mismatch is a finding for the data owner.

## Motion, rendering and 3D

- **Content hidden until a transition runs** (holes without JavaScript, in background tabs, under reduced motion, in captures) → finished by default; motion only removes a hidden start state.
- **A generic reveal system** where a few researched moments were wanted → motion is a short spec of named moves, checked by `motion.mjs`.
- **Judged WebGL in an unfocused pane or a software renderer**; judged generated geometry by silhouette, costs by intuition; moved the canvas under the pointer → real GPU, lighting before shape, experiment flags, never move what the user is grabbing (`interactive.md`).
- **Realism mistaken for ambition**: a technically good 3D builder lost to an illustrated, game-like one → fidelity is chosen from the brand's material, separately from how interactive a moment is (`interactive.md` §2).

## Verification and process

- **Trusted source over renders**, a capture tool its own lessons had condemned, and prose checks no script performed → mechanical lessons become script checks with regression cases.
- **Tools reported their own process as defects** until run on real sites → every new check runs on a real site as well as fixtures.
- **Walkthroughs read the accessibility tree and drove selectors** a finger cannot reach → walkthroughs act only on what the capture shows.
- **Stateful pages left unaudited** (a filled basket, a checkout) → `--storage` seeds on every script.
- **A builder grading its own work**: 22 of 22 "yes" while its own "breaks if" was broken → a fresh-context reviewer; every "yes" names its capture and is hunted.
- **Accessibility judged from renders** with no axe or keyboard pass → automated, scripted and manual layers, overlays scanned open.
- **The skill changed under its own evaluation** → evaluate a frozen snapshot; apply findings afterwards.
