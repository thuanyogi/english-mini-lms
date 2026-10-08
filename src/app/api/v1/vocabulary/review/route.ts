import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import {
  getDueVocabularyForReview,
  getVocabularyForFlashcards,
  submitVocabularyReview,
  submitQuickFlashcardReviews,
  ValidationError,
} from "@/server/vocabulary/service";

const SubmitReviewSchema = z.object({
  vocab_id: z.string().uuid("vocab_id must be a valid UUID"),
  scenario: z.string().min(1, "scenario is required"),
  user_response: z.string().min(1, "user_response is required"),
  modality: z.enum(["text", "audio"]).default("text"),
});

const QuickReviewItemSchema = z.object({
  vocab_id: z.string().uuid("vocab_id must be a valid UUID"),
  result: z.enum(["know", "dont_know"]),
});

const SubmitQuickReviewSchema = z.object({
  mode: z.literal("quick"),
  vocab_id: z.string().uuid().optional(),
  result: z.enum(["know", "dont_know"]).optional(),
  reviews: z.array(QuickReviewItemSchema).optional(),
});

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    // Chế độ Flashcard Quick Review
    if (mode === "quick") {
      const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
      const isFreePractice =
        searchParams.get("free") === "true" || searchParams.get("all") === "true";

      const items = await getVocabularyForFlashcards(
        learner.id,
        limit,
        isFreePractice ? "all" : "due"
      );

      return NextResponse.json({
        items,
        count: items.length,
      });
    }

    // Chế độ Micro-challenge thông thường
    const allowExtra = searchParams.get("extra") === "true";
    const limit = Math.min(10, Math.max(1, Number(searchParams.get("limit")) || 5));

    const items = await getDueVocabularyForReview(learner.id, limit, allowExtra);

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error("Lỗi GET /api/v1/vocabulary/review:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();

    // 1. Kiểm tra nếu là mode="quick" (Flashcards SRS không gọi AI)
    if (body?.mode === "quick") {
      const parsedQuick = SubmitQuickReviewSchema.safeParse(body);
      if (!parsedQuick.success) {
        return NextResponse.json(
          {
            error: "Dữ liệu flashcard không hợp lệ",
            details: parsedQuick.error.format(),
          },
          { status: 422 }
        );
      }

      const reviewsToProcess: Array<{ vocab_id: string; result: "know" | "dont_know" }> = [];

      if (parsedQuick.data.reviews && parsedQuick.data.reviews.length > 0) {
        reviewsToProcess.push(...parsedQuick.data.reviews);
      } else if (parsedQuick.data.vocab_id && parsedQuick.data.result) {
        reviewsToProcess.push({
          vocab_id: parsedQuick.data.vocab_id,
          result: parsedQuick.data.result,
        });
      } else {
        return NextResponse.json(
          { error: "Cần cung cấp vocab_id + result hoặc mảng reviews" },
          { status: 422 }
        );
      }

      const quickResult = await submitQuickFlashcardReviews(learner.id, reviewsToProcess);
      return NextResponse.json(quickResult, { status: 200 });
    }

    // 2. Chế độ Micro-challenge truyền thống qua Gemini
    const parsed = SubmitReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dữ liệu không hợp lệ",
          details: parsed.error.format(),
        },
        { status: 422 }
      );
    }

    const { vocab_id, scenario, user_response, modality } = parsed.data;

    const result = await submitVocabularyReview(
      learner.id,
      vocab_id,
      scenario,
      user_response,
      modality
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lỗi POST /api/v1/vocabulary/review:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
