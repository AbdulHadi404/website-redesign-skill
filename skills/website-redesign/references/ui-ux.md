# UI / UX — the interaction rules every surface obeys

Every surface is an interface — a landing page included: a nav, forms, widgets, links, states, motion, and people using it on a phone with one thumb. §1 is the lens for the Phase 1 heuristic evaluation (`audit.md` §6); read the rest before implementation. Product screens add `app-ui.md`; canvases and editors add `interactive.md` §5. Numbers are the sources'.

## 1. The two frameworks everything else hangs on

**Nielsen's ten heuristics** are the audit lens for every interactive surface: system status visible; the users' words; control and freedom (undo, cancel, back); consistency and standards; error prevention before error messages; recognition over recall; accelerators for experts; nothing irrelevant competing with what matters; errors that say what happened and how to recover; help in context.

**Norman's vocabulary** names most findings: a missing **signifier** ("the button doesn't look clickable"), a gulf of **evaluation** ("did that work?"), poor **mapping** between control and effect, a **conceptual model** the interface does not tell.

## 2. The laws, with their numbers

| Law | Design consequence |
| --- | --- |
| Fitts — time to a target grows with distance, shrinks with size | big, near targets for primary actions; thumb reach on phones |
| Hick — decision time grows with options | one primary action per view; navigation of 5–7 items; progressive disclosure |
| Jakob — people spend most of their time on *other* sites | conventions for navigation, links and controls; novelty spent on the idea |
| Doherty — flow holds when the system answers in < 400 ms | optimistic UI, instant press feedback, skeletons while data arrives |
| Tesler — some complexity can only be moved | move it to the system (defaults, inference, autofill), not to the person |
| Peak–end — an experience is judged by its peak and its end | design the confirmation and the last screen as carefully as the first |
| Goal gradient — effort rises as the goal nears | show progress; make the last step the shortest |
| Postel — be liberal in what you accept | any phone format, any case, trailing spaces |

## 3. Reading and scanning

- People read **20–28% of the words** on an average page (NN/g); they can read half the words only on pages of **≤ 111 words**. Every sentence must earn its place.
- The default scanning pattern without cues is the **F**: a sweep across the top, a shorter one lower, then down the left edge. Strong cues turn it into the **layer-cake** (headings only) or the **spotted** pattern (hunting for one thing). Design for the layer-cake: front-load every heading and paragraph (**the first two words** decide whether the line is read), bold the key term, use lists, make links describe their destination ("a link is a promise").
- **Banner blindness**: anything shaped like an ad — a coloured rectangle with text in the top band or right rail — is skipped, and it contaminates what sits near it ("hot potato"). Right-rail content received 0.8% of attention in one study. Keep real content out of ad shapes; never put a legitimate call to action inside a bright box beside a decorative one.
- **Photos**: people look at *real* people who work at the company (10% more time on portraits than on the bios beside them) and at information-carrying images (product detail); purely decorative stock is **completely ignored** ("jazzed-up = ignored"). No stock filler.
- **Icons**: only a few are universal (home, search, print). Every other icon needs a **visible** text label — not a hover tooltip, which does not exist on touch. Five-second rule: if it takes more than five seconds to think of an icon for a concept, the icon will not communicate it.

## 4. Feedback, time and states

