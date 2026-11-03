import { toSentences } from "./text";

export interface TeamSize {
  min: number | null;
  max: number | null;
  /** Whether people may take part on their own; null when the rules do not say. */
  soloAllowed: boolean | null;
  /** The sentence the team size came from. */
  source: string;
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const N = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)";
const PEOPLE = "(?:team\\s+)?(?:members?|people|persons?|participants?|hackers?|individuals?)";
const RANGE_TO = "\\s*(?:to|-|–|—|and)\\s*";

const RANGE_PATTERNS = [
  new RegExp(`\\bteams?\\s+(?:of|between)\\s+${N}${RANGE_TO}${N}\\b`, "i"),
  new RegExp(`\\bteam size\\b[^.\\d]*?${N}${RANGE_TO}${N}\\b`, "i"),
  new RegExp(`\\b${N}${RANGE_TO}${N}\\s+${PEOPLE}`, "i"),
];
const MAX_PATTERNS = [
  new RegExp(`\\bteams?\\s+of\\s+(?:up to|at most|no more than|a maximum of|maximum|max\\.?)\\s+${N}\\b`, "i"),
  // "A team of four (or fewer)".
  new RegExp(`\\bteams?\\s+of\\s+${N}\\s*\\(?\\s*or\\s+(?:fewer|less|smaller)\\b`, "i"),
  new RegExp(`\\b(?:up to|maximum of|max(?:imum)?\\.?|no more than|at most)\\s+${N}\\s+${PEOPLE}`, "i"),
  new RegExp(`\\bteam size\\b[^.\\d]*?(?:up to|max(?:imum)?\\.?|at most)?\\s*${N}\\b`, "i"),
];
const MIN_PATTERN = new RegExp(`\\b(?:minimum of|at least)\\s+${N}\\s+${PEOPLE}`, "i");
const SOLO =
  /\b(?:individuals? or teams?|individuals? (?:are|may|can)|solo|on your own|by yourself|individually|teams? of one|participate alone)\b/i;
const NEGATION = /\b(?:not|no|cannot|can't|won't)\b/i;
const TEAM_TOPIC = /\bteams?\b|\bsolo\b|\bindividual/i;

function toNumber(token: string | undefined): number | null {
  if (!token) {
    return null;
  }
  const word = NUMBER_WORDS[token.toLowerCase()];
  return word ?? (/^\d+$/.test(token) ? Number(token) : null);
}

function sizeIn(sentence: string): Omit<TeamSize, "soloAllowed" | "source"> | null {
  for (const pattern of RANGE_PATTERNS) {
    const match = pattern.exec(sentence);
    const low = toNumber(match?.[1]);
    const high = toNumber(match?.[2]);
    if (low !== null && high !== null && low <= high) {
      return { min: low, max: high };
    }
  }
  for (const pattern of MAX_PATTERNS) {
    const max = toNumber(pattern.exec(sentence)?.[1]);
    if (max !== null) {
      return { min: toNumber(MIN_PATTERN.exec(sentence)?.[1]), max };
    }
  }
  const min = toNumber(MIN_PATTERN.exec(sentence)?.[1]);
  return min === null ? null : { min, max: null };
}

function withSolo(size: Omit<TeamSize, "soloAllowed" | "source">, soloStated: boolean | null, source: string): TeamSize {
  // A stated minimum settles it: 1 allows solo entries, 2 or more rules them out.
  const soloAllowed = size.min === null ? soloStated : size.min === 1;
  return { min: size.min ?? (soloAllowed ? 1 : null), max: size.max, soloAllowed, source };
}

/** The team size one sentence states, whatever it calls a team ("squads of up to four people"). */
export function teamSizeIn(sentence: string): TeamSize | null {
  const size = sizeIn(sentence);
  return size ? withSolo(size, SOLO.test(sentence) ? !NEGATION.test(sentence) : null, sentence) : null;
}

/** The team size the rules allow, or null when they do not say. */
export function extractTeamSize(input: string): TeamSize | null {
  const sentences = toSentences(input)
    .map((sentence) => sentence.text)
    .filter((sentence) => TEAM_TOPIC.test(sentence));
  // "Individuals are welcome" allows solo entries; "Solo entries are not accepted" rules them out.
  const soloSentence = sentences.find((sentence) => SOLO.test(sentence));
  const soloStated = soloSentence === undefined ? null : !NEGATION.test(soloSentence);
  for (const sentence of sentences) {
    const size = sizeIn(sentence);
    if (size) {
      return withSolo(size, soloStated, sentence);
    }
  }
  if (soloSentence === undefined) {
    return null;
  }
  return { min: soloStated ? 1 : null, max: null, soloAllowed: soloStated, source: soloSentence };
}
