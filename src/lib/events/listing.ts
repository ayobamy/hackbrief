import type { EventFormat } from "@/lib/sources/types";

import { FORMAT_LABELS, type EventFilters } from "./filters";
import type { EventListing } from "./query";

/** Hackathons per page: twelve fills whole rows of one, two or three cards. */
export const PAGE_SIZE = 12;

// Page numbers past this are never real for a list this size; longer digit runs are not read.
const MAX_PAGE_DIGITS = 4;

/** The page asked for in the query string; anything but a plain positive whole number is page 1. */
export function parsePage(params: Readonly<Record<string, string | string[] | undefined>>): number {
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  if (!raw || !new RegExp(`^\\d{1,${MAX_PAGE_DIGITS}}$`).test(raw)) {
    return 1;
  }
  return Math.max(1, Number(raw));
}

export interface Page<T> {
  items: T[];
  /** The page shown, after a number past the end is moved back to the last page. */
  page: number;
  pageCount: number;
  total: number;
  /** The positions, counting from 1, of the first and last items shown; 0 when nothing matches. */
  first: number;
  last: number;
}

/** One page of a list. A page past the end shows the last page; an empty list has one empty page. */
export function paginate<T>(items: readonly T[], requested: number, size: number = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, requested), pageCount);
  const start = (page - 1) * size;
  const shown = items.slice(start, start + size);
  return {
    items: shown,
    page,
    pageCount,
    total: items.length,
    first: shown.length > 0 ? start + 1 : 0,
    last: start + shown.length,
  };
}

// At most this many slots in the pager, counting the gaps.
const SLOTS = 7;

/**
 * The page numbers a pager shows, with null for a gap: every page when they fit in seven slots,
 * otherwise the first and last pages, the current one with its neighbours, and gaps between.
 */
export function pageNumbers(current: number, count: number): Array<number | null> {
  const range = (from: number, to: number) => [...Array(to - from + 1).keys()].map((offset) => from + offset);
  if (count <= SLOTS) {
    return range(1, count);
  }
  if (current <= 4) {
    return [...range(1, 5), null, count];
  }
  if (current >= count - 3) {
    return [1, null, ...range(count - 4, count)];
  }
  return [1, null, current - 1, current, current + 1, null, count];
}

/** The events that match every filter. A source filter keeps events that source still lists. */
export function applyFilters(events: readonly EventListing[], filters: EventFilters): EventListing[] {
  return events.filter(
    (event) =>
      (!filters.format || event.format === filters.format) &&
      (!filters.source || event.sources.some((source) => source.slug === filters.source)),
  );
}

export interface Facets {
  /** Events in the chosen source, whatever their format: the count beside "All" formats. */
  formatTotal: number;
  byFormat: Record<EventFormat, number>;
  /** Events in the chosen format, whatever their source: the count beside "All" sources. */
  sourceTotal: number;
  bySource: Record<string, number>;
}

/**
 * How many events each filter chip would show: formats are counted within the chosen source, and
 * sources within the chosen format, so each count is what clicking that chip gives.
 */
export function facetCounts(events: readonly EventListing[], filters: EventFilters): Facets {
  const inSource = applyFilters(events, { format: null, source: filters.source });
  const inFormat = applyFilters(events, { format: filters.format, source: null });
  const byFormat = Object.fromEntries(
    (Object.keys(FORMAT_LABELS) as EventFormat[]).map((format) => [
      format,
      inSource.filter((event) => event.format === format).length,
    ]),
  ) as Record<EventFormat, number>;
  const bySource: Record<string, number> = {};
  for (const event of inFormat) {
    for (const source of event.sources) {
      bySource[source.slug] = (bySource[source.slug] ?? 0) + 1;
    }
  }
  return { formatTotal: inSource.length, byFormat, sourceTotal: inFormat.length, bySource };
}

export interface Timing {
  /** live: under way or starting today; soon: within a week; later; tba: no start date. */
  kind: "live" | "soon" | "later" | "tba";
  label: string;
}

const DAY_MS = 86_400_000;
const SOON_DAYS = 7;
const WEEKS_FROM_DAYS = 14;
const MONTHS_FROM_DAYS = 60;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** When an event starts, said plainly from `today` (YYYY-MM-DD): "Happening now", "In 5 days". */
export function timing(startsOn: string | null, endsOn: string | null, today: string): Timing {
  if (!startsOn) {
    return { kind: "tba", label: endsOn ? "Start date not given" : "Dates to be announced" };
  }
  const days = daysBetween(today, startsOn);
  if (days === 0) {
    return { kind: "live", label: "Starts today" };
  }
  if (days < 0) {
    return { kind: "live", label: "Happening now" };
  }
  if (days === 1) {
    return { kind: "soon", label: "Starts tomorrow" };
  }
  if (days < WEEKS_FROM_DAYS) {
    return { kind: days <= SOON_DAYS ? "soon" : "later", label: `In ${days} days` };
  }
  if (days < MONTHS_FROM_DAYS) {
    return { kind: "later", label: `In ${Math.floor(days / 7)} weeks` };
  }
  return { kind: "later", label: `In ${Math.floor(days / 30)} months` };
}

export interface MonthGroup {
  key: string;
  label: string;
  events: EventListing[];
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Events under headings: those under way or starting today first, then one heading per starting month in the order
 * given, then those without a start date. The list arrives sorted by start date.
 */
export function groupByMonth(events: readonly EventListing[], today: string): MonthGroup[] {
  const now: MonthGroup = { key: "now", label: "Happening now", events: [] };
  const undated: MonthGroup = { key: "tba", label: "Dates to be announced", events: [] };
  const months = new Map<string, MonthGroup>();
  for (const event of events) {
    if (!event.startsOn) {
      undated.events.push(event);
    } else if (event.startsOn <= today) {
      now.events.push(event);
    } else {
      const key = event.startsOn.slice(0, 7);
      const group = months.get(key) ?? {
        key,
        label: MONTH.format(new Date(`${event.startsOn}T00:00:00Z`)),
        events: [],
      };
      group.events.push(event);
      months.set(key, group);
    }
  }
  return [now, ...months.values(), undated].filter((group) => group.events.length > 0);
}
