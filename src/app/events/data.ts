import { cacheLife, cacheTag } from "next/cache";

import { getDatabase } from "@/lib/db";
import type { EventFilters } from "@/lib/events/filters";
import { findEvent, listUpcomingEvents, type EventListing } from "@/lib/events/query";
import { guardedFetch } from "@/lib/rules/fetcher";
import { cacheProfileFor, readEventPage, type ReadResult } from "@/lib/rules/read";

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

/**
 * A listed event's own page, read for the coach (decision D11). Cached for hours, so an organiser's
 * site sees a few requests a day at most, but a site that did not answer only for minutes
 * (`cacheProfileFor`); `READ_EVENT_PAGES=off` turns reading off (the end-to-end tests use it, so they
 * never reach the internet).
 */
export async function getEventRules(id: string): Promise<ReadResult> {
  "use cache";
  cacheTag(EVENTS_TAG);
  if (process.env.READ_EVENT_PAGES === "off") {
    cacheLife("hours");
    return { status: "skipped", reason: "off" };
  }
  const event = await findEvent(getDatabase(), id);
  const result: ReadResult = event
    ? await readEventPage(event.url, { fetch: guardedFetch })
    : { status: "skipped", reason: "unreachable" };
  if (cacheProfileFor(result) === "minutes") {
    cacheLife("minutes");
  } else {
    cacheLife("hours");
  }
  return result;
}
