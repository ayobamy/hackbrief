import Link from "next/link";
import { connection } from "next/server";

import { getEvents } from "@/app/events/data";
import { buildBrief } from "@/lib/coach/brief";
import { formatDate, formatTeamSize } from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import { FORMAT_LABELS } from "@/lib/events/filters";
import { formatDateRange } from "@/lib/events/format";

import { CARD, Canvas, StepBadge } from "./canvas";
import { DateTile } from "./date-tile";
import { CountUp } from "./motion/count-up";

// The Lagoon sample, read by the coach at build time; the panels below show its real output.
const LAGOON = SAMPLES.find((sample) => sample.id === "lagoon") ?? SAMPLES[0];
const LAGOON_BRIEF = LAGOON ? buildBrief(LAGOON.text, "2026-11-02") : null;

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-muted" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 text-muted" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8.5h14M7 3v3M13 3v3" fill="none" stroke="currentColor" strokeWidth="1.4" />
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
    <Canvas className="p-3 sm:p-5">
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-baseline justify-between px-5 pt-4 pb-3">
          <span className="text-sm text-muted">Upcoming now</span>
          <span className="text-sm">
            <CountUp value={events.length} className="font-semibold" />{" "}
            <span className="text-muted">hackathons</span>
          </span>
        </div>
        {events.length === 0 ? (
          <div className="flex items-start gap-3 border-t border-line px-5 py-6">
            <CalendarIcon />
            <p className="text-sm leading-6 text-muted">
              The list fills from the daily import of the sources that allow it.{" "}
              <Link href="/events" className="text-ink underline underline-offset-4">
                See the list
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1 px-2 pb-2">
            {events.slice(0, 4).map((event) => {
              return (
                <li key={event.id} className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-paper">
                  <DateTile startsOn={event.startsOn} />
                  <span className="flex min-w-0 flex-col gap-0.5">
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Canvas>
  );
}

export function UpcomingSkeleton() {
  return (
    <Canvas className="p-3 sm:p-5">
      <div className={`${CARD} px-5 py-8 text-sm text-muted`} aria-busy="true">
        Loading upcoming hackathons…
      </div>
    </Canvas>
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
    <Canvas className="p-3 sm:p-5">
      <ol className="flex flex-col gap-3">
        {rows.map((row, position) => (
          <li key={row.label} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
            <span className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-paper/70 px-3.5 py-3">
              <StepBadge n={position + 1} className="size-6 text-[11px]" />
              <span className="font-mono text-[11.5px] leading-5 text-muted">{row.from}</span>
            </span>
            <span className="hidden sm:block">
              <Arrow />
            </span>
            <span className={`${CARD} flex flex-col gap-0.5 px-4 py-3`}>
              <span className="text-xs text-muted">{row.label}</span>
              <span className="text-sm font-medium">{row.value}</span>
            </span>
          </li>
        ))}
      </ol>
    </Canvas>
  );
}

/** The prep plan the coach counts back from the Lagoon sample's dates, as linked step cards. */
export function PlanPanel() {
  if (!LAGOON_BRIEF) {
    return null;
  }
  return (
    <Canvas className="p-3 sm:p-5">
      <p className="px-1 pb-4 text-sm text-muted">Prep plan · {LAGOON?.name}</p>
      <ol className="relative flex flex-col gap-3 pl-11">
        <span className="absolute top-4 bottom-4 left-[13px] w-px bg-line" aria-hidden="true" />
        {LAGOON_BRIEF.plan.map((step, position) => (
          <li key={step.title} className="relative">
            <StepBadge
              n={position + 1}
              active={position === LAGOON_BRIEF.plan.length - 1}
              className="absolute top-3.5 -left-11"
            />
            <div className={`${CARD} flex flex-col gap-1 px-4 py-3.5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium">{step.title}</span>
                <span className="font-mono text-xs text-muted tabular-nums">{formatDate(step.date)}</span>
              </div>
              <span className="text-[13px] leading-5 text-muted">{step.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </Canvas>
  );
}
