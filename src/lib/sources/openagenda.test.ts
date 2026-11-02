import { afterEach, describe, expect, it, vi } from "vitest";

import { openAgenda, openAgendaSource, parseOpenAgendaEvent, WATCHED_AGENDAS } from "./openagenda";
import type { FetchBody } from "./types";

const LICENCE = { id: "etalab-2.0", name: "Licence Ouverte 2.0", url: "https://www.data.gouv.fr/pages/legal/licences/etalab-2.0/" };

// A fictional event in the shape OpenAgenda's v2 API returns with detailed=1.
function agendaEvent(overrides: Record<string, unknown> = {}) {
  return {
    uid: 1001,
    slug: "fictional-hackathon-2027",
    title: { fr: "Hackathon fictif 2027", en: "Fictional Hackathon 2027" },
    canonicalUrl: "https://openagenda.com/universite-fictive/events/fictional-hackathon-2027",
    attendanceMode: 1,
    status: 1,
    firstTiming: { begin: "2027-03-12T09:00:00.000+01:00", end: "2027-03-12T18:00:00.000+01:00" },
    lastTiming: { begin: "2027-03-14T09:00:00.000+01:00", end: "2027-03-14T17:00:00.000+01:00" },
    country: { code: "FR", en: "France", fr: "France" },
    location: { city: "Lyon", countryCode: "fr", address: "1 rue Fictive, Lyon" },
    originAgenda: { uid: 500, slug: "universite-fictive", title: "Université Fictive" },
    rights: {
      license: LICENCE,
      licensor: { agendaUid: 500, name: "Université Fictive", url: "https://universite-fictive.example" },
      publisher: { agendaUid: 500, name: "Université Fictive", url: "https://universite-fictive.example" },
    },
    updatedAt: "2027-01-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("parseOpenAgendaEvent", () => {
  it("reads an in-person event, with the licensor and last update to credit", () => {
    expect(parseOpenAgendaEvent(agendaEvent())).toEqual({
      externalId: "1001",
      name: "Fictional Hackathon 2027",
      url: "https://openagenda.com/universite-fictive/events/fictional-hackathon-2027",
      sourceUrl: "https://openagenda.com/universite-fictive/events/fictional-hackathon-2027",
      organiser: null,
      format: "in_person",
      city: "Lyon",
      country: "France",
      countryCode: "FR",
      startsOn: "2027-03-12",
      endsOn: "2027-03-14",
      prizeText: null,
      credit: { name: "Université Fictive", url: "https://universite-fictive.example", updatedOn: "2027-01-20" },
    });
  });

  it("links the publisher's own page, and credits OpenAgenda through the agenda's page", () => {
    const event = parseOpenAgendaEvent(agendaEvent({ canonicalUrl: "https://hack.universite-fictive.example/2027" }));

    expect(event).toMatchObject({
      url: "https://hack.universite-fictive.example/2027",
      sourceUrl: "https://openagenda.com/universite-fictive",
    });
  });

  it("falls back to the agenda's page when the event gives no page of its own", () => {
    expect(parseOpenAgendaEvent(agendaEvent({ canonicalUrl: null }))?.url).toBe("https://openagenda.com/universite-fictive");
  });

  it.each([
    ["online", { attendanceMode: 2 }, "online"],
    ["hybrid", { attendanceMode: 3 }, "hybrid"],
    ["moved online", { attendanceMode: 1, status: 3 }, "online"],
    ["of unknown attendance", { attendanceMode: 9 }, null],
  ])("reads an event %s", (_label, overrides, format) => {
    expect(parseOpenAgendaEvent(agendaEvent(overrides))?.format).toBe(format);
  });

  it("gives an online event no place", () => {
    expect(parseOpenAgendaEvent(agendaEvent({ attendanceMode: 2 }))).toMatchObject({ city: null, country: null, countryCode: null });
  });

  it("takes the English title, then the French one, then any other", () => {
    expect(parseOpenAgendaEvent(agendaEvent({ title: { fr: "Hackathon fictif", en: " " } }))?.name).toBe("Hackathon fictif");
    expect(parseOpenAgendaEvent(agendaEvent({ title: { de: "Fiktiver Hackathon" } }))?.name).toBe("Fiktiver Hackathon");
  });

  it("credits a licensor without a site by name, and one without a last update without a date", () => {
    const event = parseOpenAgendaEvent(
      agendaEvent({ rights: { license: LICENCE, licensor: { name: "Université Fictive", url: "javascript:alert(1)" } }, updatedAt: null }),
    );

    expect(event?.credit).toEqual({ name: "Université Fictive", url: null, updatedOn: null });
  });

  it.each([
    ["under another licence", { rights: { license: { id: "cc-by-nc-4.0" }, licensor: { name: "Université Fictive" } } }],
    ["with no licence", { rights: null }],
    ["cancelled", { status: 6 }],
    ["without a licensor to credit", { rights: { license: LICENCE, licensor: { name: " " } } }],
    ["without a title", { title: { fr: "" } }],
    ["without any page to link", { canonicalUrl: "not a url", originAgenda: null }],
    ["malformed", { uid: "not a number" }],
  ])("leaves out an event %s", (_label, overrides) => {
    expect(parseOpenAgendaEvent(agendaEvent(overrides))).toBeNull();
  });
});

interface Call {
  url: URL;
  headers: Record<string, string> | undefined;
}

