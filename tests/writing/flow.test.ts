import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  learners,
  submissions,
  feedbackVersions,
} from "@/db/schema";
import * as geminiProvider from "@/server/providers/gemini";
import { WritingFeedbackSchema } from "@/server/providers/gemini";
import {
  createSession,
  recordSessionEvent,
  createSubmissionAndAssess,
} from "@/server/learning/service";

describe("Writing Mode Invariants & Business Logic", () => {
  let testLearnerId: string;

  beforeEach(() => {
    vi.spyOn(geminiProvider, "evaluateWriting").mockResolvedValue({
      feedback: {
        observations: [
          {
            location: "Đoạn 1, câu 1",
            original: "Dear Sir,",
            issue: "Chưa đủ trang trọng",
            suggestion: "Dùng 'Dear Organizing Committee,'",
            example: "Dear Organizing Committee,",
            retry_prompt: "Viết lại lời chào trang trọng",
          },
        ],
        strengths: ["Ý tứ rõ ràng"],
        next_action: "Sửa lời chào",
        limitations: "Điểm số chỉ là ước tính luyện tập",
        scores: [
          { kind: "practice_estimate", dimension: "clarity", value: 8, note: "Rõ ràng" },
        ],
      },
      tokenInput: 120,
      tokenOutput: 60,
      modelName: "gemini-2.5-flash",
    });
  });

  // Setup test learner
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
          displayName: "BS. Minh (Test)",
          role: "learner",
        })
        .returning({ id: learners.id });
      testLearnerId = created.id;
    }
    expect(testLearnerId).toBeDefined();
  });

  // Invariant (a): Sửa bài tạo bản mới, bản cũ giữ nguyên không đổi (append-only)
  it("Invariant #1: Revising a submission creates a new submission and leaves the original untouched", async () => {
    const session = await createSession(testLearnerId, "W1", 30);
    expect(session.id).toBeDefined();

    // Submission 1
    const originalBody = "Dear Committee, I am writing to apply for the pain conference.";
    const [sub1] = await db
      .insert(submissions)
      .values({
        sessionId: session.id,
        learnerId: testLearnerId,
        revision: 1,
        body: originalBody,
        assisted: false,
      })
      .returning();

    expect(sub1.revision).toBe(1);
    expect(sub1.parentId).toBeNull();

    // Submission 2 (Bản sửa với parentId)
    const revisedBody = "Dear Organizing Committee, I am writing to register for the Asia-Pacific Pain Conference 2026.";
    const [sub2] = await db
      .insert(submissions)
      .values({
        sessionId: session.id,
        learnerId: testLearnerId,
        revision: sub1.revision + 1,
        parentId: sub1.id,
        body: revisedBody,
        assisted: false,
      })
      .returning();

    expect(sub2.revision).toBe(2);
    expect(sub2.parentId).toBe(sub1.id);
    expect(sub2.body).toBe(revisedBody);

    // Verify Submission 1 in DB has NOT been modified
    const [verifiedSub1] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, sub1.id));

    expect(verifiedSub1.revision).toBe(1);
    expect(verifiedSub1.body).toBe(originalBody);
    expect(verifiedSub1.id).not.toBe(sub2.id);
  });

  // Invariant (b): Có hint/reveal trước khi nộp -> assisted = true; không có -> assisted = false
  it("Invariant #2: Server computes assisted=true when hint or reveal event occurred before submission", async () => {
    // 1. Session without hint -> assisted = false
    const sessionClean = await createSession(testLearnerId, "W1", 30);
    const subClean = await createSubmissionAndAssess(
      sessionClean.id,
      testLearnerId,
      "Dear Committee, I am writing to express my interest in attending the ultrasound workshop."
    );
    expect(subClean.submission.assisted).toBe(false);

    // 2. Session with hint event -> assisted = true
    const sessionAssisted = await createSession(testLearnerId, "W1", 30);
    await recordSessionEvent(sessionAssisted.id, testLearnerId, "hint", { reason: "viewed_structure" });

    const subAssisted = await createSubmissionAndAssess(
      sessionAssisted.id,
      testLearnerId,
      "Dear Committee, following the suggested structure, I am writing to apply."
    );
    expect(subAssisted.submission.assisted).toBe(true);

    // 3. Session with reveal event -> assisted = true
    const sessionReveal = await createSession(testLearnerId, "W1", 30);
    await recordSessionEvent(sessionReveal.id, testLearnerId, "reveal", { item: "template" });

    const subReveal = await createSubmissionAndAssess(
      sessionReveal.id,
      testLearnerId,
      "Dear Committee, I have reviewed the template and submitted my draft."
    );
    expect(subReveal.submission.assisted).toBe(true);
  });

  // Invariant (c): JSON Gemini sai schema không được ghi thành feedback
  it("Invariant #3: Invalid JSON from AI fails schema validation and is not accepted as valid feedback", () => {
    // Missing required fields (missing retry_prompt, missing limitations, invalid score kind)
    const invalidJson1 = {
      observations: [
        {
          location: "Paragraph 1",
          original: "Dear sir",
          issue: "Too informal",
          suggestion: "Use Dear Committee",
          example: "Dear Committee,",
          // missing retry_prompt!
        },
      ],
      strengths: ["Good intent"],
      next_action: "Revise greeting",
      limitations: "Practice estimate",
      scores: [{ kind: "practice_estimate", dimension: "clarity", value: 7, note: "Good" }],
    };

    const result1 = WritingFeedbackSchema.safeParse(invalidJson1);
    expect(result1.success).toBe(false);

    // Forbidden field: official IELTS band
    const invalidJson2 = {
      observations: [],
      strengths: ["Clear"],
      next_action: "Practice more",
      limitations: "Estimate",
      scores: [
        {
          kind: "official_ielts_band", // FORBIDDEN: not allowed!
          dimension: "overall",
          value: 7.5,
          note: "Not allowed",
        },
      ],
    };

    const result2 = WritingFeedbackSchema.safeParse(invalidJson2);
    expect(result2.success).toBe(false);
  });

  it("WritingFeedbackSchema accepts valid structured feedback without official band", () => {
    const validJson = {
      observations: [
        {
          location: "Đoạn 1, câu 1",
          original: "I want join conference",
          issue: "Cần dùng cấu trúc trang trọng hơn",
          suggestion: "Dùng 'I am writing to register for...'",
          example: "I am writing to formally register for the conference.",
          retry_prompt: "Hãy viết lại câu mở đầu thể hiện sự trang trọng học thuật.",
        },
      ],
      strengths: ["Bố cục rõ ràng 3 đoạn", "Đã nêu được chuyên khoa siêu âm"],
      next_action: "Sửa lại câu chào và bổ sung số trang tham khảo",
      limitations: "Điểm số chỉ là ước tính phục vụ luyện tập, không phải chứng chỉ chính thức",
      scores: [
        { kind: "practice_estimate", dimension: "clarity", value: 8, note: "Mục đích thư rõ ràng" },
        { kind: "practice_estimate", dimension: "structure", value: 7.5, note: "Cấu trúc email chuẩn" },
      ],
    };

    const result = WritingFeedbackSchema.safeParse(validJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scores[0].kind).toBe("practice_estimate");
      expect(result.data.observations[0].retry_prompt).toBeDefined();
    }
  });

  it("Invariant #3b: When AI evaluation throws an error, assessment status is marked failed and no feedback is recorded", async () => {
    vi.spyOn(geminiProvider, "evaluateWriting").mockRejectedValueOnce(
      new Error("Gemini API Rate Limit or Invalid Output")
    );

    const session = await createSession(testLearnerId, "W1", 30);
    const result = await createSubmissionAndAssess(
      session.id,
      testLearnerId,
      "Draft content that will encounter AI error."
    );

    expect(result.assessment.status).toBe("failed");
    expect(result.feedback).toBeNull();

    // Verify in DB that no feedback_versions was inserted for this failed assessment
    const fbList = await db
      .select()
      .from(feedbackVersions)
      .where(eq(feedbackVersions.assessmentId, result.assessment.id));

    expect(fbList).toHaveLength(0);
  });
});

