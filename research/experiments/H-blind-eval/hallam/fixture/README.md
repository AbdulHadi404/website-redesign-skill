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
