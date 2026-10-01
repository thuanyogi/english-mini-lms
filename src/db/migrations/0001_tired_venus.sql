ALTER TABLE "submissions" ADD COLUMN "confirmed_transcript" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "deleted_at" timestamp with time zone;