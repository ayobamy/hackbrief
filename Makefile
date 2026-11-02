.PHONY: check install audit lint-docs lint typecheck test test-db build db-up db-down

MARKDOWNLINT := npx --yes markdownlint-cli2@0.24.0

# The local Postgres from compose.yaml unless DATABASE_URL is already set (CI sets its own).
DATABASE_URL ?= postgres://hackr:hackr@localhost:5433/hackr
export DATABASE_URL

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

test-db:
	pnpm run test:db

build:
	pnpm run build

db-up:
	docker compose up --detach --wait db

db-down:
	docker compose down
