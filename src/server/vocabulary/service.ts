import { eq, and, desc, lte, gte, asc } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyVault, vocabularyReviews, usageEvents } from "@/db/schema";
import {
  quickCaptureVocabulary,
  QuickCaptureResult,
  evaluateVocabUsage,
  VocabUsageEvaluation,
} from "@/server/providers/gemini";

export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

export interface CreateVocabularyInput {
  phrase: string;
  ipa?: string;
  context_meaning?: string;
  original_sentence: string;
  source_ref?: string;
  source_type?: string;
  my_attempt?: string;
}

/**
 * Tra cứu nhanh từ vựng y khoa qua Gemini khi người dùng bôi đen văn bản
 */
export async function quickCapture(
  selectedText: string,
  surroundingSentence: string,
  sourceRef?: string,
  learnerId?: string
): Promise<QuickCaptureResult> {
  if (!selectedText || !selectedText.trim()) {
    throw new ValidationError("selected_text is required", 400);
  }
  if (!surroundingSentence || !surroundingSentence.trim()) {
    throw new ValidationError("surrounding_sentence is required", 400);
  }

  const { result, tokenInput, tokenOutput, modelName } = await quickCaptureVocabulary(
    selectedText.trim(),
    surroundingSentence.trim(),
    sourceRef
  );

  if (learnerId) {
    try {
      await db.insert(usageEvents).values({
        learnerId,
        action: "quick_capture_vocab",
        entityType: "vocabulary",
        tokenInput,
        tokenOutput,
        modelName,
      });
    } catch (e) {
      console.warn("Failed to log usage event for quick_capture:", e);
    }
  }

  return result;
}

/**
 * Lưu từ vựng vào Vocabulary Vault.
 * QUY TẮC BẮT BUỘC: Không được lưu nếu thiếu original_sentence.
 * Tuple lưu đầy đủ: phrase, ipa, context_meaning, original_sentence, source_ref, my_attempt, mastery_level=0, due_at=now+1 ngày.
 */
export async function createVocabulary(learnerId: string, input: CreateVocabularyInput) {
  if (!input.original_sentence || !input.original_sentence.trim()) {
    throw new ValidationError("original_sentence is required and cannot be empty", 422);
  }

  if (!input.phrase || !input.phrase.trim()) {
    throw new ValidationError("phrase is required and cannot be empty", 422);
  }

  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // now + 1 day

  const [record] = await db
    .insert(vocabularyVault)
    .values({
      learnerId,
      phrase: input.phrase.trim(),
      ipa: input.ipa?.trim() || null,
      contextMeaning: input.context_meaning?.trim() || null,
      originalSentence: input.original_sentence.trim(),
      sourceRef: input.source_ref?.trim() || null,
      sourceType: input.source_type || "book",
      myAttempt: input.my_attempt?.trim() || "",
      masteryLevel: 0,
      dueAt,
    })
    .returning();

  return record;
}

/**
 * Lấy danh sách từ vựng của học viên với bộ lọc
 */
export async function getLearnerVocabulary(
  learnerId: string,
  filter?: "all" | "due" | "mastered"
) {
  const now = new Date();

  if (filter === "due") {
    return await db
      .select()
      .from(vocabularyVault)
      .where(
        and(
          eq(vocabularyVault.learnerId, learnerId),
          lte(vocabularyVault.dueAt, now)
        )
      )
      .orderBy(desc(vocabularyVault.createdAt));
  }

  if (filter === "mastered") {
    return await db
      .select()
      .from(vocabularyVault)
      .where(
        and(
          eq(vocabularyVault.learnerId, learnerId),
          gte(vocabularyVault.masteryLevel, 4)
        )
      )
      .orderBy(desc(vocabularyVault.createdAt));
  }

  return await db
    .select()
    .from(vocabularyVault)
    .where(eq(vocabularyVault.learnerId, learnerId))
    .orderBy(desc(vocabularyVault.createdAt));
}

/**
 * Cập nhật câu tự đặt (my_attempt) hoặc trạng thái ôn tập
 */
