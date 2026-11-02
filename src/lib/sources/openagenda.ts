import { z } from "zod";

import type { EventFormat, FetchBody, ListingCredit, ParseResult, Source, SourceEvent } from "./types";
import { canonicalUrl, dateOnly, hostOf, textOrNull } from "./url";

// OpenAgenda's read API (developers.openagenda.com/evenements/lecture.md). The key travels in a "key"
// header, never in the URL, so it stays out of logs.
const API = "https://api.openagenda.com/v2";
const SOURCE_URL = "https://openagenda.com";

/**
 * Agendas that carried hackathons when the source was added (docs/sources.md), read besides those
 * whose own name or description says "hackathon": Université Paris-Saclay, its research and its
 * schools agendas, and Cergy-Pontoise's business agenda.
 */
export const WATCHED_AGENDAS: readonly number[] = [86184123, 33113744, 75742032, 30432609];

// OpenAgenda's terms put public agendas under Licence Ouverte 2.0, but the licence is set per event,
// so each one is checked; an event under any other licence is left out.
const LICENCE = "etalab-2.0";
const CANCELLED = 6;
const MOVED_ONLINE = 3;
const FORMATS: Readonly<Record<number, EventFormat>> = { 1: "in_person", 2: "online", 3: "hybrid" };
// Enough for every page seen so far; a cap so a paging mistake can never loop.
const MAX_PAGES = 5;

const Text = z.record(z.string(), z.string().nullish());
const Timing = z.object({ begin: z.string(), end: z.string() });

const OpenAgendaEvent = z.object({
  uid: z.number(),
  title: Text,
  canonicalUrl: z.string().nullish(),
  attendanceMode: z.number().nullish(),
  status: z.number().nullish(),
  firstTiming: Timing.nullish(),
  lastTiming: Timing.nullish(),
  country: Text.nullish(),
  location: z.object({ city: z.string().nullish(), countryCode: z.string().nullish() }).nullish(),
  originAgenda: z.object({ slug: z.string().nullish() }).nullish(),
  rights: z
    .object({
      license: z.object({ id: z.string() }).nullish(),
      licensor: z.object({ name: z.string().nullish(), url: z.string().nullish() }).nullish(),
    })
    .nullish(),
  updatedAt: z.string().nullish(),
});
type OpenAgendaEvent = z.infer<typeof OpenAgendaEvent>;

const Page = z.object({
  agendas: z.array(z.unknown()).optional(),
  events: z.array(z.unknown()).optional(),
  total: z.number().nullish(),
  after: z.array(z.union([z.number(), z.string()])).nullish(),
});

// Agendas and events both carry a numeric uid.
const Uid = z.object({ uid: z.number() });

// Titles are written per language; hackbrief is in English, and most of these agendas are French.
function titleOf(title: OpenAgendaEvent["title"]): string | null {
  return textOrNull(title.en) ?? textOrNull(title.fr) ?? Object.values(title).map((value) => textOrNull(value)).find(Boolean) ?? null;
}

function webUrl(raw: string | null | undefined): string | null {
  const trimmed = textOrNull(raw);
  return trimmed && canonicalUrl(trimmed) ? trimmed : null;
}

function formatOf(event: OpenAgendaEvent): EventFormat | null {
  if (event.status === MOVED_ONLINE) {
    return "online";
  }
  return FORMATS[event.attendanceMode ?? 0] ?? null;
}

/** The licensor the licence says to name, with its site and the event's last update. */
function creditOf(event: OpenAgendaEvent): ListingCredit | null {
  const name = textOrNull(event.rights?.licensor?.name);
  return name ? { name, url: webUrl(event.rights?.licensor?.url), updatedOn: dateOnly(event.updatedAt) } : null;
}

/**
 * One event from OpenAgenda in hackbrief's shape, or null when it may not or cannot be shown: another
 * licence, cancelled, no title, no page to link to, or no licensor to credit.
 */
