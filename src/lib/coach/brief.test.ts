import { describe, expect, it } from "vitest";

import { buildBrief, localToday, MAX_INPUT_LENGTH } from "./brief";
import type { KeyDate } from "./dates";
import { buildPlan } from "./plan";
import { SAMPLES } from "./samples";
import { buildStrategy } from "./strategy";

const TODAY = "2026-11-02";

function sample(id: string): string {
  const found = SAMPLES.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`no sample ${id}`);
  }
  return found.text;
}

function keyDate(date: string, kind: KeyDate["kind"]): KeyDate {
  return { date, kind, label: kind, time: null, yearAssumed: false, source: "" };
}

describe("buildStrategy", () => {
  it("orders notes by weight and marks focus, steady and light criteria", () => {
    const notes = buildStrategy({
      unit: "percent",
      statedTotal: 100,
      criteria: [
        { name: "Design", category: "design", weight: 10, stated: 10 },
        { name: "Technical quality", category: "technical", weight: 30, stated: 30 },
        { name: "Impact", category: "impact", weight: 20, stated: 20 },
        { name: "Pitch", category: "presentation", weight: 25, stated: 25 },
        { name: "Wildcard", category: "other", weight: 15, stated: 15 },
      ],
    });

    expect(notes.map(({ criterion, weight, emphasis }) => [criterion, weight, emphasis])).toEqual([
      ["Technical quality", 30, "focus"],
      ["Pitch", 25, "focus"],
      ["Impact", 20, "steady"],
      ["Wildcard", 15, "steady"],
      ["Design", 10, "light"],
    ]);
    expect(notes[0]?.text).toBe(
      "Technical quality is 30%: spend the time on a reliable demo path and clear code, not on extra features.",
    );
    expect(notes[4]?.text).toBe("Design is only 10%: do enough not to lose points here, then move on.");
  });

  it("treats unweighted criteria as steady", () => {
    const notes = buildStrategy({
      unit: "none",
      statedTotal: null,
      criteria: [{ name: "Innovation", category: "innovation", weight: 100, stated: null }],
    });

    expect(notes[0]?.emphasis).toBe("steady");
  });
});

describe("buildPlan", () => {
  it("counts back from the start and the deadline, with days from today", () => {
    const plan = buildPlan(keyDate("2027-03-12", "start"), keyDate("2027-03-14", "submission"), [], TODAY);

    expect(plan.map(({ date, title, daysFromToday }) => [date, title, daysFromToday])).toEqual([
      ["2027-02-26", "Form the team", 116],
      ["2027-03-09", "Get set up", 127],
      ["2027-03-12", "Kick-off", 130],
      ["2027-03-13", "Finish", 131],
      ["2027-03-14", "Submit", 132],
    ]);
  });

  it("without a start date, counts the early steps back from two days before the deadline", () => {
    const plan = buildPlan(null, keyDate("2027-03-14", "submission"), [], TODAY);

    expect(plan[2]).toMatchObject({ date: "2027-03-12", title: "Kick-off" });
  });

  it("ignores a start date after the deadline", () => {
    const plan = buildPlan(keyDate("2027-04-01", "start"), keyDate("2027-03-14", "submission"), [], TODAY);

    expect(plan[2]?.date).toBe("2027-03-12");
  });

  it("in a one-day hackathon, finishes on the kick-off day rather than before it", () => {
    const plan = buildPlan(keyDate("2027-03-14", "start"), keyDate("2027-03-14", "submission"), [], TODAY);

    expect(plan.map(({ date }) => date).slice(2)).toEqual(["2027-03-14", "2027-03-14", "2027-03-14"]);
  });

  it("lists the finishing work the checklist asks for", () => {
    const plan = buildPlan(
      null,
      keyDate("2027-03-14", "submission"),
      ["video", "readme", "slides", "description"].map((id) => ({ id, label: id, source: "" }) as never),
      TODAY,
    );

    expect(plan[3]?.detail).toBe(
      "Stop adding features: fix the bugs on the demo path, record the demo video, finish the README, make the slides, write the project description.",
    );
  });

  it("has no plan without a deadline", () => {
    expect(buildPlan(keyDate("2027-03-12", "start"), null, [], TODAY)).toEqual([]);
  });
});

