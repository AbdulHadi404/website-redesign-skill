# Resources — where to look, and what is safe to ship

A curated map of free and open resources for redesign work, with licences, maintenance and a verdict for each: **use** directly, **learn** from it, or **avoid**. Everything was checked on **2026-09-28** from the primary source where possible (the LICENSE file in the npm tarball or repo; the package registry for versions and dates); vendor pages that could not be fetched were read through search and are marked as such in `research/streams/`. Licences change — Remix Icon, PrimeReact, ApexCharts and GSAP all changed theirs in the last eighteen months — so **re-check before shipping anything a client depends on**, and refresh these files rather than letting them age.

| File | Covers |
| --- | --- |
| `assets.md` | icons, illustration, photography and archives, patterns and backgrounds, avatars, placeholders, flags, emoji, brand logos |
| `type-and-colour.md` | font sources and their licences, a shortlist by voice with alternatives to the over-used defaults, tabular figures, loading; colour tools and data palettes |
| `libraries.md` | component libraries and primitives, tables, forms, toasts, date pickers, motion, 3D and chart libraries — with measured sizes |
| `tools.md` | tools for the work itself: this skill's scripts, token extraction, accessibility and performance testing, visual regression, asset optimisation, detectors, browser MCPs |
| `inspiration.md` | galleries, pattern libraries, design systems and open-source products worth studying, and how to use them without copying |

## Licence classes — sort every asset before it enters the repo

| Class | Licences | What you may do |
| --- | --- | --- |
| **A — ship freely** | MIT, ISC, Apache-2.0, BSD, CC0, Unlicense, SIL OFL 1.1 (fonts); the Unsplash, Pexels and Pixabay licences (photos) | use, modify, commit; keep licence files with vendored copies; record in `CREDITS.md` anyway |
| **B — ship with credit** | CC BY 4.0 / 3.0 (Solar icons, Streamline free, Hero Patterns, many DiceBear styles, Twemoji graphics, ESA/Hubble and ESA/Webb images), Storyset and Absurd free tiers | only with a visible credit reachable by visitors (a credits page is the usual reading) |
| **C — avoid for site assets** | CC BY-SA (OpenMoji, many Wikimedia files); licences that forbid redistribution when the repo is public (Fontshare's ITF Free Font License); licences that forbid logo or identity use (Remix Icon v1.0) | only with a human decision recorded in `DESIGN.md` |
| **D — never** | NC (non-commercial), ND when you will modify, "personal use only", unknown or unstated licences, scraped or AI-generated likenesses of real people | reject |

Trademark sits outside all four: a CC0 SVG of a company's logo is still that company's mark. Use a third-party mark only to refer to that company, unmodified, following its guidelines, never implying endorsement. Model and property releases are not covered by free photo licences: no identifiable person in anything that reads as a testimonial or endorsement.

## How to check a resource you find

```bash
npm view <pkg> version license time.modified repository.url deprecated   # version, licence field, last publish
npm pack <pkg> && tar -xzf <pkg>-*.tgz && cat package/LICENSE*            # the licence actually shipped
git clone --depth 50 <repo> && git -C <repo> log --since=1.year --oneline | wc -l   # activity
```

For **code libraries**, `node scripts/libcheck.mjs <pkg>` does these steps and more (licence class with the restrictive sentences quoted, releases, activity, adoption, `--size`): triage for a human to read, never a gate.

The shipped LICENSE file wins over the package.json field (Remix Icon's package.json still says Apache-2.0; its shipped licence forbids logo use). Aggregators lag upstream (Iconify still lists Remix as Apache-2.0). A wrapper's licence is not the artwork's (Solar's React wrapper is MIT, its icons CC BY; Hero Patterns' npm wrapper is MIT, the patterns CC BY). A licence file can cover only the third-party code a package bundles ("This document applies to the third party software included with this package"): the package's own licence is then its package.json field or a EULA it ships. A package.json licence that names commercial terms (Commercial, a EULA or a purchase URL) beside a permissive licence file is a conflict to read, not a permissive licence. An SPDX OR expression ("(MIT OR GPL-3.0-or-later)") is your choice: the class is the most permissive alternative's, even when the licence file holds every text — record the one you chose in `CREDITS.md`; an AND expression means all of them apply. Record every third-party asset — source, licence class, credit text — in `CREDITS.md` next to the assets.
