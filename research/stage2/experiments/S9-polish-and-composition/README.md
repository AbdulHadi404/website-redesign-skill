# S9: which polish moves are perceptible

A fixture page (a product landing with a small app panel, fictional content) with 24 polish moves, each a class on
`<html>` (`page/styles.css`, Part 2; the list is `lib/moves.mjs`), plus a no-change control.

## Re-run

```bash
npm install                      # pixelmatch, pngjs (the skill's scripts folder must be installed too)
node run.mjs                     # everything below, in order, then results.json
node run.mjs --stage singles     # every move alone: captures, measures, probe, blind sheets
node run.mjs --stage checks      # the small lab checks (focus ring vs corner-shape; what pixelmatch sees; audit vs probe)
node run.mjs --stage stacks      # the stacks named in judgements.json
node run.mjs --stage nofocus     # every move again without the forced focus on the primary action; value masses
node run.mjs --stage outside     # the probe (v1 and v2) on 19 pages it was not built on (outside.mjs)
node run.mjs --no-capture        # re-measure the captures already on disk
node summarise.mjs               # the report tables, from results.json, judgements.json and outside-review.json
node polish-probe.mjs --base http://localhost:3000 --paths / --widths 1440,390 [--primary '.cta']   # the probe on any site
node de-diff.mjs before.png after.png   # pixelmatch next to the CIEDE2000 areas it misses
```

A full run takes 20 to 25 minutes on a shared 4-CPU machine (captures in batches of six variants, retried if a
capture process dies).

Captures, diffs and blind sheets go to `captures/` (git-ignored, rebuilt by `run.mjs`); a few JPEG sheets are kept
in `shots/`. Fonts are fetched by `fetch-assets.mjs` (Google Sans Flex, OFL) into `assets/` (git-ignored). The
photograph is CC0 (`page/img/LICENSE.txt`).

**The forced focus state.** `page/index.html` focuses the primary action on load so the focus-ring move has a ring to
show; every capture in the singles and stacks stages (and every judged sheet) shows it. The `nofocus` stage captures
every move without it (`m-nofocus` on `<html>`) and reports how much the forced state changed each measure.

**The probe.** `lib/probe.mjs` (v2, after review) groups its checks into defects, style questions and information and
uses no class names from this page. `lib/probe-v1.mjs` is the frozen first version, kept only so `outside.mjs` can
show what changed. `outside-review.json` holds the hand verdicts on every v2 defect flag on the outside pages (made by
the probe's builder, not blind), the record of the held-out first run, and the v1 errors the review found.

## Blind review of the sheets

`captures/blind/p*.jpg` (single moves), `q*.jpg` (extra windows for moves pixelmatch cannot see) and `s*.jpg` (stacks) each show a baseline and a variant as "A" and "B",
sides and order randomised with a fixed seed. For each sheet, before opening anything else, write down:

1. Is there any visible difference between A and B at the size shown? (yes / no)
2. If yes, which side looks more finished, more premium? (A / B / can't tell)

Then compare with `blind-key.json` (variant, view, and which side is the variant). Do not open `blind-key.json`,
`results.json` or the run logs before judging: they name the moves.

The builder's own judgements are in `judgements.json`: made from the same sheets, but by the agent that built the
moves, so not blind to what the moves were. The stack sheets (`s*`) were judged after the single-move key had been
opened and the stacks defined from it, and the notes name signature moves, so they are not blind in practice. A naive
reviewer (a person, or a fresh agent that has not seen this folder's code or results) is the missing step: judge
`captures/blind/*.jpg` first, then score against `blind-key.json`. The 1440 sheets are two 1440 px panels in one
image of about 1850 px, so at 100 % zoom they show the page at about 0.63x; view them at that size and say so.
`run.mjs` reads the stack definitions from `judgements.json`.
