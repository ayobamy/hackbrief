import { describe, expect, it } from "vitest";

import { extractDeliverables } from "./deliverables";
import { extractEligibility } from "./eligibility";
import { extractPrizes, largestPrizes } from "./prizes";
import { extractTeamSize } from "./team";
import { capitalise, toLines, toSentences } from "./text";

describe("toLines and toSentences", () => {
  it("strips Markdown and list markers and spots headings", () => {
    const lines = toLines(`## Prizes
- **First** place: $3,000
TIMELINE
Key dates:
Prizes
| Impact | 40% |`);

    expect(lines.map(({ text, heading, bullet }) => [text, heading, bullet])).toEqual([
      ["Prizes", true, false],
      ["First place: $3,000", false, true],
      ["TIMELINE", true, false],
      ["Key dates:", true, false],
      ["Prizes", true, false],
      ["Impact 40%", false, false],
    ]);
  });

  it("splits sentences and tags each with its section", () => {
    expect(toSentences("Intro here.\n## Prizes\nGrand prize: $5. Runner-up: $2.")).toEqual([
      { text: "Intro here.", section: "" },
      { text: "Prizes", section: "prizes" },
      { text: "Grand prize: $5.", section: "prizes" },
      { text: "Runner-up: $2.", section: "prizes" },
    ]);
  });

  it("capitalises the first letter only", () => {
    expect(capitalise("impact on users")).toBe("Impact on users");
    expect(capitalise("")).toBe("");
  });
});

describe("extractTeamSize", () => {
  it.each([
    ["Team size: 2-5 people. Solo entries are not accepted.", { min: 2, max: 5, soloAllowed: false }],
    ["Teams of up to 4 members. Individuals are welcome too.", { min: 1, max: 4, soloAllowed: true }],
    ["You can take part on your own or in a team of up to three people.", { min: 1, max: 3, soloAllowed: true }],
    ["Teams of 3 to 6.", { min: 3, max: 6, soloAllowed: false }],
    ["Teams must have a minimum of two members and a maximum of five members.", { min: 2, max: 5, soloAllowed: false }],
    ["Each team needs at least 2 people.", { min: 2, max: null, soloAllowed: false }],
    ["Teams of 1-4 hackers.", { min: 1, max: 4, soloAllowed: true }],
    ["Hack solo or with friends; teams are optional.", { min: 1, max: null, soloAllowed: true }],
    ["Teams of up to 3.", { min: null, max: 3, soloAllowed: null }],
    ["Solo entries are not accepted.", { min: null, max: null, soloAllowed: false }],
    ["We encourage participants to form a team of four (or fewer).", { min: null, max: 4, soloAllowed: null }],
    ["Teams can be 1 to 4 people, and going solo is completely fine.", { min: 1, max: 4, soloAllowed: true }],
  ])("reads %j", (text, expected) => {
    expect(extractTeamSize(text)).toMatchObject(expected);
  });

  it("returns null when the rules say nothing about teams", () => {
    expect(extractTeamSize("Bring a laptop.")).toBeNull();
    expect(extractTeamSize("Teams will be announced later.")).toBeNull();
  });

  it("keeps the sentence it read", () => {
    expect(extractTeamSize("Teams of up to 4 members.")?.source).toBe("Teams of up to 4 members.");
  });
});

describe("extractEligibility", () => {
  it("keeps sentences that say who may enter", () => {
    expect(
      extractEligibility(`Participants must be at least 18 years old at the time of entry.
The hackathon is open to residents of any country. Bring a laptop.`),
    ).toEqual([
      "Participants must be at least 18 years old at the time of entry.",
      "The hackathon is open to residents of any country.",
    ]);
  });

  it("counts words like students only inside an eligibility section, never under prizes", () => {
    expect(
      extractEligibility(`Who can enter
University students in their final year can join.

Prizes
Best student team: USD 1,000.`),
    ).toEqual(["University students in their final year can join."]);
  });

  it("reads two-digit ages", () => {
    expect(extractEligibility("Anyone aged 16 or older may enter, from any country.")).toEqual([
      "Anyone aged 16 or older may enter, from any country.",
    ]);
  });

  it("reads 'must be' as a rule about who may enter only when it says what entrants must be", () => {
    expect(
      extractEligibility(`All projects must be on Devpost by 9 AM Sunday, and all coding must stop at 11 AM Sunday.
All code must be written during the event.
You must be enrolled at a university to take part.
Entrants must be a resident of Canada.`),
    ).toEqual(["You must be enrolled at a university to take part.", "Entrants must be a resident of Canada."]);
  });

  it("skips a FAQ's question and keeps its answer", () => {
    expect(extractEligibility("Am I eligible to attend?\nAny 13-18 year old can attend, and you must be enrolled at a school.")).toEqual([
      "Any 13-18 year old can attend, and you must be enrolled at a school.",
    ]);
  });

  it("does not read 'open tools' as 'open to'", () => {
    expect(extractEligibility("We invite students to build open tools for clinics.")).toEqual([]);
  });

  it("keeps at most six sentences, without repeats", () => {
    const text = Array.from({ length: 8 }, (_, index) => `Rule ${index}: you must be over 18.`).join("\n");

    expect(extractEligibility(`${text}\nRule 0: you must be over 18.`)).toHaveLength(6);
    expect(extractEligibility("You must be 18. You must be 18.")).toEqual(["You must be 18."]);
    expect(extractEligibility("Entrants must be over 18.\nEntrants must be over 18.")).toEqual([
      "Entrants must be over 18.",
    ]);
  });
});

