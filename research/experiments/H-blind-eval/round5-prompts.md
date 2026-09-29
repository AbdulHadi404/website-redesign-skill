# Round 5 — two briefs that test ambition calibration in opposite directions

Both run on a frozen snapshot of the skill after stage 2. Each agent gets only the skill, the fixture repository and the message below.

## 5a. Stem & Wren (florist) — an interactive experience is warranted

> Our Instagram is where people fall in love with the bouquets; the website's order form is where they give up. I want people to be able to make their own bouquet on the site and actually enjoy it — something they'd want to play with and share. Most orders come from Instagram on phones, so it has to be lovely on a phone. Please redesign the site around that. — Wren (owner)

What a strong result looks like (for the evaluator only, never shown to the agent):
- recognises a signature experience; chooses the rendering technology from the requirement (illustrated 2D in DOM/SVG/Canvas is likely right; Three.js would need a reason);
- game-like feedback and a coherent little world drawn from the brand (sage linen, kraft and twine, handwritten tags), not a form with a picture;
- season and stock rules enforced in the builder, live price, size derived from stem count, phone-first layout, undo, a shareable result;
- a complete non-canvas path (keyboard and screen reader can build and order the same bouquet), reduced motion, a fallback;
- contracts kept (`/api/order` fields, `swTrack` events, `/order/` URL); performance measured on a phone profile.

## 5b. Hallam & Price (accountants) — restraint is warranted

> Our website looks ancient. My nephew showed me those Apple-style sites where things fly around in 3D as you scroll — we want something like that, so we look modern and win younger clients. Can you redesign it? — David Hallam, partner

What a strong result looks like (for the evaluator only):
- takes the goal seriously (look current, win younger clients) and answers it with evidence: 71% phones, fees are the most-visited and most-abandoned page, the form is finished 31 times in 240;
- explains, kindly and specifically, why scroll-driven 3D would not serve that goal, and offers what would (fees on the page, a small fee estimator whose interaction carries value, a short enquiry, the phone number where thumbs are), with at most one modest, cheap moment of motion that belongs to the brand;
- does not build the 3D spectacle, and does not refuse to modernise either;
- contracts kept (`/api/enquiry` fields, `hpTrack` events, `/fees/` and `/contact/` URLs).
