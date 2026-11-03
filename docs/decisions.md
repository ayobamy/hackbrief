# Decisions

What has been decided for hackbrief, when, and why. Newest decisions go at the end; a decision that
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
- **Consequences:** hackbrief stays non-commercial on Hobby. Taking money in any form (sponsored
  listings, paid tiers, ads) means moving to Vercel Pro first. The database itself is in D8.

## D5. Language model: none in the first coach; free OpenRouter models later

- **Decided:** 2 November 2026, by Ahmed. Changed on 3 November 2026 by D13, under which a paid
  model also writes the coaching, from facts code has checked.
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
  database (D8) so it is ready, but hackbrief shows no sign-in until this decision is revisited.
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
- **Decision:** one Neon database for hackbrief, created from Vercel's Neon integration, which bills
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
  - **Vercel project:** `hackbrief`, connected to the database for Production and Preview, with a
    database branch per preview deployment and none for production deployments. Vercel's GitHub
    app already deploys this repository: pull request #6 got a public deployment at
    <https://hackr-mauve.vercel.app> on 2 November 2026, whose `/api/health` reached the database
    in 2 ms. No Neon branch appeared for that preview, so it used `main`; the deploy issue checks
    why preview branching did not run.
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
- **Risk, and its fix:** a public `/api/health` that queried the database on every request would
  let anything calling it more often than every 5 minutes keep the compute awake; 0.25 CU for a
  whole month is about 180 CU-hours, over the Free plan's 100. Since issue #7, public calls get
  "app is up" without touching the database, and only requests carrying `CRON_SECRET` check it.
- **Preview branches:** a workflow deletes `preview/<git branch>` when its pull request closes
  (`.github/workflows/neon-preview-cleanup.yml`), once the repository has the `NEON_API_KEY`
  secret and the `NEON_PROJECT_ID` variable. The six left by earlier pull requests were deleted
  by hand on 2 November 2026.

## D9. The name: hackbrief

- **Decided:** 2 November 2026, by Ahmed.
- **Decision:** the project, the site and the repository are called **hackbrief**; until then they
  were called hackr. The "h" mark stays.
