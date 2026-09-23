import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  learningSessions,
  sessionEvents,
  drafts,
  submissions,
  assessments,
  feedbackVersions,
  errorObservations,
  usageEvents,
  activities,
} from "@/db/schema";
import { evaluateWriting, WritingFeedback } from "@/server/providers/gemini";

/**
 * 1. Tạo phiên học mới (learning_sessions)
 */
export async function createSession(
  learnerId: string,
  activityId: string,
  targetMinutes: number
) {
  // Kiểm tra activity tồn tại và đã approved
  const [act] = await db
    .select({ id: activities.id, reviewState: activities.reviewState })
    .from(activities)
    .where(and(eq(activities.id, activityId), eq(activities.reviewState, "approved")))
    .limit(1);

  if (!act) {
    throw new Error(`Activity "${activityId}" không tồn tại hoặc chưa được duyệt.`);
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
  const [existing] = await db
    .select({ id: drafts.id })
    .from(drafts)
    .where(and(eq(drafts.sessionId, sessionId), eq(drafts.learnerId, learnerId)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(drafts)
      .set({
        content,
        version,
        updatedAt: new Date(),
      })
      .where(eq(drafts.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(drafts)
    .values({
      sessionId,
      learnerId,
      content,
      version,
    })
    .returning();

  return created;
}

/**
 * 4. Nộp bài viết (submissions APPEND-ONLY) và kích hoạt chấm AI
 */
export async function createSubmissionAndAssess(
  sessionId: string,
  learnerId: string,
  body: string,
  parentId?: string
) {
  // Lấy thông tin session và activity
  const [session] = await db
    .select({
      id: learningSessions.id,
      activityId: learningSessions.activityId,
    })
    .from(learningSessions)
    .where(and(eq(learningSessions.id, sessionId), eq(learningSessions.learnerId, learnerId)))
    .limit(1);

  if (!session) {
    throw new Error("Không tìm thấy phiên học.");
  }

  const [activity] = await db
    .select({
      id: activities.id,
      promptText: activities.promptText,
      rubricJson: activities.rubricJson,
    })
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  // Invariant #2: Server tính assisted từ session_events (có hint/reveal trước khi nộp → true)
  const priorAssistEvents = await db
    .select({ id: sessionEvents.id })
    .from(sessionEvents)
    .where(
      and(
        eq(sessionEvents.sessionId, sessionId),
        eq(sessionEvents.learnerId, learnerId),
        inArray(sessionEvents.kind, ["hint", "reveal"])
      )
    );
  const assisted = priorAssistEvents.length > 0;

  // Invariant #1: submissions append-only, tính revision
  let revision = 1;
  if (parentId) {
    const [parentSub] = await db
      .select({ revision: submissions.revision })
      .from(submissions)
      .where(eq(submissions.id, parentId))
      .limit(1);
    if (parentSub) {
      revision = parentSub.revision + 1;
    }
  } else {
    const [latestSub] = await db
      .select({ revision: submissions.revision })
      .from(submissions)
      .where(and(eq(submissions.sessionId, sessionId), eq(submissions.learnerId, learnerId)))
      .orderBy(desc(submissions.revision))
      .limit(1);
    if (latestSub) {
      revision = latestSub.revision + 1;
    }
  }

  // INSERT submission mới — không bao giờ ghi đè bài cũ
  const [submission] = await db
    .insert(submissions)
    .values({
      sessionId,
      learnerId,
      revision,
      parentId: parentId || null,
      modality: "text",
      body,
      assisted,
    })
    .returning();

  // Tạo assessment trạng thái queued
  const [assessment] = await db
    .insert(assessments)
    .values({
      submissionId: submission.id,
      learnerId,
      kind: "ai_feedback",
      status: "queued",
      runVersion: 1,
    })
    .returning();

  // Gọi Gemini chấm ngay trong request (timeout 60s)
  try {
    await db
      .update(assessments)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(assessments.id, assessment.id));

    const evalResult = await evaluateWriting(
      activity.promptText || "",
      activity.rubricJson,
      body
    );

    // Ghi nhận feedback_versions
    const [feedback] = await db
      .insert(feedbackVersions)
      .values({
        assessmentId: assessment.id,
        learnerId,
        submissionId: submission.id,
        runVersion: 1,
        rubricSnapshot: activity.rubricJson as Record<string, unknown>,
        modelRef: evalResult.modelName,
        observations: evalResult.feedback.observations,
        strengths: evalResult.feedback.strengths,
        nextAction: evalResult.feedback.next_action,
        limitations: evalResult.feedback.limitations,
        scores: evalResult.feedback.scores,
        reviewState: "active",
      })
      .returning();

    // Ghi nhận error_observations từ các observation để phục vụ Spaced Repetition (SRS)
    for (const obs of evalResult.feedback.observations) {
      await db.insert(errorObservations).values({
        learnerId,
        sourceFeedbackId: feedback.id,
        category: "writing",
        evidence: obs.original,
      });
    }

    // Ghi nhận usage_events (token input / output)
    await db.insert(usageEvents).values({
      learnerId,
      action: "evaluate_writing",
      entityType: "submission",
      entityId: submission.id,
      tokenInput: evalResult.tokenInput,
      tokenOutput: evalResult.tokenOutput,
      modelName: evalResult.modelName,
    });

    // Cập nhật assessment thành feedback_ready
    await db
      .update(assessments)
      .set({ status: "feedback_ready", updatedAt: new Date() })
      .where(eq(assessments.id, assessment.id));

    return {
      submission,
      assessment: { ...assessment, status: "feedback_ready" },
      feedback,
    };
  } catch (err) {
    console.error("Lỗi khi chấm bài bằng Gemini:", err);

    // Đánh dấu assessment thất bại và hiển thị nút chấm lại
    await db
      .update(assessments)
      .set({
        status: "failed",
        resultRef: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    return {
      submission,
      assessment: { ...assessment, status: "failed" },
      feedback: null,
    };
  }
}

/**
 * 5. Chấm lại bài làm bị lỗi (retryAssessment)
 */
export async function retryAssessment(assessmentId: string, learnerId: string) {
  const [assessment] = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.learnerId, learnerId)))
    .limit(1);

  if (!assessment) {
    throw new Error("Không tìm thấy assessment.");
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, assessment.submissionId))
    .limit(1);

  if (!submission || !submission.body) {
    throw new Error("Không tìm thấy nội dung bài nộp.");
  }

  const [session] = await db
    .select({ activityId: learningSessions.activityId })
    .from(learningSessions)
    .where(eq(learningSessions.id, submission.sessionId))
    .limit(1);

  const [activity] = await db
    .select({ promptText: activities.promptText, rubricJson: activities.rubricJson })
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  await db
    .update(assessments)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(assessments.id, assessment.id));

  try {
    const evalResult = await evaluateWriting(
      activity.promptText || "",
      activity.rubricJson,
      submission.body
    );

    const [feedback] = await db
      .insert(feedbackVersions)
      .values({
        assessmentId: assessment.id,
        learnerId,
        submissionId: submission.id,
        runVersion: assessment.runVersion + 1,
        rubricSnapshot: activity.rubricJson as Record<string, unknown>,
        modelRef: evalResult.modelName,
        observations: evalResult.feedback.observations,
        strengths: evalResult.feedback.strengths,
        nextAction: evalResult.feedback.next_action,
        limitations: evalResult.feedback.limitations,
        scores: evalResult.feedback.scores,
        reviewState: "active",
      })
      .returning();

    await db.insert(usageEvents).values({
      learnerId,
      action: "evaluate_writing",
      entityType: "submission",
      entityId: submission.id,
      tokenInput: evalResult.tokenInput,
      tokenOutput: evalResult.tokenOutput,
      modelName: evalResult.modelName,
    });

    await db
      .update(assessments)
      .set({
        status: "feedback_ready",
        runVersion: assessment.runVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    return { success: true, feedback };
  } catch (err) {
    await db
      .update(assessments)
      .set({
        status: "failed",
        resultRef: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    throw err;
  }
}

/**
 * 6. Lấy thông tin phiên học chi tiết cho trang /learn/[sessionId]
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
    })
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  // Lấy bản nháp gần nhất nếu có
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
    draft: draft || null,
  };
}

/**
 * 7. Lấy bài nộp và feedback cho trang /my-work/[submissionId]
 * Hỗ trợ lấy kèm bài cha (parent_id) để hiển thị so sánh Bản 1 & Bản 2 cạnh nhau
 */
export async function getSubmissionWithFeedback(submissionId: string, learnerId: string) {
  const [sub] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.learnerId, learnerId)))
    .limit(1);

  if (!sub) {
    return null;
  }

  const [session] = await db
    .select({
      activityId: learningSessions.activityId,
      targetMinutes: learningSessions.targetMinutes,
    })
    .from(learningSessions)
    .where(eq(learningSessions.id, sub.sessionId))
    .limit(1);

  const [activity] = await db
    .select({
      id: activities.id,
      slot: activities.slot,
      title: activities.title,
      mode: activities.mode,
      promptText: activities.promptText,
    })
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.submissionId, sub.id))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  let feedback: WritingFeedback | null = null;
  if (assessment && assessment.status === "feedback_ready") {
    const [fb] = await db
      .select()
      .from(feedbackVersions)
      .where(eq(feedbackVersions.assessmentId, assessment.id))
      .orderBy(desc(feedbackVersions.createdAt))
      .limit(1);

    if (fb) {
      feedback = {
        observations: (fb.observations as WritingFeedback["observations"]) || [],
        strengths: (fb.strengths as string[]) || [],
        next_action: fb.nextAction || "",
        limitations: fb.limitations || "",
        scores: (fb.scores as WritingFeedback["scores"]) || [],
      };
    }
  }

  // Nếu bài này là bản sửa (có parentId), lấy luôn thông tin Bản 1 và feedback Bản 1
  let parentSubmissionData = null;
  if (sub.parentId) {
    const [parentSub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, sub.parentId))
      .limit(1);

    if (parentSub) {
      const [parentAssess] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.submissionId, parentSub.id))
        .orderBy(desc(assessments.createdAt))
        .limit(1);

      let parentFeedback: WritingFeedback | null = null;
      if (parentAssess && parentAssess.status === "feedback_ready") {
        const [parentFb] = await db
          .select()
          .from(feedbackVersions)
          .where(eq(feedbackVersions.assessmentId, parentAssess.id))
          .orderBy(desc(feedbackVersions.createdAt))
          .limit(1);

        if (parentFb) {
          parentFeedback = {
            observations: (parentFb.observations as WritingFeedback["observations"]) || [],
            strengths: (parentFb.strengths as string[]) || [],
            next_action: parentFb.nextAction || "",
            limitations: parentFb.limitations || "",
            scores: (parentFb.scores as WritingFeedback["scores"]) || [],
          };
        }
      }

      parentSubmissionData = {
        submission: parentSub,
        feedback: parentFeedback,
      };
    }
  }

  return {
    submission: sub,
    session,
    activity,
    assessment,
    feedback,
    parent: parentSubmissionData,
  };
}
