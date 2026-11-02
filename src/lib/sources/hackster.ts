import type { ParseResult, Source, SourceEvent } from "./types";
import { canonicalUrl, textOrNull } from "./url";

const ENTITIES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(amp|lt|gt|quot|apos);/g, (_match, name: string) => ENTITIES[name] ?? "")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .trim();
}

function tag(entry: string, name: string): string | null {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(entry);
  return match?.[1] ? decode(match[1]) : null;
}

function alternateLink(entry: string): string | null {
  for (const match of entry.matchAll(/<link\b([^>]*)\/?>/g)) {
    const attributes = match[1] ?? "";
    const rel = /\brel="([^"]*)"/.exec(attributes)?.[1] ?? "alternate";
    const href = /\bhref="([^"]*)"/.exec(attributes)?.[1];
    if (rel === "alternate" && href) {
      return decode(href);
    }
  }
  return null;
}

function toEvent(entry: string): SourceEvent | null {
  const id = tag(entry, "id");
  const title = tag(entry, "title");
  const link = alternateLink(entry);
  if (!id || !title || !link || !canonicalUrl(link)) {
    return null;
  }
  // The feed carries no contest dates, and its summary text is Hackster's: hackr keeps the facts
  // (title, link, sponsor) and links to the contest page for the rest.
  return {
    externalId: id,
    name: title,
    url: link,
    sourceUrl: link,
    organiser: textOrNull(tag(tag(entry, "author") ?? "", "name")),
    format: "online",
    city: null,
    country: null,
    countryCode: null,
    startsOn: null,
    endsOn: null,
    prizeText: null,
  };
}

export function parseHacksterFeed(body: string): ParseResult {
  if (!/<feed\b/.test(body)) {
    throw new Error("Hackster did not return an Atom feed");
  }
  const entries = [...body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1] ?? "");
  const events = entries.map(toEvent).filter((event): event is SourceEvent => event !== null);
  return { events, skipped: entries.length - events.length };
}

export const hackster: Source = {
  slug: "hackster",
  name: "Hackster.io contests",
  url: "https://www.hackster.io/contests",
  attribution: "Hackster.io",
  feedUrl: "https://www.hackster.io/contests.atom",
  parse: parseHacksterFeed,
};
