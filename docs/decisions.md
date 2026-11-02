# Decisions

What has been decided for hackr, when, and why. Newest decisions go at the end; a decision that
changes keeps its entry, with a note pointing at the one that replaces it.

## D1. Data route: the paste-the-rules coach first

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** build the coach from pasted rules first (option C in
  [START-HERE](START-HERE.md#the-blocker-devposts-terms-forbid-scraping)): the user pastes a
  hackathon's rules and judging text and gets the brief, the checklist and a rubric-weighted
  strategy. Then a listing from sources whose terms allow collection (option B). Email Devpost
  for written permission or a data partnership alongside (option A).
- **Why:** Devpost's [Terms of Service](https://info.devpost.com/terms) (5 December 2025, read
  2 November 2026) forbid scraping and reuse of its content without written consent. The coach
  works for any hackathon on day one and needs no source at all.
- **Consequences:** the first version stores nothing the user pastes. Each source in option B is
  read and recorded in `docs/sources.md` before anything is collected (CLAUDE.md rule 5).

## D2. Stack: one Next.js app with Postgres

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** one Next.js (TypeScript) app serves the pages and the API, with Postgres for the
  data. No separate Python backend.
- **Why:** one language, one deploy and one test runner make the first loop fastest. Parsing
  pasted rules is text work that TypeScript handles well.
- **Revisit when:** past-winner analysis needs Python's data tools; it can then run as a separate
  job writing to the same database.

## D3. Licence: MIT

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** the repository is MIT-licensed ([LICENSE](../LICENSE)).
- **Why:** short, permissive and the most familiar licence for contributors.

## D4. Hosting: Vercel with Neon Postgres

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** the app runs on Vercel; the database is Neon serverless Postgres.
- **What the plans allow** (read 2 November 2026):
  - [Vercel Hobby](https://vercel.com/docs/plans/hobby) (page updated 14 September 2026) is free,
    and "the Hobby plan restricts users to non-commercial, personal use only". Functions run for
    up to 300 seconds; 1,000,000 invocations and 4 active CPU-hours are included a month.
  - [Neon Free](https://neon.com/docs/introduction/plans): "1 GB of Postgres storage per
    project", "100 CU-hours/project/month", and compute scales to zero after 5 minutes idle,
    which cannot be disabled, so the first request after a pause is slower.
- **Consequences:** hackr stays non-commercial on Hobby. Taking money in any form (sponsored
  listings, paid tiers, ads) means moving to Vercel Pro first. The database itself is in D8.

## D5. Language model: none in the first coach; free OpenRouter models later

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** the first coach parses dates, eligibility, deliverables and rubric weights in
  tested code, with no language model and no API key. Plain-language summaries come later, in
  their own issue, through free models on [OpenRouter](https://openrouter.ai) rather than the
  Claude API.
- **What OpenRouter allows** (read 2 November 2026):
  - [Limits](https://openrouter.ai/docs/api-reference/limits): models whose ID ends in `:free`
    allow 20 requests a minute and 50 a day with fewer than 10 credits bought, or 1,000 a day
    with at least 10 credits bought.
  - [Privacy and logging](https://openrouter.ai/docs/features/privacy-and-logging): "Each
    provider on OpenRouter has its own data handling policies", with separate settings for paid
    and free models, and an account setting to stop routing to "providers that train on your
    data".
- **Consequences:**
  - The model only words what the code has already computed; every figure the user sees comes
    from code and tests (START-HERE, "What is decided").
  - 50 requests a day is too few for more than a handful of users, so summaries are cached per
    hackathon and the coach must work fully when the model is unavailable or over its limit.
  - Before any user text is sent, the OpenRouter account is set to refuse providers that train
    on data, and the coach tells users their pasted text goes to a third-party model.
  - The API key lives in `.env.local` locally and in Vercel's environment settings, never in the
    repository.

## D6. Sign-in: none in the first version

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** no accounts. The coach works without signing in. Neon Auth is switched on in the
  database (D8) so it is ready, but hackr shows no sign-in until this decision is revisited.
- **Revisit when:** saved profiles and the fit score arrive (START-HERE, step 6).

## D7. Scaffold defaults

- **Decided:** 2 November 2026, in issue #3, as defaults within D2. Ahmed can overrule any of
  them.
- **Decisions:**
  - **Package manager:** pnpm 10.24, pinned in `package.json` (`packageManager`), so CI and
    every machine use the same version.
  - **Runtime:** Node.js 24 (`.nvmrc`); Vercel and the CI runner read the same file or field.
  - **Framework:** Next.js 16.4 with the App Router, Cache Components and Partial Prefetching on,
    as `create-next-app` 16.4.3 sets them up; Tailwind CSS 4 for styles. TypeScript stays on the
    5.x line that the template installs.
  - **Database access:** Drizzle ORM 0.45 over the `postgres` driver 3.4. Drizzle keeps the
    schema in TypeScript and the queries close to SQL, with no generated client or engine
    binary. Version 4.0.0 of the driver came out on 29 October 2026; it waits until it has had
    time to settle. Neon accepts the standard Postgres protocol, so the same driver serves local
    work, CI and production; Neon's serverless driver is the fallback if connections run short.
  - **Postgres:** 18, the version Neon gave the production database (D8), in `compose.yaml` for
    local work (host port 5433, so it does not clash with a Postgres installed on 5432) and as a
    service container in CI, pinned by digest. From version 18 the official image expects its
    volume at `/var/lib/postgresql`, one level above where version 17 kept it.
  - **Tests:** Vitest 5 with two projects: `unit` (no services, 90% coverage required on
    `src/lib`) and `db` (against the Postgres in `DATABASE_URL`).
  - **Lint:** ESLint 9 with `eslint-config-next`, no warnings allowed.
  - **Dependency audit:** `pnpm audit` runs in `make check` and fails on moderate advisories or
    worse. When a fix exists only in a newer major of a transitive dependency, an override in
    `pnpm-workspace.yaml` applies it, with the advisory and when to drop the override. The first
    one: minimatch 11 for
    [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (30 October 2026),
    which ESLint's own minimatch 3 and 10 do not yet fix.
  - **Agent notes:** `next dev` writes an `AGENTS.md` by default; it is turned off
    (`agentRules: false`) because CLAUDE.md carries the same pointer to the Next.js docs bundled
    in `node_modules/next/dist/docs/`.

## D8. The Neon database

- **Decided:** 2 November 2026, by Ahmed, within D4.
- **Decision:** one Neon database for hackr, created from Vercel's Neon integration, which bills
  through Vercel; Ahmed's Neon account is the Vercel-managed kind. Choices made at creation:
  - **Region:** Washington, D.C. (`aws-us-east-1`), next to Vercel's default region for
    functions.
  - **Plan:** Free.
  - **Auth and Realtime:** both on. [Neon's
    guide](https://neon.com/docs/guides/vercel-managed-integration) (read 2 November 2026) says
    Realtime "can only" be turned on "when you create a database, not for an existing one", so it
    is on now to keep live updates possible later. Neither is used in the first version (D6).
  - **Postgres version:** 18 (18.6), Neon's default for new projects; local work and CI match it
    (D7).
  - **Vercel project:** an empty `hackr` project, connected for Production and Preview, with a
    database branch per preview deployment and none for production deployments. It deploys
    nothing until the GitHub repository is linked, in the deploy issue.
- **What Neon's guide says about a Vercel-managed account:** new databases, plan changes and
  deletion happen only in the Vercel dashboard, and deleting the database there "permanently
  removes the Neon project and all data". Branching, querying and usage work in the Neon console
  and CLI as usual.
- **Branches:** `main` holds production data. `dev` is for local work against Neon, so
  experiments never touch production. The Free plan allows 10 branches per project, and Vercel
  keeps preview deployments, and with them their branches, for up to 6 months by default, so the
  deploy issue adds cleanup when a pull request closes.
- **Local work:** the Docker Postgres stays the default. `neon env pull --file .env.neon` writes
  the `dev` branch's variables to `.env.neon`; the CLI's link to the project sits in `.neon`.
  Both are gitignored.
- **Measured** on 2 November 2026 over a link with 240 ms round trips to `aws-us-east-1`: 2.3 s
  for the first query on a new connection, 0.24 s for each query after. The health check
  therefore waits 5 s before reporting the database down.