- **Why:** "hackr" is already the name of [Hackr.io](https://hackr.io), a site of programming
  courses for students and developers, the same audience; and "HackRx", the first alternative
  considered, is Bajaj Finserv's own hackathon. Checked on 2 November 2026: no product found named
  hackbrief, `hackbrief.dev` and `hackbrief.app` were unregistered, `hackbrief.com` was parked for
  sale, and one GitHub repository used the name. hackbrief also says what the coach does: it turns
  a hackathon's rules into a brief.
- **What changed:** the GitHub repository (`ayobamy/hackbrief`; GitHub redirects the old address)
  and the Vercel project, renamed by Ahmed; the site's name and text, the docs, the package name
  and the crawler's user agent (issue #27).
- **Kept:** the local database names and Postgres user (`hackr`, `hackr_test`), which no visitor
  sees and which would make everyone rebuild their database.
- **The address:** Ahmed bought **hackbrief.dev** the same day and attached it in Vercel (issue
  #39). Vercel names the shortest custom domain as the production one, so `metadataBase` in
  `src/app/layout.tsx` (from `VERCEL_PROJECT_PRODUCTION_URL`) points share cards at it without a
  code change; it did from the first deploy after the domain was added.
  `hackr-mauve.vercel.app` still answers.

## D10. Briefs from listings are guided, not fetched

- **Decided:** 2 November 2026, by Ahmed. Changed the same day by D11, which reads the event's page.
- **Decision:** "Build my brief" on a listing opens the coach for that event with its facts filled
  in and a link to its own page; the visitor copies the rules in. hackbrief does not fetch
  organisers' pages or links that visitors type.
- **Why:** all 49 organiser pages listed that day were fetched once, the way the feature would
  (robots.txt checked first, hackbrief's user agent), and run through the coach. It found a
  deadline on 4, judging criteria on 2 (after following same-site rules pages too) and a team size
  on 16. 7 pages were drawn by JavaScript, and 12 keep their rules on Devpost, which hackbrief may
  not read (`docs/sources.md`). Fetching would hand most visitors an empty brief, and it would mean
  reading sites whose terms nobody checked first, plus guarding a server that fetches any address
  a visitor types.
- **Revisit when:** Devpost grants permission (`docs/outreach/devpost.md`), or a source offers
  rules in a form hackbrief may read.

## D11. Read an event's own page when a visitor asks

- **Decided:** 2 November 2026, by Ahmed. Changes D10. Changed on 4 November 2026 by D13 (#60):
  pages are read once a day ahead of visitors, and on a visitor's click only when no brief is
  stored.
- **Decision:** when a visitor clicks "Build my brief" on a listing, hackbrief reads that
  hackathon's own page (and up to two same-site rules pages) and builds the brief at once when it
  finds anything; otherwise the guided paste of D10 still applies. The bounds are in
  [sources.md](sources.md#reading-an-events-own-page): listed events only, restricted platforms and
  feed-only sources never read, robots.txt obeyed, public addresses only, time and size limits, and
  a cache of hours instead of storage.
- **Why:** the copy-and-paste step is the slowest part of the coach, and Ahmed wants the brief at
  once wherever the page allows it. The probe behind D10 still sets expectations: most organisers'
  homepages hold little of their rules, so many briefs will be partial or fall back to pasting.
  Checked on 2 November 2026: itch.io's Game Off page gives the deadline, and one listed site gives
  a full brief from three pages.
- **What it does not change:** links that visitors type are still never fetched, and Devpost is
  still not read without its permission.

## D12. A language model may point to facts on an organiser's page

- **Decided:** 3 November 2026, by Ahmed. Goes beyond D5, which allowed a model only to word
  computed summaries. Changed the same day by D13, under which the model fills the whole brief,
  with proof, rather than only what the parser missed.
- **Decision:** when "Build my brief" (D11) reads a listed hackathon's own page and the coach's
  parser leaves the deadline, team size, eligibility or checklist empty, a free model is asked to
  copy, word for word, the sentences on the page that give them. Code keeps a quote only when it
  is on the page, reads the dates, sizes and amounts from it with the coach's own parsers, and
  fills only what the parser left empty (`src/lib/coach/locate.ts`). The brief and the coach say
  which facts a model pointed to. Rules a visitor pastes are never sent to a model.
- **Routers:** [OpenRouter](https://openrouter.ai) first, with every request limited to providers
  that do not collect data (`provider.data_collection: "deny"`, from
  [provider routing](https://openrouter.ai/docs/features/provider-routing)) and to providers that
  support the JSON schema; then [Requesty](https://docs.requesty.ai/quickstart.md), which "does
  not train on your requests or responses", with a model or a fallback policy of free models
  whose providers do not train on data. Each is used only when its key (and Requesty's model) is
  set (`src/lib/model/routers.ts`).
- **Why:** the parser misses facts organisers phrase in their own way, and a model finds those
  sentences far better than it reports what they say. Letting it point, not answer, keeps every
  figure computed by tested code (START-HERE, "What is decided"), and a quote that is not on the
  page, from a model's mistake or from text planted in a page, adds nothing.
- **Limits:** free models allow 50 requests a day on OpenRouter and 200 on Requesty. A page's
  answer is cached for a day and asked for only when facts are missing, about one request per
  listed event a day; after a failure it is retried within minutes, and meanwhile the brief is
  the parser's alone.
- **What it does not change:** the advice, the weights and the plan still come only from code; no
  model writes text that a visitor reads as hackbrief's own.

## D13. The model builds each brief, and code keeps the proof

- **Decided:** 3 November 2026, by Ahmed (#58). Changes D5 and D12.
- **Decision:** a language model reads a listed event's pages and fills the whole brief: key dates,
  team size, who can enter, what to hand in, judging criteria, tracks, prizes and rules that change
  how to compete. Every fact carries the sentence, or two, it came from. Code keeps a fact only when
  each sentence is on its page word for word and code reads the same value from it; dates, times,
  sizes, amounts and weights are still computed by tested code (#59). The model then writes the
  coaching from the checked facts alone, never from page text, and code still sets the weights,
  hours and dates in the plan (#61). Rules a visitor pastes are never sent to a model.
- **How it runs:** the daily import builds each listed event's brief and stores it (#60): code
  reads the event's page under D11, the model picks up to three more of the site's own pages
  likely to hold rules, FAQ, schedule, judging or prizes, code fetches them under the same rules,
  then the model extracts and code checks. Pages are read daily and the model is asked again only
  when their text changed. A run stops starting new events before the function's time limit (300 s
  by default, [duration limits](https://vercel.com/docs/functions/configuring-functions/duration))
  and carries on the next day. A listed event opens on its brief at `/events/<id>` (#62).
- **Model and privacy:** a paid model through OpenRouter, set by `OPENROUTER_MODEL`. On eleven
  listed events' pages `anthropic/claude-haiku-5.5` found whole, correct sentences on every page,
  where `meta-llama/llama-3.3-70b-instruct` returned fragments,
  `mistralai/mistral-small-3.2-24b-instruct` quoted headers as deadlines and `openai/gpt-oss-120b`
  timed out on four of nine. Every request sets `provider.zdr: true`, so only endpoints that keep
  no data serve it, as well as `data_collection: "deny"`
  ([provider routing](https://openrouter.ai/docs/features/provider-routing)).
- **Why:** organisers phrase facts in endless ways, and a brief built from the parser and a few
  quoted gaps reads like a form. A model reads pages far better than patterns do, but can be
  wrong about what a sentence says; tying every fact to a sentence that code has checked keeps the
  numbers visitors rely on computed and tested (house rule 8), and lets them see where each came
  from. Building in advance means visitors never wait for a model, and slower, better models fit.
- **Cost:** about $0.002 of model use per page read, spent only when an event's pages change,
  from OpenRouter credits bought for hackbrief and capped by a spending limit on its key.
- **What it does not change:** the coach still works with no model: without a key, or when the
  model fails, the brief is the parser's, as before. Pasted rules stay on the visitor's side.
