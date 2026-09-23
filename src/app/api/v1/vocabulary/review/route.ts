import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import {
  getDueVocabularyForReview,
  submitVocabularyReview,
  ValidationError,
} from "@/server/vocabulary/service";

const SubmitReviewSchema = z.object({
  vocab_id: z.string().uuid("vocab_id must be a valid UUID"),
  scenario: z.string().min(1, "scenario is required"),
  user_response: z.string().min(1, "user_response is required"),
  modality: z.enum(["text", "audio"]).default("text"),
});

export async function GET(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
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
