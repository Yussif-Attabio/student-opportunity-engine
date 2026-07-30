# Database setup and migrations

Use a Supabase pooled connection for `DATABASE_URL` and the direct port 5432 connection
for `DATABASE_DIRECT_URL`.

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

Migrations create the source registry, normalized opportunities, sync runs,
classifications, failures, and admin profiles. Important constraints include unique
`(source_id, external_id)`, unique canonical application URL, and one `RUNNING` sync per
source.

Never point automated tests at a shared database. Set `DATABASE_TEST_URL` to an isolated
disposable PostgreSQL database; integration tests are skipped when it is absent.

To grant administration access, insert the Supabase Auth user's UUID and email into
`admin_profiles`. Disabling that row revokes ingestion-admin access without changing the
user's normal account.
