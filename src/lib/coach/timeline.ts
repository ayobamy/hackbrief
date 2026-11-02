import { addDays, daysBetween } from "./dates";
import type { PlanStep } from "./plan";

export interface TimelineDay {
  date: string;
  /** Days after the plan's first step. */
  offset: number;
  /** The day of the month, "26". */
  day: string;
  /** The month's short name on the first day shown and on the first day of each new month. */
  month: string | null;
  /** The index of the plan step on this day, if any. */
  step: number | null;
  /** Between the start of the hacking and the deadline, both included. */
  hacking: boolean;
}

export interface Timeline {
  days: TimelineDay[];
  /** How long each step waits after the one before, "+11 days"; null for the first. */
  gaps: Array<string | null>;
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

function gapLabel(days: number): string {
  if (days === 0) {
    return "Same day";
  }
  return days === 1 ? "+1 day" : `+${days} days`;
}

/**
 * The calendar a prep plan covers, one entry per day from its first step to its last, with each step
 * placed on its day and the hacking days marked. Without a start date only the deadline is marked;
 * without a deadline, nothing is. Null for an empty plan.
 */
export function planTimeline(plan: readonly PlanStep[], start: string | null, deadline: string | null): Timeline | null {
  const first = plan[0];
  const last = plan[plan.length - 1];
  if (!first || !last) {
    return null;
  }
  const hackFrom = start ?? deadline;
  const span = daysBetween(first.date, last.date) + 1;
  const days = [...Array(span).keys()].map((offset) => {
    const date = addDays(first.date, offset);
    const index = plan.findIndex((step) => step.date === date);
    return {
      date,
      offset,
      day: String(Number(date.slice(8))),
      month: offset === 0 || date.endsWith("-01") ? MONTH.format(new Date(`${date}T00:00:00Z`)) : null,
      step: index === -1 ? null : index,
      hacking: hackFrom !== null && deadline !== null && date >= hackFrom && date <= deadline,
    };
  });
  const gaps = plan.map((step, index) => {
    const before = plan[index - 1];
    return before ? gapLabel(daysBetween(before.date, step.date)) : null;
  });
  return { days, gaps };
}
