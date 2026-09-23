import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import {
  createVocabulary,
  getLearnerVocabulary,
  ValidationError,
} from "@/server/vocabulary/service";

const CreateVocabularySchema = z.object({
  phrase: z.string().min(1, "phrase is required"),
  ipa: z.string().optional(),
  context_meaning: z.string().optional(),
  original_sentence: z.string().min(1, "original_sentence is required"),
  source_ref: z.string().optional(),
  source_type: z.string().optional(),
  my_attempt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateVocabularySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dữ liệu không hợp lệ: original_sentence và phrase là bắt buộc",
          details: parsed.error.format(),
        },
        { status: 422 }
      );
    }

    const vocabulary = await createVocabulary(learner.id, parsed.data);
    return NextResponse.json({ vocabulary }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lỗi POST /api/v1/vocabulary:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterParam = searchParams.get("filter");
    const filter =
      filterParam === "due" || filterParam === "mastered" ? filterParam : "all";

    const items = await getLearnerVocabulary(learner.id, filter);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Lỗi GET /api/v1/vocabulary:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
