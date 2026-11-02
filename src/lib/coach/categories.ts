export type CriterionCategory =
  | "theme"
  | "presentation"
  | "design"
  | "innovation"
  | "impact"
  | "technical"
  | "completeness"
  | "other";

// Checked in this order, so "use of the sponsor API" is theme rather than technical, and "demo
// and pitch" is presentation rather than completeness.
const KEYWORDS: ReadonlyArray<readonly [CriterionCategory, RegExp]> = [
  ["theme", /\b(?:theme|relevance|relevant|track|sponsor|use of|challenge fit|alignment)\b/i],
  ["presentation", /\b(?:presentation|pitch|demo|video|communication|storytelling|clarity)\b/i],
  ["design", /\b(?:design|ux|ui|user experience|usability|polish|accessibility|interface)\b/i],
  ["innovation", /\b(?:innovation|innovative|originality|creativity|creative|novelty|uniqueness|idea)\b/i],
  [
    "impact",
    /\b(?:impact|usefulness|useful|value|potential|practicality|feasibility|viability|scalability|market|social good)\b/i,
  ],
  [
    "technical",
    /\b(?:technical|technology|implementation|complexity|execution|functionality|code|engineering|quality|difficulty)\b/i,
  ],
  ["completeness", /\b(?:completeness|completion|complete|working prototype|finished)\b/i],
];

export function categorise(name: string): CriterionCategory {
  for (const [category, pattern] of KEYWORDS) {
    if (pattern.test(name)) {
      return category;
    }
  }
  return "other";
}
