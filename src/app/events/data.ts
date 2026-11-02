import { cacheLife, cacheTag } from "next/cache";

import { getDatabase } from "@/lib/db";
import type { EventFilters } from "@/lib/events/filters";
import { listUpcomingEvents, type EventListing } from "@/lib/events/query";

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
