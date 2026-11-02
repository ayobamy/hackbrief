# Implementation plan

What gets built after the coach, in order, as GitHub issues. Each milestone ends with something
that works for real; each task is small enough for one pull request or less, and says how to tell
it is done. The design is in [architecture.md](architecture.md) and [data-model.md](data-model.md);
the sources in [sources.md](sources.md). House rules for every change are in
[CLAUDE.md](../CLAUDE.md).

## Done

| Issue | What |
| --- | --- |
| #3 | Decisions, the Next.js and Postgres scaffold, `make check`, CI (PR #6) |
| #4 | The coach from pasted rules (PR #8), live at `/coach` |
| #5 | Sources, platforms, competitors, this plan, the architecture and the data model |

## M1 so far (issue #7)

Node.js pinned to `24.x`; `/api/health` no longer touches the database for public calls; a
workflow deletes a pull request's Neon preview branch when it closes (it needs the `NEON_API_KEY`
secret and `NEON_PROJECT_ID` variable in GitHub); the six stale preview branches were deleted;
Playwright end-to-end tests of the home page and the coach run in `make check` and CI.

## M1. Deploy hygiene (issue #7)

1. Pin Node.js to `24.x` in `package.json`. Done when the Vercel build log shows no Node version
   warning.
2. Delete a Neon preview branch when its pull request closes, following Neon's guide, and delete
   the one left by PR #6. Done when closing a test pull request removes its branch.
3. Cache `/api/health` for a short time or rate-limit it. Done when a test shows repeated calls in
   the window do not reach the database.
4. Confirm production deploys only from `main`. Done when the Vercel project settings say so.
5. Add an end-to-end test of the coach (Playwright: a sample, a pasted text, the focus move) to
   `make check` and CI. Done when CI runs it.

## M2 and M3 so far (issue #10)

The tables the import needs (sources, events, their links and import runs), the first migration,
adapters for Hack Club, Hackster and HackHQ, and `/api/cron/import` with a daily schedule. Still
open from M2 and M3: the remaining tables (criteria, prizes, projects), fictional seed data, the
Kaggle adapter, revalidating cached pages after a run, and batching the import's queries.

## M2. The data model (START-HERE step 4)

1. Add Drizzle Kit; write `src/db/schema.ts` as in [data-model.md](data-model.md). Done when
   `drizzle-kit generate` produces the first migration.
2. `make db-migrate` runs migrations against `DATABASE_URL_UNPOOLED`, falling back to
   `DATABASE_URL` locally; CI runs it before the database tests. Done when CI is green on a clean
   database.
3. Fixtures of fictional events, rubrics and past projects in `src/db/fixtures/`, with a seed
   command for local work. Done when `make db-seed` fills a local database and the database tests
   read it.
4. Functions that derive `status` from dates and check that an event's weights add up to 100, with
   tests. Done when `make check` passes.
5. Run the migration on the Neon `dev` branch, then `main`. Done when `/api/health` and a query of
   the tables succeed on both.

## M3. The first imports

1. A source adapter interface in `src/lib/sources/`: a pure function from a source's response to
   events. Done when a fake adapter's test passes.
2. Hack Club adapter, with the credit shown as Hack Club asks. Tests use fictional events in Hack
   Club's response format. Done when its tests pass.
3. Hackster contests adapter for the Atom feed (title, link, dates only). Done when its tests pass.
4. Kaggle adapter through the official API, with the token in Vercel's environment settings. Done
   when its tests pass and a run against the API lists competitions.
5. `/api/cron/import`, protected by `CRON_SECRET`, recording `import_runs` and `import_results`,
   and a daily schedule in `vercel.json`. Done when a production run imports events and the run
   table shows the counts.
6. Revalidate the cached event pages after each run. Done when a newly imported event appears
   without a deploy.

## M4 so far (issue #11)

`/events` lists upcoming hackathons with format and source filters, credits each source with a
link, and is cached and refreshed by the import. The database tests now run on their own
database (`hackr_test`), guarded so they can never reset the development database or Neon.

Issue #25 made the list paginated (12 to a page, Left and Right arrow keys as well as links), with
cards grouped by month, counts on the filter chips and a "starts in" label on each event. The
end-to-end tests now seed fictional hackathons into the test database (`e2e/seed.ts`) and cover
paging and filtering.

## M4. The event list and event pages

1. `/events`: upcoming events with filters for date, format, prize size, theme and source. Done
   when filters work in a real browser and the page is cached.
2. `/events/[slug]`: the brief for one event (dates, team, criteria, checklist, prizes), the source
   and its credit, and a link to the organiser's page. Done when an imported event shows all of
   them.
3. "Coach me on this one": open an event's rules in the coach. Done when it builds a brief from
   the event page.
4. Accessibility pass on both pages (keyboard, screen reader, contrast). Done when an axe scan and
   a keyboard-only run find nothing.

## M5. Profiles and the fit score

1. A profile form (skills, stack, interests, time zone, online or in person, experience) kept in
   the visitor's browser. Done when it survives a reload.
2. The fit score in `src/lib/fit/`, 0 to 100, from parts each shown to the visitor. A starting
   split to settle in the issue: stack 35, themes 25, format and time zone 20, experience 10, time
   left to prepare 10. Done when each part and the total are tested and documented.
3. A "For you" ranking of upcoming events by fit score. Done when it works for a sample profile in
   a real browser.
4. Sign-in with Neon Auth (already on in the database, D8) to save profiles, when there is demand.
   Settled in its own issue: providers, data kept, deletion.

## M6. Patterns from past winners

1. Ask NASA Space Apps for a bulk export of past winners and their projects; until then, read
   public pages slowly within robots.txt. Done when the answer is recorded in sources.md.
2. Import DrivenData winners from GitHub and NASA Space Apps winners into `projects`. Done when
   both appear with their licence.
3. Patterns per event type: common stacks, team sizes, deliverables, presence of a demo video.
   Every figure computed in code and tested. Done when an event page shows them for its type.
4. A short playbook per event type, written from the patterns and the reading list in
   [competitors.md](competitors.md). Done when it is linked from event pages.

## M7. Summaries from a language model

1. An OpenRouter client with the key in environment settings and the account set to refuse
   providers that train on data (D5). Done when a test call succeeds from Vercel.
2. Summaries generated once per event from computed facts only, stored with the event and labelled
   as written by a model. Done when a summary appears on an event page.
3. A check that rejects a summary containing any number not among the computed facts. Done when
   its tests pass.
4. Without the model (error or limit), pages show the facts alone. Done when a test forces the
   failure.

## M8. Permissions and organisers

1. Send the Devpost request ([outreach/devpost.md](outreach/devpost.md)) and record the answer.
2. Ask MLH, Devfolio, ETHGlobal, lablab.ai, Zindi, Unstop and TAIKAI in turn, starting with the
   ones with most events for hackr's users; record each answer in sources.md.
3. An organiser submission form (route D in START-HERE), reviewed by hand before publishing. This
   is the main way to cover Africa, where no single calendar exists ([platforms.md](platforms.md)).
