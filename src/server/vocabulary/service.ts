import { eq, and, desc, lte, gte } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyVault, usageEvents } from "@/db/schema";
import { quickCaptureVocabulary, QuickCaptureResult } from "@/server/providers/gemini";

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