export function parseOpenAgendaEvent(item: unknown): SourceEvent | null {
  const parsed = OpenAgendaEvent.safeParse(item);
  if (!parsed.success) {
    return null;
  }
  const event = parsed.data;
  const name = titleOf(event.title);
  const credit = creditOf(event);
  const agendaSlug = textOrNull(event.originAgenda?.slug);
  const agendaPage = agendaSlug ? `${SOURCE_URL}/${encodeURIComponent(agendaSlug)}` : null;
  // canonicalUrl is the publisher's own page for the event, or OpenAgenda's page when there is none.
  const page = webUrl(event.canonicalUrl);
  const url = page ?? agendaPage;
  if (event.rights?.license?.id !== LICENCE || event.status === CANCELLED || !name || !url || !credit) {
    return null;
  }
  const format = formatOf(event);
  const online = format === "online";
  return {
    externalId: String(event.uid),
    name,
    url,
    sourceUrl: page && hostOf(page) === "openagenda.com" ? page : (agendaPage ?? SOURCE_URL),
    // OpenAgenda names the agenda that published an event, not who runs it.
    organiser: null,
    format,
    city: online ? null : textOrNull(event.location?.city),
    country: online ? null : textOrNull(event.country?.en),
    countryCode: online ? null : (textOrNull(event.location?.countryCode ?? event.country?.code)?.toUpperCase() ?? null),
    startsOn: dateOnly(event.firstTiming?.begin),
    endsOn: dateOnly(event.lastTiming?.end),
    prizeText: null,
    credit,
  };
}

function pageUrl(path: string, params: ReadonlyArray<readonly [string, string]>, after: ReadonlyArray<number | string>): string {
  const url = new URL(`${API}${path}`);
  for (const [name, value] of params) {
    url.searchParams.append(name, value);
  }
  for (const value of after) {
    url.searchParams.append("after[]", String(value));
  }
  return url.href;
}

/** Every item of a paged list: each answer's `after` asks for the next page, and null ends it. */
async function readList(
  fetchBody: FetchBody,
  headers: Record<string, string>,
  path: string,
  params: ReadonlyArray<readonly [string, string]>,
  field: "agendas" | "events",
): Promise<unknown[]> {
  const items: unknown[] = [];
  let after: ReadonlyArray<number | string> = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const answer = Page.parse(JSON.parse(await fetchBody(pageUrl(path, params, after), headers)));
    const found = answer[field];
    if (!found) {
      throw new Error(`OpenAgenda returned no ${field} for ${path}`);
    }
    items.push(...found);
    const ended = found.length === 0 || !answer.after?.length || items.length >= (answer.total ?? Infinity);
    if (ended) {
      break;
    }
    after = answer.after ?? [];
  }
  return items;
}

/** Reads the agendas, then their current and upcoming hackathons, one request at a time. */
async function loadOpenAgenda(fetchBody: FetchBody, key: string | undefined): Promise<ParseResult> {
  if (!key) {
    throw new Error("OPENAGENDA_API_KEY is not set");
  }
  const headers = { key };
  const searched = await readList(fetchBody, headers, "/agendas", [["search", "hackathon"], ["size", "100"]], "agendas");
  const agendas = new Set(searched.flatMap((item) => {
    const agenda = Uid.safeParse(item);
    return agenda.success ? [agenda.data.uid] : [];
  }));
  for (const uid of WATCHED_AGENDAS) {
    agendas.add(uid);
  }

  // One event can sit in several agendas: keep it once.
  const found = new Map<string, unknown>();
  for (const uid of agendas) {
    const events = await readList(
      fetchBody,
      headers,
      `/agendas/${uid}/events`,
      [["search", "hackathon"], ["relative[]", "current"], ["relative[]", "upcoming"], ["detailed", "1"], ["size", "300"]],
      "events",
    );
    for (const item of events) {
      const id = Uid.safeParse(item);
      const eventId = id.success ? String(id.data.uid) : `unreadable-${found.size}`;
      if (!found.has(eventId)) {
        found.set(eventId, item);
      }
    }
  }
  const events = [...found.values()].map(parseOpenAgendaEvent).filter((event): event is SourceEvent => event !== null);
  return { events, skipped: found.size - events.length };
}

/** OpenAgenda with the key from `apiKey`, read when the import runs. */
export function openAgendaSource(apiKey: () => string | undefined): Source {
  return {
    slug: "openagenda",
    name: "OpenAgenda",
    url: SOURCE_URL,
    // Each listing also credits its licensor and last update (ListingCredit), as the licence asks.
    attribution: "OpenAgenda (Licence Ouverte 2.0)",
    load: (fetchBody) => loadOpenAgenda(fetchBody, apiKey()),
  };
}

export const openAgenda = openAgendaSource(() => process.env.OPENAGENDA_API_KEY);
