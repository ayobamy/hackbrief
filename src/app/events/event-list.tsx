import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { DateTile } from "@/components/date-tile";
import { filterQuery, FORMAT_LABELS, parseFilters, type EventFilters } from "@/lib/events/filters";
import { formatDateRange, formatLocation, prizeLine } from "@/lib/events/format";
import {
  applyFilters,
  facetCounts,
  groupByMonth,
  pageNumbers,
  paginate,
  parsePage,
  timing,
  type Facets,
  type Timing,
} from "@/lib/events/listing";
import type { EventListing } from "@/lib/events/query";
import { SOURCES } from "@/lib/sources";
import type { EventFormat } from "@/lib/sources/types";

import { getEvents } from "./data";
import { PageKeys } from "./page-keys";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const CARD = "rounded-2xl border border-line bg-panel shadow-card";

// Event and source URLs are checked when they are imported; links are drawn only for http(s) as well.
function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function hackathons(count: number): string {
  return count === 1 ? "1 hackathon" : `${count} hackathons`;
}

function Chip({ href, active, count, children }: { href: string; active: boolean; count: number; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${FOCUS_RING} ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-panel hover:border-ink/40"
      }`}
    >
      {children}
      <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-paper/20" : "bg-line/70 text-muted"}`}>
        {count}
        <span className="sr-only">{count === 1 ? " hackathon" : " hackathons"}</span>
      </span>
    </Link>
  );
}

