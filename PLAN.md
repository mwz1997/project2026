# Spec + Build Plan: AI Job Discovery & Matching Agent MVP

## Summary
Build a single-user job discovery system as a full-stack `Next.js` app with `Postgres`/`Prisma` and `OpenAI` for structured parsing and summaries. The first implementation will focus on a web dashboard, curated company-page ingestion, deterministic scoring with transparent breakdowns, and simple thumbs up/down feedback.

The product goal is to turn raw jobs plus a resume into a ranked, explainable recommendation list that saves time and improves application quality. The first release should prove three things: we can parse jobs reliably, we can rank them credibly, and the user can quickly decide what to apply to.

## Product Spec
### Primary user outcome
- Upload a resume and set preferences once.
- Run or schedule job collection from a curated set of sources.
- View a ranked dashboard of recommended jobs with reasons, missing skills, blockers, and urgency.
- Give lightweight feedback so rankings improve over time.

### MVP scope
- Resume upload and parsing from `PDF`, `DOCX`, or plain text.
- Preferences editor for role, industry, location, salary, sponsorship, seniority, include/exclude keywords.
- Source adapters for a small curated list of company career pages.
- Raw job storage plus normalized job parsing.
- Deduplication across fetches and reposts.
- Rule-based scoring with LLM-assisted extraction and summaries.
- Dashboard with recommendation buckets and job detail view.
- Manual pipeline trigger plus cron-compatible endpoint.
- Feedback capture with thumbs up/down.

### Explicitly out of scope
- Auto-apply.
- Multi-user auth.
- Billing.
- Large-scale scraping infra.
- Learned ranking models.
- Cover letter and resume tailoring generation in the first implementation.
- Broad third-party scraping that creates legal or maintenance risk.

## Architecture
### Stack
- `Next.js` App Router for UI and server endpoints.
- `TypeScript` across frontend and backend.
- `Prisma` with `Postgres`.
- `OpenAI API` for structured extraction and fit summaries.
- `Playwright` only if needed for source pages that require rendering; default to plain HTTP + parser first.

### Core subsystems
- `Profile subsystem`: stores parsed resume profile plus editable preferences.
- `Source ingestion subsystem`: fetches jobs from curated sources into raw records.
- `Normalization subsystem`: converts raw jobs into canonical structured jobs.
- `Matching subsystem`: applies hard filters, weighted scoring, and recommendation bucketing.
- `Feedback subsystem`: stores thumbs up/down and adjusts future ranking weights in bounded ways.
- `Dashboard subsystem`: displays jobs, score breakdowns, and reasoning.

### Execution flow
1. User uploads resume and saves preferences.
2. Resume is parsed into a `CandidateProfile`.
3. Ingestion fetches raw jobs from selected sources.
4. Raw jobs are deduped and parsed into `NormalizedJob`.
5. Matching runs hard filters first, then weighted scoring.
6. Recommendations are bucketed into `apply_now`, `review`, `stretch`, and `skip`.
7. Dashboard renders ranked results with explanation and feedback controls.
8. Feedback is persisted and applied as small preference/weight adjustments on future runs.

## Data and Interfaces
### Core types
- `CandidateProfile`
  Fields: `skills`, `roles`, `industries`, `tools`, `yearsExperience`, `education`, `domains`, `seniorityEstimate`, `rawResumeText`, `parseConfidence`.
- `UserPreferences`
  Fields: `targetRoles`, `industries`, `locations`, `remotePolicy`, `salaryMin`, `sponsorshipRequired`, `seniority`, `keywordsInclude`, `keywordsExclude`.
- `JobSource`
  Fields: `name`, `type`, `baseUrl`, `enabled`, `fetchStrategy`, `selectorConfig`.
- `RawJobPosting`
  Fields: `sourceId`, `sourceJobId`, `url`, `rawTitle`, `rawCompany`, `rawLocation`, `rawDescription`, `postedAtRaw`, `fetchedAt`, `contentHash`.
- `NormalizedJob`
  Fields: `jobId`, `titleNormalized`, `company`, `locationNormalized`, `remoteType`, `skillsRequired`, `skillsPreferred`, `industry`, `seniority`, `sponsorshipStatus`, `salaryMin`, `salaryMax`, `postedAt`, `parseConfidence`, `status`.
- `MatchResult`
  Fields: `jobId`, `matchScore`, `confidenceScore`, `urgencyScore`, `bucket`, `scoreBreakdown`, `fitSummary`, `missingSkills`, `reasoning`, `blockingReasons`.
- `FeedbackEvent`
  Fields: `jobId`, `feedbackType`, `createdAt`.

### Public app/API surfaces
- Resume upload action: parse and persist profile.
- Preferences save action: update structured preferences.
- Pipeline trigger endpoint: run fetch, parse, dedupe, score.
- Recommendations query endpoint: list ranked jobs with filters.
- Job detail endpoint: return normalized job, match result, and explanation.
- Feedback endpoint: persist thumbs up/down.
- Cron endpoint: secret-protected trigger for scheduled pipeline runs.

