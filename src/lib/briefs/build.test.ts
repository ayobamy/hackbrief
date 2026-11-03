import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { NOTHING_FILLED, type FillAnswer } from "@/lib/coach/fill";
import type { ReadResult } from "@/lib/rules/read";

import { buildEventBrief, hashText, isStale, onOpen, type BuildDeps, type StoredBrief } from "./build";

const TODAY = "2026-11-03";
const NOW = new Date("2026-11-03T05:00:00Z");
// A fictional event's pages as hackbrief reads them.
const TEXT = `Harbor Hacks 2027
FAQ
Teams of up to 4. Solo hackers welcome!
Schedule
Sunday, 7 March
9:00 AM Submissions close on Devpost`;
const EVENT = { url: "https://harbor-hacks.example/", startsOn: "2027-03-06", endsOn: "2027-03-07" };
const FILLED: FillAnswer = {
  ...NOTHING_FILLED,
  deadline: { date: "2027-03-07", time: "9:00 AM", evidence: ["Sunday, 7 March", "9:00 AM Submissions close on Devpost"] },
};

function deps(overrides: Partial<BuildDeps> = {}): BuildDeps & { reads: Array<{ url: string; chose: string[] | null }>; fills: number } {
  const calls = { reads: [] as Array<{ url: string; chose: string[] | null }>, fills: 0 };
  return {
    read: async (url, { choose }) => {
      const chose = choose ? await choose([{ text: "Rules", url: "https://harbor-hacks.example/rules" }]) : null;
      calls.reads.push({ url, chose });
      return { status: "read", text: TEXT, pages: [url, ...(chose ?? [])] } satisfies ReadResult;
    },
    choose: async () => ["https://harbor-hacks.example/rules"],
    fill: async () => {
      calls.fills += 1;
      return FILLED;
    },
    model: "anthropic/claude-haiku-5.5",
    today: TODAY,
    now: NOW,
    ...overrides,
    get reads() {
      return calls.reads;
    },
    get fills() {
      return calls.fills;
    },
  };
}

describe("buildEventBrief", () => {
  it("reads the pages, lets the model choose more and fill the facts, and stores no page text", async () => {
    const given = deps();
    const outcome = await buildEventBrief(EVENT, null, given);

    expect(outcome).toMatchObject({ status: "built", model: "anthropic/claude-haiku-5.5", textHash: hashText(TEXT) });
    expect(outcome.status === "built" && outcome.pages).toEqual(["https://harbor-hacks.example/", "https://harbor-hacks.example/rules"]);
    expect(outcome.status === "built" && outcome.facts.deadline).toMatchObject({ date: "2027-03-07", time: "9:00 AM" });
    expect(JSON.stringify(outcome)).not.toContain("Teams of up to 4. Solo hackers welcome!\nSchedule");
    expect(given.fills).toBe(1);
  });

  it("reads the stored pages again without a model choosing, and asks no model when nothing changed", async () => {
    const stored: StoredBrief = {
      pages: ["https://harbor-hacks.example/", "https://harbor-hacks.example/rules"],
      textHash: hashText(TEXT),
      // Only whether facts exist matters here.
      facts: {} as never,
      builtAt: new Date("2026-11-01T05:00:00Z"),
    };
    let modelChose = false;
    const given = deps({
      choose: async () => {
        modelChose = true;
        return [];
      },
    });

    expect(await buildEventBrief(EVENT, stored, given)).toEqual({ status: "unchanged" });
    expect(modelChose).toBe(false);
    expect(given.reads[0]?.chose).toEqual(["https://harbor-hacks.example/rules"]);
    expect(given.fills).toBe(0);
  });

  it("builds again when the text changed, or when the brief is a week old", async () => {
    const old: StoredBrief = { pages: [EVENT.url], textHash: hashText("Older text"), facts: {} as never, builtAt: new Date("2026-11-02T05:00:00Z") };

    expect((await buildEventBrief(EVENT, old, deps())).status).toBe("built");
    const weekOld = { ...old, textHash: hashText(TEXT), builtAt: new Date("2026-10-26T05:00:00Z") };
    expect((await buildEventBrief(EVENT, weekOld, deps())).status).toBe("built");
  });

  it("keeps the coach's own reading when the model fails, and leaves no hash so the next run asks again", async () => {
    const outcome = await buildEventBrief(
      EVENT,
      null,
      deps({
        fill: async () => {
          throw new Error("Every model failed");
        },
      }),
    );

    expect(outcome).toMatchObject({ status: "built", model: null, textHash: null });
    expect(outcome.status === "built" && outcome.facts.team).toMatchObject({ max: 4 });
  });

  it("builds from the coach's own reading without a model, and reports a page it could not read", async () => {
    expect(await buildEventBrief(EVENT, null, deps({ choose: undefined, fill: undefined, model: null }))).toMatchObject({
      status: "built",
      model: null,
      textHash: hashText(TEXT),
    });
    expect(await buildEventBrief(EVENT, null, deps({ read: async () => ({ status: "skipped", reason: "robots" }) }))).toEqual({
      status: "skipped",
      reason: "robots",
    });
  });
});

