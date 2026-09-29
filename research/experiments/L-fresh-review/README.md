# Experiment L: a fresh-context reviewer against the builder's self-review

**Question.** The skill prefers a fresh-context reviewer for Phase 7: a subagent given only the brief, the direction and the captures. No blind-evaluation environment had a subagent tool, so every critique so far was a self-review. Does independence change the result?

**Setup.** 2026-09-28.

- **Subject:** the round-3 blind-test output, the Azul & Co storefront (`../H-blind-eval/azul/`).
- **Builder's critique:** `../H-blind-eval/azul/CRITIQUE.md`, two rounds of self-review. The builder wrote its first impression from the blurred captures before re-reading its direction, as the fallback says.
- **Fresh reviewer:** a new agent given only:
  - the brief and the direction, extracted from `DESIGN.md` (`packet-BRIEF.md`, `packet-DIRECTION.md`)
  - the page captures at 1440 and 390, old and new
  - the critique template and the Phase 7 method

  It was told to write its first impression before reading the direction, and it had no access to the code, `DESIGN.md`'s verification record, the builder's critique or the report. Its sheets are `home-1440-fold-blur.png` and `phone-folds.png`.

## Result

| | Builder (self-review, 2 rounds) | Fresh reviewer (1 pass) |
| --- | --- | --- |
| Checks answered "no" | 0 of 22 | 2 (rhythm; states rendered) |
| Checks answered "partial" | 0 (one "yes, with a caveat") | 5 (swap test, generated look, boxes, imagery, mobile) |
| Ranked findings | none remaining | 9 |
| Its own "breaks if" tested against the renders | no | yes — the first one is broken |

**The findings, checked by me against the captures before being recorded:**

1. **The direction's own first "breaks if" fails.** The rule reads "a price or total appears without the delivery cost beside it". Yet the product page's running total, "1 tile: £6.50 (about 0.02 m²)", sits beside Add to basket with no delivery (`../H-blind-eval/azul/captures/product-id-az-101-1440-fold.png`). The delivery panel is 300 px higher and gives only general rates.
2. **The imagery contradicts the copy.** "Painted by hand … each tile slightly different" sits over a hero of 21 pixel-identical vector tiles. The fixture shipped only SVG artwork, so the fix was to change the copy or ask for photographs, not to invent variation. The builder's truth check covered numbers and quotations, never what an image asserts.
3. **The home page's rhythm rule is broken.** Chapters 2–4 all use "heading left, content right". The builder had answered check 8 "yes".
4. **Sold-out designs are shown faded**, which misrepresents the glaze colours on a shop whose principle is "show it as it will look".
5. **Checkout details:**
   - the read-only delivery line is drawn like an input;
   - on an empty basket, "Place order" looks enabled and "Your basket is empty" appears three times.

   The reviewer saw only the empty basket, because the captures handed over had no filled state.

The rest (the story's 2×2 reading as feature cards, a 14 px delivery line that vanishes in the blur, Add to basket 1.6 screens down on a phone, alignment polish) are judgement calls a designer would raise.

**Why the self-review missed them.** It was not careless; it named evidence for every "yes". But it:

- answered each check as a question about its own intentions ("selected ≠ accent? yes, ink border") rather than hunting the renders for counter-evidence;
- never re-read its own "breaks if" list against the captures;
- had no check asking whether an image says something the copy or the product contradicts.

The reviewer had one advantage besides independence: it was reading the direction for the first time, so its "breaks if" was a checklist rather than a memory.

**Caveats.** One subject, one reviewer and one pass. The reviewer could not judge keyboard use, performance or filled states. Some of its partials are taste, and a second reviewer might disagree. The direction of the result, though, matches every earlier observation: the builder's account of its own work is optimistic.

## What changed in the skill

- **SKILL.md Phase 7:** when a subagent tool exists, the fresh reviewer is required, not preferred, with this result as the reason.
- **`templates/critique.md` gains two checks, both for self-review and fresh review:**
  - **"Breaks if":** each of the direction's three, tested against a named capture.
  - **"Images tell the truth":** no image contradicting the copy beside it, and no product image altered (faded, filtered, idealised) so that a buyer would be misled.
- **`visual-qa.md`:** the reviewer's packet includes the state captures (filled, error, loading, seeded with `--storage`), not only the empty pages. The self-review fallback now starts by hunting each "yes" for counter-evidence, beginning with the "breaks if" list.
