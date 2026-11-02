# hackr: notes for Claude Code

Ahmed Olawale's open-source project: a hackathon finder and coach. It tells early-career
developers and students which hackathons to join and how to win them, without reading ten pages
of rules for each one. The repository is public on GitHub: `ayobamy/hackr`.

**Read [docs/START-HERE.md](docs/START-HERE.md) first.** It has the idea, what is decided, the
blocker on data sources, the open questions and the first steps.

## Rules for every change

1. **Commits show only the author:** `Ahmed Olawale <ayobamyahmed@gmail.com>`. No
   `Co-Authored-By`, "Generated with" or any other AI attribution in commits, pull requests,
   issues or code.
2. **Every piece of work starts with a GitHub issue and its own branch, never `main`.** Name the
   branch by type: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`, `ci/<name>`,
   `test/<name>` or `refactor/<name>`, for example `feat/event-list`. Run `make check` before
   every commit.
3. **Commit, push, open a pull request, and merge only after Ahmed says yes.**
   - Commit messages follow Conventional Commits: `type(scope): short summary`, imperative and
     lower case, with the same types as branches, for example `feat(scraper): parse judging
     criteria` or `fix(api): keep the fit score between 0 and 100`. The body says what changed
     and why. Commits go out under Ahmed's git identity, signed (SSH signing is set up in his
     global git config).
   - The pull request closes its issue (`Closes #N`).
   - Once CI is green, ask with the interactive question prompt: the changes and the checks in
     its preview, and the options "Yes, merge", "No" and Other. Merge only on yes, with a merge
     commit, so the signed commits stay as they are.
   - After the merge, carry on with the next step without stopping to ask.
   - Pushes need `CLAUDE_PUSH_AUTHORIZED=yes` in the command (a hook on Ahmed's machine checks it).
4. **The repository is public.** No secrets, API keys, tokens, personal data or real user data in
   code, fixtures, issues or history. Keys live in `.env` (gitignored) or the macOS Keychain.
   Examples and fixtures use fictional people and events.
5. **Respect every data source.** Before collecting anything from a site, read its terms of
   service and robots.txt, and record what they allow in `docs/sources.md`. Collect only what
   the terms allow; identify the crawler, rate-limit it, and cache. Devpost's terms forbid
   scraping (see START-HERE), so it is not scraped without written permission.
6. **Primary sources first:** read the official docs, terms and API references before relying on
   them, and cite them in `docs/`.
7. **Verify before claiming anything is done:** `make check` passes, the tests pass, and the
   feature has been run for real. Say plainly what was not checked.
8. **Tests come with the code,** and every user-visible number (fit scores, rubric weights,
   dates) is computed in code and covered by a test.

## Project rules and session state

- Rules longer than a line live in `.claude/rules/`, listed in
  [.claude/rules/00-index.md](.claude/rules/00-index.md).
- `.claude/memory/MEMORY.md` (work in flight), `.claude/plans/` and `.claude/audits/` are
  per-session state on Ahmed's machine. They are gitignored; never link to them from tracked
  files.

## Layout

```text
src/app/                Next.js App Router: pages (/ landing, /coach, /events), route handlers
                        (api/health, api/cron/import), icon, apple-icon, opengraph-image
src/app/theme.css       colour tokens, the only place raw colours live (docs/brand.md)
src/components/         the logo, site header and footer, the landing page's brief preview
src/lib/                logic with unit tests beside it (*.test.ts); *.db.test.ts need Postgres
src/lib/coach/          the coach: parsers for pasted rules, strategy, plan (docs/coach.md)
src/lib/sources/        one adapter per allowed source (docs/sources.md), pure and tested
src/lib/import/         the daily import (/api/cron/import, vercel.json) and its auth check
src/lib/events/         the event list: query, filters, paging, grouping, formatting
src/test/db-guard.ts    keeps the database tests on a database named *_test (make test-db)
src/lib/auth.ts         the CRON_SECRET check for the import route and the health check's database part
e2e/                    Playwright end-to-end tests against the production build (make e2e), with
                        fictional hackathons e2e/seed.ts writes to the test database first
src/db/schema.ts        the Drizzle schema; migrations in drizzle/ (make db-generate, db-migrate)
docs/                   START-HERE, the MVP outline, decisions and sources
compose.yaml            Postgres 18 for local work (make db-up), host port 5433
.github/workflows/      CI: make check against a Postgres service, on pull requests and main
Makefile                check = audit, lint-docs, lint, typecheck, test, test-db, build, e2e
```

The stack and the reasons for each choice are in [docs/decisions.md](docs/decisions.md).

## Next.js

This is Next.js 16.4, with breaking changes from older versions: APIs, conventions and file
structure may differ from what you know. Read the relevant guide in `node_modules/next/dist/docs/`
before writing Next.js code, and heed deprecation notices. Cache Components is on, so any route
that reads the database or the request starts with `await connection()` or uses `use cache`.

## Environment

- `gh` is logged in as `ayobamy` (git protocol: SSH).
- `origin` is `git@github-personal:ayobamy/hackr.git`: the `github-personal` SSH alias uses
  Ahmed's personal key. Keep that form for any new remote.
- Node.js 24, pnpm 10 and Docker are installed (Markdown lint runs through
  `npx markdownlint-cli2`). `make check` needs the local Postgres: run `make db-up` first.
- A shell hook blocks starting the dev server outside tmux, and tmux is not installed. To run
  the app for a real check, build it and start it with `pnpm exec next start -p 3100` as a
  background task.
