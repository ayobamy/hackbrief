import Link from "next/link";
import type { ReactNode } from "react";

import { filterQuery, FORMAT_LABELS, parseFilters, type EventFilters } from "@/lib/events/filters";
import { formatDateRange, formatLocation } from "@/lib/events/format";
import type { EventListing } from "@/lib/events/query";
import { SOURCES } from "@/lib/sources";
import type { EventFormat } from "@/lib/sources/types";

import { getEvents } from "./data";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

// Event and source URLs are checked when they are imported; links are drawn only for http(s) as well.
function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm ${FOCUS_RING} ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}

function Filters({ current }: { current: EventFilters }) {
  const formats: Array<EventFormat | null> = [null, "online", "in_person", "hybrid"];
  const sources: Array<string | null> = [null, ...SOURCES.map((source) => source.slug)];
  return (
    <nav aria-label="Filter hackathons" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 text-sm text-zinc-600 dark:text-zinc-400">Format</span>
        {formats.map((format) => (
          <Chip key={format ?? "all"} href={`/events${filterQuery({ ...current, format })}`} active={current.format === format}>
            {format ? FORMAT_LABELS[format] : "All"}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 text-sm text-zinc-600 dark:text-zinc-400">Source</span>
        {sources.map((slug) => (
          <Chip key={slug ?? "all"} href={`/events${filterQuery({ ...current, source: slug })}`} active={current.source === slug}>
            {slug ? (SOURCES.find((source) => source.slug === slug)?.name ?? slug) : "All"}
          </Chip>
        ))}
      </div>
    </nav>
  );
}

function EventCard({ event }: { event: EventListing }) {
  const dates = formatDateRange(event.startsOn, event.endsOn) ?? "Dates on the event's page";
  const details = [dates, event.format ? FORMAT_LABELS[event.format] : null, formatLocation(event.city, event.country)]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex flex-col gap-1 border-t border-zinc-200 py-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">
        {isWebUrl(event.url) ? (
          <a href={event.url} className={`underline-offset-4 hover:underline ${FOCUS_RING}`}>
            {event.name}
          </a>
        ) : (
          event.name
        )}
      </h2>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{details}</p>
      {event.organiser && event.organiser !== event.name ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">By {event.organiser}</p>
      ) : null}
      {event.prizeText ? <p className="text-sm">{event.prizeText}</p> : null}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Listed by{" "}
        {event.sources.map((source, index) => (
          <span key={source.slug}>
            {index > 0 ? ", " : ""}
            {isWebUrl(source.url) ? (
              <a href={source.url} className={`underline underline-offset-4 ${FOCUS_RING}`}>
                {source.attribution}
              </a>
            ) : (
              source.attribution
            )}
          </span>
        ))}
      </p>
    </li>
  );
}

export async function EventList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams, SOURCES.map((source) => source.slug));
  const today = new Date().toISOString().slice(0, 10);

  let events: EventListing[];
  try {
    events = await getEvents(filters, today);
  } catch (error) {
    console.error("Could not load the event list", error);
    return (
      <p role="alert" className="text-zinc-700 dark:text-zinc-300">
        The list of hackathons is not available right now. Please try again in a minute.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Filters current={filters} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {events.length === 1 ? "1 hackathon" : `${events.length} hackathons`}
      </p>
      {events.length === 0 ? (
        <p>No upcoming hackathons match these filters.</p>
      ) : (
        <ul className="flex flex-col">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
