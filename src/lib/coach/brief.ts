import { extractCriteria, type CriteriaResult } from "./criteria";
import { daysBetween, eventStart, extractDates, submissionDeadline, type KeyDate } from "./dates";
import { extractDeliverables, type Deliverable } from "./deliverables";
import { extractEligibility } from "./eligibility";
import { withListingDates, type ListingDates } from "./listing";
import { locatedFacts, verifyLocated, type Located, type ModelFact } from "./locate";
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
  /** The parts a language model's quotes filled in (decision D12); empty without one. */
  modelFound: ModelFact[];
  /** What hackbrief could not find or had to assume, in plain words. */
  warnings: string[];
}

/** What a brief can use besides the text itself. */
export interface BriefExtras {
  /** A listed event's own dates, which fill in what its rules leave out (`withListingDates`). */
  listing?: ListingDates | undefined;
  /** Sentences a language model pointed to in the text (D12); each is checked against it again. */
  located?: Located | undefined;
}

const FACT_NAMES: Readonly<Record<ModelFact, string>> = {
  deadline: "the deadline",
  team: "the team size",
  eligibility: "who can enter",
  checklist: "the checklist",
  prizes: "the prizes",
};

function inWords(names: readonly string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
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
      `The rules list ${judging.criteria.length} criteria without weights, so hackbrief treats them as equal. Ask the organisers if some count more.`,
    );
  } else if (judging.unit === "percent" && judging.statedTotal !== 100) {
    warnings.push(`The stated weights add up to ${judging.statedTotal}%, so hackbrief scaled them to 100%.`);
  }
  if (brief.deadline?.fromListing) {
    warnings.push(
      "The rules give no submission deadline, so hackbrief uses the last day of the event from its listing. Check the exact time with the organisers.",
    );
  } else if (!brief.deadline) {
    warnings.push("No submission deadline found, so there is no countdown or prep plan.");
  } else if (brief.daysLeft !== null && brief.daysLeft < 0) {
    warnings.push("The submission deadline has passed.");
  }
  if (brief.dates.some((date) => date.yearAssumed)) {
    warnings.push("Some dates had no year; hackbrief assumed the next one that keeps them upcoming.");
  }
  if (brief.modelFound.length > 0) {
    warnings.push(
      `A language model pointed to the sentences behind ${inWords(brief.modelFound.map((fact) => FACT_NAMES[fact]))}. hackbrief checked each sentence is in the rules and read the values itself; check them against the rules.`,
    );
  }
  return warnings;
}

function byDate(dates: readonly KeyDate[]): KeyDate[] {
  return [...dates].sort((a, b) => a.date.localeCompare(b.date));
}

/** Everything the coach shows, built from pasted rules. `today` is YYYY-MM-DD. */
export function buildBrief(input: string, today: string, { listing, located }: BriefExtras = {}): Brief {
  const truncated = input.length > MAX_INPUT_LENGTH;
  const text = truncated ? input.slice(0, MAX_INPUT_LENGTH) : input;

  const judging = extractCriteria(text);
  const pageDates = extractDates(text, today);
  const ownDates = listing ? withListingDates(text, pageDates, listing) : pageDates;
  const ownDeadline = submissionDeadline(ownDates);
  const ownTeam = extractTeamSize(text);
  const ownEligibility = extractEligibility(text);
  const ownChecklist = extractDeliverables(text);
  const ownPrizes = extractPrizes(text);

  // A model's quotes fill only what the coach's own reading left empty, and only while the text holds them.
  const extra = located ? locatedFacts(verifyLocated(located, text), today, listing) : null;
  const modelDeadline = extra?.deadline && (!ownDeadline || ownDeadline.fromListing) ? extra.deadline : null;
  const modelTeam = ownTeam ? null : (extra?.team ?? null);
  const modelEligibility = ownEligibility.length > 0 ? [] : (extra?.eligibility ?? []);
  const modelItems = (extra?.checklist ?? []).filter((item) => !ownChecklist.some((own) => own.id === item.id));
  const modelPrizes = ownPrizes.length > 0 ? [] : (extra?.prizes ?? []);

  const dates = modelDeadline
    ? byDate([...ownDates.filter((date) => !(date.fromListing && date.kind === "submission")), modelDeadline])
    : ownDates;
  const deadline = modelDeadline ?? ownDeadline;
  const checklist = [...ownChecklist, ...modelItems];
  const prizes = ownPrizes.length > 0 ? ownPrizes : modelPrizes;
  const modelFound: ModelFact[] = [
    modelDeadline ? "deadline" : null,
    modelTeam ? "team" : null,
    modelEligibility.length > 0 ? "eligibility" : null,
    modelItems.length > 0 ? "checklist" : null,
    modelPrizes.length > 0 ? "prizes" : null,
  ].filter((fact): fact is ModelFact => fact !== null);

  const brief = {
    judging,
    strategy: buildStrategy(judging),
    dates,
    deadline,
    daysLeft: deadline ? daysBetween(today, deadline.date) : null,
    team: ownTeam ?? modelTeam,
    eligibility: ownEligibility.length > 0 ? ownEligibility : modelEligibility,
    checklist,
    prizes,
    topPrizes: largestPrizes(prizes),
    plan: buildPlan(eventStart(dates), deadline, checklist, today),
    modelFound,
  };
  return { ...brief, warnings: warningsFor(brief, truncated) };
}

/** Today's date in the viewer's own calendar, YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whether a text gave the brief anything to show: a deadline, criteria, a team size, who can enter, something to hand in or a prize. */
export function hasFindings(brief: Brief): boolean {
  return (
    (brief.deadline !== null && !brief.deadline.fromListing) ||
    brief.judging.criteria.length > 0 ||
    brief.team !== null ||
    brief.eligibility.length > 0 ||
    brief.checklist.length > 0 ||
    brief.topPrizes.length > 0
  );
}

/** Whether the brief still lacks a deadline, a team size, who can enter or a checklist: when a model is worth asking. */
export function missesFacts(brief: Brief): boolean {
  return (
    !brief.deadline ||
    Boolean(brief.deadline.fromListing) ||
    !brief.team ||
    brief.eligibility.length === 0 ||
    brief.checklist.length === 0
  );
}
