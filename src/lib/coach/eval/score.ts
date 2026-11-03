import type { FilledFacts } from "../fill";
import { largestPrizes } from "../prizes";
import type { Expected } from "./cases";

/** How one fact compares with a good reading: "extra" is the worst, a fact the pages do not give. */
export type Verdict = "right" | "wrong" | "missed" | "extra";

export interface Score {
  deadline: Verdict;
  team: Verdict;
  judging: Verdict;
  topPrize: Verdict;
  /** Expected words found in kept sentences, out of those expected. */
  eligibility: { found: number; expected: number };
  checklist: { found: number; expected: number; extra: number };
  tracks: { found: number; expected: number; extra: number };
  /** Expected words found in kept rules, and kept rules that match none of them. */
  rules: { found: number; expected: number; extra: number };
}

function compare<T, U>(expected: T | null, got: U | null, same: (expected: T, got: U) => boolean): Verdict {
  if (expected === null) {
    return got === null ? "right" : "extra";
  }
  if (got === null) {
    return "missed";
  }
  return same(expected, got) ? "right" : "wrong";
}

const plain = (text: string) => text.toLowerCase().replace(/\s+/g, "");

function listScore(expected: readonly string[], got: readonly string[]) {
  const wanted = new Set(expected.map(plain));
  const found = got.filter((item) => wanted.has(plain(item))).length;
  return { found, expected: expected.length, extra: got.length - found };
}

/** Scores the facts hackbrief kept from a model's reading against what a good reading finds. */
export function scoreFacts(expected: Expected, facts: FilledFacts): Score {
  const top = largestPrizes(facts.prizes).sort((a, b) => b.value - a.value)[0] ?? null;
  return {
    deadline: compare(
      expected.deadline,
      facts.deadline,
      (want, got) => want.date === got.date && (want.time === null || plain(want.time) === plain(got.time ?? "")),
    ),
    team: compare(expected.team, facts.team, (want, got) => want.min === got.min && want.max === got.max),
    judging: compare(
      expected.judging.length > 0 ? expected.judging : null,
      facts.judging,
      (want, got) =>
        want.length === got.criteria.length &&
        want.every(({ name, weight }, index) => {
          const criterion = got.criteria[index];
          return criterion !== undefined && plain(criterion.name) === plain(name) && criterion.stated === weight;
        }),
    ),
    topPrize: compare(expected.topPrize, top, (want, got) => want.currency === got.currency && want.value === got.value),
    eligibility: {
      found: expected.eligibility.filter((words) => facts.eligibility.some((sentence) => sentence.toLowerCase().includes(words.toLowerCase())))
        .length,
      expected: expected.eligibility.length,
    },
    checklist: listScore(expected.checklist, facts.checklist.map(({ id }) => id)),
    tracks: listScore(expected.tracks, facts.tracks.map(({ name }) => name)),
    rules: {
      found: expected.rules.filter((words) => facts.rules.some((rule) => rule.toLowerCase().includes(words.toLowerCase()))).length,
      expected: expected.rules.length,
      extra: facts.rules.filter((rule) => !expected.rules.some((words) => rule.toLowerCase().includes(words.toLowerCase()))).length,
    },
  };
}
