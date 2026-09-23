import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["learner", "admin"]);

export const reviewStateEnum = pgEnum("review_state", [
  "draft",
  "reviewing",
  "approved",
  "rejected",
  "retired",
]);

export const activityModeEnum = pgEnum("activity_mode", [
  "writing",
  "reading",
  "speaking",
  "listening",
  "ielts-writing",
  "ielts-reading",
  "ielts-speaking",
  "ielts-listening",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "ready",
  "active",
  "paused",
  "completed",
  "abandoned",
]);

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "queued",
  "processing",
  "needs_input",
  "feedback_ready",
  "failed",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "pending",
  "ready",
  "failed",
]);

export const answerRevealEnum = pgEnum("answer_reveal", [
  "none",
  "after_submit",
  "on_request",
]);

export const modalityEnum = pgEnum("modality", ["text", "audio"]);

export const difficultyEnum = pgEnum("difficulty", [
  "trial",
  "beginner",
  "intermediate",
  "advanced",
]);

// ──────────────────────────────────────────────
// Helper: common timestamp columns
// ──────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ──────────────────────────────────────────────
// 1. learners
// ──────────────────────────────────────────────

export const learners = pgTable("learners", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(), // FK to Supabase auth.users
  displayName: text("display_name"),
  goals: jsonb("goals"), // { priorities, ielts_variant, ... }
  preferences: jsonb("preferences"), // { timezone, remind, ... }
  baselineStatus: text("baseline_status"), // e.g. "pending", "completed"
  timezone: text("timezone").default("Asia/Ho_Chi_Minh"),
  role: roleEnum("role").notNull().default("learner"),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 2. sources
// ──────────────────────────────────────────────

export const sources = pgTable("sources", {
  id: text("id").primaryKey(), // e.g. "src-ultrasound-handbook"
  title: text("title").notNull(),
  kind: text("kind").notNull(), // book | video | audio | article | self-authored
  permission: text("permission"), // personal-study | licensed | public-domain | cc | unknown
  locatorType: text("locator_type"), // page | seconds
  url: text("url"),
  reviewState: reviewStateEnum("review_state").notNull().default("draft"),
  notes: text("notes"),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 3. source_segments
// ──────────────────────────────────────────────

export const sourceSegments = pgTable("source_segments", {
  id: text("id").primaryKey(), // e.g. "seg-r1"
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id),
  page: integer("page"),
  startSeconds: integer("start_seconds"),
  endSeconds: integer("end_seconds"),
  textContent: text("text_content"), // loaded from texts/ file
  transcriptContent: text("transcript_content"), // loaded from transcripts/ file
  verifiedTranscript: boolean("verified_transcript").default(false),
  language: text("language").default("en"),
  checksum: text("checksum"),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 4. activities
// ──────────────────────────────────────────────

export const activities = pgTable("activities", {
  id: text("id").primaryKey(), // e.g. "W1"
  slot: text("slot"),
  mode: activityModeEnum("mode").notNull(),
  title: text("title").notNull(),
  objective: text("objective"),
  durationMinutes: integer("duration_minutes"),
  difficulty: difficultyEnum("difficulty").default("trial"),
  promptText: text("prompt_text"), // loaded from prompt_file
  feedbackGuide: text("feedback_guide"),
  rubricJson: jsonb("rubric_json"), // simplified for Lite (no rubric_versions table)
  answerReveal: answerRevealEnum("answer_reveal").default("none"),
  purpose: text("purpose"), // baseline | practice | assessment
  reviewState: reviewStateEnum("review_state").notNull().default("draft"),
  segmentIds: jsonb("segment_ids").$type<string[]>(), // references to source_segments
  questionsFile: text("questions_file"), // path for listening questions
  output: text("output"), // text | audio
  ...timestamps,
});

// ──────────────────────────────────────────────
// 5. learning_sessions
// ──────────────────────────────────────────────

export const learningSessions = pgTable("learning_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  activityId: text("activity_id")
    .notNull()
    .references(() => activities.id),
  targetMinutes: integer("target_minutes").notNull(),
  status: sessionStatusEnum("status").notNull().default("ready"),
  activeSeconds: integer("active_seconds").default(0),
  version: integer("version").notNull().default(1),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 6. session_events
// ──────────────────────────────────────────────

export const sessionEvents = pgTable("session_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => learningSessions.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  kind: text("kind").notNull(), // hint | reveal | pause | resume | finish
  payload: jsonb("payload"),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 7. drafts
// ──────────────────────────────────────────────

export const drafts = pgTable("drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => learningSessions.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  content: text("content"),
  version: integer("version").notNull().default(1),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 8. media_objects
// ──────────────────────────────────────────────

export const mediaObjects = pgTable("media_objects", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes"),
  durationSeconds: integer("duration_seconds"),
  status: mediaStatusEnum("status").notNull().default("pending"),
  hash: text("hash"),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 9. submissions (APPEND-ONLY — invariant #1)
// ──────────────────────────────────────────────

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => learningSessions.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  revision: integer("revision").notNull().default(1),
  parentId: uuid("parent_id"), // self-reference: previous submission
  modality: modalityEnum("modality").notNull().default("text"),
  body: text("body"), // text content of submission
  mediaId: uuid("media_id").references(() => mediaObjects.id),
  // assisted is computed server-side from session_events (hint/reveal before submit)
  assisted: boolean("assisted").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 10. assessments
// ──────────────────────────────────────────────

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  kind: text("kind").default("ai_feedback"), // ai_feedback | manual
  runVersion: integer("run_version").notNull().default(1),
  status: assessmentStatusEnum("status").notNull().default("queued"),
  resultRef: text("result_ref"),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 11. feedback_versions
// ──────────────────────────────────────────────

export const feedbackVersions = pgTable("feedback_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  runVersion: integer("run_version").notNull().default(1),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id),
  rubricSnapshot: jsonb("rubric_snapshot"),
  modelRef: text("model_ref"), // e.g. "gemini-2.0-flash"
  // Structured feedback fields
  observations: jsonb("observations"), // [{location, original, issue, suggestion, example, retry_prompt}]
  strengths: jsonb("strengths"), // string[]
  nextAction: text("next_action"),
  limitations: text("limitations"),
  scores: jsonb("scores"), // [{kind:"practice_estimate", dimension, value, note}]
  reviewState: text("review_state").default("active"), // active | revoked | under_review
  ...timestamps,
});

// ──────────────────────────────────────────────
// 12. error_observations
// ──────────────────────────────────────────────

export const errorObservations = pgTable("error_observations", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  sourceFeedbackId: uuid("source_feedback_id").references(
    () => feedbackVersions.id
  ),
  category: text("category"), // grammar | vocabulary | structure | ...
  evidence: text("evidence"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  confidence: real("confidence"),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 13. vocabulary_vault
// ──────────────────────────────────────────────

export const vocabularyVault = pgTable("vocabulary_vault", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  phrase: text("phrase").notNull(),
  ipa: text("ipa"),
  contextMeaning: text("context_meaning"),
  originalSentence: text("original_sentence"),
  sourceType: text("source_type"), // book | video | article
  sourceRef: text("source_ref"), // page number, video timestamp, etc.
  myAttempt: text("my_attempt"), // learner's own sentence
  masteryLevel: integer("mastery_level").notNull().default(0),
  dueAt: timestamp("due_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 14. vocabulary_reviews
// ──────────────────────────────────────────────

export const vocabularyReviews = pgTable("vocabulary_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  vocabularyId: uuid("vocabulary_id")
    .notNull()
    .references(() => vocabularyVault.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id),
  reviewChannel: text("review_channel"), // web | zalo
  promptScenario: text("prompt_scenario"),
  userResponse: text("user_response"),
  responseModality: modalityEnum("response_modality"),
  aiAssessment: text("ai_assessment"),
  resultStatus: text("result_status"), // correct | incorrect | partial
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...timestamps,
});

// ──────────────────────────────────────────────
// 15. usage_events
// ──────────────────────────────────────────────

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").references(() => learners.id),
  action: text("action").notNull(), // e.g. "evaluate_writing", "quick_capture"
  entityType: text("entity_type"), // submission | vocabulary | session
  entityId: text("entity_id"),
  tokenInput: integer("token_input"),
  tokenOutput: integer("token_output"),
  modelName: text("model_name"),
  costEstimate: real("cost_estimate"),
  ...timestamps,
});
