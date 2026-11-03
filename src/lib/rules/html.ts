import { HTMLElement, parse, TextNode, type Node } from "node-html-parser";

// Never part of the rules: code, styling, media, navigation and the document head.
const SKIPPED = new Set(["head", "script", "style", "noscript", "svg", "template", "iframe", "canvas", "nav", "button", "form"]);

// Elements that start a line of their own.
const BLOCKS = new Set([
  "address", "article", "aside", "blockquote", "dd", "details", "div", "dl", "dt", "figcaption", "figure",
  "footer", "header", "hr", "main", "ol", "p", "pre", "section", "summary", "table", "tbody", "thead", "ul",
]);

function squeeze(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * A page's text in the shape the coach reads pasted rules in: "# " headings, "- " list items and
 * "| a | b |" table rows, one block per line. Scripts, styles and navigation are dropped.
 */
export function htmlToText(html: string): string {
  // The parser reads a doctype as text, which would then open every page hackbrief reads (#71).
  const root = parse(html.replace(/^\s*<!doctype[^>]*>/i, ""), { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  const lines: string[] = [];
  let line = "";
  const flush = () => {
    const text = squeeze(line);
    if (text && text !== "-") {
      lines.push(text);
    }
    line = "";
  };
  const walk = (node: Node) => {
    if (node instanceof TextNode) {
      line += ` ${node.text}`;
      return;
    }
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const tag = node.rawTagName?.toLowerCase() ?? "";
    if (SKIPPED.has(tag)) {
      return;
    }
    const heading = /^h([1-6])$/.exec(tag)?.[1];
    if (heading) {
      flush();
      lines.push(`${"#".repeat(Number(heading))} ${squeeze(node.text)}`);
      return;
    }
    if (tag === "tr") {
      flush();
      const cells = node.childNodes
        .filter((cell): cell is HTMLElement => cell instanceof HTMLElement && /^t[dh]$/i.test(cell.rawTagName ?? ""))
        .map((cell) => squeeze(cell.text));
      if (cells.some(Boolean)) {
        lines.push(`| ${cells.join(" | ")} |`);
      }
      return;
    }
    if (tag === "li") {
      flush();
      line = "- ";
      node.childNodes.forEach(walk);
      flush();
      return;
    }
    if (tag === "br") {
      flush();
      return;
    }
    const block = BLOCKS.has(tag);
    if (block) {
      flush();
    }
    node.childNodes.forEach(walk);
    if (block) {
      flush();
    }
  };
  walk(root);
  flush();
  return lines.join("\n");
}

const RULES_PATH = /(?:rules|faq|judging|criteria|guidelines)/i;
const MAX_LINKS = 2;

function site(host: string): string {
  return host.replace(/^www\./, "");
}

/** A link on an event's page to another page of its own site, with the words it shows. */
export interface SiteLink {
  text: string;
  url: string;
}

const MAX_SITE_LINKS = 60;
const MAX_LINK_TEXT = 80;
// Files a page links to that hold no rules: images, styles, scripts, media and archives.
const NOT_A_PAGE = /\.(?:png|jpe?g|gif|svg|webp|ico|css|js|mjs|json|xml|zip|mp3|mp4|mov|woff2?)$/i;

/**
 * The links on a page to other pages of its own site (www or not), with their text, for a language
 * model to choose the ones worth reading (decision D13); never the page itself.
 */
export function siteLinks(html: string, pageUrl: string): SiteLink[] {
  const page = new URL(pageUrl);
  page.hash = "";
  const found: SiteLink[] = [];
  for (const anchor of parse(html).querySelectorAll("a[href]")) {
    let link: URL;
    try {
      link = new URL(anchor.getAttribute("href") ?? "", page);
    } catch {
      continue;
    }
    link.hash = "";
    const web = link.protocol === "https:" || link.protocol === "http:";
    const seen = link.href === page.href || found.some(({ url }) => url === link.href);
    if (!web || site(link.hostname) !== site(page.hostname) || NOT_A_PAGE.test(link.pathname) || seen) {
      continue;
    }
    found.push({ text: anchor.text.replace(/\s+/g, " ").trim().slice(0, MAX_LINK_TEXT), url: link.href });
    if (found.length === MAX_SITE_LINKS) {
      break;
    }
  }
  return found;
}

/**
 * Up to two pages on the same site (www or not) whose path names its rules, FAQ, judging or
 * guidelines, as absolute links without fragments; never the page itself.
 */
export function rulesLinks(html: string, pageUrl: string): string[] {
  const page = new URL(pageUrl);
  page.hash = "";
  const found: string[] = [];
  for (const anchor of parse(html).querySelectorAll("a[href]")) {
    let link: URL;
    try {
      link = new URL(anchor.getAttribute("href") ?? "", page);
    } catch {
      continue;
    }
    link.hash = "";
    const sameSite = site(link.hostname) === site(page.hostname);
    const web = link.protocol === "https:" || link.protocol === "http:";
    if (!web || !sameSite || !RULES_PATH.test(link.pathname) || link.href === page.href || found.includes(link.href)) {
      continue;
    }
    found.push(link.href);
    if (found.length === MAX_LINKS) {
      break;
    }
  }
  return found;
}
