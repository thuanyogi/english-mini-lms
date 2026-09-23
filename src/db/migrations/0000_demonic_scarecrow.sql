CREATE TYPE "public"."activity_mode" AS ENUM('writing', 'reading', 'speaking', 'listening', 'ielts-writing', 'ielts-reading', 'ielts-speaking', 'ielts-listening');--> statement-breakpoint
CREATE TYPE "public"."answer_reveal" AS ENUM('none', 'after_submit', 'on_request');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('queued', 'processing', 'needs_input', 'feedback_ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('trial', 'beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."modality" AS ENUM('text', 'audio');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('draft', 'reviewing', 'approved', 'rejected', 'retired');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('learner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('ready', 'active', 'paused', 'completed', 'abandoned');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"slot" text,
	"mode" "activity_mode" NOT NULL,
	"title" text NOT NULL,
	"objective" text,
	"duration_minutes" integer,
	"difficulty" "difficulty" DEFAULT 'trial',
	"prompt_text" text,
	"feedback_guide" text,
	"rubric_json" jsonb,
	"answer_reveal" "answer_reveal" DEFAULT 'none',
	"purpose" text,
	"review_state" "review_state" DEFAULT 'draft' NOT NULL,
	"segment_ids" jsonb,
	"questions_file" text,
	"output" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"kind" text DEFAULT 'ai_feedback',
	"run_version" integer DEFAULT 1 NOT NULL,
	"status" "assessment_status" DEFAULT 'queued' NOT NULL,
	"result_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"content" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"source_feedback_id" uuid,
	"category" text,
	"evidence" text,
	"due_at" timestamp with time zone,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"run_version" integer DEFAULT 1 NOT NULL,
	"submission_id" uuid NOT NULL,
	"rubric_snapshot" jsonb,
	"model_ref" text,
	"observations" jsonb,
	"strengths" jsonb,
	"next_action" text,
	"limitations" text,
	"scores" jsonb,
	"review_state" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"goals" jsonb,
	"preferences" jsonb,
	"baseline_status" text,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh',
	"role" "role" DEFAULT 'learner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learners_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"activity_id" text NOT NULL,
	"target_minutes" integer NOT NULL,
	"status" "session_status" DEFAULT 'ready' NOT NULL,
	"active_seconds" integer DEFAULT 0,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"duration_seconds" integer,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"page" integer,
	"start_seconds" integer,
	"end_seconds" integer,
	"text_content" text,
	"transcript_content" text,
	"verified_transcript" boolean DEFAULT false,
	"language" text DEFAULT 'en',
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"permission" text,
	"locator_type" text,
	"url" text,
	"review_state" "review_state" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"parent_id" uuid,
	"modality" "modality" DEFAULT 'text' NOT NULL,
	"body" text,
	"media_id" uuid,
	"assisted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"token_input" integer,
	"token_output" integer,
	"model_name" text,
	"cost_estimate" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vocabulary_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"review_channel" text,
	"prompt_scenario" text,
	"user_response" text,
	"response_modality" "modality",
	"ai_assessment" text,
	"result_status" text,
	"next_due_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_vault" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"ipa" text,
	"context_meaning" text,
	"original_sentence" text,
	"source_type" text,
	"source_ref" text,
	"my_attempt" text,
	"mastery_level" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_observations" ADD CONSTRAINT "error_observations_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_observations" ADD CONSTRAINT "error_observations_source_feedback_id_feedback_versions_id_fk" FOREIGN KEY ("source_feedback_id") REFERENCES "public"."feedback_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_versions" ADD CONSTRAINT "feedback_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_versions" ADD CONSTRAINT "feedback_versions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_versions" ADD CONSTRAINT "feedback_versions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_segments" ADD CONSTRAINT "source_segments_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_media_id_media_objects_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_reviews" ADD CONSTRAINT "vocabulary_reviews_vocabulary_id_vocabulary_vault_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary_vault"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_reviews" ADD CONSTRAINT "vocabulary_reviews_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_vault" ADD CONSTRAINT "vocabulary_vault_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;