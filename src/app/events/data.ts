import { and, eq, lt } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { eventBriefs } from "@/db/schema";
import { buildEventBrief, CHECKED_WITHIN_MS, type BuildOutcome } from "@/lib/briefs/build";
import { briefDepsFrom } from "@/lib/briefs/deps";
import { saveBrief, storedFrom } from "@/lib/briefs/run";
import { getDatabase } from "@/lib/db";
import type { EventFilters } from "@/lib/events/filters";
import { findEvent, listUpcomingEvents, type EventListing } from "@/lib/events/query";
import { guardedFetch } from "@/lib/rules/fetcher";

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
 * An event's stored brief (#60). A stored one is kept for minutes; "nothing stored" only for seconds,
 * since a brief built on a visitor's click is saved moments later, and a server that remembered the
 * gap for minutes would build it again (#73).
 */
export async function getStoredBrief(id: string): Promise<typeof eventBriefs.$inferSelect | null> {
  "use cache";
  cacheTag(EVENTS_TAG);
  const [row] = await getDatabase().select().from(eventBriefs).where(eq(eventBriefs.eventId, id));
  if (row) {
    cacheLife("minutes");
  } else {
    cacheLife("seconds");
  }
  return row ?? null;
}

/**
 * A listed event's brief built on a visitor's click, when none is stored yet (decision D13, #60): its
 * pages read as the daily build reads them, a model's reading checked by code. Cached for a day; for
 * minutes when the site did not answer or the model failed. `READ_EVENT_PAGES=off` turns reading off
 * (the end-to-end tests use it, so they never reach the internet).
 */
export async function getBuiltBrief(id: string, today: string): Promise<BuildOutcome> {
  "use cache";
  cacheTag(EVENTS_TAG);
  if (process.env.READ_EVENT_PAGES === "off") {
    cacheLife("hours");
    return { status: "skipped", reason: "off" };
  }
  const event = await findEvent(getDatabase(), id);
  if (!event) {
    cacheLife("minutes");
    return { status: "skipped", reason: "unreachable" };
  }
  const deps = briefDepsFrom(process.env, { fetch: guardedFetch, today, now: new Date() });
  const outcome = await buildEventBrief(event, null, deps);
  const modelFailed = outcome.status === "built" && deps.fill !== undefined && outcome.textHash === null;
  const unreachable = outcome.status === "skipped" && outcome.reason === "unreachable";
  if (modelFailed || unreachable) {
    cacheLife("minutes");
  } else {
    cacheLife("days");
  }
  return outcome;
}

/** Saves a brief built on a visitor's click, so every later visitor gets it at once. */
export async function saveBuiltBrief(id: string, outcome: BuildOutcome): Promise<void> {
  await saveBrief(getDatabase(), id, outcome, new Date());
}

/**
 * Builds a stale stored brief again after the response, so the visitor sees the stored one at once.
 * Only the first of several visitors claims the rebuild, by moving its check time forward.
 */
export async function refreshBrief(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  const claimed = await db
    .update(eventBriefs)
    .set({ checkedAt: now })
    .where(and(eq(eventBriefs.eventId, id), lt(eventBriefs.checkedAt, new Date(now.getTime() - CHECKED_WITHIN_MS))))
    .returning();
  const [row] = claimed;
  const event = row ? await findEvent(db, id) : null;
  if (!row || !event) {
    return;
  }
  const deps = briefDepsFrom(process.env, { fetch: guardedFetch, today: now.toISOString().slice(0, 10), now });
  await saveBrief(db, id, await buildEventBrief(event, storedFrom(row), deps), now);
}
