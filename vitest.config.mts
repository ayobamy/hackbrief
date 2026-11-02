import { defineConfig } from "vitest/config";

// Two projects: "unit" needs nothing running; "db" talks to the Postgres in DATABASE_URL.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      // These talk to Postgres and are exercised by the "db" project instead.
      exclude: ["src/**/*.test.ts", "src/lib/db.ts", "src/lib/import/run.ts", "src/lib/events/query.ts", "src/lib/rules/fetcher.ts"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "src/**/*.db.test.ts"],
        },
      },
      {
        extends: true,
        // One file at a time: the database tests share one Postgres and reset its tables.
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts"],
          fileParallelism: false,
          setupFiles: ["src/test/db-guard.ts"],
        },
      },
    ],
  },
});
