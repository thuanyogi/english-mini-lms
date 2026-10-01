import fs from "fs";
import path from "path";
import yaml from "yaml";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  learningSessions,
  submissions,
  assessments,
  feedbackVersions,
  errorObservations,
  usageEvents,
  activities,
  sourceSegments,
  mediaObjects,
  sessionEvents,
} from "@/db/schema";
import {
  evaluateWriting,
  evaluateReading,
  evaluateSpeaking,
  WritingFeedback,
} from "@/server/providers/gemini";
import {
  downloadMediaBuffer,
  getMediaSignedUrl,
} from "@/server/media/service";
import { ValidationError } from "./session.service";

/**
 * 1. Nộp bài (submissions APPEND-ONLY) và kích hoạt chấm AI
 * Hỗ trợ 4 mode: writing, reading, speaking, listening
 */
export async function createSubmissionAndAssess(
  sessionId: string,
  learnerId: string,
  body?: string,
  parentId?: string,
  mediaId?: string
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
    throw new ValidationError("Không tìm thấy phiên học.", 404);
  }

  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  if (!activity) {
    throw new ValidationError("Không tìm thấy bài học liên kết.", 404);
  }

  // Siết validation theo mode
  if (activity.mode === "writing" && (!body || body.trim().length === 0)) {
    throw new ValidationError("Bài viết không được để trống.", 422);
  }

  let readyMedia: { storageKey: string; mimeType: string | null } | null = null;
  if (activity.mode === "speaking") {
    if (!mediaId) {
      throw new ValidationError("Nộp bài Speaking bắt buộc phải có tệp âm thanh (media_id).", 422);
    }
    const [media] = await db
      .select({
        id: mediaObjects.id,
        status: mediaObjects.status,
        storageKey: mediaObjects.storageKey,
        mimeType: mediaObjects.mimeType,
      })
      .from(mediaObjects)
      .where(eq(mediaObjects.id, mediaId))
      .limit(1);

    if (!media || media.status !== "ready") {
      throw new ValidationError("Tệp âm thanh không tồn tại hoặc chưa ở trạng thái sẵn sàng (ready).", 422);
    }
    readyMedia = media;
  }

  // Kiểm tra hint hoặc reveal event trong session -> assisted
  const [assistEvent] = await db
    .select({ id: sessionEvents.id })
    .from(sessionEvents)
    .where(
      and(
        eq(sessionEvents.sessionId, sessionId),
        inArray(sessionEvents.kind, ["hint", "reveal"])
      )
    )
    .limit(1);

  const isAssisted = !!assistEvent;

  // Xác định revision từ bài cha
  let revision = 1;
  if (parentId) {
    const [parent] = await db
      .select({ revision: submissions.revision })
      .from(submissions)
      .where(and(eq(submissions.id, parentId), eq(submissions.learnerId, learnerId)))
      .limit(1);
    if (parent) {
      revision = parent.revision + 1;
    }
  }

  const modality = activity.output === "audio" || mediaId ? "audio" : "text";

  // Tạo submission
  const [submission] = await db
    .insert(submissions)
    .values({
      sessionId,
      learnerId,
      revision,
      parentId: parentId || null,
      modality,
      body: body || null,
      mediaId: mediaId || null,
      assisted: isAssisted,
    })
    .returning();

  // Khởi tạo assessment
  const [assessment] = await db
    .insert(assessments)
    .values({
      submissionId: submission.id,
      learnerId,
      kind: "ai_feedback",
      runVersion: 1,
      status: "queued",
    })
    .returning();

  // Đánh dấu assessment thành processing
  await db
    .update(assessments)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(assessments.id, assessment.id));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let evalResult: any;

    if (activity.mode === "speaking") {
      let audioBuffer: Buffer | null = null;
      let mimeType = "audio/webm";

      if (readyMedia) {
        audioBuffer = await downloadMediaBuffer(readyMedia.storageKey);
        if (readyMedia.mimeType) mimeType = readyMedia.mimeType;
      }

      evalResult = await evaluateSpeaking(
        audioBuffer ? { buffer: audioBuffer, mimeType } : null,
        activity.promptText || "",
        undefined
      );
    } else if (activity.mode === "reading") {
      let segmentText = "";
      if (activity.segmentIds && activity.segmentIds.length > 0) {
        const [seg] = await db
          .select({ textContent: sourceSegments.textContent })
          .from(sourceSegments)
          .where(eq(sourceSegments.id, activity.segmentIds[0]))
          .limit(1);
        if (seg?.textContent) {
          segmentText = seg.textContent;
        }
      }

      let readingSubmission = {
        mainIdea: "",
        translation: body || "",
        keyTerms: "",
      };
      try {
        const parsed = JSON.parse(body || "{}");
        if (parsed && typeof parsed === "object") {
          readingSubmission = {
            mainIdea: parsed.mainIdea || "",
            translation: parsed.translation || body || "",
            keyTerms: parsed.keyTerms || "",
          };
        }
      } catch {
        // body là plain text
      }

      evalResult = await evaluateReading(segmentText, readingSubmission);
    } else if (activity.mode === "listening") {
      const baseDir = path.resolve(process.cwd(), "content/english-lab");
      const qFile = path.resolve(baseDir, activity.questionsFile || "texts/l1-questions.yaml");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let questionsList: any[] = [];
      if (fs.existsSync(qFile)) {
        try {
          const parsed = yaml.parse(fs.readFileSync(qFile, "utf-8"));
          if (parsed?.questions) questionsList = parsed.questions;
        } catch (e) {
          console.warn("Could not parse listening questions file:", e);
        }
      }

      let userAnswers: Record<string, string> = {};
      try {
        const parsed = JSON.parse(body || "{}");
        userAnswers = parsed.answers || parsed;
      } catch {
        // parse error
      }

      let correctCount = 0;
      const totalCount = questionsList.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailedFeedback = questionsList.map((q: any) => {
        const userChoice = (userAnswers[q.id] || "").trim().toUpperCase();
        const correctOpt = (q.correct_option || "").trim().toUpperCase();
        const isCorrect = userChoice === correctOpt;
        if (isCorrect) correctCount++;
        return {
          id: q.id,
          prompt: q.prompt,
          userOption: userChoice,
          correctOption: correctOpt,
          isCorrect,
          explanation: q.explanation,
          timestamp: q.timestamp_seconds,
        };
      });

      const scoreVal = totalCount > 0 ? Math.round((correctCount / totalCount) * 10 * 10) / 10 : 0;

      evalResult = {
        feedback: {
          observations: detailedFeedback
            .filter((item: { isCorrect: boolean }) => !item.isCorrect)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => ({
              category: "comprehension",
              location: `Mốc ${item.timestamp || 0}s (câu ${item.id})`,
              original: `Câu ${item.id}: Bạn chọn (${item.userOption || "Chưa trả lời"})`,
              issue: `Đáp án đúng là (${item.correctOption}). ${item.explanation || "Chưa chính xác theo audio."}`,
              suggestion: `Xem lại đoạn audio tại mốc ${item.timestamp || 0}s. ${item.explanation || ""}`.trim(),
              example: `Đáp án đúng là (${item.correctOption})`,
              retry_prompt: `Nghe lại đoạn có thông tin câu ${item.id} và ghi chú từ khóa`,
            })),
          strengths: [`Đã trả lời đúng ${correctCount}/${totalCount} câu hỏi nghe hiểu`],
          next_action:
            correctCount === totalCount
              ? "Xuất sắc! Bạn có thể chuyển sang luyện Shadowing các câu nói hay trong bài."
              : "Hãy nghe lại các đoạn có câu hỏi sai mà không nhìn transcript để tăng phản xạ.",
          limitations: "Điểm số phản ánh kết quả bài nghe trắc nghiệm cụ thể này.",
          scores: [
            {
              kind: "practice_estimate",
              dimension: "listening_comprehension",
              value: scoreVal,
              note: `Đúng ${correctCount}/${totalCount} câu`,
            },
          ],
        },
        tokenInput: 0,
        tokenOutput: 0,
        modelName: "local-evaluator",
      };
    } else {
      // writing mode
      evalResult = await evaluateWriting(
        activity.promptText || "",
        activity.rubricJson,
        body || ""
      );
    }

    // Lưu feedback_versions
    const [feedback] = await db
      .insert(feedbackVersions)
      .values({
        assessmentId: assessment.id,
        learnerId,
        submissionId: submission.id,
        runVersion: 1,
        rubricSnapshot: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pronunciation: (evalResult.feedback as any).pronunciation || null,
          rubric: activity.rubricJson as Record<string, unknown>,
        },
        modelRef: evalResult.modelName,
        observations: evalResult.feedback.observations,
        strengths: evalResult.feedback.strengths,
        nextAction: evalResult.feedback.next_action,
        limitations: evalResult.feedback.limitations,
        scores: evalResult.feedback.scores,
        reviewState: "active",
      })
      .returning();

    // Ghi nhận error_observations
    for (const obs of evalResult.feedback.observations) {
      await db.insert(errorObservations).values({
        learnerId,
        sourceFeedbackId: feedback.id,
        category: (obs as { category?: string }).category || (activity.mode === "reading" ? "vocabulary" : "grammar"),
        evidence: obs.original,
      });
    }

    // Ghi nhận usage_events
    await db.insert(usageEvents).values({
      learnerId,
      action: `evaluate_${activity.mode}`,
      entityType: "submission",
      entityId: submission.id,
      tokenInput: evalResult.tokenInput,
      tokenOutput: evalResult.tokenOutput,
      modelName: evalResult.modelName,
    });

    // Cập nhật assessment thành feedback_ready + đánh session completed
    await db
      .update(assessments)
      .set({
        status: "feedback_ready",
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    await db
      .update(learningSessions)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(learningSessions.id, sessionId));

    return {
      submission,
      assessment: { ...assessment, status: "feedback_ready" },
      feedback,
    };
  } catch (evalError) {
    console.error("Lỗi khi gọi AI chấm bài:", evalError);

    await db
      .update(assessments)
      .set({
        status: "failed",
        resultRef: evalError instanceof Error ? evalError.message : String(evalError),
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    return {
      submission,
      assessment: {
        ...assessment,
        status: "failed",
        resultRef: evalError instanceof Error ? evalError.message : String(evalError),
      },
      feedback: null,
    };
  }
}

/**
 * 2. Chấm lại bài tập (Retry Assessment)
 */
export async function retryAssessment(
  assessmentId: string,
  currentLearnerId: string,
  isAdmin = false
) {
  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment) {
    throw new ValidationError("Không tìm thấy lượt chấm bài.", 404);
  }

  // 1. Chặn retry nếu assessment đã hoàn tất (feedback_ready)
  if (assessment.status === "feedback_ready") {
    throw new ValidationError("Bài nộp đã được chấm thành công, không thể chấm lại.", 409);
  }

  // 2. Chỉ cho phép retry nếu failed hoặc processing > 10 phút
  if (assessment.status === "processing") {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (new Date(assessment.updatedAt) > tenMinutesAgo) {
      throw new ValidationError("Bài nộp đang trong quá trình chấm điểm, vui lòng chờ trong giây lát.", 409);
    }
  }

  // 3. Giới hạn tối đa 3 lần thử
  if (assessment.runVersion >= 3) {
    throw new ValidationError("Bài nộp đã vượt quá số lần chấm lại tối đa (3 lần). Vui lòng liên hệ quản trị viên.", 422);
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, assessment.submissionId), isNull(submissions.deletedAt)))
    .limit(1);

  if (!submission) {
    throw new ValidationError("Không tìm thấy bài nộp hoặc bài nộp đã bị xoá.", 404);
  }

  const learnerId = assessment.learnerId;
  if (!isAdmin && learnerId !== currentLearnerId) {
    throw new ValidationError("Không có quyền chấm lại bài nộp này.", 403);
  }

  const [session] = await db
    .select({ activityId: learningSessions.activityId })
    .from(learningSessions)
    .where(eq(learningSessions.id, submission.sessionId))
    .limit(1);

  if (!session) {
    throw new ValidationError("Không tìm thấy phiên học liên quan.", 404);
  }

  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  if (!activity) {
    throw new ValidationError("Không tìm thấy thông tin bài tập.", 404);
  }

  await db
    .update(assessments)
    .set({
      status: "processing",
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessment.id));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let evalResult: any;

    if (activity.mode === "speaking") {
      let audioBuffer: Buffer | null = null;
      let mimeType = "audio/webm";

      if (submission.mediaId) {
        const [media] = await db
          .select({ storageKey: mediaObjects.storageKey, mimeType: mediaObjects.mimeType })
          .from(mediaObjects)
          .where(eq(mediaObjects.id, submission.mediaId))
          .limit(1);

        if (media) {
          audioBuffer = await downloadMediaBuffer(media.storageKey);
          if (media.mimeType) mimeType = media.mimeType;
        }
      }

      evalResult = await evaluateSpeaking(
        audioBuffer ? { buffer: audioBuffer, mimeType } : null,
        activity.promptText || "",
        submission.confirmedTranscript || submission.body || undefined
      );
    } else if (activity.mode === "reading") {
      let segmentText = "";
      if (activity.segmentIds && activity.segmentIds.length > 0) {
        const [seg] = await db
          .select({ textContent: sourceSegments.textContent })
          .from(sourceSegments)
          .where(eq(sourceSegments.id, activity.segmentIds[0]))
          .limit(1);
        if (seg?.textContent) {
          segmentText = seg.textContent;
        }
      }

      let readingSubmission = {
        mainIdea: "",
        translation: submission.body || "",
        keyTerms: "",
      };
      try {
        const parsed = JSON.parse(submission.body || "{}");
        if (parsed && typeof parsed === "object") {
          readingSubmission = {
            mainIdea: parsed.mainIdea || "",
            translation: parsed.translation || submission.body || "",
            keyTerms: parsed.keyTerms || "",
          };
        }
      } catch {
        // plain text
      }

      evalResult = await evaluateReading(segmentText, readingSubmission);
    } else {
      evalResult = await evaluateWriting(
        activity.promptText || "",
        activity.rubricJson,
        submission.body || ""
      );
    }

    const [feedback] = await db
      .insert(feedbackVersions)
      .values({
        assessmentId: assessment.id,
        learnerId,
        submissionId: submission.id,
        runVersion: assessment.runVersion + 1,
        rubricSnapshot: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pronunciation: (evalResult.feedback as any).pronunciation || null,
          rubric: activity.rubricJson as Record<string, unknown>,
        },
        modelRef: evalResult.modelName,
        observations: evalResult.feedback.observations,
        strengths: evalResult.feedback.strengths,
        nextAction: evalResult.feedback.next_action,
        limitations: evalResult.feedback.limitations,
        scores: evalResult.feedback.scores,
        reviewState: "active",
      })
      .returning();

    // Dọn dẹp error_observations cũ của bài nộp này trước khi insert mới để tránh trùng
    const oldFeedbacks = await db
      .select({ id: feedbackVersions.id })
      .from(feedbackVersions)
      .where(eq(feedbackVersions.submissionId, submission.id));
    if (oldFeedbacks.length > 0) {
      const oldFeedbackIds = oldFeedbacks.map((f) => f.id);
      await db
        .delete(errorObservations)
        .where(inArray(errorObservations.sourceFeedbackId, oldFeedbackIds));
    }

    for (const obs of evalResult.feedback.observations) {
      await db.insert(errorObservations).values({
        learnerId,
        sourceFeedbackId: feedback.id,
        category: (obs as { category?: string }).category || (activity.mode === "reading" ? "vocabulary" : "grammar"),
        evidence: obs.original,
      });
    }

    await db.insert(usageEvents).values({
      learnerId,
      action: `evaluate_${activity.mode}`,
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
 * 3. Lấy bài nộp và feedback cho trang /my-work/[submissionId]
 * Hỗ trợ lấy kèm bài cha (parent_id) và signed URLs nghe lại âm thanh 10 phút
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

  // Sinh signed URL nghe lại nếu có mediaId
  let audioUrl: string | null = null;
  if (sub.mediaId) {
    const [media] = await db
      .select({ storageKey: mediaObjects.storageKey })
      .from(mediaObjects)
      .where(eq(mediaObjects.id, sub.mediaId))
      .limit(1);
    if (media) {
      try {
        audioUrl = await getMediaSignedUrl(media.storageKey, 600);
      } catch (e) {
        console.warn("Could not generate signed url for submission audio:", e);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let feedback: any = null;
  if (assessment && assessment.status === "feedback_ready") {
    const [fb] = await db
      .select()
      .from(feedbackVersions)
      .where(eq(feedbackVersions.assessmentId, assessment.id))
      .orderBy(desc(feedbackVersions.createdAt))
      .limit(1);

    if (fb) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rubricSnap = fb.rubricSnapshot as any;
      feedback = {
        id: fb.id,
        reviewState: fb.reviewState,
        observations: (fb.observations as WritingFeedback["observations"]) || [],
        strengths: (fb.strengths as string[]) || [],
        next_action: fb.nextAction || "",
        limitations: fb.limitations || "",
        scores: (fb.scores as WritingFeedback["scores"]) || [],
        pronunciation: rubricSnap?.pronunciation || null,
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
      let parentAudioUrl: string | null = null;
      if (parentSub.mediaId) {
        const [pMedia] = await db
          .select({ storageKey: mediaObjects.storageKey })
          .from(mediaObjects)
          .where(eq(mediaObjects.id, parentSub.mediaId))
          .limit(1);
        if (pMedia) {
          try {
            parentAudioUrl = await getMediaSignedUrl(pMedia.storageKey, 600);
          } catch (e) {
            console.warn("Could not generate signed url for parent audio:", e);
          }
        }
      }

      const [parentAssess] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.submissionId, parentSub.id))
        .orderBy(desc(assessments.createdAt))
        .limit(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parentFeedback: any = null;
      if (parentAssess && parentAssess.status === "feedback_ready") {
        const [parentFb] = await db
          .select()
          .from(feedbackVersions)
          .where(eq(feedbackVersions.assessmentId, parentAssess.id))
          .orderBy(desc(feedbackVersions.createdAt))
          .limit(1);

        if (parentFb) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pRubricSnap = parentFb.rubricSnapshot as any;
          parentFeedback = {
            id: parentFb.id,
            reviewState: parentFb.reviewState,
            observations: (parentFb.observations as WritingFeedback["observations"]) || [],
            strengths: (parentFb.strengths as string[]) || [],
            next_action: parentFb.nextAction || "",
            limitations: parentFb.limitations || "",
            scores: (parentFb.scores as WritingFeedback["scores"]) || [],
            pronunciation: pRubricSnap?.pronunciation || null,
          };
        }
      }

      parentSubmissionData = {
        submission: { ...parentSub, audioUrl: parentAudioUrl },
        feedback: parentFeedback,
      };
    }
  }

  return {
    submission: { ...sub, audioUrl },
    session,
    activity,
    assessment,
    feedback,
    parent: parentSubmissionData,
  };
}
