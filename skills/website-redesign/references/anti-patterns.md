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
- One background colour for the whole page, so it has no chapters.

## Typography

- Keeping the existing families because they already load.
- A single grotesk at one weight for everything.
- Display type that is just body type made bigger.
- Uppercase tracking on long text; centred paragraphs wider than 70 characters.
- Headlines wrapped by chance rather than by intent.

## Imagery

- Stock photography that could belong to any company (handshakes, laptops on white desks, smiling headsets).
- Images used as texture rather than as narrative.
- Placeholder boxes shipped as "image goes here".
- Copy placed over the busy part of a photograph.
- Hot-linked images from temporary URLs.

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
