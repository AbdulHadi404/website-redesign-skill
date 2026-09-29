# milkline.ie — marketing site and herd app front end

Static site. Serve the folder with any static server, e.g. `python3 -m http.server 8080`, then open
http://localhost:8080/ (marketing), /pricing.html and /app/ (the herd dashboard farmers use).

- `assets/site.css`, `assets/site.js` — marketing styles and scripts (template bought in 2023).
- `assets/logo.svg` — the brand mark from the 2021 identity (droplet + line, navy #14365C and sky #2FA4D7, wordmark in Nunito Black).
- `app/` — the herd dashboard. `app/app.js` renders the herd table from `data/herd.json`
  (in production the JSON comes from the sync service; do not change its shape).
- The visit form posts to `/api/visit` and fires `window.mlTrack('visit_form_submit')` — marketing relies on both.
