import { defineConfig } from "drizzle-kit";

// Migrations go straight to Postgres, not through Neon's connection pooler (D8), so the direct URL
// wins when it is set; locally and in CI there is only DATABASE_URL.
// An empty value counts as unset, so `DATABASE_URL_UNPOOLED= make test-db` cannot point elsewhere.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
});
