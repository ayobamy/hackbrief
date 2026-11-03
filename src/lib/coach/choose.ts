import { z } from "zod";

import type { SiteLink } from "@/lib/rules/html";

import type { ChatMessage } from "./fill";
import { CHOOSE_PAGES_PLAYBOOK } from "./playbook";

/** The answer's shape: addresses copied from the list of the site's links. */
export const CHOOSE_SCHEMA = {
  type: "object",
  properties: {
    pages: { type: "array", items: { type: "string" }, description: "Up to 3 addresses copied from the list, most useful first." },
  },
  required: ["pages"],
  additionalProperties: false,
} as const;

const MAX_CHOSEN = 3;
const Answer = z.object({ pages: z.array(z.string()) });

/**
 * Asks a model which of an event site's pages to read besides the one listed (decision D13): up to
 * three addresses, kept only when they are in the list it was given, so it cannot send hackbrief
 * anywhere else.
 */
export async function chooseLinks(
  links: readonly SiteLink[],
  ask: (messages: ChatMessage[], schema: typeof CHOOSE_SCHEMA) => Promise<unknown>,
): Promise<string[]> {
  if (links.length === 0) {
    return [];
  }
  const list = links.map(({ text, url }) => `${text || "(no text)"}: ${url}`).join("\n");
  const answer = Answer.safeParse(
    await ask(
      [
        { role: "system", content: CHOOSE_PAGES_PLAYBOOK },
        { role: "user", content: `The site's links, one a line:\n<<<LINKS\n${list}\nLINKS>>>` },
      ],
      CHOOSE_SCHEMA,
    ),
  );
  if (!answer.success) {
    return [];
  }
  const offered = new Set(links.map(({ url }) => url));
  return [...new Set(answer.data.pages)].filter((url) => offered.has(url)).slice(0, MAX_CHOSEN);
}
