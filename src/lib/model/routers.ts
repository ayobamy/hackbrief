import { z } from "zod";

import type { ChatMessage } from "@/lib/coach/fill";

/**
 * An OpenAI-compatible chat-completions router hackbrief may ask to point to facts on a page
 * (decision D12). OpenRouter goes first; Requesty is the fallback when a model fails or is limited.
 */
export interface Router {
  name: "OpenRouter" | "Requesty";
  endpoint: string;
  apiKey: string;
  model: string;
  /** Headers this router alone takes. */
  headers: Readonly<Record<string, string>>;
  /** Body fields this router alone takes. */
  body: Readonly<Record<string, unknown>>;
}

/**
 * The OpenRouter model used unless OPENROUTER_MODEL names another (decision D13): on live runs over the
 * listed events' pages it quoted whole, correct sentences where free models failed or quoted fragments.
 * It is paid, so the key needs credits; some of its endpoints keep no data, which the zdr setting requires.
 */
export const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

const TIMEOUT_MS = 20_000;
// A busy provider often answers a moment later; with only endpoints that keep no data allowed, there are few to fall back on.
const RETRY_DELAY_MS = 1_500;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** A router's failure, and whether trying it once more may help: a rate limit or a server error, not a refusal. */
class RouterError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
// A reasoning model's thinking counts towards this, and the longest answer hackbrief keeps is near 2,000 tokens.
const MAX_TOKENS = 6_000;

function setting(env: Readonly<Record<string, string | undefined>>, name: string): string | null {
  return env[name]?.trim() || null;
}

/** The routers whose settings are complete, in the order they are tried: OpenRouter, then Requesty. */
export function routersFrom(env: Readonly<Record<string, string | undefined>>): Router[] {
  const routers: Router[] = [];
  const openRouterKey = setting(env, "OPENROUTER_API_KEY");
  if (openRouterKey) {
    routers.push({
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openRouterKey,
      model: setting(env, "OPENROUTER_MODEL") ?? OPENROUTER_DEFAULT_MODEL,
      // OpenRouter's app attribution headers (openrouter.ai/docs/api-reference/overview).
      headers: { "http-referer": "https://hackbrief.dev", "x-title": "hackbrief" },
      // Only endpoints that keep no data and do not train on it, and that take the JSON schema (D13):
      // openrouter.ai/docs/features/provider-routing.
      body: { provider: { zdr: true, data_collection: "deny", require_parameters: true } },
    });
  }
  const requestyKey = setting(env, "REQUESTY_API_KEY");
  const requestyModel = setting(env, "REQUESTY_MODEL");
  // No default model: free models there come and go, so the setting names one or a fallback policy.
  if (requestyKey && requestyModel) {
    routers.push({
      name: "Requesty",
      endpoint: "https://router.requesty.ai/v1/chat/completions",
      apiKey: requestyKey,
      model: requestyModel,
      headers: {},
      body: {},
    });
  }
  return routers;
}

const Problem = z.object({ message: z.string().nullish() }).nullish();
const Reply = z.object({
  error: Problem,
  choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }).nullish(), error: Problem })).nullish(),
});

// Some models wrap JSON in a Markdown code fence even when asked for JSON.
function withoutFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

function parseJson(text: string, failure: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(failure);
  }
}

/** Sends the messages to one router and returns the JSON its model answered, in `schema`'s shape. */
export async function chatJson(
  router: Router,
  messages: readonly ChatMessage[],
  schema: object,
  { fetchImpl = fetch, timeoutMs = TIMEOUT_MS }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<unknown> {
  const response = await fetchImpl(router.endpoint, {
    method: "POST",
    headers: { ...router.headers, authorization: `Bearer ${router.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      ...router.body,
      model: router.model,
      messages,
      // No sampling setting: providers disagree on them, and a setting a provider does not take rules it out. Every
      // quote is checked against the page, so a model's own randomness cannot add a fact.
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_schema", json_schema: { name: "answer", strict: true, schema } },
    }),
    // The request carries the key, so it follows no redirect (as fetchSource does).
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const reply = Reply.safeParse(parseJson(await response.text(), `${router.name} answered HTTP ${response.status} without JSON`));
  const body = reply.success ? reply.data : {};
  const problem = body.error ?? body.choices?.[0]?.error;
  if (!response.ok) {
    throw new RouterError(
      `${router.name} answered HTTP ${response.status}${problem?.message ? `: ${problem.message}` : ""}`,
      RETRYABLE.has(response.status),
    );
  }
  if (problem) {
    throw new Error(`${router.name}: ${problem.message ?? "an unnamed error"}`);
  }
  const text = body.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`${router.name} answered without content`);
  }
  return parseJson(withoutFence(text), `${router.name}'s model answered without JSON`);
}

/** Asks each router in turn and returns the first answer; fails only when every one has failed. */
export async function askInTurn(
  routers: readonly Router[],
  messages: readonly ChatMessage[],
  schema: object,
  { retryDelayMs = RETRY_DELAY_MS, ...options }: { fetchImpl?: typeof fetch; timeoutMs?: number; retryDelayMs?: number } = {},
): Promise<unknown> {
  if (routers.length === 0) {
    throw new Error("No language model is set up");
  }
  const reasons: string[] = [];
  for (const router of routers) {
    try {
      return await chatJson(router, messages, schema, options);
    } catch (error) {
      if (!(error instanceof RouterError && error.retryable)) {
        reasons.push(error instanceof Error ? error.message : String(error));
        continue;
      }
    }
    // Busy or broken for a moment: once more, then the next router.
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    try {
      return await chatJson(router, messages, schema, options);
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Every model failed: ${reasons.join("; ")}`);
}
