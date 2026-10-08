import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect, vi } from "vitest";
import { db } from "@/db";
import {
  learners,
  vocabularyVault,
  vocabularyReviews,
  usageEvents,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import * as geminiProvider from "@/server/providers/gemini";
import {
  getVocabularyForFlashcards,
  submitQuickFlashcardReviews,
} from "@/server/vocabulary/service";

describe("Flashcards Spaced Repetition (NC4)", () => {
  let testLearnerId: string;
  let testVocab1Id: string;
  let testVocab2Id: string;

  it("should have or create a test learner and sample vocabulary items", async () => {
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
          userId: "00000000-0000-0000-0000-000000000088",
          displayName: "BS. Minh (Test Flashcards)",
          role: "learner",
        })
        .returning({ id: learners.id });
      testLearnerId = created.id;
    }
    expect(testLearnerId).toBeDefined();

    // Tạo 2 từ vựng test (v1 có dueAt rất cũ để luôn nằm trong top due items)
    const [v1] = await db
      .insert(vocabularyVault)
      .values({
        learnerId: testLearnerId,
        phrase: `flashcard test word 1 ${Date.now()}`,
        ipa: "/tɛst wɜːd wʌn/",
        contextMeaning: "Từ vựng kiểm thử flashcard số 1",
        originalSentence: "This is a clinical test sentence for flashcard 1.",
        sourceType: "reading",
        sourceRef: "R5-01",
        masteryLevel: 1,
        dueAt: new Date("2020-01-01T00:00:00.000Z"), // rất cũ, chắc chắn đứng đầu danh sách due
      })
      .returning({ id: vocabularyVault.id });

    const [v2] = await db
      .insert(vocabularyVault)
      .values({
        learnerId: testLearnerId,
        phrase: `flashcard test word 2 ${Date.now()}`,
        ipa: "/tɛst wɜːd tuː/",
        contextMeaning: "Từ vựng kiểm thử flashcard số 2",
        originalSentence: "This is a clinical test sentence for flashcard 2.",
        sourceType: "reading",
        sourceRef: "R5-02",
        masteryLevel: 2,
        dueAt: new Date(Date.now() + 86400000 * 30), // chưa đến hạn (30 ngày sau)
      })
      .returning({ id: vocabularyVault.id });

    testVocab1Id = v1.id;
    testVocab2Id = v2.id;
    expect(testVocab1Id).toBeDefined();
    expect(testVocab2Id).toBeDefined();
  });

  it("should retrieve due vocabulary or all vocabulary for flashcards", async () => {
    // 1. Lấy từ đến hạn
    const dueItems = await getVocabularyForFlashcards(testLearnerId, 20, "due");
    const foundV1InDue = dueItems.some((item) => item.id === testVocab1Id);
    expect(foundV1InDue).toBe(true);

    // 2. Lấy tất cả từ (ôn tự do)
    const allItems = await getVocabularyForFlashcards(testLearnerId, 100, "all");
    const foundV1InAll = allItems.some((item) => item.id === testVocab1Id);
    const foundV2InAll = allItems.some((item) => item.id === testVocab2Id);
    expect(foundV1InAll).toBe(true);
    expect(foundV2InAll).toBe(true);
  });

  it("should submit quick flashcard batch reviews with correct SRS update and 0 token usage", async () => {
    const geminiSpy = vi.spyOn(geminiProvider, "evaluateVocabUsage");

    // Nộp batch: vocab1 là 'know', vocab2 là 'dont_know'
    const results = await submitQuickFlashcardReviews(testLearnerId, [
      { vocab_id: testVocab1Id, result: "know" },
      { vocab_id: testVocab2Id, result: "dont_know" },
    ]);

    expect(results.success).toBe(true);
    expect(results.results).toHaveLength(2);

    // Gemini provider KHÔNG được gọi
    expect(geminiSpy).not.toHaveBeenCalled();

    // Kiểm tra vocab1 (mastery 1 -> know -> mastery 2, interval 7 ngày)
    const res1 = results.results.find((r) => r.vocabId === testVocab1Id);
    expect(res1).toBeDefined();
    expect(res1?.result).toBe("know");
    expect(res1?.nextMastery).toBe(2);
    expect(res1?.intervalDays).toBe(7);

    // Kiểm tra vocab2 (mastery 2 -> dont_know -> reset interval 1 ngày)
    const res2 = results.results.find((r) => r.vocabId === testVocab2Id);
    expect(res2).toBeDefined();
    expect(res2?.result).toBe("dont_know");
    expect(res2?.intervalDays).toBe(1);

    // Kiểm tra bản ghi trong vocabulary_reviews
    const [rev1] = await db
      .select()
      .from(vocabularyReviews)
      .where(eq(vocabularyReviews.vocabularyId, testVocab1Id))
      .orderBy(desc(vocabularyReviews.createdAt))
      .limit(1);

    expect(rev1).toBeDefined();
    expect(rev1.reviewChannel).toBe("web-flashcard");
    expect(rev1.responseModality).toBeNull();
    expect(rev1.resultStatus).toBe("correct");

    // Kiểm tra usage_events: tokenInput = 0, tokenOutput = 0
    const [usage] = await db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.learnerId, testLearnerId))
      .orderBy(desc(usageEvents.createdAt))
      .limit(1);

    expect(usage).toBeDefined();
    expect(usage.action).toBe("flashcard_quick_review");
    expect(usage.tokenInput).toBe(0);
    expect(usage.tokenOutput).toBe(0);
  });
});
