# Visual assets — icons, illustration, photography, patterns, avatars, flags

Checked 2026-09-28. Licence classes A–D are defined in `README.md`.

## Icons

**First decide whether you need icons.** On marketing pages they belong in navigation, controls, lists and inline meta — not as section decoration (the icon-tile feature grid is a tell). A site's identity layer is better drawn in the brand's own line style than taken from any library.

**Choosing a set** (when you do need one):

1. **Stroke matches the text beside it.** At 16 px, regular text has stems of ~1.3–1.8 px: a 1.5 px set (Heroicons outline, Iconoir, Phosphor Regular, Hugeicons) sits beside regular text; a 2 px set (Lucide, Tabler) beside medium or semibold labels. Keep strokes constant when scaling (`absoluteStrokeWidth`, `vector-effect: non-scaling-stroke`) — a 24 px / 2 px icon shrunk to 16 px has a blurry 1.33 px stroke.
2. **Terminals and corners match the typeface.** Round caps for humanist and rounded sans; square terminals for grotesques and engineered faces (Carbon, Material Sharp); fine 1 px drawings (Phosphor Thin/Light, Iconoir) for light editorial serifs; filled or duotone for playful consumer brands.
3. **Drawn for the size you render**: 16 px UI wants Bootstrap, Carbon 16, Radix 15, Heroicons mini/micro; Fluent ships size-specific drawings; Material Symbols has an `opsz` axis.
4. **One set per product.** Mixing sets shows immediately (stroke, cap, corner, grid). Missing glyph → draw it on the set's grid, or switch sets. The only accepted mix is a UI set plus a brand-logo set.
5. **Colour**: icons take the text colour or a muted tint (`currentColor`), not the accent.
6. **Avoid the default when the brand has a voice**: Lucide is fine, but it is the shadcn default, so it reads "template".
7. **Tree-shake**: named imports only — `lucide-react` via `import *` or a string lookup ships 192 KB instead of 2 KB.

| Set | Size | Drawing | Licence | Character | Verdict |
| --- | --- | --- | --- | --- | --- |
| Lucide | 1,856 | 24, 2 px round | ISC (A) | friendly-neutral; the shadcn default. **1.0 (2026-03) removed brand icons** — `import { Github }` breaks | use (knowingly) |
| Tabler | 6,220 | 24, 2 px; outline + filled | MIT (A) | like Lucide, larger, a little more geometric | use |
| Phosphor | 9,072 × 6 weights | thin → bold, fill, **duotone** | MIT (A) | the warmest big set; thin/light for editorial, duotone for playful; `mirrored` prop for RTL | use |
| Heroicons | 1,288 | outline 1.5 px, solid, mini 20, micro 16 | MIT (A) | tidy, Tailwind house style | use; small set |
| Iconoir | 1,671 | 24, 1.5 px | MIT (A) | lighter, elegant, slightly quirky | use |
| Hugeicons free | 6,065 | Stroke Rounded only | MIT (A) for the free set; Pro is per-seat | soft, contemporary | use the free set only |
| Mingcute | 3,320 | line + fill, soft corners | Apache-2.0 (A) | friendly consumer | use |
| Material Symbols | 15,717 | FILL, wght, GRAD, opsz axes | Apache-2.0 (A) | reads Google/Android | use via `&icon_names=` (**3.3 KB instead of the 4.0 MB full font**) or SVGs |
| Carbon | 2,631 | 32/16, square terminals | Apache-2.0 (A) | engineered, enterprise | use |
| Fluent UI System | 19,876 | size-specific 16–48 | MIT (A) | Microsoft, rounded | use for Microsoft-adjacent products |
| Bootstrap Icons | 2,078 | 16 filled | MIT (A) | generic; good at true 16 px | use |
| Radix Icons | 332 | 15 crisp | MIT (A) | tiny UI glyphs | small UI only |
| Remix Icon | 3,188 | line + fill pairs | **Remix Icon License v1.0 (C for marks)**: no logo, app-icon or brand-identity use | neutral, systematic | UI glyphs only, never a mark |
| Solar, Streamline free, Basil, Lets Icons, IconaMoon, Pepicons, Codicons, Font Awesome icons | — | — | **CC BY 4.0 (B)** | varied | only with a credit line |
| Feather | 286 | 24, 2 px | MIT | the original of Lucide's look | **avoid** — unmaintained; use Lucide |
| Simple Icons | 3,461 brands | single-colour marks | CC0 project, **marks are trademarks** | brand logos | use to *refer* to brands, per their guidelines |
| svgl, Devicon, SVG Logos | — | colour logos | MIT / CC0 files, trademarked marks | tech logos | reference only |

**Iconify** (238 sets, one import each) makes CC BY and CC BY-SA sets one line away — filter by licence first (`github.com/iconify/icon-sets/.../collections.json` carries SPDX ids; it can lag upstream). **Emoji sets**: Fluent Emoji (MIT) and Noto Emoji (Apache-2.0) are class A; Twemoji graphics are CC BY; OpenMoji is CC BY-SA. Emoji are not UI icons.

## Illustration

Free libraries are tuned for maximum reuse, so the eye recognises the *system* — the same proportions, the same "diverse flat people with laptops" — before the message. Decision order:

