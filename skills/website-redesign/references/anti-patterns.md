# Anti-patterns — what makes a site read as generated

Read this before finalising the art direction and again before implementation. Each item is common because it is easy; each one is a signal to a visitor that nobody designed this.

## The refresh disguised as a redesign

The most important failure, because it feels like success from the inside. Symptoms:

- The display typeface, the palette and the hero composition all survive "because they work".
- New components are added (product cards, diagrams, an index) while nav, footer and section grammar stay the same.
- The before/after screenshots look like the same site after a good week of polish.

The test: name the five things a stranger notices first on the old site. If the new site keeps three, it is a refresh. Fix it at the direction stage; it is far more expensive to discover after implementation.

## The skill's own house style

Run this skill on several companies and, left alone, it converges on one look: bone or paper surfaces, a serif display face with an italic emphasised phrase, monospace uppercase eyebrows and labels, near-black "ink" chapters, one warm accent (amber, orange, green), hairline rules everywhere. Each of those is a fine choice once; together they are a template, and a user who has seen it on one of their sites will recognise it instantly on the next. Symptoms:

- The palette was chosen from taste rather than sampled from the logo; the brand's own colours vanished.
- The display face is a serif "because it is distinctive" — distinctive from the old site, not from the skill's last three outputs.
- Mono uppercase labels appear on a company that has nothing to do with code. Monospace reads as *developer tool*; for a sales, services, consumer or manufacturing company it is the wrong voice. Use the sans or display face with tabular figures for data instead.
- The concept line is about the company, but nothing on the page is derived from the company's actual identity assets.

The test: write the direction in one sentence and ask whether it would also describe the last site this skill produced for this user. If yes, change the family, not the values.

## Composition

- Hero = headline + paragraph + two pill buttons + a dashboard screenshot (or a glowing blob).
- Heading → paragraph → three cards, repeated down the page.
- Everything in identical rounded containers with the same border and shadow.
- Icon grids: a small icon, a bold label, two lines of copy, times six.
- Every heading the same size; no level between the hero and the body.
- Every section the same width, the same padding, the same alignment.
- Cards used for content that is a list, a table, a diagram or a paragraph.
- The stepper timeline: a thin rule with dots or icons at each step, labels beneath. It reads as a progress bar or an onboarding widget. Its opposite failure is the *grid pretending to be a timeline* — four ruled columns with numbers, no path, no art. A timeline the user will call beautiful has a drawn path that moves through nodes, milestone artwork on alternating sides, and a vertical rail on phones; the artwork should show the company's own artifact changing over time.
- A site made only of type, rules and data fragments. It is disciplined but reads as unfinished to a founder. Every redesign needs a designed graphics layer in one consistent line style: milestone art, spot illustrations for comparisons, glyphs for indices and lists, and a motif-based watermark family — all drawn in the brand's palette, never a mismatched icon set.
- A hero visual floating on a flat ground with only a watermark behind it. The hero object needs its own surface — a panel, a band, a grid it belongs to — or the first viewport reads as unfinished.
- Pill badges and chips as decoration ("NEW", "AI-POWERED") rather than as data.
- The accent-stripe card: a coloured left or top border on a card or column as the only signal of status, category or "most popular". It is the signature of generated UI. Encode status as a labelled tag with a data mark, a word, or a position; emphasise a column with its label, not a stripe.

## Colour and surface

- Purple/blue "AI" gradients regardless of brand.
- Random glowing blobs, mesh gradients and grain as a substitute for composition.
- Glassmorphism on everything.
- Accent colour on every heading, icon and border until it stops meaning anything.
- **More than one full-bleed accent chapter per page**, or accent used as a field *and* as the button colour, so the primary action has to change colour to stay visible. One identity field per page; the action colour never changes (`design-theory.md`, the 60/30/10 budget).
- One background colour for the whole page, so it has no chapters.

## Typography

