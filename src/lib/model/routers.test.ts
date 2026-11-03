import { describe, expect, it } from "vitest";

import { askInTurn, chatJson, OPENROUTER_DEFAULT_MODEL, routersFrom, type Router } from "./routers";

const MESSAGES = [
  { role: "system" as const, content: "Find sentences." },
  { role: "user" as const, content: "Page text." },
];
const SCHEMA = { type: "object", properties: {}, required: [], additionalProperties: false };
const [OPENROUTER, REQUESTY] = routersFrom({
  OPENROUTER_API_KEY: "or-test-key",
  REQUESTY_API_KEY: "rq-test-key",
  REQUESTY_MODEL: "policy/fictional-free",
}) as [Router, Router];

interface Sent {
  url: string;
  init: RequestInit;
}

type Answer = { status: number; body: unknown };

/** A fake network: each endpoint answers with its own status and body, and every request is kept. */
function fakeFetch(answers: Record<string, Answer>): { fetchImpl: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    sent.push({ url, init });
    const answer = answers[new URL(url).host] ?? { status: 404, body: { error: { message: "Not found" } } };
    return new Response(typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body), { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, sent };
}

function content(text: string): Answer {
  return { status: 200, body: { choices: [{ message: { role: "assistant", content: text } }] } };
}

describe("routersFrom", () => {
  it("turns on each router whose settings are complete, OpenRouter first", () => {
    expect(routersFrom({})).toEqual([]);
    expect(routersFrom({ OPENROUTER_API_KEY: "  " })).toEqual([]);
    expect(routersFrom({ OPENROUTER_API_KEY: "k" }).map(({ name, model }) => [name, model])).toEqual([
      ["OpenRouter", OPENROUTER_DEFAULT_MODEL],
    ]);
    // Requesty has no default model: name one, or a fallback policy as policy/<name>.
    expect(routersFrom({ REQUESTY_API_KEY: "k" })).toEqual([]);
    expect(
      routersFrom({ OPENROUTER_API_KEY: "k", OPENROUTER_MODEL: "other/model:free", REQUESTY_API_KEY: "k", REQUESTY_MODEL: "policy/p" }).map(
        ({ name, model }) => [name, model],
      ),
    ).toEqual([
      ["OpenRouter", "other/model:free"],
      ["Requesty", "policy/p"],
    ]);
    expect(OPENROUTER_DEFAULT_MODEL).toMatch(/:free$/);
  });
});

