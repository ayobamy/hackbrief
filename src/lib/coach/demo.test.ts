import { describe, expect, it } from "vitest";

import { buildBrief } from "./brief";
import { CARDS, cardOf, tagLines } from "./highlight";
import { rubricFrom, START } from "./rubric";
import { SAMPLES } from "./samples";

function sample(id: string): string {
  return SAMPLES.find((candidate) => candidate.id === id)?.text ?? "";
}

describe("tagLines", () => {
  it("tags each line of the Harbour Light rules with what the coach read from it", () => {
    const text = sample("harbour");
    const tagged = tagLines(text, buildBrief(text, "2026-11-02")).filter(
      ({ tag }) => tag,
    );

    expect(tagged.map(({ line, tag }) => [tag, line.slice(0, 32)])).toEqual([
      ["who can enter", "Participants must be at least 18"],
      ["team", "Team size: 2-5 people. Solo entr"],
      ["deadline", "Submissions are due March 7, 202"],
      ["criterion", "| Impact on emissions | 15 point"],
      ["criterion", "| Technical execution | 10 point"],
      ["criterion", "| Use of the Harbour Light API |"],
      ["criterion", "| Design and usability | 5 point"],
      ["to hand in", "Each team must provide a project"],
      ["prize", "Grand prize: USD 8,000. Runner-u"],
    ]);
  });

  it("tags every prize line of a list", () => {
    const text = sample("lagoon");
    const prizes = tagLines(text, buildBrief(text, "2026-11-02"))
      .filter(({ tag }) => tag === "prize")
      .map(({ line }) => line);

    expect(prizes).toEqual([
      "- First place: $3,000",
      "- Second place: $1,500",
      "- Best use of open data: $500",
    ]);
  });

  it("keeps every line, tagged or not, in order", () => {
    const text = sample("kestrel");
    const lines = tagLines(text, buildBrief(text, "2026-11-02"));

    expect(lines.map(({ line }) => line).join("\n")).toBe(text);
    expect(lines.filter(({ tag }) => tag).map(({ tag }) => tag)).toEqual([
      "who can enter",
      "team",
      "deadline",
      "criterion",
      "to hand in",
      "prize",
    ]);
  });
});

describe("cardOf", () => {
  it("files every tag under one of the demo's four cards, in reading order", () => {
    expect(CARDS.map(({ title }) => title)).toEqual([
      "Deadline",
      "Team and prize",
      "Judging criteria",
      "What to submit",
    ]);
    expect(
      (
        [
          "deadline",
          "team",
          "who can enter",
          "prize",
          "criterion",
          "to hand in",
        ] as const
      ).map((tag) => cardOf(tag)),
    ).toEqual([0, 1, 1, 1, 2, 3]);
  });
});

describe("rubricFrom", () => {
  it("passes weights that add up to 100 straight through", () => {
    const rubric = rubricFrom(START);

    expect(rubric.statedTotal).toBe(100);
    expect(
      rubric.criteria.map(({ name, weight, category }) => [
        name,
        weight,
        category,
      ]),
    ).toEqual([
      ["Technical quality", 30, "technical"],
      ["Innovation", 20, "innovation"],
      ["Impact", 25, "impact"],
      ["Presentation", 25, "presentation"],
    ]);
  });

  it("scales other totals to whole percentages that add up to 100", () => {
    const rubric = rubricFrom([50, 20, 25, 25]);

    expect(rubric.statedTotal).toBe(120);
    expect(rubric.criteria.map(({ weight }) => weight)).toEqual([
      42, 16, 21, 21,
    ]);
    expect(rubric.criteria.map(({ stated }) => stated)).toEqual([
      50, 20, 25, 25,
    ]);
  });
});
