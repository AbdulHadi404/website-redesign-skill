# Sanad — invoicing for small businesses in Saudi Arabia

Static front end. Serve the folder (e.g. `python3 -m http.server 8090`) and open http://localhost:8090/ (Arabic, the default) or `/?lang=en`.

- `assets/app.js` renders the dashboard from `data/invoices.json` (the API returns this shape; do not change it).
- `assets/logo.svg` is the brand mark from the 2024 identity: an arch (سند — "support") in deep teal `#0E5E5A` with a saffron keystone `#E0A526`. The app currently uses a "✦ Sanad" text logo and a purple theme from a UI kit.
- Amounts are SAR and include 15% VAT; ZATCA e-invoicing rules require the VAT number and amounts to be shown exactly.
- `window.sanadTrack('invoice_create', …)` is called when a new invoice is saved; product analytics depend on it.
- Most customers use the Arabic version on phones and laptops; accountants use the English version on desktops.
