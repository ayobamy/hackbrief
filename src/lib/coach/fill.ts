import { z } from "zod";

import { categorise } from "./categories";
import { toWholePercents, weightsIn, type CriteriaResult, type Criterion, type WeightUnit } from "./criteria";
import { extractDates, lastSentenceBreak, submissionDeadline, type KeyDate } from "./dates";
import { extractDeliverables, type Deliverable } from "./deliverables";
import { weekdayOnListing, type ListingDates } from "./listing";
import { READ_HACKATHON_PLAYBOOK } from "./playbook";
import { extractPrizes, type PrizeLine } from "./prizes";
import { teamSizeIn, type TeamSize } from "./team";

/**
 * A language model's reading of an event's pages (decision D13): each fact with the sentence, or two,
 * it came from. Code keeps a fact only when its sentences are on the pages and code reads the same
 * value from them, so a model's mistake, or text planted in a page, cannot add a fact.
 */
export interface FillAnswer {
  deadline: { date: string | null; time: string | null; evidence: string[] } | null;
  team: { min: number | null; max: number | null; evidence: string[] } | null;
  eligibility: string[];
  submission: string[];
  rules: string[];
  judging: Array<{ name: string; weight: number | null; evidence: string[] }>;
  tracks: Array<{ name: string; evidence: string[] }>;
  prizes: string[];
}

/** A part of the brief a model's reading supplied, in the order the brief shows them. */
export type ModelFact = "deadline" | "team" | "eligibility" | "checklist" | "judging" | "prizes" | "tracks" | "rules";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** Sends the messages with a JSON schema for the answer, and returns the parsed answer. */
export type Ask = (messages: ChatMessage[], schema: typeof FILL_SCHEMA) => Promise<unknown>;

// Enough for a homepage and a few linked pages; a model's context and the cost both stay small.
const MAX_PAGES_TEXT = 60_000;

export const NOTHING_FILLED: FillAnswer = {
  deadline: null,
  team: null,
  eligibility: [],
  submission: [],
  rules: [],
  judging: [],
  tracks: [],
  prizes: [],
};

const MIN_SENTENCE = 12;
// A schedule's day ("Sunday, 14 March") or a rubric line ("Design 30%") is short; code reads its value.
const MIN_EVIDENCE = 6;
const MAX_SENTENCE = 400;
// How far a second sentence may follow the first: a schedule's line below its day.
const MAX_GAP = 1_500;
const MAX_ELIGIBILITY = 4;
const MAX_SUBMISSION = 6;
const MAX_RULES = 5;
const MAX_CRITERIA = 8;
const MAX_TRACKS = 8;
const MAX_PRIZES = 4;

const EVIDENCE = {
  type: "array",
  items: { type: "string" },
  description: "One sentence copied from the pages; two only when the second needs the first, as a schedule's line needs its day.",
} as const;

function sentences(description: string) {
  return { type: "array", items: { type: "string" }, description } as const;
}

/** The answer's shape, as structured outputs take it (strict: every field required). */
export const FILL_SCHEMA = {
  type: "object",
  properties: {
    deadline: {
      anyOf: [
        {
          type: "object",
          properties: {
            date: { type: ["string", "null"], description: "The date as YYYY-MM-DD, or null when the sentences give only a weekday." },
            time: { type: ["string", "null"], description: "The time as written, such as 11:59 PM ET, or null." },
            evidence: EVIDENCE,
          },
          required: ["date", "time", "evidence"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
      description: "The final deadline for submitting projects, not for applying or registering; null when the pages do not give it.",
    },
    team: {
      anyOf: [
        {
          type: "object",
          properties: {
            min: { type: ["integer", "null"] },
            max: { type: ["integer", "null"] },
            evidence: EVIDENCE,
          },
          required: ["min", "max", "evidence"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
      description: "How many people a team may have, as the pages state it; null when they do not say.",
    },
    eligibility: sentences("Up to 4 sentences that say who may take part, not who may win a particular prize."),
    submission: sentences("Up to 6 sentences that say what entrants must hand in, or where."),
    rules: sentences("Up to 5 sentences of rules that change how to compete, such as when code may be written or what may be reused."),
    judging: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "The criterion's name as the pages write it." },
          weight: { type: ["number", "null"], description: "The percent or points the pages give it, or null." },
          evidence: EVIDENCE,
        },
        required: ["name", "weight", "evidence"],
        additionalProperties: false,
      },
      description: "Each judging criterion.",
    },
    tracks: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, evidence: EVIDENCE },
        required: ["name", "evidence"],
        additionalProperties: false,
      },
      description: "Each track, theme or challenge category entrants can choose.",
    },
    prizes: sentences("Up to 4 sentences that give prize amounts."),
  },
  required: ["deadline", "team", "eligibility", "submission", "rules", "judging", "tracks", "prizes"],
  additionalProperties: false,
} as const;

