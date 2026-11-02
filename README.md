# hackr

A hackathon finder and coach for early-career developers and students: which hackathons to join,
and how to win them, without reading ten pages of rules for each one.

Early work in progress. The first feature is the coach: paste a hackathon's rules at `/coach` and
get the deadline, a submission checklist and a strategy weighted by the judging criteria
([docs/coach.md](docs/coach.md)). The plan is in [docs/START-HERE.md](docs/START-HERE.md), the
outline in
[docs/mvp-outline.md](docs/mvp-outline.md) and what has been decided in
[docs/decisions.md](docs/decisions.md).

## Docs

- [START-HERE](docs/START-HERE.md): the idea, what is decided and the first steps
- [decisions.md](docs/decisions.md): what was decided and why
- [coach.md](docs/coach.md): how the coach reads rules and computes each number
- [architecture.md](docs/architecture.md) and [data-model.md](docs/data-model.md): how hackr is built
- [implementation-plan.md](docs/implementation-plan.md): what comes next
- [sources.md](docs/sources.md), [platforms.md](docs/platforms.md) and
  [competitors.md](docs/competitors.md): where hackathon data may come from, and who else is
  in this space

## Development

You need Node.js 24, pnpm 10 and Docker (for a local Postgres).

```bash
make install                  # dependencies from the lockfile
cp .env.example .env.local    # local settings; never committed
make db-up                    # Postgres 18 on localhost:5433, with hackr and hackr_test
make db-migrate               # create the tables in hackr (the tests use hackr_test)
pnpm dev                      # the app on http://localhost:3000
```

`http://localhost:3000/api/health` reports that the app is up; sent with
`Authorization: Bearer <CRON_SECRET>`, it also checks the database. Run `make e2e-install` once
to download the Chromium that the end-to-end tests use.

```bash
make check     # everything CI runs: Markdown lint, ESLint, types, tests, build
make db-down   # stop the local Postgres
```

## Licence

[MIT](LICENSE).
