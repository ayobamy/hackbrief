import { describe, expect, it, vi } from "vitest";

import { parseHackClub } from "./hackclub";
import { parseHackHq } from "./hackhq";
import { parseHacksterFeed } from "./hackster";
import { fetchSource, SOURCES, USER_AGENT } from "./index";
import { isRestrictedUrl } from "./restricted";
import { canonicalUrl, dateOnly, hostOf, textOrNull } from "./url";

// Fictional events, written in each source's response format.
const HACK_CLUB_BODY = JSON.stringify([
  {
    id: "hc-1",
    name: "Lagoon Hacks",
    website: "https://www.lagoonhacks.example/",
    start: "2027-02-06T14:00:00.000Z",
    end: "2027-02-07T20:00:00.000Z",
    city: "Lisbon",
    state: null,
    country: "Portugal",
    countryCode: "pt",
    virtual: false,
    hybrid: false,
    logo: "https://example.org/logo.png",
  },
  { id: "hc-2", name: "Orbit Online", website: "https://orbit.example", start: "2027-03-01", end: "2027-03-02", virtual: true },
  { id: "hc-3", name: "Tide Hybrid", website: "https://tide.example", start: "2027-04-01", end: "2027-04-02", hybrid: true, city: "Austin", state: "TX" },
  { id: "hc-4", name: "No website", website: "not a url", start: "2027-05-01", end: "2027-05-02" },
  { id: "hc-5", name: "Missing dates" },
]);

const HACKSTER_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Hackster contests</title>
  <entry>
    <id>tag:www.hackster.io,2005:Challenge/1</id>
    <link rel="alternate" type="text/html" href="https://www.hackster.io/contests/fictional-sensors"/>
    <title>Fictional Sensors &amp; Signals</title>
    <content>Build something.</content>
    <link href="https://example.org/banner.jpg" rel="enclosure" type="image/jpeg"/>
    <author><name>Example Silicon</name></author>
  </entry>
  <entry>
    <id>tag:www.hackster.io,2005:Challenge/2</id>
    <title><![CDATA[Edge Ideas]]></title>
    <link href="https://www.hackster.io/contests/edge-ideas"/>
  </entry>
  <entry><id>tag:www.hackster.io,2005:Challenge/3</id><title>No link</title></entry>
