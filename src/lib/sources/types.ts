export type EventFormat = "online" | "in_person" | "hybrid";

/**
 * Who to credit for one listing, where a source's licence asks for more than the source's own name:
 * OpenAgenda's Licence Ouverte names each event's licensor and the date it was last updated.
 */
export interface ListingCredit {
  name: string;
  url: string | null;
  /** YYYY-MM-DD. */
  updatedOn: string | null;
}

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
  /** Only for sources whose licence asks for a credit on each listing. */
  credit?: ListingCredit;
}

export interface ParseResult {
  events: SourceEvent[];
  /** Entries left out: malformed, ended, or from an origin hackbrief may not use. */
  skipped: number;
}

/** Fetches a URL and returns the body; an API source passes its key in `headers`. Tests pass a fake. */
export type FetchBody = (url: string, headers?: Record<string, string>) => Promise<string>;

/** A source from docs/sources.md: what to credit, and how to fetch and read its events. */
export interface Source {
  slug: string;
  name: string;
  url: string;
  /** The credit the source asks for, shown with its events. */
  attribution: string;
  /** Fetches the source through `fetchBody` (once for a feed, page by page for an API) and reads it. */
  load(fetchBody: FetchBody): Promise<ParseResult>;
}