export async function updateVocabulary(
  vocabId: string,
  learnerId: string,
  updates: {
    my_attempt?: string;
    mastery_level?: number;
    context_meaning?: string;
  }
) {
  const patchData: {
    myAttempt?: string;
    masteryLevel?: number;
    contextMeaning?: string;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (updates.my_attempt !== undefined) {
    patchData.myAttempt = updates.my_attempt.trim();
  }
  if (updates.mastery_level !== undefined) {
    patchData.masteryLevel = updates.mastery_level;
  }
  if (updates.context_meaning !== undefined) {
    patchData.contextMeaning = updates.context_meaning.trim();
  }

  const [updated] = await db
    .update(vocabularyVault)
    .set(patchData)
    .where(
      and(
        eq(vocabularyVault.id, vocabId),
        eq(vocabularyVault.learnerId, learnerId)
      )
    )
    .returning();

  if (!updated) {
    throw new ValidationError("Từ vựng không tồn tại hoặc không thuộc quyền sở hữu", 404);
  }

  return updated;
}

// ──────────────────────────────────────────────
// Spaced Repetition Review (1 → 3 → 7 → 14 ngày)
// ──────────────────────────────────────────────

const SPACED_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export function calculateNextReview(
  currentMastery: number,
  isCorrect: boolean
): { nextMastery: number; nextDueAt: Date; intervalDays: number } {
  if (isCorrect) {
    const nextMastery = Math.min(5, currentMastery + 1);
    const intervalDays =
      nextMastery <= 4 ? SPACED_INTERVALS_DAYS[nextMastery] || 14 : 30;
    const nextDueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
    return { nextMastery, nextDueAt, intervalDays };
  } else {
    // Sai: về 1 ngày
    const nextMastery = Math.max(0, currentMastery - 1);
    const intervalDays = 1;
    const nextDueAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    return { nextMastery, nextDueAt, intervalDays };
  }
}

/**
 * Lấy tối đa 5 từ vựng đến hạn ôn tập (due_at <= now)
 */
export async function getDueVocabularyForReview(
  learnerId: string,
  limit = 5,
  allowPracticeExtra = false
) {
  const now = new Date();

  // Lấy các từ đến hạn ôn (due_at <= now)
  const dueItems = await db
    .select({
      id: vocabularyVault.id,
      phrase: vocabularyVault.phrase,
      ipa: vocabularyVault.ipa,
      contextMeaning: vocabularyVault.contextMeaning,
      originalSentence: vocabularyVault.originalSentence,
      sourceRef: vocabularyVault.sourceRef,
      myAttempt: vocabularyVault.myAttempt,
      masteryLevel: vocabularyVault.masteryLevel,
      dueAt: vocabularyVault.dueAt,
    })
    .from(vocabularyVault)
    .where(
      and(
        eq(vocabularyVault.learnerId, learnerId),
        lte(vocabularyVault.dueAt, now)
      )
    )
    .orderBy(asc(vocabularyVault.dueAt))
    .limit(limit);

  const items = [...dueItems];

  // Chỉ bổ sung thêm từ luyện tập nếu người dùng bật allowPracticeExtra
  if (allowPracticeExtra && items.length < limit) {
    const existingIds = new Set(items.map((i) => i.id));
    const extraItems = await db
      .select({
        id: vocabularyVault.id,
        phrase: vocabularyVault.phrase,
        ipa: vocabularyVault.ipa,
        contextMeaning: vocabularyVault.contextMeaning,
        originalSentence: vocabularyVault.originalSentence,
        sourceRef: vocabularyVault.sourceRef,
        myAttempt: vocabularyVault.myAttempt,
        masteryLevel: vocabularyVault.masteryLevel,
        dueAt: vocabularyVault.dueAt,
      })
      .from(vocabularyVault)
      .where(
        and(
          eq(vocabularyVault.learnerId, learnerId),
          lte(vocabularyVault.masteryLevel, 3)
        )
      )
      .orderBy(asc(vocabularyVault.masteryLevel), asc(vocabularyVault.dueAt))
      .limit(limit * 2);

    for (const extra of extraItems) {
      if (!existingIds.has(extra.id) && items.length < limit) {
        items.push(extra);
        existingIds.add(extra.id);
      }
    }
  }

  // Tạo câu hỏi micro-challenge cho từng từ
  return items.map((item) => ({
    ...item,
    challengePrompt: `Dùng cụm từ "${item.phrase}" (${item.contextMeaning || "chuyên ngành y tế"}) trong một câu tiếng Anh trao đổi với bệnh nhân hoặc đồng nghiệp.`,
  }));
}

/**
 * Nộp bài ôn từ (text hoặc voice): Gọi Gemini đánh giá và cập nhật lịch Spaced Repetition
 */
export async function submitVocabularyReview(
  learnerId: string,
  vocabId: string,
  scenario: string,
  userResponse: string,
  modality: "text" | "audio" = "text",
  preEvaluated?: VocabUsageEvaluation
) {
  if (!userResponse || !userResponse.trim()) {
    throw new ValidationError("Câu trả lời không được để trống", 400);
  }

  // 1. Lấy thông tin từ vựng
  const [vocab] = await db
    .select()
    .from(vocabularyVault)
    .where(
      and(
        eq(vocabularyVault.id, vocabId),
        eq(vocabularyVault.learnerId, learnerId)
      )
    )
    .limit(1);

  if (!vocab) {
    throw new ValidationError("Từ vựng không tồn tại", 404);
  }

  // 2. Đánh giá câu trả lời qua Gemini nếu chưa có kết quả đánh giá trước
  let evalResult: VocabUsageEvaluation;
  let tokenIn = 0;
  let tokenOut = 0;
  let modelUsed = "gemini-2.5-flash";

  if (preEvaluated) {
    evalResult = preEvaluated;
  } else {
    const aiRes = await evaluateVocabUsage(
      vocab.phrase,
      vocab.contextMeaning || "",
      scenario,
      userResponse.trim()
    );
    evalResult = aiRes.result;
    tokenIn = aiRes.tokenInput;
    tokenOut = aiRes.tokenOutput;
    modelUsed = aiRes.modelName;
  }

  // 3. Tính lịch ôn tập kế tiếp (1→3→7→14 ngày, sai về 1 ngày)
  const isCorrect = evalResult.resultStatus === "correct";
  const { nextMastery, nextDueAt, intervalDays } = calculateNextReview(
    vocab.masteryLevel,
    isCorrect
  );

  // 4. Ghi lịch sử vào vocabulary_reviews
  const [review] = await db
    .insert(vocabularyReviews)
    .values({
      vocabularyId: vocab.id,
      learnerId,
      reviewChannel: "web",
      promptScenario: scenario,
      userResponse: userResponse.trim(),
      responseModality: modality,
      aiAssessment: evalResult.aiAssessment,
      resultStatus: evalResult.resultStatus,
      nextDueAt,
    })
    .returning();

  // 5. Cập nhật vocabulary_vault
  const [updatedVocab] = await db
    .update(vocabularyVault)
    .set({
      masteryLevel: nextMastery,
      dueAt: nextDueAt,
      myAttempt: userResponse.trim(),
      updatedAt: new Date(),
    })
    .where(eq(vocabularyVault.id, vocab.id))
    .returning();

  // 6. Ghi log usage_event
  try {
    await db.insert(usageEvents).values({
      learnerId,
      action: "review_vocab",
      entityType: "vocabulary",
      entityId: vocab.id,
      tokenInput: tokenIn,
      tokenOutput: tokenOut,
      modelName: modelUsed,
    });
  } catch (e) {
    console.warn("Lỗi ghi log usage event ôn từ:", e);
  }

  return {
    review,
    vocabulary: updatedVocab,
    evaluation: evalResult,
    nextDueAt,
    intervalDays,
    masteryLevel: nextMastery,
  };
}
