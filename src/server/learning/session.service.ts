import fs from "fs";
import path from "path";
import yaml from "yaml";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  learningSessions,
  sessionEvents,
  drafts,
  submissions,
  activities,
  sourceSegments,
  sources,
} from "@/db/schema";

export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

export class ConflictError extends Error {
  statusCode: number;
  existingSessionId: string;
  constructor(message: string, existingSessionId: string) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
    this.existingSessionId = existingSessionId;
  }
}

/**
 * 1. Tạo phiên học mới (learning_sessions)
 */
export interface CreateSessionOptions {
  checkConflict?: boolean;
}

export async function createSession(
  learnerId: string,
  activityId: string,
  targetMinutes: number,
  options?: CreateSessionOptions
) {
  const [act] = await db
    .select({ id: activities.id, reviewState: activities.reviewState })
    .from(activities)
    .where(and(eq(activities.id, activityId), eq(activities.reviewState, "approved")))
    .limit(1);

  if (!act) {
    throw new Error(`Activity "${activityId}" không tồn tại hoặc chưa được duyệt.`);
  }

  // Chặn tạo 2 phiên active trùng cùng 1 activity khi bật checkConflict
  if (options?.checkConflict) {
    const [existingSession] = await db
      .select({ id: learningSessions.id })
      .from(learningSessions)
      .where(
        and(
          eq(learningSessions.learnerId, learnerId),
          eq(learningSessions.activityId, activityId),
          inArray(learningSessions.status, ["active", "ready", "paused"])
        )
      )
      .orderBy(desc(learningSessions.createdAt))
      .limit(1);

    if (existingSession) {
      throw new ConflictError(
        "Bạn đang có một phiên học chưa hoàn thành cho bài này.",
        existingSession.id
      );
    }
  }

  const [session] = await db
    .insert(learningSessions)
    .values({
      learnerId,
      activityId,
      targetMinutes,
      status: "active",
      activeSeconds: 0,
      version: 1,
    })
    .returning();

  return session;
}

/**
 * 2. Ghi nhận sự kiện trong phiên (session_events)
 */
export async function recordSessionEvent(
  sessionId: string,
  learnerId: string,
  kind: "hint" | "reveal" | "pause" | "resume" | "finish",
  payload?: unknown
) {
  // Xác minh session thuộc learner
  const [session] = await db
    .select({
      id: learningSessions.id,
      status: learningSessions.status,
      activeSeconds: learningSessions.activeSeconds,
    })
    .from(learningSessions)
    .where(and(eq(learningSessions.id, sessionId), eq(learningSessions.learnerId, learnerId)))
    .limit(1);

  if (!session) {
    throw new ValidationError("Không tìm thấy phiên học hoặc phiên không thuộc người dùng.", 404);
  }

  // Tính activeSeconds từ event pause/resume gần nhất
  if (kind === "pause" || kind === "resume" || kind === "finish") {
    const [lastEvent] = await db
      .select({ kind: sessionEvents.kind, eventAt: sessionEvents.eventAt })
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, sessionId))
      .orderBy(desc(sessionEvents.eventAt))
      .limit(1);

    const wasActive =
      !lastEvent ||
      lastEvent.kind === "resume" ||
      (lastEvent.kind !== "pause" && lastEvent.kind !== "finish");

    if (wasActive) {
      const lastTime = lastEvent ? new Date(lastEvent.eventAt).getTime() : Date.now();
      const deltaSec = Math.round((Date.now() - lastTime) / 1000);
      const newActiveSeconds = (session.activeSeconds || 0) + Math.max(0, deltaSec);

      await db
        .update(learningSessions)
        .set({
          activeSeconds: newActiveSeconds,
          status: kind === "finish" ? "completed" : kind === "pause" ? "paused" : session.status,
          updatedAt: new Date(),
        })
        .where(eq(learningSessions.id, sessionId));
    } else if (kind === "resume") {
      await db
        .update(learningSessions)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(learningSessions.id, sessionId));
    } else if (kind === "finish") {
      await db
        .update(learningSessions)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(learningSessions.id, sessionId));
    }
  }

  const [event] = await db
    .insert(sessionEvents)
    .values({
      sessionId,
      learnerId,
      kind,
      payload: payload ? (payload as Record<string, unknown>) : null,
    })
    .returning();

  return event;
}

/**
 * 3. Lưu bản nháp (drafts) với optimistic version
 */
export async function saveDraft(
  sessionId: string,
  learnerId: string,
  content: string,
  version = 1
) {
  const [existingDraft] = await db
    .select({ id: drafts.id, version: drafts.version })
    .from(drafts)
    .where(and(eq(drafts.sessionId, sessionId), eq(drafts.learnerId, learnerId)))
    .limit(1);

  if (!existingDraft) {
    const [newDraft] = await db
      .insert(drafts)
      .values({
        sessionId,
        learnerId,
        content,
        version: 1,
      })
      .returning();
    return newDraft;
  }

  const [updatedDraft] = await db
    .update(drafts)
    .set({
      content,
      version: Math.max(existingDraft.version + 1, version),
      updatedAt: new Date(),
    })
    .where(eq(drafts.id, existingDraft.id))
    .returning();

  return updatedDraft;
}

/**
 * 4. Lấy thông tin phiên học chi tiết cho trang /learn/[sessionId]
 * Trả về dữ liệu chuyên biệt cho từng mode (writing, reading, speaking, listening)
 */
