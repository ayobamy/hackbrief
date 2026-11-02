import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { countByVerdict, PLATFORMS } from "./catalogue";

// Every linked platform name in a table row of docs/platforms.md.
function platformsInDocs(): Set<string> {
  const docs = readFileSync(join(process.cwd(), "docs/platforms.md"), "utf8");
  const names = docs
    .split("\n")
    .filter((line) => line.startsWith("| ["))
    .flatMap((line) => [...(line.split("|")[1] ?? "").matchAll(/\[([^\]]+)\]\(/g)].map((match) => match[1] ?? ""));
  return new Set(names);
}

describe("the platform catalogue", () => {
  it("lists exactly the platforms in docs/platforms.md, each once", () => {
    const names = PLATFORMS.map((platform) => platform.name);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names)).toEqual(platformsInDocs());
  });

  it("keeps the verdicts recorded in the docs for platforms hackbrief uses or refuses", () => {
    const verdict = (name: string) => PLATFORMS.find((platform) => platform.name === name)?.verdict;

    expect(verdict("Hack Club Hackathons")).toBe("use");
    expect(verdict("Kaggle")).toBe("ask");
    expect(verdict("Devpost")).toBe("do-not-collect");
    expect(verdict("AngelHack")).toBe("do-not-collect");
    expect(verdict("MLH")).toBe("ask");
    expect(verdict("Dicoding")).toBe("link");
    expect(verdict("infolomba.id")).toBe("ask");
  });

  it("counts platforms by verdict, adding up to the whole catalogue", () => {
    const counts = countByVerdict();

    expect(counts.map(({ verdict }) => verdict)).toEqual(["use", "care", "ask", "link", "do-not-collect"]);
    expect(counts.reduce((sum, { count }) => sum + count, 0)).toBe(PLATFORMS.length);
    expect(countByVerdict([{ name: "A", group: "G", verdict: "ask" }])).toEqual([
      { verdict: "use", count: 0 },
      { verdict: "care", count: 0 },
      { verdict: "ask", count: 1 },
      { verdict: "link", count: 0 },
      { verdict: "do-not-collect", count: 0 },
    ]);
  });
});
