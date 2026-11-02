/**
 * The key that merges one hackathon listed by several sources: host without "www." and path
 * without trailing slash, lower case, with no scheme, query or fragment.
 * "https://www.Example.org/Hack/?ref=x" becomes "example.org/hack". Null for anything that is not
 * an http(s) URL.
 */
export function canonicalUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  return `${host}${path}`;
}

export function hostOf(raw: string): string | null {
  const canonical = canonicalUrl(raw);
  return canonical ? (canonical.split("/")[0] ?? null) : null;
}

/** The date part of an ISO date or date-time, if it is a real calendar date. */
export function dateOnly(raw: string | null | undefined): string | null {
  const match = raw ? /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim()) : null;
  if (!match) {
    return null;
  }
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  return date.getUTCMonth() === (month ?? 0) - 1 && date.getUTCDate() === day ? match[0].slice(0, 10) : null;
}

/** Trimmed text, or null when empty. */
export function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
