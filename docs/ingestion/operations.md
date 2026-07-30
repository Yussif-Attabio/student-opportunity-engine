# Operations and administration

Required production variables are documented in `.env.example`. Secrets remain
server-side; only `VITE_` values may reach the browser.

Admin endpoints require a valid Supabase token and active `admin_profiles` row:

- `GET|POST /api/admin/sources`
- `PATCH /api/admin/sources/:id`
- `POST /api/admin/sources/:id/test`
- `POST /api/admin/sources/:id/sync`
- `GET /api/admin/sources/:id/sync-runs`
- `GET /api/admin/sources/:id/failures`
- `POST /api/admin/opportunities/:id/reclassify`
- `GET /api/admin/ingestion/stats`

Structured logs contain IDs and metrics. Descriptions, raw source data, authorization,
tokens, API keys, and resumes are redacted. Terminal queue failures are stored in
`ingestion_failures`.

Organizations can request removal through `REMOVAL_CONTACT_EMAIL`. After verification,
an administrator disables the source and deactivates its opportunities.
