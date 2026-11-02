import { afterEach, describe, expect, it, vi } from "vitest";

import { checkDatabase } from "./health";

describe("checkDatabase", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reports ok with the measured latency in whole milliseconds", async () => {
    const clock = [100, 112.6];
    const now = () => clock.shift() ?? 0;

    const health = await checkDatabase(async () => undefined, { now });

    expect(health).toEqual({ status: "ok", latencyMs: 13 });
  });

  it("never reports a negative latency", async () => {
    const clock = [50, 40];
    const now = () => clock.shift() ?? 0;

    const health = await checkDatabase(async () => undefined, { now });

    expect(health).toEqual({ status: "ok", latencyMs: 0 });
  });

  it("reports down with reason error, without the driver's message", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const health = await checkDatabase(async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.7:5432 user=secret-user");
    });

    expect(health).toEqual({ status: "down", reason: "error" });
    expect(JSON.stringify(health)).not.toContain("secret-user");
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("reports down with reason timeout when the ping does not answer in time", async () => {
    vi.useFakeTimers();
    const pending = checkDatabase(() => new Promise(() => undefined), { timeoutMs: 2000 });

    await vi.advanceTimersByTimeAsync(2000);

    await expect(pending).resolves.toEqual({ status: "down", reason: "timeout" });
  });

  it("clears its timer once the ping answers", async () => {
    vi.useFakeTimers();

    await checkDatabase(async () => undefined, { timeoutMs: 2000 });

    expect(vi.getTimerCount()).toBe(0);
  });
});
