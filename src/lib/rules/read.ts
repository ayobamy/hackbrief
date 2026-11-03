import { isIP } from "node:net";

import { isWebUrl } from "@/lib/events/format";
import { USER_AGENT } from "@/lib/sources";
import { isFeedOnlyUrl, isRestrictedUrl } from "@/lib/sources/restricted";

import { isPublicAddress } from "./address";
import { htmlToText, rulesLinks } from "./html";
import { robotsAllows } from "./robots";

/** A fetch that is handed every request: tests pass a fake, the server passes the guarded one. */
export type Fetcher = (
  url: string,
  init: { headers: Record<string, string>; redirect: "manual"; signal: AbortSignal },
) => Promise<Response>;

export type SkipReason = "restricted" | "robots" | "unreachable" | "not-html" | "empty" | "off";

export type ReadResult =
  | { status: "read"; text: string; pages: string[] }
  | { status: "skipped"; reason: SkipReason };

/**
 * How long to keep a read: hours, so an organiser's site sees a few requests a day, except when the
 * site did not answer, which may pass in a minute and should not leave every visitor without a brief.
 */
export function cacheProfileFor(result: ReadResult): "minutes" | "hours" {
  return result.status === "skipped" && result.reason === "unreachable" ? "minutes" : "hours";
}

const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 2_000_000;
// Below this, a page holds a menu or a JavaScript shell, not rules.
const MIN_TEXT = 200;

class Skip extends Error {
  constructor(readonly reason: SkipReason) {
    super(reason);
  }
}

// A host written as an IP address is connected to without a DNS lookup, so the public-only lookup in
// fetcher.ts never sees it: such hosts are checked here instead.
function privateLiteral(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return true;
  }
  return isIP(host) !== 0 && !isPublicAddress(host);
}

function mayRead(url: string): boolean {
  return isWebUrl(url) && !privateLiteral(url) && !isRestrictedUrl(url) && !isFeedOnlyUrl(url);
}

/** Fetches a URL, following redirects by hand so that every hop is checked like the first. */
async function get(url: string, fetch: Fetcher): Promise<{ response: Response; url: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!mayRead(current)) {
      throw new Skip("restricted");
    }
    let response: Response;
    try {
      response = await fetch(current, {
        headers: { "user-agent": USER_AGENT, accept: "text/html, text/plain;q=0.9" },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new Skip("unreachable");
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).href;
      continue;
    }
    return { response, url: current };
  }
  throw new Skip("unreachable");
}

/** The body as text, cut off at MAX_BYTES so a huge page cannot exhaust memory. */
async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }
    // A chunk can be large, so cut the last one to the limit rather than stopping after it.
    const room = MAX_BYTES - bytes;
    const chunk = value.byteLength > room ? value.subarray(0, room) : value;
    bytes += chunk.byteLength;
    text += decoder.decode(chunk, { stream: true });
    if (bytes >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return text + decoder.decode();
}

/**
 * Whether robots.txt on this page's origin lets hackbrief read it. A missing file allows everything;
 * a server error forbids everything, as RFC 9309 says; an unreachable site is reported as such.
 */
async function robotsLet(pageUrl: string, fetch: Fetcher, cache: Map<string, string>): Promise<boolean> {
  const page = new URL(pageUrl);
  let robots = cache.get(page.origin);
  if (robots === undefined) {
    const { response } = await get(`${page.origin}/robots.txt`, fetch);
    if (response.ok) {
      robots = await readBody(response);
    } else {
      robots = response.status >= 500 ? "User-agent: *\nDisallow: /" : "";
    }
    cache.set(page.origin, robots);
  }
  return robotsAllows(robots, "hackbrief", `${page.pathname}${page.search}`);
}

async function readPage(url: string, fetch: Fetcher, robots: Map<string, string>) {
  if (!(await robotsLet(url, fetch, robots))) {
    throw new Skip("robots");
  }
  const { response, url: finalUrl } = await get(url, fetch);
  if (!response.ok) {
    throw new Skip("unreachable");
  }
  const type = response.headers.get("content-type") ?? "";
  const html = type.includes("text/html");
  if (!html && !type.includes("text/plain")) {
    throw new Skip("not-html");
  }
  const body = await readBody(response);
  return { url: finalUrl, body, text: html ? htmlToText(body) : body, html };
}

// A same-site rules page that cannot be read leaves the main page's text, which is still worth using.
async function readExtra(url: string, fetch: Fetcher, robots: Map<string, string>) {
  try {
    return await readPage(url, fetch, robots);
  } catch {
    return null;
  }
}

/**
 * Reads a listed hackathon's own page for the coach, at a visitor's request: never a restricted or
 * feed-only platform, only where robots.txt allows, plus up to two same-site pages whose path names
 * the rules, FAQ or judging. Nothing here is stored; the caller caches the result for a few hours.
 */
export async function readEventPage(url: string, { fetch }: { fetch: Fetcher }): Promise<ReadResult> {
  if (!mayRead(url)) {
    return { status: "skipped", reason: "restricted" };
  }
  const robots = new Map<string, string>();
  try {
    const main = await readPage(url, fetch, robots);
    const texts = [main.text];
    const pages = [main.url];
    for (const link of main.html ? rulesLinks(main.body, main.url) : []) {
      const more = await readExtra(link, fetch, robots);
      if (more) {
        texts.push(more.text);
        pages.push(more.url);
      }
    }
    const text = texts.join("\n\n").trim();
    return text.length < MIN_TEXT ? { status: "skipped", reason: "empty" } : { status: "read", text, pages };
  } catch (error) {
    return { status: "skipped", reason: error instanceof Skip ? error.reason : "unreachable" };
  }
}