- Keeping the existing families because they already load.
- A single grotesk at one weight for everything.
- Display type that is just body type made bigger.
- Uppercase tracking on long text; centred paragraphs wider than 70 characters.
- **Tracked capitals in a condensed or geometric grotesk at 10–13px as the label system** — eyebrows, field labels, chips, tabs, numerals. To a non-designer this reads as a terminal or a spec sheet ("the code kind of font") even though no monospace is loaded; the monospace ban in "The skill's own house style" is about the *voice*, and this is the same voice by another route. One small-caps device per page at most; the rest sentence case in the text face.
- **Typesetting an object that looks like machine output** — an MRZ strip (`P<CLEOHR<<SANTOS<<<<`), a hash, a serial block — as "authenticity". It reads as code. Draw the object (a signature line, a seal, a stamp) or leave it out.
- Headlines wrapped by chance rather than by intent.

## Imagery

- Stock photography that could belong to any company (handshakes, laptops on white desks, smiling headsets).
- Images used as texture rather than as narrative.
- Placeholder boxes shipped as "image goes here".
- Copy placed over the busy part of a photograph.
- Hot-linked images from temporary URLs.

## Custom artwork and diagrams

Illustration you draw yourself fails in ways stock imagery never does. Each of these reads as "unfinished" rather than "wrong", which is why it survives a full-page review:

- **Debris**: small marks, dots, ticks or lines floating outside the object they belong to. Every element sits inside the artwork's own frame, or deliberately overlaps it as a layered card — never drifts free beside it.
- **Elements that break their container**: a glyph overflowing the circle it sits in, a chip hanging off the edge of the tile, a shape crossing a header band it should sit under.
- **A label or badge that covers data**: a stamp placed over the very blocks it certifies, a legend on top of a bar. Lay the data out first, then reserve the corner the label needs.
- **Diagram labels outside the viewBox**: text anchored outward from a node gets clipped, because the viewBox was sized for the geometry and not for the type. Size the viewBox around the labels, and give every label a halo (`paint-order: stroke fill`) so it survives whatever is behind it.
- **Labels that collide**: two nodes whose labels meet, or a label crossed by a connector line. Lay nodes out on a column or an arc so the label side is always clear.
- **Disconnected objects**: a tool drawn as a head and a handle that do not meet, an arrow that misses its target. If it needs two paths, check they touch.
- **Decoration that escapes its surface**: a watermark positioned freely against a background painted by a `::before` will spill onto the surrounding surface at some width. Give the surface a real element with `overflow: hidden` and put the watermark inside it.
- **A watermark clipped down to a meaningless wedge**: a huge mark cropped by its container until only a diagonal band shows reads as a stray shape, not as the logo — and it is worse when it crosses the headline. Either show enough of the form to be recognisable, or make it a small complete ornament in a corner that has no copy.
- **Positioning inside a full-bleed container**: a ground that bleeds with `left: -100vw; right: -100vw` moves its own edges 100vw away, so a child positioned with `right:`/`left:` lands off-screen. Anchor such children back to the visible panel with `calc(100vw - …)`, and check the watermark is actually visible after clipping it.

## Product and proof

- Describing capabilities in bullets and never showing the product.
- Fabricated dashboards, numbers, customers, logos or testimonials.
- Sample data that looks like real customer data.
- A demo the site could offer, buried at the bottom or omitted.

## Motion

- Fade-up on every element, at the same delay.
- Parallax, particles or counters that carry no meaning.
- Animation that causes layout shift or makes scrolling heavy.
- No reduced-motion handling.

## Copy

- "Powerful", "seamless", "next-generation", "revolutionize", "supercharge".
- Paragraphs where a sentence would do; walls of text under every heading.
- Headlines that could sit above any product.

## Process

- Judging the result from the source code without rendering it.
- Testing one viewport.
- Reporting weaknesses in the final message instead of fixing them.
- Deploying to production without being asked.
- Inventing anything to fill a layout.
