import { addDays, daysBetween, type KeyDate } from "./dates";
import type { Deliverable } from "./deliverables";

export interface PlanStep {
  date: string;
  /** Calendar days from today; negative once the step's day has passed. */
  daysFromToday: number;
  title: string;
  detail: string;
}

interface Milestone {
  from: "start" | "deadline";
  offset: number;
  title: string;
  detail: (deliverables: ReadonlySet<string>) => string;
}

function finishingWork(deliverables: ReadonlySet<string>): string {
  const tasks = ["fix the bugs on the demo path"];
  if (deliverables.has("video")) {
    tasks.push("record the demo video");
  }
  if (deliverables.has("readme")) {
    tasks.push("finish the README");
  }
  if (deliverables.has("slides")) {
    tasks.push("make the slides");
  }
  if (deliverables.has("description")) {
    tasks.push("write the project description");
  }
  return `Stop adding features: ${tasks.join(", ")}.`;
}

const MILESTONES: readonly Milestone[] = [
  {
    from: "start",
    offset: -14,
    title: "Form the team",
    detail: () =>
      "Agree who builds what, pick a track, and read the judging criteria together.",
  },
  {
    from: "start",
    offset: -3,
    title: "Get set up",
    detail: () =>
      "Create the repository and boilerplate, and try any APIs the rules require.",
  },
  {
    from: "start",
    offset: 0,
    title: "Kick-off",
    detail: () =>
      "Choose one demo path that scores on the heaviest criteria, and cut everything else.",
  },
  { from: "deadline", offset: -1, title: "Finish", detail: finishingWork },
  {
    from: "deadline",
    offset: 0,
    title: "Submit",
    detail: () =>
      "Submit at least an hour before the deadline, then check every link works.",
  },
];

/**
 * A preparation plan counted back from the start and the submission deadline. Without a start
 * date, the steps before the event count back from the deadline instead.
 */
export function buildPlan(
  start: KeyDate | null,
  deadline: KeyDate | null,
  deliverables: readonly Deliverable[],
  today: string,
): PlanStep[] {
  if (!deadline) {
    return [];
  }
  const anchor =
    start && start.date <= deadline.date
      ? start.date
      : addDays(deadline.date, -2);
  const ids = new Set(deliverables.map((deliverable) => deliverable.id));
  const steps = MILESTONES.map((milestone) => {
    const date = addDays(
      milestone.from === "start" ? anchor : deadline.date,
      milestone.offset,
    );
    return {
      date,
      daysFromToday: daysBetween(today, date),
      title: milestone.title,
      detail: milestone.detail(ids),
    };
  });
  // A step never comes before the one ahead of it: in a one-day hackathon, "Finish" moves to the
  // kick-off day instead of the day before it.
  for (let i = 1; i < steps.length; i += 1) {
    const previous = steps[i - 1];
    const step = steps[i];
    if (previous && step && step.date < previous.date) {
      step.date = previous.date;
      step.daysFromToday = previous.daysFromToday;
    }
  }
  return steps;
}
