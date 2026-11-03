import { inArray } from "drizzle-orm";

import { eventBriefs } from "@/db/schema";
import type { Database } from "@/lib/db";
import { listUpcomingEvents } from "@/lib/events/query";

import { buildEventBrief, isStale, type BuildDeps, type BuildOutcome, type StoredBrief } from "./build";

export interface BriefsSummary {
  built: number;
  unchanged: number;
  skipped: number;
  failed: number;
  /** Events due a build that the time budget left for the next run. */
  left: number;
}

// A site that turned hackbrief away, or disallows it, is not read again for a week.
const WAIT_AFTER_REFUSAL_MS = 7 * 24 * 3_600_000;
const REFUSALS = new Set(["refused", "robots", "restricted"]);

type Row = typeof eventBriefs.$inferSelect;

function isDue(row: Row | undefined, now: Date): boolean {
  if (!row) {
    return true;
  }
  if (row.failure && REFUSALS.has(row.failure) && row.failedAt && now.getTime() - row.failedAt.getTime() < WAIT_AFTER_REFUSAL_MS) {
    return false;
  }
  return isStale(row.checkedAt, now);
}

/** An event's stored brief as the builder takes it. */
export function storedFrom(row: Row | undefined): StoredBrief | null {
  return row ? { pages: row.pages, textHash: row.textHash, facts: row.facts, builtAt: row.builtAt } : null;
}

/** Saves what one build came to; a site that no longer allows hackbrief loses its stored brief. */
export async function saveBrief(db: Database, eventId: string, outcome: BuildOutcome, now: Date): Promise<void> {
  if (outcome.status === "built") {
    const row = {
      pages: outcome.pages,
      textHash: outcome.textHash,
      facts: outcome.facts,
      model: outcome.model,
      builtAt: now,
      checkedAt: now,
      failedAt: null,
      failure: null,
    };
    await db
      .insert(eventBriefs)
      .values({ eventId, ...row })
      .onConflictDoUpdate({ target: eventBriefs.eventId, set: row });
    return;
  }
  if (outcome.status === "unchanged") {
    await db.insert(eventBriefs).values({ eventId, checkedAt: now }).onConflictDoUpdate({ target: eventBriefs.eventId, set: { checkedAt: now } });
    return;
  }
  const optedOut = outcome.reason === "robots" || outcome.reason === "restricted";
  const set = { checkedAt: now, failedAt: now, failure: outcome.reason, ...(optedOut ? { facts: null, textHash: null } : {}) };
  await db.insert(eventBriefs).values({ eventId, ...set }).onConflictDoUpdate({ target: eventBriefs.eventId, set });
}

/**
 * Builds the briefs of upcoming listed events ahead of visitors (decision D13, #60): never-built events
 * first, then the longest unchecked, a few at a time, starting none once the time budget is spent so
 * the run ends inside its function's limit. Each event's site is read at most once a day, and a site
 * that refused is left alone for a week.
 */
export async function runBriefs(
  db: Database,
  deps: BuildDeps,
  { budgetMs, concurrency = 4, clock = () => Date.now() }: { budgetMs: number; concurrency?: number; clock?: () => number },
): Promise<BriefsSummary> {
  const started = clock();
  const upcoming = await listUpcomingEvents(db, { format: null, source: null }, deps.today);
  const rows =
    upcoming.length === 0
      ? []
      : await db
          .select()
          .from(eventBriefs)
          .where(inArray(eventBriefs.eventId, upcoming.map(({ id }) => id)));
  const byEvent = new Map(rows.map((row) => [row.eventId, row]));
  const due = upcoming
    .filter((event) => isDue(byEvent.get(event.id), deps.now))
    .sort((a, b) => (byEvent.get(a.id)?.checkedAt.getTime() ?? 0) - (byEvent.get(b.id)?.checkedAt.getTime() ?? 0));

  const summary: BriefsSummary = { built: 0, unchanged: 0, skipped: 0, failed: 0, left: 0 };
  let next = 0;
  async function worker() {
    while (next < due.length && clock() - started < budgetMs) {
      const event = due[next];
      next += 1;
      if (!event) {
        return;
      }
      try {
        const outcome = await buildEventBrief(event, storedFrom(byEvent.get(event.id)), deps);
        await saveBrief(db, event.id, outcome, deps.now);
        summary[outcome.status] += 1;
      } catch (error) {
        summary.failed += 1;
        const failure = error instanceof Error ? error.message : String(error);
        const set = { checkedAt: deps.now, failedAt: deps.now, failure };
        await db.insert(eventBriefs).values({ eventId: event.id, ...set }).onConflictDoUpdate({ target: eventBriefs.eventId, set });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  summary.left = due.length - next;
  return summary;
}
