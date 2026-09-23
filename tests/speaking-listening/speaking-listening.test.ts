import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { learners, activities, mediaObjects, sessionEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as geminiProvider from "@/server/providers/gemini";
import {
  createSession,
  createSubmissionAndAssess,
  getSessionDetails,
  ValidationError,
} from "@/server/learning/service";
import { uploadLearnerMedia, MediaValidationError } from "@/server/media/service";

describe("Step 5: Speaking (S1) & Listening/Shadowing (L1) Tests", () => {
  let testLearnerId: string;
  let speakingSessionId: string;
  let listeningSessionId: string;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have or create a test learner", async () => {
    const [existing] = await db
      .select({ id: learners.id })
      .from(learners)
      .limit(1);

    if (existing) {
      testLearnerId = existing.id;
    } else {
      const [created] = await db
        .insert(learners)
        .values({
          userId: "00000000-0000-0000-0000-000000000099",
          displayName: "BS. Minh (Test Step 5)",
          role: "learner",
        })
        .returning({ id: learners.id });
      testLearnerId = created.id;
    }
    expect(testLearnerId).toBeDefined();
  });

  // TEST 1: evaluateSpeaking without audio -> pronunciation.status = "not_assessable"
  it(
    "Requirement C.1: evaluateSpeaking with text-only / no audio must return pronunciation.status = 'not_assessable'",
    async () => {
      const res = await geminiProvider.evaluateSpeaking(null, "Test speaking prompt without audio");

      expect(res).toBeDefined();
      expect(res.feedback).toBeDefined();
      expect(res.feedback.pronunciation).toBeDefined();
      expect(res.feedback.pronunciation.status).toBe("not_assessable");
      expect(res.feedback.pronunciation.notes).toContain("Không thể chấm phát âm do thiếu dữ liệu âm thanh");
    },
    30000
  );

  // TEST 2: uploadLearnerMedia rejects invalid MIME or oversized file (>20MB)
  it("Requirement A.2: uploadLearnerMedia validates MIME type and size <= 20MB", async () => {
    // 2.1 Rejects invalid MIME type (e.g. text/plain)
    const invalidBuffer = Buffer.from("invalid audio content");
    await expect(
      uploadLearnerMedia(testLearnerId, invalidBuffer, "text/plain")
    ).rejects.toThrowError(MediaValidationError);

    await expect(
      uploadLearnerMedia(testLearnerId, invalidBuffer, "text/plain")
    ).rejects.toThrow(/không được hỗ trợ/);

    // 2.2 Rejects oversized file (> 20MB)
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
    await expect(
      uploadLearnerMedia(testLearnerId, largeBuffer, "audio/webm")
    ).rejects.toThrowError(MediaValidationError);

    await expect(
      uploadLearnerMedia(testLearnerId, largeBuffer, "audio/webm")
    ).rejects.toThrow(/vượt quá giới hạn cho phép/);
  });

  // TEST 3: Speaking submission without media -> throws 422
  it("Requirement C.2: submitting speaking activity without media_id must throw 422 ValidationError", async () => {
    // Ensure S1 exists and approved
    const [s1] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(and(eq(activities.id, "S1"), eq(activities.reviewState, "approved")))
      .limit(1);

    if (!s1) {
      throw new Error("Activity S1 not found or not approved in DB. Run seed first.");
    }

    const session = await createSession(testLearnerId, "S1", 30);
    speakingSessionId = session.id;

    // Nộp không có mediaId
    await expect(
      createSubmissionAndAssess(speakingSessionId, testLearnerId, "Sample transcript text without audio", undefined, undefined)
    ).rejects.toThrowError(ValidationError);

    try {
      await createSubmissionAndAssess(speakingSessionId, testLearnerId, "text", undefined, undefined);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).statusCode).toBe(422);
      expect((err as ValidationError).message).toContain("Nộp bài Speaking bắt buộc phải có tệp âm thanh");
    }
  });

  // TEST 4: Speaking submission with media_id that is NOT ready -> throws 422
  it("Requirement A.2: submitting speaking activity with media_id not 'ready' must throw 422", async () => {
    // Tạo media_object trạng thái pending
    const [pendingMedia] = await db
      .insert(mediaObjects)
      .values({
        learnerId: testLearnerId,
        storageKey: `test/${Date.now()}.webm`,
        mimeType: "audio/webm",
        sizeBytes: 1024,
        status: "pending", // Chưa ready
      })
      .returning();

    await expect(
      createSubmissionAndAssess(
        speakingSessionId,
        testLearnerId,
        "Sample transcript",
        undefined,
        pendingMedia.id
      )
    ).rejects.toThrowError(ValidationError);

    try {
      await createSubmissionAndAssess(
        speakingSessionId,
        testLearnerId,
        "Sample transcript",
        undefined,
        pendingMedia.id
      );
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).statusCode).toBe(422);
      expect((err as ValidationError).message).toContain("Tệp âm thanh không tồn tại hoặc chưa ở trạng thái sẵn sàng");
    }
  });

  // TEST 5: Listening session - transcript locked before submit, reveal event marks assisted = true
  it("Requirement B.2: listening session locks transcript; reveal event marks submission as assisted", async () => {
    // Ensure L1 exists and approved
    const [l1] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(and(eq(activities.id, "L1"), eq(activities.reviewState, "approved")))
      .limit(1);

    if (!l1) {
      throw new Error("Activity L1 not found or not approved in DB. Run seed first.");
    }

    const session = await createSession(testLearnerId, "L1", 30);
    listeningSessionId = session.id;

    // Kiểm tra getSessionDetails: trước khi mở transcript, isTranscriptRevealed phải là false
    const detailsBefore = await getSessionDetails(listeningSessionId, testLearnerId);
    expect(detailsBefore).toBeDefined();
    expect(detailsBefore?.listening).toBeDefined();
    expect(detailsBefore?.listening?.isTranscriptRevealed).toBe(false);

    // Ghi sự kiện mở transcript (reveal)
    await db.insert(sessionEvents).values({
      sessionId: listeningSessionId,
      learnerId: testLearnerId,
      kind: "reveal",
      payload: { target: "transcript" },
    });

    // Kiểm tra lại getSessionDetails: bây giờ isTranscriptRevealed là true
    const detailsAfter = await getSessionDetails(listeningSessionId, testLearnerId);
    expect(detailsAfter?.listening?.isTranscriptRevealed).toBe(true);

    // Nộp bài nghe với đáp án
    const submissionRes = await createSubmissionAndAssess(
      listeningSessionId,
      testLearnerId,
      JSON.stringify({
        answers: {
          q1: "B", // đúng
          q2: "A", // sai (đáp án đúng là B)
          q3: "B", // đúng
        },
      })
    );

    expect(submissionRes).toBeDefined();
    // Do đã mở transcript trước khi nộp -> assisted = true
    expect(submissionRes.submission.assisted).toBe(true);
    expect(submissionRes.feedback).toBeDefined();

    // Chấm câu sai có chỉ rõ mốc giây gây nhầm
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const observations = (submissionRes.feedback as any)?.observations || [];
    const wrongQuestionObs = observations.find(
      (o: { location?: string; original?: string }) =>
        o.location?.includes("q2") || o.original?.includes("q2")
    );
    expect(wrongQuestionObs).toBeDefined();
    expect(wrongQuestionObs?.location).toMatch(/\d+s/); // Có chỉ ra mốc giây
  });
});
