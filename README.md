# WorkFinder

AI career workspace for students: a **chat-first** assistant that interviews the student and builds their **resume**, then a 10-source **job aggregator** (Kazakhstan, Russia, remote) with resume-to-job **fit scoring**, and one-click **cover letters**. Fully bilingual (Russian by default, English), mobile-ready, light theme.

**Stack:** React 19 + Vite + Tailwind (frontend) · Express 5 + SSE streaming (backend, strict TypeScript) · Supabase Auth/Postgres/Storage with row-level security · OpenAI Responses API (server-side only) · Zod validation at every boundary.

## Quick start

Requires Node.js 22 LTS and pnpm 11 (`corepack enable`).

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local   # skip if .env.local already exists — never overwrite real keys
pnpm dev                     # http://localhost:3000
```

Minimum to boot: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, with the migrations applied (section 2). `OPENAI_API_KEY` is optional. Without it the app runs in **offline AI mode** (see below).

```sh
pnpm typecheck   # strict TS, frontend + backend
pnpm test        # 30 tests: API, SSE, fallbacks, validation, PDF, i18n
pnpm build       # vite build + compiled server in build-server/
pnpm start       # production server (serves dist/ + API)
```

## Reliability and graceful degradation

Built so a live demo survives a dead network, an exhausted API quota or a missing key.

| Failure | What the user sees |
| --- | --- |
| OpenAI key missing, quota exhausted (429), auth error, outage or timeout | AI features keep working through a transparent **offline engine**: the chat becomes a guided interview that fills resume fields; fit scoring becomes a keyword-overlap estimate; cover letters are assembled from the student's own resume facts. Results carry `fallback: true`; the UI shows an "AI offline mode" badge and an info toast. Nothing is invented. |
| Repeated provider failures | A circuit breaker skips OpenAI for 60 s (5 min after a quota error), so requests answer instantly instead of waiting for timeouts. `/api/health` reports `"ai": "live"` or `"fallback"`. |
| Stream fails mid-reply | No partial text is saved; the client restores previous state and shows a localized error. Fallback is used only if nothing was streamed yet, so texts are never spliced. |
| Resume extraction fails after a good chat reply | The reply is kept; the profile stays unchanged for manual editing. |
| One job source down | Other sources still return results; each source shows its status. |
| Transient network or 5xx on reads | The client retries idempotent reads (workspace, jobs, job details, saved jobs) up to 3 times with jittered backoff. |
| Browser offline | Offline banner and badge; a "back online" toast and automatic refetch on reconnect. |
| Render error in React | Error boundary with soft "Try again" (re-mount, session kept) and "Reload page". |
| Uncaught server exception | Logged as structured JSON (no user content); the process exits so the platform restarts it. Graceful shutdown on SIGTERM. |

Security baseline: all OpenAI and service-role calls are server-side; the browser only receives the Supabase anon key. Sessions are Supabase JWTs verified with `getUser` on every API call, and user queries run under RLS with the caller's token. Helmet CSP/HSTS, same-origin check on `/api`, 128 KB body limit, per-IP limit (180 req/min) plus shared per-user database limits (AI chat: 60/hour and 300/day; AI match and letters: 30/hour and 100/day; jobs: 60/min; PDF: 10/min). Errors return a localized safe key and request ID, never provider details.

## 1. Environment variables

See [.env.example](.env.example). Development reads `.env.local`; production reads the process environment (and an ignored `.env.production` if present). Never commit env files or paste secrets into chat.

| Variable | Required | Purpose |
| --- | --- | --- |
| SUPABASE_URL | yes | Supabase project URL |
| SUPABASE_ANON_KEY | yes | Public anon/publishable key (sent to the browser by design) |
| SUPABASE_SERVICE_ROLE_KEY | yes | Server-only; used for shared job cache, rate limits, readiness |
| APP_ORIGIN | production | Exact public origin; must be `https://` in production |
| OPENAI_API_KEY | no | Enables live AI; empty means offline AI mode |
| OPENAI_MODEL | no | Default `gpt-4o-mini` (cheap; set `gpt-4o` for stronger answers) |
| HH_USER_AGENT | no | HeadHunter app identity with a contact email (default `WorkFinder/2.0`) |
| HH_ACCESS_TOKEN | no | Enables HeadHunter search (KZ/RU) |
| JOOBLE_API_KEY | no | Enables Jooble search |
| CAREERJET_API_KEY | no | Enables Careerjet search |
| ADZUNA_APP_ID / ADZUNA_APP_KEY | no | Enables Adzuna search |
| TRUST_PROXY_HOPS | production | `1` behind Render or a load balancer, `0` locally |
| PORT / NODE_ENV | no | Defaults `3000` / `development` |

