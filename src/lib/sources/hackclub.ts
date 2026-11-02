import { z } from "zod";

import type { EventFormat, ParseResult, Source, SourceEvent } from "./types";
import { canonicalUrl, dateOnly, textOrNull } from "./url";

// The documented API at https://hackathons.hackclub.com/data; fields hackbrief does not use are ignored.
const HackClubEvent = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  website: z.string().min(1),
  start: z.string(),
  end: z.string(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  country: z.string().nullish(),
  countryCode: z.string().nullish(),
  virtual: z.boolean().nullish(),
  hybrid: z.boolean().nullish(),
});

const SOURCE_URL = "https://hackathons.hackclub.com/";

function formatOf(event: z.infer<typeof HackClubEvent>): EventFormat {
  if (event.virtual) {
    return "online";
  }
  return event.hybrid ? "hybrid" : "in_person";
}

function toEvent(event: z.infer<typeof HackClubEvent>): SourceEvent | null {
  if (!canonicalUrl(event.website)) {
    return null;
  }
  const city = [textOrNull(event.city), textOrNull(event.state)].filter(Boolean).join(", ");
  return {
    externalId: event.id,
    name: event.name.trim(),
    url: event.website.trim(),
    sourceUrl: SOURCE_URL,
    organiser: null,
    format: formatOf(event),
    city: city || null,
    country: textOrNull(event.country),
    countryCode: textOrNull(event.countryCode)?.toUpperCase() ?? null,
    startsOn: dateOnly(event.start),
    endsOn: dateOnly(event.end),
    prizeText: null,
  };
}

export function parseHackClub(body: string): ParseResult {
  const data: unknown = JSON.parse(body);
  if (!Array.isArray(data)) {
    throw new Error("Hack Club API did not return a list");
  }
  const events: SourceEvent[] = [];
  for (const item of data) {
    const parsed = HackClubEvent.safeParse(item);
    const event = parsed.success ? toEvent(parsed.data) : null;
    if (event) {
      events.push(event);
    }
  }
  return { events, skipped: data.length - events.length };
}

export const hackClub: Source = {
  slug: "hackclub",
  name: "Hack Club Hackathons",
  url: SOURCE_URL,
  // Hack Club's API page: "If you use it, you must credit “Hack Club Hackathons” with a link".
  attribution: "Hack Club Hackathons",
  feedUrl: "https://hackathons.hackclub.com/api/events/upcoming",
  parse: parseHackClub,
};
