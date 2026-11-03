CREATE TABLE "event_briefs" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"pages" text[] DEFAULT '{}' NOT NULL,
	"text_hash" text,
	"facts" jsonb,
	"model" text,
	"built_at" timestamp with time zone,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failed_at" timestamp with time zone,
	"failure" text
);
--> statement-breakpoint
ALTER TABLE "event_briefs" ADD CONSTRAINT "event_briefs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;