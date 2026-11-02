import { hackClub } from "./hackclub";
import { hackHq } from "./hackhq";
import { hackster } from "./hackster";
import type { Source } from "./types";

/** The sources the daily import reads, each recorded in docs/sources.md under "Use now". */
export const SOURCES: readonly Source[] = [hackClub, hackster, hackHq];

export const USER_AGENT = "hackbrief/0.1 (+https://github.com/ayobamy/hackbrief)";

/** Fetches a source with hackbrief's user agent and a time limit; any non-2xx answer is an error. */
export async function fetchSource(
  url: string,
  { timeoutMs = 15_000, fetchImpl = fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const response = await fetchImpl(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json, application/atom+xml;q=0.9, */*;q=0.1" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`${url} answered HTTP ${response.status}`);
  }
  return response.text();
}