describe("extractDeliverables", () => {
  it("builds the checklist in a fixed order from what the rules ask for", () => {
    const items = extractDeliverables(`What to submit
- A link to a public GitHub repository with a README.
- A demo video of no more than 3 minutes.
- A short slide deck.`);

    expect(items.map(({ id, label }) => [id, label])).toEqual([
      ["repository", "Link to a public code repository"],
      ["video", "Demo video, at most 3 minutes"],
      ["slides", "Slide deck"],
      ["readme", "README"],
    ]);
  });

  it("takes the longer end of a video range and finds deliverables in submission sentences", () => {
    const items = extractDeliverables(
      "Each team must provide a project description, a list of technologies used, a link to a working demo, and a demo video (2-4 minutes). Projects must use the Harbour Light API. Upload screenshots too. Code must be released under an OSI-approved licence.",
    );

    expect(items.map(({ label }) => label)).toEqual([
      "Demo video, at most 4 minutes",
      "Link to a working demo",
      "Project description",
      "Screenshots",
      "List of the technologies used",
      "Open-source licence",
      "Use the technology the rules require",
    ]);
  });

  it("names a private repository and a video without a length plainly", () => {
    expect(extractDeliverables("Submit your source code and a video.").map(({ label }) => label)).toEqual([
      "Link to the code repository",
      "Demo video",
    ]);
  });

  it("names the platform to submit on, from a fixed list, first", () => {
    expect(
      extractDeliverables("All projects must be submitted to Devpost by 9 AM on Sunday. Include a demo video.").map(
        ({ id, label }) => [id, label],
      ),
    ).toEqual([
      ["platform", "Submit on Devpost"],
      ["video", "Demo video"],
    ]);
    expect(extractDeliverables("- Submit your game on itch.io.").map(({ label }) => label)).toEqual(["Submit on itch.io"]);
    expect(extractDeliverables("Submit your answers on our website.")).toEqual([]);
    expect(extractDeliverables("Past winners are on Devpost.")).toEqual([]);
  });

  it("finds a live pitch anywhere, but other items only where the rules talk about submitting", () => {
    const items = extractDeliverables(
      "Our sponsor's deck explains the API. Finalists will present live to the judges on demo day.",
    );

    expect(items.map(({ id }) => id)).toEqual(["pitch"]);
    expect(extractDeliverables("The day ends with your team pitching to a panel of judges.").map(({ id }) => id)).toEqual(["pitch"]);
    expect(extractDeliverables("Teams pitch their ideas to the judges at 3 PM.").map(({ id }) => id)).toEqual(["pitch"]);
  });
});

describe("extractPrizes and largestPrizes", () => {
  it("reads millions and decimals, so '$1M+ prizes' is a million dollars, not one", () => {
    const amounts = extractPrizes(`Prizes
$1M+ prizes
Grand prize: $2.5 million in credits.
Best hack: $1.5k each.
Runner-up: 2.5m EUR.`).flatMap((line) => line.amounts);

    expect(amounts).toEqual([
      { currency: "USD", value: 1_000_000 },
      { currency: "USD", value: 2_500_000 },
      { currency: "USD", value: 1500 },
      { currency: "EUR", value: 2_500_000 },
    ]);
    // "m" that starts a word is not a million.
    expect(extractPrizes("Prizes\nWin $50 more in swag.").flatMap((line) => line.amounts)).toEqual([{ currency: "USD", value: 50 }]);
  });

  it("reads amounts written with symbols, codes before or after, and k", () => {
    const prizes = extractPrizes(`Prizes
First place: $3,000
Grand prize: USD 8,000. Runner-up: 4k EUR.
Best design award: ₦500,000 or £2.5k
Bring a laptop worth $1,000.`);

    expect(prizes.map(({ amounts }) => amounts)).toEqual([
      [{ currency: "USD", value: 3000 }],
      [{ currency: "USD", value: 8000 }],
      [{ currency: "EUR", value: 4000 }],
      [
        { currency: "NGN", value: 500000 },
        // £2.5k is £2,500: the decimal counts.
        { currency: "GBP", value: 2500 },
      ],
      [{ currency: "USD", value: 1000 }],
    ]);
  });

  it("outside a prize section, keeps only sentences about prizes", () => {
    expect(extractPrizes("The winning team receives £2,000. Tickets cost $20.")).toEqual([
      { text: "The winning team receives £2,000.", amounts: [{ currency: "GBP", value: 2000 }] },
    ]);
  });

  it("gives the largest amount in each currency, in the order they appear", () => {
    const prizes = extractPrizes("Prizes\nFirst: $3,000\nSecond: $1,500\nSpecial: €700");

    expect(largestPrizes(prizes)).toEqual([
      { currency: "USD", value: 3000 },
      { currency: "EUR", value: 700 },
    ]);
    expect(largestPrizes([])).toEqual([]);
  });
});
