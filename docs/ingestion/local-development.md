# Local development

1. Copy `.env.example` to `.env.local`.
2. Configure a development Supabase project and QStash account.
3. Run `npm install`, `npm run db:migrate`, and `npm run db:seed`.
4. Start the app with `npm run dev`.
5. Run `npm run typecheck:backend` and `npm test`.

Structured-data tests use saved HTML fixtures and mocked DNS/HTTP responses. Normal
automated tests must not depend on live career pages. `npm run sources:test-public`
remains an optional explicit network smoke test.

Custom scraper tests also use saved listing and detail fixtures. Live pages are only
used during an explicit source verification; normal tests must not crawl the web.

The React client tries persisted `/api/opportunities` first and temporarily falls back to
the legacy live `/api/jobs` feed while the database is unconfigured.

Vercel Cron and QStash require a public HTTPS `APP_URL`; use a trusted development
deployment for end-to-end queue testing. Do not disable signature verification locally.

For transactional integration tests, set `DATABASE_TEST_URL` to an isolated disposable
database. The test setup applies checked-in Drizzle migrations and clears ingestion
tables, so never reuse a shared database.
