import { describe, expect, it } from "vitest";

import { isAuthorized } from "./auth";

const SECRET = "a-long-enough-secret-for-tests";

describe("isAuthorized", () => {
  it("accepts the exact bearer secret", () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it.each([
    ["a wrong secret", `Bearer ${SECRET}x`, SECRET],
    ["no header", null, SECRET],
    ["no Bearer prefix", SECRET, SECRET],
    ["no secret configured", "Bearer ", undefined],
    ["an empty secret", "Bearer ", ""],
    ["a secret too short to be real", "Bearer short", "short"],
  ])("refuses %s", (_case, header, secret) => {
    expect(isAuthorized(header, secret)).toBe(false);
  });
});
