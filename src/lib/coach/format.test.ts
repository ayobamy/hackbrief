import { describe, expect, it } from "vitest";

import { formatAmount, formatDate, formatDaysLeft, formatTeam } from "./format";

describe("formatDate", () => {
  it("shows the date as written, whatever the viewer's time zone", () => {
    expect(formatDate("2027-03-14")).toBe("Sun, 14 Mar 2027");
    expect(formatDate("2027-01-01")).toBe("Fri, 1 Jan 2027");
  });
});

describe("formatDaysLeft", () => {
  it.each([
    [0, "Today"],
    [1, "Tomorrow"],
    [-1, "Yesterday"],
    [132, "In 132 days"],
    [-3, "3 days ago"],
  ])("%i days reads %s", (days, text) => {
    expect(formatDaysLeft(days)).toBe(text);
  });
});

describe("formatAmount", () => {
  it("formats ISO currencies and keeps other codes as words", () => {
    expect(formatAmount({ currency: "USD", value: 3000 })).toBe("$3,000");
    expect(formatAmount({ currency: "GBP", value: 2000 })).toBe("£2,000");
    expect(formatAmount({ currency: "USDC", value: 5000 })).toBe("USDC 5,000");
  });
});

describe("formatTeam", () => {
  const base = { source: "" };

  it.each([
    [{ min: 1, max: 4, soloAllowed: true }, "1 to 4 people; you can enter alone"],
    [{ min: 2, max: 5, soloAllowed: false }, "2 to 5 people; no solo entries"],
    [{ min: 3, max: 3, soloAllowed: false }, "3 people; no solo entries"],
    [{ min: 1, max: 1, soloAllowed: true }, "1 person; you can enter alone"],
    [{ min: null, max: 4, soloAllowed: false }, "Up to 4 people; no solo entries"],
    [{ min: 2, max: null, soloAllowed: false }, "At least 2 people; no solo entries"],
    [{ min: 1, max: null, soloAllowed: true }, "Any team size; you can enter alone"],
    [{ min: null, max: 4, soloAllowed: null }, "Up to 4 people; solo entry not mentioned"],
  ])("%j reads %s", (team, text) => {
    expect(formatTeam({ ...base, ...team })).toBe(text);
  });
});
