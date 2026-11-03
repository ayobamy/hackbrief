import { cacheLife, cacheTag } from "next/cache";

import { chooseLinks } from "@/lib/coach/choose";
import { fillFacts, type FillAnswer } from "@/lib/coach/fill";
import { getDatabase } from "@/lib/db";
import type { EventFilters } from "@/lib/events/filters";
import { findEvent, listUpcomingEvents, type EventListing } from "@/lib/events/query";
import { guardedFetch } from "@/lib/rules/fetcher";
import { askInTurn, routersFrom } from "@/lib/model/routers";
import { cacheProfileFor, readEventPage, type Chooser, type ReadResult } from "@/lib/rules/read";

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
    ? await readEventPage(event.url, { fetch: guardedFetch, choose: chooser() })
    : { status: "skipped", reason: "unreachable" };
  if (cacheProfileFor(result) === "minutes") {
    cacheLife("minutes");
  } else {
    cacheLife("hours");
  }
  return result;
}

// A model picks the site's pages worth reading in a few seconds; reading them takes longer (decision D13).
const CHOOSE_TIMEOUT_MS = 15_000;
const FILL_TIMEOUT_MS = 45_000;

// Which of the site's pages to read besides the listed one, when a model is set up; none otherwise.
function chooser(): Chooser | undefined {
  const routers = routersFrom(process.env);
  return routers.length === 0
    ? undefined
    : (links) => chooseLinks(links, (messages, schema) => askInTurn(routers, messages, schema, { timeoutMs: CHOOSE_TIMEOUT_MS }));
}

/**
 * A language model's reading of a listed event's pages (decision D13): every fact with the sentences it
 * came from, checked against the text. Cached apart from the page reading and combined outside it, as an
 * outer cache keeps its own lifetime whatever its inner ones say: for a day after an answer, for minutes
 * after a failure, when the brief is the coach's own reading.
 */
export async function getFilled(text: string): Promise<FillAnswer | null> {
  "use cache";
  const routers = routersFrom(process.env);
  if (routers.length === 0) {
    cacheLife("hours");
    return null;
  }
  try {
    const filled = await fillFacts(text, (messages, schema) => askInTurn(routers, messages, schema, { timeoutMs: FILL_TIMEOUT_MS }));
    cacheLife("days");
    return filled;
  } catch (error) {
    console.error("No language model could read the event's pages", error instanceof Error ? error.message : error);
    cacheLife("minutes");
    return null;
  }
}
