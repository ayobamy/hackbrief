import { and, asc, eq, exists, gte, inArray, isNull, or, sql } from "drizzle-orm";

import { eventSources, events, sources } from "@/db/schema";
import type { Database } from "@/lib/db";
import type { EventFormat } from "@/lib/sources/types";

import type { EventFilters } from "./filters";

export interface ListingSource {
  slug: string;
  name: string;
  attribution: string;
  /** The page on the source that lists this event. */
  url: string;
}

export interface EventListing {
  id: string;
  name: string;
  url: string;
  organiser: string | null;
  format: EventFormat | null;
  city: string | null;
  country: string | null;
  startsOn: string | null;
  endsOn: string | null;
  prizeText: string | null;
  sources: ListingSource[];
}

const EVENT_FIELDS = {
  id: events.id,
  name: events.name,
  url: events.url,
  organiser: events.organiser,
  format: events.format,
  city: events.city,
  country: events.country,
  startsOn: events.startsOn,
  endsOn: events.endsOn,
  prizeText: events.prizeText,
};

/**
 * Upcoming hackathons that at least one source still lists, soonest first; events without dates
 * come last. "Upcoming" means not yet ended on `today` (YYYY-MM-DD): an event under way counts.
 */
export async function listUpcomingEvents(db: Database, filters: EventFilters, today: string): Promise<EventListing[]> {
  const listedBy = (sourceSlug: string | null) =>
    exists(
      db
        .select({ one: sql`1` })
        .from(eventSources)
        .innerJoin(sources, eq(sources.id, eventSources.sourceId))
        .where(
          and(
            eq(eventSources.eventId, events.id),
            eq(eventSources.listed, true),
            sourceSlug ? eq(sources.slug, sourceSlug) : undefined,
          ),
        ),
    );

  const notEnded = or(
    gte(events.endsOn, today),
    and(isNull(events.endsOn), gte(events.startsOn, today)),
    and(isNull(events.endsOn), isNull(events.startsOn)),
  );

  const rows = await db
    .select(EVENT_FIELDS)
    .from(events)
    .where(and(notEnded, listedBy(filters.source), filters.format ? eq(events.format, filters.format) : undefined))
    .orderBy(sql`${events.startsOn} asc nulls last`, asc(events.name));

  return withSources(db, rows);
}

/** One event by id, with the sources that still list it, or null. An ended event is still found. */
export async function findEvent(db: Database, id: string): Promise<EventListing | null> {
  const rows = await db.select(EVENT_FIELDS).from(events).where(eq(events.id, id));
  const [found] = await withSources(db, rows);
  return found ?? null;
}

// The sources that still list each event, each with its own page for that event.
async function withSources(db: Database, rows: Array<Omit<EventListing, "sources">>): Promise<EventListing[]> {
  if (rows.length === 0) {
    return [];
  }
  const links = await db
    .select({
      eventId: eventSources.eventId,
      slug: sources.slug,
      name: sources.name,
      attribution: sources.attribution,
      url: eventSources.sourceUrl,
    })
    .from(eventSources)
    .innerJoin(sources, eq(sources.id, eventSources.sourceId))
    .where(and(inArray(eventSources.eventId, rows.map((row) => row.id)), eq(eventSources.listed, true)))
    .orderBy(asc(sources.slug));

  return rows.map((row) => ({
    ...row,
    sources: links.filter((link) => link.eventId === row.id).map(({ slug, name, attribution, url }) => ({ slug, name, attribution, url })),
  }));
}
