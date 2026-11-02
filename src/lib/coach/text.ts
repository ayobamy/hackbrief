/** One line of pasted rules, cleaned of Markdown and list markers. */
export interface Line {
  text: string;
  /** The line looks like a section heading ("## Prizes", "JUDGING", "Timeline:"). */
  heading: boolean;
  /** The line was a list item ("- ", "* ", "1. ", "a) "). */
  bullet: boolean;
}

const LIST_MARKER = /^\s*(?:[-*•▪◦·]|\d{1,2}[.)]|[a-z][.)])\s+/i;
const MARKDOWN_HEADING = /^\s*#{1,6}\s+/;

// Section names that appear in hackathon rules, so that a plain "Prizes" line ends the section
// before it, even without a colon or Markdown heading.
const KNOWN_SECTION =
  /^(?:prizes?|awards?|rules|official rules|eligibility|eligibility criteria|who can (?:enter|join|participate|apply)|participants|timeline|schedule|important dates|key dates|dates|submissions?|submission requirements|requirements|deliverables|what to submit|faq|about|overview|teams?|team formation|judges|judging|judging criteria|criteria|rubric|scoring|sponsors|resources|code of conduct|how to (?:enter|submit|participate)|contact)$/i;

function clean(raw: string): string {
  return raw
    .replace(MARKDOWN_HEADING, "")
    .replace(LIST_MARKER, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The text with its first letter in upper case: "impact" becomes "Impact". */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function wordCount(text: string): number {
  return text.split(" ").filter((word) => /\p{L}|\d/u.test(word)).length;
}

export function toLines(input: string): Line[] {
  return input.split(/\r?\n/).map((raw) => {
    const text = clean(raw);
    const words = wordCount(text);
    const bare = text.replace(/:$/, "");
    const shouted = /\p{Lu}/u.test(text) && text === text.toUpperCase() && words <= 6;
    const heading =
      text.length > 0 &&
      (MARKDOWN_HEADING.test(raw) ||
        (words <= 6 && text.endsWith(":")) ||
        shouted ||
        KNOWN_SECTION.test(bare));
    return { text, heading, bullet: LIST_MARKER.test(raw) && !MARKDOWN_HEADING.test(raw) };
  });
}

export interface Sentence {
  text: string;
  /** The heading of the section the sentence sits in, lower case; "" before the first one. */
  section: string;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=\p{Lu})/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/** Sentences of the pasted text, one per line or full stop, with their section heading. */
export function toSentences(input: string): Sentence[] {
  let section = "";
  const sentences: Sentence[] = [];
  for (const line of toLines(input)) {
    if (line.heading) {
      section = line.text.replace(/:$/, "").toLowerCase();
    }
    for (const text of splitSentences(line.text)) {
      sentences.push({ text, section });
    }
  }
  return sentences;
}
