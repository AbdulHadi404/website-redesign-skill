# Brand audit — the Instagram account as the brand

Written 2026-10-01 from `social/posts.md` (the owner's export of the last nine posts: captions, like counts and her own descriptions of each photo). The photographs themselves are on the owner's phone and were **not** available, so nothing below was sampled from pixels; colours are named from her descriptions and drawn, not measured. When the photos arrive, sample the backdrop set with `palette.mjs --from` and re-check the colour tokens against it.

## Census

| # | What | Kind | Likes / views |
| --- | --- | --- | --- |
| 1 | Loose hand-tied bouquet: peach garden roses, white lisianthus, silver-dollar eucalyptus, kraft + jute twine, on crumpled sage linen, from above, window light | **signature** bouquet | 412 |
| 2 | Shop front at dusk: dark green door, brass number 14, buckets of chrysanthemums | the shop | 188 |
| 3 | One café-au-lait dahlia on the same sage linen | single stem, signature set | 530 |
| 4 | Owner's hands tying a bouquet; twine, scissors, handwritten card "for Mum x" | process / the hand-written card | 366 |
| 5 | Reel: a Grand bouquet built stem by stem, "25 stems in 60 seconds" (cover only 540 px) | process | 1,204 views |
| 6 | Blush peonies in a hat box, sage ribbon; "Pre-order now" | seasonal | 602 |
| 7 | Bucket of tulips in five colours on the pavement, "Pick & mix Saturday" | shop moment | 241 |
| 8 | Bouquet in white tissue on a doorstep with a delivery card, "Same-day to LS7 and LS8 if you order by 1" | delivery | 157 |
| 9 | Flat lay of **12 single stems, each with a small kraft tag in handwriting**, "Which one are you?" | stems as characters | 722 |

**Signature:** loose, hand-tied, garden-style bouquets laid on sage linen and shot from above (1, 3, 6), and single stems treated as characters (3, 9). **Bread-and-butter:** chrysanthemums, the doorstep delivery shot. The most-liked posts are the ones about *individual stems* (3: 530, 6: 602, 9: 722) and the *process of building* (5: 1,204 views). That is the builder's whole premise: people love picking stems and watching a bouquet come together.

## Photography set and materials (the brand asset that matters)

The newest consistent set (1, 3, 6) shares one backdrop: **crumpled sage-green linen in soft window light**, shot from directly above. The supporting materials recur: **kraft paper, jute twine, small kraft tags, handwriting** (1, 4, 9), a **hat box** (6), **white tissue** (8). The shop itself is a **dark green door with a brass "14"** (2).

Consequence: the site is staged the way she stages her photos — the bouquet seen from above on sage linen, wrapped in her actual wraps, tags in handwriting. These materials are the brand; the 2017 clip-art logo is not.

## The logo versus the work

`assets/logo.svg` (clip art, 2017): a pink rose on a green stem and "Stem & Wren" set in Great Vibes. Sampled with `palette.mjs --from assets/logo.svg`: `#d6336c` 40%, `#2b8a3e` 40%, `#a61e4d` 20% — these are Open Color's pink 7, green 9 and pink 9, i.e. framework defaults, not chosen colours. The wordmark's font is not embedded in the SVG, so on every device it renders in whatever fallback serif or cursive the browser has (seen in the captures: a Times-like serif). The logo and the work disagree; following `discovery.md` §2.5, the site follows the work, keeps the name and the stem-and-bloom motif, and puts a refined mark to the owner as a proposal (not shipped).

## Voice (from captions)

First person singular, the owner talking ("Yes, even when my handwriting is terrible"). Short, dry, local and specific: places (Moortown, LS7, LS8), times ("by 1"), numbers ("25 stems in 60 seconds", "about five minutes a year"). No exclamation marks in eight of nine captions; one emoji per caption at most. Never "lovingly handcrafted with passion". Consequence: site copy in short, plain, specific sentences in her voice; no emoji in UI; no superlatives.

## Customers (from captions and README)

Occasions named in posts: a 90th birthday (1), Mother's Day (2), "for Mum" (4). Places: Moortown, LS7, LS8. Customers come from Instagram on phones (owner's message). Customer words from the README: "see what it'll look like", "picked peonies in October", "the price at the very end", "so long on my phone", "doesn't look like the same shop".

## How the business runs today

Bio: "Hand-tied, hand-written, delivered · Order ↓ stemandwren.co.uk/order". The order form is the only online route; problems surface as phone calls (out-of-season swaps) and messages (price, preview). The pain to remove is information lost between what customers picture and what the form captures.

## Real proof that exists

The shop's address (14 Harrogate Road, Chapel Allerton, LS7 3NB), same-day rule (zone A by 13:00), handwritten cards, the stem list with prices and seasons, the nine posts and their captions. **Not** proof: the three testimonials on the old home page ("Sarah", "James", "Emma") have no source in the repo or the export — treated as unverified (assumption A8 in `REPORT.md`).