describe("buildBrief on the samples", () => {
  it("Lagoon Build Weekend: percentages, ISO dates, a team of up to 4", () => {
    const brief = buildBrief(sample("lagoon"), TODAY);

    expect(brief.judging.criteria.map(({ name, weight }) => `${name} ${weight}%`)).toEqual([
      "Technical quality 30%",
      "Innovation 20%",
      "Impact 25%",
      "Presentation 25%",
    ]);
    expect(brief.deadline).toMatchObject({ date: "2027-03-14", time: "18:00 UTC" });
    expect(brief.daysLeft).toBe(132);
    expect(brief.team).toMatchObject({ min: 1, max: 4, soloAllowed: true });
    expect(brief.checklist.map(({ id }) => id)).toEqual(["repository", "video", "slides", "readme"]);
    expect(brief.topPrizes).toEqual([{ currency: "USD", value: 3000 }]);
    expect(brief.plan[2]).toMatchObject({ date: "2027-03-12", title: "Kick-off" });
    expect(brief.warnings).toEqual([]);
  });

  it("Harbour Light Climate Hack: points out of 40, US dates, no solo entries", () => {
    const brief = buildBrief(sample("harbour"), TODAY);

    expect(brief.judging.unit).toBe("points");
    expect(brief.judging.criteria.map(({ weight }) => weight)).toEqual([38, 25, 25, 12]);
    expect(brief.strategy[0]?.text.startsWith("Impact on emissions is 38%:")).toBe(true);
    expect(brief.deadline).toMatchObject({ date: "2027-03-07", time: "11:59 PM PT" });
    expect(brief.daysLeft).toBe(125);
    expect(brief.team).toMatchObject({ min: 2, max: 5, soloAllowed: false });
    expect(brief.eligibility).toHaveLength(2);
    expect(brief.checklist.map(({ id }) => id)).toEqual([
      "video",
      "live-demo",
      "description",
      "technologies",
      "required-technology",
    ]);
    expect(brief.topPrizes).toEqual([{ currency: "USD", value: 8000 }]);
  });

  it("Kestrel Health Sprint: prose, British dates, an assumed year", () => {
    const brief = buildBrief(sample("kestrel"), TODAY);

    expect(brief.judging.criteria.map(({ name, weight }) => `${name} ${weight}%`)).toEqual([
      "Impact 40%",
      "Technical execution 30%",
      "Creativity 30%",
    ]);
    expect(brief.deadline).toMatchObject({ date: "2027-04-11", time: "17:00 UTC" });
    expect(brief.daysLeft).toBe(160);
    expect(brief.team).toMatchObject({ min: 1, max: 3, soloAllowed: true });
    expect(brief.checklist.map(({ id }) => id)).toEqual(["repository", "readme", "live-demo", "licence", "pitch"]);
    expect(brief.topPrizes).toEqual([{ currency: "GBP", value: 2000 }]);
    expect(brief.warnings).toEqual(["Some dates had no year; hackr assumed the next one that keeps them upcoming."]);
  });
});

describe("buildBrief warnings", () => {
  it("says when nothing useful was found", () => {
    expect(buildBrief("Bring a laptop.", TODAY).warnings).toEqual([
      "No judging criteria found. Paste the judging or rubric section to get strategy notes.",
      "No submission deadline found, so there is no countdown or prep plan.",
    ]);
  });

  it("says when criteria have no weights, weights do not add up, or the deadline has passed", () => {
    expect(buildBrief("Judging\n- Innovation\n- Design\nDeadline: 2027-01-01", TODAY).warnings[0]).toBe(
      "The rules list 2 criteria without weights, so hackr treats them as equal. Ask the organisers if some count more.",
    );
    expect(buildBrief("Judging\n- Impact (60%)\n- Design (30%)", TODAY).warnings[0]).toBe(
      "The stated weights add up to 90%, so hackr scaled them to 100%.",
    );
    expect(buildBrief("Judging\n- Impact (100%)\nSubmission deadline: 2026-10-01", TODAY).warnings).toEqual([
      "The submission deadline has passed.",
    ]);
  });

  it("reads only the start of very long text, and says so", () => {
    const brief = buildBrief(`Judging\n- Impact (100%)\nDeadline: 2027-01-01\n${"x".repeat(MAX_INPUT_LENGTH)}`, TODAY);

    expect(brief.warnings[0]).toBe("The text was longer than 100,000 characters; only the start was read.");
    expect(brief.judging.criteria).toHaveLength(1);
  });
});

describe("localToday", () => {
  it("formats the viewer's calendar date", () => {
    expect(localToday(new Date(2027, 0, 5, 23, 30))).toBe("2027-01-05");
  });
});
