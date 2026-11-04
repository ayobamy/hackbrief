import { describe, expect, it } from "vitest";

import type { KeyDate } from "@/lib/coach/dates";

import { keyDates } from "./dates";

function at(date: string, kind: KeyDate["kind"], label: string, extra: Partial<KeyDate> = {}): KeyDate {
  return { date, kind, label, time: null, yearAssumed: false, source: label, ...extra };
}

describe("keyDates", () => {
  it("shows each date once per kind, under its most telling words, and drops bare dates already shown", () => {
    // A fictional event's page states its days several times over, as organisers' pages do.
    const rows = keyDates([
      at("2026-11-27", "start", "Date: first day"),
      at("2026-11-27", "start", "Join students worldwide for three days of building: first day"),
      at("2026-11-27", "other", "Date"),
      at("2026-11-29", "end", "Date: last day"),
      at("2026-11-29", "end", "Join students worldwide for three days of building: last day", { time: "5 PM" }),
      at("2026-11-29", "other", "29 November"),
      at("2026-11-29", "submission", "Last day of the event, from the listing", { fromListing: true }),
      at("2026-12-07", "other", "Top teams are invited to the Harbor Accelerator"),
    ]);

    expect(rows.map(({ date, name, time }) => [date, name, time])).toEqual([
      ["2026-11-27", "Join students worldwide for three days of building: first day", null],
      ["2026-11-29", "Join students worldwide for three days of building: last day", "5 PM"],
      ["2026-11-29", "Last day of the event, from the listing", null],
      ["2026-12-07", "Top teams are invited to the Harbor Accelerator", null],
    ]);
  });

  it("names a date by what it marks when the page's words around it say nothing", () => {
    const rows = keyDates([
      at("2027-01-23", "start", "Date: first day"),
      at("2027-01-24", "end", "· 2027: last day"),
      at("2027-01-10", "registration", "Date"),
      at("2027-01-24", "submission", "Submission deadline", { time: "9 AM" }),
    ]);

    expect(rows.map(({ name }) => name)).toEqual(["Applications close", "Event starts", "Event ends", "Submission deadline"]);
  });

  it("keeps a year hackbrief assumed marked as such", () => {
    expect(keyDates([at("2027-02-06", "start", "Date: first day", { yearAssumed: true })])[0]).toMatchObject({ yearAssumed: true });
  });
});
