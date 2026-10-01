# Hallam & Price Chartered Accountants — website

Two-partner practice in Kelham Island, Sheffield (est. 1988; 9 staff). Built in 2014 on a Bootstrap theme; static.

- `/` home · `/services/` · `/fees/` · `/team/` · `/contact/`
- `data/fees.json` — the practice's fixed fees (agreed by the partners each April; do not edit by hand)
- `data/services.json` — services
- `assets/` — styles, scripts, logo (`logo.svg`, 1988 lettermark redrawn in 2014)

Contracts:
- `POST /api/enquiry` (form-encoded) with `name`, `email`, `phone`, `business_name`, `business_type`, `turnover`, `service`, `message`, `preferred_contact`, `how_heard`. The practice CRM reads these field names.
- Analytics: `window.hpTrack(event, props)` with `enquiry_start`, `enquiry_submit`, `enquiry_success`, `fees_view`, `phone_click`.
- `/fees/` and `/contact/` are printed on the practice's letterhead and in its email signature.

From the practice's analytics (last 12 months):
- 71% of visits are on phones.
- Most-searched phrases that bring people to the site: "self assessment accountant sheffield", "how much does an accountant cost for a sole trader", "tax return deadline", "limited company accountant sheffield".
- 38% of visitors open `/fees/`; 81% of those leave from it (it only offers a PDF download link that has been broken since 2022).
- The contact form is started 240 times a month and finished 31 times.
- The phone number is the most clicked element on phones.

## Since the 2026 redesign

The design direction, and the reason for every choice, is in `DESIGN.md`; the review is in `CRITIQUE.md`; the hand-off report (REPORT) is delivered with this branch.

- **Fees and services still come from `data/`.** Pages read `data/fees.json` and `data/services.json` in the browser on every visit (`assets/fees.mjs`), so the April update shows at once. A copy of the same content is also written into the HTML for search engines, printouts and visitors without JavaScript: after changing either file, run `node tools/prerender.mjs` (Node 18+, no dependencies) and commit the pages it updates. The same script stamps the shared header and footer into each page.
- **Styles and scripts:** `assets/site.css` (tokens at the top), `assets/site.js` (the analytics queue and `phone_click`, unchanged, plus the phone menu), `assets/fees-render.mjs` (one renderer used by the browser and by `tools/prerender.mjs`), `assets/form.js` (enquiry form validation and prefill).
- **Fonts:** Literata and Schibsted Grotesk, self-hosted in `assets/fonts/` (SIL Open Font License; see `CREDITS.md`).
- **Logo files:** `assets/logo.svg` is the 2014 file, untouched. The site uses `logo-outlined.svg`, `logo-compact.svg`, `logo-mark.svg` and their `-rev` versions for the navy header: the same lockup with its text converted to outlines so it looks the same on every phone (see `REPORT.md`). `qa/outline-logo.mjs` regenerates them.
- **Contracts unchanged:** the enquiry form posts the same ten fields, in the same order, with the same values, to `POST /api/enquiry`; `window.hpTrack` and its five events are kept (each page now defines the `hpTrack` queue in its `<head>`, so `fees_view` and `enquiry_start` no longer throw before `site.js` loads).
- **Checks** used during the redesign live in `qa/` (state files, widget contracts, probes) and `audit/`; captures in `captures/`.
