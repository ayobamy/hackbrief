import { describe, expect, it } from "vitest";

import { OPENROUTER_DEFAULT_MODEL } from "@/lib/model/routers";
import type { Fetcher } from "@/lib/rules/read";

import { briefDepsFrom } from "./deps";

const TODAY = "2026-11-03";
const NOW = new Date("2026-11-03T05:00:00Z");

describe("briefDepsFrom", () => {
  it("reads pages with the given fetch, and asks no model without a key", async () => {
    const fetched: string[] = [];
    const fetch: Fetcher = async (url) => {
      fetched.push(url);
      return new Response("not found", { status: 404 });
    };
    const deps = briefDepsFrom({}, { fetch, today: TODAY, now: NOW });

    expect(deps).toMatchObject({ choose: undefined, fill: undefined, model: null, today: TODAY, now: NOW });
    expect(await deps.read("https://harbor-hacks.example/", {})).toEqual({ status: "skipped", reason: "unreachable" });
    expect(fetched).toContain("https://harbor-hacks.example/robots.txt");
  });

  it("chooses pages and reads them with the model when a key is set", () => {
    const deps = briefDepsFrom({ OPENROUTER_API_KEY: "or-test-key" }, { fetch: async () => new Response(""), today: TODAY, now: NOW });

    expect(deps.choose).toBeTypeOf("function");
    expect(deps.fill).toBeTypeOf("function");
    expect(deps.model).toBe(OPENROUTER_DEFAULT_MODEL);
  });
});
