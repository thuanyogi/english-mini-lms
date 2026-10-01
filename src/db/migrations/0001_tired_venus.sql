ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "confirmed_transcript" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;