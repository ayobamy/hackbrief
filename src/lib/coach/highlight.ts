import type { Brief } from "./brief";

export type Tag = "deadline" | "criterion" | "to hand in" | "team" | "who can enter";

/** Each line of the pasted rules, tagged with what the coach read from it, if anything. */
export function tagLines(
  text: string,
  brief: Brief,
): Array<{ line: string; tag: Tag | null }> {
  const weighted = /\d\s?(?:%|percent|points?|pts)/i;
  return text.split("\n").map((line) => {
    const has = (fragment: string | null | undefined) =>
      Boolean(fragment) && line.includes(fragment ?? "");
    let tag: Tag | null = null;
    if (has(brief.deadline?.source)) {
      tag = "deadline";
    } else if (
      weighted.test(line) &&
      brief.judging.criteria.some((criterion) =>
        line.toLowerCase().includes(criterion.name.toLowerCase()),
      )
    ) {
      tag = "criterion";
    } else if (brief.checklist.some((item) => has(item.source))) {
      tag = "to hand in";
    } else if (has(brief.team?.source)) {
      tag = "team";
    } else if (brief.eligibility.some((sentence) => has(sentence))) {
      tag = "who can enter";
    }
    return { line, tag };
  });
}