</feed>`;

const HACK_HQ_BODY = JSON.stringify([
  {
    id: "hq-1",
    company_name: "Harbour Hacks",
    title: "Harbour Hacks 2027 — Jan 9, 2027 (Student Hackathon; Registration Open)",
    url: "https://harbourhacks.example/",
    locations: ["Bristol, UK"],
    format: "In-Person",
    prize: "$2,000 in prizes",
    state: "open",
    active: true,
    startDate: "2027-01-09",
    endDate: "2027-01-10",
    source: "organizer-site",
  },
  { id: "hq-2", title: "Taken from Devpost", url: "https://fictional.devpost.com/", state: "open", active: true, source: "devpost" },
  { id: "hq-3", title: "Luma event", url: "https://luma.com/fictional", state: "open", active: true, source: "contributor" },
  { id: "hq-4", title: "Ended", url: "https://ended.example", state: "closed", active: false, source: "organizer-site" },
  { id: "hq-5", title: "Remote Sprint", url: "https://remote.example", format: "Virtual", locations: ["Online"], state: "opens_soon", source: "contributor" },
  { id: "hq-6", title: "Mixed", url: "https://mixed.example", format: "Hybrid", active: true },
  { id: "hq-7", title: "Unknown format", url: "https://unknown.example", format: "TBA", active: true },
  { title: "No id" },
]);

describe("url helpers", () => {
  it("builds the merge key from host and path", () => {
    expect(canonicalUrl("https://www.Example.org/Hack/?ref=x#top")).toBe("example.org/hack");
    expect(canonicalUrl("http://example.org")).toBe("example.org");
    expect(canonicalUrl("ftp://example.org/file")).toBeNull();
    expect(canonicalUrl("not a url")).toBeNull();
    expect(hostOf("https://sub.example.org/a")).toBe("sub.example.org");
    expect(hostOf("nope")).toBeNull();
  });

  it("keeps only real calendar dates", () => {
    expect(dateOnly("2027-02-06T14:00:00.000Z")).toBe("2027-02-06");
    expect(dateOnly("2027-02-30")).toBeNull();
    expect(dateOnly("6 February 2027")).toBeNull();
    expect(dateOnly(null)).toBeNull();
  });

  it("turns empty text into null", () => {
    expect(textOrNull("  Lisbon ")).toBe("Lisbon");
    expect(textOrNull("   ")).toBeNull();
    expect(textOrNull(undefined)).toBeNull();
  });
});

describe("isRestrictedUrl", () => {
  it.each([
    ["https://devpost.com/hackathons", true],
    ["https://fictional.devpost.com/", true],
    ["https://events.mlh.com/x", true],
    ["https://www.eventbrite.co.uk/e/1", true],
    ["https://lu.ma/abc", true],
    ["https://harbourhacks.example/", false],
    ["https://notdevpost.com/", false],
    ["not a url", true],
  ])("%s is restricted: %s", (url, restricted) => {
    expect(isRestrictedUrl(url)).toBe(restricted);
  });
});

describe("parseHackClub", () => {
  it("maps events to hackr's shape and skips malformed ones", () => {
    const { events, skipped } = parseHackClub(HACK_CLUB_BODY);

    expect(skipped).toBe(2);
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({
      externalId: "hc-1",
      name: "Lagoon Hacks",
      url: "https://www.lagoonhacks.example/",
      sourceUrl: "https://hackathons.hackclub.com/",
      organiser: null,
      format: "in_person",
      city: "Lisbon",
      country: "Portugal",
      countryCode: "PT",
      startsOn: "2027-02-06",
      endsOn: "2027-02-07",
      prizeText: null,
    });
    expect(events.map(({ format }) => format)).toEqual(["in_person", "online", "hybrid"]);
    expect(events[2]?.city).toBe("Austin, TX");
  });

  it("refuses a response that is not a list", () => {
    expect(() => parseHackClub("{}")).toThrow("did not return a list");
  });
});

describe("parseHacksterFeed", () => {
  it("keeps the title, link and sponsor of each contest", () => {
    const { events, skipped } = parseHacksterFeed(HACKSTER_BODY);

    expect(skipped).toBe(1);
    expect(events.map(({ name, url, organiser, format, startsOn }) => [name, url, organiser, format, startsOn])).toEqual([
      ["Fictional Sensors & Signals", "https://www.hackster.io/contests/fictional-sensors", "Example Silicon", "online", null],
      ["Edge Ideas", "https://www.hackster.io/contests/edge-ideas", null, "online", null],
    ]);
  });

  it("refuses something that is not an Atom feed", () => {
    expect(() => parseHacksterFeed("<html></html>")).toThrow("not return an Atom feed");
  });
});

describe("parseHackHq", () => {
  it("keeps current events from organisers and contributors, never second-hand platform listings", () => {
    const { events, skipped } = parseHackHq(HACK_HQ_BODY);

    expect(events.map(({ externalId }) => externalId)).toEqual(["hq-1", "hq-5", "hq-6", "hq-7"]);
    expect(skipped).toBe(4);
    expect(events[0]).toMatchObject({
      name: "Harbour Hacks 2027",
      organiser: "Harbour Hacks",
      format: "in_person",
      city: "Bristol, UK",
      startsOn: "2027-01-09",
      prizeText: "$2,000 in prizes",
      sourceUrl: "https://github.com/Hack-HQ/hackhq",
    });
    expect(events.map(({ format }) => format)).toEqual(["in_person", "online", "hybrid", null]);
    expect(events[1]?.city).toBeNull();
  });

  it("refuses a file that is not a list", () => {
    expect(() => parseHackHq('{"listings": []}')).toThrow("not a list");
  });
});

describe("fetchSource", () => {
  it("identifies hackr, follows redirects and returns the body", async () => {
    const fetchImpl = vi.fn(async () => new Response("[]", { status: 200 }));

    await expect(fetchSource("https://example.org/feed", { fetchImpl })).resolves.toBe("[]");
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("user-agent")).toBe(USER_AGENT);
    expect(init.redirect).toBe("follow");
  });

  it("treats any non-2xx answer as an error", async () => {
    const fetchImpl = vi.fn(async () => new Response("blocked", { status: 403 }));

    await expect(fetchSource("https://example.org/feed", { fetchImpl })).rejects.toThrow("answered HTTP 403");
  });

  it("lists every source with an attribution", () => {
    expect(SOURCES.map(({ slug }) => slug)).toEqual(["hackclub", "hackster", "hackhq"]);
    expect(SOURCES.every(({ attribution }) => attribution.length > 0)).toBe(true);
  });
});
