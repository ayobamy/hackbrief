import Link from "next/link";
import { connection } from "next/server";

import { getEvents } from "@/app/events/data";
import { buildBrief } from "@/lib/coach/brief";
import { formatDate, formatTeamSize } from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import { FORMAT_LABELS } from "@/lib/events/filters";
import { formatDateRange } from "@/lib/events/format";

import { CountUp } from "./motion/count-up";

const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted";
const PANEL = "overflow-hidden rounded-2xl border border-line bg-panel";

// The Lagoon sample, read by the coach at build time; the panels below show its real output.
const LAGOON = SAMPLES.find((sample) => sample.id === "lagoon") ?? SAMPLES[0];
const LAGOON_BRIEF = LAGOON ? buildBrief(LAGOON.text, "2026-11-02") : null;

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
    <div className={PANEL}>
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <span className={LABEL}>Upcoming now</span>
        <span className="text-sm">
          <CountUp value={events.length} className="font-semibold" /> <span className="text-muted">hackathons</span>
        </span>
      </div>
      {events.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">
          The list fills from the daily import of the sources that allow it.{" "}
          <Link href="/events" className="text-ink underline underline-offset-4">
            See the list
          </Link>
          .
        </p>
      ) : (
        <ul>
          {events.slice(0, 4).map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 border-b border-line px-5 py-3 last:border-b-0">
              <span className="text-sm font-medium">{event.name}</span>
              <span className="text-xs text-muted">
                {[formatDateRange(event.startsOn, event.endsOn), event.format ? FORMAT_LABELS[event.format] : null]
                  .filter(Boolean)
                  .join(" · ")}
                {event.sources[0] ? ` · via ${event.sources[0].attribution}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UpcomingSkeleton() {
  return (
    <div className={`${PANEL} px-5 py-8 text-sm text-muted`} aria-busy="true">
      Loading upcoming hackathons…
    </div>
  );
}

/** Lines of the Lagoon sample beside what the coach read from each. */
export function ReadPanel() {
  if (!LAGOON_BRIEF) {
    return null;
  }
  const { deadline, team, judging, checklist } = LAGOON_BRIEF;
  const top = judging.criteria[0];
  const video = checklist.find((item) => item.id === "video");
  const rows = [
    deadline && { from: deadline.source, label: "Deadline", value: `${formatDate(deadline.date)}${deadline.time ? `, ${deadline.time}` : ""}` },
    team && { from: team.source, label: "Team", value: formatTeamSize(team) },
    top && { from: `${top.name} (${top.stated}%)`, label: "Criterion", value: `${top.name}, ${top.weight}% of the score` },
    video && { from: video.source, label: "To hand in", value: video.label },
  ].filter((row): row is { from: string; label: string; value: string } => Boolean(row));

  return (
    <div className={PANEL}>
      <div className="grid grid-cols-2 border-b border-line">
        <span className={`${LABEL} border-r border-line px-5 py-3`}>In the rules</span>
        <span className={`${LABEL} px-5 py-3`}>What hackr reads</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-2 border-b border-line last:border-b-0">
            <span className="border-r border-line px-5 py-3 font-mono text-[11.5px] leading-5 text-muted">{row.from}</span>
            <span className="flex flex-col gap-0.5 px-5 py-3">
              <span className={LABEL}>{row.label}</span>
              <span className="text-sm">{row.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The prep plan the coach counts back from the Lagoon sample's dates. */
export function PlanPanel() {
  if (!LAGOON_BRIEF) {
    return null;
  }
  return (
    <div className={`${PANEL} px-5 py-5`}>
      <span className={LABEL}>Prep plan · {LAGOON?.name}</span>
      <ol className="relative mt-4 flex flex-col gap-5 border-l border-line pl-6">
        {LAGOON_BRIEF.plan.map((step) => (
          <li key={step.title} className="relative flex flex-col gap-0.5">
            <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-panel bg-accent" aria-hidden="true" />
            <span className="font-mono text-xs text-muted tabular-nums">{formatDate(step.date)}</span>
            <span className="text-sm font-medium">{step.title}</span>
            <span className="text-[13px] leading-5 text-muted">{step.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
