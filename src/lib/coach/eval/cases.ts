import type { DeliverableId } from "../deliverables";

/** What a good reading of a test page finds; every event and person here is fictional. */
export interface Expected {
  deadline: { date: string; time: string | null } | null;
  team: { min: number | null; max: number | null } | null;
  /** Words each of which some kept who-can-enter sentence must contain. */
  eligibility: string[];
  checklist: DeliverableId[];
  judging: Array<{ name: string; weight: number | null }>;
  tracks: string[];
  topPrize: { currency: string; value: number } | null;
  /** Words each of which some kept rule must contain. */
  rules: string[];
}

export interface EvalCase {
  name: string;
  /** What the page tests: the trap it sets, or the facts it spreads out. */
  why: string;
  pages: string;
  expected: Expected;
}

/** The test pages the hackathon-reading playbook is scored against (`scripts/score-fill.ts`), read as of 3 November 2026. */
export const EVAL_TODAY = "2026-11-03";

export const EVAL_CASES: EvalCase[] = [
  {
    name: "schedule-with-priority-date",
    why: "The deadline is a schedule line under its day; an application date comes first.",
    pages: `Harbor Hacks 2027
6-7 March 2027 · Portsmouth
Apply now! Priority deadline: 1 February 2027
FAQ
Who can come?
Any student over 16 at a UK college or university can apply.
How big can teams be?
Teams of up to 4. Solo hackers welcome!
Schedule
Saturday, 6 March
10:00 AM Hacking begins
Sunday, 7 March
9:00 AM Submissions close on Devpost
11:00 AM Judging
Prizes
First place wins £1,000 and each runner-up team gets £250.`,
    expected: {
      deadline: { date: "2027-03-07", time: "9:00 AM" },
      team: { min: 1, max: 4 },
      eligibility: ["student over 16"],
      // "Submissions close on Devpost" says where to hand in, so a good reading puts it on the checklist.
      checklist: ["platform"],
      judging: [],
      tracks: [],
      topPrize: { currency: "GBP", value: 1000 },
      rules: [],
    },
  },
  {
    name: "faq-homepage-without-deadline",
    why: "A homepage with a priority date and the event's days, but no submission deadline.",
    pages: `Fernway Hacks 2026
A 24-hour hackathon at Fernway University, 21-22 November 2026
Priority deadline · 10 October 2026
FAQ
Who can attend?
Any currently enrolled student, undergrad or grad, from any school.
High school students are welcome if they are 18 or older by 21 November.
How big are teams?
Teams can be 1 to 4 people, and going solo is completely fine.
Do I need experience?
No experience is needed, and we run workshops all weekend.`,
    expected: {
      deadline: null,
      team: { min: 1, max: 4 },
      eligibility: ["currently enrolled student", "18 or older"],
      checklist: [],
      judging: [],
      tracks: [],
      topPrize: null,
      rules: [],
    },
  },
  {
    name: "online-rules-page",
    why: "A full rules page: a dated deadline with a zone, points-based judging, tracks and prizes.",
    pages: `Tidewater Online Challenge 2026
Rules
Submissions close on 1 December 2026 at 11:59 PM PT.
Teams may have between 2 and 5 members.
The challenge is open to anyone aged 18 or over, worldwide, except where prohibited by law.
All code must be written after the challenge opens on 1 November 2026.
What to submit
A link to your public code repository.
A demo video of no more than 3 minutes.
Judging
Projects are scored out of 100 points:
Innovation - 30 points
Technical execution - 40 points
Presentation - 30 points
Tracks
Climate Resilience: tools that help communities adapt.
Open Data: projects built on public datasets.
Prizes
The grand prize is $5,000, and each track winner receives $1,000.`,
    expected: {
      deadline: { date: "2026-12-01", time: "11:59 PM PT" },
      team: { min: 2, max: 5 },
      eligibility: ["18 or over"],
      checklist: ["repository", "video"],
      judging: [
        { name: "Innovation", weight: 30 },
        { name: "Technical execution", weight: 40 },
        { name: "Presentation", weight: 30 },
      ],
      tracks: ["Climate Resilience", "Open Data"],
      topPrize: { currency: "USD", value: 5000 },
      rules: ["written after the challenge opens"],
    },
  },
  {
    name: "event-day-homepage",
    why: "A one-day event whose only date is the day itself, which is not a submission deadline.",
    pages: `Northgate Youth Hackathon 2026
14 November 2026
Northgate Community College
More than 200 high school students from across the region come together for a one-day challenge.
No tech experience needed. Meals are included.
Pitch your idea: the day ends with your team pitching to a panel of judges.
Win up to $200! First-place team members each win a $200 gift card, and runners-up each win a $50 gift card.`,
    expected: {
      deadline: null,
      team: null,
      eligibility: ["high school students"],
      checklist: ["pitch"],
      judging: [],
      tracks: [],
      topPrize: { currency: "USD", value: 200 },
      rules: [],
    },
  },
  {
    name: "sponsors-venue-and-description",
    why: "A sponsor list, a date-and-venue line and a description of hackathons, none of them tracks or rules.",
    pages: `Riverbend Hacks 2026
5-6 December 2026 | In-person at Riverbend Library
What is a hackathon?
A hackathon is where you and your friends build something new over a weekend.
Who can join?
Riverbend Hacks is open to secondary school students aged 13 to 18.
Rules
Projects must be started at the event; nothing built beforehand counts.
You may use any language or framework.
Sponsors
HarborCloud
Bluefin Labs
Tracks
Green City: ideas that make Riverbend greener.`,
    expected: {
      deadline: null,
      team: null,
      eligibility: ["aged 13 to 18"],
      checklist: [],
      judging: [],
      tracks: ["Green City"],
      topPrize: null,
      rules: ["started at the event", "use any language"],
    },
  },
];
