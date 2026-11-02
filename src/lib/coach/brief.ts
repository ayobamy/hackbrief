import { extractCriteria, type CriteriaResult } from "./criteria";
import { daysBetween, eventStart, extractDates, submissionDeadline, type KeyDate } from "./dates";
import { extractDeliverables, type Deliverable } from "./deliverables";
import { extractEligibility } from "./eligibility";
import { buildPlan, type PlanStep } from "./plan";
import { extractPrizes, largestPrizes, type Amount, type PrizeLine } from "./prizes";
import { buildStrategy, type StrategyNote } from "./strategy";
import { extractTeamSize, type TeamSize } from "./team";

/** Longer text is cut to this many characters before parsing, to keep the page responsive. */
export const MAX_INPUT_LENGTH = 100_000;

export interface Brief {
  judging: CriteriaResult;
  strategy: StrategyNote[];
  dates: KeyDate[];
  deadline: KeyDate | null;
  /** Calendar days from today to the submission deadline; negative once it has passed. */
  daysLeft: number | null;
  team: TeamSize | null;
  eligibility: string[];
  checklist: Deliverable[];
  prizes: PrizeLine[];
  topPrizes: Amount[];
  plan: PlanStep[];
  /** What hackr could not find or had to assume, in plain words. */
  warnings: string[];
}

function warningsFor(brief: Omit<Brief, "warnings">, truncated: boolean): string[] {
  const warnings: string[] = [];
  if (truncated) {
    warnings.push(`The text was longer than ${MAX_INPUT_LENGTH.toLocaleString("en")} characters; only the start was read.`);
  }
  const { judging } = brief;
  if (judging.criteria.length === 0) {
    warnings.push("No judging criteria found. Paste the judging or rubric section to get strategy notes.");
  } else if (judging.unit === "none") {
    warnings.push(
      `The rules list ${judging.criteria.length} criteria without weights, so hackr treats them as equal. Ask the organisers if some count more.`,
    );
  } else if (judging.unit === "percent" && judging.statedTotal !== 100) {
    warnings.push(`The stated weights add up to ${judging.statedTotal}%, so hackr scaled them to 100%.`);
  }
  if (!brief.deadline) {
    warnings.push("No submission deadline found, so there is no countdown or prep plan.");
  } else if (brief.daysLeft !== null && brief.daysLeft < 0) {
    warnings.push("The submission deadline has passed.");
  }
  if (brief.dates.some((date) => date.yearAssumed)) {
    warnings.push("Some dates had no year; hackr assumed the next one that keeps them upcoming.");
  }
  return warnings;
}

/** Everything the coach shows, built from pasted rules. `today` is YYYY-MM-DD. */
export function buildBrief(input: string, today: string): Brief {
  const truncated = input.length > MAX_INPUT_LENGTH;
  const text = truncated ? input.slice(0, MAX_INPUT_LENGTH) : input;

  const judging = extractCriteria(text);
  const dates = extractDates(text, today);
  const deadline = submissionDeadline(dates);
  const checklist = extractDeliverables(text);
  const prizes = extractPrizes(text);

  const brief = {
    judging,
    strategy: buildStrategy(judging),
    dates,
    deadline,
    daysLeft: deadline ? daysBetween(today, deadline.date) : null,
    team: extractTeamSize(text),
    eligibility: extractEligibility(text),
    checklist,
    prizes,
    topPrizes: largestPrizes(prizes),
    plan: buildPlan(eventStart(dates), deadline, checklist, today),
  };
  return { ...brief, warnings: warningsFor(brief, truncated) };
}

/** Today's date in the viewer's own calendar, YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
