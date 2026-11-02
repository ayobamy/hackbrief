import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { eventSources, events, sources } from "@/db/schema";
import { getDatabase } from "@/lib/db";

import { findEvent, listUpcomingEvents } from "./query";

// Needs the migrated Postgres in DATABASE_URL: `make db-up db-migrate` locally, CI does the same.
const db = getDatabase();
const TODAY = "2026-11-02";
const NO_FILTERS = { format: null, source: null };

async function seed() {
  const [alpha, beta] = await db
    .insert(sources)
    .values([
      { slug: "alpha", name: "Alpha", url: "https://alpha.example/", attribution: "Alpha List" },
      { slug: "beta", name: "Beta", url: "https://beta.example/", attribution: "Beta Feed" },
    ])
    .returning({ id: sources.id });
  // Fictional events: ended, under way, upcoming, undated, and one no source lists any more.
  const rows = await db
    .insert(events)
    .values([
      { canonicalUrl: "ended.example", name: "Ended Hack", url: "https://ended.example", startsOn: "2026-10-01", endsOn: "2026-10-02" },
      { canonicalUrl: "now.example", name: "Under Way", url: "https://now.example", startsOn: "2026-11-01", endsOn: "2026-11-03", format: "online" },
      { canonicalUrl: "soon.example", name: "Soon Hack", url: "https://soon.example", startsOn: "2026-11-20", format: "in_person", city: "Lisbon", country: "Portugal" },
      { canonicalUrl: "undated.example", name: "Undated Contest", url: "https://undated.example", format: "online" },
      { canonicalUrl: "dropped.example", name: "Dropped Hack", url: "https://dropped.example", startsOn: "2026-12-01" },
    ])
    .returning({ id: events.id, name: events.name });
  const id = (name: string) => rows.find((row) => row.name === name)?.id ?? "";
  await db.insert(eventSources).values([
    { eventId: id("Ended Hack"), sourceId: alpha?.id ?? 0, externalId: "1", sourceUrl: "https://alpha.example/1" },
    { eventId: id("Under Way"), sourceId: alpha?.id ?? 0, externalId: "2", sourceUrl: "https://alpha.example/2" },
    { eventId: id("Soon Hack"), sourceId: alpha?.id ?? 0, externalId: "3", sourceUrl: "https://alpha.example/3" },
    {
      eventId: id("Soon Hack"),
      sourceId: beta?.id ?? 0,
      externalId: "b3",
      sourceUrl: "https://beta.example/3",
      creditName: "Fictional Lab",
      creditUrl: "https://lab.example/",
      creditUpdatedOn: "2026-10-19",
    },
    { eventId: id("Undated Contest"), sourceId: beta?.id ?? 0, externalId: "b4", sourceUrl: "https://beta.example/4" },
    { eventId: id("Dropped Hack"), sourceId: beta?.id ?? 0, externalId: "b5", sourceUrl: "https://beta.example/5", listed: false },
  ]);
}

describe("listUpcomingEvents", () => {
  beforeEach(async () => {
    await db.execute(sql`truncate table import_results, import_runs, event_sources, events, sources restart identity cascade`);
    await seed();
  });

  it("lists events not yet ended and still listed, soonest first, undated last", async () => {
    const listed = await listUpcomingEvents(db, NO_FILTERS, TODAY);

    expect(listed.map(({ name }) => name)).toEqual(["Under Way", "Soon Hack", "Undated Contest"]);
  });

  it("attaches every source that lists an event, with its own link and any listing credit", async () => {
    const [, soon] = await listUpcomingEvents(db, NO_FILTERS, TODAY);

    expect(soon?.sources).toEqual([
      { slug: "alpha", name: "Alpha", attribution: "Alpha List", url: "https://alpha.example/3", credit: null },
      {
        slug: "beta",
        name: "Beta",
        attribution: "Beta Feed",
        url: "https://beta.example/3",
        credit: { name: "Fictional Lab", url: "https://lab.example/", updatedOn: "2026-10-19" },
      },
    ]);
    expect(soon).toMatchObject({ city: "Lisbon", country: "Portugal", format: "in_person", startsOn: "2026-11-20" });
  });

  it("filters by format and by source", async () => {
    const online = await listUpcomingEvents(db, { format: "online", source: null }, TODAY);
    const fromBeta = await listUpcomingEvents(db, { format: null, source: "beta" }, TODAY);
    const both = await listUpcomingEvents(db, { format: "online", source: "alpha" }, TODAY);

    expect(online.map(({ name }) => name)).toEqual(["Under Way", "Undated Contest"]);
    expect(fromBeta.map(({ name }) => name)).toEqual(["Soon Hack", "Undated Contest"]);
    expect(both.map(({ name }) => name)).toEqual(["Under Way"]);
  });

  it("returns an empty list when nothing matches", async () => {
    expect(await listUpcomingEvents(db, { format: "hybrid", source: null }, TODAY)).toEqual([]);
  });
});

describe("findEvent", () => {
  beforeEach(async () => {
    await db.execute(sql`truncate table import_results, import_runs, event_sources, events, sources restart identity cascade`);
    await seed();
  });

  async function idOf(name: string): Promise<string> {
    const [row] = await db.select({ id: events.id }).from(events).where(sql`${events.name} = ${name}`);
    return row?.id ?? "";
  }

  it("finds one event with the sources that still list it", async () => {
    const found = await findEvent(db, await idOf("Soon Hack"));

    expect(found).toMatchObject({ name: "Soon Hack", url: "https://soon.example", city: "Lisbon", format: "in_person" });
    expect(found?.sources.map(({ slug }) => slug)).toEqual(["alpha", "beta"]);
  });

  it("still finds an event that has ended, for a brief opened from an old link", async () => {
    expect((await findEvent(db, await idOf("Ended Hack")))?.name).toBe("Ended Hack");
  });

  it("finds nothing for an id that is not in the table", async () => {
    expect(await findEvent(db, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});
