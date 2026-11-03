import { isIP } from "node:net";

import { isWebUrl } from "@/lib/events/format";
import { USER_AGENT } from "@/lib/sources";
import { isFeedOnlyUrl, isRestrictedUrl } from "@/lib/sources/restricted";

import { isPublicAddress } from "./address";
import { htmlToText, rulesLinks, siteLinks, type SiteLink } from "./html";
import { robotsAllows } from "./robots";

/** A fetch that is handed every request: tests pass a fake, the server passes the guarded one. */
export type Fetcher = (
  url: string,
  init: { headers: Record<string, string>; redirect: "manual"; signal: AbortSignal },
) => Promise<Response>;

export type SkipReason = "restricted" | "robots" | "refused" | "unreachable" | "not-html" | "empty" | "off";

export type ReadResult =
  | {
      status: "read";
      text: string;
      pages: string[];
    }
  | { status: "skipped"; reason: SkipReason };

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

/** The body's bytes, cut off at MAX_BYTES so a huge page cannot exhaust memory, and whether it was cut. */
async function readBytes(response: Response): Promise<{ bytes: Uint8Array; cut: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    return { bytes: new Uint8Array(), cut: false };
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }
    // A chunk can be large, so cut the last one to the limit rather than stopping after it.
    const room = MAX_BYTES - size;
    const chunk = value.byteLength > room ? value.subarray(0, room) : value;
    chunks.push(chunk);
    size += chunk.byteLength;
    if (size >= MAX_BYTES) {
      await reader.cancel();
      return { bytes: joined(chunks, size), cut: true };
    }
  }
  return { bytes: joined(chunks, size), cut: false };
}

function joined(chunks: readonly Uint8Array[], size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

/** The body as text, cut off at MAX_BYTES. */
async function readBody(response: Response): Promise<string> {
  return new TextDecoder().decode((await readBytes(response)).bytes);
}

const MAX_PDF_PAGES = 40;
const PDF_TIMEOUT_MS = 10_000;
// A single image a PDF declares cannot ask for more than about 16 megapixels (unpdf's own advice).
const MAX_PDF_IMAGE = 16_777_216;

/**
 * The text of a rules PDF (decision D13), with unpdf, loaded only when a PDF turns up: at most 40 pages
 * and 10 seconds, since parsing runs on the event loop. A PDF it cannot read is skipped like any other
 * page in a form hackbrief cannot use.
 */
async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const read = async () => {
    const pdf = await getDocumentProxy(bytes, { maxImageSize: MAX_PDF_IMAGE });
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Skip("not-html");
    }
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Skip("not-html")), PDF_TIMEOUT_MS);
  });
  try {
    return await Promise.race([read(), late]);
  } catch {
    throw new Skip("not-html");
  } finally {
    clearTimeout(timer);
  }
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
  // A site that forbids hackbrief or asks it to slow down is left alone (a polite crawler, #60).
  if (response.status === 403 || response.status === 429) {
    throw new Skip("refused");
  }
  if (!response.ok) {
    throw new Skip("unreachable");
  }
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/pdf")) {
    const { bytes, cut } = await readBytes(response);
    if (cut) {
      throw new Skip("not-html");
    }
    return { url: finalUrl, body: "", text: await pdfText(bytes), html: false };
  }
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

/** Picks the site's pages worth reading besides the event's own (decision D13), from its links. */
export type Chooser = (links: SiteLink[]) => Promise<string[]>;

const MAX_CHOSEN = 3;

// Only pages from the list offered, at most three; a chooser that fails leaves the rules links alone.
async function chosenFrom(choose: Chooser, offered: SiteLink[]): Promise<string[]> {
  if (offered.length === 0) {
    return [];
  }
  try {
    const allowed = new Set(offered.map(({ url }) => url));
    return [...new Set(await choose(offered))].filter((link) => allowed.has(link)).slice(0, MAX_CHOSEN);
  } catch {
    return [];
  }
}

/**
 * Reads a listed hackathon's own page for the coach: never a restricted or feed-only platform, only
 * where robots.txt allows, plus up to two same-site pages whose path names the rules, FAQ or judging,
 * and up to three more of the site's pages a language model chose from its links (`choose`), each read
 * under the same rules. Nothing here is stored; the caller caches the result.
 */
export async function readEventPage(url: string, { fetch, choose }: { fetch: Fetcher; choose?: Chooser }): Promise<ReadResult> {
  if (!mayRead(url)) {
    return { status: "skipped", reason: "restricted" };
  }
  const robots = new Map<string, string>();
  try {
    const main = await readPage(url, fetch, robots);
    const texts = [main.text];
    const pages = [main.url];
    const rules = main.html ? rulesLinks(main.body, main.url) : [];
    const chosen = main.html && choose ? await chosenFrom(choose, siteLinks(main.body, main.url)) : [];
    for (const link of [...new Set([...rules, ...chosen])]) {
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