## 2. Supabase database and authentication

1. Create a Supabase project. Copy its URL and public key into the environment; enter the service secret directly into your local file or hosting secret manager.
2. Apply `supabase/migrations/202611050001_workfinder.sql` in the project's SQL Editor, or use the Supabase CLI:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. In Authentication URL Configuration, set Site URL to your application origin and add exact redirect URLs ending in `/` for local and deployed environments. Avoid unrestricted wildcard production redirects.
4. Enable email/password login, require email confirmation and a minimum password length of 8. Configure production SMTP and verify confirmation and password-reset delivery. The local CLI config does not configure the hosted project's Auth dashboard.
5. Enable Google in Supabase Auth. Configure an OAuth web client in Google Cloud; use the callback URL shown by Supabase as the Google authorized redirect URI. Enter the Google client ID and secret in Supabase, not in the frontend.
6. Verify the private `resumes` storage bucket and owner policies created by the migration.

User tables use row-level security. Backend user queries carry the verified user's token, so owner policies remain active. The service role is restricted in application code to shared job caching, shared rate limits and readiness checks. Authentication is verified with Supabase `getUser`, not merely decoded JWT claims.

```sh
pnpm dev
```

Open http://localhost:3000, register, confirm your email, and sign in. Personal resume/chat/letter/job data lives in Supabase. Browser storage holds the language preference and Supabase session; treat shared-device sessions accordingly.

## 3. Features and data flow

- Every AI feature has an offline fallback (see Reliability above); responses say which engine produced them.
- Resume chat uses OpenAI Responses streaming via SSE. On success, a second structured-output request extracts the resume; the transcript and profile commit together with optimistic version checks. A failed generation does not save a partial reply.
- Matching and cover letters use the saved profile and server-fetched job description. Match scores are advisory, not hiring probabilities. Review AI text before using it.
- Job search uses HeadHunter's API with keyword, Almaty/Astana, experience, salary/currency, work-format and employment filters, plus pagination. Search cache lasts five minutes; detail cache lasts fifteen. Apply using the original listing link; the app does not submit applications or access LinkedIn.
- PDF exports use PDFKit with the bundled, licensed Noto Sans font for Cyrillic. Modern/classic options provide different color treatments. PDFs are downloaded and stored in the user's private storage folder. Markdown and HTML exports are also available.
- RU/EN changes all static interface text immediately and persists across reloads. Existing user content, job descriptions and generated messages are preserved in their original language. New AI output uses the selected language; letters are stored separately per locale.
- Resume edits and letter edits have explicit save controls. Starting over clears the resume and conversation; it does not delete saved jobs or cover letters.

## 4. Project structure

```text
src/
  AuthContext.tsx          Supabase session, signup/login, Google, password recovery
  LanguageContext.tsx      Locale state and persistence
  LanguageSwitcher.tsx     RU/EN control
  ErrorBoundary.tsx        Recoverable UI failure screen (soft retry + reload)
  Feedback.tsx             Stacked toasts (success/info/error)
  App.tsx                  Dashboard, chat, jobs and resume editing
  components.tsx           Job cards/dialog and resume preview
  api.ts                   Authenticated fetch and SSE parsing
  resume.ts                Markdown/HTML exports
  styles.css               Responsive Tailwind styling
shared/
  schemas.ts               Strict Zod inputs and AI output schemas
  i18n.ts                  EN/RU dictionaries and plural rules
server/
  index.ts                 Development and production entry point
  app.ts                   Routes, security headers, validation and errors
  config.ts                Validated server-only environment
  database.ts              Verified identity, RLS queries, atomic rate counters
  services/llm.ts           Actual OpenAI calls and streaming
  services/fallback.ts      Offline AI engine: guided interview, keyword match, template letter
  services/resilience.ts    AI error classification and circuit breaker
  services/prompts.ts       Chat, extraction, matching and letter prompts
  services/jobs.ts          HeadHunter normalization and database caching
  services/pdf.ts           Unicode PDF generation
supabase/
  migrations/              Schema, owner policies, storage and rate-limit RPC
  tests/database/          pgTAP isolation tests
  config.toml              Local Supabase development configuration
assets/fonts/              Noto Sans and OFL license
tests/production.test.js   Validation, HTTP/SSE, exports and localization tests
.github/workflows/ci.yml   Application and database checks
Dockerfile                Non-root production container
render.yaml               Render service configuration
```

