# S9: which polish moves are perceptible

A fixture page (a product landing with a small app panel, fictional content) with 24 polish moves, each a class on
`<html>` (`page/styles.css`, Part 2; the list is `lib/moves.mjs`), plus a no-change control.

## Re-run

```bash
npm install                      # pixelmatch, pngjs (the skill's scripts folder must be installed too)
node run.mjs                     # fonts, captures, measures, probe, blind sheets, stacks, shots/, results.json
node run.mjs --stage singles     # every move alone
node run.mjs --stage stacks      # the stacks named in judgements.json
node run.mjs --no-capture        # re-measure the captures already on disk
```

Captures, diffs and blind sheets go to `captures/` (git-ignored, rebuilt by `run.mjs`); a few JPEG sheets are kept
in `shots/`. Fonts are fetched by `fetch-assets.mjs` (Google Sans Flex, OFL) into `assets/` (git-ignored). The
photograph is CC0 (`page/img/LICENSE.txt`).

## Blind review of the sheets

`captures/blind/p*.jpg` (single moves) and `s*.jpg` (stacks) each show a baseline and a variant as "A" and "B",
sides and order randomised with a fixed seed. For each sheet, before opening anything else, write down:

1. Is there any visible difference between A and B at the size shown? (yes / no)
2. If yes, which side looks more finished, more premium? (A / B / can't tell)

Then compare with `blind-key.json` (variant, view, and which side is the variant). Do not open `blind-key.json`,
`results.json` or the run logs before judging: they name the moves.

The builder's own judgements are in `judgements.json`: made from the same sheets, but by the agent that built the
moves, so not blind to what changed. `run.mjs` reads the stack definitions from that file.
