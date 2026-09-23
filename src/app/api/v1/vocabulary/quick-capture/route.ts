import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import { quickCapture, ValidationError } from "@/server/vocabulary/service";

const QuickCaptureRequestSchema = z.object({
  selected_text: z.string().min(1, "selected_text is required"),
  surrounding_sentence: z.string().min(1, "surrounding_sentence is required"),
  source_ref: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = QuickCaptureRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await quickCapture(
      parsed.data.selected_text,
      parsed.data.surrounding_sentence,
      parsed.data.source_ref,
      learner.id
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lỗi POST /api/v1/vocabulary/quick-capture:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