- **Response-time limits** (Nielsen): **0.1 s** feels instantaneous (direct manipulation — hover, press, toggle); **1 s** keeps the flow of thought (a spinner is unnecessary but the delay is noticed); **10 s** is the limit of attention — beyond it, a percent-done indicator with an estimate. Between 2 and 10 s, quiet feedback (a busy state on the control, a subtle progress line).
- **Loading thresholds and skeletons**: `app-ui.md` §8 (containers show nothing under 1 s, then a skeleton shaped like the final layout; an action's spinner sits inside the pressed control).
- **Every component fills its state matrix** — interaction (rest, hover, focus-visible, pressed), selection, validation, availability (disabled, inactive, read-only), async (loading, empty, degraded) — and every applicable row is designed and rendered, not defaulted (`app-ui.md` §2, `visual-qa.md`).
- **Empty states** (first use, nothing configured, no results, cleared): say *why* it is empty, teach the feature in one line ("Star a job to keep it here"), and offer the next action; never a blank container, never "No records" that later fills in.
- **Error messages**: next to the source; colour *and* icon *and* text (never colour alone); plain language; the precise problem; a constructive next step; the entered text preserved; no blame words ("invalid", "illegal"), no humour, no codes. Validate on submit, then live as fields are fixed; live from the start only for character counts, availability checks and password rules (§5). Modal dialogs only for errors that block progress.
- **Progressive disclosure**: show what most people need most of the time; put the rest one click away with an obvious label; **never more than two levels** — people get lost between three. In a configurator the disclosure order comes from the options' dependency graph, not from taste (`interactive.md` §6).

## 5. Forms

NN/g's ten, plus the research on actions:

1. Cut fields ruthlessly (a 6-field form became 2 in one study). Ask only what is used.
2. Labels **above** the field (or beside it on very long desktop forms), close to it; never placeholder text as the label.
3. **Single column**; a row only for short related fields (city / state / zip).
4. Logical order; common choices first.
5. Field width hints at the answer's length (99.9% of city names fit 19 characters).
6. Mark **whichever is the minority**, in words — usually the optional fields, so "(optional)"; no asterisks. Keep optional fields to one or two.
7. State format requirements up front; better, accept any format (Postel).
8. No Reset/Clear button.
9. Errors visible, specific, input preserved (§4).
10. Inputs typed (`type=tel/email`, `inputmode`, `autocomplete`) so phones show the right keyboard and autofill works.

Actions (LukeW's eye-tracking study): primary and secondary actions **left-aligned with the fields** on a strong vertical axis; the secondary action visually recessive (a link or a quiet button) so it cannot be hit by mistake — people care more about not losing their data than about speed. One primary action per form.

Validation and errors — the design-system consensus (GOV.UK, Primer, Carbon, USWDS): **validate on submit**, then live as fields are fixed; an error summary at three or more errors (any error on a public service), else focus the first invalid field; never disable the submit button to signal an invalid form. The full pattern: `app-ui.md` §6 and `accessibility.md` §6.

## 6. Targets, thumbs, navigation

- **Target size**: WCAG 2.2 minimum **24 × 24 CSS px** (AA); Apple **44 × 44 pt**; Material **48 dp with 8 dp spacing**. Every target 44 px on coarse pointers (its hit area; a touch-first control may be drawn at 36–40 px and extend it), never below 24 anywhere; keep 8 px between adjacent targets (`accessibility.md` §2).
- **How phones are held** (Hoober, 1,333 observations): one-handed **49%**, cradled **36%**, two-handed **15%**; grips change every few seconds. Primary actions and the mobile nav go where a thumb reaches without repositioning — the lower two-thirds, never the top corners; test on a real device.
- **Mobile navigation**: visible tabs or a bar work up to **5 items**; more than that, a menu. A hamburger is low-discoverability ("out of sight is out of mind") — label it **"Menu"** (slightly better recognised than the icon alone), keep the primary action outside it, and make the open menu large-type and finger-sized. How navigation transforms per product type and item count: `responsive.md` §5.
- **Desktop nav**: ≤ 7 items, the primary action at the right end, the logo at the left linking home, the current section marked.
- **Carousels**: auto-rotation is banner blindness on wheels — the first frame gets most of the attention and animated things are read as ads (animated ads are looked at 27% of the time). If one must exist: ≤ 5 frames, manual (no auto-rotation; if it ever auto-advances, a pause control placed before it, `motion.md` §2 gate 7), visible arrows and position dots, big controls — and the important content also lives somewhere static.

## 7. Motion

Motion carries meaning or it goes: where a thing came from, what changed, what to look at next. Frequency decides: nothing on keyboard-triggered actions or anything done 100+ times a day; ≤ 150 ms colour or opacity on what is done tens of times a day; expressive motion only for rare moments. Durations, easing, tokens and reduced-motion substitutes: `motion.md`.

## 8. Accessibility

WCAG 2.2 AA is the floor on every surface; the decisions that settle most of it are made at art direction (`accessibility.md` §2). The 2.2 additions a redesign most often breaks: targets ≥ 24 × 24 px (2.5.8); focus never hidden under sticky UI (2.4.11); a single-pointer alternative to every drag (2.5.7); help in the same place on every page (3.2.6); no information asked twice in one process (3.3.7); no puzzles to sign in (3.3.8).

## 9. Writing

Plain words in the visitor's language; the point first (inverted pyramid); the first two words of every heading and link do the work; buttons are verbs that say what happens next ("Get your Passport", not "Submit"); confirmations say what was done and what happens now; consistent terms (one name per thing across the site); a tone chosen on purpose and held. Nothing a visitor reads is an internal name, a file path, a ticket number or the name of a vendor behind the feature.

## 10. Dark patterns — never

Confirmshaming, forced continuity, hidden costs, disguised ads, misdirection (the quiet "no" and the loud "yes"), pre-ticked consent, roach-motel unsubscribes, fake urgency or fake scarcity, fake social proof. A design that needs any of these has a product problem, not a design problem.

## 11. Credibility (Stanford Web Credibility Project, ten guidelines)

Make claims verifiable; show a real organisation behind the site (address, registration); show the expertise and the people; make contact easy; look professional and appropriate; be easy to use and useful; show the content is maintained; use restraint with promotion; and **avoid errors of every kind, however small** — a typo, a broken link or a stale date costs more trust than a plain design ever would.

## Sources read for this reference

NN/g: "10 Usability Heuristics", "Visual Hierarchy", "F-Shaped Pattern", "How Little Do Users Read", "Banner Blindness: Old and New Findings", "Photos as Web Content", "Icon Usability", "Response Times: 3 Important Limits", "Progressive Disclosure", "Web Form Design", "Error Message Guidelines", "Empty-State Interface Design", "Mobile Navigation Patterns", "Designing Effective Carousels", "Animation Duration", "UX Writing study guide", "Aesthetic-Usability Effect". Laws of UX (Yablonski). Norman, *The Design of Everyday Things*. LukeW, "Primary & Secondary Actions in Web Forms" and "Mobile Design Details: Avoid the Spinner" (skeleton screens). Hoober, "How Do Users Really Hold Mobile Devices?". W3C, "What's New in WCAG 2.2". Apple HIG (44 pt), Material (48 dp). Stanford Web Credibility Project guidelines. Brignull, deceptive patterns taxonomy.