/** A fake OpenAgenda: `answer` gets each request's path and query and returns the JSON body. */
function fakeApi(answer: (url: URL) => unknown): { fetchBody: FetchBody; calls: Call[] } {
  const calls: Call[] = [];
  const fetchBody: FetchBody = async (raw, headers) => {
    const url = new URL(raw);
    calls.push({ url, headers });
    return JSON.stringify(answer(url));
  };
  return { fetchBody, calls };
}

const NO_EVENTS = { events: [], total: 0, after: null };

describe("openAgendaSource", () => {
  it("refuses to run without a key, before any request", async () => {
    const { fetchBody, calls } = fakeApi(() => NO_EVENTS);

    await expect(openAgendaSource(() => undefined).load(fetchBody)).rejects.toThrow("OPENAGENDA_API_KEY is not set");
    expect(calls).toHaveLength(0);
  });

  it("reads the agendas about hackathons and the watched ones, once each event, with the key in a header", async () => {
    const shared = agendaEvent();
    const { fetchBody, calls } = fakeApi((url) => {
      if (url.pathname === "/v2/agendas") {
        return { agendas: [{ uid: 500, title: "Université Fictive" }, { uid: WATCHED_AGENDAS[0] }], total: 2, after: null };
      }
      if (url.pathname === "/v2/agendas/500/events") {
        return { events: [shared, agendaEvent({ uid: 1002, status: 6 })], total: 2, after: null };
      }
      // The same event, shared into a watched agenda.
      return url.pathname === `/v2/agendas/${WATCHED_AGENDAS[0]}/events` ? { events: [shared], total: 1, after: null } : NO_EVENTS;
    });

    const result = await openAgendaSource(() => "test-key").load(fetchBody);

    expect(result.events.map(({ externalId }) => externalId)).toEqual(["1001"]);
    expect(result.skipped).toBe(1);
    const paths = calls.map(({ url }) => url.pathname);
    expect(paths[0]).toBe("/v2/agendas");
    expect(paths.slice(1)).toEqual([500, ...WATCHED_AGENDAS].map((uid) => `/v2/agendas/${uid}/events`));
    expect(calls.every(({ headers, url }) => headers?.key === "test-key" && !url.href.includes("test-key"))).toBe(true);
    const query = calls[1]?.url.searchParams;
    expect(query?.get("search")).toBe("hackathon");
    expect(query?.getAll("relative[]")).toEqual(["current", "upcoming"]);
    expect(query?.get("detailed")).toBe("1");
  });

  it("follows each answer's after to the next page until it is null", async () => {
    const { fetchBody, calls } = fakeApi((url) => {
      if (url.pathname === "/v2/agendas") {
        return url.searchParams.has("after[]")
          ? { agendas: [{ uid: 501 }], total: 2, after: null }
          : { agendas: [{ uid: 500 }], total: 2, after: [8.4, 500] };
      }
      return NO_EVENTS;
    });

    await openAgendaSource(() => "test-key").load(fetchBody);

    const agendaCalls = calls.filter(({ url }) => url.pathname === "/v2/agendas");
    expect(agendaCalls.map(({ url }) => url.searchParams.getAll("after[]"))).toEqual([[], ["8.4", "500"]]);
    expect(calls.some(({ url }) => url.pathname === "/v2/agendas/501/events")).toBe(true);
  });

  it("stops after five pages even when the answers never end", async () => {
    let uid = 2000;
    const { fetchBody, calls } = fakeApi((url) => {
      if (url.pathname === "/v2/agendas") {
        return { agendas: [], total: 0, after: null };
      }
      uid += 1;
      return { events: [agendaEvent({ uid })], total: 1000, after: [uid] };
    });

    const result = await openAgendaSource(() => "test-key").load(fetchBody);

    expect(calls.filter(({ url }) => url.pathname === `/v2/agendas/${WATCHED_AGENDAS[0]}/events`)).toHaveLength(5);
    expect(result.events).toHaveLength(5 * WATCHED_AGENDAS.length);
  });

  it("counts an entry it cannot read as left out", async () => {
    const { fetchBody } = fakeApi((url) =>
      url.pathname === "/v2/agendas" ? { agendas: [], total: 0, after: null } : { events: [{ title: "no uid" }], total: 1, after: null },
    );

    const result = await openAgendaSource(() => "test-key").load(fetchBody);

    expect(result).toEqual({ events: [], skipped: WATCHED_AGENDAS.length });
  });

  it("fails on an answer that is not a list, so the import keeps the last good listings", async () => {
    const { fetchBody } = fakeApi(() => ({ error: "invalid key" }));

    await expect(openAgendaSource(() => "test-key").load(fetchBody)).rejects.toThrow("OpenAgenda returned no agendas");
  });
});

describe("openAgenda", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads its key from OPENAGENDA_API_KEY when the import runs", async () => {
    const { fetchBody, calls } = fakeApi(() => ({ agendas: [], events: [], total: 0, after: null }));

    vi.stubEnv("OPENAGENDA_API_KEY", "");
    await expect(openAgenda.load(fetchBody)).rejects.toThrow("OPENAGENDA_API_KEY is not set");

    vi.stubEnv("OPENAGENDA_API_KEY", "env-key");
    await openAgenda.load(fetchBody);
    expect(calls.every(({ headers }) => headers?.key === "env-key")).toBe(true);
  });
});
