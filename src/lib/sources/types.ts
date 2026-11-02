export type EventFormat = "online" | "in_person" | "hybrid";

/** One hackathon as a source lists it, in hackbrief's shape. Dates are YYYY-MM-DD. */
export interface SourceEvent {
  /** The source's own ID for the event; with the source, it makes imports idempotent. */
  externalId: string;
  name: string;
  /** The event's own page: the organiser's site where the source gives it. */
  url: string;
  /** The page on the source that lists it, linked as attribution. */
  sourceUrl: string;
  organiser: string | null;
  format: EventFormat | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  startsOn: string | null;
  endsOn: string | null;
  prizeText: string | null;
}

export interface ParseResult {
  events: SourceEvent[];
  /** Entries left out: malformed, ended, or from an origin hackbrief may not use. */
  skipped: number;
}

/** A source from docs/sources.md: where to fetch it and how to read what comes back. */
export interface Source {
  slug: string;
  name: string;
  url: string;
  /** The credit the source asks for, shown with its events. */
  attribution: string;
  feedUrl: string;
  /** A pure function from the response body to events; it never fetches. */
  parse(body: string): ParseResult;
}
