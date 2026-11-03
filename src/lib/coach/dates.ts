import { capitalise, toLines } from "./text";

export type DateKind =
  | "registration"
  | "start"
  | "end"
  | "submission"
  | "judging"
  | "results"
  | "other";

export interface KeyDate {
  label: string;
  kind: DateKind;
  /** The calendar date as written in the rules, YYYY-MM-DD; time zones are not converted. */
  date: string;
  /** The time of day as written ("11:59 PM PT"), or null. */
  time: string | null;
  /** The rules gave no year, so hackbrief assumed the one that keeps the date upcoming. */
  yearAssumed: boolean;
  /** The line of the rules the date came from. */
  source: string;
  /** Not in the rules: hackbrief took it from its listing of the event (`withListingDates`). */
  fromListing?: true;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

const MONTH =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
const YEAR = "(\\d{4})";
const DASH = "\\s*(?:–|—|-|to|until|through|thru)\\s*";

const SHORT_RANGE_MONTH_FIRST = new RegExp(`\\b${MONTH}\\s+${DAY}${DASH}${DAY}\\b(?:,?\\s+${YEAR})?`, "gi");
const SHORT_RANGE_DAY_FIRST = new RegExp(`\\b${DAY}${DASH}${DAY}\\s+(?:of\\s+)?${MONTH}(?:,?\\s+${YEAR})?`, "gi");
const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const MONTH_FIRST = new RegExp(`\\b${MONTH}\\s+${DAY}\\b(?:,?\\s+${YEAR})?`, "gi");
const DAY_FIRST = new RegExp(`\\b${DAY}\\s+(?:of\\s+)?${MONTH}(?:,?\\s+${YEAR})?`, "gi");
const RANGE_GAP = /^\s*(?:–|—|-|to|until|through|thru)\s*$/i;
/** A time of day as rules write it: "11:59 PM PT", "18:00 UTC", "9 AM". */
export const TIME =
  /\b(?:\d{1,2}(?::\d{2})?\s?(?:[aApP]\.[mM]\.|[aApP][mM]\b)|\d{1,2}:\d{2})(?:\s?(?:(?:UTC|GMT)(?:[+-]\d{1,2}(?::?\d{2})?)?|[A-Z]{2,5}\b))?/;

const KIND_RULES: ReadonlyArray<readonly [DateKind, RegExp]> = [
  ["results", /\b(?:winners?|results|announce\w*|awards? ceremony)\b/i],
  ["judging", /\b(?:judging|judges? (?:will|review)|evaluation period)\b/i],
  // A priority or early-bird deadline is for applying, not for handing in the project.
  ["registration", /\b(?:regist\w*|sign[- ]?ups?|applications?|apply|priority deadline|early[- ]?bird|early deadline)\b/i],
  ["submission", /\b(?:submi\w*|deadline|due|closes?|final day)\b/i],
  ["start", /\b(?:starts?|begins?|kick[- ]?off|opening|launch|hacking period|hackathon dates?|runs from|takes place|event dates?)\b/i],
  ["end", /\b(?:ends?|closing)\b/i],
];

interface Found {
  index: number;
  end: number;
  month: number;
  day: number;
  year: number | null;
}

function monthNumber(token: string): number {
  return MONTHS.indexOf(token.slice(0, 3).toLowerCase() as (typeof MONTHS)[number]) + 1;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whole calendar days from `today` to `date` (both YYYY-MM-DD); negative once it has passed. */
export function daysBetween(today: string, date: string): number {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${date}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const moved = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
  return toIsoDate(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

function classify(text: string): DateKind {
  for (const [kind, pattern] of KIND_RULES) {
    if (pattern.test(text)) {
      return kind;
    }
  }
  return "other";
}

function mask(text: string, index: number, length: number): string {
  return text.slice(0, index) + " ".repeat(length) + text.slice(index + length);
}

// "May" is also a verb ("teams may submit"), so a lower-case "may" is not read as a month.
function isMonthToken(token: string): boolean {
  return token !== "may";
}

function collect(line: string): { singles: Found[]; ranges: Array<[Found, Found]> } {
  let rest = line;
  const ranges: Array<[Found, Found]> = [];

  for (const match of line.matchAll(SHORT_RANGE_MONTH_FIRST)) {
    const [whole, month = "", first = "", second = "", year] = match;
    if (!isMonthToken(month)) {
      continue;
    }
    const base = { index: match.index, end: match.index + whole.length, month: monthNumber(month) };
    const yearValue = year ? Number(year) : null;
    ranges.push([
      { ...base, day: Number(first), year: yearValue },
      { ...base, day: Number(second), year: yearValue },
    ]);
    rest = mask(rest, match.index, whole.length);
  }
  for (const match of rest.matchAll(SHORT_RANGE_DAY_FIRST)) {
    const [whole, first = "", second = "", month = "", year] = match;
    if (!isMonthToken(month)) {
      continue;
    }
    const base = { index: match.index, end: match.index + whole.length, month: monthNumber(month) };
    const yearValue = year ? Number(year) : null;
    ranges.push([
      { ...base, day: Number(first), year: yearValue },
      { ...base, day: Number(second), year: yearValue },
    ]);
    rest = mask(rest, match.index, whole.length);
  }

  const singles: Found[] = [];
  for (const match of rest.matchAll(ISO)) {
    const [whole, year = "", month = "", day = ""] = match;
    singles.push({ index: match.index, end: match.index + whole.length, month: Number(month), day: Number(day), year: Number(year) });
    rest = mask(rest, match.index, whole.length);
  }
  for (const match of rest.matchAll(MONTH_FIRST)) {
    const [whole, month = "", day = "", year] = match;
    if (!isMonthToken(month)) {
      continue;
    }
    singles.push({ index: match.index, end: match.index + whole.length, month: monthNumber(month), day: Number(day), year: year ? Number(year) : null });
    rest = mask(rest, match.index, whole.length);
  }
  for (const match of rest.matchAll(DAY_FIRST)) {
    const [whole, day = "", month = "", year] = match;
    if (!isMonthToken(month)) {
      continue;
    }
    singles.push({ index: match.index, end: match.index + whole.length, month: monthNumber(month), day: Number(day), year: year ? Number(year) : null });
    rest = mask(rest, match.index, whole.length);
  }
  singles.sort((a, b) => a.index - b.index);

  // Two full dates joined by a dash or "to" form a range: "Jan 5, 2027 – Feb 1, 2027".
  const lone: Found[] = [];
  for (let i = 0; i < singles.length; i += 1) {
    const current = singles[i];
    const next = singles[i + 1];
    if (current && next && RANGE_GAP.test(line.slice(current.end, next.index))) {
      ranges.push([
        { ...current, year: current.year ?? next.year },
        { ...next, year: next.year ?? current.year },
      ]);
      i += 1;
    } else if (current) {
      lone.push(current);
    }
  }
  return { singles: lone, ranges };
}

function resolveYear(found: Found, today: string): { year: number; assumed: boolean } {
  if (found.year !== null) {
    return { year: found.year, assumed: false };
  }
  const thisYear = Number(today.slice(0, 4));
  // A date more than 30 days in the past is read as next year's.
  const candidate = toIsoDate(thisYear, found.month, found.day);
  return { year: daysBetween(today, candidate) < -30 ? thisYear + 1 : thisYear, assumed: true };
}

const KIND_LABEL: Readonly<Record<DateKind, string>> = {
  registration: "Registration",
  start: "Start",
  end: "End",
  submission: "Submission deadline",
  judging: "Judging",
  results: "Results",
  other: "Date",
};

function tidyLabel(text: string): string {
  let label = text;
  let previous = "";
  // Until nothing changes, because removing a trailing word can expose another ("is open until").
  while (label !== previous) {
    previous = label;
    label = label
      .replace(/\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b,?\s*$/i, "")
      .replace(/[\s:–—\-|,(.]+$/g, "")
      .replace(/\b(?:on|from|by|until|before|is|are|at|opens?|closes?)\s*$/i, "")
      .replace(/^[\s:–—\-|,).]+/g, "")
      .replace(/^(?:and|the|then|while)\s+/i, "")
      .trim();
  }
  label = capitalise(label);
  return label.length > 60 ? `${label.slice(0, 57).trimEnd()}…` : label;
}

function rangeKinds(kind: DateKind): [DateKind, DateKind] {
  switch (kind) {
    case "submission":
      return ["other", "submission"];
    case "registration":
    case "judging":
    case "results":
      return [kind, kind];
    default:
      return ["start", "end"];
  }
}

function toKeyDate(found: Found, extra: Omit<KeyDate, "date" | "yearAssumed">, today: string): KeyDate | null {
  const { year, assumed } = resolveYear(found, today);
  if (!isRealDate(year, found.month, found.day)) {
    return null;
  }
  return { ...extra, date: toIsoDate(year, found.month, found.day), yearAssumed: assumed };
}

interface Entry {
  first: Found;
  last: Found | null;
}

const SENTENCE_BREAK = /[.!?;]\s+(?=\p{Lu})/gu;

/** Where the sentence holding position `before` starts in a line of text. */
export function lastSentenceBreak(text: string, before: number): number {
  let start = 0;
  for (const match of text.slice(0, before).matchAll(SENTENCE_BREAK)) {
    start = match.index + match[0].length;
  }
  return start;
}

function sentenceAround(text: string, index: number): string {
  const start = lastSentenceBreak(text, index);
  SENTENCE_BREAK.lastIndex = 0;
  const rest = text.slice(index);
  const end = rest.search(/[.!?;]\s+(?=\p{Lu})/u);
  return text.slice(start, end === -1 ? text.length : index + end);
}

/**
 * What a date at `index` in a line marks: read from the words before it in its sentence (back to `from`),
 * or, when those name nothing, from the whole sentence.
 */
export function kindAt(text: string, index: number, from = 0): DateKind {
  const ownKind = classify(text.slice(Math.max(from, lastSentenceBreak(text, index)), index));
  return ownKind === "other" ? classify(sentenceAround(text, index)) : ownKind;
}

/**
 * Every date in the rules with what it marks. Each date is read with the words just before it,
 * so "runs from 9 April to 11 April, and the final submission deadline is 11 April" gives a
 * start, an end and a submission deadline rather than three dates of one kind.
 */
export function extractDates(input: string, today: string): KeyDate[] {
  const dates: KeyDate[] = [];
  for (const { text } of toLines(input)) {
    const { singles, ranges } = collect(text);
    const entries: Entry[] = [
      ...singles.map((first) => ({ first, last: null })),
      ...ranges.map(([first, last]) => ({ first, last })),
    ].sort((a, b) => a.first.index - b.first.index);
    let previousEnd = 0;

    entries.forEach((entry, position) => {
      // The words before the date, back to the previous date or the start of its sentence.
      const sentenceStart = lastSentenceBreak(text, entry.first.index);
      const context = text.slice(Math.max(previousEnd, sentenceStart), entry.first.index);
      const kind = kindAt(text, entry.first.index, previousEnd);
      const end = (entry.last ?? entry.first).end;
      const nextStart = entries[position + 1]?.first.index ?? text.length;
      const after = text.slice(end, nextStart);
      const time = TIME.exec(after)?.[0].trim() ?? null;
      const label = tidyLabel(context) || tidyLabel(after.replace(TIME, "")) || KIND_LABEL[kind];
      previousEnd = end;

      if (!entry.last) {
        const date = toKeyDate(entry.first, { label, kind, time, source: text }, today);
        if (date) {
          dates.push(date);
        }
        return;
      }
      const [firstKind, lastKind] = rangeKinds(kind);
      const first = toKeyDate(entry.first, { label: `${label}: first day`, kind: firstKind, time: null, source: text }, today);
      const last = toKeyDate(entry.last, { label: `${label}: last day`, kind: lastKind, time, source: text }, today);
      if (first && last && last.date < first.date && entry.last.year === null) {
        last.date = toIsoDate(Number(last.date.slice(0, 4)) + 1, entry.last.month, entry.last.day);
      }
      dates.push(...[first, last].filter((date): date is KeyDate => date !== null));
    });
  }
  return dates.sort((a, b) => a.date.localeCompare(b.date));
}

/** The final submission deadline: the latest date marked as a submission date. */
export function submissionDeadline(dates: readonly KeyDate[]): KeyDate | null {
  const submissions = dates.filter((date) => date.kind === "submission");
  return submissions[submissions.length - 1] ?? null;
}

/** When the hackathon itself starts, if the rules say. */
export function eventStart(dates: readonly KeyDate[]): KeyDate | null {
  return dates.find((date) => date.kind === "start") ?? null;
}
