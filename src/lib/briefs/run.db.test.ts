import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { eventBriefs, events } from "@/db/schema";
import { NOTHING_FILLED } from "@/lib/coach/fill";
import { getDatabase } from "@/lib/db";
import { runImport } from "@/lib/import/run";
import type { ReadResult } from "@/lib/rules/read";
import type { Source, SourceEvent } from "@/lib/sources/types";

import type { BuildDeps } from "./build";
import { runBriefs } from "./run";

// Needs the migrated Postgres in DATABASE_URL: `make test-db` locally, CI does the same.
const db = getDatabase();
const TODAY = "2026-11-03";
// Fictional events, as a source lists them.
const LISTINGS: SourceEvent[] = ["harbor", "lagoon", "orbit"].map((slug) => ({
  externalId: slug,
  url: `https://${slug}.example/`,
  name: `${slug} Hacks`,
  sourceUrl: "https://source.example/",
  organiser: null,
  format: null,
  city: null,
  country: null,
  countryCode: null,
  startsOn: "2027-03-06",
  endsOn: "2027-03-07",
  prizeText: null,
}));
const SOURCE: Source = {
  slug: "alpha",
  name: "Source alpha",
  url: "https://alpha.example/",
  attribution: "Credit alpha",
  load: async () => ({ events: LISTINGS, skipped: 0 }),
};
const PAGE_TEXT = "Rules\nTeams of up to 4. Solo hackers welcome!\nAll code must be written during the event.";

function deps(read: (url: string) => ReadResult, counter: { fills: number }, overrides: Partial<BuildDeps> = {}): BuildDeps {
  return {
    read: async (url) => read(url),
    fill: async () => {
      counter.fills += 1;
      return { ...NOTHING_FILLED, rules: ["All code must be written during the event."] };
    },
    model: "anthropic/claude-haiku-5.5",
    today: TODAY,
    now: new Date("2026-11-03T05:00:00Z"),
    ...overrides,
  };
}

const readAll = (url: string): ReadResult => ({ status: "read", text: PAGE_TEXT, pages: [url] });

describe("runBriefs", () => {
  beforeEach(async () => {
    await db.execute(sql`truncate table import_results, import_runs, event_sources, events, sources restart identity cascade`);
    await runImport(db, [SOURCE], async () => "body");
  });

  it("builds every upcoming listed event's brief, stores facts and not page text, and asks no model when nothing changed", async () => {
    const counter = { fills: 0 };

    expect(await runBriefs(db, deps(readAll, counter), { budgetMs: 60_000 })).toEqual({ built: 3, unchanged: 0, skipped: 0, failed: 0, left: 0 });
    const rows = await db.select().from(eventBriefs);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ model: "anthropic/claude-haiku-5.5", failure: null });
    expect(rows[0]?.facts?.rules).toEqual(["All code must be written during the event."]);
    expect(JSON.stringify(rows)).not.toContain(PAGE_TEXT);
    // The next day: the same pages, so no model is asked.
    const nextDay = deps(readAll, counter, { today: "2026-11-04", now: new Date("2026-11-04T05:00:00Z") });
    expect(await runBriefs(db, nextDay, { budgetMs: 60_000 })).toMatchObject({ built: 0, unchanged: 3 });
    expect(counter.fills).toBe(3);
  });

  it("starts no event once its time budget is spent, leaving the rest for the next run", async () => {
    expect(await runBriefs(db, deps(readAll, { fills: 0 }), { budgetMs: 0 })).toEqual({ built: 0, unchanged: 0, skipped: 0, failed: 0, left: 3 });
  });

  it("leaves a site that refused alone for a week, and drops a brief a site no longer allows", async () => {
    const counter = { fills: 0 };
    await runBriefs(db, deps(readAll, counter), { budgetMs: 60_000 });
    const [harbor] = await db.select({ id: events.id }).from(events).where(eq(events.url, "https://harbor.example/"));
    const refusing = (url: string): ReadResult =>
      url.includes("harbor") ? { status: "skipped", reason: "robots" } : url.includes("lagoon") ? { status: "skipped", reason: "refused" } : readAll(url);

    const nextDay = deps(refusing, counter, { today: "2026-11-04", now: new Date("2026-11-04T05:00:00Z") });
    expect(await runBriefs(db, nextDay, { budgetMs: 60_000 })).toMatchObject({ skipped: 2, unchanged: 1 });
    const [dropped] = await db.select().from(eventBriefs).where(eq(eventBriefs.eventId, harbor?.id ?? ""));
    expect(dropped).toMatchObject({ facts: null, failure: "robots" });
    // Two days on, the refused and disallowed sites are not read again yet.
    const later = deps(refusing, counter, { today: "2026-11-06", now: new Date("2026-11-06T05:00:00Z") });
    expect(await runBriefs(db, later, { budgetMs: 60_000 })).toMatchObject({ skipped: 0, unchanged: 1, left: 0 });
  });

  it("records a build that throws as a failure and goes on with the others", async () => {
    const throwing = (url: string): ReadResult => {
      if (url.includes("orbit")) {
        throw new Error("The reader broke");
      }
      return readAll(url);
    };

    expect(await runBriefs(db, deps(throwing, { fills: 0 }), { budgetMs: 60_000 })).toMatchObject({ built: 2, failed: 1 });
    const failed = await db.select().from(eventBriefs).where(sql`${eventBriefs.failure} is not null`);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.failure).toContain("The reader broke");
  });
});
