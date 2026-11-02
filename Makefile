.PHONY: check install audit lint-docs lint typecheck test test-db build db-up db-down db-migrate db-generate

MARKDOWNLINT := npx --yes markdownlint-cli2@0.24.0

# The local Postgres from compose.yaml unless DATABASE_URL is already set (CI sets its own).
DATABASE_URL ?= postgres://hackr:hackr@localhost:5433/hackr
export DATABASE_URL
# The database tests reset their tables, so they get a database of their own (src/test/db-guard.ts).
TEST_DATABASE_URL ?= postgres://hackr:hackr@localhost:5433/hackr_test

# Everything CI runs. The database tests need Postgres: run `make db-up` first.
check: audit lint-docs lint typecheck test test-db build

install:
	pnpm install --frozen-lockfile

# Known advisories in any dependency, development tools included. Overrides that patch one sit in
# pnpm-workspace.yaml, each with the reason and when to drop it.
audit:
	pnpm audit --audit-level moderate

# Markdown style for every tracked .md file; settings in .markdownlint-cli2.jsonc.
lint-docs:
	$(MARKDOWNLINT)

lint:
	pnpm run lint

typecheck:
	pnpm run typecheck

test:
	pnpm run test

# Migrate the test database, then run the database tests against it, never DATABASE_URL.
test-db:
	DATABASE_URL=$(TEST_DATABASE_URL) DATABASE_URL_UNPOOLED= pnpm exec drizzle-kit migrate
	DATABASE_URL=$(TEST_DATABASE_URL) pnpm run test:db

build:
	pnpm run build

# Apply the migrations in drizzle/ to DATABASE_URL_UNPOOLED, or DATABASE_URL when that is unset,
# after checking the migration history is consistent.
db-migrate:
	pnpm exec drizzle-kit check
	pnpm exec drizzle-kit migrate

# Write a new migration after changing src/db/schema.ts: make db-generate NAME=add-prizes
db-generate:
	pnpm exec drizzle-kit generate --name $(NAME)

db-up:
	docker compose up --detach --wait db
	docker compose exec -T db psql -U hackr -d hackr -tAc "select 1 from pg_database where datname = 'hackr_test'" | grep -q 1 \
		|| docker compose exec -T db createdb -U hackr hackr_test

db-down:
	docker compose down
