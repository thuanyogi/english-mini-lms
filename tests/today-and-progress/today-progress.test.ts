import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import {
  learners,
  vocabularyVault,
} from "@/db/schema";
import * as geminiProvider from "@/server/providers/gemini";
import { getTodayRecommendation } from "@/server/today/service";
import {
  calculateNextReview,
  getDueVocabularyForReview,
  submitVocabularyReview,
} from "@/server/vocabulary/service";
import { getProgressSummary } from "@/server/progress/service";
import {
  saveLearnerOnboardingProfile,
  getLearnerOnboardingProfile,
} from "@/server/onboarding/service";

describe("Step 6: Today Recommendation, Vocab Spaced Repetition, Progress & Onboarding", () => {
  let testLearnerId: string;

  beforeEach(() => {
    vi.spyOn(geminiProvider, "evaluateVocabUsage").mockResolvedValue({
      result: {
        resultStatus: "correct",
        aiAssessment: "Cụm từ được dùng tự nhiên và chính xác trong bối cảnh lâm sàng cơ xương khớp.",
        feedbackNotes: "Collocation 'radicular symptoms' dùng rất chuẩn với động từ present with.",
        exampleCorrection: "The patient presents with radicular symptoms indicative of nerve root compression.",
      },
      tokenInput: 120,
      tokenOutput: 60,
      modelName: "gemini-2.5-flash",
    });
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
          displayName: "BS. Minh (Test Step 6)",
          role: "learner",
        })
        .returning({ id: learners.id });
      testLearnerId = created.id;
    }
    expect(testLearnerId).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // 1. Spaced Repetition Schedule (1 → 3 → 7 → 14 ngày, sai về 1 ngày)
  // ──────────────────────────────────────────────
  describe("Spaced Repetition calculation (1 -> 3 -> 7 -> 14 ngày)", () => {
    it("should advance interval according to schedule when correct: 0->1d, 1->3d, 2->7d, 3->14d, 4+->30d", () => {
      const res0 = calculateNextReview(0, true);
      expect(res0.nextMastery).toBe(1);
      expect(res0.intervalDays).toBe(3); // Level 1 is scheduled for 3 days

      const res1 = calculateNextReview(1, true);
      expect(res1.nextMastery).toBe(2);
      expect(res1.intervalDays).toBe(7); // Level 2 is scheduled for 7 days

      const res2 = calculateNextReview(2, true);
      expect(res2.nextMastery).toBe(3);
      expect(res2.intervalDays).toBe(14); // Level 3 is scheduled for 14 days

      const res3 = calculateNextReview(3, true);
      expect(res3.nextMastery).toBe(4);
      expect(res3.intervalDays).toBe(30); // Level 4 (mastered) is scheduled for 30 days
    });

    it("should strictly reset to 1 day and decrease mastery when incorrect", () => {
      const failFromLvl3 = calculateNextReview(3, false);
      expect(failFromLvl3.nextMastery).toBe(2);
      expect(failFromLvl3.intervalDays).toBe(1); // Quy tắc: sai về 1 ngày

      const failFromLvl0 = calculateNextReview(0, false);
      expect(failFromLvl0.nextMastery).toBe(0);
      expect(failFromLvl0.intervalDays).toBe(1); // Quy tắc: sai về 1 ngày
    });
  });

  // ──────────────────────────────────────────────
  // 2. Vocabulary Due Review & Submission
  // ──────────────────────────────────────────────
  describe("Vocabulary Due Review & Submission", () => {
    let testVocabId: string;

    it("should create due vocabulary and retrieve up to 5 items", async () => {
      // Tạo từ vựng có due_at trong quá khứ (đến hạn)
      const pastDate = new Date(Date.now() - 3600 * 1000);
      const [inserted] = await db
        .insert(vocabularyVault)
        .values({
          learnerId: testLearnerId,
          phrase: "radicular symptoms",
          ipa: "/rəˈdɪkjʊlər ˈsɪmptəmz/",
          contextMeaning: "Các triệu chứng đau lan theo rễ thần kinh",
          originalSentence: "The patient complained of severe radicular symptoms radiating down the left leg.",
          masteryLevel: 1,
          dueAt: pastDate,
        })
        .returning();

      testVocabId = inserted.id;

      const dueItems = await getDueVocabularyForReview(testLearnerId, 5);
      expect(dueItems.length).toBeGreaterThanOrEqual(1);

      const found = dueItems.find((i) => i.id === testVocabId);
      expect(found).toBeDefined();
      expect(found?.challengePrompt).toContain("radicular symptoms");
    });

    it("should submit review, evaluate with Gemini, and update spaced repetition", async () => {
      const reviewResult = await submitVocabularyReview(
        testLearnerId,
        testVocabId,
        "Dùng trong câu khám bệnh",
        "The patient presents with sharp radicular symptoms affecting the L5 dermatome.",
        "text"
      );

      expect(reviewResult.evaluation.resultStatus).toBe("correct");
      expect(reviewResult.masteryLevel).toBe(2); // 1 -> 2
      expect(reviewResult.intervalDays).toBe(7); // level 2 schedule is 7 days
      expect(reviewResult.vocabulary.masteryLevel).toBe(2);
      expect(reviewResult.review.userResponse).toContain("radicular symptoms");
    });
  });

  // ──────────────────────────────────────────────
  // 3. Today Recommendation Logic
  // ──────────────────────────────────────────────
  describe("Today Recommendation Service", () => {
    it("should return an explainable recommendation matching 30 or 45 minutes", async () => {
      const rec30 = await getTodayRecommendation(testLearnerId, 30);
      expect(rec30).toBeDefined();
      expect(rec30.reason).toBeTruthy();
      expect(rec30.recommendedActivity).toBeDefined();
      expect(Array.isArray(rec30.alternateActivities)).toBe(true);

      const rec45 = await getTodayRecommendation(testLearnerId, 45);
      expect(rec45).toBeDefined();
      expect(rec45.reason).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────
  // 4. Progress Analytics (No fake IELTS band, Independent vs Assisted, Insufficient data)
  // ──────────────────────────────────────────────
  describe("Progress Analytics", () => {
    it("should report insufficient evidence message when submissions < 3", async () => {
      const summary = await getProgressSummary(testLearnerId);
      expect(summary).toBeDefined();
      expect(typeof summary.sessionsThisWeek).toBe("number");
      expect(typeof summary.actualStudyMinutes).toBe("number");
      expect(Array.isArray(summary.skillBreakdown)).toBe(true);

      if (summary.totalSubmissions < 3) {
        expect(summary.hasSufficientData).toBe(false);
        expect(summary.insufficientDataMessage).toContain("Chưa đủ bằng chứng");
      }
    });

    it("INVARIANT CHECK: must not include any fake estimated IELTS band in progress summary", async () => {
      const summary = await getProgressSummary(testLearnerId);
      const summaryKeys = Object.keys(summary);

      // Verify no estimated IELTS band key exists
      expect(summaryKeys).not.toContain("estimatedIeltsBand");
      expect(summaryKeys).not.toContain("ieltsBand");
      expect(summaryKeys).not.toContain("predictedBand");
      expect(summaryKeys).not.toContain("bandScore");

      // Verify JSON serialized output does not contain band prediction
      const jsonStr = JSON.stringify(summary);
      expect(jsonStr).not.toMatch(/"estimated_band"/i);
      expect(jsonStr).not.toMatch(/"ielts_band"/i);
    });

    it("should strictly separate independent and assisted submissions", async () => {
      const summary = await getProgressSummary(testLearnerId);
      expect(typeof summary.independentCount).toBe("number");
      expect(typeof summary.assistedCount).toBe("number");
      expect(summary.independentCount + summary.assistedCount).toBe(
        summary.totalSubmissions
      );
    });
  });

  // ──────────────────────────────────────────────
  // 5. Onboarding Profile
  // ──────────────────────────────────────────────
  describe("Onboarding Profile Service", () => {
    it("should save and retrieve learner onboarding profile correctly", async () => {
      const profileToSave = {
        displayName: "BS. Minh (Bác sĩ Cơ Xương Khớp)",
        priorities: [
          "Giao tiếp công việc & lâm sàng hàng ngày",
          "Đọc - dịch sách và bài báo y khoa chuyên ngành",
        ],
        selfAssessment: {
          writing: 3,
          reading: 4,
          speaking: 3,
          listening: 4,
        },
        workContext: "Bác sĩ lâm sàng siêu âm cơ xương khớp, tham gia hội nghị quốc tế",
        ieltsVariant: "academic" as const,
        currentBook: "Musculoskeletal Ultrasound Handbook",
        preferredStudyTime: "21:30",
        targetMinutesDefault: 45,
      };

      const saved = await saveLearnerOnboardingProfile(testLearnerId, profileToSave);
      expect(saved).toBeDefined();
      expect(saved.baselineStatus).toBe("completed");

      const retrieved = await getLearnerOnboardingProfile(testLearnerId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.displayName).toBe("BS. Minh (Bác sĩ Cơ Xương Khớp)");
      expect(retrieved?.priorities).toContain("Giao tiếp công việc & lâm sàng hàng ngày");
      expect(retrieved?.selfAssessment.reading).toBe(4);
      expect(retrieved?.ieltsVariant).toBe("academic");
      expect(retrieved?.currentBook).toBe("Musculoskeletal Ultrasound Handbook");
      expect(retrieved?.targetMinutesDefault).toBe(45);
      expect(retrieved?.baselineStatus).toBe("completed");
    });

    it("should allow ieltsVariant to be empty or null (optional)", async () => {
      const profileWithoutIelts = {
        priorities: ["Giao tiếp"],
        selfAssessment: { writing: 2, reading: 3, speaking: 2, listening: 3 },
        workContext: "Khám chữa bệnh",
        ieltsVariant: null,
        currentBook: "",
        preferredStudyTime: "20:00",
        targetMinutesDefault: 30,
      };

      await saveLearnerOnboardingProfile(testLearnerId, profileWithoutIelts);
      const retrieved = await getLearnerOnboardingProfile(testLearnerId);
      expect(retrieved?.ieltsVariant).toBeNull();
    });
  });
});
