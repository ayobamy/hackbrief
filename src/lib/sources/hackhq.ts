import { z } from "zod";

import { isPlaceholder } from "./placeholder";
import { isRestrictedUrl } from "./restricted";
import type { EventFormat, ParseResult, Source, SourceEvent } from "./types";
import { canonicalUrl, dateOnly, textOrNull } from "./url";

// HackHQ's MIT listings file (github.com/Hack-HQ/hackhq, .github/scripts/listings.json).
const HackHqListing = z.object({
  id: z.string().min(1),
  company_name: z.string().nullish(),
  title: z.string().min(1),
  url: z.string().min(1),
  locations: z.array(z.string()).nullish(),
  format: z.string().nullish(),
  prize: z.string().nullish(),
  state: z.string().nullish(),
  active: z.boolean().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  source: z.string().nullish(),
});
type HackHqListing = z.infer<typeof HackHqListing>;

// Where HackHQ says an entry came from. Entries taken from platforms that say "ask first" are left
// out (docs/sources.md); HackHQ's own contributors and organisers' sites are kept.
const RESTRICTED_ORIGINS = new Set(["devpost", "mlh", "luma", "lablab.ai", "devfolio", "unstop", "eventbrite", "dorahacks"]);

const SOURCE_URL = "https://github.com/Hack-HQ/hackhq";

function formatOf(raw: string | null | undefined): EventFormat | null {
  const value = raw?.toLowerCase() ?? "";
  if (value.includes("hybrid")) {
    return "hybrid";
  }
  if (/virtual|online|remote/.test(value)) {
    return "online";
  }
  return /in[- ]?person|on[- ]?site/.test(value) ? "in_person" : null;
}

/** HackHQ titles add the date and notes after a dash: "804 Hacks 2026 — Oct 18, 2026 (...)". */
function nameOf(listing: HackHqListing): string {
  const title = listing.title.split(/\s[—–]\s/)[0]?.trim();
  return title || listing.company_name?.trim() || listing.title.trim();
}

function isUsable(listing: HackHqListing): boolean {
  const current = listing.active === true || listing.state === "open" || listing.state === "opens_soon";
  const origin = listing.source?.toLowerCase() ?? "";
  return current && !RESTRICTED_ORIGINS.has(origin) && !isRestrictedUrl(listing.url) && canonicalUrl(listing.url) !== null;
}

// HackHQ writes "Online" or "Remote" as the location of online events; that is a format, not a city.
function cityOf(listing: HackHqListing): string | null {
  const location = textOrNull(listing.locations?.[0]);
  return location && !/^(?:online|virtual|remote|global)$/i.test(location) ? location : null;
}

// "TBA", "N/A", a lone dash and the like say nothing about the prize.
function prizeOf(listing: HackHqListing): string | null {
  const prize = textOrNull(listing.prize);
  return prize && !isPlaceholder(prize) ? prize : null;
}

function toEvent(listing: HackHqListing): SourceEvent {
  return {
    externalId: listing.id,
    name: nameOf(listing),
    url: listing.url.trim(),
    sourceUrl: SOURCE_URL,
    organiser: textOrNull(listing.company_name),
    format: formatOf(listing.format),
    city: cityOf(listing),
    country: null,
    countryCode: null,
    startsOn: dateOnly(listing.startDate),
    endsOn: dateOnly(listing.endDate),
    prizeText: prizeOf(listing),
  };
}

export function parseHackHq(body: string): ParseResult {
  const data: unknown = JSON.parse(body);
  if (!Array.isArray(data)) {
    throw new Error("HackHQ listings are not a list");
  }
  const events = data.flatMap((item) => {
    const parsed = HackHqListing.safeParse(item);
    return parsed.success && isUsable(parsed.data) ? [toEvent(parsed.data)] : [];
  });
  return { events, skipped: data.length - events.length };
}

export const hackHq: Source = {
  slug: "hackhq",
  name: "HackHQ",
  url: SOURCE_URL,
  attribution: "HackHQ (MIT licence)",
  load: async (fetchBody) =>
    parseHackHq(await fetchBody("https://raw.githubusercontent.com/Hack-HQ/hackhq/main/.github/scripts/listings.json")),
};