## 5. API

All routes below require a bearer session token except `/api/config`, `/api/health`, and `/api/ready`. Mutations validate inputs and reject unexpected properties. Errors expose localized safe keys and a request ID, not provider internals.

| Method /api path | Purpose |
| --- | --- |
| GET workspace | Resume, transcript, bookmarks, letters |
| POST resume | Save profile with expected version |
| POST reset | Clear resume/transcript with expected version |
| POST chat | SSE `delta`, then committed `done`, or `error` |
| POST jobs | Paginated, cached live search |
| POST job | Full listing by validated hh-ID |
| POST saved-jobs | Paginated bookmarks |
| POST bookmark | Save/remove job |
| POST match | AI compatibility assessment |
| POST cover-letter | Generate and store a letter |
| POST letter | Save edited letter |
| POST resume/pdf | Generate/download/private-store PDF |

Input contracts live in `shared/schemas.ts`. The resume has six text fields: name, contact, education, skills, projects, goals. Version conflicts return HTTP 409; reload after preserving unsaved edits. Chat history is limited to 60 messages, individual messages to 5,000 characters, and profiles to 5,000 characters per field.

The API has a pre-authentication per-process IP limit and shared database per-user limits. AI chat is limited to 60 messages/hour and 300/day per user; match and cover letters to 30/hour and 100/day. These protect application endpoints; also configure Supabase Auth quotas and gateway protections for direct service traffic. AI source text is untrusted input; structured validation and prompts reduce risk but do not guarantee factual model output.

## 6. Tests and acceptance

```sh
pnpm test
pnpm build
pnpm audit --prod --audit-level=high
```

HTTP tests use isolated test doubles. They cover auth gating, origin checks, validation, safe streamed failures, atomic updates, conflicts, PDF font/multipage output, and localization/export escaping.

Database tests require Docker and the Supabase CLI:

```sh
supabase start
supabase db reset
supabase test db
```

`db reset` is for the local disposable database. Never use it against production. CI runs these tests separately from the application tests.

Before publishing, complete these checks with real accounts and credentials:

- Sign up and confirm email; sign in/out; recover a password; sign in with Google.
- Use two accounts and verify resume, letter, bookmark and private PDF isolation.
- Stream a chat, reload, edit/save a resume, and exercise a version conflict in two tabs.
- Search real jobs with each filter, page results, save/remove a job and reload.
- Generate a match and letters in both languages; edit, save and copy them.
- Download short and multi-page RU/EN PDFs and visually check wrapping and glyphs.
- Check keyboard navigation and mobile widths; switch language during use.
- Verify limits, provider failure handling, HTTPS, redirect URLs and `/api/ready`.

Supabase setup and Google activation were verified earlier; authenticated regression testing after this refactor remains pending. The actual OpenAI probe returned `credit_balance_exhausted`; live AI verification requires funded API billing. Successful local tests do not replace these acceptance checks.

## 7. Deployment guide

### Option A: Render (recommended, single service)

1. Push the repository to GitHub **without** any `.env*` files (`.gitignore` already excludes them).
2. Supabase: apply both migrations (`supabase db push`, or paste `supabase/migrations/*.sql` into the SQL editor in order).
3. Render dashboard → **New → Blueprint** → select the repo. `render.yaml` defines the build (`pnpm install --frozen-lockfile && pnpm build`), start (`pnpm start`), health check (`/api/ready`) and Node 22.
4. Fill in the secret env vars Render prompts for: `APP_ORIGIN` (e.g. `https://workfinder.onrender.com`), the three Supabase values, and optionally `OPENAI_API_KEY`, `HH_ACCESS_TOKEN`, `JOOBLE_API_KEY`, `HH_USER_AGENT`.
5. After the first deploy, set `APP_ORIGIN` to the final URL (or your custom domain) and redeploy.
6. Supabase → Authentication → URL Configuration: Site URL = your origin; add `https://your-origin/` to the redirect URLs. Configure SMTP for real email delivery.
7. Smoke test: `curl https://your-origin/api/ready` should return `{"status":"ready","ai":"live"}` (or `"fallback"` without a working key). Then sign up, run a chat, search jobs and generate a letter.

