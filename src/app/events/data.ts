import { cacheLife, cacheTag } from "next/cache";

import { getDatabase } from "@/lib/db";
import type { EventFilters } from "@/lib/events/filters";
import { findEvent, listUpcomingEvents, type EventListing } from "@/lib/events/query";

/** The tag the import revalidates after each run. */
export const EVENTS_TAG = "events";

/**
 * Upcoming events, cached for hours per filter and day, so most visits are served without waking
 * the database (docs/architecture.md); the daily import refreshes the tag.
 */
export async function getEvents(filters: EventFilters, today: string): Promise<EventListing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(EVENTS_TAG);
  return listUpcomingEvents(getDatabase(), filters, today);
}

/** One event for a brief opened from the list (`/coach?event=<id>`), cached like the list itself. */
export async function getEvent(id: string): Promise<EventListing | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(EVENTS_TAG);
  return findEvent(getDatabase(), id);
}
