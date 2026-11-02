import { describe, expect, it } from "vitest";

import { eventContext, pageLink, parseEventId } from "./context";
import type { EventListing } from "./query";

const ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

// A fictional listing; each test overrides only what it is about.
function listing(overrides: Partial<EventListing> = {}): EventListing {
  return {
    id: ID,
    name: "Fictional Harbour Hack",
    url: "https://www.harbour-hack.example/2027",
    organiser: "Harbour Dev Club",
    format: "in_person",
    city: "Lagos",
    country: "Nigeria",
    startsOn: "2026-11-07",
    endsOn: "2026-11-08",
    prizeText: null,
    sources: [
      { slug: "hackclub", name: "Hack Club Hackathons", attribution: "Hack Club Hackathons", url: "https://example.org/list", credit: null },
    ],
    ...overrides,
  };
}

describe("parseEventId", () => {
  it.each([
    [{ event: ID }, ID],
    [{ event: ID.toUpperCase() }, ID],
    [{ event: [ID, "other"] }, ID],
    [{}, null],
    [{ event: "" }, null],
    [{ event: "not-an-id" }, null],
    [{ event: `${ID}x` }, null],
    [{ event: "'; drop table events; --" }, null],
  ])("reads %j as %j", (params, id) => {
    expect(parseEventId(params)).toBe(id);
  });
});

describe("eventContext", () => {
  it("says what the coach needs to show about a listed event", () => {
    expect(eventContext(listing())).toEqual({
      name: "Fictional Harbour Hack",
      rulesUrl: "https://www.harbour-hack.example/2027",
      host: "harbour-hack.example",
      details: "Sat, 7 Nov – Sun, 8 Nov 2026 · In person · Lagos, Nigeria",
      organiser: "Harbour Dev Club",
      listedBy: ["Hack Club Hackathons"],
    });
  });

  it("leaves out what the listing does not give, and links only to web pages", () => {
    const context = eventContext(
      listing({ url: "javascript:alert(1)", format: null, city: null, country: null, startsOn: null, endsOn: null, organiser: null }),
    );

    expect(context.rulesUrl).toBeNull();
    expect(context.host).toBeNull();
    expect(context.details).toBe("");
    expect(context.organiser).toBeNull();
  });

  it("credits a licensor and its last update where the source's licence asks", () => {
    const context = eventContext(
      listing({
        sources: [
          {
            slug: "openagenda",
            name: "OpenAgenda",
            attribution: "OpenAgenda (Licence Ouverte 2.0)",
            url: "https://openagenda.com/universite-fictive",
            credit: { name: "Université Fictive", url: null, updatedOn: "2027-01-20" },
          },
        ],
      }),
    );

    expect(context.listedBy).toEqual(["Université Fictive on OpenAgenda (Licence Ouverte 2.0), updated 20 Jan 2027"]);
  });

  it("does not repeat an organiser that is the event's own name", () => {
    expect(eventContext(listing({ organiser: "Fictional Harbour Hack" })).organiser).toBeNull();
  });
});

describe("pageLink", () => {
  it.each([
    ["https://www.lagoon-hack.example/rules", { url: "https://www.lagoon-hack.example/rules", host: "lagoon-hack.example" }],
    ["  http://kestrel.example  ", { url: "http://kestrel.example/", host: "kestrel.example" }],
    ["lagoon-hack.example/rules", { url: "https://lagoon-hack.example/rules", host: "lagoon-hack.example" }],
    ["", null],
    ["not a link", null],
    ["javascript:alert(1)", null],
    ["ftp://files.example/rules.txt", null],
  ])("reads %j as %j", (text, link) => {
    expect(pageLink(text)).toEqual(link);
  });
});