1. **No illustration**: photography of the customer's world, the product UI, or typography.
2. **Draw it yourself in SVG** from the brand's own geometry — the logo motif, the product's objects, diagrams of the real mechanism. Cheap for an agent, unique, and what the "graphics layer" rule asks for (QA it element by element — `anti-patterns.md`, custom artwork).
3. **Commission** when illustration *is* the identity.
4. **A library as raw material** only if restyled into one stroke, palette and radius; never a library scene as-is in a hero.

| Resource | Licence | Verdict |
| --- | --- | --- |
| Open Peeps, Humaaans, Open Doodles | CC0 (A) | raw material only — instantly recognisable |
| unDraw | custom: free commercial use, no redistribution, no integrations, **no AI training** | the most recognisable startup-template look; avoid unless heavily art-directed |
| DrawKit free | free commercial, no redistribution | fine for a site; not in a public template repo |
| IRA Design | MIT (A) | dated 2019–21 gradient look |
| Storyset (Freepik) | free tier **requires a visible credit** (B) | recognisable Freepik style |
| Absurd Design | free tier requires credit in each product (B) | distinctive |
| Blush | free plan exports a ~250×400 PNG only | not usable for production |
| 3dicons, Fluent Emoji 3D | CC0 / MIT (A) | 3D icons — a trend-dated look |

## Photography, archives and media

| Source | Licence | Watch for |
| --- | --- | --- |
| Unsplash | Unsplash License (A): free commercial use, no credit | **Unsplash+ files (`plus.unsplash.com`, `premium_photo-…`) are paid**; the Unsplash *API* requires hotlinking and credit (a downloaded, self-hosted image under the licence is different) |
| Pexels | Pexels License (A) | no implied endorsement; identifiable people not in a bad light; not as a trademark |
| Pixabay | Content License (A) | **accepts AI-generated uploads** (filter them); content showing trademarks can't be used commercially |
| Kaboompics | standard licence (A) | "Editorial Use Only" images are excluded from marketing |
| Burst (Shopify) | free | small, ecommerce-oriented |
| Openverse | search engine | **does not verify licences** — check each work at its source |
| Wikimedia Commons | per file (often CC BY-SA — class C) | also trademark and personality rights |
| The Met Open Access, Smithsonian Open Access, Rijksmuseum | CC0 (A) for marked works | the best antidote to stock sameness: engravings, maps, botanical plates, posters — they read as art direction after a baked treatment |
| Library of Congress "Free to Use" | rights-cleared sets | check each item's rights advisory |
| NASA | generally public domain | **insignia, "worm" and seal need permission**; no implied endorsement |
| ESA/Hubble, ESA/Webb | **CC BY 4.0 (B)** | a visible credit is mandatory |

Search by *the subject in the customer's world*, not by mood words; choose from contact sheets, not one image at a time; download originals and self-host; bake one treatment into the set (`imagery.md`). **AI-generated imagery**: never customers, team members, testimonials, offices or product results; purely generated images are not copyrightable (US Copyright Office, 2025); realistic AI images of real people, places or events must be disclosed in the EU from 2 August 2026.

## Patterns, backgrounds, gradients

| Resource | Licence | Note |
| --- | --- | --- |
| Hero Patterns | **CC BY 4.0 (B)** — the MIT npm wrapper covers only the code | credit required |
| pattern.monster | MIT (A) | — |
| fffuel generators | outputs free, no credit | — |
| Haikei | commercial terms unclear | generate your own instead |
| CSS itself | — | layered `radial-gradient` / `conic-gradient`, `color-mix()` in OKLCH, SVG `feTurbulence` — tokenisable and licence-free |

**Provenance test**: can you say where the pattern comes from in the brand — the logo's geometry, the product's material (paper fibre, cable runs, a map grid), a texture from the real product? If not, delete it. One patterned surface per page, at low contrast (Lc ≤ 15 against its ground), never behind body copy.

## Avatars, placeholders, flags

- **Avatars**: on a marketing site, faces are nearly always fabricated social proof. In product mock-ups use initials or abstract generated avatars: Boring Avatars (MIT) or DiceBear's CC0 styles (glass, rings, shapes, thumbs, identicon, pixel-art, lorelei, notionists, open-peeps). **13 of DiceBear's 31 styles are CC BY**; Avataaars and Bottts use custom terms. UI Faces: avoid (real people's photos without clear consent, now synthetic faces).
- **Placeholder hosts: never ship them.** `via.placeholder.com` is dead and broke builds across the ecosystem; `placehold.co` and `picsum.photos` are runtime dependencies that log visitor IPs. A build that references `placehold|picsum|placeholder\.com|dummyimage|loremflickr|source\.unsplash\.com` fails QA.
- **Flags**: `flag-icons`, `circle-flags`, `country-flag-icons`, Flagpack (all MIT). `country-flag-emoji-json` is CC BY even for the data. Windows has no flag emoji glyphs (they render as letter pairs) — use SVGs.

## Brand logos (third parties)

Use a mark only to refer to that company (sign-in buttons, "works with" rows, social links), in official colours or mono, unmodified, following its guidelines; sign-in buttons use the provider's own assets. Customer and partner logos need permission and must be real. Never derive the client's own mark from a library icon.