describe("isStale", () => {
  it("is true once an event's pages were last read 20 hours ago or more, so each site is read once a day", () => {
    const checked = new Date("2026-11-03T05:00:00Z");

    expect(isStale(checked, new Date("2026-11-04T00:59:00Z"))).toBe(false);
    expect(isStale(checked, new Date("2026-11-04T01:00:00Z"))).toBe(true);
  });
});

describe("onOpen", () => {
  const NOW_OPEN = new Date("2026-11-04T05:00:00Z");
  const FACTS = {} as never;

  it("shows a stored brief, and asks for a fresh look once it is a day old", () => {
    const row = { facts: FACTS, pages: ["https://harbor-hacks.example/"], failure: null, failedAt: null };

    expect(onOpen({ ...row, checkedAt: new Date("2026-11-04T01:00:00Z") }, NOW_OPEN)).toEqual({
      show: { status: "built", facts: FACTS, pages: ["https://harbor-hacks.example/"] },
      refresh: false,
    });
    expect(onOpen({ ...row, checkedAt: new Date("2026-11-03T05:00:00Z") }, NOW_OPEN)).toMatchObject({ refresh: true });
  });

  it("leaves a site that refused or disallows hackbrief alone for a week, even on a visitor's click", () => {
    const refused = { facts: null, pages: [], failure: "refused", failedAt: new Date("2026-11-02T05:00:00Z"), checkedAt: new Date("2026-11-02T05:00:00Z") };

    expect(onOpen(refused, NOW_OPEN)).toEqual({ show: { status: "skipped", reason: "refused" }, refresh: false });
    expect(onOpen({ ...refused, failure: "robots" }, NOW_OPEN)).toEqual({ show: { status: "skipped", reason: "robots" }, refresh: false });
    expect(onOpen({ ...refused, failedAt: new Date("2026-10-27T05:00:00Z") }, NOW_OPEN)).toEqual({ build: true });
  });

  it("builds now when nothing is stored, or the last try failed for a passing reason", () => {
    expect(onOpen(null, NOW_OPEN)).toEqual({ build: true });
    const unreachable = { facts: null, pages: [], failure: "unreachable", failedAt: NOW_OPEN, checkedAt: NOW_OPEN };
    expect(onOpen(unreachable, NOW_OPEN)).toEqual({ build: true });
  });
});

describe("hashText", () => {
  it("changes with the reading's version, so stored briefs are read again when hackbrief reads differently", () => {
    const textOnly = createHash("sha256").update(TEXT).digest("hex");

    expect(hashText(TEXT)).not.toBe(textOnly);
    expect(hashText(TEXT)).toBe(hashText(TEXT));
  });
});
