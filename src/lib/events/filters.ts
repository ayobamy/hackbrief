import type { EventFormat } from "@/lib/sources/types";

export interface EventFilters {
  format: EventFormat | null;
  source: string | null;
}

export const FORMAT_LABELS: Readonly<Record<EventFormat, string>> = {
  online: "Online",
  in_person: "In person",
  hybrid: "Hybrid",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Filters from the page's query string. Only known values are accepted, so a hand-edited URL can
 * never reach the database as anything but "no filter".
 */
export function parseFilters(
  params: Readonly<Record<string, string | string[] | undefined>>,
  sourceSlugs: readonly string[],
): EventFilters {
  const format = first(params.format);
  const source = first(params.source);
  return {
    // Own keys only: `in` would also accept inherited names such as "toString".
    format:
      format && Object.hasOwn(FORMAT_LABELS, format)
        ? (format as EventFormat)
        : null,
    source: source && sourceSlugs.includes(source) ? source : null,
  };
}

/**
 * The query string for a set of filters and a page, without empty values or page 1:
 * "?format=online&page=2".
 */
export function filterQuery(filters: EventFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.format) {
    params.set("format", filters.format);
  }
  if (filters.source) {
    params.set("source", filters.source);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
