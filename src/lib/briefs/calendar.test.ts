import { describe, expect, it } from "vitest";

import { deadlineCalendar } from "./calendar";

const CALENDAR = deadlineCalendar({
  eventId: "4faf0f98-a322-4359-89c1-cf312128ddaf",
  eventName: "Lagoon Hacks 2027: Build, Ship; Win",
  deadline: { date: "2027-03-14", time: "11:59 PM PT" },
  url: "https://hackbrief.dev/events/4faf0f98-a322-4359-89c1-cf312128ddaf",
  now: new Date("2026-11-04T05:06:07Z"),
});
const LINES = CALENDAR.split("\r\n");

describe("deadlineCalendar", () => {
  it("is an RFC 5545 calendar with one all-day event on the deadline's date, and CRLF line ends", () => {
    expect(CALENDAR.endsWith("\r\n")).toBe(true);
    expect(CALENDAR.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(LINES.slice(0, 4)).toEqual(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//hackbrief//hackbrief.dev//EN", "CALSCALE:GREGORIAN"]);
    expect(LINES).toContain("UID:4faf0f98-a322-4359-89c1-cf312128ddaf-deadline@hackbrief.dev");
    expect(LINES).toContain("DTSTAMP:20261104T050607Z");
    expect(LINES).toContain("DTSTART;VALUE=DATE:20270314");
    expect(LINES).toContain("DTEND;VALUE=DATE:20270315");
    expect(LINES.at(-2)).toBe("END:VCALENDAR");
  });

  it("escapes commas and semicolons, states the time as the rules do, and reminds a day before", () => {
    expect(LINES).toContain("SUMMARY:Submission deadline: Lagoon Hacks 2027: Build\\, Ship\; Win");
    const unfolded = CALENDAR.replace(/\r\n /g, "");
    expect(unfolded).toContain("DESCRIPTION:Due 11:59 PM PT\\, as the rules state it. The brief: https://hackbrief.dev/events/");
    expect(LINES).toEqual(expect.arrayContaining(["BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "END:VALARM"]));
  });

  it("folds lines longer than 75 bytes without splitting a character", () => {
    const long = deadlineCalendar({
      eventId: "x",
      eventName: "Participez au HABS Neuro-AI Hackathon 2026 à l'Université Paris-Saclay, édition spéciale",
      deadline: { date: "2026-11-30", time: null },
      url: "https://hackbrief.dev/events/x",
      now: new Date("2026-11-04T05:06:07Z"),
    });

    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(long.replace(/\r\n /g, "")).toContain("SUMMARY:Submission deadline: Participez au HABS Neuro-AI Hackathon 2026 à l'Université Paris-Saclay\\, édition spéciale");
    expect(long.replace(/\r\n /g, "")).toContain("DESCRIPTION:The rules give no time. The brief: https://hackbrief.dev/events/x");
  });
});
