import { describe, expect, it, vi } from "vitest";

import { buildBrief } from "@/lib/coach/brief";

import { isPublicAddress, publicOnlyLookup } from "./address";
import { htmlToText, rulesLinks, siteLinks } from "./html";
import { cacheProfileFor, readEventPage, type Fetcher } from "./read";
import { robotsAllows } from "./robots";

describe("robotsAllows", () => {
  it.each([
    ["", "/rules", true],
    ["User-agent: *\nDisallow: /", "/rules", false],
    ["User-agent: *\nDisallow:", "/rules", true],
    ["User-agent: *\r\nDisallow: /private # staff only\r\n", "/private/x", false],
    ["User-agent: *\nDisallow: /\n\nUser-agent: hackbrief\nAllow: /", "/rules", true],
    ["User-agent: hackbrief\nDisallow: /\n\nUser-agent: *\nAllow: /", "/rules", false],
    ["User-agent: *\nDisallow: /private\nAllow: /private/rules", "/private/rules", true],
    ["User-agent: *\nDisallow: /private\nAllow: /private/rules", "/private/notes", false],
    ["User-agent: *\nDisallow: /*.pdf$", "/rules.pdf", false],
    ["User-agent: *\nDisallow: /*.pdf$", "/rules.pdf?print=1", true],
    ["User-agent: googlebot\nDisallow: /", "/rules", true],
  ])("%j for %s: %s", (robots, path, allowed) => {
    expect(robotsAllows(robots, "hackbrief", path)).toBe(allowed);
  });
});

describe("isPublicAddress", () => {
  it.each([
    ["8.8.8.8", true],
    ["104.16.0.1", true],
    ["2606:4700:4700::1111", true],
    ["10.0.0.1", false],
    ["127.0.0.1", false],
    ["169.254.169.254", false],
    ["172.16.5.4", false],
    ["192.168.1.1", false],
    ["100.64.0.1", false],
    ["0.0.0.0", false],
    ["::1", false],
    ["fe80::1", false],
    ["fc00::1", false],
    ["::ffff:127.0.0.1", false],
    ["not an address", false],
  ])("%s is public: %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });

  it("refuses a name that resolves to any private address, at connection time", async () => {
    const lookup = publicOnlyLookup((host, callback) =>
      callback(null, host === "rebind.example" ? [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }] : [{ address: "93.184.216.34", family: 4 }]),
    );
    const resolve = (host: string) =>
      new Promise((done) => lookup(host, { all: true }, (error, addresses) => done(error ? error.message : addresses)));

    expect(await resolve("rebind.example")).toMatch(/not a public address/);
    expect(await resolve("organiser.example")).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });
});

const PAGE = `<!doctype html>
<html><head><title>Fictional Harbour Hack</title><style>body { color: red }</style></head>
<body>
  <nav><a href="/">Home</a><a href="/rules">Rules</a><a href="/faq#teams">FAQ</a></nav>
  <script>window.track("visit")</script>
  <h1>Fictional Harbour Hack 2027</h1>
  <p>Teams of up to 4 people. Solo entries are welcome &amp; encouraged.</p>
  <h2>Judging</h2>
  <ul><li>Impact (40%)</li><li>Technical quality (60%)</li></ul>
  <table><tr><th>Date</th><th>What</th></tr><tr><td>2027-03-14</td><td>Submission deadline</td></tr></table>
  <a href="https://elsewhere.example/rules">Partner rules</a>
  <a href="mailto:team@harbour-hack.example">Email us</a>
</body></html>`;

describe("htmlToText", () => {
  const text = htmlToText(PAGE);

  it("keeps headings, list items and table rows in the forms the coach reads", () => {
    expect(text).toContain("# Fictional Harbour Hack 2027");
    expect(text).toContain("## Judging");
    expect(text).toContain("- Impact (40%)");
    expect(text).toContain("| 2027-03-14 | Submission deadline |");
    expect(text).toContain("Solo entries are welcome & encouraged.");
  });

  it("drops scripts, styles and navigation", () => {
    expect(text).not.toContain("window.track");
    expect(text).not.toContain("color: red");
    expect(text).not.toContain("Home");
  });

  it("gives the coach enough to build a brief", () => {
    const brief = buildBrief(text, "2026-11-02");

    expect(brief.deadline?.date).toBe("2027-03-14");
    // In the order the rules give them.
    expect(brief.judging.criteria.map(({ name, weight }) => [name, weight])).toEqual([
      ["Impact", 40],
      ["Technical quality", 60],
    ]);
    expect(brief.team?.max).toBe(4);
  });
});

describe("rulesLinks", () => {
  it("finds up to two pages on the same site whose path names its rules, FAQ or judging", () => {
    expect(rulesLinks(PAGE, "https://www.harbour-hack.example/")).toEqual([
      "https://www.harbour-hack.example/rules",
      "https://www.harbour-hack.example/faq",
    ]);
  });

  it("treats the bare host and www as one site, and never returns the page itself", () => {
    const html = '<a href="https://harbour-hack.example/judging">J</a><a href="/rules">R</a>';

    expect(rulesLinks(html, "https://www.harbour-hack.example/rules")).toEqual(["https://harbour-hack.example/judging"]);
  });
});

