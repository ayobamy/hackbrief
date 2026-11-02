# hackr

A hackathon finder and coach for early-career developers and students: which hackathons to join,
and how to win them, without reading ten pages of rules for each one.

Early work in progress. The plan is in [docs/START-HERE.md](docs/START-HERE.md), the outline in
[docs/mvp-outline.md](docs/mvp-outline.md) and what has been decided in
[docs/decisions.md](docs/decisions.md).

## Development

You need Node.js 24, pnpm 10 and Docker (for a local Postgres).

```bash
make install                  # dependencies from the lockfile
cp .env.example .env.local    # local settings; never committed
make db-up                    # Postgres 18 on localhost:5433
pnpm dev                      # the app on http://localhost:3000
```

`http://localhost:3000/api/health` reports whether the database answers.

```bash
make check     # everything CI runs: Markdown lint, ESLint, types, tests, build
make db-down   # stop the local Postgres
```

## Licence

[MIT](LICENSE).
