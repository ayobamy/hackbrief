import { describe, expect, it } from "vitest";

import { filledFacts, verifyFilled, type FillAnswer } from "../fill";
import { EVAL_CASES, EVAL_TODAY } from "./cases";
import { scoreFacts } from "./score";

const [schedule, faq, rules, eventDay] = EVAL_CASES;

// The answers a good model gives for the test pages, so the pages and their expected facts agree with code.
const GOOD: Record<string, Partial<FillAnswer>> = {
  "schedule-with-priority-date": {
    deadline: { date: "2027-03-07", time: "9:00 AM", evidence: ["Sunday, 7 March", "9:00 AM Submissions close on Devpost"] },
    team: { min: 1, max: 4, evidence: ["Teams of up to 4. Solo hackers welcome!"] },
    eligibility: ["Any student over 16 at a UK college or university can apply."],
    submission: ["9:00 AM Submissions close on Devpost"],
    prizes: ["First place wins £1,000 and each runner-up team gets £250."],
  },
  "faq-homepage-without-deadline": {
    team: { min: 1, max: 4, evidence: ["Teams can be 1 to 4 people, and going solo is completely fine."] },
    eligibility: [
      "Any currently enrolled student, undergrad or grad, from any school.",
      "High school students are welcome if they are 18 or older by 21 November.",
    ],
  },
  "online-rules-page": {
    deadline: { date: "2026-12-01", time: "11:59 PM PT", evidence: ["Submissions close on 1 December 2026 at 11:59 PM PT."] },
    team: { min: 2, max: 5, evidence: ["Teams may have between 2 and 5 members."] },
    eligibility: ["The challenge is open to anyone aged 18 or over, worldwide, except where prohibited by law."],
    submission: ["A link to your public code repository.", "A demo video of no more than 3 minutes."],
    rules: ["All code must be written after the challenge opens on 1 November 2026."],
    judging: [
      { name: "Innovation", weight: 30, evidence: ["Innovation - 30 points"] },
      { name: "Technical execution", weight: 40, evidence: ["Technical execution - 40 points"] },
      { name: "Presentation", weight: 30, evidence: ["Presentation - 30 points"] },
    ],
    tracks: [
      { name: "Climate Resilience", evidence: ["Climate Resilience: tools that help communities adapt."] },
      { name: "Open Data", evidence: ["Open Data: projects built on public datasets."] },
    ],
    prizes: ["The grand prize is $5,000, and each track winner receives $1,000."],
  },
  "sponsors-venue-and-description": {
    eligibility: ["Riverbend Hacks is open to secondary school students aged 13 to 18."],
    rules: ["Projects must be started at the event; nothing built beforehand counts.", "You may use any language or framework."],
    tracks: [{ name: "Green City", evidence: ["Green City: ideas that make Riverbend greener."] }],
  },
  "event-day-homepage": {
    eligibility: ["More than 200 high school students from across the region come together for a one-day challenge."],
    submission: ["Pitch your idea: the day ends with your team pitching to a panel of judges."],
    prizes: ["Win up to $200! First-place team members each win a $200 gift card, and runners-up each win a $50 gift card."],
  },
};

function factsFor(name: string, pages: string, overrides: Partial<FillAnswer> = {}) {
  const answer = { ...GOOD[name], ...overrides };
  return filledFacts(verifyFilled({ deadline: null, team: null, eligibility: [], submission: [], rules: [], judging: [], tracks: [], prizes: [], ...answer }, pages), EVAL_TODAY);
}

describe("the test pages", () => {
  it.each(EVAL_CASES.map((testCase) => [testCase.name, testCase] as const))("score a good reading of %s as right throughout", (name, testCase) => {
    const score = scoreFacts(testCase.expected, factsFor(name, testCase.pages));

    expect([score.deadline, score.team, score.judging, score.topPrize]).toEqual(["right", "right", "right", "right"]);
    expect(score.eligibility.found).toBe(score.eligibility.expected);
    expect(score.checklist).toMatchObject({ found: testCase.expected.checklist.length, extra: 0 });
    expect(score.tracks).toEqual({ found: testCase.expected.tracks.length, expected: testCase.expected.tracks.length, extra: 0 });
    expect(score.rules).toEqual({ found: testCase.expected.rules.length, expected: testCase.expected.rules.length, extra: 0 });
  });
});

describe("scoreFacts", () => {
  it("calls a fact the pages do not give extra, a different one wrong and a lost one missed", () => {
    if (!schedule || !faq || !rules || !eventDay) {
      throw new Error("The test pages are missing");
    }
    // The day itself, read as a deadline, is the error the playbook exists to prevent; hackbrief's checks drop it.
    const eventDayAsDeadline = factsFor(eventDay.name, eventDay.pages, {
      deadline: { date: "2026-11-14", time: null, evidence: ["14 November 2026"] },
    });
    expect(scoreFacts(eventDay.expected, eventDayAsDeadline).deadline).toBe("right");
    expect(scoreFacts(faq.expected, factsFor(rules.name, rules.pages)).deadline).toBe("extra");
    expect(scoreFacts(schedule.expected, factsFor(rules.name, rules.pages)).deadline).toBe("wrong");
    expect(scoreFacts(rules.expected, factsFor(faq.name, faq.pages)).deadline).toBe("missed");
    // Sponsors read as tracks, and the venue line read as a rule, are dropped by hackbrief's checks.
    const traps = EVAL_CASES.find(({ name }) => name === "sponsors-venue-and-description");
    if (!traps) {
      throw new Error("The sponsors test page is missing");
    }
    const fooled = factsFor(traps.name, traps.pages, {
      tracks: [{ name: "HarborCloud", evidence: ["HarborCloud"] }],
      rules: ["5-6 December 2026 | In-person at Riverbend Library"],
    });
    expect(scoreFacts(traps.expected, fooled)).toMatchObject({ tracks: { extra: 0 }, rules: { extra: 0 } });
  });
});
