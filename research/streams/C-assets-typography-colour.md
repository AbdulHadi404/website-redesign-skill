# Stream C: free visual resources, typography and colour, with verified licences

**Scope.** Icons, brand logos, emoji, illustration, photography and archives, patterns and gradients, placeholders, avatars, flags, fonts (sources, a shortlist by voice, loading, Arabic and other scripts) and colour tools. The aim is a curated, licence-checked resource layer plus the selection principles an expert would use, so the skill stops defaulting to Lucide, Inter and unDraw.

**Date checked: 2026-09-28** (all rows unless marked otherwise).

**How things were verified.** In the evidence column, the codes mean:

| Code | Meaning |
| --- | --- |
| **F** | *File-verified.* I read the licence text that actually ships: the npm tarball (`npm pack`) or the upstream repo (`raw.githubusercontent.com`). |
| **T** | *Tested.* I measured the behaviour myself: fontTools on the font binaries, the files the Google Fonts API actually serves, headless Chrome 154 renders, and SVG sources. |
| **G** | I read the GitHub page or issue (github.com was reachable). |
| **S** | *Search-verified.* This session's egress policy blocked vendor sites (unsplash.com, pexels.com, pixabay.com, undraw.co, fontshare.com, streamlinehq.com, hugeicons.com, fonts.google.com, w3.org, wikipedia). For those I read summaries of the live pages through web search. Re-read the page itself before relying on an **S** row for a client. |

Package versions and dates are npm's `time[version]`, not `time.modified`.

---

## 0. The ten findings that matter most