function Filters({ current, facets }: { current: EventFilters; facets: Facets }) {
  const formats = Object.keys(FORMAT_LABELS) as EventFormat[];
  return (
    <nav aria-label="Filter hackathons" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 text-sm text-muted">Format</span>
        <Chip href={`/events${filterQuery({ ...current, format: null })}`} active={current.format === null} count={facets.formatTotal}>
          All
        </Chip>
        {formats.map((format) => (
          <Chip
            key={format}
            href={`/events${filterQuery({ ...current, format })}`}
            active={current.format === format}
            count={facets.byFormat[format]}
          >
            {FORMAT_LABELS[format]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 text-sm text-muted">Source</span>
        <Chip href={`/events${filterQuery({ ...current, source: null })}`} active={current.source === null} count={facets.sourceTotal}>
          All
        </Chip>
        {SOURCES.map((source) => (
          <Chip
            key={source.slug}
            href={`/events${filterQuery({ ...current, source: source.slug })}`}
            active={current.source === source.slug}
            count={facets.bySource[source.slug] ?? 0}
          >
            {source.name}
          </Chip>
        ))}
      </div>
    </nav>
  );
}

const TIMING_STYLE: Readonly<Record<Timing["kind"], string>> = {
  live: "bg-accent/15 text-ink",
  soon: "bg-accent/10 text-ink",
  later: "border border-line text-muted",
  tba: "border border-dashed border-line text-muted",
};

function TimingBadge({ when }: { when: Timing }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${TIMING_STYLE[when.kind]}`}>
      {when.kind === "live" ? (
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full rounded-full bg-accent opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
        </span>
      ) : null}
      {when.label}
    </span>
  );
}

function ExternalArrow() {
  return (
    <svg viewBox="0 0 16 16" className="ml-1 inline size-3.5 align-[-1px] text-muted" aria-hidden="true">
      <path d="M5.5 4.5h6v6M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EventCard({ event, today }: { event: EventListing; today: string }) {
  const when = timing(event.startsOn, event.endsOn, today);
  const place = formatLocation(event.city, event.country) ?? (event.format === "online" ? "Online" : null);
  const linked = isWebUrl(event.url);
  const prize = prizeLine(event.prizeText);
  return (
    <li>
      <article
        className={`${CARD} group relative flex h-full flex-col gap-4 p-5 transition duration-300 motion-reduce:transition-none ${
          linked ? "hover:-translate-y-0.5 hover:border-ink/25 motion-reduce:hover:translate-y-0" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <DateTile startsOn={event.startsOn} />
          <div className="flex flex-wrap justify-end gap-1.5">
            {event.format ? (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs">{FORMAT_LABELS[event.format]}</span>
            ) : null}
            <TimingBadge when={when} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base leading-snug font-semibold tracking-[-0.01em]">
            {linked ? (
              // The link covers the whole card; the source credit below stays its own link above it.
              <a href={event.url} className={`rounded-sm after:absolute after:inset-0 after:rounded-2xl ${FOCUS_RING}`}>
                {event.name}
                <ExternalArrow />
              </a>
            ) : (
              event.name
            )}
          </h3>
          <p className="text-sm text-muted">{formatDateRange(event.startsOn, event.endsOn) ?? "Dates on the event's page"}</p>
          {place ? <p className="text-sm text-muted">{place}</p> : null}
          {event.organiser && event.organiser !== event.name ? <p className="text-sm text-muted">By {event.organiser}</p> : null}
          {prize ? (
            <p className="line-clamp-2 text-sm">
              <span className="text-muted">Prizes: </span>
              {prize}
            </p>
          ) : null}
        </div>
        <p className="relative z-10 mt-auto border-t border-line pt-3 text-xs text-muted">
          Listed by{" "}
          {event.sources.map((source, index) => (
            <span key={source.slug}>
              {index > 0 ? ", " : ""}
              {isWebUrl(source.url) ? (
                <a href={source.url} className={`underline underline-offset-4 hover:text-ink ${FOCUS_RING}`}>
                  {source.attribution}
                </a>
              ) : (
                source.attribution
              )}
            </span>
          ))}
        </p>
      </article>
    </li>
  );
}

function PagerEnd({ href, rel, children }: { href: string | null; rel: "prev" | "next"; children: ReactNode }) {
  const style = "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm";
  if (!href) {
    return (
      <span aria-disabled="true" className={`${style} border-line text-muted/60`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} scroll={false} className={`${style} border-line bg-panel hover:border-ink/40 ${FOCUS_RING}`}>
      {children}
    </Link>
  );
}

function Pager({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  const previous = page > 1 ? href(page - 1) : null;
  const next = page < pageCount ? href(page + 1) : null;
  return (
    <nav aria-label="Pages" className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-2 sm:flex-wrap">
        <PagerEnd href={previous} rel="prev">
          <span aria-hidden="true">←</span> Previous<span className="sr-only"> page</span>
        </PagerEnd>
        {/* On narrow screens the numbers give way to a single line: Previous, Page 2 of 5, Next. */}
        <span className="px-2 text-sm text-muted tabular-nums sm:hidden">
          Page {page} of {pageCount}
        </span>
        <ol className="hidden items-center gap-1 sm:flex">
          {pageNumbers(page, pageCount).map((number, slot) =>
            number === null ? (
              <li key={`gap-${slot}`} className="px-1 text-muted" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={number}>
                <Link
                  href={href(number)}
                  scroll={false}
                  aria-label={`Page ${number}`}
                  aria-current={number === page ? "page" : undefined}
                  className={`flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${FOCUS_RING} ${
                    number === page ? "bg-ink text-paper" : "text-muted hover:bg-line/60 hover:text-ink"
                  }`}
                >
                  {number}
                </Link>
              </li>
            ),
          )}
        </ol>
        <PagerEnd href={next} rel="next">
          Next<span className="sr-only"> page</span> <span aria-hidden="true">→</span>
        </PagerEnd>
      </div>
      <p className="hidden text-xs text-muted pointer-fine:block">
        Or press <kbd className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono">←</kbd> and{" "}
        <kbd className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono">→</kbd> to turn the pages.
      </p>
    </nav>
  );
}

export function EventListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p className="text-sm text-muted">Loading hackathons…</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <li key={key} className={`${CARD} h-56 animate-pulse motion-reduce:animate-none`} />
        ))}
      </ul>
    </div>
  );
}

export async function EventList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Today's date and the database make this list request-time work, never part of a prerender.
  await connection();
  const params = await searchParams;
  const filters = parseFilters(params, SOURCES.map((source) => source.slug));
  const today = new Date().toISOString().slice(0, 10);

  let all: EventListing[];
  try {
    // One cached list for every filter and page; filtering and paging happen here, in tested code.
    all = await getEvents({ format: null, source: null }, today);
  } catch (error) {
    console.error("Could not load the event list", error);
    return (
      <p role="alert" className="text-muted">
        The list of hackathons is not available right now. Please try again in a minute.
      </p>
    );
  }

  const facets = facetCounts(all, filters);
  const shown = paginate(applyFilters(all, filters), parsePage(params));
  const href = (page: number) => `/events${filterQuery(filters, page)}`;

  return (
    <div className="flex flex-col gap-8">
      <Filters current={filters} facets={facets} />
      <PageKeys
        page={shown.page}
        filters={filterQuery(filters)}
        previous={shown.page > 1 ? href(shown.page - 1) : null}
        next={shown.page < shown.pageCount ? href(shown.page + 1) : null}
      />
      <p id="results" tabIndex={-1} className="scroll-mt-28 text-sm text-muted outline-none">
        {shown.total === 0
          ? "No hackathons match these filters."
          : shown.pageCount === 1
            ? hackathons(shown.total)
            : `Showing ${shown.first}–${shown.last} of ${hackathons(shown.total)} · Page ${shown.page} of ${shown.pageCount}`}
      </p>
      {shown.total === 0 ? (
        <div className={`${CARD} flex flex-col items-start gap-3 p-6`}>
          <p>No upcoming hackathons match these filters.</p>
          <Link href="/events" scroll={false} className={`text-sm underline underline-offset-4 ${FOCUS_RING}`}>
            Clear the filters
          </Link>
        </div>
      ) : (
        groupByMonth(shown.items, today).map((group) => (
          <section key={group.key} aria-labelledby={`month-${group.key}`} className="flex flex-col gap-4">
            <h2 id={`month-${group.key}`} className="flex items-baseline gap-3 text-lg font-semibold tracking-[-0.02em]">
              {group.label}
              {/* Only for the eye: screen readers already announce how many items each list holds. */}
              <span className="text-sm font-normal text-muted" aria-hidden="true">
                {group.events.length}
              </span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} today={today} />
              ))}
            </ul>
          </section>
        ))
      )}
      {shown.pageCount > 1 ? <Pager page={shown.page} pageCount={shown.pageCount} href={href} /> : null}
    </div>
  );
}
