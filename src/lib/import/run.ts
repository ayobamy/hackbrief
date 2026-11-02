import { and, eq, lt } from "drizzle-orm";

import { eventSources, events, importResults, importRuns, sources } from "@/db/schema";
import type { Database } from "@/lib/db";
import type { FetchBody, ParseResult, Source, SourceEvent } from "@/lib/sources/types";
import { canonicalUrl } from "@/lib/sources/url";

export interface SourceResult {
  source: string;
  fetched: number;
  saved: number;
  skipped: number;
  error: string | null;
}

export interface ImportSummary {
  runId: number;
  status: "succeeded" | "partial" | "failed";
  results: SourceResult[];
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Fields a later source may fill in but never blank out.
function mergeable(event: SourceEvent) {
  const fields = {
    organiser: event.organiser,
    format: event.format,
    city: event.city,
    country: event.country,
    countryCode: event.countryCode,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    prizeText: event.prizeText,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
}

async function sourceId(db: Database, source: Source): Promise<number> {
  const values = { slug: source.slug, name: source.name, url: source.url, attribution: source.attribution };
  const [row] = await db
    .insert(sources)
    .values(values)
    .onConflictDoUpdate({ target: sources.slug, set: values })
    .returning({ id: sources.id });
  if (!row) {
    throw new Error(`could not record source ${source.slug}`);
  }
  return row.id;
}

/** The event this listing belongs to: the one already linked to it, or one with the same URL. */
async function findEventId(tx: Transaction, source: number, event: SourceEvent, canonical: string) {
  const [linked] = await tx
    .select({ id: eventSources.eventId })
    .from(eventSources)
    .where(and(eq(eventSources.sourceId, source), eq(eventSources.externalId, event.externalId)));
  if (linked) {
    return linked.id;
  }
  const [sameUrl] = await tx.select({ id: events.id }).from(events).where(eq(events.canonicalUrl, canonical));
  return sameUrl?.id ?? null;
}

async function saveEvent(tx: Transaction, source: number, event: SourceEvent, now: Date): Promise<boolean> {
  const canonical = canonicalUrl(event.url);
  if (!canonical) {
    return false;
  }
  let eventId = await findEventId(tx, source, event, canonical);
  if (eventId) {
    await tx
      .update(events)
      .set({ name: event.name, ...mergeable(event), updatedAt: now })
      .where(eq(events.id, eventId));
  } else {
    const [created] = await tx
      .insert(events)
      .values({ canonicalUrl: canonical, name: event.name, url: event.url, ...mergeable(event) })
      .returning({ id: events.id });
    eventId = created?.id ?? null;
  }
  if (!eventId) {
    return false;
  }
  // Written every time, so a credit the source drops is cleared rather than kept stale.
  const credit = {
    creditName: event.credit?.name ?? null,
    creditUrl: event.credit?.url ?? null,
    creditUpdatedOn: event.credit?.updatedOn ?? null,
  };
  await tx
    .insert(eventSources)
    .values({ eventId, sourceId: source, externalId: event.externalId, sourceUrl: event.sourceUrl, lastSeenAt: now, ...credit })
    .onConflictDoUpdate({
      target: [eventSources.sourceId, eventSources.externalId],
      set: { eventId, sourceUrl: event.sourceUrl, lastSeenAt: now, listed: true, ...credit },
    });
  return true;
}

async function importSource(db: Database, source: Source, fetchBody: FetchBody): Promise<SourceResult> {
  const now = new Date();
  const id = await sourceId(db, source);
  let parsed: ParseResult;
  try {
    parsed = await source.load(fetchBody);
  } catch (error) {
    // A failed fetch keeps yesterday's events: nothing is marked unlisted.
    return { source: source.slug, fetched: 0, saved: 0, skipped: 0, error: error instanceof Error ? error.message : String(error) };
  }
  let saved = 0;
  await db.transaction(async (tx) => {
    for (const event of parsed.events) {
      if (await saveEvent(tx, id, event, now)) {
        saved += 1;
      }
    }
    // Listings this source no longer returns stay in the database, marked as no longer listed.
    await tx
      .update(eventSources)
      .set({ listed: false })
      .where(and(eq(eventSources.sourceId, id), lt(eventSources.lastSeenAt, now)));
  });
  const fetched = parsed.events.length + parsed.skipped;
  return { source: source.slug, fetched, saved, skipped: fetched - saved, error: null };
}

/**
 * Imports every source in turn and records the run. One source failing never stops the others; the
 * run is "partial" when some failed and "failed" when all did.
 */
export async function runImport(
  db: Database,
  list: readonly Source[],
  fetchBody: FetchBody,
): Promise<ImportSummary> {
  const [run] = await db.insert(importRuns).values({}).returning({ id: importRuns.id });
  if (!run) {
    throw new Error("could not start an import run");
  }
  const results: SourceResult[] = [];
  for (const source of list) {
    const result = await importSource(db, source, fetchBody);
    results.push(result);
    await db.insert(importResults).values({ runId: run.id, sourceSlug: result.source, ...result });
  }
  const failures = results.filter((result) => result.error !== null).length;
  const status = failures === 0 ? "succeeded" : failures === results.length ? "failed" : "partial";
  await db.update(importRuns).set({ status, finishedAt: new Date() }).where(eq(importRuns.id, run.id));
  return { runId: run.id, status, results };
}
