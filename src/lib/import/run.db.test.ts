import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { eventSources, events, importResults, importRuns } from "@/db/schema";
import { getDatabase } from "@/lib/db";
import type { Source, SourceEvent } from "@/lib/sources/types";

import { runImport } from "./run";

// Needs the migrated Postgres in DATABASE_URL: `make db-up db-migrate` locally, CI does the same.
const db = getDatabase();

function listing(
  overrides: Partial<SourceEvent> & Pick<SourceEvent, "externalId" | "url">,
): SourceEvent {
  return {
    name: "Fictional Hack",
    sourceUrl: "https://source.example/",
    organiser: null,
    format: null,
    city: null,
    country: null,
    countryCode: null,
    startsOn: null,
    endsOn: null,
    prizeText: null,
    ...overrides,
  };
}

function fakeSource(slug: string, listings: () => SourceEvent[]): Source {
  return {
    slug,
    name: `Source ${slug}`,
    url: `https://${slug}.example/`,
    attribution: `Credit ${slug}`,
    load: async (fetchBody) => {
      await fetchBody(`https://${slug}.example/feed`);
      return { events: listings(), skipped: 1 };
    },
  };
}

const fetchOk = async () => "body";

describe("runImport", () => {
  beforeEach(async () => {
    await db.execute(
      sql`truncate table import_results, import_runs, event_sources, events, sources restart identity cascade`,
    );
  });

  it("saves events, records the run, and changes nothing when run again", async () => {
    const listings = [
      listing({
        externalId: "a",
        url: "https://www.lagoon.example/",
        name: "Lagoon Hacks",
        startsOn: "2027-02-06",
        format: "in_person",
      }),
      listing({
        externalId: "b",
        url: "https://orbit.example",
        name: "Orbit Online",
      }),
    ];
    const source = fakeSource("alpha", () => listings);

    const first = await runImport(db, [source], fetchOk);

    expect(first.status).toBe("succeeded");
    expect(first.results).toEqual([
      { source: "alpha", fetched: 3, saved: 2, skipped: 1, error: null },
    ]);
    const saved = await db.select().from(events).orderBy(events.name);
    expect(
      saved.map(({ name, canonicalUrl, startsOn }) => [
        name,
        canonicalUrl,
        startsOn,
      ]),
    ).toEqual([
      ["Lagoon Hacks", "lagoon.example", "2027-02-06"],
      ["Orbit Online", "orbit.example", null],
    ]);

    await runImport(db, [source], fetchOk);

    expect(await db.$count(events)).toBe(2);
    expect(await db.$count(eventSources)).toBe(2);
    const runs = await db.select().from(importRuns);
    expect(runs.map(({ status }) => status)).toEqual([
      "succeeded",
      "succeeded",
    ]);
    expect(runs.every(({ finishedAt }) => finishedAt !== null)).toBe(true);
  });

  it("merges one hackathon listed by two sources, filling gaps without blanking fields", async () => {
    const alpha = fakeSource("alpha", () => [
      listing({
        externalId: "a",
        url: "https://lagoon.example/",
        name: "Lagoon Hacks",
        city: "Lisbon",
        startsOn: "2027-02-06",
      }),
    ]);
    const beta = fakeSource("beta", () => [
      listing({
        externalId: "x9",
        url: "http://www.lagoon.example",
        name: "Lagoon Hacks 2027",
        prizeText: "$1,000",
        city: null,
      }),
    ]);

    await runImport(db, [alpha, beta], fetchOk);

    const [event] = await db.select().from(events);
    expect(await db.$count(events)).toBe(1);
    expect(event).toMatchObject({
      name: "Lagoon Hacks 2027",
      city: "Lisbon",
      startsOn: "2027-02-06",
      prizeText: "$1,000",
    });
    expect(await db.$count(eventSources)).toBe(2);
  });

  it("saves a listing's credit, updates it, and clears it when the source stops giving one", async () => {
    let credit: SourceEvent["credit"] = {
      name: "Fictional Lab",
      url: "https://lab.example/",
      updatedOn: "2026-10-19",
    };
    const source = fakeSource("alpha", () => [
      listing({ externalId: "a", url: "https://lagoon.example", credit }),
    ]);
    const creditOf = async () => {
      const [link] = await db.select().from(eventSources);
      return [link?.creditName, link?.creditUrl, link?.creditUpdatedOn];
    };

    await runImport(db, [source], fetchOk);
    expect(await creditOf()).toEqual([
      "Fictional Lab",
      "https://lab.example/",
      "2026-10-19",
    ]);

    credit = { name: "Fictional Lab", url: null, updatedOn: "2026-10-25" };
    await runImport(db, [source], fetchOk);
    expect(await creditOf()).toEqual(["Fictional Lab", null, "2026-10-25"]);

    credit = undefined;
    await runImport(db, [source], fetchOk);
    expect(await creditOf()).toEqual([null, null, null]);
  });

  it("marks listings a source stops returning as no longer listed, and keeps the event", async () => {
    let listings = [
      listing({ externalId: "a", url: "https://lagoon.example" }),
      listing({ externalId: "b", url: "https://orbit.example" }),
    ];
    const source = fakeSource("alpha", () => listings);
    await runImport(db, [source], fetchOk);

    listings = [listings[0] as SourceEvent];
    await runImport(db, [source], fetchOk);

    const links = await db
      .select()
      .from(eventSources)
      .orderBy(eventSources.externalId);
    expect(links.map(({ externalId, listed }) => [externalId, listed])).toEqual(
      [
        ["a", true],
        ["b", false],
      ],
    );
    expect(await db.$count(events)).toBe(2);
  });

  it("keeps going when one source fails, keeps its old listings, and reports the run as partial", async () => {
    const good = fakeSource("good", () => [
      listing({ externalId: "a", url: "https://lagoon.example" }),
    ]);
    const bad = fakeSource("bad", () => [
      listing({ externalId: "b", url: "https://orbit.example" }),
    ]);
    await runImport(db, [good, bad], fetchOk);

    const summary = await runImport(db, [good, bad], async (url) => {
      if (url.includes("bad")) {
        throw new Error("answered HTTP 403");
      }
      return "body";
    });

    expect(summary.status).toBe("partial");
    expect(summary.results[1]).toEqual({
      source: "bad",
      fetched: 0,
      saved: 0,
      skipped: 0,
      error: "answered HTTP 403",
    });
    const [badLink] = await db
      .select()
      .from(eventSources)
      .where(eq(eventSources.externalId, "b"));
    expect(badLink?.listed).toBe(true);
    const results = await db
      .select()
      .from(importResults)
      .where(eq(importResults.runId, summary.runId));
    expect(results.map(({ sourceSlug, error }) => [sourceSlug, error])).toEqual(
      [
        ["good", null],
        ["bad", "answered HTTP 403"],
      ],
    );
  });

  it("reports the run as failed when every source fails, and skips listings without a usable URL", async () => {
    const broken = fakeSource("broken", () => [
      listing({ externalId: "z", url: "not a url" }),
    ]);

    const failed = await runImport(db, [broken], async () => {
      throw new Error("timeout");
    });
    const skipping = await runImport(db, [broken], fetchOk);

    expect(failed.status).toBe("failed");
    expect(skipping.results[0]).toMatchObject({ saved: 0, skipped: 2 });
    expect(await db.$count(events)).toBe(0);
  });
});
