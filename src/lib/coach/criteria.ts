import { categorise, type CriterionCategory } from "./categories";
import { capitalise, toLines, wordCount, type Line } from "./text";

export type WeightUnit = "percent" | "points" | "none";

export interface Criterion {
  name: string;
  category: CriterionCategory;
  /** Share of the total score in whole percent; the criteria always add up to exactly 100. */
  weight: number;
  /** The number the rules state (percent or points), or null when they give none. */
  stated: number | null;
}

export interface CriteriaResult {
  criteria: Criterion[];
  unit: WeightUnit;
  /** Sum of the stated numbers: 100 for well-formed percentages, the maximum score for points. */
  statedTotal: number | null;
}

interface WeightMatch {
  value: number;
  unit: "percent" | "points";
  index: number;
  length: number;
}

// "pt" alone is left out: it is also a time zone ("5 PT").
const WEIGHT = /(\d{1,3}(?:\.\d+)?)\s?(%|percent\b|per cent\b|points?\b|pts\b)/gi;
const JUDGING_HEADING = /\b(?:judging|judged|criteria|rubric|scoring|scored|evaluation)\b/i;
const FILLER =
  /\b(?:accounts? for|is worth|are worth|worth|weighted at|weighted|weighting|counts? for|makes up|carries|of the (?:total |final |overall )?(?:score|grade|marks?|points?)|of (?:your|the) (?:score|grade))\b/gi;
const LEAD_IN = /\b(?:on|for|by|including|include|includes|are|is|across|between)\b|:/i;
const MAX_NAME_WORDS = 6;

function findWeights(text: string): WeightMatch[] {
  return [...text.matchAll(WEIGHT)].map((match) => ({
    value: Number(match[1]),
    unit: /^p(?:oin)?ts?$/i.test(match[2] ?? "") ? "points" : "percent",
    index: match.index,
    length: match[0].length,
  }));
}

