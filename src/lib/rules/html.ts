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
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } });
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
