import { describe, expect, it } from "vitest";

import { addDays, daysBetween, eventStart, extractDates, submissionDeadline } from "./dates";

const TODAY = "2026-11-02";

function summary(input: string, today = TODAY) {
  return extractDates(input, today).map(({ date, kind, label, time, yearAssumed }) => ({
    date,
    kind,
    label,
    time,
    yearAssumed,
  }));
}

describe("daysBetween and addDays", () => {
  it("counts whole calendar days, negative once a date has passed", () => {
    expect(daysBetween("2026-11-02", "2027-03-14")).toBe(132);
    expect(daysBetween("2027-03-14", "2027-03-14")).toBe(0);
    expect(daysBetween("2027-03-15", "2027-03-14")).toBe(-1);
  });

  it("moves across month and year ends", () => {
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("extractDates", () => {
  it("reads ISO dates with times, and names each date after its line", () => {
    expect(
      summary(`- Registration closes: 2027-03-05
- Hacking starts: 2027-03-12 18:00 UTC
- Submission deadline: 2027-03-14 18:00 UTC
- Winners announced: 2027-03-20`),
    ).toEqual([
      { date: "2027-03-05", kind: "registration", label: "Registration", time: null, yearAssumed: false },
      { date: "2027-03-12", kind: "start", label: "Hacking starts", time: "18:00 UTC", yearAssumed: false },
      { date: "2027-03-14", kind: "submission", label: "Submission deadline", time: "18:00 UTC", yearAssumed: false },
      { date: "2027-03-20", kind: "results", label: "Winners announced", time: null, yearAssumed: false },
    ]);
  });

  it("reads month-first dates with a weekday and a time with its zone", () => {
    expect(summary("Submissions are due Sunday, March 7, 2027 at 11:59 PM PT.")).toEqual([
      { date: "2027-03-07", kind: "submission", label: "Submissions are due", time: "11:59 PM PT", yearAssumed: false },
    ]);
  });

  it("reads a time at the end of a sentence without the full stop, and keeps a.m. whole", () => {
    expect(summary("Projects are due March 14, 2027 at 10:00 AM.")[0]?.time).toBe("10:00 AM");
    expect(summary("Projects are due March 14, 2027 at 9 a.m.")[0]?.time).toBe("9 a.m.");
  });

  it("reads day-first dates with ordinals", () => {
    expect(summary("Winners announced on 24th April 2027").map(({ date, kind }) => [date, kind])).toEqual([
      ["2027-04-24", "results"],
    ]);
  });

  it("splits ranges into a first and a last day", () => {
    expect(
      summary(`Hacking period: February 26 - March 7, 2027
Judging: March 8 - 19, 2027
Registration: 4–10 January 2027`).map(({ date, kind, label }) => [date, kind, label]),
    ).toEqual([
      ["2027-01-04", "registration", "Registration: first day"],
      ["2027-01-10", "registration", "Registration: last day"],
      ["2027-02-26", "start", "Hacking period: first day"],
      ["2027-03-07", "end", "Hacking period: last day"],
      ["2027-03-08", "judging", "Judging: first day"],
      ["2027-03-19", "judging", "Judging: last day"],
    ]);
  });

  it("marks the end of a submission window as the submission date", () => {
    expect(summary("Submission window: March 1 - 14, 2027").map(({ date, kind }) => [date, kind])).toEqual([
      ["2027-03-01", "other"],
      ["2027-03-14", "submission"],
    ]);
  });

  it("reads a priority or early deadline as a registration date, not the submission deadline", () => {
    const dates = extractDates(
      `Priority deadline · October 3, 2027
Early-bird deadline: September 20, 2027
Projects are due November 8, 2027 at 9:00 AM.`,
      TODAY,
    );

    expect(dates.map(({ date, kind }) => [date, kind])).toEqual([
      ["2027-09-20", "registration"],
      ["2027-10-03", "registration"],
      ["2027-11-08", "submission"],
    ]);
    expect(submissionDeadline(dates)?.date).toBe("2027-11-08");
    expect(summary("Submissions close early, on March 8, 2027.")[0]?.kind).toBe("submission");
  });

  it("reads each date in a sentence with the words just before it", () => {
    const dates = summary(
      "The sprint runs from 9th April 2027 to 11th April 2027, and the final submission deadline is 11 April 2027 at 17:00 UTC. Registration is open until 2nd April. Finalists will present live to the judges on 24th April.",
    );

    expect(dates).toEqual([
      { date: "2027-04-02", kind: "registration", label: "Registration", time: null, yearAssumed: true },
      { date: "2027-04-09", kind: "start", label: "Sprint runs: first day", time: null, yearAssumed: false },
      { date: "2027-04-11", kind: "end", label: "Sprint runs: last day", time: null, yearAssumed: false },
      { date: "2027-04-11", kind: "submission", label: "Final submission deadline", time: "17:00 UTC", yearAssumed: false },
      { date: "2027-04-24", kind: "other", label: "Finalists will present live to the judges", time: null, yearAssumed: true },
    ]);
  });

  it("assumes this year for a date without one, or next year once it is a month past", () => {
    expect(summary("Kick-off: 20 November", "2026-11-02")[0]).toMatchObject({ date: "2026-11-20", yearAssumed: true });
    expect(summary("Kick-off: 20 November", "2026-12-15")[0]).toMatchObject({ date: "2026-11-20", yearAssumed: true });
    expect(summary("Kick-off: 20 November", "2026-12-25")[0]).toMatchObject({ date: "2027-11-20", yearAssumed: true });
    expect(summary("Kick-off: 20 September", "2026-11-02")[0]).toMatchObject({ date: "2027-09-20", yearAssumed: true });
  });

  it("moves the last day of a range without a year into the next year when it wraps", () => {
    expect(summary("Hackathon dates: December 30 – January 2").map(({ date }) => date)).toEqual([
      "2026-12-30",
      "2027-01-02",
    ]);
  });

  it("ignores dates that do not exist and the verb may", () => {
    expect(summary("Teams may 2 times resubmit. Deadline: February 30, 2027. Event: 2027-13-01")).toEqual([]);
  });

  it("falls back to the kind's name when a date has no words around it", () => {
    expect(summary("2027-05-01")).toEqual([
      { date: "2027-05-01", kind: "other", label: "Date", time: null, yearAssumed: false },
    ]);
  });

  it("uses the words after a date when none come before it", () => {
    expect(summary("March 3, 2027 — kick-off in the main hall")[0]).toMatchObject({
      kind: "start",
      label: "Kick-off in the main hall",
    });
  });

  it("shortens very long labels", () => {
    const [date] = summary(`${"Please note that the very last moment to hand in everything you built is "}2027-06-01`);

    expect(date?.label.length).toBeLessThanOrEqual(60);
    expect(date?.label.endsWith("…")).toBe(true);
  });
});

describe("submissionDeadline and eventStart", () => {
  const dates = extractDates(
    `Hacking starts: 2027-03-12
Round one submission: 2027-03-13
Final submission deadline: 2027-03-14`,
    TODAY,
  );

  it("takes the latest submission date as the deadline", () => {
    expect(submissionDeadline(dates)?.date).toBe("2027-03-14");
  });

  it("takes the first start date as the start", () => {
    expect(eventStart(dates)?.date).toBe("2027-03-12");
  });

  it("returns null when there is no such date", () => {
    expect(submissionDeadline([])).toBeNull();
    expect(eventStart([])).toBeNull();
  });
});
