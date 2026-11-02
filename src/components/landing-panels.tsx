import Link from "next/link";
import { connection } from "next/server";

import { getEvents } from "@/app/events/data";
import { buildBrief } from "@/lib/coach/brief";
import { formatDate, formatTeamSize } from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import { FORMAT_LABELS } from "@/lib/events/filters";
import { formatDateRange, isWebUrl } from "@/lib/events/format";

import { DateTile } from "./date-tile";
import { CountUp } from "./motion/count-up";
import { Footnote, LABEL, Sheet } from "./sheet";

// The Lagoon sample, read by the coach at build time; the panels below show its real output.
const LAGOON = SAMPLES.find((sample) => sample.id === "lagoon") ?? SAMPLES[0];
const LAGOON_BRIEF = LAGOON ? buildBrief(LAGOON.text, "2026-11-02") : null;

function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      aria-hidden="true"
    >
      <path d="M5.5 4.5h6v6M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Real upcoming hackathons from the database, through the same cached query as /events. */
export async function UpcomingPreview() {
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  try {
    events = await getEvents({ format: null, source: null }, today);
  } catch (error) {
    console.error("Could not load upcoming hackathons for the landing page", error);
  }
  return (
    <Sheet>
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <span className={LABEL}>Upcoming now</span>
        <span className="text-sm text-muted">
          <CountUp value={events.length} className="font-semibold text-ink" /> hackathons
        </span>
      </div>
      {events.length === 0 ? (
        <p className="px-5 py-6 text-sm leading-6 text-muted">
          The list fills from the daily import of the sources that allow it.{" "}
          <Link href="/events" className="text-ink underline underline-offset-4">
            See the list
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {events.slice(0, 4).map((event) => {
            const row = (
              <>
                <DateTile startsOn={event.startsOn} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{event.name}</span>
                  <span className="truncate text-xs text-muted">
                    {[
                      formatDateRange(event.startsOn, event.endsOn),
                      event.format ? FORMAT_LABELS[event.format] : null,
                      event.sources[0] ? `via ${event.sources[0].attribution}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </>
            );
            return (
              <li key={event.id}>
                {isWebUrl(event.url) ? (
                  // The whole row links to the event's own page, as a card on /events does.
                  <a
                    href={event.url}
                    className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                  >
                    {row}
                    <ExternalArrow />
                  </a>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

export function UpcomingSkeleton() {
  return (
    <Sheet className="px-5 py-8 text-sm text-muted">
      <p aria-busy="true">Loading upcoming hackathons…</p>
    </Sheet>
  );
}

/** Lines of the Lagoon sample beside what the coach read from each, numbered as in the hero. */
export function ReadPanel() {
  if (!LAGOON_BRIEF) {
    return null;
  }
  const { deadline, team, judging, checklist } = LAGOON_BRIEF;
  const top = judging.criteria[0];
  const video = checklist.find((item) => item.id === "video");
  const rows = [
    deadline && {
      from: deadline.source,
      label: "Deadline",
      value: `${formatDate(deadline.date)}${deadline.time ? `, ${deadline.time}` : ""}`,
    },
    team && { from: team.source, label: "Team", value: formatTeamSize(team) },
    top && { from: `${top.name} (${top.stated}%)`, label: "Criterion", value: `${top.name}, ${top.weight}% of the score` },
    video && { from: video.source, label: "To hand in", value: video.label },
  ].filter((row): row is { from: string; label: string; value: string } => Boolean(row));

  return (
    <Sheet>
      <div className="hidden grid-cols-2 border-b border-line sm:grid">
        <span className={`${LABEL} border-r border-line px-5 py-3`}>In the rules</span>
        <span className={`${LABEL} px-5 py-3`}>What hackbrief reads</span>
      </div>
      <ol className="divide-y divide-line">
        {rows.map((row, position) => (
          <li key={row.label} className="grid sm:grid-cols-2">
            <span className="flex items-start gap-3 px-5 py-3.5 sm:border-r sm:border-line">
              <Footnote n={position + 1} className="mt-[1px]" />
              <span className="bg-accent/10 font-mono text-[11.5px] leading-5">{row.from}</span>
            </span>
            <span className="flex flex-col gap-0.5 px-5 pb-3.5 pl-[50px] sm:py-3.5 sm:pl-5">
              <span className={LABEL}>{row.label}</span>
              <span className="text-sm font-medium leading-snug">{row.value}</span>
            </span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

/** The prep plan the coach counts back from the Lagoon sample's dates, set as a dated schedule. */
export function PlanPanel() {
  if (!LAGOON_BRIEF) {
    return null;
  }
  return (
    <Sheet>
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <span className={LABEL}>Prep plan</span>
        <span className="text-sm text-muted">{LAGOON?.name}</span>
      </div>
      <ol className="divide-y divide-line">
        {LAGOON_BRIEF.plan.map((step) => (
          <li key={step.title} className="grid gap-x-5 gap-y-1 px-5 py-3.5 sm:grid-cols-[132px_1fr]">
            <span className="font-mono text-xs text-muted tabular-nums sm:pt-1">{formatDate(step.date)}</span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{step.title}</span>
              <span className="text-[13px] leading-5 text-muted">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
