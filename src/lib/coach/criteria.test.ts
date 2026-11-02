import { describe, expect, it } from "vitest";

import { categorise } from "./categories";
import { extractCriteria, toWholePercents } from "./criteria";

describe("toWholePercents", () => {
  it("keeps shares that are already whole", () => {
    expect(toWholePercents([30, 20, 25, 25])).toEqual([30, 20, 25, 25]);
  });

  it("scales points to percentages that add up to exactly 100", () => {
    const shares = toWholePercents([15, 10, 10, 5]);

    expect(shares).toEqual([38, 25, 25, 12]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
  });

  it("gives the leftover points to the largest fractions, earliest first", () => {
    expect(toWholePercents([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("returns zeros when there is nothing to share", () => {
    expect(toWholePercents([0, 0])).toEqual([0, 0]);
    expect(toWholePercents([])).toEqual([]);
  });
});

describe("categorise", () => {
  it.each([
    ["Technical quality", "technical"],
    ["Use of the sponsor API", "theme"],
    ["Demo and pitch", "presentation"],
    ["User experience", "design"],
    ["Creativity", "innovation"],
    ["Social impact", "impact"],
    ["Completeness", "completeness"],
    ["Vibes", "other"],
  ])("puts %s under %s", (name, category) => {
    expect(categorise(name)).toBe(category);
  });
});

describe("extractCriteria", () => {
  it("reads percentages in brackets under a judging heading", () => {
    const result = extractCriteria(`## Judging criteria
- Technical quality (30%): does it work?
- Innovation (20%): is it new?
- Impact (25%)
- Presentation (25%)

## Prizes
- First place: $3,000`);

    expect(result.unit).toBe("percent");
    expect(result.statedTotal).toBe(100);
    expect(result.criteria.map(({ name, weight, category }) => [name, weight, category])).toEqual([
      ["Technical quality", 30, "technical"],
      ["Innovation", 20, "innovation"],
      ["Impact", 25, "impact"],
      ["Presentation", 25, "presentation"],
    ]);
  });

  it("reads a points table and skips the line that states the total", () => {
    const result = extractCriteria(`JUDGING
Projects are scored out of 40 points:
| Criterion | Points |
| Impact on emissions | 15 points |
| Technical execution | 10 points |
| Use of the Harbour Light API | 10 points |
| Design and usability | 5 points |

SUBMISSION REQUIREMENTS
Each team must provide a video.`);

    expect(result.unit).toBe("points");
    expect(result.statedTotal).toBe(40);
    expect(result.criteria.map(({ name, stated, weight }) => [name, stated, weight])).toEqual([
      ["Impact on emissions", 15, 38],
      ["Technical execution", 10, 25],
      ["Use of the Harbour Light API", 10, 25],
      ["Design and usability", 5, 12],
    ]);
  });

  it("reads several criteria from one sentence of prose", () => {
    const result = extractCriteria(
      "Judges will score projects on impact (40 percent), technical execution (30 percent) and creativity (30 percent).",
    );

    expect(result.criteria.map(({ name, weight }) => [name, weight])).toEqual([
      ["Impact", 40],
      ["Technical execution", 30],
      ["Creativity", 30],
    ]);
  });

  it("reads the name after the weight and drops filler words", () => {
    const result = extractCriteria(`Scoring
30% – Innovation and originality. Is it new?
Impact accounts for 70 percent of the score`);

    expect(result.criteria.map(({ name, weight }) => [name, weight])).toEqual([
      ["Innovation and originality", 30],
      ["Impact", 70],
    ]);
  });

  it("scales weights that do not add up to 100 and reports what they added up to", () => {
    const result = extractCriteria(`Judging
- Technical (40%)
- Design (35%)
- Impact (20%)`);

    expect(result.statedTotal).toBe(95);
    expect(result.criteria.map(({ weight }) => weight)).toEqual([42, 37, 21]);
  });

  it("outside a judging section, ignores percentages that are not about judging", () => {
    const result = extractCriteria(`Half the prize pool, 50% of it, goes to the winner.
Teams keep 100% of their code.
Technical quality counts for 60% and design for 40%.`);

    expect(result.criteria.map(({ name, weight }) => [name, weight])).toEqual([
      ["Technical quality", 60],
      ["Design", 40],
    ]);
  });

  it("treats criteria listed without weights as equal", () => {
    const result = extractCriteria(`Judging criteria
- Innovation: is the idea new?
- Technical difficulty
- Design

Prizes
First place wins a trophy.`);

    expect(result.unit).toBe("none");
    expect(result.statedTotal).toBeNull();
    expect(result.criteria.map(({ name, weight, stated }) => [name, weight, stated])).toEqual([
      ["Innovation", 34, null],
      ["Technical difficulty", 33, null],
      ["Design", 33, null],
    ]);
  });

  it("reads short unlisted lines in a judging section when there are no bullets", () => {
    const result = extractCriteria(`Judging
Creativity
Usefulness`);

    expect(result.criteria.map(({ name }) => name)).toEqual(["Creativity", "Usefulness"]);
  });

  it("does not start the judging section at a schedule line", () => {
    const result = extractCriteria(`Judging: March 8 - 19, 2027

Rubric
- Impact (50%)
- Design (50%)`);

    expect(result.criteria.map(({ name }) => name)).toEqual(["Impact", "Design"]);
  });

  it("counts a criterion named twice only once, and keeps the more common unit", () => {
    const result = extractCriteria(`Judging
- Impact (50%)
- Design (50%)
- Impact (50%)
- Bonus: 5 points`);

    expect(result.unit).toBe("percent");
    expect(result.criteria.map(({ name }) => name)).toEqual(["Impact", "Design"]);
  });

  it("returns nothing when the rules have no judging criteria", () => {
    expect(extractCriteria("Bring a laptop and snacks.")).toEqual({ unit: "none", statedTotal: null, criteria: [] });
  });
});
