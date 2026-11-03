import { createHash } from "node:crypto";

import { readFacts, type BriefFacts } from "@/lib/coach/brief";
import { daysBetween } from "@/lib/coach/dates";
import type { FillAnswer } from "@/lib/coach/fill";
import type { Chooser, ReadResult, SkipReason } from "@/lib/rules/read";

/** What is stored of an event's last brief (`event_briefs`). */
export interface StoredBrief {
  pages: string[];
  textHash: string | null;
  facts: BriefFacts | null;
  builtAt: Date | null;
}

/** What building a brief needs: reading pages, and a model when one is set up. */
export interface BuildDeps {
  read: (url: string, options: { choose?: Chooser }) => Promise<ReadResult>;
  /** Picks more of the site's pages; only when the event has no stored pages yet. */
  choose?: Chooser | undefined;
  /** A model's reading of the pages (decision D13). */
  fill?: ((text: string) => Promise<FillAnswer>) | undefined;
  /** The model's name, stored with the brief. */
  model: string | null;
  today: string;
  now: Date;
}

/** What the coach shows for a listed event: its brief's facts and the pages they came from, or why there are none. */
export type ShownBrief = { status: "built"; facts: BriefFacts; pages: string[] } | { status: "skipped"; reason: SkipReason };

export type BuildOutcome =
  | { status: "built"; pages: string[]; textHash: string | null; facts: BriefFacts; model: string | null }
  | { status: "unchanged" }
  | { status: "skipped"; reason: SkipReason };

// Read within this long (by the daily build, or after a visitor's click) means read today.
export const CHECKED_WITHIN_MS = 20 * 3_600_000;

/** Whether an event's pages are due another look: last read 20 hours ago or more, so once a day. */
export function isStale(checkedAt: Date, now: Date): boolean {
  return now.getTime() - checkedAt.getTime() >= CHECKED_WITHIN_MS;
}

// A brief is rebuilt at least weekly, so the days and assumed years in it stay current.
const REBUILD_AFTER_DAYS = 7;

/** A fingerprint of the pages' text: while it is unchanged, no model is asked again. */
export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Builds a listed event's brief ahead of visitors (decision D13, #60): reads its pages (the ones read
 * last time, or the model's choice the first time), and asks the model only when their text changed or
 * the brief is a week old. Returns the facts with their short source sentences, never the pages' text.
 */
export async function buildEventBrief(
  event: { url: string; startsOn: string | null; endsOn: string | null },
  stored: StoredBrief | null,
  deps: BuildDeps,
): Promise<BuildOutcome> {
  const known = stored?.pages.slice(1) ?? [];
  const choose: Chooser | undefined = known.length > 0 ? async () => known : deps.choose;
  const read = await deps.read(event.url, { choose });
  if (read.status !== "read") {
    return { status: "skipped", reason: read.reason };
  }
  const textHash = hashText(read.text);
  const fresh =
    stored?.facts && stored.builtAt && daysBetween(stored.builtAt.toISOString().slice(0, 10), deps.today) < REBUILD_AFTER_DAYS;
  if (fresh && stored.textHash === textHash) {
    return { status: "unchanged" };
  }
  let filled: FillAnswer | undefined;
  let modelFailed = false;
  if (deps.fill) {
    try {
      filled = await deps.fill(read.text);
    } catch {
      modelFailed = true;
    }
  }
  const facts = readFacts(read.text, deps.today, { listing: { startsOn: event.startsOn, endsOn: event.endsOn }, filled });
  return {
    status: "built",
    pages: read.pages,
    // A failed model leaves no hash, so the next run asks it again even if the pages are the same.
    textHash: modelFailed ? null : textHash,
    facts,
    model: filled ? deps.model : null,
  };
}
