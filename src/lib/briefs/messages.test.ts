import { describe, expect, it } from "vitest";

import { skippedMessage } from "./messages";

describe("skippedMessage", () => {
  it("says why an event has no brief, naming its site, and nothing when reading is off", () => {
    expect(skippedMessage("refused", "harbor-hacks.example")).toBe("harbor-hacks.example turned hackbrief away, so it leaves the site alone for now.");
    expect(skippedMessage("empty", "harbor-hacks.example")).toContain("draws its page with JavaScript");
    expect(skippedMessage("off", "harbor-hacks.example")).toBeNull();
  });
});
