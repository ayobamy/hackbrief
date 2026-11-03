// Scores the hackathon-reading playbook and a model against the fictional test pages
// (src/lib/coach/eval/cases.ts): for each page, what hackbrief kept from the model's reading.
// Ahmed runs it with his key: pnpm exec tsx scripts/score-fill.ts [--model=<id>]
// It reads the keys from .env and prints no key, header or request body.
import { existsSync } from "node:fs";

import { EVAL_CASES, EVAL_TODAY } from "@/lib/coach/eval/cases";
import { scoreFacts, type Score, type Verdict } from "@/lib/coach/eval/score";
import { fillFacts, filledFacts } from "@/lib/coach/fill";
import { askInTurn, routersFrom } from "@/lib/model/routers";

const print = (text: string) => process.stdout.write(`${text}\n`);

function verdicts(score: Score): Verdict[] {
  return [score.deadline, score.team, score.judging, score.topPrize];
}

async function main() {
  if (!process.argv.includes("--no-env") && existsSync(".env")) {
    process.loadEnvFile(".env");
  }
  const model = process.argv.find((arg) => arg.startsWith("--model="))?.slice("--model=".length);
  const routers = routersFrom({ ...process.env, ...(model ? { OPENROUTER_MODEL: model } : {}) }).filter(({ name }) => name === "OpenRouter");
  const [router] = routers;
  if (!router) {
    print("No OpenRouter key is set, so there is nothing to score.");
    return;
  }
  print(`Scoring ${router.model} on ${EVAL_CASES.length} test pages\n`);
  const totals: Record<Verdict, number> = { right: 0, wrong: 0, missed: 0, extra: 0 };
  for (const testCase of EVAL_CASES) {
    const started = Date.now();
    try {
      const filled = await fillFacts(testCase.pages, (messages, schema) => askInTurn(routers, messages, schema));
      const score = scoreFacts(testCase.expected, filledFacts(filled, EVAL_TODAY));
      for (const verdict of verdicts(score)) {
        totals[verdict] += 1;
      }
      print(`- ${testCase.name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
      print(`    deadline ${score.deadline} · team ${score.team} · judging ${score.judging} · top prize ${score.topPrize}`);
      print(
        `    who can enter ${score.eligibility.found}/${score.eligibility.expected} · checklist ${score.checklist.found}/${score.checklist.expected} (+${score.checklist.extra}) · tracks ${score.tracks.found}/${score.tracks.expected} (+${score.tracks.extra}) · rules ${score.rules.found}/${score.rules.expected} (+${score.rules.extra})`,
      );
    } catch (error) {
      print(`- ${testCase.name}: the model failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  print(`\nright ${totals.right} · wrong ${totals.wrong} · missed ${totals.missed} · extra ${totals.extra}`);
  if (totals.extra > 0 || totals.wrong > 0) {
    print("Wrong or extra facts would reach students: look at those pages before changing the model or the playbook.");
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