describe("chatJson", () => {
  it("asks OpenRouter for JSON in the schema, from providers that keep no data, with the key only in a header", async () => {
    const { fetchImpl, sent } = fakeFetch({ "openrouter.ai": content('{"team": null}') });

    await expect(chatJson(OPENROUTER, MESSAGES, SCHEMA, { fetchImpl })).resolves.toEqual({ team: null });
    const [request] = sent;
    expect(request?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request?.init).toMatchObject({ method: "POST", redirect: "error" });
    expect(request?.init.signal).toBeInstanceOf(AbortSignal);
    expect(request?.init.headers).toMatchObject({ authorization: "Bearer or-test-key", "x-title": "hackbrief" });
    expect(JSON.parse(String(request?.init.body))).toMatchObject({
      model: OPENROUTER_DEFAULT_MODEL,
      messages: MESSAGES,
      response_format: { type: "json_schema", json_schema: { strict: true, schema: SCHEMA } },
      provider: { data_collection: "deny", require_parameters: true },
    });
    expect(`${request?.url} ${String(request?.init.body)}`).not.toContain("or-test-key");
  });

  it.each([
    ["OpenRouter", "openrouter.ai", () => OPENROUTER],
    ["Requesty", "router.requesty.ai", () => REQUESTY],
  ])("sends %s no sampling setting, which some providers refuse", async (_name, host, router) => {
    // Claude's providers take no temperature, so with require_parameters every one is ruled out (HTTP 404), and Mistral's
    // refuse a temperature of 0 unless top_p is 1, which Requesty does not pass on ("top_p must be 1 when using greedy sampling").
    const { fetchImpl, sent } = fakeFetch({ [host]: content('{"team": null}') });

    await chatJson(router(), MESSAGES, SCHEMA, { fetchImpl });
    const body = JSON.parse(String(sent[0]?.init.body));
    expect(Object.keys(body)).not.toContain("temperature");
    expect(Object.keys(body)).not.toContain("top_p");
  });

  it("asks Requesty the same way, without OpenRouter's own fields", async () => {
    const { fetchImpl, sent } = fakeFetch({ "router.requesty.ai": content('{"team": null}') });

    await chatJson(REQUESTY, MESSAGES, SCHEMA, { fetchImpl });
    const [request] = sent;
    expect(request?.url).toBe("https://router.requesty.ai/v1/chat/completions");
    expect(request?.init.headers).toMatchObject({ authorization: "Bearer rq-test-key" });
    const body = JSON.parse(String(request?.init.body));
    expect(body).toMatchObject({ model: "policy/fictional-free", response_format: { type: "json_schema" } });
    expect(body.provider).toBeUndefined();
  });

  it("reads an answer wrapped in a code fence", async () => {
    const { fetchImpl } = fakeFetch({ "openrouter.ai": content('```json\n{"deadline": "Due 14 March."}\n```') });

    await expect(chatJson(OPENROUTER, MESSAGES, SCHEMA, { fetchImpl })).resolves.toEqual({ deadline: "Due 14 March." });
  });

  it.each([
    ["a rate limit", { status: 429, body: { error: { code: 429, message: "Rate limit exceeded" } } }, "OpenRouter answered HTTP 429: Rate limit exceeded"],
    ["an error in a 200 answer", { status: 200, body: { error: { code: 502, message: "Provider returned error" } } }, "OpenRouter: Provider returned error"],
    ["an error in the choice", { status: 200, body: { choices: [{ error: { code: 400, message: "No endpoint" } }] } }, "OpenRouter: No endpoint"],
    ["no content", { status: 200, body: { choices: [{ message: { content: null } }] } }, "OpenRouter answered without content"],
    ["an answer that is not JSON", { status: 200, body: "<html>Bad gateway</html>" }, "OpenRouter answered HTTP 200 without JSON"],
    ["content that is not JSON", content("Sure! Here are the sentences."), "OpenRouter's model answered without JSON"],
  ])("fails on %s, naming the router and never the key", async (_label, answer, message) => {
    const { fetchImpl } = fakeFetch({ "openrouter.ai": answer });

    const failure = chatJson(OPENROUTER, MESSAGES, SCHEMA, { fetchImpl });
    await expect(failure).rejects.toThrow(message);
    await expect(failure).rejects.not.toThrow("or-test-key");
  });
});

describe("askInTurn", () => {
  it("returns the first router's answer without asking the next", async () => {
    const { fetchImpl, sent } = fakeFetch({ "openrouter.ai": content('{"from": "openrouter"}') });

    await expect(askInTurn([OPENROUTER, REQUESTY], MESSAGES, SCHEMA, { fetchImpl })).resolves.toEqual({ from: "openrouter" });
    expect(sent).toHaveLength(1);
  });

  it("falls back to the next router when one fails", async () => {
    const { fetchImpl, sent } = fakeFetch({
      "openrouter.ai": { status: 429, body: { error: { message: "Rate limit exceeded" } } },
      "router.requesty.ai": content('{"from": "requesty"}'),
    });

    await expect(askInTurn([OPENROUTER, REQUESTY], MESSAGES, SCHEMA, { fetchImpl })).resolves.toEqual({ from: "requesty" });
    expect(sent.map(({ url }) => new URL(url).host)).toEqual(["openrouter.ai", "router.requesty.ai"]);
  });

  it("fails with every router's reason when all fail, and when none is set up", async () => {
    const { fetchImpl } = fakeFetch({
      "openrouter.ai": { status: 503, body: { error: { message: "Unavailable" } } },
      "router.requesty.ai": { status: 401, body: { error: { message: "Invalid key" } } },
    });

    await expect(askInTurn([OPENROUTER, REQUESTY], MESSAGES, SCHEMA, { fetchImpl })).rejects.toThrow(
      "Every model failed: OpenRouter answered HTTP 503: Unavailable; Requesty answered HTTP 401: Invalid key",
    );
    await expect(askInTurn([], MESSAGES, SCHEMA, { fetchImpl })).rejects.toThrow("No language model is set up");
  });
});
