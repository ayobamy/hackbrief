import { describe, expect, it } from "vitest";

import { buildBrief, hasFindings } from "./brief";
import { NOTHING_FILLED, type FillAnswer } from "./fill";

const TODAY = "2026-11-03";
// A fictional weekend hackathon's site, as hackbrief reads it (decision D13).
const PAGE = `Lagoon Hacks 2027
Lisbon, 13-14 March 2027
Priority deadline 20 February 2027
FAQ
Can I come with friends?
Yes! Squads can have up to four people, and solo hackers are welcome too.
Who's this for?
Entry is open to anyone in high school or university, from any country.
Schedule
Sunday, 14 March
10:00 AM Final submission deadline
Tracks
Ocean Tech: build for cleaner seas.
Rules
All code must be written during the event.
Bring a 2-minute video walkthrough and your repo.`;

const FILLED: FillAnswer = {
  ...NOTHING_FILLED,
  deadline: { date: "2027-03-14", time: "10:00 AM", evidence: ["Sunday, 14 March", "10:00 AM Final submission deadline"] },
  team: { min: 1, max: 4, evidence: ["Yes! Squads can have up to four people, and solo hackers are welcome too."] },
  eligibility: ["Entry is open to anyone in high school or university, from any country."],
  submission: ["Bring a 2-minute video walkthrough and your repo."],
  rules: ["All code must be written during the event."],
  tracks: [{ name: "Ocean Tech", evidence: ["Ocean Tech: build for cleaner seas."] }],
};

describe("buildBrief with a model's reading", () => {
  it("builds the brief from the model's checked facts, and says which ones a model read", () => {
    const brief = buildBrief(PAGE, TODAY, { filled: FILLED });

    expect(brief.deadline).toMatchObject({ date: "2027-03-14", time: "10:00 AM", kind: "submission" });
    expect(brief.team).toMatchObject({ min: 1, max: 4 });
    // "All code must be written during the event." is a rule, as the model filed it, not who can enter.
    expect(brief.eligibility).toEqual(["Entry is open to anyone in high school or university, from any country."]);
    expect(brief.checklist.map(({ label }) => label)).toEqual(expect.arrayContaining(["Demo video, at most 2 minutes"]));
    expect(brief.tracks).toEqual([{ name: "Ocean Tech", source: "Ocean Tech: build for cleaner seas." }]);
    expect(brief.rules).toEqual(["All code must be written during the event."]);
    expect(brief.modelFound).toEqual(expect.arrayContaining(["deadline", "team", "tracks", "rules"]));
    expect(brief.warnings).toContain(
      // hackbrief's own reading also finds who can enter, so that is not the model's.
      "A language model read the deadline, the team size, the checklist, the tracks and the rules on how to compete from the rules. hackbrief checked that every sentence it used is there and read the dates and numbers itself; check them against the rules.",
    );
  });

  it("prefers the model's checked deadline, and says when hackbrief's own reading found another", () => {
    const brief = buildBrief(`${PAGE}\nSubmission deadline: 1 March 2027.`, TODAY, { filled: FILLED });

    expect(brief.deadline?.date).toBe("2027-03-14");
    expect(brief.dates.filter(({ kind }) => kind === "submission").map(({ date }) => date)).toEqual(["2027-03-14"]);
    expect(brief.warnings).toContain(
      'hackbrief\'s own reading found another submission date, 2027-03-01, in "Submission deadline: 1 March 2027."; check which one counts.',
    );
  });

  it("lists who can enter from the model and from hackbrief's own reading, without repeats", () => {
    const page = `${PAGE}\nYou must be 16 or older to take part.`;
    const brief = buildBrief(page, TODAY, { filled: FILLED });

    // The model's sentence first; hackbrief's own reading also finds it, and adds the age limit.
    expect(brief.eligibility).toEqual([
      "Entry is open to anyone in high school or university, from any country.",
      "You must be 16 or older to take part.",
    ]);
    expect(new Set(brief.eligibility).size).toBe(brief.eligibility.length);
  });

  it("treats curly and straight quotes as one sentence when it removes repeats", () => {
    const page = "Who can join?\nIf you’re age 13-18, you’re eligible! No prior experience required.";
    const brief = buildBrief(page, TODAY, {
      filled: { ...NOTHING_FILLED, eligibility: ["If you're age 13-18, you're eligible! No prior experience required."] },
    });

    expect(brief.eligibility).toHaveLength(1);
  });

  it("keeps hackbrief's own reading where the model found nothing", () => {
    const page = PAGE.replace("Yes! Squads can have up to four people, and solo hackers are welcome too.", "Teams of 2 to 5 people.");
    const brief = buildBrief(page, TODAY, { filled: { ...FILLED, team: null } });

    expect(brief.team).toMatchObject({ min: 2, max: 5 });
    expect(brief.modelFound).not.toContain("team");
  });

  it("drops a fact whose sentence the text no longer holds, so editing the rules removes it", () => {
    const brief = buildBrief(PAGE.replace("Ocean Tech: build for cleaner seas.", ""), TODAY, { filled: FILLED });

    expect(brief.tracks).toEqual([]);
    expect(brief.modelFound).not.toContain("tracks");
  });

  it("places a weekday deadline a model found on the listing's day of that name", () => {
    // Split over two lines, so the coach's own reading, a line at a time, misses it.
    const page = "FAQ\nWhen is it due?\nSubmissions close\nat 9 AM on Sunday morning.";
    const brief = buildBrief(page, TODAY, {
      listing: { startsOn: "2027-03-13", endsOn: "2027-03-14" },
      filled: { ...NOTHING_FILLED, deadline: { date: null, time: "9 AM", evidence: ["Submissions close", "at 9 AM on Sunday morning."] } },
    });

    expect(brief.deadline).toMatchObject({ date: "2027-03-14", time: "9 AM" });
    expect(brief.deadline?.fromListing).toBeUndefined();
    expect(brief.modelFound).toEqual(["deadline"]);
    expect(hasFindings(brief)).toBe(true);
  });

  it("changes nothing with nothing filled", () => {
    expect(buildBrief(PAGE, TODAY, { filled: NOTHING_FILLED })).toEqual(buildBrief(PAGE, TODAY));
    expect(buildBrief(PAGE, TODAY).modelFound).toEqual([]);
  });
});
