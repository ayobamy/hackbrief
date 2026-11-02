// Fictional hackathons for the end-to-end tests, written before they run. Like the database tests,
// it resets tables, so it refuses any database whose name does not end in "_test".
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { eventSources, events, importResults, importRuns, sources } from "../src/db/schema";
import { SOURCES } from "../src/lib/sources";

/** How many fictional hackathons the list starts with: three pages of twelve, the last of two. */
export const SEEDED = 26;

const FORMATS = ["online", "in_person", "hybrid"] as const;
const DAY_MS = 86_400_000;

function daysFromToday(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

function number(index: number): string {
  return String(index).padStart(2, "0");
}

export default async function seed() {
  const url = process.env.DATABASE_URL ?? "";
  const databaseName = url ? new URL(url).pathname.replace(/^\//, "") : "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(`The end-to-end seed resets tables, so it needs a database whose name ends in "_test"; got "${databaseName || "none"}".`);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle({ client });
  try {
    await db.delete(importResults);
    await db.delete(importRuns);
    await db.delete(eventSources);
    await db.delete(events);
    await db.delete(sources);

    const sourceRows = await db
      .insert(sources)
      .values(SOURCES.map(({ slug, name, url: home, attribution }) => ({ slug, name, url: home, attribution })))
      .returning({ id: sources.id });

    // One under way, twenty-four on the days ahead, and one with no dates yet.
    const listings = [...Array(SEEDED).keys()].map((index) => {
      const undated = index === SEEDED - 1;
      const startsOn = undated ? null : index === 0 ? daysFromToday(-2) : daysFromToday(index * 4);
      return {
        canonicalUrl: `example.org/fictional-hack-${number(index)}`,
        name: `Fictional Hack ${number(index)}`,
        url: `https://example.org/fictional-hack-${number(index)}`,
        format: FORMATS[index % FORMATS.length],
        city: index % FORMATS.length === 0 ? null : "Lagos",
        country: index % FORMATS.length === 0 ? null : "Nigeria",
        startsOn,
        endsOn: startsOn && index === 0 ? daysFromToday(3) : startsOn,
      };
    });
    const eventRows = await db.insert(events).values(listings).returning({ id: events.id });

    await db.insert(eventSources).values(
      eventRows.map((row, index) => ({
        eventId: row.id,
        // Sources rotate every three events, so no source lines up with one format.
        sourceId: sourceRows[Math.floor(index / FORMATS.length) % sourceRows.length]?.id ?? 0,
        externalId: `fictional-${number(index)}`,
        sourceUrl: `https://example.org/listed/${number(index)}`,
      })),
    );
  } finally {
    await client.end();
  }
}
