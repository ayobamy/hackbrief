import { describe, expect, it } from "vitest";

import { filterQuery, parseFilters } from "./filters";
import { creditText, dateTile, formatDateRange, formatLocation, formatUpdated, isWebUrl, prizeLine } from "./format";

const SLUGS = ["hackclub", "hackster", "hackhq"];

describe("parseFilters", () => {
  it("accepts known formats and sources", () => {
    expect(parseFilters({ format: "online", source: "hackclub" }, SLUGS)).toEqual({ format: "online", source: "hackclub" });
    expect(parseFilters({ format: ["hybrid", "online"] }, SLUGS)).toEqual({ format: "hybrid", source: null });
  });

  it("turns anything else into no filter", () => {
    expect(parseFilters({ format: "'; drop table events; --", source: "devpost" }, SLUGS)).toEqual({ format: null, source: null });
    expect(parseFilters({ format: "toString" }, SLUGS)).toEqual({ format: null, source: null });
    expect(parseFilters({}, SLUGS)).toEqual({ format: null, source: null });
  });
});

describe("filterQuery", () => {
  it("writes only the filters that are set", () => {
    expect(filterQuery({ format: "in_person", source: "hackhq" })).toBe("?format=in_person&source=hackhq");
    expect(filterQuery({ format: null, source: "hackster" })).toBe("?source=hackster");
    expect(filterQuery({ format: null, source: null })).toBe("");
  });
});

describe("formatDateRange", () => {
  it.each([
    ["2026-11-07", "2026-11-08", "Sat, 7 Nov – Sun, 8 Nov 2026"],
    ["2026-11-07", "2026-11-07", "Sat, 7 Nov 2026"],
    ["2026-11-07", null, "Sat, 7 Nov 2026"],
    ["2026-12-31", "2027-01-02", "Thu, 31 Dec 2026 – Sat, 2 Jan 2027"],
    [null, "2026-11-30", "Until Mon, 30 Nov 2026"],
    [null, null, null],
  ])("%s to %s reads %s", (startsOn, endsOn, text) => {
    expect(formatDateRange(startsOn, endsOn)).toBe(text);
  });
});

describe("formatLocation", () => {
  it.each([
    ["Lisbon", "Portugal", "Lisbon, Portugal"],
    ["Bristol, United Kingdom", "United Kingdom", "Bristol, United Kingdom"],
    ["Austin, TX", null, "Austin, TX"],
    [null, "Kenya", "Kenya"],
    [null, null, null],
  ])("%s and %s read %s", (city, country, text) => {
    expect(formatLocation(city, country)).toBe(text);
  });
});

describe("dateTile", () => {
  it("splits a start date into the month and day a calendar tile shows", () => {
    expect(dateTile("2026-11-14")).toEqual({ month: "Nov", day: "14" });
    expect(dateTile("2027-01-03")).toEqual({ month: "Jan", day: "3" });
  });

  it("has nothing to show without a start date", () => {
    expect(dateTile(null)).toBeNull();
  });
});

describe("prizeLine", () => {
  it.each([
    ["Gift cards for top teams", "Gift cards for top teams"],
    ["  $2,000 in prizes ", "$2,000 in prizes"],
    ["TBA", null],
    ["tbd", null],
    ["TBC", null],
    ["N/A", null],
    ["None", null],
    ["—", null],
    ["–", null],
    ["--", null],
    ["", null],
    [null, null],
  ])("%j reads as %j", (text, line) => {
    expect(prizeLine(text)).toBe(line);
  });
});

describe("isWebUrl", () => {
  it.each([
    ["https://falcon-hack.example", true],
    ["http://falcon-hack.example/rules", true],
    ["HTTPS://FALCON-HACK.EXAMPLE", true],
    ["javascript:alert(1)", false],
    ["mailto:team@falcon-hack.example", false],
    ["falcon-hack.example", false],
  ])("%s is a web link: %s", (url, expected) => {
    expect(isWebUrl(url)).toBe(expected);
  });
});

describe("formatUpdated", () => {
  it("writes a date the way the credit line shows it", () => {
    expect(formatUpdated("2026-10-19")).toBe("19 Oct 2026");
  });
});

describe("creditText", () => {
  const credit = { name: "Université Fictive", url: "https://universite-fictive.example", updatedOn: "2027-01-20" };

  it("is the source's attribution when the licence names nobody else", () => {
    expect(creditText({ attribution: "Hack Club Hackathons", credit: null })).toBe("Hack Club Hackathons");
  });

  it("names the licensor and the last update where the licence asks", () => {
    expect(creditText({ attribution: "OpenAgenda (Licence Ouverte 2.0)", credit })).toBe(
      "Université Fictive on OpenAgenda (Licence Ouverte 2.0), updated 20 Jan 2027",
    );
  });

  it("leaves the date out when the source gives none", () => {
    expect(creditText({ attribution: "OpenAgenda (Licence Ouverte 2.0)", credit: { ...credit, updatedOn: null } })).toBe(
      "Université Fictive on OpenAgenda (Licence Ouverte 2.0)",
    );
  });
});
