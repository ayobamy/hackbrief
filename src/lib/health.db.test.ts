import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDatabase } from "./db";
import { checkDatabase } from "./health";

// Needs the Postgres in DATABASE_URL: `make db-up` locally, a service container in CI.
describe("checkDatabase against Postgres", () => {
  it("reports ok for the database in DATABASE_URL", async () => {
    const database = getDatabase();

    const health = await checkDatabase(() => database.execute(sql`select 1`));

    expect(health.status).toBe("ok");
  });

  it("reuses one client per process", () => {
    expect(getDatabase()).toBe(getDatabase());
  });
});
