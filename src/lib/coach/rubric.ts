import { categorise } from "./categories";
import { toWholePercents, type CriteriaResult } from "./criteria";

// A fictional rubric for the landing page's playground; what it shows comes from the coach's own functions.
export const CRITERIA = ["Technical quality", "Innovation", "Impact", "Presentation"] as const;
export const START = [30, 20, 25, 25];

/** Builds the coach's input from the weights a rubric states, as extractCriteria would. */
export function rubricFrom(stated: readonly number[]): CriteriaResult {
  const weights = toWholePercents(stated);
  return {
    unit: "percent",
    statedTotal: stated.reduce((sum, value) => sum + value, 0),
    criteria: CRITERIA.map((name, index) => ({
      name,
      category: categorise(name),
      weight: weights[index] ?? 0,
      stated: stated[index] ?? 0,
    })),
  };
}
