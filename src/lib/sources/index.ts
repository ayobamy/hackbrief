import { hackClub } from "./hackclub";
import { hackHq } from "./hackhq";
import { hackster } from "./hackster";
import { openAgenda } from "./openagenda";
import type { Source } from "./types";

/** The sources the daily import reads, each recorded in docs/sources.md under "Use now". */
export const SOURCES: readonly Source[] = [
  hackClub,
  hackster,
  hackHq,
  openAgenda,
];

export const USER_AGENT =
  "hackbrief/0.1 (+https://github.com/ayobamy/hackbrief)";

/**
 * Fetches a source with hackbrief's user agent and a time limit; any non-2xx answer is an error.
 * `headers` adds to them, for an API key.
 */
export async function fetchSource(
  url: string,
  {
    timeoutMs = 15_000,
    fetchImpl = fetch,
    headers = {},
  }: {
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    headers?: Record<string, string>;
  } = {},
): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      ...headers,
      "user-agent": USER_AGENT,
      accept: "application/json, application/atom+xml;q=0.9, */*;q=0.1",
    },
    // A redirect keeps custom headers, even to another host, so a request carrying a key follows none.
    redirect: Object.keys(headers).length > 0 ? "error" : "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`${url} answered HTTP ${response.status}`);
  }
  return response.text();
}