### Database model direction
- Tables: `candidate_profile`, `user_preferences`, `job_source`, `raw_job_posting`, `normalized_job`, `match_result`, `feedback_event`, `pipeline_run`.
- Keep raw and normalized records separate so parsing can be retried without losing source truth.
- Never delete jobs immediately; mark them `active`, `stale`, or `expired`.

## Ranking Spec
### Hard filters
- Exclude jobs with explicit `keywordsExclude` hits.
- Exclude jobs with explicit salary below `salaryMin`.
- Exclude jobs with clear location mismatch.
- Exclude jobs with explicit sponsorship conflict.
- Exclude jobs that are clearly above target seniority.

### Weighted score
- Title similarity: `20`
- Skills overlap: `30`
- Industry match: `10`
- Seniority fit: `10`
- Location fit: `10`
- Sponsorship fit: `10`
- Recency: `5`
- Preference keyword fit: `5`

### Additional scoring rules
- Compute `confidenceScore` separately from `matchScore`.
- Unknown sponsorship, salary, or location reduces confidence, not automatically the core fit score.
- Missing must-have skills lower score; missing nice-to-have skills go into `missingSkills`.
- “Hidden matches” are jobs whose normalized fit is high even if raw title is not in target roles.

### Recommendation buckets
- `apply_now`: high score, no blockers, acceptable confidence.
- `review`: good fit with one or two uncertainties.
- `stretch`: promising but below ideal seniority/skills fit.
- `skip`: low score or blocked by explicit constraints.

## UI Spec
### Required screens
- Dashboard home with recommendation buckets, filters, source freshness, and manual refresh.
- Resume/profile page with parsed profile review and editable preferences.
- Job detail view with score breakdown, reasoning, missing skills, blockers, and raw description preview.
- Source status view showing last fetch time, fetch result, and errors.

### Dashboard behaviors
- Sort by `bucket`, then `matchScore`, then `urgencyScore`, then recency.
- Filter by source, company, location, bucket, and feedback state.
- Show “why this matched” and “why it is not higher” inline.
- Allow thumbs up/down directly from the list and detail view.

## Implementation Plan
### Phase 1: App skeleton and data layer
- Create `Next.js` app with App Router, TypeScript, Prisma, and Postgres wiring.
- Define Prisma schema for all MVP entities.
- Add environment/config handling for database, OpenAI, and cron secret.
- Seed a small set of curated `JobSource` entries.

### Phase 2: Resume and preference intake
- Build resume upload flow and text extraction path for `PDF`, `DOCX`, and plain text.
- Implement OpenAI structured extraction into `CandidateProfile`.
- Build preferences form and persistence.
- Add profile review UI so parsed fields can be corrected manually.

### Phase 3: Job ingestion and normalization
- Implement source adapter interface with at least 2 curated sources.
- Fetch and store `RawJobPosting` records.
- Add canonical dedupe using URL hash, then `(company, normalized title, normalized location)`, then fuzzy fallback.
- Implement OpenAI structured extraction for `NormalizedJob`.
- Persist parse confidence and unknown flags.

### Phase 4: Matching and recommendations
- Implement hard filters and weighted scoring engine.
- Generate `scoreBreakdown`, `fitSummary`, `missingSkills`, and `reasoning`.
- Compute urgency from post age and urgency phrases.
- Persist `MatchResult` and expose recommendation queries.

### Phase 5: Dashboard and feedback
- Build dashboard list and detail view.
- Add manual pipeline run action and pipeline status display.
- Add thumbs up/down feedback API and bounded reweighting logic.
- Add cron-compatible endpoint for scheduled execution.

## Test Plan
- Resume parsing returns stable structured output for representative resumes in all supported formats.
- Profile correction UI persists changes and future runs use corrected values.
- Source adapters ingest expected jobs and record fetch failures cleanly.
- Dedupe prevents duplicate listings while preserving distinct roles from the same company.
- Job normalization handles missing salary, ambiguous sponsorship, and remote/hybrid wording correctly.
- Hard filters exclude explicit non-matches.
- Score breakdown is deterministic and sums to expected total.
- Hidden matches surface relevant roles with non-obvious titles.
- Feedback updates later ranking behavior without creating opaque or extreme changes.
- Dashboard renders recommendations, reasons, blockers, and feedback controls correctly.
- Cron endpoint triggers a full pipeline run when provided the correct secret.

## Acceptance Criteria
- A user can upload a resume, review parsed profile data, and save preferences.
- A pipeline run ingests jobs from curated sources and stores both raw and normalized forms.
- The app shows ranked recommendations with explanations and recommendation buckets.
- The user can inspect a job’s detailed reasoning and give thumbs up/down feedback.
- The system supports repeated runs without flooding the dashboard with duplicates.
- Unknown or ambiguous job fields are shown explicitly rather than hidden in the score.

## Assumptions and Defaults
- Initial implementation is single-user and local/developer operated.
- The first usable surface is the web dashboard, not email.
- Email digest is deferred until after dashboard quality is validated.
- Source coverage is intentionally narrow in v1 to prioritize compliance and reliability.
- OpenAI is used for extraction and summaries, while final ranking stays deterministic and auditable.
- Deployment-time scheduling will use the cron endpoint; local development will use a manual run action.
