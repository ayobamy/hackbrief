// robots.txt as RFC 9309 reads it: the group naming this crawler wins over the "*" group, the longest
// matching rule wins, Allow wins a tie, and "*" and a trailing "$" work as wildcards in paths.

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
}

function parse(robots: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let collectingAgents = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      collectingAgents = false;
      // An empty Disallow allows everything, so it adds no rule.
      if (value) {
        current.rules.push({ allow: key === "allow", pattern: value });
      }
    }
  }
  return groups;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regex}${anchored ? "$" : ""}`).test(path);
}

/** Whether robots.txt lets the crawler named `agent` fetch `path` (with its query, if any). */
export function robotsAllows(robots: string, agent: string, path: string): boolean {
  const groups = parse(robots);
  const token = agent.toLowerCase();
  const named = groups.filter((group) => group.agents.some((name) => name !== "*" && token.startsWith(name)));
  const chosen = named.length > 0 ? named : groups.filter((group) => group.agents.includes("*"));
  let best: Rule | null = null;
  for (const rule of chosen.flatMap((group) => group.rules)) {
    if (!matches(rule.pattern, path)) {
      continue;
    }
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}
