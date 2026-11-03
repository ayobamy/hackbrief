import { toSentences } from "./text";

// Strong wording counts anywhere; "must be" only when it says what entrants must be ("must be 18", "must
// be enrolled"), not what a project must be ("must be on Devpost"). Weak wording ("students") only inside an eligibility section,
// so "Best student team: $1,000" under Prizes is not read as a rule about who may enter.
const STRONG =
  /\b(?:eligib\w*|open to|must be (?:at least|over|under|aged?|\d{1,2}|a |an |enrolled|currently|registered|students?|residents?|citizens?|members?)|at least \d{1,2} years|\d{1,2} years (?:old|of age)|age of|aged? \d{1,2}|participants? must|only (?:students|residents|citizens))\b/i;
const WEAK = /\b(?:students?|graduates?|residents?|citizens?|employees?|countr(?:y|ies))\b/i;
const ELIGIBILITY_SECTION = /\b(?:eligib\w*|who can|participants?|entry requirements)\b/i;
const PRIZE_SECTION = /\b(?:prizes?|awards?|bount\w*)\b/i;
const MAX_SENTENCES = 6;

/** The sentences of the rules that say who may take part, in the order they appear. */
export function extractEligibility(input: string): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  for (const { text, section } of toSentences(input)) {
    // A FAQ's question ("Am I eligible?") says nothing about who may enter; its answer does.
    const relevant =
      !text.trimEnd().endsWith("?") &&
      !PRIZE_SECTION.test(section) &&
      (STRONG.test(text) || (WEAK.test(text) && ELIGIBILITY_SECTION.test(section)));
    const key = text.toLowerCase();
    if (relevant && text.split(" ").length >= 4 && !seen.has(key)) {
      seen.add(key);
      found.push(text);
    }
    if (found.length === MAX_SENTENCES) {
      break;
    }
  }
  return found;
}
