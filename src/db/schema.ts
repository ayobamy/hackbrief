// The tables the import needs now: the part of docs/data-model.md for sources, events and import
// runs. Judging criteria, prizes and past projects join when a feature needs them.
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const eventFormat = pgEnum("event_format", [
  "online",
  "in_person",
  "hybrid",
]);
export const importStatus = pgEnum("import_status", [
  "running",
  "succeeded",
  "partial",
  "failed",
]);

/** A site hackbrief collects from, as recorded in docs/sources.md. */
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  /** The credit the source asks for, shown with its events. */
  attribution: text("attribution").notNull(),
});

/** One row per hackathon, however many sources list it. */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The event's URL without scheme, "www.", query or trailing slash: the key that merges sources. */
    canonicalUrl: text("canonical_url").notNull().unique(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    organiser: text("organiser"),
    format: eventFormat("format"),
    city: text("city"),
    country: text("country"),
    countryCode: text("country_code"),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
    prizeText: text("prize_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // The event list sorts and filters by start date.
  (table) => [index("events_starts_on").on(table.startsOn)],
);

/** Which source listed which event, so imports are idempotent and attribution is kept. */
export const eventSources = pgTable(
  "event_sources",
  {
    id: serial("id").primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** False once the source stops listing the event; the event itself is kept. */
    listed: boolean("listed").notNull().default(true),
    /** Who to credit for this listing, where the source's licence names more than the source. */
    creditName: text("credit_name"),
    creditUrl: text("credit_url"),
    /** When the credited party last updated the listing, which OpenAgenda's licence asks to show. */
    creditUpdatedOn: date("credit_updated_on", { mode: "string" }),
  },
  (table) => [
    unique("event_sources_source_external").on(
      table.sourceId,
      table.externalId,
    ),
  ],
);

export const importRuns = pgTable("import_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: importStatus("status").notNull().default("running"),
});

/** What one source returned in one run, so a failing source shows without hiding the rest. */
export const importResults = pgTable("import_results", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => importRuns.id, { onDelete: "cascade" }),
  sourceSlug: text("source_slug").notNull(),
  fetched: integer("fetched").notNull().default(0),
  saved: integer("saved").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  error: text("error"),
});
