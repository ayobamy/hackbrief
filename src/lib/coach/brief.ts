import { extractCriteria, type CriteriaResult } from "./criteria";
import { daysBetween, eventStart, extractDates, submissionDeadline, type KeyDate } from "./dates";
import { extractDeliverables, type Deliverable } from "./deliverables";
import { extractEligibility } from "./eligibility";
import { withListingDates, type ListingDates } from "./listing";
import { filledFacts, verifyFilled, type FillAnswer, type ModelFact } from "./fill";
import { buildPlan, type PlanStep } from "./plan";
import { extractPrizes, largestPrizes, type Amount, type PrizeLine } from "./prizes";
import { buildStrategy, type StrategyNote } from "./strategy";
import { extractTeamSize, type TeamSize } from "./team";

const MAX_ELIGIBILITY = 6;

// Spacing, case and curly quotes do not make a sentence a different one.
const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// Who can enter, from the model first and then the coach's own reading, without a sentence twice; a
// sentence the model filed elsewhere (a rule, something to hand in) is not about who can enter.
function bothLists(model: readonly string[], own: readonly string[], elsewhere: readonly string[]): string[] {
  const filed = elsewhere.map(plain);
  const kept: string[] = [];
  for (const sentence of [...model, ...own.filter((line) => !filed.includes(plain(line)))]) {
    const text = plain(sentence);
    if (!kept.some((other) => plain(other).includes(text) || text.includes(plain(other)))) {
      kept.push(sentence);
    }
  }
  return kept.slice(0, MAX_ELIGIBILITY);
}

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
  /** Tracks or challenges entrants choose from, each with the sentence that names it. */
  tracks: Array<{ name: string; source: string }>;
  /** Rules that change how to compete, as the rules state them. */
  rules: string[];
  plan: PlanStep[];
  /** The parts a language model's reading supplied (decision D13); empty without one. */
  modelFound: ModelFact[];
  /** What hackbrief could not find or had to assume, in plain words. */
  warnings: string[];
}

/** What a brief can use besides the text itself. */
export interface BriefExtras {
  /** A listed event's own dates, which fill in what its rules leave out (`withListingDates`). */
  listing?: ListingDates | undefined;
  /** A language model's reading of the text (D13): each fact with its sentences, checked against it again. */
  filled?: FillAnswer | undefined;
}

const FACT_NAMES: Readonly<Record<ModelFact, string>> = {
  deadline: "the deadline",
  team: "the team size",
  eligibility: "who can enter",
  checklist: "the checklist",
  judging: "the judging criteria",
  prizes: "the prizes",
  tracks: "the tracks",
  rules: "the rules on how to compete",
};

function inWords(names: readonly string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function warningsFor(brief: Omit<Brief, "warnings">, truncated: boolean, otherDeadline: KeyDate | null): string[] {
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
      `A language model read ${inWords(brief.modelFound.map((fact) => FACT_NAMES[fact]))} from the rules. hackbrief checked that every sentence it used is there and read the dates and numbers itself; check them against the rules.`,
    );
  }
  if (otherDeadline) {
    warnings.push(
      `hackbrief's own reading found another submission date, ${otherDeadline.date}, in "${otherDeadline.source}"; check which one counts.`,
    );
  }
  return warnings;
}

function byDate(dates: readonly KeyDate[]): KeyDate[] {
  return [...dates].sort((a, b) => a.date.localeCompare(b.date));
}

/** Everything the coach shows, built from pasted rules. `today` is YYYY-MM-DD. */
export function buildBrief(input: string, today: string, { listing, filled }: BriefExtras = {}): Brief {
  const truncated = input.length > MAX_INPUT_LENGTH;
  const text = truncated ? input.slice(0, MAX_INPUT_LENGTH) : input;

  const ownJudging = extractCriteria(text);
  const pageDates = extractDates(text, today);
  const ownDates = listing ? withListingDates(text, pageDates, listing) : pageDates;
  const ownDeadline = submissionDeadline(ownDates);
  const ownTeam = extractTeamSize(text);
  const ownEligibility = extractEligibility(text);
  const ownChecklist = extractDeliverables(text);
  const ownPrizes = extractPrizes(text);

  // A model's checked facts come first (decision D13), and only while the text holds their sentences;
  // the coach's own reading fills in whatever the model did not find.
  const model = filled ? filledFacts(verifyFilled(filled, text), today, listing) : null;
  const modelDeadline = model?.deadline ?? null;
  const modelTeam = model?.team ?? null;
  const eligibility = bothLists(model?.eligibility ?? [], ownEligibility, [
    ...(model?.rules ?? []),
    ...(model?.checklist ?? []).map(({ source }) => source),
  ]);
  const modelEligibility = eligibility.filter((sentence) => !ownEligibility.includes(sentence));
  const modelItems = (model?.checklist ?? []).filter((item) => !ownChecklist.some((own) => own.id === item.id));
  const modelJudging = model?.judging ?? null;
  const modelPrizes = model?.prizes ?? [];
  const tracks = model?.tracks ?? [];
  const rules = model?.rules ?? [];

  const dates = modelDeadline ? byDate([...ownDates.filter((date) => date.kind !== "submission"), modelDeadline]) : ownDates;
  const deadline = modelDeadline ?? ownDeadline;
  // The coach's own reading found a different deadline in the rules: shown as a warning, not a second deadline.
  const otherDeadline = modelDeadline && ownDeadline && !ownDeadline.fromListing && ownDeadline.date !== modelDeadline.date ? ownDeadline : null;
  const judging = modelJudging ?? ownJudging;
  const checklist = [...ownChecklist, ...modelItems];
  const prizes = modelPrizes.length > 0 ? modelPrizes : ownPrizes;
  const modelFound: ModelFact[] = [
    modelDeadline ? "deadline" : null,
    modelTeam ? "team" : null,
    modelEligibility.length > 0 ? "eligibility" : null,
    modelItems.length > 0 ? "checklist" : null,
    modelJudging ? "judging" : null,
    modelPrizes.length > 0 ? "prizes" : null,
    tracks.length > 0 ? "tracks" : null,
    rules.length > 0 ? "rules" : null,
  ].filter((fact): fact is ModelFact => fact !== null);

  const brief = {
    judging,
    strategy: buildStrategy(judging),
    dates,
    deadline,
    daysLeft: deadline ? daysBetween(today, deadline.date) : null,
    team: modelTeam ?? ownTeam,
    eligibility,
    checklist,
    prizes,
    topPrizes: largestPrizes(prizes),
    tracks,
    rules,
    plan: buildPlan(eventStart(dates), deadline, checklist, today),
    modelFound,
  };
  return { ...brief, warnings: warningsFor(brief, truncated, otherDeadline) };
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
