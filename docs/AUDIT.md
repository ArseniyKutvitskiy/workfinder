# WorkFinder engineering audit — 2026-11-07

## Implemented

- Strict TypeScript for production frontend/backend/shared code. No explicit application `any` or type-check suppression directives. Tests are JavaScript fixtures.
- UI shell separated from overview, chat and resume pages; workspace controller hook; shared navigation and defaults.
- SSE chat and letters with deadlines, heartbeat, disconnect cancellation, safe errors, bounded text and commit-before-done semantics.
- Bounded user-specific match cache with concurrent request coalescing; reduced repeated AI context; SDK automatic retries disabled.
- Zod auth/API/provider validation, verified Supabase sessions, RLS user queries, database AI rate limits, safe external URLs and plain-text rendering.
- Dark/light themes, locale-aware feedback, optimistic bookmarks with rollback, focus/reduced-motion/skip-link improvements.
- Dashboard code splitting, immutable hashed assets, generic social metadata, canonical URL, public-only sitemap and API robots exclusion.
- Compiled-server production/Docker startup and updated setup documentation.

## Evidence

- Strict type check and frontend/backend builds pass.
- 22 tests pass: OAuth failures, validation, provider isolation, PDF Unicode/multipage output, auth gating, origin rejection, version conflicts, SSE success/failure, split UTF-8 parsing, and isolated AI caching.
- Production dependency audit reports no known vulnerabilities at this checkpoint.
- Browser: sign-in renders in RU/EN and both themes. No login credentials were submitted during this audit.

## Remaining release checks and limitations

- This is not a WCAG 2.1 AA certification. Run axe and manual keyboard, screen-reader, contrast and mobile/tablet checks across authenticated pages, including dialogs.
- Core Web Vitals have not been measured on a public deployment. Measure LCP/INP/CLS under realistic device/network conditions. Runtime Zod validation adds frontend bytes.
- Live paid AI testing was not performed: the earlier API probe returned credit_balance_exhausted. Validate streaming, cancellation and output quality after funded access is available.
- Re-run Google login, password recovery, account switching and the authenticated end-to-end journey after this migration.
- Supabase pgTAP isolation tests remain configured in CI but were not executed locally without Docker. Database client types mirror the checked-in migrations; compare or regenerate them against the live Supabase schema when migrations change.
- AI cache and letter generation locks are process-local. Shared rate limits do not make these locks distributed. Simultaneous letter editing/generation across instances remains last-write-wins; resumes have version checks.
- Job search covers a bounded upstream sample. Unsupported filters and missing API keys are explicit; duplicates with different source URLs may remain.
- Production SMTP, backup restoration, retention jobs, monitoring and account/data deletion support require deployment work.

Public-launch readiness requires these checks; a passing build is not a substitute for them.

## Production-readiness pass — 2026-11-07 (later)

- Offline AI engine (`server/services/fallback.ts`): guided-interview chat, keyword fit estimate, fact-only template letter. Used when no key is configured, on quota/auth/outage/timeout errors, or when a stream fails before emitting text. Results are flagged `fallback: true` and labelled in the UI.
- Circuit breaker (`server/services/resilience.ts`): 60 s cool-down after outages, 5 min after quota errors; `/api/health` and `/api/ready` report the AI mode.
- `OPENAI_API_KEY`, `HH_USER_AGENT`, `HH_ACCESS_TOKEN`, `JOOBLE_API_KEY` are optional; empty strings from hosting dashboards are treated as unset.
- Client: stacked success/info/error toasts, retries with backoff for idempotent reads, offline banner and reconnect refetch, per-action pending labels/spinners in the job dialog, chat typing indicator, dark-mode skeletons, pre-paint theme script (no light flash), soft-reset error boundary.
- Bug fixes: a failed bookmark no longer replaces the job list with a "couldn't load jobs" screen; the fit bar no longer renders `width: null%`; the reset confirmation no longer repeats "saved jobs will stay"; removed the dead "sample profile" confirmation branch; "Writing your draft…" no longer shows while a match assessment is running.
- Server: structured 5xx logs with method/path/error class (no messages or user content); `unhandledRejection`/`uncaughtException` handlers; readiness check bounded to 5 s.
- Tests: 30 pass (8 new for fallbacks, breaker, config).

## UI scope change — 2026-11-07

- Dark theme removed at the owner's request: theme toggle, pre-paint `public/theme-init.js`, the `workfinder-theme` preference and all `html[data-theme="dark"]` styles. The app ships a single light theme; a stale `workfinder-theme` value in browser storage is now ignored.
- Live check of the signed-in workspace also fixed: entity-encoded provider HTML in job descriptions, top-bar overflow at tablet widths, a missing space in the overview hero, and a chat header that claimed live AI while in offline mode.

## Chat-first + multi-source jobs — 2026-11-08

- Chat-first onboarding: resume interview (name → city/country → role → education → experience → skills → projects → goals → contact); `profileReadiness` gates job matching; jobs pre-filled from the resume.
- 10 job sources (`server/services/providers.ts`): hh, Работа России, Jooble, Careerjet, Adzuna, Remotive, RemoteOK, Himalayas, Jobicy, Arbeitnow. Market-based source plan, per-source cache, dedupe, personal ranking (role, skills, city, freshness, entry-level boost for beginners), remote eligibility for KZ/RU.
- Bug sweep before first live OpenAI use: OpenAI-facing schemas no longer contain `maxLength` (rejected by strict structured outputs) — lengths are clamped after the response; Jooble receives a place name instead of an ISO code; bookmarking a not-yet-stored job stores it first or returns a clear `jobs.migrationRequired`; saving the resume re-targets the job search; a source picked outside its market reports `unsupportedFilters`; offline-mode toast shows once.
- Verified: 38 tests, strict type check, clean production build, compiled server boot (`/api/health`, `/api/ready`, assets, SPA routes, 401 on API, CSP). Live search against real providers (Moscow: 73 jobs incl. 60 local).
- Not verifiable without keys: live OpenAI responses, hh/Jooble/Careerjet/Adzuna adapters (built to their documented formats; Careerjet KZ locale `ru_KZ` unconfirmed).
