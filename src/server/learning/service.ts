import fs from "fs";
import path from "path";
import yaml from "yaml";
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
  sourceSegments,
  sources,
  mediaObjects,
} from "@/db/schema";
import {
  evaluateWriting,
  evaluateReading,
  evaluateSpeaking,
  WritingFeedback,
  SpeakingFeedback,
} from "@/server/providers/gemini";
import {
  downloadMediaBuffer,
  getMediaSignedUrl,
} from "@/server/media/service";

export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

/**
 * 1. Tạo phiên học mới (learning_sessions)
 */
export async function createSession(
  learnerId: string,
  activityId: string,
  targetMinutes: number
) {
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
 * 4. Nộp bài (submissions APPEND-ONLY) và kích hoạt chấm AI
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
    .select({
      id: activities.id,
      title: activities.title,
      mode: activities.mode,
      promptText: activities.promptText,
      rubricJson: activities.rubricJson,
      segmentIds: activities.segmentIds,
      questionsFile: activities.questionsFile,
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

  // KIỂM TRA BẮT BUỘC RIÊNG CHO SPEAKING MODE (Invariant #3 & Requirement A)
  let verifiedMedia = null;
  if (activity.mode === "speaking") {
    if (!mediaId) {
      throw new ValidationError(
        "Nộp bài Speaking bắt buộc phải có tệp âm thanh (media_id).",
        422
      );
    }

    const [media] = await db
      .select()
      .from(mediaObjects)
      .where(and(eq(mediaObjects.id, mediaId), eq(mediaObjects.learnerId, learnerId)))
      .limit(1);

    if (!media || media.status !== "ready") {
      throw new ValidationError(
        "Tệp âm thanh không tồn tại hoặc chưa ở trạng thái sẵn sàng (ready).",
        422
      );
    }
    verifiedMedia = media;
  }

  // INSERT submission mới — không bao giờ ghi đè bài cũ
  const [submission] = await db
    .insert(submissions)
    .values({
      sessionId,
      learnerId,
      revision,
      parentId: parentId || null,
      modality: activity.mode === "speaking" ? "audio" : "text",
      body: body || null,
      mediaId: verifiedMedia ? verifiedMedia.id : null,
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

  // Đánh giá bài nộp (timeout 60s)
  try {
    await db
      .update(assessments)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(assessments.id, assessment.id));

    let evalResult: {
      feedback: WritingFeedback | SpeakingFeedback;
      tokenInput: number;
      tokenOutput: number;
      modelName: string;
    };

    if (activity.mode === "speaking") {
      // 1. Chế độ Nói: tải audio buffer từ storage và gửi cho Gemini multimodal
      let audioBuffer: Buffer | null = null;
      if (verifiedMedia) {
        try {
          audioBuffer = await downloadMediaBuffer(verifiedMedia.storageKey);
        } catch (e) {
          console.warn("Could not download audio from storage:", e);
        }
      }

      // Lấy transcript chuẩn nếu có bài Shadowing
      let verifiedTranscript: string | undefined;
      if (activity.segmentIds && activity.segmentIds.length > 0) {
        const [seg] = await db
          .select({ transcriptContent: sourceSegments.transcriptContent })
          .from(sourceSegments)
          .where(eq(sourceSegments.id, activity.segmentIds[0]))
          .limit(1);
        if (seg?.transcriptContent) {
          verifiedTranscript = seg.transcriptContent;
        }
      }

      const speakRes = await evaluateSpeaking(
        audioBuffer ? { buffer: audioBuffer, mimeType: verifiedMedia!.mimeType } : null,
        activity.promptText || activity.title,
        verifiedTranscript
      );

      evalResult = speakRes;

      // Cập nhật transcript vào submission.body nếu ban đầu rỗng
      if (!submission.body && speakRes.feedback.transcript) {
        await db
          .update(submissions)
          .set({ body: speakRes.feedback.transcript })
          .where(eq(submissions.id, submission.id));
      }
    } else if (activity.mode === "listening") {
      // 2. Chế độ Nghe: Chấm câu hỏi đóng và chỉ ra mốc giây gây nhầm
      let userAnswers: Record<string, string> = {};
      try {
        const parsed = JSON.parse(body || "{}");
        if (parsed.answers) userAnswers = parsed.answers;
        else if (typeof parsed === "object") userAnswers = parsed;
      } catch {
        // not json
      }

      const baseDir = path.resolve(process.cwd(), "content/english-lab");
      const qFile = path.resolve(baseDir, activity.questionsFile || "texts/l1-questions.yaml");
      let correctCount = 0;
      let totalCount = 3;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obsList: any[] = [];

      if (fs.existsSync(qFile)) {
        try {
          const parsedYaml = yaml.parse(fs.readFileSync(qFile, "utf-8"));
          const questions = parsedYaml?.questions || [];
          totalCount = questions.length || 3;

          for (let i = 0; i < questions.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const q = questions[i] as any;
            const userChoice = userAnswers[q.id] || "(Chưa chọn)";
            if (userChoice.trim().toUpperCase() === q.correct_option_id.trim().toUpperCase()) {
              correctCount++;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const correctOpt = q.options?.find((o: any) => o.id === q.correct_option_id);
              const sec = q.timestamp_reference || 100;
              const minStr = Math.floor(sec / 60)
                .toString()
                .padStart(2, "0");
              const secStr = (sec % 60).toString().padStart(2, "0");

              obsList.push({
                location: `Câu ${i + 1} [${q.id}] (Mốc ${minStr}:${secStr} - ${sec}s)`,
                original: `Câu ${i + 1} [${q.id}]: Lựa chọn (${userChoice})`,
                issue: `Chọn sai thông tin chi tiết được diễn giả trình bày. Đáp án đúng là (${q.correct_option_id})`,
                suggestion: `Đáp án đúng là (${q.correct_option_id}): ${correctOpt?.text || ""}`,
                example: q.explanation || "Hãy chú ý nghe lại từ khóa ở mốc giây này.",
                retry_prompt: `Tua lại mốc giây ${sec} và nghe kỹ từ khóa giải phẫu.`,
              });
            }
          }
        } catch (e) {
          console.error("Lỗi khi chấm bài nghe YAML:", e);
        }
      }

      evalResult = {
        feedback: {
          observations: obsList,
          strengths:
            correctCount > 0
              ? [`Đã trả lời chính xác ${correctCount}/${totalCount} câu hỏi nghe hiểu.`]
              : ["Đã hoàn thành toàn bộ bài nghe hội nghị."],
          next_action:
            correctCount === totalCount
              ? "Tuyệt vời! Hãy chuyển sang tab Shadowing để luyện nhại giọng từng câu."
              : "Nghe lại các câu bị sai ở mốc giây tương ứng rồi luyện Shadowing.",
          limitations: "Điểm số được tính tự động đối chiếu theo đáp án chuẩn của bài nghe.",
          scores: [
            {
              kind: "practice_estimate" as const,
              dimension: "listening_comprehension",
              value: Math.round((correctCount / totalCount) * 10),
              note: `${correctCount}/${totalCount} câu đúng`,
            },
          ],
        },
        tokenInput: 0,
        tokenOutput: 0,
        modelName: "rule-based-evaluator",
      };
    } else if (activity.mode === "reading") {
      // 3. Chế độ Đọc - Dịch
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
        // plain text
      }

      evalResult = await evaluateReading(segmentText, readingSubmission);
    } else {
      // 4. Chế độ Viết
      evalResult = await evaluateWriting(
        activity.promptText || "",
        activity.rubricJson,
        body || ""
      );
    }

    // Ghi nhận feedback_versions
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
        category: activity.mode,
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
    console.error("Lỗi khi chấm bài:", err);

    await db
      .update(assessments)
      .set({
        status: "failed",
        resultRef: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    if (err instanceof ValidationError) {
      throw err;
    }

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
    throw new ValidationError("Không tìm thấy assessment.", 404);
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, assessment.submissionId))
    .limit(1);

  if (!submission) {
    throw new ValidationError("Không tìm thấy bài nộp.", 404);
  }

  const [session] = await db
    .select({ activityId: learningSessions.activityId })
    .from(learningSessions)
    .where(eq(learningSessions.id, submission.sessionId))
    .limit(1);

  const [activity] = await db
    .select({
      id: activities.id,
      mode: activities.mode,
      title: activities.title,
      promptText: activities.promptText,
      rubricJson: activities.rubricJson,
      segmentIds: activities.segmentIds,
      questionsFile: activities.questionsFile,
    })
    .from(activities)
    .where(eq(activities.id, session.activityId))
    .limit(1);

  await db
    .update(assessments)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(assessments.id, assessment.id));

  try {
    let evalResult: {
      feedback: WritingFeedback | SpeakingFeedback;
      tokenInput: number;
      tokenOutput: number;
      modelName: string;
    };

    if (activity.mode === "speaking") {
      let audioBuffer: Buffer | null = null;
      if (submission.mediaId) {
        const [media] = await db
          .select()
          .from(mediaObjects)
          .where(eq(mediaObjects.id, submission.mediaId))
          .limit(1);
        if (media) {
          try {
            audioBuffer = await downloadMediaBuffer(media.storageKey);
          } catch (e) {
            console.warn("Could not download audio from storage on retry:", e);
          }
        }
      }

      evalResult = await evaluateSpeaking(
        audioBuffer ? { buffer: audioBuffer, mimeType: "audio/webm" } : null,
        activity.promptText || activity.title
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

    for (const obs of evalResult.feedback.observations) {
      await db.insert(errorObservations).values({
        learnerId,
        sourceFeedbackId: feedback.id,
        category: activity.mode,
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
 * 6. Lấy thông tin phiên học chi tiết cho trang /learn/[sessionId]
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
    let videoUrl = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
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

    listening = {
      videoUrl,
      startSeconds: startSec,
      endSeconds: endSec,
      questions: questionsList,
      transcriptSegments,
      isTranscriptRevealed,
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

/**
 * 7. Lấy bài nộp và feedback cho trang /my-work/[submissionId]
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