function trimName(text: string): string {
  return text
    .replace(/^[\s()[\]{}:–—\-|,.&]+|[\s()[\]{}:–—\-|,.&]+$/g, "")
    .replace(/^(?:and|or|the)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Words that end the lead-in to a weight rather than the name: "design for 40%".
const TRAILING_LINK = /\s+(?:for|of|at|on|by|is|are|with|gets?|counts?)$/i;

function nameBefore(text: string): string {
  let candidate = trimName(text.replace(FILLER, " ").replace(/\(\s*\)/g, ""));
  while (TRAILING_LINK.test(candidate)) {
    candidate = trimName(candidate.replace(TRAILING_LINK, ""));
  }
  if (wordCount(candidate) > 4) {
    const pieces = candidate.split(LEAD_IN);
    candidate = trimName(pieces[pieces.length - 1] ?? "");
  }
  return candidate;
}

function nameAfter(text: string): string {
  const withoutFiller = trimName(text.replace(FILLER, " "));
  return trimName(withoutFiller.split(/[:.(]|\s[–—-]\s/)[0] ?? "");
}

function isName(name: string): boolean {
  const words = wordCount(name);
  return /\p{L}/u.test(name) && words >= 1 && words <= MAX_NAME_WORDS;
}

// "Projects are scored out of 40 points" states the total, not a criterion.
const TOTAL_BEFORE = /\b(?:out of|total(?:ling)?|in total|maximum(?: of)?|max\.?|up to)\s*$/i;

/** The criterion named in one segment of text around one weight. */
function criterionAt(segment: string, weight: WeightMatch): string | null {
  if (TOTAL_BEFORE.test(segment.slice(0, weight.index))) {
    return null;
  }
  const before = nameBefore(segment.slice(0, weight.index));
  if (isName(before)) {
    return before;
  }
  const after = nameAfter(segment.slice(weight.index + weight.length));
  return isName(after) ? after : null;
}

interface Found {
  name: string;
  value: number;
  unit: "percent" | "points";
}

function criteriaInLine(text: string): Found[] {
  const weights = findWeights(text);
  if (weights.length === 0) {
    return [];
  }
  // Several weights on one line ("impact (40%), execution (30%) and creativity (30%)"): read each
  // comma-, semicolon- or "and"-separated segment on its own.
  const segments = weights.length === 1 ? [text] : text.split(/[;,]|\band\b/i);
  const found: Found[] = [];
  for (const segment of segments) {
    const weight = findWeights(segment)[0];
    if (!weight) {
      continue;
    }
    const name = criterionAt(segment, weight);
    if (name) {
      found.push({ name: capitalise(name), value: weight.value, unit: weight.unit });
    }
  }
  return found;
}

function judgingSection(lines: Line[]): Line[] | null {
  // A heading has no digits, so "Judging: March 8 - 19" in a schedule does not start the section.
  const start = lines.findIndex(
    (line) => JUDGING_HEADING.test(line.text) && wordCount(line.text) <= 6 && !/\d/.test(line.text),
  );
  if (start === -1) {
    return null;
  }
  const section: Line[] = [];
  for (const line of lines.slice(start + 1)) {
    const boundary =
      line.heading && findWeights(line.text).length === 0 && !JUDGING_HEADING.test(line.text);
    if (boundary) {
      break;
    }
    if (line.text) {
      section.push(line);
    }
  }
  return section;
}

/**
 * Whole-number percentages that add up to exactly 100, by the largest-remainder method: each
 * share is rounded down, and the points left over go to the largest fractions, earliest first.
 */
export function toWholePercents(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (values.length === 0 || total <= 0) {
    return values.map(() => 0);
  }
  const exact = values.map((value) => (value / total) * 100);
  const result = exact.map((share) => Math.floor(share));
  let left = 100 - result.reduce((sum, share) => sum + share, 0);
  const byFraction = exact
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of byFraction) {
    if (left === 0) {
      break;
    }
    result[index] = (result[index] ?? 0) + 1;
    left -= 1;
  }
  return result;
}

function dedupe(found: Found[]): Found[] {
  const seen = new Set<string>();
  return found.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function unweightedItems(section: Line[]): string[] {
  const listed = section.some((line) => line.bullet);
  return section
    .filter((line) => (listed ? line.bullet : wordCount(line.text) <= 5))
    .map((line) => trimName(line.text.split(/:|\s[–—-]\s/)[0] ?? ""))
    .filter(isName)
    .map(capitalise);
}

function weighted(found: Found[]): CriteriaResult {
  const percentCount = found.filter((item) => item.unit === "percent").length;
  const unit = percentCount >= found.length - percentCount ? "percent" : "points";
  const items = dedupe(found.filter((item) => item.unit === unit));
  const weights = toWholePercents(items.map((item) => item.value));
  return {
    unit,
    statedTotal: items.reduce((sum, item) => sum + item.value, 0),
    criteria: items.map((item, index) => ({
      name: item.name,
      category: categorise(item.name),
      weight: weights[index] ?? 0,
      stated: item.value,
    })),
  };
}

/**
 * The judging criteria and their weights. Inside a judging section every weighted line counts;
 * elsewhere a weighted line counts only when its name reads like a judging criterion, so that
 * "50% of the prize pool" is not mistaken for one.
 */
export function extractCriteria(input: string): CriteriaResult {
  const lines = toLines(input);
  const section = judgingSection(lines);
  const scope = section ?? lines;
  const found = scope
    .flatMap((line) => criteriaInLine(line.text))
    .filter((item) => section !== null || categorise(item.name) !== "other");

  if (found.length > 0) {
    return weighted(found);
  }

  const names = section ? [...new Set(unweightedItems(section))] : [];
  const weights = toWholePercents(names.map(() => 1));
  return {
    unit: "none",
    statedTotal: null,
    criteria: names.map((name, index) => ({
      name,
      category: categorise(name),
      weight: weights[index] ?? 0,
      stated: null,
    })),
  };
}