1. **Remix Icon is no longer Apache-2.0.** Since January 2026 it ships under the custom *Remix Icon License v1.0*, which **forbids using any icon, even modified, as a logo, trademark, app icon or brand identity** (F, from the `License` file in `remixicon@4.9.1`; G, issue #1069 dated 2026-01-25). Two places still say Apache-2.0: the `remixicon` package.json and Iconify's metadata. `@remixicon/react` declares the new licence. An agent that "makes a logo from an icon" breaches it.
2. **Lucide 1.0 (2026-03-23) removed brand icons.** `lucide-react@0.577.0` ships `icons/github.js`; `1.48.0` does not (F). `import { Github } from 'lucide-react'` breaks on upgrade. Use Simple Icons for brand marks.
3. **The Google Fonts API strips optional OpenType features, and Fontsource inherits the stripping** (T).
   - *Kept:* `tnum`, `pnum`, `frac` and the default shaping features (sometimes `lnum`).
   - *Dropped:* `zero`, `onum`, `case`, `smcp`/`c2sc`, `ss01–20`, `cv01–99`, `salt`, `sups`/`subs`, `dlig`.
   - Inter served from Google loses slashed zero and all its character variants. IBM Plex Sans loses `zero`, `onum` and its stylistic sets.
   - Consequence: `font-variant-numeric: slashed-zero`, `oldstyle-nums` and real small caps silently do nothing with Google-hosted or Fontsource fonts. Getting them means self-hosting from the upstream release with `--layout-features='*'`.
4. **Several popular faces have no tabular figures at all** (T, fontTools on the upstream binaries): **DM Sans, Poppins, Fraunces, Instrument Serif, DM Serif Display, Albert Sans, Be Vietnam Pro, Libre Franklin, Urbanist, League Spartan, Gantari, Wix Madefor, Inclusive Sans, Parkinsans**, plus the Arabic faces **Tajawal and Almarai**. None of them is safe for price tables, dashboards or counters.
5. **Material Symbols is a 4.0 MB font** (outlined, full variable). The Google Fonts `&icon_names=home,search,menu` parameter cuts it to **3.3 KB** (T). Per-icon SVGs are the other fix.
6. **Fontshare's closed-source fonts (ITF Free Font License) must not be committed to a public repository.** §02 forbids making the font software available "by any means", naming "repository" and "publicly accessible servers". Self-hosting for your own site is allowed (S, plus G: kollektiv-mc issue #40, 2026-09-25). This matters because this skill commits redesigns to git. Satoshi, General Sans, Clash Display and similar need a private repo, the Fontshare CDN, or an OFL alternative.
7. **CC BY sets hide inside "free" icon and avatar libraries.**
   - Icon sets needing attribution: Solar (CC BY 4.0, wrapped by a third party as MIT), all Streamline free sets, Basil, Lets Icons, IconaMoon, Pepicons, Codicons, Twemoji. Game-icons is CC BY 3.0, and OpenMoji is **CC BY-SA 4.0** (share-alike).
   - DiceBear avatars: **13 of 31 styles are CC BY 4.0**, and Avataaars and Bottts use custom terms (F, all 31 style packages packed).
   - Iconify makes pulling any of these one line of code, so filter by SPDX before use (script in §3.3).
8. **Paid tiers are mixed into free catalogues.**
   - Unsplash+ (`plus.unsplash.com`).
   - Hugeicons: the free set is Stroke Rounded only; Pro is per-seat (F, `PRO-LICENSE.md`).
   - Blush: the free plan exports a PNG of about 250×400 px only; SVG needs Pro (S).
   - Storyset and Absurd Design: free use requires visible attribution (S).
   - Haikei: commercial terms unclear (S).
9. **Arabic needs different typographic rules** (T, headless Chrome 154):
   - Chrome now preserves joins under `letter-spacing` but still inserts uneven gaps at non-joining letters.
   - Chrome synthesises a fake slanted "italic" for Arabic.
   - Rules: no tracking on Arabic, no italic (use `font-synthesis: weight`), line-height 1.6–1.8, and Arabic set about 10–15% larger than Latin (S).
   - The Arabic faces differ a lot in numerals: Tajawal, Almarai and Readex Pro lack Persian digits, and several lack `tnum` (T).
10. **Licences say nothing about trademarks or privacy.** Simple Icons (CC0), svgl (MIT) and Devicon (MIT) license the SVG files, never the right to use the mark. NASA content is public domain, but the insignia, "worm" and seal need permission and endorsement is barred. ESA/Hubble and ESA/Webb images are **CC BY 4.0, with a mandatory visible credit** (S). Free stock licences exclude model releases: no identifiable person may be shown in a bad light or appear to endorse (S).

---

## 1. Licence primer: the classes an agent should sort every asset into

| Class | Licences | What the agent may do |
| --- | --- | --- |
| **A. Ship freely** | MIT, ISC, Apache-2.0, BSD, CC0-1.0, Unlicense, SIL OFL-1.1 (fonts), Unsplash / Pexels / Pixabay / Kaboompics standard licences (photos) | Use, modify and commit. Keep the licence file with vendored copies (MIT/ISC/Apache require the notice "in all copies or substantial portions", which a bundled npm package already carries). Record the asset in `CREDITS.md` anyway. |
| **B. Ship with credit** | CC BY 4.0 / 3.0, ESA/Hubble and ESA/Webb, Storyset free, Absurd free, Streamline free, Solar, Hero Patterns, DiceBear CC BY styles, Twemoji | Only if the page carries a visible credit reachable by visitors. A linked credits page is the usual reading of CC BY's "reasonable to the medium" clause. Absurd wants a credit **in each End Product**. |
| **C. Avoid for site assets** | CC BY-SA (OpenMoji, many Wikimedia files: derivatives must be BY-SA); custom freeware that forbids redistribution when the repo is public (ITF FFL); custom licences that forbid logo use (Remix Icon v1.0) | Only with a human decision recorded in `DESIGN.md`. |
| **D. Never** | NC (non-commercial), ND when you will modify, "free for personal use", unknown or unstated, AI-generated likenesses of real people, scraped faces | Reject. |

Trademark sits outside all four classes. A CC0 SVG of a logo is still a registered mark. Use a mark only to refer to that company, follow its brand guidelines, and never imply endorsement or partnership you cannot prove (the skill's anti-patterns already forbid fabricated logos).

**The OFL Reserved Font Name (RFN) nuance.** The OFL FAQ counts subsetting a webfont as modification, and a Modified Version may not use an RFN unless it stays "functionally equivalent" (S). These families declare RFNs (F, their `OFL.txt` in google/fonts):

- IBM Plex ("Plex"); Source Sans 3, Source Code Pro, Mada, Noto CJK and DM Serif Display ("Source")
- Merriweather and Martel ("Merriweather"); Lora; Playfair Display; Mona Sans and Hubot Sans
- Lexend and Readex Pro ("RevReading Lexend"); Libre Baskerville; Quicksand; Encode Sans; Bitter Pro
- Italiana, Marcellus, Gilda, Forum, Tenor Sans, Lilita, Intel One Mono
- Lateef, Scheherazade New, Harmattan ("SIL")
- Reem Kufi ("Josefin Sans")

The practical risk is small. Still, prefer families without an RFN when you plan an aggressive custom subset, or rename the internal family name of the subset.

---

## 2. Tooling facts used throughout

- **npm tarballs are the authoritative licence for what gets installed.** Package.json can disagree with the shipped text: `remixicon` says Apache-2.0 while its `License` file is the v1.0 custom licence. Always read the file.
- **Iconify `collections.json`** (`github.com/iconify/icon-sets`) gives SPDX, author, grid, count and category for 238 sets. It is excellent for filtering but can lag upstream (it still lists Remix Icon as Apache 2.0).
- **google/fonts `METADATA.pb`** gives the licence directory (ofl / apache / ufl), axes, subsets, date added and designer. The binaries in that repo are the full-feature upstream builds; the API-served files are not (§8.2).

---

## 3. Icons

### 3.1 Verified icon sets

Legend: Grid/stroke was read from the shipped SVGs (T). Count is Iconify's `total`. "Last" is the latest npm release.

| Set | Count | Grid, drawing | Licence (evidence) | Attribution | Framework packages | Character | Last release, status | Production? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Lucide** | 1,856 | 24, stroke **2**, round caps and joins | ISC; Feather-derived icons MIT (F) | No | `lucide`, `lucide-react`, `@lucide/svelte`, vue, angular, `lucide-static` | Friendly-neutral, the shadcn/ui default, so it reads "template" | 1.48.0, 2026-09-24; very active. **1.0 dropped brand icons.** `absoluteStrokeWidth`, `nonScalingStroke` and `LucideProvider` exist (F) | Yes |
| **Tabler** | 6,220 | 24, stroke **2**, round; outline + filled | MIT (F) | No | `@tabler/icons-react`, vue, svelte, webfont | Like Lucide but much larger; slightly more geometric | 3.48.0, 2026-09-22; very active | Yes |
| **Phosphor** | 9,072 (6 weights) | 256 viewBox, filled outlines; Regular ≈ 1.5 px at 24; thin, light, regular, bold, fill, **duotone** | MIT (F) | No | `@phosphor-icons/react`, `/web`, `/core`, vue | Warmest of the big sets. Thin and light suit editorial and luxury; duotone suits playful brands. Has a `mirrored` prop for RTL (F) | react 2.1.10, 2025-05-22; core 2024-03. Stable, slower | Yes |
| **Heroicons** | 1,288 (4 styles) | outline 24 at **1.5**, solid 24, mini 20, micro 16 | MIT (F) | No | `@heroicons/react`, vue | Tailwind house style; tidy and generic | 2.2.0, 2024-11-18; slow | Yes; small set |
| **Iconoir** | 1,671 | 24, stroke **1.5**, round; regular + solid | MIT (F) | No | `iconoir-react`, `@iconoir/vue`, css | Lighter, elegant, a little quirky | 7.12.1, 2026-08-12; active | Yes |
| **Hugeicons (free)** | 6,065 | 24, stroke **1.5**, round (Stroke Rounded only) | MIT for `@hugeicons/core-free-icons` (F). Pro = per-seat licence (F, `PRO-LICENSE.md`) | No (free) | `@hugeicons/react` + core-free | Soft, contemporary, rounded | core-free 4.3.5, 2026-09-21; active | Yes, free set only. Docs show Pro styles; do not copy them |
| **Mingcute** | 3,320 | 24, filled outlines with soft corners; line + fill | Apache-2.0 (F) | No | `mingcute_icon`, `@mingcute/react` | Rounded, friendly consumer-app feel | 2026-07-31; active | Yes |
| **Material Symbols** | 15,717 | 960 viewBox, filled; axes FILL, wght 100–700, GRAD, opsz 20–48; Outlined / Rounded / Sharp | Apache-2.0 (F) | No | Google Fonts; `material-symbols` / `@material-symbols/svg-*` (third-party packaging) | Reads as Google/Android; the axes give precise weight matching | 0.47.5, 2026-09-22 | Yes, but **never the full 4.0 MB font**. Use `&icon_names=` (3.3 KB, T) or SVGs |
| **Carbon** | 2,631 | 32 and 16, filled, squared terminals | Apache-2.0 (F) | No | `@carbon/icons`, `@carbon/icons-react` | IBM: engineered, enterprise, technical; pairs with Plex | 11.89.0, 2026-09-23; very active | Yes |
| **Fluent UI System** | 19,876 | 16–48 size-specific drawings, filled outlines; regular + filled | MIT (G: repo LICENSE; the npm tarball has none) | No | `@fluentui/react-icons`, `@fluentui/svg-icons` | Microsoft/Office, rounded and soft; genuine size-specific optical drawings | 2.0.343, 2026-09-25; very active | Yes |
| **Bootstrap Icons** | 2,078 | **16**, filled | MIT (F) | No | `bootstrap-icons` (svg, font) | Generic and Bootstrap-flavoured; good at true 16 px | 1.13.1, 2025-05-09 | Yes |
| **Radix Icons** | 332 | **15**, crisp | MIT (F) | No | `@radix-ui/react-icons` | Tiny, precise UI glyphs | 1.3.2, 2024-11-14; maintenance mode | Yes, for small UI only |
| **Remix Icon** | 3,188 | 24, filled; line + fill pairs | **Remix Icon License v1.0** (F): no logo, brand, app-icon or identity use; no standalone or competing icon packs | Optional | `remixicon`, `@remixicon/react` | Neutral, systematic | 4.9.1, 2026-01-29 | UI only. **Never for a mark** |
| **Solar** | 8,706 | 24; Linear, Outline, Bold, Broken, Duotone, Line-Duotone, Bold-Duotone | **CC BY 4.0** by 480 Design (S + F: the third-party `@solar-icons/react` ships MIT code plus `LICENSE-THIRD-PARTY` requiring visible credit) | **Yes** | `@solar-icons/react` (community) | Distinctive smoothed corners; the Broken style is characterful | 2.3.2, 2026-09-24 | Only with a credit line |
| **Streamline free** (Plump, Flex, Sharp, Ultimate, Freehand, Cyber, Color) | 500–3,000 per set | 24/28 | **CC BY 4.0** (Iconify F; S: "Free icons from Streamline" link to streamlinehq.com) | **Yes** | via Iconify | Varied; Freehand is characterful | — | Only with a credit line |
| **Feather** | 286 | 24, stroke 2 | MIT (F) | No | `feather-icons`, `react-feather` (2022) | The original of the Lucide look | 4.29.2, 2024-05-01; 410 open issues, 100 open PRs (G) | **Rejected: unmaintained, use Lucide** |
| **Simple Icons** | 3,461 brands | 24, single-colour path | CC0 for the project, but the DISCLAIMER says "that doesn't mean … all icons … are also CC0" and marks remain trademarks. Each icon has `license` and `guidelines` fields (F) | No | `simple-icons`, `@icons-pack/react-simple-icons`, Iconify `simple-icons` | Monochrome brand marks | 16.33.0, 2026-09-27; weekly | Yes, as marks that refer to the brand |
| **svgl** | web + API | multi-colour and wordmark logos | Repo MIT (F). Logos are third-party marks; the README asks contributors to confirm rights (F) | — | API / web | Full-colour logos | active | Reference only; follow each brand's guidelines |
| **Devicon** | 1,057 | 32, colour + plain | MIT (F); logos are trademarks | — | `devicon` | Tech-stack logos | 2.17.0, 2025-07-21 | Developer sites only |
| **SVG Logos** (gilbarbara) | 1,935 | colour | CC0 (F); trademarks | — | Iconify `logos` | Colour tech logos | — | Same caveat |

**Other sets worth knowing** (Iconify F; all class A): Akar, Majesticons, Myna UI, Pixelarticons (a pixel voice), ProIcons, Humbleicons, Gravity UI (Yandex, 16 px), Octicons (GitHub), Mage, Unicons, IconPark (ByteDance), Duoicons, Meteor, Sargam, System UIcons (Unlicense).

Sets needing attribution: Basil, Lets Icons, IconaMoon, Pepicons, Codicons, Font Awesome 6/7 icons and Twemoji (all CC BY 4.0), Game-icons (CC BY 3.0) and OpenMoji (CC BY-SA 4.0).

### 3.2 How an expert picks an icon set

1. **Decide whether you need icons at all.** `ui-ux.md` already says most icons need labels, and `anti-patterns.md` bans icon grids. On a marketing site, icons belong in navigation, controls, lists and inline meta, not as section decoration. Custom-drawn glyphs in the brand's line style (as `anti-patterns.md` asks) beat any library for a site's identity layer.
2. **Match stroke to the text next to it.** At 16 px, regular body text has vertical stems of roughly 1.3–1.8 px, and UI labels at 500–600 weight are heavier.
   - A 1.5 px set (Heroicons, Iconoir, Phosphor Regular, Hugeicons) sits well beside regular text.
   - A 2 px set (Lucide, Tabler, Feather) sits beside medium or semibold labels, or bold UI sans.
   - Material Symbols and Phosphor let you tune weight to the typeface.
   - When scaling, keep stroke constant: Lucide `absoluteStrokeWidth`, or CSS `vector-effect: non-scaling-stroke`. Scaling a 24 px, 2 px icon down to 16 px gives a blurry 1.33 px stroke.
3. **Match terminals and corners to the typeface.**
   - Round caps and joins suit humanist and rounded sans (Figtree, Nunito, Rubik, Fredoka, Source Sans).
   - Square terminals and hard corners suit grotesques and engineered faces (Plex, Archivo, Chivo, Barlow). Carbon or Material Sharp fit here.
   - Fine 1 px drawings (Phosphor Thin or Light, Iconoir) suit light editorial serifs and luxury.
   - Filled or duotone (Phosphor Duotone, Solar Bold Duotone) suit playful consumer brands.
4. **Optical size.** Use a set drawn for the size you render.
   - 16 px UI: Bootstrap, Carbon 16, Radix 15, Heroicons mini 20 or micro 16, Gravity UI.
   - 20–24 px: most sets.
   - Fluent ships genuinely different drawings per size; Material Symbols has an `opsz` axis.
5. **One set per product.** Mixing sets is visible immediately: different stroke, cap, corner radius and grid. If one set lacks a glyph, draw it on that set's grid with its stroke, or switch sets entirely. The only accepted mix is a UI set plus a brand-logo set (Simple Icons), and the logos are rendered as marks.
6. **Colour.** Icons take the text ink or a muted tint, never the accent by default (`design-theory.md` B3). Use `currentColor` for dark mode.
7. **Avoid the default when the brand has a voice.** Lucide is not wrong; it is the shadcn/ui default, so it signals "template".
8. **Brand voice to icon set, as a starting point:**

| Brand voice | Icon set |
| --- | --- |
| Engineered, enterprise | Carbon, Material Sharp, Tabler |
| Warm consumer | Phosphor Regular or Duotone, Mingcute, Hugeicons |
| Editorial, luxury | Phosphor Light or Thin, Iconoir |
| Microsoft-ecosystem B2B | Fluent |
| Dense app UI | Tabler (breadth) or Material Symbols (axes) |
| Developer tools | Lucide or Tabler is fine; Octicons for a GitHub-adjacent feel |

### 3.3 Iconify as an aggregator: filter by licence first

Iconify (`@iconify/json` 2.2.534, 2026-09-26; `@iconify/react`, `@iconify/tailwind4`, `unplugin-icons`, `astro-icon`) exposes 238 sets under **their own** licences. A one-line import can pull a CC BY or CC BY-SA set. The allowlist check:

```python
import json, urllib.request
d = json.load(urllib.request.urlopen(
    "https://raw.githubusercontent.com/iconify/icon-sets/master/collections.json"))
OK = {"MIT", "ISC", "Apache-2.0", "CC0-1.0", "OFL-1.1", "Unlicense"}
for key, v in d.items():
    spdx = v["license"].get("spdx")
    print(f"{key:24} {spdx:14} {'ok' if spdx in OK else 'NEEDS CREDIT / CHECK'}")
# Metadata can lag upstream: ri (Remix) still shows Apache-2.0 here.
```

### 3.4 Brand logos: usage rules

- Use a mark only to **refer** to that company or product (a login button, a "works with" row, a social link), in its official colours or mono, unmodified. Link to the brand's guidelines when they exist (Simple Icons and svgl carry `guidelines` / `brandUrl` fields).
- Never recolour into the site palette unless the brand allows mono versions; many do. Never redraw, crop, rotate or animate a third-party mark, and never place it so it implies endorsement.
- Sign-in buttons (Google, Apple, Microsoft, GitHub) have their own button specs. Use the provider's assets, not an icon library.
- Customer or partner logos need permission and must be real (already in `anti-patterns.md`).

### 3.5 Emoji sets

- **Fluent Emoji** (MIT; 2D, 3D and flat) and **Noto Emoji** (Apache-2.0) are class A.
- **Twemoji** graphics are CC BY 4.0; `@twemoji/api` declares "MIT AND CC-BY-4.0" (F).
- **OpenMoji** is CC BY-SA 4.0, so share-alike applies.

---

## 4. Illustration

### 4.1 Resource table

| Resource | What | Licence and restrictions | Credit? | Evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| **unDraw** | Flat scenes, recolour to one accent | Custom licence: free commercial and personal use, no attribution. **No** replicating the service, no redistribution "in packs or otherwise", **no integrations**, **no AI training or fine-tuning.** Not an open-source licence despite the tagline. unDraw X and Handcrafts have their own licence pages | No | S | Allowed but the most recognisable "startup template" look. Use only if heavily art-directed |
| **Open Peeps** / **Humaaans** / **Open Doodles** (Pablo Stanley) | Hand-drawn modular people; mix-and-match people; sketchy doodles | CC0 | No | S (Open Peeps also F via `@dicebear/open-peeps`: CC0) | Class A, but instantly recognisable; use as raw material only |
| **DrawKit** (free packs) | 2D sets | Free commercial use, no attribution; **may not redistribute the files to third parties** | No | S | OK for a site; do not commit to a public template repo |
| **IRA Design** (Creative Tim) | Gradient and outline characters | MIT | No | F | Class A; dated 2019–21 gradient look |
| **ManyPixels gallery** | Flat illustrations, recolourable | Custom, broad: commercial use, no credit | No | S | OK |
| **Storyset** (Freepik) | Animated / Lottie scenes | **Free = mandatory visible credit** ("Illustration by Storyset" link); premium removes it; daily caps; no resale or trademark use | Yes | S | Class B; the Freepik house style is recognisable |
| **Blush** | Configurable collections | Licence is broad and needs no credit, but the **free plan exports a PNG of about 250×400 only; SVG and large PNG are Pro**; no merchandise | No | S | Free tier is useless for production |
| **Absurd Design** | Surreal hand-drawn | Free tier: **attribution mandatory in each End Product**; paid licence otherwise | Yes | S | Class B; distinctive |
| **3dicons** | 3D icon renders | CC0 | No | S | Class A |
| **Fluent Emoji 3D** | 3D emoji | MIT | No | F (Iconify) | Class A |

### 4.2 Why generic illustration reads as template, and what to do instead

Free libraries are tuned for maximum reuse. The result is the same proportions, the same "diverse flat people with laptops", one-accent recolours and the same compositions across thousands of sites. The eye recognises the *system* before the message, so the page reads "SaaS template". This extends the skill's existing rule: "never a mismatched free illustration set".

A decision order that works:

1. **No illustration.** Photography of the customer's world, the product UI, or type (`imagery.md`).
2. **Draw the illustration yourself in SVG** from the brand's own geometry: the logo motif, the product's objects, diagrams of the real mechanism. This is what `anti-patterns.md` ("a designed graphics layer in one consistent line style") asks for. It is cheap for an agent and unique. The QA rules in `anti-patterns.md` (debris, containment, labels) apply.
3. **Commission** when the concept is "Playful / illustrated" and illustration *is* the identity (`art-direction.md`). A library cannot carry an identity.
4. **Library as raw material**, only if restyled: consistent stroke, the brand palette, the brand's corner radius, cropped compositions. Take one library and one style. Never use a library scene as-is in a hero.

---

## 5. Photography, archives and media

### 5.1 Sources

| Source | Licence summary | Main restrictions | Credit | Evidence |
| --- | --- | --- | --- | --- |
| **Unsplash** (standard) | Unsplash License: free commercial and non-commercial use, modification allowed | Cannot "compile images from Unsplash to replicate a similar or competing service" | Not required | S |
| **Unsplash+** | Paid subscription licence | Files on `plus.unsplash.com` (`premium_photo-…`) are **not** free (already in `imagery.md`) | — | S |
| **Unsplash API** | API Guidelines | Apps using the API **must hotlink** `photo.urls`, trigger `download_location`, and credit the photographer and Unsplash with UTM links. A static redesign that downloads under the Unsplash License is not "using the API" at runtime; don't confuse the two | Yes, for API apps | S |
| **Pexels** | Pexels License | No selling unaltered copies (prints, posters, products); identifiable people not shown in a bad light; no implied endorsement; no redistribution on stock or wallpaper platforms; **no use as a trademark or business name** | Not required | S |
| **Pixabay** | Content License (renamed 2023-04-17; pre-2019 content back to CC0) | No sale as digital content or wallpaper; no unaltered physical products; identifiable persons not offensive; no endorsement. **Content showing trademarks or logos may not be used commercially for goods and services.** Pixabay **accepts AI-generated uploads**, so filter them out | Not required | S |
| **Kaboompics** | Standard License | Free commercial use; **"Editorial Use Only" images are excluded from ads, packaging and brand marketing**; no merch with the photo as main design; no redistribution | Not required | S |
| **Burst** (Shopify) | Free, still live | Small catalogue, e-commerce oriented | — | S |
| **Openverse** | Search engine over CC and public-domain works | **Openverse does not verify licences.** Check each work at its source | Per work | S |
| **Wikimedia Commons** | Per-file licence (CC BY, CC BY-SA, GFDL, PD) | BY-SA requires share-alike on derivatives. Commons itself warns of other rights (trademarks, personality rights) | Per file | S |
| **NASA** | Generally not copyrighted in the US | **Insignia, "worm" logotype and seal need permission**; no implied endorsement; recognisable people need their own permission; some NASA-hosted images are third-party | Recommended | S |
| **ESA/Hubble, ESA/Webb** | **CC BY 4.0** | **Visible credit wording is mandatory** (e.g. "ESA/Webb, NASA & CSA, …"); no implied endorsement | **Yes** | S |
| **Library of Congress** "Free to Use and Reuse" | Rights-cleared sets (PD, no known copyright, or cleared) | Check each item's "Rights Advisory" | Courtesy | S |
| **The Met Open Access** | CC0 for public-domain works marked Open Access | Only items with the OA icon | No | S |
| **Smithsonian Open Access** | CC0 (≈4.5 M assets) | Only items marked CC0 | No | S |
| **Rijksmuseum** | CC0 for public-domain collection images; high-res download (account) and API | — | No | S |

### 5.2 Caveats an agent must apply

- **Model and property releases.** Free licences grant copyright permission only. They do not clear the people, private property, artworks or brands in the frame. Avoid recognisable faces in anything that looks like a testimonial, a team page or an endorsement. Avoid visible third-party logos in commercial hero imagery (Pixabay says so explicitly).
- **Archive imagery is the best antidote to stock sameness.** Museum CC0 collections (the Met, Smithsonian, Rijksmuseum, LoC) give engravings, maps, botanical plates, industrial photography and posters. Given the skill's duotone and bake-the-treatment pipeline, these read as art direction rather than stock. Prefer them for editorial and heritage brands.
- **AI-generated imagery.**
  - *Honesty:* never generate customers, team members, testimonials, "our office" or product results (the skill's "honest" principle).
  - *Copyright:* the US Copyright Office's Part 2 report (2025-01-29) says prompts alone do not create copyright in the output, so the client cannot own purely generated images (S).
  - *Disclosure:* the **EU AI Act Art. 50** transparency duties apply **from 2 August 2026**. Deployers must disclose deepfakes, meaning realistic AI images of existing people, objects, places or events that would falsely appear authentic, "at the latest" at first exposure (S).
  - *Acceptable uses:* abstract textures and backgrounds the brand owns the idea of, clearly labelled.
  - *Source licences:* unDraw bans using its assets for AI training (S); keep that in mind before feeding any library into a model.

---

## 6. Patterns, backgrounds and gradients

| Resource | Licence | Evidence | Notes |
| --- | --- | --- | --- |
| **Hero Patterns** (Steve Schoger) | **CC BY 4.0** for the patterns | S | **Trap:** the npm wrapper `hero-patterns` (Alec Lomas) is MIT (F), which covers the *wrapper code*, not the artwork. Credit required |
| **pattern.monster** | MIT (patterns) | S | Class A |
| **Haikei** | Free tier generates SVGs; commercial terms unclear in search results | S | Verify on the site before shipping, or generate your own |
| **fffuel** (nnnoise, sssurf, gggrain…) | Generated assets free for personal and commercial use, no credit | S | Class A for outputs |
| **CSS-native** | — | — | Layered `radial-gradient`/`conic-gradient`, `color-mix()` in OKLCH, SVG `feTurbulence` for grain. Nothing to license and fully tunable to tokens |

**When patterns and gradients become AI slop** (extending `anti-patterns.md` "Colour and surface"):

- a mesh or blob gradient used *instead of* a composition;
- grain added to everything;
- the purple-to-blue ramp regardless of brand;
- a generic geometric pattern (dots, topography, circuit board, hexagons) that has no connection to the company.

The test: can you say where the pattern comes from in the brand? Examples of good answers: the logo's geometry repeated, the product's material (paper fibre, cable runs, a map grid), a data texture from the real product. If you can't, delete it. One patterned surface per page, at low contrast (Lc ≤ 15 against its ground), never behind body copy.

---

## 7. Placeholders, avatars and flags

### 7.1 Avatars: DiceBear licences per style (F, all 31 packages packed; `@dicebear/collection` 9.4.2, core 10.7.0)

| Licence of the artwork | Styles |
| --- | --- |
| **CC0 1.0** (class A) | glass, rings, shapes, thumbs, identicon, pixel-art (+neutral), lorelei (+neutral), notionists (+neutral), open-peeps; `initials` and `icons` are code only (MIT; icons use Bootstrap Icons MIT) |
| **CC BY 4.0** (credit needed) | adventurer (+neutral), big-ears (+neutral), big-smile, croodles (+neutral), dylan, fun-emoji, micah, miniavs, personas, toon-head |
| **Custom "Free for personal and commercial use"** (Pablo Stanley) | avataaars (+neutral), bottts (+neutral). Usable, but not an open licence |

- **Boring Avatars:** MIT (F), abstract and deterministic from a string, 2.0.4 (2025-09-28). Class A.
- **UI Faces: rejected.** It historically aggregated real people's photos from other sites with mixed licences, and now serves AI faces (S). Showing strangers' or synthetic faces as "users" is both a rights problem and dishonest.
- **Avatars on a marketing site** are nearly always a sign of fabricated social proof. Use them only in product UI mock-ups with obviously illustrative data (initials or abstract Boring or DiceBear CC0 styles), never as testimonial faces.

### 7.2 Placeholder image services: never ship them

- **via.placeholder.com / placeholder.com are dead.** placeholder.com was sold and no longer serves images; `via.` fails inconsistently. Libraries (faker-js, CopilotKit) had to replace it (S).
- `placehold.co` and `picsum.photos` (Lorem Picsum) work today but are third-party runtime dependencies. They log visitor IPs, can vanish, and look unfinished.
- Rule (matches `imagery.md`): placeholders are allowed only in local drafts. A build that references a placeholder host fails QA. Add a grep for `placehold|picsum|placeholder\.com|via\.placeholder|dummyimage|loremflickr|source\.unsplash\.com` to technical QA.

### 7.3 Flags

| Resource | Licence | Notes |
| --- | --- | --- |
| `flag-icons` (lipis) | MIT (F) | 4×3 and 1×1 SVGs with CSS classes; 7.5.0 (2025-05-29) |
| `circle-flags` (HatScripts) | MIT (F) | Round flags; 2.8.3 (2026-04-19) |
| `country-flag-icons` | MIT (F) | 3×2 SVG; 1.6.20 (2026-07-01) |
| Flagpack | MIT (Iconify F) | Designed set |
| `country-flag-emoji-json` | **CC BY 4.0** (F) | Credit needed even for *data* |
| `country-flag-emoji-polyfill` | MIT (F) | Needed because **Windows' Segoe UI Emoji has no flag glyphs**: flag emoji render as two letters ("US") on Windows (S). It loads a flag-only Twemoji subset (artwork CC BY 4.0) via `unicode-range` |

Flags are not languages. Use language names in their own script ("العربية", "English") for language switchers; flags only for countries (shipping, pricing regions).

---

## 8. Typography

### 8.1 Sources and their licence terms

| Source | Licence and terms | Self-host? | Evidence | Notes |
| --- | --- | --- | --- | --- |
| **Google Fonts** | Per family: OFL-1.1 (most), Apache-2.0 (e.g. Roboto Slab), Ubuntu Font Licence (Ubuntu Sans) | Yes | F (METADATA.pb) | Hosted API **strips optional OT features** (§8.2). EU: LG München I, 2022-01-20, 3 O 17493/20 awarded €100 because the Google-hosted fonts transmitted visitor IPs (S). **Self-host for EU clients** |
| **Fontsource** | Code MIT (F); fonts keep their own licence (e.g. `@fontsource/inter` OFL-1.1) | npm self-host | F | Files are built from the Google Fonts API, so **features are stripped as well** (T). Variable packages `@fontsource-variable/*`: the `wght` file carries only wght; opsz needs the `opsz` or `full` file (T) |
| **Fontshare** (ITF) | Two licences. **ITF Free Font License (FFL, "Closed Source")**: free personal and commercial use; self-hosting on your own servers allowed; **§02 forbids making the fonts available to anyone by any means, naming repositories and publicly accessible servers**; no resale or derivative redistribution; §08 termination. Some Fontshare families are **OFL** instead | FFL: yes, for your own site, **not in a public repo** | S + G | Check each family's licence tab. For open repos, keep FFL fonts out of git (load from the Fontshare CSS API or a private asset bucket) or choose OFL |
| **Velvetyne** | Libre fonts under SIL OFL (some Creative Commons historically) | Yes | S | Experimental, expressive display faces; check each family's LICENSE |
| **Collletttivo** | SIL OFL | Yes | S | Italian collective, contemporary display and text |
| **The League of Moveable Type** | SIL OFL | Yes | S | League Gothic and League Spartan are also on Google Fonts (F) |
| **Uncut.wtf** | Catalogue; **licence varies per typeface** | Per font | S | Curated contemporary faces; read each page |
| **Open Foundry** | Curated catalogue of open-source fonts; licence per font | Per font | S | Discovery tool |
| **Adobe Fonts** | Subscription service; **no self-hosting**; if the subscription lapses, **web fonts stop serving** and the site falls back | No | S | Not open. Use only for clients who own a Creative Cloud plan and accept the dependency |

### 8.2 Google Fonts and Fontsource strip OpenType features (tested 2026-09-28)

I downloaded the `latin` WOFF2 the CSS2 API serves to a Chrome UA, and Fontsource's files, and compared their GSUB feature lists with the upstream binaries in google/fonts.

| Family | Upstream GSUB (relevant) | Served by Google Fonts / Fontsource |
| --- | --- | --- |
| Inter | tnum pnum **zero case** frac sups **ss×8 cv×14** | tnum pnum frac (+calt, locl) |
| IBM Plex Sans | **lnum onum zero** frac sups **salt ss×6** | frac only (**no onum, zero or ss**) |
| Source Serif 4 / Literata / Spectral | tnum pnum lnum **onum zero case smcp c2sc** … | tnum pnum frac |
| Work Sans | tnum pnum lnum **onum zero case smcp ss×6** … | tnum pnum frac calt cswh |
| Alegreya | tnum pnum lnum **onum smcp c2sc ss×5** | tnum pnum lnum frac |
| Fraunces (full variable file) | case liga | liga only |
| IBM Plex Sans Arabic (arabic slice) | init medi fina rlig + zero, ss×6 | init medi fina rlig calt (shaping kept; extras dropped) |

Consequences for the skill:

- `font-variant-numeric: tabular-nums` works with GF and Fontsource **only if the font has `tnum` at all** (§8.3).
- `slashed-zero`, `oldstyle-nums`, `font-variant-caps: small-caps`, `font-feature-settings: "ss01"`/`"cv11"` **do nothing** with API-served files. Browsers then synthesise fake small caps from scaled capitals, which look thin.
- To get them, self-host from the upstream variable TTF (the google/fonts repo or the designer's release) and subset keeping every layout feature:

```bash
pip install fonttools brotli
pyftsubset "Inter[opsz,wght].ttf" --flavor=woff2 --layout-features='*' \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --output-file=inter-latin.woff2
```

(The unicode range is Google Fonts' own `latin` slice. Note the RFN caveat in §1 for Plex, Source and similar families.)

A feature check any agent can run on a font file before choosing it:

```python
from fontTools.ttLib import TTFont; import sys
t = TTFont(sys.argv[1])
f = {r.FeatureTag for r in t["GSUB"].table.FeatureList.FeatureRecord} if "GSUB" in t else set()
cm = t.getBestCmap(); widths = {t["hmtx"][cm[c]][0] for c in range(0x30, 0x3A)}
print({k: k in f for k in ["tnum", "pnum", "lnum", "onum", "zero", "case", "smcp", "frac"]},
      "digits tabular by default" if len(widths) == 1 else "digits proportional by default",
      "axes:", [a.axisTag for a in t["fvar"].axes] if "fvar" in t else None)
```

### 8.3 Numerals: which families can set a table (T, upstream binaries)

- **Tabular by default** (all digits the same width without CSS; some have no `pnum`, so running-text numbers stay monospaced):
  - Latin: IBM Plex Sans/Serif/Condensed, Hanken Grotesk, Host Grotesk, Rethink Sans, SUSE, Source Sans 3, Source Serif 4, Noto Sans/Serif, Newsreader, Chivo, Mulish, Nunito / Nunito Sans, Roboto Flex, Roboto Serif, Recursive, Funnel Sans/Display, Familjen Grotesk, EB Garamond, Spectral, Antonio, Bebas Neue.
  - Arabic: Cairo, Vazirmatn, Noto Sans / Kufi / Naskh Arabic, Beiruti, Kufam, Mada, Amiri.
- **Has `tnum` (proportional by default, tabular on request):** Inter, Inter Tight, Geist, Public Sans, Reddit Sans (+zero, 18 cv), Red Hat Display/Text (+zero), Schibsted Grotesk (+zero), Archivo (+zero, onum), Overpass (+zero), Work Sans, Fira Sans, Barlow and Barlow Condensed, Sofia Sans (all widths), Mona / Hubot Sans, Instrument Sans, Onest, Figtree, Manrope, Plus Jakarta Sans, Space Grotesk, Montserrat, Karla, Epilogue, Anybody, Saira, Encode Sans, Atkinson Hyperlegible Next, Golos Text, Geologica, Radio Canada Big, Unbounded, Syne, Alexandria, Rubik, Zain, Baloo 2, Literata, Petrona, Piazzolla, Merriweather, Playfair (2023), Bodoni Moda, Brygada 1918, Crimson Pro, Gelasio, Gloock, Young Serif, Zilla Slab, Bitter, Lora, Libre Caslon Text, Besley.
- **No tabular figures at all, so never use for data:**
  - Latin: DM Sans, Poppins, Fraunces, Instrument Serif, DM Serif Display, Albert Sans, Be Vietnam Pro, Libre Franklin, Urbanist, League Spartan, Gantari, Wix Madefor Text/Display, Inclusive Sans, Parkinsans, Hedvig Letters Sans/Serif, Oswald, Big Shoulders, Aleo, Playfair Display, Libre Baskerville, Cormorant (has tnum but a tiny x-height), Italiana, Tenor Sans, Forum, Marcellus.
  - Arabic: Tajawal, Almarai, El Messiri, Changa, Markazi Text, Reem Kufi, Lemonada.
- **Slashed zero (`zero`) upstream:** Inter, IBM Plex, Red Hat, Reddit Sans, Schibsted, Archivo, Overpass, Chivo, Familjen, Epilogue, Anybody, Saira, Lexend and Readex Pro, Rubik, Space Grotesk, Work Sans, Fira Sans, Source Sans 3, Noto Sans, Literata, Petrona, Gelasio, Young Serif, Kufam. **Stripped by Google Fonts and Fontsource** (§8.2).

### 8.4 Shortlist by voice, with alternatives to the over-used defaults

**Principle.** The defaults are Inter, Geist, Instrument Serif, Space Grotesk, DM Sans, Poppins and Montserrat, plus Roboto and Open Sans. The 2025 Web Almanac puts Roboto on roughly one page in ten and Poppins, Open Sans, Montserrat and Lato in the next tier, with Inter rising fast (S). These faces are fine; they are just **no longer a decision**, so they signal "template".

The skill's rule stays: derive the display face from the wordmark's construction (`design-theory.md` C3), keep a face that is a documented brand asset (`art-direction.md`), and justify any default in `DESIGN.md`.

All families below are on Google Fonts under OFL unless marked. Axes and features were checked (T). "RFN" marks a Reserved Font Name.

**Precise / engineered / technical** (infrastructure, fintech, B2B SaaS that is not a developer tool)

| Family | Why | Axes / facts |
| --- | --- | --- |
| **IBM Plex Sans** (RFN "Plex") | Engineered grotesque with a real superfamily (Serif, Mono, Condensed, Arabic, JP, KR) | wght 100–700, wdth 75–100; tabular default. Reads IBM; pair with Carbon icons only if you want that |
| **Schibsted Grotesk** | News-grotesk crispness, less ubiquitous than Inter | wght 400–900; tnum, zero |
| **Archivo** | Grotesque with a width axis for display-to-UI range | wdth 62–125, wght 100–900; tnum, zero, onum |
| **Hanken Grotesk / Host Grotesk** | Clean neo-grotesks, tabular by default | wght 100–900 / 300–800 |
| **Geologica** | Technical with CRSV and SHRP (sharpness) axes; one family can go from soft to cut | wght, slnt, CRSV, SHRP; tnum |
| **Red Hat Text + Display** | Open, engineered, with tnum and zero | wght 300–700 / 300–900 |

*Instead of* Inter or Geist, try Schibsted, Hanken, Host, Archivo or Red Hat. *Instead of* Space Grotesk, try Familjen Grotesk (tnum, zero, tabular default) or Chivo (tabular default, zero).

**Warm / humanist** (services, health, education, people-first products)

| Family | Why |
| --- | --- |
| **Source Sans 3** (RFN "Source") | The dependable humanist; tabular default; ss×10, cv×19 upstream |
| **Fira Sans** | Humanist with a full numeric toolset (tnum, onum, zero, smcp) |
| **Alegreya Sans** (+ Alegreya serif) | Calligraphic humanist with a true serif partner; smcp and onum upstream |
| **Commissioner** | Warmth through flared terminals (FLAR and VOLM axes) |
| **Atkinson Hyperlegible Next** (2025) | Legibility-first (Braille Institute); ideal for public-facing health and civic work; tnum |
| **Reddit Sans** | Friendly, open, rich variants (cv×18, tnum, zero) |
| **Rethink Sans / Radio Canada Big** | Contemporary, friendly, not yet ubiquitous |

*Instead of* DM Sans (which has no tnum), try Rethink Sans, Radio Canada Big or Figtree (Figtree has tnum but is getting common).

**Editorial serif, text** (long reading, journalism, reports)

| Family | Axes / facts |
| --- | --- |
| **Literata** | opsz 7–72, wght 200–900; tnum, onum, smcp (upstream) |
| **Source Serif 4** | opsz 8–60; tabular default |
| **Newsreader** | opsz 6–72; tabular default |
| **Spectral** | Screen-first; tabular default, smcp |
| **Petrona** | wght 100–900; every numeric feature |
| **Piazzolla** | opsz 8–30; compact |
| **Merriweather** | Now variable: opsz 18–144, wdth 87–112 |
| **Gelasio** | Metric-compatible with Georgia, so the fallback causes no shift |
| **STIX Two Text** | Scientific and academic |
| Brygada 1918, Besley, Crimson Pro, Libre Caslon Text | Historic and bookish voices |

**Editorial serif, display** (replacing Instrument Serif and DM Serif Display, neither of which has tnum)

| Family | Axes / facts |
| --- | --- |
| **Fraunces** | opsz 9–144, SOFT 0–100, WONK; huge range from soft old-style to crisp. No tnum, so headings only |
| **Gloock** | High-contrast display; tnum, zero |
| **Young Serif** | Heavy old-style; zero |
| **Bodoni Moda** (+SC) | opsz 6–96 |
| **Playfair** (the 2023 family, not Playfair Display) | opsz **5–1200**, wdth 87.5–112.5 |
| **Libre Caslon Display, Imbue** (opsz 10–100, condensed Didone), **Ibarra Real Nova, Linden Hill, Hedvig Letters Serif** (opsz 12–24) | Additional display voices |

**Institutional / civic / public sector**

**Public Sans** (US Web Design System; tnum, onum), **Atkinson Hyperlegible Next**, **Noto Sans** (global scripts; wdth 62.5–100; tabular default), **Source Sans 3**, **IBM Plex Sans**, **Overpass** (Highway Gothic heritage; tnum, zero). Avoid Libre Franklin for data (no tnum).

**Playful / friendly**

**Shantell Sans** (BNCE bounce, INFM informality, SPAC axes; tnum, zero), **Fredoka** (wdth + wght, rounded), **Recursive** (CASL casual axis plus a MONO axis: one family for UI and code), **Nunito** (rounded, tabular default), **Rubik** (rounded corners; Arabic and Hebrew included), **Grandstander** (children), **Gluten**, **Baloo 2** / **Baloo Bhaijaan 2**, **Unbounded** (wide display), **Bricolage Grotesque** (opsz 12–96, wdth 75–100; common in indie-startup sites since 2024, so treat it as semi-default).

*Instead of* Poppins or Outfit, try Sora (tnum), Parkinsans (character, but no tnum), Afacad Flux (wght to 1000, slnt; tnum, zero) or Epilogue (tnum, zero, smcp).

**Luxury / high-contrast**

Bodoni Moda (opsz), Playfair 2023 (opsz to 1200), Gloock, Italiana (thin display), Marcellus (flared caps), Gilda Display, Prata, Bellefair, Tenor Sans, Forum.

Avoid **Cormorant** as a default: it has the smallest x-height of the set (0.386 em) and is the luxury-template cliché. Avoid Cinzel for the same reason. Luxury is carried more by scale, spacing and restraint than by the face.

Fontshare FFL options (Zodiak, Erode, Boska, Gambetta, Sentient) are handsome but carry the public-repo restriction (§8.1).

**Data-heavy UI** (tabular and slashed zero; see §8.3)

- **IBM Plex Sans** (tabular default), **Roboto Flex** (tabular default; 13 axes including opsz 8–144 and wdth 25–151), **Public Sans**, **Reddit Sans**, **Red Hat Text**, **Source Sans 3**, **Noto Sans**, **Barlow** (DIN-like; pair with Barlow Condensed for dense tables), **Archivo**, **Chivo**, **Recursive** (switch MONO for code cells).
- For a sales, services or manufacturing brand, set figures in the sans with `tabular-nums`, not in a mono (`lessons.md` 2026-09-07).

**Condensed display** (signage, sport, industrial, workwear only, per `design-theory.md` C3)

**Big Shoulders** (2025 unified family: opsz 10–72, wght 100–900; Chicago civic), **Barlow Condensed** (tnum), **Sofia Sans Condensed / Extra Condensed** (wght 1–1000, tnum), **Saira** (wdth 50–125), **Anybody** (wdth 50–150), **Archivo** at wdth 62, **League Gothic** (wdth 75–100), **Antonio** (tabular default), **IBM Plex Sans Condensed**, **Roboto Condensed**.

*Instead of* Oswald, Bebas Neue or Anton (all over-used; Oswald and Big Shoulders lack tnum), use one of the above.

**Monospace** (developer and infrastructure products only; the skill's existing rule)

JetBrains Mono, IBM Plex Mono, Martian Mono (wdth 75–112.5), Azeret Mono (ss×16), Spline Sans Mono, Red Hat Mono, Atkinson Hyperlegible Mono, Geist Mono, Intel One Mono (RFN "Intel").

**Pairing rules (extending `design-theory.md` C3), using the verified proportions**

- Concord in x-height matters most when faces share a line. Measured x-height/UPM:
  - Inter 0.546; Plex 0.516; Source Sans 3 0.478; Public Sans 0.517.
  - Literata 0.507; Source Serif 4 0.475; Newsreader 0.426; Fraunces 0.482; Cormorant 0.386.
- Newsreader (0.426) under Inter (0.546) looks small at the same size. Use `font-size-adjust: ex-height 0.52` (Baseline since July 2024, S) or size the serif up.
- Superfamily pairings are the safe default: Plex Sans + Plex Serif; Source Sans 3 + Source Serif 4; Alegreya Sans + Alegreya; Red Hat Display + Text; Noto Sans + Noto Serif; Hedvig Letters Sans + Serif.

### 8.5 Variable fonts and optical sizing

- Families with **opsz** (T): Inter (14–32), DM Sans (9–40), Fraunces (9–144), Newsreader (6–72), Literata (7–72), Source Serif 4 (8–60), Bodoni Moda (6–96), Playfair 2023 (5–1200), Roboto Flex and Roboto Serif (8–144), Merriweather (18–144), Bricolage Grotesque (12–96), Big Shoulders (10–72), Imbue (10–100), Piazzolla (8–30), Nunito Sans (6–12), Hedvig Letters Serif (12–24).
- `font-optical-sizing: auto` is the default and follows `font-size`. The axis must actually be loaded:
  - On Google Fonts, request the axis range: `family=Fraunces:opsz,wght@9..144,100..900`.
  - Fontsource's `wght` file lacks opsz (T); import the opsz or full variant.
- Custom axes (Fraunces SOFT/WONK, Geologica SHRP, Commissioner FLAR, Shantell BNCE) are brand levers. Pick one setting per role and tokenise it (`font-variation-settings`); never animate them for decoration.
- Load a variable file when using three or more weights (the skill already says this); otherwise use statics.

### 8.6 Loading performance

- **Only the WOFF2 slices you use; `font-display: swap`** for brand faces and `optional` for non-critical ones. **Preload only the one critical file** (`<link rel=preload as=font type=font/woff2 crossorigin>`); preloading many files delays LCP.
- **Self-host by default** (privacy per the Munich ruling, full feature control, one fewer origin). Google Fonts' own CJK delivery shows why slicing matters: Noto Sans JP is served as **124** `unicode-range` files and Noto Sans SC as **101** (T). Never self-host a monolithic CJK file.
- **Subsetting:** `pyftsubset` (above), `glyphhanger` 6.0 (2026-06-05, crawls pages for used glyphs) or `subfont` 7.3 (2026-09-20). Keep `--layout-features='*'` for complex scripts: Arabic and Devanagari need their shaping features.
- **Matching fallback metrics, so late fonts cause no layout shift:**
  - `fontaine` 1.0.0 (2026-09-21): generates `@font-face` fallbacks with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`.
  - Capsize: `@capsizecss/metrics` 4.3.0 and `createFontStack`.
  - `next/font`: automatic `adjustFontFallback`.
  - **Astro 6 Fonts API**, now stable, with Google, Fontsource, Fontshare, Bunny, Adobe and local providers; it generates optimized fallbacks and preload hints (S).
  - `@nuxt/fonts` 0.14.
  - Caveat: **Safari supports `size-adjust` but through 26.x still ignores `ascent-override`, `descent-override` and `line-gap-override`** (S; test in WebKit).
- `font-size-adjust` is Baseline (July 2024). **`text-box: trim-both cap alphabetic`** (formerly leading-trim) became Baseline in **August 2026**: Chrome 138, Safari 26.2, Firefox 154 (S). It removes the need for Capsize-style negative margins when aligning type to boxes.
- The file-size spread among Arabic fonts is large (upstream TTF, before WOFF2 and subsetting; T): Noto Sans Arabic variable 845 KB; Cairo 600 KB; Alexandria 332 KB; Readex Pro 279 KB; Vazirmatn 241 KB; IBM Plex Sans Arabic 236 KB (one static weight).

### 8.7 UI typography vs marketing typography

- **UI** (product screens, dashboards): one sans; 14–16 px; weights 400/500/600; `tabular-nums` in tables; tight but not negative tracking. Optical size near text; opsz faces do this automatically.
- **Marketing** (the pages this skill redesigns): a display face chosen from the wordmark, large sizes with opsz or a display cut, negative tracking only on Latin display sizes (and never on Arabic), one emphasis device. Figures in running copy are proportional and old-style if the face has `onum` and you self-host.

### 8.8 Multilingual typography

#### Arabic + Latin: verified families

Legend: weights and axes from METADATA (T). Numerals: tnum present, TABdef = tabular by default, "fa" = Persian digits U+06F0–06F9 present, "ar" = Eastern Arabic digits U+0660–0669 present (T).

| Family | Style and voice | Weights / axes | Latin companion | Numerals | Use for |
| --- | --- | --- | --- | --- | --- |
| **IBM Plex Sans Arabic** (RFN Plex) | Contemporary sans with Naskh structure; engineered, corporate | 100–700 statics | IBM Plex Sans (designed together) | TABdef, ar, fa, zero (upstream) | Fintech, government-tech, bilingual product UI |
| **Noto Sans Arabic** | Neutral unmodulated sans; widest coverage | **wdth 62.5–100, wght 100–900** variable | Noto Sans | tnum, TABdef, ar, fa | Neutral multilingual systems; big file, so subset |
| **Noto Kufi Arabic** | Simplified Kufi, larger sizes | wght 100–900 | Noto Sans | tnum, ar, fa | Headlines with Noto Sans Arabic text |
| **Noto Naskh Arabic** | Modulated Naskh (the "serif") | wght 400–700 | Noto Serif | tnum, ar, fa | Long reading, with serif Latin |
| **Readex Pro** (RFN "RevReading Lexend") | Arabic extension of Lexend; readability-oriented, geometric | wght 160–700 + HEXP | Lexend | zero; ar; **no fa** | Education, accessibility-led brands |
| **Alexandria** | Arabic companion of **Montserrat** (Mohamed Gaber) | wght 100–900 | Montserrat-style Latin built in | tnum, onum, smcp; ar, fa | Geometric brand voice; the reason to use Montserrat at all |
| **Cairo** | Kufi-based, compact (short ascenders and descenders); very common | wght 200–1000, slnt | **Titillium Web** (Latin is its extension) | TABdef, ar, fa; no tnum/pnum toggle | Compact UI and headlines; ubiquitous, so a default in the region |
| **Tajawal** | Low-contrast geometric (Boutros), 7 weights; very common in the Gulf | 200–900 statics | Built-in sans Latin | **no tnum; no fa** | Consumer sites; avoid for data |
| **Almarai** | Clear geometric (Boutros), 4 weights; common in Saudi sites | 300–800 statics | Built-in basic Latin | **no tnum** | Simple consumer sites; avoid for data |
| **Beiruti** (2024) | Modern geometric (Arlette Boutros), with a harmonised Latin by Volker Schnebel | wght 200–900 | Built in | TABdef, tnum, onum; ar, fa | A fresher alternative to Tajawal and Almarai |
| **Vazirmatn** | Persian/Arabic UI sans | wght 100–900 | Roboto-based Latin | TABdef, tnum; ar, fa | Persian-first sites, app UI |
| **Rubik** | Rounded corners, friendly; Arabic + Hebrew + Cyrillic | wght 300–900 + italic | Same family | tnum, zero; ar, fa | Playful multi-script brands |
| **Zain** (2024) | Boutros for Zain telecom; very large x-height (0.60) | 200–900 + italic (Latin) | Built in | tnum; ar, fa | Note the telecom-brand association |
| **Kufam** | Early-Kufi inspired, signage and wayfinding | wght 400–900 + italic | Built in (Amsterdam shop-lettering caps) | full features; ar, fa | Wayfinding, cultural institutions |
| **Mada** (RFN Source) | Modernist, Cairo road-sign inspired; low descenders | wght 200–900 | Source Sans (modified) | TABdef; ar, fa | UI at small sizes |
| **Markazi Text** | Moderate-contrast Naskh (Reading / Google) | wght 400–700 | Florian Runge Latin | no tnum; ar, fa | Editorial text |
| **Amiri** | Classical book Naskh (Bulaq press revival) | 400/700 + slanted | Built in | TABdef; ar, fa | Literary, cultural, religious texts; not UI |
| **Scheherazade New / Lateef / Harmattan** (SIL) | Traditional Naskh / Sindhi-Urdu / West-African | various | Built in | cv for localisation | Language-specific needs |
| **Reem Kufi** (+Fun, +Ink colour) | Fatimid-grid Kufic display; reads "historical / Islamic" by its own description | wght 400–700 | Josefin Sans-based | zero | Display only, when that meaning is intended |
| **El Messiri** | Curvy brush Naskh display | 400–700 | Philosopher-based | no tnum | Display, hospitality |
| **Changa** | Square Kufi, compact | 200–800 | Built in | no tnum | Short display text |
| **Baloo Bhaijaan 2** | Playful rounded display | 400–800 | Baloo 2 | tnum | Children, playful |
| Display extras | Lalezar, Rakkas, Marhey, Blaka, Handjet, Aref Ruqaa (Ruqʿah), Lemonada, Playpen Sans Arabic (handwriting, 2025) | — | — | — | One display moment, never body |

**Pairing rules for Arabic + Latin**

1. **Prefer a family designed as a bilingual system.** Plex Sans Arabic + Plex Sans, Noto Sans Arabic + Noto Sans, Readex Pro + Lexend, Alexandria + Montserrat, Cairo + Titillium Web, Vazirmatn + Roboto, Markazi Text, Beiruti, Rubik, Mada + Source Sans. Matching stroke logic matters more than matching "style names".
2. **Match optical size, not point size.** Arabic reads smaller at the same size. Set it about 10–15% larger and raise line-height to about 1.6–1.8 for body (S; typical UI guidance). Put both scripts on one line and adjust by eye.
3. **Map by script inside one family name** so each script gets its face and its own size correction:

```css
@font-face { font-family: "Brand"; src: url(/fonts/brand-latin.woff2) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122; }
@font-face { font-family: "Brand"; src: url(/fonts/plex-arabic.woff2) format("woff2");
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF;
  size-adjust: 112%; }  /* optical match to the Latin; Safari supports size-adjust */
body { font-family: "Brand", system-ui, sans-serif; }
```

   Order matters without `unicode-range`: most Arabic fonts include Latin (every Arabic family tested has A–Z), so listing the Arabic face first gives Latin text the Arabic font's Latin.

4. **Never track Arabic.** Tested in Chrome 154: `letter-spacing: .1em` widened a Plex Arabic line from 322 to 333 px (+3%) versus +21% for Latin. The joins held, but the added space lands only after non-joining letters, so gaps are uneven. Older and other engines have broken joins outright (W3C Arabic layout gap analysis, S). The designs this skill makes often put negative tracking on display type, so reset it: `:lang(ar) { letter-spacing: 0 }`.
5. **No italic for Arabic.** Chrome synthesises a slanted oblique when `font-style: italic` hits an Arabic face without italics (T, screenshot). Use `:lang(ar) { font-synthesis: weight }` and express emphasis with weight or colour: `:lang(ar) em { font-style: normal; font-weight: 600 }`.
6. **Numerals are a client decision.** Western digits (0–9) are common across the Maghreb and in many Gulf and Levant digital products; Eastern Arabic (٠–٩) in parts of Egypt and the Gulf; Persian digits (۰–۹) for Farsi and Urdu.
   - Set the system explicitly with a locale extension rather than trusting ICU defaults: `Intl.NumberFormat('ar-EG-u-nu-latn')` or `'…-u-nu-arab'`.
   - Check the font has the glyphs (Readex Pro and Tajawal lack Persian digits).
   - Tabular alignment still needs `tnum`.
7. **RTL layout:**
   - Put `dir="rtl"` and `lang="ar"` on `<html>`.
   - Use CSS logical properties everywhere (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`, `border-start-start-radius`), and flex/grid follow direction.
   - Wrap user content and mixed runs with `dir="auto"` or `<bdi>`.
   - Keep phone numbers, code and URLs LTR inside `<bdi dir="ltr">`.
8. **Mirroring icons.**
   - Mirror directional icons: back/forward, chevrons, arrows for navigation, reply, undo/redo, text alignment, list indentation, progress along a line.
   - **Do not mirror** clocks and circular refresh arrows (clocks turn clockwise everywhere), media playback controls and their progress bar (they refer to tape direction), physical objects (keyboard, headphones), or logos (S: Material bidirectionality).
   - **Checkmarks: design systems disagree.** Wikimedia Codex mirrors them and Material's guidance is silent, so decide once per system and record it.
   - Implement with `:dir(rtl) .icon-dir { transform: scaleX(-1) }` or Phosphor's `mirrored` prop.
9. **Photography and layout.** Mirror the composition (image side, reading direction of a sequence), not the photographs themselves. Flipping photos breaks text, logos and handedness.

#### CJK (brief)

- Never self-host a monolithic CJK font; use sliced `unicode-range` files (Google serves 101–124 slices, T) or system stacks for body (Hiragino / Yu Gothic / Meiryo; PingFang / Microsoft YaHei; Apple SD Gothic Neo / Malgun Gothic) with a web face for headings only.
- Body line-height about 1.7–1.8; no italics; no letter-spacing on body. Chromium has `word-break: auto-phrase` for Japanese line breaking and `text-spacing-trim` / `text-autospace` for punctuation and CJK–Latin spacing; check support per target.
- Faces: Noto Sans/Serif JP, SC, TC and KR; IBM Plex Sans JP and KR; Zen Kaku Gothic New; M PLUS 1p; BIZ UDPGothic (UD / legibility). Pretendard (OFL, Korean) is not on Google Fonts.

#### Devanagari (brief)

- The headline (shirorekha) and stacked matras need taller line-height (≥ 1.6). Keep the full GSUB and GPOS when subsetting (conjuncts).
- Faces: Noto Sans Devanagari (wdth + wght), Mukta, Hind (ITF), Anek Devanagari (wdth 75–125), Tiro Devanagari Hindi (serif), Martel (serif, RFN "Merriweather"); display: Baloo 2, Yatra One, Khand.
- Poppins includes Devanagari (its ITF origin), which is one legitimate reason to use it.

---

## 9. Colour tools and palettes

### 9.1 Tools and libraries

| Tool / library | What for | Licence (evidence) | Status | Notes |
| --- | --- | --- | --- | --- |
| **Radix Colors** | 12-step role scales, light and dark, with alpha variants; the skill's B5 model | MIT (F) | 3.0.0 (2023-10-02); stable, finished | Use its step-role semantics even with custom hues |
| **Leonardo** (Adobe) | Contrast-targeted palette generation (you pick ratios, it finds colours) | Apache-2.0 (F) | 1.1.0 (2026-02-18) | Best for "tokens that must hit 4.5:1 on each surface" |
| **Huetone** | LCH/OKLCH palette editor with contrast and APCA views | MIT (F) | Web app | Hand-tune scales |
| **oklch.com** (Evil Martians `oklch-picker`) | OKLCH picker and converter with gamut display | MIT (F) | Web app | Checking P3 vs sRGB gamut |
| **Harmonizer** (Evil Martians) | OKLCH + APCA palette generator (web + Figma); consistent chroma and contrast per level | Licence not confirmed (repo page shows none) | 2025, active | Use as a tool; don't vendor its code without checking |
| **apcach** | Compose a colour for a target APCA Lc in OKLCH | MIT (F), but **depends on `apca-w3`** | 0.6.4 (2023) | See the APCA licence trap below |
| **apca-w3** | APCA reference implementation | **"Limited W3 License" (F):** licensed for WCAG / web-content use only; no altering constants; must stay current; other uses AGPL; the term "APCA" is restricted to compliant implementations | 0.1.9 (2022) | Fine for design-QA scripts on web content; do not embed in a shipped product for other purposes |
| **Tailwind v4 palette** | 22 hues × 11 steps in **OKLCH** (e.g. `--color-blue-500: oklch(62.3% 0.214 259.815)`, F) | MIT | 4.3.3 (2026-07-16) | Good reference for chroma shaping; recognisable as Tailwind if used unmodified |
| **Open Color** | 13 hues × 10 steps | MIT (F) | 1.9.1 (2021); unmaintained but complete | Sane neutral defaults |
| **Material Color Utilities** (HCT) | Tone-based roles, dynamic colour | Apache-2.0 (F) | 0.4.0 (2026-01-21) | The skill's B1 HCT tone rules come from here |
| **color.js** (Lea Verou, Chris Lilley) | Spec-grade conversions, gamut mapping, contrast algorithms | MIT (F) | 0.7.1 (2026-07-24) | Scripts that compute token contrast |
| **culori** | Fast conversions, interpolation, OKLCH | MIT (F) | 4.0.2 (2025-06-27) | Lightweight alternative |
| **chroma-js** | Scales, Lab/LCH, ColorBrewer built in | BSD-3 AND Apache-2.0 (F) | 3.2.0 (2025-11-28) | — |
| **ColorBrewer** | Sequential, diverging and qualitative map palettes (Cynthia Brewer) | Apache-2.0 (F, npm) | — | Data-viz, maps |
| **viridis / cividis** | Perceptually uniform sequential; cividis is optimised for CVD (Nuñez et al. 2018, PLoS ONE) | viridis CC0 in matplotlib, MIT in R | — | Sequential data |
| **Okabe-Ito** | 8-colour CVD-safe qualitative: `#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #000000` | Freely published | — | Categorical charts (S) |
| **Paul Tol schemes** | bright, vibrant, muted qualitative (CVD-safe) + sequential | Freely published | — | Categorical charts (S) |
| **Coolors** | Random palette exploration | Freemium: free plan limited to 10 saved palettes; Pro $3/mo (S) | — | Mood exploration only; its palettes are not systems |
| **Realtime Colors** | Preview a palette on a mock site | Free to use and outputs are free (S); **source code CC BY-NC-ND 4.0** (F) | — | Use the tool; do not copy its code |
| **Accessible Palette** (Eugene Fedorenko / Wildbit) | CIELAB/LCh scales with consistent lightness and WCAG contrast | Web app | — | Good for tinted neutrals |
| **node-vibrant** | Palette extraction from images | MIT | 4.0.4 (2026-01-27) | Photos |
| **colorthief** | Dominant colour and palette from images | MIT (F) | 3.5.0 (2026-08-02) | Photos |

This environment also has a `dataviz` skill with a validated palette method. The website-redesign skill should defer to it for chart colours.

### 9.2 How an expert builds a palette (additions to `design-theory.md` Part B)

1. **Sample the logo from the vector source, not a raster.** Parse `fill` and `stroke` values from the SVG or PDF. Logos have two to four colours, and image-extraction tools (Vibrant, Color Thief) are built for photos: on a raster logo they return anti-aliased edge blends. For a raster-only logo, take opaque pixels only, cluster (k-means, k ≤ 5), drop clusters under about 2% of pixels, then snap to the nearest clean value.
2. **Move to OKLCH immediately** (oklch.com, culori or color.js): fix H, step L, shape C (B5). Check gamut. A logo colour outside sRGB needs a P3 token and an sRGB fallback.
3. **Generate roles, not swatches.** Leonardo or Harmonizer target contrast per step; Radix step semantics assign the jobs.
4. **Verify every text/ground pair** with WCAG 2 (color.js `contrastWCAG21`) and APCA (Lc). Use the numbers already in B6; the APCA licence permits this use.
5. **Charts** use Okabe-Ito, Tol or viridis/cividis (or the `dataviz` skill), never the brand accent scale for categories.
6. **Exploration tools (Coolors, AI palettes) produce moods, not systems.** Never ship a five-swatch palette without the role mapping and contrast table.

---

## 10. Traps (consolidated)

1. **Remix Icon v1.0**: no icons as logos, app icons or brand identity; package.json and Iconify still say Apache-2.0.
2. **Lucide 1.0 removed brand icons**; old `Github`/`Twitter` imports fail.
3. **Iconify** makes CC BY and CC BY-SA sets one import away. Filter by SPDX.
4. **Solar**: MIT React wrapper, CC BY 4.0 artwork.
5. **Hero Patterns**: MIT npm wrapper, CC BY 4.0 artwork.
6. **Twemoji**: `twemoji` npm says MIT, `@twemoji/api` says "MIT AND CC-BY-4.0". The graphics need credit.
7. **OpenMoji** is CC BY-SA 4.0. Share-alike reaches derivatives.
8. **DiceBear**: 13 styles are CC BY 4.0; Avataaars and Bottts use custom terms.
9. **country-flag-emoji-json** is CC BY 4.0, even for the data.
10. **Hugeicons, Streamline, Blush, Storyset, Absurd, Unsplash+**: the free tier differs from the Pro tier shown on the same site.
11. **Fontshare FFL fonts** in a public git repo breach §02.
12. **Adobe Fonts** cannot be self-hosted, and the site's fonts stop when the subscription lapses.
13. **Google Fonts and Fontsource strip optional OpenType features**: slashed zero, old-style figures, small caps and stylistic sets silently fail.
14. **No `tnum` at all** in DM Sans, Poppins, Fraunces, Instrument Serif, Albert Sans, Be Vietnam Pro, Libre Franklin, Urbanist, League Spartan, Tajawal, Almarai and others.
15. **Material Symbols full font is 4.0 MB**; use `icon_names` or SVGs.
16. **Google-hosted fonts transmit visitor IPs**; there is a German GDPR ruling. Self-host.
17. **OFL Reserved Font Names**: subsetting is modification (Plex, Source, Merriweather, Lora, Playfair Display, Lexend/Readex …).
18. **Unsplash API ≠ Unsplash License.** API apps must hotlink and credit.
19. **Pixabay** mixes in AI-generated uploads, and its content showing trademarks cannot be used commercially.
20. **Kaboompics "Editorial Use Only"** images are excluded from marketing.
21. **Openverse does not verify licences.** Wikimedia files are often BY-SA.
22. **NASA** insignia, "worm" and seal need permission, and endorsement is barred. **ESA/Webb and ESA/Hubble are CC BY 4.0** with a mandatory credit.
23. **Placeholder hosts die.** via.placeholder.com broke builds across the ecosystem.
24. **Flag emoji do not render on Windows**; you get two letters.
25. **Arabic under `letter-spacing` or `font-style: italic`**: uneven gaps or broken joins, and synthetic oblique.
26. **APCA reference code** is not permissively licensed ("Limited W3 License").
27. **Realtime Colors' source code** is CC BY-NC-ND. The tool is free to use; do not copy the code.
28. **EU AI Act Art. 50** (from 2026-08-02): realistic AI images of real people, places or events must be disclosed.

---

## 11. Rejected or restricted resources

| Resource | Decision | Reason |
| --- | --- | --- |
| Feather Icons | Reject; use Lucide | Last release 2024-05; 410 open issues and 100 PRs; 286 icons |
| react-feather | Reject | Last release 2022 |
| UI Faces | Reject | Aggregated real people's photos without clear consent; now synthetic faces; either way it fabricates "users" |
| via.placeholder.com / placeholder.com | Reject | Dead or unreliable |
| Any placeholder host in production | Reject | Runtime dependency, privacy, unfinished look |
| Blush (free plan) | Reject for production | PNG of about 250×400 only; SVG is Pro |
| Storyset free, Absurd free, Streamline free, Solar, Basil, Lets Icons, IconaMoon, Pepicons, Game-icons, Twemoji, Hero Patterns, DiceBear CC BY styles | Restrict (class B) | Only with a visible credit; record in `CREDITS.md` |
| OpenMoji, CC BY-SA Wikimedia files | Restrict (class C) | Share-alike on derivatives |
| Remix Icon | Restrict | UI glyphs only; never for marks or identity |
| Hugeicons Pro, Streamline Pro, Unsplash+, Blush Pro | Reject unless the client buys a licence | Paid; seat-based |
| Fontshare FFL families | Restrict | Private repo or CDN only; prefer OFL |
| Adobe Fonts | Restrict | Client-owned subscription only; not self-hostable |
| Haikei | Restrict | Commercial terms unclear; generate SVG yourself |
| Coolors | Tool only | Freemium; palettes are moods, not systems |
| Material Symbols full font | Reject | 4.0 MB; use `icon_names` or SVG |
| Cormorant, Cinzel, Oswald, Bebas Neue, Anton, Poppins, Montserrat, Space Grotesk, DM Sans, Instrument Serif, Inter, Geist as *unexamined defaults* | Justify in `DESIGN.md` or pick an alternative (§8.4) | Template signal. Several also lack tnum or have tiny x-heights |
| Tajawal or Almarai for data | Reject for tables | No tabular figures |
| AI-generated people, teams, customers or offices | Reject | Dishonest; uncopyrightable; EU disclosure duties |

---

## 12. Proposed changes to the skill (for the synthesis stream; `skills/` untouched)

1. **New `references/resources.md`**: condensed versions of §3.1, §4.1, §5.1, §7, §8.1 and §9.1, plus the class A–D licence rule (§1). Keep dates and link each licence.
2. **`imagery.md` → Sourcing:**
   - add museum and archive CC0 sources as the anti-stock option (Met, Smithsonian, Rijksmuseum, LoC);
   - add the ESA/Webb credit rule, the NASA insignia rule, Kaboompics editorial-only and Pixabay's trademark and AI caveats;
   - note that the Unsplash *API* requires hotlinking while the download-and-self-host rule applies to licence use;
   - extend `CREDITS.md` with licence class and credit text.
3. **`imagery.md` → Other visual assets:** add the illustration decision order (§4.2) and the pattern provenance test (§6).
4. **`design-theory.md` C3/C4:**
   - add the voice shortlist with "instead of" alternatives;
   - add the feature-stripping rule and the self-host recipe;
   - add the `tnum` blacklist and the fontTools check;
   - add opsz loading (request the axis range);
   - add fallback metrics (fontaine / Capsize / Astro 6 Fonts API) with the Safari caveat, and `text-box` trim now Baseline;
   - add self-hosting for GDPR.
5. **New subsection "Multilingual and RTL"**: the Arabic table (condensed), the pairing rules, `unicode-range` + `size-adjust` mapping, no tracking, no italic (`font-synthesis: weight`), numeral decision, logical properties, the icon mirroring list, CJK and Devanagari notes.
6. **`ui-ux.md` or `visual-qa.md` → icons:** stroke-to-text matching, one set per product, 16 px sets for 16 px, `absoluteStrokeWidth`/`vector-effect`, mirroring in RTL.
7. **`technical-qa.md`:**
   - grep for placeholder hosts and for `fonts.googleapis.com` when the client is in the EU;
   - check `.woff2` files of FFL fonts are not tracked in a public repo;
   - check Material Symbols requests carry `icon_names`;
   - check `font-feature-settings` or `font-variant-*` are only used when the served file has the feature.
8. **`logo-design.md`:** never derive a mark from a library icon (Remix forbids it outright, and every library icon is shared by thousands of others); brand logos of third parties are referential only.
9. **Scripts** (optional): `scripts/font-features.py` (the §8.2 check) and `scripts/iconify-licences.py` (the §3.3 filter).
10. **`lessons.md` candidate:** "Google-hosted Inter silently lost `zero` and `cv11`; the spec sheet asked for them" (preventive).

---

## 13. Verification log (2026-09-28)

**File-verified (F).**
- npm tarballs:
  - Icons: `remixicon@4.9.1` (License v1.0), `lucide-static@1.48.0`, `lucide-react@1.48.0` / `0.577.0`, `@phosphor-icons/core@2.1.1`, `@phosphor-icons/react@2.1.10` (types: `weight`, `mirrored`), `@tabler/icons@3.48.0`, `heroicons@2.2.0`, `iconoir@7.12.1`, `material-symbols@0.47.5` (woff2 sizes 3.5–5.4 MB), `@material-symbols/svg-400`, `@radix-ui/react-icons@1.3.2`, `feather-icons@4.29.2`, `bootstrap-icons@1.13.1`, `@carbon/icons@11.89.0`, `@fluentui/svg-icons@1.1.343`, `@hugeicons/core-free-icons@4.3.5`, `@hugeicons/react` (MIT + PRO-LICENSE), `@solar-icons/react@2.3.2` (+ LICENSE-THIRD-PARTY), `mingcute_icon@2.9.72`, `simple-icons@16.33.0` (DISCLAIMER), `devicon@2.17.0`.
  - Avatars: all 31 `@dicebear/*@9.4.2` style packages.
  - Colour and fonts: `apca-w3@0.1.9`, `tailwindcss@4.3.3` (theme.css), `@fontsource/inter`, `@fontsource-variable/inter`, `@fontsource/ibm-plex-sans`, `@fontsource-variable/fraunces`.
  - npm metadata only: the colour, flag and font-tool packages listed in §7 and §9.
- GitHub raw LICENSE: radix-ui/colors, adobe/leonardo, yeun/open-color, ardov/huetone, evilmartians/oklch-picker, antiflasher/apcach, sjmgarnier/viridis, boringdesigners/boring-avatars, lipis/flag-icons, HatScripts/circle-flags, pheralb/svgl (+README), gilbarbara/logos, devicons/devicon, lowmess/hero-patterns (+README), catamphetamine/country-flag-icons, lokesh/color-thief, Evercoder/culori, color-js/color.js, juxtopposed/realtimecolors, fontsource/fontsource, unjs/fontaine, seek-oss/capsize, zachleat/glyphhanger, IBM/plex, googlefonts/noto-fonts, ira-design/ira-illustrations, microsoft/fluentui-system-icons, saoudi-h/solar-icons, phosphor-icons/core.
- Iconify `collections.json` (238 sets).
- google/fonts: `METADATA.pb` for 220 families, `OFL.txt` (RFNs), and `DESCRIPTION.en_us.html` for 22 Arabic families.

**Tested (T).**
- fontTools 4.66 on 206 upstream font binaries: GSUB features, default digit widths, cmap coverage (Latin, Arabic, Eastern Arabic and Persian digits), x-height/UPM.
- Google Fonts CSS2 API files for 11 families: Latin and Arabic slices, static and variable.
- Material Symbols with and without `icon_names`.
- Google Fonts CJK slice counts.
- Headless Chrome for Testing 154.0.8037.57: Arabic letter-spacing and synthetic italic, with measurements and screenshot.
- SVG drawing parameters for 13 icon sets.

**GitHub pages (G).** Remix-Design/RemixIcon issue #1069; kollektiv-mc/Kollektiv issue #40 (ITF FFL); feathericons/feather; evilmartians/harmonizer.

**Search-verified (S)**, because WebFetch and curl to these vendor sites were blocked by egress policy:
- Photo and media licences: Unsplash (+Unsplash+, API guidelines), Pexels, Pixabay, Kaboompics, Burst, Openverse, Wikimedia Commons, NASA, ESA/Hubble and ESA/Webb, LoC, Met, Smithsonian, Rijksmuseum.
- Illustration and pattern licences: unDraw, Open Peeps, Humaaans, Open Doodles, DrawKit, Storyset, Blush (+plans), Absurd, ManyPixels, 3dicons, Hero Patterns, pattern.monster, Haikei, fffuel.
- Font sources: Fontshare FFL, Velvetyne, Collletttivo, League of Moveable Type, Uncut.wtf, Open Foundry, Adobe Fonts.
- Icon licences: Streamline free, Solar.
- Tools and placeholders: Harmonizer, Coolors, Realtime Colors, Accessible Palette, Okabe-Ito, Paul Tol, cividis, UI Faces, placeholder services.
- Platform and browser facts: Windows flag emoji, the Google Fonts API feature limitation, the OFL FAQ on RFN and subsetting, the LG München Google Fonts ruling, the Astro 6 Fonts API, `text-box` Baseline, `font-size-adjust` Baseline, the Safari metric-override status, Material bidirectionality, Arabic line-height guidance, letter-spacing on cursive scripts.
- Policy and usage data: US Copyright Office Part 2, EU AI Act Art. 50, Web Almanac 2025 fonts.

**Not verified / open.**
- Haikei's current commercial terms.
- Harmonizer's code licence.
- Whether Fontshare's FFL text changed after the kollektiv issue.
- The exact Unsplash and Pexels licence wording (read the pages directly before a client deliverable).
- Firefox and Safari behaviour for Arabic letter-spacing (only Chrome was tested).
