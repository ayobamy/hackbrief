import { describe, expect, it } from "vitest";

import { CHOOSE_SCHEMA, chooseLinks } from "./choose";
import { CHOOSE_PAGES_PLAYBOOK } from "./playbook";

const LINKS = [
  { text: "Hacker guide", url: "https://lagoonhacks.example/guide" },
  { text: "Sponsors", url: "https://lagoonhacks.example/sponsors" },
  { text: "Schedule", url: "https://lagoonhacks.example/schedule" },
  { text: "Official rules (PDF)", url: "https://lagoonhacks.example/rules.pdf" },
  { text: "Team", url: "https://lagoonhacks.example/team" },
];

describe("chooseLinks", () => {
  it("asks with the page-choosing playbook and the site's links, and keeps up to three from the list", async () => {
    const asked: Array<{ messages: Array<{ role: string; content: string }>; schema: unknown }> = [];
    const chosen = await chooseLinks(LINKS, async (messages, schema) => {
      asked.push({ messages, schema });
      return {
        pages: [
          "https://lagoonhacks.example/guide",
          "https://evil.example/steal",
          "https://lagoonhacks.example/schedule",
          "https://lagoonhacks.example/guide",
          "https://lagoonhacks.example/rules.pdf",
          "https://lagoonhacks.example/team",
        ],
      };
    });

    expect(asked[0]?.messages[0]).toEqual({ role: "system", content: CHOOSE_PAGES_PLAYBOOK });
    expect(asked[0]?.messages[1]?.content).toContain("Hacker guide: https://lagoonhacks.example/guide");
    expect(asked[0]?.schema).toBe(CHOOSE_SCHEMA);
    expect(chosen).toEqual([
      "https://lagoonhacks.example/guide",
      "https://lagoonhacks.example/schedule",
      "https://lagoonhacks.example/rules.pdf",
    ]);
  });

  it("chooses nothing without links, or from an answer of the wrong shape", async () => {
    let asked = false;
    expect(
      await chooseLinks([], async () => {
        asked = true;
        return { pages: [] };
      }),
    ).toEqual([]);
    expect(asked).toBe(false);
    expect(await chooseLinks(LINKS, async () => "not json")).toEqual([]);
  });
});
