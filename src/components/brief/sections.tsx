"use client";

// The parts of a brief as the coach and an event's page show them (#62).
import { useId, useSyncExternalStore, type ReactNode } from "react";

import type { Brief } from "@/lib/coach/brief";
import { formatAmount, formatDate, formatDaysLeft, formatSolo, formatTeamSize } from "@/lib/coach/format";
import type { Emphasis } from "@/lib/coach/strategy";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const EMPHASIS_LABEL: Readonly<Record<Emphasis, string>> = {
  focus: "Focus",
  steady: "Keep steady",
  light: "Light touch",
};

const EMPHASIS_STYLE: Readonly<Record<Emphasis, string>> = {
  focus: "bg-accent/25 text-ink",
  steady: "text-ink",
  light: "text-muted",
};

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-2xl">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function Fact({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="flex flex-col gap-1 border border-line p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
      {detail ? <dd className="text-sm text-muted">{detail}</dd> : null}
    </div>
  );
}

export function Summary({ brief }: { brief: Brief }) {
  const { deadline, daysLeft, team, topPrizes } = brief;
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <Fact
        label="Submission deadline"
        value={deadline && daysLeft !== null ? formatDaysLeft(daysLeft) : "Not found"}
        detail={
          deadline
            ? `${formatDate(deadline.date)}${deadline.time ? `, ${deadline.time}` : ""}${deadline.fromListing ? " (from the listing)" : ""}`
            : null
        }
      />
      <Fact label="Team" value={team ? formatTeamSize(team) : "Not stated"} detail={team ? formatSolo(team) : null} />
      <Fact
        label="Top prize"
        value={topPrizes.length > 0 ? topPrizes.map(formatAmount).join(" · ") : "Not stated"}
      />
    </dl>
  );
}

export function Judging({ brief, empty = "No judging criteria found in the text." }: { brief: Brief; empty?: string }) {
  if (brief.strategy.length === 0) {
    return <p className="text-muted">{empty}</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {brief.strategy.map((note) => (
        <li key={note.criterion} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{note.criterion}</span>
            <span className="flex items-center gap-2 text-sm">
              <span className={`px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.1em] uppercase ${EMPHASIS_STYLE[note.emphasis]}`}>
                {EMPHASIS_LABEL[note.emphasis]}
              </span>
              <span className="font-semibold tabular-nums">{note.weight}%</span>
            </span>
          </div>
          <div className="h-[2px] w-full bg-line" aria-hidden="true">
            <div className={`h-[2px] ${note.emphasis === "focus" ? "bg-ink" : "bg-muted/60"}`} style={{ width: `${note.weight}%` }} />
          </div>
          <p className="text-sm text-muted">{note.text}</p>
        </li>
      ))}
    </ol>
  );
}

const TICKS_CHANGED = "hackbrief:ticks";

function readTicks(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function subscribeToTicks(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(TICKS_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TICKS_CHANGED, onChange);
  };
}

/**
 * The checklist items ticked in this browser, under `key`: none on the server and until the page is
 * live, so both render alike; nothing is kept when the browser refuses storage.
 */
function useTicks(key: string | undefined): [ReadonlySet<string>, (id: string, ticked: boolean) => void] {
  const raw = useSyncExternalStore(subscribeToTicks, () => (key ? readTicks(key) : ""), () => "");
  const ticks = new Set(raw ? raw.split("\n") : []);
  const set = (id: string, ticked: boolean) => {
    if (!key) {
      return;
    }
    const next = new Set(ticks);
    if (ticked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    try {
      window.localStorage.setItem(key, [...next].join("\n"));
      window.dispatchEvent(new Event(TICKS_CHANGED));
    } catch {
      // Storage refused (a private window, blocked site data): the box still ticks, just not remembered.
    }
  };
  return [ticks, set];
}

/** What to hand in, as boxes to tick; with `storageKey`, the ticks are kept in this browser. */
export function Checklist({
  brief,
  storageKey,
  empty = "The text does not list what to submit.",
}: {
  brief: Brief;
  storageKey?: string;
  empty?: string;
}) {
  const [ticks, setTick] = useTicks(storageKey);
  if (brief.checklist.length === 0) {
    return <p className="text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {brief.checklist.map((item) => (
        <li key={item.id}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className={`mt-1 size-4 accent-accent ${FOCUS_RING}`}
              {...(storageKey ? { checked: ticks.has(item.id), onChange: (event) => setTick(item.id, event.target.checked) } : {})}
            />
            <span className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-sm text-muted">From the rules: “{item.source}”</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function Dates({ brief }: { brief: Brief }) {
  if (brief.dates.length === 0) {
    return <p className="text-muted">No dates found in the text.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">What</th>
            <th scope="col" className="py-2 pr-4 font-medium">Date</th>
            <th scope="col" className="py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {brief.dates.map((date, index) => (
            <tr key={`${date.date}-${index}`} className="border-t border-line">
              <td className="py-2 pr-4">{date.label}</td>
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                {formatDate(date.date)}
                {date.yearAssumed ? <span className="text-muted"> (year assumed)</span> : null}
              </td>
              <td className="py-2 whitespace-nowrap">{date.time ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Plan({ brief }: { brief: Brief }) {
  if (brief.plan.length === 0) {
    return <p className="text-muted">A prep plan needs a submission deadline.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {brief.plan.map((step) => {
        const passed = step.daysFromToday < 0;
        return (
          <li key={step.title} className={`flex flex-col gap-1 border-l-2 pl-4 ${passed ? "border-line opacity-60" : "border-accent"}`}>
            <span className="text-sm text-muted tabular-nums">
              {formatDate(step.date)} · {formatDaysLeft(step.daysFromToday)}
              {passed ? " (passed)" : ""}
            </span>
            <span className="font-medium">{step.title}</span>
            <span className="text-sm text-muted">{step.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function SimpleList({ items, empty }: { items: readonly string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-muted">{empty}</p>;
  }
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

