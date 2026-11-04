import { describe, expect, it } from "vitest";

import { buildBrief, hasFindings } from "./brief";

const TODAY = "2026-11-03";
// A fictional weekend hackathon as hackbrief lists it: Saturday 13 to Sunday 14 March 2027.
const WEEKEND = { startsOn: "2027-03-13", endsOn: "2027-03-14" };

describe("buildBrief with the listing's dates", () => {
  it("reads a deadline given as a weekday on the listing's one matching day", () => {
    const brief = buildBrief("All projects must be submitted to the portal by 9 AM on Sunday.", TODAY, { listing: WEEKEND });

    expect(brief.deadline).toMatchObject({ date: "2027-03-14", time: "9 AM", kind: "submission" });
    expect(brief.deadline?.fromListing).toBeUndefined();
    expect(hasFindings(brief)).toBe(true);
  });

  it("leaves a weekday alone when its sentence marks something other than handing in", () => {
    for (const sentence of ["The priority deadline to apply is 5 PM on Saturday.", "Winners are announced at noon on Sunday."]) {
      expect(buildBrief(sentence, TODAY, { listing: WEEKEND }).deadline?.fromListing, sentence).toBe(true);
    }
    expect(buildBrief("Projects are due at 9 AM on Sunday, and winners are announced at noon.", TODAY, { listing: WEEKEND }).deadline).toMatchObject({
      date: "2027-03-14",
      time: "9 AM",
    });
  });

  it("leaves a weekday alone when the listing has it twice, or not at all", () => {
    const twoSundays = { startsOn: "2027-03-12", endsOn: "2027-03-21" };

    expect(buildBrief("Submissions close at noon on Sunday.", TODAY, { listing: twoSundays }).deadline?.fromListing).toBe(true);
    expect(buildBrief("Submissions close at noon on Monday.", TODAY, { listing: WEEKEND }).deadline?.fromListing).toBe(true);
  });

  it("falls back to the listing's dates, labelled as such, without counting them as found on the page", () => {
    const brief = buildBrief("Welcome! Join our community for a weekend of building.", TODAY, { listing: WEEKEND });

    expect(brief.dates.map(({ date, kind, label }) => [date, kind, label])).toEqual([
      ["2027-03-13", "start", "First day of the event, from the listing"],
      ["2027-03-14", "submission", "Last day of the event, from the listing"],
    ]);
    expect(brief.deadline).toMatchObject({ date: "2027-03-14", time: null, fromListing: true });
    expect(brief.plan.length).toBeGreaterThan(0);
    expect(brief.warnings).toContain(
      "The rules give no submission deadline, so hackbrief uses the last day of the event from its listing. Check the exact time with the organisers.",
    );
    expect(hasFindings(brief)).toBe(false);
  });

  it("lets the event's last day on its own page stand in for the deadline before the listing's", () => {
    // The listing says the weekend before; the page says when the event runs.
    const brief = buildBrief("Lagoon Hacks 2027 is Feb 13–14, 2027, in Lisbon.", TODAY, { listing: { startsOn: "2027-02-06", endsOn: "2027-02-07" } });

    expect(brief.deadline).toMatchObject({ date: "2027-02-14", kind: "submission", standIn: true });
    expect(brief.deadline?.fromListing).toBeUndefined();
    expect(brief.warnings).toContain(
      "The rules give no submission deadline, so hackbrief uses the last day of the event from its page. Check the exact time with the organisers.",
    );
  });

  it("keeps the page's own dates over the listing's", () => {
    const brief = buildBrief("Hacking starts March 12, 2027. Submission deadline: March 14, 2027 at 17:00 UTC.", TODAY, { listing: WEEKEND });

    expect(brief.dates.map(({ date, kind }) => [date, kind])).toEqual([
      ["2027-03-12", "start"],
      ["2027-03-14", "submission"],
    ]);
    expect(brief.deadline).toMatchObject({ time: "17:00 UTC" });
    expect(brief.deadline?.fromListing).toBeUndefined();
  });

  it("uses a one-day listing's single date for both ends, and nothing without dates", () => {
    expect(buildBrief("Welcome!", TODAY, { listing: { startsOn: "2027-03-13", endsOn: null } }).deadline?.date).toBe("2027-03-13");
    expect(buildBrief("Welcome!", TODAY, { listing: { startsOn: null, endsOn: null } }).dates).toEqual([]);
    expect(buildBrief("Welcome!", TODAY).dates).toEqual([]);
  });
});
