# AI Job Discovery & Matching Agent

A single-user MVP for discovering, normalizing, scoring, and reviewing engineering jobs against a resume and structured preferences.

## What is implemented

- `Next.js` App Router dashboard with recommendation buckets, filters, source health, profile editing, and job detail pages
- `Prisma` schema for candidate profile, preferences, sources, raw jobs, normalized jobs, match results, feedback, and pipeline runs
- Resume parsing pipeline for `PDF`, `DOCX`, and plain text
- Curated source adapters for `Greenhouse`, `Lever`, and a seeded static/demo mode
- Hybrid matching engine with:
  - hard filters
  - weighted score breakdown
  - confidence score
  - urgency score
  - hidden match support
  - bounded thumbs up/down feedback adjustment
- Manual pipeline trigger and cron-compatible API route
- JSON API routes for recommendations, job detail, preferences, resume upload, sources, and feedback

## Modes

### Demo mode

If `DATABASE_URL` is not configured, the app runs from an in-memory seeded dataset so the UI still works locally.

### Database mode

If `DATABASE_URL` is configured, the app uses Prisma/Postgres and persists profile, preferences, ingestion state, match results, and feedback.

## Environment

Copy `.env.example` to `.env.local` and fill in what you need.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_job_discovery"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
APP_BASE_URL="http://localhost:3000"
CRON_SECRET="replace-me"
```

`OPENAI_API_KEY` is optional. Without it, the app falls back to heuristic resume/job parsing.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run db:generate
npm run db:push
npm run db:seed
```

## Local setup

1. Install dependencies with `npm install`.
2. Generate the Prisma client with `npm run db:generate`.
3. If you want persistence, start Postgres and set `DATABASE_URL`.
4. Push the schema with `npm run db:push`.
5. Seed sample data with `npm run db:seed`.
6. Start the app with `npm run dev`.

## Main routes

- `/` dashboard
- `/profile` resume upload and preferences
- `/sources` source status and manual pipeline run
- `/jobs/[id]` job detail and score breakdown

## API routes

- `POST /api/pipeline/run`
- `POST /api/cron/run`
- `GET /api/recommendations`
- `GET /api/jobs/:id`
- `POST /api/feedback`
- `POST /api/profile/resume`
- `POST /api/preferences`
- `GET /api/sources`

## Notes

- The build compiles successfully, and `lint` plus `typecheck` pass.
- In this sandbox, subprocess-heavy runners are blocked, so end-to-end test execution and the final `next build` typecheck phase can fail with `spawn EPERM` even when the app code itself typechecks cleanly.
