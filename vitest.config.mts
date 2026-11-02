import { defineConfig } from "vitest/config";

// Two projects: "unit" needs nothing running; "db" talks to the Postgres in DATABASE_URL.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      // db.ts is exercised by the "db" project, against a real Postgres.
      exclude: ["src/**/*.test.ts", "src/lib/db.ts"],
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
        test: { name: "db", include: ["src/**/*.db.test.ts"] },
      },
    ],
  },
});
