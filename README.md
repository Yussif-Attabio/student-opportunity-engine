# Student Opportunity Engine

A full-stack platform that helps students discover, compare, and track internships,
entry-level jobs, scholarships, research roles, fellowships, and career events.
Opportunities are collected from public employer feeds and official career sites,
then normalized and matched to each student's profile.

## Features

- Personalized opportunity matching by major, skills, interests, location, and goals
- Public opportunity ingestion from Greenhouse, Lever, Ashby, Adzuna, and career sites
- Filtering, saved opportunities, deadlines, and application-status tracking
- AI-assisted application guidance with a local fallback
- Customizable resume builder with PDF export
- Deduplication, classification, scheduled synchronization, and source monitoring

## Tech stack

- React 19, TypeScript, and Vite
- Node.js and Vercel serverless functions
- PostgreSQL, Drizzle ORM, and Supabase
- Upstash QStash for scheduled ingestion
- Groq for optional AI guidance and classification
- Vitest and ESLint

## Contributor setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer
- npm
- Git

Private-repository contributors must accept the GitHub collaborator invitation
before cloning.

### Run locally

```powershell
git clone https://github.com/Yussif-Attabio/student-opportunity-engine.git
cd student-opportunity-engine
npm install
npm run dev
```

Open <http://localhost:5173>. The local API runs on
<http://localhost:3001>. Public Greenhouse and Lever opportunities work without
API credentials.

### Optional environment configuration

Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

Fill in only the services needed for your work:

- `GROQ_API_KEY` and `VITE_AI_ENABLED=true` enable AI guidance.
- `DATABASE_URL` enables PostgreSQL-backed opportunity and admin APIs.
- `DATABASE_DIRECT_URL` is used for database migrations when configured.
- Supabase variables enable admin authentication.
- QStash variables enable scheduled and queued ingestion.
- USAJOBS and Adzuna credentials enable their optional feeds.

Never commit `.env.local` or expose server secrets through variables prefixed
with `VITE_`.

### Database setup

After configuring PostgreSQL:

```powershell
npm run db:migrate
npm run db:seed
npm run sources:sync-local
```

Integration tests require a separate `DATABASE_TEST_URL`.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend and local API |
| `npm run build` | Type-check and build the application |
| `npm test` | Run the test suite |
| `npm run lint` | Run ESLint |
| `npm run typecheck:backend` | Type-check backend code |
| `npm run sources:test-public` | Validate configured public sources |
| `npm run sources:sync-local` | Synchronize configured sources locally |
| `npm run ingestion:status` | Display ingestion status |

## Contributing

Create a focused branch from the latest default branch:

```powershell
git switch -c test/matching-algorithm
```

Make the change, run the relevant tests and lint checks, then push the branch
and open a pull request. Do not commit generated build output, credentials, or
unrelated changes.

Opportunity integrations must use authorized public APIs or official career
pages, respect provider terms and `robots.txt`, rate-limit requests, preserve
source attribution, and direct applications to the original posting.
