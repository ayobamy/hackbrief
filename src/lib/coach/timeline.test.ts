import { describe, expect, it } from "vitest";

import type { PlanStep } from "./plan";
import { planTimeline } from "./timeline";

// The Lagoon sample's plan: hacking from Friday 12 March, submissions due Sunday 14 March 2027.
function step(date: string, title: string): PlanStep {
  return { date, daysFromToday: 0, title, detail: "" };
}
const PLAN = [
  step("2027-02-26", "Form the team"),
  step("2027-03-09", "Get set up"),
  step("2027-03-12", "Kick-off"),
  step("2027-03-13", "Finish"),
  step("2027-03-14", "Submit"),
];

describe("planTimeline", () => {
  const timeline = planTimeline(PLAN, "2027-03-12", "2027-03-14");

  it("spans every day from the first step to the last, inclusive", () => {
    expect(timeline?.days.length).toBe(17);
    expect(timeline?.days[0]?.date).toBe("2027-02-26");
    expect(timeline?.days.at(-1)?.date).toBe("2027-03-14");
  });

  it("puts each step on its day", () => {
    expect(timeline?.days.flatMap((day) => (day.step === null ? [] : [[day.offset, day.step]]))).toEqual([
      [0, 0],
      [11, 1],
      [14, 2],
      [15, 3],
      [16, 4],
    ]);
  });

  it("marks the hacking days, from the start to the deadline", () => {
    expect(timeline?.days.filter((day) => day.hacking).map((day) => day.date)).toEqual([
      "2027-03-12",
      "2027-03-13",
      "2027-03-14",
    ]);
  });

  it("labels the first day and the first day of each new month", () => {
    expect(timeline?.days.flatMap((day) => (day.month ? [[day.date, day.month]] : []))).toEqual([
      ["2027-02-26", "Feb"],
      ["2027-03-01", "Mar"],
    ]);
    expect(timeline?.days[0]?.day).toBe("26");
  });

  it("says how long each step waits after the one before", () => {
    expect(timeline?.gaps).toEqual([null, "+11 days", "+3 days", "+1 day", "+1 day"]);
  });

  it("marks only the deadline when the rules give no start, and nothing without a deadline", () => {
    expect(planTimeline(PLAN, null, "2027-03-14")?.days.filter((day) => day.hacking).map((day) => day.date)).toEqual([
      "2027-03-14",
    ]);
    expect(planTimeline(PLAN, null, null)?.days.some((day) => day.hacking)).toBe(false);
  });

  it("has nothing to draw without a plan", () => {
    expect(planTimeline([], "2027-03-12", "2027-03-14")).toBeNull();
  });
});