export async function getSessionDetails(sessionId: string, learnerId: string) {
  const [session] = await db
    .select({
      id: learningSessions.id,
      activityId: learningSessions.activityId,
      targetMinutes: learningSessions.targetMinutes,
      status: learningSessions.status,
      activeSeconds: learningSessions.activeSeconds,
      createdAt: learningSessions.createdAt,
    })
    .from(learningSessions)
    .where(and(eq(learningSessions.id, sessionId), eq(learningSessions.learnerId, learnerId)))
    .limit(1);

  if (!session) {
    return null;
  }

  const [activity] = await db
    .select({
      id: activities.id,
      slot: activities.slot,
      mode: activities.mode,
      title: activities.title,
      objective: activities.objective,
      durationMinutes: activities.durationMinutes,
      promptText: activities.promptText,
      feedbackGuide: activities.feedbackGuide,
      output: activities.output,
      segmentIds: activities.segmentIds,
      questionsFile: activities.questionsFile,
    })
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  // 1. Dữ liệu Reading Mode
  let segment: {
    id: string;
    page: number | null;
    textContent: string | null;
    sourceId: string;
    sourceTitle: string | null;
  } | null = null;

  if (activity && activity.mode === "reading" && activity.segmentIds && activity.segmentIds.length > 0) {
    const [seg] = await db
      .select({
        id: sourceSegments.id,
        page: sourceSegments.page,
        textContent: sourceSegments.textContent,
        sourceId: sourceSegments.sourceId,
        sourceTitle: sources.title,
      })
      .from(sourceSegments)
      .leftJoin(sources, eq(sourceSegments.sourceId, sources.id))
      .where(eq(sourceSegments.id, activity.segmentIds[0]))
      .limit(1);

    if (seg) {
      segment = seg;
    }
  }

  // 2. Dữ liệu Listening Mode
  let listening: {
    videoUrl: string | null;
    startSeconds: number;
    endSeconds: number;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; text: string }>;
    }>;
    transcriptSegments: Array<{
      startSeconds: number;
      endSeconds: number;
      text: string;
    }>;
    isTranscriptRevealed: boolean;
  } | null = null;

  if (activity && activity.mode === "listening") {
    const revealEvents = await db
      .select({ id: sessionEvents.id })
      .from(sessionEvents)
      .where(
        and(
          eq(sessionEvents.sessionId, sessionId),
          eq(sessionEvents.learnerId, learnerId),
          eq(sessionEvents.kind, "reveal")
        )
      );
    const isTranscriptRevealed = revealEvents.length > 0;

    let startSec = 95;
    let endSec = 155;
    let videoUrl = "https://www.youtube.com/watch?v=uVSiFJ85EtM";
    let rawTranscript = "";

    if (activity.segmentIds && activity.segmentIds.length > 0) {
      const [seg] = await db
        .select({
          startSeconds: sourceSegments.startSeconds,
          endSeconds: sourceSegments.endSeconds,
          transcriptContent: sourceSegments.transcriptContent,
          url: sources.url,
        })
        .from(sourceSegments)
        .leftJoin(sources, eq(sourceSegments.sourceId, sources.id))
        .where(eq(sourceSegments.id, activity.segmentIds[0]))
        .limit(1);

      if (seg) {
        if (seg.startSeconds !== null) startSec = seg.startSeconds;
        if (seg.endSeconds !== null) endSec = seg.endSeconds;
        if (seg.url) videoUrl = seg.url;
        if (seg.transcriptContent) rawTranscript = seg.transcriptContent;
      }
    }

    const transcriptSegments = rawTranscript
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|");
        return {
          startSeconds: parseInt(parts[0], 10) || 0,
          endSeconds: parseInt(parts[1], 10) || 0,
          text: parts.slice(2).join("|").trim(),
        };
      });

    const baseDir = path.resolve(process.cwd(), "content/english-lab");
    const qFile = path.resolve(baseDir, activity.questionsFile || "texts/l1-questions.yaml");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let questionsList: any[] = [];
    if (fs.existsSync(qFile)) {
      try {
        const parsedQ = yaml.parse(fs.readFileSync(qFile, "utf-8"));
        if (parsedQ?.questions && Array.isArray(parsedQ.questions)) {
          // KHÔNG bao giờ trả đáp án ra client trước khi nộp
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          questionsList = parsedQ.questions.map((q: any) => ({
            id: q.id,
            prompt: q.prompt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: q.options?.map((opt: any) => ({ id: opt.id, text: opt.text })) || [],
          }));
        }
      } catch (err) {
        console.warn("Could not parse questions yaml:", err);
      }
    }

    // Khoá transcript: chỉ trả khi đã reveal hoặc đã có submission cho session này
    const [existingSubmission] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.sessionId, sessionId),
          eq(submissions.learnerId, learnerId),
          isNull(submissions.deletedAt)
        )
      )
      .limit(1);

    const canRevealTranscript = isTranscriptRevealed || !!existingSubmission;

    listening = {
      videoUrl,
      startSeconds: startSec,
      endSeconds: endSec,
      questions: questionsList,
      transcriptSegments: canRevealTranscript ? transcriptSegments : [],
      isTranscriptRevealed: canRevealTranscript,
    };
  }

  // 3. Bản nháp gần nhất
  const [draft] = await db
    .select({
      content: drafts.content,
      version: drafts.version,
      updatedAt: drafts.updatedAt,
    })
    .from(drafts)
    .where(and(eq(drafts.sessionId, sessionId), eq(drafts.learnerId, learnerId)))
    .limit(1);

  return {
    session,
    activity,
    segment,
    listening,
    draft: draft || null,
  };
}
