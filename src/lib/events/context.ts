import type { ListingDates } from "@/lib/coach/listing";

import { FORMAT_LABELS } from "./filters";
import { creditText, formatDateRange, formatLocation } from "./format";
import type { EventListing } from "./query";

// Event ids are Postgres UUIDs; anything else never reaches the database, which would reject it.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The event a brief was opened for (`/coach?event=<id>`), or null for a missing or malformed id. */
export function parseEventId(params: Readonly<Record<string, string | string[] | undefined>>): string | null {
  const raw = Array.isArray(params.event) ? params.event[0] : params.event;
  return raw && UUID.test(raw) ? raw.toLowerCase() : null;
}

function webUrl(text: string): URL | null {
  try {
    const url = new URL(text);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

export interface EventContext {
  name: string;
  /** The event's own page, where its rules are, when it is a web page. */
  rulesUrl: string | null;
  host: string | null;
  /** "Sat, 7 Nov – Sun, 8 Nov 2026 · In person · Lagos, Nigeria", or empty. */
  details: string;
  organiser: string | null;
  listedBy: string[];
  /** The listing's dates, which fill in a brief whose rules give none (`withListingDates`). */
  dates: ListingDates;
}

/** What the coach shows about a listed event while you paste its rules. */
export function eventContext(event: EventListing): EventContext {
  const page = webUrl(event.url);
  return {
    name: event.name,
    rulesUrl: page ? event.url : null,
    host: page ? hostOf(page) : null,
    details: [
      formatDateRange(event.startsOn, event.endsOn),
      event.format ? FORMAT_LABELS[event.format] : null,
      formatLocation(event.city, event.country),
    ]
      .filter(Boolean)
      .join(" · "),
    organiser: event.organiser && event.organiser !== event.name ? event.organiser : null,
    listedBy: event.sources.map(creditText),
    dates: { startsOn: event.startsOn, endsOn: event.endsOn },
  };
}

// A scheme such as "https:" or "javascript:" at the start of what was typed.
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * The page a visitor names for a hackathon hackbrief does not list, as a web link and its host. A
 * bare "example.org/rules" is read as https; other schemes, and anything that is not a web address,
 * are refused. The link only labels the brief: nothing is fetched from it.
 */
export function pageLink(text: string): { url: string; host: string } | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const url = webUrl(SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  return url ? { url: url.href, host: hostOf(url) } : null;
}
