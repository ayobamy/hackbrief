import { describe, expect, it } from "vitest";

import { filterQuery, parseFilters } from "./filters";
import { formatDateRange, formatLocation } from "./format";

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