The blueprint uses the paid `starter` plan, which has no cold starts (important during judging). The free plan works too but sleeps after inactivity; change `plan:` in `render.yaml` if cost matters more than first-load latency.

### Option B: Docker (any VM, AWS ECS/Fargate, Fly.io, Railway)

```sh
docker build -t workfinder .
docker run --rm -p 3000:3000 --env-file .env.production workfinder
```

Multi-stage, non-root image with a built-in health check. Put it behind HTTPS, set `APP_ORIGIN` to the public URL and `TRUST_PROXY_HOPS=1`. Set proxy/load-balancer idle timeouts to at least 120 s and disable response buffering so SSE streams incrementally. Inject secrets through the platform's secret manager; never bake them into the image.

### Option C: Vercel frontend with the backend elsewhere

The backend is a long-lived Express server with SSE streams of up to 110 seconds, so it does not run as Vercel serverless functions. To serve the static frontend from Vercel, deploy the backend with Option A or B, then add a `vercel.json`:

```json
{
  "buildCommand": "pnpm exec vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR-BACKEND-HOST/api/:path*" },
    { "source": "/robots.txt", "destination": "https://YOUR-BACKEND-HOST/robots.txt" },
    { "source": "/sitemap.xml", "destination": "https://YOUR-BACKEND-HOST/sitemap.xml" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Set the backend's `APP_ORIGIN` to the Vercel origin and add it to the Supabase redirect URLs. Verify streaming through the rewrite before relying on it; Option A is the tested path.

### Pre-launch checklist

- [ ] `pnpm test && pnpm build` pass; `pnpm audit --prod --audit-level=high` is clean.
- [ ] `/api/ready` returns 200 on the deployed URL, and `ai` shows the expected mode.
- [ ] Sign up → confirm email → sign in → password reset → Google sign-in (if enabled).
- [ ] Two accounts cannot see each other's resume, letters, bookmarks or PDFs.
- [ ] Chat streams incrementally through the proxy; reloading keeps the conversation.
- [ ] Unset or invalidate `OPENAI_API_KEY` once and confirm the offline-mode badge, chat, match and letter all still work.
- [ ] RU/EN switch and a 375 px phone layout look right.

## 8. Operations and launch responsibilities

- Rotate API/service keys using the hosting secret manager; restart instances after rotation. A 30-day API key must be replaced before expiry.
- Schedule daily cleanup with a trusted database job: `delete from public.job_cache where expires_at < now(); delete from public.rate_buckets where expires_at < now();`. Never expose this as a public route.
- Enable database backups, test restoration, monitor readiness/error rates and provider billing. Logs intentionally omit resume content and credentials.
- Publish a privacy notice describing Supabase/OpenAI processing and a retention policy before accepting real student data. Establish account/data deletion support, including private storage objects; no self-service account deletion interface is supplied yet.
- Review HeadHunter API usage terms and production access requirements. Job-source failures are reported per source; the app never fabricates listings.
- The initial workspace preload is subject to Supabase's configured row limit; saved-job browsing itself is paginated. For high-volume accounts, extend workspace bookmark/letter loading to pagination before advertising unlimited storage.

Reference documentation: [Supabase Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [OpenAI Responses](https://platform.openai.com/docs/api-reference/responses), [HeadHunter API](https://api.hh.ru/openapi/redoc), [Render Blueprint](https://render.com/docs/blueprint-spec).

### HeadHunter access failures

If search reports access denied, register/configure your application at https://dev.hh.ru/ and obtain an authorized token through the documented OAuth flow. Save it as HH_ACCESS_TOKEN in the server environment and restart the server. Never use a Google or Supabase key in this setting. A token does not guarantee access: verify application permissions with HeadHunter if 403 persists. The app does not bypass provider restrictions.

## Chat-first flow and job sources

**Flow.** After sign-in, a student without a ready resume lands in the assistant chat. The assistant (OpenAI, or the offline guided interview) collects, one question at a time: name → city and country → field / desired role → education → work experience → skills → projects → goals → contact. A resume is "ready for jobs" when it has name, city, role, skills and education *or* experience (`profileReadiness` in `shared/schemas.ts`). From then on the job search is pre-filled from the resume (role → keyword, city, country, local currency); "Back to my matches" restores it after manual filtering.

**Sources** (`server/services/providers.ts`, orchestrated by `server/services/jobAggregator.ts`):

| Source | Market | Key | Notes |
| --- | --- | --- | --- |
| HeadHunter (hh.kz / hh.ru / hh.uz …) | KZ, RU, UZ, KG, BY, AZ, GE, AM, TJ | `HH_ACCESS_TOKEN` | Main local source for the whole CIS. Register an app at dev.hh.ru and get an application token (`grant_type=client_credentials`). Any city is resolved through hh's public `/areas` tree. |
| Работа России (trudvsem.ru) | RU | none | Government open data; regional search for major cities. Slow (~10 s), cached 15 min. |
| Jooble | CIS + 19 more | `JOOBLE_API_KEY` | Free key via jooble.org/api/about. |
| Careerjet | KZ, RU, DE, GB, US, PL, NL | `CAREERJET_API_KEY` | v4 API, Basic auth; forwards the user's IP and User-Agent as Careerjet requires. Verify the KZ locale (`ru_KZ`) in your publisher account. |
| Adzuna | GB, US, DE, PL and ~15 more | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Used when the student searches those countries. |
| Remotive, RemoteOK, Himalayas, Jobicy, Arbeitnow | Remote | none | Only jobs open worldwide or to the student's country are shown; Russian role names are translated to English for these boards. Credit these boards when publishing (their terms ask for attribution). |

Sources without a key are skipped silently (status `notConfigured`, hidden in the UI). One failing source never blocks the others. Results are deduplicated (URL and title+company), then ranked for the student: role words in the title, skill overlap, same city/country, freshness, and — for students without work experience — entry-level roles above senior ones.

**Database migration required:** apply `supabase/migrations/202611070001_more_job_sources.sql` (SQL Editor or `supabase db push`). Until then new-source jobs are still shown and openable, but cannot be bookmarked; the jobs page shows a notice.

## Engineering upgrade — 2026-11-07

All production code in `src/`, `server/`, and `shared/` is TypeScript with `strict: true`. Tests remain JavaScript fixtures executed with tsx. Run:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Build performs strict type checking, Vite compilation and server compilation into `build-server/`. The production runtime executes compiled JavaScript and does not require tsx. Development uses `pnpm dev`. Docker copies the compiled backend and production dependencies.

### Architecture

- `src/App.tsx`: application shell and job search.
- `src/pages/`: overview, chat and resume pages.
- `src/hooks/useWorkspace.ts`: workspace state, effects and actions.
- `src/workspaceConfig.ts`: shared navigation and filter defaults.
- `src/Feedback.tsx`: theme control and localized toast feedback.
- `shared/schemas.ts`: inferred domain types, form validation and runtime response contracts.
- `server/services/providerSchemas.ts`: external job payload validation.
- `server/streaming.ts`: shared SSE lifecycle for chat and cover letters.
- `server/services/aiCache.ts`: bounded, user-scoped match result cache.

Chat and letter streams send a final completion event only after saving successfully. Clients reject incomplete streams; failed letter drafts restore previous content. Stream lifetime is bounded, with heartbeat and disconnect cancellation. Structured output validation rejects malformed data but cannot guarantee factual accuracy or eliminate prompt injection.

Chat sends the current profile and 12 recent messages; extraction uses eight recent messages. Match results are cached for ten minutes using account, model, prompt version, profile, job and locale. Concurrent identical match requests coalesce. Cache capacity is 100 results per process; personal content is not written to browser storage. Regenerated letters are not cached. Letter concurrency guards are process-local; database usage limits remain shared. Automatic SDK retries are disabled to avoid redundant paid requests.

The interface uses a single light theme (the dark theme was removed on 2026-11-07), localized toasts, optimistic bookmark updates with rollback, focus states, reduced-motion support, a skip link and dashboard lazy loading. API responses and auth forms are validated with Zod. Production metadata includes OpenGraph/Twitter, a canonical URL, robots and a sitemap containing only the public root. Personal workspace views are not indexed separately.

See [docs/AUDIT.md](docs/AUDIT.md) for verification evidence and remaining release work.
