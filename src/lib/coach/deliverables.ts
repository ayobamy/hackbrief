import { toSentences } from "./text";

export type DeliverableId =
  | "repository"
  | "video"
  | "slides"
  | "readme"
  | "live-demo"
  | "description"
  | "screenshots"
  | "technologies"
  | "licence"
  | "required-technology"
  | "pitch";

export interface Deliverable {
  id: DeliverableId;
  label: string;
  /** The sentence of the rules that asks for it. */
  source: string;
}

interface Rule {
  id: DeliverableId;
  pattern: RegExp;
  label: (sentence: string) => string;
  /** Counts in any sentence, not only in one about submitting. */
  anywhere?: boolean;
}

const VIDEO_MINUTES = /(?:(\d{1,2})\s*(?:-|–|to)\s*)?(\d{1,2})[\s-]*(?:minutes?|mins?)\b/i;

function videoLabel(sentence: string): string {
  const minutes = VIDEO_MINUTES.exec(sentence)?.[2];
  return minutes ? `Demo video, at most ${minutes} minutes` : "Demo video";
}

function repositoryLabel(sentence: string): string {
  return /\bpublic\b/i.test(sentence) ? "Link to a public code repository" : "Link to the code repository";
}

const RULES: readonly Rule[] = [
  { id: "repository", pattern: /\b(?:github|gitlab|bitbucket|repo(?:sitory)?|source code)\b/i, label: repositoryLabel },
  { id: "video", pattern: /\b(?:video|youtube|vimeo|screen recording)\b/i, label: videoLabel },
  { id: "slides", pattern: /\b(?:slides?|slide deck|pitch deck|deck)\b/i, label: () => "Slide deck" },
  { id: "readme", pattern: /\breadme\b/i, label: () => "README" },
  {
    id: "live-demo",
    pattern: /\b(?:live demo|deployed|hosted|demo (?:link|url)|working (?:demo|link|url|prototype)|try it out link)\b/i,
    label: () => "Link to a working demo",
  },
  {
    id: "description",
    pattern: /\b(?:project description|write-?up|describe (?:your|the) project|project summary|short description)\b/i,
    label: () => "Project description",
  },
  { id: "screenshots", pattern: /\b(?:screenshots?|images? of (?:your|the) project)\b/i, label: () => "Screenshots" },
  {
    id: "technologies",
    pattern: /\b(?:built with|technologies used|tech stack|list (?:of )?(?:the )?(?:technologies|tools))\b/i,
    label: () => "List of the technologies used",
  },
  {
    id: "licence",
    pattern: /\b(?:open[- ]source licen[cs]e|licen[cs]ed under|osi[- ]approved|mit licen[cs]e|apache)\b/i,
    label: () => "Open-source licence",
  },
  {
    id: "required-technology",
    pattern: /\b(?:must (?:use|integrate|include)|required to use|requires? the use of|must be built (?:on|with))\b/i,
    label: () => "Use the technology the rules require",
  },
  {
    id: "pitch",
    pattern: /\b(?:pitch to|present live|live presentation|demo day|present to the judges)\b/i,
    label: () => "Live pitch to the judges",
    anywhere: true,
  },
];

const SUBMISSION_CONTEXT = /\b(?:submi\w*|include|provide|required|must|should|need|deliver\w*|upload|attach|link)\b/i;
const SUBMISSION_SECTION = /\b(?:submi\w*|deliverables?|requirements?|what to (?:submit|hand in)|how to (?:enter|submit))\b/i;

/**
 * What the rules ask entrants to hand in, in a fixed order. A deliverable counts when it appears
 * in a sentence about submitting or under a submission heading, so a sponsor's "deck" in a
 * biography is not one.
 */
export function extractDeliverables(input: string): Deliverable[] {
  const sentences = toSentences(input);
  const aboutSubmitting = sentences
    .filter(({ text, section }) => SUBMISSION_CONTEXT.test(text) || SUBMISSION_SECTION.test(section))
    .map(({ text }) => text);
  const all = sentences.map(({ text }) => text);
  const found: Deliverable[] = [];
  for (const rule of RULES) {
    const sentence = (rule.anywhere ? all : aboutSubmitting).find((candidate) => rule.pattern.test(candidate));
    if (sentence) {
      found.push({ id: rule.id, label: rule.label(sentence), source: sentence });
    }
  }
  return found;
}
