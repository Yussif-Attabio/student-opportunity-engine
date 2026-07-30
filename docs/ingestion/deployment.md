# Deployment

1. Create Supabase, QStash, and Vercel projects.
2. Configure every required variable from `.env.example` in Vercel.
3. Run Drizzle migrations against the direct Supabase connection.
4. Seed verified sources and add an `admin_profiles` row.
5. Deploy; `vercel.json` installs the daily safety cron and worker durations.
6. Run `npm run scheduler:setup` to install the 15-minute QStash dispatcher.
7. Test a source, trigger a manual sync, and inspect its run.
8. Confirm `/api/opportunities` returns persisted active records.

QStash signing requires `APP_URL` to exactly match the public deployment URL. Rotate
signing keys by configuring both current and next keys before promotion.

Public search supports keyword, type, company, location, remote status, major,
graduation year, skills, date posted, student eligibility, sponsorship, cursor, and
bounded page size filters.
