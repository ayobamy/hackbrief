import { describe, expect, it } from "vitest";

import { filterQuery } from "./filters";
import {
  applyFilters,
  facetCounts,
  groupByMonth,
  pageNumbers,
  paginate,
  parsePage,
  timing,
} from "./listing";
import type { EventListing } from "./query";

const TODAY = "2026-11-02";

// A fictional listing; each test overrides only what it is about.
function listing(overrides: Partial<EventListing> = {}): EventListing {
  return {
    id: overrides.name ?? "event",
    name: "Fictional Hack",
    url: "https://example.org/hack",
    organiser: null,
    format: "online",
    city: null,
    country: null,
    startsOn: "2026-11-20",
    endsOn: "2026-11-21",
    prizeText: null,
    sources: [
      {
        slug: "hackclub",
        name: "Hack Club Hackathons",
        attribution: "Hack Club Hackathons",
        url: "https://example.org/list",
      },
    ],
    ...overrides,
  };
}

const hackhq = {
  slug: "hackhq",
  name: "HackHQ",
  attribution: "HackHQ",
  url: "https://example.org/hq",
};

describe("parsePage", () => {
  it.each([
    [{}, 1],
    [{ page: "3" }, 3],
    [{ page: ["4", "5"] }, 4],
    [{ page: "0" }, 1],
    [{ page: "-2" }, 1],
    [{ page: "2.5" }, 1],
    [{ page: "2abc" }, 1],
    [{ page: "99999999999999999999" }, 1],
  ])("reads %j as page %i", (params, page) => {
    expect(parsePage(params)).toBe(page);
  });
});

describe("paginate", () => {
  const items = [...Array(26).keys()].map((index) => index + 1);

  it("cuts the first page and says where it sits", () => {
    const page = paginate(items, 1, 12);

    expect(page.items).toEqual(items.slice(0, 12));
    expect([
      page.page,
      page.pageCount,
      page.total,
      page.first,
      page.last,
    ]).toEqual([1, 3, 26, 1, 12]);
  });

  it("gives the last page only what is left", () => {
    const page = paginate(items, 3, 12);

    expect(page.items).toEqual([25, 26]);
    expect([page.first, page.last]).toEqual([25, 26]);
  });

  it("shows the last page for a page number past the end", () => {
    expect(paginate(items, 9, 12).page).toBe(3);
  });

  it("has one empty page when nothing matches", () => {
    const page = paginate([], 2, 12);

    expect(page.items).toEqual([]);
    expect([
      page.page,
      page.pageCount,
      page.total,
      page.first,
      page.last,
    ]).toEqual([1, 1, 0, 0, 0]);
  });
});

describe("pageNumbers", () => {
  it.each([
    [1, 1, [1]],
    [3, 5, [1, 2, 3, 4, 5]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 10, [1, 2, 3, 4, 5, null, 10]],
    [5, 10, [1, null, 4, 5, 6, null, 10]],
    [10, 10, [1, null, 6, 7, 8, 9, 10]],
  ])("page %i of %i shows %j", (current, count, numbers) => {
    expect(pageNumbers(current, count)).toEqual(numbers);
  });
});

describe("filterQuery with a page", () => {
  it("adds the page after the filters, and leaves page 1 out", () => {
    expect(filterQuery({ format: "online", source: null }, 2)).toBe(
      "?format=online&page=2",
    );
    expect(filterQuery({ format: null, source: null }, 3)).toBe("?page=3");
    expect(filterQuery({ format: "hybrid", source: "hackhq" }, 1)).toBe(
      "?format=hybrid&source=hackhq",
    );
  });
});

describe("applyFilters and facetCounts", () => {
  const events = [
    listing({ name: "A", format: "online" }),
    listing({ name: "B", format: "in_person", sources: [hackhq] }),
    listing({ name: "C", format: "in_person" }),
    listing({ name: "D", format: "hybrid", sources: [hackhq] }),
    listing({ name: "E", format: null, sources: [hackhq] }),
  ];

  it("keeps the events that match every filter", () => {
    expect(
      applyFilters(events, { format: "in_person", source: null }).map(
        (event) => event.name,
      ),
    ).toEqual(["B", "C"]);
    expect(
      applyFilters(events, { format: null, source: "hackhq" }).map(
        (event) => event.name,
      ),
    ).toEqual(["B", "D", "E"]);
    expect(
      applyFilters(events, { format: "in_person", source: "hackhq" }).map(
        (event) => event.name,
      ),
    ).toEqual(["B"]);
  });

  it("counts each format within the chosen source, and each source within the chosen format", () => {
    const facets = facetCounts(events, {
      format: "in_person",
      source: "hackhq",
    });

    expect(facets.formatTotal).toBe(3);
    expect(facets.byFormat).toEqual({ online: 0, in_person: 1, hybrid: 1 });
    expect(facets.sourceTotal).toBe(2);
    expect(facets.bySource).toEqual({ hackclub: 1, hackhq: 1 });
  });
});

describe("timing", () => {
  it.each([
    ["2026-11-01", "2026-12-01", "live", "Happening now"],
    ["2026-11-02", null, "live", "Starts today"],
    ["2026-11-03", "2026-11-04", "soon", "Starts tomorrow"],
    ["2026-11-07", "2026-11-08", "soon", "In 5 days"],
    ["2026-11-09", null, "soon", "In 7 days"],
    ["2026-11-10", null, "later", "In 8 days"],
    ["2026-11-16", null, "later", "In 2 weeks"],
    ["2026-11-23", null, "later", "In 3 weeks"],
    ["2027-01-01", null, "later", "In 2 months"],
    [null, "2026-11-30", "tba", "Start date not given"],
    [null, null, "tba", "Dates to be announced"],
  ])("from %s to %s is %s: %s", (startsOn, endsOn, kind, label) => {
    expect(timing(startsOn, endsOn, TODAY)).toEqual({ kind, label });
  });
});

describe("groupByMonth", () => {
  it("puts events under way or starting today first, then each month in order, then those without dates", () => {
    const groups = groupByMonth(
      [
        listing({
          name: "Started",
          startsOn: "2026-10-30",
          endsOn: "2026-11-05",
        }),
        listing({ name: "Today", startsOn: TODAY, endsOn: null }),
        listing({ name: "Nov A", startsOn: "2026-11-07", endsOn: null }),
        listing({ name: "Nov B", startsOn: "2026-11-20", endsOn: null }),
        listing({ name: "Jan", startsOn: "2027-01-09", endsOn: null }),
        listing({ name: "Undated", startsOn: null, endsOn: null }),
      ],
      TODAY,
    );

    expect(
      groups.map((group) => [
        group.label,
        group.events.map((event) => event.name),
      ]),
    ).toEqual([
      ["Happening now", ["Started", "Today"]],
      ["November 2026", ["Nov A", "Nov B"]],
      ["January 2027", ["Jan"]],
      ["Dates to be announced", ["Undated"]],
    ]);
  });
});