describe("siteLinks", () => {
  it("lists the page's links to its own site with their text, for a model to choose from", () => {
    const html = `<nav><a href="/">Home</a><a href="/hacker-guide">Hacker  guide</a><a href="https://harbour-hack.example/schedule#day2">Schedule</a></nav>
<a href="https://other.example/rules">Partner rules</a><a href="mailto:hi@harbour-hack.example">Email</a>
<a href="/logo.png">Logo</a><a href="/hacker-guide">Guide again</a><a href="/rules.pdf">Official rules (PDF)</a>`;

    expect(siteLinks(html, "https://www.harbour-hack.example/")).toEqual([
      { text: "Hacker guide", url: "https://www.harbour-hack.example/hacker-guide" },
      { text: "Schedule", url: "https://harbour-hack.example/schedule" },
      { text: "Official rules (PDF)", url: "https://www.harbour-hack.example/rules.pdf" },
    ]);
  });
});

// A fake network: each URL answers with a status, a content type and a body, or throws.
function network(pages: Record<string, { status?: number; type?: string; body?: string; location?: string } | Error>): {
  fetch: Fetcher;
  calls: string[];
} {
  const calls: string[] = [];
  const fetch: Fetcher = async (url) => {
    calls.push(url);
    const page = pages[url];
    if (page instanceof Error) {
      throw page;
    }
    if (!page) {
      return new Response("not found", { status: 404 });
    }
    const headers = new Headers({ "content-type": page.type ?? "text/html; charset=utf-8" });
    if (page.location) {
      headers.set("location", page.location);
    }
    return new Response(page.body ?? "", { status: page.status ?? 200, headers });
  };
  return { fetch, calls };
}

