import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// End-to-end tests of the user journeys: the home page, the coach and the hackathon list. They run
// against the production build (`make build` first), the way visitors get it, with fictional
// hackathons that e2e/seed.ts writes to the test database first (make e2e points at it).
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/seed.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    // The public health check never reads the database. Playwright probes the server before
    // e2e/seed.ts runs, and probing a page would cache the event list from before the seed.
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
