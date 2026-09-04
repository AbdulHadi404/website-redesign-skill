# Phase 8 — Technical QA and hand-off

Goal: prove the site still works, is accessible, fast and indexable, and hand it over in a way the user can act on.

## Project checks

Run the project's own commands and report their real output:

- Typecheck / lint (`typecheck`, `check`, `lint`).
- Production build — including any image generation, CMS fetch or embedded app bundle the build performs.
- Tests. Do not skip a failing test; fix it or explain exactly why it fails.

## Functional checks

Exercise, not inspect:

- Every nav link, footer link, in-page anchor and CTA, on desktop and in the open mobile menu.
- Every form: fields, validation, honeypot/captcha presence, submission path, success and error states.
- Every interactive widget through every state; drive it with a script when a backend is unavailable.
- External links open the right target; `mailto:` links carry the right address and subject.
- Routes that existed before still exist; redirects and anchors other pages depend on still resolve.
- Analytics hooks, consent banners and third-party embeds still load where they did.

## Accessibility

- Landmarks (`header`, `nav`, `main`, `footer`), a skip link, one `h1`, ordered heading levels.
- Labels on every input; names on every button and icon-only control.
- Keyboard: tab order, visible focus, Escape closes overlays, tabs and menus operable with arrows.
- Custom widgets use the right roles and states (`role=tablist`, `aria-selected`, `aria-expanded`, `aria-controls`).
- Contrast at small sizes on every surface, including tinted and image chapters.
- `prefers-reduced-motion` disables decorative motion; nothing essential depends on animation.
- Decorative SVGs and images marked `aria-hidden`; meaningful images have alt text.

## Performance

- No runtime framework shipped for static content; client JS limited to what routes need.
- Images responsive with explicit dimensions; hero eager with high fetch priority; below-the-fold lazy; total page weight sane.
- Fonts: only the weights used, `display: swap` or equivalent, preconnect to the font host.
- Animation uses transform and opacity; nothing animates layout; scrolling stays smooth on a low-power device.
- No layout shift from late fonts, images or injected widgets that you can avoid.

## SEO and metadata

- Unique title and description per page; canonical URLs; Open Graph and Twitter tags with a regenerated social image that matches the new identity.
- Structured data if it existed before (Organization, Product) still valid.
- Sitemap and robots correct; admin or utility routes excluded.
- Favicon and theme colour updated to the new identity.

## Hand-off

- Commit on the branch with a message that explains the direction and the notable engineering decisions.
- Push. If the project has preview deployments, share the preview URL. Do not merge or deploy to production unless the user asked.
- Report: what changed and why; what was verified and how (widths rendered, flows exercised, commands run with results); what was deliberately left out (missing proof, assets, capabilities) and what the user must decide (production, unresolved facts, brand assets).
- Leave the repo documented: the art-direction document, credits for assets, and any README changes the new system needs.
