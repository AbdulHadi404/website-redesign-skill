# UI / UX — the interaction rules a marketing site still has to obey

A landing page is an interface: a nav, forms, widgets, links, states, motion, and people using it on a phone with one thumb. Read this before implementation (Phase 5) and again during technical QA (Phase 8). Numbers are the ones the sources give. Companion: `design-theory.md` (visual system), `web-design.md` (page structure), `technical-qa.md` (the checklist).

## 1. The two frameworks everything else hangs on

**Nielsen's ten heuristics** — use them as the audit checklist for every interactive surface:

1. *Visibility of system status* — feedback within a reasonable time (see §4 for what "reasonable" is).
2. *Match between system and the real world* — the users' words, not ours; no jargon.
3. *User control and freedom* — an emergency exit: undo, cancel, close, back.
4. *Consistency and standards* — same word, same look, same behaviour; follow platform conventions (Jakob's law).
5. *Error prevention* — guard rails before error messages: constraints, confirmations for destructive acts, good defaults.
6. *Recognition rather than recall* — options visible; nothing the visitor has to remember from a previous screen.
7. *Flexibility and efficiency* — shortcuts for the experienced that novices never see.
8. *Aesthetic and minimalist design* — nothing irrelevant or rarely needed competes with what matters.
9. *Help users recognise, diagnose and recover from errors* — plain language, the precise problem, a constructive way out.
10. *Help and documentation* — best not needed; when needed, in context and task-focused.

**Norman's vocabulary** — affordance (what an object *can* do), **signifier** (what tells you it can — a door plate says push, a handle says pull), mapping (control ↔ effect), feedback (the result, immediately), constraints (physical, cultural, semantic, logical), conceptual model (the story the interface tells about how it works), and the two gulfs — *execution* (what can I do?) and *evaluation* (what happened?). Every "the button doesn't look clickable" is a missing signifier; every "did that work?" is a gulf of evaluation.

## 2. The laws, with their numbers

| Law | Statement | Design consequence |
| --- | --- | --- |
| Fitts | time to hit a target grows with distance and shrinks with size | big, near targets for primary actions; edges and corners are infinitely large on desktop; thumb-zone on phones |
| Hick | decision time grows with the number and complexity of options | one primary action per view; a nav of ≤ 5–7 items; progressive disclosure |
| Miller | working memory holds ~7 ± 2 chunks | chunk lists, forms and steps; never make the visitor carry information between screens |
| Jakob | people spend most of their time on *other* sites | conventions over invention: logo top-left links home, nav where nav goes, links look like links |
| Doherty | flow holds when the system answers in < 400 ms | optimistic UI, instant hover/press feedback, skeletons while data arrives |
| Tesler | some complexity cannot be removed, only moved | move it to the system (autofill, defaults, inference), not to the person |
| Peak–end | an experience is judged by its peak and its end | design the confirmation and the last screen as carefully as the first |
| von Restorff | the one that differs is remembered | one accent element per viewport; the primary action |
| Serial position | first and last items are remembered | most important nav items at the ends; most important bullet first |
| Goal gradient | effort rises as the goal nears | show progress; make the last step the shortest |
| Zeigarnik | unfinished tasks nag | progress indicators and "3 of 4 complete" bring people back |
| Aesthetic–usability | attractive = perceived as easier | earn tolerance for minor friction; never rely on it for major friction |
| Choice overload / cognitive load | more options, less action | fewer plans, fewer CTAs, fewer fields |
| Postel | be liberal in what you accept | forms accept any phone format, any case, trailing spaces |

## 3. Reading and scanning

- People read **20–28% of the words** on an average page (NN/g); they can read half the words only on pages of **≤ 111 words**. Every sentence must earn its place.
- The default scanning pattern without cues is the **F**: a sweep across the top, a shorter one lower, then down the left edge. Strong cues turn it into the **layer-cake** (headings only) or the **spotted** pattern (hunting for one thing). Design for the layer-cake: front-load every heading and paragraph (**the first two words** decide whether the line is read), bold the key term, use lists, make links describe their destination ("a link is a promise").
- **Banner blindness**: anything shaped like an ad — a coloured rectangle with text in the top band or right rail — is skipped, and it contaminates what sits near it ("hot potato"). Right-rail content received 0.8% of attention in one study. Keep real content out of ad shapes; never put a legitimate call to action inside a bright box beside a decorative one.
- **Photos**: people look at *real* people who work at the company (10% more time on portraits than on the bios beside them) and at information-carrying images (product detail); purely decorative stock is **completely ignored** ("jazzed-up = ignored"). No stock filler.
- **Icons**: only a few are universal (home, search, print). Every other icon needs a **visible** text label — not a hover tooltip, which does not exist on touch. Five-second rule: if it takes more than five seconds to think of an icon for a concept, the icon will not communicate it.

## 4. Feedback, time and states

- **Response-time limits** (Nielsen): **0.1 s** feels instantaneous (direct manipulation — hover, press, toggle); **1 s** keeps the flow of thought (a spinner is unnecessary but the delay is noticed); **10 s** is the limit of attention — beyond it, a percent-done indicator with an estimate. Between 2 and 10 s, quiet feedback (a busy state on the control, a subtle progress line).
- **Skeleton screens beat spinners**: a spinner draws attention to the wait; a skeleton that fills in draws attention to progress. Use skeletons for content areas, spinners only inside the control that was pressed.
- **Every widget has five states** — idle, loading, active/success, empty, error — and every one is designed, not defaulted. Render each during QA (`visual-qa.md`).
- **Empty states** (first use, nothing configured, no results, cleared): say *why* it is empty, teach the feature in one line ("Star a job to keep it here"), and offer the next action; never a blank container, never "No records" that later fills in.
- **Error messages**: next to the source; colour *and* icon *and* text (never colour alone); plain language; the precise problem; a constructive next step; the entered text preserved; no blame words ("invalid", "illegal"), no humour, no codes. Validate inline only fields that are error-prone; validate the rest on submit. Modal dialogs only for errors that block progress.
- **Progressive disclosure**: show what most people need most of the time; put the rest one click away with an obvious label; **never more than two levels** — people get lost between three.

## 5. Forms

NN/g's ten, plus the research on actions:

1. Cut fields ruthlessly (a 6-field form became 2 in one study). Ask only what is used.
2. Labels **above** the field (or beside it on very long desktop forms), close to it; never placeholder text as the label.
3. **Single column**; a row only for short related fields (city / state / zip).
4. Logical order; common choices first.
5. Field width hints at the answer's length (99.9% of city names fit 19 characters).
6. Mark **optional** fields, not required ones, and keep optional fields to one or two.
7. State format requirements up front; better, accept any format (Postel).
8. No Reset/Clear button.
9. Errors visible, specific, input preserved (§4).
10. Inputs typed (`type=tel/email`, `inputmode`, `autocomplete`) so phones show the right keyboard and autofill works.

Actions (LukeW's eye-tracking study): primary and secondary actions **left-aligned with the fields** on a strong vertical axis; the secondary action visually recessive (a link or a quiet button) so it cannot be hit by mistake — people care more about not losing their data than about speed. One primary action per form.

## 6. Targets, thumbs, navigation

- **Target size**: WCAG 2.2 minimum **24 × 24 CSS px** (AA); Apple **44 × 44 pt**; Material **48 dp with 8 dp spacing**. Design to 44 and never below 24; keep 8 px between adjacent targets.
- **How phones are held** (Hoober, 1,333 observations): one-handed **49%**, cradled **36%**, two-handed **15%**; grips change every few seconds. Primary actions and the mobile nav go where a thumb reaches without repositioning — the lower two-thirds, never the top corners; test on a real device.
- **Mobile navigation**: visible tabs or a bar work up to **5 items**; more than that, a menu. A hamburger is low-discoverability ("out of sight is out of mind") — label it **"Menu"** (slightly better recognised than the icon alone), keep the primary action outside it, and make the open menu large-type and finger-sized.
- **Desktop nav**: ≤ 7 items, the primary action at the right end, the logo at the left linking home, the current section marked.
- **Carousels**: auto-rotation is banner blindness on wheels — the first frame gets most of the attention and animated things are read as ads (animated ads are looked at 27% of the time). If one must exist: ≤ 5 frames, manual on mobile, visible arrows and position dots, big controls, pause on hover — and the important content also lives somewhere static.

## 7. Motion

- Durations (NN/g): **~100 ms** for feedback on small controls (toggle, checkbox); **200–300 ms** for moderate transitions (a modal, a panel); **≤ 400 ms** for the largest moves; **≥ 500 ms** reads as a delay. Enter slower than exit (300 in / 200–250 out). *Ease-out* for entering (fast start, settle), *ease-in* for leaving; never linear.
- Motion carries meaning or it goes: where a thing came from, what changed, what to look at next. Frequent motions are subtler and shorter than rare ones.
- Animate transform and opacity only; never layout. `prefers-reduced-motion` switches decorative motion off entirely and keeps essential feedback.

## 8. Accessibility — the WCAG 2.2 additions on top of 2.1 AA

- **2.5.8 Target size (AA)**: ≥ 24 × 24 CSS px, or spacing that gives the equivalent.
- **2.4.11 Focus not obscured (AA)**: a focused control is never fully hidden by sticky headers, cookie bars or overlays (2.4.12 AAA: not even partly).
- **2.4.13 Focus appearance (AAA, aim for it)**: a focus ring ≥ 2 px thick with 3:1 against the unfocused state.
- **2.5.7 Dragging (AA)**: anything draggable is also doable with a single pointer.
- **3.2.6 Consistent help (A)**: contact/help in the same place on every page.
- **3.3.7 Redundant entry (A)**: never ask for the same information twice in one process.
- **3.3.8 Accessible authentication (AA)**: no puzzles or transcription to sign in (paste and autofill allowed).

Still from 2.1 AA and always checked: contrast (`design-theory.md` B6), keyboard operability with visible focus and a logical order, a skip link, landmarks, one `h1` and ordered headings, labels on every input, names on every icon-only control, `aria-*` states on custom widgets (tabs, menus, accordions), no information by colour alone, reduced-motion respected, no content that flashes, captions/alt where media carries meaning.

## 9. Writing

Plain words in the visitor's language; the point first (inverted pyramid); the first two words of every heading and link do the work; buttons are verbs that say what happens next ("Get your Passport", not "Submit"); confirmations say what was done and what happens now; consistent terms (one name per thing across the site); a tone chosen on purpose and held. Nothing a visitor reads is an internal name, a file path, a ticket number or a provider (this repo's own hard rule).

## 10. Dark patterns — never

Confirmshaming, forced continuity, hidden costs, disguised ads, misdirection (the quiet "no" and the loud "yes"), pre-ticked consent, roach-motel unsubscribes, fake urgency or fake scarcity, fake social proof. A design that needs any of these has a product problem, not a design problem.

## 11. Credibility (Stanford Web Credibility Project, ten guidelines)

Make claims verifiable; show a real organisation behind the site (address, registration); show the expertise and the people; make contact easy; look professional and appropriate; be easy to use and useful; show the content is maintained; use restraint with promotion; and **avoid errors of every kind, however small** — a typo, a broken link or a stale date costs more trust than a plain design ever would.

## Sources read for this reference

NN/g: "10 Usability Heuristics", "Visual Hierarchy", "F-Shaped Pattern", "How Little Do Users Read", "Banner Blindness: Old and New Findings", "Photos as Web Content", "Icon Usability", "Response Times: 3 Important Limits", "Progressive Disclosure", "Web Form Design", "Error Message Guidelines", "Empty-State Interface Design", "Mobile Navigation Patterns", "Designing Effective Carousels", "Animation Duration", "UX Writing study guide", "Aesthetic-Usability Effect". Laws of UX (Yablonski). Norman, *The Design of Everyday Things*. LukeW, "Primary & Secondary Actions in Web Forms" and "Mobile Design Details: Avoid the Spinner" (skeleton screens). Hoober, "How Do Users Really Hold Mobile Devices?". W3C, "What's New in WCAG 2.2". Apple HIG (44 pt), Material (48 dp). Stanford Web Credibility Project guidelines. Brignull, deceptive patterns taxonomy.
