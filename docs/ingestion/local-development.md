# Local development

1. Copy `.env.example` to `.env.local`.
2. Configure a development Supabase project and QStash account.
3. Run `npm install`, `npm run db:migrate`, and `npm run db:seed`.
4. Start the app with `npm run dev`.
5. Run `npm run typecheck:backend` and `npm test`.

The React client tries persisted `/api/opportunities` first and temporarily falls back to
the legacy live `/api/jobs` feed while the database is unconfigured.

Vercel Cron and QStash require a public HTTPS `APP_URL`; use a trusted development
deployment for end-to-end queue testing. Do not disable signature verification locally.

For transactional integration tests, set `DATABASE_TEST_URL` to an isolated disposable
database. The test setup applies checked-in Drizzle migrations and clears ingestion
tables, so never reuse a shared database.