const Evidence = z.array(z.string()).nullish();
const Answer = z.object({
  deadline: z.object({ date: z.string().nullish(), time: z.string().nullish(), evidence: Evidence }).nullish(),
  team: z.object({ min: z.number().int().nullish(), max: z.number().int().nullish(), evidence: Evidence }).nullish(),
  eligibility: z.array(z.string()).nullish(),
  submission: z.array(z.string()).nullish(),
  rules: z.array(z.string()).nullish(),
  judging: z.array(z.object({ name: z.string(), weight: z.number().nullish(), evidence: Evidence })).nullish(),
  tracks: z.array(z.object({ name: z.string(), evidence: Evidence })).nullish(),
  prizes: z.array(z.string()).nullish(),
});

// Pages and models disagree on spaces and on curly quotes, never on words.
function normalise(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** The pages, evened out a line at a time: joined with spaces, the same text as normalise(text), at the same places. */
interface Page {
  lined: string;
  flat: string;
}

function pageOf(text: string): Page {
  const lined = text.split("\n").map(normalise).filter(Boolean).join("\n");
  return { lined, flat: lined.replace(/\n/g, " ") };
}

function sentenceOnPage(sentence: string, page: Page, min = MIN_SENTENCE): string | null {
  const text = normalise(sentence);
  return text.length >= min && text.length <= MAX_SENTENCE && page.flat.includes(text) ? text : null;
}

function allOnPage(list: readonly string[] | null | undefined, page: Page, limit: number): string[] {
  const kept = (list ?? []).map((sentence) => sentenceOnPage(sentence, page)).filter((sentence): sentence is string => sentence !== null);
  return [...new Set(kept)].slice(0, limit);
}

// One sentence, or two where the second follows the first closely, as a schedule's line follows its day.
function evidenceOnPage(evidence: readonly string[] | null | undefined, page: Page): string[] | null {
  const found = (evidence ?? []).map((sentence) => sentenceOnPage(sentence, page, MIN_EVIDENCE));
  const [first, second] = found;
  if (found.length < 1 || found.length > 2 || !first || found.includes(null)) {
    return null;
  }
  if (!second) {
    return [first];
  }
  for (let at = page.flat.indexOf(first); at !== -1; at = page.flat.indexOf(first, at + 1)) {
    const next = page.flat.indexOf(second, at + first.length);
    if (next !== -1 && next - (at + first.length) <= MAX_GAP) {
      return [first, second];
    }
  }
  return null;
}

// A deadline's first sentence is read from the start of its sentence on the page, so one cut down to a date
// ("October 3, 2026") keeps the words that say what the date is for ("Priority deadline October 3, 2026").
function fromSentenceStart(sentence: string, page: Page): string {
  const at = page.flat.indexOf(sentence);
  const lineStart = page.lined.lastIndexOf("\n", at - 1) + 1;
  const lineEnd = page.lined.indexOf("\n", at);
  const line = page.lined.slice(lineStart, lineEnd === -1 ? page.lined.length : lineEnd);
  return `${line.slice(lastSentenceBreak(line, at - lineStart), at - lineStart)}${sentence}`;
}

/** The facts in a model's answer whose sentences are on the pages (`text`); anything else is dropped. */
export function verifyFilled(answer: unknown, text: string): FillAnswer {
  const parsed = Answer.safeParse(answer);
  if (!parsed.success) {
    return NOTHING_FILLED;
  }
  const page = pageOf(text);
  const { deadline, team, eligibility, submission, rules, judging, tracks, prizes } = parsed.data;
  const deadlineEvidence = deadline ? evidenceOnPage(deadline.evidence, page) : null;
  const teamEvidence = team ? evidenceOnPage(team.evidence, page) : null;
  return {
    deadline:
      deadline && deadlineEvidence
        ? {
            date: deadline.date ?? null,
            time: deadline.time ?? null,
            evidence: [fromSentenceStart(deadlineEvidence[0] ?? "", page), ...deadlineEvidence.slice(1)],
          }
        : null,
    team: team && teamEvidence ? { min: team.min ?? null, max: team.max ?? null, evidence: teamEvidence } : null,
    eligibility: allOnPage(eligibility, page, MAX_ELIGIBILITY),
    submission: allOnPage(submission, page, MAX_SUBMISSION),
    rules: allOnPage(rules, page, MAX_RULES),
    judging: (judging ?? [])
      .map(({ name, weight, evidence }) => ({ name: normalise(name), weight: weight ?? null, evidence: evidenceOnPage(evidence, page) }))
      .filter((criterion): criterion is FillAnswer["judging"][number] => criterion.name.length > 0 && criterion.evidence !== null)
      .slice(0, MAX_CRITERIA),
    tracks: (tracks ?? [])
      .map(({ name, evidence }) => ({ name: normalise(name), evidence: evidenceOnPage(evidence, page) }))
      .filter((track): track is FillAnswer["tracks"][number] => track.name.length > 0 && track.evidence !== null)
      .slice(0, MAX_TRACKS),
    prizes: allOnPage(prizes, page, MAX_PRIZES),
  };
}

/** Asks a model to read the brief's facts from an event's pages, and keeps those whose sentences are there. */
export async function fillFacts(text: string, ask: Ask): Promise<FillAnswer> {
  const messages: ChatMessage[] = [
    { role: "system", content: READ_HACKATHON_PLAYBOOK },
    { role: "user", content: `The pages' text, between the markers:\n<<<PAGES\n${text.slice(0, MAX_PAGES_TEXT)}\nPAGES>>>` },
  ];
  return verifyFilled(await ask(messages, FILL_SCHEMA), text);
}

/** The brief's facts as the coach's own code reads them from the checked sentences. */
export interface FilledFacts {
  deadline: KeyDate | null;
  team: TeamSize | null;
  eligibility: string[];
  checklist: Deliverable[];
  rules: string[];
  judging: CriteriaResult | null;
  tracks: Array<{ name: string; source: string }>;
  prizes: PrizeLine[];
}

// "10:00 AM", "10 am" and "10.00am" are one time; anything code cannot read is compared as written.
function sameTime(a: string, b: string): boolean {
  const minutes = (time: string) => {
    const found = /(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s?m\b/i.exec(time);
    return found ? ((Number(found[1]) % 12) + (found[3]?.toLowerCase() === "p" ? 12 : 0)) * 60 + Number(found[2] ?? 0) : time.toLowerCase().replace(/\s+/g, "");
  };
  return minutes(a) === minutes(b);
}

// The pages' words say what a date is for: the sentences give the deadline only where code reads a
// submission date in them, the date the model gave, so an application deadline or a bare date gives none.
function deadlineFrom(found: NonNullable<FillAnswer["deadline"]>, today: string, listing: ListingDates | undefined): KeyDate | null {
  const sentence = found.evidence.join(" ");
  const dates = extractDates(sentence, today);
  const read = dates.length > 0 ? submissionDeadline(dates) : listing ? weekdayOnListing(sentence, listing) : null;
  if (!read || (found.date !== null && read.date !== found.date)) {
    return null;
  }
  if (found.time !== null && read.time !== null && !sameTime(found.time, read.time)) {
    return null;
  }
  return { ...read, label: "Submission deadline", source: sentence };
}

function teamFrom(found: NonNullable<FillAnswer["team"]>): TeamSize | null {
  const read = teamSizeIn(found.evidence.join(" "));
  const agrees = read && (found.min === null || read.min === found.min) && (found.max === null || read.max === found.max);
  return agrees ? read : null;
}

function includesName(name: string, evidence: readonly string[]): boolean {
  return evidence.join(" ").toLowerCase().includes(name.toLowerCase());
}

const TRACK_WORDS = /\b(?:tracks?|challenges?|themes?|categor(?:y|ies)|prizes?|awards?)\b/i;
const WORDS_BEYOND_NAME = 3;

// A track's sentence must say more than its name, or call it a track: a sponsor list names companies, not tracks.
function isTrack(name: string, evidence: readonly string[]): boolean {
  const sentence = evidence.join(" ");
  const rest = sentence.toLowerCase().replace(name.toLowerCase(), " ").split(/\W+/).filter(Boolean);
  return includesName(name, evidence) && (TRACK_WORDS.test(sentence) || rest.length >= WORDS_BEYOND_NAME);
}

// A rule says what entrants must, may or must not do; a date and venue line, or a description of what a
// hackathon is, says none of that.
const RULE_WORDS =
  /\b(?:must|may|can|cannot|can't|allowed|permitted|required|requires?|only|not|no|never|prohibited|disqualif\w*|use|using|before|until)\b/i;

// Every criterion's name must be in its sentence, and every weight the model gave must be the one code
// reads there; one weight read wrong makes the rest doubtful, so then the judging is left to the parser.
function judgingFrom(found: FillAnswer["judging"]): CriteriaResult | null {
  const criteria: Array<{ name: string; stated: number | null; unit: WeightUnit }> = [];
  for (const { name, weight, evidence } of found) {
    if (!includesName(name, evidence)) {
      continue;
    }
    const stated = weightsIn(evidence.join(" "))[0];
    if (weight !== null && stated?.value !== weight) {
      return null;
    }
    criteria.push({ name, stated: weight === null ? null : weight, unit: weight === null ? "none" : (stated?.unit ?? "none") });
  }
  if (criteria.length === 0) {
    return null;
  }
  const weighted = criteria.every(({ stated }) => stated !== null);
  const unit: WeightUnit = weighted ? (criteria.some(({ unit }) => unit === "points") ? "points" : "percent") : "none";
  const weights = toWholePercents(criteria.map(({ stated }) => (weighted ? (stated ?? 0) : 1)));
  return {
    criteria: criteria.map(({ name, stated }, index): Criterion => ({
      name,
      category: categorise(name),
      weight: weights[index] ?? 0,
      stated: weighted ? stated : null,
    })),
    unit,
    statedTotal: weighted ? criteria.reduce((sum, { stated }) => sum + (stated ?? 0), 0) : null,
  };
}

/** Reads the checked facts with the coach's parsers, each under the heading it was found for. */
export function filledFacts(filled: FillAnswer, today: string, listing?: ListingDates): FilledFacts {
  return {
    deadline: filled.deadline ? deadlineFrom(filled.deadline, today, listing) : null,
    team: filled.team ? teamFrom(filled.team) : null,
    eligibility: filled.eligibility,
    checklist: filled.submission.length > 0 ? extractDeliverables(["What to submit", ...filled.submission].join("\n")) : [],
    rules: filled.rules.filter((rule) => RULE_WORDS.test(rule)),
    judging: filled.judging.length > 0 ? judgingFrom(filled.judging) : null,
    tracks: filled.tracks
      .filter(({ name, evidence }) => isTrack(name, evidence))
      .map(({ name, evidence }) => ({ name, source: evidence.join(" ") })),
    prizes: filled.prizes.length > 0 ? extractPrizes(["Prizes", ...filled.prizes].join("\n")) : [],
  };
}
