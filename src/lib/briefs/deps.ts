import { chooseLinks } from "@/lib/coach/choose";
import { fillFacts } from "@/lib/coach/fill";
import { askInTurn, routersFrom } from "@/lib/model/routers";
import { readEventPage, type Fetcher } from "@/lib/rules/read";

import type { BuildDeps } from "./build";

// A model picks the site's pages worth reading in a few seconds; reading them takes longer (decision D13).
const CHOOSE_TIMEOUT_MS = 15_000;
const FILL_TIMEOUT_MS = 45_000;

/**
 * What building a brief needs, from the environment: the page reader, and the model's two steps when a
 * key is set (decision D13). The same for the daily build and for a visitor's click.
 */
export function briefDepsFrom(
  env: Readonly<Record<string, string | undefined>>,
  { fetch, today, now }: { fetch: Fetcher; today: string; now: Date },
): BuildDeps {
  const routers = routersFrom(env);
  const ask = (timeoutMs: number) => (messages: Parameters<typeof askInTurn>[1], schema: object) =>
    askInTurn(routers, messages, schema, { timeoutMs });
  const model = routers.length > 0;
  return {
    read: (url, { choose }) => readEventPage(url, { fetch, choose }),
    choose: model ? (links) => chooseLinks(links, ask(CHOOSE_TIMEOUT_MS)) : undefined,
    fill: model ? (text) => fillFacts(text, ask(FILL_TIMEOUT_MS)) : undefined,
    model: routers[0]?.model ?? null,
    today,
    now,
  };
}
