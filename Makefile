.PHONY: check lint-docs

MARKDOWNLINT := npx --yes markdownlint-cli2@0.24.0

# Everything CI runs. Linters and tests for the code join this target as the code arrives.
check: lint-docs

# Markdown style for every tracked .md file; settings in .markdownlint-cli2.jsonc.
lint-docs:
	$(MARKDOWNLINT)
