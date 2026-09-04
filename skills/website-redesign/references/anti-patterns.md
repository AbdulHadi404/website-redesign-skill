# Anti-patterns — what makes a site read as generated

Read this before finalising the art direction and again before implementation. Each item is common because it is easy; each one is a signal to a visitor that nobody designed this.

## The refresh disguised as a redesign

The most important failure, because it feels like success from the inside. Symptoms:

- The display typeface, the palette and the hero composition all survive "because they work".
- New components are added (product cards, diagrams, an index) while nav, footer and section grammar stay the same.
- The before/after screenshots look like the same site after a good week of polish.

The test: name the five things a stranger notices first on the old site. If the new site keeps three, it is a refresh. Fix it at the direction stage; it is far more expensive to discover after implementation.

## Composition

- Hero = headline + paragraph + two pill buttons + a dashboard screenshot (or a glowing blob).
- Heading → paragraph → three cards, repeated down the page.
- Everything in identical rounded containers with the same border and shadow.
- Icon grids: a small icon, a bold label, two lines of copy, times six.
- Every heading the same size; no level between the hero and the body.
- Every section the same width, the same padding, the same alignment.
- Cards used for content that is a list, a table, a diagram or a paragraph.
- Pill badges and chips as decoration ("NEW", "AI-POWERED") rather than as data.

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
