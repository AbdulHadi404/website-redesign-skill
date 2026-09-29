# Harbourside Council — resident parking permits

Static front end for the council's resident parking permit service. The back end (not in this repo) receives
applications at `POST /api/apply` (JSON) and returns `{ "reference": "HPP-xxxxxx" }`.

- `/` — the service start page
- `/apply/` — the application (one page)
- `data/zones.json` — controlled parking zones, streets and prices (exported nightly from the parking system; do not edit by hand)
- `assets/` — styles, scripts, the council crest (`crest.svg`, 2019)

Contracts other teams rely on:
- Field names posted to `/api/apply`: `full_name`, `email`, `phone`, `address_line1`, `postcode`, `zone`, `vehicle_reg`, `vehicle_make`, `permit_length`, `proof_of_address` (file name), `blue_badge`, `consent`.
- Analytics: `window.hbcTrack(event, props)` with `apply_start`, `apply_submit`, `apply_error` (`{ field }`), `apply_success` (`{ reference }`).
- URLs `/` and `/apply/` are linked from printed letters and must keep working.

Complaints logged by the contact centre this quarter:
- "I didn't know if my street was in a zone until the end."
- "The page told me there was an error but not where."
- "I couldn't do it on my phone, the zone table goes off the screen."
- "It timed out and I lost everything."
- "I didn't find out the price until after I'd typed everything in."
- "What is a CPZ?"