// A one-page PDF of fictional rules, with each line drawn as text, the way organisers' rules PDFs hold it.
function pdfOf(lines: readonly string[]): string {
  const text = lines.map((line, index) => `BT /F1 12 Tf 72 ${720 - index * 16} Td (${line}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const at = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((at) => `${String(at).padStart(10, "0")} 00000 n \n`).join("")}`;
  return `${pdf}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

const RULES_PDF = pdfOf([
  "Harbour Hack official rules",
  "Submissions close on 7 March 2027 at 9:00 AM GMT.",
  "Teams may have up to four members.",
  "Each team must submit a demo video and a public repository.",
  "Entry is open to students aged 16 and over, in any country.",
]);

describe("cacheProfileFor", () => {
  it("keeps a page read, or a refusal, for hours, but a site that did not answer only for minutes", () => {
    expect(cacheProfileFor({ status: "read", text: "Rules", pages: ["https://hack.example/"] })).toBe("hours");
    expect(cacheProfileFor({ status: "skipped", reason: "robots" })).toBe("hours");
    expect(cacheProfileFor({ status: "skipped", reason: "empty" })).toBe("hours");
    expect(cacheProfileFor({ status: "skipped", reason: "unreachable" })).toBe("minutes");
  });
});

describe("readEventPage", () => {
  const RULES_PAGE = "<h2>Rules</h2><p>Each team must provide a demo video of no more than 3 minutes and a public repository.</p>";

  it("reads the event's page and its same-site rules pages", async () => {
    const { fetch, calls } = network({
      "https://www.harbour-hack.example/": { body: PAGE },
      "https://www.harbour-hack.example/rules": { body: RULES_PAGE },
    });

    const result = await readEventPage("https://www.harbour-hack.example/", { fetch });

    expect(result.status).toBe("read");
    expect(result.status === "read" && result.pages).toEqual([
      "https://www.harbour-hack.example/",
      "https://www.harbour-hack.example/rules",
    ]);
    expect(result.status === "read" && result.text).toContain("demo video of no more than 3 minutes");
    expect(calls[0]).toBe("https://www.harbour-hack.example/robots.txt");
  });

  it("also reads up to three pages a model chose from the site's own links, and goes on without them if it fails", async () => {
    const home = `<h1>Harbour Hack</h1><p>${"Welcome to the harbour. ".repeat(12)}</p><a href="/hacker-guide">Hacker guide</a><a href="/sponsors">Sponsors</a><a href="https://other.example/x">Elsewhere</a>`;
    const pages = { "https://www.harbour-hack.example/": { body: home }, "https://www.harbour-hack.example/hacker-guide": { body: RULES_PAGE } };
    const { fetch, calls } = network(pages);
    const offered: string[][] = [];

    const result = await readEventPage("https://www.harbour-hack.example/", {
      fetch,
      choose: async (links) => {
        offered.push(links.map(({ url }) => url));
        return ["https://www.harbour-hack.example/hacker-guide", "https://other.example/x"];
      },
    });

    expect(offered).toEqual([["https://www.harbour-hack.example/hacker-guide", "https://www.harbour-hack.example/sponsors"]]);
    expect(result.status === "read" && result.pages).toEqual(["https://www.harbour-hack.example/", "https://www.harbour-hack.example/hacker-guide"]);
    expect(result.status === "read" && result.text).toContain("demo video of no more than 3 minutes");
    expect(calls).not.toContain("https://other.example/x");
    const failing = await readEventPage("https://www.harbour-hack.example/", {
      fetch: network(pages).fetch,
      choose: async () => {
        throw new Error("The model is down");
      },
    });
    expect(failing.status === "read" && failing.pages).toEqual(["https://www.harbour-hack.example/"]);
  });

  it("reads a rules PDF the page links to, or the listed page when it is a PDF", async () => {
    const home = `<h1>Harbour Hack</h1><p>${"Welcome to the harbour. ".repeat(12)}</p><a href="/official-rules.pdf">Official rules (PDF)</a>`;
    const { fetch } = network({
      "https://www.harbour-hack.example/": { body: home },
      "https://www.harbour-hack.example/official-rules.pdf": { type: "application/pdf", body: RULES_PDF },
      "https://pdf-only.example/rules.pdf": { type: "application/pdf", body: RULES_PDF },
    });

    const linked = await readEventPage("https://www.harbour-hack.example/", {
      fetch,
      choose: async () => ["https://www.harbour-hack.example/official-rules.pdf"],
    });
    expect(linked.status === "read" && linked.pages).toEqual(["https://www.harbour-hack.example/", "https://www.harbour-hack.example/official-rules.pdf"]);
    expect(linked.status === "read" && linked.text).toContain("Submissions close on 7 March 2027 at 9:00 AM GMT.");
    const only = await readEventPage("https://pdf-only.example/rules.pdf", { fetch });
    expect(only.status === "read" && only.text).toContain("Teams may have up to four members.");
  });

  it("never reads a platform that asks first, nor Hackster's contest pages", async () => {
    const { fetch, calls } = network({});

    expect(await readEventPage("https://devpost.com/software/x", { fetch })).toEqual({ status: "skipped", reason: "restricted" });
    expect(await readEventPage("https://www.hackster.io/contests/x", { fetch })).toEqual({ status: "skipped", reason: "restricted" });
    expect(calls).toEqual([]);
  });

  it("follows robots.txt", async () => {
    const { fetch, calls } = network({ "https://shy.example/robots.txt": { type: "text/plain", body: "User-agent: *\nDisallow: /" } });

    expect(await readEventPage("https://shy.example/hack", { fetch })).toEqual({ status: "skipped", reason: "robots" });
    expect(calls).toEqual(["https://shy.example/robots.txt"]);
  });

  it("stops at a redirect to a restricted platform", async () => {
    const { fetch } = network({
      "https://moved.example/": { status: 302, location: "https://devpost.com/hackathons/x" },
    });

    expect(await readEventPage("https://moved.example/", { fetch })).toEqual({ status: "skipped", reason: "restricted" });
  });

  it("reports pages it cannot use", async () => {
    const { fetch } = network({
      "https://pdf.example/": { type: "application/pdf", body: "%PDF" },
      "https://thin.example/": { body: '<div id="root"></div><script src="/app.js"></script>' },
      "https://down.example/": new Error("connect ECONNREFUSED"),
      "https://gone.example/": { status: 500, body: "oops" },
    });

    expect(await readEventPage("https://pdf.example/", { fetch })).toEqual({ status: "skipped", reason: "not-html" });
    expect(await readEventPage("https://thin.example/", { fetch })).toEqual({ status: "skipped", reason: "empty" });
    expect(await readEventPage("https://down.example/", { fetch })).toEqual({ status: "skipped", reason: "unreachable" });
    expect(await readEventPage("https://gone.example/", { fetch })).toEqual({ status: "skipped", reason: "unreachable" });
  });

  it("reads no more than its size limit of a long page", async () => {
    const huge = `<p>${"Teams of up to 4 people. ".repeat(200_000)}</p>`;
    const { fetch } = network({ "https://long.example/": { body: huge } });

    const result = await readEventPage("https://long.example/", { fetch });

    expect(result.status).toBe("read");
    expect(result.status === "read" && result.text.length).toBeLessThan(2_100_000);
  });

  it("refuses private addresses written as IPs, which skip the DNS check, before connecting", async () => {
    const fetch = vi.fn<Fetcher>();

    for (const url of ["http://169.254.169.254/latest/meta-data/", "http://127.0.0.1:3000/", "http://[::1]/", "http://10.1.2.3/rules"]) {
      expect(await readEventPage(url, { fetch })).toEqual({ status: "skipped", reason: "restricted" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses anything that is not a web address", async () => {
    const fetch = vi.fn<Fetcher>();

    expect(await readEventPage("javascript:alert(1)", { fetch })).toEqual({ status: "skipped", reason: "restricted" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
