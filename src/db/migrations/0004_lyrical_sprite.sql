ALTER TABLE "activities" ADD COLUMN "origin" text DEFAULT 'seed';--> statement-breakpoint
ALTER TABLE "source_segments" ADD COLUMN "origin" text DEFAULT 'seed';--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "origin" text DEFAULT 'seed';