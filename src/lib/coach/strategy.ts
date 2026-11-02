import type { CriterionCategory } from "./categories";
import type { CriteriaResult, Criterion } from "./criteria";

export type Emphasis = "focus" | "steady" | "light";

export interface StrategyNote {
  criterion: string;
  weight: number;
  emphasis: Emphasis;
  text: string;
}

// At or above this share a criterion is a focus; at or below LIGHT it gets the minimum effort.
const FOCUS_SHARE = 25;
const LIGHT_SHARE = 10;

const ADVICE: Readonly<Record<CriterionCategory, string>> = {
  technical: "spend the time on a reliable demo path and clear code, not on extra features",
  innovation: "make the new part obvious in the first minute of the demo, and say what existing tools miss",
  impact: "name a real user and their problem, and show measured results for the difference you make",
  design: "polish the one flow the judges will see; a consistent, readable screen beats extra screens",
  presentation: "rehearse the pitch, keep the video inside the limit, and open with the problem, not the stack",
  theme: "use the theme or the sponsor's technology where judges can see it, and say so in the demo and README",
  completeness: "a smaller project that works end to end beats a bigger one that half works",
  other: "check what the rules say judges look for here, and show it explicitly",
};

function emphasisFor(criterion: Criterion, top: number): Emphasis {
  if (criterion.weight === top || criterion.weight >= FOCUS_SHARE) {
    return "focus";
  }
  return criterion.weight <= LIGHT_SHARE ? "light" : "steady";
}

function noteFor(criterion: Criterion, emphasis: Emphasis): string {
  if (emphasis === "light") {
    return `${criterion.name} is only ${criterion.weight}%: do enough not to lose points here, then move on.`;
  }
  return `${criterion.name} is ${criterion.weight}%: ${ADVICE[criterion.category]}.`;
}

/** Strategy notes for each criterion, heaviest first, with the weights computed in code. */
export function buildStrategy(result: CriteriaResult): StrategyNote[] {
  const sorted = [...result.criteria].sort((a, b) => b.weight - a.weight);
  const top = sorted[0]?.weight ?? 0;
  return sorted.map((criterion) => {
    const emphasis = result.unit === "none" ? "steady" : emphasisFor(criterion, top);
    return {
      criterion: criterion.name,
      weight: criterion.weight,
      emphasis,
      text: noteFor(criterion, emphasis),
    };
  });
}
